# Meadowline City Hall 1.0 / Civic Center Foundation

## Status

**Current development milestone.**

Branch: `feature/city-hall-civic-center`

Starting production SHA: `1d9e7e9c110fad465b332ef85503d102ed5af6e0`

That starting SHA is the verified `main` produced by the owner-approved merge of City Growth PR #4. City Hall work is not on production `main` and must not merge before owner iPhone/iPad acceptance.

## Product rule

**Local buildings explain local conditions. City Hall explains citywide conditions.**

House Look remains authoritative for one household's residents, Mood, Education, Desirability and Housing evolution. School Look remains authoritative for one School's students, capacity and level. City Hall only summarizes the city's real simulation state; it does not own Housing, Education, City Growth, Town Goals, parcels or economy simulation.

## Architecture

Meadowline remains a static-browser, native-ES-module, Canvas 2D, isometric, mobile-first game. No UI framework, backend runtime, renderer replacement, world enlargement, A* rewrite or ECS rewrite was introduced.

Authoritative building identity remains `src/buildings/registry.js`.

Citywide read models live in `src/simulation/city-summary.js`. UI queries simulation; DOM state is never authoritative.

## Registry metadata

Registry ID: `cityHall`

Category: `civic`

Unlock stage: Settlement

Base placement cost: **90 coins**

Footprint: **1×1**

Unique: **one active civic center per city**

The one-tile footprint is deliberate. The production building architecture is robustly one-tile; City Hall 1.0 prioritizes safe placement, removal, saves, Look hit-testing and touch behavior over introducing a multi-tile subsystem during a civic-management milestone.

## Levels

| Level | Name | Stage required | Cost | Visual progression |
| --- | --- | --- | ---: | --- |
| 1 | Town Office | Settlement | placement 90 | modest civic facade, broad entrance, simple flag |
| 2 | Village Hall | Village | 280 | taller hall, more windows, steps and tower |
| 3 | Town Hall | Township | 520 | stronger masonry silhouette, taller civic tower and readable clock |
| 4 | Meadowline City Hall | Growing Town | 850 | mature roofline/cupola, clock, flag, steps and landscaping |

Levels use generic `state.level` and the existing civic-upgrade mechanism first proven by School Level 2. There is no Level 5.

Stage advancement unlocks the next civic improvement. City Hall upgrades do **not** hard-gate City Growth 1.0/1.1.

## Placement and removal

City Hall uses the normal safe-touch building path:

- tap places one building;
- immediate one-finger drag pans;
- a second pointer/pinch cancels pending placement intent;
- the build tool remains armed according to the normal building contract;
- explicit × cancels the tool.

`unique: true` is enforced during placement. A second active City Hall is rejected.

Removal requires an explicit confirmation. Removing City Hall does not alter city stage, opened parcels, Town Goals, population, Housing or Education. The appropriate civic center may be rebuilt later.

## Legacy city migration

Existing V3 cities are not force-edited. No City Hall is auto-placed and no coins are deducted. The Town Office becomes available through the registry, and a contextual Town Goal can suggest establishing it after the settlement has begun.

V3 remains `meadowline.v3`.

City Hall saves only normal building state, including `state.level`. Derived city summaries are not persisted.

Malformed City Hall levels are clamped to 1–4. Duplicate saved City Halls are sanitized by retaining the first valid civic center and skipping later duplicates rather than crashing or rewriting city progression.

## City summary API

`getCitySummary()` provides an aggregate, cached read model containing:

### Overview

- current city stage
- population
- total and occupied homes
- exact Cottage count
- exact Town Home count
- exact Established Home count
- average Mood
- average Education
- average Desirability
- treasury

### Town Goals

The panel reads the existing `S.wishes` / Town Goal engine and `goalAt()` progress. It does not create a parallel City Hall task system.

### City Growth

The panel reads `cityStage()` and `nextStageProgress()`. Existing four stages and all stage requirements remain unchanged. Growing Town shows that Meadowline has reached its current civic stage rather than inventing Stage 5.

### Land

The panel reads `LAND_PARCELS` and `parcelStatus()` and purchases through `unlockParcel()`. Parcel ownership is not duplicated. Purchase still requires explicit confirmation.

### Finances

Treasury uses current `S.coins`.

The income breakdown uses the real `S.lastPay` created by `simulation/economy.js`:

- residential taxes
- Trade
- milling
- Town grant
- total last payday

Before the first payday, City Hall shows less rather than fabricating an estimate.

### Services

Education is the only current citywide service module:

- School count
- Expanded School count
- students served
- demand
- waiting demand
- average Education

No fake Recreation, Safety, Fire, Healthcare, Employment or Transit meters exist.

## Future service hook

The summary structure intentionally leaves City Hall as the future home for real citywide modules. Recreation 2.0 can later add aggregate Recreation information while House/Park Look continues to explain local truth.

No Recreation simulation was implemented in this milestone.

## Town Goals integration

Contextual civic goals were added to the existing progression-aware goal engine:

- Settlement: establish a Town Office, only after basic roads and occupied homes exist;
- Village: improve to Village Hall;
- Township: improve to Town Hall;
- Growing Town: complete Meadowline City Hall.

Eligibility checks real stage/building state. Civic goals coexist with Housing, Education, land, Trade, transport and environment goals rather than replacing them.

The Tree target ladder was audited. A late-stage target of 38 trees remains possible, but earlier stages now use smaller stage-aware ladders so the same target is not blindly applied to a young settlement.

## Rendering

`src/rendering/city-hall.js` draws the civic building with the existing Canvas 2D primitives. Level readability relies on silhouette, height, roofline, entrance, tower/cupola, clock, steps, flag and landscaping rather than microscopic labels.

City Hall provides no map-wide Mood or Desirability magic bonus in 1.0.

## Caching and performance

`src/simulation/city-summary.js` caches its aggregate read model behind a compact signature of relevant city state. City Hall is effectively free while closed; there is no per-citizen DOM list or persistent municipal record per resident.

`?debug=1` reports City Hall count/level, city-summary recomputes/invalidations, panel opens, occupied homes, Education and Desirability alongside existing diagnostics.

## Automated tests

`tests/city-hall-regression.html/.js` covers:

- registry identity/category/cost/footprint/uniqueness;
- four levels and no Level 5;
- unchanged four-stage City Growth ladder and key requirements;
- first legal placement vs duplicate rejection;
- stage-gated upgrades and exact deductions;
- exact Housing tier summary;
- Mood/Education/Desirability aggregate values;
- Education demand/waiting summary;
- real last-payday finance categories;
- contextual Town Office and Village Hall goal gating.

The main workflow retains all prior regression suites and adds City Hall 1.0.

## Automatic validation status

Pending final branch workflow result at the time this record was created. A green workflow is automated proof only.

## Physical validation status

**Not yet physically accepted.**

The canonical physical checklist remains `docs/IPHONE_ACCEPTANCE.md`. No City Hall physical item may be checked until the owner directly exercises it on iPhone/iPad.

## Next roadmap handoff

After City Hall is physically accepted and explicitly merged, the planned next major simulation milestone is **Recreation 2.0 / Town Life**.

City Hall is already shaped to summarize future citywide Recreation without owning the underlying Recreation simulation.
