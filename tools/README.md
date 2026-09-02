# Rendering the building sprites

The buildings are modelled and lit in Blender and rendered to sprites the game
draws onto its tile grid. Nothing here runs at play time — the output is
committed under `assets/sprites/`, and the game falls back to drawing every
building by hand if those files are missing.

    pip install bpy==4.2.0          # Blender as a Python module, needs Python 3.11
    python3 tools/render-sprites.py            # all of them, about a minute
    python3 tools/render-sprites.py mill farm  # just these

Three passes per building:

- **base** — daylight.
- **snow** — the same model dressed for winter; the game cross-fades to it as
  the season turns.
- **lit** — the emissive parts alone on black. The game adds this back over the
  night tint, so windows glow rather than being tinted dark with everything else.
  Black adds nothing under `lighter`, which is why the silhouette can stay solid.

`kit.py` holds the scene, the camera and the parts buildings are made of;
`recipes.py` is one function per building. The camera is orthographic at 45°
azimuth and 30° elevation — the 2:1 dimetric projection the canvas uses — so a
sprite drops onto the grid without distortion. Two things are easy to get wrong
and are handled in `kit.py`:

- A 1×1 tile is axis-aligned but the camera looks along the diagonal, so the
  tile spans √2 world units across the frame. `ortho_scale` carries that factor;
  without it every building comes out 1.41× too big.
- One world unit of height only reaches 0.61 of a tile once the tilt is taken
  out, which reads squat, so models are stretched slightly in Z.

Anchors are computed with `world_to_camera_view` rather than guessed, and written
to `manifest.json` so the game knows where the tile centre sits in each image.

Moving parts are deliberately **not** baked in: the windmill's sails, the
sawmill's blade, the clock tower's hands and the lighthouse beam are still drawn
by the game over the rendered structure, so they keep turning. Trees, parks and
lamps are not sprites either — they carry the season's colour and are re-tinted
every frame.
