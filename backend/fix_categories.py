"""
Auto-fix script: corrects category_id for products whose category
is not visible in the sidebar (orphaned from root category tree).

HOW IT WORKS:
  - Finds all root categories (Flower, Titanic, Kushboo, Pakija, etc.)
  - Finds designs where category_id is NOT reachable from any root
  - Tries to match them to the right category using the design's
    collection name, design name, or design_code prefix
  - Updates the category_id to the matching root category

Run: venv\Scripts\python.exe fix_categories.py
"""
import sqlite3
import re

DB_PATH = "sr_chains.db"
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# ── 1. Load all categories ──────────────────────────────────────────────────
cur.execute("SELECT id, name, parent_id FROM categories ORDER BY id")
categories = cur.fetchall()
cat_by_id = {r["id"]: dict(r) for r in categories}

# Build parent→children map
children_of = {}
for c in categories:
    pid = c["parent_id"]
    children_of.setdefault(pid, [])
    children_of[pid].append(c["id"])

def get_subtree_ids(root_id):
    ids = [root_id]
    for child_id in children_of.get(root_id, []):
        ids.extend(get_subtree_ids(child_id))
    return ids

root_ids = [c["id"] for c in categories if c["parent_id"] is None]
all_reachable = set()
for rid in root_ids:
    for cid in get_subtree_ids(rid):
        all_reachable.add(cid)

print("=" * 60)
print("CATEGORIES")
print("=" * 60)
for c in categories:
    parent = cat_by_id.get(c["parent_id"], {}).get("name", "(root)") if c["parent_id"] else "(root)"
    subtree = get_subtree_ids(c["id"])
    print(f"  id={c['id']:3d}  '{c['name']}'  parent={c['parent_id']} ({parent})  subtree={subtree}")

# ── 2. Load all designs ─────────────────────────────────────────────────────
cur.execute("""
    SELECT pd.id, pd.design_code, pd.name, pd.collection, pd.category_id, pd.status,
           c.name as cat_name, c.parent_id as cat_parent_id
    FROM product_designs pd
    LEFT JOIN categories c ON pd.category_id = c.id
    ORDER BY c.name NULLS LAST, pd.design_code
""")
designs = cur.fetchall()

print("\n" + "=" * 60)
print("ALL DESIGNS")
print("=" * 60)
for d in designs:
    reachable = "✓" if d["category_id"] in all_reachable else "⚠ ORPHAN"
    print(f"  [{d['status']:8s}] {reachable:10s} | {d['design_code']:20s} | cat_id={d['category_id']} '{d['cat_name']}' | collection='{d['collection']}'")

# ── 3. Find orphaned designs ────────────────────────────────────────────────
orphaned = [d for d in designs if d["category_id"] not in all_reachable]

print(f"\n{'=' * 60}")
print(f"ORPHANED DESIGNS: {len(orphaned)}")
print("=" * 60)

if not orphaned:
    print("  ✓ No orphaned designs found! All products are properly categorized.")
    print()
    print("  Possible issue: A sub-category (e.g. 'Flower-02', 'Flower-03') has")
    print("  wrong parent_id so it doesn't appear under 'Flower' in the sidebar.")
    print()
    
    # Diagnose sub-category parent issues
    print("  SIDEBAR COUNTS per root category:")
    for rid in root_ids:
        subtree = set(get_subtree_ids(rid))
        count = sum(1 for d in designs if d["status"] == "Active" and d["category_id"] in subtree)
        print(f"    '{cat_by_id[rid]['name']}' → {count} active designs (subtree ids: {sorted(subtree)})")
    
    total_active = sum(1 for d in designs if d["status"] == "Active")
    total_counted = sum(
        sum(1 for d in designs if d["status"] == "Active" and d["category_id"] in set(get_subtree_ids(rid)))
        for rid in root_ids
    )
    print(f"\n  Total active designs: {total_active}")
    print(f"  Total counted in sidebar: {total_counted}")
    if total_active != total_counted:
        diff = total_active - total_counted
        print(f"  ⚠ MISMATCH: {diff} active designs are NOT counted in any sidebar category!")
        print()
        for d in designs:
            if d["status"] == "Active" and d["category_id"] not in all_reachable:
                print(f"    Missing: {d['design_code']} | category_id={d['category_id']} ('{d['cat_name']}')")
else:
    print(f"\nFound {len(orphaned)} orphaned design(s):")
    
    # Try to auto-fix by matching collection → root category name
    fixes = []
    for d in orphaned:
        collection = (d["collection"] or "").lower()
        design_name = (d["name"] or "").lower()
        design_code = (d["design_code"] or "").lower()
        
        best_match = None
        best_score = 0
        
        for rid in root_ids:
            root_name = cat_by_id[rid]["name"].lower()
            score = 0
            if root_name in collection:
                score = 10
            elif root_name in design_name:
                score = 8
            elif root_name in design_code:
                score = 6
            elif collection.startswith(root_name[:4]):
                score = 4
            
            if score > best_score:
                best_score = score
                best_match = rid
        
        if best_match and best_score > 0:
            fixes.append({
                "design_id": d["id"],
                "design_code": d["design_code"],
                "old_cat_id": d["category_id"],
                "old_cat_name": d["cat_name"],
                "new_cat_id": best_match,
                "new_cat_name": cat_by_id[best_match]["name"],
                "collection": d["collection"],
            })
            print(f"  ✓ {d['design_code']} (collection='{d['collection']}') → reassign to '{cat_by_id[best_match]['name']}' (id={best_match})")
        else:
            print(f"  ⚠ {d['design_code']} (collection='{d['collection']}') → could NOT find a matching category (manual fix needed)")
    
    if fixes:
        confirm = input(f"\nApply {len(fixes)} fix(es) to database? (yes/no): ").strip().lower()
        if confirm == "yes":
            for fix in fixes:
                cur.execute(
                    "UPDATE product_designs SET category_id = ? WHERE id = ?",
                    (fix["new_cat_id"], fix["design_id"])
                )
                print(f"  ✓ Updated {fix['design_code']}: category_id {fix['old_cat_id']} → {fix['new_cat_id']} ('{fix['new_cat_name']}')")
            conn.commit()
            print("\n✅ Database updated successfully! Restart the backend server.")
        else:
            print("No changes made.")

conn.close()
print("\nDone.")
