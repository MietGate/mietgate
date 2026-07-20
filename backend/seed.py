import os
import uuid
import logging
from datetime import datetime, timezone
from database import db
from security import hash_password, verify_password

logger = logging.getLogger(__name__)

DEFAULT_PLANS = [
    {
        "id": str(uuid.uuid4()), "key": "starter", "name": "Starter",
        "price_monthly": 14.99, "price_yearly": 143.90,
        "max_properties": 1, "sort_order": 1, "is_active": True,
        "features": ["1 aktives Objekt", "Bewerbungslink", "Bewerberpipeline", "Dokumentenmanagement", "Besichtigungen", "E-Mail-Benachrichtigungen"],
        "monthly_lookup": "starter_monthly", "yearly_lookup": "starter_yearly", "supports_team": False,
    },
    {
        "id": str(uuid.uuid4()), "key": "plus", "name": "Plus",
        "price_monthly": 29.99, "price_yearly": 269.90,
        "max_properties": 5, "sort_order": 2, "is_active": True,
        "features": ["5 aktive Objekte", "Alle Starter-Funktionen", "Matching Score", "Slot- & Massenbesichtigungen", "Formular-Builder", "Prioritäts-Support"],
        "monthly_lookup": "plus_monthly", "yearly_lookup": "plus_yearly", "highlight": True, "supports_team": False,
    },
    {
        "id": str(uuid.uuid4()), "key": "makler", "name": "Makler / Hausverwaltung",
        "price_monthly": 99.0, "price_yearly": 891.0,
        "max_properties": 20, "sort_order": 3, "is_active": True,
        "features": ["20 aktive Objekte", "Alle Plus-Funktionen", "Team & Rollen", "Organisationsverwaltung", "Objekte teilen", "White-Label optional"],
        "monthly_lookup": "makler_monthly", "yearly_lookup": "makler_yearly", "supports_team": True,
    },
    {
        "id": str(uuid.uuid4()), "key": "whitelabel", "name": "White-Label Add-on",
        "price_monthly": 79.0, "price_yearly": 758.0,
        "max_properties": 0, "sort_order": 4, "is_active": True, "is_addon": True,
        "features": ["Eigenes Logo & Farben", "Eigener Firmenname", "\"Powered by MietGate\" deaktivierbar", "Eigene Domain (Vorbereitung)"],
        "monthly_lookup": "whitelabel_monthly", "yearly_lookup": "whitelabel_yearly",
    },
]


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@mietgate.de")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrator", "first_name": "System", "last_name": "Admin",
            "role": "admin", "org_id": None, "is_active": True, "is_blocked": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


async def seed_plans():
    for plan in DEFAULT_PLANS:
        existing = await db.plans.find_one({"key": plan["key"]})
        if existing is None:
            await db.plans.insert_one(plan)
        else:
            # keep prices/limits as-is (admin may have changed them), but ensure feature flags exist
            await db.plans.update_one({"key": plan["key"]}, {"$set": {
                "supports_team": plan.get("supports_team", False),
                "is_addon": plan.get("is_addon", False),
            }})


DEFAULT_PARTNERS = {
    "key": "partners",
    "schufa_url": "https://www.meineschufa.de/de/bonitaetscheck",
    "schufa_text": "Eine aktuelle Bonitätsauskunft kann Ihre Bewerbung unterstützen.",
    "offers": [
        {"category": "Strom", "name": "Stromvertrag vergleichen", "url": "https://www.verivox.de/strom/", "description": "Günstigen Stromtarif für Ihr neues Zuhause finden."},
        {"category": "Internet", "name": "Internet & DSL", "url": "https://www.verivox.de/dsl/", "description": "Schnelles Internet zum Einzug sichern."},
        {"category": "Umzug", "name": "Umzugsunternehmen", "url": "https://www.movinga.de/", "description": "Umzugshelfer und Transporter buchen."},
        {"category": "Reinigung", "name": "Reinigungsservice", "url": "https://www.helpling.de/", "description": "Endreinigung der alten Wohnung organisieren."},
        {"category": "Versicherung", "name": "Hausratversicherung", "url": "https://www.check24.de/hausratversicherung/", "description": "Ihr Hab und Gut im neuen Zuhause absichern."},
    ],
}


async def seed_partners():
    existing = await db.settings.find_one({"key": "partners"})
    if existing is None:
        await db.settings.insert_one(dict(DEFAULT_PARTNERS))


async def seed_all():
    await seed_admin()
    await seed_plans()
    await seed_partners()
    logger.info("Seed complete")
