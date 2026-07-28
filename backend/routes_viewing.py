from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, log_activity, notify, email_user, notify_org_team, email_enabled
from email_templates import render_and_send
from email_service import send_email

router = APIRouter(prefix="/api", tags=["viewings"])


def normalize_slots(slots):
    """Bring slots into the {time, capacity, application_ids} shape.

    Slots used to hold a single application_id. Rows created before per-slot capacity
    existed are converted on read, so nothing has to be migrated up front.
    """
    out = []
    for s in slots or []:
        if "application_ids" in s:
            out.append({**s, "capacity": s.get("capacity") or 1,
                        "application_ids": s.get("application_ids") or []})
        else:
            legacy = s.get("application_id")
            out.append({"time": s.get("time"), "capacity": s.get("capacity") or 1,
                        "application_ids": [legacy] if legacy else []})
    return out


def slot_is_free(slot):
    return len(slot.get("application_ids") or []) < (slot.get("capacity") or 1)


class ViewingPayload(BaseModel):
    property_id: str
    type: str = "single"  # single | slots | group
    title: Optional[str] = None
    datetime: Optional[str] = None       # for single/group
    slots: List[str] = []                # ISO datetimes for slot system
    # How many applicants fit into one slot. A one-hour window with 30-minute viewings
    # holds two people one after another, so capacity is the landlord's call.
    slot_capacity: int = 1
    max_participants: Optional[int] = None
    notes: Optional[str] = None
    duration_minutes: int = 30
    # Everyone who applies from now on is invited automatically.
    open_invite: bool = False


