"""
THE WEDDING REALM — couple photo processing pipeline.

Reproducible, local-only processing of the three family-supplied photographs.

  * Originals in source-images/originals/ are NEVER modified.
  * Subject extraction: BiRefNet-portrait (via rembg, ONNX, runs on CPU).
  * Edge refinement: small-component removal, low-alpha suppression, targeted
    clean-up of specific artefacts, and pymatting multilevel foreground
    estimation to remove background colour bleed (halos) from hair edges.
  * Subtle, consistent colour grading (no face reshaping, no generative fill
    of the people; the only inpainting is of *background* plate pixels that are
    hidden behind the cut-out subject or a distracting tree stump).
  * Exports optimised WebP variants into public/images/ and lossless PNG
    masters into source-images/processed/ (not deployed).

Usage (Python 3.10+):
    pip install -r tools/requirements.txt
    python tools/process_photos.py            # writes assets
    python tools/process_photos.py --qa DIR   # also writes QA composites

Set NUMBA_CACHE_DIR to a short path on Windows if pymatting fails to cache.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / "source-images" / "originals"
MASTER = ROOT / "source-images" / "processed"
PUBLIC = ROOT / "public" / "images"

# Regions of interest in full-resolution pixel coordinates (left, top, right, bottom).
SEG_CROPS = {
    "traditional": None,
    "forest": (1000, 1900, 2600, 3700),
    "beach": (850, 800, 2400, 3500),
}


# --------------------------------------------------------------------------- utils
def load(name: str) -> Image.Image:
    return ImageOps.exif_transpose(Image.open(ORIG / f"couple-{name}-original.jpg")).convert("RGB")


def f32(img: Image.Image | np.ndarray) -> np.ndarray:
    return np.asarray(img, dtype=np.float32) / 255.0


def to_img(x: np.ndarray) -> Image.Image:
    return Image.fromarray((np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8))


def smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def grade(
    x: np.ndarray,
    exposure: float = 1.0,
    warmth: float = 0.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    lift: float = 0.0,
    rolloff: float = 0.0,
    tint: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> np.ndarray:
    """Gentle, global, skin-safe grade on float RGB (0..1)."""
    y = x * exposure
    y = y * np.array([1 + warmth * 0.05, 1 + warmth * 0.012, 1 - warmth * 0.05], np.float32)
    y = y * np.array(tint, np.float32)
    knee = 0.78
    over = np.clip(y - knee, 0, None)
    y = np.where(y > knee, knee + over / (1 + over * rolloff * 5), y)
    y = 0.46 + (y - 0.46) * contrast
    y = y + lift * (1 - np.clip(y, 0, 1)) ** 3
    luma = (y * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True)
    y = luma + (y - luma) * saturation
    return np.clip(y, 0, 1)


def vignette(h: int, w: int, strength: float, cx: float = 0.5, cy: float = 0.45) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx / w - cx) / 0.75) ** 2 + ((yy / h - cy) / 0.85) ** 2)
    return (1 - strength * smoothstep(0.35, 1.05, d))[..., None]


# ----------------------------------------------------------------- segmentation
def segment(name: str, img: Image.Image) -> np.ndarray:
    from rembg import new_session, remove

    cache = MASTER / f"{name}-mask-raw.png"
    if cache.exists():
        return f32(Image.open(cache).convert("L"))
    session = segment.session = getattr(segment, "session", None) or new_session("birefnet-portrait")
    mask = remove(img, session=session, only_mask=True)
    MASTER.mkdir(parents=True, exist_ok=True)
    mask.save(cache)
    return f32(mask)


def refine_alpha(a: np.ndarray) -> np.ndarray:
    """Keep the main subject, drop speckles, suppress faint haze."""
    hard = (a > 0.5).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(hard, connectivity=8)
    if n > 2:
        areas = stats[1:, cv2.CC_STAT_AREA]
        keep = np.zeros_like(hard)
        for i, area in enumerate(areas, start=1):
            if area >= 0.02 * areas.max():
                keep[labels == i] = 1
        near = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
        a = a * near
    # suppress low-alpha haze while retaining wisps of hair
    a = np.clip((a - 0.07) / 0.86, 0, 1)
    return a


def open_region(a: np.ndarray, box: tuple[int, int, int, int], k: int) -> np.ndarray:
    """Morphological opening restricted to a box — removes thin protrusions."""
    l, t, r, b = box
    sub = a[t:b, l:r]
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    opened = cv2.dilate(cv2.erode(sub, kernel), kernel)
    a = a.copy()
    a[t:b, l:r] = np.minimum(sub, opened)
    return a


def decontaminate(rgb: np.ndarray, a: np.ndarray) -> np.ndarray:
    """Estimate true foreground colour at soft edges (removes halos)."""
    from pymatting import estimate_foreground_ml

    fg = estimate_foreground_ml(rgb.astype(np.float64), a.astype(np.float64))
    fg = np.clip(fg, 0, 1).astype(np.float32)
    # interior stays the original pixel exactly; only edges use the estimate
    w = smoothstep(0.98, 0.999, a)[..., None]
    return fg * (1 - w) + rgb * w


def contact_shadow(a: np.ndarray, strength: float = 0.42) -> np.ndarray:
    """Soft elliptical ground shadow under the lowest part of the subject."""
    h, w = a.shape
    rows = np.where(a.max(axis=1) > 0.5)[0]
    cols = np.where(a[rows[-1] - int(h * 0.06) : rows[-1]].max(axis=0) > 0.5)[0]
    cy = rows[-1] - int(h * 0.006)
    cx = (cols[0] + cols[-1]) / 2
    rx = (cols[-1] - cols[0]) * 0.62 + w * 0.02
    ry = h * 0.018
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    s = np.exp(-d * 1.6) * strength
    return cv2.GaussianBlur(s, (0, 0), h * 0.006)


def premultiply_over_shadow(fg: np.ndarray, a: np.ndarray, shadow: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    shadow_rgb = np.array([0.05, 0.07, 0.05], np.float32)
    out_a = a + shadow * (1 - a)
    rgb = (fg * a[..., None] + shadow_rgb * (shadow * (1 - a))[..., None]) / np.maximum(out_a[..., None], 1e-5)
    return rgb, out_a


# ----------------------------------------------------------------------- export
MANIFEST: dict[str, dict] = {}


def export(key: str, rel: str, rgb: np.ndarray, alpha: np.ndarray | None, widths: list[int], quality: int = 84) -> None:
    """Writes WebP variants + a PNG master, records dimensions for the manifest."""
    h, w = rgb.shape[:2]
    if alpha is not None:
        arr = np.dstack([rgb, alpha])
        mode = "RGBA"
    else:
        arr = rgb
        mode = "RGB"
    full = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), mode)
    MASTER.mkdir(parents=True, exist_ok=True)
    full.save(MASTER / f"{Path(rel).name}-master.png", optimize=True)
    variants = []
    for target in widths:
        tw = min(target, w)
        th = round(h * tw / w)
        im = full.resize((tw, th), Image.LANCZOS) if tw != w else full
        out = PUBLIC / f"{rel}-{tw}.webp"
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, "WEBP", quality=quality, method=6, alpha_quality=95, exact=False)
        variants.append({"src": f"/images/{rel}-{tw}.webp", "width": tw, "height": th, "bytes": out.stat().st_size})
    MANIFEST[key] = {"width": variants[-1]["width"], "height": variants[-1]["height"], "variants": variants}
    print(f"  {key}: " + ", ".join(f"{v['width']}w {v['bytes'] // 1024}KB" for v in variants))


# --------------------------------------------------------------------- per photo
def process_traditional(qa: Path | None) -> None:
    print("traditional")
    img = load("traditional")
    rgb = f32(img)
    a = refine_alpha(segment("traditional", img))
    fg = decontaminate(rgb, a)
    fg = grade(fg, exposure=1.0, warmth=0.45, contrast=1.04, saturation=0.97, lift=0.02, rolloff=0.35)
    # Bottom edge of the frame cuts through the arms; trim to the subject's bbox.
    rows = np.where(a.max(axis=1) > 0.02)[0]
    cols = np.where(a.max(axis=0) > 0.02)[0]
    t, l, r = max(rows[0] - 12, 0), max(cols[0] - 12, 0), min(cols[-1] + 12, a.shape[1])
    export("traditionalCutout", "portraits/couple-traditional-cutout", fg[t:, l:r], a[t:, l:r], [640, 1064], quality=88)
    if qa:
        qa_composite(qa / "traditional-cutout", fg[t:, l:r], a[t:, l:r])


def process_forest(qa: Path | None) -> None:
    print("forest")
    img = load("forest")
    full = f32(img)
    x0, y0, x1, y1 = SEG_CROPS["forest"]
    crop = img.crop(SEG_CROPS["forest"])
    a_crop = refine_alpha(segment("forest", crop))
    # Remove a thin smear of light ground captured beside the groom's right shoe.
    a_crop = open_region(a_crop, (520, 1530, 700, 1660), 17)
    a_full = np.zeros(full.shape[:2], np.float32)
    a_full[y0:y1, x0:x1] = a_crop

    # Story composition (4:5) — couple framed by the pines.
    sx0, sy0, sx1, sy1 = 887, 1486, 2705, 3758
    rgb = full[sy0:sy1, sx0:sx1]
    a = a_full[sy0:sy1, sx0:sx1]

    # Foreground subject layer
    fg = decontaminate(rgb, a)
    fg = grade(fg, exposure=1.02, warmth=0.55, contrast=1.05, saturation=0.95, lift=0.015, rolloff=0.5)
    shadow = contact_shadow(a, 0.38)
    fg_rgb, fg_a = premultiply_over_shadow(fg, a, shadow)

    # Background "clean plate": couple + foreground stump removed, softened, pushed toward emerald.
    hole = (cv2.dilate((a > 0.03).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61))) > 0).astype(np.uint8)
    stump = np.zeros_like(hole)
    cv2.ellipse(stump, ((1560 - sx0), (3690 - sy0)), (150, 230), 0, 0, 360, 1, -1)
    hole = np.maximum(hole, stump)
    small_w = 900
    scale = small_w / rgb.shape[1]
    small = cv2.resize((rgb * 255).astype(np.uint8), None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    small_hole = cv2.resize(hole, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    plate = cv2.inpaint(small, small_hole, 12, cv2.INPAINT_TELEA)
    plate = cv2.resize(plate, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255
    # keep original detail outside the hole, inpaint only inside
    soft_hole = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 6)[..., None]
    bg = rgb * (1 - soft_hole) + plate * soft_hole
    bg = cv2.GaussianBlur(bg, (0, 0), 5.5)
    bg = grade(bg, exposure=0.8, warmth=0.15, contrast=1.02, saturation=0.82, rolloff=0.6, tint=(0.94, 1.0, 0.95))
    bg = bg * vignette(*bg.shape[:2], 0.45)

    export("storyBackground", "story/forest-plate", bg, None, [640, 1000], quality=80)
    export("storySubject", "story/couple-forest-cutout", fg_rgb, fg_a, [640, 1000], quality=88)

    # Magical Moments — wider, natural environmental frame (no cut-out).
    mx0, my0, mx1, my1 = 596, 1096, 2996, 4096
    m = grade(full[my0:my1, mx0:mx1], exposure=1.0, warmth=0.6, contrast=1.05, saturation=0.93, lift=0.02, rolloff=0.6)
    m = m * vignette(*m.shape[:2], 0.3, cy=0.55)
    export("momentsForest", "gallery/couple-forest-moment", m, None, [600, 960], quality=82)

    if qa:
        qa_composite(qa / "forest-cutout", fg_rgb, fg_a)
        comp = bg * (1 - fg_a[..., None]) + fg_rgb * fg_a[..., None]
        to_img(comp).resize((800, 1000), Image.LANCZOS).save(qa / "forest-story-composite.jpg", quality=90)


def process_beach(qa: Path | None) -> None:
    print("beach")
    img = load("beach")
    x0, y0, x1, y1 = SEG_CROPS["beach"]
    crop = img.crop(SEG_CROPS["beach"])
    rgb = f32(crop)
    a = refine_alpha(segment("beach", crop))

    # Remove the wet-sand reflection the model captured beside the groom's
    # rear foot, directly under its sole (measured on a coordinate grid at
    # 200%: crop x 1162-1300, y 2523-2560; the front foot's big toe ends at
    # x≈1155). A colour-based filter was tried and rejected because it
    # damaged the toes; a feathered erase of only this region keeps both
    # people's feet intact.
    h, w = a.shape
    erase = np.zeros_like(a)
    erase[2524:2562, 1162:1302] = 1
    erase = cv2.GaussianBlur(erase, (0, 0), 1.6)
    a = a * (1 - erase)

    fg = decontaminate(rgb, a)
    fg = grade(fg, exposure=1.02, warmth=0.9, contrast=1.05, saturation=1.0, lift=0.01, rolloff=0.4)
    rows = np.where(a.max(axis=1) > 0.02)[0]
    cols = np.where(a.max(axis=0) > 0.02)[0]
    t, b = max(rows[0] - 16, 0), min(rows[-1] + 6, h)
    l, r = max(cols[0] - 16, 0), min(cols[-1] + 16, w)
    export("invitationSubject", "portraits/couple-beach-cutout", fg[t:b, l:r], a[t:b, l:r], [460, 760], quality=88)

    # Magical Moments — the original seascape kept intact, softly graded.
    full = f32(img)
    mx0, my0, mx1, my1 = 424, 900, 2824, 3900
    m = grade(full[my0:my1, mx0:mx1], exposure=1.0, warmth=0.75, contrast=1.06, saturation=1.0, lift=0.0, rolloff=0.7)
    m = m * vignette(*m.shape[:2], 0.25, cy=0.5)
    export("momentsBeach", "gallery/couple-beach-moment", m, None, [600, 960], quality=82)
    if qa:
        qa_composite(qa / "beach-cutout", fg[t:b, l:r], a[t:b, l:r])


def qa_composite(stem: Path, rgb: np.ndarray, a: np.ndarray) -> None:
    stem.parent.mkdir(parents=True, exist_ok=True)
    for label, col in (("dark", (0.04, 0.19, 0.15)), ("light", (0.96, 0.92, 0.84))):
        bg = np.ones_like(rgb) * np.array(col, np.float32)
        comp = rgb * a[..., None] + bg * (1 - a[..., None])
        im = to_img(comp)
        im.thumbnail((900, 900), Image.LANCZOS)
        im.save(f"{stem}-{label}.jpg", quality=90)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--qa", type=Path, default=None, help="directory for QA composites")
    ap.add_argument("--only", choices=["traditional", "forest", "beach"], default=None)
    args = ap.parse_args()
    manifest_path = MASTER / "manifest.json"
    if manifest_path.exists():
        MANIFEST.update(json.loads(manifest_path.read_text()))
    steps = {"traditional": process_traditional, "forest": process_forest, "beach": process_beach}
    for name, fn in steps.items():
        if args.only and args.only != name:
            continue
        fn(args.qa)
    MASTER.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(MANIFEST, indent=2))
    print("manifest ->", manifest_path)


if __name__ == "__main__":
    os.environ.setdefault("NUMBA_CACHE_DIR", str(Path(os.environ.get("TEMP", "/tmp")) / "nbc"))
    main()
