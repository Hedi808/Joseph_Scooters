export default function Loading() {
  return (
    <div className="shell section-space" aria-busy="true">
      <div className="skeleton" />
      <div className="product-grid">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton tall" key={n} />
        ))}
      </div>
    </div>
  );
}
