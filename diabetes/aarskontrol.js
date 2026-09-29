/*
 * Årskontrol ved type 2-diabetes: status mod behandlingsmål for HbA1c,
 * blodtryk, LDL og albuminuri, nyrefunktion, fødder, øjne og livsstil
 * (DSAM, DES, Dansk Nefrologisk Selskab), med samlet handlingsliste og
 * journalnotat.
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
  const labWarning = document.getElementById("labWarning");
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
  window.addEventListener("beforeprint", () => output.querySelectorAll("details").forEach((d) => (d.open = true)));

  resetBtn.addEventListener("click", () => {
    form.reset();
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
  const has = (list, k) => list.includes(k);
  const f1 = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const collapsible = (cls, title, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${title}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  function getState() {
    return {
      alder: num("alder"),
      hba1c: num("hba1c"),
      sbp: num("sbp"),
      dbp: num("dbp"),
      ldl: num("ldl"),
      egfr: num("egfr"),
      egfrFoer: num("egfrFoer"),
      uacr: num("uacr"),
      bmi: num("bmi"),
      rf: checked("rf"),
      ryger: radio("ryger") === "ja",
      fod: radio("fod"),
      saar: checked("saar").length > 0,
      oeje: radio("oeje"),
    };
  }

  // ---------------------------------------------------------------------
  // Mål
  // ---------------------------------------------------------------------

  function albKat(uacr) {
    if (isNaN(uacr)) return null;
    if (uacr < 30) return { kat: "A1", tekst: "normal (< 30 mg/g)" };
    if (uacr < 300) return { kat: "A2", tekst: "moderat forhøjet (30–299 mg/g)" };
    return { kat: "A3", tekst: "svært forhøjet (≥ 300 mg/g)" };
  }

  function ldlMaal(s) {
    const alb = !isNaN(s.uacr) && s.uacr >= 30;
    if (has(s.rf, "ascvd")) return { maal: 1.4, tekst: "< 1,4 (ESC 2023; DSAM: < 1,8)", grund: "hjerte-kar-sygdom" };
    if (alb || has(s.rf, "risiko") || (!isNaN(s.egfr) && s.egfr < 60)) return { maal: 1.8, tekst: "< 1,8", grund: alb ? "albuminuri" : !isNaN(s.egfr) && s.egfr < 60 ? "nedsat nyrefunktion" : "høj risiko" };
    return { maal: 2.6, tekst: "< 2,6", grund: "type 2-diabetes uden yderligere risiko" };
  }

  function btMaal(s) {
    if (!isNaN(s.alder) && s.alder >= 75) return { s: 140, d: 85, tekst: "< 140/85 (individuelt ved høj biologisk alder)" };
    return { s: 130, d: 80, tekst: "< 130/80" };
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  let last = null;

  function update() {
    const s = getState();
    alderWarning.textContent = !isNaN(s.alder) && (s.alder < 18 || s.alder > 110) ? "Alder virker usædvanlig — tjek indtastningen." : "";
    labWarning.textContent = !isNaN(s.hba1c) && s.hba1c < 20 ? "HbA1c skal angives i mmol/mol." : "";
    const rows = [];
    const handling = [];
    const add = (omraade, vaerdi, maal, status, cls) => rows.push({ omraade, vaerdi, maal, status, cls });

    // HbA1c
    if (isNaN(s.hba1c)) add("HbA1c", "—", "Individuelt (ofte < 53)", "Ikke målt", "tag-alt");
    else {
      const over = s.hba1c >= 53;
      add("HbA1c", `${s.hba1c} mmol/mol`, "Individuelt (ofte < 53)", over ? "Vurdér" : "I mål", over ? "tag-warn" : "tag-recommend");
      if (over) handling.push(`HbA1c ${s.hba1c}: vurdér individuelt mål og glukosesænkende behandling i <a href="behandling.html">Behandling</a>.`);
    }

    // Blodtryk
    const bt = btMaal(s);
    if (isNaN(s.sbp) && isNaN(s.dbp)) add("Blodtryk", "—", bt.tekst, "Ikke målt", "tag-alt");
    else {
      const over = (!isNaN(s.sbp) && s.sbp >= bt.s) || (!isNaN(s.dbp) && s.dbp >= bt.d);
      add("Blodtryk", `${isNaN(s.sbp) ? "?" : s.sbp}${isNaN(s.dbp) ? "" : "/" + s.dbp} mmHg`, bt.tekst, over ? "Over mål" : "I mål", over ? "tag-warn" : "tag-recommend");
      if (over) handling.push(`Blodtryk over mål (${bt.tekst}): bekræft med hjemmeblodtryk, og intensivér — behandlingen skal indeholde ACE-hæmmer eller angiotensin II-receptorblokker${has(s.rf, "acearb") ? " (allerede i behandling — øg dosis eller tilføj calciumantagonist/thiazid)" : ""}.`);
    }

    // LDL og statin
    const lm = ldlMaal(s);
    const statinAlder = isNaN(s.alder) || s.alder >= 40;
    let ldlOver = false;
    if (isNaN(s.ldl)) add("LDL", "—", `${lm.tekst} mmol/l`, "Ikke målt", "tag-alt");
    else {
      const over = s.ldl >= lm.maal;
      ldlOver = over;
      add("LDL", `${f1(s.ldl)} mmol/l`, `${lm.tekst} mmol/l`, over ? "Over mål" : "I mål", over ? "tag-warn" : "tag-recommend");
      if (over) handling.push(`LDL ${f1(s.ldl)} over målet (${lm.tekst}; ${lm.grund}): ${has(s.rf, "statin") ? "øg statindosis, eller tilføj ezetimib" : "start statin (fx atorvastatin 20–40 mg)"}.`);
    }
    if (!has(s.rf, "statin") && statinAlder && !ldlOver) {
      handling.push("Statin anbefales til praktisk talt alle med type 2-diabetes over 40 år (DES/DSAM, DCS).");
    }

    // Nyrer
    const ak = albKat(s.uacr);
    const fald = !isNaN(s.egfr) && !isNaN(s.egfrFoer) ? s.egfrFoer - s.egfr : NaN;
    if (isNaN(s.egfr)) add("eGFR", "—", "Årligt; fald < 5 pr. år", "Ikke målt", "tag-alt");
    else {
      // Initialt fald (typisk 3–5, op til 30 %) efter opstart af SGLT-2-hæmmer eller ACE-hæmmer/ARB er forventet.
      const forventet = has(s.rf, "nystart") && fald > 5 && fald <= 0.3 * s.egfrFoer;
      const bad = s.egfr < 30 || (fald > 5 && !forventet);
      if (forventet) handling.push(`eGFR faldet ${Math.round(fald)} efter opstart af SGLT-2-hæmmer eller ACE-hæmmer/ARB: et initialt fald på op til 30 % er forventet og ikke grund til at stoppe — gentag eGFR om 3 måneder, og henvis ved fortsat fald.`);
      add("eGFR", `${Math.round(s.egfr)}${isNaN(fald) ? "" : ` (${fald > 0 ? "fald" : "stigning"} ${Math.abs(Math.round(fald))} på 1 år)`}`, "Årligt; fald < 5 pr. år", bad ? "Henvis" : s.egfr < 60 ? "Nedsat" : "Normal", bad ? "tag-warn" : s.egfr < 60 ? "tag-warn" : "tag-recommend");
      if (bad) handling.push(`Henvis til nefrolog: ${s.egfr < 30 ? "eGFR under 30" : `eGFR faldet ${Math.round(fald)} ml/min på et år (> 5)`}.`);
      if (s.egfr < 60) handling.push(`eGFR under 60: dosisjustér lægemidler (metformin, DPP-4-hæmmer) og undgå NSAID${has(s.rf, "sglt2") ? "; fortsæt SGLT-2-hæmmer (nyrebeskyttelse)" : ", og overvej SGLT-2-hæmmer for nyrebeskyttelse"}.`);
    }
    if (!ak) add("Albuminuri (UACR)", "—", "< 30 mg/g", "Ikke målt", "tag-alt");
    else {
      add("Albuminuri (UACR)", `${Math.round(s.uacr)} mg/g — ${ak.kat}`, "< 30 mg/g", ak.kat === "A1" ? "Normal" : "Forhøjet", ak.kat === "A1" ? "tag-recommend" : "tag-warn");
      if (ak.kat !== "A1") {
        handling.push(`Albuminuri ${ak.tekst}: bekræft med 2 af 3 prøver; ${has(s.rf, "acearb") ? "ACE-hæmmer/ARB i maksimalt tolereret dosis" : "start ACE-hæmmer eller ARB — også uden hypertension"}${has(s.rf, "sglt2") ? "" : ", og tilføj SGLT-2-hæmmer (nyrebeskyttelse)"}. Kontrollér kreatinin og kalium 1–2 uger efter opstart.`);
        if (s.uacr > 700) handling.push(`UACR ${Math.round(s.uacr)} mg/g (over 700): henvis til nefrolog (DNS), medmindre patienten allerede følges i diabetesambulatorium for diabetisk nyresygdom.`);
        else if (ak.kat === "A3") handling.push("UACR ≥ 300 mg/g (A3): overvej henvisning til nefrolog (KDIGO: fra 300 mg/g; DNS: over 700 mg/g). Beregn risiko for nyresvigt i <a href=\"../nyre/ckd.html\">nyre-appen</a>.");
      }
    }

    // Fødder
    if (s.saar) {
      add("Fødder", "Aktuelt sår", "Ingen sår", "Akut", "tag-warn");
      handling.push("<strong>Aktuelt fodsår:</strong> henvis samme eller næste dag til tværfagligt fodsårsteam/fodambulatorium — aflast foden.");
    } else if (s.fod === "ukendt") {
      add("Fødder", "—", "Årlig fodstatus", "Mangler", "tag-alt");
      handling.push("Årlig fodstatus mangler: undersøg følesans (monofilament), puls, hud og fejlstillinger.");
    } else {
      const g = parseInt(s.fod, 10);
      add("Fødder", `Risikogruppe ${g}`, "Årlig fodstatus", g === 1 ? "Lav risiko" : "Øget risiko", g === 1 ? "tag-recommend" : "tag-warn");
      if (g >= 2) handling.push(`Fodrisikogruppe ${g}: henvis til statsautoriseret fodterapeut (tilskud) og undervis i daglig fodinspektion og fodtøj${g === 4 ? "; tæt opfølgning, evt. i fodambulatorium" : ""}.`);
    }

    // Øjne
    if (s.oeje === "forfalden") {
      add("Øjne", "Forfalden/ukendt", "Efter øjenlægens interval", "Henvis", "tag-warn");
      handling.push("Øjenscreening forfalden: henvis til øjenlæge (individuelt interval, typisk 1–4 år uden retinopati).");
    } else add("Øjne", s.oeje === "retinopati" ? "Retinopati i kontrol" : "Screenet", "Efter øjenlægens interval", "OK", "tag-recommend");

    // Livsstil
    if (s.ryger) {
      add("Rygning", "Ryger", "Røgfri", "Handling", "tag-warn");
      handling.push("Rygestop: tilbyd rygestopforløb og medicin — den største enkeltstående risikoreduktion.");
    } else add("Rygning", "Ikke-ryger", "Røgfri", "OK", "tag-recommend");
    if (!isNaN(s.bmi)) {
      const over = s.bmi >= 25;
      add("BMI", f1(s.bmi), "< 25", s.bmi >= 30 ? "Svær overvægt" : over ? "Overvægt" : "Normal", over ? "tag-warn" : "tag-recommend");
      if (s.bmi >= 30) handling.push("BMI ≥ 30: tilbyd vægttabsforløb (kommunalt); vægttab på 10–15 % kan give remission hos nogle. GLP-1-receptoragonist følger tilskudsreglerne.");
    }
    if (has(s.rf, "metformin4")) handling.push("Metformin i mere end 4 år: mål B12 (risiko for mangel og neuropati).");

    last = { s, rows, handling, lm, bt, ak };

    const h = ["Område", "Værdi", "Mål", "Status"];
    let html = `<div class="box box-blue"><h3>Status mod behandlingsmål</h3><div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows
      .map((r) => `<tr><td>${r.omraade}</td><td data-label="Værdi">${r.vaerdi}</td><td data-label="Mål">${r.maal}</td><td data-label="Status"><span class="tag ${r.cls}">${r.status}</span></td></tr>`)
      .join("")}</tbody></table></div></div>`;
    html += box(handling.length ? "box-amber" : "box-green", handling.length ? `Handling (${handling.length})` : "Alt i mål", handling.length ? ul(handling) : "<p>Ingen af de indtastede værdier kræver handling. Fortsæt årlig kontrol.</p>");

    html += collapsible(
      "box-blue",
      "Øvrigt ved årskontrollen",
      ul([
        "Glukosesænkende behandling og hypoglykæmier, adhærens og bivirkninger.",
        "Vaccination: influenza og covid-19 (gratis ved diabetes); overvej pneumokokvaccine.",
        "Trivsel: depression og diabetesbelastning; seksuel funktion; kørekort ved insulin eller sulfonylurinstof.",
        "Levertal ved overvægt (fedtlever — overvej FIB-4); tandstatus; fysisk aktivitet og kost.",
        "SCORE2-Diabetes kan bruges til at vurdere samlet hjerte-kar-risiko hos personer uden kendt hjerte-kar-sygdom.",
      ])
    );
    html += `<p class="source-note">DSAM, DES og Dansk Nefrologisk Selskab. Behandlingsmål er vejledende og individualiseres.</p>`;
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------

  function buildJournalNote() {
    const { s, rows, handling } = last;
    const lines = [`Type 2-diabetes — årskontrol ${new Date().toLocaleDateString("da-DK")}`];
    const maalt = rows.filter((r) => r.vaerdi !== "—").map((r) => `${r.omraade} ${r.vaerdi} (${r.status.toLowerCase()})`);
    if (!isNaN(s.alder)) lines.push(`${s.alder} år.`);
    if (maalt.length) lines.push(maalt.join("; ") + ".");
    const mangler = rows.filter((r) => r.vaerdi === "—").map((r) => r.omraade);
    if (mangler.length) lines.push(`Ikke målt/vurderet: ${mangler.join(", ")}.`);
    if (handling.length) {
      lines.push("Plan (tilpas):");
      handling.forEach((h) => lines.push("- " + h.replace(/<[^>]+>/g, "")));
    } else lines.push("Alle indtastede mål opfyldt. Fortsat årlig kontrol.");
    return lines.join("\n");
  }

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > ul").forEach((el) => {
        if (el.tagName === "P") lines.push(el.textContent.trim());
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else el.querySelectorAll("tbody tr").forEach((tr) => lines.push("  * " + Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim()).join(" — ")));
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  update();
})();
