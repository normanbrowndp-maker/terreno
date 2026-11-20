"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { filterCities, filterPlaces } from "@/modules/catalog";
import { useCatalog } from "./catalog-provider";

export function GlobalSearch() {
  const { catalog } = useCatalog();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const id = useId();
  const matches = query.trim()
    ? [
        ...filterCities(catalog.cities, query)
          .slice(0, 4)
          .map((city) => ({
            label: city.name,
            country: city.countryCode,
            context: city.region,
            href: `/cities/${city.slug}`,
          })),
        ...filterPlaces(catalog.places, { query })
          .slice(0, 4)
          .map((place) => ({
            label: place.name,
            country: place.countryCode,
            context:
              catalog.cities.find((city) => city.slug === place.citySlug)
                ?.name ?? "",
            href: `/places/${place.slug}`,
          })),
      ]
    : [];
  const clearSearch = () => {
    setOpen(false);
    setQuery("");
    setActive(-1);
  };
  return (
    <form
      className="global-search"
      role="search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const countryCodes=new Set(matches.map(match=>match.country));
        const country=countryCodes.size===1 ? matches[0]?.country : undefined;
        const destination = (open && matches[active]?.href) ||
          (query.trim() ? `/cities?q=${encodeURIComponent(query.trim())}${country ? `&country=${country}` : ""}` : "/cities");
        clearSearch();
        router.push(destination);
      }}
    >
      <svg
        className="search-icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="6" />
        <path d="m14.5 14.5 5 5" />
      </svg>
      <input
        type="search"
        role="combobox"
        aria-label="Search cities and places"
        aria-expanded={open && Boolean(query.trim())}
        aria-controls={open && query.trim() ? `${id}-results` : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 && matches[active] ? `${id}-${active}` : undefined
        }
        maxLength={80}
        name="q"
        autoComplete="off"
        placeholder={`Search ${catalog.cities.length} cities and their places…`}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            if (open) event.preventDefault();
            setOpen(false);
            setActive(-1);
          }
          if (matches.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setOpen(true);
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActive(value =>
              value < 0
                ? direction === 1 ? 0 : matches.length - 1
                : (value + direction + matches.length) % matches.length,
            );
          }
        }}
      />
      {open && query.trim() ? (
        <div
          className="search-results"
          id={`${id}-results`}
          role="listbox"
          aria-label="Search results"
        >
          {matches.length ? (
            matches.map((match, index) => (
              <Link
                key={match.href}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === active}
                className={index === active ? "is-active" : ""}
                href={match.href}
                onNavigate={clearSearch}
              >
                <span>{match.label}</span>
                <small>{match.context}</small>
                <span aria-hidden="true">↗</span>
              </Link>
            ))
          ) : (
            <p role="status">No verified cities or places found.</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
