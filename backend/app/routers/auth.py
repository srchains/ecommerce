from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
import hashlib
import hmac
import base64
import os
import json
import secrets
import logging
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from typing import Dict, List, Optional

from app.database import get_db
from app.models.models import StaffUser
from app.utils.otp import issue_otp, resend_otp, verify_otp
from app.utils.emailer import smtp_configured

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer()
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ─── Token signing key (env only; ephemeral fallback, never a committed literal) ──
_SECRET_SEED = os.getenv("AUTH_SECRET_SEED", "").strip()
if not _SECRET_SEED:
    _SECRET_SEED = secrets.token_urlsafe(48)
    logger.warning("AUTH_SECRET_SEED not set - using an ephemeral signing key (sessions reset on restart).")
FERNET_KEY = base64.urlsafe_b64encode(hashlib.sha256(_SECRET_SEED.encode()).digest())
cipher = Fernet(FERNET_KEY)

# Salt for staff password PBKDF2. Default kept stable so a pre-computed
# ADMIN_PASSWORD_HASH in the environment still matches; overridable via env.
PBKDF2_SALT = os.getenv("AUTH_PBKDF2_SALT", "sr_chains_secure_salt_1957").encode()
PBKDF2_ROUNDS = 100_000

SESSION_TTL_HOURS = int(os.getenv("AUTH_SESSION_TTL_HOURS", "24"))
STAFF_LOGIN_PURPOSE = "staff_login"


def get_admin_email() -> str:
    return os.getenv("ADMIN_EMAIL", "srchains19@gmail.com").strip().lower()


# ─── Password helpers ─────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), PBKDF2_SALT, PBKDF2_ROUNDS).hex()


def verify_password(plain: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    return hmac.compare_digest(hash_password(plain), stored_hash.strip().lower())


# ─── Token helpers ────────────────────────────────────────────────────────────
def encrypt_token(payload: Dict) -> str:
    return cipher.encrypt(json.dumps(payload).encode("utf-8")).decode("utf-8")


def decrypt_token(token: str) -> Dict:
    try:
        return json.loads(cipher.decrypt(token.encode("utf-8")).decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token or signature verification failed",
        )


def _issue_session_token(user: StaffUser) -> str:
    payload = {
        "staff_id": user.id,
        "email": user.email,
        "sub": user.email,
        "name": user.name,
        "role": user.role,
        "exp": (datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS)).timestamp(),
    }
    return encrypt_token(payload)


# ─── Dependencies ─────────────────────────────────────────────────────────────
def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Dict:
    """Decrypt the bearer token, enforce expiry, and confirm the staff account is still active."""
    payload = decrypt_token(credentials.credentials)

    exp = payload.get("exp")
    if not exp or datetime.utcnow().timestamp() > float(exp):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session has expired. Please login again.")

    if payload.get("role") not in ("admin", "employee"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access forbidden. Staff role required.")

    email = (payload.get("email") or "").strip().lower()
    user = db.query(StaffUser).filter(StaffUser.email == email).first()
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This account is no longer active. Please contact the admin.")

    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}


def get_current_admin(staff: Dict = Depends(get_current_staff)) -> Dict:
    if staff["role"] != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required.")
    return staff


# Backwards-compatible alias: every existing router gates on `get_admin_user`.
# It now accepts both admin and employee tokens.
get_admin_user = get_current_staff


# ─── Schemas ──────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginChallengeResponse(BaseModel):
    otp_required: bool = True
    email: str
    expires_in: int
    message: str
    dev_otp: Optional[str] = None


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class EmailOnlyRequest(BaseModel):
    email: EmailStr


class LoginResponse(BaseModel):
    token: str
    email: str
    role: str
    name: str


class StaffCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


class StaffUpdateRequest(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6)
    active: Optional[bool] = None


class StaffResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Login flow ───────────────────────────────────────────────────────────────
@router.post("/login", response_model=LoginChallengeResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Step 1: validate credentials, then e-mail a 6-digit code."""
    email = request.email.strip().lower()
    user = db.query(StaffUser).filter(StaffUser.email == email).first()

    if not user or not user.active or not verify_password(request.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    sent = issue_otp(db, email, STAFF_LOGIN_PURPOSE)
    return LoginChallengeResponse(
        email=sent["masked"],
        expires_in=sent["expires_in"],
        message=f"A 6-digit verification code was sent to {sent['masked']}.",
        dev_otp=sent.get("dev_code"),
    )


@router.post("/verify-otp", response_model=LoginResponse)
def verify_login_otp(request: OtpVerifyRequest, db: Session = Depends(get_db)):
    """Step 2: exchange a valid code for a session token."""
    email = request.email.strip().lower()
    user = db.query(StaffUser).filter(StaffUser.email == email).first()
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    verify_otp(db, email, STAFF_LOGIN_PURPOSE, request.otp)
    return LoginResponse(token=_issue_session_token(user), email=user.email, role=user.role, name=user.name)


@router.post("/resend-otp", response_model=LoginChallengeResponse)
def resend_login_otp(request: EmailOnlyRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    sent = resend_otp(db, email, STAFF_LOGIN_PURPOSE)
    return LoginChallengeResponse(
        email=sent["masked"],
        expires_in=sent["expires_in"],
        message=f"If a login is in progress, a new code was sent to {sent['masked']}.",
        dev_otp=sent.get("dev_code"),
    )


@router.get("/verify")
def verify(staff: Dict = Depends(get_current_staff)):
    return {
        "status": "valid",
        "email": staff["email"],
        "name": staff["name"],
        "role": staff["role"],
        "smtp_configured": smtp_configured(),
    }


# ─── Staff management (admin only) ────────────────────────────────────────────
@router.get("/staff", response_model=List[StaffResponse])
def list_staff(db: Session = Depends(get_db), admin: Dict = Depends(get_current_admin)):
    return db.query(StaffUser).order_by(StaffUser.created_at.asc()).all()


@router.post("/staff", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(req: StaffCreateRequest, db: Session = Depends(get_db), admin: Dict = Depends(get_current_admin)):
    email = req.email.strip().lower()
    if db.query(StaffUser).filter(StaffUser.email == email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A staff account with this email already exists.")
    user = StaffUser(
        name=req.name.strip(),
        email=email,
        password_hash=hash_password(req.password),
        role="employee",  # only the seeded primary account is an admin
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/staff/{staff_id}", response_model=StaffResponse)
def update_staff(staff_id: int, req: StaffUpdateRequest, db: Session = Depends(get_db),
                 admin: Dict = Depends(get_current_admin)):
    user = db.query(StaffUser).filter(StaffUser.id == staff_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff account not found.")
    if user.role == "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The primary admin account cannot be modified here.")
    if req.name is not None:
        user.name = req.name.strip()
    if req.password:
        user.password_hash = hash_password(req.password)
    if req.active is not None:
        user.active = req.active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/staff/{staff_id}", response_model=StaffResponse)
def deactivate_staff(staff_id: int, db: Session = Depends(get_db), admin: Dict = Depends(get_current_admin)):
    """Soft-delete: mark inactive, keep the record."""
    user = db.query(StaffUser).filter(StaffUser.id == staff_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff account not found.")
    if user.role == "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The primary admin account cannot be deactivated.")
    user.active = False
    db.commit()
    db.refresh(user)
    return user


# ─── First-run seeding ───────────────────────────────────────────────────────
def seed_primary_admin(SessionLocal) -> None:
    """Ensure a single admin StaffUser exists, derived from ADMIN_EMAIL / ADMIN_PASSWORD_HASH."""
    db = SessionLocal()
    try:
        email = get_admin_email()
        existing = db.query(StaffUser).filter(StaffUser.email == email).first()
        if existing:
            if existing.role != "admin" or not existing.active:
                existing.role = "admin"
                existing.active = True
                db.commit()
            return
        env_hash = os.getenv("ADMIN_PASSWORD_HASH", "").strip().lower()
        password_hash = env_hash or hash_password(os.getenv("ADMIN_PASSWORD", "") or "srchains195757")
        db.add(StaffUser(name="Primary Admin", email=email, password_hash=password_hash,
                         role="admin", active=True))
        db.commit()
        logger.info("Seeded primary admin staff account: %s", email)
    finally:
        db.close()
