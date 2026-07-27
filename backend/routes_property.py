import random
import re
import string
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso, log_activity, get_plan_limit, active_property_count, plan_supports_team
from storage import put_object, get_object, get_object_ranged, delete_object, guess_mime, APP_NAME
from constants import FORM_FIELDS, DEFAULT_FORM_CONFIG, DOCUMENT_TYPES, DOC_RELEASE_STAGE
import stripe_service

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
    # Default is "after" on purpose: the data-protection authorities' Orientierungshilfe
    # Wohnungswirtschaft only allows bonity/income documents once the applicant is in the
    # shortlist (i.e. after the viewing). "before" stays selectable for landlords who only
    # collect uncritical documents, but it must not be what MietGate suggests by default.
    document_timing: str = "after"  # before | after | none
    # Document types the applicant must supply. Anything not listed here may be deferred
    # ("später hochladen"). Bonity types are stripped when document_timing is "before" —
    # demanding them ahead of the viewing is what the Orientierungshilfe forbids.
    required_documents: List[str] = []
    form_config: Optional[Dict[str, str]] = None
    status: str = "active"

    @field_validator("required_documents")
    @classmethod
    def _known_doc_types(cls, v):
        return [d for d in (v or []) if d in DOCUMENT_TYPES]

    @field_validator("area", "rooms", "cold_rent", "extra_costs", "warm_rent", "deposit")
    @classmethod
    def _non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("Wert darf nicht negativ sein")
        return v

    @field_validator("bathrooms")
    @classmethod
    def _non_negative_int(cls, v):
        if v is not None and v < 0:
            raise ValueError("Wert darf nicht negativ sein")
        return v


def _sanitize_required_documents(doc: dict) -> dict:
    """A landlord must not be able to make bonity documents mandatory before the viewing.

    Requiring them at that point is exactly what the Orientierungshilfe Wohnungswirtschaft
    forbids, so we drop them from the requirement list instead of trusting the client.
    """
    if doc.get("document_timing") == "before":
        doc["required_documents"] = [d for d in doc.get("required_documents", [])
                                     if d not in DOC_RELEASE_STAGE]
    elif doc.get("document_timing") == "none":
        doc["required_documents"] = []
    return doc


async def _require_org(user):
    if not user.get("org_id"):
        raise HTTPException(status_code=403, detail="Kein Vermieterkonto / keine Organisation")
    return user["org_id"]


async def _require_manage_role(org_id, user, roles=("owner", "admin", "employee")):
    """Assistants have read-only access; only owner/admin/employee may modify property data,
    trigger payments, or delete media."""
    member = await db.org_members.find_one({"org_id": org_id, "user_id": user["id"]})
    if not member or member["role"] not in roles:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")


@router.get("/form-fields")
async def get_form_fields():
    return {"fields": FORM_FIELDS, "default_config": DEFAULT_FORM_CONFIG, "document_types": DOCUMENT_TYPES}


