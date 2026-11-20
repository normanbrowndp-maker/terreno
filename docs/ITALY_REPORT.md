# TERRENO Italy — implementation and verification report

## TRAVEL-027 · Production preview and editorial interface

The catalog now displays the data source on the home page, index, city, place and saved screens. The city filters include gardens, museums and landmarks when the city has entries in those categories. The keyboard search reopens after Escape, ArrowUp selects the last result, and search links support standard browser navigation. Place cards have one detail link, and the place page links back to its city. Counts come from the active collection.

Production Next.js and Chromium used an isolated local PostgreSQL/PostGIS test database with all six existing migrations. The populated fixture returned `postgres/ready` over HTTP. A separate empty-database browser check confirmed `bundled/not-seeded` and the visible offline sample notice on all five screen families. The test server and its database close after each run.

Production build, ESLint, architecture and secret checks passed. There were 150 passing unit tests, 16 passing Chromium E2E tests including 1440/768/390/360 px, and one separate passing empty-database scenario. The PDF comparison kept the desktop map/sidebar and mobile map-first layouts. Geographic layers and licensed photographs differ from the illustrative artboards, and city filters wrap when the collection supplies additional categories.

The previous TRAVEL-026 worktree was archived to a Git-ignored local checkpoint. The Neon project retains its **BLOCKED BY PROVIDER ACL** status. Italy is the first catalog country. The shared PostgreSQL country/region model remains in place, and the curated Italy reader and map continue to serve the Italian collection.

Local screenshots for the PDF comparison are in [artifacts/terreno/travel027](../artifacts/terreno/travel027/).

2026-11-18. TRAVEL-014…017 completed within the editorial-preview scope. Current geography is Italy. Kazakhstan remains only in historical audit evidence and synthetic foundation fixtures, never in the public catalog. No push, merge, deploy, paid service or new cloud connection was performed.

Subsequent explicit authorization: TRAVEL-018 published the Italian branch to GitHub without deployment. This does not change the historical no-push boundary of the implementation stage above. Current publication evidence: [GITHUB_PUBLISH](GITHUB_PUBLISH.md).

## Implemented scope

Five screen families: home/Italy map,48-city index, city page, real attraction page, device-saved places. English copy follows the PDF; Italian names remain authentic. Desktop/sidebar and mobile compositions use the supplied palette, local fonts, quiet dividers and restrained states. A sources/credits page makes factual and photograph provenance accessible.

The original backend remains a Next.js modular monolith. Original SQL migrations0…3 and all original test cases are retained. Two new forward-only migrations add cities/editorial fields and enforce country consistency. The explicit demo seed is transactional/idempotent and checks owned database identity. Read-only API/SSR share a loader with actual `postgres` or `bundled` metadata.

Data:48 unique cities/19 regions from the PDF; all48 country/coordinate checks and all48 administrative city-region pairs independently verified in Wikidata. Initial places:4 Firenze;2 each Roma/Milano/Venezia/Napoli. Details and17 real photograph credits: [ITALY_SOURCES](ITALY_SOURCES.md), [data](../src/modules/catalog/data/italy.demo.json), `/sources`.

## Actual checks

- Frozen `npm ci`: completed; same dependency versions and existing dev-only advisory/EOL caveat retained.
- `npm run check`: exit0, ESLint0 warnings, strict TypeScript, architecture52 source files, secrets/index/worktree, docs170 original hashes, dependency gate,53 unit/12 files,24 real PostgreSQL integration/3 files, production build. Final CSS cascade adjustment was followed by fresh lint/build and full E2E.
- Final `npm run test:e2e`:14 Chromium tests passed on production build, no retries. Includes both retained foundation cases, all5 editorial cities/all12 attraction pages and matching photographs, API errors, search/filter/navigation, URL reload/back/reset, persistence/corruption/denial/cross-tab, hydration/photo failure, five screen families at1440/768/390/360. These are Chromium viewport tests, not claims of physical iOS/Safari testing or full accessibility certification.
- New significant rules were exercised RED→GREEN: catalog/source validation, saved schema, actual PostGIS seed/rights, map projection precision, incorrect photo URL, city-country FK, filtered saved removal, SVG hydration.
- Full audit remains16 high findings from the known unpatched dev-only picomatch advisory, not a clean full audit; new/prod/unknown/expired findings still block. See [DEPENDENCY_REVIEW](DEPENDENCY_REVIEW.md).
- Fresh `npm audit --omit=dev --json`:0 production vulnerabilities. No check was disabled to obtain a pass.
-34 screenshots,0 browser page errors,0 horizontal overflow; ten side-by-side comparisons visually inspected.
- Real outage probe stopped only the physically identified owned55433 cluster: home200 with “Available offline”, places API200/bundled/database-unavailable, live200 and ready503. Recovery after restart: API200/postgres/ready and ready200. Existing5432/55432 and environment secrets were preserved.

