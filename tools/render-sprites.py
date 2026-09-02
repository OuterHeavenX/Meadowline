"""Render every building to a sprite, in three passes.

    python3 tools/render-sprites.py [name ...]

base — daylight; snow — the same model dressed for winter; lit — the emissive
parts alone on black, which the game adds over the top after dark.

Writes assets/sprites/<name>-<pass>.png and assets/sprites/manifest.json. The
manifest records where the tile centre sits in each image, computed from the
camera rather than guessed, so the game can drop a sprite onto the grid.
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, recipes

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sprites")
PASSES = ("base", "snow", "lit")

def render_one(name, fn, which):
    kit.clear()
    sc = kit.setup_scene(samples=64 if which != "lit" else 24)
    cam = kit.setup_camera(sc)
    kit.setup_lights(sc, night=(which == "lit"))
    fn(recipes.Pal(snow=(which == "snow"), lit=(which == "lit")))
    kit.apply_height_boost()
    path = os.path.abspath(os.path.join(OUT, "%s-%s.png" % (name, which)))
    kit.render_to(sc, path)
    return kit.anchor_px(sc, cam)

def main():
    wanted = sys.argv[1:] or list(recipes.RECIPES)
    manifest = {"tile": kit.PX_PER_TILE, "size": list(kit.SPRITE), "sprites": {}}
    mpath = os.path.join(OUT, "manifest.json")
    if os.path.exists(mpath):
        try: manifest = json.load(open(mpath))
        except Exception: pass
    manifest.setdefault("sprites", {})
    t0 = time.time()
    for i, name in enumerate(wanted):
        fn = recipes.RECIPES[name]
        anchor = None
        for which in PASSES:
            anchor = render_one(name, fn, which)
        manifest["sprites"][name] = {"anchor": anchor, "passes": list(PASSES)}
        print("[%d/%d] %s  anchor=%s  %.0fs" % (i + 1, len(wanted), name, anchor, time.time() - t0),
              flush=True)
    manifest["tile"] = kit.PX_PER_TILE
    manifest["size"] = list(kit.SPRITE)
    os.makedirs(OUT, exist_ok=True)
    json.dump(manifest, open(mpath, "w"), indent=1, sort_keys=True)
    print("wrote", mpath, "with", len(manifest["sprites"]), "sprites")

if __name__ == "__main__":
    main()
