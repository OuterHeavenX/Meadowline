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

**Historical device-check status: the boxes below were not individually proven before the later owner-authorized production merge. Do not check them from CI/browser tests.**

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

# Automated validation — City Hall separate record

The City Hall branch workflow included syntax, module hygiene, Living City/Housing regression, City Growth 1.0 regression, City Growth 1.1 Town Goal/touch regression, and City Hall 1.0 regression.

A green workflow is automated proof only and does not check the City Hall physical boxes above.

# City Hall release record

City Hall PR #5 was later explicitly approved by the owner and merged to production at:

`fcf7f8c02291c7cd1bc2a164522353b7476e81ef`

Final City Hall candidate `283f3a174a9d0a0fbf226d10fb7d4bcabb76afdc` had Living City Validation #109 green before merge.

This release decision supersedes the old merge gate as a source-control state, but **does not convert any unchecked device box above into physical proof**.

# ROADS & MOBILITY 2.0 — HISTORICAL PHYSICAL ACCEPTANCE CHECKLIST

Branch: `feature/roads-mobility-2`

**Historical device-check status: the individual boxes below were not separately checked before the later owner-authorized production merge. Do not check them from CI/browser tests.**

## Visual Roads

- [ ] Roads clearly look like streets rather than pedestrian paths.
- [ ] vehicle carriageway is obvious.
- [ ] sidewalks/edges are readable.
- [ ] corners look natural.
- [ ] T-junctions look natural.
- [ ] four-way intersections look natural.
- [ ] bridges remain attractive.
- [ ] dense Roads do not become visual noise.

## Pedestrians

- [ ] pedestrians visually favor sidewalks.
- [ ] pedestrians no longer constantly march through the vehicle lane.
- [ ] sidewalk movement looks stable.
- [ ] pedestrians turn naturally.
- [ ] crossings look understandable.
- [ ] pedestrians do not visibly run through vehicles.

## Vehicles

- [ ] cars are readable at practical zoom.
- [ ] pickups are readable at practical zoom.
- [ ] delivery/service vans are readable at practical zoom.
- [ ] direction is obvious.
- [ ] motion is smooth.
- [ ] vehicles stay on Roads.
- [ ] vehicles do not drive through buildings.
- [ ] vehicles do not drive through water.
- [ ] vehicles do not visibly stack badly.
- [ ] vehicle density feels alive but calm.
- [ ] vehicles do not dominate the city.

## Intersections

- [ ] straight movement looks natural.
- [ ] left/right turns look believable.
- [ ] T-junction movement remains understandable.
- [ ] four-way intersections do not produce obvious chaos.
- [ ] dead ends do not trap cars forever.
- [ ] crosswalk markings remain readable without visual clutter.

## Rail Crossings

- [ ] Road can intentionally cross Rail.
- [ ] only clean crossing geometry converts automatically.
- [ ] invalid/parallel geometry fails safely.
- [ ] crossing appears automatically when expected.
- [ ] train remains functional.
- [ ] Road remains functional.
- [ ] car waits for train.
- [ ] car continues after train.
- [ ] pedestrians behave safely enough around the train.
- [ ] crossing visual is understandable.
- [ ] first Remove on crossing leaves the original base network.
- [ ] second Remove can remove that base normally.

## Safe Touch

With Road selected:

- [ ] quick tap places one Road tile.
- [ ] immediate drag pans and places no Road.
- [ ] hold + drag paints Road.
- [ ] release stops painting.
- [ ] pinch paints nothing.

Road/Rail crossing creation:

- [ ] intentional held Road paint across Rail creates a crossing.
- [ ] camera pan across Rail does not create a crossing.
- [ ] pinch across Rail does not create a crossing.
- [ ] locked parcel prevents crossing creation.

Repeat relevant checks with Rail selected after Township.

## iPhone portrait

Around 390–430 CSS px:

- [ ] street details remain readable.
- [ ] carriageway/sidewalk distinction remains clear.
- [ ] controls remain comfortable.
- [ ] no horizontal overflow.
- [ ] map remains dominant.
- [ ] vehicles remain readable without being oversized.
- [ ] crossing symbols remain readable.
- [ ] performance remains smooth.

