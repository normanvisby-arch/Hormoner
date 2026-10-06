/*
 * Udfyld fra journaltekst: lægen indsætter et notat (fx fra Noteless eller en
 * diktering), og værktøjets felter udfyldes med faste regler i browseren.
 * Intet sendes nogen steder hen. Alt, der udfyldes, markeres og vises i en
 * rapport med den tekst, det er fundet i — lægen skal altid kontrollere det.
 *
 * Brug: Udfyld.init((L) => [ ...fund ], { vigtige: [["alder", "Alder"], ...] })
 * Et fund er et af:
 *   { type: "num", id, v, label, kilde, note }
 *   { type: "tekst", id, v, label, kilde }   (tekstfelt, fx præparatnavn)
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
  const NEG = new RegExp(`${B}(ingen|ikke|uden|benægter|benægtes|nægter(?!\\s+at${E})|negativ|neg\\.?|afkræft\\w*|aldrig|intet|ej|seponer\\w*|pauser\\w*|ophørt|stoppet|undgå\\w*|fraråd\\w*)${E}|(?:^|\\s)÷\\s*$`);
  // "-" er kun nægtelse, når det står alene sidst i leddet ("feber -", "feber: -"), ikke i sammensatte
  // ord ("KOL-kontrol", "nitrit-positiv") og ikke som tankestreg ("Feber - målt 38,5 hjemme").
  const NEG_EFTER = /^\s*[:=]?\s*(?:er\s+|var\s+|blev\s+)?(nej|neg(?![a-zæøå])|negativ|÷|\(\s*[-÷]\s*\)|ikke til stede|benægtes|afkræftet|udelukket|seponeret|pauseret|ophørt|stoppet|udtrappet|frarådes|frarådet|undgås|-(?=\s*(?:$|[,.;)\n])))|^\s*[:=]\s*ingen(?![a-zæøå])/;
  // Pauseret/seponeret senere i samme led: "Losartan 50 mg (pauseret under gastroenteritis)".
  const NEG_SENERE = /^[^.;,\n]{0,40}?(?:^|[\s(])(?:er\s+|blev\s+)?(pauseret|seponeret|ophørt|udtrappet|stoppet)(?![a-zæøå])(?!\s+(?:med|at)(?![a-zæøå]))/;
  // Led, hvor nægtelsen ikke rækker ind: "uden bedring, men fortsat feber".
  const SKIFT = new RegExp(`${B}(?:men|dog|stadig|fortsat|nu|til gengæld|derimod|udover|ud over|bortset fra|foruden|trods|på trods af)${E}`);
  // Hypotetisk omtale, råd og ønsker: "hvis feber", "informeret om at søge læge ved nakkestivhed".
  // Råd og betingelser gælder altid; ønsker og planer ("ønsker p-piller") kun ved udfyldning af felter.
  const HYPO = new RegExp(`${B}(?:hvis|såfremt|i tilfælde af|obs\\.?\\s*(?:for|på)|informeret|instrueret|vejledt|oplyst om|rådgivet|(?:at|bør|skal)\\s+søge|vaccin\\w*)${E}`);
  const HYPO_OENSKE = new RegExp(`${B}(?:forebyg\\w*|ønske\\w*|planlæg\\w*|forsøg\\w*|(?:at|vil|kan)\\s+blive)${E}`);
  const HYPO_START = /^\s*ved(?![a-zæøå])(?!\s+(?:us|undersøg|obj|klinisk|stix|auskult|palp|insp|indlæg|kontrol|konsultation|besøg|lyt|tilsyn|fremmøde|ankomst|henvendelse|tlf|telefon|opkald|visitation|modtagelse|sidste|seneste|blodprøve|måling|udskrivelse))/;
  // Råd med "ved" efter: "Genkontakt ved feber", "Kontakt lægen ved flankesmerter", "Panodil ved feber".
  const HYPO_VED = new RegExp(`${B}(?:(?:gen)?kontakt\\w*|henvend\\w*|søg\\w*|ring\\w*|retur\\w*|sikkerhedsnet|råd\\w*|panodil|pamol|pinex|paracetamol|ibuprofen|ipren|pn|p\\.n\\.)${E}[^.;\\n]{0,40}${B}ved${E}`);
  const HYPO_EFTER = new RegExp(`${B}(?:overvej\\w*|påtænk\\w*|planlægges|kan komme på tale|genkontakt\\w*|kontakte?\\s+(?:igen|os|lægen|læge|vagtlægen|lægevagten|1813|112)|søge?\\s+(?:læge|lægevagt|skadestue))${E}`);
  // Familieanamnese: "mor har diabetes", "disp. til hjertesygdom".
  const FAMILIE = new RegExp(`${B}(?:(?:mor|moder|far|fader|søster|bror|broder|forældre|søskende|bedstemor|bedstefar|mormor|morfar|farmor|farfar|onkel|tante)\\s+(?:har|havde|med|fik|døde|haft|er)|disp\\.?|disposition|familie\\w*|familiær\\w*|arvelig\\w*)${E}`);
  // Datoer før værdien springes over: "eGFR 12.03.26: 44".
  const DATO = "\\(?\\d{1,2}[./-]\\d{1,2}(?:[./-]\\d{2,4})?\\)?\\s*[:=]";
  const TAL = "(<|>|≤|≥)?\\s*(\\d+(?:[.,]\\d+)?)(?!\\d|[.,/-]\\d)";
  const SEP = `\\s*(?:${DATO}|[:=;\\t]|på|er|var|af|ca\\.?|målt til|nu|i dag|aktuelt)?\\s*`;
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
  const normaliser = (s) => String(s).replace(/(\d)\s*½/g, "$1,5").replace(/[\r\v\f\u2028\u2029]/g, "\n").replace(/[ \t\u00a0\u2000-\u200b]+/g, " ").replace(/[ \n]*\n[ \n]*/g, "\n");

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
      // CPR-numre vises aldrig i kildeuddrag (rapporten kan ses af andre og udskrives).
      return (start + tekst.slice(s, e).trim() + slut).replace(/(?<!\d)\d{6}[- ]?\d{4}(?!\d)/g, "[CPR]");
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
          // "eller" efter ordet ("ingen feber, hoste eller …") eller før det i samme led ("…, kulderystelser eller flankesmerter").
          if (new RegExp(`${B}eller${E}`).test(t.slice(a, slut))) return "nej";
          // "ikke skarpt afgrænset, cellulitis": "ikke" uden "eller" nægter et udsagn, ikke en opremsning.
          return new RegExp(`${B}ikke${E}`).test(seg) && !new RegExp(`${B}(?:ingen|uden|intet)${E}`).test(seg) ? null : "?";
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
      if (familie && (FAMILIE.test(t.slice(ledStart(i), i)) || /^[^.;\n]{0,20}?(?:i familien|hos (?:mor|moder|far|fader|søster|bror|broder|forældre\w*|søskende|bedste\w*|mormor|morfar|farmor|farfar))(?![a-zæøå])/.test(leddetEfter(slut)))) return "?";
      const dele = leddetFor(i).split(SKIFT);
      const foer = ord(dele[dele.length - 1]).slice(-8).join(" ");
      const efter = leddetEfter(slut);
      if (NEG.test(foer) || NEG.test(foer + " ") || NEG_EFTER.test(efter) || NEG_SENERE.test(efter)) return "nej";
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
          if (hypotetisk(m.index, m.index + m[0].length)) continue;
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

    // Personer, der ikke er patienten: "Mor (34-årig) ringer om sin 3-årige søn", "gift, mand og to børn".
    const ANDEN = /(?:mor|moder|far|fader|forælder\w*|ægtefælle|hustru|kone|ledsager\w*|søster|bror|broder|kæreste|gift\s*,?|sin|sit|hendes|hans|min|egen|ledsaget af|med|og)\s*\(?\s*$/;
    // Varighed, ikke alder: "KOL gennem 15 år", "i 30 år", "for 10 år siden".
    const VARIGHED_FOER = /(?:i|gennem|igennem|for|over|siden|de sidste|de seneste|sidste|efter|ca\.?|inden for|mere end|under|i ca\.?)\s*$/;

    L.alder = function () {
      const ok = (m, v, note) => (v >= 0 && v <= 110 ? { v, kilde: kilde(m.index, m.index + m[0].length), note } : null);
      // "Mor (34-årig)" er ikke patienten — men "sin 3-årige søn" er.
      const ikkePt = (m) => ANDEN.test(t.slice(Math.max(0, m.index - 22), m.index)) && !/^\s*-?\s*(?:årig\w*|år\s*(?:gammel|gl\.?))?\s*,?\s*(?:søn|datter|barn|dreng|pige|baby|spædbarn)/.test(t.slice(m.index + m[0].length - 6, m.index + m[0].length + 20).replace(/^.*?(?=årig|år|\s)/, ""));
      // Måneder og uger (børn): "8 mdr gammel", "pige på 8 mdr", "8 mdr." alene (ikke "i 8 mdr").
      for (const m of alle(new RegExp(`(?<![\\d.,])(\\d{1,2})\\s*(?:måneder|mdr\\.?|md\\.)(?:\\s*(?:gammel|gl\\.?))?${E}`, "g"))) {
        const foer = t.slice(Math.max(0, m.index - 16), m.index);
        if (ikkePt(m) || (VARIGHED_FOER.test(foer) && !/(?:dreng|pige|barn|spædbarn|pt\.?|patient)\s*,?\s*(?:på\s*)?$/.test(foer)) || /^\s*(?:siden|varighed)/.test(t.slice(m.index + m[0].length, m.index + m[0].length + 10))) continue;
        if (!/gammel|gl/.test(m[0]) && !/(?:dreng|pige|barn|spædbarn|pt\.?|patient|søn|datter)\s*,?\s*(?:på\s*)?$|^\s*$/.test(foer.slice(-14)) && !/^\s*(?:gl|gammel|,?\s*(?:dreng|pige|barn))/.test(t.slice(m.index + m[0].length, m.index + m[0].length + 12))) continue;
        return ok(m, Math.round((parseTal(m[1]) / 12) * 100) / 100, `${m[1]} måneder omregnet til år`);
      }
      const uger = L.find(`(\\d{1,2})\\s*uger\\s*(?:gammel|gl)`);
      if (uger) return { v: Math.round((parseTal(uger.m[1]) / 52) * 100) / 100, kilde: uger.kilde, note: `${uger.m[1]} uger omregnet til år` };
      const KON = "(?:mand|kvinde|dreng|pige|herre|dame|pt\\.?|patient|han|hun)";
      const mønstre = [
        `(\\d{1,3})\\s*-?\\s*årig`,
        `(\\d{1,3}(?:[.,]5)?)\\s*år\\s*(?:gammel|gl\\.?)`,
        `${B}(?:alder|age)\\s*[:=]?\\s*(\\d{1,3})${E}`,
        `${B}(?:pt\\.?|patient(?:en)?|hun|han|kvinden|manden|barnet|drengen|pigen|pt\\.? er|patienten er)\\s+(?:er\\s+|på\\s+)(\\d{1,3})\\s*år${E}(?!\\s*siden)`,
        `(\\d{1,3})\\s*år\\s*,?\\s*(?:gammel\\s*)?${KON}${E}`,
        `${B}(?:mand|kvinde|dreng|pige|herre|dame|mandlig\\s+patient|kvindelig\\s+patient|pt\\.?|patient|hr\\.?\\s+[a-zæøåé-]+|fru\\s+[a-zæøåé-]+)\\s*,?\\s*(?:på\\s*)?(\\d{1,3}(?:[.,]5)?)\\s*(?:år${E}|(?!\\d|[.,]\\d|\\s*(?:kg|mg|cm|%|\\/|x|×|gange|dage|uger|timer|mdr|måneder|tbl|tabl|tablet\\w*|stk|kaps|ml|g${E}|pust|dråber|enheder|ie)))`,
        `(?:^|\\n)\\s*[KMkm]\\s*,?\\s*(\\d{2,3})(?![\\d.,]|\\s*(?:kg|cm|mg|%|kilo))`,
      ];
      for (const mo of mønstre) {
        for (const m of alle(new RegExp(mo, "g"))) {
          if (ikkePt(m) || VARIGHED_FOER.test(t.slice(Math.max(0, m.index - 16), m.index))) continue;
          const r = ok(m, parseTal(m[1]));
          if (r) return r;
        }
      }
      // "f. 1953", "født 1953" — alder ud fra årstallet.
      const f = L.find(`${B}(?:f\\.|født)\\s*(?:\\d{1,2}[./-]\\d{1,2}[./-])?((?:19|20)\\d\\d)${E}`);
      if (f) {
        const v = new Date().getFullYear() - parseTal(f.m[1]);
        if (v >= 0 && v <= 110) return { v, kilde: f.kilde, note: `beregnet ud fra fødselsåret ${f.m[1]} — kan være 1 år for høj` };
      }
      // "45 år" alene — kun først i teksten eller en linje ("45 år. Ondt i halsen"), ikke en varighed
      // ("i 45 år", "røget 20 år") eller en anden person ("Ægtefællen er 80 år").
      for (const m of alle(new RegExp(`(?<![\\d.,])(\\d{1,3})\\s*år${E}(?!\\s*(?:siden|tidligere|efter|før|med|i træk|ældre|yngre))`, "g"))) {
        if (ikkePt(m) || VARIGHED_FOER.test(t.slice(Math.max(0, m.index - 16), m.index)) || !/(?:^|\n)\s*(?:pt\.?\s*,?\s*)?$/.test(t.slice(Math.max(0, m.index - 8), m.index))) continue;
        const r = ok(m, parseTal(m[1]), "kun \"år\" i teksten — kontrollér, at det er alderen");
        if (r && r.v >= 1) return r;
      }
      return null;
    };

    // Køn — ikke ledsagere ("ledsaget af sin mand", "gift, mand og to børn").
    L.koen = function () {
      const re = new RegExp(`${B}(mand|manden|kvinde|kvinden|dreng|drengen|pige|pigen|herre|hr\\.|mandlig|kvindelig|fru|han|hun)${E}|(?:^|\\n)\\s*([km])\\s*,?\\s*\\d{2}|${B}(?:køn|sex)\\s*[:=]?\\s*(m|k|f|mand|kvinde|male|female)${E}|(♀|♂)`, "g");
      for (const m of alle(re)) {
        if (ANDEN.test(t.slice(Math.max(0, m.index - 18), m.index))) continue;
        if (/^\s*og\s+(?:\w+\s+)?børn/.test(t.slice(m.index + m[0].length, m.index + m[0].length + 20))) continue;
        const x = (m[1] || m[2] || m[3] || m[4] || "").toLowerCase();
        // "han"/"hun" kun som stedord om patienten tidligt i teksten, ikke "hun har en mand".
        if ((x === "han" || x === "hun") && (m.index > 200 || /ringer|pårørende|hustru|ægtefælle|datter|søn|mor|far|kone|mand|kæreste|ven(?:inde)?/.test(t.slice(0, m.index)))) continue;
        const mand = /^(mand|dreng|herre|hr\.|mandlig|han|m|male|♂)/.test(x);
        return { v: mand ? "mand" : "kvinde", kilde: kilde(m.index, m.index + m[0].length) };
      }
      return null;
    };

    // Vægt: "vægt 72 kg", "Vægt: 72,5", "vejer 58 kilo", "72 kg" — ikke vægtændringer eller fødselsvægt.
    // Flere vægte: "Vægt 65 kg (2024), nu 58 kg" → den aktuelle.
    L.vaegt = function () {
      const s = L.serie(`vægt|vejer|kropsvægt|weight`, { min: 1, max: 250, navn: "vægt", enhed: "kg|kilo", strategi: "sidste" });
      if (s.nu) return s.nu;
      for (const m of alle(new RegExp(`(?<![\\d.,])(\\d+(?:[.,]\\d+)?)\\s*(?:kg|kilo)${E}(?!\\s*\\/)`, "g"))) {
        const foer = t.slice(Math.max(0, m.index - 25), m.index);
        const efter = t.slice(m.index + m[0].length, m.index + m[0].length + 15);
        if (/(tab\w*|taget|tog|øget|øgning|fald\w*|fødsel\w*|steget|mistet|gået|tabt|[+±-])\s*(?:(?:på|med)\s*)?(?:ca\.?\s*)?(?:op til\s*)?$|fødsel/.test(foer)) continue;
        if (/^\s*(på|op|ned|i vægt|vægttab|mere|mindre|lettere|tungere|vægttab)(?![a-zæøå])/.test(efter)) continue;
        const v = parseTal(m[1]);
        if (v >= 1 && v <= 250) return { v, kilde: kilde(m.index, m.index + m[0].length) };
      }
      return null;
    };

    // Temperatur: "t. 38,5", "Temp. rektalt 38,9", "feber - målt 38,5", "38,2 i øret", "38,5 grader".
    const TEMP = [
      `(?:${B}temp(?:eratur)?|${B}t|${B}feber|${B}febril)\\.?\\s*(?:[-–:=]\\s*)?(?:(?:målt|rektalt|rektal|i øret|øre|oralt|axillært|i munden|hjemme|max|maks\\.?|op til|til|på|ca\\.?|i går|i nat|i dag)\\s*){0,3}[:=]?\\s*(\\d{2}(?:[.,]\\d)?)(?!\\d|[.,]\\d|\\s*(?:timer|time|t\\.|døgn|dage|uger|min|år|mdr|kg|%))`,
      `(?<![\\d.,])(\\d{2}(?:[.,]\\d)?)\\s*(?:°\\s*c?|grader|c${E}|(?:målt\\s*)?(?:i øret|rektalt|axillært|i munden|oralt)${E})`,
    ];
    const temps = () =>
      TEMP.flatMap((mo) => alle(new RegExp(mo, "g")))
        .filter((m) => !hypotetisk(m.index, m.index + m[0].length))
        .map((m) => ({ v: parseTal(m[1]), index: m.index, kilde: kilde(m.index, m.index + m[0].length) }))
        .filter((x) => x.v >= 34 && x.v <= 43)
        .sort((p, q) => p.index - q.index)
        .filter((x, i, a) => !i || x.index !== a[i - 1].index);
    L.temp = () => temps()[0] || null;

    // Feber: den sidste oplysning i teksten gælder ("afebril i går, i aften 39"); konflikt giver en note.
    L.feber = function () {
      const h = [];
      const afeb = L.term("afebril|feberfri");
      (afeb.fund || []).forEach((f) => f.k !== "?" && h.push({ i: f.m.index, s: f.k === "ja" ? "nej" : "ja", kilde: kilde(f.m.index, f.m.index + f.m[0].length) }));
      const fe = L.term("feber(?!fri)|febril|pyreksi");
      (fe.fund || []).forEach((f) => f.k !== "?" && h.push({ i: f.m.index, s: f.k, kilde: kilde(f.m.index, f.m.index + f.m[0].length) }));
      // Et temperaturtal i samme led som ordet "feber" er samme oplysning — tallet afgør.
      temps().forEach((x) => {
        const sammeLed = h.filter((y) => y.i <= x.index && x.index - y.i < 30 && !/[.;\n]/.test(t.slice(y.i, x.index)));
        sammeLed.forEach((y) => (y.s = null));
        h.push({ i: x.index, s: x.v >= 38 ? "ja" : "nej", kilde: x.kilde });
      });
      const hh = h.filter((x) => x.s);
      if (!hh.length) return { status: null };
      hh.sort((p, q) => p.i - q.i);
      const sidste = hh[hh.length - 1];
      const konflikt = hh.some((x) => x.s !== sidste.s);
      return { status: sidste.s, kilde: sidste.kilde, note: konflikt ? `teksten nævner både feber og feberfrihed — den sidste oplysning ("${sidste.kilde}") er brugt` : "" };
    };

    L.gravid = function () {
      const test = L.find(`${B}(?:graviditetstest\\w*|[usp]-?hcg|hcg)\\s*[:=]?\\s*(?:er\\s+|var\\s+)?(pos\\w*|\\+|\\(\\s*\\+\\s*\\)|neg\\w*|÷|\\(\\s*[-÷]\\s*\\)|-(?![a-zæøå\\d]))`);
      if (test) return { status: /^(pos|\+|\(\s*\+)/.test(test.m[1]) ? "ja" : "nej", kilde: test.kilde };
      return L.term(`gravid${E}|gravide${E}|graviditet\\s+(?:i\\s+)?uge|graviditetsuge|gravida${E}|uge\\s*\\d{1,2}\\s*\\+\\s*\\d|ga\\s*\\d{1,2}\\s*\\+\\s*\\d`);
    };

    // Penicillinallergi i de almindelige skriveformer — også handelsnavne (Selexid, Primcillin, Imadrax …)
    // og stavefejl. "Tåler ikke penicillin" og "ingen allergier udover penicillin" er altid ja; "ingen kendte
    // allergier" er kun nej, hvis intet andet siger ja. Familiens allergier tæller ikke.
    const STOF = "pe(?:n|nn)ic?ill?in\\w*|pencillin\\w*|amoxicillin|ampicillin|pivampicillin|pivmecillinam|mecillinam|dicloxacillin|flucloxacillin|phenoxymethylpenicillin|pcv?|betalaktam\\w*|beta-laktam\\w*|selexid|primcillin|primve|vepicombin|imadrax|amoxi-?clav|spektramox|bioclavid|dicillin|heracillin|nerbutix|pondocillin|penomax|pivampicillin";
    const REAKTION = "allergi\\w*|allergisk|overfølsom\\w*|reaktion|udslæt|urticaria|nældefeber|anafylaksi|anafylaktisk\\w*|angioødem|quincke\\w*|ødem";
    L.allergi = function () {
      const F = { familie: true };
      const sikker = alle(new RegExp(`${B}(?:tåler ikke|tålte ikke|udover|ud over|bortset fra|undtagen|udslæt af|reaktion på)\\s+(?:${STOF})${E}`, "g")).find((m) => klassificer(m.index, m.index + m[0].length, F) === "ja");
      if (sikker) return { status: "ja", kilde: kilde(sikker.index, sikker.index + sikker[0].length) };
      const t1 = L.term(`(?:${STOF})-?\\s*(?:allergi\\w*|overfølsomhed)|(?:${REAKTION})\\s*(?:\\([^)]{0,20}\\)\\s*)?(?:over for|overfor|for|mod|på|af|efter|ved)\\s*(?:${STOF})${E}|(?:${STOF})\\s*[:=]\\s*(?:${REAKTION})`, F);
      if (t1.status) return t1;
      for (const m of alle(new RegExp(`${B}(?:allergi\\w*|cave|lægemiddelallergi\\w*)\\s*[:=]?\\s*([^.;\\n]{0,40}?)(?:${STOF})${E}`, "g"))) {
        const mellem = m[1];
        const efter = leddetEfter(m.index + m[0].length);
        if (klassificer(m.index, m.index + 1, F) === "?") continue;
        if (NEG.test(mellem) || /(?:^|\s)(nej|÷|-|0)(?:\s|,|$)/.test(mellem) || /^\s*(tåles|tålt|afkræftet|udelukket|nej|÷|-(?![a-zæøå]))/.test(efter)) continue;
        return { status: "ja", kilde: kilde(m.index, m.index + m[0].length) };
      }
      const ingen = L.find(`${B}(?:ingen (?:kendte )?(?:lægemiddel|medicin)?-?allergier|nka${E}|allergi\\w*\\s*[:=]?\\s*(?:ingen|nej|÷|0|-)(?![\\w\\d])|allergi\\w*\\s*(?:[:=]\\s*)?(?:${STOF})\\s*[:=]?\\s*(?:nej|÷|ingen)${E})`);
      if (ingen) return { status: "nej", kilde: ingen.kilde };
      return { status: null };
    };

    // ------------------------------------------------------------------
    // Måleserier med tid. Hver værdi får et tidsmærke, så den aktuelle vælges:
    // "eGFR 52 (2024), nu 44", "eGFR faldet fra 58 (2025) til 43 (2026)", "eGFR 44 (tidligere 52)",
    // "eGFR 14.09.2026: 52. eGFR 01.09.2025: 38", "kalium 5,8 for 2 uger siden; kalium nu 5,1",
    // "P-Kreatinin;112;µmol/L" og laboratorietabeller med datokolonner.
    // ------------------------------------------------------------------
    const TID = "(?:nu|i dag|aktuel\\w*|p\\.t\\.|seneste|nyeste|tidligere|sidste år|i fjor|forrige år|året før|for (?:ca\\.?\\s*)?(?:\\d+|et|en|to|tre|fire|fem|seks|otte|ti|flere|mange|nogle) (?:år|måneder|mdr\\.?|uger|dage) siden|under indlæggelse(?: med \\w+)?|ved indlæggelse|ved udskrivelse|ved sidste (?:blodprøve|måling|kontrol)|(?:i |fra |ved |i år |)(?:19|20)\\d\\d|\\(?\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}\\)?)";
    const datoAf = (s) => {
      const d = String(s).match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
      if (d) {
        let y = +d[3];
        if (y < 100) y += y < 70 ? 2000 : 1900;
        return Date.UTC(y, +d[2] - 1, +d[1]);
      }
      const y = String(s).match(/(?<!\d)((?:19|20)\d\d)(?!\d)/);
      return y ? Date.UTC(+y[1], 6, 1) : null;
    };
    const tidAf = (s) => ({
      nu: /(?:^|[^a-zæøå])(?:nu|i dag|aktuel\w*|p\.t\.|seneste|nyeste)(?![a-zæøå])/.test(s),
      gammel: /tidligere|siden|sidste år|i fjor|forrige år|året før|indlæggelse|udskrivelse|ved sidste/.test(s) && !/(?:^|[^a-zæøå])(?:nu|i dag)(?![a-zæøå])/.test(s),
      dato: datoAf(s),
    });
    // Tal, der ikke er målingen: alder, dosis, varighed, BT-brøk.
    const IKKE_MAAL = "(?![\\d.,]?\\d|\\s*-?\\s*(?:år|årig)|\\s*[-–]\\s*\\d|\\s*(?:kg|mg(?!\\s*\\/)|mikrog|g(?![a-zæøå\\/])|m(?![a-zæøå\\/])|%|cm|x|×|gange|dage|døgn|uger|måneder|mdr|timer|stk|tbl|\\/\\s*\\d))";
    const FORBIND = "(?:\\s|[,;:()]|→|->|–|og|men|til|ned til|op til|faldet til|steget til)*";

    L.serie = function (etiket, { min = -Infinity, max = Infinity, navn = "værdi", enhed = "", strategi = "sidste", omregn = null } = {}) {
      const LBL = `${B}(?:${etiket})${E}(?:\\s*\\([^()]{0,30}\\))?(?:\\s*\\/\\s*1[.,]73\\s*m(?:²|2)?)?`;
      const PRE = `((?:\\s*(?:[:=;\\t]|på|er|var|af|ca\\.?|målt til|omkring|faldet fra|steget fra|gået fra|fra|${TID}))*)\\s*`;
      // Enheden må ikke sluge mellemrum alene (så "52 49 44" stadig er en tabelrække).
      const ENH = `(${enhed ? `(?:[\\s;]*(?:${enhed}))?` : ""}(?:[\\s;]*(?:ml\\/min(?:\\/1[.,]73\\s*m(?:²|2)?)?|mg\\/g|mg\\/mmol|g\\/mol|µmol\\/l|umol\\/l|mmol\\/l|mmol\\/mol))?)`;
      const POST = new RegExp(`^\\s*(?:\\(\\s*(${TID})\\s*\\)|(${TID})(?=\\s*(?:$|[,.;)\\n]|og|men)))`);
      const IKKE = /kg/.test(enhed) ? IKKE_MAAL.replace("kg|", "") : IKKE_MAAL;
      const ud = [];
      const linjer = t.split("\n");
      const linjeStart = [];
      linjer.reduce((pos, l) => (linjeStart.push(pos), pos + l.length + 1), 0);
      const tilfoej = (v, op, i0, i1, tidTekst, rk, kaede, enhedTekst) => {
        let x = parseTal(v);
        let note = "";
        if (omregn) {
          const o = omregn(x, enhedTekst || "");
          if (o) [x, note] = [o.v, o.note];
        }
        if (!(x >= min && x <= max)) return;
        if (op === "<" && x > min) {
          const trin = Number.isInteger(x) ? 1 : 0.1;
          note = [note, `angivet som < ${String(x).replace(".", ",")} — sat til ${String(Math.round((x - trin) * 10) / 10).replace(".", ",")}`].filter(Boolean).join("; ");
          x = Math.round((x - trin) * 10) / 10;
        }
        ud.push(Object.assign({ v: x, op: op || "", index: i0, slut: i1, kilde: kilde(i0, i1), rk, kaede, note, efter: leddetEfter(i1), led: leddet(i0) }, tidAf(tidTekst)));
      };
      for (const m of alle(new RegExp(`${LBL}${PRE}(<|>|≤|≥)?\\s*(\\d+(?:[.,]\\d+)?)${IKKE}${ENH}`, "g"))) {
        if (hypotetisk(m.index, m.index + m[0].length)) continue;
        let slut = m.index + m[0].length;
        const post = t.slice(slut).match(POST);
        // Tidsord lige foran etiketten hører med: "tidligere eGFR 58", "i dag kalium 5,1".
        const foran = (leddetFor(m.index).match(/(?:tidligere|nu|i dag|aktuel\w*|sidste år|i fjor|seneste|ved indlæggelse|ved udskrivelse)\s*[:=]?\s*$/) || [""])[0];
        let tidTekst = foran + " " + m[1] + (post ? " " + (post[1] || post[2]) : "");
        const startRk = ud.length;
        tilfoej(m[3], m[2], m.index, slut + (post ? post[0].length : 0), tidTekst, 0, false, m[4]);
        if (post) slut += post[0].length;
        // Fortsættelse uden etiket: ", nu 44", "til 43 (2026)", "(tidligere 52)", "52 49 44".
        const linje = linjer.findIndex((l, i) => linjeStart[i] <= m.index && m.index < linjeStart[i] + l.length + 1);
        const linjeSlut = linjeStart[linje] + linjer[linje].length;
        const FORT = new RegExp(`^(${FORBIND})((?:${TID}(?:\\s*[:=])?\\s*)*)(<|>|≤|≥)?\\s*(\\d+(?:[.,]\\d+)?)${IKKE}${ENH}`);
        let n = 1;
        for (;;) {
          const rest = t.slice(slut, linjeSlut).split(/\.(?!\d)/)[0];
          const f = rest.match(FORT);
          if (!f || /[a-zæøå]/.test(f[1].replace(/og|men|til|ned|op|faldet|steget/g, ""))) break;
          // Referenceinterval ("5,8 (3,5-4,6)", "52 mg/mmol (<3,0)") er ikke en ny måling.
          if (/^\s*[([]\s*[<>≤≥]/.test(rest) || /^\s*[([]\s*\d+(?:[.,]\d+)?\s*[-–]\s*\d/.test(rest)) break;
          const i0 = slut + f[1].length;
          let i1 = slut + f[0].length;
          const p2 = t.slice(i1).match(POST);
          // Kun en fortsættelse med tidsangivelse ("nu 44", "(tidligere 52)", "44 (2026)"), en kæde
          // ("til 43", "→ 120") eller en tabelrække ("52 49 44") — ikke ", 45-årig", ", 2 g paracetamol".
          if (!f[2].trim() && !p2 && !/til|→|->|–/.test(f[1]) && !/^[ \t]+$/.test(f[1])) break;
          const tt = f[2] + (p2 ? " " + (p2[1] || p2[2]) : "");
          if (p2) i1 += p2[0].length;
          tilfoej(f[4], f[3], i0, i1, tt, n++, /til|→|->/.test(f[1]), f[5]);
          slut = i1;
        }
        // Tabel: "eGFR 52 49 44" under en linje med lige så mange datoer.
        const raekke = ud.slice(startRk);
        if (raekke.length >= 2 && raekke.every((x) => x.dato == null)) {
          for (let i = linje - 1; i >= 0 && i >= linje - 12; i--) {
            const datoer = linjer[i].match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g);
            if (datoer && datoer.length >= 2) {
              if (datoer.length === raekke.length) raekke.forEach((x, j) => (x.dato = datoAf(datoer[j])));
              break;
            }
          }
        }
      }
      return vaelgAktuel(ud, navn, strategi);
    };

    function vaelgAktuel(ud, navn, strategi) {
      if (!ud.length) return { nu: null, foer: null, alle: ud };
      const vis = (x) => String(x.v).replace(".", ",");
      let nu;
      let grund;
      const nuMaerket = ud.filter((x) => x.nu);
      const daterede = ud.filter((x) => x.dato != null);
      const umaerkede = ud.filter((x) => !x.nu && !x.gammel && x.dato == null);
      if (nuMaerket.length) [nu, grund] = [nuMaerket[nuMaerket.length - 1], "den aktuelle"];
      else if (umaerkede.length === 1) [nu, grund] = [umaerkede[0], "den uden tidsangivelse"];
      else if (umaerkede.length > 1 && umaerkede.some((x) => x.kaede)) [nu, grund] = [umaerkede[umaerkede.length - 1], "den seneste"];
      else if (!umaerkede.length && daterede.length) [nu, grund] = [daterede.slice().sort((p, q) => q.dato - p.dato)[0], "den nyeste dato"];
      else if (umaerkede.length > 1) {
        nu = strategi === "laveste" ? umaerkede.reduce((p, q) => (q.v < p.v ? q : p)) : umaerkede[umaerkede.length - 1];
        grund = `${strategi === "laveste" ? "den laveste" : "den sidst nævnte"} — uden klar tidsangivelse. Kontrollér`;
      } else [nu, grund] = [ud[ud.length - 1], "den sidst nævnte — alle er angivet som tidligere. Kontrollér"];
      const andre = ud.filter((x) => x !== nu);
      // Tidligere værdi (ca. 1 år før): dato tættest på 1 år før, ellers "sidste år", ellers den første i en kæde.
      let foer = null;
      const ref = nu.dato != null ? nu.dato : null;
      const dAndre = andre.filter((x) => x.dato != null && (ref == null || x.dato < ref));
      if (dAndre.length) {
        const maal = (ref != null ? ref : Date.now()) - 365 * 864e5;
        foer = dAndre.sort((p, q) => Math.abs(p.dato - maal) - Math.abs(q.dato - maal))[0];
      } else {
        foer = andre.find((x) => /sidste år|i fjor|for (?:ca\.?\s*)?(?:et|1) år siden/.test(x.led)) || andre.filter((x) => x.gammel).pop() || andre.find((x) => x.kaede === false && x.rk === 0 && nu.kaede) || null;
      }
      const note = [nu.note, ud.length > 1 ? `flere ${navn}-værdier (${ud.map(vis).join(", ")}) — ${grund} er brugt` : ""].filter(Boolean).join("; ");
      return { nu: Object.assign({}, nu, { note }), foer: foer ? Object.assign({}, foer, { note: foer.note || "" }) : null, alle: ud };
    }

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
    L.kalium = () => L.serie(`p-?kalium|kalium|p-k|(?<!-)k\\+?`, { min: 1.5, max: 9, navn: "kalium" }).nu;
    // UACR i mg/g; mg/mmol og g/mol (samme enhed) omregnes × 8,84.
    L.uacr = function () {
      const r = L.serie(`uacr|u-?acr|acr|u-?albumin\\s*[\\/-]\\s*kreat(?:inin)?(?:\\s*-?\\s*ratio)?|albumin\\s*[\\/-]\\s*kreat(?:inin)?(?:\\s*-?\\s*ratio)?|albumin-?kreatinin-?ratio|u-?alb\\s*\\/\\s*krea\\w*`, {
        min: 0,
        max: 50000,
        navn: "UACR",
        omregn: (v, e) => (/mg\s*\/\s*mmol|g\s*\/\s*mol/.test(e) ? { v: Math.round(v * 8.84), note: `${String(v).replace(".", ",")} ${/g\s*\/\s*mol/.test(e) && !/mg/.test(e) ? "g/mol" : "mg/mmol"} omregnet til mg/g (× 8,84)` } : null),
      });
      r.alle.forEach((x) => L.brug(x.index, x.slut));
      return r.nu;
    };
    // P-kreatinin i µmol/l — ikke U-kreatinin (mmol/l) eller mg/dl.
    L.kreat = () => L.serie(`p-?kreatinin|(?<![u\\/]-?)kreatinin|creatinin|p-?krea\\.?|(?<![u\\/]-?)krea(?:t)?\\.?`, { min: 20, max: 2000, navn: "kreatinin" }).nu;
    // BT: "BT 142/88", "BT hjemme 138/84", "Hjemme-BT gns. 138/84", "BT 160/90 sidste år, i dag 132/78".
    L.bt = function () {
      const ud = [];
      const MID = `((?:\\s*(?:[:=]|hjemme|gns\\.?|gennemsnit\\w*|ve\\.?|hø\\.?|venstre|højre|arm|siddende|liggende|stående|målt|ca\\.?|på|${TID}))*)\\s*`;
      const PAR = "(\\d{2,3})\\s*\\/\\s*(\\d{2,3})";
      for (const m of alle(new RegExp(`${B}(?:bt|blodtryk|hjemme-?bt)${E}${MID}${PAR}`, "g"))) {
        if (hypotetisk(m.index, m.index + m[0].length) || /mål/.test(t.slice(Math.max(0, m.index - 6), m.index + 8))) continue;
        let slut = m.index + m[0].length;
        const push = (s1, d1, i0, i1, tt) => {
          const s = parseTal(s1);
          const d = parseTal(d1);
          if (s >= 60 && s <= 280 && d >= 30 && d <= 170) ud.push(Object.assign({ s, d, v: s, index: i0, kilde: kilde(i0, i1), led: leddet(i0), rk: ud.length }, tidAf(tt)));
        };
        const post = t.slice(slut).match(new RegExp(`^\\s*(?:mmhg)?\\s*(?:\\(\\s*(${TID})\\s*\\)|(${TID})(?=\\s*(?:$|[,.;)\\n])))`));
        push(m[2], m[3], m.index, slut + (post ? post[0].length : 0), m[1] + (post ? " " + (post[1] || post[2]) : ""));
        if (post) slut += post[0].length;
        const f = t.slice(slut).match(new RegExp(`^\\s*(?:mmhg)?\\s*[,;]\\s*((?:${TID}(?:\\s*[:=])?\\s*)+)${PAR}`));
        if (f) push(f[2], f[3], slut, slut + f[0].length, f[1]);
      }
      const r = vaelgAktuel(ud, "BT", "sidste");
      return r.nu ? Object.assign(r.nu, { s: r.nu.s, d: r.nu.d }) : null;
    };

    // eGFR nu og tidligere. Uden klar tidsangivelse bruges den laveste værdi (forsigtigst) med en bemærkning.
    L.egfrTid = function () {
      const r = L.serie(`e-?gfr|gfr|egfr\\s*\\(?ckd-?epi\\)?`, { min: 2, max: 200, navn: "eGFR", strategi: "laveste" });
      return { nu: r.nu, foer: r.foer };
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
    // Et udtrykkeligt "restordre" betyder, at opgaven er at finde et alternativ — vejer tungest.
    { id: "restordre", sti: "restordre/index.html", navn: "Restordre — alternativer", app: "Restordre", udfyld: true, tegn: [
      { v: 9, m: "restordre\\w*|kan ikke skaffes|ikke til at skaffe|forsyningsvanskelig\\w*|forsyningssvigt|leveringssvigt|mangel på (?:medicin|præparatet|lægemidlet)|udgået fra markedet" } ] },
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
    // En EKG-udskrift (måleværdier og maskinens tolkning) vejer tungt; ordet "EKG" alene næsten intet.
    { id: "ekg", sti: "hjerte/ekg.html", navn: "EKG — tolkning af måleværdier", app: "Hjerte-kar", udfyld: true, tegn: [
      { v: 6, m: "systemevaluering|cardiosoft|12sl|p-r-t[- ]?akse\\w*|p\\s*\\/\\s*qrs\\s*\\/\\s*t|qt\\s*\\/\\s*qtc|sokolow\\w*|rr\\s*\\/\\s*pp" },
      { v: 3, m: `(?:pr|pq)[- ]?(?:interval|tid)\\w*|qrs[- ]?(?:varighed|duration|bredde)` },
      { v: 2, m: `qtc${E}|qtc-?(?:tid|interval)\\w*` },
      { v: 2, m: `av-?blok|grenblok|hemiblok|fascikelblok|ekstrasystol\\w*|ves${E}|sves${E}|sinusbradykardi|sinustakykardi|forlænget qt|lang qt` },
      { v: 1, m: `ekg${E}|elektrokardiogram\\w*` } ] },
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
    panel.innerHTML = `<summary>${opts.titel || "Udfyld fra journaltekst"}</summary>
      <p class="field-hint">${opts.hjaelp || "Indsæt fx et notat fra Noteless eller en diktering."} Teksten behandles kun i browseren og sendes ingen steder hen. Kontrollér altid de udfyldte felter.</p>
      <label for="udfyldTekst" class="sr-only">Journaltekst</label>
      <textarea id="udfyldTekst" rows="${opts.raekker || 5}" placeholder="${opts.eksempel || ""}"></textarea>
      <div class="udfyld-actions">
        <button type="button" class="btn btn-primary" id="udfyldBtn">Udfyld felterne</button>
        <button type="button" class="btn btn-outline" id="udfyldRyd">Ryd</button>
      </div>
      <div class="udfyld-rapport" id="udfyldRapport" aria-live="polite"></div>`;
    if (opts.aaben) panel.open = true;
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
        if (f.type === "num" || f.type === "tekst" || f.type === "hidden") {
          const el = document.getElementById(f.id);
          if (!el) return;
          el.value = String(f.v);
          if (f.type !== "hidden") markér(el);
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
