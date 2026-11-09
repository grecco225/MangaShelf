const CACHE_NAME = 'mangashelf-pwa-v3.5.0';
const USER_DOWNLOADS_CACHE = 'mangashelf-user-downloads-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './src/data/demoCatalog.js',
  './src/utils/ArchiveParser.js',
  './src/storage/IndexedDbService.js',
  './src/providers/SourceProvider.js',
  './src/storage/StorageService.js',
  './src/app.js',
  './samples/demo-comic-espacial.cbz',
  './samples/demo-leyenda-astral.epub'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== USER_DOWNLOADS_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Network-first para mantener siempre actualizada la interfaz y las respuestas de MangaDex API,
  // con fallback inmediato a caché cuando no hay conexión.
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
          return null;
        })
      )
  );
});
