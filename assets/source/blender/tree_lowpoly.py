"""Low-poly tree for the Meadowline vegetation kit.

Runs headless either way:

    python3 assets/source/blender/tree_lowpoly.py     # bpy as a pip module
    blender -b -P assets/source/blender/tree_lowpoly.py

It writes tree_lowpoly.blend beside itself and tree-lowpoly.glb into
assets/models/vegetation/.

The shape deliberately copies the procedural tree in
src/rendering/three-world-art.js rather than inventing a look: a seven-sided
tapered trunk under a large canopy lobe with a smaller lighter one tucked
beside it, in the same palette. Anything authored has to sit next to hundreds
of procedural trees in the same frame, so matching them is the whole job.

Deterministic by construction. The vertex jitter that keeps the lobes from
reading as billiard balls runs off a fixed seed, so the same script always
produces byte-identical geometry and a regenerated asset diffs cleanly.
"""

import math
import os
import random
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
BLEND_OUT = os.path.join(HERE, "tree_lowpoly.blend")
GLB_OUT = os.path.join(REPO, "assets", "models", "vegetation", "tree-lowpoly.glb")

# src/core/constants.js C.trunk, and two neighbouring greens from the canopy
# palette in three-world-art.js. Keeping the highlight one step along that
# array is what the procedural two-lobe variant does.
TRUNK = "#7a5c43"
CANOPY = "#4b9158"
CANOPY_HI = "#62a05d"

# Blender is Z-up and one tile is one unit, so these are the world-art numbers
# unchanged. The glTF exporter converts to Y-up on the way out.
TRUNK_RADIUS_BASE = 0.075
TRUNK_RADIUS_TOP = 0.05
TRUNK_HEIGHT = 0.5
TRUNK_SIDES = 7

JITTER = 0.075
SEED = 20260829


def srgb_to_linear(component):
    """Blender stores linear colour; the palette is sRGB hex."""
    if component <= 0.04045:
        return component / 12.92
    return ((component + 0.055) / 1.055) ** 2.4


def material(name, hex_colour, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    raw = hex_colour.lstrip("#")
    rgb = tuple(srgb_to_linear(int(raw[i:i + 2], 16) / 255.0) for i in (0, 2, 4))
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def clear_scene():
    """Cameras and lights are excluded from the pipeline, and the startup file
    ships one of each plus a cube."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for item in list(block):
            block.remove(item)


def jitter_mesh(obj, rng, amount):
    """Push each vertex a little along its own direction from the lobe centre.
    Radial rather than random-walk, so the silhouette stays convex and the
    facets stay readable instead of turning into noise."""
    for vertex in obj.data.vertices:
        direction = vertex.co.normalized() if vertex.co.length > 1e-6 else None
        if direction is None:
            continue
        vertex.co += direction * rng.uniform(-amount, amount)


def build_trunk(mat):
    bpy.ops.mesh.primitive_cone_add(
        vertices=TRUNK_SIDES,
        radius1=TRUNK_RADIUS_BASE,
        radius2=TRUNK_RADIUS_TOP,
        depth=TRUNK_HEIGHT,
        location=(0.0, 0.0, TRUNK_HEIGHT / 2.0),
    )
    trunk = bpy.context.active_object
    trunk.name = "TreeTrunk"
    trunk.data.materials.append(mat)
    # A slight lean reads as growth rather than as a fencepost. Pivot at the
    # base, not the midpoint, so leaning does not lift the trunk off the ground
    # or bury it.
    bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    trunk.rotation_euler[0] = math.radians(1.6)
    return trunk


def build_lobe(name, mat, centre, radius, scale, rng):
    # Subdivision 2 (80 faces). One step down is the bare 20-face icosahedron,
    # which reads as a die rather than a canopy; one step up triples the count
    # for a silhouette nobody can tell apart at the zoom the game plays at.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=centre)
    lobe = bpy.context.active_object
    lobe.name = name
    lobe.scale = scale
    jitter_mesh(lobe, rng, JITTER * radius / 0.4)
    lobe.data.materials.append(mat)
    return lobe


def triangle_count(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def build():
    clear_scene()
    rng = random.Random(SEED)

    trunk_mat = material("MeadowlineTrunk", TRUNK, 0.85)
    canopy_mat = material("MeadowlineCanopy", CANOPY, 0.78)
    canopy_hi_mat = material("MeadowlineCanopyHighlight", CANOPY_HI, 0.78)

    parts = [
        build_trunk(trunk_mat),
        # Proportions from the procedural sphere variant: the main lobe sits at
        # 0.78 with radius 0.4, the smaller one offset and slightly lower.
        # Squashed rather than spherical, because a true sphere reads as a
        # lollipop from the shallow angle the camera actually sits at.
        build_lobe("TreeCanopy", canopy_mat, (0.0, 0.0, 0.74), 0.34,
                   (1.0, 0.96, 0.88), rng),
        # Pushed further out than the procedural version places it. On screen
        # that one is a hint of a second mass; at this radius, anything tucked
        # closer in disappears inside the main lobe entirely and costs 80
        # triangles to not be seen.
        build_lobe("TreeCanopyHigh", canopy_hi_mat, (-0.24, 0.10, 0.62), 0.21,
                   (1.0, 1.0, 0.92), rng),
    ]

    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()

    tree = bpy.context.active_object
    # Both the object and its mesh datablock: join() keeps the active object's
    # mesh name, so without this the exported glTF mesh is called "Cone".
    tree.name = "TreeLowPoly"
    tree.data.name = "TreeLowPoly"

    # Faceted, not smoothed: the flat shading is the low-poly look, and it also
    # keeps the exported normals to one per face.
    bpy.ops.object.shade_flat()

    # Deterministic triangulation, then transforms applied, so the exported
    # mesh needs no fixing up at load time.
    modifier = tree.modifiers.new("Triangulate", "TRIANGULATE")
    modifier.quad_method = "FIXED"
    modifier.ngon_method = "CLIP"
    bpy.ops.object.modifier_apply(modifier="Triangulate")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Origin at the footprint centre on the ground, per assets/ASSETS.md. The
    # lean leaves the lowest vertex a hair off zero, so the mesh is settled
    # onto the ground plane in mesh space and the object origin left at zero.
    lowest = min(v.co.z for v in tree.data.vertices)
    for vertex in tree.data.vertices:
        vertex.co.z -= lowest
    tree.location = (0.0, 0.0, 0.0)

    return tree


def export(tree):
    os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
    )


def main():
    tree = build()
    tris = triangle_count(tree)
    lo = min(v.co.z for v in tree.data.vertices)
    hi = max(v.co.z for v in tree.data.vertices)
    width = max(max(abs(v.co.x), abs(v.co.y)) for v in tree.data.vertices) * 2
    export(tree)
    print(f"triangles      {tris} (budget 500)")
    print(f"height         {hi - lo:.3f} units")
    print(f"base at z      {lo:.4f}")
    print(f"widest span    {width:.3f} units")
    print(f"materials      {len(tree.data.materials)}")
    print(f"wrote          {BLEND_OUT}")
    print(f"wrote          {GLB_OUT}")
    if tris > 500:
        sys.exit(f"over the vegetation triangle budget: {tris} > 500")
    if width > 1.0:
        sys.exit(f"canopy overhangs its tile: {width:.3f} > 1.0 units")
    if abs(lo) > 1e-6:
        sys.exit(f"base is not on the ground plane: z={lo:.5f}")


if __name__ == "__main__":
    main()
