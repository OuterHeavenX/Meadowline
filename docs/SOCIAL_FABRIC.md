# Meadowline Social Fabric 1.0

Emergent citizen culture, district identity, careers, social classes, factions,
organized crime, fame and family legacies.

## Status

**Slice 1 in development.** Branch: `claude/game-upgrade-3o2630`, based on
production `main` at `f0cf125abe009576e9954eedb6d3952108221765`.

This document is canonical for Social Fabric and is maintained as the milestone
lands. It records what is built, what is deliberately deferred and what must
never be built. Where an older document disagrees with production code, the code
wins and the disagreement is noted here.

### Corrections to stale documentation

Read before trusting the older records:

- `ROADMAP.md` and `docs/LIVING_CITY_FOUNDATION.md` state the world is 44×44.
  It is **128×128** (`src/core/constants.js`). The valley was enlarged after
  those documents were written, which also multiplies every "full-map scan"
  figure in `docs/IMPROVEMENT_REVIEW.md` §3 by eight.
- `README.md` and `ROADMAP.md` list UI / HUD 2.0 as *current development*. It is
  production and has been for some time.
- `docs/IMPROVEMENT_REVIEW.md` §3 attributes the housing pass cost to the
  crowding scan. Measured, crowding was 0.43 ms of a 15.18 ms pass; the cost was
  a recreation cache check that ran once per home. Fixed at `f0cf125`.
- `docs/IMPROVEMENT_REVIEW.md` finding B11 is fixed: `linked` is now set in the
  same pass that builds the context lists, ahead of recreation.
- The CI workflow's `push` triggers name nine historical `feature/*` branches
  and not `main`, so pushes to main run no automation at all. Social Fabric does
  not fix this, but no one should read a green history as coverage.

## The permanent rule

**The player builds the city. The citizens decide what the city becomes.**

The player controls roads, buildings, parks, farms, public services, transport,
land, civic facilities, economic infrastructure, landscaping and layout.

The player controls none of the following, and no UI may ever offer them:

personalities · careers · social class · district identity · district
boundaries · gangs · crime families · fame · celebrity · political influence ·
cultural identity · neighbourhood reputation · faction membership · bosses ·
criminal fronts · any social outcome.

There is no "Create Mafia District", no "Make this citizen Mob Boss", no "Set
Social Class". If such a control exists, the feature has failed. This is
asserted by regression, not by convention: see *Testing*.

The player influences society only by changing the physical and civic condition
of the city. Everything social is downstream of that.

## The naming contradiction, and how it is resolved

The milestone brief carries a conflict that has to be settled before any code is
written, because implementing it literally would violate its own rules.

PART 7 and PART 8 give worked examples — the "Bellucci Family", "Anthony
Bellucci" as mob boss. PART 27 then forbids exactly that pattern: *"Do not
encode … certain ethnic name = mafia"*, *"Do not tie criminality to race,
ethnicity, religion, nationality or protected traits."* A recognisably Italian
surname attached to a crime family is the mafia-fiction trope PART 27 exists to
prevent. The examples cannot be implemented as written.

PART 27 is mandatory and wins. The resolution is structural rather than a
warning comment:

1. **One shared surname pool.** Every family in Meadowline draws from the same
   pool. There is no criminal pool, no farming pool, no wealthy pool.
2. **The name is drawn before the outcome exists.** A family is named when it is
   founded, which is long before it has a career, a class or any criminal
   involvement. A surname therefore cannot carry information about what the
   family later becomes, because the draw precedes the outcome and never
   consults it.
3. **Organisation names come from place, not from people's origins.** An
   organisation is named for the district or street it formed around — "South
   Wharf Crew", "Lantern Row Outfit", "North Market Crew" — or for its founding
   family's surname drawn from the shared pool. Place-based names are grounded
   in the city the player built, which is also what makes them feel local.
4. **The pool is culturally mixed and carries no gameplay meaning.** Names are
   drawn uniformly. No name is weighted toward or away from any outcome.

This is testable and is tested: across many seeded cities, the distribution of
surnames among criminal organisations must be statistically indistinguishable
from the pool itself. A future change that quietly correlates the two fails.

## What Social Fabric builds on

Social Fabric invents no new truth. Every input below already exists in
production and is authoritative today.

