# Meadowline — Physical iPhone / iPad Acceptance

This is the canonical device-acceptance document for Meadowline milestones.

Automated/browser validation does **not** replace physical-device approval. A checked physical item means the owner actually observed it on an iPhone/iPad; CI results belong in the automated-validation section instead.

---

## Previously physically proven — Living City / School 2.0

These behaviors were observed on an owner iPhone before the production merge and remain permanent regression requirements:

- [x] Meadowline loads successfully in the live mobile build.
- [x] Core city renders in portrait orientation.
- [x] School inspection is readable.
- [x] School reports served / capacity, demand, utilization and homes served.
- [x] Level 1 School capacity remains bounded at 28 / 28.
- [x] Demand may exceed 28 without served count exceeding capacity.
- [x] Overloaded School reports `At capacity`.
- [x] Household inspection shows Education and serving School.
- [x] Household can report `In range · full` and `Waiting for school space`.
- [x] Household Education visibly increases while served.
- [x] School Education-service radius displays as 7 tiles.
- [x] Two-finger pinch with School selected does not accidentally place a School.
- [x] The observed visible-pedestrian household over-count was repaired.

---

## Implemented on production main — Housing 2.0 regression surface

Housing 2.0 is part of `main` through PR #3. Its branch automation was green before release. These behaviors must continue to work while City Growth is tested:

- [ ] Cottage / Town Home / Established Home silhouettes remain readable at normal phone zoom.
- [ ] House Look remains scrollable and readable around 390–430 CSS px wide.
- [ ] Residents / capacity are correct for the current housing tier.
- [ ] Mood reasons remain understandable.
- [ ] Education and School state remain present.
- [ ] Neighborhood Desirability value and label remain present.
- [ ] Current and next residential tiers are shown correctly.
- [ ] Upgrade progress and road/Mood/Education/Desirability requirements update correctly.
- [ ] Good conditions advance residential growth.
- [ ] Lost conditions pause rather than erase earned progress.
- [ ] Existing residents are not evicted by capacity migration.
- [ ] Denser/upgraded Housing increases School demand.
- [ ] Green School coverage visualization still matches the real service area.

These are regression checks in the City Growth device pass; they are not newly invented City Growth behavior.

---

# City Growth 1.0 — physical acceptance pending

Branch:

`feature/city-growth-progression`

Do not merge until the checks below are completed to the owner's satisfaction.

## 1. New progression city

- [ ] Start a genuinely new valley rather than merely reloading an older save.
- [ ] Meadowline Center is the only buildable parcel initially.
- [ ] The starting 20×20 area feels useful for roads, several homes, Green tools, trade, and early neighborhood planning.
- [ ] The starting area feels meaningfully smaller than the whole world without feeling cramped.
- [ ] Locked terrain is still visible and attractive.
- [ ] Ponds, grass, natural trees, seasons, weather, and landscape remain visible in locked parcels.
- [ ] Locked land uses only a restrained tint/boundary, not a giant opaque overlay.
- [ ] Camera can freely pan across locked land.
- [ ] Minimap subtly distinguishes locked land without becoming a progression diagram.

## 2. Locked-land behavior

- [ ] A normal building cannot be placed on locked land.
- [ ] Road painting stops/rejects locked land.
- [ ] Rail painting stops/rejects locked land when Rail is unlocked.
- [ ] Tree/remove paint tools respect parcel access.
- [ ] Placement feedback says the land has not been opened rather than giving only a generic failure.
- [ ] Look on locked land identifies the parcel by name.
- [ ] Look explains the required stage or neighboring parcel when locked.
- [ ] Look shows the coin cost once the parcel is ready.
- [ ] Looking/panning across locked land never changes terrain or removes natural trees.

## 3. City Growth panel

- [ ] City Growth button is comfortably tappable on iPhone portrait.
- [ ] Panel fits without colliding badly with the HUD/dock/safe area.
- [ ] Current stage is obvious.
- [ ] Next-stage requirements are readable in plain language.
- [ ] Completed requirements are visually distinguishable.
- [ ] `any 2 of 3` requirements are understandable without technical wording.
- [ ] Parcel names, statuses, and costs are readable.
- [ ] Opening/closing the panel does not accidentally build underneath it.

## 4. Settlement → Village

Target requirements:

- 16 residents
- 4 occupied homes
- 10 road tiles

Physical checks:

- [ ] Progress values update while playing normally.
- [ ] Village is not awarded before all three required conditions are met.
- [ ] Reaching Village produces one restrained milestone message.
- [ ] School, Market, and Bakery become available after Village.
- [ ] The toolbar remains usable and does not jump/overflow badly when tools unlock.

## 5. Village → Township

Target requirements:

- 30 residents
- 7 occupied homes
- any 2 of: average Education 8+, 2 Town Homes, average Desirability 42+

Physical checks:

- [ ] Township can be reached through more than one healthy-city path.
- [ ] Education does not feel like an excessive early waiting wall.
- [ ] Town Home progression contributes naturally.
- [ ] Desirability contributes naturally.
- [ ] Rail, Station, and Windmill unlock at Township.

