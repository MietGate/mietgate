import asyncio
import logging
from datetime import datetime, timezone, timedelta
from starlette.concurrency import run_in_threadpool
from database import db, NO_ID
from helpers import notify, log_activity, email_enabled
from email_service import send_email
from email_templates import render_and_send
from storage import delete_object

logger = logging.getLogger("mietgate.maintenance")


def _parse(dt):
    if not dt:
        return None
    if isinstance(dt, datetime):
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    try:
        d = datetime.fromisoformat(dt)
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def send_viewing_reminders():
    """Remind participants & landlord about viewings within the next ~24h (once)."""
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(hours=25)
    cursor = db.viewings.find({"reminder_sent": {"$ne": True}, "datetime": {"$ne": None}})
    count = 0
    async for v in cursor:
        dt = _parse(v.get("datetime"))
        if not dt or dt < now or dt > horizon:
            continue
        when = dt.strftime("%d.%m.%Y %H:%M")
        for p in v.get("participants", []):
            await notify(p["applicant_user_id"], "viewing_reminder", "Erinnerung: Besichtigung morgen",
                         f'Ihre Besichtigung "{v["title"]}" findet am {when} statt.', "/bewerber/termine")
            if p.get("applicant_email") and await email_enabled(p["applicant_user_id"], "viewings"):
                await render_and_send("viewing_reminder", p["applicant_email"], v.get("org_id"),
                                      {"viewing_title": v["title"], "when": when})
            if p.get("status") == "invited":
                await notify(v.get("created_by"), "viewing_no_response", "Bewerber hat nicht reagiert",
                             f'Ein eingeladener Bewerber hat den Termin "{v["title"]}" noch nicht bestätigt.',
                             f"/objekte/{v['property_id']}")
        await notify(v.get("created_by"), "viewing_reminder", "Erinnerung: Besichtigung morgen",
                     f'Ihre Besichtigung "{v["title"]}" ist am {when}.', f"/objekte/{v['property_id']}")
        await db.viewings.update_one({"id": v["id"]}, {"$set": {"reminder_sent": True}})
        count += 1
    if count:
        logger.info(f"Sent reminders for {count} viewings")
    return count


async def dispatch_pending_viewing_invites():
    """Send the queued invitations of "offene Besichtigungen" whose delay has elapsed.

    Queued in routes_viewing.auto_invite_to_open_viewings — see there for why the mail is
    deliberately not sent in the same second the application arrives.
    """
    now = datetime.now(timezone.utc)
    cursor = db.viewings.find({"cancelled": {"$ne": True}, "participants.notified": False})
    sent = 0
    async for v in cursor:
        parts = v.get("participants", [])
        changed = False
        for p in parts:
            if p.get("notified") is not False:
                continue
            due = _parse(p.get("notify_after"))
            if not due or due > now:
                continue
            when = v.get("datetime") or p.get("slot")
            when_block = f"<p>Termin: <b>{when}</b></p>" if when else ""
            await notify(p["applicant_user_id"], "viewing_invite", "Einladung zur Besichtigung",
                         f"Sie wurden zu einer Besichtigung eingeladen: {v['title']}", "/bewerber/termine")
            if p.get("applicant_email") and await email_enabled(p["applicant_user_id"], "viewings"):
                await render_and_send("viewing_invite", p["applicant_email"], v.get("org_id"),
                                      {"viewing_title": v["title"], "when_block": when_block})
            p["notified"] = True
            changed = True
            sent += 1
        if changed:
            await db.viewings.update_one({"id": v["id"]}, {"$set": {"participants": parts}})
    if sent:
        logger.info(f"Dispatched {sent} pending viewing invites")
    return sent


async def pending_invite_loop():
    """Own loop: the hourly maintenance pass is far too coarse for a 10-minute delay."""
    await asyncio.sleep(30)
    while True:
        try:
            await dispatch_pending_viewing_invites()
        except Exception as e:
            logger.error(f"Pending invite dispatch failed: {e}")
        await asyncio.sleep(60)


