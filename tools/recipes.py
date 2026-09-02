"""One recipe per building. Each returns nothing; it just populates the scene.

`pal(name)` hands back a material, so a snow render can quietly swap the roof
for something white without every recipe having to know about winter.
"""
import math
from kit import (cube, cylinder, cone, sphere, gable, window, new_material, hexc)

WALL   = "#efe6d3"
WALL_2 = "#e6dcc6"
STONE  = "#cfc8b6"
TIMBER = "#7a5c43"
DARK   = "#5a4a3a"
GLASS  = "#7d97a6"
SNOW   = "#f6f9fb"

class Pal:
    def __init__(self, snow=False, lit=False):
        self.snow, self.lit = snow, lit
        self._cache = {}
    def m(self, name, colour, rough=0.72, metal=0.0):
        key = (name, colour, rough, metal)
        if key not in self._cache:
            self._cache[key] = new_material(name, hexc(colour), rough, metal=metal)
        return self._cache[key]
    def roof(self, colour):
        return self.m("roof", SNOW if self.snow else colour, 0.55)
    def wall(self, colour=WALL):
        return self.m("wall", colour, 0.8)
    def glass(self):
        # in the lit pass the panes are the only thing that shows
        if self.lit:
            return new_material("glass_lit", hexc("#3a2c14"), 0.4, )
        return self.m("glass", GLASS, 0.25, metal=0.2)
    def lamp(self, colour="#ffd08a"):
        m = new_material("lampmat", hexc(colour), 0.4)
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Emission Color"].default_value = (*hexc(colour), 1)
        b.inputs["Emission Strength"].default_value = 9.0 if self.lit else 1.2
        return m
    def ground(self, colour):
        return self.m("gnd", SNOW if self.snow else colour, 0.9)

def _panes(p, xs, z, face="x", off=0.31, w=0.09, h=0.13):
    g = p.lamp() if p.lit else p.glass()
    for a in xs:
        loc = (off, a, z) if face == "x" else (a, off, z)
        window(loc, g, w, h, face)

# ------------------------------------------------------------------ dwellings
def house(p, roof_colour="#cf8274", storeys=1):
    h = 0.30 + 0.16 * (storeys - 1)
    gable(0.60, 0.52, h, 0.26, (0, 0, 0), p.wall(), p.roof(roof_colour), ridge_along_x=False)
    _panes(p, [-0.15, 0.15], h * 0.62)
    _panes(p, [-0.15, 0.15], h * 0.62, face="y", off=0.27)
    cube((0.10, 0.02, 0.20), (0.0, -0.27, 0.10), p.m("door", DARK, 0.7))
    cylinder(0.035, 0.20, (0.18, 0.16, h + 0.20), p.m("chim", "#b08a63", 0.85))

def cafe(p):
    gable(0.62, 0.54, 0.30, 0.16, (0, 0, 0), p.wall(WALL_2), p.roof("#d3897c"), ridge_along_x=True)
    # striped awning over the front
    for i, x in enumerate([-0.20, -0.07, 0.06, 0.19]):
        cube((0.13, 0.22, 0.02), (0.34, x, 0.30),
             p.m("aw%d" % (i % 2), "#d3897c" if i % 2 else "#f4ece0", 0.8),
             rot=(0, math.radians(-14), 0))
    _panes(p, [-0.12, 0.12], 0.19)
    cylinder(0.012, 0.16, (0.46, 0.20, 0.08), p.m("pole", DARK))
    cone(0.13, 0.08, (0.46, 0.20, 0.20), p.m("brolly", "#e0b45a", 0.8))

