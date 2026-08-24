# Meadowline

Meadowline is a calm, mobile-first isometric living-city builder. It remains a lightweight static browser game built with native ES modules and Canvas 2D. Normal play requires no React/Vue application, Node process, server runtime, or backend dependency.

## Production status

Verified production `main` at the start of City Hall 1.0:

`1d9e7e9c110fad465b332ef85503d102ed5af6e0`

City Growth PR #4 was explicitly approved by the owner and merged into `main`. City Growth 1.0 / 1.1, progressive land parcels, four city stages, progression-aware Town Goals, safe-touch navigation, the mobile Build UI re-haul and School Level 2 are therefore production systems.

Historical implementation branches remain preserved:

- `agent/architecture-refactor`
- `feature/living-city-foundation`
- `feature/housing-2`
- `feature/city-growth-progression`

The City Growth feature branch is historical implementation context, not the current production branch.

## Current development

Branch: `feature/city-hall-civic-center`

Current milestone: **City Hall 1.0 / Civic Center Foundation**.

City Hall work is not production. It must remain on its feature branch and draft PR until the owner completes physical iPhone/iPad acceptance and explicitly approves a merge.

## Production foundation

The world remains **44×44**. Progression cities begin in the 20×20 Meadowline Center and can open eight additional parcels without regenerating terrain.

City stages remain exactly:

1. Settlement
2. Village
3. Township
4. Growing Town

City Growth requirements and parcel rules are authoritative in `src/progression/city-growth.js` and are not rewritten by City Hall.

Production living-city relationships remain:

Road + Mood + Education + Neighborhood Desirability
→ residential evolution
→ higher household capacity
→ more residents
→ greater School demand
→ stronger civic pressure.

Residential tiers remain Cottage, Town Home and Established Home. Education remains the first reusable civic service. School Level 2 remains Township + 650 coins, 44 capacity, radius 7.

## City Hall 1.0

City Hall establishes Meadowline's first true civic center and formalizes a permanent UI rule:

**Local buildings explain local conditions. City Hall explains citywide conditions.**

Registry ID: `cityHall`.

Civic progression:

- Level 1 — Town Office — Settlement — placement 90 coins
- Level 2 — Village Hall — Village — 280 coins
- Level 3 — Town Hall — Township — 520 coins
- Level 4 — Meadowline City Hall — Growing Town — 850 coins

The building is unique, uses the existing safe-touch placement path, persists through generic `state.level`, and is deliberately one tile in City Hall 1.0 so the milestone does not introduce a risky multi-tile placement/save subsystem.

City Hall upgrades are optional. City stage unlocks civic improvement; civic improvement does not hard-lock the next city stage.

City Hall Look summarizes only real city data:

- city stage and next-stage requirements
- population and occupied homes
- exact Cottage / Town Home / Established Home counts
- average Mood, Education and Desirability
- existing Town Goals and progress
- opened/available land parcels with explicit purchase confirmation
- treasury and real last-payday residential tax / Trade / milling / grant totals
- current Education service totals

Housing, Education, Town Goals, City Growth, parcels and the economy remain owned by their existing simulation systems. City Hall does not duplicate their state.

No fake Recreation, Police, Fire, Healthcare, Employment or policy meters are displayed.

## Town Goals and City Hall

The existing Town Goal engine remains authoritative. Contextual civic goals may suggest:

- establishing a Town Office after basic settlement activity;
- Village Hall after Village;
- Town Hall after Township;
- Meadowline City Hall after Growing Town.

The goal system still guides Housing, Education, land, Trade, environment and transport. City Hall does not become the whole game.

The earlier City Growth physical findings remain historical architectural memory: premature Boat/Train goals, unsafe drag/build behavior, first toolbar friction, one-off placement friction and Look/build overlap were real device findings that led to City Growth 1.1. The later owner iPad session supplied strong positive evidence and the owner explicitly approved the final PR #4 merge. Unchecked physical items were not retroactively marked as tested.

## Save system

Current key: `meadowline.v3`.

City Hall requires no Save V4. Normal building existence/position and `state.level` persist. Citywide summaries are derived rather than saved.

Malformed City Hall levels clamp to 1–4. Duplicate saved civic centers are repaired safely by retaining the first valid City Hall. Existing pre-City-Hall cities are not charged, reset, relocked or force-edited.

## Performance and diagnostics

Education, Housing, City Growth, Town Goals and City Hall summary work use low-frequency or cached aggregate queries rather than per-frame citywide reconstruction.

`?debug=1` now includes City Hall count/level, City Hall panel opens, city-summary recomputes/invalidations, occupied homes, average Education and average Desirability alongside existing diagnostics.

## Validation policy

Automated proof and physical-device proof remain separate.

The workflow covers:

- JavaScript syntax
- module hygiene/import cycles
- Living City + Housing regression
- City Growth 1.0 regression
- City Growth 1.1 Town Goal / touch-policy regression
- City Hall 1.0 regression

Only the owner can complete physical acceptance in `docs/IPHONE_ACCEPTANCE.md`.

## Running locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Regression pages:

- `/tests/regression.html`
- `/tests/city-growth-regression.html`
- `/tests/city-growth-1-1-regression.html`
- `/tests/city-hall-regression.html`

Module hygiene:

```bash
node tests/module-hygiene.mjs
```

## Roadmap

Production:

Living City / School → Housing 2.0 → City Growth 1.0 / 1.1

Current development:

**City Hall / Civic Center Foundation**

Next planned major simulation milestone after City Hall is physically accepted and explicitly merged:

**Recreation 2.0 / Town Life**

Later municipal systems may include Employment / Prosperity, Safety / Police, Fire / Emergency, Healthcare, Waterworks / Landscaping and transport evolution. Their exact order after Recreation remains a future playtesting decision.
