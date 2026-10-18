/*
 * MR-columna i 3D: tolker MR-beskrivelsen (mr.js), viser fundene som en redigerbar liste og
 * sender dem til 3D-visningen (visning.js). Al behandling sker i browseren.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const EKSEMPEL = "MR af columna lumbalis.\nL3/L4: Let diskusbuling. Ingen stenose.\nL4/L5: Diskusdegeneration med let reduceret diskushøjde. Venstresidig paracentral diskusprolaps (ekstrusion), der komprimerer venstre L5-rod i recessus. Let foraminal stenose bilateralt. Facetledsartrose.\nL5/S1: Moderat foraminal stenose til højre. Ingen rodpåvirkning.";
  const NAVN = {
    prolaps: "Diskusprolaps", bulging: "Diskusbuling (bulging)", spinalstenose: "Central spinalstenose", recesstenose: "Recesstenose",
    foraminalstenose: "Foraminal stenose", facetartrose: "Facetledsartrose", flavumhypertrofi: "Flavumhypertrofi", rod: "Nerverod",
  };
  const MED_SIDE = ["prolaps", "recesstenose", "foraminalstenose", "facetartrose", "rod"];
  const MED_GRAD = ["spinalstenose", "recesstenose", "foraminalstenose", "facetartrose", "prolaps"];
  const VIST = MR.NIVEAUER;            // L3/L4, L4/L5 og L5/S1 er modelleret
  let fund = [];
  let negerede = [];
  let n = 0;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const vaelg = (felt, f, valg) =>
    `<select data-felt="${felt}" data-id="${f.id}" aria-label="${felt}">${valg.map(([v, t]) => `<option value="${v}"${String(f[felt] ?? "") === v ? " selected" : ""}>${t}</option>`).join("")}</select>`;

  function tolk() {
    const t = $("mrTekst").value;
    $("cprAdvarsel").hidden = !/(?<!\d)\d{6}[- ]?\d{4}(?!\d)/.test(t);
    const r = MR.tolk(t);
    fund = r.fund.map((f) => Object.assign({ vis: true }, f));
    negerede = r.negerede;
    opdater();
  }

  function etiket(f) {
    if (f.type === "andet") return f.navn;
    if (f.type === "rod") return `${f.rod || "?"}-rod`;
    return NAVN[f.type] || f.type;
  }

  function tegnListe() {
    const el = $("fundListe");
    if (!fund.length) {
      el.innerHTML = `<p class="field-hint">${$("mrTekst").value.trim() ? "Ingen fund genkendt — tilføj dem nedenfor." : "Indsæt en beskrivelse, eller tilføj fund nedenfor."}</p>`;
      return;
    }
    el.innerHTML = fund.map((f) => {
      const vises = VIST.includes(f.niveau) && f.type !== "andet";
      const kontrol = [];
      if (f.type !== "andet") {
        const niv = [...VIST, ...(f.niveau && !VIST.includes(f.niveau) ? [f.niveau] : [])];
        kontrol.push(vaelg("niveau", f, [["", "niveau?"], ...niv.map((x) => [x, x])]));
      }
      if (f.type === "prolaps") {
        kontrol.push(vaelg("prolapstype", f, [["", "type?"], ["protrusion", "protrusion"], ["ekstrusion", "ekstrusion"], ["sekvester", "sekvester"]]));
        kontrol.push(vaelg("zone", f, [["", "zone?"], ["central", "central"], ["paracentral", "paracentral"], ["foraminal", "foraminal"], ["ekstraforaminal", "ekstraforaminal"]]));
      }
      if (f.type === "rod") {
        kontrol.push(vaelg("rod", f, [["", "rod?"], ["L4", "L4"], ["L5", "L5"], ["S1", "S1"]]));
        kontrol.push(vaelg("rodgrad", f, [["", "grad?"], ["1", "kontakt"], ["2", "påvirket"], ["3", "klemt"]]));
      }
      if (MED_SIDE.includes(f.type) && !(f.type === "prolaps" && f.zone === "central")) kontrol.push(vaelg("side", f, [["", "side?"], ["v", "venstre"], ["h", "højre"], ["begge", "begge"]]));
      if (MED_GRAD.includes(f.type)) kontrol.push(vaelg("grad", f, f.type === "prolaps" ? [["", "størrelse?"], ["1", "lille"], ["2", "middel"], ["3", "stor"]] : [["", "grad?"], ["1", "let"], ["2", "moderat"], ["3", "svær"]]));
      return `<div class="ryg-fund-raekke${f.vis && vises ? "" : " ryg-fund-skjult"}">
        <label class="checkbox"><input type="checkbox" data-vis="${f.id}"${f.vis ? " checked" : ""}${vises ? "" : " disabled"}> <strong>${esc(etiket(f))}</strong></label>
        <span class="tag ${vises ? "tag-ok" : "tag-alt"}">${esc(f.niveau || "niveau?")}</span>
        ${vises ? "" : `<span class="field-hint">${f.type === "andet" ? "vises ikke i modellen" : "kun L3/L4–L5/S1 vises i modellen"}</span>`}
        <span class="ryg-fund-valg">${kontrol.join("")}</span>
        ${f.kilde ? `<div class="field-hint ryg-kilde">Fra teksten: “${esc(f.kilde)}”</div>` : ""}
        <button type="button" class="btn btn-small btn-outline ryg-fjern" data-fjern="${f.id}" aria-label="Fjern fund">Fjern</button>
      </div>`;
    }).join("");
  }

  function aktive() {
    return fund.filter((f) => f.vis);
  }

  function opdater() {
    tegnListe();
    const valgte = aktive();
    const res = MR.model(valgte, negerede);
    // Fokus og snit på det vigtigste fund: niveau, side og afstand fra midtlinjen
    const p = valgte.find((f) => VIST.includes(f.niveau) && ["prolaps", "recesstenose", "foraminalstenose"].includes(f.type));
    const fokus = (p || valgte.find((f) => VIST.includes(f.niveau) && f.type !== "andet") || {}).niveau || "L4/L5";
    const side = p && p.side === "h" ? -1 : 1;
    const x = !p ? 0 : p.type === "prolaps" ? { central: 0, paracentral: 0.007, foraminal: 0.015, ekstraforaminal: 0.015 }[p.zone || "paracentral"] : p.type === "recesstenose" ? 0.009 : 0.015;
    const snit = 0.5 + (side * x) / 0.03;
    if (window.RygVisning) window.RygVisning.saet(res, { snitSide: side, snit, niveau: fokus });
    else window.__rygVenter = [res, { snitSide: side, snit, niveau: fokus }];
    // Noter til lægen
    const noter = [...res.noter];
    const andre = valgte.filter((f) => f.niveau && !VIST.includes(f.niveau) && f.type !== "andet");
    if (andre.length) noter.push(`Fund på ${[...new Set(andre.map((f) => f.niveau))].join(", ")} vises kun i listen og forklaringen — 3D-modellen viser L3/L4 til L5/S1.`);
    const niveauer = [...new Set(valgte.filter((f) => VIST.includes(f.niveau) && f.type !== "andet").map((f) => f.niveau))];
    if (niveauer.length > 1) noter.push(`Fund på flere niveauer (${niveauer.join(", ")}) — kameraet og snittene er sat på ${fokus}. Drej modellen for at se de andre.`);
    if (valgte.some((f) => !f.niveau)) noter.push("Et eller flere fund mangler niveau — de vises ikke i modellen.");
    $("noter").innerHTML = noter.map((t) => `<p class="udfyld-fra">${esc(t)}</p>`).join("");
    // Forklaring til patienten
    const linjer = MR.forklaring(valgte.filter((f) => f.type !== "rod" || f.rod));
    $("forklaring").innerHTML = linjer.length
      ? `<ul>${linjer.map((l) => `<li>${esc(l.t)}</li>`).join("")}</ul><p class="field-hint">Mange af disse forandringer ses også hos personer uden rygsmerter. Billedet viser, hvor fundene sidder — ikke hvor ondt det gør.</p>`
      : `<p class="field-hint">Forklaringen skrives ud fra fundene.</p>`;
  }

  function nytFund(type) {
    const f = { id: "m" + ++n, type, niveau: (window.RygVisning && window.RygVisning.niveau) || "L4/L5", vis: true, side: null, grad: null, kilde: "" };
    if (type === "prolaps") Object.assign(f, { zone: "paracentral", side: "v", prolapstype: "protrusion" });
    if (type === "facetartrose" || type === "flavumhypertrofi") f.side = "begge";
    if (type === "rod") Object.assign(f, { rod: "L5", side: "v", rodgrad: 3 });
    fund.push(f);
    opdater();
  }

  $("tolkBtn").addEventListener("click", tolk);
  $("eksempelBtn").addEventListener("click", () => { $("mrTekst").value = EKSEMPEL; tolk(); });
  $("rydBtn").addEventListener("click", () => { $("mrTekst").value = ""; fund = []; negerede = []; $("cprAdvarsel").hidden = true; opdater(); });
  let tid = null;
  $("mrTekst").addEventListener("input", () => { clearTimeout(tid); tid = setTimeout(tolk, 500); });
  $("mrTekst").addEventListener("paste", () => setTimeout(tolk, 0));
  $("tilfoejValg").addEventListener("change", (e) => { if (e.target.value) nytFund(e.target.value); e.target.value = ""; });
  $("fundListe").addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.vis) { const f = fund.find((x) => x.id === t.dataset.vis); f.vis = t.checked; opdater(); return; }
    if (t.dataset.felt) {
      const f = fund.find((x) => x.id === t.dataset.id);
      const v = t.value === "" ? null : ["grad", "rodgrad"].includes(t.dataset.felt) ? Number(t.value) : t.value;
      f[t.dataset.felt] = v;
      opdater();
    }
  });
  $("fundListe").addEventListener("click", (e) => {
    const id = e.target.dataset && e.target.dataset.fjern;
    if (id) { fund = fund.filter((f) => f.id !== id); opdater(); }
  });
  window.addEventListener("ryg-visning-klar", () => { if (window.__rygVenter) window.RygVisning.saet(...window.__rygVenter); });

  window.RygUI = { tolk, fund: () => fund, opdater };
  opdater();
})();
