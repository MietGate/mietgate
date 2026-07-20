import os
import secrets
import requests
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import db, NO_ID
from security import (hash_password, verify_password, create_access_token, get_current_user)
from helpers import new_id, now_iso, log_activity

router = APIRouter(prefix="/api/auth", tags=["auth"])
MAX_ATTEMPTS = 5
LOCKOUT_MIN = 15


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "landlord"  # landlord | applicant
    phone: Optional[str] = None
    org_name: Optional[str] = None
    org_type: Optional[str] = "private"  # private | makler | hausverwaltung


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotRequest(BaseModel):
    email: EmailStr


class ResetRequest(BaseModel):
    token: str
    password: str


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


@router.post("/register")
async def register(req: RegisterRequest):
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="E-Mail ist bereits registriert")
    user_id = new_id()
    role = "applicant" if req.role == "applicant" else "landlord"
    org_id = None
    if role == "landlord":
        org_name = req.org_name or f"{req.first_name} {req.last_name}"
        org_id = await _create_org_for_user(user_id, org_name, req.org_type, org_name)
    doc = {
        "id": user_id, "email": email, "password_hash": hash_password(req.password),
        "name": f"{req.first_name} {req.last_name}", "first_name": req.first_name,
        "last_name": req.last_name, "phone": req.phone, "picture": None,
        "role": role, "org_id": org_id, "is_active": True, "is_blocked": False,
        "premium": False, "auth_provider": "password", "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await log_activity(org_id, user_id, "register", "user", user_id)
    token = create_access_token(user_id, email)
    return {"token": token, "user": _public_user({k: v for k, v in doc.items() if k != "password_hash"})}


@router.post("/login")
async def login(req: LoginRequest, request: Request):
    email = req.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= MAX_ATTEMPTS:
        locked_until = attempt.get("locked_until")
        if locked_until:
            lu = datetime.fromisoformat(locked_until) if isinstance(locked_until, str) else locked_until
            if lu.tzinfo is None:
                lu = lu.replace(tzinfo=timezone.utc)
            if lu > datetime.now(timezone.utc):
                raise HTTPException(status_code=429, detail="Zu viele Versuche. Bitte später erneut versuchen.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        new_count = (attempt.get("count", 0) if attempt else 0) + 1
        upd = {"count": new_count}
        if new_count >= MAX_ATTEMPTS:
            upd["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MIN)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": upd}, upsert=True)
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort ungültig")
    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Konto gesperrt")
    await db.login_attempts.delete_one({"identifier": identifier})
    await log_activity(user.get("org_id"), user["id"], "login", "user", user["id"])
    token = create_access_token(user["id"], email)
    return {"token": token, "user": _public_user(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _public_user(user)


@router.post("/logout")
async def logout(request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@router.post("/google/session")
async def google_session(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    role = body.get("role", "landlord")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id fehlt")
    resp = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": session_id}, timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Google-Sitzung ungültig")
    data = resp.json()
    email = data["email"].lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = new_id()
        parts = (data.get("name") or "").split(" ", 1)
        first = parts[0] if parts else ""
        last = parts[1] if len(parts) > 1 else ""
        r = "applicant" if role == "applicant" else "landlord"
        org_id = None
        if r == "landlord":
            org_id = await _create_org_for_user(user_id, data.get("name") or email, "private", data.get("name"))
        user = {
            "id": user_id, "email": email, "name": data.get("name"),
            "first_name": first, "last_name": last, "phone": None,
            "picture": data.get("picture"), "role": r, "org_id": org_id,
            "is_active": True, "is_blocked": False, "premium": False,
            "auth_provider": "google", "created_at": now_iso(),
        }
        await db.users.insert_one(user)
    session_token = data.get("session_token") or secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({
        "id": new_id(), "user_id": user["id"], "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_iso(),
    })
    return {"token": session_token, "user": _public_user(user)}


@router.post("/forgot-password")
async def forgot_password(req: ForgotRequest):
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "id": new_id(), "user_id": user["id"], "token": token, "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        })
        print(f"[PASSWORD RESET] {req.email}: reset token = {token}")
    return {"ok": True, "message": "Falls die E-Mail existiert, wurde ein Link versendet."}


@router.post("/reset-password")
async def reset_password(req: ResetRequest):
    rec = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Token ungültig oder abgelaufen")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(req.password)}})
    await db.password_reset_tokens.update_one({"token": req.token}, {"$set": {"used": True}})
    return {"ok": True}
