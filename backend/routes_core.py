from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from database import db, NO_ID
from security import get_current_user, hash_password, verify_password
from helpers import new_id, now_iso, active_property_count, get_plan_limit, plan_supports_team

router = APIRouter(prefix="/api", tags=["core"])


# ---------- Public ----------
@router.get("/plans")
async def get_plans():
    plans = await db.plans.find({"is_active": True}, NO_ID).sort("sort_order", 1).to_list(50)
    now = datetime.now(timezone.utc).isoformat()
    promos = await db.promotions.find(
        {"active": True, "start": {"$lte": now}, "end": {"$gte": now}}, NO_ID).to_list(50)
    promo_by_plan = {p.get("plan_key"): p for p in promos}
    for pl in plans:
        promo = promo_by_plan.get(pl["key"]) or promo_by_plan.get("all")
        if promo:
            pl["promo"] = {
                "name": promo["name"],
                "discount_percent": promo.get("discount_percent"),
                "fixed_price": promo.get("fixed_price"),
            }
    return plans


@router.get("/promotions/active")
async def active_promotions():
    now = datetime.now(timezone.utc).isoformat()
    return await db.promotions.find(
        {"active": True, "start": {"$lte": now}, "end": {"$gte": now}, "show_on_landing": True}, NO_ID).to_list(50)


@router.get("/partners")
async def get_partners():
    doc = await db.settings.find_one({"key": "partners"}, NO_ID)
    return doc or {"schufa_url": None, "offers": []}


class ContactPayload(BaseModel):
    name: str
    email: str
    message: str


@router.post("/contact")
async def contact(payload: ContactPayload):
    await db.support_tickets.insert_one({
        "id": new_id(), "name": payload.name, "email": payload.email,
        "message": payload.message, "status": "open", "created_at": now_iso(),
    })
    return {"ok": True}


# ---------- Profile ----------
class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    picture: Optional[str] = None
    notification_settings: Optional[Dict[str, bool]] = None


@router.put("/me/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "first_name" in upd or "last_name" in upd:
        fn = upd.get("first_name", user.get("first_name", ""))
        ln = upd.get("last_name", user.get("last_name", ""))
        upd["name"] = f"{fn} {ln}".strip()
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    u = await db.users.find_one({"id": user["id"]}, NO_ID)
    u.pop("password_hash", None)
    return u


class PasswordChange(BaseModel):
    current_password: Optional[str] = None
    new_password: str


@router.post("/me/password")
async def change_password(body: PasswordChange, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if full.get("password_hash") and body.current_password is not None:
        if not verify_password(body.current_password, full["password_hash"]):
            raise HTTPException(status_code=400, detail="Aktuelles Passwort falsch")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password), "is_active": True}})
    return {"ok": True}


# ---------- Organization ----------
class OrgUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    invoice_data: Optional[Dict[str, Any]] = None
    white_label: Optional[Dict[str, Any]] = None


