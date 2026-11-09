import "server-only";
import { cache } from "react";
import { db, configured } from "./supabase";
import { demoProducts } from "./demo";
import { categories, filterSchema, type Filters, type Product } from "./model";
import { i18n } from "./locale";
export async function categoryList() {
  const { locale, t } = await i18n();
  if (!configured())
    return categories.map((c) => ({
      ...c,
      name: locale === "fr" ? c.name : t[c.slug as keyof typeof t],
      image: `/art/${c.slug}.svg`,
    }));
  const { data, error } = await (
    await db()
  )
    .from("categories")
    .select("slug,name,labels,image")
    .eq("archived", false)
    .order("sort_order");
  if (error) throw Error("Catégories indisponibles.");
  return (data || []).map((c) => ({
    slug: c.slug as string,
    name: (c.labels?.[locale] ||
      (locale === "fr"
        ? c.name
        : categories.some((v) => v.slug === c.slug)
          ? t[c.slug as keyof typeof t]
          : c.name)) as string,
    image: (c.image ||
      `/art/${categories.some((v) => v.slug === c.slug) ? c.slug : "accessories"}.svg`) as string,
  }));
}
export const preview = () => !configured() && process.env.DEMO_MODE === "true";
async function localizeProducts(rows: Product[]) {
  const { locale } = await i18n();
  return rows.map((p) => ({
    ...p,
    name: p.localized?.[locale]?.name || p.name,
    description: p.localized?.[locale]?.description || p.description,
  }));
}
export async function catalog(f: Filters = filterSchema.parse({}), limit = 12) {
  limit = Math.max(1, Math.min(48, limit));
  if (!configured()) {
    let rows = preview() ? demoProducts : [];
    rows = rows.filter(
      (p) =>
        (!f.q ||
          `${p.name} ${p.brand}`.toLowerCase().includes(f.q.toLowerCase())) &&
        (!f.category || p.category_slug === f.category) &&
        (!f.brand || p.brand === f.brand) &&
        (!f.color || !!p.variants?.some((v) => v.color === f.color)) &&
        (!f.suspension || p.specifications.Suspension === f.suspension) &&
        (!f.brakes || p.specifications.Freins === f.brakes) &&
        (!f.usage || p.specifications.Usage === f.usage) &&
        p.price_millimes >= f.min * 1000 &&
        p.price_millimes <= f.max * 1000 &&
        (!f.stock || p.stock > 0) &&
        (!f.motor || (p.motor_w || 0) >= f.motor) &&
        (!f.range || (p.range_km || 0) >= f.range) &&
        (!f.battery || (p.battery_wh || 0) >= f.battery) &&
        (!f.speed || (p.speed_kmh || 0) >= f.speed) &&
        (!f.weight || (p.weight_kg || 0) <= f.weight) &&
        (!f.wheel || p.wheel_inches === f.wheel) &&
        (!f.foldable || p.foldable === (f.foldable === "true")),
    );
    rows.sort((a, b) =>
      f.sort === "price-asc"
        ? a.price_millimes - b.price_millimes
        : f.sort === "price-desc"
          ? b.price_millimes - a.price_millimes
          : f.sort === "featured"
            ? Number(b.featured) - Number(a.featured)
            : b.created_at.localeCompare(a.created_at),
    );
    return {
      products: rows.slice((f.page - 1) * limit, f.page * limit),
      count: rows.length,
    };
  }
  let q = (await db())
    .from("products")
    .select(
      f.color
        ? "*,variants:product_variants!inner(*)"
        : "*,variants:product_variants(*)",
      { count: "exact" },
    )
    .eq("status", "published");
  if (f.q)
    q = q.textSearch("search_document", f.q, {
      type: "websearch",
      config: "simple",
    });
  if (f.category) q = q.eq("category_slug", f.category);
  if (f.brand) q = q.eq("brand", f.brand);
  if (f.color) q = q.eq("variants.color", f.color);
  if (f.suspension) q = q.eq("specifications->>Suspension", f.suspension);
  if (f.brakes) q = q.eq("specifications->>Freins", f.brakes);
  if (f.usage) q = q.eq("specifications->>Usage", f.usage);
  q = q
    .gte("price_millimes", Math.round(f.min * 1000))
    .lte("price_millimes", Math.round(f.max * 1000));
  if (f.stock) q = q.gt("stock", 0);
  for (const [key, value] of [
    ["motor_w", f.motor],
    ["range_km", f.range],
    ["battery_wh", f.battery],
    ["speed_kmh", f.speed],
  ] as const)
    if (value) q = q.gte(key, value);
  if (f.weight) q = q.lte("weight_kg", f.weight);
  if (f.wheel) q = q.eq("wheel_inches", f.wheel);
  if (f.foldable) q = q.eq("foldable", f.foldable === "true");
  q = q
    .order(
      f.sort.startsWith("price")
        ? "price_millimes"
        : f.sort === "featured"
          ? "featured"
          : "created_at",
      { ascending: f.sort === "price-asc" },
    )
    .order("id")
    .range((f.page - 1) * limit, f.page * limit - 1);
  const { data, count, error } = await q;
  if (error) throw Error("Catalogue temporairement indisponible.");
  return {
    products: await localizeProducts(data as Product[]),
    count: count || 0,
  };
}
export const product = cache(async (slug: string): Promise<Product | null> => {
  if (!configured())
    return preview() ? demoProducts.find((p) => p.slug === slug) || null : null;
  const { data, error } = await (
    await db()
  )
    .from("products")
    .select("*,variants:product_variants(*),images:product_images(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw Error("Produit indisponible.");
  return data ? (await localizeProducts([data as Product]))[0] : null;
});
export type Settings = {
  name: string;
  announcement: string;
  contact_email: string;
  whatsapp: string;
  address: string;
  shipping_text: string;
  warranty_text: string;
  returns_text: string;
  cod_enabled: boolean;
  hero_title: string;
  hero_copy: string;
  terms: string;
  privacy: string;
  social_url: string;
};
export const settings = cache(async (): Promise<Settings> => {
  const defaults: Settings = {
    name: "Josheph Scooters",
    announcement: "LA MOBILITÉ ÉLECTRIQUE, AUTREMENT.",
    contact_email: "",
    whatsapp: "",
    address: "",
    shipping_text:
      "Les modalités et tarifs de livraison seront confirmés par la boutique.",
    warranty_text:
      "Les conditions de garantie seront précisées pour chaque produit par la boutique.",
    returns_text:
      "Contactez la boutique pour les conditions de retour applicables.",
    cod_enabled: false,
    hero_title: "ROULEZ VERS LE FUTUR.",
    hero_copy: "Découvrez une nouvelle façon de vous déplacer.",
    terms:
      "Conditions commerciales à renseigner par le propriétaire avant toute ouverture des commandes.",
    privacy:
      "Politique de confidentialité à compléter et valider avant mise en production.",
    social_url: "",
  };
  if (!configured()) return defaults;
  const { data, error } = await (
    await db()
  )
    .from("site_settings")
    .select("value")
    .eq("id", "store")
    .maybeSingle();
  if (error) throw Error("Configuration indisponible.");
  return { ...defaults, ...data?.value };
});
