"use client";
import Link from "next/link";
import {
  categories,
  filterPlaces,
  type PlaceCategory,
} from "@/modules/catalog";
import { useCatalog } from "../catalog-provider";
import { EditorialPhoto } from "../photo";
import { GeographicMap } from "../geographic-map";
import { CollectionNotice } from "../site-shell";
import { FilterTabs, EmptyPlaces, PlaceCard, formatDate } from "../catalog-ui";
import { useQueryValue } from "../query-state";

export function CityScreen({ slug }: { slug: string }) {
  const { catalog } = useCatalog();
  const city = catalog.cities.find((item) => item.slug === slug)!;
  const [categoryValue, setCategory] = useQueryValue(
    "category",
    "",
    categories,
  );
  const category = categoryValue as PlaceCategory | "";
  const allPlaces = catalog.places.filter((place) => place.citySlug === slug);
  const places = filterPlaces(allPlaces, category ? { category } : {});
  return (
    <main id="main-content" className="split-layout city-layout">
      <section className="editorial-panel city-panel">
        <EditorialPhoto
          photo={city.photo}
          name={city.name}
          priority
          className={`city-hero city-hero-${city.slug}`}
        />
        <p className="micro accent">
          {String(catalog.cities.indexOf(city) + 1).padStart(2, "0")} /{" "}
          {city.region}
        </p>
        <h1>{city.name}</h1>
        <p className="intro">
          {city.subtitle}
          <br />
          {city.description}
        </p>
        <FilterTabs value={category} onChange={setCategory} />
        <p className="micro places-counter" aria-live="polite">
          Places to pause / {String(places.length).padStart(2, "0")}
        </p>
        {places.length ? (
          <div className="places-grid">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        ) : allPlaces.length ? (
          <EmptyPlaces category={category} reset={() => setCategory("")} />
        ) : (
          <div className="empty-state">
            <h2>A city worth getting to know.</h2>
            <p>
              This city is confirmed in the index. Its places are being checked
              before we publish them.
            </p>
            <Link href="/cities">Explore the city index ↗</Link>
          </div>
        )}
        <p className="verified-line">
          City coordinates checked {formatDate(city.verifiedAt)}.{" "}
          <Link href="/sources">Sources ↗</Link>
        </p>
        <CollectionNotice />
      </section>
      <div className="map-column">
        <div className="mobile-map-heading">
          <h2>Get your bearings.</h2>
          <p className="micro">{city.name} / At your own pace</p>
        </div>
        <GeographicMap
          key={city.slug}
          cities={catalog.cities}
          city={city}
          places={places}
        />
        <p className="mobile-map-footnote">
          A few good places, not a checklist.
        </p>
      </div>
    </main>
  );
}
