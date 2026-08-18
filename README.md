# Meadowline

A small, calm city builder that runs in a browser tab. Lay roads and rails, plant parks,
watch trains find their own way around the loop and citizens stroll between the houses.
The valley turns through spring, summer, autumn and winter while you build.
No timers, no fail state, nothing to lose.

**Play:** open `index.html`. That's the whole game — one file, no build step, no dependencies.

## How it plays

| Tool | Cost | What it does |
|---|---|---|
| Move | — | Drag to pan, scroll or pinch to zoom |
| Road | 3 | Homes only fill up when a road runs alongside them |
| Rail | 8 | Draw a loop; trains spawn and route themselves |
| House | 24 | Four residents move in as the mood rises |
| Café | 55 | Daily trade income plus a mood lift for 5 tiles |
| Park | 40 | The strongest mood lift, out to 4 tiles |
| Trees | 2 | A small, cheap lift |
| Lamp | 9 | A small lift that doubles once the light goes |
| Windmill | 95 | Grinds coin every day, and most at harvest |
| Station | 110 | Must touch a rail tile; lifts homes for 6 tiles |
| Look | — | Ask any tile how it's doing, and why |
| Remove | — | Clears a tile and refunds half |

Roads, rails and trees paint continuously while you drag. **Roads and rails cross water on
their own** — draw straight over a pond and it becomes a bridge, at three times the usual
price. A house with a `!` above it has no road yet. Each in-game day (100 seconds) pays out
tax scaled by population and mood, plus café trade and whatever the windmills ground.

Keys: `1`–`0` pick the building tools, `I` looks, `E` removes, `space` pauses, `S` cycles
speed, `M` toggles sound, `B` toggles the map, `P` saves a postcard, `Esc` closes the card,
arrows pan.

## The year

Five days to a season, twenty to a year. The grass, the trees, the sky and the water all
shift as it turns, and the season nudges everyone's mood — spring and summer lift it,
winter costs a little. Autumn is when the windmills earn their keep. Showers drift through
on their own; in winter they fall as snow and settle on the roofs. Rain keeps people indoors.

## Wishes

Two small goals sit in the corner at any time — house a few more people, open a café, get a
train running, carry a road across the water. Meet one and it pays out and quietly hands you
another. Nothing expires and nothing is lost by ignoring them.

## Under the hood

Single-file vanilla JS on a 2D canvas, isometric 44×44 grid, painter's-algorithm depth sort.
Trains and citizens walk the tile graph with a no-backtracking step rule, so a rail loop just
works and a dead end reverses. Bridges are drawn in the depth-sorted pass rather than with
the flat ground, so a raised deck layers correctly against what's behind it.

Every mood number is computed by one function that can optionally write down its own
reasoning; the Look tool just prints what it wrote, so the panel can never drift from the
simulation. Season colours are hex blends of two adjacent seasons, re-shaded downstream, so
one palette drives ground, canopy, sky, water and the minimap together.

Progress saves to `localStorage` every few seconds (guarded, so it degrades to a session-only
game where storage is blocked). Saves from the previous version load and carry over.
`prefers-reduced-motion` thins the weather, slows the windmill sails, and drops the birds and
fireflies entirely.

## Publishing this to GitHub

```bash
git init
git add index.html README.md
git commit -m "Meadowline: a calm little city builder"
gh repo create meadowline --public --source=. --push
```

Then turn on Pages: **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.
It'll be live at `https://<your-username>.github.io/meadowline/` in a minute or two.

Without the `gh` CLI, create an empty repo on github.com and:

```bash
git remote add origin https://github.com/<your-username>/meadowline.git
git branch -M main
git push -u origin main
```
