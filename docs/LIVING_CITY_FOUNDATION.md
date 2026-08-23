# Meadowline Living City Foundation

Foundation implementation branch: `feature/living-city-foundation`

Current child milestone branch: `feature/housing-2`

Architectural source: `agent/architecture-refactor`

This document records the architectural foundation Meadowline now uses for deeper living-city systems and how Housing 2.0 consumes it.

The game remains a lightweight static browser game using native ES modules and the existing canvas/isometric renderer. React, a server runtime and a gameplay build step are not required.

## Foundation status

Living City Foundation / School 2.0 is implemented on `feature/living-city-foundation` and remains intentionally unmerged in draft PR #1.

Core School behavior has been physically demonstrated on the owner's iPhone, including finite capacity, real overload, household Education, 7-tile reach and pinch safety.

Housing 2.0 is being developed from that exact foundation on `feature/housing-2`; it does not replace or rewrite the civic-service architecture.

## Building registry

`src/buildings/registry.js` is the authoritative shared definition source for buildable metadata wherever practical.

It supports:

- building ID/name/category/cost
- shortcut and description
- placement metadata
- render key
- destination roles
- civic-service type/radius/capacity
- provider upgrade definitions
- default persistent state
- Housing 2.0 residential tier metadata

Housing 2.0 extends the House definition with three first-pass residential tiers while leaving the toolbar as a single House tool.

## Civic-service framework

`src/simulation/civic-services.js` provides the reusable provider/coverage/capacity/assignment layer.

Reserved service IDs include:

- `education`
- `safety`
- `healthcare`
- `fireProtection`
- `recreation`
- `employment`
- `transit`
- `sanitation`

Only Education is currently a real player-facing civic service.

The framework answers:

- which buildings provide a service
- which households are in geographic reach
- total demand
- total/provider capacity
- served demand
- overload state
- assigned provider

Service relationships are cached and invalidated by meaningful events rather than recomputed every render frame.

## School 2.0

Current Education-service values:

- cost: 145 coins
- Education radius: 7 tiles
- capacity: 28 student-demand units
- household demand: roughly half household population, rounded up
- Education scale: 0–100
- deterministic nearest/capacity-aware assignment
- gradual Education progression
- Education already earned remains if coverage is lost
- School level state begins at 1

The School's older mood influence remains local at 5 tiles.

### Housing-capacity legacy rule

The Living City Foundation originally preserved the historical +2 resident-capacity School proximity bonus for compatibility.

Housing 2.0 audits and retires that rule as a source of **future growth** because residential tier now owns residential density and Education is the School's real civic outcome.

The Housing 2.0 migration rule is deliberately safe:

- existing residents are not evicted
- a home already above its tier's new base capacity is grandfathered at its current population
- no new residents arrive above the tier base until the home evolves to a tier whose capacity supports them

This removes an architectural conflict without silently deleting residents from older saves.

## Household Education model

Education remains household/building state rather than converting every visible pedestrian into a persistent citizen record.

Key APIs include:

- `getEducationLevel(house)`
- `getEducationFactor(house)`
- `getCityEducationAverage()`
- `educationAssignment(house)`
- `educationProvider(house)`

Housing 2.0 consumes Education through its own residential readiness layer rather than adding Housing rules to the School module.

## Housing 2.0 consumer architecture

`src/simulation/housing.js` is the focused residential simulation module.

It owns:

- residential tier lookup
- base/legacy-safe capacity
- residential tax multiplier
- Neighborhood Desirability
- upgrade readiness
- automatic upgrade progress
- upgrade timing
- housing metrics

It does not own UI rendering or School service calculations.

### Residential tiers

Current values:

| Tier | Name | Base capacity | Tax multiplier | Requirements for entry |
|---|---|---:|---:|---|
| 1 | Cottage | 4 | 1.00× | starting tier |
| 2 | Town Home | 6 | 1.25× | road, Mood 65+, Education 15+, Desirability 45+ |
| 3 | Established Home | 8 | 1.55× | road, Mood 78+, Education 35+, Desirability 62+ |

Upgrade time is gradual and slightly offset per house using deterministic seed variation so neighborhoods do not transform on the same frame.

When a requirement drops below threshold, earned upgrade progress pauses rather than resetting.

No downgrade system exists.

## Neighborhood Desirability

Desirability is a separate 0–100 residential-development metric.

It is not a replacement for Mood.

Current real inputs:

- road access
- current Mood
- Education-service status
- household Education
- parks
- cafés
- station access
- lamps
- trees/water
- local crowding

Current labels:

- Quiet Start
- Developing
- Pleasant
- Desirable
- Highly Desirable

The model is intentionally extensible so real future Safety, Healthcare, Employment and Prosperity can contribute later.

Normal UI does not show those nonexistent systems today.

## Cross-system feedback loop

