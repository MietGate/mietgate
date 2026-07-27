import os
import secrets
import requests
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from database import db, NO_ID
from security import (hash_password, verify_password, create_access_token, get_current_user, revoke_token)
from helpers import new_id, now_iso, log_activity
from email_service import send_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
MAX_ATTEMPTS = 5
LOCKOUT_MIN = 15
# Global per-email login lockout (in addition to the per-IP:email one below), so an attacker
# rotating IPs can't brute-force a single account indefinitely.
EMAIL_MAX_ATTEMPTS = 20
EMAIL_LOCKOUT_MIN = 30


async def _hit_rate_limit(key: str, max_attempts: int, window_minutes: int) -> bool:
    """Simple fixed-window rate limiter backed by a TTL-indexed collection. Returns True if
    the caller has exceeded max_attempts within the window and should be blocked."""
    now = datetime.now(timezone.utc)
    rec = await db.rate_limits.find_one({"key": key})
    window_start = rec.get("window_start") if rec else None
    if isinstance(window_start, str):
        window_start = datetime.fromisoformat(window_start)
    if window_start and window_start.tzinfo is None:
        window_start = window_start.replace(tzinfo=timezone.utc)
    if not rec or not window_start or now - window_start > timedelta(minutes=window_minutes):
        await db.rate_limits.update_one(
            {"key": key},
            {"$set": {"key": key, "count": 1, "window_start": now,
                      "expires_at": now + timedelta(minutes=window_minutes)}},
            upsert=True)
        return False
    if rec.get("count", 0) >= max_attempts:
        return True
    await db.rate_limits.update_one({"key": key}, {"$inc": {"count": 1}})
    return False

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: str
    role: str = "landlord"  # landlord | applicant
    phone: str = Field(min_length=6)
    org_name: Optional[str] = None
    org_type: Optional[str] = "private"  # private | makler | hausverwaltung
    origin_url: Optional[str] = None
    agreed_terms: bool = False
    signup_source: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    origin_url: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RequestLoginCodeRequest(BaseModel):
    email: EmailStr


class VerifyLoginCodeRequest(BaseModel):
    email: EmailStr
    code: str


OTP_TTL_MIN = 10


class ForgotRequest(BaseModel):
    email: EmailStr
    origin_url: Optional[str] = None


class ResetRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


def _public_user(u: dict):
    u = dict(u)
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


async def _create_org_for_user(user_id, org_name, org_type, owner_name):
    org_id = new_id()
    await db.organizations.insert_one({
        "id": org_id, "name": org_name, "type": org_type or "private",
        "owner_id": user_id, "logo_url": None, "description": None,
        "address": None, "contact": None, "invoice_data": None,
        "white_label": {"enabled": False, "logo": None, "colors": None,
                        "company_name": None, "show_powered_by": True},
        "created_at": now_iso(),
    })
    await db.org_members.insert_one({
        "id": new_id(), "org_id": org_id, "user_id": user_id,
        "role": "owner", "created_at": now_iso(),
    })
    return org_id


async def _send_verification_email(user_id, email, name, origin_url):
    token = secrets.token_urlsafe(32)
    await db.email_verification_tokens.insert_one({
        "id": new_id(), "user_id": user_id, "token": token, "used": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
    })
    o = (origin_url or "").rstrip("/")
    link = f"{o}/email-bestaetigen?token={token}" if o else "#"
    await send_email(email, "Bitte bestätigen Sie Ihre E-Mail", "E-Mail-Adresse bestätigen",
                     f"<p>Willkommen bei MietGate{(', ' + name) if name else ''}!</p>"
                     f"<p>Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren "
                     f"(Link gültig 24 Stunden):</p>"
                     f"<p><a href='{link}' style='background:#0a2540;color:#fff;padding:10px 18px;"
                     f"border-radius:6px;text-decoration:none;display:inline-block'>E-Mail bestätigen</a></p>"
                     f"<p style='color:#94a3b8;font-size:12px'>Oder Link kopieren: {link}</p>")
    print(f"[EMAIL VERIFY] {email}: verify token = {token}")


