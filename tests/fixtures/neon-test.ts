/** Completely fictitious metadata, never enrolled in the production registry. No network calls. */
export const neonFixture = {
  schemaVersion: 1,
  project: {
    id: "fixture-terreno-project-001",
    name: "terreno-test",
    organizationId: "org-fixture-terreno-001",
  },
  branch: {
    id: "br-fixture-terreno-001",
    projectId: "fixture-terreno-project-001",
  },
  endpoint: {
    id: "ep-fixture-terreno-001",
    projectId: "fixture-terreno-project-001",
    branchId: "br-fixture-terreno-001",
    host: "ep-fixture-terreno-001.eu-central-1.aws.neon.tech",
  },
  database: "travel_test_foundation",
  roles: {
    runtime: "travel_test_runtime",
    migrations: "travel_test_migrator",
    bootstrap: "fixture_bootstrap_owner",
  },
  verifiedAt: "2026-11-19T00:00:00Z",
  verificationSource: "neon-management-metadata",
};
export const neonRequest = {
  projectId: neonFixture.project.id,
  branchId: neonFixture.branch.id,
  endpointId: neonFixture.endpoint.id,
};
export const neonEnv = {
  TRAVEL_DATABASE_PROFILE: "neon-test",
  TRAVEL_NEON_TEST_PROJECT_ID: neonRequest.projectId,
  TRAVEL_NEON_TEST_BRANCH_ID: neonRequest.branchId,
  TRAVEL_NEON_TEST_ENDPOINT_ID: neonRequest.endpointId,
};
// This is a deliberately fake test password, not a credential.
export const fixtureSecret = "fixture-sensitive-value";
export function neonUrl(
  operation: "runtime" | "migrations" | "bootstrap" = "runtime",
) {
  const host =
    operation === "runtime"
      ? neonFixture.endpoint.host.replace(".eu-central", "-pooler.eu-central")
      : neonFixture.endpoint.host;
  return `postgresql://${neonFixture.roles[operation]}:${fixtureSecret}@${host}/${neonFixture.database}?sslmode=verify-full`;
}
