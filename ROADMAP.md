# Meadowline Roadmap

## Status as of production `main` at `af1be4943b62d7cf208178870afd65cef391ab0b`

**Current development — Social Fabric 1.0**, on `claude/game-upgrade-3o2630`.
Slices 1–5 (emergent districts; families, notable citizens, traits; careers
and standing; organisations; bosses, fronts, autonomous enforcement) are
production at `af1be49`; slice 6 (fame and entertainment culture), the last of
the milestone's first scope, is on the branch. Canonical document:
`docs/SOCIAL_FABRIC.md`.

**UI / HUD 2.0 is production**, merged through PR #11 (`da5698c`). Earlier
copies of this file and `README.md` listed it as current development long after
it shipped; that is corrected here.

**The world is 128×128**, since `d7c6b00` ("Grow the valley to 128x128 and cull
the sorted pass to the camera"). Every older document that says 44×44 — this
file, `README.md`, `docs/LIVING_CITY_FOUNDATION.md`, the performance figures in
`docs/IMPROVEMENT_REVIEW.md` §3 — describes the valley as it was. The
"Explicitly deferred architecture changes" section below records that this
superseded an earlier permanent-sounding decision, deliberately and by owner
direction, rather than pretending the decision was never made.

Meadowline is evolving from a calm small city builder into a deeper living-city
simulation while preserving its static browser architecture, native ES modules,
isometric identity, complete Canvas compatibility path, mobile-first interaction
and low-stress character. Nothing in this file changes that.

Status labels remain deliberate: **production**, **historical implementation**,
**automatically validated**, **physically validated**, **current development**,
and **roadmap only** are not interchangeable.

## Production since PR #10 — in merge order

Everything below is on `main`. Each landed with its regression suite green.

| Landed | What |
| --- | --- |
| PR #11 `da5698c` | **UI / HUD 2.0** — rebuilt HUD, Build catalog, City Hall, title screen. |
| PR #13, #14 | In-app email OTP and email + password authentication. |
| PR #15 | Improvement review fixes B1–B6, B8–B10, B14, B15 (`docs/IMPROVEMENT_REVIEW.md`). |
| `fa9ab95`…`ed6c49b` | **Save Manager 2.0** with cloud sync (`docs/SAVE_MANAGER_2.md`). |
| `d7c6b00` | **The valley grows to 128×128**; the sorted draw pass is culled to the camera. |
| `146adee` | Running costs (upkeep, county relief), the farm → mill → bakery food chain, four Wonders. |
| `606d05a` | Pedestrians on the pavements; signalled crossroads. |
| `d83ed36`, `5718f99`, `68fec3b` | **Authored models**: the Blender → GLB → ES-module pipeline (`assets/ASSETS.md`); Wonders, then the whole town; instanced on the GPU renderer. |
| `2e48a42` | Weather merged in: drifting clouds, real rain, storms. |
| `d921b20` | Three pre-existing test failures fixed; roads no longer repaint as the camera moves. |
| PR #17 `80ba559` | **Visual upgrade**: per-house colour variety, hashed meadow, warmer light; title screen rebuilt; real build-card thumbnails; City Hall panel reworked. |
| `8f3282e` | Road access reported for every building that needs one (was houses only, and anchor-tile only); **buildings face the street**; **Move tool** relocates buildings. |
| `a8e4f41` | **Streets instanced**: 8,382 → 387 scene objects, 2,714 → 264 draw calls, rebuild 109 → 28 ms. |
| `e4b8834` | Road access on every card; lot path moved to the door; hint bar clears the tool bar. |
| `f0cf125` | **Sim performance**: a recreation cache check that cost 19× the work it guarded, once per home, removed. 0.9 s tick at 1,120 pop: ~61 → ~5 ms. |
| `1d192f9` | **Social Fabric slice 1 — emergent districts.** |
| `3954911` | **Social Fabric slices 2 and 3** — notable families and traits; careers at real workplaces, standing from conditions. |
| `8342585` | **Social Fabric slice 4** — organisations that nobody built: three conditions or nothing, place-based names, staged growth, prosperity and police as decline. |
| `af1be49` | **Social Fabric slice 5** — bosses who are existing citizens, fronts that stay businesses, police who open and work cases on their own. |
| branch | **GPU actor parity** — the low-poly scene now draws walking people, typed emergency vehicles with a working hose, burning roofs, burglars, patients and stretchers, boats and three-car trains, as the Canvas path always did. |

## Milestone 7 — Social Fabric 1.0

**Current development.** Canonical document: `docs/SOCIAL_FABRIC.md`.

Emergent citizen culture, district identity, careers, social classes, factions,
organized crime, fame and family legacies. The permanent rule:

**The player builds the city. The citizens decide what the city becomes.**

No UI may ever offer a social outcome as a control. The regression asserts the
exported surface carries no setter.

Slices, in order:

1. **Districts** — derived from where the player built and what divides it,
   named and described by what stands in them. *Production, `1d192f9`.*
2. **Families, notable citizens, traits** — bounded households the valley
   comes to know, surnames drawn outcome-blind from one shared pool.
   *Production, `3954911`.*
3. **Careers and standing** — real jobs at real workplaces; class read from
   conditions, never trade. *Production, `3954911`.*
4. **Organisations** — three conditions at once or nothing, place-based names,
   staged growth, prosperity and police as causes of decline. *Production,
   `8342585`.*
5. **Bosses, fronts, autonomous enforcement** — a boss is always an existing
   named citizen; a front is a business that stays one; the police open, work
   and act on cases on their own. *Production, `af1be49`.*
6. **Fame and entertainment culture** — performing careers at real venues,
   renown from talent, crowd and occasion, Entertainment and Nightlife
   identities, a slight positive culture tilt. *On the branch.*

The milestone brief contradicts itself on naming (PART 7/8 worked examples vs
PART 27); PART 27 wins and the resolution is structural. See the document.

## Production baseline

Verified `main` at the start of Recreation 2.0:

`6ed2225ba008a91610715c63aca44e4cd02486bb`

Roads & Mobility PR #6 was explicitly approved by the owner and merged to production before the Recreation branch was created. That release decision does not retroactively turn every unchecked historical Roads device item into physical test evidence; `docs/IPHONE_ACCEPTANCE.md` remains canonical.

Historical implementation branches remain preserved:

- `agent/architecture-refactor`
- `feature/living-city-foundation`
- `feature/housing-2`
- `feature/city-growth-progression`
- `feature/city-hall-civic-center`
- `feature/roads-mobility-2`

## Milestone 1 — Living City Foundation / School 2.0

**Production.**

Authoritative building registry, reusable civic-provider architecture, persistent household Education, capacity-bounded School assignment, Save V3 migration, Look explanations, diagnostics and mobile pinch/build safety.

## Milestone 2 — Housing 2.0 / Neighborhood Desirability

**Production.**

Road + Mood + Education + Desirability → residential evolution → higher capacity/tax value → more residents → greater civic demand.

## Milestone 3 — City Growth 1.0 / 1.1

**Production through merged PR #4.**

Settlement → Village → Township → Growing Town, Meadowline Center + progressive parcels, stage unlocks, Town Goals, safe touch, mobile Build refinement and School Level 2.

Historical physical failures remain preserved in the canonical acceptance record.

## Milestone 4 — City Hall / Civic Center Foundation

**Production through merged PR #5.**

City Hall established Meadowline's civic centerpiece and the permanent rule:

**Local buildings explain local conditions. City Hall explains citywide conditions.**

Town Office → Village Hall → Town Hall → Meadowline City Hall.

City Hall summarizes real Housing, Town Goals, City Growth, land, finances and Education without owning those systems or inventing fake meters.

## Milestone 5 — Roads & Mobility 2.0

**Production through owner-approved merged PR #6.**

Core relationship:

existing Road network
→ believable street rendering
→ sidewalk-biased pedestrians
→ lightweight vehicle routes
→ safe Road/Rail crossings
→ shared mobility infrastructure for future municipal vehicles and public destinations.

Permanent decisions:

- evolve the existing Road tool; do not create another Road system;
- one world Road tile remains one progression/save/access Road tile;
- one tile visually contains sidewalk/curb/carriageway;
- pedestrians reuse the Road graph with stable sidewalk offsets;
- vehicles reuse the existing lightweight route search and bounded route cache;
- ambient cars/pickups/vans are representative, transient and capped;
- clean Road/Rail crossings preserve both networks through one V3 grid object;
- trains have crossing priority;
- no traffic-congestion/parking/commute simulator.

See `docs/ROADS_MOBILITY_2.md`.

## Milestone 6 — Recreation 2.0 / Town Life

**Production through merged PR #7.**

Branch: `feature/recreation-2-town-life`.

Draft PR: #7.

Core relationship:

Population + Housing density
→ Recreation demand
→ connected public-space capacity/access
→ Recreation satisfaction
→ Mood
→ Desirability
→ Housing quality.

Permanent design direction established in this milestone:

- old saved `park` remains a compatible 1×1 Pocket Green;
- new Recreation facilities consume visibly more land than individual Houses;
- registry footprints become reusable multi-tile facility architecture;
- one facility owns many occupied world tiles through a root + derived occupancy model;
- full-footprint placement/removal is atomic;
- Save V3 persists roots and reconstructs child occupancy;
- Recreation demand comes from real household population, never representative actor count;
- Recreation capacity is finite;
- access requires local reach plus a real Road route to a perimeter facility entrance;
- one valid street/sidewalk entrance is enough; facilities do not require Roads on every side;
- representative pedestrians reuse the Roads movement architecture, then transition into bounded facility-local leisure states;
- public-space Mood/Desirability effects are bounded and do not rewrite Housing thresholds;
- City Hall reports truthful Recreation aggregates;
- Town Goals only suggest Recreation when real demand warrants it;
- no Police/Crime/Fire/Healthcare/Employment gameplay is implemented here.

Initial facility family:

- Pocket Park — 2×2 — Settlement
- Playground — 2×2 — Village
- Picnic Green — 3×3 — Village
- Sports Court — 2×3 — Township
- Town Park — 4×4 — Growing Town

A separate Civic Park was deliberately not added; the milestone stays focused on five distinct public-space types plus legacy Pocket Greens.

See `docs/RECREATION_2.md`.

## Historical — Safety / Police / Crime as the likely next milestone

**Superseded: shipped inside Living City 3.0 (PR #8) as Police, Fire and Healthcare dispatch.** The historical reasoning below is retained as architectural memory; the current implementation status is recorded at the top of this file and in `docs/LIVING_CITY_3.md`.

Recreation establishes reusable multi-tile municipal-facility architecture while Roads already provides representative route infrastructure. Together they make Police a natural likely next milestone, but its exact scope remains a separate owner decision after Recreation physical acceptance.

Potential future relationship:

Education + neighborhood quality + future safety pressure
→ Police coverage/response
→ Safety
→ Desirability.

Future Police Stations should reuse multi-tile facility placement/save/Look architecture rather than inventing a Police-specific footprint system.

## Later systems — order intentionally not fully locked

This section is historical pre–Living City 3 planning. Its listed systems are now part of the current integration candidate at deliberately lightweight scope; further expansion remains playtest-sensitive.

Likely later systems include:

- Employment / Prosperity
- Fire / Emergency
- Healthcare
- Waterworks / Landscaping
- further transport evolution

Police Station → incident → cruiser dispatch → Road route → response.

Density → future fire risk → Fire Station → engine dispatch → Road route → response/recovery.

Healthcare emergency → ambulance → Road route → response.

The exact sequence after Recreation remains playtest-sensitive.

## Explicitly deferred architecture changes

Do not introduce chunk streaming, rewrite global pathfinding, replace Canvas 2D,
add an ECS, or add a backend merely because future systems exist.

**Superseded:** this section previously said "do not enlarge the world" and
"the 44×44 map remains the production proving ground." The valley was enlarged
to 128×128 at `d7c6b00` by owner direction, without chunk streaming, without a
pathfinding rewrite and without a save version. That decision stands and the
old wording is kept here so the change is visible rather than silent. The
performance work at `a8e4f41` and `f0cf125` is what made the larger valley
cheap enough on a phone; `docs/IMPROVEMENT_REVIEW.md` §3's figures predate it
and should be read as eight times smaller than the map they now apply to.

## Permanent design principles

Meadowline should remain:

- peaceful
- understandable
- charming
- mobile friendly
- forgiving
- progressively deeper
- map-first rather than dashboard-first

Do not introduce premium currencies, energy systems, monetization pacing, arbitrary waiting gates, repetitive busywork, full traffic management or violent citizen injury simulation.

## Historical Recreation merge gate

Recreation 2.0 may only move toward merge after:

- final exact-head automation is green;
- old 1×1 Parks survive existing saves without forced expansion or coin loss;
- multi-tile placement/removal/Look/save behavior is physically understandable;
- Pocket Park, Playground, Picnic Green, Sports Court and Town Park are visually distinct on owner hardware;
- facility entrances visibly connect to Roads/sidewalks;
- representative citizens visibly reach and use Recreation without route chaos;
- demand/capacity/underserved values remain understandable;
- House Look and City Hall Recreation summaries remain readable;
- safe touch remains trustworthy with large footprints;
- Housing, Education, City Growth, City Hall, Roads/Rail and Save regressions remain green;
- developed 100+ citizen performance is physically acceptable;
- owner explicitly approves the Recreation merge.

Physical acceptance remains separate from CI.

## Living City 3.1 — AAA Visual / Release

**Production through merged PR #9.**

Branch: `feature/living-city-3-1-aaa-visual`, based on the exact unmerged Living City 3 candidate.

This focused pass productionizes the renderer boundary with a stable WebGL2 presentation layer and continuous Canvas fallback, graphics presets, richer terrain/Road/water/night/weather treatment, municipal incident arrival/working/return presentation, restrained procedural audio, truthful municipal Look/Town Goal completion, and measurable diagnostics. WebGPU remains optional future research rather than a runtime requirement. It does not add another simulation layer, save version, map expansion or progression stage.

See `docs/RENDERING_2.md`. Merge still requires exact-head automation, owner physical acceptance of the stacked prerequisites and explicit approval.

## Visual Cohesion 3.1.1 — art-direction release

**Production through merged PR #10.**

Branch: `feature/visual-cohesion-3-1-1`, based on exact Living City 3.1 candidate `455acd193e1b90d0ab3cae81ee5cbd3e66c41b61`.

This focused child pass establishes distinct residential/commercial/civic silhouettes, deterministic neighborhood variation, Road adjacency masks and clean joins, contextual terrain/parcel colors, pond banks/depth, a diorama base and bounded vegetation composition. It deliberately adds no gameplay system, save version, map expansion or progression stage.
