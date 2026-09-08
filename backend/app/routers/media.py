from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid
from app.database import get_db
from app.routers.auth import get_admin_user
from app.models.models import MediaItem, ProductDesign, ProductVariant
from app.schemas.schemas import MediaItemResponse, MediaItemCreate
from pydantic import BaseModel

# Resolve the uploads directory (backend/uploads/)
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

router = APIRouter(prefix="/api/media", tags=["Media Library"])

@router.get("", response_model=List[MediaItemResponse])
def get_media_library(
    category: Optional[str] = None,
    file_type: Optional[str] = None,
    design_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MediaItem)
    
    if category:
        query = query.filter(MediaItem.category == category)
        
    if file_type:
        # e.g., image/jpeg or video/mp4
        query = query.filter(MediaItem.file_type.like(f"%{file_type}%"))
        
    if design_code:
        query = query.join(ProductDesign).filter(ProductDesign.design_code == design_code)
        
    return query.order_by(MediaItem.uploaded_at.desc()).all()


# CREATE MOCK MEDIA ENTRY (FOR CATALOG SPECIFICATIONS)
@router.post("", response_model=MediaItemResponse)
def create_media_entry(med: MediaItemCreate, design_id: int, db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    design = db.query(ProductDesign).filter(ProductDesign.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Product design not found")
        
    db_media = MediaItem(
        design_id=design_id,
        file_name=med.file_name,
        file_type=med.file_type,
        file_size=med.file_size,
        url=med.url,
        category=med.category
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media


# FILE UPLOAD — saves file to disk and returns a full accessible URL
@router.post("/upload", response_model=MediaItemResponse)
async def upload_file(
    design_code: str = Form(...),
    variant_code: Optional[str] = Form(None),
    category: str = Form("Catalog Photos"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user: dict = Depends(get_admin_user)
):
    variant_id = None
    design_id = None

    # Check if variant exists
    if variant_code:
        variant = db.query(ProductVariant).filter(ProductVariant.variant_code == variant_code).first()
        if variant:
            variant_id = variant.id
            design_id = variant.design_id
    else:
        design = db.query(ProductDesign).filter(ProductDesign.design_code == design_code).first()
        if design:
            design_id = design.id

    # Read file contents
    contents = await file.read()

    content_type = file.content_type or "image/jpeg"
    orig_ext = os.path.splitext(file.filename or "")[1].lower()

    def _fmt_size(n: int) -> str:
        if n < 1024:
            return f"{n} B"
        if n < 1024 * 1024:
            return f"{round(n / 1024, 1)} KB"
        return f"{round(n / (1024 * 1024), 1)} MB"

    # ── Images: strip EXIF rotation, cap the longest side at 2400px (only if
    #    larger), re-encode as high-quality JPEG, and serve as a real file so
    #    the storefront zoom stays sharp. Non-images (video) are saved as-is.
    MAX_DIM = 2400
    JPEG_QUALITY = 90

    if content_type.startswith("image/"):
        from io import BytesIO
        from PIL import Image, ImageOps

        unique_name = f"{uuid.uuid4().hex}.jpg"
        save_path = os.path.join(UPLOADS_DIR, unique_name)
        try:
            img = Image.open(BytesIO(contents))
            img = ImageOps.exif_transpose(img)  # honour EXIF orientation
            if img.mode not in ("RGB",):
                img = img.convert("RGB")
            if max(img.size) > MAX_DIM:
                img.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
            img.save(save_path, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        except Exception:
            # Unreadable by PIL — keep the raw bytes under the original extension.
            unique_name = f"{uuid.uuid4().hex}{orig_ext or '.jpg'}"
            save_path = os.path.join(UPLOADS_DIR, unique_name)
            with open(save_path, "wb") as f_out:
                f_out.write(contents)
    else:
        unique_name = f"{uuid.uuid4().hex}{orig_ext or '.bin'}"
        save_path = os.path.join(UPLOADS_DIR, unique_name)
        with open(save_path, "wb") as f_out:
            f_out.write(contents)

    file_url = f"/uploads/{unique_name}"
    size_str = _fmt_size(os.path.getsize(save_path))



    if design_id is not None:
        db_media = MediaItem(
            design_id=design_id,
            variant_id=variant_id,
            file_name=file.filename,
            file_type=file.content_type or "image/jpeg",
            file_size=size_str,
            url=file_url,
            category=category
        )
        db.add(db_media)
        db.commit()
        db.refresh(db_media)
        return db_media
    else:
        # Transient response for a new design/variant that hasn't been saved yet.
        # Frontend will receive this real URL and submit it when creating the design.
        return MediaItemResponse(
            id=0,
            design_id=0,
            variant_id=None,
            file_name=file.filename,
            file_type=file.content_type or "image/jpeg",
            file_size=size_str,
            url=file_url,
            category=category,
            uploaded_at=datetime.utcnow()
        )
