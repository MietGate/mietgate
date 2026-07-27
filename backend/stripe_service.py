import os
import logging
import stripe
from datetime import datetime, timezone, timedelta
from database import db, NO_ID
from email_service import send_email
from helpers import notify

logger = logging.getLogger(__name__)
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# EUR, cents. Germany -> SMP eligible (tax_mode "full")
# NOTE — Aktion bis 2026-09-01: starter_onetime, plus_monthly/plus_yearly und
# makler_monthly/makler_yearly stehen unten auf dem AKTIONSPREIS. Nach Ablauf der Aktion
# muss hier manuell auf den regulaeren Anker-Preis umgestellt werden (siehe
# project_mietgate_session_2026-07-26_part3_handoff Memory fuer die genauen Zielwerte:
# Starter 29,90€ einmalig, Plus 39,90€/Jahr 383€, Makler 99,90€/Jahr 959€).
# tax_behavior: "inclusive" = Preis ist bereits Bruttopreis — gilt fuer alles, was an
# Verbraucher verkauft wird (Starter, Bewerber-Premium), sonst weicht der angezeigte
# Preis vom abgebuchten ab. "exclusive" = Nettopreis, MwSt kommt im Checkout dazu —
# nur fuer die B2B-Pakete (Plus, Makler, White-Label-Add-on).
CATALOG = [
    {"mietgate_product_id": "mietgate_starter", "name": "MietGate Starter", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "starter_onetime", "amount": 1990, "currency": "eur", "interval": None, "tax_behavior": "inclusive"},
     ]},
    {"mietgate_product_id": "mietgate_plus", "name": "MietGate Plus", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "plus_monthly", "amount": 2990, "currency": "eur", "interval": "month", "tax_behavior": "exclusive"},
         {"lookup_key": "plus_yearly", "amount": 28700, "currency": "eur", "interval": "year", "tax_behavior": "exclusive"},
     ]},
    {"mietgate_product_id": "mietgate_makler", "name": "MietGate Makler", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "makler_monthly", "amount": 7990, "currency": "eur", "interval": "month", "tax_behavior": "exclusive"},
         {"lookup_key": "makler_yearly", "amount": 76700, "currency": "eur", "interval": "year", "tax_behavior": "exclusive"},
     ]},
    {"mietgate_product_id": "mietgate_whitelabel", "name": "MietGate White-Label", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "whitelabel_monthly", "amount": 7900, "currency": "eur", "interval": "month", "tax_behavior": "exclusive"},
         {"lookup_key": "whitelabel_yearly", "amount": 75800, "currency": "eur", "interval": "year", "tax_behavior": "exclusive"},
     ]},
    {"mietgate_product_id": "mietgate_premium", "name": "MietGate Bewerber-Premium", "tax_code": "txcd_10103001",
     "prices": [
         {"lookup_key": "applicant_premium_monthly", "amount": 499, "currency": "eur", "interval": "month", "tax_behavior": "inclusive"},
     ]},
]


def get_or_create_product(entry):
    for p in stripe.Product.list(active=True).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("mietgate_product_id") == entry["mietgate_product_id"]:
            return p
    return stripe.Product.create(
        name=entry["name"], tax_code=entry.get("tax_code"),
        metadata={"managed_by": "mietgate", "mietgate_product_id": entry["mietgate_product_id"]},
    )


def setup_catalog():
    try:
        for entry in CATALOG:
            product = get_or_create_product(entry)
            for p in entry["prices"]:
                existing = stripe.Price.list(lookup_keys=[p["lookup_key"]], active=True, limit=1).data
                tax_behavior = p.get("tax_behavior", "exclusive")
                if existing and (existing[0].unit_amount != p["amount"] or existing[0].currency != p["currency"]
                                 or existing[0].tax_behavior != tax_behavior):
                    stripe.Price.modify(existing[0].id, active=False)
                    existing = []
                if not existing:
                    kwargs = dict(
                        product=product.id, unit_amount=p["amount"], currency=p["currency"],
                        lookup_key=p["lookup_key"], transfer_lookup_key=True, tax_behavior=tax_behavior,
                    )
                    if p.get("interval"):
                        kwargs["recurring"] = {"interval": p["interval"]}
                    stripe.Price.create(**kwargs)
        logger.info("Stripe catalog ready")
    except Exception as e:
        logger.error(f"Stripe catalog setup failed: {e}")


