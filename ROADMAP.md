# Meadowline Roadmap

Meadowline is evolving from a calm small city builder into a deeper **living-city simulation** while preserving its lightweight static-browser architecture, isometric presentation and mobile-first controls.

## Project status snapshot

Current development branch: `feature/housing-2`

Validated parent branch: `feature/living-city-foundation`

Architectural foundation: `agent/architecture-refactor`

PR #1: Living City Foundation / School 2.0 — **draft, unmerged**

Current milestone: **Housing 2.0 / Neighborhood Desirability / Residential Evolution / Civic Coverage Visualization**

Status: **implemented on its own branch and awaiting branch validation plus physical-iPhone acceptance; nothing merged into `main`**

---

# Milestone 1 — Living City Foundation / School 2.0

Implemented on `feature/living-city-foundation`:

- centralized authoritative building registry
- reusable civic-service architecture
- Education as the first real civic service
- persistent household Education
- deterministic provider assignment
- finite School capacity and overload
- 7-tile School Education-service radius
- 28-student capacity
- School and household inspection
- citywide Education metrics
- Save Schema V3 with v1/v2 migration
- mobile pinch/build arbitration repair
- representative School attendance
- per-household visible-pedestrian cap
- developer diagnostics
- regression and module-hygiene coverage

Physically demonstrated on iPhone:

- School demand changes with population
- 28 / 28 capacity remains bounded
- demand can exceed capacity
- `At capacity` and `Waiting for school space` are understandable
- household Education increases while served
- 7-tile School reach is live
- two-finger pinch with School selected does not accidentally place a School
- the observed household pedestrian over-count was repaired

This remains the architectural base for all future civic providers.

---

# Milestone 2 — Housing 2.0

Current branch: `feature/housing-2`

Primary loop:

Good Neighborhood
→ Better Housing
→ More Residents
→ More Residential Tax Value
→ Greater Civic Demand
→ More Civic Investment
→ Better Neighborhood
→ Further Growth

## Residential tiers

Current first-pass tiers:

### Tier 1 — Cottage

- base capacity: 4
- residential tax multiplier: 1.00×
- no upgrade requirements because this is the starting tier

### Tier 2 — Town Home

- base capacity: 6
- residential tax multiplier: 1.25×
- road access
- Mood 65+
- Education 15+
- Desirability 45+
- approximately 50 seconds of qualifying simulation time with a small deterministic per-house timing offset

### Tier 3 — Established Home

- base capacity: 8
- residential tax multiplier: 1.55×
- road access
- Mood 78+
- Education 35+
- Desirability 62+
- approximately 85 seconds of qualifying simulation time with a small deterministic per-house timing offset

Upgrade progress pauses when a requirement is lost; it does not reset or aggressively decay. Homes do not downgrade in this milestone.

## Legacy School housing-capacity decision

The former School proximity rule added +2 resident capacity to homes within the old 5-tile School influence.

Housing 2.0 retires that rule for **future resident growth** because residential tier now owns residential density and Education is the School's real civic outcome.

Migration rule:

- existing residents are grandfathered
- nobody is evicted because a save is loaded under Housing 2.0
- a Tier 1 home that already contains 6 residents may keep all 6
- it simply cannot grow further until residential tier capacity catches up

The older 5-tile School mood influence remains.

## Neighborhood Desirability

Desirability is a real 0–100 derived residential-development value distinct from Mood.

Current inputs use only working Meadowline systems:

- road access
- current Mood
- Education-service status
- household Education
- parks
- cafés
- station proximity
- lamps
- trees and water
- local crowding

Current labels:

- Quiet Start
- Developing
- Pleasant
- Desirable
- Highly Desirable

Future systems may add Safety, Healthcare, Employment, Prosperity and other real service outcomes after those systems actually exist.

## Residential visual evolution

Housing tiers change silhouette within the existing one-tile footprint.

