/*
 * Service worker: gemmer alle værktøjets filer, så appen også virker uden
 * internet. Netværket prøves først, så en opdatering slår igennem ved næste
 * åbning med forbindelse; uden forbindelse bruges den gemte kopi.
 * Hæv VERSION, når filer tilføjes eller fjernes fra listen.
 */
const VERSION = "v7";
const CACHE = `klinikvaerktoejer-${VERSION}`;
const FILES = [
  "./",
  "oversigt.html",
  "index.html",
  "risiko.html",
  "huskeskema.html",
  "praevention.html",
  "mrs.html",
  "osteoporose.html",
  "fraktur.html",
  "osteoplan.html",
  "osteohuskeskema.html",
  "bloedningskalender.html",
  "style.css",
  "app.js",
  "risiko.js",
  "praevention.js",
  "mrs.js",
  "osteoporose.js",
  "fraktur.js",
  "osteoplan.js",
  "bloedningskalender.js",
  "valg.js",
  "pwa.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("klinikvaerktoejer-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("oversigt.html")))
  );
});
