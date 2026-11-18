"use client";
import Link from "next/link";
import type { EditorialPlace } from "@/modules/catalog";
import { useCatalog } from "../catalog-provider";
import { EditorialPhoto } from "../photo";
import { GeographicMap } from "../geographic-map";
import { CollectionNotice, SaveButton, SavingNotice } from "../site-shell";
import { categoryLabel, formatDate } from "../catalog-ui";
function distance(a: EditorialPlace, b: EditorialPlace) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * r) / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(((b.longitude - a.longitude) * r) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(h));
}
export function PlaceScreen({ slug }: { slug: string }) {
  const { catalog } = useCatalog();
  const place = catalog.places.find((item) => item.slug === slug)!;
  const city = catalog.cities.find((item) => item.slug === place.citySlug)!;
  const cityPlaces = catalog.places.filter(
    (item) => item.citySlug === city.slug,
  );
  const nearby = cityPlaces
    .filter((item) => item.id !== place.id)
    .map((item) => ({ place: item, metres: distance(place, item) }))
    .sort((a, b) => a.metres - b.metres)
    .slice(0, 2);
  return (
    <main id="main-content" className="split-layout place-layout">
      <section className="editorial-panel place-panel">
        <EditorialPhoto
          photo={place.photo}
          name={place.name}
          priority
          className="place-hero"
        />
        <p className="micro accent">
          {categoryLabel[place.categories[0]!]} / {city.name}
        </p>
        <h1 className={place.name.length > 28 ? "long-place-title" : ""}>
          {place.name}
        </h1>
        <p className="intro">{place.subtitle}</p>
        <dl className="place-facts">
          <div>
            <dt className="micro">Address</dt>
            <dd>{place.address ?? `${city.name}, ${city.region}, Italy`}</dd>
          </div>
          <div>
            <dt className="micro">Hours / admission</dt>
            <dd>
              <a href={place.officialUrl} target="_blank" rel="noreferrer">
                Check the official website <span aria-hidden="true">↗</span>
              </a>
              <small>
                Times and prices have not been independently verified.
              </small>
            </dd>
          </div>
        </dl>
        <section className="place-story">
          <h2>Rhythm of the place</h2>
          <p>{place.description}</p>
        </section>
        {nearby.length ? (
          <section className="nearby-places">
            <h2>Nearby, another perspective</h2>
            <p className="micro">Approximate straight-line distance</p>
            {nearby.map((item) => (
              <Link key={item.place.id} href={`/places/${item.place.slug}`}>
                <span>
                  {item.place.name}
                  <small className="micro">
                    {categoryLabel[item.place.categories[0]!]} / ~
                    {Math.round(item.metres / 10) * 10} m
                  </small>
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </section>
        ) : null}
        <details className="source-details">
          <summary>Sources & photograph credits</summary>
          <p>Information checked {formatDate(place.verifiedAt)}.</p>
          <ul>
            {place.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.name} ↗
                </a>
              </li>
            ))}
          </ul>
          {place.photo ? (
            <p>
              {place.photo.attribution}{" "}
              <a href={place.photo.licenseUrl} target="_blank" rel="noreferrer">
                License ↗
              </a>
            </p>
          ) : null}
          <p className="micro">
            {place.latitude.toFixed(5)}° N / {place.longitude.toFixed(5)}° E
          </p>
        </details>
        <SavingNotice />
        <div className="place-actions">
          <SaveButton id={place.id} />
          <a
            className="button primary"
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in navigation <span aria-hidden="true">↗</span>
          </a>
        </div>
        <CollectionNotice />
      </section>
      <div className="map-column">
        <GeographicMap
          key={place.slug}
          cities={catalog.cities}
          city={city}
          places={cityPlaces}
          selectedPlace={place}
        />
      </div>
    </main>
  );
}
