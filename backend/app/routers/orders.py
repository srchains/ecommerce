from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
from app.database import get_db
from app.routers.auth import get_admin_user
from app.models.models import Order, OrderItem, ManufacturingOrder, VariantSize, ProductVariant, ProductDesign, Customer
from app.schemas.schemas import OrderCreate, OrderResponse, OrderItemResponse, ManufacturingOrderResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/orders", tags=["Orders"])

# ORDER CREATION
@router.post("", response_model=OrderResponse)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    if not order_in.items:
        raise HTTPException(status_code=400, detail="An order must contain at least one item")
        
    # Generate unique order number (e.g. SR-2026-XXXX)
    order_number = f"SR-{datetime.utcnow().year}-{str(uuid4().int)[:6]}"
    
    db_order = Order(
        order_number=order_number,
        customer_name=order_in.customer_name,
        mobile_number=order_in.mobile_number,
        status="Pending"
    )
    db.add(db_order)
    db.flush() # Get order ID

    # Log to Customer directory
    db_customer = Customer(
        name=order_in.customer_name,
        mobile_number=order_in.mobile_number,
        order_number=order_number
    )
    db.add(db_customer)
    
    for item in order_in.items:
        # Check if the variant and size exists
        # To identify, we'll look up by variant_code and size
        # We need size as float since it's float in the DB
        try:
            size_val = float(item.size)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid size value: {item.size}")
            
        variant_size = db.query(VariantSize).join(ProductVariant).filter(
            ProductVariant.variant_code == item.variant_code,
            VariantSize.size == size_val
        ).first()
        
        if not variant_size:
            raise HTTPException(
                status_code=404, 
                detail=f"Variant code {item.variant_code} with size {item.size} not found in catalog"
            )
            
        if item.order_type == "ready_stock":
            # Check inventory
            if variant_size.stock_available < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient ready stock for {item.variant_code} (Size {item.size}). Requested: {item.quantity}, Available: {variant_size.stock_available}"
                )
            # Deduct inventory
            variant_size.stock_available -= item.quantity
            
        # Create order item
        db_item = OrderItem(
            order_id=db_order.id,
            design_code=item.design_code,
            variant_code=item.variant_code,
            size=item.size,
            weight=item.weight,
            quantity=item.quantity,
            order_type=item.order_type,
            price=item.price
        )
        db.add(db_item)
        db.flush() # Get order item ID
        
        # If it is made-to-order (make_order), create a Manufacturing Order
        if item.order_type == "make_order":
            db_mfg = ManufacturingOrder(
                order_item_id=db_item.id,
                status="Pending",
                lead_time_days=10 # standard lead time
            )
            db.add(db_mfg)
            
    db.commit()
    
    # Reload order details
    return db.query(Order).options(
        selectinload(Order.items).selectinload(OrderItem.manufacturing_detail)
    ).filter(Order.id == db_order.id).first()


# LIST ALL ORDERS (ADMIN VIEW)
@router.get("", response_model=List[OrderResponse])
def get_orders(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    return db.query(Order).options(
        selectinload(Order.items).selectinload(OrderItem.manufacturing_detail)
    ).order_by(Order.order_date.desc()).all()


# MANUFACTURING QUEUE
@router.get("/manufacturing-queue", response_model=List[OrderItemResponse])
def get_manufacturing_queue(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    """
    Get all order items that are 'make_order' to show on the Admin Manufacturing board
    """
    return db.query(OrderItem).options(
        selectinload(OrderItem.manufacturing_detail)
    ).filter(OrderItem.order_type == "make_order").all()


# UPDATE MANUFACTURING ORDER STATUS
class MfgStatusUpdateRequest(BaseModel):
    order_item_id: int
    status: str # e.g. Casting, Polishing, Completed

@router.post("/update-manufacturing-status", response_model=ManufacturingOrderResponse)
def update_manufacturing_status(req: MfgStatusUpdateRequest, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    mfg = db.query(ManufacturingOrder).filter(ManufacturingOrder.order_item_id == req.order_item_id).first()
    if not mfg:
        raise HTTPException(status_code=404, detail="Manufacturing order queue item not found")
        
    mfg.status = req.status
    mfg.updated_at = datetime.utcnow()
    
    # If the manufacturing is Completed, maybe update the parent order status if all items are completed
    if req.status == "Completed":
        # Check if we should move the items back into inventory or mark as completed.
        # Typically MTO order items are completed and shipped directly.
        pass
        
    db.commit()
    db.refresh(mfg)
    return mfg