def inn(p):
    gable(0.64, 0.56, 0.48, 0.24, (0, 0, 0), p.wall(), p.roof("#9c6858"), ridge_along_x=False)
    _panes(p, [-0.16, 0.16], 0.16); _panes(p, [-0.16, 0.16], 0.36)
    cube((0.10, 0.02, 0.20), (0.0, -0.29, 0.10), p.m("door", DARK, 0.7))
    cube((0.02, 0.16, 0.02), (0.33, 0.24, 0.40), p.m("brk", DARK))
    cube((0.01, 0.13, 0.10), (0.33, 0.31, 0.34), p.m("sign", "#3f6f52", 0.7))
    cylinder(0.035, 0.18, (0.16, 0.18, 0.60), p.m("chim", "#b08a63", 0.85))

def clinic(p):
    gable(0.68, 0.60, 0.40, 0.14, (0, 0, 0), p.wall("#fbf7ee"), p.roof("#dfe6e2"), ridge_along_x=True)
    cube((0.02, 0.07, 0.22), (0.35, 0, 0.24), p.m("cross", "#5fa46f", 0.6))
    cube((0.02, 0.22, 0.07), (0.35, 0, 0.24), p.m("cross", "#5fa46f", 0.6))
    _panes(p, [-0.22, 0.22], 0.18)

def school(p):
    gable(0.74, 0.62, 0.36, 0.18, (0, 0, 0), p.wall("#f2ecdc"), p.roof("#8a6f96"), ridge_along_x=True)
    cube((0.14, 0.14, 0.26), (0, 0, 0.54), p.wall("#e7dcc4"))
    cone(0.13, 0.18, (0, 0, 0.86), p.roof("#7c6288"))
    sphere(0.028, (0, 0, 0.97), p.lamp("#e0ae4e"))
    _panes(p, [-0.22, 0, 0.22], 0.20)

def well(p):
    cylinder(0.17, 0.12, (0, 0, 0.06), p.m("stone", STONE, 0.9))
    cylinder(0.14, 0.02, (0, 0, 0.125), p.m("dark", "#22303a", 0.9))
    for s in (-1, 1):
        cube((0.03, 0.03, 0.34), (0.13 * s, 0, 0.17), p.m("post", TIMBER, 0.85))
    gable(0.36, 0.30, 0.01, 0.12, (0, 0, 0.34), p.m("post", TIMBER), p.roof("#9c6858"), ridge_along_x=True)

# ------------------------------------------------------------------ trades
def market(p):
    for sx in (-1, 1):
        for sy in (-1, 1):
            cube((0.028, 0.028, 0.34), (0.26 * sx, 0.24 * sy, 0.17), p.m("post", TIMBER, 0.85))
    for i, x in enumerate([-0.21, -0.07, 0.07, 0.21]):
        cube((0.62, 0.14, 0.022), (0, x, 0.37),
             p.m("cnv%d" % (i % 2), "#e5645c" if i % 2 else "#f4ece0", 0.85))
    cube((0.50, 0.16, 0.03), (0, -0.10, 0.19), p.m("trestle", "#b79a72", 0.85))
    for i, x in enumerate([-0.18, -0.06, 0.06, 0.18]):
        sphere(0.035, (x, -0.10, 0.23), p.m("prod%d" % i,
               ["#d3897c", "#e0b45a", "#7fa887", "#c273a8"][i], 0.7))

def bakery(p):
    gable(0.58, 0.52, 0.28, 0.14, (0, 0, 0), p.wall("#f0e5cf"), p.roof("#c2a883"), ridge_along_x=True)
    cylinder(0.05, 0.30, (0.14, 0.18, 0.40), p.m("chim", "#b08a63", 0.85))
    cylinder(0.09, 0.04, (0.31, 0, 0.13), p.lamp("#ff9c3c"), rot=(0, math.radians(90), 0))
    cube((0.02, 0.30, 0.02), (0.31, 0, 0.26), p.m("shelf", "#c9a074", 0.85))
    for a in (-0.09, 0, 0.09):
        sphere(0.034, (0.31, a, 0.29), p.m("loaf", "#d9a463", 0.75))

