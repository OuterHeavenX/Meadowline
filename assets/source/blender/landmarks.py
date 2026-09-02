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


def rotate_x(obj, angle, about):
    """The same turn about the X axis, for anything that slopes forward -
    an awning over a pavement, a crane arm over the water."""
    ay, az = about[1], about[2]
    c, s = math.cos(angle), math.sin(angle)
    for vertex in obj.data.vertices:
        y, z = vertex.co.y - ay, vertex.co.z - az
        vertex.co.y = ay + y * c - z * s
        vertex.co.z = az + y * s + z * c
    return obj


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


# ---------------------------- the everyday town ----------------------------
# These are what the player actually looks at: a valley is mostly homes and
# shopfronts, and a wonder among plain boxes reads as a wonder among plain
# boxes. Modelled to the same palette and the same flat-shaded look as the
# recipes they replace, so the two can stand in one street.

WALL_A = "#ead8b8"
WALL_B = "#d8c7a9"
WALL_C = "#c8d4c7"
ROOF_A = "#8c5042"
ROOF_B = "#50637a"
ROOF_C = "#745649"
SIDEWALK = "#cfd1ca"
GRASS_LOT = "#78a961"
SHOP_CAFE = "#c98666"
SHOP_MARKET = "#9db7a5"
SHOP_BAKERY = "#d8b56f"
SHOP_STATION = "#aaa99e"
AWNING_CAFE = "#7e3f36"
AWNING_MARKET = "#4f765e"
AWNING_BAKERY = "#9a633d"
AWNING_STATION = "#576b76"
DOOR = "#725342"
GLASS = "#9fc0cc"


def _lot(w=0.94, d=0.94):
    box(GRASS_LOT, 0, 0, 0, w, d, 0.05)
    box(SIDEWALK, 0, d * 0.34, 0.05, 0.22, d * 0.3, 0.012)


def _house(storeys, wall, roof, chimney):
    """One home. The tiers differ in height and in what they have grown - a
    porch, a dormer, a second chimney - rather than only in size, so a street
    of upgraded homes reads as a street that has been lived in."""
    _lot()
    height = (0.42, 0.66, 0.9)[storeys - 1]
    box(wall, 0, 0, 0.05, 0.62, 0.56, height)
    gable(roof, 0, 0, 0.05 + height, 0.72, 0.64, 0.24)
    box(DOOR, 0, -0.29, 0.05, 0.16, 0.03, 0.26)
    for i in (-1, 1):
        box(GLASS, i * 0.19, -0.285, 0.22, 0.14, 0.02, 0.16)
        if storeys >= 2:
            box(GLASS, i * 0.19, -0.285, 0.22 + 0.3, 0.14, 0.02, 0.16)
        box(GLASS, 0.315, i * 0.14, 0.22, 0.02, 0.14, 0.16)
    if chimney:
        box(ROOF_C, 0.2, 0.16, 0.05 + height, 0.1, 0.1, 0.28)
    if storeys >= 2:
        # a porch over the door
        box(wall, 0, -0.34, 0.05, 0.3, 0.12, 0.3)
        gable(roof, 0, -0.34, 0.35, 0.36, 0.18, 0.08)
    if storeys >= 3:
        # a dormer in the roof, which is what an established home has grown
        box(wall, -0.16, -0.12, 0.05 + height, 0.18, 0.2, 0.16)
        gable(roof, -0.16, -0.12, 0.21 + height, 0.22, 0.24, 0.08)
        box(ROOF_C, -0.24, 0.2, 0.05 + height, 0.09, 0.09, 0.24)


def house_1():
    _house(1, WALL_A, ROOF_A, True)


def house_2():
    _house(2, WALL_B, ROOF_B, True)


def house_3():
    _house(3, WALL_C, ROOF_C, True)


def _shopfront(wall, height=0.6, depth=0.62):
    """The part every trade shares: a lot, a block and a glazed front."""
    _lot()
    box(wall, 0, 0, 0.05, 0.7, depth, height)
    box(GLASS, 0, -depth / 2 - 0.01, 0.12, 0.46, 0.03, 0.34)
    box(DOOR, 0.24, -depth / 2 - 0.015, 0.05, 0.16, 0.03, 0.3)
    return height


