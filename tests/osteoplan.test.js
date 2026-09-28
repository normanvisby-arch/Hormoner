const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'osteoplan.html';
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const t0 = new Date(); const T = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
const add = (m, days = 0) => { const d = new Date(T.getFullYear(), T.getMonth() + m, T.getDate() + days); return d; };
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const fresh = async () => { await p.goto(BASE); await p.waitForTimeout(120); };
  const out = async () => p.locator('#output').innerText();
  const rows = async () => p.locator('#output tbody tr').allInnerTexts();
  const fmt = (d) => d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });

  await fresh(); let o = await out();
  check('1 empty -> relative plan', o.includes('Angiv behandlingsstart') && o.includes('5 år') && o.includes('3 mdr.'));
  check('1 no pause blockers -> pause kan overvejes', o.includes('pause kan overvejes'));
  check('1 last field hidden', await p.locator('#lastField').isHidden());

  await p.fill('#start', iso(add(-38))); o = await out();
  const r1 = await rows();
  check('2 alendronat 3 år 2 mdr', o.includes('3 år og 2 måneder'), o.split('\n')[1]);
  check('2 next = 4 år kontrol', r1.some((r) => r.includes('← næste') && r.includes('Årlig kontrol') && r.includes(fmt(add(10)))), r1.find((r) => r.includes('næste')));
  check('2 5y revurdering date', r1.some((r) => r.includes(fmt(add(22))) && r.includes('DXA og revurdering')));
  check('2 pause row at 6 år', r1.some((r) => r.includes('DXA under pause') && r.includes(fmt(add(34)))));
  await p.check('input[name="hr"][value="hofteryg"]'); o = await out(); const r2 = await rows();
  check('3 high risk -> fortsæt + 10 år', o.includes('fortsæt behandlingen') && r2.some((r) => r.includes('Revurdering efter 10 år')) && !r2.some((r) => r.includes('DXA under pause')));

  await fresh(); await p.check('input[name="drug"][value="zoledronsyre"]'); await p.fill('#start', iso(add(-13))); const r3 = await rows();
  check('4 zol: 2. infusion done, 3. infusion next', r3.some((r) => r.includes('2. infusion') && r.includes('✓')) && r3.some((r) => r.includes('3. infusion') && r.includes('← næste')));
  check('4 zol revurdering 3 år', r3.some((r) => r.includes('DXA og revurdering') && r.includes(fmt(add(23)))));
  await p.check('input[name="hr"][value="prednisolon"]'); const r4 = await rows();
  check('5 zol high risk -> 6 infusions + 6 år', r4.some((r) => r.includes('6. infusion')) && r4.some((r) => r.includes('Revurdering efter 6 år')));

  // Denosumab
  await fresh(); await p.check('input[name="drug"][value="denosumab"]'); o = await out();
  check('6 denosumab: last field visible + no pause', (await p.locator('#lastField').isVisible()) && o.includes('Ingen behandlingspause med denosumab'));
  await p.fill('#start', iso(add(-14))); o = await out(); const r5 = await rows();
  check('7 start -14 mdr -> next inj at +4 mdr, green', o.includes('Næste injektion') && o.includes(fmt(add(4))), o.split('\n').slice(0, 6).join('|'));
  check('7 shows last done + 4 future', r5.filter((r) => r.includes('injektion')).length === 5 && r5.some((r) => r.includes('3. injektion') && r.includes('✓')));
  await p.fill('#last', iso(add(-6, -10))); o = await out();
  check('8 last 6 mdr 10 d ago -> forfalden', o.includes('Injektion forfalden'), o.split('\n').slice(0, 6).join('|'));
  await p.fill('#last', iso(add(-8))); o = await out();
  check('9 last 8 mdr ago -> forsinket red', o.includes('Forsinket injektion'));
  await p.fill('#last', iso(add(-2))); o = await out(); const r6 = await rows();
  check('10 last 2 mdr ago -> next at +4 mdr, numbering from start', o.includes(fmt(add(4))) && r6.some((r) => r.includes('4. injektion') && r.includes('← næste')), r6.find((r) => r.includes('næste')));
  await p.fill('#start', ''); o = await out(); const r7 = await rows();
  check('11 only last -> Næste injektion computed', r7.some((r) => r.includes('Næste injektion') && r.includes(fmt(add(4)))) && o.includes('Næste injektion'));

  // Future start + copy
  await fresh(); await p.fill('#start', iso(add(1))); o = await out(); check('12 future start', o.includes('Behandlingen starter'));
  await p.fill('#start', iso(add(15))); check('12b far future warning', (await p.locator('#startWarning').innerText()).includes('mere end et år'));
  await p.fill('#start', iso(add(-3, -1)));
  await p.click('#copyBtn'); await p.waitForTimeout(150); const txt = await p.evaluate(() => navigator.clipboard.readText()); console.log('---\n' + txt.split('\n').slice(0, 5).join('\n') + '\n---');
  check('13 copy plan', txt.startsWith('Osteoporose — opfølgningsplan (alendronat), start') && txt.includes('(overstået)') && txt.includes('pause kan overvejes'));
  await p.click('#resetBtn'); o = await out(); check('14 reset', o.includes('Angiv behandlingsstart'));
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(BASE); await m.fill('#start', iso(add(-20))); await m.waitForTimeout(100);
  check('15 mobile no overflow', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.locator('#resultPanel').screenshot({ path: SHOTS + 'plan_mobile.png' });
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
