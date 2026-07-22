from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
import io
from fpdf import FPDF
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
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
        try:
            size_val = float(item.size)
        except ValueError:
            size_val = 0.0

        # Bulletproof variant_size lookup: try variant_code, then design_code + size
        variant_size = db.query(VariantSize).join(ProductVariant).filter(
            ProductVariant.variant_code == item.variant_code,
            VariantSize.size == size_val
        ).first()
        
        if not variant_size:
            variant_size = db.query(VariantSize).join(ProductVariant).join(ProductDesign).filter(
                ProductDesign.design_code == item.design_code,
                VariantSize.size == size_val
            ).first()

        if not variant_size:
            variant_size = db.query(VariantSize).join(ProductVariant).join(ProductDesign).filter(
                ProductDesign.design_code == item.design_code
            ).first()
            
        avail_stock = variant_size.stock_available if variant_size else 0

        if item.order_type == "ready_stock":
            actual_ready = min(item.quantity, max(0, avail_stock))
            excess_mto = item.quantity - actual_ready
            
            # Deduct actual available ready stock
            if actual_ready > 0 and variant_size:
                variant_size.stock_available -= actual_ready
                db_item_ready = OrderItem(
                    order_id=db_order.id,
                    design_code=item.design_code,
                    variant_code=item.variant_code,
                    size=item.size,
                    weight=item.weight,
                    quantity=actual_ready,
                    order_type="ready_stock",
                    price=item.price
                )
                db.add(db_item_ready)
            
            # Auto-convert excess items above available stock into Make to Order
            if excess_mto > 0:
                db_item_mto = OrderItem(
                    order_id=db_order.id,
                    design_code=item.design_code,
                    variant_code=item.variant_code,
                    size=item.size,
                    weight=item.weight,
                    quantity=excess_mto,
                    order_type="make_order",
                    price=item.price
                )
                db.add(db_item_mto)
                db.flush()
                db_mfg = ManufacturingOrder(
                    order_item_id=db_item_mto.id,
                    status="Pending",
                    lead_time_days=10
                )
                db.add(db_mfg)
        else:
            # Standard Make to Order item
            db_item = OrderItem(
                order_id=db_order.id,
                design_code=item.design_code,
                variant_code=item.variant_code,
                size=item.size,
                weight=item.weight,
                quantity=item.quantity,
                order_type="make_order",
                price=item.price
            )
            db.add(db_item)
            db.flush()
            
            db_mfg = ManufacturingOrder(
                order_item_id=db_item.id,
                status="Pending",
                lead_time_days=10
            )
            db.add(db_mfg)
            
    db.commit()
    
    # Reload order details
    order = db.query(Order).options(
        selectinload(Order.items).selectinload(OrderItem.manufacturing_detail)
    ).filter(Order.id == db_order.id).first()
    if order:
        customer = db.query(Customer).filter(Customer.mobile_number == order.mobile_number).first()
        order.email = customer.email if customer else None
    return order


