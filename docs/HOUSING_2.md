# Meadowline Housing 2.0

## Status

**Production status:** implemented on `main` through merged PR #3.

**Historical development branch:** `feature/housing-2`.

**Historical parent:** `feature/living-city-foundation`.

Housing 2.0 is no longer an unmerged experiment. It is the production residential system that City Growth 1.0 consumes.

## Product relationship

Road Access + Mood + Education + Neighborhood Desirability
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ Higher Residential Tax Value
→ More Residents
→ More School Demand
→ Greater Civic Pressure.

Homes improve automatically when good conditions are sustained. The player places one House tool rather than manually choosing residential tiers.

## Residential tiers

| Tier | Name | Base capacity | Residential tax multiplier | Key requirements |
| --- | --- | ---: | ---: | --- |
| 1 | Cottage | 4 | 1.00× | starting tier |
| 2 | Town Home | 6 | 1.25× | road, Mood 65+, Education 15+, Desirability 45+ |
| 3 | Established Home | 8 | 1.55× | road, Mood 78+, Education 35+, Desirability 62+ |

The first upgrade uses roughly 50 seconds of sustained qualifying simulation time and the second roughly 85 seconds, with restrained deterministic variation. Progress pauses rather than resetting if conditions fall away, and higher-tier homes do not downgrade.

## Capacity migration

The older School +2 residential-capacity behavior is retired as a source of new density. Education is the School's civic role and residential tier owns residential capacity.

Migration remains gentle: a household already above a new tier's nominal capacity is grandfathered. Existing residents are not evicted; further growth waits for the appropriate tier.

## Neighborhood Desirability

Desirability is a persistent 0–100 development signal separate from Mood.

Current real inputs include:

- road access
- Mood
- Education access / household Education
- parks
- cafés
- station access
- lamps
- trees and water
- local crowding pressure

Current labels:

- Quiet Start
- Developing
- Pleasant
- Desirable
- Highly Desirable

Future Safety, Healthcare, Employment, and Prosperity are not simulated by Housing 2.0.

## House Look

The production Look panel explains:

- residents and capacity
- Mood and Mood reasons
- Education and serving School state
- Neighborhood Desirability
- current residential tier
- next tier
- upgrade progress
- each real upgrade requirement
- growing versus waiting state

The panel stays scrollable on mobile rather than shrinking its text.

## Visual evolution

Residential tiers change silhouette at practical phone zoom:

- Cottage — smallest form
- Town Home — wider/taller form with upper-window/dormer treatment
- Established Home — largest form with extra upper detail and restrained landscaping

Seeded wall/roof variation remains. Active upgrade progress uses a restrained indicator rather than permanent map clutter.

## Education feedback

Denser Housing creates additional School demand through the generic Education service path. This is important for City Growth: a successful neighborhood can naturally pressure a 28-seat School and make another School or a Level 2 upgrade meaningful.

## Save V3

Housing remains inside `meadowline.v3`.

Per-house state includes:

- `education`
- `housingTier`
- `upgradeProgress`
- `desirability`
- bounded optional metadata

Earlier saves receive safe Tier 1 defaults. Invalid tier/progress/Education/Desirability values are clamped defensively.

## Performance

Housing does not evaluate at 60 FPS. Residential evolution and Desirability use the low-frequency Living City simulation path and cached service data.

Developer diagnostics record housing evaluations, upgrades, and Desirability recomputes.

## Validation record

Housing 2.0 was automatically validated on its development branch before inclusion in PR #3, and its production status is now represented by the merged `main` release.

Physical-device observations and regression requirements are maintained in `docs/IPHONE_ACCEPTANCE.md`.

## Relationship to City Growth 1.0

City Growth reads Housing outcomes rather than creating parallel progression counters. City stages use real values such as occupied homes, Town Homes, Established Homes, average Education, and average Desirability.

Housing therefore becomes a path to earning land and civic capability rather than an isolated cosmetic upgrade system.
