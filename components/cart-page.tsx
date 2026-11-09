"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { mergeWishlist } from "@/lib/actions";
import { useStore, readBrowserStore } from "./store-provider";
import { ProductCard } from "./product-card";
import { money, quantity, type Product } from "@/lib/model";
export function CartPage({
  mode,
  initialWishlist,
}: {
  mode: "cart" | "wishlist" | "compare";
  initialWishlist?: Product[];
}) {
  const { state, t, update } = useStore();
  const hydrated = useRef(false);
  useEffect(() => {
    if (mode !== "wishlist" || !initialWishlist || hydrated.current) return;
    hydrated.current = true;
    const current = readBrowserStore();
    const merged = [
      ...new Map(
        [...initialWishlist, ...current.wishlist].map((p) => [p.id, p]),
      ).values(),
    ].slice(0, 100);
    if (JSON.stringify(merged) !== JSON.stringify(current.wishlist))
      update({ ...current, wishlist: merged });
    void mergeWishlist(merged.filter((p) => !p.demo).map((p) => p.id));
  }, [mode, initialWishlist, state, update]);
  if (mode === "wishlist")
    return (
      <section className="shell section-space">
        <h1>{t.wishlist}</h1>
        <div className="product-grid" style={{ marginTop: 35 }}>
          {state.wishlist.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {!state.wishlist.length && <Empty />}
      </section>
    );
  if (mode === "compare") {
    const specs: [string, (p: Product) => string][] = [
      [t.total, (p) => money(p.price_millimes)],
      [t.stock, (p) => (p.stock ? t.stock : t.unavailable)],
      [t.motor, (p) => (p.motor_w ? `${p.motor_w} W` : "N/A")],
      [t.battery, (p) => (p.battery_wh ? `${p.battery_wh} Wh` : "N/A")],
      [t.range, (p) => (p.range_km ? `${p.range_km} km (est.)` : "N/A")],
      [t.speed, (p) => (p.speed_kmh ? `${p.speed_kmh} km/h` : "N/A")],
      [t.weight, (p) => (p.weight_kg ? `${p.weight_kg} kg` : "N/A")],
      [t.wheel, (p) => (p.wheel_inches ? `${p.wheel_inches}″` : "N/A")],
      ...["Charge", "Charge maximale", "Freins", "Suspension", "Garantie"].map(
        (k) =>
          [k, (p: Product) => p.specifications[k] || "N/A"] as [
            string,
            (p: Product) => string,
          ],
      ),
    ];
    return (
      <section className="shell section-space">
        <h1>{t.compare}</h1>
        <p className="notice">
          3 véhicules maximum. Les caractéristiques démo ne sont pas des données
          constructeur.
        </p>
        {!state.compare.length ? (
          <Empty />
        ) : (
          <div className="compare-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th />
                  {state.compare.map((p) => (
                    <td key={p.id}>
                      <Image
                        src={p.image}
                        width={220}
                        height={180}
                        alt={p.name}
                        unoptimized={!p.image.startsWith("/")}
                      />
                      <h3>
                        <Link href={`/product/${p.slug}`}>{p.name}</Link>
                      </h3>
                      <button
                        className="cart-remove"
                        onClick={() =>
                          update({
                            ...state,
                            compare: state.compare.filter((v) => v.id !== p.id),
                          })
                        }
                      >
                        {t.remove}
                      </button>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specs.map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {state.compare.map((p) => (
                      <td key={p.id}>{value(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }
  const subtotal = state.cart.reduce(
    (sum, i) =>
      sum +
      (i.variant?.price_millimes ?? i.product.price_millimes) * i.quantity,
    0,
  );
  return (
    <>
      <section className="page-heading">
        <div className="shell">
          <p className="eyebrow">VOTRE PROCHAIN TRAJET</p>
          <h1>{t.cart}</h1>
        </div>
      </section>
      <div className="shell cart-layout">
        <div>
          {!state.cart.length ? (
            <Empty />
          ) : (
            state.cart.map((i, index) => (
              <article className="cart-row" key={i.variant?.id || i.product.id}>
                <Image
                  src={i.product.image}
                  width={150}
                  height={130}
                  alt={i.product.name}
                  unoptimized={!i.product.image.startsWith("/")}
                />
                <div>
                  <Link href={`/product/${i.product.slug}`}>
                    <h2>{i.product.name}</h2>
                  </Link>
                  <p>
                    {i.variant?.name} ·{" "}
                    {money(
                      i.variant?.price_millimes ?? i.product.price_millimes,
                    )}
                  </p>
                  <div className="quantity">
                    <button
                      aria-label="−"
                      onClick={() =>
                        update({
                          ...state,
                          cart: state.cart.map((v, n) =>
                            n === index
                              ? { ...v, quantity: Math.max(1, v.quantity - 1) }
                              : v,
                          ),
                        })
                      }
                    >
                      −
                    </button>
                    <output>{i.quantity}</output>
                    <button
                      aria-label="+"
                      onClick={() =>
                        update({
                          ...state,
                          cart: state.cart.map((v, n) =>
                            n === index
                              ? {
                                  ...v,
                                  quantity: quantity(
                                    v.quantity + 1,
                                    Math.min(
                                      v.product.stock,
                                      v.variant?.stock ?? v.product.stock,
                                    ),
                                  ),
                                }
                              : v,
                          ),
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="cart-remove"
                  onClick={() =>
                    update({
                      ...state,
                      cart: state.cart.filter((_, n) => n !== index),
                    })
                  }
                >
                  {t.remove}
                </button>
              </article>
            ))
          )}
        </div>
        <aside className="summary-card">
          <h2>{t.total}</h2>
          <div className="summary-line">
            <span>{t.subtotal}</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="summary-line">
            <span>{t.shipping}</span>
            <span>À confirmer</span>
          </div>
          <p className="notice">
            Le tarif de livraison est calculé à partir des règles configurées,
            avant confirmation de commande.
          </p>
          {state.cart.length > 0 && (
            <Link className="button full" href="/checkout">
              {t.checkout} ↗
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
function Empty() {
  const { t } = useStore();
  return (
    <div className="empty">
      <p>{t.empty}</p>
      <Link href="/products" className="button">
        {t.back}
      </Link>
    </div>
  );
}
