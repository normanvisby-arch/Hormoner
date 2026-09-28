/*
 * Frakturrisiko og effekt af osteoporosebehandling.
 * Omregner patientens FRAX 10-års risiko til 5 år (jævn risiko over tid) og
 * anvender relative risikoreduktioner fra Cochrane (alendronat) og de store
 * placebokontrollerede studier (FIT, HORIZON, FREEDOM). Ved osteopeni uden brud
 * bruges det svagere primærforebyggelses-skøn, da effekten dér er usikker.
 */

(function () {
  "use strict";

  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const copyFullBtn = document.getElementById("copyFullBtn");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");
  const mofInput = document.getElementById("mof");
  const hipInput = document.getElementById("hip");
  const mofWarning = document.getElementById("mofWarning");
  const hipWarning = document.getElementById("hipWarning");
  const printMeta = document.getElementById("printMeta");

  const OSTEO_URL = "osteoporose.html";

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) {
        printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede valg på tidspunktet for udskrift.";
      }
      window.print();
    });
  }

  resetBtn.addEventListener("click", () => {
    form.reset();
    // form.reset() does not fire "input"/"change", so re-sync dependent UI.
    update();
  });

  function copyText(text) {
    const done = () => {
      copyStatus.textContent = "Kopieret ✓";
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    };
    const fail = () => {
      copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.";
    };
    try {
      navigator.clipboard.writeText(text).then(done, fail);
    } catch (e) {
      fail();
    }
  }
  copyBtn.addEventListener("click", () => copyText(buildJournalNote()));
  copyFullBtn.addEventListener("click", () => copyText(buildFullText()));

  const num = (el) => (el.value === "" ? NaN : parseFloat(el.value.replace(",", ".")));
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

  function getState() {
    return {
      mof: num(mofInput),
      hip: num(hipInput),
      status: radio("status"),
      drug: radio("drug"),
      rf: Array.from(document.querySelectorAll('input[name="rf"]:checked')).map((el) => el.value),
    };
  }

  const DRUG_NAVN = { alendronat: "alendronat", zoledronsyre: "zoledronsyre", denosumab: "denosumab" };
  const STATUS_TXT = { brud: "tidligere lavenergibrud", osteoporose: "osteoporose uden brud", osteopeni: "osteopeni uden brud" };
  const RF_LABELS = {
    nyligt: "brud inden for 2 år",
    flere: "flere tidligere brud/sammenfald",
    fald: "faldtendens",
    prednisolon: "prednisolon > 7,5 mg",
    ryglav: "lav T-score i ryggen",
    t2d: "type 2-diabetes",
  };
  const RF_TEXT = {
    nyligt: "Risikoen er størst de første 1–2 år efter et brud (imminent risiko) — FRAX tager ikke højde for, hvor nyligt bruddet er.",
    flere: "FRAX tæller kun, om der har været et brud — ikke antallet eller sværhedsgraden af sammenfald.",
    fald: "Fald indgår ikke i FRAX, men er den direkte årsag til de fleste brud uden for ryggen.",
    prednisolon: "FRAX forudsætter en mellemdosis prednisolon — ved over 7,5 mg dagligt er risikoen højere.",
    ryglav: "FRAX bruger kun T-score fra lårbenshalsen — en markant lavere T-score i ryggen øger især risikoen for rygbrud.",
    t2d: "Type 2-diabetes øger brudrisikoen ved en given T-score, og FRAX undervurderer risikoen.",
  };

  // Relativ risiko med behandling: [central, bedste, dårligste].
  // Osteoporose/brud: hoftebrud RR ~0,6 (Cochrane 0,60; HORIZON 0,59; FREEDOM 0,60);
  // større osteoporotiske brud ~0,7 (kliniske rygbrud 0,3–0,5, ikke-vertebrale 0,77–0,80).
  // Osteopeni uden brud: Cochrane primær forebyggelse, ikke-vertebrale RR 0,89 (0,76–1,04).
  function rrFor(status, udfald) {
    if (status === "osteopeni") return udfald === "mof" ? [0.89, 0.76, 1.0] : null;
    return udfald === "mof" ? [0.7, 0.6, 0.8] : [0.6, 0.5, 0.7];
  }

  function roundNnt(x) {
    if (x < 100) return Math.round(x / 5) * 5 || 1;
    if (x < 1000) return Math.round(x / 10) * 10;
    return Math.round(x / 100) * 100;
  }
  const fmtInt = (n) => n.toLocaleString("da-DK");
  const fmt1 = (x) => (x >= 10 ? fmtInt(Math.round(x)) : String(Math.round(x * 10) / 10).replace(".", ","));
  const five = (p10) => (1 - Math.sqrt(1 - p10 / 100)) * 1000;

  // Beregner risiko pr. 1.000 over 5 år og NNT-interval for et udfald.
  function calc(p10, rr) {
    const base = five(p10);
    if (!rr) return { base, rr: null };
    const [c, best, worst] = rr;
    const nnt = (r) => (1 - r <= 0 ? Infinity : 1000 / (base * (1 - r)));
    return {
      base,
      rr,
      treated: base * c,
      prevented: base * (1 - c),
      nnt: nnt(c),
      nntLo: nnt(best),
      nntHi: nnt(worst),
    };
  }

  function nntLabel(r) {
    if (!r.rr) return "usikker";
    const lo = fmtInt(roundNnt(r.nntLo));
    return r.nntHi === Infinity ? `≥ ${lo}` : `≈ ${fmtInt(roundNnt(r.nnt))} (${lo}–${fmtInt(roundNnt(r.nntHi))})`;
  }

  function checkInputs(s) {
    const bad = (v) => !isNaN(v) && (v < 0 || v > 90);
    mofWarning.textContent = bad(s.mof) ? "Værdien skal være mellem 0 og 90 %." : "";
    hipWarning.textContent = bad(s.hip)
      ? "Værdien skal være mellem 0 og 90 %."
      : !isNaN(s.hip) && !isNaN(s.mof) && s.hip > s.mof
        ? "Hoftebrud indgår i større osteoporotiske brud — risikoen kan ikke være højere. Tjek FRAX-resultatet."
        : "";
    return !isNaN(s.mof) && !bad(s.mof) && !(!isNaN(s.hip) && (bad(s.hip) || s.hip > s.mof));
  }

  // 1.000-personers figur: blå = brud trods behandling, grøn = brud forebygget,
  // grå = intet brud.
  function iconArray(treated, prevented) {
    const t = Math.round(treated);
    const f = Math.round(prevented);
    let cells = "";
    for (let i = 0; i < 1000; i++) {
      const cls = i < t ? "ia-base" : i < t + f ? "ia-saved" : "ia-none";
      cells += `<span class="ia-cell ${cls}"></span>`;
    }
    const ingen = 1000 - t - f;
    return `<figure class="icon-array" aria-label="Ud af 1.000 kvinder over 5 år: ${t} får brud trods behandling, ${f} brud forebygges, ${ingen} får ikke brud">
      <div class="ia-grid" aria-hidden="true">${cells}</div>
      <figcaption class="ia-legend">
        <span><span class="ia-key ia-base"></span>${t} får brud trods behandling</span>
        <span><span class="ia-key ia-saved"></span>${f} brud forebygges</span>
        <span><span class="ia-key ia-none"></span>${ingen} får ikke brud</span>
      </figcaption>
    </figure>`;
  }

  function box(cls, title, body) {
    return `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  }

  function card(title, chipCls, chipTxt, nnhStrip, body) {
    return `<div class="box box-blue risk-card">
      <div class="risk-head"><h3>${title}</h3><span class="chip ${chipCls}">${chipTxt}</span></div>
      ${nnhStrip}
      ${body}
    </div>`;
  }

  function nntStrip(r, udfald, drug) {
    if (!r.rr) return `<div class="nnh nnh-none"><span class="nnh-num">NNT: –</span><span class="nnh-txt">Ingen sikker effekt på ${udfald} ved osteopeni uden brud (Cochrane, primær forebyggelse).</span></div>`;
    return `<div class="nnh"><span class="nnh-num">NNT ${nntLabel(r)}</span><span class="nnh-txt">Behandles ca. ${fmtInt(roundNnt(r.nnt))} kvinder i 5 år med ${DRUG_NAVN[drug]}, undgår 1 ${udfald}.</span></div>`;
  }

  let lastRes = null;

  function update() {
    const s = getState();
    const ok = checkInputs(s);
    let html = "";
    lastRes = null;
    if (!ok) {
      html += box("box-blue", "Indtast patientens FRAX-resultat", `<p>Beregn 10-års risikoen i <a href="https://frax.shef.ac.uk/FRAX/" target="_blank" rel="noopener">FRAX</a> og indtast den til venstre. Så vises brud pr. 1.000 over 5 år med og uden ${DRUG_NAVN[s.drug]}, NNT og en figur til samtalen.</p><p>Indtil da: effekten i de store studier og bivirkningerne ses nedenfor.</p>`);
      output.innerHTML = html + trialBox(s) + harmsBox(s) + sourceNote();
      return;
    }
    const mof = calc(s.mof, rrFor(s.status, "mof"));
    const hip = isNaN(s.hip) ? null : calc(s.hip, rrFor(s.status, "hip"));
    lastRes = { s, mof, hip };

    html += summaryBox(s, mof, hip);
    html += nntBox(s, mof, hip);
    html += card(
      "Større osteoporotiske brud",
      "chip-lav",
      `5 år · ${fmt1(mof.base)} pr. 1.000`,
      nntStrip(mof, "større osteoporotisk brud", s.drug),
      `<p>Uden behandling får ca. <strong>${fmt1(mof.base)} af 1.000</strong> et større osteoporotisk brud inden for 5 år (FRAX ${fmt1(s.mof)} % over 10 år). ${mof.rr ? `Med ${DRUG_NAVN[s.drug]}: ca. <strong>${fmt1(mof.treated)} af 1.000</strong> — ca. <strong>${fmt1(mof.prevented)} brud forebygges</strong>.` : ""}</p>
      ${mof.rr ? iconArray(mof.treated, mof.prevented) : ""}`
    );
    if (hip) {
      html += card(
        "Hoftebrud",
        "chip-lav",
        `5 år · ${fmt1(hip.base)} pr. 1.000`,
        nntStrip(hip, "hoftebrud", s.drug),
        `<p>Uden behandling får ca. <strong>${fmt1(hip.base)} af 1.000</strong> et hoftebrud inden for 5 år (FRAX ${fmt1(s.hip)} % over 10 år).${hip.rr ? ` Med ${DRUG_NAVN[s.drug]}: ca. <strong>${fmt1(hip.treated)} af 1.000</strong> — ca. <strong>${fmt1(hip.prevented)} forebygges</strong>.` : ""} Hoftebrud giver ofte varigt funktionstab, og dødeligheden det første år er høj.</p>`
      );
    }
    if (s.rf.length) html += box("box-amber", "Risikoen er formentlig højere end FRAX angiver", `<ul>${s.rf.map((k) => `<li>${RF_TEXT[k]}</li>`).join("")}</ul><p>Jo højere den reelle risiko er, jo lavere er NNT — altså større gevinst ved behandling.</p>`);
    html += trialBox(s) + harmsBox(s) + sourceNote();
    output.innerHTML = html;
  }

  function summaryBox(s, mof, hip) {
    const usikker = s.status === "osteopeni";
    const effekt = usikker
      ? `Ved osteopeni uden brud er effekten usikker: skønsvis forebygges ca. ${fmt1(mof.prevented)} større brud pr. 1.000 (<strong>NNT ${nntLabel(mof)}</strong>), og der er ingen sikker effekt på hoftebrud (Cochrane, primær forebyggelse). Behandling er normalt ikke indiceret.`
      : `Med ${DRUG_NAVN[s.drug]} i 5 år forebygges ca. <strong>${fmt1(mof.prevented)} større brud</strong>${hip && hip.rr ? ` og <strong>${fmt1(hip.prevented)} hoftebrud</strong>` : ""} pr. 1.000 — <strong>NNT ${nntLabel(mof)}</strong> for større brud.`;
    return box(
      usikker ? "box-amber" : "box-green",
      usikker ? "Samlet: usikker gevinst ved behandling" : "Samlet: gevinst ved behandling",
      `<p><strong>Udgangspunkt:</strong> ${STATUS_TXT[s.status]}; FRAX ${fmt1(s.mof)} %${isNaN(s.hip) ? "" : ` / hofte ${fmt1(s.hip)} %`} over 10 år.${s.rf.length ? ` Forhold FRAX undervurderer: ${s.rf.map((k) => RF_LABELS[k]).join(", ")}.` : ""}</p>
      <p>${effekt}</p>
      <p>Behandlingsindikationen afgøres i Danmark af brud og T-score (DSAM) — se <a href="${OSTEO_URL}" target="_blank" rel="noopener">Osteoporose-guiden</a>. Til sammenligning anbefaler de amerikanske retningslinjer (BHOF) behandling ved 10-års risiko ≥ 20 % for større brud eller ≥ 3 % for hoftebrud.</p>`
    );
  }

  function nntBox(s, mof, hip) {
    const rows = [["Større osteoporotisk brud", mof], ["Hoftebrud", hip]]
      .filter(([, r]) => r)
      .map(([navn, r]) => `<tr><td>${navn}</td><td data-label="Uden → med">${fmt1(r.base)} → ${r.rr ? fmt1(r.treated) : "?"}</td><td data-label="NNT (5 år)"><strong>${nntLabel(r)}</strong></td></tr>`)
      .join("");
    return `<div class="box box-blue nnh-box"><h3>Number needed to treat (NNT)</h3>
      <p><strong>NNT</strong> er det antal kvinder, der skal behandles i 5 år, for at <strong>én</strong> undgår et brud. <strong>Jo lavere tal, jo større gevinst.</strong> Parentesen viser spændet i studierne.</p>
      <div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr><th>Udfald</th><th>Pr. 1.000 (uden → med)</th><th>NNT (5 år)</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${hip ? "" : "<p>Indtast også FRAX-risikoen for hoftebrud for at se NNT for hoftebrud.</p>"}
    </div>`;
  }

  const TRIALS = [
    { drug: "alendronat", studie: "FIT (alendronat)", pop: "Kvinder med rygbrud", udfald: "Nye rygbrud (røntgen)", p: 15.0, b: 8.0 },
    { drug: "alendronat", studie: "FIT (alendronat)", pop: "Kvinder med rygbrud", udfald: "Hoftebrud", p: 2.2, b: 1.1 },
    { drug: "zoledronsyre", studie: "HORIZON (zoledronsyre)", pop: "Osteoporose, gns. 73 år", udfald: "Nye rygbrud (røntgen)", p: 10.9, b: 3.3 },
    { drug: "zoledronsyre", studie: "HORIZON (zoledronsyre)", pop: "Osteoporose, gns. 73 år", udfald: "Hoftebrud", p: 2.5, b: 1.4 },
    { drug: "denosumab", studie: "FREEDOM (denosumab)", pop: "Osteoporose, 60–90 år", udfald: "Nye rygbrud (røntgen)", p: 7.2, b: 2.3 },
    { drug: "denosumab", studie: "FREEDOM (denosumab)", pop: "Osteoporose, 60–90 år", udfald: "Hoftebrud", p: 1.2, b: 0.7 },
    { drug: "denosumab", studie: "FREEDOM (denosumab)", pop: "Osteoporose, 60–90 år", udfald: "Brud uden for ryggen", p: 8.0, b: 6.5 },
  ];
  const pct = (x) => String(x.toFixed(1)).replace(".", ",") + " %";

  function trialBox(s) {
    const rows = TRIALS.map((t) => `<tr${t.drug === s.drug ? ' class="row-highlight"' : ""}><td>${t.studie}</td><td data-label="Udfald">${t.udfald}</td><td data-label="Placebo → behandling">${pct(t.p)} → ${pct(t.b)}</td><td data-label="NNT (ca. 3 år)">${fmtInt(roundNnt(100 / (t.p - t.b)))}</td></tr>`).join("");
    return `<div class="box box-blue box-collapsible"><details><summary><h3>Effekten i de store studier</h3></summary>
      <p>Placebokontrollerede studier over ca. 3 år hos kvinder med osteoporose. Markeret række = valgt præparat.</p>
      <div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr><th>Studie</th><th>Udfald</th><th>Placebo → behandling</th><th>NNT (ca. 3 år)</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p>Rygbrud på røntgen tæller også brud uden symptomer. Præparaterne er i sammenlignende analyser omtrent lige effektive mod hoftebrud; zoledronsyre og denosumab virker lidt stærkere på rygbrud.</p>
    </details></div>`;
  }

  function harmsBox(s) {
    const specifik = {
      alendronat: "<li><strong>Mave-tarm:</strong> halsbrand og synkegener er de hyppigste — mindskes ved korrekt indtagelse.</li>",
      zoledronsyre: "<li><strong>Influenzalignende reaktion</strong> (feber, muskelsmerter) i 1–3 dage efter første infusion hos op mod hver tredje, sjældnere ved senere infusioner. Kræver eGFR ≥ 35 og normalt calcium.</li>",
      denosumab: "<li><strong>Rebound ved ophør:</strong> ved forsinket eller stoppet behandling stiger risikoen for multiple rygbrud markant — kræver efterbehandling med zoledronsyre.</li><li><strong>Lavt calcium</strong>, især ved nedsat nyrefunktion — kontrollér før hver injektion.</li>",
    }[s.drug];
    const onj = s.drug === "alendronat"
      ? "ca. 1 pr. 10.000–100.000 behandlingsår ved tabletter (ASBMR) — dvs. NNH ca. 2.000–20.000 over 5 år"
      : "sjælden, men hyppigere end ved tabletter";
    return `<div class="box box-blue box-collapsible"><details><summary><h3>Bivirkninger og sjældne skader</h3></summary>
      <ul class="followup-list">
        ${specifik}
        <li><strong>Kæbenekrose:</strong> ${onj}. Risikoen er størst ved dårlig tandstatus og tandudtrækning — tandlæge før opstart ved behov.</li>
        <li><strong>Atypiske lårbensbrud:</strong> meget sjældne og stiger med varigheden. Efter 3 års bisfosfonat forebygges ca. 149 hoftebrud for hver 2 atypiske brud hos hvide kvinder (Black 2020); risikoen falder hurtigt efter ophør og er højere hos asiatiske kvinder. Lyskesmerter/lårsmerter under behandling skal udredes.</li>
      </ul>
    </details></div>`;
  }

  function sourceNote() {
    return `<p class="source-note">5-års risiko = 1 − √(1 − 10-års risiko), dvs. jævn risiko over tiden. Relativ risiko med behandling: større brud 0,7 (0,6–0,8), hoftebrud 0,6 (0,5–0,7); ved osteopeni uden brud: større brud 0,89 (0,76–1,0) og ingen sikker effekt på hoftebrud. Skønnet forudsætter god adhærens.</p>`;
  }

  // Kort, redigerbart journalnotat.
  function buildJournalNote() {
    const lines = [`Frakturrisiko ${new Date().toLocaleDateString("da-DK")}`];
    if (!lastRes) {
      lines.push("FRAX ikke indtastet.");
      return lines.join("\n");
    }
    const { s, mof, hip } = lastRes;
    lines.push(`FRAX 10 år: større osteoporotisk brud ${fmt1(s.mof)} %${isNaN(s.hip) ? "" : `, hoftebrud ${fmt1(s.hip)} %`}; ${STATUS_TXT[s.status]}.`);
    if (s.rf.length) lines.push(`Forhold FRAX undervurderer: ${s.rf.map((k) => RF_LABELS[k]).join(", ")}.`);
    lines.push(`- Større brud over 5 år: ca. ${fmt1(mof.base)} pr. 1.000 uden behandling${mof.rr ? `, ca. ${fmt1(mof.treated)} med ${DRUG_NAVN[s.drug]}; NNT ${nntLabel(mof)}` : "; effekt af behandling usikker ved osteopeni uden brud"}`);
    if (hip) lines.push(`- Hoftebrud over 5 år: ca. ${fmt1(hip.base)} pr. 1.000 uden behandling${hip.rr ? `, ca. ${fmt1(hip.treated)} med ${DRUG_NAVN[s.drug]}; NNT ${nntLabel(hip)}` : "; ingen sikker effekt ved osteopeni uden brud"}`);
    lines.push("Drøftet med patienten (tilpas): gevinst og risiko i absolutte tal, bivirkninger, varighed og alternativer.");
    return lines.join("\n");
  }

  function buildFullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      const chip = boxEl.querySelector(".chip");
      if (h3) lines.push(h3.textContent.trim().toUpperCase() + (chip ? ` — ${chip.textContent.trim()}` : ""));
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .nnh, :scope > .drug-table-wrap, :scope > details > p, :scope > details > ul, :scope > details > .drug-table-wrap").forEach((el) => {
        if (el.tagName === "P") lines.push(el.textContent.trim());
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else if (el.classList.contains("nnh")) lines.push(Array.from(el.children).map((x) => x.textContent.trim()).join(": "));
        else el.querySelectorAll("tbody tr").forEach((tr) => lines.push("  * " + Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim()).join(" — ")));
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  update();
})();
