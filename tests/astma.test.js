const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'lunge/astma.html';
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
  const note = async () => { await p.click('#copyBtn'); await p.waitForTimeout(150); return p.evaluate(() => navigator.clipboard.readText()); };

  await fresh(); let o = await out();
  check('1 ny, sjældne symptomer -> ICS-formoterol efter behov', (await head(1)).includes('ICS-formoterol efter behov') && o.includes('Bufomix Easyhaler') && o.includes('1 inhalation efter behov'));
  check('1 velkontrolleret', (await head()) === 'Astmakontrol: velkontrolleret');
  check('1 behandlingsfelter skjult ved ny', await p.locator('#behFields').isHidden());
  await r('start', 'fleste'); check('2 fleste dage -> MART lav', (await head(1)).includes('MART med lav dosis') && (await out()).includes('1 inhalation × 2 dagligt'));
  await r('start', 'akut'); o = await out(); check('2b akut -> MART medium + prednisolon', (await head(1)).includes('medium dosis') && o.includes('prednisolonkur'));
  await fresh(); await r('situation', 'kendt'); o = await out();
  check('3 kendt SABA alene -> skift', (await head(1)).includes('Skift fra SABA alene') && o.includes('SABA alene anbefales ikke'));
  await r('beh', 'martlav'); await p.check('input[name="kontrol"][value="dag"]'); await p.check('input[name="kontrol"][value="nat"]'); o = await out();
  check('4 MART lav + 2 kriterier -> delvist, optrap til medium', (await head()) === 'Astmakontrol: delvist kontrolleret' && (await head(1)).includes('Optrapning') && (await head(1)).includes('medium'));
  check('4 teknik-note', o.includes('Før optrapning'));
  await r('beh', 'martmedium'); await p.check('input[name="kontrol"][value="anfald"]'); o = await out();
  check('5 MART medium ukontrolleret -> trin 5 + henvisning', (await head()) === 'Astmakontrol: ukontrolleret' && o.includes('Spiriva Respimat') && o.includes('Henvisning til lungemedicinsk afdeling'));
  await fresh(); await r('situation', 'kendt'); await r('beh', 'martmedium'); await p.check('input[name="andet"][value="stabil"]');
  check('6 stabil på MART medium -> ned til lav', (await head(1)).includes('Nedtrapning') && (await head(1)).includes('lav dosis'));
  await p.fill('#eks', '1'); o = await out(); check('7 1 forværring -> ingen nedtrapning', !(await head(1)).includes('Nedtrapning') && o.includes('Trap ikke ned'));
  await p.fill('#eks', '2'); check('7b 2 forværringer -> optrapning', (await head(1)).includes('Optrapning'));
  await fresh(); await r('situation', 'kendt'); await r('beh', 'air'); await p.fill('#act', '15'); o = await out();
  check('8 ACT 15 -> afvigelse noteret og optrapning', o.includes('ACT 15: dårligt kontrolleret') && o.includes('afviger') && (await head(1)).includes('Optrapning'));
  await r('beh', 'icsfast'); check('8b spor 2 -> anbefal skift til spor 1', (await out()).includes('skift til spor 1'));
  await fresh(); await p.fill('#alder', '10'); check('9 alder 10 -> advarsel', (await p.locator('#alderWarning').innerText()).includes('12 år'));
  check('9a alder 10 -> ingen anbefaling', (await head()) === 'Børn under 12 år' && !(await out()).includes('Bufomix'));
  await p.fill('#alder', '30');
  await p.check('input[name="andet"][value="gravid"]'); check('9b gravid -> boks', (await out()).includes('Fortsæt astmabehandlingen under graviditet'));
  // Audit V1: ingen nedtrapning under graviditet
  await r('situation', 'kendt'); await r('beh', 'martmedium'); await p.check('input[name="andet"][value="stabil"]'); o = await out();
  check('9c gravid + stabil -> ingen nedtrapning', (await head(1)).includes('ingen nedtrapning') && o.includes('Trap ikke ned under graviditet') && o.includes('2 inhalationer × 2'), await head(1));
  // Audit V2: Innovair kun ved MART og maks. 8
  check('9d Innovair ved MART maks. 8', o.includes('Innovair 100/6') && o.includes('maks. 8 pust'));
  await fresh(); check('9e Innovair ikke ved AIR', !(await out()).includes('Innovair'));
  // Audit V4: fast høj dosis ICS-LABA -> MART medium først
  await r('situation', 'kendt'); await r('beh', 'icslabahoej'); await p.check('input[name="kontrol"][value="dag"]'); o = await out();
  check('9f ICS-LABA høj ukontrolleret -> MART medium', (await head(1)).includes('MART med medium dosis') && !o.includes('Spiriva'), await head(1));
  // Audit V3: journal trin 5 nævner LAMA og henvisning
  await r('beh', 'martmedium'); let n = await note();
  check('9g journal trin 5 -> Spiriva og henvisning', n.includes('Plan: Spiriva Respimat') && n.includes('Plan: Henvisning til lungemedicinsk'), n);
  // SABA alene + 2 prednisolonkure -> trin 3 + henvisning
  await fresh(); await r('situation', 'kendt'); await r('beh', 'saba'); await p.fill('#eks', '2'); o = await out();
  check('9h SABA + 2 kure -> MART lav + henvis', (await head(1)).includes('MART med lav dosis') && o.includes('henvis til lungemedicinsk vurdering'));
  // ACT styrer overskrift, ACT uden for område
  await fresh(); await r('situation', 'kendt'); await r('beh', 'martlav'); await p.fill('#act', '14');
  check('9i ACT 14 -> ukontrolleret i overskrift', (await head()) === 'Astmakontrol: ukontrolleret', await head());
  await p.fill('#act', '30'); check('9j ACT 30 -> advarsel og ignoreres', (await p.locator('#actWarning').innerText()).includes('5 til 25') && (await head()) === 'Astmakontrol: velkontrolleret');
  // SABA-risiko kun ved kendt astma
  await fresh(); check('9k ny -> ingen "SABA uden ICS"', !(await out()).includes('SABA uden ICS'));
  await r('start', 'akut'); n = await note(); check('9l journal akut -> prednisolon og kontrol', n.includes('Prednisolon 37,5–50 mg') && n.includes('1–2 uger'), n);
  await fresh(); await p.fill('#alder', '34');
  n = await note(); console.log('---\n' + n + '\n---');
  check('10 journal', n.includes('Astma — opstart') && n.includes('Førstevalg: Bufomix Easyhaler'));
  await p.check('#output input[name="valg"][value^="air|Symbicort"]'); n = await note();
  check('10b valgt Symbicort', n.includes('Valgt behandling: Symbicort Turbuhaler') && !n.includes('Bufomix'), n);
  await p.click('#resetBtn'); check('11 reset', (await p.inputValue('#alder')) === '' && (await p.locator('#output input[name="valg"]:checked').count()) === 0);
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(BASE); await m.waitForTimeout(100);
  check('12 mobile no overflow', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.locator('#resultPanel').screenshot({ path: SHOTS + 'astma_mobile.png' });
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
