# Meadowline

Meadowline is a calm, mobile-first isometric city builder evolving into a deeper **living-city simulation** while remaining a lightweight static browser game.

The project runs as native ES modules on a 2D canvas. There is no React app, no server runtime, and no gameplay build step required.

## Current development state

Active milestone branch: `feature/housing-2`

Validated parent branch: `feature/living-city-foundation`

Architectural foundation: `agent/architecture-refactor`

Current milestone: **Housing 2.0 / Neighborhood Desirability / Residential Evolution**

PR #1 for the Living City Foundation remains draft and unmerged. Housing 2.0 is intentionally being developed on top of that validated branch without modifying `main`.

**Automated Housing 2.0 validation is green.** GitHub Actions has passed JavaScript syntax validation, module hygiene and the headless browser regression suite on the Housing branch. Physical-iPhone Housing 2.0 acceptance is still required before any merge.

### Living City Foundation already established

- centralized building registry
- reusable civic-service framework
- persistent household Education
- finite School demand/capacity/assignment
- 7-tile School Education-service radius
- 28-student School capacity
- gradual Education progression
- household and School inspection
- green/amber School benefit feedback
- citywide Education metrics
- Save Schema V3 with v1/v2 migration
- mobile build/pinch arbitration repair
- developer diagnostics
- representative citizens with per-household visible-count protection

Core School 2.0 behavior has been physically demonstrated on the owner's iPhone, including real overload, `Waiting for school space`, Education growth, 7-tile reach and pinch-to-zoom without accidental School placement.

## Housing 2.0

Housing is now the second Living City system.

The intended feedback loop is:

Road Access + Mood + Education + Neighborhood Desirability
→ Upgrade Readiness
→ Residential Evolution
→ Higher Capacity
→ Higher Residential Tax Value
→ More Residents
→ More School Demand
→ Greater Civic Pressure

### Residential tiers

The first three tiers are:

- **Cottage** — 4-resident base capacity, normal tax value
- **Town Home** — 6-resident base capacity, 1.25× residential tax value
- **Established Home** — 8-resident base capacity, 1.55× residential tax value

The player still places a single **House** tool. Residential tiers evolve automatically; they are not separate toolbar items.

Upgrade requirements currently use only real systems:

**Cottage → Town Home**
- road access
- Mood 65+
- Education 15+
- Desirability 45+
- roughly 50 seconds of sustained qualifying simulation time, with a small deterministic per-house variation

**Town Home → Established Home**
- road access
- Mood 78+
- Education 35+
- Desirability 62+
- roughly 85 seconds of sustained qualifying simulation time, with a small deterministic per-house variation

Progress pauses when conditions are lost rather than being erased. Existing higher-tier homes do not downgrade.

### Legacy School capacity decision

The old School behavior gave nearby homes +2 resident capacity.

Housing 2.0 retires that rule as a source of **new** population capacity because Education is now the School's real civic role and residential tier should own residential density.

Migration is intentionally gentle: an existing household that already contains more residents than its new tier base is grandfathered. Nobody is evicted simply because the capacity model changed; further growth waits until the home reaches an appropriate tier.

The older 5-tile School mood effect remains intact.

## Neighborhood Desirability

Desirability is separate from Mood.

Mood describes how residents feel now. Desirability describes how attractive the location is for long-term residential development.

The current 0–100 model uses only systems that really exist, including:

- road access
- current Mood
- Education access
- household Education
- parks
- cafés
- station access
- street lighting
- trees and water
- local crowding pressure

Player-facing labels are:

- Quiet Start
- Developing
- Pleasant
- Desirable
- Highly Desirable

Future Safety, Healthcare, Employment and Prosperity can contribute later, but they are not shown or simulated yet.

## House inspection 3.0

The Look panel now explains:

- household residents/capacity
- Mood and existing Mood reasons
- Education
- serving School and capacity state
- Neighborhood Desirability
- current residential tier
- next residential tier
- upgrade progress
- each real upgrade requirement
- whether the home is waiting or actively growing

