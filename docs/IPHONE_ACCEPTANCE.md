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

Housing 2.0 is on `main`; these remain historical/uncompleted physical regression checks unless directly observed later:

- [ ] Cottage / Town Home / Established Home silhouettes remain readable.
- [ ] House Look remains scrollable/readable.
- [ ] resident capacity matches tier.
- [ ] Mood / Education / Desirability explanations remain intact.
- [ ] residential progress advances under good conditions and pauses rather than resets.
- [ ] grandfathered residents are not evicted.
- [ ] denser Housing increases School demand.
- [ ] green School coverage still matches the real service region.

# City Growth 1.0 first physical pass — HISTORICAL NEEDS-REFINEMENT EVIDENCE

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

These failures are intentionally preserved as architectural history.

# City Growth 1.1 first physical UI retest — HISTORICAL NEEDS-REFINEMENT EVIDENCE

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

# City Growth 1.1 later physical iPad evidence — POSITIVE

A later owner iPad session on August 23, 2026 reported the refined build as **“Everything is looking great!”**

Directly visible in the supplied physical-device screenshot:

- [x] City Growth 1.1 loads/renders during a developed Day 14 city.
- [x] the city has progressed to **Growing Town** on physical iPad.
- [x] the city is supporting 92 citizens in a visibly dense residential layout.
- [x] `Town Goals` shows a coherent primary `NEXT STEP` (`Open another development parcel`).
- [x] the optional goal shown (`Plant 38 trees`) is stage-appropriate and not premature Train/Boat noise.
- [x] the compact bottom command bar is visible without an obvious floating `Look` strip covering it.
- [x] the map remains visually dominant despite Town Goals, minimap, HUD, corner controls, parcel boundaries and command bar.
- [x] roads, lamps, pedestrians, homes, natural trees and parcel boundaries remain readable together at practical iPad zoom.

This was strong physical evidence for presentation/progression coherence. It did **not** automatically prove every gesture, Save V3 migration, School Level 2, iPhone portrait, or long-session item below.

## City Growth 1.1 historical remaining checks

These boxes remain intentionally unchecked because they were not individually proven, even though the owner later explicitly approved PR #4 for merge.

### Guided Development / Town Goals

- [x] panel is clearly labeled `Town Goals`.
- [x] one primary `NEXT STEP` is easy to distinguish from one `OPTIONAL` goal in the supplied iPad screenshot.
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

### Safe touch navigation

With House selected:

- [ ] single tap places exactly one House.
- [ ] House remains selected after successful placement.
- [ ] immediate one-finger drag pans and places nothing.
- [ ] explicit `×` cancels House.

With School selected:

- [ ] single tap places exactly one legal School.
- [ ] School remains selected until cancelled/replaced.
- [ ] drag pans and never places a School.
- [ ] pinch never places a School.

With Road selected:

- [ ] single tap places one road tile.
- [ ] immediate drag pans with no road painted.
- [ ] press/hold briefly then drag enters Road paint mode.
- [ ] release stops painting.
- [ ] hold threshold feels responsive.

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

### Active-tool / Build UI

- [x] bottom UI reads as a compact command bar rather than a permanently expanded catalog.
- [x] Build button is obvious in the latest iPad screenshot.
- [ ] Build opens/closes the category tray reliably during repeated use.
- [ ] Ways/Homes/Trade/Green categories remain understandable.
- [ ] locked tool labels show the appropriate city stage without overwhelming the tray.
- [ ] Move / Look / Remove remain easy to reach.
- [ ] selecting House does not auto-close the Build tray.
- [ ] selected tool is unmistakable.
- [ ] active build strip shows tool name and cost.
- [ ] active build strip explains `Tap to place · Drag to move` for normal buildings.
- [ ] active build strip explains `Tap once · Hold + drag to paint` for paint/removal tools.
- [ ] `✓` closes tray while keeping tool armed.
- [ ] `×` cancels tool and returns to navigation.
- [ ] Look does not display an obstructive active-tool strip.
- [ ] active build controls do not cover category/tool rows.
- [ ] UI gestures do not leak through to the map.

### iPad / iPhone layouts

- [x] latest iPad landscape screenshot shows HUD, Town Goals, corner controls, minimap and command bar without obvious severe collision.
- [x] extra iPad width is used without oversized controls.
- [x] map remains dominant.
- [ ] iPad portrait Build tray stays within safe width.
- [ ] iPad portrait active strip remains readable.
- [ ] iPad portrait panels remain scrollable.
- [ ] no important iPad control sits under the home gesture area.
- [ ] iPhone portrait has no horizontal page overflow.
- [ ] iPhone Build/mode controls remain comfortable touch size.
- [ ] iPhone categories remain readable.
- [ ] iPhone Town Goals remain readable.
- [ ] iPhone Growth/Look panels remain usable and scrollable.

