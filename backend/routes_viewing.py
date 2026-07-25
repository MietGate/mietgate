from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, log_activity, notify, email_user, notify_org_team
from email_service import send_email

router = APIRouter(prefix="/api", tags=["viewings"])


class ViewingPayload(BaseModel):
    property_id: str
    type: str = "single"  # single | slots | group
    title: Optional[str] = None
    datetime: Optional[str] = None       # for single/group
    slots: List[str] = []                # ISO datetimes for slot system
    max_participants: Optional[int] = None
    notes: Optional[str] = None


@router.post("/viewings")
async def create_viewing(payload: ViewingPayload, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": payload.property_id})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    vid = new_id()
    doc = {
        "id": vid, "property_id": payload.property_id, "org_id": user["org_id"],
        "type": payload.type, "title": payload.title or "Besichtigung",
        "datetime": payload.datetime,
        "slots": [{"time": s, "application_id": None} for s in payload.slots],
        "max_participants": payload.max_participants, "notes": payload.notes,
        "participants": [], "created_by": user["id"], "created_at": now_iso(),
    }
    await db.viewings.insert_one(doc)
    await log_activity(user["org_id"], user["id"], "create", "viewing", vid)
    doc.pop("_id", None)
    return doc


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
        app = await db.applications.find_one({"id": app_id})
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
        when_txt = f"<p>Termin: <b>{when}</b></p>" if when else ""
        if app.get("applicant_email"):
            await send_email(app["applicant_email"], "Einladung zur Besichtigung",
                             "Sie sind zu einer Besichtigung eingeladen",
                             f"<p>Sie wurden zur Besichtigung <b>{viewing['title']}</b> eingeladen.</p>{when_txt}"
                             f"<p>Bitte bestätigen Sie den Termin in Ihrem MietGate-Konto.</p>")
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
        if p.get("applicant_email"):
            await send_email(p["applicant_email"], "Besichtigung abgesagt",
                             "Ihre Besichtigung wurde abgesagt",
                             f"<p>Die Besichtigung <b>{viewing['title']}</b> wurde vom Vermieter abgesagt.</p>"
                             f"<p>Bei Fragen wenden Sie sich bitte an den Vermieter.</p>")
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
        free_slots = [s["time"] for s in v.get("slots", []) if not s.get("application_id")]
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
    slots = viewing.get("slots", [])
    target = next((s for s in slots if s["time"] == payload.slot_time), None)
    if not target:
        raise HTTPException(status_code=404, detail="Zeitfenster nicht gefunden")
    if target.get("application_id") and target["application_id"] != mine.get("application_id"):
        raise HTTPException(status_code=409, detail="Zeitfenster bereits vergeben")
    # release any previously held slot by this applicant
    for s in slots:
        if s.get("application_id") == mine.get("application_id"):
            s["application_id"] = None
    target["application_id"] = mine.get("application_id")
    mine["slot"] = payload.slot_time
    mine["status"] = "confirmed"
    await db.viewings.update_one({"id": vid}, {"$set": {"slots": slots, "participants": parts}})
    await notify_org_team(viewing.get("org_id"), "viewing_response", "Zeitfenster gebucht",
                          f"{user.get('name')} hat ein Zeitfenster gebucht: {payload.slot_time}",
                          f"/objekte/{viewing['property_id']}",
                          email_subject="Zeitfenster gebucht", email_title="Ein Bewerber hat ein Zeitfenster gebucht",
                          email_body_html=f"<p><b>{user.get('name')}</b> hat für die Besichtigung <b>{viewing['title']}</b> "
                                         f"das Zeitfenster <b>{payload.slot_time}</b> gebucht.</p>")
    if mine.get("applicant_email"):
        await send_email(mine["applicant_email"], "Zeitfenster bestätigt", "Ihr Besichtigungstermin ist bestätigt",
                         f"<p>Ihr Zeitfenster für die Besichtigung <b>{viewing['title']}</b> wurde erfolgreich gebucht:</p>"
                         f"<p><b>{payload.slot_time}</b></p>"
                         f"<p>Sie können den Termin jederzeit in Ihrem MietGate-Konto unter \"Meine Termine\" einsehen.</p>")
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
    slots = viewing.get("slots", [])
    found = False
    for p in parts:
        if p["applicant_user_id"] == user["id"]:
            p["status"] = {"confirm": "confirmed", "decline": "declined",
                           "reschedule": "reschedule_requested"}.get(payload.action, p["status"])
            found = True
            if payload.action == "decline" and p.get("slot"):
                # free up the booked slot so other applicants can take it
                for s in slots:
                    if s.get("application_id") == p.get("application_id"):
                        s["application_id"] = None
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
                                         f"<p>Sehen Sie sich die Details in Ihrem MietGate-Dashboard an.</p>")
    return {"ok": True}
