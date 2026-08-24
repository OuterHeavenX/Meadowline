# Meadowline

Meadowline is a calm, mobile-first isometric living-city builder. It remains a lightweight static browser game built with native ES modules, a Canvas 2D world renderer and an optional WebGL2 presentation pass. Normal play requires no React/Vue application, Node process, server runtime, backend dependency or mandatory online service.

## Production status

Verified production `main` at the start of Recreation 2.0:

`6ed2225ba008a91610715c63aca44e4cd02486bb`

That production commit includes:

- Living City Foundation / School 2.0
- Save V3
- Housing 2.0 / Neighborhood Desirability / Residential Evolution
- City Growth 1.0 / 1.1
- progressive land parcels
- Settlement → Village → Township → Growing Town
- Town Goals
- safe-touch navigation and mobile Build UI refinement
- School Level 2
- City Hall 1.0 / Civic Center Foundation
- Roads & Mobility 2.0 through owner-approved merged PR #6

Historical implementation branches remain preserved, including:

- `agent/architecture-refactor`
- `feature/living-city-foundation`
- `feature/housing-2`
- `feature/city-growth-progression`
- `feature/city-hall-civic-center`
- `feature/roads-mobility-2`

## Current development

Recreation prerequisite branch: `feature/recreation-2-town-life`

Draft PR: **#7 — Recreation 2.0 / Town Life — Multi-Tile Facilities, Recreation Demand & Living Public Spaces**

Integration branch: `feature/living-city-3-aaa-municipal`

Visual release-candidate child branch: `feature/living-city-3-1-aaa-visual`

Current milestone: **Living City 3.1 / AAA Visual Completion**, stacked transparently on the validated, unmerged Living City 3 candidate. Recreation, Living City 3.0 and 3.1 remain draft development; none is Production or physically accepted.

Living City 3.1 adds an optional one-pass WebGL2 presentation layer with a continuously available Canvas fallback, Auto/GPU/Compatibility renderer selection, four graphics presets, richer terrain/water/Road/weather treatment, stronger municipal incident presentation, and lightweight procedural audio. WebGPU remains diagnostic-only. See `docs/RENDERING_2.md`.

The milestone makes public space a real resident need and introduces reusable multi-tile facility architecture without enlarging the 44×44 world or replacing Meadowline's lightweight pathfinding/rendering stack.

## Permanent product architecture

World: **44×44**.

Progression cities begin in the 20×20 Meadowline Center and can open eight additional parcels without regenerating terrain.

City stages remain exactly:

1. Settlement
2. Village
3. Township
4. Growing Town

Current living-city relationship now includes:

Population + Housing density
→ Recreation demand
→ connected facility capacity/access
→ Recreation satisfaction
→ Mood
→ Neighborhood Desirability
→ residential evolution.

Housing remains authoritative for residential tiers and does not downgrade homes.

City Hall preserves the UI rule:

**Local buildings explain local conditions. City Hall explains citywide conditions.**

## Roads & Mobility 2.0 — production

Roads & Mobility 2.0 is production through merged PR #6. The existing Road tile remains authoritative for placement, saves, Housing access and City Growth Road counts while visually providing carriageway + curb/sidewalk space.

Pedestrians reuse the existing Road graph with stable sidewalk-biased rendering. Representative compact cars, pickups and service vans remain bounded and transient. Clean perpendicular Road/Rail crossings retain one V3 grid object with dual-network semantics and train priority.

Recreation is the first major post-Roads gameplay consumer of sidewalk-separated pedestrian town life.

## Recreation 2.0 / Town Life

The existing internal `park` ID remains a compatible 1×1 **Pocket Green** for old saves. It is never automatically expanded, moved, rebuilt or charged again.

New Recreation facilities are registry-driven:

