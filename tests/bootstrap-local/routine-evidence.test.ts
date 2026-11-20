import { afterAll, beforeAll, expect, it } from "vitest";
import { localCluster } from "./cluster";

let c: Awaited<ReturnType<typeof localCluster>>;
beforeAll(async () => { c = await localCluster(); await c.prepare(); });
afterAll(async () => { if (c) await c.close(); });
async function evidence(client = c) {
  let error: { code?: string; detail?: string } | undefined;
  try { await client.db.query("BEGIN READ ONLY;" + client.sql("30_diagnose_routines.sql")); }
  catch (e) { error = e as typeof error; }
  finally { await client.db.query("ROLLBACK"); }
  expect(error?.code).toBe("P0001");
  return JSON.parse(error!.detail!);
}

it("reports signature, extension, owner and PUBLIC ACL instead of guessing", async () => {
  await c.db.query("GRANT EXECUTE ON FUNCTION public.postgis_full_version() TO PUBLIC");
  try {
    const out = await evidence();
    expect(out.count).toBe(1);
    expect(out.functions[0]).toMatchObject({ signature: "public.postgis_full_version()", owner: "terreno_bootstrap_owner", extensions: ["postgis"], acl_is_default: false });
    expect(out.functions[0].execute_sources).toContainEqual(expect.objectContaining({ via: "PUBLIC", grantee: "PUBLIC", grantor: "terreno_bootstrap_owner" }));
    expect(out.functions[0].acl).toContainEqual(expect.objectContaining({ grantee: "PUBLIC", privilege: "EXECUTE" }));
  } finally { await c.db.query("REVOKE EXECUTE ON FUNCTION public.postgis_full_version() FROM PUBLIC"); }
});

it("distinguishes explicit runtime grants from inherited membership grants", async () => {
  await c.db.query("GRANT EXECUTE ON FUNCTION public.postgis_full_version() TO travel_test_runtime");
  try { expect((await evidence()).functions[0].execute_sources).toContainEqual(expect.objectContaining({ via: "explicit", grantee: "travel_test_runtime" })); }
  finally { await c.db.query("REVOKE EXECUTE ON FUNCTION public.postgis_full_version() FROM travel_test_runtime"); }
  await c.db.query("CREATE ROLE evidence_reader NOLOGIN; GRANT EXECUTE ON FUNCTION public.postgis_full_version() TO evidence_reader; GRANT evidence_reader TO travel_test_runtime WITH INHERIT TRUE, SET FALSE");
  try { expect((await evidence()).functions[0].execute_sources).toContainEqual(expect.objectContaining({ via: "membership", grantee: "evidence_reader" })); }
  finally { await c.db.query("REVOKE evidence_reader FROM travel_test_runtime; REVOKE EXECUTE ON FUNCTION public.postgis_full_version() FROM evidence_reader; DROP ROLE evidence_reader"); }
});

it("expands NULL proacl defaults and identifies a non-extension routine", async () => {
  await c.db.query("CREATE FUNCTION public.evidence_default() RETURNS int LANGUAGE sql AS 'SELECT 1'");
  try {
    const row = (await evidence()).functions[0];
    expect(row).toMatchObject({ signature: "public.evidence_default()", raw_acl: null, acl_is_default: true, extensions: [] });
    expect(row.execute_sources).toContainEqual(expect.objectContaining({ via: "PUBLIC" }));
  } finally { await c.db.query("DROP FUNCTION public.evidence_default()"); }
});

it("proves provider-owned PUBLIC ACL survives bootstrap revoke and requires an owner-side correction", async () => {
  await c.db.query("RESET SESSION AUTHORIZATION; CREATE ROLE cloud_admin NOLOGIN NOSUPERUSER; GRANT USAGE ON SCHEMA public TO cloud_admin; ALTER FUNCTION public.postgis_full_version() OWNER TO cloud_admin; SET SESSION AUTHORIZATION cloud_admin; GRANT EXECUTE ON FUNCTION public.postgis_full_version() TO PUBLIC; RESET SESSION AUTHORIZATION; ALTER ROLE terreno_bootstrap_owner NOSUPERUSER");
  await c.bootstrapSession();
  try {
    try {
      await expect(c.db.query(c.sql("10_prepare.sql") + c.sql("20_verify.sql")))
        .rejects.toMatchObject({ code: "P0001", detail: "runtime_routine_allowlist:P0001" });
    } finally { await c.db.query("ROLLBACK"); }
    const row = (await evidence()).functions[0];
    expect(row).toMatchObject({ owner: "cloud_admin", bootstrap_owner_access: false });
    expect(new Set(row.raw_acl.slice(1, -1).split(",")))
      .toEqual(new Set(["=X/cloud_admin", "cloud_admin=X/cloud_admin"])); // ACL array order is not semantic.
    expect(row.execute_sources).toEqual([{ via: "PUBLIC", grantee: "PUBLIC", grantor: "cloud_admin", grantable: false }]);
    // This privileged role is a disposable local fixture, not a proposed Neon login.
    await c.db.query("RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION cloud_admin; REVOKE EXECUTE ON FUNCTION public.postgis_full_version() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.postgis_full_version() TO terreno_bootstrap_owner WITH GRANT OPTION; RESET SESSION AUTHORIZATION");
    await c.bootstrapSession();
    await c.prepare(); await c.prepare();
    await c.prepare("BEGIN READ ONLY;" + c.sql("20_verify.sql"));
    expect((await evidence()).count).toBe(0);
    expect((await c.db.query("SELECT has_function_privilege('travel_test_runtime','public.postgis_full_version()','EXECUTE') AS execute,pg_has_role('travel_test_runtime','cloud_admin','MEMBER') AS member")).rows[0])
      .toEqual({ execute: false, member: false });
  } finally {
    await c.db.query("ROLLBACK; RESET SESSION AUTHORIZATION; ALTER ROLE terreno_bootstrap_owner SUPERUSER; ALTER FUNCTION public.postgis_full_version() OWNER TO terreno_bootstrap_owner; REVOKE USAGE ON SCHEMA public FROM cloud_admin; DROP ROLE cloud_admin");
    await c.bootstrapSession();
  }
});

it("always raises even for an empty list and rolls back a fresh prepare", async () => {
  expect(await evidence()).toMatchObject({ kind: "runtime_routine_evidence", count: 0, functions: [] });
  const fresh = await localCluster();
  try {
    let error: { code?: string; detail?: string } | undefined;
    try { await fresh.db.query(fresh.sql("10_prepare.sql") + fresh.sql("30_diagnose_routines.sql")); }
    catch (e) { error = e as typeof error; }
    finally { await fresh.db.query("ROLLBACK"); }
    expect(error?.code).toBe("P0001");
    expect(JSON.parse(error!.detail!).count).toBe(0);
    expect((await fresh.db.query("SELECT to_regclass('public.travel_neon_test_identity') AS marker,pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database()")).rows[0]).toEqual({ marker: null, owner: "terreno_bootstrap_owner" });
    expect((await fresh.db.query("SELECT rolname FROM pg_roles WHERE rolname IN ('travel_test_runtime','travel_test_migrator')")).rows).toEqual([]);
    expect((await fresh.db.query("SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm')")).rows).toEqual([]);
  } finally { await fresh.close(); }
});
