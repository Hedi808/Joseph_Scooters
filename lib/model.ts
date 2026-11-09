import { z } from "zod";
export const categories = [
  { slug: "scooters", name: "Trottinettes électriques" },
  { slug: "ebikes", name: "Vélos électriques" },
  { slug: "accessories", name: "Accessoires" },
  { slug: "spare-parts", name: "Pièces détachées" },
];
export const governorates = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "La Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
];
export type Variant = {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price_millimes: number;
  stock: number;
  color: string;
};
export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category_slug: string;
  description: string;
  price_millimes: number;
  stock: number;
  featured: boolean;
  status: string;
  demo: boolean;
  image: string;
  motor_w: number | null;
  battery_wh: number | null;
  range_km: number | null;
  speed_kmh: number | null;
  weight_kg: number | null;
  wheel_inches: number | null;
  foldable: boolean;
  specifications: Record<string, string>;
  variants?: Variant[];
  localized?: Partial<
    Record<"fr" | "en" | "ar", { name?: string; description?: string }>
  >;
  seo_title?: string | null;
  seo_description?: string | null;
  images?: { id: string; path: string; alt: string; sort_order: number }[];
  created_at: string;
};
export const money = (millimes: number, locale = "fr-TN") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
  }).format(millimes / 1000);
export function quantity(value: number, stock: number) {
  return Math.max(
    0,
    Math.min(99, stock, Math.floor(Number.isFinite(value) ? value : 0)),
  );
}
export function total(
  items: { price: number; quantity: number }[],
  shipping: number,
) {
  if (
    !Number.isSafeInteger(shipping) ||
    shipping < 0 ||
    items.some(
      (i) =>
        !Number.isSafeInteger(i.price) ||
        i.price < 0 ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1,
    )
  )
    throw Error("Invalid amount");
  return items.reduce((sum, i) => sum + i.price * i.quantity, shipping);
}
const nonnegative = z.coerce.number().int().min(0).max(1000000000);
export const productSchema = z.object({
  name: z.string().min(3).max(160),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(180),
  sku: z.string().min(1).max(80),
  brand: z.string().max(80),
  category_slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  description: z.string().max(10000),
  price_millimes: nonnegative,
  stock: nonnegative,
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean().default(false),
  image: z
    .string()
    .max(2048)
    .refine(
      (v) => v.startsWith("/art/") || /^https:\/\//.test(v),
      "HTTPS image required",
    ),
  motor_w: z.coerce.number().min(0).nullable().optional(),
  battery_wh: z.coerce.number().min(0).nullable().optional(),
  range_km: z.coerce.number().min(0).nullable().optional(),
  speed_kmh: z.coerce.number().min(0).nullable().optional(),
  weight_kg: z.coerce.number().min(0).nullable().optional(),
  wheel_inches: z.coerce.number().min(0).nullable().optional(),
  foldable: z.boolean().default(false),
  specifications: z.record(z.string(), z.string().max(500)).default({}),
  localized: z
    .partialRecord(
      z.enum(["fr", "en", "ar"]),
      z.object({
        name: z.string().max(160).optional(),
        description: z.string().max(10000).optional(),
      }),
    )
    .default({}),
  seo_title: z.string().max(160).optional(),
  seo_description: z.string().max(300).optional(),
});
export const filterSchema = z.object({
  q: z.string().max(100).default(""),
  category: z.string().max(80).default(""),
  brand: z.string().max(80).default(""),
  color: z.string().max(80).default(""),
  suspension: z.string().max(100).default(""),
  brakes: z.string().max(100).default(""),
  usage: z.string().max(100).default(""),
  min: z.coerce.number().min(0).default(0),
  max: z.coerce.number().min(0).default(100000),
  motor: z.coerce.number().min(0).default(0),
  range: z.coerce.number().min(0).default(0),
  battery: z.coerce.number().min(0).default(0),
  speed: z.coerce.number().min(0).default(0),
  weight: z.coerce.number().min(0).default(0),
  wheel: z.coerce.number().min(0).default(0),
  foldable: z.enum(["", "true", "false"]).default(""),
  stock: z.enum(["", "true"]).default(""),
  sort: z
    .enum(["newest", "price-asc", "price-desc", "featured"])
    .default("newest"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type Filters = z.infer<typeof filterSchema>;
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const clean = Object.fromEntries(
    Object.entries(params).map(([k, v]) => {
      const value = Array.isArray(v) ? v[0] : v;
      return [k, value === "" ? undefined : value];
    }),
  );
  const result = filterSchema.safeParse(clean);
  return result.success ? result.data : filterSchema.parse({});
}
export const checkoutSchema = z.object({
  idempotency: z.string().uuid(),
  token: z.string().min(40).max(100),
  name: z.string().min(3).max(120),
  email: z.string().email().max(200),
  phone: z.string().regex(/^(\+216\s?)?[2459]\d{7}$/),
  address: z.string().min(8).max(300),
  city: z.string().min(2).max(80),
  governorate: z.enum(governorates as [string, ...string[]]),
  postal: z.string().regex(/^\d{4}$/),
  notes: z.string().max(1000).default(""),
  terms: z.literal(true),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().nullable(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(30),
});
