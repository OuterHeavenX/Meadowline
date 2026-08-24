# Meadowline

Meadowline is a calm, mobile-first isometric living-city builder. It remains a lightweight static browser game built with native ES modules and Canvas 2D. Normal play requires no React/Vue application, Node process, server runtime, or backend dependency.

## Production status

Production `main` at the start of City Growth remains:

`5d4054f764d603b23ddf1a74ab63824de67ea778`

PR #3 promoted the validated modular architecture, Living City Foundation / School 2.0, Save V3, Housing 2.0, Neighborhood Desirability, residential evolution, civic coverage visualization, and the original mobile pinch/build repair to `main`.

Historical implementation branches remain preserved:

- `agent/architecture-refactor`
- `feature/living-city-foundation`
- `feature/housing-2`

PR #1 and PR #2 were superseded and closed without separate merge.

## Current development

Branch: `feature/city-growth-progression`

Draft PR: **#4**

Current milestone: **City Growth 1.1 — Guided Development, progression-aware Town Goals, safe touch building, and mobile UI re-haul**.

City Growth is not production and must not merge until the owner completes the physical iPhone/iPad gate and explicitly approves the merge.

## City Growth foundation

The world stays **44×44**. New progression cities begin in a 20×20 Meadowline Center rather than receiving the entire map at once. The seeded terrain underneath locked land continues to exist, render, receive weather/seasons, contain ponds and woodland, and remain camera-accessible.

City stages:

1. Settlement
2. Village
3. Township
4. Growing Town

Building unlocks remain registry-driven:

- Settlement — Road, House, Café, Park, Trees, Lamp
- Village — School, Market, Bakery
- Township — Rail, Station, Windmill
- Growing Town — Dock

Legacy pre-City-Growth saves use `legacy-open`, retain full land access, and retain every existing tool.

## City Growth 1.1 refinement

The first physical iPad City Growth pass revealed acceptance problems in the old sandbox-era goal logic and mobile interaction:

1. old random Wishes could request a Boat merely because any water existed somewhere in the generated map;
2. Train goals could appear before transit was a meaningful progression step;
3. with a build/paint tool selected, an intended map drag could accidentally construct or erase tiles;
4. the first UI refinement auto-cancelled one-off buildings after placement and allowed an active-mode strip to obstruct the build catalog.

City Growth 1.1 addresses those findings without adding unrelated simulation systems.

### Town Goals

The old player-facing **Wishes** panel is now **Town Goals**. The V3 `wishes` save field remains compatible internally so this refinement does not require Save V4.

Town Goals contain approximately:

- one **Next Step** that helps the city move through its current stage;
- one **Optional** contextual goal chosen only from currently sensible eligible goals.

Eligibility now understands city stage, building unlocks, current infrastructure, land access, Housing, Education, Desirability, rail readiness, and maritime readiness.

Hard progression rules include:

- Settlement cannot request School, Rail, Station, Train, Dock, or Boat goals when those systems are unavailable;
- Village may guide School/Housing/Education but still does not request Train/Boat;
- Township may introduce Rail and Station; a Train goal requires meaningful rail readiness;
- Growing Town may introduce Dock; a Boat goal requires an existing Dock rather than merely global water presence;
- old now-ineligible transport Wishes are sanitized during V3 load and replaced by appropriate Town Goals.

### Safe touch navigation

On touch devices the physical gesture rule is now:

- **tap** — intentional single-tile action;
- **immediate one-finger drag** — pan the camera, even when a build tool is selected;
- **two fingers** — pinch/zoom and pan; pending construction is cancelled;
- **hold ~300 ms + drag** with Road/Rail/Tree/Remove — enter deliberate paint/removal mode.

Normal building tools intentionally **remain armed after successful placement** so repeated House/School/etc. construction does not require reopening the menu. Safe one-finger drag-to-pan remains active while the tool is armed. The player explicitly cancels or replaces the tool when finished. Desktop mouse interaction remains fast and retains click-drag painting.

### Mobile build UI

The old permanently expanded tool dock has been reorganized into:

- compact bottom command bar;
- dedicated **Build** button;
- collapsible category build tray;
- Move / Look / Remove mode controls;
- in-dock active build controls explaining current cost and gesture;
- **✓** to keep the selected tool armed while closing the tray for map focus;
- **×** to cancel the selected tool and return to navigation;
- no obstructive active `Look` strip over the build catalog.

Locked tools continue to display stage requirements from the authoritative registry rather than a second unlock table.

### Latest physical iPad evidence

The latest owner iPad retest reports the updated City Growth 1.1 build as **“looking great.”** The supplied screenshot visibly demonstrates a functioning Growing Town with 92 citizens, coherent `Town Goals`, the compact command bar, a clear unobstructed map, mature residential density, roads, lamps, citizens, trees, and parcel boundaries. This is positive physical evidence for presentation/coherence, but it does not by itself check every gesture, save-migration, School Level 2, or long-session acceptance item in `docs/IPHONE_ACCEPTANCE.md`.

## Living City systems preserved

Production relationships remain:

Road + Mood + Education + Neighborhood Desirability
→ residential evolution
→ higher household capacity
→ more residents
→ greater School demand
→ stronger civic pressure.

Residential tiers remain:

- Cottage — 4 capacity, 1.00× residential tax
- Town Home — 6 capacity, 1.25×
- Established Home — 8 capacity, 1.55×

School remains the first reusable civic provider:

- Level 1 — 28 students, radius 7
- Level 2 — Township + 650 coins, 44 students, radius still 7

## Save system

Current key: `meadowline.v3`.

City Growth persists optional metadata:

```text
cityProgress: {
  mode,
  stage,
  unlockedParcels,
  claimedMilestones
}
```

The existing `wishes` field now stores progression-aware Town Goal entries with a `slot` (`primary` or `optional`). Older compatible entries are accepted only if still eligible; inappropriate old goals are discarded safely.

Missing City Growth metadata still defaults an established save to `legacy-open`. Never infer locked parcels for a pre-City-Growth city.

## Performance

Education, Housing, City Growth, and Town Goal evaluation use the existing low-frequency simulation path rather than 60 FPS evaluation. Tile access remains cheap. Touch intent uses pointer state/timers and does not add a UI framework.

`?debug=1` includes goal and input counters in addition to existing service/Housing/City Growth diagnostics.

## Validation policy

Automated proof and physical-device proof are separate.

Current workflow covers:

- JavaScript syntax
- module hygiene/import cycles
- Living City + Housing browser regression
- City Growth 1.0 regression
- City Growth 1.1 Town Goal / touch-policy regression

The latest documentation reconciliation commit was validated successfully by Living City Validation run #80. This remains automated proof only.

Only the owner can complete the physical iPhone/iPad acceptance checklist in `docs/IPHONE_ACCEPTANCE.md`.

## Running locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Regression pages:

- `/tests/regression.html`
- `/tests/city-growth-regression.html`
- `/tests/city-growth-1-1-regression.html`

Module hygiene:

```bash
node tests/module-hygiene.mjs
```

## Roadmap-only systems

Not implemented by City Growth 1.1:

- Police / Crime / Jail
- Recreation 2.0
- Fire / Emergency
- Hospital / Healthcare
- Employment / Prosperity
- larger worlds/chunking
- advanced traffic
- road-over-rail crossings
- neighborhood identity
- giant persistent NPC populations
- full Waterworks terrain sculpting

The current roadmap recommendation for the **next major milestone after City Growth is physically accepted and merged** is **Recreation 2.0 / Town Life**. Waterworks / Landscaping remains a separate future system and is not used as a workaround for badly gated Boat goals.
