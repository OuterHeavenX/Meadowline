# Meadowline Housing 2.0

Branch: `feature/housing-2`

Starting parent: `feature/living-city-foundation`

Starting commit: `7e3262ccbc9c9c023cb40f12e37810e0379c9aad`

This document is the technical/status record for Meadowline's second Living City milestone.

Housing 2.0 turns residential buildings from mostly Mood-driven population containers into persistent neighborhood consumers that react to real city conditions and, in turn, create new civic demand.

## Product relationship

Road Access + Mood + Education + Neighborhood Desirability
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ More Residents
→ Higher Residential Tax Value
→ More School Demand
→ Greater Civic Pressure

The goal is not manual house micromanagement. Homes improve automatically after good conditions are sustained long enough.

## Residential tiers

The first milestone deliberately uses only three tiers.

| Tier | Name | Base capacity | Residential tax multiplier | Requirements to enter | Approx. base progress time |
|---|---|---:|---:|---|---:|
| 1 | Cottage | 4 | 1.00× | starting tier | — |
| 2 | Town Home | 6 | 1.25× | road, Mood 65+, Education 15+, Desirability 45+ | 50 s |
| 3 | Established Home | 8 | 1.55× | road, Mood 78+, Education 35+, Desirability 62+ | 85 s |

Upgrade time receives a small deterministic per-house variation derived from the house seed. This prevents every qualifying home from evolving on the same simulation tick.

Upgrade progress pauses if a requirement is lost. It does not reset or rapidly decay.

There is no residential downgrade system in this milestone.

## Household state

Housing stays household-based rather than creating a persistent database row for every rendered pedestrian.

V3 House state now supports:

```json
{
  "education": 42,
  "housingTier": 2,
  "upgradeProgress": 0.36,
  "desirability": 61
}
```

The same house seed/location and household population remain through a tier change.

## Legacy School +2 capacity audit

Before Housing 2.0, a School within its older 5-tile local influence could add +2 resident capacity to a home.

That rule conflicts with the new model because:

1. Housing tier should own residential density.
2. Education is now the School's actual civic outcome.
3. A School should not both directly create house capacity and indirectly enable higher-capacity housing unless that double effect is explicitly desired.

Decision for Housing 2.0:

- retire the School +2 rule for **new population growth**
- retain the older School Mood influence
- never evict existing residents during migration

`housingCapacity(house)` therefore returns at least the home's current population. An older Tier 1 household already containing six residents can keep all six; it simply cannot add more until its residential tier catches up.

This is a compatibility bridge, not a permanent six-person Cottage design.

## Neighborhood Desirability

Desirability is a 0–100 derived development metric separate from Mood.

Mood answers:

> How content are the residents right now?

Desirability answers:

> How attractive is this location for longer-term residential development?

Current contributors use only real systems already present in Meadowline:

- road access
- current Mood
- Education-service status
- household Education
- parks
- cafés
- station access
- street lamps
- trees and water
- crowding

Current labels:

- 0–24: Quiet Start
- 25–44: Developing
- 45–64: Pleasant
- 65–84: Desirable
- 85–100: Highly Desirable

No Crime, Safety, Healthcare, Employment, wages, Poverty or Fire values are fabricated.

## Housing simulation module

`src/simulation/housing.js` owns residential simulation logic.

Responsibilities:

- normalize Housing state
- tier lookup
- base and migration-safe capacity
- tax multiplier
- Desirability calculation
- readiness evaluation
- upgrade progress
- deterministic timing offsets
- automatic tier evolution
- aggregate Housing metrics

Housing UI does not live in this module.

Housing does not directly edit Education/School demand. When population changes, the existing generic civic-service invalidation/recompute path handles new demand.

## Upgrade behavior

A home becomes ready only when every requirement for the next tier is met.

For a qualifying home:

1. `upgradeProgress` increases on the low-frequency simulation tick.
2. A restrained map chevron can show that growth is active.
3. Look shows current percentage and the next tier.
4. Temporary loss of a requirement pauses progress.
5. At 100%, the tier advances automatically.
6. Household identity, Education and population remain.
7. Civic services are invalidated so increased future population demand can be reflected normally.

No per-house Upgrade button is required.

## Residential capacity

Current base capacities:

- Cottage: 4
- Town Home: 6
- Established Home: 8

Population still fills using Meadowline's existing road/Mood-based household growth logic.

A housing tier does not instantly create residents when it upgrades; it creates room for population to grow naturally.

## Residential tax value

Tier 1 retains the pre-Housing residential tax curve.

The daily tax calculation uses weighted occupied residents:

- Cottage resident: 1.00× weight
- Town Home resident: 1.25× weight
- Established Home resident: 1.55× weight

Trade, bakeries, markets, windmills and festival income remain separate.

This creates a modest reward for developed neighborhoods without a huge exponential economy jump.

## Visual residential evolution

Tier differentiation must be visible on iPhone through silhouette.

`src/rendering/housing.js` renders:

### Cottage

- smallest scale and height
- familiar gable profile
- standard windows

### Town Home

