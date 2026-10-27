/*
 * Demensudredning i almen praksis: tjekliste til basisudredningen, delirium og
 * depression, MMSE og urskivetest, medicingennemgang, blodprøver med "hold øje
 * med", særlige træk, henvisning, kørekort og journalnotat.
 */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = document.querySelector(".form-panel");
  const output = $("output");
  const copyStatus = $("copyStatus");
  const printMeta = $("printMeta");

  const num = (id) => {
    const v = $(id).value.replace(",", ".");
    return v === "" ? NaN : parseFloat(v);
  };
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const has = (list, k) => list.includes(k);
  const fmt = (x) => String(x).replace(".", ",");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const box = (cls, titel, body) => `<div class="box ${cls}"><h3>${titel}</h3>${body}</div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const lenke = (sti, tekst) => {
    const a = document.querySelector(`#linkKort a[data-sti="${sti}"]`);
    const href = a ? a.getAttribute("href") : sti;
    const ny = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${esc(href)}"${ny}>${tekst}</a>`;
  };

  const MED_NAVN = { antikolin: "antikolinerge", benzo: "benzodiazepiner/sovemedicin", opioid: "opioider/gabapentinoider", antipsyk: "antipsykotika" };
  const TRAK_NAVN = { personlighed: "personlighedsændring/sprog", lewy: "synshallucinationer/parkinsonisme", vaskulaer: "apopleksi/trinvis forløb", nph: "gangbesvær og inkontinens", alkohol: "alkoholoverforbrug" };

  function getState() {
    return {
      alder: num("alder"),
      udd: radio("udd"),
      forloeb: checked("forloeb"),
      trak: checked("trak"),
      mmse: num("mmse"),
      ur: radio("ur"),
      dep: radio("dep"),
      med: checked("med"),
      hb: num("hb"), na: num("na"), ca: num("ca"), tsh: num("tsh"), b12: num("b12"), hba1c: num("hba1c"), egfr: num("egfr"), crp: num("crp"),
      prak: checked("prak"),
    };
  }

  const delirium = (s) => has(s.forloeb, "akut");

  // ---------------------------------------------------------------------
  // Tjekliste
  // ---------------------------------------------------------------------

  function tjekliste(s) {
    const t = [];
    const add = (id, tekst) => t.push({ id, tekst });
    add("anamnese", "Anamnese med pårørende: debut, forløb, hukommelse, orientering, sprog og adfærd");
    add("iadl", "Instrumentel funktionsevne (økonomi, medicin, indkøb, transport)");
    add("objektiv", "Objektiv undersøgelse: blodtryk (også stående), puls, neurologi (fokale udfald, parkinsonisme, gang), syn og hørelse");
    add("kognitiv", `Kognitiv test: MMSE og urskivetest${s.udd === "kort" ? " (BASIC ved anden sproglig eller kulturel baggrund)" : ""}`);
    add("depression", "Depressionsscreening (GDS eller MDI)");
    add("medicin", "Medicingennemgang — antikolinerge, benzodiazepiner og opioider seponeres eller reduceres før test");
    add("alkohol", "Alkohol (AUDIT)");
    add("blod", "Blodprøver (se tabellen)");
    add("ekg", "EKG (udgangspunkt før evt. kolinesterasehæmmer: bradykardi, AV-blok)");
    add("scanning", s.prak.includes("scanning") ? "Hjernescanning foreligger (inden for 12 måneder)" : "CT/MR af cerebrum efter regionens forløbsbeskrivelse (bestilles af praksis eller hukommelsesklinikken)");
    add("henvisning", "Henvisning til demensudredning (hukommelsesklinik) og kontakt til kommunens demenskoordinator");
    if (has(s.prak, "koerekort")) add("koerekort", "Køreevne vurderet og drøftet");
    add("paaroerende", "Information til patient og pårørende; fremtidsfuldmagt og støttetilbud");
    return t;
  }

  const afkrydset = new Set();
  output.addEventListener("change", (e) => {
    const id = e.target.dataset && e.target.dataset.tjek;
    if (!id) return;
    if (e.target.checked) afkrydset.add(id);
    else afkrydset.delete(id);
    const n = sidst.tjek.filter((x) => afkrydset.has(x.id)).length;
    $("tjekStatus").textContent = `${n} af ${sidst.tjek.length} gennemgået`;
  });

  function tjekBoks(t) {
    const n = t.filter((x) => afkrydset.has(x.id)).length;
    const items = t.map((x) => `<li><label class="checkbox"><input type="checkbox" data-tjek="${esc(x.id)}"${afkrydset.has(x.id) ? " checked" : ""}> ${x.tekst}</label></li>`).join("");
    return box("box-green", "Tjekliste — basisudredning", `<p class="tjek-status" id="tjekStatus" aria-live="polite">${n} af ${t.length} gennemgået</p><ul class="tjekliste">${items}</ul><p class="field-hint">Afkrydsningerne kommer med i journalnotatet og huskes kun, mens siden er åben.</p>`);
  }

  // ---------------------------------------------------------------------
  // Vurdering
  // ---------------------------------------------------------------------

  function deliriumBoks(s) {
    if (!delirium(s)) return "";
    return box("box-red", "⚠ Mistanke om delirium", `<p><strong>Akut debut med svingende bevidsthed eller opmærksomhed</strong> tyder på delirium — ikke demensudredning nu.</p>${ul([
      "Find og behandl udløsende årsag: infektion (urin, lunger), medicin, dehydrering, elektrolytter, smerter, urinretention, obstipation, alkohol/abstinens.",
      "Indlæggelse ved svær påvirkning eller uafklaret årsag.",
      "Ny kognitiv vurdering efter bedring (delirium kan være første tegn på demens).",
    ])}`);
  }

  function mmseBoks(s) {
    if (isNaN(s.mmse) && s.ur === "ukendt") return box("box-blue", "Kognitiv test", "<p>Angiv MMSE og urskivetest.</p>");
    const l = [];
    if (!isNaN(s.mmse)) {
      const m = s.mmse;
      let t;
      if (m >= 27) t = "normalområdet — udelukker ikke let kognitiv svækkelse (MCI), især ved lang uddannelse";
      else if (m >= 21) t = "svarer ved demens til let grad — kan også skyldes MCI, depression, lav uddannelse eller sprog";
      else if (m >= 10) t = "svarer ved demens til moderat grad";
      else t = "svarer ved demens til svær grad";
      l.push(`<strong>MMSE ${m}/30:</strong> ${t}.`);
      if (s.udd === "kort") l.push("Kort uddannelse eller dansk ikke modersmål giver lavere score uden demens — fortolk forsigtigt (BASIC er bedre ved anden sproglig baggrund).");
      if (s.udd === "lang" && m >= 27) l.push("Lang uddannelse: en normal score udelukker ikke demens — henvis ved klar funktionsnedgang.");
    }
    if (s.ur === "afvigende") l.push("<strong>Urskivetest afvigende:</strong> tyder på nedsat eksekutiv og visuospatial funktion.");
    if (s.ur === "normal") l.push("Urskivetest normal.");
    if (has(s.forloeb, "adl")) l.push("<strong>Nedsat instrumentel funktionsevne</strong> — et krav for demens (ved bevaret funktion: MCI).");
    const cls = s.mmse < 21 ? "box-amber" : "box-blue";
    return box(cls, `Kognitiv test${isNaN(s.mmse) ? "" : ` — MMSE ${s.mmse}`}`, ul(l));
  }

  function depressionBoks(s) {
    if (s.dep === "pos") return box("box-amber", "Depression", `<p><strong>Tegn på depression:</strong> behandl depressionen først, og test igen efter 2–3 måneder — depression kan give kognitive symptomer, og de to tilstande optræder ofte sammen. Se ${lenke("depression.html", "Depression")}.</p>`);
    if (s.dep === "ukendt") return box("box-blue", "Depression", "<p>Screen for depression (GDS eller MDI) før demensudredning.</p>");
    return "";
  }

  function medicinBoks(s) {
    if (!s.med.length && !has(s.trak, "alkohol")) return "";
    const l = [];
    if (s.med.length) l.push(`<strong>${s.med.map((k) => MED_NAVN[k]).join(", ")}:</strong> kan give eller forværre kognitive symptomer — seponér eller reducér, hvis muligt, og test igen efter nogle uger.`);
    if (has(s.med, "antikolin")) l.push("Antikolinerg belastning: fx amitriptylin, tolterodin, solifenacin, hydroxyzin og promethazin — vælg alternativer.");
    if (has(s.med, "antipsyk") && has(s.trak, "lewy")) l.push("<strong>Lewy body-træk:</strong> udtalt følsomhed for antipsykotika (risiko for svær forværring) — undgå.");
    if (has(s.trak, "alkohol")) l.push("<strong>Alkohol:</strong> stop eller reducér, B1-vitamin (thiamin), og vurdér igen efter mindst 1–3 måneders afholdenhed.");
    return box("box-amber", "Medicin og alkohol", ul(l));
  }

  function labFund(s) {
    const f = [];
    if (s.na < 130) f.push(`<strong>Natrium ${s.na}:</strong> hyponatriæmi kan give kognitive symptomer og forvirring — find årsagen (fx thiazid, SSRI).`);
    else if (s.na > 150) f.push(`<strong>Natrium ${s.na}:</strong> hypernatriæmi (dehydrering).`);
    if (s.ca > 1.32) f.push(`<strong>Ioniseret calcium ${fmt(s.ca)}:</strong> hypercalcæmi — PTH; kan give kognitive symptomer.`);
    if (s.tsh > 4.0) f.push(`<strong>TSH ${fmt(s.tsh)}:</strong> mulig hypothyreose — T4; se ${lenke("../thyreoidea/hypothyreose.html", "Hypothyreose")}.`);
    else if (s.tsh < 0.3) f.push(`<strong>TSH ${fmt(s.tsh)}:</strong> mulig hyperthyreose — T4 og T3.`);
    if (s.b12 < 200) f.push(`<strong>B12 ${s.b12} pmol/l:</strong> lav — start B12-behandling (injektion eller høj peroral dosis), og test igen efter behandling.`);
    else if (s.b12 < 300) f.push(`<strong>B12 ${s.b12} pmol/l:</strong> gråzone — metylmalonsyre afgør, om der er mangel.`);
    if (s.hb < 7.3) f.push(`<strong>Hæmoglobin ${fmt(s.hb)}:</strong> anæmi — udred (B12, folat, jern, blødning).`);
    if (s.hba1c >= 48) f.push(`<strong>HbA1c ${s.hba1c}:</strong> diabetes — både hyper- og hypoglykæmi kan påvirke kognitionen.`);
    if (s.egfr < 30) f.push(`<strong>eGFR ${s.egfr}:</strong> svært nedsat nyrefunktion — kan give kognitive symptomer; dosér medicin efter nyrefunktion.`);
    if (s.crp > 20) f.push(`<strong>CRP ${s.crp}:</strong> infektion eller inflammation — overvej delirium, og test igen efter bedring.`);
    return f;
  }

  function proeveBoks() {
    const r = [
      ["Hæmoglobin, leukocytter, trombocytter", "Anæmi, hæmatologisk sygdom", "Anæmi → udred (B12, folat, jern)."],
      ["CRP", "Infektion og inflammation", "Forhøjet → infektion/delirium; test igen efter bedring."],
      ["Natrium, kalium, kreatinin/eGFR", "Elektrolytter og nyrefunktion", "Natrium under 130 → årsag (thiazid, SSRI); eGFR → dosering."],
      ["Calcium og albumin (eller ioniseret calcium)", "Hypercalcæmi", "Forhøjet → PTH (hyperparathyreoidisme)."],
      ["ALAT, basisk fosfatase", "Lever- og knoglesygdom, alkohol", "Forhøjet → alkohol, leversygdom."],
      ["HbA1c", "Diabetes", "≥ 48 mmol/mol → diabetes; vaskulær risikofaktor."],
      ["TSH", "Hypo- og hyperthyreose", "Afvigende → T4 (og T3)."],
      ["B12 og folat", "Mangel kan give kognitive symptomer", "B12 under 200 → behandling; 200–300 → metylmalonsyre."],
      ["D-vitamin (nogle regioner)", "Mangel hos ældre", "Lav → tilskud."],
      ["Urinstix (ved mistanke)", "Infektion ved forværring/delirium", "Positiv med symptomer → dyrkning."],
      ["EKG", "Udgangspunkt før kolinesterasehæmmer", `Bradykardi eller AV-blok → forsigtighed med kolinesterasehæmmer (${lenke("../hjerte/ekg.html", "EKG-værktøj")}).`],
      ["CT eller MR af cerebrum", "Strukturelle årsager (tumor, hydrocephalus, subduralt hæmatom, infarkter)", "Bestilles af praksis eller hukommelsesklinikken efter regionens forløbsbeskrivelse."],
    ];
    const rows = r.map(([a, b, c]) => `<tr><td data-label="Prøve">${a}</td><td data-label="Hvorfor">${b}</td><td data-label="Hold øje med">${c}</td></tr>`).join("");
    return box("box-blue", "Blodprøver og undersøgelser", `<div class="drug-table-wrap"><table class="drug-table stack-mobile proever"><thead><tr><th>Prøve</th><th>Hvorfor</th><th>Hold øje med</th></tr></thead><tbody>${rows}</tbody></table></div><p class="field-hint">Panelet svarer til regionernes forløbsbeskrivelser (fx Region Syddanmark og Sjælland) — tjek din regions liste.</p>`);
  }

  function traekBoks(s) {
    const l = [];
    if (has(s.trak, "personlighed")) l.push("<strong>Frontotemporale træk</strong> (personlighed, adfærd, sprog): MMSE kan være normal — henvis, især under 65 år.");
    if (has(s.trak, "lewy")) l.push("<strong>Lewy body-træk</strong> (synshallucinationer, parkinsonisme, svingende vågenhed, REM-søvnforstyrrelse): undgå antipsykotika; henvis.");
    if (has(s.trak, "vaskulaer")) l.push("<strong>Vaskulære træk:</strong> optimér blodtryk, lipider, diabetes og antitrombotisk behandling; efter apopleksi som regel ca. 3 måneder før henvisning.");
    if (has(s.trak, "nph")) l.push("<strong>Gangbesvær, inkontinens og kognitive symptomer:</strong> mulig normaltrykshydrocephalus — scanning og henvisning (kan behandles).");
    if (!l.length) return "";
    return box("box-amber", "Særlige træk", ul(l));
  }

  function henvisningBoks(s) {
    if (delirium(s)) return "";
    const l = [];
    const hurtig = [];
    if (s.alder < 65) hurtig.push("under 65 år");
    if (has(s.forloeb, "hurtig")) hurtig.push("hurtig forværring");
    if (has(s.trak, "personlighed") || has(s.trak, "lewy") || has(s.trak, "nph")) hurtig.push("atypiske træk");
    if (hurtig.length) l.push(`<strong>Hurtig henvisning</strong> (${hurtig.join(", ")}) til hukommelsesklinik/neurologi.`);
    l.push("Henvis til demensudredning (hukommelsesklinik), når mistanken fortsat er der efter basisudredningen — og reversible årsager (depression, medicin, blodprøvefund) er behandlet.");
    if (s.mmse < 20 && !has(s.prak, "scanning")) l.push("<strong>MMSE under 20 uden scanning inden for 12 måneder:</strong> i Region Hovedstaden bestiller praksis CT af cerebrum før henvisning — følg regionens forløbsbeskrivelse.");
    l.push("Kontakt kommunens demenskoordinator (støtte, aflastning, pårørendetilbud).");
    l.push("Kolinesterasehæmmer og memantin startes efter diagnosen (hukommelsesklinikken); praksis kan fortsætte og kontrollere.");
    return box("box-blue", "Henvisning", ul(l));
  }

  function praktiskBoks(s) {
    const l = [];
    if (has(s.prak, "koerekort")) l.push("<strong>Kørekort:</strong> demens kræver vurdering af køreevnen efter Sundhedsstyrelsens vejledning om helbredskrav — ved moderat og svær demens opfyldes kravene typisk ikke; ved let demens individuel vurdering (evt. køretest og kort gyldighed). Drøft det tidligt, og journalfør vejledningen.");
    if (has(s.prak, "alene")) l.push("<strong>Bor alene:</strong> vurdér sikkerhed (komfur, medicin, fald), hjemmepleje og nødkald.");
    l.push("Fremtidsfuldmagt mens patienten kan tage stilling; information om Alzheimerforeningen og kommunens tilbud.");
    return box("box-blue", "Praktisk og sociale forhold", ul(l));
  }

  // ---------------------------------------------------------------------
  // Opdatering og journal
  // ---------------------------------------------------------------------

  let sidst = null;

  function update() {
    const s = getState();
    const t = tjekliste(s);
    const lab = labFund(s);
    sidst = { s, tjek: t, lab };
    let html = deliriumBoks(s);
    if (lab.length) html += box("box-amber", "Blodprøver — fund", ul(lab));
    html += tjekBoks(t);
    html += mmseBoks(s);
    html += depressionBoks(s);
    html += medicinBoks(s);
    html += traekBoks(s);
    html += henvisningBoks(s);
    html += proeveBoks();
    html += praktiskBoks(s);
    output.innerHTML = html;
  }

  const tekst = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent.replace(/\s+/g, " ").trim();
  };

  function buildJournalNote() {
    const { s, tjek, lab } = sidst;
    const L = ["Kognitive symptomer — basisudredning"];
    const b = [];
    if (!isNaN(s.alder)) b.push(`${s.alder} år`);
    if (s.udd === "kort") b.push("kort uddannelse/dansk ikke modersmål");
    if (s.udd === "lang") b.push("lang uddannelse");
    if (has(s.forloeb, "adl")) b.push("nedsat instrumentel funktionsevne");
    if (has(s.forloeb, "hurtig")) b.push("hurtig forværring");
    if (has(s.forloeb, "paaroerende")) b.push("pårørende bekymrede");
    if (b.length) L.push(`Baggrund: ${b.join(", ")}.`);
    if (delirium(s)) L.push("OBS: akut debut/svingende bevidsthed — mistanke om delirium; udløsende årsag behandles, ikke demensudredning nu.");
    const test = [];
    if (!isNaN(s.mmse)) test.push(`MMSE ${s.mmse}/30`);
    if (s.ur !== "ukendt") test.push(`urskivetest ${s.ur}`);
    if (s.dep !== "ukendt") test.push(s.dep === "pos" ? "tegn på depression" : "ikke tegn på depression");
    if (test.length) L.push(`Test: ${test.join(", ")}.`);
    if (s.trak.length) L.push(`Særlige træk: ${s.trak.map((k) => TRAK_NAVN[k]).join(", ")}.`);
    if (s.med.length) L.push(`Medicin der kan påvirke kognitionen: ${s.med.map((k) => MED_NAVN[k]).join(", ")} — seponeres/reduceres (tilpas).`);
    lab.forEach((f) => L.push(`OBS: ${tekst(f)}`));
    const gjort = tjek.filter((x) => afkrydset.has(x.id)).map((x) => x.tekst);
    const mangler = tjek.filter((x) => !afkrydset.has(x.id)).map((x) => x.tekst);
    if (gjort.length) L.push(`Gennemgået: ${gjort.join("; ")}.`);
    if (mangler.length) L.push(`Ikke afkrydset (tilpas): ${mangler.join("; ")}.`);
    if (!delirium(s)) L.push(s.dep === "pos" ? "Plan: depression behandles, ny kognitiv test om 2–3 måneder (tilpas)." : "Plan: henvisning til demensudredning efter regionens forløbsbeskrivelse (tilpas).");
    return L.join("\n");
  }

  function buildFullText() {
    const L = [];
    output.querySelectorAll(".box").forEach((b) => {
      const h3 = b.querySelector("h3");
      if (h3) L.push(h3.textContent.trim().toUpperCase());
      b.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap").forEach((el) => {
        if (el.tagName === "P") L.push(el.textContent.replace(/\s+/g, " ").trim());
        else if (el.tagName === "UL") el.querySelectorAll(":scope > li").forEach((li) => L.push(`${li.querySelector("input:checked") ? "[x]" : li.querySelector("input") ? "[ ]" : "-"} ${li.textContent.replace(/\s+/g, " ").trim()}`));
        else el.querySelectorAll("tbody tr").forEach((tr) => L.push("  " + Array.from(tr.children).map((td) => td.textContent.trim()).join(" — ")));
      });
      L.push("");
    });
    return L.join("\n").trim();
  }

  function copyText(t) {
    const done = () => {
      copyStatus.textContent = "Kopieret ✓";
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    };
    const fail = () => (copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.");
    try {
      navigator.clipboard.writeText(t).then(done, fail);
    } catch (e) {
      fail();
    }
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  $("copyBtn").addEventListener("click", () => copyText(buildJournalNote()));
  $("copyFullBtn").addEventListener("click", () => copyText(buildFullText()));
  $("resetBtn").addEventListener("click", () => {
    form.reset();
    afkrydset.clear();
    update();
  });
  const printBtn = $("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede værdier.";
      window.print();
    });
  }
  update();
})();
