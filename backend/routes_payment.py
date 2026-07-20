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


@router.post("/payments/checkout")
async def create_checkout(req: CheckoutRequest, user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        raise HTTPException(status_code=403, detail="Keine Organisation")
    plan = await db.plans.find_one({"key": req.plan_key}, NO_ID)
    if not plan:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    lookup_key = plan["yearly_lookup"] if req.interval == "yearly" else plan["monthly_lookup"]
    try:
        session, price = stripe_service.create_checkout_session(
            lookup_key, req.origin_url, user["id"], user["org_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout fehlgeschlagen: {e}")
    await db.payment_transactions.insert_one({
        "id": new_id(), "session_id": session.id, "user_id": user["id"],
        "org_id": user["org_id"], "plan_key": req.plan_key, "interval": req.interval,
        "lookup_key": lookup_key, "amount": (price.unit_amount or 0) / 100,
        "currency": price.currency, "status": "initiated", "payment_status": "pending",
        "purpose": "subscription", "created_at": now_iso(), "updated_at": now_iso(),
    })
    return {"checkout_url": session.url, "session_id": session.id}


class PremiumCheckout(BaseModel):
    origin_url: str


@router.post("/premium/checkout")
async def premium_checkout(req: PremiumCheckout, user: dict = Depends(get_current_user)):
    if user.get("premium"):
        raise HTTPException(status_code=400, detail="Premium ist bereits aktiv")
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
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await stripe_service._mark_paid(obj["id"], obj.get("subscription"), obj.get("payment_intent"))
    elif t == "checkout.session.async_payment_succeeded":
        await stripe_service._mark_paid(obj["id"], obj.get("subscription"), obj.get("payment_intent"))
    elif t in ("checkout.session.async_payment_failed", "checkout.session.expired"):
        await db.payment_transactions.update_one(
            {"session_id": obj["id"]},
            {"$set": {"status": "failed", "payment_status": "failed", "updated_at": now_iso()}})
    return {"status": "ok"}


@router.post("/subscription/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"org_id": user.get("org_id")})
    if not sub or not sub.get("stripe_subscription_id"):
        raise HTTPException(status_code=404, detail="Kein aktives Abo")
    try:
        stripe.Subscription.modify(sub["stripe_subscription_id"], cancel_at_period_end=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kündigung fehlgeschlagen: {e}")
    await db.subscriptions.update_one({"org_id": user["org_id"]},
                                      {"$set": {"cancel_at_period_end": True, "updated_at": now_iso()}})
    return {"ok": True}
