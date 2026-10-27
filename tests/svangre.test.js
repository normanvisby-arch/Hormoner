const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Svangreundersøgelser: termin, konsultation, tjekliste, risikovurdering,
// alarmfund, efterundersøgelse, journalnotat og app. BASE kan pege på et bygget artifact af svangre.html.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SIDE = process.env.BASE || ROOT + 'svangre/svangre.html';
const ARTIFACT = !!process.env.BASE;
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(SIDE); await p.waitForTimeout(200);

  // Nulstil og udfyld. o: { dato, sm, cyklus, ul, kons, alder, hoejde, vaegt, vaegtNu, paritet, grav[], rhd, risiko[], prepred, bt, protein, urin[], sf, hjertelyd, sym[], forloeb[], btE, epds, selvskade }
  async function saet(o = {}) {
    await p.click('#resetBtn');
    await p.fill('#dato', o.dato || '2026-10-27');
    if (o.sm) await p.fill('#sm', o.sm);
    if (o.cyklus) await p.fill('#cyklus', String(o.cyklus));
    if (o.ul) await p.fill('#ultermin', o.ul);
    if (o.kons) await p.check(`input[name="kons"][value="${o.kons}"]`);
    if (o.alder) await p.fill('#alder', String(o.alder));
    if (o.hoejde) await p.fill('#hoejde', String(o.hoejde));
    if (o.vaegt) await p.fill('#vaegtFoer', String(o.vaegt));
    if (o.vaegtNu) await p.fill('#vaegtNu', String(o.vaegtNu));
    if (o.paritet) await p.check(`input[name="paritet"][value="${o.paritet}"]`);
    for (const g of o.grav || []) await p.check(`input[name="graviditet"][value="${g}"]`);
    if (o.rhd) await p.check(`input[name="rhd"][value="${o.rhd}"]`);
    if (o.antistof) await p.check(`input[name="antistof"][value="${o.antistof}"]`);
    if (o.antistofType) await p.selectOption('#antistofType', o.antistofType);
    if (o.fosterRhd) await p.check(`input[name="fosterRhd"][value="${o.fosterRhd}"]`);
    for (const r of o.risiko || []) await p.check(`input[name="risiko"][value="${r}"]`);
    if (o.prepred) await p.check(`input[name="prepred"][value="${o.prepred}"]`);
    if (o.bt) { await p.fill('#bts', String(o.bt[0])); await p.fill('#btd', String(o.bt[1])); }
    if (o.protein) await p.selectOption('#protein', String(o.protein));
    for (const u of o.urin || []) await p.check(`input[name="urin"][value="${u}"]`);
    if (o.sf) await p.fill('#sf', String(o.sf));
    if (o.hjertelyd) await p.check(`input[name="hjertelyd"][value="${o.hjertelyd}"]`);
    for (const s of o.sym || []) await p.check(`input[name="sym"][value="${s}"]`);
    for (const f of o.forloeb || []) await p.check(`input[name="forloeb"][value="${f}"]`);
    if (o.btE) { await p.fill('#btsE', String(o.btE[0])); await p.fill('#btdE', String(o.btE[1])); }
    if (o.epds !== undefined) await p.fill('#epds', String(o.epds));
    if (o.selvskade) await p.check('input[name="efterSym"][value="selvskade"]');
    await p.waitForTimeout(60);
    return p.locator('#output').innerText();
  }
  const boks = (titel) => p.evaluate((t) => { const h = [...document.querySelectorAll('#output .box h3')].find((x) => x.textContent.includes(t)); return h ? h.closest('.box').innerText : ''; }, titel);
  const klasse = (titel) => p.evaluate((t) => { const h = [...document.querySelectorAll('#output .box h3')].find((x) => x.textContent.includes(t)); return h ? h.closest('.box').className : ''; }, titel);
  const tjek = () => p.evaluate(() => [...document.querySelectorAll('.tjekliste input')].map((i) => i.closest('label').textContent.trim()));
  const journal = async () => { await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(SIDE).origin }); await p.click('#copyBtn'); await p.waitForTimeout(100); return p.evaluate(() => navigator.clipboard.readText()); };

  // ---------------- Termin og graviditetsalder ----------------
  let out = await saet({ sm: '2026-08-25' });
  check('T1 termin = sidste menstruation + 280 dage', out.includes('Termin 1. jun. 2027') && out.includes('uge 9+0'), out.slice(0, 160));
  out = await saet({ sm: '2026-08-25', cyklus: 35 });
  check('T2 lang cyklus forskyder terminen (+7 dage)', out.includes('Termin 8. jun. 2027') && out.includes('uge 8+0'));
  out = await saet({ sm: '2026-08-25', ul: '2027-05-25' });
  check('T3 ultralydstermin bruges og afvigelse nævnes', out.includes('Termin 25. maj 2027 (efter ultralyd)') && out.includes('uge 10+0') && out.includes('afviger 7 dage'));
  out = await saet({});
  check('T4 uden datoer: beder om sidste menstruation', out.includes('Angiv første dag i sidste menstruation'));
  out = await saet({ sm: '2026-11-20' });
  check('T5 advarsel ved menstruation efter konsultationsdato', (await p.locator('#datoWarning').innerText()).includes('efter konsultationsdatoen'));

  // ---------------- Konsultation vælges ud fra graviditetsugen ----------------
  out = await saet({ sm: '2026-05-05' }); // GA 25+0
  check('K1 uge 25 → 2. graviditetsundersøgelse', out.startsWith('2. graviditetsundersøgelse') && out.includes('uge 25+0'), out.slice(0, 80));
  out = await saet({ sm: '2026-03-17' }); // GA 32+0
  check('K2 uge 32 → 3. graviditetsundersøgelse', out.startsWith('3. graviditetsundersøgelse'));
  out = await saet({ sm: '2025-12-01' }); // > 44 uger
  check('K3 efter terminen → efterundersøgelse', out.startsWith('Efterundersøgelse') && !(await p.locator('#efterFelter').isHidden()) && (await p.locator('#fundFelter').isHidden()));
  out = await saet({ sm: '2026-05-05', kons: '1' });
  check('K4 manuelt valg uden for vinduet giver advarsel', out.includes('1. graviditetsundersøgelse anbefales i uge 6–10') && (await klasse('1. graviditetsundersøgelse')).includes('box-amber'));
  check('K5 SF-mål og hjertelyd skjules ved 1. undersøgelse', await p.locator('#sfFelt').isHidden() && await p.locator('#hjertelydFelt').isHidden());

  // ---------------- Tjekliste ----------------
  await saet({ sm: '2026-08-25' });
  let t = await tjek();
  check('L1 1. undersøgelse: kerneindhold', ['Terminsberegning', 'Blodtryk', 'Urinstix', 'blodtype (AB0 og RhD)', 'hepatitis B, hiv og syfilis', 'fosterdiagnostik', 'graviditetsdiabetes', 'præeklampsi', 'Folsyre 400', 'Omsorgsniveau', 'Vandrejournal'].every((k) => t.some((x) => x.includes(k))), t.length + ' punkter');
  check('L2 ingen recept på ASA uden indikation', !t.some((x) => x.includes('Recept på acetylsalicylsyre')));
  await p.locator('.tjekliste input').nth(0).check(); await p.locator('.tjekliste input').nth(5).check(); await p.waitForTimeout(50);
  check('L3 status tæller afkrydsninger', (await p.locator('#tjekStatus').innerText()) === `2 af ${t.length} gennemgået`);
  await p.fill('#alder', '29'); await p.waitForTimeout(50);
  check('L4 afkrydsninger huskes ved genberegning', (await p.locator('.tjekliste input:checked').count()) === 2);
  let j = await journal();
  check('L5 journalnotat: gennemgået og ikke afkrydset', j.includes('Gennemgået: Terminsberegning') && j.includes('Blodtryk') && j.includes('Ikke afkrydset (tilpas):'), j.split('\n').slice(-2).join(' | '));
  await p.click('#resetBtn'); await p.waitForTimeout(50);
  check('L6 nulstil fjerner afkrydsninger og sætter dagens dato', (await p.locator('.tjekliste input:checked').count()) === 0 && (await p.inputValue('#dato')) === new Date().toISOString().slice(0, 10));
  await saet({ sm: '2026-05-05', rhd: 'neg' });
  t = await tjek();
  check('L7 2. undersøgelse: SF, hjertelyd, kighoste og RhD-prøve', ['Symfyse-fundus', 'hjertelyd', 'Kighostevaccination (anbefales i uge 25)', 'RhD-negativ: blodprøve'].every((k) => t.some((x) => x.includes(k))));
  await saet({ sm: '2026-03-17', rhd: 'neg' }); // termin 22.12.2026 → RSV
  t = await tjek();
  check('L8 3. undersøgelse: RSV ved termin i december, anti-D og efteraftale', t.some((x) => x.startsWith('RSV-vaccination')) && t.some((x) => x.includes('Anti-D givet i uge 29')) && t.some((x) => x.includes('efterundersøgelse')));
  out = await saet({ sm: '2025-07-01', dato: '2026-03-10' }); // termin 6.4.2026 → ingen RSV
  t = await tjek();
  check('L9 termin i april: intet RSV-punkt', !t.some((x) => x.startsWith('RSV')) && (await p.evaluate(() => [...document.querySelectorAll('#output h3')].find((x) => x.textContent.includes('Vaccinationer')).closest('.box').textContent)).includes('gælder ikke'));
  await saet({ sm: '2026-08-25', dato: '2026-06-10' });
  t = await tjek();
  check('L10 influenza kun i sæsonen', !t.some((x) => x.includes('Influenza')));

  // ---------------- Graviditetsdiabetes ----------------
  await saet({ sm: '2026-08-25', risiko: ['famDM'] });
  let g = await boks('Graviditetsdiabetes');
  check('G1 1 risikofaktor → OGTT uge 24–28', g.includes('OGTT i uge 24–28') && !g.includes('Tidlig OGTT'), g.slice(0, 200));
  await saet({ sm: '2026-08-25', risiko: ['tidlGDM'] });
  g = await boks('Graviditetsdiabetes');
  check('G2 tidligere GDM → tidlig OGTT og igen 24–28', g.includes('Tidlig OGTT i uge 10–20') && g.includes('igen i uge 24–28'));
  await saet({ sm: '2026-08-25', hoejde: 165, vaegt: 75, risiko: ['pcos'] });
  g = await boks('Graviditetsdiabetes');
  check('G3 BMI ≥ 27 + PCOS = 2 faktorer → tidlig OGTT', g.includes('BMI 27,5') && g.includes('Tidlig OGTT'));
  await saet({ sm: '2026-08-25', urin: ['glukose'] });
  check('G4 glukosuri → OGTT snarest', (await boks('Graviditetsdiabetes')).includes('OGTT snarest') && (await boks('Fund der skal følges op')).includes('Glukosuri'));
  await saet({ sm: '2026-08-25', risiko: ['dm'] });
  check('G5 kendt diabetes → ingen GDM-screening, henvisning', (await boks('Kendt diabetes')).includes('Ikke screening') && (await boks('Henvisning')).includes('prægestationel diabetes'));
  await saet({ sm: '2026-08-25', hoejde: 170, vaegt: 60 });
  check('G6 ingen risikofaktorer → ingen OGTT', (await boks('Graviditetsdiabetes')).includes('Ingen markerede risikofaktorer'));

  // ---------------- Præeklampsi og acetylsalicylsyre ----------------
  await saet({ sm: '2026-08-25', paritet: '1', risiko: ['hypertension'], prepred: 'nej' });
  let pe = await boks('Præeklampsi');
  check('P1 kronisk hypertension → ASA anbefales med datoer', pe.includes('acetylsalicylsyre anbefales') && pe.includes('150 mg til natten') && pe.includes('start 03.11.2026') && pe.includes('stop 04.05.2027'), pe.slice(0, 260));
  t = await tjek();
  check('P2 recept på ASA i tjeklisten', t.some((x) => x.includes('Recept på acetylsalicylsyre 150 mg')));
  await saet({ sm: '2026-08-25', alder: 41, prepred: 'nej' }); // første fødsel + alder ≥ 40
  pe = await boks('Præeklampsi');
  check('P3 2 moderate faktorer → ASA kan overvejes', pe.includes('acetylsalicylsyre overvejes') && pe.includes('første fødsel') && pe.includes('alder 41'));
  await saet({ sm: '2026-08-25', alder: 30, prepred: 'nej' });
  check('P4 kun 1 moderat faktor → ikke indiceret', (await boks('Præeklampsi')).includes('ikke indiceret'));
  await saet({ sm: '2026-08-25', risiko: ['sle'], prepred: 'ja' });
  pe = await boks('Præeklampsi');
  check('P5 PREPRED-fødested: risiko afgøres ved nakkefoldsscanningen', pe.includes('screening ved nakkefoldsscanningen') && !(await tjek()).some((x) => x.includes('Recept')));
  await saet({ sm: '2026-05-05', risiko: ['nyre'], prepred: 'nej' }); // uge 25
  check('P6 uge 25: start ikke ASA nu', (await boks('Præeklampsi')).includes('start ikke acetylsalicylsyre nu'));
  await saet({ sm: '2026-08-25', risiko: ['tidlPEsvaer'] });
  pe = await boks('Præeklampsi');
  check('P7 "ved ikke": både DSOG og PREPRED nævnes', pe.includes('anbefales') && pe.includes('PREPRED'));

  // ---------------- Alarmfund ----------------
  await saet({ sm: '2026-03-17', bt: [165, 100] });
  let r = await boks('Handling nu');
  check('A1 BT ≥ 160 → akut', r.includes('svær hypertension') && r.includes('akut'), r);
  await saet({ sm: '2026-03-17', bt: [145, 92], protein: 2 });
  r = await boks('Handling nu');
  check('A2 BT ≥ 140/90 efter uge 20 → samme dag', r.includes('med proteinuri') && r.includes('samme dag'));
  await saet({ sm: '2026-08-25', bt: [146, 94] });
  check('A3 BT ≥ 140/90 før uge 20 → kronisk hypertension (opfølgning)', (await boks('Fund der skal følges op')).includes('kronisk hypertension') && !(await boks('Handling nu')));
  await saet({ sm: '2026-03-17', bt: [118, 72], sym: ['pe'] });
  check('A4 præeklampsisymptomer → akut også ved normalt BT', (await boks('Handling nu')).includes('HELLP'));
  await saet({ sm: '2026-03-17', sym: ['fosterbev'], hjertelyd: 'nej' });
  r = await boks('Handling nu');
  check('A5 nedsatte fosterbevægelser og manglende hjertelyd → akut', r.includes('fosterbevægelser') && r.includes('hjertelyd ikke hørt'));
  await saet({ sm: '2026-08-25', sym: ['bloedning'] });
  check('A6 blødning i 1. trimester → vurdering (ikke fødeafdeling)', (await boks('Fund der skal følges op')).includes('ekstrauterin') && !(await boks('Handling nu')));
  await saet({ sm: '2026-03-17', sym: ['bloedning', 'veer'] });
  r = await boks('Handling nu');
  check('A7 blødning og veer i 3. trimester → akut', r.includes('Vaginal blødning') && r.includes('for tidlig fødsel'));
  await saet({ sm: '2026-03-17', sf: 26 });
  check('A8 SF 26 cm i uge 32 → ultralyd', (await boks('Fund der skal følges op')).includes('afviger 6 cm under'));
  await saet({ sm: '2026-03-17', sf: 31 });
  check('A9 SF 31 cm i uge 32 → ingen advarsel', !(await boks('Fund der skal følges op')));
  await saet({ sm: '2026-05-05', protein: 2 });
  check('A10 proteinuri 2+ med normalt BT → kvantificér', (await boks('Fund der skal følges op')).includes('kvantificér'));
  await saet({ sm: '2026-05-05', urin: ['bakteriuri'], sym: ['kloe'] });
  const fo = await boks('Fund der skal følges op');
  check('A11 bakteriuri og kløe → dyrkning og galdesyrer', fo.includes('urindyrkning') && fo.includes('galdesyrer'));
  check('A12 link til Urinvejsinfektioner', (await p.locator('#output a', { hasText: 'Urinvejsinfektioner' }).count()) >= 1 && fo.includes('Urinvejsinfektioner'));

  // ---------------- RhD, henvisning og omsorgsniveau ----------------
  await saet({ sm: '2026-08-25', rhd: 'neg' });
  const rh = await boks('RhD-negativ');
  check('R1 RhD-negativ: uge 25 og anti-D uge 29 med datoer', rh.includes('Uge 25 (16.02.2027)') && rh.includes('Uge 29 (16.03.2027)') && rh.includes('72 timer'));
  const tabel = () => p.evaluate(() => { const h = [...document.querySelectorAll('#output h3')].find((x) => x.textContent.startsWith('Prøver og svar')); return h ? [...h.closest('.box').querySelectorAll('tbody tr')].map((tr) => tr.textContent) : []; });
  let pr = await tabel();
  check('P1 1. undersøgelse: prøvetabel med blodtype, infektioner, urin, Hb og doubletest', ['Blodtype (AB0 og RhD)', 'Hepatitis B (HBsAg), hiv og syfilis', 'Urinstix og bakteriuri', 'Hb < 6,8 mmol/l', 'Doubletest'].every((k) => pr.some((x) => x.includes(k))), pr.length + ' rækker');
  check('P2 handling ved positiv hepatitis B og anæmigrænser', pr.some((x) => x.includes('vaccine og immunglobulin ved fødslen')) && pr.some((x) => x.includes('ferritin < 30')));
  await saet({ sm: '2026-08-25', risiko: ['tidlGDM'], alder: 22 });
  pr = await tabel();
  check('P3 tidlig OGTT med dato og klamydia under 25 år', pr.some((x) => x.startsWith('OGTT (tidlig)') && x.includes('03.11.2026') && x.includes('≥ 9,0 mmol/l')) && pr.some((x) => x.startsWith('Klamydia')));
  await saet({ sm: '2026-05-05', rhd: 'pos' });
  pr = await tabel();
  check('P4 2. undersøgelse RhD-positiv: ingen ny blodtypeprøve; bakteriuri og misdannelsesskanning', pr.some((x) => x.includes('Ikke rutinemæssigt i uge 25')) && pr.some((x) => x.includes('2. screening for asymptomatisk bakteriuri')) && pr.some((x) => x.startsWith('Misdannelsesskanning')));
  check('P5 RhD-positiv: ingen profylakse og intet felt for fosterets RhD', (await boks('Rhesus (RhD)')).includes('ingen anti-D-profylakse') && await p.locator('#fosterRhdFelt').isHidden());
  await saet({ sm: '2026-05-05', rhd: 'neg' });
  pr = await tabel();
  check('P6 2. undersøgelse RhD-negativ: antistoffer og fosterets RhD med dato', pr.some((x) => x.startsWith('Irregulære antistoffer og fosterets RhD-type') && x.includes('Uge 25 (')) && !(await p.locator('#fosterRhdFelt').isHidden()));
  await saet({ sm: '2026-03-17', rhd: 'neg', fosterRhd: 'neg' });
  const rn = await boks('Rhesus (RhD)');
  t = await tjek();
  const tln = await p.evaluate(() => [...document.querySelectorAll('.tidslinje tbody tr')].map((tr) => tr.textContent));
  check('RH1 fosteret RhD-negativt: ingen anti-D i uge 29 eller efter fødslen', rn.includes('Uge 29') && rn.includes('ingen anti-D (fosteret RhD-negativt)') && rn.includes('Efter fødslen: ingen anti-D') && t.some((x) => x.includes('Fosteret RhD-negativt: ingen anti-D')) && !tln.some((x) => x.includes('Anti-D')));
  await saet({ sm: '2026-03-17', rhd: 'neg', fosterRhd: 'inkonkl' });
  const ri = await boks('Rhesus (RhD)');
  check('RH2 inkonklusivt svar: behandles som RhD-positivt, navlesnorsblod', ri.includes('Inkonklusivt svar') && ri.includes('navlesnorsblod') && ri.includes('anti-D 250–300 mikrog. i.m.'));
  check('RH3 doser ved blødning efter uge', ri.includes('Til og med uge 6: ikke indiceret') && ri.includes('Uge 8–19: 100–150 mikrog.') && ri.includes('Fra uge 20: 250–300 mikrog.') && ri.includes('passiv anti-D'));
  await saet({ sm: '2026-05-05', rhd: 'neg', antistof: 'pos', antistofType: 'antiD' });
  const ra = await boks('Rhesus og blodtypeantistoffer');
  check('RH4 immuniseret: ingen profylakse, henvisning og fund', ra.includes('anti-D-profylakse har ingen effekt') && (await klasse('Rhesus og blodtypeantistoffer')).includes('box-amber') && (await boks('Henvisning')).includes('irregulære blodtypeantistoffer') && (await boks('Fund der skal følges op')).includes('Irregulære blodtypeantistoffer påvist') && await p.locator('#fosterRhdFelt').isHidden());
  t = await tjek();
  check('RH5 immuniseret: ingen uge 25-prøve i tjeklisten', t.some((x) => x.includes('følges af obstetrisk afdeling')) && !t.some((x) => x.includes('blodprøve til irregulære antistoffer og fosterets')));
  await saet({ sm: '2026-08-25', antistof: 'pos', antistofType: 'cK', rhd: 'pos' });
  check('RH6 anti-c/anti-K hos RhD-positiv → højt specialiseret fødested', (await boks('Rhesus og blodtypeantistoffer')).includes('uanset titer') && (await boks('Henvisning')).includes('højt specialiseret'));
  await saet({ sm: '2026-05-05', rhd: 'neg', antistof: 'pos', antistofType: 'passiv' });
  const rp = await boks('Rhesus (RhD)');
  check('RH7 passiv anti-D er ikke immunisering', rp.includes('Passiv anti-D') && rp.includes('Uge 29') && !(await boks('Henvisning')).includes('antistoffer'));
  await saet({ sm: '2026-09-01', rhd: 'neg', sym: ['bloedning'] });
  check('RH8 blødning i 1. trimester hos RhD-negativ → anti-D fra uge 8', (await boks('Fund der skal følges op')).includes('anti-D inden 72 timer fra uge 8'));
  await saet({ kons: 'efter', rhd: 'neg' });
  t = await tjek();
  pr = await tabel();
  check('RH9 efterundersøgelse RhD-negativ: anti-D efter fødslen tjekkes', t.some((x) => x.includes('anti-D givet inden 72 timer efter fødslen')) && pr.some((x) => x.startsWith('Anti-D efter fødslen')) && (await boks('Rhesus (RhD)')).includes('epikrisen'));

  await saet({ sm: '2026-08-25', risiko: ['stoffer'] });
  check('R2 rusmidler → omsorgsniveau 4 og underretning', (await boks('Henvisning')).includes('Omsorgsniveau 4') && (await boks('Henvisning')).includes('graviditetsunderretning'));
  await saet({ sm: '2026-08-25', risiko: ['psykisk'] });
  check('R3 psykisk sygdom → niveau 3 og medicingennemgang', (await boks('Henvisning')).includes('Omsorgsniveau 3') && (await boks('Henvisning')).includes('pro.medicin.dk'));
  await saet({ sm: '2026-08-25', paritet: '1', risiko: ['vte'], grav: ['flerfold'] });
  const hv = await boks('Henvisning');
  check('R4 VTE og flerfold → henvisning og niveau 2', hv.includes('lavmolekylært heparin') && hv.includes('flerfoldsgraviditet') && hv.includes('Omsorgsniveau 2'));
  await saet({ sm: '2026-08-25', paritet: '1', alder: 30, hoejde: 170, vaegt: 60 });
  check('R5 ingen risikofaktorer → niveau 1', (await boks('Henvisning')).includes('Omsorgsniveau 1'));
  await saet({ sm: '2026-08-25', risiko: ['thyreoidea', 'ntd'] });
  t = await tjek();
  check('R6 thyreoidea og neuralrørsdefekt → TSH-punkt og folsyre 5 mg', t.some((x) => x.includes('levothyroxin øges 20–30 %')) && t.some((x) => x.startsWith('Folsyre 5 mg')) && (await boks('Henvisning')).includes('Hypothyreose'));

  // ---------------- Kosttilskud, vægt og tidslinje ----------------
  await saet({ sm: '2026-05-05', hoejde: 165, vaegt: 64, vaegtNu: 72 });
  const ks = await p.evaluate(() => { const h = [...document.querySelectorAll('#output h3')].find((x) => x.textContent.includes('Kosttilskud')); return h.closest('.box').querySelector('details').textContent; });
  check('V1 BMI 23,5 → 11,5–16 kg, vægtøgning 8 kg', ks.includes('BMI før graviditeten 23,5') && ks.includes('11,5–16 kg') && ks.includes('indtil nu: 8 kg'), ks.slice(-200));
  const tl = await p.evaluate(() => [...document.querySelectorAll('.tidslinje tbody tr')].map((tr) => ({ t: tr.textContent, c: tr.className })));
  check('V2 tidslinje: nakkefold passeret, 2. undersøgelse aktuel', tl.find((x) => x.t.includes('Nakkefold')).c === 'passeret' && tl.find((x) => x.t.includes('2. graviditetsundersøgelse')).c === 'nu' && tl.some((x) => x.t.includes('Termin')), JSON.stringify(tl.map((x) => x.c)));

  // ---------------- Efterundersøgelse ----------------
  await saet({ kons: 'efter', forloeb: ['gdm', 'pe', 'ammer'], btE: [148, 95], epds: 14 });
  t = await tjek();
  check('E1 efterundersøgelse: HbA1c efter GDM og BT efter præeklampsi', t.some((x) => x.includes('HbA1c ca. 3 måneder')) && t.some((x) => x.includes('Efter præeklampsi')) && t.some((x) => x.includes('EPDS')));
  const fe = await boks('Fund der skal følges op');
  check('E2 EPDS 14 og BT 148/95 → opfølgning', fe.includes('EPDS 14') && fe.includes('BT 148/95'));
  check('E3 ammevenlig prævention og link', (await boks('Efter fødslen')).includes('ammer — gestagenpræparater') && (await p.locator('#output a', { hasText: 'Præventionsguide' }).count()) === 1);
  await saet({ kons: 'efter', selvskade: true, btE: [162, 100] });
  r = await boks('Handling nu');
  check('E4 selvskade og BT 162/100 → handling nu', r.includes('selvmordsrisikoen') && r.includes('svær hypertension efter fødslen'));
  check('E5 ingen ASA-/OGTT-bokse efter fødslen', !(await boks('Præeklampsi —')) && !(await boks('Graviditetsdiabetes')));

  // ---------------- Journalnotat ----------------
  await saet({ sm: '2026-08-25', alder: 34, hoejde: 168, vaegt: 70, rhd: 'neg', risiko: ['famDM', 'hypertension'], prepred: 'nej', bt: [132, 84] });
  j = await journal();
  check('J1 journal: overskrift, GA, termin og basis', j.startsWith('1. graviditetsundersøgelse 27.10.2026') && j.includes('GA 9+0, termin 01.06.2027') && j.includes('34 år') && j.includes('RhD-negativ'), j.split('\n').slice(0, 2).join(' | '));
  check('J2 journal: fund, GDM, ASA, RhD og henvisning', j.includes('BT 132/84') && j.includes('OGTT uge 24–28') && j.includes('acetylsalicylsyre 150 mg til natten anbefales') && j.includes('anti-D i uge 29') && j.includes('Henvisning til obstetrisk afdeling: kronisk hypertension'));
  await saet({ sm: '2026-03-17', bt: [150, 95] });
  j = await journal();
  check('J3 journal: alarmfund med OBS', j.includes('OBS: BT 150/95'));
  await p.click('#copyFullBtn'); await p.waitForTimeout(100);
  const fuld = await p.evaluate(() => navigator.clipboard.readText());
  check('J4 fuld vurdering med tjekliste-felter', fuld.includes('TJEKLISTE') && fuld.includes('[ ] Blodtryk'));
  check('J5 fuld vurdering med prøvetabellen', fuld.includes('PRØVER OG SVAR') && fuld.includes('Galdesyrer og levertal — Kun ved kløe'));
  await saet({ sm: '2026-03-17', rhd: 'neg', fosterRhd: 'neg', antistof: 'neg' });
  const j6 = await journal();
  check('J6 journal: fosterets RhD og antistofstatus', j6.includes('Fosteret RhD-negativt — ingen anti-D') && j6.includes('irregulære antistoffer ikke påvist'), j6.split('\n').slice(1, 2).join(''));

  // ---------------- Udskrift og mobil ----------------
  await p.emulateMedia({ media: 'print' });
  check('U1 udskrift: formular og knapper skjult', await p.evaluate(() => getComputedStyle(document.querySelector('.form-panel')).display === 'none' && getComputedStyle(document.querySelector('.output-actions')).display === 'none'));
  await p.emulateMedia({ media: 'screen' });
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(SIDE); await m.waitForTimeout(200);
  check('U2 mobil: ingen vandret scroll', await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await m.close();

  if (!ARTIFACT) {
    // ---------------- App og startside ----------------
    await p.goto(ROOT + 'svangre/index.html'); await p.waitForTimeout(200);
    check('W1 startside med to værktøjer', (await p.locator('.tool').count()) === 2 && (await p.locator('a[href="svangre.html"]').count()) === 1 && (await p.locator('a[href="huskeskema.html"]').count()) === 1);
    await p.goto(ROOT + 'svangre/huskeskema.html'); await p.waitForTimeout(150);
    const hs = await p.locator('body').innerText();
    check('W2 huskeskema: fire konsultationer og akutliste', ['1. graviditetsundersøgelse', '2. graviditetsundersøgelse', '3. graviditetsundersøgelse', 'Efterundersøgelse', 'Akut kontakt til fødeafdelingen'].every((k) => hs.includes(k)));
    await p.goto(ROOT + 'oversigt.html'); await p.waitForTimeout(100);
    check('W3 link fra kvindesundhed-oversigten', (await p.locator('a[href="svangre/index.html"]').count()) >= 2);
  }

  check('Z1 ingen JavaScript-fejl', errors.length === 0, errors.join(' | '));
  console.log('FAILS:', fails); await b.close();
})();
