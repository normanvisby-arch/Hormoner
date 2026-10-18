# ---------------------------------------------------------------- patologi som shape keys
# Hver diagnose er en shape key med samme navn på alle objekter, den ændrer (disk, ligament,
# knogle, sæk, rødder). Kilden (disk, flavum, facet) deformeres først; sæk og rødder skubbes
# derefter ud af den deformerede kilde (kollision), så de trykkes, hvor de rammes.
import numpy as np
from mathutils.kdtree import KDTree

def co(o): return [v.co.copy() for v in o.data.vertices]
BASIS = {}
def basis(n):
    if n not in BASIS: BASIS[n] = co(O[n])
    return BASIS[n]

def tilfoej_key(n, navn, disp, min_mm=0.05):
    if max((d.length for d in disp), default=0) < min_mm * mm: return False
    o = O[n]
    if not o.data.shape_keys: o.shape_key_add(name='Basis', from_mix=False)
    k = o.shape_key_add(name=navn, from_mix=False)
    b = basis(n)
    for i, d in enumerate(disp): k.data[i].co = b[i] + d
    return True

def naboer(n):
    nb = [[] for _ in O[n].data.vertices]
    for e in O[n].data.edges:
        a, b = e.vertices; nb[a].append(b); nb[b].append(a)
    return nb

def smoothstep(e0, e1, x):
    t = min(1, max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)

def stoej(p):
    x, y, z = p * 900
    return 0.5 + 0.25 * (math.sin(x * 1.7 + 1.3 * math.sin(y * 2.3)) + math.sin(y * 1.9 + 1.1 * math.sin(z * 2.9)) * math.sin(z * 2.1 + x))

def mesh_af(n, disp):
    """Midlertidig deformeret kopi af et objekt (til kollision)."""
    me = bpy.data.meshes.new('tmp'); b = basis(n)
    me.from_pydata([b[i] + disp[i] for i in range(len(b))], [], [list(p.vertices) for p in O[n].data.polygons])
    return me

# --- diskens koordinatsystem (L4/L5)
D = 'Disc_L4L5'
P = np.array([list(v) for v in basis(D)])
C = Vector(P.mean(axis=0))
w_, V_ = np.linalg.eigh(np.cov((P - P.mean(axis=0)).T))
U = Vector(V_[:, 0]);  U = U if U.z > 0 else -U                   # diskens akse (op)
PB = (Vector((0, 1, 0)) - U * U.y).normalized()                  # bagud i diskens plan
LV = U.cross(PB).normalized(); LV = LV if LV.x > 0 else -LV       # mod patientens venstre
disk_t = BVHTree.FromPolygons(basis(D), [list(p.vertices) for p in O[D].data.polygons])
def kant(retning):
    """Punkt på diskens overflade i en retning fra centrum (sidste udgang)."""
    h = hits(disk_t, C, retning, 0.08)
    return C + retning.normalized() * h[-1] if h else C
print('disk centrum', [round(x * 1000, 1) for x in C], 'akse', [round(x, 2) for x in U])

ZONER = {'central': 0, 'paracentral': 20, 'foraminal': 52, 'ekstraforaminal': 74}
OPAD = {'central': 0.0, 'paracentral': 0.05, 'foraminal': 0.35, 'ekstraforaminal': 0.15}