- Cottage: smallest form
- Town Home: larger/taller form, additional upper window and dormer
- Established Home: largest form, extra windows plus small visible garden/fence detail

Seeded wall/roof variation remains independent from tier.

A restrained growth chevron appears while upgrade progress is active so evolving homes can be spotted without filling the map with permanent icons.

## Housing inspection 3.0

House Look now explains:

- residents / current capacity
- Mood and Mood reasons
- Education and serving School
- School capacity state
- Neighborhood Desirability
- current housing tier
- next tier
- upgrade progress
- each active requirement
- whether growth is active or waiting

Only real systems are shown. Crime, Fire, Healthcare and Employment requirements remain absent.

## Residential economy

Tier 1 preserves the old tax curve.

Higher tiers scale the residential portion of daily tax without altering café, bakery, market, windmill or festival logic.

This means upgraded neighborhoods provide more revenue while simultaneously creating more School demand as their population fills the new capacity.

## Cross-system proof

Housing 2.0 must prove this relationship without special-case School code:

Residential tier increases capacity
→ household population increases
→ existing Education demand formula sees more residents
→ School utilization rises
→ capacity pressure appears naturally

Housing invalidates the generic civic-service cache when relevant state changes rather than directly editing School statistics.

## Civic-service placement boundary

Housing 2.0 also establishes a reusable civic-placement language.

When a School is positioned:

- a green perimeter marks the actual Education-service area
- a light green interior tint shows the reachable field
- green household markers show strong useful service
- amber/yellow household markers indicate potential capacity pressure
- the building placement ghost remains visually dominant
- invalid placement still uses the existing red treatment

The overlay reads service metadata from the building registry and is intended for later Police, Fire and Healthcare providers.

Important geometry rule:

The School's `radius: 7` uses the current Chebyshev service calculation. That means every tile center within 7 grid steps in either axis is reachable. The rendered boundary follows that exact simulation region; it is not a decorative circle and does not falsely highlight homes outside service reach.

## Save V3

No Save V4 is introduced.

Housing adds optional V3 house state:

- `housingTier`
- `upgradeProgress`
- `desirability`
- existing `education`

V1, V2 and earlier V3 saves default safely to Tier 1. Invalid state is clamped defensively.

## Performance model

Housing and desirability run on the low-frequency Living City simulation tick rather than render frequency.

Diagnostics now track:

- housing evaluations
- housing upgrades
- desirability recomputes
- existing civic-service recomputes

The current 44×44 world remains the stable simulation test bed.

---

# Housing 2.0 physical-iPhone gate

Housing 2.0 should not be called fully validated until the owner physically confirms:

- existing city/save loads
- Cottage / Town Home / Established Home silhouettes are distinguishable on iPhone
- Look panel remains readable and scrollable
- a qualifying home visibly accumulates growth progress
- a home eventually evolves automatically
- household identity/Education are preserved
- increased capacity fills with additional population
- School demand increases as the upgraded home fills
- the green School service field matches real 7-tile reach
- green and amber household markers remain distinguishable
- pinch with School selected still cancels pending placement
- evolved neighborhoods remain smooth
- housing state survives page close/reload

See `docs/IPHONE_ACCEPTANCE.md`.

---

# Decision point after Housing 2.0

Do **not** automatically begin the next milestone after Housing 2.0. Choose deliberately based on device testing and what feels most valuable.

## Option A — Progressive Land & City Growth

Target relationship:

Start with a smaller usable city
→ reach population / housing / service milestones
→ unlock new land
→ unlock additional buildings
→ expand into a larger city

Why it may be next:

- gives Housing 2.0 a progression purpose
- makes early-game pacing clearer
- supports the owner's desire for a city that starts small and progressively expands

Risks:

- should not enlarge simulation workload substantially until large-world architecture is planned
- land gating needs a migration strategy for existing worlds

## Option B — Police / Crime / Jail

Target relationship:

Education + Density + future Employment/Prosperity
→ Crime Pressure
→ incidents
→ Police safety service
→ response / arrests
→ Jail capacity
→ safer neighborhoods
→ Desirability

