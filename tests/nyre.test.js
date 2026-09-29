const { chromium } = require('playwright');
// Kør via tests/run_all.sh. BASE kan pege på et bygget artifact af ckd.html; BASE_DOSIS på dosis.html.
// KFRE-referenceværdier er beregnet med Python-pakken kfre (risk_pred, 4 variable, ikke-nordamerikansk).
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const CKD = process.env.BASE || ROOT + 'nyre/ckd.html';
const DOSIS = process.env.BASE_DOSIS || CKD.replace('ckd.html', 'dosis.html');
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(CKD).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const go = async (u) => { await p.goto(u); await p.waitForTimeout(120); };
  const out = async () => p.locator('#output').innerText();
  const head = async (i = 0) => p.locator('#output .box h3').nth(i).innerText();
  const cb = (n, v) => p.check(`input[name="${n}"][value="${v}"]`);
  const r = (n, v) => p.check(`input[name="${n}"][value="${v}"]`);
  const fill = async (o) => { for (const [k, v] of Object.entries(o)) await p.fill('#' + k, String(v)); };
  const note = async () => { await p.click('#copyBtn'); await p.waitForTimeout(150); return p.evaluate(() => navigator.clipboard.readText()); };
  const kfre = async () => p.$$eval('#output .risk-number', (e) => e.map((x) => x.textContent.trim()));
  let o, n;

  // ---------------- Kronisk nyresygdom ----------------
  await go(CKD);
  check('C1 tom -> angiv eGFR og UACR', (await head()) === 'Angiv eGFR og UACR');
  await fill({ egfr: 75, uacr: 10 }); check('C2 eGFR 75 UACR 10 -> ingen CKD', (await head()).startsWith('Ingen kronisk nyresygdom'));
  // KFRE-reference: 70 år, mand, eGFR 40, UACR 300 -> 1,58 % (2 år) og 5,98 % (5 år)
  await fill({ alder: 70, egfr: 40, uacr: 300 }); o = await out();
  check('C3 G3b A3 meget høj risiko', (await head()).startsWith('G3b A3 — meget høj risiko'), await head());
  check('C3 KFRE 1,6 % og 6 %', JSON.stringify(await kfre()) === JSON.stringify(['1,6 %', '6 %']), JSON.stringify(await kfre()));
  check('C3 henvis pga. KFRE ≥ 5 % + overvej A3', o.includes('Henvis til nefrologisk vurdering') && o.includes('KFRE: 6 %') && o.includes('UACR 300–700'));
  check('C3 kontrol 3 gange', o.includes('3 gange om året'));
  check('C3 aktuel celle markeret rød', await p.$eval('.kdigo-map td.aktuel', (td) => td.className.includes('risk-meget') && td.textContent === '3'));
  check('C3 ikke bekræftet -> bekræft', o.includes('Bekræft diagnosen'));
  await cb('andet', 'bekraeftet'); check('C3b bekræftet -> ingen bekræft-note', !(await out()).includes('Bekræft diagnosen'));
  // 55 år kvinde eGFR 25 UACR 1200 -> 15,8 % og 48,6 %
  await r('koen', 'kvinde'); await fill({ alder: 55, egfr: 25, uacr: 1200 }); o = await out();
  check('C4 KFRE 16 % og 49 %', JSON.stringify(await kfre()) === JSON.stringify(['16 %', '49 %']), JSON.stringify(await kfre()));
  check('C4 henvis eGFR < 30 og UACR > 700', o.includes('eGFR under 30 (G4)') && o.includes('UACR over 700'));
  // 62 år mand eGFR 18 UACR 800 -> 29,0 % og 73,4 %
  await r('koen', 'mand'); await fill({ alder: 62, egfr: 18, uacr: 800 });
  check('C5 KFRE 29 % og 73 %', JSON.stringify(await kfre()) === JSON.stringify(['29 %', '73 %']), JSON.stringify(await kfre()));
  // 45 år kvinde eGFR 55 UACR 40 -> 0,16 % og 0,63 %
  await r('koen', 'kvinde'); await fill({ alder: 45, egfr: 55, uacr: 40 });
  check('C6 KFRE 0,2 % og 0,6 %', JSON.stringify(await kfre()) === JSON.stringify(['0,2 %', '0,6 %']), JSON.stringify(await kfre()));
  check('C6 G3a A2 høj risiko', (await head()).startsWith('G3a A2 — høj risiko'));
  // Behandling
  await go(CKD); await fill({ alder: 80, egfr: 50, uacr: 10 }); o = await out();
  check('C7 80 år eGFR 50 -> statin anbefales', o.includes('Statin') && o.includes('Anbefales til alle fra 50 år'));
  check('C7 SGLT-2 ikke indiceret uden diabetes/albuminuri', o.includes('SGLT-2-hæmmer ikke indiceret'));
  check('C7 ingen henvisning', o.includes('Ingen henvisningskriterier opfyldt'));
  await cb('syg', 't2d'); check('C8 T2D -> SGLT-2 anbefales', (await out()).includes('SGLT-2-hæmmer anbefales'));
  await go(CKD); await fill({ alder: 60, egfr: 35, uacr: 50 }); o = await out();
  check('C9 eGFR 35 -> SGLT-2 overvej, ACE/ARB foreslås', o.includes('SGLT-2-hæmmer overvej') && o.includes('Foreslås ved albuminuri'));
  await cb('syg', 'pkd'); check('C10 polycystisk -> ikke dokumenteret', (await out()).includes('SGLT-2-hæmmer ikke dokumenteret'));
  await go(CKD); await fill({ alder: 60, egfr: 18, uacr: 50 }); check('C11 eGFR 18 -> start ikke SGLT-2', (await out()).includes('SGLT-2-hæmmer start ikke'));
  await cb('med', 'sglt2'); check('C11b i behandling -> fortsæt til dialyse', (await out()).includes('indtil dialyse'));
  // Finerenon
  await go(CKD); await fill({ alder: 65, egfr: 50, uacr: 100, kalium: 4.5 }); await cb('syg', 't2d');
  check('C12 T2D uden ACE/ARB -> finerenon senere', (await out()).includes('Finerenon senere'));
  await cb('med', 'acearb'); check('C13 T2D + ACE/ARB -> finerenon 10 mg', (await out()).includes('Finerenon overvej') && (await out()).includes('10 mg dagligt'));
  await fill({ kalium: 5.2 }); check('C14 kalium 5,2 -> start ikke', (await out()).includes('Finerenon start ikke'));
  await fill({ kalium: 6.2 }); check('C15 kalium 6,2 -> akut', (await out()).includes('akut vurdering'));
  // Fald i eGFR
  await go(CKD); await fill({ alder: 60, egfr: 44, egfrFoer: 52, uacr: 20 });
  check('C16 fald 8 -> henvis', (await out()).includes('Hurtigt fald i eGFR: 8'));
  await cb('med', 'nystart'); o = await out();
  check('C17 nystart -> forventet fald', o.includes('initialt fald på op til 30 %') && !o.includes('Hurtigt fald'));
  // Hæmaturi, BT, NSAID, advarsel
  await go(CKD); await fill({ alder: 50, egfr: 70, uacr: 60, sbp: 142, dbp: 84 }); await cb('syg', 'haematuri'); await cb('med', 'nsaid'); o = await out();
  check('C18 hæmaturi + albuminuri -> henvis', o.includes('hæmaturi sammen med albuminuri'));
  check('C19 BT over mål', o.includes('Blodtryk 142/84 mmHg over mål'));
  check('C20 NSAID -> stop', o.includes('NSAID stop'));
  await fill({ uacr: 2 }); check('C21 UACR 2 -> enhedsadvarsel', (await p.locator('#labWarning').innerText()).includes('mg/g'));
  // Journal
  await go(CKD); await fill({ alder: 70, egfr: 40, uacr: 300 }); await cb('andet', 'bekraeftet'); await cb('syg', 't2d');
  n = await note(); console.log('---\n' + n + '\n---');
  check('C22 journal', n.includes('Kronisk nyresygdom G3b A3 (meget høj risiko)') && n.includes('KFRE: 1,6 % (2 år) og 6 % (5 år)') && n.includes('Henvisning til nefrolog') && n.includes('SGLT-2-hæmmer (anbefales)'), n);
  await p.click('#resetBtn'); check('C23 reset', (await head()) === 'Angiv eGFR og UACR');

  // ---------------- Dosis efter nyrefunktion ----------------
  await go(DOSIS);
  check('D1 tom -> angiv eGFR', (await head()) === 'Angiv eGFR');
  const row = async (navn) => p.$$eval('#output tr', (trs, nv) => { const tr = trs.find((t) => t.cells[0] && t.cells[0].textContent.startsWith(nv)); return tr ? tr.innerText.replace(/\s+/g, ' ') : ''; }, navn);
  await fill({ egfr: 38 });
  check('D2 metformin maks. 1.000 mg', (await row('Metformin')).includes('Maks. 1.000 mg'));
  check('D2 nitrofurantoin kontraindiceret', (await row('Nitrofurantoin')).includes('Kontraindiceret'));
  check('D2 sitagliptin 50 mg', (await row('Sitagliptin')).includes('50 mg dagligt'));
  check('D2 CrCl mangler -> eGFR i stedet', (await row('Gabapentin')).includes('eGFR (i stedet for CrCl)') && (await row('Gabapentin')).includes('300–900'));
  // CrCl: (140 − 82) × 58 × 1,04 / 128 = 27,3
  await fill({ alder: 82, vaegt: 58, kreat: 128 }); await r('koen', 'kvinde'); o = await out();
  check('D3 CrCl 27', o.includes('kreatininclearance (Cockcroft-Gault) 27 ml/min'));
  check('D3 DOAK ved CrCl 27 -> dabigatran kontraindiceret', (await row('DOAK')).includes('dabigatran kontraindiceret') && (await row('DOAK')).includes('(CrCl)'));
  check('D3 gabapentin 150–600', (await row('Gabapentin')).includes('150–600 mg/døgn'));
  check('D3 metformin bruger eGFR', (await row('Metformin')).includes('(eGFR)'));
  await p.check('input[name="vis"][value="handling"]');
  check('D4 kun handling -> ingen "Normal dosering"', !(await p.$$eval('#output .tag-recommend', (e) => e.length)));
  await p.uncheck('input[name="vis"][value="handling"]'); await p.fill('#sog', 'metf');
  check('D5 søgning', (await p.$$eval('#output tbody tr:not(.group-row)', (e) => e.length)) === 1);
  await p.fill('#sog', '');
  n = await note(); check('D6 notat med relevante', n.includes('CrCl (Cockcroft-Gault) 27') && n.includes('- Metformin: justér') && n.includes('- Nitrofurantoin: kontraindiceret') && !n.includes('Linagliptin'), n);
  await fill({ egfr: 90, alder: '', vaegt: '', kreat: '' }); n = await note();
  check('D7 eGFR 90 -> kun NSAID-forsigtighed', n.includes('NSAID') && !n.includes('Metformin'), n);

  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 });
  for (const u of [CKD, DOSIS]) {
    await m.goto(u); await m.fill('#egfr', '38'); if (u === CKD) { await m.fill('#uacr', '300'); await m.fill('#alder', '70'); } await m.waitForTimeout(150);
    check('mobil uden vandret scroll ' + u.split('/').pop(), (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390, String(await m.evaluate(() => document.documentElement.scrollWidth)));
  }
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
