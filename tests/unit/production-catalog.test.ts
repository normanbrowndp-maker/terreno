import { afterEach, expect, it, vi } from "vitest";
import { italyDemo } from "@/modules/catalog";
import { withCatalogDatabase } from "@/shared/db/pool";
import { getItalyCatalog } from "@/modules/catalog/server";
import { IncompleteItalySeedError } from "@/modules/catalog/postgres";
import { catalogListResponse } from "@/modules/catalog/api";
import { GET as city } from "@/app/api/v1/cities/[slug]/route";
import { GET as place } from "@/app/api/v1/places/[slug]/route";
import { GET as ready } from "@/app/health/ready/route";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/db/pool", () => ({ withCatalogDatabase: vi.fn(), checkDatabaseReadiness: vi.fn(async () => {}) }));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.mocked(withCatalogDatabase).mockReset(); });

it("does not publish bundled records in production without PostgreSQL", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DATABASE_URL", undefined);
  const snapshot = await getItalyCatalog();
  expect(snapshot).toMatchObject({ backend: "unavailable", availability: "database-not-configured", cities: [], places: [] });
  expect(withCatalogDatabase).not.toHaveBeenCalled();
  for (const kind of ["cities", "places"] as const) {
    const response = catalogListResponse(snapshot, kind, new URLSearchParams());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "CATALOG_UNAVAILABLE" }, meta: { backend: "unavailable" } });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  }
  for (const read of [city, place]) {
    const response = await read(new Request("http://localhost/api/v1/cities/firenze"), { params: Promise.resolve({ slug: "firenze" }) });
    expect(response.status).toBe(503); // An outage must not be misreported as an unknown slug.
  }
});

it.each(["empty", "incomplete", "connection"] as const)("refuses production %s state without leaking database details", async reason => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DATABASE_URL", "configured-test-fixture");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  if (reason === "empty") vi.mocked(withCatalogDatabase).mockResolvedValue(null);
  else vi.mocked(withCatalogDatabase).mockRejectedValue(reason === "incomplete" ? new IncompleteItalySeedError() : new Error("fixture-sensitive-value"));
  const snapshot = await getItalyCatalog();
  expect(snapshot.backend).toBe("unavailable"); expect(snapshot.places).toEqual([]);
  expect(JSON.stringify(snapshot)).not.toContain("fixture-sensitive-value");
  expect(JSON.stringify(warn.mock.calls)).not.toContain("fixture-sensitive-value");
});

it("continues serving verified database records in production", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DATABASE_URL", "configured-test-fixture");
  vi.mocked(withCatalogDatabase).mockResolvedValue(italyDemo);
  expect(await getItalyCatalog()).toMatchObject({ backend: "postgres", availability: "ready", places: italyDemo.places });
});

it("does not mark a production service ready with a schema but no usable catalog", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DATABASE_URL", "configured-test-fixture");
  vi.mocked(withCatalogDatabase).mockResolvedValue(null);
  expect((await ready()).status).toBe(503);
  vi.mocked(withCatalogDatabase).mockResolvedValue(italyDemo);
  expect((await ready()).status).toBe(200);
});

it("retains the explicitly labelled offline collection outside production", async () => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("DATABASE_URL", undefined);
  expect(await getItalyCatalog()).toMatchObject({ backend: "bundled", availability: "database-not-configured", places: italyDemo.places });
});
