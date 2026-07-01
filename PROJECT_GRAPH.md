# 🏪 SR Chains — Ecommerce Project Graph

> **Project:** SR Chains Wholesale B2B Silver Jewelry Platform  
> **Stack:** FastAPI + SQLite + React (TypeScript) + Vite + TailwindCSS  
> Tags: #ecommerce #fastapi #react #b2b #silver #jewelry

---

## 📁 Project Structure

```
ecommerce/
├── backend/          → [[Backend]]
│   └── app/
│       ├── main.py         → [[Main Entry]]
│       ├── database.py     → [[Database]]
│       ├── models/         → [[DB Models]]
│       ├── routers/        → [[API Routers]]
│       └── schemas/        → [[Pydantic Schemas]]
└── frontend/         → [[Frontend]]
    └── src/
        ├── App.tsx         → [[App Root]]
        ├── components/     → [[UI Components]]
        └── context/        → [[App Context]]
```

---

## 🗄️ Database Models — ER Diagram

```mermaid
erDiagram
    CATEGORY {
        int id PK
        string name
        int parent_id FK
    }
    PRODUCT_DESIGN {
        int id PK
        string design_code UK
        string name
        int category_id FK
        string collection
        string tags
        float purity
        float making_charge_per_gram
        float wastage_percent
        float gst_percent
        int moq
        string metal
        string weight_range
        string finishing
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
        string file_name
        string file_type
        string file_size
        string url
        string category
        datetime uploaded_at
    }
    ORDER {
        int id PK
        string order_number UK
        string customer_name
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
        datetime updated_at
    }

    CATEGORY ||--o{ CATEGORY : "parent → child"
    CATEGORY ||--o{ PRODUCT_DESIGN : "has designs"
    PRODUCT_DESIGN ||--o{ PRODUCT_VARIANT : "has variants"
    PRODUCT_DESIGN ||--o{ MEDIA_ITEM : "has media"
    PRODUCT_VARIANT ||--o{ VARIANT_SIZE : "has sizes"
    ORDER ||--o{ ORDER_ITEM : "contains items"
    ORDER_ITEM ||--o| MANUFACTURING_ORDER : "may have MFG detail"
```

---

## 🌳 Category Tree

```mermaid
graph TD
    ROOT["🏷️ Root Categories"]
    DW["📌 Daily Wear"]
    BW["💍 Bridal Wear"]
    AA["🪙 Antique Anklets"]
    BC["🔔 Bell Collection"]
    SC["💎 Stone Collection"]

    ROOT --> DW
    ROOT --> BW
    ROOT --> AA
    DW --> BC
    DW --> SC

    BC -->|"ANK-1025"| P1["🦶 Floral Bell Anklet"]
    SC -->|"ANK-1026"| P2["🦶 Classic Bead Anklet"]

    style ROOT fill:#1a1a2e,color:#fff,stroke:#6c63ff
    style DW fill:#16213e,color:#e0e0e0,stroke:#6c63ff
    style BW fill:#16213e,color:#e0e0e0,stroke:#6c63ff
    style AA fill:#16213e,color:#e0e0e0,stroke:#6c63ff
    style BC fill:#0f3460,color:#fff,stroke:#e94560
    style SC fill:#0f3460,color:#fff,stroke:#e94560
    style P1 fill:#533483,color:#fff,stroke:#e94560
    style P2 fill:#533483,color:#fff,stroke:#e94560
```

---

## 🔗 Product Design → Variant → Size Chain

```mermaid
graph LR
    D["🎨 ProductDesign\nANK-1025\nFloral Bell Anklet"]

    D --> V1["🔵 Variant\nANK-1025-WHT\nWhite Stone"]
    D --> V2["🟢 Variant\nANK-1025-GRN\nGreen Stone"]
    D --> V3["🔴 Variant\nANK-1025-RUB\nRuby Stone"]
    D --> V4["⚫ Variant\nANK-1025-BLK\nBlack Beads"]
    D --> M["🖼️ MediaItems\n18 Images + 4 Videos"]

    V1 --> S1["📏 Sizes\n4.5 → 12.5\n(step 0.25)"]
    V2 --> S2["📏 Sizes\n4.5 → 12.5"]
    V3 --> S3["📏 Sizes\n4.5 → 12.5"]
    V4 --> S4["📏 Sizes\n4.5 → 12.5"]

    style D fill:#6c63ff,color:#fff
    style V1 fill:#3a86ff,color:#fff
    style V2 fill:#2dc653,color:#fff
    style V3 fill:#e94560,color:#fff
    style V4 fill:#333,color:#fff
    style M fill:#f4a261,color:#000
```

