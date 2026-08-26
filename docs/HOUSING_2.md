# Meadowline Housing 2.0

## Status

**Production on `main` through PR #3.** Historical implementation branch: `feature/housing-2`.

City Growth 1.0 / 1.1, City Hall 1.0, Roads & Mobility 2.0 and Recreation 2.0 are also production. UI / HUD 2.0 is current development and preserves Housing's authoritative thresholds, capacity and non-downgrade rules.

## Core relationship

Road Access + Mood + Education + Neighborhood Desirability
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ Higher Residential Tax Value
→ More Residents
→ More Education/Recreation demand
→ Greater Civic Pressure.

The player places one House tool. Homes evolve automatically after sustained qualifying conditions.

## Residential tiers

| Tier | Name | Base capacity | Tax multiplier | Key requirements |
| --- | --- | ---: | ---: | --- |
| 1 | Cottage | 4 | 1.00× | starting tier |
| 2 | Town Home | 6 | 1.25× | road, Mood 65+, Education 15+, Desirability 45+ |
| 3 | Established Home | 8 | 1.55× | road, Mood 78+, Education 35+, Desirability 62+ |

First upgrade is roughly 50 seconds of sustained qualifying simulation time; second roughly 85 seconds. Progress pauses rather than resets and homes do not downgrade.

**Recreation 2.0 changes none of these thresholds, capacities, tax multipliers or timers.**

## Capacity migration

The former School +2 residential-capacity shortcut remains retired. Education is the School's civic role; Housing tier owns residential density. Existing households above a nominal tier cap remain grandfathered and are never evicted by migration.

Recreation does not add or remove residents directly. Higher Housing density naturally creates more Recreation demand because real household population is the demand source.

## Neighborhood Desirability

Desirability remains a 0–100 long-term development signal distinct from short-term Mood.

Recreation 2.0 replaces the old duplicate geometric Park influence with a real service chain:

connected Recreation access + finite capacity
→ bounded Recreation satisfaction
→ bounded Mood contribution
→ modest bounded direct Desirability contribution.

This keeps Recreation important without allowing Park adjacency + Recreation + visitors to stack into an outsized neighborhood bonus.

Other existing Desirability inputs such as Roads, Education, cafés, stations, lamps, trees/water and crowding remain intact.

## Roads & Mobility compatibility

An existing Road tile still counts as one Road-access tile. A clean Road/Rail crossing also exposes the same Road semantic at that one tile. Sidewalk/carriageway sub-elements are visual/derived and never count as extra Roads.

Recreation uses Roads for facility access but does not redefine Housing's Road-linked state.

Therefore Recreation must not cause:

- homes to unlink merely because facility access changes;
- residential upgrade progress to reset;
- population to be evicted;
- Housing tiers/tax multipliers to change;
- homes to downgrade;
- direct Recreation service to become a hidden new tier requirement.

## House Look and City Hall

House Look remains authoritative for residents/capacity, Mood, Education, Desirability, residential tier/progress and requirements.

Recreation adds one concise local block showing status, residents served, nearby public space and an understandable explanation such as Good / Limited / No Recreation access.

City Hall remains citywide only. Housing does not own Recreation summaries.

## Education and Recreation feedback

Denser Housing raises School demand through Education and Recreation demand through the Recreation service model. Neither system owns Housing density.

This creates the intended city-planning loop without adding per-citizen demographics:

better neighborhoods
→ denser homes
→ more residents
→ greater demand for real civic/public space.

## Save / performance

Housing remains inside `meadowline.v3`; per-house state includes Education, Housing tier, upgrade progress, Desirability and bounded Recreation satisfaction.

Existing saves keep Housing, residents, progress and money. No old city is forced to rebuild Parks or Recreation before loading successfully.

Physical regression requirements remain in `docs/IPHONE_ACCEPTANCE.md`.