@router.get("/organization")
async def get_organization(user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        raise HTTPException(status_code=404, detail="Keine Organisation")
    return await db.organizations.find_one({"id": user["org_id"]}, NO_ID)


@router.put("/organization")
async def update_organization(body: OrgUpdate, user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        raise HTTPException(status_code=404, detail="Keine Organisation")
    member = await db.org_members.find_one({"org_id": user["org_id"], "user_id": user["id"]})
    if member and member["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd.get("white_label") and upd["white_label"].get("enabled"):
        org = await db.organizations.find_one({"id": user["org_id"]}, NO_ID)
        if not (org or {}).get("white_label_addon"):
            raise HTTPException(status_code=402, detail="White-Label ist ein kostenpflichtiges Add-on. Bitte zuerst buchen.")
    if upd:
        await db.organizations.update_one({"id": user["org_id"]}, {"$set": upd})
    return await db.organizations.find_one({"id": user["org_id"]}, NO_ID)


@router.get("/organization/members")
async def list_members(user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        raise HTTPException(status_code=404, detail="Keine Organisation")
    members = await db.org_members.find({"org_id": user["org_id"]}, NO_ID).to_list(100)
    for m in members:
        u = await db.users.find_one({"id": m["user_id"]}, NO_ID)
        m["email"] = (u or {}).get("email")
        m["name"] = (u or {}).get("name")
    return members


class InviteMember(BaseModel):
    email: str
    role: str = "employee"  # admin | employee | assistant


@router.post("/organization/members")
async def invite_member(body: InviteMember, user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        raise HTTPException(status_code=404, detail="Keine Organisation")
    member = await db.org_members.find_one({"org_id": user["org_id"], "user_id": user["id"]})
    if member and member["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    if not await plan_supports_team(user["org_id"]):
        raise HTTPException(status_code=402, detail="Team-Funktion nur im Makler-/Hausverwaltungs-Paket verfügbar. Bitte upgraden.")
    invitee = await db.users.find_one({"email": body.email.lower().strip()})
    if not invitee:
        raise HTTPException(status_code=404, detail="Kein Nutzer mit dieser E-Mail. Bitte zuerst registrieren lassen.")
    if await db.org_members.find_one({"org_id": user["org_id"], "user_id": invitee["id"]}):
        raise HTTPException(status_code=400, detail="Nutzer ist bereits Mitglied")
    await db.org_members.insert_one({
        "id": new_id(), "org_id": user["org_id"], "user_id": invitee["id"],
        "role": body.role, "created_at": now_iso(),
    })
    await db.users.update_one({"id": invitee["id"]}, {"$set": {"org_id": user["org_id"], "role": "landlord"}})
    return {"ok": True}


@router.delete("/organization/members/{member_id}")
async def remove_member(member_id: str, user: dict = Depends(get_current_user)):
    member = await db.org_members.find_one({"org_id": user["org_id"], "user_id": user["id"]})
    if member and member["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    target = await db.org_members.find_one({"id": member_id})
    if target and target["role"] == "owner":
        raise HTTPException(status_code=400, detail="Owner kann nicht entfernt werden")
    await db.org_members.delete_one({"id": member_id})
    return {"ok": True}


# ---------- Subscription & Dashboard ----------
@router.get("/subscription")
async def get_subscription(user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        return {"subscription": None, "plan": None, "usage": None}
    sub = await db.subscriptions.find_one({"org_id": user["org_id"]}, NO_ID)
    plan = None
    if sub:
        plan = await db.plans.find_one({"key": sub["plan_key"]}, NO_ID)
    limit = await get_plan_limit(user["org_id"])
    used = await active_property_count(user["org_id"])
    org = await db.organizations.find_one({"id": user["org_id"]}, NO_ID)
    return {"subscription": sub, "plan": plan, "usage": {"used": used, "limit": limit},
            "supports_team": bool(plan and plan.get("supports_team")),
            "white_label_addon": bool((org or {}).get("white_label_addon"))}


@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="Keine Organisation")
    active_props = await db.properties.count_documents({"org_id": org_id, "status": "active"})
    total_props = await db.properties.count_documents({"org_id": org_id})
    new_apps = await db.applications.count_documents({"org_id": org_id, "status": "neu"})
    total_apps = await db.applications.count_documents({"org_id": org_id})
    open_docs = await db.documents.count_documents({"org_id": org_id, "is_deleted": False})
    now = datetime.now(timezone.utc).isoformat()
    upcoming = await db.viewings.count_documents({"org_id": org_id, "datetime": {"$gte": now}})
    unread_msgs = await db.messages.count_documents({"org_id": org_id, "recipient_id": user["id"], "read": False})
    recent_apps = await db.applications.find({"org_id": org_id}, NO_ID).sort("created_at", -1).to_list(5)
    for a in recent_apps:
        prop = await db.properties.find_one({"id": a["property_id"]}, NO_ID)
        a["property_title"] = (prop or {}).get("title")
    sub = await db.subscriptions.find_one({"org_id": org_id}, NO_ID)
    return {
        "active_properties": active_props, "total_properties": total_props,
        "new_applications": new_apps, "total_applications": total_apps,
        "open_documents": open_docs, "upcoming_viewings": upcoming,
        "unread_messages": unread_msgs, "recent_applications": recent_apps,
        "subscription_status": (sub or {}).get("status", "inactive"),
        "plan_key": (sub or {}).get("plan_key"),
    }
