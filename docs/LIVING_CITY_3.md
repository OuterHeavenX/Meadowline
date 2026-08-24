# Living City 3.0 — Municipal Integration Candidate

Status: **Current development**, stacked on the unmerged Recreation 2.0 candidate. It is not Production and has not received physical-device acceptance.

## Renderer decision record

The production renderer remains the existing procedural Canvas 2D isometric renderer. The audit compared optimized Canvas 2D, PixiJS 8 WebGL, PixiJS WebGPU, Three.js and a custom WebGL2 layer. PixiJS's current official renderer guide calls WebGL stable/recommended, WebGPU experimental, and its Canvas renderer “coming soon.” A Pixi migration would therefore replace Meadowline's working Safari fallback and scene construction rather than provide the required GPU → Canvas fallback. Safari 26 added WebGPU, but older supported iPhones/iPads and browser implementation differences remain relevant.

The candidate records WebGL2/WebGPU capabilities and graphics quality independently while using Canvas 2D for production. This preserves static hosting, native ES modules, procedural assets, context safety, postcard export and the simulation/render boundary. A later renderer spike can consume the same state only after real device benchmarks justify its startup, memory and thermal cost.

Official research consulted:

- PixiJS 8 Renderers and Application guides
- PixiJS 8 architecture and migration guides
- WebKit's Safari 26 WebGPU announcement and Safari 26.2 follow-up
- Apple Metal feature-set tables

## Architecture

- `simulation/employment.js` derives bounded workforce, job capacity and Prosperity from real residents/buildings.
- `simulation/municipal.js` derives Crime, Fire and Healthcare pressure and owns one shared Road-routed dispatcher for cruisers, engines and ambulances. All continue to honor train-crossing priority.
- `world/landscaping.js` performs validated terrain mutation. Water cannot replace buildings, Roads, Rail or locked land.
- `simulation/feedback.js` owns the bounded transient feedback pool; rendering never mutates the economy.
- `ui/tutorial.js` uses actual city state, persists in V3, resumes, skips, and automatically stays out of established migrated cities.
- Police, Fire and Healthcare buildings use the existing authoritative registry and multi-tile facility occupancy.

## Save strategy

The key remains `meadowline.v3`. Optional `terrain`, `tutorial`, `municipal`, and `quality` fields were added. Old V1/V2/V3 saves still regenerate their original terrain when `terrain` is absent. No service is auto-placed or charged during migration. Service incidents and visual actors are transient and are deliberately not saved.

## Gameplay boundaries

The existing four city stages, costs outside new content, map generation, Road/Rail rules, trains, household authority and representative-citizen rule remain unchanged. Municipal pressure is bounded and begins only after population thresholds. Ordinary incidents resolve without deleting buildings.

## Automatic validation

The dedicated Living City 3 regression covers water safety and V3 round trips, finite employment, registry-derived municipal capacity, bounded shared dispatch actors, and feedback-pool expiry. Existing Living City, Growth, City Hall, Roads/Mobility and Recreation suites remain mandatory.

Physical iPhone/iPad acceptance remains explicitly outstanding in `IPHONE_ACCEPTANCE.md`.

## Living City 3.1 visual completion child

Living City 3.1 continues from this exact municipal candidate without changing Save V3 or simulation authority. The child branch adds a shared `DISPATCHED → EN_ROUTE → ARRIVED → WORKING → RETURNING` service lifecycle, full-footprint facility entrance discovery, bounded response VFX, municipal/business Look summaries, need-based Police/Fire/Healthcare/Employment Town Goals, procedural service/weather audio, and the optional hybrid WebGL2 presentation path documented in `RENDERING_2.md`.

The Canvas scene remains the safe fallback and authoritative postcard source. Graphics modes and quality presets are presentation-only. Physical visual, thermal, audio and device acceptance remains outstanding.
