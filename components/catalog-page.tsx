import Link from "next/link";
import { catalog, categoryList } from "@/lib/data";
import { parseFilters } from "@/lib/model";
import { i18n } from "@/lib/locale";
import { ProductCard } from "./product-card";
export async function CatalogPage({
  params,
  category,
}: {
  params: Record<string, string | string[] | undefined>;
  category?: string;
}) {
  const f = parseFilters({ ...params, ...(category ? { category } : {}) });
  const [{ products, count }, { t }] = await Promise.all([catalog(f), i18n()]);
  const categories = await categoryList();
  const title = category
    ? categories.find((c) => c.slug === category)?.name || category
    : t.products;
  function pageHref(page: number) {
    const q = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== "" && k !== "page") q.set(k, String(v));
    });
    q.set("page", String(page));
    return `?${q}`;
  }
  return (
    <>
      <section className="page-heading">
        <div className="shell">
          <p className="eyebrow">JOSHEPH / COLLECTION</p>
          <h1>{title}</h1>
        </div>
      </section>
      <div className="shell catalog-layout">
        <form className="filters">
          <h2>{t.filters}</h2>
          {category ? (
            <input type="hidden" name="category" value={category} />
          ) : (
            <label>
              Catégorie
              <select name="category" defaultValue={f.category}>
                <option value="">{t.products}</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {t.search}
            <input name="q" defaultValue={f.q} maxLength={100} />
          </label>
          <label>
            Marque / Brand
            <input name="brand" defaultValue={f.brand} />
          </label>
          <div className="filter-pair">
            <label>
              Min (TND)
              <input
                type="number"
                name="min"
                min={0}
                defaultValue={f.min || ""}
              />
            </label>
            <label>
              Max (TND)
              <input
                type="number"
                name="max"
                min={0}
                defaultValue={f.max === 100000 ? "" : f.max}
              />
            </label>
          </div>
          <label>
            {t.stock}
            <select name="stock" defaultValue={f.stock}>
              <option value="">—</option>
              <option value="true">{t.stock}</option>
            </select>
          </label>
          <label>
            Tri / Sort
            <select name="sort" defaultValue={f.sort}>
              <option value="newest">{t.newest}</option>
              <option value="price-asc">{t.priceAsc}</option>
              <option value="price-desc">{t.priceDesc}</option>
              <option value="featured">{t.featured}</option>
            </select>
          </label>
          <details>
            <summary>{t.details}</summary>
            {(
              [
                ["color", "Couleur / Color"],
                ["suspension", "Suspension"],
                ["brakes", "Freins / Brakes"],
                ["usage", "Usage"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input name={key} defaultValue={f[key]} maxLength={100} />
              </label>
            ))}
            {[
              ["motor", t.motor + " (W min)"],
              ["range", t.range + " (km min)"],
              ["battery", t.battery + " (Wh min)"],
              ["speed", t.speed + " (km/h min)"],
              ["weight", t.weight + " (kg max)"],
              ["wheel", t.wheel + " (in)"],
            ].map(([k, label]) => (
              <label key={k}>
                {label}
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  name={k}
                  defaultValue={f[k as keyof typeof f] || ""}
                />
              </label>
            ))}
            <label>
              {t.foldable}
              <select name="foldable" defaultValue={f.foldable}>
                <option value="">—</option>
                <option value="true">Oui / Yes</option>
                <option value="false">Non / No</option>
              </select>
            </label>
          </details>
          <button className="button">{t.filters}</button>
          <Link
            className="under-link"
            href={category ? `/${category}` : "/products"}
          >
            {t.reset}
          </Link>
        </form>
        <div>
          <div className="result-toolbar">
            <span>
              {count} {t.results}
            </span>
            <span>
              {f.page} / {Math.max(1, Math.ceil(count / 12))}
            </span>
          </div>
          {products.length ? (
            <div className="product-grid">
              {products.map((p, n) => (
                <ProductCard key={p.id} product={p} eager={n < 3} />
              ))}
            </div>
          ) : (
            <div className="empty">{t.empty}</div>
          )}
          <nav className="pagination" aria-label="Pagination">
            {f.page > 1 && <Link href={pageHref(f.page - 1)}>←</Link>}
            {f.page * 12 < count && <Link href={pageHref(f.page + 1)}>→</Link>}
          </nav>
        </div>
      </div>
    </>
  );
}
