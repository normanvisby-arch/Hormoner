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
  // Tekst for børnedosis: "250 mg × 3 dagligt (50 mg/kg/døgn)".
  function boernetekst(vaegt, mgKgDoegn, doser, maksMg, tillaeg, trin) {
    const d = boernedosis(vaegt, mgKgDoegn, doser, maksMg, trin);
    const basis = doser === 1 ? `${mgKgDoegn} mg/kg × 1 dagligt` : `${mgKgDoegn} mg/kg/døgn fordelt på ${doser} doser`;
    if (!d) return `${basis}${tillaeg ? " " + tillaeg : ""} — angiv vægt for at beregne dosis.`;
    return `${d.mg} mg × ${doser} dagligt (${basis}${d.maks ? "; maks. voksendosis" : ""})${tillaeg ? " " + tillaeg : ""}.`;
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

  return { output, valg, num, radio, checked, fmt, box, collapsible, ul, boernedosis, boernetekst, gruppe, drugTable, planLinjer };
};
