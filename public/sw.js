// Minimal service worker — enables "Add to Home Screen" (PWA) and offline
// loading of the app shell. Network-first so updates always win; cache is a
// fallback when offline. Bump CACHE on each release to invalidate.
const CACHE = 'nkgame-v1';
const SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/game.js',
  '/js/rtc.js',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Never cache signaling/config — they must be live.
  if (e.request.url.includes('/config.js') || e.request.url.startsWith('ws')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
