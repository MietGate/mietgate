import uuid
from fastapi import (APIRouter, HTTPException, Depends, UploadFile, File, Form,
                     Header, Response)
from starlette.concurrency import run_in_threadpool
from typing import Optional
from database import db, NO_ID
from security import get_current_user, resolve_user_by_token
from storage import put_object, get_object, delete_object, guess_mime, APP_NAME
from helpers import new_id, now_iso, log_activity, notify
from constants import DOCUMENT_TYPES


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
    return await _store_document(file, doc_type, app["applicant_user_id"],
                                 application_id, app["org_id"], app["property_id"])


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
                     f"Ein Bewerber hat ein Dokument hochgeladen ({doc_type}).", f"/objekte/{property_id}")
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
    else:
        q = {"applicant_user_id": user["id"], "is_deleted": False}
    return await db.documents.find(q, NO_ID).sort("created_at", -1).to_list(200)


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
    if rec.get("org_id") and is_landlord:
        await log_activity(rec["org_id"], user["id"], "document_view", "document", doc_id)
    data, content_type = await run_in_threadpool(get_object, rec["storage_path"])
    return Response(content=data, media_type=rec.get("content_type", content_type),
                    headers={"Content-Disposition": f'inline; filename="{rec.get("original_filename","file")}"'})


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
                     f"Ein Bewerber hat ein Dokument verknüpft ({rec.get('doc_type', 'Sonstiges')}).", f"/objekte/{app['property_id']}")
    return {"ok": True}


class DocRequest:
    pass


@router.post("/documents/request")
async def request_documents(application_id: str = Form(...), message: str = Form(""),
                            user: dict = Depends(get_current_user)):
    app = await db.applications.find_one({"id": application_id})
    if not app or app["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    await notify(app["applicant_user_id"], "document_request", "Dokumente angefordert",
                 message or "Der Vermieter bittet Sie, Dokumente hochzuladen.", "/bewerber/dokumente")
    await log_activity(app["org_id"], user["id"], "document_request", "application", application_id)
    return {"ok": True}


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
