#!/usr/bin/env python3
"""Byg den publicerbare claude.ai-version af en side fra repoet.

Brug:
  tools/build_artifact.py PAGE.html LIVE.html OUT.html

PAGE  er siden i repoet (fx risiko.html).
LIVE  er den aktuelle publicerede version, hentet med Artifact-værktøjets
      action "read" (kræves for mode=tool, hvis <head> med tema-CSS genbruges;
      ignoreres for mode=standalone).
OUT   er filen, der publiceres med Artifact-værktøjet (samme url som i
      tools/artifacts.json).

Lokale links (fx href="fraktur.html" og const X_URL = "fraktur.html") erstattes
med artifact-adresserne i tools/artifacts.json. App-specifikke dele (manifest,
service worker, udskriv-knap og elementer med data-app-only) fjernes, da de ikke
virker i claude.ai-visningen.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONF = json.load(open(os.path.join(ROOT, "tools", "artifacts.json"), encoding="utf-8"))
URLS = {k: v["url"] for k, v in CONF.items() if not k.startswith("_")}
NOPRINT = " Denne artefakt-version har ingen udskriv-knap — brug kopiér-knapperne."


def map_links(s, page):
    """Replace local links (relative to PAGE's folder) with artifact URLs."""
    here = os.path.dirname(page)
    for target, url in URLS.items():
        rel = os.path.relpath(target, here or ".").replace(os.sep, "/")
        s = s.replace(f'href="{rel}"', f'href="{url}"')
        s = s.replace(f'data-url="{rel}"', f'data-url="{url}"')
        s = re.sub(rf'(const [A-Z_]+ = )"{re.escape(rel)}";', rf'\1"{url}";', s)
    return s


def set_title(html, page):
    title = CONF[page].get("title")
    return re.sub(r"<title>.*?</title>", f"<title>{title}</title>", html, count=1) if title else html


def strip_app_only(s):
    # Removes <div ... data-app-only ...>...</div> blocks (no nested divs inside).
    return re.sub(r'\s*<div[^>]*data-app-only[^>]*>.*?</div>', "", s, flags=re.S)


def strip_skeleton(live):
    # A read of a published artifact returns the publish skeleton around the page.
    if "<body>" in live[:3000]:
        live = live[live.index("<body>") + len("<body>"):]
    return re.sub(r"\s*</body></html>\s*$", "\n", live)


def build_tool(page, live):
    src = open(os.path.join(ROOT, page), encoding="utf-8").read()
    live = strip_skeleton(live)
    head = live[: live.index('<header class="topbar">')].lstrip()
    body = src[src.index('<header class="topbar">'): src.index("</footer>") + len("</footer>")]
    body = body.replace('<span class="brand-icon"', '<span class="brand-mark"').replace('<p class="subtitle">', "<p>")
    body = re.sub(r'\s*<button id="printBtn"[^>]*>Udskriv</button>', "", body)
    body = body.replace("Ingen patientdata gemmes eller sendes.</p>", "Ingen patientdata gemmes eller sendes." + NOPRINT + "</p>", 1)
    scripts = [m for m in re.findall(r'<script src="([^"]+)"></script>', src) if not m.endswith("pwa.js")]
    here = os.path.dirname(page)
    js = "".join(open(os.path.join(ROOT, here, f), encoding="utf-8").read() for f in scripts)
    return set_title(head, page) + strip_app_only(map_links(body, page)) + "\n\n<script>\n" + map_links(js, page) + "</script>\n"


def build_standalone(page):
    src = open(os.path.join(ROOT, page), encoding="utf-8").read()
    title = re.search(r"<title>.*?</title>", src).group(0)
    style = src[src.index('<link rel="preconnect"'): src.index("</style>") + len("</style>")]
    body_start = src.index(">", src.index("<body")) + 1
    body = src[body_start: re.search(r'<script src="[^"]*pwa\.js">', src).start()].strip()
    return set_title(title, page) + "\n" + style + "\n\n" + strip_app_only(map_links(body, page)) + "\n"


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    page, live_path, out = sys.argv[1:]
    mode = CONF[page]["mode"]
    html = build_tool(page, open(live_path, encoding="utf-8").read()) if mode == "tool" else build_standalone(page)
    for bad in ("pwa.js", 'rel="manifest"', "serviceWorker", 'id="printBtn"'):
        if bad in html.split("<script>")[0]:
            sys.exit(f"Fejl: {bad} er stadig med i {out}")
    open(out, "w", encoding="utf-8").write(html)
    print(f"{page} -> {out} ({mode}) — publicér til {CONF[page]['url']}")


if __name__ == "__main__":
    main()
