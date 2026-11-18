"use client";
import Link from "next/link";
import { useState } from "react";
import { filterPlaces, type PlaceCategory } from "@/modules/catalog";
import { useCatalog } from "../catalog-provider";
import { EditorialPhoto } from "../photo";
import { GeographicMap } from "../geographic-map";
import { CollectionNotice } from "../site-shell";
import { EmptyPlaces } from "../catalog-ui";

export function HomeScreen() {
  const { catalog } = useCatalog();
  const [category, setCategory] = useState<PlaceCategory | "">("");
  const [openNow, setOpenNow] = useState(false);
  const places = filterPlaces(catalog.places, {
    ...(category ? { category } : {}),
    openNow,
  });
  const cities =
    category || openNow
      ? catalog.cities.filter((city) =>
          places.some((place) => place.citySlug === city.slug),
        )
      : catalog.cities;
  const focus = cities.find((city) => city.slug === "firenze") ?? cities[0];
  return (
    <main id="main-content" className="split-layout home-layout">
      <section className="editorial-panel home-panel">
        <p className="micro accent desktop-copy">Italy, at your pace</p>
        <h1>
          <span className="desktop-copy">
            Find your
            <br />
            kind of Italy.
          </span>
          <span className="mobile-copy">A place to begin.</span>
        </h1>
        <p className="intro desktop-copy">
          48 cities, thoughtfully explored.
          <br />
          Good places. No prescribed route.
        </p>
        <p className="micro mobile-copy">48 cities / Endless ways to wander</p>
        <div
          className="quick-filters"
          role="group"
          aria-label="Explore by category"
        >
          {[
            { code: "cafe", label: "Cafés" },
            { code: "food", label: "Restaurants" },
            { code: "viewpoint", label: "Viewpoints" },
            { code: "event", label: "Events" },
          ].map((item) => (
            <button
              key={item.code}
              aria-pressed={category === item.code}
              className={category === item.code ? "is-active" : ""}
              onClick={() =>
                setCategory(
                  category === item.code ? "" : (item.code as PlaceCategory),
                )
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="opening-switch">
          <span>Open now</span>
          <input
            type="checkbox"
            checked={openNow}
            onChange={(event) => setOpenNow(event.target.checked)}
          />
          <span className="switch-track" aria-hidden="true" />
        </label>
        {openNow ? (
          <p className="filter-explanation" role="status">
            Opening times are not independently verified. Check the official
            websites.
          </p>
        ) : null}
        {focus ? (
          <section className="city-in-focus">
            <p className="micro">City in focus</p>
            <EditorialPhoto photo={focus.photo} name={focus.name} priority />
            <p className="micro accent">
              {String(catalog.cities.indexOf(focus) + 1).padStart(2, "0")} /{" "}
              {focus.region}
            </p>
            <h2>
              <Link href={`/cities/${focus.slug}`}>{focus.name}</Link>
            </h2>
            <p>{focus.subtitle}</p>
            <Link
              className="button primary"
              href={`/cities/${focus.slug}${category ? `?category=${category}` : ""}`}
            >
              Explore {focus.name} <span aria-hidden="true">→</span>
            </Link>
          </section>
        ) : (
          <EmptyPlaces
            category={category}
            reset={() => {
              setCategory("");
              setOpenNow(false);
            }}
          />
        )}
        <div className="editor-note mobile-copy">
          <p className="micro accent">Editor’s note</p>
          <h2>Take the side street.</h2>
        </div>
        <CollectionNotice />
      </section>
      <div className="map-column">
        <GeographicMap cities={cities} />
      </div>
    </main>
  );
}
