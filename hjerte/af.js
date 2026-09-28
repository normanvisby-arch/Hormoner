/*
 * Antikoagulation ved atrieflimren i almen praksis.
 * CHA2DS2-VA (ESC 2024, DCS), HAS-BLED som støtte til at håndtere
 * blødningsrisiko, DOAK-dosis efter produktresuméerne (Cockcroft-Gault) og
 * kontrolinterval efter EHRA's praktiske guide (2021).
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
  const printMeta = document.getElementById("printMeta");

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

  resetBtn.addEventListener("click", () => {
    form.reset();
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
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);

  function getState() {
    return {
      mand: document.querySelector('input[name="koen"]:checked').value === "mand",
      alder: num("alder"),
      vaegt: num("vaegt"),
      krea: num("krea"),
      cha: checked("cha"),
      klap: checked("klap").length > 0,
      bl: checked("bl"),
      med: checked("med"),
    };
  }

  const has = (list, k) => list.includes(k);
  const fmt1 = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;

  // Cockcroft-Gault med kreatinin i µmol/l (1,23 for mænd, 1,04 for kvinder).
  function crcl(s) {
    if ([s.alder, s.vaegt, s.krea].some(isNaN)) return NaN;
    return ((140 - s.alder) * s.vaegt * (s.mand ? 1.23 : 1.04)) / s.krea;
  }

  function chads(s) {
    const a = isNaN(s.alder) ? 0 : s.alder >= 75 ? 2 : s.alder >= 65 ? 1 : 0;
    const va = a + (has(s.cha, "c") ? 1 : 0) + (has(s.cha, "h") ? 1 : 0) + (has(s.cha, "d") ? 1 : 0) + (has(s.cha, "s") ? 2 : 0) + (has(s.cha, "v") ? 1 : 0);
    return { va, vasc: va + (s.mand ? 0 : 1) };
  }

  function hasBled(s) {
    const items = [];
    if (has(s.bl, "bt")) items.push("ukontrolleret blodtryk");
    if (has(s.bl, "nyre")) items.push("nyresygdom");
    if (has(s.bl, "lever")) items.push("leversygdom");
    if (has(s.cha, "s")) items.push("tidligere apopleksi");
    if (has(s.bl, "bloed")) items.push("blødning/anæmi");
    if (!isNaN(s.alder) && s.alder > 65) items.push("alder > 65");
    if (has(s.bl, "nsaid")) items.push("NSAID/trombocythæmmer");
    if (has(s.bl, "alkohol")) items.push("alkohol");
    return items;
  }

  // ---------------------------------------------------------------------
  // DOAK: dosis og status pr. præparat
  // ---------------------------------------------------------------------

  function doak(s, cl) {
    const m = (k) => has(s.med, k);
    const induktor = m("induktor");
    const res = [];

    // Apixaban
    {
      const r = { navn: "Apixaban", dosis: "5 mg × 2 dagligt", status: "ok", noter: [] };
      const kriterier = [s.alder >= 80 && "alder ≥ 80", s.vaegt <= 60 && "vægt ≤ 60 kg", s.krea >= 133 && "kreatinin ≥ 133 µmol/l"].filter(Boolean);
      if (cl < 15) Object.assign(r, { status: "frarådes", dosis: "Anbefales ikke", noter: ["kreatininclearance < 15 ml/min"] });
      else if (cl < 30) Object.assign(r, { status: "reduceret", dosis: "2,5 mg × 2 dagligt", noter: ["kreatininclearance 15–29 ml/min"] });
      else if (kriterier.length >= 2) Object.assign(r, { status: "reduceret", dosis: "2,5 mg × 2 dagligt", noter: [`mindst 2 af 3 kriterier: ${kriterier.join(", ")}`] });
      else if (kriterier.length === 1) r.noter.push(`kun 1 af 3 reduktionskriterier (${kriterier[0]}) — fuld dosis`);
      if (m("azol") || m("hiv")) Object.assign(r, { status: "frarådes", noter: r.noter.concat("stærk CYP3A4- og P-gp-hæmmer (azol/HIV-proteasehæmmer)") });
      if (induktor) Object.assign(r, { status: "frarådes", noter: r.noter.concat("enzyminduktor nedsætter effekten") });
      res.push(r);
    }
    // Rivaroxaban
    {
      const r = { navn: "Rivaroxaban", dosis: "20 mg × 1 dagligt med mad", status: "ok", noter: [] };
      if (cl < 15) Object.assign(r, { status: "frarådes", dosis: "Anbefales ikke", noter: ["kreatininclearance < 15 ml/min"] });
      else if (cl < 50) Object.assign(r, { status: "reduceret", dosis: "15 mg × 1 dagligt med mad", noter: ["kreatininclearance 15–49 ml/min"] });
      if (m("azol") || m("hiv")) Object.assign(r, { status: "frarådes", noter: r.noter.concat("stærk CYP3A4- og P-gp-hæmmer (azol/HIV-proteasehæmmer)") });
      if (m("dronedaron")) Object.assign(r, { status: "frarådes", noter: r.noter.concat("dronedaron (ingen data — undgås)") });
      if (induktor) Object.assign(r, { status: "frarådes", noter: r.noter.concat("enzyminduktor nedsætter effekten") });
      res.push(r);
    }
    // Edoxaban
    {
      const r = { navn: "Edoxaban", dosis: "60 mg × 1 dagligt", status: "ok", noter: [] };
      const grunde = [];
      if (cl >= 15 && cl <= 50) grunde.push("kreatininclearance 15–50 ml/min");
      if (s.vaegt <= 60) grunde.push("vægt ≤ 60 kg");
      const pgp = ["ciclosporin", "dronedaron", "makrolid", "azol"].filter(m);
      if (pgp.length) grunde.push("P-gp-hæmmer (ciclosporin, dronedaron, erythromycin eller ketoconazol)");
      if (cl < 15) Object.assign(r, { status: "frarådes", dosis: "Anbefales ikke", noter: ["kreatininclearance < 15 ml/min"] });
      else if (grunde.length) Object.assign(r, { status: "reduceret", dosis: "30 mg × 1 dagligt", noter: grunde });
      if (cl > 95) r.noter.push("kreatininclearance > 95 ml/min: tendens til mindre effekt — bruges kun efter nøje overvejelse");
      if (m("hiv")) Object.assign(r, { status: "frarådes", noter: r.noter.concat("HIV-proteasehæmmer (ingen data — undgås)") });
      if (induktor) Object.assign(r, { status: "frarådes", noter: r.noter.concat("enzyminduktor nedsætter effekten") });
      res.push(r);
    }
    // Dabigatran
    {
      const r = { navn: "Dabigatran", dosis: "150 mg × 2 dagligt", status: "ok", noter: [] };
      const overvej = [];
      if (cl < 30) Object.assign(r, { status: "kontraindiceret", dosis: "Kontraindiceret", noter: ["kreatininclearance < 30 ml/min"] });
      else {
        if (s.alder >= 80 || m("verapamil")) Object.assign(r, { status: "reduceret", dosis: "110 mg × 2 dagligt", noter: [s.alder >= 80 ? "alder ≥ 80" : "verapamil"] });
        if (s.alder >= 75 && s.alder < 80) overvej.push("alder 75–79");
        if (cl <= 50) overvej.push("kreatininclearance 30–50 ml/min");
        if (has(s.bl, "gi")) overvej.push("gastritis/øsofagitis/refluks");
        if (hasBled(s).length >= 3) overvej.push("øget blødningsrisiko");
        if (r.status === "ok" && overvej.length) Object.assign(r, { status: "overvej", dosis: "150 mg × 2 — overvej 110 mg × 2", noter: overvej });
        r.noter.push("udskilles ca. 80 % renalt — følg nyrefunktionen tæt");
      }
      const kontra = ["azol", "ciclosporin", "dronedaron"].filter(m);
      if (kontra.length) Object.assign(r, { status: "kontraindiceret", dosis: "Kontraindiceret", noter: r.noter.concat("ketoconazol/itraconazol, ciclosporin/tacrolimus eller dronedaron") });
      if (m("hiv")) Object.assign(r, { status: "frarådes", noter: r.noter.concat("HIV-proteasehæmmer (undgås)") });
      if (induktor) Object.assign(r, { status: "frarådes", noter: r.noter.concat("enzyminduktor nedsætter effekten") });
      res.push(r);
    }
    return res;
  }

  const STATUS = {
    ok: ["tag-recommend", "Standarddosis"],
    reduceret: ["tag-recommend", "Reduceret dosis"],
    overvej: ["tag-alt", "Overvej reduktion"],
    frarådes: ["tag-alt", "Frarådes"],
    kontraindiceret: ["tag-alt", "Kontraindiceret"],
  };

  function kontrolInterval(s, cl) {
    const grunde = [];
    let mdr = 12;
    if (s.alder >= 75) { mdr = 6; grunde.push("alder ≥ 75"); }
    if (cl < 60) {
      const n = Math.max(1, Math.floor(cl / 10));
      if (n < mdr) mdr = n;
      grunde.push(`kreatininclearance ${Math.round(cl)} ml/min (interval ≈ clearance/10 måneder)`);
    }
    return { mdr, grunde };
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  let last = null;

  function update() {
    const s = getState();
    alderWarning.textContent = !isNaN(s.alder) && (s.alder < 18 || s.alder > 110) ? "Alder virker usædvanlig — tjek indtastningen." : "";
    const sc = chads(s);
    const cl = crcl(s);
    const blod = hasBled(s);
    last = { s, sc, cl, blod, doaks: null };
    let html = "";

    if (s.klap) {
      html += box("box-red", "Mekanisk klap eller mitralstenose: VKA", "<p>DOAK er kontraindiceret ved mekanisk hjerteklap og ikke dokumenteret ved moderat–svær mitralstenose. Brug warfarin (VKA) efter aftale med kardiolog — uanset CHA₂DS₂-VA.</p>");
    }

    // CHA2DS2-VA
    let cls;
    let anbef;
    if (sc.va >= 2) { cls = "box-red"; anbef = "Antikoagulation <strong>anbefales</strong> (ESC 2024 klasse I; DCS)."; }
    else if (sc.va === 1) { cls = "box-amber"; anbef = "Antikoagulation <strong>bør overvejes</strong> — fælles beslutning med patienten (ESC 2024 klasse IIa)."; }
    else { cls = "box-green"; anbef = "Antikoagulation er ikke indiceret. Revurdér ved nye risikofaktorer og når patienten fylder 65 år."; }
    const punkter = [];
    if (!isNaN(s.alder) && s.alder >= 75) punkter.push("alder ≥ 75 (2)");
    else if (!isNaN(s.alder) && s.alder >= 65) punkter.push("alder 65–74 (1)");
    if (has(s.cha, "c")) punkter.push("hjertesvigt (1)");
    if (has(s.cha, "h")) punkter.push("hypertension (1)");
    if (has(s.cha, "d")) punkter.push("diabetes (1)");
    if (has(s.cha, "s")) punkter.push("apopleksi/TCI (2)");
    if (has(s.cha, "v")) punkter.push("karsygdom (1)");
    html += box(
      cls,
      `CHA₂DS₂-VA: ${sc.va} point`,
      `<p>${anbef}</p>
      <p>${punkter.length ? `Point for: ${punkter.join(", ")}.` : "Ingen point."}${isNaN(s.alder) ? " <em>Angiv alder — den indgår med op til 2 point.</em>" : ""}</p>
      <p>Til sammenligning CHA₂DS₂-VASc (med kvindeligt køn): ${sc.vasc} point. ESC 2024 og DCS bruger CHA₂DS₂-VA.</p>`
    );

    // DOAK
    if (sc.va >= 1 && !s.klap) {
      if (isNaN(cl)) {
        html += box("box-blue", "Valg og dosis af DOAK", "<p>Angiv alder, vægt og p-kreatinin — så beregnes kreatininclearance (Cockcroft-Gault) og dosis for hvert præparat.</p>");
      } else {
        const doaks = doak(s, cl);
        last.doaks = doaks;
        const h = ["Præparat", "Dosis", "Begrundelse"];
        const rows = doaks.map((d) => `<tr${d.status === "ok" || d.status === "reduceret" ? "" : ""}><td>${d.navn}<span class="tag ${STATUS[d.status][0]}">${STATUS[d.status][1]}</span></td><td data-label="${h[1]}">${d.dosis}</td><td data-label="${h[2]}">${d.noter.length ? d.noter.join("; ") : "—"}</td></tr>`).join("");
        html += box(
          "box-blue",
          `Valg og dosis af DOAK — kreatininclearance ${Math.round(cl)} ml/min`,
          `<p>DOAK er førstevalg frem for warfarin (DCS). Valget mellem præparaterne afgøres af nyrefunktion, interaktioner, dosering (1 eller 2 gange dagligt) og regionens anbefaling (basisliste/Medicinrådet).</p>
          <div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
          ${cl < 15 ? "<p><strong>Kreatininclearance under 15 ml/min:</strong> DOAK anbefales ikke — konferér med nefrolog/kardiolog.</p>" : ""}
          ${(s.vaegt > 120) ? "<p><strong>Vægt over 120 kg:</strong> begrænset dokumentation — apixaban eller rivaroxaban foretrækkes (EHRA).</p>" : ""}`
        );
        const iv = kontrolInterval(s, cl);
        html += box(
          "box-blue",
          `Kontrol: hver ${iv.mdr}. måned`,
          `<p>Hæmoglobin, nyre- og leverfunktion samt adhærens, blødning og dosis mindst hver ${iv.mdr}. måned${iv.grunde.length ? ` (${iv.grunde.join("; ")})` : " (årligt som minimum, EHRA)"}. Oftere ved akut sygdom, dehydrering eller ny medicin.</p>`
        );
      }
    }

    // Interaktioner uden for DOAK-tabellen
    const iaNoter = [];
    if (has(s.med, "amiodaron")) iaNoter.push("<strong>Amiodaron:</strong> øger DOAK-niveauet let — ingen dosisændring, men vær opmærksom på blødning.");
    if (has(s.med, "diltiazem")) iaNoter.push("<strong>Diltiazem:</strong> øger niveauet let — ingen dosisændring.");
    if (has(s.med, "makrolid")) iaNoter.push("<strong>Klaritromycin/erythromycin:</strong> øger niveauet — edoxaban reduceres ved erythromycin; forsigtighed med de øvrige.");
    if (has(s.med, "ssri")) iaNoter.push("<strong>SSRI/SNRI:</strong> øger blødningsrisikoen — overvej behov og mavesårsprofylakse.");
    if (has(s.bl, "nsaid")) iaNoter.push("<strong>NSAID/trombocythæmmer:</strong> undgå NSAID; trombocythæmmer kun ved klar indikation (fx nylig AKS/stent) efter kardiologisk plan.");
    if (iaNoter.length) html += box("box-amber", "Interaktioner og samtidig medicin", `<ul class="followup-list">${iaNoter.map((i) => `<li>${i}</li>`).join("")}</ul>`);

    // Blødningsrisiko
    const modificerbare = [];
    if (has(s.bl, "bt")) modificerbare.push("regulér blodtrykket");
    if (has(s.bl, "nsaid")) modificerbare.push("seponér NSAID/unødvendig trombocythæmmer");
    if (has(s.bl, "alkohol")) modificerbare.push("reducér alkohol");
    if (has(s.bl, "bloed")) modificerbare.push("udred og behandl anæmi/blødningskilde");
    html += box(
      blod.length >= 3 ? "box-amber" : "box-blue",
      `Blødningsrisiko: HAS-BLED ${blod.length}${blod.length >= 3 ? " (høj)" : ""}`,
      `<p>${blod.length ? `Faktorer: ${blod.join(", ")}.` : "Ingen markerede faktorer."} En høj score er <strong>ikke</strong> en grund til at undlade antikoagulation — håndtér de modificerbare faktorer og følg patienten tættere (ESC 2024).</p>
      ${modificerbare.length ? `<p><strong>Gør nu:</strong> ${modificerbare.join(", ")}.</p>` : ""}`
    );

    html += `<div class="box box-blue box-collapsible"><details><summary><h3>Nyopdaget atrieflimren i almen praksis</h3></summary>
      <ul class="followup-list">
        <li>EKG-bekræftelse; blodprøver (hæmoglobin, kreatinin/eGFR, elektrolytter, TSH, HbA1c, lipider) og vurdering af hjertesvigt; ekkokardiografi.</li>
        <li><strong>Frekvenskontrol:</strong> betablokker som udgangspunkt (diltiazem/verapamil ved bevaret uddrivningsfraktion). Mål hvilepuls under 110 — lavere ved symptomer.</li>
        <li><strong>Henvis</strong> ved symptomer trods frekvenskontrol, nydiagnosticeret hjertesvigt, ung alder eller ønske om rytmekontrol (kardiovertering/ablation). Akut indlæggelse ved hæmodynamisk påvirkning.</li>
        <li><strong>Risikofaktorer</strong> behandles aktivt: blodtryk, vægt, alkohol, søvnapnø, diabetes og fysisk aktivitet.</li>
      </ul></details></div>`;
    html += `<p class="source-note">Dosis efter produktresuméerne; kreatininclearance efter Cockcroft-Gault. Kontrollér altid dosis og interaktioner på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`;
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------

  function buildJournalNote() {
    const { s, sc, cl, blod, doaks } = last;
    const lines = [`Atrieflimren — AK-vurdering ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [s.mand ? "Mand" : "Kvinde"];
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    if (!isNaN(s.vaegt)) basis.push(`${fmt1(s.vaegt)} kg`);
    if (!isNaN(s.krea)) basis.push(`kreatinin ${s.krea} µmol/l`);
    if (!isNaN(cl)) basis.push(`kreatininclearance ${Math.round(cl)} ml/min`);
    lines.push(basis.join(", ") + ".");
    lines.push(`CHA2DS2-VA ${sc.va} (CHA2DS2-VASc ${sc.vasc}). HAS-BLED ${blod.length}${blod.length ? ` (${blod.join(", ")})` : ""}.`);
    const first = output.querySelector(".box p");
    if (first) lines.push(first.textContent.trim());
    if (doaks) lines.push("DOAK-dosis: " + doaks.map((d) => `${d.navn} ${d.dosis.toLowerCase()}`).join("; ") + ".");
    const kontrol = Array.from(output.querySelectorAll(".box h3")).find((h) => h.textContent.startsWith("Kontrol"));
    if (kontrol) lines.push(kontrol.textContent.trim() + ": Hb, nyre- og leverfunktion.");
    lines.push("Drøftet med patienten (tilpas): gevinst ved AK, blødningsrisiko og tegn på blødning, adhærens.");
    return lines.join("\n");
  }

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > ul").forEach((el) => {
        if (el.tagName === "P") lines.push(el.textContent.trim());
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else el.querySelectorAll("tbody tr").forEach((tr) => {
          const tds = tr.querySelectorAll("td");
          const tag = tds[0].querySelector(".tag");
          const navn = tds[0].firstChild.textContent.trim();
          lines.push(`  * ${navn} (${tag ? tag.textContent.trim() : ""}) — ${tds[1].textContent.trim()} — ${tds[2].textContent.trim()}`);
        });
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  update();
})();
