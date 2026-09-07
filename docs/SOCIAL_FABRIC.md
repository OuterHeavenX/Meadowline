# Meadowline Social Fabric 1.0

Emergent citizen culture, district identity, careers, social classes, factions,
organized crime, fame and family legacies.

## Status

**All six slices are production at `1c02801`.** Every slice of the milestone's
first scope is built. Political influence and the PART 22 visual storytelling
cues (reporters near celebrity venues, tourists at landmarks) remain future
work and are out of this milestone's scope.

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

## Families and notable citizens — slice 2

`src/simulation/families.js`.

A **family** is a household the valley has come to notice. Which households and
when is decided by seeded probability weighted by the real condition of the
home — how full it is, its tier, its mood — with a floor so that a home that has
simply been there a long time can be noticed however it is doing. The roll is a
hash of game time, the house seed and the world seed, so the same city on the
same day makes the same choice. Only households on a street are considered. The
rate is deliberately slow: roughly one family a day in a two-hundred-home city,
one a fortnight in a hamlet. Bounded at 12 families of at most 5 members.

**The surname is drawn at founding from the one shared pool**, by a function
whose only inputs are the world seed, the founding order and the set of names
already in use. Nothing about the household reaches it. The regression asserts
that: the same inputs give the same name however the city is changed, every
pool name is drawn, none out of proportion, and a draw that peeks at the
household fails the suite (tried: it collapsed to eleven identical names).
Duplicate surnames are avoided by stepping to the next unused name, which is a
collision fix and not an outcome.

A family follows its house by the house's **seed**, which the Move tool keeps,
not by coordinates, which it does not. When the house is removed the family
leaves and the Chronicle says so. Every 45 days of residence brings a new
generation and one more name dealt from the same house seed.

**Members** are the residents the House card already names, given the surname;
**traits** — ambition, charisma, discipline, risk tolerance, sociability,
entrepreneurship, leadership, creativity, compassion, caution — are dealt on a
0–100 scale from the family id and the member's place in it. Both are derived,
never saved. The Look card shows two plain words per person ("steady",
"bold", "kind"), never a number: a trait is a leaning, not a verdict, and the
card keeps some mystery. Traits shift probabilities in later slices and never
determine an outcome; high risk tolerance with good local opportunity
overwhelmingly produces a legitimate career.

**Known for** is derived from the home district's leading identity and the
lead member's strongest leaning, until careers land in slice 3.

Surfacing: the House card gains a family block; City Hall lists notable
families under Neighbourhoods; the Chronicle records settling, generations and
leaving. Diagnostics: families, people, social evaluations, foundings,
departures, generations.

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

## Careers and standing — slice 3

`src/simulation/careers.js`.

A **career** is a real job at a real workplace the player built, within eleven
tiles of the family's home. There is no career the city has no building for:
nobody is a baker in a town without a bakery and nobody teaches until there is a
school. The table maps building types to trades — farm → farmer, mill → mill
worker, bakery → baker, market → market trader, café → café worker or owner,
school and Great Library → teacher, clinic and hospital → nurse or doctor,
police and fire stations, station, dock, City Hall, and the landmarks' keeper.
Seats are the registry's `jobs` per building, shared across families in one
pass, so a school never employs more teachers than it has posts.

Which job a person takes is weighed from open seats nearby, distance, one
trait's tilt (a tilt, never a requirement), and a seeded roll. **Education
gates exactly the two jobs that genuinely need it** — teacher at 35, doctor at
60 — and nothing else. A farmer can hold a doctorate; the regression places a
highly educated household beside a farm belt and asserts they farm. Owning the
café wants real entrepreneurship; otherwise it is a job like any other.

Careers persist while the workplace stands and are reconsidered rarely (2% per
social pass). When the farms are removed the farmers stop being farmers, and
take up whatever replaces them. A person with no reachable seat is *looking for
work*, which is a true reading and feeds standing. The town's first of each
trade reaches the Chronicle by name, once.

