"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Scale,
  Plus,
  Minus,
  ArrowUpRight,
  Maximize2,
} from "lucide-react";
import { money, quantity, type Product } from "@/lib/model";
import { useStore } from "./store-provider";
import { persistWishlist } from "@/lib/actions";
export function QuickActions({ product: p }: { product: Product }) {
  const { state, update, t, notify } = useStore();
  return (
    <div className="quick-actions">
      <button
        aria-label={t.wishlist}
        aria-pressed={state.wishlist.some((v) => v.id === p.id)}
        onClick={() => {
          const exists = state.wishlist.some((v) => v.id === p.id);
          update({
            ...state,
            wishlist: exists
              ? state.wishlist.filter((v) => v.id !== p.id)
              : [...state.wishlist, p],
          });
          if (!p.demo) void persistWishlist(p.id, !exists);
        }}
      >
        <Heart size={17} />
      </button>
      <button
        aria-label={t.compare}
        onClick={() => {
          if (state.compare.some((v) => v.id === p.id))
            update({
              ...state,
              compare: state.compare.filter((v) => v.id !== p.id),
            });
          else if (
            state.compare.length < 3 &&
            ["scooters", "ebikes"].includes(p.category_slug)
          )
            update({ ...state, compare: [...state.compare, p] });
          else notify(t.compare + " : 3 véhicules maximum");
        }}
      >
        <Scale size={17} />
      </button>
    </div>
  );
}
export function ProductControls({ product: p }: { product: Product }) {
  const router = useRouter();
  const { t, state, update, notify } = useStore();
  const [variant, setVariant] = useState(p.variants?.[0]?.id || "");
  const [count, setCount] = useState(1);
  const selected = p.variants?.find((v) => v.id === variant) || null;
  const stock = Math.min(p.stock, selected?.stock ?? p.stock);
  function add(buy = false) {
    const key = selected?.id || p.id;
    const existing = state.cart.find(
      (i) => (i.variant?.id || i.product.id) === key,
    );
    const next = quantity((existing?.quantity || 0) + count, stock);
    if (next < 1) return;
    update({
      ...state,
      cart: [
        ...state.cart.filter((i) => (i.variant?.id || i.product.id) !== key),
        { product: p, variant: selected, quantity: next },
      ],
    });
    if (buy) router.push("/checkout");
    else notify(t.add + " ✓");
  }
  return (
    <div className="product-controls">
      <div className="big-price">
        {money(selected?.price_millimes ?? p.price_millimes)}
      </div>
      <p className="stock-note">{stock ? t.stock : t.unavailable}</p>
      {!!p.variants?.length && (
        <label>
          Variante
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            {p.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {money(v.price_millimes)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="purchase-row">
        <div className="quantity">
          <button
            aria-label="−"
            onClick={() => setCount(Math.max(1, count - 1))}
          >
            <Minus size={16} />
          </button>
          <output>{count}</output>
          <button
            aria-label="+"
            onClick={() => setCount(Math.max(1, quantity(count + 1, stock)))}
          >
            <Plus size={16} />
          </button>
        </div>
        <button className="button" disabled={!stock} onClick={() => add()}>
          {t.add}
          <ArrowUpRight size={17} />
        </button>
      </div>
      <button
        className="button dark full"
        disabled={!stock}
        onClick={() => add(true)}
      >
        {t.buy}
      </button>
      <div className="detail-quick">
        <QuickActions product={p} />
        <Link href="/compare">{t.compare}</Link>
      </div>
      {p.demo && <p className="notice">{t.demo}</p>}
    </div>
  );
}
export function Gallery({ product: p }: { product: Product }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const images = [
    { url: p.image, alt: p.name },
    ...(p.images || [])
      .toSorted((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${i.path}`,
        alt: i.alt,
      })),
  ];
  const [selected, setSelected] = useState(0);
  const image = images[selected] || images[0];
  return (
    <div className="gallery">
      <Image
        src={image.url}
        alt={image.alt}
        width={1000}
        height={850}
        loading="eager"
        fetchPriority="high"
        unoptimized={!image.url.startsWith("/")}
      />
      <button
        className="zoom"
        aria-label="Zoom"
        onClick={() => dialog.current?.showModal()}
      >
        <Maximize2 />
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="close-dialog"
          aria-label="Fermer"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <Image
          src={image.url}
          alt={image.alt}
          width={1200}
          height={1000}
          unoptimized={!image.url.startsWith("/")}
        />
      </dialog>
      {images.length > 1 && (
        <div className="gallery-thumbnails">
          {images.map((item, n) => (
            <button
              aria-label={item.alt}
              aria-pressed={selected === n}
              key={item.url + n}
              onClick={() => setSelected(n)}
            >
              <Image
                src={item.url}
                alt={item.alt}
                width={90}
                height={75}
                unoptimized={!item.url.startsWith("/")}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