## Real behaviour and limits

- The catalog is a labelled editorial demo, isolated from production. Five cities have initial places; the other43 are genuine index/city entries with truthful content/photograph placeholders.
- Saved starts empty; actual browser/device storage only. No account, cloud sync, fake permanent database history or prepopulated fictional cafe. Storage denial clearly switches to visit-only memory; corrupt data is reported.
- Country geometry and POIs are georeferenced. Real bounded street snapshots: Firenze/Roma/Milano. Venice/Naples Overpass requests failed502/504/timeouts, including a smaller retry; those cities show real point maps labelled without street data. No fictional street image or road route replaces missing data.
- Hours/prices/live opening remain unverified; official visitor links are offered. Nearby distances are approximate straight-line distances, never walking times.
- PDF cafe/event examples are excluded. Licensed Commons photos replace unverified reference photos; the PDF's original serif family is unnamed Type3 glyphs, so local Playfair Display is an explicit approximation. Inter/JetBrains Mono and all six main colors follow the reference. Browser UI does not fake phone OS status bars.

## Fixes and decisions

- Geographic display pixels are quantized to0.001 for deterministic server/browser SVG attributes; source WGS84 coordinates remain unchanged. SVG titles use a single text string to avoid a separate React hydration mismatch.
- Existing transaction-only fixture assertions now address their original UUIDs rather than assume every table is globally empty after the separately declared demo seed. Migration count/failure version checks advance without removing original coverage.
- UI was separated into five screen components and shared editorial primitives; stateful browser saving has an explicit provider boundary. No user singleton exists on the server.
- The old docs “no remote” policy was updated to the exact already-authorized origin; arbitrary destinations remain rejected. Current feature work stays local with no push.

## Screens and real initial places

| Screen | Route | Verified behaviour |
| --- | --- | --- |
| Home / Italy | `/` | Genuine outline/48 city points, category/opening-filter empty states, zoom/pan/reset/keyboard and Florence entry |
| City index | `/cities` | All48 PDF cities/19 regions, aliases/diacritics search, count, sort/reset, deep links |
| City | `/cities/firenze` and47 other slugs | Five initially populated cities, POI cards/map/filter; honest content/photo placeholders for43 others |
| Attraction | `/places/giardino-bardini` and11 other slugs | Real facts/coordinates, official link, sources/date/photo rights, nearby straight-line distance, save and external navigation link |
| Saved | `/saved` | Empty by default; actual device saves, removal/city filter/reload/cross-tab, corrupt/denied-storage feedback |
| Sources | `/sources` | Factual references,17 photo credits, licenses, font/geography attribution |

| City | Real initial places |
| --- | --- |
| Firenze | Giardino Bardini; Basilica di Santa Croce; Piazza Santo Spirito; Galleria degli Uffizi |
| Roma | Colosseo; Pantheon |
| Milano | Duomo di Milano; Castello Sforzesco |
| Venezia | Palazzo Ducale; Piazza San Marco |
| Napoli | Museo Archeologico Nazionale di Napoli; Castel Nuovo |

