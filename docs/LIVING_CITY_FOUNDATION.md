# Meadowline Living City Foundation

Branch: `feature/living-city-foundation`

Foundation source: `agent/architecture-refactor`

This document is the technical/status record for Meadowline's first living-city milestone.

The goal of this branch was not simply to improve the School. It was to prove a reusable simulation pattern for future civic systems while preserving Meadowline's static-browser architecture.

The game still runs as native ES modules on the existing canvas/isometric renderer. React, a server runtime and a gameplay build step are not required.

## Milestone status

Status: **implemented and substantially validated; still intentionally unmerged**

Automated validation has been added through GitHub Actions and the branch has also undergone physical-iPhone testing by the owner.

### Physically demonstrated on iPhone

The following behavior has been directly observed on the live mobile build:

- School inspection panel renders correctly in portrait orientation
- School demand increases as nearby household population grows
- School capacity remains bounded at 28
- demand can exceed capacity without served count exceeding 28
- overloaded Schools display `At capacity`
- households can report `In range · full` when a School is close enough but has no remaining space
- household Education is visible and increases over time when service is available
- household inspection identifies its serving School and School capacity
- Education-service radius is displayed as 7 tiles
- two-finger pinch with School selected does not accidentally place a School
- the earlier visible-citizen over-count was repaired; a 6-resident household no longer reports more than 6 residents out

These observed checks are separate from automated tests. Anything not directly tested on the phone should not be described as physically proven merely because regression coverage exists.

## Building registry

`src/buildings/registry.js` is the authoritative source for buildable metadata that should be shared wherever practical.

It currently supports or prepares for:

- building ID
- display name
- category
- cost
- keyboard shortcut
- description
- render key
- placement metadata
- destination roles
- service type
- service radius
- service capacity
- upgrade definitions
- default persistent state

Existing specialist modules still own some tuning. Migration is intentionally incremental so the architecture can improve without destabilizing all current buildings at once.

## Civic-service framework

`src/simulation/civic-services.js` provides the reusable service layer.

Reserved service IDs include:

- `education`
- `safety`
- `healthcare`
- `fireProtection`
- `recreation`
- `employment`
- `transit`
- `sanitation`

Only **Education** is a real player-facing civic service on this branch.

The framework can answer the core questions future systems need:

- which buildings provide a service
- which households are in geographic reach
- how much demand exists
- how much capacity exists
- how much demand is served
- whether a provider is overloaded
- which provider is assigned to a household

Service recomputation is cached and invalidated by meaningful events rather than scanning all relationships at render frequency.

## Civic coverage philosophy

Service radius is configured **per provider**.

It is not globally fixed to 5 tiles.

This was reinforced after physical testing showed that overly tight civic radii would force too many large civic buildings into a small area as Meadowline grows.

Current guidance:

- tiny/local amenity: 2–4 tiles
- neighborhood amenity: 4–6 tiles
- School Education service: 7 tiles
- Police / Fire / Healthcare: likely 8–12+ depending on capacity and response design

Coverage means a provider can potentially serve a household. It does not mean infinite service. Capacity remains the limiting mechanism.

This distinction is important for future city density:

**large reach + finite capacity** is preferred over forcing a civic building every few blocks.

## School 2.0 defaults

Current School Education-service values:

- School cost: 145 coins
- Education radius: 7 tiles
- capacity: 28 student-demand units
- demand: half of household population, rounded up
- Education scale: 0–100
- provider assignment: deterministic nearest eligible provider with capacity-aware fallback
- progression: gradual while served
- overload: demand may exceed capacity; served count may not
- loss of coverage: Education already earned remains
- School persistent level: starts at 1

The older School proximity behavior is intentionally separate:

- legacy mood influence radius: 5 tiles
- legacy +2 resident-capacity perk radius: 5 tiles

Expanding Education to 7 tiles therefore does not silently spread every historical School bonus to 7 tiles.

## Household Education model

Education is stored at the household/building-state level rather than by converting every rendered pedestrian into a persistent saved citizen entity.

This keeps the simulation lightweight while allowing meaningful persistence.

Available APIs include:

- `getEducationLevel(house)`
- `getEducationFactor(house)`
- `getCityEducationAverage()`
- `educationAssignment(house)`
- `educationProvider(house)`
- `evaluateUpgradeReadiness(house)`

This model is intentionally compatible with future Housing 2.0, employment, prosperity and crime-pressure systems.

## Capacity behavior

A School covering a neighborhood does not automatically serve everyone in it.

Example physically observed state:

- served: 28 / 28
- demand in reach: 39
- utilization: 100%
- homes served: 14
- status: At capacity

A nearby household can therefore be geographically covered but still wait for service because available School places are full.

This is the model future civic services should generally follow:

Provider
→ Reach
→ Demand
→ Finite Capacity
→ Served / Waiting state

## Player-facing explanations

The Look tool now acts as a genuine simulation diagnostic.

### School inspection can show

- students served / capacity
- total demand in reach
- utilization
- homes served
- coverage radius
- status
- upgrade placeholder
- plain-language overload explanation

### Household inspection can show

- Education value and tier
- serving School
- School capacity
- coverage state
- whether Education is improving
- whether the household is waiting because the School is full

This establishes a design principle for future Meadowline systems:

**internal formulas may be complex; player explanations should be simple.**

## School placement feedback

School placement can highlight homes that would benefit from the proposed provider.

Current visual states:

- green: useful service capacity / strong benefit
- yellow: useful reach with capacity pressure
- neutral: little or no meaningful service gain

The city remains visually dominant; feedback is restrained rather than covering the map with a giant opaque radius field.

## Visible citizen behavior

A restrained portion of morning pedestrian behavior can choose an assigned School as a destination.

