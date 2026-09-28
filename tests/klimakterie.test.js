const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'index.html';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(ROOT).origin });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0;
  const check = (name, cond, extra='') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };

  async function fresh() { await page.goto(BASE); await page.waitForTimeout(150); }
  async function out() { return await page.locator('#output').innerText(); }
  async function setStatus(v) { await page.check(`input[name="status"][value="${v}"]`); }
  async function setUterus(v) { await page.check(`input[name="uterus"][value="${v}"]`); }
  async function sym(v, on=true) { const l = page.locator(`input[name="symptom"][value="${v}"]`); on ? await l.check() : await l.uncheck(); }

  // 1 default
  await fresh();
  let o = await out();
  check('1 default sequential', o.includes('sekventiel (cyklisk)'));
  check('1 Utrogestan 200 mg sequential', o.includes('Utrogestan 200 mg (2 × 100 mg kapsler) til natten i 12–14 dage'));
  check('1 Vivelle Dot 50 standard', o.includes('Vivelle Dot 50'));
  check('1 contraception shown (peri+uterus)', o.includes('MHT er ikke prævention'));
  check('1 no age warning on load', (await page.locator('#alderWarning').innerText()) === '');
  check('1 no Estradot', !o.includes('Estradot'));

  // 2 age 62 post, no risk boxes ticked
  await fresh();
  await page.fill('#alder', '62'); await setStatus('post');
  o = await out();
  check('2 low dose Vivelle Dot 25', o.includes('Vivelle Dot 25'));
  check('2 route lists age (no empty list)', o.includes('særligt pga.: Alder 62 år'), '');
  check('2 no "risikofaktor(er): ."', !o.includes(': .'));
  check('2 continuous Utrogestan 100', o.includes('Utrogestan 100 mg til natten dgl.'));
  check('2 no contraception (post, 62)', !o.includes('MHT er ikke prævention'));
  check('2 lav startdosis note', o.includes('Lav startdosis'));

  // 3 POI uterus
  await fresh();
  await page.fill('#alder', '34'); await setStatus('poi');
  o = await out();
  check('3 POI high dose patch', o.includes('Vivelle Dot 75–100'));
  check('3 POI Utrogestan 300 cyclic', o.includes('Utrogestan 300 mg (100 mg morgen + 200 mg til natten)'));
  check('3 POI Utrogestan 200 continuous', o.includes('Utrogestan 200 mg (2 × 100 mg kapsler) til natten dgl.'));
  check('3 POI contraception', o.includes('MHT er ikke prævention') && o.includes('Ved POI'));
  check('3 POI ESHRE diagnosis', o.includes('ESHRE 2024'));
  check('3 POI no MHRA risk box', !o.includes('MHRA'));

  // 4 POI no uterus
  await setUterus('nej');
  o = await out();
  check('4 POI no uterus -> no contraception', !o.includes('MHT er ikke prævention'));
  check('4 POI no uterus -> no Utrogestan', !o.includes('Utrogestan'));

  // 5 peri no uterus
  await fresh();
  await setUterus('nej');
  o = await out();
  check('5 peri hysterectomized -> no contraception', !o.includes('MHT er ikke prævention'));
  check('5 estrogen alone', o.includes('østrogen alene'));

  // 6 post age 47 uterus -> contraception; age 42 post no symptoms -> early menopause
  await fresh();
  await page.fill('#alder', '47'); await setStatus('post');
  o = await out();
  check('6a post 47 -> contraception', o.includes('MHT er ikke prævention'));
  await page.fill('#alder', '42'); await sym('vasomotor', false);
  o = await out();
  check('6b early menopause box', o.includes('Tidlig menopause (40–44 år)'));
  check('6b regime despite no symptoms', o.includes('kontinuerlig kombinationsbehandling'));
  check('6b no vasomotor caution in early menopause', !o.includes('Hedeture/svedeture er ikke markeret'));
  check('6b under-45 FSH note', o.includes('Under 45 år: mål FSH'));

  // 7 only GSM
  await fresh();
  await sym('vasomotor', false); await sym('gsm');
  o = await out();
  check('7 local estrogen', o.includes('lokal vaginal østrogen'));
  check('7 Ovestin + Estring names', o.includes('Ovestin') && o.includes('Estring') && !o.includes('Ovesterin'));

  // 8 cancer + vasomotor
  await fresh();
  await page.check('input[name="absolut"][value="cancer"]');
  o = await out();
  check('8 red box', o.includes('Systemisk hormonbehandling frarådes'));
  check('8 tamoxifen note', o.includes('paroxetin og fluoxetin'));
  check('8 Veoza shown', o.includes('Veoza'));
  await page.check('input[name="absolut"][value="lever"]');
  o = await out();
  check('8 lever -> no Veoza row', !o.includes('Veoza (fezolinetant)'));

  // 9 grav only
  await fresh();
  await page.check('input[name="absolut"][value="grav"]');
  o = await out();
  check('9 grav -> u-hCG', o.includes('u-hCG'));
  check('9 grav -> no nonhormonal table', !o.includes('Ikke-hormonel behandling'));

  // 10 nonhormonal preference + POI warning
  await fresh();
  await page.check('input[name="praeferens"][value="nonhormonal"]');
  o = await out();
  check('10 nonhormonal box', o.includes('Patienten ønsker ikke hormonbehandling'));
  check('10 no systemic regime', !o.includes('Anbefaling: sekventiel'));
  await setStatus('poi');
  o = await out();
  check('10 POI warning when declining', o.includes('Bemærk: POI'));

  // 11 only libido
  await fresh();
  await sym('vasomotor', false); await sym('libido');
  o = await out();
  check('11 no-vasomotor caution', o.includes('Hedeture/svedeture er ikke markeret'));
  check('11 libido box', o.includes('Om nedsat libido'));

  // 12 tidlVTE + tablet
  await fresh();
  await page.check('input[name="relativ"][value="tidlVTE"]');
  await page.check('input[name="praeferens"][value="tablet"]');
  o = await out();
  check('12 oral avoid w/ prior VTE', o.includes('bør oral MHT undgås'));
  check('12 relBox advice', o.includes('trombosecenter'));

  // 13 endometriosis no uterus
  await fresh();
  await setUterus('nej'); await page.check('input[name="andet"][value="endometriose"]');
  o = await out();
  check('13 endometriosis note', o.includes('Tidligere endometriose'));

  // 14 reset
  await fresh();
  await page.fill('#alder', '150');
  check('14a warning for 150', (await page.locator('#alderWarning').innerText()).length > 0);
  await page.click('#resetBtn');
  check('14b reset clears warning', (await page.locator('#alderWarning').innerText()) === '');
  check('14c reset clears age', (await page.inputValue('#alder')) === '');

  // 15 journal note
  await fresh();
  await page.fill('#alder', '53'); await setStatus('post'); await page.fill('#bmiInput', '31.5');
  await page.click('#copyBtn');
  await page.waitForTimeout(200);
  const note = await page.evaluate(() => navigator.clipboard.readText());
  console.log('--- journal note ---\n' + note + '\n---');
  check('15 note has regime', note.includes('Vurdering: kontinuerlig'));check('15 BMI uppercase', note.includes('BMI ≥ 30'));
  check('15 note has first choice', note.includes('Førstevalg: Transdermal estradiol + Utrogestan'));
  check('15 note BMI comma', note.includes('BMI 31,5'));
  await page.click('#copyFullBtn');
  await page.waitForTimeout(200);
  const full = await page.evaluate(() => navigator.clipboard.readText());
  check('15 full text includes collapsed risk content', full.includes('MHRA 2019'));
  check('15 full text includes dose table', full.includes('Standard — 50 mikrog.'));

  // 16 prevention page no warning on load
  await page.goto(ROOT + 'praevention.html'); await page.waitForTimeout(150);
  check('16 prevention: no age warning on load', (await page.locator('#alderWarning').innerText()) === '');

  // screenshots
  await fresh();
  await page.fill('#alder', '53'); await setStatus('post');
  await page.locator('#resultPanel').screenshot({ path: SHOTS + 'hrt_result.png' });
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE); await m.waitForTimeout(150);
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  check('17 mobile no horizontal overflow', sw <= 390, 'scrollWidth=' + sw);
  await m.locator('#resultPanel').screenshot({ path: SHOTS + 'hrt_mobile_result.png' });

  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails);
  await browser.close();
})();
