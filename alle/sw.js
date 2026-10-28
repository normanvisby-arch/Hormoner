/*
 * Service worker for den samlede app (alle apps): gemmer alle filer, så appen virker uden
 * internet. Netværket prøves først, så opdateringer slår igennem ved næste
 * åbning med forbindelse. Hæv VERSION, når filer tilføjes eller ændres.
 */
const VERSION = "v7";
const CACHE = `alle-${VERSION}`;
const FILES = [
  "./",
  "index.html",
  "registrer.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "../pwa.js",
  "../icons/icon.svg",
  "../hjerte/icons/icon.svg",
  "../lunge/icons/icon.svg",
  "../thyreoidea/icons/icon.svg",
  "../diabetes/icons/icon.svg",
  "../infektion/icons/icon.svg",
  "../nyre/icons/icon.svg",
  "../svangre/icons/icon.svg",
  "../psyke/icons/icon.svg",
  "../boern/icons/icon.svg",
  "../kraeft/icons/icon.svg",
  "../restordre/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("alle-") && k !== CACHE).map((k) => caches.delete(k))))
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
