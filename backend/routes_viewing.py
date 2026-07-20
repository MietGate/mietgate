from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, log_activity, notify

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
    q = {"org_id": user["org_id"]}
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
                     f"Sie wurden zu einer Besichtigung eingeladen: {viewing['title']}")
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
                     f"Die Besichtigung „{viewing['title']}“ wurde abgesagt.")
    await db.viewings.delete_one({"id": vid})
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
            "free_slots": free_slots,
            "my_status": mine.get("status") if mine else None,
            "property_title": (prop or {}).get("title"),
            "city": (prop or {}).get("city"),
        })
    return result


class BookSlotPayload(BaseModel):
    slot_time: str


@router.post("/viewings/{vid}/book-slot")
async def book_slot(vid: str, payload: BookSlotPayload, user: dict = Depends(get_current_user)):
    viewing = await db.viewings.find_one({"id": vid})
    if not viewing:
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
    await notify(viewing.get("created_by"), "viewing_response", "Zeitfenster gebucht",
                 f"{user.get('name')} hat ein Zeitfenster gebucht: {payload.slot_time}")
    return {"ok": True, "slot": payload.slot_time}


class RespondPayload(BaseModel):
    action: str  # confirm | decline | reschedule
    message: Optional[str] = None


@router.post("/viewings/{vid}/respond")
async def respond_viewing(vid: str, payload: RespondPayload, user: dict = Depends(get_current_user)):
    viewing = await db.viewings.find_one({"id": vid})
    if not viewing:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    parts = viewing.get("participants", [])
    found = False
    for p in parts:
        if p["applicant_user_id"] == user["id"]:
            p["status"] = {"confirm": "confirmed", "decline": "declined",
                           "reschedule": "reschedule_requested"}.get(payload.action, p["status"])
            found = True
    if not found:
        raise HTTPException(status_code=403, detail="Nicht eingeladen")
    await db.viewings.update_one({"id": vid}, {"$set": {"participants": parts}})
    label = {"confirm": "bestätigt", "decline": "abgesagt", "reschedule": "Umbuchung angefragt"}.get(payload.action)
    await notify(viewing.get("created_by"), "viewing_response", "Besichtigung: Rückmeldung",
                 f"{user.get('name')} hat den Termin {label}." + (f" Nachricht: {payload.message}" if payload.message else ""))
    return {"ok": True}
