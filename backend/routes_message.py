from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, notify, notify_org_team, email_user

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


@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    """One row per application that has messages, newest first.

    GET /messages only works per application, so the inbox needs this to show
    every conversation across all properties in one place.
    """
    org_id = user.get("org_id")
    if org_id:
        match = {"org_id": org_id}
    else:
        own = await db.applications.find({"applicant_user_id": user["id"]}, {"id": 1, "_id": 0}).to_list(500)
        match = {"application_id": {"$in": [a["id"] for a in own]}}

    rows = await db.messages.aggregate([
        {"$match": match},
        {"$sort": {"created_at": 1}},
        {"$group": {
            "_id": "$application_id",
            "property_id": {"$last": "$property_id"},
            "last_body": {"$last": "$body"},
            "last_at": {"$last": "$created_at"},
            "last_sender_role": {"$last": "$sender_role"},
            "total": {"$sum": 1},
            "unread": {"$sum": {"$cond": [
                {"$and": [{"$eq": ["$recipient_id", user["id"]]}, {"$eq": ["$read", False]}]}, 1, 0]}},
        }},
        {"$sort": {"last_at": -1}},
        {"$limit": 200},
    ]).to_list(200)

    prop_cache = {}
    out = []
    seen_app_ids = set()
    for r in rows:
        app = await db.applications.find_one({"id": r["_id"]}, NO_ID)
        if not app:
            continue
        seen_app_ids.add(app["id"])
        pid = r.get("property_id") or app.get("property_id")
        if pid not in prop_cache:
            prop_cache[pid] = await db.properties.find_one({"id": pid}, NO_ID)
        prop = prop_cache[pid] or {}
        fd = app.get("form_data") or {}
        name = " ".join(filter(None, [fd.get("vorname"), fd.get("nachname")])).strip()
        out.append({
            "application_id": r["_id"],
            "property_id": pid,
            "property_title": prop.get("title"),
            "applicant_name": name or app.get("applicant_email"),
            "applicant_email": app.get("applicant_email"),
            "application_status": app.get("status"),
            "last_body": r["last_body"],
            "last_at": r["last_at"],
            "last_sender_role": r["last_sender_role"],
            "total": r["total"],
            "unread": r["unread"],
        })

    # A landlord should be able to write the first message to any applicant, not only
    # reply to one who wrote first — so every application without messages yet also gets
    # a (empty) row here instead of being invisible until the applicant speaks up.
    if org_id:
        no_msg_apps = await db.applications.find(
            {"org_id": org_id, "id": {"$nin": list(seen_app_ids)}}, NO_ID
        ).sort("created_at", -1).to_list(300)
        for app in no_msg_apps:
            pid = app.get("property_id")
            if pid not in prop_cache:
                prop_cache[pid] = await db.properties.find_one({"id": pid}, NO_ID)
            prop = prop_cache[pid] or {}
            fd = app.get("form_data") or {}
            name = " ".join(filter(None, [fd.get("vorname"), fd.get("nachname")])).strip()
            out.append({
                "application_id": app["id"],
                "property_id": pid,
                "property_title": prop.get("title"),
                "applicant_name": name or app.get("applicant_email"),
                "applicant_email": app.get("applicant_email"),
                "application_status": app.get("status"),
                "last_body": None,
                "last_at": app.get("created_at"),
                "last_sender_role": None,
                "total": 0,
                "unread": 0,
            })
        out.sort(key=lambda x: x["last_at"] or "", reverse=True)
    return out


class MessagePayload(BaseModel):
    application_id: str
    body: str
    reply_to: Optional[str] = None


