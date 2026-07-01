from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.routers.auth import get_admin_user
from app.models.models import Category, ProductDesign, ProductVariant, VariantSize, MediaItem
from app.schemas.schemas import (
    CategoryCreate, CategoryResponse,
    ProductDesignCreate, ProductDesignResponse,
    VariantSizeCreate
)

router = APIRouter(prefix="/api/products", tags=["Products"])

# CATEGORIES ENDPOINTS
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.post("/categories", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    existing = db.query(Category).filter(Category.name == category.name, Category.parent_id == category.parent_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    db_cat = Category(name=category.name, parent_id=category.parent_id)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category: CategoryCreate, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    db_cat = db.query(Category).filter(Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.parent_id == category_id:
        raise HTTPException(status_code=400, detail="Category cannot be its own parent")

    existing = (
        db.query(Category)
        .filter(
            Category.name == category.name,
            Category.parent_id == category.parent_id,
            Category.id != category_id
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    db_cat.name = category.name
    db_cat.parent_id = category.parent_id
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    db_cat = db.query(Category).filter(Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")

    child_count = db.query(Category).filter(Category.parent_id == category_id).count()
    product_count = db.query(ProductDesign).filter(ProductDesign.category_id == category_id).count()
    if child_count or product_count:
        raise HTTPException(
            status_code=400,
            detail="Category is in use. Move products/subcategories before deleting."
        )

    db.delete(db_cat)
    db.commit()
    return {"message": "Category deleted successfully", "category_id": category_id}


# SIZE SPECIFICATION GENERATOR
class SizeGenerationRequest(BaseModel):
    base_size: float = 8.0
    base_weight: float # e.g. 26.5g
    moq: int = 10

@router.post("/generate-sizes", response_model=List[VariantSizeCreate])
def generate_standard_sizes(req: SizeGenerationRequest, admin_user: dict = Depends(get_admin_user)):
    """
    Generate sizes from 4.5" to 12.5" with increments of 0.25".
    Calculates weights proportionally: weight = base_weight * (size / base_size).
    """
    sizes = []
    current_size = 4.5
    while current_size <= 12.5:
        # Calculate proportional weight
        calculated_weight = round(req.base_weight * (current_size / req.base_size), 2)
        
        sizes.append(VariantSizeCreate(
            size=current_size,
            weight=calculated_weight,
            stock_available=0, # Default to 0 stock
            moq=req.moq,
            status="Active"
        ))
        current_size += 0.25
        
    return sizes


# DESIGNS ENDPOINTS (PRODUCT CATALOG)
@router.get("/designs", response_model=List[ProductDesignResponse])
def get_designs(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    baby_sizes_only: Optional[bool] = None,
    status: Optional[str] = "Active",
    db: Session = Depends(get_db)
):
    query = db.query(ProductDesign)
    
    # Eager loading nested relationships to prevent N+1 queries
    query = query.options(
        selectinload(ProductDesign.variants).selectinload(ProductVariant.sizes),
        selectinload(ProductDesign.variants).selectinload(ProductVariant.media),
        selectinload(ProductDesign.media)
    )
    
    if status:
        query = query.filter(ProductDesign.status == status)
        
    if category_id:
        # Find category and all child category IDs to filter recursively
        category_ids = [category_id]
        child_cats = db.query(Category).filter(Category.parent_id == category_id).all()
        category_ids.extend([c.id for c in child_cats])
        query = query.filter(ProductDesign.category_id.in_(category_ids))
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                ProductDesign.design_code.like(search_filter),
                ProductDesign.name.like(search_filter),
                ProductDesign.style.like(search_filter),
                ProductDesign.collection.like(search_filter)
            )
        )
        
    designs = query.all()
    
    # Filter on sizes (baby sizes < 8.0) if requested
    if baby_sizes_only:
        filtered_designs = []
        for design in designs:
            has_baby_size = False
            for var in design.variants:
                for s in var.sizes:
                    if s.size < 8.0 and s.status == "Active":
                        has_baby_size = True
                        break
                if has_baby_size:
                    break
            if has_baby_size:
                filtered_designs.append(design)
        return filtered_designs
        
    return designs

@router.get("/designs/{design_code}", response_model=ProductDesignResponse)
def get_design_by_code(design_code: str, db: Session = Depends(get_db)):
    design = db.query(ProductDesign).options(
        selectinload(ProductDesign.variants).selectinload(ProductVariant.sizes),
        selectinload(ProductDesign.variants).selectinload(ProductVariant.media),
        selectinload(ProductDesign.media)
    ).filter(ProductDesign.design_code == design_code).first()
    
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return design

@router.post("/designs", response_model=ProductDesignResponse)
def create_design(design_in: ProductDesignCreate, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    # Check if design code is duplicate
    existing = db.query(ProductDesign).filter(ProductDesign.design_code == design_in.design_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Design code already exists")

    variant_codes = [var.variant_code for var in design_in.variants]
    if len(variant_codes) != len(set(variant_codes)):
        raise HTTPException(status_code=400, detail="Variant codes must be unique")
    existing_variant = db.query(ProductVariant).filter(ProductVariant.variant_code.in_(variant_codes)).first()
    if existing_variant:
        raise HTTPException(status_code=400, detail="Variant code already exists")
        
    db_design = ProductDesign(
        design_code=design_in.design_code,
        name=design_in.name,
        category_id=design_in.category_id,
        collection=design_in.collection,
        tags=design_in.tags,
        purity=design_in.purity,
        making_charge_per_gram=design_in.making_charge_per_gram,
        wastage_percent=design_in.wastage_percent,
        gst_percent=design_in.gst_percent,
        moq=design_in.moq,
        price_lock_minutes=design_in.price_lock_minutes,
        status=design_in.status,
        metal=design_in.metal,
        weight_range=design_in.weight_range,
        finishing=design_in.finishing,
        occasion=design_in.occasion,
        style=design_in.style,
        gender=design_in.gender,
        lock_type=design_in.lock_type,
        returnable=design_in.returnable,
        exchangeable=design_in.exchangeable
    )
    
    db.add(db_design)
    db.flush() # Get design ID
    
    # Save variants
    for var_in in design_in.variants:
        db_variant = ProductVariant(
            design_id=db_design.id,
            variant_code=var_in.variant_code,
            variant_name=var_in.variant_name,
            status=var_in.status
        )
        db.add(db_variant)
        db.flush() # Get variant ID
        
        # Save sizes for this variant
        for size_in in var_in.sizes:
            db_size = VariantSize(
                variant_id=db_variant.id,
                size=size_in.size,
                weight=size_in.weight,
                stock_available=size_in.stock_available,
                moq=size_in.moq,
                status=size_in.status
            )
            db.add(db_size)
            
        # Save media for this variant
        for med_in in var_in.media:
            db_media = MediaItem(
                design_id=db_design.id,
                variant_id=db_variant.id,
                file_name=med_in.file_name,
                file_type=med_in.file_type,
                file_size=med_in.file_size,
                url=med_in.url,
                category=med_in.category
            )
            db.add(db_media)
            
    # Save media (design-level)
    for med_in in design_in.media:
        db_media = MediaItem(
            design_id=db_design.id,
            variant_id=None,
            file_name=med_in.file_name,
            file_type=med_in.file_type,
            file_size=med_in.file_size,
            url=med_in.url,
            category=med_in.category
        )
        db.add(db_media)
        
    db.commit()
    db.refresh(db_design)
    
    # Reload with relationships
    return get_design_by_code(db_design.design_code, db)

@router.put("/designs/{design_id}", response_model=ProductDesignResponse)
def update_design(design_id: int, design_in: ProductDesignCreate, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    db_design = db.query(ProductDesign).filter(ProductDesign.id == design_id).first()
    if not db_design:
        raise HTTPException(status_code=404, detail="Design not found")

    duplicate_design = (
        db.query(ProductDesign)
        .filter(ProductDesign.design_code == design_in.design_code, ProductDesign.id != design_id)
        .first()
    )
    if duplicate_design:
        raise HTTPException(status_code=400, detail="Design code already exists")

    variant_codes = [var.variant_code for var in design_in.variants]
    if len(variant_codes) != len(set(variant_codes)):
        raise HTTPException(status_code=400, detail="Variant codes must be unique")
    existing_variant = (
        db.query(ProductVariant)
        .join(ProductDesign)
        .filter(ProductVariant.variant_code.in_(variant_codes), ProductDesign.id != design_id)
        .first()
    )
    if existing_variant:
        raise HTTPException(status_code=400, detail="Variant code already exists")
        
    # Update flat attributes
    db_design.design_code = design_in.design_code
    db_design.name = design_in.name
    db_design.category_id = design_in.category_id
    db_design.collection = design_in.collection
    db_design.tags = design_in.tags
    db_design.purity = design_in.purity
    db_design.making_charge_per_gram = design_in.making_charge_per_gram
    db_design.wastage_percent = design_in.wastage_percent
    db_design.gst_percent = design_in.gst_percent
    db_design.moq = design_in.moq
    db_design.price_lock_minutes = design_in.price_lock_minutes
    db_design.status = design_in.status
    db_design.metal = design_in.metal
    db_design.weight_range = design_in.weight_range
    db_design.finishing = design_in.finishing
    db_design.occasion = design_in.occasion
    db_design.style = design_in.style
    db_design.gender = design_in.gender
    db_design.lock_type = design_in.lock_type
    db_design.returnable = design_in.returnable
    db_design.exchangeable = design_in.exchangeable
    
    # Recreate variants/sizes by clearing old child rows first.
    db.query(MediaItem).filter(MediaItem.design_id == db_design.id).delete()
    
    old_variant_ids = [
        row[0]
        for row in db.query(ProductVariant.id)
        .filter(ProductVariant.design_id == db_design.id)
        .all()
    ]
    if old_variant_ids:
        db.query(VariantSize).filter(VariantSize.variant_id.in_(old_variant_ids)).delete(synchronize_session=False)
    db.query(ProductVariant).filter(ProductVariant.design_id == db_design.id).delete(synchronize_session=False)
    db.flush()
    
    for var_in in design_in.variants:
        db_variant = ProductVariant(
            design_id=db_design.id,
            variant_code=var_in.variant_code,
            variant_name=var_in.variant_name,
            status=var_in.status
        )
        db.add(db_variant)
        db.flush()
        
        for size_in in var_in.sizes:
            db_size = VariantSize(
                variant_id=db_variant.id,
                size=size_in.size,
                weight=size_in.weight,
                stock_available=size_in.stock_available,
                moq=size_in.moq,
                status=size_in.status
            )
            db.add(db_size)
            
        for med_in in var_in.media:
            db_media = MediaItem(
                design_id=db_design.id,
                variant_id=db_variant.id,
                file_name=med_in.file_name,
                file_type=med_in.file_type,
                file_size=med_in.file_size,
                url=med_in.url,
                category=med_in.category
            )
            db.add(db_media)
            
    # Recreate design-level media items
    for med_in in design_in.media:
        db_media = MediaItem(
            design_id=db_design.id,
            variant_id=None,
            file_name=med_in.file_name,
            file_type=med_in.file_type,
            file_size=med_in.file_size,
            url=med_in.url,
            category=med_in.category
        )
        db.add(db_media)
        
    db.commit()
    return get_design_by_code(db_design.design_code, db)

@router.delete("/designs/{design_id}")
def delete_design(design_id: int, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    """
    Completely delete a design from database.
    """
    db_design = db.query(ProductDesign).filter(ProductDesign.id == design_id).first()
    if not db_design:
        raise HTTPException(status_code=404, detail="Design not found")
        
    db.delete(db_design)
    db.commit()
    return {"message": "Product design deleted successfully", "design_id": design_id}


@router.delete("/variants/{variant_id}")
def delete_variant(variant_id: int, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    """
    Completely delete a variant from database.
    """
    db_var = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not db_var:
        raise HTTPException(status_code=404, detail="Variant not found")
        
    db.delete(db_var)
    db.commit()
    return {"message": "Variant deleted successfully", "variant_id": variant_id}


# STOCK ADJUSTMENT ENDPOINT
class StockAdjustmentRequest(BaseModel):
    variant_size_id: int
    new_stock: int

@router.post("/adjust-stock")
def adjust_stock(req: StockAdjustmentRequest, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    size = db.query(VariantSize).filter(VariantSize.id == req.variant_size_id).first()
    if not size:
        raise HTTPException(status_code=404, detail="Variant size specification not found")
        
    old_stock = size.stock_available
    size.stock_available = req.new_stock
    db.commit()
    return {
        "variant_size_id": req.variant_size_id,
        "old_stock": old_stock,
        "new_stock": size.stock_available
    }


class VariantStatusRequest(BaseModel):
    status: str

@router.put("/variants/{variant_id}/status")
def update_variant_status(variant_id: int, req: VariantStatusRequest, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    db_var = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not db_var:
        raise HTTPException(status_code=404, detail="Variant not found")
    if req.status not in ["Active", "Inactive"]:
        raise HTTPException(status_code=400, detail="Status must be either 'Active' or 'Inactive'")
    db_var.status = req.status
    db.commit()
    return {
        "variant_id": variant_id,
        "status": db_var.status,
        "message": "Variant status updated successfully"
    }
