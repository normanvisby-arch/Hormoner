const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'hjerte/af.html';
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
  const fill = async (o) => { for (const [k, v] of Object.entries(o)) await p.fill('#' + k, String(v)); };
  const row = async (navn) => { const r = p.locator('#output tbody tr', { hasText: navn }); return (await r.count()) ? (await r.first().innerText()).replace(/\s+/g, ' ') : ''; };

  await fresh(); let o = await out();
  check('1 empty -> 0 point, not indicated, ask age', (await head()) === 'CHA₂DS₂-VA: 0 point' && o.includes('ikke indiceret') && o.includes('Angiv alder'));
  await fill({ alder: 78 }); await cb('cha', 'h'); o = await out();
  check('2 kvinde 78 + HT -> 3 point anbefales, VASc 4', (await head()) === 'CHA₂DS₂-VA: 3 point' && o.includes('anbefales') && o.includes('CHA₂DS₂-VASc (med kvindeligt køn): 4 point'));
  check('2 asks for weight/creatinine', o.includes('Angiv alder, vægt og p-kreatinin'));
  await fresh(); await fill({ alder: 70 }); o = await out(); check('3 70 år alene -> 1 point overvejes', (await head()) === 'CHA₂DS₂-VA: 1 point' && o.includes('bør overvejes'));
  await fresh(); await fill({ alder: 60 }); await cb('cha', 's'); check('3b stroke alone -> 2 point', (await head()) === 'CHA₂DS₂-VA: 2 point');

  // Mand 80 år, 60 kg, kreatinin 140: CrCl = 60*60*1,23/140 = 31,6
  await fresh(); await cb('koen', 'mand'); await fill({ alder: 80, vaegt: 60, krea: 140 }); o = await out();
  check('4 CrCl 32', o.includes('kreatininclearance 32 ml/min'));
  check('4 apixaban 2,5 (3 kriterier)', (await row('Apixaban')).includes('2,5 mg × 2 dagligt') && (await row('Apixaban')).includes('mindst 2 af 3'), await row('Apixaban'));
  check('4 rivaroxaban 15', (await row('Rivaroxaban')).includes('15 mg × 1'));
  check('4 edoxaban 30', (await row('Edoxaban')).includes('30 mg × 1') && (await row('Edoxaban')).includes('vægt ≤ 60'));
  check('4 dabigatran 110 (≥80)', (await row('Dabigatran')).includes('110 mg × 2'));
  check('4 kontrol hver 3. måned', o.includes('Kontrol: hver 3. måned'));
  // Kvinde 70 år, 80 kg, kreatinin 70: CrCl = 70*80*1,04/70 = 83,2
  await fresh(); await fill({ alder: 70, vaegt: 80, krea: 70 }); await cb('cha', 'h'); o = await out();
  check('5 CrCl 83, standarddoser', o.includes('kreatininclearance 83') && (await row('Apixaban')).includes('5 mg × 2') && (await row('Rivaroxaban')).includes('20 mg × 1') && (await row('Edoxaban')).includes('60 mg × 1') && (await row('Dabigatran')).includes('150 mg × 2'));
  check('5 kontrol hver 12. måned', o.includes('Kontrol: hver 12. måned'));
  // Mand 85 år, 55 kg, kreatinin 150: CrCl = 55*55*1,23/150 = 24,8
  await fresh(); await cb('koen', 'mand'); await fill({ alder: 85, vaegt: 55, krea: 150 }); o = await out();
  check('6 CrCl 25: dabigatran kontraindiceret, apixaban 2,5', (await row('Dabigatran')).includes('Kontraindiceret') && (await row('Apixaban')).includes('2,5 mg') && (await row('Apixaban')).includes('15–29'));
  await fill({ krea: 400 }); o = await out(); check('7 CrCl < 15 -> frarådes + box', (await row('Apixaban')).includes('Anbefales ikke') && o.includes('Kreatininclearance under 15'));
  // Interaktioner
  await fresh(); await fill({ alder: 72, vaegt: 75, krea: 80 }); await cb('cha', 'h'); await cb('med', 'azol'); o = await out();
  check('8 azol: apixaban/rivaroxaban frarådes', (await row('Apixaban')).includes('Frarådes') && (await row('Rivaroxaban')).includes('Frarådes'));
  check('8 azol: edoxaban 30, dabigatran kontraindiceret', (await row('Edoxaban')).includes('30 mg') && (await row('Dabigatran')).includes('Kontraindiceret'));
  await fresh(); await fill({ alder: 72, vaegt: 75, krea: 80 }); await cb('cha', 'h'); await cb('med', 'verapamil'); check('9 verapamil -> dabigatran 110', (await row('Dabigatran')).includes('110 mg × 2'));
  await cb('med', 'induktor'); const rows9 = await Promise.all(['Apixaban', 'Rivaroxaban', 'Edoxaban', 'Dabigatran'].map(row));
  check('9b induktor -> alle frarådes', rows9.every((r) => r.includes('Frarådes') && r.includes('enzyminduktor')), rows9.join(' | '));
  // Klap
  await fresh(); await cb('klap', 'klap'); await fill({ alder: 70 }); o = await out(); check('10 mekanisk klap -> VKA, ingen DOAK-tabel', (await head()).includes('VKA') && !o.includes('Valg og dosis af DOAK'));
  // Blødning
  await fresh(); await fill({ alder: 70 }); await cb('bl', 'bt'); await cb('bl', 'nsaid'); await cb('bl', 'alkohol'); o = await out();
  check('11 HAS-BLED 4 høj + gør nu', o.includes('HAS-BLED 4 (høj)') && o.includes('regulér blodtrykket') && o.includes('ikke en grund til at undlade antikoagulation'));
  check('11 NSAID interaction note', o.includes('undgå NSAID'));
  // Høj clearance edoxaban
  await fresh(); await cb('koen', 'mand'); await fill({ alder: 66, vaegt: 100, krea: 70 }); o = await out(); check('12 CrCl > 95 edoxaban-note', (await row('Edoxaban')).includes('> 95'));
  // Apixaban 1 kriterium
  await fresh(); await fill({ alder: 82, vaegt: 75, krea: 90 }); o = await out(); check('13 apixaban 1 kriterium -> fuld dosis', (await row('Apixaban')).includes('5 mg × 2') && (await row('Apixaban')).includes('kun 1 af 3'));
  check('13 dabigatran 110 (≥80)', (await row('Dabigatran')).includes('110 mg'));
  await fresh(); await fill({ alder: 77, vaegt: 75, krea: 90 }); check('13b dabigatran 75–79 -> overvej', (await row('Dabigatran')).includes('Overvej reduktion'));
  // Journal
  await fresh(); await cb('koen', 'mand'); await fill({ alder: 80, vaegt: 60, krea: 140 }); await cb('cha', 'h');
  await p.click('#copyBtn'); await p.waitForTimeout(150); const note = await p.evaluate(() => navigator.clipboard.readText()); console.log('---\n' + note + '\n---');
  check('14 journal', note.includes('Mand, 80 år, 60 kg, kreatinin 140 µmol/l, kreatininclearance 32 ml/min') && note.includes('CHA2DS2-VA 3') && note.includes('Apixaban 2,5 mg × 2 dagligt') && note.includes('Kontrol: hver 3. måned'));
  await p.click('#copyFullBtn'); await p.waitForTimeout(150); const full = await p.evaluate(() => navigator.clipboard.readText());
  check('14 full text table', full.includes('* Apixaban (Reduceret dosis) — 2,5 mg × 2 dagligt'));
  await p.click('#resetBtn'); check('15 reset', (await p.inputValue('#alder')) === '' && (await head()) === 'CHA₂DS₂-VA: 0 point');
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(BASE);
  await m.fill('#alder', '80'); await m.fill('#vaegt', '60'); await m.fill('#krea', '140'); await m.waitForTimeout(100);
  check('16 mobile no overflow', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.locator('#resultPanel').screenshot({ path: SHOTS + 'af_mobile.png' });
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