### City Growth / School / Save / performance

- [ ] new city begins with Meadowline Center only.
- [x] locked terrain / parcel boundaries remain attractive/readable in latest iPad play.
- [ ] camera can freely pan across future land.
- [ ] locked normal building placement is clearly rejected.
- [ ] Road/Rail painting respects locked land.
- [ ] City Growth requirements update correctly.
- [ ] Settlement → Village requirements function.
- [ ] Village → Township `any 2 of 3` functions.
- [x] physical iPad play reached Growing Town.
- [ ] parcel purchase requires explicit confirmation.
- [ ] unlocked parcel becomes immediately buildable.
- [ ] terrain is not regenerated when opening land.
- [ ] parcel state persists after reload.
- [ ] School Level 1 remains 28 / radius 7.
- [ ] School Level 2 unavailable before Township.
- [ ] Township + 650 coins allows Level 2.
- [ ] School upgrade deducts exactly 650 once.
- [ ] School Level 2 capacity becomes 44 / radius remains 7.
- [ ] School assignments recompute and level survives reload.
- [ ] no School Level 3 exists.
- [ ] legacy city loads without white page.
- [ ] legacy whole map remains developable.
- [ ] legacy roads/rails/stations/trains/houses/population remain.
- [ ] legacy Schools/Education/Housing tiers/progress remain.
- [ ] legacy trade/Green buildings and tools remain.
- [ ] reload keeps `legacy-open`.
- [ ] inappropriate old Train/Boat Wish is safely replaced.
- [ ] drag/pan remains smooth.
- [ ] hold-to-paint has no obvious hitch.
- [ ] Town Goal updates do not stutter.
- [x] 92-citizen screenshot has no visible rendering failure.
- [ ] parcel unlock does not freeze.
- [ ] School Level 2 recomputation does not hitch badly.
- [ ] `?debug=1` remains usable.

## City Growth release record

PR #4 is **merged**. The owner explicitly approved the merge on August 23, 2026. Merge commit:

`1d9e7e9c110fad465b332ef85503d102ed5af6e0`

That merge decision is release history. It does not convert the unchecked historical boxes above into physical proof.

# CITY HALL 1.0 — PHYSICAL ACCEPTANCE

Branch: `feature/city-hall-civic-center`

**Current status: not physically accepted. Do not check any item below from CI/browser tests.**

## Building

- [ ] Town Office appears at the intended early stage.
- [ ] placement is clear and comfortable.
- [ ] building is visually recognizable as a civic centerpiece.
- [ ] only one City Hall may exist.
- [ ] removal asks for deliberate confirmation.
- [ ] removing City Hall leaves City Growth, parcels, Town Goals and population intact.
- [ ] removed City Hall can be rebuilt.

## Upgrades

- [ ] Level 2 / Village Hall unlocks at Village.
- [ ] Level 3 / Town Hall unlocks at Township.
- [ ] Level 4 / Meadowline City Hall unlocks at Growing Town.
- [ ] Level 2 costs 280 coins and deducts once.
- [ ] Level 3 costs 520 coins and deducts once.
- [ ] Level 4 costs 850 coins and deducts once.
- [ ] each visual change is obvious at practical zoom.
- [ ] level survives reload.
- [ ] no Level 5 is shown.
- [ ] city stage can progress without forcing the civic upgrade.

## City Overview

- [ ] stage is correct.
- [ ] population is correct.
- [ ] occupied/total home counts are correct.
- [ ] Cottage count is correct.
- [ ] Town Home count is correct.
- [ ] Established Home count is correct.
- [ ] Mood is understandable/correct.
- [ ] average Education is correct.
- [ ] average Desirability is correct.

## Town Goals

- [ ] `NEXT STEP` matches the authoritative Town Goal.
- [ ] `OPTIONAL` matches the authoritative Town Goal.
- [ ] progress values are correct.
- [ ] reward values are correct.
- [ ] Town Office goal appears only after the settlement has actually begun.
- [ ] Village Hall/Town Hall/City Hall goals wait for the correct stage.
- [ ] completed civic level does not generate an impossible duplicate upgrade goal.
- [ ] rewards pay once.

## City Growth

- [ ] City Hall displays the correct current stage.
- [ ] next-stage requirements match the City Growth panel/simulation.
- [ ] Growing Town does not show a fake fifth stage.
- [ ] opened parcel count is correct.
- [ ] available parcel list is correct.
- [ ] parcel purchase still requires explicit confirmation.
- [ ] parcel purchase from City Hall deducts the correct amount once.
- [ ] City Growth stage requirements remain unchanged.

