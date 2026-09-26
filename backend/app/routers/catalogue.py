from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.routers.auth import get_current_admin
from app.models.models import Category, ProductDesign, ProductVariant, CatalogueVisibility

router = APIRouter(prefix="/api/catalogue", tags=["Catalogue"])

# Key used for the "All Collections" catalogue PDF.
ALL_COLLECTIONS_KEY = "__all__"


class CatalogueItem(BaseModel):
    key: str
    name: str
    file_type: str = "PDF"
    design_count: int = 0
    thumbnail_url: Optional[str] = None
    is_visible_to_buyer: bool = True


class CatalogueSelectionItem(BaseModel):
    key: str
    is_visible_to_buyer: bool


class CatalogueSelectionUpdate(BaseModel):
    items: List[CatalogueSelectionItem]


class VisibleCatalogues(BaseModel):
    all_collections: bool
    collections: List[str]


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


def _thumbnail(design: ProductDesign) -> Optional[str]:
    media = list(design.media or [])
    for v in design.variants or []:
        media.extend(v.media or [])
    for m in media:
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
        .all()
    )
    visibility = {row.collection_name: row.is_visible_to_buyer for row in db.query(CatalogueVisibility).all()}

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
        item.design_count += 1
        if not item.thumbnail_url:
            item.thumbnail_url = _thumbnail(d)

    collections = sorted(groups.values(), key=lambda i: i.name.lower())
    all_item = CatalogueItem(
        key=ALL_COLLECTIONS_KEY,
        name="All Collections Catalog",
        design_count=sum(i.design_count for i in collections),
        thumbnail_url=next((i.thumbnail_url for i in collections if i.thumbnail_url), None),
        is_visible_to_buyer=visibility.get(ALL_COLLECTIONS_KEY, True),
    )
    return [all_item] + collections


@router.get("/admin", response_model=List[CatalogueItem])
def list_catalogue_items(db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    """All Download Catalogue items with their buyer visibility (admin only)."""
    return _catalogue_items(db)


@router.put("/admin", response_model=List[CatalogueItem])
def update_catalogue_selection(
    payload: CatalogueSelectionUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Save which catalogue items buyers can see (admin only)."""
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
    db.commit()
    return _catalogue_items(db)


@router.get("/visible", response_model=VisibleCatalogues)
def list_visible_catalogues(db: Session = Depends(get_db)):
    """Catalogue items buyers are allowed to download (public)."""
    items = _catalogue_items(db)
    return VisibleCatalogues(
        all_collections=items[0].is_visible_to_buyer,
        collections=[i.name for i in items[1:] if i.is_visible_to_buyer],
    )
