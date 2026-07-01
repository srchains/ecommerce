# SR Chains – Wholesale Silver Jewelry ERP

## Overview
SR Chains is a B2B wholesale silver jewelry manufacturing and ordering platform. It allows admins to manage product designs, variants, inventory, and media, while buyers can browse the live catalog and place wholesale orders with pricing that is tied to the live silver bullion market rate.

---

## Live Price Feature

The application displays the **live Vijay Bullion silver spot price** in the storefront banner and uses it to calculate wholesale prices for every product.

### How It Works
1. **Backend** (`backend/app/routers/live_price.py`)
   - Polls `http://www.vijaybullion.com/index.php/C_booking/get_commodity_data` every **5 seconds**.
   - Extracts the silver `sell_rate` (price per `com_weight` grams) and converts to a per-gram rate.
   - Broadcasts price updates to all connected WebSocket clients.
   - Falls back to a realistic fluctuation (±₹0.30/g) if the external site is unreachable.

2. **Frontend** (`frontend/src/context/AppContext.tsx`)
   - Connects to `ws://localhost:8000/api/live-price/ws` on startup.
   - If WebSocket fails, falls back to HTTP polling (`GET /api/live-price`) every 5 seconds.
   - Price updates automatically without any page reload.

### Expected Rate
- ~₹222/g (₹2,22,000/kg) as of June 2026.

---

## Add Design – Media Upload

### Product-Level Media
In the **Add Design** page, under the **Product Media** section:
- **4 image slots** for catalog photos
- **2 video slots** for product videos
- **Click** any empty slot → local file picker opens → select image or video → instant preview on page.
- Files are automatically uploaded to the backend at `POST /api/media/upload`.

### Variant-Level Media
Each variant (expandable panel) has its own **Variant Photos & Videos** subsection:
- **4 image slots** + **2 video slots** — same click-to-add behaviour.
- Allows per-colorway or per-style media management.

---

## Running the Project

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Project Structure

```
ecommerce/
├── backend/
│   └── app/
│       ├── main.py            # FastAPI app + lifespan (starts price polling)
│       ├── routers/
│       │   ├── live_price.py  # Live silver price WebSocket + polling
│       │   ├── products.py    # Product/variant/category CRUD
│       │   ├── media.py       # Media upload + library
│       │   └── orders.py      # Order management
│       ├── models/
│       └── schemas/
├── frontend/
│   └── src/
│       ├── context/
│       │   └── AppContext.tsx  # Global state, live price, cart
│       └── components/
│           ├── BuyerStorefront.tsx  # Buyer catalog + price banner
│           ├── ProductForm.tsx      # Add/Edit design with media upload
│           └── ...
├── requirements.md
└── README.md
```

---

## Recent Changelog

| Date       | Change |
|------------|--------|
| 2026-06-25 | Fixed live price: was hardcoded to ₹95.50, now fetches real rate (~₹222) from Vijay Bullion. |
| 2026-06-25 | Added WebSocket + HTTP polling for live price auto-refresh every 5 seconds. |
| 2026-06-25 | Added product-level media upload: 4 images + 2 videos with click-to-select + instant preview. |
| 2026-06-25 | Added variant-level media upload: 4 images + 2 videos per variant. |
