"""
Traces Davangere's streets, the lake, parks, the railway and the route to the venue from a screenshot of
openstreetmap.org/directions (standard map style, zoom 14), and writes the data for the 3D route map.

  python tools/routemap/trace.py <screenshot.jpg>

The screenshot is not stored in the repository (it shows the phone's status bar); only the traced geometry is.
Map data © OpenStreetMap contributors (ODbL) — the site credits it under the map.

Georeferencing: the venue's exact position is known (wedding.ts → venue.coordinates) and sits at the tip of
the red destination marker; the map is zoom 14 on a phone with a device pixel ratio of 3 (420 CSS px across
the 1260 px screenshot), i.e. 3.08 m per screenshot pixel — confirmed by the route length (OSRM: 6.1 km; traced:
6.07 km), the Hadadi Road stretch (2.1 km; traced 2.13 km) and the railway station's latitude.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import networkx as nx
import numpy as np
import sknw
from PIL import Image
from skimage.morphology import skeletonize

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masks import masks  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'map'
DEBUG = Path(__file__).resolve().parent / 'out'

VENUE = (14.448417, 75.901618)
CROP = (1604, 2690, 0, 1138)  # y0, y1, x0, x1 of the map inside the screenshot
MPP = 156543.03392 * math.cos(math.radians(VENUE[0])) / 2 ** 14 / 3.0  # metres per screenshot pixel (zoom 14, device pixel ratio 3)


def rdp(pts: np.ndarray, eps: float) -> np.ndarray:
    """Ramer–Douglas–Peucker simplification of an (n, 2) polyline."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab) or 1e-9
    rel = pts - a
    d = np.abs(ab[0] * rel[:, 1] - ab[1] * rel[:, 0]) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([rdp(pts[: i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])


def chaikin(pts: np.ndarray, rounds: int = 2) -> np.ndarray:
    for _ in range(rounds):
        q = 0.75 * pts[:-1] + 0.25 * pts[1:]
        r = 0.25 * pts[:-1] + 0.75 * pts[1:]
        mid = np.empty((len(q) * 2, 2))
        mid[0::2], mid[1::2] = q, r
        pts = np.vstack([pts[:1], mid, pts[-1:]])
    return pts


def marker_tip(rgb: np.ndarray, kind: str) -> tuple[int, int]:
    a = rgb.astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r > 170) & (g < 90) & (b < 90) if kind == 'red' else (g > 150) & (r < 170) & (b < 110) & (g - r > 40)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8))
    k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    ys, xs = np.where(lab == k)
    i = int(np.argmax(ys))
    return int(xs[i]), int(ys[i])


