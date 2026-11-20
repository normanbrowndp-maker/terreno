"use client";
import Link from "next/link";
import {CountrySelect,useCatalogCountry} from "../country-select";
import { filterCities, filterPlaces, type City } from "@/modules/catalog";
import { useCatalog } from "../catalog-provider";
import { EditorialPhoto } from "../photo";
import { GeographicMap } from "../geographic-map";
import { CollectionNotice, MapIndexSwitch } from "../site-shell";
import { LinkProgress, PlaceCard } from "../catalog-ui";
import { useQueryValue } from "../query-state";

export function CityIndexScreen() {
  const { catalog } = useCatalog();
  const country=useCatalogCountry();
  const countryCities=catalog.cities.filter(c=>c.countryCode===country);
  const [query, setQuery] = useQueryValue("q");
  const [mapCity, setMapCity] = useQueryValue("city");
  const [sort, setSort] = useQueryValue("sort", "reference", [
    "reference",
    "region",
    "city",
  ]);
  const cities = filterCities(countryCities, query);
  const matchedPlaces = query.trim()
    ? filterPlaces(catalog.places, { query, country })
    : [];
  const groups = [...new Set(cities.map((city) => city.region))];
  const selected = cities.find(city => city.slug === mapCity);
  if (sort === "region") groups.sort((a, b) => a.localeCompare(b, "it"));
  const cityRow = (city: City) => (
    <Link
      key={city.id}
      className="city-row"
      data-testid="city-row"
      data-city-row={city.slug}
      data-selected={selected?.id === city.id || undefined}
      href={`/cities/${city.slug}`}
    >
      <span className="city-row-thumb">
        <EditorialPhoto
          photo={city.photo}
          name={city.name}
          variant="thumbnail"
        />
      </span>
      <span>{city.name}</span>
      <span className="row-arrow" aria-hidden="true">
        ↗
      </span>
      <LinkProgress />
    </Link>
  );
  return (
    <main id="main-content" className="split-layout index-layout">
      <section className="editorial-panel index-panel">
        <CountrySelect />
        <p className="micro accent">The city index</p>
        <h1>{countryCities.length} ways in.</h1>
        <p className="intro">Find your place, region by region.</p>
        <div className="index-tools">
          <MapIndexSwitch active="index" />
          <div className="index-filter">
          <label htmlFor="city-index-search" className="sr-only">Filter cities</label>
          <input
            id="city-index-search"
            type="search"
            name="q"
            autoComplete="off"
            placeholder="Find a city or region…"
            maxLength={80}
            value={query}
            onChange={(event) => setQuery(event.target.value, true)}
          />
          {query ? (
            <button aria-label="Clear city search" onClick={() => setQuery("")}>
              ×
            </button>
          ) : null}
          </div>
        </div>
        <div className="index-controls">
          <span className="micro" aria-live="polite">
            {cities.length} cities
          </span>
          <select
            aria-label="Group cities"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="reference">Region ↑</option>
            <option value="region">Region A–Z</option>
            <option value="city">City A–Z</option>
          </select>
        </div>
        {sort === "city"
          ? [...cities]
              .sort((a, b) => a.name.localeCompare(b.name, "it"))
              .map(cityRow)
          : groups.map((region) => (
              <section key={region} className="region-group">
                <h2 className="micro accent">
                  {region}
                  <span>
                    {String(
                      cities.filter((city) => city.region === region).length,
                    ).padStart(2, "0")}
                  </span>
                </h2>
                {cities.filter((city) => city.region === region).map(cityRow)}
              </section>
            ))}
        {matchedPlaces.length ? (
          <section className="matched-places">
            <h2 className="micro accent">Places matching your search</h2>
            {matchedPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </section>
        ) : null}
        {!cities.length && !matchedPlaces.length ? (
          <div className="empty-state">
            <h2>No places found.</h2>
            <p>Try another city, region, or spelling.</p>
            <button className="text-button" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        ) : null}
        <CollectionNotice />
      </section>
      <div className="map-column">
        <GeographicMap
          countryCode={country}
          cities={countryCities}
          variant="index"
          highlightCitySlug={(selected ?? cities.find(city => city.featured))?.slug}
          centerOn={selected}
          onSelectCity={city => {
            setMapCity(city.slug);
            document.querySelector(`[data-city-row="${city.slug}"]`)?.scrollIntoView({ block: "nearest" });
          }}
        />
      </div>
    </main>
  );
}
