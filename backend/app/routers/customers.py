from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import List, Optional
import hashlib
from app.database import get_db
from app.routers.auth import get_admin_user, encrypt_token, decrypt_token
from app.models.models import Customer, Order
from app.schemas.schemas import (
    CustomerResponse, CustomerRegister, CustomerLoginRequest,
    CustomerLoginResponse, CustomerProfile
)
from app.utils.otp import issue_otp, resend_otp, verify_otp
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/customers", tags=["Customers"])

SIGNUP_PURPOSE = "customer_signup"


class CustomerOtpChallenge(BaseModel):
    otp_required: bool = True
    email: str
    expires_in: int
    message: str
    dev_otp: Optional[str] = None


class CustomerOtpVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class CustomerEmailRequest(BaseModel):
    email: EmailStr

customer_security = HTTPBearer(auto_error=False)

# Secure salt for customer passwords
CUSTOMER_SALT = b"sr_chains_customer_salt_2026"


def hash_customer_password(plain_password: str) -> str:
    """Hash customer password using PBKDF2."""
    return hashlib.pbkdf2_hmac(
        'sha256', plain_password.encode('utf-8'), CUSTOMER_SALT, 100000
    ).hex()


def get_current_customer(
    credentials: HTTPAuthorizationCredentials = Depends(customer_security),
    db: Session = Depends(get_db)
) -> Customer:
    """Dependency to get the currently logged in customer from token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer authentication required"
        )
    try:
        payload = decrypt_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired customer token"
        )

    # Validate expiry
    exp = payload.get("exp")
    if not exp or datetime.utcnow().timestamp() > exp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer session has expired. Please login again."
        )

    # Validate role
    if payload.get("role") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a customer token"
        )

    customer = db.query(Customer).filter(Customer.email == payload.get("email")).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer account not found"
        )
    return customer


# ─── Public Endpoints ──────────────────────────────────────────────────────────

def _issue_customer_token(customer: Customer) -> str:
    expires_at = datetime.utcnow() + timedelta(days=365)
    return encrypt_token({
        "email": customer.email,
        "role": "customer",
        "customer_id": customer.id,
        "exp": expires_at.timestamp(),
    })


@router.post("/register", response_model=CustomerOtpChallenge)
def register_customer(data: CustomerRegister, db: Session = Depends(get_db)):
    """Create the account (unverified) and e-mail a 6-digit verification code."""
    email = data.email.lower().strip()
    existing = db.query(Customer).filter(Customer.email == email).first()
    if existing and existing.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please login."
        )

    if existing and not existing.email_verified:
        # Let an abandoned signup be retried with fresh details.
        existing.name = data.name
        existing.mobile_number = data.mobile_number
        existing.password_hash = hash_customer_password(data.password)
        customer = existing
    else:
        customer = Customer(
            name=data.name,
            mobile_number=data.mobile_number,
            email=email,
            password_hash=hash_customer_password(data.password),
            email_verified=False,
            order_number=None,
        )
        db.add(customer)
    db.commit()

    sent = issue_otp(db, email, SIGNUP_PURPOSE)
    return CustomerOtpChallenge(
        email=sent["masked"],
        expires_in=sent["expires_in"],
        message=f"A 6-digit verification code was sent to {sent['masked']}.",
        dev_otp=sent.get("dev_code"),
    )


@router.post("/verify-otp", response_model=CustomerLoginResponse)
def verify_customer_otp(data: CustomerOtpVerifyRequest, db: Session = Depends(get_db)):
    """Confirm the sign-up code, mark the account verified, return a session token."""
    email = data.email.lower().strip()
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending sign-up for this email.")

    verify_otp(db, email, SIGNUP_PURPOSE, data.otp)
    customer.email_verified = True
    db.commit()
    db.refresh(customer)

    return CustomerLoginResponse(
        token=_issue_customer_token(customer),
        name=customer.name,
        email=customer.email,
        mobile_number=customer.mobile_number,
    )


@router.post("/resend-otp", response_model=CustomerOtpChallenge)
def resend_customer_otp(data: CustomerEmailRequest, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    sent = resend_otp(db, email, SIGNUP_PURPOSE)
    return CustomerOtpChallenge(
        email=sent["masked"],
        expires_in=sent["expires_in"],
        message=f"If a sign-up is in progress, a new code was sent to {sent['masked']}.",
        dev_otp=sent.get("dev_code"),
    )


@router.post("/login", response_model=CustomerLoginResponse)
def login_customer(data: CustomerLoginRequest, db: Session = Depends(get_db)):
    """Login an existing (verified) customer."""
    email = data.email.lower().strip()
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer or not customer.password_hash:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    if hash_customer_password(data.password) != customer.password_hash:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    if not customer.email_verified:
        # Frontend catches this and shows the verification step, then calls /resend-otp.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to continue.",
        )

    return CustomerLoginResponse(
        token=_issue_customer_token(customer),
        name=customer.name,
        email=customer.email,
        mobile_number=customer.mobile_number,
    )


@router.get("/me", response_model=CustomerProfile)
def get_customer_me(current_customer: Customer = Depends(get_current_customer)):
    """Get the currently logged-in customer's profile."""
    return current_customer


# ─── Admin Endpoints ────────────────────────────────────────────────────────────

@router.get("", response_model=List[CustomerResponse])
def get_customers(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    """Get all customers (admin only)."""
    return db.query(Customer).order_by(Customer.created_at.desc()).all()