## iPad portrait

- [ ] streets read clearly.
- [ ] sidewalks are visible.
- [ ] vehicles feel appropriately scaled.
- [ ] dense districts remain legible.
- [ ] Build UI remains comfortable.
- [ ] City Hall Mobility summary remains readable.

## iPad landscape

- [ ] developed city looks like a connected street network.
- [ ] map remains dominant.
- [ ] vehicles enhance rather than clutter.
- [ ] Rail crossings are easy to identify.
- [ ] City Hall still reads as civic centerpiece.

## Save / migration

- [ ] existing production city loads unchanged structurally.
- [ ] old Roads remain in their original positions.
- [ ] no money is deducted for visual Road evolution.
- [ ] Rail remains.
- [ ] crossing state survives reload.
- [ ] Housing remains.
- [ ] Education remains.
- [ ] City Growth stage/parcels remain.
- [ ] Town Goals remain coherent.
- [ ] City Hall remains and keeps its level.
- [ ] legacy-open V3 remains usable.
- [ ] V2 migration remains usable.
- [ ] V1 migration remains usable.
- [ ] active ambient vehicle positions are safely regenerated rather than required from save.

## Housing / City Growth regression

- [ ] House linked state behaves the same.
- [ ] Cottage/Town Home/Established Home requirements behave the same.
- [ ] population is not lost because Road visuals changed.
- [ ] residential upgrade progress is not reset by loading Roads 2.0.
- [ ] Settlement → Village still recognizes one Road tile as one Road.
- [ ] sidewalk/carriageway visual sub-elements do not inflate Road count.
- [ ] a Road/Rail crossing counts exactly once as a Road for progression.

## City Hall

- [ ] City Hall placement/upgrades still work.
- [ ] Overview/Goals/Growth/Land/Finances/Education remain usable.
- [ ] Mobility shows real Road tile count.
- [ ] Mobility shows real Road component count.
- [ ] Mobility shows real Rail crossing count.
- [ ] Mobility shows real active representative vehicle count.
- [ ] no fake Traffic Health/congestion meter appears.

## Performance

- [ ] 100+ citizen city remains smooth.
- [ ] representative vehicles do not cause visible hitching.
- [ ] roughly 10–12 visible vehicles remain comfortable when the cap allows them.
- [ ] road painting remains responsive.
- [ ] removing Road does not freeze.
- [ ] creating a Rail crossing does not freeze.
- [ ] train + vehicles together remain smooth.
- [ ] long session does not continuously accumulate vehicles.
- [ ] `?debug=1` remains usable with Mobility counters.

# Roads & Mobility automated validation — separate record

The feature workflow includes syntax, module hygiene, Living City/Housing regression, City Growth 1.0 regression, City Growth 1.1 Town Goal/touch regression, City Hall 1.0 regression and Roads & Mobility 2.0 regression.

Final exact Roads head `0c748bc819deaecba7ced391628643ee3afeffd6` passed Living City Validation #118 before production merge.

A green workflow is automated proof only. It does not check the individual physical boxes above.

# Roads & Mobility release record

PR #6 was explicitly approved by the owner on August 24, 2026 and merged to production `main` at:

`6ed2225ba008a91610715c63aca44e4cd02486bb`

That owner authorization is the source-control release decision required before Recreation 2.0 could begin. It does **not** retroactively convert the unchecked Roads device boxes above into individual physical observations.

# RECREATION 2.0 / TOWN LIFE — PHYSICAL ACCEPTANCE

Branch: `feature/recreation-2-town-life`

Draft PR: #7

**Current status: pending physical acceptance. Do not check any item below from CI/browser tests.**

## Visual facilities

- [ ] Pocket Green preserves the familiar small 1×1 historical Park presence.
- [ ] Pocket Park reads as a real small public space rather than four repeated tiles.
- [ ] Playground is immediately recognizable at practical phone zoom.
- [ ] Picnic Green is visually distinct from Pocket Park and Town Park.
- [ ] Sports Court is immediately readable as a court.
- [ ] Town Park reads as one coherent large facility.
- [ ] large facilities have no obvious repeated-tile seams.
- [ ] large footprints feel appropriately larger than Houses.
- [ ] paths, lawns, trees, benches and landmarks remain readable without visual clutter.
- [ ] Town Park fountain/gathering area reads as a public-space anchor.
- [ ] seasonal changes remain coherent inside Recreation facilities.
- [ ] Recreation remains readable at night without a separate lighting style fighting the city.

