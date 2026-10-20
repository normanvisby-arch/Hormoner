// 3D-visning af lændesøjlen L3–S1 med three.js. Modellen (model/l3-s1.glb) har patologien som
// morph targets (shape keys fra Blender, se tools/ryg/); ryg.js bestemmer styrkerne ud fra fundene.
import * as THREE from "three";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { OrbitControls } from "./lib/OrbitControls.js";
import { MeshoptDecoder } from "./lib/meshopt_decoder.module.js";
import { RoomEnvironment } from "./lib/RoomEnvironment.js";

const boks = document.getElementById("visning");
// Kameraets mål pr. niveau: lige foran spinalkanalen ved disken (glTF: +Y op, +Z fortil, +X venstre).
const MAAL_NIV = { "L3/L4": new THREE.Vector3(0, 1.031, 0.034), "L4/L5": new THREE.Vector3(0, 0.999, 0.03), "L5/S1": new THREE.Vector3(0, 0.964, 0.019) };
// Aksialt snit: højden (y) går fra 0,94 til 1,055; standard ved diskens bageste del på niveauet.
const AKSIAL_NIV = { "L3/L4": 1.030, "L4/L5": 0.997, "L5/S1": 0.965 };
const aksialTilSnit = (y) => (y - 0.94) / 0.115;
// Durasækkens midte pr. niveau [højde y, dybde z] og kanalens hældning (lændelordosen) til
// visningen "Buer fjernet", hvor alt bag snittet gennem kanalen skæres væk.
const KANAL_NIV = { "L3/L4": [1.031, 0.027, 0.22], "L4/L5": [0.999, 0.020, 0.26], "L5/S1": [0.964, 0.0096, 0.30] };
let MAAL = MAAL_NIV["L4/L5"];
const FARVER = {
  knogle: 0xe9dfc9, diskus: 0x93b4d6, nucleus: 0x4f86cf, prolaps: 0x5d93dc, ligament: 0xe0c062, dura: 0x86a8ee, nerve: 0xf0dc8c,
  rodRoed: 0xd62828, rodOrange: 0xf08c00,
};
// Snitflader (bagsiden af lukkede flader): spongiøs knogle, diskusvæv osv.
const KAPPE = { knogle: 0xd8c2a0, diskus: 0xa7c3e2, nucleus: 0x6f9ee0, prolaps: 0x6f9ee0, ligament: 0xd9b95a, nerve: 0xe8cf6e };
const VISNINGER = {
  "3d": { retning: [0.78, 0.38, -1], afstand: 0.27 },
  bag: { retning: [0, 0.08, -1], afstand: 0.25 },
  // Bagfra med hvirvelbuer, ledbånd og sækkens bageste del skåret væk: prolapsen ses presse på
  // durasækken og roden. Kameraet står skråt fra den side, fundet sidder.
  koronal: { retning: [0.45, 0.2, -1], afstand: 0.16, snit: "koronal" },
  venstre: { retning: [1, 0.06, -0.05], afstand: 0.25 },
  hoejre: { retning: [-1, 0.06, -0.05], afstand: 0.25 },
  // Snit vises som MR-billeder: aksialt set nedefra (patientens højre i billedets venstre side,
  // fortil opad), sagittalt set fra siden med fortil til venstre.
  aksial: { retning: [0, -1, 0.0001], afstand: 0.17, snit: "aksial", op: [0, 0, 1] },
  sagittal: { retning: [1, 0.05, 0], afstand: 0.2, snit: "sagittal" },
};

const tilstand = { keys: {}, roder: {}, styrke: 1, visning: "3d", snitSide: 1, niveau: "L4/L5", snit: { aksial: aksialTilSnit(AKSIAL_NIV["L4/L5"]), sagittal: 0.5, koronal: 0.5 }, klar: false };
let renderer, scene, camera, controls, model, miljoe = null;
const meshes = [];              // { mesh, gruppe, kappe }
const etiketter = [];
let animStart = 0, animFra = 0;

function lav() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
  } catch (e) {
    boks.innerHTML = '<p class="ryg-indlaeser">3D-visning kræver WebGL, som ikke er tilgængeligt i denne browser.</p>';
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  boks.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.005, 5);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(MAAL);
  // Uden dæmpning står modellen stille, så snart brugeren slipper — så kan teksterne vises med det samme.
  controls.enableDamping = false;
  controls.addEventListener("start", () => { kamSidst.styrer = true; });
  controls.addEventListener("end", () => { kamSidst.styrer = false; kamSidst.t = performance.now(); });
  controls.minDistance = 0.06;
  controls.maxDistance = 0.6;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa4a9b2, 1.1));
  const lys1 = new THREE.DirectionalLight(0xffffff, 1.6); lys1.position.set(0.4, 1.4, -0.9);
  const lys2 = new THREE.DirectionalLight(0xfff4e8, 0.9); lys2.position.set(-0.8, 0.6, 1.0);
  const lys3 = new THREE.DirectionalLight(0xe8f0ff, 1.1); lys3.position.set(0.2, -1, 0.3);
  scene.add(lys1, lys2, lys3);
  // Et blødt "rum" som refleksion giver kernen og prolapsen et vådt, geléagtigt skær (kun dem).
  try { miljoe = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; } catch (e) { miljoe = null; }
  new ResizeObserver(tilpas).observe(boks);
  tilpas();
  return true;
}

