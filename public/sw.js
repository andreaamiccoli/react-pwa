const CACHE_NAME = 'react-pwa-cache-v2'; // Aggiornato per forzare il download della nuova versione

// File statici stabili da salvare subito in cache
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Evento di installazione: pre-cache dell'index e del manifest
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Evento di attivazione: pulizia vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Rimozione vecchia cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Evento di Fetch: strategia "Network First, falling back to Cache"
// Salva in cache tutti gli asset (compresi i JS/CSS compilati da Vite) man mano che vengono caricati
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se la risposta è valida ed è dello stesso dominio, la salviamo in cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se siamo offline, recuperiamo la risorsa dalla cache locale
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se la risorsa non è in cache e si richiede una pagina HTML, mostriamo l'index
          if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
