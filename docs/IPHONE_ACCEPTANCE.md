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

# City Growth 1.1 first physical UI retest — NEEDS REFINEMENT

Owner iPad retest on August 23, 2026 confirmed the new Town Goals presentation and safe-touch UI were loading, but exposed a second interaction problem:

- [x] **FAIL / NEEDS REFINEMENT:** after placing one normal structure, the build tool auto-cancelled to navigation, forcing repeated Build → category → structure selection for each additional House/School/etc.
- [x] **FAIL / NEEDS REFINEMENT:** selecting a structure collapsed the Build tray automatically instead of allowing the player to explicitly finish choosing.
- [x] **FAIL / NEEDS REFINEMENT:** the floating active `Look` strip overlapped and visually obstructed the open build catalog.

The follow-up refinement changed the intended behavior to:

- normal structure tools remain armed after successful placement;
- one-finger drag remains safe camera pan even while that structure tool stays armed;
- selecting a structure leaves the Build tray open;
- `✓` explicitly keeps the selected tool and closes the tray for map focus;
- `×` explicitly cancels the selected tool and returns to navigation;
- Look does not show an active-tool strip over the build menu;
- active build controls live inside the dock flow rather than floating over tool rows.

# City Growth 1.1 latest physical iPad evidence — POSITIVE

A later owner iPad session on August 23, 2026 reported the current refinement as **“Everything is looking great!”**

Directly visible in the supplied physical-device screenshot:

- [x] City Growth 1.1 still loads/renders during a developed Day 14 city.
- [x] the city has progressed to **Growing Town** on physical iPad.
- [x] the city is supporting 92 citizens in a visibly dense residential layout.
- [x] `Town Goals` shows a coherent primary `NEXT STEP` (`Open another development parcel`).
- [x] the optional goal shown (`Plant 38 trees`) is stage-appropriate and not premature Train/Boat noise.
- [x] the compact bottom command bar is visible without an obvious floating `Look` strip covering it.
- [x] the map remains visually dominant despite Town Goals, minimap, HUD, corner controls, parcel boundaries and the command bar.
- [x] roads, lamps, pedestrians, homes, natural trees and parcel boundaries remain readable together at practical iPad zoom.

This is strong positive physical evidence for presentation, progression coherence and the latest UI direction. It is **not** a substitute for directly exercising every gesture, Save V3 migration, School Level 2, iPhone portrait, or long-session checklist item below.

# City Growth 1.1 physical retest — REMAINING CHECKS

Branch: `feature/city-growth-progression`

PR #4 must remain unmerged until the checks below are satisfactory and the owner explicitly approves the merge.

## 1. Guided Development / Town Goals

Start a genuinely new progression city.

- [x] panel is now clearly labeled `Town Goals`.
- [x] one primary `NEXT STEP` is easy to distinguish from one `OPTIONAL` goal in the latest iPad screenshot.
- [ ] Settlement goals sensibly begin with roads/homes/population/neighborhood quality across multiple starts.
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
- [ ] optional-goal randomness feels varied without feeling random/nonsensical over longer play.
- [ ] rewards help development but do not dominate the economy.

## 2. Safe touch navigation — critical

With House selected:

- [ ] single tap places exactly one House.
- [ ] House remains selected after successful placement so several homes can be placed without reopening Build.
- [ ] immediate one-finger drag pans the map and places nothing even while House remains selected.
- [ ] explicit `×` cancels House and returns to neutral navigation.

With School selected:

- [ ] single tap places exactly one School when legal.
- [ ] School remains selected after successful placement until cancelled/replaced.
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

- [x] bottom UI reads as a compact command bar rather than a permanently expanded catalog.
- [x] Build button is obvious in the latest iPad screenshot.
- [ ] Build opens/closes the category tray reliably during repeated use.
- [ ] Ways/Homes/Trade/Green categories remain understandable.
- [ ] locked tool labels show the appropriate city stage without overwhelming the tray.
- [ ] Move / Look / Remove remain easy to reach.
- [ ] selecting House does **not** auto-close the Build tray.
- [ ] selected tool is unmistakable.
- [ ] active build strip shows tool name and cost.
- [ ] active build strip explains `Tap to place · Drag to move` for normal buildings.
- [ ] active build strip explains `Tap once · Hold + drag to paint` for paint/removal tools.
- [ ] `✓` closes the tray while keeping the selected build tool armed.
- [ ] `×` cancels the tool and returns to navigation.
- [ ] Look does not display an obstructive active-tool strip.
- [ ] active build controls stay inside the dock layout and do not cover category/tool rows.
- [ ] UI taps/drags do not leak through and build on the map underneath.

## 4. iPad layouts

### Landscape

- [x] latest screenshot shows HUD, Town Goals, corner controls, minimap and compact command bar coexisting without obvious severe collision.
- [x] extra width is used without making controls comically large.
- [x] map remains dominant.

### Portrait

- [ ] Build tray stays within safe width.
- [ ] active build strip remains readable.
- [ ] panels remain scrollable.
- [ ] no important control sits under the home gesture area.

## 5. iPhone portrait

Around 390–430 CSS px:

- [ ] no horizontal page overflow.
- [ ] Build / mode controls remain ≥ comfortable touch size.
- [ ] build categories can be reached without tiny text.
- [ ] active build controls do not obscure critical city area.
- [ ] Town Goals remain readable.
- [ ] Growth/Look panels remain usable and scrollable.

## 6. City Growth 1.0 regression

- [ ] new city begins with Meadowline Center only.
- [x] locked terrain / parcel boundaries remain attractive and readable in latest iPad play.
- [ ] camera can freely pan across future land.
- [ ] locked normal building placement is rejected clearly.
- [ ] Road/Rail painting respects locked land.
- [ ] City Growth panel stage requirements update correctly.
- [ ] Settlement → Village requirements still function.
- [ ] Village → Township `any 2 of 3` still functions.
- [x] physical iPad play has reached Growing Town, providing positive end-to-end evidence that stage progression can advance through the ladder.
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
- [x] latest developed-city screenshot shows the locked/parcel visualization still functioning at 92 citizens without a visible rendering failure.
- [ ] parcel unlock does not freeze.
- [ ] School Level 2 recomputation does not hitch badly.
- [ ] `?debug=1` remains usable.

# Automated validation — record separately

Current branch workflow runs syntax, module hygiene, original Living City/Housing browser regression, City Growth 1.0 regression, and City Growth 1.1 goal/touch-policy regression.

Do **not** check physical boxes merely because CI passes.

# Merge gate

PR #4 is eligible for a merge decision only after:

- [ ] current branch automation is green at the final candidate SHA;
- [ ] early Boat/Train goal failures are physically confirmed repaired across appropriate stages;
- [ ] one-finger drag is safe with build tools selected;
- [ ] repeated House/School placement is comfortable without repeated menu navigation;
- [ ] hold-to-paint/remove is comfortable on real touch hardware;
- [x] latest iPad presentation/UI direction is owner-approved as looking great;
- [ ] critical legacy-save checks pass;
- [ ] School Level 2 is physically verified;
- [ ] no major Housing/Education/parcel regression appears;
- [ ] owner explicitly approves merge.
