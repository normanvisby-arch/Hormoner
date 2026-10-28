// Bygger kraeft/huskeskema.html ud fra kraeft/pakker.js (de samme kriterier som værktøjet).
// Brug: node tools/mkkraefthusk.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const KRAEFT_PAKKER = new Function(fs.readFileSync(path.join(root, 'kraeft/pakker.js'), 'utf8') + '; return KRAEFT_PAKKER;')();
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
const start = '<!-- PAKKER START -->';
const slut = '<!-- PAKKER SLUT -->';
const ud = tpl.slice(0, tpl.indexOf(start) + start.length) + '\n' + html + '  ' + tpl.slice(tpl.indexOf(slut));
fs.writeFileSync(path.join(root, 'kraeft/huskeskema.html'), ud);
console.log(`${n} pakker skrevet til kraeft/huskeskema.html`);
