import os
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import db, NO_ID
from security import require_roles
from helpers import new_id, now_iso, notify, email_user, log_activity
from email_service import send_email

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
    trialing_subs = await db.subscriptions.count_documents({"status": "trialing"})
    past_due_subs = await db.subscriptions.count_documents({"status": "past_due"})
    cancelled = await db.subscriptions.count_documents({"cancel_at_period_end": True})
    open_tickets = await db.support_tickets.count_documents({"status": "open"})
    # MRR counts active + past_due (still billed, just currently failing) — trialing is excluded
    # since no payment has been captured yet.
    active_sub_docs = await db.subscriptions.find(
        {"status": {"$in": ["active", "past_due"]}}, NO_ID).to_list(10000)
    plans = {p["key"]: p async for p in db.plans.find({}, NO_ID)}
    mrr = 0.0
    for sub in active_sub_docs:
        plan = plans.get(sub.get("plan_key"))
        if not plan:
            continue
        mrr += (plan.get("price_yearly") or 0) / 12 if sub.get("interval") == "yearly" else (plan.get("price_monthly") or 0)
    return {
        "total_users": total_users, "landlords": landlords, "applicants": applicants,
        "active_properties": active_props, "total_applications": total_apps,
        "active_subscriptions": active_subs, "trialing_subscriptions": trialing_subs,
        "past_due_subscriptions": past_due_subs, "cancelled_subscriptions": cancelled,
        "open_tickets": open_tickets, "monthly_revenue": round(mrr, 2),
    }


@router.get("/customer-search")
async def admin_customer_search(q: str = "", user: dict = Depends(admin)):
    """Lightweight lookup used by the manual-ticket dialog to link a ticket to an
    existing user/organization instead of retyping their name and email by hand."""
    q = q.strip()
    if len(q) < 2:
        return {"users": [], "organizations": []}
    rx = {"$regex": re.escape(q), "$options": "i"}
    users = await db.users.find({"$or": [{"email": rx}, {"name": rx}]}, NO_ID).limit(8).to_list(8)
    org_ids = list({u["org_id"] for u in users if u.get("org_id")})
    orgs_by_id = {}
    if org_ids:
        for o in await db.organizations.find({"id": {"$in": org_ids}}, NO_ID).to_list(len(org_ids)):
            orgs_by_id[o["id"]] = o["name"]
    orgs = await db.organizations.find({"name": rx}, NO_ID).limit(5).to_list(5)
    return {
        "users": [{"id": u["id"], "name": u.get("name"), "email": u.get("email"),
                   "org_name": orgs_by_id.get(u.get("org_id"))} for u in users],
        "organizations": [{"id": o["id"], "name": o["name"]} for o in orgs],
    }


@router.get("/search")
async def admin_search(q: str = "", user: dict = Depends(admin)):
    q = q.strip()
    if len(q) < 2:
        return {"groups": []}
    rx = {"$regex": re.escape(q), "$options": "i"}
    groups = []
    users = await db.users.find({"$or": [{"email": rx}, {"name": rx}]}, NO_ID).limit(5).to_list(5)
    if users:
        groups.append({"key": "users", "label": "Nutzer",
                        "items": [{"id": u["id"], "label": u.get("name") or u.get("email"), "link": "/admin/nutzer"} for u in users]})
    orgs = await db.organizations.find({"name": rx}, NO_ID).limit(5).to_list(5)
    if orgs:
        groups.append({"key": "organizations", "label": "Organisationen",
                        "items": [{"id": o["id"], "label": o["name"], "link": "/admin/organisationen"} for o in orgs]})
    leads = await db.leads.find({"$or": [{"name": rx}, {"email": rx}, {"company": rx}]}, NO_ID).limit(5).to_list(5)
    if leads:
        groups.append({"key": "leads", "label": "Leads",
                        "items": [{"id": l["id"], "label": l.get("name") or l.get("company") or l.get("email"), "link": "/admin/leads"} for l in leads]})
    return {"groups": groups}


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
        o["subscription_status"] = (sub or {}).get("status")
    return orgs


class ManualSubscription(BaseModel):
    plan_key: str
    status: str = "active"  # active | cancelled | inactive
    white_label_addon: Optional[bool] = None
    note: Optional[str] = None