def cafe():
    """A flat parapet, a striped awning, and tables out on the pavement. The
    tables are the read: a cafe is the trade you can see people sitting at."""
    height = _shopfront(SHOP_CAFE)
    box(AWNING_CAFE, 0, 0, 0.05 + height, 0.76, 0.68, 0.07)
    canopy = box(AWNING_CAFE, 0, -0.42, 0.48, 0.62, 0.22, 0.03)
    rotate_x(canopy, math.radians(18), (0, -0.31, 0.5))
    for i in (-1, 1):
        box(AWNING_CAFE, i * 0.29, -0.32, 0.05, 0.03, 0.03, 0.43)
    for i in (-1, 1):
        cylinder("#f0e2c8", i * 0.22, -0.42, 0.05, 0.03, 0.16, 6)
        cylinder("#f0e2c8", i * 0.22, -0.42, 0.21, 0.1, 0.02, 10)
        for q in (-1, 1):
            cylinder(DOOR, i * 0.22 + q * 0.13, -0.42, 0.05, 0.025, 0.11, 6)


def market():
    """No shopfront at all: a low building behind an open canopy on posts,
    with the produce crates stacked under it."""
    _lot()
    box(SHOP_MARKET, 0, 0.16, 0.05, 0.66, 0.34, 0.44)
    box(AWNING_MARKET, 0, 0.16, 0.49, 0.72, 0.4, 0.06)
    box(GLASS, 0, -0.02, 0.16, 0.4, 0.02, 0.24)
    # the canopy over the stalls, sloping out to the street
    for i in (-1, 1):
        box(SHOP_MARKET, i * 0.3, -0.36, 0.05, 0.04, 0.04, 0.42)
    canopy = box(AWNING_MARKET, 0, -0.3, 0.47, 0.72, 0.42, 0.03)
    rotate_x(canopy, math.radians(12), (0, -0.09, 0.49))
    for i in (-1, 0, 1):
        box("#c8a97a", i * 0.2, -0.3, 0.05, 0.16, 0.22, 0.14)
        box("#a8493f" if i else "#7fa05a", i * 0.2, -0.3, 0.19, 0.13, 0.18, 0.05)


def bakery():
    """A gable rather than a parapet, and the oven flue beside it - the one
    trade in the valley with a chimney going all day."""
    height = _shopfront(SHOP_BAKERY, 0.52)
    gable(AWNING_BAKERY, 0, 0, 0.05 + height, 0.78, 0.7, 0.24)
    box("#8a5a34", 0.24, 0.2, 0.05 + height, 0.12, 0.12, 0.4)
    box("#6f4728", 0.24, 0.2, 0.45 + height, 0.16, 0.16, 0.05)
    canopy = box(AWNING_BAKERY, 0, -0.4, 0.44, 0.56, 0.2, 0.03)
    rotate_x(canopy, math.radians(20), (0, -0.31, 0.46))
    box("#f6ead2", 0, -0.315, 0.5, 0.3, 0.02, 0.09)
    # bread in the window
    for i in (-1, 0, 1):
        box("#d9a45c", i * 0.12, -0.3, 0.2, 0.08, 0.05, 0.05)


def station():
    """Must touch rail, so it is read from the platform side: a long canopy on
    posts, a clock on the gable and a low waiting room behind."""
    _lot()
    box(SHOP_STATION, 0, 0.12, 0.05, 0.66, 0.4, 0.44)
    gable(AWNING_STATION, 0, 0.12, 0.49, 0.76, 0.48, 0.16)
    box(WARM, 0, -0.09, 0.5, 0.14, 0.02, 0.14)          # the platform clock
    box(SIDEWALK, 0, -0.3, 0.05, 0.84, 0.28, 0.03)      # the platform
    for i in (-1, 1):
        box(SHOP_STATION, i * 0.34, -0.3, 0.08, 0.04, 0.04, 0.32)
    box(AWNING_STATION, 0, -0.3, 0.4, 0.84, 0.34, 0.04)
    box(GLASS, -0.2, -0.09, 0.16, 0.2, 0.02, 0.2)


def school():
    """Two wings and a bell, so it is not just a larger house."""
    _lot()
    box("#d9c39a", 0, 0.08, 0.05, 0.78, 0.46, 0.5)
    gable(ROOF_C, 0, 0.08, 0.55, 0.86, 0.54, 0.2)
    box("#d9c39a", 0, -0.26, 0.05, 0.38, 0.24, 0.4)
    gable(ROOF_C, 0, -0.26, 0.45, 0.44, 0.3, 0.12)
    box(DOOR, 0, -0.38, 0.05, 0.16, 0.03, 0.26)
    for i in (-1, 0, 1):
        box(GLASS, i * 0.24, 0.31, 0.24, 0.16, 0.02, 0.18)
    # the bell over the entrance
    box("#c9c3b2", 0, -0.26, 0.57, 0.1, 0.1, 0.1)
    dome(GOLD, 0, -0.26, 0.65, 0.045)


