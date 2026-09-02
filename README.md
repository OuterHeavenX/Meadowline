# Meadowline

A small, calm city builder that runs in a browser tab. Lay roads and rails, plant parks,
watch trains find their own way around the loop and citizens stroll between the houses.
The valley turns through spring, summer, autumn and winter while you build.
No timers, no fail state, nothing to lose.

**Play:** serve the repository as static files and open `index.html` — for example
`python3 -m http.server` and then `http://localhost:8000`. There is no build step and no
runtime dependency; the browser loads the native ES modules directly. (Opening the file
straight off disk will not work: browsers refuse to load ES modules over `file://`.)

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
| Signal | 25 | Sits on a road; keeps a busy crossroads in order |
| Dock | 70 | Must touch water; puts boats on the lake |
| Market | 130 | Lifts what every café, bakery and workshop nearby takes |
| Bakery | 80 | Pays double with a windmill within 4 tiles |
| Farm | 60 | Grows the grain the windmills need; wants open ground |
| Sawmill | 85 | Earns from the woodland within 5 tiles; noisy neighbour |
| Workshop | 100 | Doubles its takings with a market in reach |
| Inn | 120 | Earns from the stations and docks that bring travellers |
| School | 145 | Room for two more in every home it reaches |
| Clinic | 160 | Takes most of the sting out of a crowded street |
| Well | 15 | A small, cheap comfort for the houses around it |
| Look | — | Ask any tile how it's doing, and why |
| Remove | — | Clears a tile and refunds half |

The dock groups these into **Ways**, **Homes**, **Food**, **Trade**, **Green** and
**Wonders**, with move, look and remove pinned beside them.

Tools arrive as the town grows into needing them — the café at eight citizens, rail at
twenty, the clinic at a hundred — and never go away again, so a slump costs you nothing you
had earned.

### Wonders

One of each, ever, and expensive.

| Wonder | Cost | Arrives at | What it does |
|---|---|---|---|
| Statue | 900 | 60 citizens | Cheers every home for 9 tiles |
| Clock Tower | 1600 | 120 | Every trade in the valley earns 15% more |
| Lighthouse | 2000 | 150 | Calls three more boats in; must stand on the water's edge |
| Great Library | 2600 | 200 | Room for one more in every home in the valley |

### Making a living

Every trade offers jobs and every resident wants one. Too few jobs and the mood suffers;
too few residents and every trade runs short-handed and earns less. Every building also
costs coins a day to keep, so sprawl is no longer free — build past what you earn and the
treasury drains, and once it is empty the mood takes a further knock until the books
balance. Nothing falls down and coins never go negative: the pressure is real, but there
is still no fail state.

Goods travel. **Farm → windmill → bakery** is a chain, and each link runs at half output
without the one before it. Carts leave the producers, drive the roads to a market, and
drive home again. They stop at red.

Roads, rails and trees paint continuously while you drag. **Roads and rails cross water on
their own** — draw straight over a pond and it becomes a bridge, at three times the usual
price. A house with a `!` above it has no road yet. Each in-game day (100 seconds) pays out
tax scaled by population and mood, plus café trade and whatever the windmills ground.

Keys: every tool has a letter or digit, and a shortcut for a tool in a category you aren't
looking at switches to that category first. `I` looks, `E` removes, `Z` places a signal,
`space` pauses, `S` cycles speed, `M` toggles sound, `B` toggles the map, `L` opens the
ledger, `P` saves a postcard, `Esc` closes the card, arrows pan.

## The year

Five days to a season, twenty to a year. The grass, the trees, the sky and the water all
shift as it turns, and the season nudges everyone's mood — spring and summer lift it,
winter costs a little. Autumn is when the windmills earn their keep, and sheds leaves; spring
drifts blossom. Showers drift through on their own; in winter they fall as snow and settle on
the roofs. Rain keeps people indoors, and so does the dark.

**Festivals.** The third day of each season is a festival — Spring Fair, Midsummer, Harvest
Home, Winter Lights. Every home's mood lifts, a cut of the day's trade goes into the purse,
pennants run up the roof ridges, confetti drifts by day and lanterns rise after dark.

## Wishes

Two small goals sit in the corner at any time — house a few more people, open a café, get a
train running, carry a road across the water. Meet one and it pays out and quietly hands you
another. Nothing expires and nothing is lost by ignoring them.

## Citizens

Everyone who walks the streets lives in one of your houses and has a name and a day with a
shape: out to work in the morning, out to the café, park or market in the afternoon, home at
dusk, indoors overnight. They walk real routes rather than wandering, and come back from the
market with a basket. Ask a house with **Look** and it will tell you who lives there and how
many of them are out.

## The ledger

Press `L` for three sparklines — citizens, coins and mood over the last forty days — above a
chronicle of the valley: festivals, wishes granted, population milestones, and the first time
each kind of building went up.

## Under the hood

Vanilla ES modules on a 2D canvas, isometric **128×128** grid (16,384 tiles), painter's-algorithm
depth sort. Both the ground pass and the depth-sorted pass walk only the visible band of the
grid, so a map this size costs about the same to draw as the small one did.

Buildings are modelled and lit in Blender and rendered to sprites — see `tools/README.md`.
Moving parts (the windmill's sails, the clock hands, the lighthouse beam) are still drawn by
the game over the rendered structure, and trees, parks and lamps stay hand-drawn because they
carry the season's colour. If the sprites fail to load, every building is drawn by hand
exactly as it was before.
Trains, boats and citizens share one no-backtracking step rule, so a rail loop just works and
a dead end reverses; `stepWhere` takes a predicate, which is the only difference between a
train on rails and a boat on water. Citizens layer a breadth-first `findPath` on top and only
re-plan when they arrive somewhere. Bridges are drawn in the depth-sorted pass rather than with
the flat ground, so a raised deck layers correctly against what's behind it.

Every mood number is computed by one function that can optionally write down its own
reasoning; the Look tool just prints what it wrote, so the panel can never drift from the
simulation. Season colours are hex blends of two adjacent seasons, re-shaded downstream, so
one palette drives ground, canopy, sky, water and the minimap together.

Each building owns its own tuning — radius, strength, yield — in `src/buildings/`, so the
mood model and the economy read those rather than hard-coding numbers. `tests/module-hygiene.mjs`
runs without a browser and fails the build on three things this layout can silently break:
assignment to an imported binding, re-export shim modules, and import cycles.

Save format is v3 and records its own map size. A save written on the old 44×44 grid is
detected and the town is dropped into the middle of the new map, with the terrain cleared
under each rebuilt building so nothing comes back underwater.

Progress saves to `localStorage` every few seconds (guarded, so it degrades to a session-only
game where storage is blocked). Saves from the previous version load and carry over.
`prefers-reduced-motion` thins the weather, slows the windmill sails, and drops the birds and
fireflies entirely.

## Publishing this to GitHub

```bash
git init
git add index.html src css assets README.md
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
