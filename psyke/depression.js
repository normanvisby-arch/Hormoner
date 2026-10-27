/*
 * Depression i almen praksis: MDI (Major Depression Inventory) med ICD-10-
 * algoritmen og sumscore, selvmordsrisiko, behandling efter sværhedsgrad,
 * valg og dosis af antidepressiva, prøver, opfølgning og journalnotat.
 */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = document.querySelector(".form-panel");
  const output = $("output");
  const copyStatus = $("copyStatus");
  const printMeta = $("printMeta");

  const num = (id) => {
    const v = $(id).value.replace(",", ".");
    return v === "" ? NaN : parseFloat(v);
  };
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const has = (list, k) => list.includes(k);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const box = (cls, titel, body) => `<div class="box ${cls}"><h3>${titel}</h3>${body}</div>`;
  const foldbar = (cls, titel, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${titel}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const lenke = (sti, tekst) => {
    const a = document.querySelector(`#linkKort a[data-sti="${sti}"]`);
    const href = a ? a.getAttribute("href") : sti;
    const ny = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${esc(href)}"${ny}>${tekst}</a>`;
  };

  // MDI (WHO/Bech). Spørgsmål 8 og 10 har a og b — den højeste tæller.
  const MDI = [
    ["1", "Har du følt dig trist til mode, ked af det?"],
    ["2", "Har du manglet interesse for dine daglige gøremål?"],
    ["3", "Har du følt, at du manglede energi og kræfter?"],
    ["4", "Har du haft mindre selvtillid?"],
    ["5", "Har du haft dårlig samvittighed eller skyldfølelse?"],
    ["6", "Har du følt, at livet ikke var værd at leve?"],
    ["7", "Har du haft besvær med at koncentrere dig, fx med at læse avis eller følge med i fjernsyn?"],
    ["8a", "Har du følt dig meget rastløs?"],
    ["8b", "Har du følt dig mere stille?"],
    ["9", "Har du haft besvær med at sove om natten?"],
    ["10a", "Har du haft nedsat appetit?"],
    ["10b", "Har du haft øget appetit?"],
  ];
  const SVAR = ["", "0 — aldrig", "1 — lidt af tiden", "2 — under halvdelen af tiden", "3 — over halvdelen af tiden", "4 — det meste af tiden", "5 — hele tiden"];
  $("mdi").innerHTML = MDI.map(([k, t]) => `<div class="mdi-row"><label for="mdi${k}"><span class="mdi-nr">${k}.</span> ${t}</label><select id="mdi${k}" data-mdi="${k}">${SVAR.map((s, i) => `<option value="${i ? i - 1 : ""}">${s || "—"}</option>`).join("")}</select></div>`).join("");

  const KERNE_NAVN = { 1: "nedtrykthed", 2: "nedsat interesse/lyst", 3: "nedsat energi" };
  const LEDSAGE_NAVN = { 4: "nedsat selvtillid", 5: "skyldfølelse", 6: "tanker om død/selvmord", 7: "koncentrationsbesvær", 8: "rastløshed eller hæmning", 9: "søvnforstyrrelser", 10: "appetitændring" };

  function mdiScore() {
    const v = {};
    let udfyldt = 0;
    MDI.forEach(([k]) => {
      const x = $(`mdi${k}`).value;
      v[k] = x === "" ? NaN : parseInt(x, 10);
      if (x !== "") udfyldt++;
    });
    const item = (k) => (k === 8 || k === 10 ? Math.max(isNaN(v[`${k}a`]) ? -1 : v[`${k}a`], isNaN(v[`${k}b`]) ? -1 : v[`${k}b`]) : isNaN(v[String(k)]) ? -1 : v[String(k)]);
    const items = {};
    for (let k = 1; k <= 10; k++) items[k] = item(k);
    const komplet = Object.values(items).every((x) => x >= 0);
    if (!udfyldt) return null;
    const sum = Object.values(items).reduce((a, x) => a + Math.max(0, x), 0);
    const kerne = [1, 2, 3].filter((k) => items[k] >= 4);
    const ledsage = [4, 5, 6, 7, 8, 9, 10].filter((k) => items[k] >= 3);
    let icd = "ingen";
    if (kerne.length === 3 && ledsage.length >= 5) icd = "svær";
    else if (kerne.length >= 2 && ledsage.length >= 4) icd = "moderat";
    else if (kerne.length >= 2 && ledsage.length >= 2) icd = "let";
    return { items, sum, kerne, ledsage, icd, komplet, udfyldt, item6: items[6] };
  }

  const sumGrad = (s) => (s >= 31 ? "svær" : s >= 26 ? "moderat" : s >= 21 ? "let" : "ingen");

  function getState() {
    const mdi = mdiScore();
    const total = num("mdiTotal");
    const sum = mdi ? mdi.sum : total;
    return {
      type: radio("type"),
      alder: num("alder"),
      forloeb: checked("forloeb"),
      mdi,
      sum,
      risiko: checked("risiko"),
      psyk: checked("psyk"),
      somatik: checked("somatik"),
      beh: radio("beh"),
      uger: num("uger"),
      mdiFoer: num("mdiFoer"),
      status: checked("status"),
    };
  }

  // Sværhedsgrad: ICD-10-algoritmen, hvis spørgsmålene er udfyldt — ellers sumscoren.
  function grad(s) {
    if (s.mdi && s.mdi.komplet) return { g: s.mdi.icd, kilde: "ICD-10-algoritmen" };
    if (!isNaN(s.sum)) return { g: sumGrad(s.sum), kilde: "sumscoren" };
    return { g: null };
  }

  // ---------------------------------------------------------------------
  // Selvmordsrisiko og psykiatri
  // ---------------------------------------------------------------------

  function selvmordBoks(s) {
    const i6 = s.mdi ? s.mdi.item6 : -1;
    const akut = has(s.risiko, "planer") || has(s.risiko, "afstand");
    if (akut) {
      return box("box-red", "⚠ Høj selvmordsrisiko", `<p><strong>Konkrete planer eller kan ikke tage afstand:</strong> akut psykiatrisk vurdering samme dag (psykiatrisk akutmodtagelse) — lad ikke patienten gå alene; inddrag pårørende.</p>${ul(["Fjern adgang til midler (medicin, våben).", "Ved tidligere forsøg: henvis til selvmordsforebyggende klinik efter vurderingen."])}`);
    }
    const tegn = [];
    if (has(s.risiko, "tanker")) tegn.push("selvmordstanker");
    if (i6 >= 3) tegn.push(`MDI spørgsmål 6 = ${i6}`);
    if (has(s.risiko, "forsoeg")) tegn.push("tidligere forsøg");
    if (has(s.risiko, "misbrug")) tegn.push("misbrug");
    if (has(s.risiko, "alene")) tegn.push("alene/tab");
    if (!tegn.length) {
      if (i6 >= 1) return box("box-amber", "Selvmordstanker?", "<p>MDI spørgsmål 6 er positivt — spørg direkte til selvmordstanker, planer og om patienten kan tage afstand.</p>");
      return "";
    }
    return box("box-amber", "Selvmordsrisiko — vurdér", `<p>Risikotegn: ${tegn.join(", ")}.</p>${ul([
      "Spørg til planer, forberedelser og om patienten troværdigt kan tage afstand — ved planer eller manglende afstand: akut psykiatrisk vurdering.",
      "Lav en kriseplan (hvem kontaktes, døgnåbne tilbud), og aftal tæt opfølgning — inden for få dage.",
      "Ved antidepressiva: små pakninger og opfølgning efter 1 uge (risikoen kan stige i starten).",
      has(s.risiko, "forsoeg") ? "Tidligere selvmordsforsøg: overvej henvisning til selvmordsforebyggende klinik." : "",
    ].filter(Boolean))}`);
  }

  function psykiatriBoks(s, g) {
    const p = [];
    if (has(s.psyk, "psykotisk")) p.push("<strong>Psykotiske symptomer:</strong> akut/subakut henvisning til psykiatrien — psykotisk depression behandles med antidepressivum og antipsykotikum.");
    if (has(s.psyk, "mani")) p.push("<strong>Tidligere mani/hypomani:</strong> mulig bipolar lidelse — ikke antidepressivum alene (risiko for omslag til mani); henvis til psykiatrien.");
    if (s.alder < 18) p.push("<strong>Under 18 år:</strong> henvis til børne- og ungdomspsykiatrien; antidepressiva startes kun efter specialistvurdering.");
    if (g.g === "svær" && !p.length) p.push("<strong>Svær depression:</strong> overvej henvisning til psykiatrien, især ved manglende effekt, nedsat funktion eller selvmordstanker.");
    if (has(s.status, "forsoeg2")) p.push("<strong>Behandlingsresistent</strong> (to antidepressiva uden effekt): henvis til psykiatrien.");
    if (!p.length) return "";
    return box(has(s.psyk, "psykotisk") || has(s.psyk, "mani") ? "box-red" : "box-amber", "Henvisning til psykiatrien", ul(p));
  }

  // ---------------------------------------------------------------------
  // Behandling
  // ---------------------------------------------------------------------

  const aeldre = (s) => s.alder >= 65;

  function praeparater(s) {
    const gravid = has(s.somatik, "gravid");
    const ssri = [];
    ssri.push(`<strong>Sertralin</strong> (førstevalg${gravid ? ", også ved graviditet og amning" : ""}): start 25–50 mg, øges efter 2–4 uger til 100 mg ved behov; højst 200 mg.`);
    ssri.push(`<strong>Escitalopram</strong> (ligeværdigt alternativ): ${aeldre(s) ? "5 mg, højst 10 mg (65 år og derover — QT)" : "10 mg, højst 20 mg"}.`);
    const andet = [];
    andet.push(`<strong>Mirtazapin</strong> 15–30 mg til natten${has(s.somatik, "soevn") ? " — godt valg ved søvnbesvær og vægttab" : " — ved søvnbesvær og vægttab"} (vægtøgning).`);
    andet.push("<strong>SNRI</strong> (venlafaxin, duloxetin) som 2. valg.");
    const forsigt = [];
    if (has(s.somatik, "bloedning")) forsigt.push("<strong>Blødningsrisiko:</strong> SSRI + antikoagulation/NSAID/trombocythæmmer øger risikoen for blødning — undgå NSAID, overvej protonpumpehæmmer; mirtazapin påvirker ikke trombocytterne.");
    if (has(s.somatik, "qt")) forsigt.push("<strong>QT:</strong> undgå citalopram og escitalopram ved QT-forlængelse; sertralin eller mirtazapin foretrækkes. EKG ved tvivl.");
    if (aeldre(s) || has(s.somatik, "natrium")) forsigt.push("<strong>Hyponatriæmi:</strong> natrium før start og efter 2–4 uger (ældre og diuretika) — især SSRI og SNRI.");
    if (gravid) forsigt.push("<strong>Graviditet/amning:</strong> sertralin er førstevalg; seponér ikke brat ved graviditet — aftal plan med fødestedet.");
    if (s.alder < 25) forsigt.push("<strong>Under 25 år:</strong> øget risiko for selvmordstanker i starten — kontakt efter 1 uge.");
    forsigt.push("Serotonergt syndrom: forsigtighed med tramadol, triptaner, lithium og perikon.");
    return `<p><strong>SSRI er førstevalg</strong> (pro.medicin.dk, regionernes basislister):</p>${ul(ssri)}<p>Ved manglende effekt eller bivirkninger:</p>${ul(andet)}${ul(forsigt)}`;
  }

  // Behandling efter sværhedsgrad som [klasse, titel, indhold].
  function behandling(s, g) {
    if (!g.g) return ["box-blue", "Behandling", "<p>Udfyld MDI — så vises behandling efter sværhedsgrad.</p>"];
    const fælles = [
      "Psykoedukation: depression er hyppig og kan behandles; søvn, døgnrytme, fysisk aktivitet og aktiviteter, der giver glæde.",
      "Vurdér sygemelding, arbejdsfastholdelse og belastninger (fx stress, sorg, misbrug).",
    ];
    const psykolog = `Henvisning til psykolog med tilskud (60 %) ved let til moderat depression fra 18 år${s.alder >= 18 && s.alder <= 24 ? " — gratis for 18–24-årige" : " (gratis for 18–24-årige)"}.`;
    if (g.g === "ingen") {
      return ["box-green", "Ingen depression efter MDI", `<p>Under grænsen for depression (${g.kilde}). Vurdér andre årsager til symptomerne — fx stress, sorg, angst, belastning, somatisk sygdom eller alkohol.</p>${ul(["Ny vurdering ved fortsatte symptomer om 2–4 uger."])}`];
    }
    if (g.g === "let") {
      return ["box-green", "Let depression — samtaler først", `${ul(["<strong>Samtaleterapi</strong> (støttende samtaler i praksis eller psykolog) er førstevalg — der er ingen sikker effekt af antidepressiva ved let depression.", psykolog, ...fælles, "Antidepressiva kun efter nøje overvejelse, fx ved tidligere effekt eller langvarigt forløb."])}`];
    }
    const intro = g.g === "moderat"
      ? ul(["<strong>Samtaleterapi (fx kognitiv adfærdsterapi) eller antidepressivum</strong> — vælg sammen med patienten; kombinationen er ofte bedst.", psykolog, ...fælles])
      : ul(["<strong>Antidepressivum og støttende samtaler</strong> — start medicin nu.", "Tæt opfølgning; overvej henvisning til psykiatrien.", ...fælles]);
    return [g.g === "svær" ? "box-amber" : "box-green", `${g.g === "moderat" ? "Moderat" : "Svær"} depression — behandling`, `${intro}${praeparater(s)}`];
  }

  // Opfølgning under behandling: respons, remission og varighed.
  function kontrolBoks(s) {
    if (s.type !== "kontrol") return "";
    const p = [];
    const nu = s.sum;
    if (!isNaN(nu) && !isNaN(s.mdiFoer) && s.mdiFoer > 0) {
      const fald = Math.round(((s.mdiFoer - nu) / s.mdiFoer) * 100);
      const remission = nu < 21;
      const respons = fald >= 50;
      p.push(`<strong>MDI ${s.mdiFoer} → ${nu}</strong> (${fald >= 0 ? `fald ${fald} %` : `stigning ${-fald} %`}): ${remission ? "remission (under 21)" : respons ? "respons (fald ≥ 50 %), men ikke remission" : fald >= 25 ? "delvis respons" : "ingen sikker effekt"}.`);
      if (remission) {
        p.push(has(s.forloeb, "flere") ? "<strong>Fortsæt i mindst 2 år</strong> (to eller flere tidligere episoder — høj risiko for tilbagefald), evt. vedvarende." : "<strong>Fortsæt i mindst 6 måneder efter remission</strong> i samme dosis, derefter aftrapning over mindst 4 uger.");
      } else if (s.uger >= 4) {
        if (s.beh !== "terapi") p.push(fald >= 25 ? "Delvis effekt efter 4–6 uger: øg dosis (fx sertralin 100–150 mg), eller tilføj samtaleterapi." : "Ingen effekt efter 4–6 uger i tilstrækkelig dosis: øg dosis, eller skift præparat (fx til escitalopram, mirtazapin eller SNRI). Tjek, at medicinen tages.");
        else p.push("Ingen tilstrækkelig effekt af samtaleterapi: overvej antidepressivum.");
      } else {
        p.push("Under 4 uger: effekten kommer gradvist — vurdér igen efter 4–6 uger. Bivirkninger (kvalme, uro, søvn) aftager ofte efter 1–2 uger.");
      }
    } else {
      p.push("Angiv MDI ved start og nu — så vurderes respons (fald ≥ 50 %) og remission (MDI under 21).");
    }
    if (has(s.status, "bivirk")) p.push("<strong>Bivirkninger:</strong> vurdér dosisreduktion eller skift; seksuelle bivirkninger og uro er hyppige ved SSRI.");
    p.push("Aftrapning: over mindst 4 uger (længere ved paroxetin og venlafaxin) — seponeringssymptomer er ikke tilbagefald.");
    return box("box-blue", "Opfølgning", ul(p));
  }

  function opfoelgningsplan(s, g) {
    if (s.type === "kontrol" || !g.g || g.g === "ingen") return "";
    return box("box-blue", "Opfølgningsplan", ul([
      "Kontakt efter 1–2 uger (efter 1 uge ved medicin under 25 år eller selvmordstanker): bivirkninger, selvmordstanker, at medicinen tages.",
      "Ny MDI efter 4–6 uger: respons = fald ≥ 50 %, remission = MDI under 21.",
      "Ingen effekt efter 4–6 uger i tilstrækkelig dosis: øg dosis eller skift; efter to forsøg henvises til psykiatrien.",
      "Varighed: mindst 6 måneder efter remission; ca. 2 år ved tilbagevendende depression.",
    ]));
  }

  // Prøver ved ny depression: somatiske årsager og udgangspunkt før medicin.
  function proeveBoks(s) {
    const r = [
      ["TSH", "Hypo- eller hyperthyreose", `Forhøjet TSH → se ${lenke("../thyreoidea/hypothyreose.html", "Hypothyreose")}.`],
      ["Hæmoglobin", "Anæmi (træthed, energitab)", "Lav → udred anæmi."],
      ["HbA1c eller glukose", "Diabetes", "≥ 48 mmol/mol → diabetes."],
      ["Natrium, kalium, calcium, kreatinin", "Elektrolytforstyrrelser, nyrefunktion", "Højt calcium (hyperparathyreoidisme) kan give depression; natrium er udgangspunkt før SSRI."],
      ["B12 (og folat)", "Mangel — især ældre og ved kognitive symptomer", "Lav → behandling; ved kognitive symptomer se " + lenke("demens.html", "Demens") + "."],
      ["Alkohol (AUDIT) og medicin", "Alkohol, glukokortikoid, isotretinoin, betablokkere m.fl.", "Overforbrug eller depressionsfremkaldende medicin → handling før/ved behandling."],
    ];
    if (aeldre(s) || has(s.somatik, "qt")) r.push(["EKG", "Før citalopram/escitalopram ved hjertesygdom eller høj alder", "QTc > 450/460 ms → vælg sertralin eller mirtazapin."]);
    const rows = r.map(([a, b, c]) => `<tr><td data-label="Prøve">${a}</td><td data-label="Hvorfor">${b}</td><td data-label="Hold øje med">${c}</td></tr>`).join("");
    const tabel = `<div class="drug-table-wrap"><table class="drug-table stack-mobile proever"><thead><tr><th>Prøve</th><th>Hvorfor</th><th>Hold øje med</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return s.type === "ny" ? box("box-blue", "Prøver ved ny depression", tabel) : foldbar("box-blue", "Prøver ved ny depression", tabel);
  }

  // ---------------------------------------------------------------------
  // Opdatering og journal
  // ---------------------------------------------------------------------

  let sidst = null;

  function mdiBoks(s, g) {
    if (!s.mdi && isNaN(s.sum)) return box("box-blue", "MDI", "<p>Udfyld de 10 spørgsmål (8 og 10 har a og b — den højeste tæller), eller angiv totalscoren.</p>");
    const linjer = [];
    if (s.mdi && s.mdi.komplet) {
      linjer.push(`<strong>ICD-10-algoritmen: ${s.mdi.icd === "ingen" ? "ingen depression" : `${s.mdi.icd} depression`}</strong> — kernesymptomer ${s.mdi.kerne.length}/3 (score 4–5)${s.mdi.kerne.length ? `: ${s.mdi.kerne.map((k) => KERNE_NAVN[k]).join(", ")}` : ""}; ledsagesymptomer ${s.mdi.ledsage.length}/7 (score 3–5)${s.mdi.ledsage.length ? `: ${s.mdi.ledsage.map((k) => LEDSAGE_NAVN[k]).join(", ")}` : ""}.`);
    } else if (s.mdi) {
      linjer.push(`${s.mdi.udfyldt} af 12 spørgsmål udfyldt — udfyld alle for ICD-10-algoritmen.`);
    }
    linjer.push(`<strong>Sumscore ${s.sum}</strong> af 50 — ${sumGrad(s.sum) === "ingen" ? "under 21 (ingen eller tvivlsom depression)" : `${sumGrad(s.sum)} depression (21–25 let, 26–30 moderat, ≥ 31 svær)`}.`);
    if (s.mdi && s.mdi.komplet && s.mdi.icd !== sumGrad(s.sum)) linjer.push("Algoritme og sumscore er uenige — ICD-10-algoritmen bruges til sværhedsgraden; sumscoren til at følge forløbet.");
    if (!has(s.forloeb, "to_uger")) linjer.push("<em>Symptomer under 2 uger opfylder ikke ICD-10 — vurdér igen.</em>");
    const cls = g.g === "svær" ? "box-amber" : g.g === "ingen" ? "box-green" : "box-blue";
    return box(cls, `MDI ${s.sum}${g.g && g.g !== "ingen" ? ` — ${g.g} depression` : ""}`, ul(linjer));
  }

  function update() {
    const s = getState();
    $("kontrolFelter").hidden = s.type !== "kontrol";
    const g = grad(s);
    sidst = { s, g };
    let html = selvmordBoks(s);
    html += psykiatriBoks(s, g);
    html += mdiBoks(s, g);
    html += kontrolBoks(s);
    const [cls, titel, indhold] = behandling(s, g);
    html += s.type === "ny" ? box(cls, titel, indhold) : foldbar(cls, titel, indhold);
    html += opfoelgningsplan(s, g);
    html += proeveBoks(s);
    output.innerHTML = html;
  }

  const tekst = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent.replace(/\s+/g, " ").trim();
  };

  function buildJournalNote() {
    const { s, g } = sidst;
    const L = [s.type === "kontrol" ? "Depression — opfølgning" : "Depression — vurdering"];
    const baggrund = [];
    if (!isNaN(s.alder)) baggrund.push(`${s.alder} år`);
    if (has(s.forloeb, "flere")) baggrund.push("to eller flere tidligere episoder");
    else if (has(s.forloeb, "tidligere")) baggrund.push("tidligere episode");
    if (!has(s.forloeb, "to_uger")) baggrund.push("symptomer under 2 uger");
    if (baggrund.length) L.push(`Baggrund: ${baggrund.join(", ")}.`);
    if (!isNaN(s.sum)) {
      let m = `MDI ${s.sum}`;
      if (s.mdi && s.mdi.komplet) m += ` (kerne ${s.mdi.kerne.length}/3, ledsage ${s.mdi.ledsage.length}/7; ICD-10: ${s.mdi.icd === "ingen" ? "ingen depression" : `${s.mdi.icd} depression`})`;
      else if (g.g) m += ` (sumscore: ${g.g === "ingen" ? "under 21" : `${g.g} depression`})`;
      L.push(m + ".");
    }
    const sm = [];
    if (has(s.risiko, "tanker")) sm.push("selvmordstanker");
    if (has(s.risiko, "planer")) sm.push("konkrete planer");
    if (has(s.risiko, "afstand")) sm.push("kan ikke tage afstand");
    if (has(s.risiko, "forsoeg")) sm.push("tidligere forsøg");
    L.push(sm.length ? `Selvmordsrisiko: ${sm.join(", ")}${has(s.risiko, "planer") || has(s.risiko, "afstand") ? " — akut psykiatrisk vurdering." : " — vurderet, kriseplan og tæt opfølgning."}` : "Selvmordstanker: afkræftet ved direkte spørgsmål (tilpas).");
    if (has(s.psyk, "psykotisk")) L.push("Psykotiske symptomer — henvist til psykiatrien.");
    if (has(s.psyk, "mani")) L.push("Tidligere mani/hypomani — mulig bipolar lidelse, henvist til psykiatrien.");
    const kontrol = Array.from(output.querySelectorAll(".box h3")).find((h) => h.textContent === "Opfølgning");
    if (kontrol) kontrol.closest(".box").querySelectorAll("li").forEach((li, i) => { if (i < 2) L.push(li.textContent.replace(/\s+/g, " ").trim()); });
    if (s.type === "ny" && g.g) {
      const plan = { ingen: "Plan: ingen depressionsbehandling; ny vurdering ved fortsatte symptomer.", let: "Plan: psykoedukation og samtaleterapi/henvisning til psykolog; ikke antidepressiva.", moderat: "Plan: samtaleterapi og/eller antidepressivum efter fælles beslutning (fx sertralin 50 mg).", svær: "Plan: antidepressivum (fx sertralin 50 mg) og støttende samtaler; overvej henvisning til psykiatrien." }[g.g];
      L.push(plan + " (tilpas)");
      if (g.g !== "ingen") L.push("Opfølgning: kontakt efter 1–2 uger, ny MDI efter 4–6 uger.");
    }
    return L.join("\n");
  }

  function buildFullText() {
    const L = [];
    output.querySelectorAll(".box").forEach((b) => {
      const h3 = b.querySelector("h3");
      if (h3) L.push(h3.textContent.trim().toUpperCase());
      b.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > p, :scope > details > ul, :scope > details > .drug-table-wrap").forEach((el) => {
        if (el.tagName === "P") L.push(el.textContent.replace(/\s+/g, " ").trim());
        else if (el.tagName === "UL") el.querySelectorAll(":scope > li").forEach((li) => L.push(`- ${li.textContent.replace(/\s+/g, " ").trim()}`));
        else el.querySelectorAll("tbody tr").forEach((tr) => L.push("  " + Array.from(tr.children).map((td) => td.textContent.trim()).join(" — ")));
      });
      L.push("");
    });
    return L.join("\n").trim();
  }

  function copyText(t) {
    const done = () => {
      copyStatus.textContent = "Kopieret ✓";
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    };
    const fail = () => (copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.");
    try {
      navigator.clipboard.writeText(t).then(done, fail);
    } catch (e) {
      fail();
    }
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  $("copyBtn").addEventListener("click", () => copyText(buildJournalNote()));
  $("copyFullBtn").addEventListener("click", () => copyText(buildFullText()));
  $("resetBtn").addEventListener("click", () => {
    form.reset();
    update();
  });
  const printBtn = $("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede værdier.";
      window.print();
    });
  }
  update();
})();