## Finances

- [ ] treasury equals the actual coin total.
- [ ] residential tax line matches the real last payday.
- [ ] Trade line matches the real last payday.
- [ ] milling line matches the real last payday when present.
- [ ] Town grant/last payday totals match the real economy.
- [ ] before the first payday, no fake estimate is displayed.
- [ ] finances remain understandable rather than accounting-heavy.

## Services

- [ ] Education School count is correct.
- [ ] Expanded School count is correct.
- [ ] students served/demand/waiting are correct.
- [ ] average Education matches the city.
- [ ] no fake Recreation/Safety/Fire/Healthcare/Employment service meters appear.

## Touch / interaction shielding

With Town Office selected for building:

- [ ] single tap places exactly one.
- [ ] immediate drag pans and places nothing.
- [ ] pinch places nothing.
- [ ] tool behavior matches normal buildings.
- [ ] explicit × cancels.

Inspecting City Hall:

- [ ] Look opens the civic panel reliably.
- [ ] panel scrolling does not move the map.
- [ ] upgrade button does not leak a placement underneath.
- [ ] parcel buttons do not leak map input.
- [ ] closing the panel returns cleanly to map interaction.

## iPhone portrait

Around 390–430 CSS px:

- [ ] no horizontal overflow.
- [ ] readable title/stage/stat text.
- [ ] comfortable section spacing.
- [ ] Goals are readable.
- [ ] Growth requirements fit.
- [ ] parcel buttons fit.
- [ ] finances fit.
- [ ] upgrade button remains reachable.
- [ ] panel scroll is comfortable.
- [ ] no home-indicator collision.

## iPad

### Portrait

- [ ] panel is substantial without needlessly hiding the city.
- [ ] map remains dominant.
- [ ] City Hall silhouette is obvious in dense development.
- [ ] command bar does not collide with panel.
- [ ] parcel controls are comfortable.
- [ ] upgrade controls remain reachable.

### Landscape

- [ ] panel uses space cleanly without stretching absurdly wide.
- [ ] map remains visible/dominant.
- [ ] Growing Town remains readable.
- [ ] City Hall reads as a civic centerpiece.
- [ ] Town Goals / parcel / upgrade controls remain comfortable.

## Desktop

- [ ] mouse Look opens City Hall.
- [ ] panel scrolling works.
- [ ] upgrades work.
- [ ] parcel confirmations work.
- [ ] panel width remains sensible.
- [ ] keyboard shortcuts are unaffected.

## Save / migration

- [ ] new V3 city survives reload.
- [ ] current production City Growth V3 survives.
- [ ] pre-City-Hall V3 survives with no forced placement/coin deduction.
- [ ] legacy-open V3 survives.
- [ ] V2 migration survives.
- [ ] V1 migration survives.
- [ ] Housing remains.
- [ ] Education remains.
- [ ] City Growth stage/parcels remain.
- [ ] Town Goals remain coherent.
- [ ] School Level 2 remains.
- [ ] City Hall exists/position persists.
- [ ] City Hall level persists.
- [ ] malformed City Hall level repairs safely.
- [ ] duplicate malformed City Halls do not crash the save.

## Performance

- [ ] opening City Hall does not visibly hitch.
- [ ] closing City Hall returns immediately to smooth map play.
- [ ] 100+ citizen city remains smooth with City Hall present.
- [ ] City Hall closed state has no noticeable cost.
- [ ] live summary refresh is inexpensive.
- [ ] `?debug=1` City Hall counters remain usable.

# Automated validation — separate record

The City Hall branch workflow includes syntax, module hygiene, Living City/Housing regression, City Growth 1.0 regression, City Growth 1.1 Town Goal/touch regression, and City Hall 1.0 regression.

A green workflow may be recorded as **automatically validated** only. It must never check the City Hall physical boxes above.

# Current City Hall merge gate

City Hall may only be merged after:

- [ ] final candidate automation is green;
- [ ] City Hall building/uniqueness/removal are physically satisfactory;
- [ ] all four visual levels are physically understandable;
- [ ] City Hall citywide data matches real game state;
- [ ] parcel confirmation remains safe;
- [ ] finances are truthful;
- [ ] iPhone portrait is comfortable;
- [ ] iPad portrait/landscape are comfortable;
- [ ] current production/legacy Save V3 behavior is safe;
- [ ] no major Housing/Education/City Growth/safe-touch regression appears;
- [ ] owner explicitly approves the City Hall merge.
