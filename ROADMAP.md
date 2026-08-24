# Meadowline Roadmap

Meadowline is evolving from a calm small city builder into a deeper living-city simulation while preserving its static browser architecture, native ES modules, isometric Canvas 2D presentation, mobile-first interaction, and low-stress character.

Status labels are deliberate: **production**, **historical implementation**, **automatically validated**, **physically validated**, **current development**, and **roadmap only** are not interchangeable.

## Production baseline

Verified `main` at the start of City Hall 1.0:

`1d9e7e9c110fad465b332ef85503d102ed5af6e0`

City Growth PR #4 was explicitly owner-approved and merged. Historical development failures and unchecked physical acceptance items remain preserved in `docs/CITY_GROWTH_1.md` and `docs/IPHONE_ACCEPTANCE.md`; a merge does not retroactively prove an unchecked device behavior.

Historical implementation branches remain preserved:

- `agent/architecture-refactor`
- `feature/living-city-foundation`
- `feature/housing-2`
- `feature/city-growth-progression`

## Milestone 1 — Living City Foundation / School 2.0

**Production.**

Authoritative building registry, reusable civic-provider architecture, persistent household Education, deterministic capacity-bounded School assignment, Save V3 migration, Look explanations, diagnostics and mobile pinch/build safety.

## Milestone 2 — Housing 2.0 / Neighborhood Desirability

**Production.**

Road + Mood + Education + Desirability
→ residential readiness
→ Cottage / Town Home / Established Home
→ higher capacity and tax value
→ greater population
→ greater civic demand.

## Milestone 3 — City Growth 1.0 / 1.1

**Production through merged PR #4.**

Historical implementation branch: `feature/city-growth-progression`.

City Growth established:

- Settlement → Village → Township → Growing Town;
- Meadowline Center plus eight progressive land parcels on the existing 44×44 world;
- registry-driven stage unlocks;
- City Milestones;
- progression-aware Town Goals;
- safe touch: tap acts, immediate drag pans, pinch cancels build intent, hold+drag paints/removes;
- compact mobile command bar/build tray;
- School Level 2 at Township.

Historical physical failures included premature Boat/Train goals, unsafe drag/build behavior, mobile toolbar ambiguity, one-off placement friction and Look/build overlap. Later owner iPad evidence showed a coherent 92-citizen Growing Town and the owner explicitly approved the final PR #4 merge. Unchecked physical items remain unchecked.

## Milestone 4 — City Hall / Civic Center Foundation

**Current development.**

Branch: `feature/city-hall-civic-center`.

Core product rule:

**Local buildings explain local conditions. City Hall explains citywide conditions.**

City Hall becomes Meadowline's physical civic centerpiece and the deliberate home for whole-city information without creating another permanent HUD dashboard.

Current civic ladder:

1. Town Office — Settlement
2. Village Hall — Village
3. Town Hall — Township
4. Meadowline City Hall — Growing Town

City stage unlocks the next civic improvement. City Hall is not a hard City Growth requirement in 1.0.

The City Hall panel summarizes existing authoritative systems:

- Overview / Housing aggregate health
- Town Goals
- City Growth milestones
- land/parcels
- real finances
- current civic services, beginning with Education

It does not own those simulations and does not show fake modules for future systems.

See `docs/CITY_HALL_1.md` for the technical record.

## Milestone 5 — Recreation 2.0 / Town Life

**Next planned major simulation milestone after City Hall is physically accepted and explicitly merged.**

Core relationship:

Population + Density
→ Recreation demand
→ Parks / Recreation access
→ leisure satisfaction
→ Mood
→ Desirability
→ Housing.

City Hall should later summarize Recreation citywide while House/Park Look explains local Recreation conditions.

Likely Recreation principles:

- Park becomes a real bounded civic provider rather than only a map-wide-style mood object;
- demand/capacity must be observable and forgiving;
- effects should deepen Mood/Desirability without catastrophic failure loops;
- Town Goals should react to real Recreation demand;
- Save V3 compatibility should be preferred;
- physical iPhone/iPad acceptance remains mandatory.

Do not begin Recreation automatically as part of City Hall 1.0.

## Later systems — order intentionally not locked

The project may later explore, based on playtesting:

- Employment / Prosperity
- Safety / Police
- Fire / Emergency
- Healthcare
- Waterworks / Landscaping
- transport evolution, including a future road-over-rail crossing pass

Possible relationships:

Education → qualification → Employment / Prosperity → household stability / tax base.

Density + future prosperity/safety pressures → Police coverage → Safety → Desirability.

Density → fire risk → Fire coverage → recovery / stability.

Population / wellbeing pressure → Healthcare access → recovery / stability.

Landscaping → Pond / Creek / Canal → waterfront Desirability / Recreation → Dock opportunities.

Exact sequencing after Recreation is not promised until the real project state and physical playtests justify it.

## Explicitly deferred architecture changes

Do not enlarge the world, introduce chunk streaming, rewrite A*, replace Canvas 2D, add an ECS, or add a backend merely because future municipal systems exist.

The 44×44 map remains the production proving ground.

## Permanent design principles

Meadowline should remain:

- peaceful
- understandable
- charming
- mobile friendly
- forgiving
- progressively deeper
- map-first rather than dashboard-first

Do not introduce premium currencies, energy systems, monetization pacing, arbitrary waiting gates, or repetitive busywork.

## Current gate

City Hall 1.0 may only move toward merge after:

- final branch automation is green;
- City Hall placement/uniqueness/removal are proven;
- all four civic levels and costs are physically understandable;
- City Hall panel works comfortably on iPhone and iPad;
- Town Goals, City Growth and parcel confirmation remain coherent;
- displayed finances match real simulation values;
- Save V3/current production/legacy cities remain safe;
- no major Housing/Education/safe-touch regression appears;
- owner explicitly approves the merge.

Physical acceptance remains separate from CI.
