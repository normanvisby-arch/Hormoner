/*
 * Individuel risikovurdering ved menopausal hormonbehandling (MHT).
 * Viser befolkningstal (pr. 1.000 kvinder) for patientens aldersgruppe, regime,
 * administrationsvej og varighed, og markerer hendes egne risikofaktorer som
 * "højere/lavere end tallene" — uden at omregne dem, da der ikke findes en
 * valideret samlet model. Kilder: MHRA 2019 (brystkræft), WHI/EU-produktresuméer
 * (VTE, apopleksi, endometrie- og ovariecancer), dansk registerstudie BMJ 2026
 * (trombotisk sygdom), NICE NG23 2024, Mørch 2016 og Million Women Study 2005
 * (endometriecancer), WHIMS 2003 (demens), Huntley BJGP 2024 (familiær disposition).
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const copyFullBtn = document.getElementById("copyFullBtn");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");
  const alderInput = document.getElementById("alder");
  const alderWarning = document.getElementById("alderWarning");
  const printMeta = document.getElementById("printMeta");
  const regimeField = document.getElementById("regimeField");

  const KLIMAKTERIE_URL = "index.html";

  let lastCards = [];

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) {
        printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede valg på tidspunktet for udskrift.";
      }
      window.print();
    });
  }
  window.addEventListener("beforeprint", () => {
    output.querySelectorAll("details").forEach((d) => (d.open = true));
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    // form.reset() does not fire "input"/"change", so re-sync dependent UI.
    checkAlderRange();
    update();
  });

  function copyText(text) {
    const done = () => {
      copyStatus.textContent = "Kopieret ✓";
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    };
    const fail = () => {
      copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.";
    };
    try {
      navigator.clipboard.writeText(text).then(done, fail);
    } catch (e) {
      fail();
    }
  }
  copyBtn.addEventListener("click", () => copyText(buildJournalNote()));
  copyFullBtn.addEventListener("click", () => copyText(buildFullText()));

  function checkAlderRange() {
    const raw = alderInput.value.trim();
    const v = parseInt(raw, 10);
    alderWarning.textContent = raw !== "" && (isNaN(v) || v < 30 || v > 85) ? "Alder virker usædvanlig — tjek indtastningen." : "";
  }
  alderInput.addEventListener("input", checkAlderRange);

  function getState() {
    // Empty age stays NaN so it fails every age comparison.
    const alder = parseInt(alderInput.value, 10);
    const bmiRaw = document.getElementById("bmiInput").value;
    const bmi = bmiRaw === "" ? null : parseFloat(bmiRaw);
    const val = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
    return {
      alder,
      bmi,
      uterus: val("uterus") === "ja",
      regime: val("regime"),
      vej: val("vej"),
      varighed: parseInt(val("varighed"), 10),
      rf: Array.from(document.querySelectorAll('input[name="rf"]:checked')).map((el) => el.value),
    };
  }

  const RF_LABELS = {
    sen: "> 10 år siden menopausen",
    fambryst: "brystkræft hos førstegradsslægtning",
    brca: "flere slægtninge med bryst-/æggestokkræft eller BRCA",
    alkohol: "alkohol > 10 genstande/uge",
    tidlVTE: "tidligere VTE",
    trombofili: "trombofili/VTE i nærmeste familie",
    ryger: "ryger",
    htn: "hypertension",
    diabetes: "diabetes",
    hjertekar: "kendt hjerte-kar-sygdom",
    migraene: "migræne med aura",
    endorisiko: "øget risiko for endometriecancer",
    osteo: "osteoporose/høj frakturrisiko",
  };

  // MHRA 2019: ekstra brystkræfttilfælde pr. 1.000 kvinder til 69 år ved opstart
  // i 40'erne/50'erne; 10 års brug er ca. det dobbelte af 5 år.
  const BRYST_BAGGRUND = 63;
  const BRYST_EKSTRA = {
    alene: { 5: 5, 10: 10 },
    sekventiel: { 5: 14, 10: 28 },
    kontinuerlig: { 5: 20, 10: 40 },
  };

  const LEVEL = {
    hoej: { cls: "box-red", chip: "chip-hoej", label: "Høj — konferér/overvej alternativ" },
    moderat: { cls: "box-amber", chip: "chip-moderat", label: "Moderat ekstra risiko" },
    lav: { cls: "box-blue", chip: "chip-lav", label: "Lav ekstra risiko" },
    gavn: { cls: "box-green", chip: "chip-gavn", label: "Gevinst" },
  };

  const alderKendt = (s) => !isNaN(s.alder);
  const has = (s, k) => s.rf.includes(k);
  const bmiHigh = (s) => s.bmi !== null && !isNaN(s.bmi) && s.bmi >= 30;
  const over60 = (s) => alderKendt(s) && s.alder >= 60;
  const senOpstart = (s) => has(s, "sen") || over60(s);
  const tidligMenopause = (s) => alderKendt(s) && s.alder < 45;
  const fmtNum = (n) => String(n).replace(".", ",");

  // Number needed to harm = 1.000 / ekstra tilfælde pr. 1.000, afrundet så
  // tallet ikke ser mere præcist ud end de underliggende befolkningstal.
  function roundNnh(x) {
    if (x < 100) return Math.round(x / 5) * 5;
    if (x < 1000) return Math.round(x / 10) * 10;
    return Math.round(x / 100) * 100;
  }
  const fmtInt = (n) => n.toLocaleString("da-DK");
  const nnhOf = (extraPer1000) => fmtInt(roundNnh(1000 / extraPer1000));
  // Et interval af ekstra tilfælde (lo–hi) giver et omvendt NNH-interval.
  const nnhRange = (loExtra, hiExtra) => `${nnhOf(hiExtra)}–${nnhOf(loExtra)}`;
  const nnhLabel = (tal) => (tal.startsWith("≥") ? tal : `≈ ${tal}`);
  const maxLevel = (a, b) => {
    const order = ["gavn", "lav", "moderat", "hoej"];
    return order.indexOf(a) >= order.indexOf(b) ? a : b;
  };

  function brystType(s) {
    if (!s.uterus) return "alene";
    return s.regime === "sekventiel" ? "sekventiel" : "kontinuerlig";
  }

  function regimeText(s) {
    const vej = s.vej === "oral" ? "oral" : "transdermal";
    if (!s.uterus) return `${vej} østrogen alene`;
    if (s.regime === "mirena") return `${vej} østrogen + Mirena`;
    return `${vej} østrogen + ${s.regime === "sekventiel" ? "sekventiel" : "kontinuerlig"} gestagen`;
  }

  // 1.000-personers figur: blå = får sygdommen uanset MHT, orange = ekstra
  // tilfælde med MHT, grå = får den ikke.
  function iconArray(base, extra) {
    let cells = "";
    for (let i = 0; i < 1000; i++) {
      const cls = i < base ? "ia-base" : i < base + extra ? "ia-extra" : "ia-none";
      cells += `<span class="ia-cell ${cls}"></span>`;
    }
    const ingen = 1000 - base - extra;
    return `<figure class="icon-array" aria-label="Ud af 1.000 kvinder: ${base} får brystkræft uden MHT, ${extra} ekstra med MHT, ${ingen} får ikke brystkræft">
      <div class="ia-grid" aria-hidden="true">${cells}</div>
      <figcaption class="ia-legend">
        <span><span class="ia-key ia-base"></span>${base} får brystkræft uanset MHT</span>
        <span><span class="ia-key ia-extra"></span>${extra} ekstra med MHT</span>
        <span><span class="ia-key ia-none"></span>${ingen} får ikke brystkræft</span>
      </figcaption>
    </figure>`;
  }

  // ---------------------------------------------------------------------
  // Kort pr. helbredsudfald. Hvert kort: niveau, tal, patientens forhold,
  // og en kort journallinje.
  // ---------------------------------------------------------------------

  function brystCard(s) {
    const type = brystType(s);
    const extra = BRYST_EKSTRA[type][s.varighed];
    let level = extra >= 10 ? "moderat" : "lav";
    const mods = [];
    if (has(s, "brca")) {
      level = "hoej";
      mods.push("<strong>Flere slægtninge / BRCA:</strong> tallene gælder ikke. Vurdér risikoen med en valideret model (fx CanRisk) og henvis til genetisk rådgivning før opstart. BRCA-bærere uden brystkræft, som har fået fjernet æggestokkene forebyggende, anbefales dog typisk MHT til ca. 51 år.");
    }
    if (has(s, "fambryst") && !has(s, "brca")) {
      level = maxLevel(level, "moderat");
      // Den relative øgning ved MHT er omtrent den samme, så det absolutte
      // antal ekstra tilfælde skaleres med baggrundsrisikoen (Huntley 2024).
      mods.push(`<strong>Brystkræft hos førstegradsslægtning:</strong> baggrundsrisikoen er ca. 1,8 gange højere, og den relative øgning ved MHT er omtrent den samme — så det ekstra antal tilfælde er ca. 1,8 gange større end tallene (NNH formentlig nærmere ${nnhOf(extra * 1.8)}). Ved brystkræft hos en ung slægtning (< 50 år) eller flere slægtninge: brug en valideret model.`);
    }
    if (bmiHigh(s)) mods.push(`<strong>BMI ${fmtNum(s.bmi)}:</strong> baggrundsrisikoen er højere end tallene, men den relative øgning ved MHT er mindre end hos normalvægtige.`);
    if (has(s, "alkohol")) mods.push("<strong>Alkohol:</strong> øger risikoen uafhængigt af MHT — mindre alkohol mindsker den.");
    if (over60(s)) mods.push("<strong>Opstart efter 60 år:</strong> den relative øgning er mindre, men baggrundsrisikoen højere.");
    if (tidligMenopause(s)) mods.push("<strong>Menopause før 45 år:</strong> MHT erstatter manglende hormoner — brystkræftrisikoen øges ikke ud over jævnaldrendes før ca. 51 år, så tallene og NNH gælder først brug efter ca. 51 år.");
    if (s.uterus && s.regime === "mirena") mods.push("<strong>Mirena + østrogen:</strong> sparsomme data — vist som kontinuerlig kombineret behandling.");
    else if (s.uterus) mods.push("Mikroniseret progesteron (Utrogestan) og dydrogesteron er i observationelle studier forbundet med mindre øgning end syntetiske gestagener, men evidensen er usikker.");
    const typeTxt = { alene: "østrogen alene", sekventiel: "sekventiel kombineret behandling", kontinuerlig: "kontinuerlig kombineret behandling" }[type];
    return {
      key: "bryst",
      title: "Brystkræft",
      level,
      body: `<p>Uden MHT får ca. <strong>${BRYST_BAGGRUND} af 1.000</strong> kvinder brystkræft mellem 50 og 69 år. Med ${s.varighed} års ${typeTxt}: ca. <strong>${BRYST_BAGGRUND + extra} af 1.000</strong> — dvs. ca. <strong>${extra} ekstra</strong>.${s.varighed === 10 ? " (10 år ≈ det dobbelte af 5 år.)" : ""} Risikoen falder efter ophør, men en mindre overrisiko kan vare over 10 år. Dødelighed af brystkræft: ca. 1 ekstra dødsfald pr. 1.000 ved 5 års kombineret behandling (modelstudie, Huntley 2024).</p>
      ${iconArray(BRYST_BAGGRUND, extra)}`,
      mods,
      nnh: has(s, "brca")
        ? { tal: null, tekst: "Ikke beregnet — befolkningstallene gælder ikke ved BRCA eller stærk familiær disposition. Brug en valideret model (fx CanRisk)." }
        : { tal: nnhOf(extra), tekst: `Behandles ${nnhOf(extra)} kvinder i ${s.varighed} år med ${typeTxt}, får 1 ekstra brystkræft (diagnosticeret frem til 69 år).` },
      journal: has(s, "brca")
        ? "Brystkræft: befolkningstal gælder ikke (BRCA/stærk familiær disposition) — individuel vurdering (fx CanRisk/genetisk rådgivning)"
        : `Brystkræft: ca. ${extra} ekstra pr. 1.000 til 69 år (baggrund ${BRYST_BAGGRUND}) ved ${s.varighed} års ${typeTxt}; NNH ca. ${nnhOf(extra)}${has(s, "fambryst") ? ` (med familiær disposition formentlig ca. ${nnhOf(extra * 1.8)})` : ""}`,
    };
  }

  function vteCard(s) {
    const mods = [];
    let level;
    let tal;
    const risikofaktor = has(s, "tidlVTE") || has(s, "trombofili") || bmiHigh(s) || has(s, "ryger") || senOpstart(s);
    if (s.vej === "transdermal") {
      tal = "Transdermal østrogen i standarddosis <strong>øger ikke påviseligt risikoen</strong>.";
      level = "lav";
    } else {
      tal = s.uterus
        ? "Oral kombineret behandling: ca. <strong>5–10 ekstra pr. 1.000</strong> over 5 år (størst i første år, men øget under hele behandlingen)."
        : "Oral østrogen alene: ca. <strong>1–4 ekstra pr. 1.000</strong> over 5 år (størst i første år, men øget under hele behandlingen).";
      level = risikofaktor ? "hoej" : "moderat";
    }
    if (has(s, "tidlVTE")) {
      level = "hoej";
      mods.push(`<strong>Tidligere VTE:</strong> ${s.vej === "oral" ? "oral MHT frarådes." : "transdermal behandling kun efter konference med trombosecenter/gynækolog."}`);
    }
    if (has(s, "trombofili")) {
      level = maxLevel(level, s.vej === "oral" ? "hoej" : "moderat");
      mods.push("<strong>Trombofili/familiær VTE:</strong> kun transdermal behandling; ved kendt trombofili konferér med trombosecenter.");
    }
    if (bmiHigh(s)) mods.push(`<strong>BMI ${fmtNum(s.bmi)}:</strong> overvægt øger i sig selv VTE-risikoen ca. 2–3 gange.`);
    if (has(s, "ryger")) mods.push("<strong>Rygning:</strong> øger baggrundsrisikoen.");
    if (senOpstart(s)) mods.push("<strong>Alder/sen opstart:</strong> baggrundsrisikoen stiger med alderen.");
    if (s.vej === "oral") mods.push("<strong>Dansk registerstudie (BMJ 2026, kvinder 50–69 år):</strong> oral behandling gav 1 ekstra VTE pr. ca. 1.050 kvinder pr. behandlingsår — uanset dosis og varighed. Transdermal behandling gav ingen øgning.");
    if (s.vej === "oral" && risikofaktor) mods.push("<strong>Anbefaling:</strong> skift til transdermal behandling.");
    return {
      key: "vte",
      title: "Blodpropper i vener (VTE)",
      level,
      body: `<p>Uden MHT får ca. 4–7 af 1.000 kvinder i 50'erne en VTE over 5 år (højere efter 60 år). ${tal}</p>`,
      mods,
      nnh: s.vej === "transdermal"
        ? { tal: null, tekst: "Ikke relevant — transdermal behandling øger ikke påviseligt risikoen." }
        : s.uterus
          ? { tal: nnhRange(5, 10), tekst: `Behandles ${nnhRange(5, 10)} kvinder i 5 år med oral kombineret behandling, får 1 ekstra en blodprop.` }
          : { tal: nnhRange(1, 4), tekst: `Behandles ${nnhRange(1, 4)} kvinder i 5 år med oral østrogen alene, får 1 ekstra en blodprop.` },
      journal: `VTE: ${s.vej === "transdermal" ? "ingen påvist øgning ved transdermal behandling" : s.uterus ? `ca. 5–10 ekstra pr. 1.000 over 5 år (oral kombineret); NNH ca. ${nnhRange(5, 10)}` : `ca. 1–4 ekstra pr. 1.000 over 5 år (oral østrogen alene); NNH ca. ${nnhRange(1, 4)}`}`,
    };
  }

  function apopleksiCard(s) {
    const baggrund = over60(s) ? 14 : 8;
    const ekstra = over60(s) ? 4 : 3;
    const mods = [];
    const karFaktorer = ["htn", "diabetes", "ryger", "migraene"].filter((k) => has(s, k));
    let level;
    let tal;
    if (s.vej === "transdermal") {
      tal = "Transdermal østrogen op til 50 mikrog./døgn <strong>øger ikke påviseligt risikoen</strong>.";
      level = karFaktorer.length ? "moderat" : "lav";
    } else {
      tal = `Oral behandling: ca. <strong>${ekstra} ekstra pr. 1.000</strong> over 5 år (relativ risiko ca. 1,3 i WHI).`;
      // Kun karrisikofaktorer løfter til "høj"; alder alene giver moderat, da
      // den ekstra risiko er lille i absolutte tal og kan fjernes ved skift.
      level = karFaktorer.length ? "hoej" : "moderat";
      mods.push("<strong>Dosis:</strong> i et dansk registerstudie (BMJ 2026) sås øget apopleksi kun ved oral estradiol over 1 mg/døgn i mere end 1 år — hold en oral dosis på højst 1 mg/døgn.");
    }
    if (has(s, "hjertekar")) {
      level = "hoej";
      mods.push("<strong>Kendt hjerte-kar-sygdom:</strong> tidligere apopleksi eller AMI er som udgangspunkt kontraindikation — konferér før opstart.");
    }
    karFaktorer.forEach((k) => mods.push(`<strong>${RF_LABELS[k].charAt(0).toUpperCase() + RF_LABELS[k].slice(1)}:</strong> øger baggrundsrisikoen${k === "htn" ? " — regulér blodtrykket før opstart" : ""}.`));
    if (s.vej === "oral" && (karFaktorer.length || over60(s))) mods.push("<strong>Anbefaling:</strong> skift til transdermal behandling i laveste effektive dosis.");
    return {
      key: "apopleksi",
      title: "Iskæmisk apopleksi",
      level,
      body: `<p>Uden MHT får ca. ${baggrund} af 1.000 kvinder i ${over60(s) ? "60'erne" : "50'erne"} en iskæmisk apopleksi over 5 år. ${tal}</p>`,
      mods,
      nnh: s.vej === "transdermal"
        ? { tal: null, tekst: "Ikke relevant — transdermal behandling op til 50 mikrog./døgn øger ikke påviseligt risikoen." }
        : { tal: nnhOf(ekstra), tekst: `Behandles ${nnhOf(ekstra)} kvinder i ${over60(s) ? "60'erne" : "50'erne"} i 5 år med oral behandling, får 1 ekstra en iskæmisk apopleksi.` },
      journal: `Apopleksi: ${s.vej === "transdermal" ? "ingen påvist øgning ved transdermal ≤ 50 mikrog." : `ca. ${ekstra} ekstra pr. 1.000 over 5 år (oral); NNH ca. ${nnhOf(ekstra)}`}`,
    };
  }

  function hjerteCard(s) {
    const mods = [];
    let level = "lav";
    let tekst = "Ved opstart før 60 år og inden for 10 år efter menopausen ses <strong>ingen øget risiko</strong> for iskæmisk hjertesygdom — muligvis en lille beskyttende effekt. MHT anbefales dog ikke som forebyggelse.";
    if (senOpstart(s)) {
      level = "moderat";
      tekst = "Ved opstart efter 60 år eller mere end 10 år efter menopausen ses en <strong>lille øget risiko</strong> for iskæmisk hjertesygdom i de første behandlingsår.";
    }
    if (has(s, "hjertekar")) {
      level = "hoej";
      mods.push("<strong>Kendt hjerte-kar-sygdom:</strong> MHT bruges ikke som sekundær forebyggelse — konferér før opstart.");
    }
    return {
      key: "hjerte",
      title: "Iskæmisk hjertesygdom",
      level,
      body: `<p>${tekst}</p>`,
      mods,
      nnh: { tal: null, tekst: senOpstart(s) ? "Ikke opgjort — lille øgning ved sen opstart, men ikke kvantificeret i kilderne." : "Ikke relevant — ingen øget risiko ved opstart før 60 år." },
      journal: `Iskæmisk hjertesygdom: ${senOpstart(s) ? "lille øget risiko ved sen opstart" : "ingen øget risiko ved opstart < 60 år"}`,
    };
  }

  function endometrieCard(s) {
    if (!s.uterus) return null;
    const mods = [];
    let level;
    let tal;
    if (s.regime === "kontinuerlig") {
      level = "lav";
      tal = "Kontinuerlig kombineret behandling: <strong>ingen øget risiko</strong> (dansk kohorte RR 1,0; i Million Women Study endda lavere, RR 0,71).";
    } else if (s.regime === "sekventiel") {
      level = "moderat";
      tal = "Sekventiel behandling: studierne er uenige — <strong>ingen øgning</strong> i Million Women Study (RR 1,05), men <strong>ca. fordoblet</strong> risiko i den danske kohorte (RR ca. 2), især ved langvarig brug. En fordobling svarer til <strong>højst ca. 5 ekstra pr. 1.000</strong> frem til 65 år ved langvarig brug — færre ved kortere brug. Skift til kontinuerlig behandling, når patienten er postmenopausal.";
    } else {
      level = "lav";
      tal = "Mirena beskytter endometriet (godkendt i op til 5 år).";
    }
    if (has(s, "endorisiko") || bmiHigh(s)) {
      level = maxLevel(level, "moderat");
      mods.push(`<strong>${has(s, "endorisiko") ? "Øget risiko for endometriecancer" : `BMI ${fmtNum(s.bmi)}`}:</strong> højere baggrundsrisiko — foretræk kontinuerlig kombineret behandling eller Mirena, og hav lav tærskel for udredning af blødning.`);
    }
    if (s.varighed === 10 && s.regime !== "mirena") {
      mods.push("<strong>Langvarig brug med mikroniseret progesteron (Utrogestan):</strong> endometriebeskyttelsen er kun dokumenteret i ca. 5 år — overvej Mirena eller et syntetisk gestagen ved længere brug.");
    }
    return {
      key: "endometrie",
      title: "Endometriecancer",
      level,
      body: `<p>Uden MHT får ca. 5 af 1.000 kvinder med uterus endometriecancer mellem 50 og 65 år (EU-produktresumé). ${tal} Østrogen alene med bevaret uterus giver 5–55 ekstra pr. 1.000 afhængigt af dosis og varighed og gives aldrig.</p>`,
      mods,
      nnh: s.regime === "sekventiel"
        ? { tal: `≥ ${nnhOf(5)}`, tekst: `I værste fald (dansk kohorte, langvarig brug) får 1 ud af ca. ${nnhOf(5)} kvinder med sekventiel behandling en ekstra endometriecancer frem til 65 år — ved kortere brug og i Million Women Study færre.` }
        : { tal: null, tekst: s.regime === "mirena" ? "Ikke relevant — Mirena beskytter endometriet." : "Ikke relevant — ingen øget risiko ved kontinuerlig kombineret behandling." },
      journal: `Endometriecancer: ${s.regime === "kontinuerlig" ? "ingen øget risiko (kontinuerlig)" : s.regime === "sekventiel" ? `RR 1,0–2 ved sekventiel (uenige studier); NNH ≥ ${nnhOf(5)} — skift til kontinuerlig planlagt` : "beskyttet af Mirena"}`,
    };
  }

  function ovarieCard(s) {
    const mods = [];
    if (has(s, "brca")) mods.push("<strong>BRCA:</strong> risikoen for æggestokkræft håndteres ved forebyggende fjernelse af æggestokkene efter specialistvurdering.");
    return {
      key: "ovarie",
      title: "Æggestokkræft",
      level: "lav",
      body: `<p>Uden MHT får ca. 1 af 1.000 kvinder i starten af 50'erne æggestokkræft over 5 år. Med 5 års brug fra omkring 50 år: ca. <strong>0,5–1 ekstra pr. 1.000</strong> (EU-produktresumé og Lancet 2015).${s.varighed === 10 ? " Ved 10 års brug er det ekstra antal formentlig lidt større." : ""}</p>`,
      mods,
      nnh: { tal: nnhRange(0.5, 1), tekst: `Behandles ${nnhRange(0.5, 1)} kvinder i 5 år, får 1 ekstra æggestokkræft.` },
      journal: `Æggestokkræft: ca. 0,5–1 ekstra pr. 1.000 ved 5 års brug; NNH ca. ${nnhRange(0.5, 1)}`,
    };
  }

  function demensCard(s) {
    if (!alderKendt(s) || s.alder < 65) return null;
    // WHIMS (≥ 65 år): kombineret 45 vs. 22 pr. 10.000 kvindeår = 23 ekstra,
    // dvs. ca. 11,5 pr. 1.000 over 5 år (ekstrapoleret fra ca. 4 års opfølgning).
    const kombineret = s.uterus;
    return {
      key: "demens",
      title: "Demens",
      level: "moderat",
      body: kombineret
        ? "<p>Opstart efter 65 år med kombineret behandling fordoblede risikoen for demens i WHI's demensstudie (WHIMS): <strong>ca. 2 ekstra pr. 1.000 pr. år</strong> (45 mod 22 pr. 10.000 kvindeår). Studiet brugte oral konjugeret østrogen + medroxyprogesteron — betydningen for transdermal behandling er ukendt. MHT anbefales ikke til forebyggelse af kognitiv svækkelse.</p>"
        : "<p>Opstart efter 65 år med østrogen alene var i WHI's demensstudie (WHIMS) forbundet med en <strong>ikke-signifikant øget risiko</strong> for demens. MHT anbefales ikke til forebyggelse af kognitiv svækkelse.</p>",
      mods: [],
      nnh: kombineret
        ? { tal: nnhOf(11.5), tekst: `Behandles ca. ${nnhOf(11.5)} kvinder over 65 år i 5 år med kombineret behandling, får 1 ekstra demens (WHIMS, ekstrapoleret fra ca. 4 års opfølgning).` }
        : { tal: null, tekst: "Ikke beregnet — øgningen var ikke statistisk sikker for østrogen alene (WHIMS)." },
      journal: kombineret ? `Demens: ca. 2 ekstra pr. 1.000 pr. år ved kombineret opstart efter 65 år (WHIMS); NNH ca. ${nnhOf(11.5)} over 5 år` : "Demens: ikke-signifikant øgning ved østrogen alene efter 65 år (WHIMS)",
    };
  }

  function gevinstCard(s) {
    const mods = [];
    if (has(s, "osteo")) mods.push("<strong>Osteoporose/høj frakturrisiko:</strong> knoglegevinsten vejer tungere; ved ophør vurderes anden osteoporosebehandling.");
    if (tidligMenopause(s)) mods.push("<strong>Menopause før 45 år:</strong> MHT anbefales til ca. 51 år for at beskytte knogler og hjerte-kar — uanset symptomer.");
    return {
      key: "gevinst",
      title: "Gevinster",
      level: "gavn",
      body: `<ul>
        <li><strong>Hedeture og svedeture</strong> reduceres med ca. 75 %; ofte bedre søvn og livskvalitet.</li>
        <li><strong>Knogler:</strong> ca. 30 % færre frakturer (fx hoftebrud) under behandling; effekten aftager efter ophør.</li>
        <li><strong>Urogenitale gener</strong> bedres (ved behov suppleret med lokal østrogen).</li>
        <li><strong>Samlet dødelighed er ikke øget</strong> — hverken i WHI efter 18 års opfølgning eller i et dansk registerstudie (BMJ 2026).</li>
      </ul>`,
      mods,
      journal: `Gevinster: færre hedeture (ca. 75 %), ca. 30 % færre frakturer${has(s, "osteo") ? " (vigtigt pga. osteoporose)" : ""}`,
    };
  }

  function renderCard(c) {
    const L = LEVEL[c.level];
    const mods = c.mods.length ? `<ul class="risk-mods">${c.mods.map((m) => `<li>${m}</li>`).join("")}</ul>` : "";
    const nnh = c.nnh
      ? `<div class="nnh${c.nnh.tal ? "" : " nnh-none"}"><span class="nnh-num">${c.nnh.tal ? `NNH ${nnhLabel(c.nnh.tal)}` : "NNH: –"}</span><span class="nnh-txt">${c.nnh.tekst}</span></div>`
      : "";
    return `<div class="box ${L.cls} risk-card">
      <div class="risk-head"><h3>${c.title}</h3><span class="chip ${L.chip}">${L.label}</span></div>
      ${nnh}
      ${c.body}
      ${mods}
    </div>`;
  }

  // Laveste (værste) NNH som tal; ved intervaller bruges den laveste grænse.
  function nnhValue(c) {
    if (!c.nnh || !c.nnh.tal) return Infinity;
    return parseInt(c.nnh.tal.replace("≥", "").split("–")[0].replace(/\D/g, ""), 10);
  }

  function nnhBox(cards) {
    const rows = cards
      .filter((c) => c.nnh)
      .map((c) => `<tr><td>${c.title}</td><td data-label="NNH"><strong>${c.nnh.tal ? nnhLabel(c.nnh.tal) : "–"}</strong></td><td data-label="Betydning">${c.nnh.tekst}</td></tr>`)
      .join("");
    return `<div class="box box-blue nnh-box"><h3>Number needed to harm (NNH)</h3>
      <p><strong>NNH</strong> er det antal kvinder, der skal behandles i den angivne periode, for at <strong>én ekstra</strong> får sygdommen på grund af MHT. <strong>Jo højere tal, jo sjældnere skade.</strong> Beregnet som 1.000 ÷ ekstra tilfælde pr. 1.000 og afrundet; intervaller afspejler usikkerhed i kilderne.</p>
      <div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr><th>Udfald</th><th>NNH</th><th>Betydning</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p>NNH gælder for en gruppe kvinder med samme alder og behandling — ikke for den enkelte. Patientens egne risikofaktorer (se kortene nedenfor) kan gøre hendes NNH lavere eller højere. Tidsrammen står i hver linje: VTE, apopleksi og æggestokkræft gælder 5 års brug, brystkræft den valgte varighed.</p>
      <p>Kortenes farve afspejler også, om risikoen bør ændre behandlingen (fx at transdermal behandling fjerner den) — ikke kun størrelsen af NNH.</p>
    </div>`;
  }

  function summaryBox(s, cards) {
    const hoej = cards.filter((c) => c.level === "hoej");
    const moderat = cards.filter((c) => c.level === "moderat");
    const scenario = `<p><strong>Scenarie:</strong> ${alderKendt(s) ? `${s.alder} år, ` : ""}${regimeText(s)} i ca. ${s.varighed} år.${s.rf.length ? ` Risikofaktorer: ${s.rf.map((k) => RF_LABELS[k]).join(", ")}.` : ""}</p>`;
    const alderNote = !alderKendt(s)
      ? "<p>Angiv alder for en aldersspecifik vurdering — tallene nedenfor gælder opstart i 50'erne.</p>"
      : "";
    const worst = cards.filter((c) => nnhValue(c) !== Infinity).sort((a, b) => nnhValue(a) - nnhValue(b))[0];
    const worstNote = worst
      ? `<p><strong>Største ekstra risiko:</strong> ${worst.title.toLowerCase()} — <strong>NNH ${nnhLabel(worst.nnh.tal)}</strong>. ${worst.nnh.tekst}</p>`
      : "";
    if (hoej.length) {
      return box("box-red", "Samlet: høj risiko på ét eller flere områder", `${scenario}${worstNote}<p>${hoej.map((c) => c.title).join(", ")}: overvej alternativer, justér behandlingen eller konferér med specialist før opstart. Se hvordan risikoen kan mindskes nedenfor.</p>${alderNote}`);
    }
    if (moderat.length) {
      return box("box-amber", "Samlet: moderat ekstra risiko", `${scenario}${worstNote}<p>${moderat.map((c) => c.title).join(", ")}: den ekstra risiko er lille i absolutte tal og kan ofte mindskes (se nedenfor). For de fleste med generende symptomer overstiger gevinsten fortsat risikoen.</p>${alderNote}`);
    }
    return box("box-green", "Samlet: lav ekstra risiko", `${scenario}${worstNote}<p>For kvinder under 60 år med generende symptomer overstiger gevinsten typisk risikoen ved dette regime.</p>${alderNote}`);
  }

  function reduceBox(s) {
    const items = [];
    if (s.vej === "oral") items.push("<strong>Skift til transdermal østrogen</strong> — fjerner den ekstra risiko for blodpropper og formentlig apopleksi.");
    if (s.uterus && s.regime === "sekventiel") items.push("<strong>Skift til kontinuerlig kombineret behandling</strong>, når patienten er postmenopausal — ingen øget risiko for endometriecancer.");
    if (s.uterus && s.regime !== "mirena") items.push("<strong>Vælg mikroniseret progesteron eller dydrogesteron</strong> frem for syntetiske gestagener — muligvis lavere brystkræftrisiko.");
    items.push("<strong>Laveste effektive dosis</strong> og årlig revurdering af indikation og varighed — brystkræftrisikoen stiger med varigheden.");
    if (bmiHigh(s)) items.push("<strong>Vægttab</strong> mindsker risikoen for brystkræft, blodpropper og endometriecancer.");
    if (has(s, "alkohol")) items.push("<strong>Mindre alkohol</strong> — højst 10 genstande om ugen.");
    if (has(s, "ryger")) items.push("<strong>Rygestop</strong> — mindsker risikoen for blodpropper, apopleksi og hjertesygdom.");
    if (has(s, "htn")) items.push("<strong>Regulér blodtrykket</strong> før opstart.");
    items.push("<strong>Mammografiscreening</strong> følges som normalt.");
    return box("box-blue", "Sådan mindskes risikoen", `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>
      <p>Valg af præparat og dosis: se <a href="${KLIMAKTERIE_URL}" target="_blank" rel="noopener">Klimakterieguiden</a>.</p>`);
  }

  function box(cls, title, body) {
    return `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  }

  function update() {
    const s = getState();
    regimeField.hidden = !s.uterus;
    const cards = [brystCard(s), vteCard(s), apopleksiCard(s), hjerteCard(s), endometrieCard(s), ovarieCard(s), demensCard(s)].filter(Boolean);
    const gevinst = gevinstCard(s);
    lastCards = cards.concat([gevinst]);
    output.innerHTML =
      summaryBox(s, cards) +
      nnhBox(cards) +
      cards.map(renderCard).join("") +
      renderCard(gevinst) +
      reduceBox(s) +
      `<p class="source-note">Tal pr. 1.000 kvinder er afrundede befolkningstal (MHRA 2019, WHI/EU-produktresuméer, dansk registerstudie BMJ 2026, Mørch 2016, Million Women Study) og gælder primært opstart i 50'erne. Brystkræfttallene er britiske. Tallene bygger delvist på ældre præparater (konjugeret østrogen, syntetiske gestagener) — ved moderne transdermal behandling er risikoen for blodpropper og apopleksi formentlig lavere.</p>`;
  }

  // Kort, redigerbart journalnotat.
  function buildJournalNote() {
    const s = getState();
    const lines = [`MHT-risikovurdering ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (alderKendt(s)) basis.push(`${s.alder} år`);
    if (s.bmi !== null && !isNaN(s.bmi)) basis.push(`BMI ${fmtNum(s.bmi)}`);
    basis.push(`planlagt ${regimeText(s)} i ca. ${s.varighed} år`);
    lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    lines.push(`Risikofaktorer: ${s.rf.length ? s.rf.map((k) => RF_LABELS[k]).join(", ") : "ingen markeret"}.`);
    lastCards.forEach((c) => lines.push(`- ${c.journal} [${LEVEL[c.level].label.toLowerCase()}]`));
    const heading = output.querySelector(".box h3");
    if (heading) lines.push(heading.textContent.trim() + ".");
    lines.push("Drøftet med patienten (tilpas): gevinst og risiko i absolutte tal, alternativer, mammografiscreening og årlig revurdering.");
    return lines.join("\n");
  }

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      const chip = boxEl.querySelector(".chip");
      if (h3) lines.push(h3.textContent.trim().toUpperCase() + (chip ? ` — ${chip.textContent.trim()}` : ""));
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .nnh, :scope > .drug-table-wrap").forEach((el) => {
        if (el.tagName === "P") lines.push(el.textContent.trim());
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else if (el.classList.contains("nnh")) lines.push(Array.from(el.children).map((x) => x.textContent.trim()).join(": "));
        else el.querySelectorAll("tbody tr").forEach((tr) => lines.push("  * " + Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim()).join(" — ")));
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  update();
})();
