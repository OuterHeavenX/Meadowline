# Meadowline Living City Foundation

## Status

**Production status:** implemented on `main`.

**Historical development branch:** `feature/living-city-foundation`.

**Architectural source:** `agent/architecture-refactor`.

**Release path:** Living City / School 2.0 was originally developed and validated on its feature branch, then included with Housing 2.0 in merged PR #3. Historical PR #1 was superseded and closed without a separate merge.

This document records the provider architecture that remains the foundation for City Growth and future civic systems. The game remains a lightweight static browser game using native ES modules and the existing canvas/isometric renderer.

## Building registry

`src/buildings/registry.js` is the authoritative shared source for buildable metadata wherever practical. It owns building identity, name, category, cost, shortcut, placement metadata, service metadata, save defaults, and now progression/upgrade metadata.

This avoids parallel School/toolbar/save tables and gives future civic providers one place to describe capacity, radius, upgrades, and unlock stage.

## Civic-service architecture

The first real provider is Education.

A School has:

- service type: Education
- Level 1 radius: 7 tiles
- Level 1 capacity: 28 students
- persistent building state including `state.level`

Households generate student demand from their real population. Provider assignment is deterministic and capacity-bounded. A School may be in range while unable to fully serve all demand.

Household Education is persistent 0–100 state. Served households improve gradually; uncovered or capacity-blocked households stop gaining but do not lose previously earned Education.

The generic service layer remains designed for future Safety, Fire Protection, Healthcare, Recreation, Employment, Transit, and Sanitation providers. Those future services are not implemented merely because their service-type hooks exist.

## Provider state and recomputation

Service data is cached and invalidated when relevant city state changes. It is not rebuilt every render frame.

The existing Education model exposes provider statistics including:

- capacity
- demand in reach
- served students
- utilization
- homes covered
- radius
- level
- overload state

Housing population growth therefore produces real additional School demand without a Housing-specific School shortcut.

## Save Schema V3

The Living City milestone established `meadowline.v3` and V1/V2 migration.

Building state is JSON-safe, bounded, and deliberately tolerant of optional future metadata. School level and household Education survive reload. Malformed optional state is repaired defensively rather than crashing the city.

City Growth continues using V3 rather than introducing an unnecessary V4.

## Mobile input foundation

A critical Living City repair changed placement from pointer-down commitment to a pending tap that is cancelled when a second finger begins a pinch gesture.

This means a player can keep a building tool selected and pinch/zoom without accidentally placing that building. Paint tools still work after movement crosses the drag threshold.

This behavior is a permanent regression requirement for all future milestones.

## Inspection and visualization

School and household Look cards expose service state in player language rather than raw debug output.

The civic placement preview reads provider radius from the registry and draws the same geometric field the simulation actually uses. School coverage is therefore not a decorative circle that disagrees with service calculations.

Housing 2.0 later added green/amber usefulness feedback around that generic provider-boundary layer.

## Diagnostics and tests

The foundation includes developer-only `?debug=1` diagnostics, browser regression coverage, and module-hygiene checks for cycles, imported-binding assignment, and meaningless re-export shims.

## Physical validation record

Previously physically demonstrated on an owner iPhone before the production merge:

- Meadowline loads and renders in portrait
- School Look information is readable
- School capacity remains bounded at 28 / 28
- demand can exceed capacity
- `At capacity` and `Waiting for school space` states appear correctly
- household Education rises while served
- 7-tile School reach is live
- two-finger pinch with School selected does not accidentally build
- the observed household visible-pedestrian over-count was repaired

Automated tests do not replace this device record, and this device record does not automatically validate later City Growth UI or performance.

## Current consumer: City Growth 1.0

`feature/city-growth-progression` reuses this architecture rather than replacing it.

School Level 2 is defined as a generic civic upgrade in registry metadata. The same provider resolver reads the upgraded level and changes capacity from 28 to 44 while keeping radius 7.

Future Police, Fire, and Hospital work should follow the same provider/registry pattern only after their own milestones are approved.
