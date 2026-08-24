# Rendering 2 — Living City 3.1 GPU Presentation

Status: **Current development** on `feature/living-city-3-1-aaa-visual`, stacked transparently on the unmerged Living City 3 candidate. It is neither Production nor physically accepted.

## Starting point

Living City 3 used one procedural Canvas 2D isometric renderer. Simulation, saves, routing, buildings and economy were already independent of drawing. The candidate at `ca9b86d6e9b3b48856347e2c4c8695387bede615` deliberately stopped at a renderer capability boundary rather than claiming a GPU renderer.

## Candidates and decision

The controlled benchmark covers the existing direct Canvas scene, a Canvas scene composited through one WebGL2 pass, and a custom batched WebGL2 geometry scene. The browser harness is `tests/renderer-benchmark.html`; it records initialization, CPU submission mean/p95, an estimated ceiling, draw calls and JS heap when exposed. It is a reproducible comparison, not physical iPhone/iPad evidence and not a substitute for GPU timing or thermal measurement.

The production choice is a **hybrid WebGL2 presentation pass over the proven Canvas 2D world renderer**:

- Canvas continues to construct the full authoritative visual scene.
- WebGL2 uploads that scene as one texture and applies one restrained color-grade/bloom/vignette pass.
- The GPU layer uses one texture and one draw call.
- The underlying Canvas remains present continuously, so a failed or lost context reveals a playable fallback immediately.
- Compatibility mode skips GPU creation entirely.

This is intentionally not a PixiJS or Three.js scene rewrite. PixiJS WebGL is stable, but migrating every procedural Meadowline primitive would add library/startup/texture-management cost without improving simulation separation. PixiJS WebGPU and Three.js WebGPU remain experimental according to their current official documentation. Custom WebGL2 for every object offered the highest theoretical batching ceiling but would duplicate the existing scene implementation and make this milestone a rewrite.

## Capability policy

Player renderer modes:

- **Auto** — attempts WebGL2 only when the browser does not report a major performance caveat, then falls back.
- **GPU** — requests WebGL2 explicitly, still falling back safely when unavailable.
- **Compatibility** — Canvas 2D only.

WebGPU is detected for diagnostics but is not a production backend. Safari 26 introduced WebGPU, but Meadowline does not require the newest Apple OS and does not place saves or simulation behind that capability.

## Quality presets

- **Auto** chooses High or Balanced from conservative DPR/core hints.
- **High** caps DPR at 2 and retains full rain, shadows, reflections and bloom.
- **Balanced** caps DPR at 1.5 and reduces transient visual density.
- **Battery Saver** caps DPR at 1, disables optional reflections/bloom/contact-shadow richness, and sharply reduces rain/particle density.

Quality settings alter presentation only. Population, economy, routes, incident timing, service capacity and saves are unchanged.

## Context and resource lifecycle

`webglcontextlost` is prevented, the overlay is hidden, and diagnostics report `canvas2d-fallback`. On restore, shader/buffer/texture resources are rebuilt. Renderer reset deletes owned GPU resources before removing the overlay. No GPU object is serialized; only the selected mode and quality string are optional Save V3 fields.

## Visual work in this pass

- terrain receives restrained local variation and richer time/weather grading;
- ponds derive deep centers, shoreline glints/reeds and rain ripples from authoritative water adjacency;
- wet Roads darken and catch a restrained highlight;
- buildings receive time-directed contact shadows;
- tree sway and weather density scale by quality;
- Police, Fire and medical incidents gain distinct actors and working-state effects;
- municipal vehicles gain stronger identities and restrained response lights;
- procedural rain ambience and short dispatch cues extend the existing Web Audio layer.

## Known limits and required proof

- The hybrid path adds a full-canvas upload each frame; physical device profiling must decide whether Auto should prefer it on each supported iPhone/iPad class.
- GPU timings, memory pressure, battery and thermals are not exposed reliably by CI.
- Postcard export currently captures the ungraded Canvas scene, by design; it remains functional but does not include the optional screen-space grade.
- Physical context-loss recovery, rotation, long-session resource behavior and visual quality remain unchecked in `IPHONE_ACCEPTANCE.md`.

## Benchmark record

Exact automated measurements will be copied here from the final candidate workflow. They must be labeled as headless Linux/ANGLE observations, never as iPhone or iPad results.

