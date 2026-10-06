/*
 * EKG — tolkning af måleværdier og maskinens tekst (offline).
 * Måleværdierne vurderes mod AHA/ACCF/HRS 2009-referencerne for voksne; QTc beregnes med
 * Bazett, Fridericia, Framingham og Hodges (og Bogossian ved bred QRS); maskinens udsagn
 * slås op i en ordliste med forklaring og handling. Selve kurven tolkes ikke.
 */
(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");
  const printMeta = document.getElementById("printMeta");
  const alderWarning = document.getElementById("alderWarning");

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",").replace("-", "−");
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const num = (id) => {
    const v = document.getElementById(id).value;
    return v === "" ? NaN : parseFloat(String(v).replace(",", "."));
  };
  // Links til de andre værktøjer: slås op i #linkKort, så claude.ai-versionen bruger artifact-adresser.
  const lenke = (sti, tekst) => {
    const a = document.querySelector(`#linkKort a[data-sti="${sti}"]`);
    const href = a ? a.getAttribute("href") : sti;
    const ny = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${esc(href)}"${ny}>${tekst}</a>`;
  };

  // Niveauer: ok < info < warn < danger.
  const RANG = { ok: 0, info: 1, warn: 2, danger: 3 };
  const TAG = {
    ok: '<span class="tag tag-ok">Normal</span>',
    info: '<span class="tag tag-alt">Bemærk</span>',
    warn: '<span class="tag tag-warn">Afvigende</span>',
    danger: '<span class="tag tag-danger">Handling nu</span>',
  };

  // ---------------------------------------------------------------- Akser og QTc
  // Akse i intervallet −180° til +180° (fx 270° = −90°).
  const akse = (a) => {
    let x = ((a % 360) + 360) % 360;
    return x > 180 ? x - 360 : x;
  };
  const vinkel = (a, b) => {
    const d = Math.abs(akse(a) - akse(b));
    return d > 180 ? 360 - d : d;
  };
  function qtcAlle(qt, rr, hr) {
    const s = rr / 1000;
    return {
      B: qt / Math.sqrt(s),
      F: qt / Math.cbrt(s),
      Fr: qt + 154 * (1 - s),
      H: qt + 1.75 * ((isNaN(hr) ? 60000 / rr : hr) - 60),
    };
  }
  const FORMEL = { B: "Bazett", F: "Fridericia", Fr: "Framingham", H: "Hodges" };

  // ---------------------------------------------------------------- Maskinens udsagn
  // Rækkefølgen er visningsrækkefølgen. "niveau" kan afhænge af klinikken (k).
  const PLAN_LVH = "Venstre ventrikelhypertrofi på EKG: mål blodtryk (hjemme-/døgnblodtryk), overvej ekkokardiografi (også aortastenose og kardiomyopati) og intensivér blodtryksbehandlingen ved hypertension (ESH 2023).";
  const UDSAGN = [
    { id: "akutmi", m: /akut\w* (?:mi|infarkt|myokardieinfarkt|skade|st-?elevations?-?infarkt)|akut\w*(?: [a-zæøå-]+){1,2} (?:mi|infarkt|myokardieinfarkt)|infarkt\s*,?\s*(?:muligvis |mulig |sandsynligvis |formentlig )?akut|acute (?:mi|infarct|myocardial)|infarct\s*,?\s*(?:possibly |probably )?acute|injury pattern|(?:anterior|inferior|lateral|septal|anterolateral|anteroseptal|inferolateral)\w* injury|(?<![a-z])n?stemi(?![a-z])|\*+\s*(?:akut|acute)/, navn: "Akut infarkt / akut skade",
      niveau: () => "danger", tekst: "Maskinen mistænker akut infarkt eller akut skade. Computeren både over- og underdiagnosticerer, men udsagnet skal vurderes med det samme.",
      plan: ["Vurder patienten nu: ved brystsmerter eller påvirket tilstand ring 112 / akut kardiologisk vurdering; sammenlign med tidligere EKG."] },
    { id: "stelev", m: /st[- ]?elevation[^.;]*/, navn: "ST-elevation", hvisIkke: ["akutmi"],
      niveau: (k) => (k.brystsmerter ? "danger" : "warn"), tekst: "ST-elevation kan være akut infarkt/skade, perikarditis eller tidlig repolarisering (normalvariant hos unge mænd). Nævner maskinen flere muligheder, er den usikker — kurven og klinikken afgør.",
      plan: ["ST-elevation: vurder kurven og patienten samme dag; med brystsmerter → 112/akut kardiologisk vurdering."] },
    { id: "bredtaky", m: /wide (?:qrs|complex) (?:tachycardia|rhythm)|bred-?kompleks\w* (?:takykardi|rytme)|bredkomplekset? (?:takykardi|rytme)|idioventri\w*|ventrikelflimren|ventricular fibrillation|(?<![a-zæøå])asystol\w*/, navn: "Bred-kompleks-rytme/-takykardi", niveau: () => "danger",
      tekst: "Bred-kompleks-takykardi behandles som ventrikeltakykardi, til det modsatte er bevist.", plan: ["Bred-kompleks-takykardi: vurder patienten nu — akut (112) ved påvirkning; ellers samme-dags kardiologisk vurdering."] },
    { id: "vt", m: /(?<!supra)ventrikel ?takykardi|(?<!supra)ventrikulær takykardi|(?<!supra)ventricular tachycardia|(?<![a-zæøå])(?:ns)?vt(?![a-zæøå])/, navn: "Ventrikeltakykardi", niveau: () => "danger",
      tekst: "Bred-kompleks-takykardi skal behandles som ventrikeltakykardi, til det modsatte er bevist.", plan: ["Ventrikeltakykardi: akut (112), medmindre det er en kort, afsluttet salve hos en upåvirket patient — så samme-dags kardiologisk vurdering."] },
    { id: "avblok3", m: /(?:av-?blok|a-?v[- ]block|hjerteblok),? (?:af )?(?:grad |gr\.? )?(?:iii|3)(?![0-9])|komplet (?:av-?|hjerte)blok|(?:tredje|3\.?) ?grads? (?:av|a-v)|complete (?:heart|av|a-v) block|(?:third|3rd) degree/, navn: "AV-blok grad III (komplet)", niveau: () => "danger",
      tekst: "Ingen ledning fra atrier til ventrikler; erstatningsrytmen kan svigte.", plan: ["AV-blok grad III: akut indlæggelse (pacemaker)."] },
    { id: "wenckebach", m: /wenckebach|mobitz (?:type )?(?:i|1)(?![iv0-9])|(?:grad|gr\.?|degree)\.? ?(?:ii|2)\.?,? type ?(?:i|1)(?![iv0-9])|(?:ii|2)\.? ?grads? (?:av|a-v)-?blo\w*,? type ?(?:i|1)(?![iv0-9])/, navn: "AV-blok grad II type 1 (Wenckebach)",
      niveau: (k) => (k.synkope ? "danger" : k.atlet ? "info" : "warn"), tekst: "PR forlænges, til et slag falder ud. Kan være normalt hos unge, veltrænede og om natten (vagus).",
      plan: ["AV-blok grad II type 1: hos ældre, ved symptomer eller i vågen tilstand → kardiolog (Holter); ved synkope akut."] },
    { id: "avblok2", m: /mobitz (?:type )?(?:ii|2)(?![0-9])|(?:av-?blok|a-?v[- ]block),? (?:af )?(?:grad |gr\.? )?(?:ii|2)(?![i0-9])|(?:anden|2\.?) ?grads? (?:av|a-v)|(?:second|2nd) degree|high[- ]grade (?:av|a-v)|højgrad\w* av/, navn: "AV-blok grad II", hvisIkke: ["wenckebach"],
      niveau: () => "danger", tekst: "Mobitz type 2, 2:1- og højgradsblok kan pludselig gå over i komplet blok.", plan: ["AV-blok grad II (Mobitz 2, 2:1 eller højgradsblok): akut/samme-dags kardiologisk vurdering (pacemakerindikation)."] },
    { id: "avblok21", m: /2 ?: ?1[- ]?(?:a-?v[- ]?|av-)?(?:block|blok|ledning|overledning|conduction)/, navn: "AV-blok grad II (2:1)", hvisIkke: ["wenckebach", "avblok2", "aflagren"],
      niveau: () => "danger", tekst: "Hvert andet P-tak overledes ikke — kan ikke skelnes fra Mobitz 2 og kan gå over i komplet blok.", plan: ["AV-blok grad II (Mobitz 2, 2:1 eller højgradsblok): akut/samme-dags kardiologisk vurdering (pacemakerindikation)."] },
    { id: "avdiss", m: /av-?dissociation|a-?v dissociation/, navn: "AV-dissociation", niveau: () => "warn",
      tekst: "Atrier og ventrikler slår uafhængigt — ved komplet AV-blok, accelereret junktional eller ventrikulær rytme.", plan: ["AV-dissociation: se kurven; kardiologisk vurdering samme dag ved bradykardi eller symptomer."] },
    { id: "pause", m: /sinus ?(?:arrest|pause)|sinusstop|sinoatrial\w* blo\w*|sa-?blok/, navn: "Sinusarrest/pause", niveau: (k) => (k.synkope ? "danger" : "warn"),
      tekst: "Pauser i sinusknudens aktivitet (syg sinusknude, medicin, vagus).", plan: ["Sinuspause: medicingennemgang og Holter; ved synkope eller svimmelhed → kardiolog (akut ved synkope)."] },
    { id: "af", m: /atrieflimren|atrieflimmer|atrial fibrillation|a-?flimren/, navn: "Atrieflimren", niveau: (k, v) => (v.hr > 150 ? "danger" : "warn"),
      tekst: "Bekræft på kurven: uregelmæssigt uregelmæssig rytme uden P-takker. Computeren overdiagnosticerer atrieflimren (ca. 9 % forkerte i svensk almen praksis, Lindow 2019) — fx ved hyppige ekstrasystoler, sinusarytmi eller støj.",
      plan: ["Bekræftet atrieflimren: CHA₂DS₂-VA og antikoagulation (se LINK_AF), frekvenskontrol (hvilepuls < 110), TSH og ekkokardiografi; akut ved brystsmerter, hjertesvigt eller hæmodynamisk påvirkning."] },
    { id: "aflagren", m: /atrieflagren|atrial flutter/, navn: "Atrieflagren", niveau: (k, v) => (v.hr > 150 ? "danger" : "warn"),
      tekst: "Savtakket grundlinje; en frekvens omkring 150/min tyder på 2:1-overledning. Computeren tager især fejl ved flagren (ca. 1/3 forkerte, Lindow 2019).", plan: ["Atrieflagren: samme antikoagulationsregler som atrieflimren (se LINK_AF); henvis til kardiolog (ablation er ofte førstevalg)."] },
    { id: "svt", m: /supraventrikulær takykardi|supraventricular tachycardia|(?<![a-zæøå])svt(?![a-zæøå])|avnrt|avrt|atrietakykardi|atrial tachycardia/, navn: "Supraventrikulær takykardi", niveau: (k, v) => (v.hr > 150 || k.synkope ? "danger" : "warn"),
      tekst: "Regelmæssig smalkomplekset takykardi (AVNRT, AVRT, atrietakykardi eller flagren).", plan: ["Supraventrikulær takykardi: vagusmanøvre; vedvarende anfald eller påvirket patient → akut; efter anfald henvises til kardiolog."] },
    { id: "vrespons", m: /(?:rapid|slow|hurtig|langsom|controlled|kontrolleret) ventri\w* ?respons\w*/, navn: "Ventrikelrespons", niveau: () => "info", tekst: "Se frekvensvurderingen." },
    { id: "ubestemt", m: /undetermined rhythm|ubestemt rytme|rytmen kan ikke bestemmes|uklar rytme/, navn: "Rytmen kan ikke bestemmes", niveau: () => "warn",
      tekst: "Maskinen kan ikke bestemme rytmen (støj, atrieflimren/-flagren, ektopisk rytme).", plan: ["Ubestemt rytme: se kurven selv; tag nyt EKG ved støj."] },
    { id: "pakse", m: /unusual p axis|unormal p-?akse|abnorm\w* p-?akse/, navn: "Unormal P-akse", niveau: () => "info", tekst: "Ektopisk atrierytme eller forbyttede arm-elektroder." },
    { id: "lbbb", m: /(?<!inkomplet )(?:venstresidigt? grenblok|venstre grenblok)(?!,? inkomplet)|(?<![a-z])(?<!incomplete |i)lbbb|(?<!incomplete )left bundle branch block/, navn: "Venstresidigt grenblok",
      niveau: (k) => (k.brystsmerter || k.synkope ? "danger" : "warn"), tekst: "Næsten altid tegn på hjertesygdom (iskæmisk hjertesygdom, hypertension, kardiomyopati, aortastenose). ST-segmenterne kan ikke vurderes på vanlig vis.",
      plan: ["Venstresidigt grenblok: sammenlign med tidligere EKG; nyt grenblok → ekkokardiografi og kardiologisk vurdering; med brystsmerter → akut (kan ikke skelnes fra infarkt)."] },
    { id: "rbbb", m: /(?<!inkomplet )(?:højresidigt? grenblok|højre grenblok)(?!,? inkomplet)|(?<![a-z])(?<!incomplete )rbbb|(?<!incomplete )right bundle branch block/, navn: "Højresidigt grenblok",
      niveau: (k) => (k.synkope ? "warn" : "info"), tekst: "Ofte uden betydning hos raske. Nyopstået sammen med åndenød eller brystsmerter: tænk lungeemboli.",
      plan: ["Højresidigt grenblok: ingen udredning hos symptomfri; ny åndenød/brystsmerter → udeluk lungeemboli."] },
    { id: "inkHoejre", m: /inkomplet højre\w* grenblok|højre\w* grenblok,? inkomplet|incomplete right bundle|incomplete rbbb|(?<![a-z])irbbb/, navn: "Inkomplet højresidigt grenblok", niveau: () => "ok",
      tekst: "Hyppig normalvariant, især hos unge og veltrænede." },
    { id: "inkVenstre", m: /inkomplet venstre\w* grenblok|venstre\w* grenblok,? inkomplet|incomplete left bundle|incomplete lbbb|(?<![a-z])ilbbb/, navn: "Inkomplet venstresidigt grenblok", niveau: () => "info",
      tekst: "Ses ved venstre ventrikelhypertrofi og hjertesygdom — vurder blodtryk og evt. ekkokardiografi." },
    { id: "lafb", m: /venstre anterior\w* (?:hemiblok|fascikelblok|fascikulært blok)|left anterior (?:fascicular|hemi)|(?<![a-z])la[fh]b(?![a-z])/, navn: "Venstre anterior fascikelblok (hemiblok)",
      niveau: () => "info", tekst: "Venstre akse (−45° til −90°). Isoleret oftest uden behandlingsbehov." },
    { id: "lpfb", m: /venstre posterior\w* (?:hemiblok|fascikelblok|fascikulært blok)|left posterior (?:fascicular|hemi)|(?<![a-z])lp[fh]b(?![a-z])/, navn: "Venstre posterior fascikelblok",
      niveau: () => "warn", tekst: "Sjældent; højre akse skal først forklares af andet (højre ventrikelbelastning, lateralt infarkt, slank person).", plan: ["Venstre posterior fascikelblok: henvis til kardiologisk vurdering (ofte udbredt ledningssygdom)."] },
    { id: "bifasc", m: /bifascikul|bifascicular/, navn: "Bifascikulært blok", niveau: (k) => (k.synkope ? "danger" : "warn"),
      tekst: "Højresidigt grenblok + fascikelblok: risiko for progression til højgradigt AV-blok.", plan: ["Bifascikulært blok: ved synkope akut kardiologisk vurdering; uden symptomer kontrol og information om at reagere på svimmelhed/besvimelse."] },
    { id: "ivcd", m: /intraventrikulær\w* (?:ledningsforstyrrelse|ledningsforsinkelse|ledningsdefekt)|intraventricular conduction|(?<![a-z])ivcd(?![a-z])/, navn: "Intraventrikulær ledningsforstyrrelse",
      niveau: () => "info", tekst: "Bred QRS uden typisk grenblok-mønster; ses ved hjertesygdom, hyperkaliæmi og lægemidler (klasse I-antiarytmika, tricykliske antidepressiva)." },
    { id: "aberrant", m: /aberrant|aberration|aberrans/, navn: "Aberrant ledning", niveau: () => "info", tekst: "Enkelte slag ledes med grenblok-mønster — skal skelnes fra VES/VT på kurven." },
    { id: "avblok1", m: /(?:av-?blok|a-?v[- ]block),? (?:af )?(?:grad |gr\.? )?(?:i|1)\.?(?: ?grad)?(?![iv0-9])|(?:første|1\.?) ?grads? (?:av|a-v)|(?:first|1st) degree/, navn: "AV-blok grad I",
      niveau: (k) => (k.atlet ? "ok" : "info"), tekst: "Forlænget PR (> 200 ms). Se vurderingen af PR ovenfor." },
    { id: "ves", m: /(?:præmature?|for tidlige?) ventrikulære? (?:komplekser|kontraktioner|slag|ekstrasystoler)|(?<!supra)ventrikulære? ekstrasystol\w*|(?<![a-zæøå])ves(?![a-zæøå])|premature ventricular|(?<![a-z])pvcs?(?![a-z])/, navn: "Ventrikulære ekstrasystoler (VES)",
      niveau: (k) => (k.synkope ? "warn" : "info"), tekst: "Hyppige og oftest godartede hos hjerteraske. Et enkelt hvile-EKG siger ikke noget om byrden.",
      plan: ["VES: ved symptomer, mange VES/salver/bigemini, hjertesygdom, synkope eller pludselig død i familien → K, Mg, TSH, Holter og ekkokardiografi; byrde > 10 % → følg venstre ventrikels funktion (ESC 2022)."] },
    { id: "sves", m: /(?:præmature?|for tidlige?) (?:atriale|supraventrikulære?) (?:komplekser|kontraktioner|slag|ekstrasystoler)|supraventrikulære? ekstrasystol\w*|atriale? ekstrasystol\w*|(?<![a-zæøå])sves(?![a-zæøå])|premature (?:atrial|supraventricular)|(?<![a-z])pacs?(?![a-z])/, navn: "Supraventrikulære ekstrasystoler",
      niveau: () => "ok", tekst: "Almindelige og oftest uskyldige; mange kan varsle atrieflimren — vurder ved hjertebanken." },
    { id: "bigemini", m: /bigemin|trigemin/, navn: "Bigemini/trigemini", niveau: () => "warn",
      tekst: "Ekstrasystole efter hvert (andet) slag — pulsen kan måles falsk lav.", plan: ["Bigemini: elektrolytter (K, Mg), TSH, Holter og ekkokardiografi."] },
    { id: "lvhmin", m: /minimal voltage|may be normal variant|kan være normal ?variant|voltagekriteri\w* (?:alene|isoleret)|isoleret (?:høj )?voltage/, navn: "Kun voltagekriterium — kan være normalvariant", niveau: () => "ok",
      tekst: "Isoleret høj voltage er hyppigt normalt (unge, slanke, veltrænede)." },
    { id: "lvh", m: /venstre ?ventrik\w* ?hypertrofi|(?<![a-z])lvh(?![a-z])|left ventricular hypertrophy/, navn: "Venstre ventrikelhypertrofi",
      niveau: (k, v) => ((!isNaN(v.alder) && v.alder < 40) || k.atlet || v.udsagn.has("lvhmin") ? "info" : "warn"), tekst: "Ved hypertension er hypertrofi på EKG organskade. Voltagekriterier er specifikke, men har lav sensitivitet; hos unge, slanke og veltrænede er isoleret høj voltage ofte normalt.",
      plan: [PLAN_LVH] },
    { id: "rvh", m: /højre ?ventrik\w* ?hypertrofi|(?<![a-z])rvh(?![a-z])|right ventricular hypertrophy/, navn: "Højre ventrikelhypertrofi", niveau: () => "warn",
      tekst: "Ses ved pulmonal hypertension, KOL, lungeemboli og medfødt hjertesygdom.", plan: ["Højre ventrikelhypertrofi: ekkokardiografi."] },
    { id: "vatrie", m: /venstre ?atrie-?\w*(?:forstørrelse|abnormitet|belastning|dilatation)|left atrial (?:enlargement|abnormality)|p[- ]mitrale/, navn: "Venstre atriepåvirkning", niveau: () => "info",
      tekst: "Bred eller dobbeltpuklet P — ses ved hypertension, mitralklapsygdom og hjertesvigt; disponerer for atrieflimren." },
    { id: "hatrie", m: /højre ?atrie-?\w*(?:forstørrelse|abnormitet|belastning|dilatation)|right atrial (?:enlargement|abnormality)|p[- ]pulmonale/, navn: "Højre atriepåvirkning", niveau: () => "info",
      tekst: "Høj P i II — ses ved lungesygdom og pulmonal hypertension." },
    { id: "biatrie", m: /biatri\w*/, navn: "Påvirkning af begge atrier", niveau: () => "info", tekst: "Tegn på belastning af begge atrier — overvej ekkokardiografi." },
    { id: "lavvolt", m: /lav (?:qrs-?)?volt\w*|low (?:qrs )?voltage/, navn: "Lav voltage", niveau: () => "info",
      tekst: "Kan skyldes adipositas, KOL og elektrodeplacering, men også perikardieeksudat, hypothyreose og amyloidose.", plan: ["Lav voltage: ved åndenød, hjertesvigt eller nyopstået fund → ekkokardiografi (perikardieeksudat, amyloidose); overvej TSH."] },
    { id: "langqt", m: /lang qt|forlænget qt\w*|qt-?forlængelse|prolonged qt|long qt/, navn: "Forlænget QT", niveau: () => "warn", tekst: "Se QTc-vurderingen." },
    { id: "kortqt", m: /kort qt|short qt/, navn: "Kort QT", niveau: () => "info", tekst: "Se QTc-vurderingen." },
    { id: "kortpr", m: /kort pr|short pr/, navn: "Kort PR", niveau: () => "info", tekst: "Se efter deltabølge (præeksitation); ellers normalvariant eller lav atrierytme." },
    { id: "venstreakse", m: /venstre ?akse|venstredrejet akse|left axis deviation/, navn: "Venstre akse", niveau: () => "info", tekst: "Se aksevurderingen." },
    { id: "hoejreakse", m: /højre ?akse|højredrejet akse|right axis deviation/, navn: "Højre akse", niveau: () => "info", tekst: "Se aksevurderingen. Ny højre akse med åndenød: tænk lungeemboli." },
    { id: "ekstremakse", m: /northwest axis|nordvest\w* akse|ekstrem\w* akse|extreme axis|indeterminate axis/, navn: "Ekstrem/ubestemt akse", niveau: () => "warn", tekst: "Forbyttede elektroder, ventrikulær rytme, hyperkaliæmi eller svær ledningssygdom.", plan: ["Ekstrem akse: kontrollér elektrodeplacering og tag nyt EKG; kalium."] },
    { id: "gammelMI", m: /infarkt\s*,?\s*(?:alder ubestemt|af ukendt alder|gammelt|ældre)|gammelt? (?:\w+ )?infarkt|tidligere (?:\w+ )?infarkt|old (?:\w+ )?infarct|infarct\s*,?\s*(?:age undetermined|old)|age undetermined|alder ubestemt/, navn: "Mulig gammelt infarkt (Q-takker)",
      hvisIkke: ["akutmi"], niveau: () => "warn", tekst: "Ofte falsk positivt (elektrodeplacering, venstre ventrikelhypertrofi, grenblok, normal Q i III). \"Kan ikke udelukke\" betyder, at maskinen er usikker.",
      plan: ["Mulige Q-takker: sammenlign med tidligere EKG; nyt fund → ekkokardiografi/kardiologisk vurdering."] },
    { id: "iskaemi", m: /st[- ]?depression|subendo[ck]ardi\w*|iskæmi(?!sk hjerte)\w*|ischemi(?!c heart)\w*|ischaemi(?!c heart)\w*|(?:marked|udtalt) st[- ]?(?:abnorm|forandring)\w*/, navn: "ST-depression / mulig iskæmi",
      hvisIkke: ["akutmi"], niveau: (k) => (k.brystsmerter ? "danger" : "warn"), tekst: "ST-depression ses ved iskæmi, men også ved hypertrofi, digoxin, hypokaliæmi og takykardi.",
      plan: ["ST-depression: med aktuelle brystsmerter → akut; ellers sammenlign med tidligere EKG og overvej udredning for iskæmisk hjertesygdom."] },
    { id: "stt", m: /(?:uspecifik\w*|non-?specific|nonspecific) (?:st|t)[- ]?(?:og t[- ]?|and t[- ]?|-t[- ]?)?(?:forandring|abnormitet|ændring|abnormalit|change|wave)\w*|uspecifik\w* t-?tak\w*|st-?t[- ](?:abnorm|forandring|change)\w*|t-?tak\w* ?(?:inversion|abnorm\w*|forandring\w*|ændring\w*)|t-?takabnorm\w*|abnorme? t-?tak\w*|negative? t-?tak\w*|inverte\w* t|t[- ]wave (?:abnormalit|inversion)\w*|repolari[sz]ation\w* (?:abnormalit|forandring|ændring)\w*|repolarisationsforandring\w*/, navn: "ST-T-forandringer",
      hvisIkke: ["iskaemi", "akutmi"], niveau: (k) => (k.brystsmerter ? "warn" : "info"), tekst: "Mange årsager: hypertrofi, grenblok, medicin, elektrolytter, iskæmi, normalvariant.",
      plan: ["ST-T-forandringer: sammenlign med tidligere EKG; nye forandringer med symptomer → vurder for iskæmi."] },
    { id: "tidlig", m: /tidlig repolarisering|early repolari[sz]ation/, navn: "Tidlig repolarisering", hvisIkke: ["stelev"], niveau: () => "ok", tekst: "Normalvariant, især hos unge mænd og veltrænede." },
    { id: "wpw", m: /præeksitation|pre-?excitation|(?<![a-z])wpw(?![a-z])|wolff/, navn: "Præeksitation (WPW-mønster)", niveau: (k) => (k.synkope ? "danger" : "warn"),
      tekst: "Kort PR, deltabølge og bred QRS. Ved atrieflimren kan ledningen over den accessoriske bane blive livsfarlig.", plan: ["Præeksitation: henvis til kardiolog (risikovurdering, evt. ablation) — hurtigt ved hjertebanken, akut ved synkope."] },
    { id: "brugada", m: /brugada/, navn: "Brugada-mønster", niveau: (k) => (k.synkope ? "danger" : "warn"),
      tekst: "Coved ST-elevation i V1–V2. Feber og visse lægemidler kan fremkalde mønsteret.", plan: ["Brugada-mønster: henvis til kardiolog; ved synkope akut. Feber behandles aktivt."] },
    { id: "perikard", m: /perikardit|pericardit/, navn: "Mulig perikarditis", hvisIkke: ["stelev"], niveau: () => "warn", tekst: "Udbredt ST-elevation og PR-depression.", plan: ["Mulig perikarditis: klinisk vurdering samme dag (CRP, troponin, ekkokardiografi)."] },
    { id: "pace", m: /pacemaker|pacet\w*|(?<![a-z])paced|elektronisk (?:pacet|stimuleret)|(?<![a-z])pacing/, navn: "Pacemakerrytme", niveau: () => "info",
      tekst: "Pacede komplekser: QRS, akse, ST-T og QTc kan ikke vurderes som vanligt." },
    { id: "teknik", m: /forbyttede|ombyttede|elektrode\w* (?:fejl|ombyt\w*|forbyt\w*)|lead reversal|arm lead|artefakt|artifact|støj|baseline (?:wander|drift)|technically limited|teknisk begrænset|suboptimal/, navn: "Teknisk problem", niveau: () => "warn",
      tekst: "Elektrodefejl eller støj kan give falske fund (fx forkert akse, falsk atrieflimren).", plan: ["Teknisk problem: kontrollér elektrodeplacering og tag et nyt EKG."] },
    { id: "dextro", m: /dextrokardi|dextrocardi/, navn: "Dextrokardi?", niveau: () => "info", tekst: "Oftest forbyttede arm-elektroder — tag nyt EKG." },
    { id: "ektopisk", m: /ektopisk\w* atrie\w*|lav atrie\w*|ectopic atrial|low atrial/, navn: "Ektopisk atrierytme", niveau: () => "ok", tekst: "Rytmen udgår fra et andet sted i atriet end sinusknuden; som regel uden betydning." },
    { id: "junk", m: /junktional|junctional|nodal rytme|knuderytme/, navn: "Junktional rytme", niveau: (k) => (k.synkope ? "warn" : "info"), tekst: "Rytme fra AV-knuden; ses ved høj vagustonus og AV-knude-hæmmende medicin." },
    { id: "sinusbrady", m: /sinus ?bradykardi|sinus bradycardia/, navn: "Sinusbradykardi", niveau: (k, v) => (k.synkope ? "warn" : /udtalt sinus ?bradykardi|marked sinus bradycardia/.test(v.maskineLav) ? "info" : "ok"), tekst: "Se frekvensvurderingen. \"Udtalt\" betyder typisk under 40/min." },
    { id: "sinustaky", m: /sinus ?takykardi|sinus tachycardia/, navn: "Sinustakykardi", niveau: () => "info", tekst: "Se frekvensvurderingen." },
    { id: "sinusarytmi", m: /sinus ?arytmi|sinus arrhythmia/, navn: "Sinusarytmi", niveau: () => "ok", tekst: "Respiratorisk variation — normalt." },
    { id: "sinus", m: /sinus ?rytme|sinus rhythm/, navn: "Sinusrytme", niveau: () => "ok", tekst: "Normal rytme fra sinusknuden." },
    { id: "abnorm", m: /abnormt? ekg|abnormal ecg|unormalt? ekg/, navn: "Maskinen: unormalt EKG", niveau: () => "info", tekst: "Samlet bedømmelse — se de enkelte fund." },
    { id: "graense", m: /grænse-?ekg|grænsetilfælde|borderline/, navn: "Maskinen: grænse-EKG", niveau: () => "info", tekst: "Samlet bedømmelse — se de enkelte fund." },
    { id: "normal", m: /(?<![a-zæøå])(?:normalt?|normal) ekg|(?<![a-z])normal ecg|otherwise normal|i øvrigt normal\w*/, navn: "Maskinen: i øvrigt normalt", niveau: () => "ok", tekst: "Maskinen vurderer resten som normalt." },
  ];

  // ---------------------------------------------------------------- Vurdering af måleværdier
  function vurder(v, k) {
    const rk = []; // rækker til tabellen: { navn, vaerdi, ref, niveau, tekst }
    const plan = [];
    const fund = []; // korte vurderinger til notat og sammenfatning
    const uregelmaessig = v.uregelmaessig;
    const pacet = v.udsagn.has("pace");
    const add = (r) => {
      rk.push(r);
      if (r.niveau !== "ok" && r.kort) fund.push({ niveau: r.niveau, tekst: r.kort });
      if (r.plan) plan.push(...[].concat(r.plan).filter(Boolean).map((t) => ({ n: r.niveau, t })));
    };

    // Frekvens
    if (!isNaN(v.hr)) {
      const r = { navn: uregelmaessig ? "Ventrikelfrekvens" : "Frekvens", vaerdi: `${fmt(v.hr)}/min`, ref: "50–100/min" };
      if (uregelmaessig) {
        r.ref = "Hvile < 110/min ved atrieflimren";
        if (v.hr > 150) Object.assign(r, { niveau: "danger", tekst: "Hurtig ventrikelfrekvens — akut vurdering ved symptomer, hjertesvigt eller brystsmerter.", kort: `hurtig ventrikelfrekvens ${fmt(v.hr)}/min` });
        else if (v.hr >= 110) Object.assign(r, { niveau: "warn", tekst: "Over målet for frekvenskontrol (< 110/min i hvile, ESC 2024).", kort: `ventrikelfrekvens ${fmt(v.hr)}/min (over 110)`, plan: "Frekvenskontrol: betablokker eller non-DHP-calciumantagonist (ikke ved nedsat EF) — se Atrieflimren-værktøjet." });
        else if (v.hr < 50) Object.assign(r, { niveau: "warn", tekst: "Langsom ventrikelfrekvens ved atrieflimren — tjek AV-knude-hæmmende medicin og digoxin.", kort: `langsom ventrikelfrekvens ${fmt(v.hr)}/min` });
        else Object.assign(r, { niveau: "ok", tekst: "Frekvenskontrolleret." });
      } else if (v.hr < 40) {
        Object.assign(r, { niveau: k.synkope ? "danger" : k.atlet && v.hr >= 30 ? "info" : "warn", tekst: k.atlet && v.hr >= 30 ? "Udtalt bradykardi — kan være normalt hos veltrænede (≥ 30/min), hvis der ikke er symptomer." : "Udtalt bradykardi. Gennemgå medicin (betablokker, non-DHP-calciumantagonist, digoxin, ivabradin); TSH og elektrolytter. Ved svimmelhed, synkope eller hjertesvigt: akut.", kort: `udtalt bradykardi ${fmt(v.hr)}/min`, plan: k.atlet && !k.synkope ? null : "Bradykardi < 40/min: medicingennemgang, TSH, kalium; ved symptomer akut, ellers Holter og kardiologisk vurdering." });
      } else if (v.hr < 50) {
        Object.assign(r, { niveau: k.synkope ? "warn" : k.atlet ? "ok" : "info", tekst: k.atlet ? "Sinusbradykardi — normalt hos veltrænede." : "Bradykardi (< 50/min, AHA 2009). Hyppigt normalt (søvn, veltrænede) eller medicinbetinget; udred kun ved symptomer.", kort: `bradykardi ${fmt(v.hr)}/min`, plan: k.synkope ? "Bradykardi med synkope/svimmelhed: medicingennemgang, TSH, kalium og Holter; henvis til kardiolog." : null });
      } else if (v.hr <= 100) Object.assign(r, { niveau: "ok", tekst: "Normal frekvens." });
      else if (v.hr <= 150) Object.assign(r, { niveau: "warn", tekst: "Takykardi (> 100/min). Find årsagen: feber, smerter, angst, dehydrering, anæmi, hyperthyreose, lungeemboli, hjertesvigt, medicin/stimulantia — eller en anden rytme end sinus.", kort: `takykardi ${fmt(v.hr)}/min`, plan: "Takykardi: vurder klinisk (feber, dehydrering, anæmi, lungeemboli); TSH og hæmoglobin; bekræft rytmen på kurven." });
      else Object.assign(r, { niveau: "danger", tekst: "Frekvens > 150/min — tænk supraventrikulær takykardi, atrieflagren med 2:1-overledning eller ventrikeltakykardi. Akut vurdering.", kort: `takykardi ${fmt(v.hr)}/min (> 150)`, plan: "Frekvens > 150/min: akut vurdering af rytmen og patienten." });
      add(r);
    }

    // PR
    if (!isNaN(v.pr)) {
      const r = { navn: "PR-interval", vaerdi: `${fmt(v.pr)} ms`, ref: "120–200 ms" };
      if (uregelmaessig || pacet) Object.assign(r, { niveau: "info", tekst: uregelmaessig ? "PR kan ikke vurderes ved atrieflimren/-flagren." : "PR afhænger af pacemakerens indstilling." });
      else if (v.pr < 120) {
        const bred = !isNaN(v.qrs) && v.qrs >= 110;
        Object.assign(r, { niveau: bred ? "warn" : "info", tekst: bred ? "Kort PR med bred QRS: mistanke om præeksitation (WPW-mønster) — se efter deltabølge." : "Kort PR. Se efter deltabølge (præeksitation); ellers normalvariant eller lav atrierytme.", kort: `kort PR ${fmt(v.pr)} ms${bred ? " med bred QRS (præeksitation?)" : ""}`, plan: bred ? "Kort PR og bred QRS: se efter deltabølge — bekræftet præeksitation henvises til kardiolog." : null });
      } else if (v.pr <= 200) Object.assign(r, { niveau: "ok", tekst: "Normal AV-overledning." });
      else {
        const udtalt = v.pr >= 300;
        const atletOk = k.atlet && v.pr < 400;
        const brede = !isNaN(v.qrs) && v.qrs >= 120;
        let tekst = `AV-blok grad I (PR > 200 ms). ${atletOk ? "Normalt hos veltrænede (PR < 400 ms, internationale kriterier 2017)." : "Oftest godartet — ses hos ældre og ved AV-knude-hæmmende medicin (betablokker, non-DHP-calciumantagonist, digoxin, antiarytmika) og hypo-/hyperkaliæmi."}`;
        if (udtalt) tekst += " Ved PR ≥ 300 ms kan atriekontraktionen ske mod lukket mitralklap og give træthed, åndenød og svimmelhed (som pacemakersyndrom).";
        if (brede) tekst += " Sammen med bred QRS kan det være tegn på udbredt ledningssygdom.";
        const niveau = k.synkope ? "warn" : atletOk ? "ok" : udtalt || brede ? "warn" : "info";
        const p = [];
        if (!atletOk) p.push("AV-blok grad I: gennemgå AV-knude-hæmmende medicin og kalium; ingen behandling uden symptomer.");
        if (udtalt || brede || k.synkope) p.push(`AV-blok grad I${udtalt ? " med PR ≥ 300 ms" : ""}${brede ? " og bred QRS" : ""}: ved svimmelhed, synkope eller nedsat arbejdsevne henvis til kardiolog (Holter${udtalt ? "; pacing kan komme på tale, ESC 2021" : ""}).`);
        Object.assign(r, { niveau, tekst, kort: `AV-blok grad I (PR ${fmt(v.pr)} ms)`, plan: p });
      }
      add(r);
    }

    // QRS
    if (!isNaN(v.qrs)) {
      const r = { navn: "QRS-varighed", vaerdi: `${fmt(v.qrs)} ms`, ref: "< 110 ms" };
      if (pacet) Object.assign(r, { niveau: "info", tekst: "Bred QRS forventes ved ventrikulær pacing." });
      else if (v.qrs < 110) Object.assign(r, { niveau: "ok", tekst: "Normal." });
      else if (v.qrs < 120) Object.assign(r, { niveau: "info", tekst: "Let forlænget (110–119 ms): inkomplet grenblok eller uspecifik intraventrikulær ledningsforsinkelse — morfologien afgør. Oftest uden betydning hos raske.", kort: `let forlænget QRS ${fmt(v.qrs)} ms` });
      else if (!isNaN(v.hr) && v.hr > 100) {
        const kendt = v.udsagn.has("sinustaky") && (v.udsagn.has("lbbb") || v.udsagn.has("rbbb") || v.udsagn.has("ivcd"));
        Object.assign(r, {
          niveau: kendt && !k.synkope ? "warn" : "danger",
          tekst: `Bred-kompleks-takykardi (frekvens ${fmt(v.hr)}/min og QRS ≥ 120 ms): ventrikeltakykardi, til det modsatte er bevist.${kendt ? " Maskinen angiver sinustakykardi med kendt grenblok — bekræft på kurven og sammenlign med tidligere EKG." : ""}`,
          kort: `bred-kompleks-takykardi (QRS ${fmt(v.qrs)} ms, ${fmt(v.hr)}/min)`,
          plan: "Bred-kompleks-takykardi: vurder patienten nu — akut (112) ved påvirkning; ellers samme-dags kardiologisk vurdering.",
        });
      } else {
        const lbbb = v.udsagn.has("lbbb");
        Object.assign(r, {
          niveau: k.brystsmerter && !v.udsagn.has("rbbb") ? "danger" : "warn",
          tekst: "Bred QRS (≥ 120 ms): grenblok, uspecifik intraventrikulær ledningsforstyrrelse, præeksitation, pacing, hyperkaliæmi eller lægemidler (klasse I-antiarytmika, tricykliske antidepressiva). ST-T og QTc kan ikke vurderes som vanligt.",
          kort: `bred QRS ${fmt(v.qrs)} ms`,
          plan: [k.brystsmerter && !v.udsagn.has("rbbb") ? "Bred QRS og brystsmerter: akut vurdering — et nyt venstresidigt grenblok kan ikke skelnes fra infarkt." : "Bred QRS: sammenlign med tidligere EKG — nyopstået? Kalium; gennemgå medicin; " + (lbbb ? "venstresidigt grenblok → ekkokardiografi." : "ekkokardiografi ved nyt fund eller symptomer.")],
        });
      }
      add(r);
    }

    // P-varighed
    if (!isNaN(v.pdur) && !uregelmaessig) {
      const r = { navn: "P-varighed", vaerdi: `${fmt(v.pdur)} ms`, ref: "< 120 ms" };
      if (v.pdur >= 120) Object.assign(r, { niveau: "info", tekst: "Interatrielt blok (P ≥ 120 ms, Bayés de Luna 2012): forsinket ledning mellem atrierne. Sammenhængen med atrieflimren og apopleksi gælder især avanceret interatrielt blok (bifasisk P i II, III og aVF — se kurven); ingen behandling i sig selv.", kort: `P-varighed ${fmt(v.pdur)} ms (interatrielt blok)`, plan: "Interatrielt blok: vær opmærksom på atrieflimren (pulspalpation, EKG ved hjertebanken); behandl risikofaktorer (blodtryk)." });
      else Object.assign(r, { niveau: "ok", tekst: "Normal." });
      add(r);
    }

    // Akser
    if (!isNaN(v.paxe) && !uregelmaessig && !pacet) {
      const a = akse(v.paxe);
      const r = { navn: "P-akse", vaerdi: `${fmt(a)}°`, ref: "0° til +75°" };
      if (a >= 0 && a <= 75) Object.assign(r, { niveau: "ok", tekst: "Normal (sinusrytme)." });
      else if (a > 75 && a <= 90) Object.assign(r, { niveau: "ok", tekst: "Lodret P-akse — ses ved slanke og ved lungesygdom (KOL)." });
      else Object.assign(r, { niveau: "info", tekst: "Unormal P-akse: ektopisk (lav) atrierytme, forbyttede arm-elektroder eller dextrokardi. Kontrollér elektroderne.", kort: `unormal P-akse ${fmt(a)}°`, plan: "Unormal P-akse: kontrollér elektrodeplacering og gentag EKG, hvis fundet er nyt." });
      add(r);
    }
    if (!isNaN(v.qrsaxe) && !pacet) {
      const a = akse(v.qrsaxe);
      const ung = !isNaN(v.alder) && v.alder < 30;
      const r = { navn: "QRS-akse", vaerdi: `${fmt(a)}°`, ref: "−30° til +90°" };
      if (a >= -30 && a <= 90) Object.assign(r, { niveau: "ok", tekst: "Normal." });
      else if (a < -30 && a > -45) Object.assign(r, { niveau: "info", tekst: "Let venstre akse (−30° til −45°) — ses ved alder, adipositas, venstre ventrikelhypertrofi og inferiort infarkt.", kort: `venstre akse ${fmt(a)}°` });
      else if (a <= -45 && a >= -90) Object.assign(r, { niveau: "info", tekst: "Venstre akse ≤ −45°: forenelig med venstre anterior fascikelblok (hemiblok), hvis morfologien passer. Isoleret oftest uden behandlingsbehov; sammen med højresidigt grenblok = bifascikulært blok.", kort: `venstre akse ${fmt(a)}° (venstre anterior fascikelblok?)` });
      else if (a > 90 && a <= 180) Object.assign(r, { niveau: ung && a <= 110 ? "ok" : "info", tekst: ung && a <= 110 ? "Let højre akse — normalt hos unge og slanke." : "Højre akse (> 90°): KOL, højre ventrikelbelastning (lungeemboli, pulmonal hypertension), venstre posterior fascikelblok, lateralt infarkt eller forbyttede elektroder. Ny højre akse med åndenød: tænk lungeemboli.", kort: ung && a <= 110 ? null : `højre akse ${fmt(a)}°` });
      else Object.assign(r, { niveau: "warn", tekst: "Ekstrem akse (−90° til ±180°): forbyttede elektroder, ventrikulær rytme, hyperkaliæmi eller svær ledningssygdom. Kontrollér elektroderne og tag nyt EKG.", kort: `ekstrem QRS-akse ${fmt(a)}°`, plan: "Ekstrem akse: kontrollér elektrodeplacering og tag nyt EKG; kalium." });
      add(r);
    }
    if (!isNaN(v.taxe) && !isNaN(v.qrsaxe) && !pacet) {
      const d = vinkel(v.qrsaxe, v.taxe);
      const r = { navn: "QRS-T-vinkel (frontal)", vaerdi: `${fmt(d)}°`, ref: "< 100°", ekstra: `T-akse ${fmt(akse(v.taxe))}°` };
      if (d < 100) Object.assign(r, { niveau: "ok", tekst: "QRS og T peger i samme retning." });
      else if (!isNaN(v.qrs) && v.qrs >= 120) Object.assign(r, { niveau: "info", tekst: "Bred vinkel forventes ved grenblok (sekundære repolarisationsforandringer)." });
      else Object.assign(r, { niveau: "info", tekst: "Bred QRS-T-vinkel (≥ 100°): repolarisationsforandringer (fx hypertrofi, iskæmi, medicin). I befolkningsstudier associeret med øget risiko for hjertedød — se ST-T på kurven.", kort: `bred QRS-T-vinkel ${fmt(d)}°` });
      add(r);
    }

    // Voltage
    const bredQrs = (!isNaN(v.qrs) && v.qrs >= 120) || v.udsagn.has("lbbb");
    const BRED_VOLT = "Voltagekriterier er upålidelige ved grenblok/bred QRS — vurderes ikke.";
    if (!isNaN(v.sokolow) && !pacet) {
      const r = { navn: "Sokolow-Lyon (SV1 + RV5/V6)", vaerdi: `${fmt(v.sokolow, 2)} mV`, ref: "≤ 3,5 mV" };
      const lavSpec = (!isNaN(v.alder) && v.alder < 40) || k.atlet;
      if (bredQrs) Object.assign(r, { niveau: "info", tekst: BRED_VOLT });
      else if (v.sokolow > 3.5)
        Object.assign(r, { niveau: lavSpec ? "info" : "warn", tekst: lavSpec ? "Voltagekriterium for venstre ventrikelhypertrofi opfyldt — men lav specificitet hos unge (< 40 år), slanke og veltrænede (isoleret voltage er normalt hos atleter)." : "Voltagekriterium for venstre ventrikelhypertrofi opfyldt (ESH 2023). Ved hypertension = organskade.", kort: `Sokolow-Lyon ${fmt(v.sokolow, 2)} mV (> 3,5)`, plan: lavSpec ? null : PLAN_LVH });
      else Object.assign(r, { niveau: "ok", tekst: "Ikke opfyldt (lav sensitivitet — udelukker ikke hypertrofi)." });
      add(r);
    }
    if (!isNaN(v.cornell) && !pacet) {
      const graense = v.koen === "kvinde" ? 2.0 : 2.8;
      const r = { navn: "Cornell-voltage (RaVL + SV3)", vaerdi: `${fmt(v.cornell, 2)} mV`, ref: v.koen === "kvinde" ? "≤ 2,0 mV (kvinder)" : v.koen === "mand" ? "≤ 2,8 mV (mænd)" : "≤ 2,8 mV (mænd) / ≤ 2,0 mV (kvinder)" };
      // Cornell-produkt: (RaVL + SV3, + 0,6 mV hos kvinder) × QRS (Molloy 1992).
      const produkt = !isNaN(v.qrs) && v.koen !== "ukendt" ? (v.cornell + (v.koen === "kvinde" ? 0.6 : 0)) * v.qrs : NaN;
      if (bredQrs) Object.assign(r, { niveau: "info", tekst: BRED_VOLT });
      else if (v.cornell > graense) Object.assign(r, { niveau: "warn", tekst: "Cornell-kriterium for venstre ventrikelhypertrofi opfyldt (ESH 2023).", kort: `Cornell ${fmt(v.cornell, 2)} mV`, plan: PLAN_LVH });
      else if (v.koen === "ukendt" && v.cornell > 2.0) Object.assign(r, { niveau: "info", tekst: "Opfyldt, hvis patienten er kvinde (> 2,0 mV) — angiv køn." });
      else Object.assign(r, { niveau: "ok", tekst: "Ikke opfyldt." });
      if (!isNaN(produkt)) r.ekstra = `Cornell-produkt ${fmt(produkt)} mV·ms (${produkt > 244 ? "> 244: hypertrofi" : "≤ 244"}${v.koen === "kvinde" ? "; + 0,6 mV hos kvinder" : ""})`;
      if (!isNaN(produkt) && produkt > 244 && r.niveau === "ok" && !bredQrs) Object.assign(r, { niveau: "warn", tekst: "Cornell-produkt > 244 mV·ms: kriterium for venstre ventrikelhypertrofi opfyldt (ESH 2023).", kort: `Cornell-produkt ${fmt(produkt)} mV·ms` });
      add(r);
    }

    // Overensstemmelse mellem tallene
    const tjek = [];
    if (!isNaN(v.hr) && !isNaN(v.rr) && !uregelmaessig) {
      const f = 60000 / v.rr;
      if (Math.abs(f - v.hr) > Math.max(5, 0.1 * v.hr)) tjek.push(`RR ${fmt(v.rr)} ms svarer til ${fmt(f)}/min, men frekvensen er ${fmt(v.hr)}/min — tjek tallene (uregelmæssig rytme?).`);
    }
    if (!isNaN(v.pp) && !isNaN(v.rr) && !uregelmaessig && !pacet && Math.abs(v.pp - v.rr) > Math.max(80, 0.15 * v.rr)) {
      tjek.push(`PP (${fmt(v.pp)} ms) og RR (${fmt(v.rr)} ms) afviger: flere P-takker end QRS-komplekser (AV-blok grad II–III) eller AV-dissociation? Se kurven.`);
      fund.push({ niveau: "warn", tekst: "PP og RR afviger (AV-blok/AV-dissociation?)" });
      plan.push({ n: "warn", t: "PP ≠ RR: se kurven for AV-blok grad II–III eller AV-dissociation; ved bradykardi eller symptomer samme-dags kardiologisk vurdering." });
    }
    return { rk, plan, fund, tjek };
  }

  function qtVurdering(v, k) {
    if (isNaN(v.qt) && isNaN(v.qtc)) return null;
    const rr = !isNaN(v.rr) ? v.rr : !isNaN(v.hr) ? 60000 / v.hr : NaN;
    const alle = !isNaN(v.qt) && !isNaN(rr) ? qtcAlle(v.qt, rr, v.hr) : null;
    const bred = !isNaN(v.qrs) && v.qrs >= 120;
    const pacet = v.udsagn.has("pace");
    // Primær værdi: Fridericia (mere retvisende end Bazett ved høj og lav puls); ellers apparatets QTc.
    const primaer = alle ? alle.F : v.qtc;
    const primNavn = alle ? "Fridericia" : `apparatets QTc${v.qtcFormel ? ` (${FORMEL[v.qtcFormel]})` : ""}`;
    // Ved bred QRS: skøn efter Bogossian (QT − 48,5 % ≈ 50 % af QRS), udviklet ved venstresidigt grenblok/pacing.
    const bogossian = bred && !isNaN(v.qt) && !isNaN(rr) ? qtcAlle(v.qt - 0.5 * v.qrs, rr, v.hr).F : NaN;
    const graense = v.koen === "kvinde" ? 460 : 450;
    const noter = [];
    const plan = [];
    if (isNaN(primaer)) return { alle, primaer, primNavn, bogossian, niveau: "info", tekst: "QTc kan ikke vurderes — angiv RR eller frekvens.", kort: null, noter, plan, graense };
    const vurderTal = !isNaN(bogossian) ? bogossian : primaer;
    const vis = !isNaN(bogossian) ? `QTc-skøn ${fmt(bogossian)} ms (bred QRS)` : `QTc ${fmt(primaer)} ms`;
    let niveau = "ok";
    let kort = null;
    let tekst;

    if (vurderTal >= 500) {
      niveau = "danger";
      tekst = "QTc ≥ 500 ms: høj risiko for torsades de pointes.";
      kort = `${vis} (≥ 500)`;
      plan.push("QTc ≥ 500 ms: seponér/pausér QT-forlængende lægemidler, mål kalium, magnesium og calcium i dag, gentag EKG; ved synkope eller hjertebanken akut. Henvis til kardiolog.");
    } else if (vurderTal >= 450 && (v.koen !== "kvinde" || vurderTal >= 460)) {
      const kunMand = v.koen === "ukendt" && vurderTal < 460;
      const lqts = vurderTal >= 480;
      niveau = k.synkope && !kunMand ? "danger" : kunMand ? "info" : "warn";
      tekst = kunMand
        ? "QTc 450–459 ms: forlænget hos mænd, normalt hos kvinder — angiv køn."
        : lqts
          ? "QTc ≥ 480 ms: ved gentagne målinger uden anden forklaring forenelig med lang-QT-syndrom (ESC 2022)."
          : `Forlænget QTc (${v.koen === "ukendt" ? "≥ 450 ms hos mænd / ≥ 460 ms hos kvinder" : `≥ ${graense} ms hos ${v.koen === "kvinde" ? "kvinder" : "mænd"}`}, AHA 2009).`;
      if (k.synkope && !kunMand) tekst += " Sammen med synkope: mistanke om lang-QT-syndrom (ESC 2022: QTc ≥ 460 ms og arytmisk synkope).";
      kort = `forlænget ${lille(vis)}`;
      if (k.synkope && !kunMand) plan.push("Synkope og forlænget QTc: hurtig/akut kardiologisk vurdering (lang-QT-syndrom?); elektrolytter og medicingennemgang i dag.");
      if (lqts) plan.push("QTc ≥ 480 ms: gentag EKG, gennemgå QT-forlængende medicin (crediblemeds.org) og elektrolytter (K, Mg, Ca); vedvarende uden forklaring → kardiolog (lang-QT-syndrom).");
      else if (!kunMand) plan.push("Forlænget QTc: gennemgå QT-forlængende medicin (crediblemeds.org), kalium og magnesium; undgå at lægge flere QT-forlængende lægemidler til; gentag EKG.");
    } else if (vurderTal <= 320) {
      niveau = "warn";
      tekst = "Meget kort QTc (≤ 320 ms): kort-QT-syndrom bør overvejes (ESC 2022). Udeluk hyperkalcæmi og digoxin.";
      kort = `meget kort ${lille(vis)}`;
      plan.push("QTc ≤ 320 ms: calcium, kalium, digoxin? Henvis til kardiolog (kort-QT-syndrom).");
    } else if (vurderTal <= 360) {
      niveau = k.synkope ? "warn" : "info";
      tekst = k.synkope ? "Kort QTc (≤ 360 ms) og synkope: kort-QT-syndrom bør overvejes (ESC 2022)." : "Kort QTc (≤ 360 ms) — sjældent af betydning uden synkope, hjertestop eller pludselig død i familien. Udeluk hyperkalcæmi og digoxin.";
      kort = `kort ${lille(vis)}`;
      if (k.synkope) plan.push("Kort QTc og synkope: henvis til kardiolog.");
    } else tekst = vurderTal >= 440 ? "Højnormal QTc — vær opmærksom ved QT-forlængende medicin." : "Normal QTc.";

    // Skønnet må ikke berolige, når den ukorrigerede QTc er ≥ 500 ms.
    if (!isNaN(bogossian) && primaer >= 500 && RANG[niveau] < 2) {
      niveau = "warn";
      tekst += ` QTc uden korrektion for QRS er ${fmt(primaer)} ms — forlængelse kan ikke afvises ved bred QRS; vurder JT-intervallet på kurven.`;
      kort = `QTc ${fmt(primaer)} ms ved bred QRS (skøn ${fmt(bogossian)} ms)`;
      plan.push("QTc ≥ 500 ms ved bred QRS: vurder JT-intervallet, gennemgå QT-forlængende medicin og elektrolytter; konferér med kardiolog ved tvivl.");
    }
    if (k.qtmed && niveau !== "ok") plan.push("Patienten får QT-forlængende medicin: vurder dosisreduktion/alternativ og kontrol-EKG (stigning > 60 ms øger risikoen, AHA 2010).");
    if (k.qtmed && niveau === "ok") noter.push("Ved QT-forlængende medicin: tag kontrol-EKG efter opstart/dosisøgning — en stigning > 60 ms øger risikoen for torsades (AHA 2010).");

    if (alle) {
      const thr = graense;
      if (!isNaN(v.hr) && v.hr > 80 && alle.B >= thr && alle.F < thr) noter.push(`Bazett giver ${fmt(alle.B)} ms, men overkorrigerer ved puls > 80 — Fridericia (${fmt(alle.F)} ms) er mere retvisende.`);
      if (!isNaN(v.hr) && v.hr < 60 && alle.F >= thr && alle.B < thr) noter.push(`Bazett (${fmt(alle.B)} ms) underkorrigerer ved lav puls og skjuler forlængelsen — Fridericia er ${fmt(alle.F)} ms.`);
      if (!isNaN(v.qtc) && v.qtcFormel && alle[v.qtcFormel] && Math.abs(alle[v.qtcFormel] - v.qtc) > 15) noter.push(`Apparatets QTc (${fmt(v.qtc)} ms) afviger fra beregningen med ${FORMEL[v.qtcFormel]} (${fmt(alle[v.qtcFormel])} ms) — tjek QT og RR.`);
    }
    if (bred)
      noter.push(
        isNaN(bogossian)
          ? "Bred QRS forlænger QT uden at repolariseringen er forlænget — QTc overvurderer risikoen."
          : `Bred QRS forlænger QT uden at repolariseringen er forlænget. Vurderingen bygger på et usikkert skøn efter Bogossian (QT − 50 % af QRS, derefter Fridericia): ${fmt(bogossian)} ms. Formlen er udviklet ved venstresidigt grenblok og pacing${v.udsagn.has("rbbb") ? " og overkorrigerer formentlig ved højresidigt grenblok" : ""}.`
      );
    if (v.uregelmaessig) noter.push("Uregelmæssig rytme: QT varierer fra slag til slag — brug gennemsnittet af flere slag, og vær forsigtig med enkeltværdier.");
    if (pacet) noter.push("Pacet rytme: QTc kan ikke vurderes som vanligt.");
    if (!isNaN(v.hr) && (v.hr > 100 || v.hr < 50) && alle) noter.push("Ved puls over 100 eller under 50 er alle formler usikre — gentag gerne EKG ved puls 60–90.");

    return { alle, primaer, primNavn, bogossian, niveau: pacet ? "info" : niveau, tekst, kort, noter, plan, graense };
  }

  // ---------------------------------------------------------------- Udsagn fra maskinen
  // Nægtet ("ingen atrieflimren", "VT ikke påvist", "has replaced atrial fibrillation") eller historisk
  // ("tidligere STEMI") tæller ikke som aktuelt fund. "Kan ikke udelukke" er ikke en nægtelse.
  const NEG_FOER = /(?:^|[^a-zæøå])(?:ingen|ikke|intet|no|not|without|uden|negativ for|replaced|erstattet)\s+(?:(?:tegn|evidence|signs?)\s+(?:på|of)\s+)?(?:[a-zæøå-]+\s+)?$/;
  const IKKE_NEG = /(?:udelukke|udelukkes|rule out|exclude|afvise)\s+(?:[a-zæøå-]+\s+)?$/;
  const NEG_EFTER = /^[^.;]{0,14}?(?:ikke påvist|ikke til stede|ikke længere|no longer present|is no longer|not present|udelukket|ophørt)/;
  const HISTORISK = /(?:tidligere|gammel\w*|old|prior|previous)\s+(?:[a-zæøå-]+\s+)?$/;
  const FYLD = /(?:^|\s)(?:lejlighedsvis|occasional|frequent|hyppige?|multiple|mulig\w*|possibl\w*|probabl\w*|sandsynlig\w*|consider|overvej|or|eller|and|og|i øvrigt|otherwise|ekg|ecg|abnormal\w*|normal\w*|ubekræftet|unconfirmed|confirmed|bekræftet|kan ikke udelukke|cannot rule out|rule out|ikke|not|the|af|of|pattern|mønster|tegn på|evidence of|is|er|present|til stede|nu|now|\d+)(?=\s|$)/g;

  function laesUdsagn(tekst) {
    const t = tekst.toLowerCase().replace(/\s+/g, " ").replace(/[−–]/g, "-");
    const ider = new Set();
    const fundne = [];
    const ramt = [];
    const gammel = UDSAGN.find((u) => u.id === "gammelMI");
    UDSAGN.forEach((u) => {
      const re = new RegExp(u.m.source, "g");
      let m;
      let aktiv = false;
      let historisk = false;
      while ((m = re.exec(t))) {
        if (!m[0]) {
          re.lastIndex++;
          continue;
        }
        ramt.push([m.index, m.index + m[0].length]);
        const foer = t.slice(Math.max(0, m.index - 40), m.index).split(/[.;:]/).pop();
        const efter = t.slice(m.index + m[0].length, m.index + m[0].length + 30);
        if ((NEG_FOER.test(foer) && !IKKE_NEG.test(foer)) || NEG_EFTER.test(efter)) continue;
        if (u.id === "akutmi" && HISTORISK.test(foer)) {
          historisk = true;
          continue;
        }
        aktiv = true;
      }
      if (aktiv && !ider.has(u.id)) {
        fundne.push(u);
        ider.add(u.id);
      } else if (historisk && !ider.has("gammelMI")) {
        fundne.push(gammel);
        ider.add("gammelMI");
      }
    });
    // Højresidigt grenblok + fascikelblok = bifascikulært blok.
    if (ider.has("rbbb") && (ider.has("lafb") || ider.has("lpfb")) && !ider.has("bifasc")) {
      fundne.push(UDSAGN.find((u) => u.id === "bifasc"));
      ider.add("bifasc");
    }
    // Dele af teksten, som ingen regel kender: vises, så intet forsvinder i stilhed.
    const ukendte = [];
    let pos = 0;
    t.split(/([.;]\s*|\s(?:med|with|samt)\s|,\s)/).forEach((del, i) => {
      const start = pos;
      pos += del.length;
      if (i % 2 === 1) return;
      const rest = del.replace(FYLD, " ").replace(/[^a-zæøå]+/g, " ").trim();
      if (rest.length < 3) return;
      if (ramt.some(([a, b]) => a < pos && b > start)) return;
      ukendte.push(del.trim());
    });
    return { liste: fundne.filter((u) => !(u.hvisIkke || []).some((x) => ider.has(x))), ider, ukendte };
  }

  // ---------------------------------------------------------------- Sammenligning med tidligere EKG
  // Et nyt fund vejer tungere end et kendt: den tidligere udskrift læses med samme regler som den
  // aktuelle, og forskellene vurderes. Grænser: QTc-stigning > 30 og > 60 ms (ICH E14; Drew 2010),
  // QRS-forlængelse > 25 % (fx flecainid, ESC), nyt AV-blok, ny bred QRS og ny akse — med krav om en
  // minimumsændring, så måleusikkerhed omkring en grænse ikke giver alarm.
  const NEUTRALE = new Set(["normal", "abnorm", "graense", "sinus", "sinusarytmi", "vrespons", "sinusbrady", "sinustaky", "langqt", "kortqt", "kortpr", "venstreakse", "hoejreakse", "lvhmin"]);
  const lille = (s) => (s.length > 1 && s[1] === s[1].toLowerCase() ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  // Datoen for optagelsen: alle datoer i teksten gennemgås; fødselsdatoer springes over, datoer efter
  // "optaget/dato/acquired" foretrækkes, og datoer i fremtiden bruges ikke.
  function findDato(t) {
    const kandidater = [];
    const re = /(?<![\d.\/-])(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4}|\d{2}))(?![\d.\/-])/g;
    let m;
    const idag = new Date();
    while ((m = re.exec(t || ""))) {
      const [d, mdr, aar] = m[1] ? [+m[3], +m[2], +m[1]] : [+m[4], +m[5], m[6].length === 2 ? 2000 + +m[6] : +m[6]];
      if (!(d >= 1 && d <= 31 && mdr >= 1 && mdr <= 12 && aar >= 1980)) continue;
      const dato = new Date(aar, mdr - 1, d);
      if (dato > idag) continue;
      const foer = t.slice(Math.max(0, m.index - 25), m.index).toLowerCase();
      if (/(?:født|fødselsdato|f\.|dob|birth|fød\.)\s*:?\s*$/.test(foer)) continue;
      kandidater.push({ dato, foretrukket: /(?:optaget|dato|date|acquired|recorded|taget|undersøgt|tid)\s*:?\s*$/.test(foer) });
    }
    const v = kandidater.find((k) => k.foretrukket) || kandidater[0];
    return v ? v.dato : null;
  }
  // CPR-nummer (også erstatningsnumre, dag + 60) bruges kun til at tjekke, at to udskrifter er fra samme
  // patient — det vises aldrig.
  const findCpr = (t) => {
    const m = (t || "").match(/(?<![\d-])(\d{2})(\d{2})(\d{2})[- ]?(\d{4})(?![\d-])/);
    if (!m) return null;
    const d = +m[1];
    return ((d >= 1 && d <= 31) || (d >= 61 && d <= 91)) && +m[2] >= 1 && +m[2] <= 12 ? m.slice(1).join("") : null;
  };
  const datoTekst = (d) => d.toLocaleDateString("da-DK");
  const samme = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function laesTidligere() {
    const tekst = document.getElementById("tidligereTekst").value.trim();
    if (!tekst || !window.Udfyld) return null;
    const v = {};
    udtraek(Udfyld.lib(tekst)).forEach((f) => {
      if (f.type === "num") v[f.id] = f.v;
      else if (f.id === "qtcFormel") v.qtcFormel = f.v;
      else if (f.id === "maskine") v.maskine = f.v;
    });
    const l = laesUdsagn(v.maskine || "");
    v.udsagn = l.ider;
    v.vist = new Set(l.liste.map((u) => u.id));
    v.ukendte = l.ukendte;
    const felt = document.getElementById("tidligereDato").value;
    const dato = felt ? new Date(felt + "T00:00") : findDato(tekst);
    return { v, tekst, dato, tal: ["hr", "pr", "qrs", "qt", "qtc", "rr", "qrsaxe"].some((x) => !isNaN(v[x])) };
  }

  // QTc til sammenligning: Fridericia for begge, når QT og RR (eller frekvens) findes; ellers apparatets
  // QTc, men kun hvis begge er beregnet med samme formel.
  const qtcF = (v) => {
    const rr = !isNaN(v.rr) ? v.rr : !isNaN(v.hr) ? 60000 / v.hr : NaN;
    return !isNaN(v.qt) && !isNaN(rr) ? qtcAlle(v.qt, rr, v.hr).F : NaN;
  };
  const akseKat = (a) => {
    if (isNaN(a)) return null;
    const x = akse(a);
    return x >= -30 && x <= 90 ? "normal" : x < -30 && x >= -90 ? (x <= -45 ? "venstre45" : "venstre") : x > 90 && x <= 180 ? "hoejre" : "ekstrem";
  };
  const has = (v, k) => v[k] !== undefined && !isNaN(v[k]);
  const diff = (a, b, enhed, d = 0) => `${b - a > 0 ? "+" : b - a < 0 ? "−" : "±"}${fmt(Math.abs(b - a), d)}${enhed.startsWith("/") ? "" : " "}${enhed}`;

  // Nye udsagn: niveau, kort tekst og plan. Niveauet er mindst udsagnets eget niveau.
  const NYT = (k) => ({
    af: ["warn", "ny atrieflimren siden sidst", "Ny atrieflimren: CHA₂DS₂-VA og antikoagulation (se LINK_AF), frekvenskontrol, TSH og ekkokardiografi."],
    aflagren: ["warn", "ny atrieflagren siden sidst", "Ny atrieflagren: antikoagulation efter samme regler som atrieflimren (se LINK_AF); henvis til kardiolog."],
    lbbb: [k.brystsmerter ? "danger" : "warn", "nyt venstresidigt grenblok", k.brystsmerter ? "Nyt venstresidigt grenblok og brystsmerter: akut (112/akut kardiologisk vurdering)." : "Nyt venstresidigt grenblok: ekkokardiografi og kardiologisk vurdering."],
    rbbb: [k.brystsmerter ? "danger" : "info", "nyt højresidigt grenblok", k.brystsmerter ? "Nyt højresidigt grenblok og brystsmerter: akut (ESC 2023: håndteres som STEMI ved iskæmiske symptomer)." : "Nyt højresidigt grenblok: ved åndenød eller brystsmerter tænk lungeemboli/iskæmi."],
    bifasc: ["warn", "nyt bifascikulært blok", "Nyt bifascikulært blok: kardiologisk vurdering (akut ved synkope)."],
    lpfb: ["warn", "nyt venstre posterior fascikelblok", null],
    avblok1: ["info", "nyt AV-blok grad I", null],
    wenckebach: ["warn", "nyt AV-blok grad II type 1", null],
    avblok2: ["danger", "nyt AV-blok grad II", null],
    avblok21: ["danger", "nyt AV-blok grad II (2:1)", null],
    avblok3: ["danger", "nyt AV-blok grad III", null],
    pause: ["warn", "nye sinuspauser", null],
    vt: ["danger", "ny ventrikeltakykardi", null],
    bredtaky: ["danger", "ny bred-kompleks-rytme", null],
    svt: ["warn", "ny supraventrikulær takykardi", null],
    akutmi: ["danger", "nyt akut infarkt/akut skade", null],
    gammelMI: ["warn", "nyt infarktmønster (Q-takker) siden sidst", "Nyt infarktmønster: tyder på gennemgået infarkt — ekkokardiografi og kardiologisk vurdering."],
    iskaemi: [k.brystsmerter ? "danger" : "warn", "ny ST-depression/mulig iskæmi", "Ny ST-depression: med brystsmerter akut; ellers udredning for iskæmisk hjertesygdom."],
    stt: [k.brystsmerter ? "danger" : "warn", "nye ST-T-forandringer", k.brystsmerter ? "Nye ST-T-forandringer og brystsmerter: mistanke om akut koronarsyndrom — akut vurdering." : "Nye ST-T-forandringer: vurder for iskæmi, medicin og elektrolytter."],
    stelev: [k.brystsmerter ? "danger" : "warn", "ny ST-elevation", "Ny ST-elevation: vurder kurven og patienten samme dag; med brystsmerter → 112."],
    wpw: ["warn", "nyt præeksitationsmønster", null],
    brugada: ["warn", "nyt Brugada-mønster", null],
    lavvolt: ["warn", "ny lav voltage", "Ny lav voltage: ekkokardiografi (perikardieeksudat?), TSH."],
    lvh: ["info", "nyt hypertrofikriterium", null],
    pace: ["info", "ny pacemakerrytme", null],
  });

  function sammenlign(nu, k) {
    const t = laesTidligere();
    if (!t) return null;
    const foer = t.v;
    const res = { rk: [], nye: [], vaek: [], ukendte: [], fund: [], plan: [], noter: [], dato: t.dato, advarsel: null, kort: [], patient: "" };
    if (!t.tal && !foer.maskine) {
      res.advarsel = "Der blev ikke fundet EKG-værdier i den tidligere udskrift — tjek, at hele teksten er kopieret med.";
      return res;
    }
    const nuTekst = document.getElementById("udfyldTekst") ? document.getElementById("udfyldTekst").value : "";
    const cprNu = findCpr(nuTekst);
    const cprFoer = findCpr(t.tekst);
    if (cprNu && cprFoer && cprNu !== cprFoer) {
      res.advarsel = "Udskrifterne ser ud til at være fra to forskellige patienter (CPR-numrene er forskellige). Sammenligningen vises ikke.";
      res.fund.push({ niveau: "warn", tekst: "det tidligere EKG er fra en anden patient — tjek udskrifterne" });
      return res;
    }
    res.patient = cprNu && cprFoer ? "Samme CPR-nummer i begge udskrifter ✓" : "Det kunne ikke kontrolleres, at udskrifterne er fra samme patient (CPR-nummer mangler i mindst den ene) — bekræft det selv.";
    const datoNu = findDato(nuTekst);
    if (t.dato && datoNu && t.dato > datoNu && !samme(t.dato, datoNu)) res.noter.push(`Det "tidligere" EKG (${datoTekst(t.dato)}) er nyere end det aktuelle (${datoTekst(datoNu)}) — er de byttet om?`);
    if (t.dato && t.dato > new Date()) {
      res.noter.push("Datoen for det tidligere EKG ligger i fremtiden — tjek datoen.");
      res.dato = null;
    }

    const pacet = nu.udsagn.has("pace") || foer.udsagn.has("pace");
    const flimmer = (v) => v.udsagn.has("af") || v.udsagn.has("aflagren");
    const daekket = new Set();
    const add = (r) => {
      res.rk.push(r);
      if (r.niveau !== "ok" && r.kort) res.fund.push({ niveau: r.niveau, tekst: r.kort });
      if (r.plan) res.plan.push({ n: r.niveau, t: r.plan });
      if (r.kort) res.kort.push(r.kort);
    };
    if (pacet) res.noter.push("Pacemakerrytme i mindst det ene EKG: PR, QRS, akse og QTc sammenlignes ikke.");

    if (has(foer, "hr") && has(nu, "hr")) {
      const r = { navn: "Frekvens", foer: `${fmt(foer.hr)}/min`, nu: `${fmt(nu.hr)}/min`, aendring: diff(foer.hr, nu.hr, "/min"), niveau: "ok", tekst: "Ingen væsentlig ændring." };
      if (foer.hr >= 50 && nu.hr < 50 && foer.hr - nu.hr >= 10) Object.assign(r, { niveau: k.atlet ? "ok" : "info", tekst: "Ny bradykardi — fx ny AV-knude-hæmmende medicin.", kort: `ny bradykardi (${fmt(foer.hr)} → ${fmt(nu.hr)}/min)`, plan: k.atlet ? null : "Ny bradykardi: gennemgå nyopstartet betablokker, verapamil/diltiazem, digoxin og ivabradin; TSH." });
      else if (Math.abs(nu.hr - foer.hr) >= 30) Object.assign(r, { niveau: "info", tekst: "Stor ændring i frekvens.", kort: `frekvens ${fmt(foer.hr)} → ${fmt(nu.hr)}/min` });
      add(r);
    }

    if (!pacet && has(foer, "pr") && has(nu, "pr") && !flimmer(nu) && !flimmer(foer)) {
      const d = nu.pr - foer.pr;
      const r = { navn: "PR", foer: `${fmt(foer.pr)} ms`, nu: `${fmt(nu.pr)} ms`, aendring: diff(foer.pr, nu.pr, "ms"), niveau: "ok", tekst: "Uændret AV-overledning." };
      if (foer.pr < 300 && nu.pr >= 300 && d >= 20) Object.assign(r, { niveau: "warn", tekst: "PR er nu ≥ 300 ms.", kort: `PR forlænget til ${fmt(nu.pr)} ms (fra ${fmt(foer.pr)})`, plan: "PR steget til ≥ 300 ms: medicingennemgang; ved symptomer kardiolog (Holter)." });
      else if (foer.pr <= 200 && nu.pr > 200 && d >= 20) Object.assign(r, { niveau: k.atlet ? "ok" : "info", tekst: "Nyt AV-blok grad I siden sidst.", kort: `nyt AV-blok grad I (PR ${fmt(foer.pr)} → ${fmt(nu.pr)} ms)`, plan: k.atlet ? null : "Nyt AV-blok grad I: gennemgå nyopstartet AV-knude-hæmmende medicin (betablokker, verapamil/diltiazem, digoxin) og kalium." });
      else if (foer.pr <= 200 && nu.pr > 200) r.tekst = "PR lige over 200 ms — ændringen er så lille, at den kan være måleusikkerhed.";
      else if (foer.pr >= 120 && nu.pr < 120 && d <= -20) Object.assign(r, { niveau: "info", tekst: "Ny kort PR — se efter deltabølge (præeksitation) eller ektopisk atrierytme.", kort: `ny kort PR (${fmt(nu.pr)} ms)` });
      else if (d >= 40) Object.assign(r, { niveau: "info", tekst: "PR er forlænget ≥ 40 ms — fx medicin.", kort: `PR forlænget ${fmt(d)} ms` });
      else if (Math.abs(d) >= 20) r.tekst = "Mindre ændring.";
      if (r.kort && /AV-blok/.test(r.kort)) daekket.add("avblok1");
      add(r);
    }

    if (!pacet && has(foer, "qrs") && has(nu, "qrs")) {
      const d = nu.qrs - foer.qrs;
      const nytBlok = ["lbbb", "rbbb", "ivcd", "bifasc"].some((x) => nu.vist.has(x) && !foer.vist.has(x));
      const r = { navn: "QRS", foer: `${fmt(foer.qrs)} ms`, nu: `${fmt(nu.qrs)} ms`, aendring: diff(foer.qrs, nu.qrs, "ms"), niveau: "ok", tekst: "Uændret." };
      if (foer.qrs < 120 && nu.qrs >= 120 && (d >= 20 || nytBlok))
        Object.assign(r, { niveau: k.brystsmerter ? "danger" : "warn", tekst: "Ny bred QRS siden sidst (nyt grenblok eller ledningsforstyrrelse).", kort: `ny bred QRS (${fmt(foer.qrs)} → ${fmt(nu.qrs)} ms)`, plan: k.brystsmerter ? "Ny bred QRS og brystsmerter: akut vurdering (nyt grenblok kan ikke skelnes fra infarkt)." : "Ny bred QRS: kalium, medicingennemgang og ekkokardiografi/kardiologisk vurdering." });
      else if (foer.qrs < 120 && nu.qrs >= 120) r.tekst = "QRS lige over 120 ms — ændringen er så lille, at den kan være måleusikkerhed; se morfologien.";
      else if (nu.qrs >= foer.qrs * 1.25 && d >= 15)
        Object.assign(r, { niveau: "warn", tekst: "QRS er forlænget mere end 25 % — ved klasse I-antiarytmika (fx flecainid) reduceres dosis eller behandlingen stoppes (ESC); overvej også hyperkaliæmi og tricykliske antidepressiva.", kort: `QRS forlænget ${Math.round((d / foer.qrs) * 100)} %`, plan: "QRS forlænget > 25 %: kalium; gennemgå klasse I-antiarytmika og tricykliske antidepressiva." });
      else if (d >= 10) r.tekst = foer.qrs >= 120 ? "Lidt bredere (var allerede bred), under 25 % forlængelse." : "Lidt bredere, men under 120 ms og under 25 % forlængelse.";
      else if (d <= -10) r.tekst = "Smallere.";
      add(r);
    }

    // QTc — ved ændret QRS vurderes ændringen i JTc (QTc − QRS), så ny bred QRS ikke ligner QT-forlængelse.
    if (!pacet) {
      let qa = qtcF(foer);
      let qb = qtcF(nu);
      let qNavn = "Fridericia";
      if (isNaN(qa) || isNaN(qb)) {
        qa = has(foer, "qtc") ? foer.qtc : NaN;
        qb = has(nu, "qtc") ? nu.qtc : NaN;
        qNavn = foer.qtcFormel && foer.qtcFormel === nu.qtcFormel ? FORMEL[foer.qtcFormel] : "";
        if (!isNaN(qa) && !isNaN(qb) && !qNavn) {
          res.noter.push("QTc kan ikke sammenlignes sikkert: apparatets formel er ukendt eller forskellig, og QT/RR mangler i den ene udskrift.");
          qa = NaN;
        }
      }
      if (!isNaN(qa) && !isNaN(qb)) {
        const qrsSkift = has(foer, "qrs") && has(nu, "qrs") && Math.abs(nu.qrs - foer.qrs) >= 20;
        const dQ = qb - qa;
        const d = qrsSkift ? dQ - (nu.qrs - foer.qrs) : dQ;
        const navn = qrsSkift ? "JTc" : "QTc";
        const r = { navn: `QTc (${qNavn})`, foer: `${fmt(qa)} ms`, nu: `${fmt(qb)} ms`, aendring: diff(qa, qb, "ms"), niveau: "ok", tekst: "Ingen væsentlig ændring." };
        if (d > 60) Object.assign(r, { niveau: qb >= 500 ? "danger" : "warn", tekst: `Stigning > 60 ms${qrsSkift ? " i JTc (korrigeret for ændret QRS)" : ""}: øget risiko for torsades de pointes (Drew 2010; ICH E14).`, kort: `${navn} steget ${fmt(d)} ms (QTc ${fmt(qa)} → ${fmt(qb)} ms)`, plan: "QTc steget > 60 ms: find årsagen (nyt QT-forlængende lægemiddel, hypokaliæmi, hypomagnesiæmi), overvej at stoppe/skifte lægemidlet og gentag EKG." });
        else if (d > 30) Object.assign(r, { niveau: "info", tekst: `Stigning 30–60 ms${qrsSkift ? " i JTc" : ""} — kan være betydningsfuld ved QT-forlængende medicin (ICH E14).`, kort: `${navn} steget ${fmt(d)} ms`, plan: k.qtmed ? "QTc steget 30–60 ms på QT-forlængende medicin: kalium og magnesium, overvej dosis og kontrol-EKG." : null });
        else if (d < -30) Object.assign(r, { niveau: "info", tekst: `${navn} er faldet ${fmt(-d)} ms.`, kort: qa >= 450 ? `QTc faldet ${fmt(qa - qb)} ms (${fmt(qa)} → ${fmt(qb)} ms)` : null });
        if (qrsSkift) r.tekst += ` QRS har ændret sig ${diff(foer.qrs, nu.qrs, "ms")}, så QTc-ændringen er korrigeret: JTc ${diff(0, d, "ms")}.`;
        if (flimmer(nu) || flimmer(foer) || (has(foer, "hr") && has(nu, "hr") && Math.abs(nu.hr - foer.hr) > 20)) r.tekst += " Usikker sammenligning: uregelmæssig rytme eller stor frekvensforskel.";
        add(r);
      }
    }

    const ka = akseKat(foer.qrsaxe);
    const kb = akseKat(nu.qrsaxe);
    if (!pacet && ka && kb) {
      let dd = akse(nu.qrsaxe) - akse(foer.qrsaxe);
      if (dd > 180) dd -= 360;
      if (dd < -180) dd += 360;
      const d = Math.abs(dd);
      const x = akse(nu.qrsaxe);
      const r = { navn: "QRS-akse", foer: `${fmt(akse(foer.qrsaxe))}°`, nu: `${fmt(x)}°`, aendring: `${dd > 0 ? "+" : dd < 0 ? "−" : "±"}${fmt(d)}°`, niveau: "ok", tekst: "Uændret." };
      if (ka !== "hoejre" && kb === "hoejre" && (d >= 30 || x > 100)) Object.assign(r, { niveau: "warn", tekst: "Ny højre akse — ved åndenød: tænk lungeemboli eller højre ventrikelbelastning.", kort: "ny højre akse", plan: "Ny højre akse: vurder klinisk for lungeemboli/højre belastning (åndenød, takykardi, saturation)." });
      else if (ka !== "venstre45" && ka !== "ekstrem" && kb === "venstre45" && d >= 30) Object.assign(r, { niveau: "info", tekst: "Ny venstre akse ≤ −45° — nyt venstre anterior fascikelblok?", kort: "ny venstre akse (fascikelblok?)" });
      else if (kb === "ekstrem" && ka !== "ekstrem") Object.assign(r, { niveau: "warn", tekst: "Ny ekstrem akse — forbyttede elektroder? Tag nyt EKG.", kort: "ny ekstrem akse" });
      else if (d >= 45) Object.assign(r, { niveau: "info", tekst: "Aksen har flyttet sig ≥ 45° — elektrodeplacering eller ny ledningsforstyrrelse?", kort: `aksen flyttet ${fmt(d)}°` });
      else if (ka !== kb) r.tekst = "Over en aksegrænse, men ændringen er lille (måleusikkerhed?).";
      add(r);
    }

    if (has(foer, "pdur") && has(nu, "pdur") && foer.pdur < 120 && nu.pdur >= 120 && nu.pdur - foer.pdur >= 10 && !flimmer(nu)) add({ navn: "P-varighed", foer: `${fmt(foer.pdur)} ms`, nu: `${fmt(nu.pdur)} ms`, aendring: diff(foer.pdur, nu.pdur, "ms"), niveau: "info", tekst: "Nyt interatrielt blok.", kort: "nyt interatrielt blok" });
    if (has(foer, "sokolow") && has(nu, "sokolow")) {
      const r = { navn: "Sokolow-Lyon", foer: `${fmt(foer.sokolow, 2)} mV`, nu: `${fmt(nu.sokolow, 2)} mV`, aendring: diff(foer.sokolow, nu.sokolow, "mV", 2), niveau: "ok", tekst: "Ingen væsentlig ændring." };
      if (foer.sokolow <= 3.5 && nu.sokolow > 3.5) {
        Object.assign(r, { niveau: "info", tekst: "Voltagekriteriet for hypertrofi er nu opfyldt.", kort: "nyt voltagekriterium for venstre ventrikelhypertrofi" });
        daekket.add("lvh");
      }
      add(r);
    }

    // Maskinens udsagn: nye, forsvundne og nye udsagn, som værktøjet ikke kender.
    if (nu.maskineLav && foer.maskine) {
      const nyt = NYT(k);
      [...nu.vist].filter((id) => !NEUTRALE.has(id) && !foer.udsagn.has(id)).forEach((id) => {
        const u = UDSAGN.find((x) => x.id === id);
        const [n0, kort, plan] = nyt[id] || ["info", `nyt: ${lille(u.navn)}`, null];
        const egen = u.niveau(k, nu);
        const niveau = RANG[egen] > RANG[n0] ? egen : n0;
        res.nye.push({ navn: u.navn, niveau });
        if (!daekket.has(id)) {
          res.fund.push({ niveau, tekst: kort });
          res.kort.push(kort);
        }
        if (plan) res.plan.push({ n: niveau, t: plan });
        if (id === "teknik") res.noter.push("Teknisk problem i det aktuelle EKG — sammenligningen er usikker.");
      });
      [...foer.vist].filter((id) => !NEUTRALE.has(id) && !nu.udsagn.has(id)).forEach((id) => {
        const u = UDSAGN.find((x) => x.id === id);
        res.vaek.push({ navn: u.navn, niveau: "info" });
        if (id === "af" || id === "aflagren") {
          res.kort.push(`${lille(u.navn)} ikke længere nævnt`);
          res.noter.push("Atrieflimren/-flagren er ikke længere nævnt. Paroksystisk atrieflimren ændrer ikke beslutningen om antikoagulation — den afgøres af CHA₂DS₂-VA (ESC 2024).");
        }
      });
      const foerUkendte = new Set(foer.ukendte);
      nu.ukendte.filter((x) => !foerUkendte.has(x)).forEach((x) => {
        res.ukendte.push(x);
        res.fund.push({ niveau: "warn", tekst: `nyt udsagn, værktøjet ikke kender: «${x}» — læs selv` });
        res.kort.push(`nyt ukendt udsagn «${x}»`);
      });
    } else if (nu.maskineLav || foer.maskine) res.noter.push("Maskinens tolkning mangler i den ene udskrift — kun måleværdierne er sammenlignet.");
    else res.noter.push("Maskinens tolkning mangler i begge udskrifter — kun måleværdierne er sammenlignet.");
    return res;
  }

  // ---------------------------------------------------------------- Visning
  let sidste = null;

  function update() {
    const k = {};
    form.querySelectorAll('input[name="klinik"]').forEach((c) => (k[c.value] = c.checked));
    const maskine = document.getElementById("maskine").value.trim();
    const { liste, ider, ukendte } = laesUdsagn(maskine);
    const v = {
      hr: num("hr"), pr: num("pr"), qrs: num("qrs"), qt: num("qt"), qtc: num("qtc"), rr: num("rr"), pp: num("pp"), pdur: num("pdur"),
      paxe: num("paxe"), qrsaxe: num("qrsaxe"), taxe: num("taxe"), sokolow: num("sokolow"), cornell: num("cornell"), alder: num("alder"),
      qtcFormel: document.getElementById("qtcFormel").value,
      koen: (form.querySelector('input[name="koen"]:checked') || { value: "ukendt" }).value,
      udsagn: ider,
      maskineLav: maskine.toLowerCase(),
      vist: new Set(liste.map((u) => u.id)),
      ukendte,
    };
    // Uregelmæssig rytme kun, når maskinen ikke samtidig siger sinusrytme.
    const flimmer = ider.has("af") || ider.has("aflagren");
    const modstrid = flimmer && (ider.has("sinus") || ider.has("sinusbrady") || ider.has("sinustaky"));
    v.uregelmaessig = flimmer && !modstrid;
    // De internationale atletkriterier gælder 12–35 år.
    const atletNote = k.atlet && !isNaN(v.alder) && v.alder >= 35;
    if (atletNote) k.atlet = false;
    alderWarning.textContent = !isNaN(v.alder) && v.alder < 18 ? "Referenceværdierne gælder voksne — børn har andre normalværdier." : "";

    const harTal = ["hr", "pr", "qrs", "qt", "qtc", "rr", "pdur", "paxe", "qrsaxe", "taxe", "sokolow", "cornell"].some((x) => !isNaN(v[x]));
    if (!harTal && !maskine) {
      sidste = null;
      output.innerHTML = document.getElementById("tidligereTekst").value.trim()
        ? `<p class="field-hint">Indsæt først det aktuelle EKG øverst — så sammenlignes det med det tidligere.</p>`
        : `<p class="field-hint">Indsæt teksten fra EKG-apparatet i feltet til venstre (kopiér fra den elektroniske journal eller EKG-programmet), eller skriv værdierne ind.</p>`;
      return;
    }

    const m = vurder(v, k);
    const q = qtVurdering(v, k);
    const udsagn = liste.map((u) => ({ u, niveau: u.niveau(k, v) }));
    const sml = sammenlign(v, k);

    // Samlet niveau og fund.
    const alleFund = [...m.fund];
    if (modstrid) alleFund.push({ niveau: "warn", tekst: "maskinen nævner både sinusrytme og atrieflimren/-flagren — se kurven" });
    if (ukendte.length) alleFund.push({ niveau: "warn", tekst: `${ukendte.length === 1 ? "et udsagn" : `${ukendte.length} udsagn`} fra maskinen genkendes ikke af værktøjet — læs dem selv` });
    if (q && q.kort && q.niveau !== "ok") alleFund.push({ niveau: q.niveau, tekst: q.kort });
    udsagn.forEach(({ u, niveau }) => {
      if (niveau === "ok" || ["sinusbrady", "sinustaky", "avblok1", "langqt", "kortqt", "abnorm", "graense", "vrespons"].includes(u.id)) return;
      alleFund.push({ niveau, tekst: lille(u.navn) });
    });
    if (sml) sml.fund.forEach((f) => { if (!alleFund.some((x) => x.tekst === f.tekst)) alleFund.push(f); });
    const top = Math.max(0, ...alleFund.map((f) => RANG[f.niveau]), ...udsagn.map((x) => RANG[x.niveau]), q ? RANG[q.niveau] : 0);
    // Forslag til handling: de vigtigste først, uden dubletter.
    const planObj = [...udsagn.flatMap(({ u, niveau }) => (niveau === "ok" ? [] : (u.plan || []).map((t) => ({ n: niveau, t })))), ...m.plan, ...(q ? q.plan.map((t) => ({ n: q.niveau, t })) : []), ...(sml ? sml.plan : [])];
    planObj.sort((a, b) => RANG[b.n] - RANG[a.n]);
    const plan = [...new Set(planObj.map((x) => x.t))];

    let html = "";
    // 1. Sammenfatning
    const sorteret = alleFund.sort((a, b) => RANG[b.niveau] - RANG[a.niveau]);
    const titel = top === 3 ? "Kræver handling nu" : top === 2 ? "Afvigende fund — bør vurderes" : top === 1 ? "Fund uden umiddelbar betydning" : "Ingen afvigende måleværdier";
    if (atletNote) m.tjek.push("Atletkriterierne gælder 12–35 år — patienten er vurderet efter de almindelige referenceværdier.");
    const cls = top === 3 ? "box-red" : top === 2 ? "box-amber" : top === 1 ? "box-blue" : "box-green";
    html += box(cls, titel, (sorteret.length ? ul(sorteret.map((f) => `${TAG[f.niveau]} ${esc(f.tekst.charAt(0).toUpperCase() + f.tekst.slice(1))}`)) : "<p>Måleværdierne ligger inden for referenceområderne for voksne.</p>") + `<p class="field-hint">Vurderingen bygger kun på tallene og maskinens tekst — se altid selve kurven (rytme, ST-T, Q-takker, deltabølge).</p>`);

    // 1b. Sammenligning med tidligere EKG
    if (sml) {
      const hvornaar = sml.dato ? `EKG fra ${datoTekst(sml.dato)}` : "tidligere EKG";
      let body = "";
      if (sml.advarsel) body = `<p><strong>${esc(sml.advarsel)}</strong></p>`;
      else {
        if (sml.rk.length)
          body += `<div class="drug-table-wrap"><table class="drug-table ekg-sml stack-mobile"><thead><tr><th>Måling</th><th>Før</th><th>Nu</th><th>Ændring</th><th>Vurdering</th></tr></thead><tbody>${sml.rk
            .map((r) => `<tr class="niveau-${r.niveau}"><td data-label="Måling">${esc(r.navn)}</td><td data-label="Før">${esc(r.foer)}</td><td data-label="Nu"><strong>${esc(r.nu)}</strong></td><td data-label="Ændring">${esc(r.aendring)}</td><td data-label="Vurdering">${r.niveau === "ok" ? "" : TAG[r.niveau] + " "}${esc(r.tekst)}</td></tr>`)
            .join("")}</tbody></table></div>`;
        if (sml.nye.length) body += `<p><strong>Nyt i maskinens tolkning:</strong></p>${ul(sml.nye.map((x) => `${TAG[x.niveau]} ${esc(x.navn)}`))}`;
        if (sml.ukendte.length) body += `<p><strong>Nye udsagn, værktøjet ikke kender — læs selv:</strong></p>${ul(sml.ukendte.map((x) => `${TAG.warn} «${esc(x)}»`))}`;
        if (sml.vaek.length) body += `<p><strong>Ikke længere nævnt:</strong> ${esc(sml.vaek.map((x) => x.navn).join(", "))}.</p>`;
        if (!sml.fund.length) body += `<p>Ingen ændringer over værktøjets grænser i de sammenlignede værdier siden ${esc(hvornaar)} — se selv kurverne.</p>`;
        body += `<p class="field-hint">${esc(sml.patient)}</p>`;
      }
      if (sml.noter.length) body += ul(sml.noter.map(esc));
      const n = Math.max(0, ...sml.fund.map((f) => RANG[f.niveau]));
      html += box(n === 3 ? "box-red" : n === 2 ? "box-amber" : "", `Sammenligning med ${esc(hvornaar)}`, body);
    }

    // 2. Måleværdier
    if (m.rk.length) {
      html += box(
        "",
        "Måleværdier",
        `<div class="drug-table-wrap"><table class="drug-table ekg-tabel stack-mobile"><thead><tr><th>Måling</th><th>Værdi</th><th>Reference (voksne)</th><th>Vurdering</th></tr></thead><tbody>${m.rk
          .map((r) => `<tr class="niveau-${r.niveau}"><td data-label="Måling">${esc(r.navn)}</td><td data-label="Værdi"><strong>${esc(r.vaerdi)}</strong>${r.ekstra ? `<br><span class="field-hint">${esc(r.ekstra)}</span>` : ""}</td><td data-label="Reference">${esc(r.ref)}</td><td data-label="Vurdering">${TAG[r.niveau]} ${esc(r.tekst)}</td></tr>`)
          .join("")}</tbody></table></div>` + (m.tjek.length ? `<p><strong>Tjek tallene:</strong></p>${ul(m.tjek.map(esc))}` : "")
      );
    }

    // 3. QTc
    if (q) {
      const hoved = isNaN(q.primaer) ? "QTc kan ikke beregnes" : !isNaN(q.bogossian) ? `QTc-skøn ${fmt(q.bogossian)} ms ved bred QRS` : `QTc ${fmt(q.primaer)} ms`;
      const under = isNaN(q.primaer) ? "" : !isNaN(q.bogossian) ? `(Bogossian; uden korrektion for QRS ${fmt(q.primaer)} ms med Fridericia)` : `(${esc(q.primNavn)})`;
      let body = `<p>${TAG[q.niveau]} <strong>${hoved}</strong> ${under} — ${esc(q.tekst)}</p>`;
      if (q.alle) {
        const rows = [["F", "Fridericia — QT/∛RR", "anbefales; mere retvisende end Bazett ved høj og lav puls"], ["B", "Bazett — QT/√RR", "bruges af de fleste apparater; overkorrigerer ved puls > 80"], ["Fr", "Framingham — QT + 154 × (1 − RR)", "lineær"], ["H", "Hodges — QT + 1,75 × (frekvens − 60)", "lineær"]];
        body += `<div class="drug-table-wrap"><table class="drug-table ekg-qtc"><thead><tr><th>Formel</th><th>QTc</th><th>Bemærkning</th></tr></thead><tbody>${rows
          .map(([id, navn, bem]) => `<tr${id === "F" ? ' class="row-highlight"' : ""}><td>${navn}</td><td><strong>${fmt(q.alle[id])} ms</strong>${v.qtcFormel === id && !isNaN(v.qtc) ? `<br><span class="field-hint">apparatet: ${fmt(v.qtc)} ms</span>` : ""}</td><td>${bem}</td></tr>`)
          .join("")}${!isNaN(q.bogossian) ? `<tr><td>Bogossian + Fridericia — (QT − 50 % af QRS)/∛RR</td><td><strong>${fmt(q.bogossian)} ms</strong></td><td>skøn ved bred QRS</td></tr>` : ""}</tbody></table></div>`;
        body += `<p class="field-hint">QT ${fmt(v.qt)} ms, RR ${fmt(!isNaN(v.rr) ? v.rr : 60000 / v.hr)} ms${isNaN(v.rr) ? " (beregnet ud fra frekvensen)" : ""}. Grænser: forlænget ≥ 450 ms (mænd) / ≥ 460 ms (kvinder); ≥ 500 ms høj risiko; kort ≤ 360 ms.</p>`;
      } else if (!isNaN(v.qtc)) {
        body += `<p class="field-hint">Angiv QT og RR (eller frekvens) for at beregne QTc med flere formler.</p>`;
      }
      if (q.noter.length) body += ul(q.noter.map(esc));
      html += box(q.niveau === "danger" ? "box-red" : q.niveau === "warn" ? "box-amber" : "", "QT-interval", body);
    }

    // 4. Maskinens tolkning
    if (maskine) {
      const ub = document.getElementById("ubekraeftet").value === "1";
      let body = `<blockquote class="ekg-citat">${esc(maskine)}</blockquote>`;
      if (ub) body += `<p class="field-hint">Markeret "ubekræftet": tolkningen er ikke gennemgået af en læge.</p>`;
      body += udsagn.length
        ? ul(udsagn.map(({ u, niveau }) => `${TAG[niveau]} <strong>${esc(u.navn)}</strong> — ${esc(u.tekst)}`))
        : "<p>Værktøjet genkendte ingen af udsagnene — læs teksten selv.</p>";
      if (ukendte.length) body += `<p><strong>Ikke genkendt — læs selv:</strong></p>${ul(ukendte.map((x) => `${TAG.warn} «${esc(x)}»`))}`;
      body += `<p class="field-hint">Computerens tolkning er en hjælp, ikke en diagnose — fx er ca. 9 % af maskinens atrieflimren-/flagren-diagnoser forkerte (ca. 1/3 ved flagren, Lindow 2019). Værktøjet kender kun en del af maskinens udsagn.</p>`;
      html += box("", "Maskinens tolkning forklaret", body);
    }

    // 5. Forslag til handling
    if (plan.length) html += box(top === 3 ? "box-red" : top === 2 ? "box-amber" : "box-blue", "Forslag til handling", ul(plan.map((p) => esc(p).replace("LINK_AF", lenke("af.html", "Atrieflimren-værktøjet")))));

    // 6. Begrænsninger
    html += `<div class="box box-blue box-collapsible"><details open><summary><h3>Det kan værktøjet ikke</h3></summary>${ul([
      "Genkende alle maskinens udsagn — læs altid hele teksten.",
      "Se kurven: ST-elevation/-depression, T-inversion, Q-takker, deltabølge, Brugada-mønster, U-takker og rytmen skal vurderes på EKG'et.",
      "Sammenligne selve kurverne med et tidligere EKG — kun tal og maskinens udsagn sammenlignes (under \"Sammenlign med tidligere EKG\").",
      "Vurdere børn og unge under 18 år (andre normalværdier).",
      "Erstatte klinikken: symptomer, blodtryk, medicin og elektrolytter afgør hastegraden.",
    ])}</details></div>`;

    sidste = { v, k, m, q, udsagn, plan, sorteret, maskine, sml };
    html += box("", "Journalnotat", `<pre class="notat-tekst" id="journalTekst">${esc(journal())}</pre>`);
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------- Journalnotat
  function journal() {
    if (!sidste) return "";
    const { v, q, sorteret, maskine, plan, sml } = sidste;
    const idag = new Date().toLocaleDateString("da-DK");
    const tal = [];
    if (!isNaN(v.hr)) tal.push(`frekvens ${fmt(v.hr)}/min`);
    if (!isNaN(v.pr)) tal.push(`PR ${fmt(v.pr)} ms`);
    if (!isNaN(v.qrs)) tal.push(`QRS ${fmt(v.qrs)} ms`);
    if (!isNaN(v.qt)) tal.push(`QT ${fmt(v.qt)} ms`);
    if (q && !isNaN(q.primaer)) tal.push(`QTc ${fmt(q.primaer)} ms (${q.primNavn}${q.alle && !isNaN(v.qtc) && v.qtcFormel ? `; apparatet ${fmt(v.qtc)} ms ${FORMEL[v.qtcFormel]}` : ""}${!isNaN(q.bogossian) ? `; skøn ved bred QRS ${fmt(q.bogossian)} ms` : ""})`);
    if (!isNaN(v.paxe) || !isNaN(v.qrsaxe) || !isNaN(v.taxe)) tal.push(`akser P/QRS/T ${[v.paxe, v.qrsaxe, v.taxe].map((a) => (isNaN(a) ? "–" : fmt(akse(a)))).join("/")}°`);
    if (!isNaN(v.pdur)) tal.push(`P ${fmt(v.pdur)} ms`);
    if (!isNaN(v.sokolow)) tal.push(`Sokolow-Lyon ${fmt(v.sokolow, 2)} mV`);
    if (!isNaN(v.cornell)) tal.push(`Cornell ${fmt(v.cornell, 2)} mV`);
    const linjer = [`EKG vurderet ${idag}: ${tal.join(", ")}.`];
    if (maskine) linjer.push(`Maskinens tolkning${document.getElementById("ubekraeftet").value === "1" ? " (ubekræftet)" : ""}: ${maskine.replace(/\s+/g, " ")}`);
    linjer.push(`Fund: ${sorteret.length ? sorteret.map((f) => f.tekst).join("; ") : "måleværdier inden for referenceområderne"}.`);
    if (sml && !sml.advarsel) linjer.push(`Sammenlignet med ${sml.dato ? `EKG fra ${datoTekst(sml.dato)}` : "tidligere EKG"}: ${sml.kort.length ? sml.kort.join("; ") : "ingen ændringer over værktøjets grænser i de sammenlignede værdier"}.${sml.patient.endsWith("✓") ? "" : " Samme patient ikke kontrolleret automatisk."}`);
    linjer.push("Kurven: [udfyld efter eget eftersyn — rytme, ST-T, sammenligning med tidligere EKG].");
    if (plan.length) linjer.push(`Plan: ${plan.slice(0, 3).map((p) => p.replace("se LINK_AF", "se Atrieflimren-værktøjet").replace("LINK_AF", "Atrieflimren-værktøjet")).join(" ")}`);
    return linjer.join("\n");
  }

  function copyText(text) {
    const done = () => {
      copyStatus.textContent = "Kopieret ✓";
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    };
    const fail = () => (copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.");
    try {
      navigator.clipboard.writeText(text).then(done, fail);
    } catch (e) {
      fail();
    }
  }
  copyBtn.addEventListener("click", () => copyText(journal()));
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  const tidligereNote = document.getElementById("tidligereNote");
  resetBtn.addEventListener("click", (e) => {
    // "Udfyld felterne" nulstiller først formularen (ny patient) — også det tidligere EKG. Sig det.
    const ryddet = !e.isTrusted && document.getElementById("tidligereTekst").value.trim() !== "";
    form.reset();
    document.getElementById("ubekraeftet").value = "";
    tidligereNote.textContent = ryddet ? "Det tidligere EKG blev ryddet, fordi et EKG blev indsat øverst (ny patient). Indsæt det igen, hvis det er samme patient." : "";
    if (ryddet) document.getElementById("tidligereBoks").open = true;
    update();
  });
  document.getElementById("tidligereTekst").addEventListener("input", () => (tidligereNote.textContent = ""));
  if (printBtn)
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede værdier.";
      window.print();
    });

  // ---------------------------------------------------------------- Indsæt EKG-tekst
  // Tal med dansk eller engelsk decimaltegn. Sekunder (0,266 s) omregnes til ms.
  const TAL = "(-?\\d+(?:[.,]\\d+)?)";
  const tal = (s) => parseFloat(s.replace(",", "."));
  const ms = (x) => (x < 3 ? Math.round(x * 1000) : x);
  function udtraek(L) {
    const t = L.tekst.replace(/[−–]/g, "-");
    const ud = [];
    const fundet = new Set();
    const saet = (id, label, v, m, min, max, note) => {
      if (fundet.has(id) || isNaN(v) || v < min || v > max) return;
      fundet.add(id);
      ud.push({ type: "num", id, v: Math.round(v * 100) / 100, label, kilde: L.kilde(m.index, m.index + m[0].length), note });
    };
    const find = (re) => re.exec(t);
    let m;
    // Frekvens: ventrikelfrekvens/hjertefrekvens først, så "frekvens/rate", til sidst puls (ikke atriefrekvens).
    // Ikke respirationsfrekvens ("Resp. frekvens 24") eller atriefrekvens. "SR 72" / "Sinusrytme 64/min"
    // kommer før puls, så en klinisk puls ikke tages som EKG-frekvens.
    const IKKE_HR = "(?<!atrial |atrie)(?<!resp[a-zæøå]*\\.?\\s*)(?<!respirations)";
    const MELLEM = "\\s*(?:[:=]|ca\\.?|på|omkring|af)?\\s*(?:ca\\.?\\s*)?";
    for (const navn of ["ventrikelfrekvens|ventrikulær frekvens|vent\\.? ?(?:rate|frekv\\.?|frekvens)|ventricular rate|hjertefrekvens|heart rate", `(?<![a-zæøå])${IKKE_HR}(?:frekvens|frekv\\.?|hf|hr|rate)`, "(?<![a-zæøå])(?:sr|sinusrytme|sinus rhythm|sinus rytme)\\s*(?:med\\s*)?(?:frekvens\\s*)?", "(?<![a-zæøå])puls(?:frekvens)?"]) {
      for (const mm of t.matchAll(new RegExp(`(?:${navn})${MELLEM}${TAL}\\s*(?:spm|slag\\/min|\\/min|bpm|min-1|min⁻¹)?`, "gi"))) {
        m = mm;
        saet("hr", "Frekvens", tal(m[1]), m, 20, 300);
        if (fundet.has("hr")) break;
      }
      if (fundet.has("hr")) break;
    }
    // PR/PQ
    if ((m = find(new RegExp(`(?<![a-zæøå-])(?:pr|pq|p-r|p-q)(?![-\\/]?\\s*(?:t|qrs)\\b)(?:[- ]?(?:interval\\w*|tid\\w*|int\\.?))?${MELLEM}${TAL}\\s*(ms|s)?(?![\\d\\/])`, "i")))) saet("pr", "PR", ms(tal(m[1])), m, 60, 600);
    // QRS-varighed
    if ((m = find(new RegExp(`qrs(?:[- ]?(?:varighed|varigh\\.?|duration|bredde|dur\\.?|d|tid|interval|int\\.?))?${MELLEM}${TAL}(?!\\s*(?:°|grader|\\/|[.,]?\\d))\\s*(?:ms|s)?`, "i")))) saet("qrs", "QRS", ms(tal(m[1])), m, 40, 250);
    // QT / QTc (fx "QT / QTc(B) 418 / 427 ms", "QT/QTcB 418/427", "QT/QTc 418 ms / 427 ms", "QT/QTcB/QTcF 410/445/430 ms")
    const F = "(?:\\(?\\s*-?\\s*(bazett|baz|fridericia|fri|framingham|hodges|b|f|h|fr)(?![a-zæøå])\\s*\\)?)?";
    // "Korrigeret QT", "QT korr.", "QT-c" og "QTcorr" er QTc.
    const QTC = "(?:qtc(?!orr)|qt-c|qtcorr\\w*|korrigeret qt|qt[- ]?korr\\w*\\.?)";
    if ((m = find(new RegExp(`(?<![a-z])qt\\s*\\/\\s*${QTC}\\s*${F}\\s*\\/\\s*${QTC}\\s*${F}(?:[- ]?interval\\w*)?\\s*[:=]?\\s*${TAL}\\s*(?:ms)?\\s*\\/\\s*${TAL}\\s*(?:ms)?\\s*\\/\\s*${TAL}`, "i")))) {
      saet("qt", "QT", ms(tal(m[3])), m, 200, 700);
      saet("qtc", "QTc (apparatet)", ms(tal(m[4])), m, 250, 700);
      if (m[1]) formel(m[1], m);
    } else if ((m = find(new RegExp(`(?<![a-z])qt\\s*\\/\\s*${QTC}\\s*${F}(?:[- ]?interval\\w*)?\\s*[:=]?\\s*${TAL}\\s*(?:ms)?\\s*\\/\\s*${TAL}`, "i")))) {
      saet("qt", "QT", ms(tal(m[2])), m, 200, 700);
      saet("qtc", "QTc (apparatet)", ms(tal(m[3])), m, 250, 700);
      if (m[1]) formel(m[1], m);
    }
    // Enkeltstående QTc — aldrig fra en "QT/QTc"-linje, vi ikke kunne læse (så er det første tal QT).
    if (!fundet.has("qtc") && !new RegExp(`(?<![a-z])qt\\s*\\/\\s*${QTC}`, "i").test(t) && (m = find(new RegExp(`(?<![a-z])${QTC}\\s*${F}(?!\\s*\\/)(?:[- ]?(?:interval|tid)\\w*)?${MELLEM}${TAL}\\s*(?:ms|s)?`, "i")))) {
      saet("qtc", "QTc (apparatet)", ms(tal(m[2])), m, 250, 700);
      if (m[1]) formel(m[1], m);
    }
    if (!fundet.has("qt") && !new RegExp(`(?<![a-z])qt\\s*\\/\\s*${QTC}`, "i").test(t) && (m = find(new RegExp(`(?<![a-z])(?<!korrigeret )qt(?![a-z\\/]|\\s*\\/|-c|[- ]?korr)(?:[- ]?(?:interval|tid|int\\.?))?${MELLEM}${TAL}\\s*(?:ms|s)?`, "i")))) saet("qt", "QT", ms(tal(m[1])), m, 200, 700);
    function formel(f, mm) {
      const x = f.toLowerCase();
      const v = x === "b" || x === "bazett" || x === "baz" ? "B" : x === "f" || x === "fridericia" || x === "fri" ? "F" : x === "h" || x === "hodges" ? "H" : "Fr";
      ud.push({ type: "tekst", id: "qtcFormel", v, vis: FORMEL[v], label: "QTc-formel", kilde: L.kilde(mm.index, mm.index + mm[0].length) });
    }
    // Akser: "P-R-T akser 61 / 33 / 53 °", "P/QRS/T axis 61 33 53", "P-QRS-T akse: 61/33/53"
    if ((m = find(new RegExp(`(?<![a-z])p\\s*[-\\/]\\s*(?:qrs|r)\\s*[-\\/]\\s*t\\s*[- ]?(?:akser|akse|axes|axis|akserne)?\\s*[:=]?\\s*${TAL}\\s*[\\/ ,]\\s*${TAL}\\s*[\\/ ,]\\s*${TAL}`, "i")))) {
      saet("paxe", "P-akse", tal(m[1]), m, -180, 360);
      saet("qrsaxe", "QRS-akse", tal(m[2]), m, -180, 360);
      saet("taxe", "T-akse", tal(m[3]), m, -180, 360);
    } else if ((m = find(/-+\s*ax[ie]s\s*-+\s*p\s+(-?\d+)\s+qrs\s+(-?\d+)\s+t\s+(-?\d+)/i)) || (m = find(new RegExp(`(?:akser|akse|axes|axis)\\s*[:=]?\\s*p\\s*[:=]?\\s*${TAL}\\s*°?\\s*[,;/]?\\s*qrs\\s*[:=]?\\s*${TAL}\\s*°?\\s*[,;/]?\\s*t\\s*[:=]?\\s*${TAL}`, "i"))) || (m = find(new RegExp(`(?<![a-z])(?:akser|akse|axes|axis)\\s*[:=]?\\s*${TAL}\\s*°?\\s*\\/\\s*${TAL}\\s*°?\\s*\\/\\s*${TAL}`, "i")))) {
      // Tre akser i rækkefølgen P / QRS / T.
      saet("paxe", "P-akse", tal(m[1]), m, -180, 360);
      saet("qrsaxe", "QRS-akse", tal(m[2]), m, -180, 360);
      saet("taxe", "T-akse", tal(m[3]), m, -180, 360);
    } else {
      if ((m = find(new RegExp(`(?<![a-z])p[- ]?(?:akse|axis)\\s*[:=]?\\s*${TAL}`, "i")))) saet("paxe", "P-akse", tal(m[1]), m, -180, 360);
      if ((m = find(new RegExp(`(?:qrs[- ]?akse|qrs[- ]?axis|(?<![a-z-])(?<!(?:^|[^a-z])[pt][- ])akse|elektrisk akse)\\s*[:=]?\\s*${TAL}`, "i")))) saet("qrsaxe", "QRS-akse", tal(m[1]), m, -180, 360);
      if ((m = find(new RegExp(`(?<![a-z])t[- ]?(?:akse|axis)\\s*[:=]?\\s*${TAL}`, "i")))) saet("taxe", "T-akse", tal(m[1]), m, -180, 360);
    }
    // P-varighed
    if ((m = find(new RegExp(`(?<![a-z])p[- ]?(?:varighed|duration|bredde|dur\\.?)\\s*[:=]?\\s*${TAL}\\s*(?:ms|s)?`, "i")))) saet("pdur", "P-varighed", ms(tal(m[1])), m, 40, 250);
    // RR / PP
    if ((m = find(new RegExp(`(?<![a-z])rr\\s*\\/\\s*pp(?:[- ]?interval\\w*)?\\s*[:=]?\\s*${TAL}\\s*\\/\\s*${TAL}`, "i")))) {
      saet("rr", "RR", ms(tal(m[1])), m, 200, 3000);
      saet("pp", "PP", ms(tal(m[2])), m, 200, 3000);
    } else {
      if ((m = find(new RegExp(`(?<![a-z])rr(?:[- ]?interval\\w*)?\\s*[:=]?\\s*${TAL}\\s*(?:ms|s)?`, "i")))) saet("rr", "RR", ms(tal(m[1])), m, 200, 3000);
      if ((m = find(new RegExp(`(?<![a-z])pp(?:[- ]?interval\\w*)?\\s*[:=]?\\s*${TAL}\\s*(?:ms|s)?`, "i")))) saet("pp", "PP", ms(tal(m[1])), m, 200, 3000);
    }
    // Voltage (mV; mm omregnes)
    if ((m = find(new RegExp(`(?:sokolow(?:[- ]lyon)?(?:[- ]?(?:index|indeks|voltage|kriterium))?|sv1\\s*\\+\\s*rv[56](?:\\s*\\/\\s*v?6)?)\\s*[:=]?\\s*${TAL}\\s*(mv|mm)?`, "i")))) {
      const x = tal(m[1]);
      saet("sokolow", "Sokolow-Lyon", (m[2] || "").toLowerCase() === "mm" || x > 10 ? x / 10 : x, m, 0, 10);
    }
    if ((m = find(new RegExp(`(?:cornell(?![- ]?(?:produkt|product))(?:[- ]?(?:voltage|index|indeks|kriterium))?|ravl\\s*\\+\\s*sv3|sv3\\s*\\+\\s*ravl)\\s*[:=]?\\s*${TAL}\\s*(mv|mm)?`, "i")))) {
      const x = tal(m[1]);
      saet("cornell", "Cornell-voltage", (m[2] || "").toLowerCase() === "mm" || x > 10 ? x / 10 : x, m, 0, 10);
    }
    // Køn og alder (hvis udskriften har dem)
    // Ikke ledsagere ("ledsaget af sin mand") eller spørgsmål ("Kvinde? nej").
    for (const mm of t.matchAll(/(?:(?:sex|køn|gender)\s*[:=]?\s*(m|k|f|male|female|mand|kvinde)|(?<![a-zæøå])(mand|kvinde|male|female))(?![a-zæøå])(?!\s*\?)/gi)) {
      if (/(?:sin|sit|hendes|hans|min|egen|ledsaget af|ledsager|med|og)\s*$/i.test(t.slice(Math.max(0, mm.index - 18), mm.index))) continue;
      const x = (mm[1] || mm[2]).toLowerCase();
      const k = x === "mand" || x === "male" || x === "m" ? "mand" : "kvinde";
      ud.push({ type: "radio", name: "koen", value: k, label: "Køn", vis: k, kilde: L.kilde(mm.index, mm.index + mm[0].length) });
      break;
    }
    // Alder: "Alder 67", "67-årig", "Mand 67 år", "67 years old" — ikke løse "i 30 år".
    for (const re of [/(?:alder|age)\s*[:=]?\s*(\d{2,3})(?!\d)/i, /(?<![a-zæøå])(?:mand|kvinde|male|female)\s*,?\s*(\d{2,3})(?![\d.,]|\s*(?:kg|mg|ms|cm|%|\/))/i, /(?:køn|sex)\s*[:=]?\s*[mkf]\s*,\s*(\d{2,3})(?!\d)/i, /(?<![\d,.])(\d{2,3})\s*-?\s*årig/i, /(?:mand|kvinde|male|female|pt\.?|patient)[^.\n\d]{0,15}(\d{2,3})\s*(?:år|years|yrs)(?![a-zæøå])/i, /(?<![\d,.])(\d{2,3})\s*(?:år|years|yrs)\s*(?:gammel|old)/i, /(?<![\d,.])(\d{2,3})\s*(?:år|years|yrs)[^.\n\d]{0,12}(?:mand|kvinde|male|female)/i]) {
      if ((m = find(re))) {
        saet("alder", "Alder", +m[1], m, 18, 110);
        if (fundet.has("alder")) break;
      }
    }

    // Maskinens tolkning: teksten efter "Systemevaluering:"/"Tolkning:" til apparat- eller målelinjerne.
    const stop = /^\s*(?:ge |cardiosoft|marquette|muse|philips|schiller|mortara|welch|\d+\s*mm\/s|ubekræftet|bekræftet|unconfirmed|confirmed|side \d|page \d|tilstedevær|hjertefrekvens|ventrikelfrekvens|vent\.? ?rate|pr[- ]interval|qrs\w*\s*(?:varighed|duration|\d)|qt\w*\s*(?:\/|\d|interval)|p-r-t|rr\b|placering|location|henvist|referred|when compared|compared with|sammenlignet med|sammenligning med|i forhold til tidligere|cpr|navn|name|patient|pt\.?[- ]?id|id[- ]?nr|født|fødselsdato|dob)/i;
    // Linjer med CPR-nummer eller patientoplysninger kommer aldrig med i maskinens tolkning.
    const PERSON = /(?<!\d)\d{6}[- ]?\d{4}(?!\d)|^\s*(?:cpr|navn|name|patient|pt\.?[- ]?id|id[- ]?nr|født|fødselsdato|dob)\b/i;
    const linjer = t.split(/\r?\n/);
    let start = linjer.findIndex((l) => /(?:system-?evaluering|tolkning|fortolkning|interpretation|diagnose|konklusion|statement)\s*:?\s*$/i.test(l.trim()) || /^(?:system-?evaluering|tolkning|fortolkning|interpretation|konklusion)\s*:/i.test(l.trim()));
    let maskine = "";
    if (start >= 0) {
      const foerste = linjer[start].replace(/^.*?(?:system-?evaluering|tolkning|fortolkning|interpretation|diagnose|konklusion|statement)\s*:?/i, "").trim();
      const del = foerste ? [foerste] : [];
      for (let i = start + 1; i < linjer.length; i++) {
        const l = linjer[i].trim();
        if (!l) {
          if (del.length) break;
          continue;
        }
        if (stop.test(l) || PERSON.test(l)) break;
        // Ombrudt linje fortsætter med lille begyndelsesbogstav; stort bogstav = nyt udsagn.
        if (del.length && /^[A-ZÆØÅ]/.test(l) && !/[.,;:]$/.test(del[del.length - 1])) del[del.length - 1] += ".";
        del.push(l);
      }
      maskine = del.join(" ");
    } else {
      // Ingen overskrift: de linjer, der indeholder et kendt udsagn og ingen måleværdi.
      const MAALING = /^\s*(?:hjertefrekvens|ventrikelfrekvens|vent\.? ?rate|pr|pq|qrs\w*|qt\w*|p[- ]?(?:varighed|duration)|rr|pp|p-r-t|sokolow|cornell|akse|axis)\b/i;
      const SAMMENLIGN = /when compared|compared with|sammenlignet med|sammenligning med|i forhold til tidligere/i;
      const sl = linjer.findIndex((l) => SAMMENLIGN.test(l));
      // Lægens egne notater ("EKG: Sinusrytme, frekvens 72, PR 220 ms …"): kun de led, der er udsagn —
      // måleværdierne er allerede læst ind i felterne.
      // Rene måleled ("frekvens ca. 72", "PR-interval på 220 ms") fjernes; i et udsagn fjernes kun
      // måledelen ("Atrieflimren med frekvens 130" → "Atrieflimren").
      const MAAL = "(?<![a-zæøå])(?:frekvens|frekv\\.?|rate|pr|pq|qrs[a-zæøå-]*|qt[a-zæøå-]*|akse[a-zæøå]*|axis|rr|pp|sokolow(?:-lyon)?|cornell)(?![a-zæøå])";
      const MAALELED = new RegExp(`^\\s*${MAAL}[^.,;]*\\d[^.,;]*$`, "i");
      const MAALEDEL = new RegExp(`\\s*(?:\\(\\s*)?(?:med\\s+|og\\s+)?${MAAL}\\s*(?:[:=]|ca\\.?|på)?\\s*-?\\d[\\d.,]*\\s*(?:ms|s|mv|mm|°|\\/min|spm|bpm)?\\s*\\)?`, "gi");
      maskine = (sl >= 0 ? linjer.slice(0, sl) : linjer)
        .map((l) => l.replace(/^\s*(?:rate|vent\.? ?rate)\s*\d+\s*/i, ""))
        .filter((l) => !MAALING.test(l) && !PERSON.test(l))
        .flatMap((l) => l.replace(/^\s*ekg\s*(?:taget|i dag|nu)?\s*:\s*/i, "").split(/[.;,]\s+|\.\s*$/))
        .map((l) => l.trim())
        .filter((l) => l && !MAALELED.test(l))
        .map((l) => l.replace(MAALEDEL, "").trim())
        .filter((l) => l && UDSAGN.some((u) => u.m.test(l.toLowerCase())))
        .join(". ");
    }
    maskine = maskine.replace(/(?<!\d)\d{6}[- ]?\d{4}(?!\d)/g, "[CPR]").replace(/\s+/g, " ").trim();
    if (maskine) ud.push({ type: "tekst", id: "maskine", v: maskine, label: "Maskinens tolkning", vis: maskine.length > 80 ? maskine.slice(0, 77) + "…" : maskine });
    if (/ubekræftet|unconfirmed/i.test(t)) ud.push({ type: "hidden", id: "ubekraeftet", v: "1", label: "Ubekræftet" });
    if (!ud.some((f) => f.type === "num" || f.id === "maskine")) ud.push({ type: "note", tekst: "Ingen EKG-værdier fundet — tjek, at hele udskriften er kopieret med." });
    return ud;
  }

  if (window.Udfyld) {
    Udfyld.init(udtraek, {
      titel: "Indsæt EKG-udskrift (tekst)",
      hjaelp: "Kopiér teksten fra EKG-apparatet eller journalen (fx GE CardioSoft/MUSE: Systemevaluering, PR, QRS, QT/QTc, akser).",
      aaben: true,
      raekker: 8,
      eksempel: "Systemevaluering:\nSinusrytme med AV-blok grad I\nHjertefrekvens 63 spm\nPR interval 266 ms\nQRS varighed 112 ms\nQT / QTc(B) 418 / 427 ms\nP-R-T akser 61 / 33 / 53 °",
      vigtige: [["hr", "frekvens"], ["pr", "PR"], ["qrs", "QRS"], ["qt", "QT"], ["maskine", "maskinens tolkning"]],
    });
    // "Ryd" i indsæt-panelet rydder også det tidligere EKG.
    const ryd = document.getElementById("udfyldRyd");
    if (ryd)
      ryd.addEventListener("click", () => {
        document.getElementById("tidligereTekst").value = "";
        document.getElementById("tidligereDato").value = "";
        tidligereNote.textContent = "";
        update();
      });
  }
  update();
})();
