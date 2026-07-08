const APP_VERSION = '1.0.39';
const CACHE_NAME = `sprite-locker-${APP_VERSION}`;
const CORE = ['/', '/index.html', '/404.html', '/manifest.webmanifest', '/version.json'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sprite-locker-') && k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', event => { if (event.request.method !== 'GET') return; event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))); });
