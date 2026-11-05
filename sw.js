/* ========================================
   WUUspor — Service Worker (sw.js)
   Uygulama kabuğu önbelleği, çevrimdışı çalışma ve otomatik güncelleme.
   ======================================== */

const CACHE_NAME = 'wuuspore-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/screens.css',
  '/css/pwa.css',
  '/js/data.js',
  '/js/app.js',
  '/js/tabs.js',
  '/js/first-launch.js',
  '/js/pwa.js',
  '/manifest.webmanifest'
];

// Kurulum: uygulama kabuğunu önbelleğe al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Etkinleştirme: eski önbellekleri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch: önce ağdan, yoksa önbellekten
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Uygulama kabuğu dosyaları için cache-first
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request);
      })
    );
    return;
  }

  // Diğer istekler için network-first (veri her zaman canlı gelsin)
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});