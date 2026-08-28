# Meadowline — Code and Design Review

Status: **living record.** The findings below were gathered as a review; the four critical ones have since been fixed on this branch and are marked accordingly. No save format, world size, renderer or progression stage changed.

- Reviewed branch: `claude/game-improvement-review-ole6s4`
- Reviewed on: 28 August 2026
- Scope: all 18 markdown files, all 88 source modules, all 9 browser regression suites
- Baseline: all 9 regression suites and `tests/module-hygiene.mjs` pass against this branch, before and after every change recorded here

Findings marked **verified** were reproduced by serving this branch over a local HTTP server and driving headless Chromium against scripted cities through the real `place()` and simulation paths. Findings marked **read** come from source analysis only and should be treated as strong leads rather than measurements.

Nothing in this document requires Save V4, a larger world, a renderer change or a fifth City Growth stage.

**Fix status.** B1, B2, B3 and B4 are fixed on this branch, each with a regression test that fails without the fix. Everything from B5 down remains open. See section 7 for the order the rest is meant to land in.

---

## 1. Vision as the documents describe it

Meadowline is a calm, mobile-first isometric living-city builder on a fixed 44×44 world, shipped as static files and native ES modules with no build step and no required server. Four city stages, nine land parcels, one save key. A Three.js low-poly renderer sits over a complete Canvas 2D fallback and owns no simulation truth.

The governing rule recurs in nearly every file:

**Local buildings explain local conditions. City Hall explains citywide conditions.**

Alongside it sits a refusal to fabricate: no Recreation Health percentage, no Traffic Health, no invented temperature, no fifth stage, no Level 5. The roadmap forbids premium currencies, energy systems and waiting gates by name.

The docs also separate automated proof from physical device proof and preserve failures rather than rewriting them. `docs/IPHONE_ACCEPTANCE.md` still carries the original iPad failures that forced City Growth 1.1 and every unchecked box since.

Every defect below is a place where the code and the documents disagree about what Meadowline is. None require abandoning a design principle to fix.

---

## 2. Bug fix list

### Critical

#### B1 — The game will not start when jsDelivr is unreachable · verified · **FIXED**

`src/cloud/supabase.js:1` → `src/ui/account.js:1` → `src/main.js:4`

The Supabase client is a static ES module import from a CDN. Static imports resolve for the whole module graph before any module executes, so this one fetch gates the game loop, the renderer and the save system. There is no try, no fallback and no error surface.

**Evidence.** Served the branch locally and loaded `index.html` twice. With the import rewritten to a local stub, boot reached `data-boot="pass"`. With the real CDN import and the host unreachable, no boot flag appeared at all — no canvas, no title screen, no recovery.

This contradicts the README's opening claim that normal play needs no backend or mandatory online service, and breaks the case `docs/CLOUD_SAVES_AUTH.md` is built around: a Home Screen-installed app opened without a good connection. It also costs every player a blocking round trip on every cold start, signed in or not.

**Fixed.** `cloudClient()` resolves a dynamic `import()` once and memoises it; every auth and cloud-save helper awaits it, and the account panel subscribes to auth changes only when first opened. A fourth module-hygiene rule now fails the build on any static off-origin import. Vendoring under `assets/vendor/` remains the stronger follow-up.

#### B2 — Town Goal rewards are never paid · verified · **FIXED**

`src/simulation/wishes.js` — `checkWishes()`

The loop removes any goal for which `isGoalEligible()` is false, and that helper's last clause is `goalAt(goal) < goal.g`. A goal that has just been met fails it, so a completed goal is always removed by the first branch and the reward branch below it is unreachable dead code.

**Evidence.** Ran the Settlement "lay 6 road tiles" goal to completion in a scripted city. Coins moved by exactly the eight roads' cost, −24. The 36-coin reward never arrived, `S.granted` stayed 0, and neither the "Town goal complete" toast nor the chronicle entry fired.

Every reward in the goal table, 30 to 190 coins, is dead. `ROADMAP.md` carries an unchecked physical line reading "rewards help development but do not dominate the economy", consistent with this never having been observed working.

**Fixed.** `checkWishes()` now tests completion before eligibility. Verified end to end: completing the 6-road goal nets +12 coins across eight roads and increments `S.granted`.

#### B3 — A road laid over rail stops counting toward City Growth · verified · **FIXED**

`src/progression/city-growth.js:178` — `developmentStats()`

