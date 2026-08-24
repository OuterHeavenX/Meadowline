# Meadowline Housing 2.0

## Status

**Production on `main` through PR #3.** Historical implementation branch: `feature/housing-2`.

City Growth 1.0 / 1.1 and City Hall 1.0 are also production. Roads & Mobility 2.0 is current development and must preserve Housing's Road-access contract.

## Core relationship

Road Access + Mood + Education + Neighborhood Desirability
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ Higher Residential Tax Value
→ More Residents
→ More School Demand
→ Greater Civic Pressure.

The player places one House tool. Homes evolve automatically after sustained qualifying conditions.

## Residential tiers

| Tier | Name | Base capacity | Tax multiplier | Key requirements |
| --- | --- | ---: | ---: | --- |
| 1 | Cottage | 4 | 1.00× | starting tier |
| 2 | Town Home | 6 | 1.25× | road, Mood 65+, Education 15+, Desirability 45+ |
| 3 | Established Home | 8 | 1.55× | road, Mood 78+, Education 35+, Desirability 62+ |

First upgrade is roughly 50 seconds of sustained qualifying simulation time; second roughly 85 seconds. Progress pauses rather than resets and homes do not downgrade.

## Capacity migration

The former School +2 residential-capacity shortcut remains retired. Education is the School's civic role; Housing tier owns residential density. Existing households above a nominal tier cap remain grandfathered and are never evicted by migration.

## Neighborhood Desirability

Desirability remains a 0–100 long-term development signal distinct from short-term Mood. Inputs include Roads, Mood, Education access/level, parks, cafés, stations, lamps, trees/water and local crowding.

Future Safety, Healthcare, Employment, Prosperity and Recreation service are not simulated yet.

## Roads & Mobility 2.0 compatibility

Roads & Mobility changes **presentation and movement infrastructure**, not Housing's authoritative Road requirement.

An existing Road tile still counts as one Road-access tile. A clean Road/Rail crossing also exposes the same Road semantic at that one tile. Sidewalk/carriageway sub-elements are visual/derived and never count as extra Roads.

Therefore Roads 2.0 must not cause:

- homes to unlink merely because Road visuals changed;
- residential upgrade progress to reset;
- population to be evicted;
- Housing tiers/tax multipliers to change;
- Desirability to collapse from a new duplicate Road definition.

Housing does not own traffic, vehicles, route caches or Rail crossing simulation.

## House Look and City Hall

House Look remains the authoritative local explanation for residents/capacity, Mood, Education/School state, Desirability, current/next tier, progress and requirements.

City Hall remains a citywide summary. It now may also show truthful Mobility aggregates, but Housing thresholds/timers/population/taxes remain authoritative here and in Housing simulation.

## Education feedback

Denser Housing raises School demand through the generic civic-provider model. Roads & Mobility does not change this relationship.

## Save / performance

Housing remains inside `meadowline.v3`; per-house state includes Education, Housing tier, upgrade progress and Desirability.

Existing pre-Roads V3 cities load their same House/road topology. Roads are not rebuilt or recharged. Ambient vehicles are transient and do not enlarge per-house save state.

Physical regression requirements remain in `docs/IPHONE_ACCEPTANCE.md`.
