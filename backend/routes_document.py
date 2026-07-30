import uuid
from fastapi import (APIRouter, HTTPException, Depends, UploadFile, File, Form,
                     Header, Response)
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from typing import Optional, List
from database import db, NO_ID
from security import get_current_user, resolve_user_by_token
from storage import (put_object, get_object, delete_object, guess_mime,
                     safe_inline_response, APP_NAME)
from helpers import new_id, now_iso, log_activity, notify
from email_service import send_email
from constants import (DOCUMENT_TYPES, doc_released_to_landlord, doc_release_hint,
                       redact_doc_for_landlord)


router = APIRouter(prefix="/api", tags=["documents"])


async def _store_document(file: UploadFile, doc_type, applicant_user_id, application_id, org_id, property_id):
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Datei zu groß (max. 15 MB)")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/documents/{applicant_user_id or 'anon'}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or guess_mime(file.filename)
    result = put_object(path, data, content_type)
    doc_id = new_id()
    rec = {
        "id": doc_id, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": content_type, "size": result.get("size", len(data)),
        "doc_type": doc_type or "Sonstiges", "applicant_user_id": applicant_user_id,
        "application_id": application_id, "org_id": org_id, "property_id": property_id,
        "is_deleted": False, "created_at": now_iso(),
    }
    await db.documents.insert_one(rec)
    rec.pop("_id", None)
    return rec


MAX_DOCS_PER_APPLICATION = 30


@router.post("/public/documents/upload")
async def public_upload(code: str = Form(...), application_id: str = Form(...),
                        doc_type: str = Form("Sonstiges"), file: UploadFile = File(...)):
    app = await db.applications.find_one({"id": application_id})
    if not app:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    prop = await db.properties.find_one({"id": app["property_id"]})
    if not prop or prop.get("application_code") != code:
        raise HTTPException(status_code=403, detail="Nicht autorisiert")
    existing = await db.documents.count_documents(
        {"application_id": application_id, "is_deleted": False})
    if existing >= MAX_DOCS_PER_APPLICATION:
        raise HTTPException(status_code=400, detail="Maximale Anzahl Dokumente für diese Bewerbung erreicht")
    rec = await _store_document(file, doc_type, app["applicant_user_id"],
                                application_id, app["org_id"], app["property_id"])
    # Deep-link straight to the applicant's card, not just the property — otherwise clicking
    # the notification lands on the Kanban board with no obvious next step.
    await notify(prop.get("created_by"), "new_document", "Neues Dokument",
                f"Ein Bewerber hat ein Dokument hochgeladen ({doc_type}).",
                f"/bewerbungen?view=kanban&open={application_id}")
    return rec


@router.post("/documents/upload")
async def upload_document(doc_type: str = Form("Sonstiges"),
                          application_id: Optional[str] = Form(None),
                          file: UploadFile = File(...),
                          user: dict = Depends(get_current_user)):
    org_id, property_id = None, None
    if application_id:
        app = await db.applications.find_one({"id": application_id})
        if app:
            if app["applicant_user_id"] != user["id"]:
                raise HTTPException(status_code=403, detail="Keine Berechtigung für diese Bewerbung")
            org_id, property_id = app["org_id"], app["property_id"]
    rec = await _store_document(file, doc_type, user["id"], application_id, org_id, property_id)
    if org_id:
        prop = await db.properties.find_one({"id": property_id}, NO_ID)
        await notify(prop.get("created_by"), "new_document", "Neues Dokument",
                     f"Ein Bewerber hat ein Dokument hochgeladen ({doc_type}).",
                     f"/bewerbungen?view=kanban&open={application_id}")
    return rec


