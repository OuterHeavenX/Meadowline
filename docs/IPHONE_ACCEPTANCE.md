# Meadowline Living City Foundation — Physical iPhone Acceptance

Branch: `feature/living-city-foundation`

This checklist separates what has actually been physically demonstrated on the owner's iPhone from what is still only automated, inferred, or awaiting a deliberate device test.

Automated/browser validation does **not** replace physical-device approval.

## Current physical-test status

### Confirmed on the owner's iPhone

- [x] Game loads successfully; no white page.
- [x] Core city renders correctly in portrait orientation.
- [x] School can be selected and inspected.
- [x] School inspection panel is readable without horizontal scrolling.
- [x] School reports students served / capacity.
- [x] School reports demand in reach.
- [x] School reports utilization.
- [x] School reports homes served.
- [x] School reports coverage radius.
- [x] School capacity stops at 28 / 28.
- [x] Demand can exceed capacity without served count exceeding 28.
- [x] Overloaded School reports `At capacity`.
- [x] Overload explanation tells the player some demand is waiting.
- [x] Education-service coverage radius displays as 7 tiles.
- [x] A covered household can be inspected with Look.
- [x] Household shows Education value / tier.
- [x] Household identifies its serving School.
- [x] Household shows School capacity.
- [x] Household distinguishes active service from `In range · full`.
- [x] Household can explain `Waiting for school space` when provider capacity is full.
- [x] Household Education has visibly increased over time during the test session.
- [x] Two-finger pinch with School selected does not accidentally place a School.
- [x] The School / household Look panels remain usable with the bottom mobile toolbar present.
- [x] The household pedestrian over-count stabilization is visible: a 6-resident household no longer reports more than 6 residents out.

### Physically observed examples

School states observed during acceptance included:

- `4 / 28` served, 4 demand, 14% utilization, 2 homes served
- `28 / 28` served, 31+ demand, 100% utilization, At capacity
- after the radius rebalance: `28 / 28` served, 39 demand, 14 homes served, 7-tile coverage

Household states observed included:

- Education improving while a place is available
- Education value shown as `Learning`
- School at 28 / 28
- `In range · full`
- `Waiting for school space`

These examples demonstrate that the system is not merely displaying a fixed School radius bonus; demand, assignment and capacity pressure are participating in the live simulation.

---

# Remaining deliberate physical checks

The following should remain unchecked until explicitly tested on the target phone.

## Existing game regression

- [ ] Pan works smoothly across a several-minute session.
- [ ] Roads place and paint-drag correctly after all Living City changes.
- [ ] Rails place and paint-drag correctly after all Living City changes.
- [ ] Trees paint correctly.
- [ ] Remove paint-drag works and refunds correctly.
- [ ] Seasons continue changing through a full transition.
- [ ] Weather continues changing and rendering correctly.
- [ ] Citizens continue routing without obvious stuck groups.
- [ ] Trains continue routing normally.
- [ ] Boats still work where applicable.
- [ ] Save/reload preserves the city after intentionally closing/reopening the page.

## School placement preview

- [ ] Moving the School ghost clearly shows green benefit feedback on affected homes.
- [ ] Yellow capacity-pressure feedback is visually distinguishable from green.
- [ ] Placement feedback remains readable at practical mobile zoom levels.
- [ ] Overlay does not obscure essential controls.

## Capacity relief

- [ ] Add a second School near an overloaded neighborhood.
- [ ] Confirm assignments redistribute deterministically.
- [ ] Confirm waiting demand decreases.
- [ ] Confirm one School does not exceed its own 28 capacity.
- [ ] Confirm household explanation changes from waiting to improving where appropriate.

## Education retention

- [ ] Note a household's current Education.
- [ ] Remove or move away its School coverage.
- [ ] Confirm Education already earned is retained.
- [ ] Confirm new Education growth pauses while uncovered.
- [ ] Restore service and confirm growth resumes.

## Touch arbitration