function tilpas() {
  const w = boks.clientWidth || 600, h = boks.clientHeight || 500;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function gruppe(navn) {
  if (/^(L\d|Sacrum)/.test(navn)) return "knogle";
  if (/^Disc/.test(navn)) return "diskus";
  if (/^Nucleus/.test(navn)) return "nucleus";
  if (/^Prolaps_/.test(navn)) return "prolaps";
  if (/^Durasaek/.test(navn)) return "dura";
  if (/^(Rod_|Cauda|Filum)/.test(navn)) return "nerve";
  return "ligament";
}

// Væv, der er flyttet af en shape key (prolaps, fortykket ledbånd, osteofytter), farves varmt,
// så forandringen ses tydeligt; farven følger skyderen "Normal ↔ Med fund".
const FORANDRING = new THREE.Color(0xe0603a);
// Helingsforløbet (heling.js): fælles uniforms for diskens materialer — inflammation (pulserende
// rød), udtørring (grålig) og arvæv (lys) farver den udskudte del af disken.
const HEL = { aktiv: false, s: {}, uni: { uInflam: { value: 0 }, uTor: { value: 0 }, uAr: { value: 0 }, uTid: { value: 0 } } };
const NUL_UNI = { uInflam: { value: 0 }, uTor: { value: 0 }, uAr: { value: 0 }, uTid: { value: 0 } };
const erProlaps = (k) => /_(protrusion|ekstrusion)_/.test(k);
// Fælles GLSL: værdistøj og cellestøj (Worley) til de procedurale teksturer.
const STOEJ_GLSL = `
  float hS(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  vec3 hS3(vec3 p) { return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
  float stoej(vec3 p) {
    vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hS(i), hS(i + vec3(1, 0, 0)), f.x), mix(hS(i + vec3(0, 1, 0)), hS(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hS(i + vec3(0, 0, 1)), hS(i + vec3(1, 0, 1)), f.x), mix(hS(i + vec3(0, 1, 1)), hS(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  vec2 worley(vec3 p) {
    vec3 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z)); vec3 r = g + hS3(i + g) - f; float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return sqrt(vec2(d1, d2));
  }`;
const lin = (hex) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

// Snitflader: kappen er bagsiden af den lukkede flade, så fragmentet ligger på bagvæggen. Punktet
// på selve snitfladen (sP) findes ved at forlænge synslinjen fra kameraet til snitplanet, og
// teksturen beregnes dér. Afstanden fra snitfladen til bagvæggen (sL) er lille nær snittets kant
// og bruges til knoglens kortikale skal.
const SNIT = { uPlan: { value: new THREE.Vector4(0, 1, 0, 0) } };
const HEL_GLSL = `
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.16, 0.12), uInflam * (0.6 + 0.25 * sin(uTid * 4.0)));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.71, 0.55), uTor * 0.85);`;
const SNIT_GLSL = {
  // Spongiøs knogle: tynde, overvejende lodrette knoglebjælker om marvrum, og en tæt
  // kortikal skal langs kanten.
  knogle: `
    vec2 w = worley(sP * vec3(1250.0, 760.0, 1250.0));
    float trab = 1.0 - smoothstep(0.06, 0.26, w.y - w.x);
    // Marvrummene er dæmpet sandfarvede (ikke røde), så snittet ikke tager opmærksomheden fra
    // prolapsen og den klemte rod.
    vec3 marv = mix(${lin(0xd6c19d)}, ${lin(0xcab190)}, stoej(sP * 900.0));
    vec3 c = mix(marv, ${lin(0xeee5d2)}, trab * 0.85);
    c *= 0.96 + 0.06 * stoej(sP * 3000.0);
    diffuseColor.rgb = mix(c, ${lin(0xf3ebd8)}, 1.0 - smoothstep(0.0007, 0.0016, sL));`,
  // Annulus fibrosus: koncentriske lameller, der følger diskens omrids (afstandsfelt i uDiskTex,
  // 0 i yderkanten og 1 ved kernen), med fine fibre og en blødere overgangszone mod kernen.
  diskus: `
    float t = texture2D(uDiskTex, vec2(dot(sP - uDiskO, uDiskU), dot(sP - uDiskO, uDiskV))).r;
    float lam = 0.5 + 0.5 * cos((t + 0.02 * (stoej(sP * 400.0) - 0.5)) * 6.2832 * 10.0);
    vec3 c = mix(${lin(0xc6d9ee)}, ${lin(0x8eafd8)}, smoothstep(0.3, 0.7, lam) * (1.0 - smoothstep(0.72, 0.95, t)));
    c = mix(c, ${lin(0x86a9da)}, smoothstep(0.78, 1.0, t));
    c *= 0.93 + 0.1 * stoej(sP * vec3(2600.0, 650.0, 2600.0));
    diffuseColor.rgb = c;`,
  // Nucleus pulposus: geléagtig, let marmoreret med lyse fibrøse strenge.
  nucleus: `
    float g = stoej(sP * 1400.0) * 0.6 + stoej(sP * 3800.0) * 0.4;
    vec3 c = ${lin(0x5b8fd9)} * (0.88 + 0.2 * g);
    c = mix(c, ${lin(0xc9dcf7)}, smoothstep(0.64, 0.76, stoej(sP * vec3(700.0, 2200.0, 700.0))) * 0.18);
    diffuseColor.rgb = c;`,
};

// Fælles shadertilpasning: forandringsfarve (væv flyttet af en shape key), helingsfarver,
// AO (vertexfarve bagt i Blender) og tekstur på snitflader.
function tilpasShader(m, { forandring = false, heling = false, ao = false, snit = null, disk = null } = {}) {
  const u = heling ? HEL.uni : NUL_UNI;
  if (ao) m.vertexColors = true;
  // three.js genbruger et kompileret program ud fra onBeforeCompile's kildetekst, som er ens for
  // alle varianter — nøglen skelner dem.
  m.customProgramCacheKey = () => JSON.stringify([forandring, heling, ao, snit, !!disk]);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uForandring = { value: FORANDRING };
    Object.assign(sh.uniforms, u, SNIT);
    if (disk) Object.assign(sh.uniforms, { uDiskTex: { value: disk.tex }, uDiskO: { value: disk.o }, uDiskU: { value: disk.u }, uDiskV: { value: disk.v } });
    let vert = "", frag = ao ? "#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)\n diffuseColor.rgb *= mix(vec3(1.0), vColor.rgb, 0.6);\n#endif\n" : "#include <color_fragment>\n";
    if (forandring) vert += "vForskyd = length(transformed - position);\n";
    if (snit) {
      vert += "vVerden = (modelMatrix * vec4(transformed, 1.0)).xyz;\n";
      frag += `{
        vec3 sD = normalize(vVerden - cameraPosition); float sN = dot(uPlan.xyz, sD);
        vec3 sP = abs(sN) > 1e-4 ? cameraPosition + sD * (-(dot(uPlan.xyz, cameraPosition) + uPlan.w) / sN) : vVerden;
        float sL = distance(vVerden, sP);
        ${SNIT_GLSL[snit === "prolaps" ? "nucleus" : snit]}
        ${snit === "prolaps" ? HEL_GLSL : ""}
      }\n`;
    }
    if (forandring) frag += `
        vec3 fF = mix(uForandring, vec3(0.86, 0.10, 0.08), uInflam * (0.7 + 0.3 * sin(uTid * 4.0)));
        fF = mix(fF, vec3(0.70, 0.68, 0.60), uTor * 0.75);
        fF = mix(fF, vec3(0.95, 0.93, 0.86), uAr);
        diffuseColor.rgb = mix(diffuseColor.rgb, fF, smoothstep(0.0004, 0.002, vForskyd) * 0.85);`;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vForskyd;\nvarying vec3 vVerden;")
      .replace("#include <morphtarget_vertex>", "#include <morphtarget_vertex>\n" + vert);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying float vForskyd;\nvarying vec3 vVerden;\nuniform vec3 uForandring;\nuniform float uInflam, uTor, uAr, uTid;\nuniform vec4 uPlan;\n${disk ? "uniform sampler2D uDiskTex; uniform vec3 uDiskO, uDiskU, uDiskV;" : ""}\n${snit ? STOEJ_GLSL : ""}`)
      .replace("#include <color_fragment>", frag);
  };
}
// Kernen (nucleus) holder sin farve, så den kan følges ud i en ekstrusion i snittene.
const MED_FORANDRING = ["knogle", "diskus", "ligament"];

// Prolapsmassen (Prolaps_L4L5 osv.) er kernevæv, der er presset ud gennem sprækken i annulus:
// blank og geléagtig. Under helingen bliver den rødlig (inflammation) og siden gullig, mat og
// rynket (udtørring), mens den skrumper.
function prolapsMateriale() {
  const m = new THREE.MeshPhysicalMaterial({
    color: FARVER.prolaps, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1,
    sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xd4e6ff), envMap: miljoe, envMapIntensity: 0.55,
  });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, HEL.uni);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vHvile;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHvile = position * 900.0;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vHvile;
        uniform float uInflam, uTor, uAr, uTid;
        ${STOEJ_GLSL}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        // Fibrøse striber i kernevævet (ses mest, når det er udtørret) og en lys, gennemskinnelig kerne.
        float st = stoej(vHvile * vec3(1.0, 3.0, 1.0)) * 0.6 + stoej(vHvile * 3.1) * 0.4;
        diffuseColor.rgb *= 0.9 + 0.2 * st;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.16, 0.12), uInflam * (0.6 + 0.25 * sin(uTid * 4.0)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.71, 0.55) * (0.8 + 0.35 * st), uTor * 0.85);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        // Kanten gløder svagt rødt, mens betændelsen er aktiv; ellers et lyst, vådt randskær.
        float rand = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.5);
        totalEmissiveRadiance += rand * (vec3(0.10, 0.16, 0.24) * (1.0 - uTor) * (1.0 - uInflam) + vec3(0.55, 0.06, 0.03) * uInflam * (0.7 + 0.3 * sin(uTid * 4.0)));`);
  };
  return m;
}

