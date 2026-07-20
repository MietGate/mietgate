import uuid
from datetime import datetime, timezone
from database import db, NO_ID


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


async def log_activity(org_id, user_id, action, entity, entity_id, meta=None):
    await db.activities.insert_one({
        "id": new_id(), "org_id": org_id, "user_id": user_id,
        "action": action, "entity": entity, "entity_id": entity_id,
        "meta": meta or {}, "created_at": now_iso(),
    })


async def notify(user_id, ntype, title, body, link=None):
    if not user_id:
        return
    await db.notifications.insert_one({
        "id": new_id(), "user_id": user_id, "type": ntype,
        "title": title, "body": body, "link": link,
        "read": False, "created_at": now_iso(),
    })


async def get_user_org(user):
    """Returns the organization dict a user belongs to (owner or member)."""
    if user.get("org_id"):
        return await db.organizations.find_one({"id": user["org_id"]}, NO_ID)
    return None


async def active_property_count(org_id):
    return await db.properties.count_documents({"org_id": org_id, "status": "active"})


async def get_plan_limit(org_id):
    sub = await db.subscriptions.find_one({"org_id": org_id, "status": "active"}, NO_ID)
    if not sub:
        return 1  # free/no-sub fallback: allow 1 property to try the product
    plan = await db.plans.find_one({"key": sub["plan_key"]}, NO_ID)
    return plan["max_properties"] if plan else 1


INCOME_BUCKETS = {
    "unter_1000": 800, "1000_2000": 1500, "2000_3000": 2500, "3000_plus": 4000,
}


def compute_matching_score(application, prop):
    """Non-discriminatory decision aid. 0-100."""
    score = 0
    weights_total = 0
    fd = application.get("form_data", {})

    # 1. Income vs warm rent (3x rule) — weight 40
    weights_total += 40
    warm = prop.get("warm_rent") or prop.get("cold_rent") or 0
    income_raw = fd.get("nettoeinkommen")
    income = None
    if isinstance(income_raw, (int, float)):
        income = income_raw
    elif isinstance(income_raw, str):
        income = INCOME_BUCKETS.get(income_raw)
        if income is None:
            try:
                income = float(income_raw.replace("€", "").replace(".", "").replace(",", ".").strip())
            except Exception:
                income = None
    if income and warm:
        ratio = income / warm
        if ratio >= 3:
            score += 40
        elif ratio >= 2.5:
            score += 32
        elif ratio >= 2:
            score += 22
        else:
            score += 10
    elif income:
        score += 20

    # 2. Household size vs rooms — weight 20
    weights_total += 20
    rooms = prop.get("rooms")
    persons = fd.get("anzahl_personen")
    try:
        persons = int(persons) if persons else None
    except Exception:
        persons = None
    if rooms and persons:
        if persons <= rooms:
            score += 20
        elif persons <= rooms + 1:
            score += 12
        else:
            score += 4
    else:
        score += 10

    # 3. Move-in match — weight 15
    weights_total += 15
    if fd.get("einzugstermin") or fd.get("gewuenschter_einzugstermin"):
        score += 15
    else:
        score += 6

    # 4. Document completeness — weight 25
    weights_total += 25
    doc_count = application.get("_doc_count", 0)
    if doc_count >= 3:
        score += 25
    elif doc_count == 2:
        score += 18
    elif doc_count == 1:
        score += 10

    return round(score * 100 / weights_total) if weights_total else 0
