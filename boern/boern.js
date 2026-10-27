/*
 * Forebyggende børneundersøgelser i almen praksis (5 uger – 5 år): tjekliste
 * pr. undersøgelse, milepæle (korrigeret alder ved for tidlig fødsel), alarmfund
 * med handling, vaccinationskalender og journalnotat.
 */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = document.querySelector(".form-panel");
  const output = $("output");
  const copyStatus = $("copyStatus");
  const printMeta = $("printMeta");

  const DAG = 864e5;
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const has = (list, k) => list.includes(k);
  const dato = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T00:00:00Z") : null);
  const fmtKort = (d) => d.toLocaleDateString("da-DK", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const iso = (d) => d.toISOString().slice(0, 10);
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
  const idag = () => {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  };
  // Læg måneder til en dato (kalendermåneder).
  const plusMdr = (d, m) => {
    const x = new Date(d.getTime());
    const dag = x.getUTCDate();
    x.setUTCMonth(x.getUTCMonth() + m);
    if (x.getUTCDate() !== dag) x.setUTCDate(0);
    return x;
  };

  const KONS = {
    "5u": { navn: "5-ugersundersøgelse", maal: "5 uger" },
    "5m": { navn: "5-månedersundersøgelse", maal: "5 måneder" },
    "12m": { navn: "12-månedersundersøgelse", maal: "12 måneder" },
    "2a": { navn: "2-årsundersøgelse", maal: "2 år" },
    "3a": { navn: "3-årsundersøgelse", maal: "3 år" },
    "4a": { navn: "4-årsundersøgelse", maal: "4 år" },
    "5a": { navn: "5-årsundersøgelse", maal: "5 år" },
  };
  const RAEKKE = ["5u", "5m", "12m", "2a", "3a", "4a", "5a"];
  // Planlagt tidspunkt i måneder (5 uger ≈ 1,15 måned).
  const KONS_MDR = { "5u": 1.15, "5m": 5, "12m": 12, "2a": 24, "3a": 36, "4a": 48, "5a": 60 };

  function alderTekst(dage) {
    if (dage < 0) return "";
    if (dage < 13 * 7) return `${Math.floor(dage / 7)} uger og ${dage % 7} dage`;
    const mdr = dage / 30.4375;
    if (mdr < 24) return `${Math.floor(mdr)} måneder`;
    const aar = Math.floor(mdr / 12);
    const rest = Math.floor(mdr - aar * 12);
    return `${aar} år${rest ? ` og ${rest} måneder` : ""}`;
  }

  function getState() {
    const foedt = dato($("foedt").value);
    const d = dato($("dato").value) || idag();
    const dage = foedt ? Math.round((d - foedt) / DAG) : NaN;
    const ga = parseInt($("ga").value, 10);
    const praematur = ga >= 22 && ga <= 36;
    // Korrigeret alder til 2 år (for udvikling).
    const korrDage = praematur && dage < 2 * 365 ? dage - (40 - ga) * 7 : dage;
    const mdr = dage / 30.4375;
    const valgt = radio("kons");
    let kons = valgt;
    if (valgt === "auto") {
      if (isNaN(dage) || mdr < 3) kons = "5u";
      else if (mdr < 8.5) kons = "5m";
      else if (mdr < 18) kons = "12m";
      else if (mdr < 30) kons = "2a";
      else if (mdr < 42) kons = "3a";
      else if (mdr < 54) kons = "4a";
      else kons = "5a";
    }
    return {
      foedt, dato: d, dage, mdr, korrDage, praematur, ga, valgt, kons,
      dreng: radio("koen") === "dreng",
      vacc: radio("vacc"),
      forhold: checked("forhold"),
      fund: checked("fund"),
    };
  }

  // ---------------------------------------------------------------------
  // Tjekliste og milepæle
  // ---------------------------------------------------------------------

  const MILE = {
    "5u": ["Løfter hovedet kortvarigt i maveleje", "Fikserer og følger med øjnene", "Smiler socialt (ca. 6 uger)", "Reagerer på lyd"],
    "5m": ["Holder hovedet stabilt; løfter sig på underarmene", "Drejer fra mave til ryg", "Griber om ting og fører dem til munden; flytter mellem hænderne", "Pludrer, smiler og griner; øjenkontakt"],
    "12m": ["Sidder selv (fra ca. 9 måneder); rejser sig ved møbler, går evt. med støtte", "Pincetgreb", "Pludrer med konsonanter, siger evt. enkelte ord; reagerer på sit navn", "Peger, vinker; er forsigtig over for fremmede"],
    "2a": ["Går sikkert (senest 18 måneder), løber og sparker til en bold", "Mange enkeltord og begynder at sætte to ord sammen", "Peger for at vise, leger \"som om\", forstår enkle beskeder"],
    "3a": ["Taler i korte sætninger, som fremmede for det meste forstår", "Går på trapper, hopper samlet", "Leger med andre børn; ofte tør om dagen"],
    "4a": ["Fortæller sammenhængende; forstår spørgsmål", "Hopper på ét ben, tegner et menneske (hoved og ben)", "Klæder sig af og på med lidt hjælp; leger rollelege"],
    "5a": ["Taler forståeligt med korrekt sætningsbygning", "Hopper, balancerer, kan gribe en bold; holder rigtigt på blyanten", "Kan vente på tur, følge regler og koncentrere sig om en opgave (skoleparathed)"],
  };

  function tjekliste(s) {
    const t = [];
    const add = (id, tekst) => t.push({ id, tekst });
    const k = s.kons;
    add("samtale", "Samtale med forældrene: trivsel, udvikling, sygdom, søvn og spisning");
    add("vaekst", k === "5u" || k === "5m" || k === "12m" ? "Vægt, længde og hovedomfang på vækstkurven" : "Vægt og højde på vækstkurven" + (k !== "2a" ? " og iso-BMI" : " (iso-BMI fra 2 år)"));
    if (k === "5u") {
      add("foraeldre", "Forældrenes trivsel: tegn på fødselsdepression hos mor og far, netværk og søvn");
      add("ernaering", "Ernæring og vægtøgning; gulsot efter 2 uger og afføringens farve");
      add("kranie", "Kranie og fontanel; hovedform (lejringsbetinget skævhed)");
      add("oejne", "Øjne: rød refleks og fiksation");
      add("hjerte", "Hjerte: mislyd og femoralispulse");
      add("hofter", "Hofter: Ortolani, Barlow, Galeazzi og abduktion");
      add("genitalia", s.dreng ? "Testikler i scrotum; ydre genitalia" : "Ydre genitalia");
      add("hud", "Hud og navle");
      add("neuro", "Tonus, bevægelsernes symmetri og reflekser");
    } else if (k === "5m" || k === "12m") {
      add("oejne", "Øjne: rød refleks og skelen");
      add("hofter", "Hofter: abduktion og Galeazzi");
      if (s.dreng) add("genitalia", "Testikler i scrotum");
      add("neuro", "Tonus, symmetri og motorik (håndpræference før 12 måneder er et alarmtegn)");
      if (k === "12m") add("hoerelse", "Reagerer på lyde og sit navn");
    } else {
      add("oejne", k === "4a" || k === "5a" ? "Øjne: skelen og synsprøve (billed- eller bogstavtavle), hvis barnet kan medvirke" : "Øjne: skelen (afdækningsprøve)");
      add("hoerelse", "Hørelse og sprog — forældrenes bekymring");
      add("taender", "Tænder: tandbørstning med fluortandpasta to gange dagligt og kommunal tandpleje");
      if (k === "2a") add("samspil", "Socialt samspil og kommunikation (pegen, øjenkontakt, fælles opmærksomhed)");
      if (k === "5a") add("skole", "Skoleparathed: sprog, motorik, koncentration og social udvikling");
    }
    add("udvikling", `Udvikling svarende til alderen${s.praematur && s.dage < 730 ? " (korrigeret)" : ""} — se milepæle`);
    add("vaccination", vaccTekst(k));
    add("vejledning", vejledningKort(k));
    return t;
  }

  function vaccTekst(k) {
    return {
      "5u": "Vaccinationsprogrammet gennemgået (første vaccination ved 3 måneder)",
      "5m": "Vaccination: DiTeKiPol/Hib og pneumokok (2. dosis, 5 måneder)",
      "12m": "Vaccination: DiTeKiPol/Hib og pneumokok (3. dosis, 12 måneder); MFR planlagt ved 15 måneder",
      "2a": "Vaccinationsstatus tjekket (MFR 1 ved 15 måneder givet?); influenza i sæsonen (2–6 år)",
      "3a": "Vaccinationsstatus tjekket; influenza i sæsonen",
      "4a": "Vaccination: MFR (2. dosis, 4 år)",
      "5a": "Vaccination: DiTeKiPol (revaccination, 5 år)",
    }[k];
  }

  function vejledningKort(k) {
    return {
      "5u": "Vejledning: rygleje og røgfrit miljø, D-vitamin 10 mikrog. dagligt fra 2 uger, aldrig ryste barnet",
      "5m": "Vejledning: overgangskost fra 4–6 måneder, D-vitamin, ulykker (fald fra puslebord), søvn",
      "12m": "Vejledning: tandbørstning med fluortandpasta, ulykker (forgiftning, drukning, skoldning), kost, søvn",
      "2a": "Vejledning: sprogstimulering, skærmtid, kost og bevægelse, søvn",
      "3a": "Vejledning: kost og bevægelse, søvn, toilettræning, trivsel i institution",
      "4a": "Vejledning: kost og bevægelse, skærmtid, trafiksikkerhed",
      "5a": "Vejledning: skolestart, kost og bevægelse, søvn, skærmtid",
    }[k];
  }

  const afkrydset = new Set();
  output.addEventListener("change", (e) => {
    const id = e.target.dataset && e.target.dataset.tjek;
    if (!id) return;
    if (e.target.checked) afkrydset.add(id);
    else afkrydset.delete(id);
    const t = sidst.tjek;
    const n = t.filter((x) => afkrydset.has(`${sidst.s.kons}:${x.id}`)).length;
    $("tjekStatus").textContent = `${n} af ${t.length} gennemgået`;
  });

  function tjekBoks(s, t) {
    const n = t.filter((x) => afkrydset.has(`${s.kons}:${x.id}`)).length;
    const items = t.map((x) => {
      const key = `${s.kons}:${x.id}`;
      return `<li><label class="checkbox"><input type="checkbox" data-tjek="${esc(key)}"${afkrydset.has(key) ? " checked" : ""}> ${x.tekst}</label></li>`;
    }).join("");
    return box("box-green", `Tjekliste — ${KONS[s.kons].navn}`, `<p class="tjek-status" id="tjekStatus" aria-live="polite">${n} af ${t.length} gennemgået</p><ul class="tjekliste">${items}</ul><p class="field-hint">Afkrydsningerne kommer med i journalnotatet og huskes kun, mens siden er åben.</p>`);
  }

  // ---------------------------------------------------------------------
  // Alarmfund
  // ---------------------------------------------------------------------

  function alarmer(s) {
    const roed = [];
    const gul = [];
    const f = (k) => has(s.fund, k);
    if (f("hofte")) roed.push("<strong>Ustabil hofte eller positiv Ortolani/Barlow:</strong> hurtig henvisning til børneortopædkirurg (ultralyd). Abduktionsindskrænkning efter 3 måneder: billeddiagnostik og henvisning.");
    if (f("refleks")) roed.push("<strong>Manglende/ujævn rød refleks eller hvid pupil:</strong> henvis akut til øjenafdeling (katarakt, retinoblastom).");
    if (f("femoralis")) roed.push("<strong>Svage eller manglende femoralispulse:</strong> akut pædiatrisk vurdering (coarctatio aortae).");
    if (f("icterus")) roed.push("<strong>Gulsot efter 2 ugers alder (3 uger ved fuld amning) eller lys afføring:</strong> konjugeret bilirubin samme dag — udeluk galdegangsatresi.");
    if (f("tab")) roed.push("<strong>Tab af færdigheder:</strong> altid hurtig henvisning til pædiatrisk afdeling.");
    if (f("mislyd")) gul.push(`<strong>Hjertemislyd:</strong> ${s.dage < 90 ? "henvis til pædiatrisk kardiologisk vurdering; akut ved åndenød, spisebesvær, cyanose eller dårlig trivsel" : "uskyldig mislyd er hyppig — henvis ved nyopdaget mislyd med kendetegn på patologi eller symptomer"}.`);
    if (f("skelen")) gul.push("<strong>Skelen:</strong> henvis til øjenlæge (risiko for amblyopi) — konstant skelen i alle aldre og vedvarende skelen efter 4 måneder.");
    if (f("testis")) gul.push(`<strong>Testikel ikke i scrotum:</strong> henvis til børnekirurgi/urologi ved 3 måneders alder efter termin eller straks, hvis barnet er ældre (DPS 2025); operation ved 6–12 måneder. Begge testikler ikke-palpable ved fødslen: straks (udeluk kønsudviklingsforstyrrelse).`);
    if (f("hovedomfang")) gul.push("<strong>Hovedomfang krydser percentiler:</strong> henvis til pædiatri (hydrocephalus, mikrocefali) — akut ved spændt fontanel, opkastning eller sløvhed.");
    if (f("vaekst")) gul.push("<strong>Trivsel/vækst:</strong> ernæringsanamnese og vækstkurve over tid; henvis til pædiatri ved vedvarende fald over to percentiler eller samtidige symptomer.");
    if (f("overvaegt")) gul.push("<strong>Overvægt (iso-BMI ≥ 25):</strong> samtale om kost, bevægelse, søvn og skærm; kommunale tilbud; ved iso-BMI ≥ 30 eller hurtig stigning overvej pædiatri.");
    if (f("motorik")) gul.push("<strong>Motorisk forsinkelse, asymmetri eller tidlig håndpræference:</strong> neurologisk undersøgelse og henvisning til pædiatri; går ikke selv ved 18 måneder → børnelæge.");
    if (f("sprog")) gul.push("<strong>Sprog/hørelse:</strong> hørevurdering (øre-næse-halslæge/audiologi) og kommunens tale-høre-pædagog; pædiatri ved samtidig anden forsinkelse.");
    if (f("socialt")) gul.push("<strong>Manglende øjenkontakt, pegen eller socialt samspil:</strong> mulig autismespektrumforstyrrelse — henvis til børnepsykiatri eller pædiatri efter regionens vej.");
    if (f("foraeldre")) gul.push(`<strong>Forælder med tegn på fødselsdepression:</strong> samtale (EPDS), behandling og samarbejde med sundhedsplejersken — se ${lenke("../psyke/depression.html", "Depression")}.`);
    if (f("omsorg")) gul.push("<strong>Bekymring for barnets trivsel eller omsorg:</strong> læger har skærpet underretningspligt — underret kommunen.");
    if (f("roeg")) gul.push("<strong>Rygning i hjemmet:</strong> rådgiv om røgfrit miljø (vuggedød, luftvejsinfektioner) og rygestop.");
    return { roed, gul };
  }

  // ---------------------------------------------------------------------
  // Vaccinationer
  // ---------------------------------------------------------------------

  const PROGRAM = [
    [3, "DiTeKiPol/Hib + pneumokok (1)"],
    [5, "DiTeKiPol/Hib + pneumokok (2)"],
    [12, "DiTeKiPol/Hib + pneumokok (3)"],
    [15, "MFR (1)"],
    [48, "MFR (2)"],
    [60, "DiTeKiPol (revaccination)"],
    [144, "HPV (2 doser med mindst 5 måneders mellemrum)"],
  ];

  function vaccineBoks(s) {
    const l = [];
    if (s.vacc === "mangler") l.push("<strong>Mangler vaccinationer:</strong> giv de manglende doser nu efter SSI's vejledning om forsinkede vaccinationer (alle kan indhentes; MFR fra 12 måneder).");
    if (s.vacc === "fravalgt") l.push("<strong>Fravalgt vaccination:</strong> giv saglig information om sygdomme og bivirkninger, respektér valget, og tilbyd igen ved næste undersøgelse.");
    if (has(s.forhold, "hepb")) l.push("<strong>Mor er hepatitis B-positiv:</strong> hepatitis B-vaccine ved fødslen (med immunglobulin), 1, 2 og 12 måneder — og antistofkontrol efter sidste dosis.");
    l.push("Pneumokok: fra 1. november 2025 bruges Vaxneuvance; er der startet med Prevenar 13, gøres serien færdig med samme vaccine.");
    if (s.mdr >= 18 && s.mdr < 84) l.push("Influenza: næsespray til 2–6-årige i sæsonen, når Sundhedsstyrelsen tilbyder det (første gang 2 doser med 4 ugers mellemrum).");
    let tabel = "";
    if (s.foedt) {
      const rows = PROGRAM.map(([m, v]) => {
        const d = plusMdr(s.foedt, m);
        const cls = d < s.dato - 14 * DAG ? "passeret" : d <= plusMdr(s.dato, 1) ? "nu" : "";
        return `<tr class="${cls}"><td>${m < 24 ? `${m} mdr.` : `${m / 12} år`}</td><td>${fmtKort(d)}</td><td>${v}</td></tr>`;
      }).join("");
      tabel = `<div class="drug-table-wrap"><table class="drug-table tidslinje"><thead><tr><th>Alder</th><th>Dato</th><th>Vaccine</th></tr></thead><tbody>${rows}</tbody></table></div><p class="field-hint">Fremhævet = aktuelt; grå = passeret (tjek, at de er givet).</p>`;
    }
    return box(s.vacc === "ok" ? "box-blue" : "box-amber", "Vaccinationer", `${ul(l)}${tabel}`);
  }

  // ---------------------------------------------------------------------
  // Opdatering og journal
  // ---------------------------------------------------------------------

  let sidst = null;

  function hovedBoks(s) {
    if (!s.foedt) return box("box-blue", KONS[s.kons].navn, "<p>Angiv fødselsdato — så beregnes alder, korrigeret alder og vaccinationsdatoer.</p>");
    const l = [`Alder: <strong>${alderTekst(s.dage)}</strong>${s.praematur && s.dage < 730 ? ` (korrigeret alder ${alderTekst(Math.max(0, s.korrDage))}, født i uge ${s.ga})` : ""}.`];
    const forventet = KONS_MDR[s.kons];
    const afv = s.mdr - forventet;
    const ude = s.valgt !== "auto" && Math.abs(afv) > Math.max(1.5, forventet * 0.25);
    if (ude) l.push(`<strong>Bemærk:</strong> ${KONS[s.kons].navn}en ligger normalt ved ${KONS[s.kons].maal}.`);
    const i = RAEKKE.indexOf(s.kons);
    if (i < RAEKKE.length - 1) {
      const n = RAEKKE[i + 1];
      l.push(`Næste: ${KONS[n].navn} omkring ${fmtKort(plusMdr(s.foedt, Math.round(KONS_MDR[n])))}.`);
    } else l.push("Sidste forebyggende børneundersøgelse — herefter skolesundhedsplejen.");
    return box(ude ? "box-amber" : "box-blue", `${KONS[s.kons].navn}`, `<p>${l.join(" ")}</p>`);
  }

  function update() {
    const s = getState();
    $("testisFelt").hidden = !s.dreng;
    $("alderHint").textContent = s.foedt && s.dage >= 0 ? `Alder ${alderTekst(s.dage)}${s.valgt === "auto" ? ` · ${KONS[s.kons].navn}` : ""}` : "";
    $("datoWarning").textContent = s.foedt && s.dage < 0 ? "Fødselsdatoen ligger efter undersøgelsesdatoen." : s.foedt && s.mdr > 84 ? "Barnet er over 7 år — uden for de forebyggende børneundersøgelser." : "";
    const t = tjekliste(s);
    const al = alarmer(s);
    sidst = { s, tjek: t, al };
    let html = hovedBoks(s);
    if (al.roed.length) html += box("box-red", "⚠ Handling nu", ul(al.roed));
    if (al.gul.length) html += box("box-amber", "Fund der skal følges op", ul(al.gul));
    html += tjekBoks(s, t);
    html += box("box-blue", `Milepæle — ${KONS[s.kons].maal}${s.praematur && s.dage < 730 ? " (korrigeret alder)" : ""}`, `${ul(MILE[s.kons])}<p class="field-hint">Vejledende — vurdér mønsteret over tid. Tab af færdigheder er altid et alarmtegn.</p>`);
    html += vaccineBoks(s);
    if (s.kons === "5u" || s.kons === "5m") html += foldbar("box-blue", "Vejledning til forældrene", ul(["D-vitamin 10 mikrog. dagligt fra 2 uger til 4 år.", "Sove på ryggen, i egen seng, røgfrit — forebygger vuggedød.", "Ryst aldrig et barn; tal om, hvad man gør, når gråden er svær.", "Søg læge ved feber under 3 måneder, slaphed, vejrtrækningsbesvær eller dårlig spisning."]));
    output.innerHTML = html;
  }

  const tekst = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent.replace(/\s+/g, " ").trim();
  };

  function buildJournalNote() {
    const { s, tjek, al } = sidst;
    const L = [`${KONS[s.kons].navn} ${fmtKort(s.dato)}`];
    if (s.foedt) L.push(`Alder ${alderTekst(s.dage)}${s.praematur && s.dage < 730 ? ` (korrigeret ${alderTekst(Math.max(0, s.korrDage))}, født uge ${s.ga})` : ""}. ${s.dreng ? "Dreng" : "Pige"}.`);
    al.roed.forEach((r) => L.push(`OBS: ${tekst(r)}`));
    al.gul.forEach((r) => L.push(`Fund: ${tekst(r)}`));
    const gjort = tjek.filter((x) => afkrydset.has(`${s.kons}:${x.id}`)).map((x) => x.tekst);
    const mangler = tjek.filter((x) => !afkrydset.has(`${s.kons}:${x.id}`)).map((x) => x.tekst);
    if (gjort.length) L.push(`Gennemgået: ${gjort.join("; ")}.`);
    if (mangler.length) L.push(`Ikke afkrydset (tilpas): ${mangler.join("; ")}.`);
    if (!al.roed.length && !al.gul.length) L.push("Normal udvikling og trivsel svarende til alderen (tilpas).");
    L.push(s.vacc === "ok" ? "Vaccinationer: følger børnevaccinationsprogrammet." : s.vacc === "mangler" ? "Vaccinationer: mangler — indhentes." : "Vaccinationer: fravalgt af forældrene efter information.");
    return L.join("\n");
  }

  function buildFullText() {
    const L = [];
    output.querySelectorAll(".box").forEach((b) => {
      const h3 = b.querySelector("h3");
      if (h3) L.push(h3.textContent.trim().toUpperCase());
      b.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > ul").forEach((el) => {
        if (el.tagName === "P") L.push(el.textContent.replace(/\s+/g, " ").trim());
        else if (el.tagName === "UL") el.querySelectorAll(":scope > li").forEach((li) => L.push(`${li.querySelector("input:checked") ? "[x]" : li.querySelector("input") ? "[ ]" : "-"} ${li.textContent.replace(/\s+/g, " ").trim()}`));
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

  $("dato").value = iso(idag());
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  $("copyBtn").addEventListener("click", () => copyText(buildJournalNote()));
  $("copyFullBtn").addEventListener("click", () => copyText(buildFullText()));
  $("resetBtn").addEventListener("click", () => {
    form.reset();
    $("dato").value = iso(idag());
    afkrydset.clear();
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
