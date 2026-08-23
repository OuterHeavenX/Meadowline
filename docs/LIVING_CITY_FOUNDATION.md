# Meadowline Living City Foundation

## Status

**Production on `main`.** Historical implementation branch: `feature/living-city-foundation`. Architectural source: `agent/architecture-refactor`. Living City / School 2.0 was included with Housing 2.0 in merged PR #3; historical PR #1 was superseded and closed without separate merge.

This document records permanent architecture that City Growth and future civic systems must preserve.

## Static-browser architecture

Meadowline remains native ES modules + Canvas 2D/isometric rendering. No React/Vue application, server runtime, or gameplay build process is required during normal play.

## Authoritative building registry

`src/buildings/registry.js` is the shared source for building identity, category, cost, shortcuts, placement metadata, service metadata, save defaults, progression unlock metadata, and civic upgrade metadata wherever practical.

Future systems should query the registry instead of creating parallel School/toolbar/save/unlock tables.

## Reusable civic providers

Education is the first real service provider.

Level 1 School:

- radius 7
- capacity 28
- persistent `state.level`

Households generate demand from real population. Assignment is deterministic and capacity-bounded. A household can be geographically covered but waiting for space. Household Education is persistent 0–100; service loss pauses gain rather than deleting learned Education.

The provider layer is designed to support future Safety, Fire, Healthcare, Recreation, Employment, Transit, Sanitation, and similar services without implying those systems already exist.

## Cached recomputation

Service data is cached and invalidated on relevant state changes. It is not rebuilt every render frame. Housing density therefore pressures Education through the generic service path rather than a Housing-only shortcut.

## Save Schema V3

Current key: `meadowline.v3`.

V1/V2 migration and defensive optional building state remain permanent compatibility requirements. City Growth and Town Goals continue using V3; missing City Growth metadata must never retroactively lock an established city.

## Mobile input evolution

The original Living City repair changed placement from immediate pointer-down commitment to a pending tap that a second finger could cancel, proving that pinch/zoom must never place a building accidentally.

City Growth 1.1 strengthens that permanent rule after physical iPad testing exposed another failure mode: with a paint tool selected, an intended one-finger pan could begin construction.

The current touch contract is now:

- tap = one intentional action;
- immediate one-finger drag = camera navigation regardless of selected build tool;
- second finger = pinch/zoom, cancelling pending build/paint intent;
- Road/Rail/Tree/Remove drag painting requires a deliberate short hold before movement;
- pointer cancellation and UI input shielding remain required.

This newer contract supersedes the earlier assumption that paint tools begin painting immediately after a drag threshold, while preserving the earlier pinch safety reasoning.

Desktop mouse controls may remain faster and separate from coarse-pointer behavior.

## Inspection and service visualization

Look cards expose player-facing service state. Civic placement boundaries read provider metadata from the registry and match the actual service geometry rather than a decorative approximation.

## Diagnostics and tests

Developer-only `?debug=1`, browser regressions, and module-hygiene checks remain required. City Growth 1.1 adds input-state and Town Goal diagnostics without replacing existing performance/service/Housing checks.

## Physical validation record

Previously physically demonstrated before the production merge:

- mobile load/render
- School Look readability
- 28/28 finite capacity and overload
- waiting-for-space language
- household Education gain
- radius 7 service reach
- two-finger pinch with School selected does not build
- representative pedestrian count repair

Those facts do not automatically validate later City Growth UI. Current City Growth 1.1 device checks remain in `docs/IPHONE_ACCEPTANCE.md`.

## Current consumer

`feature/city-growth-progression` reuses this foundation. School Level 2 remains a registry-driven generic civic upgrade: 44 capacity at radius 7. Future Police/Fire/Hospital work should use the same architecture only after their milestones are approved.
