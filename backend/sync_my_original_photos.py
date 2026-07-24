"""
Run this script ON COMPUTER #1 (the computer where you originally uploaded your photos).
It will take all your actual original image files from backend/uploads/ and push them to Supabase!
"""
import os
import base64
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(backend_dir, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in .env file!")
    exit(1)

uploads_dir = os.path.join(backend_dir, "uploads")
if not os.path.exists(uploads_dir):
    print(f"❌ ERROR: uploads folder not found at {uploads_dir}")
    exit(1)

local_files = os.listdir(uploads_dir)
image_files = [f for f in local_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))]

print(f"============================================================")
print(f"🚀 Found {len(image_files)} original image files in backend/uploads/")
print(f"============================================================")

if len(image_files) == 0:
    print("⚠️ No local image files found in backend/uploads/. Make sure you run this on Computer #1!")
    exit(0)

engine = create_engine(DATABASE_URL)
updated_count = 0

with engine.connect() as conn:
    for filename in image_files:
        filepath = os.path.join(uploads_dir, filename)
        try:
            with open(filepath, "rb") as img_file:
                bytes_data = img_file.read()
                
            ext = os.path.splitext(filename)[1].lower().replace('.', '')
            mime_type = "image/jpeg" if ext in ["jpg", "jpeg"] else f"image/{ext}"
            b64_str = base64.b64encode(bytes_data).decode("utf-8")
            data_url = f"data:{mime_type};base64,{b64_str}"
            
            # Match database records by filename in URL or file_name column
            result = conn.execute(
                text("UPDATE media_items SET url = :url WHERE url LIKE :like_pattern OR file_name = :fname"),
                {"url": data_url, "like_pattern": f"%{filename}%", "fname": filename}
            )
            if result.rowcount > 0:
                updated_count += result.rowcount
                print(f"✅ Synced original photo '{filename}' -> Supabase ({round(len(bytes_data)/1024, 1)} KB)")
        except Exception as e:
            print(f"⚠️ Could not process '{filename}': {e}")
            
    conn.commit()

print(f"\n============================================================")
print(f"🎉 SUCCESS: {updated_count} of YOUR ORIGINAL PHOTOS were pushed to Supabase Cloud!")
print(f"Now open your second computer—your actual photos will appear!")
print(f"============================================================")
