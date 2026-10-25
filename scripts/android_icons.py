#!/usr/bin/env python3
"""Genera los iconos de lanzador de Android (adaptativo + clásico) a partir del logo de TCG LAB.

Uso: python3 scripts/android_icons.py [ruta/al/proyecto/android]
"""
import pathlib
import sys

from PIL import Image, ImageDraw

BG = (16, 23, 34, 255)
BLUE = (98, 169, 255, 255)
LINE = (38, 52, 70, 255)
SS = 4  # supersampling para bordes suaves

TOP = [(12, 2), (2, 7), (12, 12), (22, 7)]
HOLE = [(12, 11), (14.5, 9.75), (12, 8.5), (9.5, 9.75)]
BOTTOM = [(12, 14.5), (7, 12), (2, 14.5), (12, 22), (22, 14.5), (17, 12)]

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}


def glyph(draw, box, hole_color):
    """Dibuja el logo (cuadrícula 24x24) dentro de box=(x, y, lado)."""
    x0, y0, side = box
    k = side / 24
    pts = lambda poly: [(x0 + x * k, y0 + y * k) for x, y in poly]
    draw.polygon(pts(TOP), fill=BLUE)
    draw.polygon(pts(HOLE), fill=hole_color)
    draw.polygon(pts(BOTTOM), fill=BLUE)


def foreground(px):
    """Capa frontal del icono adaptativo: lienzo de 108dp, logo en la zona segura (66%)."""
    n = px * SS
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    side = n * 0.5
    off = (n - side) / 2
    # El hueco se pinta con el color de fondo del icono adaptativo.
    glyph(ImageDraw.Draw(im), (off, off, side), BG)
    return im.resize((px, px), Image.LANCZOS)


def legacy(px, round_icon):
    n = px * SS
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if round_icon:
        d.ellipse([0, 0, n - 1, n - 1], fill=BG)
        d.ellipse([n * 0.03, n * 0.03, n * 0.97, n * 0.97], outline=LINE, width=max(2, n // 64))
    else:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=BG)
        d.rounded_rectangle([n * 0.03, n * 0.03, n * 0.97, n * 0.97], radius=int(n * 0.19), outline=LINE, width=max(2, n // 64))
    side = n * 0.5
    off = (n - side) / 2
    glyph(d, (off, off, side), BG)
    return im.resize((px, px), Image.LANCZOS)


def main():
    android = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "android")
    res = android / "app" / "src" / "main" / "res"
    if not res.is_dir():
        sys.exit(f"No existe {res}")

    for name, scale in DENSITIES.items():
        folder = res / f"mipmap-{name}"
        folder.mkdir(parents=True, exist_ok=True)
        foreground(round(108 * scale)).save(folder / "ic_launcher_foreground.png")
        legacy(round(48 * scale), False).save(folder / "ic_launcher.png")
        legacy(round(48 * scale), True).save(folder / "ic_launcher_round.png")

    # Icono adaptativo (Android 8+): fondo de color + logo.
    anydpi = res / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    adaptive = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/ic_launcher_background"/>\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
        "</adaptive-icon>\n"
    )
    (anydpi / "ic_launcher.xml").write_text(adaptive)
    (anydpi / "ic_launcher_round.xml").write_text(adaptive)

    values = res / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <color name="ic_launcher_background">#101722</color>\n</resources>\n'
    )
    # La plantilla trae el logo de Capacitor como vector: se elimina para que no haya recursos duplicados.
    for stale in (res / "drawable-v24").glob("ic_launcher_foreground.xml"):
        stale.unlink()
    for stale in (res / "drawable").glob("ic_launcher_background.xml"):
        stale.unlink()
    print("Iconos de Android generados en", res)


if __name__ == "__main__":
    main()
