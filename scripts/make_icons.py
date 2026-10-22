#!/usr/bin/env python3
"""Génère les icônes PWA (192 et 512 px) sans dépendance externe autre que Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)


def icon(size: int) -> Image.Image:
    im = Image.new("RGBA", (size, size), (15, 23, 42, 255))
    d = ImageDraw.Draw(im)
    r = size // 5
    d.rounded_rectangle([size * 0.08, size * 0.08, size * 0.92, size * 0.92], radius=r, fill=(30, 64, 175, 255))
    # Balance stylisée (barre + deux plateaux) = déontologie
    w = max(2, size // 40)
    cx, top = size / 2, size * 0.30
    d.line([(size * 0.22, top), (size * 0.78, top)], fill=(248, 250, 252), width=w)
    d.line([(cx, top), (cx, size * 0.62)], fill=(248, 250, 252), width=w)
    d.line([(size * 0.38, size * 0.66), (size * 0.62, size * 0.66)], fill=(248, 250, 252), width=w)
    for x in (size * 0.28, size * 0.72):
        d.line([(x, top), (x - size * 0.10, size * 0.48)], fill=(248, 250, 252), width=w)
        d.line([(x, top), (x + size * 0.10, size * 0.48)], fill=(248, 250, 252), width=w)
        d.arc([x - size * 0.11, size * 0.40, x + size * 0.11, size * 0.56], 0, 180, fill=(248, 250, 252), width=w)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * 0.17))
    except OSError:
        font = ImageFont.load_default()
    txt = "DEC 1"
    bb = d.textbbox((0, 0), txt, font=font)
    d.text(((size - (bb[2] - bb[0])) / 2, size * 0.70), txt, font=font, fill=(248, 250, 252))
    return im


for s in (192, 512):
    icon(s).save(OUT / f"icon-{s}.png")
print("icônes générées dans", OUT)
