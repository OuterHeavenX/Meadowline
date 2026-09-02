"""The buildings whose silhouette carries a city: Meadowline's landmark kit.

Runs headless either way:

    python3 assets/source/blender/landmarks.py            # bpy as a pip module
    python3 assets/source/blender/landmarks.py statue     # just these
    blender -b -P assets/source/blender/landmarks.py

For each model it writes a .glb beneath assets/models/ and a generated mesh
module beneath src/rendering/assets/, exactly as tree_lowpoly.py does and for
exactly the same reasons: the .glb is the interchange artifact, the module is
what the game imports, and one script emitting both is what stops them
drifting. See assets/ASSETS.md.

Authoring convention, from that document: Blender is Z-up, one Meadowline tile
is one unit, the origin is the middle of the footprint at ground level, and the
front of a building faces +Y here (which the Y-up conversion turns into +Z).
Everything is deterministic - no randomness anywhere in this file - so a
regenerated asset diffs cleanly or not at all.

The four Wonders and the two ends of the food chain are modelled. Trees, lamps,
roads and the recreation lots stay procedural in the renderer: they carry
seasonal colour or they are laid out from their footprint at run time, and a
fixed mesh can do neither.
"""

import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
MESH_DIR = os.path.join(REPO, "src", "rendering", "assets")

# Shared palette. One family across the kit, per the asset rules, so a wonder
# built today stands beside one built later without a colour shift.
CREAM = "#efe7d2"
STONE = "#e3dac4"
PALE = "#f2ecd9"
SLATE = "#5c7183"
LEAD = "#4a5a63"
BRICK = "#a8483a"
BRICK_DARK = "#8f3d30"
GOLD = "#e0ae4e"
BRONZE = "#7d6a3f"
WARM = "#ffe6ad"
HEDGE = "#5f8b46"
TIMBER = "#75594b"
CROP = "#87a44a"
FURROW = "#6b5738"
SILO = "#cfc6ae"
SILO_CAP = "#a99f88"
LINEN = "#e9e2cd"
KEEPER = "#e4dcc8"
MILL_BODY = "#d3c6aa"
LOT = "#78a961"
WHITE = "#f4f0e2"
RED = "#c9564a"
DOME = "#8fa9b2"

# Emissive materials: the game reads the flag, not the strength, and turns
# these into the same glowing material its procedural windows use.
LIT = {WARM}


def srgb_to_linear(component):
    """Blender stores linear colour; the palette is sRGB hex."""
    if component <= 0.04045:
        return component / 12.92
    return ((component + 0.055) / 1.055) ** 2.4


def material(hex_colour, roughness=0.85, metallic=0.0):
    name = "ML" + hex_colour.lstrip("#").upper()
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    h = hex_colour.lstrip("#")
    rgb = tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if hex_colour in LIT:
        bsdf.inputs["Emission Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.0
    mat["meadowline_hex"] = hex_colour
    return mat


# ---------- primitives, all standing ON z rather than centred on it ----------

def _made(obj, colour):
    obj.data.materials.clear()
    obj.data.materials.append(material(colour))
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def box(colour, x=0.0, y=0.0, z=0.0, w=1.0, d=1.0, h=1.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + h / 2))
    obj = bpy.context.object
    obj.scale = (w, d, h)
    bpy.ops.object.transform_apply(scale=True)
    return _made(obj, colour)


def cylinder(colour, x=0.0, y=0.0, z=0.0, r=0.5, h=1.0, sides=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=r, depth=h,
                                        location=(x, y, z + h / 2))
    return _made(bpy.context.object, colour)


def cone(colour, x=0.0, y=0.0, z=0.0, r=0.5, h=1.0, sides=12):
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r, radius2=0.0, depth=h,
                                    location=(x, y, z + h / 2))
    return _made(bpy.context.object, colour)


def dome(colour, x=0.0, y=0.0, z=0.0, r=0.5, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=r,
                                          location=(x, y, z))
    return _made(bpy.context.object, colour)


