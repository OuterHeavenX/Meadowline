# Meadowline City Growth 1.x

## Status

**Production on `main` through merged PR #4.**

Historical implementation branch: `feature/city-growth-progression`.

Verified merge commit: `1d9e7e9c110fad465b332ef85503d102ed5af6e0`.

The owner explicitly approved the final City Growth 1.1 merge after positive physical iPad evidence. That approval does not retroactively mark every unchecked physical item as tested. `docs/IPHONE_ACCEPTANCE.md` remains the canonical device record.

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

The purpose is real progression, not arbitrary waiting or a generic XP ladder.

## City stages

### Settlement → Village

Required:

- 16 residents
- 4 occupied homes
- 10 road tiles

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

Locked terrain remains real, visible, seeded, weather/season-aware, camera-accessible, and unchanged when development permission is purchased. Parcel purchases remain explicit confirmed actions.

Legacy pre-City-Growth cities use `legacy-open` and keep full world/building access.

## Building progression

Registry-owned production unlocks:

- Settlement — Road, House, Café, Park, Trees, Lamp
- Village — School, Market, Bakery
- Township — Rail, Station, Windmill
- Growing Town — Dock

City Hall 1.0 later adds Town Office at Settlement as an optional civic-center building without rewriting the above City Growth requirements.

## School Level 2

Level 1: 28 capacity / radius 7.

Level 2: Township + 650 coins → 44 capacity / radius 7, same one-tile footprint, persistent `state.level = 2`, visible expanded silhouette.

This remains the first proof of generic civic-upgrade metadata.

# City Growth 1.1 refinement history

## Physical failures that triggered 1.1

The first owner iPad City Growth pass exposed real acceptance failures that must remain part of architectural memory:

- an early `Put 1 boat on the water` goal could appear because old Wish logic only tested whether any world water existed;
- `Keep 1 train running` could appear before transit had earned a place in progression;
- with Road/building tools selected, an intended pan could accidentally construct;
- the first mobile dock did not communicate active build state/gesture intent clearly enough.

The first revised UI then exposed two more friction points:

- normal structures auto-cancelled after one placement, forcing repeated menu navigation;
- the floating active `Look` strip could obstruct the open build catalog.

These failures were not erased after the merge. They explain why the production safe-touch and UI rules exist.

## Guided Development / Town Goals

Player-facing Wishes became **Town Goals** while the internal V3 `wishes` field stayed backward-compatible.

City Milestones are permanent progression. Town Goals are shorter contextual suggestions.

Visible structure remains approximately:

- one `NEXT STEP` primary goal;
- one `OPTIONAL` contextual goal.

Eligibility uses real state:

- current stage and building unlocks;
- population / occupied homes;
- Housing tiers;
- Education and students served;
- Desirability;
- parcel expansion;
- rail readiness;
- usable waterfront / Dock readiness.

Settlement does not request unavailable School/Rail/Station/Train/Dock/Boat systems. Village may guide Education/Housing but not Train/Boat. Township may introduce transit, but Train waits for meaningful rail readiness. Growing Town may introduce Dock; Boat requires an actual Dock rather than global water presence.

Old now-ineligible V3 goal entries are sanitized and replaced without Save V4.

## Safe-touch input contract

Production touch interaction is intent-first:

- quick tap = one action/placement;
- immediate one-finger drag > the movement threshold = camera pan;
- two-finger input = pinch/zoom and cancels pending construction;
- Road/Rail/Tree/Remove use a short intentional hold before drag painting/removal;
- movement before that hold cancels build intent and pans;
- normal building tools remain armed after successful placement until explicitly cancelled/replaced.

Keeping normal buildings armed was a direct response to one-off placement friction. Safe drag-to-pan remains active while a tool is armed.

Desktop mouse input retains fast paint behavior.

## Mobile UI history

The old always-expanded dock evolved into:

- compact command bar;
- Build button;
- collapsible Ways/Homes/Trade/Green categories;
- Move/Look/Remove controls;
- active build name/cost/gesture information;
- `✓` keep tool / close tray;
- `×` cancel tool;
- no obstructive floating Look strip.

City Hall 1.0 later introduces a Civic category without changing the touch contract.

## Later positive physical evidence

A later owner iPad session reported the refined build as **“Everything is looking great!”** / “looking great.” The supplied Day 14 screenshot visibly demonstrated:

- Growing Town reached on physical iPad;
- 92 citizens and 1,524 coins in an actively developed progression city;
- coherent parcel-expansion/Trees Town Goals instead of premature transport noise;
- compact bottom command bar without the earlier obvious overlay obstruction;
- readable parcel boundaries, roads, homes, lamps, pedestrians and natural trees while the map remained dominant.

This was strong positive evidence for presentation and progression coherence. It did not itself prove every gesture, save migration, School Level 2, iPhone, or long-session item. Those unchecked items remain historically unchecked.

The owner subsequently gave explicit final approval to merge PR #4. PR #4 is therefore release history, not a pending gate.

## Automated validation history

City Growth 1.1 added regression coverage for:

- no early Train/Boat/School goals in Settlement;
- Village School guidance without Train/Boat;
- Township Rail guidance;
- Train waits for real transit readiness;
- inappropriate old transport goals sanitize safely;
- touch building drag resolves to pan;
- quick Road/Remove drag resolves to pan;
- held Road resolves to paint;
- second pointer resolves to pinch.

Automation remains distinct from physical acceptance.

## Current relationship to City Hall

City Hall 1.0 is built on top of this production system.

City Hall reads:

- `cityStage()` / `nextStageProgress()`;
- existing Town Goals;
- parcel state / confirmed purchase APIs;
- real Housing/Education/economy aggregates.

It does not duplicate City Growth state and does not alter the four-stage ladder or existing stage requirements.

## Waterworks / Landscaping — roadmap only

Player-created ponds/rivers/creeks/canals remain future work. City Growth never mutates terrain merely to satisfy a Boat goal.

Potential future relationship:

Landscaping → Water → waterfront Desirability / Recreation → Docks / Boats / bridges → waterfront neighborhoods.

## Explicit non-goals retained

City Growth did not implement Police/Crime/Jail, Fire, Healthcare, Employment/Prosperity, advanced traffic, road-over-rail work, larger world/chunks, neighborhood identity, giant NPC populations, School Level 3+, premium currency, construction timers, or full Waterworks terrain editing.
