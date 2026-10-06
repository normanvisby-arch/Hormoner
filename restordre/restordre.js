/*
 * Restordre — alternativer: 1) restordre.dk og de officielle kilder, 2) samme
 * indholdsstof (synonym, styrke, form), 3) andet stof i samme gruppe.
 * Søgningen dækker både de detaljerede grupper med ækvivalente doser (data.js)
 * og registeret over indholdsstoffer i ATC-grupper (register.js).
 */
(function () {
  "use strict";

  const G = window.RESTORDRE_GRUPPER;
  const ATC = window.RESTORDRE_ATC;
  const form = document.querySelector(".form-panel");
  const soeg = document.getElementById("soeg");
  const dosis = document.getElementById("dosis");
  const dosisFelt = document.getElementById("dosisFelt");
  const valgFelt = document.getElementById("valgFelt");
  const valgListe = document.getElementById("valgListe");
  const output = document.getElementById("output");

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const B = "(?<![a-zæøå0-9])";
  const E = "(?![a-zæøå0-9])";
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Links til de andre værktøjer: slås op i #linkKort, så claude.ai-versionen bruger artifact-adresser
  // (og åbner dem i en ny fane).
  const lenke = (sti, tekst) => {
    const a = document.querySelector(`#linkKort a[data-sti="${sti}"]`);
    const href = a ? a.getAttribute("href") : sti;
    const ny = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${esc(href)}"${ny}>${tekst}</a>`;
  };
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const stor = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Officielle kilder. restordre.dk har ingen kendt søge-adresse, så søgeordet kopieres.
  const RESTORDRE_DK = "https://restordre.dk/";
  const PROMEDICIN = (s) => `https://pro.medicin.dk/Search/Search/Search/${encodeURIComponent(s)}`;
  const LMST_FORSYNING = "https://laegemiddelstyrelsen.dk/da/godkendelse/kontrol-og-inspektion/mangel-paa-medicin/meddelelser-om-forsyning-af-medicin/";
  const LMST_UDLEVERING = "https://laegemiddelstyrelsen.dk/da/godkendelse/udleveringstilladelser/";
  const REGIONER = [
    ["Hovedstaden", "https://www.sundhed.dk/sundhedsfaglig/information-til-praksis/hovedstaden/almen-praksis/regionalt/konsulenthjaelp-til-praksis/medicinfunktionen/andre-links/restordrer/"],
    ["Sjælland", "https://www.sundhed.dk/sundhedsfaglig/information-til-praksis/sjaelland/almen-praksis/patientbehandling/laegemidler/medicin-i-restordre/"],
    ["Syddanmark", "https://www.sundhed.dk/sundhedsfaglig/information-til-praksis/syddanmark/almen-praksis/patientbehandling/laegemidler/udleveringstilladelser-og-restordre/"],
    ["Nordjylland", "https://www.sundhed.dk/sundhedsfaglig/information-til-praksis/nordjylland/almen-praksis/patientbehandling/laegemidler/restordre/"],
  ];

  // ATC-grupper med en detaljeret ækvivalenstabel i data.js.
  const DETALJE_ATC = { C09AA: "ace", C09CA: "arb", C08CA: "ccb", C07AB: "bb", C07AG: "bb", C03AA: "thiazid", C03BA: "thiazid", C03CA: "loop", C10AA: "statin", B01AF: "doak", B01AE: "doak", A10BJ: "glp1", A10BK: "sglt2", A10BH: "dpp4", A10BA: "metformin", A02BC: "ppi", R03AC: "saba", R03BA: "ics", R03BB: "lama", N06AB: "ssri", N02CC: "triptan", N02AA: "opioid", N02AX: "opioid", R05DA: "opioid", R06AE: "antihist", R06AX: "antihist", C01CA: "adrenalin", H02AB: "steroid", N03AX: "gabapentinoid", G03CA: ["oestrogen", "lokalOestrogen"], G03DA: "gestagen", G03AA: "ppiller", G03AC: "ppiller", H03AA: "levothyroxin", M05BA: "osteoporose", M05BX: "osteoporose", J01CE: "penicillin", J01CA: "uvi", J01XE: "uvi", J01EA: "uvi", J01EB: "uvi" };

  // ---------------------------------------------------------------- Søgeindeks
  // Detaljerede stoffer (data.js).
  const DETALJER = [];
  // Kun rene ord bruges til "begyndelsen af et navn" (ikke regex-stykker eller "a/b + c").
  const rent = (n) => /^[a-zæøå0-9 .,()-]+$/.test(n);
  G.forEach((g) => g.stoffer.forEach((s) => DETALJER.push({ type: "detalje", g, s, re: new RegExp(`${B}(?:${s.soeg})`), ord: [s.navn.toLowerCase(), ...s.soeg.split("|")].filter(rent) })));
  // Registeret (register.js) — stoffer, der også har en detaljeret tabel, springes over.
  const REGISTER = window.RESTORDRE_REGISTER.trim()
    .split("\n")
    .map((l) => {
      const [atc, stof, navne] = l.split("|");
      const handels = navne ? navne.split(";").filter(Boolean) : [];
      const kerne = stof.replace(/\s*\(.*?\)\s*/g, " ").trim();
      return { type: "register", atc, stof, kerne, handels, ord: [stof.toLowerCase(), kerne.toLowerCase(), ...handels.map((h) => h.toLowerCase())] };
    });
  // Brede ATC-grupper, hvor en tabel kun dækker enkelte stoffer (link vises kun via gruppe-bemærkningen).
  const BRED = new Set(["N03AX", "R03AC"]);
  const iGruppe = (atc, id) => [].concat(DETALJE_ATC[atc] || []).includes(id);
  const detaljeFor = (r) => DETALJER.find((d) => iGruppe(r.atc, d.g.id) && r.ord.some((o) => d.re.test(o)));
  REGISTER.forEach((r) => (r.detalje = detaljeFor(r) || null));
  const INDEKS = [...DETALJER, ...REGISTER.filter((r) => !r.detalje)];

  document.getElementById("forslagListe").innerHTML = [...new Set(INDEKS.flatMap((x) => (x.type === "register" ? [x.kerne, ...x.handels] : [x.s.navn, ...x.ord.slice(1)])).map(stor))]
    .sort((a, b) => a.localeCompare(b, "da"))
    .map((o) => `<option value="${esc(o)}">`)
    .join("");
  document.getElementById("gruppeListe").innerHTML = G.map((g) => `<li><a href="#" data-gruppe="${esc(g.id)}">${esc(g.navn)}</a> <span class="field-hint">${esc(g.kategori)}</span></li>`).join("");
  const antal = document.getElementById("antalStoffer");
  if (antal) antal.textContent = String(INDEKS.length);

  // Find: hele ord i søgeteksten eller begyndelsen af et navn (mindst 3 tegn). Eksakte træf vinder.
  function find(tekst) {
    const t = tekst.trim().toLowerCase().replace(/\s+/g, " ");
    if (t.length < 3) return [];
    const eksakt = [];
    const del = [];
    INDEKS.forEach((x) => {
      if (x.ord.some((o) => o === t)) eksakt.push(x);
      else if ((x.type === "detalje" && x.re.test(t)) || x.ord.some((o) => o.startsWith(t) || new RegExp(`${B}${reEsc(o)}${E}`).test(t))) del.push(x);
    });
    // Kombinationspræparat skrevet som "losartan/hydrochlorthiazid" eller "a + b": vis det første stof
    // (advarslen om det andet indholdsstof vises i resultatet).
    if (!eksakt.length && del.length > 1 && /[\/+]/.test(t)) {
      const foerste = find(t.split(/[\/+]/)[0]);
      if (foerste.length === 1) return foerste;
    }
    return eksakt.length ? eksakt : del;
  }
  const navnPaa = (h) => (h.type === "detalje" ? h.s.navn : stor(h.stof));
  const gruppePaa = (h) => (h.type === "detalje" ? h.g.navn : ATC[h.atc]);

  let valgt = null;
  let valgtAlt = null;
  let ventendeDosis = null;

  function vaelg(hit) {
    valgt = hit;
    valgtAlt = null;
    valgFelt.hidden = true;
    const r = hit.type === "detalje" && hit.g.raekker;
    dosisFelt.hidden = !r;
    if (r) dosis.innerHTML = `<option value="">Ukendt</option>` + r.map((x, i) => `<option value="${i}">${esc(x.niveau)} — ${esc(x.doser[hit.s.id])}</option>`).join("");
    // Dosis fra indsat journaltekst: vælg rækken med netop den dosis (kun ved ét entydigt match).
    if (r && ventendeDosis) {
      const re = new RegExp(`(?<![\\d,])${ventendeDosis.tal}\\s*${ventendeDosis.enhed}(?![a-zæøå])`, "i");
      const match = r.map((x, i) => (re.test(String(x.doser[hit.s.id])) ? i : -1)).filter((i) => i >= 0);
      if (match.length === 1) dosis.value = String(match[0]);
    }
    ventendeDosis = null;
    vis();
  }

  function laes() {
    const hits = find(soeg.value);
    // Samme præparat som allerede valgt (fx når feltet mister fokus): gør intet — en ny tegning
    // ville fjerne det link eller den knap, lægen er ved at klikke på.
    // Ændret tekst (fx "Losartan comp" → "Losartan"): tegn igen, men behold dosis og valg.
    if (hits.length === 1 && valgt && valgt === hits[0]) {
      if (soeg.value !== sidstTegnet) vis();
      return;
    }
    if (hits.length === 1) return vaelg(hits[0]);
    valgt = null;
    dosisFelt.hidden = true;
    if (hits.length > 1) {
      valgFelt.hidden = false;
      valgListe.innerHTML = hits.slice(0, 12).map((h, i) => `<button type="button" class="btn btn-outline btn-small" data-hit="${i}">${esc(navnPaa(h))} <span class="field-hint">(${esc(gruppePaa(h))})</span></button>`).join(" ");
      valgListe.onclick = (e) => {
        const b = e.target.closest("[data-hit]");
        if (b) vaelg(hits[+b.dataset.hit]);
      };
      output.innerHTML = `<p class="field-hint">Flere præparater passer til "${esc(soeg.value.trim())}" — vælg til venstre.</p>`;
      return;
    }
    valgFelt.hidden = true;
    const navn = soeg.value.trim();
    output.innerHTML =
      navn.length >= 3
        ? box(
            "box-amber",
            "Præparatet findes ikke i værktøjets register",
            `<p>Registeret dækker de mest brugte indholdsstoffer og handelsnavne — ikke alle præparater. Skriv <strong>indholdsstoffet</strong> (det står på pakningen og recepten), eller slå navnet op på <a href="${PROMEDICIN(navn)}" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`
          ) + restordreBoks(navn) + samme(null)
        : `<p class="field-hint">Skriv navnet på præparatet i restordre.</p>`;
  }

  function restordreBoks(navn) {
    return box(
      "box-blue",
      "1. Tjek restordre.dk først",
      `<p>Restordre.dk viser, hvad der kan skaffes i dag, og apotekets vurderede alternativer.</p>
      <div class="output-actions">
        <a class="btn btn-primary" href="${RESTORDRE_DK}" target="_blank" rel="noopener" id="restordreLink">Åbn restordre.dk</a>
        <button type="button" class="btn btn-outline" id="kopierNavn">Kopiér "${esc(navn)}" til søgning</button>
        <span class="copy-status" id="navnStatus" aria-live="polite"></span>
      </div>
      <p class="field-hint">"Åbn restordre.dk" kopierer også "${esc(navn)}", så du blot skal sætte det ind i søgefeltet.</p>
      <p class="field-hint">Også: <a href="${PROMEDICIN(navn)}" target="_blank" rel="noopener">pro.medicin.dk</a> (præparater med samme indholdsstof) · <a href="${LMST_FORSYNING}" target="_blank" rel="noopener">Lægemiddelstyrelsen: forsyning af medicin</a> · regionernes restordre-sider: ${REGIONER.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join(", ")}.</p>`
    );
  }

  function samme(ekstra) {
    const punkter = [
      "Spørg apoteket om et <strong>synonympræparat</strong> (samme indholdsstof, styrke og form fra et andet firma eller parallelimport) — det kan udleveres uden ny recept.",
      "<strong>Anden styrke eller form</strong> — og ofte en anden pakningsstørrelse — kræver som udgangspunkt en ny recept.",
    ];
    if (ekstra) punkter.push(ekstra);
    punkter.push(`Findes intet markedsført alternativ, kan Lægemiddelstyrelsen give <a href="${LMST_UDLEVERING}" target="_blank" rel="noopener">udleveringstilladelse</a> til et udenlandsk præparat — som national tilladelse eller efter lægens ansøgning.`);
    return box("box-green", "2. Samme indholdsstof", ul(punkter));
  }

  // ---------------------------------------------------------------- Detaljeret gruppe
  function tabel(g, s, rk) {
    const cols = g.stoffer;
    const head = `<tr><th>Dosisniveau</th>${cols
      .map((c) => (c.id === s.id ? `<th class="rest-col">${esc(c.navn)}<br><span class="tag tag-warn">I restordre</span></th>` : `<th>${esc(c.navn)}<br><label class="valg-radio"><input type="radio" name="alt" value="${esc(c.id)}"${valgtAlt === c.id ? " checked" : ""}> Vælg til journal</label></th>`))
      .join("")}</tr>`;
    const rows = g.raekker
      .map((r, i) => `<tr${i === rk ? ' class="row-highlight"' : ""}><td>${esc(r.niveau)}</td>${cols.map((c) => `<td${c.id === s.id ? ' class="rest-col"' : ""}>${esc(r.doser[c.id])}</td>`).join("")}</tr>`)
      .join("");
    return `<div class="drug-table-wrap"><table class="drug-table rest-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }

  function alternativer(g, s, rk) {
    let body = "";
    if (g.raekker && g.stoffer.length > 1) {
      body += tabel(g, s, rk);
      if (rk !== null) body += `<p class="field-hint">Markeret række = nuværende dosis (${esc(g.raekker[rk].niveau.toLowerCase())}).</p>`;
    } else if (g.raekker) {
      body += `<p>${g.raekker.map((r) => `${esc(r.niveau)}: ${esc(r.doser[s.id])}`).join("<br>")}</p>`;
    }
    if (g.tabelNote) body += `<p class="field-hint">${esc(g.tabelNote)}</p>`;
    if (g.forslag) body += ul(g.forslag.map(esc));
    return box("box-amber", g.forslag && !g.raekker ? `3. Alternativer — ${esc(g.navn)}` : `3. Andet præparat i samme gruppe — ${esc(g.navn)}`, body);
  }

  function skift(g) {
    const punkter = (g.skift || []).map(esc);
    const link = g.link ? `<p>${lenke(g.link.href, `${esc(g.link.tekst)} →`)}</p>` : "";
    const kilder = `<p class="field-hint">Kilder: ${g.kilder.map(esc).join(" · ")}</p>`;
    return punkter.length || link ? box("", "Sådan skiftes", (punkter.length ? ul(punkter) : "") + link + kilder) : box("", "Kilder", kilder);
  }

  // ---------------------------------------------------------------- Register (ATC-gruppe)
  const ligesom = (r) => REGISTER.filter((x) => x.atc === r.atc && x !== r);

  function registerAlternativer(r) {
    const note = (window.RESTORDRE_ATC_NOTE || {})[r.atc];
    // Nogle ATC-grupper samler stoffer, der ikke kan erstatte hinanden (fx amoxicillin og pivmecillinam).
    const andre = note && note.skjulListe ? [] : ligesom(r);
    const g = G.find((x) => iGruppe(r.atc, x.id));
    let body = `<p><strong>ATC-gruppe ${esc(r.atc)}:</strong> ${esc(ATC[r.atc])}.</p>`;
    if (andre.length) {
      body += `<ul class="followup-list rest-liste">${andre
        .map(
          (x) =>
            `<li><label class="valg-radio rest-valg"><input type="radio" name="alt" value="${esc(x.stof)}"${valgtAlt === x.stof ? " checked" : ""}> <strong>${esc(stor(x.stof))}</strong></label>${x.handels.length ? ` <span class="field-hint">(${esc(x.handels.join(", "))})</span>` : ""} · <a href="${PROMEDICIN(x.kerne)}" target="_blank" rel="noopener">pro.medicin.dk</a>${x.detalje ? ` · <a href="#" data-detalje="${esc(x.stof)}">ækvivalente doser</a>` : ""}</li>`
        )
        .join("")}</ul>`;
      body += `<p class="field-hint">Stoffer i samme ATC-gruppe er ikke nødvendigvis ligeværdige — indikation, dosis, bivirkninger og interaktioner skal vurderes, og dosis findes i produktresuméet. Registeret siger ikke, om et stof er markedsført eller kan skaffes.</p>`;
    } else if (!(note && note.skjulListe)) {
      body += `<p>Der er ingen andre stoffer i samme ATC-gruppe i værktøjets register. Brug restordre.dk og apoteket, overvej udleveringstilladelse, eller konferér med speciallæge om behandlingsskift.</p>`;
    }
    // Gruppe-bemærkning (brede grupper, specialistbehandling) og evt. relevant tabel.
    if (note) body = `<p class="rest-note"><strong>Bemærk:</strong> ${esc(note.tekst)}</p>` + body;
    const relevant = note && note.gruppe ? G.find((x) => x.id === note.gruppe) : !BRED.has(r.atc) ? g : null;
    if (relevant) body += `<p><a href="#" data-gruppe-vis="${esc(relevant.id)}">Se ækvivalente doser for ${esc(relevant.navn.toLowerCase())} →</a></p>`;
    return box("box-amber", "3. Andre stoffer i samme gruppe", body);
  }

  // ---------------------------------------------------------------- Visning og notat
  function notat() {
    const idag = new Date().toLocaleDateString("da-DK");
    if (valgt.type === "register") {
      const r = valgt;
      const linjer = [`${stor(r.stof)} i restordre (restordre.dk tjekket ${idag}).`];
      const skjul = ((window.RESTORDRE_ATC_NOTE || {})[r.atc] || {}).skjulListe;
      linjer.push(valgtAlt ? `Skiftet til ${stor(valgtAlt)} — dosis efter produktresumé.` : skjul ? "Alternativ: [skriv selv]." : "Alternativ: [vælg i listen eller skriv selv].");
      return linjer.join("\n");
    }
    const { g, s } = valgt;
    const rk = dosis.value === "" ? null : +dosis.value;
    const alt = valgtAlt && g.stoffer.find((c) => c.id === valgtAlt);
    const linjer = [`${s.navn}${rk !== null && g.raekker ? ` ${g.raekker[rk].doser[s.id]}` : ""} i restordre (restordre.dk tjekket ${idag}).`];
    const altDosis = alt && rk !== null && g.raekker ? g.raekker[rk].doser[alt.id] : "";
    if (alt && g.egneKriterier) linjer.push(`Skiftet til ${alt.navn} — dosis efter præparatets egne kriterier (alder, vægt, nyrefunktion, interaktioner; ved atrieflimren: se Atrieflimren-værktøjet).`);
    else if (alt && g.notatForm === "opioid") linjer.push(`Skiftet til ${alt.navn}${altDosis ? `: beregnet ækvivalent døgndosis ${altDosis} — startdosis 50–75 % heraf + p.n.-dosis` : " — dosis: start med 50–75 % af den beregnede ækvivalente døgndosis + p.n.-dosis"}.`);
    else if (alt && g.notatForm === "optrap") linjer.push(`Skiftet til ${alt.navn}${altDosis ? ` (omtrentlig ækvivalent dosis ${altDosis})` : ""} — startes på lav vedligeholdelsesdosis og optrappes.`);
    else if (alt) linjer.push(`Skiftet til ${alt.navn}${altDosis ? ` ${altDosis}` : ""} — ${g.id === "gabapentinoid" ? "omtrent ækvivalent dosis" : "vejledende ækvivalent dosis"}.`);
    else linjer.push(g.raekker && g.stoffer.length > 1 ? "Alternativ: [vælg i tabellen eller skriv selv]." : "Alternativ: [skriv selv].");
    const kontrol = g.plan || (g.skift || []).find((x) => /kontrollér|kontrol|følg|opfølgning/i.test(x)) || (g.forslag || []).find((x) => /kontrollér|kontrol|følg|opfølgning/i.test(x));
    if (kontrol) linjer.push(`Plan: ${kontrol}`);
    return linjer.join("\n");
  }

  const notatBoks = () =>
    box(
      "",
      "Journalnotat",
      `<pre class="notat-tekst" id="journalTekst">${esc(notat())}</pre>
      <div class="output-actions"><button type="button" class="btn btn-primary" id="kopierNotat">Kopiér notat</button><span class="copy-status" id="notatStatus" aria-live="polite"></span></div>`
    );

  let sidstTegnet = null;
  function vis() {
    if (!valgt) return;
    sidstTegnet = soeg.value;
    const soegeord = soeg.value.trim() || navnPaa(valgt);
    if (valgt.type === "register") {
      const r = valgt;
      const handels = r.handels.length ? `Kendte handelsnavne for ${esc(r.stof)}: ${esc(r.handels.join(", "))} (tjek udbud på <a href="${PROMEDICIN(r.kerne)}" target="_blank" rel="noopener">pro.medicin.dk</a>).` : `Se præparater med ${esc(r.stof)} på <a href="${PROMEDICIN(r.kerne)}" target="_blank" rel="noopener">pro.medicin.dk</a>.`;
      output.innerHTML = restordreBoks(soegeord) + samme(handels) + registerAlternativer(r) + notatBoks();
      return;
    }
    const { g, s } = valgt;
    const rk = dosis.value === "" ? null : +dosis.value;
    // Kombinationspræparat ("Losartan Comp", "… plus", "a + b"), der kun er fundet som enkeltstof.
    const kombi = /(?:^|[^a-zæøå])(?:comp|plus|duo|hct|forte comp)(?![a-zæøå])|\+|[a-zæøå]\s*\/\s*[a-zæøå]/i.test(soeg.value)
      ? box("box-red", "Kombinationspræparat?", `<p>Søgningen ligner et kombinationspræparat, men værktøjet fandt kun enkeltstoffet <strong>${esc(s.navn)}</strong>. Tabellen gælder kun dette stof — det andet indholdsstof (fx hydrochlorthiazid) skal fortsat gives, fx som separat tablet. Tjek indholdsstofferne på pakningen eller <a href="${PROMEDICIN(soeg.value.trim())}" target="_blank" rel="noopener">pro.medicin.dk</a>.</p>`)
      : "";
    output.innerHTML = kombi + restordreBoks(soegeord) + samme(s.samme ? esc(s.samme) : null) + alternativer(g, s, rk) + skift(g) + notatBoks();
  }

  function kopier(tekst, status) {
    const el = document.getElementById(status);
    const ok = () => el && (el.textContent = "Kopieret ✓");
    const fejl = () => el && (el.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.");
    try {
      navigator.clipboard.writeText(tekst).then(ok, fejl);
    } catch (e) {
      fejl();
    }
  }

  function visGruppe(g, s) {
    soeg.value = s.navn;
    vaelg(DETALJER.find((d) => d.g === g && d.s === s));
  }

  output.addEventListener("click", (e) => {
    // restordre.dk viser præparaterne under handelsnavn — kopiér det, lægen har skrevet.
    // "Åbn restordre.dk" kopierer også navnet — ét klik i stedet for to. Linket åbner som normalt.
    if (e.target.id === "kopierNavn" || e.target.id === "restordreLink") kopier(soeg.value.trim() || (valgt ? navnPaa(valgt) : ""), "navnStatus");
    if (e.target.id === "kopierNotat") kopier(document.getElementById("journalTekst").textContent, "notatStatus");
    const d = e.target.closest("[data-detalje]");
    if (d) {
      e.preventDefault();
      const r = REGISTER.find((x) => x.stof === d.dataset.detalje);
      if (r && r.detalje) visGruppe(r.detalje.g, r.detalje.s);
    }
    const gv = e.target.closest("[data-gruppe-vis]");
    if (gv) {
      e.preventDefault();
      const g = G.find((x) => x.id === gv.dataset.gruppeVis);
      visGruppe(g, g.stoffer[0]);
    }
  });
  output.addEventListener("change", (e) => {
    if (e.target.name === "alt") {
      valgtAlt = e.target.value;
      document.getElementById("journalTekst").textContent = notat();
    }
  });
  soeg.addEventListener("input", laes);
  form.addEventListener("change", (e) => {
    if (e.target === dosis) vis();
    // Også når "Udfyld fra journaltekst" har sat navnet (hændelsen kommer da fra formularen).
    else if (e.target === soeg || e.target === form) laes();
  });
  document.getElementById("gruppeListe").addEventListener("click", (e) => {
    const a = e.target.closest("[data-gruppe]");
    if (!a) return;
    e.preventDefault();
    const g = G.find((x) => x.id === a.dataset.gruppe);
    visGruppe(g, g.stoffer[0]);
    document.getElementById("alleGrupper").open = false;
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    form.reset();
    valgt = null;
    valgtAlt = null;
    dosisFelt.hidden = true;
    valgFelt.hidden = true;
    output.innerHTML = `<p class="field-hint">Skriv navnet på præparatet i restordre.</p>`;
  });
  const printBtn = document.getElementById("printBtn");
  if (printBtn) printBtn.addEventListener("click", () => window.print());

  // Handelsnavne, der også er almindelige ord ("husk at …"), bruges ikke til at finde præparatet i fri tekst.
  const ALMINDELIGE = new Set(["husk", "magnesia", "nix", "treo"]);

  // Udfyld fra journaltekst / Notat-indgangen: find præparatet — helst det, der nævnes tættest på "restordre".
  if (window.Udfyld) {
    Udfyld.init(
      (L) => {
        const t = L.lav;
        const rm = t.match(/restordre|restnoter|kan ikke (?:skaffes|leveres|levere|fås|få fat i|udleveres)|ikke kan (?:skaffes|leveres|levere)|ikke til at (?:skaffe|få)|ikke på lager|udsolgt|forsyningsvanskelig|forsyningssvigt|forsyningsproblem|leveringssvigt|leveringsproblem|udgået|mangel på|mangler på apoteket|apoteket mangler/);
        const r = rm ? rm.index : -1;
        const rSlut = rm ? rm.index + rm[0].length : -1;
        let bedst = null;
        INDEKS.forEach((x) => {
          const monster = x.type === "detalje" ? x.s.soeg : x.ord.filter((o) => o.length >= 4 && !ALMINDELIGE.has(o)).map(reEsc).join("|");
          if (!monster) return;
          L.alle(new RegExp(`${B}(?:${monster})${E}`, "g")).forEach((m) => {
            // Afstand til udløseren — fra navnets slutning, når navnet står før ("Ozempic er i restordre").
            const slut = m.index + m[0].length;
            const fra = Math.min(slut, r);
            const til = Math.max(m.index, rSlut);
            const afstand = r < 0 ? m.index : (slut <= r ? r - slut : Math.max(0, m.index - rSlut)) + (/[.;\n]/.test(t.slice(fra, til)) ? 100 : 0);
            if (!bedst || afstand < bedst.afstand) bedst = { afstand, m };
          });
        });
        if (!bedst) return [{ type: "note", tekst: "Intet præparat fra værktøjets register blev fundet i teksten — skriv navnet selv." }];
        let i0 = bedst.m.index;
        let i1 = bedst.m.index + bedst.m[0].length;
        // Kombinationspræparat: "Losartan comp", "Losartan/hydrochlorthiazid", "Atacand Plus" — hele navnet
        // bevares, så advarslen om det andet indholdsstof vises.
        const efter = t.slice(i1).match(/^\s*(?:-\s*)?(?:comp|plus|hct|duo|forte comp)(?![a-zæøå])|^\s*\/\s*[a-zæøå][a-zæøå-]+/);
        const foer = t.slice(0, i0).match(/[a-zæøå][a-zæøå-]+\s*\/\s*$/);
        if (efter) i1 += efter[0].length;
        if (foer) i0 -= foer[0].length;
        const navn = L.tekst.slice(i0, i1).replace(/\s+/g, " ");
        // Dosis lige efter navnet ("Ozempic 1 mg", "Eltroxin 50 mikrog"): vælges i dosislisten, hvis den findes.
        const d = t.slice(i1, i1 + 40).match(/^\s*(?:[a-zæøå]+\s+){0,2}?(\d+(?:[.,]\d+)?)(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(mg|mikrog|µg|mcg|ie|g)(?![a-zæøå])/);
        ventendeDosis = d && !foer && !efter ? { tal: d[1].replace(".", ","), enhed: d[2] === "µg" || d[2] === "mcg" ? "mikrog" : d[2] } : null;
        return [{ type: "tekst", id: "soeg", v: stor(navn), label: "Præparat i restordre", kilde: L.kilde(i0, i1) }];
      },
      { vigtige: [["soeg", "præparat"]], eksempel: "Fx: Ozempic 1 mg er i restordre. Type 2-diabetes, HbA1c 58." }
    );
  }
})();
