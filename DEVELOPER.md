# 🛠️ SR Chains — Senior Developer Documentation

Welcome to the **SR Chains Wholesale B2B Silver Jewelry Platform** developer guide. This document provides a high-level architectural overview, database model diagrams, system design patterns, detailed functional specifications, and core data flows to help any incoming senior developer understand the codebase instantly.

---

## 🏗️ System Architecture

The platform is designed as a decoupled client-server architecture:
1. **Frontend**: React (TypeScript) + Vite + TailwindCSS.
2. **Backend**: FastAPI (Python) + SQLAlchemy ORM.
3. **Database**: SQLite (local dev) / PostgreSQL (production-ready).

![Mermaid Diagram](https://mermaid.ink/svg/Z3JhcGggVEQKICAgIHN1YmdyYXBoIENsaWVudF9UaWVyWyJDbGllbnQgVGllciAoUmVhY3QgRnJvbnRlbmQpIl0KICAgICAgICBGRVsiUmVhY3QgV2ViIENsaWVudCAoQXBwLnRzeCkiXQogICAgICAgIENUWFsiQXBwQ29udGV4dCAoU3RhdGUgJiBXZWJTb2NrZXQgTWFuYWdlcikiXQogICAgICAgIEJ1eWVyVmlld1siQnV5ZXIgU3RvcmVmcm9udCAoQnV5ZXJTdG9yZWZyb250LnRzeCkiXQogICAgICAgIEFkbWluVmlld1siQWRtaW4gRGFzaGJvYXJkIChEYXNoYm9hcmQudHN4IC8gUHJvZHVjdEZvcm0udHN4KSJdCiAgICBlbmQKCiAgICBzdWJncmFwaCBBcHBsaWNhdGlvbl9UaWVyWyJBcHBsaWNhdGlvbiBUaWVyIChGYXN0QVBJIEJhY2tlbmQpIl0KICAgICAgICBBUElbIkZhc3RBUEkgQXBwIChtYWluLnB5KSJdCiAgICAgICAgTFBfUm91dGVyWyJMaXZlIFByaWNlIFJvdXRlciAoV2ViU29ja2V0ICsgUG9sbCBMb29wKSJdCiAgICAgICAgUHJvZF9Sb3V0ZXJbIlByb2R1Y3RzIFJvdXRlciAoQ1JVRCBBUEkpIl0KICAgICAgICBPcmRlcl9Sb3V0ZXJbIk9yZGVycyBSb3V0ZXIgKENoZWNrb3V0IEFQSSkiXQogICAgICAgIE1lZGlhX1JvdXRlclsiTWVkaWEgUm91dGVyIChVcGxvYWQgTWFuYWdlcikiXQogICAgZW5kCgogICAgc3ViZ3JhcGggRGF0YV9FeHRlcm5hbF9UaWVyWyJEYXRhICYgRXh0ZXJuYWwgVGllciJdCiAgICAgICAgREJbKCJTUUxpdGUgRGF0YWJhc2UgKHNyX2NoYWlucy5kYikiKV0KICAgICAgICBWaWpheVsiVmlqYXkgQnVsbGlvbiBBUEkgKEV4dGVybmFsIFByaWNlIEZlZWQpIl0KICAgICAgICBEaXNrWyJMb2NhbCBEaXNrIFVwbG9hZHMgKGJhY2tlbmQvdXBsb2Fkcy8pIl0KICAgIGVuZAoKICAgIEZFIC0tPiBDVFgKICAgIENUWCAtLT4gQVBJCiAgICBCdXllclZpZXcgLS0+IENUWAogICAgQWRtaW5WaWV3IC0tPiBDVFgKCiAgICBBUEkgLS0+IExQX1JvdXRlcgogICAgQVBJIC0tPiBQcm9kX1JvdXRlcgogICAgQVBJIC0tPiBPcmRlcl9Sb3V0ZXIKICAgIEFQSSAtLT4gTWVkaWFfUm91dGVyCgogICAgTFBfUm91dGVyIC0tPiBWaWpheQogICAgTFBfUm91dGVyIC0tPiBEQgogICAgUHJvZF9Sb3V0ZXIgLS0+IERCCiAgICBPcmRlcl9Sb3V0ZXIgLS0+IERCCiAgICBNZWRpYV9Sb3V0ZXIgLS0+IERpc2sKICAgIE1lZGlhX1JvdXRlciAtLT4gREI=)

<details>
<summary>🔍 View Editable Diagram Code</summary>

```mermaid
graph TD
    subgraph Client_Tier["Client Tier (React Frontend)"]
        FE["React Web Client (App.tsx)"]
        CTX["AppContext (State & WebSocket Manager)"]
        BuyerView["Buyer Storefront (BuyerStorefront.tsx)"]
        AdminView["Admin Dashboard (Dashboard.tsx / ProductForm.tsx)"]
    end

    subgraph Application_Tier["Application Tier (FastAPI Backend)"]
        API["FastAPI App (main.py)"]
        LP_Router["Live Price Router (WebSocket + Poll Loop)"]
        Prod_Router["Products Router (CRUD API)"]
        Order_Router["Orders Router (Checkout API)"]
        Media_Router["Media Router (Upload Manager)"]
    end

    subgraph Data_External_Tier["Data & External Tier"]
        DB[("SQLite Database (sr_chains.db)")]
        Vijay["Vijay Bullion API (External Price Feed)"]
        Disk["Local Disk Uploads (backend/uploads/)"]
    end

    FE --> CTX
    CTX --> API
    BuyerView --> CTX
    AdminView --> CTX

    API --> LP_Router
    API --> Prod_Router
    API --> Order_Router
    API --> Media_Router

    LP_Router --> Vijay
    LP_Router --> DB
    Prod_Router --> DB
    Order_Router --> DB
    Media_Router --> Disk
    Media_Router --> DB
```
</details>

---

## 🗄️ Database Schema & Relationships

The database utilizes a structured relational model to support hierarchical category trees, multi-variant products, individual size pricing/stocks, and complex orders.

![Mermaid Diagram](https://mermaid.ink/svg/ZXJEaWFncmFtCiAgICBDQVRFR09SWSB7CiAgICAgICAgaW50IGlkIFBLCiAgICAgICAgc3RyaW5nIG5hbWUKICAgICAgICBpbnQgcGFyZW50X2lkIEZLCiAgICB9CiAgICBQUk9EVUNUX0RFU0lHTiB7CiAgICAgICAgaW50IGlkIFBLCiAgICAgICAgc3RyaW5nIGRlc2lnbl9jb2RlCiAgICAgICAgc3RyaW5nIG5hbWUgVUsKICAgICAgICBpbnQgY2F0ZWdvcnlfaWQgRksKICAgICAgICBmbG9hdCBwdXJpdHkKICAgICAgICBmbG9hdCBtYWtpbmdfY2hhcmdlX3Blcl9ncmFtCiAgICAgICAgZmxvYXQgd2FzdGFnZV9wZXJjZW50CiAgICAgICAgZmxvYXQgZ3N0X3BlcmNlbnQKICAgICAgICBpbnQgbW9xCiAgICAgICAgc3RyaW5nIG1ldGFsCiAgICAgICAgc3RyaW5nIHdlaWdodF9yYW5nZQogICAgICAgIHN0cmluZyBzdGF0dXMKICAgIH0KICAgIFBST0RVQ1RfVkFSSUFOVCB7CiAgICAgICAgaW50IGlkIFBLCiAgICAgICAgaW50IGRlc2lnbl9pZCBGSwogICAgICAgIHN0cmluZyB2YXJpYW50X2NvZGUgVUsKICAgICAgICBzdHJpbmcgdmFyaWFudF9uYW1lCiAgICAgICAgc3RyaW5nIHN0YXR1cwogICAgfQogICAgVkFSSUFOVF9TSVpFIHsKICAgICAgICBpbnQgaWQgUEsKICAgICAgICBpbnQgdmFyaWFudF9pZCBGSwogICAgICAgIGZsb2F0IHNpemUKICAgICAgICBmbG9hdCB3ZWlnaHQKICAgICAgICBpbnQgc3RvY2tfYXZhaWxhYmxlCiAgICAgICAgaW50IG1vcQogICAgICAgIHN0cmluZyBzdGF0dXMKICAgIH0KICAgIE1FRElBX0lURU0gewogICAgICAgIGludCBpZCBQSwogICAgICAgIGludCBkZXNpZ25faWQgRksKICAgICAgICBpbnQgdmFyaWFudF9pZCBGSwogICAgICAgIHN0cmluZyBmaWxlX25hbWUKICAgICAgICBzdHJpbmcgZmlsZV90eXBlCiAgICAgICAgc3RyaW5nIHVybAogICAgICAgIHN0cmluZyBjYXRlZ29yeQogICAgfQogICAgT1JERVIgewogICAgICAgIGludCBpZCBQSwogICAgICAgIHN0cmluZyBvcmRlcl9udW1iZXIgVUsKICAgICAgICBzdHJpbmcgY3VzdG9tZXJfbmFtZQogICAgICAgIHN0cmluZyBtb2JpbGVfbnVtYmVyCiAgICAgICAgZGF0ZXRpbWUgb3JkZXJfZGF0ZQogICAgICAgIHN0cmluZyBzdGF0dXMKICAgIH0KICAgIE9SREVSX0lURU0gewogICAgICAgIGludCBpZCBQSwogICAgICAgIGludCBvcmRlcl9pZCBGSwogICAgICAgIHN0cmluZyBkZXNpZ25fY29kZQogICAgICAgIHN0cmluZyB2YXJpYW50X2NvZGUKICAgICAgICBzdHJpbmcgc2l6ZQogICAgICAgIGZsb2F0IHdlaWdodAogICAgICAgIGludCBxdWFudGl0eQogICAgICAgIHN0cmluZyBvcmRlcl90eXBlCiAgICAgICAgZmxvYXQgcHJpY2UKICAgIH0KICAgIE1BTlVGQUNUVVJJTkdfT1JERVIgewogICAgICAgIGludCBpZCBQSwogICAgICAgIGludCBvcmRlcl9pdGVtX2lkIEZLCiAgICAgICAgc3RyaW5nIHN0YXR1cwogICAgICAgIGludCBsZWFkX3RpbWVfZGF5cwogICAgfQoKICAgIENBVEVHT1JZIHx8LS1veyBDQVRFR09SWSA6IHBhcmVudC1jaGlsZAogICAgQ0FURUdPUlkgfHwtLW97IFBST0RVQ1RfREVTSUdOIDogaGFzCiAgICBQUk9EVUNUX0RFU0lHTiB8fC0tb3sgUFJPRFVDVF9WQVJJQU5UIDogaGFzCiAgICBQUk9EVUNUX0RFU0lHTiB8fC0tb3sgTUVESUFfSVRFTSA6IGhhcwogICAgUFJPRFVDVF9WQVJJQU5UIHx8LS1veyBWQVJJQU5UX1NJWkUgOiBoYXMKICAgIFBST0RVQ1RfVkFSSUFOVCB8fC0tb3sgTUVESUFfSVRFTSA6IGhhcwogICAgT1JERVIgfHwtLW97IE9SREVSX0lURU0gOiBjb250YWlucwogICAgT1JERVJfSVRFTSB8fC0tb3wgTUFOVUZBQ1RVUklOR19PUkRFUiA6IHRyaWdnZXJz)

<details>
<summary>🔍 View Editable Diagram Code</summary>

```mermaid
erDiagram
    CATEGORY {
        int id PK
        string name
        int parent_id FK
    }
    PRODUCT_DESIGN {
        int id PK
        string design_code
        string name UK
        int category_id FK
        float purity
        float making_charge_per_gram
        float wastage_percent
        float gst_percent
        int moq
        string metal
        string weight_range
        string status
    }
    PRODUCT_VARIANT {
        int id PK
        int design_id FK
        string variant_code UK
        string variant_name
        string status
    }
    VARIANT_SIZE {
        int id PK
        int variant_id FK
        float size
        float weight
        int stock_available
        int moq
        string status
    }
    MEDIA_ITEM {
        int id PK
        int design_id FK
        int variant_id FK
        string file_name
        string file_type
        string url
        string category
    }
    ORDER {
        int id PK
        string order_number UK
        string customer_name
        string mobile_number
        datetime order_date
        string status
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        string design_code
        string variant_code
        string size
        float weight
        int quantity
        string order_type
        float price
    }
    MANUFACTURING_ORDER {
        int id PK
        int order_item_id FK
        string status
        int lead_time_days
    }

    CATEGORY ||--o{ CATEGORY : parent-child
    CATEGORY ||--o{ PRODUCT_DESIGN : has
    PRODUCT_DESIGN ||--o{ PRODUCT_VARIANT : has
    PRODUCT_DESIGN ||--o{ MEDIA_ITEM : has
    PRODUCT_VARIANT ||--o{ VARIANT_SIZE : has
    PRODUCT_VARIANT ||--o{ MEDIA_ITEM : has
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER_ITEM ||--o| MANUFACTURING_ORDER : triggers
```
</details>

---

## 💻 Admin Panel: Functionality & Specifications

The Admin Panel serves as the internal enterprise resource management dashboard. Key modules and functionality include:

### 1. Enterprise Dashboard (`Dashboard.tsx`)
* **Real-time Price Sync**: Displays current silver gram & kilogram bullion spot rates fetched from the live-price endpoints.
* **Store Metrics**: Summarizes core business KPIs (Total designs, Active Variants, Total Order Volume, and Total Stock Weight in kilograms).
* **Inventory Distribution Charts**: Visualizes stock allocations across collections and categories.

### 2. Category Tree CRUD (`CategoryManagement.tsx`)
* **Self-Referencing Tree Structure**: Allows admins to create parent categories (e.g. Daily Wear) and map nested subcategories (e.g. Bell Collection) dynamically.
* **Cascading Deletions**: Deleting parent categories prompts clean-ups or re-allocates subcategories to prevent orphan paths.

### 3. Product Catalog Form (`ProductForm.tsx`)
* **Metadata Configurator**: Manages Design Code, Purity %, Wastage %, Making Charges Per Gram, MOQ, and specific specifications (Occasion, Gender, Lock Type, Metal, Exchange Policy).
* **Product-Level Media Uploads**: 
  * Features **4 image slots** and **2 video slots** for general catalog rendering.
  * Clicking an empty slot opens the OS native file picker.
  * Instant local previews appear within 200ms using blob URLs (`URL.createObjectURL`).
  * Uploads automatically as `multipart/form-data` to `/api/media/upload` using a background thread and shows a spinner overlay. 
  * If the Design Code hasn't been entered or saved yet, files are temporarily cached as local blobs and uploaded upon saving the form.
* **Variant-Level Panels**: 
  * Add custom colors/styles (e.g., White Stone, Oxidized) under a product design.
  * Each variant panel contains its own **Variant Media Section** with **4 image slots** and **2 video slots** for variant-specific closeups.
  * Features the same click-to-add, preview, and delete (`❌`) mechanisms.

### 4. Stock & Inventory Control (`InventoryManagement.tsx`)
* **Granular Control**: Displays sizes and weights per variant.
* **Ready Stock Adjustments**: Admins can manually update physical available quantities (Ready Stock counts) which instantly syncs with the database to prevent overselling on the buyer storefront.

---

## 🛍️ Buyer Storefront: Functionality & Specifications

The Buyer Storefront serves as the wholesale B2B customer portal. Key modules include:

### 1. Live Price Spot Banner
* **Bullion Feed**: Displays live silver price per gram and per kilogram in the header banner.
* **Real-Time Ticker**: Listens to active price streams from the WebSocket fallback thread. Flashes price components dynamically to show active market ticks.

### 2. Buyer Product Detail Page (`BuyerProductDetail.tsx`)
* **Interactive Size Grid**: Renders available sizes (filtered standard sizing 5.0" to 11.0" for anklets).
* **Grid Selection Badges**: Active sizes display small quantity badges representing items already configured, enabling rapid multiple-size configuration on a single view.
* **Sticky Float Panel**:
  * Floating dynamic panel anchored to the top-right of the screen when scrolled down.
  * Displays the running total weight and approximate price of the buyer's current selection.
* **Variant-Specific Wishlist**:
  * Persistence is handled at the **Variant Level** (users can wishlist specific colorways/variants, not just general designs).
  * Syncs automatically with browser LocalStorage.

---

## ⚙️ Ready Stock vs. Make-to-Order (MTO) Architecture

Wholesale B2B buying requires separating immediate inventory from custom manufacturing queues.

![Mermaid Diagram](https://mermaid.ink/svg/c2VxdWVuY2VEaWFncmFtCiAgICBwYXJ0aWNpcGFudCBVc2VyIGFzIEIyQiBCdXllcgogICAgcGFydGljaXBhbnQgQ29uZmlnIGFzIFNpemUgQ29uZmlndXJhdG9yCiAgICBwYXJ0aWNpcGFudCBDYXJ0IGFzIEFwcENvbnRleHQgQ2FydCBTdGF0ZQoKICAgIFVzZXItPj5Db25maWc6IFNlbGVjdCBzaXplIChlLmcuIDguMjUgaW5jaCkKICAgIENvbmZpZy0+PkNvbmZpZzogUmVuZGVyIHNlbGVjdG9ycyBmb3IgUmVhZHkgU3RvY2sgJiBNVE8KICAgIFVzZXItPj5Db25maWc6IElucHV0IFF0eSAoZS5nLiBSZWFkeSA1LCBNVE8gMTApCiAgICBOb3RlIG92ZXIgQ29uZmlnOiBDYWxjdWxhdGUgUHVyZSBXZWlnaHQsIFRvdGFsIFdlaWdodCBhbmQgQXBwcm94IFByaWNlCiAgICBVc2VyLT4+Q29uZmlnOiBDbGljayBBZGQgU2l6ZSB0byBTZWxlY3Rpb24KICAgIE5vdGUgb3ZlciBDb25maWc6IFB1c2ggY29uZmlnIHRvIGxvY2FsIHBhZ2Ugc3RhdGUKICAgIFVzZXItPj5Db25maWc6IENsaWNrIEFkZCBTZWxlY3RlZCBTaXplcyB0byBDYXJ0CiAgICBhbHQgTm90IExvZ2dlZCBJbgogICAgICAgIENvbmZpZy0+PlVzZXI6IE9wZW4gTG9naW4gRGlhbG9nIE1vZGFsCiAgICBlbHNlIFN1bShRdHkpIDwgTU9RCiAgICAgICAgQ29uZmlnLT4+VXNlcjogQWxlcnQgT3JkZXIgcXVhbnRpdHkgbXVzdCBtZWV0IERlc2lnbiBNT1EKICAgIGVsc2UgVmFsaWQKICAgICAgICBDb25maWctPj5DYXJ0OiBEaXNwYXRjaCBpdGVtcyB3aXRoIGxvY2tlZCBwcmljZSBkZXRhaWxzCiAgICAgICAgTm90ZSBvdmVyIENhcnQ6IFByaWNlIExvY2sgUG9saWN5IC0gRnJlZXplIGxpdmUgcHJpY2UgcmF0ZXMKICAgIGVuZA==)

<details>
<summary>🔍 View Editable Diagram Code</summary>

```mermaid
sequenceDiagram
    participant User as B2B Buyer
    participant Config as Size Configurator
    participant Cart as AppContext Cart State

    User->>Config: Select size (e.g. 8.25 inch)
    Config->>Config: Render selectors for Ready Stock & MTO
    User->>Config: Input Qty (e.g. Ready 5, MTO 10)
    Note over Config: Calculate Pure Weight, Total Weight and Approx Price
    User->>Config: Click Add Size to Selection
    Note over Config: Push config to local page state
    User->>Config: Click Add Selected Sizes to Cart
    alt Not Logged In
        Config->>User: Open Login Dialog Modal
    else Sum(Qty) < MOQ
        Config->>User: Alert Order quantity must meet Design MOQ
    else Valid
        Config->>Cart: Dispatch items with locked price details
        Note over Cart: Price Lock Policy - Freeze live price rates
    end
```
</details>

### 1. Ready Stock Allocations
* Checked dynamically against the database column `stock_available` in the `variant_sizes` table.
* The quantity input is capped at the maximum physical stock available to prevent overselling.

### 2. Make-to-Order (MTO) Allocations
* Unlimited input quantities.
* Production lead time is indicated as **7-10 business days**.
* **Checkout Split Flow**: When a buyer submits an order, the FastAPI checkout endpoint inspects each item's type. If `order_type == "make_order"`, it automatically creates an active entry in the `manufacturing_orders` queue table for tracking casting, finishing, polishing, and QC milestones.

### 3. Dynamic Calculation Formulas (On-The-Fly)
* **Pure Weight (Fine Metal)**:  
  $$\text{Pure Weight} = (\text{Ready Qty} + \text{MTO Qty}) \times \text{Weight} \times \frac{\text{Purity}}{100}$$
* **Total Weight**:  
  $$\text{Total Weight} = (\text{Ready Qty} + \text{MTO Qty}) \times \text{Weight}$$
* **Price Per Piece (B2B Formula)**:  
  $$\text{Base Silver Price} = \text{Weight} \times \left(1 + \frac{\text{Wastage}\%}{100}\right) \times \text{Live Gram Rate}$$
  $$\text{Making Charge} = \text{Weight} \times \text{Making Charge Per Gram}$$
  $$\text{GST} = (\text{Base Silver Price} + \text{Making Charge}) \times 3\%$$
  $$\text{Total Price Per Piece} = \text{Base Price} + \text{Making Charge} + \text{GST}$$

### 4. Cart Drawer & Price Lock Policy
* **Drawer Dimensions**: Widened to `max-w-xl` (576px) to cleanly render nested collections.
* **Variant Grouping**: Cart items are grouped by product variant. A sub-table displays the distinct size inputs, Ready/MTO designations, individual item adjusters, and totals.
* **Quantity Limits**: Cart quantities can be adjusted down to a minimum of 1 piece (enforcing MOQ only at the initial catalog add-to-cart phase).
* **Price Lock Policy**: Bullion rates change constantly. Once an item is added to the cart, the price breakdown is frozen. All subsequent WebSockets updates bypass the cart items to guarantee B2B buyers a stable invoice quote during checkout.

---

## 🚀 Supabase Migration Note
This application is fully prepared to migrate from SQLite to **Supabase** in production:
1. Since **SQLAlchemy ORM** is used, database operations are database-agnostic.
2. In `backend/app/database.py`, simply swap the `DATABASE_URL` with the Supabase connection string:
   ```python
   DATABASE_URL = "postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
   ```
3. Install PostgreSQL client: `pip install psycopg2-binary`.
4. Run a simple migration script to copy local SQLite data tables to Supabase PostgreSQL.