@router.post("/register")
async def register(req: RegisterRequest, request: Request):
    if not req.agreed_terms:
        raise HTTPException(status_code=400, detail="Bitte akzeptieren Sie die AGB und Datenschutzerklärung.")
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="E-Mail ist bereits registriert")
    user_id = new_id()
    role = "applicant" if req.role == "applicant" else "landlord"
    org_id = None
    pending_invite = None
    if role == "landlord":
        pending_invite = await db.org_invites.find_one({"email": email, "used": False})
        if pending_invite:
            org_id = pending_invite["org_id"]
        else:
            org_name = req.org_name or f"{req.first_name} {req.last_name}"
            org_id = await _create_org_for_user(user_id, org_name, req.org_type, org_name)
    doc = {
        "id": user_id, "email": email, "password_hash": hash_password(req.password),
        "name": f"{req.first_name} {req.last_name}", "first_name": req.first_name,
        "last_name": req.last_name, "phone": req.phone, "picture": None,
        "role": role, "org_id": org_id, "is_active": False, "is_blocked": False,
        "premium": False, "auth_provider": "password", "agreed_terms_at": now_iso(),
        "agreed_terms_ip": request.client.host if request.client else None,
        "agreed_terms_source": "register_form",
        "signup_source": (req.signup_source or "").strip()[:40] or None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    if pending_invite:
        await db.org_members.insert_one({
            "id": new_id(), "org_id": org_id, "user_id": user_id,
            "role": pending_invite["role"], "created_at": now_iso(),
        })
        await db.org_invites.update_one({"id": pending_invite["id"]}, {"$set": {"used": True}})
    await log_activity(org_id, user_id, "register", "user", user_id)
    await _send_verification_email(user_id, email, doc["name"], req.origin_url)
    if role == "landlord":
        await _notify_admin_new_landlord(doc)
    return {"ok": True, "requires_verification": True, "email": email}


async def _notify_admin_new_landlord(user_doc: dict):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@mietgate.de")
    await send_email(admin_email, "Neuer Vermieter registriert", "Neue Registrierung",
                     f"<p>Ein neuer Vermieter hat sich registriert:</p>"
                     f"<ul>"
                     f"<li><b>Name:</b> {user_doc['name']}</li>"
                     f"<li><b>E-Mail:</b> {user_doc['email']}</li>"
                     f"<li><b>Telefon:</b> {user_doc.get('phone') or '—'}</li>"
                     f"</ul>")


@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest):
    rec = await db.email_verification_tokens.find_one({"token": req.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Bestätigungslink ungültig oder bereits verwendet")
    expires = rec["expires_at"]
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Bestätigungslink abgelaufen. Bitte fordern Sie einen neuen an.")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"is_active": True}})
    await db.email_verification_tokens.update_one({"token": req.token}, {"$set": {"used": True}})
    user = await db.users.find_one({"id": rec["user_id"]}, NO_ID)
    user.pop("password_hash", None)
    token = create_access_token(user["id"], user["email"])
    return {"ok": True, "token": token, "user": user}


@router.post("/resend-verification")
async def resend_verification(req: ResendVerificationRequest):
    email = req.email.lower().strip()
    if await _hit_rate_limit(f"resend-verification:{email}", max_attempts=3, window_minutes=60):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte später erneut versuchen.")
    user = await db.users.find_one({"email": email})
    if user and user.get("auth_provider") == "password" and not user.get("is_active", True):
        await _send_verification_email(user["id"], user["email"], user.get("name"), req.origin_url)
    return {"ok": True, "message": "Falls ein unbestätigtes Konto existiert, wurde die Bestätigungs-E-Mail erneut versendet."}


@router.post("/login")
async def login(req: LoginRequest, request: Request):
    email = req.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    email_identifier = f"email:{email}"

    def _locked(attempt, max_attempts):
        if not attempt or attempt.get("count", 0) < max_attempts:
            return False
        locked_until = attempt.get("locked_until")
        if not locked_until:
            return False
        lu = datetime.fromisoformat(locked_until) if isinstance(locked_until, str) else locked_until
        if lu.tzinfo is None:
            lu = lu.replace(tzinfo=timezone.utc)
        return lu > datetime.now(timezone.utc)

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    email_attempt = await db.login_attempts.find_one({"identifier": email_identifier})
    if _locked(attempt, MAX_ATTEMPTS) or _locked(email_attempt, EMAIL_MAX_ATTEMPTS):
        raise HTTPException(status_code=429, detail="Zu viele Versuche. Bitte später erneut versuchen.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        new_count = (attempt.get("count", 0) if attempt else 0) + 1
        upd = {"count": new_count, "expires_at": datetime.now(timezone.utc) + timedelta(hours=24)}
        if new_count >= MAX_ATTEMPTS:
            upd["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MIN)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": upd}, upsert=True)

        new_email_count = (email_attempt.get("count", 0) if email_attempt else 0) + 1
        email_upd = {"count": new_email_count, "expires_at": datetime.now(timezone.utc) + timedelta(hours=24)}
        if new_email_count >= EMAIL_MAX_ATTEMPTS:
            email_upd["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=EMAIL_LOCKOUT_MIN)).isoformat()
        await db.login_attempts.update_one({"identifier": email_identifier}, {"$set": email_upd}, upsert=True)
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort ungültig")
    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Konto gesperrt")
    if user.get("auth_provider") == "password" and not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Prüfen Sie Ihren Posteingang.")
    await db.login_attempts.delete_one({"identifier": identifier})
    await db.login_attempts.delete_one({"identifier": email_identifier})
    await log_activity(user.get("org_id"), user["id"], "login", "user", user["id"])
    token = create_access_token(user["id"], email)
    return {"token": token, "user": _public_user(user)}


@router.post("/login/request-code")
async def request_login_code(req: RequestLoginCodeRequest, request: Request):
    """Fallback login path for when the password-lockout above is triggered (e.g. a few
    mistyped passwords). Sends a one-time code to the account's own email; entering it
    correctly proves inbox ownership and logs the user in without the password, clearing
    the lockout in the process."""
    email = req.email.lower().strip()
    if await _hit_rate_limit(f"login-code:{email}", max_attempts=3, window_minutes=15):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte später erneut versuchen.")
    user = await db.users.find_one({"email": email}, NO_ID)
    if user and not user.get("is_blocked"):
        code = f"{secrets.randbelow(1000000):06d}"
        await db.login_otps.update_one(
            {"email": email},
            {"$set": {
                "email": email, "code": code, "used": False,
                "created_at": now_iso(),
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MIN),
            }}, upsert=True)
        await send_email(email, "Ihr Anmeldecode – MietGate", "Ihr Anmeldecode",
                          f"<p>Ihr Code lautet: <strong style=\"font-size:22px;letter-spacing:3px;\">{code}</strong></p>"
                          f"<p>Er ist {OTP_TTL_MIN} Minuten gültig. Falls Sie diesen Code nicht angefordert haben, "
                          f"ignorieren Sie diese E-Mail.</p>")
    return {"ok": True, "message": "Falls ein Konto mit dieser E-Mail existiert, wurde ein Code versendet."}


@router.post("/login/verify-code")
async def verify_login_code(req: VerifyLoginCodeRequest, request: Request):
    email = req.email.lower().strip()
    code = req.code.strip()
    if await _hit_rate_limit(f"login-code-verify:{email}", max_attempts=8, window_minutes=15):
        raise HTTPException(status_code=429, detail="Zu viele Versuche. Bitte fordern Sie einen neuen Code an.")
    otp = await db.login_otps.find_one({"email": email})
    if not otp or otp.get("used") or otp.get("code") != code:
        raise HTTPException(status_code=401, detail="Code ungültig oder abgelaufen")
    expires_at = otp["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Code ungültig oder abgelaufen")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Code ungültig oder abgelaufen")
    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Konto gesperrt")
    if user.get("auth_provider") == "password" and not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Prüfen Sie Ihren Posteingang.")

    await db.login_otps.update_one({"email": email}, {"$set": {"used": True}})
    ip = request.client.host if request.client else "unknown"
    await db.login_attempts.delete_one({"identifier": f"{ip}:{email}"})
    await db.login_attempts.delete_one({"identifier": f"email:{email}"})
    await log_activity(user.get("org_id"), user["id"], "login_via_code", "user", user["id"])
    token = create_access_token(user["id"], email)
    return {"token": token, "user": _public_user(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _public_user(user)


@router.post("/logout")
async def logout(request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    await db.user_sessions.delete_one({"session_token": token})
    await revoke_token(token)
    return {"ok": True}


@router.get("/google/login")
async def google_login(request: Request, role: str = "landlord", agreed_terms: bool = False):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google-Login ist nicht konfiguriert")
    state = secrets.token_urlsafe(24)
    await db.oauth_states.insert_one({
        "id": state, "role": "applicant" if role == "applicant" else "landlord",
        "agreed_terms": agreed_terms,
        "agreed_terms_ip": request.client.host if request.client else None,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
    })
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    query = "&".join(f"{k}={requests.utils.quote(v)}" for k, v in params.items())
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")


@router.get("/google/callback")
async def google_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    if error or not code or not state:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_auth_failed")
    state_doc = await db.oauth_states.find_one({"id": state})
    if not state_doc:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_auth_failed")
    await db.oauth_states.delete_one({"id": state})
    role = state_doc.get("role", "landlord")
    agreed_terms = state_doc.get("agreed_terms", False)
    agreed_terms_ip = state_doc.get("agreed_terms_ip")

    token_resp = requests.post("https://oauth2.googleapis.com/token", data={
        "code": code, "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI, "grant_type": "authorization_code",
    }, timeout=30)
    if token_resp.status_code != 200:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_auth_failed")
    access_token = token_resp.json().get("access_token")

    info_resp = requests.get("https://www.googleapis.com/oauth2/v3/userinfo",
                             headers={"Authorization": f"Bearer {access_token}"}, timeout=30)
    if info_resp.status_code != 200:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_auth_failed")
    data = info_resp.json()

    email = data["email"].lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        if not agreed_terms:
            return RedirectResponse(f"{FRONTEND_URL}/registrieren?error=terms_required")
        user_id = new_id()
        first = data.get("given_name") or ""
        last = data.get("family_name") or ""
        name = data.get("name") or f"{first} {last}".strip() or email
        org_id = None
        if role == "landlord":
            org_id = await _create_org_for_user(user_id, name, "private", name)
        user = {
            "id": user_id, "email": email, "name": name,
            "first_name": first, "last_name": last, "phone": None,
            "picture": data.get("picture"), "role": role, "org_id": org_id,
            "is_active": True, "is_blocked": False, "premium": False,
            "auth_provider": "google", "agreed_terms_at": now_iso(),
            "agreed_terms_ip": agreed_terms_ip, "agreed_terms_source": "google_oauth",
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)
        if role == "landlord":
            await _notify_admin_new_landlord(user)

    await log_activity(user.get("org_id"), user["id"], "login", "user", user["id"])
    jwt_token = create_access_token(user["id"], user["email"])
    return RedirectResponse(f"{FRONTEND_URL}/#token={jwt_token}")


@router.post("/forgot-password")
async def forgot_password(req: ForgotRequest):
    email_key = req.email.lower().strip()
    if await _hit_rate_limit(f"forgot-password:{email_key}", max_attempts=3, window_minutes=60):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte später erneut versuchen.")
    user = await db.users.find_one({"email": email_key})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "id": new_id(), "user_id": user["id"], "token": token, "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        })
        origin = (req.origin_url or "").rstrip("/")
        link = f"{origin}/passwort-zuruecksetzen?token={token}" if origin else "#"
        await send_email(req.email, "Passwort zurücksetzen", "Passwort zurücksetzen",
                         f"<p>Sie haben ein neues Passwort angefordert. Klicken Sie auf den Button, "
                         f"um ein neues Passwort zu vergeben (gültig 1 Stunde):</p>"
                         f"<p><a href='{link}' style='background:#0a2540;color:#fff;padding:10px 18px;"
                         f"border-radius:6px;text-decoration:none;display:inline-block'>Passwort zurücksetzen</a></p>"
                         f"<p style='color:#94a3b8;font-size:12px'>Oder Link kopieren: {link}</p>")
        print(f"[PASSWORD RESET] {req.email}: reset token = {token}")
    return {"ok": True, "message": "Falls die E-Mail existiert, wurde ein Link versendet."}


@router.post("/reset-password")
async def reset_password(req: ResetRequest):
    rec = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Token ungültig oder abgelaufen")
    expires = rec["expires_at"]
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token abgelaufen")
    await db.users.update_one({"id": rec["user_id"]},
                              {"$set": {"password_hash": hash_password(req.password), "is_active": True}})
    await db.password_reset_tokens.update_one({"token": req.token}, {"$set": {"used": True}})
    user = await db.users.find_one({"id": rec["user_id"]}, NO_ID)
    user.pop("password_hash", None)
    token = create_access_token(user["id"], user["email"])
    return {"ok": True, "token": token, "user": user}