| Input | Source |
| --- | --- |
| Households: population, mood, road access | `S.ctx.houses`, `simulation/mood.js` |
| Household education, housing tier, desirability | `state.education/housingTier/desirability`, `simulation/housing.js` |
| Workforce, jobs, employment, prosperity | `simulation/employment.js` |
| Crime / fire / healthcare pressure, capacity | `simulation/municipal.js` |
| Incidents and their dispatch lifecycle | `S.incidents`, `simulation/municipal.js` |
| Recreation demand, capacity, access | `simulation/recreation.js` |
| Road network and connectivity | `transport/roads.js`, `connectedRoadComponents()` |
| Jobs per building type | `buildings/registry.js` — `jobs` |
| City stage and opened land | `progression/city-growth.js` |
| Day-by-day history and the log | `simulation/chronicle.js` |
| Representative pedestrians | `simulation/citizens.js` |

The representative-citizen rule is preserved exactly. `S.citizens` remain
bounded, transient, visual agents. Social Fabric does **not** promote them into
per-resident AI. Notable citizens are a separate, small, bounded set that exists
in simulation and may or may not have a pedestrian on screen.

## Districts

### Derivation — never player-drawn

Districts are derived, cached and invalidated. The player cannot draw, name,
merge, split or classify one.

Derivation is a coarse-cell agglomeration over developed land:

1. The map is divided into fixed coarse cells (8×8 tiles → 16×16 = 256 cells on
   the 128×128 valley).
2. A cell is *developed* when it contains at least one non-road, non-rail
   building root.
3. Adjacent developed cells join, four-way, unless a barrier separates them.
   Barriers are water and rail — the things that actually divide a real
   neighbourhood — and unopened land.
4. Each connected group is one district. Groups below a minimum building count
   are not yet a district; they are simply outskirts.

This is O(cells), not O(tiles) and not O(buildings²): 256 cells is trivial, and
it recomputes on invalidation rather than per frame.

### Identity is preserved, boundaries move

A district keeps its identity across recomputes by matching its centroid to the
nearest previous district within a tolerance. A district that grows, or absorbs
a neighbour, keeps the older name — the way a real neighbourhood does. A merge
is a historical event and reaches the Chronicle.

Names are drawn from a curated pool grounded in Meadowline's register — Willow
Grove, Old Wharf, Mill Quarter, Lantern Row, Station Ward, North Fields, Market
Hill, Southbank — seeded from the world seed and the district's anchor, so the
same city always names the same place the same way.

### Identity is descriptive, and never comes from one trigger

A district may hold up to two identities. Every identity requires **at least two
independent conditions** to be met. This is the mechanism, not a guideline: a
single-condition identity is unreachable by construction.

The rules that matter most are the negative ones, and they are enforced:

- Low desirability alone can never produce a criminal identity. There is no path
  from *poor* to *criminal* in the identity table at all.
- A dock is not a smuggling route. Waterfront plus organised crime presence is.
- Density alone produces nothing. Density plus low opportunity plus weak service
  access produces *Struggling*, and *Struggling* is not a crime identity.
- An affluent district does not manufacture celebrities.
- **Criminal Influence** and **Organized Crime Stronghold** require an actual
  organisation with real presence in that district. They are reports of
  something that exists, not inferences from poverty.

A struggling district is far more likely to develop community identity — strong
local bonds, working-class identity, neighbourhood organisation — than anything
criminal, and the identity table is weighted to say so.

### Districts evolve

Identity is re-evaluated on a slow cadence and can be lost as easily as gained.
Waterfront → smuggling → stronghold → crackdown → redeveloping → harbour is a
path the simulation can walk in either direction. History is kept; the current
state is not permanent.

## Citizens, careers, class and families

Deferred to later slices, designed here so slice 1 does not foreclose them.

**Notable citizens** are a bounded set (target: tens, not thousands) promoted
from real households. Traits — ambition, charisma, discipline, risk tolerance,
sociability, entrepreneurship, leadership and so on — shift probabilities and
never determine outcomes. High criminal inclination with good local opportunity
overwhelmingly produces a legitimate career.

**Careers** emerge from nearby workplaces, education, district identity,
household prosperity, available jobs from the registry's `jobs` metadata, and
transport access. They change over a life rather than being assigned once.

**Class** is descriptive and derived from household income, housing tier,
education, employment, district desirability and accumulated wealth. Labels
carry no moral weight, and mobility runs both ways.

**Families** are a bounded set with accumulated history: when they arrived,
where they first lived, what they became, who their notable members are. A
family may rise, fall, relocate, change trade, go legitimate or decline. Crime
families and farming families use the identical structure — there is no separate
criminal family type.

## Organisations and organised crime