def dock():
    """Must touch water. Decking, bollards and a crane arm over the edge."""
    box("#80664e", 0, 0, 0, 0.9, 0.9, 0.08)
    for i in range(-2, 3):
        box("#6f5842", i * 0.2, 0, 0.08, 0.04, 0.88, 0.012)
    for x, y in ((-0.34, -0.34), (0.34, -0.34), (-0.34, 0.34), (0.34, 0.34)):
        cylinder("#4d4a44", x, y, 0.08, 0.045, 0.14, 8)
    box("#8a7358", 0.24, 0.16, 0.08, 0.1, 0.1, 0.5)
    arm = box("#8a7358", 0.24, -0.02, 0.54, 0.1, 0.42, 0.08)
    rotate_x(arm, math.radians(-12), (0.24, 0.16, 0.58))


# ---------------------------- civic and municipal ----------------------------
# Multi-tile facilities. Their footprints come from src/buildings/registry.js
# and the model has to sit inside one: a 2x3 Fire Station is two tiles across
# and three deep, centred on its middle, or it overhangs the street.

CIVIC_WALL = "#e1dfd5"
HALL_WALL = "#d9d6ca"
HALL_ROOF = "#596778"
POLICE_WALL = "#a9c5cf"
POLICE_ACCENT = "#2f6594"
FIRE_WALL = "#d79a86"
FIRE_ACCENT = "#b5302b"
HEALTH_ACCENT = "#c9444b"
CIVIC_TRIM = "#92784f"


def _city_hall(level):
    """The civic centre, growing from a town office to a city hall. Each rung
    adds something a citizen would notice from the street - a colonnade, a
    clock, a cupola - rather than just another metre of wall."""
    _lot()
    height = 0.42 + level * 0.1
    box(HALL_WALL, 0, 0, 0.05, 0.66, 0.58, height)
    gable(HALL_ROOF, 0, 0, 0.05 + height, 0.76, 0.66, 0.2)
    box(DOOR, 0, -0.3, 0.05, 0.18, 0.03, 0.3)
    for i in (-1, 1):
        box(GLASS, i * 0.2, -0.295, 0.24, 0.14, 0.02, 0.18)
        box(GLASS, 0.335, i * 0.15, 0.24, 0.02, 0.14, 0.18)
    if level >= 2:
        # a portico over the steps
        for i in (-1, 1):
            cylinder(PALE, i * 0.16, -0.36, 0.05, 0.045, 0.38, 8)
        box(PALE, 0, -0.36, 0.43, 0.44, 0.16, 0.06)
        gable(HALL_ROOF, 0, -0.36, 0.49, 0.48, 0.2, 0.1)
    if level >= 3:
        # a clock on the gable
        box(WARM, 0, -0.335, 0.08 + height, 0.16, 0.02, 0.16)
    if level >= 4:
        # the cupola of a mature civic building
        box(HALL_WALL, 0, 0, 0.25 + height, 0.22, 0.22, 0.2)
        cone(HALL_ROOF, 0, 0, 0.45 + height, 0.2, 0.22, 8)
        dome(GOLD, 0, 0, 0.7 + height, 0.045)


def city_hall_1():
    _city_hall(1)


def city_hall_2():
    _city_hall(2)


def city_hall_3():
    _city_hall(3)


def city_hall_4():
    _city_hall(4)


def _facility(w, d, wall, accent, roof_flat=True, height=0.6):
    """The shared shape of a municipal facility: a flat-roofed block on its
    own forecourt with a coloured band over the door."""
    box(GRASS_LOT, 0, 0, 0, w * 0.94, d * 0.94, 0.05)
    box(SIDEWALK, 0, -d * 0.4, 0.05, w * 0.5, d * 0.16, 0.012)
    box(wall, 0, 0, 0.05, w * 0.8, d * 0.72, height)
    if roof_flat:
        box(accent, 0, 0, 0.05 + height, w * 0.84, d * 0.76, 0.06)
    else:
        gable(accent, 0, 0, 0.05 + height, w * 0.86, d * 0.78, 0.2)
    box(accent, 0, -d * 0.365, 0.28, w * 0.3, 0.03, 0.16)
    box(DOOR, 0, -d * 0.365, 0.05, 0.2, 0.03, 0.28)
    return height


