const { chromium } = require('playwright');
// Kør via tests/run_all.sh. EKG-tolkning: indlæsning af udskrifter (GE dansk/engelsk, Philips), referenceværdier,
// QTc-formler, maskinens udsagn, hastegrad, journalnotat og app/offline. BASE kan pege på et bygget artifact.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SIDE = process.env.BASE || ROOT + 'hjerte/ekg.html';
const ARTIFACT = !!process.env.BASE;
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(SIDE); await p.waitForTimeout(200);
  const ud = async (t) => { await p.click('#resetBtn'); await p.fill('#udfyldTekst', t); await p.click('#udfyldBtn'); await p.waitForTimeout(150); return p.locator('#output').innerText(); };
  const v = (id) => p.inputValue('#' + id);
  const tal = async () => p.evaluate(() => [...document.querySelectorAll('.ekg-qtc tbody tr')].map((r) => r.cells[0].innerText.split(' ')[0] + '=' + r.cells[1].innerText.split(' ')[0]).join(' '));
  const raekke = (navn) => p.evaluate((n) => { const r = [...document.querySelectorAll('.ekg-tabel tbody tr')].find((x) => x.cells[0].innerText.startsWith(n)); return r ? r.className + ' | ' + r.cells[3].innerText : ''; }, navn);

  check('S0 tom side viser vejledning, indsæt-feltet er åbent', (await p.locator('#output').innerText()).includes('Indsæt teksten') && (await p.locator('details.udfyld').getAttribute('open')) !== null);

  // ---------------- Brugerens eksempel (GE CardioSoft, dansk) ----------------
  const GE = `Placering: * 0 *
Systemevaluering:
Sinusrytme med AV-blok grad I med lejlighedsvis Præmature
ventrikulære
komplekser
I øvrigt normal EKG
GE CardioSoft V7.0(2)
25 mm/s 10 mm/mV 0.05-150 Hz 50 Hz 12SL V23
Ubekræftet
Side 1
Tilstedevær. læge:
Hjertefrekvens 63 spm
PR interval 266 ms
QRS varighed 112 ms
QT / QTc(B) 418 / 427 ms
P-R-T akser 61 / 33 / 53 °
P varighed 128 ms
RR / PP interval 952 / 955 ms
Sokolow-Lyon 2.53 mV`;
  let r = await ud(GE);
  check('E1 alle værdier udfyldt', (await v('hr')) === '63' && (await v('pr')) === '266' && (await v('qrs')) === '112' && (await v('qt')) === '418' && (await v('qtc')) === '427' && (await v('qtcFormel')) === 'B' && (await v('paxe')) === '61' && (await v('qrsaxe')) === '33' && (await v('taxe')) === '53' && (await v('pdur')) === '128' && (await v('rr')) === '952' && (await v('pp')) === '955' && (await v('sokolow')) === '2.53');
  const mask = await v('maskine');
  check('E2 maskinens tolkning uden apparatlinjer', mask.startsWith('Sinusrytme med AV-blok grad I med lejlighedsvis Præmature ventrikulære komplekser') && mask.includes('I øvrigt normal EKG') && !/CardioSoft|mm\/s/.test(mask), mask);
  check('E3 ubekræftet registreret', (await v('ubekraeftet')) === '1' && r.includes('ubekræftet'));
  check('E4 sammenfatning: fund uden umiddelbar betydning', r.includes('Fund uden umiddelbar betydning') && r.includes('AV-blok grad I (PR 266 ms)') && r.includes('Let forlænget QRS 112 ms') && r.includes('interatrielt blok') && r.includes('Ventrikulære ekstrasystoler'), r.slice(0, 300));
  check('E5 QTc-formler (QT 418, RR 952)', (await tal()) === 'Fridericia=425 Bazett=428 Framingham=425 Hodges=423', await tal());
  check('E6 QTc normal, apparatets Bazett vises', r.includes('QTc 425 ms (Fridericia) — Normal QTc') && r.includes('apparatet: 427 ms'));
  check('E7 akser og QRS-T-vinkel normale', (await raekke('QRS-akse')).includes('niveau-ok') && (await raekke('QRS-T')).includes('niveau-ok') && (await raekke('P-akse')).includes('niveau-ok'));
  check('E8 handling: VES, AV-blok I og interatrielt blok', r.includes('Forslag til handling') && r.includes('Holter') && r.includes('AV-knude-hæmmende medicin'));
  let n = await p.locator('#journalTekst').innerText();
  check('E9 journalnotat', /^EKG \d/.test(n) && n.includes('frekvens 63/min, PR 266 ms, QRS 112 ms, QT 418 ms, QTc 425 ms (Fridericia; apparatet 427 ms Bazett)') && n.includes('akser P/QRS/T 61/33/53°') && n.includes('Maskinens tolkning (ubekræftet): Sinusrytme') && n.includes('Vurdering af måleværdier: AV-blok grad I (PR 266 ms)') && n.includes('Kurven gennemset'), n);
  // Klinik ændrer hastegraden: AV-blok I + synkope → afvigende.
  await p.check('input[name="klinik"][value="synkope"]'); await p.waitForTimeout(80);
  r = await p.locator('#output').innerText();
  check('E10 synkope gør AV-blok I afvigende og foreslår kardiolog', r.includes('Afvigende fund') && r.includes('henvis til kardiolog (Holter'), r.slice(0, 200));
  await p.click('#resetBtn'); await p.waitForTimeout(80);
  check('E11 Nulstil rydder alt', (await v('hr')) === '' && (await v('maskine')) === '' && (await v('ubekraeftet')) === '' && (await p.locator('#output').innerText()).includes('Indsæt teksten') && !(await p.isChecked('input[name="klinik"][value="synkope"]')));

  // ---------------- Engelsk GE MUSE og Philips ----------------
  r = await ud('Vent. rate 72 BPM\nPR interval 182 ms\nQRS duration 98 ms\nQT/QTcB 380/416 ms\nP-R-T axes 45 -52 30\nSinus rhythm\nLeft anterior fascicular block\nAbnormal ECG\nMale 64 years');
  check('M1 MUSE (engelsk) indlæses', (await v('hr')) === '72' && (await v('pr')) === '182' && (await v('qrs')) === '98' && (await v('qt')) === '380' && (await v('qtc')) === '416' && (await v('qrsaxe')) === '-52' && await p.isChecked('input[name="koen"][value="mand"]') && (await v('alder')) === '64');
  check('M2 venstre anterior fascikelblok: akse og udsagn', (await raekke('QRS-akse')).includes('venstre anterior fascikelblok') && r.includes('Venstre anterior fascikelblok (hemiblok)'));
  r = await ud('Rate 58\nPR 210\nQRSD 132\nQT 440\nQTc 433\n--AXIS--\nP 50\nQRS -60\nT 120\nSinus bradycardia with 1st degree A-V block\nRight bundle branch block\nLeft anterior fascicular block');
  check('M3 Philips indlæses', (await v('hr')) === '58' && (await v('pr')) === '210' && (await v('qrs')) === '132' && (await v('qt')) === '440' && (await v('qtc')) === '433' && (await v('paxe')) === '50' && (await v('qrsaxe')) === '-60' && (await v('taxe')) === '120');
  check('M4 RBBB + LAFB = bifascikulært blok', r.includes('Bifascikulært blok') && r.includes('Højresidigt grenblok'));
  check('M5 bred QRS: Bogossian-skøn og note', r.includes('Bogossian') && (await tal()).includes('Bogossian'));
  check('M6 AV-blok I + bred QRS = afvigende (udbredt ledningssygdom)', (await raekke('PR-interval')).includes('niveau-warn') && r.includes('udbredt ledningssygdom'));
  r = await ud('PQ-tid 0,18 s\nQRS 0,09 s\nP-R-T akser 50 / −45 / 30\nSokolow-Lyon 42 mm\nAlder 60 år');
  check('M7 sekunder, mm og typografisk minus omregnes', (await v('pr')) === '180' && (await v('qrs')) === '90' && (await v('qrsaxe')) === '-45' && (await v('sokolow')) === '4.2' && (await v('alder')) === '60');
  check('M8 Sokolow > 3,5 mV hos 60-årig = hypertrofi (organskade)', (await raekke('Sokolow')).includes('niveau-warn') && r.includes('ESH 2023'));

  // ---------------- QTc-grænser ----------------
  const qt = async (qtv, rrv, hr, koen, extra = '') => { await p.click('#resetBtn'); await p.fill('#qt', String(qtv)); await p.fill('#rr', String(rrv)); if (hr) await p.fill('#hr', String(hr)); if (koen) await p.check(`input[name="koen"][value="${koen}"]`); if (extra) await p.fill('#maskine', extra); await p.waitForTimeout(80); return p.locator('#output').innerText(); };
  r = await qt(455, 1000, 60, 'kvinde');
  check('Q1 kvinde QTc 455 = højnormal', r.includes('Højnormal QTc'));
  r = await qt(455, 1000, 60, 'mand');
  check('Q2 mand QTc 455 = forlænget', r.includes('Forlænget QTc (≥ 450 ms hos mænd') && r.includes('crediblemeds'));
  r = await qt(455, 1000, 60, 'ukendt');
  check('Q3 ukendt køn QTc 455 = angiv køn', r.includes('angiv køn'));
  r = await qt(485, 1000, 60, 'mand');
  check('Q4 QTc ≥ 480 = lang-QT-syndrom ved gentagne målinger', r.includes('lang-QT-syndrom'));
  r = await qt(520, 1000, 60, 'kvinde');
  check('Q5 QTc ≥ 500 = handling nu', r.includes('Kræver handling nu') && r.includes('torsades') && r.includes('kalium, magnesium og calcium'));
  r = await qt(360, 600, 100, 'mand');
  check('Q6 Bazett overkorrigerer ved puls > 80 (B 465 / F 427)', r.includes('Bazett giver 465 ms, men overkorrigerer') && r.includes('QTc 427 ms (Fridericia)'));
  r = await qt(500, 1250, 48, 'kvinde');
  check('Q7 Bazett underkorrigerer ved lav puls (F ≥ 460, B < 460)', r.includes('underkorrigerer'), r.slice(0, 400));
  r = await qt(300, 1000, 60, 'mand');
  check('Q8 QTc ≤ 320 = kort-QT-syndrom bør overvejes', r.includes('kort-QT-syndrom bør overvejes'));
  await p.click('#resetBtn'); await p.fill('#qtc', '470'); await p.check('input[name="koen"][value="mand"]'); await p.waitForTimeout(80);
  r = await p.locator('#output').innerText();
  check('Q9 kun apparatets QTc: vurderes og beder om QT og RR', r.includes('Forlænget QTc') && r.includes('Angiv QT og RR'));

  // ---------------- Maskinens udsagn og hastegrad ----------------
  r = await ud('Systemevaluering:\nAtrieflimren med hurtig ventrikelrespons\nAbnormt EKG\nHjertefrekvens 132 spm\nQRS varighed 90 ms\nQT / QTc(B) 300 / 444 ms');
  check('U1 atrieflimren: ventrikelfrekvens, link til Atrieflimren, overdiagnose-advarsel', r.includes('Ventrikelfrekvens') && r.includes('Over målet for frekvenskontrol') && r.includes('overdiagnosticerer') && (await p.locator('#output a').filter({ hasText: 'Atrieflimren-værktøjet' }).count()) >= 1 && r.includes('Uregelmæssig rytme'));
  r = await ud('Systemevaluering:\nSinusrytme\n** ** ** ** * Akut MI * ** ** ** **\nAnteriort infarkt, muligvis akut');
  check('U2 akut infarkt = handling nu, 112', r.includes('Kræver handling nu') && r.includes('112'));
  r = await ud('Systemevaluering:\nSinusrytme\nVenstresidigt grenblok\nAbnormt EKG\nQRS varighed 148 ms');
  check('U3 LBBB uden symptomer = afvigende, ekkokardiografi', r.includes('Afvigende fund') && r.includes('ekkokardiografi'));
  await p.check('input[name="klinik"][value="brystsmerter"]'); await p.waitForTimeout(80);
  r = await p.locator('#output').innerText();
  check('U4 LBBB + brystsmerter = handling nu', r.includes('Kræver handling nu') && r.includes('kan ikke skelnes fra infarkt'));
  r = await ud('Systemevaluering:\nSinusbradykardi med AV-blok grad II, Mobitz I (Wenckebach)\nHjertefrekvens 52 spm');
  check('U5 Wenckebach er ikke Mobitz 2 (ingen akut)', r.includes('Wenckebach') && !r.includes('Kræver handling nu') && !r.includes('AV-blok grad II (Mobitz 2'));
  r = await ud('Systemevaluering:\nSinusrytme med 2:1 AV-blok\nHjertefrekvens 38 spm');
  check('U6 2:1-blok = handling nu', r.includes('Kræver handling nu') && r.includes('pacemakerindikation'));
  r = await ud('Systemevaluering:\nSinusrytme\nInkomplet højresidigt grenblok\nI øvrigt normalt EKG\nQRS varighed 104 ms');
  check('U7 inkomplet højresidigt grenblok er normalvariant (ikke grenblok)', r.includes('Inkomplet højresidigt grenblok') && !r.includes('Højresidigt grenblok —') && r.includes('Ingen afvigende måleværdier'));
  r = await ud('Systemevaluering:\nSinusrytme\nInferiort infarkt, alder ubestemt\nAbnormt EKG');
  check('U8 gammelt infarkt: ofte falsk positivt, sammenlign', r.includes('Mulig gammelt infarkt') && r.includes('falsk positivt') && r.includes('tidligere EKG'));
  r = await ud('Sinusrytme\nVenstre ventrikel hypertrofi\nHjertefrekvens 70 spm');
  check('U9 uden overskrift findes udsagnene alligevel', (await v('maskine')).includes('Venstre ventrikel hypertrofi') && r.includes('Venstre ventrikelhypertrofi'));

  // ---------------- Atleter, tjek af tallene og akser ----------------
  await p.click('#resetBtn'); await p.fill('#hr', '42'); await p.fill('#pr', '260'); await p.check('input[name="klinik"][value="atlet"]'); await p.waitForTimeout(80);
  check('A1 veltrænet: bradykardi og AV-blok I < 400 ms er normalt', (await raekke('Frekvens')).includes('niveau-ok') && (await raekke('PR-interval')).includes('niveau-ok'));
  await p.click('#resetBtn'); await p.fill('#hr', '63'); await p.fill('#rr', '700'); await p.waitForTimeout(80);
  check('A2 frekvens og RR stemmer ikke → tjek tallene', (await p.locator('#output').innerText()).includes('Tjek tallene'));
  await p.click('#resetBtn'); await p.fill('#rr', '1500'); await p.fill('#pp', '750'); await p.waitForTimeout(80);
  check('A3 PP ≠ RR → AV-blok/AV-dissociation?', (await p.locator('#output').innerText()).includes('AV-dissociation'));
  await p.click('#resetBtn'); await p.fill('#qrsaxe', '-120'); await p.waitForTimeout(80);
  check('A4 ekstrem akse', (await raekke('QRS-akse')).includes('Ekstrem akse'));
  await p.click('#resetBtn'); await p.fill('#qrsaxe', '270'); await p.waitForTimeout(80);
  check('A5 270° = −90° (venstre akse)', (await raekke('QRS-akse')).includes('venstre anterior'));
  await p.click('#resetBtn'); await p.fill('#qrsaxe', '100'); await p.fill('#alder', '24'); await p.waitForTimeout(80);
  check('A6 højre akse 100° hos 24-årig er normalt', (await raekke('QRS-akse')).includes('niveau-ok'));
  await p.click('#resetBtn'); await p.fill('#pr', '100'); await p.fill('#qrs', '124'); await p.waitForTimeout(80);
  check('A7 kort PR + bred QRS = præeksitation?', (await raekke('PR-interval')).includes('præeksitation'));
  await p.click('#resetBtn'); await p.fill('#cornell', '2.4'); await p.fill('#qrs', '110'); await p.check('input[name="koen"][value="kvinde"]'); await p.waitForTimeout(80);
  check('A8 Cornell 2,4 mV hos kvinde = hypertrofi; produkt vises', (await raekke('Cornell')).includes('niveau-warn') && (await p.locator('#output').innerText()).includes('Cornell-produkt 264'));
  await p.click('#resetBtn'); await p.fill('#hr', '45'); await p.fill('#alder', '15'); await p.waitForTimeout(80);
  check('A9 under 18 år: advarsel om normalværdier', (await p.locator('#alderWarning').innerText()).includes('voksne'));

  // ---------------- Udfyld uden fund ----------------
  await ud('Pt. ringer om sin medicin.');
  check('U10 ingen EKG-værdier → note', (await p.locator('#udfyldRapport').innerText()).includes('Ingen EKG-værdier'));

  if (!ARTIFACT) {
    // ---------------- App ----------------
    const sw = await (await p.request.get(ROOT + 'hjerte/sw.js')).text();
    check('W1 service worker gemmer ekg.html, ekg.js og udfyld.js', sw.includes('"ekg.html"') && sw.includes('"ekg.js"') && sw.includes('"../udfyld.js"'));
    await p.goto(ROOT + 'hjerte/index.html');
    check('W2 link fra hjerte-appens startside', (await p.locator('a[href="ekg.html"]').count()) >= 1);
    await p.goto(ROOT + 'notat/index.html'); await p.waitForTimeout(200);
    const k = await p.evaluate((t) => { const r = Udfyld.klassificer(t); return { s: r.sikker, top: r.kandidater[0].id }; }, GE);
    check('W3 Notat-indgangen sender EKG-udskriften til EKG (sikkert)', k.s && k.top === 'ekg', JSON.stringify(k));
    await p.evaluate((t) => Udfyld.send(t, 'hjerte/ekg.html'), GE); await p.waitForURL('**/hjerte/ekg.html', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(400);
    check('W4 overdraget tekst udfyldes i EKG', p.url().endsWith('hjerte/ekg.html') && (await v('pr')) === '266' && (await p.locator('#output').innerText()).includes('AV-blok grad I'));
  }

  // ---------------- Mobil ----------------
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto(SIDE); await m.waitForTimeout(150);
  await m.fill('#udfyldTekst', GE); await m.click('#udfyldBtn'); await m.waitForTimeout(200);
  check('MOB ingen vandret scroll', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log(fails ? `FAILS: ${fails}` : 'FAILS: 0');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