def mill(p):
    cylinder(0.20, 0.62, (0, 0, 0.31), p.wall(), verts=16)
    cone(0.23, 0.16, (0, 0, 0.70), p.roof("#8b5f4c"))
    # the sails are drawn by the game so they can keep turning
    cylinder(0.03, 0.06, (0.0, -0.22, 0.60), p.m("hub", "#6f5643", 0.8),
             rot=(math.radians(90), 0, 0))
    _panes(p, [0], 0.30, off=0.20, w=0.07, h=0.10)

def farm(p):
    p_ground = p.ground("#a98b5f")
    cube((0.94, 0.94, 0.02), (0, 0, 0.005), p_ground)
    for i in range(5):
        cube((0.86, 0.05, 0.02), (0, -0.36 + i * 0.18, 0.02), p.ground("#8e7048"))
    gable(0.34, 0.30, 0.22, 0.14, (-0.22, 0.16, 0.02), p.m("barn", "#c2624f", 0.8),
          p.roof("#e9dfc9"), ridge_along_x=False)
    for i in range(3):
        cone(0.055, 0.20, (0.16 + i * 0.14, -0.20, 0.12),
             p.m("stook", SNOW if p.snow else "#d9b455", 0.9), verts=8)

def sawmill(p):
    gable(0.60, 0.52, 0.26, 0.12, (0, 0, 0), p.m("shed", "#c9ae84", 0.85),
          p.roof("#6f6157"), ridge_along_x=True)
    # the blade is drawn by the game so it can keep spinning
    for i in range(3):
        cylinder(0.055, 0.34, (0.24, 0.22, 0.055 + i * 0.10),
                 p.m("log", "#8b6742" if i % 2 else "#7a5a3a", 0.9),
                 rot=(0, math.radians(90), 0))

def workshop(p):
    gable(0.62, 0.54, 0.30, 0.10, (0, 0, 0), p.wall("#d9d2c4"), p.roof("#6d7f86"), ridge_along_x=True)
    cylinder(0.04, 0.26, (0.18, 0.20, 0.42), p.m("flue", "#8a7a66", 0.85))
    cube((0.02, 0.16, 0.20), (0.32, 0, 0.10), p.lamp("#ffb765") if p.lit else p.m("door", "#e08a3c", 0.7))
    _panes(p, [-0.19, 0.19], 0.20)

# ------------------------------------------------------------------ transport
def station(p):
    gable(0.66, 0.54, 0.30, 0.10, (0, 0, 0), p.wall("#e9dfc9"), p.roof("#6f8fae"), ridge_along_x=True)
    cube((0.94, 0.72, 0.025), (0, 0, 0.42), p.roof("#5d7b98"))
    for sx in (-1, 1):
        cube((0.025, 0.025, 0.14), (0.44 * sx, 0.30, 0.35), p.m("post", "#5d7b98", 0.7))
    cylinder(0.07, 0.02, (0.34, 0, 0.24), p.m("clockface", "#f4f0e2", 0.6),
             rot=(0, math.radians(90), 0))
    _panes(p, [-0.20], 0.18)

def dock(p):
    cube((0.92, 0.86, 0.05), (0, 0, 0.12), p.m("deck", "#a98d68", 0.9))
    for i in range(5):
        cube((0.86, 0.03, 0.01), (0, -0.36 + i * 0.18, 0.15), p.m("plank", "#8d7350", 0.9))
    for sx, sy in ((-1, -1), (1, 1), (-1, 1)):
        cube((0.05, 0.05, 0.36), (0.36 * sx, 0.32 * sy, 0.18), p.m("pile", "#7a6446", 0.9))
    cube((0.05, 0.05, 0.44), (-0.36, -0.32, 0.30), p.m("pile", "#7a6446", 0.9))
    cube((0.09, 0.09, 0.09), (-0.36, -0.32, 0.55), p.lamp())
    cube((0.18, 0.14, 0.12), (0.12, -0.02, 0.21), p.m("crate", "#b08f63", 0.85))

