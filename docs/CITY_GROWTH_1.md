# Meadowline City Growth 1.x

## Status

Development branch: `feature/city-growth-progression`

Draft PR: #4

Starting production commit: `5d4054f764d603b23ddf1a74ab63824de67ea778`

City Growth is implemented only on the feature branch and is **not merged**. Automated validation and owner-device acceptance are separate gates.

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

The requirement engine supports hard conditions plus grouped `any X of Y` conditions.

## Land model

World remains 44×44. New progression cities begin with Meadowline Center, x12–31/y12–31 (20×20, 400 tiles, ~21% of the map).

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

Locked terrain remains real, visible, weather/season-aware, seeded, camera-accessible, and unchanged when permission to develop is purchased.

Placement reads the existing whole-footprint access API. Roads/rails and other tools respect locked parcels; loaded legacy infrastructure is not retroactively invalidated.

## Building progression

Registry-owned first pass:

- Settlement — Road, House, Café, Park, Trees, Lamp
- Village — School, Market, Bakery
- Township — Rail, Station, Windmill
- Growing Town — Dock

Legacy-open cities retain all current tools.

## School Level 2

Level 1: 28 capacity / radius 7.

Level 2: Township + 650 coins → 44 capacity / radius 7, same one-tile footprint, persistent `state.level = 2`, visible expanded School silhouette.

The upgrade proves generic civic-upgrade metadata without implementing Police/Fire/Hospital.

# City Growth 1.1 refinement

## Physical findings that triggered 1.1

Owner iPad testing of the first City Growth build identified these acceptance failures:

- an early `Put 1 boat on the water` goal could appear because the old Wish system only checked whether any water existed globally;
- `Keep 1 train running` could appear before transit had earned a place in progression;
- with a selected Road/building tool, trying to drag/pan could accidentally construct;
- the existing dock did not make active build state/gesture intent clear enough.

A first 1.1 UI retest then exposed two additional friction points:

- normal structures auto-cancelled after one placement, forcing repeated menu navigation;
- the floating active `Look` strip could obstruct the open build catalog.

These findings are refinements on PR #4, not evidence for starting another feature branch.

## Guided Development / Town Goals

Player-facing `Wishes` become **Town Goals** while the internal V3 `wishes` field remains for backward compatibility.

The model keeps City Milestones permanent and Town Goals short-term/contextual.

Target visible structure:

- one `NEXT STEP` primary goal;
- one `OPTIONAL` contextual goal.

Primary goal ordering intentionally follows the current city stage. Optional selection is randomized only after stage/infrastructure eligibility filtering.

### Settlement pool

Primary emphasis includes roads, homes, population, first Park/Café. Optional candidates include Park, Café, Trees, Mood.

Hard rule: no School/Rail/Station/Train/Dock/Boat requirement while those systems are unavailable.

### Village pool

May guide first School, students served, Education, Town Homes, Desirability, first expansion, Market/Bakery, and population toward Township.

No Train/Boat goal.

### Township pool

May guide School Level 2, Town Homes, Established Home, Rail, Station, Train, Windmill, further expansion, and population toward Growing Town.

A Train goal requires meaningful transit readiness: currently a running train OR at least six Rail tiles plus a Station. Merely being in Township is not enough.

### Growing Town pool

May guide Dock, Boat, additional expansion, Education/Desirability, and later population growth.

`hasUsableUnlockedWaterfront()` requires:

- Dock unlocked;
- an unlocked, empty non-water tile;
- adjacent unlocked water.

A Dock goal is only eligible if such legal waterfront exists. A Boat goal is stricter: an actual Dock must already exist. Global `hasWater()` is no longer sufficient.

### Save migration

Old V3 Wish entries are sanitized at load. A goal is kept only when its ID still exists, its target is valid, it remains incomplete, and it is eligible for the current stage/infrastructure. Inappropriate old Train/Boat goals are discarded and coherent primary/optional Town Goals are regenerated.

No Save V4 is required.

## Safe-touch input contract

Touch interaction is intent-first:

