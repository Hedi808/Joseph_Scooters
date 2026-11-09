import type { MetadataRoute } from "next";
import { db, configured } from "@/lib/supabase";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const paths = [
    "",
    "/products",
    "/scooters",
    "/ebikes",
    "/accessories",
    "/spare-parts",
    "/about",
    "/contact",
    "/delivery",
    "/warranty",
    "/returns",
    "/faq",
    "/privacy",
    "/terms",
  ];
  let products: { slug: string; updated_at: string }[] = [];
  if (configured()) {
    const { data, error } = await (
      await db()
    )
      .from("products")
      .select("slug,updated_at")
      .eq("status", "published")
      .eq("demo", false)
      .limit(1000);
    if (error) throw Error("Sitemap unavailable");
    products = data || [];
  }
  return [
    ...paths.map((p) => ({ url: base + p })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: new Date(p.updated_at),
    })),
  ];
}
