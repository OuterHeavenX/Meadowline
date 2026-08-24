# Meadowline Recreation 2.0 / Town Life

## Status

**Current development. Not merged.**

- Repository: `OuterHeavenX/Meadowline`
- Branch: `feature/recreation-2-town-life`
- Draft PR: #7
- Verified production starting SHA: `6ed2225ba008a91610715c63aca44e4cd02486bb`
- Prerequisite Roads & Mobility 2.0: owner-approved and merged through PR #6 before this branch was created
- Save key: `meadowline.v3`
- World: 44×44
- Renderer: native Canvas 2D / isometric
- Physical acceptance: pending owner iPhone/iPad testing

This file is the canonical technical record for Recreation 2.0 / Town Life. Automated validation and owner-device validation remain separate.

## Product rule

Recreation is a real resident need and public space is visible town life, not another invisible percentage.

Population + Housing density
→ Recreation demand
→ connected facility capacity/access
→ Recreation satisfaction
→ Mood
→ Desirability
→ neighborhood quality.

Housing remains authoritative for residential tiers and does not downgrade.

## Existing Park audit / compatibility decision

Before Recreation 2.0, internal registry ID `park` was:

- 1×1
- Settlement unlock
- 40 coins
- category `green`
- a generic citizen visit destination
- direct geometric Mood source through Park radius/stack logic
- a direct geometric Desirability input
- persisted as an ordinary V3 building
- counted/inspected as one ordinary tile

It had no finite Recreation capacity or real household service assignment.

Recreation 2.0 preserves internal ID `park` as a **1×1 Pocket Green**. Existing saves are never expanded into neighboring tiles, never charged again and never forced to rebuild. The legacy Pocket Green becomes a small Recreation provider with capacity 8 and reach 4.

## Multi-tile facility architecture

Registry metadata is authoritative. Facility definitions use `placement.footprint`.

One multi-tile facility is:

**one authoritative root + many derived occupied tiles.**

The root remains a normal building object at the anchor. Additional footprint cells use internal `facilityPart` markers containing only root coordinates. Markers are implementation detail and never appear as player-facing buildings.

### Placement

Full footprint validation checks:

- world bounds
- opened parcel ownership
- terrain
- existing occupancy
- building unlock stage
- one facility cost

Placement is atomic: all footprint cells are valid or nothing is written / charged.

### Look

Look on any footprint tile resolves the same root. Player UI never exposes `facilityPart` or fake Park segments.

### Removal

Remove on any footprint tile resolves the root and removes the complete facility. Refund occurs once. Large footprints ask for deliberate confirmation. Active Recreation visitor references are cleared safely.

### Save V3

Only the authoritative root is persisted. Derived child occupancy is reconstructed from type + anchor + registry footprint.

Historical V1/V2/V3 single-tile positions remain authoritative during migration. New malformed multi-tile entries are rejected deterministically if they are out of bounds, invalid, or overlap earlier valid state. Save V4 is not required.

This architecture is deliberately reusable by future Police Stations, Fire Stations, hospitals and other major civic facilities.

## Facility catalog

| Facility | ID | Footprint | Stage | Cost | Capacity | Reach |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| Pocket Green | `park` | 1×1 | Settlement | 40 | 8 | 4 |
| Pocket Park | `pocketPark` | 2×2 | Settlement | 70 | 12 | 5 |
| Playground | `playground` | 2×2 | Village | 95 | 18 | 5 |
| Picnic Green | `picnicGreen` | 3×3 | Village | 150 | 24 | 6 |
| Sports Court | `sportsCourt` | 2×3 | Township | 190 | 28 | 6 |
| Town Park | `townPark` | 4×4 | Growing Town | 340 | 55 | 8 |

No Civic Park was added in 2.0. Five new facilities plus the legacy Pocket Green are sufficient to prove progression without scope explosion.

## Visual identity

New large facilities render as coordinated footprint-relative public environments rather than repeated identical tiles.