- quick tap = one action/placement;
- immediate one-finger drag > ~7 px = camera pan;
- two-finger input = pinch/zoom and cancels pending construction;
- Road/Rail/Tree/Remove use ~300 ms hold to enter intentional paint mode;
- movement before the hold threshold cancels pending build intent and pans;
- normal building tools remain armed after successful placement until the player explicitly cancels or replaces them.

Keeping normal building tools armed was chosen after the first 1.1 iPad retest showed that auto-return-to-Move made repeated House/School/etc. construction tedious. Safe drag-to-pan remains active even while the building tool stays selected.

Desktop mouse input retains immediate drag painting for paint tools.

A pure `src/core/input-policy.js` owns the touch thresholds/policy helpers so policy can be regression-tested independently of DOM pointer capture.

## Mobile UI architecture

The old always-expanded dock is replaced with:

- compact command bar;
- dedicated Build button;
- collapsible build tray with Ways/Homes/Trade/Green categories;
- Move/Look/Remove mode buttons;
- in-dock active build controls containing name, cost and concise gesture instruction;
- `✓` to keep the selected tool armed and close the tray for map focus;
- `×` to cancel the selected tool and return to neutral navigation;
- no floating active `Look` strip over the catalog.

Examples:

- `House · 24 coins` / `Tap to place · Drag to move`
- `Road · 3 coins` / `Tap once · Hold + drag to paint`
- `Remove` / `Tap once · Hold + drag to paint`

The UI respects existing safe-area positioning and remains framework-free.

## Latest physical iPad evidence

The latest owner iPad play session reports the updated build as **“looking great.”** The supplied Day 14 screenshot visibly demonstrates:

- `Growing Town` reached on physical iPad;
- 92 citizens and 1,524 coins in an actively developed progression city;
- a coherent `NEXT STEP` of opening another development parcel;
- a sensible optional Tree goal rather than premature transport noise;
- the compact bottom command bar without an obvious floating overlay obstruction;
- readable parcel boundaries, roads, homes, lamps, pedestrians and natural trees while the map remains dominant.

This is strong positive physical evidence for City Growth 1.1 presentation and progression coherence. It does **not** automatically prove every saved-game, gesture, School Level 2, or long-session checklist item; those remain tracked separately in `docs/IPHONE_ACCEPTANCE.md`.

## Goal/update cadence

Town Goals are checked from the existing low-frequency simulation and relevant build events, not the render loop. Goal selection and terrain/infrastructure readiness are not evaluated at 60 FPS.

## Diagnostics

`?debug=1` adds:

- primary/optional goal IDs
- goal recompute/replacement counters
- current input state
- touch pan count
- tap placement count
- paint activation count
- build cancellation by drag/pinch

Existing performance/service/Housing/City Growth diagnostics remain.

## Automated validation

The workflow retains:

- syntax
- module hygiene
- Living City/Housing regression
- City Growth 1.0 regression

and adds `tests/city-growth-1-1-regression.html/.js` covering:

- no early Train/Boat/School goals in Settlement;
- Village School guidance without Train/Boat;
- Township Rail guidance;
- Train waits for real transit readiness;
- old inappropriate transport goals sanitize safely;
- touch building drag resolves to pan;
- quick Road/Remove drag resolves to pan;
- held Road resolves to paint;
- second pointer resolves to pinch.

## Waterworks / Landscaping — roadmap hook only

Player-created ponds/rivers/creeks/canals are explicitly documented for a future milestone. City Growth 1.1 does not mutate terrain to make a Boat goal possible.

Potential future relationship:

Landscaping → Water → waterfront Desirability / Recreation → Docks / Boats / bridges → waterfront neighborhoods.

## Explicit non-goals

No Police/Crime/Jail, Fire, Healthcare, Employment/Prosperity, advanced traffic, road-over-rail work, larger world/chunks, neighborhood identity, giant NPC population, School Level 3+, premium currency, construction timers, or full Waterworks terrain editing.

## Merge gate

PR #4 remains unmerged until the canonical physical checklist in `docs/IPHONE_ACCEPTANCE.md` is satisfactory and the owner explicitly approves merge.
