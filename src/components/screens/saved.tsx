"use client";
import Link from "next/link";
import { useCatalog } from "../catalog-provider";
import { EditorialPhoto } from "../photo";
import { GeographicMap } from "../geographic-map";
import { CollectionNotice, SavingNotice } from "../site-shell";
import { categoryLabel, ShowOnMap } from "../catalog-ui";
import { useQueryValue } from "../query-state";

export function SavedScreen() {
  const { catalog, savedIds, toggleSaved } = useCatalog();
  const [cityFilter, setCityFilter] = useQueryValue("city");
  const [mapPlace, setMapPlace] = useQueryValue("place");
  const saved = catalog.places.filter((place) => savedIds.includes(place.id));
  const effectiveCityFilter = saved.some(
    (place) => place.citySlug === cityFilter,
  )
    ? cityFilter
    : "";
  const filtered = saved.filter(
    (place) => !effectiveCityFilter || place.citySlug === effectiveCityFilter,
  );
  const savedCities = catalog.cities.filter((city) =>
    saved.some((place) => place.citySlug === city.slug),
  );
  const selected = filtered.find(place => place.slug === mapPlace);
  const first = selected ?? filtered[0];
  return (
    <main id="main-content" className="split-layout saved-layout">
      <section className="editorial-panel saved-panel">
        <p className="micro accent">Your personal index</p>
        <h1>Worth keeping.</h1>
        <p className="intro">Good places, ready when you are.</p>
        <div className="index-controls">
          <span className="micro" aria-live="polite">
            Saved {String(filtered.length).padStart(2, "0")}
          </span>
          <select
            aria-label="Filter saved places by city"
            value={effectiveCityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
          >
            <option value="">All cities ↓</option>
            {savedCities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
        <SavingNotice />
        {filtered.length ? (
          <div className="saved-list">
            {filtered.map((place) => (
              <article
                className="saved-row"
                data-testid="saved-row"
                data-selected={first?.id === place.id || undefined}
                key={place.id}
              >
                <EditorialPhoto photo={place.photo} name={place.name} />
                <div className="saved-row-copy">
                  <p className="micro accent">
                    {categoryLabel[place.categories[0]!]}
                  </p>
                  <h2>
                    <Link href={`/places/${place.slug}`}>{place.name}</Link>
                  </h2>
                  <p>
                    {
                      catalog.cities.find(
                        (city) => city.slug === place.citySlug,
                      )?.name
                    }
                  </p>
                  <button
                    className="remove-save"
                    onClick={() => toggleSaved(place.id)}
                    aria-label={`Remove ${place.name}`}
                  >
                    Saved ✓
                  </button>
                </div>
                <ShowOnMap name={place.name} selected={first?.id === place.id}
                  onSelect={() => setMapPlace(place.slug)} />
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state saved-empty">
            <span className="empty-bookmark" aria-hidden="true">
              ⌑
            </span>
            <h2>Your own little index starts here.</h2>
            <p>
              Save a place that catches your eye. You’ll find it here, on this
              device.
            </p>
            <Link className="button primary" href="/cities/firenze">
              Find a place to keep →
            </Link>
            {cityFilter ? (
              <button className="text-button" onClick={() => setCityFilter("")}>
                Show all saved places
              </button>
            ) : null}
          </div>
        )}
        <section className="saved-note">
          <h2>No plans. Just possibilities.</h2>
          <p className="micro">Saved on this device only</p>
          <p className="saved-explanation">
            No account or cloud sync. Clearing browser data clears this list.
          </p>
        </section>
        <CollectionNotice />
      </section>
      <div className="map-column">
        <GeographicMap
          cities={catalog.cities}
          variant="saved"
          highlightCitySlug={first?.citySlug}
          places={filtered}
          selectedPlace={first}
          centerOn={selected}
          onSelectPlace={place => setMapPlace(place.slug)}
        />
        {first ? (
          <aside className="saved-map-preview">
            <EditorialPhoto key={first.id} photo={first.photo} name={first.name} />
            <Link href={`/places/${first.slug}`}>
              <span className="micro accent">
                Saved /{" "}
                {
                  catalog.cities.find((city) => city.slug === first.citySlug)
                    ?.name
                }
              </span>
              <h2>{first.name}</h2>
              <span>See place →</span>
            </Link>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