- Pocket Park — crossing paths, small canopy, bench, lamp
- Playground — recognizable climbing/slide/swing silhouette
- Picnic Green — open lawn, shade trees, picnic tables, path
- Sports Court — unified multi-tile court surface, markings, hoops, lamps
- Town Park — paths, perimeter canopy, benches/lamps and a central fountain/gathering landmark

Seasonal palette/snow behavior reuses existing Meadowline rendering. No new weather or lighting engine is introduced.

## Recreation demand

Demand comes from real occupied household population.

Representative citizen actors do not create demand and there is no age/family-tree demographic rewrite.

A 4-resident home creates 4 Recreation demand. Higher Housing tiers create pressure naturally only when they actually contain more residents.

## Capacity and service

Every provider has finite capacity. One tiny Pocket Green cannot satisfy an entire Growing Town.

Assignment is aggregate resident service rather than permanent individual visitor reservation. Households can use available capacity among eligible nearby providers.

Citywide metrics:

- facilities
- demand
- capacity
- residents served
- underserved residents
- representative visitors now

## Access and entrances

A household is eligible only when:

1. the facility is within that provider's Recreation reach;
2. the home has Road access;
3. the facility has at least one perimeter cell adjacent to a Road;
4. the existing Road graph can connect the home's nearby Road to a facility entrance.

One logical Road/sidewalk connection is enough. Roads are not required around every edge.

Entrances are discovered deterministically from facility perimeter Road adjacency. Recreation does not create a second sidewalk graph.

## Pedestrian Town Life

Representative pedestrians retain existing global Road BFS routing and sidewalk-biased presentation.

During the afternoon leisure window, some representative citizens may choose a Recreation destination actually serving their household.

Trip lifecycle:

home/neighborhood Road
→ existing Road route
→ facility perimeter entrance
→ facility-local leisure point
→ bounded stay
→ Recreation state clears
→ normal town behavior resumes.

Facility-local positions are simple fractional footprint coordinates and never enter the whole-world pathfinder.

Visitors are representative and bounded by the existing citizen population philosophy. No one-actor-per-resident model is introduced.

Facility removal clears visitor references safely. Road topology changes invalidate Recreation access so future trip/service decisions use current connectivity.

## Recreation satisfaction

House state contains bounded `recreationSatisfaction` 0–100.

Player-facing House Look emphasizes semantic states:

- Excellent Recreation
- Good Recreation
- Limited Recreation
- Poor Recreation
- No Recreation access

The number remains simulation state; explanation remains primary UI.

## Mood migration

The old direct Park adjacency Mood stack is retired for Recreation behavior.

Recreation satisfaction contributes one bounded Mood amount:

- excellent: +12
- good: +9
- limited: +5
- low positive: +2
- no access: no direct bonus

This avoids Park adjacency + Recreation + visitor double counting.

## Desirability / Housing

Recreation satisfaction contributes a smaller direct Desirability value, capped effectively at +6, in addition to the bounded Mood pathway.

Housing remains authoritative. Recreation 2.0 changes no Cottage/Town Home/Established Home:

- capacities
- Mood thresholds
- Education thresholds
- Desirability thresholds
- tax multipliers
- upgrade timers
- non-downgrade behavior.

No established city should mass-downgrade because homes never downgrade and Recreation is not added as a hidden direct tier requirement.

## House Look

House Look adds a concise Recreation block showing:

- semantic status
- residents served / demand
- nearby serving public space when present
- understandable access/crowding explanation.

## Facility Look

Any footprint tile resolves the same facility and reports:

- facility name / footprint
- capacity / served
- nearby demand
- visitors now
- street access / entrance
- local status.

No child-tile implementation leaks into UI.

## City Hall

City Hall reads Recreation from the simulation and shows:

- Facilities
- Residents served / demand
- Available capacity
- Underserved
- Visitors now

There is no fake Recreation Health score.

City Hall does not own Recreation.

## Town Goals

Recreation uses existing Town Goals only.

Context-aware goal types include:

- establish first neighborhood Park after a settlement actually has several occupied homes;
- improve Recreation access when Village+ demand has meaningful underservice;
- expand capacity when Township+ demand/underservice warrants it;
- establish Town Park only in Growing Town when substantial demand remains underserved.