@router.post("/organizations/{org_id}/subscription")
async def set_manual_subscription(org_id: str, body: ManualSubscription, user: dict = Depends(admin)):
    org = await db.organizations.find_one({"id": org_id}, NO_ID)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation nicht gefunden")
    if body.plan_key != "none":
        plan = await db.plans.find_one({"key": body.plan_key}, NO_ID)
        if not plan:
            raise HTTPException(status_code=404, detail="Paket nicht gefunden")
        await db.subscriptions.update_one(
            {"org_id": org_id},
            {"$set": {
                "org_id": org_id, "plan_key": body.plan_key, "status": body.status,
                "source": "manual", "manual_note": body.note, "manual_set_by": user["id"],
                "cancel_at_period_end": body.status != "active",
                "updated_at": now_iso(),
            }}, upsert=True,
        )
    else:
        await db.subscriptions.delete_one({"org_id": org_id})
    if body.white_label_addon is not None:
        await db.organizations.update_one({"id": org_id}, {"$set": {"white_label_addon": body.white_label_addon}})
    await log_activity(org_id, user["id"], "manual_subscription_set", "subscription", body.plan_key,
                       {"note": body.note} if body.note else None)
    return await db.subscriptions.find_one({"org_id": org_id}, NO_ID) or {"org_id": org_id, "plan_key": "none"}


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
    supports_team: bool = False
    monthly_lookup: Optional[str] = None
    yearly_lookup: Optional[str] = None
    billing_mode: str = "subscription"  # "subscription" | "one_time"
    one_time_price: Optional[float] = None
    one_time_lookup: Optional[str] = None
    one_time_duration_days: Optional[int] = None


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
    fixed_price_yearly: Optional[float] = None
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


TICKET_STATUSES = ("open", "in_bearbeitung", "erledigt")


class TicketCreate(BaseModel):
    name: str
    email: str
    message: str
    source: str = "telefon"
    linked_user_id: Optional[str] = None
    linked_org_id: Optional[str] = None
    linked_label: Optional[str] = None


@router.post("/support-tickets")
async def create_ticket(body: TicketCreate, user: dict = Depends(admin)):
    ticket = {
        "id": new_id(), "name": body.name, "email": body.email, "message": body.message,
        "source": body.source, "status": "open", "created_at": now_iso(),
        "created_by": user.get("name") or user.get("email"),
        "linked_user_id": body.linked_user_id, "linked_org_id": body.linked_org_id,
        "linked_label": body.linked_label,
    }
    await db.support_tickets.insert_one(ticket)
    ticket.pop("_id", None)
    return ticket


class TicketStatusUpdate(BaseModel):
    status: str


@router.patch("/support-tickets/{tid}")
async def update_ticket(tid: str, body: TicketStatusUpdate, user: dict = Depends(admin)):
    if body.status not in TICKET_STATUSES:
        raise HTTPException(status_code=400, detail="Ungültiger Status")
    await db.support_tickets.update_one({"id": tid}, {"$set": {"status": body.status}})
    return {"ok": True}


class TicketReply(BaseModel):
    message: str


@router.post("/support-tickets/{tid}/reply")
async def reply_ticket(tid: str, body: TicketReply, user: dict = Depends(admin)):
    ticket = await db.support_tickets.find_one({"id": tid})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
    reply = {"id": new_id(), "message": body.message, "sent_by": user.get("name") or user.get("email"),
             "created_at": now_iso()}
    await db.support_tickets.update_one(
        {"id": tid},
        {"$push": {"replies": reply}, "$set": {"status": "in_bearbeitung"}})
    if ticket.get("email"):
        await send_email(ticket["email"], "Antwort auf Ihre Anfrage bei MietGate",
                                        "Antwort vom MietGate-Support",
                                        f"<p>Hallo {ticket.get('name','')},</p>"
                                        f"<p style='white-space:pre-wrap'>{body.message}</p>"
                                        f"<p style='color:#94a3b8;font-size:12px'>Antworten Sie einfach auf diese E-Mail, "
                                        f"falls Sie weitere Fragen haben.</p>")
    return reply


@router.get("/activities")
async def admin_activities(user: dict = Depends(admin)):
    return await db.activities.find({}, NO_ID).sort("created_at", -1).to_list(200)


# ---------- Partner / Affiliate links ----------
class PartnerOffer(BaseModel):
    category: str
    name: str
    url: str
    description: Optional[str] = ""


