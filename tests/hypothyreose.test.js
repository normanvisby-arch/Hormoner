const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'thyreoidea/hypothyreose.html';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const fresh = async () => { await p.goto(BASE); await p.waitForTimeout(120); };
  const out = async () => p.locator('#output').innerText();
  const head = async (i = 0) => p.locator('#output .box h3').nth(i).innerText();
  const r = (n, v) => p.check(`input[name="${n}"][value="${v}"]`);
  const cb = (v) => p.check(`input[name="andet"][value="${v}"]`);
  const fill = async (o) => { for (const [k, v] of Object.entries(o)) await p.fill('#' + k, String(v)); };
  const rec = async () => p.$$eval('#output tr', (trs) => trs.filter((tr) => tr.querySelector('.tag-recommend')).map((tr) => tr.cells[0].childNodes[0].textContent.trim()));
  const note = async () => { await p.click('#copyBtn'); await p.waitForTimeout(150); return p.evaluate(() => navigator.clipboard.readText()); };

  await fresh(); check('1 tom -> indtast TSH', (await head()) === 'Indtast TSH');
  await fill({ tsh: '2.1' }); check('2 normal TSH', (await head()) === 'Normalt TSH — ingen hypothyreose');
  await fill({ tsh: '0.1' }); check('2b lavt TSH -> hyperthyreose uden for området', (await head()).startsWith('Lavt TSH'));
  await r('t4', 'lav'); check('2c lavt TSH + lavt T4 -> central', (await head()).includes('central hypothyreose'));
  await fill({ tsh: '2' }); check('2d normalt TSH + lavt T4 -> overvej central', (await head()).includes('overvej central'));
  // Manifest
  await fresh(); await fill({ tsh: '25', alder: 40, vaegt: 70 }); await r('t4', 'lav'); let o = await out();
  check('3 manifest', (await head()) === 'Manifest primær hypothyreose' && o.includes('Behandling med levothyroxin er indiceret'));
  check('3 fuld dosis 1,6 µg/kg = 112 -> 100 µg', (await rec()).includes('Levothyroxin 100 mikrog. dagligt'), JSON.stringify(await rec()));
  await fill({ alder: 72 }); check('3b ældre -> 25 µg', (await rec()).includes('Levothyroxin 25 mikrog. dagligt'));
  await fill({ alder: 50 }); await cb('hjerte'); check('3c IHD -> 25 µg', (await rec()).includes('Levothyroxin 25 mikrog. dagligt'));
  // Subklinisk
  await fresh(); await fill({ tsh: '7', alder: 45 }); await r('t4', 'normal'); o = await out();
  check('4 subklinisk ikke bekræftet -> gentag', (await head()) === 'Subklinisk hypothyreose' && o.includes('gentag TSH, T4 og TPO-antistoffer efter 1–3 måneder') && !o.includes('Levothyroxin 50'));
  await cb('bekraeftet'); o = await out(); check('4b TSH 7 uden symptomer -> ingen behandling, kontrol 3–6 mdr', o.includes('Ingen behandling nu') && o.includes('3–6 måneder'));
  await r('tpo', 'pos'); check('4c TPO+ -> 4 % pr. år', (await out()).includes('4 % risiko'));
  await cb('symptomer'); o = await out(); check('4d symptomer -> forsøgsbehandling 50 µg', o.includes('forsøgsbehandling') && (await rec()).includes('Levothyroxin 50 mikrog. dagligt'));
  await fill({ tsh: '12' }); check('4e TSH 12 < 70 år -> behandling anbefales', (await out()).includes('behandling anbefales'));
  await fill({ alder: 78 }); o = await out(); check('4f TSH 12 hos 78-årig -> individuel', o.includes('individuel vurdering') && !o.includes('Levothyroxin'));
  await fill({ tsh: '7' }); check('4g TSH 7 hos 78-årig -> ikke behandling', (await out()).includes('behandling anbefales ikke'));
  await fresh(); await fill({ tsh: '5', alder: 30 }); await r('t4', 'normal'); await cb('gravid'); o = await out();
  check('5 gravid subklinisk -> behandles, 50 µg, kontrol hver 4. uge', o.includes('subklinisk hypothyreose behandles') && o.includes('hver 4. uge') && (await rec()).includes('Levothyroxin 50 mikrog. dagligt'));
  await fresh(); await fill({ tsh: '6' }); await r('t4', 'ukendt'); check('5b T4 mangler', (await head()).includes('T4 mangler'));
  await cb('akut'); await r('t4', 'normal'); await cb('bekraeftet'); check('5c akut sygdom -> gentag efter 6 uger', (await out()).includes('efter ca. 6 uger'));
  // I behandling
  await fresh(); await r('situation', 'beh'); check('6 dosisfelt vises', await p.locator('#dosisField').isVisible());
  await fill({ dosis: 100, tsh: '6.5', alder: 50, vaegt: 70 }); o = await out();
  check('6 TSH 6,5 -> øg 12,5', (await head()).startsWith('Øg dosis') && (await rec()).includes('Levothyroxin 112,5 mikrog. dagligt'), JSON.stringify(await rec()));
  await fill({ tsh: '15' }); check('6b TSH 15 -> +25', (await rec()).includes('Levothyroxin 125 mikrog. dagligt'));
  await fill({ dosis: 150 }); check('6c høj dosis/kg -> tjek adhærens', (await out()).includes('tjek adhærens'));
  await fill({ dosis: 100, tsh: '0.05' }); check('7 TSH 0,05 -> reducér 25', (await head()).startsWith('Reducér') && (await rec()).includes('Levothyroxin 75 mikrog. dagligt'));
  await fill({ tsh: '2' }); check('8 i mål -> uændret', (await head()).startsWith('Uændret'));
  await fill({ tsh: '5.5', alder: 75 }); check('8b 75 år TSH 5,5 -> i mål (op til 6)', (await head()).startsWith('Uændret'));
  await cb('gravid'); o = await out(); check('9 gravid i behandling -> +25 %', o.includes('20–30 %') && (await rec()).includes('Levothyroxin 125 mikrog. dagligt'));
  // Audit K2: allerede øget dosis eller lavt TSH i graviditet -> normal justering med mål 2,5
  await fresh(); await r('situation', 'beh'); await fill({ dosis: 100, tsh: '0.05', alder: 32, vaegt: 65 }); await cb('gravid'); o = await out();
  check('9b gravid + TSH 0,05 -> ikke øgning, reducér', (await head()).startsWith('Reducér') && !o.includes('20–30 %') && (await rec()).includes('Levothyroxin 75 mikrog. dagligt'), await head());
  check('9b kontrol hver 4. uge', o.includes('efter 4 uger (graviditet)'));
  await fill({ tsh: '1.2' }); await cb('oeget'); o = await out();
  check('9c allerede øget + TSH 1,2 -> uændret', (await head()).startsWith('Uændret') && !o.includes('Ca. +25 %'), await head());
  await fill({ tsh: '3.1' }); check('9d allerede øget + TSH 3,1 -> øg (mål 2,5)', (await head()).startsWith('Øg dosis') && (await head()).includes('2,5'));
  let n = await note(); check('9e journal graviditet -> hver 4. uge + henvisning', n.includes('hver 4. uge') && n.includes('graviditeten'), n);
  // Audit V7: graviditetsgrænse for TSH
  await fresh(); await fill({ tsh: '3.8', alder: 29 }); await r('t4', 'normal'); await cb('gravid');
  check('9f gravid TSH 3,8 -> subklinisk (grænse 3,5)', (await head()) === 'Subklinisk hypothyreose', await head());
  await fresh(); await fill({ tsh: '3.8', alder: 29 }); await r('t4', 'normal'); check('9g ikke gravid TSH 3,8 -> normal', (await head()).startsWith('Normalt TSH'));
  // Laveste dosis og lavt TSH -> pause
  await fresh(); await r('situation', 'beh'); await fill({ dosis: '12.5', tsh: '0.05', alder: 60 });
  check('9h 12,5 µg + TSH 0,05 -> pause', (await rec()).includes('Pause med levothyroxin'), JSON.stringify(await rec()));
  await fill({ tshOvre: '12' }); check('9i øvre grænse uden for område -> advarsel', (await p.locator('#ovreWarning').innerText()).includes('standard 4,0'));
  await r('situation', 'ny'); await cb('hypofyse'); await r('situation', 'beh'); n = await note();
  check('9j hypofyse -> journalplan', n.includes('central hypothyreose') && n.includes('endokrinolog'), n);
  // Journal
  await fresh(); await fill({ tsh: '25', alder: 40, vaegt: 70 }); await r('t4', 'lav');
  n = await note(); console.log('---\n' + n + '\n---');
  check('10 journal', n.includes('TSH 25 mIE/l, T4 lav') && n.includes('Vurdering: Manifest primær hypothyreose') && n.includes('Plan: Levothyroxin 100 mikrog. dagligt'));
  await p.check('#output input[name="valg"][value="start|50"]'); n = await note();
  check('10b valgt 50 µg', n.includes('Valgt dosis: Levothyroxin 50 mikrog. dagligt') && !n.includes('100 mikrog'), n);
  await p.click('#resetBtn'); check('11 reset', (await p.inputValue('#tsh')) === '' && (await head()) === 'Indtast TSH');
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(BASE);
  await m.fill('#tsh', '25'); await m.check('input[name="t4"][value="lav"]'); await m.waitForTimeout(100);
  check('12 mobile no overflow', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.locator('#resultPanel').screenshot({ path: SHOTS + 'thyr_mobile.png' });
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