Housing 2.0 deliberately proves that service outcomes can feed growth and growth can feed service pressure:

Education + neighborhood conditions
→ residential qualification
→ housing tier upgrade
→ higher resident capacity
→ population growth
→ generic School demand increases
→ School utilization / overload changes

Housing never directly edits School demand. Population change invalidates the existing civic-service cache and the Education service recalculates naturally.

This is the first full circular Living City relationship.

## Civic-service coverage visualization

Housing 2.0 adds `src/rendering/service-overlays.js` as a reusable civic placement layer.

For a School placement preview it renders:

- light green service-area fill
- green geographic perimeter
- green household benefit markers
- amber/yellow capacity-pressure markers

The geographic boundary reads radius metadata from the building registry.

### Exact geometry rule

Current civic service distance is Chebyshev distance:

`max(abs(dx), abs(dy)) <= radius`

For School `radius: 7`, every tile center within seven steps in either axis is eligible for geographic coverage. The visual perimeter follows that exact region and clips at the world boundary.

The overlay therefore represents real service reach rather than a decorative circle or an unrelated hard-coded square.

The same renderer API is prepared for future civic providers; only School uses it today.

## Housing visual evolution

`src/rendering/housing.js` provides tier-aware home rendering without changing tile footprint.

The visual language is deliberately phone-readable:

- Tier 1 Cottage: smallest silhouette
- Tier 2 Town Home: wider/taller silhouette, dormer and additional upper window
- Tier 3 Established Home: larger silhouette, more upper windows and small garden/fence treatment

Wall/roof variation remains seed-based.

Active upgrade progress can display a restrained growth chevron.

## Player-facing explanation

House Look now combines:

### Household

- resident names
- current residents / capacity
- Mood and Mood reasons

### Education

- Education value/tier
- serving School
- School capacity
- coverage state
- plain-language service status

### Neighborhood

- Desirability value/label
- strongest current positive influences

### Residential growth

- current tier
- next tier
- upgrade progress
- road/Mood/Education/Desirability requirements
- `Growing toward…` or `Not ready yet`

The panel is already scrollable on mobile so added explanation does not require shrinking text.

## Residential economy

The original residential tax calculation is preserved for Tier 1.

Daily residential tax now uses a weighted resident total:

- Cottage residents: 1.00×
- Town Home residents: 1.25×
- Established Home residents: 1.55×

Trade, mills, festivals and other economy paths remain separate.

## Save Schema V3

Current key remains:

`meadowline.v3`

Housing 2.0 does not require Save V4.

House state now supports:

```json
{
  "education": 42,
  "housingTier": 2,
  "upgradeProgress": 0.36,
  "desirability": 61
}
```

V1, V2 and earlier V3 saves receive safe Housing defaults.

Validation clamps:

- Education to 0–100
- housing tier to an available tier
- upgrade progress to 0–1
- Desirability to 0–100

Unknown bounded JSON-safe optional metadata remains preserved.

## Performance model

Housing evolution runs on the existing low-frequency Living City simulation tick.

It is not tied to 60 FPS rendering.

Diagnostics now include:

- housing evaluations
- housing upgrades
- Desirability recomputes
- existing service rebuilds
- path searches
- save size
- frame/simulation/render timing

The 44×44 world remains unchanged for this milestone.

## Automated coverage

Housing 2.0 regression coverage now includes or prepares checks for:

- three residential definitions
- Tier 1/2/3 capacities
- invalid tier repair
- grandfathered population safety
- road/Mood/Education/Desirability readiness
- gradual upgrade progress
- paused progress retention
- eventual upgrade
- Desirability bounds
- tier tax multipliers
- housing-density → School-demand feedback
- exact 7-tile civic-boundary geometry
- provider-preview coverage not exceeding real radius
- V3 housing tier persistence
- V3 upgrade-progress persistence
- V1/V2 housing defaults
- malformed housing-state defense

Existing School, input, citizen, bridge, train, season/weather and save tests remain in the suite.

## Physical validation boundary

The new Housing 2.0 code must not be described as physically proven until the owner tests the branch on iPhone.

Required checks are maintained in `docs/IPHONE_ACCEPTANCE.md`.

## Still roadmap-only

Not implemented in Housing 2.0:

- land unlocks
- Police / Crime / Jail
- Fire Department / fires
- Hospital / healthcare
- illness / medicine
- medical research / evolving viruses
- employment / unemployment
- household wages / prosperity
- full neighborhood identity system
- advanced traffic
- road-over-rail crossing behavior
- enlarged map
- chunks
- A* rewrite
- giant persistent citizen population

## Architectural rule going forward

School 2.0 is the reference **provider** implementation.

Housing 2.0 is the reference **consumer of service outcomes**.

Future Meadowline systems should continue connecting through explicit state and reusable APIs rather than hidden one-off bonuses.