## Multi-tile placement

- [ ] complete footprint preview is obvious before placement.
- [ ] Pocket Park 2×2 footprint is easy to understand.
- [ ] Playground 2×2 footprint is easy to understand.
- [ ] Picnic Green 3×3 footprint is easy to understand.
- [ ] Sports Court 2×3 footprint is easy to understand.
- [ ] Town Park 4×4 footprint is easy to understand.
- [ ] legal placement feels comfortable.
- [ ] occupied/blocked placement feedback is understandable.
- [ ] locked parcel tile blocks the entire facility clearly.
- [ ] world-edge placement fails clearly.
- [ ] invalid terrain placement fails clearly.
- [ ] player understands how much land the selected facility consumes.
- [ ] no accidental partial placement occurs.
- [ ] one successful placement deducts exactly one facility cost.
- [ ] no visual child/segment implementation leaks into the map or UI.

## Multi-tile Look / removal

- [ ] Look on the facility anchor opens the facility.
- [ ] Look on every child footprint tile opens the same facility.
- [ ] no `facilityPart`, segment, or child-tile wording appears to the player.
- [ ] Remove on a child tile clearly identifies/removes the whole facility.
- [ ] large-facility removal confirmation is understandable.
- [ ] refund occurs once for the complete facility.
- [ ] no orphan footprint marker remains visibly after removal.
- [ ] unrelated Roads/buildings remain intact after facility removal.

## Road / sidewalk access

- [ ] facility entrance visibly meets a logical street/sidewalk edge.
- [ ] one valid Road connection is enough for the facility.
- [ ] Roads are not required around all four sides.
- [ ] a facility with no Road perimeter connection reads as disconnected.
- [ ] citizens approach via existing sidewalk-biased Road movement.
- [ ] pedestrians do not constantly cut across the vehicle carriageway to enter Parks.
- [ ] Cars remain visually separate from Park visitors.
- [ ] Rail crossings and train priority remain understandable near Recreation trips.

## Pedestrian Town Life

- [ ] residents visibly take occasional Recreation trips rather than constantly visiting.
- [ ] residents walk along streets toward real Recreation facilities.
- [ ] residents enter larger facilities naturally from the entrance.
- [ ] visitors visibly occupy internal Recreation space rather than disappearing at the curb.
- [ ] Pocket Park visitor count feels appropriately small.
- [ ] Town Park can visibly contain more people without looking crowded or chaotic.
- [ ] visitors spread reasonably across larger facilities.
- [ ] visitors do not stack badly into one single point.
- [ ] visitor idle/leisure duration feels calm.
- [ ] people eventually leave the facility.
- [ ] visitors do not accumulate permanently over a long session.
- [ ] removing a facility with visitors does not crash or strand invisible citizens.
- [ ] removing/changing Roads during a trip resolves safely.
- [ ] facilities feel alive rather than merely decorative.

## Recreation service

- [ ] low-population town creates low Recreation demand.
- [ ] population growth creates visibly/understandably greater Recreation demand.
- [ ] denser Housing increases demand through real residents rather than representative actor count.
- [ ] Pocket Green capacity feels small.
- [ ] Pocket Park capacity feels small but useful.
- [ ] Playground capacity feels larger than a tiny green.
- [ ] Picnic Green provides meaningful neighborhood capacity.
- [ ] Sports Court provides meaningful Township-scale capacity.
- [ ] Town Park meaningfully serves more residents than small facilities.
- [ ] one tiny Park cannot satisfy an entire Growing Town.
- [ ] adding Recreation improves service when eligible demand exists.
- [ ] removing Recreation lowers service/capacity coherently.
- [ ] disconnected Recreation does not magically serve nearby homes.
- [ ] adding a valid Road connection can make the service available.
- [ ] capacity/demand/underserved relationships feel believable.
- [ ] Recreation helps Mood/Desirability without instantly maxing neighborhood quality.

