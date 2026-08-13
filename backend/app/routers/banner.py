from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import json
import os
import uuid
import shutil

router = APIRouter(prefix="/api/banner", tags=["banner"])

CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
try:
    os.makedirs(CONFIG_DIR, exist_ok=True)
except Exception:
    pass
CONFIG_FILE = os.path.join(CONFIG_DIR, "banner_config.json")

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "banner"))
try:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
except Exception:
    pass

class BannerSlide(BaseModel):
    id: str
    image_url: str
    title: Optional[str] = "SR Chains Silver Anklet"
    subtitle: Optional[str] = "92.5 Pure Silver Craftsmanship"
    design_code: Optional[str] = None
    effect: Optional[str] = "pan"
    background: Optional[str] = "burgundy"

class BannerConfig(BaseModel):
    enabled: bool = True
    global_effect: str = "pan" # pan, zoom, reversePan, macro, reveal, hero
    duration_ms: int = 5000 # 3000, 4000, 5000, 6000, 8000, 10000
    slides: List[BannerSlide] = []
    featured_design_codes: List[str] = []
    featured_design_ids: Optional[List[int]] = []

def get_default_config() -> dict:
    return {
        "enabled": True,
        "global_effect": "pan",
        "duration_ms": 5000,
        "slides": [
            {
                "id": "slide-1",
                "image_url": "/uploads/media/PAKU1.jpg",
                "title": "Double Kushboo Collection",
                "subtitle": "Signature 92.5 Pure Silver Anklets",
                "design_code": "DKUS01",
                "effect": "hero",
                "background": "burgundy"
            },
            {
                "id": "slide-2",
                "image_url": "/uploads/media/DSC_1416.jpg",
                "title": "Battani & Disco Series",
                "subtitle": "High Polish Daily & Bridal Wear",
                "design_code": "BAT01",
                "effect": "pan",
                "background": "royalPurple"
            },
            {
                "id": "slide-3",
                "image_url": "/uploads/media/DBLARU.jpg",
                "title": "Varisu & Titanic Elegance",
                "subtitle": "Intricate Link Work & Traditional Bells",
                "design_code": "TIT01",
                "effect": "zoom",
                "background": "emerald"
            },
            {
                "id": "slide-4",
                "image_url": "/uploads/media/DSC_1417.jpg",
                "title": "Jalar & Pakija Collection",
                "subtitle": "Bridal Grace & Heavy Silver Finish",
                "design_code": "PAK01",
                "effect": "reversePan",
                "background": "midnightBlue"
            },
            {
                "id": "slide-5",
                "image_url": "/uploads/media/DSC_1418.jpg",
                "title": "Flower & Rasakulla Designs",
                "subtitle": "Modern Micro-Craftsmanship",
                "design_code": "FLO01",
                "effect": "macro",
                "background": "crimson"
            }
        ],
        "featured_design_codes": []
    }

def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading banner config: {e}")
    return get_default_config()

def save_config(cfg: dict):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

@router.get("", response_model=BannerConfig)
async def get_banner_config():
    """Retrieve current banner configuration."""
    return load_config()

@router.post("", response_model=BannerConfig)
async def update_banner_config(config: BannerConfig):
    """Update and persist banner configuration."""
    data = config.dict()
    save_config(data)
    return data

@router.post("/upload")
async def upload_banner_image(file: UploadFile = File(...)):
    """Upload a new banner hero image."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are allowed.")
    
    unique_name = f"banner_{uuid.uuid4().hex[:10]}{ext}"
    file_path = os.path.join(UPLOADS_DIR, unique_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {
        "url": f"/uploads/banner/{unique_name}",
        "file_name": file.filename
    }
