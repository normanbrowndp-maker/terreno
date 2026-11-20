import type { CatalogDatabase } from "@/shared/db/catalog-database";
import { italyDemo } from "./demo";
import { collectionSchema, type EditorialCatalog } from "./model";

export class IncompleteItalySeedError extends Error {
  constructor() {
    super("Incomplete Italy demo seed");
  }
}

/** Only this explicitly named demo collection is visible through the preview API. */
export async function readItalyCatalog(
  db: CatalogDatabase,
): Promise<EditorialCatalog | null> {
  const [cities, places] = await Promise.all([
    db.query(
      `SELECT c.id,c.slug,c.name,c.aliases,c.country_code AS "countryCode",rt.name AS region,r.code AS "regionSlug",
      ST_X(c.location) AS longitude,ST_Y(c.location) AS latitude,c.wikidata_id AS "wikidataId",c.verified_at::text AS "verifiedAt",
      c.featured,c.subtitle,c.description,c.photo,
      jsonb_build_array(jsonb_build_object('name','Wikidata','url',c.source_url,'license','CC0-1.0','licenseUrl','https://creativecommons.org/publicdomain/zero/1.0/')) AS sources
      FROM cities c JOIN regions r ON r.id=c.region_id
      JOIN region_translations rt ON rt.region_id=r.id AND rt.locale='en'
      WHERE c.dataset=$1 ORDER BY c.ordinal`,
      [italyDemo.dataset],
    ),
    db.query(
      `SELECT p.id,p.slug,t.name,c.slug AS "citySlug",p.country_code AS "countryCode",
      ARRAY(SELECT k.code FROM place_categories pc JOIN categories k ON k.id=pc.category_id WHERE pc.place_id=p.id ORDER BY k.code) AS categories,
      p.editorial_subtitle AS subtitle,t.description,p.address_text AS address,ST_X(p.location) AS longitude,ST_Y(p.location) AS latitude,
      (SELECT ps.external_id FROM place_sources ps WHERE ps.place_id=p.id ORDER BY ps.external_id LIMIT 1) AS "wikidataId",
      p.verified_at::date::text AS "verifiedAt",p.official_url AS "officialUrl",NULL AS hours,NULL AS admission,
      (SELECT m.metadata || jsonb_build_object('src',m.storage_key,'author',m.author,'sourceUrl',m.source_url,'license',m.license_code)
       FROM place_media m WHERE m.place_id=p.id ORDER BY m.position LIMIT 1) AS photo,p.sources_metadata AS sources
      FROM places p JOIN cities c ON c.id=p.city_id JOIN place_translations t ON t.place_id=p.id AND t.locale='en'
      WHERE p.dataset=$1 AND c.dataset=$1 AND p.status='published' ORDER BY p.id`,
      [italyDemo.dataset],
    ),
  ]);
  if (!cities.rowCount && !places.rowCount) return null;
  const parsed = collectionSchema.safeParse({
    ...italyDemo,
    cities: cities.rows,
    places: places.rows,
  });
  if (!parsed.success) throw new IncompleteItalySeedError();
  const catalog = parsed.data;
  const completeCities =
    catalog.cities.length === italyDemo.cities.length &&
    italyDemo.cities.every((expected) =>
      catalog.cities.some(
        (city) => city.id === expected.id && city.slug === expected.slug,
      ),
    );
  const completePlaces =
    catalog.places.length === italyDemo.places.length &&
    italyDemo.places.every((expected) =>
      catalog.places.some(
        (place) =>
          place.id === expected.id &&
          place.slug === expected.slug &&
          place.citySlug === expected.citySlug,
      ),
    );
  if (!completeCities || !completePlaces) throw new IncompleteItalySeedError();
  return catalog;
}
