import Link from "next/link";
export default function NotFound() {
  return (
    <section className="shell section-space">
      <p className="eyebrow">404</p>
      <h1>Cette route n’existe pas.</h1>
      <Link className="button" href="/">
        Retour à l’accueil
      </Link>
    </section>
  );
}
