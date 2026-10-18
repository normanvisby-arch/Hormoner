/*
 * Tolkning af en MR-beskrivelse af lændecolumna (dansk fritekst) med faste regler i browseren.
 * Intet sendes nogen steder hen. Resultatet er en liste over fund pr. niveau med den tekst,
 * fundet er læst i — lægen kontrollerer og retter listen, før den vises for patienten.
 *
 * Fund: { id, type, niveau, zone, side, grad, prolapstype, rod, rodgrad, kilde, note }
 *   type: prolaps | bulging | spinalstenose | recesstenose | foraminalstenose | facetartrose |
 *         flavumhypertrofi | rod | andet
 *   niveau: "L4/L5" o.l. (null = ikke angivet)   side: "v" | "h" | "begge" | null
 *   zone (prolaps): central | paracentral | foraminal | ekstraforaminal
 *   grad: 1 let, 2 moderat, 3 svær (null = ikke angivet)
 */
const MR = (function () {
  "use strict";

  const B = "(?<![a-zæøåé0-9])";
  const E = "(?![a-zæøåé0-9])";
  const NIV = "(?:L\\s?([1-5])|Th\\s?(12))\\s*(?:[/-]|\\s?-\\s?|\\s)?\\s*(?:L\\s?([1-5])|S\\s?(1)|([1-5])(?![0-9]))";
  const NIVEAU = new RegExp(`${B}${NIV}${E}`, "gi");
  // Nægtelse før fundet i samme sætning; "men", "dog" o.l. bryder nægtelsen.
  const NEG = new RegExp(`${B}(ingen|ikke|uden|ej|intet|normal\\w*|fri|frie|frit|negativ|afkræft\\w*|udelukke\\w*)${E}`);
  const SKIFT = new RegExp(`${B}(men|dog|derimod|imidlertid|samt der|og der ses|der ses)${E}`);
  const SIDE_V = new RegExp(`${B}(venstre\\w*|tv\\.|ve\\.?|v\\.?\\s?-?sidig\\w*|sin\\.?|sinistra|vs\\.?|left)${E}`);
  const SIDE_H = new RegExp(`${B}(højre\\w*|th\\.(?!\\s?\\d)|hø\\.?|h\\.?\\s?-?sidig\\w*|dx\\.?|dxt\\.?|dextra|hs\\.?|right)${E}`);
  const BEGGE = new RegExp(`${B}(bilateral\\w*|begge sider|bilat\\.?|dobbeltsidig\\w*|på begge sider|bds\\.?)${E}`);
  const GRAD3 = new RegExp(`${B}(svær\\w*|udtalt\\w*|betydelig\\w*|højgradig\\w*|kritisk\\w*|massiv\\w*|kraftig\\w*|stor\\w*|grad\\s*3|schizas\\s*[cd]|lee\\s*(?:grad\\s*)?3)${E}`);
  const GRAD2 = new RegExp(`${B}(moderat\\w*|middelsvær\\w*|middelgradig\\w*|mellemgradig\\w*|en del|grad\\s*2|schizas\\s*b|lee\\s*(?:grad\\s*)?2)${E}`);
  const GRAD1 = new RegExp(`${B}(let\\w*|lettere|mild\\w*|beskeden\\w*|diskret\\w*|lille|mindre|minimal\\w*|lavgradig\\w*|grad\\s*1|schizas\\s*a|lee\\s*(?:grad\\s*)?1)${E}`);

  const TERMER = {
    // Rækkefølge betyder noget: specifikke stenoser før den generelle spinalstenose.
    foraminalstenose: `(?:neuro)?foraminal\\w*\\s+(?:stenose|indsnævring|forsnævring)|foraminalstenose|foramenstenose|(?:stenose|indsnævring|forsnævring)\\s+af\\s+(?:de\\s+|det\\s+|begge\\s+)?(?:neuro)?forami\\w*|snævr\\w*\\s+(?:neuro)?forami\\w*|(?:neuro)?forami\\w*\\s+(?:er\\s+)?(?:snævr\\w*|indsnævr\\w*|forsnævr\\w*)`,
    recesstenose: `recess?tenose|recessus\\s?-?stenose|recess\\w*\\s+stenose|(?:stenose|indsnævring|forsnævring)\\s+af\\s+(?:den\\s+|de\\s+)?(?:laterale?\\s+)?recess\\w*|lateral\\w*\\s+recess\\w*\\s+(?:stenose|indsnævring|er\\s+snævr\\w*|snævr\\w*)|snævr\\w*\\s+(?:lateral\\w*\\s+)?recess\\w*|subartikulær\\w*\\s+stenose`,
    spinalstenose: `spinal\\s?-?stenose|spinalkanalstenose|central\\w*\\s+(?:spinal\\s?)?stenose|kanalstenose|(?:stenose|indsnævring|forsnævring)\\s+af\\s+(?:den\\s+)?spinalkanal\\w*|snævr\\w*\\s+spinalkanal\\w*|spinalkanal\\w*\\s+(?:er\\s+)?(?:snævr\\w*|indsnævr\\w*|stenoser\\w*)|canalis\\s+spinalis\\s+(?:er\\s+)?(?:snævr\\w*|stenose)`,
    facetartrose: `facetleds?\\s?-?artrose\\w*|facetartrose\\w*|facet\\s?-?ledsartrose\\w*|spondylartrose\\w*|artrose\\s+(?:i|af)\\s+(?:begge\\s+)?facetled\\w*|artrotiske?\\s+facetled\\w*|degenerative?\\s+(?:forandringer\\s+)?(?:i\\s+)?facetled\\w*|facet\\w*\\s?-?hypertrofi\\w*|hypertrofi\\w*\\s+(?:af\\s+)?facetled\\w*|facetleds?degeneration`,
    flavumhypertrofi: `flavum\\s?-?hypertrofi\\w*|flavumfortykkelse|hypertrofi\\w*\\s+(?:af\\s+)?(?:lig\\.?|ligamentum|ligamenta)\\s+flav\\w*|(?:lig\\.?|ligamentum|ligamenta)\\s+flav\\w*\\s+(?:er\\s+)?(?:fortyk\\w*|hypertrofi\\w*)|fortyk\\w*\\s+(?:lig\\.?|ligamentum|ligamenta)\\s+flav\\w*|fortyk\\w*\\s+flav\\w*`,
    bulging: `bulging|diskusbuling|buling|udbuling|bulgende|bulger|diffust?\\s+(?:bredbasede?\\s+)?(?:diskus)?(?:udbuling|bulging|protrusion)|cirkumferent\\w*\\s+(?:diskus\\w*\\s+)?(?:udbuling|bulging|buling)`,
    prolaps: `diskus\\s?-?prolaps\\w*|prolaps\\w*|disk\\s?-?prolaps\\w*|diskus\\s?-?herniation\\w*|herniation\\w*|diskushernie\\w*|diskus\\s?-?protrusion\\w*|protrusion\\w*|ekstrusion\\w*|extrusion\\w*|sekvest\\w*|diskus\\s?-?ekstrusion\\w*`,
  };
  const ROD = new RegExp(`${B}(?:(L\\s?[1-5]|S\\s?1)\\s?-?\\s?(?:nerve)?rod(?:en|s)?|(?:nerve)?rod(?:en)?\\s+(?:til\\s+|for\\s+)?(L\\s?[1-5]|S\\s?1)|(L\\s?[1-5]|S\\s?1)\\s?-?\\s?radi\\w*|(traverserende|exiterende|udtrædende|afgående)\\s+(?:nerve)?rod(?:en)?|nerverod(?:en)?|rodpåvirkning|rodaffektion|rodkompression|rodkontakt)${E}`, "gi");
  const ROD_KOMPR = new RegExp(`${B}(kompr\\w*|kompression\\w*|tryk\\w*|fortræng\\w*|deplacer\\w*|dislocer\\w*|disloker\\w*|klemm\\w*|indklem\\w*|afklem\\w*|presse\\w*|deformer\\w*|affladig\\w*|fladtryk\\w*)${E}`);
  const ROD_PAAV = new RegExp(`${B}(afficer\\w*|affektion\\w*|påvirk\\w*|irritation\\w*|irriter\\w*|impingement|kompromitter\\w*)${E}`);
  const ROD_KONTAKT = new RegExp(`${B}(kontakt\\w*|berør\\w*|tanger\\w*|ligger\\s+op\\s+ad|abutt\\w*|nær\\w*)${E}`);
  const ANDET = [
    ["spondylolistese", "Spondylolistese (forskydning af hvirvel)", `spondylolistese\\w*|anterolistese\\w*|retrolistese\\w*|listese`],
    ["modic", "Modic-forandringer (knoglemarvsforandringer ved endepladerne)", `modic\\w*`],
    ["degeneration", "Diskusdegeneration (slidt disk)", `diskus\\s?-?degeneration\\w*|degeneration\\w*\\s+af\\s+disk\\w*|degenerer\\w*\\s+disk\\w*|dehydrer\\w*|udtørr\\w*|reducer\\w*\\s+diskushøjde|nedsat\\s+diskushøjde|pfirrmann\\s*\\d?|black\\s+disc|chondrose|osteochondrose`],
    ["fissur", "Annulusfissur (lille revne i diskens ydre ring)", `annulus\\s?-?fissur\\w*|annulær\\w*\\s+fissur\\w*|annulus\\s?-?ruptur\\w*|high\\s+intensity\\s+zone|hiz${E}`],
    ["cyste", "Synovialcyste/facetledscyste", `synovial\\s?-?cyste\\w*|facetleds?cyste\\w*|ganglion\\w*`],
    ["schmorl", "Schmorlske knuder", `schmorl\\w*`],
    ["haemangiom", "Hæmangiom (godartet karknude i hvirvel)", `hæmangiom\\w*|haemangiom\\w*`],
  ];

  const normNiveau = (m) => {
    const a = m[1] ? "L" + m[1] : "Th12";
    let b = m[3] ? "L" + m[3] : m[4] ? "S1" : m[5] ? "L" + m[5] : null;
    if (!b) return null;
    // "L4-5" betyder L4/L5; "L5-1" betyder L5/S1
    if (m[5] && a === "L5" && m[5] === "1") b = "S1";
    const ord = ["Th12", "L1", "L2", "L3", "L4", "L5", "S1"];
    if (ord.indexOf(b) !== ord.indexOf(a) + 1) return null;
    return `${a}/${b}`;
  };
  const normRod = (s) => s.replace(/\s/g, "").toUpperCase();

  function saetninger(t) {
    // Sætninger: . ; ! ? og linjeskift (ikke punktum i forkortelser som "lig." eller tal).
    const ud = [];
    let start = 0;
    for (let i = 0; i <= t.length; i++) {
      const c = t[i];
      const slut = i === t.length || c === "\n" || c === ";" || c === "!" || c === "?" ||
        (c === "." && !/\d/.test(t[i + 1] || "") && !/(?:lig|ca|bl\.a|evt|sin|dx|dxt|hø|ve|vs|hs|bilat|bds|th|pga|mht|jf|ift|nr)$/i.test(t.slice(Math.max(0, i - 6), i)));
      if (slut) {
        if (i > start) ud.push({ a: start, b: i, s: t.slice(start, i) });
        start = i + 1;
      }
    }
    return ud;
  }

  function side(tekst) {
    const v = SIDE_V.test(tekst), h = SIDE_H.test(tekst), be = BEGGE.test(tekst);
    if (be || (v && h)) return "begge";
    return v ? "v" : h ? "h" : null;
  }
  function grad(tekst) {
    return GRAD3.test(tekst) ? 3 : GRAD2.test(tekst) ? 2 : GRAD1.test(tekst) ? 1 : null;
  }
  function zone(tekst) {
    if (new RegExp(`${B}(?:ekstra|extra)\\s?-?forami\\w*|far\\s+lateral\\w*|ekstraforaminal\\w*`).test(tekst)) return "ekstraforaminal";
    if (new RegExp(`${B}(?:intra)?forami\\w*`).test(tekst)) return "foraminal";
    if (new RegExp(`${B}(?:paracentral\\w*|paramedian\\w*|subartikulær\\w*|posterolateral\\w*|recess\\w*|lateral\\w*)`).test(tekst)) return "paracentral";
    if (new RegExp(`${B}(?:central\\w*|median\\w*|midtlinje\\w*|midtstillet)`).test(tekst)) return "central";
    return null;
  }

  function fjernCpr(s) {
    return String(s).replace(/(?<!\d)\d{6}[- ]?\d{4}(?!\d)/g, "[CPR]");
  }

  function tolk(raa) {
    const tekst = fjernCpr(String(raa || "")).replace(/\r/g, "");
    const lav = tekst.toLowerCase();
    const fund = [];
    const s = saetninger(lav);
    let sidsteNiveau = null;
    let n = 0;

    for (const st of s) {
      // Niveauer i sætningen
      const niv = [];
      let m;
      NIVEAU.lastIndex = 0;
      while ((m = NIVEAU.exec(st.s))) {
        const nv = normNiveau(m);
        if (nv) niv.push({ i: m.index, v: nv });
      }
      const sNiv = (i) => {
        // Nærmeste niveau før fundet i sætningen, ellers efter, ellers seneste overskrift
        const foer = niv.filter((x) => x.i <= i);
        if (foer.length) return foer[foer.length - 1].v;
        if (niv.length) return niv[0].v;
        return sidsteNiveau;
      };
      // Led: nægtelse gælder fra nægteord til skift ("men", "dog") eller sætningens slutning
      const negeret = (i) => {
        const foer = st.s.slice(0, i);
        const del = foer.split(SKIFT);
        return NEG.test(del[del.length - 1]);
      };
      const kilde = (i, l) => {
        const a = Math.max(0, i - 40), b = Math.min(st.s.length, i + l + 40);
        let x = tekst.slice(st.a + a, st.a + b).trim();
        return (a > 0 ? "…" : "") + x + (b < st.s.length ? "…" : "");
      };
      const brugt = [];
      const fri = (i, l) => !brugt.some(([a, b]) => i < b && i + l > a);

      // Først alle fund i sætningen, så konteksten for hvert fund kan afgrænses af nabofundene.
      const hits = [];
      for (const [type, mon] of Object.entries(TERMER)) {
        const re = new RegExp(`${B}(?:${mon})${E}`, "g");
        while ((m = re.exec(st.s))) {
          if (!fri(m.index, m[0].length)) continue;
          brugt.push([m.index, m.index + m[0].length]);
          hits.push({ type, i: m.index, l: m[0].length, ord: m[0] });
        }
      }
      ROD.lastIndex = 0;
      const rodPos = [];
      while ((m = ROD.exec(st.s))) rodPos.push(m.index);
      hits.sort((a, b) => a.i - b.i);
      hits.forEach((h, k) => {
        const f = { id: "f" + ++n, type: h.type, niveau: sNiv(h.i), kilde: kilde(h.i, h.l), negeret: negeret(h.i) };
        // Før: fra forrige fund (eller skift/sætningsstart). Efter: til næste fund, komma, "og", "samt", "med" eller rodomtale.
        const fra = k > 0 ? hits[k - 1].i + hits[k - 1].l : 0;
        const foer = st.s.slice(fra, h.i).split(SKIFT).pop().split(/,|\s(?:samt|med|og)\s/).pop();
        const til = Math.min(k + 1 < hits.length ? hits[k + 1].i : st.s.length, ...rodPos.filter((x) => x > h.i + h.l), st.s.length);
        const efter = st.s.slice(h.i, til).split(/,(?!\s*(?:til|på|i)\s)|\s(?:samt|med|og|der)\s/)[0];
        const ctx = foer + " " + efter;
        f.side = side(ctx);
        f.grad = grad(ctx);
        if (h.type === "prolaps") {
          const lok = foer.slice(-40) + " " + efter;
          f.prolapstype = /sekvest/.test(lok) ? "sekvester" : /ekstru|extru/.test(lok) ? "ekstrusion" : /protru|bredbase|bred\s+base/.test(lok) ? "protrusion" : null;
          f.zone = zone(ctx);
          if (/bredbase|bred\s+base|diffus/.test(ctx) && !f.zone) f.zone = "central";
          if (/migr\w*\s+(?:i\s+)?(?:kaudal|nedad|caudal)|kaudalt\s+migr/.test(st.s)) f.note = "kaudal migration nævnt";
        }
        if (h.type === "facetartrose" && !f.side) f.side = "begge";
        if (h.type === "flavumhypertrofi" && !f.side) f.side = "begge";
        if (h.type === "foraminalstenose" && /forami(?:na|nerne)(?![a-zæøå])|begge\s+forami/.test(ctx) && !f.side) f.side = "begge";
        fund.push(f);
      });
      // Nerverødder
      ROD.lastIndex = 0;
      while ((m = ROD.exec(st.s))) {
        const navn = m[1] || m[2] || m[3];
        const ctx = st.s.slice(Math.max(0, m.index - 70), m.index + m[0].length + 50);
        const g = ROD_KOMPR.test(ctx) ? 3 : ROD_PAAV.test(ctx) ? 2 : ROD_KONTAKT.test(ctx) ? 1 : null;
        const f = { id: "f" + ++n, type: "rod", niveau: sNiv(m.index), rod: navn ? normRod(navn) : null, rodtype: m[4] || null,
          rodgrad: g, side: side(ctx), kilde: kilde(m.index, m[0].length), negeret: negeret(m.index) };
        if (!navn && !m[4] && g === null && !/rodpåvirkning|rodaffektion|rodkompression|rodkontakt/.test(m[0])) continue;
        if (/rodkompression/.test(m[0])) f.rodgrad = 3;
        if (/rodpåvirkning|rodaffektion/.test(m[0]) && !f.rodgrad) f.rodgrad = 2;
        if (/rodkontakt/.test(m[0])) f.rodgrad = 1;
        fund.push(f);
      }
      // Andre fund (vises i listen, ikke i 3D-modellen)
      for (const [id, navn, mon] of ANDET) {
        const re = new RegExp(`${B}(?:${mon})`, "g");
        if ((m = re.exec(st.s)) && fri(m.index, m[0].length)) {
          fund.push({ id: "f" + ++n, type: "andet", andet: id, navn, niveau: sNiv(m.index), kilde: kilde(m.index, m[0].length), negeret: negeret(m.index) });
        }
      }
      if (niv.length) sidsteNiveau = niv[niv.length - 1].v;
    }
    return samle(fund);
  }

  // Slå dubletter sammen og knyt rodfund til prolaps/stenose på samme niveau og side.
  function samle(fund) {
    const pos = fund.filter((f) => !f.negeret);
    const ud = [];
    for (const f of pos) {
      const dub = ud.find((g) => g.type === f.type && g.niveau === f.niveau && (f.type !== "rod" || g.rod === f.rod) && (f.type !== "andet" || g.andet === f.andet) &&
        (f.type !== "prolaps" || !g.zone || !f.zone || g.zone === f.zone) && (!g.side || !f.side || g.side === f.side || f.type === "rod"));
      if (dub) {
        for (const k of ["side", "grad", "zone", "prolapstype", "rod", "rodgrad", "note"]) if (dub[k] == null && f[k] != null) dub[k] = f[k];
        if (f.grad && dub.grad && f.grad > dub.grad) dub.grad = f.grad;
        if (f.rodgrad && dub.rodgrad && f.rodgrad > dub.rodgrad) dub.rodgrad = f.rodgrad;
        continue;
      }
      ud.push(Object.assign({}, f));
    }
    // "Generel" bulging uden niveau slettes ikke; prolaps med "bredbaset" er protrusion
    for (const f of ud) {
      if (f.type === "prolaps" && !f.prolapstype && /bredbase|bred\s+base/.test(f.kilde.toLowerCase())) f.prolapstype = "protrusion";
    }
    return { fund: ud, negerede: fund.filter((f) => f.negeret) };
  }

  // ---------------------------------------------------------------- fra fund til 3D-model
  // Kun L4/L5 er modelleret i prototypen. Returnerer shape key-styrker og rødder, der fremhæves.
  const STYRKE = { 1: 0.5, 2: 0.78, 3: 1.0 };
  const RODER_VED = { // L4/L5: traverserende rod L5, udtrædende rod L4
    central: null, paracentral: "L5", foraminal: "L4", ekstraforaminal: "L4",
  };
  function model(fund, niveau = "L4/L5", negerede = []) {
    const keys = {}, roder = {}, noter = [];
    const ingenRod = negerede.some((f) => f.type === "rod" && (!f.niveau || f.niveau === niveau) && !f.rod);
    const sider = (s) => (s === "begge" ? ["v", "h"] : s ? [s] : []);
    const add = (k, v) => { keys[k] = Math.min(1.15, Math.max(keys[k] || 0, v)); };
    const markerRod = (rod, s, g, afledt) => {
      const k = `Rod_${rod}_${s}`;
      if (afledt && ingenRod) return;
      const gl = roder[k];
      if (!gl || (g || 0) > (gl.grad || 0) || (gl.afledt && !afledt)) roder[k] = { grad: g, afledt: !!afledt };
    };
    for (const f of fund) {
      if (f.niveau !== niveau) continue;
      const st = STYRKE[f.grad] || 0.78;
      if (f.type === "prolaps") {
        const typ = f.prolapstype === "ekstrusion" || f.prolapstype === "sekvester" ? "ekstrusion" : "protrusion";
        const z = f.zone || "paracentral";
        let ss = z === "central" ? [""] : sider(f.side);
        if (z !== "central" && !ss.length) { ss = ["v"]; noter.push("Prolapsens side er ikke angivet — vist til venstre. Ret siden i listen."); }
        if (!f.zone) noter.push("Prolapsens placering (zone) er ikke angivet — vist som paracentral.");
        if (!f.prolapstype) noter.push("Prolapstypen er ikke angivet — vist som protrusion.");
        if (f.prolapstype === "sekvester") noter.push("Sekvester er vist som ekstrusion (det løse fragment er ikke modelleret).");
        const storrelse = f.grad === 1 ? 0.75 : f.grad === 3 ? 1.12 : 1.0;
        for (const s of ss) {
          add(`${typ}_${z}${s ? "_" + s : ""}`, storrelse);
          const r = RODER_VED[z];
          if (r) markerRod(r, s, null, true);
          if (z === "central" && typ === "ekstrusion") { markerRod("L5", "v", null, true); markerRod("L5", "h", null, true); }
        }
      } else if (f.type === "bulging") add("bulging", f.grad === 1 ? 0.7 : 1.0);
      else if (f.type === "spinalstenose") add("spinalstenose", st);
      else if (f.type === "flavumhypertrofi") add("flavumhypertrofi", 1.0);
      else if (f.type === "recesstenose") {
        const ss = sider(f.side).length ? sider(f.side) : ["v", "h"];
        for (const s of ss) { add(`recesstenose_${s}`, st); markerRod("L5", s, null, true); }
      } else if (f.type === "foraminalstenose") {
        const ss = sider(f.side).length ? sider(f.side) : ["v", "h"];
        for (const s of ss) { add(`foraminalstenose_${s}`, st); markerRod("L4", s, null, true); }
      } else if (f.type === "facetartrose") {
        for (const s of sider(f.side || "begge")) add(`facetartrose_${s}`, STYRKE[f.grad] || 0.8);
      }
    }
    // Navngivne rødder (fx "venstre L5-rod komprimeres")
    for (const f of fund) {
      if (f.type !== "rod") continue;
      let rod = f.rod;
      if (!rod && f.niveau === niveau) {
        if (f.rodtype && /travers/.test(f.rodtype)) rod = "L5";
        else if (f.rodtype && /exit|udtræd|afgå/.test(f.rodtype)) rod = "L4";
        else {
          const p = fund.find((g) => g.type === "prolaps" && g.niveau === niveau && RODER_VED[g.zone || "paracentral"]);
          if (p) rod = RODER_VED[p.zone || "paracentral"];
        }
      }
      if (!rod || !["L4", "L5"].includes(rod)) continue;
      if (f.niveau && f.niveau !== niveau) continue;
      let ss = sider(f.side);
      if (!ss.length) {
        const p = fund.find((g) => g.niveau === niveau && g.side && g.side !== "begge" && ["prolaps", "recesstenose", "foraminalstenose"].includes(g.type));
        ss = p ? [p.side] : ["v"];
      }
      for (const s of ss) markerRod(rod, s, f.rodgrad || 2, false);
    }
    return { keys, roder, noter: [...new Set(noter)] };
  }

  // ---------------------------------------------------------------- forklaring til patienten
  const NIV_TEKST = { "L1/L2": "1. og 2.", "L2/L3": "2. og 3.", "L3/L4": "3. og 4.", "L4/L5": "4. og 5.", "L5/S1": "5. lændehvirvel og korsbenet" };
  const sideOrd = (s) => (s === "v" ? "venstre" : s === "h" ? "højre" : s === "begge" ? "begge sider" : "");
  const ROD_INFO = {
    L4: "L4-roden giver følelse på forsiden af knæet og indersiden af underbenet og styrer bl.a. knæstrækningen",
    L5: "L5-roden giver følelse på ydersiden af underbenet, fodryggen og storetåen og styrer bl.a. løft af fod og storetå",
    S1: "S1-roden giver følelse på ydersiden af foden og lilletåen og styrer bl.a. at stå på tæer",
  };
  function forklaring(fund) {
    const linjer = [];
    for (const f of fund) {
      const niv = f.niveau ? (f.niveau === "L5/S1" ? `mellem ${NIV_TEKST[f.niveau]}` : `mellem ${NIV_TEKST[f.niveau] || f.niveau} lændehvirvel`) : "";
      const sd = f.side && f.side !== "begge" ? ` til ${sideOrd(f.side)}` : f.side === "begge" ? " i begge sider" : "";
      if (f.type === "prolaps") {
        const hvor = { central: "midt bagtil ind mod nervekanalen", paracentral: `bagtil lidt ${f.side === "h" ? "til højre" : f.side === "v" ? "til venstre" : "til siden"} for midten`, foraminal: `ud i hullet${sd}, hvor nerveroden forlader rygmarvskanalen`, ekstraforaminal: `helt ude i siden${sd}, uden for nervehullet` }[f.zone || "paracentral"];
        const hvad = f.prolapstype === "ekstrusion" || f.prolapstype === "sekvester"
          ? "Noget af den bløde kerne i disken er presset ud gennem diskens ydre ring"
          : f.prolapstype === "protrusion" ? "Disken buler ud, men den ydre ring er hel" : "Disken buler ud (diskusprolaps)";
        let t = `${hvad} — ${niv ? niv + ", " : ""}${hvor}.`;
        const r = f.niveau === "L4/L5" ? RODER_VED[f.zone || "paracentral"] : f.niveau === "L5/S1" ? ({ paracentral: "S1", foraminal: "L5", ekstraforaminal: "L5" })[f.zone || "paracentral"] : null;
        if (r) t += ` Her ligger ${r}-roden, som kan blive trykket og give smerter, der stråler ned i benet. ${ROD_INFO[r] || ""}.`;
        else if (f.zone === "central") t += " En stor central prolaps kan trykke på flere nerverødder i nervekanalen.";
        linjer.push({ f, t });
      } else if (f.type === "bulging") linjer.push({ f, t: `Disken ${niv} buler jævnt ud hele vejen rundt. Det er et almindeligt tegn på slid og ses også hos mange uden smerter.` });
      else if (f.type === "spinalstenose") linjer.push({ f, t: `Nervekanalen ${niv} er ${["", "lidt ", "moderat ", "meget "][f.grad || 0]}trang. Det skyldes typisk slid: disken buler, ledbåndet bag kanalen er fortykket, og de små led er forstørrede. Trange forhold kan give smerter, tyngde eller snurren i benene ved gang, som lindres ved at sætte sig eller gå foroverbøjet.` });
      else if (f.type === "recesstenose") linjer.push({ f, t: `Hjørnet af nervekanalen${sd} ${niv} er trangt (recesstenose). Her løber nerveroden ned mod sit udgangshul og kan blive klemt.` });
      else if (f.type === "foraminalstenose") linjer.push({ f, t: `Hullet${sd}, hvor nerveroden forlader rygsøjlen ${niv}, er ${["", "lidt ", "moderat ", "meget "][f.grad || 0]}indsnævret (foraminal stenose). ${f.niveau === "L4/L5" ? "Det er L4-roden, der går ud her. " + ROD_INFO.L4 + "." : ""}` });
      else if (f.type === "facetartrose") linjer.push({ f, t: `De små led bag på rygsøjlen (facetleddene)${sd} ${niv} er slidte og forstørrede. Det kan give lokale lændesmerter og bidrage til trange forhold for nerverne.` });
      else if (f.type === "flavumhypertrofi") linjer.push({ f, t: `Det gule ledbånd bag nervekanalen ${niv} er fortykket og tager plads fra nerverne.` });
      else if (f.type === "rod" && f.rod) linjer.push({ f, t: `${f.side && f.side !== "begge" ? sideOrd(f.side)[0].toUpperCase() + sideOrd(f.side).slice(1) + " " : ""}${f.rod}-rod: ${["", "fundet ligger op ad roden", "roden er påvirket", "roden er klemt"][f.rodgrad || 2]}. ${ROD_INFO[f.rod] || ""}.` });
      else if (f.type === "andet") linjer.push({ f, t: `${f.navn}${niv ? " " + niv : ""}.` });
    }
    return linjer;
  }

  const api = { tolk, model, forklaring, fjernCpr, normNiveau };
  return api;
})();
if (typeof module !== "undefined") module.exports = MR;
