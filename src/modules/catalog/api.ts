import { filterCities, filterPlaces, parseCatalogQuery } from "./queries";
import type { CatalogSnapshot } from "./model";

export function catalogListResponse(
  snapshot: CatalogSnapshot,
  kind: "cities" | "places",
  params: URLSearchParams,
): Response {
  try {
    const query = parseCatalogQuery(params);
    const places = filterPlaces(snapshot.places, query);
    const cities = filterCities(snapshot.cities, query.query).filter(
      (city) =>
        (!query.country || city.countryCode === query.country) &&
        (!query.city || city.slug === query.city) &&
        ((!query.category && !query.openNow) ||
          places.some((place) => place.citySlug === city.slug)),
    );
    const data = kind === "cities" ? cities : places;
    return Response.json(
      {
        data: data.slice(0, query.limit),
        meta: catalogMeta(snapshot, data.length, query.limit),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: { code: "INVALID_QUERY", message: "Invalid catalog query" } },
      { status: 400 },
    );
  }
}
export function catalogMeta(
  snapshot: CatalogSnapshot,
  total?: number,
  limit?: number,
) {
  return {
    dataset: snapshot.dataset,
    backend: snapshot.backend,
    availability: snapshot.availability,
    verifiedAt: snapshot.verifiedAt,
    contentLocale: "en",
    openingStatus: "not-verified",
    ...(total === undefined ? {} : { total }),
    ...(limit === undefined ? {} : { limit }),
  };
}
