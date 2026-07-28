import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import db, NO_ID
from security import get_current_user, hash_password
from helpers import new_id, now_iso, log_activity, notify, compute_matching_score, email_user, notify_org_team
from constants import (FORM_FIELDS, STATUS_LABELS, PIPELINE_STATUSES,
                       redact_doc_for_landlord)
from email_templates import render_and_send

router = APIRouter(prefix="/api", tags=["applications"])


def _public_property(prop, org):
    wl = (org or {}).get("white_label", {}) or {}
    wl_on = bool(wl.get("enabled"))
    code = prop["application_code"]
    if wl_on and wl.get("logo"):
        logo_url = f"/api/public/org-logo/{code}"
    elif not wl_on:
        logo_url = (org or {}).get("logo_url")
    else:
        logo_url = None
    branding = {
        "org_name": wl.get("company_name") if wl_on else (org or {}).get("name"),
        "logo_url": logo_url,
        "show_powered_by": not wl_on or wl.get("show_powered_by", True),
        "colors": wl.get("colors") if wl_on else None,
    }
    return {
        "title": prop["title"],
        "area": prop.get("area"), "rooms": prop.get("rooms"),
        "bathrooms": prop.get("bathrooms"), "floor": prop.get("floor"),
        "city": prop.get("city"), "district": prop.get("district"),
        "cold_rent": prop.get("cold_rent"), "extra_costs": prop.get("extra_costs"),
        "warm_rent": prop.get("warm_rent"), "deposit": prop.get("deposit"),
        "balcony": prop.get("balcony"), "cellar": prop.get("cellar"),
        "parking": prop.get("parking"), "features": prop.get("features", []),
        "earliest_move_in": prop.get("earliest_move_in"),
        "description": prop.get("description"),
        "external_listing_url": prop.get("external_listing_url"),
        "document_timing": prop.get("document_timing", "before"),
        "required_documents": prop.get("required_documents", []),
        "form_config": prop.get("form_config", {}),
        "code": prop["application_code"],
        "branding": branding,
    }


@router.get("/public/property/{code}")
async def public_property(code: str):
    prop = await db.properties.find_one({"application_code": code})
    if not prop:
        raise HTTPException(status_code=404, detail="Bewerbungslink ungültig oder deaktiviert")
    if not prop.get("link_active", True):
        if prop.get("link_deactivated_by_payment"):
            raise HTTPException(status_code=423,
                detail="Dieser Bewerbungslink ist vorübergehend pausiert, da der Vermieter eine "
                       "Zahlung aktualisieren muss. Bitte versuchen Sie es später erneut oder wenden "
                       "Sie sich direkt an den Vermieter.")
        raise HTTPException(status_code=404, detail="Bewerbungslink ungültig oder deaktiviert")
    org = await db.organizations.find_one({"id": prop["org_id"]}, NO_ID)
    return {"property": _public_property(prop, org), "fields": FORM_FIELDS}


@router.get("/public/org-logo/{code}")
async def public_org_logo(code: str):
    from fastapi import Response
    from storage import get_object
    prop = await db.properties.find_one({"application_code": code})
    if not prop:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    org = await db.organizations.find_one({"id": prop["org_id"]}, NO_ID)
    wl = (org or {}).get("white_label", {}) or {}
    doc_id = wl.get("logo")
    if not wl.get("enabled") or not doc_id:
        raise HTTPException(status_code=404, detail="Kein Logo")
    rec = await db.documents.find_one({"id": doc_id, "is_deleted": False}, NO_ID)
    if not rec:
        raise HTTPException(status_code=404, detail="Kein Logo")
    data, content_type = get_object(rec["storage_path"])
    return Response(content=data, media_type=rec.get("content_type", content_type))


class ApplyRequest(BaseModel):
    code: str
    email: str
    form_data: Dict[str, Any]
    consent: bool = False
    origin_url: Optional[str] = None