MAAL = {'foraminal': Vector((17.0 * mm, -27.3 * mm, 1.0095)), 'ekstraforaminal': Vector((25.0 * mm, -31.5 * mm, 1.0025))}
def prolaps_disp(zone, sx, type_):
    phi = math.radians(ZONER[zone]) * sx
    r = (PB * math.cos(phi) + LV * math.sin(phi)).normalized()
    c = kant(r); h = (r + U * OPAD[zone]).normalized(); t = h.cross(U).normalized()
    if type_ == 'protrusion': A, sl, su = 4.6 * mm, 6.5 * mm, 4.5 * mm
    else:                     A, sl, su = 7.0 * mm, 5.0 * mm, 4.5 * mm
    if zone in MAAL:
        T = MAAL[zone].copy(); T.x *= sx
        h = (T - c).normalized(); t = r.cross(U).normalized()
        A = (T - c).length * (0.55 if type_ == 'protrusion' else 1.0)
        sl, su = sl * 1.2, su * 1.15
    u2 = t.cross(h).normalized(); u2 = u2 if u2.dot(U) > 0 else -u2
    ud = []
    for q in basis(D):
        d = q - c; rl = d.dot(t); ru = d.dot(u2); rh = d.dot(h)
        if type_ == 'protrusion':   # bred base
            w = math.exp(-rl * rl / (2 * sl * sl)) * math.exp(-ru * ru / (2 * su * su))
        else:                       # afrundet masse (super-gauss)
            w = math.exp(-(rl / sl) ** 4) * math.exp(-(ru / su) ** 4)
        w *= smoothstep(-9 * mm, -1 * mm, rh)
        v = h * (A * w)
        if type_ == 'ekstrusion':
            # svampeform: den yderste del breder sig op og især ned bag hvirvellegemet
            ydre = w * smoothstep(0.3, 0.9, w)
            v += Vector((0, 0, (1 if ru > 0 else -1) * 1.5 * mm * ydre - 3.0 * mm * ydre))
        ud.append(v)
    # Nucleus: ved ekstrusion fortsætter kernen som en tunge gennem sprækken i annulus ud i
    # prolapsen; ved protrusion skubbes den bagud, men bliver inden for annulus' ydre lag.
    nb = basis('Nucleus_L4L5'); cn = sum(nb, Vector()) / len(nb)
    Rn = sum((q - cn).length for q in nb) / len(nb)
    P = c + h * (A * 0.75) if type_ == 'ekstrusion' else c - r * 2.0 * mm
    rn = (P - cn).normalized(); L = max(0, (P - cn).length - Rn)
    nud = []
    for q in nb:
        d = q - cn
        f = smoothstep(0.2, 0.95, d.normalized().dot(rn))          # forreste del af kernen
        tvaer = d - rn * d.dot(rn)
        nud.append(rn * (L * f) - tvaer * ((0.45 if type_ == 'ekstrusion' else 0.2) * f))
    return {D: ud, 'Nucleus_L4L5': nud}, h

def bulging_disp(A=2.2 * mm):
    ud = []
    for q in basis(D):
        d = q - C; ru = d.dot(U); plan = d - U * ru
        if plan.length < 1e-6: ud.append(Vector()); continue
        rad = plan.normalized()
        bag = 0.55 + 0.45 * max(0, rad.dot(PB))                   # mest bagtil/lateralt
        w = smoothstep(12 * mm, 20 * mm, plan.length) * math.exp(-ru * ru / (2 * (4 * mm) ** 2)) * bag
        ud.append(rad * A * w)
    return {D: ud}

def flavum_disp(A, side=0):
    """Fortykkelse af lig. flavum L4/L5 ind mod kanalen (side 0 = begge, ±1 = én side)."""
    ud = []; o = O['Flavum']
    for v, q in zip(o.data.vertices, basis('Flavum')):
        mod = Vector((0, midt(q.z), q.z)) - q; mod.z = 0
        if mod.length < 1e-6: ud.append(Vector()); continue
        mod.normalize()
        w = smoothstep(0.978, 0.988, q.z) * (1 - smoothstep(1.008, 1.016, q.z))
        if v.normal.dot(mod) < 0.2: w = 0                            # kun forfladen
        if side: w *= smoothstep(0, 6 * mm, side * q.x)
        ud.append(mod * A * w)
    return {'Flavum': ud}

FAC = fac
def facet_disp(side, A, medialt=0.0):
    """Osteofytter/hypertrofi omkring facetleddet L4/L5 på én side (side 'v' eller 'h')."""
    c, n = FAC[side]; sx = 1 if side == 'v' else -1; ud = {}
    for k in ('L4', 'L5'):
        o = O[k]; arr = []
        for v, q in zip(o.data.vertices, basis(k)):
            dist = (q - c).length
            w = 1 - smoothstep(4 * mm, 12 * mm, dist)
            v_ = v.normal * (A * w * (0.6 + 0.8 * stoej(q)))
            if medialt and k == 'L5':
                # SAP vokser medialt og fortil ind i recessen
                w2 = (1 - smoothstep(4 * mm, 13 * mm, dist)) * smoothstep(-3 * mm, 3 * mm, sx * (c.x - q.x))
                v_ += Vector((-sx, -1.0, 0.1)).normalized() * medialt * w2
            arr.append(v_)
        ud[k] = arr
    return ud

FORAMEN = {'v': Vector((17 * mm, -28.6 * mm, 1.0068)), 'h': Vector((-17 * mm, -28.6 * mm, 1.0068))}
def sap_foramen_disp(side, A):
    """L5's øvre ledtap vokser op og fortil ind i foramen L4/L5."""
    c, _ = FAC[side]; f = FORAMEN[side]; arr = []
    for q in basis('L5'):
        w = (1 - smoothstep(4 * mm, 13 * mm, (q - f).length)) * smoothstep(0.988, 0.998, q.z)
        arr.append((f - q).normalized() * A * w if (f - q).length > 1e-6 else Vector())
    return {'L5': arr}

