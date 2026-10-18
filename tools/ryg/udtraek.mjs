// Udtræk navngivne strukturer fra Svitylo/Z-Anatomy-chunks til en simpel GLB (ukomprimeret, meter, +Y op, +Z frem).
// Kræver npm-pakkerne @gltf-transform/core, @gltf-transform/extensions og meshoptimizer samt datapakken
// @authorod/svitylo-3d-anatomy-data@1.2.0 (udpakket). Brug (se README, "MR-columna i 3D"):
//   node udtraek.mjs PAKKE/releases/1.2.0 raw.glb skeletal.vertebra_l3=L3 skeletal.vertebra_l4=L4 \
//     skeletal.vertebra_l5=L5 skeletal.sacrum=Sacrum joints.intervertebral_disc_l3_l4=Disc_L3L4 \
//     joints.intervertebral_disc_l4_l5=Disc_L4L5 joints.intervertebral_disc_l5_s1=Disc_L5S1 \
//     joints.nucleus_pulposus_l4_l5=Nucleus_L4L5 joints.ligamenta_flava=Flavum \
//     joints.posterior_longitudinal_ligament=PLL joints.anterior_longitudinal_ligament=ALL
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs';
const [,, root, outPath, ...wanted] = process.argv;
const man = JSON.parse(fs.readFileSync(`${root}/manifest.json`, 'utf8'));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const out = new Document(); const buf = out.createBuffer(); const scene = out.createScene('ryg');
const byId = Object.fromEntries(man.structures.map(s => [s.id, s]));
const cache = {};
function mul(a, b) { const r = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return r; }
for (const w of wanted) {
  const [id, rename] = w.split('=');
  const s = byId[id]; if (!s || !s.meshes) { console.error('mangler', id); continue; }
  const mi = s.meshes[0];
  const ch = man.chunks.find(c => c.meshStart <= mi && mi < c.meshStart + c.meshCount);
  const doc = cache[ch.id] ||= await io.read(`${root}/standard/${ch.files.standard.path.replace(/^standard\//, '')}`);
  const pos = [], nor = [], idx = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), I = prim.getAttribute('_ID'), X = prim.getIndices();
      const map = new Map(); const tmp = [0, 0, 0], tn = [0, 0, 0];
      const take = v => {
        if (map.has(v)) return map.get(v);
        P.getElement(v, tmp); const x = tmp[0], y = tmp[1], z = tmp[2];
        pos.push(M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]);
        N.getElement(v, tn); const l = Math.hypot(tn[0], tn[1], tn[2]) || 1; nor.push(tn[0] / l, tn[1] / l, tn[2] / l);
        map.set(v, pos.length / 3 - 1); return pos.length / 3 - 1;
      };
      const e = [0];
      for (let t = 0; t < X.getCount(); t += 3) {
        const a = X.getScalar(t), b = X.getScalar(t + 1), c = X.getScalar(t + 2);
        I.getElement(a, e); if (e[0] !== mi) continue;
        idx.push(take(a), take(b), take(c));
      }
    }
  }
  const name = rename || id;
  const m = out.createMesh(name).addPrimitive(out.createPrimitive()
    .setAttribute('POSITION', out.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf))
    .setAttribute('NORMAL', out.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buf))
    .setIndices(out.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf)));
  scene.addChild(out.createNode(name).setMesh(m));
  console.log(name, pos.length / 3, 'v', idx.length / 3, 't');
}
await new NodeIO().writeBinary(out).then(b => fs.writeFileSync(outPath, b));
