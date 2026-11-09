"use client";
import Link from "next/link";
import { useRef } from "react";
import { money } from "@/lib/model";
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  ArrowUpRight,
  Zap,
  Scale,
} from "lucide-react";
import { useStore } from "./store-provider";
import { changeLocale } from "@/lib/actions";
export function Header({
  name,
  announcement,
  categories,
}: {
  name: string;
  announcement: string;
  categories: { slug: string; name: string }[];
}) {
  const { t, locale, state } = useStore();
  const drawer = useRef<HTMLDialogElement>(null);
  return (
    <>
      <div className="announcement">
        {announcement}
        <span>FR / EN / العربية</span>
      </div>
      <header>
        <div className="shell header-main">
          <Link href="/" className="logo" aria-label={name}>
            <Zap fill="currentColor" />
            <span>
              {name.toUpperCase()}
              <small>ELECTRIC MOBILITY</small>
            </span>
          </Link>
          <form action="/search" className="header-search">
            <Search size={18} />
            <input
              name="q"
              aria-label={t.search}
              placeholder={`${t.search} un modèle, une marque…`}
            />
            <button aria-label={t.search}>
              <ArrowUpRight size={18} />
            </button>
          </form>
          <div className="header-actions">
            <form action={changeLocale}>
              <select
                name="locale"
                aria-label="Language"
                value={locale}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
              >
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="ar">AR</option>
              </select>
            </form>
            <Link href="/account" aria-label={t.account}>
              <User />
            </Link>
            <Link href="/wishlist" aria-label={t.wishlist}>
              <Heart />
              <b>{state.wishlist.length || ""}</b>
            </Link>
            <button
              className="cart-trigger"
              aria-label={t.cart}
              onClick={() => drawer.current?.showModal()}
            >
              <ShoppingBag />
              <b>{state.cart.reduce((n, i) => n + i.quantity, 0) || ""}</b>
            </button>
          </div>
        </div>
        <nav className="shell navigation" aria-label="Main">
          <div>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={
                  ["scooters", "ebikes", "accessories", "spare-parts"].includes(
                    category.slug,
                  )
                    ? `/${category.slug}`
                    : `/category/${category.slug}`
                }
              >
                {category.name}
              </Link>
            ))}
          </div>
          <Link href="/compare">
            <Scale size={15} />
            {t.compare}
          </Link>
          <Link href="/products" className="all-products">
            {t.products}
            <ArrowUpRight size={15} />
          </Link>
        </nav>
        <details className="shell mobile-menu">
          <summary>Menu · {t.search} +</summary>
          <div>
            <form action="/search">
              <label>
                {t.search}
                <input name="q" maxLength={100} />
              </label>
              <button className="button">{t.search}</button>
            </form>
            <form action={changeLocale}>
              <label>
                FR / EN / العربية
                <select
                  name="locale"
                  aria-label="Mobile language"
                  defaultValue={locale}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </label>
            </form>
            <Link href="/products">{t.products}</Link>
            <Link href="/compare">{t.compare}</Link>
            <Link href="/account">{t.account}</Link>
            <Link href="/cart">{t.cart}</Link>
          </div>
        </details>
      </header>
      <dialog
        className="cart-drawer"
        ref={drawer}
        onClick={(e) => {
          if (e.target === e.currentTarget) drawer.current?.close();
        }}
      >
        <div className="drawer-heading">
          <h2>{t.cart}</h2>
          <button aria-label="Fermer" onClick={() => drawer.current?.close()}>
            ×
          </button>
        </div>
        {!state.cart.length ? (
          <p>{t.empty}</p>
        ) : (
          state.cart.map((i) => (
            <div className="summary-line" key={i.variant?.id || i.product.id}>
              <span>
                {i.product.name}
                <br />
                {i.variant?.name} ×{i.quantity}
              </span>
              <strong>
                {money(
                  (i.variant?.price_millimes ?? i.product.price_millimes) *
                    i.quantity,
                )}
              </strong>
            </div>
          ))
        )}
        <Link
          className="button full"
          href="/cart"
          onClick={() => drawer.current?.close()}
        >
          {t.cart} ↗
        </Link>
        <Link
          className="button dark full"
          href="/checkout"
          onClick={() => drawer.current?.close()}
        >
          {t.checkout}
        </Link>
      </dialog>
    </>
  );
}
