/*
 * Udfyld fra journaltekst: lægen indsætter et notat (fx fra Noteless eller en
 * diktering), og værktøjets felter udfyldes med faste regler i browseren.
 * Intet sendes nogen steder hen. Alt, der udfyldes, markeres og vises i en
 * rapport med den tekst, det er fundet i — lægen skal altid kontrollere det.
 *
 * Brug: Udfyld.init((L) => [ ...fund ], { vigtige: [["alder", "Alder"], ...] })
 * Et fund er et af:
 *   { type: "num", id, v, label, kilde, note }
 *   { type: "radio", name, value, label, kilde }
 *   { type: "check", name, value, on, label, kilde }
 *   { type: "hidden", id, v, label }
 *   { type: "note", tekst }
 */
window.Udfyld = (function () {
  "use strict";

  // Ordgrænser, der også virker med æ, ø og å (JavaScripts \b gør ikke).
  const B = "(?<![a-zæøåé0-9])";
  const E = "(?![a-zæøåé0-9])";
  // Nægtelse før et fund (højst ca. otte ord før) og efter et fund ("feber: nej", "strep A ÷").
  const NEG = new RegExp(`${B}(ingen|ikke|uden|benægter|benægtes|negativ|neg\\.?|afkræft\\w*|aldrig|intet|ej|seponer\\w*|pauser\\w*|ophørt|stoppet)${E}|(?:^|\\s)÷\\s*$`);
  // "-" er kun nægtelse, når det står alene ("feber -"), ikke i sammensatte ord ("KOL-kontrol").
  const NEG_EFTER = /^\s*[:=]?\s*(?:er\s+|var\s+|blev\s+)?(nej|neg(?![a-zæøå])|negativ|÷|\(-\)|ikke til stede|benægtes|afkræftet|udelukket|seponeret|pauseret|ophørt|stoppet|udtrappet|-(?![\d>a-zæøåé]))/;
  // Led, hvor nægtelsen ikke rækker ind: "uden bedring, men fortsat feber".
  const SKIFT = new RegExp(`${B}(?:men|dog|stadig|fortsat|nu|til gengæld|derimod|udover|ud over|bortset fra|foruden)${E}`);
  // Hypotetisk omtale, råd og ønsker: "hvis feber", "informeret om at søge læge ved nakkestivhed".
  // Råd og betingelser gælder altid; ønsker og planer ("ønsker p-piller") kun ved udfyldning af felter.
  const HYPO = new RegExp(`${B}(?:hvis|såfremt|i tilfælde af|obs\\.?\\s*(?:for|på)|informeret|instrueret|vejledt|oplyst om|rådgivet|(?:at|bør|skal)\\s+søge|vaccin\\w*)${E}`);
  const HYPO_OENSKE = new RegExp(`${B}(?:forebyg\\w*|ønske\\w*|planlæg\\w*|forsøg\\w*|(?:at|vil|kan)\\s+blive)${E}`);
  const HYPO_START = /^\s*ved(?![a-zæøå])(?!\s+(?:us|undersøg|obj|klinisk|stix|auskult|palp|insp|indlæg|kontrol|konsultation|besøg|lyt|tilsyn|fremmøde|ankomst|henvendelse|tlf|telefon|opkald|visitation|modtagelse))/;
  // Råd med "ved" efter: "Genkontakt ved feber", "Kontakt lægen ved flankesmerter", "Panodil ved feber".
  const HYPO_VED = new RegExp(`${B}(?:(?:gen)?kontakt\\w*|henvend\\w*|søg\\w*|ring\\w*|retur\\w*|sikkerhedsnet|råd\\w*|panodil|pamol|pinex|paracetamol|ibuprofen|ipren|pn|p\\.n\\.)${E}[^.;\\n]{0,40}${B}ved${E}`);
  const HYPO_EFTER = new RegExp(`${B}(?:genkontakt\\w*|kontakte?\\s+(?:igen|os|lægen|læge|vagtlægen|lægevagten|1813|112)|søge?\\s+(?:læge|lægevagt|skadestue))${E}`);
  // Familieanamnese: "mor har diabetes", "disp. til hjertesygdom".
  const FAMILIE = new RegExp(`${B}(?:(?:mor|moder|far|fader|søster|bror|broder|forældre|søskende|bedstemor|bedstefar|mormor|morfar|farmor|farfar|onkel|tante)\\s+(?:har|havde|med|fik|døde|haft|er)|disp\\.?|disposition|familie\\w*|familiær\\w*|arvelig\\w*)${E}`);
  // Datoer før værdien springes over: "eGFR 12.03.26: 44".
  const DATO = "\\(?\\d{1,2}[./-]\\d{1,2}(?:[./-]\\d{2,4})?\\)?\\s*[:=]";
  const TAL = "(<|>|≤|≥)?\\s*(\\d+(?:[.,]\\d+)?)(?!\\d|[.,/-]\\d)";
  const SEP = `\\s*(?:${DATO}|[:=]|på|er|var|af|ca\\.?|målt til)?\\s*`;
  const BOGSTAV = /[a-zæøåé0-9]/;
  const NU = /(?:^|[^a-zæøå])(nu|i dag|aktuel\w*|seneste|nyeste|p\.t\.)(?![a-zæøå])/;
  const TIDL = /tidligere|siden|sidste år|i fjor|forrige|året før|dengang|initialt|ved debut|(?:19|20)\d\d/;
  const GAMMEL = /tidligere|for (?:ca\.?\s*)?(?:\d+|en|et|to|tre|fire|flere|mange) (?:uger?|måneder?|mdr\.?|år) siden|(?:19|20)\d\d|sidste år|i fjor|anamnestisk/;

  const parseTal = (s) => parseFloat(String(s).replace(",", "."));
  const erCifre = (c) => c >= "0" && c <= "9";
  const ord = (s) => s.split(/\s+/).filter(Boolean);

  // Grænser for sætninger og led: . ; ! ? linjeskift og komma (ikke i decimaltal).
  function erGraense(t, i) {
    const c = t[i];
    if (c === "\n" || c === ";" || c === "!" || c === "?") return true;
    if (c === "." || c === ",") return !(erCifre(t[i - 1] || "") && erCifre(t[i + 1] || ""));
    return false;
  }
  const erSaetning = (t, i) => erGraense(t, i) && t[i] !== ",";

  // Samler mellemrum og tomme linjer, så lange mellemrum ikke gør de regulære udtryk langsomme.
  const normaliser = (s) => String(s).replace(/[\r\v\f\u2028\u2029]/g, "\n").replace(/[ \t\u00a0\u2000-\u200b]+/g, " ").replace(/[ \n]*\n[ \n]*/g, "\n");

  function lib(raa) {
    const tekst = normaliser(raa);
    // Små bogstaver uden at ændre længden (så uddrag passer til den oprindelige tekst).
    const t = Array.from(tekst, (c) => {
      const l = c.toLowerCase();
      return l.length === c.length ? l : c;
    }).join("");
    const brugt = [];
    const erBrugt = (i) => brugt.some(([a, b]) => i >= a && i < b);
    const brug = (a, b) => brugt.push([a, b]);

    // Et led er højst 300 tegn — så også tekst uden tegnsætning behandles hurtigt.
    const ledStart = (i) => {
      let a = i;
      while (a > 0 && !erGraense(t, a - 1) && i - a < 300) a--;
      return a;
    };
    const ledSlut = (i) => {
      let b = i;
      while (b < t.length && !erGraense(t, b) && b - i < 300) b++;
      return b;
    };
    function leddetFor(i) {
      const del = t.slice(ledStart(i), i).split(new RegExp(`${B}men${E}`));
      return del[del.length - 1];
    }
    const leddetEfter = (i) => t.slice(i, ledSlut(i));
    const leddet = (i) => t.slice(ledStart(i), ledSlut(i));
    // Uddrag af teksten omkring et fund — klippes ikke midt i et ord.
    const kilde = (a, b) => {
      let s = a;
      while (s > 0 && !erGraense(t, s - 1) && a - s < 40) s--;
      let e = b;
      while (e < t.length && !erGraense(t, e) && e - b < 30) e++;
      while (s > 0 && BOGSTAV.test(t[s - 1])) s--;
      while (e < t.length && BOGSTAV.test(t[e])) e++;
      const start = s > 0 && !erGraense(t, s - 1) ? "…" : "";
      const slut = e < t.length && !erGraense(t, e) ? "…" : "";
      return start + tekst.slice(s, e).trim() + slut;
    };

    // Alle forekomster af et regex uden for allerede brugte områder.
    function alle(re) {
      const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      const ud = [];
      let m;
      while ((m = r.exec(t))) {
        if (!erBrugt(m.index)) ud.push(m);
        if (m[0].length === 0) r.lastIndex++;
      }
      return ud;
    }

    // "Ingen feber, hoste eller ondt i halsen": nægtelsen gælder hele opremsningen — og et råd
    // ("Genkontakt ved feber, flankesmerter eller …") gælder også hele opremsningen.
    function listeNaegtet(i) {
      const a = ledStart(i);
      if (t[a - 1] !== "," || ord(t.slice(a, i)).length > 3 || SKIFT.test(t.slice(a, i))) return null;
      let j = a - 1;
      for (let n = 0; n < 6; n++) {
        const s = ledStart(j);
        const seg = t.slice(s, j);
        if (hypoTekst(seg, false)) return "?";
        if (NEG.test(seg) && !SKIFT.test(seg)) {
          let slut = i;
          while (slut < t.length && !erSaetning(t, slut) && slut - i < 300) slut++;
          return new RegExp(`${B}eller${E}`).test(t.slice(i, slut)) ? "nej" : "?";
        }
        if (ord(seg).length > 4 || t[s - 1] !== ",") return null;
        j = s - 1;
      }
      return null;
    }

    // Klassificér én forekomst: "ja", "nej" eller "?" (hypotetisk, spørgsmål, familie, uklar opremsning).
    const hypoTekst = (s, oenske = true) => HYPO.test(s) || HYPO_VED.test(s) || (oenske && HYPO_OENSKE.test(s)) || HYPO_START.test(s);
    const hypotetisk = (i, slut, oenske = true) => {
      const helt = t.slice(ledStart(i), i);
      return hypoTekst(helt, oenske) || HYPO_EFTER.test(leddetEfter(slut));
    };
    // familie: true for sygdomme, hvor "mor har diabetes" ikke må tælle som patientens egen.
    // emne: true, når det kun gælder, hvad teksten handler om (Notat-indgangen) — så tæller ønsker
    // ("ønsker p-piller") og ubesvarede spørgsmål ("SCORE2?", "Start levothyroxin?").
    function klassificer(i, slut, { familie = false, emne = false } = {}) {
      if (hypotetisk(i, slut, !emne)) return "?";
      if (familie && FAMILIE.test(t.slice(ledStart(i), i))) return "?";
      const dele = leddetFor(i).split(SKIFT);
      const foer = ord(dele[dele.length - 1]).slice(-8).join(" ");
      const efter = leddetEfter(slut);
      if (NEG.test(foer) || NEG.test(foer + " ") || NEG_EFTER.test(efter)) return "nej";
      // Spørgsmål: "Feber? Nej." / "Gravid? Ja."
      const k = slut + efter.length;
      if (t[k] === "?") {
        const svar = leddetEfter(k + 1);
        if (/^\s*(nej|neg\w*|÷|-(?!\d)|ingen)/.test(svar)) return "nej";
        if (/^\s*(ja|\+|pos\w*)/.test(svar)) return "ja";
        return emne ? "ja" : "?";
      }
      const liste = listeNaegtet(i);
      if (liste) return liste;
      return "ja";
    }

    const L = {
      tekst,
      lav: t,
      B,
      E,
      // Ord eller udtryk: "ja", hvis mindst én forekomst er bekræftet; "nej", hvis de afkræftes;
      // null, hvis ordet ikke findes eller kun nævnes hypotetisk/i familien.
      term(monster, opts = {}) {
        const fund = alle(new RegExp(`${B}(?:${monster})`, "g")).map((m) => ({ m, k: klassificer(m.index, m.index + m[0].length, opts) }));
        if (!fund.length) return { status: null };
        const valg = fund.find((f) => f.k === "ja") || fund.find((f) => f.k === "nej");
        if (!valg) return { status: null, usikker: true, kilde: kilde(fund[0].m.index, fund[0].m.index + fund[0].m[0].length) };
        const m = valg.m;
        return { status: valg.k, kilde: kilde(m.index, m.index + m[0].length), index: m.index, fund };
      },
      // Tal efter en etiket, fx "CRP 64", "eGFR: 42", "CRP < 5".
      tal(etiket, { min = -Infinity, max = Infinity, alle: flere = false } = {}) {
        const re = new RegExp(`${B}(?:${etiket})${E}(?:\\s*\\([^()\\d]{1,15}\\))?${SEP}${TAL}`, "g");
        const ud = [];
        for (const m of alle(re)) {
          const v = parseTal(m[2]);
          if (!(v >= min && v <= max)) continue;
          ud.push({ v, op: m[1] || "", kilde: kilde(m.index, m.index + m[0].length), index: m.index, slut: m.index + m[0].length, efter: leddetEfter(m.index + m[0].length), foer: leddetFor(m.index), led: leddet(m.index) });
          if (!flere) break;
        }
        return flere ? ud : ud[0] || null;
      },
      // Første match af et regex; returnerer match og kilde.
      find(monster) {
        const m = alle(new RegExp(monster, "g"))[0];
        return m ? { m, kilde: kilde(m.index, m.index + m[0].length), index: m.index } : null;
      },
      alle,
      brug,
      leddetFor,
      leddetEfter,
      leddet,
      kilde,
      parseTal,
      klassificer,
    };

    // Vælg den aktuelle blandt flere målinger: "nu"/"i dag" vinder, ellers den eneste uden
    // tidsangivelse; ellers efter strategi ("laveste" eller "sidste") med en bemærkning.
    L.seneste = function (liste, navn, strategi = "sidste") {
      if (!liste.length) return null;
      if (liste.length === 1) return liste[0];
      const vis = liste.map((x) => String(x.v).replace(".", ",")).join(", ");
      const nu = liste.filter((x) => NU.test(x.led));
      const uden = liste.filter((x) => !NU.test(x.led) && !TIDL.test(x.led));
      if (nu.length === 1) return Object.assign({}, nu[0], { note: `flere ${navn}-værdier (${vis}) — den aktuelle er brugt` });
      if (!nu.length && uden.length === 1) return Object.assign({}, uden[0], { note: `flere ${navn}-værdier (${vis}) — den uden tidsangivelse er brugt` });
      const kand = nu.length ? nu : uden.length ? uden : liste;
      const v = strategi === "laveste" ? kand.reduce((p, q) => (q.v < p.v ? q : p)) : kand[kand.length - 1];
      return Object.assign({}, v, { note: `flere ${navn}-værdier (${vis}) uden klar tidsangivelse — ${strategi === "laveste" ? "den laveste" : "den sidst nævnte"} er brugt. Kontrollér` });
    };

    // ------------------------------------------------------------------
    // Fælles udtræk
    // ------------------------------------------------------------------

    L.alder = function () {
      const mdr = L.find(`(\\d{1,2})\\s*(?:måneder|mdr\\.?|md\\.)\\s*(?:gammel|gl\\.?)`) || L.find(`(?:barn|dreng|pige|spædbarn)\\s*,?\\s*(?:på\\s*)?(\\d{1,2})\\s*(?:måneder|mdr)`);
      if (mdr) return { v: Math.round((parseTal(mdr.m[1]) / 12) * 100) / 100, kilde: mdr.kilde, note: `${mdr.m[1]} måneder omregnet til år` };
      const uger = L.find(`(\\d{1,2})\\s*uger\\s*(?:gammel|gl)`);
      if (uger) return { v: Math.round((parseTal(uger.m[1]) / 52) * 100) / 100, kilde: uger.kilde, note: `${uger.m[1]} uger omregnet til år` };
      const mønstre = [
        `(\\d{1,3})\\s*-?\\s*årig`,
        `(\\d{1,3})\\s*år\\s*gammel`,
        `${B}alder\\s*[:=]?\\s*(\\d{1,3})${E}`,
        `(\\d{1,3})\\s*år\\s*,?\\s*(?:gammel\\s*)?(?:mand|kvinde|dreng|pige|pt|patient)${E}`,
        `${B}(?:mand|kvinde|dreng|pige)\\s*,?\\s*(\\d{1,3})\\s*år${E}`,
      ];
      for (const mo of mønstre) {
        const f = L.find(mo);
        if (f && parseTal(f.m[1]) <= 110) return { v: parseTal(f.m[1]), kilde: f.kilde };
      }
      return null;
    };

    // Vægt: "vægt 72 kg", "vejer nu 22 kg" eller "72 kg" — ikke vægtændringer eller fødselsvægt.
    L.vaegt = function () {
      const ok = (m) => {
        const v = parseTal(m[1]);
        return v >= 1 && v <= 250 ? { v, kilde: kilde(m.index, m.index + m[0].length) } : null;
      };
      for (const m of alle(new RegExp(`${B}(?:vægt|vejer)(?:\\s*(?:nu|i dag|p\\.t\\.|aktuelt|ca\\.?))?\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)\\s*kg${E}`, "g"))) {
        const r = ok(m);
        if (r) return r;
      }
      for (const m of alle(new RegExp(`(?<![\\d.,])(\\d+(?:[.,]\\d+)?)\\s*kg${E}(?!\\s*\\/)`, "g"))) {
        const foer = t.slice(Math.max(0, m.index - 25), m.index);
        const efter = t.slice(m.index + m[0].length, m.index + m[0].length + 15);
        if (/(tab\w*|taget|tog|øget|øgning|fald\w*|fødsel\w*|steget|mistet|gået|[+±-])\s*(?:ca\.?\s*)?$|fødsel/.test(foer)) continue;
        if (/^\s*(på|op|ned|i vægt|vægttab|mere|mindre|lettere|tungere)(?![a-zæøå])/.test(efter)) continue;
        const r = ok(m);
        if (r) return r;
      }
      return null;
    };

    // Køn — ikke ledsagere ("ledsaget af sin mand").
    L.koen = function () {
      for (const m of alle(new RegExp(`${B}(mand|manden|kvinde|kvinden|dreng|drengen|pige|pigen)${E}`, "g"))) {
        if (/(?:sin|sit|hendes|hans|min|egen|ledsaget af|ledsager|med|og)\s*$/.test(t.slice(Math.max(0, m.index - 15), m.index))) continue;
        return { v: /^(mand|dreng)/.test(m[1]) ? "mand" : "kvinde", kilde: kilde(m.index, m.index + m[0].length) };
      }
      return null;
    };

    const TEMP = [`(?:${B}temp(?:eratur)?|${B}t|${B}feber)\\.?\\s*[:=]?\\s*(\\d{2}(?:[.,]\\d)?)(?!\\d|[.,]\\d)`, `(?<![\\d.,])(\\d{2}(?:[.,]\\d)?)\\s*(?:°\\s*c?|grader|c${E})`];
    const temps = () =>
      TEMP.flatMap((mo) => alle(new RegExp(mo, "g")))
        .filter((m) => !hypotetisk(m.index, m.index + m[0].length))
        .map((m) => ({ v: parseTal(m[1]), index: m.index, kilde: kilde(m.index, m.index + m[0].length) }))
        .filter((x) => x.v >= 34 && x.v <= 43)
        .sort((p, q) => p.index - q.index);
    L.temp = () => temps()[0] || null;

    // Feber: den sidste oplysning i teksten gælder ("afebril i går, i aften 39"); konflikt giver en note.
    L.feber = function () {
      const h = [];
      const afeb = L.term("afebril|feberfri");
      (afeb.fund || []).forEach((f) => f.k !== "?" && h.push({ i: f.m.index, s: f.k === "ja" ? "nej" : "ja", kilde: kilde(f.m.index, f.m.index + f.m[0].length) }));
      const fe = L.term("feber(?!fri)|febril|pyreksi");
      (fe.fund || []).forEach((f) => f.k !== "?" && h.push({ i: f.m.index, s: f.k, kilde: kilde(f.m.index, f.m.index + f.m[0].length) }));
      temps().forEach((x) => h.push({ i: x.index, s: x.v >= 38 ? "ja" : "nej", kilde: x.kilde }));
      if (!h.length) return { status: null };
      h.sort((p, q) => p.i - q.i);
      // Et temperaturtal lige efter ordet "feber" hører til samme oplysning.
      const sidste = h[h.length - 1];
      const konflikt = h.some((x) => x.s !== sidste.s);
      return { status: sidste.s, kilde: sidste.kilde, note: konflikt ? `teksten nævner både feber og feberfrihed — den sidste oplysning ("${sidste.kilde}") er brugt` : "" };
    };

    L.gravid = function () {
      const test = L.find(`graviditetstest\\w*\\s*[:=]?\\s*(pos\\w*|\\+|neg\\w*|÷|-)`);
      if (test) return { status: /^(pos|\+)/.test(test.m[1]) ? "ja" : "nej", kilde: test.kilde };
      return L.term(`gravid${E}|gravide${E}|graviditetsuge|uge\\s*\\d{1,2}\\s*\\+\\s*\\d|ga\\s*\\d{1,2}\\s*\\+\\s*\\d`);
    };

    // Penicillinallergi i de almindelige skriveformer. "Tåler ikke penicillin" og "ingen allergier
    // udover penicillin" er altid ja; "ingen kendte allergier" er kun nej, hvis intet andet siger ja.
    const STOF = "penicillin\\w*|amoxicillin|ampicillin|pivampicillin|pivmecillinam|dicloxacillin|flucloxacillin|pcv?|betalaktam\\w*|beta-laktam\\w*";
    L.allergi = function () {
      const sikker = L.find(`${B}(?:tåler ikke|tålte ikke|udover|ud over|bortset fra|undtagen)\\s+(?:${STOF})${E}`);
      if (sikker) return { status: "ja", kilde: sikker.kilde };
      const t1 = L.term(`(?:${STOF})-?\\s*allergi\\w*|(?:${STOF})-?\\s*overfølsomhed|(?:allergi\\w*|allergisk|overfølsom\\w*|reaktion|udslæt)\\s*(?:over for|overfor|for|mod|på|af|efter)\\s*(?:${STOF})${E}`);
      if (t1.status) return t1;
      for (const m of alle(new RegExp(`${B}(?:allergi\\w*|cave)\\s*[:=]?\\s*([^.;\\n]{0,40}?)(?:${STOF})${E}`, "g"))) {
        const mellem = m[1];
        const efter = leddetEfter(m.index + m[0].length);
        if (NEG.test(mellem) || /(?:^|\s)(nej|÷|-|0)(?:\s|,|$)/.test(mellem) || /^\s*(tåles|tålt|afkræftet|udelukket|nej|÷)/.test(efter)) continue;
        return { status: "ja", kilde: kilde(m.index, m.index + m[0].length) };
      }
      const ingen = L.find(`${B}(?:ingen (?:kendte )?(?:medicin)?allergier|nka${E}|allergi\\w*\\s*[:=]\\s*(?:ingen|nej|÷|0|-)(?![\\w\\d]))`);
      if (ingen) return { status: "nej", kilde: ingen.kilde };
      return { status: null };
    };

    // Laboratorieværdier
    L.egfr = (o) => L.tal(`e-?gfr|gfr`, Object.assign({ min: 2, max: 200 }, o));
    L.crp = () => L.seneste(L.tal(`crp`, { min: 0, max: 700, alle: true }), "CRP");
    L.sat = () => L.tal(`sat(?:uration)?|spo2|ilt-?mætning`, { min: 50, max: 100 });
    L.rf = function () {
      for (const x of L.tal(`rf|resp(?:\\.|irationsfrekvens)?|respirationsfrekvens`, { min: 5, max: 80, alle: true })) {
        if (/reuma|iu|u\/ml|ie/.test(x.efter.slice(0, 20))) continue;
        return x;
      }
      return null;
    };
    L.kalium = function () {
      for (const x of L.tal(`p-?kalium|kalium|p-k|(?<!-)k\\+?`, { min: 1.5, max: 9, alle: true })) {
        if (/^\s*(mg|µg|mikrog|ie|mcg)(?![a-zæøå])/.test(x.efter)) continue;
        return x;
      }
      return null;
    };
    L.uacr = function () {
      const f = L.tal(`uacr|u-?acr|acr|u-?albumin\\s*\\/\\s*kreatinin(?:-?ratio)?|albumin\\s*\\/\\s*kreatinin(?:-?ratio)?|albumin-?kreatinin-?ratio|u-?alb\\s*\\/\\s*krea`, { min: 0, max: 50000 });
      if (!f) return null;
      const enhed = f.efter.match(/^\s*mg\s*\/\s*(?:mmol|g)/);
      L.brug(f.index, f.slut + (enhed ? enhed[0].length : 0));
      if (/^\s*mg\s*\/\s*mmol/.test(f.efter)) return Object.assign(f, { v: Math.round(f.v * 8.84), note: `${String(f.v).replace(".", ",")} mg/mmol omregnet til mg/g (× 8,84)` });
      return f;
    };
    // P-kreatinin i µmol/l — ikke U-kreatinin (mmol/l) eller mg/dl.
    L.kreat = function () {
      for (const x of L.tal(`p-?kreatinin|(?<!u-?)kreatinin|p-?krea|(?<!u-?)krea`, { min: 20, max: 2000, alle: true })) {
        if (/^\s*(mmol|mg)(?![a-zæøå])/.test(x.efter)) continue;
        return x;
      }
      return null;
    };
    L.bt = function () {
      const f = L.find(`${B}(?:bt|blodtryk)${E}${SEP}(\\d{2,3})\\s*\\/\\s*(\\d{2,3})`);
      if (!f) return null;
      const s = parseTal(f.m[1]);
      const d = parseTal(f.m[2]);
      return s >= 60 && s <= 280 && d >= 30 && d <= 170 ? { s, d, kilde: f.kilde } : null;
    };

    // eGFR nu og tidligere: "faldet fra 52 til 44", "52 → 44", årstal eller "tidligere"/"nu".
    // Uden klar tidsangivelse bruges den laveste værdi (forsigtigst) med en bemærkning.
    L.egfrTid = function () {
      const ft = L.find(`e-?gfr[^.;\\n]{0,30}?(?:fra\\s*(\\d{1,3})\\s*(?:til|→|->)\\s*(\\d{1,3})|(\\d{1,3})\\s*(?:→|->)\\s*(\\d{1,3}))(?!\\d)`);
      if (ft) {
        const a = parseTal(ft.m[1] || ft.m[3]);
        const b = parseTal(ft.m[2] || ft.m[4]);
        return { nu: { v: b, kilde: ft.kilde }, foer: { v: a, kilde: ft.kilde } };
      }
      const liste = L.egfr({ alle: true });
      if (liste.length <= 1) return { nu: liste[0] || null, foer: null };
      const aar = (x) => {
        const m = (x.foer + " " + x.efter.slice(0, 16)).match(/((?:19|20)\d\d)/);
        return m ? +m[1] : null;
      };
      if (liste.every(aar)) {
        const s = liste.slice().sort((p, q) => aar(q) - aar(p));
        return { nu: s[0], foer: s[s.length - 1] };
      }
      const tidl = (x) => TIDL.test(x.led) && !NU.test(x.led);
      const foer = liste.find(tidl) || null;
      const nu = L.seneste(liste.filter((x) => !tidl(x)).length ? liste.filter((x) => !tidl(x)) : liste, "eGFR", "laveste");
      return { nu, foer: foer && foer !== nu ? foer : null };
    };

    // Vælg en kategori ud fra en prioriteret liste: stærke udtryk først, svage bagefter.
    // Nævnes flere, vinder den aktuelle ("nu", "i dag") over den gamle ("for 3 uger siden", "2019").
    L.vaelg = function (liste) {
      const point = (i) => (NU.test(leddet(i)) ? 2 : GAMMEL.test(leddet(i)) ? 0 : 1);
      const niveau = (n) => {
        const fund = [];
        liste.forEach((x, rk) => {
          if (!x[n]) return;
          const r = L.term(x[n]);
          if (r.status !== "ja") return;
          const jaer = r.fund.filter((f) => f.k === "ja");
          const bedst = jaer.reduce((p, q) => (point(q.m.index) > point(p.m.index) ? q : p));
          fund.push({ x, rk, score: point(bedst.m.index), kilde: kilde(bedst.m.index, bedst.m.index + bedst.m[0].length) });
        });
        return fund.sort((p, q) => q.score - p.score || p.rk - q.rk);
      };
      const staerk = niveau("staerk");
      const svag = niveau("svag");
      // Et gammelt stærkt udtryk ("sinuitis for 3 uger siden") taber til et aktuelt svagt ("nu ondt i halsen").
      let fund = staerk.length && !(staerk[0].score === 0 && svag.length && svag[0].score > 0) ? staerk : svag;
      if (!fund.length) return null;
      const alleVaerdier = [...new Set([...staerk, ...svag].map((f) => f.x.value))];
      return { value: fund[0].x.value, kilde: fund[0].kilde, flere: alleVaerdier.length > 1 && fund === svag ? alleVaerdier : fund.length > 1 ? fund.map((f) => f.x.value) : null };
    };
    return L;
  }

  // ----------------------------------------------------------------------
  // Hvilket værktøj passer teksten til? (Notat-indgangen)
  // ----------------------------------------------------------------------

  // Hvert tegn er et begreb med vægt 3 (diagnose/entydigt), 2 (typisk fund) eller 1 (svagt).
  // Et begreb tæller én gang og kun, hvis det ikke er nægtet, hypotetisk eller (fam) familiens.
  // grp samler begreber med et loft (fx højst 4 point for lægemidler).
  const MED_NYRE = ["metformin", "apixaban|eliquis", "rivaroxaban|xarelto", "dabigatran|pradaxa", "edoxaban|lixiana", "gabapentin|neurontin", "pregabalin|lyrica", "tramadol", "morfin", "oxycodon", "allopurinol", "digoxin", "spironolacton", "nitrofurantoin", "trimethoprim", "lithium", "sitagliptin|januvia", "colchicin", "baclofen", "methotrexat", "valaciclovir", "alendronat", "amoxicillin", "ciprofloxacin", "clarithromycin", "metoclopramid"];
  const DIABETES = `(?<!type\\s?(?:1|i)[- ]?)(?<!gestationel )(?<!graviditets)(?:type 2-?diabetes|type 2 diabetes|t2d${E}|dm2${E}|diabetes mellitus|diabetes${E})`;
  const VAERKTOEJER = [
    { id: "luftveje", sti: "infektion/luftveje.html", navn: "Luftvejsinfektion", app: "Infektioner", udfyld: true, tegn: [
      { v: 3, m: "tonsillit|faryngit|halsbetændelse|streptokokhals|strep\\.? ?a|centor" }, { v: 3, m: "otitis|mellemørebetændelse|ørebetændelse" }, { v: 3, m: "sinuit|rhinosinuit|bihulebetændelse" },
      { v: 3, m: "pneumoni|lungebetændelse|crb-?65" }, { v: 3, m: "bronkit|luftvejsinfektion" },
      { v: 3, m: "ondt i halsen|halssmerter|synkesmerter" }, { v: 3, m: "ørepine|øresmerter|ondt i øret|trommehinde" },
      { v: 2, m: "krepitation|knitren" }, { v: 2, m: "ansigtssmerter|smerter over (?:kæbe|pande)hul" }, { v: 2, m: `snot${E}|snotter|nasalt sekret|forkøle\\w*` },
      { v: 2, m: "takypnø|hurtig vejrtrækning|besværet vejrtrækning|indtrækninger" },
      { v: 1, m: `host(?:e|er|en|ende)?${E}|belægning|glandler` }, { v: 1, m: `feber|febril|crp${E}` } ] },
    { id: "urinveje", sti: "infektion/urinveje.html", navn: "Urinvejsinfektion", app: "Infektioner", udfyld: true, tegn: [
      { v: 3, m: `cystit|blærebetændelse|uvi${E}|urinvejsinfektion|dysuri|urosepsis|svie ved (?:vandladning|miktion)` }, { v: 3, m: "pyelonefrit|nyrebækkenbetændelse" }, { v: 3, m: "bakteriuri" },
      { v: 2, m: "svie(?! i (?:halsen|øjnene|huden|munden))" }, { v: 2, m: "hyppig vandladning|pollakisuri|vandladningstrang|urgency" }, { v: 2, m: `stix${E}|urinstix|nitrit|urindyrkning` },
      { v: 2, m: "flankesmerter|nyreloge\\w*|ømhed over nyrelog\\w*|dunkeøm" }, { v: 2, m: "ildelugtende urin|uklar urin|grumset urin|urinen lugter" },
      { v: 1, m: "kulderystelser" }, { v: 2, m: `blærekateter|kateter|kad${E}` }, { v: 1, m: "leukocytter" }, { v: 1, m: `feber|febril|crp${E}` } ] },
    { id: "hud", sti: "infektion/hud.html", navn: "Hud- og bløddelsinfektion", app: "Infektioner", udfyld: true, tegn: [
      { v: 3, m: `erysipelas|rosen${E}|cellulit|lymfangit` }, { v: 3, m: "byld|(?<!peritonsillær )(?<!peritonsillært )absces|furunkel|sårinfektion|inficeret sår|fodsår|sår på (?:fod|foden|tå|tåen|storetå|storetåen|hæl|hælen|underben|underbenet|finger|fingeren)" }, { v: 3, m: "impetigo|børnesår" },
      { v: 3, m: `erythema migrans|borreli|flåtbid|skovflåt|flåt${E}` }, { v: 3, m: `hundebid|kattebid|menneskebid|bidsår|bidt af|bidt i|bidt${E}` },
      { v: 2, m: "rødme|fluktuer" }, { v: 3, m: "varm og hævet|hævet og varm|rødt?,? varmt?|varmt?,? rødt?|rød,? hævet og varm" }, { v: 2, m: "skarpt afgrænset" }, { v: 2, m: `pus${E}|purulent|inficeret` },
      { v: 1, m: `sår${E}|udslæt|fodsvamp` }, { v: 1, m: `feber|febril|crp${E}` } ] },
    { id: "ckd", sti: "nyre/ckd.html", navn: "Kronisk nyresygdom", app: "Nyrer", udfyld: true, tegn: [
      { v: 3, m: `kronisk nyresygdom|ckd${E}|nyreinsufficiens|nyresvigt|nefropati|kdigo|kfre`, fam: true },
      { v: 3, m: `albuminuri|mikroalbuminuri|proteinuri|uacr|u-?acr|acr${E}|u-?albumin|albumin\\s*\\/\\s*kreatinin|albumin-?kreatinin` },
      { v: 2, m: `faldende egfr|fald i egfr|egfr (?:er )?faldet|faldende nyrefunktion` }, { v: 2, m: `e-?gfr|gfr${E}|nedsat nyrefunktion` }, { v: 1, m: "kreatinin|nefrolog" } ] },
    { id: "dosis", sti: "nyre/dosis.html", navn: "Dosis efter nyrefunktion", app: "Nyrer", udfyld: true, lofter: { med: 2, medBaggrund: 1 }, tegn: [
      { v: 3, m: "dosis\\w*|dosering\\w*|nyredosis|medicingennemgang|medicinjuster\\w*|(?:kan|må) (?:pt\\.? |patienten |hun |han )?(?:få|tåle|tage|gives)|(?:skal|bør) \\w+ (?:reduceres|halveres|seponeres)" },
      { v: 1, m: `e-?gfr|gfr${E}|nedsat nyrefunktion` }, { v: 2, m: "kreatininclearance|crcl|cockcroft" }, { v: 1, m: "kreatinin" },
      ...MED_NYRE.map((m) => ({ v: 1, m: `(?:${m})${E}`, grp: "med" })) ] },
    { id: "af", sti: "hjerte/af.html", navn: "Atrieflimren — antikoagulation", app: "Hjerte-kar", tegn: [
      { v: 3, m: `atrieflimren|atrieflagren|atrieflimmer|(?:paroksystisk|persisterende|permanent|nyopdaget|kendt|nydiagnosticeret) af${E}(?!\\s+(?:hjemme\\w*|os${E}|læge\\w*|famil\\w*|kommun\\w*|psyk\\w*|sygehus\\w*|afd\\w*|personale\\w*|egen${E}|pleje\\w*))|af-patient|a-flimren`, fam: true }, { v: 3, m: "cha2ds2|cha₂ds₂|chads" }, { v: 2, m: `noak${E}|doak${E}|antikoagul\\w*|blodfortyndende|has-?bled` } ] },
    { id: "cvrisiko", sti: "hjerte/cvrisiko.html", navn: "CV-risiko (SCORE2)", app: "Hjerte-kar", tegn: [
      { v: 3, m: "score2|score-2|kardiovaskulær risiko|cv-risiko|hjerte-kar-risiko|10-års ?risiko|risikovurdering for hjerte" }, { v: 2, m: `kolesterol|ldl${E}|ldl-k|hyperkolesterol\\w*|dyslipid\\w*|lipidprofil` }, { v: 1, m: "primær forebyggelse|forebyggende statin|non-hdl" }, { v: 1, m: `ryger(?! ikke)|rygning|pakkeår` } ] },
    { id: "kol", sti: "lunge/kol.html", navn: "KOL", app: "Lunger", tegn: [
      { v: 3, m: `kol${E}|kronisk obstruktiv|copd|emfysem`, fam: true }, { v: 2, m: `spirometri|fev1|fev1\\/fvc` }, { v: 2, m: `mmrc|cat-?score|eksacerbation\\w*|exacerbation\\w*` }, { v: 1, m: `lama${E}|laba${E}|spiolto|spiriva|ultibro|trimbow|trelegy` } ] },
    { id: "astma", sti: "lunge/astma.html", navn: "Astma", app: "Lunger", tegn: [
      { v: 3, m: "astma", fam: true }, { v: 2, m: `act${E}|act-score|pef${E}|astmakontrol` }, { v: 2, m: `inhalationssteroid|ics${E}|saba${E}|ventoline|bricanyl|airomir|symbicort|seretide|flutiform|budesonid` } ] },
    { id: "hypothyreose", sti: "thyreoidea/hypothyreose.html", navn: "Hypothyreose", app: "Hypothyreose", tegn: [
      { v: 3, m: "hypothyre\\w*|hypothyroid\\w*|myksødem|levothyroxin|eltroxin|euthyrox|lavt stofskifte|for lavt stofskifte", fam: true }, { v: 2, m: `tsh${E}|ft4|t4\\s*[:=]?\\s*\\d|anti-?tpo|tpo-?antistof|thyreoidea|stofskifte` } ] },
    { id: "diabetes", sti: "diabetes/behandling.html", navn: "Type 2-diabetes — behandling", app: "Type 2-diabetes", tegn: [
      { v: 3, m: DIABETES, fam: true }, { v: 2, m: `hba1c|glp-?1|sglt-?2|semaglutid|ozempic|wegovy|rybelsus|dulaglutid|trulicity|liraglutid|victoza|empagliflozin|jardiance|dapagliflozin|forxiga` }, { v: 1, m: "metformin|glimepirid|insulin" } ] },
    { id: "aarskontrol", sti: "diabetes/aarskontrol.html", navn: "Type 2-diabetes — årskontrol", app: "Type 2-diabetes", tegn: [
      { v: 3, m: "årskontrol|diabeteskontrol|diabetesårskontrol|årsstatus" }, { v: 2, m: "fodundersøgelse|fodstatus|monofilament|øjenscreening|øjenundersøgelse|retinopati|neuropati" }, { v: 3, m: DIABETES, fam: true } ] },
    { id: "klimakterie", sti: "index.html", navn: "Klimakteriet — hormonbehandling", app: "Kvindesundhed", tegn: [
      { v: 3, m: "klimakteri\\w*|overgangsalder\\w*|menopaus\\w*|perimenopaus\\w*|hedeture|hedestigninger|svedeture" }, { v: 3, m: `mht${E}|hrt${E}|hormonbehandling i overgangsalderen` }, { v: 2, m: "østrogen\\w*|estradiol|progesteron|vaginal tørhed|natlig sveden|mrs-?score" } ] },
    { id: "praevention", sti: "praevention.html", navn: "Prævention", app: "Kvindesundhed", tegn: [
      { v: 3, m: `prævention|antikonception|p-?piller|p-?pille|minipille|nødprævention|fortrydelsespille|ellaone|norlevo|p-?stav|nexplanon|p-?ring|nuvaring|p-?plaster|depo-?provera` },
      { v: 3, m: `spiral${E}|hormonspiral|kobberspiral|mirena|kyleena|jaydess` } ] },
    { id: "osteoporose", sti: "osteoporose.html", navn: "Osteoporose", app: "Kvindesundhed", tegn: [
      { v: 3, m: "osteoporose|osteopeni|knogleskørhed|dxa|t-score|lavenergibrud|lavenergifraktur|lavenergitraume", fam: true }, { v: 3, m: "alendronat|zoledron\\w*|aclasta|denosumab|prolia|bisfosfonat|teriparatid|romosozumab|evenity" }, { v: 2, m: `frax${E}|kompressionsfraktur|sammenfaldsbrud|hoftebrud|håndledsbrud` } ] },
  ];

  // Kendte sygdomme, fast medicin og tidligere forløb ("Kendt med KOL", "Medicin: Eltroxin",
  // "tidl. otitis som barn") er baggrund — de giver højst 1 point, så de ikke overdøver det aktuelle.
  const BAGGRUND = /(?:^|[^a-zæøå])(kendt(?: med)?|diagnoser|tidl\.?|tidligere|fast medicin|vanlig medicin|medicin|udover|ud over|anamnestisk|som barn|dispositioner|allergier|komorbiditet\w*|sygdomme|følges for|behandles for|i behandling for)(?![a-zæøå])/;
  const OVERSKRIFT = /^\s*(?:#+\s*|\*\*|-\s*)?([a-zæøå .\/-]{2,40}?)(?:\*\*)?\s*:?\s*$/;
  function baggrund(L, i) {
    const t = L.lav;
    let s = i;
    const forkortelse = (j) => t[j] === "." && /(?:^|[^a-zæøå])(?:tidl|pt|evt|ca|kl|obs|tlf|stk|dvs|bl\.a|f\.eks|ift|jf|hhv)$/.test(t.slice(Math.max(0, j - 6), j));
    while (s > 0 && (!/[.;!?\n]/.test(t[s - 1]) || forkortelse(s - 1)) && i - s < 300) s--;
    if (BAGGRUND.test(t.slice(s, i))) return true;
    // Under en overskrift som "Kendt med:", "Diagnoser:" eller "Fast medicin:" (til næste overskrift).
    let slut = t.lastIndexOf("\n", i - 1);
    for (let n = 0; n < 25 && slut > 0; n++) {
      const start = t.lastIndexOf("\n", slut - 1) + 1;
      const linje = t.slice(start, slut);
      const m = linje.match(OVERSKRIFT);
      if (m && m[1].trim().split(/\s+/).length <= 4 && (/:\s*$/.test(linje) || /^\s*(#|\*\*)/.test(linje))) return BAGGRUND.test(m[1]);
      slut = start - 1;
    }
    return false;
  }

  // Returnerer kandidaterne sorteret efter point og en vurdering af, om valget er sikkert.
  function klassificer(tekst) {
    const L = lib(tekst);
    const kand = VAERKTOEJER.map((v) => {
      let point = 0;
      let anker = 0;
      const pr = {};
      const fund = [];
      v.tegn.forEach((tg) => {
        const r = L.term(tg.m, { familie: !!tg.fam, emne: true });
        if (r.status !== "ja") return;
        const jaer = r.fund.filter((x) => x.k === "ja");
        // Et aktuelt fund vinder over baggrund; findes kun baggrund, tæller begrebet højst 1 point.
        const aktuel = jaer.find((x) => !baggrund(L, x.m.index));
        const f = aktuel || jaer[0];
        const vaegt = aktuel ? tg.v : Math.min(1, tg.v);
        const loft = tg.grp && v.lofter ? v.lofter[tg.grp] : Infinity;
        const brugt = tg.grp ? pr[tg.grp] || 0 : 0;
        let plus = Math.min(vaegt, loft - brugt);
        // Fast medicin (baggrund) giver samlet højst lofter[grp + "Baggrund"] point.
        const bgNavn = tg.grp + "Baggrund";
        if (tg.grp && !aktuel && v.lofter && v.lofter[bgNavn] !== undefined) plus = Math.min(plus, v.lofter[bgNavn] - (pr[bgNavn] || 0));
        if (plus <= 0) return;
        if (tg.grp) pr[tg.grp] = brugt + plus;
        if (tg.grp && !aktuel) pr[bgNavn] = (pr[bgNavn] || 0) + plus;
        point += plus;
        if (plus >= 3) anker += 2;
        else if (plus === 2) anker += 1;
        fund.push(L.tekst.slice(f.m.index, f.m.index + f.m[0].length) + (aktuel ? "" : " (baggrund)"));
      });
      return { id: v.id, sti: v.sti, navn: v.navn, app: v.app, udfyld: !!v.udfyld, point, anker, fund: [...new Set(fund)] };
    })
      .filter((k) => k.point > 0)
      .sort((a, b) => b.point - a.point || b.anker - a.anker);
    const [a, b] = kand;
    // Et notat med flere nummererede problemer ("1) … 2) …") vælges aldrig automatisk.
    const flereProblemer = (tekst.match(/(?:^|\n)\s*\d{1,2}[).]\s+\S/g) || []).length >= 2 || /flere (?:ting|problemer|problemstillinger)/i.test(tekst);
    // Sikkert: et tydeligt tegn (en diagnose eller to typiske fund), mindst 3 point og klart foran nummer to.
    const sikker = !flereProblemer && !!a && a.point >= 3 && a.anker >= 2 && (!b || (a.point >= 1.5 * b.point && a.point - b.point >= 2));
    return { kandidater: kand, valgt: sikker ? a : null, sikker };
  }

  // Overdragelse mellem sider: teksten ligger kun i fanens sessionStorage (slettes, når fanen
  // lukkes, eller ved Ryd) og sendes ingen steder hen.
  const NOEGLE_OVERDRAG = "udfyld.overdrag";
  const NOEGLE_NOTAT = "udfyld.notat";
  const lager = {
    hent(k) {
      try {
        return sessionStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    gem(k, v) {
      try {
        sessionStorage.setItem(k, v);
        return true;
      } catch (e) {
        return false;
      }
    },
    slet(k) {
      try {
        sessionStorage.removeItem(k);
      } catch (e) {}
    },
  };
  // Repoets rod ud fra udfyld.js' egen adresse (virker ikke i claude.ai, hvor scriptet er indlejret).
  const ROD = (function () {
    try {
      const src = document.currentScript && document.currentScript.src;
      return src ? new URL("./", src).href : null;
    } catch (e) {
      return null;
    }
  })();
  const adresse = (sti) => (ROD ? new URL(sti, ROD).href : null);
  // Overdragelsen gælder kun den side, den er sendt til, og kun i 30 sekunder; notatet til
  // "tilbage" gemmes i 15 minutter — så en tekst aldrig hænger ved til næste patient.
  const OVERDRAG_MS = 30 * 1000;
  const NOTAT_MS = 15 * 60 * 1000;
  function gemNotat(tekst) {
    return lager.gem(NOEGLE_NOTAT, JSON.stringify({ tekst, t: Date.now() }));
  }
  function hentNotat() {
    try {
      const o = JSON.parse(lager.hent(NOEGLE_NOTAT));
      if (o && typeof o.tekst === "string" && Date.now() - o.t < NOTAT_MS) return o.tekst;
    } catch (e) {}
    lager.slet(NOEGLE_NOTAT);
    return null;
  }
  function send(tekst, sti) {
    const url = adresse(sti);
    if (!url || !lager.gem(NOEGLE_OVERDRAG, JSON.stringify({ sti, tekst, t: Date.now() })) || lager.hent(NOEGLE_OVERDRAG) === null) return false;
    gemNotat(tekst);
    location.href = url;
    return true;
  }
  const glem = () => {
    lager.slet(NOEGLE_OVERDRAG);
    lager.slet(NOEGLE_NOTAT);
  };

  // ----------------------------------------------------------------------
  // Brugerflade
  // ----------------------------------------------------------------------

  function init(udtraek, opts = {}) {
    const form = document.querySelector(".form-panel");
    if (!form) return;
    const panel = document.createElement("details");
    panel.className = "udfyld";
    panel.innerHTML = `<summary>Udfyld fra journaltekst</summary>
      <p class="field-hint">Indsæt fx et notat fra Noteless eller en diktering. Teksten behandles kun i browseren og sendes ingen steder hen. Kontrollér altid de udfyldte felter.</p>
      <label for="udfyldTekst" class="sr-only">Journaltekst</label>
      <textarea id="udfyldTekst" rows="5" placeholder="${opts.eksempel || ""}"></textarea>
      <div class="udfyld-actions">
        <button type="button" class="btn btn-primary" id="udfyldBtn">Udfyld felterne</button>
        <button type="button" class="btn btn-outline" id="udfyldRyd">Ryd</button>
      </div>
      <div class="udfyld-rapport" id="udfyldRapport" aria-live="polite"></div>`;
    const h2 = form.querySelector("h2");
    if (h2) h2.after(panel);
    else form.prepend(panel);
    const ta = panel.querySelector("#udfyldTekst");
    const rapport = panel.querySelector("#udfyldRapport");
    const resetBtn = document.getElementById("resetBtn");

    const ryd = () => form.querySelectorAll(".udfyldt").forEach((el) => el.classList.remove("udfyldt"));
    // Lægens egne ændringer fjerner markeringen på feltet.
    form.addEventListener("input", (e) => {
      if (!e.isTrusted || e.target === ta) return;
      e.target.classList.remove("udfyldt");
      const lab = e.target.closest("label");
      if (lab) lab.classList.remove("udfyldt");
      // Skift af radioknap: fjern markeringen fra hele gruppen.
      if (e.target.type === "radio") form.querySelectorAll(`input[name="${e.target.name}"]`).forEach((r) => r.closest("label") && r.closest("label").classList.remove("udfyldt"));
    });
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        ryd();
        rapport.innerHTML = "";
      });
    }
    panel.querySelector("#udfyldRyd").addEventListener("click", () => {
      ta.value = "";
      rapport.innerHTML = "";
      ryd();
      glem();
    });
    let fraNotat = false;

    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const vis = (v) => String(v).replace(".", ",");

    panel.querySelector("#udfyldBtn").addEventListener("click", () => {
      const tekst = ta.value;
      // Start fra en tom formular, så intet fra en tidligere patient bliver hængende.
      if (resetBtn) resetBtn.click();
      ta.value = tekst;
      ryd();
      if (!tekst.trim()) {
        rapport.innerHTML = "<p>Indsæt en tekst først.</p>";
        return;
      }
      const fund = udtraek(lib(tekst)).filter(Boolean);
      const udfyldt = [];
      const noter = [];
      const markér = (el) => {
        const lab = el.type === "radio" || el.type === "checkbox" ? el.closest("label") : null;
        (lab || el).classList.add("udfyldt");
      };
      fund.forEach((f) => {
        if (f.type === "note") return noter.push(f.tekst);
        if (f.type === "num" || f.type === "hidden") {
          const el = document.getElementById(f.id);
          if (!el) return;
          el.value = String(f.v);
          if (f.type === "num") markér(el);
          udfyldt.push({ label: f.label, v: f.type === "num" ? vis(f.v) : f.vis || f.v, kilde: f.kilde });
          if (f.note) noter.push(`${f.label}: ${f.note}.`);
        } else if (f.type === "radio") {
          const el = form.querySelector(`input[name="${f.name}"][value="${f.value}"]`);
          if (!el) return;
          el.checked = true;
          markér(el);
          udfyldt.push({ label: f.label, v: f.vis || el.closest("label").textContent.trim(), kilde: f.kilde });
        } else if (f.type === "check") {
          const el = form.querySelector(`input[name="${f.name}"][value="${f.value}"]`);
          if (!el) return;
          el.checked = !!f.on;
          markér(el);
          udfyldt.push({ label: f.label, v: f.on ? "ja" : "nej", kilde: f.kilde });
        }
      });
      form.dispatchEvent(new Event("change", { bubbles: true }));
      const mangler = (opts.vigtige || []).filter(([id]) => !fund.some((f) => f.id === id || f.name === id));
      rapport.innerHTML = `${udfyldt.length ? `<p><strong>Udfyldt (${udfyldt.length}):</strong></p><ul>${udfyldt.map((u) => `<li>${esc(u.label)}: <strong>${esc(u.v)}</strong>${u.kilde ? ` <span class="field-hint">— "${esc(u.kilde)}"</span>` : ""}</li>`).join("")}</ul>` : "<p>Ingen felter kunne udfyldes ud fra teksten.</p>"}
        ${noter.length ? `<p><strong>Bemærk:</strong></p><ul>${noter.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        ${mangler.length ? `<p class="field-hint">Ikke fundet i teksten: ${mangler.map(([, l]) => esc(l)).join(", ")}.</p>` : ""}
        ${forslag(tekst)}`;
    });

    // Andre værktøjer, teksten også passer til (kun i appen, hvor siderne kan overdrage teksten).
    const her = VAERKTOEJER.find((v) => ROD && location.href.split(/[?#]/)[0] === adresse(v.sti));
    function forslag(tekst) {
      const tilbage = fraNotat && ROD ? `<p class="udfyld-fra">Teksten kom fra Notat-indgangen. <a href="${adresse("notat/index.html")}#vaelg">Forkert værktøj? Vælg et andet</a></p>` : "";
      if (!ROD) return tilbage;
      const andre = klassificer(tekst).kandidater.filter((k) => k.udfyld && k.point >= 3 && (!her || k.id !== her.id));
      if (!andre.length) return tilbage;
      return `${tilbage}<p class="field-hint">Teksten passer også til: ${andre.map((k) => `<button type="button" class="btn btn-outline btn-small" data-send="${esc(k.sti)}">${esc(k.navn)}</button>`).join(" ")}</p>`;
    }
    rapport.addEventListener("click", (e) => {
      const b = e.target.closest("[data-send]");
      if (b) send(ta.value, b.dataset.send);
    });

    // Tekst overdraget fra Notat-indgangen: udfyld med det samme — kun én gang, kun på den side,
    // den er sendt til, og kun hvis den er frisk. Nøglen slettes altid.
    let overdraget = null;
    try {
      overdraget = JSON.parse(lager.hent(NOEGLE_OVERDRAG));
    } catch (e) {}
    lager.slet(NOEGLE_OVERDRAG);
    if (overdraget && her && overdraget.sti === her.sti && Date.now() - overdraget.t < OVERDRAG_MS && typeof overdraget.tekst === "string") {
      fraNotat = true;
      panel.open = true;
      ta.value = overdraget.tekst;
      // Efter sidens egen opstart, så felterne er klar; derefter fokus på rapporten (skærmlæsere).
      setTimeout(() => {
        panel.querySelector("#udfyldBtn").click();
        rapport.setAttribute("tabindex", "-1");
        rapport.focus();
      }, 0);
    }
  }

  return { init, lib, klassificer, send, glem, adresse, gemNotat, hentNotat, vaerktoejer: VAERKTOEJER, noegler: { overdrag: NOEGLE_OVERDRAG, notat: NOEGLE_NOTAT } };
})();