function materiale(g) {
  if (g === "prolaps") return prolapsMateriale();
  if (g === "nucleus") return new THREE.MeshPhysicalMaterial({ color: FARVER.nucleus, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15, envMap: miljoe, envMapIntensity: 0.4 });
  const m = new THREE.MeshStandardMaterial({ color: FARVER[g], roughness: g === "knogle" ? 0.72 : 0.55, metalness: 0 });
  if (MED_FORANDRING.includes(g)) tilpasShader(m, { forandring: true, heling: g === "diskus", ao: g === "knogle" });
  if (g === "dura") { m.transparent = true; m.opacity = 0.38; m.depthWrite = false; }
  if (g === "nerve") { m.emissive = new THREE.Color(0x000000); }
  return m;
}

// Afstandsfelt til annulus' lameller: disken og dens kerne projiceres ned i diskens eget plan
// (normalen er den korteste hovedakse), rastreres til 128 × 128 felter, og for hvert felt i disken
// gemmes t = afstand til yderkanten / (afstand til yderkanten + afstand til kernen).
function diskFelt(disk, alle) {
  const N = 128;
  const kerne = alle.find((o) => o.name === disk.name.replace("Disc_", "Nucleus_"));
  const punkter = (o) => {
    o.updateMatrixWorld(true);
    const pos = o.geometry.attributes.position, v = new THREE.Vector3(), ud = [];
    for (let i = 0; i < pos.count; i++) ud.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone());
    return ud;
  };
  const P = punkter(disk);
  const c = P.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / P.length);
  const C = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of P) { const d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] += d[i] * d[j]; }
  // Mindste egenvektor = største egenvektor af (spor · I − C), fundet med potensmetoden.
  const tr = C[0] + C[4] + C[8];
  let n = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < 60; k++) {
    n = new THREE.Vector3(tr * n.x - (C[0] * n.x + C[1] * n.y + C[2] * n.z), tr * n.y - (C[3] * n.x + C[4] * n.y + C[5] * n.z), tr * n.z - (C[6] * n.x + C[7] * n.y + C[8] * n.z)).normalize();
  }
  const ua = new THREE.Vector3(1, 0, 0).addScaledVector(n, -n.x).normalize(), va = new THREE.Vector3().crossVectors(n, ua);
  let min = [1e9, 1e9], max = [-1e9, -1e9];
  for (const p of P) { const a = p.clone().sub(c); const x = a.dot(ua), y = a.dot(va); min = [Math.min(min[0], x), Math.min(min[1], y)]; max = [Math.max(max[0], x), Math.max(max[1], y)]; }
  const str = Math.max(max[0] - min[0], max[1] - min[1]) + 0.004;
  const o = c.clone().addScaledVector(ua, min[0] - 0.002).addScaledVector(va, min[1] - 0.002);
  const tilPx = (p) => { const a = p.clone().sub(o); return [(a.dot(ua) / str) * N, (a.dot(va) / str) * N]; };
  const maske = (obj, pts) => {
    const m = new Uint8Array(N * N); if (!obj) return m;
    const idx = obj.geometry.index, px = pts.map(tilPx);
    const tri = idx ? (i) => idx.getX(i) : (i) => i, nT = (idx ? idx.count : px.length) / 3;
    for (let t = 0; t < nT; t++) {
      const [a, b, d] = [px[tri(3 * t)], px[tri(3 * t + 1)], px[tri(3 * t + 2)]];
      const area = (b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1]);
      if (Math.abs(area) < 1e-9) continue;
      for (let y = Math.max(0, Math.floor(Math.min(a[1], b[1], d[1]))); y <= Math.min(N - 1, Math.ceil(Math.max(a[1], b[1], d[1]))); y++)
        for (let x = Math.max(0, Math.floor(Math.min(a[0], b[0], d[0]))); x <= Math.min(N - 1, Math.ceil(Math.max(a[0], b[0], d[0]))); x++) {
          const qx = x + 0.5, qy = y + 0.5;
          const w1 = ((b[0] - qx) * (d[1] - qy) - (d[0] - qx) * (b[1] - qy)) / area, w2 = ((d[0] - qx) * (a[1] - qy) - (a[0] - qx) * (d[1] - qy)) / area;
          if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) m[y * N + x] = 1;
        }
    }
    return m;
  };
  const mD = maske(disk, P), mK = maske(kerne, kerne ? punkter(kerne) : []);
  // Chamfer-afstand (3-4) i to gennemløb: afstand til nærmeste felt, hvor kilde(i) er sand.
  const afstand = (kilde) => {
    const d = new Float32Array(N * N).map((_, i) => (kilde(i) ? 0 : 1e9));
    const s = (i, j, w) => { if (d[j] + w < d[i]) d[i] = d[j] + w; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (x) s(i, i - 1, 3); if (y) { s(i, i - N, 3); if (x) s(i, i - N - 1, 4); if (x < N - 1) s(i, i - N + 1, 4); } }
    for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (x < N - 1) s(i, i + 1, 3); if (y < N - 1) { s(i, i + N, 3); if (x < N - 1) s(i, i + N + 1, 4); if (x) s(i, i + N - 1, 4); } }
    return d;
  };
  const dUd = afstand((i) => !mD[i]), dK = afstand((i) => mK[i]);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const t = mK[i] ? 1 : mD[i] ? dUd[i] / (dUd[i] + dK[i] + 1e-6) : 0;
    data.set([Math.round(t * 255), mD[i] * 255, 0, 255], i * 4);
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return { tex, o, u: ua.clone().multiplyScalar(1 / str), v: va.clone().multiplyScalar(1 / str) };
}

