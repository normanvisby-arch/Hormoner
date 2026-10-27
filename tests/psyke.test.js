const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Psyke og hukommelse: depression (MDI, ICD-10-algoritme, behandling, opfølgning)
// og demensudredning (tjekliste, delirium, MMSE, blodprøvefund, henvisning).
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const DEP = process.env.BASE_DEP || ROOT + 'psyke/depression.html';
const DEM = process.env.BASE_DEM || ROOT + 'psyke/demens.html';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  for (const u of [DEP, DEM]) await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(u).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const boks = (titel) => p.evaluate((t) => { const h = [...document.querySelectorAll('#output .box h3')].find((x) => x.textContent.startsWith(t)); return h ? h.closest('.box').innerText : ''; }, titel);
  const klasse = (titel) => p.evaluate((t) => { const h = [...document.querySelectorAll('#output .box h3')].find((x) => x.textContent.startsWith(t)); return h ? h.closest('.box').className : ''; }, titel);
  const journal = async () => { await p.click('#copyBtn'); await p.waitForTimeout(80); return p.evaluate(() => navigator.clipboard.readText()); };
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8a', '8b', '9', '10a', '10b'];

  // ================= Depression =================
  await p.goto(DEP); await p.waitForTimeout(150);
  // o: { type, alder, forloeb[] (to_uger er sat som standard), mdi: {k: v} (resten 0), total, risiko[], psyk[], somatik[], beh, uger, mdiFoer, status[] }
  async function dep(o = {}) {
    await p.click('#resetBtn');
    if (o.type) await p.check(`input[name="type"][value="${o.type}"]`);
    if (o.alder) await p.fill('#alder', String(o.alder));
    for (const f of o.forloeb || []) await p.check(`input[name="forloeb"][value="${f}"]`);
    if (o.uden2uger) await p.uncheck('input[name="forloeb"][value="to_uger"]');
    if (o.mdi) for (const k of KEYS) await p.selectOption('#mdi' + k, String(o.mdi[k] || 0));
    if (o.total !== undefined) await p.fill('#mdiTotal', String(o.total));
    for (const n of ['risiko', 'psyk', 'somatik', 'status']) for (const v of o[n] || []) await p.check(`input[name="${n}"][value="${v}"]`);
    if (o.beh) await p.check(`input[name="beh"][value="${o.beh}"]`);
    if (o.uger !== undefined) await p.fill('#uger', String(o.uger));
    if (o.mdiFoer !== undefined) await p.fill('#mdiFoer', String(o.mdiFoer));
    await p.waitForTimeout(50);
    return p.locator('#output').innerText();
  }

  let out = await dep({});
  check('D1 uden MDI: beder om spørgsmålene', out.includes('Udfyld de 10 spørgsmål') && (await p.locator('.mdi-row').count()) === 12);
  out = await dep({ alder: 45, mdi: { 1: 5, 2: 4, 3: 4, 4: 3, 5: 3, 6: 3, 7: 3, '8a': 3, 9: 3, '10a': 3 } });
  check('D2 svær: 3 kerne + 7 ledsage, sum 34', (await boks('MDI 34 — svær depression')).includes('kernesymptomer 3/3') && (await boks('MDI 34')).includes('ledsagesymptomer 7/7'));
  const d2 = await boks('Svær depression — behandling');
  check('D3 svær: antidepressivum, sertralin og escitalopram', d2.includes('Antidepressivum og støttende samtaler') && d2.includes('Sertralin') && d2.includes('Escitalopram') && d2.includes('10 mg, højst 20 mg'));
  check('D4 svær: overvej psykiatrien; spørgsmål 6 = 3 giver risikovurdering', (await boks('Henvisning til psykiatrien')).includes('Svær depression') && (await boks('Selvmordsrisiko — vurdér')).includes('MDI spørgsmål 6 = 3'));
  await dep({ mdi: { 1: 4, 2: 4, 3: 2, 4: 3, 5: 3, 7: 3, 9: 4 } });
  const m5 = await boks('MDI 23');
  check('D5 moderat efter algoritmen, sum 23 (let) → uenighed nævnes', m5.includes('ICD-10-algoritmen: moderat depression') && m5.includes('uenige') && (await boks('Moderat depression — behandling')).includes('Samtaleterapi (fx kognitiv adfærdsterapi) eller antidepressivum'));
  await dep({ alder: 30, mdi: { 1: 4, 2: 4, 3: 1, 4: 3, 9: 3 } });
  const l6 = await boks('Let depression');
  check('D6 let: samtaler først, ingen præparatliste', l6.includes('ingen sikker effekt af antidepressiva') && !l6.includes('Sertralin') && l6.includes('psykolog med tilskud (60 %)'));
  await dep({ total: 28 });
  check('D7 kun totalscore 28 → moderat via sumscoren', (await boks('MDI 28 — moderat depression')).includes('Sumscore 28') && (await boks('Moderat depression')) !== '');
  await dep({ mdi: { 1: 4, 2: 4, '8a': 1, '8b': 4, 9: 3 } });
  check('D8 spørgsmål 8: den højeste af a og b tæller', (await boks('MDI')).includes('rastløshed eller hæmning'));
  await dep({ total: 30, risiko: ['tanker', 'planer'] });
  check('D9 planer → høj selvmordsrisiko, akut psykiatrisk vurdering', (await klasse('⚠ Høj selvmordsrisiko')).includes('box-red') && (await boks('⚠ Høj selvmordsrisiko')).includes('akut psykiatrisk vurdering samme dag'));
  await dep({ total: 30, psyk: ['mani'] });
  check('D10 tidligere mani → bipolar, henvis, rød', (await boks('Henvisning til psykiatrien')).includes('ikke antidepressivum alene') && (await klasse('Henvisning til psykiatrien')).includes('box-red'));
  await dep({ alder: 72, total: 33, somatik: ['bloedning', 'qt'] });
  const d11 = await boks('Svær depression');
  check('D11 72 år med AK og QT: escitalopram lav dosis, blødning, QT og natrium', d11.includes('5 mg, højst 10 mg') && d11.includes('Blødningsrisiko') && d11.includes('undgå citalopram og escitalopram') && d11.includes('Hyponatriæmi'));
  await dep({ alder: 20, total: 27 });
  const d12 = await boks('Moderat depression');
  check('D12 20 år: gratis psykolog og kontakt efter 1 uge', d12.includes('gratis for 18–24-årige') && d12.includes('Under 25 år'));
  await dep({ alder: 16, total: 27 });
  check('D13 under 18 år → børne- og ungdomspsykiatrien', (await boks('Henvisning til psykiatrien')).includes('børne- og ungdomspsykiatrien'));
  await dep({ total: 22, uden2uger: true });
  check('D14 under 2 uger: opfylder ikke ICD-10', (await boks('MDI 22')).includes('Symptomer under 2 uger'));

  // Opfølgning
  await dep({ type: 'kontrol', total: 18, mdiFoer: 32, uger: 8 });
  let k = await boks('Opfølgning');
  check('K1 32 → 18: remission, fortsæt 6 måneder', k.includes('MDI 32 → 18') && k.includes('remission') && k.includes('mindst 6 måneder efter remission') && !(await p.locator('#kontrolFelter').isHidden()));
  await dep({ type: 'kontrol', total: 18, mdiFoer: 32, uger: 8, forloeb: ['flere'] });
  check('K2 flere episoder → mindst 2 år', (await boks('Opfølgning')).includes('mindst 2 år'));
  await dep({ type: 'kontrol', total: 27, mdiFoer: 30, uger: 6 });
  check('K3 ingen effekt efter 6 uger → øg dosis eller skift', (await boks('Opfølgning')).includes('ingen sikker effekt') && (await boks('Opfølgning')).includes('skift præparat'));
  await dep({ type: 'kontrol', total: 25, mdiFoer: 30, uger: 2 });
  check('K4 under 4 uger: vent', (await boks('Opfølgning')).includes('Under 4 uger'));
  check('K5 behandling foldet ved opfølgning', await p.evaluate(() => { const h = [...document.querySelectorAll('#output h3')].find((x) => /depression/i.test(x.textContent) && /behandling|samtaler/i.test(x.textContent)); return !h || !!h.closest('details'); }));
  await dep({ type: 'kontrol', total: 26, mdiFoer: 30, status: ['forsoeg2'] });
  check('K6 to forsøg uden effekt → psykiatrien', (await boks('Henvisning til psykiatrien')).includes('Behandlingsresistent'));

  // Prøver og journal
  await dep({ alder: 50, total: 29 });
  const pr = await p.evaluate(() => [...document.querySelectorAll('#output .proever tbody tr')].map((tr) => tr.textContent));
  check('P1 prøver ved ny depression: TSH, Hb, HbA1c, elektrolytter, B12, alkohol', ['TSH', 'Hæmoglobin', 'HbA1c', 'calcium', 'B12', 'AUDIT'].every((x) => pr.some((r) => r.includes(x))), pr.length + ' rækker');
  let j = await journal();
  check('J1 journal: overskrift, MDI, selvmord og plan', j.startsWith('Depression — vurdering') && j.includes('MDI 29') && j.includes('Selvmordstanker: afkræftet') && j.includes('Plan: samtaleterapi og/eller antidepressivum') && j.includes('Opfølgning: kontakt efter 1–2 uger'), j);
  await dep({ type: 'kontrol', total: 18, mdiFoer: 32, uger: 8 });
  j = await journal();
  check('J2 journal ved opfølgning: respons og varighed', j.startsWith('Depression — opfølgning') && j.includes('MDI 32 → 18'));
  await p.click('#copyFullBtn'); await p.waitForTimeout(80);
  const fuld = await p.evaluate(() => navigator.clipboard.readText());
  check('J3 fuld vurdering med overskrifter', fuld.includes('OPFØLGNING') && fuld.includes('MDI 18'));

  // ================= Demens =================
  await p.goto(DEM); await p.waitForTimeout(150);
  // o: { alder, udd, forloeb[], trak[], mmse, ur, dep, med[], hb, na, ca, tsh, b12, hba1c, egfr, crp, prak[] }
  async function dem(o = {}) {
    await p.click('#resetBtn');
    if (o.alder) await p.fill('#alder', String(o.alder));
    for (const r of ['udd', 'ur', 'dep']) if (o[r]) await p.check(`input[name="${r}"][value="${o[r]}"]`);
    for (const n of ['forloeb', 'trak', 'med', 'prak']) for (const v of o[n] || []) await p.check(`input[name="${n}"][value="${v}"]`);
    for (const id of ['mmse', 'hb', 'na', 'ca', 'tsh', 'b12', 'hba1c', 'egfr', 'crp']) if (o[id] !== undefined) await p.fill('#' + id, String(o[id]));
    await p.waitForTimeout(50);
    return p.locator('#output').innerText();
  }
  const tjek = () => p.evaluate(() => [...document.querySelectorAll('.tjekliste input')].map((i) => i.closest('label').textContent.trim()));
  out = await dem({ alder: 78 });
  let t = await tjek();
  check('M1 tjekliste: anamnese, IADL, test, depression, medicin, blodprøver, EKG, scanning, henvisning', ['Anamnese med pårørende', 'Instrumentel funktionsevne', 'MMSE og urskivetest', 'Depressionsscreening', 'Medicingennemgang', 'Blodprøver', 'EKG', 'CT/MR', 'Henvisning til demensudredning'].every((x) => t.some((y) => y.includes(x))) && t.length === 12, t.length + ' punkter');
  check('M2 depression ikke vurderet → screen', (await boks('Depression')).includes('Screen for depression'));
  await dem({ alder: 82, forloeb: ['akut'] });
  check('M3 akut debut → delirium, ingen henvisningsboks', (await klasse('⚠ Mistanke om delirium')).includes('box-red') && !(await boks('Henvisning')));
  await dem({ alder: 76, mmse: 24, udd: 'kort', ur: 'afvigende', forloeb: ['adl'] });
  const m4 = await boks('Kognitiv test — MMSE 24');
  check('M4 MMSE 24 kort uddannelse: let grad, uddannelsesnote, urskive og IADL', m4.includes('let grad') && m4.includes('Kort uddannelse') && m4.includes('Urskivetest afvigende') && m4.includes('Nedsat instrumentel funktionsevne'));
  await dem({ alder: 80, mmse: 18 });
  check('M5 MMSE 18 uden scanning → moderat, CT-note (Region Hovedstaden), gul', (await boks('Kognitiv test — MMSE 18')).includes('moderat grad') && (await klasse('Kognitiv test — MMSE 18')).includes('box-amber') && (await boks('Henvisning')).includes('MMSE under 20 uden scanning'));
  await dem({ alder: 80, mmse: 18, prak: ['scanning'] });
  check('M6 scanning foreligger → ingen CT-note, tjeklistepunkt ændret', !(await boks('Henvisning')).includes('MMSE under 20 uden scanning') && (await tjek()).some((x) => x.includes('Hjernescanning foreligger')));
  await dem({ alder: 79, na: 127, b12: 180, tsh: 6.2, ca: 1.41, hb: 6.9, crp: 45 });
  const lf = await boks('Blodprøver — fund');
  check('M7 blodprøvefund: natrium, B12, TSH, calcium, Hb og CRP', ['Natrium 127', 'B12 180', 'TSH 6,2', 'calcium 1,41', 'Hæmoglobin 6,9', 'CRP 45'].every((x) => lf.includes(x)) && (await p.locator('#output a', { hasText: 'Hypothyreose' }).count()) >= 1);
  await dem({ alder: 79, b12: 250 });
  check('M8 B12 i gråzone → metylmalonsyre', (await boks('Blodprøver — fund')).includes('metylmalonsyre'));
  await dem({ alder: 74, med: ['antikolin', 'benzo', 'antipsyk'], trak: ['lewy', 'alkohol'] });
  const md = await boks('Medicin og alkohol');
  check('M9 medicin: antikolinerge og benzodiazepiner, Lewy + antipsykotika, alkohol', md.includes('antikolinerge') && md.includes('benzodiazepiner') && md.includes('følsomhed for antipsykotika') && md.includes('thiamin'));
  await dem({ alder: 60, trak: ['personlighed'] });
  check('M10 under 65 år og frontotemporale træk → hurtig henvisning', (await boks('Henvisning')).includes('Hurtig henvisning') && (await boks('Særlige træk')).includes('MMSE kan være normal'));
  await dem({ alder: 77, prak: ['koerekort', 'alene'] });
  t = await tjek();
  const pk = await boks('Praktisk');
  check('M11 kørekort og bor alene', t.some((x) => x.includes('Køreevne')) && pk.includes('helbredskrav') && pk.includes('Bor alene'));
  await dem({ alder: 77, dep: 'pos' });
  check('M12 tegn på depression → behandl først, link til Depression', (await boks('Depression')).includes('behandl depressionen først') && (await p.locator('#output a', { hasText: 'Depression' }).count()) >= 1);
  const prd = await p.evaluate(() => [...document.querySelectorAll('#output .proever tbody tr')].map((tr) => tr.textContent));
  check('M13 prøvetabel: B12, TSH, calcium, EKG og CT', ['B12', 'TSH', 'Calcium', 'EKG', 'CT eller MR'].every((x) => prd.some((r) => r.includes(x))) && prd.length >= 10);
  // Afkrydsning og journal
  await dem({ alder: 81, mmse: 22, ur: 'afvigende', dep: 'neg' });
  await p.check('.tjekliste input[data-tjek="anamnese"]'); await p.check('.tjekliste input[data-tjek="kognitiv"]'); await p.waitForTimeout(50);
  check('M14 afkrydsning tæller', (await p.locator('#tjekStatus').innerText()) === '2 af 12 gennemgået');
  j = await journal();
  check('J4 demensjournal: test, gennemgået, mangler og plan', j.startsWith('Kognitive symptomer — basisudredning') && j.includes('MMSE 22/30, urskivetest afvigende, ikke tegn på depression') && j.includes('Gennemgået: Anamnese med pårørende') && j.includes('Ikke afkrydset (tilpas):') && j.includes('Plan: henvisning til demensudredning'), j);
  await p.click('#copyFullBtn'); await p.waitForTimeout(80);
  const fd = await p.evaluate(() => navigator.clipboard.readText());
  check('J5 fuld vurdering med afkrydsningsfelter og tabel', fd.includes('[x] Anamnese') && fd.includes('[ ] Instrumentel') && fd.includes('B12 og folat — '));

  // ================= Mobil =================
  const m = await ctx.newPage(); await m.setViewportSize({ width: 360, height: 800 });
  for (const u of [DEP, DEM]) {
    await m.goto(u); await m.waitForTimeout(150);
    check(`Z1 ${u.split('/').pop()}: ingen vandret scroll på mobil`, await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    check(`Z2 ${u.split('/').pop()}: restordre-hint`, (await m.locator('.restordre-hint a[href="https://restordre.dk/"]').count()) === 1);
  }
  check('Z3 ingen JavaScript-fejl', errors.length === 0, errors.join(' | '));
  console.log('FAILS:', fails); await b.close();
})();
