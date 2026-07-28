import os
import secrets
from fastapi import APIRouter, HTTPException, Depends, Response
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import Optional
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, notify, email_user
from email_service import send_email
from storage import get_object, safe_inline_response

router = APIRouter(prefix="/api", tags=["profile"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def _display_name(user):
    last = (user.get("last_name") or "").strip()
    initial = f"{last[0]}." if last else ""
    first = (user.get("first_name") or "Bewerber").strip()
    return f"{first} {initial}".strip()


@router.get("/my/profile-link")
async def get_profile_link(user: dict = Depends(get_current_user)):
    if user.get("role") != "applicant":
        raise HTTPException(status_code=403, detail="Nur für Bewerber verfügbar")
    if not user.get("premium"):
        raise HTTPException(status_code=402, detail="Der Profil-Link ist Teil von Bewerber-Premium.")
    token = user.get("profile_token")
    if not token:
        token = secrets.token_urlsafe(12)
        await db.users.update_one({"id": user["id"]}, {"$set": {"profile_token": token}})
    return {"token": token, "url": f"{FRONTEND_URL}/p/{token}"}


@router.get("/public/profile/{token}")
async def public_profile(token: str):
    owner = await db.users.find_one({"profile_token": token, "role": "applicant"}, NO_ID)
    if not owner or not owner.get("premium"):
        raise HTTPException(status_code=404, detail="Profil nicht gefunden")
    doc_types = await db.documents.distinct(
        "doc_type", {"applicant_user_id": owner["id"], "is_deleted": False})
    return {
        "display_name": _display_name(owner),
        "verified": True,
        "document_types": sorted(doc_types),
    }


class InterestRequest(BaseModel):
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    property_label: Optional[str] = None
    message: Optional[str] = None


@router.post("/public/profile/{token}/interest")
async def express_interest(token: str, req: InterestRequest):
    owner = await db.users.find_one({"profile_token": token, "role": "applicant"}, NO_ID)
    if not owner or not owner.get("premium"):
        raise HTTPException(status_code=404, detail="Profil nicht gefunden")
    contact_email = (req.contact_email or "").strip() or None
    contact_phone = (req.contact_phone or "").strip() or None
    if not contact_email and not contact_phone:
        raise HTTPException(status_code=400, detail="Bitte E-Mail oder Telefonnummer angeben")

    inquiry_id = new_id()
    await db.profile_inquiries.insert_one({
        "id": inquiry_id, "applicant_user_id": owner["id"], "profile_token": token,
        "contact_email": contact_email, "contact_phone": contact_phone,
        "property_label": (req.property_label or "").strip() or None,
        "message": (req.message or "").strip() or None,
        "status": "pending", "share_token": None,
        "created_at": now_iso(), "responded_at": None,
    })

    who = contact_email or contact_phone
    label_part = f' für „{req.property_label}"' if req.property_label else ""
    await notify(owner["id"], "profile_inquiry", "Neue Anfrage von einem Vermieter",
                 f"{who} hat Interesse an Ihrem Bewerber-Profil{label_part} bekundet.", "/bewerber")
    body = f"<p><strong>{who}</strong> hat über Ihren Profil-Link Interesse bekundet{label_part}.</p>"
    if req.message:
        body += f"<p>Nachricht: {req.message}</p>"
    body += ("<p>Loggen Sie sich ein, um die Anfrage zu beantworten und bei Bedarf Ihre "
             "hinterlegten Dokumente freizugeben.</p>")
    await email_user(owner["id"], "Neue Anfrage von einem Vermieter",
                      "Ein Vermieter interessiert sich für Ihr Profil", body,
                      category="inquiries")
    return {"ok": True}


@router.get("/my/profile-inquiries")
async def list_inquiries(user: dict = Depends(get_current_user)):
    if user.get("role") != "applicant":
        raise HTTPException(status_code=403, detail="Nur für Bewerber verfügbar")
    inquiries = await db.profile_inquiries.find(
        {"applicant_user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(200)
    for i in inquiries:
        if i.get("share_token"):
            i["share_url"] = f"{FRONTEND_URL}/geteilt/{i['share_token']}"
    return inquiries


class RespondRequest(BaseModel):
    action: str  # "grant" | "decline"


@router.post("/my/profile-inquiries/{inquiry_id}/respond")
async def respond_inquiry(inquiry_id: str, req: RespondRequest, user: dict = Depends(get_current_user)):
    inquiry = await db.profile_inquiries.find_one({"id": inquiry_id})
    if not inquiry or inquiry["applicant_user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    if inquiry["status"] != "pending":
        raise HTTPException(status_code=400, detail="Anfrage wurde bereits beantwortet")
    if req.action not in ("grant", "decline"):
        raise HTTPException(status_code=400, detail="Ungültige Aktion")

    if req.action == "decline":
        await db.profile_inquiries.update_one(
            {"id": inquiry_id}, {"$set": {"status": "declined", "responded_at": now_iso()}})
        return {"ok": True, "status": "declined"}

    share_token = secrets.token_urlsafe(20)
    await db.profile_inquiries.update_one({"id": inquiry_id}, {"$set": {
        "status": "granted", "responded_at": now_iso(), "share_token": share_token,
    }})
    share_url = f"{FRONTEND_URL}/geteilt/{share_token}"
    if inquiry.get("contact_email"):
        applicant_name = _display_name(user)
        await send_email(
            inquiry["contact_email"], "Dokumente freigegeben – MietGate",
            f"{applicant_name} hat Ihnen Dokumente freigegeben",
            f'<p>Sie können die freigegebenen Dokumente hier einsehen:</p>'
            f'<p><a href="{share_url}">Dokumente ansehen</a></p>'
            f'<p>Für Rückfragen erreichen Sie den Bewerber direkt unter: {user.get("email", "")}</p>')
    return {"ok": True, "status": "granted", "share_token": share_token, "share_url": share_url}


@router.get("/public/shared/{share_token}")
async def view_shared(share_token: str):
    inquiry = await db.profile_inquiries.find_one({"share_token": share_token, "status": "granted"}, NO_ID)
    if not inquiry:
        raise HTTPException(status_code=404, detail="Freigabe nicht gefunden oder abgelaufen")
    owner = await db.users.find_one({"id": inquiry["applicant_user_id"]}, NO_ID)
    if not owner:
        raise HTTPException(status_code=404, detail="Freigabe nicht gefunden")
    docs = await db.documents.find(
        {"applicant_user_id": owner["id"], "is_deleted": False}, NO_ID).sort("created_at", -1).to_list(100)
    return {
        "display_name": _display_name(owner),
        "applicant_email": owner.get("email"),
        "documents": [{"id": d["id"], "doc_type": d["doc_type"], "original_filename": d["original_filename"]} for d in docs],
    }


@router.get("/public/shared/{share_token}/documents/{doc_id}/download")
async def download_shared_document(share_token: str, doc_id: str):
    inquiry = await db.profile_inquiries.find_one({"share_token": share_token, "status": "granted"})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Freigabe nicht gefunden oder abgelaufen")
    rec = await db.documents.find_one(
        {"id": doc_id, "applicant_user_id": inquiry["applicant_user_id"], "is_deleted": False}, NO_ID)
    if not rec:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    data, content_type = await run_in_threadpool(get_object, rec["storage_path"])
    media_type, disposition = safe_inline_response(
        rec.get("content_type") or content_type, rec.get("original_filename", "datei"))
    return Response(content=data, media_type=media_type,
                    headers={"Content-Disposition": disposition})
