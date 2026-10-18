/*
 * Helingsforløbet ved diskusprolaps — pædagogisk animation til patientinformation.
 * Tidslinjen (uge 0–26) styrer prolapsens størrelse og de tre biologiske mekanismer
 * (inflammation med makrofager, udtørring, tilbagetrækning) samt arvæv i annulus. 3D-visningen
 * (visning.js) tegner tilstanden; denne fil beregner kurverne og styrer panel og graf.
 *
 * Kurverne er skematiske og bygger på: spontan tilbagedannelse hos 96 % af sekvestre, 70 % af
 * ekstrusioner, 41 % af protrusioner og 13 % af bulging (Chiu 2015); tilbagedannelse ses tydeligt
 * på MR fra ca. 2 måneder og fortsætter over et år; smerten aftager med en halveringstid på ca.
 * 6–7 uger, men følger ikke prolapsens størrelse tæt (Benson 2010).
 */
window.Heling = (function () {
  "use strict";

  const MAKS = 26;                        // uger på tidslinjen (6 måneder)
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Restgrad ved forløbets slutning (andel af prolapsen tilbage) — typisk forløb, ikke en garanti.
  const REST = { sekvester: 0.15, ekstrusion: 0.3, protrusion: 0.65 };
  const ANDEL = { sekvester: 96, ekstrusion: 70, protrusion: 41 };

  function kurver(t, type) {
    const rest = REST[type] ?? REST.protrusion;
    const tilbage = 0.85 * ss(3, 14, t) + 0.15 * ss(14, MAKS, t);
    return {
      storrelse: 1 - (1 - rest) * tilbage,                 // prolapsens størrelse (1 = ved debut)
      inflam: ss(0, 1, t) * (1 - ss(3, 12, t)),             // inflammation: kraftig de første uger
      makro: ss(1, 4, t) * (1 - ss(9, 15, t)),              // makrofager nedbryder materialet
      tor: ss(3, 12, t),                                    // udtørring af det udskudte materiale
      retr: ss(3, 6, t) * (1 - ss(10, 14, t)),              // tilbagetrækning (kan ske)
      ar: ss(10, 24, t),                                    // arvæv lukker sprækken i annulus
      smerte: t < 1 ? 1 : Math.exp((-Math.LN2 * (t - 1)) / 6.5), // typisk smerteforløb
    };
  }
  const fase = (t) => (t < 4 ? 1 : t < 12 ? 2 : 3);
  const FASER = {
    1: { navn: "Den akutte fase", tid: "Uge 1–4", tekst: "Kraftig inflammation. Immunforsvaret aktiveres. Smerterne er ofte høje på grund af kemisk irritation af nerven." },
    2: { navn: "Nedbrydningsfasen", tid: "Uge 4–12", tekst: "Makrofager nedbryder prolapsen. Materialet udtørrer og skrumper gradvist. Smerterne begynder at aftage." },
    3: { navn: "Stabiliseringsfasen", tid: "Måned 3–6+", tekst: "Sprækken i diskus' ydre ring (annulus fibrosus) danner arvæv og lukker sig. Rygsegmentet bliver mere stabilt." },
  };
  const tidTekst = (t) => {
    const u = Math.round(t);
    if (t < 8) return `Uge ${u}`;
    return `Uge ${u} · ca. ${String(Math.round((t / 4.35) * 2) / 2).replace(".", ",")} måneder`;
  };

  const $ = (id) => document.getElementById(id);
  const st = { t: 0, type: null, aktiv: false, spiller: false, sidst: 0, prolaps: null };

  // ---------------------------------------------------------------- graf (uge 0–26, 0–100 %)
  const G = { w: 600, h: 220, l: 40, r: 128, top: 26, bund: 32 };
  const gx = (t) => G.l + (t / MAKS) * (G.w - G.l - G.r);
  const gy = (v) => G.top + (1 - v) * (G.h - G.top - G.bund);
  const SERIER = [
    { k: "storrelse", navn: "Prolapsens størrelse", kl: "s1" },
    { k: "inflam", navn: "Inflammation", kl: "s2" },
    { k: "smerte", navn: "Typisk smerte", kl: "s3", stiplet: true },
  ];
  function tegnGraf() {
    const el = $("helGraf");
    if (!el || !st.type) return;
    const pts = (k) => Array.from({ length: 105 }, (_, i) => { const t = (i / 104) * MAKS; return `${gx(t).toFixed(1)},${gy(kurver(t, st.type)[k]).toFixed(1)}`; }).join(" ");
    const bands = [[0, 4, 1], [4, 12, 2], [12, MAKS, 3]].map(([a, b, f]) =>
      `<rect class="ryg-g-fase f${f}" x="${gx(a)}" y="${G.top}" width="${gx(b) - gx(a)}" height="${G.h - G.top - G.bund}"></rect><text class="ryg-g-fasenavn" x="${(gx(a) + gx(b)) / 2}" y="${G.top - 9}" text-anchor="middle">Fase ${f}</text>`).join("");
    const grid = [0, 0.5, 1].map((v) => `<line class="ryg-g-grid" x1="${G.l}" x2="${G.w - G.r}" y1="${gy(v)}" y2="${gy(v)}"></line><text class="ryg-g-akse" x="${G.l - 6}" y="${gy(v) + 4}" text-anchor="end">${Math.round(v * 100)} %</text>`).join("");
    const xt = [0, 4, 8, 12, 16, 20, 26].map((u) => `<text class="ryg-g-akse" x="${gx(u)}" y="${G.h - G.bund + 16}" text-anchor="middle">${u}</text>`).join("");
    const slut = kurver(MAKS, st.type);
    // Direkte etiketter ved linjernes slutning (flyttes fra hinanden, hvis de ligger tæt)
    const ys = SERIER.map((s) => ({ s, y: gy(slut[s.k]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ys.length; i++) if (ys[i].y - ys[i - 1].y < 13) ys[i].y = ys[i - 1].y + 13;
    const etik = ys.map(({ s, y }) => `<text class="ryg-g-etiket" x="${gx(MAKS) + 6}" y="${y + 4}">${s.navn}</text>`).join("");
    el.innerHTML = `<svg viewBox="0 0 ${G.w} ${G.h}" role="img" aria-label="Typisk forløb over 26 uger: prolapsens størrelse, inflammation og smerte">
      ${bands}${grid}<line class="ryg-g-base" x1="${G.l}" x2="${G.w - G.r}" y1="${gy(0)}" y2="${gy(0)}"></line>${xt}
      <text class="ryg-g-akse" x="${(G.l + G.w - G.r) / 2}" y="${G.h - 2}" text-anchor="middle">uger efter debut</text>
      ${SERIER.map((s) => `<polyline class="ryg-g-linje ${s.kl}${s.stiplet ? " stiplet" : ""}" points="${pts(s.k)}"></polyline>`).join("")}
      ${etik}
      <line id="helMarkoer" class="ryg-g-markoer" x1="0" x2="0" y1="${G.top}" y2="${G.h - G.bund}"></line>
      ${SERIER.map((s) => `<circle id="helPkt_${s.k}" class="ryg-g-pkt ${s.kl}" r="4"></circle>`).join("")}
      <rect class="ryg-g-hit" x="${G.l}" y="${G.top}" width="${G.w - G.l - G.r}" height="${G.h - G.top - G.bund}"></rect>
    </svg><div class="ryg-g-tip" id="helTip" hidden></div>`;
    const hit = el.querySelector(".ryg-g-hit");
    const tilT = (ev) => {
      const box = el.querySelector("svg").getBoundingClientRect();
      const x = ((ev.clientX - box.left) / box.width) * G.w;
      return Math.min(MAKS, Math.max(0, ((x - G.l) / (G.w - G.l - G.r)) * MAKS));
    };
    hit.addEventListener("pointermove", (ev) => visTip(tilT(ev), ev));
    hit.addEventListener("pointerleave", () => { $("helTip").hidden = true; });
    hit.addEventListener("click", (ev) => { stop(); saetTid(tilT(ev)); });
    markoer();
  }
  function visTip(t, ev) {
    const k = kurver(t, st.type), tip = $("helTip"), box = $("helGraf").getBoundingClientRect();
    tip.innerHTML = `<strong>${tidTekst(t)}</strong>${SERIER.map((s) => `<span><i class="ryg-g-nogle ${s.kl}${s.stiplet ? " stiplet" : ""}"></i>${s.navn}: ${Math.round(k[s.k] * 100)} %</span>`).join("")}`;
    tip.hidden = false;
    const x = ev.clientX - box.left;
    tip.style.left = Math.min(box.width - 180, Math.max(0, x + 12)) + "px";
  }
  function markoer() {
    const m = $("helMarkoer");
    if (!m) return;
    const x = gx(st.t), k = kurver(st.t, st.type);
    m.setAttribute("x1", x); m.setAttribute("x2", x);
    for (const s of SERIER) {
      const c = $("helPkt_" + s.k);
      c.setAttribute("cx", x); c.setAttribute("cy", gy(k[s.k]));
    }
  }

  // ---------------------------------------------------------------- panel
  function opdater() {
    const k = kurver(st.t, st.type);
    const f = fase(st.t);
    $("helTid").value = st.t;
    $("helTidTekst").textContent = tidTekst(st.t);
    document.querySelectorAll("#helFaser li").forEach((li) => li.classList.toggle("aktiv", Number(li.dataset.fase) === f));
    $("helFaseTekst").innerHTML = `<strong>${FASER[f].navn} (${FASER[f].tid}).</strong> ${FASER[f].tekst}`;
    const maal = { inflam: k.inflam, makro: k.makro, tor: k.tor, retr: k.retr, ar: k.ar, smerte: k.smerte, storrelse: k.storrelse };
    for (const [n, v] of Object.entries(maal)) {
      const b = document.querySelector(`[data-maal="${n}"]`);
      if (!b) continue;
      b.style.setProperty("--v", v);
      b.closest(".ryg-mek").classList.toggle("ryg-mek-aktiv", v > 0.35 && n !== "storrelse" && n !== "smerte");
      const tal = b.previousElementSibling && b.previousElementSibling.querySelector(".ryg-mek-tal");
      if (tal) tal.textContent = Math.round(v * 100) + " %";
    }
    markoer();
    if (window.RygVisning) window.RygVisning.heling(st.aktiv ? Object.assign({ aktiv: true, uge: st.t }, k) : { aktiv: false });
  }
  function saetTid(t) {
    st.t = Math.min(MAKS, Math.max(0, t));
    if (!st.aktiv) aktiver();
    opdater();
  }
  function aktiver() {
    if (!st.aktiv && window.RygVisning && !["aksial", "sagittal"].includes(window.RygVisning.visningNavn)) {
      // Snittet fra siden viser kernen, prolapsen og nerveroden bedst.
      window.RygVisning.visning("sagittal");
    }
    st.aktiv = true;
    $("helStop").hidden = false;
  }
  function loop(nu) {
    if (!st.spiller) return;
    const dt = st.sidst ? (nu - st.sidst) / 1000 : 0;
    st.sidst = nu;
    // Lidt langsommere i den akutte fase, så de første uger kan nås at se.
    st.t += dt * (st.t < 4 ? 0.7 : 1.4);
    if (st.t >= MAKS) { st.t = MAKS; stop(); }
    opdater();
    if (st.spiller) requestAnimationFrame(loop);
  }
  function spil() {
    if (!st.type) return;
    if (st.t >= MAKS) st.t = 0;
    aktiver();
    st.spiller = true; st.sidst = 0;
    $("helStart").textContent = "❚❚ Pause";
    requestAnimationFrame(loop);
  }
  function stop() {
    st.spiller = false;
    $("helStart").textContent = st.t >= MAKS ? "↺ Afspil igen" : "▶ Afspil helingen";
  }
  function afslut() {
    stop();
    st.aktiv = false; st.t = 0;
    $("helStop").hidden = true;
    $("helStart").textContent = "▶ Afspil helingen";
    opdater();
  }

  // Fra fundlisten: den prolaps, der vises (første på et modelleret niveau)
  function saetFund(p) {
    const ny = p ? (p.prolapstype === "sekvester" ? "sekvester" : p.prolapstype === "ekstrusion" ? "ekstrusion" : "protrusion") : null;
    const skift = ny !== st.type || (p && st.prolaps && (p.niveau !== st.prolaps.niveau || p.zone !== st.prolaps.zone || p.side !== st.prolaps.side));
    st.prolaps = p;
    $("helIngen").hidden = !!p;
    $("helIndhold").hidden = !p;
    $("helDetaljer").hidden = !p;
    $("helStart").disabled = !p;
    if (!p) { if (st.aktiv) afslut(); st.type = null; $("helType").textContent = ""; return; }
    st.type = ny;
    $("helType").textContent = `— ${p.niveau}, ${ny}${p.prolapstype ? "" : " (type ikke angivet)"}`;
    $("helAndel").textContent = `Ved ${ny === "sekvester" ? "et sekvester" : ny === "ekstrusion" ? "en ekstrusion" : "en protrusion"} skrumper prolapsen hos ca. ${ANDEL[ny]} af 100 (Chiu 2015). Animationen viser et typisk forløb — ikke en garanti for den enkelte.`;
    if (skift) { tegnGraf(); if (st.aktiv) opdater(); }
  }

  function init() {
    if (!$("helPanel")) return;
    $("helStart").addEventListener("click", () => (st.spiller ? stop() : spil()));
    $("helStop").addEventListener("click", afslut);
    $("helTid").addEventListener("input", (e) => { stop(); saetTid(Number(e.target.value)); });
    document.querySelectorAll("#helFaser button").forEach((b) => b.addEventListener("click", () => { stop(); saetTid(Number(b.closest("li").dataset.uge)); }));
    window.addEventListener("ryg-fund", (e) => saetFund(e.detail && e.detail.prolaps));
    saetFund(window.__rygProlaps || null);
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
  return { kurver, fase, MAKS, REST, saetTid, spil, afslut, get tilstand() { return Object.assign({}, st); } };
})();
