const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Børneundersøgelser: valg af undersøgelse efter alder, korrigeret alder, tjekliste,
// milepæle, alarmfund, vaccinationskalender og journalnotat.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const SIDE = process.env.BASE || ROOT + 'boern/boern.html';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(SIDE).origin });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  await p.goto(SIDE); await p.waitForTimeout(150);

  // o: { foedt, dato, kons, koen, ga, vacc, forhold[], fund[] }
  async function saet(o = {}) {
    await p.click('#resetBtn');
    await p.fill('#dato', o.dato || '2026-10-27');
    if (o.foedt) await p.fill('#foedt', o.foedt);
    if (o.kons) await p.check(`input[name="kons"][value="${o.kons}"]`);
    if (o.koen) await p.check(`input[name="koen"][value="${o.koen}"]`);
    if (o.ga) await p.fill('#ga', String(o.ga));
    if (o.vacc) await p.check(`input[name="vacc"][value="${o.vacc}"]`);
    for (const f of o.forhold || []) await p.check(`input[name="forhold"][value="${f}"]`);
    for (const f of o.fund || []) await p.check(`input[name="fund"][value="${f}"]`);
    await p.waitForTimeout(50);
    return p.locator('#output').innerText();
  }
  const boks = (titel) => p.evaluate((t) => { const h = [...document.querySelectorAll('#output .box h3')].find((x) => x.textContent.startsWith(t)); return h ? h.closest('.box').innerText : ''; }, titel);
  const klasse = (titel) => p.evaluate((t) => { const h = [...document.querySelectorAll('#output .box h3')].find((x) => x.textContent.startsWith(t)); return h ? h.closest('.box').className : ''; }, titel);
  const tjek = () => p.evaluate(() => [...document.querySelectorAll('.tjekliste input')].map((i) => i.closest('label').textContent.trim()));

  let out = await saet({});
  check('B1 uden fødselsdato: beder om den; 5-ugersundersøgelse', out.includes('Angiv fødselsdato') && out.startsWith('5-ugersundersøgelse'));
  out = await saet({ foedt: '2026-09-22' }); // 35 dage
  let t = await tjek();
  check('B2 5 uger: alder, hofter, rød refleks, hjerte, testikler og forældrenes trivsel', out.includes('Alder: 5 uger og 0 dage') && ['Ortolani', 'rød refleks', 'femoralispulse', 'Testikler', 'fødselsdepression', 'gulsot'].every((k) => t.some((x) => x.includes(k))), t.length + ' punkter');
  check('B3 5 uger: vejledning om D-vitamin og rygleje', (await boks('Vejledning til forældrene')).includes('D-vitamin 10 mikrog.') || t.some((x) => x.includes('D-vitamin 10 mikrog.')));
  await saet({ foedt: '2026-09-22', koen: 'pige' });
  t = await tjek();
  check('B4 pige: intet testikelfelt, ydre genitalia', await p.locator('#testisFelt').isHidden() && t.some((x) => x === 'Ydre genitalia'));
  out = await saet({ foedt: '2026-05-27' }); // 5 måneder
  t = await tjek();
  check('B5 5 måneder: vaccination 2, milepæle, næste undersøgelse', out.startsWith('5-månedersundersøgelse') && t.some((x) => x.includes('2. dosis')) && (await boks('Milepæle')).includes('Drejer fra mave til ryg') && out.includes('12-månedersundersøgelse omkring 27.05.2027'));
  out = await saet({ foedt: '2026-05-27', ga: 30 });
  check('B6 født uge 30: korrigeret alder i overskrift og milepæle', out.includes('korrigeret alder 11 uger og 6 dage, født i uge 30') && (await boks('Milepæle')).includes('korrigeret alder'));
  out = await saet({ foedt: '2022-10-20' }); // 4 år
  t = await tjek();
  check('B7 4 år: MFR 2 og synsprøve', out.startsWith('4-årsundersøgelse') && t.some((x) => x.includes('MFR (2. dosis'))  && t.some((x) => x.includes('synsprøve')));
  out = await saet({ foedt: '2021-10-01' }); // 5 år
  t = await tjek();
  check('B8 5 år: DiTeKiPol og skoleparathed; sidste undersøgelse', t.some((x) => x.includes('DiTeKiPol (revaccination')) && t.some((x) => x.includes('Skoleparathed')) && out.includes('Sidste forebyggende børneundersøgelse'));
  out = await saet({ foedt: '2024-10-15' }); // 2 år
  t = await tjek();
  check('B9 2 år: socialt samspil, iso-BMI og influenza', out.startsWith('2-årsundersøgelse') && t.some((x) => x.includes('Socialt samspil')) && t.some((x) => x.includes('iso-BMI')) && (await boks('Vaccinationer')).includes('Influenza'));

  // Alarmfund
  await saet({ foedt: '2026-09-22', fund: ['refleks', 'icterus', 'femoralis', 'hofte'] });
  const r = await boks('⚠ Handling nu');
  check('A1 hvid pupil, gulsot, femoralis og hofte → handling nu', (await klasse('⚠ Handling nu')).includes('box-red') && r.includes('akut til øjenafdeling') && r.includes('konjugeret bilirubin samme dag') && r.includes('coarctatio') && r.includes('børneortopædkirurg'));
  await saet({ foedt: '2026-09-22', fund: ['testis', 'mislyd', 'foraeldre'] });
  const g = await boks('Fund der skal følges op');
  check('A2 testikel, mislyd og fødselsdepression → opfølgning', g.includes('3 måneders alder efter termin') && g.includes('pædiatrisk kardiologisk vurdering') && g.includes('EPDS') && (await p.locator('#output a', { hasText: 'Depression' }).count()) === 1);
  await saet({ foedt: '2024-10-15', fund: ['tab', 'socialt', 'sprog', 'omsorg', 'overvaegt'] });
  const a3r = await boks('⚠ Handling nu'); const a3g = await boks('Fund der skal følges op');
  check('A3 tab af færdigheder, autisme, sprog, omsorg og overvægt', a3r.includes('Tab af færdigheder') && a3g.includes('autismespektrumforstyrrelse') && a3g.includes('tale-høre-pædagog') && a3g.includes('underret kommunen') && a3g.includes('iso-BMI ≥ 30'));

  // Vaccinationer
  await saet({ foedt: '2026-05-27' });
  const rows = await p.evaluate(() => [...document.querySelectorAll('.tidslinje tbody tr')].map((tr) => ({ t: tr.textContent, c: tr.className })));
  check('V1 vaccinationskalender med datoer: 3 mdr passeret, 5 mdr aktuel', rows.length === 7 && rows[0].t.includes('27.08.2026') && rows[0].c === 'passeret' && rows[1].t.includes('27.10.2026') && rows[1].c === 'nu' && rows[3].t.includes('MFR (1)'), JSON.stringify(rows.map((x) => x.c)));
  check('V2 pneumokok-skift (Vaxneuvance) nævnt', (await boks('Vaccinationer')).includes('Vaxneuvance'));
  await saet({ foedt: '2026-05-27', vacc: 'mangler', forhold: ['hepb'] });
  const v3 = await boks('Vaccinationer');
  check('V3 mangler vaccinationer og hepatitis B-mor', (await klasse('Vaccinationer')).includes('box-amber') && v3.includes('forsinkede vaccinationer') && v3.includes('1, 2 og 12 måneder'));

  // Manuelt valg, advarsler, afkrydsning og journal
  out = await saet({ foedt: '2026-09-22', kons: '12m' });
  check('M1 manuelt valg uden for alderen → bemærk', out.includes('ligger normalt ved 12 måneder') && (await klasse('12-månedersundersøgelse')).includes('box-amber'));
  await saet({ foedt: '2018-01-01' });
  check('M2 over 7 år → advarsel', (await p.locator('#datoWarning').innerText()).includes('over 7 år'));
  await saet({ foedt: '2026-05-27', fund: ['skelen'] });
  await p.check('.tjekliste input[data-tjek="5m:samtale"]'); await p.check('.tjekliste input[data-tjek="5m:oejne"]'); await p.waitForTimeout(50);
  t = await tjek();
  check('M3 afkrydsning tæller', (await p.locator('#tjekStatus').innerText()) === `2 af ${t.length} gennemgået`);
  await p.click('#copyBtn'); await p.waitForTimeout(80);
  const j = await p.evaluate(() => navigator.clipboard.readText());
  check('J1 journal: overskrift, alder, fund, gennemgået og vaccinationer', j.startsWith('5-månedersundersøgelse 27.10.2026') && j.includes('Alder 5 måneder') && j.includes('Fund: Skelen') && j.includes('Gennemgået: Samtale med forældrene') && j.includes('Ikke afkrydset (tilpas):') && j.includes('følger børnevaccinationsprogrammet'), j);
  await p.click('#copyFullBtn'); await p.waitForTimeout(80);
  const fuld = await p.evaluate(() => navigator.clipboard.readText());
  check('J2 fuld vurdering med afkrydsning og kalender', fuld.includes('[x] Samtale') && fuld.includes('5 mdr. — 27.10.2026 — DiTeKiPol/Hib + pneumokok (2)'));

  const m = await ctx.newPage(); await m.setViewportSize({ width: 360, height: 800 });
  await m.goto(SIDE); await m.fill('#foedt', '2026-05-27'); await m.waitForTimeout(150);
  check('Z1 ingen vandret scroll på mobil', await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('Z2 ingen JavaScript-fejl', errors.length === 0, errors.join(' | '));
  console.log('FAILS:', fails); await b.close();
})();
