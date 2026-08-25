# Meadowline Roads & Mobility 2.0

## Status

**Production on `main` through owner-approved merged PR #6.**

- Historical implementation branch: `feature/roads-mobility-2`
- PR: **#6 — Roads & Mobility 2.0 — Streets, Sidewalks, Vehicles & Rail Crossings**
- Verified production starting SHA: `fcf7f8c02291c7cd1bc2a164522353b7476e81ef`
- Final Roads candidate: `0c748bc819deaecba7ced391628643ee3afeffd6`
- Final documentation-inclusive validation: Living City Validation #118 — PASS
- Production merge commit: `6ed2225ba008a91610715c63aca44e4cd02486bb`
- Merge authorization: explicit owner approval on August 24, 2026 before Recreation 2.0 began
- Save key: `meadowline.v3`
- World: 44×44
- Renderer: native Canvas 2D / isometric

The source-control release record does not retroactively convert every unchecked Roads item in `docs/IPHONE_ACCEPTANCE.md` into individually observed physical evidence. The canonical acceptance document preserves those historical unchecked boxes.

## Product rule

One existing Road tile remains one Road tile for saves, economy, Housing access and City Growth progression. Roads are visually reinterpreted as compact small-town streets rather than replaced by a second network.

A street tile communicates:

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
- citizen rendering used arbitrary screen-space spread rather than semantic sidewalks.
- trains used the same lightweight step architecture over Rail tiles.
- Save V3 persisted grid buildings and bounded generic `state`, while citizens/trains/boats were regenerated runtime actors.

Roads & Mobility 2.0 preserved those authoritative semantics unless explicitly documented below.

## Street rendering

The world tile remains 64×32 isometric pixels at zoom 1. A Road still consumes one world tile.

Road rendering uses a pale sidewalk/edge field, narrower darker central carriageway, curb definition, topology-aware continuity, restrained straight/corner guidance, subtle intersection crosswalks and the existing bridge lift/pier architecture over water.

The visual target remains a cozy residential/mixed-use street, not a highway.

## Pedestrian sidewalk model

Citizen pathfinding remains the existing Road graph and BFS. Rendered positions derive a stable side-of-street offset perpendicular to travel direction. Representative citizens keep a stable runtime sidewalk side rather than changing lanes for visual noise.

At Rail crossings pedestrians pause while a train occupies the protected crossing zone. There is no injury or panic simulation.

No navmesh or per-citizen sidewalk graph was introduced.

## Vehicle network

`src/simulation/mobility.js` owns runtime mobility state. `src/rendering/vehicles.js` draws it.

Vehicle traversal reuses the existing Road graph and `findPath()` BFS. Routes are generated for trips rather than every frame, cached by network version/endpoints, bounded, invalidated when topology changes, rerouted when practical and safely despawned on failure.

`connectedRoadComponents()` prevents ambient vehicles from choosing unusable isolated fragments.

## Representative vehicles

Roads 2.0 includes bounded representative:

- compact cars;
- small pickups;
- delivery/service vans.

The van does not imply an inventory logistics simulation. Vehicles are transient and not persisted in Save V3. The current visible cap remains deliberately small, with a maximum around 12 rather than one vehicle per citizen.

## Pedestrian priority

Pedestrians have priority at protected intersection/crossing states. Vehicles pause rather than driving through a representative pedestrian conflict. There are no traffic deaths, collision physics or panic states.

## Road / Rail crossings

Road and Rail retain the one-object-per-grid-tile save architecture.

A clean perpendicular overlap keeps the existing Road or Rail object and stores:

- `state.roadRailCrossing = true`
- `state.crossingBase = <original base type>`

`isType()` treats the tile semantically as both Road and Rail. Road pathfinding and train traversal both work; Road/Rail counts remain exactly one each; Save V3 persists ordinary generic building state.

Only clean perpendicular land geometry converts. Invalid/parallel/ambiguous overlap rejects safely. Water spans remain separate existing bridge behavior.

### Train priority

Trains always have crossing priority. Road vehicles and pedestrians wait while a train is within the protected crossing zone and resume after it clears.

### Removal

First Remove on a dual-network crossing removes only the overlaid network layer and preserves the original base. A later Remove can remove the base normally. Overlay removal refunds half the overlay network's normal cost and invalidates routes immediately.

