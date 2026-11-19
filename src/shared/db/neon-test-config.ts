import { z } from "zod";
import registry from "./neon-test-targets.json";

const projectId = z.string().regex(/^[a-z][a-z0-9-]{4,127}$/);
const targetSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    project: z
      .strictObject({
        id: projectId,
        name: z.literal("terreno-test"),
        organizationId: z.string().regex(/^org-[a-z0-9-]+$/),
      })
      .readonly(),
    branch: z
      .strictObject({ id: z.string().regex(/^br-[a-z0-9-]+$/), projectId })
      .readonly(),
    endpoint: z
      .strictObject({
        id: z.string().regex(/^ep-[a-z0-9-]+$/),
        projectId,
        branchId: z.string().regex(/^br-[a-z0-9-]+$/),
        host: z.string().regex(/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/),
      })
      .readonly(),
    database: z.literal("travel_test_foundation"),
    roles: z
      .strictObject({
        runtime: z.literal("travel_test_runtime"),
        migrations: z.literal("travel_test_migrator"),
        bootstrap: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/),
      })
      .readonly(),
    verifiedAt: z.iso.datetime(),
    verificationSource: z.literal("neon-management-metadata"),
  })
  .refine(
    (target) =>
      target.branch.projectId === target.project.id &&
      target.endpoint.projectId === target.project.id &&
      target.endpoint.branchId === target.branch.id &&
      target.endpoint.host.startsWith(`${target.endpoint.id}.`) &&
      !target.endpoint.id.endsWith("-pooler") &&
      !["misty-resonance-03471928", "holy-fire-78012026"].includes(
        target.project.id,
      ) &&
      ![
        target.roles.runtime,
        target.roles.migrations,
        "neon_superuser",
      ].includes(target.roles.bootstrap),
  )
  .readonly();

export type NeonTestTarget = z.infer<typeof targetSchema>;
export interface NeonTestRequest {
  projectId: string;
  branchId: string;
  endpointId: string;
  bootstrapStage?: boolean;
}

/** Structural validation is not approval. Only the reviewed registry may authorize production callers. */
export function parseNeonTestTarget(input: unknown): NeonTestTarget {
  try {
    return targetSchema.parse(input);
  } catch {
    throw new Error("Invalid Neon test target configuration");
  }
}

export function requestNeonTestTarget(
  env: Record<string, string | undefined>,
): NeonTestRequest {
  return {
    projectId: env.TRAVEL_NEON_TEST_PROJECT_ID ?? "",
    branchId: env.TRAVEL_NEON_TEST_BRANCH_ID ?? "",
    endpointId: env.TRAVEL_NEON_TEST_ENDPOINT_ID ?? "",
  };
}

/** No environment JSON, endpoint discovery, or automatic enrollment. Empty until explicitly reviewed. */
export function approvedNeonTestTarget(
  request: NeonTestRequest,
): NeonTestTarget {
  try {
    if (registry.schemaVersion !== 1 || !Array.isArray(registry.targets))
      throw new Error();
    const targets: readonly unknown[] = registry.targets;
    const matching = targets
      .map(parseNeonTestTarget)
      .filter(
        (target) =>
          target.project.id === request.projectId &&
          target.branch.id === request.branchId &&
          target.endpoint.id === request.endpointId,
      );
    if (matching.length !== 1) throw new Error();
    return matching[0]!;
  } catch {
    throw new Error("Neon test target is not approved");
  }
}
