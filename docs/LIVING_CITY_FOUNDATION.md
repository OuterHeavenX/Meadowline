# Meadowline Living City Foundation

## Status

**Production on `main`.** Historical implementation branch: `feature/living-city-foundation`. Architectural source: `agent/architecture-refactor`.

Production consumers now include Housing 2.0, City Growth 1.0 / 1.1, City Hall 1.0 and Roads & Mobility 2.0. Recreation 2.0 / Town Life is the current development consumer on `feature/recreation-2-town-life`.

Verified Recreation starting production SHA: `6ed2225ba008a91610715c63aca44e4cd02486bb`.

## Static-browser architecture

Meadowline remains native ES modules + Canvas 2D/isometric rendering. No React/Vue application, server runtime, or gameplay build process is required during normal play. The world remains 44×44.

## Authoritative building registry

`src/buildings/registry.js` remains the shared source for building identity, category, cost, shortcuts, placement metadata, service metadata, save defaults, progression unlock metadata, civic upgrade metadata and Recreation facility metadata wherever practical.

Roads & Mobility 2.0 evolved registry ID `road`; it did not introduce a second Road registry or duplicate save identity.

Recreation 2.0 keeps existing internal ID `park` compatible as a 1×1 Pocket Green and adds registry-driven Pocket Park, Playground, Picnic Green, Sports Court and Town Park definitions. Multi-tile footprint metadata remains registry-owned.

## Reusable civic / resident-service architecture

Education remains the first real service provider.

Level 1 School: radius 7 / capacity 28.

School Level 2: Township + 650 coins → capacity 44 / radius 7.

Households generate demand from real population. Assignment is deterministic and capacity-bounded. Household Education remains persistent 0–100.

Recreation becomes the second major resident service/need. It deliberately shares the useful provider concepts—demand, capacity, local reach, cached recomputation, local Look truth and City Hall aggregation—without copying Education's student-assignment semantics mechanically.

Recreation demand is aggregate household population. Representative citizens remain visual agents only. Public-space service additionally requires a real Road route to at least one facility perimeter entrance.

Future Safety, Fire, Healthcare, Employment, Transit, Sanitation and similar systems should reuse these proven architectural patterns only where their semantics genuinely fit.

## Reusable multi-tile facility foundation

Recreation 2.0 introduces the first permanent generalized large-facility occupancy model.

One multi-tile facility is represented by:

- one authoritative root building at its anchor;
- registry footprint metadata;
- derived internal `facilityPart` occupancy markers that point back to the root.

This means one 4×4 Town Park is one simulation provider, one saved building, one cost/refund and one Look target—not sixteen fake Parks.

Full-footprint placement validates world bounds, opened parcels, terrain and existing occupancy before any write occurs. Placement is atomic. Removal from any occupied footprint tile resolves the root and clears the complete facility. Look from any child tile resolves the same root.

The foundation is intentionally reusable by future Police Stations, Fire Stations, hospitals and other civic buildings without introducing Recreation-specific footprint databases.

## Local truth vs citywide truth

Permanent UI philosophy:

**Local providers explain local service. City Hall summarizes citywide service.**

A House explains its household. A School explains its own Education service. A Recreation facility explains local capacity/demand/access/visitors. City Hall summarizes real citywide Recreation without owning the simulation or inventing a Recreation Health score.

## Cached recomputation

Civic services and city summaries are cached/invalidated on relevant state changes rather than rebuilt every render frame.

Roads & Mobility applies the same rule to vehicle routing. Existing Road connectivity is reused; vehicle routes are generated on trips/topology changes, cached by network version, and invalidated when Road/Rail crossing topology changes. There is no path search per vehicle per render frame.

Recreation applies the same performance philosophy. Household-to-facility Road accessibility is recomputed when meaningful topology/population changes invalidate the service model, with connectivity results cached during an assignment pass. There is no Recreation path search per resident per frame.

## Save Schema V3

Current key: `meadowline.v3`.

V1/V2 migration and defensive optional building state remain permanent compatibility requirements.

Roads & Mobility 2.0 did not require Save V4. Existing Road objects gained new visual/mobility semantics while crossing metadata remained generic bounded building `state`.

Recreation 2.0 also retains V3. Multi-tile facility roots are persisted; derived footprint markers are reconstructed from type + anchor + registry footprint. Historical 1×1 V1/V2/V3 building positions remain authoritative during migration. New malformed/overlapping multi-tile facilities reject safely rather than corrupting neighbors.

## Mobile input evolution

Production touch contract remains:

- tap = one intentional action;
- immediate one-finger drag = camera navigation regardless of selected build tool;
- second finger = pinch/zoom, cancelling pending build/paint intent;
- Road/Rail/Tree/Remove drag painting requires a deliberate short hold before movement;
- pointer cancellation and UI shielding remain required.

Multi-tile Recreation buildings use the same normal-building intent path. A successful tap places one entire legal facility. Immediate drag pans. Pinch cancels. Nothing writes on touchstart.

## Shared movement architecture

Before Roads 2.0, representative citizens already used the Road graph and the shared 44×44 breadth-first `findPath()` helper. Roads 2.0 preserved that route architecture and moved pedestrian presentation to stable sidewalk-biased offsets.

Recreation 2.0 extends—not replaces—that movement model:

street/sidewalk route
→ deterministic facility perimeter entrance
→ simple facility-local leisure point
→ bounded stay
→ normal departure.

Facility-local points are render/simulation-local fractional coordinates and do not create a second whole-world pathfinder. No navmesh, ECS, global A* rewrite, demographic rewrite or one-graph-per-citizen architecture is added.

## Inspection and service visualization

Look cards expose local state. City Hall remains the deliberate whole-city inspection destination.

House Look adds one concise Recreation explanation. Facility Look reports local capacity, nearby demand, visitors and street connection. City Hall reports citywide facilities, demand, served, capacity and underserved residents.

Map readability remains the primary feedback channel.

## Diagnostics and tests

Developer-only `?debug=1`, browser regressions and module-hygiene checks remain required.

Roads diagnostics remain. Recreation adds facilities, demand, capacity, served/underserved residents, visitors, recomputes, route attempts/failures, multi-tile facility count, occupied footprint tiles and malformed-facility cleanup.

The Recreation regression suite is additive; no earlier test is removed or weakened to make it pass. Historical CI failures remain part of the technical record.

## Physical validation record

Previously physically demonstrated Living City / School behavior, City Growth evidence and all historical unchecked items remain preserved in `docs/IPHONE_ACCEPTANCE.md`.

City Hall and Roads were explicitly owner-approved for production merges. Release approval is recorded as source-control history and does not retroactively check every individual historical device box.

Recreation 2.0 physical validation remains pending owner iPhone/iPad testing.

## Current consumer / next handoff

Current development consumer: `feature/recreation-2-town-life`.

Likely next major system after Recreation acceptance is Safety / Police / Crime, but that remains roadmap-only and must not start automatically. Future Police/Fire/Healthcare facilities should reuse the multi-tile occupancy foundation and Roads route infrastructure without owning or duplicating those systems.