## House Look

- [ ] Recreation line/block is concise.
- [ ] semantic status such as Good / Limited / No Recreation access is understandable.
- [ ] residents served / demand is plausible.
- [ ] nearby serving facility explanation makes sense.
- [ ] crowded/limited status makes sense when capacity is constrained.
- [ ] disconnected/no-access explanation makes sense.
- [ ] House Look remains scrollable/readable on phone.
- [ ] Education/Housing/Desirability information remains intact.

## Facility Look

- [ ] facility name is correct from any footprint tile.
- [ ] footprint is readable.
- [ ] capacity is readable.
- [ ] residents served is readable.
- [ ] nearby demand is readable.
- [ ] visitors-now value looks plausible and counts people actually inside the space.
- [ ] street access / entrance status is understandable.
- [ ] crowded/underserved status is understandable.
- [ ] legacy Pocket Green explanation is coherent for an old Park.
- [ ] no child-tile implementation detail appears.

## City Hall

- [ ] Recreation section appears.
- [ ] Recreation facility count matches the city.
- [ ] residents served / demand values look plausible.
- [ ] available capacity looks plausible.
- [ ] underserved count looks plausible.
- [ ] visitors-now count looks plausible.
- [ ] no fake Recreation Health percentage appears.
- [ ] Overview remains intact.
- [ ] Town Goals remain intact.
- [ ] Growth remains intact.
- [ ] Land remains intact.
- [ ] Finances remain intact.
- [ ] Education remains intact.
- [ ] Mobility remains intact.
- [ ] no fake Safety/Fire/Healthcare/Employment meters appear.

## Town Goals

- [ ] first Recreation goal appears only after a real settlement/neighborhood exists.
- [ ] early city does not demand an oversized facility merely because it unlocked.
- [ ] Village may request more Recreation access only when real demand is underserved.
- [ ] Township may request more capacity when real demand warrants it.
- [ ] Growing Town can be encouraged toward Town Park when substantial demand warrants it.
- [ ] a city with adequate Recreation does not spam duplicate Park goals.
- [ ] Recreation rewards remain modest development help rather than dominant income.
- [ ] historical Train/Boat gating remains coherent.

## Safe touch

With a multi-tile normal Recreation facility selected:

- [ ] tap a legal anchor → exactly one complete facility is placed.
- [ ] selected normal facility tool remains armed after successful placement.
- [ ] immediate one-finger drag → camera pans and places nothing.
- [ ] second pointer / pinch → places nothing.
- [ ] UI scrolling → places nothing underneath.
- [ ] invalid full footprint → nothing is partially placed.
- [ ] invalid placement gives clear feedback.
- [ ] explicit `×` cancels the tool.
- [ ] footprint preview remains visible/readable while deciding where to build.

## iPhone portrait

Around 390–430 CSS px:

- [ ] no horizontal page overflow.
- [ ] Recreation category fits comfortably in Build UI.
- [ ] facility cards show name/cost/footprint without becoming too dense.
- [ ] complete footprint preview is readable.
- [ ] large facility does not disappear behind the UI during placement.
- [ ] active tool strip remains readable.
- [ ] Look panels scroll comfortably.
- [ ] City Hall Recreation section scrolls comfortably.
- [ ] map remains visually dominant.
- [ ] internal Park details remain readable.
- [ ] representative visitors are not too tiny.
- [ ] representative visitors are not oversized.
- [ ] Roads/cars/sidewalks/public space remain visually distinct together.
- [ ] Town Park remains understandable at practical portrait zoom.

## iPad portrait

- [ ] multi-tile placement is easy to understand.
- [ ] Pocket/medium/large Recreation scale differences are obvious.
- [ ] Town Park scale feels appropriate to the 44×44 city.
- [ ] Build UI remains comfortable.
- [ ] House/facility Look remain readable and scrollable.
- [ ] dense city plus large Recreation remains legible.
- [ ] map remains dominant.
- [ ] visitors remain readable without becoming oversized.

## iPad landscape

