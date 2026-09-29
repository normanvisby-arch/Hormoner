/*
 * Akutte luftvejsinfektioner i almen praksis: hvem skal have antibiotika,
 * hvilket præparat, dosis (børn efter vægt) og varighed. DSAM 2024 og Region
 * Hovedstadens antibiotikavejledning for primærsektoren (2025).
 */

(function () {
  "use strict";

  let last = null;
  const ab = AB({ update, journal: buildJournalNote });
  const { num, radio, checked, fmt, box, collapsible, ul, boernetekst, gruppe, drugTable, planLinjer } = ab;
  const alderWarning = document.getElementById("alderWarning");

  const DIAG = { tonsillitis: "faryngo-tonsillitis", otitis: "akut otitis media", sinuitis: "akut rhinosinuitis", pneumoni: "mistanke om pneumoni", bronkitis: "akut bronkitis" };
  const FELTER = { fsTons: ["tonsillitis"], fsOt: ["otitis"], fsSin: ["sinuitis"], fsPn: ["pneumoni"], crpField: ["sinuitis", "pneumoni", "bronkitis"] };

  function getState() {
    const diag = radio("diag");
    Object.entries(FELTER).forEach(([id, diags]) => (document.getElementById(id).hidden = !diags.includes(diag)));
    const alder = num("alder");
    const vaegt = num("vaegt");
    const andet = checked("andet");
    return { diag, alder, vaegt, gruppe: gruppe(alder, vaegt), allergi: andet.includes("allergi"), gravid: andet.includes("gravid"), crp: num("crp"), rf: checked("rf") };
  }

  // ---------------------------------------------------------------------
  // Regimer
  // ---------------------------------------------------------------------

  const PENV_VOKSEN = "1 mio. IE (660 mg) eller 800 mg × 4 dagligt";
  function penV(s, dage, tag, rec) {
    if (s.gruppe === "barn") return { key: "penv", navn: "Penicillin V", dosering: boernetekst(s.vaegt, 50, 3, 800, `i ${dage} dage`), note: "Tabletter kan knuses og blandes i lidt mad; mikstur findes.", tag, rec };
    return { key: "penv", navn: "Penicillin V", dosering: `${PENV_VOKSEN} i ${dage} dage`, note: "Tages med ca. 6 timers mellemrum og mindst 1 time før eller 2 timer efter et måltid.", tag, rec };
  }
  const MAKROLID_GRAVID = "<strong>Gravid med penicillinallergi:</strong> makrolider kun efter nøje overvejelse (clarithromycin er i et dansk registerstudie forbundet med øget risiko for abort) — konferér, eller se \"Lægemidler og graviditet\" på pro.medicin.dk.";
  function clari(s, dage, hoej, tag, rec) {
    const note = "Mange interaktioner (fx simvastatin, DOAK, colchicin) — tjek medicinlisten.";
    if (s.gruppe === "barn") return { key: "clari", navn: "Clarithromycin", dosering: boernetekst(s.vaegt, 15, 2, 500, `i ${dage} dage`), note, tag, rec };
    return { key: "clari", navn: "Clarithromycin", dosering: `${hoej ? "500 mg × 2" : "250 mg × 2 (500 mg × 2 ved svær infektion)"} dagligt i ${dage} dage`, note, tag, rec };
  }
  function roxi(s, dage, tag, rec) {
    return { key: "roxi", navn: "Roxithromycin", dosering: `150 mg × 2 (eller 300 mg × 1) dagligt i ${dage} dage`, note: "Makrolid til voksne (Region Hovedstaden) — færre interaktioner end clarithromycin.", tag, rec };
  }
  // Makrolid: clarithromycin-mikstur til børn, roxithromycin til voksne.
  const makrolid = (s, dage, hoej, tag, rec) => (s.gruppe === "barn" ? clari(s, dage, hoej, tag, rec) : roxi(s, dage, tag, rec));
  // Førstevalg og alternativ ved penicillinallergi. Gravide med penicillinallergi
  // får ingen anbefalet makrolid — lægen konfererer.
  function standard(s, dage, hoej, tag, altTag) {
    if (s.allergi) {
      let rows = s.gruppe === "barn" ? [clari(s, dage, hoej, tag || "Anbefalet (penicillinallergi)", true)] : [roxi(s, dage, tag || "Anbefalet (penicillinallergi)", true), clari(s, dage, hoej, "Alternativ", false)];
      if (s.gravid) rows = rows.map((r) => Object.assign({}, r, { rec: false, tag: "Konferér (graviditet)" }));
      return rows;
    }
    return [penV(s, dage, tag || "Anbefalet", true), makrolid(s, dage, hoej, altTag || "Ved penicillinallergi", false)];
  }
  // Rækker, der vises, men ikke anbefales (fx "hvis der behandles").
  const ikkeAnbefalet = (rows, tag) => rows.map((r) => Object.assign({}, r, { rec: false, tag: r.rec ? tag : r.tag }));

  // ---------------------------------------------------------------------
  // Vurdering pr. diagnose
  // ---------------------------------------------------------------------

  function res(titel, cls, tekst) {
    return { titel, cls, tekst: [].concat(tekst || []), rows: [], noter: [], sikkerhed: [], fund: "", ab: false };
  }

  function tonsillitis(s) {
    const c = checked("centor");
    const strep = radio("strep");
    let r;
    const fund = `Centor ${c.length}/4${strep === "ikke" ? "" : `, strep A-test ${strep === "pos" ? "positiv" : "negativ"}`}`;
    if (s.rf.includes("luftvej")) r = res("Akut: truet luftvej", "box-red", "Stridor, savlen eller åndenød: akut indlæggelse (ring 112) — epiglottitis eller absces.");
    else if (s.rf.includes("absces")) r = res("Mistanke om peritonsillær absces", "box-red", "Henvis akut samme dag til øre-næse-halsafdeling (drænage og antibiotika).");
    else if (c.length <= 1) {
      r = res(`Centor ${c.length}: streptokokinfektion usandsynlig`, "box-blue", ["Ingen strep A-test og ingen antibiotika. Smertestillende (paracetamol eller ibuprofen).", "Halvdelen er symptomfri efter 3 dage og 9 ud af 10 efter 7 dage — også uden antibiotika."]);
    } else if (strep === "ikke") {
      r = res(`Centor ${c.length}: tag strep A-test`, "box-amber", "Ved 2 eller flere Centor-kriterier tages strep A-test. Antibiotika kun ved positiv test.");
      if (c.length === 4) {
        r.tekst.push("Ved 4 Centor-kriterier og udtalt påvirket patient kan behandling startes uden test (DSAM 2024).");
        r.rows = ikkeAnbefalet(standard(s, 5), "Hvis der behandles uden test");
      }
      r.plan = "strep A-test; antibiotika ved positiv test.";
    } else if (strep === "neg") {
      r = res("Negativ strep A-test: ingen antibiotika", "box-blue", ["Formentlig viral infektion — symptomatisk behandling.", "Udtalte belægninger, træthed og lymfeknuder hos unge: overvej mononukleose (undgå amoxicillin, der giver udslæt)."]);
    } else {
      r = res("Streptokok-tonsillitis: behandl med penicillin V", "box-green", "Positiv strep A-test og mindst 2 Centor-kriterier. Behandlingen forkorter forløbet med ca. 1 døgn og mindsker risikoen for komplikationer.");
      r.rows = standard(s, 5);
      r.ab = true;
    }
    if (!isNaN(s.alder) && s.alder < 3 && c.length >= 2 && !s.rf.length) r.noter.push("Streptokok-tonsillitis er sjælden under 3 år — overvej anden årsag.");
    r.sikkerhed.push("Kontakt igen ved synkebesvær, ensidig hævelse, åndenød eller ingen bedring efter 2–3 dage.");
    r.fund = fund;
    return r;
  }

  function otitis(s) {
    const o = checked("ot");
    const barn = isNaN(s.alder) || s.alder < 15;
    let r;
    if (o.includes("mastoid")) r = res("Mistanke om mastoiditis", "box-red", "Hævelse, rødme eller ømhed bag øret: akut henvisning til øre-næse-halsafdeling.");
    else if (o.includes("svigt")) {
      r = res("Behandlingssvigt: skift til amoxicillin med clavulansyre", "box-amber", "Haemophilus influenzae og betalaktamase-producerende bakterier dækkes ikke af penicillin V.");
      if (s.allergi) r.rows = standard(s, 5);
      else if (s.gruppe === "barn") r.rows = [{ key: "amoxclav", navn: "Amoxicillin med clavulansyre", dosering: "Dosis efter vægt jf. produktresumé eller regionens børnetabel. Hold clavulansyre under maksimum (højst 5 mg/kg pr. dosis; under 2 år højst 10 mg/kg/døgn).", note: "Mikstur til børn under ca. 25 kg.", tag: "Anbefalet", rec: true }];
      else r.rows = [{ key: "amoxclav", navn: "Amoxicillin med clavulansyre", dosering: "500/125 mg × 3 dagligt i 5 dage", note: "Tages ved måltidets start (mindre diarré).", tag: "Anbefalet", rec: true }];
      r.ab = true;
    } else if (o.includes("otore3") && !o.includes("paavirket")) {
      r = res("Flåd gennem trommehindedræn: lokalbehandling", "box-blue", "Flåd gennem trommehindedræn i mere end 3 dage hos et upåvirket barn behandles med øredråber frem for tabletter/mikstur (DSAM 2024). Spontan perforation ved akut mellemørebetændelse vurderes som mellemørebetændelse efter almentilstand.");
      r.rows = [{ key: "ciprodr", navn: "Ciprofloxacin-øredråber (evt. med steroid)", dosering: "Efter produktresumé", note: "Rens øregangen for flåd før dryp.", tag: "Anbefalet", rec: true }];
      r.ab = true;
    } else if (o.includes("paavirket")) {
      r = res("Almen påvirket: behandl med penicillin V", "box-green", barn ? "Almen påvirkede børn med akut mellemørebetændelse behandles med antibiotika — skærpet opmærksomhed under 1 år." : "Voksne med påvirket almentilstand behandles med penicillin V.");
      r.rows = standard(s, 5);
      r.ab = true;
    } else {
      r = res("Ikke almen påvirket: smertebehandling og observation", "box-blue", ["Akut mellemørebetændelse heler ofte af sig selv — ca. 60 % har det bedre inden for 24 timer.", "Paracetamol eller ibuprofen i faste doser. Ny vurdering ved forværring eller manglende bedring efter 2–3 døgn."]);
      if (!isNaN(s.alder) && s.alder < 1) r.noter.push("<strong>Under 1 år:</strong> skærpet opmærksomhed — lav tærskel for antibiotika og kontrol.");
    }
    r.fund = [o.includes("paavirket") ? "almen påvirket" : "ikke almen påvirket", o.includes("otore3") && "flåd gennem dræn > 3 dage", o.includes("svigt") && "ingen effekt af penicillin", o.includes("mastoid") && "ømhed/hævelse bag øret"].filter(Boolean).join(", ");
    r.sikkerhed.push("Kontakt igen ved forværring, høj feber, hævelse bag øret, nakkestivhed eller ingen bedring efter 2–3 døgn.");
    if (barn) r.noter.push("Vedvarende høreproblemer: otoskopi og tympanometri efter 1–3 måneder (sekretorisk otitis).");
    return r;
  }

  function sinuitis(s) {
    const tegn = checked("sin");
    const varighed = radio("varighed");
    const krit = tegn.length + (varighed === "dobbelt" ? 1 : 0) + (s.crp >= 50 ? 1 : 0);
    let r;
    if (s.rf.includes("orbital") || s.rf.includes("cerebral")) r = res("Mistanke om kompliceret sinuitis", "box-red", "Hævelse omkring øjet, synspåvirkning, svær hovedpine eller bevidsthedspåvirkning: akut indlæggelse (orbital eller intrakraniel komplikation).");
    else if (varighed === "kort") {
      r = res("Under 5 dage: formentlig viral rhinosinuitis", "box-blue", ["Ingen antibiotika. Saltvandsskylning, smertestillende og evt. næsespray med steroid.", "Bakteriel rhinosinuitis diagnosticeres som regel først efter 5–10 dage (DSAM 2024). Revurdér ved vedvarende symptomer eller forværring efter initial bedring."]);
    } else if (krit >= 3) {
      r = res(`Akut bakteriel rhinosinuitis sandsynlig (${krit} af 5 tegn)`, "box-green", "Mindst 3 af 5 tegn: misfarvet sekret, svære lokale smerter, feber, CRP ≥ 50 og forværring efter bedring.");
      r.rows = standard(s, 5);
      r.ab = true;
      if (s.gruppe === "barn") r.noter.push("Hos børn: overvej også anden årsag til langvarigt næseflåd (fx adenoider, fremmedlegeme).");
    } else {
      r = res(`${krit} af 5 tegn: antibiotika er ikke indiceret`, "box-blue", ["Under 3 tegn på bakteriel infektion — symptomatisk behandling.", isNaN(s.crp) ? "Mål CRP — CRP ≥ 50 tæller som et tegn." : `CRP ${Math.round(s.crp)} mg/l.`]);
    }
    r.fund = `${{ kort: "under 5 dage", mellem: "5–9 dage", lang: "10 dage eller mere", dobbelt: "forværring efter bedring" }[varighed]}, ${krit}/5 tegn${isNaN(s.crp) ? "" : `, CRP ${Math.round(s.crp)}`}`;
    r.sikkerhed.push("Kontakt straks ved hævelse omkring øjet, synsforstyrrelser, svær hovedpine eller nakkestivhed.");
    return r;
  }

  function pneumoni(s) {
    const crbItems = checked("crb");
    const pn = checked("pn");
    const sat = num("sat");
    const barn = s.gruppe === "barn";
    const crb = crbItems.length + (!barn && s.alder >= 65 ? 1 : 0);
    let r;
    if ((!barn && crb >= 3) || sat < 92) {
      r = res(`Akut indlæggelse${barn ? "" : ` — CRB-65 ${crb}`}${sat < 92 ? `, SAT ${Math.round(sat)} %` : ""}`, "box-red", "Høj risiko: indlæg akut. Giv evt. første dosis antibiotika inden transport efter aftale med modtagende afdeling.");
      r.fund = `CRB-65 ${crb}${isNaN(sat) ? "" : `, SAT ${Math.round(sat)} %`}${isNaN(s.crp) ? "" : `, CRP ${Math.round(s.crp)}`}`;
      return r;
    }
    const behandlRows = standard(s, 5, true, null, "Ved penicillinallergi eller manglende effekt");
    if (isNaN(s.crp)) {
      r = res("Mål CRP", "box-amber", ["CRP hjælper med at skelne behandlingskrævende bakteriel pneumoni fra viral infektion.", pn.includes("fokal") ? "Fokale fund ved stetoskopi øger sandsynligheden for pneumoni." : "Uden fokale fund og med upåvirket almentilstand er pneumoni mindre sandsynlig."]);
      r.rows = ikkeAnbefalet(behandlRows, "Hvis der behandles");
      r.plan = "CRP måles; antibiotika afhænger af CRP og klinisk vurdering.";
    } else if (s.crp < 20) {
      r = res("CRP under 20: bakteriel pneumoni usandsynlig", "box-blue", ["Ingen antibiotika. Revurdér ved forværring, fortsat feber eller åndenød."]);
    } else if (s.crp < 50) {
      r = res(`CRP ${Math.round(s.crp)}: taler imod behandlingskrævende bakteriel pneumoni`, "box-blue", ["CRP under 50 mg/l taler imod behandlingskrævende bakteriel pneumoni (DSAM 2024). Undlad som hovedregel antibiotika, og revurdér efter 1–2 døgn."]);
      if (pn.includes("komorbid") || crb >= 1 || pn.includes("fokal")) r.tekst.push("Ved fokale fund, betydende komorbiditet eller CRB-65 ≥ 1 kan behandling alligevel være relevant — individuel vurdering.");
      r.rows = ikkeAnbefalet(behandlRows, "Hvis der behandles");
    } else {
      r = res(`Klinisk pneumoni med CRP ${Math.round(s.crp)}: behandl`, "box-green", barn ? "Børn: penicillin V er førstevalg. Mykoplasma og Chlamydia pneumoniae er hyppigere fra ca. 5 år." : "Penicillin V er førstevalg — pneumokokker er den hyppigste årsag.");
      r.rows = behandlRows;
      r.ab = true;
    }
    if (!barn && crb >= 1 && crb <= 2) r.noter.unshift(`<strong>CRB-65 ${crb}:</strong> overvej indlæggelse — især ved høj alder, betydende komorbiditet, eller hvis patienten bor alene.`);
    if (barn) r.noter.unshift("CRB-65 er ikke valideret til børn — vurdér almentilstand, respirationsfrekvens, indtrækninger, væskeindtag og saturation; lav tærskel for pædiatrisk vurdering.");
    if (r.rows.length && !s.allergi) r.noter.push("Manglende effekt efter 2–3 dage: overvej atypisk pneumoni (mykoplasma) og skift til makrolid — eller indlæggelse. Påvist mykoplasma eller klamydia: makrolid i 10 dage (Region Hovedstaden).");
    if (r.rows.length && barn) r.noter.push("Børnedosis følger DSAM 2024 (3 doser i døgnet); Region Hovedstaden angiver 50 mg/kg/døgn fordelt på 4 doser.");
    r.noter.push(`Eksacerbation af KOL: se <a href="../lunge/kol.html">KOL-værktøjet</a>.`);
    r.sikkerhed.push("Kontrol efter 2–3 dage ved risikopatienter. Kontakt straks ved åndenød, konfusion eller forværring.");
    r.sikkerhed.push("Røntgen af thorax ved manglende bedring — og overvej kontrolrøntgen efter ca. 6 uger hos rygere og ældre (lungekræft).");
    r.fund = `${barn ? "" : `CRB-65 ${crb}, `}${pn.includes("fokal") ? "fokale fund" : "ingen fokale fund"}${isNaN(sat) ? "" : `, SAT ${Math.round(sat)} %`}${isNaN(s.crp) ? ", CRP ikke målt" : `, CRP ${Math.round(s.crp)}`}`;
    return r;
  }

  function bronkitis(s) {
    const r = res("Akut bronkitis: ingen antibiotika", "box-blue", ["Antibiotika forkorter ikke forløbet mærkbart. Hosten varer typisk 2–3 uger.", "Symptomatisk behandling; rygestop."]);
    if (s.crp >= 50) r.tekst.push(`CRP ${Math.round(s.crp)}: overvej pneumoni — vælg "Mistanke om lungebetændelse".`);
    r.noter.push("Mål CRP og overvej pneumoni ved høj feber, påvirket almentilstand, hurtig respiration eller fokale fund.");
    r.noter.push("Anfaldsvis hoste i mere end 2 uger, evt. med hvæsen eller opkastning: tænk kighoste — PCR, og makrolid i de første uger, særligt hvis der er spædbørn eller gravide i husstanden.");
    r.noter.push(`Astma eller KOL med forværring: se <a href="../lunge/index.html">lunge-appen</a>.`);
    r.sikkerhed.push("Kontakt igen ved åndenød, høj feber, blodigt opspyt eller hoste i mere end 3–4 uger.");
    r.fund = isNaN(s.crp) ? "" : `CRP ${Math.round(s.crp)}`;
    return r;
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  function update() {
    const s = getState();
    const warn = [];
    if (!isNaN(s.alder) && s.alder < 1) warn.push("Under 1 år: skærpet opmærksomhed — spædbørn under 3 måneder med feber henvises akut.");
    if (!isNaN(s.alder) && s.alder > 110) warn.push("Alder virker usædvanlig — tjek indtastningen.");
    if (!isNaN(s.vaegt) && !isNaN(s.alder) && s.alder >= 18 && s.vaegt < 40) warn.push("Voksen under 40 kg doseres som barn (efter vægt).");
    alderWarning.textContent = warn.join(" ");

    const r = s.rf.includes("meningitis")
      ? Object.assign(res("Mistanke om meningitis eller meningokoksygdom", "box-red", ["Petekkier, nakkestivhed eller bevidsthedspåvirkning: akut indlæggelse (ring 112).", "Ved mistanke om meningokoksygdom gives benzylpenicillin i.v. eller i.m. straks efter Sundhedsstyrelsens anbefaling, hvis det ikke forsinker transporten."]), { fund: "petekkier/nakkestivhed/bevidsthedspåvirkning" })
      : { tonsillitis, otitis, sinuitis, pneumoni, bronkitis }[s.diag](s);
    last = { s, r };
    let html = box(r.cls, r.titel, r.tekst.map((t) => `<p>${t}</p>`).join(""));
    if (r.rows.length) {
      let body = drugTable(r.rows);
      if (s.gruppe === "barn" && isNaN(s.vaegt)) body = "<p><strong>Angiv vægt</strong> — børn under 40 kg doseres efter vægt.</p>" + body;
      if (s.gruppe === "barn") body += "<p>Dosis til børn må aldrig overstige voksendosis. Tjek styrken på mikstur før udlevering.</p>";
      html += box(r.ab ? "box-green" : "box-blue", r.ab ? "Behandling" : "Hvis der behandles", body);
    }
    const noter = r.noter.slice();
    if (s.allergi && s.gravid && r.rows.length) noter.unshift(MAKROLID_GRAVID);
    if (s.allergi && r.ab) noter.push("Penicillinallergi-mærkningen er ofte forkert. Ved tvivl: henvis til allergologisk udredning — penicillin er førstevalg ved de fleste infektioner.");
    if (noter.length) html += box("box-blue", "Bemærk", ul(noter));
    html += box("box-blue", "Sikkerhedsnet til patienten", ul(r.sikkerhed));
    html += collapsible(
      "box-blue",
      "Rationel antibiotikabrug",
      ul([
        "De fleste akutte luftvejsinfektioner er virale og går over af sig selv.",
        "Penicillin V er førstevalg ved bakterielle luftvejsinfektioner — smalspektret og med lav resistens i Danmark.",
        "Kort behandling (5 dage) er tilstrækkelig ved tonsillitis, otitis media, rhinosinuitis og ukompliceret pneumoni (DSAM 2024).",
        "Penicillin V til voksne doseres 4 gange dagligt (med ca. 6 timers mellemrum) — til børn 3 gange dagligt for at sikre, at doserne bliver givet.",
        "CRP bruges ikke til at diagnosticere halsbetændelse — brug Centor-kriterier og strep A-test.",
      ])
    );
    html += `<p class="source-note">DSAM 2024 og Region Hovedstadens antibiotikavejledning (2025). Kontrollér dosis på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>, og følg din regions vejledning.</p>`;
    ab.output.innerHTML = html;
  }

  function buildJournalNote() {
    const { s, r } = last;
    const lines = [`Luftvejsinfektion — ${DIAG[s.diag]} ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (!isNaN(s.alder)) basis.push(`${fmt(s.alder)} år`);
    if (!isNaN(s.vaegt)) basis.push(`${fmt(s.vaegt)} kg`);
    if (s.allergi) basis.push("penicillinallergi");
    if (s.gravid) basis.push("gravid");
    if (basis.length) lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    if (r.fund) lines.push(`Fund: ${r.fund}.`);
    lines.push(`Vurdering: ${r.titel}.`);
    const plan = planLinjer();
    if (plan.length) plan.forEach((p) => lines.push(p));
    else if (r.cls === "box-red") lines.push("Plan: akut henvisning/indlæggelse.");
    else if (r.plan) lines.push(`Plan: ${r.plan}`);
    else if (r.ab) lines.push("Plan: antibiotikavalg efter konference (graviditet og penicillinallergi).");
    else lines.push("Plan: ingen antibiotika — symptomatisk behandling.");
    if (r.sikkerhed.length) lines.push(`Informeret: ${r.sikkerhed[0]}`);
    return lines.join("\n");
  }

  update();
})();
