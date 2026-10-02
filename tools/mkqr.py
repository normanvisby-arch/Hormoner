#!/usr/bin/env python3
"""Lav QR-koderne til downloadsiden (apps.html).

Brug:
  python3 tools/mkqr.py

Kræver Python-pakken segno (pip install segno). Er opencv-python installeret, afkodes hver
QR-kode bagefter og sammenlignes med adressen, så en fejlbehæftet kode aldrig gemmes.
Koderne gemmes som skalerbare SVG-filer i qr/ (sort på hvid, så de kan scannes i mørk visning).
"""
import os
import sys

import segno

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://normanvisby-arch.github.io/Hormoner/"

# (fil, sti på GitHub Pages) — samme rækkefølge som på apps.html.
KODER = [
    ("apps", "apps.html"),
    ("kvindesundhed", "oversigt.html"),
    ("hjerte", "hjerte/"),
    ("lunge", "lunge/"),
    ("thyreoidea", "thyreoidea/"),
    ("diabetes", "diabetes/"),
    ("infektion", "infektion/"),
    ("nyre", "nyre/"),
    ("notat", "notat/"),
]


def tjek(qr, url):
    """Afkod QR-koden med OpenCV (hvis installeret) og sammenlign med adressen."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None
    import io

    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=8, border=4)
    img = cv2.imdecode(np.frombuffer(buf.getvalue(), np.uint8), cv2.IMREAD_GRAYSCALE)
    tekst, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    return tekst == url


def main():
    os.makedirs(os.path.join(ROOT, "qr"), exist_ok=True)
    fejl = 0
    for navn, sti in KODER:
        url = BASE + sti
        qr = segno.make(url, error="m")
        ok = tjek(qr, url)
        if ok is False:
            print(f"FEJL: {navn} kunne ikke afkodes til {url}")
            fejl += 1
            continue
        qr.save(os.path.join(ROOT, "qr", f"{navn}.svg"), kind="svg", border=4, dark="#000", light="#fff", xmldecl=False, omitsize=True, title=url)
        print(f"qr/{navn}.svg -> {url}" + (" (afkodet og kontrolleret)" if ok else " (ikke kontrolleret: opencv mangler)"))
    sys.exit(1 if fejl else 0)


if __name__ == "__main__":
    main()