---

## 🛒 Order Flow

```mermaid
stateDiagram-v2
    [*] --> Pending : Order Created
    Pending --> Processing : Payment Confirmed
    Processing --> Completed : Shipped & Delivered
    Processing --> Cancelled : Cancelled by Buyer

    state Processing {
        [*] --> MFG_Pending : Make-to-Order item
        MFG_Pending --> ProductionStarted
        ProductionStarted --> Casting
        Casting --> Finishing
        Finishing --> Polishing
        Polishing --> QC
        QC --> ReadyToShip
        ReadyToShip --> [*]
    }

    Completed --> [*]
    Cancelled --> [*]
```

---

## 🌐 API Routes Map

```mermaid
graph LR
    API["🚀 FastAPI\nmain.py"]

    API --> PR["📦 /api/products\nrouters/products.py"]
    API --> OR["🛒 /api/orders\nrouters/orders.py"]
    API --> MR["🖼️ /api/media\nrouters/media.py"]
    API --> LP["💰 /api/live-price\nrouters/live_price.py"]

    PR --> PR1["GET /products"]
    PR --> PR2["POST /products"]
    PR --> PR3["GET /products/{id}"]
    PR --> PR4["PUT /products/{id}"]
    PR --> PR5["DELETE /products/{id}"]
    PR --> PR6["GET /categories"]
    PR --> PR7["POST /categories"]
    PR --> PR8["GET /inventory"]

    OR --> OR1["GET /orders"]
    OR --> OR2["POST /orders"]
    OR --> OR3["GET /orders/{id}"]
    OR --> OR4["PUT /orders/{id}/status"]

    MR --> MR1["POST /media/upload"]
    MR --> MR2["GET /media/{design_id}"]
    MR --> MR3["DELETE /media/{id}"]

    LP --> LP1["GET /live-price\n(polls Vijay Bullion)"]

    style API fill:#6c63ff,color:#fff
    style PR fill:#3a86ff,color:#fff
    style OR fill:#2dc653,color:#fff
    style MR fill:#f4a261,color:#000
    style LP fill:#e94560,color:#fff
```

---

## ⚛️ Frontend Component Tree

```mermaid
graph TD
    ROOT["⚛️ main.tsx"]
    APP["🏠 App.tsx\nRouting + Layout"]
    CTX["🌐 AppContext.tsx\nGlobal State"]

    ROOT --> CTX
    ROOT --> APP

    APP --> SB["🧭 Sidebar.tsx\nNavigation"]
    APP --> DB["📊 Dashboard.tsx\nStats + Overview"]
    APP --> PF["📝 ProductForm.tsx\nCreate/Edit Products"]
    APP --> DD["🎨 DesignDetail.tsx\nProduct Detail View"]
    APP --> IM["📦 InventoryManagement.tsx\nStock Control"]
    APP --> CM["🏷️ CategoryManagement.tsx\nCategory Tree CRUD"]
    APP --> ML["🖼️ MediaLibrary.tsx\nImage/Video Gallery"]
    APP --> BS["🏪 BuyerStorefront.tsx\nB2B Buyer Browse"]
    APP --> BD["🛍️ BuyerProductDetail.tsx\nBuyer Product View"]

    CTX -.->|"provides state"| APP
    CTX -.->|"provides state"| DB
    CTX -.->|"provides state"| PF
    CTX -.->|"provides state"| IM

    style ROOT fill:#1a1a2e,color:#eee,stroke:#6c63ff
    style APP fill:#16213e,color:#eee,stroke:#6c63ff
    style CTX fill:#0f3460,color:#eee,stroke:#e94560
    style SB fill:#533483,color:#fff
    style DB fill:#533483,color:#fff
    style PF fill:#533483,color:#fff
    style DD fill:#533483,color:#fff
    style IM fill:#533483,color:#fff
    style CM fill:#533483,color:#fff
    style ML fill:#533483,color:#fff
    style BS fill:#3a86ff,color:#fff
    style BD fill:#3a86ff,color:#fff
```

---

## 💰 Live Price Calculation Flow

