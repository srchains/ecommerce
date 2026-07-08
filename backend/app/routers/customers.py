from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
import hashlib
from app.database import get_db
from app.routers.auth import get_admin_user, encrypt_token, decrypt_token
from app.models.models import Customer, Order
from app.schemas.schemas import (
    CustomerResponse, CustomerRegister, CustomerLoginRequest,
    CustomerLoginResponse, CustomerProfile
)
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/customers", tags=["Customers"])

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

@router.post("/register", response_model=CustomerLoginResponse)
def register_customer(data: CustomerRegister, db: Session = Depends(get_db)):
    """Register a new customer account."""
    # Check if email already exists
    existing = db.query(Customer).filter(Customer.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please login."
        )

    password_hash = hash_customer_password(data.password)
    customer = Customer(
        name=data.name,
        mobile_number=data.mobile_number,
        email=data.email.lower(),
        password_hash=password_hash,
        order_number=None,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    # Generate token
    expires_at = datetime.utcnow() + timedelta(days=365)
    payload = {
        "email": customer.email,
        "role": "customer",
        "customer_id": customer.id,
        "exp": expires_at.timestamp()
    }
    token = encrypt_token(payload)

    return CustomerLoginResponse(
        token=token,
        name=customer.name,
        email=customer.email,
        mobile_number=customer.mobile_number
    )


@router.post("/login", response_model=CustomerLoginResponse)
def login_customer(data: CustomerLoginRequest, db: Session = Depends(get_db)):
    """Login an existing customer."""
    customer = db.query(Customer).filter(Customer.email == data.email.lower()).first()
    if not customer or not customer.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    password_hash = hash_customer_password(data.password)
    if password_hash != customer.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Generate token (1 year validity)
    expires_at = datetime.utcnow() + timedelta(days=365)
    payload = {
        "email": customer.email,
        "role": "customer",
        "customer_id": customer.id,
        "exp": expires_at.timestamp()
    }
    token = encrypt_token(payload)

    return CustomerLoginResponse(
        token=token,
        name=customer.name,
        email=customer.email,
        mobile_number=customer.mobile_number
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
