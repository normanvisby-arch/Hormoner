/*
 * Kronisk nyresygdom hos voksne: KDIGO-stadie (G/A) og farvekort, risiko for
 * nyresvigt med KFRE (4 variable, kalibreret uden for Nordamerika; Tangri
 * JAMA 2016), kontrolhyppighed, henvisningskriterier (DNS 2024, regionale
 * forløbsbeskrivelser, KDIGO 2024) og nyrebeskyttende behandling (KDIGO 2024).
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const printMeta = document.getElementById("printMeta");
  const alderWarning = document.getElementById("alderWarning");
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
  window.addEventListener("beforeprint", () => output.querySelectorAll("details").forEach((d) => (d.open = true)));
  document.getElementById("resetBtn").addEventListener("click", () => {
    form.reset();
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
  document.getElementById("copyBtn").addEventListener("click", () => copyText(buildJournalNote()));
  document.getElementById("copyFullBtn").addEventListener("click", () => copyText(buildFullText()));

  const num = (id) => {
    const v = document.getElementById(id).value;
    return v === "" ? NaN : parseFloat(v.replace(",", "."));
  };
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const fmt = (x, d = 1) => String(Math.round(x * 10 ** d) / 10 ** d).replace(".", ",");
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const collapsible = (cls, title, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${title}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  // ---------------------------------------------------------------------
  // KDIGO-kategorier
  // ---------------------------------------------------------------------

  const G = [
    { k: "G1", min: 90, tekst: "normal eller høj (≥ 90)" },
    { k: "G2", min: 60, tekst: "let nedsat (60–89)" },
    { k: "G3a", min: 45, tekst: "let til moderat nedsat (45–59)" },
    { k: "G3b", min: 30, tekst: "moderat til svært nedsat (30–44)" },
    { k: "G4", min: 15, tekst: "svært nedsat (15–29)" },
    { k: "G5", min: -Infinity, tekst: "nyresvigt (< 15)" },
  ];
  const A = [
    { k: "A1", max: 30, tekst: "normal til let forhøjet (< 30 mg/g)" },
    { k: "A2", max: 300, tekst: "moderat forhøjet (30–299 mg/g)" },
    { k: "A3", max: Infinity, tekst: "svært forhøjet (≥ 300 mg/g)" },
  ];
  // Risiko og kontrolhyppighed (gange pr. år) pr. G-række og A-kolonne (KDIGO 2024: fx 3 gange
  // årligt ved G1A3 og 4 gange ved G4A3 og G5).
  const RISIKO = [
    ["lav", "moderat", "hoej"],
    ["lav", "moderat", "hoej"],
    ["moderat", "hoej", "meget"],
    ["hoej", "meget", "meget"],
    ["meget", "meget", "meget"],
    ["meget", "meget", "meget"],
  ];
  const KONTROL = [
    ["1*", "1", "3"],
    ["1*", "1", "3"],
    ["1", "2", "3"],
    ["2", "3", "3"],
    ["3", "3", "4"],
    ["4", "4", "4"],
  ];
  const RISIKO_TEKST = { lav: "lav risiko", moderat: "moderat øget risiko", hoej: "høj risiko", meget: "meget høj risiko" };
  const RISIKO_BOX = { lav: "box-green", moderat: "box-amber", hoej: "box-amber", meget: "box-red" };
  const gIdx = (e) => G.findIndex((g) => e >= g.min);
  const aIdx = (u) => A.findIndex((a) => u < a.max);

  // KFRE, 4 variable, kalibreret uden for Nordamerika (Tangri, JAMA 2016).
  // UACR i mg/g (naturlig logaritme); eGFR i ml/min/1,73 m².
  function kfre(s) {
    if (isNaN(s.alder) || isNaN(s.egfr) || isNaN(s.uacr) || s.egfr >= 60) return null;
    const u = Math.max(s.uacr, 1);
    const x = -0.2201 * (s.alder / 10 - 7.036) + 0.2467 * ((s.koen === "mand" ? 1 : 0) - 0.5642) - 0.5567 * (s.egfr / 5 - 7.222) + 0.451 * (Math.log(u) - 5.137);
    return { to: 1 - Math.pow(0.9832, Math.exp(x)), fem: 1 - Math.pow(0.9365, Math.exp(x)) };
  }
  const pct = (p) => (p < 0.001 ? "< 0,1 %" : p < 0.1 ? `${fmt(p * 100)} %` : `${Math.round(p * 100)} %`);

  function getState() {
    const syg = checked("syg");
    const med = checked("med");
    return {
      alder: num("alder"),
      koen: radio("koen"),
      egfr: num("egfr"),
      egfrFoer: num("egfrFoer"),
      uacr: num("uacr"),
      sbp: num("sbp"),
      dbp: num("dbp"),
      kalium: num("kalium"),
      bekraeftet: checked("andet").includes("bekraeftet"),
      syg,
      med,
      har: (k) => syg.includes(k) || med.includes(k),
    };
  }

  // ---------------------------------------------------------------------
  // Vurdering
  // ---------------------------------------------------------------------

  function vurder(s) {
    const v = { henvis: [], overvej: [], behandling: [], noter: [] };
    v.g = isNaN(s.egfr) ? -1 : gIdx(s.egfr);
    v.a = isNaN(s.uacr) ? -1 : aIdx(s.uacr);
    v.ckd = (s.egfr < 60) || (s.uacr >= 30);
    v.risiko = v.g >= 0 && v.a >= 0 ? RISIKO[v.g][v.a] : null;
    v.kontrol = v.g >= 0 && v.a >= 0 ? KONTROL[v.g][v.a] : null;
    v.kfre = kfre(s);

    // eGFR-fald
    if (!isNaN(s.egfr) && !isNaN(s.egfrFoer)) {
      v.fald = s.egfrFoer - s.egfr;
      v.faldPct = v.fald / s.egfrFoer;
      const kategoriskift = gIdx(s.egfr) > gIdx(s.egfrFoer);
      const forventet = s.med.includes("nystart") && v.faldPct <= 0.3;
      if (v.fald > 5 && forventet) v.noter.push(`eGFR faldet ${Math.round(v.fald)} (${Math.round(v.faldPct * 100)} %) efter opstart af ACE-hæmmer/ARB eller SGLT-2-hæmmer: et initialt fald på op til 30 % er forventet — gentag eGFR efter 1–3 måneder.`);
      else if (v.fald > 5 && s.egfr >= 60 && !(v.faldPct >= 0.25 && kategoriskift)) v.noter.push(`eGFR faldet ${Math.round(v.fald)} på ca. 1 år, men nyrefunktionen er normal (${Math.round(s.egfr)}): gentag eGFR — et enkelt prøvepar kan skyldes biologisk variation. Henvis ved vedvarende fald.`);
      else if (v.fald > 5 || (v.faldPct >= 0.25 && kategoriskift)) v.henvis.push(`Hurtigt fald i eGFR: ${Math.round(v.fald)} ml/min/1,73 m² (${Math.round(v.faldPct * 100)} %) på ca. 1 år${v.fald > 5 ? " — over 5 pr. år" : ""}. Udelukk først akut årsag (dehydrering, NSAID, obstruktion).`);
    }

    // Henvisning
    if (s.egfr < 15) v.henvis.unshift("eGFR under 15 (G5): hurtig henvisning — nyresvigt.");
    else if (s.egfr < 30) v.henvis.unshift("eGFR under 30 (G4).");
    if (s.uacr > 700) v.henvis.push(`UACR over 700 mg/g (DNS)${s.har("t2d") ? " — ved kendt diabetisk nyresygdom, der følges i diabetesambulatorium, kan andre grænser gælde" : ""}.`);
    else if (s.uacr >= 300) v.overvej.push("UACR 300–700 mg/g (A3): KDIGO anbefaler henvisning ved ≥ 300 mg/g; DNS ved over 700 mg/g.");
    if (v.kfre) {
      if (v.kfre.fem >= 0.05) v.henvis.push(`KFRE: ${pct(v.kfre.fem)} risiko for nyresvigt inden for 5 år (KDIGO: henvis ved 3–5 %).`);
      else if (v.kfre.fem >= 0.03) v.overvej.push(`KFRE: ${pct(v.kfre.fem)} risiko for nyresvigt inden for 5 år (KDIGO: henvis ved 3–5 %).`);
    }
    if (s.har("haematuri") && s.uacr >= 30) v.henvis.push("Vedvarende, uforklaret hæmaturi sammen med albuminuri (mistanke om glomerulonefritis).");
    else if (s.har("haematuri")) v.noter.push("Hæmaturi uden albuminuri: urologisk udredning efter alder og type (synlig hæmaturi → pakkeforløb).");
    if (s.har("resistent")) v.henvis.push("Hypertension trods 4 præparater.");
    if (s.har("arvelig") || s.har("pkd")) v.overvej.push("Arvelig nyresygdom eller polycystisk nyresygdom — henvis, hvis patienten ikke allerede følges.");
    if (s.kalium >= 6) v.henvis.unshift(`Kalium ${fmt(s.kalium)} mmol/l — akut vurdering (samme dag).`);
    else if (s.kalium > 5.5) v.overvej.push(`Kalium ${fmt(s.kalium)} mmol/l: gentag; vedvarende hyperkaliæmi er henvisningskriterium.`);

    // Behandling
    const b = v.behandling;
    // Blodtryk
    if (!isNaN(s.sbp)) {
      const over = s.sbp >= 130 || s.dbp >= 80;
      b.push({ t: `Blodtryk ${s.sbp}${isNaN(s.dbp) ? "" : "/" + s.dbp} mmHg`, s: over ? "over mål" : "i mål", tekst: `Mål under 130/80 mmHg (dansk praksis og ESC); KDIGO 2024 foreslår systolisk under 120 mmHg ved standardiseret måling, hvis det tåles.${over ? " Intensivér behandlingen — med ACE-hæmmer/ARB først ved albuminuri." : ""}` });
    }
    // RAS-blokade
    if (s.uacr >= 30) {
      if (s.med.includes("acearb")) b.push({ t: "ACE-hæmmer eller ARB", s: "fortsæt", tekst: "Fortsæt i maksimalt tolereret dosis. Kontrol af kreatinin og kalium; acceptér et eGFR-fald på op til 30 %. Pausér ved dehydrering." });
      else b.push({ t: "ACE-hæmmer eller ARB", s: "start", tekst: `${s.uacr >= 300 || s.har("t2d") ? "Anbefales" : "Foreslås"} ved albuminuri (KDIGO 2024)${s.uacr >= 300 ? " — også uden hypertension" : ""}. Titrér til maksimalt tolereret dosis; kreatinin og kalium efter 2–4 uger. Kombinér ikke ACE-hæmmer og ARB.` });
    } else if (s.har("hypertension") && !s.med.includes("acearb")) {
      b.push({ t: "ACE-hæmmer eller ARB", s: "overvej", tekst: "Ved hypertension uden albuminuri er ACE-hæmmer/ARB et godt valg, men ikke påkrævet — andre blodtrykssænkende midler kan også bruges." });
    }
    // SGLT-2-hæmmer
    if (v.ckd) {
      let sg;
      if (isNaN(s.egfr)) sg = { s: "angiv eGFR", tekst: "Indikationen afhænger af eGFR." };
      else if (s.med.includes("sglt2")) sg = { s: "fortsæt", tekst: "Fortsæt — også når eGFR falder under 20, indtil dialyse. Pausér ved akut sygdom og 3 dage før større operation." };
      else if (s.har("pkd") || s.har("immun")) sg = { s: "ikke dokumenteret", tekst: "Ikke dokumenteret ved polycystisk nyresygdom, immunsuppressiv behandling for nyresygdom eller efter nyretransplantation — konferér med nefrolog." };
      else if (s.egfr < 20) sg = { s: "start ikke", tekst: "Opstart anbefales ikke ved eGFR under 20." };
      else if (s.har("t2d") || s.har("hs") || s.uacr >= 200) sg = { s: "anbefales", tekst: `Anbefales (KDIGO 2024${s.har("t2d") ? ": type 2-diabetes og kronisk nyresygdom" : s.har("hs") ? ": hjertesvigt" : ": UACR ≥ 200 mg/g"}). Empagliflozin 10 mg (opstart fra eGFR 20) eller dapagliflozin 10 mg (opstart fra eGFR 25). Forventet initialt eGFR-fald på 3–5; genitale svampeinfektioner; sygedagsregler.` };
      else if (s.egfr < 45) sg = { s: "overvej", tekst: "Kan overvejes ved eGFR 20–45 uanset albuminuri (KDIGO 2024; DNS). Empagliflozin 10 mg eller dapagliflozin 10 mg (opstart fra eGFR 25)." };
      else sg = { s: "ikke indiceret", tekst: "Ved eGFR ≥ 45 og UACR under 200 mg/g uden diabetes eller hjertesvigt er nyregevinsten ikke dokumenteret." };
      b.push(Object.assign({ t: "SGLT-2-hæmmer" }, sg));
    }
    // Finerenon
    if (s.har("t2d") && s.uacr >= 30 && s.egfr >= 25) {
      if (s.med.includes("finerenon")) b.push({ t: "Finerenon", s: "fortsæt", tekst: "Kalium efter 4 uger og ved dosisændring; pausér ved kalium over 5,5 mmol/l." });
      else if (s.kalium > 5) b.push({ t: "Finerenon", s: "start ikke", tekst: `Kalium ${fmt(s.kalium)} mmol/l: opstart anbefales ikke ved kalium over 5,0.` });
      else if (!s.med.includes("acearb") || !s.med.includes("sglt2")) b.push({ t: "Finerenon", s: "senere", tekst: `Kan komme på tale ved fortsat albuminuri trods ACE-hæmmer/ARB i maksimalt tolereret dosis og SGLT-2-hæmmer (tilskudsklausulen kræver begge, medmindre SGLT-2-hæmmer ikke tåles eller er kontraindiceret).${!s.med.includes("sglt2") && s.med.includes("acearb") ? " Start SGLT-2-hæmmer først." : ""}` });
      else b.push({ t: "Finerenon", s: "overvej", tekst: `Type 2-diabetes med fortsat albuminuri trods ACE-hæmmer/ARB og SGLT-2-hæmmer: overvej finerenon — opstart af eller i samråd med nefrolog eller endokrinolog (klausuleret tilskud; tjek den aktuelle klausul, også eGFR-interval). ${s.egfr >= 60 ? "20 mg" : "10 mg"} dagligt${s.egfr < 60 ? " (eGFR 25–59), mål 20 mg" : ""}; kalium skal være ≤ 4,8 mmol/l (4,9–5,0: overvej med tæt kontrol).` });
    }
    // Statin
    if (v.ckd && !isNaN(s.alder)) {
      if (s.med.includes("statin")) b.push({ t: "Statin", s: "fortsæt", tekst: `Fortsæt. Samlet hjerte-kar-risiko og LDL-mål: se <a href="../hjerte/cvrisiko.html">hjerte-kar-appen</a>.` });
      else if (s.alder >= 50 && s.egfr < 60) b.push({ t: "Statin", s: "anbefales", tekst: "Anbefales til alle fra 50 år med eGFR under 60 (KDIGO 2024) — eller statin med ezetimib (påbegyndes ikke hos patienter i dialyse)." });
      else if (s.alder >= 50 || s.har("t2d") || s.har("ascvd")) b.push({ t: "Statin", s: "anbefales", tekst: `Anbefales ${s.alder >= 50 ? "fra 50 år ved kronisk nyresygdom" : "ved kronisk nyresygdom med diabetes eller hjerte-kar-sygdom"} (KDIGO 2024).` });
    }
    // NSAID
    if (s.med.includes("nsaid")) b.push({ t: "NSAID", s: "stop", tekst: "Stop NSAID — nyretoksisk, især sammen med ACE-hæmmer/ARB og diuretika. Brug paracetamol." });

    return v;
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  let last = null;

  function heatmap(v) {
    const head = `<tr><th>eGFR \\ UACR</th>${A.map((a) => `<th>${a.k}<br><small>${a.k === "A1" ? "&lt; 30" : a.k === "A2" ? "30–299" : "≥ 300"}</small></th>`).join("")}</tr>`;
    const rows = G.map((g, gi) => `<tr><th>${g.k}<br><small>${g.k === "G5" ? "&lt; 15" : g.k === "G1" ? "≥ 90" : `${g.min}–${G[gi - 1].min - 1}`}</small></th>${A.map((a, ai) => `<td class="risk-${RISIKO[gi][ai]}${gi === v.g && ai === v.a ? " aktuel" : ""}">${KONTROL[gi][ai]}</td>`).join("")}</tr>`).join("");
    return `<div class="drug-table-wrap"><table class="kdigo-map" aria-label="KDIGO-farvekort">${head}${rows}</table></div><p class="field-hint">Tal = anbefalede kontroller af eGFR og UACR pr. år (KDIGO 2024). * 1 gang årligt, hvis der er kronisk nyresygdom af anden årsag (fx strukturel). Grøn: lav, gul: moderat, orange: høj, rød: meget høj risiko.</p>`;
  }

  function update() {
    const s = getState();
    alderWarning.textContent = !isNaN(s.alder) && (s.alder < 18 || s.alder > 110) ? "Værktøjet gælder voksne — tjek alderen." : "";
    const lw = [];
    if (!isNaN(s.uacr) && s.uacr > 0 && s.uacr < 3) lw.push("UACR angives i mg/g (1 mg/mmol ≈ 8,84 mg/g) — tjek enheden.");
    if (!isNaN(s.egfr) && (s.egfr < 3 || s.egfr > 150)) lw.push("eGFR uden for plausibelt område.");
    labWarning.textContent = lw.join(" ");

    const v = vurder(s);
    last = { s, v };
    let html = "";

    if (isNaN(s.egfr) || isNaN(s.uacr)) {
      html += box("box-blue", "Angiv eGFR og UACR", `<p>Kronisk nyresygdom klassificeres ud fra både eGFR og urin-albumin/kreatinin-ratio (KDIGO).${isNaN(s.uacr) && !isNaN(s.egfr) ? " Mål UACR — albuminuri øger risikoen uafhængigt af eGFR." : ""}</p>`);
    } else if (!v.ckd) {
      html += box("box-green", `Ingen kronisk nyresygdom ud fra eGFR og albuminuri (${G[v.g].k} ${A[v.a].k})`, "<p>eGFR ≥ 60 og UACR under 30 mg/g. Kronisk nyresygdom kan stadig foreligge ved strukturelle forandringer (fx cyster, ar) eller hæmaturi af renal årsag.</p><p>Screening med eGFR og UACR årligt ved diabetes og hypertension, og ved anden risiko efter vurdering.</p>");
    } else {
      const g = G[v.g];
      const a = A[v.a];
      html += box(
        RISIKO_BOX[v.risiko],
        `${g.k} ${a.k} — ${RISIKO_TEKST[v.risiko]}`,
        `<p>eGFR ${Math.round(s.egfr)}: ${g.tekst}. UACR ${Math.round(s.uacr)} mg/g: ${a.tekst}.</p>
        ${s.bekraeftet ? "" : "<p><strong>Bekræft diagnosen:</strong> kronisk nyresygdom kræver varighed over 3 måneder — gentag eGFR og UACR (albuminuri: 2 af 3 prøver positive). Udelukk akut nyreskade.</p>"}
        <p><strong>Kontrol:</strong> eGFR og UACR ${v.kontrol.replace("*", "") + (v.kontrol.startsWith("1") ? " gang" : " gange")} om året (KDIGO 2024) — samt blodtryk, vægt og medicingennemgang.</p>
        ${heatmap(v)}`
      );
    }

    // KFRE
    if (v.kfre) {
      html += box(
        v.kfre.fem >= 0.05 ? "box-red" : v.kfre.fem >= 0.03 ? "box-amber" : "box-blue",
        "Risiko for nyresvigt (KFRE)",
        `<div class="kfre-grid"><div><span class="risk-number">${pct(v.kfre.to)}</span><br>inden for 2 år</div><div><span class="risk-number">${pct(v.kfre.fem)}</span><br>inden for 5 år</div></div>
        <p>Sandsynlighed for dialyse eller nyretransplantation (Kidney Failure Risk Equation, 4 variable: alder, køn, eGFR og UACR; kalibreret til lande uden for Nordamerika). Gælder eGFR under 60.</p>
        <p>KDIGO 2024: henvis ved 5-års risiko 3–5 %; 2-års risiko over 10 % taler for tværfaglig nyrebehandling og over 40 % for planlægning af dialyse eller transplantation.</p>`
      );
    } else if (!isNaN(s.egfr) && s.egfr < 60 && (isNaN(s.alder) || isNaN(s.uacr))) {
      html += box("box-blue", "Risiko for nyresvigt (KFRE)", "<p>Angiv alder og UACR for at beregne 2- og 5-års risiko for nyresvigt.</p>");
    }

    // Henvisning
    if (v.henvis.length || v.overvej.length) {
      html += box(v.henvis.length ? "box-red" : "box-amber", v.henvis.length ? "Henvis til nefrologisk vurdering" : "Overvej henvisning", `${v.henvis.length ? ul(v.henvis) : ""}${v.overvej.length ? `<p><strong>Overvej:</strong></p>${ul(v.overvej)}` : ""}<p>Regionernes forløbsbeskrivelser har forskellige grænser (fx eGFR under 30 eller 40) — følg din regions.</p>`);
    } else if (v.ckd) {
      html += box("box-green", "Ingen henvisningskriterier opfyldt", "<p>Fortsæt kontrol og behandling i almen praksis.</p>");
    }

    // Behandling
    if (v.behandling.length) {
      html += box("box-green", "Nyrebeskyttende behandling", ul(v.behandling.map((x) => `<strong>${x.t}</strong> <span class="tag ${/start|anbefales|stop|over mål/.test(x.s) ? "tag-warn" : /overvej|angiv|senere/.test(x.s) ? "tag-alt" : "tag-recommend"}">${x.s}</span> — ${x.tekst}`)));
    }
    if (v.noter.length) html += box("box-blue", "Bemærk", ul(v.noter));

    if (v.ckd || (!isNaN(s.egfr) && s.egfr < 60)) {
      html += collapsible(
        "box-blue",
        "Øvrige tiltag",
        ul([
          "<strong>Undgå NSAID</strong> og andre nyretoksiske midler; dosisjustér lægemidler efter nyrefunktionen — se <a href=\"dosis.html\">dosis efter nyrefunktion</a>.",
          "<strong>Sygedagsregler:</strong> pausér ACE-hæmmer/ARB, SGLT-2-hæmmer, metformin og diuretika ved opkastning, diarré eller feber med dehydrering.",
          "<strong>Livsstil:</strong> salt under 5 g om dagen, protein ca. 0,8 g/kg/døgn ved G3–G5 (undgå højt proteinindtag), rygestop, vægttab og motion.",
          "<strong>Vaccination:</strong> influenza og covid-19 årligt, pneumokok; hepatitis B før dialyse.",
          "<strong>G4–G5:</strong> hæmoglobin, bikarbonat, calcium, fosfat og PTH — typisk i nefrologisk regi.",
          "Kontrastundersøgelser: vurder risikoen ved eGFR under 30, og sørg for hydrering.",
        ])
      );
    }
    html += `<p class="source-note">KDIGO 2024, Dansk Nefrologisk Selskab 2024 og regionale forløbsbeskrivelser. Kontrollér præparater og dosis på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`;
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------

  function buildJournalNote() {
    const { s, v } = last;
    const lines = [`Nyrefunktion — vurdering ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    basis.push(s.koen);
    if (!isNaN(s.egfr)) basis.push(`eGFR ${Math.round(s.egfr)}${isNaN(s.egfrFoer) ? "" : ` (for ca. 1 år siden ${Math.round(s.egfrFoer)})`}`);
    if (!isNaN(s.uacr)) basis.push(`UACR ${Math.round(s.uacr)} mg/g`);
    if (!isNaN(s.sbp)) basis.push(`BT ${s.sbp}${isNaN(s.dbp) ? "" : "/" + s.dbp}`);
    if (!isNaN(s.kalium)) basis.push(`K ${fmt(s.kalium)}`);
    lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    if (v.g >= 0 && v.a >= 0) {
      lines.push(v.ckd ? `Kronisk nyresygdom ${G[v.g].k} ${A[v.a].k} (${RISIKO_TEKST[v.risiko]})${s.bekraeftet ? "" : " — ikke bekræftet over 3 måneder"}. Kontrol ${v.kontrol.replace("*", "")} gang(e) årligt.` : `Ingen kronisk nyresygdom ud fra eGFR og UACR (${G[v.g].k} ${A[v.a].k}).`);
    }
    if (v.kfre) lines.push(`KFRE: ${pct(v.kfre.to)} (2 år) og ${pct(v.kfre.fem)} (5 år) risiko for nyresvigt.`);
    if (v.henvis.length) lines.push(`Henvisning til nefrolog: ${v.henvis.map((h) => h.replace(/<[^>]+>/g, "")).join(" ")}`);
    else if (v.overvej.length) lines.push(`Overvej henvisning: ${v.overvej.join(" ")}`);
    const plan = v.behandling.filter((x) => !/ikke indiceret|ikke dokumenteret|start ikke|fortsæt|i mål|angiv/.test(x.s)).map((x) => `${x.t} (${x.s})`);
    const fortsaet = v.behandling.filter((x) => x.s === "fortsæt").map((x) => x.t);
    if (plan.length) lines.push(`Plan (tilpas): ${plan.join("; ")}.`);
    if (fortsaet.length) lines.push(`Fortsætter: ${fortsaet.join(", ")}.`);
    lines.push("Undgå NSAID; sygedagsregler gennemgået.");
    return lines.join("\n");
  }

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .kfre-grid, :scope > details > ul").forEach((el) => {
        if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else lines.push(el.textContent.trim().replace(/\s+/g, " "));
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  // ---------------------------------------------------------------------
  // Udfyld fra journaltekst (../udfyld.js)
  // ---------------------------------------------------------------------

  if (window.Udfyld) {
    const chk = (name, value, r, label) => (r && r.status === "ja" ? { type: "check", name, value, on: true, label, kilde: r.kilde } : null);
    // Lægemidler (generiske navne og hyppige handelsnavne).
    const MED = {
      acearb: "ace-?hæmmer|angiotensin|arb" + "(?![a-zæøå])|enalapril|lisinopril|ramipril|perindopril|captopril|trandolapril|losartan|candesartan|valsartan|irbesartan|telmisartan|olmesartan|cozaar|atacand|diovan|aprovel|micardis|triatec|coversyl|exforge|olmetec|sevikar|renitec|zestril|quinapril|fosinopril",
      sglt2: "sglt-?2|empagliflozin|dapagliflozin|canagliflozin|ertugliflozin|jardiance|forxiga|synjardy|xigduo",
      statin: "statin|atorvastatin|simvastatin|rosuvastatin|pravastatin|fluvastatin|lipitor|zarator|crestor|zocor",
      finerenon: "finerenon|kerendia",
      nsaid: "nsaid|ibuprofen|naproxen|diclofenac|etoricoxib|celecoxib|ipren|ibumetin|voltaren|arcoxia|celebra|diclon|confortid|bonyl|brufen|nurofen|ibumax|meloxicam|ketoprofen",
    };
    Udfyld.init(
      (L) => {
        const u = [];
        const a = L.alder();
        if (a) u.push({ type: "num", id: "alder", v: a.v, label: "Alder (år)", kilde: a.kilde });
        const k = L.koen();
        if (k) u.push({ type: "radio", name: "koen", value: k.v, label: "Køn", kilde: k.kilde });
        // UACR først, så "albumin/kreatinin" ikke læses som kreatinin.
        const ua = L.uacr();
        if (ua) u.push({ type: "num", id: "uacr", v: ua.v, label: "UACR (mg/g)", kilde: ua.kilde, note: ua.note || (ua.op ? `angivet som ${ua.op} ${ua.v}` : "") });
        // eGFR: "faldet fra 52 til 44", årstal, "tidligere"/"for et år siden".
        const { nu, foer } = L.egfrTid();
        if (nu) u.push({ type: "num", id: "egfr", v: nu.v, label: "eGFR nu", kilde: nu.kilde, note: nu.note || (nu.op ? `angivet som ${nu.op} ${nu.v}` : "") });
        if (foer) u.push({ type: "num", id: "egfrFoer", v: foer.v, label: "eGFR tidligere", kilde: foer.kilde, note: "kontrollér, at den tidligere værdi er fra ca. 1 år siden" });
        const bt = L.bt();
        if (bt) {
          u.push({ type: "num", id: "sbp", v: bt.s, label: "Systolisk BT", kilde: bt.kilde });
          u.push({ type: "num", id: "dbp", v: bt.d, label: "Diastolisk BT", kilde: bt.kilde });
        }
        const kal = L.kalium();
        if (kal) u.push({ type: "num", id: "kalium", v: kal.v, label: "Kalium", kilde: kal.kilde });
        // Sygdomme
        const F = { familie: true };
        const t1 = L.term(`type 1-diabetes|type 1 diabetes|t1d${L.E}|dm1|dm type 1|diabetes (?:mellitus )?type 1|lada${L.E}`, F);
        // "Diabetes" alene tolkes som type 2 — men ikke screening, insipidus eller graviditetsdiabetes.
        const t2 = L.term(`type 2-diabetes|type 2 diabetes|t2d${L.E}|dm2|dm type 2|diabetes (?:mellitus )?type 2|niddm|diabetiker|diabetisk nefropati|diabetes(?!\\s*(?:insipidus|type 1|mellitus type 1|-?screening))(?![a-zæøå])`, F);
        const ikkeT2 = (r) => r.status === "ja" && /screen|udelukke|insipidus|gestationel|graviditetsdiabetes|tidligere graviditet/i.test(L.leddet(r.index));
        if (t2.status === "ja" && t1.status !== "ja" && !ikkeT2(t2)) {
          u.push(chk("syg", "t2d", t2, "Type 2-diabetes"));
          if (!/type 2|t2d|dm2/i.test(t2.kilde)) u.push({ type: "note", tekst: `"Diabetes" er tolket som type 2-diabetes ("${t2.kilde}").` });
        } else if (t1.status === "ja") u.push({ type: "note", tekst: "Type 1-diabetes nævnt — værktøjets diabetesråd gælder type 2." });
        u.push(chk("syg", "hypertension", L.term(`hypertension|forhøjet blodtryk|hypertoni|aht${L.E}|ht${L.E}(?=\\s*(?:i beh|behandl|,|\\.|$))|essentiel hypertension`, F), "Hypertension"));
        u.push(chk("syg", "hs", L.term("hjertesvigt|hfref|hfpef|hjerteinsufficiens", F), "Hjertesvigt"));
        u.push(chk("syg", "ascvd", L.term(`iskæmisk hjertesygdom|ihs${L.E}|ami${L.E}|blodprop i (?:hjertet|hjernen)|myokardieinfarkt|apopleksi|tci${L.E}|perifer arteriesygdom|perifer arteriel insufficiens|pai${L.E}|claudicatio|pci${L.E}|cabg|(?:koronar|hjerte-?)bypass|stent`, F), "Hjerte-kar-sygdom"));
        u.push(chk("syg", "pkd", L.term(`polycystisk\\w*\\s+nyre\\w*|cystenyre\\w*|adpkd`, F), "Polycystisk nyresygdom"));
        u.push(chk("syg", "immun", L.term("nyretransplant|transplanteret|immunsuppr", F), "Immunsuppression/transplanteret"));
        u.push(chk("syg", "haematuri", L.term("hæmaturi|blod i urinen|stix[^.;\\n]{0,20}blod\\s*[:=]?\\s*(?:\\+|[1-4]\\s*\\+|pos)|erytrocytter i urinen", F), "Hæmaturi"));
        u.push(chk("syg", "arvelig", L.term("arvelig nyresygdom|familiær nyresygdom|nyresygdom i familien"), "Arvelig nyresygdom"));
        u.push(chk("syg", "resistent", L.term("behandlingsresistent hypertension|resistent hypertension|(?:4|fire|5|fem) (?:blodtrykspræparater|antihypertensiva|præparater)|trods (?:4|fire|5|fem) (?:præparater|blodtrykspræparater)"), "Resistent hypertension"));
        for (const [key, monster] of Object.entries(MED)) {
          const label = { acearb: "ACE-hæmmer/ARB", sglt2: "SGLT-2-hæmmer", statin: "Statin", finerenon: "Finerenon", nsaid: "NSAID" }[key];
          // "Tidligere Ipren, er stoppet" / "SGLT2-hæmmer overvejes": ikke aktuel behandling.
          // Mindst én aktuel omtale: kun ordets eget led (til komma/parentes), fx
          // "Ramipril 10 mg (tidligere losartan, stoppet)" → ramipril tæller.
          const r = L.term(monster);
          const lokalt = (f) => {
            const i = f.m.index;
            return L.lav.slice(Math.max(0, i - 25), i).split(/[,;.(\n]/).pop() + L.lav.slice(i, i + 50).split(/[,;.()\n]/)[0];
          };
          const aktuel = r.status === "ja" && r.fund.find((f) => f.k === "ja" && !/tidligere|stoppet|seponeret|pauseret|overvej|frarådes|undgå/.test(lokalt(f)));
          if (aktuel) u.push({ type: "check", name: "med", value: key, on: true, label, kilde: L.kilde(aktuel.m.index, aktuel.m.index + aktuel.m[0].length) });
        }
        if (L.term("nyligt startet|nystartet|startet (?:for|op|på|i|med)|opstartet|påbegyndt|sat i behandling med").status === "ja") u.push({ type: "note", tekst: 'Nylig opstart af medicin nævnt — markér "startet inden for 3 måneder", hvis det gælder ACE-hæmmer/ARB eller SGLT-2-hæmmer.' });
        if (L.term("bekræftet|vedvarende|over 3 måneder|gentagne målinger").status === "ja") u.push({ type: "note", tekst: 'Teksten nævner bekræftet/vedvarende fund — markér selv "bekræftet over mindst 3 måneder", hvis det er rigtigt.' });
        return u;
      },
      { vigtige: [["alder", "alder"], ["egfr", "eGFR"], ["uacr", "UACR"], ["koen", "køn"]], eksempel: "Fx: 68-årig mand med type 2-diabetes og hypertension. eGFR faldet fra 52 til 44, UACR 180 mg/g. BT 142/84, kalium 4,6. Metformin, ramipril og atorvastatin." }
    );
  }

  update();
})();
