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
  check('E9 journalnotat', /^EKG vurderet \d/.test(n) && n.includes('frekvens 63/min, PR 266 ms, QRS 112 ms, QT 418 ms, QTc 425 ms (Fridericia; apparatet 427 ms Bazett)') && n.includes('akser P/QRS/T 61/33/53°') && n.includes('Maskinens tolkning (ubekræftet): Sinusrytme') && n.includes('Fund: AV-blok grad I (PR 266 ms)') && n.includes('Kurven: [udfyld efter eget eftersyn'), n);
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
  check('A8 Cornell 2,4 mV hos kvinde = hypertrofi; produkt med + 0,6 mV hos kvinder', (await raekke('Cornell')).includes('niveau-warn') && (await p.locator('#output').innerText()).includes('Cornell-produkt 330'));
  await p.click('#resetBtn'); await p.fill('#hr', '45'); await p.fill('#alder', '15'); await p.waitForTimeout(80);
  check('A9 under 18 år: advarsel om normalværdier', (await p.locator('#alderWarning').innerText()).includes('voksne'));

  // ---------------- Audit: røde flag og fejlkilder ----------------
  const mk = async (t, extra = {}) => { await p.click('#resetBtn'); for (const [id, val] of Object.entries(extra)) await p.fill('#' + id, String(val)); await p.fill('#maskine', t); await p.waitForTimeout(80); return p.locator('#output').innerText(); };
  const ids = async () => p.evaluate(() => [...document.querySelectorAll('#output .box')].find((b) => b.querySelector('h3').innerText.startsWith('Maskinens')) ? [...document.querySelectorAll('#output .box')].find((b) => b.querySelector('h3').innerText.startsWith('Maskinens')).innerText : '');
  r = await mk('Sinusrytme. Anteriort infarkt, muligvis akut. Abnormt EKG', { hr: 72, qrs: 90 });
  check('X1 "infarkt, muligvis akut" = handling nu', r.includes('Kræver handling nu') && r.includes('Akut infarkt'));
  r = await mk('Sinus rhythm. Inferior infarct , acute');
  check('X2 "Inferior infarct , acute" = handling nu', r.includes('Kræver handling nu'));
  r = await mk('Sinus rhythm. ST depression, consider subendocardial injury');
  check('X3 ST depression (med mellemrum) = iskæmi', r.includes('ST-depression / mulig iskæmi'));
  r = await mk('Sinusrytme. Mærkeligt fænomen i V3');
  check('X4 ukendt udsagn vises og gør sammenfatningen afvigende', r.includes('Ikke genkendt') && r.includes('mærkeligt fænomen i v3') && r.includes('Afvigende fund'));
  r = await mk('', { hr: 135, qrs: 150 });
  check('X5 frekvens > 100 + QRS ≥ 120 = bred-kompleks-takykardi, handling nu', r.includes('Kræver handling nu') && r.includes('ventrikeltakykardi, til det modsatte er bevist'));
  r = await mk('Sinus rhythm with 2nd degree A-V block');
  check('X6 "2nd degree A-V block" = handling nu', r.includes('Kræver handling nu') && r.includes('AV-blok grad II'));
  r = await mk('Sinus rhythm with 3rd degree A-V block');
  check('X7 "3rd degree A-V block" = komplet AV-blok', r.includes('AV-blok grad III'));
  r = await mk('Atrieflagren med 2:1 AV-overledning', { hr: 150 });
  check('X8 flagren med 2:1-overledning er ikke AV-blok', !r.includes('AV-blok grad II') && r.includes('Atrieflagren'));
  r = await mk('Sinusrytme med AV-blok grad II type 1');
  check('X9 "grad II type 1" = Wenckebach, ikke Mobitz 2', r.includes('Wenckebach') && !r.includes('Kræver handling nu'));
  r = await mk('Sinusrytme. AV-blok 1. grad');
  check('X10 "AV-blok 1. grad" genkendes', r.includes('AV-blok grad I —'));
  r = await mk('Supraventrikulær takykardi', { hr: 140 });
  check('X11 supraventrikulær takykardi er ikke VT', r.includes('Supraventrikulær takykardi') && !r.includes('Ventrikeltakykardi'));
  r = await mk('Sinusrytme med supraventrikulære ekstrasystoler');
  check('X12 supraventrikulære ekstrasystoler er ikke VES eller asystoli', r.includes('Supraventrikulære ekstrasystoler') && !r.includes('(VES)') && !r.includes('Kræver handling nu'));
  r = await mk('Septal infarct , age undetermined. Atrial fibrillation with rapid ventricular response');
  check('X12b almindelige GE-udsagn uden "ikke genkendt"', !r.includes('Ikke genkendt') && r.includes('Mulig gammelt infarkt'));
  r = await mk('Sinusrytme. Ingen atrieflimren.', { pr: 260 });
  check('X13 "ingen atrieflimren" giver ikke atrieflimren; PR vurderes', !r.includes('Atrieflimren —') && (await raekke('PR-interval')).includes('AV-blok grad I'));
  r = await mk('Sinus rhythm has replaced atrial fibrillation');
  check('X14 "has replaced atrial fibrillation" er ikke aktuel atrieflimren', !r.includes('Atrieflimren —'));
  r = await mk('Sinusrytme. Tidligere STEMI 2015.');
  check('X15 "tidligere STEMI" er ikke akut', !r.includes('Kræver handling nu') && r.includes('Mulig gammelt infarkt'));
  r = await mk('Sinusrytme. Kan ikke udelukke septalt infarkt, alder ubestemt');
  check('X16 "kan ikke udelukke" er ikke en nægtelse', r.includes('Mulig gammelt infarkt'));
  r = await mk('Sinus rhythm. ST elevation consider early repolarization, pericarditis, or injury');
  const mx = await ids();
  check('X17 ST-elevation-differentiale: ét fund, ikke "Normal" og ikke ukendt', r.includes('ST-elevation') && !mx.includes('Tidlig repolarisering') && !mx.includes('Mulig perikarditis') && !r.includes('Ikke genkendt'), mx);
  r = await mk('Abnormal ECG');
  check('X18 "Abnormal ECG" er ikke "i øvrigt normalt"', !r.includes('i øvrigt normalt'));
  r = await mk('Sinus rhythm. Minimal voltage criteria for LVH, may be normal variant', { alder: 60 });
  check('X19 minimal voltage = LVH kun "Bemærk"', r.includes('Venstre ventrikelhypertrofi') && !r.includes('Afvigende fund'));
  await p.click('#resetBtn'); await p.fill('#qt', '520'); await p.fill('#rr', '1000'); await p.fill('#hr', '60'); await p.fill('#qrs', '160'); await p.check('input[name="koen"][value="mand"]'); await p.waitForTimeout(80);
  r = await p.locator('#output').innerText();
  check('X20 bred QRS: skøn styrer, men QTc 520 kan ikke afvises', r.includes('QTc-skøn 440 ms ved bred QRS') && r.includes('kan ikke afvises') && !r.includes('Ingen afvigende'));
  await p.click('#resetBtn'); await p.fill('#qt', '480'); await p.waitForTimeout(80);
  check('X21 QT uden RR/frekvens: kan ikke vurderes (ikke "Normal")', (await p.locator('#output').innerText()).includes('QTc kan ikke vurderes'));
  r = await qt(470, 1000, 60, 'kvinde'); await p.check('input[name="klinik"][value="synkope"]'); await p.waitForTimeout(80);
  r = await p.locator('#output').innerText();
  check('X22 forlænget QTc + synkope = handling nu', r.includes('Kræver handling nu') && r.includes('lang-QT-syndrom'));
  await p.click('#resetBtn'); await p.fill('#hr', '32'); await p.fill('#pr', '380'); await p.fill('#alder', '70'); await p.check('input[name="klinik"][value="atlet"]'); await p.waitForTimeout(80);
  r = await p.locator('#output').innerText();
  check('X23 atletkriterier gælder ikke for 70-årig', !(await raekke('PR-interval')).includes('niveau-ok') && r.includes('12–35 år'));
  r = await mk('Sinusrytme med VES. Venstre ventrikelhypertrofi. Lav voltage i ekstremitetsafledninger', { qt: 540, rr: 1000, hr: 60, alder: 70 });
  n = await p.locator('#journalTekst').innerText();
  check('X24 journalens plan starter med det vigtigste (QTc ≥ 500)', /Plan: QTc ≥ 500 ms/.test(n), n.split('\n').pop());
  r = await mk('Sinusrytme. Venstresidigt grenblok', { qrs: 150, sokolow: 4.2, alder: 70 });
  check('X25 voltage vurderes ikke ved bred QRS', (await raekke('Sokolow')).includes('upålidelige'));
  r = await ud('Atrial rate 250 BPM\nVent. rate 125 BPM\nQRS duration 88 ms');
  check('X26 ventrikelfrekvens, ikke atriefrekvens', (await v('hr')) === '125');
  r = await ud('BT 145/90, puls 88. Har røget i 30 år. 67-årig mand. EKG: frekvens 72, QTc 470 ms');
  check('X27 frekvens før puls; alder fra "67-årig" (ikke "30 år")', (await v('hr')) === '72' && (await v('alder')) === '67' && (await v('qtc')) === '470');
  r = await ud('QT/QTc 418 ms / 427 ms\nRR 952 ms');
  check('X28 "QT/QTc 418 ms / 427 ms"', (await v('qt')) === '418' && (await v('qtc')) === '427');
  r = await ud('QT/QTcB/QTcF 410/445/430 ms');
  check('X29 QT/QTcB/QTcF', (await v('qt')) === '410' && (await v('qtc')) === '445' && (await v('qtcFormel')) === 'B');
  r = await ud('QT/QTc-interval 380/410 ms');
  check('X30 QT/QTc-interval', (await v('qt')) === '380' && (await v('qtc')) === '410');
  r = await ud('Akser P/QRS/T: 61, 33, 53\nP-R int. 182 ms\nSV1+RV5 3.8 mV');
  check('X31 kommaseparerede akser, "P-R int.", SV1+RV5', (await v('paxe')) === '61' && (await v('qrsaxe')) === '33' && (await v('taxe')) === '53' && (await v('pr')) === '182' && (await v('sokolow')) === '3.8');
  r = await ud('P axis: 52\nQRS axis: -10\nT axis: 33');
  check('X32 Mortara: akser hver for sig', (await v('paxe')) === '52' && (await v('qrsaxe')) === '-10' && (await v('taxe')) === '33');
  r = await ud('Systemevaluering:\nSinus rhythm\nWhen compared with ECG of 01-JAN-2025\nSinus rhythm has replaced Atrial fibrillation\nVent. rate 70 BPM');
  check('X33 sammenligning med tidligere EKG tages ikke med i maskinens tolkning', (await v('maskine')) === 'Sinus rhythm' && !r.includes('Atrieflimren —'));

  // ---------------- Sammenligning med tidligere EKG ----------------
  const FOER = 'Optaget 12.03.2024\nSystemevaluering:\nSinusrytme\nNormalt EKG\nHjertefrekvens 70 spm\nPR interval 182 ms\nQRS varighed 98 ms\nQT / QTc(B) 380 / 410 ms\nP-R-T akser 55 / 40 / 45 °\nP varighed 110 ms\nRR / PP interval 857 / 857 ms\nSokolow-Lyon 2.30 mV';
  const tidl = async (t) => { await p.evaluate(() => (document.getElementById('tidligereBoks').open = true)); await p.fill('#tidligereTekst', t); await p.waitForTimeout(120); return p.locator('#output').innerText(); };
  const smlRaekke = (navn) => p.evaluate((n) => { const r = [...document.querySelectorAll('.ekg-sml tbody tr')].find((x) => x.cells[0].innerText.startsWith(n)); return r ? [...r.cells].map((c) => c.innerText).join(' | ') + ' | ' + r.className : ''; }, navn);
  await ud(GE);
  r = await tidl(FOER);
  check('H1 sammenligning vises med dato fra udskriften', r.includes('Sammenligning med EKG fra 12.3.2024'));
  check('H2 nyt AV-blok grad I (PR 182 → 266)', (await smlRaekke('PR')).includes('Nyt AV-blok grad I') && r.includes('Nyt AV-blok grad I (PR 182 → 266 ms)'), await smlRaekke('PR'));
  check('H3 QTc sammenlignes med Fridericia (400 → 425, +25 ms)', (await smlRaekke('QTc (Fridericia)')).includes('400 ms | 425 ms | +25 ms'), await smlRaekke('QTc'));
  check('H4 nye udsagn (VES) og nyt interatrielt blok', r.includes('Nyt i maskinens tolkning') && r.includes('Nyt: ventrikulære ekstrasystoler') && r.includes('Nyt interatrielt blok'));
  check('H5 Sokolow med decimaler', (await smlRaekke('Sokolow')).includes('+0,23 mV'), await smlRaekke('Sokolow'));
  n = await p.locator('#journalTekst').innerText();
  check('H6 journalnotat nævner sammenligningen', n.includes('Sammenlignet med EKG fra 12.3.2024: nyt AV-blok grad I (PR 182 → 266 ms)'), n);
  // Ny patient: indsættelse øverst rydder det tidligere EKG
  await ud(GE);
  check('H7 ny indsættelse øverst rydder det tidligere EKG', (await p.inputValue('#tidligereTekst')) === '' && !(await p.locator('#output').innerText()).includes('Sammenligning med'));
  // Kun tidligere EKG: bed om det aktuelle
  await p.click('#resetBtn'); r = await tidl(FOER);
  check('H8 kun tidligere EKG → bed om det aktuelle først', r.includes('Indsæt først det aktuelle EKG'));
  // Forskellige patienter (CPR) → ingen sammenligning
  await ud('Patient 010203-1234\n' + GE); r = await tidl('Patient 040506-5678\n' + FOER);
  check('H9 forskellige CPR-numre → advarsel, ingen sammenligning, CPR vises ikke', r.includes('to forskellige patienter') && (await p.locator('.ekg-sml').count()) === 0 && !r.includes('010203') && !r.includes('040506'));
  // QTc-stigning > 60 ms, ny bred QRS og ny atrieflimren
  await ud('Systemevaluering:\nAtrieflimren\nVenstresidigt grenblok\nHjertefrekvens 88 spm\nQRS varighed 150 ms\nQT / QTc(B) 470 / 569 ms\nRR / PP interval 682 / 682 ms');
  r = await tidl('Systemevaluering:\nSinusrytme\nNormalt EKG\nHjertefrekvens 70 spm\nQRS varighed 96 ms\nQT / QTc(B) 390 / 421 ms\nRR / PP interval 857 / 857 ms');
  check('H10 QTc-stigning > 60 ms', (await smlRaekke('QTc')).includes('Stigning > 60 ms'), await smlRaekke('QTc'));
  check('H11 ny bred QRS, nyt venstresidigt grenblok og ny atrieflimren', r.includes('ny bred QRS') && r.includes('nyt venstresidigt grenblok') && r.includes('ny atrieflimren siden sidst'), r.slice(0, 400));
  check('H12 QRS ændret ≥ 20 ms → JT nævnes', (await smlRaekke('QTc')).includes('JT'));
  await p.check('input[name="klinik"][value="brystsmerter"]'); await p.waitForTimeout(80);
  check('H13 nyt grenblok + brystsmerter = handling nu', (await p.locator('#output').innerText()).includes('Kræver handling nu') && (await smlRaekke('QRS')).includes('niveau-danger'));
  // QRS > 25 % uden at krydse 120 ms; atrieflimren forsvundet
  await ud('Systemevaluering:\nSinusrytme\nHjertefrekvens 70 spm\nQRS varighed 115 ms');
  r = await tidl('Systemevaluering:\nAtrieflimren\nHjertefrekvens 90 spm\nQRS varighed 88 ms');
  check('H14 QRS forlænget > 25 % (flecainid)', (await smlRaekke('QRS')).includes('25 %') && r.includes('QRS forlænget 31 %'), await smlRaekke('QRS'));
  check('H15 atrieflimren ikke længere nævnt', r.includes('Ikke længere nævnt: Atrieflimren'));
  // Uændret
  await ud(GE); r = await tidl(GE);
  check('H16 samme EKG → ingen ændringer over grænserne (forsigtig formulering)', r.includes('Ingen ændringer over værktøjets grænser') && (await p.locator('#journalTekst').innerText()).includes('ingen ændringer over værktøjets grænser'));
  // Forskellige QTc-formler uden QT/RR
  await ud('QTc(B) 450 ms\nQRS varighed 90 ms'); r = await tidl('QTc(F) 420 ms\nQRS varighed 90 ms');
  check('H17 forskellig QTc-formel uden QT/RR → sammenlignes ikke', r.includes('QTc kan ikke sammenlignes sikkert') && (await smlRaekke('QTc')) === '');
  // Datoer: tidligere nyere end aktuelle
  await ud('Optaget 01.02.2023\n' + GE); r = await tidl(FOER);
  check('H18 "tidligere" EKG nyere end aktuelle → advarsel', r.includes('byttet om'));
  // Datofelt overstyrer
  await ud(GE); await tidl(FOER); await p.fill('#tidligereDato', '2025-06-30'); await p.waitForTimeout(100);
  check('H19 datofelt bruges', (await p.locator('#output').innerText()).includes('Sammenligning med EKG fra 30.6.2025'));
  await p.click('#resetBtn');

  // ---------------- Audit af sammenligningen ----------------
  const NORMAL = 'Systemevaluering:\nSinusrytme\nNormalt EKG\nHjertefrekvens 75 spm\nPR interval 170 ms\nQRS varighed 92 ms\nQT / QTc(B) 380 / 411 ms\nRR / PP interval 800 / 800 ms\nP-R-T akser 50 / 40 / 45 °';
  const sml2 = async (nuT, foerT) => { await ud(nuT); return tidl(foerT); };
  r = await sml2('Systemevaluering:\nAkut anteriort infarkt\n\nHjertefrekvens 70 spm\nQRS varighed 92 ms', NORMAL);
  check('Y1 "Akut anteriort infarkt" = handling nu og nyt i sammenligningen', r.includes('Kræver handling nu') && r.includes('nyt akut infarkt'));
  r = await sml2('Systemevaluering:\nSinusrytme\nMærkværdigt fænomen i V3\n\nHjertefrekvens 75 spm\nQRS varighed 92 ms', NORMAL);
  check('Y2 nyt ukendt udsagn → vises, aldrig "ingen ændringer"', r.includes('Nye udsagn, værktøjet ikke kender') && !r.includes('Ingen ændringer over') && (await p.locator('#journalTekst').innerText()).includes('nyt ukendt udsagn'));
  r = await sml2('Patient 0101701234\n' + NORMAL, 'Patient 0202805678\n' + NORMAL);
  check('Y3 CPR uden bindestreg, forskellige → ingen sammenligning', r.includes('to forskellige patienter') && !r.includes('0101701234'));
  r = await sml2('CPR 610170-1234\n' + NORMAL, 'CPR 010170-1234\n' + NORMAL);
  check('Y4 erstatningspersonnummer genkendes', r.includes('to forskellige patienter'));
  r = await sml2('CPR 010170-1234\n' + NORMAL, 'CPR 010170 1234\n' + NORMAL);
  check('Y5 samme CPR (med mellemrum) → bekræftet', r.includes('Samme CPR-nummer i begge udskrifter ✓'));
  r = await sml2(NORMAL, NORMAL);
  check('Y6 uden CPR → "kunne ikke kontrolleres" (også i journalen)', r.includes('kunne ikke kontrolleres') && (await p.locator('#journalTekst').innerText()).includes('Samme patient ikke kontrolleret'));
  r = await sml2(NORMAL.replace('PR interval 170', 'PR interval 320'), NORMAL.replace('PR interval 170', 'PR interval 180'));
  check('Y7 PR 180 → 320 = afvigende (≥ 300 ms)', (await smlRaekke('PR')).includes('niveau-warn'), await smlRaekke('PR'));
  await ud(NORMAL.replace('QRS varighed 92', 'QRS varighed 122').replace('P-R-T akser 50 / 40 / 45', 'P-R-T akser 50 / 95 / 45').replace('PR interval 170', 'PR interval 204'));
  await p.check('input[name="klinik"][value="brystsmerter"]');
  r = await tidl(NORMAL.replace('QRS varighed 92', 'QRS varighed 118').replace('P-R-T akser 50 / 40 / 45', 'P-R-T akser 50 / 85 / 45').replace('PR interval 170', 'PR interval 198'));
  check('Y8 små ændringer over grænser giver ikke alarm (QRS 118→122, akse 85→95, PR 198→204)', !(await smlRaekke('QRS')).includes('niveau-danger') && !(await smlRaekke('QRS-akse')).includes('niveau-warn') && !(await smlRaekke('PR')).includes('Nyt AV-blok'), [await smlRaekke('QRS'), await smlRaekke('QRS-akse'), await smlRaekke('PR')].join(' / '));
  r = await sml2('Systemevaluering:\nPacemakerrytme\nHjertefrekvens 70 spm\nQRS varighed 160 ms\nQT / QTc(B) 480 / 519 ms\nRR / PP interval 857 / 857 ms\nP-R-T akser 0 / -80 / 90 °', NORMAL);
  check('Y9 ny pacing: PR/QRS/akse/QTc sammenlignes ikke', r.includes('Pacemakerrytme i mindst det ene EKG') && (await smlRaekke('QTc')) === '' && (await smlRaekke('QRS-akse')) === '');
  r = await sml2(NORMAL.replace('QRS varighed 92', 'QRS varighed 160').replace('QT / QTc(B) 380 / 411', 'QT / QTc(B) 448 / 485'), NORMAL);
  check('Y10 ny bred QRS: QTc-stigning vurderes som JTc (ikke torsades)', (await smlRaekke('QTc')).includes('JTc') && !(await smlRaekke('QTc')).includes('Stigning > 60'), await smlRaekke('QTc'));
  r = await sml2(NORMAL, 'Født 12-05-1985 Optaget 01-02-2024\n' + NORMAL);
  check('Y11 fødselsdato springes over (EKG fra 1.2.2024)', r.includes('Sammenligning med EKG fra 1.2.2024'));
  r = await sml2(NORMAL, 'Dato 2024-03-12\nFilter 1.5-35 Hz\n' + NORMAL);
  check('Y12 ISO-dato læses, filterværdi ignoreres', r.includes('Sammenligning med EKG fra 12.3.2024'));
  await ud('Optaget 12.03.2024\n' + NORMAL); await tidl(NORMAL); await p.fill('#tidligereDato', '2024-03-12'); await p.waitForTimeout(100);
  check('Y13 datofelt samme dag som udskriften → ingen "byttet om"', !(await p.locator('#output').innerText()).includes('byttet om'));
  r = await sml2('Systemevaluering:\nSinusrytme\nVenstre anterior fascikelblok\nVenstre atrieforstørrelse\nHjertefrekvens 75 spm', NORMAL);
  check('Y14 nye fund med samme forstavelse forsvinder ikke', r.includes('nyt: venstre anterior fascikelblok') && r.includes('nyt: venstre atriepåvirkning'));
  r = await sml2('Systemevaluering:\nSinusrytme med komplet AV-blok\nHjertefrekvens 38 spm', NORMAL);
  check('Y15 nyt komplet AV-blok = handling nu i sammenligningen', (await p.evaluate(() => [...document.querySelectorAll('#output .box')].find((b) => b.querySelector('h3').innerText.startsWith('Sammenligning')).className)).includes('box-red') && r.includes('nyt AV-blok grad III'));
  await ud('Systemevaluering:\nSinusrytme\nNegative T-takker anteriort\nHjertefrekvens 75 spm'); await p.check('input[name="klinik"][value="brystsmerter"]'); r = await tidl(NORMAL);
  check('Y16 nye ST-T-forandringer + brystsmerter = handling nu', r.includes('Kræver handling nu') && r.includes('akut koronarsyndrom'));
  await ud('Test Testesen 010170-1234 Mand 54 år\n' + NORMAL);
  const rap = await p.locator('#udfyldRapport').innerText();
  check('Y17 CPR vises ikke i rapport, maskinens tolkning eller journal', !rap.includes('010170') && rap.includes('[CPR]') && !(await p.inputValue('#maskine')).includes('010170') && !(await p.inputValue('#maskine')).includes('Testesen') && !(await p.locator('#journalTekst').innerText()).includes('010170'), rap);
  await p.click('#resetBtn'); await tidl(NORMAL); await p.fill('#udfyldTekst', NORMAL); await p.click('#udfyldBtn'); await p.waitForTimeout(150);
  check('Y18 tidligere EKG ryddet ved indsættelse øverst → besked', (await p.locator('#tidligereNote').innerText()).includes('blev ryddet'));
  await tidl(NORMAL); await p.click('#udfyldRyd'); await p.waitForTimeout(100);
  check('Y19 "Ryd" rydder også det tidligere EKG', (await p.inputValue('#tidligereTekst')) === '');
  r = await sml2(NORMAL.replace('Hjertefrekvens 75', 'Hjertefrekvens 42').replace('RR / PP interval 800 / 800', 'RR / PP interval 1430 / 1430'), NORMAL);
  check('Y20 ny bradykardi', r.includes('ny bradykardi'));
  r = await sml2(NORMAL.replace('QT / QTc(B) 380 / 411', 'QT / QTc(B) 390 / 421'), NORMAL.replace('QT / QTc(B) 380 / 411', 'QT / QTc(B) 458 / 495'));
  check('Y21 QTc-fald efter forlænget QTc kommer i journalen', (await p.locator('#journalTekst').innerText()).includes('QTc faldet'));
  r = await sml2('Systemevaluering:\nSinusrytme med AV-blok grad III\nHjertefrekvens 38 spm', NORMAL);
  check('Y22 store/små bogstaver: ikke "aV-blok"', !r.includes('aV-blok') && !(await p.locator('#journalTekst').innerText()).includes('aV-blok'));
  await p.click('#resetBtn');

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
