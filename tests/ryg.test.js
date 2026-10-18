const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Tester MR-columna i 3D (ryg/): tolkning af MR-beskrivelser, kobling til
// 3D-modellens shape keys og rødder, redigering af fund, visninger og app (manifest, offline).
// BASE kan pege på den byggede claude.ai-version (tools/ryg/byg_artifact.py); så springes app-delen over.
// Den henter three.js fra jsDelivr — er nettet lukket, kan JSDELIVR_LOKAL pege på en lokal kopi af
// npm-pakken three@0.170.0, som så bruges i stedet.
const fs = require('fs');
const path = require('path');
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const APP = ROOT + 'ryg/';
const SIDE = process.env.BASE || APP + 'index.html';
const ARTIFACT = !!process.env.BASE;
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  if (process.env.JSDELIVR_LOKAL) {
    await ctx.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**', (r) => {
      const fil = path.join(process.env.JSDELIVR_LOKAL, new URL(r.request().url()).pathname.replace('/npm/three@0.170.0/', ''));
      r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(fil) });
    });
  }
  await p.goto(SIDE);
  const tolk = (t) => p.evaluate((t) => { const r = MR.tolk(t); return { fund: r.fund, neg: r.negerede, model: MR.model(r.fund, r.negerede) }; }, t);
  const find = (r, type) => r.fund.filter((f) => f.type === type);
  let r, f;

  // ---------------- Tolkning ----------------
  r = await tolk('L3/L4: Normale forhold.\nL4/L5: Venstresidig paracentral diskusprolaps (ekstrusion), der komprimerer venstre L5-rod i recessus. Let foraminal stenose bilateralt. Facetledsartrose.\nL5/S1: Ingen prolaps eller rodpåvirkning. Frie foramina.');
  f = find(r, 'prolaps');
  check('T1 én prolaps på L4/L5 (L5/S1 er nægtet)', f.length === 1 && f[0].niveau === 'L4/L5' && r.neg.some((x) => x.type === 'prolaps' && x.niveau === 'L5/S1'), JSON.stringify(f));
  check('T1 ekstrusion, paracentral, venstre', f[0].prolapstype === 'ekstrusion' && f[0].zone === 'paracentral' && f[0].side === 'v');
  check('T1 venstre L5-rod komprimeret', find(r, 'rod').some((x) => x.rod === 'L5' && x.side === 'v' && x.rodgrad === 3));
  check('T1 let foraminal stenose bilateralt', find(r, 'foraminalstenose').some((x) => x.side === 'begge' && x.grad === 1));
  check('T1 facetledsartrose begge sider', find(r, 'facetartrose').some((x) => x.side === 'begge'));
  check('T1 model: ekstrusion venstre + foraminal + facet', r.model.keys.L4L5_ekstrusion_paracentral_v === 1 && r.model.keys.L4L5_foraminalstenose_v === 0.5 && r.model.keys.L4L5_foraminalstenose_h === 0.5 && r.model.keys.L4L5_facetartrose_v > 0, JSON.stringify(r.model.keys));
  check('T1 model: L5 venstre rød, L4 orange (afledt)', r.model.roder.Rod_L5_v && !r.model.roder.Rod_L5_v.afledt && r.model.roder.Rod_L4_v.afledt && r.model.roder.Rod_L4_h.afledt, JSON.stringify(r.model.roder));

  r = await tolk('Ved L4-5 ses bredbaset protrusion med moderat spinalstenose og hypertrofi af ligamentum flavum samt udtalt facetledsartrose bilateralt. Ingen rodkompression.');
  check('T2 "L4-5" læses som L4/L5', r.fund.every((x) => x.niveau === 'L4/L5'), JSON.stringify(r.fund.map((x) => x.niveau)));
  check('T2 bredbaset protrusion = central', find(r, 'prolaps')[0]?.zone === 'central' && find(r, 'prolaps')[0]?.prolapstype === 'protrusion');
  check('T2 moderat spinalstenose (ikke "udtalt" fra nabofundet)', find(r, 'spinalstenose')[0]?.grad === 2, JSON.stringify(find(r, 'spinalstenose')));
  check('T2 udtalt facetledsartrose', find(r, 'facetartrose')[0]?.grad === 3);
  check('T2 flavumhypertrofi', find(r, 'flavumhypertrofi').length === 1);
  check('T2 rodkompression nægtet -> ingen rødder', r.neg.some((x) => x.type === 'rod') && Object.keys(r.model.roder).length === 0, JSON.stringify(r.model.roder));
  check('T2 model: spinalstenose 0,78', Math.abs(r.model.keys.L4L5_spinalstenose - 0.78) < 1e-9 && r.model.keys.L4L5_protrusion_central === 1);

  r = await tolk('Højresidig foraminal prolaps L4/L5 med kontakt til exiterende L4-rod. Ingen spinalstenose.');
  check('T3 foraminal højre, L4-rod kontakt', find(r, 'prolaps')[0]?.zone === 'foraminal' && find(r, 'prolaps')[0]?.side === 'h' && find(r, 'rod').some((x) => x.rod === 'L4' && x.rodgrad === 1 && x.side === 'h'));
  check('T3 spinalstenose nægtet', find(r, 'spinalstenose').length === 0 && r.neg.some((x) => x.type === 'spinalstenose'));
  check('T3 model: protrusion foraminal højre + note om type', r.model.keys.L4L5_protrusion_foraminal_h === 1 && r.model.noter.some((t) => t.includes('Prolapstypen er ikke angivet')));

  r = await tolk('L4/L5: Svær spinalstenose (Schizas C). Recesstenose på venstre side.');
  check('T4 Schizas C = svær', find(r, 'spinalstenose')[0]?.grad === 3);
  check('T4 recesstenose venstre -> L5 venstre orange', find(r, 'recesstenose')[0]?.side === 'v' && r.model.keys.L4L5_recesstenose_v > 0 && r.model.roder.Rod_L5_v?.afledt);

  r = await tolk('Diskusprolaps L4/L5 til højre, ikke rodpåvirkning, men lettere foraminal stenose til højre. 010190-1234');
  check('T5 "men" bryder nægtelsen', find(r, 'foraminalstenose')[0]?.side === 'h' && find(r, 'foraminalstenose')[0]?.grad === 1);
  check('T5 CPR fjernes fra kildeuddrag', !JSON.stringify(r).includes('010190'));
  check('T5 zone og type ikke angivet -> noter', r.model.noter.length === 2 && r.model.keys.L4L5_protrusion_paracentral_h === 1);

  r = await tolk('L5/S1: Paracentral diskusprolaps til venstre med påvirkning af venstre S1-rod.');
  check('T6 L5/S1 paracentral venstre -> S1 venstre påvirket', find(r, 'prolaps')[0]?.niveau === 'L5/S1' && r.model.keys.L5S1_protrusion_paracentral_v === 1 && r.model.roder.Rod_S1_v?.grad === 2 && !r.model.roder.Rod_S1_v.afledt, JSON.stringify(r.model));
  r = await tolk('L3/L4: Højresidig foraminal diskusprolaps. L5/S1: Recesstenose til venstre. L4/L5: Ingen prolaps.');
  check('T6b L3/L4 foraminal højre -> L3 højre orange', r.model.keys.L3L4_protrusion_foraminal_h === 1 && r.model.roder.Rod_L3_h?.afledt, JSON.stringify(r.model));
  check('T6c L5/S1 recesstenose venstre -> S1 venstre orange', r.model.keys.L5S1_recesstenose_v > 0 && r.model.roder.Rod_S1_v?.afledt);
  check('T6d L4/L5 nægtet -> ingen L4L5-nøgler', !Object.keys(r.model.keys).some((k) => k.startsWith('L4L5_')));
  r = await tolk('L5/S1: Flavumhypertrofi. L2/L3: Diskusprolaps.');
  check('T6e flavum ved L5/S1 kan ikke vises -> note; L2/L3 ikke modelleret', Object.keys(r.model.keys).length === 0 && r.model.noter.some((t) => t.includes('L5/S1')));
  check('T6f patienttekst: foraminal stenose L3/L4 nævner L3-roden', await p.evaluate(() => MR.forklaring(MR.tolk('L3/L4: Foraminal stenose til venstre.').fund)[0].t.includes('L3-roden')));
  r = await tolk('Spondylolistese grad 1 L4/L5. Modic type 1 forandringer. Annulusfissur L4/L5.');
  check('T7 andre fund listes', ['spondylolistese', 'modic', 'fissur'].every((a) => r.fund.some((x) => x.andet === a)));
  r = await tolk('L4/L5: Ekstraforaminal diskusprolaps th. med deplacering af L4-roden.');
  check('T8 ekstraforaminal, th., L4 komprimeret', find(r, 'prolaps')[0]?.zone === 'ekstraforaminal' && find(r, 'prolaps')[0]?.side === 'h' && r.model.roder.Rod_L4_h?.grad === 3, JSON.stringify(r.model));

  // ---------------- Side: 3D-model og liste ----------------
  await p.waitForFunction(() => window.RygVisning && window.RygVisning.klar, null, { timeout: 60000 });
  const obj = await p.evaluate(() => window.RygVisning.objekter());
  check('M1 model indlæst med knogler, diske, sæk og rødder', ['L4', 'L5', 'Disc_L4L5', 'Durasaek', 'Rod_L5_v', 'Rod_L4_h', 'Flavum'].every((n) => obj.includes(n)), obj.join(','));
  check('M2 tom side: ingen shape keys', Object.keys(await p.evaluate(() => window.RygVisning.influenser())).length === 0);
  await p.click('#eksempelBtn'); await p.waitForTimeout(1600);
  let inf = await p.evaluate(() => window.RygVisning.influenser());
  check('M3 eksempel: ekstrusion L4/L5 venstre, bulging L3/L4 og foraminal stenose L5/S1 højre', inf.L4L5_ekstrusion_paracentral_v > 0.99 && inf.L4L5_foraminalstenose_h > 0.49 && inf.L3L4_bulging > 0.6 && inf.L5S1_foraminalstenose_h > 0.7, JSON.stringify(inf));
  check('M3b fokus på L4/L5 (prolapsen)', await p.evaluate(() => window.RygVisning.niveau) === 'L4/L5');
  let roder = await p.evaluate(() => window.RygVisning.roder());
  check('M4 L5 venstre rød, L4 orange, L5 højre normal ("Ingen rodpåvirkning" ved L5/S1)', roder.Rod_L5_v === '#d62828' && roder.Rod_L4_v === '#f08c00' && roder.Rod_L5_h === '#f0dc8c', JSON.stringify(roder));
  const raekker = await p.locator('.ryg-fund-raekke').count();
  check('M5 fundliste med mindst 5 rækker', raekker >= 5, String(raekker));
  check('M6 forklaring til patienten nævner L5-roden', (await p.locator('#forklaring').innerText()).includes('L5-roden'));
  // ---------------- Helingsforløbet ----------------
  check('H0 navne er slået fra som standard', !(await p.locator('#visNavne').isChecked()));
  check('H1 helingspanel klar ved prolaps', await p.locator('#helStart').isEnabled() && await p.locator('#helDetaljer').isVisible() && (await p.locator('#helType').innerText()).includes('ekstrusion'));
  await p.locator('#helTid').fill('7'); await p.waitForTimeout(400);
  inf = await p.evaluate(() => window.RygVisning.influenser());
  let hel = await p.evaluate(() => ({ aktiv: window.RygVisning.helingAktiv, visning: window.RygVisning.visningNavn, fase: document.querySelector('#helFaser li.aktiv')?.dataset.fase, tekst: document.getElementById('helFaseTekst').innerText }));
  check('H2 uge 7: fase 2, prolapsen skrumper, andre fund skjult', hel.aktiv && hel.fase === '2' && hel.tekst.includes('Nedbrydningsfasen') && inf.L4L5_ekstrusion_paracentral_v > 0.3 && inf.L4L5_ekstrusion_paracentral_v < 0.95 && !inf.L5S1_foraminalstenose_h, JSON.stringify({ hel, inf }));
  check('H3 helingen skifter til snit fra siden', hel.visning === 'sagittal');
  const maal = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-maal]')].map((b) => [b.dataset.maal, parseFloat(getComputedStyle(b).getPropertyValue('--v'))])));
  check('H4 uge 7: makrofager og udtørring aktive, smerte faldende', maal.makro > 0.8 && maal.tor > 0.3 && maal.smerte < 0.6 && maal.smerte > 0.45, JSON.stringify(maal));
  const kant = await p.evaluate(() => { const b = document.getElementById('visning').getBoundingClientRect(); return [...document.querySelectorAll('.ryg-label-heling:not([hidden])')].map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.left - b.left, b.right - r.right); }); });
  check('H10 helingstekster står i kanten af 3D-feltet (med streg ind)', kant.length > 0 && kant.every((d) => d <= 10) && (await p.locator('.ryg-ledere line').count()) >= kant.length, JSON.stringify(kant));
  await p.locator('#helTid').fill('26'); await p.waitForTimeout(400);
  inf = await p.evaluate(() => window.RygVisning.influenser());
  check('H5 uge 26: ekstrusion skrumpet til ca. 30 %, fase 3', Math.abs(inf.L4L5_ekstrusion_paracentral_v - 0.3) < 0.03 && (await p.evaluate(() => document.querySelector('#helFaser li.aktiv')?.dataset.fase)) === '3', JSON.stringify(inf));
  check('H6 graf med tre kurver og markør', (await p.locator('#helGraf polyline').count()) === 3 && (await p.locator('#helMarkoer').count()) === 1);
  await p.click('#helStop'); await p.waitForTimeout(300);
  inf = await p.evaluate(() => window.RygVisning.influenser());
  check('H7 tilbage til fundet: fuld prolaps og øvrige fund igen', !(await p.evaluate(() => window.RygVisning.helingAktiv)) && inf.L4L5_ekstrusion_paracentral_v > 0.99 && inf.L5S1_foraminalstenose_h > 0.7, JSON.stringify(inf));
  check('H8 kurver: protrusion skrumper mindre end ekstrusion', await p.evaluate(() => window.Heling.kurver(26, 'protrusion').storrelse > window.Heling.kurver(26, 'ekstrusion').storrelse));
  // Ret siden på prolapsen til højre
  const sideSel = p.locator('.ryg-fund-raekke', { hasText: 'Diskusprolaps' }).locator('select[data-felt="side"]');
  await sideSel.selectOption('h'); await p.waitForTimeout(1500);
  inf = await p.evaluate(() => window.RygVisning.influenser());
  check('M7 ret side -> prolaps til højre', inf.L4L5_ekstrusion_paracentral_h > 0.99 && !inf.L4L5_ekstrusion_paracentral_v, JSON.stringify(inf));
  // Skyder: normal ryg
  await p.locator('#fundStyrke').fill('0'); await p.waitForTimeout(100);
  check('M8 skyder på "normal" -> ingen forandring', Object.keys(await p.evaluate(() => window.RygVisning.influenser())).length === 0);
  await p.locator('#fundStyrke').fill('100');
  // Snitvisninger
  await p.click('[data-visning="aksial"]'); await p.waitForTimeout(200);
  check('M9 snit ovenfra viser snit-skyder', await p.locator('#snitKontrol').isVisible() && (await p.locator('[data-visning="aksial"]').getAttribute('aria-pressed')) === 'true');
  await p.click('[data-visning="3d"]'); await p.waitForTimeout(200);
  check('M10 3D skjuler snit-skyder', await p.locator('#snitKontrol').isHidden());
  // Ryd og tilføj manuelt
  await p.click('#rydBtn'); await p.waitForTimeout(1300);
  check('H9 ingen prolaps -> helingen kan ikke startes', await p.locator('#helStart').isDisabled() && await p.locator('#helIngen').isVisible());
  check('M11 ryd -> ingen fund', Object.keys(await p.evaluate(() => window.RygVisning.influenser())).length === 0 && (await p.locator('.ryg-fund-raekke').count()) === 0);
  await p.selectOption('#tilfoejValg', 'spinalstenose'); await p.waitForTimeout(1400);
  inf = await p.evaluate(() => window.RygVisning.influenser());
  check('M12 tilføj spinalstenose manuelt', inf.L4L5_spinalstenose > 0.7, JSON.stringify(inf));
  await p.fill('#mrTekst', 'L5/S1: Venstresidig paracentral diskusprolaps (ekstrusion).'); await p.click('#tolkBtn'); await p.waitForTimeout(1500);
  inf = await p.evaluate(() => window.RygVisning.influenser());
  check('M12b L5/S1: ekstrusion vises og fokus flyttes', inf.L5S1_ekstrusion_paracentral_v > 0.99 && (await p.evaluate(() => window.RygVisning.niveau)) === 'L5/S1', JSON.stringify(inf));
  await p.locator('.ryg-fund-raekke', { hasText: 'Diskusprolaps' }).locator('select[data-felt="niveau"]').selectOption('L3/L4'); await p.waitForTimeout(1500);
  inf = await p.evaluate(() => window.RygVisning.influenser());
  check('M12c ret niveau til L3/L4', inf.L3L4_ekstrusion_paracentral_v > 0.99 && !inf.L5S1_ekstrusion_paracentral_v && (await p.evaluate(() => window.RygVisning.niveau)) === 'L3/L4', JSON.stringify(inf));
  roder = await p.evaluate(() => window.RygVisning.roder());
  check('M12d L3/L4 paracentral venstre -> L4 venstre orange', roder.Rod_L4_v === '#f08c00', JSON.stringify(roder));
  await p.fill('#mrTekst', 'Patient 010190-1234. L4/L5: let bulging.'); await p.click('#tolkBtn'); await p.waitForTimeout(300);
  check('M13 CPR-advarsel vises', await p.locator('#cprAdvarsel').isVisible());
  check('M14 restordre-hint findes ikke (ingen præparatvalg)', (await p.locator('.restordre-hint').count()) === 0);

  // ---------------- App ----------------
  if (ARTIFACT) {
    check('A0 artifact: ingen manifest eller installér-knap', (await p.locator('link[rel="manifest"]').count()) === 0 && (await p.locator('[data-install]').count()) === 0);
    check('A7 JS-fejl', errors.length === 0, JSON.stringify(errors));
    console.log('FAILS:', fails); await b.close(); return;
  }
  const man = await (await p.request.get(APP + 'manifest.webmanifest')).json();
  check('A1 manifest', man.name === 'MR-columna i 3D' && man.start_url === 'index.html' && man.scope === './' && man.display === 'standalone');
  for (const ic of man.icons) check(`A2 ikon ${ic.src}`, (await p.request.get(APP + ic.src)).ok());
  const reg = await p.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  check('A3 SW scope', reg === APP, reg);
  await p.reload(); await p.waitForTimeout(400);
  await ctx.setOffline(true);
  const res = await p.goto(APP + 'index.html').catch(() => null);
  check('A4 offline: siden åbner', !!res && res.ok());
  await p.waitForFunction(() => window.RygVisning && window.RygVisning.klar, null, { timeout: 60000 }).catch(() => {});
  check('A5 offline: 3D-model indlæses', await p.evaluate(() => !!(window.RygVisning && window.RygVisning.klar)));
  await ctx.setOffline(false);
  const html = await (await p.request.get(ROOT + 'apps.html')).text();
  check('A6 prototypen er skjult på downloadsiden', !/ryg\//.test(html));
  check('A7 JS-fejl', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
