/*
 * Beslutningsstøtte for hormonbehandling ved klimakteriet.
 * Algoritmen er en forenklet, klinisk huskeseddel der bygger på principperne i
 * Sundhedsstyrelsens Nationale Rekommandationsliste (NRL) "Hormonbehandling i
 * klimakterie og menopause" (2022) og DSOG's reviderede guideline for
 * menopausal hormonterapi (februar 2026). Præparateksempler er danske
 * handelsnavne og skal altid verificeres på pro.medicin.dk før ordination.
 *
 * Version: opdateret 22. september 2026 efter ekstern audit af algoritme og UX.
 * Væsentligste rettelser i denne version:
 *  - Uterus-status og reproduktiv/ovariel status er nu to uafhængige felter
 *    (tidligere ét kombineret radioknap-sæt, som kunne nulstille et manuelt
 *    korrekt uterus-valg tavst ved skift af status).
 *  - Prænatur ovarieinsufficiens (POI) tjekkes nu umiddelbart efter absolutte
 *    kontraindikationer, FØR "kun GSM"- og "ingen symptomer"-grenene, så en
 *    POI-patient med kun lokale symptomer (eller ingen rapporterede symptomer)
 *    ikke længere mister den systemiske, tilstands-betingede anbefaling.
 *  - Transdermal østrogen er nu det generelle førstevalg for systemisk
 *    behandling (ikke kun ved markerede risikofaktorer), i tråd med NRL.
 *  - Tilføjet: præventionspåmindelse, note om testosteron ved vedvarende
 *    nedsat libido, BMI som tal frem for tærskel-afkrydsning, aldersvarsel
 *    ved usædvanlige værdier, og et POI/alder-krydstjek.
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");
  const alderInput = document.getElementById("alder");
  const alderWarning = document.getElementById("alderWarning");
  const printMeta = document.getElementById("printMeta");

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  printBtn.addEventListener("click", () => {
    const now = new Date();
    printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede valg på tidspunktet for udskrift.";
    window.print();
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    // form.reset() does not dispatch "input" events on the fields it
    // resets, so listeners that only react to "input" (like the age
    // sanity-check below) would otherwise keep showing stale state.
    checkAlderRange();
    update();
  });

  copyBtn.addEventListener("click", () => {
    const text = buildJournalText();
    try {
      navigator.clipboard.writeText(text).then(() => {
        copyStatus.textContent = "Kopieret ✓";
        setTimeout(() => (copyStatus.textContent = ""), 2500);
      }).catch(() => {
        copyStatus.textContent = "Kunne ikke kopiere (fx pga. lokal fil uden https) — markér og kopiér manuelt.";
      });
    } catch (e) {
      copyStatus.textContent = "Kunne ikke kopiere (fx pga. lokal fil uden https) — markér og kopiér manuelt.";
    }
  });

  function checkAlderRange() {
    const v = parseInt(alderInput.value, 10);
    alderWarning.textContent = (!v || v < 18 || v > 100) ? "Alder virker usædvanlig — tjek indtastningen." : "";
  }
  alderInput.addEventListener("input", checkAlderRange);

  function getState() {
    // No || 0 fallback: an empty field should stay "unknown" (NaN), not
    // silently become age 0, since 0 satisfies age-threshold comparisons
    // in unintended ways (e.g. would look like "very young").
    const alder = parseInt(alderInput.value, 10);
    const bmiRaw = document.getElementById("bmiInput").value;
    const bmi = bmiRaw === "" ? null : parseFloat(bmiRaw);
    const symptomer = Array.from(document.querySelectorAll('input[name="symptom"]:checked')).map((el) => el.value);
    const uterus = document.querySelector('input[name="uterus"]:checked').value === "ja";
    const status = document.querySelector('input[name="status"]:checked').value;
    const absolutte = Array.from(document.querySelectorAll('input[name="absolut"]:checked')).map((el) => el.value);
    const relative = Array.from(document.querySelectorAll('input[name="relativ"]:checked')).map((el) => el.value);
    const praeferens = document.querySelector('input[name="praeferens"]:checked').value;
    return { alder, bmi, symptomer, uterus, status, absolutte, relative, praeferens };
  }

  const ABSOLUT_LABELS = {
    cancer: "Tidligere/aktiv brystkræft eller anden østrogenfølsom cancer",
    blodning: "Uafklaret vaginalblødning",
    vte: "Aktiv/nylig venøs tromboemboli uden antikoagulation",
    arteriel: "Aktiv arteriel tromboembolisk sygdom (nylig AMI/apopleksi)",
    lever: "Aktiv leversygdom med påvirket leverfunktion",
    grav: "Graviditet / mistanke om graviditet",
  };

  const RELATIV_LABELS = {
    ryger: "Rygning",
    migraene: "Migræne med aura",
    trombofili: "Familiær VTE-disposition/trombofili",
    htn: "Ukontrolleret hypertension",
    galde: "Galdeblæresygdom",
    trigly: "Forhøjede triglycerider",
    alder60: "Opstart > 60 år eller > 10 år siden menopause",
  };

  // Om patienten har markerede risikofaktorer ud over den generelle
  // NRL-baserede præference for transdermal behandling. Bruges kun til at
  // skærpe formuleringen — transdermal anbefales som førstevalg uanset.
  function hasExtraRiskFactors(state) {
    const bmiHigh = state.bmi !== null && !isNaN(state.bmi) && state.bmi >= 30;
    return bmiHigh || state.relative.length > 0 || state.alder >= 60;
  }

  function box(cls, titleHtml, bodyHtml) {
    return `<div class="box ${cls}"><h3>${titleHtml}</h3>${bodyHtml}</div>`;
  }

  function drugTable(rows) {
    let html = `<div class="drug-table-wrap"><table class="drug-table"><thead><tr><th>Præparat (DK)</th><th>Indhold</th><th>Dosering</th></tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><td>${r.navn}${r.tag ? `<span class="tag ${r.tagClass || "tag-alt"}">${r.tag}</span>` : ""}</td><td>${r.indhold}</td><td>${r.dosering}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  function routeBox(state) {
    const extra = hasExtraRiskFactors(state);
    const bmiHigh = state.bmi !== null && !isNaN(state.bmi) && state.bmi >= 30;
    const riskList = state.relative.map((k) => RELATIV_LABELS[k]);
    if (bmiHigh) riskList.push(`BMI ≥ 30 (indtastet: ${state.bmi})`);

    if (extra) {
      return box(
        "box-amber",
        "Valg af administrationsvej",
        `<p><strong>Transdermal behandling (plaster/gel/spray) anbefales</strong> — både som generelt førstevalg for systemisk østrogen, og fordi patienten derudover har markeret specifik(ke) risikofaktor(er): ${riskList.join(", ")}. Transdermal østrogen undgår first-pass-metabolisme i leveren og har lavere risiko for VTE og apopleksi end oral behandling.</p>`
      );
    }
    return box(
      "box-blue",
      "Valg af administrationsvej",
      `<p><strong>Transdermal behandling (plaster/gel/spray) anbefales som generelt førstevalg</strong> for systemisk østrogen frem for oral, uafhængigt af yderligere risikofaktorer — jf. Sundhedsstyrelsens Nationale Rekommandationsliste, som fraråder peroral behandling pga. øget risiko for dyb venetrombose. Oral behandling er en rimelig mulighed ved udtalt patientpræference eller praktiske hensyn${
        state.praeferens === "tablet" ? " (patienten har angivet præference for tabletter)" : ""
      }, men bør ikke være standardvalget.</p>`
    );
  }

  function progestogenBox() {
    return box(
      "box-blue",
      "Om valg af progestogen",
      `<p>Mikroniseret progesteron (Utrogestan) og dydrogesteron (i Femoston) har et mere gunstigt risikoprofil for bryst og VTE end syntetiske progestiner (noretisteronacetat, levonorgestrel) og kan foretrækkes, særligt ved øget bekymring for brystkræftrisiko. Forskellen er dog moderat, og en fast kombinationstablet er ofte simplere og fremmer compliance.</p>`
    );
  }

  function libidoBox() {
    return box(
      "box-blue",
      "Om nedsat libido",
      `<p>Systemisk østrogen alene bedrer ofte kun delvist nedsat lyst. Hvis libido forbliver generende efter optimeret østrogen-/progestogenbehandling, kan <strong>testosterontilskud</strong> overvejes. Dette er off-label til kvinder i Danmark, kræver skærpet informeret samtykke, og bør som udgangspunkt varetages af eller konfereres med gynækolog/specialist med erfaring på området.</p>`
    );
  }

  function contraceptionBox() {
    return box(
      "box-amber",
      "Vigtigt: hormonbehandling er ikke prævention",
      `<p>Kombineret eller cyklisk hormonbehandling virker <strong>ikke</strong> som prævention. Ved fortsat risiko for graviditet anbefales fortsat prævention indtil 2 år efter sidste menstruation, hvis patienten er under 50 år, og 1 år, hvis hun er 50 år eller derover. Ved prænatur ovarieinsufficiens kan spontan ægløsning forekomme uregelmæssigt — samme princip gælder, hvis graviditet ikke er ønsket.</p>`
    );
  }

  function followUpBox() {
    return box(
      "box-blue",
      "Opstart og opfølgning",
      `<ul class="followup-list">
        <li>Informér om forventet effekt (mærkbar i løbet af 2–4 uger, fuld effekt efter ca. 3 måneder) og mulige initiale bivirkninger (spænding i bryster, uregelmæssig blødning de første måneder).</li>
        <li>Kontrol efter 2–3 måneder: symptomeffekt, bivirkninger, blødningsmønster, evt. dosisjustering.</li>
        <li>Ved uventet/vedvarende blødning på kontinuerlig kombinationsbehandling: udredning (transvaginal UL ± gynækologisk henvisning) inden fortsat behandling.</li>
        <li>Årlig revurdering: fortsat indikation, kontraindikationer, blodtryk, og en fælles beslutning om fortsat behandling. Der bruges ikke en fast øvre grænse for behandlingsvarighed — varighed afvejes individuelt.</li>
        <li>Almindeligt mammografiscreeningsprogram følges uændret; bekræft at screening er opdateret inden opstart.</li>
      </ul>`
    );
  }

  function sourceNote() {
    return `<p class="source-note">Præparatnavne er eksempler på danske handelsnavne pr. seneste opdatering og skal verificeres på
      <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a> (udbud, styrker, pakninger og tilskud ændres løbende — bekræft at det enkelte præparat fortsat er markedsført).</p>`;
  }

  function update() {
    const s = getState();
    let html = "";

    // --- 1. Absolutte kontraindikationer — højeste prioritet, altid først ---
    if (s.absolutte.length > 0) {
      const list = s.absolutte.map((k) => `<li>${ABSOLUT_LABELS[k]}</li>`).join("");
      html += box(
        "box-red",
        "⚠ Systemisk hormonbehandling frarådes",
        `<p>Følgende absolutte kontraindikation(er) er markeret:</p><ul>${list}</ul>
         <p><strong>Non-hormonelle alternativer mod vasomotoriske symptomer:</strong></p>
         ${drugTable([
           { navn: "Venlafaxin", indhold: "SNRI", dosering: "37,5–75 mg dgl. (depot) — off-label mod hedeture" },
           { navn: "Escitalopram", indhold: "SSRI", dosering: "10 mg dgl. — off-label mod hedeture" },
           { navn: "Gabapentin", indhold: "Antiepileptikum", dosering: "300–900 mg dgl. fordelt — særligt ved natlige hedeture" },
           { navn: "Clonidin", indhold: "Alfa-2-agonist", dosering: "25–75 mikrogram x 2 dgl. — beskeden effekt, bivirkninger (hypotension, mundtørhed)" },
         ])}
         <p>Ved <em>udelukkende</em> urogenitale symptomer (vaginal tørhed/GSM) kan lavdosis <strong>lokal vaginal østrogen</strong> ofte anvendes selv ved systemisk kontraindikation som brystkræft, pga. minimal systemisk absorption — konferér med onkolog/gynækolog først, særligt ved aromatasehæmmerbehandling.</p>
         <p>Overvej henvisning til gynækolog ved diagnostisk usikkerhed, komplekse kontraindikationer eller ønske om specialistvurdering.</p>`
      );
      output.innerHTML = html + sourceNote();
      return;
    }

    // --- 2. Prænatur ovarieinsufficiens — tjekkes FØR symptom-grenene, da
    //        indikationen er tilstands-betinget og ikke afhænger af hvilke
    //        symptomer patienten aktuelt rapporterer. ---------------------
    if (s.status === "poi") {
      let poiWarning = "";
      if (s.alder >= 40) {
        poiWarning = `<p><strong>Bemærk:</strong> indtastet alder er ≥ 40 år. Prænatur ovarieinsufficiens defineres typisk som ovariesvigt før 40-årsalderen — bekræft diagnosen og tidspunktet for ovariesvigt.</p>`;
      }
      const gsmNote = s.symptomer.includes("gsm")
        ? `<p>Patienten har også markeret urogenitale symptomer (GSM). Systemisk behandling som nedenfor er fortsat indiceret for knogle-/kardiovaskulær beskyttelse; supplér evt. med lokal vaginal østrogen (fx Vagifem/Vagirux) hvis de lokale symptomer ikke er tilstrækkeligt dækket af den systemiske behandling.</p>`
        : "";
      html += box(
        "box-green",
        "Prænatur ovarieinsufficiens (POI) — systemisk hormonbehandling anbefales",
        `${poiWarning}
        <p>Ved POI anbefales systemisk hormonbehandling indtil den naturlige menopausealder (ca. 51 år), <strong>uafhængigt af symptomintensitet og -type</strong>, for at reducere risiko for osteoporose, kardiovaskulær sygdom og tidlig kognitiv påvirkning. Der anvendes typisk lidt højere østrogendoser end ved almindelig substitution for at efterligne fysiologiske niveauer.</p>
        ${gsmNote}
        ${drugTable(
          s.uterus
            ? [
                { navn: "Estradot 100", indhold: "Estradiol 100 mikrogram/døgn depotplaster", dosering: "1 plaster, skiftes 2 x ugentligt", tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
                { navn: "+ Utrogestan 200 mg", indhold: "Mikroniseret progesteron", dosering: "1 kapsel dgl. i 12–14 dage/md. (cyklisk) — evt. kontinuerligt 100 mg dgl. hvis amenorré ønskes" },
                { navn: "Alternativt: Estrofem 2 mg", indhold: "Estradiol, tablet (oral)", dosering: "1 tablet dgl. — kombinér med progesteron som ovenfor" },
              ]
            : [
                { navn: "Estradot 100", indhold: "Estradiol 100 mikrogram/døgn depotplaster", dosering: "1 plaster, skiftes 2 x ugentligt", tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
                { navn: "Alternativt: Estrofem 2 mg", indhold: "Estradiol, tablet (oral)", dosering: "1 tablet dgl." },
              ]
        )}
        <p>Overvej henvisning til gynækolog/endokrinolog mhp. udredning af årsag, fertilitetsrådgivning og individuel dosistitrering. Behandlingen fortsættes som udgangspunkt til ca. 51-årsalderen, hvorefter situationen revurderes som ved almindelig postmenopausal substitution.</p>`
      );
      if (s.symptomer.includes("libido")) html += libidoBox();
      html += contraceptionBox();
      output.innerHTML = html + followUpBox() + sourceNote();
      return;
    }

    // --- 3. Isolerede urogenitale symptomer (GSM) -----------------------
    const kunGSM = s.symptomer.includes("gsm") && s.symptomer.filter((x) => x !== "gsm").length === 0;

    if (kunGSM) {
      html += box(
        "box-green",
        "Anbefaling: Lokal vaginal østrogen",
        `<p>Ved isolerede urogenitale symptomer (Genitourinært Syndrom ved Menopausen, GSM) anbefales lavdosis <strong>lokal</strong> vaginal østrogenbehandling — uafhængigt af uterusstatus, da systemisk optag er minimalt og progestogenbeskyttelse normalt ikke er nødvendig ved standarddosering.</p>
        ${drugTable([
          { navn: "Vagifem / Vagirux", indhold: "Estradiol 10 mikrogram vaginaltabletter", dosering: "1 tablet dgl. i 2 uger, herefter 1 tablet 2 x ugentligt vedligeholdelse", tag: "Førstevalg", tagClass: "tag-recommend" },
          { navn: "Ovesterin", indhold: "Østriol creme/vagitorier", dosering: "Vagitorium/creme dgl. i 2–3 uger, herefter 2 x ugentligt" },
          { navn: "Oestring (Estring)", indhold: "Estradiol vaginalring", dosering: "1 ring vaginalt, skiftes hver 3. måned (bemærk: har tidligere haft periodevise leveringsvanskeligheder — tjek udbud)" },
        ])}
        <p>Behandlingen kan gives langvarigt/livslangt efter behov og seponeres ikke rutinemæssigt. Kombinér med vaginale fugtgivende midler/glidecreme ved behov. Hvis patienten samtidig har vasomotoriske symptomer, vurderes systemisk behandling som beskrevet nedenfor.</p>`
      );
      output.innerHTML = html + followUpBox() + sourceNote();
      return;
    }

    // --- 4. Ingen symptomer markeret -------------------------------------
    if (s.symptomer.length === 0) {
      output.innerHTML = box(
        "box-amber",
        "Ingen symptomer markeret",
        `<p>Markér mindst ét symptom for at få en konkret anbefaling. Uden generende symptomer er der som udgangspunkt ikke indikation for hormonbehandling.</p>`
      );
      return;
    }

    // --- 5. Advarsler ved relative risikofaktorer ------------------------
    const bmiHigh = s.bmi !== null && !isNaN(s.bmi) && s.bmi >= 30;
    let relBox = "";
    if (s.relative.length > 0 || bmiHigh) {
      const list = s.relative.map((k) => `<li>${RELATIV_LABELS[k]}</li>`);
      if (bmiHigh) list.push(`<li>BMI ≥ 30 (indtastet: ${s.bmi})</li>`);
      relBox = box(
        "box-amber",
        "Forsigtighedshensyn",
        `<p>Følgende relative risikofaktor(er) er markeret og påvirker valg af administrationsvej (se nedenfor):</p><ul>${list.join("")}</ul>`
      );
    }

    // --- 6. Systemisk MHT: vælg regime ud fra uterus + cyklusstatus ------
    let regimeBox = "";

    if (!s.uterus) {
      regimeBox = box(
        "box-green",
        "Anbefaling: Østrogen-alene-behandling (ingen uterus)",
        `<p>Da patienten ikke har uterus, er progestogenbeskyttelse af endometriet ikke nødvendig, og der gives østrogen alene.</p>
        ${drugTable([
          { navn: "Divigel 0,5–1 mg eller Estradot 25–50", indhold: "Estradiol gel (dosepose) eller depotplaster", dosering: "Gel: 1 dosepose dgl. Plaster: skiftes 2 x ugentligt", tag: "Anbefalet (transdermal, førstevalg)", tagClass: "tag-recommend" },
          { navn: "Lenzetto", indhold: "Estradiol hudspray", dosering: "1–3 pust dgl. på underarm — alternativ transdermal administrationsform", tag: "Alternativ (transdermal)", tagClass: "tag-alt" },
          { navn: "Estrofem 1–2 mg", indhold: "Estradiol, tablet (oral)", dosering: "1 tablet dgl. — ved udtalt præference for tabletter eller praktiske hensyn", tag: "Alternativ (oral)", tagClass: "tag-alt" },
        ])}`
      );
    } else if (s.status === "peri") {
      regimeBox = box(
        "box-green",
        "Anbefaling: Cyklisk/sekventiel kombinationsbehandling (perimenopausal)",
        `<p>Ved fortsat eller uregelmæssig menstruation gives sekventiel (cyklisk) kombinationsbehandling, som giver en månedlig bortfaldsblødning. Kontinuerlig kombination bør undgås før ca. 12 måneders amenoré pga. øget risiko for uregelmæssig blødning.</p>
        ${drugTable([
          { navn: "Divigel/Estradot + Utrogestan 200 mg", indhold: "Transdermal estradiol + mikroniseret progesteron (cyklisk)", dosering: "Estradiol transdermalt dgl. + Utrogestan 200 mg dgl. i 12–14 dage/md.", tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
          { navn: "Novofem", indhold: "Estradiol 1 mg + noretisteronacetat (sekventiel)", dosering: "1 tablet dgl. — fast kombinationspakning", tag: "Alternativ (oral, fast kombi)", tagClass: "tag-alt" },
          { navn: "Trisekvens", indhold: "Estradiol + noretisteronacetat, trefaset", dosering: "1 tablet dgl. efter pakningens skema", tag: "Alternativ (oral)", tagClass: "tag-alt" },
          { navn: "Femoston 1/10 eller 2/10", indhold: "Estradiol + dydrogesteron (sekventiel)", dosering: "1 tablet dgl. — dydrogesteron har gunstig bryst-/VTE-profil", tag: "Alternativ (oral)", tagClass: "tag-alt" },
        ])}
        <p>Ved samtidigt præventionsbehov eller udtalte blødningsgener kan en <strong>levonorgestrel-spiral (Mirena/Levosert)</strong> anvendes som progestogenkomponent, mens østrogen gives separat (transdermalt eller oralt) — giver ofte mindre blødning og dækker samtidig kontraception.</p>`
      );
    } else {
      regimeBox = box(
        "box-green",
        "Anbefaling: Kontinuerlig kombinationsbehandling (postmenopausal)",
        `<p>Ved &gt; 12 måneders amenoré gives kontinuerlig kombinationsbehandling uden planlagt bortfaldsblødning. Uregelmæssig "spotting" er almindeligt de første 3–6 måneder.</p>
        ${drugTable([
          { navn: "Divigel/Estradot + Utrogestan 100 mg", indhold: "Transdermal estradiol + mikroniseret progesteron (kontinuerlig)", dosering: "Estradiol transdermalt dgl. + Utrogestan 100 mg dgl. kontinuerligt", tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
          { navn: "Activelle", indhold: "Estradiol 1 mg + noretisteronacetat 0,5 mg (kontinuerlig)", dosering: "1 tablet dgl.", tag: "Alternativ (oral, fast kombi)", tagClass: "tag-alt" },
          { navn: "Femoston conti", indhold: "Estradiol + dydrogesteron (kontinuerlig)", dosering: "1 tablet dgl. — dydrogesteron har gunstig bryst-/VTE-profil", tag: "Alternativ (oral)", tagClass: "tag-alt" },
          { navn: "Kliogest (bekræft udbud)", indhold: "Estradiol + noretisteronacetat (kontinuerlig, højere dosis)", dosering: "1 tablet dgl.", tag: "Alternativ (oral)", tagClass: "tag-alt" },
          { navn: "Livial (tibolon)", indhold: "Tibolon 2,5 mg", dosering: "1 tablet dgl. — kun postmenopausalt, må ikke kombineres med anden HRT", tag: "Alternativ", tagClass: "tag-alt" },
        ])}
        <p>Alternativt kan en <strong>levonorgestrel-spiral (Mirena/Levosert)</strong> give endometriebeskyttelsen, mens østrogen doseres separat — nyttigt ved blødningsgener på oral kombination.</p>`
      );
    }

    html += regimeBox;
    html += routeBox(s);
    if (s.uterus) html += progestogenBox();
    if (s.symptomer.includes("libido")) html += libidoBox();
    if (s.status === "peri") html += contraceptionBox();

    output.innerHTML = html + relBox + followUpBox() + sourceNote();
  }

  // Bygger en ren tekstversion af den aktuelle anbefaling ud fra det
  // renderede DOM-indhold (ikke ved at duplikere beslutningslogikken), så
  // "kopiér til journal" ikke afhænger af innerText's håndtering af
  // tabel-layout, som kan blive rodet i visse journalsystemer.
  function buildJournalText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap").forEach((el) => {
        if (el.tagName === "P") {
          lines.push(el.textContent.trim());
        } else if (el.tagName === "UL") {
          el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim()));
        } else {
          const table = el.querySelector("table");
          if (table) {
            table.querySelectorAll("tbody tr").forEach((tr) => {
              const cells = Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim());
              lines.push("  * " + cells.join(" — "));
            });
          }
        }
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  update();
})();
