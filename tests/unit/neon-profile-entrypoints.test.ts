import { afterEach, expect, it, vi } from "vitest";
import { Client } from "pg";
import { execFileSync } from "node:child_process";
import { resolveDatabaseConnection } from "../../src/shared/db/connection-profile";
import { migrateDatabase } from "../../src/shared/db/migrate";
import {
  fixtureSecret,
  neonEnv,
  neonFixture,
  neonUrl,
} from "../fixtures/neon-test";

// Test-only approval, never written into src/shared/db/neon-test-targets.json.
vi.mock("../../src/shared/db/neon-test-targets.json", async () => ({
  default: {
    schemaVersion: 1,
    targets: [(await import("../fixtures/neon-test")).neonFixture],
  },
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("routes an explicitly selected test-only approved fixture to the correct driver boundary", () => {
  for (const purpose of ["runtime", "test"] as const) {
    const raw = neonUrl(purpose === "runtime" ? "runtime" : "migrations");
    const c = resolveDatabaseConnection(raw, purpose, neonEnv);
    expect(c.target).toMatchObject({
      profile: "neon-test",
      projectId: neonFixture.project.id,
      kind: purpose === "runtime" ? "pooled" : "direct",
    });
    expect(
      c.withConnectionString(
        (value) => new Client({ connectionString: value }).ssl,
      ),
    ).toEqual({});
    expect(JSON.stringify(c)).not.toContain(fixtureSecret);
  }
});
it("refuses wrong or pooled migration URLs before the driver can connect", async () => {
  for (const [key, value] of Object.entries(neonEnv)) vi.stubEnv(key, value);
  const connect = vi
    .spyOn(Client.prototype, "connect")
    .mockRejectedValue(new Error("Unexpected socket"));
  for (const bad of [
    neonUrl().replace("travel_test_runtime", "travel_test_migrator"),
    neonUrl("migrations").replace("travel_test_foundation", "postgres"),
    neonUrl("migrations").replace("sslmode=verify-full", "sslmode=disable"),
  ])
    await expect(migrateDatabase(bad, "test")).rejects.toThrow(
      "Unsafe Neon test connection",
    );
  vi.stubEnv("TRAVEL_NEON_TEST_PROJECT_ID", "foreign-fixture-project");
  await expect(migrateDatabase(neonUrl("migrations"), "test")).rejects.toThrow(
    "Neon test target is not approved",
  );
  expect(connect).not.toHaveBeenCalled();
});
it("redacts URL and password from the actual failing seed CLI output", () => {
  try {
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/seed-italy.ts", "--test"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...neonEnv,
          TEST_DATABASE_URL: neonUrl("migrations"),
        },
        encoding: "utf8",
        stdio: "pipe",
        timeout: 15000,
        windowsHide: true,
      },
    );
  } catch (error) {
    const result = error as { status: number; stdout: string; stderr: string };
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Demo seed failed");
    const output = `${result.stdout}${result.stderr}`;
    expect(output).not.toContain(fixtureSecret);
    expect(output).not.toContain(neonUrl("migrations"));
    expect(output).not.toContain("postgresql://");
    return;
  }
  throw Error("Expected CLI refusal");
});