@router.get("/documents")
async def list_documents(application_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    if application_id:
        app = await db.applications.find_one({"id": application_id})
        if not app:
            raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
        is_owner = app["applicant_user_id"] == user["id"]
        is_landlord = app["org_id"] == user.get("org_id")
        if not (is_owner or is_landlord):
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        q = {"application_id": application_id, "is_deleted": False}
        docs = await db.documents.find(q, NO_ID).sort("created_at", -1).to_list(200)
        # The applicant always sees their own uploads in full; the landlord only sees
        # what the application's current stage allows.
        if is_landlord and not is_owner:
            status = app.get("status", "neu")
            return [redact_doc_for_landlord(d, status) for d in docs]
        return docs
    q = {"applicant_user_id": user["id"], "is_deleted": False}
    return await db.documents.find(q, NO_ID).sort("created_at", -1).to_list(200)


@router.get("/documents/landlord")
async def list_documents_landlord(user: dict = Depends(get_current_user)):
    """All documents across every applicant/property in the landlord's org — the
    aggregate view behind the "Dokumente" nav item, same staged-release redaction
    as the per-application view so a landlord still can't see a document before its
    application reaches the stage the applicant's data protection allows."""
    org_id = user.get("org_id")
    if not org_id:
        return []
    docs = await db.documents.find({"org_id": org_id, "is_deleted": False}, NO_ID).sort("created_at", -1).to_list(500)
    if not docs:
        return []
    app_ids = list({d["application_id"] for d in docs if d.get("application_id")})
    apps = await db.applications.find({"id": {"$in": app_ids}}, NO_ID).to_list(len(app_ids) or 1)
    apps_by_id = {a["id"]: a for a in apps}
    prop_ids = list({a["property_id"] for a in apps if a.get("property_id")})
    props = await db.properties.find({"id": {"$in": prop_ids}}, NO_ID).to_list(len(prop_ids) or 1)
    props_by_id = {p["id"]: p for p in props}

    out = []
    for d in docs:
        app = apps_by_id.get(d.get("application_id"))
        if not app:
            continue
        status = app.get("status", "neu")
        rec = redact_doc_for_landlord(d, status)
        fd = app.get("form_data") or {}
        rec["applicant_name"] = " ".join(filter(None, [fd.get("vorname"), fd.get("nachname")])) or app.get("applicant_email")
        rec["applicant_email"] = app.get("applicant_email")
        rec["application_status"] = status
        prop = props_by_id.get(app.get("property_id"))
        rec["property_title"] = prop.get("title") if prop else None
        out.append(rec)
    return out


@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, authorization: Optional[str] = Header(None)):
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    user = await resolve_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    rec = await db.documents.find_one({"id": doc_id, "is_deleted": False}, NO_ID)
    if not rec:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    is_owner = rec.get("applicant_user_id") == user["id"]
    is_landlord = rec.get("org_id") and rec["org_id"] == user.get("org_id")
    is_admin = user.get("role") == "admin"
    if not (is_owner or is_landlord or is_admin):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    # Staged release: a landlord must not be able to bypass the list view by calling
    # the download URL directly.
    if is_landlord and not is_owner and not is_admin:
        app = await db.applications.find_one({"id": rec.get("application_id")}) if rec.get("application_id") else None
        status = app.get("status", "neu") if app else "neu"
        if not doc_released_to_landlord(rec.get("doc_type", "Sonstiges"), status):
            raise HTTPException(
                status_code=403,
                detail=f"Dieses Dokument ist noch nicht freigegeben. {doc_release_hint(rec.get('doc_type', ''))}.",
            )
    if rec.get("org_id") and is_landlord:
        await log_activity(rec["org_id"], user["id"], "document_view", "document", doc_id)
    data, content_type = await run_in_threadpool(get_object, rec["storage_path"])
    media_type, disposition = safe_inline_response(
        rec.get("content_type") or content_type, rec.get("original_filename", "datei"))
    return Response(content=data, media_type=media_type,
                    headers={"Content-Disposition": disposition})


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    rec = await db.documents.find_one({"id": doc_id})
    if not rec or rec.get("applicant_user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    await run_in_threadpool(delete_object, rec["storage_path"])
    await db.documents.update_one({"id": doc_id}, {"$set": {"is_deleted": True, "storage_path": None}})
    return {"ok": True}


@router.post("/documents/{doc_id}/attach")
async def attach_document(doc_id: str, application_id: str = Form(...),
                          user: dict = Depends(get_current_user)):
    rec = await db.documents.find_one({"id": doc_id})
    if not rec or rec.get("applicant_user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    app = await db.applications.find_one({"id": application_id})
    if not app or app.get("applicant_user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    await db.documents.update_one({"id": doc_id}, {"$set": {
        "application_id": application_id, "org_id": app["org_id"], "property_id": app["property_id"],
    }})
    prop = await db.properties.find_one({"id": app["property_id"]}, NO_ID)
    if prop:
        await notify(prop.get("created_by"), "new_document", "Neues Dokument",
                     f"Ein Bewerber hat ein Dokument verknüpft ({rec.get('doc_type', 'Sonstiges')}).",
                     f"/bewerbungen?view=kanban&open={application_id}")
    return {"ok": True}


