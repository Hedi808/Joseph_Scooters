import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Zap } from "lucide-react";
import { settings, preview, categoryList } from "@/lib/data";
import { i18n } from "@/lib/locale";
import { StoreProvider } from "@/components/store-provider";
import { Header } from "@/components/header";
import { editorial } from "@/lib/editorial";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "Josheph Scooters — Mobilité électrique",
    template: "%s | Josheph Scooters",
  },
  description:
    "Trottinettes électriques, vélos électriques, accessoires et pièces détachées.",
  openGraph: { type: "website", locale: "fr_TN", siteName: "Josheph Scooters" },
  robots: { index: process.env.DEMO_MODE !== "true", follow: true },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ locale, t }, s] = await Promise.all([i18n(), settings()]);
  const c = editorial[locale];
  const categoryRows = await categoryList();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <StoreProvider locale={locale}>
          <a className="skip-link" href="#main">
            {t.discover}
          </a>
          {preview() && <div className="demo-bar">{t.demo}</div>}
          <Header
            name={s.name}
            announcement={s.announcement}
            categories={categoryRows}
          />
          <main id="main">{children}</main>
          <footer>
            <div className="shell footer-top">
              <div>
                <p className="eyebrow">LET’S RIDE.</p>
                <h2>{t.contact}</h2>
                <Link href="/contact" className="button">
                  {t.discover}
                  <ArrowUpRight size={18} />
                </Link>
              </div>
              <Zap className="footer-zap" />
            </div>
            <div className="shell footer-grid">
              <div>
                <strong className="footer-brand">{s.name.toUpperCase()}</strong>
                <p>{c.footer}</p>
                {s.address && <p>{s.address}</p>}
                {s.contact_email && (
                  <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>
                )}
              </div>
              <div>
                <h3>{c.explore}</h3>
                {(
                  ["scooters", "ebikes", "accessories", "spare-parts"] as const
                ).map((k) => (
                  <Link href={`/${k}`} key={k}>
                    {t[k]}
                  </Link>
                ))}
              </div>
              <div>
                <h3>{c.info}</h3>
                {(
                  ["about", "delivery", "warranty", "returns", "faq"] as const
                ).map((k) => (
                  <Link href={`/${k}`} key={k}>
                    {t[k]}
                  </Link>
                ))}
              </div>
              <div>
                <h3>{c.space}</h3>
                <Link href="/account">{t.account}</Link>
                <Link href="/contact">Contact</Link>
                <Link href="/compare">{t.compare}</Link>
                {s.whatsapp && (
                  <a href={`https://wa.me/${s.whatsapp}`}>WhatsApp ↗</a>
                )}
                {s.social_url && (
                  <a href={s.social_url} rel="noopener noreferrer">
                    Social ↗
                  </a>
                )}
              </div>
            </div>
            <div className="shell footer-bottom">
              <span>
                © {new Date().getFullYear()} {s.name} · TND
              </span>
              <div>
                <Link href="/privacy">{t.privacy}</Link>
                <Link href="/terms">{t.legal}</Link>
              </div>
            </div>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
