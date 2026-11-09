import Link from "next/link";
import { notFound } from "next/navigation";
import { db, isAdmin } from "@/lib/supabase";
import { settings, categoryList } from "@/lib/data";
import { money, governorates, type Product } from "@/lib/model";
import { adminAction } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
type Row = Record<string, unknown>;
function Field({
  name,
  label,
  value = "",
  type = "text",
  required = false,
}: {
  name: string;
  label?: string;
  value?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label || name}
      <input name={name} type={type} defaultValue={value} required={required} />
    </label>
  );
}
function Check({
  name,
  label,
  checked = false,
}: {
  name: string;
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="check-label">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}
function Table({
  rows,
  columns,
  link,
}: {
  rows: Row[];
  columns: string[];
  link?: (r: Row) => string;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id || i)}>
              {columns.map((c, n) => (
                <td key={c}>
                  {link && n === 0 ? (
                    <Link className="under-link" href={link(r)}>
                      {String(r[c] ?? "—")}
                    </Link>
                  ) : typeof r[c] === "object" ? (
                    JSON.stringify(r[c])
                  ) : (
                    String(r[c] ?? "—")
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty">Aucune donnée enregistrée.</div>}
    </div>
  );
}
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!(await isAdmin())) return null;
  const path = (await params).path || [];
  const [root, id] = path;
  const query = await searchParams;
  const client = await db();
  const categories = await categoryList();
  if (!root) {
    const [
      products,
      orders,
      pending,
      confirmed,
      delivered,
      low,
      recent,
      movements,
      paid,
    ] = await Promise.all([
      client.from("products").select("id", { count: "exact", head: true }),
      client.from("orders").select("id", { count: "exact", head: true }),
      client
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      client
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
      client
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered"),
      client.from("products").select("name,stock").lte("stock", 3).limit(20),
      client
        .from("orders")
        .select("id,order_number,status,total_millimes")
        .order("created_at", { ascending: false })
        .limit(10),
      client
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      client.rpc("admin_revenue"),
    ]);
    return (
      <>
        <h1>Tableau de bord</h1>
        <div className="admin-stats">
          {[
            ["Produits", products.count],
            ["Commandes", orders.count],
            ["À confirmer", pending.count],
            ["Confirmées", confirmed.count],
            ["Livrées", delivered.count],
            ["Encaissements (hors annulées)", money(Number(paid.data || 0))],
          ].map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <strong>{v ?? 0}</strong>
            </div>
          ))}
        </div>
        <h2>Commandes récentes</h2>
        <Table
          rows={recent.data || []}
          columns={["order_number", "status", "total_millimes"]}
          link={(r) => `/admin/orders/${r.id}`}
        />
        <h2>Stock faible (≤ 3)</h2>
        <Table rows={low.data || []} columns={["name", "stock"]} />
        <h2>Activité récente</h2>
        <Table
          rows={movements.data || []}
          columns={["entity", "operation", "created_at"]}
        />
      </>
    );
  }
  if (root === "products") {
    if (id === "new" || path[2] === "edit") {
      const { data: p, error } =
        id && id !== "new"
          ? await client
              .from("products")
              .select("*,variants:product_variants(*)")
              .eq("id", id)
              .single()
          : { data: null, error: null };
      if (error) notFound();
      return (
        <>
          <h1>{p ? "Modifier le produit" : "Nouveau produit"}</h1>
          <ProductForm p={p as Product | null} />
          {p && (
            <>
              <h2>Accessoires et produits compatibles</h2>
              <p>
                Ajoutez ou retirez une relation à partir de l’UUID du produit
                compatible (visible dans son URL d’édition). Ne déclarez que des
                compatibilités vérifiées.
              </p>
              <ActionForm action={adminAction.bind(null, "compatibility")}>
                <input type="hidden" name="product_id" value={p.id} />
                <Field
                  name="compatible_id"
                  label="UUID produit compatible"
                  required
                />
                <Check name="remove" label="Retirer cette compatibilité" />
              </ActionForm>
            </>
          )}
          {p && (
            <details style={{ marginTop: 30 }}>
              <summary>Zone de suppression</summary>
              <p>
                Préférez l’archivage. La base refuse la suppression des produits
                liés à des commandes ou mouvements de stock.
              </p>
              <ActionForm
                action={adminAction.bind(null, "delete-product")}
                label="Supprimer définitivement"
              >
                <input type="hidden" name="id" value={p.id} />
                <Check
                  name="confirm"
                  label="Je confirme la suppression de ce produit"
                />
              </ActionForm>
            </details>
          )}
          {p && (
            <>
              <h2>Variantes</h2>
              <p>
                Le stock produit est le plafond global ; le stock de variante
                est contrôlé séparément. Utilisez Stock pour les ajustements
                audités.
              </p>
              <div className="admin-grid">
                {p.variants?.map((v: Record<string, string | number>) => (
                  <ActionForm
                    key={v.id}
                    action={adminAction.bind(null, "variant")}
                  >
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="product_id" value={p.id} />
                    {["name", "sku", "color", "price_millimes", "stock"].map(
                      (k) => (
                        <Field
                          key={k}
                          name={k}
                          value={v[k] || ""}
                          type={
                            ["price_millimes", "stock"].includes(k)
                              ? "number"
                              : "text"
                          }
                        />
                      ),
                    )}
                  </ActionForm>
                ))}
                <ActionForm
                  action={adminAction.bind(null, "variant")}
                  label="Ajouter une variante"
                >
                  <input type="hidden" name="product_id" value={p.id} />
                  {["name", "sku", "color", "price_millimes", "stock"].map(
                    (k) => (
                      <Field
                        key={k}
                        name={k}
                        type={
                          ["price_millimes", "stock"].includes(k)
                            ? "number"
                            : "text"
                        }
                      />
                    ),
                  )}
                </ActionForm>
              </div>
            </>
          )}
        </>
      );
    }
    let q = client
      .from("products")
      .select("id,name,sku,status,price_millimes,stock")
      .order("created_at", { ascending: false })
      .limit(100);
    if (query.q)
      q = q.ilike("name", `%${query.q.slice(0, 100).replaceAll("%", "")}%`);
    const { data, error } = await q;
    if (error) throw Error("Produits indisponibles");
    return (
      <>
        <h1>Produits</h1>
        <Link className="button" href="/admin/products/new">
          Créer un produit +
        </Link>
        <form style={{ marginBlock: 25 }}>
          <input name="q" placeholder="Rechercher" defaultValue={query.q} />
          <button className="button outline">Rechercher</button>
        </form>
        <Table
          rows={data || []}
          columns={["name", "sku", "status", "price_millimes", "stock"]}
          link={(r) => `/admin/products/${r.id}/edit`}
        />
      </>
    );
  }
  if (root === "categories") {
    const { data } = await client
      .from("categories")
      .select("*")
      .order("sort_order");
    return (
      <>
        <h1>Catégories</h1>
        <div className="admin-grid">
          {[
            ...(data || []),
            {
              id: "new",
              slug: "",
              name: "",
              sort_order: 0,
              archived: false,
              labels: {},
              image: "",
              parent_id: null,
            },
          ].map((c) => (
            <ActionForm key={c.id} action={adminAction.bind(null, "category")}>
              <Field name="slug" value={c.slug} required />
              <Field name="name" value={c.name} required />
              <Field name="sort_order" type="number" value={c.sort_order} />
              <Field
                name="image"
                value={c.image || ""}
                label="Image (URL HTTPS ou illustration locale)"
              />
              <label>
                Libellés FR/EN/AR (JSON)
                <textarea
                  name="labels"
                  defaultValue={JSON.stringify(c.labels || {}, null, 2)}
                />
              </label>
              <label>
                Catégorie parente
                <select name="parent_id" defaultValue={c.parent_id || ""}>
                  <option value="">Aucune</option>
                  {data
                    ?.filter((parent) => parent.id !== c.id)
                    .map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name}
                      </option>
                    ))}
                </select>
              </label>
              <Check name="archived" label="Archivée" checked={c.archived} />
            </ActionForm>
          ))}
        </div>
      </>
    );
  }
  if (root === "orders" && id) {
    const { data: o } = await client
      .from("orders")
      .select("*,items:order_items(*),history:order_status_history(*)")
      .eq("id", id)
      .maybeSingle();
    if (!o) notFound();
    return (
      <>
        <h1>{o.order_number}</h1>
        <p>
          Prix et coordonnées figés à la commande. Toute annulation avant
          expédition libère le stock une seule fois.
        </p>
        <pre>{JSON.stringify(o.customer, null, 2)}</pre>
        <Table
          rows={o.items}
          columns={[
            "product_name",
            "variant_name",
            "quantity",
            "unit_price_millimes",
          ]}
        />
        <h2>{money(o.total_millimes)}</h2>
        <ActionForm action={adminAction.bind(null, "order")}>
          <input type="hidden" name="id" value={o.id} />
          <label>
            État
            <select name="status" defaultValue={o.status}>
              {[
                "pending",
                "confirmed",
                "preparing",
                "shipped",
                "delivered",
                "cancelled",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Paiement
            <select name="payment" defaultValue={o.payment_status}>
              {["unpaid", "paid", "refunded"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Note / motif d’annulation
            <textarea name="note" maxLength={2000} />
          </label>
        </ActionForm>
        <h2>Historique</h2>
        <Table rows={o.history} columns={["status", "note", "created_at"]} />
      </>
    );
  }
  if (root === "orders") {
    let q = client
      .from("orders")
      .select("id,order_number,status,payment_status,total_millimes,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (query.status) q = q.eq("status", query.status);
    if (query.q)
      q = q.ilike(
        "order_number",
        `%${query.q.slice(0, 40).replaceAll("%", "")}%`,
      );
    const { data } = await q;
    return (
      <>
        <h1>Commandes</h1>
        <form className="filter-pair">
          <Field name="q" label="Numéro" value={query.q} />
          <label>
            État
            <select name="status" defaultValue={query.status || ""}>
              <option value="">Tous</option>
              {[
                "pending",
                "confirmed",
                "preparing",
                "shipped",
                "delivered",
                "cancelled",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button className="button">Filtrer</button>
        </form>
        <Table
          rows={data || []}
          columns={[
            "order_number",
            "status",
            "payment_status",
            "total_millimes",
            "created_at",
          ]}
          link={(r) => `/admin/orders/${r.id}`}
        />
      </>
    );
  }
  if (root === "customers") {
    const { data } = await client
      .from("profiles")
      .select("id,name,phone,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: inquiries } = await client
      .from("contact_inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return (
      <>
        <h1>Clients</h1>
        <p>
          Les comptes Auth restent administrés dans Supabase. Coordonnées des
          acheteurs invités disponibles uniquement sur les commandes.
        </p>
        <Table rows={data || []} columns={["name", "phone", "created_at"]} />
        <h2>Demandes de contact</h2>
        <Table
          rows={inquiries || []}
          columns={["name", "email", "message", "created_at"]}
        />
      </>
    );
  }
  if (root === "inventory") {
    const { data: products } = await client
      .from("products")
      .select("id,name,stock")
      .order("name")
      .limit(200);
    const { data: movements } = await client
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return (
      <>
        <h1>Inventaire</h1>
        <Table rows={products || []} columns={["name", "stock"]} />
        <h2>Ajustement audité</h2>
        <ActionForm action={adminAction.bind(null, "inventory")}>
          <label>
            Produit
            <select name="product_id">
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Field name="variant_id" label="ID variante (facultatif)" />
          <Field name="delta" type="number" label="Quantité (+ / −)" required />
          <Field name="reason" label="Motif" required />
        </ActionForm>
        <h2>Mouvements récents</h2>
        <Table
          rows={movements || []}
          columns={[
            "product_id",
            "variant_id",
            "delta",
            "reason",
            "created_at",
          ]}
        />
      </>
    );
  }
  if (root === "media") {
    const { data: products } = await client
      .from("products")
      .select("id,name")
      .limit(200);
    const { data: images } = await client
      .from("product_images")
      .select("*")
      .order("sort_order")
      .limit(100);
    const { data: files } = await client.storage
      .from("product-media")
      .list("", { limit: 100 });
    return (
      <>
        <h1>Médias</h1>
        <p>
          JPEG, PNG ou WebP uniquement, 5 Mo maximum. Le dernier téléversement
          devient l’image principale du produit.
        </p>
        <ActionForm action={adminAction.bind(null, "media")} label="Téléverser">
          <label>
            Produit
            <select name="product_id">
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fichier
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
            />
          </label>
          <Field name="alt" label="Texte alternatif" required />
          <Field name="sort_order" label="Position" type="number" value={0} />
        </ActionForm>
        <h2>Images associées</h2>
        <div className="admin-grid">
          {images?.map((image) => (
            <div key={image.id}>
              <ActionForm action={adminAction.bind(null, "edit-media")}>
                <input type="hidden" name="id" value={image.id} />
                <p>{image.path}</p>
                <Field name="alt" value={image.alt} required />
                <Field
                  name="sort_order"
                  type="number"
                  value={image.sort_order}
                />
              </ActionForm>
              <ActionForm
                action={adminAction.bind(null, "detach-media")}
                label="Dissocier du produit"
              >
                <input type="hidden" name="id" value={image.id} />
              </ActionForm>
            </div>
          ))}
        </div>
        <Table
          rows={images || []}
          columns={["product_id", "path", "alt", "sort_order"]}
        />
        <h2>Stockage</h2>
        {files?.map((f) => (
          <ActionForm
            key={f.id}
            action={adminAction.bind(null, "delete-media")}
            label="Supprimer si inutilisé"
          >
            <input type="hidden" name="path" value={f.name} />
            <p>{f.name}</p>
          </ActionForm>
        ))}
      </>
    );
  }
  if (root === "banners") {
    const { data } = await client
      .from("banners")
      .select("*")
      .order("starts_at", { ascending: false });
    return (
      <>
        <h1>Bannières</h1>
        <p>
          Les campagnes ne s’affichent que durant leurs dates actives. Aucun
          faux compte à rebours ni remise automatique.
        </p>
        <Table
          rows={data || []}
          columns={["title", "href", "enabled", "starts_at", "ends_at"]}
        />
        <h2>Créer une campagne</h2>
        <div className="admin-grid">
          {data?.map((b) => (
            <ActionForm key={b.id} action={adminAction.bind(null, "banner")}>
              <input type="hidden" name="id" value={b.id} />
              <Field name="title" value={b.title} required />
              <Field name="copy" value={b.copy} />
              <Field name="href" value={b.href} />
              <Field
                name="starts_at"
                type="datetime-local"
                value={b.starts_at.slice(0, 16)}
                required
              />
              <Field
                name="ends_at"
                type="datetime-local"
                value={b.ends_at?.slice(0, 16) || ""}
              />
              <Check name="enabled" label="Activer" checked={b.enabled} />
            </ActionForm>
          ))}
        </div>
        <ActionForm action={adminAction.bind(null, "banner")}>
          <Field name="title" required />
          <Field name="copy" />
          <Field name="href" value="/products" />
          <Field name="starts_at" type="datetime-local" required />
          <Field name="ends_at" type="datetime-local" />
          <Check name="enabled" label="Activer" />
        </ActionForm>
      </>
    );
  }
  if (root === "settings") {
    const s = await settings();
    const { data: rules } = await client.from("shipping_rules").select("*");
    return (
      <>
        <h1>Configuration</h1>
        <p>
          Ne publiez que des coordonnées et politiques vérifiées. Aucune donnée
          privée dans ces paramètres publics.
        </p>
        <div className="admin-grid">
          <ActionForm action={adminAction.bind(null, "settings")}>
            {Object.entries(s)
              .filter(([k]) => k !== "cod_enabled")
              .map(([key, value]) =>
                [
                  "shipping_text",
                  "warranty_text",
                  "returns_text",
                  "terms",
                  "privacy",
                ].includes(key) ? (
                  <label key={key}>
                    {key}
                    <textarea name={key} defaultValue={String(value)} />
                  </label>
                ) : (
                  <Field key={key} name={key} value={String(value)} />
                ),
              )}
            <Check
              name="cod_enabled"
              label="Activer le paiement à la livraison"
              checked={s.cod_enabled}
            />
          </ActionForm>
          <div>
            <h2>Règles de livraison</h2>
            <p>
              Tarif par commande : maximum des tarifs applicables aux articles.
              Règle catégorie prioritaire, sinon règle région générale. Sans
              règle : demande de confirmation, pas de commande.
            </p>
            <Table
              rows={rules || []}
              columns={[
                "governorate",
                "category_slug",
                "fee_millimes",
                "enabled",
              ]}
            />
            <ActionForm action={adminAction.bind(null, "shipping")}>
              <label>
                Gouvernorat
                <select name="governorate">
                  {governorates.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label>
                Catégorie
                <select name="category_slug">
                  <option value="">Toutes</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                name="fee_millimes"
                type="number"
                label="Tarif (millimes)"
                required
              />
              <Check name="enabled" label="Activer" />
            </ActionForm>
          </div>
        </div>
      </>
    );
  }
  notFound();
}
async function ProductForm({ p }: { p: Product | null }) {
  const categories = await categoryList();
  return (
    <ActionForm action={adminAction.bind(null, "product")}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="admin-grid">
        {["name", "slug", "sku", "brand"].map((k) => (
          <Field
            key={k}
            name={k}
            value={String(p?.[k as keyof Product] || "")}
            required={k !== "brand"}
          />
        ))}
        <label>
          Catégorie
          <select
            name="category_slug"
            defaultValue={p?.category_slug || "scooters"}
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          État
          <select name="status" defaultValue={p?.status || "draft"}>
            {["draft", "published", "archived"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {[
          "price_millimes",
          "stock",
          "motor_w",
          "battery_wh",
          "range_km",
          "speed_kmh",
          "weight_kg",
          "wheel_inches",
        ].map((k) => (
          <Field
            key={k}
            name={k}
            value={Number(p?.[k as keyof Product] || 0)}
            type="number"
          />
        ))}
        <Field
          name="image"
          label="Image (chemin local ou HTTPS)"
          value={p?.image || "/art/scooters.svg"}
        />
        <Check
          name="featured"
          label="Sélection homepage"
          checked={p?.featured}
        />
        <Check name="foldable" label="Pliable" checked={p?.foldable} />
      </div>
      <label>
        Description
        <textarea name="description" defaultValue={p?.description || ""} />
      </label>
      <Field name="seo_title" label="Titre SEO" value={p?.seo_title || ""} />
      <Field
        name="seo_description"
        label="Description SEO"
        value={p?.seo_description || ""}
      />
      <label>
        Traductions produit FR/EN/AR (JSON)
        <textarea
          name="localized"
          defaultValue={JSON.stringify(p?.localized || {}, null, 2)}
        />
      </label>
      <label>
        Spécifications complémentaires JSON (valeurs texte, unités visibles)
        <textarea
          name="specifications"
          defaultValue={JSON.stringify(p?.specifications || {}, null, 2)}
        />
      </label>
    </ActionForm>
  );
}
