"""
Generates favicon / app icons / web manifest / Open Graph image.

    python tools/make_brand_assets.py

Uses the OFL fonts in tools/fonts and the processed traditional cut-out master
(source-images/processed/couple-traditional-cutout-master.png).
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]

# Mirrors src/data/wedding.ts (couple.displayNames and the confirmed dates).
NAME_A, NAME_B = "Darshan", "Vathsala"
DATES_LINE = "15 & 16 November 2026  ·  Bapuji Samudhaya Bhavan, Davangere"
PUBLIC = ROOT / "public"
FONTS = ROOT / "tools" / "fonts"

EMERALD = (11, 48, 38)
NIGHT = (6, 25, 20)
GOLD = (213, 176, 109)
GOLD_LIGHT = (236, 212, 162)
IVORY = (246, 234, 213)


def font(name: str, size: int, variation: str | None = None) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONTS / name), size)
    if variation:
        try:
            f.set_variation_by_name(variation)
        except Exception:
            pass
    return f


def radial(size: tuple[int, int], center: tuple[float, float], radius: float, inner, outer) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, outer)
    glow = Image.new("L", size, 0)
    d = ImageDraw.Draw(glow)
    cx, cy = center
    steps = 60
    for i in range(steps, 0, -1):
        r = radius * i / steps
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=int(255 * (1 - i / steps) ** 1.4))
    img.paste(Image.new("RGB", size, inner), (0, 0), glow.filter(ImageFilter.GaussianBlur(radius / 12)))
    return img


def arch_path(d: ImageDraw.ImageDraw, box, width: int, color):
    x0, y0, x1, y1 = box
    w = x1 - x0
    r = w / 2
    d.arc((x0, y0, x1, y0 + w), 180, 360, fill=color, width=width)
    # PIL strokes arcs inward but lines on-centre: offset the legs to meet the arc.
    d.line((x0 + width / 2, y0 + r, x0 + width / 2, y1), fill=color, width=width)
    d.line((x1 - width / 2, y0 + r, x1 - width / 2, y1), fill=color, width=width)


def monogram_icon(size: int, maskable: bool = False) -> Image.Image:
    img = radial((size, size), (size / 2, size * 0.42), size * 0.75, (24, 74, 58), NIGHT)
    d = ImageDraw.Draw(img)
    pad = size * (0.2 if maskable else 0.12)
    arch_path(d, (pad, pad, size - pad, size - pad * 0.6), max(2, size // 64), GOLD)
    inner = pad + size * 0.04
    arch_path(d, (inner, inner, size - inner, size - pad * 0.6), max(1, size // 128), (150, 125, 80))
    # lozenge on the crown
    cx = size / 2
    s = size * 0.025
    d.polygon([(cx, pad - s * 1.8), (cx + s, pad - s * 0.6), (cx, pad + s * 0.6), (cx - s, pad - s * 0.6)], fill=GOLD)
    f = font("CormorantGaramond.ttf", int(size * (0.3 if maskable else 0.36)), "Medium")
    fi = font("CormorantGaramond-Italic.ttf", int(size * (0.2 if maskable else 0.24)), "Medium")
    v_w = d.textlength(NAME_A[0], font=f)
    a_w = d.textlength("&", font=fi)
    dd_w = d.textlength(NAME_B[0], font=f)
    total = v_w + a_w + dd_w + size * 0.01
    x = (size - total) / 2
    base = size * 0.68
    d.text((x, base), NAME_A[0], font=f, fill=IVORY, anchor="ls")
    d.text((x + v_w + size * 0.005, base - size * 0.005), "&", font=fi, fill=GOLD, anchor="ls")
    d.text((x + v_w + a_w + size * 0.01, base), NAME_B[0], font=f, fill=IVORY, anchor="ls")
    return img


def og_image() -> Image.Image:
    W, H = 1200, 630
    img = radial((W, H), (880, 330), 620, (74, 34, 22), NIGHT)
    overlay = radial((W, H), (220, 300), 520, (16, 60, 46), (0, 0, 0))
    img = Image.blend(img, Image.composite(overlay, img, Image.new("L", (W, H), 120)), 0.5)
    d = ImageDraw.Draw(img)

    # couple cut-out on the right, anchored to the bottom edge
    cut = Image.open(ROOT / "source-images" / "processed" / "couple-traditional-cutout-master.png").convert("RGBA")
    ch = 575
    cw = round(cut.width * ch / cut.height)
    cut = cut.resize((cw, ch), Image.LANCZOS)
    cx = W - cw + 24
    halo = Image.new("L", (W, H), 0)
    ImageDraw.Draw(halo).ellipse((cx + 40, 40, cx + cw - 20, H + 200), fill=150)
    img.paste(Image.new("RGB", (W, H), (150, 96, 52)), (0, 0), halo.filter(ImageFilter.GaussianBlur(90)))
    img.paste(cut, (cx, H - ch), cut)
    d = ImageDraw.Draw(img)

    # hairline frame
    d.rectangle((18, 18, W - 19, H - 19), outline=(*GOLD, ), width=1)
    d.rectangle((26, 26, W - 27, H - 27), outline=(120, 100, 64), width=1)

    eyebrow = font("Manrope.ttf", 19, "SemiBold")
    serif = font("CormorantGaramond.ttf", 104, "Medium")
    amp = font("CormorantGaramond-Italic.ttf", 66, "Medium")
    italic = font("CormorantGaramond-Italic.ttf", 31, "Regular")
    small = font("Manrope.ttf", 17, "Medium")

    x = 78
    text = "THE  WEDDING  OF"
    tx = x
    for ch_ in text:
        d.text((tx, 110), ch_, font=eyebrow, fill=GOLD, anchor="ls")
        tx += d.textlength(ch_, font=eyebrow) + 4.5
    d.text((x - 4, 232), NAME_A, font=serif, fill=GOLD_LIGHT, anchor="ls")
    d.text((x + 10, 292), "&", font=amp, fill=GOLD, anchor="ls")
    d.text((x - 4, 392), NAME_B, font=serif, fill=GOLD_LIGHT, anchor="ls")
    d.line((x, 432, x + 120, 432), fill=GOLD, width=1)
    d.polygon([(x + 132, 432), (x + 137, 427), (x + 142, 432), (x + 137, 437)], fill=GOLD)
    d.line((x + 154, 432, x + 274, 432), fill=GOLD, width=1)
    d.text((x, 486), "Two Families. One Beautiful Journey.", font=italic, fill=IVORY, anchor="ls")
    d.text((x, 538), DATES_LINE, font=small, fill=(220, 205, 175), anchor="ls")
    return img


FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#184a3a"/><stop offset="1" stop-color="#061914"/>
    </radialGradient>
  </defs>
  <rect width="64" height="64" rx="12" fill="url(#g)"/>
  <path d="M12 58 V30 C12 17 21 8 32 7 C43 8 52 17 52 30 V58" fill="none" stroke="#D5B06D" stroke-width="2"/>
  <path d="M32 3 l2.2 3 l-2.2 3 l-2.2 -3 Z" fill="#D5B06D"/>
  <text x="32" y="45" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, 'Times New Roman', serif" font-size="22" fill="#F6EAD5">D<tspan font-style="italic" font-size="15" fill="#D5B06D">&amp;</tspan>V</text>
</svg>
"""


