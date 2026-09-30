const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Notat-indgangen: klassifikation, overdragelse til værktøjerne, valg ved tvivl,
// privatliv (sessionStorage ryddes), app/offline. BASE_NOTAT kan pege på et bygget artifact (claude.ai-tilstand).
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const NOTAT = process.env.BASE_NOTAT || ROOT + 'notat/index.html';
const ARTIFACT = !!process.env.BASE_NOTAT;
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let dialog = false; p.on('dialog', (d) => { dialog = true; d.dismiss(); });
  await p.goto(NOTAT); await p.waitForTimeout(150);

  // ---------------- Klassifikation ----------------
  const K = async (navn, tekst, top, sikker) => {
    const r = await p.evaluate((t) => { const r = Udfyld.klassificer(t); return { s: r.sikker, top: r.kandidater[0] ? r.kandidater[0].id : null, k: r.kandidater.slice(0, 3).map((k) => k.id + ':' + k.point) }; }, tekst);
    check(navn, r.top === top && r.s === sikker, JSON.stringify(r));
  };
  await K('K1 tonsillitis', '6-årig dreng, 20 kg. Ondt i halsen i 2 dage, feber 38,9, belægninger og ømme glandler, ingen hoste. Strep A positiv.', 'luftveje', true);
  await K('K2 otitis hos barn', 'Mor ringer: 2-årig med ørepine siden i nat, feber 39, trommehinde rød og bulende.', 'luftveje', true);
  await K('K3 sinuitis', 'Bihulebetændelse i 12 dage med gult snot og svære smerter over kæbehulen. CRP 60.', 'luftveje', true);
  await K('K4 pneumoni hos KOL-patient = tvivl', '78-årig mand med hoste i 5 dage, feber, krepitation basalt hø. CRP 140. Kendt KOL.', 'luftveje', false);
  await K('K5 cystitis', '34-årig kvinde med svie og hyppig vandladning i 2 dage, afebril, ingen flankesmerter. Stix: leuk +, nitrit +.', 'urinveje', true);
  await K('K6 pyelonefritis med eGFR', '72-årig mand, feber 38,8 og kulderystelser, ømhed over nyrelogen. eGFR 25. Urinstix positiv.', 'urinveje', true);
  await K('K7 erysipelas', '58-årig mand med skarpt afgrænset rødme på højre underben siden i går, feber 38,7. Fodsvamp.', 'hud', true);
  await K('K8 kattebid ("bidt af" er ikke atrieflimren)', '8-årig pige bidt af kat i hånden i går. Rødme og hævelse omkring bidsåret.', 'hud', true);
  await K('K9 CKD med diabetes som komorbiditet', '68-årig mand med type 2-diabetes og hypertension. eGFR faldet fra 52 til 44, UACR 180 mg/g. Metformin, ramipril.', 'ckd', true);
  await K('K10 dosis', '82-årig kvinde, 58 kg, kreatinin 128, eGFR 38. Metformin, Eliquis, gabapentin. Dosisjustering?', 'dosis', true);
  await K('K11 atrieflimren', 'Nyopdaget atrieflimren hos 74-årig kvinde. CHA2DS2-VASc 4. Start DOAK?', 'af', true);
  await K('K12 SCORE2 med spørgsmålstegn', '55-årig mand, ryger, BT 150/90, kolesterol 6,5, LDL 4,2. SCORE2?', 'cvrisiko', true);
  await K('K13 "KOL-kontrol" er ikke nægtet', 'KOL-kontrol. FEV1 45 %, mMRC 2, 2 eksacerbationer sidste år.', 'kol', true);
  await K('K14 astma', 'Astma, bruger Ventoline dagligt, vågner om natten. ACT 15.', 'astma', true);
  await K('K15 hypothyreose med spørgsmål', 'TSH 8,2, fT4 12. Træthed. Start levothyroxin?', 'hypothyreose', true);
  await K('K16 diabetes-årskontrol', 'Type 2-diabetes årskontrol. HbA1c 58, fodundersøgelse normal, øjenscreening uden retinopati.', 'aarskontrol', true);
  await K('K17 diabetesbehandling', 'Type 2-diabetes, HbA1c 64 trods metformin. Overvejer GLP-1.', 'diabetes', true);
  await K('K18 klimakterie', '52-årig kvinde med hedeture og natlig sveden. Ønsker MHT.', 'klimakterie', true);
  await K('K19 "ønsker p-piller" tæller', '22-årig ønsker p-piller. Ryger ikke.', 'praevention', true);
  await K('K20 osteoporose', 'DXA: T-score -2,8 i ryg. Tidligere håndledsbrud. Start alendronat.', 'osteoporose', true);
  await K('K21 ukendt emne', 'Kvinde 45 år med ondt i ryggen i 3 uger.', null, false);
  await K('K22 UVI hos CKD-patient = tvivl', 'UVI hos 70-årig med kronisk nyresygdom, eGFR 28. Svie, stix nitrit pos.', 'urinveje', false);
  await K('K23 familieanamnese tæller ikke', 'Mor har KOL. Pt. med ondt i halsen og feber.', 'luftveje', true);
  await K('K24 sikkerhedsråd tæller ikke', 'Ondt i halsen, feber. Ved flankesmerter eller svie genkontakt.', 'luftveje', true);
  await K('K25 nægtede fund tæller ikke', 'Ingen svie, ingen hyppig vandladning. Ondt i halsen og feber.', 'luftveje', true);
  let r = await p.evaluate(() => Udfyld.klassificer('Ingen svie. Kulderystelser.').kandidater.map((k) => k.fund.join('/')).join(' '));
  check('K26 nægtet ord vises ikke som begrundelse', !/svie/i.test(r), r);

  if (!ARTIFACT) {
    // ---------------- Direkte videre ved sikkert valg ----------------
    const indsaet = async (t) => { await p.evaluate((t) => { const ta = document.getElementById('notatTekst'); ta.value = t; ta.dispatchEvent(new Event('paste')); }, t); };
    await indsaet('6-årig dreng, 20 kg. Ondt i halsen i 2 dage, feber 38,9, belægninger og ømme glandler, ingen hoste. Strep A positiv. Ingen kendte allergier.');
    await p.waitForURL('**/infektion/luftveje.html', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(400);
    check('D1 sikkert valg åbner luftveje', p.url().endsWith('infektion/luftveje.html'), p.url());
    check('D1 felterne er udfyldt', (await p.inputValue('#alder')) === '6' && (await p.inputValue('#vaegt')) === '20' && await p.isChecked('input[name="strep"][value="pos"]') && await p.isChecked('input[name="centor"][value="feber"]'));
    const rap = await p.locator('#udfyldRapport').innerText();
    check('D1 rapport og link tilbage', rap.includes('Udfyldt') && rap.includes('Forkert værktøj? Vælg et andet'), rap);
    check('D1 overdragelsen er engangs', await p.evaluate(() => sessionStorage.getItem('udfyld.overdrag') === null && !!sessionStorage.getItem('udfyld.notat')));
    await p.reload(); await p.waitForTimeout(300);
    check('D2 genindlæsning udfylder ikke igen', (await p.inputValue('#alder')) === '');
    // Tilbage via linket: valgene vises, ingen automatisk videresendelse.
    await p.goBack(); await p.waitForTimeout(200); await p.goForward(); await p.waitForTimeout(200);
    await p.evaluate(() => { sessionStorage.setItem('udfyld.overdrag', sessionStorage.getItem('udfyld.notat')); }); await p.reload(); await p.waitForTimeout(400);
    await p.click('.udfyld-fra a'); await p.waitForTimeout(400);
    check('D3 tilbage til notat-indgangen', p.url().includes('notat/index.html'), p.url());
    check('D3 teksten er bevaret, og valg vises uden videresendelse', (await p.inputValue('#notatTekst')).includes('Strep A') && (await p.locator('.notat-kort').count()) >= 1 && p.url().includes('notat/'));

    // ---------------- Tvivl: vælg selv ----------------
    await p.click('#rydBtn');
    check('P1 Ryd sletter teksten i fanens hukommelse', await p.evaluate(() => sessionStorage.getItem('udfyld.notat') === null && sessionStorage.getItem('udfyld.overdrag') === null) && (await p.inputValue('#notatTekst')) === '');
    await p.fill('#notatTekst', 'UVI hos 70-årig kvinde med kronisk nyresygdom, eGFR 28, UACR 60 mg/g. Svie, stix nitrit pos.');
    await p.click('#findBtn'); await p.waitForTimeout(300);
    let tekst = await p.locator('#resultat').innerText();
    check('T1 tvivl viser kandidater med begrundelse', p.url().includes('notat/') && tekst.includes('passer til flere værktøjer') && (await p.locator('.notat-kort').count()) >= 2 && tekst.includes('Fundet i teksten'), tekst);
    await p.click('[data-aabn="ckd"]'); await p.waitForURL('**/nyre/ckd.html', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(400);
    check('T2 valgt værktøj (CKD) udfyldes', p.url().endsWith('nyre/ckd.html') && (await p.inputValue('#egfr')) === '28' && (await p.inputValue('#uacr')) === '60', p.url());
    tekst = await p.locator('#udfyldRapport').innerText();
    check('T3 "passer også til" urinveje', tekst.includes('Teksten passer også til') && tekst.includes('Urinvejsinfektion'), tekst);
    await p.click('[data-send="infektion/urinveje.html"]'); await p.waitForURL('**/infektion/urinveje.html', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(400);
    check('T4 videre til urinveje udfylder dér', p.url().endsWith('infektion/urinveje.html') && (await p.inputValue('#egfr')) === '28' && await p.isChecked('input[name="nitrit"][value="pos"]'));
    await p.evaluate(() => (document.querySelector('details.udfyld').open = true)); await p.click('#udfyldRyd');
    check('T5 Ryd i værktøjet sletter også notatet', await p.evaluate(() => sessionStorage.getItem('udfyld.notat') === null));

    // ---------------- Værktøj uden udfyldning ----------------
    await p.goto(NOTAT); await p.waitForTimeout(200);
    await indsaet('KOL-kontrol. FEV1 45 %, mMRC 2, 2 eksacerbationer sidste år.'); await p.waitForTimeout(400);
    tekst = await p.locator('#resultat').innerText();
    check('V1 KOL: bliver på siden og siger, at der ikke udfyldes', p.url().includes('notat/') && tekst.includes('Udfyldes ikke automatisk') && tekst.includes('Åbn KOL'), tekst);
    await p.click('[data-aabn="kol"]'); await p.waitForTimeout(400);
    check('V2 åbner KOL-værktøjet', p.url().endsWith('lunge/kol.html') && await p.evaluate(() => sessionStorage.getItem('udfyld.overdrag') === null));

    // ---------------- Ingen genkendelse og "alle værktøjer" ----------------
    await p.goto(NOTAT); await p.waitForTimeout(200);
    await p.click('#rydBtn'); await p.fill('#notatTekst', 'Kvinde 45 år med ondt i ryggen i 3 uger.'); await p.click('#findBtn'); await p.waitForTimeout(200);
    check('A1 ingen genkendelse: vælg selv, listen er åben', (await p.locator('#resultat').innerText()).includes('kunne ikke knyttes') && (await p.locator('#alle').getAttribute('open')) !== null);
    await p.fill('#notatTekst', 'Rosen på underbenet, 70 kg.'); await p.click('#alle a[data-id="hud"]'); await p.waitForURL('**/infektion/hud.html', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(400);
    check('A2 valg fra listen udfylder hud', p.url().endsWith('infektion/hud.html') && await p.isChecked('input[name="diag"][value="erysipelas"]') && (await p.inputValue('#vaegt')) === '70');

    // ---------------- Præference ----------------
    await p.goto(NOTAT); await p.waitForTimeout(200); await p.click('#rydBtn');
    await p.uncheck('#direkte'); await p.reload(); await p.waitForTimeout(200);
    check('R1 "gå direkte" huskes', !(await p.isChecked('#direkte')));
    await indsaet('34-årig kvinde med svie og hyppig vandladning. Stix: leuk +, nitrit +.'); await p.waitForTimeout(400);
    check('R2 uden "gå direkte" vises valget', p.url().includes('notat/') && (await p.locator('.notat-bedst').count()) === 1 && (await p.locator('#resultat').innerText()).includes('peger på Urinvejsinfektion'));
    await p.check('#direkte');

    // ---------------- Sikkerhed ----------------
    await p.click('#rydBtn'); await p.fill('#notatTekst', '<img src=x onerror=alert(1)> svie og nitrit <script>alert(2)</script> kronisk nyresygdom'); await p.click('#findBtn'); await p.waitForTimeout(300);
    check('S1 ingen scriptudførelse fra teksten', !dialog && (await p.locator('#resultat img').count()) === 0);
    check('S2 hent-knap vises, når udklipsholderen kan læses', await p.locator('#hentBtn').isVisible());
    await p.click('#rydBtn');

    // ---------------- App og offline ----------------
    const APP = NOTAT.replace('index.html', '');
    const man = await (await p.request.get(APP + 'manifest.webmanifest')).json();
    check('W1 manifest', man.name === 'Notat-indgang' && man.start_url === 'index.html' && man.scope === '../' && man.display === 'standalone');
    for (const ic of man.icons) check(`W2 ikon ${ic.src}`, (await p.request.get(APP + ic.src)).ok());
    const scope = await p.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    check('W3 service worker', scope === APP, scope);
    await p.reload(); await p.waitForTimeout(300);
    await ctx.setOffline(true);
    const rr = await p.goto(NOTAT).catch(() => null);
    check('W4 offline', rr && rr.ok() && (await p.locator('h1').innerText()) === 'Notat-indgang');
    await ctx.setOffline(false);
    check('W5 installér-knap skjult uden tilbud', (await p.locator('[data-install]').count()) === 1 && (await p.locator('[data-install]').isHidden()));
  } else {
    // claude.ai: teksten kopieres, og værktøjet åbnes i en ny fane.
    await p.fill('#notatTekst', '34-årig kvinde med svie og hyppig vandladning. Stix: leuk +, nitrit +.'); await p.click('#findBtn'); await p.waitForTimeout(300);
    check('X1 ingen automatisk videresendelse i claude.ai', p.url() === NOTAT && (await p.locator('.notat-kort').count()) >= 1);
    const [pop] = await Promise.all([p.waitForEvent('popup', { timeout: 3000 }).catch(() => null), p.click('[data-aabn="urinveje"]')]);
    check('X2 åbner urinveje-artifactet i ny fane', pop && pop.url().startsWith('https://claude.ai/artifact/7r2JYpbQxFpaxZaiz9kBqN'), pop ? pop.url() : 'ingen popup');
    if (pop) await pop.close();
    check('X3 ingen hent-knap i claude.ai', await p.locator('#hentBtn').isHidden());
  }

  // Mobil
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(NOTAT); await m.waitForTimeout(150);
  await m.fill('#notatTekst', 'UVI hos 70-årig med kronisk nyresygdom, eGFR 28. Svie, stix nitrit pos.'); await m.click('#findBtn'); await m.waitForTimeout(200);
  check('M1 mobil uden vandret scroll', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await m.click('#rydBtn');
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
