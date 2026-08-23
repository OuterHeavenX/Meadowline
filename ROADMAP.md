# Meadowline Roadmap

Meadowline is evolving from a calm small city builder into a deeper **living-city simulation** while preserving its lightweight static-browser architecture, isometric presentation and mobile-first controls.

## Project status snapshot

Current development branch: `feature/living-city-foundation`

Foundation branch: `agent/architecture-refactor`

Current milestone: **Living City Foundation / School 2.0**

Status: **implemented, automated validation established, and core behavior physically proven on iPhone; still unmerged**

### Completed in the Living City Foundation

- centralized authoritative building registry
- reusable civic-service architecture
- Education as the first real civic service
- persistent household Education state
- deterministic provider assignment
- School demand / served / capacity / utilization metrics
- finite School capacity: 28
- Education-service coverage expanded to 7 tiles
- legacy School mood / +2 housing-capacity effect kept local at 5 tiles
- configurable per-building civic-service radius for future systems
- School placement preview with positive/capacity-pressure feedback
- expanded School inspection
- expanded household Education inspection
- citywide Education metrics in the Ledger
- gradual Education progression instead of instant bonuses
- Education retained when coverage is lost
- restrained School-attendance pedestrian behavior
- visible pedestrian count capped by actual household population
- Save Schema V3
- v1 and v2 migration
- defensive malformed-state handling
- preserved optional future building metadata
- mobile pinch/build arbitration fix
- developer diagnostics and route-search instrumentation
- expanded automated regression coverage
- module-hygiene protection
- physical-iPhone acceptance checklist

### Physically proven on iPhone so far

The owner has directly observed and confirmed:

- Meadowline loads and runs on the live mobile build
- School inspection is readable in portrait orientation
- School demand changes as nearby population grows
- School capacity correctly stops at 28 / 28
- overload state appears when demand exceeds capacity
- a household can report that it is in range but waiting because the School is full
- household Education increases and is shown in Look
- serving School and capacity are explained in the household panel
- Education-service radius displays as 7 tiles
- pinch-to-zoom with School selected does not accidentally place a School
- the household pedestrian over-count bug was repaired; a 6-person home no longer reports more than 6 residents out

Items not specifically observed should not be retroactively marked as physically proven merely because automated tests cover them.

---

# Next major milestone — Housing 2.0

Housing 2.0 is the recommended next move because it becomes the first major consumer of persistent household state and civic-service quality.

Core relationship:

Road Access
+
Mood
+
Education
+
Neighborhood Desirability
+
Household State
↓
Upgrade Readiness
↓
Residential Evolution
↓
Higher Capacity
↓
Higher Tax Revenue
↓
Greater Civic-Service Demand

This creates the first meaningful feedback loop between city services and city growth.

## Housing 2.0 — design goals

### 1. Residential tiers

Introduce a small, understandable first set of housing tiers rather than a huge upgrade tree.

Possible conceptual progression:

- Cottage / Starter Home
- Improved Home
- Townhouse / Larger Home
- Higher-density residential tier later

Exact names and visuals should fit Meadowline's art direction.

The first pass should prove the architecture, not maximize the number of house types.

### 2. Upgrade readiness

A house should have a reusable upgrade evaluation model.

For the first Housing 2.0 milestone, only real current systems should count:

- road access
- mood
- Education
- possibly local environment / current crowding if cleanly supported

Do **not** expose fake Safety, Healthcare, Employment or Fire requirements before those systems exist.

Example player-facing explanation:

Upgrade readiness
- Road access: Ready
- Mood: Ready
- Education: 47 / 50
- Overall: Almost ready

The Look panel should explain why a home can or cannot evolve without making the player decode formulas.

### 3. Neighborhood Desirability foundation

Create an extensible desirability value or evaluation API that can initially use existing inputs such as:

- mood
- Education
- parks / greenery
- transit proximity
- overcrowding
- possibly waterfront / environment effects already represented by current systems

Later systems should be able to contribute:

- safety
- healthcare
- employment
- prosperity
- fire protection
- pollution / sanitation if ever adopted

Desirability should not become a second hidden mood score. Its purpose should be residential evolution and neighborhood identity.

### 4. Preserve household history