// Appen henter model/l3-s1.glb (meshopt-komprimeret). claude.ai-versionen har modellen indlejret
// som gzip/base64 i window.RYG_MODEL_GZ (uden meshopt, som kræver WebAssembly).
async function hentModel(loader) {
  if (window.RYG_MODEL_GZ) {
    const bin = Uint8Array.from(atob(window.RYG_MODEL_GZ), (c) => c.charCodeAt(0));
    const buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    return loader.parseAsync(buf, "");
  }
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader.loadAsync("model/l3-s1.glb");
}

async function indlaes() {
  const gltf = await hentModel(new GLTFLoader());
  model = gltf.scene;
  const alle = [];
  model.traverse((o) => { if (o.isMesh) alle.push(o); });
  alle.forEach((o) => {
    const navn = o.name;
    const g = gruppe(navn);
    o.material = materiale(g);
    o.renderOrder = g === "dura" ? 2 : 0;
    // "Kappe": bagsiden tegnes ensfarvet, så snitflader ser fyldte ud.
    const km = new THREE.MeshBasicMaterial({ color: KAPPE[g] ?? FARVER[g], side: THREE.BackSide, toneMapped: false });
    const snit = SNIT_GLSL[g] || g === "prolaps" ? g : null;
    if (MED_FORANDRING.includes(g) || snit) tilpasShader(km, { forandring: MED_FORANDRING.includes(g), heling: g === "diskus" || g === "prolaps", snit, disk: g === "diskus" ? diskFelt(o, alle) : null });
    const kappe = new THREE.Mesh(o.geometry, km);
    kappe.morphTargetInfluences = o.morphTargetInfluences;
    kappe.morphTargetDictionary = o.morphTargetDictionary;
    kappe.visible = false;
    o.add(kappe);
    meshes.push({ mesh: o, navn, gruppe: g, kappe });
  });
  scene.add(model);
  lavEtiketter();
  document.getElementById("indlaeser")?.remove();
  tilstand.klar = true;
  saetVisning(tilstand.visning, true);
  anvend(true);
  window.dispatchEvent(new Event("ryg-model-klar"));
}

