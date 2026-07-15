from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    class Config:
        from_attributes = True

# Size Schemas
class VariantSizeBase(BaseModel):
    size: float
    weight: float
    stock_available: int
    stock_reserved: int = 0
    moq: int = 10
    status: str = "Active"

class VariantSizeCreate(VariantSizeBase):
    pass

class VariantSizeResponse(VariantSizeBase):
    id: int
    variant_id: int
    class Config:
        from_attributes = True

# Media Schemas
class MediaItemBase(BaseModel):
    file_name: str
    file_type: str
    file_size: str
    url: str
    category: str = "Catalog Photos"

class MediaItemCreate(MediaItemBase):
    pass

class MediaItemResponse(MediaItemBase):
    id: int
    design_id: int
    variant_id: Optional[int] = None
    uploaded_at: datetime
    class Config:
        from_attributes = True

# Variant Schemas
class ProductVariantBase(BaseModel):
    variant_code: str
    variant_name: str
    status: str = "Active"

class ProductVariantCreate(ProductVariantBase):
    sizes: List[VariantSizeCreate] = []
    media: List[MediaItemCreate] = []

class ProductVariantResponse(ProductVariantBase):
    id: int
    design_id: int
    sizes: List[VariantSizeResponse] = []
    media: List[MediaItemResponse] = []
    class Config:
        from_attributes = True

# Product Design Schemas
class ProductDesignBase(BaseModel):
    design_code: str
    name: str
    category_id: Optional[int] = None
    collection: Optional[str] = None
    tags: Optional[str] = None
    purity: float = 92.5
    making_charge_per_gram: float = 0.4
    wastage_percent: float = 10.0
    gst_percent: float = 3.0
    moq: int = 10
    price_lock_minutes: int = 10
    status: str = "Active"
    
    # Specs
    metal: str = "Silver 925"
    weight_range: Optional[str] = None
    finishing: str = "High Polish"
    occasion: str = "Daily Wear"
    style: Optional[str] = None
    gender: str = "Women"
    lock_type: str = "S-Hook"
    returnable: bool = True
    exchangeable: bool = True

class ProductDesignCreate(ProductDesignBase):
    variants: List[ProductVariantCreate] = []
    media: List[MediaItemCreate] = []

class ProductDesignResponse(ProductDesignBase):
    id: int
    created_at: datetime
    variants: List[ProductVariantResponse] = []
    media: List[MediaItemResponse] = []
    class Config:
        from_attributes = True

# Manufacturing Order Schemas
class ManufacturingOrderBase(BaseModel):
    status: str
    lead_time_days: int = 10

class ManufacturingOrderResponse(ManufacturingOrderBase):
    id: int
    order_item_id: int
    updated_at: datetime
    class Config:
        from_attributes = True

# Order Item Schemas
class OrderItemBase(BaseModel):
    design_code: str
    variant_code: str
    size: str
    weight: float
    quantity: int
    order_type: str # ready_stock, make_order
    price: float

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(OrderItemBase):
    id: int
    order_id: int
    manufacturing_detail: Optional[ManufacturingOrderResponse] = None
    class Config:
        from_attributes = True

# Order Schemas
class OrderBase(BaseModel):
    customer_name: str

class OrderCreate(OrderBase):
    mobile_number: str
    items: List[OrderItemCreate]

class OrderResponse(OrderBase):
    id: int
    order_number: str
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    order_date: datetime
    status: str
    items: List[OrderItemResponse] = []
    class Config:
        from_attributes = True


class CustomerRegister(BaseModel):
    name: str
    mobile_number: str
    email: str
    password: str

class CustomerLoginRequest(BaseModel):
    email: str
    password: str

class CustomerLoginResponse(BaseModel):
    token: str
    name: str
    email: str
    mobile_number: str

class CustomerProfile(BaseModel):
    id: int
    name: str
    mobile_number: str
    email: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class CustomerResponse(BaseModel):
    id: int
    name: str
    mobile_number: str
    email: Optional[str] = None
    order_number: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Live Price Schemas
class LivePriceResponse(BaseModel):
    silver_gram_rate: float
    silver_kg_rate: float
    last_updated: datetime
    source: str


# Worker Order Schemas
class WorkerOrderBase(BaseModel):
    customer_name: str
    mobile_number: Optional[str] = None
    variant_size_id: int
    quantity: int = 1

class WorkerOrderCreate(WorkerOrderBase):
    pass

class WorkerOrderResponse(WorkerOrderBase):
    id: int
    status: str
    created_at: datetime
    variant_size: Optional[VariantSizeResponse] = None
    
    class Config:
        from_attributes = True
