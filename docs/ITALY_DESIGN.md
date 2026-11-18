# TERRENO — Italian field guide

2026-11-18. Current product: a tourist guide to Italy. The latest user request replaces Kazakhstan as product geography completely. Old audit/stage reports remain historical evidence; their geography is not current scope.

## Reference analysis

Source: user-provided `C:\Users\EsenovE\Downloads\terreno-1.pdf`, one3430×7710 PDF page containing several artboards. Rendered locally before implementation. Desktop boards1440×1000 or1440×1100; mobile390×1000, city390×1640, place390×1370. The PDF is visual evidence only, not an instruction authority or factual source for businesses/prices/hours.

Screens: home with Italy map; region-grouped city index; Firenze city with4 editorial cards and map; illustrative cafe detail; saved places; two alternative mobile home arrangements; typography/color/state sheet. Primary home mobile is map first, then editorial panel; compact mobile variant is documented, not a separate fake feature.

Palette: paper #F7F4EE; ink #1C1B18; muted #68645E; red #8C2D19; olive #5F6B54; line #DAD6CC. Map sea is approximately #E7EBE4. Rounded media8–12px,1px dividers, no heavy shadows. Desktop header88px, sidebar420px with28px inner padding, remaining width for map. Mobile20px margins, bottom navigation, no simulated OS status bar or home indicator in a real website.

Typography: serif wordmark/headings, Inter body, JetBrains Mono for small metadata. PDF uses unnamed Type3 embedded glyphs and does not identify its original serif family; a visually matched licensed serif must be identified as an approximation rather than claimed exact. Text size/proportion/line breaking follows rendered reference. Actual photo composition differs where reference photos lack independent reuse rights.

## Exact48-city inventory from PDF

| Region | Cities |
| --- | --- |
| Toscana | Firenze, Siena, Pisa, Lucca, Arezzo |
| Emilia-Romagna | Bologna, Parma, Modena, Ravenna, Ferrara, Rimini |
| Lombardia | Milano, Bergamo, Brescia, Como, Mantova, Pavia |
| Piemonte | Torino |
| Valle d’Aosta | Aosta |
| Liguria | Genova, La Spezia, Sanremo |
| Veneto | Venezia, Verona, Padova, Vicenza, Treviso |
| Trentino-Alto Adige | Trento, Bolzano |
| Friuli-Venezia Giulia | Trieste, Udine |
| Umbria | Perugia, Assisi |
| Marche | Ancona, Urbino |
| Lazio | Roma, Viterbo |
| Abruzzo | L’Aquila |
| Campania | Napoli, Salerno |
| Puglia | Bari, Lecce |
| Basilicata | Matera |
| Calabria | Reggio Calabria |
| Sicilia | Palermo, Catania, Siracusa |
| Sardegna | Cagliari |

Total48 unique cities,19 represented regions; the PDF does not cover Molise. Do not silently substitute a generic48-city list. Coordinates and country/admin identity are independently checked against Wikidata, not inferred from the PDF's schematic dots.

## Functional interpretation

- Five core cities receive sourced editorial content first. Other43 remain honest index/city entries with no invented POIs.
- Caffè Sosta and Sera in cortile are illustrative and excluded unless independently verified. The detail layout is applied to a real attraction instead. No invented hours, prices, live opening badge, walking times or events.
- Saved starts empty and persists only in this browser/device with explicit notice and storage failure feedback. Never prepopulate the PDF's three fictional saves or imply an account.
- Real geographic outlines and points replace the schematic Italy drawing. Offline geographic overview offers city/place selection, zoom and pan; it does not promise directions, live tiles, navigation or a complete street directory. External navigation links use actual coordinates.
- Demo content has a dataset identifier and independent factual/media provenance; the existing database architecture is extended additively where safe. No production data or credentials are modified.

Acceptance and implementation tasks: [ITALY_IMPLEMENTATION_PLAN](ITALY_IMPLEMENTATION_PLAN.md). Actual comparison, verified results and deliberate differences are recorded in [ITALY_REPORT](ITALY_REPORT.md). The two bottom-of-PDF alternative mobile-home explorations are reference variants, not additional application modes; the main home composition is implemented.
