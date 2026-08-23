# Meadowline Housing 2.0 — Physical iPhone Acceptance

Branch: `feature/housing-2`

Parent branch: `feature/living-city-foundation`

This checklist separates behavior already physically demonstrated in the Living City / School 2.0 pass from new Housing 2.0 behavior that still requires deliberate device testing.

Automated/browser validation does **not** replace physical-device approval.

---

# Previously confirmed on the owner's iPhone

These items were physically observed on the Living City Foundation branch and must not regress:

- [x] Meadowline loads successfully in the live mobile build.
- [x] Core city renders in portrait orientation.
- [x] School inspection is readable.
- [x] School reports served / capacity, demand, utilization and homes served.
- [x] School capacity remains bounded at 28 / 28.
- [x] Demand may exceed 28 without served count exceeding capacity.
- [x] Overloaded School reports `At capacity`.
- [x] Household inspection shows Education and serving School.
- [x] Household can report `In range · full` and `Waiting for school space`.
- [x] Household Education visibly increases while served.
- [x] School Education-service radius displays as 7 tiles.
- [x] Two-finger pinch with School selected does not accidentally place a School.
- [x] The observed visible-pedestrian household over-count was repaired.

These checks remain regression requirements on `feature/housing-2` even though they were proven on the parent branch.

---

# Housing 2.0 — required physical checks

## 1. Boot and migration safety

- [ ] Open the Housing 2.0 branch build with an existing Living City save.
- [ ] No white page or startup exception appears.
- [ ] Existing roads, rails, buildings, Schools and landscape remain.
- [ ] Existing population remains.
- [ ] Existing coins remain.
- [ ] Existing household Education remains.
- [ ] Existing School demand/capacity recomputes sensibly.
- [ ] Existing households are not evicted because Housing 2.0 retired the old School +2 growth-capacity rule.
- [ ] A grandfathered household above its tier base remains intact after load.

## 2. Cottage / Town Home / Established Home visuals

- [ ] A Tier 1 **Cottage** is clearly recognizable at a practical phone zoom.
- [ ] A Tier 2 **Town Home** is visibly larger/taller than a Cottage.
- [ ] Town Home dormer / upper-window treatment reads without requiring extreme zoom.
- [ ] A Tier 3 **Established Home** has a clearly larger silhouette than Tier 2.
- [ ] Tier 3 extra windows / garden or fence treatment remain clean rather than cluttered.
- [ ] Seeded roof/wall color variety still exists across homes.
- [ ] Snow/night/festival rendering still looks correct on upgraded houses.
- [ ] No tier creates obvious overlap with roads, adjacent buildings or Look selection markers.

## 3. House Look 3.0

Inspect several homes at different stages.

- [ ] Panel remains readable around 390–430 CSS px wide.
- [ ] Panel scrolls vertically rather than shrinking text when content is long.
- [ ] Household residents / capacity are shown correctly.
- [ ] Mood and existing Mood explanations remain understandable.
- [ ] Education and School status remain present.
- [ ] Neighborhood Desirability value is shown.
- [ ] Desirability label is understandable (`Quiet Start`, `Developing`, `Pleasant`, `Desirable`, or `Highly Desirable`).
- [ ] Current housing tier is shown.
- [ ] Next tier is shown when one exists.
- [ ] Upgrade progress is shown.
- [ ] Road requirement is shown accurately.
- [ ] Mood requirement is shown accurately.
- [ ] Education requirement is shown accurately.
- [ ] Desirability requirement is shown accurately.
- [ ] No fake Crime, Healthcare, Fire, Employment or Prosperity requirements are shown.
- [ ] The panel gives a simple `Growing toward…` or `Not ready yet` explanation.

## 4. Neighborhood Desirability

Use Look on homes in meaningfully different locations.

- [ ] A road-connected, pleasant serviced home has better Desirability than an isolated weak location.
- [ ] Nearby Park influence makes intuitive sense.
- [ ] School / Education access makes intuitive sense.
- [ ] Station proximity contributes where applicable.
- [ ] Greenery/water contribution feels plausible.
- [ ] Heavy local crowding can reduce Desirability without destroying the neighborhood.
- [ ] Desirability remains stable enough that it does not visibly oscillate every frame.
- [ ] Desirability is clearly different in purpose from Mood.

## 5. Gradual residential evolution

Choose a Cottage that can satisfy Tier 2 requirements.

- [ ] Cottage does not upgrade instantly when thresholds are first met.
- [ ] Upgrade progress begins increasing gradually.
- [ ] A restrained growth chevron appears while meaningful progress is active.
- [ ] Progress remains understandable in Look.
- [ ] Temporarily losing a requirement pauses progress rather than erasing it.
- [ ] Restoring the requirement resumes progress.
- [ ] Cottage eventually becomes a Town Home automatically.
- [ ] Household identity/location remains the same through the upgrade.
- [ ] Education is preserved through the upgrade.
- [ ] Existing population is preserved through the upgrade.
- [ ] Town Home can later progress toward Established Home under stronger conditions.
- [ ] Housing does not downgrade when conditions later weaken.

## 6. Capacity and population feedback

