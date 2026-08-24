# Meadowline Roadmap

## Current development — Living City 3.0 / Municipal Integration

The integration candidate is stacked on the validated but unmerged Recreation 2.0 branch. It adds the beginner tutorial, safe pond terrain painting, Employment/Prosperity, bounded Crime/Police, Fire response, Healthcare, a shared emergency-vehicle layer, truthful City Hall summaries, transient world feedback and renderer capability/quality boundaries. It is **not Production** until review, automatic validation and owner physical acceptance are complete. See `docs/LIVING_CITY_3.md`.

Meadowline is evolving from a calm small city builder into a deeper living-city simulation while preserving its static browser architecture, native ES modules, isometric Canvas 2D presentation, mobile-first interaction, and low-stress character.

Status labels remain deliberate: **production**, **historical implementation**, **automatically validated**, **physically validated**, **current development**, and **roadmap only** are not interchangeable.

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

**Current development.**

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

## Likely next milestone — Safety / Police / Crime

**Roadmap only. Do not begin automatically.**

Recreation establishes reusable multi-tile municipal-facility architecture while Roads already provides representative route infrastructure. Together they make Police a natural likely next milestone, but its exact scope remains a separate owner decision after Recreation physical acceptance.

Potential future relationship:

Education + neighborhood quality + future safety pressure
→ Police coverage/response
→ Safety
→ Desirability.

Future Police Stations should reuse multi-tile facility placement/save/Look architecture rather than inventing a Police-specific footprint system.

## Later systems — order intentionally not fully locked

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

Do not enlarge the world, introduce chunk streaming, rewrite global pathfinding, replace Canvas 2D, add an ECS, or add a backend merely because future municipal systems exist.

The 44×44 map remains the production proving ground.

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

## Current Recreation merge gate

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
