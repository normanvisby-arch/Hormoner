/*
 * Menopause Rating Scale (MRS) — symptomscoring til hurtig klinisk brug.
 *
 * MRS er et internationalt valideret, selvudfyldt spørgeskema udviklet af
 * Schneider/Heinemann et al. (Berlin, tidligt 1990'erne), oversat til
 * over 25 sprog og administreret af rettighedshaveren ZEG Berlin GmbH.
 * Skalaen bruges både til at vurdere sværhedsgraden af klimakterielle
 * symptomer på et givent tidspunkt, og til at følge effekten af
 * behandling over tid ved gentagen udfyldelse.
 *
 * VIGTIGT om denne implementering: item-teksterne herunder er en egen,
 * omhyggelig oversættelse af det internationalt standardiserede engelske
 * indhold (krydstjekket mod flere uafhængige kilder), IKKE en direkte
 * gengivelse af ZEG Berlins officielle danske oversættelse — den kunne
 * ikke tilgås direkte i denne session pga. en netværksrestriktion (samme
 * begrænsning som ramte kildeverifikation i de øvrige værktøjer i dette
 * repo). Brug den officielle danske PDF (link i kildeafsnittet) til
 * formel/dokumenteret brug, fx i forskning eller journalføring hvor
 * ordret overensstemmelse med den validerede oversættelse er påkrævet.
 *
 * Struktur, pointskala og score-intervaller er derimod verificeret mod
 * flere uafhængige, samstemmende kilder (se README).
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");
  const printMeta = document.getElementById("printMeta");

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  printBtn.addEventListener("click", () => {
    const now = new Date();
    printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede svar på tidspunktet for udskrift.";
    window.print();
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    update();
  });

  copyBtn.addEventListener("click", () => {
    const text = buildJournalText();
    try {
      navigator.clipboard.writeText(text).then(() => {
        copyStatus.textContent = "Kopieret ✓";
        setTimeout(() => (copyStatus.textContent = ""), 2500);
      }).catch(() => {
        copyStatus.textContent = "Kunne ikke kopiere (fx pga. lokal fil uden https) — markér og kopiér manuelt.";
      });
    } catch (e) {
      copyStatus.textContent = "Kunne ikke kopiere (fx pga. lokal fil uden https) — markér og kopiér manuelt.";
    }
  });

  const ITEMS = [
    { n: 1, domain: "som", title: "Hedeture, svedeture" },
    { n: 2, domain: "som", title: "Hjertegener" },
    { n: 3, domain: "som", title: "Søvnproblemer" },
    { n: 4, domain: "som", title: "Led- og muskelgener" },
    { n: 5, domain: "psy", title: "Nedtrykthed" },
    { n: 6, domain: "psy", title: "Irritabilitet" },
    { n: 7, domain: "psy", title: "Angst, indre uro" },
    { n: 8, domain: "psy", title: "Fysisk og psykisk udmattelse" },
    { n: 9, domain: "uro", title: "Seksuelle problemer" },
    { n: 10, domain: "uro", title: "Vandladningsgener" },
    { n: 11, domain: "uro", title: "Vaginal tørhed" },
  ];

  function box(cls, titleHtml, bodyHtml) {
    return `<div class="box ${cls}"><h3>${titleHtml}</h3>${bodyHtml}</div>`;
  }

  function getAnswers() {
    return ITEMS.map((item) => {
      const checked = document.querySelector(`input[name="item${item.n}"]:checked`);
      return checked ? parseInt(checked.value, 10) : null;
    });
  }

  function severityBand(total) {
    if (total <= 4) return { label: "Ingen/få gener", cls: "box-green" };
    if (total <= 8) return { label: "Lette gener", cls: "box-blue" };
    if (total <= 15) return { label: "Moderate gener", cls: "box-amber" };
    return { label: "Svære gener", cls: "box-red" };
  }

  function update() {
    const answers = getAnswers();
    const answeredCount = answers.filter((a) => a !== null).length;

    if (answeredCount < 11) {
      output.innerHTML = box(
        "box-blue",
        "Spørgeskema under udfyldelse",
        `<p><strong>${answeredCount} af 11 spørgsmål besvaret.</strong> Besvar alle spørgsmål for at se den samlede score og fortolkning. Et svar på "0 – Ingen" tæller som besvaret; det er kun tomme, ubesvarede spørgsmål der mangler.</p>`
      );
      return;
    }

    const somVeg = answers.slice(0, 4).reduce((a, b) => a + b, 0);
    const psych = answers.slice(4, 8).reduce((a, b) => a + b, 0);
    const uro = answers.slice(8, 11).reduce((a, b) => a + b, 0);
    const total = somVeg + psych + uro;
    const band = severityBand(total);

    let html = box(
      band.cls,
      `Samlet score: ${total} / 44 — ${band.label}`,
      `<div class="drug-table-wrap"><table class="drug-table">
        <thead><tr><th>Delskala</th><th>Score</th><th>Maks.</th></tr></thead>
        <tbody>
          <tr><td>Somato-vegetativ (hedeture, hjerte, søvn, led/muskler)</td><td>${somVeg}</td><td>16</td></tr>
          <tr><td>Psykologisk (nedtrykthed, irritabilitet, angst, udmattelse)</td><td>${psych}</td><td>16</td></tr>
          <tr><td>Urogenital (seksuelle problemer, vandladning, tørhed)</td><td>${uro}</td><td>12</td></tr>
          <tr><td><strong>Total</strong></td><td><strong>${total}</strong></td><td><strong>44</strong></td></tr>
        </tbody>
      </table></div>
      <p>Fortolkningen af totalscoren følger en almindeligt citeret, forenklet inddeling (0–4 ingen/få, 5–8 lette, 9–15 moderate, 16+ svære gener). Dette er <em>ikke</em> den formelle, aldersjusterede norm fra det oprindelige valideringsarbejde — brug den officielle scoringsmanual (se kilder) hvis en præcis, aldersnormeret fortolkning er nødvendig, fx til forskningsbrug.</p>`
    );

    if (total >= 5) {
      html += box(
        "box-blue",
        "Næste skridt",
        `<p>Ved lette til svære gener (score ≥ 5) kan det være relevant at drøfte behandlingsmuligheder. Se <a href="index.html">Hormonbehandling ved klimakteriet</a> for beslutningsstøtte til valg af regime, hvis hormonbehandling er aktuel. Gentag MRS efter opstart af behandling (fx efter 2–3 måneder) for at følge effekten — det er netop hertil skalaen oprindeligt er valideret som effektmål.</p>`
      );
    }

    html += box(
      "box-blue",
      "Om skalaen",
      `<p>MRS måler sværhedsgraden af klimakterielle symptomer og deres indvirkning på livskvalitet — den stiller <em>ikke</em> i sig selv diagnosen overgangsalder/menopause, og bør ses som et supplement til, ikke en erstatning for, den kliniske samtale.</p>`
    );

    output.innerHTML = html;
  }

  function buildJournalText() {
    const answers = getAnswers();
    if (answers.filter((a) => a !== null).length < 11) {
      return "MRS (Menopause Rating Scale) — spørgeskema ikke fuldt udfyldt.";
    }
    const somVeg = answers.slice(0, 4).reduce((a, b) => a + b, 0);
    const psych = answers.slice(4, 8).reduce((a, b) => a + b, 0);
    const uro = answers.slice(8, 11).reduce((a, b) => a + b, 0);
    const total = somVeg + psych + uro;
    const band = severityBand(total);
    const lines = [
      "MENOPAUSE RATING SCALE (MRS)",
      `Total score: ${total}/44 — ${band.label}`,
      `Somato-vegetativ: ${somVeg}/16`,
      `Psykologisk: ${psych}/16`,
      `Urogenital: ${uro}/12`,
      "",
      "Enkeltsvar:",
    ];
    ITEMS.forEach((item, i) => lines.push(`  ${item.n}. ${item.title}: ${answers[i]}`));
    return lines.join("\n");
  }

  update();
})();
