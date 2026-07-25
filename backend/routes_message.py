from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, notify

router = APIRouter(prefix="/api", tags=["messages"])


async def _check_access(application_id, user):
    app = await db.applications.find_one({"id": application_id})
    if not app:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    is_owner = app["applicant_user_id"] == user["id"]
    is_landlord = app["org_id"] == user.get("org_id")
    if not (is_owner or is_landlord):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    return app, is_landlord


@router.get("/messages")
async def get_messages(application_id: str, user: dict = Depends(get_current_user)):
    await _check_access(application_id, user)
    msgs = await db.messages.find({"application_id": application_id}, NO_ID).sort("created_at", 1).to_list(500)
    await db.messages.update_many(
        {"application_id": application_id, "recipient_id": user["id"], "read": False},
        {"$set": {"read": True}})
    return msgs


class MessagePayload(BaseModel):
    application_id: str
    body: str


@router.post("/messages")
async def send_message(payload: MessagePayload, user: dict = Depends(get_current_user)):
    app, is_landlord = await _check_access(payload.application_id, user)
    prop = await db.properties.find_one({"id": app["property_id"]}, NO_ID)
    recipient_id = app["applicant_user_id"] if is_landlord else prop.get("created_by")
    msg = {
        "id": new_id(), "application_id": payload.application_id,
        "property_id": app["property_id"], "org_id": app["org_id"],
        "sender_id": user["id"], "sender_name": user.get("name"),
        "sender_role": "landlord" if is_landlord else "applicant",
        "recipient_id": recipient_id, "body": payload.body,
        "read": False, "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    link = "/bewerber" if is_landlord else f"/objekte/{app['property_id']}"
    await notify(recipient_id, "message", "Neue Nachricht",
                 f"{user.get('name')}: {payload.body[:60]}", link)
    msg.pop("_id", None)
    return msg


@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(100)


@router.get("/notifications/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": count}


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}
