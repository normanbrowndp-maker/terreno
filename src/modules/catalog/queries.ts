import {
  categories,
  type City,
  type EditorialPlace,
  type PlaceCategory,
} from "./model";

export function normaliseSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function filterCities(cities: readonly City[], query = ""): City[] {
  const needle = normaliseSearch(query);
  return cities.filter((city) =>
    normaliseSearch(
      [city.name, city.region, ...city.aliases].join(" "),
    ).includes(needle),
  );
}
export interface CatalogQuery {
  query?: string;
  city?: string;
  category?: PlaceCategory;
  openNow?: boolean;
  limit?: number;
}
export function filterPlaces(
  places: readonly EditorialPlace[],
  query: CatalogQuery = {},
): EditorialPlace[] {
  if (query.openNow) return []; // The curated snapshot contains no independently verified live schedules.
  const needle = normaliseSearch(query.query ?? "");
  return places.filter(
    (place) =>
      (!query.city || place.citySlug === query.city) &&
      (!query.category || place.categories.includes(query.category)) &&
      normaliseSearch(
        [place.name, place.description, place.citySlug].join(" "),
      ).includes(needle),
  );
}
export function parseCatalogQuery(
  params: URLSearchParams,
): CatalogQuery & { limit: number } {
  const allowed = ["q", "city", "category", "openNow", "limit"];
  for (const key of params.keys())
    if (!allowed.includes(key) || params.getAll(key).length !== 1)
      throw new Error("Invalid catalog query");
  const query = params.get("q")?.trim();
  const city = params.get("city");
  const category = params.get("category");
  const openNow = params.get("openNow");
  const rawLimit = params.get("limit") ?? "50";
  if (
    (query && query.length > 80) ||
    (city !== null && !/^[a-z0-9-]{1,80}$/.test(city)) ||
    (category !== null && !categories.includes(category as PlaceCategory)) ||
    (openNow !== null && !["true", "false"].includes(openNow)) ||
    !/^\d+$/.test(rawLimit)
  )
    throw new Error("Invalid catalog query");
  const limit = Number(rawLimit);
  if (limit < 1 || limit > 50) throw new Error("Invalid catalog query");
  return {
    ...(query ? { query } : {}),
    ...(city ? { city } : {}),
    ...(category ? { category: category as PlaceCategory } : {}),
    ...(openNow !== null ? { openNow: openNow === "true" } : {}),
    limit,
  };
}
