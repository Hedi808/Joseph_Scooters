import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.TEST_SUPABASE_URL;
const secret = process.env.TEST_SUPABASE_SECRET_KEY;
const publishable = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const ready =
  !!url &&
  !!secret &&
  !!publishable &&
  process.env.TEST_CONFIRM_PROJECT_REF ===
    new URL(url).hostname.split(".")[0] &&
  process.env.TEST_ALLOW_FIXTURES === "true";
test(
  "live isolated Supabase: auth, RLS ownership, guest access, concurrent checkout, idempotency and stock release",
  { skip: !ready },
  async () => {
    const admin = createClient(url!, secret!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const clients = Array.from({ length: 3 }, () =>
      createClient(url!, publishable!, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
    const guest = createClient(url!, publishable!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const run = randomUUID();
    const password = randomBytes(20).toString("hex");
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const email = `integration-${run}-${i}@example.test`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(error, null);
      ids.push(data.user!.id);
      const login = await clients[i].auth.signInWithPassword({
        email,
        password,
      });
      assert.equal(login.error, null);
    }
    const { error: membershipError } = await admin
      .from("admin_memberships")
      .insert({ user_id: ids[2] });
    assert.equal(membershipError, null);
    const { data: oldSettings } = await admin
      .from("site_settings")
      .select("value")
      .eq("id", "store")
      .single();
    const { data: oldRule } = await admin
      .from("shipping_rules")
      .select("*")
      .eq("governorate", "Zaghouan")
      .eq("category_slug", "scooters")
      .maybeSingle();
    const productId = randomUUID();
    try {
      assert.equal(
        (
          await admin
            .from("site_settings")
            .update({ value: { ...oldSettings?.value, cod_enabled: true } })
            .eq("id", "store")
        ).error,
        null,
      );
      assert.equal(
        (
          await admin
            .from("shipping_rules")
            .upsert(
              {
                governorate: "Zaghouan",
                category_slug: "scooters",
                fee_millimes: 1234,
                enabled: true,
              },
              { onConflict: "governorate,category_slug" },
            )
        ).error,
        null,
      );
      assert.equal(
        (
          await admin
            .from("products")
            .insert({
              id: productId,
              name: `Integration ${run}`,
              slug: `integration-${run}`,
              sku: `TEST-${run}`,
              category_slug: "scooters",
              price_millimes: 100000,
              stock: 2,
              status: "published",
              demo: false,
            })
        ).error,
        null,
      );
      const payload = {
        idempotency: randomUUID(),
        token: randomBytes(32).toString("hex"),
        name: "Test Customer",
        email: "buyer@example.test",
        phone: "22123456",
        address: "12 test address",
        city: "Zaghouan",
        governorate: "Zaghouan",
        postal: "1100",
        notes: "Integration test only",
        terms: true,
        items: [{ product_id: productId, variant_id: null, quantity: 1 }],
        total_millimes: 1,
      };
      const first = await clients[0].rpc("create_order", { payload });
      assert.equal(first.error, null);
      assert.ok(first.data.order_number);
      const retry = await clients[0].rpc("create_order", { payload });
      assert.equal(retry.error, null);
      assert.equal(retry.data.order_number, first.data.order_number);
      const { data: own } = await clients[0]
        .from("orders")
        .select("*")
        .eq("order_number", first.data.order_number)
        .single();
      assert.equal(
        Number(own.total_millimes),
        101234,
        "client supplied total ignored",
      );
      const { data: other } = await clients[1]
        .from("orders")
        .select("*")
        .eq("id", own.id);
      assert.deepEqual(other, []);
      const { data: anonymous } = await guest.from("orders").select("*");
      assert.ok(!anonymous?.length);
      const { data: wrong } = await guest.rpc("guest_order", {
        number: first.data.order_number,
        token: "wrong-token",
      });
      assert.equal(wrong, null);
      const { data: correct } = await guest.rpc("guest_order", {
        number: first.data.order_number,
        token: payload.token,
      });
      assert.equal(correct.order_number, first.data.order_number);
      assert.equal(correct.customer, undefined);
      const escalation = await clients[1]
        .from("admin_memberships")
        .insert({ user_id: ids[1] });
      assert.ok(escalation.error);
      const denied = await clients[1].rpc("transition_order", {
        p_id: own.id,
        p_status: "confirmed",
        p_payment: "unpaid",
        p_note: "",
      });
      assert.ok(denied.error);
      const race = await Promise.all(
        [clients[0], clients[1]].map((c) =>
          c.rpc("create_order", {
            payload: {
              ...payload,
              idempotency: randomUUID(),
              token: randomBytes(32).toString("hex"),
            },
          }),
        ),
      );
      assert.equal(
        race.filter((r) => !r.error).length,
        1,
        "only one checkout can reserve the last unit",
      );
      const { data: stock } = await admin
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single();
      assert.equal(stock?.stock, 0);
      assert.equal(
        (
          await clients[2].rpc("transition_order", {
            p_id: own.id,
            p_status: "cancelled",
            p_payment: "unpaid",
            p_note: "Integration cancellation",
          })
        ).error,
        null,
      );
      assert.equal(
        (
          await clients[2].rpc("transition_order", {
            p_id: own.id,
            p_status: "cancelled",
            p_payment: "unpaid",
            p_note: "Retry cancellation",
          })
        ).error,
        null,
      );
      const { data: released } = await admin
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single();
      assert.equal(released?.stock, 1, "cancellation releases once");
      const invalid = await clients[2].rpc("transition_order", {
        p_id: own.id,
        p_status: "shipped",
        p_payment: "paid",
        p_note: "",
      });
      assert.ok(invalid.error);
      for (const c of clients)
        assert.equal((await c.auth.signOut()).error, null);
    } finally {
      await admin
        .from("site_settings")
        .update({ value: oldSettings?.value || { cod_enabled: false } })
        .eq("id", "store");
      if (oldRule) await admin.from("shipping_rules").upsert(oldRule);
      else
        await admin
          .from("shipping_rules")
          .delete()
          .eq("governorate", "Zaghouan")
          .eq("category_slug", "scooters");
      await admin
        .from("products")
        .update({ status: "archived" })
        .eq("id", productId);
    }
    // Test identities and order audit trails intentionally remain in this DISPOSABLE database.
  },
);
