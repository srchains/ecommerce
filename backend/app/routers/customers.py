from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.routers.auth import get_admin_user
from app.models.models import Customer
from app.schemas.schemas import CustomerResponse

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def get_customers(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    return db.query(Customer).order_by(Customer.created_at.desc()).all()
