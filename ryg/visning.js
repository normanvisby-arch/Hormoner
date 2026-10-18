// 3D-visning af lændesøjlen L3–S1 med three.js. Modellen (model/l3-s1.glb) har patologien som
// morph targets (shape keys fra Blender, se tools/ryg/); ryg.js bestemmer styrkerne ud fra fundene.
import * as THREE from "three";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { OrbitControls } from "./lib/OrbitControls.js";
import { MeshoptDecoder } from "./lib/meshopt_decoder.module.js";

const boks = document.getElementById("visning");
const MAAL = new THREE.Vector3(0, 0.999, 0.03);       // kanalen ved L4/L5 (glTF: +Y op, +Z fortil, +X venstre)
const FARVER = {
  knogle: 0xe9dfc9, diskus: 0x93b4d6, nucleus: 0x4f86cf, ligament: 0xe0c062, dura: 0x86a8ee, nerve: 0xf0dc8c,
  rodRoed: 0xd62828, rodOrange: 0xf08c00,
};
// Snitflader (bagsiden af lukkede flader): spongiøs knogle, diskusvæv osv.
const KAPPE = { knogle: 0xd8c2a0, diskus: 0xa7c3e2, nucleus: 0x6f9ee0, ligament: 0xd9b95a, nerve: 0xe8cf6e };
const VISNINGER = {
  "3d": { retning: [0.78, 0.38, -1], afstand: 0.27 },
  bag: { retning: [0, 0.08, -1], afstand: 0.25 },
  venstre: { retning: [1, 0.06, -0.05], afstand: 0.25 },
  hoejre: { retning: [-1, 0.06, -0.05], afstand: 0.25 },
  // Snit vises som MR-billeder: aksialt set nedefra (patientens højre i billedets venstre side,
  // fortil opad), sagittalt set fra siden med fortil til venstre.
  aksial: { retning: [0, -1, 0.0001], afstand: 0.17, snit: "aksial", op: [0, 0, 1] },
  sagittal: { retning: [1, 0.05, 0], afstand: 0.2, snit: "sagittal" },
};

const tilstand = { keys: {}, roder: {}, styrke: 1, visning: "3d", snitSide: 1, snit: { aksial: 0.4, sagittal: 0.5 }, klar: false };
let renderer, scene, camera, controls, model;
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
  controls.enableDamping = true;
  controls.minDistance = 0.06;
  controls.maxDistance = 0.6;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa4a9b2, 1.1));
  const lys1 = new THREE.DirectionalLight(0xffffff, 1.6); lys1.position.set(0.4, 1.4, -0.9);
  const lys2 = new THREE.DirectionalLight(0xfff4e8, 0.9); lys2.position.set(-0.8, 0.6, 1.0);
  const lys3 = new THREE.DirectionalLight(0xe8f0ff, 1.1); lys3.position.set(0.2, -1, 0.3);
  scene.add(lys1, lys2, lys3);
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
  if (/^Durasaek/.test(navn)) return "dura";
  if (/^(Rod_|Cauda|Filum)/.test(navn)) return "nerve";
  return "ligament";
}

// Væv, der er flyttet af en shape key (prolaps, fortykket ledbånd, osteofytter), farves varmt,
// så forandringen ses tydeligt; farven følger skyderen "Normal ↔ Med fund".
const FORANDRING = new THREE.Color(0xe0603a);
function markerForandring(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uForandring = { value: FORANDRING };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vForskyd;")
      .replace("#include <morphtarget_vertex>", "#include <morphtarget_vertex>\nvForskyd = length(transformed - position);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vForskyd;\nuniform vec3 uForandring;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uForandring, smoothstep(0.0006, 0.0025, vForskyd) * 0.8);");
  };
}
const MED_FORANDRING = ["knogle", "diskus", "nucleus", "ligament"];

function materiale(g) {
  const m = new THREE.MeshStandardMaterial({ color: FARVER[g], roughness: g === "knogle" ? 0.72 : 0.55, metalness: 0 });
  if (MED_FORANDRING.includes(g)) markerForandring(m);
  if (g === "dura") { m.transparent = true; m.opacity = 0.38; m.depthWrite = false; }
  if (g === "nerve") { m.emissive = new THREE.Color(0x000000); }
  return m;
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
    if (MED_FORANDRING.includes(g)) markerForandring(km);
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
  const def = [
    ["L4", [0.0, 1.019, 0.052], null, true], ["L5", [0.0, 0.979, 0.047], null, true], ["Disk L4/L5", [-0.022, 0.999, 0.05]],
    ["Durasæk", [0, 1.045, 0.025]],
    ["L4-rod", [0.03, 1.002, 0.033], "Rod_L4_v"], ["L4-rod", [-0.03, 1.002, 0.033], "Rod_L4_h"],
    ["L5-rod", [0.028, 0.973, 0.025], "Rod_L5_v"], ["L5-rod", [-0.028, 0.973, 0.025], "Rod_L5_h"],
    ["Facetled", [0.026, 1.002, 0.012]], ["Facetled", [-0.026, 1.002, 0.012]],
  ];
  for (const [tekst, p, rod, ikkeISnit] of def) {
    const el = document.createElement("span");
    el.className = "ryg-label";
    el.textContent = tekst;
    boks.appendChild(el);
    etiketter.push({ el, p: new THREE.Vector3(...p), rod, ikkeISnit });
  }
}