## Housing and City Growth compatibility

Housing remains authoritative for Road-access requirements. Roads 2.0 does not alter Cottage/Town Home/Established Home thresholds, capacity, timers or taxes.

City Growth remains authoritative for stages and Road requirements. One semantic Road tile counts as one progression Road, including when it is also a Rail crossing. Sidewalk/curb/carriageway sub-elements never count separately.

## Bridges over water

Existing `SPANS={road:1,rail:1}` and bridge-lift behavior remain. Roads and Rail keep automatic water-span placement/economy. Recreation 2.0's later multi-tile foundation explicitly preserves this span exception rather than treating water Roads as invalid facilities.

## Save / migration

Save remains `meadowline.v3`.

Existing pre-Roads Road tiles require no migration step or coin deduction. Crossing metadata uses generic bounded building `state`. Derived lane geometry, route caches, active vehicles, positions and crossing reservations are not saved.

V1/V2 continue through the V3 migration path.

## City Hall integration

City Hall exposes only real Mobility values:

- Road tiles;
- connected Road components;
- Rail crossings;
- active representative vehicles.

There is no fake Traffic Health, congestion, commute or parking score.

## Recreation 2.0 — first major pedestrian consumer

Recreation 2.0 / Town Life is the first major post-Roads gameplay system to make the sidewalk-separated pedestrian architecture visibly matter.

The relationship is:

house/neighborhood
→ existing Road route
→ sidewalk-biased pedestrian presentation
→ Recreation facility perimeter entrance
→ facility-local leisure space.

Important ownership rules:

- Roads remain authoritative for global connectivity;
- Recreation does not create a second sidewalk graph;
- a Recreation facility needs one logical perimeter Road/sidewalk access point, not Roads around every edge;
- facility-local leisure movement begins only after the existing Road route reaches its entrance;
- representative Recreation visitors and representative vehicles remain separate runtime systems;
- Recreation visitors do not become vehicle traffic and vehicles do not own Recreation service state.

This validates Roads as shared infrastructure without turning Recreation into a traffic simulator.

## Diagnostics

`?debug=1` includes Road tiles/components, Rail crossings, active vehicles/routes, route searches/failures/reroutes/despawns, Rail waits and Road-network invalidations. Recreation adds its own separate service/visitor diagnostics without replacing Mobility ownership.

## Automated validation history

`tests/roads-mobility-regression.html/.js` covers Road identity/cost, safe touch, Road/Rail conversion, one-object dual-network semantics, route traversal, counts, train protection, bounded ambient vehicles, invalid crossing rejection, overlay removal, V3 persistence and pre-Roads Road loading without coin deduction.

Historical failure remains preserved:

- Living City Validation #112 exposed an incorrect test-fixture assumption expecting traffic on a three-Road fragment. The implementation correctly returned zero.
- The fixture was corrected without weakening gameplay code.
- Living City Validation #114 passed the implementation candidate.
- Final documentation-inclusive Living City Validation #118 passed exact Roads head `0c748bc819deaecba7ced391628643ee3afeffd6` before owner-authorized merge.

Recreation 2.0 keeps the Roads regression suite in every full validation run.

## Physical validation history

`docs/IPHONE_ACCEPTANCE.md` remains the canonical device record. The Roads release was explicitly owner-approved and merged, but unchecked historical Roads boxes remain unchecked because release authorization is not retroactive observation of each individual item.

## Future consumers

Roads & Mobility intentionally supports later systems without implementing them:

- Police cruiser dispatch;
- Fire engine response;
- ambulance response;
- service/delivery visuals;
- further transit evolution.

Recreation is now the first production-bound consumer of sidewalk destination architecture. Safety / Police / Crime is a likely later consumer of vehicle routing, but remains outside Recreation 2.0.

## Roadmap handoff

Production:

Living City / School → Housing 2.0 → City Growth 1.0 / 1.1 → City Hall 1.0 → Roads & Mobility 2.0.

Current development:

**UI / HUD 2.0.** Recreation and Living City 3.x are Production.

Likely later:

**Safety / Police / Crime**, followed by other municipal systems as owner playtesting supports them.
