"""
Migration & Sync Script for SR Chains Wholesale B2B
Migrates SQLite database (sr_chains.db) directly to Supabase PostgreSQL or Supabase REST API.
"""

import os
import sys
import json
import sqlite3
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://xmpwzhkwwpdnunjkwcno.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_MwgtOWxhm6QPMODmpB_wVw_goyCn187")
DATABASE_URL = os.getenv("DATABASE_URL", "")

def get_sqlite_data():
    sqlite_db_path = os.path.join(os.path.dirname(__file__), "sr_chains.db")
    if not os.path.exists(sqlite_db_path):
        print(f"[!] SQLite database file not found at {sqlite_db_path}")
        return None

    conn = sqlite3.connect(sqlite_db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    tables = ['categories', 'product_designs', 'product_variants', 'variant_sizes', 'media_items', 'orders', 'order_items', 'manufacturing_orders', 'customers', 'worker_orders']
    data = {}

    for table in tables:
        try:
            cur.execute(f"SELECT * FROM {table}")
            rows = [dict(row) for row in cur.fetchall()]
            data[table] = rows
            print(f"[+] Loaded {len(rows)} records from SQLite table '{table}'")
        except Exception as e:
            print(f"[!] Warning loading '{table}': {e}")
            data[table] = []

    conn.close()
    return data


def chunk_list(lst, n=50):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


def migrate_via_sqlalchemy(target_url: str, data: dict):
    print(f"\n[+] Connecting to Supabase PostgreSQL at:\n   {target_url.split('@')[-1] if '@' in target_url else target_url}")

    # Fix postgres:// to postgresql:// if needed
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(target_url)

    # Import models to create tables
    from app.models.models import Base
    print("[+] Creating database tables in Supabase...")
    Base.metadata.create_all(bind=engine)
    print("[+] All database tables created successfully in Supabase!")

    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # 1. Categories
        if data.get('categories'):
            print(f"[+] Migrating {len(data['categories'])} categories...")
            for chunk in chunk_list(data['categories']):
                db.execute(text("""
                    INSERT INTO categories (id, name, parent_id)
                    VALUES (:id, :name, :parent_id)
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id
                """), chunk)
            db.commit()

        # 2. Product Designs
        if data.get('product_designs'):
            print(f"[+] Migrating {len(data['product_designs'])} product designs...")
            for d in data['product_designs']:
                d['returnable'] = bool(d.get('returnable'))
                d['exchangeable'] = bool(d.get('exchangeable'))
            for chunk in chunk_list(data['product_designs']):
                db.execute(text("""
                    INSERT INTO product_designs (
                        id, design_code, name, category_id, collection, tags, purity,
                        making_charge_per_gram, wastage_percent, gst_percent, moq,
                        price_lock_minutes, status, metal, weight_range, finishing,
                        occasion, style, gender, lock_type, returnable, exchangeable, created_at
                    ) VALUES (
                        :id, :design_code, :name, :category_id, :collection, :tags, :purity,
                        :making_charge_per_gram, :wastage_percent, :gst_percent, :moq,
                        :price_lock_minutes, :status, :metal, :weight_range, :finishing,
                        :occasion, :style, :gender, :lock_type, :returnable, :exchangeable, :created_at
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        design_code = EXCLUDED.design_code,
                        name = EXCLUDED.name,
                        category_id = EXCLUDED.category_id,
                        collection = EXCLUDED.collection,
                        status = EXCLUDED.status
                """), chunk)
            db.commit()

        # 3. Product Variants
        if data.get('product_variants'):
            print(f"[+] Migrating {len(data['product_variants'])} product variants...")
            for chunk in chunk_list(data['product_variants']):
                db.execute(text("""
                    INSERT INTO product_variants (id, design_id, variant_code, variant_name, status)
                    VALUES (:id, :design_id, :variant_code, :variant_name, :status)
                    ON CONFLICT (id) DO UPDATE SET variant_code = EXCLUDED.variant_code, variant_name = EXCLUDED.variant_name
                """), chunk)
            db.commit()

        # 4. Variant Sizes
        if data.get('variant_sizes'):
            print(f"[+] Migrating {len(data['variant_sizes'])} variant sizes...")
            for chunk in chunk_list(data['variant_sizes']):
                db.execute(text("""
                    INSERT INTO variant_sizes (id, variant_id, size, weight, stock_available, stock_reserved, moq, status)
                    VALUES (:id, :variant_id, :size, :weight, :stock_available, :stock_reserved, :moq, :status)
                    ON CONFLICT (id) DO UPDATE SET stock_available = EXCLUDED.stock_available, stock_reserved = EXCLUDED.stock_reserved
                """), chunk)
            db.commit()

        # 5. Media Items
        if data.get('media_items'):
            print(f"[+] Migrating {len(data['media_items'])} media items...")
            for chunk in chunk_list(data['media_items'], 20):
                db.execute(text("""
                    INSERT INTO media_items (id, design_id, variant_id, file_name, file_type, file_size, url, category, uploaded_at)
                    VALUES (:id, :design_id, :variant_id, :file_name, :file_type, :file_size, :url, :category, :uploaded_at)
                    ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url
                """), chunk)
            db.commit()

        # 6. Customers
        if data.get('customers'):
            print(f"[+] Migrating {len(data['customers'])} customers...")
            for chunk in chunk_list(data['customers']):
                db.execute(text("""
                    INSERT INTO customers (id, name, mobile_number, email, password_hash, order_number, created_at)
                    VALUES (:id, :name, :mobile_number, :email, :password_hash, :order_number, :created_at)
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, mobile_number = EXCLUDED.mobile_number
                """), chunk)
            db.commit()

        # 7. Orders & Order Items
        if data.get('orders'):
            print(f"[+] Migrating {len(data['orders'])} orders...")
            for chunk in chunk_list(data['orders']):
                db.execute(text("""
                    INSERT INTO orders (id, order_number, customer_name, mobile_number, order_date, status)
                    VALUES (:id, :order_number, :customer_name, :mobile_number, :order_date, :status)
                    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status
                """), chunk)
            db.commit()

        if data.get('order_items'):
            print(f"[+] Migrating {len(data['order_items'])} order items...")
            for chunk in chunk_list(data['order_items']):
                db.execute(text("""
                    INSERT INTO order_items (id, order_id, design_code, variant_code, size, weight, quantity, order_type, price)
                    VALUES (:id, :order_id, :design_code, :variant_code, :size, :weight, :quantity, :order_type, :price)
                    ON CONFLICT (id) DO NOTHING
                """), chunk)
            db.commit()

        # 8. Worker Orders
        if data.get('worker_orders'):
            valid_size_ids = set(s['id'] for s in data.get('variant_sizes', []))
            valid_worker_orders = [wo for wo in data['worker_orders'] if wo.get('variant_size_id') in valid_size_ids]
            if valid_worker_orders:
                print(f"[+] Migrating {len(valid_worker_orders)} worker orders...")
                for chunk in chunk_list(valid_worker_orders):
                    db.execute(text("""
                        INSERT INTO worker_orders (id, customer_name, mobile_number, variant_size_id, quantity, status)
                        VALUES (:id, :customer_name, :mobile_number, :variant_size_id, :quantity, :status)
                        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status
                    """), chunk)
        # 9. Sync PostgreSQL Sequences
        print("[+] Synchronizing PostgreSQL primary key auto-increment sequences...")
        seq_tables = ['product_designs', 'product_variants', 'variant_sizes', 'categories', 'media_items', 'orders', 'order_items', 'customers', 'worker_orders']
        for t in seq_tables:
            try:
                db.execute(text(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), COALESCE(max(id), 1)) FROM {t}"))
            except Exception:
                pass
        db.commit()

        print("\n[+] SUCCESS! All SQLite data has been migrated directly to Supabase!")

    except Exception as e:
        db.rollback()
        print(f"[!] Error migrating data to Supabase: {e}")
        raise e
    finally:
        db.close()


def main():
    print("=" * 60)
    print("   SR CHAINS -- Direct Supabase Database Migration Tool")
    print("=" * 60)
    print(f"[+] Supabase Project URL: {SUPABASE_URL}")
    print(f"[+] Supabase Publishable Key: {SUPABASE_KEY[:20]}...")

    data = get_sqlite_data()
    if not data:
        return

    # Check if DATABASE_URL is PostgreSQL
    target_db = DATABASE_URL
    if not target_db or "sqlite" in target_db:
        print("\n[*] NOTE: To connect directly via PostgreSQL connection string:")
        print("   Set DATABASE_URL in your backend/.env to your Supabase PostgreSQL connection string.")
        print("   Format: postgresql://postgres.[project-id]:[password]@db.[project-id].supabase.co:5432/postgres")
        
        db_input = input("\nEnter your Supabase PostgreSQL Connection String (or press Enter to exit): ").strip()
        if db_input:
            target_db = db_input

    if target_db and "sqlite" not in target_db:
        migrate_via_sqlalchemy(target_db, data)
    else:
        print("\n[*] Migration paused. Update DATABASE_URL in backend/.env with your Supabase DB Password.")

if __name__ == "__main__":
    main()
