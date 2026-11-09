"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useStore } from "./store-provider";
import { checkoutAction } from "@/lib/actions";
import { money, governorates } from "@/lib/model";
import { shippingQuote } from "@/lib/shipping";
type Rule = {
  governorate: string;
  category_slug: string | null;
  fee_millimes: number;
};
export function CheckoutPage({
  enabled,
  rules,
}: {
  enabled: boolean;
  rules: Rule[];
}) {
  const { state, t, update } = useStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("");
  const [done, setDone] = useState(false);
  const attempt = useRef<{
    key: string;
    token: string;
    cartKey: string;
  } | null>(null);
  const subtotal = state.cart.reduce(
    (sum, i) =>
      sum +
      (i.variant?.price_millimes ?? i.product.price_millimes) * i.quantity,
    0,
  );
  const shipping = shippingQuote(
    rules,
    region,
    state.cart.map((i) => i.product.category_slug),
  );
  const shippable = shipping !== null;
  const canOrder =
    enabled && !state.cart.some((i) => i.product.demo) && shippable;
  async function submit(form: FormData) {
    if (!canOrder || pending || done) return;
    setPending(true);
    setError("");
    const cartKey = JSON.stringify(
      state.cart
        .map((i) => [i.product.id, i.variant?.id || null, i.quantity])
        .sort(),
    );
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("js-checkout-attempt") || "null",
      );
      if (
        saved?.cartKey === cartKey &&
        typeof saved.key === "string" &&
        typeof saved.token === "string"
      )
        attempt.current = saved;
    } catch {
      /* Browser storage is optional; the RPC still enforces idempotency. */
    }
    if (attempt.current?.cartKey !== cartKey) attempt.current = null;
    if (!attempt.current) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      attempt.current = {
        key: crypto.randomUUID(),
        cartKey,
        token: Array.from(bytes, (v) => v.toString(16).padStart(2, "0")).join(
          "",
        ),
      };
    }
    try {
      sessionStorage.setItem(
        "js-checkout-attempt",
        JSON.stringify(attempt.current),
      );
    } catch {
      /* In-memory retry key remains active. */
    }
    const payload = {
      ...Object.fromEntries(form),
      terms: form.get("terms") === "on",
      idempotency: attempt.current.key,
      token: attempt.current.token,
      items: state.cart.map((i) => ({
        product_id: i.product.id,
        variant_id: i.variant?.id || null,
        quantity: i.quantity,
      })),
    };
    let result;
    try {
      result = await checkoutAction(payload);
    } catch {
      setPending(false);
      setError(t.error);
      return;
    }
    setPending(false);
    if (result.ok && result.url) {
      setDone(true);
      update({ ...state, cart: [] });
      sessionStorage.removeItem("js-checkout-attempt");
      window.location.assign(result.url);
    } else setError(result.message);
  }
  return (
    <section className="shell section-space">
      <h1>{t.checkout}</h1>
      {!enabled && <p className="notice">{t.notConfigured}</p>}
      {!state.cart.length && !done ? (
        <div className="empty">
          <p>{t.empty}</p>
          <Link href="/products">{t.back}</Link>
        </div>
      ) : (
        <form action={submit} className="checkout-layout">
          <div className="form-stack">
            {(
              ["name", "email", "phone", "address", "city", "postal"] as const
            ).map((k) => (
              <label key={k}>
                {t[k]}
                <input
                  required
                  name={k}
                  type={
                    k === "email" ? "email" : k === "phone" ? "tel" : "text"
                  }
                  autoComplete={
                    k === "name"
                      ? "name"
                      : k === "email"
                        ? "email"
                        : k === "phone"
                          ? "tel"
                          : k === "address"
                            ? "street-address"
                            : k === "city"
                              ? "address-level2"
                              : "postal-code"
                  }
                  maxLength={k === "address" ? 300 : 200}
                  pattern={k === "postal" ? "[0-9]{4}" : undefined}
                  placeholder={k === "phone" ? "+216 2XXXXXXX" : undefined}
                />
              </label>
            ))}
            <label>
              {t.governorate}
              <select
                name="governorate"
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">—</option>
                {governorates.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              {t.notes}
              <textarea name="notes" maxLength={1000} />
            </label>
            <label className="check-label">
              <input type="checkbox" name="terms" required />
              <Link href="/terms">{t.terms}</Link>
            </label>
          </div>
          <aside className="summary-card">
            <h2>{t.total}</h2>
            {state.cart.map((i) => (
              <div className="summary-line" key={i.variant?.id || i.product.id}>
                <span>
                  {i.product.name} {i.variant?.name} ×{i.quantity}
                </span>
                <strong>
                  {money(
                    (i.variant?.price_millimes ?? i.product.price_millimes) *
                      i.quantity,
                  )}
                </strong>
              </div>
            ))}
            <div className="summary-line">
              <span>{t.subtotal}</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>{t.shipping}</span>
              <span>{shipping === null ? "À confirmer" : money(shipping)}</span>
            </div>
            <div className="summary-line total">
              <span>{t.total}</span>
              <span>
                {shipping === null ? "—" : money(subtotal + shipping)}
              </span>
            </div>
            <p className="notice">{t.pending}</p>
            {!shippable && region && (
              <p className="notice">
                {t.request} : aucune règle de livraison applicable.
              </p>
            )}
            <button
              className="button full"
              disabled={!canOrder || pending || done}
            >
              {pending ? t.loading : t.checkout}
            </button>
            {!canOrder && (
              <Link className="under-link" href="/contact">
                {t.request} ↗
              </Link>
            )}
            {error && (
              <p role="alert" className="notice">
                {error}
              </p>
            )}
          </aside>
        </form>
      )}
    </section>
  );
}
