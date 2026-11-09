import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, currentUser, configured } from "@/lib/supabase";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured())
    return (
      <section className="shell section-space">
        <h1>Administration non configurée</h1>
        <p className="notice">
          Connectez un nouveau projet Supabase et créez manuellement le premier
          administrateur. Consultez SETUP.md.
        </p>
      </section>
    );
  if (!(await currentUser())) redirect("/login");
  if (!(await isAdmin()))
    return (
      <section className="shell section-space">
        <h1>Accès refusé</h1>
        <p>Votre compte ne dispose pas des autorisations d’administration.</p>
      </section>
    );
  return (
    <div className="shell admin-layout" dir="ltr">
      <aside className="admin-nav">
        {[
          ["", "Vue d’ensemble"],
          ["products", "Produits"],
          ["categories", "Catégories"],
          ["orders", "Commandes"],
          ["customers", "Clients"],
          ["inventory", "Stock"],
          ["media", "Médias"],
          ["banners", "Bannières"],
          ["settings", "Configuration"],
        ].map(([href, label]) => (
          <Link key={href} href={`/admin${href ? "/" + href : ""}`}>
            {label}
          </Link>
        ))}
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
