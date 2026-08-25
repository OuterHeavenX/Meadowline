# Design QA — Three.js Low-Poly Renderer

**Source visual truth paths**

- `C:\Users\jimmy\.codex\codex-remote-attachments\01a0127e-a0da-7530-9246-0701e5179a35\A78BBF1F-8E98-41CB-ACA7-E7DE01021202\1-Pasted-Image-1.jpg`
- `C:\Users\jimmy\.codex\codex-remote-attachments\01a0127e-a0da-7530-9246-0701e5179a35\A78BBF1F-8E98-41CB-ACA7-E7DE01021202\2-Pasted-Image-2.jpg`
- `C:\Users\jimmy\.codex\codex-remote-attachments\01a0127e-a0da-7530-9246-0701e5179a35\A78BBF1F-8E98-41CB-ACA7-E7DE01021202\3-Pasted-Image-3.jpg`
- `C:\Users\jimmy\.codex\codex-remote-attachments\01a0127e-a0da-7530-9246-0701e5179a35\A78BBF1F-8E98-41CB-ACA7-E7DE01021202\4-Pasted-Image-4.jpg`

**Implementation screenshot path**

`tests/artifacts/three-visual-preview.png`

**Viewport and state**

- 1280×720 CSS px, device scale factor 1, Headless Chrome/SwiftShader.
- Deterministic developed-city scene: all residential tiers, dense Roads, civic/municipal buildings, Town Park, pond, citizens, cars, three service vehicles and incidents.
- Source images vary in pixels, crop, density and city state; they define a composite art-direction target rather than a pixel-identical screen.

**Full-view evidence**

The implementation now uses modeled orthographic geometry, directional shadows, varied terrain, extruded Roads/sidewalks, roofs, lit windows, low-poly trees and vehicles. This corrects the prior P1 mismatch where a Canvas image was only color-graded through WebGL. The first renderer capture also exposed an over-aggressive camera-distance fog range; the range was corrected and a second capture showed the full scene.

**Focused-region evidence**

No valid same-state focused comparison is available because the references depict unrelated cities and the supported in-app browser session could not be opened. Individual source images and the deterministic implementation capture were inspected, but they were not falsely treated as a normalized side-by-side fidelity test.

**Findings**

- [P1] Asset/detail ceiling remains below the richest references.
  Location: building facades, intersections, pond edges and civic landmarks.
  Evidence: the implementation has true modeled depth and coherent low-poly forms, but references 2–4 contain denser authored facade, street-prop, foliage and shoreline detail.
  Impact: the direction is now correct, but physical-device review is needed before claiming commercial-quality completion.
  Fix: profile the production scene on iPhone/iPad, then spend the safe draw-call/triangle budget on registry-driven landmark meshes, adjacency-shaped pond banks and intersection props.

- [P2] Deterministic scene is not the exact live-game UI state.
  Location: `tests/three-visual.html`.
  Evidence: the capture intentionally isolates the world renderer so it can be stable in CI.
  Impact: it validates art direction and renderer output but not HUD/world composition or safe-touch behavior.
  Fix: complete the unchecked physical acceptance record on the immutable candidate.

**Comparison history**

1. Initial implementation: optional one-pass WebGL color grade over Canvas. P1 finding: no real low-poly geometry. Fixed by introducing a Three.js orthographic scene adapter and retaining Canvas only as fallback.
2. First deterministic Three.js capture: world almost completely hidden by fog. P0 visual finding. Fixed by aligning fog distances with the orthographic camera distance.
3. Revised 1280×720 capture: modeled scene is visible and coherent; the remaining P1/P2 items above require device evidence and additional detail budget.

**Implementation checklist**

- [x] True orthographic low-poly scene geometry
- [x] Shared/instanced geometry where most valuable
- [x] Directional and hemisphere lighting with scalable shadows
- [x] Original Canvas renderer retained as safe fallback
- [x] Deterministic renderer screenshot scene and CI artifact
- [ ] Physical iPhone/iPad visual, input, thermal and long-session acceptance
- [ ] Device-led landmark/shoreline/intersection detail iteration

**Primary interactions tested**

Automated renderer initialization/fallback, simulation independence, quality selection, resize path, service lifecycles and deterministic scene rendering. Browser-console inspection and interactive touch testing could not be completed because no supported in-app browser session was available.

final result: blocked

Blocker: required browser-rendered interactive comparison and physical target-device evidence are unavailable in this environment; actionable P1/P2 fidelity work remains device-budget dependent.
