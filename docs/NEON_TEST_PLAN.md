# Neon test profile — TRAVEL-020 Implementation Plan

> **For agentic workers:** Use executing-plans inline, TDD and one final fresh-context review. No provisioning, cloud SQL, secret retrieval, environment changes or push.

**Goal:** Prepare an explicitly selected, fail-closed Neon test profile while preserving all local PostgreSQL protections and six immutable migrations.

**Architecture:** A checked-in secret-free approved-target registry is empty until a real terreno-test exists and management metadata is verified. Environment inputs cannot approve targets. Separate pure policy validation from credential handling/driver sinks and database identity checks. Runtime uses pooled; migrations/seed direct; privileged bootstrap remains a separate, non-executable runbook stage.

**Tech Stack:** Existing TypeScript strict/Zod/pg/node-pg-migrate/Vitest/PostGIS; no new dependencies.

**Spec:** Owner's current “безопасная подготовка Neon и проверка учётных записей” request; historical audit [NEON_READINESS](NEON_READINESS.md).

## TRAVEL-020 task contract

- **Goal:** Read metadata for both bindings and implement a testable, secure future connection path without enabling a real remote target.
- **Plan:** Preserve prior audit checkpoint; recheck metadata/GitHub field availability; write failing policy/identity/serialization tests; implement profile and integration boundaries; run regression and one independent review; document actual results.
- **Dependencies:** Existing six migrations/local guards and available Neon metadata MCP; no cloud resource is required.
- **Acceptance:** Wrong project/branch/endpoint/db/role/TLS/type/foreign targets fail before client creation; empty registry rejects every actual cloud target; no raw secret serialization/error leak; local operation/locks/checksums preserved; runtime/direct/bootstrap distinct.
- **Tests:** Pure policy/identity/error and installed-driver TLS tests; real existing local PostGIS regression only; strict/lint/architecture/secrets/docs/build/E2E as relevant. No cloud tests/provisioning/SQL.
- **Risks:** Misidentifying connector label as org/GitHub; forged/stale metadata; pooled advisory locks; cloned identity marker; TLS URL parameters; accidental URL logging; broad admin runtime role; local env/profile leakage.
- **Status:** In progress. No cloud writes or GitHub push authorized.

## Global constraints

- Keep `assertLocalDatabaseTarget` and physical local identity checks; do not modify original migrations0…5 or `.env.local`.
- Approved registry contains no fabricated real IDs or secret URLs; fixtures are explicitly fake and test-only.
- Project name is terreno-test; exact reviewed organization/project/branch/endpoint/host/db/role tuple required; known gloomi/sidequest project IDs excluded.
- TLS `verify-full` required, only audited URL options; no certificate-validation override. Runtime pooled; migrations/direct; privileged bootstrap not exposed by runtime/seed/migrate commands.
- Reuse pg and migration session locks/checksums. No paid action, provider changes, installs, deploy, push or cloud SQL.

## Review focus

1. URL canonicalization, duplicate/redirect/TLS parameters, encoded credentials: reject ambiguous routing without echoing input.
2. Missing/partial/forged/stale target registration: environment cannot authorize; exact project/branch/endpoint mapping and SQL marker mismatch fail closed.
3. Runtime/admin/migration role confusion and pooled migration URL: roles/operation/transport must match, bootstrap must remain separate.
4. Generic serialization/inspection/error and driver failures: private URLs never enter logs, JSON, spread or error causes.
5. Existing local database and env isolation: local commands remain local by default, cloud test cannot leak into dev/restore or integration fixtures.

## Task 1: trusted configuration and pure guards

**Files:** create `src/shared/db/neon-test-config.ts`, `neon-test-targets.json`, `neon-test.ts`, `connection-profile.ts`; tests `tests/unit/neon-test-profile.test.ts` and fake fixture helper.

**Interfaces:** `parseNeonTestTarget(unknown)`, `assertNeonTestUrl(url,operation,target,request)` return secret-free verified metadata; `resolveDatabaseConnection(url,purpose,env)` selects local or approved Neon and returns a private-credential holder. The production resolver reads only the checked-in registry; no env JSON approval.

- [ ] Write fake metadata/URL fixture and refusal/identity/serialization tests first; observe RED.
- [ ] Implement strict readonly schema, exact endpoint mapping, URL allowlist, explicit profile selection and empty registry denial; observe GREEN.
- [ ] Exercise the installed pg client's TLS options without a network connection.

## Task 2: local-compatible integration boundaries

**Files:** create `src/shared/db/profile-identity.ts`; minimally modify pool/migrate and seed entrypoints, preserving original local identity function and target guard.

**Interfaces:** `assertProfileIdentity(db,target,purpose)` delegates unchanged local identity or checks Neon marker plus current database/login/role. Migration and seed reuse the verified connection; no credentials escape the driver sink.

- [ ] Add failing marker mismatch/sanitized-error tests; prove rejects before DDL.
- [ ] Wire profile into runtime and explicit test migration/seed only; development/restore never route to Neon.
- [ ] Keep direct session advisory lock/checksum/transaction implementation unchanged; execute local integration regression.

## Task 3: evidence, review and completion

**Files:** `docs/NEON_TEST_PROFILE.md`, architecture/decisions/workflow links and AGENTS current scope; preserve historical audit.

- [ ] Record both account bindings, org/project/branch/db names, unavailable GitHub linkage metadata and no fabricated repo binding.
- [ ] Document approved-target enrollment, separate bootstrap and pre-Railway gates; record remaining blockers rather than auto-provision.
- [ ] Strict/lint/unit/integration/build/E2E and immutable migration/env integrity checks; one fresh-context review, one correction pass, local checkpoints only.

## Execution ledger

- Baseline source `eb28132`; previous read-only audit safely preserved as local commit `1598ee4`. Branch `feature/neon-test-profile`, not main/default; no push.
- Ruling: work in the user's existing workspace on a separate local feature branch, preserving their open files and portable DB paths. No linked worktree is created without the skill's requested preference/consent; this reversible preparation does not require interrupting authorized work.
- Ruling: the current explicit implementation request supersedes TRAVEL-019's docs-only limit, not the prohibition on cloud resources/SQL/env changes.
- Pre-flight: Task1 verified target shape is consumed by Task2 identity/pool/migration/seed; keep one shared type and reviewed registry. Bootstrap is a runbook/validator, not an executable privileged path.
- Ruling: metadata can establish available bindings/orgs/projects, not account ownership identity or absence of a GitHub integration. Do not infer repository binding from matching names, creation_source or a GitHub avatar.
