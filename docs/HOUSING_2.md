# Meadowline Housing 2.0

## Status

**Production on `main` through PR #3.** Historical implementation branch: `feature/housing-2`. Historical parent: `feature/living-city-foundation`.

Housing 2.0 is not an experiment; City Growth and Town Goals consume its real outputs.

## Core relationship

Road Access + Mood + Education + Neighborhood Desirability
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ Higher Residential Tax Value
→ More Residents
→ More School Demand
→ Greater Civic Pressure.

The player places one House tool. Homes evolve automatically after good conditions are sustained.

## Residential tiers

| Tier | Name | Base capacity | Tax multiplier | Key requirements |
| --- | --- | ---: | ---: | --- |
| 1 | Cottage | 4 | 1.00× | starting tier |
| 2 | Town Home | 6 | 1.25× | road, Mood 65+, Education 15+, Desirability 45+ |
| 3 | Established Home | 8 | 1.55× | road, Mood 78+, Education 35+, Desirability 62+ |

The first upgrade takes roughly 50 seconds of sustained qualifying simulation time and the second roughly 85 seconds, with restrained deterministic variation. Progress pauses rather than resets, and homes do not downgrade.

## Capacity migration

The former School +2 residential-capacity shortcut is retired. Education is the School's civic role; Housing tier owns residential density. Existing households above a nominal tier cap remain grandfathered and are never evicted by migration.

## Neighborhood Desirability

Desirability is a 0–100 long-term development signal distinct from short-term Mood. Inputs currently include roads, Mood, Education access/level, parks, cafés, stations, lamps, trees/water, and local crowding.

Labels remain Quiet Start, Developing, Pleasant, Desirable, and Highly Desirable.

Future Safety, Healthcare, Employment, and Prosperity are not simulated yet.

## House Look and visuals

House Look explains residents/capacity, Mood, Education/School state, Desirability, current/next tier, progress, and real requirements. It remains scrollable on mobile.

Tier silhouettes remain readable at practical phone zoom: Cottage < Town Home < Established Home while seeded visual variation remains.

## Education feedback

Denser Housing raises School demand through the generic civic provider model. This remains the reason City Growth can create a meaningful choice between building another School and upgrading an existing one.

## Save / performance

Housing remains inside `meadowline.v3`; per-house state includes Education, Housing tier, upgrade progress, Desirability, and bounded optional metadata. Invalid values are repaired defensively.

Housing/Desirability use low-frequency Living City evaluation and cached service data, not frame-by-frame progression.

## Relationship to City Growth 1.1

City Growth stages and **Town Goals** read actual Housing results such as occupied homes, Town Homes, Established Homes, Education, Desirability, and School demand. They do not create a parallel residential XP system.

Typical guided relationships now include:

healthy Village
→ first School / Education
→ Town Homes / Desirability
→ Township
→ denser Housing / School pressure
→ School Level 2 or another School.

Town Goals may suggest Housing improvement only when it makes sense for the current city stage. Housing thresholds themselves remain unchanged by the UI/goal refinement unless a separately documented balance pass proves a need.

Physical regression requirements are maintained in `docs/IPHONE_ACCEPTANCE.md`.