@router.post("/messages")
async def send_message(payload: MessagePayload, user: dict = Depends(get_current_user)):
    app, is_landlord = await _check_access(payload.application_id, user)
    prop = await db.properties.find_one({"id": app["property_id"]}, NO_ID)
    recipient_id = app["applicant_user_id"] if is_landlord else prop.get("created_by")
    reply_to = None
    if payload.reply_to:
        # Scope the lookup to this conversation so a quote can't pull text out of another one.
        quoted = await db.messages.find_one(
            {"id": payload.reply_to, "application_id": payload.application_id}, NO_ID)
        if quoted:
            reply_to = payload.reply_to
    msg = {
        "id": new_id(), "application_id": payload.application_id,
        "property_id": app["property_id"], "org_id": app["org_id"],
        "sender_id": user["id"], "sender_name": user.get("name"),
        "sender_role": "landlord" if is_landlord else "applicant",
        "recipient_id": recipient_id, "body": payload.body,
        "reply_to": reply_to, "retracted": False,
        "read": False, "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    preview = payload.body[:60]
    email_html = (f"<p><b>{user.get('name')}</b> hat Ihnen eine Nachricht geschrieben:</p>"
                  f"<blockquote style='margin:12px 0;padding-left:12px;border-left:3px solid #e2e8f0;color:#334155'>"
                  f"{payload.body[:400]}</blockquote>"
                  f"<p>Antworten können Sie direkt in Ihrem MietGate-Konto.</p>")
    if is_landlord:
        link = f"/bewerber/nachrichten?application_id={payload.application_id}"
        await notify(recipient_id, "message", "Neue Nachricht", f"{user.get('name')}: {preview}", link)
        # Without this, an applicant who isn't logged in never learns a landlord replied.
        await email_user(recipient_id, "Neue Nachricht zu Ihrer Bewerbung",
                         "Sie haben eine neue Nachricht", email_html, category="messages")
    else:
        # An applicant's message should reach every team member managing this property,
        # not just whoever originally created it.
        await notify_org_team(app["org_id"], "message", "Neue Nachricht",
                              f"{user.get('name')}: {preview}", f"/nachrichten",
                              email_subject="Neue Nachricht von einem Bewerber",
                              email_title="Sie haben eine neue Nachricht",
                              email_body_html=email_html, category="messages")
    msg.pop("_id", None)
    return msg


@router.post("/messages/{mid}/retract")
async def retract_message(mid: str, user: dict = Depends(get_current_user)):
    """Withdraw one's own message.

    The row stays as a tombstone rather than disappearing: the other side may already have
    read it, and a message silently vanishing from a conversation is worse than one that
    says it was withdrawn.
    """
    msg = await db.messages.find_one({"id": mid})
    if not msg or msg.get("sender_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Nachricht nicht gefunden")
    if msg.get("retracted"):
        return {"ok": True}
    await db.messages.update_one(
        {"id": mid}, {"$set": {"retracted": True, "body": "", "retracted_at": now_iso()}})
    return {"ok": True}


@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(100)


@router.get("/notifications/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": count}


@router.get("/badges")
async def sidebar_badges(user: dict = Depends(get_current_user)):
    """Counts for the sidebar: what still needs this user's attention, per section.

    Cheap counts only — this is polled alongside the notification bell, so it must not
    turn into a second dashboard query.
    """
    out = {"messages": await db.messages.count_documents(
        {"recipient_id": user["id"], "read": False})}

    if user.get("role") == "applicant":
        # Appointments the applicant was invited to but has not answered yet.
        out["viewings"] = await db.viewings.count_documents({
            "cancelled": {"$ne": True},
            "participants": {"$elemMatch": {"applicant_user_id": user["id"], "status": "invited"}},
        })
        # Requested documents with no matching upload yet.
        apps = await db.applications.find(
            {"applicant_user_id": user["id"], "requested_documents": {"$exists": True, "$ne": []}},
            {"requested_documents": 1, "_id": 0}).to_list(200)
        if apps:
            have = set(await db.documents.distinct(
                "doc_type", {"applicant_user_id": user["id"], "is_deleted": False}))
            wanted = {d for a in apps for d in a.get("requested_documents", [])}
            out["documents"] = len(wanted - have)
        else:
            out["documents"] = 0
    elif user.get("org_id"):
        # Applications nobody has looked at yet — tracked separately from pipeline stage,
        # so opening one clears the badge without moving it out of "Neu".
        out["applications"] = await db.applications.count_documents(
            {"org_id": user["org_id"], "status": "neu", "viewed_by_landlord": {"$ne": True}})
        # Applicants who answered an invitation and are waiting on the landlord.
        out["calendar"] = await db.viewings.count_documents({
            "org_id": user["org_id"], "cancelled": {"$ne": True},
            "participants.status": "reschedule_requested",
        })
    return out


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}
