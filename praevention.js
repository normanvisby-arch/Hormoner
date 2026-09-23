/*
 * Beslutningsstøtte for prævention (kontraception) — praktiserende læge.
 * Bygger på Sundhedsstyrelsens NRL "Hormonal kontraception" (2022),
 * Lægemiddelstyrelsens tjekliste for kombinerede hormonelle kontraceptiva,
 * EMA's VTE-risikotal (2013) og FSRH's vejledninger (UKMEC, nødprævention,
 * glemte piller, opstart, interaktioner) hvor danske kilder ikke er detaljerede.
 * Præparatnavne er danske handelsnavne og skal verificeres på pro.medicin.dk.
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
  const nodCheckbox = document.getElementById("nodPraevention");
  const nodTimingWrap = document.getElementById("nodTimingWrap");

  const BLOEDNINGSKALENDER_URL = "bloedningskalender.html";
  const KLIMAKTERIE_URL = "index.html";

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  nodCheckbox.addEventListener("change", () => {
    nodTimingWrap.hidden = !nodCheckbox.checked;
  });

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) {
        printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede valg på tidspunktet for udskrift.";
      }
      window.print();
    });
  }
  // Closed <details> sections would otherwise be left out of the printout.
  window.addEventListener("beforeprint", () => {
    output.querySelectorAll("details").forEach((d) => (d.open = true));
  });

  function checkAlderRange() {
    const raw = alderInput.value.trim();
    const v = parseInt(raw, 10);
    alderWarning.textContent = raw !== "" && (isNaN(v) || v < 12 || v > 60) ? "Alder virker usædvanlig — tjek indtastningen." : "";
  }
  alderInput.addEventListener("input", checkAlderRange);

  resetBtn.addEventListener("click", () => {
    form.reset();
    // form.reset() does not fire "input"/"change", so re-sync dependent UI.
    checkAlderRange();
    nodTimingWrap.hidden = !nodCheckbox.checked;
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

  function checkedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  }

  function getState() {
    // No || 0 fallback: an empty age must stay NaN — 0 < 20 would otherwise
    // trigger the "young age, LARC first" branch before the field is filled.
    const alder = parseInt(alderInput.value, 10);
    const bmiRaw = document.getElementById("bmiInput").value;
    const bmi = bmiRaw === "" ? null : parseFloat(bmiRaw);
    return {
      alder,
      bmi,
      nodPraevention: nodCheckbox.checked,
      nodTiming: document.querySelector('input[name="nodtiming"]:checked')?.value || "under24",
      ryger: document.getElementById("ryger").checked,
      postpartum: document.getElementById("postpartum").checked,
      amning: document.getElementById("amning").checked,
      andet: checkedValues("andet"),
      migraene: document.querySelector('input[name="migraene"]:checked').value,
      absoluteCHC: checkedValues("abs_chc"),
      absoluteAlle: checkedValues("abs_alle"),
      spiralKontra: checkedValues("spiral_kontra"),
      praeferens: document.querySelector('input[name="praeferens"]:checked').value,
    };
  }

  const ABS_CHC_LABELS = {
    vte: "Aktiv/tidligere VTE eller kendt trombofili (inkl. antifosfolipid-antistoffer)",
    famvte: "VTE hos forælder/søskende før 45 år",
    operation: "Planlagt større operation med længerevarende immobilisering",
    htn: "Hypertension (også velreguleret) eller BT ≥ 140/90",
    hjertekar: "Aktiv/tidligere iskæmisk hjertesygdom eller apopleksi",
    diabetes: "Kompliceret diabetes (med karskade) eller diabetesvarighed > 20 år",
    lever: "Aktiv leversygdom eller levertumor",
  };

  const ABS_ALLE_LABELS = {
    cancer: "Aktiv eller tidligere brystkræft",
    blodning: "Uafklaret vaginalblødning",
    grav: "Graviditet / mistanke om graviditet",
  };

  const SPIRAL_KONTRA_LABELS = {
    pid: "Aktiv underlivsinfektion (PID) eller ubehandlet høj STI-risiko",
    uterus: "Uterusanomali/myomer der deformerer cavum uteri",
  };

  const PRAEF_LABELS = {
    ingen: "ingen særlig præference",
    larc: "ønsker langtidsvirkende metode",
    pille: "ønsker daglig pille",
    hormonfri: "ønsker hormonfri metode",
    sterilisation: "overvejer sterilisation",
  };

  const alderKendt = (s) => !isNaN(s.alder);
  const fmtNum = (n) => String(n).replace(".", ",");
  const enzym = (s) => s.andet.includes("enzym");

  function box(cls, titleHtml, bodyHtml) {
    return `<div class="box ${cls}"><h3>${titleHtml}</h3>${bodyHtml}</div>`;
  }

  function collapsibleBox(cls, titleHtml, bodyHtml) {
    return `<div class="box ${cls} box-collapsible"><details><summary><h3>${titleHtml}</h3></summary>${bodyHtml}</details></div>`;
  }

  function drugTable(rows) {
    const h = ["Metode/præparat (DK)", "Indhold", "Bemærkning"];
    let html = `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><td>${r.navn}${r.tag ? `<span class="tag ${r.tagClass || "tag-alt"}">${r.tag}</span>` : ""}</td><td data-label="${h[1]}">${r.indhold}</td><td data-label="${h[2]}">${r.dosering}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  // ---------------------------------------------------------------------
  // Byggeklodser
  // ---------------------------------------------------------------------

  function kobberRow(s, tag, tagClass) {
    const kraftig = s.andet.includes("kraftig");
    return {
      navn: "Kobberspiral",
      indhold: "Hormonfri (kobber)",
      dosering: `> 99 % effektiv, 5–10 år afhængig af type. Upåvirket af anden medicin.${kraftig ? " <strong>Kan forværre kraftige/smertefulde menstruationer</strong> — hormonspiral er ofte bedre her." : " Kan give kraftigere/smertefuldere menstruation."}`,
      tag,
      tagClass,
    };
  }

  function larcRows(s, spiralOk) {
    const kraftig = s.andet.includes("kraftig");
    const implantNotes = [];
    if (alderKendt(s) && (s.alder < 18 || s.alder > 40)) implantNotes.push("Sikkerhed og virkning er fastslået for 18–40 år — brug uden for intervallet er off-label.");
    if (enzym(s)) implantNotes.push("<strong>Effekten nedsættes af enzyminducerende medicin — frarådes her.</strong>");
    const rows = [];
    if (spiralOk) {
      rows.push({ navn: "Mirena", indhold: "Hormonspiral, levonorgestrel 52 mg", dosering: `Op til 8 år. ${kraftig ? "<strong>Førstevalg ved kraftige menstruationer</strong> — reducerer blødningen markant." : "Reducerer menstruationsblødning markant."}`, tag: "Anbefalet (LARC)", tagClass: "tag-recommend" });
      rows.push({ navn: "Levosert", indhold: "Hormonspiral, levonorgestrel 52 mg", dosering: "Op til 6 år.", tag: "Alternativ (LARC)", tagClass: "tag-alt" });
      rows.push({ navn: "Kyleena / Jaydess", indhold: "Mindre hormonspiraler, levonorgestrel 19,5 / 13,5 mg", dosering: "5 / 3 år. Tyndere indføringsrør — kan være en fordel ved nullipara. Mindre blødningsreduktion end Mirena.", tag: "Alternativ (LARC)", tagClass: "tag-alt" });
      rows.push(kobberRow(s, "Alternativ (hormonfri)", "tag-alt"));
    }
    rows.push({ navn: "Nexplanon", indhold: "Implantat, etonogestrel 68 mg (p-stav i overarmen)", dosering: `Op til 3 år, > 99 % effektiv. Uregelmæssig blødning er hyppigste årsag til fjernelse.${implantNotes.length ? " " + implantNotes.join(" ") : ""}`, tag: enzym(s) ? "Frarådes" : "Alternativ (LARC)", tagClass: "tag-alt" });
    return rows;
  }

  function gestagenOnlyRows(s) {
    const rows = [];
    if (!enzym(s)) {
      rows.push({ navn: "Cerazette (desogestrel, også som generika)", indhold: "Minipille, desogestrel 75 mikrog.", dosering: "1 tablet dgl. uden pause — 12 timers vindue. Kan bruges af rygere, over 35 år og ammende.", tag: "Anbefalet (daglig)", tagClass: "tag-recommend" });
      rows.push({ navn: "Slinda", indhold: "Minipille, drospirenon 4 mg (24 + 4 dage)", dosering: "24 timers vindue og færre uregelmæssige blødninger end desogestrel for nogle.", tag: "Alternativ (daglig)", tagClass: "tag-alt" });
    }
    const depoNote = alderKendt(s) && s.alder < 18 ? " Ikke førstevalg under 18 år pga. knoglemineraltæthed." : "";
    rows.push({ navn: "Depo-Provera", indhold: "Medroxyprogesteronacetat 150 mg i.m. (injektion)", dosering: `Hver 3. måned (se produktresumé for interval). Upåvirket af enzyminducerende medicin. Kan give vægtøgning og forsinket fertilitet (op til ca. 1 år) efter ophør.${depoNote}`, tag: enzym(s) ? "Anbefalet (upåvirket af medicin)" : "Alternativ", tagClass: enzym(s) ? "tag-recommend" : "tag-alt" });
    return rows;
  }

  function chcUdelukket(s) {
    const reasons = [];
    if (s.ryger && alderKendt(s) && s.alder >= 35) reasons.push("Rygning ved alder ≥ 35 år");
    if (alderKendt(s) && s.alder >= 50) reasons.push("Alder ≥ 50 år — skift til gestagen-only metode eller spiral");
    if (s.migraene === "med_aura") reasons.push("Migræne med aura");
    s.absoluteCHC.forEach((k) => reasons.push(ABS_CHC_LABELS[k]));
    if (s.postpartum) reasons.push("Under 6 uger siden fødsel");
    if (s.amning) reasons.push("Ammer (kombineret prævention bør generelt undgås, så længe amning er primær ernæringskilde)");
    if (s.bmi !== null && !isNaN(s.bmi) && s.bmi >= 35) reasons.push(`BMI ≥ 35 (indtastet: ${fmtNum(s.bmi)})`);
    if (enzym(s)) reasons.push("Enzyminducerende medicin (nedsat effekt)");
    if (s.andet.includes("lamotrigin")) reasons.push("Lamotrigin (østrogen sænker lamotrigin-niveauet — risiko for dårligere anfaldskontrol)");
    return reasons;
  }

  function condomNote() {
    return box(
      "box-blue",
      "Kondom og sexsygdomme",
      `<p>Ingen af de øvrige metoder beskytter mod sexsygdomme. Nævn kondom som supplement ved ny eller flere partnere, og tilbyd klamydiatest ved risiko — særligt før spiralanlæggelse.</p>`
    );
  }

  function followUpBox() {
    return box(
      "box-blue",
      "Opfølgning",
      `<ul class="followup-list">
        <li>P-piller/plaster/ring: kontrol efter ca. 3 måneder (bivirkninger, blodtryk, compliance), derefter årligt med blodtryk og opdateret VTE-anamnese.</li>
        <li>Spiral: kontrol af tråde efter 4–6 uger efter lokal praksis; informér om udskiftningstidspunkt og notér det i journalen. Det samme gælder implantat.</li>
        <li>Uregelmæssig blødning er den hyppigste årsag til henvendelse — forvent pletblødning de første 3–6 måneder, især ved gestagen-only metoder. Ved vedvarende blødning: udeluk graviditet og klamydia, og overvej <a href="${BLOEDNINGSKALENDER_URL}" target="_blank" rel="noopener">Blødningskalenderen</a> til at kortlægge mønsteret (se også DSAM's vejledning om blødningsforstyrrelser).</li>
      </ul>`
    );
  }

  function opstartBox() {
    return collapsibleBox(
      "box-blue",
      "Opstart (\"quick start\") og ekstra beskyttelse",
      `<p>Metoden kan startes på en hvilken som helst dag, hvis graviditet med rimelighed kan udelukkes. Ekstra beskyttelse (kondom) efter opstart:</p>
      <ul>
        <li>P-piller, plaster, ring: 7 dage (ingen, hvis startet på cyklusdag 1–5).</li>
        <li>Desogestrel-minipille: 2 dage (ingen, hvis startet dag 1–5). Slinda: 7 dage (ingen, hvis startet dag 1).</li>
        <li>Implantat: 7 dage (ingen, hvis indsat dag 1–5). Hormonspiral: 7 dage (ingen, hvis anlagt dag 1–7).</li>
        <li>Kobberspiral: virker straks.</li>
      </ul>
      <p>Ved mulig graviditet på opstartstidspunktet: graviditetstest 3 uger efter seneste ubeskyttede samleje.</p>`
    );
  }

  function glemtePillerBox() {
    return collapsibleBox(
      "box-blue",
      "Glemte piller (FSRH)",
      `<p><strong>Kombinerede p-piller (21 + 7):</strong></p>
      <ul>
        <li>1 pille glemt (&lt; 48 timer siden den skulle være taget): tag den straks og fortsæt — ingen ekstra beskyttelse.</li>
        <li>2 eller flere glemt: tag den senest glemte straks, fortsæt, og brug kondom indtil 7 piller i træk er taget.
          Glemt i uge 1 med ubeskyttet samleje i pausen eller uge 1 → overvej nødprævention.
          Glemt i uge 3 → spring pillepausen over og start næste pakke direkte.</li>
      </ul>
      <p><strong>Desogestrel-minipille:</strong> mere end 12 timer forsinket → tag straks, kondom i 2 dage; nødprævention ved ubeskyttet samleje i de 2 dage efter. <strong>Slinda:</strong> 24 timers vindue (se produktresumé).</p>
      <p>Produktresuméerne er ofte mere forsigtige end FSRH (fx 12 timer for kombinerede piller) — informér patienten ud fra den valgte praksis.</p>`
    );
  }

  function risikoBox() {
    return collapsibleBox(
      "box-blue",
      "Effektivitet og risiko (til samtalen)",
      `<p><strong>Effektivitet ved almindelig brug</strong> (første år):</p>
      <ul>
        <li>Implantat, hormonspiral, kobberspiral: &gt; 99 %</li>
        <li>Depo-Provera: ca. 94 %</li>
        <li>P-piller, minipiller, plaster, ring: ca. 91 %</li>
        <li>Kondom: ca. 82 %</li>
      </ul>
      <p><strong>Blodpropper (VTE)</strong> pr. 10.000 kvinder pr. år (EMA 2013):</p>
      <ul>
        <li>Ingen hormonel prævention: ca. 2</li>
        <li>P-piller med levonorgestrel, norgestimat eller norethisteron: 5–7</li>
        <li>Plaster (Evra) og ring (NuvaRing): 6–12</li>
        <li>P-piller med desogestrel, gestoden eller drospirenon: 9–12</li>
        <li>Gestagen-only metoder (minipiller, implantat, hormonspiral): ingen eller minimal øget risiko</li>
      </ul>
      <p>Risikoen under graviditet og efter fødsel er højere end ved brug af p-piller. <strong>Brystkræft:</strong> lille øget risiko under brug af hormonel prævention (dansk kohorte: ca. 1 ekstra tilfælde pr. 7.700 kvinder pr. år), som aftager efter ophør.</p>`
    );
  }

  function sourceNote() {
    return `<p class="source-note">Præparatnavne er danske handelsnavne pr. seneste opdatering og skal verificeres på
      <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a> (udbud, styrker, pakninger og tilskud ændres løbende).</p>`;
  }

  function enzymBox() {
    return box(
      "box-amber",
      "Enzyminducerende medicin",
      `<p>Fx carbamazepin, fenytoin, topiramat, rifampicin, visse hiv-midler og perikon nedsætter effekten af p-piller, plaster, ring, minipiller og implantat. <strong>Anbefal kobberspiral, hormonspiral eller Depo-Provera</strong>, som ikke påvirkes. Fortsæt ekstra beskyttelse i 28 dage efter ophør med det enzyminducerende middel.</p>`
    );
  }

  function lamotriginBox() {
    return box(
      "box-amber",
      "Lamotrigin",
      `<p>Østrogen sænker lamotrigin-koncentrationen markant (og den stiger igen i pillepausen), med risiko for dårligere anfaldskontrol eller bivirkninger. Kombineret prævention frarådes ved lamotrigin-monoterapi; gestagen-only metoder og spiraler kan anvendes. Konferér med neurolog ved skift.</p>`
    );
  }

  function alderBoxes(s) {
    if (!alderKendt(s)) return "";
    if (s.alder < 15) {
      return box(
        "box-blue",
        "Under 15 år",
        `<p>Rådgivning om prævention kan gives uden forældresamtykke. Ved behandling skal forældremyndighedens indehaver som udgangspunkt informeres og give samtykke (sundhedsloven § 17). Fra 15 år kan den unge selv samtykke. Vær opmærksom på tegn på overgreb eller udnyttelse.</p>`
      );
    }
    if (s.alder >= 40) {
      return box(
        "box-blue",
        "Prævention fra 40 år",
        `<p>Prævention anbefales indtil 2 år efter sidste menstruation hos kvinder under 50 år og 1 år hos kvinder over 50 år; alle kan stoppe ved 55 år. Kombineret prævention kan bruges til 50 år hos raske ikke-rygere, derefter skift til gestagen-only metode eller spiral. En 52 mg hormonspiral anlagt efter 45 år kan (off-label) blive siddende til 55 år og kan senere dække endometriebeskyttelse ved hormonbehandling — se <a href="${KLIMAKTERIE_URL}" target="_blank" rel="noopener">Klimakterieguiden</a>.</p>`
      );
    }
    return "";
  }

  // ---------------------------------------------------------------------
  // Beslutningslogik
  // ---------------------------------------------------------------------

  function nodpraevention(s) {
    const bmiHigh = s.bmi !== null && !isNaN(s.bmi) && s.bmi > 26;
    const lngDose = bmiHigh || enzym(s)
      ? "3 mg (2 tabletter) — dobbeltdosis pga. " + (enzym(s) ? "enzyminducerende medicin" : "BMI > 26") + " (FSRH, off-label)"
      : "1,5 mg (1 tablet)";
    const kobber = { navn: "Kobberspiral", indhold: "Hormonfri", dosering: "Mest effektive mulighed (> 99 %), upåvirket af vægt og medicin, og giver fortsat prævention.", tag: "Mest effektiv", tagClass: "tag-recommend" };
    const ella = { navn: "ellaOne (ulipristalacetat 30 mg)", indhold: "Progesteronreceptormodulator", dosering: `1 tablet snarest muligt, senest 120 timer efter. Mere effektiv end levonorgestrel.${bmiHigh ? " Foretrækkes frem for levonorgestrel ved BMI > 26." : ""} Håndkøb.`, tag: "Anbefalet", tagClass: "tag-recommend" };
    const lng = { navn: "NorLevo / Levodonna / Frivelle (levonorgestrel)", indhold: "Gestagen", dosering: `${lngDose} snarest muligt, senest 72 timer efter. Håndkøb.`, tag: enzym(s) ? "Anbefalet hvis spiral fravælges" : "Alternativ", tagClass: enzym(s) ? "tag-recommend" : "tag-alt" };

    let html = "";
    if (s.nodTiming === "over120") {
      html += box(
        "box-red",
        "Mere end 120 timer (5 døgn) siden ubeskyttet samleje",
        `<p>Nødpillerne er ikke dokumenteret effektive så sent. Kobberspiral kan anlægges op til 5 dage efter det tidligst forventede ægløsningstidspunkt, også hvis der er gået mere end 5 dage siden samlejet. Ved tvivl: kontakt gynækologisk afdeling. Tilbyd graviditetstest 3 uger efter samlejet, og rådgiv om fast prævention.</p>`
      );
    } else if (s.nodTiming === "72to120") {
      const rows = enzym(s) ? [kobber] : [kobber, ella];
      html += box(
        "box-amber",
        "72–120 timer (3–5 døgn) siden ubeskyttet samleje",
        `<p>Levonorgestrel er ikke godkendt efter 72 timer.${enzym(s) ? " ellaOne frarådes ved enzyminducerende medicin — kobberspiral er eneste sikre mulighed." : ""}</p>${drugTable(rows)}`
      );
    } else {
      const rows = enzym(s) ? [kobber, lng] : [kobber, ella, lng];
      html += box(
        "box-green",
        s.nodTiming === "under24" ? "Under 24 timer siden ubeskyttet samleje" : "24–72 timer (3 døgn) siden ubeskyttet samleje",
        `${enzym(s) ? "<p>ellaOne frarådes ved enzyminducerende medicin.</p>" : ""}${drugTable(rows)}`
      );
    }

    if (bmiHigh && s.nodTiming !== "over120") {
      html += box(
        "box-amber",
        "Forhøjet BMI",
        `<p>Ved BMI &gt; 26 eller vægt &gt; 70 kg (indtastet BMI: ${fmtNum(s.bmi)}) kan effekten af levonorgestrel være nedsat. Rækkefølge: kobberspiral → ellaOne → levonorgestrel i dobbeltdosis (3 mg).</p>`
      );
    }

    const amningLine = s.amning
      ? "<li>Amning: levonorgestrel kan bruges. Efter ellaOne vurderer FSRH (2025), at amningen kan fortsætte; produktresuméet anbefaler en uges pause — informér om begge.</li>"
      : "";
    html += box(
      "box-blue",
      "Vigtige forbehold ved nødprævention",
      `<ul class="followup-list">
        <li>Pillerne beskytter ikke mod senere ubeskyttet samleje i samme cyklus — brug kondom resten af cyklussen.</li>
        <li>Efter ellaOne: vent 5 dage med at starte hormonel prævention, og tag ikke levonorgestrel inden for de 5 dage (nedsætter virkningen). Efter levonorgestrel kan hormonel prævention startes samme dag ("quick start").</li>
        ${amningLine}
        <li>Graviditetstest 3 uger efter samlejet, eller hvis menstruationen udebliver eller er unormal. Tilbyd klamydiatest.</li>
        <li>Brug konsultationen til at tilbyde fast prævention — fjern fluebenet ved "Akut nødprævention" for at se den almindelige anbefaling.</li>
      </ul>`
    );
    return html;
  }

  function update() {
    const s = getState();
    let html = "";

    // 1. Akut nødprævention — separat, prioriteret gren.
    if (s.nodPraevention) {
      output.innerHTML = nodpraevention(s) + sourceNote();
      return;
    }

    // 2. Graviditet.
    if (s.absoluteAlle.includes("grav")) {
      output.innerHTML = box(
        "box-blue",
        "Graviditet markeret",
        `<p>Prævention er ikke relevant nu — afklar graviditet (u-hCG) og følg svangreomsorgen. Fjern fluebenet ved "Graviditet / mistanke om graviditet" for at se en præventionsanbefaling.</p>`
      );
      return;
    }

    html += alderBoxes(s);

    // 3. Kontraindikationer mod al hormonel prævention.
    const alvorligeAbs = s.absoluteAlle.filter((k) => k !== "grav");
    const spiralOk = s.spiralKontra.length === 0;
    if (alvorligeAbs.length > 0) {
      const list = alvorligeAbs.map((k) => `<li>${ABS_ALLE_LABELS[k]}</li>`).join("");
      html += box(
        "box-red",
        "⚠ Al hormonel prævention frarådes som udgangspunkt",
        `<p>Følgende er markeret:</p><ul>${list}</ul>
         <p>Både kombineret og gestagen-only hormonel prævention frarådes ved aktiv/tidligere brystkræft. Uafklaret vaginalblødning udredes først (udeluk graviditet, klamydia og malignitet). Ved brystkræft under behandling konfereres præventionsvalget med onkologisk afdeling.</p>
         ${spiralOk
           ? drugTable([kobberRow(s, "Anbefalet", "tag-recommend")])
           : `<p><strong>Bemærk:</strong> spiral-specifik kontraindikation er også markeret — konferér med gynækolog om egnet metode, fx kondom/pessar eller sterilisation.</p>`}`
      );
      if (!spiralOk) {
        const slist = s.spiralKontra.map((k) => `<li>${SPIRAL_KONTRA_LABELS[k]}</li>`).join("");
        html += box("box-amber", "Spiral-specifik kontraindikation markeret", `<ul>${slist}</ul>`);
      }
      html += condomNote();
      output.innerHTML = html + followUpBox() + sourceNote();
      return;
    }

    // 4. Almindelig algoritme.
    const chcReasons = chcUdelukket(s);
    const chcOk = chcReasons.length === 0;

    if (chcReasons.length > 0 && s.praeferens !== "hormonfri" && s.praeferens !== "sterilisation") {
      html += box(
        "box-amber",
        "Kombineret hormonel prævention (p-piller/plaster/ring) frarådes",
        `<ul>${chcReasons.map((r) => `<li>${r}</li>`).join("")}</ul>`
      );
    }

    if (enzym(s)) html += enzymBox();
    if (s.andet.includes("lamotrigin")) html += lamotriginBox();

    if (s.migraene === "uden_aura" && chcOk) {
      html += box(
        "box-amber",
        "Migræne uden aura",
        `<p>Udelukker ikke kombineret prævention, men følg op: skift til østrogenfri metode, hvis migrænen forværres, bliver hyppigere, eller der opstår aura.</p>`
      );
    }

    if (s.praeferens === "sterilisation") {
      html += box(
        "box-green",
        "Ønske om permanent løsning: sterilisation",
        `<p>Sterilisation (hos kvinden, eller vasektomi hos partneren) er permanent og bør kun tilbydes efter grundig rådgivning — henvis til gynækologisk afdeling (vasektomi: urolog). Langtidsvirkende metoder er lige så sikre og reversible og bør nævnes som alternativ. Tilbyd en effektiv metode i ventetiden:</p>
        ${drugTable(larcRows(s, spiralOk))}`
      );
    } else if (s.praeferens === "hormonfri") {
      const rows = [];
      if (spiralOk) rows.push(kobberRow(s, "Anbefalet", "tag-recommend"));
      rows.push(
        { navn: "Kondom", indhold: "Barrieremetode", dosering: "Beskytter også mod sexsygdomme. Ca. 82 % effektiv ved almindelig brug.", tag: spiralOk ? "Supplement/alternativ" : "Anbefalet", tagClass: spiralOk ? "tag-alt" : "tag-recommend" },
        { navn: "Pessar + sæddræbende creme", indhold: "Barrieremetode", dosering: "Kræver korrekt brug ved hvert samleje — lavere effektivitet.", tag: "Alternativ", tagClass: "tag-alt" }
      );
      html += box("box-green", "Ønske om hormonfri prævention", drugTable(rows));
    } else if (s.praeferens === "larc" || (s.praeferens === "ingen" && alderKendt(s) && s.alder < 20)) {
      const ung = s.praeferens === "ingen";
      html += box(
        "box-green",
        ung ? "Anbefaling: langtidsvirkende prævention (LARC) — foretrukket ved ung alder" : "Ønske om langtidsvirkende prævention (LARC)",
        `<p>${ung ? "LARC har markant lavere fejlrate end p-piller, fordi den ikke afhænger af daglig huskeevne. " : ""}Tjek aktuelle tilskudsregler for langtidsvirkende prævention til unge i din region.</p>
        ${drugTable(larcRows(s, spiralOk))}
        ${chcOk ? "<p>Kombineret prævention er også en mulighed, hvis LARC fravælges — se nedenfor.</p>" : ""}`
      );
    }

    if (s.praeferens !== "sterilisation" && s.praeferens !== "hormonfri") {
      if (chcOk && (s.praeferens === "pille" || s.praeferens === "ingen" || s.praeferens === "larc")) {
        html += box(
          "box-green",
          "Anbefaling: kombineret p-pille med levonorgestrel og lav østrogendosis",
          `<p>Ingen kontraindikationer mod kombineret prævention er markeret. Førstevalg er en p-pille med levonorgestrel (eller norgestimat) og 20 mikrog. ethinylestradiol, jf. Sundhedsstyrelsens NRL — laveste risiko for blodpropper.</p>
          ${drugTable([
            { navn: "Mirabella", indhold: "Levonorgestrel 100 mikrog. + ethinylestradiol 20 mikrog.", dosering: "1 tablet dgl. i 21 dage + 7 dages pause (eller forlænget regime, se nedenfor).", tag: "Førstevalg", tagClass: "tag-recommend" },
            { navn: "Microgyn / Rigevidon / Femicept", indhold: "Levonorgestrel 150 mikrog. + ethinylestradiol 30 mikrog.", dosering: "1 tablet dgl. i 21 dage + 7 dages pause. Samme lave VTE-risiko; færre pletblødninger for nogle.", tag: "Alternativ", tagClass: "tag-alt" },
            { navn: "Cilest (bekræft udbud)", indhold: "Norgestimat 250 mikrog. + ethinylestradiol 35 mikrog.", dosering: "Lav VTE-risiko som levonorgestrel; højere østrogendosis.", tag: "Alternativ", tagClass: "tag-alt" },
            { navn: "NuvaRing / Evra", indhold: "Vaginalring (etonogestrel) / plaster (norelgestromin) med ethinylestradiol", dosering: "Ring i 3 uger / plaster skiftes ugentligt. Godt ved problemer med daglig pille, men højere VTE-risiko end levonorgestrel-piller (6–12 mod 5–7 pr. 10.000 pr. år).", tag: "Alternativ", tagClass: "tag-alt" },
          ])}
          <p>Pillerne kan tages i <strong>forlænget eller kontinuerligt regime</strong> (springe pausen over) — færre blødninger og menstruationssmerter og ingen dokumenteret ulempe. Drospirenon-, desogestrel- og gestoden-holdige piller (fx Yasmin) har højere VTE-risiko og er ikke førstevalg. Før opstart: blodtryk, BMI og VTE-anamnese (Lægemiddelstyrelsens tjekliste).</p>`
        );
      } else if (!chcOk) {
        const larcAlreadyShown = s.praeferens === "larc" || (s.praeferens === "ingen" && alderKendt(s) && s.alder < 20);
        const rows = gestagenOnlyRows(s).concat(larcAlreadyShown ? [] : larcRows(s, spiralOk));
        html += box(
          "box-green",
          "Anbefaling: østrogenfri prævention",
          `<p>Da kombineret prævention frarådes (se ovenfor), anbefales en østrogenfri metode.</p>${drugTable(rows)}`
        );
      }
    }

    if (s.andet.includes("kraftig") && s.praeferens !== "hormonfri") {
      html += box(
        "box-blue",
        "Kraftige eller smertefulde menstruationer",
        `<p>Mirena reducerer blødningen mest og er ofte førstevalg; kombinerede p-piller (gerne i forlænget regime) hjælper også. Kobberspiral kan forværre generne. Ved nyopståede eller tiltagende gener: udred (hæmoglobin, evt. ferritin, gynækologisk undersøgelse) — <a href="${BLOEDNINGSKALENDER_URL}" target="_blank" rel="noopener">Blødningskalenderen</a> kan kortlægge mønsteret.</p>`
      );
    }

    if (s.amning) {
      html += box(
        "box-blue",
        "Amning",
        `<p>Minipiller, hormonspiral, kobberspiral og implantat kan anvendes under amning. Kombineret prævention frarådes de første 6 uger efter fødslen og bør generelt undgås, så længe amningen er den primære ernæringskilde. Spiral kan anlægges inden for 48 timer eller fra 4 uger efter fødslen.</p>`
      );
    }

    if (!spiralOk) {
      const slist = s.spiralKontra.map((k) => `<li>${SPIRAL_KONTRA_LABELS[k]}</li>`).join("");
      html += box(
        "box-amber",
        "Spiral-specifik kontraindikation markeret",
        `<p>Følgende taler imod spiral (hormon- og kobberspiral) nu:</p><ul>${slist}</ul><p>Udred/behandl først, eller vælg en anden metode.</p>`
      );
    }

    html += condomNote();
    html += opstartBox();
    html += glemtePillerBox();
    html += risikoBox();
    output.innerHTML = html + followUpBox() + sourceNote();
  }

  // ---------------------------------------------------------------------
  // Journaltekst
  // ---------------------------------------------------------------------

  function recommendedRowText() {
    const tag = output.querySelector(".tag-recommend");
    if (!tag) return null;
    const cells = tag.closest("tr").querySelectorAll("td");
    const navn = Array.from(cells[0].childNodes)
      .filter((n) => !(n.nodeType === 1 && n.classList.contains("tag")))
      .map((n) => n.textContent)
      .join("")
      .trim();
    return `${navn} (${cells[1].textContent.trim()}) — ${cells[2].textContent.trim()}`;
  }

  // Kort, redigerbart journalnotat bygget af input + den viste anbefaling.
  function buildJournalNote() {
    const s = getState();
    const lines = [`${s.nodPraevention ? "Nødprævention" : "Præventionsrådgivning"} ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (alderKendt(s)) basis.push(`${s.alder} år`);
    if (s.bmi !== null && !isNaN(s.bmi)) basis.push(`BMI ${fmtNum(s.bmi)}`);
    if (s.ryger) basis.push("ryger");
    if (s.amning) basis.push("ammer");
    if (s.postpartum) basis.push("< 6 uger postpartum");
    if (enzym(s)) basis.push("enzyminducerende medicin");
    if (s.andet.includes("lamotrigin")) basis.push("lamotrigin");
    if (basis.length) {
      const text = basis.join(", ");
      lines.push(text.charAt(0).toUpperCase() + text.slice(1) + ".");
    }
    if (s.nodPraevention) {
      const timing = { under24: "under 24 timer", "24to72": "24–72 timer", "72to120": "72–120 timer", over120: "over 120 timer" }[s.nodTiming];
      lines.push(`Ubeskyttet samleje for ${timing} siden.`);
    } else {
      const ki = [];
      s.absoluteAlle.forEach((k) => ki.push(ABS_ALLE_LABELS[k]));
      chcUdelukket(s).forEach((r) => ki.push(r));
      if (s.migraene === "med_aura") ki.push("migræne med aura");
      lines.push(`Forhold mod østrogenholdig prævention/kontraindikationer: ${ki.length ? [...new Set(ki)].join("; ") : "ingen markeret"}.`);
      lines.push(`Præference: ${PRAEF_LABELS[s.praeferens]}.`);
    }
    const heading = output.querySelector(".box-red h3, .box-green h3");
    if (heading) lines.push(`Vurdering: ${heading.textContent.replace("⚠", "").replace(/^Anbefaling:\s*/, "").trim()}.`);
    const rec = recommendedRowText();
    if (rec) lines.push(`Førstevalg: ${rec}`);
    lines.push(s.nodPraevention
      ? "Plan (tilpas): graviditetstest efter 3 uger ved udebleven menstruation; fast prævention drøftet."
      : "Plan (tilpas): information om brug, bivirkninger og ekstra beskyttelse ved opstart. Kondom ved STI-risiko. Kontrol ca. 3 mdr.");
    return lines.join("\n");
  }

  // Fuld tekstversion af den viste anbefaling (inkl. sammenklappede afsnit).
  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl
        .querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > p, :scope > details > ul, :scope > details > .drug-table-wrap")
        .forEach((el) => {
          if (el.tagName === "P") {
            lines.push(el.textContent.trim());
          } else if (el.tagName === "UL") {
            el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
          } else {
            el.querySelectorAll("tbody tr").forEach((tr) => {
              const cells = Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim());
              lines.push("  * " + cells.join(" — "));
            });
          }
        });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  checkAlderRange();
  nodTimingWrap.hidden = !nodCheckbox.checked;
  update();
})();
