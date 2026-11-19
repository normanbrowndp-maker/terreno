import manifest from "../../db/bootstrap/neon-test/manifest.json";
import registry from "../../src/shared/db/neon-test-targets.json";
import { parseNeonTestRegistry } from "../../src/shared/db/neon-test-config";
import { assertNeonDriverEnvironment } from "../../src/shared/db/neon-test";

interface Metadata {
  organization: { id: string; name: string; plan: string };
  project: { id: string; name: string; org_id: string; region_id: string; pg_version: number };
  branch: { id: string; name: string; project_id: string };
  endpoint: { id: string; project_id: string; branch_id: string; host: string; region_id: string };
  database: { name: string; branch_id: string; owner_name: string };
}

/** Pure future-plan validation. No driver, sockets, SQL, credential retrieval or enrollment. */
export function assertBootstrapPlan(metadata: Metadata, value: string, env: Record<string, string | undefined>, intent: "prepare" | "inspect-recovery" = "prepare") {
  try {
    assertNeonDriverEnvironment(env);
    const pending = parseNeonTestRegistry(registry).pendingTargets;
    if (pending.length !== 1) throw Error();
    const t = pending[0]!, m = manifest;
    if (t.project.id !== m.projectId || t.branch.id !== m.branchId || t.endpoint.id !== m.endpointId || t.endpoint.host !== m.host || t.database !== m.database || t.bootstrapOwner !== m.bootstrapOwner || t.region !== m.region || t.postgresVersion !== m.postgresVersion || t.project.organizationId !== m.organizationId) throw Error();
    const { organization: o, project: p, branch: b, endpoint: e, database: d } = metadata;
    if (o.id !== m.organizationId || o.name !== "norman" || o.plan !== "free" || p.org_id !== o.id || p.id !== m.projectId || p.name !== "terreno-test" || p.region_id !== m.region || p.pg_version !== 17 || b.id !== m.branchId || b.name !== "test" || b.project_id !== p.id || e.id !== m.endpointId || e.project_id !== p.id || e.branch_id !== b.id || e.host !== m.host || e.region_id !== m.region || d.name !== m.database || d.branch_id !== b.id || !(d.owner_name === m.bootstrapOwner || (intent === "inspect-recovery" && d.owner_name === "travel_test_migrator"))) throw Error();
    if (typeof value !== "string" || value.length > 8192 || /[\s\u0000-\u001f\u007f\\]/u.test(value)) throw Error();
    const u = new URL(value);
    if (!["postgres:", "postgresql:"].includes(u.protocol) || u.hostname !== m.host || (u.port !== "" && u.port !== "5432") || decodeURIComponent(u.pathname.slice(1)) !== m.database || decodeURIComponent(u.username) !== m.bootstrapOwner || !decodeURIComponent(u.password) || /[\u0000-\u001f\u007f]/u.test(decodeURIComponent(u.password)) || u.hash || u.searchParams.size !== 1 || u.searchParams.get("sslmode") !== "verify-full") throw Error();
    return Object.freeze({ intent, projectId: m.projectId, branchId: m.branchId, endpointId: m.endpointId, host: m.host, database: m.database, role: m.bootstrapOwner, kind: "direct" as const, tls: "verify-full" as const });
  } catch {
    throw Error("Unsafe Neon bootstrap plan");
  }
}
