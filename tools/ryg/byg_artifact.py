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
          --scene-a: #fbfcfd; --scene-b: #dfe6ec; --label-bg: rgba(255,255,255,0.88); --label-fg: #1f2933; --label-border: rgba(31,41,51,0.18);
          --s1: #2a78d6; --s2: #eb6834; --s3: #1baf7a; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --primary: #8cc4e0; --primary-dark: #6aaed0; --primary-contrast: #06141c;
          --scene-a: #2a3438; --scene-b: #141b1e; --label-bg: rgba(20,27,30,0.86); --label-fg: #e7ece9; --label-border: rgba(231,236,233,0.22);
          --s1: #3987e5; --s2: #d95926; --s3: #199e70; } }
  :root[data-theme="dark"] { --primary: #8cc4e0; --primary-dark: #6aaed0; --primary-contrast: #06141c;
          --scene-a: #2a3438; --scene-b: #141b1e; --label-bg: rgba(20,27,30,0.86); --label-fg: #e7ece9; --label-border: rgba(231,236,233,0.22);
          --s1: #3987e5; --s2: #d95926; --s3: #199e70; }
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
  .ryg-visning-panel { position: sticky; top: calc(0.75rem + env(safe-area-inset-top, 0px)); max-height: calc(100vh - 1.5rem); overflow-y: auto; }
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
  @media (max-width: 880px) { .ryg-visning-panel { position: static; max-height: none; } .ryg-visning { height: 62vh; } }
.ryg-hel-detaljer { max-width: 1160px; margin: 0 auto 1.2rem; padding-inline: 1.1rem; display: flex; flex-direction: column; gap: 0.8rem; }
.ryg-hel-detaljer h2 { margin: 0; font-size: 1.05rem; color: var(--primary-dark); }
.ryg-hel-detaljer > .field-hint { margin: 0; }
.ryg-hel { margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.9rem; display: flex; flex-direction: column; gap: 0.7rem; }
.ryg-hel h3 { margin: 0; font-size: 1rem; color: var(--primary-dark); }
.ryg-hel-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; }
.ryg-hel-knapper { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.ryg-hel-tid input { width: min(22rem, 60vw); }
.ryg-hel-tid output { font-weight: 600; font-variant-numeric: tabular-nums; min-width: 12rem; }
.ryg-faser { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.35rem; }
.ryg-faser button { width: 100%; text-align: left; font: inherit; font-size: 0.82rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); padding: 0.4rem 0.55rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.1rem; }
.ryg-faser button span { color: var(--text-muted); font-size: 0.78rem; }
.ryg-faser li.aktiv button { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.ryg-fasetekst { margin: 0; font-size: 0.9rem; }
.ryg-mekanismer { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0.5rem; }
.ryg-mek { border: 1px solid var(--border); border-radius: 6px; padding: 0.45rem 0.6rem; background: var(--surface); color: var(--text); font-size: 0.82rem; transition: border-color 0.3s, box-shadow 0.3s; }
.ryg-mek p { margin: 0.3rem 0 0; color: var(--text-muted); }
.ryg-mek-top { display: flex; justify-content: space-between; gap: 0.5rem; align-items: baseline; }
.ryg-mek-tal { font-variant-numeric: tabular-nums; color: var(--text-muted); font-weight: 600; }
.ryg-mek-aktiv { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.ryg-maaler { --v: 0; height: 6px; border-radius: 3px; background: var(--surface-2); margin-top: 0.3rem; position: relative; overflow: hidden; }
.ryg-maaler::after { content: ""; position: absolute; inset: 0 auto 0 0; width: calc(var(--v) * 100%); background: var(--HBAR, var(--primary)); border-radius: 3px; }
.ryg-mek-inflam .ryg-maaler { --HBAR: var(--s2); }
.ryg-mek-makro .ryg-maaler { --HBAR: #9a6fd8; }
.ryg-mek-status .ryg-maaler[data-maal="storrelse"] { --HBAR: var(--s1); }
.ryg-mek-status .ryg-maaler[data-maal="smerte"] { --HBAR: var(--s3); margin-bottom: 0.35rem; }
.ryg-mek-status .ryg-mek-top + .ryg-maaler + .ryg-mek-top { margin-top: 0.2rem; }
.ryg-graf { margin: 0; }
.ryg-graf figcaption { font-weight: 600; font-size: 0.88rem; }
.ryg-g-legende { list-style: none; display: flex; flex-wrap: wrap; gap: 0.2rem 1rem; padding: 0; margin: 0.3rem 0; font-size: 0.8rem; color: var(--text-muted); }
.ryg-g-nogle { display: inline-block; width: 1.2rem; height: 0; border-top: 2px solid var(--s1); vertical-align: middle; margin-right: 0.35rem; }
.ryg-g-nogle.s2 { border-top-color: var(--s2); }
.ryg-g-nogle.s3 { border-top-color: var(--s3); }
.ryg-g-nogle.stiplet { border-top-style: dashed; }
.ryg-g { position: relative; overflow-x: auto; }
.ryg-g svg { display: block; width: 100%; max-width: 760px; min-width: 22rem; height: auto; }
.ryg-g-fase { fill: var(--primary); opacity: 0.05; }
.ryg-g-fase.f2 { opacity: 0.1; }
.ryg-g-fasenavn, .ryg-g-akse { fill: var(--text-muted); font-size: 11px; font-family: inherit; }
.ryg-g-etiket { fill: var(--text); font-size: 11px; font-family: inherit; }
.ryg-g-grid { stroke: var(--border); stroke-width: 1; }
.ryg-g-base { stroke: var(--text-muted); stroke-width: 1; }
.ryg-g-linje { fill: none; stroke: var(--s1); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.ryg-g-linje.s2 { stroke: var(--s2); }
.ryg-g-linje.s3 { stroke: var(--s3); }
.ryg-g-linje.stiplet { stroke-dasharray: 5 4; }
.ryg-g-markoer { stroke: var(--text); stroke-width: 1.5; opacity: 0.6; }
.ryg-g-pkt { fill: var(--s1); stroke: var(--surface); stroke-width: 2; }
.ryg-g-pkt.s2 { fill: var(--s2); }
.ryg-g-pkt.s3 { fill: var(--s3); }
.ryg-g-hit { fill: transparent; cursor: crosshair; }
.ryg-g-tip { position: absolute; top: 0.2rem; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.1rem; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.12); min-width: 11rem; }
.ryg-evidens { font-size: 0.84rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.4rem; }
.ryg-evidens p { margin: 0; }
.ryg-advarsel-boks { color: var(--red-text) !important; background: var(--red-bg); border: 1px solid var(--red-border); border-radius: 6px; padding: 0.4rem 0.6rem; }
.ryg-ledere { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.ryg-ledere line { stroke: var(--label-fg); stroke-width: 1.2; opacity: 0.75; }
.ryg-ledere circle { fill: var(--label-fg); stroke: var(--label-bg); stroke-width: 1; }
.ryg-ledere .l-r { stroke: #d62828; }
.ryg-ledere circle.l-r { fill: #d62828; }
.ryg-ledere .l-o { stroke: #d17a00; }
.ryg-ledere circle.l-o { fill: #f08c00; }
.ryg-ledere .l-h { stroke: #6f3fc2; }
.ryg-ledere circle.l-h { fill: #6f3fc2; }
.ryg-label { z-index: 1; }
.ryg-label, .ryg-ledere { transition: opacity 0.2s; }
.ryg-roterer .ryg-label, .ryg-roterer .ryg-ledere { opacity: 0; transition: none; }
.ryg-label-heling { background: #6f3fc2; color: #fff; border-color: #4b2a85; }
@media (prefers-reduced-motion: reduce) { .ryg-mek, .ryg-label, .ryg-ledere { transition: none; } }
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
    js = "".join(open(os.path.join(ROOT, "ryg", f), encoding="utf-8").read() for f in ("mr.js", "ryg.js", "heling.js"))
    vis = open(os.path.join(ROOT, "ryg", "visning.js"), encoding="utf-8").read()
    vis = vis.replace('from "./lib/GLTFLoader.js"', 'from "three/addons/loaders/GLTFLoader.js"')
    vis = vis.replace('from "./lib/OrbitControls.js"', 'from "three/addons/controls/OrbitControls.js"')
    vis = vis.replace('from "./lib/RoomEnvironment.js"', 'from "three/addons/environments/RoomEnvironment.js"')
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
