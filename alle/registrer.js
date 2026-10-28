// Gør alle apps klar til brug uden internet: registrerer service workeren for
// hver app (de har hver sit område), så deres filer hentes ved første besøg.
// Bruges af den samlede app (alle/index.html) og downloadsiden (apps.html).
(function () {
  "use strict";
  var MAPPER = ["", "hjerte/", "lunge/", "thyreoidea/", "diabetes/", "infektion/", "nyre/", "svangre/", "psyke/", "boern/", "kraeft/", "restordre/", "alle/"];
  var status = function (t) {
    var el = document.getElementById("offlineStatus");
    if (el) el.textContent = t;
  };
  if (!("serviceWorker" in navigator) || !(location.protocol === "https:" || location.hostname === "localhost")) {
    status("");
    return;
  }
  var rod = new URL("../", document.currentScript.src).href;
  // Venter, til en service worker er aktiv (dvs. dens filer er gemt).
  var klar = function (reg) {
    return new Promise(function (ok) {
      if (reg.active && !reg.installing && !reg.waiting) return ok(true);
      var sw = reg.installing || reg.waiting;
      if (!sw) return ok(!!reg.active);
      sw.addEventListener("statechange", function () {
        if (sw.state === "activated") ok(true);
        if (sw.state === "redundant") ok(false);
      });
    });
  };
  window.addEventListener("load", function () {
    status("Henter alle apps til brug uden internet …");
    Promise.all(MAPPER.map(function (m) {
      return navigator.serviceWorker.register(rod + m + "sw.js", { scope: rod + m }).then(klar, function () { return false; });
    })).then(function (res) {
      var n = res.filter(Boolean).length;
      status(n === MAPPER.length ? "Alle apps virker nu også uden internet." : "Nogle apps er endnu ikke klar uden internet — åbn siden igen med forbindelse.");
      document.documentElement.dataset.offlineKlar = String(n);
    });
  });
})();