# LIST ALL ORDERS (ADMIN VIEW)
@router.get("", response_model=List[OrderResponse])
def get_orders(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    orders = db.query(Order).options(
        selectinload(Order.items).selectinload(OrderItem.manufacturing_detail)
    ).order_by(Order.order_date.desc()).all()
    
    # Pre-fetch all customers into a dict for fast lookup
    customers = db.query(Customer).all()
    customer_emails = {c.mobile_number: c.email for c in customers if c.mobile_number}
    
    for order in orders:
        order.email = customer_emails.get(order.mobile_number)
        
    return orders


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


# helper function to generate invoice PDF
def generate_invoice_pdf(order: Order, db: Session) -> io.BytesIO:
    customer = db.query(Customer).filter(Customer.mobile_number == order.mobile_number).first()
    email = customer.email if customer else None
    
    total_val = sum(item.price * item.quantity for item in order.items)
    gst_val = total_val * 0.03
    base_val = total_val - gst_val

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Brand Header
    pdf.set_font("Helvetica", style="B", size=20)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(100, 10, txt="SR CHAINS", ln=0)
    
    pdf.set_font("Helvetica", style="B", size=14)
    pdf.cell(90, 10, txt="INVOICE", ln=1, align="R")
    
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(100, 5, txt="Premium Silver Anklets Manufacturer", ln=0)
    
    pdf.set_font("Helvetica", style="B", size=9)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(90, 5, txt=f"Invoice No: {order.order_number}", ln=1, align="R")
    
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(100, 5, txt="64, Arumuga Pillayar Koil Street, Gugai, Salem - 636 005", ln=0)
    pdf.cell(90, 5, txt=f"Date: {order.order_date.strftime('%d-%b-%Y')}", ln=1, align="R")
    
    pdf.cell(100, 5, txt="Ph: +91 70106 74487 | srchains19@gmail.com", ln=0)
    pdf.set_font("Helvetica", style="B", size=9)
    pdf.set_text_color(29, 78, 216)
    pdf.cell(90, 5, txt=f"Status: {order.status.upper()}", ln=1, align="R")
    
    pdf.ln(10)
    
    # Customer Info Box
    pdf.set_fill_color(249, 250, 251)
    pdf.set_draw_color(229, 231, 235)
    pdf.rect(10, pdf.get_y(), 190, 25, style="FD")
    
    pdf.set_y(pdf.get_y() + 2)
    pdf.set_x(14)
    pdf.set_font("Helvetica", style="B", size=8)
    pdf.set_text_color(156, 163, 175)
    pdf.cell(100, 4, txt="BILLED TO", ln=0)
    pdf.cell(80, 4, txt="PAYMENT METADATA", ln=1)
    
    pdf.set_x(14)
    pdf.set_font("Helvetica", style="B", size=10)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(100, 5, txt=order.customer_name, ln=0)
    pdf.set_font("Helvetica", style="B", size=9)
    pdf.set_text_color(22, 101, 52)
    pdf.cell(80, 5, txt="Cash on Delivery / Dealer Terms", ln=1)
    
    pdf.set_x(14)
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(75, 85, 99)
    pdf.cell(100, 5, txt=f"Mobile: {order.mobile_number}", ln=0)
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(80, 5, txt="Due Date: Immediate upon dispatch", ln=1)
    
    if email:
        pdf.set_x(14)
        pdf.cell(100, 5, txt=f"Email: {email}", ln=1)
    
    pdf.ln(12)
    
    # Table headers
    pdf.set_fill_color(243, 244, 246)
    pdf.set_text_color(75, 85, 99)
    pdf.set_font("Helvetica", style="B", size=9)
    pdf.cell(70, 8, txt=" Item Details", border=1, ln=0, fill=True)
    pdf.cell(20, 8, txt="Size", border=1, ln=0, align="C", fill=True)
    pdf.cell(25, 8, txt="Weight", border=1, ln=0, align="R", fill=True)
    pdf.cell(25, 8, txt="Price", border=1, ln=0, align="R", fill=True)
    pdf.cell(20, 8, txt="Qty", border=1, ln=0, align="C", fill=True)
    pdf.cell(30, 8, txt="Total", border=1, ln=1, align="R", fill=True)
    
    # Table rows
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(17, 24, 39)
    for item in order.items:
        pdf.cell(70, 10, txt=f" {item.design_code} ({item.variant_code})", border=1, ln=0)
        pdf.cell(20, 10, txt=f"{item.size}\"", border=1, ln=0, align="C")
        pdf.cell(25, 10, txt=f"{item.weight:.2f}g", border=1, ln=0, align="R")
        pdf.cell(25, 10, txt=f"Rs.{item.price:.2f}", border=1, ln=0, align="R")
        pdf.cell(20, 10, txt=str(item.quantity), border=1, ln=0, align="C")
        pdf.cell(30, 10, txt=f"Rs.{(item.price * item.quantity):.2f}", border=1, ln=1, align="R")
        
    pdf.ln(4)
    
    # Table totals
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(135, 6, txt="", ln=0)
    pdf.cell(25, 6, txt="Subtotal:", ln=0, align="R")
    pdf.set_font("Helvetica", style="B", size=9)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(30, 6, txt=f"Rs.{base_val:,.2f}", ln=1, align="R")
    
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(135, 6, txt="", ln=0)
    pdf.cell(25, 6, txt="GST (3%):", ln=0, align="R")
    pdf.set_font("Helvetica", style="B", size=9)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(30, 6, txt=f"Rs.{gst_val:,.2f}", ln=1, align="R")
    
    pdf.set_font("Helvetica", style="B", size=10)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(135, 8, txt="", border="T", ln=0)
    pdf.cell(25, 8, txt="Grand Total:", border="T", ln=0, align="R")
    pdf.set_font("Helvetica", style="B", size=11)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(30, 8, txt=f"Rs.{total_val:,.2f}", border="T", ln=1, align="R")
    
    pdf.ln(15)
    
    # Footer Note
    pdf.set_font("Helvetica", style="I", size=9)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(190, 5, txt="Thank you for doing business with SR Chains!", ln=1, align="C")
    
    pdf_buffer = io.BytesIO()
    pdf_buffer.write(pdf.output())
    pdf_buffer.seek(0)
    return pdf_buffer


# Send invoice email with dynamic PDF attachment
def send_invoice_email_with_attachment(order: Order, pdf_buffer: io.BytesIO, recipient_email: str):
    try:
        msg = MIMEMultipart()
        msg['From'] = "srchains19@gmail.com"
        msg['To'] = recipient_email
        msg['Subject'] = f"Invoice for Order {order.order_number} - SR Chains"
        
        body = f"Dear {order.customer_name},\n\nPlease find attached the official PDF invoice for your order {order.order_number} at SR Chains.\n\nThank you for doing business with us!\n\nBest regards,\nSR Chains Team"
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach PDF
        part = MIMEBase('application', "octet-stream")
        pdf_buffer.seek(0)
        part.set_payload(pdf_buffer.read())
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename="invoice_{order.order_number}.pdf"')
        msg.attach(part)
        
        # Simulate Email sending via logs
        print(f"\n[EMAIL SENT to {recipient_email}]: Subject: {msg['Subject']}\n[ATTACHMENT ATTACHED]: invoice_{order.order_number}.pdf ({pdf_buffer.getbuffer().nbytes} bytes)\n")
        
    except Exception as e:
        print(f"Failed to compile email with PDF attachment: {e}")


# helper function to send notifications
def send_invoice_notifications(order: Order, db: Session):
    customer = db.query(Customer).filter(Customer.mobile_number == order.mobile_number).first()
    email = customer.email if customer else None
    
    total_val = sum(item.price * item.quantity for item in order.items)
    pdf_url = f"http://localhost:8000/api/orders/invoice/{order.id}/pdf"
    
    # Generate PDF buffer for emailing
    pdf_buffer = generate_invoice_pdf(order, db)
    
    # Build text bill
    bill_text = f"--- INVOICE: {order.order_number} ---\n"
    bill_text += f"Customer: {order.customer_name}\n"
    bill_text += f"Mobile: {order.mobile_number}\n"
    if email:
        bill_text += f"Email: {email}\n"
    bill_text += f"Date: {order.order_date.strftime('%d-%b-%Y')}\n\n"
    
    bill_text += "Items:\n"
    for i, item in enumerate(order.items):
        bill_text += f"{i+1}. {item.design_code} - {item.variant_code} ({item.size}\") - {item.quantity} pcs @ Rs. {item.price:,.2f} = Rs. {item.price*item.quantity:,.2f}\n"
    
    bill_text += f"\nTotal Invoice Value: Rs. {total_val:,.2f}\n"
    bill_text += f"Download PDF Invoice: {pdf_url}\n\n"
    bill_text += "Thank you for doing business with SR Chains!"
    
    # Simulate sending
    print(f"\n[WHATSAPP SENT to {order.mobile_number}]:\n{bill_text}\n")
    if email:
        send_invoice_email_with_attachment(order, pdf_buffer, email)
    else:
        print(f"\n[EMAIL NOT SENT]: No email found for customer mobile {order.mobile_number}\n")


class OrderStatusUpdateRequest(BaseModel):
    order_id: int
    status: str

@router.post("/update-status", response_model=OrderResponse)
def update_order_status(req: OrderStatusUpdateRequest, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    order = db.query(Order).options(
        selectinload(Order.items).selectinload(OrderItem.manufacturing_detail)
    ).filter(Order.id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    old_status = order.status
    order.status = req.status
    
    if req.status == "Confirmed" and old_status != "Confirmed":
        send_invoice_notifications(order, db)
        
    db.commit()
    db.refresh(order)
    
    # Populate email before returning
    customer = db.query(Customer).filter(Customer.mobile_number == order.mobile_number).first()
    order.email = customer.email if customer else None
    
    return order


# GET INVOICE PDF ENDPOINT
@router.get("/invoice/{order_id}/pdf")
def get_invoice_pdf(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).options(
        selectinload(Order.items).selectinload(OrderItem.manufacturing_detail)
    ).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    pdf_buffer = generate_invoice_pdf(order, db)
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=invoice_{order.order_number}.pdf"}
    )