- wider/taller body
- extra upper window
- visible dormer

### Established Home

- largest body/height
- more upper windows
- dormer
- small fence/garden treatment

All tiers retain seeded wall/roof color variation, snow treatment, nighttime window lighting, chimney smoke, festivals and road-disconnected warnings.

Housing stays within one tile for this milestone.

## House Look 3.0

House inspection now explains four areas:

### Household

- resident names
- residents / capacity
- Mood
- Mood reasons

### Education

- Education value/tier
- serving School
- School served/capacity state
- coverage status
- improving/waiting/uncovered explanation

### Neighborhood

- Desirability value/label
- strongest current positive influences

### Residential Growth

- current tier
- next tier
- progress percentage
- road requirement
- Mood requirement
- Education requirement
- Desirability requirement
- plain-language active/waiting status

The Look panel already supports vertical scrolling on mobile.

## Citywide Housing metrics

The Ledger now includes:

- average Neighborhood Desirability
- Cottage count
- Town Home count
- Established Home count
- homes currently ready to grow

The permanent top HUD remains unchanged.

## Civic coverage visualization

Housing 2.0 also introduces the reusable civic-placement overlay requested during School 2.0 testing.

Module:

`src/rendering/service-overlays.js`

When School is selected for placement:

1. a light green field shows geographic service reach
2. a stronger green perimeter shows the edge
3. green house markers identify useful service gain
4. amber/yellow markers identify expected capacity pressure
5. the normal placement ghost remains visible
6. invalid placement remains red

### Why the visible field is not a literal 7×7 box

School's service configuration says `radius: 7`.

The simulation currently measures provider distance using Chebyshev distance:

```text
max(abs(dx), abs(dy)) <= 7
```

Therefore real coverage extends seven tile centers in every direction from the provider. Away from world edges, that corresponds to a 15×15 set of possible tile centers.

The user-facing overlay deliberately matches this real simulation region. Drawing only a 7×7 decorative box would falsely exclude homes the service logic can actually serve.

The overlay reads radius from the registry and clips cleanly at map edges.

## Generic overlay architecture

The civic preview is not a School-only special case.

A service definition can supply visual metadata, and the overlay reads the provider's actual radius.

Future civic providers can reuse the same placement language:

- School → Education
- Police → Safety
- Fire Department → Fire Protection
- Hospital → Healthcare

Only School is active today.

## Save V3

Housing 2.0 intentionally uses the extensibility added in Save V3 rather than creating Save V4.

Migration behavior:

- V1 house → Tier 1 defaults
- V2 house → Tier 1 defaults
- earlier V3 house without Housing fields → Tier 1 defaults
- Education preserved where present
- population preserved
- invalid Housing tier clamped to available tier range
- invalid progress clamped 0–1
- invalid Desirability clamped 0–100
- malformed optional state remains defensive

## Performance

Housing progression runs on the existing roughly one-second Living City simulation cadence, not on every rendered frame.

The service boundary is geometric and local to placement rendering.

Benefit markers use the existing provider-preview logic rather than rebuilding the whole service assignment network solely for boundary geometry.

Diagnostics add:

- Housing evaluations
- Housing upgrades
- Desirability recomputes

Existing FPS/frame/render/simulation/service/path/save metrics remain.

## Automated validation

The Housing branch extends regression checks for:

- registry Housing tier definitions
- Tier 1/2/3 capacities
- tax multipliers
- invalid tier repair
- grandfathered population migration safety
- Desirability bounds
- Education blocker
- valid upgrade readiness
- gradual progress
- paused progress retention
- eventual upgrade
- denser population increasing generic School demand
- exact civic boundary radius metadata
- service preview not highlighting homes beyond real reach
- V3 Housing tier persistence
- V3 progress persistence
- V1/V2 Housing defaults
- malformed Housing state defense

Existing Living City regression tests and module-hygiene validation remain required.

## Physical iPhone status

The new Housing 2.0 behavior is **not yet physically validated** merely because the parent School branch was proven on iPhone.

See `docs/IPHONE_ACCEPTANCE.md` for the new full device checklist.

Important new physical gates:

- tier visual readability
- gradual real upgrade
- Housing Look readability
- Desirability plausibility
- capacity/population/School-demand loop
- green service boundary accuracy
- pinch safety with boundary active
- Save V3 Housing persistence
- performance in mixed-tier neighborhoods

## Non-goals

Not implemented here:

- land unlocks
- Police / Crime / Jail
- Fire / fires
- Hospital / illness
- medicine / medical research / evolving viruses
- Employment / wages / Poverty / Prosperity
- full neighborhood identity system
- residential abandonment/downgrades
- property market
- traffic overhaul
- road-over-rail crossings
- map enlargement
- chunks
- A* rewrite
- giant persistent citizen simulation

## Next decision after acceptance

Do not start automatically.

The main candidates are:

1. Progressive Land & City Growth
2. Civic Service Upgrades / School Level 2
3. Police / Crime / Jail
4. Recreation 2.0

Housing 2.0 testing should determine whether Meadowline most urgently needs **more progression space** or **deeper civic management** next.
