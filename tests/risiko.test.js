const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'risiko.html';
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
  const card = async (title) => { const c = page.locator('.risk-card', { has: page.locator('h3', { hasText: new RegExp('^' + title + '$') }) }); return (await c.count()) ? await c.innerText() : null; };
  const chip = async (title) => { const t = await card(title); return t ? t.split('\n')[1] : null; };
  const rf = async (v) => page.check(`input[name="rf"][value="${v}"]`);

  await fresh(); let o = await out();
  check('1 no age warning on load', (await page.locator('#alderWarning').innerText()) === '');
  check('1 breast 20 extra, 83/1000', o.includes('ca. 83 af 1.000') && o.includes('ca. 20 ekstra'));
  check('1 breast moderat', (await chip('Brystkræft')) === 'Moderat ekstra risiko', await chip('Brystkræft'));
  check('1 VTE lav (transdermal)', (await chip('Blodpropper i vener \\(VTE\\)')) === 'Lav ekstra risiko');
  check('1 endometrium lav (kontinuerlig)', (await chip('Endometriecancer')) === 'Lav ekstra risiko');
  check('1 summary moderat', o.includes('Samlet: moderat ekstra risiko'));
  check('1 icon array 1000 cells', (await page.locator('.ia-cell').count()) === 1000);
  check('1 icon array 63 base + 20 extra', (await page.locator('.ia-cell.ia-base').count()) === 63 && (await page.locator('.ia-cell.ia-extra').count()) === 20);
  check('1 age prompt', o.includes('Angiv alder'));

  await fresh(); await page.check('input[name="uterus"][value="nej"]'); o = await out();
  check('2 regime field hidden', await page.locator('#regimeField').isHidden());
  check('2 estrogen alone 5 extra', o.includes('ca. 5 ekstra') && (await chip('Brystkræft')) === 'Lav ekstra risiko');
  check('2 no endometrium card', (await card('Endometriecancer')) === null);

  await fresh(); await page.check('input[name="regime"][value="sekventiel"]'); await page.check('input[name="varighed"][value="10"]'); o = await out();
  check('3 sequential 10y 28 extra', o.includes('ca. 28 ekstra') && (await page.locator('.ia-cell.ia-extra').count()) === 28);
  check('3 endometrium moderat', (await chip('Endometriecancer')) === 'Moderat ekstra risiko');
  check('3 reduce: switch to continuous', o.includes('Skift til kontinuerlig kombineret behandling'));
  check('3 10y Utrogestan note', o.includes('dokumenteret i ca. 5 år'));

  await fresh(); await page.check('input[name="vej"][value="oral"]'); o = await out();
  check('4 oral combined VTE 5–10', o.includes('ca. 5–10 ekstra pr. 1.000') && (await chip('Blodpropper i vener \\(VTE\\)')) === 'Moderat ekstra risiko');
  check('4 oral stroke +3', o.includes('ca. 3 ekstra pr. 1.000'));
  await rf('ryger'); o = await out();
  check('4 oral + smoker -> VTE hoej + switch', (await chip('Blodpropper i vener \\(VTE\\)')).startsWith('Høj') && o.includes('skift til transdermal'));
  check('4 summary red', o.includes('Samlet: høj risiko'));

  await fresh(); await rf('tidlVTE'); o = await out();
  check('5 prior VTE transdermal -> hoej + trombosecenter', (await chip('Blodpropper i vener \\(VTE\\)')).startsWith('Høj') && o.includes('trombosecenter'));

  await fresh(); await rf('brca'); o = await out();
  check('6 BRCA -> breast hoej + CanRisk', (await chip('Brystkræft')).startsWith('Høj') && o.includes('CanRisk'));

  await fresh(); await page.fill('#alder', '62'); o = await out();
  check('7 age 62 stroke baseline 14', o.includes('ca. 14 af 1.000') && o.includes("60'erne"));
  check('7 age 62 heart moderat', (await chip('Iskæmisk hjertesygdom')) === 'Moderat ekstra risiko');
  check('7 no dementia <65', (await card('Demens')) === null);
  await page.fill('#alder', '67'); o = await out();
  check('8 age 67 dementia card', (await card('Demens')) !== null);

  await fresh(); await page.fill('#alder', '42'); o = await out();
  check('9 early menopause notes', o.includes('Menopause før 45 år') && o.includes('gælder først brug efter ca. 51 år'));

  await fresh(); await rf('hjertekar'); o = await out();
  check('10 CVD -> stroke & heart hoej', (await chip('Iskæmisk apopleksi')).startsWith('Høj') && (await chip('Iskæmisk hjertesygdom')).startsWith('Høj'));

  await fresh(); await rf('endorisiko'); o = await out();
  check('11 endorisiko -> endometrium moderat', (await chip('Endometriecancer')) === 'Moderat ekstra risiko');
  await fresh(); await page.fill('#bmiInput', '33'); o = await out();
  check('11b BMI 33 -> VTE & breast mods', o.includes('BMI 33:') && o.includes('ca. 2–3 gange') && o.includes('Vægttab'));

  await fresh(); await rf('osteo'); o = await out();
  check('12 osteo gevinst mod', o.includes('knoglegevinsten vejer tungere'));

  await fresh(); await page.fill('#alder', '53'); await page.fill('#bmiInput', '26.5');
  await page.click('#copyBtn'); await page.waitForTimeout(150);
  const note = await page.evaluate(() => navigator.clipboard.readText());
  console.log('--- journal note ---\n' + note + '\n---');
  check('13 note content', note.includes('53 år, BMI 26,5') && note.includes('Brystkræft: ca. 20 ekstra') && note.includes('[moderat ekstra risiko]'));
  await page.click('#copyFullBtn'); await page.waitForTimeout(150);
  const full = await page.evaluate(() => navigator.clipboard.readText());
  check('13 full text has chips', full.includes('BRYSTKRÆFT — Moderat ekstra risiko'));

  await page.fill('#alder', '120'); await page.click('#resetBtn');
  check('14 reset', (await page.inputValue('#alder')) === '' && (await page.locator('#alderWarning').innerText()) === '');

  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE); await m.waitForTimeout(150);
  check('15 mobile width', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.locator('.risk-card').first().screenshot({ path: SHOTS + 'risiko_mobile_card.png' });
  await page.locator('#resultPanel').screenshot({ path: SHOTS + 'risiko_desktop.png' }); await m.locator('.nnh-box').screenshot({ path: SHOTS + 'risiko_nnh_mobile.png' });

  await page.goto(BASE.replace('risiko.html', 'index.html')); await page.waitForTimeout(150);
  await page.check('input[name="status"][value="post"]');
  await page.click('#copyFullBtn'); await page.waitForTimeout(150);
  const hrt = await page.evaluate(() => navigator.clipboard.readText());
  check('16 HRT tool links to risk tool', hrt.includes('den individuelle risikovurdering') && (await page.locator('a[href="risiko.html"], a[href*="CehJoNuD2wCAB8gkWb2h7k"]').count()) >= 1);


  // NNH
  await fresh(); o = await out();
  check('N1 NNH table present', o.includes('Number needed to harm (NNH)') && o.includes('Jo højere tal, jo sjældnere skade'));
  check('N2 breast continuous 5y NNH 50', (await card('Brystkræft')).includes('NNH ≈ 50'));
  check('N3 summary worst = breast 50', o.includes('Største ekstra risiko: brystkræft — NNH ≈ 50'));
  check('N4 transdermal VTE NNH not relevant', (await card('Blodpropper i vener \\(VTE\\)')).includes('NNH: –'));
  check('N5 ovary NNH 1.000–2.000', (await card('Æggestokkræft')).includes('NNH ≈ 1.000–2.000') && !o.includes('≈ ≥'));
  await page.check('input[name="varighed"][value="10"]'); o = await out();
  check('N6 10y continuous NNH 25', (await card('Brystkræft')).includes('NNH ≈ 25'));
  await page.check('input[name="regime"][value="sekventiel"]'); o = await out();
  check('N7 10y sequential NNH 35', (await card('Brystkræft')).includes('NNH ≈ 35'));
  check('N8 sequential endometrium NNH ≥ 200, no ≈≥', (await card('Endometriecancer')).includes('NNH ≥ 200') && !o.includes('≈ ≥') && o.includes('Million Women Study'));
  await fresh(); await page.check('input[name="uterus"][value="nej"]'); o = await out();
  check('N9 estrogen alone NNH 200', (await card('Brystkræft')).includes('NNH ≈ 200'));
  await page.check('input[name="vej"][value="oral"]'); o = await out();
  check('N10 oral E-alone VTE NNH 250–1.000', (await card('Blodpropper i vener \\(VTE\\)')).includes('NNH ≈ 250–1.000'));
  await fresh(); await page.check('input[name="vej"][value="oral"]'); o = await out();
  check('N11 oral combined VTE NNH 100–200', (await card('Blodpropper i vener \\(VTE\\)')).includes('NNH ≈ 100–200'));
  check('N12 oral stroke 50s NNH 330', (await card('Iskæmisk apopleksi')).includes('NNH ≈ 330'));
  check('N13 worst still breast (50 < 100)', o.includes('Største ekstra risiko: brystkræft — NNH ≈ 50'));
  await page.fill('#alder', '62'); o = await out();
  check('N14 oral stroke 60s NNH 250', (await card('Iskæmisk apopleksi')).includes('NNH ≈ 250'));
  await page.click('#copyBtn'); await page.waitForTimeout(150);
  let n2 = await page.evaluate(() => navigator.clipboard.readText());
  check('N15 journal has NNH', n2.includes('NNH ca. 50') && n2.includes('NNH ca. 100–200'));
  await page.click('#copyFullBtn'); await page.waitForTimeout(150);
  let f2 = await page.evaluate(() => navigator.clipboard.readText());
  check('N16 full text has NNH table + strips', f2.includes('NUMBER NEEDED TO HARM') && f2.includes('Brystkræft — ≈ 50') && f2.includes('NNH ≈ 50: Behandles 50 kvinder'));
  // Audit-rettelser
  await fresh(); await rf('brca'); o = await out();
  check('A1 BRCA -> no breast NNH, worst not breast', (await card('Brystkræft')).includes('NNH: –') && !o.includes('Største ekstra risiko: brystkræft'));
  await fresh(); await rf('fambryst'); o = await out();
  check('A2 fambryst -> NNH nærmere 30', (await card('Brystkræft')).includes('NNH formentlig nærmere 30'));
  await fresh(); await page.fill('#alder', '62'); await page.check('input[name="vej"][value="oral"]'); o = await out();
  check('A3 oral 62 no vascular rf -> stroke moderat + dose note', (await chip('Iskæmisk apopleksi')) === 'Moderat ekstra risiko' && (await card('Iskæmisk apopleksi')).includes('over 1 mg/døgn'));
  await rf('htn'); o = await out();
  check('A4 oral + htn -> stroke hoej', (await chip('Iskæmisk apopleksi')).startsWith('Høj'));
  await fresh(); await page.check('input[name="vej"][value="oral"]'); o = await out();
  check('A5 oral VTE Danish 2026 note', (await card('Blodpropper i vener \\(VTE\\)')).includes('1.050 kvinder pr. behandlingsår'));
  await fresh(); o = await out();
  check('A6 transdermal: no Danish oral note, mortality line', !o.includes('1.050 kvinder') && o.includes('Samlet dødelighed er ikke øget'));
  await fresh(); await page.fill('#alder', '67'); o = await out();
  check('A7 dementia combined NNH 85', (await card('Demens')).includes('NNH ≈ 85') && (await card('Demens')).includes('WHIMS'));
  await page.check('input[name="uterus"][value="nej"]'); o = await out();
  check('A8 dementia E-alone no NNH', (await card('Demens')).includes('NNH: –') && (await card('Demens')).includes('ikke-signifikant'));
  await fresh(); o = await out();
  check('A9 endometrium baseline 5 (SmPC)', (await card('Endometriecancer')).includes('ca. 5 af 1.000') && (await card('Endometriecancer')).includes('5–55 ekstra'));
  await page.check('input[name="varighed"][value="10"]'); o = await out();
  check('A10 Utrogestan note conditional + ovary 10y note', (await card('Endometriecancer')).includes('med mikroniseret progesteron') && (await card('Æggestokkræft')).includes('Ved 10 års brug'));
  await fresh(); await page.fill('#alder', '42'); o = await out();
  check('A11 early menopause NNH caveat', (await card('Brystkræft')).includes('gælder først brug efter ca. 51 år'));
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails);
  await browser.close();
})();
