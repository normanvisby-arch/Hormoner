"""
Bygger 3D-modellen af lændesøjlen L3–S1 til ryg-appen (Blender/bpy, kører uden skærm).

Kilde: Z-Anatomy (CC BY-SA 4.0, afledt af BodyParts3D) via Svitylo-datapakken; strukturerne
trækkes ud med udtraek.mjs. Hvirvler, diske, nucleus og ligamenter er Z-Anatomys geometri.
Durasæk og nerverødder bygges her, fordi Z-Anatomys dura stopper ved L3 og rødderne kun er
tynde streger: sækken tilpasses den målte spinalkanal, og rødderne følger Z-Anatomys forløb
gennem foramina med den kliniske topografi (L5 går gennem recessen bag disken L4/L5 og ud
under L5-pediklen; L4 går ud i foramen L4/L5).

Koordinater (Blender): +X = patientens venstre, -Y = fortil, +Z = op, meter.
Brug: python3 byg_model.py raw.glb ud.glb
"""
import sys, math
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

SRC, OUT = sys.argv[1], sys.argv[2]
mm = 0.001

# ---------------------------------------------------------------- indlæsning
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
O = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
for o in O.values():
    o.data.transform(o.matrix_world); o.matrix_world = Matrix()
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-6)
    bm.to_mesh(o.data); bm.free()

def slet(navne):
    for n in navne:
        if n in O: bpy.data.objects.remove(O.pop(n))

def beskaer(o, zmin, zmax):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (zmin <= v.co.z <= zmax)], context='VERTS')
    bm.to_mesh(o.data); bm.free()

def subdivider(o, niveau):
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = niveau; m.render_levels = niveau
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear(); old = o.data; o.data = me; bpy.data.meshes.remove(old)

def glat(o):
    for p in o.data.polygons: p.use_smooth = True

def bvh(navne, extra=()):
    bm = bmesh.new()
    for n in navne:
        bm.from_mesh(O[n].data)
    for me in extra:
        bm.from_mesh(me)
    t = BVHTree.FromBMesh(bm); bm.free(); return t

def hits(tree, o, d, maxd=0.25):
    o = Vector(o); d = Vector(d).normalized(); ud = []; p = o.copy()
    for _ in range(30):
        h = tree.ray_cast(p, d, maxd)
        if h[0] is None: break
        ud.append((h[0] - o).dot(d)); p = h[0] + d * 2e-4
    return ud

def foerste(tree, o, d, maxd=0.25):
    h = tree.ray_cast(Vector(o), Vector(d).normalized(), maxd)
    return h[3] if h[0] is not None else None

# Dura og Z-Anatomys tynde rødder erstattes af egne (se ovenfor).
slet(['Dura', 'Cauda', 'AntRoot_l', 'AntRoot_r', 'PostRoot_l', 'PostRoot_r', 'Ganglion_l', 'Ganglion_r', 'Supraspinous', 'Interspinous'])
for n in ('Flavum', 'PLL', 'ALL'):
    beskaer(O[n], 0.925, 1.068)

# ---------------------------------------------------------------- spinalkanalens midtlinje
pll = bvh(['PLL']); sac_t = bvh(['Sacrum'])
bag = bvh(['L3', 'L4', 'L5', 'Sacrum', 'Flavum'])
vaegge = bvh(['L3', 'L4', 'L5', 'Sacrum', 'Disc_L3L4', 'Disc_L4L5', 'Disc_L5S1', 'Flavum', 'PLL'])
ZS = [z / 1000 for z in range(924, 1074, 2)]
raa = {}
for z in ZS:
    h = hits(pll, (0, -0.12, z), (0, 1, 0))
    if len(h) >= 2 and z >= 0.958:
        front = -0.12 + h[1]
    else:
        hs = hits(sac_t, (0, -0.12, z), (0, 1, 0))
        if len(hs) < 2: continue
        front = -0.12 + hs[1]
    b = foerste(bag, (0, front + 0.002, z), (0, 1, 0), 0.05)
    if b is None: continue
    raa[z] = (front, front + 0.002 + b)
zk = sorted(raa)
def glid(vals, n=3):
    return [sum(vals[max(0, i - n):i + n + 1]) / len(vals[max(0, i - n):i + n + 1]) for i in range(len(vals))]