def create_checkout_session(lookup_key: str, origin_url: str, user_id: str, org_id: str,
                            purpose: str = "subscription", trial_days: int = None, property_id: str = None,
                            one_time: bool = False):
    prices = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1).data
    if not prices:
        raise ValueError(f"Price not found: {lookup_key}")
    price = prices[0]
    metadata = {"user_id": user_id or "", "org_id": org_id or "", "lookup_key": lookup_key, "purpose": purpose}
    if property_id:
        metadata["property_id"] = property_id
    kwargs = dict(
        line_items=[{"price": price.id, "quantity": 1}],
        mode="payment" if one_time else "subscription",
        success_url=f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin_url}/payment/cancel",
        metadata=metadata,
    )
    if one_time:
        kwargs["payment_intent_data"] = {"metadata": metadata}
    elif trial_days:
        kwargs["subscription_data"] = {"trial_period_days": trial_days, "metadata": metadata}
        kwargs["payment_method_collection"] = "always"
    try:
        session = stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
    except stripe.error.InvalidRequestError as e:
        msg = (getattr(e, "user_message", "") or "").lower()
        if "managed payments" in msg or "ineligible" in msg:
            # This fallback is not cosmetic: it moves the VAT liability from Stripe to us
            # for this one checkout (see tax_facts below). It must never pass unnoticed —
            # the resulting transaction is recorded with a different tax_mode, and this is
            # logged at ERROR level so it surfaces in the platform logs.
            logger.error(
                "Managed Payments ineligible for lookup_key=%s (user=%s, org=%s) — falling back "
                "to automatic_tax. VAT liability for this checkout moves from Stripe to us. %s",
                lookup_key, user_id, org_id, e)
            session = stripe.checkout.Session.create(
                **kwargs, automatic_tax={"enabled": True}, billing_address_collection="required")
        else:
            raise
    return session, price


def tax_facts(session) -> dict:
    """Which VAT regime a checkout ran under, for the books.

    Two mutually exclusive regimes can apply, and they differ in *who owes the VAT*:

      managed_payments -> Stripe is merchant of record and remits the VAT itself
                          (automatic_tax.liability.type == "stripe")
      automatic_tax    -> we are the seller; Stripe Tax only calculates, we file and remit
                          (automatic_tax.liability.type == "self")

    Which one applied cannot be reconstructed from our own records afterwards, so it is
    stored on every payment transaction at creation time.
    """
    at = getattr(session, "automatic_tax", None) or {}
    mp = getattr(session, "managed_payments", None) or {}
    liability = at.get("liability") or {}
    return {
        "tax_mode": "managed_payments" if mp.get("enabled") else "automatic_tax",
        "tax_liability": liability.get("type"),
        "tax_amount": (getattr(session, "total_details", None) or {}).get("amount_tax"),
    }


