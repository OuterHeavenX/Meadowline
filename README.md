# Meadowline

A small, calm city builder that runs in a browser tab. Lay roads and rails, plant parks,
watch trains find their own way around the loop and citizens stroll between the houses.
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
| Station | 110 | Must touch a rail tile; lifts homes for 6 tiles |
| Remove | — | Clears a tile and refunds half |

Roads, rails and trees paint continuously while you drag. A house with a `!` above it has
no road yet. Each in-game day (100 seconds) pays out tax scaled by population and mood.

Keys: `1`–`9` pick tools, `space` pauses, `S` cycles speed, `M` toggles sound, arrows pan.

## Under the hood

Single-file vanilla JS on a 2D canvas, isometric 44×44 grid, painter's-algorithm depth sort.
Trains and citizens walk the tile graph with a no-backtracking step rule, so a rail loop just
works and a dead end reverses. Progress saves to `localStorage` every few seconds (guarded, so
it degrades to a session-only game where storage is blocked).

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
