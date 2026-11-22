/* Punktlandung – Service Worker: App offline verfügbar machen, Mitteilungen anzeigen.
   Läuft unter diox-f.github.io/apps/punktlandung/. Alle Pfade gelten relativ zu diesem Ordner. */
const VERSION = "pl-9";
const BASE = self.registration.scope;
const u = (p) => new URL(p, BASE).href;
const SHELL = ["./", "index.html", "vendor/supabase.js", "manifest.webmanifest", "bg.jpg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"].map(u);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  /* Nur eigene alte Speicher löschen: unter derselben Adresse liegen auch andere Apps */
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k.indexOf("pl-") === 0).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;
  // Seite selbst: erst Netz (für Updates), sonst Speicher
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(u("index.html"), c)); return r; }).catch(() => caches.match(u("index.html"))));
    return;
  }
  // Schriften und eigene Dateien: Speicher zuerst, im Hintergrund auffrischen
  if (req.url.indexOf(BASE) === 0 || url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) {
    e.respondWith(caches.open(VERSION).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Punktlandung", {
    body: d.body || "",
    tag: d.tag || "pl",
    icon: u("icons/icon-192.png"),
    badge: u("icons/badge-96.png"),
    data: { url: u(d.url || "#heute") }
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || u("#heute");
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.indexOf(BASE) === 0 && "focus" in c) { c.navigate(target).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
