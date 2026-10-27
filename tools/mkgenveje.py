#!/usr/bin/env python3
"""Byg zip-filen med skrivebordsgenveje til alle apps (alle/klinikvaerktoejer-genveje.zip).

Brug: python3 tools/mkgenveje.py

Laver også icons/favicon.ico for hver app (bruges som ikon i Windows-genvejene).
Windows: .url-filer (Internetgenvej med appens ikon). Mac: .webloc-filer.
Listen APPS skal svare til kortene på apps.html.
"""
import os
import zipfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://normanvisby-arch.github.io/Hormoner/"
# (filnavn, sti på GitHub Pages, mappe med icons/)
APPS = [
    ("Alle klinikvaerktoejer", "alle/", "alle"),
    ("Kvindesundhed", "oversigt.html", ""),
    ("Hjerte-kar", "hjerte/", "hjerte"),
    ("Lunger", "lunge/", "lunge"),
    ("Hypothyreose", "thyreoidea/", "thyreoidea"),
    ("Type 2-diabetes", "diabetes/", "diabetes"),
    ("Infektioner", "infektion/", "infektion"),
    ("Nyrer", "nyre/", "nyre"),
    ("Svangreomsorg", "svangre/", "svangre"),
    ("Psyke og hukommelse", "psyke/", "psyke"),
    ("Restordre", "restordre/", "restordre"),
]
LAES = """Klinikværktøjer til almen praksis — genveje til skrivebordet

Windows: åbn mappen "Windows", markér alle genveje (Ctrl+A), og træk dem ud på skrivebordet.
Mac: åbn mappen "Mac", markér alle (⌘A), og træk dem ud på skrivebordet eller i Dock.

Genvejene åbner apps i din standardbrowser. Vil du have dem som rigtige apps med eget vindue,
der virker uden internet, så åbn "Alle klinikvaerktoejer" i Chrome eller Edge og klik
"Installér alle apps".

Intet gemmes eller sendes. https://normanvisby-arch.github.io/Hormoner/apps.html
"""
DATO = (2026, 10, 27, 0, 0, 0)


def url_fil(url, ikon):
    return f"[InternetShortcut]\r\nURL={url}\r\nIconFile={ikon}\r\nIconIndex=0\r\n"


def webloc(url):
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
        '<plist version="1.0">\n<dict>\n\t<key>URL</key>\n\t<string>' + url + "</string>\n</dict>\n</plist>\n"
    )


def tilfoej(z, navn, data):
    info = zipfile.ZipInfo(navn, DATO)
    info.compress_type = zipfile.ZIP_STORED
    info.external_attr = 0o644 << 16
    z.writestr(info, data.encode("utf-8"))


def main():
    for _, _, mappe in APPS:
        png = os.path.join(ROOT, mappe, "icons", "icon-512.png")
        ico = os.path.join(ROOT, mappe, "icons", "favicon.ico")
        Image.open(png).save(ico, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    ud = os.path.join(ROOT, "alle", "klinikvaerktoejer-genveje.zip")
    with zipfile.ZipFile(ud, "w") as z:
        tilfoej(z, "Klinikvaerktoejer/LAES MIG.txt", "﻿" + LAES.replace("\n", "\r\n"))
        for navn, sti, mappe in APPS:
            url = BASE + sti
            ikon = BASE + (mappe + "/" if mappe else "") + "icons/favicon.ico"
            tilfoej(z, f"Klinikvaerktoejer/Windows/{navn}.url", url_fil(url, ikon))
            tilfoej(z, f"Klinikvaerktoejer/Mac/{navn}.webloc", webloc(url))
    print(f"{ud}: {len(APPS)} apps × 2 genveje")


if __name__ == "__main__":
    main()
