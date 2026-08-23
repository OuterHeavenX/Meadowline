# Meadowline — Physical iPhone / iPad Acceptance

This is Meadowline's canonical owner-device acceptance record. CI/browser tests are **not** physical acceptance.

## Previously physically proven — Living City / School 2.0

Observed on an owner iPhone before production merge:

- [x] Meadowline loads/renders on mobile.
- [x] School Look is readable.
- [x] Level 1 School capacity remains bounded at 28/28.
- [x] Demand can exceed capacity without served count exceeding it.
- [x] `At capacity` and `Waiting for school space` states are understandable.
- [x] Household Education increases while served.
- [x] School service radius is 7 tiles.
- [x] Two-finger pinch with School selected does not accidentally build.
- [x] observed representative-pedestrian over-count was repaired.

## Production Housing 2.0 regression surface

Housing 2.0 is already on `main`; these remain regression checks during City Growth testing:

- [ ] Cottage / Town Home / Established Home silhouettes remain readable.
- [ ] House Look remains scrollable/readable.
- [ ] resident capacity matches tier.
- [ ] Mood / Education / Desirability explanations remain intact.
- [ ] residential progress advances under good conditions and pauses rather than resets.
- [ ] grandfathered residents are not evicted.
- [ ] denser Housing increases School demand.
- [ ] green School coverage still matches the real service region.

# City Growth 1.0 first physical pass — NEEDS REFINEMENT

Owner iPad test on August 23, 2026 produced useful but non-accepting evidence.

Physically observed:

- [x] City Growth branch loads and renders on iPad.
- [x] locked land remains visible.
- [x] locked-land build feedback can report `This land has not been opened yet.`
- [x] stage-based toolbar locking is visible.
- [x] city can grow population/Housing in the new progression build.

Acceptance problems physically observed:

- [x] **FAIL / NEEDS REFINEMENT:** early goal requested a Boat based on random world water even though maritime development was not a sensible current step.
- [x] **FAIL / NEEDS REFINEMENT:** Train goal appeared too early relative to meaningful city/transit progression.
- [x] **FAIL / NEEDS REFINEMENT:** with a build/paint tool selected, an intended map drag could accidentally build.
- [x] **FAIL / NEEDS REFINEMENT:** active build mode / bottom toolbar state was not clear enough for comfortable iPad play.

Those findings prevent City Growth 1.0 from being called physically accepted.

# City Growth 1.1 physical retest — PENDING

Branch: `feature/city-growth-progression`

PR #4 must remain unmerged until the checks below are satisfactory.

## 1. Guided Development / Town Goals

Start a genuinely new progression city.

- [ ] panel is now clearly labeled `Town Goals`.
- [ ] one primary `NEXT STEP` is easy to distinguish from one `OPTIONAL` goal.
- [ ] Settlement goals sensibly begin with roads/homes/population/neighborhood quality.
- [ ] Settlement never requests Train.
- [ ] Settlement never requests Boat.
- [ ] Settlement does not request locked School/Rail/Station/Dock tools.
- [ ] Village may begin guiding School/Education/Housing.
- [ ] Village still does not request Train/Boat.
- [ ] Township introduces Rail/Station only after they actually unlock.
- [ ] Train goal appears only after meaningful rail readiness.
- [ ] Growing Town Dock goal appears only when usable unlocked waterfront actually exists.
- [ ] Boat goal appears only after a Dock exists.
- [ ] landlocked/awkward random seeds use sensible fallback goals instead of impossible maritime goals.
- [ ] optional-goal randomness feels varied without feeling random/nonsensical.
- [ ] rewards help development but do not dominate the economy.

## 2. Safe touch navigation — critical

With House selected:

- [ ] single tap places exactly one House.
- [ ] immediate one-finger drag pans the map and places nothing.
- [ ] after successful one-off touch placement, interaction returns to neutral navigation.

With School selected:

- [ ] drag pans and never places a School.
- [ ] pinch never places a School.

With Road selected:

- [ ] single tap places one road tile.
- [ ] immediate drag pans with no road painted.
- [ ] press/hold briefly then drag clearly enters Road paint mode.
- [ ] release stops painting.
- [ ] hold threshold feels responsive rather than sluggish.

Repeat equivalent checks for:

- [ ] Rail after Township.
- [ ] Tree.
- [ ] Remove.

Destructive safety:

- [ ] immediate drag with Remove selected pans and erases nothing.
- [ ] intentional hold + drag removes tiles.

Pinch:

- [ ] second finger always cancels pending tap/paint intent.
- [ ] pinch + two-finger pan remain smooth.

## 3. Active-tool / Build UI re-haul