function lavEtiketter() {
  // [tekst, punkt, rod (fremhæves), skjul i aksialt snit, niveau (vises kun, når det er i fokus)]
  const def = [
    ["L3", [0.0, 1.05, 0.055], null, true], ["L4", [0.0, 1.019, 0.052], null, true], ["L5", [0.0, 0.979, 0.047], null, true],
    ["Korsben", [0.0, 0.945, 0.03], null, true],
    ["Disk L3/L4", [-0.022, 1.032, 0.055], null, false, "L3/L4"], ["Disk L4/L5", [-0.022, 0.999, 0.05], null, false, "L4/L5"], ["Disk L5/S1", [-0.022, 0.963, 0.04], null, false, "L5/S1"],
    ["Durasæk", [0, 1.045, 0.025]],
    ["L3-rod", [0.027, 1.031, 0.033], "Rod_L3_v"], ["L3-rod", [-0.027, 1.031, 0.033], "Rod_L3_h"],
    ["L4-rod", [0.03, 1.002, 0.033], "Rod_L4_v"], ["L4-rod", [-0.03, 1.002, 0.033], "Rod_L4_h"],
    ["L5-rod", [0.028, 0.973, 0.025], "Rod_L5_v"], ["L5-rod", [-0.028, 0.973, 0.025], "Rod_L5_h"],
    ["S1-rod", [0.0195, 0.941, 0.0035], "Rod_S1_v"], ["S1-rod", [-0.0195, 0.941, 0.0035], "Rod_S1_h"],
    ["Facetled", [0.018, 1.030, 0.018], null, false, "L3/L4"], ["Facetled", [-0.018, 1.030, 0.018], null, false, "L3/L4"],
    ["Facetled", [0.0226, 1.0018, 0.0159], null, false, "L4/L5"], ["Facetled", [-0.0226, 1.0018, 0.0159], null, false, "L4/L5"],
    ["Facetled", [0.0227, 0.9759, 0.0112], null, false, "L5/S1"], ["Facetled", [-0.0227, 0.9759, 0.0112], null, false, "L5/S1"],
  ];
  const dyn = [
    ["Inflammation", helingsEtiket("inflam", 0.4, [0.004, 0.006])],
    ["Makrofager", helingsEtiket("makro", 0.3, [0.011, -0.004])],
    ["Tilbagetrækning", helingsEtiket("retr", 0.3, [0.013, 0.004])],
    ["Arvæv lukker sprækken", helingsEtiket("ar", 0.3, [0.003, -0.006])],
  ];
  for (const [tekst, f] of dyn) {
    const el = document.createElement("span");
    el.className = "ryg-label ryg-label-heling";
    el.textContent = tekst;
    boks.appendChild(el);
    etiketter.push({ el, p: new THREE.Vector3(), dyn: f });
  }
  for (const [tekst, p, rod, ikkeISnit, niv] of def) {
    const el = document.createElement("span");
    el.className = "ryg-label";
    el.textContent = tekst;
    boks.appendChild(el);
    etiketter.push({ el, p: new THREE.Vector3(...p), rod, ikkeISnit, niv });
  }
}

// Etiketter står som billedtekster i venstre og højre kant af 3D-feltet med en tynd streg ind til
// strukturen, så de ikke dækker modellen. De stables uden overlap i den side, punktet ligger nærmest.
let ledere = null;
// Mens kameraet bevæger sig (drejning, zoom, skift af visning), skjules teksterne; de kommer
// igen, når modellen har stået stille et øjeblik.
const kamSidst = { p: new THREE.Vector3(), q: new THREE.Quaternion(), t: 0, styrer: false };
function kameraBevaeger(nu) {
  if (camera.position.distanceToSquared(kamSidst.p) > 1e-12 || 1 - Math.abs(camera.quaternion.dot(kamSidst.q)) > 1e-10) kamSidst.t = nu;
  kamSidst.p.copy(camera.position); kamSidst.q.copy(camera.quaternion);
  return kamSidst.styrer || !!flyt.til || nu - kamSidst.t < 250;
}
function opdaterEtiketter() {
  const roterer = kameraBevaeger(performance.now());
  boks.classList.toggle("ryg-roterer", roterer);
  if (roterer) return;
  const vis = document.getElementById("visNavne")?.checked !== false;
  const w = boks.clientWidth, h = boks.clientHeight;
  const v = new THREE.Vector3();
  const kamRet = new THREE.Vector3(); camera.getWorldDirection(kamRet);
  const synlige = [];
  for (const e of etiketter) {
    let p = null, kl = "n";
    if (e.dyn) {
      // Helingsetiketter vises altid under forløbet (også når "Navne" er slået fra).
      p = e.dyn(); kl = "h";
    } else {
      const fremhaevet = e.rod && tilstand.roder[e.rod];
      v.copy(e.p).project(camera);
      const tilKamera = e.p.clone().sub(camera.position).normalize();
      const synlig = vis && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && (!e.rod || fremhaevet) && (!e.niv || e.niv === tilstand.niveau) && !bortskaaret(e.p) && tilKamera.dot(kamRet) > 0 && !(e.ikkeISnit && VISNINGER[tilstand.visning].snit === "aksial");
      if (synlig) p = e.p;
      e.el.classList.toggle("ryg-label-roed", !!fremhaevet && !fremhaevet.afledt);
      e.el.classList.toggle("ryg-label-orange", !!fremhaevet && fremhaevet.afledt);
      if (fremhaevet) kl = fremhaevet.afledt ? "o" : "r";
    }
    e.el.hidden = !p;
    if (!p) continue;
    v.copy(p).project(camera);
    synlige.push({ e, kl, ax: ((v.x + 1) / 2) * w, ay: ((1 - v.y) / 2) * h });
  }
  for (const s of synlige) { s.bw = s.e.el.offsetWidth; s.bh = s.e.el.offsetHeight; }
  const M = 8, GAP = 4;
  // Siden følger punktets placering, men skifter først, når punktet er et stykke over midten
  // (ellers springer fx "Korsben", der ligger midt i billedet, frem og tilbage).
  for (const s of synlige) {
    const z = Math.min(40, w * 0.08);
    if (s.e.venstre === undefined || (s.e.venstre && s.ax > w / 2 + z) || (!s.e.venstre && s.ax < w / 2 - z)) s.e.venstre = s.ax < w / 2;
  }
  for (const venstre of [true, false]) {
    const grp = synlige.filter((s) => s.e.venstre === venstre).sort((a, b) => a.ay - b.ay);
    let y = M;
    for (const s of grp) { s.y = Math.max(s.ay - s.bh / 2, y); y = s.y + s.bh + GAP; }
    // Løber stakken ud i bunden, skubbes den op igen.
    let grense = h - M;
    for (let i = grp.length - 1; i >= 0; i--) { const s = grp[i]; s.y = Math.max(M, Math.min(s.y, grense - s.bh)); grense = s.y - GAP; }
    for (const s of grp) { s.x = venstre ? M : w - M - s.bw; s.venstre = venstre; }
  }
  let svg = "";
  for (const s of synlige) {
    s.e.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    const lx = s.venstre ? s.x + s.bw : s.x, ly = s.y + s.bh / 2;
    svg += `<line class="l-${s.kl}" x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${s.ax.toFixed(1)}" y2="${s.ay.toFixed(1)}"></line><circle class="l-${s.kl}" cx="${s.ax.toFixed(1)}" cy="${s.ay.toFixed(1)}" r="2.5"></circle>`;
  }
  if (!ledere) {
    ledere = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ledere.setAttribute("class", "ryg-ledere");
    ledere.setAttribute("aria-hidden", "true");
    boks.appendChild(ledere);
  }
  ledere.innerHTML = svg;
}

