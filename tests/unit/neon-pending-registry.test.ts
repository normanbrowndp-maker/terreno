import { afterEach, expect, it, vi } from "vitest";
import { inspect } from "node:util";
import { Client, Pool } from "pg";
import registry from "../../src/shared/db/neon-test-targets.json";
import * as config from "../../src/shared/db/neon-test-config";
import { resolveDatabaseConnection } from "../../src/shared/db/connection-profile";
import { migrateDatabase } from "../../src/shared/db/migrate";
import { fixtureSecret, neonFixture } from "../fixtures/neon-test";

// Public metadata confirmed via management API; credentials below are fake and never connected.
const pending = () => ({
  schemaVersion: 1,
  state: "pending-bootstrap",
  project: { id: "broad-wind-62771105", name: "terreno-test", organizationId: "org-lucky-base-56347525" },
  branch: { id: "br-mute-river-bavdwjwl", projectId: "broad-wind-62771105" },
  endpoint: {
    id: "ep-curly-moon-ba3f3csy", projectId: "broad-wind-62771105", branchId: "br-mute-river-bavdwjwl",
    host: "ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech",
  },
  database: "travel_test_foundation",
  bootstrapOwner: "terreno_bootstrap_owner",
  region: "aws-eu-central-1", postgresVersion: 17,
  verifiedAt: "2026-11-19T06:05:56Z", verificationSource: "neon-management-metadata",
});
const request = {
  projectId: pending().project.id, branchId: pending().branch.id, endpointId: pending().endpoint.id,
};
const env = {
  TRAVEL_DATABASE_PROFILE: "neon-test",
  TRAVEL_NEON_TEST_PROJECT_ID: request.projectId,
  TRAVEL_NEON_TEST_BRANCH_ID: request.branchId,
  TRAVEL_NEON_TEST_ENDPOINT_ID: request.endpointId,
};
const root = (record: unknown = pending()) => ({ schemaVersion: 1, targets: [], pendingTargets: [record] });
function fakeUrl(pooled = false) {
  const t = pending();
  const host = pooled ? t.endpoint.host.replace(`${t.endpoint.id}.`, `${t.endpoint.id}-pooler.`) : t.endpoint.host;
  return `postgresql://${t.bootstrapOwner}:${fixtureSecret}@${host}/${t.database}?sslmode=verify-full`;
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("records exactly the verified real metadata as pending, without inventing runtime/migration roles", () => {
  const parsed = config.parseNeonTestRegistry(registry);
  expect(parsed.targets).toEqual([]);
  expect(parsed.pendingTargets).toEqual([pending()]);
  expect(parsed.pendingTargets[0]).not.toHaveProperty("roles");
  expect(Object.isFrozen(parsed.pendingTargets[0]?.project)).toBe(true);
  expect(Object.isFrozen(parsed.pendingTargets)).toBe(true);
});
it("preserves legacy active test-only fixtures but never promotes pending records", () => {
  const parsed = config.parseNeonTestRegistry({ schemaVersion: 1, targets: [neonFixture] });
  expect(parsed.targets[0]?.project.id).toBe(neonFixture.project.id);
  expect(parsed.pendingTargets).toEqual([]);
  expect(() => config.parseNeonTestTarget(pending())).toThrow("Invalid Neon test target configuration");
  expect(() => config.approvedNeonTestTarget(request)).toThrow("Neon test target is not approved");
});
it.each([
  { project: { ...pending().project, id: "wrong-project-001" } },
  { project: { ...pending().project, name: "gloomi" } },
  { branch: { ...pending().branch, id: "br-wrong-001" } },
  { endpoint: { ...pending().endpoint, id: "ep-wrong-001" } },
  { endpoint: { ...pending().endpoint, host: "ep-other.c-8.eu-central-1.aws.neon.tech" } },
  { database: "postgres" },
  { bootstrapOwner: "travel_test_runtime" },
  { bootstrapOwner: "neon_superuser" },
  { region: "aws-us-east-1" },
  { postgresVersion: 18 },
  { state: "active" },
  { roles: neonFixture.roles },
])("rejects invalid or misleading pending fields %#", (change) => {
  expect(() => config.parseNeonTestRegistry(root({ ...pending(), ...change })))
    .toThrow("Invalid Neon test registry configuration");
});
it.each(["misty-resonance-03471928", "holy-fire-78012026"])("rejects unrelated project %s even in pending metadata", (id) => {
  const t = pending();
  t.project.id = id; t.branch.projectId = id; t.endpoint.projectId = id;
  expect(() => config.parseNeonTestRegistry(root(t))).toThrow("Invalid Neon test registry configuration");
});
it("rejects unknown root fields and duplicates, including active/pending identity collisions", () => {
  const { roles, ...identity } = neonFixture;
  const fixturePending = { ...pending(), ...identity, bootstrapOwner: roles.bootstrap };
  for (const bad of [
    { ...root(), schemaVersion: 2 }, { ...root(), approved: true },
    { ...root(), pendingTargets: [pending(), pending()] },
    { schemaVersion: 1, targets: [neonFixture], pendingTargets: [fixturePending] },
  ]) expect(() => config.parseNeonTestRegistry(bad)).toThrow("Invalid Neon test registry configuration");
});
it("never serializes raw registry validation input or error causes", () => {
  try { config.parseNeonTestRegistry({ ...root(), password: fixtureSecret }); }
  catch (error) {
    expect(String(error)).toBe("Error: Invalid Neon test registry configuration");
    expect(inspect(error, { showHidden: true })).not.toContain(fixtureSecret);
    expect((error as Error).cause).toBeUndefined();
    return;
  }
  throw Error("Expected refusal");
});
it("refuses the real pending target and every mismatch before any driver socket, including migration entrypoint", async () => {
  const clientConnect = vi.spyOn(Client.prototype, "connect").mockRejectedValue(Error("Unexpected socket"));
  const poolConnect = vi.spyOn(Pool.prototype, "connect").mockImplementation(() => { throw Error("Unexpected socket"); });
  const direct = fakeUrl();
  for (const [url, overrides] of [
    [direct, {}], [fakeUrl(true), {}],
    [direct, { TRAVEL_NEON_TEST_PROJECT_ID: "wrong-project-001" }],
    [direct, { TRAVEL_NEON_TEST_BRANCH_ID: "br-wrong-001" }],
    [direct, { TRAVEL_NEON_TEST_ENDPOINT_ID: "ep-wrong-001" }],
    [direct.replace(pending().endpoint.host, "foreign.neon.tech"), {}],
    [direct.replace("travel_test_foundation", "postgres"), {}],
    [direct.replace("terreno_bootstrap_owner", "travel_test_runtime"), {}],
    [direct.replace("sslmode=verify-full", "sslmode=disable"), {}],
    [direct, { TRAVEL_NEON_TEST_PROJECT_ID: "misty-resonance-03471928" }],
    [direct, { TRAVEL_NEON_TEST_PROJECT_ID: "holy-fire-78012026" }],
  ] as const) {
    for (const purpose of ["runtime", "test"] as const)
      expect(() => resolveDatabaseConnection(url, purpose, { ...env, ...overrides }))
        .toThrow("Neon test target is not approved");
  }
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  await expect(migrateDatabase(direct, "test")).rejects.toThrow("Neon test target is not approved");
  expect(clientConnect).not.toHaveBeenCalled();
  expect(poolConnect).not.toHaveBeenCalled();
});