```mermaid
flowchart LR
    VS["🔗 Vijay Bullion\nWebsite\n(scrape every 10s)"]
    DB2["💾 SQLite DB\nlive_price cache"]
    API2["⚡ FastAPI\n/live-price endpoint"]
    FE["⚛️ React Frontend\nProductForm / BuyerView"]

    VS -->|"silver_gram_rate\nsilver_kg_rate"| DB2
    DB2 -->|"cached rate"| API2
    API2 -->|"JSON response"| FE

    FE -->|"rate × weight\n+ making charge\n+ wastage%\n+ GST 3%"| PRICE["💲 Final Price\nper piece"]

    style VS fill:#e94560,color:#fff
    style DB2 fill:#6c63ff,color:#fff
    style API2 fill:#3a86ff,color:#fff
    style FE fill:#2dc653,color:#000
    style PRICE fill:#f4a261,color:#000
```

---

## 🔄 Full Data Flow — End to End

```mermaid
sequenceDiagram
    participant B as 🛍️ Buyer (Frontend)
    participant A as ⚡ FastAPI Backend
    participant DB as 💾 SQLite DB
    participant VS as 🔗 Vijay Bullion

    B->>A: GET /live-price
    A->>VS: Scrape silver rate
    VS-->>A: silver_gram_rate
    A-->>B: Live price JSON

    B->>A: GET /products (browse catalog)
    A->>DB: SELECT product_designs + variants + sizes
    DB-->>A: Product list
    A-->>B: Product catalog JSON

    B->>A: POST /orders (place order)
    A->>DB: INSERT order + order_items
    DB-->>A: Order created
    A-->>B: Order confirmation

    note over A,DB: If order_type = make_order
    A->>DB: INSERT manufacturing_order
    DB-->>A: MFG order created
```

---

## 🗂️ Pydantic Schema Hierarchy

```mermaid
graph TD
    subgraph "Product Schemas"
        PDB["ProductDesignBase"]
        PDC["ProductDesignCreate\nextends Base\n+ variants[]\n+ media[]"]
        PDR["ProductDesignResponse\nextends Base\n+ id, created_at\n+ variants[], media[]"]
    end

    subgraph "Variant Schemas"
        PVB["ProductVariantBase"]
        PVC["ProductVariantCreate\n+ sizes[]"]
        PVR["ProductVariantResponse\n+ id, design_id, sizes[]"]
    end

    subgraph "Size Schemas"
        VSB["VariantSizeBase"]
        VSC["VariantSizeCreate"]
        VSR["VariantSizeResponse\n+ id, variant_id"]
    end

    subgraph "Order Schemas"
        OB["OrderBase"]
        OC["OrderCreate\n+ items[]"]
        OR2["OrderResponse\n+ id, order_number\n+ order_date, status\n+ items[]"]
    end

    subgraph "Media Schemas"
        MB["MediaItemBase"]
        MC["MediaItemCreate"]
        MR2["MediaItemResponse\n+ id, design_id\n+ uploaded_at"]
    end

    PDB --> PDC
    PDB --> PDR
    PDC --> |"contains"| PVC
    PDR --> |"contains"| PVR

    PVB --> PVC
    PVB --> PVR
    PVC --> |"contains"| VSC
    PVR --> |"contains"| VSR

    VSB --> VSC
    VSB --> VSR

    OB --> OC
    OB --> OR2

    MB --> MC
    MB --> MR2

    style PDB fill:#6c63ff,color:#fff
    style PVB fill:#3a86ff,color:#fff
    style VSB fill:#2dc653,color:#000
    style OB fill:#e94560,color:#fff
    style MB fill:#f4a261,color:#000
```

---

## 🔑 Key Concepts & Links

| Concept | Description | Related Files |
|---|---|---|
| [[Category]] | Self-referencing tree (parent → child) | `models/models.py` |
| [[ProductDesign]] | Core product entity with pricing rules | `models/models.py` |
| [[ProductVariant]] | Color/style variation of a design | `models/models.py` |
| [[VariantSize]] | Size + weight + stock per variant | `models/models.py` |
| [[MediaItem]] | Images & videos linked to a design | `models/models.py` |
| [[Order]] | Customer order header | `models/models.py` |
| [[OrderItem]] | Line item in an order | `models/models.py` |
| [[ManufacturingOrder]] | Make-to-order tracking | `models/models.py` |
| [[LivePrice]] | Real-time silver price from Vijay Bullion | `routers/live_price.py` |
| [[AppContext]] | Global React state (cart, products, etc.) | `context/AppContext.tsx` |

---

## 📌 Tags

#backend #frontend #database #fastapi #react #sqlite #b2b #jewelry #silver #anklets #ecommerce #sr-chains
