import { inspect } from "node:util";
import { assertLocalDatabaseTarget, type DatabasePurpose } from "./target";
import {
  approvedNeonTestTarget,
  requestNeonTestTarget,
} from "./neon-test-config";
import {
  assertNeonTestUrl,
  assertNeonDriverEnvironment,
  type NeonDatabaseTarget,
} from "./neon-test";

type LocalTarget = Readonly<
  ReturnType<typeof assertLocalDatabaseTarget> & {
    profile: "local";
    purpose: DatabasePurpose;
    localIdentity: string | undefined;
  }
>;
export type DatabaseTarget = LocalTarget | NeonDatabaseTarget;

class GuardedConnection {
  readonly target: DatabaseTarget;
  #connectionString: string;
  constructor(value: string, target: DatabaseTarget) {
    this.#connectionString = value;
    this.target = target;
    Object.freeze(this);
  }
  /** The only unwrapping point; callers pass this directly to a driver, never to telemetry. */
  withConnectionString<T>(consume: (value: string) => T): T {
    return consume(this.#connectionString);
  }
  toJSON() {
    return { target: this.target, connection: "[redacted]" };
  }
  toString() {
    return "[GuardedDatabaseConnection]";
  }
  [inspect.custom]() {
    return this.toJSON();
  }
}

export function resolveDatabaseConnection(
  value: string,
  purpose: DatabasePurpose,
  env: Record<string, string | undefined> = process.env,
) {
  const profile = env.TRAVEL_DATABASE_PROFILE ?? "local";
  if (profile === "local") {
    if (
      env.TRAVEL_DATABASE_ID !== undefined &&
      !/^travel_[a-z0-9_]+$/.test(env.TRAVEL_DATABASE_ID)
    )
      throw new Error("Project database identity is required");
    const target = Object.freeze({
      ...assertLocalDatabaseTarget(value, purpose),
      profile: "local" as const,
      purpose,
      localIdentity: env.TRAVEL_DATABASE_ID,
    });
    return new GuardedConnection(value, target);
  }
  if (profile !== "neon-test") throw new Error("Unsafe database profile");
  if (purpose !== "runtime" && purpose !== "test")
    throw new Error("Neon test profile cannot serve development or restore");
  assertNeonDriverEnvironment(env);
  const request = requestNeonTestTarget(env);
  const approved = approvedNeonTestTarget(request);
  const target = assertNeonTestUrl(
    value,
    purpose === "runtime" ? "runtime" : "migrations",
    approved,
    request,
  );
  return new GuardedConnection(value, target);
}
export type DatabaseConnection = ReturnType<typeof resolveDatabaseConnection>;
