# Antigravity Persistent Documentation

This file contains crucial specifications, instructions, and records of modifications made to the B2B E-commerce system. 

> [!IMPORTANT]
> **Instructions for the AI Assistant:**
> Whenever the user says "read antigravity.md" or asks you to look at this file, you must read the entire contents of this file, align your code changes with the guidelines specified here, and perform the updates accordingly.

---

## Technical Specifications & UI/UX Rules

### 1. Multi-Size & Multi-Stock Selection
- On the product detail page (`BuyerProductDetail.tsx`), customers must be able to configure and select multiple sizes concurrently.
- For each selected size, the customer can independently select:
  - **Ready Stock** pieces (up to the available quantity shown to the customer).
  - **Make Order (MTO)** pieces (unlimited quantity, 7-10 days lead time).
- Inside the active size's configuration rectangular box, display:
  - Size value
  - Available Ready Stock count
  - Quantity selectors for Ready Stock and MTO
  - **Pure Weight (Fine Metal)** calculation: `(Ready Stock + MTO) * weight * (purity / 100)`
  - **Total Weight** calculation: `(Ready Stock + MTO) * weight`
  - **Total Price** calculation: `(Ready Stock + MTO) * price_per_piece`
- Below the rectangular box, there must be an **"Add"** button to add the size configuration to the user's active selection.
- Below the configuration panel, display a list of all configured sizes with inline `+`/`-` adjustment controls for both Ready Stock and MTO, plus a delete button.
- The size buttons in the grid should display a badge showing their configured quantity.
- The main "Add Selected Sizes to Cart" button will sum the quantities of all configured sizes and validate that the combined total meets the design's Minimum Order Quantity (MOQ).
- **Authentication Check**: Guest (non-logged-in) customers cannot add configurations to the cart. Clicking "Add Selected Sizes to Cart" will show an alert popup and automatically open the buyer login dialog modal.

### 2. Shopping Cart Drawer
- In the Wholesale Cart drawer (`App.tsx`), allow the customer to decrease any cart item's quantity down to `1` piece (instead of enforcing the design's MOQ on single sizes inside the cart).
- Cart items must be grouped visually by variant (e.g. `variant.id`). Inside each variant card, display a table/list of all selected sizes with their quantities, weights, inline quantity adjusters, subtotal, and remove buttons.
- The cart drawer width should be configured as `max-w-xl` (576px) to support this nested structure comfortably.
- **Price Lock Policy**: Dynamic price updates from live rate changes must not affect items in the cart. Once an item is added to the cart, its price breakdown (silver rate, base price, making charges, GST, and total) is frozen/locked. Cart drawer rendering, subtotal summation, and checkout order payloads must use these locked values.

---

## Log of Updates
- **2026-07-11**: Initial design and implementation of the multi-size stock selection, inline editing list, per-size MTO vs Ready Stock configuration, and cart drawer quantity decrement limit updates.
- **2026-07-11 (Update 1)**: Implemented visual grouping of sizes under a single variant card in the Wholesale Cart drawer and widened the drawer to `max-w-xl` for improved spacing.
- **2026-07-11 (Update 2)**: Added cart price locking on add-to-cart, guest login check enforcement, and migrated SQLite database designs with making charge `0.25` to `0.40` per gram.
- **2026-07-11 (Update 3)**: Removed the purity filter select dropdown box from the catalog toolbar on the storefront page.
- **2026-07-11 (Update 4)**: Added "(Approx. Price)" indicator labels next to all dynamic total price fields across the product detail page and Wholesale Cart drawer.
- **2026-07-11 (Update 5)**: Added a dynamic active configuration summary panel (displaying total weight and total price) at the top-right of the product detail page next to the Wishlist button. This summary updates instantly as selection quantities are modified and remains permanently floats/sticks to the top right of the viewport whenever the page is in a scrolled state.
- **2026-07-11 (Update 6)**: Interchanged the layout order of the B2B Billing Calculator and the Size Configurations / Add to Cart panel, moving the configurator higher up.
- **2026-07-14 (Update 7)**: Reorganized the Admin Inventory Management panel to group items by `Category` (e.g. `Titanic-New`, `Battani`). Displayed total physical stock and total weight in the collapsed card headers. Inside the expanded card, grouped size lists by variant with a total row in the footer (total weight, physical stock, available stock per variant). Removed the catalog group left sidebar layout.
- **2026-07-14 (Update 8)**: Added a database column `stock_reserved` to the `variant_sizes` table, exposing `/api/products/adjust-reserved-stock`. Allowed admins/workers to manually adjust both physical and reserved stock from the admin inventory sheet, dynamically calculating and listing available stock (physical - reserved) for both admin inventory views and buyer storefront ready-stock validations.
- **2026-07-15 (Update 9)**: Removed manual weight input columns for sizes in `ProductForm.tsx`. Replaced it with a single "Weight per Inch" input box in the variant header row, which automatically computes weights for all size rows (`weight = size * weight_per_inch`) in real-time, displaying them in a read-only column. Prefills dynamically derived values for existing records.
- **2026-07-15 (Update 10)**: Grouped designs in the Product Catalog (All Designs) view by `Category` (e.g. `Battani`, `Titanic-New`, `Flower`). Displays parent category cards summarizing nested design codes and total variants count. Clicking a parent card drilldowns "inside" to view only the designs belonging to that category with edit/delete controls and a back navigation button.
- **2026-07-15 (Update 11)**: Sorted categories on the left sidebar and products on the main catalog grid alphabetically (A, B, C, D...) in `BuyerStorefront.tsx` instead of rendering them in database insertion order.
- **2026-07-20 (Update 12)**: Added full mobile responsiveness for navigation in `App.tsx`. Added a mobile hamburger toggle menu in the header with a slide-down menu drawer for **Home**, **Collections Catalog**, and **About Us**. Also added a fixed bottom navigation bar on mobile screens with instant quick links for **Home**, **Catalog**, **Wishlist**, **Cart**, and **About Us**.






