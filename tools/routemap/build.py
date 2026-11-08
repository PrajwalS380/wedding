"""
Builds the data for the 3D route map from the traced streets (run trace.py first):

  python tools/routemap/build.py

  public/map/davangere.json  streets (by class), the route with its named stretches, the lake, parks, canals,
                             the railway, labels, the frame — and the layouts of the two places the film
                             dwells on: the hall's plot beside Shamanur Road and the station's platform and
                             train. Metres, x east and z south of the venue.
  public/map/city.bin        illustrative buildings and trees (the screenshot carries no building outlines):
                             houses along the real streets, facing them, denser near the route, taller on
                             main roads; flags for rooftop water tanks, stair rooms, shopfronts and the roof's
                             finish; neem, coconut and gulmohar trees in parks and yards
  public/map/ground.webp     the ground: packed earth, red soil, dry grass and scrub on open plots, dusty road
                             shoulders, the railway's ballast, the lake's wet banks, paved forecourts, and
                             soft golden-hour shadows and contact shading of every building baked in

Everything is deterministic (fixed seeds).
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / 'public' / 'map'
DBG = HERE / 'out'

# late-afternoon sun from the west-south-west, low: long shadows towards the east-north-east
SUN_AZ = math.radians(250)  # compass bearing the sun is *at*
SUN_EL = math.radians(19)

# house colours of Davangere's streets: limewash, pastel distempers and a few brighter emulsions, all weathered
PALETTE = [
    (238, 230, 214), (242, 236, 224), (231, 218, 196), (236, 205, 190), (226, 214, 170), (205, 222, 214),
    (214, 206, 226), (240, 222, 172), (225, 190, 160), (208, 200, 188), (246, 240, 230), (222, 230, 200),
    (196, 214, 232), (238, 196, 204), (214, 232, 196), (244, 214, 150),
]

# the route's named stretches, by distance from the station (OSRM's steps, scaled to the traced length)
STEPS = [(560, 'Hadadi Road'), (3060, 'Vidhyanagar Road'), (4430, 'BIET Road'), (5330, 'Shamanur Road')]

LABELS = [  # places named on the map, at their screenshot positions
    ('Vinobanagara', (620, 150)),
    ('K.B. Extension', (1060, 262)),
    ('K.T. Jambanna Nagara', (1010, 488)),
]

EDGE = 240  # metres over which the city fades out at the border of the traced area (the scene uses the same)
ROAD_HALF = {1: 3.25, 2: 5.5, 3: 7.0, 4: 9.5}  # half the carriageway, as drawn by the scene

# a building's flags (the last byte of its record)
F_TANK, F_SHOP, F_MUMTY = 1, 2, 4
ROOF_SHIFT = 3  # bits 3–4: 0 grey concrete, 1 whitewashed, 2 red oxide, 3 weathered dark

# the hall's plot (metres along the road × deep) and the station's layout
PLOT_L, PLOT_D = 62.0, 50.0
TRACK = 2.6  # the two lines run this far either side of the traced railway
PLATFORM_L, PLATFORM_W = 380.0, 9.0
ISLAND_L, ISLAND_W = 340.0, 7.0
STATION_L, STATION_D = 84.0, 18.0
COACH, COACHES = 23.5, 13


def road_segments(roads):
    segs, half = [], []
    for r in roads:
        p = r['p']
        for i in range(len(p) - 1):
            segs.append((*p[i], *p[i + 1]))
            half.append(ROAD_HALF[r['c']])
    return np.array(segs), np.array(half)


def seg_dist(S, px, pz):
    ax, az, bx, bz = S.T
    dx, dz = bx - ax, bz - az
    L = dx * dx + dz * dz + 1e-9
    t = np.clip(((px - ax) * dx + (pz - az) * dz) / L, 0, 1)
    return np.hypot(px - ax - t * dx, pz - az - t * dz)


def rect(c, u, length, depth):
    """Corners of a rectangle centred at c, `length` along the unit vector u and `depth` across it."""
    n = np.array([-u[1], u[0]])
    return [tuple(c + u * a * length / 2 + n * b * depth / 2) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]


def inside(poly, x, z, margin=0.0):
    return cv2.pointPolygonTest(np.array(poly, np.float32), (float(x), float(z)), True) > -margin


def layout_hall(S, half):
    """The hall's plot: beside the road the route ends on, on whichever side has room, facing the road."""
    k = int(np.argmin(seg_dist(S, 0, 0)))
    ax, az, bx, bz = S[k]
    t = np.array([bx - ax, bz - az])
    t /= np.linalg.norm(t)
    best = None
    for side in (1, -1):
        n = side * np.array([-t[1], t[0]])
        c = n * (half[k] + 2 + PLOT_D / 2)
        worst = min((seg_dist(S, *(c + u * t * PLOT_L / 2 + v * n * PLOT_D / 2)) - half).min() for u in np.linspace(-1, 1, 9) for v in np.linspace(-1, 1, 7))
        if best is None or worst > best[0]:
            best = (worst, c, n)
    _, c, n = best
    return {'p': [round(float(c[0]), 1), round(float(c[1]), 1)], 'along': [round(float(t[0]), 4), round(float(t[1]), 4)], 'front': [round(float(-n[0]), 4), round(float(-n[1]), 4)], 'plot': [PLOT_L, PLOT_D]}


