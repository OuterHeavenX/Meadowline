# Meadowline Living City Foundation

This branch introduces the reusable foundation for civic services without changing Meadowline's static-browser architecture. The game still runs as native ES modules on the existing canvas/isometric renderer; React, a server runtime, and a gameplay build step are not required.

## Building registry

`src/buildings/registry.js` is the authoritative source for buildable metadata used by the toolbar, placement costs, save validation, School service tuning and default per-building state. Existing specialist building modules still own simulation tuning that has not yet been migrated. This is intentionally incremental rather than a destabilizing rewrite.

The registry is designed to grow toward:

- ID, name, category, cost, key and description
- placement/infrastructure rules
- render key
- destination roles
- service type, radius and capacity
- upgrade definitions
- default persistent state

## Civic service framework

`src/simulation/civic-services.js` provides a generic service-provider layer. Reserved service IDs are `education`, `safety`, `healthcare`, `fireProtection`, `recreation`, `employment`, `transit` and `sanitation`; only **education** is implemented for players on this branch.

Education uses cached deterministic household assignments. Rebuilds are invalidated when providers, homes or household population change rather than scanning the city every rendered frame. The current 44×44 map remains unchanged.

### School 2.0 defaults

- coverage radius: 5 tiles (Chebyshev/isometric-square reach, matching Meadowline's existing local-effect convention)
- capacity: 28 student-demand units
- demand: half of current household population, rounded up
- provider choice: deterministic nearest eligible School with capacity-aware fallback
- overload: demand can exceed capacity; served count never can
- education scale: 0–100
- education progression: gradual, approximately 0.04 points per simulation second at full service
- loss of coverage: education already earned remains; future growth pauses
- School level: persisted as an upgrade-ready `state.level` field; no player upgrade UI exists yet

The previous School mood effect and +2 covered-home resident-capacity perk are preserved for compatibility, but Education is now the real civic-service state.

## Household Education API

Future systems can consume:

- `getEducationLevel(house)`
- `getEducationFactor(house)`
- `getCityEducationAverage()`
- `educationAssignment(house)`
- `educationProvider(house)`
- `evaluateUpgradeReadiness(house)`

Housing 2.0 can build on the existing upgrade-readiness structure without exposing fake Safety or Healthcare requirements to normal players.

## Visible feedback

When placing a School, covered homes that would gain useful service receive restrained isometric benefit markers:

- green: strong useful capacity
- yellow: useful coverage with capacity pressure
- no marker: no meaningful new benefit

The normal Look panel now explains household Education, assigned School, capacity, coverage and progress state. Inspecting a School shows demand, served count, capacity, utilization, homes served, radius and overload state. The Ledger includes citywide Education and student-service totals.

A restrained share of morning pedestrian routines from served homes will choose their assigned School, keeping visible citizens as a lightweight representation rather than persistent per-child agents.

## Save Schema V3

Current key: `meadowline.v3`

V3 stores buildings as extensible objects rather than relying only on positional arrays. Example:

```json
{"type":"school","x":12,"y":9,"state":{"level":1}}
```

Household Education is stored in house `state.education`. V1 and V2 positional building arrays are still accepted and receive safe defaults. Unknown building types, malformed optional state and invalid coordinates are skipped defensively instead of wiping the save.

The world remains deterministically regenerated from the saved seed; coins, day/dayT, woodland mask, wishes, milestone state, chronicle and history continue to be carried where supported.

## State ownership

The compact `S` object remains in place. New expansion goes into explicit domains instead of dozens of unrelated root fields:

- `S.services` — runtime service cache, assignments and metrics
- `S.diagnostics` — opt-in developer measurements

Future migrations may group additional world/city/population/transport/weather/UI state, but this branch deliberately avoids a risky wholesale state rewrite.

## Mobile pointer arbitration

A build tap is now pending until pointerup. A second finger cancels the pending placement before pinch/zoom begins. Paint tools (`road`, `rail`, `tree`, `remove`) still draw while dragged; their start tile is committed when the gesture becomes a paint drag.

This removes the previous first-finger-down accidental building placement during two-finger gestures without adding an artificial timer.

## Developer diagnostics

Open with:

`?debug=1`

The developer-only overlay reports FPS, frame time, simulation time, render time, grid size, approximate render/visible counts, citizens, trains, boats, Education providers, service rebuild count and current save payload size. Normal players do not see the overlay.

## Running locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Regression page:

`http://localhost:8000/tests/regression.html`

UI/layout pages remain under `tests/`.

Static module hygiene:

```bash
node tests/module-hygiene.mjs
```

## Testing on a phone over LAN

1. Put the phone and development computer on the same Wi-Fi network.
2. Serve Meadowline from the repository root with a LAN-bindable static server, for example `python3 -m http.server 8000 --bind 0.0.0.0`.
3. Find the computer's LAN IPv4 address.
4. On the phone, open `http://<computer-lan-ip>:8000/`.
5. For diagnostics, add `?debug=1`.

## Major-building mini-ecosystem standard

Every future major building should answer:

1. What service does it provide?
2. Who uses it?
3. What does it consume?
4. What does it produce?
5. What limits it?
6. What can be upgraded?
7. Which systems influence it?
8. Which systems does it influence?
9. What visible citizen behavior does it create?
10. What pressure state can occur?

School 2.0 is the reference implementation: Education; households/students; finite capacity; gradual Education progress; radius/capacity limits; future upgrades; population demand; future employment/crime/prosperity/housing hooks; morning attendance; overload pressure.

## Intentionally not implemented

Crime, Police, Jail, Fire, Healthcare, sickness, medicine, viruses, medical research, employment, household income, full Housing 2.0, land unlocks, map enlargement, traffic, A* replacement, chunk rendering and giant NPC counts remain future work.
