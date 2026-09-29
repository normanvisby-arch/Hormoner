/*
 * Urinvejsinfektioner i almen praksis: ukompliceret og kompliceret cystitis,
 * gravide, mænd, børn, feber/pyelonefritis og asymptomatisk bakteriuri.
 * Region Hovedstadens antibiotikavejledning (2025), Medicinrådet, Region
 * Midtjylland (2025) og Lægehåndbogen. Tager højde for eGFR.
 */

(function () {
  "use strict";

  let last = null;
  const ab = AB({ update, journal: buildJournalNote });
  const { num, radio, checked, fmt, box, collapsible, ul, boernetekst, drugTable, planLinjer } = ab;
  const alderWarning = document.getElementById("alderWarning");
  const gravidLabel = document.getElementById("gravidLabel");

  function getState() {
    const koen = radio("koen");
    gravidLabel.hidden = koen !== "kvinde";
    const andet = checked("andet");
    const alder = num("alder");
    const s = {
      koen,
      alder,
      vaegt: num("vaegt"),
      billede: radio("billede"),
      leuk: radio("leuk"),
      nitrit: radio("nitrit"),
      egfr: num("egfr"),
      sepsis: andet.includes("sepsis"),
      gravid: koen === "kvinde" && andet.includes("gravid"),
      allergi: andet.includes("allergi"),
      kateter: andet.includes("kateter"),
      recidiv: andet.includes("recidiv"),
      kompl: andet.includes("kompl"),
    };
    // Barn: under 15 år — eller under 40 kg, når alderen ikke er angivet.
    s.barn = (!isNaN(alder) && alder < 15) || (isNaN(alder) && s.vaegt < 40);
    s.mand = koen === "mand";
    // Gentagne infektioner alene gør ikke cystitis kompliceret (Region Hovedstaden).
    s.kompliceret = s.mand || s.gravid || s.barn || s.kateter || s.kompl;
    return s;
  }

  // ---------------------------------------------------------------------
  // Regimer (voksne)
  // ---------------------------------------------------------------------

  const nitroOk = (s) => isNaN(s.egfr) || s.egfr >= 45;
  const pivm = (dage, tag, rec, dosis) => ({ key: `pivm${dage}`, navn: "Pivmecillinam", dosering: `${dosis || "400 mg × 3"} dagligt i ${dage} dage`, note: "Ingen dosisjustering ved nedsat nyrefunktion. Tages med rigeligt vand under et måltid.", tag, rec });
  function nitro(s, dage, tag, rec) {
    const note = nitroOk(s)
      ? `Kun ved eGFR ≥ 45 (Region Hovedstaden: 100 mg × 4; pro.medicin.dk: 50 mg × 4).${s.gravid ? " Undgås sidst i graviditeten (fra uge 36) pga. risiko for hæmolyse hos barnet." : ""}${s.mand ? " Når ikke prostata — ikke ved feber eller mistanke om prostatitis." : ""}`
      : `<strong>Kontraindiceret ved eGFR ${Math.round(s.egfr)}</strong> (under 45) — virker ikke og ophobes.`;
    return { key: `nitro${dage}`, navn: "Nitrofurantoin", dosering: `100 mg × 4 dagligt i ${dage} dage`, note, tag: nitroOk(s) ? tag : "Ikke ved eGFR < 45", rec: rec && nitroOk(s) };
  }
  function trim(s, dage, tag) {
    const note = [
      "Kun ved kendt følsomhed (resistens ca. 25–30 %).",
      !isNaN(s.egfr) && s.egfr < 15 ? `<strong>eGFR ${Math.round(s.egfr)}: undgås.</strong>` : !isNaN(s.egfr) && s.egfr <= 30 ? "Nyrefunktion 15–30: halv dosis efter 3 dage." : "",
      s.gravid ? "Undgås i 1. trimester (folatantagonist)." : "",
      "Kan hæve kreatinin og kalium.",
    ].filter(Boolean).join(" ");
    return { key: `trim${dage}`, navn: "Trimethoprim", dosering: `200 mg × 2 dagligt i ${dage} dage`, note, tag: tag || "Efter resistensbestemmelse", rec: false };
  }
  const sulfa = (dage) => ({ key: `sulfa${dage}`, navn: "Sulfamethizol", dosering: `1 g × 2 dagligt i ${dage} dage`, note: "Kun efter resistensbestemmelse (resistens ca. 30 %).", tag: "Efter resistensbestemmelse", rec: false });
  function cipro(s, dage, tag, rec) {
    const dosis = !isNaN(s.egfr) && s.egfr < 30 ? "500 mg × 1" : "500 mg × 2";
    return { key: `cipro${dage}`, navn: "Ciprofloxacin", dosering: `${dosis} dagligt i ${dage}`, note: `Fluorokinolon — kun når andre ikke kan bruges: risiko for seneskade, neuropati og aortaaneurisme.${!isNaN(s.egfr) && s.egfr < 30 ? " Dosis reduceret pga. eGFR under 30." : ""}${s.gravid ? " Undgås under graviditet." : ""}`, tag, rec };
  }

  // ---------------------------------------------------------------------
  // Vurdering
  // ---------------------------------------------------------------------

  const RECIDIV = "<strong>Gentagne infektioner:</strong> overvej forebyggelse — rigelig væske, vaginal østrogen efter menopausen, evt. profylakse (trimethoprim 100 mg, pivmecillinam 200 mg eller nitrofurantoin 50 mg dagligt ved sengetid eller efter samleje). Nitrofurantoin som langtidsprofylakse kan give lunge- og leverskade — kontrollér. Overvej udredning.";

  function res(titel, cls, tekst) {
    return { titel, cls, tekst: [].concat(tekst || []), rows: [], noter: [], sikkerhed: [], dyrkning: "", ab: false };
  }

  function stixTekst(s) {
    const t = { pos: "positiv", neg: "negativ", ukendt: "ikke udført" };
    return `stix: leukocytter ${t[s.leuk]}, nitrit ${t[s.nitrit]}`;
  }

  function vurder(s) {
    let r;
    if (s.sepsis) {
      r = res("Mistanke om urosepsis: akut indlæggelse", "box-red", "Påvirket almentilstand med feber eller kulderystelser: indlæg akut. Tag urin til dyrkning inden transport, hvis det ikke forsinker.");
      return r;
    }

    if (s.billede === "asympt") {
      if (s.gravid) {
        r = res("Asymptomatisk bakteriuri i graviditeten: behandl", "box-green", "Bakteriuri hos gravide behandles efter resistensbestemmelse (risiko for pyelonefritis og for tidlig fødsel).");
        r.rows = s.allergi ? [nitro(s, 5, "Anbefalet (penicillinallergi)", true)] : [pivm(5, "Anbefalet", true), nitro(s, 5, "Ved penicillinallergi", false)];
        r.noter.push("Kontroldyrkning 1–2 uger efter behandlingen.");
        r.noter.push("Gruppe B-streptokokker i urinen: penicillin V i 7 dage efter regionens vejledning, og GBS-fundet noteres i vandrejournalen (profylakse under fødslen).");
        r.ab = true;
      } else {
        r = res("Asymptomatisk bakteriuri: ingen behandling", "box-blue", ["Bakterier i urinen uden symptomer behandles ikke — heller ikke hos ældre, diabetikere eller patienter med kateter.", "Undtagelser: gravide og før urologiske indgreb med slimhindeskade."]);
      }
      r.dyrkning = s.gravid ? "Dyrkning og resistensbestemmelse" : "Screening med stix eller dyrkning uden symptomer frarådes";
      return r;
    }

    if (s.billede === "feber") {
      if (s.gravid) return res("Pyelonefritis i graviditeten: akut indlæggelse", "box-red", "Feber eller flankesmerter hos gravide: indlæg akut.");
      if (s.barn) return res("Feber og urinvejsinfektion hos barn: akut pædiatrisk vurdering", "box-red", "Børn med feber og mistanke om urinvejsinfektion (pyelonefritis) henvises akut til pædiatrisk afdeling — især under 2 år.");
      if (s.mand) {
        r = res("Feber-UVI hos mand: pyelonefritis eller akut prostatitis", "box-amber", ["Feber og urinvejsinfektion hos mænd er altid kompliceret. Lav tærskel for indlæggelse; tag urin til dyrkning før behandling, og undgå prostatamassage.", "Ambulant behandling kun ved let påvirket almentilstand og mulighed for tæt opfølgning."]);
        r.rows = [cipro(s, "14 dage — 2–4 uger ved akut prostatitis", "Anbefalet", true)];
        r.noter.push("7 dage er for kort hos mænd med feber-UVI (PROSTASHORT, <em>Clin Infect Dis</em> 2023: klinisk succes 56 % mod 78 % ved 14 dage).");
        r.noter.push("Ciprofloxacin vælges, fordi det når prostata. Tilpas efter dyrkningssvar.");
        r.noter.push("Efter behandling: overvej urologisk udredning, særligt ved første infektion uden oplagt årsag, gentagne infektioner eller resturin.");
      } else {
        r = res("Akut pyelonefritis: let tilfælde kan behandles ambulant", "box-amber", ["Let, ukompliceret pyelonefritis hos ikke-gravide voksne kan behandles i almen praksis. Tag altid urin til dyrkning før behandling.", "Indlæg ved opkastning, påvirket almentilstand, kompliceret infektion eller manglende bedring efter 48–72 timer."]);
        r.rows = s.allergi
          ? [cipro(s, "7 dage", "Anbefalet (penicillinallergi)", true)]
          : [pivm(7, "Anbefalet", true), cipro(s, "7 dage", "Ved penicillinallergi eller resistens", false)];
        if (!s.allergi) r.noter.push("Doseringen varierer mellem vejledningerne: Region Midtjylland (2025) 400 mg × 3 i 7 dage; Medicinrådet og pro.medicin.dk 400 mg × 4 i 7–10 dage. Følg din regions vejledning.");
        if (s.kompliceret) r.noter.push("<strong>Kompliceret pyelonefritis</strong> (kateter, sten, misdannelse, immunsuppression): lav tærskel for indlæggelse.");
      }
      r.ab = true;
      r.dyrkning = "Altid dyrkning og resistensbestemmelse før behandling";
      r.sikkerhed.push("Kontrol efter 2–3 døgn. Kontakt straks ved opkastning, forværring eller vedvarende feber.");
      return r;
    }

    // Cystitis
    if (s.barn) {
      r = res("Cystitis hos barn: kompliceret — dyrk altid", "box-amber", "Urinvejsinfektion hos børn regnes som kompliceret. Tag urin til dyrkning og resistensbestemmelse før behandling.");
      if (!isNaN(s.alder) && s.alder < 2) {
        r.tekst.push("Børn under 2 år: konferér med eller henvis til pædiatrisk afdeling.");
      } else if (s.allergi) {
        r.tekst.push("Penicillinallergi: behandl efter resistensbestemmelse i samråd med pædiatrisk afdeling.");
      } else {
        const stor = s.vaegt >= 40;
        r.rows = [{ key: "pivmbarn", navn: "Pivmecillinam", dosering: stor ? "400 mg × 3 dagligt i 5 dage (voksendosis fra 40 kg)" : boernetekst(s.vaegt, 20, 3, 400, "i 5 dage"), note: stor ? "Børn over 2 år uden feber." : "Børn over 2 år uden feber. Afrund til en mulig tabletdosis (200 og 400 mg) — se produktresuméet.", tag: "Anbefalet", rec: true }];
        r.ab = true;
      }
      r.noter.push("Første urinvejsinfektion hos barn, feber-UVI eller gentagne infektioner: overvej henvisning til udredning (ultralyd, vandladning).");
      r.dyrkning = "Altid dyrkning og resistensbestemmelse";
      r.sikkerhed.push("Kontakt straks ved feber, opkastning eller påvirket almentilstand.");
      return r;
    }
    if (s.gravid) {
      r = res("Cystitis hos gravid: behandl i 5 dage", "box-green", "Tag altid urin til dyrkning før behandling, og kontroldyrk 1–2 uger efter.");
      r.rows = s.allergi ? [nitro(s, 5, "Anbefalet (penicillinallergi)", true)] : [pivm(5, "Anbefalet", true), nitro(s, 5, "Ved penicillinallergi", false)];
      r.noter.push("Trimethoprim undgås i 1. trimester, nitrofurantoin sidst i graviditeten (fra uge 36), og sulfamethizol sidst i graviditeten.");
      r.noter.push("Gruppe B-streptokokker: penicillin V i 7 dage efter regionens vejledning, og GBS-fundet noteres i vandrejournalen.");
      r.ab = true;
      r.dyrkning = "Altid dyrkning og resistensbestemmelse";
      r.sikkerhed.push("Kontakt straks ved feber, flankesmerter eller veer.");
      return r;
    }
    if (s.mand) {
      r = res("Nedre urinvejsinfektion hos mand: kompliceret — 5 dage", "box-green", "Urinvejsinfektion hos mænd regnes som kompliceret. Tag urin til dyrkning og resistensbestemmelse før behandling.");
      if (s.allergi) {
        r.rows = nitroOk(s)
          ? [nitro(s, 5, "Anbefalet (penicillinallergi)", true), cipro(s, "7 dage", "Ved eGFR < 45 eller resistens", false)]
          : [cipro(s, "7 dage", "Anbefalet (penicillinallergi, eGFR < 45)", true)];
      } else {
        r.rows = [pivm(5, "Anbefalet", true), nitro(s, 5, "Ved penicillinallergi", false)];
      }
      r.noter.push("Feber, perineale smerter eller øm prostata: tænk akut prostatitis — vælg \"Feber\" ovenfor.");
      r.noter.push("Overvej urologisk udredning ved første infektion uden oplagt årsag, gentagne infektioner eller resturin. PSA måles ikke under eller lige efter infektion.");
      r.ab = true;
      r.dyrkning = "Altid dyrkning og resistensbestemmelse";
      r.sikkerhed.push("Kontakt straks ved feber, kulderystelser eller vandladningsstop.");
      return r;
    }
    if (s.kompliceret) {
      const hvorfor = [s.kateter && "blærekateter", s.kompl && "komplicerende forhold"].filter(Boolean).join(", ");
      r = res(`Kompliceret cystitis (${hvorfor}): 5 dage`, "box-green", "Tag altid urin til dyrkning og resistensbestemmelse før behandling.");
      r.rows = s.allergi ? [nitro(s, 5, "Anbefalet (penicillinallergi)", true), trim(s, 5)] : [pivm(5, "Anbefalet", true), nitro(s, 5, "Ved penicillinallergi", false), trim(s, 5)];
      if (s.kateter) r.noter.push("<strong>Kateter:</strong> behandl kun ved symptomer. Skift kateteret, og tag urinprøven fra det nye kateter.");
      if (s.recidiv) r.noter.push(RECIDIV);
      r.ab = true;
      r.dyrkning = "Altid dyrkning og resistensbestemmelse";
      r.sikkerhed.push("Kontakt straks ved feber, flankesmerter eller manglende bedring efter 2–3 dage.");
      return r;
    }

    // Ukompliceret cystitis hos ikke-gravid kvinde
    const beggePos = s.leuk === "pos" && s.nitrit === "pos";
    const beggeNeg = s.leuk === "neg" && s.nitrit === "neg";
    if (beggeNeg) {
      r = res("Negativ stix: urinvejsinfektion er mindre sandsynlig", "box-blue", ["Overvej anden årsag — vaginitis, klamydia eller gonoré, eller irritation.", "Ved typiske symptomer: send urin til dyrkning, og overvej behandling efter svar."]);
      r.rows = [pivm(3, "Hvis der behandles", false)];
      r.dyrkning = "Dyrkning ved typiske symptomer";
    } else {
      r = res(s.recidiv ? "Recidiverende ukompliceret cystitis: 3 dage" : "Akut ukompliceret cystitis: 3 dage", "box-green", s.recidiv ? "Gentagne infektioner: send urin til dyrkning og resistensbestemmelse, og behandl som ukompliceret cystitis." : beggePos ? "Positiv stix for både leukocytter og nitrit (ca. 90 % sandsynlighed for UVI): behandl uden forudgående dyrkning." : "Typiske symptomer. Stix er ikke entydigt positiv — send urin til dyrkning, og start evt. behandling.");
      r.rows = s.allergi
        ? [nitro(s, 3, "Anbefalet (penicillinallergi)", true), trim(s, 3), sulfa(3)]
        : [pivm(3, "Anbefalet", true), nitro(s, 3, "Ved penicillinallergi", false), trim(s, 3), sulfa(3)];
      r.ab = true;
      r.dyrkning = beggePos && !s.recidiv ? "Dyrkning ikke nødvendig" : "Dyrkning og resistensbestemmelse";
      if (s.recidiv) r.noter.push(RECIDIV);
    }
    r.sikkerhed.push("Kontakt igen ved feber, flankesmerter, blod i urinen efter behandling eller ingen bedring efter 2–3 dage.");
    return r;
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  function update() {
    const s = getState();
    const warn = [];
    if (!isNaN(s.alder) && s.alder > 110) warn.push("Alder virker usædvanlig — tjek indtastningen.");
    if (s.barn && isNaN(s.vaegt)) warn.push("Angiv vægt — børn doseres efter vægt.");
    if (isNaN(s.alder) && s.vaegt < 40) warn.push("Angiv alder — under 40 kg behandles som barn.");
    alderWarning.textContent = warn.join(" ");
    const r = vurder(s);
    last = { s, r };
    let html = box(r.cls, r.titel, r.tekst.map((t) => `<p>${t}</p>`).join("") + (r.dyrkning ? `<p><strong>Urindyrkning:</strong> ${r.dyrkning}.</p>` : ""));
    if (r.rows.length) html += box(r.ab ? "box-green" : "box-blue", r.ab ? "Behandling" : "Hvis der behandles", drugTable(r.rows));
    const noter = r.noter.slice();
    if (!isNaN(s.egfr) && s.egfr < 45 && r.rows.length) noter.push(`<strong>eGFR ${Math.round(s.egfr)}:</strong> nitrofurantoin er kontraindiceret; pivmecillinam kræver ingen dosisjustering. Se også <a href="../nyre/dosis.html">dosis efter nyrefunktion</a>.`);
    if (s.allergi && r.ab) noter.push("Penicillinallergi-mærkningen er ofte forkert. Ved tvivl: henvis til allergologisk udredning.");
    if (noter.length) html += box("box-blue", "Bemærk", ul(noter));
    if (r.sikkerhed.length) html += box("box-blue", "Sikkerhedsnet til patienten", ul(r.sikkerhed));
    html += collapsible(
      "box-blue",
      "Diagnostik og resistens",
      ul([
        "Midtstråleurin. Stix med både positiv leukocytter og nitrit giver ca. 90 % sandsynlighed for UVI hos kvinder med typiske symptomer.",
        "Negativ nitrit udelukker ikke UVI (fx enterokokker og stafylokokker danner ikke nitrit).",
        "Dyrk altid ved kompliceret infektion (mænd, gravide, børn, kateter, gentagne infektioner), pyelonefritis og behandlingssvigt.",
        "Resistens hos E. coli i almen praksis: lav for nitrofurantoin og mecillinam, ca. 25–30 % for trimethoprim og sulfamethizol — derfor kun efter resistensbestemmelse.",
        "Asymptomatisk bakteriuri skal ikke findes eller behandles — undtagen hos gravide.",
      ])
    );
    html += `<p class="source-note">Region Hovedstaden (2025), Medicinrådet, Region Midtjylland (2025) og Lægehåndbogen. Kontrollér dosis på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>, og følg din regions vejledning.</p>`;
    ab.output.innerHTML = html;
  }

  function buildJournalNote() {
    const { s, r } = last;
    const hvad = { cystitis: "cystitis", feber: "feber/flankesmerter", asympt: "asymptomatisk bakteriuri" }[s.billede];
    const lines = [`Urinvejsinfektion — ${hvad} ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [s.koen];
    if (!isNaN(s.alder)) basis.push(`${fmt(s.alder)} år`);
    if (!isNaN(s.vaegt) && s.barn) basis.push(`${fmt(s.vaegt)} kg`);
    if (s.gravid) basis.push("gravid");
    if (s.allergi) basis.push("penicillinallergi");
    if (s.kateter) basis.push("blærekateter");
    if (s.recidiv) basis.push("gentagne infektioner");
    if (s.kompl) basis.push("komplicerende forhold");
    if (!isNaN(s.egfr)) basis.push(`eGFR ${Math.round(s.egfr)}`);
    lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    if (s.leuk !== "ukendt" || s.nitrit !== "ukendt") lines.push(stixTekst(s).replace(/^./, (c) => c.toUpperCase()) + ".");
    lines.push(`Vurdering: ${r.titel}.`);
    if (r.dyrkning) lines.push(`Urindyrkning: ${r.dyrkning.toLowerCase()}.`);
    const plan = planLinjer();
    if (plan.length) plan.forEach((p) => lines.push(p));
    else lines.push(r.cls === "box-red" ? "Plan: akut henvisning/indlæggelse." : r.ab ? "Plan: antibiotika efter dyrkning og resistensbestemmelse." : "Plan: ingen antibiotika.");
    if (r.sikkerhed.length) lines.push(`Informeret: ${r.sikkerhed[0]}`);
    return lines.join("\n");
  }

  update();
})();
