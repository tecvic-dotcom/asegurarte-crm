/* Dinero Bajo Control — service worker: funciona sin conexión. Sube VERSION cuando cambie algún archivo. */
const VERSION = "msf-v6";
const ARCHIVOS = ["index.html", "motor.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero lo guardado (abre al instante, aun sin red) y por detrás se actualiza para la próxima vez.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const red = fetch(req).then((r) => { if (r && r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone())); return r; }).catch(() => hit);
      return hit || red;
    })
  );
});