def create_billing_portal_session(customer_id: str, return_url: str):
    return stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)


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
    paid_fields = {"status": "completed", "payment_status": "paid",
                   "stripe_subscription_id": subscription,
                   "stripe_payment_intent_id": payment_intent,
                   "updated_at": datetime.now(timezone.utc).isoformat()}
    # The tax figures recorded at checkout creation are still zero for trials and can change
    # once a billing address is known, so re-read them from the settled session.
    try:
        paid_fields.update(tax_facts(stripe.checkout.Session.retrieve(session_id)))
    except stripe.error.StripeError as e:
        logger.warning("Could not re-read tax facts for %s: %s", session_id, e)
    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": paid_fields},
    )
    # One-time Starter link activation: no Stripe subscription, just a timed access window.
    if tx.get("purpose") == "link_activation_onetime":
        if tx.get("org_id"):
            days = tx.get("one_time_duration_days") or 90
            expires_at = datetime.now(timezone.utc) + timedelta(days=days)
            await db.subscriptions.update_one(
                {"org_id": tx["org_id"]},
                {"$set": {
                    "org_id": tx["org_id"], "plan_key": tx.get("plan_key"), "kind": "one_time",
                    "status": "active", "interval": "one_time",
                    "expires_at": expires_at.isoformat(),
                    "stripe_payment_intent_id": payment_intent,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}, upsert=True,
            )
            if tx.get("property_id"):
                await db.properties.update_one(
                    {"id": tx["property_id"]},
                    {"$set": {"link_active": True, "link_deactivated_by_payment": False}})
            await _email_user(tx.get("user_id"), "Ihr Bewerbungslink ist aktiv",
                              "Zahlung erfolgreich – Link aktiviert",
                              f"<p>Vielen Dank! Ihr Bewerbungslink ist ab sofort für "
                              f"<b>{days} Tage</b> aktiv (bis {expires_at.strftime('%d.%m.%Y')}).</p>"
                              f"<p>Sie können jetzt alle Funktionen des Starter-Pakets nutzen.</p>")
        return
    # Bewerber-Premium: activate flag on the user, track the subscription so cancellation
    # and failed-payment webhooks can find and downgrade it later
    if tx.get("purpose") == "premium":
        if tx.get("user_id"):
            sub_status, customer_id = "active", None
            if subscription:
                try:
                    s = stripe.Subscription.retrieve(subscription)
                    sub_status = s.status
                    customer_id = s.customer
                except Exception:
                    pass
            await db.subscriptions.update_one(
                {"user_id": tx["user_id"], "kind": "premium"},
                {"$set": {
                    "user_id": tx["user_id"], "org_id": None, "kind": "premium",
                    "plan_key": "premium", "status": sub_status, "interval": "monthly",
                    "stripe_subscription_id": subscription,
                    "stripe_customer_id": customer_id,
                    "cancel_at_period_end": False, "payment_failure_count": 0,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}, upsert=True,
            )
            await db.users.update_one({"id": tx["user_id"]}, {"$set": {"premium": True}})
            await _email_user(tx["user_id"], "Willkommen bei MietGate Premium",
                              "Ihr Premium-Profil ist aktiv",
                              "<p>Vielen Dank! Ihr Bewerber-Premium (4,99 €/Monat) ist ab sofort aktiv. "
                              "Ihr Profil wird Vermietern nun bevorzugt angezeigt.</p>")
        return
    # White-Label is an add-on: activate the flag on the org, don't overwrite the base plan
    if tx.get("plan_key") == "whitelabel":
        if tx.get("org_id"):
            await db.organizations.update_one(
                {"id": tx["org_id"]}, {"$set": {"white_label_addon": True}})
        await _email_user(tx.get("user_id"), "White-Label freigeschaltet",
                          "Ihr White-Label Add-on ist aktiv",
                          "<p>Ihr White-Label Add-on wurde erfolgreich aktiviert. "
                          "Sie können nun Logo, Farben und Firmennamen in den Einstellungen anpassen.</p>")
        return
    # Activate subscription for the org
    if tx.get("org_id"):
        sub_status, customer_id = "active", None
        if subscription:
            try:
                s = stripe.Subscription.retrieve(subscription)
                sub_status = s.status
                customer_id = s.customer
            except Exception:
                pass
        await db.subscriptions.update_one(
            {"org_id": tx["org_id"]},
            {"$set": {
                "org_id": tx["org_id"], "plan_key": tx.get("plan_key"),
                "status": sub_status, "interval": tx.get("interval"),
                "stripe_subscription_id": subscription,
                "stripe_customer_id": customer_id,
                "cancel_at_period_end": False, "payment_failure_count": 0,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}, upsert=True,
        )
        if tx.get("property_id"):
            await db.properties.update_one(
                {"id": tx["property_id"]},
                {"$set": {"link_active": True, "link_deactivated_by_payment": False}})
        trial_note = ("<p>Ihr 3-tägiger Testzeitraum hat begonnen — die erste Abbuchung erfolgt danach automatisch.</p>"
                      if sub_status == "trialing" else "")
        await _email_user(tx.get("user_id"), "Ihr MietGate-Abo ist aktiv",
                          "Zahlung erfolgreich – Abo aktiviert",
                          f"<p>Vielen Dank! Ihr <b>{(tx.get('plan_key') or '').capitalize()}</b>-Abo "
                          f"({tx.get('interval','monthly')}) ist ab sofort aktiv.</p>{trial_note}"
                          f"<p>Sie können jetzt alle Funktionen Ihres Pakets nutzen.</p>")


async def _email_user(user_id, subject, title, body_html):
    if not user_id:
        return
    u = await db.users.find_one({"id": user_id}, {"email": 1, "_id": 0})
    if u and u.get("email"):
        await send_email(u["email"], subject, title, body_html)


async def _org_owner_user_id(org_id):
    if not org_id:
        return None
    m = await db.org_members.find_one({"org_id": org_id, "role": "owner"}, NO_ID)
    return m["user_id"] if m else None


async def sync_subscription_status(subscription_obj):
    """Keep our subscriptions.status/current_period_end in sync with Stripe's own state."""
    sub_id = subscription_obj["id"]
    sub = await db.subscriptions.find_one({"stripe_subscription_id": sub_id}, NO_ID)
    if not sub:
        return
    await db.subscriptions.update_one(
        {"stripe_subscription_id": sub_id},
        {"$set": {
            "status": subscription_obj["status"],
            "cancel_at_period_end": bool(subscription_obj.get("cancel_at_period_end")),
            "current_period_end": subscription_obj.get("current_period_end"),
            "stripe_customer_id": subscription_obj.get("customer"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )


async def _lock_org_links(org_id):
    """Payment lapsed: deactivate every currently-live link, remembering which ones
    we turned off so a later recovery only restores those (not ones the landlord
    had already switched off manually)."""
    if not org_id:
        return
    await db.properties.update_many(
        {"org_id": org_id, "link_active": True},
        {"$set": {"link_active": False, "link_deactivated_by_payment": True}},
    )


async def _unlock_org_links(org_id):
    if not org_id:
        return
    await db.properties.update_many(
        {"org_id": org_id, "link_deactivated_by_payment": True},
        {"$set": {"link_active": True, "link_deactivated_by_payment": False}},
    )


async def handle_subscription_deleted(subscription_obj):
    sub_id = subscription_obj["id"]
    sub = await db.subscriptions.find_one({"stripe_subscription_id": sub_id}, NO_ID)
    if not sub:
        return
    await db.subscriptions.update_one(
        {"stripe_subscription_id": sub_id},
        {"$set": {"status": "canceled", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if sub.get("kind") == "premium":
        if sub.get("user_id"):
            await db.users.update_one({"id": sub["user_id"]}, {"$set": {"premium": False}})
            await notify(sub["user_id"], "premium_canceled", "Premium beendet",
                         "Ihr Bewerber-Premium wurde beendet. Ihr Profil-Link ist damit nicht mehr aktiv.", "/bewerber")
            await _email_user(sub["user_id"], "Bewerber-Premium beendet", "Ihr Premium wurde beendet",
                              "<p>Ihr Bewerber-Premium (4,99 €/Monat) wurde beendet. Ihr Profil-Link ist damit "
                              "nicht mehr aktiv, Ihre Dokumente bleiben aber erhalten.</p>")
        return
    await _lock_org_links(sub.get("org_id"))
    owner_id = await _org_owner_user_id(sub.get("org_id"))
    if owner_id:
        await notify(owner_id, "subscription_canceled", "Abo beendet",
                     "Ihr MietGate-Abo wurde beendet, Ihre Bewerbungslinks wurden deaktiviert.", "/abo")


async def handle_invoice_payment_failed(invoice_obj):
    sub_id = invoice_obj.get("subscription")
    if not sub_id:
        return
    sub = await db.subscriptions.find_one({"stripe_subscription_id": sub_id}, NO_ID)
    if not sub:
        return
    failure_count = sub.get("payment_failure_count", 0) + 1
    await db.subscriptions.update_one(
        {"stripe_subscription_id": sub_id},
        {"$set": {"status": "past_due", "payment_failure_count": failure_count,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if sub.get("kind") == "premium":
        user_id = sub.get("user_id")
        if failure_count < 2:
            if user_id:
                await notify(user_id, "payment_failed_warning", "Zahlung fehlgeschlagen",
                             "Ihre Zahlung für Bewerber-Premium ist fehlgeschlagen. Wir versuchen es automatisch erneut — bitte prüfen Sie Ihre Zahlungsmethode.", "/bewerber")
                await _email_user(user_id, "Zahlung fehlgeschlagen — wir versuchen es erneut", "Ihre Zahlung ist fehlgeschlagen",
                                  "<p>Wir konnten die Zahlung für Ihr Bewerber-Premium nicht abbuchen. Stripe versucht es "
                                  "automatisch erneut — bitte aktualisieren Sie vorsorglich Ihre Zahlungsmethode.</p>")
            return
        if user_id:
            await db.users.update_one({"id": user_id}, {"$set": {"premium": False}})
            await notify(user_id, "payment_failed", "Premium deaktiviert",
                         "Ihre Zahlung für Bewerber-Premium ist fehlgeschlagen — Premium wurde deaktiviert.", "/bewerber")
            await _email_user(user_id, "Premium deaktiviert", "Bewerber-Premium deaktiviert",
                              "<p>Wir konnten die Zahlung für Ihr Bewerber-Premium auch im zweiten Versuch nicht "
                              "abbuchen. Premium wurde deshalb deaktiviert, Ihre Dokumente bleiben erhalten. "
                              "Bitte aktualisieren Sie Ihre Zahlungsmethode und aktivieren Sie Premium erneut.</p>")
        return
    owner_id = await _org_owner_user_id(sub.get("org_id"))
    if failure_count < 2:
        # Give Stripe's own automatic retry a chance before locking anything —
        # a single transient card decline shouldn't cut off live applications/viewings.
        if owner_id:
            await notify(owner_id, "payment_failed_warning", "Zahlung fehlgeschlagen",
                         "Ihre Zahlung ist fehlgeschlagen. Wir versuchen es automatisch erneut — bitte prüfen Sie Ihre Zahlungsmethode, um eine Sperre zu vermeiden.", "/abo")
            await _email_user(owner_id, "Zahlung fehlgeschlagen — wir versuchen es erneut", "Ihre Zahlung ist fehlgeschlagen",
                              "<p>Wir konnten die Zahlung für Ihr MietGate-Abo nicht abbuchen. Stripe versucht die Abbuchung "
                              "automatisch erneut. Ihr Bewerbungslink ist aktuell noch nicht gesperrt — bitte aktualisieren Sie "
                              "vorsorglich Ihre Zahlungsmethode, um eine Sperre bei einem erneuten Fehlschlag zu vermeiden.</p>")
        return
    await _lock_org_links(sub.get("org_id"))
    if owner_id:
        await notify(owner_id, "payment_failed", "Zahlung fehlgeschlagen",
                     "Ihre Zahlung ist fehlgeschlagen — Ihr Bewerbungslink wurde deaktiviert. Bitte aktualisieren Sie Ihre Zahlungsmethode, um weiter Bewerbungen zu erhalten.", "/abo")
        await _email_user(owner_id, "Zahlung fehlgeschlagen", "Ihre Zahlung ist fehlgeschlagen",
                          "<p>Wir konnten die Zahlung für Ihr MietGate-Abo auch im zweiten Versuch nicht abbuchen. Ihr Bewerbungslink wurde "
                          "deshalb deaktiviert und Ihre Bewerber-Ansicht gesperrt, Ihre Daten bleiben aber erhalten. "
                          "Bitte aktualisieren Sie Ihre Zahlungsmethode, damit Ihr Zugriff sofort wiederhergestellt wird.</p>")


async def handle_invoice_payment_succeeded(invoice_obj):
    """Clear a past_due state and restore access once a retried/renewed payment goes through."""
    sub_id = invoice_obj.get("subscription")
    if not sub_id:
        return
    sub = await db.subscriptions.find_one({"stripe_subscription_id": sub_id}, NO_ID)
    if not sub or sub.get("status") != "past_due":
        return
    await db.subscriptions.update_one(
        {"stripe_subscription_id": sub_id},
        {"$set": {"status": "active", "payment_failure_count": 0,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if sub.get("kind") == "premium":
        if sub.get("user_id"):
            await db.users.update_one({"id": sub["user_id"]}, {"$set": {"premium": True}})
            await notify(sub["user_id"], "payment_recovered", "Zahlung erfolgreich",
                         "Ihre Zahlungsmethode wurde erfolgreich belastet — Ihr Bewerber-Premium ist wieder aktiv.", "/bewerber")
        return
    await _unlock_org_links(sub.get("org_id"))
    owner_id = await _org_owner_user_id(sub.get("org_id"))
    if owner_id:
        await notify(owner_id, "payment_recovered", "Zahlung erfolgreich",
                     "Ihre Zahlungsmethode wurde erfolgreich belastet — Ihr Bewerbungslink und Zugriff sind wieder vollständig freigeschaltet.", "/abo")


async def handle_trial_will_end(subscription_obj):
    sub_id = subscription_obj["id"]
    sub = await db.subscriptions.find_one({"stripe_subscription_id": sub_id}, NO_ID)
    if not sub:
        return
    owner_id = await _org_owner_user_id(sub.get("org_id"))
    if owner_id:
        await notify(owner_id, "trial_will_end", "Testzeitraum endet bald",
                     "Ihr kostenloser Testzeitraum endet in Kürze. Danach wird Ihre hinterlegte Zahlungsmethode belastet.", "/abo")
        await _email_user(owner_id, "Ihr Testzeitraum endet bald", "Testzeitraum endet in Kürze",
                          "<p>Ihr kostenloser Testzeitraum bei MietGate endet in Kürze. "
                          "Danach wird die von Ihnen hinterlegte Zahlungsmethode automatisch belastet.</p>")
