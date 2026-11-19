import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inspect } from "node:util";
import { expect, it } from "vitest";
import registry from "../../src/shared/db/neon-test-targets.json";
import { fixtureSecret } from "../fixtures/neon-test";

const base = "db/bootstrap/neon-test/";
const read = (name: string) => readFileSync(base + name, "utf8").replace(/\r\n/g, "\n");
export const metadata = () => ({
  organization: { id: "org-lucky-base-56347525", name: "norman", plan: "free" },
  project: { id: "broad-wind-62771105", name: "terreno-test", org_id: "org-lucky-base-56347525", region_id: "aws-eu-central-1", pg_version: 17 },
  branch: { id: "br-mute-river-bavdwjwl", name: "test", project_id: "broad-wind-62771105" },
  endpoint: { id: "ep-curly-moon-ba3f3csy", project_id: "broad-wind-62771105", branch_id: "br-mute-river-bavdwjwl", host: "ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech", region_id: "aws-eu-central-1" },
  database: { name: "travel_test_foundation", branch_id: "br-mute-river-bavdwjwl", owner_name: "terreno_bootstrap_owner" },
});
const url = () => `postgresql://terreno_bootstrap_owner:${fixtureSecret}@${metadata().endpoint.host}/travel_test_foundation?sslmode=verify-full`;

it("ships a password-free exact-target manifest with immutable six-migration checksums", () => {
  const m = JSON.parse(read("manifest.json"));
  expect(m.projectId).toBe(metadata().project.id);
  expect(m.branchId).toBe(metadata().branch.id);
  expect(m.endpointId).toBe(metadata().endpoint.id);
  expect(m.migrations).toHaveLength(6);
  for (const f of m.migrations) {
    const sql = readFileSync(`db/migrations/${f.name}`, "utf8").replace(/\r\n/g, "\n");
    expect(createHash("sha256").update(sql).digest("hex")).toBe(f.sha256);
  }
  expect(registry.targets).toEqual([]);
  expect(registry.pendingTargets).toHaveLength(1);
});
it("separates read-only inspection from atomic preparation/verification and forbids destructive/credential SQL", () => {
  const inspectSql = read("00_inspect.sql"), prepare = read("10_prepare.sql"), verify = read("20_verify.sql");
  expect(inspectSql).toContain("BEGIN READ ONLY;");
  expect(prepare).toMatch(/^--[^]*?BEGIN;/);
  expect(prepare).not.toMatch(/\bCOMMIT\s*;/i);
  expect(verify.trim()).toMatch(/COMMIT;$/);
  for (const sql of [inspectSql, prepare, verify]) {
    expect(sql).not.toMatch(/\b(?:DROP\s+(?:DATABASE|ROLE|TABLE|SCHEMA)|PASSWORD|SECURITY\s+DEFINER)\b/i);
    expect(sql).not.toContain("postgresql://");
    expect(sql).toContain("travel.bootstrap.project_id");
    expect(sql).toContain("broad-wind-62771105");
    expect(sql).toContain("Neon bootstrap refused");
  }
  expect(prepare).toContain("NOLOGIN");
  expect(prepare).toContain("pg_advisory_xact_lock");
  expect(verify).toContain("has_any_column_privilege");
  expect(verify).toContain("has_sequence_privilege");
  expect(verify).toContain("prosecdef");
  expect(verify).toContain("pg_auth_members");
});
it("validates a plan without a driver, and only returns secret-free public transport metadata", async () => {
  const { assertBootstrapPlan } = await import("../../scripts/lib/neon-bootstrap-plan");
  const p = assertBootstrapPlan(metadata(), url(), {});
  expect(p).toMatchObject({ kind: "direct", host: metadata().endpoint.host, tls: "verify-full" });
  expect(JSON.stringify(p) + inspect(p)).not.toContain(fixtureSecret);
});
it("permits only explicit read-only recovery inspection after ownership transfer", async () => {
  const { assertBootstrapPlan } = await import("../../scripts/lib/neon-bootstrap-plan");
  const m = metadata(); m.database.owner_name = "travel_test_migrator";
  expect(() => assertBootstrapPlan(m, url(), {})).toThrow();
  expect(assertBootstrapPlan(m, url(), {}, "inspect-recovery")).toMatchObject({ kind: "direct", intent: "inspect-recovery" });
  m.database.owner_name = "foreign";
  expect(() => assertBootstrapPlan(m, url(), {}, "inspect-recovery")).toThrow();
});
it.each(["organization", "project", "branch", "endpoint", "database"] as const)("refuses mismatched management record %s", async key => {
  const { assertBootstrapPlan } = await import("../../scripts/lib/neon-bootstrap-plan");
  const m = metadata(); Object.assign(m[key], { id: "foreign", name: "foreign", host: "foreign" });
  expect(() => assertBootstrapPlan(m, url(), {})).toThrow("Unsafe Neon bootstrap plan");
});
it("refuses wrong region/PG/owner, pooled or weak TLS URLs, overrides and error serialization leaks", async () => {
  const { assertBootstrapPlan } = await import("../../scripts/lib/neon-bootstrap-plan");
  for (const change of [
    (m: ReturnType<typeof metadata>) => { m.project.pg_version = 18; },
    (m: ReturnType<typeof metadata>) => { m.project.region_id = "foreign"; },
    (m: ReturnType<typeof metadata>) => { m.database.owner_name = "travel_test_migrator"; },
  ]) { const m = metadata(); change(m); expect(() => assertBootstrapPlan(m, url(), {})).toThrow("Unsafe Neon bootstrap plan"); }
  for (const raw of [url().replace(".c-8", "-pooler.c-8"), url().replace("verify-full", "require"), url()+"&options=unsafe", url().replace("travel_test_foundation", "postgres"), url().replace("terreno_bootstrap_owner", "travel_test_runtime")])
    expect(() => assertBootstrapPlan(metadata(), raw, {})).toThrow("Unsafe Neon bootstrap plan");
  try { assertBootstrapPlan(metadata(), url(), { PGHOST: fixtureSecret }); }
  catch (error) { expect(inspect(error, { showHidden: true })).not.toContain(fixtureSecret); expect((error as Error).cause).toBeUndefined(); return; }
  throw Error("Expected refusal");
});
