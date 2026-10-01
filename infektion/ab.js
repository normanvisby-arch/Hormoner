/*
 * Fælles for infektion-appen: sidens knapper (udskriv, nulstil, kopiér),
 * formularhjælpere, børnedosis efter vægt og behandlingstabeller med
 * "Vælg til journal" (valg.js). Doserne står i de enkelte sider.
 */
window.AB = function (opts) {
  "use strict";
  const form = document.querySelector(".form-panel");
  const output = document.getElementById("output");
  const copyStatus = document.getElementById("copyStatus");
  const printBtn = document.getElementById("printBtn");
  const printMeta = document.getElementById("printMeta");
  const valg = Behandlingsvalg(output);

  form.addEventListener("input", opts.update);
  form.addEventListener("change", opts.update);
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const now = new Date();
      if (printMeta) printMeta.textContent = "Genereret " + now.toLocaleDateString("da-DK") + " kl. " + now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }) + " — baseret på de indtastede værdier.";
      window.print();
    });
  }
  window.addEventListener("beforeprint", () => output.querySelectorAll("details").forEach((d) => (d.open = true)));
  document.getElementById("resetBtn").addEventListener("click", () => {
    form.reset();
    valg.nulstil();
    opts.update();
  });

  function copyText(text) {
    const done = () => {
      copyStatus.textContent = "Kopieret ✓";
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    };
    const fail = () => (copyStatus.textContent = "Kunne ikke kopiere — markér og kopiér manuelt.");
    try {
      navigator.clipboard.writeText(text).then(done, fail);
    } catch (e) {
      fail();
    }
  }
  document.getElementById("copyBtn").addEventListener("click", () => copyText(opts.journal()));
  document.getElementById("copyFullBtn").addEventListener("click", () => copyText(fullText()));

  function fullText() {
    const lines = [];
    output.querySelectorAll(".box").forEach((boxEl) => {
      const h3 = boxEl.querySelector("h3");
      if (h3) lines.push(h3.textContent.trim().toUpperCase());
      boxEl.querySelectorAll(":scope > p, :scope > ul, :scope > .drug-table-wrap, :scope > details > p, :scope > details > ul, :scope > details > .drug-table-wrap").forEach((el) => {
        if (el.tagName === "P") lines.push(el.textContent.trim());
        else if (el.tagName === "UL") el.querySelectorAll("li").forEach((li) => lines.push("- " + li.textContent.trim().replace(/\s+/g, " ")));
        else el.querySelectorAll("tbody tr").forEach((tr) => lines.push("  * " + Array.from(tr.querySelectorAll("td")).map(Behandlingsvalg.cellText).join(" — ")));
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  const num = (id) => {
    const el = document.getElementById(id);
    const v = el ? el.value : "";
    return v === "" ? NaN : parseFloat(v.replace(",", "."));
  };
  const radio = (name) => (document.querySelector(`input[name="${name}"]:checked`) || {}).value;
  const checked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const fmt = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  const box = (cls, title, body) => `<div class="box ${cls}"><h3>${title}</h3>${body}</div>`;
  const collapsible = (cls, title, body) => `<div class="box ${cls} box-collapsible"><details><summary><h3>${title}</h3></summary>${body}</details></div>`;
  const ul = (items) => `<ul class="followup-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  // Børn under 40 kg doseres efter vægt; enkeltdosis rundes af (under 100 mg til
  // nærmeste 5 mg, ellers 25 mg) og overstiger aldrig voksendosis.
  const rund = (mg) => (mg < 100 ? Math.round(mg / 5) * 5 : Math.round(mg / 25) * 25);
  // trin: afrund til en tablet- eller kapselstyrke (fx 250 mg), der ikke kan deles.
  function boernedosis(vaegt, mgKgDoegn, doser, maksMg, trin) {
    if (!(vaegt > 0)) return null;
    const raa = (vaegt * mgKgDoegn) / doser;
    const mg = trin ? Math.max(trin, Math.round(raa / trin) * trin) : rund(raa);
    return { mg: Math.min(mg, maksMg), maks: raa >= maksMg };
  }
  // "barn" = under 12 år eller under 40 kg; "voksen" ellers. Ukendt alder og
  // vægt behandles som voksen, men siden beder om alder.
  function gruppe(alder, vaegt) {
    if ((!isNaN(alder) && alder < 12) || (!isNaN(vaegt) && vaegt < 40)) return "barn";
    return "voksen";
  }
  // Tekst for børnedosis: "250 mg × 3 dagligt (50 mg/kg/døgn)". mik = { key, dage } tilføjer
  // mikstur med dosis i ml og den pakning, der rækker til hele kuren.
  function boernetekst(vaegt, mgKgDoegn, doser, maksMg, tillaeg, trin, mik) {
    const d = boernedosis(vaegt, mgKgDoegn, doser, maksMg, trin);
    const basis = doser === 1 ? `${mgKgDoegn} mg/kg × 1 dagligt` : `${mgKgDoegn} mg/kg/døgn fordelt på ${doser} doser`;
    if (!d) return `${basis}${tillaeg ? " " + tillaeg : ""} — angiv vægt for at beregne dosis.`;
    const m = mik ? miksturtekst(mik.key, vaegt, mgKgDoegn, doser, maksMg, mik.dage) : "";
    return `${d.mg} mg × ${doser} dagligt (${basis}${d.maks ? "; maks. voksendosis" : ""})${tillaeg ? " " + tillaeg : ""}.${m}`;
  }

  // ---------------------------------------------------------------------
  // Mikstur: styrke, dosis i ml og pakning til hele kuren
  // ---------------------------------------------------------------------
  // Danske præparater (indlægssedler og produktresuméer, 2023–2026). Pakning = ml færdig mikstur;
  // holdbar = dage efter opblanding. Udbud og pakninger ændrer sig — tjek pro.medicin.dk.
  const MIKSTURER = {
    penv: { navn: "Penicillin V", styrker: [{ mgMl: 50, produkter: [{ navn: "Primcillin", ml: [100, 200], holdbar: 10, opbevaring: "køleskab" }, { navn: "Primve", ml: [125, 200], holdbar: 14, opbevaring: "køleskab" }] }], note: "Smager bittert — knuste tabletter i lidt mad giver et mindre volumen." },
    clari: { navn: "Clarithromycin", styrker: [{ mgMl: 25, produkter: [{ navn: "Klacid", ml: [50, 100], holdbar: 14, opbevaring: "stuetemperatur, ikke køleskab" }] }, { mgMl: 50, produkter: [{ navn: "Klacid", ml: [60, 100], holdbar: 14, opbevaring: "stuetemperatur, ikke køleskab" }] }] },
    fluclox: { navn: "Flucloxacillin", form: "oral opløsning", styrker: [{ mgMl: 50, produkter: [{ navn: "Nerbutix", ml: [100], holdbar: 7, opbevaring: "køleskab" }] }], note: "Leveres med 3 ml doseringssprøjte.", sproejte: 3 },
    azi: { navn: "Azithromycin", styrker: [{ mgMl: 40, produkter: [{ navn: "Zitromax", ml: [15, 22.5], holdbar: 5, opbevaring: "højst 30 °C" }] }] },
  };
  const SPILD = 1.1; // ca. 10 % ekstra til spild ved udmåling og i flasken
  const fmtMl = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  // Dosis i ml: 0,1 ml under 5 ml (doseringssprøjte), ellers 0,5 ml — aldrig over maksimaldosis.
  function mlDosis(mg, mgMl, maksMg) {
    const raa = mg / mgMl;
    const trin = raa >= 5 ? 0.5 : 0.1;
    let ml = Math.max(trin, Math.round(raa / trin) * trin);
    if (ml * mgMl > maksMg + 1e-9) ml = Math.floor(maksMg / mgMl / trin) * trin;
    return Math.round(ml * 10) / 10;
  }
  // Billigste kombination af flasker (mindst samlet volumen, dernæst færrest flasker), højst 6 flasker.
  function pakning(storrelser, behov) {
    let bedst = null;
    const proev = (i, valgt) => {
      const n = valgt.length;
      const sum = valgt.reduce((a, b) => a + b, 0);
      if (sum >= behov) {
        if (!bedst || sum < bedst.sum - 1e-9 || (Math.abs(sum - bedst.sum) < 1e-9 && n < bedst.flasker.length)) bedst = { sum, flasker: valgt.slice() };
        return;
      }
      if (n >= 6) return;
      for (let j = i; j < storrelser.length; j++) proev(j, valgt.concat(storrelser[j]));
    };
    proev(0, []);
    return bedst;
  }
  const flaskeTekst = (b) => {
    const t = {};
    b.flasker.forEach((ml) => (t[ml] = (t[ml] || 0) + 1));
    return Object.keys(t).sort((a, c) => c - a).map((ml) => `${t[ml]} × ${fmtMl(+ml)} ml`).join(" + ");
  };
  function mikstur(key, vaegt, mgKgDoegn, doser, maksMg, dage) {
    const m = MIKSTURER[key];
    if (!m || !(vaegt > 0)) return null;
    const mg = (vaegt * mgKgDoegn) / doser;
    // Styrke: den laveste, der giver højst 5 ml pr. dosis; ellers den stærkeste.
    const styrke = m.styrker.find((x) => mlDosis(mg, x.mgMl, maksMg) <= 5) || m.styrker[m.styrker.length - 1];
    const ml = mlDosis(mg, styrke.mgMl, maksMg);
    const kur = ml * doser * dage;
    const behov = kur * SPILD;
    const forslag = styrke.produkter
      .map((p) => ({ p, b: pakning(p.ml, behov) }))
      .filter((x) => x.b)
      .sort((a, c) => a.b.sum - c.b.sum || a.b.flasker.length - c.b.flasker.length);
    return { m, styrke, ml, mg: Math.round(ml * styrke.mgMl * 10) / 10, kur, behov, forslag, dage, doser };
  }
  function miksturtekst(key, vaegt, mgKgDoegn, doser, maksMg, dage) {
    const x = mikstur(key, vaegt, mgKgDoegn, doser, maksMg, dage);
    if (!x) return "";
    // Samme flasker fra flere præparater skrives én gang: "1 × 200 ml (Primcillin eller Primve)".
    const grupper = [];
    x.forslag.forEach((f) => {
      const t = flaskeTekst(f.b);
      const g = grupper.find((y) => y.t === t);
      if (g) g.navne.push(f.p.navn);
      else grupper.push({ t, navne: [f.p.navn] });
    });
    const pak = grupper.length ? grupper.map((g, i) => `${i === 0 ? "<strong>" : ""}${g.t} (${g.navne.join(" eller ")})${i === 0 ? "</strong>" : ""}`).join(" eller ") : "ingen kendt pakning rækker — se pro.medicin.dk";
    const holdbar = [...new Set(x.styrke.produkter.map((p) => p.holdbar))];
    const kortest = Math.min(...holdbar);
    const holdTekst = `Holdbar ${holdbar.length > 1 ? `${Math.min(...holdbar)}–${Math.max(...holdbar)}` : kortest} dage efter opblanding (${x.styrke.produkter[0].opbevaring}).`;
    const forKort = x.dage > kortest ? ` <strong>Kuren (${x.dage} dage) er længere end holdbarheden (${kortest} dage)</strong> — vælg præparatet med længst holdbarhed, eller bed apoteket blande en ny flaske undervejs.` : "";
    const stor = (x.ml > 15 ? " Stort volumen — tabletter er ofte lettere." : "") + (x.m.sproejte && x.ml > x.m.sproejte ? ` Dosis over ${x.m.sproejte} ml: sprøjten fyldes ${Math.ceil(x.ml / x.m.sproejte)} gange.` : "");
    return ` <span class="mik"><br><strong>Mikstur:</strong> ${x.m.navn} ${x.m.form || "mikstur"} ${x.styrke.mgMl} mg/ml — <strong>${fmtMl(x.ml)} ml</strong> (${fmtMl(x.mg)} mg) × ${x.doser} dagligt. Til ${x.dage} dage: ${fmtMl(x.kur)} ml + ca. 10 % spild → ${pak}. ${holdTekst}${forKort}${stor}${x.m.note ? " " + x.m.note : ""}</span>`;
  }

  function drugTable(list, head) {
    const h = head || ["Præparat", "Dosering", "Bemærkning"];
    return `<div class="drug-table-wrap"><table class="drug-table stack-mobile"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${list
      .map((r) => `<tr><td>${r.navn}<span class="tag ${r.rec ? "tag-recommend" : "tag-alt"}">${r.tag}</span>${valg.radio(r.key)}</td><td data-label="${h[1]}">${r.dosering}</td><td data-label="${h[2]}">${r.note || ""}</td></tr>`)
      .join("")}</tbody></table></div>`;
  }

  // Plan-linjer til journalnotatet: den valgte række eller alle anbefalede.
  function planLinjer() {
    const v = valg.valgtRaekke();
    const rows = v ? [v] : Array.from(output.querySelectorAll(".tag-recommend")).map((t) => t.closest("tr")).filter(Boolean);
    return rows.map((tr) => {
      const r = Behandlingsvalg.raekkeTekst(tr);
      return `${v ? "Valgt behandling" : "Plan"}: ${r.navn} — ${r.celler[0]}`;
    });
  }

  return { output, valg, num, radio, checked, fmt, box, collapsible, ul, boernedosis, boernetekst, mikstur, gruppe, drugTable, planLinjer };
};
