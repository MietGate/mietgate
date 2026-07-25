import os
import stripe
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from database import db, NO_ID
from security import get_current_user
from helpers import new_id, now_iso
import stripe_service

router = APIRouter(prefix="/api", tags=["payments"])


class CheckoutRequest(BaseModel):
    plan_key: str
    interval: str = "monthly"  # monthly | yearly
    origin_url: str
    withdrawal_consent: bool = False


@router.post("/payments/checkout")
async def create_checkout(req: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        raise HTTPException(status_code=403, detail="Keine Organisation")
    if not req.withdrawal_consent:
        raise HTTPException(status_code=400,
            detail="Bitte bestätigen Sie, dass die Leistung sofort beginnt und Sie Ihr Widerrufsrecht damit verlieren.")
    existing_sub = await db.subscriptions.find_one({"org_id": user["org_id"]}, NO_ID)
    if existing_sub and existing_sub.get("status") in ("active", "trialing"):
        raise HTTPException(status_code=400,
                            detail="Sie haben bereits ein aktives Abo. Bitte verwalten Sie es über das Abo-Portal.")
    plan = await db.plans.find_one({"key": req.plan_key}, NO_ID)
    if not plan:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    lookup_key = plan["yearly_lookup"] if req.interval == "yearly" else plan["monthly_lookup"]
    try:
        session, price = stripe_service.create_checkout_session(
            lookup_key, req.origin_url, user["id"], user["org_id"], trial_days=3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout fehlgeschlagen: {e}")
    await db.payment_transactions.insert_one({
        "id": new_id(), "session_id": session.id, "user_id": user["id"],
        "org_id": user["org_id"], "plan_key": req.plan_key, "interval": req.interval,
        "lookup_key": lookup_key, "amount": (price.unit_amount or 0) / 100,
        "currency": price.currency, "status": "initiated", "payment_status": "pending",
        "purpose": "subscription", "created_at": now_iso(), "updated_at": now_iso(),
        "withdrawal_consent_at": now_iso(),
        "withdrawal_consent_ip": request.client.host if request.client else None,
    })
    return {"checkout_url": session.url, "session_id": session.id}


class PremiumCheckout(BaseModel):
    origin_url: str
    withdrawal_consent: bool = False


@router.post("/premium/checkout")
async def premium_checkout(req: PremiumCheckout, request: Request, user: dict = Depends(get_current_user)):
    if user.get("premium"):
        raise HTTPException(status_code=400, detail="Premium ist bereits aktiv")
    if not req.withdrawal_consent:
        raise HTTPException(status_code=400,
            detail="Bitte bestätigen Sie, dass die Leistung sofort beginnt und Sie Ihr Widerrufsrecht damit verlieren.")
    try:
        session, price = stripe_service.create_checkout_session(
            "applicant_premium_monthly", req.origin_url, user["id"], None, purpose="premium")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout fehlgeschlagen: {e}")
    await db.payment_transactions.insert_one({
        "id": new_id(), "session_id": session.id, "user_id": user["id"], "org_id": None,
        "plan_key": "premium", "interval": "monthly", "lookup_key": "applicant_premium_monthly",
        "amount": (price.unit_amount or 0) / 100, "currency": price.currency,
        "status": "initiated", "payment_status": "pending", "purpose": "premium",
        "created_at": now_iso(), "updated_at": now_iso(),
        "withdrawal_consent_at": now_iso(),
        "withdrawal_consent_ip": request.client.host if request.client else None,
    })
    return {"checkout_url": session.url, "session_id": session.id}


@router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await stripe_service.sync_status(session_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transaktion nicht gefunden")
    return {"session_id": record["session_id"], "status": record["status"],
            "payment_status": record["payment_status"], "plan_key": record.get("plan_key")}


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, stripe_service.STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Stripe retries webhook delivery; checkout.session.completed is already idempotent via
    # _mark_paid's conditional update, but the other handlers below send emails/notifications
    # on every call, so dedupe by event.id to avoid spamming customers on a retry storm.
    already_processed = await db.processed_webhook_events.find_one({"event_id": event["id"]})
    if already_processed:
        return {"status": "ok"}
    await db.processed_webhook_events.update_one(
        {"event_id": event["id"]},
        {"$set": {"event_id": event["id"], "type": event["type"], "created_at": now_iso()}},
        upsert=True)

    obj, t = event["data"]["object"], event["type"]
    if t in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        await stripe_service._mark_paid(obj["id"], obj.get("subscription"), obj.get("payment_intent"))
    elif t in ("checkout.session.async_payment_failed", "checkout.session.expired"):
        await db.payment_transactions.update_one(
            {"session_id": obj["id"]},
            {"$set": {"status": "failed", "payment_status": "failed", "updated_at": now_iso()}})
    elif t == "customer.subscription.updated":
        await stripe_service.sync_subscription_status(obj)
    elif t == "customer.subscription.deleted":
        await stripe_service.handle_subscription_deleted(obj)
    elif t == "customer.subscription.trial_will_end":
        await stripe_service.handle_trial_will_end(obj)
    elif t == "invoice.payment_failed":
        await stripe_service.handle_invoice_payment_failed(obj)
    elif t == "invoice.payment_succeeded":
        await stripe_service.handle_invoice_payment_succeeded(obj)
    return {"status": "ok"}


class BillingPortalRequest(BaseModel):
    origin_url: str


@router.post("/subscription/billing-portal")
async def billing_portal(req: BillingPortalRequest, user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"org_id": user.get("org_id")}, NO_ID)
    if not sub or not sub.get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="Kein Stripe-Kunde hinterlegt")
    try:
        session = stripe_service.create_billing_portal_session(sub["stripe_customer_id"], f"{req.origin_url}/abo")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portal fehlgeschlagen: {e}")
    return {"portal_url": session.url}


@router.post("/subscription/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"org_id": user.get("org_id")})
    if not sub or not sub.get("stripe_subscription_id"):
        raise HTTPException(status_code=404, detail="Kein aktives Abo")
    member = await db.org_members.find_one({"org_id": user["org_id"], "user_id": user["id"]})
    if not member or member["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    try:
        stripe.Subscription.modify(sub["stripe_subscription_id"], cancel_at_period_end=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kündigung fehlgeschlagen: {e}")
    await db.subscriptions.update_one({"org_id": user["org_id"]},
                                      {"$set": {"cancel_at_period_end": True, "updated_at": now_iso()}})
    return {"ok": True}
