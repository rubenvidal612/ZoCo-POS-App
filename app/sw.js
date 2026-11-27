// Service worker: cache del shell para usar ZoCo sin internet
const CACHE = 'zoco-shell-v211';
const SHELL = [
  '/',
  '/index.html',
  '/landing.html',
  '/demo.html',
  '/js/demo-data.js',
  '/js/views-landing.js',
  '/css/landing.css',
  '/js/catalog-abarrotes.js',
  '/js/catalog-farmacia.js',
  '/js/catalog-papeleria.js',
  '/css/tokens.css',
  '/css/app.css',
  '/js/app.js',
  '/js/store.js',
  '/js/ui.js',
  '/js/views-pos.js',
  '/js/views-food.js',
  '/js/views-laundry.js',
  '/js/qr.js',
  '/js/catalog-lavanderia.js',
  '/js/views-beauty.js',
  '/js/views-food-service.js',
  '/js/views-integrations.js',
  '/js/sync.js',
  '/js/auth.js',
  '/js/notify.js',
  '/js/install.js',
  '/js/update.js',
  '/js/giro-selector.js',
  '/version.json',
  '/js/views-admin.js',
  '/js/camera.js',
  '/js/views-purchases.js',
  '/js/views-receiving.js',
  '/js/lookup.js',
  '/js/views-catalog.js',
  '/js/views-landing-gallery.js',
  '/js/views-home.js',
  '/js/views-ai.js',
  '/js/mascot.js',
  '/js/tour.js',
  '/assets/landing-2/mascota-perla.webp',
  '/assets/mascotas/jaguar-saludo.gif',
  '/assets/mascotas/manati-saludo.gif',
  '/assets/mascotas/aguila-saludo.gif',
  '/assets/mascotas/ajolote-saludo.gif',
  '/assets/mascotas/quetzal-saludo.gif',
  '/assets/demo/lavado-de-cabello.webp',
  '/css/app.css?v=50',
  '/js/scanner.js',
  '/js/printer.js',
  '/manifest.webmanifest',
  '/zoco-icon.svg',
  '/file_0000000045508212abb61c454ec385a8.png',
  '/zoco-192.png',
  '/zoco-512.png',
  '/apple-touch-icon.png',
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
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // API siempre en red

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && url.origin === self.location.origin) caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match('/')))
  );
});

/* ---------- Web Push ---------- */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'ZoCo POS', {
      body: data.body || '',
      icon: '/zoco-192.png',
      badge: '/zoco-192.png',
      tag: data.tag || 'zoco',
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(location.origin) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