# --- kollision: sæk og rødder skubbes ud af de deformerede kilder
SAEK = 'Durasaek'
sac_nb = naboer(SAEK)
PLL_NB = naboer('PLL')
NERVER = [n for n in O if n.startswith('Rod_') or n.startswith('Cauda_') or n == 'Filum']
sac_bvh0 = BVHTree.FromPolygons(basis(SAEK), [list(p.vertices) for p in O[SAEK].data.polygons])
def inde_i_saek(p):
    loc, nor, i, d = sac_bvh0.find_nearest(p)
    return loc is not None and (p - loc).dot(nor) < 0

def skub(punkter, tree, retning, margin=0.5 * mm, naer=None, maks=6 * mm):
    """Forskydning, der flytter hvert punkt ud af en lukket flade (tree) langs retning(p).
    naer: KD-træ over de flyttede kildepunkter — kun punkter tæt på dem påvirkes (så
    eksisterende berøringer mellem knogle og sæk/rod ikke giver falske skub)."""
    ud = []
    for p in punkter:
        if naer is not None and naer.find(p)[2] > 5 * mm: ud.append(Vector()); continue
        loc, nor, i, d = tree.find_nearest(p)
        if loc is None: ud.append(Vector()); continue
        inde = (p - loc).dot(nor) < 0
        if not inde and d > margin: ud.append(Vector()); continue
        r = retning(p)
        h = tree.ray_cast(p + r * 1e-5, r, 0.03)
        if inde and h[0] is not None: v = r * (h[3] + margin)
        elif not inde: v = r * (margin - d)
        else: v = nor * (d + margin)
        ud.append(v if v.length <= maks else v.normalized() * maks)
    return ud

def glat_felt(disp, nb, n=8):
    org = [d.copy() for d in disp]
    for _ in range(n):
        ny = []
        for i, d in enumerate(disp):
            if not nb[i]: ny.append(d); continue
            m = sum((disp[j] for j in nb[i]), Vector()) / len(nb[i])
            v = d * 0.4 + m * 0.6
            ny.append(v if v.length >= org[i].length else org[i])
        disp = ny
    return disp

def kollision(kilder, navn, rodretning=None, saek_ekstra=None, klem=()):
    """kilder: {objekt: disp}. Tilføjer shape keys på kilder, sæk og nerver."""
    for n, d in kilder.items(): tilfoej_key(n, navn, d)
    me = [mesh_af(n, d) for n, d in kilder.items()]
    bm = bmesh.new()
    for m in me: bm.from_mesh(m); bpy.data.meshes.remove(m)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    tree = BVHTree.FromBMesh(bm); bm.free()
    flyttet = [basis(n)[i] + d[i] for n, d in kilder.items() for i in range(len(d)) if d[i].length > 0.2 * mm]
    naer = KDTree(len(flyttet))
    for i, p in enumerate(flyttet): naer.insert(p, i)
    naer.balance()
    # sæk: indad mod midtlinjen
    def vandret(p):
        v = Vector((0, midt(p.z), p.z)) - p; v.z = 0
        return v.normalized() if v.length > 1e-6 else Vector((0, 1, 0))
    sd = skub(basis(SAEK), tree, vandret, 0.4 * mm, naer, 5 * mm)
    if saek_ekstra: sd = [a if a.length > b.length else b for a, b in zip(sd, saek_ekstra)]
    sd = glat_felt(sd, sac_nb, 10)
    tilfoej_key(SAEK, navn, sd)
    # PLL løftes af disken (subligamentært)
    tilfoej_key('PLL', navn, glat_felt(skub(basis('PLL'), tree, rodretning or vandret, 0.3 * mm, naer), PLL_NB, 6))
    kd = KDTree(len(sd))
    for i, p in enumerate(basis(SAEK)): kd.insert(p, i)
    kd.balance()
    for n in NERVER:
        b = basis(n); seg, nr = RINGE[n]
        # intratekalt: følg sækkens forskydning (vægtet efter afstand); ekstraduralt: skub ud af kilden
        felt = []
        for p in b:
            if inde_i_saek(p):
                ns = kd.find_n(p, 6); vs = Vector(); ws = 0
                for q, i, dist in ns:
                    w = 1 / (dist + 0.5 * mm); vs += sd[i] * w; ws += w
                vs /= ws; dist0 = ns[0][2]
                felt.append(vs * (1 - smoothstep(2 * mm, 6 * mm, dist0)))
            else:
                felt.append(None)
        retn = rodretning or vandret
        ex = skub(b, tree, lambda p: retn(p), 0.5 * mm, naer)
        disp = [ex[i] if felt[i] is None else (felt[i] if felt[i].length >= ex[i].length else ex[i]) for i in range(len(b))]
        # hele ringe flyttes (roden forskydes) og trykkes flad i skubberetningen
        ringe_d = []
        for r in range(nr):
            ds = disp[r * seg:(r + 1) * seg]; mx = max(ds, key=lambda v: v.length)
            ringe_d.append(mx)
        for _ in range(4):
            ringe_d = [ringe_d[max(0, r - 1)] * 0.25 + ringe_d[r] * 0.5 + ringe_d[min(nr - 1, r + 1)] * 0.25 for r in range(nr)]
        ud = [Vector() for _ in b]
        for r in range(nr):
            mv = ringe_d[r]; idx = range(r * seg, (r + 1) * seg)
            ctr = sum((b[i] for i in idx), Vector()) / seg
            for i in idx:
                fl = Vector()
                if mv.length > 0.3 * mm:
                    a = mv.normalized(); rel = b[i] - ctr
                    fl = -a * rel.dot(a) * min(0.45, mv.length / (6 * mm))     # fladtrykt
                ud[i] = mv + fl
        for i in range(nr * seg, len(b)):                                   # endepunkter
            ud[i] = ringe_d[0] if i == nr * seg else ringe_d[-1]
        for kn, kp, kr, kf, ka in klem:                                      # eksplicit afklemning
            if kn != n: continue
            for r in range(nr):
                idx = range(r * seg, (r + 1) * seg); ctr = sum((b[i] for i in idx), Vector()) / seg
                w = 1 - smoothstep(0.4 * kr, kr, (ctr - kp).length)
                if w <= 0: continue
                for i in idx:
                    rel = b[i] - ctr
                    ud[i] += -ka * rel.dot(ka) * (1 - kf) * w
        tilfoej_key(n, navn, ud)

