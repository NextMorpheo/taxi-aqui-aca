const CACHE_NAME = 'taxiaquiaca-cliente-v3';
const ARCHIVOS_CORE = [
  './', './index.html', './manifest.json',
  './js/main-cliente.js', './js/tarifas-cliente.js', './js/gps-cliente.js', './js/policies.js',
  './js/live-tracking-cliente.js',
  '../icon-192.jpg', '../icon-512.jpg', '../tarifas.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const copia = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return res;
      }).catch(() => cached);
    })
  );
});
