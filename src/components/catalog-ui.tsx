"use client";
import Link, { useLinkStatus } from "next/link";
import type { EditorialPlace, PlaceCategory } from "@/modules/catalog";
import { useCatalog } from "./catalog-provider";
import { EditorialPhoto } from "./photo";
const referenceFilters: { code: PlaceCategory | ""; label: string }[] = [
  { code: "", label: "All" },
  { code: "cafe", label: "Cafés" },
  { code: "food", label: "Food" },
  { code: "viewpoint", label: "Views" },
  { code: "event", label: "Events" },
];
const additionalFilters = [
  { code: "garden", label: "Gardens" },
  { code: "museum", label: "Museums" },
  { code: "landmark", label: "Landmarks" },
] as const;

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
  places,
}: {
  value: PlaceCategory | "";
  onChange(value: PlaceCategory | ""): void;
  places: readonly EditorialPlace[];
}) {
  const filters = [
    ...referenceFilters,
    ...additionalFilters.filter(({ code }) =>
      code === value || places.some(place => place.categories.includes(code)),
    ),
  ];
  return (
    <div
      className={filters.length > referenceFilters.length ? "filter-tabs has-more" : "filter-tabs"}
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

export function PhotoStory({
  place, caption, selected, onSelect,
}: {
  place: EditorialPlace;
  caption?: string | undefined;
  selected?: boolean | undefined;
  onSelect?: (() => void) | undefined;
}) {
  const { catalog } = useCatalog();
  const city = catalog.cities.find((item) => item.slug === place.citySlug)!;
  return (
    <article className="place-card photo-story" data-selected={selected || undefined}>
      <EditorialPhoto photo={place.photo} name={place.name} />
      <p className="micro accent">
        {categoryLabel[place.categories[0]!]} / {city.name}
      </p>
      <Link
        className="place-card-link"
        href={`/places/${place.slug}`}
        aria-label={`See ${place.name}`}
      >
        <h3>{place.name}</h3>
        <span className="quiet-link">{caption ?? "See place"} <span aria-hidden="true">↗</span></span>
        <LinkProgress />
      </Link>
      {onSelect && <ShowOnMap name={place.name} selected={Boolean(selected)} onSelect={onSelect} />}
    </article>
  );
}

export const PlaceCard = PhotoStory;

export function LinkProgress() {
  const { pending } = useLinkStatus();
  return <span className="link-progress" aria-live="polite">{pending ? "Opening…" : ""}</span>;
}

export function ShowOnMap({ name, selected, onSelect }: {
  name: string;
  selected: boolean;
  onSelect(): void;
}) {
  return (
    <button
      type="button"
      className="show-on-map"
      aria-label={`Show ${name} on map`}
      aria-pressed={selected}
      onClick={() => {
        onSelect();
        const map = document.getElementById("catalog-map");
        if (map && matchMedia("(max-width: 767px)").matches) {
          map.scrollIntoView({ block: "start" });
        }
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M19 9c0 5-7 11-7 11S5 14 5 9a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="9" r="2.4" />
      </svg>
    </button>
  );
}
