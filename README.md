# Meadowline

Meadowline is a calm, mobile-first isometric city builder evolving into a deeper **living-city simulation** while remaining a lightweight static browser game.

It uses native ES modules and a 2D canvas. Normal gameplay requires no Node/npm process, server runtime, React app, or heavy framework.

## Production and development status

### Implemented on `main`

Production `main` begins this milestone at:

`5d4054f764d603b23ddf1a74ab63824de67ea778`

That release already includes:

- modular static ES-module architecture
- Living City Foundation
- centralized building registry
- reusable civic-service framework
- School 2.0 / Education service
- finite School demand, assignment and capacity
- 7-tile School service radius
- 28-student School capacity
- Save Schema V3 with V1/V2 migration
- Housing 2.0
- Cottage → Town Home → Established Home residential evolution
- Neighborhood Desirability
- higher-tier residential capacity and tax value
- Housing-driven School demand
- green civic placement coverage visualization
- mobile pinch/build arbitration stabilization
- developer diagnostics

### Historical development branches

- `agent/architecture-refactor` — architectural refactor foundation
- `feature/living-city-foundation` — original Living City / School 2.0 development branch
- `feature/housing-2` — original Housing 2.0 development branch

PR #1 and PR #2 are historical drafts that were closed **without separate merge**. PR #3 superseded them and merged the validated Living City + Housing release into `main`.

### Current development milestone

Branch:

`feature/city-growth-progression`

Milestone:

**City Growth 1.0 — progressive land, development milestones, building unlocks and civic-upgrade foundation**

This branch must not be merged until automated validation is green and physical iPhone/iPad acceptance is complete.

## What City Growth 1.0 adds

Meadowline already models:

Services → household development → residential evolution → population growth → greater civic demand.

City Growth adds:

Small Settlement → healthy neighborhood → Village → new land and buildings → Township → stronger civic pressure → civic upgrades → Growing Town.

The world remains **44×44**. City Growth does not enlarge it; it makes the existing seeded landscape progressively developable.

### City stages

1. Settlement
2. Village
3. Township
4. Growing Town

Progression uses real city health rather than a generic XP bar. Inputs include population, occupied homes, road development, residential tiers, Education, School service, and Desirability.

The requirement model also supports flexible `any X of Y` groups so different successful layouts can progress.

### Progressive land

A new progression city begins in **Meadowline Center**, a 20×20 central development sector. The rest of the world still exists and remains visible with its terrain, ponds, natural trees, weather, and seasons.

Expansion occurs through deterministic parcels:

- Meadowline Center
- North Meadow
- East Meadow
- South Meadow
- West Meadow
- Northwest Fields
- Northeast Fields
- Southwest Fields
- Southeast Fields

A parcel requires an appropriate city stage, any neighboring prerequisite, and a reasonable coin investment. Meeting requirements makes land **available**; the player still chooses and confirms the purchase.

Locked land uses a restrained isometric tint/boundary instead of an opaque wall. The minimap uses a subtle equivalent treatment. Camera movement remains unrestricted.

### Legacy city safety

Pre–City Growth saves are never retroactively restricted.

City Growth has two save modes:

- `parcel` — new progression city
- `legacy-open` — established city with full land and building access

Any V1, V2, or earlier V3 save that lacks City Growth metadata migrates to `legacy-open`. Existing roads, rails, buildings, population, and train routes remain intact.

## Building unlocks

The authoritative building registry now owns each tool's `unlockStage`, so toolbar, keyboard selection, and placement all read the same metadata.

Current first-pass sequence:

**Settlement**
- Road
- House
- Café
- Park
- Trees
- Lamp

**Village**
- School
- Market
- Bakery

**Township**
- Rail
- Station
- Windmill

**Growing Town**
- Dock

Legacy cities retain access to all existing tools.

## School Level 2

City Growth 1.0 also proves a reusable civic-building upgrade path.

**Level 1 School**
- capacity 28
- radius 7

