import {italyDemo} from "../../src/modules/catalog";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { Pool, escapeLiteral } from "pg";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { localCluster } from "./cluster";
import { migrateDatabase } from "../../src/shared/db/migrate";
import { seedItalyDemo } from "../../src/modules/catalog/seed";
import { readItalyCatalog } from "../../src/modules/catalog/postgres";
import { getItalyCatalog } from "../../src/modules/catalog/server";
import { withCatalogDatabase } from "../../src/shared/db/pool";
import { GET as cities } from "../../src/app/api/v1/cities/route";
import { GET as places } from "../../src/app/api/v1/places/route";
import { GET as city } from "../../src/app/api/v1/cities/[slug]/route";
import { GET as place } from "../../src/app/api/v1/places/[slug]/route";
import { GET as ready } from "../../src/app/health/ready/route";
import manifest from "../../db/bootstrap/neon-test/manifest.json";

// Only Next's import marker is stubbed. Driver, guards, loader and route handlers are real.
vi.mock("server-only", () => ({}));

let c: Awaited<ReturnType<typeof localCluster>>;
const pools = new Set<Pool>();
const localSecret = randomBytes(32).toString("hex");
const migratorUrl = `postgresql://travel_test_migrator:${localSecret}@127.0.0.1:55433/travel_test_foundation`;
const runtimeUrl = `postgresql://travel_test_runtime:${localSecret}@127.0.0.1:55433/travel_test_foundation`;
beforeAll(async () => {
  c = await localCluster({ port: 55433 });
  await c.db.query("RESET SESSION AUTHORIZATION");
  // Mirrors the existing LOCAL profile; this is not a Neon bootstrap or its ACL model.
  await c.db.query(`
    CREATE ROLE travel_test_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD ${escapeLiteral(localSecret)};
    CREATE ROLE travel_test_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD ${escapeLiteral(localSecret)};
    ALTER DATABASE travel_test_foundation OWNER TO travel_test_migrator;
    CREATE EXTENSION postgis WITH SCHEMA public;
    CREATE EXTENSION pg_trgm WITH SCHEMA public;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    REVOKE TEMPORARY ON DATABASE travel_test_foundation FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO travel_test_runtime;
    CREATE TABLE public.travel_database_identity(project_id text PRIMARY KEY,purpose text NOT NULL);
    REVOKE ALL ON public.travel_database_identity FROM PUBLIC;
    GRANT SELECT ON public.travel_database_identity TO travel_test_migrator,travel_test_runtime;
  `);
  await c.db.query("INSERT INTO public.travel_database_identity VALUES($1,'test')", [c.clusterName]);
  vi.stubEnv("TRAVEL_DATABASE_PROFILE", "local");
  vi.stubEnv("TRAVEL_DATABASE_ID", c.clusterName);
  vi.stubEnv("DATABASE_URL", runtimeUrl);
  // Track owned pools only for cleanup; all original driver operations still execute.
  const connect = Pool.prototype.connect;
  vi.spyOn(Pool.prototype, "connect").mockImplementation(function (this: Pool, ...args: unknown[]) {
    pools.add(this);
    return Reflect.apply(connect, this, args);
  } as Pool["connect"]);
});
afterAll(async () => {
  await Promise.all([...pools].map(pool => pool.end()));
  vi.unstubAllEnvs(); vi.restoreAllMocks();
  if (c) await c.close();
});

const request = (path: string) => new Request(`http://localhost${path}`);

it("uses a disposable physical cluster on a port accepted by unchanged local guards", async () => {
  expect((await c.db.query("SELECT current_setting('port')::int AS port")).rows[0].port).toBe(55433);
  await expect(localCluster({ port: 55433 })).rejects.toMatchObject({ code: "EADDRINUSE" });
});

it("runs all six immutable migrations with the real runner, checksums and safe repeat", async () => {
  expect(await migrateDatabase(migratorUrl, "test")).toBe(6);
  expect(await migrateDatabase(migratorUrl, "test")).toBe(0);
  const history = (await c.db.query("SELECT name,checksum FROM public.travel_migration_checksums ORDER BY name")).rows;
  expect(history).toEqual(manifest.migrations.map(m => ({
    name: m.name.replace(/\.sql$/, ""),
    checksum: createHash("sha256").update(readFileSync(`db/migrations/${m.name}`, "utf8").replace(/\r\n/g, "\n")).digest("hex"),
  })));
  expect((await ready()).status).toBe(200);
});

it("refuses concurrent migration sessions and checksum drift, then recovers without file changes", async () => {
  await c.db.query("SELECT pg_advisory_lock(23942026)");
  try {
    await expect(migrateDatabase(migratorUrl, "test")).rejects.toThrow("Migration already running");
  } finally { await c.db.query("SELECT pg_advisory_unlock(23942026)"); }
  const original = (await c.db.query<{ name: string; checksum: string }>("SELECT name,checksum FROM public.travel_migration_checksums ORDER BY name LIMIT 1")).rows[0];
  if (!original) throw new Error("Missing migration history");
  await c.db.query("UPDATE public.travel_migration_checksums SET checksum=repeat('0',64) WHERE name=$1", [original.name]);
  try {
    await expect(migrateDatabase(migratorUrl, "test")).rejects.toThrow("Migration checksum mismatch or applied file missing");
  } finally {
    await c.db.query("UPDATE public.travel_migration_checksums SET checksum=$2 WHERE name=$1", [original.name, original.checksum]);
  }
  expect(await migrateDatabase(migratorUrl, "test")).toBe(0);
});