This makes the School feel like an institution rather than only a radius source.

Rendered pedestrians remain a lightweight representation of the city's population.

### Stabilization fix: household over-count

Physical testing exposed a case where a 6-resident home reported 8 people out on the streets.

The pedestrian representation is now capped per household and excess representatives are pruned when necessary.

The Look panel should never report more people out than actually live in that household.

Regression coverage was added for this rule.

## Save Schema V3

Current storage key:

`meadowline.v3`

V3 stores buildings using extensible objects rather than depending only on fixed positional arrays.

Example:

```json
{
  "type": "school",
  "x": 12,
  "y": 9,
  "state": {
    "level": 1
  }
}
```

House Education is stored in `state.education`.

The save system supports:

- V3 round-trip
- V2 migration
- V1 migration
- persistent Education
- persistent School level
- safe defaults for missing optional state
- defensive skipping of malformed/unknown entries
- bounded JSON-safe optional metadata preservation for future systems
- deterministic terrain regeneration from seed

The intention is to avoid creating a new save version for every small future building-state addition.

## State ownership

The compact `S` state object remains.

New Living City data is placed into clearer domains rather than adding unrelated root properties:

- `S.services` — civic-service cache / metrics / assignments
- `S.diagnostics` — opt-in developer measurements

A wholesale state rewrite is intentionally not part of this milestone.

## Mobile pointer arbitration

The previous input path placed a building immediately on first `pointerdown`.

That allowed this failure mode:

first finger down
→ School placed
→ second finger arrives
→ pinch begins too late

The new interaction is conceptually:

pointerdown
→ pending tap
→ second pointer cancels pending build
→ pinch begins
→ pointerup commits only a valid single tap

Road, Rail, Tree and Remove still retain paint-drag behavior.

Physical-iPhone testing confirmed that pinching with School selected does not accidentally place a School.

## Developer diagnostics

Open the game with:

`?debug=1`

The diagnostics surface includes information such as:

- FPS
- frame time
- simulation time
- render time
- grid size
- visible/rendered entity counts
- citizen count
- trains
- boats
- service-provider count
- service rebuilds
- path-search count
- save payload size

Normal players do not see this mode.

## Automated tests

The Living City regression suite includes checks for:

- building registry School definition
- preserved costs
- service coverage
- uncovered households
- finite School capacity
- overload bounds
- gradual Education progression
- no Education gain while uncovered
- Save V3 round-trip
- Education persistence
- School state persistence
- optional metadata persistence
- v2 migration
- v1 migration
- malformed optional-state handling
- 7-tile Education-service radius
- visible household pedestrian count not exceeding actual household population

The existing module-hygiene protections remain responsible for import-cycle, imported-binding and re-export-shim failures.

## Next major consumer — Housing 2.0

Housing 2.0 should now build on the service foundation rather than inventing an unrelated residential system.

Target relationship:

Road Access
+ Mood
+ Education
+ Neighborhood Desirability
+ Household State
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ Higher Revenue
→ Greater Service Demand

### Recommended first Housing 2.0 architecture

Add reusable residential metadata such as:

```js
levels: [
  { level: 1, capacity: 4, taxFactor: 1.0 },
  { level: 2, capacity: 6, taxFactor: 1.35 },
  { level: 3, capacity: 9, taxFactor: 1.8 }
]
```

Exact values and tier names require design work before implementation.

A house's persistent `state` should be able to hold:

- `education`
- `level`
- `upgradeProgress`
- future optional residential metadata

### First real upgrade inputs

Use only systems that exist:

- road access
- mood
- Education
- current household state
- an initial derived Desirability model if introduced

Do not display fake Police, Fire, Healthcare or Employment requirements.

### Desirability foundation

Desirability should be extensible and separate from Mood.

Possible current inputs:

- mood
- Education
- greenery / parks
- transit proximity
- crowding
- environmental quality already represented by existing systems

Possible future inputs:

- safety
- healthcare
- prosperity
- employment
- fire protection

### Upgrade pacing

Avoid citywide instant upgrades the moment thresholds are crossed.

Possible approaches:

- gradual upgrade progress
- build/evolution time
- cooldown between tiers
- a low-frequency residential evolution tick

The player should be able to see a neighborhood changing without everything transforming simultaneously.

### Upgrade persistence

A residential upgrade must preserve the household rather than replacing it with an unrelated new object.

Preserve:

- seed / identity
- Education
- population where valid
- relevant history/progress
- future metadata

### Feedback loop to Education

Higher-tier homes should support more people.

More people should increase School demand.

This creates the first cross-system Living City loop:

Education helps housing qualify
→ housing upgrades
→ population grows
→ School demand grows
→ School may overload
→ player adds/upgrades civic capacity

That loop is the primary reason Housing 2.0 is the recommended next milestone.

## Intentionally not implemented yet

The following remain roadmap-only:

- full Housing 2.0
- progressive land unlocks
- Police Station
- crime
- criminals
- arrests
- Jail
- Fire Department
- fires
- Hospital
- illness
- medicine
- medical research
- evolving viruses
- employment
- unemployment
- household income/prosperity
- traffic simulation
- road-over-rail crossings
- major world enlargement
- chunk rendering
- A* replacement
- giant persistent citizen population

## Major-building mini-ecosystem standard

Every future major building should answer:

1. What service does it provide?
2. Who uses it?
3. What does it consume?
4. What does it produce?
5. What limits it?
6. What can be upgraded?
7. Which systems influence it?
8. Which systems does it influence?
9. What visible citizen behavior does it create?
10. What pressure state can occur?

School 2.0 is the reference implementation for this standard.

## Product rule

The success of the Living City Foundation is not measured by the number of new buildings added.

It is measured by whether future systems can now be built as clean relationships instead of one-off special cases.