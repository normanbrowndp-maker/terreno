"use client";
import Link from "next/link";
import type { EditorialPlace, PlaceCategory } from "@/modules/catalog";
import { useCatalog } from "./catalog-provider";
import { EditorialPhoto } from "./photo";
const filters: { code: PlaceCategory | ""; label: string }[] = [
  { code: "", label: "All" },
  { code: "cafe", label: "Cafés" },
  { code: "food", label: "Food" },
  { code: "viewpoint", label: "Views" },
  { code: "event", label: "Events" },
];

export const categoryLabel: Record<PlaceCategory, string> = {
  cafe: "Café",
  food: "Food",
  viewpoint: "Viewpoint",
  event: "Event",
  garden: "Garden",
  museum: "Museum",
  landmark: "Landmark",
};

export const formatDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function FilterTabs({
  value,
  onChange,
}: {
  value: PlaceCategory | "";
  onChange(value: PlaceCategory | ""): void;
}) {
  return (
    <div
      className="filter-tabs"
      role="group"
      aria-label="Filter places by category"
    >
      {filters.map((filter) => (
        <button
          key={filter.code}
          className={value === filter.code ? "is-active" : ""}
          aria-pressed={value === filter.code}
          onClick={() => onChange(filter.code)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyPlaces({
  category,
  reset,
}: {
  category: PlaceCategory | "";
  reset(): void;
}) {
  return (
    <div className="empty-state" role="status">
      <h3>
        {category === "cafe"
          ? "No verified cafés in this collection yet."
          : category === "event"
            ? "No verified events in this collection yet."
            : "No verified places match these filters."}
      </h3>
      <p>We only add places after checking their sources.</p>
      <button className="text-button" onClick={reset}>
        Clear filters
      </button>
    </div>
  );
}

export function PlaceCard({ place }: { place: EditorialPlace }) {
  const { catalog } = useCatalog();
  const city = catalog.cities.find((item) => item.slug === place.citySlug)!;
  return (
    <article className="place-card">
      <EditorialPhoto photo={place.photo} name={place.name} />
      <p className="micro accent">
        {categoryLabel[place.categories[0]!]} / {city.name}
      </p>
      <h3>
        <Link href={`/places/${place.slug}`}>{place.name}</Link>
      </h3>
      <Link
        className="quiet-link"
        href={`/places/${place.slug}`}
        aria-label={`See ${place.name}`}
      >
        See place <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
