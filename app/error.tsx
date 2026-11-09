"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="shell section-space">
      <h1>Service temporairement indisponible</h1>
      <p>Vérifiez la configuration ou réessayez dans quelques instants.</p>
      <button className="button" onClick={reset}>
        Réessayer
      </button>
    </section>
  );
}
