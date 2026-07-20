import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from database import db, NO_ID

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def _extract_token(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return request.cookies.get("access_token") or request.cookies.get("session_token")


async def get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    user = None
    # Try JWT first
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, NO_ID)
    except jwt.PyJWTError:
        user = None
    # Fallback: opaque session token (Google auth)
    if user is None:
        session = await db.user_sessions.find_one({"session_token": token})
        if session:
            expires_at = session["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user = await db.users.find_one({"id": session["user_id"]}, NO_ID)
    if user is None:
        raise HTTPException(status_code=401, detail="Sitzung ungültig oder abgelaufen")
    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Konto gesperrt")
    user.pop("password_hash", None)
    return user


async def resolve_user_by_token(token: str):
    if not token:
        return None
    user = None
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, NO_ID)
    except jwt.PyJWTError:
        user = None
    if user is None:
        session = await db.user_sessions.find_one({"session_token": token})
        if session:
            user = await db.users.find_one({"id": session["user_id"]}, NO_ID)
    if user:
        user.pop("password_hash", None)
    return user


def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        return user
    return checker