- [x] With School selected, place one finger then add a second finger for pinch: no School is accidentally placed.
- [x] Two-finger pinch remains usable with School selected.
- [ ] Two-finger pan does not place another non-paint building.
- [ ] A normal single building tap places exactly one building on release.
- [ ] Road paint-drag begins from the intended first tile.
- [ ] Rail paint-drag begins from the intended first tile.
- [ ] Tree paint-drag begins from the intended first tile.
- [ ] Remove paint-drag remains smooth.

## Mobile layout

- [x] School inspection fits portrait iPhone layout.
- [x] Household Education section fits portrait iPhone layout.
- [x] Main toolbar remains usable while Look is open.
- [ ] Ledger Living City / Education metrics fit without awkward clipping.
- [ ] `?debug=1` overlay remains readable enough for development use.

## Performance

- [ ] Normal play has no obvious new stutter during a deliberate 10+ minute session.
- [ ] Repeated School placement/removal does not progressively degrade responsiveness.
- [ ] A dense occupied neighborhood does not cause noticeable service-recompute hitching.
- [ ] Pinch/pan stays responsive in the densest tested neighborhood.
- [ ] `?debug=1` appears only when requested.
- [ ] FPS/frame/render/simulation figures remain reasonably stable during an extended test.
- [ ] No obvious memory/performance degradation appears over time.

## Save V3 physical verification

Automated coverage exists, but physical mobile persistence should still be tested deliberately.

- [ ] Existing older Meadowline save opens rather than resetting.
- [ ] Existing buildings remain.
- [ ] Existing population remains.
- [ ] Existing coins remain.
- [ ] Day/season state remains plausible.
- [ ] After Education increases, reload and confirm that Education persists.
- [ ] School level/state survives reload.
- [ ] An overloaded School reloads into a sensible recomputed capacity state.

---

# Living City stabilization already completed during acceptance

Physical testing exposed one real issue:

A 6-resident household displayed that 8 residents were out on the streets.

Fix completed:

- visible citizen representatives are capped per household
- excess representatives are pruned when household population decreases
- Look should never report `out` greater than household population
- regression coverage was added

Physical follow-up showed a 6-resident household reporting 2 residents out, confirming the visible symptom was repaired.

---

# Civic-radius acceptance decision

The initial 5-tile Education radius was considered too restrictive for Meadowline's planned future density.

School Education coverage is now **7 tiles**.

The older School mood and +2 resident-capacity perk remains at **5 tiles**.

This establishes the future coverage policy:

- small/local amenities can stay compact
- Schools can cover meaningful neighborhoods
- Police / Fire / Healthcare may use approximately 8–12+ tile reach depending on capacity/response design
- each civic provider owns its own radius
- coverage never implies infinite capacity

Physical testing confirmed the School panel now reports `Coverage radius 7 tiles` and can cover a broader neighborhood while still becoming capacity constrained.

---

# Next milestone acceptance preparation — Housing 2.0

Before Housing 2.0 is considered physically validated, future testing should include:

- [ ] multiple residential tiers are visually distinguishable on iPhone
- [ ] household Look explains upgrade readiness clearly
- [ ] road / mood / Education requirements match the actual simulation
- [ ] fake future requirements are not shown
- [ ] Education persists through a residential upgrade
- [ ] household identity persists through a residential upgrade
- [ ] upgraded capacity increases population naturally
- [ ] denser housing increases School demand
- [ ] School overload responds to housing evolution
- [ ] neighborhood evolution does not create visible frame hitching
- [ ] upgrades do not cascade uncontrollably across the entire map
- [ ] save/reload preserves housing tier and upgrade progress

---

## Acceptance result

Core **School 2.0 / Education / capacity / household explanation / 7-tile coverage / pinch safety** behavior is physically proven on iPhone.

- [ ] **FULL LIVING CITY FOUNDATION ACCEPTANCE COMPLETE**

Do not mark the entire milestone fully accepted until the remaining critical regression/persistence checks above are either physically tested or consciously waived by the owner.

Do not merge solely because automated tests pass.