"""
Database migration: swap uniqueness from design_code -> name on product_designs table.

SQLite does NOT support ALTER COLUMN, so we:
  1. Rename old table to a backup (if not already done)
  2. Create new table with correct constraints
  3. Copy all data over
  4. Drop the backup table

Run ONCE: venv\Scripts\python.exe migrate_unique_swap.py
"""
import sqlite3
import sys

DB_PATH = "sr_chains.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

print("Starting migration: swap unique constraint from design_code -> name ...")

# Check what tables currently exist
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("  Tables found:", tables)

has_main    = "product_designs" in tables
has_backup  = "product_designs_backup" in tables

# ── Step 1: Rename old table (skip if already renamed from a previous partial run) ──
if has_main and not has_backup:
    cur.execute("ALTER TABLE product_designs RENAME TO product_designs_backup")
    conn.commit()
    print("  OK: Renamed product_designs -> product_designs_backup")
elif has_backup and not has_main:
    print("  SKIP: product_designs already renamed to backup in a previous run")
elif has_main and has_backup:
    print("  WARN: Both tables exist. Dropping old product_designs and using backup.")
    cur.execute("DROP TABLE product_designs")
    conn.commit()
else:
    print("  ERROR: product_designs_backup not found and no main table either!")
    conn.close()
    sys.exit(1)

# ── Step 2: Create new table — design_code NOT unique, name UNIQUE ──
cur.execute("""
CREATE TABLE IF NOT EXISTS product_designs (
    id INTEGER PRIMARY KEY,
    design_code VARCHAR NOT NULL,
    name VARCHAR NOT NULL UNIQUE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    collection VARCHAR,
    tags VARCHAR,
    purity FLOAT DEFAULT 92.5,
    making_charge_per_gram FLOAT DEFAULT 15.0,
    wastage_percent FLOAT DEFAULT 10.0,
    gst_percent FLOAT DEFAULT 3.0,
    moq INTEGER DEFAULT 10,
    price_lock_minutes INTEGER DEFAULT 10,
    status VARCHAR DEFAULT 'Active',
    metal VARCHAR DEFAULT 'Silver 925',
    weight_range VARCHAR,
    finishing VARCHAR DEFAULT 'High Polish',
    occasion VARCHAR DEFAULT 'Daily Wear',
    style VARCHAR,
    gender VARCHAR DEFAULT 'Women',
    lock_type VARCHAR DEFAULT 'S-Hook',
    returnable BOOLEAN DEFAULT 1,
    exchangeable BOOLEAN DEFAULT 1,
    created_at DATETIME
)
""")
conn.commit()
print("  OK: Created new product_designs table (name=UNIQUE, design_code=NOT unique)")

# ── Step 3: Copy all data ──
cur.execute("SELECT COUNT(*) FROM product_designs")
already_copied = cur.fetchone()[0]
if already_copied == 0:
    cur.execute("""
    INSERT INTO product_designs
    SELECT id, design_code, name, category_id, collection, tags, purity,
           making_charge_per_gram, wastage_percent, gst_percent, moq, price_lock_minutes,
           status, metal, weight_range, finishing, occasion, style, gender, lock_type,
           returnable, exchangeable, created_at
    FROM product_designs_backup
    """)
    conn.commit()
    print(f"  OK: Copied {cur.rowcount} rows to new table")
else:
    print(f"  SKIP: New table already has {already_copied} rows (data already copied)")

# ── Step 4: Recreate indexes ──
cur.execute("CREATE INDEX IF NOT EXISTS ix_product_designs_design_code ON product_designs (design_code)")
cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_product_designs_name ON product_designs (name)")
conn.commit()
print("  OK: Created indexes (design_code=regular index, name=unique index)")

# ── Step 5: Drop backup ──
cur.execute("DROP TABLE IF EXISTS product_designs_backup")
conn.commit()
print("  OK: Dropped backup table")

conn.close()

print()
print("Migration complete! Restart the backend server.")
print("  - design_code: allowed to repeat (NOT unique)")
print("  - name:        must be unique across all designs")
