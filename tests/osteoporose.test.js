const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'osteoporose.html';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const fresh = async () => { await p.goto(BASE); await p.waitForTimeout(120); };
  const out = async () => p.locator('#output').innerText();
  const head = async () => p.locator('#output .box h3').first().innerText();
  const cb = (n, v) => p.check(`input[name="${n}"][value="${v}"]`);
  const T = async (v) => { await cb('dxa', 'ja'); await p.fill('#tscore', v); };

  await fresh(); let o = await out();
  check('1 default: DXA ikke indiceret', (await head()).startsWith('DXA er ikke indiceret'));
  check('1 no age warning', (await p.locator('#alderWarning').innerText()) === '');
  check('1 tscore disabled', await p.locator('#tscore').isDisabled());

  await cb('rf', 'ryger'); check('2 one RF -> no DXA', (await head()).startsWith('DXA er ikke'));
  await cb('rf', 'arv'); check('2 two RF -> DXA', (await head()) === 'Henvis til DXA-skanning');
  await fresh(); await cb('rf', 'prednisolon'); check('3 prednisolon -> DXA', (await head()) === 'Henvis til DXA-skanning');
  await fresh(); await cb('rf', 'aromatase'); o = await out(); check('3b aromatase -> DXA + DBCG', (await head()) === 'Henvis til DXA-skanning' && o.includes('DBCG'));
  await fresh(); await cb('brud', 'andet'); check('3c andet brud -> DXA', (await head()) === 'Henvis til DXA-skanning');

  await fresh(); await cb('brud', 'hofte'); o = await out();
  check('4 hoftebrud -> behandling uden DXA', (await head()) === 'Medicinsk behandling er indiceret' && o.includes('DXA før opstart'));
  check('4 alendronat 1. valg + instruktion', o.includes('Alendronat') && o.includes('1. valg') && o.includes('Sådan tages alendronat'));
  check('4 eGFR note when unknown', o.includes('Mål eGFR før opstart'));
  check('4 no M-komponent without spine', !o.includes('M-komponent'));
  check('4 no red denosumab box for default', !o.includes('Denosumab må ikke stoppes uden plan'));

  await fresh(); await cb('brud', 'ryg'); o = await out();
  check('5 rygbrud -> M-komponent', o.includes('M-komponent') && (await head()) === 'Medicinsk behandling er indiceret');
  check('5 no specialist for single spine', !o.includes('Henvis til specialist'));
  await cb('brud', 'ryg2'); o = await out();
  check('6 ≥2 ryg -> specialist anabol', o.includes('Henvis til specialist') && o.includes('teriparatid'));
  await fresh(); await cb('brud', 'rygny'); await T('-2.8'); o = await out();
  check('7 ny ryg T -2,8 -> no anabol', !o.includes('teriparatid'));
  await p.fill('#tscore', '-3.1'); o = await out();
  check('7b ny ryg T -3,1 -> anabol', o.includes('teriparatid'));

  await fresh(); await T('-4.2'); check('8 T -4,2 alone -> behandling', (await head()) === 'Medicinsk behandling er indiceret');
  await p.fill('#tscore', '-2.7'); o = await out(); check('9 T -2,7 no RF -> individuel + FRAX', (await head()).startsWith('Individuel vurdering') && o.includes('FRAX') && o.includes('Hvis der vælges behandling'));
  await cb('rf', 'fald'); check('10 T -2,7 + RF -> behandling', (await head()) === 'Medicinsk behandling er indiceret');
  await fresh(); await T('-2.6'); await cb('rf', 'ryger'); check('10b T -2,6 + ryger -> behandling', (await head()) === 'Medicinsk behandling er indiceret');
  await fresh(); await T('-1.5'); o = await out(); check('11 osteopeni -> ingen', (await head()) === 'Ingen indikation for medicinsk behandling' && o.includes('Osteopeni'));
  await cb('rf', 'prednisolon'); check('12 osteopeni + prednisolon -> behandling', (await head()) === 'Medicinsk behandling er indiceret');
  o = await out(); check('12 prednisolon note', o.includes('Glukokortikoid: bisfosfonat er førstevalg'));
  await fresh(); await T('-0.5'); await cb('rf', 'prednisolon'); o = await out(); check('13 normal + prednisolon -> rescan 6–12 mdr', o.includes('6–12 måneder') && o.includes('Normal knogletæthed'));
  await fresh(); await T('-1.8'); await cb('brud', 'andet'); check('14 osteopeni + andet brud -> individuel', (await head()).startsWith('Individuel vurdering'));

  // Præparatvalg
  await fresh(); await cb('brud', 'hofte'); await p.fill('#egfr', '32'); o = await out();
  check('15 eGFR 32 -> risedronat anbefalet, ingen alendronat-række', o.includes('Risedronat') && !/Alendronat\s*1\. valg/.test(o) && o.includes('bruges ikke under 35'));
  await cb('forhold', 'oraluegnet'); o = await out(); check('16 eGFR 32 + oral uegnet -> denosumab + advarsel', o.includes('Denosumab (Prolia)') && o.includes('må ikke stoppes uden plan'));
  await p.fill('#egfr', '25'); o = await out(); check('17 eGFR 25 -> specialist', o.includes('Henvis til specialist') && o.includes('renal osteodystrofi') && !o.includes('Valg af præparat'));
  await fresh(); await cb('brud', 'hofte'); await p.fill('#egfr', '60'); await cb('forhold', 'oralbivirk'); o = await out();
  check('18 oral gener -> zoledronsyre 2. valg, denosumab 3. valg', o.includes('Zoledronsyre (Aclasta)') && o.includes('2. valg') && o.includes('3. valg') && !o.includes('Sådan tages alendronat') && o.includes('Denosumab må ikke stoppes uden plan'));
  await fresh(); await cb('brud', 'hofte'); await p.fill('#alder', '55'); await cb('forhold', 'klimakteriegener'); o = await out();
  check('19 kvinde 55 m. gener -> MHT-række', o.includes('Hormonbehandling (MHT)'));
  await p.fill('#alder', '63'); o = await out(); check('19b 63 år -> ingen MHT-række', !o.includes('Hormonbehandling (MHT)'));
  await fresh(); await cb('brud', 'hofte'); await cb('rf', 'aromatase'); await cb('forhold', 'klimakteriegener'); o = await out();
  check('20 aromatase -> ingen MHT, DBCG-note', !o.includes('Hormonbehandling (MHT)') && o.includes('MHT er kontraindiceret'));
  await fresh(); await cb('brud', 'hofte'); await cb('forhold', 'tand'); o = await out(); check('21 tand -> før opstart', o.includes('tandlægeundersøgelse og nødvendig tandbehandling'));
  await fresh(); await cb('gruppe', 'mand'); await cb('brud', 'ryg'); o = await out(); check('22 mand -> testosteron', o.includes('testosteron'));
  await fresh(); await cb('gruppe', 'ung'); o = await out(); check('23 ung -> specialist først', (await head()) === 'Henvis til specialist');

  // Journal
  await fresh(); await p.fill('#alder', '71'); await cb('brud', 'hofte'); await p.fill('#egfr', '58');
  await p.click('#copyBtn'); await p.waitForTimeout(150);
  const note = await p.evaluate(() => navigator.clipboard.readText()); console.log('---\n' + note + '\n---');
  check('24 journal', note.includes('Postmenopausal kvinde, 71 år, DXA ikke foretaget, eGFR 58') && note.includes('Plan (tilpas): Alendronat') && note.includes('hoftebrud'));
  await p.click('#copyFullBtn'); await p.waitForTimeout(150);
  const full = await p.evaluate(() => navigator.clipboard.readText()); check('24 full text', full.includes('VALG AF PRÆPARAT') && full.includes('Alendronat (1. valg) — Bisfosfonat'));
  check('24 full text without valg text', !full.includes('Vælg til journal') && !full.includes('fravalgt efter drøftelse'));
  await p.check('#output input[name="valg"][value="zoledronsyre"]'); await p.click('#copyBtn'); await p.waitForTimeout(150);
  let vnote = await p.evaluate(() => navigator.clipboard.readText());
  check('24v valgt zoledronsyre', vnote.includes('Valgt behandling: Zoledronsyre (Aclasta)') && vnote.includes('Revurdering efter 3 år') && !vnote.includes('Alendronat'), vnote);
  await p.check('#output input[name="valg"][value="ingen"]'); await p.click('#copyBtn'); await p.waitForTimeout(150);
  vnote = await p.evaluate(() => navigator.clipboard.readText());
  check('24w fravalgt', vnote.includes('Medicinsk behandling fravalgt') && !vnote.includes('Plan (tilpas)'), vnote);
  await p.uncheck('input[name="brud"][value="hofte"]'); await p.waitForTimeout(100); await cb('brud', 'hofte'); await p.waitForTimeout(100);
  check('24x valg glemmes, når tabellen forsvinder', (await p.locator('#output input[name="valg"]:checked').count()) === 0);
  await p.fill('#alder', '200'); await p.click('#resetBtn'); check('25 reset', (await p.inputValue('#alder')) === '' && (await p.locator('#alderWarning').innerText()) === '');
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(BASE); await m.check('input[name="brud"][value="hofte"]'); await m.waitForTimeout(100);
  check('26 mobile no overflow', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.locator('#resultPanel').screenshot({ path: SHOTS + 'osteo_mobile.png' });
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