- [ ] Cottage base capacity behaves as 4 for new growth.
- [ ] Town Home base capacity behaves as 6.
- [ ] Established Home base capacity behaves as 8.
- [ ] A grandfathered older household can remain above a lower tier base without eviction.
- [ ] New residents move into newly available capacity naturally rather than appearing all at once.
- [ ] Population growth remains governed by the existing Mood/road rules.

## 7. Education → Housing → School demand feedback loop

This is the key cross-system proof.

- [ ] Education contributes to Housing upgrade eligibility.
- [ ] A qualifying home upgrades.
- [ ] Upgraded housing allows more residents.
- [ ] As additional residents arrive, that household's student demand rises through the existing Education service logic.
- [ ] School utilization responds without manually rebuilding the School.
- [ ] An already-busy School can become capacity constrained as the neighborhood becomes denser.
- [ ] Household explanation continues to distinguish served vs waiting-for-space states.

## 8. Civic placement green service boundary

Select **School** and move the placement ghost around the map.

- [ ] A green service boundary appears before placement.
- [ ] A very light green service-area tint is visible but does not obscure streets/buildings.
- [ ] Boundary moves smoothly with the School ghost.
- [ ] Boundary represents the actual School service region, not the old 5-tile mood influence.
- [ ] A home inside actual Education reach can receive the appropriate benefit marker.
- [ ] A home outside actual Education reach is not falsely marked as served.
- [ ] Green home markers remain distinguishable from the geographic boundary.
- [ ] Amber/yellow capacity-pressure markers remain distinguishable from green.
- [ ] Invalid School placement still has the existing red invalid presentation.
- [ ] Boundary remains readable when zoomed reasonably close.
- [ ] Boundary remains readable when zoomed reasonably far out.
- [ ] Boundary clips cleanly at world edges.
- [ ] Overlay does not cover critical mobile controls.

### Important geometry note

School uses a **radius of 7** with the current Chebyshev service calculation:

`max(abs(dx), abs(dy)) <= 7`

That means the full center-tile service field extends seven tiles in each direction from the School. The visual preview must match this real simulation region exactly; it should not be judged against an unrelated literal 7×7 decorative square.

## 9. Touch regression with the new boundary visible

- [ ] With School selected and green boundary visible, start a two-finger pinch: no School is placed accidentally.
- [ ] Two-finger pan/zoom remains responsive with the overlay active.
- [ ] A normal single tap still places exactly one School.
- [ ] Moving the School ghost does not create sticky or stale boundaries.
- [ ] Road paint-drag still begins on the intended tile.
- [ ] Rail paint-drag still works.
- [ ] Tree paint-drag still works.
- [ ] Remove paint-drag still works.

## 10. Ledger

- [ ] Living City Education metrics still display correctly.
- [ ] Housing section displays average Desirability.
- [ ] Cottage / Town Home / Established Home counts look correct.
- [ ] `homes ready to grow` count looks plausible.
- [ ] Ledger remains usable on portrait iPhone without awkward horizontal clipping.

## 11. Residential tax behavior

This does not need exact spreadsheet verification on phone, but the direction should be believable.

- [ ] Tier 1 city income remains familiar rather than suddenly exploding.
- [ ] Upgraded occupied homes produce a modestly stronger residential tax contribution.
- [ ] Trade/mill/festival income still behaves normally.
- [ ] Residential development does not create an obvious runaway coin spiral during normal testing.

## 12. Save V3 physical verification

After at least one home has meaningful Housing state:

- [ ] Note its tier.
- [ ] Note its Education.
- [ ] Note its approximate upgrade progress if mid-upgrade.
- [ ] Close/reload the game or page.
- [ ] Housing tier persists.
- [ ] Education persists.
- [ ] Upgrade progress persists closely enough to be clearly retained.
- [ ] Household population persists.
- [ ] Desirability recomputes into a sensible value.
- [ ] School assignments/capacity recompute sensibly after reload.

## 13. Performance / stability

- [ ] Normal pan/zoom remains smooth in a neighborhood containing mixed housing tiers.
- [ ] Multiple homes progressing simultaneously do not create obvious frame hitching.
- [ ] A housing upgrade transition does not freeze the game.
- [ ] Opening/scrolling Look remains responsive.
- [ ] School placement boundary does not visibly tank frame rate while moving the ghost.
- [ ] Dense housing plus School overload remains usable.
- [ ] No obvious steadily worsening performance appears during a deliberate 10+ minute session.
- [ ] `?debug=1` appears only when explicitly requested.
- [ ] Debug values for Housing evaluations/upgrades/Desirability are present.

---

# Existing-game regression still worth checking

- [ ] Roads still place and bridge water.
- [ ] Rails still place and bridge water.
- [ ] Trains still route.
- [ ] Boats still work where applicable.
- [ ] Seasons still change.
- [ ] Weather still works.
- [ ] Festivals still work.
- [ ] Wishes still progress.
- [ ] Remove/refund still works.
- [ ] Citizens still route without obvious stuck crowds.
- [ ] Household visible citizen count never visibly exceeds household population.

---

# Acceptance result

Previously proven School 2.0 behavior remains the baseline.

Housing 2.0 is only fully accepted when the new Housing / Desirability / tier visuals / civic-boundary / persistence feedback loop is physically demonstrated on the target phone.

- [ ] **FULL HOUSING 2.0 PHYSICAL IPHONE ACCEPTANCE COMPLETE**

Do not merge solely because automated tests pass.
