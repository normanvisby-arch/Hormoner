/*
 * KOL i almen praksis: spirometri (GOLD-grad), ABE-gruppe og valg af
 * vedligeholdelsesbehandling efter GOLD 2025 (initial og opfølgende
 * algoritme) med DSAM's tærskler for eosinofile. Præparatnavne er eksempler
 * og skal følge regionens basisliste og pro.medicin.dk.
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
  const spiroWarning = document.getElementById("spiroWarning");
  const printMeta = document.getElementById("printMeta");
  // Lægens valg af behandling til journalnotatet (valg.js).
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
    // form.reset() does not fire "input"/"change", so re-sync dependent UI.
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
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);

  function getState() {
    let ratio = num("ratio");
    // FEV1/FVC indtastet i procent (fx 62) omregnes til brøk.
    if (ratio > 1 && ratio <= 100) ratio = ratio / 100;
    return {
      alder: num("alder"),
      ryger: radio("ryger"),
      ratio,
      fev1: num("fev1pct"),
      mmrc: parseInt(radio("mmrc"), 10),
      cat: num("cat"),
      eksModerat: isNaN(num("eksModerat")) ? 0 : num("eksModerat"),
      eksIndl: isNaN(num("eksIndl")) ? 0 : num("eksIndl"),
      eos: num("eos"),
      beh: radio("beh"),
      andet: checked("andet"),
      spo2: num("spo2"),
    };
  }

  const has = (list, k) => list.includes(k);
  const fmt = (x, d = 1) => String(Math.round(x * 10 ** d) / 10 ** d).replace(".", ",");
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const collapsible = (cls, title, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${title}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  // ---------------------------------------------------------------------
  // Klassifikation
  // ---------------------------------------------------------------------

  function goldGrad(fev1) {
    if (isNaN(fev1)) return null;
    if (fev1 >= 80) return { grad: 1, tekst: "GOLD 1 (let): FEV1 ≥ 80 %" };
    if (fev1 >= 50) return { grad: 2, tekst: "GOLD 2 (moderat): FEV1 50–79 %" };
    if (fev1 >= 30) return { grad: 3, tekst: "GOLD 3 (svær): FEV1 30–49 %" };
    return { grad: 4, tekst: "GOLD 4 (meget svær): FEV1 < 30 %" };
  }

  // GOLD 2023–2025: E ved ≥ 2 moderate eksacerbationer eller ≥ 1 indlæggelse;
  // ellers B ved mMRC ≥ 2 eller CAT ≥ 10, og A ved færre symptomer.
  function abe(s) {
    const symptomer = s.mmrc >= 2 || s.cat >= 10;
    if (s.eksModerat + s.eksIndl >= 2 || s.eksIndl >= 1) return { gruppe: "E", symptomer };
    return { gruppe: symptomer ? "B" : "A", symptomer };
  }

  // DSAM: ICS indiceret ved ≥ 0,3; tvivlsom effekt ved 0,10–0,29; ikke ved < 0,10.
  function eosKat(eos) {
    if (isNaN(eos)) return "ukendt";
    if (eos >= 0.3) return "hoej";
    if (eos >= 0.1) return "mellem";
    return "lav";
  }

  // ---------------------------------------------------------------------
  // Præparater (eksempler)
  // ---------------------------------------------------------------------

  const P = {
    lama: [
      { navn: "Spiriva Respimat (tiotropium)", indhold: "LAMA, inhalationsvæske 2,5 mikrog./pust", dosering: "2 pust × 1 dagligt. Respimat kræver ikke kraftig indånding." },
      { navn: "Incruse Ellipta (umeclidinium)", indhold: "LAMA, pulver 55 mikrog.", dosering: "1 inhalation × 1 dagligt." },
    ],
    laba: [{ navn: "Striverdi Respimat (olodaterol)", indhold: "LABA, inhalationsvæske 2,5 mikrog./pust", dosering: "2 pust × 1 dagligt." }],
    dobbelt: [
      { navn: "Spiolto Respimat (tiotropium/olodaterol)", indhold: "LAMA + LABA, inhalationsvæske", dosering: "2 pust × 1 dagligt." },
      { navn: "Anoro Ellipta (umeclidinium/vilanterol)", indhold: "LAMA + LABA, pulver 55/22 mikrog.", dosering: "1 inhalation × 1 dagligt." },
      { navn: "Ultibro Breezhaler (glycopyrronium/indacaterol)", indhold: "LAMA + LABA, pulver i kapsler", dosering: "1 kapsel inhaleres × 1 dagligt." },
    ],
    triple: [
      { navn: "Trelegy Ellipta (fluticasonfuroat/umeclidinium/vilanterol)", indhold: "ICS + LAMA + LABA, pulver 92/55/22 mikrog.", dosering: "1 inhalation × 1 dagligt. Skyl munden efter brug." },
      { navn: "Trimbow (beclometason/formoterol/glycopyrronium)", indhold: "ICS + LABA + LAMA, spray 87/5/9 mikrog.", dosering: "2 pust × 2 dagligt, gerne med spacer. Skyl munden efter brug." },
      { navn: "Trixeo Aerosphere (budesonid/glycopyrronium/formoterol)", indhold: "ICS + LAMA + LABA, spray", dosering: "2 pust × 2 dagligt. Skyl munden efter brug." },
    ],
    roflumilast: [{ navn: "Daxas (roflumilast)", indhold: "PDE4-hæmmer, tablet", dosering: "250 mikrog. × 1 dagligt i 4 uger, derefter 500 mikrog. × 1. Kun ved FEV1 < 50 % og kronisk bronkitis. Hyppige bivirkninger: kvalme, diarré, vægttab; forsigtighed ved depression." }],
    azithro: [{ navn: "Azithromycin (profylakse)", indhold: "Makrolid (off-label)", dosering: "250 mg dagligt eller 500 mg × 3 ugentligt i op til 1 år — bedst dokumenteret hos tidligere rygere. Tag EKG (QTc) og vurdér hørelse før opstart." }],
  };

  function rows(klasse, tag) {
    return P[klasse].map((p, i) => Object.assign({ key: `${klasse}|${p.navn}`, tag: i === 0 ? tag : "Alternativ", tagClass: i === 0 ? "tag-recommend" : "tag-alt" }, p));
  }

  function drugTable(list) {
    const h = ["Præparat (eksempel)", "Type", "Dosering"];
    return `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${list
      .map((r) => `<tr><td>${r.navn}<span class="tag ${r.tagClass}">${r.tag}</span>${valg.radio(r.key)}</td><td data-label="${h[1]}">${r.indhold}</td><td data-label="${h[2]}">${r.dosering}</td></tr>`)
      .join("")}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------------
  // Behandlingsforslag
  // ---------------------------------------------------------------------

  // Returnerer { titel, tekst[], klasser: [[klasse, tag]], noter[] }.
  function behandling(s, g) {
    const e = eosKat(s.eos);
    const astma = has(s.andet, "astma");
    const bronkitis = has(s.andet, "bronkitis");
    const tidlRyger = s.ryger !== "ryger";
    const out = { titel: "", tekst: [], klasser: [], noter: [] };
    const eosUkendt = "Mål eosinofile i stabil fase — de afgør, om inhalationssteroid (ICS) skal med.";

    if (astma) out.noter.push("<strong>Samtidig astma:</strong> behandl som astma — inhalationssteroid skal indgå, og LABA eller LAMA må ikke gives uden ICS.");

    if (s.beh === "ingen") {
      out.titel = `Opstart — gruppe ${g.gruppe}`;
      if (g.gruppe === "A") {
        out.tekst.push("En langtidsvirkende bronkodilatator. LAMA foretrækkes ofte, da den forebygger eksacerbationer bedre end LABA. Korttidsvirkende bronkodilatator efter behov. Vurdér effekten efter 4–8 uger, og stop, hvis den ikke hjælper.");
        out.klasser.push(["lama", "Anbefalet"], ["laba", "Alternativ"]);
      } else if (g.gruppe === "B") {
        out.tekst.push("LAMA + LABA i ét inhalationsdevice (GOLD 2025) — bedre effekt på åndenød end monoterapi.");
        out.klasser.push(["dobbelt", "Anbefalet"]);
      } else {
        if (e === "hoej" || astma) {
          out.tekst.push(`Gruppe E${e === "hoej" ? ` med eosinofile ${fmt(s.eos, 2)} mia./l (≥ 0,3)` : ""}: LAMA + LABA + ICS (triple) kan overvejes fra start (GOLD 2025, DSAM).`);
          out.klasser.push(["triple", "Anbefalet"], ["dobbelt", "Alternativ"]);
        } else {
          out.tekst.push("Gruppe E: LAMA + LABA. ICS lægges ikke til fra start ved eosinofile under 0,3 mia./l.");
          if (e === "ukendt") out.noter.push(eosUkendt);
          out.klasser.push(["dobbelt", "Anbefalet"]);
        }
      }
      return out;
    }

    // Opfølgning: eksacerbationer vejer tungest, ellers åndenød (GOLD 2025).
    const eksDominerer = g.gruppe === "E";
    if (!has(s.andet, "teknik")) out.noter.push("<strong>Først:</strong> kontrollér inhalationsteknik og adhærens — det er den hyppigste årsag til manglende effekt.");

    if (eksDominerer) {
      out.titel = "Opfølgning — fortsatte eksacerbationer";
      if (s.beh === "mono") {
        if (e === "hoej") {
          out.tekst.push("På monoterapi med eosinofile ≥ 0,3: skift til LAMA + LABA + ICS.");
          out.klasser.push(["triple", "Anbefalet"], ["dobbelt", "Alternativ"]);
        } else {
          out.tekst.push("På monoterapi: skift til LAMA + LABA.");
          if (e === "ukendt") out.noter.push(eosUkendt);
          out.klasser.push(["dobbelt", "Anbefalet"]);
        }
      } else if (s.beh === "dobbelt" || s.beh === "icslaba") {
        if (e === "hoej" || e === "mellem") {
          out.tekst.push(`${s.beh === "dobbelt" ? "På LAMA + LABA" : "På ICS + LABA"} med eosinofile ${fmt(s.eos, 2)} mia./l (≥ 0,1): optrap til LAMA + LABA + ICS (GOLD 2025).${e === "mellem" ? " DSAM vurderer effekten af ICS som tvivlsom ved 0,10–0,29 — afvej mod risikoen for pneumoni." : ""}`);
          out.klasser.push(["triple", "Anbefalet"]);
        } else if (e === "lav") {
          if (s.beh === "icslaba") {
            out.tekst.push("På ICS + LABA med eosinofile < 0,1: ICS har formentlig ingen effekt — skift til LAMA + LABA.");
            out.klasser.push(["dobbelt", "Anbefalet"]);
          } else {
            out.tekst.push("På LAMA + LABA med eosinofile < 0,1: ICS anbefales ikke. Overvej roflumilast (ved FEV1 < 50 % og kronisk bronkitis) eller azithromycin (særligt tidligere rygere) — ofte efter aftale med lungemedicinsk afdeling.");
            if (!isNaN(s.fev1) && s.fev1 < 50 && bronkitis) out.klasser.push(["roflumilast", "Kan overvejes"]);
            out.klasser.push(["azithro", tidlRyger ? "Kan overvejes" : "Mindre effekt hos rygere"]);
          }
        } else {
          out.tekst.push("Mål eosinofile: ved ≥ 0,1 mia./l optrappes til LAMA + LABA + ICS; ved < 0,1 overvejes roflumilast eller azithromycin.");
          out.klasser.push(["triple", "Hvis eosinofile ≥ 0,1"]);
        }
      } else {
        out.tekst.push("Eksacerbationer trods triple-behandling: henvis til lungemedicinsk vurdering. Muligheder er roflumilast (FEV1 < 50 % og kronisk bronkitis), azithromycin (særligt tidligere rygere) og — ved eosinofile ≥ 0,3 og kronisk bronkitis — biologisk behandling (dupilumab) i specialistregi.");
        if (!isNaN(s.fev1) && s.fev1 < 50 && bronkitis) out.klasser.push(["roflumilast", "Kan overvejes"]);
        out.klasser.push(["azithro", tidlRyger ? "Kan overvejes" : "Mindre effekt hos rygere"]);
      }
    } else if (g.symptomer) {
      out.titel = "Opfølgning — vedvarende åndenød";
      if (s.beh === "mono") {
        out.tekst.push("Vedvarende åndenød på monoterapi: skift til LAMA + LABA.");
        out.klasser.push(["dobbelt", "Anbefalet"]);
      } else if (s.beh === "icslaba") {
        if (e === "lav" || (!astma && e !== "hoej" && s.eksModerat + s.eksIndl === 0)) {
          out.tekst.push("På ICS + LABA uden eksacerbationer og uden høje eosinofile: ICS er formentlig ikke indiceret — skift til LAMA + LABA.");
          out.klasser.push(["dobbelt", "Anbefalet"]);
        } else {
          out.tekst.push("På ICS + LABA med relevant ICS-indikation: læg LAMA til (triple).");
          out.klasser.push(["triple", "Anbefalet"]);
        }
      } else {
        out.tekst.push(`Allerede ${s.beh === "triple" ? "triple-behandling" : "LAMA + LABA"}: ingen yderligere inhalationsmedicin forbedrer åndenøden meningsfuldt. Overvej skift af device eller molekyle, og udred andre årsager (hjertesvigt, anæmi, dekonditionering, angst, overvægt). Rehabilitering har størst effekt.`);
      }
    } else {
      out.titel = "Opfølgning — stabil";
      out.tekst.push("Få symptomer og ingen eksacerbationer af betydning: fortsæt nuværende behandling.");
      if (s.beh === "icslaba" || s.beh === "triple") {
        if (!astma && (e === "lav" || (has(s.andet, "pneumoni") && e !== "hoej"))) out.tekst.push("Overvej at seponere ICS (eosinofile < 0,1 eller gentagne pneumonier) — men ikke ved eosinofile ≥ 0,3 eller samtidig astma.");
      }
    }
    if (has(s.andet, "pneumoni") && (s.beh === "icslaba" || s.beh === "triple" || out.klasser.some(([k]) => k === "triple"))) {
      out.noter.push("<strong>Gentagne pneumonier:</strong> ICS øger risikoen for pneumoni — vær tilbageholdende, og overvej seponering, medmindre eosinofile er ≥ 0,3 eller der er samtidig astma.");
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  let last = null;

  function update() {
    const s = getState();
    alderWarning.textContent = !isNaN(s.alder) && (s.alder < 18 || s.alder > 110) ? "Alder virker usædvanlig — tjek indtastningen." : "";
    const warn = [];
    if (!isNaN(s.ratio) && (s.ratio < 0.2 || s.ratio > 1)) warn.push("FEV1/FVC skal være mellem 0,20 og 1,00.");
    if (!isNaN(s.fev1) && (s.fev1 < 5 || s.fev1 > 150)) warn.push("FEV1 % af forventet virker usædvanlig.");
    spiroWarning.textContent = warn.join(" ");
    last = { s, g: null, b: null, grad: null };
    let html = "";

    const grad = goldGrad(s.fev1);
    last.grad = grad;

    // 1. Diagnose
    if (!isNaN(s.ratio) && s.ratio >= 0.7) {
      const prism = !isNaN(s.fev1) && s.fev1 < 80;
      html += box(
        "box-amber",
        "Ingen obstruktion efter GOLD-kriteriet",
        `<p>FEV1/FVC ${fmt(s.ratio, 2)} er ≥ 0,70 efter bronkodilatator — KOL kan ikke diagnosticeres på denne måling.${prism ? ` FEV1 er dog ${fmt(s.fev1, 0)} % af forventet (PRISm — nedsat lungefunktion uden obstruktion): overvej restriktiv lungesygdom, overvægt, hjertesvigt eller begyndende KOL, og gentag spirometri.` : ""}</p>
        ${ul(["Overvej differentialdiagnoser: astma (variabel obstruktion), hjertesvigt, bronkiektasier, lungecancer, anæmi og dekonditionering.", "Tjek, at spirometrien er udført korrekt og efter bronkodilatator.", "Rygestop og fysisk aktivitet gælder uanset diagnosen."])}`
      );
      output.innerHTML = html + sourceNote();
      return;
    }
    const diagBody = [];
    if (isNaN(s.ratio)) diagBody.push("Diagnosen kræver FEV1/FVC < 0,70 efter bronkodilatator — indtast spirometrien.");
    else diagBody.push(`FEV1/FVC ${fmt(s.ratio, 2)} (< 0,70) efter bronkodilatator: vedvarende luftvejsobstruktion forenelig med KOL.`);
    if (grad) diagBody.push(`${grad.tekst} (FEV1 ${fmt(s.fev1, 0)} % af forventet).`);
    if (!isNaN(s.alder) && s.alder >= 70 && !isNaN(s.ratio) && s.ratio >= 0.65) diagBody.push("Hos ældre kan den faste grænse 0,70 give overdiagnostik — ved grænseværdier og få symptomer bør diagnosen vurderes kritisk (LLN).");
    if (!isNaN(s.alder) && s.alder < 45) diagBody.push("KOL før 45 år: mål alfa-1-antitrypsin, og overvej henvisning.");

    // 2. Gruppe
    const g = abe(s);
    last.g = g;
    const catTxt = isNaN(s.cat) ? "" : `, CAT ${s.cat}`;
    const gruppeTxt = {
      A: "Få symptomer og højst 1 moderat eksacerbation uden indlæggelse.",
      B: "Betydende symptomer (mMRC ≥ 2 eller CAT ≥ 10) og højst 1 moderat eksacerbation uden indlæggelse.",
      E: "≥ 2 moderate eksacerbationer eller ≥ 1 indlæggelse det seneste år — uanset symptomer.",
    }[g.gruppe];
    html += box(
      g.gruppe === "E" ? "box-red" : g.gruppe === "B" ? "box-amber" : "box-green",
      `ABE-gruppe ${g.gruppe}${grad ? ` · GOLD ${grad.grad}` : ""}`,
      `<p>${gruppeTxt}</p><p>mMRC ${s.mmrc}${catTxt}; eksacerbationer: ${s.eksModerat} moderat(e), ${s.eksIndl} indlæggelse(r).</p>
      ${diagBody.map((t) => `<p>${t}</p>`).join("")}`
    );

    // 3. Behandling
    const b = behandling(s, g);
    last.b = b;
    const list = b.klasser.flatMap(([k, tag]) => rows(k, tag));
    html += box(
      "box-green",
      `Behandling: ${b.titel}`,
      `${b.tekst.map((t) => `<p>${t}</p>`).join("")}
      ${list.length ? drugTable(list) : ""}
      ${b.noter.length ? ul(b.noter) : ""}
      <p>Vælg device efter patientens evne: pulverinhalatorer kræver kraftig indånding; Respimat og spray (med spacer) er alternativer ved lav inspiratorisk kraft. Alle patienter har korttidsvirkende bronkodilatator (fx salbutamol) efter behov.</p>`
    );

    // 4. Eosinofile
    const e = eosKat(s.eos);
    const eosTxt = {
      hoej: `Eosinofile ${fmt(s.eos, 2)} mia./l (≥ 0,3): ICS er indiceret ved eksacerbationer; ICS bør ikke seponeres.`,
      mellem: `Eosinofile ${fmt(s.eos, 2)} mia./l (0,10–0,29): tvivlsom effekt af ICS (DSAM) — overvejes ved gentagne eksacerbationer trods LAMA + LABA (GOLD).`,
      lav: `Eosinofile ${fmt(s.eos, 2)} mia./l (< 0,10): ICS er ikke indiceret — øger risikoen for pneumoni uden gevinst.`,
      ukendt: "Eosinofile er ikke angivet — mål dem i stabil fase, før ICS overvejes.",
    }[e];
    html += collapsible("box-blue", "Eosinofile og inhalationssteroid", `<p>${eosTxt}</p><p>Tærskler (DSAM): ≥ 0,3 mia./l indiceret; 0,10–0,29 tvivlsom effekt; &lt; 0,10 ikke indiceret. ICS bruges ved KOL kun sammen med LAMA + LABA eller LABA — aldrig alene.</p>`);

    // 5. Ikke-farmakologisk
    const tiltag = [];
    if (s.ryger === "ryger") tiltag.push("<strong>Rygestop</strong> er det eneste, der bremser faldet i lungefunktion — tilbyd rygestopforløb og evt. vareniclin eller nikotinerstatning.");
    if (s.mmrc >= 2 || s.eksIndl >= 1) tiltag.push(`<strong>KOL-rehabilitering</strong> (kommunalt, ca. 6–8 uger) — ${s.eksIndl >= 1 ? "også efter indlæggelse, helst inden for 4 uger" : "ved mMRC ≥ 2 (MRC ≥ 3)"}.`);
    else tiltag.push("<strong>Fysisk aktivitet</strong> dagligt; rehabilitering tilbydes, når åndenøden begrænser (mMRC ≥ 2).");
    tiltag.push(`<strong>Vaccination:</strong> influenza og covid-19 årligt (gratis ved KOL); pneumokokvaccine (klausuleret tilskud)${!isNaN(s.alder) && s.alder >= 60 ? "; RSV-vaccine (klausuleret tilskud fra 60 år ved KOL)" : "; RSV-vaccine fra 60 år (klausuleret tilskud)"}.`);
    tiltag.push("<strong>Ernæring:</strong> vægt og BMI ved hver kontrol — vægttab og lav BMI forværrer prognosen.");
    if (!isNaN(s.spo2) && s.spo2 <= 92) tiltag.push(`<strong>Saturation ${s.spo2} % i hvile:</strong> henvis til vurdering af iltbehov (a-punktur) — ilt er indiceret ved PaO<sub>2</sub> &lt; 7,3 kPa, eller 7,3–8,0 kPa ved cor pulmonale, perifere ødemer eller polycytæmi.`);
    tiltag.push("<strong>Handleplan for eksacerbation</strong> og kendt kontaktvej — evt. prednisolon og antibiotika i reserve til udvalgte patienter.");
    html += box("box-blue", "Ikke-farmakologisk behandling", ul(tiltag));

    // 6. Eksacerbation
    html += collapsible(
      "box-blue",
      "Eksacerbation — behandling i almen praksis",
      ul([
        "<strong>Prednisolon 37,5 mg × 1 dagligt i 5 dage</strong> — ingen udtrapning.",
        "<strong>Antibiotika</strong> ved øget mængde og øget purulens af ekspektorat: amoxicillin 750 mg × 3 dagligt i 5 dage. Ved penicillinallergi: doxycyclin 200 mg første dag, derefter 100 mg dagligt i 4 dage. Ved let KOL og CRP &lt; 50 kan man ofte observere uden antibiotika.",
        "Øg korttidsvirkende bronkodilatator; tjek inhalationsteknik.",
        "<strong>Indlæggelse</strong> ved svær åndenød i hvile, SAT &lt; 90 % trods vanlig behandling, konfusion, nyopstået cyanose eller ødemer, eller manglende effekt af behandling.",
        "<strong>Kontrol efter 1–2 uger</strong> og revurdering af vedligeholdelsesbehandlingen — en eksacerbation flytter ofte patienten til gruppe E.",
      ])
    );

    // 7. Kontrol og henvisning
    html += collapsible(
      "box-blue",
      "Kontrol og henvisning",
      `<p><strong>Årlig kontrol</strong> (oftere ved gruppe E og efter indlæggelse): spirometri, mMRC/CAT, eksacerbationer, inhalationsteknik og adhærens, rygning, vægt, saturation, vaccinationer og handleplan.</p>
      ${ul([
        "<strong>Alfa-1-antitrypsin</strong> måles mindst én gang (GOLD) — særligt ved ung alder, få pakkeår eller familiær disposition.",
        "<strong>Henvis til lungemedicinsk afdeling</strong> ved diagnostisk tvivl, KOL før 45 år, eksacerbationer trods triple-behandling (roflumilast, azithromycin, biologisk behandling), GOLD 4, behov for ilt eller vurdering af lungevolumenreduktion.",
        "<strong>Hæmoptyse, vægttab eller ændret hoste</strong> hos ryger: udred for lungekræft (pakkeforløb).",
      ])}`
    );

    output.innerHTML = html + sourceNote();
  }

  function sourceNote() {
    return `<p class="source-note">GOLD 2025 og DSAM. Præparatnavnene er eksempler — følg regionens basisliste, og kontrollér dosis på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`;
  }

  // ---------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------

  function buildJournalNote() {
    const { s, g, b, grad } = last;
    const lines = [`KOL — status ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    basis.push({ ryger: "ryger", tidligere: "tidligere ryger", aldrig: "aldrig røget" }[s.ryger]);
    if (!isNaN(s.ratio)) basis.push(`FEV1/FVC ${fmt(s.ratio, 2)}`);
    if (!isNaN(s.fev1)) basis.push(`FEV1 ${fmt(s.fev1, 0)} % af forventet`);
    lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    if (!g) {
      lines.push("Ingen obstruktion efter GOLD-kriteriet (FEV1/FVC ≥ 0,70) — KOL ikke påvist.");
      return lines.join("\n");
    }
    lines.push(`mMRC ${s.mmrc}${isNaN(s.cat) ? "" : `, CAT ${s.cat}`}. Eksacerbationer seneste år: ${s.eksModerat} moderat(e), ${s.eksIndl} indlæggelse(r).${isNaN(s.eos) ? "" : ` Eosinofile ${fmt(s.eos, 2)} mia./l.`}`);
    lines.push(`Vurdering: ABE-gruppe ${g.gruppe}${grad ? `, GOLD ${grad.grad}` : ""}. ${b.titel}.`);
    const row = valg.valgtRaekke();
    if (row) {
      const r = Behandlingsvalg.raekkeTekst(row);
      lines.push(`Valgt behandling: ${r.navn} — ${r.celler[1]}`);
    } else {
      const first = output.querySelector(".tag-recommend");
      if (first) {
        const r = Behandlingsvalg.raekkeTekst(first.closest("tr"));
        lines.push(`Førstevalg: ${r.navn} — ${r.celler[1]}`);
      } else if (b.tekst.length) lines.push(`Plan: ${b.tekst[0]}`);
    }
    const plan = [];
    if (s.ryger === "ryger") plan.push("rygestop tilbudt");
    if (s.mmrc >= 2 || s.eksIndl >= 1) plan.push("henvist/tilbudt rehabilitering");
    plan.push("inhalationsteknik gennemgået", "vaccination drøftet", "handleplan ved eksacerbation");
    lines.push(`Plan (tilpas): ${plan.join(", ")}. Kontrol 1–3 måneder efter behandlingsændring, ellers ${g.gruppe === "E" ? "hver 3.–6. måned" : "årligt"}.`);
    return lines.join("\n");
  }

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > p, :scope > details > ul").forEach((el) => {
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