City Growth counts road tiles with `building.type === 'road'`. When a road is overlaid onto rail, the surviving grid object keeps `type: 'rail'` and carries `state.roadRailCrossing`. The crossing-aware helper `countType('road')` handles this, and so does City Hall's Mobility panel; City Growth reimplemented the count and missed it.

**Evidence.** Eight semantic road tiles, one of them a road overlaid on rail. `countType('road')` reported 8. `mobilitySnapshot().roadTiles` reported 8. `developmentStats().roads` reported 7.

`docs/ROADS_MOBILITY_2.md` states the rule as permanent: one semantic Road tile is one City Growth Road tile, including when it is also a Rail crossing. A player at 10 of 10 roads who crosses rail drops to 9 and the Settlement → Village gate closes with no explanation.

**Fixed.** `developmentStats()` calls `countType('road')`, deleting the duplicate counter. City Growth, `countType` and City Hall Mobility now agree at 8.

#### B4 — Loading a city leaves the previous city's incidents running forever · verified · **FIXED**

`src/world/map.js` — `genWorld()` · `src/simulation/municipal.js` — `updateMunicipal()`

`genWorld()` clears citizens, trains, boats and puffs but not `S.vehicles`, `S.serviceVehicles`, `S.incidents` or `S.feedback`, and `applySave()` does not either. Ambient vehicles recover through reroute and despawn. Incidents do not: the cleanup filter keeps any unresolved incident indefinitely, and new ones are gated on `active(kind) < 1`.

**Evidence.** Created a crime incident, saved, then loaded an empty city. The incident survived with its old target coordinates, stayed `REPORTED` through 20 simulated seconds with nothing to dispatch to, and permanently blocked every future crime incident. A stale ambient vehicle carried over too.

This fires on Load, on New City and on Cloud restore — the three moments where a clean slate is most expected. The affected subsystem goes quiet for the rest of the session with no symptom the player can name.

**Fixed.** `genWorld()` clears vehicles, service vehicles, incidents and feedback alongside the actors it already cleared, and invalidates the mobility and recreation caches. `updateMunicipal()` retires an undispatched incident after 90 simulated seconds and counts it in diagnostics.

### High

#### B5 — The account form cannot be typed into on a keyboard · verified

`src/core/input.js` — global `keydown` listener

No target guard. The Account & Cloud Saves panel contains email and password inputs. Every letter matching a tool key selects that tool mid-word, and the space bar toggles pause and is swallowed by `preventDefault`. The registry assigns single letters to 23 tools, including `p c d f g h j k q r u v x y e i w`.

**Fix.** Return early when the event target is an input, textarea, select or contenteditable element.

#### B6 — The postcard shortcut is dead and the button still advertises it · verified

`src/buildings/registry.js` (`pocketPark`) · `src/core/input.js` · `index.html`

Recreation 2.0 gave Pocket Park the key `p`. The keydown handler checks the tool table first and returns, so `p` can only ever select Pocket Park. The corner button's tooltip still reads "Save a postcard (P)".

**Evidence.** Enumerated every registry key against the global shortcuts. Exactly one collision: `p`, and the tool lookup wins.

**Fix.** Rekey one of the two and correct the tooltip. Add a startup assertion that no tool key shadows a global shortcut — the next building will hit this too.

#### B7 — Postcard export is blank on the default renderer · verified

`src/ui/postcard.js` · `src/rendering/renderer.js` — `render()`

`render()` returns immediately when the Three.js scene draws successfully. `postcard()` calls `render()` and then reads the 2D canvas, which the GPU path never touches. On Auto, which picks WebGL2 wherever available, the saved PNG holds whatever was last on the Canvas surface.

`docs/RENDERING_2.md` records this as "does not yet capture the Three presentation", which understates it: the output is not a Canvas-styled postcard, it is a stale or empty one.

**Fix.** Force the Canvas path for the capture frame, or read the Three renderer's buffer with `preserveDrawingBuffer` for that one draw.

#### B8 — One thrown error ends the session silently · read

`src/core/game.js` — `frame()`

The loop runs simulation, UI painting, autosave and render, then re-queues itself. Nothing is guarded, so a single exception stops the world, the HUD and the six-second autosave permanently, leaving a frozen but otherwise normal-looking screen. The Three.js path has its own try and falls back cleanly; the rest of the loop has nothing.

**Fix.** Wrap the body in `try`/`finally` with the re-queue in the `finally` block, and record the error in diagnostics. A crash should cost one frame, not the session.

