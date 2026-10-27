const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Forhøjet blodtryk: klassifikation, akut, behandlingstrin, prøver, sekundær hypertension og journalnotat.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = process.env.BASE || ROOT + 'hjerte/hypertension.html';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  await p.goto(BASE); await p.waitForTimeout(150);

  // o: { alder, koen, kli:[s,d], hj:[s,d], dg:[s,d], score, syg[], akut[], sek[], med[], max, k, na, egfr, uacr, hba1c }
  async function saet(o = {}) {
    await p.click('#resetBtn');
    if (o.alder) await p.fill('#alder', String(o.alder));
    if (o.koen) await p.check(`input[name="koen"][value="${o.koen}"]`);
    for (const [k, id] of [['kli', 'kli'], ['hj', 'hj'], ['dg', 'dg']]) if (o[k]) { await p.fill(`#${id}S`, String(o[k][0])); await p.fill(`#${id}D`, String(o[k][1])); }
    if (o.score) await p.check(`input[name="score"][value="${o.score}"]`);
    for (const n of ['syg', 'akut', 'sek', 'med']) for (const v of o[n] || []) await p.check(`input[name="${n}"][value="${v}"]`);
    if (o.max) await p.check('input[name="medmax"]');
    for (const k of ['k', 'na', 'egfr', 'uacr', 'hba1c']) if (o[k] !== undefined) await p.fill('#' + k, String(o[k]));
    await p.waitForTimeout(50);
    return p.locator('#output').innerText();
  }
  const boks = (titel) => p.evaluate((t) => { const h = [...document.querySelectorAll('#output .box h3')].find((x) => x.textContent.startsWith(t)); return h ? h.closest('.box').innerText : ''; }, titel);
  const klasse = (titel) => p.evaluate((t) => { const h = [...document.querySelectorAll('#output .box h3')].find((x) => x.textContent.startsWith(t)); return h ? h.closest('.box').className : ''; }, titel);
  const journal = async () => { await p.click('#copyBtn'); await p.waitForTimeout(80); return p.evaluate(() => navigator.clipboard.readText()); };

  // ---------------- Klassifikation ----------------
  let out = await saet({});
  check('K1 uden tal: beder om blodtryk', out.includes('Angiv klinik-, hjemme- eller døgnblodtryk'));
  await saet({ alder: 55, kli: [152, 94] });
  check('K2 kun klinik ≥ 140/90 → bekræft med hjemme-/døgnblodtryk', (await boks('Vurdering')).includes('skal bekræftes med hjemme- eller døgnblodtryk'));
  await saet({ alder: 55, kli: [152, 94], hj: [128, 79] });
  check('K3 høj klinik, normal hjemme → hvidkittel, ingen medicin', (await boks('Vurdering')).includes('Hvidkittelhypertension') && !(await boks('Behandling')));
  await saet({ alder: 55, kli: [134, 82], hj: [141, 88], score: 'lav' });
  const v4 = await boks('Vurdering');
  check('K4 normal klinik, høj hjemme → maskeret hypertension', v4.includes('Hypertension — hjemmeblodtryk 141/88') && v4.includes('Maskeret hypertension'));
  await saet({ alder: 55, hj: [150, 92], dg: [138, 84] });
  check('K5 døgnblodtryk foretrækkes frem for hjemme', (await boks('Vurdering')).includes('døgnblodtryk (dagtid) 138/84'));
  await saet({ alder: 55, hj: [132, 82] });
  check('K6 130–134/80–84 → let forhøjet', (await boks('Vurdering')).includes('Let forhøjet blodtryk'));

  // ---------------- Beslutning ----------------
  await saet({ alder: 50, hj: [142, 88], score: 'lav' });
  let v = await boks('Vurdering');
  check('B1 hypertension, lav risiko → livsstil i kort forsøg; behandling foldet som plan bagefter', v.includes('Livsstilsændringer i et kort forsøg') && !(await boks('Behandling — næste trin')) && (await boks('Behandling, hvis blodtrykket fortsat')) !== '' && !(await boks('Kontrol')).includes('efter 1–2 uger'));
  await saet({ alder: 50, hj: [142, 88] });
  check('B2 ukendt risiko → beregn SCORE2 med link', (await boks('Vurdering')).includes('Beregn hjerte-kar-risikoen') && (await p.locator('#output a', { hasText: 'CV-risiko' }).count()) >= 1);
  await saet({ alder: 50, hj: [158, 98], score: 'lav' });
  check('B3 ≥ 155/95 → medicin nu, to præparater', (await boks('Vurdering')).includes('Medicinsk behandling nu') && (await boks('Behandling')).includes('Start med to præparater'));
  await saet({ alder: 60, hj: [142, 86], syg: ['dm'] });
  const b4 = await boks('Behandling');
  check('B4 diabetes → medicin nu; mild → ét præparat, ACE-hæmmer/ARB først', (await boks('Vurdering')).includes('Medicinsk behandling nu') && b4.includes('Start med ét præparat: ACE-hæmmer eller angiotensin II-receptorblokker'));
  await saet({ alder: 84, hj: [162, 90] });
  const b5 = await boks('Behandling');
  check('B5 80 år+: monoterapi i lav dosis og mål 130–144', b5.includes('Start med ét præparat') && b5.includes('lav dosis') && (await boks('Behandlingsmål')).includes('130–144'));
  await saet({ alder: 32, koen: 'k', hj: [160, 100], syg: ['graviditet'] });
  const b6 = await boks('Behandling');
  check('B6 kan blive gravid: calciumantagonist, undgå ACE/ARB, link til svangre', b6.includes('calciumantagonist (amlodipin') && b6.includes('Undgå ACE-hæmmer og angiotensin II-receptorblokker') && b6.includes('labetalol eller nifedipin'));
  await saet({ alder: 60, hj: [160, 96], syg: ['gigt'] });
  check('B7 urinsyregigt: kombination med calciumantagonist, ikke thiazid', (await boks('Behandling')).includes('+ calciumantagonist (amlodipin 5 mg) —') && (await boks('Behandling')).includes('thiazid kan udløse anfald'));

  // ---------------- Behandlingstrin ----------------
  await saet({ alder: 60, hj: [146, 90], med: ['raas'] });
  check('T1 ét præparat over mål → tilføj andet', (await boks('Vurdering')).includes('over målet') && (await boks('Behandling')).includes('To præparater: tilføj calciumantagonist'));
  await saet({ alder: 60, hj: [146, 90], med: ['raas', 'cca'] });
  check('T2 to præparater → tilføj thiazid', (await boks('Behandling')).includes('Tre præparater: tilføj thiazid'));
  await saet({ alder: 60, hj: [146, 90], med: ['raas', 'cca', 'thiazid'], max: true, k: 4.2, egfr: 70 });
  const t3 = await boks('Behandling');
  check('T3 resistent: tjekliste og spironolacton', t3.includes('Behandlingsresistent') && t3.includes('Tilføj spironolacton 12,5–25 mg') && (await boks('Sekundær')).includes('Behandlingsresistent'));
  await saet({ alder: 60, hj: [146, 90], med: ['raas', 'cca', 'thiazid'], k: 4.8, egfr: 70 });
  check('T4 kalium > 4,5 → spironolacton ikke egnet', (await boks('Behandling')).includes('Spironolacton er ikke egnet'));
  await saet({ alder: 60, hj: [128, 78], med: ['raas', 'cca'] });
  check('T5 i mål → grøn vurdering og årskontrol', (await klasse('Vurdering')).includes('box-green') && (await boks('Kontrol')).includes('Årskontrol'));

  // ---------------- Akut ----------------
  await saet({ alder: 60, kli: [196, 118], akut: ['neuro'] });
  check('A1 ≥ 180/110 med symptomer → nødstilfælde, akut indlæggelse', (await klasse('⚠ Hypertensivt nødstilfælde')).includes('box-red') && (await boks('⚠ Hypertensivt nødstilfælde')).includes('akut indlæggelse'));
  await saet({ alder: 60, kli: [186, 104] });
  check('A2 ≥ 180/110 uden symptomer → behandling straks, kontrol 1 uge, medicin', (await boks('Svær hypertension uden symptomer')).includes('1 uge') && (await boks('Vurdering')).includes('Medicinsk behandling nu'));

  // ---------------- Prøver og fund ----------------
  await saet({ alder: 50, hj: [150, 95] });
  const pr = await p.evaluate(() => { const h = [...document.querySelectorAll('#output h3')].find((x) => x.textContent.startsWith('Udredning ved debut')); return h ? [...h.closest('.box').querySelectorAll('tbody tr')].map((tr) => tr.textContent) : []; });
  check('P1 debut: prøvetabel med elektrolytter, kreatinin, albumin, HbA1c, lipider, Hb/TSH og EKG', ['Natrium og kalium', 'Kreatinin og eGFR', 'Urin-albumin', 'HbA1c', 'Lipidprofil', 'Hæmoglobin og TSH', 'EKG'].every((k) => pr.some((x) => x.includes(k))), pr.length + ' rækker');
  check('P2 debut: tabellen er åben (ikke foldet)', await p.evaluate(() => !document.querySelector('#output .proever').closest('details')));
  await saet({ alder: 50, hj: [150, 95], k: 3.1 });
  check('L1 kalium 3,1 uden diuretikum → primær aldosteronisme', (await boks('Blodprøver — fund')).includes('primær aldosteronisme'));
  await saet({ alder: 50, hj: [150, 95], med: ['raas', 'spiro'], k: 5.8 });
  check('L2 kalium 5,8 på spironolacton → pausér', (await boks('Blodprøver — fund')).includes('pausér spironolacton'));
  await saet({ alder: 70, hj: [150, 95], med: ['thiazid'], na: 127 });
  check('L3 natrium 127 på thiazid → pausér thiazid', (await boks('Blodprøver — fund')).includes('pausér thiazid'));
  await saet({ alder: 70, hj: [150, 95], uacr: 85, egfr: 52, hba1c: 51 });
  const l4 = await boks('Blodprøver — fund');
  check('L4 albuminuri, eGFR 52 og HbA1c 51 → fund med links', l4.includes('albuminuri') && l4.includes('kronisk nyresygdom') && l4.includes('HbA1c 51') && (await p.locator('#output a', { hasText: 'Kronisk nyresygdom' }).count()) >= 1);
  check('L5 albuminuri giver høj risiko → medicin nu', (await boks('Vurdering')).includes('Medicinsk behandling nu'));

  // ---------------- Sekundær hypertension ----------------
  await saet({ alder: 34, hj: [150, 98], sek: ['ung', 'anfald', 'kreastig', 'medicin'] });
  const sk = await boks('Sekundær');
  check('S1 sekundær: ung, fæokromocytom, nyrearteriestenose og medicin', sk.includes('Debut før 40 år') && sk.includes('metanefriner') && sk.includes('nyrearteriestenose') && sk.includes('paracetamol'));

  // ---------------- Journal ----------------
  await saet({ alder: 62, kli: [158, 96], hj: [148, 92], score: 'hoej', med: ['raas'], k: 3.2 });
  const j = await journal();
  check('J1 journal: målinger, baggrund, behandling, vurdering og plan', j.startsWith('Blodtryk') && j.includes('Målinger: klinik 158/96, hjemme 148/92 mmHg.') && j.includes('høj hjerte-kar-risiko') && j.includes('Aktuel behandling: ACE-hæmmer/angiotensin II-receptorblokker') && j.includes('over målet') && j.includes('Behandling: To præparater') && j.includes('OBS: Kalium 3,2') && j.includes('Mål: 120–135/70–85 mmHg (18–80 år)'), j);
  await p.click('#copyFullBtn'); await p.waitForTimeout(80);
  const fuld = await p.evaluate(() => navigator.clipboard.readText());
  check('J2 fuld vurdering med prøvetabel', fuld.includes('UDREDNING VED DEBUT') && fuld.includes('Natrium og kalium — '));

  // ---------------- Mobil og fejl ----------------
  const m = await ctx.newPage(); await m.setViewportSize({ width: 360, height: 800 });
  await m.goto(BASE); await m.fill('#alder', '58'); await m.fill('#hjS', '150'); await m.fill('#hjD', '95'); await m.waitForTimeout(100);
  check('M1 ingen vandret scroll på mobil', await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('M2 restordre-hint under resultatet', (await p.locator('.restordre-hint a[href="https://restordre.dk/"]').count()) === 1);
  check('Z1 ingen JavaScript-fejl', errors.length === 0, errors.join(' | '));
  console.log('FAILS:', fails); await b.close();
})();
