"""Colour masks for an OpenStreetMap (standard style) screenshot: route overlay, road classes, water, parks, labels."""
from __future__ import annotations
import numpy as np
import cv2


def masks(rgb: np.ndarray) -> dict[str, np.ndarray]:
    a = rgb.astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    out: dict[str, np.ndarray] = {}
    # the blue directions overlay (also tints whatever road it lies on)
    out['route'] = (b > 150) & (b - r > 38) & (b - g > 22)
    # labels: dark grey glyphs (and the railway, which is drawn separately)
    out['text'] = (mx < 150) & (mx - mn < 30)
    # road fills
    out['minor'] = (mn >= 238) & (mx - mn < 14)  # white streets (JPEG greys their edges a little)
    out['secondary'] = (r > 232) & (g > 232) & (b > 140) & (b < 216)
    out['primary'] = (r > 235) & (g > 192) & (g < 230) & (b > 120) & (b < 196) & (r - b > 45)
    out['trunk'] = (r > 222) & (g > 140) & (g < 196) & (b > 120) & (b < 180) & (r - g > 35)
    # water and parks
    out['water'] = (b > 195) & (g > 185) & (r < 195) & (b - g < 42) & (b - r > 25) & ~out['route']
    out['park'] = (g > r + 10) & (g > b + 4) & (g > 160)
    # label halos are white: drop white pixels hugging dark glyphs
    halo = cv2.dilate(out['text'].astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    out['minor'] &= ~halo
    return out
