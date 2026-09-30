/*
 * Notat-indgang: én indgang for journalnotater (fx fra Noteless). Teksten
 * klassificeres med Udfyld.klassificer; er ét værktøj klart bedst, åbnes det og
 * udfyldes, ellers vælger lægen blandt kandidaterne.
 */
(function () {
  "use strict";
  const ta = document.getElementById("notatTekst");
  const res = document.getElementById("resultat");
  const direkte = document.getElementById("direkte");
  const alle = document.getElementById("alle");
  const hentBtn = document.getElementById("hentBtn");
  const links = Array.from(document.querySelectorAll("#vaerktoejer a[data-id]"));
  // I claude.ai er siderne selvstændige artifacts: teksten kopieres i stedet for at blive givet videre.
  const ARTIFACT = links.some((a) => /^https:\/\/claude\.ai\//.test(a.getAttribute("href")));
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const vaerktoej = (id) => Udfyld.vaerktoejer.find((v) => v.id === id);
  const adr = (id) => (links.find((a) => a.dataset.id === id) || {}).href;

  // Præference (ikke patientdata): gå direkte til værktøjet, når valget er sikkert.
  try {
    const v = localStorage.getItem("notat.direkte");
    if (v !== null) direkte.checked = v === "1";
  } catch (e) {}
  direkte.addEventListener("change", () => {
    try {
      localStorage.setItem("notat.direkte", direkte.checked ? "1" : "0");
    } catch (e) {}
  });

  function kopier(tekst) {
    try {
      return navigator.clipboard.writeText(tekst).then(() => true, () => false);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function aabn(id) {
    const v = vaerktoej(id);
    const tekst = ta.value;
    if (ARTIFACT) {
      kopier(tekst).then((ok) => {
        const st = document.getElementById("kopiStatus");
        if (st) st.textContent = ok ? "Teksten er kopieret — indsæt den i \"Udfyld fra journaltekst\" øverst i værktøjet." : "Kopiér teksten manuelt (markér og Ctrl/⌘+C), og indsæt den i værktøjet.";
      });
      window.open(adr(id), "_blank", "noopener");
      return;
    }
    Udfyld.gemNotat(tekst);
    if (v && v.udfyld && tekst.trim()) {
      if (Udfyld.send(tekst, v.sti)) return;
      // Teksten kunne ikke gives videre (fx blokeret lager): bliv, kopiér og forklar.
      kopier(tekst).then((ok) => {
        res.insertAdjacentHTML("afterbegin", `<p class="udfyld-fra" role="alert">Teksten kunne ikke overføres til værktøjet i denne browser.${ok ? " Den er kopieret —" : ""} Åbn <a href="${esc(adr(id))}">${esc(v.navn)}</a>, og indsæt teksten i "Udfyld fra journaltekst".</p>`);
      });
      return;
    }
    location.href = adr(id);
  }

  function kort(k, bedst) {
    const knap = ARTIFACT ? `Kopiér teksten og åbn` : k.udfyld ? `Udfyld ${esc(k.navn)}` : `Åbn ${esc(k.navn)}`;
    const app = k.navn.startsWith(k.app) ? "" : ` <span class="field-hint">${esc(k.app)}</span>`;
    const hint = k.udfyld ? "" : `<p class="field-hint">Udfyldes ikke automatisk endnu — værktøjet åbnes tomt.</p>`;
    return `<div class="notat-kort${bedst ? " notat-bedst" : ""}">
      <div class="notat-kort-top"><strong>${esc(k.navn)}</strong>${app}${bedst ? ' <span class="tag tag-recommend">Bedste bud</span>' : ""}</div>
      <p class="field-hint">Fundet i teksten: ${k.fund.map((f) => `"${esc(f)}"`).join(", ")}</p>${hint}
      <button type="button" class="btn ${bedst ? "btn-primary" : "btn-outline"}" data-aabn="${esc(k.id)}">${knap}</button>
    </div>`;
  }

  function vis(auto) {
    const tekst = ta.value;
    if (!tekst.trim()) {
      res.innerHTML = "<p>Indsæt et notat først.</p>";
      return;
    }
    Udfyld.gemNotat(tekst);
    const r = Udfyld.klassificer(tekst);
    if (auto && r.sikker && r.valgt.udfyld && direkte.checked && !ARTIFACT) {
      res.innerHTML = `<p>Åbner <strong>${esc(r.valgt.navn)}</strong> og udfylder …</p>`;
      aabn(r.valgt.id);
      return;
    }
    const k = r.kandidater.slice(0, 5);
    let intro;
    if (!k.length) intro = "<p><strong>Teksten kunne ikke knyttes til et værktøj.</strong> Vælg selv nedenfor.</p>";
    else if (r.sikker) intro = `<p>Teksten peger på <strong>${esc(r.valgt.navn)}</strong>.</p>`;
    else if (k.length > 1) intro = "<p><strong>Teksten passer til flere værktøjer</strong> — vælg det rigtige:</p>";
    else intro = "<p><strong>Kun svage tegn i teksten</strong> — kontrollér valget:</p>";
    const artiNote = ARTIFACT && k.length ? '<p class="field-hint">I claude.ai åbnes værktøjet i en ny fane, og teksten kopieres, så du kan indsætte den i "Udfyld fra journaltekst".</p>' : "";
    res.innerHTML = intro + k.map((x, i) => kort(x, i === 0 && r.sikker)).join("") + artiNote + '<p class="field-hint" id="kopiStatus" aria-live="polite"></p>';
    alle.open = !k.length;
  }

  res.addEventListener("click", (e) => {
    const b = e.target.closest("[data-aabn]");
    if (b) aabn(b.dataset.aabn);
  });
  alle.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-id]");
    if (!a) return;
    e.preventDefault();
    aabn(a.dataset.id);
  });
  document.getElementById("findBtn").addEventListener("click", () => vis(true));
  let gendannet = false;
  ta.addEventListener("input", () => (gendannet = false));
  ta.addEventListener("paste", (e) => {
    const indsat = e.clipboardData ? e.clipboardData.getData("text") : "";
    if (gendannet && indsat) {
      // Den tidligere tekst (fra "tilbage") erstattes — ny tekst hæftes aldrig på en gammel.
      e.preventDefault();
      ta.value = indsat;
      gendannet = false;
      vis(true);
      return;
    }
    const foer = ta.value.trim().length;
    setTimeout(() => {
      const nu = ta.value.trim().length;
      if (!foer || (indsat && indsat.trim().length >= 0.8 * nu)) vis(true);
    }, 0);
  });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) vis(true);
  });
  document.getElementById("rydBtn").addEventListener("click", () => {
    ta.value = "";
    res.innerHTML = "";
    Udfyld.glem();
    ta.focus();
  });
  if (navigator.clipboard && navigator.clipboard.readText && !ARTIFACT) {
    hentBtn.hidden = false;
    hentBtn.addEventListener("click", () => {
      navigator.clipboard.readText().then(
        (t) => {
          ta.value = t;
          vis(true);
        },
        () => (res.innerHTML = "<p>Udklipsholderen kunne ikke læses — sæt ind i feltet med Ctrl/⌘+V.</p>")
      );
    });
  }

  // Tilbage fra et værktøj ("Forkert værktøj?"): vis teksten og valgene igen, uden at springe videre.
  // Åbnes Notat på anden vis, starter feltet tomt, så en ny patients tekst aldrig blandes med en gammel.
  const gemt = Udfyld.hentNotat();
  if (location.hash === "#vaelg" && gemt) {
    ta.value = gemt;
    gendannet = true;
    vis(false);
  } else ta.value = "";
  // Tilbage-knappen kan vise siden fra browserens cache med den gamle tekst: så erstatter indsæt den.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && ta.value.trim()) gendannet = true;
  });
})();
