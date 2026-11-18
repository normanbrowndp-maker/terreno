import type { CatalogDatabase } from "@/shared/db/catalog-database";
import { assertDatabaseIdentity } from "@/shared/db/identity";
import { italyDemo } from "./demo";
import { collectionSchema } from "./model";

/** Explicit local demo provisioning; never called by build, startup or a public endpoint. */
export async function seedItalyDemo(
  db: CatalogDatabase,
  purpose: "development" | "test",
): Promise<void> {
  await assertDatabaseIdentity(db, purpose);
  const data = collectionSchema.parse(italyDemo);
  const ids = [
    ...data.cities.map((city) => city.id),
    ...data.places.map((place) => place.id),
  ];
  const collision = await db.query(
    `SELECT id FROM cities WHERE id=ANY($1::uuid[]) AND dataset<>$2
    UNION ALL SELECT id FROM places WHERE id=ANY($1::uuid[]) AND dataset<>$2`,
    [ids, data.dataset],
  );
  if (collision.rowCount)
    throw new Error("Demo IDs conflict with unrelated records");
  await db.query("BEGIN");
  try {
    await db.query(
      "INSERT INTO countries(code,default_locale) VALUES('IT','en') ON CONFLICT DO NOTHING",
    );
    await db.query(
      "INSERT INTO country_translations(country_code,locale,name) VALUES('IT','en','Italy') ON CONFLICT DO NOTHING",
    );
    const regions = [
      ...new Map(
        data.cities.map((city) => [city.regionSlug, city.region]),
      ).entries(),
    ];
    const regionIds = new Map<string, string>();
    for (const [index, [code, name]] of regions.entries()) {
      const id = `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      await db.query(
        "INSERT INTO regions(id,country_code,code,timezone) VALUES($1,'IT',$2,'Europe/Rome') ON CONFLICT(country_code,code) DO NOTHING",
        [id, code],
      );
      const actual = (
        await db.query<{ id: string }>(
          "SELECT id FROM regions WHERE country_code='IT' AND code=$1",
          [code],
        )
      ).rows[0]!.id;
      regionIds.set(code, actual);
      await db.query(
        "INSERT INTO region_translations(region_id,locale,name) VALUES($1,'en',$2) ON CONFLICT DO NOTHING",
        [actual, name],
      );
    }
    for (const [index, city] of data.cities.entries()) {
      const inserted = await db.query<{ id: string }>(
        `INSERT INTO cities(id,country_code,region_id,slug,name,aliases,location,subtitle,description,photo,wikidata_id,source_url,verified_at,featured,ordinal,dataset)
        VALUES($1,'IT',$2,$3,$4,$5,ST_SetSRID(ST_MakePoint($6,$7),4326),$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16)
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,aliases=EXCLUDED.aliases,location=EXCLUDED.location,subtitle=EXCLUDED.subtitle,
        description=EXCLUDED.description,photo=EXCLUDED.photo,verified_at=EXCLUDED.verified_at
        WHERE cities.dataset=EXCLUDED.dataset RETURNING id`,
        [
          city.id,
          regionIds.get(city.regionSlug),
          city.slug,
          city.name,
          city.aliases,
          city.longitude,
          city.latitude,
          city.subtitle,
          city.description,
          JSON.stringify(city.photo),
          city.wikidataId,
          city.sources[0]!.url,
          city.verifiedAt,
          city.featured,
          index + 1,
          data.dataset,
        ],
      );
      if (inserted.rows[0]?.id !== city.id)
        throw new Error("Demo record ownership changed");
    }
    const sourceId = "e0000000-0000-4000-8000-000000000001";
    await db.query(
      `INSERT INTO data_sources(id,name,canonical_url,license_code,attribution_text)
      VALUES($1,'Wikidata','https://www.wikidata.org/','CC0-1.0','Wikidata contributors; independently checked editorial collection') ON CONFLICT(id) DO NOTHING`,
      [sourceId],
    );
    const categoryIds = new Map<string, string>();
    const codes = [
      ...new Set(data.places.flatMap((place) => place.categories)),
    ];
    for (const [index, code] of codes.entries()) {
      await db.query(
        "INSERT INTO categories(id,code) VALUES($1,$2) ON CONFLICT(code) DO NOTHING",
        [
          `f0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          code,
        ],
      );
      const id = (
        await db.query<{ id: string }>(
          "SELECT id FROM categories WHERE code=$1",
          [code],
        )
      ).rows[0]!.id;
      categoryIds.set(code, id);
      await db.query(
        "INSERT INTO category_translations(category_id,locale,name) VALUES($1,'en',$2) ON CONFLICT DO NOTHING",
        [id, code],
      );
    }
    for (const [index, place] of data.places.entries()) {
      const city = data.cities.find(
        (candidate) => candidate.slug === place.citySlug,
      )!;
      const inserted = await db.query<{ id: string }>(
        `INSERT INTO places(id,country_code,region_id,location,status,timezone,address_text,verified_at,city_id,slug,dataset,official_url,editorial_subtitle,sources_metadata)
        VALUES($1,'IT',$2,ST_SetSRID(ST_MakePoint($3,$4),4326),'published','Europe/Rome',$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
        ON CONFLICT(id) DO UPDATE SET location=EXCLUDED.location,address_text=EXCLUDED.address_text,verified_at=EXCLUDED.verified_at,
        official_url=EXCLUDED.official_url,editorial_subtitle=EXCLUDED.editorial_subtitle,sources_metadata=EXCLUDED.sources_metadata
        WHERE places.dataset=EXCLUDED.dataset RETURNING id`,
        [
          place.id,
          regionIds.get(city.regionSlug),
          place.longitude,
          place.latitude,
          place.address,
          place.verifiedAt,
          city.id,
          place.slug,
          data.dataset,
          place.officialUrl,
          place.subtitle,
          JSON.stringify(place.sources),
        ],
      );
      if (inserted.rows[0]?.id !== place.id)
        throw new Error("Demo record ownership changed");
      await db.query(
        `INSERT INTO place_translations(place_id,locale,name,description) VALUES($1,'en',$2,$3)
        ON CONFLICT(place_id,locale) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description`,
        [place.id, place.name, place.description],
      );
      for (const code of place.categories)
        await db.query(
          "INSERT INTO place_categories(place_id,category_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [place.id, categoryIds.get(code)],
        );
      await db.query(
        `INSERT INTO place_sources(place_id,source_id,external_id,source_url,retrieved_at,checked_at) VALUES($1,$2,$3,$4,$5,$5)
        ON CONFLICT(place_id,source_id) DO UPDATE SET checked_at=EXCLUDED.checked_at`,
        [
          place.id,
          sourceId,
          place.wikidataId,
          place.sources[0]!.url,
          place.verifiedAt,
        ],
      );
      if (place.photo)
        await db.query(
          `INSERT INTO place_media(id,place_id,storage_key,alt_text,author,license_code,source_url,position,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,0,$8::jsonb) ON CONFLICT(place_id,position) DO UPDATE SET storage_key=EXCLUDED.storage_key,
        alt_text=EXCLUDED.alt_text,author=EXCLUDED.author,license_code=EXCLUDED.license_code,source_url=EXCLUDED.source_url,metadata=EXCLUDED.metadata`,
          [
            `d0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            place.id,
            place.photo.src,
            place.photo.alt,
            place.photo.author,
            place.photo.license,
            place.photo.sourceUrl,
            JSON.stringify(place.photo),
          ],
        );
    }
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
