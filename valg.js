/*
 * Valg af behandling til journalnotatet.
 * Hvert værktøj sætter en "Vælg"-knap på de behandlinger, der kan vælges i
 * dets tabeller. Lægens valg huskes mellem genberegninger (så længe
 * behandlingen stadig vises), og journalnotatet nævner så kun den valgte
 * behandling i stedet for værktøjets førstevalg.
 */
window.Behandlingsvalg = function (output) {
  "use strict";
  let valgt = "";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  output.addEventListener("change", (e) => {
    if (e.target.name === "valg") valgt = e.target.value;
  });
  const inputs = () => Array.from(output.querySelectorAll('input[name="valg"]'));
  // Efter hver genberegning: et valg, der ikke længere vises, glemmes, og
  // hjælpeteksten (#valgHint) vises kun, når der er noget at vælge.
  const efterVisning = () => {
    const alle = inputs();
    if (valgt && !alle.some((i) => i.value === valgt)) valgt = "";
    const hint = document.getElementById("valgHint");
    if (hint) hint.hidden = alle.length === 0;
  };
  new MutationObserver(efterVisning).observe(output, { childList: true });

  return {
    // Radioknap til en tabelrække (placeres i første celle).
    radio(key, label) {
      return `<label class="valg-radio"><input type="radio" name="valg" value="${esc(key)}"${key === valgt ? " checked" : ""}> ${label || "Vælg til journal"}</label>`;
    },
    nulstil() {
      valgt = "";
    },
    get valgt() {
      return valgt;
    },
    // Den valgte tabelrække (eller null).
    valgtRaekke() {
      const i = inputs().find((x) => x.checked);
      return i ? i.closest("tr") : null;
    },
  };
};

// Tekst fra en tabelcelle uden tag og valgknap: "Navn (tag)".
window.Behandlingsvalg.cellText = function (td) {
  const tag = td.querySelector(".tag");
  const navn = Array.from(td.childNodes)
    .filter((n) => !(n.nodeType === 1 && (n.classList.contains("tag") || n.classList.contains("valg-radio"))))
    .map((n) => n.textContent)
    .join("")
    .trim();
  return tag ? `${navn} (${tag.textContent.trim()})` : navn;
};

// Navn (uden tag) og indholdet af de øvrige celler i en række.
window.Behandlingsvalg.raekkeTekst = function (tr) {
  const cells = Array.from(tr.querySelectorAll("td"));
  const navn = Array.from(cells[0].childNodes)
    .filter((n) => !(n.nodeType === 1 && (n.classList.contains("tag") || n.classList.contains("valg-radio"))))
    .map((n) => n.textContent)
    .join("")
    .trim();
  return { navn, celler: cells.slice(1).map((td) => td.textContent.trim()) };
};
