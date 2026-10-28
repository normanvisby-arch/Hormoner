/*
 * Find den rigtige kræftpakke: symptomer og fund → pakkeforløb rangeret efter
 * hast (akut, begrundet mistanke, udredning/filterfunktion først, overvej, ikke
 * indgangskriterium alene). Fritekstsøgning i pakker og symptomer, RMI og
 * PSA-aldersgrænser, børn under 18 år og journalnotat. Data i pakker.js.
 */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = document.querySelector(".form-panel");
  const output = $("output");
  const copyStatus = $("copyStatus");
  const printMeta = $("printMeta");
  const PAKKER = window.KRAEFT_PAKKER || KRAEFT_PAKKER;
  const P = Object.fromEntries(PAKKER.map((p) => [p.id, p]));

  const num = (id) => parseFloat(String($(id).value).replace(",", "."));
  const radio = (name) => (document.querySelector(`input[name="${name}"]:checked`) || {}).value || "";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const box = (cls, titel, body) => `<div class="box ${cls}"><h3>${titel}</h3>${body}</div>`;
  const foldbar = (cls, titel, body, aaben) => `<div class="box ${cls} box-collapsible"><details${aaben ? " open" : ""}><summary><h3>${titel}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const lenke = (sti, tekst) => {
    const a = document.querySelector(`#linkKort a[data-sti="${sti}"]`);
    const href = a ? a.getAttribute("href") : sti;
    const ny = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${esc(href)}"${ny}>${tekst}</a>`;
  };
  const fmtTal = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  const fmtDato = (d) => d.toLocaleDateString("da-DK", { day: "2-digit", month: "2-digit", year: "numeric" });
  const norm = (s) => s.toLowerCase().replace(/[-–]/g, " ").replace(/\s+/g, " ").trim();

  // ---------------------------------------------------------------------
  // Symptomer og fund (koen: kun for mænd "m" eller kvinder "k")
  // ---------------------------------------------------------------------

  const GRUPPER = [
    ["Almene symptomer", [
      ["vaegttab", "Uforklaret vægttab"],
      ["traethed", "Markant træthed eller almen utilpashed"],
      ["feber", "Uforklaret feber eller nattesved"],
      ["smerter", "Uforklarede smerter (diffuse eller lokaliserede)"],
      ["anaemi", "Uforklaret anæmi (ikke jernmangel)"],
      ["metastase", "Metastaser uden kendt primærtumor"],
    ]],
    ["Lunger og brysthule", [
      ["hoste", "Hoste i over 4–6 uger eller ændret hostemønster"],
      ["haemoptyse", "Hæmoptyse (blodigt opspyt)"],
      ["aandenoed", "Nytilkommen åndenød (abnorm spirometri)"],
      ["brystsmerter", "Længerevarende brystsmerter"],
      ["lungefund", "Suspekt infiltrat eller tumor på røntgen/CT af thorax"],
      ["pleura", "Ensidig pleuraansamling eller pleurafortykkelse"],
    ]],
    ["Mave og tarm", [
      ["dysfagi", "Synkebesvær (dysfagi)"],
      ["opkast", "Vedvarende opkastning"],
      ["dyspepsi", "Nyopstået dyspepsi eller refluks"],
      ["gibloed", "Hæmatemese eller melæna"],
      ["rektalbloed", "Blødning fra endetarmen"],
      ["afforing", "Ændret afføringsmønster i over 4 uger"],
      ["mavesmerter", "Nytilkomne mavesmerter i over 4 uger"],
      ["jernmangel", "Uforklaret jernmangelanæmi"],
      ["ikterus", "Ikterus uden oplagt forklaring"],
      ["abdtumor", "Udfyldning eller hævelse i maven"],
      ["leverfund", "Tumor i lever, pancreas eller galdeveje på billeddiagnostik"],
      ["anal", "Knude, sår, smerter eller kløe ved anus"],
    ]],
    ["Urinveje og mandlige kønsorganer", [
      ["makrohaem", "Synligt blod i urinen (makroskopisk hæmaturi)"],
      ["mikrohaem", "Mikroskopisk hæmaturi"],
      ["blaeresympt", "Smerter i blære eller flanke, eller irritative vandladningsgener"],
      ["nyreudfyld", "Palpabel udfyldning ved nyren"],
      ["luts", "Vandladningsbesvær (LUTS)", "m"],
      ["dre", "Hård eller uregelmæssig prostata ved rektaleksploration", "m"],
      ["testis", "Knude eller uforklaret forstørrelse af testikel", "m"],
      ["gynaekomasti", "Nyopstået gynækomasti hos yngre mand", "m"],
      ["penis", "Sår, knude eller misfarvning på penis", "m"],
    ]],
    ["Bryst og kvindelige kønsorganer", [
      ["brystknude", "Knude i brystet"],
      ["brysthud", "Indtrækning, sår, eksem på brystvorten eller blodig sekretion"],
      ["aksil", "Forstørret lymfeknude i armhulen"],
      ["pmb", "Blødning efter menopausen", "k"],
      ["postcoital", "Postkoital blødning eller mellemblødning", "k"],
      ["cervixtumor", "Suspekt tumor på cervix eller celleprøve med kræft(mistanke)", "k"],
      ["vulva", "Kløe, sår, knude eller farveforandring på vulva, der ikke går over", "k"],
    ]],
    ["Hoved, hals og nervesystem", [
      ["haeshed", "Hæshed i over 2 uger"],
      ["halsglands", "Forstørret lymfeknude på halsen"],
      ["mund", "Sår eller knude i mund eller svælg, der ikke heler"],
      ["naese", "Ensidig næsestenose, blodig sekretion eller gentagne næseblødninger"],
      ["synkesmerter", "Synkesmerter eller globus med udstråling til øret"],
      ["thyreoidea", "Knude i skjoldbruskkirtlen (hård, voksende eller med hæshed)"],
      ["neuro", "Nye fokale neurologiske udfald, der progredierer"],
      ["epilepsi", "Første epileptiske anfald hos voksen uden oplagt årsag"],
      ["personlighed", "Personligheds- eller kognitiv ændring, der progredierer"],
      ["hovedpine", "Ny eller ændret hovedpine, der progredierer over 3–4 uger"],
      ["hjernefund", "Rumopfyldende proces på CT/MR af hjernen"],
      ["oeje", "Fremstående øje, dobbeltsyn, tryk bag øjet eller nedsat syn"],
      ["leukokori", "Hvid pupil (leukokori)"],
    ]],
    ["Hud, knogler og bløddele", [
      ["modermaerke", "Nyt eller forandret modermærke (ABCDE)"],
      ["bloeddel", "Bløddelsknude over 5 cm, dyb eller i hurtig vækst"],
      ["knogletumor", "Palpabel knogletumor"],
      ["knoglesmerter", "Dybe, vedvarende knoglesmerter uden forklaring"],
      ["fraktur", "Sammenfald af ryghvirvel eller osteolyse uden anden årsag"],
    ]],
    ["Blod og lymfe", [
      ["lymfeknude", "Forstørrede lymfeknuder andre steder (over ca. 1,5–2 cm) uden oplagt årsag"],
      ["splenomegali", "Forstørret milt"],
      ["lymfocytose", "Persisterende lymfocytose"],
      ["blaster", "Blaster i blodet"],
      ["cytopeni", "Bi- eller pancytopeni uden mangeltilstand"],
      ["myeloidfund", "Leukocytose over 25, monocytose over 1, vedvarende trombocytose eller hæmatokrit over 0,55"],
      ["mkomp", "M-komponent i serum eller urin"],
      ["hyperkalk", "Hypercalcæmi"],
      ["kreatinin", "Uforklaret forhøjet kreatinin"],
    ]],
  ];
  const SYMPTOM = {};
  GRUPPER.forEach(([, l]) => l.forEach(([id, tekst, koen]) => (SYMPTOM[id] = { id, tekst, koen })));

  $("symptomFelter").innerHTML = GRUPPER.map(([navn, l]) =>
    `<fieldset class="field symptomgruppe"><legend>${navn}</legend>${l.map(([id, tekst, koen]) =>
      `<label class="checkbox"${koen ? ` data-koen="${koen}"` : ""}><input type="checkbox" name="sym" value="${id}"> ${tekst}</label>`).join("")}</fieldset>`).join("");

  function getState() {
    const koen = radio("koen");
    const sym = new Set(Array.from(document.querySelectorAll('input[name="sym"]:checked'))
      .map((el) => el.value)
      .filter((id) => !SYMPTOM[id].koen || !koen || SYMPTOM[id].koen === koen));
    const ulv = $("ulfund").value;
    return {
      alder: num("alder"),
      koen,
      ryger: $("ryger").checked,
      post: $("post").checked && koen !== "m",
      sym,
      psa: koen === "k" ? NaN : num("psa"),
      psa2: $("psa2").checked,
      ca125: koen === "m" ? NaN : num("ca125"),
      ul: ulv === "" ? null : parseInt(ulv, 10),
      soeg: norm($("soeg").value),
    };
  }

  // ---------------------------------------------------------------------
  // Regler: symptomer → pakker med niveau og begrundelse
  // ---------------------------------------------------------------------

  const NIVEAU = {
    4: { label: "Akut — ring nu", cls: "box-red", chip: "chip-hoej" },
    3: { label: "Begrundet mistanke → pakkeforløb", cls: "box-amber", chip: "chip-moderat" },
    2: { label: "Udredning eller filterfunktion først", cls: "box-blue", chip: "chip-lav" },
    1: { label: "Overvej", cls: "box-blue", chip: "chip-lav" },
    0: { label: "Ikke indgangskriterium alene", cls: "box-green", chip: "chip-gavn" },
  };
  const BOERN_AKUT = ["abdtumor", "leukokori", "neuro", "hjernefund", "blaster", "cytopeni", "epilepsi"];

  // PSA-grænse efter alder (to målinger, UVI udelukket).
  const psaGraense = (a) => (isNaN(a) ? null : a < 60 ? 3 : a <= 70 ? 4 : 5);
  // RMI = U × M × CA-125; U: 0 fund = 0, 1 = 1, 2+ = 3; M: præ = 1, post = 3.
  const rmi = (ca, ulFund, post) => (ulFund === 0 ? 0 : ulFund === 1 ? 1 : 3) * (post ? 3 : 1) * ca;

  function vurder(s) {
    const m = {};
    const add = (id, niv, grund) => {
      const x = m[id] || (m[id] = { id, niv: -1, grunde: [] });
      x.niv = Math.max(x.niv, niv);
      if (!x.grunde.includes(grund)) x.grunde.push(grund);
    };
    const h = (k) => s.sym.has(k);
    const A = s.alder;
    const kendt = !isNaN(A);
    const kvinde = s.koen === "k";
    const mand = s.koen === "m";
    const over = (n) => (kendt ? A > n : null);
    const alderKrav = (n) => (kendt ? "" : ` (kriterium: over ${n} år)`);

    // Almene symptomer
    const uspec = ["vaegttab", "traethed", "feber", "smerter", "anaemi"].filter(h);
    if (uspec.length) add("dpf", 2, `Uspecifikke symptomer (${uspec.map((k) => SYMPTOM[k].tekst.toLowerCase()).join(", ")}) — basisudredning med regionens blodprøvepakke; henvis til diagnostisk pakkeforløb ved fortsat mistanke om alvorlig sygdom`);
    if (h("metastase")) add("dpf", 3, "Metastasesuspekte forandringer uden kendt primærtumor (lungemetastaser → lungekræftpakken; aksillymfeknude hos kvinde → brystkræftpakken; solitær proces i hjernen → hjernekræftpakken)");
    if (h("anaemi")) {
      add("leukaemi", 2, "Uforklaret isoleret anæmi: mål B12, folat og ferritin — uden mangeltilstand er det indgangskriterium (mistanke om MDS)");
      add("myelom", 1, "Anæmi: overvej M-komponent, calcium og kreatinin");
    }
    if (h("feber")) add("lymfom", 1, "Feber eller nattesved (B-symptom) — undersøg lymfeknuder og milt");

    // Lunger og brysthule
    const lungeRisiko = s.ryger && over(40) !== false;
    if (h("hoste")) {
      if (lungeRisiko) add("lunge", 2, `Hoste i over 4–6 uger hos nuværende/tidligere ryger${alderKrav(40)} → CT af thorax og øvre abdomen`);
      else add("lunge", 0, s.ryger ? "Hoste hos ryger under 40 år er ikke indgangskriterium alene — vurdér klinisk" : "Hoste uden rygeanamnese er ikke indgangskriterium alene — vurdér klinisk; billeddiagnostik ved fortsat mistanke (afkryds rygning, hvis relevant)");
    }
    if (h("haemoptyse")) add("lunge", 2, "Hæmoptyse → CT af thorax og øvre abdomen uanset alder og rygning");
    if (h("aandenoed")) {
      if (lungeRisiko) add("lunge", 2, `Nytilkommen åndenød med abnorm spirometri hos ryger${alderKrav(40)} → CT af thorax og øvre abdomen`);
      add("mesotheliom", 1, "Åndenød — tænk lungehindekræft ved pleuraansamling eller asbesteksponering");
    }
    if (h("brystsmerter")) {
      add("mesotheliom", 1, "Længerevarende brystsmerter — tænk lungehindekræft ved asbesteksponering");
      if (lungeRisiko) add("lunge", 2, `Brystsmerter hos ryger${alderKrav(40)} — andre symptomer, der kan skyldes lungekræft → CT`);
    }
    if (h("lungefund")) add("lunge", 3, "Malignitetssuspekt infiltrat eller tumor på billeddiagnostik");
    if (h("pleura")) {
      add("mesotheliom", 3, "Ensidig pleuraansamling eller pleurafortykkelse med klinisk mistanke");
      add("lunge", 1, "Pleuraansamling kan også skyldes lungekræft eller metastaser");
    }

    // Mave og tarm
    const oevreAlarm = ["dysfagi", "opkast", "gibloed"].filter(h);
    if (h("dysfagi")) add("spiseroer", 3, "Synkebesvær (dysfagi) → gastroskopi i pakkeforløb");
    if (h("opkast")) add("spiseroer", 3, "Vedvarende opkastning → gastroskopi i pakkeforløb");
    if (h("gibloed")) add("spiseroer", 3, "Blødning fra øvre mave-tarmkanal → gastroskopi; akut indlæggelse ved kredsløbspåvirkning");
    if (h("vaegttab") && (oevreAlarm.length || h("dyspepsi"))) add("spiseroer", 3, "Uforklaret vægttab med øvre mave-tarmsymptomer");
    if (h("dyspepsi") && !oevreAlarm.length) {
      if (over(45) === false && !h("vaegttab") && !h("jernmangel")) add("spiseroer", 0, "Nyopstået dyspepsi under 45 år uden alarmsymptomer: test og behandl for H. pylori");
      else add("spiseroer", 2, `Nyopstået dyspepsi eller refluks${kendt ? ` hos ${A}-årig` : ""} — overvej gastroskopi i pakkeforløb (fx Region Sjælland: over 45 år)`);
    }
    if (h("rektalbloed")) {
      add("tyktarm", 3, `Blødning fra tarmen uden oplagt årsag${over(40) === false ? " — også under 40 år, når anden årsag ikke er bekræftet" : ""}`);
      add("anal", 1, "Inspicér anus og eksplorér — knude eller sår ved anus → analkræft");
    }
    if (h("afforing")) add("tyktarm", 3, "Ændret afføringsmønster i over 4 uger");
    if (h("mavesmerter")) add("tyktarm", 3, "Nytilkomne mavesmerter i over 4 uger");
    if (h("jernmangel")) {
      add("tyktarm", 3, "Uforklaret jernmangelanæmi");
      add("spiseroer", 1, "Jernmangel: overvej også øvre kilde (gastroskopi) — særligt ved øvre mave-tarmsymptomer");
    }
    if (h("ikterus")) add("pancreas", 3, "Ikterus uden åbenlys forklaring");
    if (h("leverfund")) add("pancreas", 3, "Tumor i pancreas, galdeveje eller lever på billeddiagnostik");
    if (h("abdtumor")) {
      if (!mand) add("aeggestok", kvinde ? 2 : 1, "Udfyldning eller hævelse i maven hos kvinde → CA-125 og gynækologisk ultralyd (RMI)");
      add("tyktarm", 1, "Palpabel udfyldning i abdomen: rektaleksploration og billeddiagnostik");
      add("dpf", 1, "Udfyldning i abdomen uden organholdepunkt → CT og diagnostisk pakkeforløb");
    }
    if (h("anal")) add("anal", 2, "Knude, sår, smerter eller kløe ved anus → kirurgisk speciallæge (anoskopi og biopsi)");

    // Urinveje og mandlige kønsorganer
    if (h("makrohaem")) add("urinveje", 3, "Makroskopisk hæmaturi uden anden åbenbar årsag");
    if (h("mikrohaem")) {
      const led = h("blaeresympt") || h("nyreudfyld");
      if (!led) add("urinveje", 0, `Asymptomatisk mikroskopisk hæmaturi: ingen kræftudredning — overvej nyremedicinsk vurdering ved proteinuri eller nedsat eGFR (${lenke("../nyre/ckd.html", "Kronisk nyresygdom")})`);
      else if (over(60) === false) add("urinveje", 0, `Mikroskopisk hæmaturi hos ${A}-årig: kriteriet gælder kun over 60 år — vurdér klinisk`);
      else add("urinveje", 3, `Mikroskopisk hæmaturi${kendt ? ` hos ${A}-årig` : ""} med smerter, irritative vandladningsgener eller udfyldning${alderKrav(60)}`);
    } else if (h("blaeresympt") && !h("makrohaem")) add("urinveje", 0, "Blære-/flankesmerter og vandladningsgener er kun kriterium sammen med mikroskopisk hæmaturi hos personer over 60 år — tjek urinstix");
    if (h("nyreudfyld")) add("urinveje", 3, "Palpabel udfyldning ved nyren");
    if (h("dre")) add("prostata", 3, "Suspekt prostata ved rektaleksploration");
    if (!isNaN(s.psa)) {
      const g = psaGraense(A);
      const v = fmtTal(s.psa);
      if (g === null) add("prostata", 1, `PSA ${v} ng/ml — angiv alder: grænsen er 3,0 under 60 år, 4,0 ved 60–70 år og 5,0 over 70 år`);
      else if (s.psa > g) add("prostata", s.psa2 ? 3 : 2, s.psa2 ? `PSA ${v} ng/ml over aldersgrænsen ${fmtTal(g)} ved to målinger` : `PSA ${v} ng/ml over aldersgrænsen ${fmtTal(g)} — udeluk UVI og gentag; henvis, hvis også anden måling er forhøjet`);
      else add("prostata", 0, `PSA ${v} ng/ml er ikke over aldersgrænsen ${fmtTal(g)} ng/ml`);
    }
    if (h("luts") && !m.prostata) add("prostata", 0, "Vandladningsgener alene: PSA kun ved mistanke om prostatakræft, familiær disposition eller tegn på spredning");
    if (h("testis")) add("testikel", 3, "Knude eller uforklaret forstørrelse af testikel");
    if (h("gynaekomasti")) add("testikel", 3, "Nyopstået gynækomasti hos yngre mand — undersøg testiklerne");
    if (h("penis")) add("penis", 2, "Forandring på penis, der ikke heler → urolog eller dermatolog (biopsi)");

    // Bryst og kvindelige kønsorganer
    if (h("brystknude")) add("bryst", 3, "Knude i brystet");
    if (h("brysthud")) add("bryst", 3, "Hud- eller brystvorteforandringer");
    if (h("aksil")) {
      if (kvinde) add("bryst", 3, "Forstørret lymfeknude i armhulen hos kvinde uden anden forklaring");
      else {
        add("lymfom", mand ? 3 : 2, "Forstørret lymfeknude i armhulen (over ca. 1,5–2 cm) uden oplagt årsag");
        add("bryst", mand ? 1 : 3, mand ? "Undersøg også brystet (brystkræft hos mænd)" : "Hos kvinder: forstørret lymfeknude i armhulen → brystkræftpakken");
      }
    }
    if (h("pmb")) add("livmoder", 2, "Blødning efter menopausen → gynækologisk undersøgelse og gynækolog (transvaginal ultralyd og biopsi)");
    if (h("postcoital")) add("livmoderhals", 2, "Postkoital blødning eller mellemblødning → gynækologisk undersøgelse med spekulum; gynækolog ved fund eller fortsat blødning");
    if (h("cervixtumor")) add("livmoderhals", 3, "Synlig suspekt tumor eller celleprøve med kræft/mistanke om kræft");
    if (h("vulva")) add("vulva", 2, "Vedvarende forandring på vulva → gynækolog (biopsi)");
    if (!isNaN(s.ca125)) {
      const v = fmtTal(s.ca125);
      if (s.ul === null) add("aeggestok", 2, `CA-125 ${v} U/ml — gynækologisk ultralyd mangler for at beregne RMI`);
      else {
        const r = Math.round(rmi(s.ca125, s.ul, s.post));
        const t = `RMI ${r} (ultralydscore ${s.ul === 0 ? 0 : s.ul === 1 ? 1 : 3} × menopause ${s.post ? 3 : 1} × CA-125 ${v})`;
        add("aeggestok", r >= 200 ? 3 : 1, r >= 200 ? `${t} — 200 eller derover` : `${t} — under 200; vurdér klinisk og følg op hos gynækolog`);
      }
    }

    // Hoved, hals og nervesystem
    if (h("haeshed")) add("hovedhals", 2, `Hæshed i over 2 uger uden bedring${over(40) ? " hos person over 40 år" : ""} → øre-næse-halslæge`);
    if (h("halsglands")) {
      add("hovedhals", 2, "Forstørret lymfeknude på halsen uden infektiøs eller godartet forklaring → øre-næse-halslæge");
      add("lymfom", 1, "Ved samtidige lymfeknuder andre steder, forstørret milt eller B-symptomer → hæmatologi");
    }
    if (h("mund")) add("hovedhals", 2, "Sår eller knude i mund eller svælg, der ikke heler");
    if (h("naese")) add("hovedhals", 2, "Ensidige symptomer fra næse eller bihuler");
    if (h("synkesmerter")) add("hovedhals", 2, "Synkesmerter eller globus med udstråling til øret");
    if (h("thyreoidea")) add("hovedhals", 2, "Suspekt knude i skjoldbruskkirtlen — TSH, og henvis til øre-næse-halslæge");
    if (h("neuro")) add("hjerne", 4, "Nye fokale neurologiske udfald, der progredierer over dage til uger");
    if (h("epilepsi")) add("hjerne", 4, "Nyt epileptisk anfald hos voksen uden oplagt årsag");
    if (h("personlighed")) add("hjerne", 4, "Adfærds-, personligheds- eller kognitiv ændring, der progredierer over uger til måneder");
    if (h("hjernefund")) add("hjerne", 4, "Rumopfyldende proces på CT/MR");
    if (h("hovedpine")) add("hjerne", 2, "Ny eller ændret hovedpine, der progredierer over 3–4 uger → neurologisk vurdering; pakkeforløb, hvis neurolog ikke finder anden årsag (kronisk hovedpine er ikke indikation)");
    if (h("oeje")) add("oeje", 2, "Symptomer fra øjenhulen → praktiserende øjenlæge; TSH");
    if (h("leukokori")) add("oeje", 2, "Hvid pupil → øjenlæge (hos børn akut til øjenafdeling)");

    // Hud, knogler og bløddele
    if (h("modermaerke")) add("melanom", 2, "Nyt eller forandret modermærke → dermatoskopi; dermatolog, eller plastikkirurgi ved begrundet mistanke");
    if (h("bloeddel")) add("sarkom", 2, "Bløddelsknude over 5 cm, dyb eller i hurtig vækst → ultralyd/MR og sarkomcenter");
    if (h("knogletumor")) {
      add("sarkom", 2, "Palpabel knogletumor → røntgen og sarkomcenter");
      add("myelom", 1, "Knogleforandring: M-komponent, calcium og kreatinin");
    }
    if (h("knoglesmerter")) {
      add("sarkom", 2, "Dybe, vedvarende knoglesmerter uden forklaring → røntgen");
      add("myelom", 1, "Knoglesmerter: M-komponent, calcium og kreatinin");
      if (!kvinde) add("prostata", 1, "Knoglesmerter hos mand: PSA (spredning?)");
      add("dpf", 1, "Uforklarede knoglesmerter uden organholdepunkt → diagnostisk pakkeforløb");
    }

    // Blod og lymfe
    if (h("lymfeknude")) add("lymfom", 3, "Forstørrede lymfeknuder (over ca. 1,5–2 cm) uden oplagt årsag");
    if (h("splenomegali")) {
      add("lymfom", 3, "Forstørret milt uden anden forklaring");
      add("myeloid", 1, "Forstørret milt kan også skyldes kronisk myeloid sygdom — blodtal med differentialtælling");
    }
    if (h("lymfocytose")) {
      if (h("lymfeknude") || h("splenomegali") || h("feber") || h("aksil") || h("halsglands")) add("lymfom", 3, "Persisterende lymfocytose sammen med lymfeknuder, forstørret milt eller B-symptomer");
      else add("lymfom", 1, "Isoleret persisterende lymfocytose → drøft med eller henvis til hæmatolog (ikke pakkeforløb)");
    }
    if (h("blaster")) add("leukaemi", 4, "Blaster i blodet");
    if (h("cytopeni")) add("leukaemi", 4, "Bi- eller pancytopeni uden mangeltilstand");
    if (h("myeloidfund")) add("myeloid", 3, "Uforklaret, persisterende leukocytose, monocytose, trombocytose eller høj hæmatokrit (mangeltilstand og reaktive årsager udelukket)");
    if (h("mkomp")) {
      const organ = [["anaemi", "anæmi"], ["kreatinin", "forhøjet kreatinin"], ["hyperkalk", "hypercalcæmi"], ["fraktur", "knogleforandring"], ["knogletumor", "knogleforandring"]].filter(([k]) => h(k)).map(([, t]) => t);
      if (organ.length) add("myelom", 3, `M-komponent sammen med ${[...new Set(organ)].join(" og ")}`);
      else add("myelom", 1, "M-komponent uden organpåvirkning (mulig MGUS) — kontrol eller hæmatologisk vurdering");
    }
    if (h("fraktur") && !h("mkomp")) add("myelom", 2, "Sammenfald af ryghvirvel eller osteolyse uden anden årsag → M-komponent, calcium og kreatinin");
    if (h("hyperkalk")) {
      if (!h("mkomp")) add("myelom", 2, "Hypercalcæmi → M-komponent og PTH");
      add("dpf", 1, "Hypercalcæmi uden forklaring kan være malign — akut indlæggelse ved svær hypercalcæmi");
    }
    if (h("kreatinin") && !h("mkomp")) add("myelom", 1, "Uforklaret forhøjet kreatinin: M-komponent");

    // Organpakke slår diagnostisk pakkeforløb ved uspecifikke symptomer.
    const organ = Object.values(m).some((x) => x.id !== "dpf" && x.niv >= 2);
    if (m.dpf && organ && m.dpf.niv === 2) {
      m.dpf.niv = 1;
      m.dpf.grunde.push("Peger symptomerne på et organ, bruges organpakken — diagnostisk pakkeforløb ved negativ organudredning");
    }

    // Børn og unge under 18 år: børnepakken i stedet for voksenpakkerne.
    if (kendt && A < 18 && s.sym.size) {
      const akut = BOERN_AKUT.some(h);
      const fund = Array.from(s.sym).map((k) => SYMPTOM[k].tekst.toLowerCase());
      return {
        liste: [{ id: "boern", niv: akut ? 4 : 3, grunde: [`Barn/ung (${A} år) med ${fund.join(", ")}`, akut ? "Fund, der kræver akut henvisning — ring til børneafdelingen nu" : "Ved begrundet mistanke: telefonisk kontakt og akut henvisning til børneafdeling — voksenpakkernes kriterier gælder ikke for børn"].concat(h("leukokori") ? ["Hvid pupil: akut til øjenafdeling (retinoblastom)"] : []) }],
        voksne: Object.keys(m).length,
      };
    }

    const liste = Object.values(m).sort((a, b) => b.niv - a.niv || b.grunde.length - a.grunde.length || P[a.id].navn.localeCompare(P[b.id].navn, "da"));
    return { liste, voksne: 0 };
  }

  // ---------------------------------------------------------------------
  // Visning
  // ---------------------------------------------------------------------

  function pakkeIndhold(p) {
    let h = "";
    if (p.begrundet.length) h += `<p><strong>${p.akut ? "Akut henvisning ved" : "Begrundet mistanke (pakkeforløb)"}:</strong></p>${ul(p.begrundet.map(esc))}`;
    if (p.mistanke.length) h += `<p><strong>Mistanke — udredning eller filterfunktion først:</strong></p>${ul(p.mistanke.map(esc))}`;
    h += `<p><strong>I almen praksis:</strong></p>${ul(p.gp.map(esc))}`;
    h += `<p><strong>Henvis:</strong> ${esc(p.henvis)}.</p>`;
    if (p.obs.length) h += `<p><strong>Bemærk:</strong></p>${ul(p.obs.map(esc))}`;
    return h;
  }

  const journalValg = {};
  const iJournal = (x) => (x.id in journalValg ? journalValg[x.id] : x.niv >= 2);
  output.addEventListener("change", (e) => {
    const id = e.target.dataset && e.target.dataset.journal;
    if (id) journalValg[id] = e.target.checked;
  });
  output.addEventListener("click", (e) => {
    const id = e.target.dataset && e.target.dataset.vaelg;
    if (!id) return;
    const cb = document.querySelector(`input[name="sym"][value="${id}"]`);
    if (cb) {
      cb.checked = true;
      $("soeg").value = "";
      update();
    }
  });

  function matchBoks(x) {
    const p = P[x.id];
    const n = NIVEAU[x.niv];
    const titel = `${esc(p.navn)} <span class="chip ${n.chip}">${n.label}</span>`;
    let body = `<p><strong>Hvorfor:</strong></p>${ul(x.grunde)}`;
    if (x.niv >= 1) body += `<p><strong>Gør nu:</strong></p>${ul(p.gp.map(esc))}<p><strong>Henvis:</strong> ${esc(p.henvis)}.</p>`;
    body += `<details class="pakke-kort"><summary>Alle indgangskriterier for pakken</summary>${pakkeIndhold(p)}</details>`;
    body += `<label class="checkbox journal-valg"><input type="checkbox" data-journal="${x.id}"${iJournal(x) ? " checked" : ""}> Med i journalnotatet</label>`;
    return `<div class="box ${n.cls} pakke-match" data-pakke="${x.id}"><h3>${titel}</h3>${body}</div>`;
  }

  function soegning(q) {
    const ord = q.split(" ").filter(Boolean);
    const passer = (t) => ord.every((o) => norm(t).includes(o));
    const pakker = PAKKER.filter((p) => passer(`${p.navn} ${p.ord} ${p.begrundet.join(" ")} ${p.mistanke.join(" ")}`));
    const sym = Object.values(SYMPTOM).filter((x) => passer(x.tekst));
    document.querySelectorAll('input[name="sym"]').forEach((cb) => cb.closest("label").classList.toggle("symptom-match", !!q && sym.some((x) => x.id === cb.value)));
    if (!q) return "";
    let body = "";
    if (sym.length) body += `<p><strong>Symptomer og fund:</strong></p><p>${sym.map((x) => `<button type="button" class="btn btn-outline btn-small" data-vaelg="${x.id}">+ ${esc(x.tekst)}</button>`).join("")}</p>`;
    if (pakker.length) body += `<p><strong>Pakkeforløb:</strong></p>${pakker.map((p) => `<details class="pakke-kort"${pakker.length <= 2 ? " open" : ""}><summary>${esc(p.navn)}</summary>${pakkeIndhold(p)}</details>`).join("")}`;
    if (!body) body = "<p>Intet fundet — prøv et andet ord (fx hæmaturi, synkebesvær, knude, PSA, hæshed).</p>";
    return box("box-blue soegeresultat", `Søgning: "${esc($("soeg").value.trim())}"`, body);
  }

  function katalog(aaben) {
    const l = PAKKER.slice().sort((a, b) => a.navn.localeCompare(b.navn, "da"));
    return `<div class="katalog">${foldbar("box-blue", `Alle pakkeforløb (A–Å) — ${l.length}`, l.map((p) => `<details class="pakke-kort"><summary>${esc(p.navn)}</summary>${pakkeIndhold(p)}</details>`).join(""), aaben)}</div>`;
  }

  function henvisningsBoks(liste) {
    const l = [
      "<strong>Begrundet mistanke:</strong> henvis elektronisk og markér henvisningen som pakkeforløb (kræftpakke); ring ved akutte forløb.",
      "<strong>Informér patienten</strong> om, at der er begrundet mistanke om kræft, hvad der skal ske, og hvornår.",
      "Pakkeforløbene har faste forløbstider; første fremmøde er typisk inden for ca. en uge. Blodprøver og billeddiagnostik må ikke forsinke henvisningen.",
      "<strong>Kriterierne er ikke udtømmende:</strong> lægens kliniske mistanke kan begrunde henvisning. Uspecifikke symptomer → diagnostisk pakkeforløb.",
      "Henvisningsadresser og blodprøvepakker er regionale — følg regionens forløbsbeskrivelse (sundhed.dk).",
      "<strong>Sikkerhedsnet:</strong> aftal opfølgning, hvis symptomerne fortsætter efter negativ udredning.",
    ];
    return foldbar("box-blue", "Sådan henviser du", ul(l), !liste.length);
  }

  let sidst = null;

  function update() {
    const s = getState();
    const koen = s.koen;
    document.querySelectorAll("#symptomFelter label[data-koen]").forEach((l) => (l.hidden = !!koen && l.dataset.koen !== koen));
    $("psaFelt").hidden = koen === "k";
    $("caFelt").hidden = koen === "m";
    $("postFelt").hidden = koen === "m";
    $("alderWarning").textContent = !isNaN(s.alder) && s.alder < 18 ? "Under 18 år: børnepakken (akut børneafdeling) bruges i stedet for voksenpakkerne." : "";
    const v = vurder(s);
    sidst = { s, v };
    let html = soegning(s.soeg);
    const n = v.liste.length;
    if (!s.sym.size && !n) {
      html += box("box-blue", "Find den rigtige kræftpakke", "<p>Søg på et symptom, et fund eller en kræftform, eller afkryds symptomer og fund til venstre — så vises de relevante pakkeforløb med indgangskriterier, hvad der gøres i almen praksis, og hvortil der henvises.</p><p>Alder, køn og rygning bruges til kriterier som PSA-grænser, mikroskopisk hæmaturi over 60 år og lungekræft over 40 år.</p>");
    } else if (!n) {
      html += box("box-green", "Ingen pakke matcher", "<p>De valgte fund opfylder ikke et indgangskriterium. Kriterierne er ikke udtømmende — ved fortsat mistanke om alvorlig sygdom: diagnostisk pakkeforløb eller drøftelse med relevant afdeling.</p>");
    } else {
      const top = v.liste[0];
      const maal = v.liste.filter((x) => x.niv >= 1);
      if (maal.length) html += box(NIVEAU[top.niv].cls, `Forslag: ${esc(P[top.id].navn)}`, `<p>${NIVEAU[top.niv].label}${maal.length > 1 ? ` — og ${maal.length - 1} ${maal.length === 2 ? "anden pakke" : "andre pakker"} at overveje nedenfor` : ""}.</p>${v.voksne ? "<p>Voksenpakkerne er udeladt, fordi patienten er under 18 år.</p>" : ""}`);
      html += v.liste.filter((x) => x.niv >= 1).map(matchBoks).join("");
      const ikke = v.liste.filter((x) => x.niv === 0);
      if (ikke.length) html += box("box-green", "Ikke indgangskriterium alene", ul(ikke.map((x) => `<strong>${esc(P[x.id].navn)}:</strong> ${x.grunde.join("; ")}`)));
    }
    html += henvisningsBoks(v.liste);
    html += katalog(!s.sym.size && !s.soeg);
    output.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Journal og kopiering
  // ---------------------------------------------------------------------

  const tekst = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent.replace(/\s+/g, " ").trim();
  };

  function buildJournalNote() {
    const { s, v } = sidst;
    const L = [`Kræftpakke-vurdering ${fmtDato(new Date())}`];
    const pt = [!isNaN(s.alder) ? `${s.alder} år` : "", s.koen === "k" ? "kvinde" : s.koen === "m" ? "mand" : "", s.ryger ? "ryger/tidligere ryger" : "", s.post ? "postmenopausal" : ""].filter(Boolean);
    if (pt.length) L.push(`Patient: ${pt.join(", ")}.`);
    if (s.sym.size) L.push(`Symptomer/fund: ${Array.from(s.sym).map((k) => SYMPTOM[k].tekst).join("; ")}.`);
    const tal = [];
    if (!isNaN(s.psa)) tal.push(`PSA ${fmtTal(s.psa)} ng/ml${s.psa2 ? " (to målinger)" : ""}`);
    if (!isNaN(s.ca125)) tal.push(`CA-125 ${fmtTal(s.ca125)} U/ml`);
    if (tal.length) L.push(`Prøver: ${tal.join(", ")}.`);
    const valgt = v.liste.filter(iJournal);
    valgt.forEach((x) => {
      const p = P[x.id];
      L.push(`${p.navn}: ${NIVEAU[x.niv].label}. ${x.grunde.map(tekst).join(". ")}.${x.niv >= 2 ? ` Plan: ${p.henvis}.` : ""}`);
    });
    if (valgt.some((x) => x.niv >= 3)) L.push("Pt. informeret om begrundet mistanke om kræft, om pakkeforløbet og om det videre forløb (tilpas).");
    else L.push("Sikkerhedsnet: ny kontakt ved forværring eller vedvarende symptomer (tilpas).");
    return L.join("\n");
  }

  function buildFullText() {
    const L = [];
    output.querySelectorAll(".box:not(.soegeresultat)").forEach((b) => {
      if (b.closest(".katalog")) return;
      const h3 = b.querySelector("h3");
      if (h3) L.push(h3.textContent.replace(/\s+/g, " ").trim().toUpperCase());
      b.querySelectorAll(":scope > p, :scope > ul, :scope > details > p, :scope > details > ul").forEach((el) => {
        if (el.tagName === "P") L.push(el.textContent.replace(/\s+/g, " ").trim());
        else el.querySelectorAll(":scope > li").forEach((li) => L.push(`- ${li.textContent.replace(/\s+/g, " ").trim()}`));
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
  // Søgefeltet opdateres ved "input"; dets "change" ved blur ville gentegne resultatet midt i et klik.
  form.addEventListener("change", (e) => e.target.id !== "soeg" && update());
  $("copyBtn").addEventListener("click", () => copyText(buildJournalNote()));
  $("copyFullBtn").addEventListener("click", () => copyText(buildFullText()));
  $("resetBtn").addEventListener("click", () => {
    form.reset();
    Object.keys(journalValg).forEach((k) => delete journalValg[k]);
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
