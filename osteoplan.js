/*
 * Opfølgningsplan ved osteoporosebehandling.
 * Beregner datoer for kontroller, DXA, revurdering, behandlingspause og
 * denosumab-injektioner ud fra præparat og startdato (DSAM 2024, DES NBV,
 * ECTS 2021). Alt beregnes lokalt; intet gemmes.
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");
  const startInput = document.getElementById("start");
  const lastInput = document.getElementById("last");
  const lastField = document.getElementById("lastField");
  const startWarning = document.getElementById("startWarning");
  const printMeta = document.getElementById("printMeta");

  const OSTEO_URL = "osteoporose.html";

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) {
        printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + ".";
      }
      window.print();
    });
  }

  resetBtn.addEventListener("click", () => {
    form.reset();
    // form.reset() does not fire "input"/"change", so re-sync dependent UI.
    update();
  });

  copyBtn.addEventListener("click", () => {
    const done = () => {
      copyStatus.textContent = "Kopieret ✓";
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    };
    const fail = () => {
      copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.";
    };
    try {
      navigator.clipboard.writeText(buildPlanText()).then(done, fail);
    } catch (e) {
      fail();
    }
  });

  // "YYYY-MM-DD" parsed as a local date, so no time-zone shift moves the day.
  function parseDate(v) {
    if (!v) return null;
    const [y, m, d] = v.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  function addMonths(date, n) {
    const y = date.getFullYear();
    const m = date.getMonth() + n;
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(date.getDate(), last));
  }
  const fmtDate = (d) => d.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
  const today = () => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  };
  function monthsBetween(a, b) {
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) m -= 1;
    return m;
  }
  function relLabel(months) {
    if (months === 0) return "Start";
    if (months % 12 === 0) return `${months / 12} år`;
    return `${months} mdr.`;
  }
  function varighedTekst(months) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts = [];
    if (y) parts.push(`${y} år`);
    if (m || !y) parts.push(`${m} ${m === 1 ? "måned" : "måneder"}`);
    return parts.join(" og ");
  }

  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

  function getState() {
    const drug = radio("drug");
    lastField.hidden = drug !== "denosumab";
    return {
      drug,
      start: parseDate(startInput.value),
      last: drug === "denosumab" ? parseDate(lastInput.value) : null,
      hr: Array.from(document.querySelectorAll('input[name="hr"]:checked')).map((el) => el.value),
    };
  }

  const HR_LABELS = {
    hofteryg: "hoftebrud eller brud i ryggen",
    nytbrud: "nyt brud under behandlingen",
    tscore: "T-score i hoften ≤ −2,5",
    prednisolon: "fortsat prednisolon",
  };
  const DRUG_NAVN = { alendronat: "alendronat", zoledronsyre: "zoledronsyre", denosumab: "denosumab" };

  // Hver hændelse: måneder efter start, overskrift og bemærkning.
  function events(s) {
    const pause = s.hr.length === 0;
    const ev = [];
    if (s.drug === "alendronat") {
      ev.push([0, "Opstart", "Instruktion i korrekt indtagelse; calcium og D-vitamin. Blodprøver og tandstatus er afklaret."]);
      ev.push([3, "Kontrol", "Bivirkninger, adhærens og indtagelse. DSAM: evt. knoglemarkører (P1NP/CTX) for effekt."]);
      for (let y = 1; y <= 4; y++) ev.push([12 * y, "Årlig kontrol", "Adhærens, fald, nye brud, højde og calcium/D-vitamin."]);
      ev.push([60, "DXA og revurdering", pause ? "Pause kan overvejes (hoften T-score > −2,5, ingen nye brud)." : "Fortsæt behandlingen (se forhold nedenfor)."]);
      if (pause) {
        ev.push([72, "DXA under pause", "1–2 år efter pausestart. Genoptag ved nyt brud, faldende knogletæthed eller T-score ≤ −2,5."]);
      } else {
        for (let y = 6; y <= 9; y++) ev.push([12 * y, "Årlig kontrol", "Adhærens, fald og nye brud."]);
        ev.push([120, "Revurdering efter 10 år", "DXA. Længere behandling end 10 år afgøres individuelt — overvej specialistvurdering."]);
      }
    } else if (s.drug === "zoledronsyre") {
      ev.push([0, "1. infusion", "eGFR ≥ 35, normalt calcium og D-vitamin før. Paracetamol mod influenzalignende reaktion."]);
      ev.push([12, "2. infusion", "eGFR og calcium før infusionen."]);
      ev.push([24, "3. infusion", "eGFR og calcium før infusionen."]);
      ev.push([36, "DXA og revurdering", pause ? "Pause kan overvejes (hoften T-score > −2,5, ingen nye brud)." : "Fortsæt med årlige infusioner (se forhold nedenfor)."]);
      if (pause) {
        ev.push([48, "DXA under pause", "1–2 år efter pausestart. Genoptag ved nyt brud, faldende knogletæthed eller T-score ≤ −2,5."]);
      } else {
        ev.push([36, "4. infusion", "eGFR og calcium før infusionen."]);
        ev.push([48, "5. infusion", "eGFR og calcium før infusionen."]);
        ev.push([60, "6. infusion", "eGFR og calcium før infusionen."]);
        ev.push([72, "Revurdering efter 6 år", "DXA. Længere behandling afgøres individuelt — overvej specialistvurdering."]);
      }
    } else {
      for (let k = 0; k <= 19; k++) ev.push([6 * k, `${k + 1}. injektion`, "Calcium før injektionen. Senest 7 måneder efter forrige."]);
      ev.push([60, "Revurdering (5 år)", "Fortsæt, eller planlæg ophør med efterbehandling — aldrig ophør uden plan."]);
    }
    return ev.sort((a, b) => a[0] - b[0]);
  }

  function box(cls, title, body) {
    return `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  }

  function planRows(s) {
    const ev = events(s);
    const t = today();
    let rows = ev.map(([off, titel, note]) => ({ off, titel, note, date: s.start ? addMonths(s.start, off) : null }));
    const isInj = (r) => r.titel.endsWith("injektion");
    if (s.drug === "denosumab") {
      // Med kendt seneste injektion tælles de kommende injektioner fra den.
      if (s.last) {
        const doneN = s.start ? rows.filter((r) => isInj(r) && r.date <= s.last).length : null;
        rows = rows.filter((r) => !isInj(r) || (r.date && r.date <= s.last));
        for (let k = 1; k <= 4; k++) {
          const titel = doneN !== null ? `${doneN + k}. injektion` : k === 1 ? "Næste injektion" : `${k}. kommende injektion`;
          rows.push({ off: null, titel, note: `Senest ${fmtDate(addMonths(s.last, 6 * k + 1))}. Calcium før injektionen.`, date: addMonths(s.last, 6 * k) });
        }
        // Rows without a date (no start given) go last.
        rows.sort((a, b) => (a.date ? a.date.getTime() : Infinity) - (b.date ? b.date.getTime() : Infinity));
      }
      // Vis kun den seneste afholdte og de næste fire injektioner.
      if (s.start || s.last) {
        const inj = rows.filter(isInj);
        const past = inj.filter((r) => r.date < t);
        const future = inj.filter((r) => r.date >= t).slice(0, 4);
        const keep = new Set(past.slice(-1).concat(future));
        rows = rows.filter((r) => !isInj(r) || keep.has(r));
      } else {
        rows = rows.filter((r) => !isInj(r) || r.off <= 18);
      }
    }
    const next = rows.find((r) => r.date && r.date >= t);
    rows.forEach((r) => (r.state = !r.date ? "future" : r.date < t ? "done" : r === next ? "next" : "future"));
    return rows;
  }

  function denosumabStatus(s) {
    if (!s.start && !s.last) return "";
    const t = today();
    const anchor = s.last || (() => {
      let d = s.start;
      while (addMonths(d, 6) <= t) d = addMonths(d, 6);
      return d;
    })();
    const due = addMonths(anchor, 6);
    const latest = addMonths(anchor, 7);
    const kilde = s.last ? "seneste injektion" : "planlagte injektioner fra behandlingsstart";
    if (t > latest) {
      return box("box-red", "Forsinket injektion — giv snarest", `<p>Næste injektion skulle være givet senest <strong>${fmtDate(latest)}</strong> (beregnet ud fra ${kilde}). Ved forsinkelse stiger risikoen for multiple rygbrud — giv injektionen hurtigst muligt, eller planlæg efterbehandling med zoledronsyre.</p>`);
    }
    if (t >= due) {
      return box("box-amber", "Injektion forfalden", `<p>Næste injektion var planlagt ${fmtDate(due)} og skal gives senest <strong>${fmtDate(latest)}</strong>.</p>`);
    }
    return box("box-green", "Næste injektion", `<p><strong>${fmtDate(due)}</strong> — senest ${fmtDate(latest)} (beregnet ud fra ${kilde}).</p>`);
  }

  function pauseBox(s) {
    if (s.drug === "denosumab") {
      return box("box-red", "Ingen behandlingspause med denosumab", `<p>Ved ophør stiger knogleomsætningen kraftigt, og der er risiko for multiple rygbrud. Ophør kræver efterbehandling: <strong>zoledronsyre 6 måneder efter sidste injektion</strong> (eller alendronat i mindst 12 måneder), med DXA/knoglemarkører bagefter — gerne efter aftale med knogleklinik (DSAM, ECTS 2021).</p>`);
    }
    const aar = s.drug === "zoledronsyre" ? "3 år" : "5 år";
    const max = s.drug === "zoledronsyre" ? "6 år" : "10 år";
    if (!s.hr.length) {
      return box("box-green", `Ved revurdering efter ${aar}: pause kan overvejes`, `<p>Pause kan overvejes, hvis T-score i hoften er over −2,5, og der ikke er kommet nye brud under behandlingen. Under pausen: <strong>DXA efter 1–2 år</strong>; genoptag ved nyt brud, faldende knogletæthed (fx &gt; 3–4 %) eller T-score ≤ −2,5.</p>`);
    }
    return box("box-amber", `Ved revurdering efter ${aar}: fortsæt behandlingen`, `<p>Forhold, der taler imod pause: ${s.hr.map((k) => HR_LABELS[k]).join(", ")}. Fortsæt ${DRUG_NAVN[s.drug]} op til ${max}, og revurdér derefter — evt. med specialist.</p>`);
  }

  let lastRows = [];
  let lastState = null;

  function update() {
    const s = getState();
    lastState = s;
    const t = today();
    startWarning.textContent = s.start && s.start > addMonths(t, 12) ? "Startdatoen ligger mere end et år ude i fremtiden — tjek indtastningen." : "";
    let html = "";
    if (!s.start) {
      html += box("box-blue", "Angiv behandlingsstart", "<p>Så beregnes datoerne, og næste hændelse markeres. Indtil da vises planen med tidspunkter efter start.</p>");
    } else {
      const m = monthsBetween(s.start, t);
      html += box("box-blue", "Status i dag", `<p>${m >= 0 ? `Behandlingen har varet <strong>${varighedTekst(m)}</strong> (start ${fmtDate(s.start)}).` : `Behandlingen starter ${fmtDate(s.start)}.`}</p>`);
    }
    if (s.drug === "denosumab") html += denosumabStatus(s);
    const rows = planRows(s);
    lastRows = rows;
    const head = ["Tidspunkt", "Hændelse", "Bemærkning"];
    html += `<div class="box box-blue"><h3>Tidslinje for ${DRUG_NAVN[s.drug]}</h3>
      <div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
        .map((r) => `<tr${r.state === "next" ? ' class="row-highlight"' : ""}><td>${r.date ? fmtDate(r.date) : relLabel(r.off)}${r.state === "done" ? " ✓" : r.state === "next" ? " ← næste" : ""}</td><td data-label="${head[1]}">${r.titel}</td><td data-label="${head[2]}">${r.note}</td></tr>`)
        .join("")}</tbody></table></div>
      ${s.drug === "denosumab" && (s.start || s.last) ? "<p>Viser seneste afholdte og de næste fire injektioner.</p>" : ""}
    </div>`;
    html += pauseBox(s);
    html += `<p class="source-note">Valg af præparat og opstart: se <a href="${OSTEO_URL}" target="_blank" rel="noopener">Osteoporose-guiden</a>. Ved nyt brud under behandlingen: vurdér adhærens og sekundære årsager, og overvej henvisning (behandlingssvigt).</p>`;
    output.innerHTML = html;
  }

  function buildPlanText() {
    const s = lastState;
    const lines = [`Osteoporose — opfølgningsplan (${DRUG_NAVN[s.drug]})${s.start ? `, start ${fmtDate(s.start)}` : ""}`];
    lastRows.forEach((r) => lines.push(`- ${r.date ? fmtDate(r.date) : relLabel(r.off)}: ${r.titel}${r.state === "done" ? " (overstået)" : ""} — ${r.note}`));
    const pause = output.querySelectorAll(".box h3");
    const pauseH = pause[pause.length - 1];
    if (pauseH) lines.push(pauseH.textContent.trim() + ".");
    return lines.join("\n");
  }

  update();
})();
