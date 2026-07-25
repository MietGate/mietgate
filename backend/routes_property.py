import random
import string
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, log_activity, get_plan_limit, active_property_count, plan_supports_team
from storage import put_object, get_object, get_object_ranged, guess_mime, APP_NAME
from constants import FORM_FIELDS, DEFAULT_FORM_CONFIG, DOCUMENT_TYPES

router = APIRouter(prefix="/api", tags=["properties"])


def gen_code(n=6):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


class PropertyPayload(BaseModel):
    title: str
    internal_name: Optional[str] = None
    street: Optional[str] = None
    house_number: Optional[str] = None
    zip: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    area: Optional[float] = None
    rooms: Optional[float] = None
    bathrooms: Optional[int] = None
    floor: Optional[str] = None
    balcony: bool = False
    cellar: bool = False
    parking: bool = False
    features: List[str] = []
    cold_rent: Optional[float] = None
    extra_costs: Optional[float] = None
    warm_rent: Optional[float] = None
    deposit: Optional[float] = None
    earliest_move_in: Optional[str] = None
    description: Optional[str] = None
    internal_notes: Optional[str] = None
    external_listing_url: Optional[str] = None
    document_timing: str = "before"  # before | after | none
    form_config: Optional[Dict[str, str]] = None
    status: str = "active"


async def _require_org(user):
    if not user.get("org_id"):
        raise HTTPException(status_code=403, detail="Kein Vermieterkonto / keine Organisation")
    return user["org_id"]


@router.get("/form-fields")
async def get_form_fields():
    return {"fields": FORM_FIELDS, "default_config": DEFAULT_FORM_CONFIG, "document_types": DOCUMENT_TYPES}


