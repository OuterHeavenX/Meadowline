# Meadowline Living City Foundation

## Status

**Production on `main`.** Historical implementation branch: `feature/living-city-foundation`. Architectural source: `agent/architecture-refactor`.

Production consumers now include Housing 2.0, City Growth 1.0 / 1.1 and City Hall 1.0. Roads & Mobility 2.0 is the current development consumer on `feature/roads-mobility-2`.

## Static-browser architecture

Meadowline remains native ES modules + Canvas 2D/isometric rendering. No React/Vue application, server runtime, or gameplay build process is required during normal play. The world remains 44×44.

## Authoritative building registry

`src/buildings/registry.js` remains the shared source for building identity, category, cost, shortcuts, placement metadata, service metadata, save defaults, progression unlock metadata, and civic upgrade metadata wherever practical.

Roads & Mobility 2.0 evolves registry ID `road`; it does not introduce a second Road registry or duplicate save identity.

## Reusable civic providers

Education remains the first real service provider.

Level 1 School: radius 7 / capacity 28.

School Level 2: Township + 650 coins → capacity 44 / radius 7.

Households generate demand from real population. Assignment is deterministic and capacity-bounded. Household Education remains persistent 0–100.

The provider layer is designed to support future Safety, Fire, Healthcare, Recreation, Employment, Transit, Sanitation and similar services only when those simulations actually exist.

## Local truth vs citywide truth

Permanent UI philosophy:

**Local providers explain local service. City Hall summarizes citywide service.**

A House explains its household. A School explains its own service. Future Parks should explain local Recreation.

City Hall reads authoritative systems rather than owning them. Roads & Mobility 2.0 follows this by exposing only real Mobility values—Road tiles, connected Road components, Rail crossings and active representative vehicles—without a fake congestion/Traffic Health score.

## Cached recomputation

Civic services and city summaries are cached/invalidated on relevant state changes rather than rebuilt every render frame.

Roads & Mobility applies the same rule to vehicle routing. Existing Road connectivity is reused; vehicle routes are generated on trips/topology changes, cached by network version, and invalidated when Road/Rail crossing topology changes. There is no path search per vehicle per render frame.

## Save Schema V3

Current key: `meadowline.v3`.

V1/V2 migration and defensive optional building state remain permanent compatibility requirements.

Roads & Mobility 2.0 does not require Save V4. Existing Road objects automatically gain new visual/mobility semantics. Road/Rail crossing metadata uses generic bounded building `state`; active vehicles, routes and lane geometry are transient/derived and are not persisted.

## Mobile input evolution

Production touch contract remains:

- tap = one intentional action;
- immediate one-finger drag = camera navigation regardless of selected build tool;
- second finger = pinch/zoom, cancelling pending build/paint intent;
- Road/Rail/Tree/Remove drag painting requires a deliberate short hold before movement;
- pointer cancellation and UI shielding remain required.

Road/Rail crossing creation is reached only through that normal intentional Road/Rail placement path. Pan/pinch does not get a special construction bypass.

## Shared movement architecture

Before Roads 2.0, representative citizens already used the Road graph and the shared 44×44 breadth-first `findPath()` helper. Roads 2.0 preserves that route architecture.

Pedestrians now render at stable sidewalk-side offsets derived from direction of travel instead of being visually scattered through the center of the Road.

Representative vehicles reuse the same Road connectivity and existing path helper through a mobility wrapper/cache. No navmesh, ECS, global A* rewrite or one-graph-per-citizen architecture was added.

This shared lightweight network is intentionally suitable for future Police cruisers, Fire engines and ambulances, but those simulations do not exist yet.

## Inspection and service visualization

Look cards expose local state. City Hall is the deliberate whole-city inspection destination.

Roads & Mobility does not add a large per-Road management panel. Map readability remains the primary feedback channel.

## Diagnostics and tests

Developer-only `?debug=1`, browser regressions and module-hygiene checks remain required.

Roads & Mobility adds diagnostics for Road tiles/components, Rail crossings, active vehicles/routes, route searches/failures/reroutes/despawns, Rail waits and Road-network invalidations.

The Roads regression suite is additive; no earlier test is removed to make it pass.

## Physical validation record

Previously physically demonstrated Living City / School behavior and City Growth evidence remain preserved in `docs/IPHONE_ACCEPTANCE.md`.

City Hall was explicitly owner-approved for production merge, but unchecked historical City Hall physical boxes remain unchecked because release approval is not retroactive test evidence.

Roads & Mobility 2.0 physical validation is pending.

## Current consumer / next handoff

Current development consumer: `feature/roads-mobility-2`.

After Roads acceptance, Recreation 2.0 / Town Life is the planned next major simulation milestone. Future Police/Fire/Healthcare systems may consume the mobility network later without owning or duplicating Road truth.