# ------------------------------------------------------------------ wonders
def statue(p):
    cube((0.44, 0.40, 0.16), (0, 0, 0.08), p.m("plinth", STONE, 0.85))
    cube((0.30, 0.28, 0.05), (0, 0, 0.185), p.m("plinth2", "#ded7c6", 0.85))
    bronze = p.m("bronze", "#8d7a4e", 0.35, metal=0.7)
    cube((0.11, 0.09, 0.32), (0, 0, 0.37), bronze)
    sphere(0.065, (0, 0, 0.57), bronze)
    cube((0.05, 0.05, 0.26), (0.10, -0.02, 0.60), bronze, rot=(0, math.radians(38), 0))
    sphere(0.045, (0.19, -0.02, 0.71), p.lamp("#e6c979") if p.lit else p.m("orb", "#a8945f", 0.3, metal=0.6))

def clocktower(p):
    cube((0.30, 0.30, 1.05), (0, 0, 0.52), p.wall("#efe7d6"))
    cube((0.40, 0.40, 0.06), (0, 0, 1.07), p.m("ledge", "#c9bda2", 0.85))
    cone(0.30, 0.34, (0, 0, 1.27), p.roof("#5f7f8c"), verts=4)
    sphere(0.035, (0, 0, 1.47), p.lamp("#e0ae4e"))
    cylinder(0.11, 0.02, (0.155, 0, 0.86), p.lamp("#fdf6e2") if p.lit else p.m("face", "#f7f3e6", 0.5),
             rot=(0, math.radians(90), 0))
    cylinder(0.11, 0.02, (0, 0.155, 0.86), p.lamp("#fdf6e2") if p.lit else p.m("face", "#f7f3e6", 0.5),
             rot=(math.radians(90), 0, 0))
    _panes(p, [0], 0.40, off=0.16, w=0.07, h=0.11)

def lighthouse(p):
    n = 5
    for i in range(n):
        r = 0.22 - i * 0.028
        cylinder(r, 0.22, (0, 0, 0.11 + i * 0.22),
                 p.m("band%d" % (i % 2), "#f4efe2" if i % 2 else "#d9564e", 0.75), verts=20)
    cylinder(0.14, 0.10, (0, 0, 1.16), p.m("gal", "#3f4c52", 0.6), verts=16)
    cylinder(0.10, 0.12, (0, 0, 1.24), p.lamp("#ffeebe"), verts=16)
    cone(0.16, 0.14, (0, 0, 1.38), p.roof("#5f7f8c"))

def library(p):
    cube((0.86, 0.74, 0.36), (0, 0, 0.18), p.wall("#f2ecdb"))
    for i, x in enumerate([-0.30, -0.15, 0, 0.15, 0.30]):
        cylinder(0.035, 0.34, (0.40, x, 0.17), p.m("col", "#e8e0cb", 0.85), verts=12)
    cube((0.94, 0.82, 0.06), (0, 0, 0.39), p.m("arch", "#d6cbb0", 0.85))
    gable(0.86, 0.74, 0.02, 0.16, (0, 0, 0.42), p.m("arch", "#d6cbb0"), p.roof("#8f9ea6"), ridge_along_x=True)
    sphere(0.19, (0, 0, 0.60), p.roof("#6f8fae"))
    sphere(0.035, (0, 0, 0.82), p.lamp("#e0ae4e"))
    _panes(p, [-0.22, 0, 0.22], 0.22, off=0.44)

RECIPES = {
    "house_a": lambda p: house(p, "#cf8274", 1),
    "house_b": lambda p: house(p, "#6f8fae", 2),
    "house_c": lambda p: house(p, "#7fa887", 1),
    "cafe": cafe, "inn": inn, "clinic": clinic, "school": school, "well": well,
    "market": market, "bakery": bakery, "mill": mill, "farm": farm,
    "sawmill": sawmill, "workshop": workshop, "station": station, "dock": dock,
    "statue": statue, "clocktower": clocktower, "lighthouse": lighthouse, "library": library,
}
