# Meadowline Living City Foundation — Physical iPhone Acceptance

Branch: `feature/living-city-foundation`

This checklist is the final owner gate. Automated/browser validation does **not** replace physical-device approval.

## Existing game

- [ ] Game loads successfully; no white page.
- [ ] Pan works smoothly.
- [ ] Pinch zoom works smoothly.
- [ ] Roads place and paint-drag correctly.
- [ ] Rails place and paint-drag correctly.
- [ ] Buildings place correctly.
- [ ] Trees paint correctly.
- [ ] Remove works and refunds correctly.
- [ ] Seasons still change.
- [ ] Weather still renders and changes.
- [ ] Citizens move and route.
- [ ] Trains move and route.
- [ ] Boats still work where applicable.
- [ ] Save/reload preserves the city.

## School 2.0

- [ ] Select School from Homes.
- [ ] Moving the School ghost shows restrained benefit markers on affected homes.
- [ ] Green markers are readable on a portrait phone.
- [ ] Yellow capacity-pressure markers are distinguishable from green.
- [ ] The overlay does not obscure the city or controls.
- [ ] Place a School successfully.
- [ ] Inspect the School with Look.
- [ ] School shows students served/capacity, demand, utilization, homes served and status.
- [ ] Inspect a covered occupied house.
- [ ] House shows Education level/tier, School, coverage, School capacity and progress status.
- [ ] Education rises gradually while the household is served.
- [ ] Removing School coverage does not erase Education already earned.
- [ ] Build enough nearby occupied homes to exceed 28 demand and confirm the School reports overload without exceeding capacity.
- [ ] A second School can relieve nearby capacity pressure.
- [ ] Morning pedestrians occasionally route toward an assigned School without creating excessive NPC load.

## Touch arbitration

- [ ] Single tap with a building tool places exactly one building on release.
- [ ] With School selected, place one finger then add a second finger for pinch: no School is accidentally placed.
- [ ] Two-finger pinch zoom remains responsive.
- [ ] Two-finger pan does not place a building.
- [ ] Road paint-drag still begins at the intended start tile.
- [ ] Rail paint-drag still begins at the intended start tile.
- [ ] Tree paint-drag still begins at the intended start tile.
- [ ] Remove paint-drag still works.

## Mobile layout

- [ ] Look panel fits approximately 390–430 CSS px wide without clipping.
- [ ] School inspection remains readable without horizontal scrolling.
- [ ] House Education section remains readable without covering essential controls.
- [ ] Ledger Education metrics fit the portrait layout.
- [ ] Placement markers remain visible at practical zoom levels.

## Performance

- [ ] Normal play has no obvious new stutter.
- [ ] Repeated School placement/removal does not progressively degrade responsiveness.
- [ ] Larger occupied neighborhoods do not make pinch/pan visibly hitch.
- [ ] `?debug=1` shows developer diagnostics.
- [ ] Diagnostics are absent without `?debug=1`.
- [ ] FPS/frame/render/simulation figures remain reasonably stable during a several-minute test.

## Save V3

- [ ] Existing older Meadowline save opens rather than resetting.
- [ ] Existing buildings remain.
- [ ] Population remains.
- [ ] Coins remain.
- [ ] Day/season state remains plausible.
- [ ] After Education has increased, reload and confirm the Education level persists.
- [ ] School state survives reload.

## Acceptance result

- [ ] **APPROVED ON PHYSICAL IPHONE**

Do not merge solely because automated tests pass. Mark the milestone fully validated only after the owner completes this checklist on the target device.
