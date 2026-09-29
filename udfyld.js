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
  const NEG = new RegExp(`${B}(ingen|ikke|uden|benægter|benægtes|negativ|neg\\.?|afkræft\\w*|aldrig|intet|ej)${E}`);
  const NEG_EFTER = /^\s*[:=]?\s*(nej|neg\b|negativ|ikke til stede|benægtes|afkræftet|-(?![\d>]))/;
  const TAL = "(<|>|≤|≥)?\\s*(\\d+(?:[.,]\\d+)?)";
  const SEP = "\\s*(?:[:=]|på|er|var|af|ca\\.?|målt til)?\\s*";
  const BOGSTAV = /[a-zæøåé0-9]/;

  const parseTal = (s) => parseFloat(String(s).replace(",", "."));
  const erCifre = (c) => c >= "0" && c <= "9";

  // Grænser for sætninger og led: . ; ! ? linjeskift, komma (ikke i decimaltal) og "men".
  function erGraense(t, i) {
    const c = t[i];
    if (c === "\n" || c === ";" || c === "!" || c === "?") return true;
    if (c === "." || c === ",") return !(erCifre(t[i - 1] || "") && erCifre(t[i + 1] || ""));
    return false;
  }

  function lib(tekst) {
    const t = tekst.toLowerCase();
    const brugt = [];
    const erBrugt = (i) => brugt.some(([a, b]) => i >= a && i < b);
    const brug = (a, b) => brugt.push([a, b]);

    function leddetFor(i) {
      let a = i;
      while (a > 0 && !erGraense(t, a - 1)) a--;
      const del = t.slice(a, i).split(new RegExp(`${B}men${E}`));
      return del[del.length - 1];
    }
    function leddetEfter(i) {
      let b = i;
      while (b < t.length && !erGraense(t, b)) b++;
      return t.slice(i, b);
    }
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

    const L = {
      tekst,
      B,
      E,
      // Ord eller udtryk: "ja", hvis mindst én forekomst ikke er negeret; "nej", hvis alle er.
      term(monster) {
        const re = new RegExp(`${B}(?:${monster})`, "g");
        const fund = alle(re);
        if (!fund.length) return { status: null };
        const ja = fund.find((m) => !NEG.test(leddetFor(m.index)) && !NEG_EFTER.test(leddetEfter(m.index + m[0].length)));
        const m = ja || fund[0];
        return { status: ja ? "ja" : "nej", kilde: kilde(m.index, m.index + m[0].length) };
      },
      // Tal efter en etiket, fx "CRP 64", "eGFR: 42", "CRP < 5".
      tal(etiket, { min = -Infinity, max = Infinity, alle: flere = false } = {}) {
        const re = new RegExp(`${B}(?:${etiket})${E}${SEP}${TAL}`, "g");
        const ud = [];
        for (const m of alle(re)) {
          const v = parseTal(m[2]);
          if (!(v >= min && v <= max)) continue;
          ud.push({ v, op: m[1] || "", kilde: kilde(m.index, m.index + m[0].length), index: m.index, slut: m.index + m[0].length, efter: leddetEfter(m.index + m[0].length), foer: leddetFor(m.index) });
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
      kilde,
      parseTal,
    };

    // ------------------------------------------------------------------
    // Fælles udtræk
    // ------------------------------------------------------------------

    L.alder = function () {
      const mdr = L.find(`(\\d{1,2})\\s*(?:måneder|mdr\\.?|md\\.)\\s*(?:gammel|gl\\.?)`) || L.find(`(?:barn|dreng|pige|spædbarn)\\s*(?:på\\s*)?(\\d{1,2})\\s*(?:måneder|mdr)`);
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

    L.vaegt = function () {
      const f = L.find(`(?:vægt|vejer)\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)\\s*kg`) || L.find(`(\\d+(?:[.,]\\d+)?)\\s*kg${E}(?!\\s*\\/)`);
      if (!f) return null;
      const v = parseTal(f.m[1]);
      return v >= 1 && v <= 250 ? { v, kilde: f.kilde } : null;
    };

    L.koen = function () {
      const f = L.find(`${B}(mand|manden|kvinde|kvinden|dreng|drengen|pige|pigen)${E}`);
      if (!f) return null;
      return { v: /^(mand|dreng)/.test(f.m[1]) ? "mand" : "kvinde", kilde: f.kilde };
    };

    L.temp = function () {
      const f = L.find(`(?:${B}temp(?:eratur)?\\.?|${B}t)\\s*[:=]?\\s*(\\d{2}[.,]\\d)`) || L.find(`(\\d{2}[.,]\\d)\\s*(?:°\\s*c?|grader)`);
      if (!f) return null;
      const v = parseTal(f.m[1]);
      return v >= 34 && v <= 43 ? { v, kilde: f.kilde } : null;
    };

    // Feber: "ja" ved feber-ord eller temperatur ≥ 38; "nej" ved afebril/ingen feber.
    L.feber = function () {
      const afeb = L.term("afebril|feberfri");
      if (afeb.status === "ja") return { status: "nej", kilde: afeb.kilde };
      const t1 = L.term("feber|febril|pyreksi");
      const temp = L.temp();
      if (t1.status === "ja") return t1;
      if (temp && temp.v >= 38) return { status: "ja", kilde: temp.kilde };
      if (t1.status === "nej") return t1;
      if (temp) return { status: "nej", kilde: temp.kilde };
      return { status: null };
    };

    L.gravid = function () {
      const test = L.find(`graviditetstest\\w*\\s*[:=]?\\s*(pos\\w*|\\+|neg\\w*|-)`);
      if (test) return { status: /^(pos|\+)/.test(test.m[1]) ? "ja" : "nej", kilde: test.kilde };
      return L.term(`gravid${E}|gravide${E}|graviditetsuge|uge\\s*\\d{1,2}\\s*\\+\\s*\\d|ga\\s*\\d{1,2}\\s*\\+\\s*\\d`);
    };

    L.allergi = function () {
      const t1 = L.term(`penicillin-?\\s*allergi|pc-?allergi|allergi\\w*\\s*(?:over for|overfor|for|mod)\\s*penicillin|allergisk\\s*(?:over for|overfor|for|mod)\\s*penicillin`);
      if (t1.status) return t1;
      const ingen = L.term(`ingen kendte allergier|ingen allergier|nka${E}`);
      if (ingen.status) return { status: "nej", kilde: ingen.kilde };
      return { status: null };
    };

    // Laboratorieværdier
    L.egfr = (o) => L.tal(`e-?gfr|gfr`, Object.assign({ min: 2, max: 200 }, o));
    L.crp = () => L.tal(`crp`, { min: 0, max: 700 });
    L.sat = () => L.tal(`sat(?:uration)?|spo2|ilt-?mætning`, { min: 50, max: 100 });
    L.rf = () => L.tal(`rf|resp(?:\\.|irationsfrekvens)?|respirationsfrekvens`, { min: 5, max: 80 });
    L.kalium = () => L.tal(`p-?kalium|kalium|k\\+?`, { min: 1.5, max: 9 });
    L.uacr = function () {
      const f = L.tal(`uacr|u-?acr|u-?albumin\\s*\\/\\s*kreatinin(?:-?ratio)?|albumin\\s*\\/\\s*kreatinin(?:-?ratio)?|albumin-?kreatinin-?ratio|u-?alb\\s*\\/\\s*krea`, { min: 0, max: 50000 });
      if (!f) return null;
      const enhed = f.efter.match(/^\s*mg\s*\/\s*(?:mmol|g)/);
      L.brug(f.index, f.slut + (enhed ? enhed[0].length : 0));
      if (/^\s*mg\s*\/\s*mmol/.test(f.efter)) return Object.assign(f, { v: Math.round(f.v * 8.84), note: `${String(f.v).replace(".", ",")} mg/mmol omregnet til mg/g (× 8,84)` });
      return f;
    };
    L.kreat = () => L.tal(`p-?kreatinin|kreatinin|p-?krea|krea`, { min: 20, max: 2000 });
    L.bt = function () {
      const f = L.find(`${B}(?:bt|blodtryk)${E}${SEP}(\\d{2,3})\\s*\\/\\s*(\\d{2,3})`);
      if (!f) return null;
      const s = parseTal(f.m[1]);
      const d = parseTal(f.m[2]);
      return s >= 60 && s <= 280 && d >= 30 && d <= 170 ? { s, d, kilde: f.kilde } : null;
    };

    // Vælg en kategori ud fra en prioriteret liste: stærke udtryk først, svage bagefter.
    L.vaelg = function (liste) {
      for (const niveau of ["staerk", "svag"]) {
        const fund = liste.filter((x) => x[niveau]).map((x) => ({ x, r: L.term(x[niveau]) })).filter((f) => f.r.status === "ja");
        if (fund.length) return { value: fund[0].x.value, kilde: fund[0].r.kilde, flere: fund.length > 1 ? fund.map((f) => f.x.value) : null };
      }
      return null;
    };
    return L;
  }

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
    });

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
        ${mangler.length ? `<p class="field-hint">Ikke fundet i teksten: ${mangler.map(([, l]) => esc(l)).join(", ")}.</p>` : ""}`;
    });
  }

  return { init, lib };
})();
