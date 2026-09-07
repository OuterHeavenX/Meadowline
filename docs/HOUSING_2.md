# Meadowline Housing 2.0

## Status

**Production on `main` through PR #3.** Historical implementation branch: `feature/housing-2`.

City Growth 1.0 / 1.1, City Hall 1.0, Roads & Mobility 2.0 and Recreation 2.0 are also production. UI / HUD 2.0 shipped as PR #11 and preserves Housing's authoritative thresholds, capacity and non-downgrade rules.

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


## Mansions and Estates

Two more rungs above Established Home, and two ways to reach one.

| rung | houses | tax | upkeep | needs |
|---|---|---|---|---|
| Cottage | 4 | ×1 | — | — |
| Town Home | 6 | ×1.25 | — | mood 65, education 15, desirability 45 |
| Established Home | 8 | ×1.55 | — | mood 78, education 35, desirability 62 |
| **Mansion** | 10 | ×2.1 | 9 | mood 86, education 55, desirability 78 |
| **Estate** | 12 | ×2.9 | 16 | mood 92, education 70, desirability 88 |

**Grown.** A good enough neighbourhood reaches them on its own. Desirability
tops out near 98, so 78 wants a schooled, well-moodied street with cafés and
lighting, and 88 wants very nearly everything a street can have — a station
included. The regression builds exactly that street and drives a home all the
way to Estate, because a rung nobody can climb would be a worse bug than a
rung that renders badly.

**Bought.** Mansion and Estate also appear in the Build menu at 940 and 1850.
They are **not building types of their own**: placing one puts down an
ordinary house that starts at the top of the ladder. That is the whole
mechanism, and it is why they need no simulation — a bought mansion is
schooled, taxed, made desirable, counted by its district and noticed by the
Social Fabric exactly like any other home, because it is one.

**Expensive in both senses.** They are the only homes that cost anything to
keep. Everything below them is free, which is what stops a valley simply being
paved in estates once it can afford the first one; the tax they pay is
generous enough that they remain worth having.

### What `paid` is for

Refunds would be wrong in both directions without it. A mansion bought for 940
and pulled down would refund half a cottage; a home the valley *grew* into an
estate would refund half an estate, which is a money printer — place a cottage,
wait, bulldoze. So each building records what was actually paid for it, and
`buildingValue()` falls back to the catalogue price for anything from before
this existed. It reads `costOf()` rather than the catalogue directly, because a
way laid over water costs three times as much and refunding a third of that
would be its own swindle — which the bridge-refund regression caught.

### Things that quietly assumed three rungs

Six places did: the GPU archetype list, its house builder, the roof-height
table, the flame anchor height, the authored-model key, and the Canvas
size/height/shadow ternaries. All six now read the ladder's real length.
Tiers 1–3 keep their authored models; 4 and 5 fall through to the procedural
path, where they are built with two storeys, wings under a parapet, a portico
with columns, chimneys and walled grounds — deliberately taller than the
authored Established Home, since a mansion that merely sprawls reads as the
poorer building.
