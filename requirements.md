# Requirements

## Functional Requirements

### FR-1: Live Price Display
- The site must display the live silver spot price per gram and per kilogram.
- The price source is **Vijay Bullion** (`http://www.vijaybullion.com/index.php/C_booking/get_commodity_data`).
- The price must reflect the **real market rate** (~₹222/g as of June 2026), not a hardcoded placeholder.

### FR-2: Auto-Refresh (Every 5 Seconds)
- The live price must update automatically every **5 seconds** without requiring a full page reload.
- Update mechanism: WebSocket primary, HTTP polling fallback.
- On WebSocket connection success, HTTP polling must stop.
- On WebSocket disconnect/error, HTTP polling must restart automatically.

### FR-3: Offline Fallback
- If Vijay Bullion API is unreachable, the last known price must remain visible.
- A small realistic fluctuation (±₹0.30/g) may be applied as a soft fallback.
- The source label must change to "Fallback (Offline)" to inform the admin.

### FR-4: Add Design – Product Media Upload
- The Add Design page must include a **Product Media** section with:
  - **4 image slots** (catalog photos)
  - **2 video slots** (product videos)
- Clicking an empty slot opens the local file picker.
- Selected images/videos are displayed as previews immediately (no page reload needed).
- Files are uploaded to the backend as `multipart/form-data` to `/api/media/upload`.
- If the Design Code is not yet entered, files are stored locally as blob URLs until save.

### FR-5: Add Design – Variant Media Upload
- Each variant panel must include its own **Variant Media** section:
  - **4 image slots** (variant-specific catalog photos)
  - **2 video slots** (variant-specific product videos)
- Same click-to-add, instant-preview, upload behaviour as product-level media.

### FR-6: Media Management
- Users must be able to remove any uploaded image or video by hovering and clicking the ❌ button.
- Locally selected files (not yet uploaded) are marked with a "Local" badge.
- Files being uploaded show a spinner overlay.

---

## Non-Functional Requirements

### NFR-1: Performance
- Price UI must update within 1 second of receiving a WebSocket message.
- File preview must appear within 200 ms of selection (using `URL.createObjectURL`).

### NFR-2: Reliability
- The live price polling must never crash the frontend; all errors must be caught and handled gracefully.
- Backend polling loop must run indefinitely and recover from transient network failures.

### NFR-3: Accuracy
- The silver gram rate must always be calculated as `sell_rate / com_weight` (not multiplied), where `com_weight` is the weight in grams (typically 1000 g = 1 kg).

### NFR-4: Security
- File uploads must validate file type on the frontend (`accept="image/*"` / `accept="video/*"`).
- CORS is configured to allow only known frontend origins.

### NFR-5: Maintainability
- Initial/fallback price values must match real-world rates and be updated in a single place.
- Backend and frontend fallback rates must stay in sync.

---

## Recent Updates (June 2026)

| Date       | Update |
|------------|--------|
| 2026-06-25 | Fixed live price bug: initial value was hardcoded to ₹95.50 (incorrect). Now starts at ₹222 and fetches real data from Vijay Bullion. |
| 2026-06-25 | Added auto-refresh: price updates every 5 seconds via WebSocket + HTTP polling fallback. |
| 2026-06-25 | Added image/video upload: 4 photos + 2 videos at product level; 4 photos + 2 videos per variant. |
| 2026-06-25 | Click-to-add slots with instant preview and backend upload support. |
