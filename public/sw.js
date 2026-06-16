// Minimal service worker — enables "Add to Home Screen" (PWA) and offline
// loading of the app shell. Network-first so updates always win; cache is a
// fallback when offline. Relative URLs so it works under any base path
// (e.g. GitHub Pages project sites at /<repo>/). Bump CACHE on each release.
const CACHE = 'nkgame-v4';
const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'js/game.js',
  'js/rtc.js',
  'js/audio.js',
  'js/config.js',
  'assets/cover.jpg',
  'assets/bg.jpg',
  'assets/paper.jpg',
  'manifest.webmanifest',
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
  // Only handle same-origin GETs; let the PeerJS broker (cross-origin) pass through.
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
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
