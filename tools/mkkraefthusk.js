// Bygger kraeft/huskeskema.html ud fra kraeft/pakker.js (de samme kriterier som værktøjet).
// Brug: node tools/mkkraefthusk.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const KRAEFT_PAKKER = new Function(fs.readFileSync(path.join(root, 'kraeft/pakker.js'), 'utf8') + '; return KRAEFT_PAKKER;')();
const KRAEFT_REGION = new Function(fs.readFileSync(path.join(root, 'kraeft/region-midt.js'), 'utf8') + '; return KRAEFT_REGION;')();
const tpl = fs.readFileSync(path.join(root, 'kraeft/huskeskema.html'), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const grupper = [...new Set(KRAEFT_PAKKER.map((p) => p.gruppe))];
let html = '';
let n = 0;
for (const g of grupper) {
  html += `  <h2 class="group-title">${esc(g)}</h2>\n  <div class="groups">\n`;
  for (const p of KRAEFT_PAKKER.filter((x) => x.gruppe === g)) {
    n++;
    const rule = (titel, l) => (l.length ? `<li class="rule"><strong>${titel}</strong><ul class="why">${l.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>` : '');
    html += `    <section class="panel${p.akut ? ' panel-akut' : ''}" aria-labelledby="p-${p.id}" data-pakke="${p.id}">
      <div class="panel-head"><h2 id="p-${p.id}">${esc(p.navn)}</h2><span class="phase">${p.akut ? 'Akut' : ''}</span></div>
      <ul class="rules">${rule(p.akut ? 'Akut ved' : 'Begrundet mistanke', p.begrundet)}${rule('Mistanke — udredning/filter først', p.mistanke)}${rule('Almen praksis', p.gp)}<li class="rule"><strong>Henvis</strong><span class="why">${esc(p.henvis)}.</span></li>${rule('Bemærk', p.obs)}</ul>
    </section>\n`;
  }
  html += '  </div>\n';
}
// Region Midtjylland: henvisningsvej og numre pr. pakke.
const r = KRAEFT_REGION.midt;
const tel = (t) => `<a href="tel:+45${t.replace(/\s/g, '')}">${esc(t)}</a>`;
const rk = (x) => (x.gyn ? r.gyn : x.blod ? r.blod : x);
const rows = KRAEFT_PAKKER.filter((p) => r.pakker[p.id]).map((p) => {
  const x = rk(r.pakker[p.id]);
  const k = x.kontakter.map((c) => `${esc(c.sted)}: ${tel(c.tlf)}${c.tid ? ` (${esc(c.tid)})` : ''}`).join('<br>');
  return `<tr><td>${esc(p.navn)}</td><td>${esc(x.vej)}</td><td>${k || '—'}</td></tr>`;
}).join('\n          ');
html += `  <section class="panel section" aria-labelledby="rm" data-region="midt">
    <div class="panel-head"><h2 id="rm">${esc(r.navn)} — henvisningsveje og numre</h2><span class="phase">Kontrollér numrene</span></div>
    <p class="table-note">${r.generelt.map(esc).join(' ')} Hovednumre: ${r.hospitaler.map((h) => `${esc(h.sted)} ${tel(h.tlf)}`).join(' · ')}.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Pakke</th><th>Henvisningsvej</th><th>Telefon</th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    <p class="table-note">Kilder: regionens forløbsbeskrivelser på sundhed.dk og hospitalernes fagpersonsider. Kontrolleret ${esc(r.kontrolleret)}. Ret egne numre i værktøjet.</p>
  </section>
`;
const start = '<!-- PAKKER START -->';
const slut = '<!-- PAKKER SLUT -->';
const ud = tpl.slice(0, tpl.indexOf(start) + start.length) + '\n' + html + '  ' + tpl.slice(tpl.indexOf(slut));
fs.writeFileSync(path.join(root, 'kraeft/huskeskema.html'), ud);
console.log(`${n} pakker skrevet til kraeft/huskeskema.html`);