fr = glid([raa[z][0] for z in zk]); bk = glid([raa[z][1] for z in zk])
def interp(z, arr):
    if z <= zk[0]: return arr[0]
    if z >= zk[-1]: return arr[-1]
    i = max(j for j in range(len(zk)) if zk[j] <= z); t = (z - zk[i]) / (zk[i + 1] - zk[i]) if i + 1 < len(zk) else 0
    return arr[i] + (arr[min(i + 1, len(zk) - 1)] - arr[i]) * t
def midt(z): return (interp(z, fr) + interp(z, bk)) / 2
def front(z): return interp(z, fr)

# ---------------------------------------------------------------- durasæk
N = 48; Z_TOP, Z_BUND = 1.072, 0.926
ringe = []
for z in [Z_BUND + i * 0.002 for i in range(int((Z_TOP - Z_BUND) / 0.002) + 1)]:
    c = Vector((0, midt(z), z)); r = []
    for k in range(N):
        a = 2 * math.pi * k / N; d = Vector((math.sin(a), -math.cos(a), 0))   # k=0 fortil, k=N/4 venstre
        h = foerste(vaegge, c, d, 0.03)
        margin = 1.0 * mm + 1.5 * mm * max(0, -d.y * -1) * (1 if d.y > 0 else 0)  # mere epiduralt fedt bagtil
        cap = 1 / math.sqrt((d.x / (8.5 * mm)) ** 2 + (d.y / (7.2 * mm)) ** 2)
        r.append(max(1.5 * mm, min(cap, (h if h else 1) - margin)))
    ringe.append((z, c, r))
# glat over vinkel og højde
for _ in range(3):
    ringe = [(z, c, [(r[k - 1] + 2 * r[k] + r[(k + 1) % N]) / 4 for k in range(N)]) for z, c, r in ringe]
    ny = []
    for i, (z, c, r) in enumerate(ringe):
        a = ringe[max(0, i - 1)][2]; b = ringe[min(len(ringe) - 1, i + 1)][2]
        ny.append((z, c, [(a[k] + 2 * r[k] + b[k]) / 4 for k in range(N)]))
    ringe = ny
def sac_mesh():
    bm = bmesh.new(); vs = []
    for z, c, r in ringe:
        t = min(1, (z - Z_BUND) / 0.018); f = math.sqrt(max(0, 1 - (1 - t) ** 2))   # afrundet bund (S2)
        vs.append([bm.verts.new(c + Vector((math.sin(2 * math.pi * k / N), -math.cos(2 * math.pi * k / N), 0)) * max(r[k] * f, 0.2 * mm)) for k in range(N)])
    for i in range(len(vs) - 1):
        for k in range(N):
            bm.faces.new((vs[i][k], vs[i][(k + 1) % N], vs[i + 1][(k + 1) % N], vs[i + 1][k]))
    bund = bm.verts.new(ringe[0][1] - Vector((0, 0, 0.6 * mm)))
    for k in range(N): bm.faces.new((vs[0][(k + 1) % N], vs[0][k], bund))
    me = bpy.data.meshes.new('Durasaek'); bm.normal_update(); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('Durasaek', me); bpy.context.scene.collection.objects.link(o); return o
O['Durasaek'] = sac_mesh()
def sac_r(z, x_retning):
    """Sækkens radius i retning (sin a, -cos a) ved højden z (interpoleret)."""
    i = min(range(len(ringe)), key=lambda j: abs(ringe[j][0] - z)); _, c, r = ringe[i]
    a = math.atan2(x_retning[0], -x_retning[1]) % (2 * math.pi); k = a / (2 * math.pi) * N
    k0 = int(k) % N; t = k - int(k)
    return r[k0] * (1 - t) + r[(k0 + 1) % N] * t

# ---------------------------------------------------------------- nerverødder
def catmull(pts, trin=0.8 * mm):
    pts = [Vector(p) for p in pts]; ud = []
    P = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int((p2 - p1).length / trin))
        for j in range(n):
            t = j / n
            ud.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    ud.append(pts[-1]); return ud

