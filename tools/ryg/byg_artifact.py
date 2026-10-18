#!/usr/bin/env python3
"""Byg claude.ai-versionen af MR-columna i 3D (ryg/index.html).

Brug:
  python3 tools/ryg/byg_artifact.py LIVE.html MODEL.glb OUT.html

LIVE   et publiceret værktøjs-artifact (fx Restordre, hentet med Artifact-værktøjets
       action "read"); dets <head> med fælles tema-CSS (lys/mørk) genbruges.
MODEL  modellen UDEN meshopt (fx `gltf-transform quantize model.glb model_q.glb`), da
       meshopt-dekoderen kræver WebAssembly. Den indlejres som gzip/base64.
OUT    filen, der publiceres med Artifact-værktøjet.

three.js hentes fra jsDelivr (artifactets CSP tillader scripts derfra); manifest,
service worker og installér-knap fjernes.
"""
import base64
import gzip
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONF = json.load(open(os.path.join(ROOT, "tools", "artifacts.json"), encoding="utf-8"))
THREE = "https://cdn.jsdelivr.net/npm/three@0.170.0/"

# ryg-stilen fra style.css med artifactets tema-tokens (lys og mørk).
CSS = """
<style>
  :root { --primary: #2c5f7c; --primary-dark: #1f465c; --primary-contrast: #ffffff;
          --scene-a: #fbfcfd; --scene-b: #dfe6ec; --label-bg: rgba(255,255,255,0.88); --label-fg: #1f2933; --label-border: rgba(31,41,51,0.18); }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --primary: #8cc4e0; --primary-dark: #6aaed0; --primary-contrast: #06141c;
          --scene-a: #2a3438; --scene-b: #141b1e; --label-bg: rgba(20,27,30,0.86); --label-fg: #e7ece9; --label-border: rgba(231,236,233,0.22); } }
  :root[data-theme="dark"] { --primary: #8cc4e0; --primary-dark: #6aaed0; --primary-contrast: #06141c;
          --scene-a: #2a3438; --scene-b: #141b1e; --label-bg: rgba(20,27,30,0.86); --label-fg: #e7ece9; --label-border: rgba(231,236,233,0.22); }
  .tag-ok { background: var(--green-bg); color: var(--green-text); border: 1px solid var(--green-border); }
  .ryg-proto { font-size: 0.7em; font-weight: 600; background: color-mix(in srgb, var(--primary-contrast) 18%, transparent); border-radius: 999px; padding: 0.1rem 0.55rem; vertical-align: middle; white-space: nowrap; }
  .ryg-layout { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.2fr); }
  @media (max-width: 880px) { .ryg-layout { grid-template-columns: minmax(0, 1fr); } }
  .ryg-tekst { width: 100%; min-height: 9rem; font: inherit; font-size: 0.92rem; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; resize: vertical; box-sizing: border-box; background: var(--surface); color: var(--text); }
  .ryg-tekst:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
  .ryg-h2 { margin-top: 1.25rem; }
  .ryg-advarsel { color: var(--red-text); }
  .ryg-fund { display: flex; flex-direction: column; gap: 0.45rem; }
  .ryg-fund-raekke { position: relative; border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: 6px; padding: 0.45rem 4.2rem 0.45rem 0.6rem; background: var(--surface); color: var(--text); display: flex; flex-wrap: wrap; gap: 0.3rem 0.5rem; align-items: center; }
  .ryg-fund-skjult { border-left-color: var(--border); opacity: 0.8; }
  .ryg-fund-raekke .checkbox { margin: 0; }
  .ryg-fund-raekke .tag { margin-left: 0; }
  .ryg-fund-valg { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .ryg-fund-valg select, .ryg-tilfoej select { font: inherit; font-size: 0.85rem; padding: 0.2rem 0.3rem; border: 1px solid var(--border); border-radius: 5px; background: var(--surface); color: var(--text); }
  .ryg-kilde { flex-basis: 100%; margin: 0; }
  .ryg-fjern { position: absolute; top: 0.35rem; right: 0.35rem; }
  .ryg-tilfoej { margin: 0.6rem 0 0; }
  .ryg-noter p { margin: 0.5rem 0 0; font-size: 0.88rem; }
  .ryg-forklaring ul { margin: 0.3rem 0 0.5rem 1.1rem; padding: 0; }
  .ryg-forklaring li { margin: 0 0 0.45rem; }
  .ryg-visning-panel { position: sticky; top: calc(0.75rem + env(safe-area-inset-top, 0px)); }
  .ryg-visninger { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem; }
  .ryg-visninger [aria-pressed="true"] { background: var(--primary); color: var(--primary-contrast); border-color: var(--primary); }
  .ryg-visning { position: relative; height: min(68vh, 620px); min-height: 320px; border-radius: 8px; overflow: hidden; background: radial-gradient(circle at 50% 40%, var(--scene-a) 0%, var(--scene-b) 85%); touch-action: none; }
  .ryg-visning canvas { display: block; cursor: grab; }
  .ryg-indlaeser { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; margin: 0; color: var(--text-muted); text-align: center; padding: 1rem; }
  .ryg-label { position: absolute; left: 0; top: 0; pointer-events: none; font-size: 0.75rem; font-weight: 600; color: var(--label-fg); background: var(--label-bg); border: 1px solid var(--label-border); border-radius: 4px; padding: 0.05rem 0.35rem; white-space: nowrap; }
  .ryg-label-roed { background: #d62828; color: #fff; border-color: #a11d1d; }
  .ryg-label-orange { background: #f08c00; color: #1c1300; border-color: #b86b00; }
  .ryg-kontrol { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; align-items: center; margin-top: 0.6rem; font-size: 0.88rem; }
  .ryg-slider { display: inline-flex; align-items: center; gap: 0.4rem; }
  .ryg-slider input { width: 8rem; accent-color: var(--primary); }
  .ryg-valg { display: flex; flex-wrap: wrap; gap: 0.2rem 0.8rem; }
  .ryg-valg .checkbox { margin: 0; }
  .ryg-forklaring-farver { list-style: none; display: flex; flex-wrap: wrap; gap: 0.2rem 1rem; padding: 0; margin: 0.6rem 0 0; font-size: 0.8rem; color: var(--text-muted); }
  .ryg-prik { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 50%; vertical-align: -0.05rem; margin-right: 0.2rem; }
  .ryg-prik-forandring { background: #e0603a; border-radius: 2px; }
  .ryg-prik-roed { background: #d62828; }
  .ryg-prik-orange { background: #f08c00; }
  .ryg-prik-gul { background: #f0dc8c; border: 1px solid #c9b25a; }
  .ryg-prik-blaa { background: #86a8ee; }
  .btn-outline[data-visning] { padding: 0.3rem 0.65rem; }
  @media (max-width: 880px) { .ryg-visning-panel { position: static; } .ryg-visning { height: 62vh; } }
</style>
"""