#### B9 — Painted water can never be removed · read

`src/world/landscaping.js` · `src/buildings/buildings.js` — `erase()`

Remove handles buildings and natural trees. It has no terrain case, so a water tile is permanent. Water is a hold-and-drag paint tool, so one slipped gesture floods a run of opened land at six coins a tile with no undo — on land the player may have paid several hundred coins to open.

**Fix.** Let Remove restore a painted water tile to land. Track player-painted water separately from generated ponds so natural terrain stays authoritative.

#### B10 — Expensive facilities delete on a single tap · read

`src/buildings/buildings.js` — `erase()`

The confirmation gate is footprint area ≥ 9 cells. That covers Picnic Green, Town Park and Hospital. It misses the 520-coin Fire Station (2×3), the 460-coin Clinic (2×2), the 420-coin Police Station and the 190-coin Sports Court, all of which vanish on one tap for a half refund.

**Fix.** Gate on refund value rather than area. Anything above roughly 100 coins deserves the question.

### Medium

#### B11 — Recreation access lags one tick behind road changes · read

`src/simulation/mood.js` — `recompute()`

`recomputeRecreation()` runs before `evalHouse()` refreshes each home's `linked` flag, and `routeAccess()` returns null immediately for an unlinked home. A home that just got its first road is invisible to Recreation until the next sim tick, and the population signature it caches against is computed from the stale flag.

**Fix.** Set `linked` in the same pass that builds the context lists, before Recreation runs.

#### B12 — Education never spills over to a second school · read

`src/simulation/civic-services.js` — `recomputeServices()`

Each household is assigned exactly one provider. A home in range of two half-full schools is served partially and stays that way, because leftover demand is never offered to the second school. Recreation's assignment does spill across providers; Education's does not, and nothing in the docs says the two should differ.

**Fix.** Let a household draw remaining demand from further candidates, the way Recreation already does.

#### B13 — The one-shot tool policy omits every Recreation facility · read

`src/core/input-policy.js` — `ONE_SHOT_TOOLS`

The set lists the pre-Recreation buildings and none of `pocketPark`, `playground`, `picnicGreen`, `sportsCourt` or `townPark`. Live behavior is correct because placement never consults the set — but this is the helper the regression tests and any future input code read from, so the policy and the product already disagree.

**Fix.** Derive both sets from the registry rather than maintaining a second hand-written list.

#### B14 — Native `confirm()` dialogs in a premium touch shell · read

`src/buildings/buildings.js` — `erase()` · `src/ui/hud.js` — New City

Removing City Hall, removing a large facility and starting a new valley all use the browser's `confirm()`. UI / HUD 2.0 rebuilt every other surface around warm paper, safe-area insets and a five-action dock; these three moments drop to a system alert. On an installed iOS app it reads as a page error rather than a game decision.

**Fix.** One in-shell confirmation component styled from the existing tokens, reused by all three.

#### B15 — `paintHud` assumes four menu elements exist · read

`src/ui/hud.js` — `paintHud()`

Four `getElementById(...).textContent` assignments with no optional chaining, in a function that runs five times a second, two lines after the same file uses `?.` for the same reason. Combined with B8, a missing element in any embedding or fixture kills the loop rather than skipping a label.

**Fix.** Match the optional chaining already used above it.

---

## 3. Performance

Comfortable today, and getting expensive faster than linearly. Measured in headless Chromium on a desktop CPU under SwiftShader, so the growth curve is the finding, not the absolute numbers.

| Call | 26 homes / 104 pop | 252 homes / 1,008 pop | Growth |
| --- | ---: | ---: | ---: |
| `recompute()` | 0.50 ms | 13.55 ms | 27× |
| `housingMetrics()` | 0.74 ms | 27.15 ms | 37× |
| `getCitySummary()` | 0.23 ms | 0.79 ms | 3× |
| `checkWishes()` | 0.16 ms | 0.47 ms | 3× |

Ten times the homes costs roughly 37 times the time, because neighborhood desirability is quadratic in homes. Each home's desirability scans every other home for crowding and every context list for adjacency, and `housingMetrics()` computes it twice per home — once directly, then again inside `evaluateHousingReadiness()`. `advanceHousing()` repeats the same pass every 0.9-second sim tick.

An iPhone runs this at roughly four to six times the cost. In the 100+ citizen city `docs/IPHONE_ACCEPTANCE.md` asks you to test, that is a visible hitch every 0.9 seconds — and dense-city performance is one of the unchecked acceptance lines.

