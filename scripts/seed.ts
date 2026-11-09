import { createClient } from "@supabase/supabase-js";
import { demoProducts } from "../lib/demo";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SEED_SUPABASE_SECRET_KEY;
if (
  process.env.NODE_ENV === "production" ||
  !url ||
  !secret ||
  new URL(url).hostname.split(".")[0] !==
    process.env.SEED_CONFIRM_PROJECT_REF ||
  process.env.DEMO_MODE !== "true"
)
  throw Error(
    "Seed refused: explicitly confirm your DEVELOPMENT project reference and DEMO_MODE=true.",
  );
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const p of demoProducts) {
  const { variants, ...row } = p;
  const { error } = await client
    .from("products")
    .upsert(row, { onConflict: "id" });
  if (error) throw error;
  if (variants?.length) {
    const { error } = await client
      .from("product_variants")
      .upsert(variants, { onConflict: "id" });
    if (error) throw error;
  }
}
console.log(
  "12 fictional demo products upserted. Demo products cannot be ordered. No accounts, reviews, policies, delivery fees or orders seeded.",
);
