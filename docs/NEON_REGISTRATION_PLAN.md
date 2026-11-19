# TRAVEL-023 — inactive Neon metadata registration plan

> **Execution:** writing-plans → executing-plans inline, TDD, one final fresh-context security review. The owner's TRAVEL-023 request authorizes implementation; no extra design/implementation approval is needed. No cloud SQL, credentials, resource writes, env changes or push.

**Goal:** Persist verified terreno-test management metadata without enabling any real cloud connection or inventing runtime/migration roles.

**Architecture:** Keep active `targets` empty. Add `pendingTargets` with strict readonly management-only records (`state: pending-bootstrap`, actual bootstrapOwner, region/PG17); no runtime/migration role or SQL proof fields. A strict registry parser validates both lists, rejects unknown/duplicate records and only exposes active `targets` to the existing resolver. Legacy active fixture schema and URL/SQL guards remain intact.

**Stack:** Existing TypeScript/Zod/Vitest/pg; no dependencies. **Spec:** owner's TRAVEL-023 instructions and NEON_TEST_PROFILE/NEON_TEST_PLAN/NEON_PROJECT_CREATION; root/endpoint/database metadata reread on2026-11-19 via Нурман only.

## Task contract

- **Goal:** Accurate non-active registration and an explicit safe bootstrap boundary.
- **Plan:** verify context/metadata → checkpoint → failing registry/refusal tests → minimal parser+pending record → strict/lint/unit/local regressions → review → report and local commit.
- **Dependencies:** TRAVEL-020 guards and TRAVEL-022 project; management metadata access only.
- **Acceptance:** Exact known project/branch/endpoint/host/DB/owner/org/region/PG recorded; no assumed role privilege; explicit opt-in still refuses before driver connect; unrelated projects blocked; local guards, TLS and pooled/direct checks remain; env/six migrations unchanged.
- **Tests:** New pending registry validation/unknown-field/duplicate/promotion/redaction tests; real-entry refusal and pre-connect driver spies with fake credentials; existing URL/TLS/serialization/local tests; TypeScript/ESLint/architecture/secrets/docs and local integration regression as applicable. Never run cloud SQL.
- **Risks:** Treating discovered metadata as approval; malicious/partial registry; a test fixture accidentally entering production; stale provider IDs; bootstrap ownership transfer vs marker ACL; cloud smoke remains unavailable by scope.
- **Status:** Complete within TRAVEL-023: one pending metadata record, no active target; baseline2ec5398. Final140 unit/24 local integration/build/gates PASS; review finding fixed in one RED→GREEN correction pass. No push or cloud SQL.

## Global constraints / review focus

1. Pending record must never enter `targets` or be implicitly promoted by env/status/role values.
2. Root/entry strict validation must reject malformed/unknown or duplicate identities with redacted constant errors.
3. Both active legacy test fixtures and local default routing must keep working; TLS/direct/pooled remain strict.
4. Real target wrong IDs/host/database/role and known gloomi/sidequest targets must refuse before socket creation.
5. No metadata fetch whose response can include passwords, no secret URLs in registry/docs, no cloud or environment mutation.

## Task 1 — registry, tests, report (one reviewable deliverable)

Files: modify src/shared/db/neon-test-config.ts and neon-test-targets.json; create tests/unit/neon-pending-registry.test.ts; update docs with results/bootstrap plan and current scope. Existing connection-profile/neon-test/profile-identity/migration/seed logic remains unless a reproduced regression requires correction.

Interface: export `parseNeonTestRegistry(input: unknown)` → readonly schemaVersion1/targets/pendingTargets; pending records share identity validation, add pending-bootstrap/bootstrapOwner/region/postgresVersion; old `parseNeonTestTarget` remains the active-only contract. `approvedNeonTestTarget(request)` reads validated `.targets` only. `pendingTargets` defaults to[] for legacy test fixtures.

- [x] Write tests for real pending metadata and the parser, run RED (new contract absent).
- [x] Implement strict shared identity/root/pending schemas and confirmed JSON; run GREEN.
- [x] Run npm run lint, npm run typecheck, npm run test:unit, architecture/secrets/docs; relevant local integration regression. Expected exit0; no cloud.
- [x] One fresh-context review, fix Important/Critical once with RED→GREEN if any; document actual checks and blockers, local commit, no push.

## Execution rulings

- Ruling: Work in existing clean feature branch/workspace so the owner's open files and portable DB paths remain valid; do not create a worktree without the skill's requested consent. Cost: concurrent changes must be detected with Git checks.
- Ruling: Use the owner's explicitly allowed inactive option rather than fabricate role existence or request redundant approval. Cost: real Neon target remains unavailable until separate bootstrap/approval.
- Ruling: Keep this branch local without merge/push; current owner prohibits publication. Cost: new commits have no remote backup yet.
- Pre-flight: one task, shared registry/parser interface used by resolver and test-only approval mocks; pending list is optional only at the root for backward compatibility, not an approval flag.
- Final: fixed malformed DNS hostname acceptance — five DNS regression cases RED5 FAIL/19 PASS → GREEN24 PASS; complete suite140 unit/24 local integration/build/gates PASS. No Critical/Minor/declined items, no second review. Actual metadata compared programmatically against the registry: PASS.
- Tooling: Git Bash not available for helper scripts; equivalent committed diff package and ledger prepared with native Python/git. Intermediate Windows sandbox tsx ENOMEM is documented; unchanged tests pass outside sandbox.
