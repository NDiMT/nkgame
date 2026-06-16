// Service worker — PWA install + offline. Network-first (updates win), cache
// fallback. Relative URLs so it works under a GitHub Pages subpath.
const CACHE = 'dungeoncards-v3';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/engine.js', 'js/data.js', 'js/audio.js', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)).catch(() => {}); return res; })
      .catch(() => caches.match(e.request))
  );
});
