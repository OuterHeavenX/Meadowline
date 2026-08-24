# Meadowline Living City Foundation

## Status

**Production on `main`.** Historical implementation branch: `feature/living-city-foundation`. Architectural source: `agent/architecture-refactor`. Living City / School 2.0 was included with Housing 2.0 in merged PR #3.

City Growth 1.0 / 1.1 is also now **production through merged PR #4**. Its historical implementation branch is `feature/city-growth-progression`.

This document records permanent architecture that City Hall and future civic systems must preserve.

## Static-browser architecture

Meadowline remains native ES modules + Canvas 2D/isometric rendering. No React/Vue application, server runtime, or gameplay build process is required during normal play.

## Authoritative building registry

`src/buildings/registry.js` is the shared source for building identity, category, cost, shortcuts, placement metadata, service metadata, save defaults, progression unlock metadata, and civic upgrade metadata wherever practical.

City Hall 1.0 follows this rule with registry ID `cityHall` and generic `state.level`; no parallel City Hall database was introduced.

## Reusable civic providers

Education is the first real service provider.

Level 1 School:

- radius 7
- capacity 28
- persistent `state.level`

School Level 2:

- Township
- 650 coins
- capacity 44
- radius remains 7

Households generate demand from real population. Assignment is deterministic and capacity-bounded. A household can be geographically covered but waiting for space. Household Education is persistent 0–100; service loss pauses gain rather than deleting learned Education.

The provider layer is designed to support future Safety, Fire, Healthcare, Recreation, Employment, Transit, Sanitation, and similar services without implying those systems already exist.

## Local truth vs citywide truth

Permanent UI philosophy:

**Local providers explain local service. City Hall summarizes citywide service.**

A House continues to explain that household's Mood, Education, Desirability, residents and Housing readiness. A School explains its own capacity, students and level. Future Parks should explain local Recreation.

City Hall may summarize Education/Housing/Recreation citywide, but it must query those authoritative simulations rather than own or duplicate their state.

This rule exists to prevent every new system from becoming another permanent HUD meter.

## Cached recomputation

Service data is cached and invalidated on relevant state changes. It is not rebuilt every render frame. Housing density therefore pressures Education through the generic service path rather than a Housing-only shortcut.

City Hall 1.0 extends the same philosophy with a cached aggregate city-summary read model rather than a per-frame or per-citizen municipal dashboard.

## Save Schema V3

Current key: `meadowline.v3`.

V1/V2 migration and defensive optional building state remain permanent compatibility requirements. City Growth and Town Goals use V3. City Hall also remains V3 because its only persistent data is ordinary building existence/position and generic `state.level`.

Missing City Growth metadata must never retroactively lock an established city. A pre-City-Hall city must never be charged, reset, relocked or force-edited during migration.

## Mobile input evolution

The original Living City repair changed placement from immediate pointer-down commitment to a pending tap that a second finger could cancel, proving that pinch/zoom must never place a building accidentally.

City Growth 1.1 strengthened that permanent rule after physical iPad testing exposed another failure mode: with a paint tool selected, an intended one-finger pan could begin construction.

The production touch contract is:

- tap = one intentional action;
- immediate one-finger drag = camera navigation regardless of selected build tool;
- second finger = pinch/zoom, cancelling pending build/paint intent;
- Road/Rail/Tree/Remove drag painting requires a deliberate short hold before movement;
- pointer cancellation and UI input shielding remain required.

City Hall placement deliberately reuses this contract rather than adding a special pointer mode.

## Inspection and service visualization

Look cards expose player-facing local state. Civic placement boundaries read provider metadata from the registry and match actual service geometry.

City Hall 1.0 adds the deliberate whole-city inspection destination. It shows only derived real data and future service modules must not appear until their simulation exists.

## Diagnostics and tests

Developer-only `?debug=1`, browser regressions, and module-hygiene checks remain required. City Growth added input/Town Goal diagnostics. City Hall adds civic-center count/level, city-summary recomputation/invalidation and panel-open diagnostics without replacing existing checks.

## Physical validation record

Previously physically demonstrated before production merge:

- mobile load/render
- School Look readability
- 28/28 finite capacity and overload
- waiting-for-space language
- household Education gain
- radius 7 service reach
- two-finger pinch with School selected does not build
- representative pedestrian count repair

City Growth later received its own physical evidence and owner-approved PR #4 merge. Unchecked physical items remain unchecked; merge status does not rewrite history.

City Hall physical validation is currently pending in `docs/IPHONE_ACCEPTANCE.md`.

## Current consumer

`feature/city-hall-civic-center` is the current development consumer of this foundation.

After City Hall acceptance, Recreation 2.0 is the planned next major simulation consumer. Future Police/Fire/Hospital systems should use the same provider/summary separation only when their own milestones are approved.
