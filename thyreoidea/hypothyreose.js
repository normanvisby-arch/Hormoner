/*
 * Hypothyreose hos voksne: tolkning af TSH og T4, behandlingsindikation ved
 * subklinisk hypothyreose, startdosis og dosisjustering af levothyroxin,
 * graviditet og kontrol. DES' NBV, DSAM og Lægehåndbogen; NICE NG145 hvor
 * danske kilder ikke er detaljerede.
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
  const dosisField = document.getElementById("dosisField");
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
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const has = (list, k) => list.includes(k);
  const fmt = (x) => String(Math.round(x * 100) / 100).replace(".", ",");
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const collapsible = (cls, title, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${title}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const r125 = (x) => Math.round(x / 12.5) * 12.5;
  const r25 = (x) => Math.round(x / 25) * 25;

  const TSH_NEDRE = 0.3;

  function getState() {
    const situation = radio("situation");
    dosisField.hidden = situation !== "beh";
    const ovre = num("tshOvre");
    return {
      situation,
      dosis: num("dosis"),
      alder: num("alder"),
      vaegt: num("vaegt"),
      tsh: num("tsh"),
      ovre: ovre >= 2 && ovre <= 8 ? ovre : 4.0,
      t4: radio("t4"),
      tpo: radio("tpo"),
      andet: checked("andet"),
    };
  }

  const gravid = (s) => has(s.andet, "gravid");
  const aeldre = (s) => !isNaN(s.alder) && s.alder >= 70;
  // Forsigtig opstart ved alder ≥ 60 eller iskæmisk hjertesygdom (Lægehåndbogen; NICE: ≥ 65).
  const forsigtig = (s) => has(s.andet, "hjerte") || (!isNaN(s.alder) && s.alder >= 60);

  // ---------------------------------------------------------------------
  // Tolkning (ubehandlet)
  // ---------------------------------------------------------------------

  function tolk(s) {
    if (isNaN(s.tsh)) return { kode: "mangler", titel: "Indtast TSH", cls: "box-blue", tekst: "Angiv TSH og, hvis målt, T4 og TPO-antistoffer." };
    if (s.tsh < TSH_NEDRE) {
      if (s.t4 === "lav") return { kode: "central", titel: "Lavt TSH og lavt T4 — mistanke om central hypothyreose", cls: "box-red", tekst: "Kan skyldes hypofyse- eller hypothalamussygdom, svær akut sygdom eller medicin (glukokortikoid). Henvis til endokrinolog — TSH kan ikke bruges til at styre behandlingen." };
      return { kode: "lav", titel: "Lavt TSH — ikke hypothyreose", cls: "box-blue", tekst: "Lavt TSH peger mod hyperthyreose (manifest eller subklinisk), som er uden for værktøjets område. Mål T4 og T3, og udred efter DSAM/DES." };
    }
    if (s.tsh <= s.ovre) {
      if (s.t4 === "lav") return { kode: "central", titel: "Normalt TSH og lavt T4 — overvej central hypothyreose", cls: "box-amber", tekst: "Et normalt TSH udelukker ikke central hypothyreose. Gentag prøverne; ved vedvarende lavt T4 eller hypofysesymptomer henvises til endokrinolog. Svær akut sygdom kan give samme billede." };
      if (s.t4 === "hoej") return { kode: "interferens", titel: "Normalt TSH og højt T4", cls: "box-amber", tekst: "Overvej analyseinterferens (fx biotin), nylig indtagelse af levothyroxin, akut sygdom eller — sjældent — TSH-producerende hypofyseadenom eller thyroideahormonresistens. Gentag prøverne; konferér med endokrinolog ved vedvarende fund." };
      return { kode: "normal", titel: "Normalt TSH — ingen hypothyreose", cls: "box-green", tekst: `TSH ${fmt(s.tsh)} mIE/l er inden for referencen.${s.tpo === "pos" ? " Positive TPO-antistoffer: øget risiko for hypothyreose senere — mål TSH ved symptomer og før graviditet." : ""}` };
    }
    if (s.t4 === "lav") return { kode: "manifest", titel: "Manifest primær hypothyreose", cls: "box-red", tekst: `TSH ${fmt(s.tsh)} mIE/l over referencen og lavt T4.` };
    if (s.t4 === "hoej") return { kode: "interferens", titel: "Højt TSH og højt T4", cls: "box-amber", tekst: "Usædvanlig kombination: overvej analyseinterferens, TSH-producerende hypofyseadenom eller thyroideahormonresistens. Henvis til endokrinolog." };
    if (s.t4 === "ukendt") return { kode: "ukendtT4", titel: `Forhøjet TSH (${fmt(s.tsh)} mIE/l) — T4 mangler`, cls: "box-amber", tekst: "Mål T4 (og TPO-antistoffer) for at skelne subklinisk fra manifest hypothyreose." };
    return { kode: "subklinisk", titel: "Subklinisk hypothyreose", cls: "box-amber", tekst: `TSH ${fmt(s.tsh)} mIE/l over referencen (${fmt(s.ovre)}) med normalt T4.` };
  }

  // ---------------------------------------------------------------------
  // Behandlingsbeslutning (ubehandlet)
  // ---------------------------------------------------------------------

  function beslutning(s, t) {
    const noter = [];
    let behandl = false;
    let tekst = "";
    if (has(s.andet, "akut")) noter.push("<strong>Nylig akut sygdom:</strong> TSH kan stige forbigående i restitutionsfasen (sjældent over 20). Gentag prøverne efter ca. 6 uger før beslutning, medmindre T4 er klart lavt.");
    if (has(s.andet, "postpartum")) noter.push("<strong>Efter fødsel:</strong> post partum-thyroiditis giver ofte forbigående hypothyreose — behandl ved symptomer eller ønske om ny graviditet, og forsøg seponering efter 6–12 måneder.");
    if (has(s.andet, "medicin")) noter.push("<strong>Amiodaron, lithium eller checkpointhæmmer:</strong> hypothyreose kan behandles med levothyroxin, mens medicinen fortsættes. Amiodaron-relateret thyroideasygdom konfereres med endokrinolog.");

    if (t.kode === "manifest") {
      behandl = true;
      tekst = "Behandling med levothyroxin er indiceret.";
    } else if (t.kode === "subklinisk") {
      if (gravid(s)) {
        behandl = true;
        tekst = "Graviditet: subklinisk hypothyreose behandles altid (risiko for komplikationer og fosterets hjerneudvikling). Henvis samtidig efter regionens retningslinje for thyroideasygdom i graviditeten.";
      } else if (has(s.andet, "planlaegger")) {
        behandl = true;
        tekst = "Planlagt graviditet: behandling anbefales, så TSH er under 2,5 mIE/l ved konception.";
      } else if (!has(s.andet, "bekraeftet")) {
        tekst = "Bekræft fundet: gentag TSH, T4 og TPO-antistoffer efter 1–3 måneder, før der tages stilling til behandling — forhøjet TSH normaliseres ofte spontant.";
      } else if (s.tsh >= 10) {
        if (aeldre(s)) tekst = "TSH ≥ 10 hos person over 70 år: individuel vurdering. Der er ikke vist gevinst af behandling i denne aldersgruppe — overvej behandling ved symptomer, ellers kontrol hver 6.–12. måned.";
        else {
          behandl = true;
          tekst = "TSH ≥ 10 bekræftet hos person under 70 år: behandling anbefales efter drøftelse af fordele og ulemper med patienten (DES).";
        }
      } else if (aeldre(s)) {
        tekst = "TSH under 10 hos person over 70 år: behandling anbefales ikke — TSH stiger normalt med alderen. Kontrol ved symptomer.";
      } else if (has(s.andet, "symptomer")) {
        behandl = true;
        tekst = "TSH under 10 med symptomer: forsøgsbehandling kan tilbydes (DES). Revurdér efter 3 måneder med TSH i målområdet — stop, hvis symptomerne ikke er bedret. Gevinsten er usikker og formentlig lille.";
      } else {
        tekst = `TSH under 10 uden symptomer: ingen behandling. Kontrol af TSH og T4 efter 3–6 måneder${s.tpo === "pos" ? ", derefter årligt — positive TPO-antistoffer giver ca. 4 % risiko pr. år for manifest hypothyreose" : ", derefter ved symptomer"}.`;
      }
    }
    return { behandl, tekst, noter };
  }

  // ---------------------------------------------------------------------
  // Dosis
  // ---------------------------------------------------------------------

  function tabletTekst(d) {
    const hel = Math.floor(d / 25) * 25;
    const rest = d - hel;
    return rest ? `${hel ? `${hel} mikrog. + ` : ""}½ tablet à 25 mikrog.` : `fx ${d} mikrog. som 1 tablet eller en kombination`;
  }
  function doseRow(key, d, tag, recommended, note) {
    return { key: `${key}|${d}`, navn: `Levothyroxin ${String(d).replace(".", ",")} mikrog. dagligt`, indhold: tabletTekst(d), dosering: note, tag, tagClass: recommended ? "tag-recommend" : "tag-alt" };
  }
  const indtag = "Fastende om morgenen med vand, mindst 30 min. før morgenmad.";

  function startDoser(s, t) {
    const rows = [];
    const fuld = !isNaN(s.vaegt) ? Math.max(25, Math.min(200, r25(1.6 * s.vaegt))) : null;
    if (t.kode === "manifest") {
      if (forsigtig(s) && !gravid(s)) {
        rows.push(doseRow("start", 25, "Anbefalet", true, `${indtag} Øg med 12,5–25 mikrog. hver 4.–6. uge efter TSH og tolerance${has(s.andet, "hjerte") ? " — langsomt ved iskæmisk hjertesygdom (12,5 mikrog. ved svær sygdom)" : ""}.`));
        rows.push(doseRow("start", 12.5, "Ved svær hjertesygdom", false, indtag));
      } else {
        if (fuld) rows.push(doseRow("start", fuld, gravid(s) ? "Anbefalet (graviditet)" : "Fuld dosis", true, `${indtag} Ca. 1,6 mikrog./kg — kan startes direkte hos yngre uden hjertesygdom.`));
        rows.push(doseRow("start", 50, fuld ? "Gradvis start" : "Anbefalet", !fuld, `${indtag} Øg med 25 mikrog. hver 4.–6. uge efter TSH (DES: start typisk 50–100 mikrog.).`));
      }
    } else {
      const lav = forsigtig(s) && !gravid(s);
      rows.push(doseRow("start", lav ? 25 : 50, "Anbefalet", true, `${indtag} Subklinisk hypothyreose kræver ofte kun 25–75 mikrog.`));
      rows.push(doseRow("start", lav ? 50 : 25, "Alternativ", false, indtag));
    }
    return { rows, fuld };
  }

  // I behandling: TSH-mål og dosisjustering.
  function justering(s) {
    const D = s.dosis;
    const maalOvre = gravid(s) ? 2.5 : aeldre(s) ? 6 : s.ovre;
    const res = { maalOvre, retning: "uaendret", rows: [], tekst: [], noter: [] };
    if (isNaN(s.tsh) || isNaN(D)) return res;
    if (has(s.andet, "hypofyse")) {
      res.noter.push("<strong>Central hypothyreose:</strong> TSH kan ikke bruges — dosis styres efter T4 (øvre halvdel af referencen) i samarbejde med endokrinolog.");
      return res;
    }
    if (gravid(s)) {
      const ny = r125(D * 1.25);
      res.retning = "op";
      res.tekst.push(`Graviditet: øg dosis med 20–30 % straks ved positiv graviditetstest — fx til ${String(ny).replace(".", ",")} mikrog. dagligt, eller 2 ekstra dagsdoser om ugen (+29 %). TSH-mål under 2,5 mIE/l i første trimester; TSH hver 4. uge til uge 20. Er dosis allerede øget i denne graviditet, justeres efter TSH (mål under 2,5).`);
      res.rows.push(doseRow("gravid", ny, "Anbefalet", true, "Ca. +25 %. Kontrol af TSH og T4 hver 4. uge. Tilbage til tidligere dosis efter fødslen."));
      res.rows.push({ key: "gravid|ekstra", navn: `${String(D).replace(".", ",")} mikrog. + 2 ekstra dagsdoser om ugen`, indhold: "Samme tablet — ingen ny recept", dosering: "Svarer til ca. +29 %.", tag: "Alternativ", tagClass: "tag-alt" });
      return res;
    }
    if (s.tsh > maalOvre) {
      res.retning = "op";
      const step = s.tsh > 10 ? 25 : 12.5;
      res.tekst.push(`TSH ${fmt(s.tsh)} mIE/l er over målet (${fmt(maalOvre)}): øg dosis med ${String(step).replace(".", ",")}–${s.tsh > 10 ? 50 : 25} mikrog.`);
      if (!isNaN(s.vaegt) && D / s.vaegt > 1.8) res.noter.push(`Dosis er allerede ${fmt(D / s.vaegt)} mikrog./kg: tjek adhærens, indtagelse (fastende), interaktioner (calcium, jern, PPI) og malabsorption (cøliaki, atrofisk gastritis), før dosis øges yderligere.`);
      res.rows.push(doseRow("op", D + step, "Anbefalet", true, "TSH og T4 efter 6–8 uger."));
      res.rows.push(doseRow("op", D + (step === 25 ? 50 : 25), "Alternativ", false, "TSH og T4 efter 6–8 uger."));
    } else if (s.tsh < TSH_NEDRE) {
      res.retning = "ned";
      const step = s.tsh < 0.1 ? 25 : 12.5;
      res.tekst.push(`TSH ${fmt(s.tsh)} mIE/l er under referencen: overbehandling øger risikoen for atrieflimren og osteoporose — især hos ældre. Reducér dosis med ${String(step).replace(".", ",")}–25 mikrog. (medmindre TSH bevidst holdes lavt efter thyroideacancer).`);
      if (D - step >= 12.5) res.rows.push(doseRow("ned", D - step, "Anbefalet", true, "TSH og T4 efter 6–8 uger."));
      if (step === 12.5 && D - 25 >= 12.5) res.rows.push(doseRow("ned", D - 25, "Alternativ", false, "TSH og T4 efter 6–8 uger."));
    } else {
      res.tekst.push(`TSH ${fmt(s.tsh)} mIE/l er i målområdet${aeldre(s) ? " (op til 4–6 mIE/l accepteres over 70 år)" : ""}: fortsæt uændret dosis.`);
      res.rows.push(doseRow("uaendret", D, "Uændret", true, "Årlig kontrol af TSH ved stabil dosis."));
      if (s.tsh > s.ovre && aeldre(s)) res.noter.push("TSH er over laboratoriets reference, men inden for det accepterede mål over 70 år.");
    }
    return res;
  }

  function drugTable(list) {
    const h = ["Dosis", "Tabletter", "Bemærkning"];
    return `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${list
      .map((r) => `<tr><td>${r.navn}<span class="tag ${r.tagClass}">${r.tag}</span>${valg.radio(r.key)}</td><td data-label="${h[1]}">${r.indhold}</td><td data-label="${h[2]}">${r.dosering}</td></tr>`)
      .join("")}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  let last = null;

  function update() {
    const s = getState();
    alderWarning.textContent = !isNaN(s.alder) && (s.alder < 18 || s.alder > 110) ? "Værktøjet gælder voksne — tjek alderen." : "";
    labWarning.textContent = !isNaN(s.tsh) && s.tsh > 150 ? "Meget højt TSH — tjek værdi og enhed." : "";
    let html = "";
    last = { s, t: null, b: null, j: null };

    if (s.situation === "beh") {
      const j = justering(s);
      last.j = j;
      if (isNaN(s.tsh) || (isNaN(s.dosis) && !has(s.andet, "hypofyse"))) {
        html += box("box-blue", "Indtast TSH og nuværende dosis", "<p>Angiv TSH og den daglige levothyroxin-dosis for at få forslag til justering.</p>");
      } else {
        const cls = j.retning === "uaendret" ? "box-green" : "box-amber";
        const titel = { op: "Øg dosis", ned: "Reducér dosis", uaendret: "Uændret dosis" }[j.retning];
        html += box(
          cls,
          has(s.andet, "hypofyse") ? "Central hypothyreose — styr efter T4" : `${titel} — TSH-mål op til ${fmt(j.maalOvre)} mIE/l`,
          `${j.tekst.map((t) => `<p>${t}</p>`).join("")}${j.rows.length ? drugTable(j.rows) : ""}${j.noter.length ? ul(j.noter) : ""}`
        );
      }
    } else {
      const t = tolk(s);
      last.t = t;
      html += box(t.cls, t.titel, `<p>${t.tekst}</p>${s.tpo === "pos" && t.kode !== "normal" ? "<p>Positive TPO-antistoffer: autoimmun thyroiditis (Hashimoto) er sandsynlig årsag.</p>" : ""}`);
      if (t.kode === "manifest" || t.kode === "subklinisk") {
        const b = beslutning(s, t);
        last.b = b;
        let body = `<p>${b.tekst}</p>`;
        if (b.behandl) {
          const { rows, fuld } = startDoser(s, t);
          body += drugTable(rows);
          if (!fuld && t.kode === "manifest" && !forsigtig(s)) body += "<p>Angiv vægten for at beregne fuld substitutionsdosis (ca. 1,6 mikrog./kg).</p>";
          body += "<p>Kontrol: TSH og T4 efter 6–8 uger (tidligst 4 uger), herefter efter hver dosisændring, og årligt når dosis er stabil.</p>";
        }
        if (b.noter.length) body += ul(b.noter);
        html += box(b.behandl ? "box-green" : "box-blue", b.behandl ? "Behandling" : "Ingen behandling nu", body);
      }
    }

    html += collapsible(
      "box-blue",
      "TSH-mål",
      ul([
        `Generelt: TSH inden for laboratoriets reference (ca. ${String(TSH_NEDRE).replace(".", ",")}–${fmt(s.ovre)} mIE/l).`,
        "Over 70 år: op til 4–6 mIE/l kan accepteres — undgå overbehandling (atrieflimren, osteoporose).",
        "Graviditet: under 2,5 mIE/l i første trimester (under 3,0 senere).",
        "Symptomer trods normalt TSH skyldes sjældent for lav dosis — overvej andre årsager (anæmi, D-vitaminmangel, søvnapnø, depression). Kombination med T3 aftales med endokrinolog.",
      ])
    );
    html += collapsible(
      "box-blue",
      "Indtagelse og interaktioner",
      ul([
        "Tages fastende om morgenen med vand, 30–60 min. før morgenmad og kaffe — eller konsekvent ved sengetid, mindst 3 timer efter aftensmad.",
        "<strong>Calcium, jern, magnesium og antacida</strong>: mindst 4 timers afstand.",
        "<strong>Protonpumpehæmmere, sucralfat, kolestyramin og sojaprodukter</strong> kan nedsætte optagelsen — kontrollér TSH ved opstart eller ophør.",
        "<strong>Østrogen</strong> (p-piller, MHT) og <strong>graviditet</strong> øger behovet; enzyminduktorer (fx carbamazepin, rifampicin) kan også øge det.",
        "Skift mellem præparater kan ændre optagelsen — kontrollér TSH 6–8 uger efter skift. Tabletstyrker i Danmark er fx 25, 50, 75, 100 og 125 mikrog.",
      ])
    );
    html += collapsible(
      "box-blue",
      "Graviditet og graviditetsønske",
      ul([
        "Kvinder i behandling øger dosis med 20–30 % straks ved positiv graviditetstest (fx 2 ekstra dagsdoser om ugen) og kontakter lægen.",
        "TSH og T4 hver 4. uge til ca. uge 20, derefter mindst én gang i hvert trimester. Tilbage til tidligere dosis efter fødslen og TSH efter 6 uger.",
        "Nyopdaget hypothyreose i graviditeten behandles straks — også subklinisk. Følg regionens retningslinje for henvisning.",
        "Ved graviditetsønske: TSH under 2,5 mIE/l før konception.",
      ])
    );
    html += collapsible(
      "box-blue",
      "Henvis til endokrinolog ved",
      ul([
        "Mistanke om central hypothyreose (lavt T4 uden højt TSH, hypofysesygdom).",
        "Uforklarlige kombinationer (højt TSH og højt T4), eller manglende effekt trods høj dosis og god adhærens.",
        "Svær iskæmisk hjertesygdom, hvor opstart er vanskelig.",
        "Struma, knuder, amiodaron-relateret thyroideasygdom eller ønske om kombinationsbehandling med T3.",
        "Graviditet efter regionens retningslinje.",
      ])
    );
    html += `<p class="source-note">DES' NBV, DSAM og Lægehåndbogen. Kontrollér præparater og dosis på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`;
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------

  function buildJournalNote() {
    const { s, t, b, j } = last;
    const lines = [`Hypothyreose — ${s.situation === "beh" ? "kontrol" : "vurdering"} ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (!isNaN(s.alder)) basis.push(`${s.alder} år`);
    if (!isNaN(s.vaegt)) basis.push(`${s.vaegt} kg`);
    if (!isNaN(s.tsh)) basis.push(`TSH ${fmt(s.tsh)} mIE/l`);
    basis.push({ ukendt: "T4 ikke målt", lav: "T4 lav", normal: "T4 normal", hoej: "T4 høj" }[s.t4]);
    if (s.tpo !== "ukendt") basis.push(`TPO-antistoffer ${s.tpo === "pos" ? "positive" : "negative"}`);
    if (s.situation === "beh" && !isNaN(s.dosis)) basis.push(`levothyroxin ${String(s.dosis).replace(".", ",")} mikrog. dagligt`);
    if (gravid(s)) basis.push("gravid");
    lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    if (t) lines.push(`Vurdering: ${t.titel}.`);
    if (b) lines.push(b.tekst);
    if (j && j.tekst.length) lines.push(j.tekst[0]);
    const row = valg.valgtRaekke() || (output.querySelector(".tag-recommend") || {}).closest?.("tr");
    if (row) {
      const r = Behandlingsvalg.raekkeTekst(row);
      lines.push(`${valg.valgtRaekke() ? "Valgt dosis" : "Plan"}: ${r.navn}.`);
      lines.push("Kontrol (tilpas): TSH og T4 efter 6–8 uger. Informeret om indtagelse fastende og interaktioner.");
    }
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
