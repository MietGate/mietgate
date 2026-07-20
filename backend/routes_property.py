import random
import string
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, log_activity, get_plan_limit, active_property_count
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
    await db.properties.update_one({"id": pid}, {"$set": upd})
    await log_activity(prop["org_id"], user["id"], "update", "property", pid)
    return await db.properties.find_one({"id": pid}, NO_ID)


@router.delete("/properties/{pid}")
async def delete_property(pid: str, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
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