it("reports bundled/not-seeded before loading any local demo fixture", async () => {
  const result = await cities(request("/api/v1/cities"));
  expect((await result.json()).meta).toMatchObject({ backend: "bundled", availability: "not-seeded" });
});

it("loads only the named disposable demo, repeatedly, and reads coordinates through the runtime pool", async () => {
  await seedItalyDemo(c.db, "test"); await seedItalyDemo(c.db, "test");
  const result = await withCatalogDatabase(readItalyCatalog);
  expect(result?.cities).toHaveLength(italyDemo.cities.length);
  expect(result?.places).toHaveLength(italyDemo.places.length);
  expect(result?.cities.find(item => item.slug === "firenze")?.longitude).toBeCloseTo(11.254166666667, 7);
  expect(result?.places.find(item => item.slug === "giardino-bardini")?.latitude).toBeCloseTo(43.76374722, 7);
  expect((await c.db.query("SELECT count(*)::int AS n FROM public.places WHERE dataset='production'")).rows[0].n).toBe(0);
});

it("serves real database-backed list/detail handlers with filters, missing data and bounded errors", async () => {
  const response = await cities(request("/api/v1/cities?q=Roma&city=roma&limit=1"));
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const result = await response.json();
  expect(result.meta).toMatchObject({ backend: "postgres", availability: "ready", limit: 1 });
  expect(result.data.map((item: { slug: string }) => item.slug)).toEqual(["roma"]);
  expect((await (await places(request("/api/v1/places?city=firenze"))).json()).data.length).toBeGreaterThan(0);
  expect((await (await places(request("/api/v1/places?openNow=true"))).json()).data).toEqual([]);
  expect((await cities(request("/api/v1/cities?limit=999"))).status).toBe(400);
  expect((await cities(request("/api/v1/cities?q=Roma&q=Milano"))).status).toBe(400);
  expect((await city(request("/api/v1/cities/roma"), { params: Promise.resolve({ slug: "roma" }) })).status).toBe(200);
  expect((await place(request("/api/v1/places/giardino-bardini"), { params: Promise.resolve({ slug: "giardino-bardini" }) })).status).toBe(200);
  expect((await place(request("/api/v1/places/missing"), { params: Promise.resolve({ slug: "missing" }) })).status).toBe(404);
});

it("keeps runtime reads while refusing writes, DDL, TEMP, identity mutation and role elevation", async () => {
  await withCatalogDatabase(async db => {
    expect((await db.query("SELECT current_user AS role")).rows[0].role).toBe("travel_test_runtime");
    for (const sql of [
      "UPDATE public.cities SET name='forbidden'",
      "CREATE TABLE public.forbidden(id int)",
      "CREATE TEMP TABLE forbidden(id int)",
      "UPDATE public.travel_database_identity SET purpose='wrong'",
      "SET ROLE travel_test_migrator",
      "SET ROLE terreno_bootstrap_owner",
    ]) await expect(db.query(sql)).rejects.toMatchObject({ code: "42501" });
  });
});

it("rejects an identity mismatch before migrations and returns truthful sanitized API/readiness failures", async () => {
  await c.db.query("UPDATE public.travel_database_identity SET project_id='travel_foreign'");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    await expect(migrateDatabase(migratorUrl, "test")).rejects.toThrow("Project database identity mismatch");
    expect((await ready()).status).toBe(503);
    const snapshot = await getItalyCatalog();
    expect(snapshot).toMatchObject({ backend: "bundled", availability: "database-unavailable" });
    const response = await cities(request("/api/v1/cities"));
    const body = await response.text();
    expect(body.includes(localSecret)).toBe(false);
    expect(body.includes("postgresql://")).toBe(false);
    expect(warn).toHaveBeenCalledWith("italy_editorial_database_unavailable");
    expect(warn.mock.calls.every(args => args.length === 1 && args[0] === "italy_editorial_database_unavailable")).toBe(true);
  } finally {
    await c.db.query("UPDATE public.travel_database_identity SET project_id=$1", [c.clusterName]);
    warn.mockRestore();
  }
});

it("labels a partial catalog honestly and recovers after the local fixture is restored", async () => {
  await c.db.query("UPDATE public.places SET status='draft' WHERE slug='giardino-bardini'");
  try {
    expect(await getItalyCatalog()).toMatchObject({ backend: "bundled", availability: "incomplete-seed" });
  } finally {
    await c.db.query("UPDATE public.places SET status='published' WHERE slug='giardino-bardini'");
  }
  expect(await getItalyCatalog()).toMatchObject({ backend: "postgres", availability: "ready" });
});

it("preserves the harness default random-port mode without running bootstrap SQL", async () => {
  const fresh = await localCluster();
  try {
    expect((await fresh.db.query("SELECT current_setting('port')::int AS port")).rows[0].port).toBeGreaterThan(0);
  } finally { await fresh.close(); }
});