def strip_skeleton(live):
    if "<body>" in live[:3000]:
        live = live[live.index("<body>") + len("<body>"):]
    return re.sub(r"\s*</body></html>\s*$", "\n", live)


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    live_path, model_path, out = sys.argv[1:]
    live = strip_skeleton(open(live_path, encoding="utf-8").read())
    head = live[: live.index('<header class="topbar">')].lstrip()
    head = re.sub(r"<title>.*?</title>", "<title>MR-columna i 3D</title>", head, count=1)
    src = open(os.path.join(ROOT, "ryg", "index.html"), encoding="utf-8").read()
    body = src[src.index('<header class="topbar">'): src.index("</footer>") + len("</footer>")]
    body = body.replace('<span class="brand-icon"', '<span class="brand-mark"').replace('<p class="subtitle">', "<p>")
    body = re.sub(r'\s*<button class="btn btn-ghost" type="button" data-install hidden>[^<]*</button>', "", body)
    body = body.replace('href="../oversigt.html"', f'href="{CONF["oversigt.html"]["url"]}" target="_blank" rel="noopener"')
    body = body.replace("Ingen tekst gemmes eller sendes.</p>", "Ingen tekst gemmes eller sendes. I claude.ai-versionen hentes three.js fra jsDelivr; MR-teksten forlader ikke browseren.</p>", 1)
    js = "".join(open(os.path.join(ROOT, "ryg", f), encoding="utf-8").read() for f in ("mr.js", "ryg.js"))
    vis = open(os.path.join(ROOT, "ryg", "visning.js"), encoding="utf-8").read()
    vis = vis.replace('from "./lib/GLTFLoader.js"', 'from "three/addons/loaders/GLTFLoader.js"')
    vis = vis.replace('from "./lib/OrbitControls.js"', 'from "three/addons/controls/OrbitControls.js"')
    vis = re.sub(r'import \{ MeshoptDecoder \} from "\./lib/meshopt_decoder\.module\.js";\n', "", vis)
    vis = vis.replace("  loader.setMeshoptDecoder(MeshoptDecoder);\n", "")
    if "./lib/" in vis or "MeshoptDecoder" in vis.split("async function hentModel")[1].split("async function indlaes")[0].replace("loadAsync", ""):
        sys.exit("Fejl: lokale imports eller meshopt er stadig med")
    data = open(model_path, "rb").read()
    if b"EXT_meshopt_compression" in data:
        sys.exit("Fejl: modellen må ikke være meshopt-komprimeret (kræver WebAssembly)")
    b64 = base64.b64encode(gzip.compress(data, 9)).decode()
    imap = json.dumps({"imports": {"three": THREE + "build/three.module.min.js", "three/addons/": THREE + "examples/jsm/"}})
    html = (head + CSS + "\n" + body
            + "\n\n<script>\n" + js + "</script>\n"
            + f'<script>window.RYG_MODEL_GZ = "{b64}";</script>\n'
            + f'<script type="importmap">{imap}</script>\n'
            + '<script type="module">\n' + vis + "</script>\n")
    for bad in ("pwa.js", 'rel="manifest"', "serviceWorker", "data-install"):
        if bad in html:
            sys.exit(f"Fejl: {bad} er stadig med")
    open(out, "w", encoding="utf-8").write(html)
    print(f"ryg/index.html -> {out} ({len(html) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
