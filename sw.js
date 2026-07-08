// ═══════════════════════════════════════════════════════════
// sw.js — Service Worker para uso offline.
// NOTA: el index.html original hacía referencia a "./sw.js" pero
// el archivo no estaba incluido en el proyecto. Sin él, el navegador
// nunca podía instalar la PWA correctamente ni funcionar sin señal.
// ═══════════════════════════════════════════════════════════
const CACHE_NAME = 'taxiaquiaca-v1';
const ARCHIVOS_CORE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './icon-192.jpg',
  './icon-512.jpg',
  './logo-header.jpg',
  './js/db.js',
  './js/config.js',
  './js/state.js',
  './js/toast.js',
  './js/modal.js',
  './js/ui.js',
  './js/gps.js',
  './js/turno.js',
  './js/colectivo.js',
  './js/cotizador.js',
  './js/mecanico.js',
  './js/finanzas.js',
  './js/exportar.js',
  './js/ajustes.js',
  './js/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_CORE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Estrategia: cache-first para archivos propios (funcionan sin señal),
// network-first implícito para todo lo externo (OSRM, Nominatim, jsPDF)
// ya que esas peticiones no pasan por aquí si fallan — el propio código
// de cotizador.js ya tiene manejo de errores para cuando no hay internet.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // no interceptar APIs externas

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
