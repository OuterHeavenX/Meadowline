# Meadowline Roadmap

Meadowline is evolving from a calm small city builder into a deeper living-city simulation while preserving its lightweight static-browser architecture and mobile-first isometric presentation.

## Current milestone — Living City Foundation / School 2.0

Status: **in development on `feature/living-city-foundation`**

Implemented direction on this branch:

- centralized buildable registry
- reusable civic-service architecture
- real Education service
- finite School coverage and capacity
- persistent household Education
- Education placement preview
- expanded house and School inspection
- citywide Education metrics
- Save Schema V3 with v1/v2 migration
- mobile pinch/build arbitration repair
- opt-in performance diagnostics
- Housing 2.0 readiness hooks

Physical-iPhone acceptance remains required before any merge.

## Next milestone — Housing 2.0

Target relationship:

Services + Mood + Neighborhood Desirability + Household State
→ Upgrade Eligibility
→ Residential Evolution
→ Higher Capacity
→ Higher Revenue
→ Greater Service Demand

Planned themes:

- multiple residential tiers
- understandable upgrade requirements
- service-informed desirability
- visible neighborhood evolution
- higher-population homes producing greater service demand
- no fake requirements for systems that do not yet exist

## Progressive land and city growth

Planned:

- start with a smaller playable area
- unlock additional land as the city progresses
- introduce new buildings gradually
- make expansion feel earned rather than immediately overwhelming
- preserve older neighborhoods as meaningful parts of the city

Large-scale land unlocks should be coordinated with the later large-world architecture pass rather than simply multiplying the current 44×44 workload.

## Police, Crime and Jail

Planned after the service architecture and Housing 2.0 are proven.

Target relationship:

Education + Employment + Prosperity + Overcrowding + Police Coverage
→ Crime Pressure
→ Criminal Activity
→ Police Response
→ Arrests
→ Jail Capacity
→ Neighborhood Safety
→ Desirability

No crime values are exposed in the current game until this system is actually implemented.

## Fire and emergency response

Planned:

- Fire Department as a real civic-service provider
- geographic response coverage
- finite response/capacity pressure
- building fires and recovery
- readable placement preview and inspection
- low-stress tuning appropriate for Meadowline

## Healthcare, sickness and medical research

Planned long-term chain:

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

Future scope may include:

- hospitals
- sickness
- medicine
- medical research
- evolving viruses
- research progression

These systems must remain understandable and avoid punishment spirals.

## Employment and deeper economy

Planned:

- real employment demand and job capacity
- Education influencing job qualification
- household prosperity
- neighborhood economic differences
- stronger links between trade buildings and resident outcomes
- expanded city revenue and service costs

The goal is interdependence, not opaque spreadsheets.

## Recreation and parks

Current parks affect mood. A later living-city pass may evolve recreation into a formal service:

Parks
→ Recreation Access
→ Less Boredom
→ Better Mood
→ Lower Social Pressure
→ Higher Desirability

This should reuse the same service-provider conventions proven by School 2.0 where appropriate.

## Road-over-rail crossings

Owner-requested future behavior:

- drawing a road across rail should automatically create an appropriate crossing/bridge treatment
- behavior should feel as natural as current road/rail spans over ponds
- infrastructure placement architecture must avoid hard-coded assumptions that make this difficult later

This is roadmap-only in the Living City Foundation milestone.

## Large-world architecture

Do not enlarge the map until the simulation foundation is stable.

Future technical work is expected to include:

- chunked world organization
- spatial service/provider indexes
- visible-region rendering
- larger-map pathfinding strategy
- A* or an equivalent scalable route solver
- route caching
- virtual/off-screen citizen simulation
- dramatically larger maps
- many more representational NPCs without saving every pedestrian as a heavyweight entity

## Neighborhood identities

Planned long-term:

- neighborhoods that develop recognizable character
- service quality, housing, mood, prosperity and environment affecting identity
- natural differences between old town, new growth areas, commercial streets, park-heavy districts and transit corridors

## Major-building mini-ecosystem standard

Every major building should eventually answer:

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

### School reference

- Provides: Education
- Used by: households / students
- Consumes: finite capacity
- Produces: gradual Education progress
- Limited by: radius and capacity
- Upgrade hook: provider level and upgrade definitions
- Influenced by: household population; future accessibility/staffing/funding if adopted
- Influences: Education; future employment, crime pressure, prosperity and housing desirability
- Visible behavior: attendance, inspection and placement feedback
- Pressure state: over-capacity

## Product principles

Meadowline should remain:

- peaceful
- understandable
- visually charming
- low stress
- mobile friendly
- rewarding to observe
- progressively deeper
- never unnecessarily punishing

The purpose of each architectural milestone is not the number of visible features shipped. It is the number of future features that can be added cleanly without turning the simulation into special-case code.
