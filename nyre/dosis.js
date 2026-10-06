/*
 * Dosis efter nyrefunktion: almindelige lægemidler i almen praksis ved nedsat
 * eGFR eller kreatininclearance (Cockcroft-Gault). Grænserne følger
 * produktresuméerne; hvert lægemiddel bruger det mål, det er doseret efter.
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const printMeta = document.getElementById("printMeta");
  const labWarning = document.getElementById("labWarning");

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede værdier.";
      window.print();
    });
  }
  document.getElementById("resetBtn").addEventListener("click", () => {
    form.reset();
    // Skjulte felter nulstilles ikke af form.reset().
    document.getElementById("naevnte").value = "";
    update();
  });
  function copyText(text) {
    const done = () => {
      copyStatus.textContent = "Kopieret ✓";
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    };
    const fail = () => (copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.");
    try {
      navigator.clipboard.writeText(text).then(done, fail);
    } catch (e) {
      fail();
    }
  }
  document.getElementById("copyBtn").addEventListener("click", () => copyText(buildNote(true)));
  document.getElementById("copyFullBtn").addEventListener("click", () => copyText(buildNote(false)));

  const num = (id) => {
    const v = document.getElementById(id).value;
    return v === "" ? NaN : parseFloat(v.replace(",", "."));
  };
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const U = -Infinity;
  // Status: ok = normal dosering, just = justér/forsigtighed, undgaa = undgås, ki = kontraindiceret.
  // trin: [nedre grænse, status, råd] — første trin, hvor værdien er ≥ grænsen, gælder.
  const MIDLER = [
    { gruppe: "Diabetes", navn: "Metformin", maal: "eGFR", trin: [[60, "ok", "Fuld dosis (maks. 3.000 mg dagligt)."], [45, "just", "Maks. 2.000 mg dagligt."], [30, "just", "Maks. 1.000 mg dagligt. Overvej risikoen for laktacidose før opstart."], [U, "ki", "Seponér."]] },
    { gruppe: "Diabetes", navn: "SGLT-2-hæmmer (empagliflozin, dapagliflozin)", maal: "eGFR", trin: [[45, "ok", "Glukosesænkende og organbeskyttende."], [25, "ok", "Organbeskyttende; lille glukoseeffekt. Opstart muligt."], [20, "just", "Opstart kun empagliflozin (fra eGFR 20); igangværende behandling fortsættes."], [U, "just", "Start ikke. Igangværende behandling kan fortsætte til dialyse."]] },
    { gruppe: "Diabetes", navn: "Sitagliptin", maal: "eGFR", trin: [[45, "ok", "100 mg dagligt."], [30, "just", "50 mg dagligt."], [U, "just", "25 mg dagligt."]] },
    { gruppe: "Diabetes", navn: "Linagliptin", maal: "eGFR", trin: [[U, "ok", "5 mg dagligt — ingen dosisjustering."]] },
    { gruppe: "Diabetes", navn: "GLP-1-receptoragonist (semaglutid, dulaglutid, liraglutid)", maal: "eGFR", trin: [[15, "ok", "Ingen dosisjustering. Pas på dehydrering ved kvalme og opkastning."], [U, "undgaa", "Ikke anbefalet ved terminal nyresvigt."]] },
    { gruppe: "Diabetes", navn: "Glimepirid (sulfonylurinstof)", maal: "eGFR", trin: [[60, "ok", "Hypoglykæmirisiko — start lavt."], [30, "just", "Øget hypoglykæmirisiko — lav dosis og tæt kontrol."], [U, "ki", "Ved svært nedsat nyrefunktion — vælg fx DPP-4-hæmmer eller insulin."]] },
    { gruppe: "Diabetes", navn: "Insulin", maal: "eGFR", trin: [[30, "ok", "Behovet falder med nyrefunktionen — revurdér dosis ved faldende eGFR."], [U, "just", "Øget hypoglykæmirisiko — reducér dosis efter målinger."]] },

    { gruppe: "Hjerte-kar", navn: "ACE-hæmmer eller ARB", maal: "eGFR", trin: [[30, "ok", "Fortsæt — nyrebeskyttende ved albuminuri. Kreatinin og kalium efter opstart og dosisøgning; acceptér eGFR-fald op til 30 %."], [U, "ok", "Kan fortsættes (KDIGO 2024) med tæt kontrol af kalium og kreatinin. Pausér ved dehydrering."]] },
    { gruppe: "Hjerte-kar", navn: "Spironolakton eller eplerenon", maal: "eGFR", trin: [[45, "ok", "Kalium og kreatinin efter 1 uge og 1 måned, derefter jævnligt."], [30, "just", "Lav dosis (fx spironolakton 12,5–25 mg) og tæt kaliumkontrol."], [U, "ki", "Risiko for hyperkaliæmi ved svært nedsat nyrefunktion."]] },
    { gruppe: "Hjerte-kar", navn: "Thiazid (bendroflumethiazid, hydrochlorthiazid)", maal: "eGFR", trin: [[30, "ok", "Kontrol af natrium og kalium."], [U, "just", "Aftagende effekt — loop-diuretikum ved væskeophobning."]] },
    { gruppe: "Hjerte-kar", navn: "DOAK ved atrieflimren (apixaban, rivaroxaban, edoxaban, dabigatran)", maal: "CrCl", trin: [[51, "ok", "Standarddosis (apixaban dog 2,5 mg × 2 ved 2 af 3: alder ≥ 80, vægt ≤ 60 kg, kreatinin ≥ 133). VTE-behandling: se produktresumé."], [50, "just", "CrCl 50: edoxaban 30 mg; rivaroxaban, apixaban og dabigatran i standarddosis."], [30, "just", "Rivaroxaban 15 mg; edoxaban 30 mg; dabigatran 110 mg × 2 kan overvejes; apixaban som ved normal nyrefunktion. VTE-behandling: se produktresumé."], [15, "just", "Rivaroxaban 15 mg; edoxaban 30 mg; apixaban 2,5 mg × 2; dabigatran kontraindiceret."], [U, "undgaa", "DOAK anbefales ikke ved CrCl under 15."]], link: `<a href="../hjerte/af.html">Atrieflimren-værktøjet</a>` },
    { gruppe: "Hjerte-kar", navn: "Statin", maal: "CrCl", trin: [[60, "ok", "Ingen dosisjustering."], [30, "just", "Atorvastatin uændret. Rosuvastatin: start 5 mg; 40 mg kontraindiceret."], [U, "just", "Atorvastatin uændret. Rosuvastatin kontraindiceret."]] },
    { gruppe: "Hjerte-kar", navn: "Digoxin", maal: "CrCl", trin: [[60, "ok", "Vanlig dosering."], [U, "just", "Reducér dosis, og mål plasmakoncentration (toksicitet)."]] },

    { gruppe: "Smerter", navn: "Paracetamol", maal: "eGFR", trin: [[U, "ok", "Førstevalg — ingen dosisjustering ved normale doser."]] },
    { gruppe: "Smerter", navn: "NSAID (ibuprofen, naproxen, diclofenac m.fl.)", maal: "eGFR", trin: [[60, "ok", "Kun kortvarigt og i laveste dosis. Undgå kombinationen med ACE-hæmmer/ARB og diuretikum."], [U, "undgaa", "Undgås."]] },
    { gruppe: "Smerter", navn: "Morfin", maal: "eGFR", trin: [[60, "ok", "Normal dosering."], [30, "just", "Lavere dosis og længere interval — aktive metabolitter ophobes."], [U, "undgaa", "Undgås — vælg fx oxycodon i lav dosis, buprenorfin eller fentanyl."]] },
    { gruppe: "Smerter", navn: "Oxycodon", maal: "eGFR", trin: [[60, "ok", "Normal dosering."], [U, "just", "Start med lav dosis, og titrér forsigtigt."]] },
    { gruppe: "Smerter", navn: "Tramadol", maal: "CrCl", trin: [[30, "ok", "Maks. 400 mg/døgn."], [10, "just", "Dosisinterval 12 timer, maks. 200 mg/døgn."], [U, "undgaa", "Anbefales ikke ved CrCl under 10."]] },
    { gruppe: "Smerter", navn: "Gabapentin", maal: "CrCl", trin: [[80, "ok", "900–3.600 mg/døgn."], [50, "just", "600–1.800 mg/døgn."], [30, "just", "300–900 mg/døgn."], [15, "just", "150–600 mg/døgn."], [U, "just", "150–300 mg/døgn."]] },
    { gruppe: "Smerter", navn: "Pregabalin", maal: "CrCl", trin: [[60, "ok", "150–600 mg/døgn."], [30, "just", "75–300 mg/døgn."], [15, "just", "25–150 mg/døgn."], [U, "just", "25–75 mg/døgn."]] },

    { gruppe: "Antibiotika og antivirale", navn: "Nitrofurantoin", maal: "eGFR", trin: [[45, "ok", "Normal dosering."], [U, "ki", "Virker ikke og ophobes — brug fx pivmecillinam."]], link: `<a href="../infektion/urinveje.html">Urinvejsinfektioner</a>` },
    { gruppe: "Antibiotika og antivirale", navn: "Pivmecillinam", maal: "eGFR", trin: [[U, "ok", "Ingen dosisjustering."]] },
    { gruppe: "Antibiotika og antivirale", navn: "Trimethoprim", maal: "CrCl", trin: [[31, "ok", "Normal dosering. Kan hæve kreatinin og kalium."], [15, "just", "Normal dosis i 3 dage, derefter halv dosis."], [U, "undgaa", "Undgås."]] },
    { gruppe: "Antibiotika og antivirale", navn: "Penicillin V, dicloxacillin", maal: "CrCl", trin: [[10, "ok", "Ingen dosisjustering ved almindelige doser."], [U, "just", "Konferér — dosisreduktion kan være nødvendig."]] },
    { gruppe: "Antibiotika og antivirale", navn: "Amoxicillin (også med clavulansyre)", maal: "CrCl", trin: [[30, "ok", "Normal dosering."], [10, "just", "Maks. 500 mg × 2 dagligt."], [U, "just", "Maks. 500 mg dagligt."]] },
    { gruppe: "Antibiotika og antivirale", navn: "Ciprofloxacin", maal: "CrCl", trin: [[60, "ok", "Normal dosering."], [30, "just", "250–500 mg × 2 dagligt."], [U, "just", "250–500 mg × 1 dagligt."]] },
    { gruppe: "Antibiotika og antivirale", navn: "Clarithromycin", maal: "CrCl", trin: [[30, "ok", "Normal dosering (obs. interaktioner)."], [U, "just", "Halv dosis."]] },
    { gruppe: "Antibiotika og antivirale", navn: "Valaciclovir (herpes zoster)", maal: "CrCl", trin: [[50, "ok", "1 g × 3 dagligt."], [30, "just", "1 g × 2 dagligt."], [10, "just", "1 g × 1 dagligt."], [U, "just", "500 mg × 1 dagligt."]] },

    { gruppe: "Øvrige", navn: "Allopurinol", maal: "eGFR", trin: [[60, "ok", "Start 100 mg, og optitrér efter urat."], [30, "just", "Start 50–100 mg; optitrér langsomt efter urat og tolerance."], [U, "just", "Start 50 mg; optitrér langsomt."]] },
    { gruppe: "Øvrige", navn: "Colchicin", maal: "CrCl", trin: [[60, "ok", "Normal dosering (obs. interaktioner, fx clarithromycin)."], [30, "just", "Reducér dosis eller forlæng intervallet — tæt kontrol."], [U, "ki", "Ved svært nedsat nyrefunktion — brug fx prednisolon ved urinsyregigt."]] },
    { gruppe: "Øvrige", navn: "Methotrexat", maal: "CrCl", trin: [[60, "ok", "Normal ugentlig dosering."], [30, "just", "Reducér dosis (fx 50 %) — konferér med den behandlende specialist."], [U, "ki", "Seponér — konferér med den behandlende specialist."]] },
    { gruppe: "Øvrige", navn: "Lithium", maal: "eGFR", trin: [[60, "ok", "Tæt kontrol af s-lithium og nyrefunktion."], [30, "just", "Konferér med psykiater — lavere dosis og tæt kontrol."], [U, "undgaa", "Undgås — konferér med psykiater."]] },
    { gruppe: "Øvrige", navn: "Alendronat, risedronat", maal: "CrCl", trin: [[35, "ok", "Normal dosering."], [30, "just", "Alendronat anbefales ikke under 35; risedronat kan bruges ned til 30."], [U, "undgaa", "Bisfosfonater undgås — overvej denosumab (obs. hypokalcæmi)."]] },
    { gruppe: "Øvrige", navn: "Metoclopramid", maal: "CrCl", trin: [[60, "ok", "Normal dosering."], [15, "just", "Halv dosis."], [U, "just", "Kvart dosis."]] },
    { gruppe: "Øvrige", navn: "Magnesiumoxid (afføringsmiddel)", maal: "eGFR", trin: [[30, "ok", "Forsigtighed ved langvarig brug."], [U, "undgaa", "Undgås (hypermagnesiæmi) — brug fx makrogol."]] },
    { gruppe: "Øvrige", navn: "Kaliumtilskud", maal: "eGFR", trin: [[45, "ok", "Kontrol af kalium."], [30, "just", "Forsigtighed — tæt kaliumkontrol."], [U, "undgaa", "Undgås som hovedregel."]] },
  ];
  // Navne i journaltekst (generiske navne og hyppige handelsnavne) — bruges af "Udfyld fra journaltekst".
  const SYNONYMER = {
    "Metformin": "metformin|glucophage|metformax|janumet|synjardy|xigduo|jentadueto|eucreas|vokanamet|segluromet",
    "SGLT-2-hæmmer (empagliflozin, dapagliflozin)": "sglt-?2|empagliflozin|dapagliflozin|jardiance|forxiga|synjardy|xigduo",
    "Sitagliptin": "sitagliptin|januvia|janumet",
    "Linagliptin": "linagliptin|trajenta|jentadueto",
    "GLP-1-receptoragonist (semaglutid, dulaglutid, liraglutid)": "glp-?1|semaglutid|dulaglutid|liraglutid|ozempic|rybelsus|trulicity|victoza|wegovy|tirzepatid|mounjaro|bydureon|byetta|exenatid|saxenda|xultophy|lyxumia",
    "Glimepirid (sulfonylurinstof)": "glimepirid|gliclazid|glipizid|sulfonylurinstof|amaryl",
    "Insulin": "insulin|lantus|levemir|tresiba|toujeo|insulatard|novorapid|humalog|abasaglar|semglee|novomix|fiasp|humulin|actrapid|mixtard|apidra|lyumjev|ryzodeg|insuman|xultophy",
    "ACE-hæmmer eller ARB": "ace-?hæmmer|enalapril|lisinopril|ramipril|perindopril|captopril|losartan|candesartan|valsartan|irbesartan|telmisartan|olmesartan|cozaar|atacand|diovan|triatec|coversyl|exforge|micardis|aprovel|olmetec|sevikar|renitec|zestril|quinapril|fosinopril|benazepril",
    "Spironolakton eller eplerenon": "spironolakton|eplerenon|spirix|inspra",
    "Thiazid (bendroflumethiazid, hydrochlorthiazid)": "thiazid|bendroflumethiazid|hydrochlorthiazid|centyl|chlorthalidon|indapamid|(?:losartan|candesartan|valsartan|irbesartan|telmisartan|olmesartan|enalapril|lisinopril|ramipril|cozaar|atacand|diovan|micardis|olmetec|aprovel|exforge)\\s*-?\\s*(?:comp|plus|hct)",
    "DOAK ved atrieflimren (apixaban, rivaroxaban, edoxaban, dabigatran)": "doak|noak|apixaban|rivaroxaban|edoxaban|dabigatran|eliquis|xarelto|lixiana|pradaxa",
    "Statin": "statin|atorvastatin|simvastatin|rosuvastatin|pravastatin|lipitor|zarator|crestor|zocor",
    "Digoxin": "digoxin|lanoxin",
    "Paracetamol": "paracetamol|panodil|pamol|pinex",
    "NSAID (ibuprofen, naproxen, diclofenac m.fl.)": "nsaid|ibuprofen|naproxen|diclofenac|etoricoxib|celecoxib|ipren|ibumetin|voltaren|arcoxia|celebra|diclon|confortid|bonyl|brufen|nurofen|ibumax|ketoprofen|meloxicam|ketorolac",
    "Morfin": "morfin|contalgin|oramorph|malfin|dolcontin",
    "Oxycodon": "oxycodon|oxycontin|oxynorm|targin",
    "Tramadol": "tramadol|tradolan|nobligan|dolol|mandolgin",
    "Gabapentin": "gabapentin|neurontin",
    "Pregabalin": "pregabalin|lyrica",
    "Nitrofurantoin": "nitrofurantoin|furadantin",
    "Pivmecillinam": "pivmecillinam|selexid",
    "Trimethoprim": "trimethoprim|trimopan",
    "Penicillin V, dicloxacillin": "penicillin|phenoxymethylpenicillin|primcillin|primve|vepicombin|dicloxacillin|diclocil|dicillin|heracillin|flucloxacillin|nerbutix",
    "Amoxicillin (også med clavulansyre)": "amoxicillin|amoxi-?clav|bioclavid|spektramox|imadrax",
    "Ciprofloxacin": "ciprofloxacin|ciproxin",
    "Clarithromycin": "clarithromycin|klacid",
    "Valaciclovir (herpes zoster)": "valaciclovir|valtrex|aciclovir",
    "Allopurinol": "allopurinol|apurin|zyloric",
    "Colchicin": "colchicin|colrefuz",
    "Methotrexat": "methotrexat|metex|ebetrex|metoject|methotrexate",
    "Lithium": "lithium|litarex",
    "Alendronat, risedronat": "alendronat|alendronsyre|risedronat|fosamax|optinate|bisfosfonat",
    "Metoclopramid": "metoclopramid|primperan",
    "Magnesiumoxid (afføringsmiddel)": "magnesiumoxid|magnesia|mablet",
    "Kaliumtilskud": "kaliumklorid|kaliumtilskud|kaleorid|kalium retard",
  };

  const STATUS = { ok: ["Normal dosering", "tag-recommend"], just: ["Justér", "tag-warn"], undgaa: ["Undgå", "tag-danger"], ki: ["Kontraindiceret", "tag-danger"] };

  function getState() {
    const alder = num("alder");
    const vaegt = num("vaegt");
    const kreat = num("kreat");
    const koen = radio("koen");
    let crcl = NaN;
    if (alder > 0 && vaegt > 0 && kreat > 0) crcl = ((140 - alder) * vaegt * (koen === "mand" ? 1.23 : 1.04)) / kreat;
    const naevnte = document.getElementById("naevnte").value ? document.getElementById("naevnte").value.split("|") : [];
    document.getElementById("naevnteLabel").hidden = !naevnte.length;
    const vis = Array.from(document.querySelectorAll('input[name="vis"]:checked')).map((el) => el.value);
    return { egfr: num("egfr"), alder, vaegt, kreat, koen, crcl, sog: document.getElementById("sog").value.trim().toLowerCase(), kunHandling: vis.includes("handling"), naevnte, kunNaevnte: vis.includes("naevnte") && naevnte.length > 0 };
  }

  // Værdien, et lægemiddel vurderes efter; CrCl erstattes af eGFR, hvis den mangler.
  function vaerdi(m, s) {
    if (m.maal === "CrCl" && !isNaN(s.crcl)) return { v: s.crcl, maal: "CrCl" };
    if (!isNaN(s.egfr)) return { v: s.egfr, maal: m.maal === "CrCl" ? "eGFR (i stedet for CrCl)" : "eGFR" };
    if (!isNaN(s.crcl)) return { v: s.crcl, maal: "CrCl (i stedet for eGFR)" };
    return null;
  }
  const trinFor = (m, v) => m.trin.find((t) => v >= t[0]);
  const graenser = (m) =>
    m.trin.length === 1 ? "Alle niveauer." : m.trin.map((t, i) => `${i === 0 ? "≥ " + t[0] : t[0] === U ? "< " + m.trin[i - 1][0] : t[0] + "–" + (m.trin[i - 1][0] - 1)}: ${t[2]}`).join(" ");

  let last = null;

  function update() {
    const s = getState();
    const w = [];
    if (!isNaN(s.kreat) && s.kreat < 20) w.push("Kreatinin angives i µmol/l.");
    if (!isNaN(s.crcl) && s.vaegt > 100) w.push("Ved betydelig overvægt overvurderer faktisk vægt clearance — overvej justeret vægt.");
    labWarning.textContent = w.join(" ");

    let html = "";
    const har = !isNaN(s.egfr) || !isNaN(s.crcl);
    const info = [];
    if (!isNaN(s.egfr)) info.push(`eGFR ${Math.round(s.egfr)} ml/min/1,73 m²`);
    if (!isNaN(s.crcl)) info.push(`kreatininclearance (Cockcroft-Gault) ${Math.round(s.crcl)} ml/min`);
    if (!har) html += box("box-blue", "Angiv eGFR", "<p>Angiv eGFR — og gerne alder, vægt og kreatinin, så kreatininclearance kan beregnes til de lægemidler, der doseres efter den (fx DOAK, gabapentin og antibiotika).</p>");
    else {
      const b = [`<p>${info.join(" · ")}.</p>`];
      if (isNaN(s.crcl)) b.push("<p>Kreatininclearance er ikke beregnet — eGFR bruges i stedet. Hos ældre og undervægtige kan eGFR overvurdere clearance; angiv alder, vægt og kreatinin.</p>");
      else if (!isNaN(s.egfr) && Math.abs(s.crcl - s.egfr) >= 15) b.push(`<p><strong>CrCl og eGFR afviger ${Math.round(Math.abs(s.crcl - s.egfr))} ml/min</strong> — typisk hos ældre, undervægtige eller overvægtige. Brug CrCl til lægemidler, der doseres efter den.</p>`);
      html += box("box-blue", "Nyrefunktion", b.join(""));
    }

    const rows = [];
    let gruppe = "";
    const relevante = [];
    MIDLER.forEach((m) => {
      if (s.sog && !m.navn.toLowerCase().includes(s.sog) && !m.gruppe.toLowerCase().includes(s.sog)) return;
      if (s.kunNaevnte && !s.naevnte.includes(m.navn)) return;
      const val = vaerdi(m, s);
      const t = val ? trinFor(m, val.v) : null;
      if (s.kunHandling && (!t || t[1] === "ok")) return;
      if (t && t[1] !== "ok") relevante.push({ m, t, val });
      if (m.gruppe !== gruppe) {
        gruppe = m.gruppe;
        rows.push(`<tr class="group-row"><th colspan="3">${gruppe}</th></tr>`);
      }
      const st = t ? STATUS[t[1]] : null;
      rows.push(`<tr><td>${m.navn}${st ? `<span class="tag ${st[1]}">${st[0]}</span>` : ""}</td><td data-label="Ved aktuel nyrefunktion">${t ? `${t[2]} <span class="field-hint">(${val.maal})</span>` : `<span class="field-hint">Angiv nyrefunktion (${m.maal}).</span>`}${m.link ? ` Se ${m.link}.` : ""}</td><td data-label="Grænser (${m.maal})">${graenser(m)}</td></tr>`);
    });
    last = { s, relevante };
    html += box(
      "box-green",
      har ? `Lægemidler${relevante.length ? ` — ${relevante.length} kræver handling` : ""}` : "Lægemidler",
      rows.length ? `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr><th>Lægemiddel</th><th>Ved aktuel nyrefunktion</th><th>Grænser</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>` : `<p>Ingen lægemidler matcher "${esc(s.sog)}".</p>`
    );
    html += box("box-blue", "Generelt ved nedsat nyrefunktion", ul([
      "Gennemgå medicinen ved hvert fald i eGFR-kategori og ved akut sygdom.",
      "<strong>Sygedagsregler:</strong> pausér metformin, SGLT-2-hæmmer, ACE-hæmmer/ARB, diuretika og NSAID ved dehydrering (opkastning, diarré, feber).",
      "Undgå kombinationen NSAID + ACE-hæmmer/ARB + diuretikum (\"triple whammy\") — risiko for akut nyreskade.",
      "Cockcroft-Gault bruger faktisk vægt; ved svær overvægt eller hos meget ældre er clearance usikker — vurder klinisk.",
    ]));
    html += `<p class="source-note">Produktresuméer via pro.medicin.dk og KDIGO 2024. Listen er ikke udtømmende — tjek altid <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`;
    output.innerHTML = html;
  }

  function buildNote(kunRelevante) {
    const { s, relevante } = last;
    const lines = [`Medicin og nyrefunktion ${new Date().toLocaleDateString("da-DK")}`];
    const info = [];
    if (!isNaN(s.egfr)) info.push(`eGFR ${Math.round(s.egfr)}`);
    if (!isNaN(s.crcl)) info.push(`CrCl (Cockcroft-Gault) ${Math.round(s.crcl)} ml/min`);
    if (info.length) lines.push(info.join(", ") + ".");
    const list = kunRelevante
      ? relevante
      : MIDLER.map((m) => {
          const val = vaerdi(m, s);
          return { m, t: val ? trinFor(m, val.v) : null, val };
        }).filter((x) => x.t);
    list.forEach(({ m, t }) => lines.push(`- ${m.navn}: ${STATUS[t[1]][0].toLowerCase()} — ${t[2]}`));
    if (kunRelevante && !relevante.length) lines.push("Ingen af de viste lægemidler kræver dosisjustering ved den angivne nyrefunktion.");
    return lines.join("\n");
  }

  // ---------------------------------------------------------------------
  // Udfyld fra journaltekst (../udfyld.js)
  // ---------------------------------------------------------------------

  if (window.Udfyld) {
    Udfyld.init(
      (L) => {
        const u = [];
        const e = L.egfrTid().nu;
        if (e) u.push({ type: "num", id: "egfr", v: e.v, label: "eGFR", kilde: e.kilde, note: e.note || (e.op ? `angivet som ${e.op} ${e.v}` : "") });
        const a = L.alder();
        if (a) u.push({ type: "num", id: "alder", v: a.v, label: "Alder (år)", kilde: a.kilde });
        const w = L.vaegt();
        if (w) u.push({ type: "num", id: "vaegt", v: w.v, label: "Vægt (kg)", kilde: w.kilde });
        L.uacr();
        const kr = L.kreat();
        if (kr) u.push({ type: "num", id: "kreat", v: kr.v, label: "P-kreatinin (µmol/l)", kilde: kr.kilde });
        const k = L.koen();
        if (k) u.push({ type: "radio", name: "koen", value: k.v, label: "Køn", kilde: k.kilde });
        // Ethvert nævnt lægemiddel tæller (også "ingen bivirkninger af Eliquis") — filtret skjuler kun rækker.
        const fundne = MIDLER.filter((m) => SYNONYMER[m.navn] && L.alle(new RegExp(`${L.B}(?:${SYNONYMER[m.navn]})`, "g")).length);
        // Præparater med dosis, som værktøjet ikke kender ("Furix 40 mg", "Kodimagnyl 1 tbl"): så slås
        // "Vis kun nævnte" ikke til, så intet skjules for lægen.
        const KENDT = new RegExp(`^(?:${Object.values(SYNONYMER).join("|")})`);
        const IKKE_PRAEP = /^(?:dosis|ca|og|med|af|på|til|i|x|nu|dag|døgn|uge|vægt|kreatinin|krea|egfr|gfr|kalium|uacr|bt|hba1c|ldl|crp|alder|mand|kvinde|tbl|tabl|kaps|stk|fast|pn|eller|samt|ved|efter|før)$/;
        const ukendte = [...new Set(L.alle(/(?<![a-zæøå0-9])([a-zæøå][a-zæøå-]{2,})\.?\s+\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:mg|mikrog|µg|g|ie|ml|tbl|tabl|kaps|stk|pust|dråber)(?![a-zæøå])/g)
          .map((m) => m[1])
          .filter((w) => !IKKE_PRAEP.test(w) && !KENDT.test(w)))];
        if (fundne.length) {
          u.push({ type: "hidden", id: "naevnte", v: fundne.map((m) => m.navn).join("|"), label: "Lægemidler nævnt", vis: fundne.map((m) => m.navn.split(" (")[0]).join(", ") });
          if (!ukendte.length) u.push({ type: "check", name: "vis", value: "naevnte", on: true, label: "Vis kun nævnte lægemidler" });
          else u.push({ type: "note", tekst: `Præparater, som værktøjet ikke har en række for (${ukendte.join(", ")}) — "Vis kun nævnte" er derfor ikke slået til. Tjek dem på pro.medicin.dk.` });
        } else if (ukendte.length) u.push({ type: "note", tekst: `Præparater, som værktøjet ikke har en række for: ${ukendte.join(", ")} — tjek dem på pro.medicin.dk.` });
        return u;
      },
      { vigtige: [["egfr", "eGFR"], ["kreat", "kreatinin"], ["vaegt", "vægt"], ["koen", "køn (bruges i Cockcroft-Gault)"]], eksempel: "Fx: 82-årig kvinde, 58 kg, kreatinin 128, eGFR 38. Fast medicin: metformin 1 g × 2, Eliquis 5 mg × 2, gabapentin 300 mg × 3, Pinex." }
    );
  }

  update();
})();