- [ ] larger neighborhoods visibly benefit from public-space anchors.
- [ ] Town Park feels like part of actual city planning rather than a repeated decoration.
- [ ] city remains map-dominant.
- [ ] Roads + sidewalks + vehicles + Parks + buildings feel cohesive.
- [ ] large public spaces improve visual neighborhood structure.
- [ ] facility entrances are easy to identify.
- [ ] Town Park visitors and nearby cars can coexist without visual chaos.
- [ ] City Hall remains a civic centerpiece alongside major public spaces.

## Save / migration

- [ ] current Roads-inclusive production city loads.
- [ ] old 1×1 Parks remain exactly where they were.
- [ ] old Parks do not auto-expand into neighboring property.
- [ ] old Parks provide coherent small Recreation capacity.
- [ ] existing money remains unchanged by Recreation migration.
- [ ] no forced Recreation construction occurs.
- [ ] Roads remain.
- [ ] Road water bridges remain.
- [ ] Rail remains.
- [ ] Road/Rail crossing state remains.
- [ ] Housing remains.
- [ ] residents remain.
- [ ] residential tier/progress remains.
- [ ] Education remains.
- [ ] School Level 2 remains.
- [ ] City Growth stage/parcels remain.
- [ ] Town Goals remain coherent.
- [ ] City Hall remains and keeps its level.
- [ ] new multi-tile facility survives reload.
- [ ] full footprint reconstructs after reload.
- [ ] no duplicate child facilities appear after reload.
- [ ] legacy-open V3 remains usable.
- [ ] V2 migration remains usable.
- [ ] V1 migration remains usable.
- [ ] malformed/overlapping multi-tile facility data fails safely rather than white-screening.

## Performance

- [ ] 100+ citizen city remains smooth.
- [ ] representative vehicles remain smooth alongside Recreation visitors.
- [ ] Rail/trains remain smooth alongside Recreation visitors.
- [ ] several large Recreation facilities remain smooth.
- [ ] active Park visitors do not cause obvious hitching.
- [ ] large facility rendering remains smooth.
- [ ] large facility placement/removal does not visibly freeze.
- [ ] Recreation recompute does not visibly stutter.
- [ ] Road changes near Recreation do not produce route-search storms.
- [ ] long session does not continuously accumulate visitors.
- [ ] `?debug=1` remains usable with Recreation + Mobility counters.

# Recreation 2.0 automated validation — separate record

The feature workflow includes JavaScript syntax, module hygiene, Living City/Housing regression, City Growth 1.0 regression, City Growth 1.1 Town Goal/touch regression, City Hall 1.0 regression, Roads & Mobility 2.0 regression and Recreation 2.0 / Town Life regression.

A green workflow is **automated proof only**. It must never check the physical boxes above.

# Recreation 2.0 merge gate

Recreation 2.0 may only be merged after:

- [ ] final exact-head automation is green;
- [ ] old Park/save compatibility is physically satisfactory;
- [ ] multi-tile placement/removal/Look is physically understandable;
- [ ] public-space silhouettes are readable on owner hardware;
- [ ] Road/sidewalk entrances are understandable;
- [ ] pedestrians visibly reach/use/leave Recreation naturally;
- [ ] House/facility/City Hall Recreation explanations are satisfactory;
- [ ] safe touch remains trustworthy with large facilities;
- [ ] existing Housing/Education/City Growth/City Hall/Roads/Rail behavior shows no major regression;
- [ ] 100+ citizen + vehicles + Rail + Recreation performance is acceptable;
- [ ] owner explicitly approves the Recreation merge.
# LIVING CITY 3.0 / AAA MUNICIPAL PASS — PHYSICAL ACCEPTANCE

These checks are owner/device work. CI must not check them.

## Tutorial

- [ ] New player understands Road placement, Houses, income and Recreation
- [ ] Tutorial fits iPhone portrait and never traps the player
- [ ] Skip and resume work

## Graphics and performance

- [ ] City looks substantially more polished than Recreation 2.0
- [ ] Buildings feel grounded; Roads, sidewalks, trees and water remain clear
- [ ] Night, windows and rain look attractive at phone zoom
- [ ] Early and 100+ population cities remain smooth
- [ ] Heavy rain, night and emergency response remain smooth
- [ ] No long-session degradation or unreasonable phone heat

