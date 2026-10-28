const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Kræftpakker: symptomer/fund → pakkeforløb efter hast, alders- og kønskriterier,
// PSA-grænser, RMI, børn, diagnostisk pakkeforløb, søgning, huskeskema og journalnotat.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const SIDE = process.env.BASE || ROOT + 'kraeft/kraeft.html';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(SIDE).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  await p.goto(SIDE); await p.waitForTimeout(150);

  // o: { alder, koen, ryger, post, sym[], psa, psa2, ca125, ul, soeg }
  async function saet(o = {}) {
    await p.click('#resetBtn');
    if (o.alder !== undefined) await p.fill('#alder', String(o.alder));
    if (o.koen) await p.check(`input[name="koen"][value="${o.koen}"]`);
    if (o.ryger) await p.check('#ryger');
    if (o.post) await p.check('#post');
    for (const s of o.sym || []) await p.check(`input[name="sym"][value="${s}"]`);
    if (o.psa !== undefined) await p.fill('#psa', String(o.psa));
    if (o.psa2) await p.check('#psa2');
    if (o.ca125 !== undefined) await p.fill('#ca125', String(o.ca125));
    if (o.ul !== undefined) await p.selectOption('#ulfund', String(o.ul));
    if (o.soeg) await p.fill('#soeg', o.soeg);
    await p.waitForTimeout(40);
    return p.locator('#output').innerText();
  }
  // Niveau (chip-tekst) for en pakke, "ikke" hvis den står under "Ikke indgangskriterium alene", ellers "".
  const niv = (id) => p.evaluate((id) => {
    const m = document.querySelector(`.pakke-match[data-pakke="${id}"] .chip`);
    if (m) return m.textContent;
    const navn = (window.KRAEFT_PAKKER.find((x) => x.id === id) || {}).navn;
    const ikke = [...document.querySelectorAll('#output .box h3')].find((h) => h.textContent === 'Ikke indgangskriterium alene');
    return ikke && ikke.closest('.box').textContent.includes(navn + ':') ? 'ikke' : '';
  }, id);
  const matchTekst = (id) => p.evaluate((id) => { const m = document.querySelector(`.pakke-match[data-pakke="${id}"]`); return m ? m.innerText : ''; }, id);
  const BEGR = 'Begrundet mistanke → pakkeforløb', UDR = 'Udredning eller filterfunktion først', OVV = 'Overvej', AKUT = 'Akut — ring nu';

  let out = await saet({});
  check('S1 start: vejledning og katalog med alle 26 pakker', out.includes('Find den rigtige kræftpakke') && (await p.locator('.katalog .pakke-kort').count()) === 26 && (await p.locator('.katalog details').first().getAttribute('open')) !== null);
  const navne = await p.evaluate(() => window.KRAEFT_PAKKER.map((x) => x.navn));
  check('S2 data: 26 pakker med kriterier, almen praksis og henvisning', navne.length === 26 && (await p.evaluate(() => window.KRAEFT_PAKKER.every((x) => x.id && x.navn && x.gruppe && (x.begrundet.length || x.mistanke.length) && x.gp.length && x.henvis))));

  // Urinveje
  await saet({ sym: ['makrohaem'] });
  check('U1 makroskopisk hæmaturi → begrundet mistanke, urologi', (await niv('urinveje')) === BEGR && (await matchTekst('urinveje')).includes('Urologisk afdeling'));
  await saet({ alder: 50, sym: ['mikrohaem', 'blaeresympt'] });
  const u2 = await niv('urinveje');
  await saet({ alder: 65, sym: ['mikrohaem', 'blaeresympt'] });
  check('U2 mikroskopisk hæmaturi med symptomer: under 60 ikke, over 60 begrundet', u2 === 'ikke' && (await niv('urinveje')) === BEGR);
  out = await saet({ alder: 70, sym: ['mikrohaem'] });
  check('U3 asymptomatisk mikroskopisk hæmaturi → ikke kræftudredning, link til nyre', (await niv('urinveje')) === 'ikke' && out.includes('ingen kræftudredning') && (await p.locator('#output a', { hasText: 'Kronisk nyresygdom' }).count()) === 1);

  // Lunge
  await saet({ alder: 55, sym: ['hoste'] });
  const l1 = await niv('lunge');
  await saet({ alder: 55, ryger: true, sym: ['hoste'] });
  const l2 = await niv('lunge'); const l2t = await matchTekst('lunge');
  await saet({ alder: 35, ryger: true, sym: ['hoste'] });
  check('L1 hoste: ikke-ryger ikke, ryger over 40 → CT, ryger under 40 ikke', l1 === 'ikke' && l2 === UDR && l2t.includes('CT af thorax') && (await niv('lunge')) === 'ikke');
  await saet({ alder: 30, sym: ['haemoptyse'] });
  check('L2 hæmoptyse uanset alder og rygning → CT', (await niv('lunge')) === UDR && (await matchTekst('lunge')).includes('uanset alder og rygning'));
  await saet({ sym: ['lungefund'] });
  check('L3 suspekt infiltrat → begrundet mistanke', (await niv('lunge')) === BEGR);

  // Prostata og PSA-aldersgrænser
  await saet({ alder: 65, koen: 'm', psa: 4.5 }); const p1 = await niv('prostata'); const p1t = await matchTekst('prostata');
  await saet({ alder: 65, koen: 'm', psa: 4.5, psa2: true }); const p2 = await niv('prostata');
  await saet({ alder: 65, koen: 'm', psa: 3.5 }); const p3 = await niv('prostata');
  await saet({ alder: 55, koen: 'm', psa: 3.5 }); const p4 = await niv('prostata');
  await saet({ alder: 75, koen: 'm', psa: 4.5 }); const p5 = await niv('prostata');
  check('P1 PSA-grænser 3/4/5 efter alder; to målinger → begrundet', p1 === UDR && p1t.includes('aldersgrænsen 4') && p2 === BEGR && p3 === 'ikke' && p4 === UDR && p5 === 'ikke', [p1, p2, p3, p4, p5].join(' | '));
  await saet({ koen: 'm', sym: ['dre'] });
  check('P2 suspekt rektaleksploration → begrundet mistanke', (await niv('prostata')) === BEGR);
  await saet({ koen: 'm', sym: ['luts'] });
  check('P3 LUTS alene → ikke indgangskriterium', (await niv('prostata')) === 'ikke');

  // Køn
  await saet({ koen: 'm', sym: ['dre'] });
  await p.check('input[name="koen"][value="k"]'); await p.waitForTimeout(40);
  check('G1 kvinde: mandlige fund skjult og tæller ikke; PSA-felt skjult', await p.locator('label[data-koen="m"]').first().isHidden() && (await niv('prostata')) === '' && await p.locator('#psaFelt').isHidden() && await p.locator('#postFelt').isVisible());
  await saet({ koen: 'k', sym: ['aksil'] }); const g2 = await niv('bryst');
  await saet({ koen: 'm', sym: ['aksil'] });
  check('G2 lymfeknude i armhulen: kvinde → bryst; mand → lymfom (og overvej bryst)', g2 === BEGR && (await niv('lymfom')) === BEGR && (await niv('bryst')) === OVV);

  // RMI
  await saet({ koen: 'k', post: true, ca125: 80, ul: 2, sym: ['abdtumor'] });
  check('R1 RMI 3 × 3 × 80 = 720 → begrundet mistanke', (await niv('aeggestok')) === BEGR && (await matchTekst('aeggestok')).includes('RMI 720'));
  await saet({ koen: 'k', ca125: 50, ul: 1 });
  check('R2 RMI 1 × 1 × 50 = 50 → overvej', (await niv('aeggestok')) === OVV && (await matchTekst('aeggestok')).includes('RMI 50'));
  await saet({ koen: 'k', ca125: 120 });
  check('R3 CA-125 uden ultralyd → udredning, RMI mangler', (await niv('aeggestok')) === UDR && (await matchTekst('aeggestok')).includes('ultralyd mangler'));

  // Akut og børn
  out = await saet({ alder: 60, sym: ['neuro'] });
  check('A1 progredierende fokale udfald → akut hjernekræft, rød boks øverst', (await niv('hjerne')) === AKUT && out.startsWith('Forslag: Hjernekræft') && (await p.locator('.pakke-match[data-pakke="hjerne"]').getAttribute('class')).includes('box-red'));
  await saet({ sym: ['blaster'] });
  check('A2 blaster → akut leukæmi med hæmatologisk bagvagt', (await niv('leukaemi')) === AKUT && (await matchTekst('leukaemi')).includes('hæmatologisk bagvagt'));
  out = await saet({ alder: 8, sym: ['abdtumor', 'feber'] });
  check('B1 barn 8 år: kun børnepakken (akut), voksenpakker udeladt', (await niv('boern')) === AKUT && (await p.locator('.pakke-match').count()) === 1 && out.includes('Voksenpakkerne er udeladt') && (await p.locator('#alderWarning').innerText()).includes('Under 18 år'));
  await saet({ alder: 12, sym: ['knoglesmerter'] });
  check('B2 barn med knoglesmerter → begrundet mistanke, børneafdeling', (await niv('boern')) === BEGR && (await matchTekst('boern')).includes('børneafdeling'));

  // Diagnostisk pakkeforløb
  await saet({ alder: 70, sym: ['vaegttab', 'traethed'] });
  check('D1 uspecifikke symptomer → diagnostisk pakkeforløb', (await niv('dpf')) === UDR && (await matchTekst('dpf')).includes('blodprøvepakke'));
  await saet({ alder: 70, sym: ['vaegttab', 'dysfagi'] });
  check('D2 vægttab + dysfagi → spiserør/mavesæk; DPF nedprioriteret', (await niv('spiseroer')) === BEGR && (await niv('dpf')) === OVV && (await matchTekst('dpf')).includes('organpakken'));
  await saet({ sym: ['metastase'] });
  check('D3 metastaser uden kendt primærtumor → DPF begrundet med fordeling', (await niv('dpf')) === BEGR && (await matchTekst('dpf')).includes('lungekræftpakken'));

  // Øvrige regler
  await saet({ alder: 30, sym: ['dyspepsi'] }); const d1 = await niv('spiseroer');
  await saet({ alder: 60, sym: ['dyspepsi'] });
  check('M1 dyspepsi: under 45 uden alarm ikke (H. pylori), 60 år → overvej gastroskopi', d1 === 'ikke' && (await niv('spiseroer')) === UDR);
  await saet({ sym: ['rektalbloed'] });
  check('M2 rektal blødning → tyk- og endetarm begrundet, overvej anal', (await niv('tyktarm')) === BEGR && (await niv('anal')) === OVV);
  await saet({ sym: ['mkomp', 'anaemi'] }); const my1 = await niv('myelom');
  await saet({ sym: ['mkomp'] });
  check('M3 M-komponent + anæmi → myelomatose; alene → overvej (MGUS)', my1 === BEGR && (await niv('myelom')) === OVV && (await matchTekst('myelom')).includes('MGUS'));
  await saet({ sym: ['lymfocytose'] }); const ly1 = await niv('lymfom');
  await saet({ sym: ['lymfocytose', 'splenomegali'] });
  check('M4 lymfocytose: isoleret → overvej hæmatolog; med milt → begrundet', ly1 === OVV && (await niv('lymfom')) === BEGR);
  await saet({ sym: ['halsglands'] });
  check('M5 lymfeknude på halsen → øre-næse-halslæge (filter)', (await niv('hovedhals')) === UDR && (await matchTekst('hovedhals')).includes('øre-næse-halslæge'));
  await saet({ koen: 'k', sym: ['pmb'] });
  check('M6 blødning efter menopausen → livmoderkræft via gynækolog', (await niv('livmoder')) === UDR && (await matchTekst('livmoder')).includes('gynækolog'));

  // Hvert symptom giver mindst én pakke (ingen døde afkrydsninger)
  const ids = await p.evaluate(() => [...document.querySelectorAll('input[name="sym"]')].map((i) => ({ id: i.value, koen: i.closest('label').dataset.koen || '' })));
  const doede = [];
  for (const s of ids) {
    await saet({ alder: 65, koen: s.koen || undefined, ryger: true, sym: [s.id] });
    const n = await p.evaluate(() => document.querySelectorAll('.pakke-match').length + [...document.querySelectorAll('#output .box h3')].filter((h) => h.textContent === 'Ikke indgangskriterium alene').length);
    if (!n) doede.push(s.id);
  }
  check(`Y1 alle ${ids.length} symptomer/fund giver mindst én pakke`, ids.length > 60 && !doede.length, doede.join(', '));

  // Søgning
  out = await saet({ soeg: 'hæmaturi' });
  check('Q1 søgning "hæmaturi": symptomer og pakke vises, afkrydsninger fremhæves', out.includes('Søgning: "hæmaturi"') && out.includes('Kræft i blære og nyre') && (await p.locator('label.symptom-match').count()) === 2);
  await p.click('button[data-vaelg="makrohaem"]'); await p.waitForTimeout(40);
  check('Q2 klik på symptom i søgningen afkrydser det og rydder søgningen', await p.isChecked('input[name="sym"][value="makrohaem"]') && (await p.inputValue('#soeg')) === '' && (await niv('urinveje')) === BEGR);
  out = await saet({ soeg: 'xyzq' });
  check('Q3 ingen træffere → hjælpetekst', out.includes('Intet fundet'));
  await saet({ soeg: 'psa' });
  check('Q4 søgning "psa" finder prostatakræft (åben)', (await p.locator('.soegeresultat details[open] summary', { hasText: 'Prostatakræft' }).count()) === 1);

  // Journal
  await saet({ alder: 70, koen: 'm', sym: ['makrohaem', 'luts'] });
  await p.click('#copyBtn'); await p.waitForTimeout(80);
  let j = await p.evaluate(() => navigator.clipboard.readText());
  check('J1 journal: patient, fund, pakke med plan og information om begrundet mistanke', j.startsWith('Kræftpakke-vurdering') && j.includes('Patient: 70 år, mand.') && j.includes('Symptomer/fund: Synligt blod i urinen') && j.includes('Kræft i blære og nyre (urinvejene): Begrundet mistanke → pakkeforløb.') && j.includes('Plan: Urologisk afdeling') && j.includes('informeret om begrundet mistanke') && !j.includes('Prostatakræft'), j);
  await p.uncheck('input[data-journal="urinveje"]');
  await p.click('#copyBtn'); await p.waitForTimeout(80);
  j = await p.evaluate(() => navigator.clipboard.readText());
  check('J2 fravalgt pakke kommer ikke med; sikkerhedsnet i stedet', !j.includes('Kræft i blære') && j.includes('Sikkerhedsnet'), j);
  await p.click('#copyFullBtn'); await p.waitForTimeout(80);
  const fuld = await p.evaluate(() => navigator.clipboard.readText());
  check('J3 fuld vurdering uden katalog', fuld.includes('KRÆFT I BLÆRE OG NYRE') && fuld.includes('Hvorfor:') && !fuld.includes('ALLE PAKKEFORLØB'));

  // Region Midtjylland: lokale veje og numre, egne numre i browseren
  check('L0 Region Midtjylland er valgt som standard', (await p.inputValue('#region')) === 'midt');
  await saet({ alder: 70, sym: ['vaegttab'] });
  check('L1 diagnostisk pakkeforløb: diagnostiske klinikker med telefonlink', (await matchTekst('dpf')).includes('Region Midtjylland:') && (await matchTekst('dpf')).includes('Klinik for Lungesygdomme og Medicinsk Diagnostik') && (await matchTekst('dpf')).includes('lok.nr. 5790002002489') && (await p.locator('.pakke-match[data-pakke="dpf"] a[href="tel:+4551449083"]').count()) === 1);
  await saet({ alder: 60, sym: ['neuro'] });
  const h2 = await matchTekst('hjerne');
  check('L2 hjerne → neurologi på AUH, Gødstrup og Viborg med kræftnumre og MR-kontraindikationer', ['78 45 42 88', '78 43 09 20', '78 44 60 22', 'kontraindikationer for MR'].every((x) => h2.includes(x)));
  await saet({ koen: 'k', sym: ['pmb'] });
  check('L3 gynækologisk kræft → Fælles gynækologisk visitation og AUH-forløbskoordinator', (await matchTekst('livmoder')).includes('Fælles gynækologisk visitation: 78 42 64 13 · lok.nr. 5790002011504') && (await matchTekst('livmoder')).includes('78 45 37 23 (man. 10–14, tirs.–fre. 9–14)'));
  await saet({ sym: ['blaster'] });
  check('L4 hæmatologi → forløbskoordinator og bagvagt', (await matchTekst('leukaemi')).includes('78 45 58 43'));
  await saet({ sym: ['halsglands'] });
  check('L5 hoved-hals → praktiserende ØNH-læge og AUH-forløbskoordinator', (await matchTekst('hovedhals')).includes('78 45 40 20') && (await matchTekst('hovedhals')).includes('praktiserende øre-næse-halslæge'));
  out = await saet({ sym: ['lungefund'] });
  check('L6 lunge → billeddiagnostisk afdeling, "Lungekræft OBS PRO", Horsens-området til AUH', (await matchTekst('lunge')).includes('Lungekræft OBS PRO') && (await matchTekst('lunge')).includes('Skanderborg'));
  const henv = await p.evaluate(() => [...document.querySelectorAll('#output .box h3')].find((h) => h.textContent === 'Sådan henviser du').closest('.box').textContent);
  check('L7 "Sådan henviser du" har hospitalernes hovednumre', henv.includes('Regionshospitalet Gødstrup: 78 43 00 00') && henv.includes('Hospitalsenhed Midt — Viborg: 78 44 00 00') && henv.includes('Regionshospitalet Horsens: 78 42 50 00'));
  await saet({ koen: 'm', sym: ['testis'] });
  check('L11 testikel → Røntgen og Skanning, AUH med direkte nummer', (await matchTekst('testikel')).includes('21 34 17 74') && (await matchTekst('testikel')).includes('Røntgen og Skanning'));
  await saet({ alder: 8, sym: ['abdtumor'] });
  check('L12 barn → vagthavende på børneafdelingen', (await matchTekst('boern')).includes('vagthavende') && (await matchTekst('boern')).includes('78 45 17 01'));
  await saet({ sym: ['lungefund'] });
  await p.fill('input[data-egen="lunge"] >> nth=0', 'Røntgen direkte 1234 5678'); await p.waitForTimeout(40);
  await p.reload(); await p.waitForTimeout(150);
  await saet({ sym: ['lungefund'] });
  check('L8 egne numre gemmes i browseren og vises igen (også i kataloget)', (await p.inputValue('.pakke-match[data-pakke="lunge"] input[data-egen="lunge"]')) === 'Røntgen direkte 1234 5678' && (await p.locator('.katalog input[data-egen="lunge"]').inputValue()) === 'Røntgen direkte 1234 5678');
  await p.click('#copyFullBtn'); await p.waitForTimeout(80);
  check('L9 fuld vurdering har regionens henvisningsvej', (await p.evaluate(() => navigator.clipboard.readText())).includes('Lungekræft OBS PRO'));
  await p.selectOption('#region', ''); await p.waitForTimeout(40);
  await saet({ sym: ['lungefund'] });
  const l10 = await matchTekst('lunge');
  check('L10 uden region: ingen lokale numre, men egne numre og valget bevares ved Nulstil', !l10.includes('Region Midtjylland:') && (await p.inputValue('#region')) === '' && (await p.locator('.pakke-match[data-pakke="lunge"] input[data-egen="lunge"]').count()) === 1);
  await p.selectOption('#region', 'midt');
  await p.evaluate(() => localStorage.clear());

  // Huskeskema har de samme pakker og kriterier som værktøjet
  const husk = await (await p.request.get(ROOT + 'kraeft/huskeskema.html')).text();
  const data = await p.evaluate(() => window.KRAEFT_PAKKER.map((x) => ({ navn: x.navn, k: (x.begrundet[0] || x.mistanke[0]) })));
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const mangler = data.filter((x) => !husk.includes(esc(x.navn)) || !husk.includes(esc(x.k)));
  check('H1 huskeskema svarer til pakker.js', !!husk && !mangler.length, mangler.map((x) => x.navn).join(', '));
  check('H2 huskeskema har Region Midtjyllands henvisningsveje og numre', husk.includes('Region Midtjylland — henvisningsveje og numre') && husk.includes('href="tel:+4551449083"') && husk.includes('78 45 37 23'));

  const m = await ctx.newPage(); await m.setViewportSize({ width: 360, height: 800 });
  await m.goto(SIDE); await m.check('input[name="sym"][value="makrohaem"]'); await m.check('input[name="sym"][value="neuro"]'); await m.waitForTimeout(150);
  check('Z1 ingen vandret scroll på mobil', await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('Z2 ingen JavaScript-fejl', errors.length === 0, errors.join(' | '));
  console.log('FAILS:', fails); await b.close();
})();
