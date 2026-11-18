import { afterAll, beforeAll, expect, it } from "vitest";
import { Client } from "pg";
import { migrateDatabase } from "../../src/shared/db/migrate";
import { seedItalyDemo } from "../../src/modules/catalog/seed";
import { readItalyCatalog } from "../../src/modules/catalog/postgres";
import { italyDemo, collectionSchema } from "../../src/modules/catalog";
import { readFile } from "node:fs/promises";

const client = new Client({ connectionString: process.env.TEST_DATABASE_URL! });
beforeAll(async () => {
  await client.connect();
  await migrateDatabase(process.env.TEST_DATABASE_URL!, "test");
  await seedItalyDemo(client, "test");
});
afterAll(async () => {
  await client.end();
});

it("seeds only the named Italy demo collection, repeatedly, and reads real PostGIS coordinates", async () => {
  const before = await client.query(
    "SELECT count(*)::int AS count FROM places WHERE dataset='production'",
  );
  await seedItalyDemo(client, "test");
  await seedItalyDemo(client, "test");
  const catalog = collectionSchema.parse(await readItalyCatalog(client));
  expect(catalog.cities).toHaveLength(48);
  expect(catalog.places).toHaveLength(12);
  expect(
    catalog.cities.find((city) => city.slug === "firenze")?.longitude,
  ).toBeCloseTo(11.254166666667, 7);
  expect(
    catalog.places.find((place) => place.slug === "giardino-bardini")?.latitude,
  ).toBeCloseTo(43.76374722, 7);
  expect(catalog.places.map((place) => place.id).sort()).toEqual(
    italyDemo.places.map((place) => place.id).sort(),
  );
  expect(
    (
      await client.query(
        "SELECT count(*)::int AS count FROM places WHERE dataset='production'",
      )
    ).rows,
  ).toEqual(before.rows);
  expect(
    (
      await client.query(
        "SELECT ST_Distance(a.location::geography,b.location::geography) AS metres FROM places a,places b WHERE a.slug='giardino-bardini' AND b.slug='santa-croce'",
      )
    ).rows[0].metres,
  ).toBeGreaterThan(100);
});

it("runtime can read the demo but cannot alter its records", async () => {
  const runtime = new Client({
    connectionString: process.env.TEST_RUNTIME_DATABASE_URL!,
  });
  await runtime.connect();
  try {
    const catalog = await readItalyCatalog(runtime);
    expect(catalog?.cities).toHaveLength(48);
    await runtime.query("BEGIN");
    await expect(
      runtime.query("UPDATE cities SET name='wrong' WHERE slug='firenze'"),
    ).rejects.toMatchObject({ code: "42501" });
  } finally {
    await runtime.query("ROLLBACK");
    await runtime.end();
  }
});

it("rejects associating a place with a city in a different country", async () => {
  await client.query("BEGIN");
  try {
    await client.query(await readFile("db/fixtures/publication.sql", "utf8"));
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    await expect(
      client.query(
        "UPDATE places SET city_id=$1 WHERE id='11111111-1111-4111-8111-111111111111'",
        [italyDemo.cities[0]!.id],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  } finally {
    await client.query("ROLLBACK");
  }
});
