# City Growth 1.0

## Status

**Development branch:** `feature/city-growth-progression`

**Starting production commit:** `5d4054f764d603b23ddf1a74ab63824de67ea778`

This milestone is **implemented on the feature branch and not merged into `main`**. Automated validation and physical-device acceptance are separate gates. Physical iPhone/iPad acceptance remains required before merge.

Living City Foundation / School 2.0 and Housing 2.0 are already production systems on `main`. City Growth 1.0 builds on them without enlarging the 44×44 world or changing the native ES-module/canvas architecture.

## Product loop

City Growth adds the missing progression layer:

Settlement → healthy neighborhood → Village → new land and buildings → Township → denser housing and School pressure → civic upgrade choice → Growing Town.

Progression is intended to reward a healthy city rather than raw waiting, grinding, or timer gates.

## City stages

City Growth 1.0 has four stages:

1. **Settlement**
2. **Village**
3. **Township**
4. **Growing Town**

### Settlement → Village

Required:

- 16 residents
- 4 occupied homes
- 10 road tiles

### Village → Township

Required:

- 30 residents
- 7 occupied homes

And any **2 of 3**:

- average Education 8+
- 2 Town Homes
- average Desirability 42+

### Township → Growing Town

Required:

- 48 residents
- 10 occupied homes
- 4 Town Homes
- 1 Established Home

And any **2 of 3**:

- average Education 18+
- 8 students served
- average Desirability 50+

The requirement engine supports ordinary required conditions and grouped `any X of Y` conditions so future milestones do not need one rigid city layout.

## Evaluation cadence

Development statistics are derived from existing real systems: population, occupied homes, residential tiers, road tiles, household Education, School service data, and Desirability.

City Growth is evaluated on Meadowline's existing low-frequency Living City simulation cadence (approximately once per second), not at render-frame frequency.

## Land model

The world remains **44×44**. Locked land still exists, renders, receives weather/seasons, contains ponds and natural trees, and remains viewable by camera/minimap.

Only permission to develop changes.

### Parcels

The current world is divided into nine deterministic contiguous sectors:

| Parcel | Geometry | Stage | Cost | Prerequisite |
| --- | --- | --- | ---: | --- |
| Meadowline Center | x12–31, y12–31 (20×20) | Settlement | 0 | starting |
| North Meadow | x12–31, y0–11 (20×12) | Village | 320 | Center |
| East Meadow | x32–43, y12–31 (12×20) | Village | 360 | Center |
| South Meadow | x12–31, y32–43 (20×12) | Township | 420 | Center |
| West Meadow | x0–11, y12–31 (12×20) | Township | 380 | Center |
| Northwest Fields | x0–11, y0–11 (12×12) | Growing Town | 520 | North + West |
| Northeast Fields | x32–43, y0–11 (12×12) | Growing Town | 540 | North + East |
| Southwest Fields | x0–11, y32–43 (12×12) | Growing Town | 560 | South + West |
| Southeast Fields | x32–43, y32–43 (12×12) | Growing Town | 580 | South + East |

The starting Center contains 400 of 1,936 world tiles, about 21% of the map. Terrain is never regenerated when a parcel opens.

## Land-access API

`src/progression/city-growth.js` owns the reusable access predicates:

- `parcelAt(x, y)`
- `isParcelUnlocked(id)`
- `isTileUnlocked(x, y)`
- `isFootprintUnlocked(x, y, w, h)`
- `parcelStatus(id)`
- `unlockParcel(id)`

Placement reads registry-defined footprints, so future multi-tile civic buildings can require their full footprint to be unlocked without rewriting the land system.

Roads, rails, trees, removal, and ordinary buildings all use the same access path. Camera movement is not constrained.

## Land visual language

`src/rendering/land-overlays.js` draws only the visible part of locked land:

- light subdued tint on locked tiles
- faint isometric parcel boundaries
- subtle green/warm treatment when a parcel is eligible to open
- no opaque walls or giant padlocks

The minimap applies a restrained equivalent tint.

The Look tool identifies a locked sector by name, reports whether it is waiting on a city stage/neighbouring parcel or is ready to open, and shows its cost.

## City Growth panel

A dedicated small City Growth panel is opened from the corner controls. It shows:

- current city stage
- next-stage requirements and current values
- grouped flexible requirements
- each parcel's status
- expansion cost
- player-confirmed parcel purchase

Parcel unlocks never happen automatically merely because requirements are met.

## Building unlock foundation

The authoritative building registry now includes an `unlockStage` field. Tool availability, keyboard selection, and placement all query progression rather than maintaining separate unlock tables.

Current progression:

### Settlement

- Road
- House
- Café
- Park
- Trees
- Lamp

### Village

- School
- Market
- Bakery

### Township

- Rail
- Station
- Windmill

### Growing Town

- Dock

This ordering is a first balancing pass. It deliberately keeps enough early tools to make the Settlement interesting while allowing transport and specialty development to feel earned.

**Legacy cities retain every existing building tool.**

## Legacy migration

City Growth distinguishes two modes:

- `parcel` — new progression city
- `legacy-open` — established pre-City-Growth city with full access

A save that has no City Growth metadata is always migrated as `legacy-open`. This includes Housing-era V3, V2, and V1 saves.

