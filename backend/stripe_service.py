import os
import logging
import stripe
from datetime import datetime, timezone
from database import db

logger = logging.getLogger(__name__)
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# EUR, cents. Germany -> SMP eligible (tax_mode "full")
CATALOG = [
    {"emergent_product_id": "mietgate_starter", "name": "MietGate Starter", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "starter_monthly", "amount": 1499, "currency": "eur", "interval": "month"},
         {"lookup_key": "starter_yearly", "amount": 14390, "currency": "eur", "interval": "year"},
     ]},
    {"emergent_product_id": "mietgate_plus", "name": "MietGate Plus", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "plus_monthly", "amount": 2999, "currency": "eur", "interval": "month"},
         {"lookup_key": "plus_yearly", "amount": 26990, "currency": "eur", "interval": "year"},
     ]},
    {"emergent_product_id": "mietgate_makler", "name": "MietGate Makler", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "makler_monthly", "amount": 9900, "currency": "eur", "interval": "month"},
         {"lookup_key": "makler_yearly", "amount": 89100, "currency": "eur", "interval": "year"},
     ]},
    {"emergent_product_id": "mietgate_whitelabel", "name": "MietGate White-Label", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "whitelabel_monthly", "amount": 7900, "currency": "eur", "interval": "month"},
         {"lookup_key": "whitelabel_yearly", "amount": 75800, "currency": "eur", "interval": "year"},
     ]},
    {"emergent_product_id": "mietgate_premium", "name": "MietGate Bewerber-Premium", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "applicant_premium_monthly", "amount": 499, "currency": "eur", "interval": "month"},
     ]},
]


def get_or_create_product(entry):
    for p in stripe.Product.list(active=True).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("emergent_product_id") == entry["emergent_product_id"]:
            return p
    return stripe.Product.create(
        name=entry["name"], tax_code=entry.get("tax_code"),
        metadata={"managed_by": "emergent", "emergent_product_id": entry["emergent_product_id"]},
    )


def setup_catalog():
    try:
        for entry in CATALOG:
            product = get_or_create_product(entry)
            for p in entry["prices"]:
                existing = stripe.Price.list(lookup_keys=[p["lookup_key"]], active=True, limit=1).data
                if existing and (existing[0].unit_amount != p["amount"] or existing[0].currency != p["currency"]):
                    stripe.Price.modify(existing[0].id, active=False)
                    existing = []
                if not existing:
                    stripe.Price.create(
                        product=product.id, unit_amount=p["amount"], currency=p["currency"],
                        lookup_key=p["lookup_key"], transfer_lookup_key=True,
                        recurring={"interval": p["interval"]},
                    )
        logger.info("Stripe catalog ready")
    except Exception as e:
        logger.error(f"Stripe catalog setup failed: {e}")


def create_checkout_session(lookup_key: str, origin_url: str, user_id: str, org_id: str, purpose: str = "subscription"):
    prices = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1).data
    if not prices:
        raise ValueError(f"Price not found: {lookup_key}")
    price = prices[0]
    kwargs = dict(
        line_items=[{"price": price.id, "quantity": 1}],
        mode="subscription",
        success_url=f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin_url}/payment/cancel",
        metadata={"user_id": user_id or "", "org_id": org_id or "", "lookup_key": lookup_key, "purpose": purpose},
    )
    try:
        session = stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
    except stripe.error.InvalidRequestError as e:
        msg = (getattr(e, "user_message", "") or "").lower()
        if "managed payments" in msg or "ineligible" in msg:
            session = stripe.checkout.Session.create(
                **kwargs, automatic_tax={"enabled": True}, billing_address_collection="required")
        else:
            raise
    return session, price


async def sync_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        return None
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await _mark_paid(session_id, s.subscription, s.payment_intent)
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    return record


async def _mark_paid(session_id, subscription, payment_intent):
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx or tx.get("payment_status") == "paid":
        return
    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid",
                  "stripe_subscription_id": subscription,
                  "stripe_payment_intent_id": payment_intent,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    # Bewerber-Premium: activate flag on the user
    if tx.get("purpose") == "premium":
        if tx.get("user_id"):
            await db.users.update_one({"id": tx["user_id"]}, {"$set": {"premium": True}})
        return
    # White-Label is an add-on: activate the flag on the org, don't overwrite the base plan
    if tx.get("plan_key") == "whitelabel":
        if tx.get("org_id"):
            await db.organizations.update_one(
                {"id": tx["org_id"]}, {"$set": {"white_label_addon": True}})
        return
    # Activate subscription for the org
    if tx.get("org_id"):
        await db.subscriptions.update_one(
            {"org_id": tx["org_id"]},
            {"$set": {
                "org_id": tx["org_id"], "plan_key": tx.get("plan_key"),
                "status": "active", "interval": tx.get("interval"),
                "stripe_subscription_id": subscription,
                "cancel_at_period_end": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}, upsert=True,
        )