async def run_gdpr_cleanup():
    """Delete applications & their documents per retention rules."""
    now = datetime.now(timezone.utc)
    rejected_cut = now - timedelta(days=180)   # Absage: 6 Monate
    inactive_cut = now - timedelta(days=365)    # Inaktivität: 12 Monate
    success_cut = now - timedelta(days=730)     # Vermietet: 24 Monate
    deleted = 0
    async for app in db.applications.find({}):
        created = _parse(app.get("created_at"))
        if not created:
            continue
        status = app.get("status")
        remove = False
        if status == "absage" and created < rejected_cut:
            remove = True
        elif status == "zusage" and created < success_cut:
            remove = True
        elif status not in ("zusage",) and created < inactive_cut:
            remove = True
        if remove:
            docs = await db.documents.find({"application_id": app["id"]}, NO_ID).to_list(500)
            for d in docs:
                if d.get("storage_path"):
                    try:
                        await run_in_threadpool(delete_object, d["storage_path"])
                    except Exception as e:
                        logger.error(f"Failed to delete storage object {d['storage_path']}: {e}")
            await db.documents.delete_many({"application_id": app["id"]})
            await db.messages.delete_many({"application_id": app["id"]})
            await db.applications.delete_one({"id": app["id"]})
            await log_activity(app.get("org_id"), None, "gdpr_delete", "application", app["id"], {"status": status})
            deleted += 1
    if deleted:
        logger.info(f"GDPR cleanup removed {deleted} applications")
    return deleted


async def send_lead_task_reminders():
    """Notify admins once about lead tasks due today or overdue."""
    now = datetime.now(timezone.utc)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
    cursor = db.lead_tasks.find({"done": {"$ne": True}, "reminder_sent": {"$ne": True}, "due_at": {"$ne": None, "$lte": today_end}})
    admins = await db.users.find({"role": "admin"}, NO_ID).to_list(50)
    count = 0
    async for t in cursor:
        lead = await db.leads.find_one({"id": t["lead_id"]}, NO_ID)
        lead_name = lead["name"] if lead else "unbekannt"
        for a in admins:
            await notify(a["id"], "lead_task_due", "Aufgabe fällig",
                         f'Aufgabe "{t["title"]}" für Lead "{lead_name}" ist fällig.', "/admin/leads")
        await db.lead_tasks.update_one({"id": t["id"]}, {"$set": {"reminder_sent": True}})
        count += 1
    if count:
        logger.info(f"Sent reminders for {count} lead tasks")
    return count


async def expire_one_time_subscriptions():
    """Deactivate Starter one-time link access once its paid-for window has passed."""
    now = datetime.now(timezone.utc)
    cursor = db.subscriptions.find({"kind": "one_time", "status": "active", "expires_at": {"$lte": now.isoformat()}})
    count = 0
    async for sub in cursor:
        await db.subscriptions.update_one({"_id": sub["_id"]}, {"$set": {"status": "expired"}})
        await db.properties.update_many(
            {"org_id": sub["org_id"], "link_active": True},
            {"$set": {"link_active": False, "link_deactivated_by_payment": True}})
        owner = await db.org_members.find_one({"org_id": sub["org_id"], "role": "owner"}, NO_ID)
        if owner:
            await notify(owner["user_id"], "one_time_link_expired", "Bewerbungslink abgelaufen",
                         "Ihr 90-Tage-Zeitraum ist abgelaufen. Kaufen Sie erneut, um weiter Bewerbungen zu erhalten.",
                         "/objekte")
            user = await db.users.find_one({"id": owner["user_id"]}, NO_ID)
            if user and user.get("email"):
                await send_email(user["email"], "Ihr Bewerbungslink ist abgelaufen",
                                 "Zeitraum abgelaufen",
                                 "<p>Ihr 90-tägiger Zeitraum für den Bewerbungslink ist abgelaufen und "
                                 "die Bewerbungsseite wurde deaktiviert.</p>"
                                 "<p>Suchen Sie noch einen Mieter? Aktivieren Sie den Link einfach erneut.</p>")
        count += 1
    if count:
        logger.info(f"Expired {count} one-time link subscriptions")
    return count


async def run_once():
    r = await send_viewing_reminders()
    d = await run_gdpr_cleanup()
    lt = await send_lead_task_reminders()
    ot = await expire_one_time_subscriptions()
    pi = await dispatch_pending_viewing_invites()
    return {"reminders": r, "deleted_applications": d, "lead_task_reminders": lt,
            "expired_one_time": ot, "pending_invites": pi}


async def maintenance_loop():
    await asyncio.sleep(20)  # let startup settle
    while True:
        try:
            await run_once()
        except Exception as e:
            logger.error(f"Maintenance run failed: {e}")
        await asyncio.sleep(3600)  # hourly
