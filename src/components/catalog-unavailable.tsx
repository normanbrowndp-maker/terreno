import Link from "next/link";

export function CatalogUnavailable() {
  return (
    <main id="main-content" className="route-state" data-catalog-backend="unavailable">
      <h1>Catalog temporarily unavailable.</h1>
      <p role="status">The catalog database is not ready. Places and search results cannot be shown right now.</p>
      <Link className="button primary" href="/">Try again</Link>
    </main>
  );
}