Dataset `italy-editorial-demo-v1`, checked2026-11-18. [ITALY_DESIGN](ITALY_DESIGN.md) contains all48 exact names; [ITALY_SOURCES](ITALY_SOURCES.md) lists each official page and each photo's author/source/original URL/license/attribution. Official museums/municipal pages, Italia.it and Visit Tuscany were checked; descriptions are original summaries. Wikidata facts use CC0, Commons photographs retain their individual CC BY/CC BY-SA terms, editorial cropping is declared. No AI image or unlicensed PDF photograph is shipped.

Read APIs: `/api/v1/cities`, `/api/v1/cities/[slug-or-id]`, `/api/v1/places`, `/api/v1/places/[slug-or-id]`. `backend`, `availability`, dataset/date are factual. Search, home/city categories, opening toggle, index sort and saved-city filters use URL query state. Typing replaces the current query history entry. “Open in navigation” opens a real external Google Maps URL with coordinates; this is not an in-app routing engine or a paid API integration. Seed writes are CLI-only; no public write endpoint or account/trip persistence was invented.

## Independent review and corrections

One independent source review evaluated candidate `53381b3` against baseline `9e8c8fa`. It found two Important issues (partial catalog readiness, ownership race before child writes) and two Minor issues (URL persistence, temporary saves discarded on storage event). All four were reproduced and fixed in one correction pass; fresh regression tests verified the fixes. The reviewer did not rerun the suites or independently revalidate external websites. Final corrections were checked by the implementer; no second independent approval is claimed.

- Reader checks exact versioned IDs/slugs and city–place membership. A partial seed returns `bundled/incomplete-seed`, an empty seed `bundled/not-seeded`; it cannot silently publish fewer cities under a48-city promise.
- City/place parent upserts require the owned `RETURNING id` before any dependent translation/media/association write. Loss of ownership rolls back the entire transaction. Both race-boundary scenarios were tested in the owned test DB.
- Native History integration of the installed Next version synchronizes URL state, reload and back navigation.
- Pending temporary additions/removals are reconciled with another tab's disk changes rather than discarded.
- Tablet map caption/control overlap and the mobile Map/Index switch were addressed during PDF comparison.

Focused `security-review`: inputs were traced through bounded validation, explicit DTOs, parametrized reads, HTTPS/local-image allowlists and React escaping. Storage holds only public place IDs; DB writes are CLI-only behind local-target/identity checks. No high-confidence exploitable vulnerability was identified in the changed surface; this is not a production penetration test. Existing dev dependency findings remain open.

## PDF comparison and screenshots

PDF SHA256: `65408b3c78c3f0a2db1b4f91a952051c0d12346eeabb640c78d379ac2bbb451a`. One3430×7710 page contains desktop/mobile artboards. Six palette tokens, header88/sidebar420, compact mobile home, two-column city cards, saved rows, quiet dividers and bottom actions follow the reference. English copy follows the PDF.

This is not pixel-perfect identity. Visible differences:

- Real Natural Earth/OSM geography replaces schematic coast/street blocks. Mobile initially fits all Italy/islands instead of cropping the north/centre.
- Real licensed photos and verified POIs replace illustrative cafe/event content. Other43 thumbnails remain neutral placeholders, not repeated Florence photos.
- The unnamed Type3 serif is approximated with Playfair Display; glyphs/wrapping differ. Inter/JetBrains Mono are local OFL assets.
- Index search/sort adds useful controls and uses denser rows. Authentic long names and source/verification/device-storage notices change vertical spacing. Fake OS status/home bars are excluded.
- The two alternative mobile-home studies at the bottom of the PDF are reference variants, not additional runtime modes. Draggable/resizable sheet behaviour is not claimed.

Local artifacts are ignored by Git and remain QA evidence in this workspace:

- [Comparison gallery](../artifacts/terreno/comparisons/index.html): ten pairs, left PDF/right implementation. Native widths and city/place artboard heights are preserved. Gray padding belongs to the comparison canvas.
- [Desktop home](../artifacts/terreno/final/desktop-home.png), [mobile390](../artifacts/terreno/final/mobile-home.png), [mobile360](../artifacts/terreno/final/small-mobile-home.png), [tablet768](../artifacts/terreno/final/tablet-home.png).
- [Desktop index](../artifacts/terreno/final/desktop-index.png), [city](../artifacts/terreno/final/desktop-city-pdf-height.png), [place](../artifacts/terreno/final/desktop-place-pdf-height.png), [saved](../artifacts/terreno/final/desktop-saved.png).
- [Mobile index](../artifacts/terreno/final/mobile-index.png), [city](../artifacts/terreno/final/mobile-city-pdf-height.png), [place](../artifacts/terreno/final/mobile-place-pdf-height.png), [saved](../artifacts/terreno/final/mobile-saved.png), [empty saved](../artifacts/terreno/final/mobile-saved-empty.png).
- [Search](../artifacts/terreno/final/mobile-search-open.png), [no results](../artifacts/terreno/final/mobile-no-results.png), [manifest](../artifacts/terreno/final/manifest.json).

Populated saved screenshots were produced by three actual save-button actions in a disposable QA browser. The application starts empty. Full-page screenshots also exist for analysis; exact-artboard-height pairs avoid placing fixed viewport actions in the middle of a long stitched page.

## Skills applied

Project copies: frontend-design (editorial layout), ui-ux-pro-max (targeted usability/focus/mobile controls), web-design-guidelines (fresh guidelines, semantics/focus/feedback/images), vercel-react-best-practices (images/fonts, server/client boundaries, bundle discipline), vercel-composition-patterns (shared primitives/provider; no speculative compound framework). No installed skill package was changed.

Workflow/research: PDF rendering/extraction, Firecrawl/read-docs/official source APIs, brainstorming/writing-plans/executing-plans, test-driven-development, systematic-debugging, requesting-code-review, security-review, verification-before-completion, finishing-a-development-branch. The owner's no-push requirement selects keeping the local branch; no further integration approval is needed for the authorized work.

## Launch and remaining work

