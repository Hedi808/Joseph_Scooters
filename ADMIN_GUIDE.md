# Admin guide

Only manually bootstrapped verified Supabase Auth members can administer the store. See SETUP.md. No default password or public role-assignment UI exists.

## Products

Open `/admin/products`, search by name and choose **Créer un produit** or an existing product. Enter unique SKU/slug, category, brand, descriptions, price **in millimes**, inventory, featured flag, typed vehicle specs and flexible specification JSON. For example, `1890000` means `1 890,000 TND`.

Publish only verified real product data. Local artwork is conceptual. Do not present example range/power as genuine manufacturer performance. Nominal power belongs in `motor_w`; peak power must be separately named in supplemental specs. Range is an estimate, not a promise. Add warranty only when the business has approved it.

Variants have their own SKU, price, stock and color. Product stock remains the global ceiling. Orders require a variant if any exist. Use archive/draft to unpublish. Permanent deletion requires an explicit confirmation; FK constraints reject deletion of historical products. Historical order snapshots do not change when a product is edited.

## Inventory

`/admin/inventory` lists stock and recent movements. Pick a product, optionally supply the variant UUID, enter positive/negative delta and a required reason. For a variant, the same delta adjusts both variant stock and the product global ceiling. Constraints reject negative stock. Use adjustments rather than silently editing stock after launch.

## Orders

`/admin/orders` supports number search and status filtering. Order detail shows the immutable item price snapshot, contact/delivery data, totals and timeline.

- New COD orders are `pending`, `unpaid`: they are not paid revenue.
- Confirm after contacting the customer, then prepare, ship and mark delivered.
- Record `paid` only after money has actually been received/reconciled.
- Cancellation before shipping requires a reason and releases stock once.
- Invalid backward/skipped transitions are rejected by PostgreSQL, not just the UI.
- Never use cancellation to simulate a shipped return. That requires a separate operational return/refund procedure.

Dashboard encashments sum paid non-cancelled orders; refunded orders are excluded by payment status. This is not a tax accounting report. Low-stock dashboard currently uses a fixed ≤3 threshold even though the schema stores a per-product threshold.

## Media

`/admin/media`: choose a product and upload a JPEG/PNG/WebP ≤5 MiB with descriptive alt text and position. The newest upload becomes the main image; gallery includes associated images sorted by position. Metadata/position can be edited. Dissociate an image before deleting its file; main-image links are reset to a conceptual placeholder when detached. File deletion is refused while an image/main-image record references the file. Use only owned/licensed photographs. Do not upload customer documents.

## Content and configuration

- `/admin/categories`: create/update by stable slug, order and archive. Additional categories use `/category/[slug]` and can be assigned to products. Preserve the four built-in routing slugs for the dedicated collection URLs.
- `/admin/banners`: create/edit scheduled campaigns, internal CTA link and enabled state. Date input is currently serialized from UTC strings; verify campaign timing in your deployment timezone before publishing.
- `/admin/settings`: editable name, announcement, hero copy, verified contact channels, public legal/policy text and COD enablement.
- Shipping rules apply by governorate/category; update a rule using the same region/category pair. Disable rather than invent coverage. Enter all fees in millimes.
- `/admin/customers`: profiles and incoming inquiries. Private guest contact details remain on orders.

No payment gateway is connected. No discounts, reviews, financing promises or delivery/warranty claims are generated automatically. Product SEO fields and localized JSON text are editable; category localized labels, image and optional parent are editable. Compatibility can be added/removed by product UUID in the product editor. Homepage asset selection and a richer compatibility picker remain follow-up work; consult DELIVERY_REPORT.md.
