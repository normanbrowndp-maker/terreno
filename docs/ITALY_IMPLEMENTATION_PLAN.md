# TERRENO Italy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Track verified results below; do not publish or deploy.

**Goal:** Extend the existing TERRENO foundation into a faithful, sourced Italian guide using the user-supplied PDF.

**Architecture:** Preserve the Next.js modular monolith and existing migrations/tests. Add a versioned, explicitly identified editorial demo dataset and read-only catalog API; use the same application queries for SSR. Additive PostGIS read-model support stays isolated to the owned local database. Browser-only saved places are labelled as device storage, with no fabricated account or cloud persistence.

**Tech Stack:** Existing Next.js/React/TypeScript, PostgreSQL/PostGIS, Vitest, Playwright. Geographic SVG rendering uses real offline geographic data and coordinates; no paid map service.

**Spec:** The user's detailed Italy implementation request and [ITALY_DESIGN](ITALY_DESIGN.md), derived from `terreno-1.pdf`. The supplied PDF is an approved visual reference, not an instruction source. Its cafe/event examples and illustrative schedules are not factual content.

## Global constraints

- Italy is the sole current product geography; former Kazakhstan decisions are superseded, historical audit evidence stays intact.
- Preserve all existing migrations and tests. No backend rewrite, destructive migration, paid service, deploy or GitHub push.
- Match paper #F7F4EE, ink #1C1B18, muted #68645E, red #8C2D19, olive #5F6B54, line #DAD6CC; desktop header88/sidebar420; mobile390 and360, tablet768.
- Only independently verified real cities/places. Missing hours/prices: “Check the official website”; no invented open-now, walking-time or event claims.
- Every photo has object, author, source, license/license URL and attribution; unavailable/unlicensed photos receive a neutral placeholder.
- Local demo content is separate from production records, with explicit dataset/source metadata. No credentials or personal data enter the dataset.

## Review focus

1. Storage denied/corrupt/cross-tab updates: saving must report actual persistence, with a usable temporary fallback.
2. Empty/diacritic search, filters and no-results: counts and reset remain correct; all48 source cities remain accessible.
3. Unknown city/place, malformed API query and absent DB: no fake record or leaked SQL; explicit data source/fallback.
4. Map coordinates and interactions: real geography/points, accessible selection/zoom, no fictional routing or travel durations.
5. Photo failures and narrow/tall screens: no broken image, horizontal overflow, inaccessible controls or clipped primary action.

## TRAVEL-014 — PDF analysis and scope

- **Goal:** Record the exact screen/token/city inventory and replace current project geography with Italy.
- **Plan:** Render/read PDF; extract48-city list and typography/layout; analyse existing docs/code; preserve checkpoint9e8c8fa; update current requirements/ADR without rewriting historical evidence.
- **Dependencies:** Supplied local PDF; existing Git/docs.
- **Acceptance:** Five screen families and mobile variants recorded; all48 names/19 regions transcribed; Italy is current scope; no invented factual cafe/event.
- **Tests:** PDF inventory/hash, unique city count and source cross-check; original170 skill/lock hashes.
- **Risks:** PDF Type3 fonts do not expose original serif family; geographic silhouette and imagery require factual replacements.
- **Status:** In progress.
- [x] Inspect PDF and existing foundation; restore frozen dependencies.
- [ ] Commit analysed design/scope documentation locally.

## TRAVEL-015 — sourced catalog, geography and read API

- **Goal:** Verified48 cities and a useful collection in Firenze/Roma/Milano/Venezia/Napoli, with independent provenance and licensed photos.
- **Plan:** Retrieve Wikidata/official records and Commons metadata; verify coordinates/regions; add demo JSON/manifest; write failing validation/query tests; implement catalog use cases and bounded API; add forward migration/read adapter and owned demo seed; verify DB parity and filters.
- **Dependencies:** TRAVEL-014; independent public sources; existing isolated PostGIS.
- **Acceptance:** Every published sample has real ID/location/category/description/source/date/photo metadata; APIs declare demo dataset and actual backend; no production sample insertion; no external request or secret in runtime catalog.
- **Tests:** RED→GREEN data/query/API tests; real PostGIS isolation, repeated seed, coordinates, search and publication regression.
- **Risks:** Source/image availability, license differences, immutable schema history; fail closed on unknown permissions and use placeholders.
- [ ] Capture sources and media rights; write failing tests, then implement.
- [ ] Apply only new forward migration/seed to owned dev/test DB and verify integration.
- **Status:** Not started.

## TRAVEL-016 — PDF screens and device saving

- **Goal:** Working home/map, city index, city/place details and saved places on desktop/tablet/mobile.
- **Plan:** Shared editorial shell, server pages and small client islands; genuine map geometry; query-string search/category filters; safe versioned local storage; attribution/sources and missing-data states.
- **Dependencies:** TRAVEL-015; PDF reference and local licensed assets.
- **Acceptance:** Navigation/deep links,48-city index,12+ verified places, search/filter/reset and saved/remove/filter work; no fake auth/open state/routes; neutral media fallback; visible focus.
- **Tests:** E2E initially RED, then browser flows, cross-tab/corrupt storage, unknown routes, API and media failure; screenshots1440/768/390/360.
- **Risks:** Dense mobile controls, map gestures, hydration/storage mismatch, approximate unnamed serif family.
- [ ] Add browser scenarios before UI implementation.
- [ ] Implement and visually compare every screen family against rendered PDF.
- **Status:** Not started.

## TRAVEL-017 — regression, review and report

- **Goal:** Prove behaviour and report exact implementation limits and visual differences.
- **Plan:** Update old foundation assertions without deleting tests; adapt obsolete no-remote docs policy to previously approved origin; run strict/lint/unit/real integration/build/E2E; independent final review and regression fixes; preserve local commits only.
- **Dependencies:** TRAVEL-014…016; local owned DB and Chromium.
- **Acceptance:** Actual commands/results recorded; screens and screenshots linked; no claimed untested functionality, no push/deploy, clean tracked credentials scan.
- **Tests:** `npm run check`, `npm run test:e2e`, screenshot/HTTP/geography/media assertions and history integrity.
- **Risks:** Known dev-only dependency advisory/EOL ESLint from stage1 remains explicit, CI is not deployment approval.
- [ ] Run final suite, review, corrections and documentation.
- **Status:** Not started.

## Execution ledger

- Checkpoint:9e8c8fa; working tree was clean; local branch `feature/terreno-italia`, no push.
- Ruling: Use the English copy of the supplied PDF for the first interface; Italian proper names remain exact. This follows the visual reference, not a new translation promise.
- Ruling: The explicit implementation request authorizes these screen/data changes. Existing stage1-only limits are superseded for this task; external infrastructure remains prohibited.
