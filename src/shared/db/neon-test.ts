import {
  parseNeonTestTarget,
  type NeonTestRequest,
  type NeonTestTarget,
} from "./neon-test-config";

export type NeonOperation = "runtime" | "migrations" | "bootstrap";

export function assertNeonDriverEnvironment(
  env: Record<string, string | undefined>,
): void {
  if (
    Object.keys(env).some(
      (key) => /^PG/i.test(key) && env[key] !== undefined,
    ) ||
    (env.NODE_TLS_REJECT_UNAUTHORIZED !== undefined &&
      env.NODE_TLS_REJECT_UNAUTHORIZED !== "1")
  )
    throw new Error("Unsafe Neon driver environment");
}

/** A pure validator: never creates a socket or authorizes enrollment. */
export function assertNeonTestUrl(
  value: string,
  operation: NeonOperation,
  approved: NeonTestTarget,
  request: NeonTestRequest,
) {
  try {
    const target = parseNeonTestTarget(approved);
    if (
      !request.projectId ||
      request.projectId !== target.project.id ||
      request.branchId !== target.branch.id ||
      request.endpointId !== target.endpoint.id
    )
      throw new Error();
    if (
      !["runtime", "migrations", "bootstrap"].includes(operation) ||
      (operation === "bootstrap" && request.bootstrapStage !== true)
    )
      throw new Error();
    if (
      typeof value !== "string" ||
      value.length > 8192 ||
      /[\s\u0000-\u001f\u007f\\]/u.test(value)
    )
      throw new Error();
    const url = new URL(value);
    if (
      !decodeURIComponent(url.password) ||
      /[\u0000-\u001f\u007f]/u.test(decodeURIComponent(url.password))
    )
      throw new Error();
    const pooledHost = target.endpoint.host.replace(
      `${target.endpoint.id}.`,
      `${target.endpoint.id}-pooler.`,
    );
    const host = operation === "runtime" ? pooledHost : target.endpoint.host;
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== host ||
      (url.port !== "" && url.port !== "5432") ||
      url.hash ||
      !url.password ||
      decodeURIComponent(url.username) !== target.roles[operation] ||
      decodeURIComponent(url.pathname.slice(1)) !== target.database
    )
      throw new Error();
    // Reject duplicates, routing/session overrides, local certificate paths and weaker TLS modes.
    if (
      url.searchParams.size !== 1 ||
      url.searchParams.get("sslmode") !== "verify-full" ||
      url.searchParams.getAll("sslmode").length !== 1
    )
      throw new Error();
    return Object.freeze({
      profile: "neon-test" as const,
      purpose: "test" as const,
      operation,
      kind: operation === "runtime" ? ("pooled" as const) : ("direct" as const),
      organizationId: target.project.organizationId,
      projectId: target.project.id,
      branchId: target.branch.id,
      endpointId: target.endpoint.id,
      host,
      database: target.database,
      username: target.roles[operation],
      port: 5432,
      verifiedAt: target.verifiedAt,
    });
  } catch {
    throw new Error("Unsafe Neon test connection");
  }
}
export type NeonDatabaseTarget = ReturnType<typeof assertNeonTestUrl>;