def rotate_y(obj, angle, about):
    """Turn a part about a point of its own, in mesh space.

    box() applies its transform, which leaves the object origin back at the
    world origin - so setting rotation_euler on one afterwards swings it around
    the middle of the map instead of around its own shoulder, and the part ends
    up a whole unit away from the body it belongs to.
    """
    ax, az = about[0], about[2]
    c, s = math.cos(angle), math.sin(angle)
    for vertex in obj.data.vertices:
        x, z = vertex.co.x - ax, vertex.co.z - az
        vertex.co.x = ax + x * c + z * s
        vertex.co.z = az - x * s + z * c
    return obj


def gable(colour, x=0.0, y=0.0, z=0.0, w=1.0, d=1.0, h=1.0):
    """A ridged roof: a triangular prism with the ridge running along X."""
    verts = [(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, d / 2, 0), (-w / 2, d / 2, 0),
             (-w / 2, 0, h), (w / 2, 0, h)]
    faces = [(3, 2, 1, 0), (0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5)]
    mesh = bpy.data.meshes.new("gable")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("gable", mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = (x, y, z)
    return _made(obj, colour)


# ---------------------------- the models ----------------------------

def statue():
    """2x2. A bronze figure on a tiered pedestal inside a hedged green."""
    box(PALE, 0, 0, 0, 1.9, 1.9, 0.06)
    for x, y, w, d in ((-0.9, 0, 0.1, 1.8), (0.9, 0, 0.1, 1.8),
                       (0, -0.9, 1.8, 0.1), (0, 0.9, 1.8, 0.1)):
        box(HEDGE, x, y, 0.06, w, d, 0.14)
    box(PALE, 0, 0, 0.06, 0.95, 0.95, 0.1)
    box(STONE, 0, 0, 0.16, 0.62, 0.62, 0.14)
    box(STONE, 0, 0, 0.30, 0.4, 0.4, 0.62)
    # The figure is one tapering body. At the size a wonder is actually seen a
    # jointed one reads as a scatter of sticks rather than a person.
    cylinder(BRONZE, 0, 0, 0.92, 0.15, 0.34, 10)
    box(BRONZE, 0, 0, 1.26, 0.2, 0.16, 0.24)
    dome(BRONZE, 0, 0, 1.6, 0.1)
    # The raised arm is laid out along X from the shoulder and then turned
    # about that shoulder, so its inner end stays on the body whatever the
    # angle is.
    length, angle = 0.32, math.radians(48)
    sx, sz = 0.09, 1.42
    arm = box(BRONZE, sx + length / 2, 0, sz - 0.035, length, 0.07, 0.07)
    rotate_y(arm, -angle, (sx, 0, sz))
    box(BRONZE, -0.14, 0, 1.14, 0.07, 0.07, 0.26)


def clock_tower():
    """2x2. Tall enough to be the tallest thing on its street, which is what
    stops a wonder reading as a large building."""
    box(PALE, 0, 0, 0, 1.8, 1.8, 0.06)
    box(STONE, 0, 0, 0.06, 0.88, 0.88, 0.42)
    box(CREAM, 0, 0, 0.48, 0.6, 0.6, 1.5)
    for i in range(1, 5):
        box(STONE, 0, 0, 0.48 + i * 0.3, 0.64, 0.64, 0.04)
    # A face on each side, emissive, so the tower reads after dark the way the
    # Canvas renderer's lit clock does.
    for x, y, w, d in ((0, 0.305, 0.32, 0.03), (0, -0.305, 0.32, 0.03),
                       (0.305, 0, 0.03, 0.32), (-0.305, 0, 0.03, 0.32)):
        box(WARM, x, y, 1.5, w, d, 0.32)
    box(STONE, 0, 0, 1.98, 0.76, 0.76, 0.3)
    for x, y, w, d in ((0, 0.38, 0.5, 0.03), (0, -0.38, 0.5, 0.03),
                       (0.38, 0, 0.03, 0.5), (-0.38, 0, 0.03, 0.5)):
        box(LEAD, x, y, 2.02, w, d, 0.2)
    cone(SLATE, 0, 0, 2.28, 0.56, 0.66, 4)
    dome(GOLD, 0, 0, 3.0, 0.06)
    box(TIMBER, 0, 0.45, 0.06, 0.22, 0.03, 0.3)


def lighthouse():
    """2x2, waterside. Six short courses rather than three tall ones: three
    read as a stack of tins, six read as a cone."""
    box(PALE, 0, 0, 0, 1.8, 1.8, 0.06)
    box(KEEPER, -0.52, -0.42, 0.06, 0.5, 0.42, 0.3)
    gable(SLATE, -0.52, -0.42, 0.36, 0.56, 0.48, 0.16)
    z = 0.06
    for i, r in enumerate((0.34, 0.31, 0.28, 0.25, 0.22, 0.2)):
        cylinder(RED if i % 2 else WHITE, 0, 0, z, r, 0.26, 14)
        z += 0.26
    cylinder(LEAD, 0, 0, z, 0.26, 0.05, 14)
    z += 0.05
    cylinder(WARM, 0, 0, z, 0.17, 0.22, 12)
    cone(LEAD, 0, 0, z + 0.22, 0.21, 0.2, 12)


def great_library():
    """3x3. A colonnade all the way round, because the player can turn the city
    and a portico on one face only would be a facade with a back to it."""
    box(PALE, 0, 0, 0, 2.85, 2.85, 0.06)
    box(STONE, 0, 0, 0.06, 2.5, 2.5, 0.14)
    # The wall stands well inside the colonnade. Set flush with it the columns
    # disappear into the block and the building reads as a plain box with a
    # dome on it, which is what the whole shape is for.
    box(CREAM, 0, 0, 0.2, 1.56, 1.56, 0.86)
    for i in range(-2, 3):
        for s in (-1, 1):
            cylinder(PALE, i * 0.45, s * 1.02, 0.2, 0.08, 0.86, 8)
            cylinder(PALE, s * 1.02, i * 0.45, 0.2, 0.08, 0.86, 8)
    box(STONE, 0, 0, 1.06, 2.3, 2.3, 0.12)
    cylinder(STONE, 0, 0, 1.18, 0.46, 0.26, 16)
    dome(DOME, 0, 0, 1.72, 0.42)
    dome(GOLD, 0, 0, 2.18, 0.07)
    for i in (-1, 0, 1):
        box(WARM, i * 0.4, 0.8, 0.42, 0.22, 0.03, 0.4)


def farm():
    """3x3. Land-hungry on purpose - the bigger valley is what it is for."""
    box(CROP, 0, 0, 0, 2.82, 2.82, 0.06)
    for i in range(-3, 4):
        box(FURROW, 0, i * 0.36, 0.06, 2.6, 0.06, 0.015)
    box(BRICK, -0.84, 0.84, 0.06, 0.72, 0.6, 0.5)
    gable(BRICK_DARK, -0.84, 0.84, 0.56, 0.8, 0.66, 0.26)
    box(LINEN, -0.84, 0.53, 0.1, 0.28, 0.03, 0.32)
    cylinder(SILO, -0.16, 0.86, 0.06, 0.17, 0.92, 12)
    cone(SILO_CAP, -0.16, 0.86, 0.98, 0.19, 0.18, 12)


def windmill():
    """1x1. The sails are left off: they turn, and the renderer draws them
    against the hub this leaves at the front."""
    box(LOT, 0, 0, 0, 0.94, 0.94, 0.05)
    cylinder(MILL_BODY, 0, 0, 0.05, 0.3, 0.74, 12)
    cone(TIMBER, 0, 0, 0.79, 0.34, 0.24, 12)
    hub = cylinder(TIMBER, 0, -0.3, 0.62, 0.05, 0.12, 8)
    hub.rotation_euler = (math.pi / 2, 0, 0)


MODELS = {
    "statue": (statue, "civic", 1500),
    "clockTower": (clock_tower, "civic", 1500),
    "lighthouse": (lighthouse, "civic", 2500),
    "greatLibrary": (great_library, "civic", 6000),
    "farm": (farm, "buildings", 2500),
    "mill": (windmill, "buildings", 1500),
}


# ---------------------------- build and emit ----------------------------

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def join_all(name):
    """One object per model, so the mesh module comes out with one material
    list and the renderer builds one geometry with one group per colour."""
    objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return joined


def export_glb(obj, category, name):
    out = os.path.join(REPO, "assets", "models", category, name + ".glb")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_animations=False,
    )
    return out


