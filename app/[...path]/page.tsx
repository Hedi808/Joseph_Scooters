import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CatalogPage } from "@/components/catalog-page";
import { CartPage } from "@/components/cart-page";
import { CheckoutPage } from "@/components/checkout-page";
import { ActionForm } from "@/components/action-form";
import { Gallery, ProductControls } from "@/components/product-controls";
import { ProductCard } from "@/components/product-card";
import { settings, product, catalog } from "@/lib/data";
import { configured, db, currentUser } from "@/lib/supabase";
import { i18n } from "@/lib/locale";
import {
  authAction,
  contactAction,
  accountAction,
  signOut,
  deleteAddress,
} from "@/lib/actions";
import {
  categories,
  filterSchema,
  money,
  governorates,
  type Product,
} from "@/lib/model";
type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const privateRoots = [
  "cart",
  "checkout",
  "wishlist",
  "compare",
  "account",
  "order",
  "login",
  "register",
  "forgot-password",
  "reset-password",
];
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  if (path[0] === "product" && path[1]) {
    const p = await product(path[1]);
    return {
      title: p?.seo_title || p?.name || "Produit introuvable",
      description: p?.seo_description || p?.description.slice(0, 160),
      alternates: { canonical: `/product/${path[1]}` },
      robots: { index: !p?.demo },
    };
  }
  return {
    title: categories.find((c) => c.slug === path[0])?.name || path.join(" / "),
    alternates: { canonical: `/${path.join("/")}` },
    robots: { index: !privateRoots.includes(path[0]) },
  };
}
export default async function Page({ params, searchParams }: Props) {
  const { path } = await params;
  const [root, slug, id] = path;
  const query = await searchParams;
  const [{ t }, s] = await Promise.all([i18n(), settings()]);
  if (
    path.length === 1 &&
    ["products", "search", ...categories.map((c) => c.slug)].includes(root)
  )
    return (
      <CatalogPage
        params={query}
        category={categories.some((c) => c.slug === root) ? root : undefined}
      />
    );
  if (root === "category" && path.length === 2)
    return <CatalogPage params={query} category={slug} />;
  if (root === "product" && path.length === 2) {
    const p = await product(slug);
    if (!p) notFound();
    const related = await catalog(
      filterSchema.parse({ category: p.category_slug }),
      4,
    );
    const { data: compatibleRows } = configured()
      ? await (
          await db()
        )
          .from("product_compatibility")
          .select(
            "compatible:products!product_compatibility_compatible_id_fkey(*)",
          )
          .eq("product_id", p.id)
          .limit(8)
      : { data: [] };
    const compatible = (
      (compatibleRows as unknown as { compatible: Product | null }[]) || []
    ).flatMap((row) => (row.compatible ? [row.compatible] : []));
    const specs = [
      [t.motor, p.motor_w ? `${p.motor_w} W` : "—"],
      [t.battery, p.battery_wh ? `${p.battery_wh} Wh` : "—"],
      [t.range, p.range_km ? `${p.range_km} km (estimation)` : "—"],
      [t.speed, p.speed_kmh ? `${p.speed_kmh} km/h` : "—"],
      [t.weight, p.weight_kg ? `${p.weight_kg} kg` : "—"],
      [t.wheel, p.wheel_inches ? `${p.wheel_inches}″` : "—"],
      ...Object.entries(p.specifications),
    ];
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      sku: p.sku,
      description: p.description,
      brand: { "@type": "Brand", name: p.brand },
      image: new URL(
        p.image,
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      ).href,
      offers: {
        "@type": "Offer",
        priceCurrency: "TND",
        price: (
          (p.variants?.[0]?.price_millimes ?? p.price_millimes) / 1000
        ).toFixed(3),
        availability:
          p.stock > 0 &&
          (!p.variants?.length || p.variants.some((v) => v.stock > 0))
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/product/${p.slug}`,
      },
    };
    return (
      <section className="shell section-space">
        <nav className="breadcrumb">
          <Link href="/">Accueil</Link>
          <span>/</span>
          <Link href={`/${p.category_slug}`}>
            {categories.find((c) => c.slug === p.category_slug)?.name}
          </Link>
          <span>/</span>
          <span>{p.name}</span>
        </nav>
        <div className="detail-grid">
          <Gallery product={p} />
          <div className="detail-copy">
            <p className="detail-brand">
              {p.brand} / {p.sku}
            </p>
            <h1>{p.name}</h1>
            <p className="description">{p.description}</p>
            <ProductControls product={p} />
            {s.whatsapp && (
              <a
                className="under-link"
                href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`Bonjour, je souhaite des informations sur ${p.name} (${p.sku}).`)}`}
              >
                WhatsApp ↗
              </a>
            )}
            <div className="notice">
              <strong>{t.delivery}</strong>
              <p>{s.shipping_text}</p>
              <strong>{t.warranty}</strong>
              <p>{p.specifications.Garantie || s.warranty_text}</p>
            </div>
          </div>
        </div>
        <section className="spec-table">
          <h2>{t.details}</h2>
          <dl>
            {specs.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="notice">
            L’autonomie annoncée est une estimation : poids, relief, température
            et conditions de conduite influencent le résultat. Puissance
            nominale et puissance de crête sont distinctes.
          </p>
        </section>
        <div className="information">
          <h2>Sécurité et entretien</h2>
          <p>
            Vérifiez régulièrement les pneus, les freins et les fixations.
            Utilisez uniquement un chargeur compatible. Consultez la notice
            constructeur et les règles de circulation applicables. Ne rechargez
            pas une batterie endommagée.
          </p>
        </div>
        {!!compatible.length && (
          <section style={{ marginTop: 50 }}>
            <h2 style={{ marginBottom: 25 }}>{t.accessories}</h2>
            <div className="product-grid">
              {compatible.map((v) => (
                <ProductCard key={v.id} product={v} />
              ))}
            </div>
          </section>
        )}
        <section style={{ marginTop: 60 }}>
          <h2 style={{ marginBottom: 30 }}>{t.select}</h2>
          <div className="product-grid">
            {related.products
              .filter((v) => v.id !== p.id)
              .map((v) => (
                <ProductCard product={v} key={v.id} />
              ))}
          </div>
        </section>
        {!p.demo && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema).replaceAll("<", "\\u003c"),
            }}
          />
        )}
      </section>
    );
  }
  if (["cart", "wishlist", "compare"].includes(root) && path.length === 1) {
    let initialWishlist: Product[] | undefined;
    if (root === "wishlist" && (await currentUser())) {
      const { data, error } = await (
        await db()
      )
        .from("wishlist_items")
        .select("product:products(*,variants:product_variants(*))")
        .limit(100);
      if (error) throw Error("Favoris indisponibles.");
      initialWishlist = (
        (data as unknown as { product: Product | null }[]) || []
      ).flatMap((row) => (row.product ? [row.product] : []));
    }
    return (
      <CartPage
        mode={root as "cart" | "wishlist" | "compare"}
        initialWishlist={initialWishlist}
      />
    );
  }
  if (root === "checkout" && path.length === 1) {
    const { data } = configured()
      ? await (
          await db()
        )
          .from("shipping_rules")
          .select("governorate,category_slug,fee_millimes")
          .eq("enabled", true)
      : { data: [] };
    return (
      <CheckoutPage
        enabled={s.cod_enabled && configured()}
        rules={data || []}
      />
    );
  }
  if (
    ["login", "register", "forgot-password", "reset-password"].includes(root) &&
    path.length === 1
  )
    return (
      <div className="form-card">
        <h1>
          {root === "login"
            ? t.login
            : root === "register"
              ? t.register
              : t.forgot}
        </h1>
        <ActionForm
          action={authAction.bind(null, root)}
          label={
            root === "register"
              ? t.register
              : root === "login"
                ? t.login
                : t.submit
          }
        >
          {root === "register" && (
            <label>
              {t.name}
              <input name="name" required autoComplete="name" />
            </label>
          )}
          <label>
            {t.email}
            <input type="email" name="email" required autoComplete="email" />
          </label>
          {root !== "forgot-password" && (
            <label>
              {t.password}
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete={
                  root === "login" ? "current-password" : "new-password"
                }
              />
              <small>12 caractères minimum</small>
            </label>
          )}
        </ActionForm>
        <div className="form-links">
          <Link href="/login">{t.login}</Link>
          <Link href="/register">{t.register}</Link>
          <Link href="/forgot-password">{t.forgot}</Link>
        </div>
      </div>
    );
  if (root === "account") {
    const user = await currentUser();
    if (!user) redirect("/login");
    const client = await db();
    const nav = (
      <nav className="account-nav">
        <Link href="/account">{t.account}</Link>
        <Link href="/account/orders">Commandes</Link>
        <Link href="/account/addresses">{t.address}</Link>
        <Link href="/account/settings">Paramètres</Link>
        <form action={signOut}>
          <button className="cart-remove">{t.logout}</button>
        </form>
      </nav>
    );
    if (path.length === 1 || slug === "settings") {
      const { data: profile } = await client
        .from("profiles")
        .select("name,phone")
        .eq("id", user.id)
        .maybeSingle();
      return (
        <section className="shell section-space">
          <h1>{t.account}</h1>
          {nav}
          <div className="information">
            <p>{user.email}</p>
            <ActionForm action={accountAction.bind(null, "profile")}>
              <label>
                {t.name}
                <input
                  name="name"
                  defaultValue={profile?.name || user.user_metadata.name || ""}
                  required
                />
              </label>
              <label>
                {t.phone}
                <input name="phone" defaultValue={profile?.phone || ""} />
              </label>
            </ActionForm>
            <Link className="under-link" href="/forgot-password">
              {t.forgot}
            </Link>
          </div>
        </section>
      );
    }
    if (slug === "addresses" && path.length === 2) {
      const { data: addresses } = await client
        .from("addresses")
        .select("*")
        .eq("user_id", user.id);
      return (
        <section className="shell section-space">
          <h1>{t.address}</h1>
          {nav}
          <div className="admin-grid">
            <div>
              {addresses?.map((a) => (
                <article className="notice" key={a.id}>
                  <strong>{a.label}</strong>
                  <p>
                    {a.address}, {a.city}, {a.governorate} {a.postal}
                  </p>
                  <form action={deleteAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="cart-remove">{t.remove}</button>
                  </form>
                </article>
              ))}
            </div>
            <ActionForm action={accountAction.bind(null, "addresses")}>
              <label>
                Libellé
                <input name="label" required />
              </label>
              {(["address", "city", "postal"] as const).map((k) => (
                <label key={k}>
                  {t[k]}
                  <input name={k} required />
                </label>
              ))}
              <label>
                {t.governorate}
                <select name="governorate">
                  {governorates.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
            </ActionForm>
          </div>
        </section>
      );
    }
    if (slug === "orders" && id) {
      const { data: order } = await client
        .from("orders")
        .select("*,items:order_items(*),history:order_status_history(*)")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!order) notFound();
      return (
        <section className="shell section-space">
          <h1>{order.order_number}</h1>
          {nav}
          <p className="notice">
            {order.status} · {order.payment_status}
          </p>
          <OrderItems items={order.items} />
          <h2>{money(order.total_millimes)}</h2>
          <h3>Historique</h3>
          {order.history.map(
            (h: { id: string; status: string; created_at: string }) => (
              <p key={h.id}>
                {h.created_at} — {h.status}
              </p>
            ),
          )}
        </section>
      );
    }
    if (slug === "orders" && path.length === 2) {
      const { data: orders } = await client
        .from("orders")
        .select("id,order_number,status,total_millimes,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (
        <section className="shell section-space">
          <h1>Commandes</h1>
          {nav}
          {!orders?.length ? (
            <div className="empty">{t.empty}</div>
          ) : (
            <table className="data-table">
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/account/orders/${o.id}`}>
                        {o.order_number}
                      </Link>
                    </td>
                    <td>{o.status}</td>
                    <td>{money(o.total_millimes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      );
    }
    notFound();
  }
  if (root === "order" && slug === "success" && id && path.length === 3) {
    const token = (await cookies()).get(`js-order-${id}`)?.value;
    if (!configured() || !token) notFound();
    const { data: order } = await (
      await db()
    ).rpc("guest_order", { number: id, token });
    if (!order) notFound();
    return (
      <section className="shell section-space information">
        <p className="eyebrow">COMMANDE ENREGISTRÉE</p>
        <h1>{order.order_number}</h1>
        <p className="notice">{t.pending}</p>
        <p>
          {order.status} · {order.payment_status}
        </p>
        <OrderItems items={order.items || []} />
        <h2>{money(order.total_millimes)}</h2>
        <p>
          Conservez l’accès à ce navigateur. Cette confirmation est protégée par
          un jeton privé.
        </p>
      </section>
    );
  }
  if (root === "contact" && path.length === 1)
    return (
      <section className="shell section-space">
        <p className="eyebrow">CONTACT</p>
        <h1>{t.contact}</h1>
        <div className="admin-grid" style={{ marginTop: 40 }}>
          <div className="information">
            <p>
              Une question sur un modèle, une pièce ou une livraison ? Envoyez
              votre demande à la boutique.
            </p>
            {s.contact_email && (
              <p>
                <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>
              </p>
            )}
            {s.address && <p>{s.address}</p>}
            {s.whatsapp && (
              <a href={`https://wa.me/${s.whatsapp}`} className="button">
                WhatsApp ↗
              </a>
            )}
          </div>
          <ActionForm action={contactAction} label={t.submit}>
            <label>
              {t.name}
              <input name="name" required maxLength={120} />
            </label>
            <label>
              {t.email}
              <input type="email" name="email" required maxLength={200} />
            </label>
            <label>
              Message
              <textarea
                name="message"
                minLength={10}
                maxLength={3000}
                required
              />
            </label>
          </ActionForm>
        </div>
      </section>
    );
  if (
    [
      "about",
      "delivery",
      "warranty",
      "returns",
      "faq",
      "privacy",
      "terms",
    ].includes(root) &&
    path.length === 1
  ) {
    const title = root === "terms" ? t.legal : t[root as keyof typeof t];
    const copy: Record<string, string> = {
      about:
        "Josheph Scooters est un projet de boutique dédié à la mobilité électrique : trottinettes, vélos, accessoires et pièces détachées. Les informations légales et coordonnées de l’entreprise doivent être complétées par le propriétaire avant ouverture.",
      delivery: s.shipping_text,
      warranty: s.warranty_text,
      returns: s.returns_text,
      privacy: s.privacy,
      terms: s.terms,
    };
    return (
      <section className="shell section-space information">
        <p className="eyebrow">JOSHEPH / INFORMATIONS</p>
        <h1>{title}</h1>
        {root === "faq" ? (
          <>
            {[
              [
                "Comment choisir l’autonomie ?",
                "Estimez vos trajets et gardez une marge. Le poids, la météo et le relief influencent la portée réelle.",
              ],
              [
                "Quelle puissance moteur ?",
                "Comparez la puissance nominale. La puissance de crête décrit une capacité temporaire, pas la puissance continue.",
              ],
              [
                "Comment entretenir la batterie ?",
                "Suivez les recommandations du constructeur, utilisez le chargeur compatible et évitez les températures extrêmes.",
              ],
              [
                "Vélo ou trottinette ?",
                "Comparez distance, confort, rangement, position et relief. Un essai et les dimensions du cadre aident à choisir.",
              ],
              [
                "Livraison, garantie et paiement ?",
                `${s.shipping_text}\n${s.warranty_text} Le paiement à la livraison est disponible uniquement si activé par la boutique.`,
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </>
        ) : (
          <p style={{ marginTop: 30 }}>{copy[root]}</p>
        )}
        <Link href="/contact" className="under-link" style={{ marginTop: 30 }}>
          {t.request} ↗
        </Link>
      </section>
    );
  }
  notFound();
}
function OrderItems({
  items,
}: {
  items: {
    product_name: string;
    quantity: number;
    unit_price_millimes: number;
  }[];
}) {
  return (
    <table className="data-table">
      <tbody>
        {items.map((i, n) => (
          <tr key={n}>
            <td>{i.product_name}</td>
            <td>×{i.quantity}</td>
            <td>{money(i.unit_price_millimes * i.quantity)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
