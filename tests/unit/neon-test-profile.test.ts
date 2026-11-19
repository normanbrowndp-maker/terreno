import { describe, expect, it } from "vitest";
import { inspect } from "node:util";
import { Client } from "pg";
import { parseNeonTestTarget } from "../../src/shared/db/neon-test-config";
import {
  assertNeonTestUrl,
  assertNeonDriverEnvironment,
} from "../../src/shared/db/neon-test";
import { resolveDatabaseConnection } from "../../src/shared/db/connection-profile";
import {
  fixtureSecret,
  neonEnv,
  neonFixture,
  neonRequest,
  neonUrl,
} from "../fixtures/neon-test";

describe("Neon test policy (fake metadata only)", () => {
  it("separates verified runtime pooled and migration direct operations", () => {
    const target = parseNeonTestTarget(neonFixture);
    expect(
      assertNeonTestUrl(neonUrl(), "runtime", target, neonRequest),
    ).toMatchObject({
      profile: "neon-test",
      kind: "pooled",
      username: "travel_test_runtime",
      database: "travel_test_foundation",
    });
    expect(
      assertNeonTestUrl(
        neonUrl("migrations"),
        "migrations",
        target,
        neonRequest,
      ),
    ).toMatchObject({ kind: "direct", username: "travel_test_migrator" });
    expect(Object.isFrozen(target)).toBe(true);
    expect(Object.isFrozen(target.endpoint)).toBe(true);
  });
  it.each(["projectId", "branchId", "endpointId"] as const)(
    "rejects a mismatched requested %s",
    (key) => {
      expect(() =>
        assertNeonTestUrl(
          neonUrl(),
          "runtime",
          parseNeonTestTarget(neonFixture),
          { ...neonRequest, [key]: "wrong-fixture" },
        ),
      ).toThrow("Unsafe Neon test connection");
    },
  );
  it.each([
    [
      "foreign endpoint",
      (u: URL) => {
        u.hostname = "ep-other-fixture-pooler.eu-central-1.aws.neon.tech";
      },
    ],
    [
      "lookalike host",
      (u: URL) => {
        u.hostname += ".attacker.test";
      },
    ],
    [
      "wrong database",
      (u: URL) => {
        u.pathname = "/production";
      },
    ],
    [
      "bootstrap runtime role",
      (u: URL) => {
        u.username = neonFixture.roles.bootstrap;
      },
    ],
    [
      "wrong port",
      (u: URL) => {
        u.port = "55433";
      },
    ],
    [
      "no TLS",
      (u: URL) => {
        u.search = "";
      },
    ],
    [
      "TLS downgrade",
      (u: URL) => {
        u.searchParams.set("sslmode", "disable");
      },
    ],
    [
      "weak TLS mode",
      (u: URL) => {
        u.searchParams.set("sslmode", "require");
      },
    ],
    [
      "duplicate TLS option",
      (u: URL) => {
        u.searchParams.append("sslmode", "disable");
      },
    ],
    [
      "routing override",
      (u: URL) => {
        u.searchParams.set("host", "other.test");
      },
    ],
    [
      "SSL override",
      (u: URL) => {
        u.searchParams.set("ssl", "false");
      },
    ],
    [
      "options override",
      (u: URL) => {
        u.searchParams.set("options", "-c role=neondb_owner");
      },
    ],
    [
      "URL fragment",
      (u: URL) => {
        u.hash = "#unexpected";
      },
    ],
    [
      "invalid encoded password",
      (u: URL) => {
        u.password = "%ZZ";
      },
    ],
  ] as const)("rejects %s without exposing URL", (_, change) => {
    const url = new URL(neonUrl());
    change(url);
    try {
      assertNeonTestUrl(
        url.toString(),
        "runtime",
        parseNeonTestTarget(neonFixture),
        neonRequest,
      );
    } catch (error) {
      expect(String(error)).toBe("Error: Unsafe Neon test connection");
      expect(inspect(error)).not.toContain(fixtureSecret);
      expect(JSON.stringify(error)).not.toContain(url.toString());
      return;
    }
    throw Error("Expected refusal");
  });
  it("rejects direct runtime, pooled migrations, wrong operation and non-bootstrap stage", () => {
    const t = parseNeonTestTarget(neonFixture);
    expect(() =>
      assertNeonTestUrl(neonUrl("migrations"), "runtime", t, neonRequest),
    ).toThrow();
    expect(() =>
      assertNeonTestUrl(
        neonUrl().replace("-pooler.", "."),
        "runtime",
        t,
        neonRequest,
      ),
    ).toThrow();
    const pooled = neonUrl().replace(
      "travel_test_runtime",
      "travel_test_migrator",
    );
    expect(() =>
      assertNeonTestUrl(pooled, "migrations", t, neonRequest),
    ).toThrow();
    expect(() =>
      assertNeonTestUrl(neonUrl(), "other" as "runtime", t, neonRequest),
    ).toThrow();
    expect(() =>
      assertNeonTestUrl(neonUrl("bootstrap"), "bootstrap", t, neonRequest),
    ).toThrow();
    expect(
      assertNeonTestUrl(neonUrl("bootstrap"), "bootstrap", t, {
        ...neonRequest,
        bootstrapStage: true,
      }),
    ).toMatchObject({ kind: "direct", operation: "bootstrap" });
  });
  it("refuses driver environment routing and global TLS validation downgrade", () => {
    expect(() => assertNeonDriverEnvironment({})).not.toThrow();
    for (const env of [
      { PGPORT: "55433" },
      { PGHOST: "attacker.test" },
      { PGPASSWORD: fixtureSecret },
      { PGSSLMODE: "disable" },
      { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    ])
      expect(() => assertNeonDriverEnvironment(env)).toThrow(
        "Unsafe Neon driver environment",
      );
  });
  it.each(["misty-resonance-03471928", "holy-fire-78012026"])(
    "refuses known unrelated project %s even with a misleading target name",
    (id) => {
      const f = structuredClone(neonFixture);
      f.project.id = id;
      f.branch.projectId = id;
      f.endpoint.projectId = id;
      expect(() => parseNeonTestTarget(f)).toThrow(
        "Invalid Neon test target configuration",
      );
    },
  );
  it("refuses inconsistent management metadata and unknown fields", () => {
    for (const bad of [
      {
        ...neonFixture,
        branch: { ...neonFixture.branch, projectId: "other-project" },
      },
      {
        ...neonFixture,
        endpoint: { ...neonFixture.endpoint, branchId: "br-other" },
      },
      { ...neonFixture, project: { ...neonFixture.project, name: "gloomi" } },
      { ...neonFixture, connectionString: neonUrl() },
    ])
      expect(() => parseNeonTestTarget(bad)).toThrow(
        "Invalid Neon test target configuration",
      );
  });
  it("uses installed pg verification defaults without overriding TLS validation", () => {
    const t = parseNeonTestTarget(neonFixture);
    assertNeonTestUrl(neonUrl(), "runtime", t, neonRequest);
    const client = new Client({ connectionString: neonUrl() });
    expect(client.ssl).toEqual({}); // sslmode=verify-full; Node TLS validation defaults, no override.
  });
});

describe("production resolver cannot authorize fictional or undeclared cloud targets", () => {
  it("does not serialize invalid local identity input as trusted public metadata", () => {
    const raw = `postgresql://travel_runtime:${fixtureSecret}@127.0.0.1:55433/travel_dev`;
    expect(() =>
      resolveDatabaseConnection(raw, "runtime", { TRAVEL_DATABASE_ID: raw }),
    ).toThrow("Project database identity is required");
  });
  it("keeps the registry empty and rejects opt-in without an approved target", () => {
    expect(() =>
      resolveDatabaseConnection(neonUrl(), "runtime", neonEnv),
    ).toThrow("Neon test target is not approved");
    expect(() =>
      resolveDatabaseConnection(neonUrl("migrations"), "test", neonEnv),
    ).toThrow("Neon test target is not approved");
  });
  it("does not infer a cloud profile from URL and rejects unknown profiles", () => {
    expect(() => resolveDatabaseConnection(neonUrl(), "runtime", {})).toThrow(
      "Unsafe database target",
    );
    expect(() =>
      resolveDatabaseConnection(neonUrl(), "runtime", {
        ...neonEnv,
        TRAVEL_DATABASE_PROFILE: "auto",
      }),
    ).toThrow("Unsafe database profile");
    for (const purpose of ["development", "restore"] as const)
      expect(() =>
        resolveDatabaseConnection(neonUrl("migrations"), purpose, neonEnv),
      ).toThrow();
  });
  it("preserves the exact local target policy and keeps credentials out of generic serialization", () => {
    const raw = `postgresql://travel_runtime:${fixtureSecret}@127.0.0.1:55433/travel_dev`;
    const connection = resolveDatabaseConnection(raw, "runtime", {});
    expect(connection.target).toMatchObject({
      profile: "local",
      database: "travel_dev",
      username: "travel_runtime",
    });
    expect(connection.withConnectionString((value) => value === raw)).toBe(
      true,
    );
    for (const serialized of [
      JSON.stringify(connection),
      String(connection),
      inspect(connection),
      inspect(connection, {
        showHidden: true,
        customInspect: false,
        depth: null,
      }),
      JSON.stringify({ ...connection }),
      JSON.stringify(structuredClone(connection)),
    ]) {
      expect(serialized).not.toContain(fixtureSecret);
      expect(serialized).not.toContain("postgresql://");
    }
    expect(() =>
      resolveDatabaseConnection(raw + "?sslmode=verify-full", "runtime", {}),
    ).toThrow("Unsafe database target");
  });
});
