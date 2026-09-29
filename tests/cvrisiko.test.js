const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'hjerte/cvrisiko.html';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const fresh = async () => { await p.goto(BASE); await p.waitForTimeout(120); };
  const out = async () => p.locator('#output').innerText();
  const head = async () => p.locator('#output .box h3').first().innerText();
  const r = (n, v) => p.check(`input[name="${n}"][value="${v}"]`);
  const fill = async (o) => { for (const [k, v] of Object.entries(o)) await p.fill('#' + k, String(v)); };

  await fresh(); let o = await out();
  check('1 empty -> prompt', (await head()) === 'Indtast patientens data' && o.includes('Mangler: alder, systolisk blodtryk, totalkolesterol, HDL'));
  // Publicerede regneeksempler (SCORE2 supplement table 4; SCORE2-OP supplement table 3; SCORE2-Diabetes R-dokumentation)
  await r('koen', 'mand'); await r('ryger', 'ja'); await fill({ alder: 50, sbp: 140, tchol: 6.3, hdl: 1.4 });
  check('2 SCORE2 mand 50 ryger -> 6,3 %', (await head()) === '10-års risiko: 6,3 % (SCORE2)', await head());
  o = await out(); check('2 over DCS 40–59 threshold 5 %', o.includes('Over DCS\' tærskel for 40–59 år (5 %)'));
  check('2 rygestop estimate shown', o.includes('Ved rygestop:'));
  await r('koen', 'kvinde'); check('3 SCORE2 kvinde -> 4,3 %', (await head()) === '10-års risiko: 4,3 % (SCORE2)', await head());
  o = await out(); check('3 under threshold -> green text', o.includes('Under DCS\' tærskel'));
  await fresh(); await r('koen', 'mand'); await r('ryger', 'ja'); await fill({ alder: 75, sbp: 140, tchol: 5.5, hdl: 1.3 });
  check('4 SCORE2-OP mand 75 ryger -> 18,6 %', (await head()) === '10-års risiko: 18,6 % (SCORE2-OP)', await head());
  await r('koen', 'kvinde'); check('4b SCORE2-OP kvinde -> 15,2 %', (await head()) === '10-års risiko: 15,2 % (SCORE2-OP)', await head());
  await fresh(); await r('koen', 'mand'); await fill({ alder: 60, sbp: 140, tchol: 5.5, hdl: 1.3 }); await r('diabetes', 'ja');
  o = await out(); check('5 diabetes requires extra fields', o.includes('alder ved diabetesdiagnose, HbA1c, eGFR'));
  await fill({ dmAlder: 60, hba1c: 50, egfr: 90 });
  check('5 SCORE2-Diabetes -> 8,4 %', (await head()) === '10-års risiko: 8,4 % (SCORE2-Diabetes)', await head());
  o = await out(); check('5 ESC 2023 moderat', o.includes('Moderat risiko (ESC 2023)') && o.includes('praktisk talt alle med type 2-diabetes over 40 år') && o.includes('LDL < 2,6 mmol/l (moderat risiko'));
  await p.check('input[name="organ"]'); o = await out(); check('6 organ damage -> no SCORE2, LDL <1,8', (await head()) === 'Høj risiko uden beregning' && o.includes('LDL < 1,8'));
  // Udelad
  await fresh(); await p.check('input[name="udelad"][value="ascvd"]'); o = await out();
  check('7 ASCVD -> sekundær, LDL <1,4', (await head()).startsWith('Kendt hjerte-kar-sygdom') && o.includes('LDL < 1,4 mmol/l og mindst 50 % reduktion'));
  // Over 75
  await fresh(); await fill({ alder: 62, sbp: 150, tchol: 6, hdl: 1.2 }); o = await out();
  check('7b 62 år 5,x % -> under DCS but ESC high -> amber', o.includes('ESC kategoriserer dog risikoen som høj') && (await p.locator('#output .box').first().getAttribute('class')).includes('box-amber'), (await head()));
  await fresh(); await fill({ alder: 80, sbp: 150, tchol: 5, hdl: 1.5 }); o = await out(); check('8 80 år -> individuelt', o.includes('Over 75 år har DCS ingen fast tærskel'));
  // Enkeltfaktor
  await fresh(); await fill({ alder: 45, sbp: 120, tchol: 8.5, hdl: 1.3 }); o = await out(); check('9 TC 8,5 -> FH-flag', o.includes('overvej familiær hyperkolesterolæmi'));
  await fill({ tchol: 5, sbp: 185 }); o = await out(); check('9b SBP 185 -> behandling uanset', o.includes('behandling uanset beregnet risiko'));
  // Effekt
  await fresh(); await r('koen', 'mand'); await r('ryger', 'ja'); await fill({ alder: 60, sbp: 150, tchol: 6.5, hdl: 1.1, ldl: 4 });
  const risk = parseFloat((await head()).match(/([\d,]+) %/)[1].replace(',', '.'));
  o = await out();
  const rr = Math.pow(0.78, 4 * 0.35); const nnt = 100 / (risk * (1 - rr));
  const rn = (x) => (x < 100 ? Math.max(1, Math.round(x / 5) * 5) : Math.round(x / 10) * 10);
  check('10 statin moderat NNT', o.includes(`NNT ≈ ${rn(nnt)}`), `risk ${risk} expect ${rn(nnt)} :: ${o.match(/NNT ≈ \d+/)}`);
  check('10 expected LDL 2,6', o.includes('Forventet LDL med valgt statin: ca. 2,6 mmol/l'));
  check('10 icon array', (await p.locator('.ia-saved.ia-cell').count()) > 0);
  await r('statin', 'hoej'); await fill({ bpdrop: 10 }); o = await out();
  const rr2 = Math.pow(0.78, 2) * Math.pow(0.9, 2); check('11 høj + BT -10 NNT', o.includes(`NNT ≈ ${rn(100 / (risk * (1 - rr2)))}`), o.match(/NNT ≈ \d+/)?.[0]);
  await r('statin', 'ingen'); await fill({ bpdrop: 0 }); o = await out(); check('12 no treatment -> no effect card', !o.includes('Effekt af behandling over 10 år'));
  await r('statin', 'moderat'); await p.fill('#ldl', ''); o = await out();
  // non-HDL 6,5 − 1,1 = 5,4 → LDL-skøn 4,7; moderat: −1,6 mmol/l
  check('13 no LDL -> skøn fra non-HDL', o.includes('skønnet til ca. 4,7 mmol/l') && o.includes('LDL −1,6 mmol/l, skønnet'), o.match(/LDL −[\d,]+ mmol\/l[^)]*/)?.[0]);
  await r('statin', 'hoej'); o = await out(); check('13b skøn skelner intensitet', o.includes('LDL −2,4 mmol/l, skønnet'));
  await r('statin', 'moderat'); await fill({ bpdrop: -10 }); o = await out(); check('13c negativ BT-sænkning ignoreres', !o.includes('blodtryk −-'));
  // Validering
  await fresh(); await fill({ alder: 30, sbp: 120, tchol: 5, hdl: 1.2 }); o = await out(); check('14 age 30 -> warning + prompt', (await p.locator('#alderWarning').innerText()).includes('40–89') && (await head()) === 'Indtast patientens data');
  await fill({ alder: 55, hdl: 6 }); o = await out(); check('15 HDL > TC -> error', o.includes('HDL kan ikke være større end totalkolesterol'));
  await fresh(); await fill({ alder: 55, sbp: 14, tchol: 5, hdl: 1.2 }); o = await out(); check('15b SBP 14 -> plausibilitetsfejl', (await head()) === 'Indtast patientens data' && o.includes('uden for det plausible område'));
  await fill({ sbp: 140, tchol: 220 }); o = await out(); check('15c kolesterol i mg/dl -> fejl', o.includes('Totalkolesterol 220 mmol/l er uden for det plausible område'));
  // Diabetes ≥ 70: SCORE2-OP med diabetes, statin som udgangspunkt
  await fresh(); await fill({ alder: 72, sbp: 140, tchol: 5, hdl: 1.3 }); await r('diabetes', 'ja'); o = await out();
  check('15d diabetes 72 år -> SCORE2-OP + note', (await head()).includes('SCORE2-OP') && o.includes('SCORE2-Diabetes gælder kun 40–69 år'));
  // Hypertension-indikation uanset risiko
  await fresh(); await fill({ alder: 45, sbp: 150, tchol: 5, hdl: 1.5 }); o = await p.locator('#output').textContent();
  check('15e hypertension -> behandling uanset risiko', o.includes('medicinsk behandling anbefales uanset beregnet risiko') && o.includes('bekræft med hjemme- eller døgnblodtryk'));
  // Enkeltfaktor lipid -> LDL-mål < 1,8
  await fresh(); await fill({ alder: 45, sbp: 120, tchol: 8.5, hdl: 1.3, ldl: 5.2 }); o = await out();
  check('15f LDL > 4,9 -> LDL-mål < 1,8', o.includes('LDL < 1,8 mmol/l og mindst 50 % reduktion'));
  check('15g uden for skemaernes område -> ekstrapolationsnote', o.includes('modellen ekstrapolerer'));
  // Organskade + CKD-noter
  await fresh(); await p.check('input[name="udelad"][value="ckd"]'); o = await out(); check('15h CKD -> note om eGFR < 30', o.includes('eGFR under 30'));
  // Journal
  await fresh(); await r('koen', 'mand'); await r('ryger', 'ja'); await fill({ alder: 50, sbp: 140, tchol: 6.3, hdl: 1.4, ldl: 4.2 });
  await p.click('#copyBtn'); await p.waitForTimeout(150); const note = await p.evaluate(() => navigator.clipboard.readText()); console.log('---\n' + note + '\n---');
  check('16 journal', note.includes('Mand, 50 år, ryger, systolisk BT 140') && note.includes('10-års risiko: 6,3 % (SCORE2)') && note.includes('NNT ca.') && note.includes('Ved rygestop'));
  await p.click('#copyFullBtn'); await p.waitForTimeout(150); const full = await p.evaluate(() => navigator.clipboard.readText());
  check('16 full text', full.includes('LIPIDSÆNKENDE BEHANDLING') && full.includes('BLODTRYK'));
  await p.click('#resetBtn'); check('17 reset', (await p.inputValue('#alder')) === '' && (await head()) === 'Indtast patientens data');
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(BASE);
  for (const [k, v] of Object.entries({ alder: 62, sbp: 150, tchol: 6, hdl: 1.2, ldl: 4 })) await m.fill('#' + k, String(v)); await m.waitForTimeout(100);
  check('18 mobile no overflow', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.locator('#resultPanel').screenshot({ path: SHOTS + 'cvrisiko_mobile.png' });
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