function snitPlan() {
  const v = VISNINGER[tilstand.visning];
  if (!v.snit) return null;
  if (v.snit === "aksial") {
    const y = 0.94 + tilstand.snit.aksial * 0.115;              // delen over snittet vises
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
  }
  if (v.snit === "koronal") {
    const [y0, z0, k] = KANAL_NIV[tilstand.niveau];
    const n = new THREE.Vector3(0, -k, 1).normalize();          // delen foran snittet vises
    const p0 = new THREE.Vector3(0, y0, z0 + (tilstand.snit.koronal - 0.5) * 0.02);  // ±10 mm om sækkens midte
    return new THREE.Plane(n, -n.dot(p0));
  }
  const x = (tilstand.snit.sagittal - 0.5) * 0.03;                // -15 til +15 mm
  return tilstand.snitSide > 0 ? new THREE.Plane(new THREE.Vector3(-1, 0, 0), x) : new THREE.Plane(new THREE.Vector3(1, 0, 0), -x);
}
function bortskaaret(p) {
  const pl = snitPlan();
  return pl ? pl.distanceToPoint(p) < 0 : false;
}

function saetVisning(navn, straks) {
  tilstand.visning = navn;
  const v = VISNINGER[navn];
  let r = new THREE.Vector3(...v.retning);
  if (v.snit === "sagittal") {
    // Kameraet ses fra den side, fundet sidder; snittet lægges gennem fundet.
    r.x = tilstand.snitSide;
  }
  if (v.snit === "koronal") r.x = 0.5 * tilstand.snitSide;
  r.normalize();
  const pos = MAAL.clone().add(r.multiplyScalar(v.afstand));
  camera.up.set(...(v.op || [0, 1, 0]));
  if (straks) { camera.position.copy(pos); controls.target.copy(MAAL); }
  else { flyt.fra = camera.position.clone(); flyt.til = pos; flyt.t0 = performance.now(); controls.target.copy(MAAL); }
  const pl = snitPlan();
  if (pl) SNIT.uPlan.value.set(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant);
  for (const m of meshes) {
    m.mesh.material.clippingPlanes = pl ? [pl] : [];
    m.kappe.material.clippingPlanes = pl ? [pl] : [];
    m.kappe.visible = !!pl && m.gruppe !== "dura";
    m.mesh.material.needsUpdate = true;
    m.kappe.material.needsUpdate = true;
  }
  klip();
  synlighed();
  document.getElementById("snitKontrol").hidden = !pl;
  if (pl) document.getElementById("snitPos").value = Math.round(tilstand.snit[v.snit] * 100);
  document.querySelectorAll("[data-visning]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.visning === navn)));
}
const flyt = { fra: null, til: null, t0: 0 };

function anvend(animer) {
  if (!tilstand.klar) return;
  if (animer) { animStart = performance.now(); animFra = 0; }
  opdaterMorph();
  farvRoder();
  if (HEL.aktiv) findProlaps();
  synlighed();
}

function farvRoder() {
  const normal = new THREE.Color(FARVER.nerve);
  for (const m of meshes) {
    if (m.gruppe !== "nerve" || !/^Rod_/.test(m.navn)) continue;
    const r = tilstand.roder[m.navn];
    const fuld = new THREE.Color(!r ? FARVER.nerve : r.afledt ? FARVER.rodOrange : FARVER.rodRoed);
    // Under helingen falmer roden mod normal i takt med den typiske smerte.
    const grad = HEL.aktiv ? Math.min(1, HEL.s.smerte * 1.3) : 1;
    m.mesh.material.color.copy(normal).lerp(fuld, grad);
    m.mesh.material.emissive.setHex(r ? (r.afledt ? 0x3a2000 : 0x400000) : 0x000000).multiplyScalar(grad);
  }
}

// ---------------------------------------------------------------- helingsforløbet: makrofager, pil og etiketter
const MAKRO_N = 70;
const hjaelp = new THREE.Object3D(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let prolaps = null;               // { kand: [{m, v, k, d}], top: index, inst, pil }
function findProlaps() {
  model.updateMatrixWorld(true);
  const kand = [];
  for (const m of meshes) {
    if (m.gruppe !== "diskus" && m.gruppe !== "prolaps") continue;
    const d = m.mesh.morphTargetDictionary;
    if (!d) continue;
    const lin = new THREE.Matrix3().setFromMatrix4(m.mesh.matrixWorld);
    for (const [k, i] of Object.entries(d)) {
      if (!erProlaps(k) || !(tilstand.keys[k] > 0)) continue;
      const delta = m.mesh.geometry.morphAttributes.position[i];
      for (let v = 0; v < delta.count; v++) {
        tmp.set(delta.getX(v), delta.getY(v), delta.getZ(v));
        const l = tmp.clone().applyMatrix3(lin).length();
        if (l > 0.0018) kand.push({ m: m.mesh, v, k, i, l, d: tmp.clone(), masse: m.gruppe === "prolaps" });
      }
    }
  }
  // Af prolapsmassen bruges kun den yderste del (den, der er kommet ud af disken).
  const maks = kand.reduce((b, c) => (c.masse ? Math.max(b, c.l) : b), 0);
  for (let j = kand.length - 1; j >= 0; j--) if (kand[j].masse && kand[j].l < maks * 0.6) kand.splice(j, 1);
  if (!prolaps) {
    const inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.00085, 1), new THREE.MeshStandardMaterial({ color: 0xa07ad8, roughness: 0.4, emissive: 0x2a1450 }), MAKRO_N);
    inst.frustumCulled = false; inst.count = 0; scene.add(inst);
    const pil = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 0.006, 0x1f7ae0, 0.0025, 0.002);
    pil.visible = false; scene.add(pil);
    for (const mt of [pil.line.material, pil.cone.material]) { mt.transparent = true; mt.depthTest = false; }
    pil.renderOrder = 10;
    prolaps = { inst, pil, kand: [], top: -1, valg: [], fase: [] };
    for (let i = 0; i < MAKRO_N; i++) prolaps.fase.push({ frø: Math.random(), fart: 0.25 + Math.random() * 0.35, jit: Math.random() * 6.28 });
    klip();
  }
  prolaps.kand = kand;
  prolaps.top = kand.reduce((b, c, i) => (b < 0 || c.l > kand[b].l ? i : b), -1);
  prolaps.valg = Array.from({ length: MAKRO_N }, () => Math.floor(Math.random() * Math.max(1, kand.length)));
}
function prolapsPunkt(c, ud) {
  // Aktuel position (lokal base + forskydning × styrke) og udadgående retning i verdenskoordinater
  const pos = c.m.geometry.attributes.position, w = c.m.morphTargetInfluences[c.i];
  ud.p = tmp.set(pos.getX(c.v), pos.getY(c.v), pos.getZ(c.v)).addScaledVector(c.d, w).applyMatrix4(c.m.matrixWorld).clone();
  ud.n = tmp2.copy(c.d).transformDirection(c.m.matrixWorld).clone();
  return ud;
}
function tegnHeling(tid) {
  if (!prolaps) return;
  HEL.uni.uTid.value = tid / 1000;
  const vis = HEL.aktiv && prolaps.kand.length;
  const n = vis ? Math.round(HEL.s.makro * MAKRO_N) : 0;
  prolaps.inst.count = n;
  const q = {};
  for (let i = 0; i < n; i++) {
    const c = prolaps.kand[prolaps.valg[i] % prolaps.kand.length], f = prolaps.fase[i];
    prolapsPunkt(c, q);
    // Makrofagerne vandrer ind mod prolapsen og "spiser" sig ind i overfladen.
    const fs = ((tid / 1000) * f.fart + f.frø) % 1;
    const e = fs * fs * (3 - 2 * fs);
    const afst = 0.0005 + 0.009 * (1 - e);
    hjaelp.position.copy(q.p).addScaledVector(q.n, afst);
    hjaelp.position.x += Math.sin(tid / 700 + f.jit) * 0.0006;
    hjaelp.position.y += Math.cos(tid / 900 + f.jit) * 0.0006;
    hjaelp.scale.setScalar(fs > 0.85 ? 1 - (fs - 0.85) * 4 : 1);
    hjaelp.updateMatrix();
    prolaps.inst.setMatrixAt(i, hjaelp.matrix);
  }
  prolaps.inst.instanceMatrix.needsUpdate = true;
  const pil = prolaps.pil;
  pil.visible = !!vis && HEL.s.retr > 0.05 && prolaps.top >= 0;
  if (pil.visible) {
    prolapsPunkt(prolaps.kand[prolaps.top], q);
    pil.position.copy(q.p).addScaledVector(q.n, 0.0075);
    pil.setDirection(q.n.clone().negate());
    pil.line.material.opacity = pil.cone.material.opacity = Math.min(1, HEL.s.retr * 1.5);
  }
}
function helingsEtiket(navn, nok, forskyd) {
  return () => {
    if (!HEL.aktiv || !prolaps || prolaps.top < 0 || !(HEL.s[navn] > nok)) return null;
    const q = prolapsPunkt(prolaps.kand[prolaps.top], {});
    return q.p.addScaledVector(q.n, forskyd[0]).add(new THREE.Vector3(0, forskyd[1], 0));
  };
}
function klip() {
  const pl = snitPlan();
  if (!prolaps) return;
  for (const mt of [prolaps.inst.material]) { mt.clippingPlanes = pl ? [pl] : []; mt.needsUpdate = true; }
}

