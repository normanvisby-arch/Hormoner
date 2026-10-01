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
  const UDSAGN = [
    { id: "akutmi", m: /akut\w* (?:mi|infarkt|myokardieinfarkt|skade|st-?elevations?-?infarkt)|acute (?:mi|infarct|myocardial)|stemi|\*+\s*akut/, navn: "Akut infarkt / akut skade",
      niveau: () => "danger", tekst: "Maskinen mistænker akut infarkt. Computeren både over- og underdiagnosticerer, men udsagnet skal vurderes med det samme.",
      plan: ["Vurder patienten nu: ved brystsmerter eller påvirket tilstand ring 112 / akut kardiologisk vurdering; sammenlign med tidligere EKG."] },
    { id: "stelev", m: /st-?elevation|st elevation/, navn: "ST-elevation", hvisIkke: ["akutmi"],
      niveau: (k) => (k.brystsmerter ? "danger" : "warn"), tekst: "ST-elevation kan være akut infarkt, perikarditis eller tidlig repolarisering (normalvariant hos unge). Kurven og klinikken afgør.",
      plan: ["ST-elevation: vurder kurven og patienten samme dag; med brystsmerter → 112/akut kardiologisk vurdering."] },
    { id: "vt", m: /ventrikel ?takykardi|ventrikulær takykardi|ventricular tachycardia|(?<![a-zæøå])vt(?![a-zæøå])/, navn: "Ventrikeltakykardi", niveau: () => "danger",
      tekst: "Bred-kompleks-takykardi skal behandles som ventrikeltakykardi, til det modsatte er bevist.", plan: ["Ventrikeltakykardi: akut (112), medmindre det er en kort, afsluttet salve hos en upåvirket patient — så samme-dags kardiologisk vurdering."] },
    { id: "avblok3", m: /av-?blok,? (?:grad|gr\.?) ?(?:iii|3)|komplet av-?blok|(?:tredje|3\.?) ?grads? av|complete (?:heart|av) block|third degree/, navn: "AV-blok grad III (komplet)", niveau: () => "danger",
      tekst: "Ingen ledning fra atrier til ventrikler; erstatningsrytmen kan svigte.", plan: ["AV-blok grad III: akut indlæggelse (pacemaker)."] },
    { id: "wenckebach", m: /wenckebach|mobitz (?:type )?(?:i|1)(?![iv0-9])/, navn: "AV-blok grad II type 1 (Wenckebach)",
      niveau: (k) => (k.synkope ? "danger" : k.atlet ? "info" : "warn"), tekst: "PR forlænges, til et slag falder ud. Kan være normalt hos unge, veltrænede og om natten (vagus).",
      plan: ["AV-blok grad II type 1: hos ældre, ved symptomer eller i vågen tilstand → kardiolog (Holter); ved synkope akut."] },
    { id: "avblok2", m: /mobitz (?:type )?(?:ii|2)(?![0-9])|av-?blok,? (?:grad|gr\.?) ?(?:ii|2)(?![i0-9])|(?:anden|2\.?) ?grads? av|2 ?: ?1[- ]?(?:av|ledning|overledning)|second degree/, navn: "AV-blok grad II", hvisIkke: ["wenckebach"],
      niveau: () => "danger", tekst: "Mobitz type 2 og 2:1-blok kan pludselig gå over i komplet blok.", plan: ["AV-blok grad II (Mobitz 2 eller 2:1): akut/samme-dags kardiologisk vurdering (pacemakerindikation)."] },
    { id: "avdiss", m: /av-?dissociation|a-?v dissociation/, navn: "AV-dissociation", niveau: () => "warn",
      tekst: "Atrier og ventrikler slår uafhængigt — ved komplet AV-blok, accelereret junktional eller ventrikulær rytme.", plan: ["AV-dissociation: se kurven; kardiologisk vurdering samme dag ved bradykardi eller symptomer."] },
    { id: "af", m: /atrieflimren|atrieflimmer|atrial fibrillation|a-?flimren/, navn: "Atrieflimren", niveau: (k, v) => (v.hr > 150 ? "danger" : "warn"),
      tekst: "Bekræft på kurven: uregelmæssigt uregelmæssig rytme uden P-takker. Computeren overdiagnosticerer atrieflimren i ca. 10 % (fx ved hyppige ekstrasystoler, sinusarytmi eller støj).",
      plan: ["Bekræftet atrieflimren: CHA₂DS₂-VA og antikoagulation (se " + "LINK_AF" + "), frekvenskontrol (hvilepuls < 110), TSH og ekkokardiografi; akut ved brystsmerter, hjertesvigt eller hæmodynamisk påvirkning."] },
    { id: "aflagren", m: /atrieflagren|atrial flutter/, navn: "Atrieflagren", niveau: (k, v) => (v.hr > 150 ? "danger" : "warn"),
      tekst: "Savtakket grundlinje; en frekvens omkring 150/min tyder på 2:1-overledning.", plan: ["Atrieflagren: samme antikoagulationsregler som atrieflimren (se " + "LINK_AF" + "); henvis til kardiolog (ablation er ofte førstevalg)."] },
    { id: "svt", m: /supraventrikulær takykardi|supraventricular tachycardia|(?<![a-zæøå])svt(?![a-zæøå])/, navn: "Supraventrikulær takykardi", niveau: (k, v) => (v.hr > 150 || k.synkope ? "danger" : "warn"),
      tekst: "Regelmæssig smalkomplekset takykardi (AVNRT, AVRT, atrietakykardi eller flagren).", plan: ["Supraventrikulær takykardi: vagusmanøvre; vedvarende anfald eller påvirket patient → akut; efter anfald henvises til kardiolog."] },
    { id: "lbbb", m: /(?<!inkomplet )(?:venstresidigt? grenblok|venstre grenblok|(?<![a-z])lbbb|(?<!incomplete )left bundle branch block)/, navn: "Venstresidigt grenblok",
      niveau: (k) => (k.brystsmerter || k.synkope ? "danger" : "warn"), tekst: "Næsten altid tegn på hjertesygdom (iskæmisk hjertesygdom, hypertension, kardiomyopati, aortastenose). ST-segmenterne kan ikke vurderes på vanlig vis.",
      plan: ["Venstresidigt grenblok: sammenlign med tidligere EKG; nyt grenblok → ekkokardiografi og kardiologisk vurdering; med brystsmerter → akut (kan ikke skelnes fra infarkt)."] },
    { id: "rbbb", m: /(?<!inkomplet )(?:højresidigt? grenblok|højre grenblok|(?<![a-z])rbbb|(?<!incomplete )right bundle branch block)/, navn: "Højresidigt grenblok",
      niveau: (k) => (k.synkope ? "warn" : "info"), tekst: "Ofte uden betydning hos raske. Nyopstået sammen med åndenød eller brystsmerter: tænk lungeemboli.",
      plan: ["Højresidigt grenblok: ingen udredning hos symptomfri; ny åndenød/brystsmerter → udeluk lungeemboli."] },
    { id: "inkHoejre", m: /inkomplet højre\w* grenblok|incomplete right bundle/, navn: "Inkomplet højresidigt grenblok", niveau: () => "ok",
      tekst: "Hyppig normalvariant, især hos unge og veltrænede." },
    { id: "inkVenstre", m: /inkomplet venstre\w* grenblok|incomplete left bundle/, navn: "Inkomplet venstresidigt grenblok", niveau: () => "info",
      tekst: "Ses ved venstre ventrikelhypertrofi og hjertesygdom — vurder blodtryk og evt. ekkokardiografi." },
    { id: "lafb", m: /venstre anterior\w* (?:hemiblok|fascikelblok|fascikulært blok)|left anterior (?:fascicular|hemi)|(?<![a-z])la[fh]b(?![a-z])/, navn: "Venstre anterior fascikelblok (hemiblok)",
      niveau: () => "info", tekst: "Venstre akse (−45° til −90°). Isoleret oftest uden behandlingsbehov." },
    { id: "lpfb", m: /venstre posterior\w* (?:hemiblok|fascikelblok|fascikulært blok)|left posterior (?:fascicular|hemi)|(?<![a-z])lp[fh]b(?![a-z])/, navn: "Venstre posterior fascikelblok",
      niveau: () => "warn", tekst: "Sjældent; højre akse skal først forklares af andet (højre ventrikelbelastning, lateralt infarkt, slank person).", plan: ["Venstre posterior fascikelblok: henvis til kardiologisk vurdering (ofte udbredt ledningssygdom)."] },
    { id: "bifasc", m: /bifascikul|bifascicular/, navn: "Bifascikulært blok", niveau: (k) => (k.synkope ? "danger" : "warn"),
      tekst: "Højresidigt grenblok + fascikelblok: risiko for progression til højgradigt AV-blok.", plan: ["Bifascikulært blok: ved synkope akut kardiologisk vurdering; uden symptomer kontrol og information om at reagere på svimmelhed/besvimelse."] },
    { id: "ivcd", m: /intraventrikulær\w* (?:ledningsforstyrrelse|ledningsforsinkelse|ledningsdefekt)|intraventricular conduction|(?<![a-z])ivcd(?![a-z])/, navn: "Intraventrikulær ledningsforstyrrelse",
      niveau: () => "info", tekst: "Bred QRS uden typisk grenblok-mønster; ses ved hjertesygdom, hyperkaliæmi og lægemidler (klasse I-antiarytmika, tricykliske antidepressiva)." },
    { id: "avblok1", m: /av-?blok,? (?:grad|gr\.?) ?(?:i|1)(?![iv0-9])|(?:første|1\.?) ?grads? av-?blok|first degree a-?v|1st degree a-?v/, navn: "AV-blok grad I",
      niveau: (k) => (k.atlet ? "ok" : "info"), tekst: "Forlænget PR (> 200 ms). Se vurderingen af PR ovenfor." },
    { id: "ves", m: /(?:præmature?|for tidlige?) ventrikulære? (?:komplekser|kontraktioner|slag|ekstrasystoler)|ventrikulære? ekstrasystol\w*|(?<![a-zæøå])ves(?![a-zæøå])|premature ventricular|(?<![a-z])pvcs?(?![a-z])/, navn: "Ventrikulære ekstrasystoler (VES)",
      niveau: (k) => (k.synkope ? "warn" : "info"), tekst: "Hyppige og oftest godartede hos hjerteraske. Et enkelt hvile-EKG siger ikke noget om byrden.",
      plan: ["VES: ved hjertebanken, mange VES på hvile-EKG, salver eller bigemini, kendt hjertesygdom, synkope eller pludselig død i familien → kalium, magnesium, TSH, Holter (24–48 t) og ekkokardiografi; VES-byrde > 10 % → kontrol af venstre ventrikels funktion (ESC 2022)."] },
    { id: "sves", m: /(?:præmature?|for tidlige?) (?:atriale|supraventrikulære?) (?:komplekser|kontraktioner|slag|ekstrasystoler)|supraventrikulære? ekstrasystol\w*|atriale? ekstrasystol\w*|(?<![a-zæøå])sves(?![a-zæøå])|premature (?:atrial|supraventricular)|(?<![a-z])pacs?(?![a-z])/, navn: "Supraventrikulære ekstrasystoler",
      niveau: () => "ok", tekst: "Almindelige og oftest uskyldige; mange kan varsle atrieflimren — vurder ved hjertebanken." },
    { id: "bigemini", m: /bigemini|trigemini/, navn: "Bigemini/trigemini", niveau: () => "warn",
      tekst: "Ekstrasystole efter hvert (andet) slag — pulsen kan måles falsk lav.", plan: ["Bigemini: elektrolytter (K, Mg), TSH, Holter og ekkokardiografi."] },
    { id: "lvh", m: /venstre ?ventrik\w* ?hypertrofi|(?<![a-z])lvh(?![a-z])|left ventricular hypertrophy/, navn: "Venstre ventrikelhypertrofi",
      niveau: (k, v) => (!isNaN(v.alder) && v.alder < 40) || k.atlet ? "info" : "warn", tekst: "Ved hypertension er hypertrofi på EKG organskade. Voltagekriterier er specifikke, men har lav sensitivitet; hos unge, slanke og veltrænede er isoleret høj voltage ofte normalt.",
      plan: ["Venstre ventrikelhypertrofi: mål blodtryk (evt. hjemme-/døgnblodtryk), overvej ekkokardiografi (også for aortastenose og kardiomyopati) og intensivér blodtryksbehandlingen ved hypertension (ESH 2023)."] },
    { id: "rvh", m: /højre ?ventrik\w* ?hypertrofi|(?<![a-z])rvh(?![a-z])|right ventricular hypertrophy/, navn: "Højre ventrikelhypertrofi", niveau: () => "warn",
      tekst: "Ses ved pulmonal hypertension, KOL, lungeemboli og medfødt hjertesygdom.", plan: ["Højre ventrikelhypertrofi: ekkokardiografi."] },
    { id: "vatrie", m: /venstre ?atrie\w* (?:forstørrelse|abnormitet|belastning|dilatation)|left atrial (?:enlargement|abnormality)|p[- ]mitrale/, navn: "Venstre atriepåvirkning", niveau: () => "info",
      tekst: "Bred eller dobbeltpuklet P — ses ved hypertension, mitralklapsygdom og hjertesvigt; disponerer for atrieflimren." },
    { id: "hatrie", m: /højre ?atrie\w* (?:forstørrelse|abnormitet|belastning|dilatation)|right atrial (?:enlargement|abnormality)|p[- ]pulmonale/, navn: "Højre atriepåvirkning", niveau: () => "info",
      tekst: "Høj P i II — ses ved lungesygdom og pulmonal hypertension." },
    { id: "lavvolt", m: /lav (?:qrs-?)?volt\w*|low (?:qrs )?voltage/, navn: "Lav voltage", niveau: () => "info",
      tekst: "Kan skyldes adipositas, KOL og elektrodeplacering, men også perikardieeksudat, hypothyreose og amyloidose.", plan: ["Lav voltage: ved åndenød, hjertesvigt eller nyopstået fund → ekkokardiografi (perikardieeksudat, amyloidose); overvej TSH."] },
    { id: "langqt", m: /lang qt|forlænget qt\w*|qt-?forlængelse|prolonged qt|long qt/, navn: "Forlænget QT", niveau: () => "warn", tekst: "Se QTc-vurderingen." },
    { id: "kortqt", m: /kort qt|short qt/, navn: "Kort QT", niveau: () => "info", tekst: "Se QTc-vurderingen." },
    { id: "gammelMI", m: /infarkt,? (?:alder ubestemt|af ukendt alder|gammelt)|gammelt? (?:\w+ )?infarkt|tidligere (?:\w+ )?infarkt|old (?:\w+ )?infarct|infarct,? age undetermined|age undetermined/, navn: "Mulig gammelt infarkt (Q-takker)",
      hvisIkke: ["akutmi"], niveau: () => "warn", tekst: "Ofte falsk positivt (elektrodeplacering, venstre ventrikelhypertrofi, grenblok, normal Q i III). \"Kan ikke udelukke\" betyder, at maskinen er usikker.",
      plan: ["Mulige Q-takker: sammenlign med tidligere EKG; nyt fund → ekkokardiografi/kardiologisk vurdering."] },
    { id: "iskaemi", m: /st-?depression|subendokardiel|iskæmi\w*|ischemi\w*|ischaemi\w*/, navn: "ST-depression / mulig iskæmi",
      niveau: (k) => (k.brystsmerter ? "danger" : "warn"), tekst: "ST-depression ses ved iskæmi, men også ved hypertrofi, digoxin, hypokaliæmi og takykardi.",
      plan: ["ST-depression: med aktuelle brystsmerter → akut; ellers sammenlign med tidligere EKG og overvej udredning for iskæmisk hjertesygdom."] },
    { id: "stt", m: /uspecifik\w* (?:st|t)[- ]?(?:og t[- ]?)?(?:forandring|abnormitet|ændring)\w*|uspecifikke st-?t|t-?tak\w* (?:inversion|abnorm\w*|forandring\w*|ændring\w*)|abnorme? t-?tak\w*|negative? t-?tak\w*|t[- ]wave (?:abnormalit|inversion)\w*|nonspecific (?:st|t)/, navn: "ST-T-forandringer",
      hvisIkke: ["iskaemi"], niveau: (k) => (k.brystsmerter ? "warn" : "info"), tekst: "Mange årsager: hypertrofi, grenblok, medicin, elektrolytter, iskæmi, normalvariant.",
      plan: ["ST-T-forandringer: sammenlign med tidligere EKG; nye forandringer med symptomer → vurder for iskæmi."] },
    { id: "tidlig", m: /tidlig repolarisering|early repolari[sz]ation/, navn: "Tidlig repolarisering", niveau: () => "ok", tekst: "Normalvariant, især hos unge mænd og veltrænede." },
    { id: "wpw", m: /præeksitation|pre-?excitation|(?<![a-z])wpw(?![a-z])|wolff/, navn: "Præeksitation (WPW-mønster)", niveau: (k) => (k.synkope || k.hjertebanken ? "danger" : "warn"),
      tekst: "Kort PR, deltabølge og bred QRS. Ved atrieflimren kan ledningen over den accessoriske bane blive livsfarlig.", plan: ["Præeksitation: henvis til kardiolog (risikovurdering, evt. ablation); ved hjertebanken eller synkope hurtigt."] },
    { id: "brugada", m: /brugada/, navn: "Brugada-mønster", niveau: (k) => (k.synkope ? "danger" : "warn"),
      tekst: "Coved ST-elevation i V1–V2. Feber og visse lægemidler kan fremkalde mønsteret.", plan: ["Brugada-mønster: henvis til kardiolog; ved synkope akut. Feber behandles aktivt."] },
    { id: "perikard", m: /perikardit|pericardit/, navn: "Mulig perikarditis", niveau: () => "warn", tekst: "Udbredt ST-elevation og PR-depression.", plan: ["Mulig perikarditis: klinisk vurdering samme dag (CRP, troponin, ekkokardiografi)."] },
    { id: "pace", m: /pacemaker|(?<![a-z])pacet|paced|elektronisk (?:pacet|stimuleret)/, navn: "Pacemakerrytme", niveau: () => "info",
      tekst: "Pacede komplekser: QRS, akse, ST-T og QTc kan ikke vurderes som vanligt." },
    { id: "teknik", m: /forbyttede|ombyttede|elektrode\w* (?:fejl|ombyt\w*|forbyt\w*)|lead reversal|arm lead|artefakt|artifact|støj|baseline/, navn: "Teknisk problem", niveau: () => "warn",
      tekst: "Elektrodefejl eller støj kan give falske fund (fx forkert akse, falsk atrieflimren).", plan: ["Teknisk problem: kontrollér elektrodeplacering og tag et nyt EKG."] },
    { id: "dextro", m: /dextrokardi|dextrocardi/, navn: "Dextrokardi?", niveau: () => "info", tekst: "Oftest forbyttede arm-elektroder — tag nyt EKG." },
    { id: "ektopisk", m: /ektopisk\w* atrie\w*|lav atrie\w*|ectopic atrial|low atrial/, navn: "Ektopisk atrierytme", niveau: () => "ok", tekst: "Rytmen udgår fra et andet sted i atriet end sinusknuden; som regel uden betydning." },
    { id: "junk", m: /junktional|junctional|nodal rytme|knuderytme/, navn: "Junktional rytme", niveau: (k) => (k.synkope ? "warn" : "info"), tekst: "Rytme fra AV-knuden; ses ved høj vagustonus og AV-knude-hæmmende medicin." },
    { id: "sinusbrady", m: /sinus ?bradykardi|sinus bradycardia/, navn: "Sinusbradykardi", niveau: (k) => (k.synkope ? "warn" : "ok"), tekst: "Se frekvensvurderingen." },
    { id: "sinustaky", m: /sinus ?takykardi|sinus tachycardia/, navn: "Sinustakykardi", niveau: () => "info", tekst: "Se frekvensvurderingen." },
    { id: "sinusarytmi", m: /sinus ?arytmi|sinus arrhythmia/, navn: "Sinusarytmi", niveau: () => "ok", tekst: "Respiratorisk variation — normalt." },
    { id: "sinus", m: /sinus ?rytme|sinus rhythm/, navn: "Sinusrytme", niveau: () => "ok", tekst: "Normal rytme fra sinusknuden." },
    { id: "abnorm", m: /abnormt? ekg|abnormal ecg|unormalt? ekg/, navn: "Maskinen: unormalt EKG", niveau: () => "info", tekst: "Samlet bedømmelse — se de enkelte fund." },
    { id: "graense", m: /grænse-?ekg|grænsetilfælde|borderline/, navn: "Maskinen: grænse-EKG", niveau: () => "info", tekst: "Samlet bedømmelse — se de enkelte fund." },
    { id: "normal", m: /(?:normalt?|normal) ekg|normal ecg|otherwise normal|i øvrigt normal\w*/, navn: "Maskinen: i øvrigt normalt", niveau: () => "ok", tekst: "Maskinen vurderer resten som normalt." },
  ];

  // ---------------------------------------------------------------- Vurdering af måleværdier
  function vurder(v, k) {
    const rk = []; // rækker til tabellen: { navn, vaerdi, ref, niveau, tekst }
    const plan = [];
    const fund = []; // korte vurderinger til notat og sammenfatning
    const uregelmaessig = v.udsagn.has("af") || v.udsagn.has("aflagren");
    const pacet = v.udsagn.has("pace");
    const add = (r) => {
      rk.push(r);
      if (r.niveau !== "ok" && r.kort) fund.push({ niveau: r.niveau, tekst: r.kort });
      if (r.plan) plan.push(...[].concat(r.plan));
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
      else {
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
      if (v.pdur >= 120) Object.assign(r, { niveau: "info", tekst: "Interatrielt blok (P ≥ 120 ms, Bayés de Luna 2012): forsinket ledning mellem atrierne. Disponerer for atrieflimren og apopleksi; ingen behandling i sig selv.", kort: `P-varighed ${fmt(v.pdur)} ms (interatrielt blok)`, plan: "Interatrielt blok: vær opmærksom på atrieflimren (pulspalpation, EKG ved hjertebanken); behandl risikofaktorer (blodtryk)." });
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
    if (!isNaN(v.sokolow) && !pacet) {
      const r = { navn: "Sokolow-Lyon (SV1 + RV5/V6)", vaerdi: `${fmt(v.sokolow, 2)} mV`, ref: "≤ 3,5 mV" };
      const lavSpec = (!isNaN(v.alder) && v.alder < 40) || k.atlet;
      if (v.sokolow > 3.5)
        Object.assign(r, { niveau: lavSpec ? "info" : "warn", tekst: lavSpec ? "Voltagekriterium for venstre ventrikelhypertrofi opfyldt — men lav specificitet hos unge (< 40 år), slanke og veltrænede (isoleret voltage er normalt hos atleter)." : "Voltagekriterium for venstre ventrikelhypertrofi opfyldt (ESH 2023). Ved hypertension = organskade.", kort: `Sokolow-Lyon ${fmt(v.sokolow, 2)} mV (> 3,5)`, plan: lavSpec ? null : "Venstre ventrikelhypertrofi på EKG: mål blodtryk (hjemme-/døgnblodtryk), overvej ekkokardiografi og intensivér blodtryksbehandlingen ved hypertension." });
      else Object.assign(r, { niveau: "ok", tekst: "Ikke opfyldt (lav sensitivitet — udelukker ikke hypertrofi)." });
      add(r);
    }
    if (!isNaN(v.cornell) && !pacet) {
      const graense = v.koen === "kvinde" ? 2.0 : 2.8;
      const r = { navn: "Cornell-voltage (RaVL + SV3)", vaerdi: `${fmt(v.cornell, 2)} mV`, ref: v.koen === "kvinde" ? "≤ 2,0 mV (kvinder)" : v.koen === "mand" ? "≤ 2,8 mV (mænd)" : "≤ 2,8 mV (mænd) / ≤ 2,0 mV (kvinder)" };
      const produkt = !isNaN(v.qrs) ? v.cornell * v.qrs : NaN;
      if (v.cornell > graense) Object.assign(r, { niveau: "warn", tekst: "Cornell-kriterium for venstre ventrikelhypertrofi opfyldt (ESH 2023).", kort: `Cornell ${fmt(v.cornell, 2)} mV`, plan: "Venstre ventrikelhypertrofi på EKG: mål blodtryk (hjemme-/døgnblodtryk), overvej ekkokardiografi og intensivér blodtryksbehandlingen ved hypertension." });
      else if (v.koen === "ukendt" && v.cornell > 2.0) Object.assign(r, { niveau: "info", tekst: "Opfyldt, hvis patienten er kvinde (> 2,0 mV) — angiv køn." });
      else Object.assign(r, { niveau: "ok", tekst: "Ikke opfyldt." });
      if (!isNaN(produkt)) r.ekstra = `Cornell-produkt ${fmt(produkt)} mV·ms (${produkt > 244 ? "> 244: hypertrofi" : "≤ 244"})`;
      if (!isNaN(produkt) && produkt > 244 && r.niveau === "ok") Object.assign(r, { niveau: "warn", tekst: "Cornell-produkt > 244 mV·ms: kriterium for venstre ventrikelhypertrofi opfyldt (ESH 2023).", kort: `Cornell-produkt ${fmt(produkt)} mV·ms` });
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
      plan.push("PP ≠ RR: se kurven for AV-blok grad II–III eller AV-dissociation; ved bradykardi eller symptomer samme-dags kardiologisk vurdering.");
    }
    return { rk, plan, fund, tjek };
  }

  function qtVurdering(v, k) {
    if (isNaN(v.qt) && isNaN(v.qtc)) return null;
    const rr = !isNaN(v.rr) ? v.rr : !isNaN(v.hr) ? 60000 / v.hr : NaN;
    const alle = !isNaN(v.qt) && !isNaN(rr) ? qtcAlle(v.qt, rr, v.hr) : null;
    const bred = !isNaN(v.qrs) && v.qrs >= 120;
    const uregelmaessig = v.udsagn.has("af") || v.udsagn.has("aflagren");
    const pacet = v.udsagn.has("pace");
    // Primær værdi: Fridericia (mere retvisende end Bazett ved høj og lav puls); ellers apparatets QTc.
    let primaer = alle ? alle.F : v.qtc;
    let primNavn = alle ? "Fridericia" : `apparatets QTc${v.qtcFormel ? ` (${FORMEL[v.qtcFormel]})` : ""}`;
    let bogossian = NaN;
    if (bred && !isNaN(v.qt) && !isNaN(rr)) bogossian = qtcAlle(v.qt - 0.5 * v.qrs, rr, v.hr).F;
    const graense = v.koen === "kvinde" ? 460 : v.koen === "mand" ? 450 : 460;
    const vurderTal = bred && !isNaN(bogossian) ? bogossian : primaer;
    const noter = [];
    const plan = [];
    let niveau = "ok";
    let kort = null;
    let tekst;

    if (vurderTal >= 500) {
      niveau = "danger";
      tekst = `QTc ≥ 500 ms: høj risiko for torsades de pointes.`;
      kort = `QTc ${fmt(primaer)} ms (≥ 500)`;
      plan.push("QTc ≥ 500 ms: seponér/pausér QT-forlængende lægemidler, mål kalium, magnesium og calcium i dag, gentag EKG; ved synkope eller hjertebanken akut. Henvis til kardiolog.");
    } else if (vurderTal >= 480) {
      niveau = "warn";
      tekst = "QTc ≥ 480 ms: ved gentagne målinger uden anden forklaring forenelig med lang-QT-syndrom (ESC 2022).";
      kort = `forlænget QTc ${fmt(primaer)} ms`;
      plan.push("QTc ≥ 480 ms: gentag EKG, gennemgå QT-forlængende medicin (crediblemeds.org) og elektrolytter (K, Mg, Ca); vedvarende uden forklaring → kardiolog (lang-QT-syndrom).");
    } else if (vurderTal >= graense || (v.koen === "ukendt" && vurderTal >= 450)) {
      const kunMand = v.koen === "ukendt" && vurderTal < 460;
      niveau = kunMand ? "info" : "warn";
      tekst = kunMand ? "QTc 450–459 ms: forlænget hos mænd, normalt hos kvinder — angiv køn." : `Forlænget QTc (≥ ${graense} ms hos ${v.koen === "kvinde" ? "kvinder" : "mænd"}, AHA 2009).`;
      kort = `forlænget QTc ${fmt(primaer)} ms`;
      if (!kunMand) plan.push("Forlænget QTc: gennemgå QT-forlængende medicin (crediblemeds.org), kalium og magnesium; undgå at lægge flere QT-forlængende lægemidler til; gentag EKG.");
    } else if (vurderTal <= 320) {
      niveau = "warn";
      tekst = "Meget kort QTc (≤ 320 ms): kort-QT-syndrom bør overvejes (ESC 2022). Udeluk hyperkalcæmi og digoxin.";
      kort = `meget kort QTc ${fmt(primaer)} ms`;
      plan.push("QTc ≤ 320 ms: calcium, kalium, digoxin? Henvis til kardiolog (kort-QT-syndrom).");
    } else if (vurderTal <= 360) {
      niveau = k.synkope ? "warn" : "info";
      tekst = k.synkope ? "Kort QTc (≤ 360 ms) og synkope: kort-QT-syndrom bør overvejes (ESC 2022)." : "Kort QTc (≤ 360 ms) — sjældent af betydning uden synkope, hjertestop eller pludselig død i familien. Udeluk hyperkalcæmi og digoxin.";
      kort = `kort QTc ${fmt(primaer)} ms`;
      if (k.synkope) plan.push("Kort QTc og synkope: henvis til kardiolog.");
    } else tekst = "Normal QTc.";

    if (!isNaN(vurderTal) && vurderTal >= 440 && vurderTal < graense && niveau === "ok") tekst = "Højnormal QTc — vær opmærksom ved QT-forlængende medicin.";
    if (k.qtmed && niveau !== "ok") plan.push("Patienten får QT-forlængende medicin: vurder dosisreduktion/alternativ og kontrol-EKG (stigning > 60 ms øger risikoen, AHA 2010).");
    if (k.qtmed && niveau === "ok") noter.push("Ved QT-forlængende medicin: tag kontrol-EKG efter opstart/dosisøgning — en stigning > 60 ms øger risikoen for torsades (AHA 2010).");

    if (alle) {
      const thr = graense;
      if (!isNaN(v.hr) && v.hr > 80 && alle.B >= thr && alle.F < thr) noter.push(`Bazett giver ${fmt(alle.B)} ms, men overkorrigerer ved puls > 80 — Fridericia (${fmt(alle.F)} ms) er mere retvisende.`);
      if (!isNaN(v.hr) && v.hr < 60 && alle.F >= thr && alle.B < thr) noter.push(`Bazett (${fmt(alle.B)} ms) underkorrigerer ved lav puls og skjuler forlængelsen — Fridericia er ${fmt(alle.F)} ms.`);
      if (!isNaN(v.qtc) && v.qtcFormel && alle[v.qtcFormel] && Math.abs(alle[v.qtcFormel] - v.qtc) > 15) noter.push(`Apparatets QTc (${fmt(v.qtc)} ms) afviger fra beregningen med ${FORMEL[v.qtcFormel]} (${fmt(alle[v.qtcFormel])} ms) — tjek QT og RR.`);
    }
    if (bred) noter.push(isNaN(bogossian) ? "Bred QRS forlænger QT uden at repolariseringen er forlænget — QTc overvurderer risikoen." : `Bred QRS forlænger QT uden at repolariseringen er forlænget. Skøn efter Bogossian (QT − 50 % af QRS, derefter Fridericia): ${fmt(bogossian)} ms — vurderingen bygger på dette usikre skøn.`);
    if (uregelmaessig) noter.push("Uregelmæssig rytme: QT varierer fra slag til slag — brug gennemsnittet af flere slag, og vær forsigtig med enkeltværdier.");
    if (pacet) noter.push("Pacet rytme: QTc kan ikke vurderes som vanligt.");
    if (!isNaN(v.hr) && (v.hr > 100 || v.hr < 50) && alle) noter.push("Ved puls over 100 eller under 50 er alle formler usikre — gentag gerne EKG ved puls 60–90.");

    return { alle, primaer, primNavn, bogossian, niveau: pacet ? "info" : niveau, tekst, kort, noter, plan, graense };
  }

  // ---------------------------------------------------------------- Udsagn fra maskinen
  function laesUdsagn(tekst) {
    const t = tekst.toLowerCase().replace(/\s+/g, " ").replace(/−/g, "-");
    const fundne = UDSAGN.filter((u) => u.m.test(t));
    const ider = new Set(fundne.map((u) => u.id));
    // Højresidigt grenblok + fascikelblok = bifascikulært blok.
    if (ider.has("rbbb") && (ider.has("lafb") || ider.has("lpfb")) && !ider.has("bifasc")) {
      fundne.push(UDSAGN.find((u) => u.id === "bifasc"));
      ider.add("bifasc");
    }
    return { liste: fundne.filter((u) => !(u.hvisIkke || []).some((x) => ider.has(x))), ider };
  }

  // ---------------------------------------------------------------- Visning
  let sidste = null;

  function update() {
    const k = {};
    form.querySelectorAll('input[name="klinik"]').forEach((c) => (k[c.value] = c.checked));
    const maskine = document.getElementById("maskine").value.trim();
    const { liste, ider } = laesUdsagn(maskine);
    const v = {
      hr: num("hr"), pr: num("pr"), qrs: num("qrs"), qt: num("qt"), qtc: num("qtc"), rr: num("rr"), pp: num("pp"), pdur: num("pdur"),
      paxe: num("paxe"), qrsaxe: num("qrsaxe"), taxe: num("taxe"), sokolow: num("sokolow"), cornell: num("cornell"), alder: num("alder"),
      qtcFormel: document.getElementById("qtcFormel").value,
      koen: (form.querySelector('input[name="koen"]:checked') || { value: "ukendt" }).value,
      udsagn: ider,
    };
    alderWarning.textContent = !isNaN(v.alder) && v.alder < 18 ? "Referenceværdierne gælder voksne — børn har andre normalværdier." : "";

    const harTal = ["hr", "pr", "qrs", "qt", "qtc", "rr", "pdur", "paxe", "qrsaxe", "taxe", "sokolow", "cornell"].some((x) => !isNaN(v[x]));
    if (!harTal && !maskine) {
      sidste = null;
      output.innerHTML = `<p class="field-hint">Indsæt teksten fra EKG-apparatet i feltet til venstre (kopiér fra den elektroniske journal eller EKG-programmet), eller skriv værdierne ind.</p>`;
      return;
    }

    const m = vurder(v, k);
    const q = qtVurdering(v, k);
    const udsagn = liste.map((u) => ({ u, niveau: u.niveau(k, v) }));

    // Samlet niveau og fund.
    const alleFund = [...m.fund];
    if (q && q.kort && q.niveau !== "ok") alleFund.push({ niveau: q.niveau, tekst: q.kort });
    udsagn.forEach(({ u, niveau }) => {
      if (niveau === "ok" || ["sinusbrady", "sinustaky", "avblok1", "langqt", "kortqt", "abnorm", "graense"].includes(u.id)) return;
      alleFund.push({ niveau, tekst: u.navn.charAt(0).toLowerCase() + u.navn.slice(1) });
    });
    const top = Math.max(0, ...alleFund.map((f) => RANG[f.niveau]), ...udsagn.map((x) => RANG[x.niveau]), q ? RANG[q.niveau] : 0);
    const plan = [...new Set([...udsagn.flatMap(({ u, niveau }) => (niveau === "ok" ? [] : u.plan || [])), ...m.plan, ...(q ? q.plan : [])])];

    let html = "";
    // 1. Sammenfatning
    const sorteret = alleFund.sort((a, b) => RANG[b.niveau] - RANG[a.niveau]);
    const titel = top === 3 ? "Kræver handling nu" : top === 2 ? "Afvigende fund — bør vurderes" : top === 1 ? "Fund uden umiddelbar betydning" : "Ingen afvigende måleværdier";
    const cls = top === 3 ? "box-red" : top === 2 ? "box-amber" : top === 1 ? "box-blue" : "box-green";
    html += box(cls, titel, (sorteret.length ? ul(sorteret.map((f) => `${TAG[f.niveau]} ${esc(f.tekst.charAt(0).toUpperCase() + f.tekst.slice(1))}`)) : "<p>Måleværdierne ligger inden for referenceområderne for voksne.</p>") + `<p class="field-hint">Vurderingen bygger kun på tallene og maskinens tekst — se altid selve kurven (rytme, ST-T, Q-takker, deltabølge).</p>`);

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
      let body = `<p>${TAG[q.niveau]} <strong>${isNaN(q.primaer) ? "QTc kan ikke beregnes" : `QTc ${fmt(q.primaer)} ms`}</strong> ${isNaN(q.primaer) ? "" : `(${esc(q.primNavn)})`} — ${esc(q.tekst)}</p>`;
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
      body += `<p class="field-hint">Computerens tolkning er en hjælp, ikke en diagnose — fx overdiagnosticeres atrieflimren i ca. 10 %.</p>`;
      html += box("", "Maskinens tolkning forklaret", body);
    }

    // 5. Forslag til handling
    if (plan.length) html += box(top === 3 ? "box-red" : "box-amber", "Forslag til handling", ul(plan.map((p) => esc(p).replace("LINK_AF", lenke("af.html", "Atrieflimren-værktøjet")))));

    // 6. Begrænsninger
    html += `<div class="box box-blue box-collapsible"><details><summary><h3>Det kan værktøjet ikke</h3></summary>${ul([
      "Se kurven: ST-elevation/-depression, T-inversion, Q-takker, deltabølge, Brugada-mønster, U-takker og rytmen skal vurderes på EKG'et.",
      "Sammenligne med tidligere EKG — et nyt fund vejer tungere end et kendt.",
      "Vurdere børn og unge under 18 år (andre normalværdier).",
      "Erstatte klinikken: symptomer, blodtryk, medicin og elektrolytter afgør hastegraden.",
    ])}</details></div>`;

    sidste = { v, k, m, q, udsagn, plan, sorteret, maskine };
    html += box("", "Journalnotat", `<pre class="notat-tekst" id="journalTekst">${esc(journal())}</pre>`);
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------- Journalnotat
  function journal() {
    if (!sidste) return "";
    const { v, q, sorteret, maskine, plan } = sidste;
    const idag = new Date().toLocaleDateString("da-DK");
    const tal = [];
    if (!isNaN(v.hr)) tal.push(`frekvens ${fmt(v.hr)}/min`);
    if (!isNaN(v.pr)) tal.push(`PR ${fmt(v.pr)} ms`);
    if (!isNaN(v.qrs)) tal.push(`QRS ${fmt(v.qrs)} ms`);
    if (!isNaN(v.qt)) tal.push(`QT ${fmt(v.qt)} ms`);
    if (q && !isNaN(q.primaer)) tal.push(`QTc ${fmt(q.primaer)} ms (${q.primNavn}${q.alle && !isNaN(v.qtc) && v.qtcFormel ? `; apparatet ${fmt(v.qtc)} ms ${FORMEL[v.qtcFormel]}` : ""})`);
    if (!isNaN(v.paxe) || !isNaN(v.qrsaxe) || !isNaN(v.taxe)) tal.push(`akser P/QRS/T ${[v.paxe, v.qrsaxe, v.taxe].map((a) => (isNaN(a) ? "–" : fmt(akse(a)))).join("/")}°`);
    if (!isNaN(v.pdur)) tal.push(`P ${fmt(v.pdur)} ms`);
    if (!isNaN(v.sokolow)) tal.push(`Sokolow-Lyon ${fmt(v.sokolow, 2)} mV`);
    if (!isNaN(v.cornell)) tal.push(`Cornell ${fmt(v.cornell, 2)} mV`);
    const linjer = [`EKG ${idag}: ${tal.join(", ")}.`];
    if (maskine) linjer.push(`Maskinens tolkning${document.getElementById("ubekraeftet").value === "1" ? " (ubekræftet)" : ""}: ${maskine.replace(/\s+/g, " ")}`);
    linjer.push(`Vurdering af måleværdier: ${sorteret.length ? sorteret.map((f) => f.tekst).join("; ") : "inden for referenceområderne"}.`);
    linjer.push("Kurven gennemset: [rytme, ST-T, sammenligning med tidligere EKG].");
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
  resetBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("ubekraeftet").value = "";
    update();
  });
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
    // Frekvens
    if ((m = find(new RegExp(`(?:hjertefrekvens|ventrikelfrekvens|ventrikulær frekvens|vent\\.? ?rate|heart rate|(?<![a-zæøå])(?:frekvens|puls|hf|hr|rate))\\s*[:=]?\\s*${TAL}\\s*(?:spm|slag\\/min|\\/min|bpm|min-1|min⁻¹)?`, "i")))) saet("hr", "Frekvens", tal(m[1]), m, 20, 300);
    // PR/PQ
    if ((m = find(new RegExp(`(?<![a-zæøå-])(?:pr|pq)(?![-\\/]?\\s*(?:t|qrs)\\b)(?:[- ]?(?:interval\\w*|tid\\w*|int\\.?))?\\s*[:=]?\\s*${TAL}\\s*(ms|s)?(?![\\d\\/])`, "i")))) saet("pr", "PR", ms(tal(m[1])), m, 60, 600);
    // QRS-varighed
    if ((m = find(new RegExp(`qrs\\s*(?:[- ]?(?:varighed|duration|bredde|dur\\.?|d)|(?=\\s*[:=]?\\s*\\d+(?:[.,]\\d+)?\\s*(?:ms|s)\\b))\\s*[:=]?\\s*${TAL}\\s*(?:ms|s)?`, "i")))) saet("qrs", "QRS", ms(tal(m[1])), m, 40, 250);
    // QT / QTc (fx "QT / QTc(B) 418 / 427 ms", "QT/QTcB 418/427", "QT/QTc 418/427 ms")
    if ((m = find(new RegExp(`(?<![a-z])qt\\s*\\/\\s*qtc\\s*(?:\\(?\\s*(bazett|fridericia|framingham|hodges|b|f|h|fr)\\s*\\)?)?\\s*[:=]?\\s*${TAL}\\s*\\/\\s*${TAL}`, "i")))) {
      saet("qt", "QT", ms(tal(m[2])), m, 200, 700);
      saet("qtc", "QTc (apparatet)", ms(tal(m[3])), m, 250, 700);
      if (m[1]) formel(m[1], m);
    }
    if (!fundet.has("qtc") && (m = find(new RegExp(`(?<![a-z])qtc\\s*(?:\\(?\\s*(bazett|fridericia|framingham|hodges|b|f|h|fr)\\s*\\)?)?(?:[- ]?(?:interval|tid))?\\s*[:=]?\\s*${TAL}\\s*(?:ms|s)?`, "i")))) {
      saet("qtc", "QTc (apparatet)", ms(tal(m[2])), m, 250, 700);
      if (m[1]) formel(m[1], m);
    }
    if (!fundet.has("qt") && (m = find(new RegExp(`(?<![a-z])qt(?![a-z\\/]|\\s*\\/)(?:[- ]?(?:interval|tid|int\\.?))?\\s*[:=]?\\s*${TAL}\\s*(?:ms|s)?`, "i")))) saet("qt", "QT", ms(tal(m[1])), m, 200, 700);
    function formel(f, mm) {
      const x = f.toLowerCase();
      const v = x === "b" || x === "bazett" ? "B" : x === "f" || x === "fridericia" ? "F" : x === "h" || x === "hodges" ? "H" : "Fr";
      ud.push({ type: "tekst", id: "qtcFormel", v, vis: FORMEL[v], label: "QTc-formel", kilde: L.kilde(mm.index, mm.index + mm[0].length) });
    }
    // Akser: "P-R-T akser 61 / 33 / 53 °", "P/QRS/T axis 61 33 53", "P-QRS-T akse: 61/33/53"
    if ((m = find(new RegExp(`(?<![a-z])p\\s*[-\\/]\\s*(?:qrs|r)\\s*[-\\/]\\s*t\\s*[- ]?(?:akser|akse|axes|axis|akserne)?\\s*[:=]?\\s*${TAL}\\s*[\\/ ]\\s*${TAL}\\s*[\\/ ]\\s*${TAL}`, "i")))) {
      saet("paxe", "P-akse", tal(m[1]), m, -180, 360);
      saet("qrsaxe", "QRS-akse", tal(m[2]), m, -180, 360);
      saet("taxe", "T-akse", tal(m[3]), m, -180, 360);
    } else if ((m = find(/-+\s*ax[ie]s\s*-+\s*p\s+(-?\d+)\s+qrs\s+(-?\d+)\s+t\s+(-?\d+)/i))) {
      saet("paxe", "P-akse", tal(m[1]), m, -180, 360);
      saet("qrsaxe", "QRS-akse", tal(m[2]), m, -180, 360);
      saet("taxe", "T-akse", tal(m[3]), m, -180, 360);
    } else if ((m = find(new RegExp(`(?:qrs[- ]?akse|qrs[- ]?axis|(?<![a-z])akse|elektrisk akse)\\s*[:=]?\\s*${TAL}`, "i")))) saet("qrsaxe", "QRS-akse", tal(m[1]), m, -180, 360);
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
    if ((m = find(new RegExp(`sokolow(?:[- ]lyon)?(?:[- ]?(?:index|indeks|voltage|kriterium))?\\s*[:=]?\\s*${TAL}\\s*(mv|mm)?`, "i")))) {
      const x = tal(m[1]);
      saet("sokolow", "Sokolow-Lyon", (m[2] || "").toLowerCase() === "mm" || x > 10 ? x / 10 : x, m, 0, 10);
    }
    if ((m = find(new RegExp(`cornell(?![- ]?(?:produkt|product))(?:[- ]?(?:voltage|index|indeks|kriterium))?\\s*[:=]?\\s*${TAL}\\s*(mv|mm)?`, "i")))) {
      const x = tal(m[1]);
      saet("cornell", "Cornell-voltage", (m[2] || "").toLowerCase() === "mm" || x > 10 ? x / 10 : x, m, 0, 10);
    }
    // Køn og alder (hvis udskriften har dem)
    if ((m = find(/(?<![a-zæøå])(mand|kvinde|male|female)(?![a-zæøå])/i))) {
      const x = m[1].toLowerCase();
      const k = x === "mand" || x === "male" ? "mand" : "kvinde";
      ud.push({ type: "radio", name: "koen", value: k, label: "Køn", vis: k, kilde: L.kilde(m.index, m.index + m[0].length) });
    }
    if ((m = find(/(?:alder\s*[:=]?\s*(\d{2,3})|(?<![\d,.])(\d{2,3})\s*(?:år|years|yrs))(?![\d])/i))) saet("alder", "Alder", +(m[1] || m[2]), m, 18, 110);

    // Maskinens tolkning: teksten efter "Systemevaluering:"/"Tolkning:" til apparat- eller målelinjerne.
    const stop = /^\s*(?:ge |cardiosoft|marquette|muse|philips|schiller|mortara|welch|\d+\s*mm\/s|ubekræftet|bekræftet|unconfirmed|confirmed|side \d|page \d|tilstedevær|hjertefrekvens|ventrikelfrekvens|vent\.? ?rate|pr[- ]interval|qrs|qt|p-r-t|rr\b|placering|location|henvist|referred)/i;
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
        if (stop.test(l)) break;
        // Ombrudt linje fortsætter med lille begyndelsesbogstav; stort bogstav = nyt udsagn.
        if (del.length && /^[A-ZÆØÅ]/.test(l) && !/[.,;:]$/.test(del[del.length - 1])) del[del.length - 1] += ".";
        del.push(l);
      }
      maskine = del.join(" ");
    } else {
      // Ingen overskrift: de linjer, der indeholder et kendt udsagn og ingen måleværdi.
      maskine = linjer.filter((l) => UDSAGN.some((u) => u.m.test(l.toLowerCase())) && !/\d+\s*(?:ms|spm|bpm|mv|°)/i.test(l)).map((l) => l.trim()).join(" ");
    }
    maskine = maskine.replace(/\s+/g, " ").trim();
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
  }
  update();
})();
