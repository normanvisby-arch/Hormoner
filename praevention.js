/*
 * Beslutningsstøtte for prævention (kontraception) — praktiserende læge.
 * Bygger på Sundhedsstyrelsens Nationale Rekommandationsliste (NRL)
 * "Hormonal kontraception" (2022), Lægemiddelstyrelsens tjekliste for
 * ordinerende læger ved kombinerede hormonelle kontraceptiva, og DSAM's
 * vejledning om blødningsforstyrrelser hos kvinder i almen praksis
 * (for blødningsmønstre under kontraception). Præparateksempler er danske
 * handelsnavne og skal altid verificeres på pro.medicin.dk før ordination.
 *
 * Designet med samme struktur/lektioner som Klimakterieguide: uafhængige
 * formfelter (ingen skjulte automatiske koblinger mellem felter), et
 * rigtigt <form>-element så Nulstil virker, akut nødprævention som en
 * fuldstændig separat, tidligt afsluttet gren (ligesom absolutte
 * kontraindikationer i klimakterieguiden), og en DOM-baseret ren-tekst
 * journal-eksport.
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
  const nodCheckbox = document.getElementById("nodPraevention");
  const nodTimingWrap = document.getElementById("nodTimingWrap");

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  nodCheckbox.addEventListener("change", () => {
    nodTimingWrap.hidden = !nodCheckbox.checked;
  });

  printBtn.addEventListener("click", () => {
    const now = new Date();
    printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede valg på tidspunktet for udskrift.";
    window.print();
  });

  function checkAlderRange() {
    const v = parseInt(alderInput.value, 10);
    alderWarning.textContent = (!v || v < 12 || v > 60) ? "Alder virker usædvanlig — tjek indtastningen." : "";
  }
  alderInput.addEventListener("input", checkAlderRange);

  resetBtn.addEventListener("click", () => {
    form.reset();
    // form.reset() does not dispatch "input"/"change" events on the fields
    // it resets, so listeners that only react to those (age warning, the
    // nødprævention timing panel's visibility) would otherwise keep
    // showing stale state.
    checkAlderRange();
    nodTimingWrap.hidden = !nodCheckbox.checked;
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

  function getState() {
    const alder = parseInt(alderInput.value, 10) || 0;
    const bmiRaw = document.getElementById("bmiInput").value;
    const bmi = bmiRaw === "" ? null : parseFloat(bmiRaw);
    const nodPraevention = nodCheckbox.checked;
    const nodTiming = document.querySelector('input[name="nodtiming"]:checked')?.value || "under24";
    const ryger = document.getElementById("ryger").checked;
    const postpartum = document.getElementById("postpartum").checked;
    const amning = document.getElementById("amning").checked;
    const migraene = document.querySelector('input[name="migraene"]:checked').value;
    const absoluteCHC = Array.from(document.querySelectorAll('input[name="abs_chc"]:checked')).map((el) => el.value);
    const absoluteAlle = Array.from(document.querySelectorAll('input[name="abs_alle"]:checked')).map((el) => el.value);
    const spiralKontra = Array.from(document.querySelectorAll('input[name="spiral_kontra"]:checked')).map((el) => el.value);
    const praeferens = document.querySelector('input[name="praeferens"]:checked').value;
    return { alder, bmi, nodPraevention, nodTiming, ryger, postpartum, amning, migraene, absoluteCHC, absoluteAlle, spiralKontra, praeferens };
  }

  const ABS_CHC_LABELS = {
    vte: "Aktiv/tidligere venøs tromboemboli (VTE) eller kendt trombofili",
    htn: "Ukontrolleret hypertension eller BT ≥ 160/100",
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

  function box(cls, titleHtml, bodyHtml) {
    return `<div class="box ${cls}"><h3>${titleHtml}</h3>${bodyHtml}</div>`;
  }

  function drugTable(rows) {
    let html = `<div class="drug-table-wrap"><table class="drug-table"><thead><tr><th>Metode/præparat (DK)</th><th>Indhold</th><th>Bemærkning</th></tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><td>${r.navn}${r.tag ? `<span class="tag ${r.tagClass || "tag-alt"}">${r.tag}</span>` : ""}</td><td>${r.indhold}</td><td>${r.dosering}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  function condomNote() {
    return box(
      "box-blue",
      "Husk kondom ved seksuelt overførte infektioner",
      `<p>Ingen af de øvrige metoder beskytter mod sexsygdomme. Kondom bør altid nævnes som supplement ved ny partner eller flere partnere, uanset hvilken præventionsmetode der i øvrigt vælges.</p>`
    );
  }

  function followUpBox() {
    return box(
      "box-blue",
      "Opfølgning",
      `<ul class="followup-list">
        <li>P-piller/plaster/ring: revurdér efter 2–3 måneder (bivirkninger, blodtryk, compliance), derefter årligt.</li>
        <li>Gestagenspiral: revurdér indikationen efter 1 år.</li>
        <li>Implantat og spiraler generelt: informér tydeligt om udløbsdato/tidspunkt for udskiftning, og noter det i journalen.</li>
        <li>Blødningsforstyrrelser er den hyppigste henvendelsesårsag efter opstart — forvent pletblødning de første 3–6 måneder, særligt ved gestagen-only metoder. Se DSAM's vejledning om blødningsforstyrrelser ved vedvarende eller generende blødning.</li>
      </ul>`
    );
  }

  function sourceNote() {
    return `<p class="source-note">Præparatnavne er eksempler på danske handelsnavne pr. seneste opdatering og skal verificeres på
      <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a> (udbud, styrker, pakninger og tilskud ændres løbende).</p>`;
  }

  function chcUdelukket(s) {
    const reasons = [];
    if (s.ryger && s.alder >= 35) reasons.push("Rygning ved alder ≥ 35 år");
    if (s.migraene === "med_aura") reasons.push("Migræne med aura");
    s.absoluteCHC.forEach((k) => reasons.push(ABS_CHC_LABELS[k]));
    if (s.postpartum) reasons.push("Under 6 uger siden fødsel");
    if (s.amning) reasons.push("Ammer i øjeblikket (kombineret prævention bør generelt undgås, så længe amning er primær ernæringskilde)");
    if (s.bmi !== null && !isNaN(s.bmi) && s.bmi >= 35) reasons.push(`Svær overvægt (indtastet BMI: ${s.bmi})`);
    return reasons;
  }

  function migraineCautionBox() {
    return box(
      "box-amber",
      "Migræne uden aura — øget opmærksomhed ved kombineret prævention",
      `<p>Migræne uden aura udelukker ikke i sig selv kombineret hormonel prævention, men bør følges: seponér eller skift til østrogenfri metode hvis migrænen forværres, hyppigheden øges, eller der udvikles aura under behandlingen (tegn på mulig øget risiko for cerebral trombose).</p>`
    );
  }

  function larcRows(spiralOk, alder) {
    const implantAldersNote = (alder < 18 || alder > 40)
      ? " Bemærk: sikkerhed og virkning er kun fastslået for kvinder mellem 18 og 40 år — brug uden for dette interval er off-label."
      : "";
    const rows = [];
    if (spiralOk) {
      rows.push({ navn: "Hormonspiral (Mirena)", indhold: "Levonorgestrel 20 mikrogram/døgn", dosering: "Op til 8 år. Reducerer menstruationsblødning ~97% efter 1 år — god ved samtidig menoragi.", tag: "Anbefalet (LARC)", tagClass: "tag-recommend" });
      rows.push({ navn: "Hormonspiral (Kyleena)", indhold: "Levonorgestrel 17,5 mikrogram/døgn (mindre spiral)", dosering: "Op til 5 år. Tyndere indføringsrør — kan være en fordel ved nullipara.", tag: "Alternativ (LARC)", tagClass: "tag-alt" });
      rows.push({ navn: "Hormonspiral (Levosert)", indhold: "Levonorgestrel, samme indhold som Mirena", dosering: "Op til 6 år." , tag: "Alternativ (LARC)", tagClass: "tag-alt" });
      rows.push({ navn: "Kobberspiral", indhold: "Hormonfri (kobber)", dosering: "Ca. 98% effektiv. Kan give kraftigere/smertefuldere menstruation. Eneste LARC uden hormonel kontraindikation.", tag: "Alternativ (hormonfri)", tagClass: "tag-alt" });
    } else {
      rows.push({ navn: "Kobberspiral", indhold: "Hormonfri (kobber)", dosering: "Ca. 98% effektiv. Eneste spiral-mulighed markeret som relevant her pga. spiral-specifik kontraindikation for hormonspiral, eller vælges ved ønske om hormonfri metode.", tag: "Vurdér", tagClass: "tag-alt" });
    }
    rows.push({ navn: "Implantat (Nexplanon)", indhold: "Etonogestrel 68 mg, subdermal p-stav i overarmen", dosering: "Op til 3 år. Uafhængig af daglig compliance. Indsættes/fjernes af oplært læge." + implantAldersNote, tag: "Alternativ (LARC)", tagClass: "tag-alt" });
    return rows;
  }

  function update() {
    const s = getState();
    let html = "";

    // --- 1. Akut nødprævention — fuldstændig separat, prioriteret gren ---
    if (s.nodPraevention) {
      const bmiHigh = s.bmi !== null && !isNaN(s.bmi) && s.bmi >= 26;
      let timingBox = "";
      if (s.nodTiming === "over120") {
        timingBox = box(
          "box-red",
          "Mere end 120 timer (5 døgn) siden ubeskyttet samleje",
          `<p>Ingen af de godkendte nødprævention-metoder er dokumenteret effektive så sent. Vurdér om kobberspiral kan anlægges hvis det stadig er inden for ca. 5 dage efter skønnet ægløsningstidspunkt (kan i særlige tilfælde være senere end 5 dage efter selve samlejet, afhængigt af cyklus). Ved tvivl: kontakt gynækologisk afdeling. Tilbyd graviditetstest ved udeblevet menstruation, og rådgiv om opstart af fast prævention.</p>`
        );
      } else if (s.nodTiming === "72to120") {
        timingBox = box(
          "box-amber",
          "72–120 timer (3–5 døgn) siden ubeskyttet samleje",
          `<p>Levonorgestrel er <strong>ikke</strong> godkendt/dokumenteret effektivt i dette tidsvindue.</p>
          ${drugTable([
            { navn: "Kobberspiral", indhold: "Hormonfri", dosering: "Mest effektive mulighed (~99%), upåvirket af vægt/BMI. Kræver akut tid til anlæggelse.", tag: "Mest effektiv", tagClass: "tag-recommend" },
            { navn: "ellaOne (ulipristalacetat 30 mg)", indhold: "Selektiv progesteronreceptor-modulator", dosering: "1 tablet snarest muligt, senest 120 timer efter. Håndkøb.", tag: "Anbefalet", tagClass: "tag-recommend" },
          ])}`
        );
      } else {
        timingBox = box(
          "box-green",
          s.nodTiming === "under24" ? "Under 24 timer siden ubeskyttet samleje" : "24–72 timer (3 døgn) siden ubeskyttet samleje",
          `${drugTable([
            { navn: "Kobberspiral", indhold: "Hormonfri", dosering: "Mest effektive mulighed (~99%), upåvirket af vægt/BMI, og giver samtidig fortsat prævention fremover.", tag: "Mest effektiv", tagClass: "tag-recommend" },
            { navn: "ellaOne (ulipristalacetat 30 mg)", indhold: "Selektiv progesteronreceptor-modulator", dosering: "1 tablet snarest muligt, senest 120 timer efter. Mere effektiv end levonorgestrel, særligt ved højere BMI. Håndkøb.", tag: "Anbefalet", tagClass: "tag-recommend" },
            { navn: "NorLevo / Levodonna / Frivelle (levonorgestrel 1,5 mg)", indhold: "Gestagen", dosering: "1 tablet snarest muligt, senest 72 timer efter. Hurtigt tilgængelig, håndkøb.", tag: "Alternativ", tagClass: "tag-alt" },
          ])}`
        );
      }
      html += timingBox;

      if (bmiHigh && s.nodTiming !== "over120") {
        html += box(
          "box-amber",
          "Bemærk: forhøjet BMI/vægt",
          `<p>Ved BMI ≥ 26 (indtastet: ${s.bmi}) er den kontraceptive effekt af både levonorgestrel og — i mindre grad — ulipristalacetat nedsat. Kobberspiral er upåvirket af vægt og bør foretrækkes hvis muligt.</p>`
        );
      }

      html += box(
        "box-blue",
        "Vigtige forbehold ved nødprævention",
        `<ul class="followup-list">
          <li>Ingen af pillerne beskytter mod graviditet ved efterfølgende ubeskyttet samleje i samme cyklus — brug kondom resten af cyklussen.</li>
          <li>Ulipristalacetat: vent mindst 5 dage før opstart/genoptagelse af hormonel prævention (kan gensidigt nedsætte virkningen). Levonorgestrel: hormonel prævention kan startes samme dag.</li>
          <li>Graviditetstest anbefales ved udeblevet eller unormal menstruation efter forventet tidspunkt.</li>
          <li>Brug konsultationen til at tilbyde opstart af fast prævention — fjern fluebenet ved "Akut nødprævention" ovenfor for at se den almindelige anbefaling.</li>
        </ul>`
      );
      output.innerHTML = html + sourceNote();
      return;
    }

    // --- 2. Graviditet — adskilt fra de øvrige kontraindikationer, da
    //        budskabet er et andet (prævention ikke relevant nu) ---------
    if (s.absoluteAlle.includes("grav")) {
      output.innerHTML = box(
        "box-blue",
        "Graviditet markeret",
        `<p>Prævention er ikke relevant nu. Se retningslinjer for svangreomsorg/graviditetsopfølgning. Fjern fluebenet ved "Graviditet / mistanke om graviditet" for at få en præventionsanbefaling.</p>`
      );
      return;
    }

    // --- 3. Kontraindikationer mod al hormonel prævention ----------------
    const alvorligeAbs = s.absoluteAlle.filter((k) => k !== "grav");
    if (alvorligeAbs.length > 0) {
      const list = alvorligeAbs.map((k) => `<li>${ABS_ALLE_LABELS[k]}</li>`).join("");
      const spiralOk = s.spiralKontra.length === 0;
      html += box(
        "box-red",
        "⚠ Al hormonel prævention frarådes som udgangspunkt",
        `<p>Følgende er markeret:</p><ul>${list}</ul>
         <p>Både kombineret og gestagen-only hormonel prævention er som udgangspunkt kontraindiceret ved aktiv/tidligere brystkræft eller uafklaret vaginalblødning (sidstnævnte bør udredes først). Ved brystkræft under aktiv behandling bør præventionsvalg konfereres med onkologisk afdeling.</p>
         ${spiralOk
           ? drugTable([{ navn: "Kobberspiral", indhold: "Hormonfri", dosering: "Anbefalet hormonfri langtidsvirkende mulighed — ~98% effektiv, ingen hormonel kontraindikation.", tag: "Anbefalet", tagClass: "tag-recommend" }])
           : `<p><strong>Bemærk:</strong> spiral-specifik kontraindikation er også markeret (se nedenfor) — konferér med gynækolog om egnet metode, fx kondom/pessar eller sterilisation.</p>`}
        `
      );
      if (s.spiralKontra.length > 0) {
        const slist = s.spiralKontra.map((k) => `<li>${SPIRAL_KONTRA_LABELS[k]}</li>`).join("");
        html += box("box-amber", "Spiral-specifik kontraindikation markeret", `<p>Bemærk at spiral (både hormon- og kobberspiral) heller ikke er velegnet her:</p><ul>${slist}</ul>`);
      }
      html += condomNote();
      output.innerHTML = html + followUpBox() + sourceNote();
      return;
    }

    // --- 4. Almindelig algoritme -----------------------------------------
    const chcReasons = chcUdelukket(s);
    const chcOk = chcReasons.length === 0;
    const spiralOk = s.spiralKontra.length === 0;

    // Vises ikke når patienten allerede har fravalgt kombineret prævention
    // via sin præference (hormonfri/sterilisation) — irrelevant støj der.
    if (chcReasons.length > 0 && s.praeferens !== "hormonfri" && s.praeferens !== "sterilisation") {
      html += box(
        "box-amber",
        "Kombineret hormonel prævention (p-piller/plaster/ring) frarådes",
        `<p>Følgende taler imod kombineret (østrogenholdig) prævention:</p><ul>${chcReasons.map((r) => `<li>${r}</li>`).join("")}</ul>`
      );
    }

    if (s.migraene === "uden_aura") html += migraineCautionBox();

    if (s.praeferens === "sterilisation") {
      html += box(
        "box-green",
        "Ønske om permanent løsning: sterilisation",
        `<p>Sterilisation (tubalisation hos kvinden, eller vasektomi hos partneren) er en permanent løsning og bør kun tilbydes efter grundig rådgivning om irreversibilitet — henvis til gynækologisk afdeling. Tilbyd en effektiv midlertidig metode i ventetiden.</p>
        ${drugTable(larcRows(spiralOk, s.alder))}`
      );
    } else if (s.praeferens === "hormonfri") {
      html += box(
        "box-green",
        "Ønske om hormonfri prævention",
        `${drugTable([
          { navn: "Kobberspiral", indhold: "Hormonfri", dosering: "~98% effektiv, langtidsvirkende (5–10 år afhængig af type). Kan give kraftigere menstruation.", tag: "Anbefalet", tagClass: "tag-recommend" },
          { navn: "Kondom", indhold: "Barrieremetode", dosering: "Beskytter også mod sexsygdomme. Lavere effektivitet ved almindelig brug end LARC.", tag: "Supplement/alternativ", tagClass: "tag-alt" },
          { navn: "Pessar + spermicid", indhold: "Barrieremetode", dosering: "Kræver korrekt anvendelse ved hvert samleje — lavere praktisk effektivitet.", tag: "Alternativ", tagClass: "tag-alt" },
        ])}`
      );
    } else if (s.praeferens === "larc" || (s.praeferens === "ingen" && s.alder < 20)) {
      html += box(
        "box-green",
        s.alder < 20 && s.praeferens === "ingen" ? "Anbefaling: langtidsvirkende prævention (LARC) — foretrukket ved ung alder" : "Ønske om langtidsvirkende prævention (LARC)",
        `<p>${s.alder < 20 && s.praeferens === "ingen" ? "LARC (spiral/implantat) har markant lavere fejlrate end pille pga. uafhængighed af daglig compliance, og fremhæves ofte som førstevalg til unge kvinder. " : ""}Tjek aktuelle tilskudsregler for langtidsvirkende prævention til unge i din region — flere regioner har haft tilskuds-/gratis ordninger, men reglerne og aldersgrænserne ændres løbende og bør verificeres lokalt.</p>
        ${drugTable(larcRows(spiralOk, s.alder))}
        ${chcOk ? `<p>Kombineret hormonel prævention er også en mulighed for denne patient, hvis LARC fravælges — se nedenfor.</p>` : ""}`
      );
    }

    // Pille-anbefaling (vises altid som en del af det samlede billede,
    // medmindre patienten har valgt sterilisation)
    if (s.praeferens !== "sterilisation") {
      if (chcOk && (s.praeferens === "pille" || s.praeferens === "ingen")) {
        html += box(
          "box-green",
          "Anbefaling: kombineret p-pille (2. generation, lavdosis)",
          `<p>Ingen kontraindikationer mod kombineret hormonel prævention er markeret. Førstevalg er en monofasisk 2. generations p-pille med lavest mulige østrogenindhold (20 mikrogram), jf. Sundhedsstyrelsens NRL — dette minimerer risikoen for venøs tromboemboli sammenlignet med 3./4. generations præparater.</p>
          ${drugTable([
            { navn: "Mirabella / Mirabella 28", indhold: "Ethinylestradiol 20 mikrogram + levonorgestrel", dosering: "1 tablet dgl. — 2. generation, lavdosis østrogen", tag: "Førstevalg", tagClass: "tag-recommend" },
            { navn: "Microgyn / Triquilar", indhold: "Ethinylestradiol + levonorgestrel", dosering: "1 tablet dgl. efter pakningens skema", tag: "Alternativ (2. gen.)", tagClass: "tag-alt" },
            { navn: "Cilest", indhold: "Ethinylestradiol + norgestimat", dosering: "1 tablet dgl. — 2. generation", tag: "Alternativ (2. gen.)", tagClass: "tag-alt" },
            { navn: "Evra (plaster) / vaginalring", indhold: "Samme hormontyper, alternativ administrationsvej", dosering: "Plaster skiftes ugentligt / ring månedligt — samme kontraindikationsprofil som p-piller. Overvej ved lav pille-compliance.", tag: "Alternativ administrationsvej", tagClass: "tag-alt" },
          ])}
          <p>3./4. generations præparater (fx drospirenon-holdige som Yasmin/Yasminelle) har højere VTE-risiko og er ikke førstevalg, medmindre der er en specifik indikation (fx akne, PCOS-relaterede symptomer) — vurdér individuelt.</p>`
        );
      } else if (!chcOk) {
        html += box(
          "box-green",
          "Anbefaling: gestagen-only prævention",
          `<p>Da kombineret hormonel prævention er frarådet (se ovenfor), anbefales en østrogenfri metode.</p>
          ${drugTable([
            { navn: "Minipiller (Cerazette / Solia / Zelleta)", indhold: "Desogestrel 75 mikrogram", dosering: "1 tablet dgl., samme tidspunkt — 12-timers vindue. Kan bruges af rygere, over 35 år og ammende uden forbehold.", tag: "Anbefalet (daglig)", tagClass: "tag-recommend" },
          ].concat(larcRows(spiralOk, s.alder)))}`
        );
      }
    }

    if (s.amning) {
      html += box(
        "box-blue",
        "Amning",
        `<p>Minipiller, hormonspiral, kobberspiral og implantat kan alle anvendes under amning uden forbehold. Kombineret hormonel prævention frarådes de første 6 uger postpartum og bør generelt undgås så længe amningen er den primære ernæringskilde, af hensyn til både VTE-risiko postpartum og mulig — om end usikker — effekt på mælkeproduktionen.</p>`
      );
    }

    if (!spiralOk) {
      const slist = s.spiralKontra.map((k) => `<li>${SPIRAL_KONTRA_LABELS[k]}</li>`).join("");
      html += box(
        "box-amber",
        "Spiral-specifik kontraindikation markeret",
        `<p>Følgende taler imod anlæggelse af spiral (både hormon- og kobberspiral) nu:</p><ul>${slist}</ul><p>Udred/behandl først, eller vælg en anden metode.</p>`
      );
    }

    html += condomNote();
    output.innerHTML = html + followUpBox() + sourceNote();
  }

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

  checkAlderRange();
  nodTimingWrap.hidden = !nodCheckbox.checked;
  update();
})();