// Når fundene vises, kommer de øvrige forandringer først (1,2 s); prolapsen presses derefter ud
// gennem sprækken med en blød opbremsning og et lille efterslag (i alt ca. 2,6 s).
const PROLAPS_FORSINK = 350, PROLAPS_VARIGHED = 2250;
function udPres(t) {
  const c1 = 0.9, c3 = c1 + 1, u = t - 1;
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * u * u * u + c1 * u * u;
}
function opdaterMorph() {
  const ms = animStart ? performance.now() - animStart : Infinity;
  const t = Math.min(1, ms / 1200);
  const e = t * t * (3 - 2 * t);
  const ep = udPres((ms - PROLAPS_FORSINK) / PROLAPS_VARIGHED);
  const faktor = tilstand.styrke * (animFra + (1 - animFra) * e);
  const faktorP = tilstand.styrke * (animFra + (1 - animFra) * ep);
  for (const m of meshes) {
    const d = m.mesh.morphTargetDictionary;
    if (!d) continue;
    let sum = 0;
    for (const [k, i] of Object.entries(d)) {
      const p = erProlaps(k);
      const w = (tilstand.keys[k] || 0) * (p ? faktorP : faktor) * (HEL.aktiv ? (p ? HEL.s.storrelse : 0) : 1);  // under helingen vises kun prolapsen
      m.mesh.morphTargetInfluences[i] = w;
      sum += w;
    }
    // Prolapsmassen ligger skjult inde i kernen, når der ikke er nogen prolaps.
    if (m.gruppe === "prolaps") m.mesh.visible = sum > 0.002;
  }
  if (ms >= PROLAPS_FORSINK + PROLAPS_VARIGHED) animStart = 0;
}

