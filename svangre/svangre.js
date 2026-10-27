/*
 * Svangreundersøgelser i almen praksis: de tre graviditetsundersøgelser
 * (uge 6–10, 25 og 32) og efterundersøgelsen 8 uger efter fødslen.
 * Termin og graviditetsalder, tjekliste pr. konsultation, risikovurdering
 * (gestationel diabetes, præeklampsi/acetylsalicylsyre, RhD, henvisning og
 * omsorgsniveau), alarmfund, vaccinationer, tidslinje og journalnotat.
 * Grundlag: Sundhedsstyrelsens Anbefalinger for svangreomsorgen (2022),
 * Lægehåndbogen, DSOG's guidelines og SSI. Tjeklisten huskes kun, mens siden
 * er åben — intet gemmes eller sendes.
 */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = document.querySelector(".form-panel");
  const output = $("output");
  const copyStatus = $("copyStatus");
  const printMeta = $("printMeta");

  const DAG = 864e5;
  const URINVEJE_URL = "../infektion/urinveje.html";
  const HYPOTHYREOSE_URL = "../thyreoidea/hypothyreose.html";
  const PRAEVENTION_URL = "../praevention.html";
  const CVRISIKO_URL = "../hjerte/cvrisiko.html";

  // ---------------------------------------------------------------------
  // Hjælpere
  // ---------------------------------------------------------------------

  const num = (id) => {
    const v = $(id).value.replace(",", ".");
    return v === "" ? NaN : parseFloat(v);
  };
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const has = (list, k) => list.includes(k);
  const dato = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T00:00:00Z") : null);
  const plusDage = (d, n) => new Date(d.getTime() + n * DAG);
  const fmtD = (d) => d.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const fmtKort = (d) => d.toLocaleDateString("da-DK", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const fmtGA = (dage) => `${Math.floor(dage / 7)}+${dage % 7}`;
  const fmt1 = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  const iso = (d) => d.toISOString().slice(0, 10);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const box = (cls, titel, body) => `<div class="box ${cls}"><h3>${titel}</h3>${body}</div>`;
  const foldbar = (cls, titel, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${titel}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const idag = () => {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  };

  const KONS_NAVN = {
    1: "1. graviditetsundersøgelse (uge 6–10)",
    2: "2. graviditetsundersøgelse (uge 25)",
    3: "3. graviditetsundersøgelse (uge 32)",
    efter: "Efterundersøgelse 8 uger efter fødslen",
  };

  const RISIKO_NAVN = {
    tidlGDM: "tidligere graviditetsdiabetes",
    famDM: "diabetes hos forældre/søskende",
    barn4500: "tidligere barn ≥ 4.500 g",
    pcos: "PCOS",
    dm: "kendt type 1-/type 2-diabetes",
    tidlPEsvaer: "tidligere præeklampsi med tegn på svær sygdom/før uge 34 eller svær væksthæmning",
    tidlPE: "tidligere præeklampsi",
    hypertension: "kronisk hypertension",
    nyre: "kronisk nyresygdom",
    sle: "SLE/antifosfolipidsyndrom",
    vte: "tidligere VTE/trombofili",
    hjerte: "hjertesygdom",
    thyreoidea: "thyreoideasygdom",
    epilepsi: "epilepsi",
    psykisk: "psykisk sygdom",
    bariatri: "tidligere fedmekirurgi",
    smitte: "kendt hiv/hepatitis",
    medicin: "fast medicin",
    sectio: "tidligere kejsersnit",
    praeterm: "tidligere fødsel før uge 37",
    doedfoedsel: "tidligere dødfødsel/sen abort",
    pph: "tidligere stor blødning efter fødslen",
    abort3: "≥ 3 spontane aborter",
    ntd: "tidligere neuralrørsdefekt",
    arvelig: "arvelig sygdom/misdannelse i familien",
    ryger: "rygning/nikotin",
    alkohol: "alkohol",
    stoffer: "euforiserende stoffer",
    vold: "vold i nære relationer",
    saarbar: "social sårbarhed",
  };

  // ---------------------------------------------------------------------
  // Tilstand
  // ---------------------------------------------------------------------

  function getState() {
    const d = dato($("dato").value) || idag();
    const sm = dato($("sm").value);
    const ulTermin = dato($("ultermin").value);
    const cyk = num("cyklus");
    const cyklus = cyk >= 21 && cyk <= 45 ? cyk : 28;
    let termin = null;
    let terminKilde = "";
    if (ulTermin) {
      termin = ulTermin;
      terminKilde = "ultralyd";
    } else if (sm) {
      termin = plusDage(sm, 280 + (cyklus - 28));
      terminKilde = cyklus === 28 ? "sidste menstruation" : `sidste menstruation, cyklus ${cyklus} dage`;
    }
    const ga = termin ? Math.round(280 - (termin - d) / DAG) : NaN;
    const hoejde = num("hoejde");
    const vaegtFoer = num("vaegtFoer");
    const vaegtNu = num("vaegtNu");
    const bmi = hoejde > 100 && vaegtFoer > 20 ? vaegtFoer / Math.pow(hoejde / 100, 2) : NaN;
    const valgt = radio("kons");
    let kons = valgt;
    if (valgt === "auto") {
      if (isNaN(ga)) kons = "1";
      else if (ga > 44 * 7) kons = "efter";
      else if (ga >= 29 * 7) kons = "3";
      else if (ga >= 18 * 7) kons = "2";
      else kons = "1";
    }
    return {
      valgt, kons, dato: d, sm, ulTermin, termin, terminKilde, ga, smFremtid: sm && sm > d,
      alder: num("alder"), hoejde, vaegtFoer, vaegtNu, bmi,
      nullipara: radio("paritet") === "0",
      graviditet: checked("graviditet"),
      rhd: radio("rhd"),
      risiko: checked("risiko"),
      prepred: radio("prepred"),
      bts: num("bts"), btd: num("btd"),
      protein: parseInt($("protein").value, 10),
      urin: checked("urin"),
      sf: num("sf"),
      hjertelyd: radio("hjertelyd"),
      sym: checked("sym"),
      forloeb: checked("forloeb"),
      btsE: num("btsE"), btdE: num("btdE"),
      epds: num("epds"),
      efterSym: checked("efterSym"),
    };
  }

  const gaUger = (s) => (isNaN(s.ga) ? NaN : s.ga / 7);
  // Dato for en graviditetsalder (uger + dage), når terminen er kendt.
  const vedGA = (s, uger, dage = 0) => plusDage(s.termin, uger * 7 + dage - 280);
  const flerfold = (s) => has(s.graviditet, "flerfold");
  // RSV-programmet gælder gravide med termin i juli–marts (SSI).
  const rsvTermin = (s) => !!s.termin && [6, 7, 8, 9, 10, 11, 0, 1, 2].includes(s.termin.getUTCMonth());
  const influenzaSaeson = (s) => [9, 10, 11, 0, 1].includes(s.dato.getUTCMonth());

  // ---------------------------------------------------------------------
  // Risikovurdering
  // ---------------------------------------------------------------------

  function gdmRisiko(s) {
    const rf = [];
    if (has(s.risiko, "tidlGDM")) rf.push("tidligere graviditetsdiabetes");
    if (s.bmi >= 27) rf.push(`BMI ${fmt1(s.bmi)} før graviditeten (≥ 27)`);
    if (has(s.risiko, "famDM")) rf.push("diabetes hos forældre/søskende");
    if (has(s.risiko, "barn4500")) rf.push("tidligere barn ≥ 4.500 g");
    if (has(s.risiko, "pcos")) rf.push("PCOS");
    if (flerfold(s)) rf.push("flerfoldsgraviditet");
    const glukosuri = has(s.urin, "glukose");
    const kendt = has(s.risiko, "dm");
    // Tidligere GDM eller mindst 2 risikofaktorer: tidlig OGTT (uge 10–20) og igen i uge 24–28.
    const tidlig = !kendt && (has(s.risiko, "tidlGDM") || rf.length >= 2);
    const sen = !kendt && rf.length >= 1;
    return { rf, glukosuri, kendt, tidlig, sen, ogtt: tidlig || sen || (glukosuri && !kendt) };
  }

  function peRisiko(s) {
    const hoej = [];
    if (has(s.risiko, "tidlPEsvaer")) hoej.push(RISIKO_NAVN.tidlPEsvaer);
    if (has(s.risiko, "hypertension")) hoej.push("kronisk hypertension");
    if (has(s.risiko, "dm")) hoej.push("prægestationel diabetes");
    if (has(s.risiko, "nyre")) hoej.push("kronisk nyresygdom");
    if (has(s.risiko, "sle")) hoej.push("SLE/antifosfolipidsyndrom");
    if (has(s.graviditet, "aegdonation")) hoej.push("graviditet efter ægdonation");
    const mod = [];
    if (has(s.risiko, "tidlPE") && !has(s.risiko, "tidlPEsvaer")) mod.push("tidligere præeklampsi uden svær sygdom");
    if (s.nullipara) mod.push("første fødsel");
    if (s.alder >= 40) mod.push(`alder ${s.alder} år (≥ 40)`);
    if (s.bmi >= 30) mod.push(`BMI ${fmt1(s.bmi)} (≥ 30)`);
    if (has(s.graviditet, "interval10")) mod.push("> 10 år siden sidste fødsel");
    if (flerfold(s)) mod.push("flerfoldsgraviditet");
    const niveau = hoej.length ? "anbefales" : mod.length >= 2 ? "overvejes" : "";
    return { hoej, mod, niveau };
  }

  // Grunde til tidlig henvisning til obstetrisk afdeling (efter regional retningslinje).
  function henvisning(s) {
    const g = [];
    if (has(s.risiko, "dm")) g.push("prægestationel diabetes (også endokrinologisk/diabetesambulatorium)");
    if (has(s.risiko, "hypertension")) g.push("kronisk hypertension");
    if (has(s.risiko, "nyre")) g.push("kronisk nyresygdom");
    if (has(s.risiko, "sle")) g.push("SLE/antifosfolipidsyndrom");
    if (has(s.risiko, "vte")) g.push("tidligere VTE eller trombofili (vurdering af lavmolekylært heparin i graviditeten og 6 uger efter fødslen)");
    if (has(s.risiko, "hjerte")) g.push("hjertesygdom");
    if (has(s.risiko, "epilepsi")) g.push("epilepsi (også neurologisk vurdering af medicinen)");
    if (has(s.risiko, "tidlPEsvaer")) g.push("tidligere præeklampsi med tegn på svær sygdom/væksthæmning");
    if (has(s.risiko, "doedfoedsel")) g.push("tidligere dødfødsel/sen abort");
    if (has(s.risiko, "praeterm")) g.push("tidligere for tidlig fødsel");
    if (has(s.risiko, "bariatri")) g.push("tidligere fedmekirurgi");
    if (has(s.risiko, "smitte")) g.push("kendt hiv eller hepatitis");
    if (has(s.risiko, "abort3")) g.push("gentagne spontane aborter");
    if (flerfold(s)) g.push("flerfoldsgraviditet");
    if (has(s.graviditet, "aegdonation")) g.push("graviditet efter ægdonation");
    if (s.bmi >= 35) g.push(`BMI ${fmt1(s.bmi)} (≥ 35)`);
    return g;
  }

  // Vejledende omsorgsniveau (Sundhedsstyrelsen 2022: niveau 1–4).
  function omsorgsniveau(s, henv, pe) {
    if (has(s.risiko, "stoffer") || has(s.risiko, "alkohol")) {
      return { niveau: 4, tekst: "rusmidler — henvisning til familieambulatoriet og tværfagligt samarbejde med kommunen" };
    }
    const tre = [];
    if (has(s.risiko, "psykisk")) tre.push("psykisk sygdom");
    if (has(s.risiko, "vold")) tre.push("vold i nære relationer");
    if (has(s.risiko, "saarbar")) tre.push("social sårbarhed");
    if (tre.length) return { niveau: 3, tekst: `${tre.join(", ")} — tværfagligt samarbejde (fx kommune, sundhedsplejerske, psykiatri)` };
    if (henv.length || pe.niveau || has(s.risiko, "ryger")) return { niveau: 2, tekst: "medicinske/obstetriske risikofaktorer eller rygning — udvidet tilbud hos jordemoder, læge eller obstetriker" };
    return { niveau: 1, tekst: "ingen særlige risikofaktorer — basistilbuddet" };
  }

  // ---------------------------------------------------------------------
  // Alarmfund
  // ---------------------------------------------------------------------

  function alarmer(s) {
    const roed = [];
    const gul = [];
    const u = gaUger(s);
    const efter20 = isNaN(u) || u >= 20;
    if (s.kons === "efter") {
      const sys = s.btsE;
      const dia = s.btdE;
      if (sys >= 160 || dia >= 110) roed.push(`<strong>BT ${sys || "?"}/${dia || "?"} — svær hypertension efter fødslen:</strong> akut vurdering (præeklampsi kan opstå eller forværres op til 6 uger efter fødslen).`);
      else if (sys >= 140 || dia >= 90) gul.push(`<strong>BT ${sys || "?"}/${dia || "?"}:</strong> forhøjet efter fødslen — gentag, start eller justér behandling, og kontrollér inden for 1–2 uger. Ved symptomer (hovedpine, synsforstyrrelser, epigastriesmerter) akut vurdering.`);
      if (has(s.efterSym, "selvskade")) roed.push("<strong>Tanker om selvskade:</strong> vurdér selvmordsrisikoen samme dag, og henvis akut til psykiatrien ved risiko.");
      if (s.epds >= 13) gul.push(`<strong>EPDS ${s.epds} (≥ 13):</strong> sandsynlig fødselsdepression — klinisk vurdering, samtaleterapi/psykolog, overvej antidepressiv behandling (forenelig med amning), og opfølgning inden for 2 uger.`);
      else if (s.epds >= 10) gul.push(`<strong>EPDS ${s.epds} (10–12):</strong> mulig depression — klinisk samtale og ny vurdering om 2–4 uger.`);
      return { roed, gul };
    }
    const sys = s.bts;
    const dia = s.btd;
    const btTxt = `${isNaN(sys) ? "?" : sys}/${isNaN(dia) ? "?" : dia}`;
    if (sys >= 160 || dia >= 110) {
      roed.push(`<strong>BT ${btTxt} — svær hypertension (≥ 160/110):</strong> akut telefonisk henvisning til fødeafdelingen.`);
    } else if (sys >= 140 || dia >= 90) {
      if (efter20) roed.push(`<strong>BT ${btTxt} (≥ 140/90)${s.protein >= 2 ? " med proteinuri" : ""}:</strong> mål igen efter hvile — bekræftet BT ≥ 140/90 efter uge 20 giver telefonisk henvisning til fødeafdelingen samme dag (graviditetshypertension/præeklampsi).`);
      else gul.push(`<strong>BT ${btTxt} før uge 20:</strong> tyder på kronisk hypertension — bekræft (hjemme- eller døgnblodtryk), henvis til obstetrisk afdeling, og skift ACE-hæmmer, angiotensin II-receptorblokker og thiazid (fx til labetalol eller nifedipin efter aftale).`);
    }
    if (s.protein >= 2 && !(sys >= 140 || dia >= 90)) gul.push("<strong>Proteinuri 2+ eller mere:</strong> kvantificér (urin-albumin/kreatinin-ratio), udelukk urinvejsinfektion, og kontrollér blodtrykket — ved samtidig BT ≥ 140/90 eller symptomer henvises til fødeafdelingen samme dag.");
    else if (s.protein === 1) gul.push("<strong>Spor/1+ protein:</strong> gentag stix, og udelukk urinvejsinfektion; kontrollér BT.");
    if (has(s.sym, "pe") && efter20) roed.push("<strong>Symptomer på præeklampsi eller HELLP</strong> (hovedpine, synsforstyrrelser, epigastrie-/højresidige ribbenssmerter, kvalme): akut telefonisk kontakt til fødeafdelingen — også ved normalt blodtryk og uden proteinuri.");
    if (has(s.sym, "oedem")) gul.push("<strong>Pludselige eller udtalte ødemer:</strong> mål BT og urin-protein — kan være tegn på præeklampsi.");
    if (has(s.sym, "bloedning")) {
      if (!isNaN(u) && u < 14) gul.push("<strong>Blødning i første trimester:</strong> vurdér mængde og smerter — ved smerter, kraftig blødning eller påvirket almentilstand akut gynækologisk vurdering (husk ekstrauterin graviditet). RhD-negative: anti-D efter fødestedets instruks.");
      else roed.push("<strong>Vaginal blødning efter første trimester:</strong> akut kontakt til fødeafdelingen.");
    }
    if (has(s.sym, "vand")) roed.push(`<strong>Vandafgang:</strong> kontakt fødeafdelingen${!isNaN(u) && u < 37 ? " akut (før uge 37)" : ""}.`);
    if (has(s.sym, "veer") && (isNaN(u) || u < 37)) roed.push("<strong>Truende for tidlig fødsel:</strong> akut kontakt til fødeafdelingen.");
    if (has(s.sym, "fosterbev") && (isNaN(u) || u >= 24)) roed.push("<strong>Nedsatte eller ændrede fosterbevægelser:</strong> kontakt fødeafdelingen samme dag (CTG og ultralyd) — afvent ikke.");
    if (s.hjertelyd === "nej" && s.kons !== "1") roed.push("<strong>Fosterets hjertelyd ikke hørt:</strong> akut ultralyd på fødeafdelingen.");
    if (has(s.sym, "kloe")) gul.push("<strong>Kløe uden udslæt:</strong> mistanke om intrahepatisk kolestase — mål galdesyrer og levertal; forhøjede værdier giver henvisning til fødeafdelingen.");
    if (has(s.sym, "hyperemesis")) gul.push("<strong>Svær kvalme/opkastning:</strong> vurdér dehydrering (ketonuri, vægttab ≥ 5 %), giv antiemetika; dehydrering eller manglende effekt giver indlæggelse.");
    if (has(s.urin, "glukose")) gul.push("<strong>Glukosuri:</strong> OGTT snarest (risikofaktor for graviditetsdiabetes).");
    if (has(s.urin, "bakteriuri")) gul.push(`<strong>Mulig bakteriuri:</strong> urindyrkning; asymptomatisk bakteriuri behandles i graviditeten, med kontroldyrkning efter behandlingen. Se <a href="${URINVEJE_URL}" target="_blank" rel="noopener">Urinvejsinfektioner</a> (nitrofurantoin undgås i 3. trimester).`);
    if (!isNaN(s.sf) && !isNaN(u) && u >= 24 && u <= 40) {
      const afv = s.sf - u;
      if (Math.abs(afv) > 3) gul.push(`<strong>Symfyse-fundus-mål ${fmt1(s.sf)} cm i uge ${Math.floor(u)}:</strong> afviger ${fmt1(Math.abs(afv))} cm ${afv < 0 ? "under" : "over"} forventet — henvis til ultralydsskanning (fostervækst og fostervand). Tommelfingerregel: cm ≈ graviditetsuge ± 3 (uge 24–36); brug fødestedets SF-kurve.`);
    }
    return { roed, gul };
  }

  // ---------------------------------------------------------------------
  // Tjekliste pr. konsultation
  // ---------------------------------------------------------------------

  function tjekliste(s, gdm, pe) {
    const t = [];
    const add = (id, tekst) => t.push({ id, tekst });
    const rhdNeg = s.rhd === "neg";
    if (s.kons === "1") {
      add("termin", "Terminsberegning (sidste menstruation; justeres efter ultralydstermin)");
      add("obsanamnese", "Obstetrisk anamnese: tidligere graviditeter, fødsler og komplikationer");
      add("sygdom", "Sygdomme, arvelige sygdomme i familien og fast medicin (fosterskadelig medicin seponeres eller skiftes)");
      add("livsstil", "Rygning, alkohol, euforiserende stoffer, kost og fysisk aktivitet");
      add("psykosocial", "Psykisk trivsel og tidligere psykisk sygdom, vold i nære relationer og netværk");
      add("bt", "Blodtryk");
      add("vaegt", "Højde, vægt og BMI før graviditeten — anbefalet vægtøgning");
      add("urin", "Urinstix (protein, glukose) og screening for asymptomatisk bakteriuri");
      add("blod", "Blodprøve: blodtype (AB0 og RhD), irregulære blodtypeantistoffer samt hepatitis B, hiv og syfilis (tidspunkt efter regionens anvisning)");
      add("fosterdiagnostik", "Information om fosterdiagnostik: doubletest og nakkefoldsscanning (11+2–13+6) samt misdannelsesskanning (18+0–21+6) — informeret valg");
      add("gdm", "Risikovurdering for graviditetsdiabetes og plan for OGTT");
      add("pe", "Risikovurdering for præeklampsi (acetylsalicylsyre?)");
      if (pe.niveau && s.prepred !== "ja" && !(gaUger(s) >= 20)) add("asa", "Recept på acetylsalicylsyre 150 mg til natten");
      add("tilskud", has(s.risiko, "ntd") ? "Folsyre 5 mg (tidligere neuralrørsdefekt), D-vitamin 10 mikrog. og jern 40–50 mg fra uge 10" : "Folsyre 400 mikrog. til uge 12, D-vitamin 10 mikrog. og jern 40–50 mg fra uge 10");
      add("raad", "Råd om kost (listeria, toxoplasma, lever/A-vitamin), alkohol, medicin og hvornår der skal søges hjælp");
      add("omsorg", "Omsorgsniveau (1–4) vurderet og aftalt");
      add("vandrejournal", "Vandrejournal udfyldt; henvisning til jordemoder og fødested efter regionens procedure");
      add("hb", "Hæmoglobin (og evt. ferritin) ved øget risiko for anæmi; hæmoglobinopatiscreening ved oprindelse i risikoområde (efter regional retningslinje)");
      if (s.alder < 25 || has(s.risiko, "saarbar")) add("klamydia", "Klamydiatest (under 25 år eller risiko)");
      if (has(s.risiko, "thyreoidea")) add("tsh", "Kendt thyreoideasygdom: levothyroxin øges 20–30 %, TSH og T4 hver 4. uge til uge 20");
      if (influenzaSaeson(s)) add("influenza", "Influenzavaccination (gratis til gravide i sæsonen)");
    } else if (s.kons === "2") {
      add("trivsel", "Trivsel, psykosocial belastning og fosterbevægelser");
      add("bt", "Blodtryk");
      add("urin", "Urinstix (protein, glukose) og screening for asymptomatisk bakteriuri");
      add("oedem", "Ødemer");
      add("sf", "Symfyse-fundus-mål (livmoderens størrelse)");
      add("hjertelyd", "Fosterets hjertelyd");
      if (rhdNeg || s.rhd === "ukendt") add("rhd", "RhD-negativ: blodprøve til irregulære antistoffer og fosterets RhD-type (uge 25)");
      if (gdm.ogtt) add("ogtt", "OGTT i uge 24–28 er bestilt (eller svar fra tidlig OGTT gennemgået)");
      add("kighoste", "Kighostevaccination (anbefales i uge 25)");
      if (pe.niveau) add("asa", "Acetylsalicylsyre tages fortsat (til uge 36)");
      add("info", "Information om tegn på præeklampsi, for tidlig fødsel og nedsatte fosterbevægelser");
      if (influenzaSaeson(s)) add("influenza", "Influenzavaccination givet (sæson)");
    } else if (s.kons === "3") {
      add("trivsel", "Trivsel og behov for aflastning (fx sygemelding eller tidligere orlov)");
      add("bt", "Blodtryk");
      add("urin", "Urinstix (protein, glukose)");
      add("oedem", "Ødemer");
      add("sf", "Symfyse-fundus-mål (fostervækst)");
      add("hjertelyd", "Fosterets hjertelyd og fosterbevægelser");
      if (rhdNeg) add("antid", "Anti-D givet i uge 29 (hvis fosteret er RhD-positivt)");
      if (gdm.ogtt) add("ogttsvar", "Svar på OGTT gennemgået");
      add("kighoste", "Kighostevaccination givet (ellers nu — kan gives indtil 1 uge før termin)");
      if (rsvTermin(s) || !s.termin) add("rsv", "RSV-vaccination (uge 32 ved termin juli–marts; mindst 2 uger efter kighoste)");
      if (pe.niveau) add("asa", "Acetylsalicylsyre stoppes i uge 36 (følg fødestedets instruks)");
      add("info", "Fødsel og amning: tegn på fødsel, hvornår fødeafdelingen kontaktes, nedsatte fosterbevægelser");
      add("efteraftale", "Aftale om efterundersøgelse 8 uger efter fødslen");
      if (influenzaSaeson(s)) add("influenza", "Influenzavaccination givet (sæson)");
    } else {
      add("trivsel", "Trivsel, søvn og netværk — screening for fødselsdepression (EPDS)");
      add("foedsel", "Gennemgang af fødslen og evt. komplikationer");
      add("bloedning", "Blødning, sårheling (bristning eller kejsersnit) og smerter");
      add("baekken", "Bækkenbund, urin- og afføringsinkontinens og samliv");
      add("amning", "Amning og ernæring");
      add("praevention", "Prævention (ammevenlig ved amning)");
      add("bt", "Blodtryk");
      if (has(s.forloeb, "gdm")) add("hba1c", "Efter graviditetsdiabetes: HbA1c ca. 3 måneder efter fødslen og efter 1 år, derefter hvert 1.–3. år");
      if (has(s.forloeb, "pe")) add("pe", "Efter præeklampsi/graviditetshypertension: BT-kontrol, aftrapning af medicin og årlig BT (øget hjerte-kar-risiko)");
      if (has(s.forloeb, "pph")) add("hb", "Hæmoglobin efter stor blødning/anæmi");
      if (has(s.forloeb, "bristning")) add("sphincter", "Sphincterruptur: kontinens og opfølgning efter fødestedets plan");
      add("thyreoidea", "Symptomer på thyreoiditis efter fødslen (træthed, uro, hjertebanken) — TSH ved mistanke");
      add("celle", "Celleprøve (livmoderhalskræft), hvis den er forfalden");
      add("vacciner", "Manglende vaccinationer (fx MFR)");
    }
    return t;
  }

  // Afkrydsninger huskes pr. konsultation, så længe siden er åben.
  const afkrydset = new Set();
  output.addEventListener("change", (e) => {
    const id = e.target.dataset && e.target.dataset.tjek;
    if (!id) return;
    if (e.target.checked) afkrydset.add(id);
    else afkrydset.delete(id);
    const t = sidst ? sidst.tjek : [];
    const n = t.filter((x) => afkrydset.has(`${sidst.s.kons}:${x.id}`)).length;
    const st = $("tjekStatus");
    if (st) st.textContent = `${n} af ${t.length} gennemgået`;
  });

  // ---------------------------------------------------------------------
  // Byggeklodser til output
  // ---------------------------------------------------------------------

  function terminBoks(s) {
    if (!s.termin) {
      return box("box-blue", KONS_NAVN[s.kons], "<p>Angiv første dag i sidste menstruation eller ultralydstermin — så beregnes graviditetsalder, termin og datoer for prøver og vaccinationer.</p>");
    }
    const linjer = [`Termin <strong>${fmtD(s.termin)}</strong> (efter ${s.terminKilde}).`];
    if (s.ga >= 0 && s.ga <= 44 * 7) linjer.push(`Graviditetsalder på konsultationsdagen: <span class="ga-badge">uge ${fmtGA(s.ga)}</span>.`);
    const u = gaUger(s);
    const ude = [];
    if (s.kons === "1" && u > 14) ude.push("1. graviditetsundersøgelse anbefales i uge 6–10.");
    if (s.kons === "2" && (u < 23 || u > 28)) ude.push("2. graviditetsundersøgelse anbefales i uge 25.");
    if (s.kons === "3" && (u < 30 || u > 35)) ude.push("3. graviditetsundersøgelse anbefales i uge 32.");
    if (s.sm && s.ulTermin) {
      const smTermin = plusDage(s.sm, 280);
      const diff = Math.round((s.ulTermin - smTermin) / DAG);
      if (Math.abs(diff) >= 7) linjer.push(`Ultralydsterminen afviger ${Math.abs(diff)} dage fra terminen efter sidste menstruation — ultralydsterminen bruges.`);
    }
    return box(ude.length ? "box-amber" : "box-blue", `${KONS_NAVN[s.kons]}${s.ga >= 0 && s.ga <= 44 * 7 ? ` — uge ${fmtGA(s.ga)}` : ""}`, `<p>${linjer.join(" ")}</p>${ude.length ? `<p>${ude.join(" ")}</p>` : ""}`);
  }

  function tjekBoks(s, t) {
    const n = t.filter((x) => afkrydset.has(`${s.kons}:${x.id}`)).length;
    const items = t
      .map((x) => {
        const key = `${s.kons}:${x.id}`;
        return `<li><label class="checkbox"><input type="checkbox" data-tjek="${esc(key)}"${afkrydset.has(key) ? " checked" : ""}> ${x.tekst}</label></li>`;
      })
      .join("");
    return box("box-green", `Tjekliste — ${KONS_NAVN[s.kons].replace(/ \(.*\)$/, "")}`, `<p class="tjek-status" id="tjekStatus" aria-live="polite">${n} af ${t.length} gennemgået</p><ul class="tjekliste">${items}</ul><p class="field-hint">Afkrydsningerne kommer med i journalnotatet og huskes kun, mens siden er åben.</p>`);
  }

  function gdmBoks(s, g) {
    if (s.kons === "efter") return "";
    if (g.kendt) {
      return box("box-amber", "Kendt diabetes", "<p>Ikke screening for graviditetsdiabetes. Henvis tidligt til obstetrisk afdeling og diabetesambulatorium (HbA1c-mål, øjenundersøgelse, medicin). Acetylsalicylsyre er indiceret (prægestationel diabetes er en høj risikofaktor for præeklampsi).</p>");
    }
    const vindue = (fra, til) => (s.termin ? ` (${fmtKort(vedGA(s, fra))}–${fmtKort(vedGA(s, til, 6))})` : "");
    const plan = [];
    if (g.glukosuri) plan.push("<strong>Glukosuri:</strong> OGTT snarest.");
    if (g.tidlig) plan.push(`<strong>Tidlig OGTT i uge 10–20${vindue(10, 19)}</strong>${has(s.risiko, "tidlGDM") ? " (tidligere graviditetsdiabetes)" : " (mindst 2 risikofaktorer)"} — og ved normalt svar igen i uge 24–28${vindue(24, 27)}.`);
    else if (g.sen) plan.push(`<strong>OGTT i uge 24–28${vindue(24, 27)}</strong> (1 risikofaktor).`);
    if (!g.rf.length && !g.glukosuri) {
      return box("box-blue", "Graviditetsdiabetes", `<p>Ingen markerede risikofaktorer — ingen OGTT efter risikofaktormodellen.${isNaN(s.bmi) ? " <strong>Angiv højde og vægt før graviditeten</strong> (BMI ≥ 27 er en risikofaktor)." : ""}</p>`);
    }
    return box(
      "box-amber",
      "Graviditetsdiabetes — OGTT",
      `${g.rf.length ? `<p>Risikofaktorer: ${g.rf.join(", ")}.</p>` : ""}${ul(plan)}
      <p>Diagnose: 2-timers værdi ≥ 9,0 mmol/l ved 75 g OGTT. Tidligere fedmekirurgi: OGTT kan give dumping — brug fødestedets alternativ (fx gentagne glukosemålinger).</p>
      <p class="field-hint">Regionerne bruger fortsat risikofaktormodellen. DSOG's guideline fra 2023 foreslår i stedet HbA1c ved 1. graviditetsundersøgelse (≥ 48 mmol/mol = manifest diabetes) og fasteglukose i uge 24–28 — følg regionens instruks.</p>`
    );
  }

  function peBoks(s, p) {
    if (s.kons === "efter") return "";
    const u = gaUger(s);
    const datoer = s.termin ? ` (start ${fmtKort(vedGA(s, 10))}–${fmtKort(vedGA(s, 12, 6))}, senest ${fmtKort(vedGA(s, 16))}; stop ${fmtKort(vedGA(s, 36))})` : "";
    const faktorer = `${p.hoej.length ? `<p>Høje risikofaktorer: ${p.hoej.join(", ")}.</p>` : ""}${p.mod.length ? `<p>Moderate risikofaktorer (${p.mod.length}): ${p.mod.join(", ")}.</p>` : ""}`;
    const prepred = "<p><strong>Fødesteder med 1. trimester-screening (PREPRED):</strong> risikoen beregnes ved nakkefoldsscanningen (blodtryk, blodprøve, Doppler og anamnese), og acetylsalicylsyre ordineres derfra. Screeningen erstatter DSOG's risikofaktorer på de fødesteder, der har indført den (udrulles fra september 2025).</p>";
    if (s.prepred === "ja") {
      return box("box-blue", "Præeklampsi — screening ved nakkefoldsscanningen", `${faktorer}${prepred}${p.hoej.length ? "<p>Høje risikofaktorer noteres i vandrejournalen/henvisningen.</p>" : ""}`);
    }
    if (!p.niveau) {
      return box("box-blue", "Præeklampsi", `${faktorer || "<p>Ingen høje og færre end 2 moderate risikofaktorer.</p>"}<p>Acetylsalicylsyre er ikke indiceret efter DSOG's risikofaktorer.</p>${s.prepred === "ukendt" ? prepred : ""}`);
    }
    let start;
    if (u >= 20) start = "<p><strong>Graviditetsugen er 20 eller senere:</strong> start ikke acetylsalicylsyre nu (ingen dokumenteret effekt).</p>";
    else if (u >= 16) start = "<p>Start snarest — effekten er størst ved start før uge 16, men kan forventes ved start før uge 20.</p>";
    else start = "<p>Start optimalt i uge 10–12 og senest i uge 16.</p>";
    return box(
      p.niveau === "anbefales" ? "box-amber" : "box-blue",
      `Præeklampsi — acetylsalicylsyre ${p.niveau}`,
      `${faktorer}
      <p><strong>Acetylsalicylsyre 150 mg til natten</strong>${datoer} — ${p.niveau === "anbefales" ? "anbefales ved mindst 1 høj risikofaktor" : "kan overvejes ved mindst 2 moderate risikofaktorer"} (DSOG). Stoppes i uge 36–37 efter fødestedets instruks.</p>
      ${start}
      ${s.prepred === "ukendt" ? prepred : ""}`
    );
  }

  function rhdBoks(s) {
    if (s.kons === "efter" || s.rhd !== "neg") return "";
    const d = (u) => (s.termin ? ` (${fmtKort(vedGA(s, u))})` : "");
    return box(
      "box-blue",
      "RhD-negativ",
      ul([
        `Uge 25${d(25)}: blodprøve til irregulære antistoffer og fosterets RhD-type (frit foster-DNA i moderens blod).`,
        `Uge 29${d(29)}: anti-D 250–300 mikrog. i.m., hvis fosteret er RhD-positivt, og kvinden ikke er immuniseret (gives efter regional aftale hos jordemoder eller læge).`,
        "Efter fødslen: anti-D inden 72 timer, hvis barnet er RhD-positivt.",
        "Ved blødning, abdominaltraume eller indgreb i graviditeten: kontakt fødeafdelingen mhp. anti-D inden 72 timer.",
      ])
    );
  }

  function henvisningBoks(s, henv, oms) {
    if (s.kons === "efter") return "";
    const dele = [];
    if (henv.length) dele.push(`<p><strong>Henvis til obstetrisk afdeling</strong> (efter regionens retningslinje) pga.: ${henv.join("; ")}.</p>`);
    if (has(s.risiko, "sectio")) dele.push("<p>Tidligere kejsersnit: samtale om fødselsmåde på fødestedet (typisk i 3. trimester).</p>");
    if (has(s.risiko, "medicin") || has(s.risiko, "epilepsi") || has(s.risiko, "psykisk")) dele.push("<p><strong>Medicin:</strong> gennemgå al medicin for fosterskadelig effekt (pro.medicin.dk → graviditet). Seponér eller skift fx valproat, isotretinoin, methotrexat, mycophenolat, warfarin, ACE-hæmmer/angiotensin II-receptorblokker og statiner; lithium og antiepileptika ændres kun efter specialistvurdering — seponér ikke brat.</p>");
    if (has(s.risiko, "thyreoidea")) dele.push(`<p><strong>Thyreoideasygdom:</strong> levothyroxin øges 20–30 % straks, TSH-mål under 2,5 mIE/l i 1. trimester — se <a href="${HYPOTHYREOSE_URL}" target="_blank" rel="noopener">Hypothyreose</a>.</p>`);
    if (has(s.risiko, "psykisk")) dele.push("<p><strong>Psykisk sygdom:</strong> plan for graviditet og tiden efter fødslen; ved svær eller aktuel sygdom tværfagligt samarbejde med psykiatrien (perinatalpsykiatrisk tilbud efter regionens organisering).</p>");
    if (has(s.risiko, "ryger")) dele.push("<p><strong>Rygning:</strong> tilbyd rygestopforløb — også nikotinerstatning er bedre end at ryge.</p>");
    if (has(s.risiko, "vold") || has(s.risiko, "stoffer") || has(s.risiko, "alkohol") || has(s.risiko, "saarbar")) dele.push("<p>Overvej underretning til kommunen (graviditetsunderretning efter serviceloven), hvis der er bekymring for barnets forhold efter fødslen.</p>");
    dele.push(`<p><strong>Omsorgsniveau ${oms.niveau}</strong> (vejledende): ${oms.tekst}. Den endelige placering aftales med jordemoder og evt. kommune.</p>`);
    return box(henv.length || oms.niveau >= 3 ? "box-amber" : "box-blue", "Henvisning og omsorgsniveau", dele.join(""));
  }

  function vaccineBoks(s) {
    if (s.kons === "efter") return "";
    const d = (u) => (s.termin ? ` (${fmtKort(vedGA(s, u))})` : "");
    const rsv = !s.termin
      ? "RSV (Abrysvo) i uge 32 ved termin juli–marts — angiv termin."
      : rsvTermin(s)
        ? `RSV (Abrysvo) i uge 32${d(32)} — terminen ligger i juli–marts. Godkendt i uge 24+0–35+6; mindst 2 uger efter kighoste.`
        : "RSV-programmet gælder ikke (termin april–juni).";
    return foldbar(
      "box-blue",
      "Vaccinationer i graviditeten",
      ul([
        `Kighoste (difteri-tetanus-kighoste) i uge 25${d(25)} — hele året; kan gives indtil 1 uge før termin og kan overvejes fra uge 16 ved flerfoldsgraviditet eller risiko for for tidlig fødsel.`,
        rsv,
        "Influenza i sæsonen (fra 1. oktober) — gratis til gravide.",
        "Covid-19 efter årets anbefaling fra Sundhedsstyrelsen.",
      ]) + "<p class=\"field-hint\">Tjek årets program hos SSI/Sundhedsstyrelsen.</p>"
    );
  }

  function tilskudBoks(s) {
    if (s.kons === "efter") return "";
    const punkter = [
      has(s.risiko, "ntd") ? "<strong>Folsyre 5 mg</strong> dagligt (tidligere neuralrørsdefekt) til uge 12." : "Folsyre 400 mikrog. dagligt til uge 12 (helst fra graviditetsønsket).",
      "D-vitamin 10 mikrog. dagligt hele graviditeten.",
      "Jern 40–50 mg dagligt fra uge 10 (mellem måltider; kan vente til senest uge 18 ved udtalt kvalme).",
      "Calcium 500 mg dagligt, hvis hun ikke får mælkeprodukter.",
    ];
    if (has(s.risiko, "bariatri")) punkter.push("Efter fedmekirurgi: vitamin- og mineralstatus (B12, folat, jern, D-vitamin, calcium) og fortsat specialtilskud.");
    if (has(s.risiko, "epilepsi")) punkter.push("Antiepileptika: højere folsyredosis efter neurologisk aftale.");
    let vaegt = "";
    if (!isNaN(s.bmi)) {
      const [lo, hi] = s.bmi < 18.5 ? [12.5, 18] : s.bmi < 25 ? [11.5, 16] : s.bmi < 30 ? [7, 11.5] : [5, 9];
      const tag = !isNaN(s.vaegtNu) && !isNaN(s.vaegtFoer) ? ` Vægtøgning indtil nu: ${fmt1(s.vaegtNu - s.vaegtFoer)} kg${s.ga >= 0 ? ` (uge ${Math.floor(s.ga / 7)})` : ""}.` : "";
      vaegt = `<p>BMI før graviditeten ${fmt1(s.bmi)}: anbefalet samlet vægtøgning ${fmt1(lo)}–${fmt1(hi)} kg.${tag}</p>`;
    }
    return foldbar("box-blue", "Kosttilskud og vægt", ul(punkter) + vaegt);
  }

  function efterBoks(s) {
    if (s.kons !== "efter") return "";
    const p = [];
    if (has(s.forloeb, "gdm")) p.push(`<strong>Graviditetsdiabetes:</strong> HbA1c ca. 3 måneder efter fødslen og efter 1 år, derefter hvert 1.–3. år — høj risiko for type 2-diabetes; råd om vægt og fysisk aktivitet. Ved ny graviditet tidlig OGTT.`);
    if (has(s.forloeb, "pe")) p.push(`<strong>Præeklampsi/graviditetshypertension:</strong> BT-kontrol til normalisering og aftrapning af behandlingen; derefter årlig BT og vurdering af hjerte-kar-risiko (se <a href="${CVRISIKO_URL}" target="_blank" rel="noopener">CV-risiko</a>). Ved ny graviditet acetylsalicylsyre efter risikovurdering.`);
    if (has(s.forloeb, "sectio")) p.push("<strong>Kejsersnit:</strong> sårheling og smerter; drøft fødselsmåde ved en ny graviditet.");
    if (has(s.forloeb, "pph")) p.push("<strong>Stor blødning/anæmi:</strong> hæmoglobin og jerntilskud ved behov.");
    if (has(s.forloeb, "bristning")) p.push("<strong>Sphincterruptur:</strong> spørg om luft- og afføringsinkontinens; opfølgning efter fødestedets plan (bækkenbundsfysioterapi).");
    p.push(`<strong>Prævention:</strong> ${has(s.forloeb, "ammer") ? "ammer — gestagenpræparater, kobber- eller hormonspiral; kombinerede p-piller frarådes de første 6 uger og så længe amningen er den primære ernæring." : "kombinerede p-piller tidligst 6 uger efter fødslen (VTE-risiko); spiral fra 4 uger efter fødslen."} Se <a href="${PRAEVENTION_URL}" target="_blank" rel="noopener">Præventionsguide</a>.`);
    p.push("<strong>EPDS</strong> (Edinburgh Postnatal Depression Scale): ≥ 10 mulig og ≥ 13 sandsynlig depression; positivt svar på spørgsmål 10 kræver vurdering samme dag.");
    return box("box-blue", "Efter fødslen — opfølgning", ul(p));
  }

  function tidslinje(s, gdm, pe) {
    if (!s.termin) return "";
    const r = [];
    const add = (tekst, fra, til, vis) => r.push({ tekst, fra, til: til || fra, vis });
    const g = (u, d = 0) => vedGA(s, u, d);
    add("1. graviditetsundersøgelse (uge 6–10)", g(6), g(10, 6), `${fmtKort(g(6))}–${fmtKort(g(10, 6))}`);
    if (pe.niveau && s.prepred !== "ja") add("Acetylsalicylsyre 150 mg — start (optimalt uge 10–12, senest uge 16)", g(10), g(16), `${fmtKort(g(10))}–${fmtKort(g(12, 6))}`);
    if (gdm.tidlig) add("Tidlig OGTT (uge 10–20)", g(10), g(19, 6), `${fmtKort(g(10))}–${fmtKort(g(19, 6))}`);
    add("Nakkefoldsscanning og doubletest-risikovurdering (11+2–13+6)", g(11, 2), g(13, 6), `${fmtKort(g(11, 2))}–${fmtKort(g(13, 6))}`);
    add("Misdannelsesskanning (18+0–21+6)", g(18), g(21, 6), `${fmtKort(g(18))}–${fmtKort(g(21, 6))}`);
    if (gdm.ogtt) add("OGTT (uge 24–28)", g(24), g(27, 6), `${fmtKort(g(24))}–${fmtKort(g(27, 6))}`);
    add("2. graviditetsundersøgelse og kighostevaccination (uge 25)", g(25), g(25, 6), fmtKort(g(25)));
    if (s.rhd === "neg") add("RhD-negativ: antistoffer og fosterets RhD (uge 25)", g(25), g(25, 6), fmtKort(g(25)));
    if (s.rhd === "neg") add("Anti-D ved RhD-positivt foster (uge 29)", g(29), g(29, 6), fmtKort(g(29)));
    add("3. graviditetsundersøgelse (uge 32)", g(32), g(32, 6), fmtKort(g(32)));
    if (rsvTermin(s)) add("RSV-vaccination (uge 32)", g(32), g(35, 6), fmtKort(g(32)));
    if (pe.niveau && s.prepred !== "ja") add("Acetylsalicylsyre stoppes (uge 36–37)", g(36), g(36, 6), fmtKort(g(36)));
    add("Termin (40+0)", g(40), g(40), fmtKort(g(40)));
    add("Efterundersøgelse ca. 8 uger efter fødslen", g(48), g(48, 6), `ca. ${fmtKort(g(48))}`);
    const rows = r
      .map((x) => {
        const cls = x.til < s.dato ? "passeret" : x.fra <= s.dato && s.dato <= x.til ? "nu" : "";
        return `<tr${cls ? ` class="${cls}"` : ""}><td>${x.vis}</td><td>${x.tekst}</td></tr>`;
      })
      .join("");
    return foldbar("box-blue", "Tidslinje for graviditeten", `<div class="drug-table-wrap"><table class="drug-table tidslinje"><thead><tr><th>Dato</th><th>Hvad</th></tr></thead><tbody>${rows}</tbody></table></div><p class="field-hint">Beregnet ud fra terminen. Fremhævet = aktuelt; grå = passeret.</p>`);
  }

  // ---------------------------------------------------------------------
  // Opdatering
  // ---------------------------------------------------------------------

  let sidst = null;

  function update() {
    const s = getState();
    const efter = s.kons === "efter";
    $("fundFelter").hidden = efter;
    $("efterFelter").hidden = !efter;
    $("sfFelt").hidden = s.kons === "1";
    $("hjertelydFelt").hidden = s.kons === "1";
    $("gaHint").textContent = s.termin && s.ga >= 0 && s.ga <= 44 * 7 ? `Termin ${fmtD(s.termin)} · uge ${fmtGA(s.ga)} på konsultationsdagen${s.valgt === "auto" ? ` · ${KONS_NAVN[s.kons]}` : ""}` : "";
    const advarsler = [];
    if (s.smFremtid) advarsler.push("Sidste menstruation ligger efter konsultationsdatoen.");
    if (s.termin && (s.ga > 44 * 7 || s.ga < 0) && !efter) advarsler.push("Graviditetsalderen er uden for 0–44 uger — tjek datoerne.");
    $("datoWarning").textContent = advarsler.join(" ");
    $("bmiHint").textContent = isNaN(s.bmi) ? "" : `BMI før graviditeten: ${fmt1(s.bmi)}`;

    const gdm = gdmRisiko(s);
    const pe = peRisiko(s);
    const henv = henvisning(s);
    const oms = omsorgsniveau(s, henv, pe);
    const al = alarmer(s);
    const t = tjekliste(s, gdm, pe);
    sidst = { s, gdm, pe, henv, oms, al, tjek: t };

    let html = terminBoks(s);
    if (al.roed.length) html += box("box-red", "⚠ Handling nu", ul(al.roed));
    if (al.gul.length) html += box("box-amber", "Fund der skal følges op", ul(al.gul));
    html += tjekBoks(s, t);
    html += efterBoks(s);
    html += peBoks(s, pe);
    html += gdmBoks(s, gdm);
    html += rhdBoks(s);
    html += henvisningBoks(s, henv, oms);
    html += vaccineBoks(s);
    html += tilskudBoks(s);
    html += tidslinje(s, gdm, pe);
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journalnotat
  // ---------------------------------------------------------------------

  const tekst = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent.replace(/\s+/g, " ").trim();
  };

  function buildJournalNote() {
    const { s, gdm, pe, henv, oms, al, tjek } = sidst;
    const L = [`${KONS_NAVN[s.kons].replace(/ \(.*\)$/, "")} ${fmtKort(s.dato)}`];
    const basis = [];
    if (s.termin && s.ga >= 0 && s.ga <= 44 * 7 && s.kons !== "efter") basis.push(`GA ${fmtGA(s.ga)}, termin ${fmtKort(s.termin)} (${s.terminKilde})`);
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    basis.push(s.nullipara ? "har ikke født før" : "har født før");
    if (flerfold(s)) basis.push("flerfoldsgraviditet");
    if (!isNaN(s.bmi)) basis.push(`BMI før graviditeten ${fmt1(s.bmi)}`);
    if (s.rhd !== "ukendt") basis.push(`RhD-${s.rhd === "neg" ? "negativ" : "positiv"}`);
    L.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    const rf = s.risiko.map((k) => RISIKO_NAVN[k]);
    L.push(`Anamnese/risikofaktorer: ${rf.length ? rf.join(", ") : "ingen markeret"}.`);
    if (s.kons !== "efter") {
      const fund = [];
      if (!isNaN(s.bts) || !isNaN(s.btd)) fund.push(`BT ${isNaN(s.bts) ? "?" : s.bts}/${isNaN(s.btd) ? "?" : s.btd}`);
      fund.push(`urinstix protein ${["neg.", "spor/1+", "2+", "≥ 3+"][s.protein]}${has(s.urin, "glukose") ? ", glukose pos." : ", glukose neg."}${has(s.urin, "bakteriuri") ? ", nitrit/leukocytter pos." : ""}`);
      if (s.kons !== "1" && !isNaN(s.sf)) fund.push(`SF ${fmt1(s.sf)} cm`);
      if (s.kons !== "1" && s.hjertelyd !== "ukendt") fund.push(`hjertelyd ${s.hjertelyd === "ja" ? "hørt" : "IKKE hørt"}`);
      L.push(`Fund: ${fund.join(", ")}.`);
      const sym = checked("sym").map((v) => document.querySelector(`input[name="sym"][value="${v}"]`).parentElement.textContent.trim().toLowerCase());
      if (sym.length) L.push(`Symptomer: ${sym.join("; ")}.`);
    } else {
      const fund = [];
      if (!isNaN(s.btsE) || !isNaN(s.btdE)) fund.push(`BT ${isNaN(s.btsE) ? "?" : s.btsE}/${isNaN(s.btdE) ? "?" : s.btdE}`);
      if (!isNaN(s.epds)) fund.push(`EPDS ${s.epds}`);
      const fl = checked("forloeb").map((v) => document.querySelector(`input[name="forloeb"][value="${v}"]`).parentElement.textContent.trim().toLowerCase());
      if (fl.length) L.push(`Forløb: ${fl.join(", ")}.`);
      if (fund.length) L.push(`Fund: ${fund.join(", ")}.`);
    }
    al.roed.concat(al.gul).forEach((a) => L.push(`OBS: ${tekst(a)}`));
    if (s.kons !== "efter") {
      if (gdm.kendt) L.push("Graviditetsdiabetes: ikke relevant (kendt diabetes).");
      else if (gdm.ogtt) L.push(`Graviditetsdiabetes: ${gdm.rf.length ? `risikofaktorer ${gdm.rf.join(", ")}; ` : ""}${gdm.glukosuri ? "OGTT snarest (glukosuri)" : gdm.tidlig ? "OGTT uge 10–20 og igen uge 24–28" : "OGTT uge 24–28"}.`);
      else L.push("Graviditetsdiabetes: ingen risikofaktorer.");
      if (s.prepred === "ja") L.push("Præeklampsi: risikovurdering ved nakkefoldsscanningen (PREPRED).");
      else if (pe.niveau) L.push(`Præeklampsi: ${pe.hoej.length ? `høj risiko (${pe.hoej.join(", ")})` : `${pe.mod.length} moderate risikofaktorer (${pe.mod.join(", ")})`} — acetylsalicylsyre 150 mg til natten ${pe.niveau} til uge 36–37.`);
      else L.push("Præeklampsi: ikke indikation for acetylsalicylsyre efter risikofaktorer.");
      if (s.rhd === "neg") L.push("RhD-negativ: antistoffer og fosterets RhD i uge 25, anti-D i uge 29 ved RhD-positivt foster.");
      if (henv.length) L.push(`Henvisning til obstetrisk afdeling: ${henv.join("; ")}.`);
      L.push(`Omsorgsniveau ${oms.niveau} (vejledende).`);
    }
    const gjort = tjek.filter((x) => afkrydset.has(`${s.kons}:${x.id}`)).map((x) => x.tekst);
    const mangler = tjek.filter((x) => !afkrydset.has(`${s.kons}:${x.id}`)).map((x) => x.tekst);
    if (gjort.length) L.push(`Gennemgået: ${gjort.join("; ")}.`);
    if (mangler.length) L.push(`Ikke afkrydset (tilpas): ${mangler.join("; ")}.`);
    return L.join("\n");
  }

  function buildFullText() {
    const L = [];
    output.querySelectorAll(".box").forEach((b) => {
      const h3 = b.querySelector("h3");
      if (h3) L.push(h3.textContent.trim().toUpperCase());
      b.querySelectorAll(":scope > p, :scope > ul, :scope > details > p, :scope > details > ul, :scope > details > .drug-table-wrap").forEach((el) => {
        if (el.tagName === "P") L.push(el.textContent.replace(/\s+/g, " ").trim());
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => L.push(`${li.querySelector("input:checked") ? "[x]" : li.querySelector("input") ? "[ ]" : "-"} ${li.textContent.replace(/\s+/g, " ").trim()}`));
        else el.querySelectorAll("tbody tr").forEach((tr) => L.push("  " + Array.from(tr.children).map((td) => td.textContent.trim()).join(" — ")));
      });
      L.push("");
    });
    return L.join("\n").trim();
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

  // ---------------------------------------------------------------------
  // Hændelser
  // ---------------------------------------------------------------------

  $("dato").value = iso(idag());
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  $("copyBtn").addEventListener("click", () => copyText(buildJournalNote()));
  $("copyFullBtn").addEventListener("click", () => copyText(buildFullText()));
  $("resetBtn").addEventListener("click", () => {
    form.reset();
    afkrydset.clear();
    $("dato").value = iso(idag());
    update();
  });
  const printBtn = $("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const n = new Date();
      printMeta.textContent = `Udskrevet ${n.toLocaleDateString("da-DK")} kl. ${n.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}.`;
      window.print();
    });
  }
  window.addEventListener("beforeprint", () => output.querySelectorAll("details").forEach((d) => (d.open = true)));

  update();
})();