def write_mesh_module(obj, name):
    """The mesh as an ES module of plain arrays, per assets/ASSETS.md.

    Flat shading means face normals, so vertices are not shared and the mesh is
    written unindexed - the same form tree-lowpoly.mesh.js takes, so one
    loader in the renderer reads both."""
    mesh = obj.data
    mesh.calc_loop_triangles()
    try:
        normals = mesh.corner_normals
    except AttributeError:      # older builds expose it under the split name
        mesh.calc_normals_split()
        normals = mesh.loops

    groups = [[] for _ in mesh.materials]
    for triangle in mesh.loop_triangles:
        groups[triangle.material_index].append(triangle)

    positions, norms, ranges, colours = [], [], [], []
    for index, triangles in enumerate(groups):
        if not triangles:
            continue
        start = len(positions) // 3
        for triangle in triangles:
            for loop_index in triangle.loops:
                vertex = mesh.vertices[mesh.loops[loop_index].vertex_index]
                normal = (normals[loop_index].vector if hasattr(normals[loop_index], "vector")
                          else normals[loop_index].normal)
                # Blender is Z-up, three.js is Y-up. The same swap the glTF
                # exporter applies, done here so both outputs agree.
                positions.extend((vertex.co.x, vertex.co.z, -vertex.co.y))
                norms.extend((normal.x, normal.z, -normal.y))
        ranges.append([start, len(positions) // 3 - start, len(colours)])
        material_slot = mesh.materials[index]
        colours.append(material_slot["meadowline_hex"])

    def fmt(values):
        return ",".join(f"{v:.4f}".rstrip("0").rstrip(".") or "0" for v in values)

    os.makedirs(MESH_DIR, exist_ok=True)
    out = os.path.join(MESH_DIR, name + ".mesh.js")
    with open(out, "w") as f:
        f.write("/* Generated by assets/source/blender/landmarks.py - do not edit.\n")
        f.write("   Regenerate with: python3 assets/source/blender/landmarks.py " + name + "\n\n")
        f.write("   The same mesh as the .glb beside it under assets/models/, in the\n")
        f.write("   form the renderer can import without a loader or a fetch. Y-up,\n")
        f.write("   unindexed (flat shading gives every face its own normals), grouped\n")
        f.write("   by material so one geometry draws the whole building. */\n")
        f.write(f"export const TRIANGLES={len(mesh.loop_triangles)};\n")
        f.write("export const COLORS=[" + ",".join(f"'{c}'" for c in colours) + "];\n")
        f.write("export const LIT=[" + ",".join("1" if c in LIT else "0" for c in colours) + "];\n")
        f.write("export const GROUPS=" + repr(ranges).replace(" ", "") + ";\n")
        f.write("export const POSITIONS=new Float32Array([" + fmt(positions) + "]);\n")
        f.write("export const NORMALS=new Float32Array([" + fmt(norms) + "]);\n")
    return out, len(mesh.loop_triangles)


def build(name):
    build_fn, category, budget = MODELS[name]
    reset()
    build_fn()
    obj = join_all(name)
    lowest = min(v.co.z for v in obj.data.vertices)
    if abs(lowest) > 1e-4:
        sys.exit(f"{name}: base is not on the ground plane: z={lowest:.5f}")
    glb = export_glb(obj, category, name)
    module, triangles = write_mesh_module(obj, name)
    if triangles > budget:
        sys.exit(f"{name}: over its triangle budget: {triangles} > {budget}")
    height = max(v.co.z for v in obj.data.vertices)
    print(f"{name:<14} {triangles:>5} tris (budget {budget})  {height:.2f} units tall"
          f"  {os.path.getsize(glb):>6} B glb  {os.path.getsize(module):>6} B module")


def main():
    wanted = [a for a in sys.argv[1:] if not a.startswith("-")]
    unknown = [n for n in wanted if n not in MODELS]
    if unknown:
        sys.exit("unknown model(s): " + ", ".join(unknown))
    for name in (wanted or list(MODELS)):
        build(name)


if __name__ == "__main__":
    main()
