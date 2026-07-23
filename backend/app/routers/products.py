from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.routers.auth import get_admin_user
from app.models.models import Category, ProductDesign, ProductVariant, VariantSize, MediaItem, WorkerOrder
import app.models.models as models
from app.schemas.schemas import (
    CategoryCreate, CategoryResponse,
    ProductDesignCreate, ProductDesignResponse,
    VariantSizeCreate
)
import app.schemas.schemas as schemas

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
    Generate sizes from 5.0" to 11.0" with increments of 0.25".
    Calculates weights proportionally: weight = base_weight * (size / base_size).
    """
    sizes = []
    current_size = 5.0
    while current_size <= 11.0:
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
    ).filter((ProductDesign.design_code == design_code) | (ProductDesign.name == design_code)).first()
    
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return design

@router.post("/designs", response_model=ProductDesignResponse)
def create_design(design_in: ProductDesignCreate, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    # Check if design name is duplicate (name must be unique)
    existing = db.query(ProductDesign).filter(ProductDesign.name == design_in.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Design name already exists. Please use a unique name.")

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

    # Check if design name is taken by another design (name must be unique)
    duplicate_design = (
        db.query(ProductDesign)
        .filter(ProductDesign.name == design_in.name.strip(), ProductDesign.id != design_id)
        .first()
    )
    if duplicate_design:
        raise HTTPException(status_code=400, detail="Design name already exists. Please use a unique name.")

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

    # Cleanly remove any worker orders tied to variant sizes of this design first
    size_ids = [s.id for v in db_design.variants for s in v.sizes]
    if size_ids:
        db.query(WorkerOrder).filter(WorkerOrder.variant_size_id.in_(size_ids)).delete(synchronize_session=False)
        
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
        
    size_ids = [s.id for s in db_var.sizes]
    if size_ids:
        db.query(WorkerOrder).filter(WorkerOrder.variant_size_id.in_(size_ids)).delete(synchronize_session=False)

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


# RESERVED STOCK ADJUSTMENT ENDPOINT
class ReservedStockAdjustmentRequest(BaseModel):
    variant_size_id: int
    new_reserved: int

@router.post("/adjust-reserved-stock")
def adjust_reserved_stock(req: ReservedStockAdjustmentRequest, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    size = db.query(VariantSize).filter(VariantSize.id == req.variant_size_id).first()
    if not size:
        raise HTTPException(status_code=404, detail="Variant size specification not found")
        
    old_reserved = size.stock_reserved or 0
    size.stock_reserved = req.new_reserved
    db.commit()
    return {
        "variant_size_id": req.variant_size_id,
        "old_reserved": old_reserved,
        "new_reserved": size.stock_reserved
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


# ─── CATEGORY DIAGNOSTICS & FIX ──────────────────────────────────────────────

def _build_subtree(cat_id: int, children_map: dict) -> list:
    """Recursively collect all category IDs under a given root."""
    ids = [cat_id]
    for child_id in children_map.get(cat_id, []):
        ids.extend(_build_subtree(child_id, children_map))
    return ids


@router.get("/diagnose-categories")
def diagnose_categories(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    """
    Returns a full category-tree report and identifies any product designs
    whose category_id is NOT reachable from any root category (sidebar orphans).
    These designs appear in 'All Collections' but disappear when a category is clicked.
    """
    all_cats = db.query(Category).all()
    # Build parent→children map
    children_map: dict = {}
    for c in all_cats:
        children_map.setdefault(c.parent_id, [])
        children_map[c.parent_id].append(c.id)

    root_cats = [c for c in all_cats if c.parent_id is None]

    # Compute full reachable set from all roots
    all_reachable = set()
    root_subtrees = {}
    for root in root_cats:
        subtree = _build_subtree(root.id, children_map)
        root_subtrees[root.id] = subtree
        all_reachable.update(subtree)

    all_designs = db.query(ProductDesign).all()

    # Identify orphaned designs (category_id not reachable from any root)
    orphaned = []
    for d in all_designs:
        if d.category_id not in all_reachable:
            cat = db.query(Category).filter(Category.id == d.category_id).first() if d.category_id else None
            orphaned.append({
                "design_id": d.id,
                "design_code": d.design_code,
                "name": d.name,
                "collection": d.collection,
                "status": d.status,
                "current_category_id": d.category_id,
                "current_category_name": cat.name if cat else None,
            })

    # Build sidebar count summary
    sidebar_counts = []
    for root in root_cats:
        subtree = set(root_subtrees[root.id])
        count = sum(1 for d in all_designs if d.status == "Active" and d.category_id in subtree)
        sidebar_counts.append({"category_id": root.id, "category_name": root.name, "active_count": count})

    total_active = sum(1 for d in all_designs if d.status == "Active")
    total_counted = sum(s["active_count"] for s in sidebar_counts)

    return {
        "total_active_designs": total_active,
        "total_counted_in_sidebar": total_counted,
        "missing_from_sidebar": total_active - total_counted,
        "sidebar_counts": sidebar_counts,
        "orphaned_designs": orphaned,
        "root_categories": [{"id": c.id, "name": c.name} for c in root_cats],
    }


@router.post("/fix-categories")
def fix_categories(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    """
    Auto-fixes product designs that are invisible when a sidebar category is clicked.
    
    Strategy: For each orphaned design, find the best-matching root category by
    comparing the design's 'collection', 'name', and 'design_code' fields against
    root category names. Updates category_id accordingly.
    """
    all_cats = db.query(Category).all()
    children_map: dict = {}
    for c in all_cats:
        children_map.setdefault(c.parent_id, [])
        children_map[c.parent_id].append(c.id)

    root_cats = [c for c in all_cats if c.parent_id is None]

    all_reachable = set()
    for root in root_cats:
        all_reachable.update(_build_subtree(root.id, children_map))

    all_designs = db.query(ProductDesign).all()
    orphaned = [d for d in all_designs if d.category_id not in all_reachable]

    if not orphaned:
        return {"message": "No orphaned designs found. All products are properly categorized.", "fixed": []}

    fixes_applied = []
    could_not_fix = []

    for d in orphaned:
        collection = (d.collection or "").lower()
        design_name = (d.name or "").lower()
        design_code = (d.design_code or "").lower()

        best_match = None
        best_score = 0

        for root in root_cats:
            root_name = root.name.lower()
            score = 0
            if root_name and root_name in collection:
                score = 10
            elif root_name and root_name in design_name:
                score = 8
            elif root_name and root_name in design_code:
                score = 6
            elif root_name and len(root_name) >= 4 and collection.startswith(root_name[:4]):
                score = 4

            if score > best_score:
                best_score = score
                best_match = root

        if best_match and best_score > 0:
            old_cat_id = d.category_id
            d.category_id = best_match.id
            fixes_applied.append({
                "design_code": d.design_code,
                "old_category_id": old_cat_id,
                "new_category_id": best_match.id,
                "new_category_name": best_match.name,
            })
        else:
            could_not_fix.append({
                "design_code": d.design_code,
                "collection": d.collection,
                "reason": "No matching root category found by name",
            })

    db.commit()

    return {
        "message": f"Fixed {len(fixes_applied)} design(s). {len(could_not_fix)} could not be auto-fixed.",
        "fixed": fixes_applied,
        "could_not_fix": could_not_fix,
    }


# =====================================================================
# WORKER ORDERS MANAGEMENT
# =====================================================================

@router.get("/worker-orders", response_model=List[schemas.WorkerOrderResponse])
def get_worker_orders(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    orders = db.query(models.WorkerOrder).order_by(models.WorkerOrder.created_at.desc()).all()
    return orders

@router.post("/worker-orders", response_model=schemas.WorkerOrderResponse)
def create_worker_order(req: schemas.WorkerOrderCreate, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    size = db.query(models.VariantSize).filter(models.VariantSize.id == req.variant_size_id).first()
    if not size:
        raise HTTPException(status_code=404, detail="Variant size not found")
    
    # Create the order
    order = models.WorkerOrder(
        customer_name=req.customer_name,
        mobile_number=req.mobile_number,
        variant_size_id=req.variant_size_id,
        quantity=req.quantity,
        status="Pending"
    )
    db.add(order)
    
    # Increment the reserved stock in database
    size.stock_reserved = (size.stock_reserved or 0) + req.quantity
    
    db.commit()
    db.refresh(order)
    return order

class UpdateWorkerOrderRequest(BaseModel):
    new_quantity: int

@router.put("/worker-orders/{order_id}", response_model=schemas.WorkerOrderResponse)
def update_worker_order(order_id: int, req: UpdateWorkerOrderRequest, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    order = db.query(models.WorkerOrder).filter(models.WorkerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Worker order not found")
        
    size = db.query(models.VariantSize).filter(models.VariantSize.id == order.variant_size_id).first()
    if not size:
        raise HTTPException(status_code=404, detail="Variant size not found")
        
    if order.status == "Completed":
        raise HTTPException(status_code=400, detail="Cannot edit a completed order")
        
    diff = req.new_quantity - order.quantity
    order.quantity = req.new_quantity
    
    # Adjust database reserved stock by the difference
    size.stock_reserved = (size.stock_reserved or 0) + diff
    
    db.commit()
    db.refresh(order)
    return order

@router.post("/worker-orders/{order_id}/complete", response_model=schemas.WorkerOrderResponse)
def complete_worker_order(order_id: int, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    order = db.query(models.WorkerOrder).filter(models.WorkerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Worker order not found")
        
    size = db.query(models.VariantSize).filter(models.VariantSize.id == order.variant_size_id).first()
    if not size:
        raise HTTPException(status_code=404, detail="Variant size not found")
        
    if order.status == "Completed":
        return order
        
    # Deduct quantity from both stock_available (physical) and stock_reserved
    size.stock_reserved = max(0, (size.stock_reserved or 0) - order.quantity)
    size.stock_available = max(0, (size.stock_available or 0) - order.quantity)
    
    order.status = "Completed"
    
    db.commit()
    db.refresh(order)
    return order

@router.delete("/worker-orders/{order_id}")
def delete_worker_order(order_id: int, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    order = db.query(models.WorkerOrder).filter(models.WorkerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Worker order not found")
        
    size = db.query(models.VariantSize).filter(models.VariantSize.id == order.variant_size_id).first()
    if not size:
        raise HTTPException(status_code=404, detail="Variant size not found")
        
    if order.status == "Pending":
        # Release the reserved stock
        size.stock_reserved = max(0, (size.stock_reserved or 0) - order.quantity)
        
    db.delete(order)
    db.commit()
    return {"message": "Worker order deleted successfully", "order_id": order_id}