Crime is one possible social outcome among many, never a guaranteed one and
never a player action.

Formation requires a **combination** drawn from unemployment, weak enforcement
coverage, poor service access, profitable trade adjacency, nightlife, low
legitimate opportunity, an influential citizen, repeated unresolved incidents
and existing criminal social connections. No single factor suffices, and the
weights are historical: momentum matters, so a place that has never had an
organisation is markedly less likely to grow one than one that recently did.

Growth is staged and not guaranteed at any step: individual → small group →
local crew → organised crew → faction → major organisation. Organisations
stall, shrink, split, merge and collapse. Rising legitimate prosperity is a
first-class cause of decline.

A **boss** is always promoted from an existing simulated citizen. No abstract
boss entity is ever spawned when a suitable citizen exists.

**Fronts** are ordinary legitimate businesses that keep functioning as
businesses. There is no player-buildable criminal building category, and a front
never stops paying its normal trade income or filling its normal jobs.

**Enforcement is autonomous.** The player builds stations and improves the city;
the Police simulation decides what it notices, what it investigates and when it
acts. The player never commands a unit at a target.

Violence stays abstract and reuses the existing Police, Fire, Healthcare
dispatch, Chronicle and feedback systems. No tactical layer, no combat, no war
map, no territory conquest.

## Performance rules

Binding, and derived from what this codebase has already learned the hard way:

- No per-frame full-map social scan. Ever.
- District derivation is invalidation-driven and O(coarse cells).
- Notable citizens, families and organisations are all bounded by explicit caps.
- No quadratic relationship graph. Social connection is bounded per citizen.
- No all-citizen pathfinding. Social Fabric adds no pathfinder.
- Cadence: district identity on a slow tick or on invalidation; social updates
  on a slower one; organisation evolution slower still; Chronicle events sparse.
- **Cache checks must be cheaper than the work they guard.** At `f0cf125` a
  recreation cache check cost nineteen times the rebuild it protected, because
  it was O(homes) and ran once per home. Any Social Fabric cache is checked in
  O(1) or it is not a cache.

## Save strategy

**Save V3 is preserved.** No V4 for Social Fabric.

Only durable social truth is stored, under one additional optional top-level
`social` field in the existing payload: district identities and their names and
history, notable citizen and family records, organisation records, membership,
leadership and front state. Everything derivable is derived.

Old saves load unchanged and gain Social Fabric gradually afterwards. A loaded
city does not retroactively invent decades of factions on the first tick; it
starts from its present physical state and develops from there. Migration is
deterministic: the same save plus the same seed produces the same society.

## Diagnostics

Added under the existing `?debug=1` system, truthfully: district count, identity
recomputes, identity changes, notable citizens, families, social evaluations,
organisations, births, collapses, leadership changes, fronts, social events
generated, cache hits and misses, and the longest social update observed.

No diagnostic reports a value the simulation does not hold.

## Testing

Every rule above that can be tested deterministically is. Seeded randomness
only; no assertion depends on an unseeded roll.

Coverage required by this milestone:

- no player-facing API can set district identity, class, career, membership or
  leadership — asserted against the exported surface, so a future convenience
  setter fails the suite;
- districts form from development and not from player input;
- district identity requires two or more independent conditions;
- low desirability alone never yields a criminal identity;
- identity is reversible;
- district names and identities persist across recompute and across save/load;
- bounded district, citizen, family and organisation counts;
- surname distribution among criminal organisations matches the shared pool;
- social recomputation is invalidation-driven, asserted by counting work rather
  than timing it, so the assertion reads the same on any machine;
- old saves load and develop gradually.

Every new assertion is confirmed to fail against the unfixed code before it is
trusted.

## Slice order

1. **Districts** — derivation, stable naming, identity, evolution, Look/City
   Hall/Chronicle surfacing, diagnostics, tests. *(in development)*
2. Notable citizens and traits; families and legacy.
3. Careers and class.
4. Organisation formation, staged growth, decline.
5. Bosses, fronts, autonomous enforcement.
6. Fame and entertainment culture, initially lightweight.

Political influence remains future work and is out of scope.

## Success condition

A player builds Meadowline normally for a long session, then looks around and
finds one neighbourhood became a farming community, another a quiet suburb,
another an entertainment centre; a family grew wealthy; a citizen became known;
a struggling district recovered; a crew formed without being asked; a café
quietly became a front; the police started investigating on their own; the
organisation later weakened — and the Chronicle remembered all of it.

The target reaction is: **"I didn't tell them to do that."**
