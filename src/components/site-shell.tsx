"use client";

import Link from "next/link";
import {useCatalogCountry} from "./country-select";
import {countries} from "@/modules/catalog";
import { usePathname } from "next/navigation";
import { GlobalSearch } from "./global-search";
import { useCatalog } from "./catalog-provider";

export function SiteHeader() {
  const path = usePathname();
  const country=useCatalogCountry();
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
          <Link className="wordmark" href="/" aria-label="terreno home" translate="no">
            terreno
          </Link>
          <span className="micro brand-caption">
            {city ? `${city.region} / ${city.name}` : `A guide to ${countries[country].name}`}
          </span>
          {city ? (
            <Link
              className="mobile-back"
              href={place ? `/cities/${city.slug}` : "/"}
            >
              ← {place ? city.name : "Map"}
            </Link>
          ) : (
            <span className="micro mobile-country">{countries[country].name} / {catalog.cities.filter(c=>c.countryCode===country).length}</span>
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
  const country=useCatalogCountry();
  const { catalog, savedIds } = useCatalog();
  return (
    <nav
      className={mobile ? "mobile-nav" : "desktop-nav"}
      aria-label={mobile ? "Main mobile navigation" : "Main navigation"}
    >
      <Link
        href={`/cities?country=${country}`}
        aria-current={path === "/cities" ? "page" : undefined}
        aria-label={mobile ? undefined : `Index ${catalog.cities.filter(c=>c.countryCode===country).length}`}
      >
        {mobile ? "Index" : <NavIcon kind="index" />}
      </Link>
      <Link href={`/?country=${country}`} aria-label={mobile ? undefined : "Map"} aria-current={
        path === "/" ? "page" : path.startsWith("/cities/") || path.startsWith("/places/") ? "location" : undefined
      }>
        {mobile ? "Map" : <NavIcon kind="map" />}
      </Link>
      <Link
        href="/saved"
        aria-label={mobile ? undefined : `Saved${savedIds.length ? ` (${savedIds.length})` : ""}`}
        aria-current={path === "/saved" ? "page" : undefined}
      >
        {mobile ? "Saved" : <NavIcon kind="saved" />}
        {savedIds.length ? (
          <span className="saved-count">{savedIds.length}</span>
        ) : null}
      </Link>
    </nav>
  );
}
function NavIcon({ kind }: { kind: "index" | "map" | "saved" }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" fill="currentColor">
      {kind === "index" && <path d="M1 4h3v3H1zm5 0h18v3H6zM1 11h3v3H1zm5 0h20v3H6zM1 18h3v3H1zm5 0h12v3H6z" />}
      {kind === "map" && <path d="m0 3 7 2v19l-7-2zm9 2 8-3v19l-8 3zm10-3 7 2v19l-7-2z" />}
      {kind === "saved" && <path className="bookmark-icon" d="M5 3h16v20l-8-7-8 7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />}
    </svg>
  );
}

export function MapIndexSwitch({ active }: { active: "map" | "index" }) {
  const country=useCatalogCountry();
  const { catalog } = useCatalog();
  return (
    <nav className="map-index-switch" aria-label="Catalog view">
      <Link href={`/?country=${country}`} aria-current={active === "map" ? "page" : undefined}>Map</Link>
      <Link href={`/cities?country=${country}`} aria-current={active === "index" ? "page" : undefined}>Index {catalog.cities.filter(c=>c.countryCode===country).length}</Link>
    </nav>
  );
}
export function CollectionNotice() {
  const { catalog } = useCatalog();
  const source = {
    ready: "Served from the database",
    "database-not-configured": "Offline sample · Database not configured",
    "database-unavailable": "Offline sample · Database unavailable",
    "not-seeded": "Offline sample · Database catalog is empty",
    "incomplete-seed": "Offline sample · Database catalog is incomplete",
  }[catalog.availability];
  return (
    <p className="collection-note" data-catalog-backend={catalog.backend}>
      <Link href="/sources">Verified editorial sample</Link>
      <br />
      <span>{source}</span>
      <br />
      <span>{catalog.cities.length} cities · {catalog.places.length} places</span>
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
