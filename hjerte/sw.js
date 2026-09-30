/*
 * Service worker for hjerte-appen: gemmer alle filer, så appen virker uden
 * internet. Netværket prøves først, så opdateringer slår igennem ved næste
 * åbning med forbindelse. Hæv VERSION, når filer tilføjes eller ændres.
 */
const VERSION = "v8";
const CACHE = `hjertekar-${VERSION}`;
const FILES = [
  "./",
  "index.html",
  "cvrisiko.html",
  "cvrisiko.js",
  "af.html",
  "af.js",
  "huskeskema.html",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "../style.css",
  "../pwa.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("hjertekar-") && k !== CACHE).map((k) => caches.delete(k))))
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
