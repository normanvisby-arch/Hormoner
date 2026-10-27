/*
 * Forhøjet blodtryk i almen praksis.
 * Diagnose med hjemme- eller døgnblodtryk, prøver ved debut og hvad man holder
 * øje med, sekundær hypertension, næste behandlingstrin og kontrol.
 * Grænser og mål som i cvrisiko.js (DCS NBV); præparatvalg efter Medicinrådets
 * basisliste og ESC 2024.
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
  const fmt1 = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const box = (cls, titel, body) => `<div class="box ${cls}"><h3>${titel}</h3>${body}</div>`;
  const foldbar = (cls, titel, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${titel}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  // Links til de andre værktøjer: slås op i #linkKort, så claude.ai-versionen bruger artifact-adresser.
  const lenke = (sti, tekst) => {
    const a = document.querySelector(`#linkKort a[data-sti="${sti}"]`);
    const href = a ? a.getAttribute("href") : sti;
    const ny = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${esc(href)}"${ny}>${tekst}</a>`;
  };
  const bt = (s, d) => `${isNaN(s) ? "?" : s}/${isNaN(d) ? "?" : d}`;

  const MED_NAVN = {
    raas: "ACE-hæmmer/angiotensin II-receptorblokker",
    cca: "calciumantagonist",
    thiazid: "thiazid",
    spiro: "spironolacton",
    bb: "betablokker",
  };

  function getState() {
    const s = {
      alder: num("alder"),
      koen: radio("koen"),
      kliS: num("kliS"), kliD: num("kliD"),
      hjS: num("hjS"), hjD: num("hjD"),
      dgS: num("dgS"), dgD: num("dgD"),
      score: radio("score"),
      syg: checked("syg"),
      akut: checked("akut"),
      sek: checked("sek"),
      med: checked("med"),
      max: checked("medmax").length > 0,
      k: num("k"), na: num("na"), egfr: num("egfr"), uacr: num("uacr"), hba1c: num("hba1c"),
    };
    // Blodtryk uden for klinikken: døgnblodtryk foretrækkes frem for hjemmeblodtryk.
    if (!isNaN(s.dgS) || !isNaN(s.dgD)) s.ude = { S: s.dgS, D: s.dgD, navn: "døgnblodtryk (dagtid)" };
    else if (!isNaN(s.hjS) || !isNaN(s.hjD)) s.ude = { S: s.hjS, D: s.hjD, navn: "hjemmeblodtryk" };
    else s.ude = null;
    s.harKlinik = !isNaN(s.kliS) || !isNaN(s.kliD);
    s.behandlet = s.med.length > 0;
    s.gammel = s.alder >= 80;
    s.hoejRisiko = s.score === "hoej" || has(s.syg, "cvd") || has(s.syg, "dm") || has(s.syg, "ckd") || s.uacr >= 30;
    return s;
  }

  const over = (S, D, gs, gd) => S >= gs || D >= gd;
  const svaer = (s) => s.harKlinik && over(s.kliS, s.kliD, 180, 110);

  // Behandlingsmål målt uden for klinikken eller som uobserveret automatisk klinikblodtryk (DCS).
  const maal = (s) => (s.gammel ? { tekst: "systolisk 130–144 mmHg (80 år og derover)", S: 145, D: 999 } : { tekst: "120–135/70–85 mmHg (18–80 år) — så tæt på 120 systolisk som muligt uden væsentlige bivirkninger", S: 135, D: 85 });

  // Klassifikation ud fra det bedste tilgængelige blodtryk.
  function klassificer(s) {
    if (s.behandlet) {
      const ref = s.ude || (s.harKlinik ? { S: s.kliS, D: s.kliD, navn: "klinikblodtryk" } : null);
      if (!ref) return { kode: "mangler", tekst: "Angiv blodtrykket." };
      const m = maal(s);
      const iMaal = !(ref.S >= m.S || ref.D >= m.D);
      return { kode: iMaal ? "imaal" : "ikkemaal", ref, tekst: iMaal ? `I behandling — ${ref.navn} ${bt(ref.S, ref.D)} er inden for målet.` : `I behandling — ${ref.navn} ${bt(ref.S, ref.D)} er over målet.` };
    }
    if (s.ude) {
      const u = s.ude;
      const klinikHoej = s.harKlinik && over(s.kliS, s.kliD, 140, 90);
      if (over(u.S, u.D, 135, 85)) {
        return { kode: "ht", ref: u, maskeret: s.harKlinik && !klinikHoej, tekst: `Hypertension — ${u.navn} ${bt(u.S, u.D)} (≥ 135/85).` };
      }
      if (klinikHoej) return { kode: "hvidkittel", ref: u, tekst: `Hvidkittelhypertension — klinik ${bt(s.kliS, s.kliD)}, men ${u.navn} ${bt(u.S, u.D)} er under 135/85.` };
      if (over(u.S, u.D, 130, 80)) return { kode: "let", ref: u, tekst: `Let forhøjet blodtryk — ${u.navn} ${bt(u.S, u.D)} (130–134/80–84).` };
      return { kode: "normal", ref: u, tekst: `Normalt blodtryk — ${u.navn} ${bt(u.S, u.D)}.` };
    }
    if (s.harKlinik) {
      if (svaer(s)) return { kode: "ht", ref: { S: s.kliS, D: s.kliD, navn: "klinikblodtryk" }, tekst: `Svær hypertension — klinikblodtryk ${bt(s.kliS, s.kliD)} (≥ 180/110).` };
      if (over(s.kliS, s.kliD, 140, 90)) return { kode: "bekraeft", tekst: `Forhøjet klinikblodtryk ${bt(s.kliS, s.kliD)} (≥ 140/90) — diagnosen skal bekræftes med hjemme- eller døgnblodtryk.` };
      return { kode: "kliniknormal", tekst: `Klinikblodtryk ${bt(s.kliS, s.kliD)} er under 140/90.` };
    }
    return { kode: "mangler", tekst: "Angiv klinik-, hjemme- eller døgnblodtryk." };
  }

  // ---------------------------------------------------------------------
  // Akut og alarmfund
  // ---------------------------------------------------------------------

  function akutBoks(s) {
    if (!svaer(s)) return "";
    if (s.akut.length) {
      return box("box-red", "⚠ Hypertensivt nødstilfælde", "<p><strong>Klinikblodtryk ≥ 180/110 med symptomer på akut organpåvirkning</strong> (brystsmerter, åndenød, neurologiske udfald, synsforstyrrelser, svær hovedpine): akut indlæggelse. Sænk ikke blodtrykket hurtigt i praksis.</p>");
    }
    return box("box-amber", "Svær hypertension uden symptomer", ul([
      "Gentag målingen efter hvile, og mål på begge arme.",
      "Start eller øg behandlingen samme dag — afvent ikke hjemmeblodtryk.",
      "Vurdér organskade: EKG, kreatinin, kalium, urin (albumin, blod) og fundus ved synsforstyrrelser.",
      "Ny kontrol inden for ca. 1 uge. Indlæggelse kun ved symptomer eller tegn på akut organskade.",
    ]));
  }

  function labFund(s) {
    const f = [];
    const raas = has(s.med, "raas") || has(s.med, "spiro");
    if (s.k < 3.5) {
      if (has(s.med, "thiazid")) f.push(`<strong>Kalium ${fmt1(s.k)}:</strong> hypokaliæmi på thiazid — kaliumtilskud (bendroflumethiazid med kaliumklorid), eller tilføj/øg ACE-hæmmer/angiotensin II-receptorblokker. Udtalt hypokaliæmi kan skyldes primær aldosteronisme.`);
      else f.push(`<strong>Kalium ${fmt1(s.k)} uden diuretikum:</strong> mistanke om primær aldosteronisme — aldosteron og renin (tolkes efter laboratoriets vejledning, påvirkes af medicin) og henvisning til endokrinologisk udredning.`);
    }
    if (s.k > 5.5 && raas) f.push(`<strong>Kalium ${fmt1(s.k)}:</strong> hyperkaliæmi — pausér spironolacton, reducér/pausér ACE-hæmmer/angiotensin II-receptorblokker, tjek kreatinin og kaliumholdige tilskud. Over 6,0: akut vurdering.`);
    else if (s.k > 5.0 && raas) f.push(`<strong>Kalium ${fmt1(s.k)}:</strong> let forhøjet — ikke spironolacton; kontrollér igen, og undgå kaliumtilskud.`);
    if (s.na < 130 && has(s.med, "thiazid")) f.push(`<strong>Natrium ${s.na}:</strong> hyponatriæmi — pausér thiazid, og kontrollér igen (især ældre).`);
    if (s.egfr < 30) f.push(`<strong>eGFR ${s.egfr}:</strong> svært nedsat nyrefunktion — thiazid virker dårligt (overvej loop-diuretikum), ikke spironolacton; se ${lenke("../nyre/ckd.html", "Kronisk nyresygdom")}.`);
    else if (s.egfr < 60) f.push(`<strong>eGFR ${s.egfr}:</strong> kronisk nyresygdom (hvis vedvarende i 3 måneder) — ACE-hæmmer/angiotensin II-receptorblokker førstevalg; se ${lenke("../nyre/ckd.html", "Kronisk nyresygdom")}.`);
    if (s.uacr >= 300) f.push(`<strong>Urin-albumin/kreatinin-ratio ${s.uacr} mg/g:</strong> svær albuminuri — ACE-hæmmer/angiotensin II-receptorblokker i maksimal tolereret dosis, overvej henvisning til nefrolog (KDIGO), og se ${lenke("../nyre/ckd.html", "Kronisk nyresygdom")}.`);
    else if (s.uacr >= 30) f.push(`<strong>Urin-albumin/kreatinin-ratio ${s.uacr} mg/g:</strong> albuminuri (organskade, gentag for at bekræfte) — høj risiko; ACE-hæmmer/angiotensin II-receptorblokker førstevalg.`);
    if (s.hba1c >= 48) f.push(`<strong>HbA1c ${s.hba1c}:</strong> diabetes (bekræftes med ny måling uden symptomer) — se ${lenke("../diabetes/behandling.html", "Type 2-diabetes")}.`);
    return f;
  }

  // ---------------------------------------------------------------------
  // Beslutning og behandling
  // ---------------------------------------------------------------------

  function beslutning(s, kl) {
    const p = [];
    switch (kl.kode) {
      case "ht": {
        const meget = megetHoej(s, kl);
        if (meget || s.hoejRisiko) {
          p.push(`<strong>Medicinsk behandling nu</strong> sammen med livsstilsændringer — ${meget ? "blodtrykket er ≥ 155/95 uden for klinikken (eller ≥ 180/110 i klinikken)" : "høj hjerte-kar-risiko, kendt hjerte-kar-sygdom, diabetes, kronisk nyresygdom eller albuminuri"}.`);
        } else {
          p.push("<strong>Livsstilsændringer i et kort forsøg (fx 3 måneder)</strong>, derefter medicin, hvis blodtrykket fortsat er ≥ 135/85 — hypertension behandles uanset beregnet risiko (DCS).");
          if (s.score === "ukendt") p.push(`Beregn hjerte-kar-risikoen i ${lenke("cvrisiko.html", "CV-risiko")} — ved høj risiko startes medicin straks.`);
        }
        if (kl.maskeret) p.push("<strong>Maskeret hypertension:</strong> normalt klinikblodtryk, men forhøjet uden for klinikken — behandles som hypertension.");
        break;
      }
      case "let":
        if (s.hoejRisiko) p.push("<strong>Let forhøjet blodtryk med høj risiko:</strong> medicin, hvis livsstilsændringer ikke har normaliseret blodtrykket (SCORE2 ≥ 10 %, SCORE2-OP ≥ 15 %, kendt hjerte-kar-sygdom, diabetes eller nyresygdom) — monoterapi er ofte nok.");
        else p.push("<strong>Let forhøjet blodtryk:</strong> livsstilsændringer og ny måling om ca. 1 år.");
        break;
      case "hvidkittel":
        p.push("<strong>Hvidkittelhypertension:</strong> ingen medicin; livsstilsråd og hjemmeblodtryk ca. årligt (øget risiko for at udvikle vedvarende hypertension).");
        break;
      case "normal":
        p.push("Ingen behandling. Ny måling inden for 1–3 år (oftere ved høj risiko).");
        break;
      case "bekraeft":
        p.push("<strong>Bekræft med hjemmeblodtryk</strong> (2 målinger morgen og aften i 3–7 dage) eller døgnblodtryk, før behandling startes. Ved høj risiko eller organskade kan behandlingen startes, mens målingerne planlægges.");
        break;
      case "kliniknormal":
        if (has(s.syg, "dm") || has(s.syg, "ckd") || s.uacr >= 30) p.push("Overvej hjemmeblodtryk for at udelukke maskeret hypertension (diabetes, nyresygdom eller organskade).");
        else p.push("Ingen hypertension i klinikken.");
        break;
      default:
        break;
    }
    return p;
  }

  const megetHoej = (s, kl) => !!kl.ref && (over(kl.ref.S, kl.ref.D, 155, 95) || svaer(s));
  // Medicin nu (ikke først et forsøg med livsstil).
  const medicinIndiceret = (s, kl) => {
    if (kl.kode === "ikkemaal") return true;
    if (kl.kode === "ht") return megetHoej(s, kl) || s.hoejRisiko;
    if (kl.kode === "let" && s.hoejRisiko) return true;
    return false;
  };

  function behandlingBoks(s, kl) {
    const senere = kl.kode === "ht" && !medicinIndiceret(s, kl);
    if (!medicinIndiceret(s, kl) && kl.kode !== "imaal" && !senere) return "";
    const fertil = has(s.syg, "graviditet");
    const afr = has(s.syg, "afrikansk");
    const raasFoerst = has(s.syg, "dm") || has(s.syg, "ckd") || has(s.syg, "hf") || s.uacr >= 30;
    const raasNavn = fertil ? "" : `ACE-hæmmer eller angiotensin II-receptorblokker (fx losartan 50 mg${s.gammel ? " — 25 mg hos ældre" : ""} eller enalapril 5–10 mg)`;
    const ccaNavn = `calciumantagonist (amlodipin ${s.gammel || has(s.syg, "skroebelig") ? "2,5–5" : "5"} mg)`;
    const thNavn = "thiazid (bendroflumethiazid 1,25–2,5 mg med kaliumklorid)";
    const tal = s.med.filter((m) => m !== "bb" && m !== "spiro").length;
    const trin = [];
    const noter = [];
    if (kl.kode === "imaal") {
      trin.push("<strong>I mål:</strong> fortsæt behandlingen; årskontrol.");
    } else if (!s.behandlet) {
      const mono = s.gammel || has(s.syg, "skroebelig") || kl.kode === "let" || (kl.ref && kl.ref.S < 145 && kl.ref.D < 90 && !svaer(s));
      if (fertil) {
        trin.push(`<strong>Start:</strong> ${ccaNavn}${mono ? "" : " — evt. kombineret med thiazid"}. Undgå ACE-hæmmer og angiotensin II-receptorblokker uden sikker prævention (fosterskadelige).`);
      } else if (mono) {
        trin.push(`<strong>Start med ét præparat:</strong> ${afr && !raasFoerst ? ccaNavn : raasFoerst ? raasNavn : `${raasNavn} eller ${ccaNavn}`}${s.gammel || has(s.syg, "skroebelig") ? " i lav dosis — titrér langsomt, og mål stående blodtryk" : ""}.`);
      } else {
        trin.push(`<strong>Start med to præparater i lav dosis</strong> (ESC 2024): ${raasNavn} + ${has(s.syg, "gigt") ? ccaNavn : `${ccaNavn} eller ${thNavn}`} — gerne som kombinationstablet, hvis den findes i passende styrker.`);
      }
    } else if (has(s.med, "raas") && has(s.med, "cca") && has(s.med, "thiazid")) {
      trin.push("<strong>Behandlingsresistent hypertension?</strong> (≥ 135/85 trods tre præparater inkl. diuretikum i maksimal tolereret dosis). Tjek først:");
      trin.push(ul([
        "At medicinen tages (spørg åbent; tæl tabletter, apotekets udleveringer).",
        "Måleteknik og hvidkittel-effekt — bekræft med hjemme- eller døgnblodtryk.",
        "Blodtryksøgende stoffer (NSAID, østrogen, lakrids, decongestanter, alkohol) og saltindtag.",
        "Sekundær hypertension (søvnapnø, primær aldosteronisme, nyresygdom).",
      ]));
      const spiroOk = !(s.k > 4.5) && !(s.egfr < 45) && !fertil;
      if (has(s.med, "spiro")) trin.push("Allerede spironolacton: <strong>henvis til hypertensionsklinik/medicinsk afdeling</strong>.");
      else trin.push(spiroOk ? `<strong>Tilføj spironolacton 12,5–25 mg</strong>${isNaN(s.k) || isNaN(s.egfr) ? " (forudsætter kalium ≤ 4,5 og eGFR ≥ 45 — mål dem først)" : ""}; kalium og kreatinin efter 1–2 og 4 uger. Ikke tolereret: betablokker, amilorid eller doxazosin efter aftale med specialist.` : "<strong>Spironolacton er ikke egnet</strong> (kalium > 4,5, eGFR < 45 eller mulig graviditet) — overvej betablokker eller doxazosin, og henvis.");
      trin.push("Fortsat ukontrolleret: henvis til hypertensionsklinik/medicinsk afdeling.");
    } else if (tal === 2) {
      const mangler = ["raas", "cca", "thiazid"].find((m) => !has(s.med, m));
      const tekst = { raas: raasNavn || "ACE-hæmmer/angiotensin II-receptorblokker (kun med sikker prævention)", cca: ccaNavn, thiazid: thNavn }[mangler];
      trin.push(`<strong>Tre præparater:</strong> tilføj ${tekst}${s.max ? "" : " — eller øg først doserne, hvis de er lave"} (ESC: tredje præparat før maksimal dosis).`);
    } else if (tal === 1) {
      const har = ["raas", "cca", "thiazid"].find((m) => has(s.med, m));
      const til = har === "raas" ? `${ccaNavn} eller ${thNavn}` : fertil ? thNavn : raasNavn;
      trin.push(`<strong>To præparater:</strong> tilføj ${til} — kombination virker bedre end at øge én dosis.`);
    } else if (has(s.med, "bb") || has(s.med, "spiro")) {
      trin.push(`<strong>Tilføj førstevalgspræparater:</strong> ${fertil ? ccaNavn : `${raasNavn} + ${ccaNavn}`}. Betablokker er ikke førstevalg ved hypertension uden anden indikation.`);
    }
    if (has(s.syg, "angina") || has(s.syg, "af") || has(s.syg, "hf")) noter.push("Betablokker kan indgå på selvstændig indikation (angina, frekvenskontrol ved atrieflimren, hjertesvigt).");
    if (has(s.syg, "hf")) noter.push("Hjertesvigt: ACE-hæmmer/angiotensin II-receptorblokker (eller sacubitril/valsartan), betablokker, MRA og SGLT2-hæmmer efter hjertesvigtsvejledningen; undgå verapamil og diltiazem.");
    if (has(s.syg, "astma")) noter.push("Astma: undgå ikke-selektive betablokkere.");
    if (has(s.syg, "gigt")) noter.push("Urinsyregigt: thiazid kan udløse anfald — losartan sænker urat.");
    if (afr) noter.push("Afrikansk/afrocaribisk oprindelse: calciumantagonist eller thiazid virker bedst som første præparat; ACE-hæmmer giver oftere angioødem.");
    if (fertil) noter.push(`Graviditetsønske: skift til labetalol eller nifedipin efter aftale; ved graviditet se ${lenke("../svangre/svangre.html", "Svangreundersøgelser")}.`);
    noter.push("Aldrig ACE-hæmmer og angiotensin II-receptorblokker sammen. Ankelødemer af amlodipin: lavere dosis eller lercanidipin.");
    return (senere ? foldbar : box)("box-green", senere ? "Behandling, hvis blodtrykket fortsat er ≥ 135/85 efter livsstil" : "Behandling — næste trin", `${trin.map((t) => (t.startsWith("<ul") ? t : `<p>${t}</p>`)).join("")}<p class="field-hint">Præparater fra Medicinrådets basisliste; doser er startdoser — titrér hver 2.–4. uge mod målet inden for ca. 3 måneder.</p>${ul(noter)}`);
  }

  function maalBoks(s, kl) {
    if (!["ht", "let", "ikkemaal", "imaal", "bekraeft"].includes(kl.kode)) return "";
    return box("box-blue", "Behandlingsmål", `<p>${maal(s).tekst} — målt som hjemme-, døgn- eller uobserveret automatisk klinikblodtryk (DCS).</p>`);
  }

  // Prøver ved debut: hvorfor, og hvad man holder øje med i svaret.
  function proeveBoks(s, kl) {
    const debut = !s.behandlet && ["ht", "bekraeft", "let"].includes(kl.kode);
    const r = [
      ["Hjemme- eller døgnblodtryk", "Bekræfter diagnosen", "≥ 135/85 = hypertension. Normalt hjemme trods høj klinik = hvidkittel (ingen medicin)."],
      ["Natrium og kalium", "Sekundær årsag; udgangspunkt før medicin", "Kalium < 3,5 uden diuretikum → primær aldosteronisme (aldosteron/renin)."],
      ["Kreatinin og eGFR", "Nyrefunktion; udgangspunkt før ACE-hæmmer/diuretikum", `eGFR < 60 → kronisk nyresygdom (${lenke("../nyre/ckd.html", "Kronisk nyresygdom")}).`],
      ["Urin-albumin/kreatinin-ratio og urinstix", "Organskade og nyresygdom", "Ratio ≥ 30 mg/g → albuminuri: høj risiko, ACE-hæmmer/angiotensin II-receptorblokker. Hæmaturi → nyresygdom."],
      ["HbA1c (eller faste-glukose)", "Diabetes", `≥ 48 mmol/mol → diabetes (${lenke("../diabetes/behandling.html", "Type 2-diabetes")}).`],
      ["Lipidprofil", "Hjerte-kar-risiko", `Indgår i SCORE2 (${lenke("cvrisiko.html", "CV-risiko")}).`],
      ["Hæmoglobin og TSH", "DCS: ved første udredning", "Thyreoideasygdom og anæmi kan påvirke blodtryk og symptomer."],
      ["EKG", "Venstre ventrikelhypertrofi, atrieflimren, iskæmi", "Hypertrofi → organskade (overvej ekkokardiografi). Atrieflimren → antikoagulation."],
      ["Ekkokardiografi", "Ved hypertrofi på EKG, mislyd eller hjertesymptomer", "Hypertrofi eller nedsat funktion → høj risiko, skærpet mål."],
    ];
    if (s.alder >= 70 || has(s.syg, "skroebelig")) r.push(["Stående blodtryk", "Ortostatisk hypotension (70 år og derover)", "Fald ≥ 20/10 mmHg → forsigtig titrering."]);
    const rows = r.map(([a, b, c]) => `<tr><td data-label="Prøve">${a}</td><td data-label="Hvorfor">${b}</td><td data-label="Hold øje med">${c}</td></tr>`).join("");
    const tabel = `<div class="drug-table-wrap"><table class="drug-table stack-mobile proever"><thead><tr><th>Prøve</th><th>Hvorfor</th><th>Hold øje med</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return debut ? box("box-blue", "Udredning ved debut — prøver og svar", tabel) : foldbar("box-blue", "Udredning ved debut — prøver og svar", tabel);
  }

  function sekundaerBoks(s, kl) {
    const sek = [];
    if (has(s.sek, "ung")) sek.push("<strong>Debut før 40 år:</strong> grundig udredning for sekundær årsag og organskade — henvis ambulant, især ved svær hypertension.");
    if (has(s.sek, "hypok")) sek.push("<strong>Hypokaliæmi:</strong> primær aldosteronisme — aldosteron og renin, og henvis til endokrinologisk udredning.");
    if (has(s.sek, "anfald")) sek.push("<strong>Anfald med hovedpine, sveden og hjertebanken:</strong> fæokromocytom — plasma-metanefriner og henvisning.");
    if (has(s.sek, "apnoe")) sek.push("<strong>Mulig søvnapnø:</strong> henvis til søvnudredning — behandling kan sænke blodtrykket.");
    if (has(s.sek, "cushing")) sek.push("<strong>Cushing-træk:</strong> endokrinologisk udredning (døgnurin-kortisol eller dexamethasonhæmningstest efter lokal vejledning).");
    if (has(s.sek, "pludselig") || has(s.sek, "kreastig")) sek.push("<strong>Pludselig forværring eller kreatininstigning > 30 % på ACE-hæmmer/angiotensin II-receptorblokker:</strong> mistanke om nyrearteriestenose — reducér/pausér præparatet, og henvis.");
    if (has(s.sek, "medicin")) sek.push("<strong>Blodtryksøgende stoffer:</strong> seponér eller skift, hvis muligt (fx paracetamol i stedet for NSAID, gestagen-prævention i stedet for østrogen), og mål igen.");
    const resistent = s.behandlet && kl.kode === "ikkemaal" && has(s.med, "raas") && has(s.med, "cca") && has(s.med, "thiazid");
    if (resistent) sek.push("<strong>Behandlingsresistent:</strong> undersøg for sekundær hypertension, og henvis ved fortsat ukontrolleret blodtryk.");
    if (!sek.length) return "";
    return box("box-amber", "Sekundær hypertension — udredning og henvisning", `${ul(sek)}<p class="field-hint">Udredning startes kun, hvis den får behandlingsmæssig konsekvens (DES). Alle fund ovenfor giver ambulant henvisning efter regionens vejledning.</p>`);
  }

  function kontrolBoks(s, kl) {
    const k = [];
    if (medicinIndiceret(s, kl)) {
      k.push("Efter start eller øgning af ACE-hæmmer, angiotensin II-receptorblokker eller diuretikum: <strong>kalium og kreatinin efter 1–2 uger</strong>. Kreatininstigning op til 30 % accepteres; større stigning → reducér og overvej nyrearteriestenose.");
      k.push("Hjemmeblodtryk og justering hver 2.–4. uge, til målet er nået (helst inden for 3 måneder).");
      if (has(s.med, "spiro") || (has(s.med, "raas") && has(s.med, "cca") && has(s.med, "thiazid"))) k.push("Spironolacton: kalium og kreatinin efter 1–2 og 4 uger, derefter hver 3.–6. måned.");
    }
    if (["ht", "let", "ikkemaal", "imaal"].includes(kl.kode)) k.push("<strong>Årskontrol:</strong> hjemmeblodtryk, natrium, kalium, kreatinin/eGFR, urin-albumin/kreatinin-ratio (ved diabetes, nyresygdom eller albuminuri), HbA1c og lipider efter risiko, bivirkninger, at medicinen tages og livsstil.");
    if (!k.length) return "";
    return box("box-blue", "Kontrol", ul(k));
  }

  function livsstilBoks(s, kl) {
    if (!["ht", "let", "hvidkittel", "ikkemaal", "bekraeft"].includes(kl.kode)) return "";
    return foldbar("box-blue", "Livsstil", ul([
      "Salt under 5 g om dagen (færdigretter, brød, pålæg).",
      "Vægttab ved overvægt — ca. 1 mmHg pr. kg.",
      "Motion: mindst 150 minutter om ugen med moderat intensitet.",
      "Alkohol: højst 10 genstande om ugen og højst 4 ad gangen (Sundhedsstyrelsen) — mindre er bedre.",
      "Rygestop (hjerte-kar-risiko) og kost med frugt, grønt og fuldkorn.",
    ]));
  }

  // ---------------------------------------------------------------------
  // Opdatering og journalnotat
  // ---------------------------------------------------------------------

  let sidst = null;

  function update() {
    const s = getState();
    const kl = klassificer(s);
    const lab = labFund(s);
    sidst = { s, kl, lab };
    let html = akutBoks(s);
    const cls = kl.kode === "ikkemaal" || kl.kode === "ht" ? "box-amber" : kl.kode === "imaal" || kl.kode === "normal" ? "box-green" : "box-blue";
    html += box(cls, "Vurdering", `<p>${kl.tekst}</p>${ul(beslutning(s, kl))}`);
    if (lab.length) html += box("box-amber", "Blodprøver — fund", ul(lab));
    html += sekundaerBoks(s, kl);
    html += behandlingBoks(s, kl);
    html += maalBoks(s, kl);
    html += proeveBoks(s, kl);
    html += kontrolBoks(s, kl);
    html += livsstilBoks(s, kl);
    output.innerHTML = html;
  }

  const tekst = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent.replace(/\s+/g, " ").trim();
  };

  function buildJournalNote() {
    const { s, kl, lab } = sidst;
    const L = ["Blodtryk"];
    const maal_ = [];
    if (s.harKlinik) maal_.push(`klinik ${bt(s.kliS, s.kliD)}`);
    if (!isNaN(s.hjS) || !isNaN(s.hjD)) maal_.push(`hjemme ${bt(s.hjS, s.hjD)}`);
    if (!isNaN(s.dgS) || !isNaN(s.dgD)) maal_.push(`døgn (dagtid) ${bt(s.dgS, s.dgD)}`);
    if (maal_.length) L.push(`Målinger: ${maal_.join(", ")} mmHg.`);
    const baggrund = [];
    if (!isNaN(s.alder)) baggrund.push(`${s.alder} år`);
    if (s.score !== "ukendt") baggrund.push(s.score === "hoej" ? "høj hjerte-kar-risiko" : "lav–moderat hjerte-kar-risiko");
    const sygNavn = { cvd: "hjerte-kar-sygdom", dm: "diabetes", ckd: "kronisk nyresygdom", hf: "hjertesvigt", af: "atrieflimren", angina: "angina/tidl. AMI", gigt: "urinsyregigt", astma: "astma", graviditet: "kan blive gravid", skroebelig: "skrøbelig/ortostatisk hypotension", afrikansk: "afrikansk/afrocaribisk oprindelse" };
    s.syg.forEach((k) => baggrund.push(sygNavn[k]));
    if (baggrund.length) L.push(`Baggrund: ${baggrund.join(", ")}.`);
    if (s.behandlet) L.push(`Aktuel behandling: ${s.med.map((m) => MED_NAVN[m]).join(", ")}${s.max ? " (maksimal tolereret dosis)" : ""}.`);
    L.push(`Vurdering: ${tekst(kl.tekst)}`);
    if (svaer(s)) L.push(s.akut.length ? "OBS: BT ≥ 180/110 med symptomer — akut indlæggelse." : "OBS: svær hypertension uden symptomer — behandling straks, kontrol inden for 1 uge.");
    lab.forEach((f) => L.push(`OBS: ${tekst(f)}`));
    beslutning(s, kl).forEach((p) => L.push(`Plan: ${tekst(p)}`));
    const beh = output.querySelector(".box-green h3");
    if (beh && beh.textContent.startsWith("Behandling")) {
      beh.closest(".box").querySelectorAll(":scope > p:not(.field-hint)").forEach((p) => L.push(`Behandling: ${p.textContent.replace(/\s+/g, " ").trim()}`));
    }
    if (["ht", "let", "ikkemaal", "imaal", "bekraeft"].includes(kl.kode)) L.push(`Mål: ${maal(s).tekst.replace(/ — .*/, "")}.`);
    const sek = output.querySelectorAll(".box-amber h3");
    sek.forEach((h) => {
      if (h.textContent.startsWith("Sekundær")) L.push("Sekundær hypertension: " + Array.from(h.closest(".box").querySelectorAll("li")).map((li) => li.textContent.replace(/:.*$/, "")).join("; ") + " — udredning/henvisning.");
    });
    if (medicinIndiceret(s, kl)) L.push("Kontrol: kalium og kreatinin efter 1–2 uger, hjemmeblodtryk og justering hver 2.–4. uge.");
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