RINGE = {}
def roer(navn, kontrol, radier, seg=14):
    """Rør langs en Catmull-Rom-kurve; radier = [(andel af længden, radius)]."""
    pts = catmull(kontrol)
    L = [0]
    for i in range(1, len(pts)): L.append(L[-1] + (pts[i] - pts[i - 1]).length)
    def rad(s):
        s /= L[-1]
        for (a, ra), (b, rb) in zip(radier, radier[1:]):
            if a <= s <= b:
                t = (s - a) / (b - a or 1); t = t * t * (3 - 2 * t); return ra + (rb - ra) * t
        return radier[-1][1]
    bm = bmesh.new(); ringe_ = []
    T0 = (pts[1] - pts[0]).normalized(); n = T0.orthogonal().normalized()
    for i, p in enumerate(pts):
        T = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n = (n - T * n.dot(T)).normalized(); b = T.cross(n)
        r = rad(L[i])
        ringe_.append([bm.verts.new(p + (n * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for i in range(len(ringe_) - 1):
        for k in range(seg):
            bm.faces.new((ringe_[i][k], ringe_[i][(k + 1) % seg], ringe_[i + 1][(k + 1) % seg], ringe_[i + 1][k]))
    for ring, p in ((ringe_[0], pts[0]), (ringe_[-1], pts[-1])):
        c = bm.verts.new(p)
        for k in range(seg): bm.faces.new((ring[k], ring[(k + 1) % seg], c) if ring is ringe_[-1] else (ring[(k + 1) % seg], ring[k], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(navn); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(navn, me); bpy.context.scene.collection.objects.link(o); glat(o); O[navn] = o
    RINGE[navn] = (seg, len(ringe_))
    return o

def intratekal(x_off, y_rel, z):
    return (x_off, midt(z) + y_rel, z)

def sleeve(z, x_side, y_rel=-1.5 * mm):
    """Punkt på sækkens anterolaterale væg, hvor rodmanchetten udgår."""
    d = Vector((x_side, y_rel / 8 * 1000 * 0 - 0.35, 0)).normalized()
    r = sac_r(z, (d.x, d.y))
    return (d.x * r, midt(z) + d.y * r, z)

# Venstre side (+x); højre spejles. Foramina målt med strålesøgning (se README).
RODER = {
    # navn: (intratekalt startpunkt ved toppen (x, y rel. midtlinje), udgangshøjde for manchet, punkter efter manchetten)
    'L3': ((6.0 * mm, -2.5 * mm), 1.058, [(10.0, -31.0, 1049.0), (13.0, -29.5, 1043.5), (17.0, -28.5, 1041.0), (21.0, -29.5, 1038.0), (27.0, -33.0, 1031.0), (33.0, -38.0, 1021.0)]),
    'L4': ((5.0 * mm, -1.0 * mm), 1.026, [(9.6, -29.5, 1018.0), (13.2, -27.8, 1011.6), (17.0, -27.3, 1010.0), (21.0, -28.0, 1007.5), (27.0, -32.0, 1000.0), (33.0, -37.0, 990.0)]),
    'L5': ((3.8 * mm, 0.5 * mm), 1.003, [(9.5, -24.6, 996.0), (10.6, -22.8, 990.0), (13.4, -20.6, 984.4), (17.0, -20.0, 981.6), (21.0, -20.2, 978.8), (26.0, -24.0, 972.0), (30.0, -29.0, 963.0)]),
    'S1': ((3.0 * mm, 2.0 * mm), 0.972, [(8.8, -14.0, 962.5), (9.8, -8.0, 955.0), (12.5, -2.5, 948.5), (16.5, -0.5, 945.0), (19.5, -3.5, 941.0), (22.0, -8.0, 936.5)]),
}
for side, sx in (('v', 1), ('h', -1)):
    for rod, ((x0, y0), z_ud, ekstra) in RODER.items():
        z_ud_s = z_ud
        kontrol = [intratekal(sx * x0, y0, Z_TOP), intratekal(sx * x0, y0, (Z_TOP + z_ud_s) / 2 + 0.006)]
        kontrol.append(intratekal(sx * (x0 + 1.5 * mm), y0 - 0.8 * mm, z_ud_s + 0.006))
        s = sleeve(z_ud_s, sx); kontrol.append(s)
        kontrol += [(sx * x * mm, y * mm, z * mm) for x, y, z in ekstra]
        n = len(kontrol); i_s = 3
        # radier: intratekal 0,9 mm → manchet 1,4 mm → DRG 2,6 mm (punkt med x=17) → nerve 2,0 mm
        i_drg = next(i for i, p in enumerate(kontrol) if abs(p[0]) >= 16.5 * mm)
        f = lambda i: i / (n - 1)
        roer(f'Rod_{rod}_{side}', kontrol, [(0, 0.9 * mm), (f(i_s) * 0.97, 0.95 * mm), (f(i_s) + 0.02, 1.4 * mm), (f(i_drg) - 0.06, 1.5 * mm), (f(i_drg), 2.6 * mm), (f(i_drg) + 0.06, 2.1 * mm), (1, 2.0 * mm)])
    # cauda equina (S2–S5) og filum: tynde tråde, der ender i sækkens bund
    for j, (x0, y0) in enumerate([(2.2, 3.5), (1.2, 4.6), (2.6, 5.4)]):
        kontrol = [intratekal(sx * x0 * mm, y0 * mm, z) for z in (Z_TOP, 1.03, 0.99, 0.96, 0.94)] + [intratekal(sx * x0 * 0.4 * mm, y0 * 0.5 * mm, 0.929)]
        roer(f'Cauda_{j}_{side}', kontrol, [(0, 0.6 * mm), (1, 0.45 * mm)], seg=8)
roer('Filum', [intratekal(0, 2.8 * mm, z) for z in (Z_TOP, 1.0, 0.95, 0.928)], [(0, 0.5 * mm), (1, 0.4 * mm)], seg=8)

# ---------------------------------------------------------------- knogler og diske glattes
for n in ('L3', 'L4', 'L5'):
    subdivider(O[n], 1)
subdivider(O['Disc_L4L5'], 2); subdivider(O['Nucleus_L4L5'], 1)
subdivider(O['Disc_L3L4'], 1); subdivider(O['Disc_L5S1'], 1)
for o in O.values(): glat(o)

# ---------------------------------------------------------------- facetled L4/L5
t4 = bvh(['L4'])
fac = {}
for side, sx in (('v', 1), ('h', -1)):
    par = []
    for v in O['L5'].data.vertices:
        p = v.co
        if sx * p.x < 0.012 or p.y < -0.026 or p.z < 0.985: continue
        loc, nor, idx, d = t4.find_nearest(p)
        if loc is not None and d < 0.0035: par.append((p.copy(), loc.copy()))
    c = sum(((a + b) / 2 for a, b in par), Vector()) / len(par)
    n = sum(((b - a).normalized() for a, b in par), Vector()).normalized()   # fra L5 (SAP) mod L4 (IAP)
    fac[side] = (c, n)
    print('facet', side, [round(x * 1000, 1) for x in c], [round(x, 2) for x in n], len(par))

exec(open(__file__.replace('byg_model.py', 'patologi.py')).read())

# ---------------------------------------------------------------- materialer og eksport
FARVER = {'knogle': (0.91, 0.87, 0.78, 1), 'diskus': (0.62, 0.74, 0.86, 1), 'nucleus': (0.42, 0.62, 0.88, 1),
          'ligament': (0.93, 0.83, 0.48, 1), 'dura': (0.55, 0.68, 0.95, 0.45), 'nerve': (0.98, 0.84, 0.25, 1)}
def mat(navn):
    m = bpy.data.materials.get(navn)
    if m: return m
    m = bpy.data.materials.new(navn); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; c = FARVER[navn]
    b.inputs['Base Color'].default_value = c[:3] + (1,); b.inputs['Roughness'].default_value = 0.6
    if c[3] < 1:
        b.inputs['Alpha'].default_value = c[3]; m.surface_render_method = 'BLENDED'
    return m
def gruppe(n):
    if n[0] == 'L' or n == 'Sacrum': return 'knogle'
    if n.startswith('Disc'): return 'diskus'
    if n.startswith('Nucleus'): return 'nucleus'
    if n == 'Durasaek': return 'dura'
    if n.startswith('Rod') or n.startswith('Cauda') or n == 'Filum': return 'nerve'
    return 'ligament'
for n, o in O.items():
    o.data.materials.clear(); o.data.materials.append(mat(gruppe(n)))

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=False,
                          export_morph=True, export_morph_normal=True, export_materials='EXPORT')
import json
json.dump({'keys': KEYS, 'facet': {s: [list(c), list(n)] for s, (c, n) in fac.items()}}, open(OUT + '.json', 'w'))
print('OK', len(O), 'objekter')
