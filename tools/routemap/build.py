"""
Builds the data for the 3D route map from the traced streets (run trace.py first):

  python tools/routemap/build.py

  public/map/davangere.json  streets (by class), the route with its named stretches, the lake, parks, canals,
                             the railway, labels and the frame — metres, x east and z south of the venue
  public/map/city.bin        illustrative buildings and trees (the screenshot carries no building outlines):
                             houses along the real streets, facing them, denser near the route, taller on
                             main roads, with rooftop water tanks; neem and coconut trees in parks and yards
  public/map/ground.webp     the ground: land, parks and soft golden-hour shadows of every building baked in

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

# muted house colours of Davangere's streets
PALETTE = [
    (238, 230, 214), (242, 236, 224), (231, 218, 196), (236, 205, 190), (226, 214, 170), (205, 222, 214),
    (214, 206, 226), (240, 222, 172), (225, 190, 160), (208, 200, 188), (246, 240, 230), (222, 230, 200),
]

# the route's named stretches, by distance from the station (OSRM's steps, scaled to the traced length)
STEPS = [(560, 'Hadadi Road'), (3060, 'Vidhyanagar Road'), (4430, 'BIET Road'), (5330, 'Shamanur Road')]

LABELS = [  # places named on the map, at their screenshot positions
    ('Vinobanagara', (620, 150)),
    ('K.B. Extension', (1060, 262)),
    ('K.T. Jambanna Nagara', (1010, 488)),
]


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
    EDGE = 240  # metres, matching the fade of the ground and the streets
    edge_keep = lambda mx, mz: min(1.0, max(0.0, min(mx - bx0, bx1 - mx, mz - bz0, bz1 - mz) / EDGE)) ** 1.5  # noqa: E731

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
            col = int(rng.integers(len(PALETTE)))
            tank = 1 if rng.random() < 0.42 else 0
            bld.append((mx, mz, w, dpt, h, ang, col, tank))

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
            kind = 1 if (rng.random() < 0.28) else 0  # 1 coconut palm, 0 neem
            size = rng.uniform(0.8, 1.35)
            trees.append((mx, mz, kind, size))

    # ---------------------------------------------------------------- ground with baked shadows
    (x0, z0), (x1, z1) = d['bounds']
    G = 2048
    sx, sz = G / (x1 - x0), G / (z1 - z0)
    gp = lambda x, z: ((x - x0) * sx, (z - z0) * sz)  # noqa: E731
    base = Image.new('RGB', (G, G), (226, 212, 186))
    noise = (rng.random((G // 8, G // 8)) * 255).astype(np.uint8)
    nimg = Image.fromarray(noise).resize((G, G), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    base = Image.blend(base, Image.merge('RGB', [nimg] * 3).point(lambda v: 196 + v // 6), 0.28)
    dr = ImageDraw.Draw(base)
    for pk in d['parks']:
        dr.polygon([gp(*p) for p in pk], fill=(150, 176, 112))
    for lk in d['lakes']:
        dr.polygon([gp(*p) for p in lk], fill=(70, 104, 104))
    # shadows: each building's footprint swept away from the sun, then softened
    sh = Image.new('L', (G, G), 0)
    sd = ImageDraw.Draw(sh)
    ux, uz = -math.sin(SUN_AZ), math.cos(SUN_AZ)  # away from the sun, in x east / z south
    for mx, mz, w, dpt, h, ang, *_ in bld:
        L = h / math.tan(SUN_EL)
        c, s_ = math.cos(ang), math.sin(ang)
        corners = [(mx + c * a - s_ * b, mz + s_ * a + c * b) for a, b in ((-dpt / 2, -w / 2), (dpt / 2, -w / 2), (dpt / 2, w / 2), (-dpt / 2, w / 2))]
        swept = corners + [(px + ux * L, pz + uz * L) for px, pz in corners]
        hull = cv2.convexHull(np.array([gp(*p) for p in swept], np.float32))[:, 0, :]
        sd.polygon([tuple(p) for p in hull], fill=150)
    for mx, mz, kind, size in trees:
        L = (9 if kind else 6) * size / math.tan(SUN_EL)
        cx, cz = gp(mx + ux * L * 0.6, mz + uz * L * 0.6)
        r = (3.2 if kind else 4.2) * size * sx
        sd.ellipse([cx - r * 1.6, cz - r, cx + r * 1.6, cz + r], fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(2.2))
    shadow_col = Image.new('RGB', (G, G), (120, 96, 92))
    ground = Image.composite(shadow_col, base, sh.point(lambda v: int(v * 0.55)))
    # soft edges: the city fades out towards the border of the traced area
    yy, xx = np.mgrid[0:G, 0:G] / (G - 1)
    band = np.minimum(np.minimum(xx, 1 - xx) * (x1 - x0), np.minimum(yy, 1 - yy) * (z1 - z0))  # metres from the edge
    alpha = (np.clip(band / EDGE, 0, 1) ** 1.5 * 255).astype(np.uint8)
    ground.putalpha(Image.fromarray(alpha))
    OUT.mkdir(parents=True, exist_ok=True)
    ground.save(OUT / 'ground.webp', quality=82, method=6)

    # ---------------------------------------------------------------- binary: buildings and trees
    with open(OUT / 'city.bin', 'wb') as f:
        f.write(struct.pack('<II', len(bld), len(trees)))
        for mx, mz, w, dpt, h, ang, col, tank in bld:
            f.write(struct.pack('<hhBBBBBB', int(round(mx * 10)), int(round(mz * 10)), int(round(w * 10)), int(round(dpt * 10)), int(round(h * 5)), int(round((ang % math.pi) / math.pi * 255)) % 256, col, tank))
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
    }
    (OUT / 'davangere.json').write_text(json.dumps(data, separators=(',', ':')))
    sizes = {p.name: p.stat().st_size // 1024 for p in OUT.iterdir()}
    print(f'buildings {len(bld)} · trees {len(trees)} · files (KB) {sizes}')


if __name__ == '__main__':
    main()