Four cheap wins, in order:

1. **Cache desirability per home per tick.** Removes the double compute immediately and turns the quadratic term into one pass instead of several. Largest gain for the smallest diff.
2. **Bucket homes spatially for the crowding count.** The crowding radius is 2 tiles; scanning all homes to find neighbours within 2 tiles is the quadratic term itself.
3. **Make the city-summary cache key cheap.** Today the signature calls `connectedRoadComponents()`, `recomputeRecreation()` and `JSON.stringify(S.municipal)` — checking the cache costs nearly as much as filling it. A version counter bumped by the existing `invalidate*` calls would be free.
4. **Gate the tutorial on step changes.** `tickTutorial()` runs three full 1,936-tile grid sweeps every frame while the tutorial is on screen, which is exactly when a new player's first impression of smoothness forms.

Beyond that, `findPath()` builds string-keyed Maps and per-node arrays on a fixed 1,936-cell grid. Flat typed arrays indexed by `y * W + x` would remove nearly all of its allocation, and every mover in the game shares it.

---

## 4. Balance — the Recreation catalog has no reason to exist

Not a bug; every line behaves as written. It is the single largest design finding and the cheapest to fix.

A home's `recreationSatisfaction` is `served / demand`, nothing else. Facility `quality` is defined in the registry for all six providers and used in exactly one place: as a tiebreaker when sorting candidate facilities by distance. It never reaches satisfaction, mood or desirability.

So a resident served by a 1×1 Pocket Green receives precisely the mood and desirability a resident served by a 4×4 Town Park receives. What remains is arithmetic:

| Facility | Footprint | Stage | Cost | Capacity | Coins per resident | Capacity per tile |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| **Pocket Green** (legacy) | 1×1 | Settlement | 40 | 8 | **5.00** | **8.00** |
| Playground | 2×2 | Village | 95 | 18 | 5.28 | 4.50 |
| Pocket Park | 2×2 | Settlement | 70 | 12 | 5.83 | 3.00 |
| Town Park | 4×4 | Growing Town | 340 | 55 | 6.18 | 3.44 |
| Picnic Green | 3×3 | Village | 150 | 24 | 6.25 | 2.67 |
| Sports Court | 2×3 | Township | 190 | 28 | 6.79 | 4.67 |

The compatibility tile Recreation 2.0 deliberately kept unchanged is the cheapest per resident served *and* more than twice as land-efficient as anything else, and it unlocks at Settlement. The five facilities the milestone added are strictly dominated. A player optimising at all will tile Pocket Greens and never open the Recreation category — quietly retiring the milestone's own headline, that public space should be visible town life.

Three ways out:

1. **Let quality reach the player.** Multiply the mood contribution by the facility's `quality` in `recreationMood()`. The values are already in the registry, spanning 1.0 to 1.5. One line, no save change, no doc change.
2. **Reprice Pocket Green as a relic.** The compatibility promise is about parks already saved, not new purchases. Raise its cost or drop its capacity toward 4; existing cities are untouched, because the doc guarantees position, cost-already-paid and non-expansion, none of which this changes.
3. **Give the large facilities something small ones cannot have** — a desirability radius, a visitor bonus, or a City Growth requirement met only by facility class. More design work; defer until 1 and 2 have been played.

Recommendation: ship 1 and 2 together. Between them they cost a handful of numbers, preserve every existing save, and turn six interchangeable providers into an actual choice.

### Two smaller tuning notes

**Education is the real clock, and it runs slow.** Education accrues at 0.04 per second of fully served schooling. Town Home needs 15, about six minutes. Established Home needs 35, about fifteen. Growing Town needs one Established Home. At the default 1× speed a player doing everything right waits roughly a quarter of an hour, mostly passively, for the second housing upgrade — and the mood and desirability gates beside it are already doing the interesting work. Either raise the rate toward 0.07 or lower the Established Home threshold.

**The economy only goes up.** There is no maintenance anywhere, and payday adds a flat 18-coin grant on top of tax, trade and milling. Nothing you build ever costs you again, so past a few dozen homes coins stop being a constraint and every remaining decision is about land alone. A token upkeep — even one coin a day per civic facility — would make the Town Park's 340 coins a commitment and give the treasury something to defend. That is a design change rather than a fix, so it belongs in front of the owner, not in a patch.

