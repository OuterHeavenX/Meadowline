# Design QA — UI / HUD 2.0

## Evidence

Source visual truth: the four owner-approved task attachments for title, City Hall, Build and normal HUD. Permanent documentation describes them semantically rather than recording inaccessible local attachment paths.

Browser-rendered implementation captures:

- `tests/artifacts/ui-hud-2-main-menu-phone.png` — 390×844 CSS fixture, DPR 1
- `tests/artifacts/ui-hud-2-hud-phone.png` — 390×844 CSS fixture, DPR 1
- `tests/artifacts/ui-hud-2-build-phone.png` — 390×844 CSS fixture, DPR 1
- `tests/artifacts/ui-hud-2-cityhall-ipad.png` — 1366×1024, DPR 1

Same-surface comparisons:

- `tests/artifacts/ui-hud-2-comparison-menu.png`
- `tests/artifacts/ui-hud-2-comparison-hud.png`
- `tests/artifacts/ui-hud-2-comparison-build.png`
- `tests/artifacts/ui-hud-2-comparison-cityhall.png`

The phone implementation is rendered inside an exact 390×844 iframe before capture, avoiding Chromium's minimum top-level window width. Reference device bezels are treated as non-product chrome.

## Comparison history

1. First pass exposed title/card horizontal cropping, duplicated Settings presentation, a clipped fifth dock action and incorrect minimap canvas positioning.
2. The title action width and grid minimums were bounded, menu-only UI visibility was corrected, Settings was gated, dock flex tracks were made five equal actions, and the minimap canvas was reset from the global world-canvas positioning rule.
3. Revised same-surface comparisons show the intended reference hierarchy: corner status groups, center badge, paired goal/map cards, persistent five-action dock, warm Build sheet, sectional City Hall and Continue-first title menu.

## Required fidelity surfaces

- Fonts and typography: system-rounded UI hierarchy matches the product; the title uses a licensed system serif stack. Exact mockup fonts are not imported.
- Spacing and layout: major regions, rounded cards, bottom sheet, command dock, management navigation and safe-area offsets match the reference philosophy. Real Meadowline content produces fewer cards in some categories.
- Colors and tokens: warm cream surfaces, Meadowline green, muted blue, gold and restrained shadows are consistent across all four surfaces.
- Image quality and assets: the real renderer remains the background. The truthful minimap remains live. Building cards reuse established registry identities; they do not reproduce the mockup's fictional raster miniatures.
- Copy and content: all costs, stage names, footprints, goals and summaries are real. Level 5 and temperature values were intentionally omitted.

## Residual P3 polish

- Authored building-card thumbnails could raise visual richness later if a bounded, licensed render-cache path proves safe on iPhone.
- A developed-city saved background produces a richer title screen than the deterministic empty-city capture.
- Physical Safari may require tiny safe-area/blur adjustments after owner testing.

## Interactions checked

Automated browser checks cover boot, opening the Build sheet, registry cards, selected detail, five command modes, stage truth, Level 4 maximum, title actions and 390 CSS px overflow. The complete earlier regression chain remains green. Browser stderr showed no application exception during captures.

final result: passed
