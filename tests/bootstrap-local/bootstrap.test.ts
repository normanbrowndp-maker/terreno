import { afterAll, beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { localCluster } from "./cluster";
import manifest from "../../db/bootstrap/neon-test/manifest.json";
import { assertProfileIdentity } from "../../src/shared/db/profile-identity";
import { assertNeonTestUrl } from "../../src/shared/db/neon-test";
import registry from "../../src/shared/db/neon-test-targets.json";

let c: Awaited<ReturnType<typeof localCluster>>;
beforeAll(async () => { c = await localCluster(); });
afterAll(async () => { if (c) await c.close(); });
const roleCount = async () => (await c.db.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ('travel_test_runtime','travel_test_migrator')")).rows[0].n;
const marker = async () => (await c.db.query("SELECT project_id,branch_id,endpoint_id,database_name,purpose FROM public.travel_neon_test_identity")).rows;
async function verify() { await c.prepare("BEGIN READ ONLY;" + c.sql("20_verify.sql")); }
async function negative(sql: string, code = "42501") {
  await expect(c.db.query(sql)).rejects.toMatchObject({ code });
}

it("refuses missing or foreign metadata receipt before creating roles", async () => {
  await c.db.query("SELECT set_config('travel.bootstrap.project_id','foreign',false)");
  await expect(c.prepare()).rejects.toMatchObject({ code: "P0001" });
  expect(await roleCount()).toBe(0);
  await c.bootstrapSession();
});
it("refuses a dirty partial role without modifying it", async () => {
  await c.db.query("CREATE ROLE travel_test_runtime NOLOGIN CREATEROLE");
  await expect(c.prepare()).rejects.toMatchObject({ code: "P0001" });
  expect((await c.db.query("SELECT rolcreaterole FROM pg_roles WHERE rolname='travel_test_runtime'")).rows[0].rolcreaterole).toBe(true);
  await c.db.query("DROP ROLE travel_test_runtime"); // This disposable local fixture only.
});
it("rolls back roles/extensions/marker/ownership on a late failure", async () => {
  await expect(c.prepare(c.sql("10_prepare.sql") + "SELECT 1/0;" + c.sql("20_verify.sql"))).rejects.toMatchObject({ code: "22012" });
  expect(await roleCount()).toBe(0);
  expect((await c.db.query("SELECT to_regclass('public.travel_neon_test_identity') AS t")).rows[0].t).toBeNull();
  expect((await c.db.query("SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database()")).rows[0].owner).toBe("terreno_bootstrap_owner");
});
it("refuses adopting a nullable or unconstrained pre-existing marker", async () => {
  await c.db.query("CREATE TABLE public.travel_neon_test_identity(singleton boolean PRIMARY KEY,project_id text,branch_id text,endpoint_id text,database_name text,purpose text)");
  await c.db.query("INSERT INTO public.travel_neon_test_identity VALUES(true,NULL,$1,$2,$3,'test')", [manifest.branchId, manifest.endpointId, manifest.database]);
  try { await expect(c.prepare()).rejects.toMatchObject({ code: "P0001" }); }
  finally {
    await c.db.query("RESET SESSION AUTHORIZATION; DROP TABLE public.travel_neon_test_identity");
    await c.bootstrapSession();
  }
});
it("finishes a compatible partial NOLOGIN role, installs extensions and commits a single marker", async () => {
  await c.db.query("CREATE ROLE travel_test_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT");
  await c.prepare();
  expect(await marker()).toEqual([{ project_id: manifest.projectId, branch_id: manifest.branchId, endpoint_id: manifest.endpointId, database_name: manifest.database, purpose: "test" }]);
  expect((await c.db.query("SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm')")).rowCount).toBe(2);
});
it("repeats safely under a non-superuser CREATEDB/CREATEROLE bootstrap owner with preinstalled extensions", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION; ALTER ROLE terreno_bootstrap_owner NOSUPERUSER");
  // Transfer back is a local test fixture: prove the actual owner-change requirements without superuser bypass.
  await c.db.query("ALTER DATABASE travel_test_foundation OWNER TO terreno_bootstrap_owner");
  await c.bootstrapSession();
  const before = await marker();
  await c.prepare(); await c.prepare();
  expect(await marker()).toEqual(before);
});
it("applies all six unchanged SQL migrations as the non-admin migrator and passes identity/ACL verification", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION travel_test_migrator");
  const pending = registry.pendingTargets[0];
  const fakeApproval = { ...pending, roles: { runtime: "travel_test_runtime", migrations: "travel_test_migrator", bootstrap: "terreno_bootstrap_owner" } };
  // Local test-only expected identity, never passed to the production resolver or written to targets.
  const { state: _state, bootstrapOwner: _owner, region: _region, postgresVersion: _pg, ...activeShape } = fakeApproval;
  void _state; void _owner; void _region; void _pg;
  const expected = assertNeonTestUrl(`postgresql://travel_test_migrator:local-example@${manifest.host}/${manifest.database}?sslmode=verify-full`, "migrations", activeShape as never, { projectId: manifest.projectId, branchId: manifest.branchId, endpointId: manifest.endpointId });
  await assertProfileIdentity(c.db, expected, "test");
  for (const migration of manifest.migrations) await c.db.query(readFileSync(`db/migrations/${migration.name}`, "utf8"));
  expect((await c.db.query("SELECT to_regclass('public.cities') AS table")).rows[0].table).toBe("cities");
  await c.bootstrapSession(); await verify();
});
it("keeps runtime SELECT/spatial reads and denies DML/DDL/TEMP/marker changes/SET ROLE", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION travel_test_runtime");
  expect((await c.db.query("SELECT count(*)::int AS n FROM public.countries")).rows[0].n).toBe(0);
  expect((await c.db.query("SELECT public.ST_X(public.ST_SetSRID(public.ST_MakePoint(12.5,41.9),4326)) AS x")).rows[0].x).toBe(12.5);
  for (const sql of ["INSERT INTO public.countries VALUES('IT','en',true)", "CREATE TABLE public.forbidden(id int)", "CREATE TEMP TABLE forbidden(id int)", "UPDATE public.travel_neon_test_identity SET purpose='test'", "SET ROLE travel_test_migrator", "SET ROLE terreno_bootstrap_owner", "SET ROLE neon_superuser"])
    await negative(sql);
  await c.bootstrapSession();
});
it("denies migrator marker modification and elevation to admin roles", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION travel_test_migrator");
  for (const sql of ["UPDATE public.travel_neon_test_identity SET purpose='test'", "SET ROLE terreno_bootstrap_owner", "SET ROLE neon_superuser"])
    await negative(sql);
  await c.bootstrapSession();
});
it("detects column-only write, sequence USAGE, callable SECURITY DEFINER and marker ACL drift", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION");
  await c.db.query("GRANT UPDATE(name) ON public.cities TO travel_test_runtime");
  await c.bootstrapSession(); await expect(verify()).rejects.toMatchObject({ code: "P0001" });
  await c.db.query("RESET SESSION AUTHORIZATION; REVOKE UPDATE(name) ON public.cities FROM travel_test_runtime");
  await c.db.query("CREATE SEQUENCE public.rehearsal_seq; GRANT USAGE ON public.rehearsal_seq TO travel_test_runtime");
  await c.bootstrapSession(); await expect(verify()).rejects.toMatchObject({ code: "P0001" });
  await c.db.query("RESET SESSION AUTHORIZATION; DROP SEQUENCE public.rehearsal_seq");
  await c.db.query("CREATE FUNCTION public.rehearsal_definer() RETURNS int LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'; GRANT EXECUTE ON FUNCTION public.rehearsal_definer() TO travel_test_runtime");
  await c.bootstrapSession(); await expect(verify()).rejects.toMatchObject({ code: "P0001" });
  await c.db.query("RESET SESSION AUTHORIZATION; DROP FUNCTION public.rehearsal_definer(); GRANT UPDATE(project_id) ON public.travel_neon_test_identity TO travel_test_migrator");
  await c.bootstrapSession(); await expect(verify()).rejects.toMatchObject({ code: "P0001" });
  await c.db.query("RESET SESSION AUTHORIZATION; REVOKE UPDATE(project_id) ON public.travel_neon_test_identity FROM travel_test_migrator");
  await c.bootstrapSession(); await verify();
});
it("refuses incorrect existing marker data without overwriting it", async () => {
  await c.db.query("UPDATE public.travel_neon_test_identity SET project_id='foreign'");
  await expect(c.prepare()).rejects.toMatchObject({ code: "P0001" });
  expect((await marker())[0].project_id).toBe("foreign");
  await c.db.query("UPDATE public.travel_neon_test_identity SET project_id=$1", [manifest.projectId]);
  await verify();
});
it("rejects runtime CREATE and column writes in a pgX user schema, and MAINTAIN", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION; CREATE SCHEMA pgXprivate; GRANT CREATE ON SCHEMA pgXprivate TO travel_test_runtime");
  await c.bootstrapSession();
  try { await expect(verify()).rejects.toMatchObject({ code: "P0001" }); }
  finally { await c.db.query("RESET SESSION AUTHORIZATION; REVOKE CREATE ON SCHEMA pgXprivate FROM travel_test_runtime"); }
  await c.db.query("CREATE TABLE pgXprivate.secret(value int); GRANT UPDATE(value) ON pgXprivate.secret TO travel_test_runtime");
  await c.bootstrapSession();
  try { await expect(verify()).rejects.toMatchObject({ code: "P0001" }); }
  finally { await c.db.query("RESET SESSION AUTHORIZATION; DROP TABLE pgXprivate.secret; DROP SCHEMA pgXprivate"); }
  await c.db.query("GRANT MAINTAIN ON public.countries TO travel_test_runtime"); await c.bootstrapSession();
  try { await expect(verify()).rejects.toMatchObject({ code: "P0001" }); }
  finally { await c.db.query("RESET SESSION AUTHORIZATION; REVOKE MAINTAIN ON public.countries FROM travel_test_runtime"); await c.bootstrapSession(); }
});
it("rejects unrelated marker checks and third-party marker writes", async () => {
  await c.db.query("ALTER TABLE public.travel_neon_test_identity DROP CONSTRAINT travel_neon_test_identity_singleton_check,DROP CONSTRAINT travel_neon_test_identity_purpose_check,ADD CHECK(project_id<>''),ADD CHECK(database_name<>'')");
  try { await expect(verify()).rejects.toMatchObject({ code: "P0001" }); }
  finally { await c.db.query("ALTER TABLE public.travel_neon_test_identity DROP CONSTRAINT travel_neon_test_identity_project_id_check,DROP CONSTRAINT travel_neon_test_identity_database_name_check,ADD CHECK(singleton),ADD CHECK(purpose='test')"); }
  await c.db.query("RESET SESSION AUTHORIZATION; CREATE ROLE rehearsal_writer NOLOGIN; GRANT UPDATE(project_id) ON public.travel_neon_test_identity TO rehearsal_writer"); await c.bootstrapSession();
  try { await expect(verify()).rejects.toMatchObject({ code: "P0001" }); }
  finally { await c.db.query("RESET SESSION AUTHORIZATION; REVOKE UPDATE(project_id) ON public.travel_neon_test_identity FROM rehearsal_writer; DROP ROLE rehearsal_writer"); await c.bootstrapSession(); }
});
it("rejects non-extension routines with a PostGIS name", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION; CREATE FUNCTION public.st_x() RETURNS int LANGUAGE sql AS 'SELECT 1'; GRANT EXECUTE ON FUNCTION public.st_x() TO travel_test_runtime"); await c.bootstrapSession();
  try { await expect(verify()).rejects.toMatchObject({ code: "P0001" }); }
  finally { await c.db.query("RESET SESSION AUTHORIZATION; DROP FUNCTION public.st_x()"); await c.bootstrapSession(); }
});
it("refuses bootstrap adoption of unrelated public objects and pre-existing runtime default grants", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION; CREATE TABLE public.private_customer(value int)"); await c.bootstrapSession();
  try { await expect(verify()).rejects.toMatchObject({ code: "P0001" }); }
  finally { await c.db.query("RESET SESSION AUTHORIZATION; DROP TABLE public.private_customer"); }
  await c.db.query("ALTER DEFAULT PRIVILEGES FOR ROLE travel_test_migrator GRANT SELECT ON TABLES TO travel_test_runtime"); await c.bootstrapSession();
  try { await expect(verify()).rejects.toMatchObject({ code: "P0001" }); }
  finally { await c.db.query("RESET SESSION AUTHORIZATION; ALTER DEFAULT PRIVILEGES FOR ROLE travel_test_migrator REVOKE SELECT ON TABLES FROM travel_test_runtime"); await c.bootstrapSession(); }
});
