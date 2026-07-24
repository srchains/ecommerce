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

BACKEND_BASE_URL = "http://localhost:8000"

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
    file_size_bytes = len(contents)

    # Format size string
    if file_size_bytes < 1024:
        size_str = f"{file_size_bytes} B"
    elif file_size_bytes < 1024 * 1024:
        size_str = f"{round(file_size_bytes / 1024, 1)} KB"
    else:
        size_str = f"{round(file_size_bytes / (1024 * 1024), 1)} MB"

    # Save file to disk locally as backup
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(UPLOADS_DIR, unique_name)
    with open(save_path, "wb") as f_out:
        f_out.write(contents)

    # Convert images to Base64 Data URL so they are stored 100% inside Supabase
    # and accessible on any computer running the project without missing file 404s.
    content_type = file.content_type or "image/jpeg"
    if content_type.startswith("image/"):
        import base64
        encoded = base64.b64encode(contents).decode("utf-8")
        file_url = f"data:{content_type};base64,{encoded}"
    else:
        file_url = f"{BACKEND_BASE_URL}/uploads/{unique_name}"


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
