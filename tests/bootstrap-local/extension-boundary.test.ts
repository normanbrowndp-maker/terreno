import { afterAll, beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { localCluster } from "./cluster";
import manifest from "../../db/bootstrap/neon-test/manifest.json";

// A local policy experiment, NOT a replacement bootstrap or production guard.
let baseline: Awaited<ReturnType<typeof localCluster>>;
let isolated: Awaited<ReturnType<typeof localCluster>>;
async function runtime(c: typeof baseline) {
  await c.db.query("RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION travel_test_runtime; SET search_path=public");
}
async function admin(c: typeof baseline) { await c.db.query("RESET SESSION AUTHORIZATION"); }
beforeAll(async () => {
  baseline = await localCluster();
  await baseline.prepare();
  await admin(baseline);
  await baseline.db.query("CREATE TABLE public.boundary_point AS SELECT public.st_setsrid(public.st_makepoint(12.5,41.9),4326) AS location; GRANT SELECT ON public.boundary_point TO travel_test_runtime");
  isolated = await localCluster();
  await admin(isolated);
  await isolated.db.query(`
    CREATE ROLE travel_test_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
    CREATE ROLE travel_test_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
    CREATE SCHEMA travel_extensions AUTHORIZATION terreno_bootstrap_owner;
    REVOKE ALL ON SCHEMA travel_extensions FROM PUBLIC;
    CREATE EXTENSION postgis WITH SCHEMA travel_extensions;
    CREATE EXTENSION pg_trgm WITH SCHEMA travel_extensions;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    REVOKE TEMPORARY ON DATABASE travel_test_foundation FROM PUBLIC;
    GRANT USAGE,CREATE ON SCHEMA public TO travel_test_migrator;
    GRANT USAGE ON SCHEMA travel_extensions TO travel_test_migrator;
    GRANT USAGE ON SCHEMA public TO travel_test_runtime;
    SET search_path=public,travel_extensions;
    CREATE TABLE public.boundary_point AS SELECT st_setsrid(st_makepoint(12.5,41.9),4326) AS location;
    ALTER TABLE public.boundary_point OWNER TO travel_test_migrator;
    GRANT SELECT ON public.boundary_point TO travel_test_runtime;
  `);
});
afterAll(async () => {
  if (isolated) await isolated.close();
  if (baseline) await baseline.close();
});

it("fresh private installation is possible; EXECUTE privilege alone does not imply name lookup", async () => {
  await runtime(isolated);
  expect((await isolated.db.query(`SELECT
    has_schema_privilege(current_user,'travel_extensions','USAGE') AS usage,
    has_function_privilege(current_user,p.oid,'EXECUTE') AS execute,
    e.extrelocatable AS relocatable
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_extension e ON e.extname='postgis'
    WHERE n.nspname='travel_extensions' AND p.proname='postgis_full_version'`)).rows[0])
    .toEqual({ usage: false, execute: true, relocatable: false });
  await expect(isolated.db.query("SELECT travel_extensions.postgis_full_version()"))
    .rejects.toMatchObject({ code: "42501" });
  await expect(isolated.db.query("SELECT st_x(location) FROM public.boundary_point"))
    .rejects.toMatchObject({ code: "42883" });
  await expect(isolated.db.query("SELECT location::travel_extensions.geography FROM public.boundary_point"))
    .rejects.toMatchObject({ code: "42501" });
  await expect(isolated.db.query("SELECT location OPERATOR(travel_extensions.&&) location FROM public.boundary_point"))
    .rejects.toMatchObject({ code: "42501" });
});

it("all six unchanged migrations require an explicit spatial migration search_path", async () => {
  await admin(isolated);
  await isolated.db.query("SET SESSION AUTHORIZATION travel_test_migrator; SET search_path=public");
  await isolated.db.query("BEGIN");
  const [first] = manifest.migrations;
  if (!first) throw new Error("Migration manifest must not be empty");
  await expect(isolated.db.query(readFileSync(`db/migrations/${first.name}`, "utf8")))
    .rejects.toMatchObject({ code: "42704" });
  await isolated.db.query("ROLLBACK; SET search_path=public,travel_extensions; BEGIN");
  try {
    for (const m of manifest.migrations) await isolated.db.query(readFileSync(`db/migrations/${m.name}`, "utf8"));
    expect((await isolated.db.query("SELECT count(*)::int AS n FROM public.cities")).rows[0].n).toBe(0);
    await isolated.db.query("COMMIT");
  } catch (e) { await isolated.db.query("ROLLBACK"); throw e; }
});

it("SQL-standard invoker projection can bridge ST_X without schema USAGE or SECURITY DEFINER", async () => {
  await admin(isolated);
  await isolated.db.query(`CREATE FUNCTION public.st_x(travel_extensions.geometry) RETURNS double precision
    LANGUAGE SQL IMMUTABLE STRICT SECURITY INVOKER RETURN travel_extensions.st_x($1);
    REVOKE ALL ON FUNCTION public.st_x(travel_extensions.geometry) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.st_x(travel_extensions.geometry) TO travel_test_runtime;`);
  await runtime(isolated);
  expect((await isolated.db.query("SELECT st_x(location) AS x FROM public.boundary_point")).rows[0].x).toBe(12.5);
  expect((await isolated.db.query("SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='st_x'")).rows[0].prosecdef).toBe(false);
});

it("an invoker view can expose a hidden non-allowlisted routine despite no schema USAGE", async () => {
  for (const c of [baseline, isolated]) {
    const schema = c === baseline ? "public" : "travel_extensions";
    await admin(c);
    await c.db.query(`CREATE VIEW public.boundary_version WITH (security_invoker=true) AS SELECT ${schema}.similarity('Italia','Italia') AS similarity, ${schema}.postgis_lib_version() AS version;
      GRANT SELECT ON public.boundary_version TO travel_test_runtime`);
    await runtime(c);
  }
  await expect(baseline.db.query("SELECT * FROM public.boundary_version")).rejects.toMatchObject({ code: "42501" });
  expect((await isolated.db.query("SELECT * FROM public.boundary_version")).rows[0].similarity).toBe(1);
  expect((await isolated.db.query("SELECT * FROM public.boundary_version")).rows[0].version).toMatch(/^3\./);
});

it("a cast invokes hidden text(geometry) although the existing routine ACL policy denies it", async () => {
  await runtime(baseline); await runtime(isolated);
  await expect(baseline.db.query("SELECT location::text FROM public.boundary_point"))
    .rejects.toMatchObject({ code: "42501" });
  expect((await isolated.db.query(`SELECT
    has_schema_privilege(current_user,n.oid,'USAGE') AS usage,
    has_function_privilege(current_user,p.oid,'EXECUTE') AS execute,
    has_schema_privilege(current_user,n.oid,'USAGE') AND has_function_privilege(current_user,p.oid,'EXECUTE') AS naive_callable
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='travel_extensions' AND p.proname='text' AND p.pronargs=1`)).rows[0])
    .toEqual({ usage: false, execute: true, naive_callable: false });
  expect((await isolated.db.query("SELECT location::text AS text FROM public.boundary_point")).rows[0].text).toMatch(/^[0-9A-F]+$/);
});

it("role-switched cached statements recheck lookup: do not infer a cached-plan bypass from this fixture", async () => {
  for (const c of [baseline, isolated]) {
    const schema = c === baseline ? "public" : "travel_extensions";
    await admin(c);
    await c.db.query(`GRANT USAGE ON SCHEMA ${schema} TO travel_test_runtime; GRANT EXECUTE ON FUNCTION ${schema}.similarity(text,text) TO travel_test_runtime`);
    await runtime(c);
    await c.db.query(`PREPARE boundary_cached AS SELECT ${schema}.similarity('Italia','Italia') AS similarity`);
    // Changing session authorization invalidates plans. This does NOT model a stable pooled session.
    await admin(c);
    if (c === isolated) await c.db.query("REVOKE USAGE ON SCHEMA travel_extensions FROM travel_test_runtime");
    else await c.db.query("REVOKE EXECUTE ON FUNCTION public.similarity(text,text) FROM travel_test_runtime");
    await runtime(c);
  }
  await expect(baseline.db.query("EXECUTE boundary_cached")).rejects.toMatchObject({ code: "42501" });
  await expect(isolated.db.query("EXECUTE boundary_cached")).rejects.toMatchObject({ code: "42501" });
});
