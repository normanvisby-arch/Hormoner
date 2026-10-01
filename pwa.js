// Registrerer service workeren, så værktøjerne kan installeres som app og virker offline.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// "Installér som app"-knap (Chrome/Edge på computer og Android). Knapper med
// data-install vises kun, når browseren tilbyder installation.
(function () {
  let prompt = null;
  const knapper = () => document.querySelectorAll("[data-install]");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    knapper().forEach((b) => (b.hidden = false));
  });
  window.addEventListener("appinstalled", () => {
    prompt = null;
    knapper().forEach((b) => (b.hidden = true));
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-install]");
    if (!b || !prompt) return;
    prompt.prompt();
    prompt.userChoice.finally(() => {
      prompt = null;
      knapper().forEach((k) => (k.hidden = true));
    });
  });
})();

// Åbnet fra downloadsiden (apps.html → …#installer): vis vejledningen og knappen tydeligt.
if (location.hash === "#installer") {
  window.addEventListener("load", () => {
    const knap = document.querySelector("[data-install]");
    const boks = knap && (knap.closest(".note, .topbar-actions") || knap.parentElement);
    if (!boks) return;
    boks.style.outline = "3px solid currentColor";
    boks.style.outlineOffset = "4px";
    boks.scrollIntoView({ block: "center" });
  });
}
