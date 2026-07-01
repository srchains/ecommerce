from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import hashlib
import base64
import os
import json
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from typing import Dict

# HTTP Bearer authentication helper
security_scheme = HTTPBearer()

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Stable Fernet Key derivation
SECRET_SEED = os.getenv("AUTH_SECRET_SEED", "SR_CHAINS_SECRET_KEY_FOR_TOKEN_DECRYPTION_1957")
FERNET_KEY = base64.urlsafe_b64encode(hashlib.sha256(SECRET_SEED.encode()).digest())
cipher = Fernet(FERNET_KEY)

# Secure fixed salt for PBKDF2
PBKDF2_SALT = b"sr_chains_secure_salt_1957"

# Precalculated PBKDF2 hashes for:
# 1. test123 -> d5190dba746ce47605fe3061239dab2fe4003c4689bb7c0dd4911ef0fa4b34f8
# 2. srchains195757 -> 7c1f1da6fb6d4eee1b92d6962f74e21463a3501645cf0a29ff70cc3f5370139d
ADMIN_EMAIL = "srchains19@gmail.com"
VALID_PASSWORD_HASHES = {
    "d5190dba746ce47605fe3061239dab2fe4003c4689bb7c0dd4911ef0fa4b34f8",
    "7c1f1da6fb6d4eee1b92d6962f74e21463a3501645cf0a29ff70cc3f5370139d"
}

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    email: str
    role: str

def verify_password(plain_password: str) -> bool:
    """Hash the plain password and verify if it matches any of the stored secure hashes."""
    pwd_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), PBKDF2_SALT, 100000).hex()
    return pwd_hash in VALID_PASSWORD_HASHES

def encrypt_token(payload: Dict) -> str:
    """Encrypt token payload containing user session information."""
    payload_json = json.dumps(payload).encode('utf-8')
    token_bytes = cipher.encrypt(payload_json)
    return token_bytes.decode('utf-8')

def decrypt_token(token: str) -> Dict:
    """Decrypt token and parse it back to a dictionary payload."""
    try:
        token_bytes = token.encode('utf-8')
        decrypted_json = cipher.decrypt(token_bytes).decode('utf-8')
        return json.loads(decrypted_json)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token or signature verification failed"
        )

def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> Dict:
    """Dependency to decrypt token, check role and expiration."""
    token = credentials.credentials
    payload = decrypt_token(token)
    
    # Check expiry
    expiry = payload.get("exp")
    if not expiry or datetime.utcnow().timestamp() > expiry:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please login again."
        )
        
    # Check role
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Admin role required."
        )
        
    return payload

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """Authenticate admin and return encrypted token."""
    email_lower = request.email.lower()
    
    if email_lower != ADMIN_EMAIL or not verify_password(request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
        
    # Create session payload valid for 24 hours
    expires_at = datetime.utcnow() + timedelta(hours=24)
    payload = {
        "email": ADMIN_EMAIL,
        "role": "admin",
        "exp": expires_at.timestamp()
    }
    
    token = encrypt_token(payload)
    return LoginResponse(token=token, email=ADMIN_EMAIL, role="admin")

@router.get("/verify")
def verify(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """Verifies and decrypts token, returning active status."""
    payload = get_admin_user(credentials)
    return {
        "status": "valid",
        "email": payload.get("email"),
        "role": payload.get("role"),
        "exp": payload.get("exp")
    }
