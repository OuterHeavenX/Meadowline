# Meadowline Roads & Mobility 2.0

## Status

**Current development milestone.**

- Branch: `feature/roads-mobility-2`
- Draft PR: **#6 — Roads & Mobility 2.0 — Streets, Sidewalks, Vehicles & Rail Crossings**
- Verified production starting SHA: `fcf7f8c02291c7cd1bc2a164522353b7476e81ef`
- Production prerequisite: City Hall 1.0 merged through PR #5 after explicit owner approval
- Save key: `meadowline.v3`
- World: 44×44
- Renderer: native Canvas 2D / isometric
- Physical acceptance: pending owner iPhone/iPad testing

This file is the canonical technical record for Roads & Mobility 2.0. Automated validation and owner-device validation remain separate.

## Product rule

One existing Road tile remains one Road tile for saves, economy, Housing access and City Growth progression. Roads are visually reinterpreted as compact small-town streets rather than replaced by a second network.

A street tile now communicates:

sidewalk / curb → vehicle carriageway → curb / sidewalk.

The milestone establishes believable movement infrastructure without becoming a traffic-management simulator.

## Baseline audit

Before Roads 2.0:

- Road cost was 3 coins and Road unlocked at Settlement.
- Road and Rail could bridge water at 3× normal placement cost.
- Road and Rail were mutually exclusive on land because the grid stores one building object per tile.
- Housing linked state and residential evolution used Road adjacency.
- Settlement → Village counted 10 Road tiles.
- citizens routed on Road tile centers using the shared 44×44 breadth-first `findPath()` and `stepFrom()` helpers.
- citizen rendering used an arbitrary screen-space horizontal spread rather than semantic sidewalks.
- trains used the same lightweight step architecture over Rail tiles.
- Save V3 persisted grid buildings and bounded generic `state`, while citizens/trains/boats were regenerated runtime actors.

Roads & Mobility 2.0 preserves those authoritative semantics unless explicitly documented below.

## Street rendering

The world tile remains 64×32 isometric pixels at zoom 1. A Road still consumes one world tile.

Road rendering now uses:

- a pale edge/sidewalk field;
- a narrower darker central carriageway;
- curb/edge definition;
- restrained center guidance on simple straight/corner segments;
- automatic continuity into neighboring Road tiles;
- subtle crosswalk bars on degree-3/4 intersections;
- existing bridge lift and pier architecture over water.

The visual goal is a cozy residential/mixed-use street, not a highway.

## Pedestrian sidewalk model

Citizen pathfinding is unchanged: pedestrians still use the existing Road connectivity graph and BFS only when they choose/reach destinations.

Rendered positions now derive a stable side-of-street offset perpendicular to travel direction. Each representative citizen receives a stable runtime `side` value, so walkers do not switch sides every tile merely for visual noise.

At Rail crossings pedestrians pause when a train occupies the protected crossing zone. There is no injury or panic simulation.

This is deliberately lightweight: no navmesh and no per-citizen sidewalk graph.

## Vehicle network

`src/simulation/mobility.js` owns runtime mobility state. `src/rendering/vehicles.js` only draws it.

Vehicle traversal reuses the existing Road graph and existing `findPath()` breadth-first search. No global A* rewrite was introduced.

Routes are:

- generated for trips, not every render frame;
- cached by network version + endpoints;
- capped to a small cache;
- invalidated when Road/Rail/crossing topology changes;
- rerouted when possible and safely despawned on route failure.

`connectedRoadComponents()` prevents ambient vehicles from choosing unusable isolated fragments.

## Representative vehicles

Roads 2.0 includes three visual roles:

- compact car — ambient town life;
- small pickup — ambient town life;
- delivery/service van — representative commercial/service traffic only.

The van does **not** imply an inventory logistics simulation.

Vehicles are transient and are not persisted in Save V3.

Population/road/stage scaling is bounded. The stage ceilings are intentionally small and the maximum current visible cap is 12. There is never one vehicle per citizen.

Vehicles use smooth interpolation between Road nodes, simple logical follow spacing, and no rigid-body physics.

## Pedestrian priority

Pedestrians have priority at protected intersection/crossing states. Vehicles pause rather than drive through a representative pedestrian conflict.

This is intentionally forgiving. There are no traffic deaths, injuries, collision physics or panic states.

## Road / Rail crossings

Road and Rail still share the one-object-per-grid-tile save architecture.

A clean perpendicular overlap does not create a second grid object. Instead, the existing Road or Rail object keeps its base `type` and stores:

- `state.roadRailCrossing = true`
- `state.crossingBase = <original base type>`

`isType()` treats that one tile semantically as both Road and Rail. Therefore:

- Road pathfinding can traverse it;
- train Rail traversal can traverse it;
- Road count sees exactly one Road tile;
- Rail count sees exactly one Rail tile;
- Save V3 can persist it through existing generic building state.

Only clean perpendicular geometry is accepted. Water crossings are rejected; existing water bridge architecture remains separate.

Invalid/parallel/ambiguous overlap fails safely with an explanatory placement rejection rather than corrupting either network.