@router.get("/me/entitlements")
async def my_entitlements(user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        return {"supports_team": False, "limit": 0}
    return {
        "supports_team": await plan_supports_team(user["org_id"]),
        "limit": await get_plan_limit(user["org_id"]),
    }


@router.get("/properties")
async def list_properties(user: dict = Depends(get_current_user)):
    org_id = await _require_org(user)
    props = await db.properties.find({"org_id": org_id}, NO_ID).sort("created_at", -1).to_list(500)
    for p in props:
        p["application_count"] = await db.applications.count_documents({"property_id": p["id"]})
    return props


@router.post("/properties")
async def create_property(payload: PropertyPayload, user: dict = Depends(get_current_user)):
    org_id = await _require_org(user)
    if payload.status == "active":
        limit = await get_plan_limit(org_id)
        current = await active_property_count(org_id)
        if current >= limit:
            raise HTTPException(status_code=402,
                                detail=f"Objekt-Limit erreicht ({limit}). Bitte Paket upgraden.")
    pid = new_id()
    code = gen_code()
    while await db.properties.find_one({"application_code": code}):
        code = gen_code()
    doc = payload.model_dump()
    doc.update({
        "id": pid, "org_id": org_id, "created_by": user["id"],
        "application_code": code, "link_active": True,
        "form_config": payload.form_config or DEFAULT_FORM_CONFIG,
        "created_at": now_iso(),
    })
    await db.properties.insert_one(doc)
    await log_activity(org_id, user["id"], "create", "property", pid, {"title": payload.title})
    doc.pop("_id", None)
    return doc


@router.get("/properties/{pid}")
async def get_property(pid: str, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": pid}, NO_ID)
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    prop["application_count"] = await db.applications.count_documents({"property_id": pid})
    return prop


@router.put("/properties/{pid}")
async def update_property(pid: str, payload: PropertyPayload, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    upd = payload.model_dump(exclude_none=False)
    if payload.form_config is None:
        upd.pop("form_config", None)
    # Re-check plan limit if activating a previously inactive property
    if payload.status == "active" and prop.get("status") != "active":
        limit = await get_plan_limit(prop["org_id"])
        current = await active_property_count(prop["org_id"])
        if current >= limit:
            raise HTTPException(status_code=402, detail=f"Objekt-Limit erreicht ({limit}). Bitte Paket upgraden.")
    await db.properties.update_one({"id": pid}, {"$set": upd})
    await log_activity(prop["org_id"], user["id"], "update", "property", pid)
    return await db.properties.find_one({"id": pid}, NO_ID)


@router.delete("/properties/{pid}")
async def delete_property(pid: str, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    member = await db.org_members.find_one({"org_id": user["org_id"], "user_id": user["id"]})
    if member and member["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    await db.properties.delete_one({"id": pid})
    await log_activity(prop["org_id"], user["id"], "delete", "property", pid)
    return {"ok": True}


@router.post("/properties/{pid}/link/regenerate")
async def regenerate_link(pid: str, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    code = gen_code()
    while await db.properties.find_one({"application_code": code}):
        code = gen_code()
    await db.properties.update_one({"id": pid}, {"$set": {"application_code": code, "link_active": True}})
    return {"application_code": code, "link_active": True}


@router.post("/properties/{pid}/link/toggle")
async def toggle_link(pid: str, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    new_state = not prop.get("link_active", True)
    await db.properties.update_one({"id": pid}, {"$set": {"link_active": new_state}})
    return {"link_active": new_state}


# ---------- Object images ----------
async def _owned_property(pid, user):
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    return prop


@router.post("/properties/{pid}/images")
async def add_property_image(pid: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    prop = await _owned_property(pid, user)
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Bild zu groß (max. 10 MB)")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Nur Bilddateien erlaubt (JPG, PNG, WEBP)")
    path = f"{APP_NAME}/property-images/{pid}/{uuid.uuid4()}.{ext}"
    ct = file.content_type or guess_mime(file.filename)
    result = put_object(path, data, ct)
    img = {"id": new_id(), "storage_path": result["path"], "content_type": ct}
    images = prop.get("images", []) + [img]
    upd = {"images": images}
    if not prop.get("title_image_id"):
        upd["title_image_id"] = img["id"]
    await db.properties.update_one({"id": pid}, {"$set": upd})
    return {"images": images, "title_image_id": upd.get("title_image_id", prop.get("title_image_id"))}


@router.delete("/properties/{pid}/images/{img_id}")
async def delete_property_image(pid: str, img_id: str, user: dict = Depends(get_current_user)):
    prop = await _owned_property(pid, user)
    images = [i for i in prop.get("images", []) if i["id"] != img_id]
    upd = {"images": images}
    if prop.get("title_image_id") == img_id:
        upd["title_image_id"] = images[0]["id"] if images else None
    await db.properties.update_one({"id": pid}, {"$set": upd})
    return {"images": images, "title_image_id": upd["title_image_id"]}


@router.post("/properties/{pid}/images/{img_id}/set-title")
async def set_title_image(pid: str, img_id: str, user: dict = Depends(get_current_user)):
    prop = await _owned_property(pid, user)
    if not any(i["id"] == img_id for i in prop.get("images", [])):
        raise HTTPException(status_code=404, detail="Bild nicht gefunden")
    await db.properties.update_one({"id": pid}, {"$set": {"title_image_id": img_id}})
    return {"title_image_id": img_id}


@router.get("/public/properties/{pid}/images/{img_id}")
async def serve_property_image(pid: str, img_id: str):
    prop = await db.properties.find_one({"id": pid}, NO_ID)
    if not prop:
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    img = next((i for i in prop.get("images", []) if i["id"] == img_id), None)
    if not img:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden")
    data, ct = await run_in_threadpool(get_object, img["storage_path"])
    return Response(content=data, media_type=img.get("content_type", ct),
                    headers={"Cache-Control": "public, max-age=86400"})


async def _serve_ranged(request: Request, path: str, default_content_type: str):
    """Serve an R2 object honoring an incoming Range header, so large files (video)
    aren't fully downloaded just for metadata/seek probes. Falls back to a full,
    non-blocking response when no Range header is present."""
    range_header = request.headers.get("range")
    try:
        result = await run_in_threadpool(get_object_ranged, path, range_header)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    headers = {"Cache-Control": "public, max-age=604800", "Accept-Ranges": "bytes"}
    if result["partial"]:
        headers["Content-Range"] = result["content_range"]
        headers["Content-Length"] = str(len(result["data"]))
        return Response(content=result["data"], status_code=206,
                        media_type=result["content_type"] or default_content_type, headers=headers)
    return Response(content=result["data"], media_type=result["content_type"] or default_content_type, headers=headers)


@router.get("/public/marketing/erklaervideo.mp4")
async def serve_explainer_video(request: Request):
    return await _serve_ranged(request, "mietgate/marketing/erklaervideo.mp4", "video/mp4")


@router.get("/public/marketing/erklaervideo-poster.jpg")
async def serve_explainer_video_poster(request: Request):
    return await _serve_ranged(request, "mietgate/marketing/erklaervideo-poster.jpg", "image/jpeg")