- [ ] bottom UI now reads as a compact command bar rather than a permanently expanded catalog.
- [ ] Build button is obvious and comfortably tappable.
- [ ] Build opens/closes the category tray reliably.
- [ ] Ways/Homes/Trade/Green categories remain understandable.
- [ ] locked tool labels show the appropriate city stage without overwhelming the tray.
- [ ] Move / Look / Remove remain easy to reach.
- [ ] selected tool is unmistakable.
- [ ] active-tool pill shows tool name and cost.
- [ ] active-tool pill explains `Tap to place · Drag to move` for one-off buildings.
- [ ] active-tool pill explains `Tap once · Hold + drag to paint` for paint/removal tools.
- [ ] Cancel is easy to hit and returns to navigation.
- [ ] build tray/active pill do not cover too much of the city.
- [ ] UI taps/drags do not leak through and build on the map underneath.

## 4. iPad layouts

### Landscape

- [ ] HUD, Town Goals, corner controls, minimap, build bar, active-tool pill, Look and Growth panels do not collide badly.
- [ ] extra width is used without making controls comically large.
- [ ] map remains dominant.

### Portrait

- [ ] Build tray stays within safe width.
- [ ] active-tool pill remains readable.
- [ ] panels remain scrollable.
- [ ] no important control sits under the home gesture area.

## 5. iPhone portrait

Around 390–430 CSS px:

- [ ] no horizontal page overflow.
- [ ] Build / mode controls remain ≥ comfortable touch size.
- [ ] build categories can be reached without tiny text.
- [ ] active-tool pill does not obscure critical city area.
- [ ] Town Goals remain readable.
- [ ] Growth/Look panels remain usable and scrollable.

## 6. City Growth 1.0 regression

- [ ] new city begins with Meadowline Center only.
- [ ] locked terrain remains attractive/visible.
- [ ] camera can freely pan across future land.
- [ ] locked normal building placement is rejected clearly.
- [ ] Road/Rail painting respects locked land.
- [ ] City Growth panel stage requirements update correctly.
- [ ] Settlement → Village requirements still function.
- [ ] Village → Township `any 2 of 3` still functions.
- [ ] Township → Growing Town still functions.
- [ ] parcel purchase requires explicit confirmation.
- [ ] unlocked parcel becomes immediately buildable.
- [ ] terrain is not regenerated when opening land.
- [ ] parcel state persists after reload.

## 7. School Level 2

- [ ] Level 1 remains 28 capacity / radius 7.
- [ ] upgrade unavailable before Township.
- [ ] Township + 650 coins allows Level 2.
- [ ] confirmation deducts exactly 650 once.
- [ ] capacity becomes 44.
- [ ] radius remains exactly 7.
- [ ] service assignments recompute.
- [ ] upgraded silhouette is visible at practical zoom.
- [ ] level survives reload.
- [ ] no Level 3 exists in this milestone.

## 8. Legacy-save safety — critical

Open a city created before City Growth:

- [ ] city loads without white page.
- [ ] entire map remains developable.
- [ ] roads/rails/stations/trains remain.
- [ ] houses/population remain.
- [ ] Schools/Education remain.
- [ ] Housing tiers/progress remain.
- [ ] trade/Green buildings remain.
- [ ] all previously available tools remain available.
- [ ] reload keeps `legacy-open` behavior.
- [ ] an old early Train/Boat Wish is safely replaced rather than crashing or persisting nonsensically.

## 9. Performance

- [ ] immediate drag/pan remains smooth.
- [ ] hold-to-paint does not cause obvious frame hitch.
- [ ] Town Goal updates do not stutter.
- [ ] locked-land overlay remains smooth.
- [ ] parcel unlock does not freeze.
- [ ] School Level 2 recomputation does not hitch badly.
- [ ] `?debug=1` remains usable.

# Automated validation — record separately

Current branch workflow is expected to run syntax, module hygiene, original Living City/Housing browser regression, City Growth 1.0 regression, and City Growth 1.1 goal/touch-policy regression.

Do **not** check any physical boxes merely because CI passes.

# Merge gate

PR #4 is eligible for a merge decision only after:

- [ ] current branch automation is green;
- [ ] early Boat/Train goal failures are physically confirmed repaired;
- [ ] one-finger drag is safe with build tools selected;
- [ ] hold-to-paint/remove is comfortable on real touch hardware;
- [ ] new UI is comfortable on iPad and iPhone;
- [ ] critical legacy-save checks pass;
- [ ] School Level 2 is physically verified;
- [ ] no major Housing/Education/parcel regression appears;
- [ ] owner explicitly approves merge.
