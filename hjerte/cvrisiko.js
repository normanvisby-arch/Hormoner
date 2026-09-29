/*
 * Kardiovaskulær risiko: SCORE2 (40–69 år), SCORE2-OP (70–89 år) og
 * SCORE2-Diabetes (type 2-diabetes, 40–69 år), kalibreret til ESC's
 * lavrisikoregion (Danmark). Koefficienter fra de publicerede algoritmer
 * (Eur Heart J 2021 og 2023), kontrolleret mod R-pakken RiskScorescvd og
 * Python-pakken cvd-risk. Behandlingstærskler og mål: DCS' NBV.
 * Effekt: CTT (RR 0,78 pr. 1 mmol/l LDL) og BPLTTC (RR 0,90 pr. 5 mmHg).
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
  const alderWarning = document.getElementById("alderWarning");
  const dmFields = document.getElementById("dmFields");
  const printMeta = document.getElementById("printMeta");

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) {
        printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede værdier.";
      }
      window.print();
    });
  }

  resetBtn.addEventListener("click", () => {
    form.reset();
    // form.reset() does not fire "input"/"change", so re-sync dependent UI.
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

  const num = (id) => {
    const v = document.getElementById(id).value;
    return v === "" ? NaN : parseFloat(v.replace(",", "."));
  };
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);

  function getState() {
    const diabetes = radio("diabetes") === "ja";
    dmFields.hidden = !diabetes;
    return {
      mand: radio("koen") === "mand",
      alder: num("alder"),
      ryger: radio("ryger") === "ja",
      sbp: num("sbp"),
      tchol: num("tchol"),
      hdl: num("hdl"),
      ldl: num("ldl"),
      diabetes,
      dmAlder: num("dmAlder"),
      hba1c: num("hba1c"),
      egfr: num("egfr"),
      organ: diabetes && checked("organ").length > 0,
      udelad: checked("udelad"),
      statin: radio("statin"),
      bpdrop: isNaN(num("bpdrop")) ? 0 : Math.max(0, num("bpdrop")),
    };
  }

  // ---------------------------------------------------------------------
  // Modeller (lavrisikoregion)
  // ---------------------------------------------------------------------

  const calibrate = (p, s1, s2) => 1 - Math.exp(-Math.exp(s1 + s2 * Math.log(-Math.log(1 - p))));

  function score2(s, ryger) {
    const cage = (s.alder - 60) / 5;
    const csbp = (s.sbp - 120) / 20;
    const ctc = s.tchol - 6;
    const chdl = (s.hdl - 1.3) / 0.5;
    const sm = ryger ? 1 : 0;
    const lp = s.mand
      ? 0.3742 * cage + 0.6012 * sm + 0.2777 * csbp + 0.1458 * ctc - 0.2698 * chdl - 0.0755 * cage * sm - 0.0255 * cage * csbp - 0.0281 * cage * ctc + 0.0426 * cage * chdl
      : 0.4648 * cage + 0.7744 * sm + 0.3131 * csbp + 0.1002 * ctc - 0.2606 * chdl - 0.1088 * cage * sm - 0.0277 * cage * csbp - 0.0226 * cage * ctc + 0.0613 * cage * chdl;
    const p = 1 - Math.pow(s.mand ? 0.9605 : 0.9776, Math.exp(lp));
    return 100 * (s.mand ? calibrate(p, -0.5699, 0.7476) : calibrate(p, -0.738, 0.7019));
  }

  function score2op(s, ryger) {
    const cage = s.alder - 73;
    const csbp = s.sbp - 150;
    const ctc = s.tchol - 6;
    const chdl = s.hdl - 1.4;
    const sm = ryger ? 1 : 0;
    const dm = s.diabetes ? 1 : 0;
    const lp = s.mand
      ? 0.0634 * cage + 0.4245 * dm + 0.3524 * sm + 0.0094 * csbp + 0.085 * ctc - 0.3564 * chdl - 0.0174 * cage * dm - 0.0247 * cage * sm - 0.0005 * cage * csbp + 0.0073 * cage * ctc + 0.0091 * cage * chdl
      : 0.0789 * cage + 0.601 * dm + 0.4921 * sm + 0.0102 * csbp + 0.0605 * ctc - 0.304 * chdl - 0.0107 * cage * dm - 0.0255 * cage * sm - 0.0004 * cage * csbp - 0.0009 * cage * ctc + 0.0154 * cage * chdl;
    const p = 1 - Math.pow(s.mand ? 0.7576 : 0.8082, Math.exp(lp - (s.mand ? 0.0929 : 0.229)));
    return 100 * (s.mand ? calibrate(p, -0.34, 1.19) : calibrate(p, -0.52, 1.01));
  }

  function score2dm(s, ryger) {
    const cage = (s.alder - 60) / 5;
    const csbp = (s.sbp - 120) / 20;
    const ctc = s.tchol - 6;
    const chdl = (s.hdl - 1.3) / 0.5;
    const sm = ryger ? 1 : 0;
    const cdage = (s.dmAlder - 50) / 5;
    const chb = (s.hba1c - 31) / 9.34;
    const cegfr = (Math.log(s.egfr) - 4.5) / 0.15;
    const lp = s.mand
      ? 0.5368 * cage + 0.4774 * sm + 0.1322 * csbp + 0.6457 + 0.1102 * ctc - 0.1087 * chdl - 0.0672 * cage * sm - 0.0268 * cage * csbp - 0.0983 * cage - 0.0181 * cage * ctc + 0.0095 * cage * chdl - 0.0998 * cdage + 0.0955 * chb - 0.0591 * cegfr + 0.0058 * cegfr * cegfr - 0.0134 * chb * cage + 0.0115 * cegfr * cage
      : 0.6624 * cage + 0.6139 * sm + 0.1421 * csbp + 0.8096 + 0.1127 * ctc - 0.1568 * chdl - 0.1122 * cage * sm - 0.0167 * cage * csbp - 0.1272 * cage - 0.02 * cage * ctc + 0.0186 * cage * chdl - 0.118 * cdage + 0.1173 * chb - 0.064 * cegfr + 0.0062 * cegfr * cegfr - 0.0196 * chb * cage + 0.0169 * cegfr * cage;
    const p = 1 - Math.pow(s.mand ? 0.9605 : 0.9776, Math.exp(lp));
    return 100 * (s.mand ? calibrate(p, -0.5699, 0.7476) : calibrate(p, -0.738, 0.7019));
  }

  // ---------------------------------------------------------------------
  // Hjælpere
  // ---------------------------------------------------------------------

  const fmt1 = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  const fmtInt = (n) => n.toLocaleString("da-DK");
  function roundNnt(x) {
    if (x < 100) return Math.max(1, Math.round(x / 5) * 5);
    if (x < 1000) return Math.round(x / 10) * 10;
    return Math.round(x / 100) * 100;
  }
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;

  // DCS: indikation for supplerende medicinsk behandling ved 10-års risiko over
  // 5,0 % (40–59 år), 7,5 % (60–69 år) og 10,0 % (70–75 år); over 75 år individuelt.
  function dcsTaerskel(alder) {
    if (alder < 60) return 5;
    if (alder < 70) return 7.5;
    if (alder <= 75) return 10;
    return null;
  }
  // ESC 2021: risikokategori efter alder (ikke-diabetes).
  function escKategori(alder, r) {
    const [a, b] = alder < 50 ? [2.5, 7.5] : alder < 70 ? [5, 10] : [7.5, 15];
    return r < a ? "lav til moderat" : r < b ? "høj" : "meget høj";
  }
  // ESC 2023: SCORE2-Diabetes-kategorier.
  const dmKategori = (r) => (r < 5 ? "lav" : r < 10 ? "moderat" : r < 20 ? "høj" : "meget høj");

  function checkInputs(s) {
    const msgs = [];
    if (!isNaN(s.alder) && (s.alder < 40 || s.alder > 89)) msgs.push("SCORE2-modellerne gælder for 40–89 år.");
    alderWarning.textContent = msgs.join(" ");
    const mangler = [];
    if (isNaN(s.alder)) mangler.push("alder");
    if (isNaN(s.sbp)) mangler.push("systolisk blodtryk");
    if (isNaN(s.tchol)) mangler.push("totalkolesterol");
    if (isNaN(s.hdl)) mangler.push("HDL");
    if (s.diabetes && s.alder < 70) {
      if (isNaN(s.dmAlder)) mangler.push("alder ved diabetesdiagnose");
      if (isNaN(s.hba1c)) mangler.push("HbA1c");
      if (isNaN(s.egfr)) mangler.push("eGFR");
    }
    const fejl = [];
    // Plausible intervaller: værdier uden for dem er næsten altid tastefejl
    // (fx mmol/l og mg/dl forvekslet) og giver meningsløse modelresultater.
    const graenser = [
      ["sbp", "Systolisk blodtryk", 70, 270, "mmHg"],
      ["tchol", "Totalkolesterol", 1.5, 20, "mmol/l"],
      ["hdl", "HDL", 0.2, 5, "mmol/l"],
      ["ldl", "LDL", 0.2, 15, "mmol/l"],
    ];
    if (s.diabetes) graenser.push(["hba1c", "HbA1c", 20, 200, "mmol/mol"], ["egfr", "eGFR", 5, 200, "ml/min/1,73 m²"], ["dmAlder", "Alder ved diabetesdiagnose", 10, 100, "år"]);
    graenser.forEach(([k, navn, lo, hi, enhed]) => {
      if (!isNaN(s[k]) && (s[k] < lo || s[k] > hi)) fejl.push(`${navn} ${String(s[k]).replace(".", ",")} ${enhed} er uden for det plausible område (${String(lo).replace(".", ",")}–${hi}) — tjek værdi og enhed.`);
    });
    if (!isNaN(s.hdl) && !isNaN(s.tchol) && s.hdl >= s.tchol) fejl.push("HDL kan ikke være større end totalkolesterol.");
    if (s.diabetes && !isNaN(s.dmAlder) && !isNaN(s.alder) && s.dmAlder > s.alder) fejl.push("Alder ved diabetesdiagnose kan ikke være højere end alderen.");
    return { mangler, fejl, gyldig: !mangler.length && !fejl.length && s.alder >= 40 && s.alder <= 89 };
  }

  // Beregner risiko med den relevante model.
  function beregn(s, ryger = s.ryger) {
    if (s.alder >= 70) return { model: "SCORE2-OP", risk: score2op(s, ryger) };
    if (s.diabetes) return { model: "SCORE2-Diabetes", risk: score2dm(s, ryger) };
    return { model: "SCORE2", risk: score2(s, ryger) };
  }

  function effekt(s, risk) {
    const pct = { ingen: 0, moderat: 0.35, hoej: 0.5 }[s.statin];
    const ldlKendt = !isNaN(s.ldl);
    // Uden målt LDL skønnes den ud fra non-HDL (Friedewald med triglycerid ca. 1,5 mmol/l).
    const ldlSkoen = Math.max(1, s.tchol - s.hdl - 0.7);
    const dLdl = pct ? (ldlKendt ? s.ldl : ldlSkoen) * pct : 0;
    const rrStatin = Math.pow(0.78, dLdl);
    const rrBt = Math.pow(0.9, s.bpdrop / 5);
    const rr = rrStatin * rrBt;
    const prevented = risk * (1 - rr);
    return { pct, ldlKendt, ldlSkoen, dLdl, rrStatin, rrBt, rr, treated: risk * rr, prevented, nnt: prevented > 0 ? 100 / prevented : Infinity };
  }

  function iconArray(treated, prevented) {
    const t = Math.round(treated * 10);
    const f = Math.round(prevented * 10);
    let cells = "";
    for (let i = 0; i < 1000; i++) cells += `<span class="ia-cell ${i < t ? "ia-base" : i < t + f ? "ia-saved" : "ia-none"}"></span>`;
    const ingen = 1000 - t - f;
    return `<figure class="icon-array" aria-label="Ud af 1.000 personer over 10 år: ${t} får en hjerte-kar-hændelse trods behandling, ${f} hændelser forebygges, ${ingen} får ingen hændelse">
      <div class="ia-grid" aria-hidden="true">${cells}</div>
      <figcaption class="ia-legend">
        <span><span class="ia-key ia-base"></span>${t} får hændelse trods behandling</span>
        <span><span class="ia-key ia-saved"></span>${f} hændelser forebygges</span>
        <span><span class="ia-key ia-none"></span>${ingen} får ingen hændelse</span>
      </figcaption>
    </figure>`;
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  let last = null;

  function ldlMaal(s, gruppe) {
    if (gruppe === "ascvd") return "LDL &lt; 1,4 mmol/l og mindst 50 % reduktion";
    if (gruppe === "meget") return "LDL &lt; 1,4 mmol/l og mindst 50 % reduktion (meget høj risiko, ESC 2023)";
    if (gruppe === "hoej") return "LDL &lt; 1,8 mmol/l og mindst 50 % reduktion";
    if (gruppe === "moderat") return "LDL &lt; 2,6 mmol/l (moderat risiko, ESC 2023)";
    return "LDL &lt; 2,6 mmol/l og mindst 50 % reduktion";
  }

  function btBox(s, res) {
    const items = [];
    if (s.sbp >= 180) items.push("<strong>Systolisk blodtryk ≥ 180 mmHg:</strong> medicinsk behandling uanset beregnet risiko.");
    items.push(`<strong>Behandlingsmål:</strong> ${!isNaN(s.alder) && s.alder >= 80 ? "systolisk 130–144 mmHg (80 år og derover)" : "120–135/70–85 mmHg (18–80 år)"} — målt som uobserveret automatisk klinik-, hjemme- eller døgnblodtryk (DCS).`);
    items.push("<strong>Hypertension</strong> (hjemme-/dagtidsblodtryk ≥ 135/85 mmHg, klinikblodtryk ≥ 140/90): medicinsk behandling anbefales uanset beregnet risiko — ved lav risiko efter et kort forsøg med livsstilsændringer.");
    items.push("<strong>Let forhøjet blodtryk</strong> (hjemme/dagtid 130–134/80–84): medicin anbefales, hvis SCORE2 ≥ 10 % / SCORE2-OP ≥ 15 %, og livsstilsændringer ikke har normaliseret blodtrykket.");
    if (s.sbp >= 140 && s.sbp < 180) items.push("<strong>Denne patient:</strong> systolisk " + s.sbp + " mmHg — bekræft med hjemme- eller døgnblodtryk; ved hypertension er der indikation for behandling uanset SCORE2.");
    if (res && res.risk >= (s.alder >= 70 ? 15 : 10)) items.push(`<strong>Denne patient:</strong> ${res.model} ${fmt1(res.risk)} % — over grænsen for medicin ved let forhøjet blodtryk.`);
    if (s.diabetes) items.push("<strong>Diabetes:</strong> ACE-hæmmer eller angiotensin II-receptorblokker skal indgå i behandlingen.");
    return `<div class="box box-blue box-collapsible"><details><summary><h3>Blodtryk</h3></summary><ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul></details></div>`;
  }

  function livsstilBox(s) {
    const items = ["<strong>Rygestop</strong> er det mest effektive enkelttiltag — tilbyd støtte og evt. vareniclin eller nikotinerstatning.", "Fysisk aktivitet mindst 150 minutter om ugen, middelhavskost, vægttab ved overvægt og højst 10 genstande alkohol om ugen (Sundhedsstyrelsen)."];
    return `<div class="box box-blue box-collapsible"><details><summary><h3>Livsstil</h3></summary><ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul></details></div>`;
  }

  function update() {
    const s = getState();
    const chk = checkInputs(s);
    last = null;
    let html = "";

    // Grupper hvor SCORE2 ikke bruges.
    if (s.udelad.length || (s.diabetes && s.organ)) {
      const ascvd = s.udelad.includes("ascvd");
      const titel = ascvd ? "Kendt hjerte-kar-sygdom: sekundær forebyggelse" : "Høj risiko uden beregning";
      const grunde = [];
      if (ascvd) grunde.push("kendt aterosklerotisk hjerte-kar-sygdom");
      if (s.udelad.includes("fh")) grunde.push("familiær hyperkolesterolæmi");
      if (s.udelad.includes("ckd")) grunde.push("kronisk nyresygdom");
      if (s.diabetes && s.organ) grunde.push("diabetes med organskade");
      html += box(
        ascvd ? "box-red" : "box-amber",
        titel,
        `<p>SCORE2 bruges ikke ved ${grunde.join(", ")} — risikoen er høj eller meget høj i forvejen.</p>
        <ul class="followup-list">
          <li><strong>LDL-mål (DCS):</strong> ${ldlMaal(s, ascvd ? "ascvd" : "hoej")}. Statin i høj intensitet; tilføj ezetimib ved utilstrækkelig effekt.</li>
          ${ascvd ? "<li>Trombocythæmmer, blodtryksbehandling og hjerterehabilitering efter NBV for den aktuelle sygdom.</li>" : ""}
          ${s.udelad.includes("ckd") ? "<li><strong>Kronisk nyresygdom:</strong> eGFR 30–59 ml/min (eller albuminuri) giver høj risiko; eGFR under 30 — eller 30–44 med albuminuri — giver meget høj risiko med LDL-mål under 1,4 mmol/l og mindst 50 % reduktion (ESC 2021).</li>" : ""}
          ${s.diabetes && s.organ ? "<li><strong>Diabetes med organskade:</strong> ESC 2023 regner svær organskade (fx eGFR under 45, eller albuminuri kombineret med retinopati/neuropati) som meget høj risiko — LDL under 1,4 mmol/l.</li>" : ""}
          ${s.udelad.includes("fh") ? "<li>Mistanke om familiær hyperkolesterolæmi: henvis til lipidklinik mhp. genetisk udredning og kaskadescreening af familien.</li>" : ""}
        </ul>`
      );
      html += btBox(s, null) + livsstilBox(s);
      output.innerHTML = html;
      return;
    }

    if (!chk.gyldig) {
      const tekst = chk.fejl.length ? chk.fejl.join(" ") : chk.mangler.length ? `Mangler: ${chk.mangler.join(", ")}.` : "Alder uden for 40–89 år — SCORE2-modellerne kan ikke bruges.";
      html += box("box-blue", "Indtast patientens data", `<p>${tekst}</p><p>Modellen vælges automatisk: SCORE2 (40–69 år), SCORE2-Diabetes (type 2-diabetes, 40–69 år) eller SCORE2-OP (70–89 år).</p>`);
      output.innerHTML = html + btBox(s, null) + livsstilBox(s);
      return;
    }

    const res = beregn(s);
    const eff = effekt(s, res.risk);
    const utenRyg = s.ryger ? beregn(s, false) : null;
    last = { s, res, eff, utenRyg };

    // Vurdering
    let kategori;
    let indikation;
    let cls;
    const taerskel = dcsTaerskel(s.alder);
    const vist = Math.round(res.risk * 10) / 10; // sammenlign med den viste, afrundede risiko
    if (res.model === "SCORE2-Diabetes") {
      kategori = `${dmKategori(res.risk)} risiko (ESC 2023)`;
      indikation = "Statin anbefales til praktisk talt alle med type 2-diabetes over 40 år (DES/DSAM, DCS)" +
        (res.risk >= 10 ? " — her med skærpet LDL-mål pga. høj risiko." : res.risk >= 5 ? "." : ". Ved lav beregnet risiko kan starten afgøres ved fælles beslutning (ESC 2023).");
      cls = res.risk >= 10 ? "box-red" : "box-amber";
    } else {
      const esc = escKategori(s.alder, res.risk);
      kategori = `ESC 2021-kategori: ${esc} risiko`;
      if (s.diabetes) {
        // SCORE2-Diabetes gælder kun 40–69 år; fra 70 år indgår diabetes i SCORE2-OP.
        indikation = "Type 2-diabetes: statin anbefales som udgangspunkt (DES/DSAM, DCS) — over 75 år efter individuel vurdering. Risikoen er beregnet med SCORE2-OP, hvor diabetes indgår som risikofaktor (SCORE2-Diabetes gælder kun 40–69 år).";
        cls = "box-amber";
      } else if (taerskel === null) {
        indikation = "Over 75 år har DCS ingen fast tærskel — behandling afgøres individuelt ud fra gevinst, bivirkninger, skrøbelighed og forventet restlevetid.";
        cls = "box-amber";
      } else if (vist > taerskel) {
        indikation = `Over DCS' tærskel for ${s.alder < 60 ? "40–59" : s.alder < 70 ? "60–69" : "70–75"} år (${fmt1(taerskel)} %) — der er ofte indikation for medicinsk behandling ud over livsstilsændringer.`;
        cls = "box-red";
      } else {
        indikation = `Under DCS' tærskel for ${s.alder < 60 ? "40–59" : s.alder < 70 ? "60–69" : "70–75"} år (${fmt1(taerskel)} %) — livsstil; medicin normalt ikke indiceret.`;
        cls = "box-green";
        if (esc !== "lav til moderat") {
          // ESC's age-based categories are stricter than DCS' Danish thresholds.
          indikation += " ESC kategoriserer dog risikoen som høj, hvor behandling kan overvejes efter fælles beslutning.";
          cls = "box-amber";
        }
      }
    }
    const enkelt = [];
    if (s.tchol > 8 || s.ldl > 4.9) enkelt.push("meget højt kolesterol (totalkolesterol > 8 eller LDL > 4,9 mmol/l) — overvej familiær hyperkolesterolæmi; statin er normalt indiceret uanset beregnet risiko");
    if (s.sbp >= 180) enkelt.push("systolisk blodtryk ≥ 180 mmHg — behandling uanset beregnet risiko");
    html += box(
      cls,
      `10-års risiko: ${fmt1(res.risk)} % (${res.model})`,
      `<p>${indikation}</p>
      <p><em>${kategori[0].toUpperCase() + kategori.slice(1)}.</em></p>
      ${enkelt.length ? `<ul>${enkelt.map((e) => `<li><strong>Enkeltfaktor:</strong> ${e}.</li>`).join("")}</ul>` : ""}
      ${s.sbp < 100 || s.sbp >= 180 || s.tchol - s.hdl < 3 || s.tchol - s.hdl >= 7 ? "<p><em>Blodtryk eller non-HDL-kolesterol ligger uden for SCORE2-skemaernes område (systolisk 100–179 mmHg, non-HDL 3,0–6,9 mmol/l) — modellen ekstrapolerer, og tallet er mere usikkert.</em></p>" : ""}
      ${utenRyg ? `<p><strong>Ved rygestop:</strong> ca. ${fmt1(utenRyg.risk)} % (modelberegnet som ikke-ryger — gevinsten indtræder gradvist).</p>` : ""}
      <p>Svarer til ca. <strong>${Math.round(res.risk * 10)} af 1.000</strong> personer med samme risikoprofil, som får hjerte-kar-død, AMI eller apopleksi inden for 10 år.</p>`
    );

    // Effekt af behandling
    const beh = [];
    if (eff.pct) beh.push(`${s.statin === "hoej" ? "statin i høj intensitet" : "statin i moderat intensitet"} (LDL −${fmt1(eff.dLdl)} mmol/l${eff.ldlKendt ? "" : ", skønnet"})`);
    if (s.bpdrop) beh.push(`blodtryk −${s.bpdrop} mmHg`);
    if (beh.length) {
      html += `<div class="box box-blue risk-card">
        <div class="risk-head"><h3>Effekt af behandling over 10 år</h3><span class="chip chip-gavn">${fmt1((1 - eff.rr) * 100)} % lavere risiko</span></div>
        <div class="nnh"><span class="nnh-num">NNT ≈ ${fmtInt(roundNnt(eff.nnt))}</span><span class="nnh-txt">Behandles ca. ${fmtInt(roundNnt(eff.nnt))} personer i 10 år med ${beh.join(" og ")}, undgår 1 en hjerte-kar-hændelse.</span></div>
        <p>Uden behandling: ca. <strong>${Math.round(res.risk * 10)} af 1.000</strong>. Med behandling: ca. <strong>${Math.round(eff.treated * 10)} af 1.000</strong> — ca. <strong>${Math.round(eff.prevented * 10)} hændelser forebygges</strong>.</p>
        ${iconArray(eff.treated, eff.prevented)}
        ${!eff.ldlKendt && eff.pct ? `<p>LDL er ikke indtastet — skønnet til ca. ${fmt1(eff.ldlSkoen)} mmol/l ud fra totalkolesterol minus HDL minus 0,7 (antager normale triglycerider). Indtast LDL for et mere præcist skøn.</p>` : ""}
      </div>`;
    }

    // Lipider
    const dm = res.model === "SCORE2-Diabetes";
    const enkeltLipid = s.tchol > 8 || s.ldl > 4.9;
    const gruppe = dm && res.risk >= 20 ? "meget" : (dm && res.risk >= 10) || enkeltLipid ? "hoej" : dm ? "moderat" : "primaer";
    const maal = ldlMaal(s, gruppe);
    const opnaaet = eff.ldlKendt && eff.pct ? ` Forventet LDL med valgt statin: ca. ${fmt1(s.ldl * (1 - eff.pct))} mmol/l.` : "";
    html += box(
      "box-blue",
      "Lipidsænkende behandling",
      `<ul class="followup-list">
        <li><strong>LDL-mål ved behandling (DCS):</strong> ${maal}.${opnaaet}</li>
        <li><strong>Førstevalg:</strong> atorvastatin — 10–20 mg (moderat intensitet, LDL ca. −35–45 %) eller 40–80 mg (høj intensitet, ca. −50 %), når LDL skal mindst halveres. Simvastatin 40 mg er et alternativ i moderat intensitet. Tilføj ezetimib 10 mg, hvis målet ikke nås på maksimalt tolereret statin.</li>
        <li><strong>Kontrol:</strong> lipider og ALAT efter 6–12 uger; muskelgener vurderes — de fleste kan fortsætte på anden statin eller lavere dosis.</li>
      </ul>`
    );
    html += btBox(s, res) + livsstilBox(s);
    html += `<p class="source-note">Relativ risiko med behandling: 0,78 pr. mmol/l lavere LDL (CTT) og 0,90 pr. 5 mmHg lavere systolisk blodtryk (BPLTTC), ganget sammen. SCORE2 beregner hjerte-kar-død, ikke-dødeligt AMI og apopleksi; metaanalyserne omfatter også revaskularisering — skønnet er derfor omtrentligt.</p>`;
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------

  function buildJournalNote() {
    const s = getState();
    const lines = [`Kardiovaskulær risikovurdering ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [s.mand ? "Mand" : "Kvinde"];
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    basis.push(s.ryger ? "ryger" : "ikke-ryger");
    if (!isNaN(s.sbp)) basis.push(`systolisk BT ${s.sbp}`);
    if (!isNaN(s.tchol)) basis.push(`total-kol. ${fmt1(s.tchol)}`);
    if (!isNaN(s.hdl)) basis.push(`HDL ${fmt1(s.hdl)}`);
    if (!isNaN(s.ldl)) basis.push(`LDL ${fmt1(s.ldl)}`);
    if (s.diabetes) basis.push(`type 2-diabetes${isNaN(s.hba1c) ? "" : ` (HbA1c ${s.hba1c}, eGFR ${isNaN(s.egfr) ? "?" : s.egfr})`}`);
    lines.push(basis.join(", ") + ".");
    const heading = output.querySelector(".box h3");
    if (heading) lines.push(heading.textContent.trim() + ".");
    const first = output.querySelector(".box p");
    if (first) lines.push(first.textContent.trim());
    if (last && last.eff.pct + last.s.bpdrop > 0) lines.push(`Effekt af planlagt behandling over 10 år: NNT ca. ${fmtInt(roundNnt(last.eff.nnt))} (risiko ${fmt1(last.res.risk)} % → ${fmt1(last.eff.treated)} %).`);
    if (last && last.utenRyg) lines.push(`Ved rygestop: ca. ${fmt1(last.utenRyg.risk)} %.`);
    lines.push("Drøftet med patienten (tilpas): risiko i absolutte tal, livsstil, gevinst og bivirkninger ved behandling.");
    return lines.join("\n");
  }

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .nnh, :scope > details > ul").forEach((el) => {
        if (el.tagName === "P") lines.push(el.textContent.trim());
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else lines.push(Array.from(el.children).map((x) => x.textContent.trim()).join(": "));
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  // Til test: modellerne kan kaldes direkte fra konsollen.
  window.__score2 = { score2, score2op, score2dm };

  update();
})();
