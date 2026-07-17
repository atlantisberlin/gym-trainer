const CACHE = 'gym-trainer-v5.0.0';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/state.js',
  './js/util.js',
  './js/icons.js',
  './js/charts.js',
  './js/components.js',
  './js/data/exercises.js',
  './js/data/templates.js',
  './js/views/home.js',
  './js/views/player.js',
  './js/views/plans.js',
  './js/views/stats.js',
  './js/views/history.js',
  './js/views/settings.js',
  './fonts/archivo-var.woff2',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first, Netz als Fallback; Navigation fällt offline auf die App zurück
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached =>
      cached ||
      fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