---

## 5. Documentation drift

The docs are the project's best asset, which is why these matter more here than they would elsewhere.

- **UI / HUD 2.0 is described as current development on a feature branch.** It is merged and live: `index.html` ships the corner status clusters, centered stage badge, warm build sheet, five-action dock and title screen. `README.md` and `ROADMAP.md` both still call it a candidate.
- **`docs/CLOUD_SAVES_AUTH.md` describes an email-OTP branch** with a "do not merge until SMTP is configured" gate. The shipped auth is email plus password. That fourteen-line acceptance checklist now describes an approach the code has moved past, and a reader following it would test something that does not exist.
- **`README.md` states that normal play needs no CDN runtime dependency.** See B1. It is not merely a dependency; it is a blocking one.
- **The CI workflow's push triggers list only historical feature branches.** Nothing runs on push to a new working branch, including this one. Pull requests into `main` still run, so coverage exists — but only at the end, where a red run is most expensive.

---

## 6. Suggestions

**Test the three things that broke.** All seven regression suites pass against this branch, and none covers goal rewards, save-load actor cleanup or crossing-aware road counting — precisely the three verified gameplay defects. Each is a five-line assertion in a suite that already exists. The coverage gap is not effort; it is that nobody looked there.

**Make each rule live in one place.** B3 and B13 are the same shape: a rule the documents call permanent, implemented twice, with the second copy drifted. Road counting exists in `countType` and again in `developmentStats`. The one-shot tool policy exists in the registry's placement metadata and again as a hand-written set. Both second copies should be derived, not maintained. Worth watching for as Police and Fire grow, since both inherit the multi-tile foundation.

**Give diagnostics a failure surface.** `?debug=1` reports dozens of counters and no errors. A caught-exception count and last message, fed by the loop guard in B8, would have made B1, B4 and B7 visible from the device rather than from a source read. The physical acceptance document is full of items that are hard to check precisely because the game fails quietly.

**Consider a formatting pass.** The source is dense — 345 KB across 88 files with single lines up to 1,862 characters. It is internally consistent and passes hygiene; this is about reviewability, not taste. A 1,800-character line cannot be pointed at in a diff, cited in a review comment, or located from a stack trace. One max-width formatter run before the next milestone starts.

**Keep the honesty, add a date.** The refusal to retroactively check device boxes is genuinely unusual and worth protecting. What it lacks is recency: several files carry milestone status but no last-reviewed date, which is how UI / HUD 2.0 stayed "current development" after merging. A single dated status line at the top of each doc would cost nothing and catch the next drift.

---

## 7. Suggested order of work

Grouped so each block is one focused, testable change.

1. **Unblock the boot.** B1 alone. Vendor or lazily import the Supabase client so the game starts without a network. Everything else is invisible to a player who cannot reach the title screen.
2. **The three silent gameplay breaks.** B2, B3, B4. Add the three missing regression assertions in the same commit so they cannot come back.
3. **Shell and input correctness.** B5, B6 plus a startup assertion, B8, B15. Small and independent; B8 turns every future crash into one lost frame.
4. **Destructive-action safety.** B9, B10, B14. These three share one component and are best done together.
5. **Recreation balance.** Quality reaches mood; Pocket Green repriced. Play it before deciding whether the third option is needed. Update `docs/RECREATION_2.md` in the same change.
6. **Performance, ahead of the next system.** Desirability caching, spatial crowding buckets, cheap summary signature, tutorial gating. Do this before Police and Fire grow, not after: both add per-building passes over the same lists.
7. **Documentation and CI.** Promote UI / HUD 2.0 to production, rewrite the cloud auth doc around password sign-in, correct the CDN claim, widen the CI push triggers, add dated status lines.
8. **Remaining medium findings.** B11, B12, B13. Each is genuinely small; last only because nothing else waits on them.

---

## 8. Method and boundary

All 18 markdown files were read in full, then the 88 source modules. Verified findings were reproduced by serving the branch over a local HTTP server and driving headless Chromium against scripted cities through the real `place()` path and the real simulation functions, reading the resulting state. Read findings come from source analysis only.

Performance figures come from the same harness at two city sizes, on a desktop CPU under SwiftShader. They establish a growth curve, not device-representative timings.

Nothing here substitutes for physical iPhone and iPad acceptance, which `docs/IPHONE_ACCEPTANCE.md` reserves for the owner. This review checks no physical box and weakens no existing test.
