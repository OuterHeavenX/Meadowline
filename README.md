# Meadowline

Meadowline is a calm, mobile-first isometric living-city builder. It remains a lightweight static browser game built with native ES modules and Canvas 2D. Normal play requires no React/Vue application, Node process, server runtime, backend dependency or mandatory online service.

## Production status

Verified production `main` at the start of Roads & Mobility 2.0:

`fcf7f8c02291c7cd1bc2a164522353b7476e81ef`

That production commit includes:

- Living City Foundation / School 2.0
- Save V3
- Housing 2.0 / Neighborhood Desirability / Residential Evolution
- City Growth 1.0 / 1.1
- progressive land parcels
- Settlement → Village → Township → Growing Town
- Town Goals
- safe-touch navigation and mobile Build UI refinement
- School Level 2
- City Hall 1.0 / Civic Center Foundation through merged PR #5

Historical implementation branches remain preserved, including:

- `agent/architecture-refactor`
- `feature/living-city-foundation`
- `feature/housing-2`
- `feature/city-growth-progression`
- `feature/city-hall-civic-center`

## Current development

Branch: `feature/roads-mobility-2`

Draft PR: **#6 — Roads & Mobility 2.0 — Streets, Sidewalks, Vehicles & Rail Crossings**

Current milestone: **Roads & Mobility 2.0**.

This milestone evolves the existing Road tool into Meadowline's permanent shared street infrastructure. It does not create a second Road database or replace the existing 44×44 world/pathfinding architecture.

## Permanent product architecture

World: **44×44**.

Progression cities begin in the 20×20 Meadowline Center and can open eight additional parcels without regenerating terrain.

City stages remain exactly:

1. Settlement
2. Village
3. Township
4. Growing Town

Current living-city relationships remain:

Road Access + Mood + Education + Neighborhood Desirability
→ residential evolution
→ higher household capacity
→ more residents
→ greater School/civic pressure.

City Hall preserves the UI rule:

**Local buildings explain local conditions. City Hall explains citywide conditions.**

## Roads & Mobility 2.0

The existing Road tile remains the authoritative Road object for:

- placement/economy;
- building access;
- Housing requirements;
- City Growth Road counts;
- saves;
- safe-touch painting.

One Road tile now visually reads as a complete small-town street with a darker vehicle carriageway and lighter sidewalk/curb space.

Pedestrians retain the existing Road graph but render on stable side-of-street offsets instead of visibly occupying the vehicle centerline.

A lightweight mobility layer adds bounded representative:

- compact cars;
- pickups;
- delivery/service vans.

Ambient vehicles reuse the existing 44×44 breadth-first route search, cache routes by network version, reroute/despawn safely when Roads change, and are regenerated rather than persisted.

No traffic congestion/parking/commute simulator is introduced.

## Road / Rail crossing foundation

Road and Rail can now intentionally share a clean perpendicular land tile without deleting either network.

The existing one-object-per-tile save architecture is retained through generic V3 state. A crossing is semantically both Road and Rail, so vehicles and trains can traverse it while Road/Rail counts remain coherent.

Train priority is absolute at crossings. Representative road vehicles and pedestrians wait while a train occupies the protected crossing zone.

Existing water bridges remain separate and continue using the production span/bridge architecture.

## City Hall Mobility summary

City Hall now exposes only real Mobility values:

- Road tiles;
- connected Road components;
- Rail crossings;
- active representative vehicles.

There is no fake Traffic Health score.

## Save system

Current key: `meadowline.v3`.

Roads 2.0 does not require Save V4.

Existing Roads automatically load with upgraded street rendering and mobility semantics. No Road rebuilding or upgrade charge occurs.

Crossing metadata uses ordinary generic building `state`. Active vehicles, routes and lane geometry are transient/derived and are not saved.

## Performance and diagnostics

Mobility uses event/network-version route generation rather than one path search per vehicle per frame.

`?debug=1` includes Road components, active vehicles/routes, Rail crossings, route searches/failures/reroutes/despawns, crossing waits and network invalidations alongside existing diagnostics.

## Validation policy

Automated proof and physical-device proof remain separate.

The workflow covers:

- JavaScript syntax
- module hygiene/import cycles
- Living City + Housing regression
- City Growth 1.0 regression
- City Growth 1.1 Town Goal/touch regression
- City Hall 1.0 regression
- Roads & Mobility 2.0 regression

Validation history is preserved in the PR and `docs/ROADS_MOBILITY_2.md`. Physical owner-device acceptance remains pending.

Only the owner can complete physical acceptance in `docs/IPHONE_ACCEPTANCE.md`.

## Running locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Regression pages include:

- `/tests/regression.html`
- `/tests/city-growth-regression.html`
- `/tests/city-growth-1-1-regression.html`
- `/tests/city-hall-regression.html`
- `/tests/roads-mobility-regression.html`

Module hygiene:

```bash
node tests/module-hygiene.mjs
```

## Roadmap

Production:

Living City / School → Housing 2.0 → City Growth 1.0 / 1.1 → City Hall 1.0

Current development:

**Roads & Mobility 2.0**

Next:

**Recreation 2.0 / Town Life**

Later systems may include Safety / Police / Crime, Employment / Prosperity, Fire / Emergency, Healthcare, Waterworks / Landscaping and further transport evolution. Their exact post-Recreation order remains playtest-sensitive.

See `docs/ROADS_MOBILITY_2.md` for the canonical technical record.
