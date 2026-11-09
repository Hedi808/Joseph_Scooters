"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { money, type Product } from "@/lib/model";
import { QuickActions } from "./product-controls";
import { useStore } from "./store-provider";
export function ProductCard({
  product: p,
  eager = false,
}: {
  product: Product;
  eager?: boolean;
}) {
  const { t, locale } = useStore();
  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={`/product/${p.slug}`}>
          <Image
            src={p.image}
            alt={`${p.name}${p.demo ? " — illustration de démonstration" : ""}`}
            width={600}
            height={480}
            loading={eager ? "eager" : "lazy"}
            unoptimized={!p.image.startsWith("/")}
          />
        </Link>
        <span className="tag">
          {p.demo ? "DÉMO" : p.featured ? t.featured : p.brand}
        </span>
        <QuickActions product={p} />
      </div>
      <div className="product-meta">
        <span>{p.brand}</span>
        <span className={p.stock ? "available" : ""}>
          {p.stock ? "●" : "○"} {p.stock ? t.stock : t.unavailable}
        </span>
      </div>
      <Link className="product-title" href={`/product/${p.slug}`}>
        {p.name}
        <ArrowUpRight size={18} />
      </Link>
      <p className="spec-line">
        {p.motor_w ? `${p.motor_w} W · ${p.range_km} km (est.)` : t.accessories}
      </p>
      <div className="price">
        {money(
          p.price_millimes,
          locale === "ar" ? "ar-TN" : locale === "en" ? "en-TN" : "fr-TN",
        )}
      </div>
    </article>
  );
}
