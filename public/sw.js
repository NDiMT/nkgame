const CACHE = 'castle-v1';
const SHELL = ['./','index.html','css/style.css','js/main.js','js/game.js','js/audio.js','manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e => { if (e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin) return; e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c)).catch(()=>{});return r;}).catch(()=>caches.match(e.request))); });