KEYS = []
def key(navn, kilder, **kw):
    kollision(kilder, navn, **kw); KEYS.append(navn); print('key', navn)

def plus(*ds):
    ud = {}
    for d in ds:
        for n, arr in d.items():
            ud[n] = [a + b for a, b in zip(ud[n], arr)] if n in ud else list(arr)
    return ud

# Prolaps: protrusion og ekstrusion i fire zoner, venstre/højre
for zone in ZONER:
    for side, sx in ((('', 1),) if zone == 'central' else (('_v', 1), ('_h', -1))):
        for typ in ('protrusion', 'ekstrusion'):
            kilder, h = prolaps_disp(zone, sx, typ)
            key(f'{typ}_{zone}{side}', kilder, rodretning=lambda p, h=h: h)
key('bulging', bulging_disp())
key('flavumhypertrofi', flavum_disp(2.8 * mm))
for side in ('v', 'h'):
    key(f'facetartrose_{side}', facet_disp(side, 2.0 * mm))
    sx = 1 if side == 'v' else -1
    # recesstenose: SAP og flavum fylder recessen; L5-roden klemmes, hvor den passerer disken
    key(f'recesstenose_{side}', plus(facet_disp(side, 1.0 * mm, medialt=5.0 * mm), flavum_disp(2.4 * mm, sx)),
        rodretning=lambda p, sx=sx: Vector((-sx * 0.5, -1, 0)).normalized(),
        klem=[(f'Rod_L5_{side}', Vector((sx * 9.8 * mm, -24.0 * mm, 0.994)), 7 * mm, 0.55, Vector((sx, 0.3, 0)).normalized())])
    kilder, h = prolaps_disp('foraminal', sx, 'protrusion')
    fb = {D: [v * 1.5 for v in kilder[D]]}
    key(f'foraminalstenose_{side}', plus(fb, sap_foramen_disp(side, 4.0 * mm), facet_disp(side, 0.8 * mm)),
        rodretning=lambda p, h=h: (h + U * 0.6).normalized(),
        klem=[(f'Rod_L4_{side}', Vector((sx * 17 * mm, -27.3 * mm, 1.0098)), 6 * mm, 0.5, U)])

# central spinalstenose: bulging, flavum og facetter + sækken presses til trekløverform
saek_st = []
for q in basis(SAEK):
    c_ = Vector((0, midt(q.z), q.z)); rel = q - c_; rel.z = 0
    if rel.length < 1e-6: saek_st.append(Vector()); continue
    a = math.atan2(rel.x, -rel.y)                  # 0 fortil, ±pi bagtil
    bag = 0.5 - 0.5 * math.cos(a)                  # 1 bagtil
    posterolat = math.exp(-((abs(a) - 2.3) / 0.6) ** 2)
    f = (0.22 + 0.26 * bag + 0.18 * posterolat) * smoothstep(0.980, 0.992, q.z) * (1 - smoothstep(1.006, 1.016, q.z))
    saek_st.append(-rel * f)
key('spinalstenose', plus(bulging_disp(2.4 * mm), flavum_disp(4.2 * mm), facet_disp('v', 1.4 * mm, medialt=2.5 * mm), facet_disp('h', 1.4 * mm, medialt=2.5 * mm)),
    saek_ekstra=saek_st)
