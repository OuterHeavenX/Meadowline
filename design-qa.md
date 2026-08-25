# Design QA — Visual Cohesion 3.1.1

## Evidence

Source visual truth is the owner-provided low-poly reference set:

- `C:\Users\jimmy\.codex\codex-remote-attachments\01a0127e-a0da-7530-9246-0701e5179a35\A78BBF1F-8E98-41CB-ACA7-E7DE01021202\1-Pasted-Image-1.jpg`
- `C:\Users\jimmy\.codex\codex-remote-attachments\01a0127e-a0da-7530-9246-0701e5179a35\A78BBF1F-8E98-41CB-ACA7-E7DE01021202\2-Pasted-Image-2.jpg`
- `C:\Users\jimmy\.codex\codex-remote-attachments\01a0127e-a0da-7530-9246-0701e5179a35\A78BBF1F-8E98-41CB-ACA7-E7DE01021202\3-Pasted-Image-3.jpg`
- `C:\Users\jimmy\.codex\codex-remote-attachments\01a0127e-a0da-7530-9246-0701e5179a35\A78BBF1F-8E98-41CB-ACA7-E7DE01021202\4-Pasted-Image-4.jpg`

Implementation captures:

- `tests/artifacts/visual-cohesion-final.png` — 1280×720
- `tests/artifacts/visual-cohesion-phone.png` — 390×844
- `tests/artifacts/visual-cohesion-ipad.png` — 1366×1024
- `tests/artifacts/visual-cohesion-comparison.png` — reference 4 and desktop candidate combined in one review surface

The deterministic scene includes all residential tiers, commerce, civic and municipal facilities, Recreation, every major Road relationship, Rail/crossing, pond, trees, citizens and vehicles. The references define a composite art direction rather than a pixel-identical city state.

## Iterations completed

1. Replaced proof-level repeated tower houses with tier-specific modular massing, roofs, porches, foundations, paths, windows and deterministic neighborhood variation.
2. Replaced independent Road slabs with adjacency-derived joins, exposed-edge sidewalks, curbs, restrained markings, crosswalks, dead-end caps, crossings and bridge treatment.
3. Replaced graph-paper/white missing-land presentation with broad deterministic grass regions, muted locked land and an extruded diorama base.
4. Added shallow/deep pond presentation, exposed shoreline banks and reeds; corrected an initial white-water material failure discovered in screenshot review.
5. Reduced woodland dominance through deterministic presentation thinning, development-edge scale reduction and near/far caps.
6. Expanded the test city and reframed desktop, phone and iPad captures around developed neighborhoods.
7. Added side elevations and rooftop/service identity details to civic facilities after the combined reference/candidate review exposed blank walls.

## Findings

- [P1] Authored landmark/detail ceiling remains below the richest source reference.
  - Location: Hospital, commercial landmarks, street furniture and facility lots.
  - Evidence: `visual-cohesion-comparison.png` shows materially improved coherent geometry, but the source has denser facade articulation, signage, rooftop equipment and micro-composition.
  - Impact: this candidate establishes the reusable art language but does not honestly equal the most asset-rich reference.
  - Next fix: use the documented Blender→GLB pipeline only after physical-device draw-call, memory and thermal budgets are measured.

- [P1] Pond silhouette is still visibly tile-derived.
  - Location: central deterministic pond.
  - Evidence: shallow/deep bands and banks ground the pond, but the outer silhouette remains rectangular in the fixture.
  - Impact: water no longer looks like missing terrain, yet does not reach the natural shoreline target.
  - Next fix: add cached adjacency corner meshes or a derived shoreline contour without changing authoritative Water tiles.

- [P2] The deterministic capture isolates renderer output rather than the complete live HUD/input state.
  - Location: `tests/three-visual.html`.
  - Impact: it validates art language and output stability, not physical touch alignment, live selection overlays or thermal behavior.
  - Next fix: complete the canonical unchecked iPhone/iPad acceptance section on the immutable candidate.

## Verified surfaces

- Residential tiers are distinct without labels in the deterministic scene.
- Road masks join coherently across isolated, dead-end, straight, corner, T and cross forms.
- Terrain, locked parcels and the diorama edge share one palette.
- Phone and iPad approximation captures remain readable and map-dominant.
- Material, geometry, draw-call and visible-tree counts remain bounded in automatic testing.
- Font, copy and responsive application UI were intentionally unchanged by this world-art milestone.

## Validation boundary

Automated Chrome/SwiftShader comparison and regression evidence is available. Physical iPhone/iPad clarity, touch, GPU performance, memory and thermals are not available and remain unchecked in `docs/IPHONE_ACCEPTANCE.md`.

final result: blocked

Blocker: the remaining P1 landmark/shoreline fidelity work depends on measured physical-device budget, and the required physical acceptance evidence is not available in this environment. The candidate is suitable for a draft engineering/visual review, not a claim of completed physical acceptance.