def along_polyline(pts, s):
    """Point and unit tangent at arc length s along a polyline (clamped)."""
    acc = 0.0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        L = float(np.linalg.norm(b - a))
        if acc + L >= s or i == len(pts) - 2:
            t = min(1.0, max(0.0, (s - acc) / L))
            return a + (b - a) * t, (b - a) / L
        acc += L
    raise ValueError


def clean_rail(rail):
    """The traced railway east of its junction is all but straight; the tracing zig-zags ±10 m and kinks 60 m at
    the station (the start marker sat on it). Fit a gentle curve through it and resample it every 40 m."""
    head, rest = rail[:1], rail[1:]
    q = np.polyfit(rest[:, 0], rest[:, 1], 2)
    ok = np.abs(rest[:, 1] - np.polyval(q, rest[:, 0])) < 12
    q = np.polyfit(rest[ok, 0], rest[ok, 1], 2)
    xs = np.linspace(rest[0, 0], rest[-1, 0], max(2, int((rest[-1, 0] - rest[0, 0]) / 40)))
    return np.vstack([head, np.stack([xs, np.polyval(q, xs)], 1)])


def layout_station(rail, station, route):
    """Davangere station on the railway at the route's start: the main platform and the station building on
    the side the route leaves by (the building just west of the approach road), an island platform across the
    tracks with a train standing at it."""
    best = None
    acc = 0.0
    for i in range(len(rail) - 1):
        a, b = rail[i], rail[i + 1]
        ab = b - a
        L = float(np.linalg.norm(ab))
        t = float(np.clip(np.dot(station - a, ab) / L**2, 0, 1))
        p = a + ab * t
        dd = float(np.linalg.norm(p - station))
        if best is None or dd < best[0]:
            best = (dd, p, ab / L, acc + t * L)
        acc += L
    _, p, u, s0 = best
    if u[0] < 0:
        u = -u
    n = np.array([-u[1], u[0]])
    ahead = route[min(len(route) - 1, 12)]  # ~50 m along the route
    if np.dot(ahead - p, n) < 0:
        n = -n
    platform = p + n * (TRACK + 1.7 + PLATFORM_W / 2)
    building = p - u * (STATION_L / 2 + 14) + n * (TRACK + 1.7 + PLATFORM_W + 3 + STATION_D / 2)
    island = p - n * (TRACK + 1.7 + ISLAND_W / 2) + u * 20
    train = []
    for i in range(COACHES + 1):  # a locomotive (the first) and its coaches, on the far line
        q, v = along_polyline(rail, s0 + 20 + (COACHES / 2 - i) * (COACH + 0.9))
        m = np.array([-v[1], v[0]])
        q = q - m * TRACK * (1 if np.dot(m, n) > 0 else -1)
        train.append([round(float(q[0]), 1), round(float(q[1]), 1), round(float(v[0]), 4), round(float(v[1]), 4)])
    r = lambda a: [round(float(a[0]), 1), round(float(a[1]), 1)]  # noqa: E731
    return {
        'p': r(p), 'along': [round(float(u[0]), 4), round(float(u[1]), 4)], 'side': [round(float(n[0]), 4), round(float(n[1]), 4)],
        'platform': r(platform), 'island': r(island), 'building': r(building), 'train': train,
        'sizes': {'platform': [PLATFORM_L, PLATFORM_W], 'island': [ISLAND_L, ISLAND_W], 'building': [STATION_L, STATION_D], 'track': TRACK, 'coach': COACH},
    }


