const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Restordre — alternativer: data, søgning, ækvivalenstabeller, journalnotat,
// udfyldning fra journaltekst, Notat-indgangen og app/offline. BASE kan pege på et bygget artifact.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SIDE = process.env.BASE || ROOT + 'restordre/index.html';
const ARTIFACT = !!process.env.BASE;
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(SIDE); await p.waitForTimeout(200);

  // ---------------- Data ----------------
  const data = await p.evaluate(() => {
    const G = window.RESTORDRE_GRUPPER; const fejl = [];
    G.forEach((g) => {
      if (!g.kilder || !g.kilder.length) fejl.push(g.id + ': ingen kilder');
      if (!g.raekker && !g.forslag) fejl.push(g.id + ': hverken tabel eller forslag');
      (g.raekker || []).forEach((r) => g.stoffer.forEach((s) => { if (!(s.id in r.doser) || !r.doser[s.id]) fejl.push(`${g.id}/${r.niveau}/${s.id}`); }));
      g.stoffer.forEach((s) => { try { new RegExp(s.soeg); } catch (e) { fejl.push(s.id + ': regex'); } });
    });
    const ids = G.flatMap((g) => g.stoffer.map((s) => g.id + '/' + s.id));
    return { n: G.length, fejl, dubletter: ids.length - new Set(ids).size };
  });
  check('D1 alle grupper har kilder og komplette tabeller', data.fejl.length === 0 && data.dubletter === 0 && data.n >= 25, JSON.stringify(data));
  const celle = (g, niveau, s) => p.evaluate(([g, n, s]) => { const G = window.RESTORDRE_GRUPPER.find((x) => x.id === g); return G.raekker.find((r) => r.niveau.startsWith(n)).doser[s]; }, [g, niveau, s]);
  // Stikprøver mod kilderne
  check('D2 ACE: ramipril 10 ≈ lisinopril 40 ≈ enalapril 20 × 2 ≈ perindopril 8', (await celle('ace', 'Høj', 'ramipril')) === '10 mg × 1' && (await celle('ace', 'Høj', 'lisinopril')) === '40 mg × 1' && (await celle('ace', 'Høj', 'enalapril')) === '20 mg × 2' && (await celle('ace', 'Høj', 'perindopril')).startsWith('8 mg'));
  check('D3 ARB: losartan 50 ≈ valsartan 80 ≈ irbesartan 150 ≈ telmisartan 40', (await celle('arb', 'Middel', 'losartan')) === '50 mg' && (await celle('arb', 'Middel', 'valsartan')) === '80 mg' && (await celle('arb', 'Middel', 'irbesartan')) === '150 mg' && (await celle('arb', 'Middel', 'telmisartan')) === '40 mg');
  check('D4 statin (NICE): atorvastatin 20 mg 43 % = rosuvastatin 10 mg 43 %', (await celle('statin', 'Ca. 43', 'atorva')) === '20 mg (43 %)' && (await celle('statin', 'Ca. 43', 'rosuva')) === '10 mg (43 %)' && (await celle('statin', 'Ca. 37', 'simva')) === '40 mg (37 %)');
  check('D5 PPI (NICE): fuld dosis pantoprazol 40 / esomeprazol 20 / lansoprazol 30', (await celle('ppi', 'Fuld', 'pantoprazol')) === '40 mg × 1' && (await celle('ppi', 'Fuld', 'esomeprazol')) === '20 mg × 1' && (await celle('ppi', 'Fuld', 'lansoprazol')) === '30 mg × 1');
  check('D6 loop 40:1', (await celle('loop', 'Middel', 'furosemid')) === '40 mg' && (await celle('loop', 'Middel', 'bumetanid')) === '1 mg');
  check('D7 DOAK som Atrieflimren-værktøjet', (await celle('doak', 'Standard', 'apixaban')) === '5 mg × 2' && (await celle('doak', 'Reduceret', 'rivaroxaban')).startsWith('15 mg × 1 — CrCl 15–49') && (await celle('doak', 'Reduceret', 'dabigatran')).startsWith('110 mg × 2'));
  check('D8 betablokker: metoprolol 100 ≈ bisoprolol 5 ≈ carvedilol 12,5 × 2', (await celle('bb', 'Høj', 'metoprolol')) === '100 mg × 1' && (await celle('bb', 'Høj', 'bisoprolol')) === '5 mg × 1' && (await celle('bb', 'Høj', 'carvedilol')) === '12,5 mg × 2');
  check('D9 østrogen som Klimakterieguiden (plaster 50 ≈ Estrogel 2 tryk)', (await celle('oestrogen', 'Standard', 'plaster')) === '50 mikrog.' && (await celle('oestrogen', 'Standard', 'estrogel')) === '2 tryk');
  check('D10 cystitis-doser som Urinveje-værktøjet', (await celle('uvi', 'Ukompliceret', 'pivm')) === '400 mg × 3 i 3 dage' && (await celle('uvi', 'Ukompliceret', 'nitro')).startsWith('100 mg × 4'));
  check('D11 opioid: oral morfin 30 ≈ oxycodon 15–20', (await celle('opioid', 'Døgndosis', 'oxy')) === '15–20 mg');

  // ---------------- Søgning ----------------
  const soeg = async (t) => { await p.fill('#soeg', t); await p.waitForTimeout(120); return p.locator('#output').innerText(); };
  let r = await soeg('Ozempic');
  check('S1 handelsnavn (Ozempic) → GLP-1', r.includes('GLP-1-receptoragonister') && r.includes('Tjek restordre.dk først') && r.includes('Samme indholdsstof'), r.slice(0, 80));
  check('S2 dosisvalg vises', await p.locator('#dosisFelt').isVisible() && (await p.locator('#dosis option').count()) === 5);
  r = await soeg('rami');
  check('S3 begyndelsen af et navn (rami → ramipril)', r.includes('ACE-hæmmere'));
  r = await soeg('Selo-Zok');
  check('S4 Selo-Zok → betablokkere', r.includes('Betablokkere'));
  r = await soeg('eliquis');
  check('S5 Eliquis → DOAK med link til Atrieflimren', r.includes('DOAK') && (await p.locator(ARTIFACT ? '#output a[href="https://claude.ai/artifact/2nGFCKz6mPxesZpGM7qZdm"][target="_blank"]' : '#output a[href$="hjerte/af.html"]').count()) === 1);
  r = await soeg('desogestrel');
  check('S6 desogestrel → minipille (ikke kombinationspiller)', r.includes('P-piller og minipiller') && (await p.locator('.rest-col').count()) === 0);
  r = await soeg('xyzzy');
  check('S7 ukendt præparat: henviser til restordre.dk og pro.medicin.dk', r.includes('findes ikke i værktøjets register') && (await p.locator('#output a[href^="https://pro.medicin.dk/Search"]').count()) >= 1);
  await p.fill('#soeg', 'pe'); await p.waitForTimeout(100);
  check('S8 under 3 tegn giver ingen søgning', (await p.locator('#output').innerText()).includes('Skriv navnet'));
  r = await soeg('esomeprazol');
  check('S9 kun ét hit, når et navn indeholder et andet (esomeprazol ≠ omeprazol)', r.includes('Protonpumpehæmmere') && (await p.locator('#valgFelt').isHidden()));

  // ---------------- Registeret (alle indholdsstoffer) ----------------
  const reg = await p.evaluate(() => { const L = window.RESTORDRE_REGISTER.trim().split('\n'); return { n: L.length, udenNavn: L.filter((l) => !window.RESTORDRE_ATC[l.split('|')[0]]).length }; });
  check('R0 registeret har mindst 400 stoffer, alle med ATC-gruppenavn', reg.n >= 400 && reg.udenNavn === 0, JSON.stringify(reg));
  r = await soeg('Lyrica');
  check('R1 Lyrica → gabapentinoid-tabel (gabapentin 6:1)', r.includes('Gabapentinoider') && (await p.locator('.rest-table th.rest-col').innerText()).toLowerCase().includes('pregabalin') && r.includes('900 mg/døgn'));
  r = await soeg('Concerta');
  check('R2 Concerta (kun i registeret) → ATC-gruppe med bemærkning om ADHD', r.includes('ATC-gruppe N06BA') && r.includes('behandlingsansvarlige psykiater') && r.includes('Lisdexamfetamin'), r.slice(0, 120));
  await p.check('input[name="alt"][value="lisdexamfetamin"]'); await p.waitForTimeout(80);
  check('R3 journalnotat fra registeret', (await p.locator('#journalTekst').innerText()).includes('Methylphenidat i restordre') && (await p.locator('#journalTekst').innerText()).includes('Skiftet til Lisdexamfetamin — dosis efter produktresumé'));
  r = await soeg('captopril');
  check('R4 captopril → ACE-hæmmere i registeret + link til ækvivalente doser', r.includes('Ramipril') && (await p.locator('[data-gruppe-vis="ace"]').count()) === 1);
  await p.click('[data-gruppe-vis="ace"]'); await p.waitForTimeout(120);
  check('R5 linket viser ACE-tabellen', (await p.locator('#output').innerText()).includes('3. Andet præparat i samme gruppe — ACE-hæmmere'));
  await soeg('budesonid');
  check('R6 budesonid: vælg mellem inhalation, tarm og næsespray', await p.locator('#valgFelt').isVisible() && (await p.locator('#valgListe button').count()) === 3);
  r = await soeg('Entresto');
  check('R7 Entresto: 36 timer før ACE-hæmmer + link til ARB', r.includes('36 timer') && (await p.locator('[data-gruppe-vis="arb"]').count()) === 1);
  r = await soeg('formoterol');
  check('R8 formoterol: LABA og SABA er ikke erstattelige, intet tabel-link', r.includes('ikke indbyrdes erstattelige') && (await p.locator('[data-gruppe-vis]').count()) === 0);
  r = await soeg('Hjertemagnyl');
  check('R9 Hjertemagnyl → trombocythæmmere med advarsel om skift efter AKS', r.includes('ATC-gruppe B01AC') && r.includes('konferér med kardiolog') && r.includes('Clopidogrel'));
  r = await soeg('Magnyl');
  check('R9b Magnyl → smertestillende acetylsalicylsyre (ikke lavdosis)', r.includes('ATC-gruppe N02BA'));
  r = await soeg('Mounjaro');
  check('R10 Mounjaro → GLP-1 som alternativ', r.includes('Tirzepatid') && (await p.locator('[data-gruppe-vis="glp1"]').count()) === 1);
  r = await soeg('amoxicillin');
  check('R12 amoxicillin: ikke pivmecillinam som alternativ, link til penicillin V', r.includes('IKKE indbyrdes alternativer') && (await p.locator('#output input[name="alt"]').count()) === 0 && (await p.locator('[data-gruppe-vis="penicillin"]').count()) === 1 && (await p.locator('#journalTekst').innerText()).includes('Alternativ: [skriv selv]'));
  r = await soeg('Selexid');
  check('R13 Selexid → urinvejs-tabellen', r.includes('Pivmecillinam') && (await p.locator('.rest-table').count()) === 1);
  r = await soeg('Sotacor');
  check('R14 Sotacor: sotalol erstattes ikke af propranolol', r.includes('klasse III') && r.includes('konferér med kardiolog'));
  r = await soeg('Trimbow');
  check('R15 Trimbow: kun anden triple eller LABA/LAMA + ICS', r.includes('Triple-inhalatorer') && r.includes('Trelegy'));
  r = await soeg('Cozaar Comp');
  check('R16 Cozaar Comp → kombinationspræparat, stofferne hver for sig', r.includes('ATC-gruppe C09DA') && r.includes('hver for sig'));
  r = await soeg('Entresto');
  check('R17 Entresto: valsartan-doser', r.includes('valsartan 40 mg × 2') && r.includes('160 mg × 2'));
  r = await soeg('kodein');
  check('R18 kodein → opioid-tabellen', r.includes('Opioid') && (await p.locator('.rest-table').count()) === 1);
  r = await soeg('prednisolon');
  check('R11 prednisolon → glukokortikoid-ækvivalens', r.includes('Glukokortikoider') && r.includes('0,75 mg'));

  // ---------------- Tabel og journalnotat ----------------
  await soeg('Ozempic');
  await p.selectOption('#dosis', '2'); await p.waitForTimeout(80);
  check('T1 nuværende dosis markeres i tabellen', (await p.locator('.rest-table tr.row-highlight').count()) === 1 && (await p.locator('.rest-table tr.row-highlight').innerText()).includes('1 mg'));
  check('T2 præparatet i restordre er markeret', (await p.locator('.rest-table th.rest-col').innerText()).toLowerCase().includes('i restordre'));
  await p.locator('#soeg').blur(); await p.waitForTimeout(80);
  await p.check('input[name="alt"][value="dula"]'); await p.waitForTimeout(80);
  let n = await p.locator('#journalTekst').innerText();
  check('T3 journalnotat med ækvivalent dosis af det valgte', n.includes('Semaglutid s.c. (ugentlig) 1 mg i restordre') && n.includes('Skiftet til Dulaglutid (ugentlig) (omtrentlig ækvivalent dosis 3 mg) — startes på lav vedligeholdelsesdosis'), n);
  check('T4 restordre.dk-link og kopi af søgeordet', (await p.getAttribute('#restordreLink', 'href')) === 'https://restordre.dk/' && (await p.locator('#kopierNavn').innerText()).includes('Ozempic'));
  await soeg('ramipril'); await p.selectOption('#dosis', '2'); await p.waitForTimeout(80); await p.check('input[name="alt"][value="lisinopril"]'); await p.waitForTimeout(80);
  n = await p.locator('#journalTekst').innerText();
  check('T5 notat med plan for kontrol', n.includes('Skiftet til Lisinopril 40 mg × 1') && n.includes('Plan: Kontrollér blodtryk, kalium og kreatinin'), n);
  await soeg('Eliquis'); await p.selectOption('#dosis', '0'); await p.waitForTimeout(80); await p.check('input[name="alt"][value="rivaroxaban"]'); await p.waitForTimeout(80);
  n = await p.locator('#journalTekst').innerText();
  check('T8 DOAK-notat uden dosis (egne kriterier) og plan', n.includes('Skiftet til Rivaroxaban — dosis efter præparatets egne kriterier') && !n.includes('20 mg') && n.includes('Plan: Beregn kreatininclearance'), n);
  await soeg('morfin'); await p.selectOption('#dosis', '1'); await p.waitForTimeout(80); await p.check('input[name="alt"][value="oxy"]'); await p.waitForTimeout(80);
  n = await p.locator('#journalTekst').innerText();
  check('T9 opioid-notat: ækvivalent døgndosis, startdosis 50–75 % + p.n.', n.includes('beregnet ækvivalent døgndosis') && n.includes('startdosis 50–75 %') && n.includes('p.n.'), n);
  r = await soeg('levothyroxin'); n = await p.locator('#journalTekst').innerText();
  check('T10 levothyroxin: "skriv selv" og plan om TSH', n.includes('Alternativ: [skriv selv]') && n.includes('Plan: Kontrollér TSH 6–8 uger'), n);
  r = await soeg('Losartan comp');
  check('T11 kombinationspræparat fundet som enkeltstof → advarsel', r.includes('Kombinationspræparat?') && r.includes('Angiotensin'), r.slice(0, 120));
  r = await soeg('losartan');
  check('T12 enkeltstof uden advarsel', !r.includes('Kombinationspræparat?'));
  await p.click('#alleGrupper summary'); await p.click('#gruppeListe a[data-gruppe="statin"]'); await p.waitForTimeout(100);
  check('T6 valg fra "Alle lægemiddelgrupper"', (await p.locator('#output').innerText()).includes('Statiner'));
  await p.click('#resetBtn'); await p.waitForTimeout(80);
  check('T7 Nulstil rydder', (await p.inputValue('#soeg')) === '' && (await p.locator('#dosisFelt').isHidden()) && (await p.locator('#output').innerText()).includes('Skriv navnet'));

  // ---------------- Udfyld fra journaltekst ----------------
  await p.evaluate(() => (document.querySelector('details.udfyld').open = true));
  await p.fill('#udfyldTekst', 'Kendt med type 2-diabetes på metformin. Ozempic 1 mg er i restordre, pt. henvender sig.'); await p.click('#udfyldBtn'); await p.waitForTimeout(200);
  check('U1 præparatet nærmest "restordre" udfyldes (Ozempic, ikke metformin)', (await p.inputValue('#soeg')) === 'Ozempic' && (await p.locator('#output').innerText()).includes('GLP-1'));
  await p.fill('#udfyldTekst', 'Patienten ringer: apoteket siger, at Lyrica 75 mg kan ikke skaffes.'); await p.click('#udfyldBtn'); await p.waitForTimeout(200);
  check('U3 præparat fra registeret udfyldes (Lyrica)', (await p.inputValue('#soeg')) === 'Lyrica' && (await p.locator('#output').innerText()).includes('Gabapentinoider'));
  await p.fill('#udfyldTekst', 'Pradaxa 110 mg × 2 i mange år, nu i restordre. Husk kontrol.'); await p.click('#udfyldBtn'); await p.waitForTimeout(200);
  check('U4 "Husk" læses ikke som præparat (Pradaxa udfyldes)', (await p.inputValue('#soeg')) === 'Pradaxa');
  const ru = async (t) => { await p.fill('#udfyldTekst', t); await p.click('#udfyldBtn'); await p.waitForTimeout(250); return { soeg: await p.inputValue('#soeg'), out: await p.locator('#output').innerText(), dosis: await p.evaluate(() => { const d = document.getElementById('dosis'); return d.selectedOptions[0] ? d.selectedOptions[0].textContent : ''; }) }; };
  let rr = await ru('Pt. i behandling med metformin og atorvastatin. Apoteket kan ikke levere Eliquis');
  check('U5 "kan ikke levere" — præparatet efter udløseren (Eliquis)', rr.soeg === 'Eliquis', rr.soeg);
  rr = await ru('Pt. får Pinex og Eliquis 5 mg x 2. Eliquis kan ikke leveres.');
  check('U6 ikke det første præparat i teksten (Pinex)', rr.soeg === 'Eliquis', rr.soeg);
  rr = await ru('Losartan/hydrochlorthiazid 50/12,5 mg i restordre');
  check('U7 kombinationspræparat bevares og advarer', /losartan\/hydrochlorthiazid/i.test(rr.soeg) && rr.out.includes('Kombinationspræparat?'), rr.soeg);
  rr = await ru('Ozempic 1 mg er i restordre');
  check('U8 dosis fra teksten vælges i dosislisten', rr.soeg === 'Ozempic' && /1 mg/.test(rr.dosis), rr.dosis);
  await p.fill('#udfyldTekst', 'Pt. ringer om sin medicin.'); await p.click('#udfyldBtn'); await p.waitForTimeout(200);
  check('U2 intet præparat fundet → note', (await p.locator('#udfyldRapport').innerText()).includes('Intet præparat'));

  if (!ARTIFACT) {
    // ---------------- Notat-indgangen ----------------
    r = await p.evaluate(() => { const r = Udfyld.klassificer('Type 2-diabetes, HbA1c 58. Ozempic 1 mg er i restordre.'); return { s: r.sikker, top: r.kandidater[0].id }; });
    check('N1 "restordre" i notatet → Restordre-værktøjet (sikkert)', r.s && r.top === 'restordre', JSON.stringify(r));
    await p.goto(ROOT + 'notat/index.html'); await p.waitForTimeout(150);
    await p.evaluate(() => { const ta = document.getElementById('notatTekst'); const dt = new DataTransfer(); dt.setData('text/plain', 'Eliquis 5 mg x 2 kan ikke skaffes på apoteket. AF, 78 år.'); if (ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))) ta.value = dt.getData('text/plain'); });
    await p.waitForURL('**/restordre/index.html', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(400);
    check('N2 Notat sender videre og udfylder Eliquis', p.url().endsWith('restordre/index.html') && (await p.inputValue('#soeg')) === 'Eliquis' && (await p.locator('#output').innerText()).includes('DOAK'), p.url());

    // ---------------- App og offline ----------------
    const APP = ROOT + 'restordre/';
    const man = await (await p.request.get(APP + 'manifest.webmanifest')).json();
    check('W1 manifest', man.short_name === 'Restordre' && man.start_url === 'index.html' && man.display === 'standalone');
    for (const ic of man.icons) check(`W2 ikon ${ic.src}`, (await p.request.get(APP + ic.src)).ok());
    const scope = await p.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    check('W3 service worker', scope === APP, scope);
    await p.reload(); await p.waitForTimeout(300);
    await ctx.setOffline(true);
    const rr = await p.goto(APP + 'index.html').catch(() => null);
    check('W4 offline', rr && rr.ok() && (await p.locator('h1').innerText()).includes('Restordre'));
    await ctx.setOffline(false);
    // Links fra de andre apps
    await p.goto(ROOT + 'oversigt.html'); await p.waitForTimeout(100);
    check('W5 Restordre er skjult på oversigten (efter ønske)', (await p.locator('a[href="restordre/index.html"]').count()) === 0);
  }

  // Mobil
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(SIDE); await m.waitForTimeout(150);
  await m.fill('#soeg', 'omeprazol'); await m.waitForTimeout(150);
  check('M1 mobil: ingen vandret scroll af siden (tabellen ruller for sig)', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