function opdaterEtiketter() {
  const vis = document.getElementById("visNavne")?.checked !== false;
  const w = boks.clientWidth, h = boks.clientHeight;
  const v = new THREE.Vector3();
  const kamRet = new THREE.Vector3(); camera.getWorldDirection(kamRet);
  for (const e of etiketter) {
    const fremhaevet = e.rod && tilstand.roder[e.rod];
    v.copy(e.p).project(camera);
    // Skjul etiketter på den bortvendte side og i snitvisning den bortskårne del
    const tilKamera = e.p.clone().sub(camera.position).normalize();
    const synlig = vis && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && (!e.rod || fremhaevet || tilstand.visning === "3d") && !bortskaaret(e.p) && tilKamera.dot(kamRet) > 0 && !(e.ikkeISnit && VISNINGER[tilstand.visning].snit === "aksial");
    e.el.hidden = !synlig;
    if (!synlig) continue;
    e.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
    e.el.classList.toggle("ryg-label-roed", !!fremhaevet && !fremhaevet.afledt);
    e.el.classList.toggle("ryg-label-orange", !!fremhaevet && fremhaevet.afledt);
  }
}

function snitPlan() {
  const v = VISNINGER[tilstand.visning];
  if (!v.snit) return null;
  if (v.snit === "aksial") {
    const y = 0.986 + tilstand.snit.aksial * 0.028;            // L5-overflade til L4-underflade; delen over snittet vises
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
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
  r.normalize();
  const pos = MAAL.clone().add(r.multiplyScalar(v.afstand));
  camera.up.set(...(v.op || [0, 1, 0]));
  if (straks) { camera.position.copy(pos); controls.target.copy(MAAL); }
  else { flyt.fra = camera.position.clone(); flyt.til = pos; flyt.t0 = performance.now(); controls.target.copy(MAAL); }
  const pl = snitPlan();
  for (const m of meshes) {
    m.mesh.material.clippingPlanes = pl ? [pl] : [];
    m.kappe.material.clippingPlanes = pl ? [pl] : [];
    m.kappe.visible = !!pl && m.gruppe !== "dura";
    m.mesh.material.needsUpdate = true;
    m.kappe.material.needsUpdate = true;
  }
  document.getElementById("snitKontrol").hidden = !pl;
  if (pl) document.getElementById("snitPos").value = Math.round(tilstand.snit[v.snit] * 100);
  document.querySelectorAll("[data-visning]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.visning === navn)));
}
const flyt = { fra: null, til: null, t0: 0 };

function anvend(animer) {
  if (!tilstand.klar) return;
  if (animer) { animStart = performance.now(); animFra = 0; }
  opdaterMorph();
  for (const m of meshes) {
    if (m.gruppe !== "nerve" || !/^Rod_/.test(m.navn)) continue;
    const r = tilstand.roder[m.navn];
    const farve = !r ? FARVER.nerve : r.afledt ? FARVER.rodOrange : FARVER.rodRoed;
    m.mesh.material.color.setHex(farve);
    m.mesh.material.emissive.setHex(r ? (r.afledt ? 0x3a2000 : 0x400000) : 0x000000);
  }
  synlighed();
}

function opdaterMorph() {
  const t = animStart ? Math.min(1, (performance.now() - animStart) / 1200) : 1;
  const e = t * t * (3 - 2 * t);
  const faktor = tilstand.styrke * (animFra + (1 - animFra) * e);
  for (const m of meshes) {
    const d = m.mesh.morphTargetDictionary;
    if (!d) continue;
    for (const [k, i] of Object.entries(d)) m.mesh.morphTargetInfluences[i] = (tilstand.keys[k] || 0) * faktor;
  }
  if (t >= 1) animStart = 0;
}

function synlighed() {
  const dura = document.getElementById("visDura").checked;
  const lig = document.getElementById("visLig").checked;
  const glas = document.getElementById("glasKnogle").checked;
  for (const m of meshes) {
    if (m.gruppe === "dura") m.mesh.visible = dura;
    if (m.gruppe === "ligament") m.mesh.visible = lig;
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
    if (tilstand.klar && VISNINGER[tilstand.visning].snit) saetVisning(tilstand.visning, true);
    anvend(nyt);
  },
  visning: (n) => saetVisning(n, false),
  get klar() { return tilstand.klar; },
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
