import { afterAll, beforeAll, expect, it } from "vitest";
import { localCluster } from "./cluster";

let c: Awaited<ReturnType<typeof localCluster>>;
beforeAll(async () => { c = await localCluster(); await c.prepare(); });
afterAll(async () => { if (c) await c.close(); });

async function refused(predicate: string, role = "") {
  try {
    await expect(c.db.query("BEGIN READ ONLY;" + c.sql("20_verify.sql")))
      .rejects.toMatchObject({ code: "P0001", detail: `${predicate}${role}:P0001` });
  } finally { await c.db.query("ROLLBACK"); }
}

it("identifies the exact database ACL predicate without leaking query text", async () => {
  await c.db.query("GRANT TEMPORARY ON DATABASE travel_test_foundation TO travel_test_runtime");
  try { await refused("runtime_database_create_temp"); }
  finally { await c.db.query("REVOKE TEMPORARY ON DATABASE travel_test_foundation FROM travel_test_runtime"); }
});

it("distinguishes marker column ACL and upward membership failures", async () => {
  await c.db.query("GRANT UPDATE(project_id) ON public.travel_neon_test_identity TO travel_test_migrator");
  try { await refused("marker_column_acl"); }
  finally { await c.db.query("REVOKE UPDATE(project_id) ON public.travel_neon_test_identity FROM travel_test_migrator"); }
  await c.db.query("GRANT neon_superuser TO travel_test_runtime");
  try { await refused("role_membership_up/", "travel_test_runtime"); }
  finally { await c.db.query("REVOKE neon_superuser FROM travel_test_runtime"); }
});

it("reproduces a verify-only refusal when a provider-owned extension routine retains PUBLIC EXECUTE", async () => {
  // Explicit local model, not a claim that Neon used these grants in the lost transaction.
  await c.db.query("RESET SESSION AUTHORIZATION; ALTER FUNCTION public.postgis_full_version() OWNER TO rehearsal_admin; GRANT EXECUTE ON FUNCTION public.postgis_full_version() TO PUBLIC; ALTER ROLE terreno_bootstrap_owner NOSUPERUSER");
  await c.bootstrapSession();
  try {
    // Prepare can warn about a routine it cannot revoke, then reach verify.
    await c.db.query(c.sql("10_prepare.sql"));
    const evidence = (await c.db.query("SELECT pg_get_userbyid(p.proowner) AS owner,has_function_privilege('travel_test_runtime',p.oid,'EXECUTE') AS runtime_execute FROM pg_proc p WHERE p.oid='public.postgis_full_version()'::regprocedure")).rows[0];
    expect(evidence).toEqual({ owner: "rehearsal_admin", runtime_execute: true });
    await expect(c.db.query(c.sql("20_verify.sql")))
      .rejects.toMatchObject({ code: "P0001", detail: "runtime_routine_allowlist:P0001" });
  } finally {
    await c.db.query("ROLLBACK; RESET SESSION AUTHORIZATION; ALTER ROLE terreno_bootstrap_owner SUPERUSER; ALTER FUNCTION public.postgis_full_version() OWNER TO terreno_bootstrap_owner; REVOKE EXECUTE ON FUNCTION public.postgis_full_version() FROM PUBLIC");
    await c.bootstrapSession();
  }
});

it("still verifies a clean bootstrap and repeats without changing marker data", async () => {
  const before = (await c.db.query("SELECT * FROM public.travel_neon_test_identity")).rows;
  await c.prepare("BEGIN READ ONLY;" + c.sql("20_verify.sql"));
  await c.prepare(); await c.prepare();
  expect((await c.db.query("SELECT * FROM public.travel_neon_test_identity")).rows).toEqual(before);
});

it("rolls back every first-bootstrap change on verify failure or diagnostic terminal abort", async () => {
  const fresh = await localCluster();
  try {
    await expect(fresh.db.query(fresh.sql("10_prepare.sql")
      + "GRANT TEMPORARY ON DATABASE travel_test_foundation TO travel_test_runtime;"
      + fresh.sql("20_verify.sql")))
      .rejects.toMatchObject({ code: "P0001", detail: "runtime_database_create_temp:P0001" });
    await fresh.db.query("ROLLBACK");
    expect((await fresh.db.query("SELECT to_regclass('public.travel_neon_test_identity') AS marker,pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database()")).rows[0])
      .toEqual({ marker: null, owner: "terreno_bootstrap_owner" });
    expect((await fresh.db.query("SELECT rolname FROM pg_roles WHERE rolname IN ('travel_test_runtime','travel_test_migrator')")).rows).toEqual([]);
    expect((await fresh.db.query("SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm')")).rows).toEqual([]);
    // Future cloud diagnosis must also roll back if every verify predicate passes.
    const verifyWithoutCommit = fresh.sql("20_verify.sql").replace(/COMMIT;\s*$/, "");
    await expect(fresh.db.query(fresh.sql("10_prepare.sql") + verifyWithoutCommit
      + "DO $abort$ BEGIN RAISE EXCEPTION 'Diagnostic rollback' USING ERRCODE='P0001',DETAIL='diagnostic_all_checks_passed'; END $abort$;"))
      .rejects.toMatchObject({ code: "P0001", detail: "diagnostic_all_checks_passed" });
    await fresh.db.query("ROLLBACK");
    expect((await fresh.db.query("SELECT to_regclass('public.travel_neon_test_identity') AS marker,pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database()")).rows[0])
      .toEqual({ marker: null, owner: "terreno_bootstrap_owner" });
    expect((await fresh.db.query("SELECT rolname FROM pg_roles WHERE rolname IN ('travel_test_runtime','travel_test_migrator')")).rows).toEqual([]);
    expect((await fresh.db.query("SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm')")).rows).toEqual([]);
  } finally { await fresh.db.query("ROLLBACK"); await fresh.close(); }
});