Unlock alone is never sufficient eligibility for facility spam.

Historical Train/Boat gating remains intact.

## Safe touch / Build UI

A dedicated Recreation category is justified by the five new tools.

Cards expose footprint + cost + stage. The active tool strip exposes large footprint dimensions.

Normal-building safe touch remains:

- tap anchor → one complete facility
- immediate drag → pan, no placement
- second pointer → pinch/cancel
- invalid complete footprint → no partial placement
- normal tools remain armed until explicitly cancelled/replaced.

## Performance / caching

Recreation recomputes on meaningful invalidation/population signature changes rather than every render frame.

Road connectivity checks are cached during assignment. Representative visitors reuse the existing citizen cap and global Road routing model.

No DOM visitor objects, global A* rewrite, navmesh, ECS, chunk streaming or larger world are introduced.

## Diagnostics

`?debug=1` includes:

- Recreation facilities
- Recreation capacity
- Recreation demand
- residents served / underserved
- Recreation visitors
- Recreation recomputes
- Recreation route searches/failures
- multi-tile facility count
- occupied facility tiles
- malformed facility cleanup

Existing Mobility/City Growth/Housing/Education diagnostics remain.

## Automated regression

`tests/recreation-regression.html/.js` covers:

- facility catalog/footprints
- finite capacities
- safe-touch intent for large normal buildings
- atomic placement
- one-cost placement
- root/child ownership
- child Look/root resolution helper
- footprint overlap rejection
- full removal/refund from a child tile
- population-derived demand
- finite capacity/served bounds
- one perimeter Road connection
- inaccessible facility not providing magical service
- V3 root-only persistence
- child occupancy reconstruction
- legacy 1×1 Park position preservation
- no migration coin deduction
- demand-aware first Recreation Town Goal.

The Living City workflow remains additive and runs all prior suites plus Recreation 2.0.

### Validation history

Historical failures during this branch are intentionally preserved:

- first Recreation-integrated run exposed Road/Rail water-span placement regression because the new occupancy restorer rejected all water tiles; fixed by retaining the existing span exception;
- next run then isolated historical V2 single-tile save-position compatibility; fixed by preserving authoritative old single-tile placement while keeping new multi-tile reconstruction strict.
- exact head `7942cdeab5798c88452933d25e66a27be0124611` then exposed a regression-fixture geometry error: both test homes sat outside the Pocket Park's real reach while the assertion expected finite service. The fixture moved the homes inside documented reach without changing Recreation capacity, reach, assignment code, or assertions.
- corrected candidate `f736c55e81f98f946d4a4ac0a1107706b54ae526` passed Living City Validation run `32781951871`, including every pre-existing suite and Recreation 2.0.

Physical owner acceptance remains pending and this branch must remain draft/unmerged until that separate gate is satisfied.

## Physical validation

**Pending.**

`docs/IPHONE_ACCEPTANCE.md` remains the only canonical owner-device checklist. CI must never check physical boxes.

Highest priority physical checks:

- large footprint readability/placement comfort
- distinct public-space silhouettes
- sidewalk-to-entrance pedestrian approach
- internal visitors / departure behavior
- House/facility/City Hall Recreation explanations
- old-save compatibility
- safe touch
- dense 100+ citizen / vehicles / Rail / Recreation performance.

## Explicit non-goals

Not implemented in Recreation 2.0:

Police/Crime/Jail, Fire, Healthcare, Employment/Prosperity, stadiums, theme parks, tourism, Park maintenance budgets, vandalism, litter, age simulation, sports leagues, parking/congestion, larger world, chunk streaming, renderer rewrite, backend, multiplayer or fifth City Growth stage.

## Future reuse

Future Police Stations, Fire Stations, hospitals and other large municipal facilities should reuse:

- registry footprints
- root/derived occupancy
- atomic placement/removal
- V3 root persistence where practical
- child-to-root Look resolution
- parcel/full-footprint validation.

Do not create future service-specific footprint databases when this foundation is sufficient.