| Facility | Footprint | Stage | Cost | Capacity | Reach |
| --- | ---: | --- | ---: | ---: | ---: |
| Pocket Park | 2×2 | Settlement | 70 | 12 | 5 |
| Playground | 2×2 | Village | 95 | 18 | 5 |
| Picnic Green | 3×3 | Village | 150 | 24 | 6 |
| Sports Court | 2×3 | Township | 190 | 28 | 6 |
| Town Park | 4×4 | Growing Town | 340 | 55 | 8 |

Multi-tile facilities use one authoritative root building plus derived footprint-occupancy markers. Placement validates the entire footprint atomically. Look/Remove on any footprint tile resolves to the root. Save V3 persists only the root and reconstructs occupancy from registry footprint metadata.

Recreation demand comes from real occupied-house population, not representative actors. Service is finite and requires both local reach and a real Road route from the household to at least one facility perimeter entrance. A facility needs one logical street/sidewalk connection, not Roads around every edge.

Representative pedestrians may take bounded afternoon leisure trips over the existing Road network, enter a Recreation facility, use simple facility-local leisure points, then leave. No global pathfinding rewrite or one-resident-one-actor simulation is introduced.

## Recreation, Mood and Desirability

The former geometric Park Mood stack is retired in favor of one bounded Recreation-satisfaction Mood contribution. Recreation also contributes a smaller bounded direct Desirability component. Housing tier thresholds, capacities, tax multipliers, timers and the non-downgrade rule remain unchanged.

## City Hall Recreation summary

City Hall reads real Recreation state:

- Recreation facilities
- residents served / demand
- available capacity
- underserved residents
- representative visitors now

There is no invented Recreation Health percentage.

## Save system

Current key: `meadowline.v3`.

Recreation 2.0 does not require Save V4. V1/V2 migration remains supported. Existing 1×1 Parks remain in place. Multi-tile child occupancy is derived rather than redundantly persisted. Corrupt/overlapping facility entries are rejected deterministically without crashing neighboring state.

## Performance and diagnostics

Recreation assignment is invalidated/recomputed on meaningful topology/population changes rather than every render frame. Road connectivity searches are cached. Representative visitors are bounded by the existing citizen philosophy.

`?debug=1` includes Recreation facilities, capacity, demand, served/underserved residents, active visitors, Recreation route searches/failures/recomputes, multi-tile facility counts and occupied facility tiles alongside existing Mobility/Housing/City Growth diagnostics.

## Validation policy

Automated proof and physical-device proof remain separate.

The workflow covers:

- JavaScript syntax
- module hygiene/import cycles
- Living City + Housing regression
- City Growth 1.0 regression
- City Growth 1.1 Town Goal/touch regression
- City Hall 1.0 regression
- Roads & Mobility 2.0 regression
- Recreation 2.0 / Town Life regression
- Living City 3 municipal, water, employment, dispatch and feedback regression

Historical failures are preserved rather than rewritten. Physical Recreation acceptance remains owner-only in `docs/IPHONE_ACCEPTANCE.md`.

## Running locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Regression pages include:

- `/tests/regression.html`
- `/tests/city-growth-regression.html`
- `/tests/city-growth-1-1-regression.html`
- `/tests/city-hall-regression.html`
- `/tests/roads-mobility-regression.html`
- `/tests/recreation-regression.html`
- `/tests/living-city-3-regression.html`
- `/tests/living-city-3-1-regression.html`
- `/tests/renderer-benchmark.html`

Module hygiene:

```bash
node tests/module-hygiene.mjs
```

## Roadmap

Production:

Living City / School → Housing 2.0 → City Growth 1.0 / 1.1 → City Hall 1.0 → Roads & Mobility 2.0

Current development:

**Recreation 2.0 / Town Life prerequisite → Living City 3.0 / Municipal Integration candidate → Living City 3.1 / AAA Visual Completion candidate**

See `docs/RECREATION_2.md`, `docs/LIVING_CITY_3.md` and `docs/RENDERING_2.md` for the canonical development records.
