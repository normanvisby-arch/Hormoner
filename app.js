/*
 * Beslutningsstøtte for hormonbehandling ved klimakteriet.
 * Algoritmen er en forenklet, klinisk huskeseddel baseret på principperne i
 * DSAM's vejledning "Overgangsalderen", Dansk Menopause Selskabs anbefalinger
 * og Sundhedsstyrelsens retningslinjer. Præparateksempler er danske
 * handelsnavne og skal altid verificeres på pro.medicin.dk før ordination.
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");
  const statusRadios = document.querySelectorAll('input[name="status"]');
  const uterusCheckbox = document.getElementById("uterusIntact");

  // Uterus-checkbox følger automatisk valg af reproduktiv status,
  // men lægen kan override (fx supracervikal hysterektomi / usikker anamnese).
  statusRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (r.checked && r.value === "hyst") {
        uterusCheckbox.checked = false;
      } else if (r.checked) {
        uterusCheckbox.checked = true;
      }
      update();
    })
  );

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  printBtn.addEventListener("click", () => window.print());

  resetBtn.addEventListener("click", () => {
    form.reset();
    uterusCheckbox.checked = true;
    update();
  });

  copyBtn.addEventListener("click", () => {
    const text = output.innerText;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copyStatus.textContent = "Kopieret ✓";
        setTimeout(() => (copyStatus.textContent = ""), 2500);
      })
      .catch(() => {
        copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.";
      });
  });

  function getState() {
    const alder = parseInt(document.getElementById("alder").value, 10) || 0;
    const symptomer = Array.from(
      document.querySelectorAll('input[name="symptom"]:checked')
    ).map((el) => el.value);
    const status = document.querySelector('input[name="status"]:checked').value;
    const uterus = uterusCheckbox.checked;
    const absolutte = Array.from(
      document.querySelectorAll('input[name="absolut"]:checked')
    ).map((el) => el.value);
    const relative = Array.from(
      document.querySelectorAll('input[name="relativ"]:checked')
    ).map((el) => el.value);
    const praeferens = document.querySelector('input[name="praeferens"]:checked').value;

    return { alder, symptomer, status, uterus, absolutte, relative, praeferens };
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
    bmi: "BMI > 30",
    migraene: "Migræne med aura",
    trombofili: "Familiær VTE-disposition/trombofili",
    htn: "Ukontrolleret hypertension",
    galde: "Galdeblæresygdom",
    trigly: "Forhøjede triglycerider",
    alder60: "Opstart > 60 år eller > 10 år siden menopause",
  };

  function prefersTransdermal(state) {
    const riskFlags = ["ryger", "bmi", "migraene", "trombofili", "htn", "galde", "trigly", "alder60"];
    return state.relative.some((r) => riskFlags.includes(r)) || state.alder >= 60;
  }

  function box(cls, titleHtml, bodyHtml) {
    return `<div class="box ${cls}"><h3>${titleHtml}</h3>${bodyHtml}</div>`;
  }

  function drugTable(rows) {
    let html = `<table class="drug-table"><thead><tr><th>Præparat (DK)</th><th>Indhold</th><th>Dosering</th></tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><td>${r.navn}${r.tag ? `<span class="tag ${r.tagClass || "tag-alt"}">${r.tag}</span>` : ""}</td><td>${r.indhold}</td><td>${r.dosering}</td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
  }

  function followUpBox() {
    return box(
      "box-blue",
      "Opstart og opfølgning",
      `<ul class="followup-list">
        <li>Informér om forventet effekt (typisk mærkbar i løbet af 2–4 uger, fuld effekt efter ca. 3 måneder) og mulige initiale bivirkninger (spænding i bryster, uregelmæssig blødning de første måneder).</li>
        <li>Kontrol efter 2–3 måneder: symptomeffekt, bivirkninger, blødningsmønster, evt. dosisjustering.</li>
        <li>Ved uventet/vedvarende blødning på kontinuerlig kombinationsbehandling: udredning (transvaginal UL ± gynækologisk henvisning) inden fortsat behandling.</li>
        <li>Årlig revurdering: fortsat indikation, kontraindikationer, blodtryk, og en fælles beslutning om fortsat behandling.</li>
        <li>Der er ingen fast øvre grænse for behandlingsvarighed — “laveste dosis i kortest mulig tid” er forladt som dogme. Varighed afvejes individuelt ud fra symptomer, alder og risikoprofil.</li>
        <li>Almindeligt mammografiscreeningsprogram følges uændret.</li>
      </ul>`
    );
  }

  function sourceNote() {
    return `<p style="font-size:0.82rem;color:var(--color-muted);margin-top:0.75rem;">
      Præparatnavne er eksempler på danske handelsnavne pr. seneste opdatering og skal verificeres på
      <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a> (aktuelt udbud, styrker, pakninger og tilskud ændres løbende).
    </p>`;
  }

  function update() {
    const s = getState();
    let html = "";

    // --- 1. Absolutte kontraindikationer -------------------------------
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
         <p>Ved <em>udelukkende</em> urogenitale symptomer (vaginal tørhed/GSM) kan <strong>lavdosis lokal vaginal østrogen</strong> ofte anvendes selv ved systemisk kontraindikation som brystkræft, pga. minimal systemisk absorption — men dette bør konfereres med patientens onkolog/gynækolog først, særligt ved aromatasehæmmerbehandling.</p>
         <p>Overvej henvisning til gynækolog ved diagnostisk usikkerhed, komplekse kontraindikationer eller ønske om specialistvurdering.</p>`
      );
      output.innerHTML = html + sourceNote();
      return;
    }

    // --- 2. Isolerede urogenitale symptomer (GSM) -----------------------
    const kunGSM =
      s.symptomer.includes("gsm") &&
      s.symptomer.filter((x) => x !== "gsm").length === 0;

    if (kunGSM) {
      html += box(
        "box-green",
        "Anbefaling: Lokal vaginal østrogen",
        `<p>Ved isolerede urogenitale symptomer (Genitourinært Syndrom ved Menopausen, GSM) anbefales lavdosis <strong>lokal</strong> vaginal østrogenbehandling — uafhængigt af uterusstatus, da systemisk optag er minimalt og progestogenbeskyttelse normalt ikke er nødvendig ved standarddosering.</p>
        ${drugTable([
          { navn: "Vagifem / Vagirux", indhold: "Estradiol 10 mikrogram vaginaltabletter", dosering: "1 tablet dgl. i 2 uger, herefter 1 tablet 2 x ugentligt vedligeholdelse", tag: "Førstevalg", tagClass: "tag-recommend" },
          { navn: "Ovesterin", indhold: "Østriol creme/vagitorier", dosering: "Vagitorium/creme dgl. i 2–3 uger, herefter 2 x ugentligt" },
          { navn: "Oestring (Estring)", indhold: "Estradiol vaginalring", dosering: "1 ring vaginalt, skiftes hver 3. måned" },
        ])}
        <p>Behandlingen kan gives langvarigt/livslangt efter behov og seponeres ikke rutinemæssigt. Kombinér med vaginale fugtgivende midler/glidecreme ved behov. Hvis patienten samtidig har vasomotoriske symptomer, vurderes systemisk behandling som beskrevet nedenfor.</p>`
      );
      output.innerHTML = html + followUpBox() + sourceNote();
      return;
    }

    if (s.symptomer.length === 0) {
      output.innerHTML = box(
        "box-amber",
        "Ingen symptomer markeret",
        `<p>Markér mindst ét symptom for at få en konkret anbefaling. Uden generende symptomer er der som udgangspunkt ikke indikation for hormonbehandling (bortset fra evt. knogle-/kardiovaskulær beskyttelse ved prænatur ovarieinsufficiens, se nedenfor).</p>`
      );
      return;
    }

    // --- 3. Advarsler ved relative risikofaktorer ------------------------
    let relBox = "";
    if (s.relative.length > 0) {
      const list = s.relative.map((k) => `<li>${RELATIV_LABELS[k]}</li>`).join("");
      relBox = box(
        "box-amber",
        "Forsigtighedshensyn",
        `<p>Følgende relative risikofaktor(er) er markeret og påvirker valg af administrationsvej (se nedenfor):</p><ul>${list}</ul>`
      );
    }

    // --- 4. Prænatur ovarieinsufficiens (POI) ----------------------------
    if (s.status === "poi") {
      html += box(
        "box-green",
        "Prænatur ovarieinsufficiens (POI) — systemisk hormonbehandling anbefales",
        `<p>Ved POI (&lt; 40 år) anbefales systemisk hormonbehandling indtil den naturlige menopausealder (ca. 51 år), uafhængigt af symptomintensitet, for at reducere risiko for osteoporose, kardiovaskulær sygdom og tidlig kognitiv påvirkning. Der anvendes typisk lidt højere østrogendoser end ved almindelig substitution for at efterligne fysiologiske niveauer.</p>
        ${drugTable(
          s.uterus
            ? [
                { navn: "Estradot 100", indhold: "Estradiol 100 mikrogram/døgn depotplaster", dosering: "1 plaster, skiftes 2 x ugentligt", tag: "Foretrukket ved POI", tagClass: "tag-recommend" },
                { navn: "+ Utrogestan 200 mg", indhold: "Mikroniseret progesteron", dosering: "1 kapsel dgl. i 12–14 dage/md. (cyklisk) — evt. kontinuerligt 100 mg dgl. hvis amenorré ønskes" },
                { navn: "Alternativt: Estrofem 2 mg", indhold: "Estradiol, tablet", dosering: "1 tablet dgl. — kombinér med progesteron som ovenfor" },
              ]
            : [
                { navn: "Estradot 100", indhold: "Estradiol 100 mikrogram/døgn depotplaster", dosering: "1 plaster, skiftes 2 x ugentligt", tag: "Foretrukket ved POI", tagClass: "tag-recommend" },
                { navn: "Alternativt: Estrofem 2 mg", indhold: "Estradiol, tablet", dosering: "1 tablet dgl." },
              ]
        )}
        <p>Overvej henvisning til gynækolog/endokrinolog mhp. udredning af årsag, fertilitetsrådgivning og individuel dosistitrering. Behandlingen fortsættes som udgangspunkt til ca. 51-årsalderen, hvorefter situationen revurderes som ved almindelig postmenopausal substitution.</p>`
      );
      output.innerHTML = html + relBox + followUpBox() + sourceNote();
      return;
    }

    // --- 5. Systemisk MHT: vælg regime ud fra uterus + cyklusstatus ------
    const transdermalAnbefalet = prefersTransdermal(s);
    let regimeBox = "";

    if (!s.uterus) {
      // Østrogen-alene
      regimeBox = box(
        "box-green",
        "Anbefaling: Østrogen-alene-behandling (ingen uterus)",
        `<p>Da patienten ikke har uterus, er progestogenbeskyttelse af endometriet ikke nødvendig, og der gives østrogen alene.</p>
        ${drugTable(
          transdermalAnbefalet
            ? [
                { navn: "Divigel 0,5–1 mg", indhold: "Estradiol gel, dosepose", dosering: "1 dosepose dgl. påsmøres huden", tag: "Foretrukket (transdermal)", tagClass: "tag-recommend" },
                { navn: "Estradot 25–50", indhold: "Estradiol 25–50 mikrogram/døgn depotplaster", dosering: "1 plaster, skiftes 2 x ugentligt", tag: "Foretrukket (transdermal)", tagClass: "tag-recommend" },
                { navn: "Estrofem 1–2 mg", indhold: "Estradiol, tablet", dosering: "1 tablet dgl. — kun ved fravalg af transdermal trods risikofaktorer" },
              ]
            : [
                { navn: "Estrofem 1–2 mg", indhold: "Estradiol, tablet", dosering: "1 tablet dgl.", tag: "Førstevalg", tagClass: "tag-recommend" },
                { navn: "Divigel 0,5–1 mg", indhold: "Estradiol gel, dosepose", dosering: "1 dosepose dgl. — ligeværdigt alternativ" },
                { navn: "Estradot 25–50", indhold: "Estradiol depotplaster", dosering: "1 plaster, skiftes 2 x ugentligt — ligeværdigt alternativ" },
              ]
        )}`
      );
    } else if (s.status === "peri") {
      // Cyklisk/sekventiel kombination
      regimeBox = box(
        "box-green",
        "Anbefaling: Cyklisk/sekventiel kombinationsbehandling (perimenopausal)",
        `<p>Ved fortsat eller uregelmæssig menstruation gives sekventiel (cyklisk) kombinationsbehandling, som giver en månedlig bortfaldsblødning. Kontinuerlig kombination bør undgås før ca. 12 måneders amenoré pga. øget risiko for uregelmæssig blødning.</p>
        ${drugTable([
          { navn: "Novofem", indhold: "Estradiol 1 mg + noretisteronacetat (sekventiel)", dosering: "1 tablet dgl. — fast kombinationspakning", tag: "Førstevalg (fast kombi)", tagClass: "tag-recommend" },
          { navn: "Trisekvens", indhold: "Estradiol + noretisteronacetat, trefaset", dosering: "1 tablet dgl. efter pakningens skema" },
          { navn: "Femoston 1/10 eller 2/10", indhold: "Estradiol + dydrogesteron (sekventiel)", dosering: "1 tablet dgl. — dydrogesteron har gunstig bryst-/VTE-profil" },
          { navn: (transdermalAnbefalet ? "Divigel/Estradot" : "Estrofem") + " + Utrogestan 200 mg", indhold: "Estradiol (gel/plaster/tablet) + mikroniseret progesteron", dosering: transdermalAnbefalet
              ? "Estradiol transdermalt dgl. + Utrogestan 200 mg dgl. i 12–14 dage/md. (cyklisk)"
              : "Estradiol 1–2 mg dgl. + Utrogestan 200 mg dgl. i 12–14 dage/md. (cyklisk)",
            tag: transdermalAnbefalet ? "Foretrukket ved risikofaktorer" : "Alternativ", tagClass: transdermalAnbefalet ? "tag-recommend" : "tag-alt" },
        ])}
        <p>Ved samtidigt præventionsbehov eller udtalte blødningsgener kan en <strong>levonorgestrel-spiral (Mirena/Levosert)</strong> anvendes som progestogenkomponent, mens østrogen gives separat (transdermalt eller oralt) — giver ofte mindre blødning og dækker samtidig kontraception.</p>`
      );
    } else {
      // Postmenopausal: kontinuerlig kombination
      regimeBox = box(
        "box-green",
        "Anbefaling: Kontinuerlig kombinationsbehandling (postmenopausal)",
        `<p>Ved &gt; 12 måneders amenoré gives kontinuerlig kombinationsbehandling uden planlagt bortfaldsblødning. Uregelmæssig “spotting” er almindeligt de første 3–6 måneder.</p>
        ${drugTable([
          { navn: "Activelle", indhold: "Estradiol 1 mg + noretisteronacetat 0,5 mg (kontinuerlig)", dosering: "1 tablet dgl.", tag: "Førstevalg (fast kombi)", tagClass: "tag-recommend" },
          { navn: "Femoston conti", indhold: "Estradiol + dydrogesteron (kontinuerlig)", dosering: "1 tablet dgl. — dydrogesteron har gunstig bryst-/VTE-profil" },
          { navn: "Kliogest", indhold: "Estradiol + noretisteronacetat (kontinuerlig, højere dosis)", dosering: "1 tablet dgl." },
          { navn: (transdermalAnbefalet ? "Divigel/Estradot" : "Estrofem") + " + Utrogestan 100 mg", indhold: "Estradiol (gel/plaster/tablet) + mikroniseret progesteron", dosering: transdermalAnbefalet
              ? "Estradiol transdermalt dgl. + Utrogestan 100 mg dgl. kontinuerligt"
              : "Estradiol 1–2 mg dgl. + Utrogestan 100 mg dgl. kontinuerligt",
            tag: transdermalAnbefalet ? "Foretrukket ved risikofaktorer" : "Alternativ (gunstig bryst-/VTE-profil)", tagClass: transdermalAnbefalet ? "tag-recommend" : "tag-alt" },
          { navn: "Livial (tibolon)", indhold: "Tibolon 2,5 mg", dosering: "1 tablet dgl. — kun postmenopausalt, må ikke kombineres med anden HRT" },
        ])}
        <p>Alternativt kan en <strong>levonorgestrel-spiral (Mirena/Levosert)</strong> give endometriebeskyttelsen, mens østrogen doseres separat — nyttigt ved blødningsgener på oral kombination.</p>`
      );
    }

    html += regimeBox;

    // --- 6. Administrationsvej ------------------------------------------
    html += box(
      transdermalAnbefalet ? "box-amber" : "box-blue",
      "Valg af administrationsvej",
      transdermalAnbefalet
        ? `<p><strong>Transdermal behandling (plaster/gel) anbefales</strong> frem for oral, da én eller flere risikofaktorer for VTE/apopleksi er til stede (rygning, BMI &gt; 30, migræne med aura, trombofili, hypertension, høj triglycerid, galdeblæresygdom, eller alder ≥ 60 år/&gt; 10 år postmenopausal). Transdermal østrogen undgår first-pass-metabolisme i leveren og er forbundet med lavere risiko for VTE og apopleksi end oral behandling.</p>`
        : `<p>Ingen særlige risikofaktorer er markeret. Både oral og transdermal behandling kan tilbydes — vælg efter patientens præference${
            s.praeferens === "tablet"
              ? " (patienten har angivet præference for tabletter)"
              : s.praeferens === "transdermal"
              ? " (patienten har angivet præference for plaster/gel)"
              : ""
          }.</p>`
    );

    // --- 7. Progestogenvalg (kun hvis uterus) ----------------------------
    if (s.uterus) {
      html += box(
        "box-blue",
        "Om valg af progestogen",
        `<p>Mikroniseret progesteron (Utrogestan) og dydrogesteron (i Femoston) har i observationelle studier et mere gunstigt risikoprofil for bryst og VTE end syntetiske progestiner (noretisteronacetat, levonorgestrel) og kan foretrækkes, særligt ved øget bekymring for brystkræftrisiko eller trombosetilbøjelighed. Forskellen er dog moderat, og fast kombinationstablet er ofte simplere og fremmer compliance.</p>`
      );
    }

    output.innerHTML = html + relBox + followUpBox() + sourceNote();
  }

  update();
})();