The verified production preview is running at http://127.0.0.1:3000. When stopped:

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run db:seed:demo
npm run dev
```

For production preview: `npm run build` then `npm run start`. The ignored portable cluster/`.env.local` are already prepared here. Fresh Windows checkout: documented `db:download` first; see [LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md). Preserve existing secrets. E2E requires port3000 free because it owns its server; integration requires the owned test DB.

Remaining: deepen sourced content in the five core cities, then the other43; add reviewed refresh/editor workflow before production import; verify schedules/prices before reliable Open now; obtain Venezia/Napoli street coverage or retain the honest limited mode; refine typography with original font assets if available. Real auth/cloud saves, routing and translation remain separate stages. Production catalog completeness/deployment readiness is not claimed. [ISSUES](ISSUES.md) records problems, remedies, effort and timing.

## TRAVEL-030 ? map stability, international sample and opt-in location (2026-11-20)

Goal: fix the real MapLibre map before expanding sourced content. Dependencies: existing Next/React, MapLibre 6.19/OpenFreeMap, six unchanged migrations and guarded local PostgreSQL/PostGIS. Sequence: checkpoint ? map regression ? Italy expansion/real HTTP ? international seed and country selection ? location ? final checks. Acceptance: one geographic world, stable positioned markers across filtering/pan/zoom, country deep links, real PostgreSQL responses, explicit-only location with no coordinate persistence. Cloud integration remains BLOCKED BY PROVIDER ACL.

Implemented:

- `renderWorldCopies=false`, global minZoom 2/maxZoom 20, existing Italy fitBounds and freely movable camera; no city/country maxBounds. The previously configured Italy fit was retained and checked, not replaced by a world view. City labels use collision-aware compact dots and are no longer all hidden beyond zoom 12. Stable marker reconciliation preserves MapLibre's own classes. Layout runs immediately after reconciliation as well as on map frames; otherwise asynchronous DOM markers could remain crowded until a gesture. Selection IDs prevent filter changes from pulling the camera back. Only one map-context preview is rendered and it can be closed.
- Existing 48 Italian cities retained. Firenze and Roma now each have 10 places. Added Helsinki (Uusimaa, 10 places), Rovaniemi (Lapland, 4), Z?rich (canton Z?rich, 6), Luzern (canton Luzern, 3). Total: 52 cities / 49 sourced sample places; 37 places added. No Kazakhstan editorial records. Interlaken, national parks and fuller Rovaniemi/Z?rich/Luzern coverage remain research work; ten per city is not claimed.
- Country selection on Home/Index uses `?country=IT|FI|CH`, fits the chosen country without constraining movement, and keeps existing `/cities/:slug` and `/places/:slug` links. API v1 list endpoints accept the same validated country filter. Search, navigation, source credits and device saves remain shared. Runtime reader and explicit seed handle country/region/timezone per record. The legacy `italy-editorial-demo-v1` identifier remains for compatibility with immutable migrations; foreign samples are in a separate `international.demo.json`, not production records. Default API list limit remains 50; country filters retrieve each supported country's subset.
- My location calls browser geolocation only on click. HTTPS/localhost required; timeout 10 seconds, no cached location. Country eligibility first checks real Natural Earth 1:10m land polygons locally; only cities in that country are considered. Geodesic proximity is limited to 25 km from a supported city; accuracy worse than 2 km is rejected. This is a nearby-city suggestion, not municipal reverse geocoding. Generalized coasts/borders can conservatively refuse an uncertain position; manual country selection remains available. A negative Koper (Slovenia)/Trieste and Mendrisio/Como regression prevents cross-border nearest-marker assignment. Up to ten sourced places in that city are linked by distance. Unsupported, inaccurate, denied, unavailable and timeout results have explicit messages. Position/marker are memory-only; not sent to TERRENO API, URL, storage or database. Base tiles still come from the external provider for the visible viewport.
- New names/coordinates checked against Wikidata on 2026-11-20. Record-level sources include official museum/tourism references; no hours/prices or uncertain addresses invented. Added 34 licensed Commons photographs with author, original/source URL, license URL and attribution; seven new places retain placeholders. All 51 referenced images (including existing city/place photos) passed local JPEG integrity checks. Credits are visible at `/sources` and per-image links.

Verification: 154/154 unit tests; 24/24 integration tests in disposable PG17/PostGIS; production build, strict TypeScript, ESLint, architecture/secrets/docs checks and npm dependency audit passed (0 vulnerabilities). Final Chromium results are recorded below. The ordinary integration command first failed because an existing local test listener did not match the configured credentials; the isolated runner passed without changing env or adopting that database. Browser tests caught and verified fixes for initial label layout, preserved MapLibre classes after filtering, mobile attribution overlap, global-search option scoping and international Enter search. Known risks: network/tile availability, browser-specific physical gestures, sparse editorial coverage, approximate city proximity, no production import/editorial refresh pipeline. Existing `.env.local`, six migrations, DB/Neon guards, pending registry and bootstrap SQL are hash-identical to the start-of-task checkpoint. Previous uncommitted work was archived under ignored `.local/audit/travel030-180306/previous.zip`; nothing was reset or pushed.


Final TRAVEL-030 result: **36/36 Chromium E2E PASS** on the final build (real Next HTTP + disposable physical PG17/PostGIS). Includes all 49 place pages, four international city pages, Italy/Finland/Switzerland switching, 1440/768/390/360 layouts, repeated pan/zoom, single-world/minZoom, initial label layout, preserved marker DOM and MapLibre absolute positioning after filters, keyboard search, device saves, CDP two-finger zoom, reduced motion, explicit Helsinki location/ten links, denied/unavailable/timeout/inaccurate/unsupported/cross-border cases. Real phone hardware/GPS/trackpad were not tested; touch gestures and location use Chromium emulation. `git diff --check` passed; protected file hashes (25) unchanged. No cloud calls, env changes, migration edits, commit or push.

Screenshots: ignored `artifacts/terreno/travel030/`: `IT-1440.png`, `FI-1440.png`, `CH-1440.png`, corresponding `*-390.png`/`*-360.png`, `country.png`, `regions.png`, `streets.png`, `single-world.png`, `free-pan.png`, `mobile-pinch.png`, `location-390.png`. Inspected desktop Italy and mobile Finland visually; label collisions and attribution overlap were repaired with browser regressions. The other existing page-family screenshots remain in their previous artifact locations.

Local preview: http://127.0.0.1:3002 (owned disposable QA PostgreSQL on 55432, not an existing user's database). Its data is ephemeral; `.env.local` was not rewritten or read by the QA provisioning runner. Restart in this workspace after the preview is stopped: `node --import tsx .local/audit/travel030-preview.ts`. This ignored runner uses the existing local-cluster harness, real migration runner, guarded seed and runtime role; random local credentials stay in process memory. Normal project startup remains documented in LOCAL_DEVELOPMENT; do not adopt an unrelated listener or overwrite its env.

Status: map/country/geolocation increment verified locally; editorial sample coverage remains intentionally partial. Next practical task: deepen the 4/6/3-place international cities and nature coverage with independent sources and licensed matching photos. Production ingestion, refresh schedules, reverse-geocoding precision and provider hosting/ACL remain separate decisions. The legacy collection-level `countryCode=IT` is the original primary-country metadata; per-record country codes and the active country selection determine actual scope.


## TRAVEL-031 ? focused country camera and city clustering correction

Goal/acceptance: fit the selected country to the real map container at 1440/768/390/360, preserve free camera/filter/card behavior, and replace distant overlapping city markers with expandable counted groups. Dependencies: existing MapLibre 6.19 and public catalog; no new library, provider, DB/schema or cloud operation. Plan executed: checkpoint ? inspect live port3002 ? failing resize/cluster tests ? localized map/CSS correction ? browser regression/screenshots. Status: verified locally.

Fresh port3002/PostgreSQL pages already opened Italy at zoom4.83 desktop/3.06 mobile, so a fresh-load world view was not reproduced. Proven defect: resize390?1440 retained zoom3.06 because ResizeObserver only called resize. Country fit now uses measured container width/height and adaptive padding (the sidebar is already outside the map). Initial/explicit country overview refits after layout changes. Manual gestures or explicit focus relinquish overview fitting; filters/selection do not trigger a country fit. Existing explicit Show-on-map focus actions remain available.

MapLibre GeoJSON clustering (radius50px, through zoom7) uses the existing city coordinates; keyboard/touch-accessible44px count buttons open the native expansion zoom. Source changes only when city data changes. Tile-query cluster duplicates are deduplicated, old-country groups removed, stale expansion results checked, individual marker nodes/classes retained. Clustered city markers are represented by their counted group, not deleted; catalog POIs remain separate. Far world zoom is still allowed, with a48-city group instead of overlapping points. Camera/map instance and real base tiles remain unchanged.

Actual checks: production build, TypeScript, ESLint,154 unit, architecture and secret gates PASS. Browser regression on actual port3002:34 other scenarios PASS,6 camera/cluster cases PASS, and the minimum-zoom case PASS after replacing a fixed350ms delay/disabled-button race with observed camera completion (targeted7/7 repeat). Includes country area coverage/centers, member totals48/2/2, same canvas, native cluster expansion, free pan/filter/resize, selected-card flows, saved places, reduced motion and Chromium CDP pinch. No new SQL integration run: DB code was untouched; real HTTP metadata confirmed postgres/ready. Physical touch hardware was not tested. External glyph requests produced intermittent provider warnings during distant world views; no TLS/network checks were disabled.

Screenshots: `artifacts/terreno/travel031/IT-1440.png`, `FI-1440.png`, `CH-1440.png` and matching768/390/360 files; `clusters-1440.png`, `expanded-1440.png`, `single-world.png`; four `before-*.png` files. Visually inspected Italy desktop and Finland/Switzerland mobile. Preview: http://127.0.0.1:3002. Only that owned preview process was restarted;3000 was not used for validation. Previous work archived in ignored `.local/audit/travel031-190016/before.zip`;25 protected files remain hash-identical, including env, migrations, guards and Neon registry/bootstrap. No push/cloud changes. Risks remaining: external tile/glyph availability; real-device gesture testing.
