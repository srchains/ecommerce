from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.routers.auth import get_current_admin
from app.models.models import (
    Category, ProductDesign, ProductVariant, CatalogueVisibility, CatalogueItemVisibility
)

router = APIRouter(prefix="/api/catalogue", tags=["Catalogue"])

# Key used for the "All Collections" catalogue PDF.
ALL_COLLECTIONS_KEY = "__all__"


class CatalogueVariant(BaseModel):
    id: int
    variant_code: str
    variant_name: str
    thumbnail_url: Optional[str] = None
    is_visible_to_buyer: bool = True


class CatalogueDesign(BaseModel):
    id: int
    design_code: str
    name: str
    thumbnail_url: Optional[str] = None
    is_visible_to_buyer: bool = True
    variants: List[CatalogueVariant] = []


class CatalogueItem(BaseModel):
    key: str
    name: str
    file_type: str = "PDF"
    design_count: int = 0
    thumbnail_url: Optional[str] = None
    is_visible_to_buyer: bool = True
    designs: List[CatalogueDesign] = []


class CatalogueSelectionItem(BaseModel):
    key: str
    is_visible_to_buyer: bool


class CatalogueIdSelection(BaseModel):
    id: int
    is_visible_to_buyer: bool


class CatalogueSelectionUpdate(BaseModel):
    items: List[CatalogueSelectionItem] = []
    designs: List[CatalogueIdSelection] = []
    variants: List[CatalogueIdSelection] = []


class VisibleCatalogues(BaseModel):
    all_collections: bool
    collections: List[str]
    hidden_design_ids: List[int] = []
    hidden_variant_ids: List[int] = []


def _collection_name(design: ProductDesign, categories: Dict[int, str]) -> Optional[str]:
    """Same grouping the storefront uses to build the Download Catalogue list."""
    cat_name = categories.get(design.category_id) if design.category_id else None
    if cat_name:
        return cat_name
    if design.collection and design.collection.strip():
        return design.collection.strip()
    if design.name and design.name.strip():
        return design.name.split("-")[0].strip()
    return None


def _image_url(media) -> Optional[str]:
    for m in media or []:
        # Skip legacy base64 data URLs; they would bloat the list response.
        if m.url and not m.url.startswith("data:") and (m.file_type or "").startswith("image"):
            return m.url
    return None


def _catalogue_items(db: Session) -> List[CatalogueItem]:
    categories = {c.id: c.name for c in db.query(Category).all()}
    designs = (
        db.query(ProductDesign)
        .options(
            selectinload(ProductDesign.media),
            selectinload(ProductDesign.variants).selectinload(ProductVariant.media),
        )
        .order_by(ProductDesign.design_code, ProductDesign.name)
        .all()
    )
    visibility = {row.collection_name: row.is_visible_to_buyer for row in db.query(CatalogueVisibility).all()}
    item_visibility = {
        (row.item_type, row.item_id): row.is_visible_to_buyer
        for row in db.query(CatalogueItemVisibility).all()
    }

    groups: Dict[str, CatalogueItem] = {}
    for d in designs:
        if d.status not in (None, "", "Active"):
            continue
        name = _collection_name(d, categories)
        if not name:
            continue
        item = groups.get(name)
        if item is None:
            item = groups[name] = CatalogueItem(
                key=name, name=name, is_visible_to_buyer=visibility.get(name, True)
            )

        variants = [
            CatalogueVariant(
                id=v.id,
                variant_code=v.variant_code,
                variant_name=v.variant_name,
                thumbnail_url=_image_url(v.media),
                is_visible_to_buyer=item_visibility.get(("variant", v.id), True),
            )
            for v in d.variants or []
        ]
        design_thumb = _image_url(d.media) or next((v.thumbnail_url for v in variants if v.thumbnail_url), None)
        item.designs.append(CatalogueDesign(
            id=d.id,
            design_code=d.design_code,
            name=d.name,
            thumbnail_url=design_thumb,
            is_visible_to_buyer=item_visibility.get(("design", d.id), True),
            variants=variants,
        ))
        item.design_count += 1
        if not item.thumbnail_url:
            item.thumbnail_url = design_thumb

    collections = sorted(groups.values(), key=lambda i: i.name.lower())
    all_item = CatalogueItem(
        key=ALL_COLLECTIONS_KEY,
        name="All Collections Catalog",
        design_count=sum(i.design_count for i in collections),
        thumbnail_url=next((i.thumbnail_url for i in collections if i.thumbnail_url), None),
        is_visible_to_buyer=visibility.get(ALL_COLLECTIONS_KEY, True),
    )
    return [all_item] + collections


def _save_item_rows(db: Session, item_type: str, selections: List[CatalogueIdSelection]):
    if not selections:
        return
    existing = {
        row.item_id: row
        for row in db.query(CatalogueItemVisibility).filter(CatalogueItemVisibility.item_type == item_type).all()
    }
    for sel in selections:
        row = existing.get(sel.id)
        if row:
            row.is_visible_to_buyer = sel.is_visible_to_buyer
            row.updated_at = datetime.utcnow()
        else:
            row = CatalogueItemVisibility(item_type=item_type, item_id=sel.id, is_visible_to_buyer=sel.is_visible_to_buyer)
            db.add(row)
            existing[sel.id] = row


@router.get("/admin", response_model=List[CatalogueItem])
def list_catalogue_items(db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    """All Download Catalogue items (with their designs and variants) and buyer visibility (admin only)."""
    return _catalogue_items(db)


@router.put("/admin", response_model=List[CatalogueItem])
def update_catalogue_selection(
    payload: CatalogueSelectionUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Save which catalogues, designs and variants buyers can download (admin only)."""
    existing = {row.collection_name: row for row in db.query(CatalogueVisibility).all()}
    for item in payload.items:
        key = item.key.strip()
        if not key:
            continue
        row = existing.get(key)
        if row:
            row.is_visible_to_buyer = item.is_visible_to_buyer
            row.updated_at = datetime.utcnow()
        else:
            row = CatalogueVisibility(collection_name=key, is_visible_to_buyer=item.is_visible_to_buyer)
            db.add(row)
            existing[key] = row
    _save_item_rows(db, "design", payload.designs)
    _save_item_rows(db, "variant", payload.variants)
    db.commit()
    return _catalogue_items(db)


@router.get("/visible", response_model=VisibleCatalogues)
def list_visible_catalogues(db: Session = Depends(get_db)):
    """Catalogue items buyers are allowed to download (public).
    A collection is listed only if it still has at least one visible design with a visible variant."""
    items = _catalogue_items(db)
    hidden_designs = [
        row.item_id for row in db.query(CatalogueItemVisibility)
        .filter(CatalogueItemVisibility.item_type == "design", CatalogueItemVisibility.is_visible_to_buyer == False)  # noqa: E712
    ]
    hidden_variants = [
        row.item_id for row in db.query(CatalogueItemVisibility)
        .filter(CatalogueItemVisibility.item_type == "variant", CatalogueItemVisibility.is_visible_to_buyer == False)  # noqa: E712
    ]

    def has_content(item: CatalogueItem) -> bool:
        return any(
            d.is_visible_to_buyer and any(v.is_visible_to_buyer for v in d.variants)
            for d in item.designs
        )

    return VisibleCatalogues(
        all_collections=items[0].is_visible_to_buyer,
        collections=[i.name for i in items[1:] if i.is_visible_to_buyer and has_content(i)],
        hidden_design_ids=hidden_designs,
        hidden_variant_ids=hidden_variants,
    )
