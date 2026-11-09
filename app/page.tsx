import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Zap,
  MoveUpRight,
  BatteryCharging,
  Route,
  ShieldCheck,
} from "lucide-react";
import { catalog, settings, categoryList } from "@/lib/data";
import { filterSchema } from "@/lib/model";
import { i18n } from "@/lib/locale";
import { ProductCard } from "@/components/product-card";
import { configured, db } from "@/lib/supabase";
import { editorial } from "@/lib/editorial";
export default async function Home() {
  const [{ products }, s, { t, locale }] = await Promise.all([
    catalog(filterSchema.parse({ sort: "featured" }), 4),
    settings(),
    i18n(),
  ]);
  const c = editorial[locale];
  const categories = await categoryList();
  const { data: banners } = configured()
    ? await (
        await db()
      )
        .from("banners")
        .select("*")
        .eq("enabled", true)
        .lte("starts_at", new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .limit(3)
    : { data: [] };
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="shell hero-content">
          <div className="hero-copy">
            <p className="eyebrow">JOSHEPH / ELECTRIC MOBILITY</p>
            <h1>{locale === "fr" ? s.hero_title : t.hero}</h1>
            <p className="hero-description">
              {locale === "fr" ? s.hero_copy : t.copy}
            </p>
            <div className="hero-buttons">
              <Link className="button" href="/scooters">
                {t.scooters}
                <ArrowUpRight size={20} />
              </Link>
              <Link className="text-link" href="/ebikes">
                {t.ebikes}
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hero-bottom">
              <span className="tiny-orbit" />
              <span>
                {c.less}
                <br />
                {c.freedom}
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orange-orbit" />
            <span className="hero-number">01 / URBAN MOVEMENT</span>
            <Image
              src="/art/hero.svg"
              alt="Illustration conceptuelle d’une trottinette — visuel à remplacer"
              width={1000}
              height={920}
              loading="eager"
              fetchPriority="high"
            />
            <div className="hero-art-label">
              <Zap size={18} />
              <span>
                ÉLECTRIQUE.
                <br />
                <strong>TOUT SIMPLEMENT.</strong>
              </span>
              <MoveUpRight />
            </div>
            <small>{c.illustration}</small>
          </div>
        </div>
      </section>
      <div className="marquee">
        <span>URBAN FREEDOM</span>
        <Zap size={23} />
        <span>ELECTRIC ENERGY</span>
        <Zap size={23} />
        <span>MOVE DIFFERENT</span>
        <Zap size={23} />
        <span>JOSHEPH SCOOTERS</span>
      </div>
      <section className="shell section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / {c.explore}</p>
            <h2>
              {c.journey}
              <br />
              <span>{c.mobility}</span>
            </h2>
          </div>
          <Link href="/products" className="under-link">
            {t.products}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((c, i) => (
            <Link
              href={
                ["scooters", "ebikes", "accessories", "spare-parts"].includes(
                  c.slug,
                )
                  ? `/${c.slug}`
                  : `/category/${c.slug}`
              }
              key={c.slug}
              className="category-card"
            >
              <span className="category-number">0{i + 1}</span>
              <Image
                src={c.image}
                unoptimized={!c.image.startsWith("/")}
                alt="Illustration de catégorie"
                width={480}
                height={360}
              />
              <div>
                <h3>{c.name}</h3>
                <span className="round-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="shell section-space products-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 / {t.select}</p>
            <h2>{t.selection}</h2>
          </div>
          <Link href="/products?sort=featured" className="under-link">
            {t.discover}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {!products.length && <div className="empty">{t.empty}</div>}
      </section>
      <section className="editorial">
        <div className="shell editorial-grid">
          <div>
            <p className="eyebrow">{c.reinvent}</p>
            <h2>
              {c.city}
              <br />
              <span>{c.yours}</span>
            </h2>
            <p>{c.cityCopy}</p>
            <Link className="button" href="/scooters">
              {t.scooters}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="editorial-image">
            <Image
              src="/art/scooters.svg"
              alt="Concept de trottinette — illustration"
              width={800}
              height={640}
            />
            <span>{c.compact}</span>
          </div>
        </div>
      </section>
      <section className="shell section-space bike-section">
        <div className="bike-visual">
          <Image
            src="/art/ebikes.svg"
            alt="Concept de vélo électrique — illustration"
            width={900}
            height={600}
          />
          <span>THE ELECTRIC WAY</span>
        </div>
        <div>
          <p className="eyebrow">{c.perspective}</p>
          <h2>
            {c.further}
            <br />
            <em>{c.pace}</em>
          </h2>
          <p>{c.bikeCopy}</p>
          <Link href="/ebikes" className="under-link">
            {t.ebikes}
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      {banners?.map((b) => (
        <section className="shell campaign" key={b.id}>
          <div>
            <p className="eyebrow">{c.news}</p>
            <h2>{b.title}</h2>
            <p>{b.copy}</p>
          </div>
          <Link href={b.href} className="button dark">
            {t.discover}
            <ArrowUpRight />
          </Link>
        </section>
      ))}
      <section className="guide-section section-space">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / {c.guide}</p>
              <h2>{t.guide}</h2>
            </div>
            <Link className="under-link" href="/faq">
              {t.discover}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="guide-grid">
            {[
              [Route, "01", ...c.guides[0]],
              [BatteryCharging, "02", ...c.guides[1]],
              [ShieldCheck, "03", ...c.guides[2]],
            ].map(([Icon, n, title, copy]) => {
              const I = Icon as typeof Route;
              return (
                <article key={String(n)}>
                  <div>
                    <I size={28} />
                    <span>{String(n)}</span>
                  </div>
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="shell policy-strip">
        {[
          ["delivery", s.shipping_text],
          ["warranty", s.warranty_text],
          ["returns", s.returns_text],
        ].map(([key, value]) => (
          <Link key={key} href={`/${key}`}>
            <ArrowUpRight />
            <div>
              <strong>{t[key as keyof typeof t]}</strong>
              <p>{value}</p>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
