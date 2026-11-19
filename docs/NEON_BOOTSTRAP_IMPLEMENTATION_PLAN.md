# TRAVEL-024 — reviewed bootstrap SQL preparation

> Execute inline with executing-plans/TDD and one final independent review. Owner authorizes local preparation/tests only. No cloud SQL, credentials retrieval, role/extension/ownership changes in Neon, activation, env changes, provider connections or push.

**Goal:** Produce reviewable PostgreSQL17 bootstrap artifacts, prove their local SQL behavior, and document future approval/smoke/recovery gates.

**Architecture:** Three SQL phases (read-only inspection, atomic guarded preparation, ACL verification); no executable cloud apply CLI. A pure transport/metadata policy validates exact pending tuple and direct verify-full using fake URLs in tests. Roles stay NOLOGIN/password-free. A fresh temporary local cluster uses existing portable PG/PostGIS binaries; no current local DB/role is adopted or modified. Existing six migrations and all application guards remain unchanged.

**Stack:** Existing TS/Zod/pg/Vitest/portable PG17/PostGIS; no installs. **Spec:** owner TRAVEL-024 request, NEON_BOOTSTRAP_PLAN, NEON_TARGET_REGISTRATION, six migrations and profile-identity.ts. Baseline a7331e8, clean feature/neon-test-profile; prior local work already committed.

## Contract

- **Goal/plan:** metadata recheck → checkpoint → failing policy/static/rehearsal tests → SQL and pure policy → ephemeral local rehearsal plus regression → review/fix once → report and local commit.
- **Dependencies:** real pending tuple confirmed via Нурман only; existing portable binaries, no cloud secret needed.
- **Acceptance:** Exact project/branch/endpoint/host/DB/org/region/PG17 validated; direct TLS bootstrap distinct from pooled runtime; least-privilege NOLOGIN roles, conditional ownership transfer, bootstrap-owned singleton marker; ACL/column/sequence/SECURITY DEFINER checks; repeat/partial cases fail closed or recover atomically; immutable six migrations compatible; registry/env unchanged.
- **Tests:** static manifest/SQL guard checks, pure URL/metadata negative tests; real local ephemeral PG17 roles/ACL/DDL and six SQL migrations; existing local integration/strict/lint/unit/build/gates. Explicit future cloud smoke plan; never claim cloud PASS.
- **Risks:** local superuser differs from Neon admin capability; SQL cannot attest provider project/endpoint without trusted management/transport check; ownership implies trusted migration DDL/DoS capability; extension function ACL/version differences; partial external transaction/ambiguous commit; fixtures are not cloud evidence.
- **Status:** Complete within local preparation scope. Final150 unit/24 existing local integration/build/gates PASS; isolated rehearsal15/15 PASS. One independent review, five Important corrected in one RED→GREEN pass; one Minor deferred and reported. No cloud SQL/credentials/activation/push.

## Review focus

1. Wrong provider tuple, pooled/weak TLS, secret serialization must fail before any future socket.
2. Existing dirty roles, memberships, object ownership or marker must not be silently adopted/overwritten.
3. Public/table/column/sequence/function rights must not bypass read-only runtime, including SECURITY DEFINER and SET ROLE.
4. Atomicity/repeat/partial recovery must preserve marker owner and data without destructive cleanup or password resets.
5. Six unchanged migrations must work under the prepared migrator; test-only transport/cluster privileges must never imply Neon compatibility.

## Task 1 — SQL artifacts and local verification (one deliverable)

Files: db/bootstrap/neon-test/{00_inspect.sql,10_prepare.sql,20_verify.sql,manifest.json}; scripts/lib/neon-bootstrap-plan.ts (pure validation only); tests/unit/neon-bootstrap-plan.test.ts; tests/bootstrap-local/{cluster.ts,bootstrap.test.ts}; vitest.bootstrap.config.ts and test:bootstrap:local command. Update docs/NEON_BOOTSTRAP_PLAN.md with exact artifact order/role table/recovery/future writes/approval list; retain historical reports.

- [x] Write policy/static and rehearsal tests first; observe RED.
- [x] Implement constant-target secret-free SQL, pure metadata/transport checks, isolated local harness. No runtime activation or cloud runner.
- [x] Observe GREEN: wrong metadata/URL, role/marker/ACL drift, repeat, rollback/partial, six migrations, read-only runtime/SET ROLE/function tests.
- [x] Run relevant full checks and one fresh-context review; fix Important/Critical once with RED→GREEN; update real evidence and local commit.

## Rulings / execution

- Ruling: reuse existing clean feature checkout; moving open files/portable paths or creating worktree is unnecessary. Cost: protect against concurrent edits using Git/fingerprints.
- Ruling: NOLOGIN preparation separates privileges from credentials activation. Cost: roles are not usable for application login until a separately approved credential step.
- Ruling: database ownership transfer is needed by current guard and unchanged migration003 policy; migrator is trusted DDL, not a safe runtime writer. Cost: future redesign may narrow this, but current six migrations/guards are preserved.
- Ruling: user supplied concrete local-preparation scope, so proceed without redundant workflow approval. No merge/push; local artifacts are not remotely backed up.
- Pre-flight: one task; SQL/manifest/pure guard/harness share exact IDs and role contracts. SQL metadata settings are a client-verified receipt, never independent provider attestation. Runtime remains pending.
- Ruling: retained admin→migrator downward membership, explicitly ADMIN/INHERIT/SET, supports PG17 ownership/default ACL/repeat; no outward memberships from either app role. Cost: bootstrap remains a trusted powerful administrator, never application runtime.
- Final: fixed five Important review findings — recovery intent, all-schema/MAINTAIN ACL, inventory/default grants, marker checks/grantees, exact routine provenance. RED recovery1 FAIL/9 PASS and rehearsal4 FAIL/11 PASS → GREEN10 unit-plan/15 rehearsal; full suite150/24/build/gates PASS.
- Final: minor (deferred): initdb failure before cleanup may leave ignored local init-secret; disclosed in report/final, no actual cloud credential involved.
- Final: Ruling: real Neon capabilities/TLS remain unverified because cloud SQL/credentials are prohibited; local simulation is not evidence of managed privilege compatibility. Cost: first future cloud inspection may reveal a blocker requiring a revised plan.
