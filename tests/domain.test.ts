import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkoutSchema,
  productSchema,
  parseFilters,
  total,
  quantity,
  money,
} from "../lib/model";
import { demoProducts } from "../lib/demo";
import { shippingQuote } from "../lib/shipping";
test("blank filter controls retain defaults instead of setting maximum price to zero", () => {
  assert.equal(
    parseFilters({ max: "", min: "", motor: "", q: "urban" }).max,
    100000,
  );
  assert.equal(
    parseFilters({ max: "", min: "", motor: "", q: "urban" }).q,
    "urban",
  );
});
test("products reject negative and fractional prices, unsafe images and invalid slugs", () => {
  const p = demoProducts[0];
  assert.equal(productSchema.safeParse(p).success, true);
  for (const invalid of [
    { price_millimes: -1 },
    { price_millimes: 1.5 },
    { stock: -1 },
    { image: "javascript:alert(1)" },
    { slug: "../admin" },
  ])
    assert.equal(productSchema.safeParse({ ...p, ...invalid }).success, false);
});
test("filters are bounded and serialize through URLSearchParams", () => {
  const filters = parseFilters({
    q: "urban",
    page: "2",
    motor: "350",
    sort: "price-asc",
    category: "scooters",
  });
  const params = new URLSearchParams(
    Object.entries(filters).map(([k, v]) => [k, String(v)]),
  );
  assert.deepEqual(parseFilters(Object.fromEntries(params)), filters);
  assert.equal(parseFilters({ page: "-1" }).page, 1);
  assert.equal(parseFilters({ page: "10000000" }).page, 1);
});
test("money and totals use integer millimes", () => {
  assert.equal(total([{ price: 1234, quantity: 3 }], 500), 4202);
  assert.throws(() => total([{ price: 1.1, quantity: 1 }], 0));
  assert.match(money(1234), /1[,.]234/);
});
test("cart quantities stay within stock and order limits", () => {
  assert.equal(quantity(50, 4), 4);
  assert.equal(quantity(-2, 4), 0);
  assert.equal(quantity(500, 1000), 99);
  assert.equal(quantity(NaN, 4), 0);
  assert.equal(quantity(2.9, 10), 2);
});
test("shipping chooses category override and maximum applicable fee, never invents coverage", () => {
  const rules = [
    { governorate: "Tunis", category_slug: null, fee_millimes: 10000 },
    { governorate: "Tunis", category_slug: "ebikes", fee_millimes: 30000 },
  ];
  assert.equal(shippingQuote(rules, "Tunis", ["ebikes", "accessories"]), 30000);
  assert.equal(shippingQuote(rules, "Sfax", ["ebikes"]), null);
  assert.equal(shippingQuote(rules, "Tunis", []), null);
  assert.equal(
    shippingQuote([{ ...rules[0], enabled: false }], "Tunis", ["scooters"]),
    null,
  );
});
test("checkout validates Tunisia phone, consent, guest token, idempotency and variants", () => {
  const payload = {
    idempotency: "20000000-0000-4000-8000-000000000001",
    token: "a".repeat(64),
    name: "Test Client",
    email: "test@example.com",
    phone: "+216 22123456",
    address: "Rue de test 12",
    city: "Tunis",
    governorate: "Tunis",
    postal: "1000",
    terms: true,
    items: [
      {
        product_id: demoProducts[0].id,
        variant_id: demoProducts[0].variants![0].id,
        quantity: 1,
      },
    ],
  };
  assert.equal(checkoutSchema.safeParse(payload).success, true);
  for (const invalid of [
    { terms: false },
    { phone: "123" },
    { token: "short" },
    { items: [] },
    { postal: "ABCD" },
    { idempotency: "1" },
  ])
    assert.equal(
      checkoutSchema.safeParse({ ...payload, ...invalid }).success,
      false,
    );
});
const migration = readFileSync(
  new URL(
    "../supabase/migrations/202611090001_independent_store.sql",
    import.meta.url,
  ),
  "utf8",
);
test("security contract: atomic checkout locks, immutable prices, retry and cancellation guards exist", () => {
  for (const guard of [
    "for update",
    "pg_advisory_xact_lock",
    "Idempotency conflict",
    "price:=v.price_millimes",
    "stock=stock-qty",
    "stock=stock+i.quantity",
    "o.status<>'cancelled'",
    "Invalid transition",
  ])
    assert.ok(migration.includes(guard), guard);
});
test("security contract: customer ownership, admin authorization and guest hashing are declared", () => {
  for (const guard of [
    "user_id=auth.uid() or is_admin()",
    "if not is_admin() then raise exception 'Forbidden'",
    "o.guest_token_hash=encode(digest(token",
    "create policy own_admin_membership",
    "revoke all on all functions in schema public from public",
  ])
    assert.ok(migration.includes(guard), guard);
});
test("demo contains representative categories, variants, stock-outs and no endorsements", () => {
  assert.equal(new Set(demoProducts.map((p) => p.category_slug)).size, 4);
  assert.ok(demoProducts.some((p) => p.stock === 0));
  assert.ok(demoProducts.some((p) => p.variants?.length));
  assert.ok(demoProducts.every((p) => p.demo && !("reviews" in p)));
});
