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
    valgt = "";
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
    if (has(s.bl, "nyre") || s.krea > 200) items.push("nyresygdom");
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

  // Alvorlighed: den højeste status vinder, så fx en kontraindikation aldrig
  // overskrives af en senere "frarådes".
  const RANK = { ok: 0, overvej: 1, reduceret: 2, frarådes: 3, kontraindiceret: 4 };
  function drug(navn, dosis) {
    return {
      navn,
      dosis,
      status: "ok",
      noter: [],
      set(status, dosis, note) {
        if (RANK[status] > RANK[this.status]) {
          this.status = status;
          if (dosis) this.dosis = dosis;
          else if (RANK[status] >= RANK.frarådes) this.dosis = status === "kontraindiceret" ? "Kontraindiceret" : "Anbefales ikke";
        }
        if (note) this.noter.push(note);
        return this;
      },
    };
  }

  function doak(s, cl) {
    const m = (k) => has(s.med, k);
    const induktor = m("induktor");
    const staerkAzol = m("ketoconazol") || m("azol");
    const res = [];

    // Apixaban
    {
      const r = drug("Apixaban", "5 mg × 2 dagligt");
      const kriterier = [s.alder >= 80 && "alder ≥ 80", s.vaegt <= 60 && "vægt ≤ 60 kg", s.krea >= 133 && "kreatinin ≥ 133 µmol/l"].filter(Boolean);
      if (cl < 15) r.set("frarådes", "Anbefales ikke", "kreatininclearance < 15 ml/min");
      else if (cl < 30) r.set("reduceret", "2,5 mg × 2 dagligt", "kreatininclearance 15–29 ml/min");
      else if (kriterier.length >= 2) r.set("reduceret", "2,5 mg × 2 dagligt", `mindst 2 af 3 kriterier: ${kriterier.join(", ")}`);
      else if (kriterier.length === 1) r.noter.push(`kun 1 af 3 reduktionskriterier (${kriterier[0]}) — fuld dosis`);
      if (staerkAzol || m("hiv")) r.set("frarådes", null, "stærk CYP3A4- og P-gp-hæmmer (azol-svampemiddel/HIV-proteasehæmmer)");
      if (induktor) r.set("frarådes", null, "enzyminduktor nedsætter effekten (EHRA: undgås; produktresumé: forsigtighed)");
      res.push(r);
    }
    // Rivaroxaban
    {
      const r = drug("Rivaroxaban", "20 mg × 1 dagligt med mad");
      if (cl < 15) r.set("frarådes", "Anbefales ikke", "kreatininclearance < 15 ml/min");
      else if (cl < 50) r.set("reduceret", "15 mg × 1 dagligt med mad", "kreatininclearance 15–49 ml/min");
      if (staerkAzol || m("hiv")) r.set("frarådes", null, "stærk CYP3A4- og P-gp-hæmmer (azol-svampemiddel/HIV-proteasehæmmer)");
      if (m("dronedaron")) r.set("frarådes", null, "dronedaron (ingen data — undgås)");
      if (m("klaritromycin") || m("erythromycin")) r.noter.push("makrolid: forsigtighed ved nedsat nyrefunktion");
      if (induktor) r.set("frarådes", null, "enzyminduktor nedsætter effekten");
      res.push(r);
    }
    // Edoxaban: 30 mg ved clearance 15–50, vægt ≤ 60 kg eller ciclosporin,
    // dronedaron, erythromycin eller ketoconazol (produktresumé).
    {
      const r = drug("Edoxaban", "60 mg × 1 dagligt");
      if (cl < 15) r.set("frarådes", "Anbefales ikke", "kreatininclearance < 15 ml/min");
      else {
        if (cl <= 50) r.set("reduceret", "30 mg × 1 dagligt", "kreatininclearance 15–50 ml/min");
        if (s.vaegt <= 60) r.set("reduceret", "30 mg × 1 dagligt", "vægt ≤ 60 kg");
        const pgp = [m("ciclosporin") && "ciclosporin", m("dronedaron") && "dronedaron", m("erythromycin") && "erythromycin", m("ketoconazol") && "ketoconazol/itraconazol"].filter(Boolean);
        if (pgp.length) r.set("reduceret", "30 mg × 1 dagligt", `P-gp-hæmmer: ${pgp.join(", ")}`);
      }
      if (cl > 95) r.noter.push("kreatininclearance > 95 ml/min: tendens til mindre effekt — bruges kun efter nøje overvejelse");
      if (m("hiv")) r.set("frarådes", null, "HIV-proteasehæmmer (ingen data — undgås)");
      if (induktor) r.set("frarådes", null, "enzyminduktor nedsætter effekten");
      res.push(r);
    }
    // Dabigatran
    {
      const r = drug("Dabigatran", "150 mg × 2 dagligt");
      const kontra = [cl < 30 && "kreatininclearance < 30 ml/min", m("ketoconazol") && "ketoconazol/itraconazol", m("ciclosporin") && "ciclosporin", m("dronedaron") && "dronedaron", m("glecaprevir") && "glecaprevir/pibrentasvir"].filter(Boolean);
      if (kontra.length) {
        r.set("kontraindiceret", "Kontraindiceret", kontra.join("; "));
      } else {
        if (s.alder >= 80 || m("verapamil")) r.set("reduceret", "110 mg × 2 dagligt", s.alder >= 80 ? "alder ≥ 80" : "verapamil");
        const overvej = [s.alder >= 75 && s.alder < 80 && "alder 75–79", cl <= 50 && "kreatininclearance 30–50 ml/min", has(s.bl, "gi") && "gastritis/øsofagitis/refluks", hasBled(s).length >= 3 && "øget blødningsrisiko"].filter(Boolean);
        if (overvej.length) r.set("overvej", "150 mg × 2 — overvej 110 mg × 2", overvej.join(", "));
        if (m("tacrolimus")) r.set("frarådes", null, "tacrolimus (ikke anbefalet)");
        if (m("azol")) r.noter.push("voriconazol/posaconazol: forsigtighed");
        if (m("klaritromycin")) r.noter.push("klaritromycin: forsigtighed");
        if (m("hiv")) r.set("frarådes", null, "HIV-proteasehæmmer (undgås)");
        if (induktor) r.set("frarådes", null, "enzyminduktor nedsætter effekten");
        r.noter.push("udskilles ca. 80 % renalt — følg nyrefunktionen tæt");
      }
      if (r.status === "overvej") r.valg = ["150 mg × 2 dagligt", "110 mg × 2 dagligt"];
      res.push(r);
    }
    // Doser, der kan vælges til journalnotatet (ikke ved frarådes/kontraindiceret).
    res.forEach((d) => { if (!d.valg) d.valg = RANK[d.status] < RANK.frarådes ? [d.dosis] : []; });
    return res;
  }

  // Lægens valg af behandling til journalnotatet. Bevares mellem genberegninger,
  // så længe valget stadig er muligt.
  let valgt = "";
  const ANDRE_VALG = [
    ["warfarin", "Warfarin (VKA) — dosering efter INR, mål 2–3"],
    ["ingen", "Ingen antikoagulation — fravalgt efter drøftelse"],
  ];
  output.addEventListener("change", (e) => {
    if (e.target.name === "valg") valgt = e.target.value;
  });

  function valgFieldset(doaks) {
    const opts = [];
    doaks.forEach((d) => d.valg.forEach((dosis) => opts.push([`${d.navn}|${dosis}`, `${d.navn} ${dosis}`])));
    ANDRE_VALG.forEach((o) => opts.push(o));
    if (!opts.some(([v]) => v === valgt)) valgt = "";
    const radios = opts.map(([v, label]) => `<label class="radio"><input type="radio" name="valg" value="${v}"${v === valgt ? " checked" : ""}> ${label}</label>`).join("");
    return `<fieldset class="valg"><legend>Valgt behandling til journalnotatet</legend>${radios}<p class="field-hint">Vælg den behandling, I er enige om — så nævner journalnotatet kun den. Uden valg listes alle mulige præparater.</p></fieldset>`;
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
    if (cl <= 60) {
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
      html += box("box-red", "Mekanisk klap eller mitralstenose: VKA", "<p>DOAK er kontraindiceret ved mekanisk hjerteklap og ikke dokumenteret ved moderat–svær mitralstenose. Brug warfarin (VKA) efter aftale med kardiolog — uanset CHA₂DS₂-VA.</p><p>Ved VKA tæller labilt INR (tid i terapeutisk interval under 60 %) med som et ekstra point i HAS-BLED.</p>");
    }

    // CHA2DS2-VA
    let cls;
    let anbef;
    if (sc.va >= 2) { cls = "box-red"; anbef = "Antikoagulation <strong>anbefales</strong> (ESC 2024 klasse I; DCS)."; }
    else if (sc.va === 1) { cls = "box-amber"; anbef = "Antikoagulation <strong>bør overvejes</strong> — fælles beslutning med patienten (ESC 2024 klasse IIa)."; }
    else { cls = "box-green"; anbef = "Antikoagulation er ikke indiceret. Revurdér ved nye risikofaktorer og når patienten fylder 65 år."; }
    // Uden alder kan en score under 2 være for lav (alder giver op til 2 point).
    if (isNaN(s.alder) && sc.va < 2) { cls = "box-amber"; anbef = "<strong>Angiv alder</strong> før anbefalingen — alder giver op til 2 point og kan ændre indikationen."; }
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
        const rows = doaks.map((d) => `<tr><td>${d.navn}<span class="tag ${STATUS[d.status][0]}">${STATUS[d.status][1]}</span></td><td data-label="${h[1]}">${d.dosis}</td><td data-label="${h[2]}">${d.noter.length ? d.noter.join("; ") : "—"}</td></tr>`).join("");
        html += box(
          "box-blue",
          `Valg og dosis af DOAK — kreatininclearance ${Math.round(cl)} ml/min`,
          `<p>DOAK er førstevalg frem for warfarin (DCS). Valget mellem præparaterne afgøres af nyrefunktion, interaktioner, dosering (1 eller 2 gange dagligt) og regionens anbefaling (basisliste/Medicinrådet).</p>
          <div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
          ${valgFieldset(doaks)}
          ${cl < 15 ? "<p><strong>Kreatininclearance under 15 ml/min:</strong> DOAK anbefales ikke — konferér med nefrolog/kardiolog.</p>" : ""}
          ${(s.vaegt > 120) ? "<p><strong>Vægt over 120 kg:</strong> Cockcroft-Gault med faktisk vægt overvurderer nyrefunktionen — vurdér også eGFR. Begrænset dokumentation; apixaban eller rivaroxaban foretrækkes (EHRA).</p>" : ""}`
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
    if (has(s.med, "erythromycin")) iaNoter.push("<strong>Erythromycin:</strong> øger DOAK-niveauet — edoxaban reduceres til 30 mg; forsigtighed med de øvrige.");
    if (has(s.med, "klaritromycin")) iaNoter.push("<strong>Klaritromycin:</strong> øger DOAK-niveauet — ingen dosisreduktion i produktresuméerne, men forsigtighed (især ved nedsat nyrefunktion).");
    if (has(s.med, "verapamil")) iaNoter.push("<strong>Verapamil:</strong> dabigatran 110 mg × 2; øvrige DOAK uden dosisændring.");
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
    // Uden DOAK-tabel (fx score 0 eller mekanisk klap) er der intet valg at huske.
    if (!output.querySelector('input[name="valg"]')) valgt = "";
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
    const [vNavn, vDosis] = valgt.split("|");
    const vDrug = doaks && vDosis ? doaks.find((d) => d.navn === vNavn) : null;
    if (vDrug) {
      lines.push(`Valgt behandling: ${vDrug.navn} ${vDosis.toLowerCase()}${vDrug.noter.length ? ` (${vDrug.noter.join("; ")})` : ""}.`);
    } else if (valgt === "warfarin") {
      lines.push("Valgt behandling: warfarin (VKA), dosering efter INR med mål 2–3.");
    } else if (valgt === "ingen") {
      lines.push("Antikoagulation fravalgt efter drøftelse med patienten (angiv begrundelse).");
    } else if (doaks) {
      const mulige = doaks.filter((d) => RANK[d.status] < RANK.frarådes);
      const ikke = doaks.filter((d) => RANK[d.status] >= RANK.frarådes);
      if (mulige.length) lines.push("Mulige DOAK/dosis: " + mulige.map((d) => `${d.navn} ${d.dosis.toLowerCase()}${d.noter.length ? ` (${d.noter.join("; ")})` : ""}`).join("; ") + ".");
      if (ikke.length) lines.push("Frarådes/kontraindiceret: " + ikke.map((d) => `${d.navn} — ${STATUS[d.status][1].toLowerCase()} (${d.noter.join("; ")})`).join("; ") + ".");
    }
    if (valgt === "ingen") {
      lines.push("Drøftet med patienten (tilpas): risiko for apopleksi uden AK; revurderes ved nye risikofaktorer.");
      return lines.join("\n");
    }
    const kontrol = Array.from(output.querySelectorAll(".box h3")).find((h) => h.textContent.startsWith("Kontrol"));
    if (valgt === "warfarin") lines.push("Kontrol: INR efter aftale; Hb og nyrefunktion mindst årligt.");
    else if (kontrol) lines.push(kontrol.textContent.trim() + ": Hb, nyre- og leverfunktion.");
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
