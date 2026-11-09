# Database architecture

## Ownership and data boundaries

Supabase Auth is the identity authority. `profiles.id`, `addresses.user_id`, `wishlist_items.user_id` and `orders.user_id` reference Auth UUIDs. An order email is contact data, never proof of ownership. Legacy JShop identities/sessions are not imported or mixed with Auth.

`admin_memberships` is manually maintained by trusted project operators. The stable security-definer `is_admin()` checks the current authenticated UUID; clients cannot insert memberships. Admin page loaders/actions check membership, and RLS/RPCs independently enforce it.

## Tables

| Area | Tables |
|---|---|
| Identity | `profiles`, `admin_memberships`, `addresses` |
| Catalog | `categories`, `products`, `product_variants`, `product_images`, `product_compatibility` |
| Saved products | `wishlist_items` |
| Commerce | `orders`, `order_items`, `order_status_history` |
| Inventory | `inventory_movements` |
| Configuration | `shipping_rules`, `site_settings`, `banners` |
| Operations | `contact_inquiries`, `audit_logs`, `rate_limits` |

Brands are product text fields rather than a redundant unmaintained brand table. Guest carts live locally. Payments currently mean COD state, so no unused card/payment-attempt tables were created. Product names/descriptions are French-first; `localized` and category `labels` JSONB can be edited in admin, with current-locale display and French fallback. Search indexes currently cover the base text, not localized JSON translations.

All domain IDs are UUIDs except singleton setting ID `store`. Money is integer millimes in bigint, not floats. Product/variant prices are bounded to values safe for JavaScript integer calculations at configured cart limits. Indexed full-text `search_document` covers name, brand, SKU and description using the `simple` configuration. Common vehicle fields are typed numeric columns; additional specs are JSONB strings with explicit display units. FK constraints prevent removing historical products/variants.

## RLS matrix

- Anonymous: published products and their images/variants, unarchived categories, active banners, public settings, enabled delivery rules. No direct customer/order writes.
- Customer: own profile, addresses and wishlist; own orders/items/history, read-only. No access by matching email.
- Admin: catalogue/content/shipping writes; private operational reads. Order and inventory workflow mutations go through authorized RPCs.
- Orders, stock movement records, status timelines and rate buckets have no ordinary direct client write policy.
- Public Storage reads; only admins upload/delete product media.

Public settings must never contain secret credentials or private operational notes. Storage is public by design.

## Transactional checkout

`create_order(payload jsonb)` runs in one PostgreSQL transaction:

1. Validates bounded cart/token/consent/customer data; additional DB customer constraint validates direct RPC calls too.
2. Takes an advisory transaction lock on the idempotency UUID.
3. Existing UUID returns the existing order only when guest token hash, request fingerprint and authenticated identity match. Conflicting replay is rejected.
4. Applies a conservative global checkout throttle and checks COD is enabled.
5. Locks all product rows, then variant rows in stable UUID order.
6. Rejects archived/unpublished/demo/missing products, missing required variants and insufficient stock. Prices come exclusively from locked database records.
7. Finds a configured region/category shipping rule for every item. Specific category rule overrides general region rule. Mixed cart shipping is the maximum applicable item fee, not an invented flat fee or sum. No rule means no order.
8. Inserts immutable name/variant/unit-price snapshots, decrements stock and writes movement records.
9. Sets trusted totals and records `pending` / `unpaid`. Returns only the random order number.

Any exception rolls the entire transaction back. Duplicate lines cannot bypass stock checks because updates occur on locked records before processing the next line. The client keeps a retry key/token in session storage tied to cart contents; reload retries of the same cart do not silently create a new order. Changed details after a possibly committed request may cause an idempotency conflict; ask the shop to reconcile before starting a new attempt.

The 32-byte guest token is SHA-256 hashed in PostgreSQL. The raw token is retained in an HTTP-only scoped cookie for confirmation; it is never placed in confirmation URLs. `guest_order` returns a minimal summary, not addresses/email/phone. Knowing an order number does not grant access.

## Stock and cancellation

Stock is reserved/decremented at order creation, not at payment. Admin confirmation does not decrement again. Valid sequence: `pending → confirmed → preparing → shipped → delivered`. Cancellation is permitted from pending/confirmed/preparing only, requires a reason, locks stock in stable order and releases each item exactly once. Repeated cancellation cannot release twice. Delivered/shipped returns require a deliberate later returns workflow; they cannot be mislabeled as pre-shipping cancellation.

There is no automatic reservation expiry job. Operators must confirm or cancel pending orders promptly. No negative stock/backorders are supported. Product stock is a global ceiling and variant stock is an additional ceiling; configure both consistently. Inventory RPC writes actor/reason/delta. Direct admin product/variant edits are audited but initial stock edits do not synthesize inventory movements; use the inventory UI after creation.

## SQL and types workflow

Migrations are hand-authored versioned SQL, not claimed to be generated by an unavailable database. To refresh generated database types after applying them, use Supabase CLI against the new project:

```text
npx supabase gen types typescript --project-id NEW_PROJECT_REF --schema public > types/database.generated.ts
```

Create the `types` directory first. Current application domain/input types are explicit in `lib/model.ts`; the Supabase client has not yet been parameterized with generated schema types. Never generate against JShop. Review policy/function changes and run the live integration test after every schema change.