function synlighed() {
  const dura = document.getElementById("visDura").checked;
  const lig = document.getElementById("visLig").checked;
  const glas = document.getElementById("glasKnogle").checked;
  // Med buerne fjernet skjules også ledbånd og cauda equina, så prolapsen og nerverødderne ses
  // foran i kanalen.
  const koronal = tilstand.visning === "koronal";
  for (const m of meshes) {
    if (m.gruppe === "nerve" && !/^Rod_/.test(m.navn)) m.mesh.visible = !koronal;
    if (m.gruppe === "dura") m.mesh.visible = dura;
    if (m.gruppe === "ligament") m.mesh.visible = lig && !koronal;
    if (m.gruppe === "knogle") {
      m.mesh.material.transparent = glas;
      m.mesh.material.opacity = glas ? 0.3 : 1;
      m.mesh.material.depthWrite = !glas;
      m.mesh.renderOrder = glas ? 3 : 0;
      m.mesh.material.needsUpdate = true;
    }
  }
}

function tegn(now) {
  requestAnimationFrame(tegn);
  if (flyt.til) {
    const t = Math.min(1, (now - flyt.t0) / 700), e = t * t * (3 - 2 * t);
    camera.position.lerpVectors(flyt.fra, flyt.til, e);
    if (t >= 1) flyt.til = null;
  }
  if (animStart) opdaterMorph();
  tegnHeling(now);
  controls.update();
  renderer.render(scene, camera);
  opdaterEtiketter();
}

// ---------------------------------------------------------------- API til ryg.js
window.RygVisning = {
  saet(res, opts = {}) {
    const nyt = JSON.stringify(res.keys) !== JSON.stringify(tilstand.keys);
    tilstand.keys = res.keys || {};
    tilstand.roder = res.roder || {};
    if (opts.snitSide) tilstand.snitSide = opts.snitSide;
    if (opts.snit != null) tilstand.snit.sagittal = opts.snit;
    if (opts.niveau && MAAL_NIV[opts.niveau] && opts.niveau !== tilstand.niveau) {
      // Nyt niveau i fokus: kameraet og det aksiale snit flyttes dertil.
      tilstand.niveau = opts.niveau;
      MAAL = MAAL_NIV[opts.niveau];
      tilstand.snit.aksial = aksialTilSnit(AKSIAL_NIV[opts.niveau]);
      if (tilstand.klar) saetVisning(tilstand.visning, false);
    }
    if (tilstand.klar && VISNINGER[tilstand.visning].snit) saetVisning(tilstand.visning, true);
    anvend(nyt);
  },
  visning: (n) => saetVisning(n, false),
  get visningNavn() { return tilstand.visning; },
  heling(s) {
    const var_ = HEL.aktiv;
    HEL.aktiv = !!s.aktiv && tilstand.klar;
    HEL.s = s;
    HEL.uni.uInflam.value = HEL.aktiv ? s.inflam : 0;
    HEL.uni.uTor.value = HEL.aktiv ? s.tor : 0;
    HEL.uni.uAr.value = HEL.aktiv ? s.ar : 0;
    const tor = HEL.uni.uTor.value;
    for (const m of meshes) if (m.gruppe === "prolaps") {
      m.mesh.material.roughness = 0.3 + 0.45 * tor;
      m.mesh.material.clearcoat = 1 - 0.85 * tor;
      m.mesh.material.sheen = 0.5 * (1 - tor);
    }
    if (HEL.aktiv && (!var_ || !prolaps)) findProlaps();
    animStart = 0;
    opdaterMorph();
    farvRoder();
  },
  get helingAktiv() { return HEL.aktiv; },
  get klar() { return tilstand.klar; },
  get niveau() { return tilstand.niveau; },
  influenser() {
    const ud = {};
    for (const m of meshes) {
      const d = m.mesh.morphTargetDictionary; if (!d) continue;
      for (const [k, i] of Object.entries(d)) if (m.mesh.morphTargetInfluences[i] > 0) ud[k] = Math.max(ud[k] || 0, m.mesh.morphTargetInfluences[i]);
    }
    return ud;
  },
  roder: () => Object.fromEntries(meshes.filter((m) => /^Rod_/.test(m.navn)).map((m) => [m.navn, "#" + m.mesh.material.color.getHexString()])),
  objekter: () => meshes.map((m) => m.navn),
  synlige: () => meshes.filter((m) => m.mesh.visible).map((m) => m.navn),
};

if (lav()) {
  document.querySelectorAll("[data-visning]").forEach((b) => b.addEventListener("click", () => saetVisning(b.dataset.visning, false)));
  document.getElementById("fundStyrke").addEventListener("input", (e) => { tilstand.styrke = e.target.value / 100; animStart = 0; opdaterMorph(); });
  document.getElementById("snitPos").addEventListener("input", (e) => {
    const v = VISNINGER[tilstand.visning];
    if (!v.snit) return;
    tilstand.snit[v.snit] = e.target.value / 100;
    const pos = camera.position.clone();
    saetVisning(tilstand.visning, true);
    camera.position.copy(pos);                           // bevar brugerens drejning
  });
  for (const id of ["visDura", "visLig", "glasKnogle"]) document.getElementById(id).addEventListener("change", synlighed);
  requestAnimationFrame(tegn);
  indlaes().catch((e) => {
    const el = document.getElementById("indlaeser");
    if (el) el.textContent = "3D-modellen kunne ikke indlæses (" + e.message + ").";
  });
  window.dispatchEvent(new Event("ryg-visning-klar"));
}
