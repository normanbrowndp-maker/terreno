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
import { EmptyPlaces } from "../catalog-ui";
import { useQueryValue } from "../query-state";

export function HomeScreen() {
  const { catalog } = useCatalog();
  const [categoryValue, setCategory] = useQueryValue(
    "category",
    "",
    categories,
  );
  const category = categoryValue as PlaceCategory | "";
  const [openValue, setOpenValue] = useQueryValue("openNow", "", ["true"]);
  const openNow = openValue === "true";
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
        <div className="home-view-controls">
          <label className="opening-switch">
            <span>Open now</span>
            <input
              type="checkbox"
              checked={openNow}
              onChange={(event) =>
                setOpenValue(event.target.checked ? "true" : "")
              }
            />
            <span className="switch-track" aria-hidden="true" />
          </label>
          <nav className="mobile-home-mode mobile-copy" aria-label="Home view">
            <Link href="/" aria-current="page">
              Map
            </Link>
            <Link href="/cities">Index 48</Link>
          </nav>
        </div>
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
              setOpenValue("");
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
