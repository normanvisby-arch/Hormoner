const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'diabetes/behandling.html';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const fresh = async () => { await p.goto(BASE); await p.waitForTimeout(120); };
  const out = async () => p.locator('#output').innerText();
  const head = async (i = 0) => p.locator('#output .box h3').nth(i).innerText();
  const cb = (n, v) => p.check(`input[name="${n}"][value="${v}"]`);
  const fill = async (o) => { for (const [k, v] of Object.entries(o)) await p.fill('#' + k, String(v)); };
  const rec = async () => p.$$eval('#output tr', (trs) => trs.filter((tr) => tr.querySelector('.tag-recommend')).map((tr) => tr.cells[0].childNodes[0].textContent.trim()));
  const note = async () => { await p.click('#copyBtn'); await p.waitForTimeout(150); return p.evaluate(() => navigator.clipboard.readText()); };

  await fresh(); let o = await out();
  check('1 tom -> start metformin', (await head(2)).includes('Start metformin') && (await rec()).includes('Metformin'));
  check('1 mål < 53 som standard', (await head()).startsWith('HbA1c-mål: < 53'));
  await fill({ varighed: 1, hba1c: 50, alder: 55 }); check('2 nyopdaget -> mål < 48', (await head()).startsWith('HbA1c-mål: < 48'));
  await fill({ hba1c: 72 }); check('2b HbA1c 72 -> ikke < 48', (await head()).startsWith('HbA1c-mål: < 53'));
  await cb('forhold', 'skroebelig'); check('2c skrøbelig -> < 64–69', (await head()).startsWith('HbA1c-mål: < 64–69'));
  await fresh(); await cb('organ', 'ascvd'); o = await out();
  check('3 ASCVD uden metformin -> metformin + SGLT-2 samtidig', (await rec()).includes('Metformin') && (await rec()).includes('Empagliflozin 10 mg') && o.includes('uafhængigt af HbA1c'));
  check('3 mål < 58 ved ASCVD', (await head()).startsWith('HbA1c-mål: < 58'));
  await cb('beh', 'metformin'); check('4 på metformin + ASCVD -> SGLT-2 (organ)', (await head(2)).includes('SGLT-2-hæmmer (organbeskyttelse)'));
  await cb('kan', 'sglt2'); check('4b SGLT-2 kan ikke -> GLP-1 organ', (await head(2)).includes('GLP-1-receptoragonist (organbeskyttelse)') && (await rec()).includes('Semaglutid s.c. (Ozempic)'));
  await fresh(); await cb('beh', 'metformin'); await fill({ egfr: 18, hba1c: 55 }); o = await out();
  check('5 eGFR 18 -> stop metformin, GLP-1 (SGLT2 < 20)', o.includes('seponér metformin') && (await head(2)).includes('GLP-1'), await head(2));
  await fill({ egfr: 38, uacr: 120 }); o = await out();
  check('5b eGFR 38 + albuminuri -> SGLT-2 organ + ACE/ARB-note + maks 1000 mg', (await head(2)).includes('SGLT-2-hæmmer (organbeskyttelse)') && o.includes('ACE-hæmmer eller angiotensin II-receptorblokker') && o.includes('maks. 1.000 mg'));
  // Glykæmisk trappe
  await fresh(); await cb('beh', 'metformin'); await fill({ hba1c: 50, varighed: 8, egfr: 80 }); o = await out();
  check('6 i mål -> fortsæt', (await head(2)).includes('I mål'));
  await fill({ hba1c: 60 }); check('6b over mål -> SGLT-2 før GLP-1', (await head(2)).includes('Tilføj SGLT-2-hæmmer') && (await rec()).includes('Empagliflozin 10 mg'));
  await cb('beh', 'sglt2'); check('6c + SGLT-2 -> GLP-1', (await head(2)).includes('Tilføj GLP-1') && (await rec()).includes('Semaglutid s.c. (Ozempic)'));
  await cb('beh', 'glp1'); check('6d + GLP-1 -> basalinsulin; SU nedprioriteret', (await head(2)).includes('basalinsulin') && (await out()).includes('Nedprioriteret'));
  await cb('forhold', 'hypo'); await p.uncheck('input[name="beh"][value="glp1"]'); await cb('kan', 'glp1');
  check('6e hypo + GLP-1 ikke mulig -> DPP-4 (linagliptin)', (await head(2)).includes('DPP-4') && (await rec()).includes('Linagliptin 5 mg (Trajenta)'));
  await fresh(); await cb('beh', 'metformin'); await cb('beh', 'su'); await cb('forhold', 'hypo'); await fill({ hba1c: 45 });
  check('7 lavt HbA1c på SU + hypo -> nedtrapning', (await out()).includes('Overvej nedtrapning'));
  await fresh(); await fill({ hba1c: 80 }); check('8 HbA1c 80 -> insulin/GAD-note', (await out()).includes('GAD-antistoffer'));
  await fill({ hba1c: 7 }); check('8b HbA1c 7 -> % advarsel', (await p.locator('#labWarning').innerText()).includes('%'));
  // Audit V8: hjertesvigt på GLP-1 -> SGLT-2 alligevel
  await fresh(); await cb('beh', 'metformin'); await cb('beh', 'glp1'); await cb('organ', 'hs'); await fill({ egfr: 70, hba1c: 50 });
  check('8c HF på GLP-1 -> tilføj SGLT-2', (await head(2)).includes('SGLT-2-hæmmer (organbeskyttelse)'), await head(2));
  await p.uncheck('input[name="organ"][value="hs"]'); await cb('organ', 'ascvd');
  check('8d ASCVD på GLP-1 -> ikke tvungen SGLT-2', !(await head(2)).includes('organbeskyttelse'), await head(2));
  // Audit V9: allerede insulin
  await fresh(); for (const k of ['metformin', 'sglt2', 'glp1', 'insulin']) await cb('beh', k);
  await fill({ hba1c: 70, egfr: 80 }); o = await out();
  check('8e på insulin -> optitrér, ikke "tilføj basalinsulin"', (await head(2)).includes('Optitrér insulin') && !o.includes('Tilføj basalinsulin') && o.includes('prandial insulin'), await head(2));
  // Audit V10: Rybelsus ny formulering
  await fresh(); await cb('beh', 'metformin'); await cb('beh', 'sglt2'); await fill({ hba1c: 62, egfr: 80 });
  check('8f Rybelsus 1,5 mg ny formulering', (await out()).includes('1,5 mg i 30 dage, derefter 4 mg'));
  // Audit V11: eGFR mangler
  await fresh(); check('8g eGFR mangler -> note', (await out()).includes('eGFR mangler'));
  await fill({ egfr: 80 }); check('8g eGFR angivet -> ingen note', !(await out()).includes('eGFR mangler'));
  // Audit V13: skrøbelig HbA1c 66 er i mål i både boks og næste skridt
  await fresh(); await cb('beh', 'metformin'); await cb('forhold', 'skroebelig'); await fill({ hba1c: 66, egfr: 70 });
  check('8h skrøbelig HbA1c 66 -> i mål begge steder', (await head()).includes('er i mål') && (await head(2)).includes('I mål'), (await head()) + ' / ' + (await head(2)));
  await fill({ hba1c: 72 }); await cb('kan', 'sglt2');
  check('8i skrøbelig over mål -> DPP-4 før GLP-1', (await head(2)).includes('DPP-4'), await head(2));
  // Audit V3: journal nævner metformin og samtidig SGLT-2
  await fresh(); await cb('organ', 'ascvd'); await fill({ egfr: 70 }); let n = await note();
  check('8j journal metformin + samtidig SGLT-2', n.includes(': Metformin.') && n.includes(': Empagliflozin 10 mg.'), n);
  // Journal
  await fresh(); await cb('beh', 'metformin'); await fill({ alder: 63, hba1c: 60, egfr: 80, varighed: 8 });
  n = await note(); console.log('---\n' + n + '\n---');
  check('9 journal', n.includes('HbA1c 60 mmol/mol') && n.includes('Aktuel behandling: metformin') && n.includes('Plan (tilføj sglt-2-hæmmer): Empagliflozin 10 mg'));
  await p.check('#output input[name="valg"][value="dapagliflozin"]'); n = await note();
  check('9b valgt dapagliflozin', n.includes('Valgt behandling: Dapagliflozin 10 mg') && !n.includes('Empagliflozin'), n);
  await p.click('#resetBtn'); check('10 reset', (await p.inputValue('#hba1c')) === '');
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(BASE); await m.waitForTimeout(100);
  check('11 mobile no overflow', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.locator('#resultPanel').screenshot({ path: SHOTS + 'diabetes_mobile.png' });

  // Årskontrol
  const A = BASE.replace('behandling.html', 'aarskontrol.html');
  await p.goto(A); await p.waitForTimeout(120); o = await out();
  check('12 årskontrol tom -> mangler + statin-note', o.includes('Ikke målt') && o.includes('Statin anbefales'));
  await fill({ alder: 66, hba1c: 55, sbp: 138, dbp: 82, ldl: '2.4', egfr: 64, egfrFoer: 71, uacr: 45, bmi: 31 }); o = await out();
  check('13 BT over 130/80', o.includes('Blodtryk over mål'));
  check('13 albuminuri A2 -> ACE/ARB + SGLT-2', o.includes('A2') && o.includes('start ACE-hæmmer eller ARB') && o.includes('SGLT-2-hæmmer'));
  check('13 LDL 2,4 over 1,8 (albuminuri)', o.includes('LDL 2,4 over målet (< 1,8; albuminuri)'));
  check('13 eGFR-fald 7 -> henvis', o.includes('faldet 7 ml/min'));
  check('13 BMI 31 -> vægttab', o.includes('BMI ≥ 30'));
  await p.check('input[name="fod"][value="3"]'); check('14 fod 3 -> fodterapeut', (await out()).includes('Fodrisikogruppe 3: henvis til statsautoriseret fodterapeut'));
  await p.check('input[name="saar"]'); check('14b sår -> akut', (await out()).includes('Aktuelt fodsår'));
  await p.check('input[name="oeje"][value="forfalden"]'); check('15 øjne forfalden', (await out()).includes('Øjenscreening forfalden'));
  await fill({ alder: 80 }); check('16 80 år -> BT-mål 140/85', (await out()).includes('< 140/85'));
  n = await note(); console.log('---\n' + n + '\n---');
  check('17 årskontrol journal', n.includes('årskontrol') && n.includes('Plan (tilpas):') && n.includes('- Albuminuri'));
  // Audit V12 og mindre punkter
  await p.goto(A); await p.waitForTimeout(120); await cb('rf', 'ascvd'); await cb('rf', 'statin'); await fill({ ldl: '1.6' }); o = await out();
  check('18 ASCVD LDL 1,6 -> over mål 1,4', o.includes('LDL 1,6 over målet (< 1,4'));
  await fill({ dbp: 92 }); check('19 kun diastolisk 92 -> over mål', (await out()).includes('Blodtryk over mål'));
  await fill({ egfr: 58, egfrFoer: 66 }); await cb('rf', 'nystart'); o = await out();
  check('20 eGFR-fald efter opstart -> forventet, ikke henvis', o.includes('initialt fald på op til 30 %') && !o.includes('Henvis til nefrolog: eGFR faldet'));
  await cb('rf', 'sglt2'); check('21 på SGLT-2 -> ikke "overvej SGLT-2"', !(await out()).includes('overvej SGLT-2-hæmmer for nyrebeskyttelse'));
  await fill({ uacr: 400 }); check('22 A3 -> overvej henvisning', (await out()).includes('A3): overvej henvisning til nefrolog'));
  await fill({ uacr: 800 }); check('22b UACR 800 -> henvis (DNS)', (await out()).includes('(over 700): henvis til nefrolog'));
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
