/*
 * Blødningskalender — årsoverblik til registrering af menstruationsblødning
 * ved mistanke om blødningsforstyrrelser.
 *
 * Designtanke (fra underviser, speciallæge i gynækologi): de fleste
 * cyklus-/menstruations-apps viser kun én måned ad gangen og er svære at få
 * et hurtigt overblik ud af. Et helt års overblik i ét skærmbillede — som
 * en klassisk Mayland-kalender — gør uregelmæssige mønstre (kort/langt
 * mellemrum, forlænget blødning, spotting mellem menstruationer) synlige
 * med det samme, uden at skulle bladre måned for måned.
 *
 * Data gemmes UDELUKKENDE lokalt i browserens localStorage — aldrig sendt
 * nogen steder. Det er en bevidst beslutning: blødningsdata er følsomme
 * helbredsoplysninger, og værktøjet er ikke bygget med en databehandleraftale
 * eller anden infrastruktur der gør det forsvarligt at sende data til en
 * server. Brug "Eksportér" jævnligt for at gemme en sikkerhedskopi som fil,
 * da localStorage kan gå tabt (ryddet browserdata, privat vindue, ny enhed).
 *
 * Terminologi og normalområder: DSAM's vejledning om blødningsforstyrrelser
 * hos kvinder i almen praksis (menorrhagi, metrorragi, polymenorré) og
 * FIGO's moderne definition af normal cyklus (24–38 dage) og normal
 * blødningsvarighed (≤ 8 dage). Værktøjet stiller ikke selv en diagnose —
 * det viser mønsteret, så lægen/patienten selv kan vurdere det.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "bloedningskalender-data-v1";
  const MONTH_NAMES = ["Januar", "Februar", "Marts", "April", "Maj", "Juni", "Juli", "August", "September", "Oktober", "November", "December"];
  const WEEKDAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  const INTENSITY_LABELS = { 0: "Ingen", 1: "Pletblødning", 2: "Let", 3: "Moderat", 4: "Kraftig" };

  const yearLabel = document.getElementById("yearLabel");
  const yearGrid = document.getElementById("yearGrid");
  const prevYearBtn = document.getElementById("prevYear");
  const nextYearBtn = document.getElementById("nextYear");
  const todayBtn = document.getElementById("todayBtn");
  const editorPanel = document.getElementById("editorPanel");
  const editorHint = document.getElementById("editorHint");
  const editorDate = document.getElementById("editorDate");
  const editorFields = document.getElementById("editorFields");
  const painCheckbox = document.getElementById("painCheckbox");
  const noteInput = document.getElementById("noteInput");
  const clearDayBtn = document.getElementById("clearDayBtn");
  const exportBtn = document.getElementById("exportBtn");
  const printBtn = document.getElementById("printBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const printMeta = document.getElementById("printMeta");
  const statsLine = document.getElementById("statsLine");

  let data = loadData();
  let currentYear = new Date().getFullYear();
  let selectedDate = null;
  let clearAllArmed = false;
  let clearAllTimer = null;

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Private browsing / blocked storage / quota — fail silently, the
      // page still works for the current visit, just without persistence.
    }
  }

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function dateStr(y, m, d) {
    return y + "-" + pad2(m + 1) + "-" + pad2(d);
  }

  function todayStr() {
    const t = new Date();
    return dateStr(t.getFullYear(), t.getMonth(), t.getDate());
  }

  // Monday = 0 ... Sunday = 6 (Danish week convention)
  function mondayIndex(jsDay) {
    return (jsDay + 6) % 7;
  }

  function buildMonthCard(year, monthIndex) {
    const card = document.createElement("div");
    card.className = "month-card";

    const heading = document.createElement("h3");
    heading.textContent = MONTH_NAMES[monthIndex];
    card.appendChild(heading);

    const weekHeader = document.createElement("div");
    weekHeader.className = "week-grid weekday-row";
    WEEKDAY_LABELS.forEach((w) => {
      const el = document.createElement("div");
      el.className = "weekday-header";
      el.textContent = w;
      weekHeader.appendChild(el);
    });
    card.appendChild(weekHeader);

    const grid = document.createElement("div");
    grid.className = "week-grid";

    const firstOfMonth = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlanks = mondayIndex(firstOfMonth.getDay());

    for (let i = 0; i < leadingBlanks; i++) {
      const blank = document.createElement("div");
      blank.className = "day-cell outside";
      grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = dateStr(year, monthIndex, d);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell";
      cell.dataset.date = ds;
      cell.textContent = d;
      if (ds === todayStr()) cell.classList.add("today");
      applyCellState(cell, ds);
      cell.addEventListener("click", () => selectDay(ds));
      grid.appendChild(cell);
    }

    card.appendChild(grid);
    return card;
  }

  function applyCellState(cell, ds) {
    const entry = data[ds];
    if (entry && entry.intensity > 0) {
      cell.dataset.intensity = String(entry.intensity);
    } else {
      delete cell.dataset.intensity;
    }
    cell.classList.toggle("has-pain", !!(entry && entry.pain));
    cell.classList.toggle("has-note", !!(entry && entry.note));
    cell.classList.toggle("selected", ds === selectedDate);
    cell.setAttribute(
      "aria-label",
      formatDanishDate(ds) + (entry && entry.intensity ? ", " + INTENSITY_LABELS[entry.intensity] : ", ingen registrering") + (entry && entry.pain ? ", smerter" : "")
    );
  }

  function formatDanishDate(ds) {
    const [y, m, d] = ds.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function renderYear() {
    yearLabel.textContent = String(currentYear);
    yearGrid.innerHTML = "";
    for (let m = 0; m < 12; m++) {
      yearGrid.appendChild(buildMonthCard(currentYear, m));
    }
    updateStats();
  }

  function refreshCell(ds) {
    const cell = yearGrid.querySelector('.day-cell[data-date="' + ds + '"]');
    if (cell) applyCellState(cell, ds);
  }

  function selectDay(ds) {
    const prevSelected = selectedDate;
    selectedDate = ds;
    if (prevSelected) refreshCell(prevSelected);
    refreshCell(ds);

    editorHint.hidden = true;
    editorFields.hidden = false;
    editorDate.textContent = formatDanishDate(ds).replace(/^./, (c) => c.toUpperCase());

    const entry = data[ds] || { intensity: 0, pain: false, note: "" };
    document.querySelectorAll('input[name="intensity"]').forEach((r) => {
      r.checked = Number(r.value) === (entry.intensity || 0);
    });
    painCheckbox.checked = !!entry.pain;
    noteInput.value = entry.note || "";
  }

  function saveCurrentEntry() {
    if (!selectedDate) return;
    const intensityRadio = document.querySelector('input[name="intensity"]:checked');
    const intensity = intensityRadio ? Number(intensityRadio.value) : 0;
    const pain = painCheckbox.checked;
    const note = noteInput.value.trim();

    if (intensity === 0 && !pain && !note) {
      delete data[selectedDate];
    } else {
      data[selectedDate] = { intensity, pain, note };
    }
    saveData();
    refreshCell(selectedDate);
    updateStats();
  }

  function clearCurrentDay() {
    if (!selectedDate) return;
    delete data[selectedDate];
    saveData();
    document.querySelectorAll('input[name="intensity"]').forEach((r) => (r.checked = r.value === "0"));
    painCheckbox.checked = false;
    noteInput.value = "";
    refreshCell(selectedDate);
    updateStats();
  }

  function updateStats() {
    const prefix = currentYear + "-";
    let bleedingDays = 0;
    let painDays = 0;
    Object.keys(data).forEach((ds) => {
      if (ds.indexOf(prefix) === 0) {
        if (data[ds].intensity > 0) bleedingDays++;
        if (data[ds].pain) painDays++;
      }
    });
    statsLine.textContent = "Registreret i " + currentYear + ": " + bleedingDays + " blødningsdag(e)" + (painDays > 0 ? ", " + painDays + " dag(e) med smerter" : "") + ".";
  }

  editorFields.addEventListener("change", saveCurrentEntry);
  noteInput.addEventListener("input", debounce(saveCurrentEntry, 400));
  clearDayBtn.addEventListener("click", clearCurrentDay);

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  prevYearBtn.addEventListener("click", () => {
    currentYear--;
    renderYear();
  });
  nextYearBtn.addEventListener("click", () => {
    currentYear++;
    renderYear();
  });
  todayBtn.addEventListener("click", () => {
    currentYear = new Date().getFullYear();
    renderYear();
    selectDay(todayStr());
    document.querySelector('.day-cell.today')?.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  printBtn.addEventListener("click", () => {
    const now = new Date();
    printMeta.textContent = "Udskrevet " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + ".";
    window.print();
  });

  exportBtn.addEventListener("click", () => {
    const text = buildExportText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bloedningskalender.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  function buildExportText() {
    const lines = ["BLØDNINGSKALENDER — eksporteret " + new Date().toLocaleDateString("da-DK"), ""];
    const dates = Object.keys(data).sort();
    if (dates.length === 0) {
      lines.push("Ingen registreringer.");
    } else {
      dates.forEach((ds) => {
        const e = data[ds];
        let line = ds + " — " + (INTENSITY_LABELS[e.intensity] || "Ingen");
        if (e.pain) line += ", smerter";
        if (e.note) line += ", note: " + e.note;
        lines.push(line);
      });
    }
    return lines.join("\n");
  }

  // Destruktiv handling uden native confirm() (bruges ikke i artefakt-visning
  // og er generelt et dårligt mønster) — kræver i stedet to bevidste klik
  // inden for få sekunder.
  clearAllBtn.addEventListener("click", () => {
    if (!clearAllArmed) {
      clearAllArmed = true;
      clearAllBtn.textContent = "Er du sikker? Klik igen for at slette alt";
      clearAllBtn.classList.add("btn-danger-armed");
      clearAllTimer = setTimeout(() => {
        clearAllArmed = false;
        clearAllBtn.textContent = "Ryd alle data";
        clearAllBtn.classList.remove("btn-danger-armed");
      }, 5000);
    } else {
      clearTimeout(clearAllTimer);
      data = {};
      saveData();
      selectedDate = null;
      editorHint.hidden = false;
      editorFields.hidden = true;
      clearAllArmed = false;
      clearAllBtn.textContent = "Ryd alle data";
      clearAllBtn.classList.remove("btn-danger-armed");
      renderYear();
    }
  });

  renderYear();
})();
