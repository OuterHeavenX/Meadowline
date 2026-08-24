# Meadowline Roadmap

Meadowline is evolving from a calm small city builder into a deeper living-city simulation while preserving its static browser architecture, native ES modules, isometric Canvas 2D presentation, mobile-first interaction, and low-stress character.

Status labels in this roadmap are deliberate: **production**, **historical implementation**, **automatically validated**, **physically validated**, **needs refinement**, and **roadmap only** are not interchangeable.

## Production baseline

`main` at the start of City Growth: `5d4054f764d603b23ddf1a74ab63824de67ea778`.

Merged through PR #3:

- modular architecture
- Living City Foundation
- School 2.0 / Education
- Save V3
- Housing 2.0
- Neighborhood Desirability
- residential evolution
- civic placement visualization
- original pinch/build arbitration repair

Historical branches `agent/architecture-refactor`, `feature/living-city-foundation`, and `feature/housing-2` remain preserved.

## Milestone 1 — Living City Foundation / School 2.0

**Production.**

Established the authoritative building registry, reusable civic provider model, persistent household Education, deterministic capacity-bounded School assignment, Save V3 migration, Look/service explanations, diagnostics, and mobile pinch/build safety.

School Level 1 remains 28 capacity / radius 7.

## Milestone 2 — Housing 2.0 / Neighborhood Desirability

**Production.**

Road + Mood + Education + Desirability
→ residential readiness
→ Cottage / Town Home / Established Home
→ higher capacity and tax value
→ greater population
→ greater School demand.

The system remains gradual, non-destructive, and does not evict grandfathered residents.

## Milestone 3 — City Growth 1.0 / 1.1

Branch: `feature/city-growth-progression`

Draft PR: #4

**Not merged. Physical acceptance remains the gate.**

### City Growth 1.0 foundation

Four stages:

1. Settlement
2. Village
3. Township
4. Growing Town

The 44×44 world is not enlarged. A new progression city begins in Meadowline Center and expands through deterministic North/East/South/West and outer-corner parcels. Terrain always remains present beneath development locks. Existing pre-City-Growth cities migrate to `legacy-open` and keep full access.

Registry-driven first-pass tool progression:

- Settlement — Road, House, Café, Park, Trees, Lamp
- Village — School, Market, Bakery
- Township — Rail, Station, Windmill
- Growing Town — Dock

School Level 2 proves generic civic upgrades: Township + 650 coins, 28 → 44 capacity, radius remains 7.

### City Growth 1.1 — current refinement

The first owner iPad pass proved the need for refinement before merge:

- Boat Wish appeared early because old logic only tested whether any world water existed;
- Train Wish could appear before Township/transit readiness;
- selected build/paint tools made an intended pan capable of accidental construction;
- the permanent tool dock did not communicate build intent clearly enough.

The first revised UI then proved that auto-cancelling normal building tools after one placement was too cumbersome and that a floating Look strip could obstruct the build catalog. The current UI keeps normal building tools armed until explicitly cancelled/replaced, preserves safe drag-to-pan, uses in-dock active build controls, and avoids an obstructive Look strip.

A later owner iPad session reports the refined build as **“Everything is looking great!”** and physically shows a Day 14, 92-citizen **Growing Town** with coherent parcel-expansion/Trees Town Goals, readable dense development, and the compact command bar while the map remains dominant. This is strong positive device evidence, but PR #4 still awaits the remaining explicit gesture/save/School checks and owner merge approval.

#### Guided Development / Town Goals

City Milestones remain permanent progression. Town Goals remain shorter contextual goals with modest rewards.

Each stage favors one primary **Next Step** plus one optional goal selected only after eligibility filtering.

Town Goals use real state:

- stage and building unlocks
- population / occupied homes
- Housing tiers
- Education and students served
- Desirability
- parcel expansion
- rail infrastructure/readiness
- usable waterfront / Dock readiness

Randomness is allowed only among equally sensible optional candidates.

#### Permanent touch-navigation philosophy

On touch devices:

- immediate drag means **navigate**;
- tap means **act/place**;
- two fingers mean **pinch/zoom**, cancelling construction intent;
- repeated paint/destructive actions require an intentional short hold before drag;
- normal building tools may remain armed for repeated placement without sacrificing safe drag-to-pan.

Future features must not reintroduce a hidden requirement to switch to a Move tool before safely touching the map.

#### Mobile UI philosophy

