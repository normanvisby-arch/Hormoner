#!/usr/bin/env python3
"""Hent den aktuelle restordre-liste fra restordre.dk til Restordre-appen.

Brug:
  python3 tools/hentrestordre.py            (henter https://www.restordre.dk/)
  python3 tools/hentrestordre.py FIL.html   (læser en gemt kopi af siden)

Skriver restordre/aktuelle.js med listen "Produkt i restordre — Foreslået alternativ —
Forventet levering", listen over præparater, der er tilbage på apoteket, og sidens dato
("Sidst opdateret"). restordre.dk sender ingen CORS-headere, så appen kan ikke hente siden
selv — kør scriptet, når listen er opdateret (typisk mandag og torsdag), og hæv VERSION i
restordre/sw.js. Scriptet stopper med en fejl, hvis siden har ændret opbygning.
"""
import datetime
import html
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://www.restordre.dk/"
UD = os.path.join(ROOT, "restordre", "aktuelle.js")
MDR = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "maj": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "okt": 10, "nov": 11, "dec": 12}


def tekst(s):
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def hent():
    if len(sys.argv) > 1:
        return open(sys.argv[1], encoding="utf-8").read()
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (klinikvaerktoejer; restordre-liste)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="replace")


def celle(row, titel):
    m = re.search(r"<div class=\"?cell\"? data-title=\"?" + re.escape(titel) + r"\"?>(.*?)</div>(?=<div class=\"?cell|</div>\s*$|</div><div class=\"?rowt|</div>\s*<div class=\"?rowt)", row, re.S)
    return m.group(1) if m else None


def main():
    s = hent()
    m = re.search(r"Sidst opdateret\s+(\d{1,2})\s+([A-Za-zæøå]{3})[a-zæøå.]*\s+(\d{4})", s)
    if not m:
        sys.exit("Fejl: fandt ikke 'Sidst opdateret' — har siden ændret opbygning?")
    opdateret = datetime.date(int(m.group(3)), MDR[m.group(2).lower()[:3]], int(m.group(1))).isoformat()

    tm = re.search(r"tilbage på apoteket igen:(.*?)<br", s, re.S)
    tilbage = tekst(tm.group(1)).rstrip(". ") if tm else ""

    rækker = re.split(r"<div class=\"?rowt\"?>", s)[1:]
    liste = []
    for r in rækker:
        produkt_html = celle(r, "Produkt i restordre")
        if produkt_html is None:
            continue
        dele = re.split(r"<br\s*/?>", produkt_html, maxsplit=1)
        produkt = tekst(dele[0])
        handelsnavn = tekst(dele[1]) if len(dele) > 1 else ""
        alt_html = celle(r, "Foreslået alternativ") or ""
        links = [html.unescape(u) for u in re.findall(r"href=\"?([^\"\s>]+)", alt_html)]
        alternativ = re.sub(r"\s*Kan ses\s+HER\s*\.?", "", tekst(alt_html)).strip()
        status = tekst(celle(r, "Status") or "")
        liste.append({
            "produkt": produkt,
            "handelsnavn": handelsnavn,
            "alternativ": alternativ,
            "links": links,
            "levering": tekst(celle(r, "Forventet levering") or ""),
            "ny": "NY" in status.upper() or bool(re.search(r">\s*NY\s*<", r)),
        })
    if len(liste) < 3:
        sys.exit(f"Fejl: kun {len(liste)} rækker fundet — har siden ændret opbygning?")

    data = {
        "kilde": URL,
        "opdateret": opdateret,
        "hentet": datetime.date.today().isoformat(),
        "tilbage": tilbage,
        "liste": liste,
    }
    with open(UD, "w", encoding="utf-8") as f:
        f.write("/*\n * Aktuel restordre-liste fra restordre.dk (Region Syddanmark på vegne af Danske Regioner).\n"
                " * Genereret af tools/hentrestordre.py — ret ikke i hånden. Listen opdateres typisk mandag\n"
                " * og torsdag og omfatter kun de hyppigste eller klinisk vanskeligste restordrer.\n */\n")
        f.write("var RESTORDRE_AKTUELLE = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
    print(f"{len(liste)} præparater i restordre (restordre.dk opdateret {opdateret}) -> {os.path.relpath(UD, ROOT)}")


if __name__ == "__main__":
    main()
