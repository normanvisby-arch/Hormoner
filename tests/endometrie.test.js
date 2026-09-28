const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'index.html';
const ORIGIN = new URL(BASE).origin;
(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0;
  const check = (n, c, x='') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const fresh = async () => { await page.goto(BASE); await page.waitForTimeout(150); };
  const out = async () => await page.locator('#output').innerText();
  const full = async () => { await page.click('#copyFullBtn'); await page.waitForTimeout(120); return await page.evaluate(() => navigator.clipboard.readText()); };
  const ut = async (v) => page.check(`input[name="uterus"][value="${v}"]`);

  await fresh(); await ut('ablation'); let o = await out();
  check('ablation -> combined regimen', o.includes('Utrogestan') && o.includes('sekventiel'));
  check('ablation -> Endometriet box', o.includes('Endometrieablation') && o.includes('aldrig østrogen alene'));
  check('ablation -> contraception still shown', o.includes('MHT er ikke prævention'));

  await fresh(); await ut('delvis'); o = await out();
  check('subtotal -> combined + 3-month test', o.includes('Subtotal hysterektomi') && o.includes('3 måneder som test') && o.includes('Utrogestan'));
  check('subtotal -> no contraception', !o.includes('MHT er ikke prævention'));

  await fresh(); await ut('nej'); o = await out();
  check('total -> estrogen alone, no Endometriet box', o.includes('østrogen alene') && !o.includes('Endometriet'));
  await page.check('input[name="andet"][value="endometriose"]'); o = await out();
  check('total + endometriose -> note', o.includes('Tidligere endometriose'));
  await ut('delvis'); o = await out();
  check('subtotal + endometriose -> no redundant note', !o.includes('Tidligere endometriose:'));

  await fresh(); await page.check('input[name="andet"][value="endorisiko"]'); o = await out();
  check('endorisiko -> risk note', o.includes('Øget risiko for endometriecancer') && o.includes('Lynch'));
  await fresh(); await page.fill('#bmiInput', '32'); o = await out();
  check('BMI 32 -> risk note with BMI', o.includes('Øget risiko for endometriecancer') && o.includes('BMI ≥ 30 (indtastet: 32)'));
  await ut('nej'); o = await out();
  check('BMI 32 + total hyst -> no endometrial note', !o.includes('Øget risiko for endometriecancer'));

  await fresh(); await page.check('input[name="absolut"][value="hyperplasi"]'); o = await out();
  check('hyperplasi -> red box', o.includes('Systemisk hormonbehandling frarådes') && o.includes('atypi'));
  await fresh(); await page.check('input[name="absolut"][value="cancer"]'); o = await out();
  check('cancer -> tamoxifen endometrium line', o.includes('blødning under tamoxifen skal altid udredes'));

  await fresh(); await page.check('input[name="status"][value="post"]'); o = await out();
  check('tibolon endometrial warning', o.includes('Øget risiko for endometriecancer i observationelle studier') && o.includes('sidste valg'));
  check('progestogen box: 12 dage + 5 år', o.includes('mindst 12 dage') && o.includes('ca. 5 år'));
  check('follow-up switch advice', o.includes('Skift fra sekventiel til kontinuerlig'));
  let f = await full();
  check('risk box Mørch RR', f.includes('Mørch 2016') && f.includes('RR 1,0') && f.includes('RR 2,1'));
  check('vaginal estrogen wording corrected', !f.includes('ingen kendt øget risiko') && f.includes('formentlig skyldes øget udredning'));
  check('continuous regime highlighted in endo list', f.includes('Kontinuerlig kombineret: ingen øget risiko (RR 1,0) ← aktuelt regime'));

  await fresh(); o = await out();
  check('peri box: plan switch', o.includes('Planlæg skift til kontinuerlig'));

  await fresh(); await page.fill('#alder', '34'); await page.check('input[name="status"][value="poi"]'); await ut('ablation'); o = await out();
  check('POI + ablation -> progesterone + Endometriet', o.includes('Utrogestan 300 mg') && o.includes('Endometrieablation'));

  await fresh(); await ut('ablation'); await page.click('#copyBtn'); await page.waitForTimeout(120);
  const note = await page.evaluate(() => navigator.clipboard.readText());
  check('journal note uterus label', note.includes('uterus bevaret (endometrieablation)'));

  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails);
  await browser.close();
})();
