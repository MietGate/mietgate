from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import db, NO_ID
from security import require_roles
from helpers import new_id, now_iso

router = APIRouter(prefix="/api/admin", tags=["admin"])
admin = require_roles("admin")


@router.get("/stats")
async def admin_stats(user: dict = Depends(admin)):
    total_users = await db.users.count_documents({})
    landlords = await db.users.count_documents({"role": "landlord"})
    applicants = await db.users.count_documents({"role": "applicant"})
    active_props = await db.properties.count_documents({"status": "active"})
    total_apps = await db.applications.count_documents({})
    active_subs = await db.subscriptions.count_documents({"status": "active"})
    cancelled = await db.subscriptions.count_documents({"cancel_at_period_end": True})
    open_tickets = await db.support_tickets.count_documents({"status": "open"})
    paid = await db.payment_transactions.find({"payment_status": "paid"}, NO_ID).to_list(10000)
    mrr = 0.0
    for p in paid:
        amt = p.get("amount", 0)
        mrr += amt / 12 if p.get("interval") == "yearly" else amt
    return {
        "total_users": total_users, "landlords": landlords, "applicants": applicants,
        "active_properties": active_props, "total_applications": total_apps,
        "active_subscriptions": active_subs, "cancelled_subscriptions": cancelled,
        "open_tickets": open_tickets, "monthly_revenue": round(mrr, 2),
    }


@router.get("/users")
async def admin_users(q: Optional[str] = None, user: dict = Depends(admin)):
    query = {}
    if q:
        query = {"$or": [{"email": {"$regex": q, "$options": "i"}},
                         {"name": {"$regex": q, "$options": "i"}}]}
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    for u in users:
        if u.get("org_id"):
            org = await db.organizations.find_one({"id": u["org_id"]}, NO_ID)
            u["org_name"] = (org or {}).get("name")
            sub = await db.subscriptions.find_one({"org_id": u["org_id"]}, NO_ID)
            u["plan"] = (sub or {}).get("plan_key")
    return users


@router.post("/users/{uid}/block")
async def block_user(uid: str, user: dict = Depends(admin)):
    await db.users.update_one({"id": uid}, {"$set": {"is_blocked": True}})
    return {"ok": True}


@router.post("/users/{uid}/unblock")
async def unblock_user(uid: str, user: dict = Depends(admin)):
    await db.users.update_one({"id": uid}, {"$set": {"is_blocked": False}})
    return {"ok": True}


@router.get("/organizations")
async def admin_orgs(user: dict = Depends(admin)):
    orgs = await db.organizations.find({}, NO_ID).sort("created_at", -1).to_list(500)
    for o in orgs:
        o["member_count"] = await db.org_members.count_documents({"org_id": o["id"]})
        o["property_count"] = await db.properties.count_documents({"org_id": o["id"]})
        sub = await db.subscriptions.find_one({"org_id": o["id"]}, NO_ID)
        o["plan"] = (sub or {}).get("plan_key")
    return orgs


# ---------- Plans ----------
class PlanPayload(BaseModel):
    key: str
    name: str
    price_monthly: float
    price_yearly: float
    max_properties: int
    features: List[str] = []
    is_active: bool = True
    sort_order: int = 99
    monthly_lookup: Optional[str] = None
    yearly_lookup: Optional[str] = None


@router.get("/plans")
async def admin_plans(user: dict = Depends(admin)):
    return await db.plans.find({}, NO_ID).sort("sort_order", 1).to_list(50)


@router.put("/plans/{key}")
async def update_plan(key: str, body: PlanPayload, user: dict = Depends(admin)):
    upd = body.model_dump()
    await db.plans.update_one({"key": key}, {"$set": upd}, upsert=True)
    return await db.plans.find_one({"key": key}, NO_ID)


# ---------- Promotions ----------
class PromoPayload(BaseModel):
    name: str
    plan_key: str = "all"
    start: str
    end: str
    discount_percent: Optional[float] = None
    fixed_price: Optional[float] = None
    active: bool = True
    show_on_landing: bool = True


@router.get("/promotions")
async def admin_promotions(user: dict = Depends(admin)):
    return await db.promotions.find({}, NO_ID).sort("start", -1).to_list(100)


@router.post("/promotions")
async def create_promotion(body: PromoPayload, user: dict = Depends(admin)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.promotions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/promotions/{pid}")
async def delete_promotion(pid: str, user: dict = Depends(admin)):
    await db.promotions.delete_one({"id": pid})
    return {"ok": True}


@router.get("/payments")
async def admin_payments(user: dict = Depends(admin)):
    return await db.payment_transactions.find({}, NO_ID).sort("created_at", -1).to_list(500)


@router.get("/support-tickets")
async def admin_tickets(user: dict = Depends(admin)):
    return await db.support_tickets.find({}, NO_ID).sort("created_at", -1).to_list(500)


@router.patch("/support-tickets/{tid}")
async def update_ticket(tid: str, status: str, user: dict = Depends(admin)):
    await db.support_tickets.update_one({"id": tid}, {"$set": {"status": status}})
    return {"ok": True}


@router.get("/activities")
async def admin_activities(user: dict = Depends(admin)):
    return await db.activities.find({}, NO_ID).sort("created_at", -1).to_list(200)
