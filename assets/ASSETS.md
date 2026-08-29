# Meadowline Asset Pipeline

Meadowline 3.1.1 uses original procedural Three.js geometry for the production visual kit. No third-party model or texture asset is currently shipped; the authored assets listed below are original work for this repository and are not yet loaded by the runtime.

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
- Nothing loads this asset yet. The runtime still draws vegetation procedurally; wiring the glTF loader and cache in is a separate change.

Generation tooling:

- `.mcp.json` at the repository root registers the fal.ai MCP server for editor sessions that use it. It carries no credential: the `Authorization` header interpolates `FAL_KEY` from the environment, so the key stays outside the repository and each contributor supplies their own. Contributors who do not want the server can decline it when the editor asks.
- Generated output is a third-party input, subject to the record-keeping rule above before commit.

Current external dependency:

- Three.js r185.1, MIT license. Vendored module/core and license are in `assets/vendor/`.

The Canvas compatibility renderer never requires these assets. GPU meshes, materials and scene nodes are runtime presentation state and are never serialized into Save V3.