class PartnersPayload(BaseModel):
    schufa_url: Optional[str] = None
    schufa_text: Optional[str] = None
    offers: List[PartnerOffer] = []


@router.get("/partners")
async def admin_get_partners(user: dict = Depends(admin)):
    doc = await db.settings.find_one({"key": "partners"}, NO_ID)
    return doc or {"key": "partners", "schufa_url": None, "schufa_text": None, "offers": []}


@router.put("/partners")
async def admin_update_partners(body: PartnersPayload, user: dict = Depends(admin)):
    upd = {
        "schufa_url": body.schufa_url,
        "schufa_text": body.schufa_text,
        "offers": [o.model_dump() for o in body.offers],
    }
    await db.settings.update_one({"key": "partners"}, {"$set": upd}, upsert=True)
    doc = await db.settings.find_one({"key": "partners"}, NO_ID)
    return doc


@router.post("/maintenance/run")
async def run_maintenance(user: dict = Depends(admin)):
    import maintenance
    return await maintenance.run_once()


# ---------- CRM / Leads (#14, extended #6) ----------

async def _lead_stage_keys():
    stages = await db.lead_stages.find({}, NO_ID).to_list(100)
    return [s["key"] for s in stages]


class LeadPayload(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    address: Optional[str] = ""
    zip: Optional[str] = ""
    city: Optional[str] = ""
    source: Optional[str] = ""
    status: str = "neu"
    notes: Optional[str] = ""
    deal_value: Optional[float] = 0


class LeadPatch(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    zip: Optional[str] = None
    city: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    deal_value: Optional[float] = None


class LeadImport(BaseModel):
    csv: str


@router.get("/leads")
async def list_leads(user: dict = Depends(admin)):
    return await db.leads.find({}, NO_ID).sort("created_at", -1).to_list(1000)


@router.post("/leads")
async def create_lead(body: LeadPayload, user: dict = Depends(admin)):
    doc = body.model_dump()
    stage_keys = await _lead_stage_keys()
    if doc.get("status") not in stage_keys:
        doc["status"] = stage_keys[0] if stage_keys else "neu"
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/leads/import")
async def import_leads(body: LeadImport, user: dict = Depends(admin)):
    import csv, io
    reader = csv.DictReader(io.StringIO(body.csv.strip()))
    docs = []
    for row in reader:
        low = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        name = low.get("name") or low.get("firma") or low.get("company") or ""
        if not name:
            continue
        docs.append({
            "id": new_id(), "name": name,
            "email": low.get("email") or low.get("e-mail") or "",
            "phone": low.get("phone") or low.get("telefon") or low.get("tel") or "",
            "company": low.get("company") or low.get("firma") or "",
            "address": low.get("address") or low.get("adresse") or low.get("straße") or low.get("strasse") or "",
            "zip": low.get("zip") or low.get("plz") or low.get("postleitzahl") or "",
            "city": low.get("city") or low.get("ort") or low.get("stadt") or "",
            "source": low.get("source") or low.get("quelle") or "CSV-Import",
            "status": "neu", "notes": low.get("notes") or low.get("notiz") or "", "deal_value": 0,
            "created_at": now_iso(),
        })
    if docs:
        await db.leads.insert_many(docs)
    return {"imported": len(docs)}


@router.patch("/leads/{lid}")
async def update_lead(lid: str, body: LeadPatch, user: dict = Depends(admin)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "status" in upd:
        stage_keys = await _lead_stage_keys()
        if upd["status"] not in stage_keys:
            raise HTTPException(status_code=400, detail="Ungültige Pipeline-Stufe")
        prev = await db.leads.find_one({"id": lid}, NO_ID)
        if prev and prev.get("status") != upd["status"]:
            stages = {s["key"]: s["label"] for s in await db.lead_stages.find({}, NO_ID).to_list(100)}
            await db.lead_activities.insert_one({
                "id": new_id(), "lead_id": lid, "type": "status_change",
                "text": f"Stufe geändert: {stages.get(prev.get('status'), prev.get('status'))} → {stages.get(upd['status'], upd['status'])}",
                "created_by": user["id"], "created_at": now_iso(),
            })
    await db.leads.update_one({"id": lid}, {"$set": upd})
    return await db.leads.find_one({"id": lid}, NO_ID)


@router.delete("/leads/{lid}")
async def delete_lead(lid: str, user: dict = Depends(admin)):
    await db.leads.delete_one({"id": lid})
    await db.lead_activities.delete_many({"lead_id": lid})
    await db.lead_tasks.delete_many({"lead_id": lid})
    return {"ok": True}


# ---------- Pipeline-Stufen (konfigurierbar) ----------

class StagePayload(BaseModel):
    key: str
    label: str
    color: str = "bg-slate-400"
    is_won: bool = False
    is_lost: bool = False


class StagePatch(BaseModel):
    label: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_won: Optional[bool] = None
    is_lost: Optional[bool] = None


@router.get("/lead-stages")
async def list_lead_stages(user: dict = Depends(admin)):
    return await db.lead_stages.find({}, NO_ID).sort("order", 1).to_list(100)


@router.post("/lead-stages")
async def create_lead_stage(body: StagePayload, user: dict = Depends(admin)):
    if await db.lead_stages.find_one({"key": body.key}):
        raise HTTPException(status_code=400, detail="Diese Stufe existiert bereits")
    last = await db.lead_stages.find({}, NO_ID).sort("order", -1).to_list(1)
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["order"] = (last[0]["order"] + 1) if last else 1
    await db.lead_stages.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/lead-stages/{sid}")
async def update_lead_stage(sid: str, body: StagePatch, user: dict = Depends(admin)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.lead_stages.update_one({"id": sid}, {"$set": upd})
    return await db.lead_stages.find_one({"id": sid}, NO_ID)


@router.delete("/lead-stages/{sid}")
async def delete_lead_stage(sid: str, user: dict = Depends(admin)):
    stage = await db.lead_stages.find_one({"id": sid})
    if not stage:
        raise HTTPException(status_code=404, detail="Stufe nicht gefunden")
    remaining = await db.lead_stages.count_documents({})
    if remaining <= 1:
        raise HTTPException(status_code=400, detail="Mindestens eine Pipeline-Stufe muss bestehen bleiben")
    in_use = await db.leads.count_documents({"status": stage["key"]})
    if in_use:
        raise HTTPException(status_code=400, detail=f"{in_use} Lead(s) sind noch in dieser Stufe — zuerst verschieben")
    await db.lead_stages.delete_one({"id": sid})
    return {"ok": True}


# ---------- Aktivitäten-Timeline pro Lead ----------

class ActivityPayload(BaseModel):
    type: str = "note"  # note | call | email
    text: str


@router.get("/leads/{lid}/activities")
async def list_lead_activities(lid: str, user: dict = Depends(admin)):
    return await db.lead_activities.find({"lead_id": lid}, NO_ID).sort("created_at", -1).to_list(500)


@router.post("/leads/{lid}/activities")
async def add_lead_activity(lid: str, body: ActivityPayload, user: dict = Depends(admin)):
    if not await db.leads.find_one({"id": lid}):
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["lead_id"] = lid
    doc["created_by"] = user["id"]
    doc["created_at"] = now_iso()
    await db.lead_activities.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Aufgaben/Erinnerungen pro Lead ----------

class TaskPayload(BaseModel):
    title: str
    due_at: Optional[str] = None


class TaskPatch(BaseModel):
    title: Optional[str] = None
    due_at: Optional[str] = None
    done: Optional[bool] = None


@router.get("/leads/{lid}/tasks")
async def list_lead_tasks(lid: str, user: dict = Depends(admin)):
    return await db.lead_tasks.find({"lead_id": lid}, NO_ID).sort("due_at", 1).to_list(200)


@router.post("/leads/{lid}/tasks")
async def add_lead_task(lid: str, body: TaskPayload, user: dict = Depends(admin)):
    if not await db.leads.find_one({"id": lid}):
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["lead_id"] = lid
    doc["done"] = False
    doc["reminder_sent"] = False
    doc["created_at"] = now_iso()
    await db.lead_tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/lead-tasks/{tid}")
async def update_lead_task(tid: str, body: TaskPatch, user: dict = Depends(admin)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.lead_tasks.update_one({"id": tid}, {"$set": upd})
    return await db.lead_tasks.find_one({"id": tid}, NO_ID)


@router.delete("/lead-tasks/{tid}")
async def delete_lead_task(tid: str, user: dict = Depends(admin)):
    await db.lead_tasks.delete_one({"id": tid})
    return {"ok": True}


@router.get("/lead-tasks/due")
async def due_lead_tasks(user: dict = Depends(admin)):
    """Open tasks due today or overdue, across all leads — for a 'Heute fällig' panel."""
    from datetime import datetime, timezone
    today_end = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
    tasks = await db.lead_tasks.find(
        {"done": {"$ne": True}, "due_at": {"$ne": None, "$lte": today_end}}, NO_ID
    ).sort("due_at", 1).to_list(200)
    lead_ids = list({t["lead_id"] for t in tasks})
    leads = await db.leads.find({"id": {"$in": lead_ids}}, NO_ID).to_list(len(lead_ids) or 1)
    lead_names = {l["id"]: l["name"] for l in leads}
    for t in tasks:
        t["lead_name"] = lead_names.get(t["lead_id"], "—")
    return tasks


@router.get("/funnel")
async def admin_funnel(days: int = 30, user: dict = Depends(admin)):
    """Conversion funnel for landlord signups, optionally split by acquisition source.

    Counted per organisation, not per user: a landlord *is* their org, and every
    downstream step (property, checkout, payment) hangs off org_id.
    """
    from datetime import datetime, timezone, timedelta
    since = None
    if days > 0:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    uq = {"role": "landlord"}
    if since:
        uq["created_at"] = {"$gte": since}
    landlords = await db.users.find(uq, {"_id": 0, "org_id": 1, "signup_source": 1}).to_list(20000)
    org_source = {u["org_id"]: (u.get("signup_source") or "direkt") for u in landlords if u.get("org_id")}
    org_ids = list(org_source.keys())

    if not org_ids:
        return {"days": days, "total": {"registered": 0, "with_property": 0, "checkout_started": 0, "paid": 0},
                "by_source": []}

    with_property = {p["org_id"] async for p in
                     db.properties.find({"org_id": {"$in": org_ids}}, {"_id": 0, "org_id": 1})}
    started = {t["org_id"] async for t in
               db.payment_transactions.find({"org_id": {"$in": org_ids}}, {"_id": 0, "org_id": 1})}
    paid = {t["org_id"] async for t in
            db.payment_transactions.find({"org_id": {"$in": org_ids}, "payment_status": "paid"},
                                         {"_id": 0, "org_id": 1})}

    def tally(ids):
        return {
            "registered": len(ids),
            "with_property": len([o for o in ids if o in with_property]),
            "checkout_started": len([o for o in ids if o in started]),
            "paid": len([o for o in ids if o in paid]),
        }

    sources = {}
    for org_id, src in org_source.items():
        sources.setdefault(src, []).append(org_id)

    return {
        "days": days,
        "total": tally(org_ids),
        "by_source": sorted(
            [{"source": s, **tally(ids)} for s, ids in sources.items()],
            key=lambda r: r["registered"], reverse=True),
    }


# ---------- Anschreiben-Vorlagen (Vertrieb) ----------
DEFAULT_OUTREACH = [
    {"key": "kurz", "name": "Kurz & direkt",
     "body": "Hallo,\n\nich habe Ihr Inserat für die Wohnung in {{ort}} gesehen. Falls Sie gerade viele "
             "Anfragen bekommen: Mit MietGate erhalten Sie alle Bewerbungen strukturiert an einem Ort, "
             "statt sie im Postfach zu sortieren.\n\nSie legen das Objekt an, teilen einen Link im Inserat "
             "und bekommen vollständige Bewerbungen inklusive Unterlagen:\n{{link}}\n\nViele Grüße\n{{absender}}"},
    {"key": "problem", "name": "Über das Problem",
     "body": "Hallo,\n\nzu Ihrem Inserat in {{ort}} bekommen Sie vermutlich sehr viele Zuschriften — oft "
             "unvollständig, und die Rückfragen kosten Abende.\n\nMietGate löst genau das: ein Link im "
             "Inserat, jeder Interessent füllt dasselbe Formular aus, Sie vergleichen die Bewerbungen "
             "nebeneinander und laden per Klick zur Besichtigung ein.\n\nHier ansehen: {{link}}\n\n"
             "Viele Grüße\n{{absender}}"},
    {"key": "kostenlos", "name": "Kostenlos testen",
     "body": "Hallo,\n\nich schreibe Ihnen wegen Ihres Inserats in {{ort}}. MietGate bündelt Mietbewerbungen: "
             "Interessenten bewerben sich über einen Link, Sie sehen alle Angaben und Unterlagen auf einen "
             "Blick.\n\nDas Anlegen ist kostenlos — bezahlt wird erst, wenn Sie den Bewerbungslink "
             "veröffentlichen. Einfach ausprobieren:\n{{link}}\n\nViele Grüße\n{{absender}}"},
]


@router.get("/outreach-templates")
async def list_outreach_templates(user: dict = Depends(admin)):
    stored = {t["key"]: t async for t in db.outreach_templates.find({}, NO_ID)}
    return [stored.get(t["key"], t) for t in DEFAULT_OUTREACH]


class OutreachPayload(BaseModel):
    name: str
    body: str


@router.put("/outreach-templates/{key}")
async def update_outreach_template(key: str, body: OutreachPayload, user: dict = Depends(admin)):
    if key not in {t["key"] for t in DEFAULT_OUTREACH}:
        raise HTTPException(status_code=404, detail="Unbekannte Vorlage")
    await db.outreach_templates.update_one(
        {"key": key}, {"$set": {"key": key, "name": body.name, "body": body.body}}, upsert=True)
    return await db.outreach_templates.find_one({"key": key}, NO_ID)


@router.delete("/outreach-templates/{key}")
async def reset_outreach_template(key: str, user: dict = Depends(admin)):
    await db.outreach_templates.delete_one({"key": key})
    return {"ok": True}


# ---------- Newsletter ----------
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


@router.get("/newsletter/subscribers")
async def newsletter_subscribers(user: dict = Depends(admin)):
    subs = await db.newsletter_subscribers.find({}, NO_ID).sort("created_at", -1).to_list(5000)
    counts = {
        "confirmed": sum(1 for s in subs if s.get("status") == "confirmed"),
        "pending": sum(1 for s in subs if s.get("status") == "pending"),
        "unsubscribed": sum(1 for s in subs if s.get("status") == "unsubscribed"),
    }
    return {"subscribers": subs, "counts": counts}


class NewsletterSendPayload(BaseModel):
    subject: str
    body_html: str


@router.post("/newsletter/send")
async def send_newsletter(body: NewsletterSendPayload, user: dict = Depends(admin)):
    subs = await db.newsletter_subscribers.find({"status": "confirmed"}, NO_ID).to_list(10000)
    sent = 0
    for s in subs:
        unsubscribe_link = f"{FRONTEND_URL}/newsletter-abmelden?token={s['unsubscribe_token']}"
        html = (
            f"{body.body_html}"
            f"<p style='color:#94a3b8;font-size:12px;margin-top:24px'>"
            f"<a href='{unsubscribe_link}' style='color:#94a3b8'>Newsletter abbestellen</a></p>"
        )
        await send_email(s["email"], body.subject, body.subject, html)
        sent += 1
    await log_activity(None, user["id"], "newsletter_send", "newsletter", None, {"subject": body.subject, "sent": sent})
    return {"ok": True, "sent": sent}


# ---------- E-Mail-Vorlagen (globale Defaults) ----------
@router.get("/email-templates")
async def list_email_templates(user: dict = Depends(admin)):
    from email_templates import DEFAULT_TEMPLATES
    templates = await db.email_templates.find({}, NO_ID).to_list(50)
    by_key = {t["key"]: t for t in templates}
    return [by_key.get(key, {"key": key, **tpl}) for key, tpl in DEFAULT_TEMPLATES.items()]


class EmailTemplatePayload(BaseModel):
    subject: str
    title: str
    body_html: str


@router.put("/email-templates/{key}")
async def update_email_template(key: str, body: EmailTemplatePayload, user: dict = Depends(admin)):
    from email_templates import DEFAULT_TEMPLATES
    if key not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Unbekannte Vorlage")
    await db.email_templates.update_one(
        {"key": key},
        {"$set": {"key": key, "name": DEFAULT_TEMPLATES[key]["name"], "placeholders": DEFAULT_TEMPLATES[key]["placeholders"],
                  "subject": body.subject, "title": body.title, "body_html": body.body_html,
                  "customized": True}},
        upsert=True,
    )
    return await db.email_templates.find_one({"key": key}, NO_ID)