The bottom UI is a command surface rather than an always-expanded catalog:

- Build button
- collapsible build categories
- clear Move / Look / Remove modes
- in-dock active build controls
- visible gesture instruction
- `✓` keep tool / close tray
- `×` cancel tool
- stage-aware locked labels

The map remains visually dominant.

# Recommended next milestone after City Growth merge

## Milestone 4 — Recreation 2.0 / Town Life

**Roadmap only until City Growth is physically accepted and merged.**

This is the recommended next major simulation milestone because it deepens systems already present without introducing punitive city-failure loops prematurely.

Core relationship:

Population / Density
→ Recreation Demand / Boredom Pressure
→ Park + future Recreation access
→ Leisure satisfaction
→ Mood
→ Desirability
→ Housing stability/evolution
→ healthier neighborhood growth.

Why this comes next:

- Parks already exist visually and economically but do not yet function as a true bounded civic service.
- Living City Foundation already provides the reusable service-provider architecture.
- Housing 2.0 already consumes Mood and Desirability.
- City Growth now creates denser neighborhoods and stronger civic demand.
- Recreation gives the player a positive reason to preserve green space as land becomes valuable.
- It remains calm, observable and non-punitive, matching Meadowline's identity.

A future Recreation 2.0 implementation should likely include:

- persistent household Recreation / boredom state or a carefully bounded derived equivalent;
- Park as the first Recreation provider;
- finite service radius/capacity where appropriate rather than map-wide magic;
- Look explanations such as `Recreation nearby`, `Needs a place to unwind`, or `Park is crowded`;
- green placement preview derived from real service geometry;
- Town Goals that suggest Parks only when real Recreation demand exists;
- progression-aware Park upgrades or a second recreation building only if the registry architecture supports it cleanly;
- measurable effects on Mood and Desirability without catastrophic penalties;
- Save V3-compatible optional metadata if possible;
- physical iPhone/iPad acceptance and performance diagnostics.

Do not automatically begin this milestone before PR #4 is approved/merged and a fresh branch is created from the then-current validated `main`.

## Other future system graph — roadmap only

### Waterworks / Landscaping

**Roadmap only.** Do not implement merely to satisfy a Boat goal.

Possible future relationship:

Landscaping
→ Pond / Creek / Canal creation
→ waterfront Desirability
→ Recreation
→ Dock opportunities
→ Boats / bridges
→ waterfront neighborhoods.

Potential future tools:

- Create Pond
- Extend Water
- Creek
- Canal
- Fill/Reclaim Water
- Waterfront landscaping

This deserves its own terrain/save/placement milestone after City Growth is physically stable.

### Safety / Police / Crime / Jail

Education + density + future Prosperity
→ crime pressure
→ Police coverage
→ incidents/arrests
→ Jail
→ Safety
→ Desirability.

### Fire / Emergency

Density
→ fire risk
→ Fire coverage
→ response/recovery
→ neighborhood stability.

### Employment / Prosperity

Education
→ qualification
→ employment
→ household Prosperity
→ Desirability / housing / tax base.

### Healthcare

Population/density/future wellbeing pressure
→ healthcare access
→ recovery/stability
→ Desirability.

### Transport evolution

Potential later work:

- road-over-rail automatic crossings
- traffic/usage
- stronger transit service
- district mobility

Do not rewrite A* as part of City Growth.

### Larger world / chunks

Do not enlarge Meadowline until progression, service pressure, touch interaction, UI clarity, and performance are proven on the current 44×44 map.

## Permanent design principles

Meadowline should remain peaceful, understandable, charming, low stress, mobile friendly, rewarding to observe, forgiving, and progressively deeper.

Do not introduce premium currencies, energy systems, monetization pacing, arbitrary waiting gates, or repetitive busywork.

## Current merge gate

PR #4 may only move toward merge after:

- current branch automation passes at the final candidate SHA;
- inappropriate early transport goals are physically confirmed fixed across appropriate stages;
- drag-to-pan is safe with build tools selected;
- repeated normal-building placement is comfortable;
- intentional paint/removal remains comfortable;
- new mobile build UI remains comfortable on iPhone and iPad;
- critical legacy-save checks pass;
- School Level 2 is physically verified;
- City Growth/Housing/Education/save regressions pass;
- owner explicitly approves the merge.

After that physical gate, merge only with explicit owner approval, then create the next milestone branch from the newly validated `main` rather than stacking Recreation work onto PR #4.
