# Meadowline Asset Pipeline

Meadowline 3.1.1 uses original procedural Three.js geometry for most of the production visual kit, with an authored landmark kit for the buildings whose silhouette carries a city. No third-party model or texture asset is currently shipped; every authored asset listed below is original work for this repository.

Future authored landmark assets use this static pipeline:

`Blender source (.blend) → glTF Binary (.glb) → native Three.js loader/cache`

- Source units: meters; one Meadowline tile is one unit.
- Axes: Y up, building front faces +Z, origin at footprint center on ground level.
- Apply transforms before export; triangulate deterministically; omit cameras and lights.
- Prefer one shared material family per asset category and compact atlases over unique textures.
- Suggested budgets: 1×1 building ≤ 1,500 triangles, large civic facility ≤ 6,000, prop ≤ 250, tree ≤ 500.
- Provide a simplified far LOD for authored assets above 1,500 triangles.
- Export production files beneath `assets/models/`; sources live beneath `assets/source/blender/`.
- Any third-party input requires commercial redistribution permission, source URL, license text, attribution requirements and modification notes in this file before commit.

Authored assets:

- `assets/models/vegetation/tree-lowpoly.glb` — 184 triangles, three materials, 1.04 units tall, 0.89 units across so it sits inside its tile. Original work for this repository, so the third-party rule above does not apply to it. Its shape, proportions and palette copy the procedural tree in `src/rendering/three-world-art.js` deliberately: an authored tree has to stand in a frame with hundreds of procedural ones.
- Source of record is `assets/source/blender/tree_lowpoly.py`, not a `.blend`. The script regenerates both files from an empty scene with a fixed seed, and the exported `.glb` comes out byte-identical every run while a `.blend` does not — Blender stores per-session state, so a committed one would churn on every rebuild without any change in the mesh. The `.blend` is therefore gitignored as a build product. Run `python3 assets/source/blender/tree_lowpoly.py` (with `bpy` installed) or `blender -b -P assets/source/blender/tree_lowpoly.py`.
- The runtime draws it. `src/rendering/tree-asset.js` builds the geometry and `three-world-art.js` emits every tree in the valley as two instanced meshes, replacing the procedural vegetation on the GPU renderer. The Canvas fallback still draws its own 2D trees; it has no mesh pipeline to load into.
- The authored building kit: twenty-three models under `assets/models/civic/` and `assets/models/buildings/`, 104 to 872 triangles each, all inside the budgets above. Homes in their three tiers, the four trades, the school, the station, the dock, the four levels of the civic centre, the four municipal facilities, the two ends of the food chain and the four Wonders. Original work for this repository. Source of record is `assets/source/blender/landmarks.py`, which builds every model from an empty scene with no randomness anywhere in it, so a regenerated asset diffs cleanly or not at all. Run `python3 assets/source/blender/landmarks.py` for all of them or name the ones you want.
- They follow the tree's convention exactly: the script emits the `.glb` and a generated `src/rendering/assets/<id>.mesh.js` in one run, `src/rendering/landmark-assets.js` builds one geometry per building with one group per colour, and `three-world-art.js` draws it in place of the hand-built primitive recipe that stood in for it. Those recipes remain as the fallback for everything not yet modelled — and as the thing the models were matched against, so an authored building and a procedural one sit in the same frame without a style break.
- Two parts are deliberately left out of the meshes and still drawn by the renderer: the windmill's sails, which turn, and the traffic signals' lamps, which change colour. A fixed mesh can do neither. The model leaves a hub for the sails to hang on.
- A building whose look depends on its state is a model per state, not one model scaled: the three housing tiers differ by a porch and a dormer, and the four City Hall levels by a portico, a clock and a cupola, because that is what upgrading one is meant to show. `landmarkKey()` in `src/rendering/landmark-assets.js` is the one place that mapping lives.
- Each trade has its own massing, not one shape in four colours: the café has tables out on the pavement, the market an open canopy over crates, the bakery a gable and an oven flue, the station a platform and a clock. `tests/visual-cohesion-regression.js` asserts they stay distinguishable by silhouette alone, which is what caught them when they were not.
- Colours marked emissive in the script (the clock faces, the lighthouse lantern) become emissive materials the renderer brightens on the same night curve as its procedural windows, so a wonder is not the only thing in the valley lit at noon.
- It is loaded from `src/rendering/assets/tree-lowpoly.mesh.js`, generated by the same script, rather than from the `.glb`. Meadowline has no build step and a synchronous render path, so a glTF loader would mean vendoring 180 KB of unminified GLTFLoader - with Draco, KTX2 and skinning support - for one static mesh, and fetching the `.glb` would mean the first frames draw a tree that has not arrived. The `.glb` remains the interchange artifact and the two cannot drift, being emitted from one script in one run. If enough authored assets accumulate to justify a real loader, `treeAsset()` and `landmarkAsset()` are the seams to swap: nothing calling either knows where the geometry came from.

Generation tooling:

- `.mcp.json` at the repository root registers the MCP servers used for asset work. It carries no credential of any kind, and none should ever be added to it: the fal.ai entry interpolates `FAL_KEY` from the environment, so keys stay outside the repository and each contributor supplies their own. Every server in it is optional — the editor asks before starting any of them, and declining costs nothing, since no part of the game, the tests or the (nonexistent) build depends on them.
- `fal-ai` reaches fal.ai's hosted MCP endpoint over HTTPS for image and model generation. Requires `FAL_KEY` in the environment and `npx` on PATH.
- `blender` (github.com/ahujasid/blender-mcp, MIT) drives a desktop Blender over a socket the addon opens. It needs Blender 3.0+ running locally with the addon enabled and its server started; it does nothing in a cloud session, and nothing against the `bpy` module either, which has no addon and no socket. `uvx` must be on PATH.
- Two cautions on that server. Its `execute_blender_code` tool runs arbitrary Python inside Blender, so approve it per session rather than blanket-allowing it, and save work first. Its Sketchfab, Hyper3D Rodin and Hunyuan3D integrations download models into the scene: those are third-party inputs and most carry licenses this project cannot use unmodified. Poly Haven is CC0 and safe; Sketchfab licenses vary per model and many are non-commercial. Check before anything downloaded reaches a commit.
- Generated output is a third-party input, subject to the record-keeping rule above before commit.

Current external dependency:

- Three.js r185.1, MIT license. Vendored module/core and license are in `assets/vendor/`.

The Canvas compatibility renderer never requires these assets. GPU meshes, materials and scene nodes are runtime presentation state and are never serialized into Save V3.
