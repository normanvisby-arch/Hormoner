const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Tester "Udfyld fra journaltekst" (udfyld.js): regelmotoren og
// udfyldningen på infektion- og nyresiderne. BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const SIDE = (f) => process.env['UDFYLD_' + f.replace(/\W/g, '_').toUpperCase()] || ROOT + f;
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const go = async (f) => { await p.goto(SIDE(f)); await p.waitForTimeout(120); };
  const udfyld = async (tekst) => { await p.evaluate(() => (document.querySelector('details.udfyld').open = true)); await p.fill('#udfyldTekst', tekst); await p.click('#udfyldBtn'); await p.waitForTimeout(150); return p.locator('#udfyldRapport').innerText(); };
  const val = (id) => p.inputValue('#' + id);
  const on = (n, v) => p.isChecked(`input[name="${n}"][value="${v}"]`);
  const head = async (i = 0) => p.locator('#output .box h3').nth(i).innerText();
  const lib = (tekst, fn) => p.evaluate(([t, f]) => { const L = Udfyld.lib(t); return new Function('L', 'return ' + f)(L); }, [tekst, fn]);
  let r;

  // ---------------- Regelmotoren ----------------
  await go('nyre/ckd.html');
  check('M1 panel findes og er lukket', (await p.locator('details.udfyld').count()) === 1 && !(await p.locator('details.udfyld').getAttribute('open')));
  check('M2 negation: "ingen hoste"', (await lib('Ingen hoste, feber 38,5.', 'L.term("hoste").status')) === 'nej');
  check('M3 negation stopper ved komma', (await lib('Ingen hoste, feber 38,5.', 'L.feber().status')) === 'ja');
  check('M4 "ingen hoste eller feber" negerer begge', (await lib('Ingen hoste eller feber.', 'L.feber().status')) === 'nej');
  check('M5 afebril -> feber nej', (await lib('Afebril, sat 97.', 'L.feber().status')) === 'nej');
  check('M6 temperatur 38,6 -> feber ja', (await lib('Temp 38,6.', 'L.feber().status')) === 'ja');
  check('M7 postfix-negation "feber: nej"', (await lib('Feber: nej. Hoste: ja.', 'L.feber().status')) === 'nej');
  check('M8 "men" bryder negation', (await lib('Ikke påvirket men feber.', 'L.feber().status')) === 'ja');
  check('M9 decimaltal med komma', (await lib('Kalium 4,6 mmol/l', 'L.kalium().v')) === 4.6);
  check('M10 "diabetes i 12 år" er ikke alder', (await lib('Kvinde med diabetes i 12 år.', 'L.alder()')) === null);
  check('M11 "68-årig" -> 68', (await lib('68-årig mand', 'L.alder().v')) === 68);
  check('M12 "8 mdr. gammel" -> 0,67 år', (await lib('Pige 8 mdr. gammel', 'L.alder().v')) === 0.67);
  check('M13 "50 mg/kg" er ikke vægt', (await lib('Dosis 50 mg/kg/døgn', 'L.vaegt()')) === null);
  check('M14 UACR i mg/mmol omregnes', (await lib('U-albumin/kreatinin 20 mg/mmol', 'L.uacr().v')) === 177);
  check('M15 "albumin/kreatinin" er ikke kreatinin', (await lib('Albumin/kreatinin-ratio 180 mg/g. BT 140/80.', '(L.uacr(), L.kreat())')) === null);
  check('M16 kreatinin fundet efter UACR', (await lib('UACR 180 mg/g, kreatinin 128', '(L.uacr(), L.kreat().v)')) === 128);
  check('M17 CRP "< 5" giver operator', JSON.stringify(await lib('CRP < 5', '[L.crp().op, L.crp().v]')) === JSON.stringify(['<', 5]));
  check('M18 "upåvirket" matcher ikke "påvirket"', (await lib('Almen upåvirket.', 'L.term("påvirket").status')) === null);
  check('M19 BT 142/84', JSON.stringify(await lib('BT 142/84', '[L.bt().s, L.bt().d]')) === '[142,84]');
  check('M20 "ikke gravid" -> nej', (await lib('Ikke gravid.', 'L.gravid().status')) === 'nej');
  check('M21 graviditetstest negativ -> nej', (await lib('Graviditetstest negativ.', 'L.gravid().status')) === 'nej');
  check('M22 "ingen kendte allergier" -> allergi nej', (await lib('Ingen kendte allergier.', 'L.allergi().status')) === 'nej');
  check('M23 penicillinallergi -> ja', (await lib('Kendt penicillinallergi (udslæt).', 'L.allergi().status')) === 'ja');
  check('M24 køn: dreng -> mand', (await lib('5-årig dreng', 'L.koen().v')) === 'mand');

  // Audit-fund (regressionstests)
  const A = async (navn, tekst, fn, forventet) => { const v = await lib(tekst, fn); check(navn, JSON.stringify(v) === JSON.stringify(forventet), `${tekst} => ${JSON.stringify(v)}`); };
  await A('A1 "÷" efter fund = nej', 'Feber ÷, hoste ÷.', '[L.feber().status, L.term("hoste").status]', ['nej', 'nej']);
  await A('A2 "Feber? Nej." = nej', 'Feber? Nej. Hoste? Ja.', '[L.feber().status, L.term("hoste").status]', ['nej', 'ja']);
  await A('A3 "Gravid? Nej" = nej', 'Gravid? Nej.', 'L.gravid().status', 'nej');
  await A('A4 ubesvaret spørgsmål = ukendt', 'Gravid?', 'L.gravid().status', null);
  await A('A5 "Ved feber … genkontakt" = ukendt', 'Afebril. Ved feber eller flankesmerter genkontakt.', '[L.feber().status, L.term("flankesmerter").status]', ['nej', null]);
  await A('A6 "Hvis feber, kontakt" = ukendt', 'Hvis feber, kontakt vagtlæge.', 'L.feber().status', null);
  await A('A7 sikkerhedsråd om nakkestivhed', 'Informeret om at søge læge ved nakkestivhed eller petekkier.', 'L.term("nakkestiv|petekki").status', null);
  await A('A8 hypotetisk temperatur', 'Ved temp over 38,5 grader genkontakt.', 'L.feber().status', null);
  await A('A9 "Ved us." er ikke hypotetisk', 'Ved us. belægninger på tonsillerne.', 'L.term("belægning").status', 'ja');
  await A('A10 "Allergi: penicillin"', 'Allergi: penicillin.', 'L.allergi().status', 'ja');
  await A('A11 "CAVE: Penicillin"', 'CAVE: Penicillin', 'L.allergi().status', 'ja');
  await A('A12 "Tåler ikke penicillin"', 'Tåler ikke penicillin.', 'L.allergi().status', 'ja');
  await A('A13 "Ingen kendte allergier udover penicillin"', 'Ingen kendte allergier udover penicillin.', 'L.allergi().status', 'ja');
  await A('A14 "Allergisk over for amoxicillin"', 'Allergisk over for amoxicillin.', 'L.allergi().status', 'ja');
  await A('A15 "Allergi: ingen"', 'Allergi: ingen.', 'L.allergi().status', 'nej');
  await A('A16 penicillinallergi afkræftet', 'Penicillinallergi afkræftet ved provokation.', 'L.allergi().status', 'nej');
  await A('A17 vægtændring er ikke vægt', 'Har taget 2 kg på, vejer nu 22 kg.', 'L.vaegt().v', 22);
  await A('A18 vægttab er ikke vægt', 'Tabt 4 kg på en måned.', 'L.vaegt()', null);
  await A('A19 fødselsvægt er ikke vægt', 'Fødselsvægt 3,5 kg, nu 8 mdr. gammel.', 'L.vaegt()', null);
  await A('A20 dato før værdi', 'eGFR 12.03.26: 44. CRP 12.03: 45.', '[L.egfr().v, L.crp().v]', [44, 45]);
  await A('A21 eGFR "58 for et år siden, nu 32"', 'eGFR 58 for et år siden, nu eGFR 32.', '[L.egfrTid().nu.v, L.egfrTid().foer.v]', [32, 58]);
  await A('A22 eGFR uden tidsangivelse → laveste', 'eGFR 45. eGFR 38.', 'L.egfrTid().nu.v', 38);
  await A('A23 eGFR med pil', 'eGFR 52 → 44.', '[L.egfrTid().nu.v, L.egfrTid().foer.v]', [44, 52]);
  await A('A24 CRP "i dag" vinder', 'CRP 12 for 3 dage siden, i dag CRP 85.', 'L.crp().v', 85);
  await A('A25 seponeret = nej', 'Statin seponeret pga. myalgi.', 'L.term("statin").status', 'nej');
  await A('A26 "uden bedring … fortsat feber"', 'Uden bedring på paracetamol og fortsat feber.', 'L.feber().status', 'ja');
  await A('A27 seneste feberoplysning gælder', 'Afebril i går, i aften temp 39,2.', 'L.feber().status', 'ja');
  await A('A28 "nu afebril" gælder', 'Feber for 3 dage siden, nu afebril.', 'L.feber().status', 'nej');
  await A('A29 "T 39" og "T. 38,6"', 'T 39. T. 38,6.', '[L.temp().v]', [39]);
  await A('A30 "pneumoni udelukket"', 'Pneumoni udelukket klinisk.', 'L.term("pneumoni").status', 'nej');
  await A('A31 "kan ikke udelukkes" = ja', 'Pneumoni kan ikke udelukkes.', 'L.term("pneumoni").status', 'ja');
  await A('A32 familie ignoreres for sygdomme', 'Mor har diabetes.', 'L.term("diabetes", { familie: true }).status', null);
  await A('A33 mor som kilde til barnets feber', 'Mor har målt feber hos drengen.', 'L.feber().status', 'ja');
  await A('A34 LDL-K og vitamin K er ikke kalium', 'LDL-K 2,6. Vitamin K 2 mg.', 'L.kalium()', null);
  await A('A35 U-kreatinin er ikke P-kreatinin', 'U-kreatinin 25 mmol/l.', 'L.kreat()', null);
  await A('A36 ACR i mg/mmol', 'ACR 35 mg/mmol', 'L.uacr().v', 309);
  await A('A37 ledsagerens køn tæller ikke', 'Ledsaget af sin mand. 34-årig med svie.', 'L.koen()', null);
  await A('A38 "forsøger at blive gravid" = ukendt', 'Forsøger at blive gravid.', 'L.gravid().status', null);
  await A('A39 vaccination er ikke meningitis', 'Vaccineret mod meningokokker.', 'L.term("meningokok").status', null);
  await A('A40 opremsning efter "ingen" med "eller"', 'Ingen feber, hoste eller ondt i halsen.', 'L.term("hoste").status', 'nej');
  await A('A41 opremsning uden "eller" = ukendt', 'Ingen feber, hoste i 3 dage.', 'L.term("hoste").status', null);
  await A('A46 "men"/"fortsat" stopper opremsningsnægtelse', 'Ingen bedring, fortsat hoste og feber. Benægter dyspnø, men har ondt i halsen.', '[L.feber().status, L.term("ondt i halsen").status]', ['ja', 'ja']);
  await A('A42 RF som reumafaktor', 'RF 32 IU/ml.', 'L.rf()', null);
  await A('A43 eGFR (CKD-EPI) 44', 'eGFR (CKD-EPI) 44', 'L.egfr().v', 44);
  r = await p.evaluate(() => { const t0 = performance.now(); const L = Udfyld.lib('hoste og ondt '.repeat(8000) + 'crp' + ' '.repeat(5000) + '5'); L.feber(); L.term('hoste'); L.crp(); return performance.now() - t0; });
  check('A44 lang tekst uden tegnsætning < 2 s', r < 2000, r);
  r = await lib('İİİ CRP 45 og feber.', 'L.crp().kilde'); check('A45 uddrag passer efter særlige bogstaver', r.includes('CRP 45'), r);

  // ---------------- Luftveje ----------------
  await go('infektion/luftveje.html');
  r = await udfyld('6-årig dreng, 20 kg. Ondt i halsen i 2 dage, feber 38,9, belægninger og ømme glandler, ingen hoste. Strep A positiv. Ingen kendte allergier.');
  check('L1 tonsillitis udfyldt', (await val('alder')) === '6' && (await val('vaegt')) === '20' && await on('centor', 'feber') && await on('centor', 'belaeg') && await on('centor', 'lymf') && await on('centor', 'hoste') && await on('strep', 'pos'), r);
  check('L1 anbefaling opdateret', (await head()).startsWith('Streptokok-tonsillitis') && (await p.locator('#output').innerText()).includes('325 mg × 3'));
  check('L1 felter markeret', (await p.locator('.udfyldt').count()) >= 6);
  await p.fill('#alder', '7'); check('L2 egen ændring fjerner markering', !(await p.getAttribute('#alder', 'class') || '').includes('udfyldt'));
  r = await udfyld('Voksen kvinde 45 år med pneumoni. Krepitation basalt højre. CRP 120, sat 93, RF 32, BT 105/58. Konfus. Penicillinallergi.');
  check('L3 pneumoni: diag, CRB, CRP, SAT, allergi', await on('diag', 'pneumoni') && (await val('crp')) === '120' && (await val('sat')) === '93' && await on('crb', 'rf30') && await on('crb', 'bt') && await on('crb', 'konfus') && await on('pn', 'fokal') && await on('andet', 'allergi'), r);
  check('L3 CRB-65 3 -> indlæggelse', (await head()).startsWith('Akut indlæggelse — CRB-65 3'));
  check('L4 forrige udfyldning nulstillet (ingen strep)', await on('strep', 'ikke') && !(await on('centor', 'feber')));
  r = await udfyld('Bihulebetændelse i 12 dage med gult snot fra højre næsebor og svære smerter over kæbehulen. Afebril. CRP 60.');
  check('L5 sinuitis ≥ 10 dage, sekret, smerter, ingen feber, CRP', await on('diag', 'sinuitis') && await on('varighed', 'lang') && await on('sin', 'sekret') && await on('sin', 'smerte') && !(await on('sin', 'feber')) && (await val('crp')) === '60', r);
  check('L5 3 af 5 tegn -> behandl', (await head()).includes('3 af 5 tegn'));
  r = await udfyld('Mellemørebetændelse hos 3-årig, 15 kg, almen påvirket, feber.');
  check('L6 otitis påvirket', await on('diag', 'otitis') && await on('ot', 'paavirket') && (await head()).startsWith('Almen påvirket'), r);
  r = await udfyld('Otitis, almen upåvirket, 4 år.');
  check('L7 otitis upåvirket -> ikke påvirket', await on('diag', 'otitis') && !(await on('ot', 'paavirket')), r);
  r = await udfyld('Hoste og ondt i halsen. Ingen tegn på pneumoni.');
  check('L8 negeret diagnose ignoreres; svage symptomer vælges', await on('diag', 'tonsillitis'), r);
  r = await udfyld('Feber og nakkestivhed, petekkier på benene.');
  check('L9 meningitis-alarm', await on('rf', 'meningitis') && (await head()).startsWith('Mistanke om meningitis'), r);
  r = await udfyld('Blablabla uden relevante oplysninger.');
  check('L10 intet fundet -> besked og mangler', r.includes('kunne ikke genkendes') && r.includes('Ikke fundet i teksten'), r);
  await p.click('#resetBtn'); check('L11 nulstil rydder rapport og tekst', (await p.locator('#udfyldRapport').innerText()) === '' && (await p.inputValue('#udfyldTekst')) === '' && (await p.locator('.udfyldt').count()) === 0);

  // ---------------- Urinveje ----------------
  await go('infektion/urinveje.html');
  r = await udfyld('34-årig kvinde med svie og hyppig vandladning i 2 dage, afebril, ingen flankesmerter. Stix: leuk +, nitrit +. Ikke gravid. Ingen kendte allergier.');
  check('U1 ukompliceret cystitis udfyldt', await on('koen', 'kvinde') && (await val('alder')) === '34' && await on('billede', 'cystitis') && await on('leuk', 'pos') && await on('nitrit', 'pos') && !(await on('andet', 'gravid')), r);
  check('U1 anbefaling', (await head()).startsWith('Akut ukompliceret cystitis') && (await p.locator('#output').innerText()).includes('Dyrkning ikke nødvendig'));
  r = await udfyld('72-årig mand, feber 38,8 og kulderystelser, ømhed over nyrelogen. eGFR 25. Urinstix positiv for leukocytter og nitrit.');
  check('U2 mand med feber, eGFR, stix', await on('koen', 'mand') && await on('billede', 'feber') && (await val('egfr')) === '25' && await on('leuk', 'pos') && await on('nitrit', 'pos'), r);
  check('U2 kulderystelser -> note, ikke automatisk sepsis', r.includes('Kulderystelser nævnt') && !(await on('andet', 'sepsis')));
  check('U2 ciprofloxacin 500 mg × 1 ved eGFR 25', (await p.locator('#output').innerText()).includes('500 mg × 1'));
  r = await udfyld('Gravid i uge 14, asymptomatisk bakteriuri ved screening, E. coli.');
  check('U3 gravid + asymptomatisk', await on('andet', 'gravid') && await on('billede', 'asympt') && (await head()).includes('graviditeten'), r);
  r = await udfyld('Kvinde 80 år med KAD og gentagne urinvejsinfektioner. Stix leukocytter spor, nitrit neg.');
  check('U4 kateter, recidiv, spor -> note', await on('andet', 'kateter') && await on('andet', 'recidiv') && await on('nitrit', 'neg') && await on('leuk', 'ukendt') && r.includes('"spor"'), r);

  // ---------------- Hud ----------------
  await go('infektion/hud.html');
  r = await udfyld('8-årig pige, 25 kg, bidt af kat i hånden i går. Rødme og hævelse omkring bidsåret. Ingen kendte allergier.');
  check('H1 kattebid inficeret i hånden', await on('diag', 'bid') && await on('dyr', 'kat') && await on('bid', 'inficeret') && await on('bid', 'risiko') && (await val('vaegt')) === '25', r);
  r = await udfyld('Flåtbid for 2 uger siden, nu erythema migrans 8 cm på låret. 40-årig kvinde. Penicillinallergi.');
  check('H2 EM med allergi -> doxycyclin', await on('diag', 'em') && await on('andet', 'allergi') && (await p.locator('#output').innerText()).includes('Doxycyclin'), r);
  r = await udfyld('Impetigo med mange elementer i ansigt og på arme hos 4-årig, 16 kg.');
  check('H3 udbredt impetigo', await on('diag', 'impetigo') && await on('udbred', 'udbredt'), r);
  r = await udfyld('Byld på låret, fluktuerende, ingen feber, ingen omgivende rødme. 30-årig mand.');
  check('H4 byld uden omgivende rødme', await on('diag', 'cellulitis') && await on('cell', 'absces') && !(await on('cell', 'omgiv')), r);
  r = await udfyld('Rosen på underbenet, hurtig spredning og smerter ude af proportion.');
  check('H5 alarmtegn nekrotiserende', await on('rf', 'nekrose') && (await head()).startsWith('Mistanke om nekrotiserende'), r);

  r = await udfyld('Flåtbid for 2 uger siden uden reaktion. Nu rosen på underbenet, feber 38,5. 60-årig.');
  check('H6 aktuel rosen slår gammelt flåtbid', await on('diag', 'erysipelas'), r);
  r = await udfyld('Erysipelas på underbenet. Fodsvamp. Tidligere hundebid 2019.');
  check('H7 gammelt hundebid og fodsvamp -> erysipelas', await on('diag', 'erysipelas'), r);
  r = await udfyld('Byld på låret. Afebril. Ved feber eller omgivende rødme genkontakt.');
  check('H8 sikkerhedsråd sætter ikke omgivende rødme', await on('cell', 'absces') && !(await on('cell', 'omgiv')), r);

  // ---------------- Urinveje (audit) ----------------
  await go('infektion/urinveje.html');
  r = await udfyld('34-årig kvinde med svie og hyppig vandladning. Afebril. Ved feber eller flankesmerter genkontakt.');
  check('U5 sikkerhedsråd giver ikke pyelonefritis', await on('billede', 'cystitis'), r);
  r = await udfyld('25-årig kvinde, svie. Gravid? Nej. Stix: leuk ÷, nitrit ÷.');
  check('U6 "Gravid? Nej" og "÷" i stix', !(await on('andet', 'gravid')) && await on('leuk', 'neg') && await on('nitrit', 'neg'), r);
  r = await udfyld('Ledsaget af sin mand. 34-årig med svie og hyppig vandladning.');
  check('U7 ledsagerens køn bruges ikke', r.includes('Ikke fundet i teksten: køn'), r);
  r = await udfyld('Kvinde 30 år. Initialt svie. Stix positiv for leukocytter og nitrit.');
  check('U8 "initialt" er ikke nitrit', await on('nitrit', 'pos'), r);

  // ---------------- Luftveje (audit) ----------------
  await go('infektion/luftveje.html');
  r = await udfyld('Sinuitis for 3 uger siden, behandlet. Nu ondt i halsen og feber 38,6.');
  check('L6 aktuel ondt i halsen slår gammel sinuitis', await on('diag', 'tonsillitis') && await on('centor', 'feber'), r);
  r = await udfyld('5-årig, 18 kg. Ondt i halsen. Feber ÷, hoste ÷. Strep A ÷.');
  check('L7 "÷"-notation', !(await on('centor', 'feber')) && await on('centor', 'hoste') && await on('strep', 'neg'), r);
  r = await udfyld('Ondt i halsen. Informeret om at søge læge ved nakkestivhed eller petekkier.');
  check('L8 sikkerhedsråd udløser ikke alarm', !(await on('rf', 'meningitis')), r);
  r = await udfyld('Pneumoni udelukket klinisk. Hoste i 5 dage, CRP 15.');
  check('L9 "pneumoni udelukket" -> bronkitis', await on('diag', 'bronkitis'), r);
  // ---------------- Kronisk nyresygdom ----------------
  await go('nyre/ckd.html');
  r = await udfyld('68-årig mand med type 2-diabetes og hypertension. eGFR faldet fra 52 til 44, UACR 180 mg/g. BT 142/84, kalium 4,6. Metformin, ramipril og atorvastatin. Ingen NSAID.');
  check('C1 værdier', (await val('alder')) === '68' && (await val('egfr')) === '44' && (await val('egfrFoer')) === '52' && (await val('uacr')) === '180' && (await val('sbp')) === '142' && (await val('dbp')) === '84' && (await val('kalium')) === '4.6', r);
  check('C1 sygdomme og medicin', await on('syg', 't2d') && await on('syg', 'hypertension') && await on('med', 'acearb') && await on('med', 'statin') && !(await on('med', 'nsaid')) && !(await on('med', 'sglt2')));
  check('C1 stadie G3b A2', (await head()).startsWith('G3b A2'));
  r = await udfyld('Kvinde 55 år. eGFR 30 (2026), eGFR 41 (2025). U-albumin/kreatinin 90 mg/mmol. Kerendia og Jardiance.');
  check('C2 årstal ordner eGFR; mg/mmol omregnet; finerenon og SGLT-2', (await val('egfr')) === '30' && (await val('egfrFoer')) === '41' && (await val('uacr')) === '796' && await on('koen', 'kvinde') && await on('med', 'finerenon') && await on('med', 'sglt2'), r);
  check('C2 omregningsnote', r.includes('omregnet til mg/g'));
  r = await udfyld('Diabetes. eGFR 50, tidligere eGFR 58. Ibuprofen efter behov.');
  check('C3 "tidligere" og diabetes-note og NSAID', (await val('egfr')) === '50' && (await val('egfrFoer')) === '58' && await on('syg', 't2d') && await on('med', 'nsaid') && r.includes('tolket som type 2-diabetes'), r);

  r = await udfyld('45-årig kvinde med PCOS (polycystisk ovariesyndrom). Gastric bypass 2015. Amitriptylin. Mor havde diabetes. Statin seponeret. eGFR 55, UACR 40 mg/g.');
  check('C4 PCOS, gastric bypass, amitriptylin, familie og seponeret giver ingen fund', !(await on('syg', 'pkd')) && !(await on('syg', 'ascvd')) && !(await on('syg', 't2d')) && !(await on('med', 'statin')), r);

  // ---------------- Dosis ----------------
  await go('nyre/dosis.html');
  check('D0 nævnte-filter skjult uden tekst', await p.locator('#naevnteLabel').isHidden());
  r = await udfyld('82-årig kvinde, 58 kg, kreatinin 128, eGFR 38. Fast medicin: metformin 1 g × 2, Eliquis 5 mg × 2, gabapentin 300 mg × 3, Pinex.');
  check('D1 værdier og køn', (await val('egfr')) === '38' && (await val('alder')) === '82' && (await val('vaegt')) === '58' && (await val('kreat')) === '128' && await on('koen', 'kvinde'), r);
  const rækker = await p.$$eval('#output tbody tr:not(.group-row)', (trs) => trs.map((t) => t.cells[0].childNodes[0].textContent.trim()));
  check('D1 kun nævnte lægemidler vises', rækker.length === 4 && rækker.includes('Metformin') && rækker.some((x) => x.startsWith('DOAK')) && rækker.includes('Gabapentin') && rækker.includes('Paracetamol'), JSON.stringify(rækker));
  await p.uncheck('input[name="vis"][value="naevnte"]');
  check('D2 filter kan slås fra', (await p.$$eval('#output tbody tr:not(.group-row)', (e) => e.length)) > 30);

  r = await udfyld('80-årig mand. eGFR 58 for et år siden, nu eGFR 32. Tabt 4 kg, vejer nu 70 kg. Kreatinin 180. Ingen bivirkninger af Eliquis.');
  check('D3 aktuel eGFR, vægt efter vægttab, negeret lægemiddel vises', (await val('egfr')) === '32' && (await val('vaegt')) === '70' && (await val('naevnte')).includes('DOAK'), r);
  r = await udfyld('75-årig kvinde, eGFR 40.');
  check('D4 ny udfyldning uden lægemidler rydder filtret', (await val('naevnte')) === '' && await p.locator('#naevnteLabel').isHidden() && r.includes('Ikke fundet i teksten: kreatinin, vægt'), r);
  await udfyld('eGFR 40. Metformin.'); await p.click('#resetBtn'); await p.waitForTimeout(100);
  check('D5 Nulstil rydder nævnte lægemidler', (await val('naevnte')) === '' && await p.locator('#naevnteLabel').isHidden());

  // Mobil
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(SIDE('infektion/luftveje.html'));
  await m.click('.udfyld summary'); await m.fill('#udfyldTekst', '6-årig dreng, 20 kg, ondt i halsen, feber, strep A positiv'); await m.click('#udfyldBtn'); await m.waitForTimeout(150);
  check('mobil uden vandret scroll', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
