const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'praevention.html';
const ORIGIN = new URL(BASE).origin;
(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0;
  const check = (name, cond, extra='') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
  const fresh = async () => { await page.goto(BASE); await page.waitForTimeout(150); };
  const out = async () => await page.locator('#output').innerText();
  const outHtml = async () => await page.locator('#output').innerHTML();
  const tick = async (sel) => { await page.check(sel); await page.waitForTimeout(30); };
  const count = (hay, needle) => hay.split(needle).length - 1;

  await fresh(); let o = await out(); let h = await outHtml();
  check('1 no age warning on load', (await page.locator('#alderWarning').innerText()) === '');
  check('1 CHC box Mirabella first', o.includes('Mirabella') && o.includes('Førstevalg'));
  check('1 stale names gone', !/Triquilar|Solia|Zelleta|~98/.test(o));
  check('1 collapsibles present', o.includes('Opstart') && o.includes('Glemte piller') && o.includes('Effektivitet og risiko'));
  check('1 NuvaRing VTE note', h.includes('6–12 mod 5–7'));

  await fresh(); await page.fill('#alder', '17'); o = await out();
  check('2 age17 LARC box', o.includes('foretrukket ved ung alder'));
  check('2 implant off-label <18', o.includes('18–40 år'));
  check('2 CHC also shown', o.includes('Mirabella'));

  await fresh(); await tick('input[name="praeferens"][value="larc"]'); o = await out();
  check('3 LARC pref shows CHC box it refers to', o.includes('se nedenfor') && o.includes('Mirabella'));

  await fresh(); await page.fill('#alder', '36'); await tick('#ryger'); o = await out();
  check('4 smoker 36 CHC excluded', o.includes('Rygning ved alder ≥ 35'));
  check('4 østrogenfri with Cerazette first', o.includes('Anbefaling: østrogenfri') && o.includes('Cerazette'));
  check('4 no Mirabella', !o.includes('Mirabella'));

  await tick('input[name="praeferens"][value="larc"]'); o = await out();
  check('5 LARC rows not duplicated', count(o, 'Nexplanon') === 1, 'count=' + count(o, 'Nexplanon'));

  await fresh(); await page.fill('#alder', '52'); o = await out();
  check('6 age 52 CHC excluded', o.includes('Alder ≥ 50 år'));
  check('6 ≥40 box', o.includes('Prævention fra 40 år') && o.includes('55 år'));

  await fresh(); await page.fill('#alder', '14'); o = await out();
  check('7 under 15 box', o.includes('Under 15 år') && o.includes('§ 17'));

  await fresh(); await tick('input[name="andet"][value="enzym"]'); o = await out();
  check('8 enzym CHC excluded', o.includes('Enzyminducerende medicin (nedsat effekt)'));
  check('8 enzym box', o.includes('28 dage'));
  check('8 no minipills', !o.includes('Cerazette') && !o.includes('Slinda'));
  check('8 Depo recommended', o.includes('Anbefalet (upåvirket af medicin)'));
  check('8 Nexplanon frarådes', o.includes('Frarådes'));

  await fresh(); await tick('input[name="andet"][value="lamotrigin"]'); o = await out();
  check('9 lamotrigin', o.includes('Lamotrigin (østrogen') && o.includes('neurolog'));

  await fresh(); await tick('input[name="andet"][value="kraftig"]'); o = await out(); h = await outHtml();
  check('10 kraftig box', o.includes('Kraftige eller smertefulde menstruationer'));
  check('10 blødningskalender nævnt uden link', h.includes('en blødningskalender') && !h.includes('bloedningskalender.html'));

  await fresh(); await tick('input[name="abs_chc"][value="famvte"]'); o = await out();
  check('11 famvte excludes CHC', o.includes('VTE hos forælder/søskende før 45 år'));

  // Emergency
  await fresh(); await tick('#nodPraevention'); o = await out();
  check('12 EC default rows', o.includes('Kobberspiral') && o.includes('ellaOne') && o.includes('1,5 mg (1 tablet)'));
  await page.fill('#bmiInput', '30'); o = await out();
  check('13 EC BMI 30 double dose', o.includes('3 mg (2 tabletter)') && o.includes('BMI > 26'));
  check('13 EC BMI box', o.includes('Forhøjet BMI'));
  await page.fill('#bmiInput', '');
  await tick('input[name="andet"][value="enzym"]'); o = await out();
  check('14 EC enzym no ella row', !o.includes('ellaOne (ulipristalacetat') && o.includes('dobbeltdosis pga. enzyminducerende'));
  await tick('input[name="nodtiming"][value="72to120"]'); o = await out();
  check('14 EC 72-120 enzym only kobber', o.includes('kobberspiral er eneste sikre') && !o.includes('ellaOne (ulipristalacetat'));
  await fresh(); await tick('#nodPraevention'); await tick('#amning'); o = await out();
  check('15 EC amning FSRH line', o.includes('FSRH (2025)'));
  await page.click('#copyBtn'); await page.waitForTimeout(150);
  let note = await page.evaluate(() => navigator.clipboard.readText());
  console.log('--- EC note ---\n' + note);
  check('15 EC journal note', note.startsWith('Nødprævention') && note.includes('under 24 timer') && note.includes('\nAmmer.'));

  await fresh(); await tick('input[name="abs_alle"][value="grav"]'); o = await out();
  check('16 grav u-hCG', o.includes('u-hCG'));
  await fresh(); await tick('input[name="abs_alle"][value="cancer"]'); o = await out();
  check('17 cancer red + kobber >99', o.includes('Al hormonel prævention frarådes') && o.includes('> 99 %'));

  await fresh(); await page.fill('#alder', '28'); await page.fill('#bmiInput', '24.5');
  await page.click('#copyBtn'); await page.waitForTimeout(150);
  note = await page.evaluate(() => navigator.clipboard.readText());
  console.log('--- regular note ---\n' + note);
  check('18 note first choice Mirabella', note.includes('Førstevalg: Mirabella (Levonorgestrel 100'));
  check('18 note BMI comma', note.includes('BMI 24,5'));
  await page.click('#copyFullBtn'); await page.waitForTimeout(150);
  const full = await page.evaluate(() => navigator.clipboard.readText());
  check('18 full text includes collapsed content', full.includes('EMA 2013') && full.includes('FSRH'));

  await fresh(); await page.fill('#alder', '150'); await page.click('#resetBtn');
  check('19 reset clears warning', (await page.locator('#alderWarning').innerText()) === '');

  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE); await m.waitForTimeout(150);
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  check('20 mobile width', sw <= 390, 'scrollWidth=' + sw);
  await m.locator('.box-green').first().screenshot({ path: SHOTS + 'praev_mobile.png' });
  await page.locator('#resultPanel').screenshot({ path: SHOTS + 'praev_desktop.png' });

  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails);
  await browser.close();
})();