**Level 2 Expanded School**
- Township required
- cost 650 coins
- capacity 44
- radius remains 7
- persistent `state.level = 2`
- visible classroom-wing / clock upgrade

The choice is intentionally:

Build another School **or** upgrade the existing School.

The School upgrade increases capacity rather than making one provider cover the entire map.

## Housing 2.0 production behavior

The production residential loop remains:

Road Access + Mood + Education + Neighborhood Desirability
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ Higher Residential Tax Value
→ More Residents
→ More School Demand.

Current tiers:

- **Cottage** — 4 residents, 1.0× residential tax
- **Town Home** — 6 residents, 1.25× residential tax
- **Established Home** — 8 residents, 1.55× residential tax

Residential growth pauses rather than losing earned progress when conditions dip. Existing residents are not evicted by capacity-model changes.

## Neighborhood Desirability

Desirability is a separate 0–100 long-term neighborhood-development signal. It currently uses real systems such as road access, Mood, Education, parks, cafés, station access, lamps, trees/water, and local crowding.

Player-facing labels remain:

- Quiet Start
- Developing
- Pleasant
- Desirable
- Highly Desirable

Future Safety, Healthcare, Employment, and Prosperity remain roadmap-only.

## Save system

Current key:

`meadowline.v3`

V3 persists Housing state, School level, optional bounded building metadata, and now optional City Growth metadata:

```text
cityProgress: {
  mode,
  stage,
  unlockedParcels,
  claimedMilestones
}
```

Save V4 was not required.

## Performance model

Housing, Education, and City Growth do not evaluate at 60 FPS.

City Growth uses Meadowline's existing low-frequency simulation cadence and cheap tile/parcel lookups. Rendering only shades locked tiles that are currently visible.

`?debug=1` includes performance, service, Housing, City Growth, parcel, and School-upgrade diagnostics.

## Existing game systems preserved

The game still includes the 44×44 seeded world, ponds, natural trees, roads, rails, water bridges, homes, cafés, parks, trees, lamps, windmills, stations, docks, markets, bakeries, Schools, citizens, trains, boats, Mood, economy, day/night, seasons, weather, festivals, Wishes, Ledger, minimap, Look, placement/removal/refunds, persistence, and mobile pan/pinch controls.

Wishes remain temporary optional goals. City milestones are permanent progression and are intentionally separate.

## Running locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open:

`http://localhost:8000/`

Regression pages:

- `http://localhost:8000/tests/regression.html`
- `http://localhost:8000/tests/city-growth-regression.html`

Module hygiene:

```bash
node tests/module-hygiene.mjs
```

## Validation policy

Never treat CI as physical acceptance.

### Automatically validated

The GitHub Actions Living City Validation workflow checks:

- JavaScript syntax
- module hygiene / import-cycle safety
- original Living City + Housing browser regression
- City Growth browser regression

A feature is only called automatically validated after those checks have actually passed for the current branch head.

### Physically validated

Living City / School 2.0 and Housing 2.0 have prior owner-device acceptance recorded in `docs/IPHONE_ACCEPTANCE.md` and are production systems on `main`.

### Pending physical validation

City Growth 1.0 still requires physical iPhone/iPad acceptance for:

- starting-area feel
- locked-land appearance
- parcel interaction and confirmation
- touch/pinch/build regression
- Housing/Desirability/Education regression
- School Level 2 action and visual readability
- save/reload behavior
- performance while panning and opening land

See `docs/CITY_GROWTH_1.md` for the technical milestone record and `docs/IPHONE_ACCEPTANCE.md` for the device checklist.

## Roadmap-only systems

Not part of City Growth 1.0:

- larger worlds / chunking
- Police / Crime / Jail
- Fire / emergencies
- Hospital / Healthcare
- Employment / Prosperity
- advanced traffic
- road-over-rail crossings
- neighborhood identity
- giant persistent NPC populations
- civic staffing/budgets

After City Growth physical acceptance, the next milestone will be selected from Police/Crime, Recreation 2.0, Fire/Emergency, or Employment/Prosperity based on what actual play reveals.
