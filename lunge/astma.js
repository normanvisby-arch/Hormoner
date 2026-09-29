/*
 * Astma hos voksne og unge (≥ 12 år): astmakontrol og risiko, behandlingstrin
 * efter GINA 2025 spor 1 (ICS-formoterol som anfaldsmedicin) med
 * budesonid/formoterol som i Medicinrådets basisliste. Spor 2 (SABA som
 * anfaldsmedicin) nævnes som alternativ.
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
  const printMeta = document.getElementById("printMeta");
  const startFields = document.getElementById("startFields");
  const behFields = document.getElementById("behFields");
  const valg = Behandlingsvalg(output);

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
    valg.nulstil();
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
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const collapsible = (cls, title, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${title}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  const actWarning = document.getElementById("actWarning");

  function getState() {
    const situation = radio("situation");
    startFields.hidden = situation !== "ny";
    behFields.hidden = situation !== "kendt";
    const act = num("act");
    actWarning.textContent = !isNaN(act) && (act < 5 || act > 25) ? "ACT går fra 5 til 25 — tjek værdien (ignoreres)." : "";
    return {
      alder: num("alder"),
      situation,
      start: radio("start"),
      beh: radio("beh"),
      kontrol: checked("kontrol"),
      act: act >= 5 && act <= 25 ? act : NaN,
      eks: isNaN(num("eks")) ? 0 : num("eks"),
      fev1: num("fev1pct"),
      andet: checked("andet"),
    };
  }

  // ---------------------------------------------------------------------
  // Trin og præparater
  // ---------------------------------------------------------------------

  const TRIN = {
    saba: { navn: "SABA alene", spor: 0, trin: 0 },
    air: { navn: "ICS-formoterol efter behov (trin 1–2)", spor: 1, trin: 2 },
    icsfast: { navn: "fast lavdosis ICS + SABA (spor 2, trin 2)", spor: 2, trin: 2 },
    martlav: { navn: "MART med lav dosis (trin 3)", spor: 1, trin: 3 },
    icslabalav: { navn: "fast lavdosis ICS-LABA + SABA (spor 2, trin 3)", spor: 2, trin: 3 },
    martmedium: { navn: "MART med medium dosis (trin 4)", spor: 1, trin: 4 },
    icslabahoej: { navn: "fast medium/høj dosis ICS-LABA + SABA (spor 2, trin 4)", spor: 2, trin: 4 },
    trin5: { navn: "trin 5 (tillæg af LAMA eller biologisk behandling)", spor: 1, trin: 5 },
  };

  // Dosering af budesonid/formoterol 160/4,5 mikrog. (afgivet dosis) pr. trin.
  const DOSIS = {
    air: "1 inhalation efter behov (også før anstrengelse). Maks. 12 inhalationer pr. døgn i kortere perioder.",
    martlav: "1 inhalation × 2 dagligt (eller 2 × 1) + 1 inhalation efter behov. Maks. 12 inhalationer pr. døgn i kortere perioder.",
    martmedium: "2 inhalationer × 2 dagligt + 1 inhalation efter behov. Maks. 12 inhalationer pr. døgn i kortere perioder.",
  };
  const PRODUKTER = [
    ["Bufomix Easyhaler 160/4,5 mikrog.", "Budesonid/formoterol, pulverinhalator", "Anbefalet (basisliste)"],
    ["Symbicort Turbuhaler 160/4,5 mikrog.", "Budesonid/formoterol, pulverinhalator", "Alternativ"],
    ["DuoResp Spiromax 160/4,5 mikrog.", "Budesonid/formoterol, pulverinhalator", "Alternativ"],
  ];

  function produktRows(trin) {
    return PRODUKTER.map(([navn, indhold, tag], i) => ({ key: `${trin}|${navn}`, navn, indhold, dosering: DOSIS[trin], tag, tagClass: i === 0 ? "tag-recommend" : "tag-alt" }));
  }
  function trin5Rows() {
    return [
      { key: "trin5|lama", navn: "Spiriva Respimat 2,5 mikrog. (tiotropium)", indhold: "LAMA — tillæg til medium/høj dosis ICS-LABA eller MART", dosering: "2 pust × 1 dagligt. Fortsæt nuværende ICS-LABA/ICS-formoterol.", tag: "Tillæg", tagClass: "tag-recommend" },
      { key: "trin5|henvis", navn: "Henvisning til lungemedicinsk afdeling", indhold: "Fænotypning (eosinofile, FeNO, allergi) og vurdering af biologisk behandling", dosering: "Biologiske lægemidler ordineres kun i specialistregi.", tag: "Anbefalet", tagClass: "tag-recommend" },
    ];
  }

  function drugTable(list) {
    const h = ["Præparat", "Indhold", "Dosering"];
    return `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${list
      .map((r) => `<tr><td>${r.navn}<span class="tag ${r.tagClass}">${r.tag}</span>${valg.radio(r.key)}</td><td data-label="${h[1]}">${r.indhold}</td><td data-label="${h[2]}">${r.dosering}</td></tr>`)
      .join("")}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------------
  // Vurdering
  // ---------------------------------------------------------------------

  // GINA: 0 kriterier = velkontrolleret, 1–2 = delvist, 3–4 = ukontrolleret.
  function kontrolNiveau(s) {
    const n = s.kontrol.length;
    if (n === 0) return { n, niveau: "velkontrolleret", cls: "box-green" };
    if (n <= 2) return { n, niveau: "delvist kontrolleret", cls: "box-amber" };
    return { n, niveau: "ukontrolleret", cls: "box-red" };
  }
  const actTekst = (a) => (a >= 20 ? "velkontrolleret" : a >= 16 ? "ikke velkontrolleret" : "dårligt kontrolleret");
  // Samlet niveau: det dårligste af GINA-kriterierne og ACT (ACT 16–19 ~ delvist, ≤ 15 ~ ukontrolleret).
  const NIVEAUER = [
    { niveau: "velkontrolleret", cls: "box-green" },
    { niveau: "delvist kontrolleret", cls: "box-amber" },
    { niveau: "ukontrolleret", cls: "box-red" },
  ];
  function samletNiveau(s, k) {
    let i = k.n === 0 ? 0 : k.n <= 2 ? 1 : 2;
    if (!isNaN(s.act)) i = Math.max(i, s.act >= 20 ? 0 : s.act >= 16 ? 1 : 2);
    return NIVEAUER[i];
  }

  // Returnerer { maal, titel, tekst[] } — maal er det anbefalede trin (nøgle i DOSIS eller "trin5").
  function anbefaling(s, k) {
    const tekst = [];
    // To eller flere forværringer tæller som manglende kontrol; én forværring udløser gennemgang.
    const ukontrolleret = k.n > 0 || (!isNaN(s.act) && s.act < 20) || s.eks >= 2;
    if (s.situation === "ny") {
      const maal = { sjaeldne: "air", fleste: "martlav", daglige: "martmedium", akut: "martmedium" }[s.start];
      if (s.start === "akut") tekst.push("Start MART med medium dosis, og giv en kort prednisolonkur (37,5–50 mg i 5–7 dage). Kontrol inden for 1–2 uger.");
      else tekst.push("Start på det trin, der passer til symptombyrden (GINA 2025). SABA alene anbefales ikke — heller ikke ved let astma.");
      return { maal, titel: `Opstart — ${TRIN[maal].navn}`, tekst };
    }
    const cur = s.beh;
    if (cur === "saba") {
      tekst.push("SABA alene anbefales ikke længere — det øger risikoen for svære forværringer. Skift til ICS-formoterol.");
      if (s.eks >= 2) tekst.push("≥ 2 prednisolonkrævende forværringer det seneste år: start på trin 3, og henvis til lungemedicinsk vurdering.");
      const maal = (ukontrolleret && k.n >= 2) || s.eks >= 2 ? "martlav" : "air";
      return { maal, titel: `Skift fra SABA alene — ${TRIN[maal].navn}`, tekst };
    }
    if (ukontrolleret) {
      if (!has(s.andet, "teknik")) tekst.push("<strong>Før optrapning:</strong> kontrollér inhalationsteknik, adhærens, rygning, eksponeringer og komorbiditet (rhinitis, refluks, overvægt, angst) — og om diagnosen er rigtig.");
      // Spor 2 trin 4 skifter først til MART med medium dosis (GINA: spor 1 foretrækkes før trin 5).
      const op = { air: "martlav", icsfast: "martlav", martlav: "martmedium", icslabalav: "martmedium", martmedium: "trin5", icslabahoej: "martmedium", trin5: "trin5" }[cur];
      if (cur === "icslabahoej") tekst.push("Ukontrolleret på fast medium/høj dosis ICS-LABA med SABA: skift til MART med medium dosis, før tillæg af LAMA eller henvisning til biologisk behandling overvejes. Henvis ved diagnostisk tvivl eller fortsat manglende kontrol.");
      else if (TRIN[cur].spor === 2 && op !== "trin5") tekst.push("Ved optrapning anbefales skift til spor 1 (ICS-formoterol som anfaldsmedicin), der mindsker risikoen for forværringer mere end SABA-baseret behandling.");
      if (op === "trin5") tekst.push(cur === "trin5" ? "Allerede på trin 5 og fortsat ukontrolleret: henvis til lungemedicinsk afdeling (svær astma)." : "Ukontrolleret på trin 4: henvis til lungemedicinsk vurdering, og overvej tillæg af LAMA.");
      return { maal: op, titel: `Optrapning — ${TRIN[op].navn}`, tekst };
    }
    if (s.eks === 1) tekst.push("1 prednisolonkrævende forværring det seneste år: gennemgå handleplan, teknik og adhærens, og overvej optrapning, hvis der ikke var en oplagt udløsende årsag. Trap ikke ned.");
    if (has(s.andet, "stabil") && s.eks === 0 && has(s.andet, "gravid") && cur !== "air") {
      tekst.push("Trap ikke ned under graviditet — fortsæt nuværende behandling, og revurdér efter fødslen.");
      const same = { icsfast: "air", martlav: "martlav", icslabalav: "martlav", martmedium: "martmedium", icslabahoej: "martmedium", trin5: "trin5" }[cur];
      return { maal: same, titel: "Fortsæt — ingen nedtrapning under graviditet", tekst };
    }
    if (has(s.andet, "stabil") && s.eks === 0) {
      const ned = { air: "air", icsfast: "air", martlav: "air", icslabalav: "martlav", martmedium: "martlav", icslabahoej: "martmedium", trin5: "martmedium" }[cur];
      if (cur === "air") tekst.push("Laveste trin — fortsæt ICS-formoterol efter behov.");
      else tekst.push("Velkontrolleret i ≥ 3 måneder: overvej at trappe ét trin ned (ICS-dosis reduceres med 25–50 %). Stop ikke ICS helt, og aftal kontrol efter 3 måneder.");
      if (cur === "trin5") tekst.push("Nedtrapning fra trin 5 (fx biologisk behandling) aftales med lungemedicinsk afdeling.");
      return { maal: ned, titel: cur === "air" ? "Fortsæt — laveste trin" : `Nedtrapning — ${TRIN[ned].navn}`, tekst };
    }
    tekst.push("Velkontrolleret: fortsæt nuværende behandling. Overvej nedtrapning, når astma har været velkontrolleret i mindst 3 måneder.");
    const same = { air: "air", icsfast: "air", martlav: "martlav", icslabalav: "martlav", martmedium: "martmedium", icslabahoej: "martmedium", trin5: "trin5" }[cur];
    if (TRIN[cur].spor === 2) tekst.push("Spor 1 (ICS-formoterol som anfaldsmedicin) er førstevalg — overvej skift ved næste kontrol.");
    return { maal: same, titel: "Fortsæt nuværende behandling", tekst };
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  let last = null;

  function update() {
    const s = getState();
    alderWarning.textContent = !isNaN(s.alder) && s.alder < 12 ? "Værktøjet gælder voksne og unge fra 12 år — børn følger pædiatriske retningslinjer." : !isNaN(s.alder) && s.alder > 110 ? "Alder virker usædvanlig — tjek indtastningen." : "";
    const k = kontrolNiveau(s);
    Object.assign(k, samletNiveau(s, k));
    if (!isNaN(s.alder) && s.alder < 12) {
      last = { s, k, a: null };
      output.innerHTML = box("box-amber", "Børn under 12 år", "<p>Værktøjet gælder voksne og unge fra 12 år. Børn under 12 år behandles efter pædiatriske retningslinjer (GINA 6–11 år, Dansk Pædiatrisk Selskab) med andre doser og præparater.</p>");
      return;
    }
    const a = anbefaling(s, k);
    last = { s, k, a };
    let html = "";

    // Kontrol og risiko
    const risiko = [];
    if (s.eks >= 1) risiko.push(`${s.eks} forværring(er) med prednisolon det seneste år`);
    if (!isNaN(s.fev1) && s.fev1 < 60) risiko.push(`lav lungefunktion (FEV1 ${Math.round(s.fev1)} %)`);
    if (has(s.andet, "ryger")) risiko.push("rygning");
    if (has(s.andet, "saba3") || (s.situation === "kendt" && s.beh === "saba")) risiko.push(has(s.andet, "saba3") ? "højt SABA-forbrug (≥ 3 inhalatorer/år)" : "SABA uden ICS");
    if (has(s.andet, "gravid")) risiko.push("graviditet");
    const actLinje = isNaN(s.act) ? "" : `<p>ACT ${s.act}: ${actTekst(s.act)}${(s.act >= 20) !== (k.n === 0) ? " — afviger fra GINA-vurderingen; overskriften bruger den dårligste." : "."}</p>`;
    html += box(
      k.cls,
      `Astmakontrol: ${k.niveau}`,
      `<p>${k.n} af 4 GINA-kriterier opfyldt de seneste 4 uger.</p>${actLinje}
      <p>${risiko.length ? `<strong>Risiko for forværring:</strong> ${risiko.join(", ")}.` : "Ingen markerede risikofaktorer for forværring."}</p>`
    );

    // Anbefaling
    const list = a.maal === "trin5" ? trin5Rows() : produktRows(a.maal);
    html += box(
      "box-green",
      `Behandling: ${a.titel}`,
      `${a.tekst.map((t) => `<p>${t}</p>`).join("")}
      ${drugTable(list)}
      ${a.maal !== "trin5" ? `<p>${a.maal === "air" ? "ICS-formoterol efter behov: formoterol virker efter 1–3 minutter, og hver inhalation giver samtidig inhalationssteroid." : "Én inhalator til både vedligeholdelse og anfald. Formoterol virker efter 1–3 minutter, så den samme inhalator bruges ved symptomer."} Skyl munden efter brug.${a.maal === "martlav" || a.maal === "martmedium" ? " Beclometason/formoterol (Innovair 100/6 mikrog.) er godkendt som MART på trin 3–4: 1 pust × 2 dagligt + efter behov, maks. 8 pust pr. døgn." : ""}</p>` : ""}
      <p><strong>Spor 2</strong> (SABA som anfaldsmedicin) er et alternativ, hvis ICS-formoterol ikke er muligt — så skal ICS tages dagligt (trin 2 fast lav dosis ICS; trin 3 lav dosis ICS-LABA; trin 4 medium/høj dosis ICS-LABA).</p>`
    );
    if (has(s.andet, "gravid")) {
      html += box("box-amber", "Graviditet", "<p>Fortsæt astmabehandlingen under graviditet — ukontrolleret astma er farligere for fosteret end medicinen. Budesonid og formoterol har god dokumentation. Ukontrolleret astma eller forværring i graviditeten: lav tærskel for kontakt til lungemedicinsk afdeling.</p>");
    }

    // Ikke-farmakologisk
    const tiltag = [];
    if (has(s.andet, "ryger")) tiltag.push("<strong>Rygestop</strong> — rygning mindsker effekten af ICS og øger risikoen for forværring.");
    tiltag.push("<strong>Skriftlig handleplan</strong>: hvad gøres ved forværring, og hvornår søges læge.");
    tiltag.push("<strong>Inhalationsteknik</strong> gennemgås ved hver kontrol — lad patienten vise det.");
    tiltag.push("Fysisk aktivitet, vægttab ved overvægt, undgåelse af kendte udløsende faktorer, og influenzavaccination ved moderat–svær astma.");
    html += box("box-blue", "Ikke-farmakologisk", ul(tiltag));

    // ICS-doser
    html += collapsible(
      "box-blue",
      "ICS-doser for voksne og unge (GINA 2025, mikrog. pr. døgn)",
      `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr><th>Inhalationssteroid</th><th>Lav</th><th>Medium</th><th>Høj</th></tr></thead><tbody>
        <tr><td>Budesonid (pulver)</td><td data-label="Lav">200–400</td><td data-label="Medium">&gt; 400–800</td><td data-label="Høj">&gt; 800</td></tr>
        <tr><td>Beclometason (ekstrafin spray)</td><td data-label="Lav">100–200</td><td data-label="Medium">&gt; 200–400</td><td data-label="Høj">&gt; 400</td></tr>
        <tr><td>Fluticasonpropionat</td><td data-label="Lav">100–250</td><td data-label="Medium">&gt; 250–500</td><td data-label="Høj">&gt; 500</td></tr>
        <tr><td>Fluticasonfuroat</td><td data-label="Lav">—</td><td data-label="Medium">100 (lav–medium)</td><td data-label="Høj">200 (medium–høj)</td></tr>
      </tbody></table></div>
      <p>Budesonid/formoterol 160/4,5 mikrog. × 2 dagligt (MART trin 3) svarer til lav vedligeholdelsesdosis; 2 inhalationer × 2 (trin 4) til medium dosis. Doserne er afmålt dosis.</p>`
    );

    // Forværring
    html += collapsible(
      "box-blue",
      "Akut forværring",
      ul([
        "På spor 1: tag ekstra inhalationer af ICS-formoterol efter behov (maks. 12 pr. døgn i kortere perioder) — det øger samtidig ICS-dosis.",
        "<strong>Prednisolon 37,5–50 mg dagligt i 5–7 dage</strong> ved svær forværring eller manglende effekt — ingen udtrapning.",
        "<strong>Indlæg akut</strong> ved taleproblemer (korte sætninger), udmattelse, SAT &lt; 92 %, PEF &lt; 50 % af bedste værdi, puls &gt; 120 eller manglende effekt af initial behandling.",
        "<strong>Kontrol inden for 1 uge</strong>, revurdér vedligeholdelsesbehandling og handleplan. Henvis til lungemedicinsk vurdering efter prednisolonkrævende forværring, hvis patienten ikke tidligere er vurderet (DLS).",
      ])
    );

    // Diagnostik og henvisning
    html += collapsible(
      "box-blue",
      "Diagnostik og henvisning",
      `${ul([
        "<strong>Diagnosen</strong> bekræftes objektivt før vedligeholdelsesbehandling, hvis muligt: spirometri med reversibilitetstest, PEF-variabilitet eller behandlingsforsøg. Positiv reversibilitet: stigning i FEV1 eller FVC &gt; 10 % af forventet værdi (ERS/ATS 2022; tidligere ≥ 12 % og ≥ 200 ml).",
        "Eosinofile og FeNO understøtter type 2-inflammation og ICS-respons.",
        "<strong>Henvis</strong> ved diagnostisk tvivl, mistanke om erhvervsbetinget astma, ukontrolleret astma på trin 4 trods god teknik og adhærens, ≥ 2 prednisolonkure om året eller behov for trin 5.",
      ])}`
    );

    html += `<p class="source-note">GINA 2025 og Medicinrådets basisliste. Kontrollér dosis og præparater på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`;
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------

  function buildJournalNote() {
    const { s, k, a } = last;
    const lines = [`Astma — ${s.situation === "ny" ? "opstart" : "kontrol"} ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    if (s.situation === "kendt") basis.push(`i behandling med ${TRIN[s.beh].navn}`);
    if (!isNaN(s.fev1)) basis.push(`FEV1 ${Math.round(s.fev1)} % af forventet`);
    if (basis.length) lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    lines.push(`Astmakontrol (GINA/ACT): ${k.niveau} (GINA ${k.n}/4)${isNaN(s.act) ? "" : `, ACT ${s.act}`}. Forværringer med prednisolon seneste år: ${s.eks}.`);
    lines.push(`Vurdering: ${a.titel}.`);
    if (!a) {
      lines.push("Barn under 12 år — følg pædiatriske retningslinjer.");
      return lines.join("\n");
    }
    const valgt = valg.valgtRaekke();
    if (valgt) {
      const r = Behandlingsvalg.raekkeTekst(valgt);
      lines.push(`Valgt behandling: ${r.navn} — ${r.celler[1]}`);
    } else {
      // Alle anbefalede rækker, når de supplerer hinanden (trin 5: LAMA og henvisning); ellers kun førstevalget.
      const rows = Array.from(output.querySelectorAll(".tag-recommend")).map((t) => t.closest("tr")).filter(Boolean);
      (a.maal === "trin5" ? rows : rows.slice(0, 1)).forEach((tr, i) => {
        const r = Behandlingsvalg.raekkeTekst(tr);
        lines.push(`${a.maal === "trin5" ? "Plan" : "Førstevalg"}: ${r.navn} — ${r.celler[1]}`);
      });
    }
    if (s.situation === "ny" && s.start === "akut") lines.push("Prednisolon 37,5–50 mg dagligt i 5–7 dage. Kontrol inden for 1–2 uger.");
    lines.push("Plan (tilpas): inhalationsteknik gennemgået, skriftlig handleplan, kontrol efter 1–3 måneder ved ændring, ellers årligt.");
    return lines.join("\n");
  }

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > p, :scope > details > ul, :scope > details > .drug-table-wrap").forEach((el) => {
        if (el.tagName === "P") lines.push(el.textContent.trim());
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else el.querySelectorAll("tbody tr").forEach((tr) => lines.push("  * " + Array.from(tr.querySelectorAll("td")).map(Behandlingsvalg.cellText).join(" — ")));
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  update();
})();