def main() -> None:
    (PUBLIC / "og").mkdir(parents=True, exist_ok=True)
    (PUBLIC / "icons").mkdir(parents=True, exist_ok=True)
    (PUBLIC / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    monogram_icon(256).resize((32, 32), Image.LANCZOS).save(PUBLIC / "favicon-32.png")
    monogram_icon(360).resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-touch-icon.png")
    monogram_icon(192).save(PUBLIC / "icons" / "icon-192.png")
    monogram_icon(512).save(PUBLIC / "icons" / "icon-512.png")
    monogram_icon(512, maskable=True).save(PUBLIC / "icons" / "icon-maskable-512.png")
    og_image().save(PUBLIC / "og" / "og-image.jpg", quality=88, optimize=True, progressive=True)
    manifest = {
        "name": f"{NAME_A} & {NAME_B} — The Wedding Realm",
        "short_name": f"{NAME_A[0]} & {NAME_B[0]} Wedding",
        "description": f"Two Families. One Beautiful Journey. The wedding invitation of {NAME_A} and {NAME_B}, 15 & 16 November 2026.",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": "#061914",
        "theme_color": "#0B3026",
        "icons": [
            {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    (PUBLIC / "site.webmanifest").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print("brand assets written")


if __name__ == "__main__":
    main()