The migration rule is intentionally conservative: missing metadata must never be interpreted as a partially locked city.

Existing roads, rails, houses, Schools, trade buildings, population, trains, and other developed tiles are loaded directly and do not pass through new-placement lock checks.

## Save V3

The save key remains:

`meadowline.v3`

Optional V3 metadata now includes:

```text
cityProgress: {
  mode,
  stage,
  unlockedParcels,
  claimedMilestones
}
```

Malformed stage values are clamped, unknown parcel IDs are discarded, duplicate parcel IDs are removed, Center is restored for parcel-mode cities, and invalid milestone entries are filtered.

No Save V4 was required.

## School Level 2

School is the first proof of reusable civic upgrades.

### Level 1

- capacity: 28 students
- radius: 7 tiles
- persistent `state.level = 1`

### Level 2 — Expanded School

- available at Township
- upgrade cost: **650 coins**
- capacity: **44 students**
- radius: **7 tiles**
- persistent `state.level = 2`

The primary benefit is capacity. Coverage does not expand across the map.

The existing civic service provider resolver already merges level-specific registry metadata, so Level 2 immediately recomputes assignment capacity through the same generic service path.

## Civic upgrade architecture

`src/progression/civic-upgrades.js` provides generic upgrade status and execution logic. Upgrade definitions are data-driven in the building registry and can later describe cost, stage requirements, service capacity, radius, render variant, and description for Police, Fire, Hospital, or other civic providers.

Only School Level 2 is player-facing in this milestone.

## School UI and visual change

The School Look card now shows:

- School level
- students served / capacity
- demand
- utilization
- homes served
- radius
- service status
- Level 2 requirement
- 28 → 44 capacity change
- 650-coin cost
- Upgrade action

The Level 2 visual keeps the same one-tile footprint and original School, then adds a wider classroom-wing silhouette plus a small clock crest so the upgrade reads on phone scale without creating a large art scope.

## Diagnostics

`?debug=1` adds City Growth information including:

- progression mode and city stage
- opened parcel count
- progression recomputes
- milestone evaluations
- parcel unlocks
- School Level 2 count
- School upgrade count
- total Education capacity

Existing performance, service, housing, path-search, and save diagnostics remain.

## Automated tests

The existing Living City browser regression remains in place.

A new `tests/city-growth-regression.html` / `.js` suite covers:

- four-stage registry
- deterministic parcel registry
- starting Center size and access
- locked outer land
- whole-footprint access
- building-stage locks
- required and `any 2 of 3` milestone logic
- real Settlement → Village evaluation
- parcel coin checks
- duplicate parcel rejection
- legacy full-map/tool access
- School Level 1 baseline
- School Level 2 metadata
- one-time cost deduction
- 28 → 44 service capacity
- unchanged 7-tile radius
- V3 progression persistence
- parcel persistence
- claimed milestone persistence
- School level persistence
- pre-City-Growth V3 legacy migration
- legacy road/rail preservation
- malformed progression repair

The GitHub Actions Living City Validation workflow now runs syntax checks, module hygiene, the original browser regression, and the City Growth regression for this feature branch.

## Physical iPhone / iPad acceptance

Automated tests do **not** count as physical acceptance.

Before merge, test on physical iPhone and iPad:

### New city

- Center feels useful but meaningfully small
- locked terrain remains attractive and visible
- locked placement is blocked with understandable wording
- camera can freely pan across future land
- minimap distinction remains subtle

### Expansion

- Growth panel requirements update understandably
- eligible parcel is visible
- tap target is comfortable
- cost is clear
- confirmation prevents accidental purchase
- successful purchase opens land immediately
- roads/buildings work immediately in the opened parcel
- no hitch or terrain regeneration occurs

### Housing / Education regression

- Housing 2.0 still evolves
- Desirability still responds to the neighborhood
- denser housing increases School demand
- Education still accumulates while served
- green School placement coverage remains accurate

### School Level 2

- Level 1 shows 28 capacity
- Township + 650 coins enables upgrade
- one tap + confirmation upgrades once
- Level 2 shows 44 capacity
- radius remains 7
- waiting demand can become served
- upgraded silhouette is visibly different
- level survives reload

### Touch

- pinch-to-zoom never commits a pending building
- parcel UI does not place buildings underneath it
- road/rail/tree/remove paint still work
- School placement boundary remains usable

### Saves

- parcel unlocks persist
- city stage persists
- School Level 2 persists
- Housing/Education persist
- a pre-City-Growth city remains fully usable everywhere

## Explicit non-goals

City Growth 1.0 does not add larger maps, chunking, renderer or A* rewrites, Police/Crime/Jail, Fire, Hospital/Healthcare, Employment/Prosperity, advanced traffic, road-over-rail crossings, neighborhood identity, giant NPC populations, School tiers above Level 2, civic staffing/budgets, premium currencies, or long construction timers.

## Next milestone decision

After physical acceptance, do not automatically start another branch. Compare what the playtest reveals and choose among:

- Police / Crime / Jail
- Recreation 2.0
- Fire / Emergency Foundation
- Employment / Prosperity

The strongest next move should be whichever missing service relationship City Growth makes most obvious during real play.
