from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Any
import json
import os
import uuid
import shutil

router = APIRouter(prefix="/api/cards", tags=["cards"])

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
try:
    os.makedirs(DATA_DIR, exist_ok=True)
except Exception:
    pass
CARDS_FILE = os.path.join(DATA_DIR, "digital_cards.json")

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "cards"))
try:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
except Exception:
    pass

class DigitalCardModel(BaseModel):
    id: str
    name: str
    profileImage: Optional[str] = None
    company: Optional[str] = "SR Chains"
    designation: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    address: Optional[str] = "64, Arumuga Pillayar Koil St, Salem - 636 005"
    bio: Optional[str] = None
    nfcWritten: Optional[bool] = False
    views: Optional[int] = 0
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

def load_cards() -> List[dict]:
    if not os.path.exists(CARDS_FILE):
        return []
    try:
        with open(CARDS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_cards(cards: List[dict]):
    with open(CARDS_FILE, "w", encoding="utf-8") as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)

@router.get("", response_model=List[dict])
def get_all_cards():
    return load_cards()

@router.get("/{card_id}")
def get_card(card_id: str):
    cards = load_cards()
    for card in cards:
        if card.get("id") == card_id:
            # Increment view count
            card["views"] = (card.get("views") or 0) + 1
            save_cards(cards)
            return card
    raise HTTPException(status_code=404, detail="Digital card not found")

@router.get("/{card_id}/vcard")
def get_card_vcard(card_id: str):
    """
    Serves the vCard (.vcf) file for a card with Content-Disposition: inline.
    On Android Chrome & iOS Safari, this triggers the native Contacts app to open
    directly in 'Add Contact' mode — NO download popup!
    """
    from fastapi.responses import Response
    cards = load_cards()
    card = None
    for c in cards:
        if c.get("id") == card_id:
            card = c
            break
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    name = card.get("name", "SR Chains")
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{name}",
    ]
    if card.get("company"):
        lines.append(f"ORG:{card['company']}")
    if card.get("designation"):
        lines.append(f"TITLE:{card['designation']}")
    if card.get("phone"):
        lines.append(f"TEL;TYPE=CELL:{card['phone']}")
    if card.get("whatsapp") and card.get("whatsapp") != card.get("phone"):
        lines.append(f"TEL;TYPE=WhatsApp:{card['whatsapp']}")
    if card.get("email"):
        lines.append(f"EMAIL:{card['email']}")
    if card.get("address"):
        lines.append(f"ADR;TYPE=WORK:;;{card['address'].replace(chr(10), ' ')}")
    if card.get("website"):
        lines.append(f"URL:{card['website']}")
    if card.get("bio"):
        lines.append(f"NOTE:{card['bio'].replace(chr(10), ' ')}")
    lines.append("END:VCARD")
    vcard_content = "\r\n".join(lines) + "\r\n"

    safe_name = name.replace(" ", "_")
    return Response(
        content=vcard_content,
        media_type="text/vcard; charset=utf-8",
        headers={
            # 'inline' tells the browser to OPEN the file, not download it.
            # Android Chrome sees text/vcard + inline → opens native Contacts app directly!
            "Content-Disposition": f'inline; filename="{safe_name}.vcf"',
            "Cache-Control": "no-cache",
        }
    )

@router.post("", response_model=dict)
def save_or_update_card(card: dict):
    cards = load_cards()
    card_id = card.get("id")
    
    if not card_id:
        # Generate 6-char alphanumeric ID
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        card_id = "".join([chars[int(os.urandom(1)[0]) % len(chars)] for _ in range(6)])
        card["id"] = card_id

    existing_index = -1
    for idx, c in enumerate(cards):
        if c.get("id") == card_id:
            existing_index = idx
            break

    if existing_index >= 0:
        cards[existing_index].update(card)
        result = cards[existing_index]
    else:
        cards.append(card)
        result = card

    save_cards(cards)
    return result

@router.delete("/{card_id}")
def delete_card(card_id: str):
    cards = load_cards()
    filtered = [c for c in cards if c.get("id") != card_id]
    if len(filtered) == len(cards):
        raise HTTPException(status_code=404, detail="Card not found")
    save_cards(filtered)
    return {"message": "Card deleted successfully"}

@router.post("/upload")
async def upload_profile_image(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"card_avatar_{uuid.uuid4().hex[:10]}{ext}"
    file_path = os.path.join(UPLOADS_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/uploads/cards/{unique_filename}"}
