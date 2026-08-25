# Meadowline City Growth 1.x

## Status

**Production on `main` through merged PR #4.**

Historical implementation branch: `feature/city-growth-progression`.

Verified City Growth merge commit: `1d9e7e9c110fad465b332ef85503d102ed5af6e0`.

City Hall 1.0 and Roads & Mobility 2.0 subsequently reached production. Recreation 2.0 / Town Life is current development and must preserve every authoritative City Growth requirement below.

The owner explicitly approved the final City Growth 1.1 merge after positive physical iPad evidence. That approval did not retroactively mark every unchecked physical item as tested. `docs/IPHONE_ACCEPTANCE.md` remains canonical.

## Product loop

Settlement
→ healthy neighborhood
→ Village
→ new land/buildings
→ Education and Housing development
→ Township
→ greater civic pressure
→ civic / transport / Recreation choices
→ Growing Town.

The purpose is real progression, not arbitrary waiting or generic XP.

## City stages

### Settlement → Village

Required:

- 16 residents
- 4 occupied homes
- **10 Road tiles**

### Village → Township

Required:

- 30 residents
- 7 occupied homes

Any 2 of:

- average Education 8+
- 2 Town Homes
- average Desirability 42+

### Township → Growing Town

Required:

- 48 residents
- 10 occupied homes
- 4 Town Homes
- 1 Established Home

Any 2 of:

- average Education 18+
- 8 students served
- average Desirability 50+

There is no fifth City Growth stage. Recreation 2.0 does not add one and does not rewrite these requirements.

## Land model

World remains 44×44. New progression cities begin with Meadowline Center, x12–31/y12–31 (20×20, 400 tiles).

| Parcel | Geometry | Stage | Cost | Prerequisite |
| --- | --- | --- | ---: | --- |
| Meadowline Center | 20×20 center | Settlement | 0 | starting |
| North Meadow | 20×12 | Village | 320 | Center |
| East Meadow | 12×20 | Village | 360 | Center |
| South Meadow | 20×12 | Township | 420 | Center |
| West Meadow | 12×20 | Township | 380 | Center |
| Northwest Fields | 12×12 | Growing Town | 520 | North + West |
| Northeast Fields | 12×12 | Growing Town | 540 | North + East |
| Southwest Fields | 12×12 | Growing Town | 560 | South + West |
| Southeast Fields | 12×12 | Growing Town | 580 | South + East |

Locked terrain remains real, visible, seeded, weather/season-aware, camera-accessible and unchanged when development permission is purchased. Parcel purchases remain explicit confirmed actions.

Legacy pre-City-Growth cities use `legacy-open` and keep full world/building access.

Multi-tile Recreation facilities obey the same land ownership model. Every footprint tile must be inside opened development land. One locked tile rejects the complete placement; land is never auto-purchased.

## Building progression

Registry-owned production unlocks remain intact. Recreation 2.0 adds public-space choices to the existing four stages without changing stage count:

- Settlement — existing production tools + Pocket Park 2×2; legacy `park` remains a compatible 1×1 Pocket Green
- Village — Playground 2×2, Picnic Green 3×3
- Township — Sports Court 2×3
- Growing Town — Town Park 4×4

Existing School/Rail/Station/Windmill/Dock unlocks retain their production stages.

## School Level 2

Level 1: 28 capacity / radius 7.

Level 2: Township + 650 coins → 44 capacity / radius 7, one-tile footprint, persistent `state.level = 2`.

Recreation does not alter School capacity, radius or upgrade cost.

## City Growth 1.1 physical-history rules

The original owner iPad pass exposed real failures that remain architectural memory:

- an early Boat goal could appear based merely on global water;
- Train could be suggested before meaningful transit readiness;
- Road/building tools could paint/place during an intended camera drag;
- build-mode presentation was not clear enough;
- a subsequent UI attempt auto-cancelled normal buildings after one placement and allowed the active Look strip to obstruct the build menu.

Production 1.1 corrected those failures with stage/context-aware Town Goals and intent-first safe touch. Later owner iPad evidence showed Growing Town, 92 citizens, coherent Town Goals, readable parcels/roads/homes/pedestrians and a non-obstructive command bar. Unchecked device items remain unchecked in the acceptance record.

## Town Goals

Player-facing Wishes remain **Town Goals** while the V3 `wishes` field stays backward compatible.

The visible structure remains one primary `NEXT STEP` plus one `OPTIONAL` contextual goal.

Recreation 2.0 adds no parallel task system. Recreation goals use the existing authoritative goal engine and real city state:

- first neighborhood public space only after a settlement actually has occupied homes;
- more Recreation access only when meaningful demand is underserved;
- more capacity only when Township-scale demand justifies it;
- Town Park only at Growing Town with substantial real demand/underservice.

A city with adequate capacity is not ordered to spam Parks merely because a building unlocked.

Historical Train/Boat eligibility safeguards remain intact.

## Safe-touch input contract

Production touch interaction remains:

- quick tap = one action/placement;
- immediate one-finger drag = camera pan;
- two fingers = pinch/zoom and cancellation of pending construction intent;
- Road/Rail/Tree/Remove require a short intentional hold before drag painting/removal;
- movement before hold cancels build intent and pans;
- normal building tools remain armed until explicitly cancelled/replaced.

Multi-tile Recreation tools use the normal building path: one intentional tap places one complete legal footprint, immediate drag pans, and pinch places nothing.

## Roads & Mobility compatibility

Road count semantics remain permanent:

**one semantic Road tile = one City Growth Road tile.**

Sidewalk, curb and carriageway sub-elements never count separately.

A clean Road/Rail crossing exposes both Road and Rail semantics at one grid tile and counts once as each network.

Recreation facility entrances consume Road connectivity but do not create extra Road count semantics.

## City Hall relationship

City Hall reads City Growth/Town Goals/parcel/Housing/Education/economy/Mobility state and does not duplicate it.

Recreation adds a truthful service summary only. There is no fifth stage and no fake Recreation score.

## Save compatibility

City Growth remains inside `meadowline.v3`. Recreation 2.0 does not force Save V4.

Existing stage/parcels remain. Old 1×1 Parks survive exactly where they were. New multi-tile facilities persist as one authoritative root and reconstruct their footprint from registry metadata.

## Waterworks / Landscaping — roadmap only

Player-created ponds/rivers/creeks/canals remain future work. Existing automatic Road/Rail spans remain production behavior.

## Explicitly not part of City Growth / Recreation

No Police/Crime/Jail, Fire, Healthcare, Employment/Prosperity, full traffic congestion, parking simulation, larger world/chunks, new City Growth stage or global pathfinding rewrite is introduced by Recreation 2.0.
