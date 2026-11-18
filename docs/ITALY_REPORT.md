# TERRENO Italy — implementation and verification report

2026-11-18. TRAVEL-014…017. This report is being finalized after independent review and the final screenshot pass; completed checks below are actual results, not promises.

## Implemented scope

Five screen families: home/Italy map,48-city index, city page, real attraction page, device-saved places. English copy follows the PDF; Italian names remain authentic. Desktop/sidebar and mobile compositions use the supplied palette, local fonts, quiet dividers and restrained states. A sources/credits page makes factual and photograph provenance accessible.

The original backend remains a Next.js modular monolith. Original SQL migrations0…3 and all original test cases are retained. Two new forward-only migrations add cities/editorial fields and enforce country consistency. The explicit demo seed is transactional/idempotent and checks owned database identity. Read-only API/SSR share a loader with actual `postgres` or `bundled` metadata.

Data:48 unique cities/19 regions from the PDF; all48 country/coordinate checks and all48 administrative city-region pairs independently verified in Wikidata. Initial places:4 Firenze;2 each Roma/Milano/Venezia/Napoli. Details and17 real photograph credits: [ITALY_SOURCES](ITALY_SOURCES.md), [data](../src/modules/catalog/data/italy.demo.json), `/sources`.

## Actual checks so far

- Frozen `npm ci`: completed; same dependency versions and existing dev-only advisory/EOL caveat retained.
- `npm run check`: exit0, ESLint, strict TypeScript, architecture51 source files, secrets/index/worktree, docs170 original hashes, dependency gate,52 unit/11 files,21 real PostgreSQL integration/3 files, production build.
- `npm run test:e2e`:13 Chromium tests passed on production build. Includes both retained foundation cases, all5 editorial cities/all12 attraction pages and matching photographs, API errors, search/filter/navigation, persistence/corruption/denial/cross-tab, hydration/photo failure, five screen families at1440/768/390/360.
- New significant rules were exercised RED→GREEN: catalog/source validation, saved schema, actual PostGIS seed/rights, map projection precision, incorrect photo URL, city-country FK, filtered saved removal, SVG hydration.
- Full audit remains16 high findings from the known unpatched dev-only picomatch advisory, not a clean full audit; new/prod/unknown/expired findings still block. See [DEPENDENCY_REVIEW](DEPENDENCY_REVIEW.md).

## Real behaviour and limits

- The catalog is a labelled editorial demo, isolated from production. Five cities have initial places; the other43 are genuine index/city entries with truthful content/photograph placeholders.
- Saved starts empty; actual browser/device storage only. No account, cloud sync, fake permanent database history or prepopulated fictional cafe. Storage denial clearly switches to visit-only memory; corrupt data is reported.
- Country geometry and POIs are georeferenced. Real bounded street snapshots: Firenze/Roma/Milano. Venice/Naples Overpass requests failed502/504/timeouts, including a smaller retry; those cities show real point maps labelled without street data. No fictional street image or road route replaces missing data.
- Hours/prices/live opening remain unverified; official visitor links are offered. Nearby distances are approximate straight-line distances, never walking times.
- PDF cafe/event examples are excluded. Licensed Commons photos replace unverified reference photos; the PDF's original serif family is unnamed Type3 glyphs, so local Playfair Display is an explicit approximation. Inter/JetBrains Mono and all six main colors follow the reference. Browser UI does not fake phone OS status bars.

## Fixes and decisions

- Geographic display pixels are quantized to0.001 for deterministic server/browser SVG attributes; source WGS84 coordinates remain unchanged. SVG titles use a single text string to avoid a separate React hydration mismatch.
- Existing transaction-only fixture assertions now address their original UUIDs rather than assume every table is globally empty after the separately declared demo seed. Migration count/failure version checks advance without removing original coverage.
- Four UI files were separated into five individual screen components and shared editorial primitives; stateful browser saving has an explicit provider boundary. No user singleton exists on the server.
- The old docs “no remote” policy was updated to the exact already-authorized origin; arbitrary destinations remain rejected. Current feature work stays local with no push.

## Still to finalize

Independent review, final screenshot/side-by-side comparison artifacts, final working-tree/secret checks and local checkpoint references are recorded after their actual completion. No deployment or new cloud connection is part of this task.