## 6. Township → Growing Town

Target requirements:

- 48 residents
- 10 occupied homes
- 4 Town Homes
- 1 Established Home
- any 2 of: average Education 18+, 8 students served, average Desirability 50+

Physical checks:

- [ ] Requirements feel like a developed town rather than arbitrary busywork.
- [ ] Growing Town milestone appears once.
- [ ] Dock unlocks at Growing Town.

## 7. Parcel expansion

- [ ] An eligible North/East parcel shows an available visual state.
- [ ] Tapping the parcel row shows/uses the correct cost.
- [ ] Purchase requires explicit confirmation.
- [ ] Cancel leaves coins and land unchanged.
- [ ] Confirm deducts the cost once.
- [ ] Purchased parcel opens immediately.
- [ ] Overlay/boundary fades away for the unlocked parcel.
- [ ] Roads/buildings can immediately use newly opened tiles.
- [ ] Duplicate purchase is impossible.
- [ ] Later parcels correctly respect neighboring prerequisites.
- [ ] Unlocking land does not regenerate ponds, grass, or woodland.
- [ ] Unlocking does not cause a noticeable freeze/hitch.

## 8. Legacy-save safety — critical

Use a city created before City Growth 1.0:

- [ ] Existing V3 city loads normally.
- [ ] Full map remains developable.
- [ ] Existing roads remain.
- [ ] Existing rails remain.
- [ ] Existing Stations and train routing still work.
- [ ] Existing houses and population remain.
- [ ] Existing Schools and Education remain.
- [ ] Existing trade/Green buildings remain.
- [ ] No developed tile becomes unusable because it lies outside Meadowline Center.
- [ ] All previously available building tools remain available in the legacy city.
- [ ] Reloading the migrated city keeps full access.

## 9. School Level 2

Level 1 baseline: 28 capacity / 7-tile radius.

Level 2 target: Township + 650 coins → 44 capacity / 7-tile radius.

- [ ] Level 1 School Look reports Level 1 and 28 capacity.
- [ ] Upgrade action remains disabled before Township.
- [ ] At Township, the panel shows 28 → 44 and 650 coins.
- [ ] Upgrade requires explicit confirmation.
- [ ] Cancel leaves level/coins unchanged.
- [ ] Confirm deducts exactly 650 coins once.
- [ ] School becomes Level 2.
- [ ] Capacity becomes 44.
- [ ] Coverage radius remains exactly 7 tiles.
- [ ] Waiting nearby students may become served after recomputation.
- [ ] Education already earned remains intact.
- [ ] Level 2 visual classroom wings/clock are visibly different at practical phone zoom.
- [ ] One-tile footprint remains visually clean around roads/adjacent buildings.
- [ ] Level survives reload.
- [ ] School cannot be upgraded beyond Level 2 in this milestone.

## 10. Touch and gesture regression

- [ ] One-finger pan with Move remains smooth.
- [ ] Pinch zoom remains smooth.
- [ ] Pinch with School/building selected does not commit a pending building.
- [ ] Road paint remains usable.
- [ ] Rail paint remains usable after Township.
- [ ] Tree paint remains usable.
- [ ] Remove paint remains usable.
- [ ] Look selection remains reliable on buildings and locked land.
- [ ] City Growth panel scrolling/tapping does not leak input to the map.

## 11. Performance

- [ ] Panning over multiple locked parcel boundaries stays smooth.
- [ ] Locked-land tint does not visibly stutter.
- [ ] Minimap remains responsive.
- [ ] Stage progression does not hitch when requirements change.
- [ ] Parcel unlock does not freeze the game.
- [ ] School Level 2 recomputation does not hitch badly.
- [ ] `?debug=1` remains usable and reports City Growth metrics.

## 12. Save / reload

- [ ] City stage persists.
- [ ] Opened parcels persist.
- [ ] Claimed milestone metadata persists safely.
- [ ] School Level 2 persists.
- [ ] Housing tiers/progress persist.
- [ ] Education persists.
- [ ] Desirability persists/recomputes sensibly.
- [ ] Coins remain correct after parcel purchase and School upgrade.
- [ ] Malformed optional progression metadata does not white-page the game.

---

# Automatically validated — record separately

City Growth's GitHub Actions workflow is designed to run:

- JavaScript syntax checks
- module hygiene / import-cycle checks
- original Living City + Housing headless browser regression
- City Growth headless browser regression

Do not check physical boxes above merely because CI passes.

---

# Merge gate

City Growth 1.0 is eligible for a merge decision only after:

- [ ] current feature-branch automation is green
- [ ] critical legacy-save checks pass physically
- [ ] new-city progression is comfortable on iPhone
- [ ] parcel interaction is comfortable on iPhone/iPad
- [ ] School Level 2 is physically verified
- [ ] no major Housing/Education/touch regression is found
- [ ] owner explicitly approves the merge
