import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { Client, type QueryResult } from "pg";
import { assertLocalDatabaseTarget } from "../../src/shared/db/target";
import { assertDatabaseIdentity } from "../../src/shared/db/identity";

const url = process.env.TEST_DATABASE_URL!;
const target = assertLocalDatabaseTarget(url, "test"); // Refuses Neon before constructing a client.
const db = new Client({ connectionString: url });
const sql = readFileSync("db/bootstrap/neon-test/00_inspect.sql", "utf8");
// Only this local test copy substitutes the expected login. Production SQL guard is unchanged.
const localSql = sql.replace("current_user<>'terreno_bootstrap_owner'", `current_user<>'${target.username}'`);
beforeAll(async () => {
  await db.connect(); await assertDatabaseIdentity(db, "test");
  for (const [key, value] of Object.entries({ project_id: "broad-wind-62771105", branch_id: "br-mute-river-bavdwjwl", endpoint_id: "ep-curly-moon-ba3f3csy", host: "ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech" }))
    await db.query("SELECT set_config($1,$2,false)", [`travel.bootstrap.${key}`, value]);
});
afterAll(async () => { await db.end(); });
it("covers memberships, all user schemas and effective/default/table/column/sequence ACL without DDL or data reads", () => {
  for (const token of ["pg_auth_members", "pg_default_acl", "has_schema_privilege", "has_any_column_privilege", "has_sequence_privilege", "MAINTAIN", "pg_stat_ssl", "server_version", "estimated_rows"])
    expect(sql).toContain(token);
  expect(sql).not.toContain("NOT LIKE 'pg_%'");
  expect(sql).not.toMatch(/^\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|COPY)\b/im);
});
it("executes the expanded inspection on protected local PostgreSQL in READ ONLY", async () => {
  const before = (await db.query("SELECT count(*)::int AS n FROM public.countries")).rows[0].n;
  const results = await db.query(localSql) as unknown as QueryResult[];
  const fields = new Set(results.flatMap(r => r.fields.map(f => f.name)));
  for (const name of ["read_only", "member_role", "schema_name", "privilege_type", "column_name", "sequence_write", "estimated_rows"])
    expect(fields.has(name)).toBe(true);
  expect(results.flatMap(r => r.rows).find(r => "read_only" in r)?.read_only).toBe(true);
  expect((await db.query("SELECT count(*)::int AS n FROM public.countries")).rows[0].n).toBe(before);
});
it("still rejects a foreign receipt before inventory and does not leave a transaction open", async () => {
  await db.query("SELECT set_config('travel.bootstrap.project_id','foreign',false)");
  try { await expect(db.query(localSql)).rejects.toMatchObject({ code: "P0001" }); }
  finally { await db.query("ROLLBACK"); }
  expect((await db.query("SELECT 1 AS ok")).rows[0].ok).toBe(1);
});