**Standing** — struggling, working class, middle class, affluent, elite, the
brief's own labels — is derived every time it is read from the household's
housing tier, education, home desirability, share of people in work and
generations of residence. It stores only the last reading, so a rise or a fall
can be noticed and recorded. **It reads conditions and never which trade**: the
regression holds a household exactly still and relabels its people farmers,
then doctors, then dock workers, and asserts the standing is identical each
time — and that taking their work away does move it, because employment is a
condition. Mobility runs both ways and the Chronicle records "rose to" and
"slipped to" alike. Sabotaged to read trade, the suite fails ("affluent /
elite / affluent"); with the education gate removed, it fails; with a setter
exported, it fails.

No career, standing or trait carries any consequence for crime. That system
(slice 4, below) reads its own conditions and none of these; the one thing it
shares with careers is whether a person has work.

Surfacing: each member on the House card shows a trade and two leanings; the
family line shows standing; "known for" becomes the family's trades once it has
any. Save V3: careers and standing ride inside the family record as plain
strings and are validated on load against the table — a trade this build has no
workplace for, a seat past the member cap, or a standing not on the list is
dropped rather than trusted. The town's firsts are saved.

## Organisations — slice 4

`src/simulation/organisations.js`. Crime is one possible social outcome among
many, never a guaranteed one and never a player action. Nothing in the Build
catalogue produces an organisation, there is no district to paint and there is
no button; the module exports no setter and the regression asserts it.

### Conditions, and the line

Formation reads eight plain facts about a district, each a consequence of what
the player built there:

| condition | what it reads |
|---|---|
| low opportunity | six or more homes, and jobs standing in the district under 60% of its workers |
| weak enforcement | no police station within 12 tiles of the district centre |
| poor access | six or more homes and no recreation reach |
| profitable edge | a dock, a market, or three or more trade buildings |
| unresolved crime | an open crime incident inside the bounds |
| influential citizen | a notable family member here with strong leadership **and** high risk tolerance |
| momentum | an organisation here now, or one that collapsed here within 60 days |
| dense | building density at or above 0.55 |

**Three of these must hold at once (`NEED=3`), then a seeded roll**, weighted by
how many more than three hold and never certain. A district with nothing but
unemployment, nothing but no police, or nothing but the poorest housing
imaginable produces nothing in 240 simulated days; the regression runs exactly
those towns. The base fixture is built to meet exactly two conditions so every
"one more" test starts below the line.

What is **not** an input: desirability, housing tier, standing, education,
surname, sector labels. The regression checks the source of `conditions()` for
those words, case-insensitively — it was case-sensitive when first written and
let `avgDesirability` through, which the sabotage check caught. "Low legitimate
opportunity" is the count of jobs the player built against the people who live
there, a fact about buildings, not about people. A dock is one condition of
several and the same one a market is.

### Staged, slow, reversible

Stages: individual → small group → local crew → organised crew → faction →
major organisation. Growth needs four conditions held and a 4% roll per pass
(one pass per three social passes, roughly three a day), so a crew takes a
season to become a faction. Decline is quicker: when the district falls below
two conditions, a police station comes within eight tiles, or jobs reach 110%
of workers, an 8% roll per pass takes a stage away — a stage every few days,
which is still slower than a police case (slice 5), so that when a station
arrives what the player sees is a case opened and made, not a crew quietly
evaporating first. At stage zero the organisation breaks up, the Chronicle says
so, and the district remembers it for 60 days as momentum. Legitimate
prosperity and enforcement are first-class causes of decline and the regression
proves both: a stage-six organisation with police and three rows of farms
placed next to it is gone in 160 days.

### Names and involvement

Organisations are named for the **place and a shape** — the Fern Hollow Network,
the Old Wharf Ring — never for a person, so a surname can never be read as a
signal. Type follows what stands there (a Ring needs a dock, a Network a market,
an Outfit trade, a Set trade and streets; a Crew needs nothing) and is a seeded
pick among the eligible.

Which notable families are drawn in is `involvementWeight(people, careers)`: a
person's risk tolerance, ambition and caution, and whether they have work. It
is a function so the regression can prove the input set — hand it a family's
people and it answers without being told their name or their class. Bold
leanings weigh more than careful; being out of work weighs more than being in
it. Across six seeded towns the involved surnames are spread across the pool
with no name appearing twice; sabotaged to recruit two surnames only, the suite
fails. At most four families per organisation, four organisations per city.

### Districts read it back

Districts count the organisations rooted in them and take the strongest stage
as strength, as plain data on `S.social.organisations` (no import cycle). Those
are the two inputs the criminal identities need, so **Criminal Influence** and
**Organized Crime Stronghold** become reachable readings only once an
organisation actually exists — the regression asserts the candidate list, not
the displayed labels. Any birth, growth, decline or collapse invalidates the
district cache; the rebuild happens on the next read.

### Surfacing and save

City Hall's Neighbourhoods section grows a "Word around town" card only when
there is something to report: place, shape, stage, how many households are
said to be involved. The House card hints at a family's ties only once the
organisation is a local crew or larger, and names the organisation, never a
deed. The Chronicle carries "first appeared around", "grew into a", "lost
influence" and "broke up". Nothing here dispatches, arrests or fights.

Save V3: `social.organisations`, `nextOrgId` and the 60-day `orgMemory` ride
in the optional `social` field. On load a type this build does not have, a
stage off the ladder, or a family that does not exist is refused rather than
trusted. An old save loads with none and develops gradually.

## Bosses, fronts and enforcement — slice 5

`src/simulation/organisations.js` (bosses and fronts, as properties of the
organisation) and `src/simulation/enforcement.js` (what the police do about
it). The two talk through plain data, the way districts and organisations do:
enforcement puts a point of `pressure` on a record, and the organisations pass
reads it as a stage lost. Nothing calls a setter, and nothing in `src/ui` may
import anything from either module but readings — the regression fetches every
UI module off the directory listing and audits the import lists.

### A boss is a citizen

Once an organisation is a local crew (stage 3) someone is said to run it. That
someone is **always one of the simulated citizens the game already has**: a
member of a notable family drawn into the organisation, chosen by
`bossWeight(traits)` — leadership most, then nerve, then ambition — and nothing
else. The function's source is checked for name, class, trade and standing. An
organisation with no family involved has no boss, and no abstract boss is ever
invented; the regression's sabotage that invents one fails the suite on the
surname check. Across six seeded towns every boss surname was different. The
Chronicle says "Around Fern Hollow, people say Ada Ellery runs the Fern Hollow
Network"; the family record carries "Word is Ada runs the …" as a remark
(`familyNote`, a note on the record and never an outcome). A boss taken in is
remembered on the organisation's `taken` list and is not chosen again.

### A front is a business

Once an organised crew (stage 4), an organisation may take up quietly behind
one or two ordinary businesses inside its district — a café, a bakery, a market
stall — chosen by seeded pick among what stands there. The building is not
touched: **economy.js and employment.js do not know the word**, and the
regression proves the same business pays the same coins and fills the same
registry jobs with and without being a front, and that its Look card is a
business card. The one thing the card ever adds is what a neighbour would
notice: "The police have been asking questions here", and only while they are.
The Chronicle names the kind of place and the street, never the business. A
café in a town with no organisation is a café; nothing is a front by type. A
bulldozed front is no front, read every pass rather than trusted at load, since
buildings are restored after the social field.

### Enforcement is autonomous

The player builds stations. A station within 14 tiles of a district's centre
**notices** an organisation there with a chance read from visibility and
coverage only — stage, fronts, open crimes around it, stations in reach — and
never from a name, a class or a district identity (source-checked). An
**investigation** then runs on its own clock, a week or two with one station.
When it is ready the police **act**: a cruiser goes out through the ordinary
municipal dispatcher as a `crime` incident tagged `raid` (same lifecycle, same
vehicle, its own toast, no burglar drawn, not counted as an unresolved crime),
and the case is made by a seeded roll that favours the police when stations
are many and the organisation is small. Made: a front is closed, the boss is
taken in for questioning, and a point of pressure lands. Dropped: "found
nothing they could use", and the next look comes slower for 20 days. With no
station in reach nothing is ever looked into, however visible.

The player never commands any of it. The station card says what it is looking
into and that nobody at City Hall asked; City Hall's "Word around town" card
reports the case without owning it. Violence stays abstract: nobody is hurt,
no building is lost, no citizen is removed, and the café is a café tomorrow.

### Save

Boss, fronts, `taken`, `pressure`, the open investigation and the last case
ride inside the organisation record. On load a boss must belong to a family
that exists and is involved, front seeds are cleaned to positive integers,
pressure is bounded, and an unknown anything is dropped. Incidents are
transient as before, so an in-flight raid simply does not survive a reload.

## Fame and entertainment culture — slice 6

`src/simulation/fame.js`, three careers in `careers.js`, two identities in
`districts.js`. The same fabric that grows a crew nobody built grows a musician
everybody has heard of, by the same rules: no button, no verdict, bounded,
reversible, validated on load.

### Entertainment is work

Three performing careers, each a seat at a real building from the registry:
**musician** at a café, **street performer** at a market, **artist** at a
landmark (library, statue, clock tower). No education gate. A farm belt with no
venue grows no performer; the regression runs it.

### The culture feedback loop, kept slight and positive

PART 17 asks that culture influence future probabilities slightly and never
hard-lock. `careers.js` tilts a person's job choice by ×1.25 toward the work a
district is already known for — Entertainment and Nightlife draw performers,
Agricultural draws farmers and mill workers, Academic teachers, Working
Waterfront dock workers. Nothing else. The tilt table names no criminal or
struggling identity, and the regression reads the source line to keep it so;
districts.js reads none of this back, so the loop cannot close on itself.

### Renown

A person who performs gains renown each fame pass (two social passes) from
`gain(traits, crowd, festival)`: talent is creativity and charisma, crowd is
the homes within six tiles of their venue (the nearest building of their
trade's kind), and a festival day is worth three ordinary ones. Renown is
0..3; the valley's words are *getting known*, *locally famous*, *known across
the valley*. It fades at 0.03 a pass when they stop, and below the first rung
the record is dropped. At most eight names are tracked.

What it does not read: desirability, tier, standing, education, surname,
anything about organisations — source-checked. **An affluent district does
not manufacture celebrities**: the regression runs the richest, best-schooled
street in the valley with nowhere to perform for 240 days and gets nobody. The
same street with three cafés and a green gets musicians, then a name. Across
six seeded towns every famous surname was different.

### Two identities

**Entertainment** needs three of four: three cafés, a place to gather
(recreation or landmark), a performer living there, and a long street or a
station — so a row of cafés on a long road is a commercial strip until
somebody plays there or there is somewhere to gather. **Nightlife** needs two
of: cafés under street lamps, a celebrity, two performers. Districts count
performers and celebrities as plain data off the family and fame records, and
the count is invalidated when a performing career is taken up or left or a
name crosses the celebrity line. Neither identity is an input to organisations
or to the police — both sources are checked for the words.

### Chronicle and surfacing

"Ada Ellery is getting known around Fern Hollow as a musician"; "Local
musician Ada Ellery became locally famous"; "…became Meadowline's first
widely known performer" (once, the first time anyone reaches the top rung);
"…played to a full house at Harvest Home" on a festival day, with a note of
music at the venue; "…faded from view". The House card shows the word beside
the person; the venue's business card says who it is known for and stays a
business card; City Hall grows a "Names the valley knows" card only when there
is a name to know. The UI imports readings only, audited over every file in
`src/ui`.

### Save

`social.fame` and `fameFirst` ride in the optional social field. On load a
name must belong to a family that exists, a seat under the member cap and a
performing career; renown is clamped to the ladder. An old save loads with
none and grows its own.

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
- no single condition forms an organisation, however long it is held;
- prosperity and police nearby weaken and end one;
- a boss is a named member of an involved family or there is none; a front pays
  and employs exactly as the same business does; nothing is investigated
  without a station in reach, and the police open, work and act on a case with
  no call from the player;
- the UI imports nothing but readings from the organisations, enforcement and
  fame modules, audited over every file in `src/ui`;
- an affluent street with nowhere to perform produces nobody famous; a café
  street does; fame fades when the venues go; the culture tilt names no
  criminal identity;
- surname distribution among criminal organisations matches the shared pool;
- social recomputation is invalidation-driven, asserted by counting work rather
  than timing it, so the assertion reads the same on any machine;
- old saves load and develop gradually.

Every new assertion is confirmed to fail against the unfixed code before it is
trusted.

## Slice order

1. **Districts** — derivation, stable naming, identity, evolution, Look/City
   Hall/Chronicle surfacing, diagnostics, tests. *(production, `1d192f9`)*
2. **Families, notable citizens and traits.** *(production, `3954911`)*
3. **Careers and standing.** *(production, `3954911`)*
4. **Organisation formation, staged growth, decline.** *(production, `8342585`)*
5. **Bosses, fronts, autonomous enforcement.** *(production, `af1be49`)*
6. **Fame and entertainment culture**, lightweight as the brief asked.
   *(production, `1c02801`)*

Political influence remains future work and is out of scope.

## Success condition

A player builds Meadowline normally for a long session, then looks around and
finds one neighbourhood became a farming community, another a quiet suburb,
another an entertainment centre; a family grew wealthy; a citizen became known;
a struggling district recovered; a crew formed without being asked; a café
quietly became a front; the police started investigating on their own; the
organisation later weakened — and the Chronicle remembered all of it.

The target reaction is: **"I didn't tell them to do that."**