def police_station():
    """2x2. A blue lamp over the door and a bay for the cruisers."""
    h = _facility(2, 2, POLICE_WALL, POLICE_ACCENT)
    for i in (-1, 1):
        box(GLASS, i * 0.42, -0.72, 0.3, 0.28, 0.02, 0.2)
        box(GLASS, 0.8, i * 0.4, 0.3, 0.02, 0.24, 0.2)
    cylinder(POLICE_ACCENT, 0, -0.74, 0.5, 0.05, 0.14, 8)
    box(POLICE_ACCENT, 0, 0.62, 0.05 + h + 0.06, 0.05, 0.05, 0.26)


def fire_station():
    """2x3. Three engine doors on the short side, and a hose tower behind."""
    h = _facility(2, 3, FIRE_WALL, FIRE_ACCENT)
    for i in (-1, 0, 1):
        box(FIRE_ACCENT, i * 0.44, -1.09, 0.05, 0.36, 0.03, 0.42)
    box(FIRE_WALL, -0.62, 0.86, 0.05, 0.34, 0.34, h + 0.5)
    box(FIRE_ACCENT, -0.62, 0.86, 0.05 + h + 0.5, 0.38, 0.38, 0.06)
    box(GLASS, 0.72, 0.3, 0.3, 0.02, 0.5, 0.2)


def clinic():
    """2x2. The cross over the door is the whole read at this size."""
    h = _facility(2, 2, "#e8e9e2", "#d8ddd8")
    box(HEALTH_ACCENT, 0, -0.735, 0.34, 0.06, 0.03, 0.22)
    box(HEALTH_ACCENT, 0, -0.735, 0.42, 0.22, 0.03, 0.06)
    for i in (-1, 1):
        box(GLASS, i * 0.44, -0.72, 0.26, 0.26, 0.02, 0.2)
        box(GLASS, 0.8, i * 0.4, 0.26, 0.02, 0.24, 0.2)
    box("#d8ddd8", 0, 0.6, 0.05 + h, 0.5, 0.3, 0.08)


def hospital():
    """3x3. A tall main block with a lower wing, a helipad and the same cross."""
    box(GRASS_LOT, 0, 0, 0, 2.82, 2.82, 0.05)
    box(SIDEWALK, 0, -1.2, 0.05, 1.5, 0.44, 0.012)
    box("#e7e9e7", -0.34, 0, 0.05, 1.4, 1.9, 1.3)
    box("#d3d5d1", -0.34, 0, 1.35, 1.46, 1.96, 0.1)
    box("#e7e9e7", 0.68, 0.2, 0.05, 0.62, 1.4, 0.8)
    box("#d3d5d1", 0.68, 0.2, 0.85, 0.68, 1.46, 0.08)
    box(HEALTH_ACCENT, 0.68, -0.52, 0.28, 0.12, 0.03, 0.44)
    box(HEALTH_ACCENT, 0.68, -0.52, 0.42, 0.44, 0.03, 0.12)
    box(DOOR, 0.68, -0.52, 0.05, 0.3, 0.03, 0.34)
    for z in (0.3, 0.72, 1.14):
        for i in (-2, -1, 0, 1, 2):
            box(GLASS, -0.34 + i * 0.26, -0.96, z, 0.16, 0.02, 0.22)
    # the helipad, which is what says hospital rather than office block
    cylinder("#768084", -0.34, 0, 1.45, 0.34, 0.03, 16)
    cylinder(HEALTH_ACCENT, -0.34, 0, 1.48, 0.24, 0.012, 16)


MODELS = {
    "statue": (statue, "civic", 1500),
    "house-1": (house_1, "buildings", 1500),
    "house-2": (house_2, "buildings", 1500),
    "house-3": (house_3, "buildings", 1500),
    "cafe": (cafe, "buildings", 1500),
    "market": (market, "buildings", 1500),
    "bakery": (bakery, "buildings", 1500),
    "station": (station, "buildings", 1500),
    "school": (school, "civic", 1500),
    "cityHall-1": (city_hall_1, "civic", 1500),
    "cityHall-2": (city_hall_2, "civic", 1500),
    "cityHall-3": (city_hall_3, "civic", 1500),
    "cityHall-4": (city_hall_4, "civic", 1500),
    "policeStation": (police_station, "civic", 2500),
    "fireStation": (fire_station, "civic", 2500),
    "clinic": (clinic, "civic", 2500),
    "hospital": (hospital, "civic", 6000),
    "dock": (dock, "buildings", 1500),
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