def fbm(rng, G, cells=(6, 12, 24, 48, 96, 192), gain=0.55):
    out = np.zeros((G, G), np.float32)
    amp, tot = 1.0, 0.0
    for c in cells:
        out += cv2.resize(rng.random((c, c)).astype(np.float32), (G, G), interpolation=cv2.INTER_CUBIC) * amp
        tot += amp
        amp *= gain
    out /= tot
    return (out - out.min()) / (out.max() - out.min())


def main() -> None:
    d = json.loads((DBG / 'trace.json').read_text())
    fr = json.loads((DBG / 'frame.json').read_text())
    road = np.load(DBG / 'road-mask.npy')
    water = np.load(DBG / 'water-mask.npy')
    park = np.load(DBG / 'park-mask.npy')
    cmap = np.load(DBG / 'class-map.npy')
    H, W = road.shape
    mpp = fr['mpp']
    vx, vy = fr['venue_px']
    px2m = lambda x, y: ((x - vx) * mpp, (y - vy) * mpp)  # noqa: E731
    rng = np.random.default_rng(7)

    # distance (px) to the nearest street, and the direction towards it
    free = (~road).astype(np.uint8)
    dist = cv2.distanceTransform(free, cv2.DIST_L2, 5)
    gy, gx = np.gradient(cv2.GaussianBlur(dist, (0, 0), 1.2))
    main_road = (cmap >= 2)
    dist_main = cv2.distanceTransform((~main_road).astype(np.uint8), cv2.DIST_L2, 5)
    route_mask = np.zeros((H, W), np.uint8)
    rp = [(int(x / mpp + vx), int(z / mpp + vy)) for x, z in d['route']]
    cv2.polylines(route_mask, [np.array(rp, np.int32)], False, 1, 3)
    dist_route = cv2.distanceTransform((1 - route_mask).astype(np.uint8), cv2.DIST_L2, 5)
    land = ~road & ~water & ~park
    # the city thins out towards the edge of the traced area, as the ground and streets fade there
    (bx0, bz0), (bx1, bz1) = d['bounds']
    edge_keep = lambda mx, mz: min(1.0, max(0.0, min(mx - bx0, bx1 - mx, mz - bz0, bz1 - mz) / EDGE)) ** 1.5  # noqa: E731

    # the hall's plot and the station's yard: kept clear of generated houses and trees
    S, half = road_segments(d['roads'])
    hall = layout_hall(S, half)
    plot = rect(np.array(hall['p']), np.array(hall['along']), PLOT_L, PLOT_D)
    rail = clean_rail(np.array(d['rail'], float))
    d['rail'] = [[round(float(x), 1), round(float(z), 1)] for x, z in rail]
    stn = layout_station(rail, np.array(d['station'], float), np.array(d['route'], float))
    su, sn = np.array(stn['along']), np.array(stn['side'])
    yard = rect(np.array(stn['p']) + sn * (TRACK + 1.7 + (PLATFORM_W + 3 + STATION_D) / 2), su, PLATFORM_L + 20, PLATFORM_W + STATION_D + 10)
    island = rect(np.array(stn['island']), su, ISLAND_L + 20, ISLAND_W + 8)
    RS = np.array([(*rail[i], *rail[i + 1]) for i in range(len(rail) - 1)])
    reserved = lambda mx, mz, m: inside(plot, mx, mz, m) or inside(yard, mx, mz, m) or inside(island, mx, mz, m) or seg_dist(RS, mx, mz).min() < TRACK + 7 + m  # noqa: E731

    # ---------------------------------------------------------------- buildings
    bld = []
    step = 4.1
    for y in np.arange(2, H - 2, step):
        for x in np.arange(2, W - 2, step):
            jx, jy = x + rng.uniform(-1.1, 1.1), y + rng.uniform(-1.1, 1.1)
            ix, iy = int(jx), int(jy)
            if not (0 <= ix < W and 0 <= iy < H) or not land[iy, ix]:
                continue
            dr = dist_route[iy, ix]
            keep = (1.0 if dr < 150 else 0.55 if dr < 300 else 0.25) * edge_keep(*px2m(jx, jy))
            if rng.random() > keep:
                continue
            dd = dist[iy, ix]
            if dd < 1.6 or dd > 15 or (dd > 9 and rng.random() < 0.6):
                continue  # on the street, or deep in a block's open middle
            # face the nearest street
            ang = math.atan2(-gy[iy, ix], -gx[iy, ix])
            near_main = dist_main[iy, ix] < 7
            floors = rng.choice([1, 2, 2, 3, 3, 4, 5], p=[0.12, 0.28, 0.12, 0.2, 0.1, 0.12, 0.06]) if near_main else rng.choice([1, 2, 3, 4], p=[0.25, 0.45, 0.24, 0.06])
            h = floors * 3.15 + rng.uniform(0.3, 1.1)
            w = rng.uniform(8, 13.5) * (1.25 if near_main else 1)
            dpt = rng.uniform(10, 16)
            mx, mz = px2m(jx, jy)
            if reserved(mx, mz, 9):
                continue
            col = int(rng.integers(len(PALETTE)))
            mumty = floors >= 2 and rng.random() < 0.5  # the stair room on the roof
            tank = rng.random() < (0.85 if mumty else 0.38)  # usually perched on the stair room
            shop = near_main and rng.random() < 0.7
            roof = int(rng.choice(4, p=[0.58, 0.22, 0.1, 0.1]))
            flags = (F_TANK if tank else 0) | (F_SHOP if shop else 0) | (F_MUMTY if mumty else 0) | (roof << ROOF_SHIFT)
            bld.append((mx, mz, w, dpt, h, ang, col, flags))

    # ---------------------------------------------------------------- trees
    trees = []
    for y in np.arange(2, H - 2, 3.4):
        for x in np.arange(2, W - 2, 3.4):
            ix, iy = int(x + rng.uniform(-1, 1)), int(y + rng.uniform(-1, 1))
            if not (0 <= ix < W and 0 <= iy < H):
                continue
            p = 0.0
            if park[iy, ix]:
                p = 0.55
            elif land[iy, ix] and dist[iy, ix] > 8:
                p = 0.14  # back yards and open plots
            elif land[iy, ix] and 1.4 < dist[iy, ix] < 2.4:
                p = 0.025  # a few street trees
            if water[iy, ix] or rng.random() > p * edge_keep(*px2m(ix, iy)):
                continue
            mx, mz = px2m(ix + rng.uniform(-0.5, 0.5), iy + rng.uniform(-0.5, 0.5))
            if reserved(mx, mz, 2):
                continue
            r = rng.random()
            kind = 1 if r < 0.28 else 2 if r < 0.36 else 0  # 1 coconut palm, 2 gulmohar in flower, 0 neem
            size = rng.uniform(0.8, 1.35)
            trees.append((mx, mz, kind, size))

    # ---------------------------------------------------------------- ground
    (x0, z0), (x1, z1) = d['bounds']
    G = 2048
    sx, sz = G / (x1 - x0), G / (z1 - z0)
    gp = lambda x, z: ((x - x0) * sx, (z - z0) * sz)  # noqa: E731
    grng = np.random.default_rng(11)

    def footprint(mx, mz, w, dpt, ang):
        c, s_ = math.cos(ang), math.sin(ang)
        return [(mx + c * a - s_ * b, mz + s_ * a + c * b) for a, b in ((-dpt / 2, -w / 2), (dpt / 2, -w / 2), (dpt / 2, w / 2), (-dpt / 2, w / 2))]

    # how built-up each place is: the open land between neighbourhoods gets soil, dry grass and scrub
    built = Image.new('L', (G, G), 0)
    bd = ImageDraw.Draw(built)
    for mx, mz, w, dpt, h, ang, *_ in bld:
        bd.polygon([gp(*p) for p in footprint(mx, mz, w, dpt, ang)], fill=255)
    urban = np.asarray(built.filter(ImageFilter.GaussianBlur(22)), np.float32) / 255
    urban = np.clip(urban / max(1e-3, float(np.percentile(urban, 92))), 0, 1)
    openl = 1 - urban

    def mix(a, col, t):
        return a * (1 - t[..., None]) + np.array(col, np.float32) * t[..., None]

    def patches(n, lo, hi):
        return np.clip((n - lo) / (hi - lo), 0, 1)

    n1, n2, n3, n4, n5, n6 = (fbm(grng, G) for _ in range(6))
    g = np.empty((G, G, 3), np.float32)
    g[:] = (222, 205, 176)  # packed earth
    g = mix(g, (234, 221, 196), patches(n1, 0.45, 0.8) * 0.7)  # dust
    g = mix(g, (199, 152, 113), patches(n2, 0.55, 0.78) * (0.35 + 0.6 * openl))  # red soil
    g = mix(g, (186, 178, 126), patches(n3, 0.5, 0.72) * openl * 0.9)  # dry grass
    g = mix(g, (136, 150, 94), patches(n4, 0.62, 0.8) * openl * 0.8)  # scrub
    g = mix(g, (146, 131, 110), patches(n5, 0.7, 0.85) * openl * 0.7)  # dark soil of tilled plots
    g *= (0.94 + 0.12 * n6)[..., None]
    base = Image.fromarray(np.clip(g, 0, 255).astype(np.uint8))

    # parks: mottled grass
    pk_mask = Image.new('L', (G, G), 0)
    pd = ImageDraw.Draw(pk_mask)
    for pk in d['parks']:
        pd.polygon([gp(*p) for p in pk], fill=255)
    grass = np.empty((G, G, 3), np.float32)
    grass[:] = (124, 154, 86)
    grass = mix(grass, (156, 170, 100), patches(n1, 0.35, 0.75))
    grass *= (0.92 + 0.14 * n3)[..., None]
    base = Image.composite(Image.fromarray(np.clip(grass, 0, 255).astype(np.uint8)), base, pk_mask.filter(ImageFilter.GaussianBlur(1.2)))

    # dusty shoulders along every street, the railway's ballast, paved forecourts
    def stroke(base, col, lines, blur, opacity):
        m = Image.new('L', (G, G), 0)
        md = ImageDraw.Draw(m)
        for ln, wm in lines:
            pts = [gp(*p) for p in ln]
            md.line(pts, fill=255, width=max(1, int(round(wm * sx))), joint='curve')
            r = wm * sx / 2
            for px, py in (pts[0], pts[-1]):
                md.ellipse([px - r, py - r, px + r, py + r], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * opacity))
        return Image.composite(Image.new('RGB', (G, G), col), base, m)

    base = stroke(base, (228, 214, 188), [(r['p'], 2 * ROAD_HALF[r['c']] + 7) for r in d['roads']], 1.6, 0.75)
    base = stroke(base, (128, 118, 106), [(d['rail'], 2 * TRACK + 9)], 1.0, 0.95)
    dr = ImageDraw.Draw(base)
    dr.polygon([gp(*p) for p in plot], fill=(206, 200, 188))
    dr.polygon([gp(*p) for p in rect(np.array(stn['building']) + sn * 4, su, STATION_L + 24, STATION_D + 22)], fill=(198, 192, 182))

    # the lake: a fringe of reeds and wet dark banks
    for lk in d['lakes']:
        pts = [gp(*p) for p in lk] + [gp(*lk[0])]
        ring = Image.new('L', (G, G), 0)
        ImageDraw.Draw(ring).line(pts, fill=255, width=14, joint='curve')
        base = Image.composite(Image.new('RGB', (G, G), (118, 136, 86)), base, ring.filter(ImageFilter.GaussianBlur(3)).point(lambda v: int(v * 0.8)))
        ring = Image.new('L', (G, G), 0)
        ImageDraw.Draw(ring).line(pts, fill=255, width=6, joint='curve')
        base = Image.composite(Image.new('RGB', (G, G), (104, 92, 76)), base, ring.filter(ImageFilter.GaussianBlur(1.5)))
        ImageDraw.Draw(base).polygon(pts, fill=(64, 92, 90))

    # contact shading round every building, then the low sun's long shadows
    ao = built.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(2.2))
    ao = Image.fromarray((np.asarray(ao, np.float32) * 0.3).astype(np.uint8))
    base = Image.composite(Image.new('RGB', (G, G), (92, 78, 70)), base, ao)
    sh = Image.new('L', (G, G), 0)
    sd = ImageDraw.Draw(sh)
    ux, uz = -math.sin(SUN_AZ), math.cos(SUN_AZ)  # away from the sun, in x east / z south
    for mx, mz, w, dpt, h, ang, *_ in bld:
        L = h / math.tan(SUN_EL)
        corners = footprint(mx, mz, w, dpt, ang)
        swept = corners + [(px + ux * L, pz + uz * L) for px, pz in corners]
        hull = cv2.convexHull(np.array([gp(*p) for p in swept], np.float32))[:, 0, :]
        sd.polygon([tuple(p) for p in hull], fill=150)
    for mx, mz, kind, size in trees:
        L = (9 if kind == 1 else 6) * size / math.tan(SUN_EL)
        cx, cz = gp(mx + ux * L * 0.6, mz + uz * L * 0.6)
        r = (3.2 if kind == 1 else 4.2 if kind == 0 else 5.2) * size * sx
        sd.ellipse([cx - r * 1.6, cz - r, cx + r * 1.6, cz + r], fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(2.2))
    ground = Image.composite(Image.new('RGB', (G, G), (112, 92, 92)), base, sh.point(lambda v: int(v * 0.55)))
    # soft edges: the city fades out towards the border of the traced area
    yy, xx = np.mgrid[0:G, 0:G] / (G - 1)
    band = np.minimum(np.minimum(xx, 1 - xx) * (x1 - x0), np.minimum(yy, 1 - yy) * (z1 - z0))  # metres from the edge
    alpha = (np.clip(band / EDGE, 0, 1) ** 1.5 * 255).astype(np.uint8)
    ground.putalpha(Image.fromarray(alpha))
    OUT.mkdir(parents=True, exist_ok=True)
    ground.save(OUT / 'ground.webp', quality=84, method=6)

    # ---------------------------------------------------------------- binary: buildings and trees
    with open(OUT / 'city.bin', 'wb') as f:
        f.write(struct.pack('<II', len(bld), len(trees)))
        for mx, mz, w, dpt, h, ang, col, flags in bld:
            f.write(struct.pack('<hhBBBBBB', int(round(mx * 10)), int(round(mz * 10)), int(round(w * 10)), int(round(dpt * 10)), int(round(h * 5)), int(round((ang % math.pi) / math.pi * 255)) % 256, col, flags))
        for mx, mz, kind, size in trees:
            f.write(struct.pack('<hhBB', int(round(mx * 10)), int(round(mz * 10)), kind, int(round(size * 100))))

    # ---------------------------------------------------------------- json
    r1 = lambda p: [round(p[0], 1), round(p[1], 1)]  # noqa: E731
    total = d['routeLength']
    scale = total / 6100
    data = {
        'attribution': '© OpenStreetMap contributors',
        'venue': d['venue'],
        'bounds': d['bounds'],
        'station': d['station'],
        'sun': {'azimuth': round(math.degrees(SUN_AZ)), 'elevation': round(math.degrees(SUN_EL))},
        'route': {'points': d['route'], 'length': total, 'km': 6.1, 'minutes': 8, 'steps': [{'at': round(a * scale), 'name': n} for a, n in STEPS]},
        'roads': d['roads'],
        'lakes': d['lakes'],
        'canals': d['canals'],
        'parks': d['parks'],
        'rail': d['rail'],
        'labels': [{'name': n, 'p': r1(px2m(*p))} for n, p in LABELS],
        'colors': PALETTE,
        'hall': hall,
        'stationYard': stn,
    }
    (OUT / 'davangere.json').write_text(json.dumps(data, separators=(',', ':')))
    sizes = {p.name: p.stat().st_size // 1024 for p in OUT.iterdir()}
    print(f'buildings {len(bld)} · trees {len(trees)} · files (KB) {sizes}')
    print('hall', hall)
    print('station', {k: v for k, v in stn.items() if k != 'train'}, 'train', stn['train'][:2])
    print('yard clearance from streets', round(float(min((seg_dist(S, *p) - half).min() for p in yard)), 1))
    Image.fromarray(np.asarray(ground)[..., :3]).resize((1024, 1024)).save(DBG / 'ground-preview.png')


if __name__ == '__main__':
    main()
