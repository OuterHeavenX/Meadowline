# Meadowline Roadmap

Meadowline is evolving from a calm small city builder into a deeper living-city simulation while preserving its static browser architecture, native ES modules, isometric Canvas 2D presentation, mobile-first interaction, and low-stress character.

Status labels remain deliberate: **production**, **historical implementation**, **automatically validated**, **physically validated**, **current development**, and **roadmap only** are not interchangeable.

## Production baseline

Verified `main` at the start of Roads & Mobility 2.0:

`fcf7f8c02291c7cd1bc2a164522353b7476e81ef`

City Hall PR #5 was explicitly approved by the owner in the Roads milestone kickoff and merged to production. The merge does not retroactively check any previously unchecked physical item in `docs/IPHONE_ACCEPTANCE.md`.

Historical implementation branches remain preserved:

- `agent/architecture-refactor`
- `feature/living-city-foundation`
- `feature/housing-2`
- `feature/city-growth-progression`
- `feature/city-hall-civic-center`

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

**Current development.**

Branch: `feature/roads-mobility-2`.

Core relationship:

existing Road network
→ believable street rendering
→ sidewalk-biased pedestrians
→ lightweight vehicle routes
→ safe Road/Rail crossings
→ shared mobility infrastructure for future municipal vehicles.

Permanent decisions:

- evolve the existing Road tool; do not create another Road system;
- one world Road tile remains one progression/save/access Road tile;
- one tile visually contains sidewalk/curb/carriageway;
- pedestrians reuse the Road graph with stable sidewalk offsets;
- vehicles reuse the existing lightweight route search and bounded route cache;
- ambient cars/pickups/vans are representative, transient and capped;
- clean Road/Rail crossings preserve both networks through one V3 grid object;
- trains have crossing priority;
- no traffic-congestion/parking/commute simulator;
- no Police/Fire/Healthcare gameplay yet.

See `docs/ROADS_MOBILITY_2.md`.

## Milestone 6 — Recreation 2.0 / Town Life

**Next planned major simulation milestone after Roads & Mobility 2.0 is physically accepted and explicitly merged.**

Likely relationship:

Population + Density
→ Recreation demand
→ Parks / Recreation access
→ leisure satisfaction
→ Mood
→ Desirability
→ Housing.

Roads 2.0 should let citizens visibly approach recreation from sidewalks while vehicle lanes remain distinct from leisure space.

Do not begin Recreation automatically as part of Roads 2.0.

## Later systems — order intentionally not fully locked

Roads & Mobility now provides the shared foundation for later municipal response systems. Likely later systems include:

- Safety / Police / Crime
- Employment / Prosperity
- Fire / Emergency
- Healthcare
- Waterworks / Landscaping
- further transport evolution

Potential relationships:

Education → qualification → Employment / Prosperity → household stability / tax base.

Density + future safety pressure → Police coverage → Safety → Desirability.

Police Station → incident → cruiser dispatch → Road route → response.

Density → fire risk → Fire Station → engine dispatch → Road route → response/recovery.

Healthcare emergency → ambulance → Road route → response.

The exact sequence after Recreation remains a future playtesting decision. The critical owner decision is permanent: **Roads & Mobility 2.0 comes before Police/Fire/Healthcare because those systems need trustworthy streets.**

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

## Current gate

Roads & Mobility 2.0 may only move toward merge after:

- final branch automation is green;
- existing Road saves load without forced rebuilding or coin loss;
- streets clearly read as streets on iPhone/iPad;
- pedestrian sidewalk positioning is visually stable;
- representative vehicles stay on Roads and remain bounded;
- clean Road/Rail crossing works without deleting either network;
- train priority/wait-resume behavior is physically understandable;
- safe-touch Road painting/crossing creation remains trustworthy;
- Housing, City Growth, City Hall and Rail regressions remain green;
- dense 100+ citizen performance is physically acceptable;
- owner explicitly approves the merge.

Physical acceptance remains separate from CI.
