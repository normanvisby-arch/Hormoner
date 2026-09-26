/*
 * Beslutningsstøtte for hormonbehandling ved klimakteriet.
 * Klinisk huskeseddel bygget på Sundhedsstyrelsens NRL (2022), DSOG's guideline
 * for menopausal hormonterapi, samt BMS/NICE/ESHRE hvor danske kilder ikke
 * dækker (doser, endometriebeskyttelse ved høj østrogendosis, POI-diagnostik).
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

  const RISIKO_URL = "risiko.html";

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
  // Closed <details> sections would otherwise be left out of the printout.
  window.addEventListener("beforeprint", () => {
    output.querySelectorAll("details").forEach((d) => (d.open = true));
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    // form.reset() does not fire "input", so the age check must be re-run.
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
    alderWarning.textContent = raw !== "" && (isNaN(v) || v < 18 || v > 100) ? "Alder virker usædvanlig — tjek indtastningen." : "";
  }
  alderInput.addEventListener("input", checkAlderRange);

  function checkedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  }

  function getState() {
    // No || 0 fallback: an empty age must stay NaN so it fails every
    // threshold comparison instead of looking like a very young patient.
    const alder = parseInt(alderInput.value, 10);
    const bmiRaw = document.getElementById("bmiInput").value;
    const bmi = bmiRaw === "" ? null : parseFloat(bmiRaw);
    return {
      alder,
      bmi,
      symptomer: checkedValues("symptom"),
      // Subtotal hysterectomy and endometrial ablation can leave endometrium
      // behind, so both are treated as "uterus present" for progestogen purposes.
      uterusType: document.querySelector('input[name="uterus"]:checked').value,
      uterus: document.querySelector('input[name="uterus"]:checked').value !== "nej",
      status: document.querySelector('input[name="status"]:checked').value,
      absolutte: checkedValues("absolut"),
      relative: checkedValues("relativ"),
      andet: checkedValues("andet"),
      praeferens: document.querySelector('input[name="praeferens"]:checked').value,
    };
  }

  const SYMPTOM_LABELS = {
    vasomotor: "hedeture/svedeture",
    sovn: "søvnbesvær",
    humor: "humørsvingninger/lavt stemningsleje",
    led: "led-/muskelsmerter",
    libido: "nedsat libido",
    gsm: "urogenitale symptomer (GSM)",
  };

  const STATUS_LABELS = {
    peri: "perimenopausal",
    post: "postmenopausal",
    poi: "præmatur ovarieinsufficiens (POI)",
  };

  const ABSOLUT_LABELS = {
    cancer: "Tidligere/aktiv brystkræft eller anden østrogenfølsom cancer",
    hyperplasi: "Ubehandlet endometriehyperplasi",
    blodning: "Uafklaret vaginalblødning",
    vte: "Aktiv/nylig venøs tromboemboli uden antikoagulation",
    arteriel: "Aktiv arteriel tromboembolisk sygdom (nylig AMI/apopleksi)",
    lever: "Aktiv leversygdom med påvirket leverfunktion",
    grav: "Graviditet / mistanke om graviditet",
  };

  const ABSOLUT_ACTION = {
    cancer: "Systemisk MHT frarådes. Ved tamoxifenbehandling: undgå paroxetin og fluoxetin (hæmmer CYP2D6 og dermed aktiveringen af tamoxifen) — venlafaxin eller gabapentin foretrækkes. Tamoxifen øger selv risikoen for endometriecancer, så blødning under tamoxifen skal altid udredes. Lokal vaginal østrogen mod urogenitale gener kun efter konference med onkolog, særligt ved aromatasehæmmer. Efter tidligere endometriecancer kan MHT i udvalgte tilfælde overvejes efter konference med gynækologisk onkologi.",
    hyperplasi: "Systemisk MHT frarådes, indtil hyperplasien er behandlet og kontrolleret — henvis til gynækolog. Hyperplasi med atypi er et forstadie til endometriecancer.",
    blodning: "Udred før stillingtagen til MHT. Postmenopausal blødning er et alarmsymptom → henvis til gynækologisk udredning (jf. pakkeforløb for kræft i livmoderen). Perimenopausal kraftig/uregelmæssig blødning udredes efter DSAM's vejledning. MHT kan genovervejes, når årsagen er afklaret.",
    vte: "MHT frarådes under aktiv VTE. Efter afsluttet behandling kan transdermal MHT overvejes efter konference med trombosecenter/gynækolog (markér da i stedet \"Tidligere VTE\" under relative risikofaktorer).",
    arteriel: "Systemisk MHT frarådes. Brug ikke-hormonel behandling.",
    lever: "Systemisk MHT frarådes ved påvirket leverfunktion. Bemærk: fezolinetant må heller ikke startes ved ALAT/ASAT eller bilirubin ≥ 2 × øvre normalgrænse.",
    grav: "Afklar graviditet (u-hCG) — MHT er ikke relevant ved graviditet.",
  };

  const RELATIV_LABELS = {
    ryger: "Rygning",
    migraene: "Migræne med aura",
    trombofili: "Familiær VTE-disposition / kendt trombofili",
    tidlVTE: "Tidligere venøs tromboemboli (ikke aktiv)",
    htn: "Ukontrolleret hypertension",
    galde: "Galdeblæresygdom",
    trigly: "Forhøjede triglycerider",
    alder60: "Opstart > 60 år eller > 10 år siden menopause",
  };

  const RELATIV_ADVICE = {
    ryger: "Transdermal behandling; tilbyd rygestopstøtte.",
    migraene: "Ikke en kontraindikation mod MHT (i modsætning til p-piller) — vælg transdermal behandling i laveste effektive dosis.",
    trombofili: "Kun transdermal behandling; oral MHT og tibolon undgås. Ved kendt trombofili: konferér med trombosecenter/gynækolog.",
    tidlVTE: "Kun transdermal behandling i lav-standard dosis efter konference med trombosecenter/gynækolog; oral MHT og tibolon undgås.",
    htn: "Regulér blodtrykket før opstart; transdermal behandling foretrækkes.",
    galde: "Transdermal behandling (oral østrogen øger risikoen for galdestensproblemer).",
    trigly: "Transdermal behandling (oral østrogen kan øge triglycerider).",
    alder60: "Gevinst/risiko er mindre gunstig ved sen opstart — kun ved betydelige gener, lav startdosis, transdermal behandling og tæt opfølgning.",
  };

  const DOSIS = {
    lav: { navn: "lav", plaster: "Vivelle Dot 25 mikrog./24 t", gel: "Divigel 0,5 mg", tablet: "Estrofem 1 mg" },
    standard: { navn: "standard", plaster: "Vivelle Dot 50 mikrog./24 t", gel: "Divigel 1 mg", tablet: "Estrofem 1–2 mg" },
    hoej: { navn: "høj", plaster: "Vivelle Dot 75–100 mikrog./24 t", gel: "Estrogel 3–4 pumpetryk", tablet: "Estrofem 2–4 mg" },
  };

  const alderKendt = (s) => !isNaN(s.alder);
  const bmiHigh = (s) => s.bmi !== null && !isNaN(s.bmi) && s.bmi >= 30;
  const senOpstart = (s) => s.relative.includes("alder60") || (alderKendt(s) && s.alder >= 60);
  const tidligMenopause = (s) => s.status === "post" && alderKendt(s) && s.alder >= 40 && s.alder < 45;
  const fmtNum = (n) => String(n).replace(".", ",");

  function dosisNiveau(s) {
    if (s.status === "poi") return DOSIS.hoej;
    if (senOpstart(s)) return DOSIS.lav;
    return DOSIS.standard;
  }

  function riskFactorList(s) {
    const list = s.relative.map((k) => RELATIV_LABELS[k]);
    if (bmiHigh(s)) list.push(`BMI ≥ 30 (indtastet: ${fmtNum(s.bmi)})`);
    if (!s.relative.includes("alder60") && alderKendt(s) && s.alder >= 60) list.push(`Alder ${s.alder} år (≥ 60)`);
    return list;
  }

  function box(cls, titleHtml, bodyHtml) {
    return `<div class="box ${cls}"><h3>${titleHtml}</h3>${bodyHtml}</div>`;
  }

  function collapsibleBox(cls, titleHtml, bodyHtml) {
    return `<div class="box ${cls} box-collapsible"><details><summary><h3>${titleHtml}</h3></summary>${bodyHtml}</details></div>`;
  }

  function drugTable(rows, headers) {
    const h = headers || ["Præparat (DK)", "Indhold", "Dosering"];
    let html = `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><td>${r.navn}${r.tag ? `<span class="tag ${r.tagClass || "tag-alt"}">${r.tag}</span>` : ""}</td><td data-label="${h[1]}">${r.indhold}</td><td data-label="${h[2]}">${r.dosering}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  function transdermalText(D) {
    return `${D.plaster} (skiftes 2 × ugentligt) eller ${D.gel} gel dgl.`;
  }

  function progesteronDosis(D, regime) {
    const hoej = D === DOSIS.hoej;
    if (regime === "sekventiel") {
      return hoej
        ? "Utrogestan 300 mg (100 mg morgen + 200 mg til natten) i 12–14 dage pr. cyklus"
        : "Utrogestan 200 mg (2 × 100 mg kapsler) til natten i 12–14 dage pr. cyklus (fx dag 15–26)";
    }
    return hoej ? "Utrogestan 200 mg (2 × 100 mg kapsler) til natten dgl." : "Utrogestan 100 mg til natten dgl.";
  }

  function mirenaRow() {
    return {
      navn: "Mirena + transdermal østrogen",
      indhold: "Levonorgestrel-spiral 52 mg som endometriebeskyttelse; østrogen doseres separat som ovenfor",
      dosering: "Godkendt til endometriebeskyttelse i op til 5 år. Giver samtidig sikker prævention og ofte mindre blødning.",
      tag: "Alternativ",
      tagClass: "tag-alt",
    };
  }

  // ---------------------------------------------------------------------
  // Tekstbokse
  // ---------------------------------------------------------------------

  function nonHormonalBox(s, intro) {
    const leverKI = s.absolutte.includes("lever");
    const rows = [];
    if (!leverKI) {
      rows.push({ navn: "Veoza (fezolinetant)", indhold: "NK3-receptorantagonist — godkendt specifikt mod moderate-svære hedeture", dosering: "45 mg dgl. Levertal før opstart og månedligt de første 3 mdr. (start ikke ved ALAT/ASAT eller bilirubin ≥ 2 × ULN). Tjek udbud og tilskud." });
    }
    rows.push(
      { navn: "Venlafaxin", indhold: "SNRI (off-label)", dosering: "37,5–75 mg depot dgl. Foretrækkes ved samtidig tamoxifen." },
      { navn: "Escitalopram", indhold: "SSRI (off-label)", dosering: "10–20 mg dgl. Undgå paroxetin og fluoxetin ved tamoxifen." },
      { navn: "Gabapentin", indhold: "Antiepileptikum (off-label)", dosering: "300 mg til natten, øges til op til 900 mg dgl. fordelt — særligt ved natlige hedeture. Sedation/svimmelhed." },
      { navn: "Clonidin", indhold: "Alfa-2-agonist", dosering: "25–75 mikrog. × 2 dgl. — beskeden effekt; hypotension, mundtørhed." }
    );
    return box(
      "box-blue",
      "Ikke-hormonel behandling af hedeture",
      `${intro ? `<p>${intro}</p>` : ""}
      ${drugTable(rows)}
      <p><strong>Kognitiv adfærdsterapi (KAT)</strong> rettet mod overgangsalderen har dokumenteret effekt på generne af hedeture, søvn og stemningsleje (NICE 2024) og kan bruges alene eller sammen med medicin. Derudover: vægttab ved overvægt, rygestop, lag-på-lag-påklædning og undgåelse af udløsende faktorer (alkohol, varme drikke, stærk mad).</p>`
    );
  }

  function routeBox(s) {
    const risks = riskFactorList(s);
    const vteRisk = s.relative.includes("tidlVTE") || s.relative.includes("trombofili");
    let tabletNote = "";
    if (s.praeferens === "tablet") {
      tabletNote = risks.length > 0
        ? ` Patienten foretrækker tabletter, men med de markerede risikofaktorer bør transdermal behandling drøftes grundigt${vteRisk ? " — ved tidligere VTE/trombofili bør oral MHT undgås" : ""}.`
        : " Patienten foretrækker tabletter — oral behandling er en rimelig mulighed hos en kvinde uden risikofaktorer, men transdermal er fortsat førstevalg.";
    }
    if (risks.length > 0) {
      return box(
        "box-amber",
        "Valg af administrationsvej",
        `<p><strong>Transdermal behandling (plaster/gel/spray) anbefales</strong> — som generelt førstevalg og særligt pga.: ${risks.join(", ")}. Transdermal østrogen undgår first-pass-metabolisme i leveren og øger i standarddosis ikke risikoen for VTE eller apopleksi.${tabletNote}</p>`
      );
    }
    return box(
      "box-blue",
      "Valg af administrationsvej",
      `<p><strong>Transdermal behandling (plaster/gel/spray) er generelt førstevalg</strong> for systemisk østrogen, jf. Sundhedsstyrelsens NRL, pga. lavere risiko for VTE end ved oral behandling.${tabletNote}</p>`
    );
  }

  function relBox(s) {
    const items = s.relative.map((k) => `<li><strong>${RELATIV_LABELS[k]}:</strong> ${RELATIV_ADVICE[k]}</li>`);
    if (bmiHigh(s)) items.push(`<li><strong>BMI ≥ 30 (indtastet: ${fmtNum(s.bmi)}):</strong> transdermal behandling (overvægt øger i sig selv VTE-risikoen).</li>`);
    if (!s.relative.includes("alder60") && alderKendt(s) && s.alder >= 60) {
      items.push(`<li><strong>Alder ${s.alder} år:</strong> ${RELATIV_ADVICE.alder60}</li>`);
    }
    if (items.length === 0) return "";
    return box("box-amber", "Forsigtighedshensyn", `<ul>${items.join("")}</ul>`);
  }

  function progestogenBox(D) {
    return box(
      "box-blue",
      "Endometriebeskyttelse (patienter med uterus)",
      `<ul>
        <li><strong>Gestagen skal gives i fuld dosis og varighed:</strong> ved sekventiel behandling mindst 12 dage pr. cyklus — kortere perioder giver utilstrækkelig beskyttelse.</li>
        <li><strong>Kontinuerlig kombineret behandling beskytter bedst:</strong> i en dansk kohorte var risikoen for endometriecancer ikke øget ved kontinuerlig kombineret behandling, men ca. fordoblet ved sekventiel. Skift til kontinuerlig, når patienten er postmenopausal (se opfølgning).</li>
        <li><strong>Utrogestan</strong> (mikroniseret progesteron, kun 100 mg kapsler i DK) tages til natten pga. træthed/svimmelhed. Den har formentlig en gunstigere bryst- og VTE-profil end syntetiske gestagener, men endometriebeskyttelsen er kun dokumenteret i ca. 5 år, og i en fransk kohorte (E3N) var brug i over 5 år forbundet med øget risiko for endometriecancer (også dydrogesteron, i mindre grad). Ved langvarig brug: overvej Mirena, og hav lav tærskel for udredning af blødning.</li>
        <li><strong>Mirena</strong> er den hormonspiral, der er godkendt til endometriebeskyttelse (op til 5 år). Kyleena og Jaydess har lavere dosis og er ikke godkendt hertil.</li>
        <li><strong>Høj østrogendosis</strong> (fx plaster 75–100 mikrog., Estrogel ≥ 3 tryk${D === DOSIS.hoej ? " — som anbefalet her" : ""}): øg progesteron til 300 mg cyklisk eller 200 mg kontinuerligt (BMS).</li>
        <li>Minipiller (desogestrel) kan give prævention sammen med MHT, men erstatter <em>ikke</em> gestagen-delen.</li>
      </ul>`
    );
  }

  function libidoBox() {
    return box(
      "box-blue",
      "Om nedsat libido",
      `<p>Systemisk østrogen bedrer ofte kun delvist nedsat lyst, og lokal behandling af urogenitale gener kan i sig selv hjælpe. Hvis libido forbliver generende efter optimeret MHT, kan <strong>testosteron</strong> overvejes — off-label til kvinder i Danmark, kræver informeret samtykke og bør varetages af eller konfereres med gynækolog med erfaring på området.</p>`
    );
  }

  function contraceptionBox(s) {
    // A subtotal hysterectomy removes the uterine body, so pregnancy is not possible.
    if (s.uterusType !== "ja" && s.uterusType !== "ablation") return "";
    const relevant = s.status === "peri" || s.status === "poi" || (s.status === "post" && alderKendt(s) && s.alder < 50);
    if (!relevant) return "";
    const poiNote = s.status === "poi" ? " Ved POI kan ægløsning forekomme uforudsigeligt, og en mindre andel bliver spontant gravide." : "";
    return box(
      "box-amber",
      "MHT er ikke prævention",
      `<p>Prævention anbefales indtil 2 år efter sidste menstruation hos kvinder under 50 år og 1 år hos kvinder over 50 år; alle kan stoppe ved 55 år.${poiNote} Mirena dækker både prævention og endometriebeskyttelse. Minipiller kan kombineres med MHT, men den separate gestagen-del skal fortsætte.</p>`
    );
  }

  function andetBoxes(s, poiEllerTidlig) {
    let html = "";
    if (s.andet.includes("brca")) {
      html += box(
        "box-blue",
        "Brystkræft i familien / BRCA",
        `<p>Familiær disposition er ikke en kontraindikation; MHT øger risikoen i nogenlunde samme relative grad som hos andre, men den absolutte risiko er højere, og det indgår i den fælles beslutning. Vurdér behov for genetisk rådgivning efter gældende kriterier. BRCA-bærere uden brystkræft, som har fået fjernet æggestokkene forebyggende, anbefales typisk MHT til ca. 51 år (østrogen alene, hvis de er hysterektomerede).</p>`
      );
    }
    if (s.andet.includes("osteo")) {
      html += box(
        "box-blue",
        "Knogler",
        `<p>MHT forebygger knogletab og reducerer frakturrisikoen og kan være førstevalg til forebyggelse hos kvinder under 60 år med klimakterielle gener${poiEllerTidlig ? " — og er særligt vigtig ved POI/tidlig menopause" : ""}. Effekten aftager efter ophør, så knoglestatus og evt. anden osteoporosebehandling bør vurderes ved seponering.</p>`
      );
    }
    return html;
  }

  function endometrieBox(s) {
    const items = [];
    if (s.uterusType === "ablation") {
      items.push("<strong>Endometrieablation:</strong> der kan sidde rester af endometrium, og blødning — det vigtigste advarselstegn — kan udeblive. Giv altid kombineret behandling (østrogen + gestagen), aldrig østrogen alene.");
    }
    if (s.uterusType === "delvis") {
      items.push("<strong>Subtotal hysterektomi:</strong> der kan være endometrium i livmoderhalsstumpen. Giv sekventiel gestagen i 3 måneder som test: ingen blødning → østrogen alene kan herefter anvendes; blødning → fortsæt kombineret behandling (BMS).");
    }
    if (s.uterus && (s.andet.includes("endorisiko") || bmiHigh(s))) {
      const hvorfor = [];
      if (bmiHigh(s)) hvorfor.push(`BMI ≥ 30 (indtastet: ${fmtNum(s.bmi)})`);
      if (s.andet.includes("endorisiko")) hvorfor.push("markeret risikofaktor");
      items.push(`<strong>Øget risiko for endometriecancer</strong> (${hvorfor.join(", ")}): sikr fuld gestagendosis og -varighed, foretræk kontinuerlig kombineret behandling eller Mirena, og hav lav tærskel for udredning af blødning. Ved Lynch syndrom: konferér med gynækolog om risikoreducerende kirurgi.`);
    }
    if (items.length === 0) return "";
    const warn = s.uterusType === "ablation" || s.uterusType === "delvis";
    return box(warn ? "box-amber" : "box-blue", "Endometriet", `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  }

  function endometrioseNote(s) {
    if (s.uterusType !== "nej" || !s.andet.includes("endometriose")) return "";
    return `<p><strong>Tidligere endometriose:</strong> østrogen alene kan reaktivere rester af endometriose. Overvej kontinuerlig kombineret behandling (østrogen + gestagen, fx Utrogestan 100 mg dgl.) eller tibolon frem for østrogen alene — især de første år efter hysterektomi.</p>`;
  }

  function forOpstartBox(s) {
    let diagnose;
    if (!alderKendt(s)) {
      diagnose = "Over 45 år med typiske symptomer stilles diagnosen klinisk. Under 45 år: mål FSH og udeluk andre årsager (graviditet, thyreoidea, prolaktin).";
    } else if (s.alder >= 45) {
      diagnose = "Over 45 år med typiske symptomer stilles diagnosen klinisk — FSH er ikke nødvendig og er upålidelig i perimenopausen (og ved brug af hormonel prævention).";
    } else {
      diagnose = "Under 45 år: mål FSH og udeluk andre årsager til cyklusforstyrrelse (graviditet, thyreoidea, prolaktin).";
    }
    return box(
      "box-blue",
      "Før opstart",
      `<ul class="followup-list">
        <li>${diagnose}</li>
        <li>Mål blodtryk og BMI; afdæk tidligere VTE, cancer (egen og i familien), blødningsmønster og rygning.</li>
        <li>Ingen rutinemæssige blodprøver, gynækologisk undersøgelse eller ekstra mammografi er nødvendige før opstart — det almindelige screeningsprogram følges.</li>
      </ul>`
    );
  }

  function doseBox(D) {
    const rows = [
      { niveau: DOSIS.lav, cells: ["Lav", "25 mikrog.", "Divigel 0,5 mg / Estrogel 1 tryk", "Lenzetto 1 pust", "Estrofem 1 mg"] },
      { niveau: DOSIS.standard, cells: ["Standard", "50 mikrog.", "Divigel 1 mg / Estrogel 2 tryk", "Lenzetto 2–3 pust", "Estrofem 1–2 mg"] },
      { niveau: DOSIS.hoej, cells: ["Høj", "75–100 mikrog.", "Divigel 1,5 mg / Estrogel 3–4 tryk", "Lenzetto 3 pust (maks.)", "Estrofem 2–4 mg"] },
    ];
    const headers = ["Niveau", "Vivelle Dot", "Gel", "Spray", "Tablet"];
    const body = rows
      .map((r) => `<tr${r.niveau === D ? ' class="row-highlight"' : ""}>${r.cells.map((c, i) => `<td${i > 0 ? ` data-label="${headers[i]}"` : ""}>${c}</td>`).join("")}</tr>`)
      .join("");
    return collapsibleBox(
      "box-blue",
      "Doser og omtrentlige ækvivalenser",
      `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${headers.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>
      <p>Markeret række = dosisniveau brugt i anbefalingen ovenfor (${D.navn}). Estrogel: 1 pumpetryk = 0,75 mg estradiol. Ækvivalenserne er vejledende (BMS) — optagelsen varierer betydeligt mellem personer, så dosis titreres efter effekt. Start lavt ved opstart efter 60 år; øg evt. efter 1–3 måneder ved utilstrækkelig effekt.</p>`
    );
  }

  function riskBox(s) {
    const regime = !s.uterus ? "alene" : s.status === "peri" ? "sekventiel" : "kontinuerlig";
    const b = (key, text) => (key === regime ? `<strong>${text} ← aktuelt regime</strong>` : text);
    return collapsibleBox(
      "box-blue",
      "Risikoinformation til samtalen",
      `<p><strong>Brystkræft</strong> — ekstra tilfælde pr. 1.000 kvinder frem til 69 år ved start omkring 50 år og 5 års brug (MHRA 2019; baggrundsrisiko ca. 63 pr. 1.000):</p>
      <ul>
        <li>${b("alene", "Østrogen alene: ca. 5 ekstra")}</li>
        <li>${b("sekventiel", "Østrogen + gestagen dele af måneden (sekventiel): ca. 14 ekstra")}</li>
        <li>${b("kontinuerlig", "Østrogen + daglig gestagen (kontinuerlig): ca. 20 ekstra")}</li>
      </ul>
      <p>Ved 10 års brug omtrent fordoblet. Risikoen falder efter ophør, men en mindre overrisiko kan vare over 10 år. Overvægt og alkohol øger risikoen i sammenlignelig eller højere grad.</p>
      <ul>
        <li><strong>Blodpropper (VTE):</strong> oral østrogen øger risikoen (ca. 2 gange); transdermal i standarddosis ses ikke at øge den.</li>
        <li><strong>Apopleksi:</strong> lille overrisiko ved oral behandling; ikke påvist ved transdermal i standarddosis.</li>
        <li><strong>Hjertesygdom:</strong> ingen overrisiko ved opstart før 60 år / inden for 10 år efter menopausen.</li>
        <li><strong>Knogler:</strong> færre frakturer under behandling.</li>
        <li><strong>Lokal vaginal østrogen:</strong> ingen påvist øget risiko for brystkræft eller VTE. Metaanalyser viser ikke øget risiko for endometriecancer; en dansk registerundersøgelse fandt en let øget forekomst, som formentlig skyldes øget udredning — blødning skal altid udredes.</li>
      </ul>
      <p><strong>Endometriecancer</strong> (kun ved bevaret uterus) — relativ risiko i forhold til ingen MHT, dansk kohorte af 915.000 kvinder (Mørch 2016):</p>
      <ul>
        <li>${b("kontinuerlig", "Kontinuerlig kombineret: ingen øget risiko (RR 1,0)")}</li>
        <li>${b("sekventiel", "Sekventiel (cyklisk) kombineret: ca. fordoblet (RR 2,1)")}</li>
        <li>Østrogen alene med bevaret uterus: 2–4 gange øget — gives aldrig</li>
        <li>Tibolon: ca. 3,6 gange øget</li>
      </ul>
      <p>Tal tilpasset patientens alder, regime, administrationsvej og risikofaktorer: se <a href="${RISIKO_URL}" target="_blank" rel="noopener">den individuelle risikovurdering</a>.</p>`
    );
  }

  function followUpBox(s) {
    const bleeding = s.uterus
      ? `<li><strong>Blødning:</strong> på kontinuerlig kombineret behandling er uregelmæssig blødning almindelig de første 3–6 måneder. Udred (transvaginal UL / henvisning til gynækolog), hvis blødningen fortsætter efter 6 måneder, opstår efter en blødningsfri periode, eller — på sekventiel behandling — hvis bortfaldsblødningen ændrer karakter (kraftig, forlænget, mellemblødninger). Blødning efter ophør af MHT udredes som postmenopausal blødning. Lav tærskel ved risikofaktorer for endometriecancer.</li>
        <li><strong>Skift fra sekventiel til kontinuerlig:</strong> når patienten har fået sekventiel behandling i mindst 1 år og er postmenopausal (fx ≥ 54 år eller ≥ 1 år siden sidste spontane menstruation) — og helst inden 5 års sekventiel behandling, da langvarig sekventiel behandling øger risikoen for endometriecancer.</li>`
      : "";
    return box(
      "box-blue",
      "Opstart og opfølgning",
      `<ul class="followup-list">
        <li>Forventet effekt efter 2–4 uger, fuld effekt efter ca. 3 måneder. Initiale bivirkninger (brystspænding, kvalme, blødning) aftager ofte.</li>
        <li>Kontrol efter ca. 3 måneder: effekt, bivirkninger, blødningsmønster, blodtryk — evt. dosisjustering. Herefter årligt.</li>
        ${bleeding}
        <li>Årlig revurdering af indikation og risikoprofil. Ingen fast øvre grænse for behandlingsvarighed — afvejes individuelt.</li>
        <li>Seponering kan ske gradvist eller brat; symptomerne kan vende tilbage uanset metode.</li>
      </ul>`
    );
  }

  function sourceNote() {
    return `<p class="source-note">Præparatnavne er danske handelsnavne pr. seneste opdatering og skal verificeres på
      <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a> (udbud, styrker og tilskud ændres løbende).</p>`;
  }

  // ---------------------------------------------------------------------
  // Beslutningslogik
  // ---------------------------------------------------------------------

  function update() {
    const s = getState();
    let html = "";

    // 1. Absolutte kontraindikationer — højeste prioritet.
    if (s.absolutte.length > 0) {
      const list = s.absolutte.map((k) => `<li><strong>${ABSOLUT_LABELS[k]}:</strong> ${ABSOLUT_ACTION[k]}</li>`).join("");
      html += box("box-red", "⚠ Systemisk hormonbehandling frarådes", `<ul>${list}</ul>`);
      const kunGraviditet = s.absolutte.length === 1 && s.absolutte[0] === "grav";
      if (!kunGraviditet && s.symptomer.includes("vasomotor")) html += nonHormonalBox(s);
      if (!kunGraviditet && s.symptomer.includes("gsm") && !s.absolutte.includes("cancer")) {
        html += box(
          "box-blue",
          "Urogenitale symptomer",
          `<p>Lavdosis lokal vaginal østrogen (fx Vagifem/Vagirux 10 mikrog.) har minimal systemisk optagelse og kan ofte anvendes, selv når systemisk MHT frarådes — vurdér i forhold til den konkrete kontraindikation.</p>`
        );
      }
      html += `<p class="source-note">Overvej henvisning til gynækolog ved diagnostisk usikkerhed eller komplekse kontraindikationer.</p>`;
      output.innerHTML = html + sourceNote();
      return;
    }

    const poi = s.status === "poi";
    const tidlig = tidligMenopause(s);

    // 2. Patienten ønsker ikke hormonbehandling.
    if (s.praeferens === "nonhormonal") {
      if (poi || tidlig) {
        html += box(
          "box-amber",
          poi ? "Bemærk: POI" : "Bemærk: tidlig menopause",
          `<p>Ved ${poi ? "præmatur ovarieinsufficiens" : "menopause før 45 år"} anbefales MHT til ca. 51 år for at beskytte knogler og hjerte-kar — uanset symptomer. Drøft fravalget grundigt; risikotal for kvinder over 50 gælder ikke her, da behandlingen blot erstatter de manglende hormoner.</p>`
        );
      }
      html += nonHormonalBox(s, "Patienten ønsker ikke hormonbehandling.");
      if (s.symptomer.includes("gsm")) {
        html += box(
          "box-green",
          "Urogenitale symptomer",
          `<p>Lokal vaginal østrogen (fx Vagifem/Vagirux 10 mikrog.) virker lokalt med minimal systemisk optagelse og kan være acceptabel for mange, der fravælger systemisk behandling. Alternativt fugtgivende midler og glidecreme.</p>`
        );
      }
      output.innerHTML = html + sourceNote();
      return;
    }

    // 3. Præmatur ovarieinsufficiens — tilstandsbetinget indikation,
    //    tjekkes før symptomgrenene.
    if (poi) {
      const D = DOSIS.hoej;
      const aldersNote = alderKendt(s) && s.alder >= 40
        ? `<p><strong>Bemærk:</strong> indtastet alder er ≥ 40 år. POI defineres som ovariesvigt før 40 år — bekræft diagnosen og tidspunktet for ovariesvigt.</p>`
        : "";
      const gsmNote = s.symptomer.includes("gsm")
        ? `<p>Ved vedvarende urogenitale gener trods systemisk behandling kan lokal vaginal østrogen gives som supplement.</p>`
        : "";
      const rows = s.uterus
        ? [
            { navn: `${D.plaster} + Utrogestan`, indhold: "Transdermal estradiol + mikroniseret progesteron", dosering: `Plaster skiftes 2 × ugentligt. ${progesteronDosis(D, "sekventiel")} — eller ${progesteronDosis(D, "kontinuerlig")} hvis blødningsfrihed ønskes.`, tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
            mirenaRow(),
            { navn: D.tablet, indhold: "Estradiol, tablet (oral)", dosering: "1 tablet dgl. — kombinér med progesteron som ovenfor." },
            { navn: "Kombineret p-pille", indhold: "Ethinylestradiol + gestagen", dosering: "Kan være et alternativ, fx hvis prævention ønskes — tages gerne uden pause. MHT giver formentlig bedre knoglebeskyttelse." },
          ]
        : [
            { navn: D.plaster, indhold: "Transdermal estradiol (østrogen alene)", dosering: "Skiftes 2 × ugentligt — eller Estrogel 3–4 pumpetryk dgl.", tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
            { navn: D.tablet, indhold: "Estradiol, tablet (oral)", dosering: "1 tablet dgl." },
          ];
      html += box(
        "box-green",
        "Præmatur ovarieinsufficiens (POI) — systemisk hormonbehandling anbefales",
        `${aldersNote}
        <p>MHT anbefales til ca. 51 år <strong>uanset symptomer</strong> for at beskytte knogler, hjerte-kar og kognition. Der bruges typisk højere doser end ved almindelig substitution. Behandlingen erstatter manglende hormoner — risikotal for kvinder over 50 gælder ikke, og brystkræftrisikoen øges ikke ud over jævnaldrendes.</p>
        ${gsmNote}
        ${drugTable(rows)}
        ${endometrioseNote(s)}
        <p><strong>Diagnose (ESHRE 2024):</strong> oligo-/amenoré i ≥ 4 måneder før 40 år + FSH &gt; 25 IU/L (én måling er tilstrækkelig; gentag efter 4–6 uger ved tvivl). Henvis til gynækolog/endokrinolog mhp. årsagsudredning (bl.a. karyotype, FMR1-præmutation, binyrebarkantistoffer), fertilitetsrådgivning og DXA-skanning.</p>`
      );
      html += endometrieBox(s);
      html += relBox(s);
      if (s.uterus) html += progestogenBox(D);
      if (s.symptomer.includes("libido")) html += libidoBox();
      html += contraceptionBox(s);
      html += andetBoxes(s, true);
      html += doseBox(D);
      output.innerHTML = html + followUpBox(s) + sourceNote();
      return;
    }

    // 4. Isolerede urogenitale symptomer — lokal behandling. Gælder ikke
    //    ved tidlig menopause, hvor systemisk MHT anbefales uanset symptomer.
    const kunGSM = s.symptomer.includes("gsm") && s.symptomer.length === 1;
    if (kunGSM && !tidlig) {
      html += box(
        "box-green",
        "Anbefaling: lokal vaginal østrogen",
        `<p>Ved isolerede urogenitale symptomer (genitourinært syndrom ved menopausen, GSM) anbefales lavdosis <strong>lokal</strong> vaginal østrogen — uanset uterusstatus. Den systemiske optagelse er minimal, og gestagen er ikke nødvendig.</p>
        ${drugTable([
          { navn: "Vagifem / Vagirux", indhold: "Estradiol 10 mikrog. vaginaltabletter", dosering: "1 dgl. i 2 uger, herefter 2 × ugentligt", tag: "Førstevalg", tagClass: "tag-recommend" },
          { navn: "Ovestin", indhold: "Østriol vaginalcreme/vagitorier", dosering: "Dgl. i 2–3 uger, herefter 2 × ugentligt" },
          { navn: "Estring", indhold: "Estradiol vaginalring (7,5 mikrog./24 t)", dosering: "1 ring, skiftes hver 3. måned — praktisk ved nedsat håndfunktion" },
        ])}
        <p>Kan gives langvarigt og seponeres ikke rutinemæssigt; effekten ses efter nogle uger. Kombinér gerne med fugtgivende midler/glidecreme. Blødning under lokal østrogen skal udredes. Ved samtidige hedeture: markér dem for at se systemisk behandling.</p>`
      );
      output.innerHTML = html + sourceNote();
      return;
    }

    // 5. Ingen symptomer (og ikke tidlig menopause).
    if (s.symptomer.length === 0 && !tidlig) {
      output.innerHTML = box(
        "box-amber",
        "Ingen symptomer markeret",
        `<p>Markér mindst ét symptom for at få en anbefaling. Uden generende symptomer er der som udgangspunkt ikke indikation for MHT — undtagen ved POI eller menopause før 45 år (angiv status og alder), hvor MHT anbefales uanset symptomer.</p>`
      );
      return;
    }

    // 6. Systemisk MHT.
    const D = dosisNiveau(s);

    if (tidlig) {
      html += box(
        "box-amber",
        "Tidlig menopause (40–44 år)",
        `<p>MHT anbefales som udgangspunkt til ca. 51 år — <strong>uanset symptomer</strong> — for at beskytte knogler og hjerte-kar (BMS m.fl.). Behandlingen erstatter manglende hormoner, så risikotal for kvinder over 50 gælder ikke før ca. 51 år.</p>`
      );
    }

    if (!s.symptomer.includes("vasomotor") && !tidlig) {
      html += box(
        "box-amber",
        "Hedeture/svedeture er ikke markeret",
        `<p>Hovedindikationen for systemisk MHT er generende vasomotoriske symptomer. Ved isolerede søvn-, humør-, led- eller libidogener er evidensen svagere — overvej andre årsager (depression, thyreoidea, anæmi, søvnapnø, medicin) og aftal evt. et tidsafgrænset behandlingsforsøg (ca. 3 måneder) med opfølgning. KAT er et alternativ ved søvn- og stemningsgener.</p>`
      );
    }

    const startNote = D === DOSIS.lav
      ? "<p>Lav startdosis anbefales pga. alder/sen opstart.</p>"
      : "<p>Start med standarddosis; justér efter 1–3 måneder.</p>";

    if (!s.uterus) {
      html += box(
        "box-green",
        "Anbefaling: østrogen alene (hysterektomeret)",
        `<p>Uden uterus er gestagen ikke nødvendig til endometriebeskyttelse.</p>
        ${startNote}
        ${drugTable([
          { navn: `${D.plaster} eller ${D.gel}`, indhold: "Transdermal estradiol (plaster eller gel)", dosering: "Plaster skiftes 2 × ugentligt; gel påsmøres dgl.", tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
          { navn: "Estrogel / Lenzetto", indhold: "Estradiol gel med pumpe / hudspray", dosering: "Estrogel 1–2 pumpetryk dgl.; Lenzetto 1–3 pust dgl. på underarmen", tag: "Alternativ (transdermal)", tagClass: "tag-alt" },
          { navn: D.tablet, indhold: "Estradiol, tablet (oral)", dosering: "1 tablet dgl. — ved udtalt præference for tabletter", tag: "Alternativ (oral)", tagClass: "tag-alt" },
        ])}
        ${endometrioseNote(s)}`
      );
    } else if (s.status === "peri") {
      html += box(
        "box-green",
        "Anbefaling: sekventiel (cyklisk) kombinationsbehandling",
        `<p>Ved fortsat eller uregelmæssig menstruation gives sekventiel behandling med månedlig bortfaldsblødning. Kontinuerlig kombination undgås før ca. 12 måneders amenoré pga. uregelmæssig blødning. <strong>Planlæg skift til kontinuerlig kombineret behandling</strong>, når patienten er postmenopausal — langvarig sekventiel behandling øger risikoen for endometriecancer (se opfølgning).</p>
        ${startNote}
        ${drugTable([
          { navn: "Transdermal estradiol + Utrogestan", indhold: "Østrogen dgl. + mikroniseret progesteron (sekventiel)", dosering: `${transdermalText(D)} + ${progesteronDosis(D, "sekventiel")}`, tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
          mirenaRow(),
          { navn: "Novofem", indhold: "Estradiol 1 mg + noretisteronacetat (sekventiel)", dosering: "1 tablet dgl. — fast kombinationspakning", tag: "Alternativ (oral)", tagClass: "tag-alt" },
          { navn: "Trisekvens", indhold: "Estradiol 2/1 mg + noretisteronacetat (trefaset)", dosering: "1 tablet dgl. efter pakningens skema", tag: "Alternativ (oral)", tagClass: "tag-alt" },
          { navn: "Femoston 1/10 eller 2/10 (bekræft udbud i DK)", indhold: "Estradiol + dydrogesteron (sekventiel)", dosering: "1 tablet dgl.", tag: "Alternativ (oral)", tagClass: "tag-alt" },
        ])}`
      );
    } else {
      html += box(
        "box-green",
        "Anbefaling: kontinuerlig kombinationsbehandling (postmenopausal)",
        `<p>Ved &gt; 12 måneders amenoré gives kontinuerlig kombinationsbehandling uden planlagt blødning. Uregelmæssig pletblødning er almindelig de første 3–6 måneder.</p>
        ${startNote}
        ${drugTable([
          { navn: "Transdermal estradiol + Utrogestan", indhold: "Østrogen dgl. + mikroniseret progesteron (kontinuerlig)", dosering: `${transdermalText(D)} + ${progesteronDosis(D, "kontinuerlig")}`, tag: "Anbefalet (transdermal)", tagClass: "tag-recommend" },
          mirenaRow(),
          { navn: "Activelle", indhold: "Estradiol 1 mg + noretisteronacetat 0,5 mg", dosering: "1 tablet dgl.", tag: "Alternativ (oral, fast kombi)", tagClass: "tag-alt" },
          { navn: "Kliogest", indhold: "Estradiol 2 mg + noretisteronacetat 1 mg", dosering: "1 tablet dgl. — højere østrogendosis", tag: "Alternativ (oral)", tagClass: "tag-alt" },
          { navn: "Femoston conti (bekræft udbud i DK)", indhold: "Estradiol + dydrogesteron", dosering: "1 tablet dgl.", tag: "Alternativ (oral)", tagClass: "tag-alt" },
          { navn: "Livial (tibolon)", indhold: "Tibolon 2,5 mg", dosering: "1 tablet dgl. — kun ≥ 12 mdr. efter sidste menstruation, ikke sammen med anden MHT. Øget risiko for endometriecancer i observationelle studier (dansk kohorte: ca. 3,6 gange) — blødning skal altid udredes. Øget apopleksirisiko, særligt hos ældre; undgås ved tidligere brystkræft.", tag: "Alternativ (sidste valg)", tagClass: "tag-alt" },
        ])}`
      );
    }

    html += endometrieBox(s);
    html += routeBox(s);
    html += relBox(s);
    if (s.uterus) html += progestogenBox(D);
    if (s.symptomer.includes("gsm")) {
      html += box(
        "box-blue",
        "Urogenitale symptomer",
        `<p>Systemisk MHT afhjælper ofte urogenitale gener, men nogle har behov for supplerende lokal vaginal østrogen (fx Vagifem/Vagirux) — det kan gives samtidig.</p>`
      );
    }
    if (s.symptomer.includes("libido")) html += libidoBox();
    html += contraceptionBox(s);
    html += andetBoxes(s, tidlig);
    html += forOpstartBox(s);
    html += doseBox(D);
    if (!tidlig) html += riskBox(s);
    output.innerHTML = html + followUpBox(s) + sourceNote();
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
    return `${navn} — ${cells[2].textContent.trim()}`;
  }

  // Kort, redigerbart journalnotat bygget af input + den viste anbefaling.
  function buildJournalNote() {
    const s = getState();
    const lines = [`Klimakterielle gener — vurdering ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (alderKendt(s)) basis.push(`${s.alder} år`);
    if (s.bmi !== null && !isNaN(s.bmi)) basis.push(`BMI ${fmtNum(s.bmi)}`);
    basis.push({ ja: "uterus bevaret", ablation: "uterus bevaret (endometrieablation)", delvis: "subtotal hysterektomi", nej: "hysterektomeret" }[s.uterusType]);
    basis.push(STATUS_LABELS[s.status]);
    lines.push(basis.join(", ") + ".");
    lines.push(`Symptomer: ${s.symptomer.length ? s.symptomer.map((k) => SYMPTOM_LABELS[k]).join(", ") : "ingen markeret"}.`);
    lines.push(`Kontraindikationer: ${s.absolutte.length ? s.absolutte.map((k) => ABSOLUT_LABELS[k].toLowerCase()).join("; ") : "ingen markeret"}.`);
    const risks = riskFactorList(s);
    lines.push(`Risikofaktorer: ${risks.length ? risks.join("; ") : "ingen markeret"}.`);
    const heading = output.querySelector(".box-red h3, .box-green h3");
    if (heading) lines.push(`Vurdering: ${heading.textContent.replace("⚠", "").replace(/^Anbefaling:\s*/, "").trim()}.`);
    const rec = recommendedRowText();
    if (rec) lines.push(`Førstevalg: ${rec}`);
    if (s.absolutte.length === 0 && s.praeferens !== "nonhormonal") {
      lines.push("Plan (tilpas): information om effekt, bivirkninger og risici. Kontrol ca. 3 mdr. efter opstart (effekt, bivirkninger, blødningsmønster, BT), herefter årligt.");
    }
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
            el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim()));
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

  update();
})();
