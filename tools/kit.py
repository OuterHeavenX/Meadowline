"""Shared Blender kit: scene, camera, lighting and the parts buildings are made of.

The camera is a 2:1 dimetric orthographic view — azimuth 45 degrees, elevation
30 degrees — which is exactly the projection the game's canvas code uses, so a
rendered sprite drops onto the tile grid without distortion.
"""
import bpy, bmesh, math, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

TILE = 1.0                      # one game tile is one Blender unit
PX_PER_TILE = 128               # horizontal pixels per tile in the sprite
SPRITE = (256, 256)             # sprite canvas
# One world unit of height lands on 0.61 of a tile once the 30-degree tilt is
# taken out, which reads squatter than the drawings this replaces; the models
# are stretched a little in Z to keep the valley's proportions.
HEIGHT_BOOST = 1.32

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def new_material(name, colour, rough=0.72, emit=None, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*colour, 1)
    bsdf.inputs["Roughness"].default_value = rough
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metal
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1)
        bsdf.inputs["Emission Strength"].default_value = 6.0
    return m

def hexc(h):
    h = h.lstrip("#")
    return tuple((int(h[i:i+2], 16) / 255.0) ** 2.2 for i in (0, 2, 4))   # to linear

def _obj(mesh_data, mat):
    o = bpy.data.objects.new(mesh_data.name, mesh_data)
    bpy.context.scene.collection.objects.link(o)
    if mat:
        o.data.materials.append(mat)
    return o

def cube(size, loc, mat, rot=(0, 0, 0)):
    """A box given as (x, y, z) full extents, sitting with its centre at loc."""
    me = bpy.data.meshes.new("cube")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(me); bm.free()
    o = _obj(me, mat)
    o.location = loc
    o.rotation_euler = rot
    return o

def cylinder(r, h, loc, mat, verts=24, rot=(0, 0, 0)):
    me = bpy.data.meshes.new("cyl")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=r, radius2=r, depth=h)
    bm.to_mesh(me); bm.free()
    o = _obj(me, mat); o.location = loc; o.rotation_euler = rot
    return o

def cone(r, h, loc, mat, verts=20):
    me = bpy.data.meshes.new("cone")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=verts,
                          radius1=r, radius2=0.0, depth=h)
    bm.to_mesh(me); bm.free()
    o = _obj(me, mat); o.location = loc
    return o

def sphere(r, loc, mat, subd=3):
    me = bpy.data.meshes.new("sph")
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subd, radius=r)
    bm.to_mesh(me); bm.free()
    return _obj(me, mat)

def gable(w, d, wall_h, roof_h, loc, wall_mat, roof_mat, ridge_along_x=True):
    """A wall box with a pitched roof — the shape most of the valley is built of."""
    parts = [cube((w, d, wall_h), (loc[0], loc[1], loc[2] + wall_h / 2), wall_mat)]
    me = bpy.data.meshes.new("roof")
    bm = bmesh.new()
    hw, hd = w / 2 * 1.08, d / 2 * 1.08
    z0, z1 = 0.0, roof_h
    if ridge_along_x:
        vs = [bm.verts.new(v) for v in [(-hw,-hd,z0),(hw,-hd,z0),(hw,hd,z0),(-hw,hd,z0),
                                        (-hw,0,z1),(hw,0,z1)]]
        faces = [(0,1,5,4),(3,2,5,4),(0,3,4),(1,2,5)]
    else:
        vs = [bm.verts.new(v) for v in [(-hw,-hd,z0),(hw,-hd,z0),(hw,hd,z0),(-hw,hd,z0),
                                        (0,-hd,z1),(0,hd,z1)]]
        faces = [(0,1,4),(3,2,5),(1,2,5,4),(0,3,5,4)]
    bm.verts.ensure_lookup_table()
    for f in faces:
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    r = _obj(me, roof_mat)
    r.location = (loc[0], loc[1], loc[2] + wall_h)
    parts.append(r)
    return parts

def window(loc, mat, w=0.09, h=0.12, face="x"):
    """A shallow pane set into a wall; `mat` carries the emission for the lit pass."""
    size = (0.02, w, h) if face == "x" else (w, 0.02, h)
    return cube(size, loc, mat)

def setup_scene(samples=48):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = SPRITE
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'      # keep the palette honest
    return sc

def setup_camera(sc, aim_z=0.34):
    cam_data = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam); sc.camera = cam
    cam_data.type = 'ORTHO'
    # A 1x1 tile is axis-aligned in world space but the camera looks along the
    # 45-degree diagonal, so the tile spans sqrt(2) world units across the frame.
    # Without that factor every building comes out 1.41x too big.
    cam_data.ortho_scale = (SPRITE[0] / PX_PER_TILE) * math.sqrt(2)
    d = 12.0
    az, el = math.radians(45), math.radians(30)
    cam.location = (math.cos(az) * math.cos(el) * d,
                    -math.sin(az) * math.cos(el) * d + 0,
                    math.sin(el) * d + aim_z)
    cam.rotation_euler = (math.radians(90) - el, 0, math.radians(45))
    return cam

def setup_lights(sc, night=False):
    if night:
        sc.world = bpy.data.worlds.new("w")
        sc.world.use_nodes = True
        sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)
        return
    sun = bpy.data.lights.new("sun", type='SUN')
    sun.energy = 3.1
    sun.angle = math.radians(6)
    so = bpy.data.objects.new("sun", sun)
    sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(52), math.radians(6), math.radians(126))
    fill = bpy.data.lights.new("fill", type='AREA')
    fill.energy = 26; fill.size = 8
    fo = bpy.data.objects.new("fill", fill)
    sc.collection.objects.link(fo)
    fo.location = (-4, 4, 4)
    fo.rotation_euler = (math.radians(52), 0, math.radians(-136))
    sc.world = bpy.data.worlds.new("w")
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.50, 0.58, 1)
    sc.world.node_tree.nodes["Background"].inputs[1].default_value = 0.75

def anchor_px(sc, cam):
    """Where the tile centre (world origin) lands in the rendered image."""
    v = world_to_camera_view(sc, cam, Vector((0, 0, 0)))
    return [round(v.x * SPRITE[0], 2), round((1 - v.y) * SPRITE[1], 2)]

def render_to(sc, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def apply_height_boost():
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            o.scale[2] *= HEIGHT_BOOST
            o.location[2] *= HEIGHT_BOOST
