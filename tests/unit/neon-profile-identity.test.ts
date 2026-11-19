import { expect, it, vi } from "vitest";
import type { CatalogDatabase } from "../../src/shared/db/catalog-database";
import { assertProfileIdentity } from "../../src/shared/db/profile-identity";
import { assertNeonTestUrl } from "../../src/shared/db/neon-test";
import { parseNeonTestTarget } from "../../src/shared/db/neon-test-config";
import { resolveDatabaseConnection } from "../../src/shared/db/connection-profile";
import {
  fixtureSecret,
  neonFixture,
  neonRequest,
  neonUrl,
} from "../fixtures/neon-test";

const target = () =>
  assertNeonTestUrl(
    neonUrl(),
    "runtime",
    parseNeonTestTarget(neonFixture),
    neonRequest,
  );
const row = () => ({
  project_id: neonRequest.projectId,
  branch_id: neonRequest.branchId,
  endpoint_id: neonRequest.endpointId,
  database_name: neonFixture.database,
  purpose: "test",
  actual_database: neonFixture.database,
  actual_role: neonFixture.roles.runtime,
  session_role: neonFixture.roles.runtime,
  superuser: false,
  create_db: false,
  create_role: false,
  replication: false,
  bypass_rls: false,
  neon_admin: false,
  database_owner: false,
  schema_create: false,
  can_write: false,
});
function database(rows: unknown[], rowCount = rows.length) {
  return {
    query: vi.fn().mockResolvedValue({ rows, rowCount }),
  } as unknown as CatalogDatabase;
}

it("verifies actual database/login, marker IDs and absence of admin/write rights for runtime", async () => {
  await expect(
    assertProfileIdentity(database([row()]), target(), "test"),
  ).resolves.toBeUndefined();
  const migration = {
    ...row(),
    actual_role: neonFixture.roles.migrations,
    session_role: neonFixture.roles.migrations,
    database_owner: true,
    schema_create: true,
    can_write: true,
  };
  await expect(
    assertProfileIdentity(
      database([migration]),
      assertNeonTestUrl(
        neonUrl("migrations"),
        "migrations",
        parseNeonTestTarget(neonFixture),
        neonRequest,
      ),
      "test",
    ),
  ).resolves.toBeUndefined();
});
it.each([
  "project_id",
  "branch_id",
  "endpoint_id",
  "database_name",
  "purpose",
  "actual_database",
  "actual_role",
  "session_role",
])("rejects mismatched SQL identity %s", async (key) => {
  await expect(
    assertProfileIdentity(
      database([{ ...row(), [key]: "wrong" }]),
      target(),
      "test",
    ),
  ).rejects.toThrow("Project database identity mismatch");
});
it.each([
  "superuser",
  "create_db",
  "create_role",
  "replication",
  "bypass_rls",
  "neon_admin",
  "database_owner",
  "schema_create",
  "can_write",
])("rejects elevated runtime permission %s", async (key) => {
  await expect(
    assertProfileIdentity(
      database([{ ...row(), [key]: true }]),
      target(),
      "test",
    ),
  ).rejects.toThrow("Project database identity mismatch");
});
it("rejects missing/duplicate markers, development purpose and leaked driver failures", async () => {
  for (const records of [[], [row(), row()]])
    await expect(
      assertProfileIdentity(database(records), target(), "test"),
    ).rejects.toThrow("Project database identity mismatch");
  await expect(
    assertProfileIdentity(database([row()]), target(), "development"),
  ).rejects.toThrow("Project database identity mismatch");
  const db = {
    query: vi
      .fn()
      .mockRejectedValue(
        new Error(`driver failure ${neonUrl()} ${fixtureSecret}`),
      ),
  } as unknown as CatalogDatabase;
  try {
    await assertProfileIdentity(db, target(), "test");
  } catch (error) {
    expect(String(error)).toBe("Error: Project database identity mismatch");
    expect(JSON.stringify(error)).not.toContain(fixtureSecret);
    expect((error as Error).cause).toBeUndefined();
    return;
  }
  throw Error("Expected refusal");
});
it("preserves the local physical cluster identity check", async () => {
  const c = resolveDatabaseConnection(
    "postgresql://travel_test_migrator:local-example@127.0.0.1:55433/travel_test_foundation",
    "test",
    { TRAVEL_DATABASE_ID: "travel_fixture_owned" },
  );
  await expect(
    assertProfileIdentity(
      database([
        {
          project_id: "travel_fixture_owned",
          purpose: "test",
          cluster_name: "travel_fixture_owned",
        },
      ]),
      c.target,
      "test",
    ),
  ).resolves.toBeUndefined();
  await expect(
    assertProfileIdentity(
      database([
        {
          project_id: "travel_fixture_owned",
          purpose: "test",
          cluster_name: "another_cluster",
        },
      ]),
      c.target,
      "test",
    ),
  ).rejects.toThrow();
});