## Feedback and upgrades

- [ ] Payment and mood popups are readable, restrained and expire cleanly
- [ ] House, School and City Hall upgrades feel satisfying once implemented in play
- [ ] City stage advancement feels meaningful

## Water

- [ ] Water tool is obvious and paints intentionally
- [ ] Pan and pinch never paint water
- [ ] Buildings cannot be flooded accidentally
- [ ] Player pond looks natural and persists after reload

## Police, Fire and Healthcare

- [ ] Each facility and vehicle is recognizable
- [ ] Crime, Fire and sickness events are understandable and charming
- [ ] Road routes and response outcomes are believable
- [ ] Emergency lights are tasteful
- [ ] Ordinary incidents do not punish the city unfairly

## Employment and City Hall

- [ ] Jobs, unemployment and Prosperity explanations are understandable
- [ ] Education, Recreation, Mobility, Safety, Fire, Healthcare and Employment are truthful
- [ ] No fake future metrics appear; City Hall remains usable on iPhone

## Device layouts

- [ ] 390–430 CSS px: Build tray, tutorial, popups and scrolling panels are comfortable; no horizontal overflow
- [ ] iPad portrait: city, water, parks, coverage and City Hall remain legible
- [ ] iPad landscape: city feels map-dominant, alive and visually deep
- [ ] Desktop: mouse, keyboard, wheel zoom, high DPI and large canvas remain functional

## Save

- [ ] Existing city loads with Roads, Rail, crossings, Housing, Education, Recreation, City Hall, parcels and money intact
- [ ] No Police, Fire or Healthcare facility is auto-placed or auto-charged
- [ ] Player-created water persists

# LIVING CITY 3.1 / AAA VISUAL COMPLETION — PHYSICAL ACCEPTANCE

These checks are owner/device work. CI must not check them.

## Renderer

- [ ] GPU renderer initializes on iPhone
- [ ] Fallback works if forced
- [ ] Renderer switch does not lose city
- [ ] No black canvas or severe texture corruption
- [ ] Orientation change is safe

## Visual quality

- [ ] City looks substantially more premium
- [ ] Buildings have depth; Roads look polished; water looks natural
- [ ] Shadows improve the scene and trees feel dimensional
- [ ] Town Park looks excellent and municipal facilities are recognizable
- [ ] Night and rain are visually impressive
- [ ] Visual clutter remains controlled

## Upgrades and feedback

- [ ] Cottage → Town Home is satisfying
- [ ] Town Home → Established Home is satisfying
- [ ] School and City Hall upgrades are satisfying
- [ ] Effects are not spammy
- [ ] Tax/coin, happy and sad feedback is readable and fades correctly
- [ ] No popup accumulation

## Police

- [ ] Robber is visible
- [ ] Cruiser dispatch, arrival, arrest and return are clear
- [ ] Emergency lights are tasteful

## Fire

- [ ] Fire and smoke are readable
- [ ] Engine route and arrival are believable
- [ ] Water spray is readable; extinguish feels complete; engine returns

## Healthcare

- [ ] Sick state is understandable
- [ ] Ambulance dispatch and patient interaction are clear
- [ ] Treatment/recovery is understandable; ambulance returns

## Audio

- [ ] Ambience and rain sound pleasant
- [ ] Sirens are restrained
- [ ] Upgrade sound is pleasant
- [ ] Mute works and no audio continues incorrectly

## Performance

- [ ] Early and 100+ population cities are smooth
- [ ] Rain, night and simultaneous incidents are smooth
- [ ] No obvious thermal runaway or long-session degradation

## Safe touch

- [ ] Road and Water painting are safe
- [ ] Pan, pinch and Build tray interaction are safe

## iPhone portrait

- [ ] Map remains dominant; text and popups are correctly scaled
- [ ] Renderer is crisp; no overflow; City Hall remains usable

## iPad portrait

- [ ] Visual depth is strong; water is attractive
- [ ] Large facilities are impressive; performance is stable

## iPad landscape

- [ ] City has a premium diorama feel
- [ ] Long Roads and citywide emergency response read clearly
- [ ] Lighting feels commercial-quality and the developed city feels alive
