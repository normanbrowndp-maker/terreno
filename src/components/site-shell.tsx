"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearch } from "./global-search";
import { useCatalog } from "./catalog-provider";

export function SiteHeader() {
  const path = usePathname();
  const { catalog } = useCatalog();
  const place = path.startsWith("/places/")
    ? catalog.places.find((item) => path === `/places/${item.slug}`)
    : undefined;
  const city = catalog.cities.find(
    (item) => path === `/cities/${item.slug}` || item.slug === place?.citySlug,
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className={`site-header ${city ? "has-city" : ""}`}>
        <div className="brand-block">
          <Link className="wordmark" href="/" aria-label="terreno home">
            terreno
          </Link>
          <span className="micro brand-caption">
            {city ? `${city.region} / ${city.name}` : "A guide to Italy"}
          </span>
          {city ? (
            <Link
              className="mobile-back"
              href={place ? `/cities/${city.slug}` : "/"}
            >
              ← {place ? city.name : "Map"}
            </Link>
          ) : (
            <span className="micro mobile-country">Italia / 48</span>
          )}
        </div>
        <GlobalSearch />
        <MainNavigation />
      </header>
    </>
  );
}
export function MainNavigation({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  const { savedIds } = useCatalog();
  const active = path.startsWith("/saved")
    ? "saved"
    : path === "/cities"
      ? "cities"
      : "map";
  return (
    <nav
      className={mobile ? "mobile-nav" : "desktop-nav"}
      aria-label={mobile ? "Main mobile navigation" : "Main navigation"}
    >
      <Link href="/" aria-current={active === "map" ? "page" : undefined}>
        Map
      </Link>
      <Link
        href="/cities"
        aria-current={active === "cities" ? "page" : undefined}
      >
        {mobile ? "Index" : "Index 48"}
      </Link>
      <Link
        href="/saved"
        aria-current={active === "saved" ? "page" : undefined}
      >
        Saved
        {savedIds.length ? (
          <span className="saved-count">{savedIds.length}</span>
        ) : null}
      </Link>
    </nav>
  );
}
export function CollectionNotice() {
  const { catalog } = useCatalog();
  return (
    <p className="collection-note">
      <Link href="/sources">Verified editorial sample</Link>
      {catalog.backend === "bundled" ? <span> · Available offline</span> : null}
      <br />
      <span>48 cities · 12 places · Your own pace</span>
    </p>
  );
}
export function SavingNotice() {
  const { savingNotice } = useCatalog();
  return savingNotice ? (
    <p className="storage-notice" role="status">
      {savingNotice}
    </p>
  ) : null;
}
export function SaveButton({ id }: { id: string }) {
  const { savedIds, toggleSaved } = useCatalog();
  const saved = savedIds.includes(id);
  return (
    <button
      className={`button save-button ${saved ? "is-saved" : ""}`}
      aria-label={saved ? "Remove saved place" : "Save place"}
      aria-pressed={saved}
      onClick={() => toggleSaved(id)}
    >
      {saved ? "Saved ✓" : "Save +"}
    </button>
  );
}
