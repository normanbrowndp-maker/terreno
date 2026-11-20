import { afterAll, beforeAll, expect, it } from "vitest";
import { localCluster } from "./cluster";

let c: Awaited<ReturnType<typeof localCluster>>;
beforeAll(async () => {
  c = await localCluster();
  await c.bootstrapSession();
  // Native PostGIS needs superuser installation; Neon supplies a managed installer.
  // Preinstall as bootstrap owner, then remove SUPERUSER before the first role creation.
  await c.db.query("CREATE EXTENSION postgis WITH SCHEMA public; CREATE EXTENSION pg_trgm WITH SCHEMA public");
  await c.db.query("RESET SESSION AUTHORIZATION; ALTER ROLE terreno_bootstrap_owner LOGIN NOSUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS INHERIT; GRANT neon_superuser TO terreno_bootstrap_owner WITH ADMIN FALSE, INHERIT TRUE, SET TRUE");
  await c.bootstrapSession();
});
afterAll(async () => { if (c) await c.close(); });

const roles = async () => (await c.db.query("SELECT rolname FROM pg_roles WHERE rolname IN ('travel_test_runtime','travel_test_migrator')")).rows;
const memberships = async () => (await c.db.query("SELECT pg_get_userbyid(grantor) AS grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='travel_test_migrator'::regrole AND member='terreno_bootstrap_owner'::regrole ORDER BY grantor")).rows;

it("identifies the exact old ADMIN self-grant as 0LP01 on a fresh PG17 non-superuser creator", async () => {
  await c.db.query("BEGIN; SET LOCAL createrole_self_grant='inherit,set'; CREATE ROLE travel_test_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT");
  try {
    const grants = await memberships();
    expect(grants).toContainEqual({ grantor: "rehearsal_admin", admin_option: true, inherit_option: false, set_option: false });
    expect(grants).toContainEqual({ grantor: "terreno_bootstrap_owner", admin_option: false, inherit_option: true, set_option: true });
    await expect(c.db.query("GRANT travel_test_migrator TO terreno_bootstrap_owner WITH ADMIN TRUE, INHERIT TRUE, SET TRUE"))
      .rejects.toMatchObject({ code: "0LP01" }); // SQLSTATE is stable; server message is localized.
  } finally { await c.db.query("ROLLBACK"); }
  expect(await roles()).toEqual([]);
});

it("rolls back a late first-bootstrap failure under Neon-like role attributes", async () => {
  await expect(c.prepare(c.sql("10_prepare.sql") + "SELECT 1/0;" + c.sql("20_verify.sql"))).rejects.toMatchObject({ code: "22012" });
  expect(await roles()).toEqual([]);
  expect((await c.db.query("SELECT to_regclass('public.travel_neon_test_identity') AS marker,pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database()")).rows[0])
    .toEqual({ marker: null, owner: "terreno_bootstrap_owner" });
});

it("completes the first non-superuser bootstrap without weakening identity or ACL verification", async () => {
  await c.prepare();
  await c.prepare("BEGIN READ ONLY;" + c.sql("20_verify.sql"));
  expect(await roles()).toHaveLength(2);
  expect((await c.db.query("SELECT count(*)::int AS n FROM public.travel_neon_test_identity")).rows[0].n).toBe(1);
  expect((await c.db.query("SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname IN ('travel_test_runtime','travel_test_migrator')")).rows)
    .toEqual(Array(2).fill({ rolcanlogin: false, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, rolinherit: false }));
});

it("repeats without adding grants or changing the singleton marker", async () => {
  const before = await memberships();
  const marker = (await c.db.query("SELECT * FROM public.travel_neon_test_identity")).rows;
  await c.prepare(); await c.prepare();
  expect(await memberships()).toEqual(before);
  expect((await c.db.query("SELECT * FROM public.travel_neon_test_identity")).rows).toEqual(marker);
  await c.prepare("BEGIN READ ONLY;" + c.sql("20_verify.sql"));
});
