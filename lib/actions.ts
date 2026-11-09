"use server";
import { cookies, headers } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, configured, isAdmin, currentUser } from "./supabase";
import { checkoutSchema, productSchema } from "./model";
export type ActionState = { message: string; ok?: boolean; url?: string };
export async function changeLocale(form: FormData) {
  const locale = z.enum(["fr", "en", "ar"]).parse(form.get("locale"));
  (await cookies()).set("js-locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31536000,
  });
  revalidatePath("/", "layout");
}
async function rate(bucket: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "shared";
  const key = createHash("sha256").update(`${bucket}:${ip}`).digest("hex");
  const { data, error } = await (
    await db()
  ).rpc("consume_rate", { bucket: key });
  if (error || !data) throw Error("Veuillez réessayer plus tard.");
}
export async function authAction(
  mode: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!configured())
    return { message: "Configurez Supabase pour activer les comptes." };
  try {
    await rate("auth");
    const client = await db();
    const email = z.string().email().max(200).parse(form.get("email"));
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (mode === "forgot-password") {
      await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${base}/auth/callback?next=/reset-password`,
      });
      return {
        message:
          "Si cette adresse est enregistrée, un e-mail vous sera envoyé.",
        ok: true,
      };
    }
    const password = z.string().min(12).max(128).parse(form.get("password"));
    if (mode === "register") {
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${base}/auth/callback`,
          data: { name: z.string().max(120).parse(form.get("name")) },
        },
      });
      if (error)
        return { message: "Vérifiez vos informations ou réessayez plus tard." };
      return {
        message: "Consultez votre e-mail pour confirmer votre compte.",
        ok: true,
      };
    }
    if (mode === "reset-password") {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user)
        return {
          message: "Lien expiré. Demandez un nouveau lien de récupération.",
        };
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      return { message: "Mot de passe mis à jour.", ok: true, url: "/account" };
    }
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
      return { message: "Identifiants incorrects ou compte non confirmé." };
    return { message: "", ok: true, url: "/account" };
  } catch {
    return {
      message:
        "Demande refusée. Vérifiez les informations ou réessayez plus tard.",
    };
  }
}
export async function signOut() {
  if (configured()) await (await db()).auth.signOut();
  redirect("/login");
}
export async function checkoutAction(input: unknown): Promise<ActionState> {
  try {
    const parsed = checkoutSchema.parse(input);
    await rate("checkout");
    const { data, error } = await (
      await db()
    ).rpc("create_order", { payload: parsed });
    if (error || !data?.order_number)
      return {
        message:
          "Commande non créée : stock, livraison ou paiement indisponible. Contactez la boutique.",
      };
    (await cookies()).set(`js-order-${data.order_number}`, parsed.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/order",
      maxAge: 60 * 60 * 24 * 30,
    });
    return {
      message: "",
      ok: true,
      url: `/order/success/${data.order_number}`,
    };
  } catch {
    return {
      message:
        "Commande non créée. Vérifiez les informations et réessayez avec le même panier.",
    };
  }
}
export async function persistWishlist(productId: string, enabled: boolean) {
  if (!configured()) return;
  const user = await currentUser();
  if (!user) return;
  const id = z.string().uuid().parse(productId);
  const client = await db();
  if (enabled)
    await client
      .from("wishlist_items")
      .upsert({ user_id: user.id, product_id: id });
  else
    await client
      .from("wishlist_items")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", id);
}
export async function mergeWishlist(ids: string[]) {
  if (!configured()) return;
  const user = await currentUser();
  if (!user) return;
  const safe = z.array(z.string().uuid()).max(100).parse(ids);
  if (safe.length)
    await (await db()).from("wishlist_items").upsert(
      safe.map((product_id) => ({ user_id: user.id, product_id })),
      { onConflict: "user_id,product_id" },
    );
}
export async function contactAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await rate("contact");
    const data = z
      .object({
        name: z.string().min(2).max(120),
        email: z.string().email().max(200),
        message: z.string().min(10).max(3000),
      })
      .parse(Object.fromEntries(form));
    const { error } = await (
      await db()
    ).rpc("submit_inquiry", {
      p_name: data.name,
      p_email: data.email,
      p_message: data.message,
    });
    if (error) throw error;
    return { message: "Votre demande a été enregistrée.", ok: true };
  } catch {
    return {
      message: "Envoi impossible. Vérifiez les champs ou réessayez plus tard.",
    };
  }
}
export async function accountAction(
  kind: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const user = await currentUser();
    if (!user) throw Error("Unauthorized");
    const client = await db();
    let error;
    if (kind === "addresses") {
      const value = z
        .object({
          label: z.string().min(1).max(80),
          address: z.string().min(8).max(300),
          city: z.string().min(2).max(80),
          governorate: z.string().min(2).max(80),
          postal: z.string().regex(/^\d{4}$/),
        })
        .parse(Object.fromEntries(form));
      ({ error } = await client
        .from("addresses")
        .insert({ ...value, user_id: user.id }));
    } else {
      const value = z
        .object({ name: z.string().min(2).max(120), phone: z.string().max(30) })
        .parse(Object.fromEntries(form));
      ({ error } = await client
        .from("profiles")
        .upsert({ ...value, id: user.id }));
    }
    if (error) throw error;
    revalidatePath("/account", "layout");
    return { message: "Enregistré.", ok: true };
  } catch {
    return { message: "Enregistrement impossible." };
  }
}
export async function deleteAddress(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  await (
    await db()
  )
    .from("addresses")
    .delete()
    .eq("id", z.string().uuid().parse(form.get("id")))
    .eq("user_id", user.id);
  revalidatePath("/account/addresses");
}
export async function adminAction(
  kind: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    if (!(await isAdmin())) return { message: "Accès refusé." };
    await rate("admin");
    const client = await db();
    const values = Object.fromEntries(form);
    let error;
    if (kind === "product") {
      const input = productSchema.parse({
        ...values,
        featured: form.get("featured") === "on",
        foldable: form.get("foldable") === "on",
        specifications: JSON.parse(String(form.get("specifications") || "{}")),
        localized: JSON.parse(String(form.get("localized") || "{}")),
      });
      const id = form.get("id");
      if (id)
        ({ error } = await client
          .from("products")
          .update(input)
          .eq("id", z.string().uuid().parse(id)));
      else ({ error } = await client.from("products").insert(input));
    } else if (kind === "variant") {
      const input = z
        .object({
          product_id: z.string().uuid(),
          name: z.string().min(1).max(100),
          sku: z.string().min(1).max(80),
          color: z.string().max(80),
          price_millimes: z.coerce.number().int().min(0),
          stock: z.coerce.number().int().min(0),
        })
        .parse(values);
      const id = form.get("id");
      if (id)
        ({ error } = await client
          .from("product_variants")
          .update(input)
          .eq("id", z.string().uuid().parse(id)));
      else ({ error } = await client.from("product_variants").insert(input));
    } else if (kind === "compatibility") {
      const row = z
        .object({
          product_id: z.string().uuid(),
          compatible_id: z.string().uuid(),
        })
        .parse(values);
      if (form.get("remove") === "on")
        ({ error } = await client
          .from("product_compatibility")
          .delete()
          .eq("product_id", row.product_id)
          .eq("compatible_id", row.compatible_id));
      else ({ error } = await client.from("product_compatibility").upsert(row));
    } else if (kind === "category") {
      const input = z
        .object({
          slug: z.string().regex(/^[a-z0-9-]+$/),
          name: z.string().min(2).max(100),
          sort_order: z.coerce.number().int().min(0),
          archived: z.boolean(),
          labels: z.partialRecord(
            z.enum(["fr", "en", "ar"]),
            z.string().max(100),
          ),
          image: z
            .string()
            .max(2048)
            .refine(
              (v) =>
                v === "" || v.startsWith("/art/") || v.startsWith("https://"),
            ),
          parent_id: z.string().uuid().nullable(),
        })
        .parse({
          ...values,
          archived: form.get("archived") === "on",
          labels: JSON.parse(String(form.get("labels") || "{}")),
          parent_id: form.get("parent_id") || null,
        });
      ({ error } = await client
        .from("categories")
        .upsert(input, { onConflict: "slug" }));
    } else if (kind === "order") {
      const input = z
        .object({
          id: z.string().uuid(),
          status: z.enum([
            "pending",
            "confirmed",
            "preparing",
            "shipped",
            "delivered",
            "cancelled",
          ]),
          payment: z.enum(["unpaid", "paid", "refunded"]),
          note: z.string().max(2000),
        })
        .parse(values);
      ({ error } = await client.rpc("transition_order", {
        p_id: input.id,
        p_status: input.status,
        p_payment: input.payment,
        p_note: input.note,
      }));
    } else if (kind === "inventory") {
      const input = z
        .object({
          product_id: z.string().uuid(),
          variant_id: z.string(),
          delta: z.coerce.number().int().min(-100000).max(100000),
          reason: z.string().min(3).max(500),
        })
        .parse(values);
      ({ error } = await client.rpc("adjust_stock", {
        p_id: input.product_id,
        p_variant: input.variant_id
          ? z.string().uuid().parse(input.variant_id)
          : null,
        p_delta: input.delta,
        p_reason: input.reason,
      }));
    } else if (kind === "shipping") {
      const input = z
        .object({
          governorate: z.string().min(2).max(80),
          category_slug: z.string(),
          fee_millimes: z.coerce.number().int().min(0),
          enabled: z.boolean(),
        })
        .parse({ ...values, enabled: form.get("enabled") === "on" });
      ({ error } = await client
        .from("shipping_rules")
        .upsert(
          { ...input, category_slug: input.category_slug || null },
          { onConflict: "governorate,category_slug" },
        ));
    } else if (kind === "settings") {
      const value = z
        .object({
          name: z.string().min(2).max(80),
          announcement: z.string().max(200),
          hero_title: z.string().max(100),
          hero_copy: z.string().max(300),
          contact_email: z.union([z.string().email(), z.literal("")]),
          whatsapp: z.string().regex(/^(\d{8,15})?$/),
          address: z.string().max(300),
          shipping_text: z.string().max(5000),
          warranty_text: z.string().max(5000),
          returns_text: z.string().max(5000),
          terms: z.string().max(20000),
          privacy: z.string().max(20000),
          social_url: z.union([
            z.string().url().startsWith("https://"),
            z.literal(""),
          ]),
          cod_enabled: z.boolean(),
        })
        .parse({ ...values, cod_enabled: form.get("cod_enabled") === "on" });
      ({ error } = await client
        .from("site_settings")
        .upsert({ id: "store", value }));
    } else if (kind === "banner") {
      const input = z
        .object({
          title: z.string().min(2).max(150),
          copy: z.string().max(500),
          href: z.string().regex(/^\/(?!\/)/),
          starts_at: z.string().min(10),
          ends_at: z.string(),
          enabled: z.boolean(),
        })
        .parse({ ...values, enabled: form.get("enabled") === "on" });
      const row = { ...input, ends_at: input.ends_at || null };
      if (form.get("id"))
        ({ error } = await client
          .from("banners")
          .update(row)
          .eq("id", z.string().uuid().parse(form.get("id"))));
      else ({ error } = await client.from("banners").insert(row));
    } else if (kind === "delete-product") {
      if (form.get("confirm") !== "on") throw Error("Confirmation required");
      ({ error } = await client
        .from("products")
        .delete()
        .eq("id", z.string().uuid().parse(form.get("id"))));
    } else if (kind === "edit-media") {
      const input = z
        .object({
          id: z.string().uuid(),
          alt: z.string().min(1).max(300),
          sort_order: z.coerce.number().int().min(0).max(1000),
        })
        .parse(values);
      ({ error } = await client
        .from("product_images")
        .update({ alt: input.alt, sort_order: input.sort_order })
        .eq("id", input.id));
    } else if (kind === "detach-media") {
      const id = z.string().uuid().parse(form.get("id"));
      const { data: media, error: readError } = await client
        .from("product_images")
        .select("path,product_id")
        .eq("id", id)
        .single();
      if (readError || !media) throw Error("Not found");
      const {
        data: { publicUrl },
      } = client.storage.from("product-media").getPublicUrl(media.path);
      const result = await client
        .from("products")
        .update({ image: "/art/scooters.svg" })
        .eq("id", media.product_id)
        .eq("image", publicUrl);
      if (result.error) throw result.error;
      ({ error } = await client.from("product_images").delete().eq("id", id));
    } else if (kind === "media") {
      const file = form.get("file");
      if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
        throw Error("Invalid upload");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const valid =
        file.type === "image/png"
          ? bytes[0] === 137 &&
            bytes[1] === 80 &&
            bytes[2] === 78 &&
            bytes[3] === 71
          : file.type === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : file.type === "image/webp"
              ? String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
                String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
              : false;
      if (!valid) throw Error("Invalid image");
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/jpeg"
            ? "jpg"
            : "webp";
      const path = `${randomUUID()}.${ext}`;
      ({ error } = await client.storage
        .from("product-media")
        .upload(path, bytes, { contentType: file.type, upsert: false }));
      if (error) throw error;
      const pid = z.string().uuid().parse(form.get("product_id"));
      ({ error } = await client.from("product_images").insert({
        product_id: pid,
        path,
        alt: z.string().min(1).max(300).parse(form.get("alt")),
        sort_order: Number(form.get("sort_order") || 0),
      }));
      if (error) {
        await client.storage.from("product-media").remove([path]);
        throw error;
      }
      const {
        data: { publicUrl },
      } = client.storage.from("product-media").getPublicUrl(path);
      ({ error } = await client
        .from("products")
        .update({ image: publicUrl })
        .eq("id", pid));
    } else if (kind === "delete-media") {
      const path = z
        .string()
        .regex(/^[a-f0-9-]+\.(jpg|png|webp)$/)
        .parse(form.get("path"));
      const { data: media } = await client
        .from("product_images")
        .select("id")
        .eq("path", path);
      const {
        data: { publicUrl },
      } = client.storage.from("product-media").getPublicUrl(path);
      const { count } = await client
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("image", publicUrl);
      if (media?.length || count) throw Error("Media in use");
      ({ error } = await client.storage.from("product-media").remove([path]));
    } else throw Error("Unknown operation");
    if (error)
      return {
        message:
          "Enregistrement refusé. Vérifiez les contraintes et les transitions autorisées.",
      };
    revalidatePath("/", "layout");
    return { message: "Enregistré.", ok: true };
  } catch {
    return {
      message:
        "Enregistrement impossible. Vérifiez tous les champs et votre autorisation.",
    };
  }
}