def main(src: str) -> None:
    img = np.asarray(Image.open(src).convert('RGB'))
    y0, y1, x0, x1 = CROP
    rgb = img[y0:y1, x0:x1].copy()
    H, W = rgb.shape[:2]
    m = masks(rgb)

    venue_px = marker_tip(rgb, 'red')
    station_px = marker_tip(rgb, 'green')
    vx, vy = venue_px
    to_m = lambda p: [round((p[0] - vx) * MPP, 1), round((p[1] - vy) * MPP, 1)]  # x east, z south  # noqa: E731

    # areas that are UI, not map: the scale bar and both markers
    ui = np.zeros((H, W), bool)
    ui[H - 70 :, :330] = True
    ui[max(0, vy - 115) : vy - 4, max(0, vx - 45) : vx + 45] = True
    ui[: station_px[1] - 4, station_px[0] - 40 : station_px[0] + 40] = True

    # ---------------------------------------------------------------- roads
    cls = np.zeros((H, W), np.uint8)  # 1 minor, 2 secondary, 3 primary, 4 trunk
    sec = m['secondary'].astype(np.uint8)
    # pale-yellow school/college grounds are wide blobs, not roads: drop components wider than a road
    dt = cv2.distanceTransform(sec, cv2.DIST_L2, 5)
    blob = cv2.dilate((dt > 11).astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
    sec = sec.astype(bool) & ~blob
    for k, mk in ((1, m['minor']), (2, sec), (3, m['primary']), (4, m['trunk'])):
        cls[mk] = k
    road = (cls > 0) | m['route']
    road &= ~ui & ~m['water']
    road = cv2.morphologyEx(road.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0
    road = cv2.morphologyEx(road.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
    # drop specks (isolated bits of label halo, building fill)
    n_, lab_, st_, _ = cv2.connectedComponentsWithStats(road.astype(np.uint8), connectivity=8)
    road = np.isin(lab_, np.where(st_[:, cv2.CC_STAT_AREA] >= 60)[0]) & (lab_ > 0)
    # classes under the route overlay: inherit from the nearest coloured pixel
    known = cls > 0
    _, idx = cv2.distanceTransformWithLabels((~known).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ky, kx = np.where(known)
    lut = np.zeros(idx.max() + 1, np.uint8)
    lut[idx[ky, kx]] = cls[ky, kx]
    cls_full = lut[idx]

    sk = skeletonize(road)
    graph = sknw.build_sknw(sk.astype(np.uint16))
    roads = []
    for s, e in graph.edges():
        for _, ed in (graph[s][e].items() if graph.is_multigraph() else [(0, graph[s][e])]):
            pts = ed['pts'][:, ::-1].astype(float)  # (x, y)
            if len(pts) < 2:
                continue
            ends = graph.degree(s) == 1 or graph.degree(e) == 1
            if ed['weight'] < (10 if ends else 3):
                continue  # spurs left by labels and corners
            ps = np.vstack([graph.nodes[s]['o'][::-1], pts, graph.nodes[e]['o'][::-1]]).astype(float)
            c = np.bincount(cls_full[pts[:, 1].astype(int), pts[:, 0].astype(int)], minlength=5)
            k = int(np.argmax(c[1:]) + 1)
            line = rdp(ps, 0.9)
            roads.append({'c': k, 'p': [to_m(p) for p in line]})

    # Shamanur Road runs on under the venue marker (it shows on both sides of it): join it across
    roads.append({'c': 2, 'p': [to_m((vx, vy)), to_m((vx + 26, vy - 23)), to_m((vx + 54, vy - 46))]})

    # ---------------------------------------------------------------- the route
    # labels printed over the route leave holes: fill them from the route around them, then close
    band = cv2.dilate(m['route'].astype(np.uint8), np.ones((13, 13), np.uint8)) > 0
    rm = (m['route'] | (m['text'] & band) | (m['minor'] & band & cv2.dilate(m['text'].astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool))).astype(np.uint8)
    rm = cv2.morphologyEx(rm, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    rm = cv2.morphologyEx(rm, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    rsk = skeletonize(rm > 0)
    ys, xs = np.where(rsk)
    G = nx.Graph()
    pix = set(zip(xs.tolist(), ys.tolist()))
    for x, y in pix:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if (dx or dy) and (x + dx, y + dy) in pix:
                    G.add_edge((x, y), (x + dx, y + dy), weight=math.hypot(dx, dy))
    near = lambda p: min(pix, key=lambda q: (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2)  # noqa: E731
    comps = sorted(nx.connected_components(G), key=len, reverse=True)
    print('route skeleton components:', [len(c) for c in comps[:5]])
    a_, b_ = near(station_px), near(venue_px)
    print('ends', a_, b_, 'same component:', any(a_ in c and b_ in c for c in comps))
    path = nx.shortest_path(G, a_, b_, weight='weight')
    rp = np.array([station_px] + path + [venue_px], float)
    rp = chaikin(rdp(rp, 1.4), 2)
    route = [to_m(p) for p in rp]
    route_len = sum(math.dist(route[i], route[i + 1]) for i in range(len(route) - 1))

    # ---------------------------------------------------------------- water, parks, railway
    def polys(mask: np.ndarray, min_area: float, eps: float) -> list:
        cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        out = []
        for c in cs:
            if cv2.contourArea(c) < min_area:
                continue
            c = cv2.approxPolyDP(c, eps, True)[:, 0, :]
            out.append([to_m(p) for p in c])
        return out

    water = cv2.morphologyEx(m['water'].astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    lakes = polys(water, 1500, 1.2)
    canal_sk = skeletonize((water > 0) & ~(cv2.morphologyEx(water, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)) > 0))
    canals = []
    cg = sknw.build_sknw(canal_sk.astype(np.uint16))
    for s, e in cg.edges():
        ed = cg[s][e]
        if ed['weight'] > 25:
            canals.append([to_m(p) for p in rdp(ed['pts'][:, ::-1].astype(float), 1.0)])
    parks = polys(cv2.morphologyEx((m['park'] & ~ui).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), 120, 1.2)

    # the railway: the dark line across the top right
    txt = m['text'] & ~ui
    rail = []
    for x in range(640, W, 16):
        col = np.where(txt[0:150, x])[0]
        if len(col):
            rail.append([x, float(np.median(col))])
    rail = [to_m(p) for p in rdp(np.array(rail, float), 2.0)] if len(rail) > 1 else []

    # ---------------------------------------------------------------- write
    data = {
        'source': 'Traced from openstreetmap.org (standard map, zoom 14); map data © OpenStreetMap contributors, ODbL.',
        'venue': {'lat': VENUE[0], 'lng': VENUE[1]},
        'metresPerPixel': round(MPP, 4),
        'bounds': [to_m((0, 0)), to_m((W, H))],
        'station': to_m(station_px),
        'route': route,
        'routeLength': round(route_len),
        'roads': roads,
        'lakes': lakes,
        'canals': canals,
        'parks': parks,
        'rail': rail,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    DEBUG.mkdir(parents=True, exist_ok=True)
    (DEBUG / 'trace.json').write_text(json.dumps(data, separators=(',', ':')))
    np.save(DEBUG / 'road-mask.npy', road)
    np.save(DEBUG / 'water-mask.npy', water > 0)
    np.save(DEBUG / 'park-mask.npy', m['park'] & ~ui)
    np.save(DEBUG / 'class-map.npy', np.where(road, cls_full, 0).astype(np.uint8))
    (DEBUG / 'frame.json').write_text(json.dumps({'venue_px': venue_px, 'station_px': station_px, 'mpp': MPP, 'size': [W, H]}))
    print(f'metres/px {MPP:.3f} · venue px {venue_px} · station px {station_px} · route {route_len:.0f} m ({len(route)} pts)')
    print(f'roads {len(roads)} · lakes {len(lakes)} · canals {len(canals)} · parks {len(parks)} · rail pts {len(rail)}')
    # station lat/lng, as a check against the real station
    sx, sz = to_m(station_px)
    lat = VENUE[0] - sz / 111320
    lng = VENUE[1] + sx / (111320 * math.cos(math.radians(VENUE[0])))
    print(f'station ≈ {lat:.5f}, {lng:.5f}')


if __name__ == '__main__':
    main(sys.argv[1])
