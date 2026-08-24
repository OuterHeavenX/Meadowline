# Meadowline City Growth 1.x

## Status

**Production on `main` through merged PR #4.**

Historical implementation branch: `feature/city-growth-progression`.

Verified City Growth merge commit: `1d9e7e9c110fad465b332ef85503d102ed5af6e0`.

City Hall 1.0 subsequently reached production through PR #5. Roads & Mobility 2.0 is current development and must preserve every authoritative City Growth requirement below.

The owner explicitly approved the final City Growth 1.1 merge after positive physical iPad evidence. That approval did not retroactively mark every unchecked physical item as tested. `docs/IPHONE_ACCEPTANCE.md` remains canonical.

## Product loop

Settlement
→ healthy neighborhood
→ Village
→ new land/buildings
→ Education and Housing development
→ Township
→ greater civic pressure
→ civic upgrade / transport choices
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

There is no fifth City Growth stage in production.

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

## Building progression

Registry-owned production unlocks:

- Settlement — Road, House, Café, Park, Trees, Lamp, Town Office
- Village — School, Market, Bakery
- Township — Rail, Station, Windmill
- Growing Town — Dock

City Hall is optional civic progression and does not rewrite City Growth requirements.

## School Level 2

Level 1: 28 capacity / radius 7.

Level 2: Township + 650 coins → 44 capacity / radius 7, one-tile footprint, persistent `state.level = 2`.

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

Eligibility uses real stage, unlocks, population/Housing, Education, Desirability, parcels, transit readiness and waterfront readiness. Settlement/Village do not receive premature Train/Boat goals. Train waits for meaningful Rail readiness; Boat requires a real Dock.

Roads & Mobility 2.0 does **not** add a parallel Mobility Tasks system. Any future mobility goal must use this existing engine and real contextual eligibility.

## Safe-touch input contract

Production touch interaction remains:

- quick tap = one action/placement;
- immediate one-finger drag = camera pan;
- two fingers = pinch/zoom and cancellation of pending construction intent;
- Road/Rail/Tree/Remove require a short intentional hold before drag painting/removal;
- movement before hold cancels build intent and pans;
- normal building tools remain armed until explicitly cancelled/replaced.

Road/Rail crossing construction in Roads 2.0 uses this same placement path. It does not bypass the input policy.

## Roads & Mobility 2.0 compatibility

Road count semantics are permanent:

**one semantic Road tile = one City Growth Road tile.**

Sidewalk, curb and carriageway sub-elements never count separately.

A clean Road/Rail crossing exposes both Road and Rail semantics at one grid tile. It therefore counts once as Road and once as Rail while remaining one saved grid object. This is infrastructure evolution, not a new City Growth stage.

Existing Road affordability remains unchanged: base Road cost stays 3 coins.

Road painting remains subject to parcel ownership. Road-over-Rail does not permit construction on locked land.

## Current relationship to City Hall

City Hall is now production. It reads City Growth/Town Goals/parcel/Housing/Education/economy state and does not duplicate it.

Roads 2.0 adds only truthful Mobility aggregates to City Hall. There is no fake fifth growth stage or fake traffic rating.

## Save compatibility

City Growth remains inside `meadowline.v3`. Roads 2.0 does not force Save V4.

Old Roads load as the same Road objects and automatically receive upgraded street semantics. No coin deduction or player rebuild is required.

## Waterworks / Landscaping — roadmap only

Player-created ponds/rivers/creeks/canals remain future work. Roads 2.0 preserves existing automatic Road/Rail spans over current world water.

## Explicitly not part of City Growth / Roads

No Police/Crime/Jail, Fire, Healthcare, Employment/Prosperity, full traffic congestion, parking simulation, larger world/chunks, new City Growth stage or global pathfinding rewrite is introduced by Roads & Mobility 2.0.