@router.post("/public/apply")
async def submit_application(req: ApplyRequest):
    if not req.consent:
        raise HTTPException(status_code=400, detail="Bitte stimmen Sie der Datenverarbeitung zu")
    prop = await db.properties.find_one({"application_code": req.code})
    if not prop:
        raise HTTPException(status_code=404, detail="Bewerbungslink ungültig")
    if not prop.get("link_active", True):
        if prop.get("link_deactivated_by_payment"):
            raise HTTPException(status_code=423,
                detail="Dieser Bewerbungslink ist vorübergehend pausiert, da der Vermieter eine "
                       "Zahlung aktualisieren muss. Bitte versuchen Sie es später erneut.")
        raise HTTPException(status_code=404, detail="Bewerbungslink ungültig")
    cfg = prop.get("form_config") or {}
    missing = [f["key"] for f in FORM_FIELDS
              if cfg.get(f["key"]) == "required" and f["key"] != "email"
              and not str(req.form_data.get(f["key"], "")).strip()]
    if missing:
        raise HTTPException(status_code=400,
            detail=f"Bitte füllen Sie alle Pflichtfelder aus (fehlend: {', '.join(missing)})")

    email = req.email.lower().strip()
    existing_app = await db.applications.find_one({"property_id": prop["id"], "applicant_email": email}, NO_ID)
    if existing_app:
        return {"application_id": existing_app["id"], "already_applied": True}
    # find or create applicant account
    user = await db.users.find_one({"email": email})
    activation_link = None
    if not user:
        user_id = new_id()
        fd = req.form_data
        user = {
            "id": user_id, "email": email, "password_hash": None,
            "name": f"{fd.get('vorname','')} {fd.get('nachname','')}".strip() or email,
            "first_name": fd.get("vorname", ""), "last_name": fd.get("nachname", ""),
            "phone": fd.get("telefon"), "picture": None, "role": "applicant",
            "org_id": None, "is_active": False, "is_blocked": False, "premium": False,
            "auth_provider": "password", "created_at": now_iso(),
        }
        await db.users.insert_one(user)
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "id": new_id(), "user_id": user_id, "token": token, "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        })
        activation_link = token
    app_id = new_id()
    application = {
        "id": app_id, "property_id": prop["id"], "org_id": prop["org_id"],
        "applicant_user_id": user["id"], "applicant_email": email,
        "form_data": req.form_data, "status": "neu", "stars": 0, "tags": [],
        "internal_notes": "", "consent": True, "created_at": now_iso(),
    }
    await db.applications.insert_one(application)
    await log_activity(prop["org_id"], user["id"], "apply", "application", app_id, {"property": prop["title"]})
    # notify landlord
    await notify(prop.get("created_by"), "new_application", "Neue Bewerbung",
                 f"Neue Bewerbung für „{prop['title']}“", f"/objekte/{prop['id']}")
    await email_user(prop.get("created_by"), "Neue Bewerbung eingegangen", "Neue Bewerbung",
                     f"<p>Für Ihr Objekt <b>{prop['title']}</b> ist eine neue Bewerbung eingegangen.</p>"
                     f"<p>Öffnen Sie Ihr MietGate-Dashboard, um die Bewerbung zu prüfen.</p>",
                     category="applications")
    # emails
    if activation_link:
        origin = (req.origin_url or "").rstrip("/")
        link = f"{origin}/aktivieren?token={activation_link}" if origin else "#"
        activation_block = (
            "<p>Wir haben für Sie ein MietGate-Konto angelegt. Aktivieren Sie es und "
            "vergeben Sie ein Passwort:</p>"
            f"<p><a href='{link}' style='background:#0a2540;color:#fff;padding:10px 18px;"
            f"border-radius:6px;text-decoration:none;display:inline-block'>Konto aktivieren</a></p>"
            f"<p style='color:#94a3b8;font-size:12px'>Oder Link kopieren: {link}</p>"
        )
    else:
        activation_block = "<p>Sie können den Status in Ihrem MietGate-Konto verfolgen.</p>"
    # Applicants who never activate their account only ever see this email, so the
    # Premium pitch has to live here rather than only in the dashboard.
    premium_block = (
        "<div style='margin-top:24px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#fffbeb'>"
        "<p style='margin:0 0 8px;font-weight:bold;color:#0a2540'>Mehr Chancen auf Ihre Wunschwohnung</p>"
        "<p style='margin:0 0 12px;font-size:14px;color:#334155'>Mit MietGate Premium (4,99 €/Monat) wird Ihr "
        "Profil Vermietern bevorzugt angezeigt, Sie erhalten ein verifiziertes Bewerber-Badge und teilen "
        "Ihre Unterlagen mit einem einzigen Link.</p>"
        "</div>"
    ) if activation_link else ""
    await render_and_send("application_received", email, prop["org_id"],
                          {"property_title": prop["title"], "activation_block": activation_block,
                           "premium_block": premium_block})
    return {"ok": True, "application_id": app_id, "activation_token": activation_link,
            "account_created": activation_link is not None}