@router.get("/search")
async def search(q: str = "", user: dict = Depends(get_current_user)):
    q = q.strip()
    if len(q) < 2:
        return {"groups": []}
    rx = {"$regex": re.escape(q), "$options": "i"}
    groups = []

    if user.get("role") == "applicant":
        apps = await db.applications.find({"applicant_user_id": user["id"]}, NO_ID).to_list(200)
        prop_ids = [a["property_id"] for a in apps]
        props = await db.properties.find({"id": {"$in": prop_ids}, "title": rx}, NO_ID).limit(5).to_list(5)
        if props:
            groups.append({"key": "applications", "label": "Meine Bewerbungen",
                            "items": [{"id": p["id"], "label": p["title"], "link": f"/bewerber"} for p in props]})
        return {"groups": groups}

    org_id = user.get("org_id")
    if not org_id:
        return {"groups": []}
    props = await db.properties.find({"org_id": org_id, "title": rx}, NO_ID).limit(5).to_list(5)
    apps = await db.applications.find(
        {"org_id": org_id, "$or": [
            {"form_data.vorname": rx}, {"form_data.nachname": rx}, {"applicant_email": rx},
        ]}, NO_ID).limit(5).to_list(5)
    if props:
        groups.append({"key": "properties", "label": "Objekte",
                        "items": [{"id": p["id"], "label": p["title"], "link": f"/objekte/{p['id']}"} for p in props]})
    if apps:
        groups.append({"key": "applications", "label": "Bewerber", "items": [{
            "id": a["id"], "link": f"/objekte/{a['property_id']}",
            "label": (f"{a.get('form_data', {}).get('vorname', '')} {a.get('form_data', {}).get('nachname', '')}".strip()
                      or a.get("applicant_email")),
        } for a in apps]})
    return {"groups": groups}


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
    pid = new_id()
    code = gen_code()
    while await db.properties.find_one({"application_code": code}):
        code = gen_code()
    doc = _sanitize_required_documents(payload.model_dump())
    doc.update({
        "id": pid, "org_id": org_id, "created_by": user["id"],
        "application_code": code, "link_active": False,
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
    await _require_manage_role(prop["org_id"], user)
    upd = _sanitize_required_documents(payload.model_dump(exclude_none=False))
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
    await _require_manage_role(prop["org_id"], user, roles=("owner", "admin"))

    for img in prop.get("images", []):
        if img.get("storage_path"):
            try:
                await run_in_threadpool(delete_object, img["storage_path"])
            except Exception:
                pass

    docs = await db.documents.find({"property_id": pid}, NO_ID).to_list(1000)
    for d in docs:
        if d.get("storage_path"):
            try:
                await run_in_threadpool(delete_object, d["storage_path"])
            except Exception:
                pass
    await db.documents.delete_many({"property_id": pid})
    await db.messages.delete_many({"property_id": pid})
    await db.viewings.delete_many({"property_id": pid})
    await db.applications.delete_many({"property_id": pid})

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
    await db.properties.update_one({"id": pid}, {"$set": {"application_code": code}})
    return {"application_code": code, "link_active": prop.get("link_active", False)}


@router.post("/properties/{pid}/link/toggle")
async def toggle_link(pid: str, user: dict = Depends(get_current_user)):
    """Deactivating a live link is always free. Activating one is payment-gated —
    that only happens through /link/activate, never here."""
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    await _require_manage_role(prop["org_id"], user)
    if not prop.get("link_active"):
        raise HTTPException(status_code=400,
                            detail="Link ist bereits deaktiviert. Nutzen Sie 'Aktivieren', um ihn freizuschalten.")
    await db.properties.update_one({"id": pid}, {"$set": {"link_active": False}})
    return {"link_active": False}


class ActivateLinkRequest(BaseModel):
    plan_key: Optional[str] = None
    interval: str = "monthly"
    origin_url: Optional[str] = None
    withdrawal_consent: bool = False


@router.post("/properties/{pid}/link/activate")
async def activate_link(pid: str, body: ActivateLinkRequest, request: Request, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    await _require_manage_role(prop["org_id"], user, roles=("owner", "admin"))
    if prop.get("link_active"):
        prop.pop("_id", None)
        return {"activated": True, "property": prop}

    org_id = prop["org_id"]
    sub = await db.subscriptions.find_one({"org_id": org_id}, NO_ID)
    has_paid_access = bool(sub and sub.get("status") in ("active", "trialing"))

    if has_paid_access:
        limit = await get_plan_limit(org_id)
        current = await active_property_count(org_id)
        if current >= limit:
            raise HTTPException(status_code=402, detail=f"Objekt-Limit erreicht ({limit}). Bitte Paket upgraden.")
        await db.properties.update_one(
            {"id": pid}, {"$set": {"link_active": True, "link_deactivated_by_payment": False}})
        await log_activity(org_id, user["id"], "link_activate", "property", pid)
        return {"activated": True, "property": await db.properties.find_one({"id": pid}, NO_ID)}

    # No active/trialing subscription yet: first activation always starts a 3-day trial checkout.
    if not body.plan_key or not body.origin_url:
        return {"needs_payment": True}
    if not body.withdrawal_consent:
        raise HTTPException(status_code=400,
            detail="Bitte bestätigen Sie, dass die Leistung sofort beginnt und Sie Ihr Widerrufsrecht damit verlieren.")
    plan = await db.plans.find_one({"key": body.plan_key}, NO_ID)
    if not plan:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    is_one_time = plan.get("billing_mode") == "one_time"
    lookup_key = plan.get("one_time_lookup") if is_one_time else (
        plan["yearly_lookup"] if body.interval == "yearly" else plan["monthly_lookup"])

    # Guard against double-click / repeated requests creating multiple parallel checkout
    # sessions: atomically claim a short-lived lock on the property before calling Stripe.
    now = datetime.now(timezone.utc)
    locked = await db.properties.find_one_and_update(
        {"id": pid, "$or": [{"checkout_lock_until": None}, {"checkout_lock_until": {"$exists": False}},
                            {"checkout_lock_until": {"$lt": now.isoformat()}}]},
        {"$set": {"checkout_lock_until": (now + timedelta(seconds=15)).isoformat()}},
    )
    if not locked:
        raise HTTPException(status_code=429, detail="Checkout wird bereits verarbeitet. Bitte einen Moment warten.")
    purpose = "link_activation_onetime" if is_one_time else "link_activation"
    try:
        session, price = stripe_service.create_checkout_session(
            lookup_key, body.origin_url, user["id"], org_id,
            purpose=purpose, trial_days=None if is_one_time else 3, property_id=pid,
            one_time=is_one_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout fehlgeschlagen: {e}")
    await db.payment_transactions.insert_one({
        "id": new_id(), "session_id": session.id, "user_id": user["id"],
        "org_id": org_id, "plan_key": body.plan_key, "interval": "one_time" if is_one_time else body.interval,
        "lookup_key": lookup_key, "amount": (price.unit_amount or 0) / 100,
        "currency": price.currency, "status": "initiated", "payment_status": "pending",
        "purpose": purpose, "property_id": pid,
        "one_time_duration_days": plan.get("one_time_duration_days") if is_one_time else None,
        "created_at": now_iso(), "updated_at": now_iso(),
        **stripe_service.tax_facts(session),
        "withdrawal_consent_at": now_iso(),
        "withdrawal_consent_ip": request.client.host if request.client else None,
    })
    return {"checkout_url": session.url, "session_id": session.id}


# ---------- Object images ----------
async def _owned_property(pid, user):
    prop = await db.properties.find_one({"id": pid})
    if not prop or prop["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Objekt nicht gefunden")
    return prop


@router.post("/properties/{pid}/images")
async def add_property_image(pid: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    prop = await _owned_property(pid, user)
    await _require_manage_role(prop["org_id"], user)
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
    await _require_manage_role(prop["org_id"], user)
    removed = next((i for i in prop.get("images", []) if i["id"] == img_id), None)
    images = [i for i in prop.get("images", []) if i["id"] != img_id]
    if removed and removed.get("storage_path"):
        try:
            await run_in_threadpool(delete_object, removed["storage_path"])
        except Exception:
            pass
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
