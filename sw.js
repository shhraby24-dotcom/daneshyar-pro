/* دانش‌یار پرو - Service Worker (آفلاین + کش هوشمند) */
const VERSION = '1.0.0-beta.1';
const CORE = `daneshyar-core-${VERSION}`;
const STATIC = `daneshyar-static-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CORE)
      .then((c) => c.addAll(['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('daneshyar-') && !k.includes(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API های AI: هرگز کش نشوند (سهمیه + تازگی)
  if (url.hostname.includes('generativelanguage.googleapis.com') || url.hostname.includes('api.groq.com')) return;

  // Navigation: network-first با fallback آفلاین
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CORE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // استاتیک هم‌origin: stale-while-revalidate
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});