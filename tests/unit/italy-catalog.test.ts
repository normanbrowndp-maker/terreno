import { describe, expect, it } from "vitest";
import {
  italyDemo,
  filterCities,
  filterPlaces,
  parseCatalogQuery,
  collectionSchema,
} from "@/modules/catalog";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("verified Italy editorial collection", () => {
  it("passes the full published schema and references actual local images without a public URL prefix", () => {
    expect(() => collectionSchema.parse(italyDemo)).not.toThrow();
    for (const record of [...italyDemo.cities, ...italyDemo.places]) {
      if (record.photo)
        expect(
          existsSync(join(process.cwd(), "public", record.photo.src)),
        ).toBe(true);
    }
  });
  it("contains the exact 48 unique cities from the PDF and five initial editorial cities", () => {
    expect(italyDemo.cities).toHaveLength(48);
    expect(new Set(italyDemo.cities.map((city) => city.slug)).size).toBe(48);
    expect(new Set(italyDemo.cities.map((city) => city.region)).size).toBe(19);
    expect(
      italyDemo.cities
        .filter((city) => city.featured)
        .map((city) => city.name)
        .sort(),
    ).toEqual(["Firenze", "Milano", "Napoli", "Roma", "Venezia"]);
    expect(italyDemo.cities.some((city) => city.name === "L’Aquila")).toBe(
      true,
    );
    expect(
      italyDemo.cities.every(
        (city) =>
          city.countryCode === "IT" &&
          city.longitude > 6 &&
          city.longitude < 19 &&
          city.latitude > 35 &&
          city.latitude < 48,
      ),
    ).toBe(true);
  });
  it("requires independently sourced places, licensed matching media and no illustrative businesses", () => {
    expect(italyDemo.places.length).toBeGreaterThanOrEqual(12);
    for (const place of italyDemo.places) {
      expect(
        italyDemo.cities.some((city) => city.slug === place.citySlug),
      ).toBe(true);
      expect(place.sources.length).toBeGreaterThanOrEqual(2);
      expect(place.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(place.photo?.depicts).toBe(place.name);
      expect(place.photo?.author).toBeTruthy();
      expect(place.photo?.licenseUrl).toMatch(/^https:\/\//);
      expect(place.photo?.attribution).toBeTruthy();
      expect(place.hours).toBeNull();
      expect(place.admission).toBeNull();
    }
    expect(JSON.stringify(italyDemo.places)).not.toMatch(
      /Caffè Sosta|Sera in cortile|08:00–19:00/,
    );
  });
  it("finds cities by Italian/English name, apostrophe or region without losing diacritics in the result", () => {
    expect(
      filterCities(italyDemo.cities, "florence").map((city) => city.name),
    ).toEqual(["Firenze"]);
    expect(
      filterCities(italyDemo.cities, "laquila").map((city) => city.name),
    ).toEqual(["L’Aquila"]);
    expect(filterCities(italyDemo.cities, "TOSCANA")).toHaveLength(5);
    expect(filterCities(italyDemo.cities, "  ")).toHaveLength(48);
    expect(filterCities(italyDemo.cities, "does-not-exist")).toEqual([]);
  });
  it("combines city, category and text filters and never invents an open-now result", () => {
    expect(
      filterPlaces(italyDemo.places, {
        city: "firenze",
        category: "viewpoint",
      }).some((place) => place.slug === "giardino-bardini"),
    ).toBe(true);
    expect(filterPlaces(italyDemo.places, { category: "cafe" })).toEqual([]);
    expect(
      filterPlaces(italyDemo.places, { city: "roma", query: "pantheon" }).map(
        (place) => place.slug,
      ),
    ).toEqual(["pantheon"]);
    expect(filterPlaces(italyDemo.places, { openNow: true })).toEqual([]);
  });
  it("bounds API input and rejects unsupported filters and duplicated parameters", () => {
    expect(
      parseCatalogQuery(new URLSearchParams("q=%20Roma%20&limit=5")),
    ).toEqual({ query: "Roma", limit: 5 });
    for (const query of [
      "limit=-1",
      "limit=1000",
      "limit=2.5",
      "category=invalid",
      "q=a&q=b",
      "openNow=maybe",
      "q=" + "x".repeat(81),
    ]) {
      expect(() => parseCatalogQuery(new URLSearchParams(query))).toThrow(
        "Invalid catalog query",
      );
    }
  });
});
