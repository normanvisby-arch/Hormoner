/*
 * Hud- og bløddelsinfektioner i almen praksis: erysipelas, cellulitis og
 * sårinfektion/absces, impetigo, erythema migrans og bid. Region Hovedstaden
 * og Region Midtjylland (2025), Sundhedsstyrelsen (impetigo), Lægehåndbogen.
 */

(function () {
  "use strict";

  let last = null;
  const ab = AB({ update, journal: buildJournalNote });
  const { num, radio, checked, fmt, box, collapsible, ul, boernetekst, gruppe, drugTable, planLinjer } = ab;
  const alderWarning = document.getElementById("alderWarning");

  const DIAG = { erysipelas: "erysipelas", cellulitis: "cellulitis/sårinfektion", impetigo: "impetigo", em: "erythema migrans", bid: "bid" };
  const FELTER = { fsCell: ["cellulitis"], fsImp: ["impetigo"], fsBid: ["bid"] };

  function getState() {
    const diag = radio("diag");
    Object.entries(FELTER).forEach(([id, diags]) => (document.getElementById(id).hidden = !diags.includes(diag)));
    const alder = num("alder");
    const vaegt = num("vaegt");
    const andet = checked("andet");
    return { diag, alder, vaegt, gruppe: gruppe(alder, vaegt), allergi: andet.includes("allergi"), gravid: andet.includes("gravid"), rf: checked("rf") };
  }

  const barn = (s) => s.gruppe === "barn";

  // ---------------------------------------------------------------------
  // Regimer
  // ---------------------------------------------------------------------

  const kurDage = (d) => parseInt(String(d).split(/[–-]/).pop(), 10) || 7;
  function penV(s, tag, rec) {
    if (barn(s)) return { key: "penv", navn: "Penicillin V", dosering: boernetekst(s.vaegt, 50, 3, 800, "i 7 dage", 0, { key: "penv", dage: 7 }), note: "Region Midtjylland (2025).", tag, rec };
    return { key: "penv", navn: "Penicillin V", dosering: "1 mio. IE (660 mg) eller 800 mg × 4 dagligt i 5–7 dage", note: "Region Hovedstaden (2025). Region Midtjylland: 1 mio. IE × 3 i 7 dage.", tag, rec };
  }
  function diclox(s, tag, rec, dage) {
    if (barn(s)) {
      const lille = !isNaN(s.vaegt) && s.vaegt < 20;
      return { key: "diclox", navn: lille ? "Flucloxacillin mikstur" : "Dicloxacillin", dosering: boernetekst(s.vaegt, 45, 3, 1000, `i ${dage || 7} dage`, lille ? 0 : 250, lille ? { key: "fluclox", dage: kurDage(dage || 7) } : null), note: lille ? "Under 20 kg: mikstur." : "Kapsler à 250 og 500 mg — dosis afrundet til hel kapsel.", tag, rec };
    }
    return { key: "diclox", navn: "Dicloxacillin", dosering: `1 g × 3 dagligt i ${dage || 7} dage`, note: "Tages på tom mave (1 time før eller 2 timer efter et måltid).", tag, rec };
  }
  function makrolid(s, tag, rec, dage) {
    const gravidNote = s.gravid ? " Graviditet: kun efter nøje overvejelse — se pro.medicin.dk." : "";
    if (barn(s)) return { key: "clari", navn: "Clarithromycin", dosering: boernetekst(s.vaegt, 15, 2, 500, `i ${dage || 7} dage`, 0, { key: "clari", dage: kurDage(dage || 7) }), note: "Mange interaktioner." + gravidNote, tag, rec };
    return { key: "roxi", navn: "Roxithromycin", dosering: `150 mg × 2 dagligt i ${dage || "5–7"} dage`, note: `Alternativ: clarithromycin 500 mg × 2 i 7 dage (Region Midtjylland). Makrolider dækker stafylokokker usikkert.${gravidNote}`, tag, rec };
  }

  // ---------------------------------------------------------------------
  // Vurdering
  // ---------------------------------------------------------------------

  function res(titel, cls, tekst) {
    return { titel, cls, tekst: [].concat(tekst || []), rows: [], noter: [], sikkerhed: [], fund: "", ab: false };
  }

  function alarm(s) {
    if (s.rf.includes("nekrose")) return res("Mistanke om nekrotiserende bløddelsinfektion", "box-red", "Smerter ude af proportion med fundene, hurtig spredning, blærer, nekrose eller krepitation: indlæg akut (ring 112) — kirurgisk vurdering haster.");
    if (s.rf.includes("sepsis")) return res("Påvirket almentilstand: akut indlæggelse", "box-red", "Mistanke om sepsis ved hud- eller bløddelsinfektion: indlæg akut til intravenøs behandling.");
    if (s.rf.includes("ansigt")) return res("Periorbital eller udbredt ansigtsinfektion", "box-red", "Hævelse omkring øjet eller udbredt ansigtsinfektion: akut vurdering på hospital (risiko for orbital cellulitis).");
    return null;
  }

  function erysipelas(s) {
    const r = res("Erysipelas: penicillin V", "box-green", "Erysipelas skyldes næsten altid streptokokker — penicillin V er førstevalg.");
    r.tekst.push("Ved svigt eller mistanke om stafylokokker: Region Hovedstaden supplerer med dicloxacillin 1 g × 4; Region Midtjylland skifter til dicloxacillin 1 g × 3.");
    r.rows = s.allergi ? [makrolid(s, "Anbefalet (penicillinallergi)", true)] : [penV(s, "Anbefalet", true), makrolid(s, "Ved penicillinallergi", false), diclox(s, "Ved svigt eller stafylokokker", false)];
    r.ab = true;
    r.noter.push("Markér rødmens afgrænsning med pen, og løft benet. Rødmen kan tiltage det første døgn trods virksom behandling.");
    r.noter.push("Behandl indgangsporten (fodsvamp, sår, eksem) — det mindsker risikoen for recidiv.");
    r.noter.push("Ingen bedring efter 2–3 dage, eller pus/sår: tænk stafylokokker — tillæg eller skift til dicloxacillin efter regionens vejledning, eller overvej indlæggelse.");
    r.sikkerhed.push("Kontakt straks ved høj feber, kulderystelser, hurtig spredning eller stærke smerter.");
    return r;
  }

  function cellulitis(s) {
    const c = checked("cell");
    let r;
    if (c.includes("absces") && !c.includes("omgiv")) {
      r = res("Byld uden omgivende cellulitis: incision og drænage", "box-blue", ["Incision og drænage er behandlingen — antibiotika er som regel ikke nødvendigt.", "Podning ved gentagne bylder (MRSA, familiær smitte)."]);
      r.rows = [diclox(s, "Kun ved omgivende cellulitis", false)];
    } else {
      r = res(c.includes("absces") ? "Byld med omgivende cellulitis: drænage og dicloxacillin" : "Cellulitis eller sårinfektion: dicloxacillin", "box-green", "Purulent infektion og sårinfektion skyldes oftest Staphylococcus aureus — dicloxacillin er førstevalg.");
      r.rows = s.allergi ? [makrolid(s, "Anbefalet (penicillinallergi)", true)] : [diclox(s, "Anbefalet", true), makrolid(s, "Ved penicillinallergi", false)];
      r.ab = true;
      if (c.includes("absces")) r.tekst.push("Incidér og drænér bylden.");
      r.noter.push("Podning fra pus eller sår før behandling — især ved recidiv, svigt eller mistanke om MRSA (hospitalskontakt, udlandsophold, husdyrbrug).");
    }
    r.sikkerhed.push("Kontakt straks ved feber, hurtig spredning, røde stråler (lymfangitis) eller stærke smerter.");
    r.fund = [c.includes("absces") && "absces", c.includes("omgiv") && "omgivende rødme > 2 cm/feber"].filter(Boolean).join(", ");
    return r;
  }

  function impetigo(s) {
    const udbredt = radio("udbred") === "udbredt";
    let r;
    if (!udbredt) {
      r = res("Lokaliseret impetigo: antiseptisk behandling", "box-blue", ["Afvask skorperne med vand og sæbe, og brug antiseptisk behandling (fx klorhexidin-sæbe eller brintoverilte-creme 1 %).", "Topikale antibiotika (fusidinsyre, mupirocin) frarådes pga. resistens (Sundhedsstyrelsen)."]);
    } else {
      r = res("Udbredt impetigo: systemisk antibiotika", "box-green", "Udbredte elementer eller ingen effekt af antiseptisk behandling. Podning med resistensbestemmelse første gang.");
      if (s.allergi) r.rows = [makrolid(s, "Anbefalet (penicillinallergi)", true, barn(s) ? "5–7" : undefined)];
      else if (barn(s)) {
        const lille = !isNaN(s.vaegt) && s.vaegt < 20;
        r.rows = [{ key: "diclox-imp", navn: lille ? "Flucloxacillin mikstur" : "Dicloxacillin", dosering: boernetekst(s.vaegt, 50, 4, 1000, "i 5–7 dage", lille ? 0 : 250, lille ? { key: "fluclox", dage: 7 } : null), note: lille ? "Børn under 20 kg (Region Hovedstaden)." : "Kapsler fra 20 kg (Region Hovedstaden) — dosis afrundet til hel kapsel à 250 mg.", tag: "Anbefalet", rec: true }, makrolid(s, "Ved penicillinallergi", false, "5–7")];
      } else r.rows = [diclox(s, "Anbefalet", true, "5–7"), makrolid(s, "Ved penicillinallergi", false)];
      r.ab = true;
    }
    r.noter.push("Smittefare: barnet kan komme i institution, når elementerne er tørre eller efter 1–2 døgns systemisk behandling.");
    r.noter.push("God håndhygiejne, eget håndklæde og korte negle. Gentagne tilfælde: overvej podning af familien for bærertilstand.");
    r.sikkerhed.push("Kontakt igen ved feber, spredning eller ingen bedring efter en uge.");
    r.fund = udbredt ? "udbredt" : "lokaliseret";
    return r;
  }

  function em(s) {
    const r = res("Erythema migrans: klinisk diagnose — behandl", "box-green", ["Rødme på mindst 5 cm, der breder sig over dage, med eller uden central opklaring, efter flåtbid. Ingen serologi ved typisk EM.", "Flåtbid uden erythema migrans behandles ikke forebyggende."]);
    r.ab = true;
    const alderUkendt = barn(s) && isNaN(s.alder);
    if (!s.allergi) {
      r.rows = barn(s)
        ? [{ key: "penv-em", navn: "Penicillin V", dosering: boernetekst(s.vaegt, 100, 4, 750, "i 10 dage (maks. 3 g/døgn)", 0, { key: "penv", dage: 10 }), note: "100 mg (0,15 mio. IE)/kg/døgn fordelt på 4 doser (Region Hovedstaden).", tag: "Anbefalet", rec: true }]
        : [{ key: "penv-em", navn: "Penicillin V", dosering: "1,5 mio. IE (990 mg) × 3 dagligt i 10 dage", note: "Højere dosis end ved andre infektioner.", tag: "Anbefalet", rec: true }];
    }
    const allergiTag = s.allergi ? "Anbefalet (penicillinallergi)" : "Ved penicillinallergi";
    if (barn(s) && s.alder >= 8) {
      r.rows.push({ key: "doxy-em", navn: "Doxycyclin", dosering: s.alder >= 12 && !(s.vaegt < 40) ? "100 mg × 2 dagligt i 10 dage" : boernetekst(s.vaegt, 4, 2, 100, "i 10 dage"), note: "Børn fra 8 år (maks. 100 mg pr. dosis). Dispergible tabletter à 100 mg kan deles.", tag: allergiTag, rec: s.allergi });
    } else if (barn(s) && s.alder < 8) {
      r.rows.push({ key: "azi-em", navn: "Azithromycin", dosering: boernetekst(s.vaegt, 10, 1, 500, "i 3 dage", 0, { key: "azi", dage: 3 }), note: "Børn under 8 år (Region Hovedstaden).", tag: allergiTag, rec: s.allergi });
    } else if (!barn(s) && !s.gravid) {
      r.rows.push({ key: "doxy-em", navn: "Doxycyclin", dosering: "100 mg × 2 dagligt i 10 dage", note: "Undgå sollys (fotosensibilitet). Ikke til gravide og ammende.", tag: allergiTag, rec: s.allergi });
    }
    if (alderUkendt) r.tekst.push("<strong>Angiv alder</strong> — valget ved penicillinallergi afhænger af, om barnet er under eller over 8 år.");
    if (s.allergi && s.gravid) r.tekst.push("Gravid med penicillinallergi: doxycyclin er kontraindiceret — konferér med infektionsmedicinsk afdeling.");
    r.noter.push("Multiple EM, feber, ledsmerter, facialisparese eller hovedpine/nakkestivhed: dissemineret eller neuroborreliose — henvis.");
    r.sikkerhed.push("Kontakt igen ved nye udslæt, ansigtslammelse, nerve- eller ledsmerter i de kommende uger.");
    return r;
  }

  function bid(s) {
    const dyr = radio("dyr");
    const b = checked("bid");
    const hoejRisiko = dyr !== "hund" || b.includes("risiko") || b.includes("immun");
    let r;
    // Region Hovedstaden: penicillin V (+ dicloxacillin ved menneskebid); Lægehåndbogen: amoxicillin med clavulansyre.
    const menneske = dyr === "menneske";
    function regimer(dage, inficeret) {
      if (s.allergi) {
        if (barn(s)) return [{ key: "bid-allergi", navn: "Konferér", dosering: "Barn med penicillinallergi: konferér med pædiatrisk eller infektionsmedicinsk afdeling.", note: "", tag: "Penicillinallergi", rec: true }];
        return [{ key: "moxi", navn: "Moxifloxacin", dosering: `400 mg × 1 dagligt i ${dage}`, note: `Region Hovedstaden ved penicillinallergi. Fluorokinolon — risiko for seneskade og aortaaneurisme.${s.gravid ? " Undgås under graviditet — konferér." : ""}`, tag: s.gravid ? "Konferér (graviditet)" : "Anbefalet (penicillinallergi)", rec: !s.gravid }];
      }
      if (barn(s)) return [{ key: "bid-barn", navn: "Penicillin V", dosering: `Dosis efter vægt jf. regionens børnetabel, i ${dage}${menneske ? " — ved menneskebid tillige dicloxacillin" : ""}.`, note: "Alternativt amoxicillin med clavulansyre efter vægt (hold clavulansyre under maksimum).", tag: "Anbefalet", rec: true }];
      const rows = [{ key: "penv-bid", navn: menneske ? "Penicillin V + dicloxacillin" : "Penicillin V", dosering: `${menneske ? "Penicillin V 1 mio. IE × 4 + dicloxacillin 1 g × 4" : "1 mio. IE × 4"} dagligt i ${dage}${menneske && inficeret ? " — tillæg metronidazol 500 mg × 3" : ""}`, note: "Region Hovedstaden (2025).", tag: "Anbefalet", rec: true }];
      rows.push({ key: "amoxclav-bid", navn: "Amoxicillin med clavulansyre", dosering: `500/125 mg × 3 dagligt i ${dage}`, note: "Lægehåndbogen — dækker også Pasteurella, stafylokokker og anaerober.", tag: "Alternativ", rec: false });
      return rows;
    }
    if (b.includes("inficeret")) {
      r = res("Inficeret bidsår: behandl i 10 dage", "box-green", "Rens og revidér såret; podning før behandling.");
      r.rows = regimer("10 dage", true);
      r.ab = true;
    } else if (hoejRisiko) {
      r = res("Højrisikobid: forebyggende antibiotika i 3 dage", "box-green", [dyr === "kat" ? "Kattebid giver dybe stiksår og inficeres ofte." : menneske ? "Menneskebid (også knoslag mod tænder) inficeres ofte." : "Hundebid med risikofaktorer.", "Rens grundigt; punktursår sutureres som regel ikke."]);
      r.rows = regimer("3 dage", false);
      r.ab = true;
    } else {
      r = res("Hundebid uden risikofaktorer: sårrens, ingen antibiotika", "box-blue", ["Grundig rens og skylning. Forebyggende antibiotika er ikke nødvendigt ved overfladiske hundebid uden for hænder, fødder, led og ansigt hos raske.", "Kontrol ved tegn på infektion."]);
    }
    if (s.allergi && r.ab) r.tekst.push("Penicillinallergi: makrolider alene dækker Pasteurella dårligt.");
    r.noter.push("Tetanus: vurdér vaccinationsstatus, og giv booster efter Statens Serum Instituts anbefalinger.");
    if (b.includes("udland")) r.noter.unshift("<strong>Rabies:</strong> dyrebid i udlandet eller flagermusbid — kontakt straks infektionsmedicinsk afdeling om rabiesprofylakse.");
    if (dyr === "menneske") r.noter.push("Menneskebid: overvej hepatitis B, hepatitis C og hiv efter situationen.");
    r.noter.push("Bid på hånd over led, sene- eller ledpåvirkning: henvis til håndkirurgisk vurdering.");
    r.sikkerhed.push("Kontakt straks ved rødme, hævelse, pus, feber eller røde stråler op ad armen/benet.");
    r.fund = [dyr === "hund" ? "hundebid" : dyr === "kat" ? "kattebid" : "menneskebid", b.includes("inficeret") && "tegn på infektion", b.includes("risiko") && "risikolokalisation/dybt sår", b.includes("immun") && "nedsat immunforsvar"].filter(Boolean).join(", ");
    return r;
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------

  function update() {
    const s = getState();
    const warn = [];
    if (!isNaN(s.alder) && s.alder > 110) warn.push("Alder virker usædvanlig — tjek indtastningen.");
    if (barn(s) && isNaN(s.vaegt)) warn.push("Angiv vægt — børn under 40 kg doseres efter vægt.");
    alderWarning.textContent = warn.join(" ");
    const r = alarm(s) || { erysipelas, cellulitis, impetigo, em, bid }[s.diag](s);
    last = { s, r };
    let html = box(r.cls, r.titel, r.tekst.map((t) => `<p>${t}</p>`).join(""));
    if (r.rows.length) {
      let body = drugTable(r.rows);
      if (barn(s)) body += "<p>Dosis til børn må aldrig overstige voksendosis. Tjek styrken på mikstur før udlevering.</p>";
      html += box(r.ab ? "box-green" : "box-blue", r.ab ? "Behandling" : "Hvis der behandles", body);
    }
    const noter = r.noter.slice();
    if (s.allergi && r.ab) noter.push("Penicillinallergi-mærkningen er ofte forkert. Ved tvivl: henvis til allergologisk udredning.");
    if (noter.length) html += box("box-blue", "Bemærk", ul(noter));
    if (r.sikkerhed.length) html += box("box-blue", "Sikkerhedsnet til patienten", ul(r.sikkerhed));
    html += collapsible(
      "box-blue",
      "Erysipelas eller cellulitis?",
      ul([
        "<strong>Erysipelas:</strong> skarpt afgrænset, hævet rødme med pludselig feber — streptokokker. Penicillin V.",
        "<strong>Cellulitis, sårinfektion og byld:</strong> mere diffus rødme, ofte med pus eller sår — oftest stafylokokker. Dicloxacillin; byld drænes.",
        "Tosidig rødme på underbenene er sjældent infektion — tænk staseeksem eller venøs insufficiens.",
        "Dyb venetrombose kan ligne cellulitis — overvej D-dimer eller ultralyd.",
      ])
    );
    html += `<p class="source-note">Region Hovedstaden og Region Midtjylland (2025), Sundhedsstyrelsen og Lægehåndbogen. Kontrollér dosis på <a href="https://pro.medicin.dk" target="_blank" rel="noopener">pro.medicin.dk</a>, og følg din regions vejledning.</p>`;
    ab.output.innerHTML = html;
  }

  function buildJournalNote() {
    const { s, r } = last;
    const lines = [`Hud-/bløddelsinfektion — ${DIAG[s.diag]} ${new Date().toLocaleDateString("da-DK")}`];
    const basis = [];
    if (!isNaN(s.alder)) basis.push(`${fmt(s.alder)} år`);
    if (!isNaN(s.vaegt)) basis.push(`${fmt(s.vaegt)} kg`);
    if (s.allergi) basis.push("penicillinallergi");
    if (s.gravid) basis.push("gravid");
    if (basis.length) lines.push(basis.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    if (r.fund) lines.push(`Fund: ${r.fund}.`);
    lines.push(`Vurdering: ${r.titel}.`);
    const plan = planLinjer();
    if (plan.length) plan.forEach((p) => lines.push(p));
    else lines.push(r.cls === "box-red" ? "Plan: akut henvisning/indlæggelse." : r.ab ? "Plan: antibiotika efter konference/resistensbestemmelse." : "Plan: ingen systemisk antibiotika.");
    if (r.sikkerhed.length) lines.push(`Informeret: ${r.sikkerhed[0]}`);
    return lines.join("\n");
  }

  // ---------------------------------------------------------------------
  // Udfyld fra journaltekst (../udfyld.js)
  // ---------------------------------------------------------------------

  if (window.Udfyld) {
    const chk = (name, value, r, label, on) => (r && r.status ? { type: "check", name, value, on: on === undefined ? r.status === "ja" : on, label, kilde: r.kilde } : null);
    Udfyld.init(
      (L) => {
        const u = [];
        const E = L.E;
        const diag = L.vaelg([
          { value: "em", staerk: `erythema? migrans|erytema migrans|em${E}(?=[^.;\\n]{0,40}(?:flåt|borreli|rødme|ring))|borreli|flåtbid|skovflåt|flåt`, svag: "ringformet rødme|vandrende rødme|ringformet udslæt" },
          // Ikke insektbid: "bidt af myg/hveps/flåt".
          { value: "bid", staerk: `hundebid|kattebid|menneskebid|dyrebid|bidsår|bidt${E}(?!\\s+af\\s+(?:en\\s+)?(?:myg|hveps|bi|insekt|flåt|skovflåt|loppe|væggelus|edderkop))|(?<!insekt|myg|hvepse|flåt)bid${E}(?!\\s+af\\s+(?:myg|hveps|insekt|flåt))` },
          { value: "impetigo", staerk: "impetigo|børnesår" },
          { value: "cellulitis", staerk: "cellulit|absces|byld|sårinfektion|inficeret sår|inficeret (?:fod)?sår|inficeret eksem|furunkel|paronyk\\w*|paronychi\\w*|neglebåndsbetændelse|diffus rødme omkring" },
          { value: "erysipelas", staerk: "erysipelas|rosen" },
        ]);
        const d = diag ? diag.value : "erysipelas";
        if (diag) {
          u.push({ type: "radio", name: "diag", value: d, label: "Problemstilling", kilde: diag.kilde });
          if (diag.flere) u.push({ type: "note", tekst: `Flere problemstillinger nævnt (${diag.flere.join(", ")}) — ${d} er valgt. Skift, hvis det er forkert.` });
        } else u.push({ type: "note", tekst: "Problemstillingen kunne ikke genkendes — vælg den selv." });
        const a = L.alder();
        if (a) u.push({ type: "num", id: "alder", v: a.v, label: "Alder (år)", kilde: a.kilde, note: a.note });
        const w = L.vaegt();
        if (w) u.push({ type: "num", id: "vaegt", v: w.v, label: "Vægt (kg)", kilde: w.kilde });
        u.push(chk("andet", "allergi", L.allergi(), "Penicillinallergi"));
        u.push(chk("andet", "gravid", L.gravid(), "Gravid"));
        const sep = L.term("septisk|sepsis|påvirket almentilstand|almentilstand\\s*[:=]?\\s*(?:let |lettere |moderat |svært |tydeligt )?påvirket|at\\s*[:=]?\\s*(?:let |lettere |moderat |svært )?påvirket|almen påvirket|almenpåvirket|medtaget|kulderystelser|konfus");
        // "Kulderystelser i går … Upåvirket": det seneste udsagn om almentilstand gælder.
        const upaav = L.term("upåvirket|alment upåvirket|ikke påvirket|god almentilstand");
        if (sep.status === "ja" && !(upaav.status === "ja" && upaav.index > sep.index && /kulderystelser/.test(sep.kilde.toLowerCase()))) u.push(chk("rf", "sepsis", sep, "Påvirket almentilstand"));
        else if (sep.status === "ja") u.push({ type: "note", tekst: `Kulderystelser nævnt ("${sep.kilde}"), men også "${upaav.kilde}" — markér selv "Påvirket almentilstand", hvis det gælder.` });
        // Krepitation kun i huden/underhuden — ikke ved lungestetoskopi.
        const nek = L.term(`nekros|nekrot|subkutan krepitation|krepitation (?:i|af) (?:huden|underhuden|vævet)|luft i (?:vævet|underhuden)|smerter ude af proportion|voldsomme smerter|bullae|bulla${E}|bulløs|blærer${E}|blæredannelse|hurtigt (?:progredierende|tiltagende)|hurtig spredning|progredierende trods`);
        if (nek.status === "ja") u.push(chk("rf", "nekrose", nek, "Tegn på nekrotiserende infektion"));
        const ans = L.term("periorbital|orbital|omkring (?:\\w+ )?øjet|øjenlåg|ved øjet|i ansigtet|ansigts\\w*|faciei");
        if (ans.status === "ja") u.push(chk("rf", "ansigt", ans, "Periorbital/ansigt"));
        if (d === "cellulitis") {
          // Byld/absces afkrydses — men ikke, når den udtrykkeligt ikke er fluktuerende ("Byld, ikke fluktuerende endnu").
          const fluk = L.term("fluktuer\\w*");
          const abs = fluk.status ? fluk : L.term("absces|byld");
          if (abs.status === "ja") u.push(chk("cell", "absces", abs, "Byld"));
          const om = L.term("omgivende rødme|cellulit|lymfangit");
          const feber = L.feber();
          if (om.status === "ja") u.push(chk("cell", "omgiv", om, "Omgivende rødme/feber"));
          else if (feber.status === "ja") u.push(chk("cell", "omgiv", feber, "Omgivende rødme/feber"));
        }
        if (d === "impetigo") {
          const ud = L.term("udbredt|mange elementer|flere steder|spredt|generaliseret|ingen effekt af");
          const lok = L.term("lokaliseret|få elementer|enkelt element|enkelte elementer");
          if (ud.status === "ja") u.push({ type: "radio", name: "udbred", value: "udbredt", label: "Udbredning", kilde: ud.kilde });
          else if (lok.status === "ja") u.push({ type: "radio", name: "udbred", value: "lokal", label: "Udbredning", kilde: lok.kilde });
        }
        if (d === "bid") {
          const dyr = L.vaelg([
            { value: "menneske", staerk: "menneskebid|menneske|knytnæve|knoslag" },
            { value: "kat", staerk: `kattebid|kat${E}|katte` },
            { value: "hund", staerk: `hundebid|hund(?:en|e|ene)?${E}|hvalp\\w*|schæfer|labrador|terrier|puddel|golden retriever|rottweiler|chihuahua|gravhund` },
          ]);
          if (dyr) u.push({ type: "radio", name: "dyr", value: dyr.value, label: "Bidt af", kilde: dyr.kilde });
          const inf = L.term(`inficeret|pus${E}|purulent|lymfangit|rødme og hævelse|hævelse og rødme`);
          if (inf.status === "ja") u.push(chk("bid", "inficeret", inf, "Tegn på infektion"));
          const ris = L.term(`(?<!egen |på egen )hånd(?:en|led|ryg)?${E}|fingre?${E}|fingeren|fod(?:en)?${E}|fødder|(?:over|i|ved|nær) (?:et )?led${E}|ledet${E}|ansigt|dybt|punktur|kønsorgan`);
          if (ris.status === "ja") u.push(chk("bid", "risiko", ris, "Risikolokalisation/dybt sår"));
          const imm = L.term("diabetes|immunsuppr|miltløs|splenektom|levercirrose", { familie: true });
          if (imm.status === "ja") u.push(chk("bid", "immun", imm, "Nedsat immunforsvar"));
          const udl = L.term("udlandet|rabies|flagermus");
          if (udl.status === "ja") u.push(chk("bid", "udland", udl, "Udland/flagermus (rabies)"));
        }
        return u;
      },
      { vigtige: [["diag", "problemstilling"], ["alder", "alder"]], eksempel: "Fx: 58-årig mand med skarpt afgrænset rødme på højre underben siden i går, feber 38,7. Ikke påvirket. Fodsvamp. Penicillinallergi: nej." }
    );
  }

  update();
})();