class DocRequestPayload(BaseModel):
    application_id: str
    doc_types: List[str] = []
    message: str = ""


@router.post("/documents/request")
async def request_documents(payload: DocRequestPayload, user: dict = Depends(get_current_user)):
    """Ask the applicant for specific documents.

    The previous version sent a bodyless "please upload something" nudge, which left the
    applicant guessing and gave neither side a way to see what was still missing.
    """
    app = await db.applications.find_one({"id": payload.application_id})
    if not app or app["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")

    wanted = [d for d in payload.doc_types if d in DOCUMENT_TYPES]
    if not wanted:
        raise HTTPException(status_code=400, detail="Bitte wählen Sie mindestens ein Dokument aus")
    # Same gate as viewing them: a landlord may not demand bonity or ID documents before the
    # application has reached the stage where the Orientierungshilfe allows it.
    status = app.get("status", "neu")
    allowed = [d for d in wanted if doc_released_to_landlord(d, status)]
    blocked = [d for d in wanted if d not in allowed]
    if not allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Diese Dokumente dürfen Sie in diesem Status noch nicht anfordern. "
                   f"{doc_release_hint(blocked[0])}.")

    # $addToSet/$each unions atomically at the DB level — a plain read-modify-write here
    # would let two concurrent requests (double-click, two org members) silently drop
    # whichever one's write lands second.
    await db.applications.update_one(
        {"id": payload.application_id},
        {"$addToSet": {"requested_documents": {"$each": allowed}},
         "$set": {"documents_requested_at": now_iso()}})

    listed = "".join(f"<li>{d}</li>" for d in allowed)
    intro = payload.message.strip() or "Der Vermieter bittet Sie, folgende Dokumente hochzuladen:"
    await notify(app["applicant_user_id"], "document_request", "Dokumente angefordert",
                 f"{intro} {', '.join(allowed)}", "/bewerber/dokumente")
    if app.get("applicant_email"):
        await send_email(app["applicant_email"], "Dokumente angefordert", "Dokumente angefordert",
                         f"<p>{intro}</p><ul>{listed}</ul>"
                         f"<p>Sie finden die Liste in Ihrem MietGate-Konto unter „Meine Dokumente“.</p>")
    await log_activity(app["org_id"], user["id"], "document_request", "application",
                       payload.application_id, {"doc_types": allowed})
    return {"ok": True, "requested_documents": merged, "blocked": blocked}


@router.post("/uploads/image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Datei zu groß (max. 15 MB)")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    path = f"{APP_NAME}/images/{user['id']}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or guess_mime(file.filename)
    result = put_object(path, data, content_type)
    doc_id = new_id()
    await db.documents.insert_one({
        "id": doc_id, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": content_type, "size": result.get("size", len(data)),
        "doc_type": "image", "applicant_user_id": user["id"], "org_id": user.get("org_id"),
        "is_deleted": False, "created_at": now_iso(),
    })
    return {"id": doc_id, "url": f"/api/documents/{doc_id}/download"}