### Train priority

Trains always have crossing priority.

When a train is within the crossing protection radius:

- road vehicles wait;
- pedestrians wait;
- train movement remains unchanged;
- road/pedestrian movement resumes after the protected zone clears.

No full signal-control simulation is introduced. Crossbuck-style posts provide readable visual crossing identity. Animated gates are deferred polish.

### Removal

Because one object owns both semantic layers, the first Remove action on a crossing removes only the overlaid network layer and leaves the original base Road or Rail. A later Remove can remove that base normally.

The overlay removal refunds half the overlay network's normal cost. Route caches invalidate immediately.

## Housing and City Growth compatibility

Housing remains authoritative for Road-access requirements. Roads 2.0 does not alter Cottage/Town Home/Established Home thresholds, capacity, timers or taxes.

City Growth remains authoritative for stages and Road requirements. One semantic Road tile counts as one progression Road—even when that tile is also a Rail crossing.

No sidewalk sub-part counts as another Road.

## Bridges over water

Existing `SPANS={road:1,rail:1}` and `BRIDGE_LIFT` behavior remain. Roads keep the existing automatic water-bridge placement/economy and now draw the upgraded carriageway across those spans.

## Save / migration

Save remains `meadowline.v3`.

Existing pre-Roads Road tiles need no migration step and no coin deduction. They load as the same Road grid objects and automatically receive the new rendering/mobility semantics.

Crossing metadata persists through generic bounded building `state`.

Derived lane geometry, route caches, active vehicles, current vehicle positions and crossing reservations are not saved.

V1/V2 continue through the existing V3 migration path.

## City Hall integration

City Hall remains a truthful citywide summary, not a traffic dashboard.

Roads 2.0 adds only real Mobility data:

- Road tiles;
- connected Road components;
- Rail crossings;
- active representative vehicles.

There is no fake Traffic Health, congestion, commute or parking score.

## Diagnostics

`?debug=1` extends the existing developer overlay with:

- Road tile count;
- connected Road components;
- Rail crossing count;
- active vehicles/routes;
- vehicle route searches;
- route failures;
- reroutes;
- despawns;
- waits at Rail;
- Road-network invalidations.

Existing frame/simulation/render/path/save diagnostics remain.

## Automated tests

`tests/roads-mobility-regression.html/.js` covers the milestone's structural contracts, including:

- Road cost/one-tile identity;
- safe touch intent for tap/pan/hold-paint/pinch;
- clean perpendicular Road/Rail conversion;
- one-grid-object dual-network semantics;
- Road/Rail counts;
- Road route traversal through a crossing;
- Rail traversal collection through a crossing;
- crossing count;
- train-protection state;
- zero ambient traffic on a tiny Road fragment;
- positive but bounded ambient-vehicle cap on an eligible developed network;
- invalid crossing rejection;
- crossing overlay removal while retaining the base network;
- V3 crossing persistence;
- pre-Roads V3 Road loading with no coin deduction.

The existing workflow also continues syntax, module hygiene, Living City/Housing, City Growth 1.0, City Growth 1.1 and City Hall 1.0 regressions.

### Validation history

Historical failure is intentionally preserved:

- Living City Validation **#112** on candidate `d72f5a66e4c920f5cfc33765e43653465113ea18`: syntax/module/Living City/City Growth/City Hall all passed; the new Roads suite failed one **test-fixture assumption** because it expected a positive vehicle cap from only three Road tiles. The implementation correctly returned zero for that tiny network.
- The fixture was corrected to verify zero traffic on tiny fragments and a positive bounded cap only after constructing an eligible developed Road network.
- Living City Validation **#114** on implementation candidate `5667861e7eda9eb05b8ff1bc1287e8135efa8e9e`: **PASS** across JavaScript syntax, module hygiene, Living City/Housing browser regression, City Growth 1.0, City Growth 1.1, City Hall 1.0 and Roads & Mobility 2.0.

Documentation-only commits after that implementation candidate are still required to pass the same workflow before the final device handoff SHA is declared green.

## Physical validation

**Pending.**

The only canonical device checklist is `docs/IPHONE_ACCEPTANCE.md`. CI must never check those boxes.

Highest-priority physical checks are street readability, sidewalk behavior, vehicle scale/motion, Rail crossing safety, safe-touch crossing creation, legacy-city stability and 100+ citizen performance.

## Future consumers

Roads & Mobility 2.0 intentionally prepares shared infrastructure for later systems without implementing them:

- Police cruiser dispatch;
- Fire engine response;
- ambulance response;
- service/delivery visuals;
- later transit evolution.

No Police, crime, Fire, Healthcare or Recreation simulation is part of this milestone.

## Roadmap handoff

Production foundation:

Living City / School → Housing 2.0 → City Growth 1.0 / 1.1 → City Hall 1.0.

Current development:

**Roads & Mobility 2.0.**

Next planned major simulation milestone after physical acceptance and explicit merge:

**Recreation 2.0 / Town Life.**

Later order remains playtest-sensitive, with Safety / Police / Crime now explicitly able to consume the mobility foundation.