When a house upgrades, preserve meaningful state:

- household Education
- household identity / house seed
- population where valid
- progress state
- future optional metadata

Do not destroy a household and spawn a completely unrelated replacement just to change the building art.

### 5. Growth and capacity

Higher residential tiers should support more residents.

That increased population should naturally create:

- greater tax revenue
- greater School demand
- later greater healthcare / safety / employment demand

This makes service capacity pressure emerge from development rather than from arbitrary difficulty modifiers.

### 6. Gentle pacing

Avoid instant cascading upgrades across the whole city the moment requirements are met.

Potential pacing tools:

- gradual upgrade progress
- a short construction/evolution timer
- neighborhood growth intervals
- upgrade cooldowns
- player confirmation only for major tier jumps, if needed

The game should feel alive, not chaotic.

### 7. Residential visual evolution

Upgraded homes need visible change.

The first pass should favor clearly readable silhouette / roof / footprint / height changes that still fit Meadowline's current art style.

Avoid tiny cosmetic differences that are impossible to perceive on a phone.

### 8. Housing placement and Look UI

House inspection should evolve into a true neighborhood diagnostic:

- current tier
- residents / capacity
- mood
- Education
- desirability
- upgrade progress/readiness
- concise explanation of the strongest blocker or positive factor

The normal HUD should not become permanently crowded.

### 9. Save compatibility

Housing 2.0 must remain within Save V3 unless a real schema break is necessary.

Preferred approach:

```json
{
  "type": "house",
  "x": 12,
  "y": 9,
  "pop": 6,
  "state": {
    "education": 48,
    "level": 2,
    "upgradeProgress": 0.4
  }
}
```

Use existing optional metadata support rather than creating needless new save versions.

### 10. Tests for Housing 2.0

Expected automated coverage:

- upgrade readiness evaluates correctly
- Education threshold matters
- road requirement matters
- mood requirement matters
- unavailable future services are ignored
- houses do not downgrade or reset unexpectedly
- upgrade preserves Education
- capacity increases correctly
- tax/population calculations remain bounded
- service demand rises after residential capacity/population rises
- Save V3 round-trip preserves residential level/progress
- older saves receive safe housing defaults

### 11. iPhone acceptance for Housing 2.0

Physical-device checks should include:

- upgraded house is visually distinguishable at practical zoom
- Look panel remains readable
- upgrade explanation is understandable
- no accidental taps caused by new controls
- neighborhood upgrades do not create visible stutter
- School demand reacts correctly to denser housing
- save/reload preserves upgraded homes

---

# Likely milestone sequence after Housing 2.0

The exact order can change based on what testing reveals, but the current recommended progression is:

1. Living City Foundation / School 2.0 — current branch
2. Housing 2.0 + Neighborhood Desirability foundation
3. Progressive land / early-city progression structure
4. Police + Crime + Jail foundation
5. Fire / emergency-response system
6. Healthcare + sickness foundation
7. Employment + prosperity + deeper economy
8. Medical research / medicine / evolving disease systems
9. Large-world architecture
10. dramatically larger city and larger representational population

Small stabilization passes should occur between major milestones whenever physical-device testing exposes issues.

---

# Progressive land and city growth

Planned design:

- begin future new games with a smaller usable area
- unlock additional land through city progression
- introduce buildings progressively rather than exposing everything at once
- make expansion feel earned
- preserve older neighborhoods as meaningful districts
- avoid forcing the player to fill every tile before expanding

Large-scale expansion should be coordinated with future large-world architecture rather than simply increasing the current 44×44 simulation workload.

---

# Civic-service coverage philosophy

Civic buildings should not all use the same radius.

Current guidance:

- tiny/local amenity: roughly 2–4 tiles
- neighborhood amenity: roughly 4–6 tiles
- School / neighborhood civic service: currently 7 tiles
- Police / Fire / Healthcare: likely 8–12+ tiles depending on capacity and response mechanics
- citywide/specialized buildings may use non-radius logic later

Coverage should determine **reach**, while capacity determines **how much demand can actually be served**.

This avoids cramming a Police Station, Hospital, Fire Department or School onto every few blocks.

---

# Police, Crime and Jail

