# Meadowline UI / HUD 2.0

Status: **Production**, merged through PR #11 (`da5698c`). This document was written while the work was current development on `feature/ui-hud-2-premium-interface`, based on production `main` at `daee74c246d9c4c3cecca942a367c18e002bced7`; that framing is left in the body as a record of the time. Physical iPhone/iPad acceptance remains owner-only.

## Safe areas — the phone's own furniture

A phone paints its clock and battery over the top of the page and its home
indicator over the bottom. A panel measured against `100vh` does not know that,
so it can fit the screen perfectly and still have its first row of controls
sitting behind the clock, where they can be neither read nor tapped.

City Hall did exactly that. On a phone it is anchored above the tool bar at
`--safe-bottom + 88px` and was allowed to grow to `100vh - 130px`, which puts
its top edge about eight pixels from the top of the screen — so on any phone
with a notch the whole section nav, and the close button, were underneath the
status bar. Reported from a real device with a photograph; reproduced exactly
in the regression, which measures the panel top at 8px and all nine nav
buttons spanning 27–71px against a 59px status bar.

**The four insets are named once** in `css/ui-hud-2.css`:

```css
--safe-top: env(safe-area-inset-top, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
--safe-left: env(safe-area-inset-left, 0px);
--safe-right: env(safe-area-inset-right, 0px);
```

Every rule in every stylesheet uses `var(--safe-*)` rather than `env()`
directly. On a real device this is identical — the properties resolve to the
same values — but it makes the insets *settable*, and that is the whole point:
headless Chromium reports every safe-area inset as zero, so a layout that only
consults `env()` cannot be tested at all. `tests/safe-area-regression.html`
loads the game in a 390×844 frame, sets the two properties to an iPhone's
59px and 34px, and then measures what the player could actually reach.

Bottom-anchored panels now subtract both insets from their height:

```css
max-height: calc(100vh - var(--safe-top) - var(--safe-bottom) - 98px)
```

The newspaper, which is centred, subtracts twice the deeper of the two —
because a centred box puts half its height above the middle, clearing both
ends means budgeting for the worse one twice.

What the regression checks is *reachability*, not fit: a panel being on screen
is not the same as its controls being tappable. Every City Hall section button
is scrolled into view and measured, along with both close buttons, the tool
bar, the build button, the stage badge and the two HUD readouts. It also
asserts that with no insets at all the panel still uses the room a notchless
screen actually has, so the fix cannot become a permanent tax on desktop.

The paper is given a full edition before it is measured — an empty one is short
enough that no height rule ever binds, so measuring it would prove nothing.

## Visual reference role

Four owner-approved mockups define the presentation target for the normal HUD, Build catalog, City Hall and title screen. They are composition references, not simulation data. Costs, footprints, stages, resources, goals, service summaries and civic levels continue to come from Meadowline's registry and simulation. The mockup's fictional Level 5 is deliberately not implemented.

## UI system

`css/ui-hud-2.css` is an additive production layer over the established styles. It defines warm paper surfaces, Meadowline green/blue/gold semantic accents, shared radii, elevation, spacing, responsive constraints, focus treatment and reduced-motion behavior. Bounded translucent surfaces use mostly opaque color; no full-screen animated blur was introduced.

## Normal HUD

- Treasury and population are real state reads.
- The center badge shows one of the four authoritative city stages and derives its restrained progress track from real met requirements. Growing Town uses a complete state and never implies Stage 5.
- Day, season, time and weather remain sourced from the real world systems.
- Town Goals preserve one `NEXT STEP` and one `OPTIONAL` goal and can collapse without changing Save V3.
- The minimap remains the existing truthful city renderer, now in a compact card.
- The five-action dock provides Build, Look, Move, Remove and a Road shortcut. Road remains the same registry tool and is not duplicated in simulation.

## Build catalog 2.0

The catalog is a responsive bottom sheet above the persistent command dock. Category and card content are generated from `CATEGORIES`, `TOOLS`, the building registry and City Growth unlock metadata. Cards expose real cost, footprint and stage; the selected detail region reads the registry description. Locked cards remain disabled with truthful unlock language.

Opening, scrolling and closing the catalog remains DOM-shielded from the map. The existing intent-first pointer contract is unchanged: tap places one normal building, immediate drag pans, pinch cancels, and paint/removal requires the established hold-before-drag intent.

## City Hall presentation

City Hall remains a Look destination and a read-only consumer of `getCitySummary()` except for the existing confirmed parcel and civic-upgrade actions. Wide layouts use section navigation and modular summary cards; narrow layouts convert that navigation into a horizontal chooser with stacked content. Sections are Overview, Town Goals, Growth, Land, Finances, Services and Mobility.

Level 4 remains maximum. At maximum the panel says Meadowline City Hall is complete. There is no Level 5, congestion score, parking score, fake service percentage or future-system placeholder.

## Title screen

The menu presents the live Meadowline renderer as its background without creating a second simulation or mutating the city merely by opening. Continue enters the current city. New City reuses the existing explicit confirmation/reset action. Save Now uses the real V3 save. Settings opens the existing renderer/quality controls, and Credits identifies the shipped dependency record.

Renderer and quality remain separate: Low-poly 3D and Classic Canvas are backends; Battery Saver is a quality preset.

## Compatibility and performance

- Save key remains `meadowline.v3`; no transient panel state is serialized.
- HUD and panels are renderer-independent and work over Three.js or Canvas.
- Existing HUD refresh cadence remains bounded rather than moving DOM writes into the render path.
- Building cards reuse the established registry icon language; no per-card WebGL preview loop or unbounded thumbnail cache was introduced.
- Small bounded blur is retained only on overlays; Battery Saver may continue to reduce world presentation independently.

## Accessibility

The rebuild preserves labels, aria-expanded/pressed state, focus-visible outlines, semantic text alongside color, reduced-motion support, scroll containment and touch targets around 44 CSS pixels where practical. Phone layout uses safe-area insets and avoids document-level horizontal overflow in the automated 390×844 fixture.

## Automatic validation

`tests/ui-hud-2-regression.html` checks boot, authoritative stage display, Build catalog/card/detail rendering, five command actions, Level 4 maximum language, title actions and narrow-layout overflow. `tests/ui-hud-2-visual.html` provides deterministic menu, HUD, Build and City Hall capture states. Every earlier suite remains mandatory.

## Physical boundary

Headless Chrome screenshots are design-regression aids only. Gesture comfort, iOS backdrop performance, text distance, safe-area behavior under Safari chrome, thermals and long-session device behavior remain unchecked in `docs/IPHONE_ACCEPTANCE.md`.
