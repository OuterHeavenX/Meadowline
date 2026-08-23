# Meadowline Roadmap

Meadowline is evolving from a calm small city builder into a deeper **living-city simulation** while preserving its lightweight static-browser architecture, native ES modules, isometric canvas presentation, mobile-first controls, and low-stress character.

This roadmap distinguishes production status, historical branches, automated proof, physical-device proof, and roadmap-only systems.

---

## Status snapshot

### Implemented on `main`

Production release at the start of City Growth planning:

`5d4054f764d603b23ddf1a74ab63824de67ea778`

Merged through PR #3:

- architectural modularization
- Living City Foundation
- School 2.0 / Education service
- Save Schema V3
- mobile gesture stabilization
- Housing 2.0
- Neighborhood Desirability
- residential evolution
- civic-service placement visualization

PR #1 and PR #2 are historical development PRs. Both were superseded and closed without separate merge.

### Current development branch

`feature/city-growth-progression`

Current milestone:

**City Growth 1.0 — Progressive Land / Development Milestones / Building Unlocks / Civic Upgrade Foundation**

This work is not production until its branch validation is green and the owner completes physical iPhone/iPad acceptance. Nothing should merge automatically.

---

# Milestone 1 — Living City Foundation / School 2.0

**Production status:** merged into `main` through PR #3.

**Historical development branch:** `feature/living-city-foundation`.

Established architecture:

- centralized authoritative building registry
- reusable civic-service provider model
- Education as the first real civic service
- persistent household Education
- deterministic School assignment
- finite service capacity and overload
- 7-tile School service radius
- 28-student Level 1 capacity
- household/School Look inspection
- citywide Education metrics
- Save V3 with V1/V2 migration
- mobile pinch/build arbitration protection
- representative citizen count protection
- developer diagnostics
- browser regression and module-hygiene coverage

**Physical proof recorded:** School overload/capacity behavior, waiting-for-space language, Education gain, 7-tile reach, and the pinch-with-School-selected regression were observed on an owner device before the production merge.

This remains the provider architecture for future Police, Fire, Healthcare, Recreation, Employment, Sanitation, and other civic services.

---

# Milestone 2 — Housing 2.0 / Neighborhood Desirability

**Production status:** merged into `main` through PR #3.

**Historical development branch:** `feature/housing-2`.

Primary loop:

Road + Mood + Education + Desirability
→ residential upgrade readiness
→ Cottage / Town Home / Established Home evolution
→ greater household capacity
→ higher residential tax value
→ more residents
→ more School demand
→ greater civic pressure.

Production residential tiers:

- Cottage — capacity 4, 1.0× residential tax
- Town Home — capacity 6, 1.25× residential tax
- Established Home — capacity 8, 1.55× residential tax

Neighborhood Desirability is intentionally separate from short-term Mood. It uses real existing factors including roads, Mood, Education, parks, cafés, stations, lamps, trees/water, and local crowding.

The House Look card explains current tier, next tier, Desirability, Education, upgrade progress, and individual requirements. Tier evolution is gradual, non-destructive, and does not evict grandfathered residents.

---

# Milestone 3 — City Growth 1.0

**Status:** current feature-branch development.

Primary loop:

Small Settlement
→ healthy neighborhood
→ population growth
→ Education / housing development
→ city-development milestone
→ new land
→ new building capabilities
→ greater civic demand
→ civic upgrade choice
→ larger town.

## Stage system

Four stages only for this pass:

1. Settlement
2. Village
3. Township
4. Growing Town

Stages use real city health rather than a giant XP ladder. The milestone evaluator supports hard requirements plus `any X of Y` groups to permit different successful city styles.

## Progressive land

The existing 44×44 world stays intact. New progression cities begin with Meadowline Center (20×20) and expand into deterministic North, East, South, West, and four outer-corner parcels.

Locked terrain still exists, renders normally beneath a restrained tint, receives weather/seasons, keeps ponds and natural trees, and remains camera-accessible.

Expansion requires:

