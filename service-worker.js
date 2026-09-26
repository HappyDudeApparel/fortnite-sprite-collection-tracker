const APP_VERSION = '2.0.29';
const CACHE_NAME = `sprites-tracker-${APP_VERSION}`;
const APP_SHELL = [
  './manifest.webmanifest',
  './version.json',
  './asset-manifest.json',
  './assets/icons/favicon-32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    self.skipWaiting();
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    try {
      const r = await fetch('./asset-manifest.json', { cache: 'no-store' });
      if (r.ok) {
        const m = await r.json();
        const assets = Array.isArray(m.assets) ? m.assets : [];
        for (let i = 0; i < assets.length; i += 40) {
          await cache.addAll(assets.slice(i, i + 40).map(p => './' + p));
        }
      }
    } catch (e) {
      console.warn('Asset pre-cache deferred', e);
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML/navigation is always network-first. This prevents an old app shell
  // from pinning users to a prior release after a successful deployment.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    event.respondWith((async () => {
      try {
        return await fetch(event.request, { cache: 'no-store' });
      } catch (e) {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        throw e;
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  })());
});