Why it may be next:

- directly proves the service framework can support a second truly different civic system
- creates a major new input into Desirability

Risks:

- crime should remain readable and low-stress
- employment/prosperity do not yet exist, so first crime pressure would need intentionally limited inputs

## Option C — Recreation 2.0

Target relationship:

Parks
→ Recreation Service
→ boredom relief / better Mood
→ Desirability
→ Housing growth

Why it may be next:

- relatively low risk
- reuses existing Park assets and Living City service architecture
- deepens current neighborhoods without introducing emergencies

## Option D — Civic Service Upgrades

Start with School Level 2:

School Level 1
→ capacity pressure
→ upgrade investment
→ more student capacity
→ possibly modest service/reach improvement

Why it may be next:

- Housing 2.0 will create more School pressure
- gives players an alternative to placing duplicate Schools
- establishes the reusable civic-building upgrade pattern before Police/Fire/Hospital arrive

Current planning recommendation after successful Housing 2.0 testing: compare **Progressive Land Growth** against **Civic Service Upgrades** first, then decide whether the city needs progression space or deeper service management more urgently.

---

# Later roadmap systems

## Progressive land and city growth

Planned:

- smaller starting buildable area for future new games
- land expansion earned through city-development milestones
- progressive building unlocks
- existing neighborhoods remain valuable instead of being discarded
- avoid requiring the player to fill every tile before expanding

## Police, Crime and Jail

Planned:

- `safety` civic service
- larger practical geographic reach than School where appropriate
- finite response/capacity
- household/neighborhood crime pressure
- visible but restrained incidents
- arrests
- Jail capacity
- Safety feeding Neighborhood Desirability

No fake Crime/Safety value should appear before this exists.

## Fire and emergency response

Planned:

- Fire Department service
- broad coverage
- finite response capacity
- building fires and recovery
- readable response state
- low-stress tuning

## Healthcare, sickness and medical research

Long-term chain:

Hospital
→ Healthcare Coverage
→ Treatment
→ Healthier Households
→ Neighborhood Stability
→ Medical Research
→ Medicine
→ Disease Control
→ possible virus evolution
→ new research requirements

Implement in stages; do not jump directly to complex disease mutation.

## Employment and Prosperity

Planned:

- job demand/capacity
- Education affecting qualification
- household prosperity
- stronger residential/economic links
- Employment/Prosperity feeding Desirability and future crime pressure

## Road-over-rail crossings

Owner-requested future behavior:

- roads automatically create an appropriate crossing over rail
- interaction should feel as natural as current water spans
- placement architecture must remain compatible with this

## Large-world architecture

Do not dramatically enlarge the world until deeper simulation is stable.

Expected future technical work:

- chunks/spatial organization
- service-provider spatial indexes
- visible-region rendering
- scalable route solving / A* or equivalent
- route caching
- virtual off-screen population
- many more visible representative NPCs without permanently saving every pedestrian

## Neighborhood identities

Future district character should emerge from actual state such as:

- housing tiers
- age of development
- Education
- Mood
- Desirability
- greenery
- transit
- later Prosperity, Safety and Healthcare

---

# Civic-service coverage philosophy

Current planning guide:

- small/local amenity: roughly 2–4 tiles
- neighborhood amenity: roughly 4–6 tiles
- School: 7-tile service radius
- future Police / Fire / Healthcare: likely 8–12+ depending on capacity and response design

Coverage determines who **can** be served. Capacity determines how much demand **is** served.

This keeps large civic buildings from being crammed onto every few blocks.

---

# Major-building mini-ecosystem standard

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

School 2.0 remains the reference civic-service implementation. Housing 2.0 becomes the reference **consumer** of service outcomes.

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

The player should be able to ask **why is this happening?** and get a useful answer.

The purpose of each milestone is not the raw number of features added. It is the number of future systems that become easier to add cleanly.