city progress + neighboring prerequisite where relevant + coins + explicit player confirmation.

Legacy saves use full access and are never retroactively locked.

## Building unlock foundation

Registry-driven first pass:

**Settlement:** Road, House, Café, Park, Trees, Lamp

**Village:** School, Market, Bakery

**Township:** Rail, Station, Windmill

**Growing Town:** Dock

This sequence is balancing data, not hard-coded UI logic. Legacy cities retain every currently existing tool.

## School Level 2

The first reusable civic upgrade:

- Township required
- 650 coins
- Level 1: 28 capacity / radius 7
- Level 2: 44 capacity / radius 7
- visible one-tile visual improvement
- persistent `state.level`

Design choice:

**build another School** versus **upgrade the existing School**.

The milestone proves generic registry-driven civic upgrades without implementing Police, Fire, or Hospital yet.

See `docs/CITY_GROWTH_1.md` for exact parcel geometry, requirements, migration, tests, and acceptance criteria.

---

# Future system graph

The long-term living-city model remains systemic rather than a disconnected building catalog.

## Safety / Police / Crime / Jail — roadmap only

Education + density + future Prosperity
→ crime pressure
→ Police safety coverage
→ incidents / arrests
→ Jail
→ neighborhood Safety
→ Desirability.

Do not implement until City Growth is physically proven.

## Recreation 2.0 — roadmap only

Parks / recreation providers
→ recreation access
→ less boredom
→ better Mood
→ better Desirability
→ stronger housing development.

This can turn the existing Park from a simple Mood bonus into a true service provider.

## Fire / Emergency Foundation — roadmap only

Development density
→ fire risk
→ Fire Department coverage
→ response
→ recovery
→ neighborhood stability / Safety.

Keep fire events understandable and non-punishing rather than destructive chaos.

## Employment / Prosperity — roadmap only

Education
→ job qualification
→ employment
→ household Prosperity
→ Desirability
→ housing development / tax base.

This is a strong future bridge from Education into an economic household simulation.

## Healthcare — roadmap only

Population + age/density/future illness pressure
→ Hospital/clinic service
→ healthcare access
→ recovery/wellbeing
→ household stability / Desirability.

No disease/medicine/research system exists yet.

## Neighborhood identity — roadmap only

Future neighborhoods may eventually gain names, identity, service profiles, prosperity, safety, recreation, and visual evolution. City Growth parcels are development regions, not yet neighborhood identities.

## Larger world / chunks — roadmap only

Do not enlarge Meadowline until progression, service pressure, touch interaction, and performance are proven on the 44×44 world.

The parcel API uses IDs/regions so a future larger map can reuse the concept without assuming today's fixed geometry.

## Transport evolution — roadmap only

Potential future work includes:

- road-over-rail automatic crossings
- traffic/usage modeling
- stronger station/transit service
- district-to-district mobility

Do not rewrite A* or the renderer as part of City Growth.

---

# Design principles that remain permanent

Meadowline should be:

- peaceful
- understandable
- visually charming
- low stress
- mobile friendly
- rewarding to observe
- progressively deeper
- forgiving rather than punishing

Progression must not become:

- premium-currency gating
- energy systems
- arbitrary waiting
- hour-long construction timers
- monetization-style queues
- repetitive busywork

A normal play session should create visible progress through city planning and healthy neighborhoods.

---

# Validation policy

## Automatically validated

Only call a branch automatically validated when its current head has actually passed:

- JavaScript syntax
- module hygiene / import-cycle checks
- browser regression
- milestone-specific regression tests

## Physically validated

Only call something physically validated after the owner tests the relevant build on an actual iPhone/iPad and reports the behavior.

CI is never physical proof.

## Current gate

City Growth 1.0 must pass its automated suite and then physical iPhone/iPad acceptance before any merge decision.

After City Growth physical testing, stop and recommend the next milestone among:

- Police / Crime / Jail
- Recreation 2.0
- Fire / Emergency Foundation
- Employment / Prosperity

Base that recommendation on what real play reveals rather than automatically starting another branch.
