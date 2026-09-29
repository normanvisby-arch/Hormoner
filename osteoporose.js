/*
 * Beslutningsstøtte for osteoporose i almen praksis.
 * Bygget på DSAM's kliniske vejledning (2024), Dansk Endokrinologisk Selskabs
 * NBV (2025, inkl. glukokortikoid-induceret osteoporose), Medicinrådets
 * basisliste og produktresuméernes nyregrænser. Præparatnavne og tilskud skal
 * verificeres på pro.medicin.dk.
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  // Lægens valg af behandling til journalnotatet (valg.js).
  const valg = Behandlingsvalg(output);
  const copyBtn = document.getElementById("copyBtn");
  const copyFullBtn = document.getElementById("copyFullBtn");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");
  const alderInput = document.getElementById("alder");
  const alderWarning = document.getElementById("alderWarning");
  const tInput = document.getElementById("tscore");
  const printMeta = document.getElementById("printMeta");

  const KLIMAKTERIE_URL = "index.html";
  const FRAKTUR_URL = "fraktur.html";
  const PLAN_URL = "osteoplan.html";

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
  window.addEventListener("beforeprint", () => {
    output.querySelectorAll("details").forEach((d) => (d.open = true));
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    valg.nulstil();
    // form.reset() does not fire "input"/"change", so re-sync dependent UI.
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
    alderWarning.textContent = raw !== "" && (isNaN(v) || v < 18 || v > 110) ? "Alder virker usædvanlig — tjek indtastningen." : "";
  }
  alderInput.addEventListener("input", checkAlderRange);

  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

  function getState() {
    const dxa = radio("dxa");
    tInput.disabled = dxa !== "ja";
    const tRaw = tInput.value.replace(",", ".");
    const eRaw = document.getElementById("egfr").value;
    return {
      gruppe: radio("gruppe"),
      alder: parseInt(alderInput.value, 10),
      brud: checked("brud"),
      dxa,
      // Empty fields stay NaN so they fail every threshold comparison.
      t: dxa === "ja" && tRaw !== "" ? parseFloat(tRaw) : NaN,
      rf: checked("rf"),
      egfr: eRaw === "" ? NaN : parseFloat(eRaw),
      forhold: checked("forhold"),
    };
  }

  const RF_LABELS = {
    prednisolon: "prednisolon ≥ 5 mg i ≥ 3 mdr.",
    aromatase: "aromatasehæmmer",
    tidligmeno: "menopause før 45 år",
    lavbmi: "BMI < 19 / vægttab",
    ryger: "rygning",
    alkohol: "stort alkoholforbrug",
    arv: "hoftebrud hos forælder",
    fald: "faldtendens",
    sekundaer: "sygdom med øget risiko",
  };
  const BRUD_LABELS = {
    hofte: "hoftebrud",
    ryg: "sammenfald i ryggen",
    ryg2: "≥ 2 sammenfald i ryggen",
    rygny: "nyt sammenfald i ryggen (< 3 år)",
    andet: "andet lavenergibrud",
  };

  const has = (list, k) => list.includes(k);
  const tKendt = (s) => !isNaN(s.t);
  const egfrKendt = (s) => !isNaN(s.egfr);
  const fmt = (n) => String(n).replace(".", ",");
  const rygBrud = (s) => has(s.brud, "ryg") || has(s.brud, "ryg2") || has(s.brud, "rygny");
  const centralBrud = (s) => has(s.brud, "hofte") || rygBrud(s);
  const prednisolon = (s) => has(s.rf, "prednisolon");
  // Meget høj risiko jf. tilskudskriterierne for anabol behandling (teriparatid).
  const megetHoejRisiko = (s) => has(s.brud, "ryg2") || (has(s.brud, "rygny") && tKendt(s) && s.t <= -3.0);

  // ---------------------------------------------------------------------
  // Indikation
  // ---------------------------------------------------------------------

  function indikation(s) {
    const r = [];
    if (centralBrud(s)) {
      r.push(`Lavenergibrud i ${has(s.brud, "hofte") ? "hoften" : "ryggen"} er diagnostisk for osteoporose — behandling er indiceret uanset T-score.`);
      return { status: "behandling", r };
    }
    if (tKendt(s)) {
      const rfN = s.rf.length + (has(s.brud, "andet") ? 1 : 0);
      if (s.t <= -4.0) {
        r.push(`T-score ${fmt(s.t)} (≤ −4,0) — behandling er indiceret, også uden andre risikofaktorer.`);
        return { status: "behandling", r };
      }
      if (s.t <= -2.5 && rfN > 0) {
        r.push(`T-score ${fmt(s.t)} (≤ −2,5) med mindst én risikofaktor${has(s.brud, "andet") ? " (inkl. tidligere lavenergibrud)" : ""}.`);
        return { status: "behandling", r };
      }
      if (prednisolon(s) && s.t <= -1.0) {
        r.push(`Prednisolon ≥ 5 mg i ≥ 3 måneder og T-score ${fmt(s.t)} (≤ −1,0) — DES anbefaler ved glukokortikoidbehandling behandling allerede ved T-score ≤ −1,0 (særligt ved høj dosis; tjek dosisgrænsen i DES' NBV).`);
        return { status: "behandling", r };
      }
      if (s.t <= -2.5) {
        r.push(`T-score ${fmt(s.t)} (≤ −2,5), men ingen markerede risikofaktorer. Høj alder, faldtendens eller andre forhold kan tale for behandling — beregn 10-års frakturrisiko med FRAX.`);
        return { status: "individuel", r };
      }
      if (s.t <= -1.0 && has(s.brud, "andet")) {
        r.push(`Osteopeni (T-score ${fmt(s.t)}) og tidligere lavenergibrud uden for hofte og ryg — beregn FRAX og vurdér individuelt.`);
        return { status: "individuel", r };
      }
      r.push(s.t <= -1.0 ? `Osteopeni (T-score ${fmt(s.t)}) uden brud — ingen indikation for medicinsk behandling.` : `Normal knogletæthed (T-score ${fmt(s.t)}).`);
      return { status: "ingen", r };
    }
    // Ingen DXA endnu: afgør om der er indikation for skanning.
    const tunge = [prednisolon(s) && "prednisolon ≥ 5 mg i ≥ 3 mdr.", has(s.rf, "aromatase") && "opstart af aromatasehæmmer", has(s.brud, "andet") && "lavenergibrud efter 50 år"].filter(Boolean);
    const oevrige = s.rf.filter((k) => k !== "prednisolon" && k !== "aromatase");
    if (tunge.length) {
      r.push(`DXA er indiceret pga. ${tunge.join(" og ")}.`);
      return { status: "dxa", r };
    }
    if (oevrige.length >= 2) {
      r.push(`DXA er indiceret: ${oevrige.length} risikofaktorer (${oevrige.map((k) => RF_LABELS[k]).join(", ")}).`);
      return { status: "dxa", r };
    }
    r.push(oevrige.length === 1 ? `Kun én risikofaktor (${RF_LABELS[oevrige[0]]}) — DXA er ikke indiceret alene på den baggrund.` : "Ingen markerede risikofaktorer eller brud.");
    return { status: "dxa-ikke", r };
  }

  // ---------------------------------------------------------------------
  // Præparatvalg
  // ---------------------------------------------------------------------

  const P = {
    alendronat: { navn: "Alendronat", indhold: "Bisfosfonat, tablet 70 mg (generelt tilskud)", dosering: "1 tablet ugentligt, fastende med et glas vand; sid/stå oprejst og vent 30 min. før mad, drikke og anden medicin." },
    risedronat: { navn: "Risedronat", indhold: "Bisfosfonat, tablet 35 mg (klausuleret tilskud)", dosering: "1 tablet ugentligt efter samme regler som alendronat. Kan bruges ned til eGFR 30." },
    zoledronsyre: { navn: "Zoledronsyre (Aclasta)", indhold: "Bisfosfonat, infusion 5 mg", dosering: "1 infusion årligt, typisk i 3 år — gives oftest i hospitalsregi. Kræver eGFR ≥ 35 og normalt calcium/D-vitamin. Influenzalignende reaktion efter første infusion er hyppig." },
    denosumab: { navn: "Denosumab (Prolia)", indhold: "Antistof, injektion 60 mg s.c. (klausuleret tilskud)", dosering: "Hver 6. måned — aldrig mere end 7 måneder imellem. Må aldrig stoppes uden efterbehandling (zoledronsyre 6 mdr. efter sidste injektion). Calcium før hver injektion." },
  };
  const row = (p, tag, tagClass) => Object.assign({ key: p }, P[p], { tag, tagClass });

  function praeparatValg(s) {
    const notes = [];
    const oralNej = has(s.forhold, "oraluegnet") || has(s.forhold, "oralbivirk");
    let rows;
    let primaer;
    if (egfrKendt(s) && s.egfr < 30) {
      return { specialist: true, rows: [], primaer: null, notes: [`eGFR ${fmt(s.egfr)}: bisfosfonater er kontraindicerede, og renal osteodystrofi skal udelukkes — behandling er en specialistopgave.`] };
    }
    if (egfrKendt(s) && s.egfr < 35) {
      notes.push(`eGFR ${fmt(s.egfr)}: alendronat og zoledronsyre bruges ikke under 35. Risedronat kan bruges ned til 30; denosumab er uafhængig af nyrefunktionen, men giver større risiko for lavt calcium.`);
      rows = oralNej
        ? [row("denosumab", "Anbefalet", "tag-recommend"), row("risedronat", "Alternativ")]
        : [row("risedronat", "Anbefalet", "tag-recommend"), row("denosumab", "Alternativ")];
      primaer = oralNej ? "denosumab" : "risedronat";
    } else if (oralNej) {
      notes.push("Tabletter er uegnede eller tåles ikke — zoledronsyre er 2. valg og denosumab 3. valg (DSAM).");
      rows = [row("zoledronsyre", "2. valg", "tag-recommend"), row("denosumab", "3. valg")];
      primaer = "zoledronsyre";
    } else {
      rows = [row("alendronat", "1. valg", "tag-recommend"), row("risedronat", "Ligeværdigt alternativ"), row("zoledronsyre", "2. valg ved problemer med tabletter"), row("denosumab", "3. valg")];
      primaer = "alendronat";
    }
    if (!egfrKendt(s)) notes.push("Mål eGFR før opstart — alendronat og zoledronsyre bruges ikke ved eGFR under 35.");
    if (s.gruppe === "kvinde" && has(s.forhold, "klimakteriegener") && !has(s.rf, "aromatase") && !(!isNaN(s.alder) && s.alder >= 60)) {
      rows.push({ key: "mht", navn: "Hormonbehandling (MHT)", indhold: "Østrogen ± gestagen", dosering: `Forebygger brud og kan være førstevalg hos kvinder under 60 år med generende gener — se <a href="${KLIMAKTERIE_URL}" target="_blank" rel="noopener">Klimakterieguiden</a>.`, tag: "Ved klimakterielle gener" });
    }
    if (has(s.rf, "aromatase")) notes.push("Aromatasehæmmer: koordinér med onkologisk afdeling (DBCG). MHT er kontraindiceret.");
    if (prednisolon(s)) notes.push("Glukokortikoid: bisfosfonat er førstevalg; fortsæt behandlingen, så længe prednisolonbehandlingen varer.");
    return { specialist: false, rows, primaer, notes };
  }

  // ---------------------------------------------------------------------
  // Tekstbokse
  // ---------------------------------------------------------------------

  function box(cls, title, body) {
    return `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  }
  function collapsibleBox(cls, title, body) {
    return `<div class="box ${cls} box-collapsible"><details><summary><h3>${title}</h3></summary>${body}</details></div>`;
  }
  function drugTable(rows) {
    const h = ["Præparat", "Type", "Dosering og forhold"];
    return `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows
      .map((r) => `<tr><td>${r.navn}${r.tag ? `<span class="tag ${r.tagClass || "tag-alt"}">${r.tag}</span>` : ""}${r.key ? valg.radio(r.key) : ""}</td><td data-label="${h[1]}">${r.indhold}</td><td data-label="${h[2]}">${r.dosering}</td></tr>`)
      .join("")}</tbody></table></div>`;
  }

  const STATUS_BOX = {
    behandling: ["box-green", "Medicinsk behandling er indiceret"],
    individuel: ["box-amber", "Individuel vurdering — beregn frakturrisiko"],
    ingen: ["box-blue", "Ingen indikation for medicinsk behandling"],
    dxa: ["box-amber", "Henvis til DXA-skanning"],
    "dxa-ikke": ["box-blue", "DXA er ikke indiceret ud fra de markerede oplysninger"],
  };

  function statusBox(s, ind) {
    const [cls, title] = STATUS_BOX[ind.status];
    let extra = "";
    if (ind.status === "behandling" && !tKendt(s)) extra += "<p>DXA før opstart som udgangspunkt (til sammenligning ved senere revurdering) — men behandlingen bør ikke udsættes unødigt efter hofte- eller rygbrud.</p>";
    if (ind.status === "individuel") extra += `<p>Brug <a href="${FRAKTUR_URL}" target="_blank" rel="noopener">Frakturrisiko og NNT</a> med patientens FRAX-resultat til den fælles beslutning.</p>`;
    if (ind.status === "dxa") extra += "<p>Henvis kun, hvis patienten vil overveje behandling ved et positivt fund (DSAM). Screening af raske uden risikofaktorer anbefales ikke.</p>";
    if (ind.status === "dxa" && has(s.rf, "aromatase")) extra += "<p>Ved opstart af aromatasehæmmer tager onkologisk afdeling typisk initiativ til DXA og evt. knoglebeskyttende behandling (DBCG).</p>";
    if (ind.status === "ingen" && prednisolon(s)) extra += "<p>Fortsætter prednisolonbehandlingen: ny DXA efter 6–12 måneder (DES).</p>";
    if (ind.status === "ingen" || ind.status === "dxa-ikke") extra += "<p>Fokus på forebyggelse: calcium og D-vitamin, fysisk aktivitet, faldforebyggelse, rygestop og moderat alkohol. Ny vurdering ved nye brud eller risikofaktorer.</p>";
    return box(cls, title, `<ul>${ind.r.map((x) => `<li>${x}</li>`).join("")}</ul>${extra}`);
  }

  function specialistBox(s, valg) {
    const items = [];
    if (s.gruppe === "ung") items.push("<strong>Præmenopausal kvinde eller mand under 60 år:</strong> sekundær årsag skal udredes, og behandlingen er en specialistopgave — henvis til endokrinolog.");
    if (megetHoejRisiko(s)) items.push(`<strong>Meget høj frakturrisiko</strong> (${has(s.brud, "ryg2") ? "≥ 2 sammenfald i ryggen" : "nyt sammenfald i ryggen og T-score ≤ −3,0"}): henvis mhp. anabol behandling (teriparatid eller romosozumab), som kun kan ordineres af speciallæger. Start evt. antiresorptiv behandling efter aftale.`);
    if (valg && valg.specialist) items.push(`<strong>Nedsat nyrefunktion:</strong> ${valg.notes[0]}`);
    if (!items.length) return "";
    return box("box-red", "Henvis til specialist", `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  }

  function foerOpstartBox(s) {
    const proever = "hæmoglobin, leukocytter, trombocytter, CRP, kreatinin/eGFR, calcium (ioniseret eller albuminkorrigeret), PTH, 25-OH-D-vitamin, basisk fosfatase, ALAT og TSH";
    const items = [
      `<strong>Blodprøver:</strong> ${proever}${rygBrud(s) ? "; <strong>M-komponent</strong> (myelomatose) ved brud i ryggen" : ""}${s.gruppe === "mand" ? "; <strong>testosteron</strong> hos mænd" : ""}.`,
      "<strong>Korrigér D-vitaminmangel og lavt calcium før opstart</strong> — især før zoledronsyre og denosumab, som ellers kan give symptomatisk lavt calcium.",
      `<strong>Tandstatus:</strong> ${has(s.forhold, "tand") ? "tandlægeundersøgelse og nødvendig tandbehandling <em>før</em> opstart (markeret dårlig tandstatus/planlagt tandkirurgi)" : "tandlæge før opstart ved dårlig tandstatus eller manglende tandlægekontakt"}. Risikoen for kæbenekrose er meget lille ved osteoporosedoser, men størst ved dårlig tandstatus.`,
    ];
    if (!tKendt(s)) items.push("<strong>DXA</strong> før opstart som udgangspunkt for senere revurdering.");
    items.push("<strong>Knoglemarkører:</strong> DSAM (2024) anbefaler P1NP/CTX før og ca. 3 måneder efter opstart af alendronat for at vurdere effekt og adhærens — endnu ikke tilgængeligt alle steder.");
    return box("box-blue", "Før opstart", `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  }

  function calciumBox(s) {
    return box(
      "box-blue",
      "Calcium og D-vitamin",
      `<p>Samlet <strong>1.000–1.200 mg calcium dagligt</strong> (kost + tilskud) og <strong>20 mikrogram D-vitamin</strong> (800 IE) — giv kun det calciumtilskud, kosten mangler. Medicinrådet anbefaler 25-OH-D på 70–125 nmol/l ved osteoporose.${has(s.forhold, "dmangel") ? " <strong>Markeret D-vitaminmangel/lavt calcium:</strong> korrigér og kontrollér før opstart." : ""}</p>`
    );
  }

  function alendronatBox() {
    return box(
      "box-blue",
      "Sådan tages alendronat",
      `<ul class="followup-list">
        <li>Om morgenen, fastende, med et stort glas postevand (ikke mineralvand, kaffe eller juice).</li>
        <li>Sid eller stå oprejst, og vent mindst 30 minutter før mad, drikke, calcium og anden medicin.</li>
        <li>Glemt dosis: tag den næste morgen, og fortsæt på den faste ugedag. Aldrig to tabletter samme dag.</li>
        <li>Stop og kontakt lægen ved synkesmerter, halsbrand eller smerter bag brystbenet.</li>
      </ul>`
    );
  }

  function denosumabBox() {
    return box(
      "box-red",
      "Denosumab må ikke stoppes uden plan",
      `<p>Ved ophør eller forsinket injektion stiger knogleomsætningen kraftigt, og der er risiko for <strong>multiple sammenfald i ryggen</strong> inden for 1–2 år. Giv injektionen hver 6. måned (højst 7 måneder imellem).</p>
      <p><strong>Ved ophør:</strong> zoledronsyre 6 måneder efter sidste injektion (eller alendronat i mindst 12 måneder), gerne efter aftale med knogleklinik (DSAM, ECTS 2021).</p>`
    );
  }

  function varighedBox(valg) {
    return box(
      "box-blue",
      "Varighed og revurdering",
      `<ul class="followup-list">
        <li><strong>Alendronat/risedronat:</strong> revurdér efter 5 år med DXA. Pause kan overvejes, hvis T-score i hoften er over −2,5, og der ikke er kommet nye brud under behandlingen (og ikke fortsat prednisolon) — ellers fortsæt op til 10 år.</li>
        <li><strong>Zoledronsyre:</strong> revurdér efter 3 år (3 infusioner) efter samme kriterier — ellers op til 6 år.</li>
        <li><strong>Under pause:</strong> ny DXA efter 1–2 år; genoptag ved nyt brud, faldende knogletæthed eller T-score ≤ −2,5.</li>
        <li><strong>Denosumab:</strong> ingen pause — ophør kræver efterbehandling.</li>
      </ul>
      <p>Datoer for kontroller, revurdering og injektioner: se <a href="${PLAN_URL}" target="_blank" rel="noopener">Opfølgningsplanen</a>.</p>`
    );
  }

  function livsstilBox(s) {
    const items = [
      "<strong>Fysisk aktivitet</strong> med belastning, styrke- og balancetræning.",
      `<strong>Faldforebyggelse:</strong> gennemgå medicin (sovemedicin, psykofarmaka, blodtrykssænkende), syn og hjemmets indretning${has(s.rf, "fald") ? " — henvis evt. til faldklinik/fysioterapi (markeret faldtendens)" : ""}.`,
    ];
    if (has(s.rf, "ryger")) items.push("<strong>Rygestop</strong> — rygning øger risikoen for brud.");
    if (has(s.rf, "alkohol")) items.push("<strong>Alkohol:</strong> højst 10 genstande om ugen (Sundhedsstyrelsen).");
    if (has(s.rf, "lavbmi")) items.push("<strong>Ernæring:</strong> tilstrækkeligt protein- og energiindtag ved lav vægt.");
    return collapsibleBox("box-blue", "Livsstil og faldforebyggelse", `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  }

  function sourceNote() {
    return `<p class="source-note">Præparater, tilskud og nyregrænser skal verificeres på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>. Behandlingsindikation og præparatvalg afgøres sammen med patienten (DSAM).</p>`;
  }

  // ---------------------------------------------------------------------
  // Beslutningslogik
  // ---------------------------------------------------------------------

  let lastInd = null;
  let lastValg = null;

  function update() {
    const s = getState();
    const ind = indikation(s);
    lastInd = ind;
    lastValg = null;
    let html = "";

    if (s.gruppe === "ung") {
      html += specialistBox(s, null) + statusBox(s, ind) + foerOpstartBox(s);
      output.innerHTML = html + sourceNote();
      return;
    }

    html += statusBox(s, ind);
    if (ind.status === "behandling" || ind.status === "individuel") {
      const pv = praeparatValg(s);
      lastValg = pv;
      html += specialistBox(s, pv);
      if (!pv.specialist) {
        html += box(
          ind.status === "behandling" ? "box-green" : "box-amber",
          ind.status === "behandling" ? "Valg af præparat" : "Hvis der vælges behandling",
          `${pv.notes.map((n) => `<p>${n}</p>`).join("")}${drugTable(pv.rows)}
          <p class="valg-ingen">${valg.radio("ingen", "Ingen medicinsk behandling — fravalgt efter drøftelse (til journal)")}</p>`
        );
      }
      html += foerOpstartBox(s);
      if (pv.primaer === "alendronat" || pv.primaer === "risedronat") html += alendronatBox();
      // Only warn prominently when denosumab is a realistic choice, not a distant 3rd option.
      if (pv.primaer && pv.primaer !== "alendronat" && pv.rows.some((r) => r.navn.startsWith("Denosumab"))) html += denosumabBox();
      html += calciumBox(s) + varighedBox(pv);
    } else {
      html += specialistBox(s, null);
      html += calciumBox(s);
    }
    html += livsstilBox(s);
    output.innerHTML = html + sourceNote();
  }

  // ---------------------------------------------------------------------
  // Journaltekst
  // ---------------------------------------------------------------------

  function buildJournalNote() {
    const s = getState();
    const lines = [`Osteoporose — vurdering ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [{ kvinde: "postmenopausal kvinde", mand: "mand ≥ 60 år", ung: "præmenopausal kvinde/mand < 60 år" }[s.gruppe]];
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    basis.push(tKendt(s) ? `laveste T-score ${fmt(s.t)}` : "DXA ikke foretaget");
    if (egfrKendt(s)) basis.push(`eGFR ${fmt(s.egfr)}`);
    lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    lines.push(`Lavenergibrud: ${s.brud.length ? s.brud.map((k) => BRUD_LABELS[k]).join(", ") : "ingen"}.`);
    lines.push(`Risikofaktorer: ${s.rf.length ? s.rf.map((k) => RF_LABELS[k]).join(", ") : "ingen markeret"}.`);
    const heading = output.querySelector(".box h3");
    if (heading) lines.push(`Vurdering: ${heading.textContent.trim()}. ${lastInd.r.join(" ")}`);
    // Lægens valg i tabellen har forrang for værktøjets førstevalg.
    const v = lastValg && valg.valgt;
    const p = v && P[v] ? v : lastValg && !v ? lastValg.primaer : null;
    if (v === "ingen") lines.push("Medicinsk behandling fravalgt efter drøftelse med patienten (angiv begrundelse). Calcium og D-vitamin efter behov, faldforebyggelse og fysisk aktivitet.");
    else if (v === "mht") lines.push("Plan (tilpas): hormonbehandling (MHT) — se klimakterievurdering. Calcium og D-vitamin efter behov.");
    else if (p) lines.push(`${v ? "Valgt behandling" : "Plan (tilpas)"}: ${P[p].navn} — ${P[p].dosering} Calcium og D-vitamin. Blodprøver og tandstatus før opstart. Revurdering efter ${p === "zoledronsyre" ? "3" : "5"} år${p === "denosumab" ? " — denosumab stoppes ikke uden efterbehandling" : ""}.`);
    return lines.join("\n");
  }

  // Keeps the tag ("1. valg") apart from the drug name in the plain-text copy.
  const cellText = Behandlingsvalg.cellText;

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > p, :scope > details > ul").forEach((el) => {
        if (el.tagName === "P") { if (!el.classList.contains("valg-ingen")) lines.push(el.textContent.trim()); }
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else el.querySelectorAll("tbody tr").forEach((tr) => lines.push("  * " + Array.from(tr.querySelectorAll("td")).map(cellText).join(" — ")));
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  update();
})();
