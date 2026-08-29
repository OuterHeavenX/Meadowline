# Rendering 2 — Living City 3.1 GPU Presentation

Status: **Production through merged PR #9.** Historical branch ancestry and outstanding granular device checks remain preserved.

## Starting point

Living City 3 used one procedural Canvas 2D isometric renderer. Simulation, saves, routing, buildings and economy were already independent of drawing. The candidate at `ca9b86d6e9b3b48856347e2c4c8695387bede615` deliberately stopped at a renderer capability boundary rather than claiming a GPU renderer.

## Candidates and decision

The controlled benchmark covers the existing direct Canvas scene, a Canvas scene composited through one WebGL2 pass, and a custom batched WebGL2 geometry scene. The browser harness is `tests/renderer-benchmark.html`; it records initialization, CPU submission mean/p95, an estimated ceiling, draw calls and JS heap when exposed. It is a reproducible comparison, not physical iPhone/iPad evidence and not a substitute for GPU timing or thermal measurement.

The original 3.1 candidate chose a hybrid WebGL2 presentation pass over the proven Canvas scene. After the owner supplied explicit low-poly miniature-city references, that decision was superseded: a color-grade over flat primitives could not meet the stated product target.

The production candidate now uses a **true Three.js WebGL scene adapter**:

- Three.js r185.1 is vendored under `assets/vendor/`; there is no package manager, bundler, CDN runtime dependency or server requirement.
- An orthographic camera reproduces Meadowline's existing isometric projection and reads the existing pan/zoom state.
- Terrain and water are instanced. Roads, sidewalks, Rail, buildings, tiered roofs, windows, trees, citizens, trains and vehicles are real lit geometry.
- Hemisphere and directional lighting, ACES tone mapping, fog, scalable PCF shadows, emissive night windows and weather-aware materials produce the miniature-diorama presentation.
- The adapter reads authoritative state but owns no simulation, placement, input, routing, economy or save truth.
- Compatibility mode uses the complete original Canvas renderer. A failed/lost WebGL context reveals that fallback without touching the city.

This remains an adapter, not a simulation rewrite. The previous one-pass compositor remains available as a secondary implementation boundary, but the Three.js scene is the normal GPU path. WebGPU remains out of production until its supported-device evidence is stronger.

Vendored production files are `three.module.min.js` (SHA-256 `86BCEE248B64F44BCFC23C331AE74619061957D59CAB040171DCB6FB5900BEB6`) and its r185 split core `three.core.min.js` (SHA-256 `05B2609338C76CD65DAF74F3AC515BC9A5045E1B3B33EDC07D8C9BD55250FA90`). The upstream MIT license is retained beside them.

## Capability policy

Player renderer modes:

- **Auto** — attempts WebGL2 only when the browser does not report a major performance caveat, then falls back.
- **Low-poly 3D** — requests the Three.js WebGL path explicitly, still falling back safely when unavailable.
- **Classic Canvas** — Canvas 2D only.

WebGPU is detected for diagnostics but is not a production backend. Safari 26 introduced WebGPU, but Meadowline does not require the newest Apple OS and does not place saves or simulation behind that capability.

## Quality presets

- **Auto** chooses High or Balanced from conservative DPR/core hints.
- **High** caps DPR at 2 and retains full rain, shadows, reflections and bloom.
- **Balanced** caps DPR at 1.5 and reduces transient visual density.
- **Battery Saver** caps DPR at 1, disables optional reflections/bloom/contact-shadow richness, and sharply reduces rain/particle density.

Quality settings alter presentation only. Population, economy, routes, incident timing, service capacity and saves are unchanged.

## Context and resource lifecycle

`webglcontextlost` is prevented, the Three canvas is hidden, and diagnostics report `canvas2d-fallback`. On restore, world geometry is rebuilt from simulation state. Renderer reset disposes the renderer/context and generated geometry. No GPU object is serialized; only the selected mode and quality string are optional Save V3 fields.

## Visual work in this pass

