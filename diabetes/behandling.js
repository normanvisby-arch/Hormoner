/*
 * Type 2-diabetes: individuelt HbA1c-mål og næste glukosesænkende skridt
 * efter DSAM/DES' fælles vejledning og Medicinrådets behandlingsvejledning
 * (SGLT-2-hæmmer før GLP-1-receptoragonist; sulfonylurinstof nedprioriteret),
 * med dosis efter eGFR fra produktresuméerne.
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
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const has = (list, k) => list.includes(k);
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const collapsible = (cls, title, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${title}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  function getState() {
    return {
      alder: num("alder"),
      varighed: num("varighed"),
      hba1c: num("hba1c"),
      egfr: num("egfr"),
      uacr: num("uacr"),
      bmi: num("bmi"),
      organ: checked("organ"),
      forhold: checked("forhold"),
      beh: checked("beh"),
      kan: checked("kan"),
    };
  }

  // ---------------------------------------------------------------------
  // Mål og indikationer
  // ---------------------------------------------------------------------

  // DSAM: < 48 de første år ved lavt udgangsniveau; < 53 for de fleste; < 58 ved
  // hypoglykæmitendens, makrovaskulær sygdom eller lang varighed; skrøbelige
  // < 64–69 (undgå < 53); raske ældre 53–58.
  function hba1cMaal(s) {
    if (has(s.forhold, "skroebelig")) return { maal: 64, tekst: "< 64–69 mmol/mol", grund: "skrøbelig, demens eller kort restlevetid — undgå HbA1c under 53 og hypoglykæmi" };
    if (has(s.forhold, "hypo") || has(s.organ, "ascvd") || s.varighed >= 10) return { maal: 58, tekst: "< 58 mmol/mol", grund: [has(s.forhold, "hypo") && "hypoglykæmitendens", has(s.organ, "ascvd") && "hjerte-kar-sygdom", s.varighed >= 10 && "lang diabetesvarighed"].filter(Boolean).join(", ") };
    if (s.alder >= 75) return { maal: 58, tekst: "< 53–58 mmol/mol", grund: "rask ældre — i samråd med patienten" };
    if (s.varighed < 5 && !(s.alder >= 70) && !(s.hba1c >= 70) && !has(s.beh, "su") && !has(s.beh, "insulin")) return { maal: 48, tekst: "< 48 mmol/mol", grund: "de første år efter diagnosen uden hypoglykæmirisiko" };
    return { maal: 53, tekst: "< 53 mmol/mol", grund: "de fleste med type 2-diabetes" };
  }

  function ckd(s) {
    const lav = !isNaN(s.egfr) && s.egfr < 60;
    const alb = !isNaN(s.uacr) && s.uacr >= 30;
    return { lav, alb, ja: lav || alb };
  }

  // Organbeskyttende indikation uafhængigt af HbA1c.
  function organIndikation(s) {
    const k = ckd(s);
    const grunde = [];
    if (has(s.organ, "ascvd")) grunde.push("hjerte-kar-sygdom");
    if (has(s.organ, "hs")) grunde.push("hjertesvigt");
    if (k.alb) grunde.push(`albuminuri (UACR ${Math.round(s.uacr)} mg/g)`);
    if (k.lav) grunde.push(`eGFR ${Math.round(s.egfr)}`);
    if (has(s.organ, "risiko")) grunde.push("høj risiko (≥ 3 risikofaktorer)");
    return { grunde, ja: grunde.length > 0, sglt2Foretrukket: has(s.organ, "hs") || k.ja };
  }

  // ---------------------------------------------------------------------
  // Præparater
  // ---------------------------------------------------------------------

  function metforminDosis(egfr) {
    if (egfr < 30) return null;
    if (egfr < 45) return "Start 500 mg × 1 dagligt; maks. 1.000 mg dagligt ved eGFR 30–44.";
    return "Start 500 mg × 1–2 dagligt til måltid, øg over 2–4 uger til 1 g × 2 dagligt (eller depottablet).";
  }
  const R = {
    metformin: (s) => ({ key: "metformin", navn: "Metformin", indhold: "Biguanid, tablet", dosering: metforminDosis(isNaN(s.egfr) ? 90 : s.egfr) + " Mål B12 ved langvarig brug." }),
    dapa: () => ({ key: "dapagliflozin", navn: "Dapagliflozin 10 mg", indhold: "SGLT-2-hæmmer (fx Forxiga)", dosering: "1 tablet dagligt. Opstart til organbeskyttelse fra eGFR 25. Genitale svampeinfektioner hyppige; pausér ved akut sygdom og 3 dage før operation (ketoacidose)." }),
    empa: () => ({ key: "empagliflozin", navn: "Empagliflozin 10 mg", indhold: "SGLT-2-hæmmer (fx Jardiance)", dosering: "1 tablet dagligt. Opstart til organbeskyttelse fra eGFR 20. Samme forholdsregler som dapagliflozin." }),
    sema: () => ({ key: "semaglutid", navn: "Semaglutid s.c. (Ozempic)", indhold: "GLP-1-receptoragonist, ugentlig injektion", dosering: "0,25 mg ugentligt i 4 uger, derefter 0,5 mg; evt. 1 mg. Kvalme er hyppig i starten. Klausuleret tilskud — se nedenfor." }),
    semaOral: () => ({ key: "semaglutid-oral", navn: "Semaglutid tablet (Rybelsus)", indhold: "GLP-1-receptoragonist, dagligt", dosering: "3 mg i 30 dage, derefter 7 mg, evt. 14 mg. Tages fastende med lidt vand 30 min. før morgenmad." }),
    dula: () => ({ key: "dulaglutid", navn: "Dulaglutid 1,5 mg (Trulicity)", indhold: "GLP-1-receptoragonist, ugentlig injektion", dosering: "1,5 mg ugentligt (generelt klausuleret tilskud gælder kun 1,5 mg)." }),
    lina: () => ({ key: "linagliptin", navn: "Linagliptin 5 mg (Trajenta)", indhold: "DPP-4-hæmmer", dosering: "1 tablet dagligt — ingen dosisjustering ved nedsat nyrefunktion. Ingen hypoglykæmi alene. Kombineres ikke med GLP-1-receptoragonist." }),
    sita: (s) => ({ key: "sitagliptin", navn: `Sitagliptin ${s.egfr < 30 ? "25" : s.egfr < 45 ? "50" : "100"} mg`, indhold: "DPP-4-hæmmer", dosering: "1 tablet dagligt (100 mg; 50 mg ved eGFR 30–44; 25 mg under 30). Kombineres ikke med GLP-1-receptoragonist." }),
    insulin: () => ({ key: "basalinsulin", navn: "Basalinsulin (fx NPH/Insulatard eller glargin)", indhold: "Insulin, 1 gang dagligt", dosering: "Start 10 E (eller 0,1–0,2 E/kg) til natten; titrér med 2 E hver 3. dag til faste-P-glukose 5–7 mmol/l. Fortsæt metformin (og GLP-1/SGLT-2)." }),
    su: () => ({ key: "glimepirid", navn: "Glimepirid 1 mg", indhold: "Sulfonylurinstof", dosering: "Nedprioriteret (Medicinrådet 2026) pga. hypoglykæmi — kun når andre muligheder ikke kan bruges. Start 1 mg; forsigtighed hos ældre og ved nedsat nyrefunktion." }),
  };
  const tag = (r, t, rec) => Object.assign(r, { tag: t, tagClass: rec ? "tag-recommend" : "tag-alt" });

  function drugTable(list) {
    const h = ["Præparat (eksempel)", "Klasse", "Dosering og forhold"];
    return `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${list
      .map((r) => `<tr><td>${r.navn}<span class="tag ${r.tagClass}">${r.tag}</span>${valg.radio(r.key)}</td><td data-label="${h[1]}">${r.indhold}</td><td data-label="${h[2]}">${r.dosering}</td></tr>`)
      .join("")}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------------
  // Næste skridt
  // ---------------------------------------------------------------------

  function naesteSkridt(s, m, oi) {
    const b = (k) => has(s.beh, k);
    const kan = (k) => !has(s.kan, k);
    const egfr = isNaN(s.egfr) ? 90 : s.egfr;
    const overMaal = !isNaN(s.hba1c) && s.hba1c >= m.maal + (m.maal === 64 ? 5 : 0);
    const res = { titel: "", tekst: [], rows: [], noter: [] };

    if (has(s.forhold, "symptomer") || s.hba1c >= 75) {
      res.noter.push("<strong>Symptomgivende eller meget høj glukose</strong> (HbA1c ≥ 75 eller vægttab): overvej insulin — midlertidigt eller varigt — og mål GAD-antistoffer ved mistanke om type 1-diabetes/LADA (slank, hurtig progression).");
    }

    // 1. Metformin først (medmindre kontraindiceret).
    if (!b("metformin") && kan("metformin") && egfr >= 30) {
      res.titel = "Start metformin";
      res.tekst.push("Metformin er førstevalg (DSAM/DES, Medicinrådet).");
      res.rows.push(tag(R.metformin(s), "Anbefalet", true));
      if (oi.ja && kan("sglt2") && egfr >= 20) {
        res.tekst.push(`Samtidig organbeskyttende indikation (${oi.grunde.join(", ")}): start også en SGLT-2-hæmmer — uafhængigt af HbA1c.`);
        res.rows.push(tag(R.empa(), "Samtidig", true), tag(R.dapa(), "Alternativ", false));
      }
      return res;
    }
    if (b("metformin") && egfr < 30) res.noter.push("<strong>eGFR under 30:</strong> seponér metformin.");
    else if (b("metformin") && egfr < 45) res.noter.push("<strong>eGFR 30–44:</strong> metformin maks. 1.000 mg dagligt.");

    // 2. Organbeskyttelse uafhængigt af HbA1c.
    if (oi.ja && !b("sglt2") && !b("glp1")) {
      if (kan("sglt2") && egfr >= 20) {
        res.titel = "Tilføj SGLT-2-hæmmer (organbeskyttelse)";
        res.tekst.push(`Organbeskyttende indikation (${oi.grunde.join(", ")}): tilføj SGLT-2-hæmmer uanset HbA1c.${oi.sglt2Foretrukket ? " Ved hjertesvigt og nyresygdom er SGLT-2-hæmmer førstevalg." : ""}`);
        res.rows.push(tag(R.empa(), "Anbefalet", true), tag(R.dapa(), "Alternativ", false));
        if (has(s.organ, "ascvd") && kan("glp1")) res.rows.push(tag(R.sema(), "Hvis SGLT-2 ikke kan bruges", false));
      } else if (kan("glp1")) {
        res.titel = "Tilføj GLP-1-receptoragonist (organbeskyttelse)";
        res.tekst.push(`Organbeskyttende indikation (${oi.grunde.join(", ")}), men SGLT-2-hæmmer kan ikke bruges${egfr < 20 ? " (eGFR under 20)" : ""}: GLP-1-receptoragonist (semaglutid har dokumenteret hjerte-kar- og nyrebeskyttelse).`);
        res.rows.push(tag(R.sema(), "Anbefalet", true), tag(R.semaOral(), "Alternativ", false));
      }
      if (res.rows.length) return res;
    }

    // 3. Glykæmisk intensivering.
    if (isNaN(s.hba1c)) {
      res.titel = "Angiv HbA1c";
      res.tekst.push("Angiv HbA1c for at vurdere, om behandlingen skal intensiveres.");
      return res;
    }
    if (!overMaal) {
      res.titel = "I mål — fortsæt";
      res.tekst.push(`HbA1c ${s.hba1c} mmol/mol er inden for målet (${m.tekst}). Fortsæt nuværende behandling.`);
      if ((b("su") || b("insulin")) && (has(s.forhold, "skroebelig") || has(s.forhold, "hypo")) && s.hba1c < 53) {
        res.tekst.push("<strong>Overvej nedtrapning</strong> af sulfonylurinstof eller insulin — lavt HbA1c hos skrøbelig eller hypoglykæmitruet patient.");
      }
      return res;
    }
    res.tekst.push(`HbA1c ${s.hba1c} mmol/mol er over målet (${m.tekst}) — intensivér efter kontrol af adhærens og livsstil.`);
    if (!b("sglt2") && kan("sglt2") && egfr >= 45) {
      res.titel = "Tilføj SGLT-2-hæmmer";
      res.tekst.push("SGLT-2-hæmmer før GLP-1-receptoragonist (Medicinrådet; tilskudsreglerne). Glukoseeffekten aftager under eGFR 45.");
      res.rows.push(tag(R.empa(), "Anbefalet", true), tag(R.dapa(), "Alternativ", false));
      return res;
    }
    if (!b("glp1") && kan("glp1")) {
      res.titel = "Tilføj GLP-1-receptoragonist";
      res.tekst.push("Utilstrækkelig effekt af metformin og SGLT-2-hæmmer (eller SGLT-2-hæmmer kan ikke bruges): GLP-1-receptoragonist. Seponér DPP-4-hæmmer, hvis den bruges.");
      if (!b("sglt2") && egfr < 45 && kan("sglt2")) res.tekst.push(`eGFR ${Math.round(egfr)}: SGLT-2-hæmmer har kun lille glukoseeffekt — men giver fortsat nyre- og hjertebeskyttelse fra eGFR 20.`);
      res.rows.push(tag(R.sema(), "Anbefalet", true), tag(R.semaOral(), "Alternativ", false), tag(R.dula(), "Alternativ", false));
      return res;
    }
    if (has(s.forhold, "skroebelig") || has(s.forhold, "hypo")) {
      if (!b("glp1") && !b("dpp4")) {
        res.titel = "Tilføj DPP-4-hæmmer";
        res.tekst.push("Skrøbelig eller hypoglykæmitruet: DPP-4-hæmmer giver ikke hypoglykæmi alene.");
        res.rows.push(tag(R.lina(), "Anbefalet", true), tag(R.sita(s), "Alternativ", false));
        return res;
      }
    }
    res.titel = "Tilføj basalinsulin";
    res.tekst.push("Utilstrækkelig effekt trods metformin, SGLT-2-hæmmer og GLP-1-receptoragonist: basalinsulin. Sulfonylurinstof er nedprioriteret (hypoglykæmi).");
    res.rows.push(tag(R.insulin(), "Anbefalet", true));
    if (!b("su")) res.rows.push(tag(R.su(), "Nedprioriteret", false));
    if (!b("glp1") && !b("dpp4")) res.rows.push(tag(R.lina(), "Alternativ", false));
    return res;
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  let last = null;

  function update() {
    const s = getState();
    alderWarning.textContent = !isNaN(s.alder) && (s.alder < 18 || s.alder > 110) ? "Alder virker usædvanlig — tjek indtastningen." : "";
    const warn = [];
    if (!isNaN(s.hba1c) && (s.hba1c < 20 || s.hba1c > 200)) warn.push("HbA1c uden for plausibelt område (20–200 mmol/mol) — angives i mmol/mol, ikke %.");
    if (!isNaN(s.hba1c) && s.hba1c < 20 && s.hba1c > 3) warn.push("Ser ud som HbA1c i % — omregn til mmol/mol.");
    labWarning.textContent = warn.join(" ");
    const m = hba1cMaal(s);
    const oi = organIndikation(s);
    const n = naesteSkridt(s, m, oi);
    last = { s, m, oi, n };
    let html = "";

    // Mål
    const status = isNaN(s.hba1c) ? "" : s.hba1c < m.maal ? ` — HbA1c ${s.hba1c} er i mål` : ` — HbA1c ${s.hba1c} er over målet`;
    html += box(
      isNaN(s.hba1c) ? "box-blue" : s.hba1c < m.maal ? "box-green" : "box-amber",
      `HbA1c-mål: ${m.tekst}${status}`,
      `<p>Begrundelse: ${m.grund}. Målet er individuelt og aftales med patienten — laveste HbA1c uden hypoglykæmi og uhensigtsmæssig polyfarmaci.</p>
      ${s.hba1c < 48 && (has(s.beh, "su") || has(s.beh, "insulin")) ? "<p><strong>Lavt HbA1c på sulfonylurinstof eller insulin:</strong> risiko for hypoglykæmi — overvej nedtrapning.</p>" : ""}`
    );

    // Organbeskyttelse
    const k = ckd(s);
    html += box(
      oi.ja ? "box-red" : "box-blue",
      oi.ja ? "Organbeskyttende indikation" : "Ingen organbeskyttende indikation markeret",
      oi.ja
        ? `<p>${oi.grunde.join(", ").replace(/^./, (c) => c.toUpperCase())}: SGLT-2-hæmmer og/eller GLP-1-receptoragonist med dokumenteret effekt anbefales uafhængigt af HbA1c.${oi.sglt2Foretrukket ? " Ved hjertesvigt og kronisk nyresygdom foretrækkes SGLT-2-hæmmer." : " Ved aterosklerotisk sygdom har både SGLT-2-hæmmer og GLP-1-receptoragonist effekt — SGLT-2-hæmmer først jf. Medicinrådet og tilskudsreglerne."}</p>
          ${k.alb ? "<p>Albuminuri: ACE-hæmmer eller angiotensin II-receptorblokker i maksimalt tolereret dosis — også uden hypertension.</p>" : ""}
          <p>Kombinationen af SGLT-2-hæmmer og GLP-1-receptoragonist har ikke dokumenteret ekstra organbeskyttelse (Medicinrådet 2026), men bruges ved behov for yderligere glukosesænkning.</p>`
        : "<p>Markér hjerte-kar-sygdom, hjertesvigt eller høj risiko, og angiv eGFR og UACR — det afgør, om SGLT-2-hæmmer eller GLP-1-receptoragonist skal bruges uanset HbA1c.</p>"
    );

    // Næste skridt
    html += box(
      "box-green",
      `Næste skridt: ${n.titel}`,
      `${n.tekst.map((t) => `<p>${t}</p>`).join("")}${n.rows.length ? drugTable(n.rows) : ""}${n.noter.length ? ul(n.noter) : ""}
      <p>Livsstil (kost, fysisk aktivitet, vægttab og rygestop) gælder på alle trin. Kontrol af HbA1c 3 måneder efter ændring.</p>`
    );

    // eGFR
    const e = isNaN(s.egfr) ? null : s.egfr;
    html += collapsible(
      "box-blue",
      `Dosis efter nyrefunktion${e ? ` — eGFR ${Math.round(e)}` : ""}`,
      `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr><th>Lægemiddel</th><th>eGFR ≥ 45</th><th>30–44</th><th>&lt; 30</th></tr></thead><tbody>
        <tr><td>Metformin</td><td data-label="eGFR ≥ 45">Fuld dosis (1 g × 2)</td><td data-label="30–44">Maks. 1.000 mg dagligt</td><td data-label="&lt; 30">Seponeres</td></tr>
        <tr><td>SGLT-2-hæmmer</td><td data-label="eGFR ≥ 45">Glukose- og organeffekt</td><td data-label="30–44">Mest organbeskyttelse</td><td data-label="&lt; 30">Opstart fra eGFR 20 (empagliflozin) / 25 (dapagliflozin); fortsæt til dialyse</td></tr>
        <tr><td>GLP-1-receptoragonist</td><td data-label="eGFR ≥ 45">Ingen justering</td><td data-label="30–44">Ingen justering</td><td data-label="&lt; 30">Kan bruges; begrænset erfaring ved terminal nyresvigt</td></tr>
        <tr><td>Sitagliptin</td><td data-label="eGFR ≥ 45">100 mg</td><td data-label="30–44">50 mg</td><td data-label="&lt; 30">25 mg</td></tr>
        <tr><td>Linagliptin</td><td data-label="eGFR ≥ 45">5 mg</td><td data-label="30–44">5 mg</td><td data-label="&lt; 30">5 mg</td></tr>
        <tr><td>Sulfonylurinstof</td><td data-label="eGFR ≥ 45">Hypoglykæmirisiko</td><td data-label="30–44">Lav dosis, forsigtighed</td><td data-label="&lt; 30">Undgås</td></tr>
      </tbody></table></div>
      <p>eGFR-grænserne følger produktresuméerne. Tjek aktuelle grænser for det enkelte præparat på pro.medicin.dk.</p>`
    );

    // Tilskud
    html += collapsible(
      "box-blue",
      "Tilskud til GLP-1-receptoragonist",
      ul([
        "Klausuleret tilskud (fra 25. november 2024) kræver som hovedregel, at SGLT-2-hæmmer er forsøgt — eller ikke kan bruges (bivirkninger, svært nedsat nyrefunktion) hos patienter med mindst 3 hjerte-kar-risikofaktorer og utilstrækkelig effekt af metformin.",
        "Alternativt: utilstrækkelig effekt af alle relevante tabletbehandlinger inkl. SGLT-2-hæmmer.",
        "Ozempic og Rybelsus har klausuleret tilskud i alle styrker; Trulicity kun 1,5 mg; Victoza og Mounjaro har ikke generelt tilskud.",
        "Tjek den aktuelle klausul hos Lægemiddelstyrelsen, og skriv &quot;klausuleret tilskud&quot; på recepten.",
      ])
    );

    // Sygedage
    html += collapsible(
      "box-blue",
      "Sygedagsregler",
      ul([
        "Ved opkastning, diarré, feber eller dehydrering: <strong>pausér metformin, SGLT-2-hæmmer, ACE-hæmmer/ARB og diuretika</strong>, og genoptag, når patienten spiser og drikker normalt.",
        "SGLT-2-hæmmer pauseres 3 dage før større operation — risiko for euglykæmisk ketoacidose.",
        "Insulin fortsættes (ofte i reduceret dosis) med hyppig glukosemåling.",
      ])
    );

    html += `<p class="source-note">DSAM/DES og Medicinrådet. Præparatnavne er eksempler — følg regionens basisliste, og kontrollér dosis på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`;
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------

  const NAVN = { metformin: "metformin", sglt2: "SGLT-2-hæmmer", glp1: "GLP-1-receptoragonist", dpp4: "DPP-4-hæmmer", su: "sulfonylurinstof", insulin: "insulin" };

  function buildJournalNote() {
    const { s, m, oi, n } = last;
    const lines = [`Type 2-diabetes — behandling ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    if (!isNaN(s.varighed)) basis.push(`diabetes i ${s.varighed} år`);
    if (!isNaN(s.hba1c)) basis.push(`HbA1c ${s.hba1c} mmol/mol`);
    if (!isNaN(s.egfr)) basis.push(`eGFR ${Math.round(s.egfr)}`);
    if (!isNaN(s.uacr)) basis.push(`UACR ${Math.round(s.uacr)} mg/g`);
    if (!isNaN(s.bmi)) basis.push(`BMI ${String(s.bmi).replace(".", ",")}`);
    if (basis.length) lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    lines.push(`Aktuel behandling: ${s.beh.length ? s.beh.map((k) => NAVN[k]).join(", ") : "ingen glukosesænkende"}.`);
    lines.push(`HbA1c-mål ${m.tekst} (${m.grund}).${oi.ja ? ` Organbeskyttende indikation: ${oi.grunde.join(", ")}.` : ""}`);
    const row = valg.valgtRaekke() || (output.querySelector(".tag-recommend") || {}).closest?.("tr");
    if (row) {
      const r = Behandlingsvalg.raekkeTekst(row);
      const label = valg.valgtRaekke() ? "Valgt behandling:" : `Plan (${n.titel.toLowerCase()}):`;
      lines.push(`${label} ${r.navn}. ${r.celler[1]}`);
    } else {
      lines.push(`Plan: ${n.titel}.`);
    }
    lines.push("Kontrol (tilpas): HbA1c efter 3 måneder; eGFR, UACR og elektrolytter efter opstart af SGLT-2-hæmmer eller ACE-hæmmer/ARB. Sygedagsregler gennemgået.");
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
