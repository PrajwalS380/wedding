"""
Exports the scene renders (tools/scenes/out/*.png) for the website:

  * writes WebP files in two widths to public/images/celebrations/
  * regenerates the handmade-paper texture
  * writes src/data/sceneArt.generated.ts (sizes, crop focus, edge colours and live-light points)

Usage:  python tools/scenes/export.py      (after node tools/scenes/render-all.cjs)
Needs:  numpy, pillow (with WebP support)
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "out"
PUB = ROOT / "public" / "images" / "celebrations"
TS = ROOT / "src" / "data" / "sceneArt.generated.ts"
URL = "/images/celebrations"
QUALITY = 78

# scene -> orientation -> (source file, export widths, crop focus x, y)
SCENES = {
    "sunset": {"portrait": ("sunset-portrait", (1080, 720), (0.42, 0.5)), "landscape": ("sunset-landscape", (1920, 1280), (0.6, 0.5))},
    # the two ceremony arches use one upright picture whatever the screen
    "aarati": {"portrait": ("aarati", (720, 480), (0.5, 0.5)), "landscape": ("aarati", (720, 480), (0.5, 0.5))},
    "mangalya": {"portrait": ("mangalya", (720, 480), (0.5, 0.5)), "landscape": ("mangalya", (720, 480), (0.5, 0.5))},
    "venuemap": {"portrait": ("venuemap-portrait", (1080, 720), (0.5, 0.5)), "landscape": ("venuemap-landscape", (1600, 1080), (0.42, 0.5))},
    "doorway": {"portrait": ("doorway-portrait", (1080, 720), (0.5, 0.45)), "landscape": ("doorway-landscape", (1920, 1280), (0.5, 0.45))},
}
MAX_LIGHTS = 64


def edge_colours(im: Image.Image) -> tuple[str, str]:
    """Average colour of the top and bottom 4% of a picture: the page fades the scene into these."""
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    n = max(2, a.shape[0] // 25)
    hexc = lambda c: "#%02x%02x%02x" % tuple(int(round(v)) for v in c)
    return hexc(a[:n].mean((0, 1))), hexc(a[-n:].mean((0, 1)))


def lights(name: str) -> list[dict]:
    p = OUT / f"{name}.lights.json"
    return json.loads(p.read_text()) if p.exists() else []


def paper() -> None:
    rs = np.random.RandomState(7)
    W, H = 1200, 1700

    def noise(scale):
        small = rs.rand(max(2, H // scale), max(2, W // scale))
        return np.asarray(Image.fromarray((small * 255).astype("uint8")).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255.0

    mott = 0.5 * noise(120) + 0.3 * noise(40) + 0.2 * noise(10)
    img = np.array([246, 236, 214], np.float32)[None, None, :] * (0.94 + 0.08 * mott[..., None])
    img[..., 2] *= 0.985
    pil = Image.fromarray(np.clip(img, 0, 255).astype("uint8"))
    d = ImageDraw.Draw(pil, "RGBA")
    for _ in range(6000):  # cotton fibres
        x, y = rs.rand() * W, rs.rand() * H
        L, a = 5 + rs.rand() * 24, rs.rand() * np.pi
        pts = [(x + np.cos(a) * t + np.sin(t * 0.7) * 1.4, y + np.sin(a) * t + np.cos(t * 0.5)) for t in np.linspace(0, L, 7)]
        c = int(200 + rs.rand() * 40)
        d.line(pts, fill=(c, int(c * 0.93), int(c * 0.8), int(40 + rs.rand() * 50)), width=1)
    for _ in range(1100):  # flecks
        x, y, r = rs.rand() * W, rs.rand() * H, 0.4 + rs.rand() * 1.3
        c = int(120 + rs.rand() * 80)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(c, int(c * 0.85), int(c * 0.65), int(60 + rs.rand() * 90)))
    pil = pil.filter(ImageFilter.GaussianBlur(0.35))
    pil.save(PUB / "paper.webp", quality=QUALITY, method=6)


def fmt_lights(ls: list[dict]) -> str:
    keep = sorted(ls, key=lambda l: (l["kind"] != "glow", l["seed"]))[:MAX_LIGHTS]
    rows = [f"{{ x: {l['x']:.3f}, y: {l['y']:.3f}, r: {max(0.003, min(0.25, l['r'])):.4f}, kind: '{l['kind']}', seed: {l['seed']:.2f} }}" for l in keep if -0.02 <= l["x"] <= 1.02 and -0.02 <= l["y"] <= 1.02]
    return "[" + ", ".join(rows) + "]"


def main() -> None:
    PUB.mkdir(parents=True, exist_ok=True)
    for f in PUB.glob("*.webp"):
        f.unlink()
    entries, total = [], 0
    for key, variants in SCENES.items():
        parts = []
        for orient, (src, widths, focus) in variants.items():
            im = Image.open(OUT / f"{src}.png").convert("RGB")
            files = []
            for w in widths:
                h = round(im.height * w / im.width)
                name = f"{src}-{w}.webp"
                if not (PUB / name).exists():  # an art used for both orientations is written once
                    im.resize((w, h), Image.LANCZOS).save(PUB / name, quality=QUALITY, method=6)
                    total += (PUB / name).stat().st_size
                files.append((name, w, h))
            big = files[0]
            top, bottom = edge_colours(im)
            src_set = ", ".join(f"{URL}/{n} {w}w" for n, w, _ in sorted(files, key=lambda f: f[1]))
            parts.append(
                f"    {orient}: {{\n      src: '{URL}/{files[-1][0]}',\n      srcSet: '{src_set}',\n      width: {big[1]},\n      height: {big[2]},\n"
                f"      focus: [{focus[0]}, {focus[1]}],\n      edges: ['{top}', '{bottom}'],\n      lights: {fmt_lights(lights(src))},\n    }},"
            )
        entries.append(f"  {key}: {{\n" + "\n".join(parts) + "\n  },")

    plate = Image.open(OUT / "thamboola.png").convert("RGBA")
    pw = 760
    ph = round(plate.height * pw / plate.width)
    plate.resize((pw, ph), Image.LANCZOS).save(PUB / "thamboola.webp", quality=84, method=6)
    paper()

    TS.write_text(
        "// Generated by tools/scenes/export.py — do not edit by hand.\n"
        "import type { SceneArt, SceneKey } from './sceneArt'\n\n"
        "export const SCENES: Record<SceneKey, SceneArt> = {\n" + "\n".join(entries) + "\n}\n\n"
        f"export const THAMBOOLA = {{ src: '{URL}/thamboola.webp', width: {pw}, height: {ph} }}\n"
    )
    print(f"scenes: {total / 1024:.0f} KB total in {len(list(PUB.glob('*.webp')))} files")


if __name__ == "__main__":
    main()
