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
            context: city.region,
            href: `/cities/${city.slug}`,
          })),
        ...filterPlaces(catalog.places, { query })
          .slice(0, 4)
          .map((place) => ({
            label: place.name,
            context:
              catalog.cities.find((city) => city.slug === place.citySlug)
                ?.name ?? "",
            href: `/places/${place.slug}`,
          })),
      ]
    : [];
  const choose = (href: string) => {
    setOpen(false);
    setQuery("");
    setActive(-1);
    router.push(href);
  };
  return (
    <form
      className="global-search"
      role="search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        choose(
          matches[active]?.href ??
            `/cities?q=${encodeURIComponent(query.trim())}`,
        );
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
        aria-controls={`${id}-results`}
        aria-autocomplete="list"
        aria-activedescendant={
          active >= 0 && matches[active] ? `${id}-${active}` : undefined
        }
        maxLength={80}
        autoComplete="off"
        placeholder="Search 48 cities and their places"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setActive(-1);
          }
          if (event.key === "ArrowDown" && matches.length) {
            event.preventDefault();
            setOpen(true);
            setActive((value) => (value + 1) % matches.length);
          }
          if (event.key === "ArrowUp" && matches.length) {
            event.preventDefault();
            setActive((value) => (value - 1 + matches.length) % matches.length);
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
                onClick={(event) => {
                  event.preventDefault();
                  choose(match.href);
                }}
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
