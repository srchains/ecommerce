"""Shared e-mail OTP logic for staff login and customer sign-up."""

from __future__ import annotations

import os
import hmac
import hashlib
import secrets
import logging
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import EmailOTP
from app.utils.emailer import send_email

logger = logging.getLogger(__name__)

OTP_SALT = os.getenv("AUTH_OTP_SALT", "sr_chains_otp_salt_2026").encode()
TTL_MINUTES = int(os.getenv("AUTH_OTP_TTL_MINUTES", "10"))
MAX_ATTEMPTS = int(os.getenv("AUTH_OTP_MAX_ATTEMPTS", "5"))
RESEND_COOLDOWN_SECONDS = int(os.getenv("AUTH_OTP_RESEND_COOLDOWN_SECONDS", "30"))
# Local dev only: when true the code is returned in the API response.
DEV_RETURN = os.getenv("AUTH_OTP_DEV_RETURN", "false").strip().lower() in {"1", "true", "yes"}


def _generate() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash(code: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", code.encode("utf-8"), OTP_SALT, 50_000).hex()


def mask_email(email: str) -> str:
    try:
        local, domain = email.split("@", 1)
    except ValueError:
        return "***"
    if len(local) <= 2:
        masked = local[0] + "*"
    else:
        masked = local[0] + "*" * (len(local) - 2) + local[-1]
    return f"{masked}@{domain}"


_SUBJECTS = {
    "staff_login": "Your SR Chains admin login code",
    "customer_signup": "Verify your SR Chains account",
}


def _send(email: str, code: str, purpose: str) -> bool:
    subject = _SUBJECTS.get(purpose, "Your SR Chains verification code")
    text = (
        f"Your SR Chains verification code is: {code}\n\n"
        f"It expires in {TTL_MINUTES} minutes. "
        f"If you did not request this, you can ignore this email."
    )
    html = (
        f"<p>Your SR Chains verification code is:</p>"
        f"<p style='font-size:28px;font-weight:700;letter-spacing:6px'>{code}</p>"
        f"<p>It expires in {TTL_MINUTES} minutes. "
        f"If you did not request this, you can ignore this email.</p>"
    )
    ok = send_email(email, subject, text, html)
    if not ok:
        # SMTP unavailable - surface the code in the log so nobody is fully locked out.
        logger.warning("OTP for %s (%s), email delivery unavailable: %s", email, purpose, code)
    return ok


def issue_otp(db: Session, email: str, purpose: str) -> dict:
    """Invalidate prior codes for (email, purpose), create + e-mail a fresh one.
    Returns {'masked': ..., 'expires_in': ..., 'dev_code': <only if DEV_RETURN>}."""
    email = email.strip().lower()
    db.query(EmailOTP).filter(
        EmailOTP.email == email, EmailOTP.purpose == purpose, EmailOTP.consumed == False  # noqa: E712
    ).update({"consumed": True}, synchronize_session=False)

    code = _generate()
    db.add(EmailOTP(
        email=email,
        purpose=purpose,
        otp_hash=_hash(code),
        expires_at=datetime.utcnow() + timedelta(minutes=TTL_MINUTES),
        last_sent_at=datetime.utcnow(),
    ))
    db.commit()
    _send(email, code, purpose)

    out = {"masked": mask_email(email), "expires_in": TTL_MINUTES * 60}
    if DEV_RETURN:
        out["dev_code"] = code
    return out


def resend_otp(db: Session, email: str, purpose: str) -> dict:
    """Regenerate the active code if one exists and the cooldown has passed.
    Always returns a generic payload (no account enumeration)."""
    email = email.strip().lower()
    generic = {"masked": mask_email(email), "expires_in": TTL_MINUTES * 60}

    row = (
        db.query(EmailOTP)
        .filter(EmailOTP.email == email, EmailOTP.purpose == purpose, EmailOTP.consumed == False)  # noqa: E712
        .order_by(EmailOTP.created_at.desc())
        .first()
    )
    if not row:
        return generic
    if (datetime.utcnow() - row.last_sent_at).total_seconds() < RESEND_COOLDOWN_SECONDS:
        return generic

    code = _generate()
    row.otp_hash = _hash(code)
    row.expires_at = datetime.utcnow() + timedelta(minutes=TTL_MINUTES)
    row.attempts = 0
    row.last_sent_at = datetime.utcnow()
    db.commit()
    _send(email, code, purpose)
    if DEV_RETURN:
        generic["dev_code"] = code
    return generic


def verify_otp(db: Session, email: str, purpose: str, code: str) -> None:
    """Raise HTTPException on any failure; consume the code on success."""
    email = email.strip().lower()
    row = (
        db.query(EmailOTP)
        .filter(EmailOTP.email == email, EmailOTP.purpose == purpose, EmailOTP.consumed == False)  # noqa: E712
        .order_by(EmailOTP.created_at.desc())
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No active verification code. Please start again.")

    if datetime.utcnow() > row.expires_at:
        row.consumed = True
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Verification code expired. Please start again.")

    if row.attempts >= MAX_ATTEMPTS:
        row.consumed = True
        db.commit()
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many incorrect attempts. Please start again.")

    if not hmac.compare_digest(row.otp_hash, _hash((code or "").strip())):
        row.attempts += 1
        db.commit()
        left = max(0, MAX_ATTEMPTS - row.attempts)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Incorrect code. {left} attempt(s) remaining.")

    row.consumed = True
    db.commit()