- terrain receives restrained local variation and richer time/weather grading;
- ponds derive deep centers, shoreline glints/reeds and rain ripples from authoritative water adjacency;
- wet Roads darken and catch a restrained highlight;
- buildings receive time-directed contact shadows;
- tree sway and weather density scale by quality;
- Police, Fire and medical incidents gain distinct actors and working-state effects;
- municipal vehicles gain stronger identities and restrained response lights;
- procedural rain ambience and short dispatch cues extend the existing Web Audio layer.

## Feedback layer

The Canvas renderer draws `S.feedback` badges and `S.puffs` particles inside the
scene, where they sort correctly against buildings. The Three.js scene has no
equivalent, and `render()` returns as soon as the GPU scene draws — so every
coin payout, housing-upgrade star, municipal outcome and placement puff was
invisible on the renderer Auto actually selects. The reward existed in state and
no player ever saw it.

`src/rendering/overlay.js` is one 2D layer above the GPU canvas, reusing the
same drawing code and the same `proj()` mapping. It carries the ambient layer
too — birds over the valley, seasonal motes, fireflies gathering over public
space after dark and festival lanterns — all of which were Canvas-only, so the
GPU renderer showed a valley with no weather in it but the rain. Cloud shadows
stay on the Canvas path alone: they belong under the buildings, which an
overlay cannot do. Rain is left to the GPU scene, which already draws it. It sits below the HUD, takes no
pointer input, and clears itself when the renderer falls back to Canvas so a
lost context cannot leave the last GPU frame's badges frozen on screen. The
Canvas path is unchanged and keeps drawing both in-scene.

## Sound

Sound is on for a new valley. It was forced off at boot, so the procedural
ambient bed, the seasonal chord, dispatch cues, bird calls and rain never
reached a player who did not find the sound chip.

Browsers refuse to start an AudioContext before the player has interacted, so
the ambient bed waits for the first tap or key rather than being lost — no
context is created until then. The choice is the player's and is remembered in
Save V3 as an optional `muted` field; a save written before the field existed
keeps sound on, because its silence was the old boot default rather than a
preference. Leaving the tab still stops the bed, and returning now restarts it:
previously one glance elsewhere silenced the valley for the rest of the session
while the chip still read as on.

## Known limits and required proof

- The Three path currently favors procedural geometry and shared materials over texture downloads. Further batching/LOD will be guided by physical iPhone/iPad profiling.
- GPU timings, memory pressure, battery and thermals are not exposed reliably by CI.
- Postcard export continues to use the deterministic Canvas renderer; it remains functional but does not yet capture the Three presentation.
- Physical context-loss recovery, rotation, long-session resource behavior and visual quality remain unchecked in `IPHONE_ACCEPTANCE.md`.

## Benchmark record

The first successful harness execution was GitHub Actions run `32790036151`, using Headless Chrome 151 on Linux through ANGLE/SwiftShader at DPR 1 and 640×420. All three 40-frame samples reported a 60 FPS ceiling, one draw call for each GPU option, and a 1,480,433-byte exposed JS heap. The headless virtual clock rounded CPU submission/init samples to 0 ms, so those timing values are **not decision-grade** and are not represented as measured zero-cost work. This run proves capability, deterministic scene completion, bounded draw calls and comparable initialization only. Real frame time, GPU time, memory pressure and thermals remain physical-device work.

The Three production path adds a dedicated browser regression and a deterministic 1280×720 visual scene containing dense Roads, all residential tiers, municipal facilities, Town Park, pond, citizens, ordinary/service vehicles and incidents. CI asserts real geometry and a bounded draw-call count, and uploads the rendered scene as an artifact. This is automatic visual evidence, not physical-device acceptance.

## Visual Cohesion 3.1.1 child

The initial proof-level static scene is now consumed by `three-world-art.js`, which owns a registry-driven modular art kit, Road adjacency presentation, instanced terrain classes, parcel color treatment, pond banks/depth and bounded vegetation composition. Renderer lifecycle, camera and dynamic municipal actors remain in `three-renderer.js`; simulation remains outside both. See `VISUAL_COHESION_3_1_1.md`.