@router.post("/viewings")
async def create_viewing(payload: ViewingPayload, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": payload.property_id})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    vid = new_id()
    capacity = max(1, payload.slot_capacity)
    doc = {
        "id": vid, "property_id": payload.property_id, "org_id": user["org_id"],
        "type": payload.type, "title": payload.title or "Besichtigung",
        "datetime": payload.datetime, "duration_minutes": payload.duration_minutes,
        "slots": [{"time": s, "capacity": capacity, "application_ids": []} for s in payload.slots],
        "max_participants": payload.max_participants, "notes": payload.notes,
        "open_invite": payload.open_invite,
        "participants": [], "created_by": user["id"], "created_at": now_iso(),
    }
    await db.viewings.insert_one(doc)
    await log_activity(user["org_id"], user["id"], "create", "viewing", vid)
    doc.pop("_id", None)
    return doc


AUTO_INVITE_DELAY_MINUTES = 10


async def auto_invite_to_open_viewings(app: dict, prop: dict):
    """Add a fresh applicant to every "offene Besichtigung" of that property.

    The invitation itself is queued rather than sent: the applicant has just received the
    "Bewerbung eingegangen" mail, and a second one in the same second reads like a machine
    gun. It also leaves the landlord a short window to intervene before it goes out.
    Dispatch happens in maintenance.dispatch_pending_viewing_invites.
    """
    open_views = await db.viewings.find(
        {"property_id": prop["id"], "open_invite": True, "cancelled": {"$ne": True}}).to_list(20)
    if not open_views:
        return
    send_at = (datetime.now(timezone.utc) + timedelta(minutes=AUTO_INVITE_DELAY_MINUTES)).isoformat()
    for v in open_views:
        parts = v.get("participants", [])
        if any(p.get("application_id") == app["id"] for p in parts):
            continue
        parts.append({
            "application_id": app["id"], "applicant_user_id": app.get("applicant_user_id"),
            "applicant_email": app.get("applicant_email"),
            "status": "invited", "slot": None,
            "auto_invited": True, "notify_after": send_at, "notified": False,
        })
        await db.viewings.update_one({"id": v["id"]}, {"$set": {"participants": parts}})
        await db.applications.update_one({"id": app["id"]}, {"$set": {"status": "besichtigung"}})


@router.get("/viewings")
async def list_viewings(property_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        raise HTTPException(status_code=403, detail="Keine Organisation")
    q = {"org_id": user["org_id"], "cancelled": {"$ne": True}}
    if property_id:
        q["property_id"] = property_id
    views = await db.viewings.find(q, NO_ID).sort("created_at", -1).to_list(500)
    return views


class InvitePayload(BaseModel):
    application_ids: List[str]
    slot_time: Optional[str] = None


@router.post("/viewings/{vid}/invite")
async def invite_participants(vid: str, payload: InvitePayload, user: dict = Depends(get_current_user)):
    viewing = await db.viewings.find_one({"id": vid})
    if not viewing or viewing["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    existing_ids = {p["application_id"] for p in viewing.get("participants", [])}
    new_parts = list(viewing.get("participants", []))
    for app_id in payload.application_ids:
        if app_id in existing_ids:
            continue
        # Scope to the caller's own org: an unscoped lookup would let a landlord pull a
        # foreign application into their viewing, leaking that applicant's e-mail address
        # in the response and flipping the other org's application status.
        app = await db.applications.find_one({"id": app_id, "org_id": viewing["org_id"]})
        if not app:
            continue
        new_parts.append({
            "application_id": app_id, "applicant_user_id": app["applicant_user_id"],
            "applicant_email": app.get("applicant_email"),
            "status": "invited", "slot": payload.slot_time,
        })
        await notify(app["applicant_user_id"], "viewing_invite", "Einladung zur Besichtigung",
                     f"Sie wurden zu einer Besichtigung eingeladen: {viewing['title']}", "/bewerber/termine")
        when = viewing.get("datetime") or payload.slot_time
        when_block = f"<p>Termin: <b>{when}</b></p>" if when else ""
        if app.get("applicant_email") and await email_enabled(app["applicant_user_id"], "viewings"):
            await render_and_send("viewing_invite", app["applicant_email"], viewing.get("org_id"),
                                  {"viewing_title": viewing["title"], "when_block": when_block}, category="viewings")
        await db.applications.update_one({"id": app_id}, {"$set": {"status": "besichtigung"}})
    await db.viewings.update_one({"id": vid}, {"$set": {"participants": new_parts}})
    await log_activity(user["org_id"], user["id"], "invite", "viewing", vid)
    return {"ok": True, "participants": new_parts}


@router.delete("/viewings/{vid}")
async def delete_viewing(vid: str, user: dict = Depends(get_current_user)):
    viewing = await db.viewings.find_one({"id": vid})
    if not viewing or viewing["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    for p in viewing.get("participants", []):
        await notify(p["applicant_user_id"], "viewing_cancel", "Besichtigung abgesagt",
                     f"Die Besichtigung „{viewing['title']}“ wurde abgesagt.", "/bewerber/termine")
        if p.get("applicant_email") and await email_enabled(p["applicant_user_id"], "viewings"):
            await render_and_send("viewing_cancelled", p["applicant_email"], viewing.get("org_id"),
                                  {"viewing_title": viewing["title"]}, category="viewings")
    # Soft-cancel instead of hard delete, so an applicant who missed the email still sees
    # the cancellation in "Meine Termine" instead of the appointment just vanishing.
    await db.viewings.update_one({"id": vid}, {"$set": {"cancelled": True, "cancelled_at": now_iso()}})
    return {"ok": True}


@router.get("/my/viewings")
async def my_viewings(user: dict = Depends(get_current_user)):
    views = await db.viewings.find(
        {"participants.applicant_user_id": user["id"]}, NO_ID).sort("datetime", 1).to_list(200)
    result = []
    for v in views:
        mine = next((p for p in v.get("participants", []) if p["applicant_user_id"] == user["id"]), None)
        prop = await db.properties.find_one({"id": v["property_id"]}, NO_ID)
        free_slots = [s["time"] for s in normalize_slots(v.get("slots", [])) if slot_is_free(s)]
        my_app_id = mine.get("application_id") if mine else None
        # include the slot I already booked as still selectable label
        result.append({
            "id": v["id"], "title": v["title"], "type": v["type"], "datetime": v.get("datetime"),
            "slot": mine.get("slot") if mine else None,
            "free_slots": [] if v.get("cancelled") else free_slots,
            "my_status": "cancelled" if v.get("cancelled") else (mine.get("status") if mine else None),
            "cancelled": bool(v.get("cancelled")),
            "property_title": (prop or {}).get("title"),
            "city": (prop or {}).get("city"),
        })
    return result


class BookSlotPayload(BaseModel):
    slot_time: str


@router.post("/viewings/{vid}/book-slot")
async def book_slot(vid: str, payload: BookSlotPayload, user: dict = Depends(get_current_user)):
    viewing = await db.viewings.find_one({"id": vid})
    if not viewing or viewing.get("cancelled"):
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    if viewing.get("type") != "slots":
        raise HTTPException(status_code=400, detail="Kein Zeitfenster-Termin")
    parts = viewing.get("participants", [])
    mine = next((p for p in parts if p["applicant_user_id"] == user["id"]), None)
    if not mine:
        raise HTTPException(status_code=403, detail="Nicht eingeladen")
    slots = normalize_slots(viewing.get("slots", []))
    target = next((s for s in slots if s["time"] == payload.slot_time), None)
    if not target:
        raise HTTPException(status_code=404, detail="Zeitfenster nicht gefunden")
    my_app = mine.get("application_id")
    # First come, first served — but a slot can hold more than one applicant if the
    # landlord said so, so it's only full once its capacity is used up.
    if my_app not in (target.get("application_ids") or []) and not slot_is_free(target):
        raise HTTPException(status_code=409, detail="Zeitfenster bereits ausgebucht")
    # release any previously held slot by this applicant
    for s in slots:
        s["application_ids"] = [a for a in s.get("application_ids", []) if a != my_app]
    target["application_ids"] = list(target.get("application_ids", [])) + [my_app]
    mine["slot"] = payload.slot_time
    mine["status"] = "confirmed"
    await db.viewings.update_one({"id": vid}, {"$set": {"slots": slots, "participants": parts}})
    await notify_org_team(viewing.get("org_id"), "viewing_response", "Zeitfenster gebucht",
                          f"{user.get('name')} hat ein Zeitfenster gebucht: {payload.slot_time}",
                          f"/objekte/{viewing['property_id']}",
                          email_subject="Zeitfenster gebucht", email_title="Ein Bewerber hat ein Zeitfenster gebucht",
                          email_body_html=f"<p><b>{user.get('name')}</b> hat für die Besichtigung <b>{viewing['title']}</b> "
                                         f"das Zeitfenster <b>{payload.slot_time}</b> gebucht.</p>",
                          category="viewings")
    if mine.get("applicant_email") and await email_enabled(mine["applicant_user_id"], "viewings"):
        await render_and_send("viewing_slot_confirmed", mine["applicant_email"], viewing.get("org_id"),
                              {"viewing_title": viewing["title"], "slot_time": payload.slot_time}, category="viewings")
    return {"ok": True, "slot": payload.slot_time}


class RespondPayload(BaseModel):
    action: str  # confirm | decline | reschedule
    message: Optional[str] = None


@router.post("/viewings/{vid}/respond")
async def respond_viewing(vid: str, payload: RespondPayload, user: dict = Depends(get_current_user)):
    viewing = await db.viewings.find_one({"id": vid})
    if not viewing or viewing.get("cancelled"):
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    parts = viewing.get("participants", [])
    slots = normalize_slots(viewing.get("slots", []))
    found = False
    for p in parts:
        if p["applicant_user_id"] == user["id"]:
            p["status"] = {"confirm": "confirmed", "decline": "declined",
                           "reschedule": "reschedule_requested"}.get(payload.action, p["status"])
            found = True
            if payload.action == "decline" and p.get("slot"):
                # free up the booked slot so other applicants can take it
                for s in slots:
                    s["application_ids"] = [a for a in s.get("application_ids", [])
                                            if a != p.get("application_id")]
                p["slot"] = None
    if not found:
        raise HTTPException(status_code=403, detail="Nicht eingeladen")
    await db.viewings.update_one({"id": vid}, {"$set": {"participants": parts, "slots": slots}})
    label = {"confirm": "bestätigt", "decline": "abgesagt", "reschedule": "Umbuchung angefragt"}.get(payload.action)
    msg_html = f"<p>Nachricht: {payload.message}</p>" if payload.message else ""
    await notify_org_team(viewing.get("org_id"), "viewing_response", "Besichtigung: Rückmeldung",
                          f"{user.get('name')} hat den Termin {label}." + (f" Nachricht: {payload.message}" if payload.message else ""),
                          f"/objekte/{viewing['property_id']}",
                          email_subject=f"Besichtigung: {label}", email_title="Rückmeldung zu Ihrer Besichtigung",
                          email_body_html=f"<p><b>{user.get('name')}</b> hat den Termin <b>{viewing['title']}</b> "
                                         f"<b>{label}</b>.</p>{msg_html}"
                                         f"<p>Sehen Sie sich die Details in Ihrem MietGate-Dashboard an.</p>",
                          category="viewings")
    return {"ok": True}


class RescheduleResponsePayload(BaseModel):
    action: str  # reoffer | decline
    message: Optional[str] = None
    new_datetime: Optional[str] = None  # reoffer on a single/group viewing: the actual new time


@router.post("/viewings/{vid}/participants/{application_id}/reschedule-response")
async def respond_to_reschedule(vid: str, application_id: str, payload: RescheduleResponsePayload,
                                user: dict = Depends(get_current_user)):
    """Close the loop on an applicant's reschedule request.

    Without this the request was a dead end: the applicant asked, the landlord
    saw a status label, and there was no way to answer.
    """
    viewing = await db.viewings.find_one({"id": vid})
    if not viewing or viewing["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    parts = viewing.get("participants", [])
    slots = normalize_slots(viewing.get("slots", []))
    target = next((p for p in parts if p.get("application_id") == application_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Teilnehmer nicht gefunden")
    if target.get("status") != "reschedule_requested":
        raise HTTPException(status_code=400, detail="Für diesen Teilnehmer liegt keine Umbuchungsanfrage vor")

    # Either way the previously held slot is released — the applicant no longer wants it.
    for s in slots:
        s["application_ids"] = [a for a in s.get("application_ids", []) if a != application_id]
    target["slot"] = None

    new_datetime = None
    if payload.action == "reoffer":
        target["status"] = "invited"
        title = "Neuer Termin möglich"
        # Slot-type viewings already let the applicant pick any free slot themselves — only
        # single/group viewings share one fixed datetime that only the landlord can move.
        if payload.new_datetime and viewing.get("type") != "slots":
            new_datetime = payload.new_datetime
            body = f"Der Vermieter schlägt einen neuen Termin vor: {new_datetime}"
            html = ("<p>Der Vermieter hat Ihre Umbuchungsanfrage für die Besichtigung <b>%s</b> angenommen "
                    "und einen neuen Termin vorgeschlagen:</p><p><b>%s</b></p>"
                    "<p>Bitte bestätigen Sie den Termin in Ihrem MietGate-Konto.</p>" % (viewing["title"], new_datetime))
        else:
            body = "Der Vermieter hat Ihre Umbuchungsanfrage angenommen."
            html = ("<p>Ihre Umbuchungsanfrage für die Besichtigung <b>%s</b> wurde angenommen.</p>"
                    "<p>Bitte wählen Sie in Ihrem MietGate-Konto einen neuen Termin.</p>" % viewing["title"])
    elif payload.action == "decline":
        target["status"] = "declined"
        title, body = "Umbuchung nicht möglich", "Der Vermieter kann Ihre Umbuchungsanfrage nicht erfüllen."
        html = ("<p>Ihre Umbuchungsanfrage für die Besichtigung <b>%s</b> konnte leider nicht erfüllt werden.</p>"
                % viewing["title"])
    else:
        raise HTTPException(status_code=400, detail="Ungültige Aktion")

    if payload.message:
        html += f"<p>Nachricht vom Vermieter: {payload.message}</p>"

    update = {"participants": parts, "slots": slots}
    if new_datetime:
        update["datetime"] = new_datetime
    await db.viewings.update_one({"id": vid}, {"$set": update})
    await notify(target["applicant_user_id"], "viewing_reschedule_response", title, body, "/bewerber/termine")
    if target.get("applicant_email") and await email_enabled(target["applicant_user_id"], "viewings"):
        await send_email(target["applicant_email"], title, title, html)
    await log_activity(user["org_id"], user["id"], "reschedule_response", "viewing", vid,
                       {"action": payload.action, "application_id": application_id})
    return {"ok": True, "participants": parts}
