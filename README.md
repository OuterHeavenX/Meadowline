# Meadowline

Meadowline is a calm, mobile-first isometric city builder evolving into a deeper **living-city simulation** while remaining a lightweight static browser game.

The project runs as native ES modules on a 2D canvas. There is no React app, no server runtime, and no gameplay build step required.

## Current development state

Active milestone branch: `feature/living-city-foundation`

Validated foundation branch: `agent/architecture-refactor`

Current milestone: **Living City Foundation / School 2.0**

This branch now contains the first real civic-service system in Meadowline:

- centralized building registry
- reusable civic-service framework
- persistent household Education
- School coverage, demand, finite capacity and overload
- 7-tile Education-service radius
- 28-student School capacity
- deterministic household-to-School assignment
- gradual Education progression
- household and School inspection diagnostics
- green/yellow School placement feedback
- citywide Education metrics
- Save Schema V3 with v1/v2 migration
- mobile build/pinch arbitration repair
- developer-only diagnostics
- pedestrian household-count stabilization
- Housing 2.0 readiness hooks

The owner has physically tested the School system on iPhone and confirmed that School capacity, overload, household Education status, the 7-tile service radius, and pinch-to-zoom without accidental School placement are working on-device.

## Living City direction

Meadowline is moving away from simple `Building → bonus` relationships.

The target simulation pattern is:

Building
→ Service
→ Coverage
→ Capacity
→ Household Need
→ Behavior / Outcome
→ Neighborhood Consequence
→ City Growth

School 2.0 is the first proof of this architecture.

### School 2.0

Current Education-service defaults:

- School cost: 145 coins
- Education-service radius: 7 tiles
- Student capacity: 28
- Household demand: roughly half household population, rounded up
- Education scale: 0–100
- Progression: gradual while served
- Lost coverage does not erase Education already earned
- Overloaded Schools stop at real capacity rather than serving unlimited demand

The older School mood and +2 resident-capacity proximity perk remain local at 5 tiles for compatibility. The new 7-tile Education service is intentionally separate so civic reach can grow without making every legacy School bonus too strong.

Future civic buildings will each have independently configurable reach. Police, Fire and Healthcare are expected to use larger practical service areas than small local amenities so the map does not become crowded with duplicate civic buildings.

## Existing game systems

The current game still includes:

- 44×44 seeded isometric world
- ponds and natural trees
- roads and rails
- automatic water bridges
- homes
- cafés
- parks
- planted trees
- lamps
- windmills
- stations
- docks
- markets
- bakeries
- schools
- citizens and routing
- trains
- boats
- mood
- economy
- day/night
- seasons
- weather
- festivals
- wishes
- ledger and chronicle
- minimap
- Look inspection
- placement/removal/refunds
- local persistence
- mobile pan and pinch zoom

## Citizen representation

Visible pedestrians represent the city population without turning every resident into a heavyweight saved agent.

Citizens still route between homes, work and leisure destinations. A restrained portion of morning activity can route toward an assigned School.

A stabilization fix now ensures a household can never report more visible residents out on the streets than actually live there.

## Save system

Current key: `meadowline.v3`

Save V3 stores extensible building objects and building-specific state, including household Education and School level state.

V1 and V2 saves remain supported and migrate with safe defaults. Malformed optional state or unknown building entries are skipped defensively instead of crashing or wiping the city.

## Mobile controls

A normal building tap is committed only after a valid single-pointer tap completes. If a second finger begins a pinch gesture, pending building placement is cancelled first.

This prevents the old failure mode where selecting School and starting a two-finger zoom could accidentally place a School.

Road, Rail, Tree and Remove tools still support paint-drag behavior.

## Developer diagnostics

Use:

`?debug=1`

The developer overlay includes FPS/frame timing, simulation/render timing, grid/entity counts, service-provider/recompute information, route-search counts and save payload size.

Normal players do not see diagnostics.

## Running locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open:

`http://localhost:8000/`

Regression page:

`http://localhost:8000/tests/regression.html`

Module hygiene:

```bash
node tests/module-hygiene.mjs
```

## Next major milestone — Housing 2.0

The next planned milestone is intended to make neighborhoods visibly evolve instead of simply accumulating houses.

Core relationship:

Road Access
+ Mood
+ Education
+ Existing Household State
+ Neighborhood Desirability
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ Higher Revenue
→ Greater Service Demand

The first Housing 2.0 pass should focus only on systems Meadowline actually has today. It should not show fake Police, Fire or Healthcare requirements before those systems exist.

Likely first-phase goals:

- introduce multiple residential tiers
- preserve existing household identity and Education during upgrades
- create a reusable residential-upgrade definition structure
- calculate clear upgrade readiness from road access, mood and Education
- provide understandable Look-panel explanations
- add visible but restrained house evolution
- increase resident capacity and tax value with upgraded housing
- increase School demand naturally as neighborhoods become denser
- prevent instant chain-upgrades by using progression time/cooldowns or another gentle pacing model
- prepare Neighborhood Desirability as an extensible derived value

Housing 2.0 should become the first major consumer of the Living City service architecture.

## Later roadmap

Planned systems remain roadmap-only until implemented:

- progressive land unlocks
- neighborhood identities
- Police + Crime
- arrests and Jail
- Fire Departments and fires
- Hospitals and healthcare
- sickness and medicine
- medical research
- evolving viruses
- employment and prosperity
- deeper economy
- road-over-rail crossings
- larger-world architecture
- spatial/chunk systems
- scalable pathfinding and route caching
- much larger representational NPC populations

See `ROADMAP.md` and `docs/LIVING_CITY_FOUNDATION.md` for the detailed development path.

## Product principles

Meadowline should remain peaceful, understandable, visually charming, mobile friendly, rewarding to observe, progressively deeper and never unnecessarily punishing.

Problems should create interesting planning decisions, not punishment spirals.

The objective of each milestone is not simply to ship more visible features. It is to make the next group of systems easier to add cleanly.