async def _enrich(app, prop=None, doc_count=None):
    prop = prop or await db.properties.find_one({"id": app["property_id"]}, NO_ID)
    if doc_count is None:
        doc_count = await db.documents.count_documents(
            {"application_id": app["id"], "is_deleted": False})
    app["document_count"] = doc_count
    app["matching_score"] = compute_matching_score(app, prop or {})
    app["property_title"] = (prop or {}).get("title")
    return app


@router.get("/applications")
async def list_applications(property_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    if not user.get("org_id"):
        raise HTTPException(status_code=403, detail="Keine Organisation")
    q = {"org_id": user["org_id"]}
    if property_id:
        q["property_id"] = property_id
    apps = await db.applications.find(q, NO_ID).sort("created_at", -1).to_list(1000)
    prop_cache = {}
    # One aggregation for all document counts instead of a count_documents() call per
    # application — with hundreds of applications that was hundreds of sequential
    # round-trips just to render a badge.
    app_ids = [a["id"] for a in apps]
    doc_counts = {}
    if app_ids:
        async for row in db.documents.aggregate([
            {"$match": {"application_id": {"$in": app_ids}, "is_deleted": False}},
            {"$group": {"_id": "$application_id", "n": {"$sum": 1}}},
        ]):
            doc_counts[row["_id"]] = row["n"]
    for a in apps:
        pid = a["property_id"]
        if pid not in prop_cache:
            prop_cache[pid] = await db.properties.find_one({"id": pid}, NO_ID)
        await _enrich(a, prop_cache[pid], doc_counts.get(a["id"], 0))
    return apps


@router.get("/applications/{app_id}")
async def get_application(app_id: str, user: dict = Depends(get_current_user)):
    app = await db.applications.find_one({"id": app_id}, NO_ID)
    if not app or app["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    await _enrich(app)
    docs = await db.documents.find({"application_id": app_id, "is_deleted": False}, NO_ID).to_list(100)
    # Bonity/ID documents stay withheld until the application reaches the stage where the
    # landlord may lawfully see them — see constants.DOC_RELEASE_STAGE.
    app["documents"] = [redact_doc_for_landlord(d, app.get("status", "neu")) for d in docs]
    return app


class StatusUpdate(BaseModel):
    status: str


@router.patch("/applications/{app_id}/status")
async def update_status(app_id: str, body: StatusUpdate, user: dict = Depends(get_current_user)):
    if body.status not in PIPELINE_STATUSES:
        raise HTTPException(status_code=400, detail="Ungültiger Status")
    app = await db.applications.find_one({"id": app_id})
    if not app or app["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    await db.applications.update_one({"id": app_id}, {"$set": {"status": body.status}})
    await log_activity(app["org_id"], user["id"], "status_change", "application", app_id, {"status": body.status})
    status_label = STATUS_LABELS.get(body.status, body.status)
    await notify(app["applicant_user_id"], "status_change", "Statusänderung",
                 f"Ihre Bewerbung hat den Status: {status_label}", "/bewerber")
    prop = await db.properties.find_one({"id": app["property_id"]}, NO_ID)
    ptitle = (prop or {}).get("title", "Ihre Bewerbung")
    await email_user(app["applicant_user_id"], "Statusänderung Ihrer Bewerbung",
                     "Es gibt ein Update zu Ihrer Bewerbung",
                     f"<p>Der Status Ihrer Bewerbung für <b>{ptitle}</b> wurde aktualisiert:</p>"
                     f"<p style='font-size:17px;font-weight:700;color:#0a2540'>{status_label}</p>"
                     f"<p>Details finden Sie in Ihrem MietGate-Konto.</p>",
                     category="applications")
    return {"ok": True, "status": body.status}


class AppMeta(BaseModel):
    stars: Optional[int] = None
    tags: Optional[List[str]] = None
    internal_notes: Optional[str] = None


@router.patch("/applications/{app_id}")
async def update_app_meta(app_id: str, body: AppMeta, user: dict = Depends(get_current_user)):
    app = await db.applications.find_one({"id": app_id})
    if not app or app["org_id"] != user.get("org_id"):
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.applications.update_one({"id": app_id}, {"$set": upd})
    return {"ok": True}


@router.get("/my/applications")
async def my_applications(user: dict = Depends(get_current_user)):
    apps = await db.applications.find({"applicant_user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(200)
    for a in apps:
        prop = await db.properties.find_one({"id": a["property_id"]}, NO_ID)
        a["property_title"] = (prop or {}).get("title")
        a["status_label"] = STATUS_LABELS.get(a["status"], a["status"])
        # The applicant needs to know which documents this landlord made mandatory —
        # anything else may be deferred ("später hochladen").
        a["required_documents"] = (prop or {}).get("required_documents", [])
        a["document_timing"] = (prop or {}).get("document_timing", "after")
        a["document_count"] = await db.documents.count_documents({"application_id": a["id"], "is_deleted": False})
    return apps


@router.post("/my/applications/{app_id}/withdraw")
async def withdraw_application(app_id: str, user: dict = Depends(get_current_user)):
    """Applicant pulls out of a running application (e.g. found a flat elsewhere)."""
    app = await db.applications.find_one({"id": app_id})
    if not app or app["applicant_user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    if app["status"] == "zurueckgezogen":
        return {"ok": True, "status": "zurueckgezogen"}

    await db.applications.update_one({"id": app_id}, {"$set": {
        "status": "zurueckgezogen", "withdrawn_at": now_iso()}})

    # Give up any viewing slot still held, otherwise it stays blocked for everyone else.
    async for v in db.viewings.find({"participants.application_id": app_id, "cancelled": {"$ne": True}}):
        parts, slots = v.get("participants", []), v.get("slots", [])
        for p in parts:
            if p.get("application_id") == app_id:
                p["status"] = "declined"
                p["slot"] = None
        for s in slots:
            if s.get("application_id") == app_id:
                s["application_id"] = None
        await db.viewings.update_one({"id": v["id"]}, {"$set": {"participants": parts, "slots": slots}})

    prop = await db.properties.find_one({"id": app["property_id"]}, NO_ID)
    ptitle = (prop or {}).get("title", "Ihr Objekt")
    name = user.get("name") or app.get("applicant_email")
    await notify_org_team(app["org_id"], "application_withdrawn", "Bewerbung zurückgezogen",
                          f"{name} hat die Bewerbung für „{ptitle}“ zurückgezogen.",
                          f"/objekte/{app['property_id']}",
                          email_subject="Bewerbung zurückgezogen",
                          email_title="Ein Bewerber hat sich zurückgezogen",
                          email_body_html=f"<p><b>{name}</b> hat die Bewerbung für <b>{ptitle}</b> zurückgezogen.</p>",
                          category="applications")
    await log_activity(app["org_id"], user["id"], "withdraw", "application", app_id)
    return {"ok": True, "status": "zurueckgezogen"}
