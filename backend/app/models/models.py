from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from app.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)

    # Self-referencing relationship for subcategories
    subcategories = relationship("Category", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")
    designs = relationship("ProductDesign", back_populates="category")


class ProductDesign(Base):
    __tablename__ = "product_designs"

    id = Column(Integer, primary_key=True, index=True)
    design_code = Column(String, index=True, nullable=False) # e.g. ANK-1025 (not unique, multiple designs can share a code)
    name = Column(String, unique=True, index=True, nullable=False) # Design name must be unique
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    collection = Column(String, nullable=True)
    tags = Column(String, nullable=True) # Comma separated
    purity = Column(Float, default=92.5) # e.g. 92.5
    making_charge_per_gram = Column(Float, default=0.4)
    wastage_percent = Column(Float, default=10.0) # e.g. 10%
    gst_percent = Column(Float, default=3.0) # default GST for silver/gold jewelry in India is 3%
    moq = Column(Integer, default=10)
    price_lock_minutes = Column(Integer, default=10)
    status = Column(String, default="Active") # Active, Archived

    # Specs table matching mockup
    metal = Column(String, default="Silver 925")
    weight_range = Column(String, nullable=True) # e.g. "18.50 - 24.30 gm"
    finishing = Column(String, default="High Polish")
    occasion = Column(String, default="Daily Wear")
    style = Column(String, nullable=True) # e.g. "Floral, Bell"
    gender = Column(String, default="Women")
    lock_type = Column(String, default="S-Hook")
    returnable = Column(Boolean, default=True)
    exchangeable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="designs")
    variants = relationship("ProductVariant", back_populates="design", cascade="all, delete-orphan")
    media = relationship("MediaItem", back_populates="design", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    design_id = Column(Integer, ForeignKey("product_designs.id", ondelete="CASCADE"), nullable=False)
    variant_code = Column(String, unique=True, index=True, nullable=False) # e.g. ANK1025-WHT
    variant_name = Column(String, nullable=False) # e.g. White Stone, Oxidized
    status = Column(String, default="Active")

    design = relationship("ProductDesign", back_populates="variants")
    sizes = relationship("VariantSize", back_populates="variant", cascade="all, delete-orphan")
    media = relationship("MediaItem", back_populates="variant", cascade="all, delete-orphan")


class VariantSize(Base):
    __tablename__ = "variant_sizes"

    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    size = Column(Float, nullable=False) # e.g. 8.25
    weight = Column(Float, nullable=False) # weight in grams e.g. 26.50
    stock_available = Column(Integer, default=0) # ready stock inventory
    stock_reserved = Column(Integer, default=0) # reserved stock (manual/worker orders)
    moq = Column(Integer, default=10)
    status = Column(String, default="Active") # Active, Inactive

    variant = relationship("ProductVariant", back_populates="sizes")


class MediaItem(Base):
    __tablename__ = "media_items"

    id = Column(Integer, primary_key=True, index=True)
    design_id = Column(Integer, ForeignKey("product_designs.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # image/jpeg, video/mp4
    file_size = Column(String, nullable=False) # e.g., "2.4 MB"
    url = Column(String, nullable=False) # URL path or base64 data url for mockup
    category = Column(String, default="Catalog Photos") # Catalog Photos, Close-up Photos, Model Photos, Manufacturing Photos, Videos, 360 View
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    design = relationship("ProductDesign", back_populates="media")
    variant = relationship("ProductVariant", back_populates="media")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    mobile_number = Column(String, nullable=True)
    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Pending") # Pending, Processing, Completed, Cancelled

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    design_code = Column(String, nullable=False)
    variant_code = Column(String, nullable=False)
    size = Column(String, nullable=False)
    weight = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    order_type = Column(String, default="ready_stock") # ready_stock, make_order
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    manufacturing_detail = relationship("ManufacturingOrder", uselist=False, back_populates="order_item", cascade="all, delete-orphan")


class ManufacturingOrder(Base):
    __tablename__ = "manufacturing_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="Pending") # Pending, Production Started, Casting, Finishing, Polishing, QC, Ready To Ship, Completed
    lead_time_days = Column(Integer, default=10)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order_item = relationship("OrderItem", back_populates="manufacturing_detail")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    mobile_number = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)  # set true after e-mail OTP
    order_number = Column(String, nullable=True)  # null for sign-up only customers
    created_at = Column(DateTime, default=datetime.utcnow)


class StaffUser(Base):
    """Admin / employee accounts for the wholesale ERP panel."""
    __tablename__ = "staff_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="employee", nullable=False)  # admin | employee
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmailOTP(Base):
    """Short-lived e-mail verification codes for staff login and customer sign-up."""
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    purpose = Column(String, nullable=False)  # staff_login | customer_signup
    otp_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)
    last_sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkerOrder(Base):
    __tablename__ = "worker_orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    mobile_number = Column(String, nullable=True)
    variant_size_id = Column(Integer, ForeignKey("variant_sizes.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    status = Column(String, default="Pending", nullable=False) # Pending, Completed
    created_at = Column(DateTime, default=datetime.utcnow)

    variant_size = relationship("VariantSize")
