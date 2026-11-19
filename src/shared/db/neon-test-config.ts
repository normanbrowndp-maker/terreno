import { z } from "zod";
import registry from "./neon-test-targets.json";

const projectId = z.string().regex(/^[a-z][a-z0-9-]{4,127}$/);
const identityFields = {
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
  verifiedAt: z.iso.datetime(),
  verificationSource: z.literal("neon-management-metadata"),
} as const;

function matchingIdentity(target: z.infer<z.ZodObject<typeof identityFields>>) {
  return target.branch.projectId === target.project.id &&
    target.endpoint.projectId === target.project.id &&
    target.endpoint.branchId === target.branch.id &&
    target.endpoint.host.startsWith(`${target.endpoint.id}.`) &&
    !target.endpoint.id.endsWith("-pooler") &&
    !["misty-resonance-03471928", "holy-fire-78012026"].includes(target.project.id);
}

const targetSchema = z
  .strictObject({
    ...identityFields,
    roles: z.strictObject({
      runtime: z.literal("travel_test_runtime"),
      migrations: z.literal("travel_test_migrator"),
      bootstrap: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/),
    }).readonly(),
  })
  .refine(
    (target) =>
      matchingIdentity(target) &&
      ![
        target.roles.runtime,
        target.roles.migrations,
        "neon_superuser",
      ].includes(target.roles.bootstrap),
  )
  .readonly();

// Discovery is not approval: no invented role existence, privilege or SQL-identity evidence.
const pendingTargetSchema = z.strictObject({
  ...identityFields,
  state: z.literal("pending-bootstrap"),
  bootstrapOwner: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/).refine(
    (role) => !["travel_test_runtime", "travel_test_migrator", "neon_superuser"].includes(role),
  ),
  region: z.literal("aws-eu-central-1"),
  postgresVersion: z.literal(17),
}).refine(matchingIdentity).readonly();

const registrySchema = z.strictObject({
  schemaVersion: z.literal(1),
  targets: z.array(targetSchema).readonly(),
  pendingTargets: z.array(pendingTargetSchema).default([]).readonly(),
}).refine((value) => {
  const endpoints = [...value.targets, ...value.pendingTargets].map((t) => t.endpoint.id);
  return new Set(endpoints).size === endpoints.length;
}).readonly();

/** Validate the entire file, but never treat pending metadata as connection authorization. */
export function parseNeonTestRegistry(input: unknown) {
  try {
    return registrySchema.parse(input);
  } catch {
    throw new Error("Invalid Neon test registry configuration");
  }
}

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

/** No environment JSON or automatic promotion. Only active, reviewed targets can authorize callers. */
export function approvedNeonTestTarget(
  request: NeonTestRequest,
): NeonTestTarget {
  try {
    const matching = parseNeonTestRegistry(registry).targets
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
