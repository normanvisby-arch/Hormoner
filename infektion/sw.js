/*
 * Service worker for infektioner-appen: gemmer alle filer, så appen virker uden
 * internet. Netværket prøves først, så opdateringer slår igennem ved næste
 * åbning med forbindelse. Hæv VERSION, når filer tilføjes eller ændres.
 */
const VERSION = "v1";
const CACHE = `infektion-${VERSION}`;
const FILES = [
  "./",
  "index.html",
  "luftveje.html",
  "luftveje.js",
  "urinveje.html",
  "urinveje.js",
  "hud.html",
  "hud.js",
  "ab.js",
  "huskeskema.html",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "../style.css",
  "../pwa.js",
  "../valg.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("infektion-") && k !== CACHE).map((k) => caches.delete(k))))
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
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")))
  );
});