The panel remains scrollable on mobile rather than shrinking text to fit.

## Civic coverage visualization

Civic service placement now has a reusable visualization layer.

When placing a School:

- a **green service boundary** shows the actual geographic Education-service field
- a very light green fill keeps the service area readable without hiding the city
- green home markers show strong useful service
- amber/yellow home markers show expected capacity pressure
- invalid placement still uses the existing red treatment

The visual boundary reads the provider radius from the building registry. It is not hard-coded to School and is designed to be reused by future Police, Fire and Healthcare providers.

For the current Chebyshev School radius of 7, the full service field contains all tiles whose centers are within 7 tiles of the School; the preview therefore matches the simulation exactly rather than drawing a misleading decorative circle.

## Housing visuals

Residential tiers are designed to remain visible on a phone through silhouette rather than microscopic detail:

- Cottage: smallest body/roof profile
- Town Home: wider/taller form, extra upper window and visible dormer
- Established Home: largest silhouette, additional upper windows and small landscaping/fence treatment

Seeded wall/roof variation remains, so higher tiers do not all become identical.

Homes with active upgrade progress receive a restrained growth chevron rather than permanent map clutter.

## Save system

Current key: `meadowline.v3`

Housing 2.0 intentionally remains inside V3. House state can now persist:

- `education`
- `housingTier`
- `upgradeProgress`
- `desirability`
- bounded future optional metadata

Existing V1, V2 and earlier V3 worlds receive safe Tier 1 defaults. Invalid housing tier/progress/desirability values are clamped defensively rather than crashing a save.

## Performance model

Housing evolution is not calculated at 60 FPS.

It runs on the existing low-frequency Living City simulation tick. Civic services continue to use cached/event-driven recomputation, and Housing invalidates service demand only when population/tier changes require it.

Developer diagnostics (`?debug=1`) now also report housing evaluations, residential upgrades and desirability recomputes.

## Existing game systems preserved

The current game still includes the 44×44 seeded world, ponds, natural trees, roads, rails, water bridges, homes, cafés, parks, trees, lamps, windmills, stations, docks, markets, bakeries, Schools, citizens, trains, boats, Mood, economy, day/night, seasons, weather, festivals, wishes, Ledger, minimap, Look, placement/removal/refunds, persistence and mobile pan/pinch controls.

## Running locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Regression page:

`http://localhost:8000/tests/regression.html`

Module hygiene:

```bash
node tests/module-hygiene.mjs
```

## Validation policy

Automated validation and physical iPhone acceptance are separate gates.

Automated status on this branch:

- JavaScript syntax: **PASS**
- module hygiene: **PASS** — no imported-binding assignment, re-export shim or import cycle
- browser regression: **PASS**

Housing 2.0 must still prove on the physical phone that:

- tier silhouettes are readable
- Look explains desirability and growth clearly
- a qualifying home evolves gradually
- upgraded capacity allows population growth
- School demand reacts to denser homes
- the green School service boundary is accurate and readable
- pinch with School selected still cannot accidentally place a School
- Save V3 preserves housing state
- evolved neighborhoods remain smooth

See `docs/IPHONE_ACCEPTANCE.md` for the exact checklist.

## Roadmap after Housing 2.0

After physical validation, the next move should be chosen deliberately rather than started automatically. Current candidates are:

- Progressive Land & City Growth
- Police / Crime / Jail
- Recreation 2.0
- Civic Service Upgrades, beginning with School Level 2

Longer-term plans still include Fire, Healthcare, sickness/medicine, medical research/evolving viruses, Employment/Prosperity, deeper economy, road-over-rail crossings and large-world architecture.

See `ROADMAP.md`, `docs/LIVING_CITY_FOUNDATION.md` and `docs/HOUSING_2.md` for the detailed development path.

## Product principles

Meadowline should remain peaceful, understandable, visually charming, mobile friendly, rewarding to observe, progressively deeper and never unnecessarily punishing.

Problems should create interesting planning decisions, not punishment spirals. The purpose of each milestone is to make future systems easier to add cleanly.