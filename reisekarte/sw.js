/* Offline-Speicher der Reisekarte.
   Die Seite selbst kommt immer zuerst frisch aus dem Netz (ohne Netz aus dem Speicher).
   Karte, Erdbild und Flaggen kommen sofort aus dem Speicher und werden im Hintergrund aufgefrischt.
   Die Anmeldung und deine Länder laufen direkt über Supabase und werden hier nicht angefasst. */
const CACHE = "reisekarte-v1";
const CORE = ["./", "world.json", "earth.jpg", "flags.json", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
const LIBS = /^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k.split("-")[0] === CACHE.split("-")[0]).map(k => caches.delete(k)))));
  self.clients.claim();
});
function put(key, res) {
  if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
  return res;
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => put("./", res)).catch(() => caches.match("./")));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => put(req, res)).catch(() => hit);
      return hit || fresh;
    }));
    return;
  }
  if (LIBS.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res))));
  }
});