Planned after Housing 2.0 is proven.

Target relationship:

Education
+
Employment
+
Prosperity
+
Overcrowding
+
Police Coverage
↓
Crime Pressure
↓
Criminal Activity
↓
Police Response
↓
Arrests
↓
Jail Capacity
↓
Neighborhood Safety
↓
Desirability

Potential requirements:

- Police Station as `safety` service provider
- independently tuned coverage radius
- officer/response capacity rather than simple infinite radius
- crime-pressure generation at household/neighborhood level
- visible incidents kept restrained and understandable
- arrests and Jail as later linked capacity system
- no punishment spiral where one incident destroys a city

No Crime or Safety number should appear in normal UI until those systems actually exist.

---

# Fire and emergency response

Planned:

- Fire Department as a real service provider
- broad geographic coverage
- finite response capacity
- building-fire events
- response travel / timing if feasible
- fire recovery / rebuilding
- readable inspection and placement feedback
- gentle tuning suitable for a cozy management game

Fire should create planning pressure without making random disasters routinely erase long-term progress.

---

# Healthcare, sickness and medical research

Long-term relationship:

Hospital
→ Healthcare Coverage
→ Treatment
→ Healthier Households
→ Neighborhood Stability
→ Medical Research
→ New Medicine
→ Disease Control
→ Possible Virus Mutation
→ New Research Requirement

Potential stages:

1. Healthcare service and capacity
2. household health state
3. sickness events
4. treatment capacity
5. medicine / research
6. evolving diseases or viruses

Do not jump directly to complex virus evolution before basic healthcare is proven and readable.

---

# Employment and deeper economy

Planned:

- job capacity
- employment demand
- Education affecting qualification
- household prosperity
- commercial/industrial relationships if appropriate to Meadowline's tone
- stronger tax relationships
- service operating costs later if they add interesting decisions

The economy should become interconnected without turning the game into an opaque spreadsheet.

---

# Recreation and parks

Parks currently contribute directly to mood.

Possible future formal relationship:

Parks
→ Recreation Access
→ Less Boredom
→ Better Mood
→ Lower Social Pressure
→ Higher Desirability

If recreation becomes a real service, it should use the civic-service framework where that produces actual value rather than refactoring for purity alone.

---

# Road-over-rail crossings

Owner-requested future behavior:

- drawing a road across rail should automatically create an appropriate crossing/bridge treatment
- interaction should feel as natural as current road/rail water spans
- infrastructure placement should not require deleting/rebuilding large sections of track
- registry/placement architecture must remain compatible with this

This remains roadmap-only.

---

# Large-world architecture

Do not enlarge the world substantially until deeper simulation is stable.

Future technical requirements are expected to include:

- chunked world organization
- spatial indexes
- visible-region rendering
- service-provider spatial lookup
- route caching
- scalable route solving / A* or equivalent
- virtual off-screen population
- dramatically larger maps
- more visible NPCs without saving every pedestrian as a unique persistent entity

---

# Neighborhood identities

Long-term neighborhoods should begin to feel distinct based on actual simulation state.

Possible influences:

- housing tiers
- age of development
- mood
- Education
- greenery
- transit access
- prosperity
- later safety and healthcare

Neighborhood identity should emerge from systems rather than from arbitrary district labels alone.

---

# Major-building mini-ecosystem standard

Every future major civic/economic building should answer:

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

## School reference implementation

- Provides: Education
- Used by: households / student demand
- Consumes: finite capacity
- Produces: gradual Education progress
- Limited by: 7-tile service radius and 28 capacity
- Legacy local bonus radius: 5 tiles
- Upgrade hook: level/configuration exists; player upgrades not implemented
- Influenced by: household population
- Future influences: employment, prosperity, crime pressure, housing evolution
- Visible behavior: attendance, placement preview, inspections
- Pressure state: At capacity / waiting for school space

---

# Product principles

Meadowline should remain:

- peaceful
- understandable
- visually charming
- low stress
- mobile friendly
- rewarding to observe
- progressively deeper
- never unnecessarily punishing

The player should be able to ask "why is this happening?" and get a useful answer from the game.

The purpose of each architectural milestone is not the number of features added. It is the number of future features that become easier to add cleanly.