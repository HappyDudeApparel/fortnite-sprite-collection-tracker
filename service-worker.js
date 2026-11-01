// Sprite Collection Locker — v2.0.46. Cache conservatively on low-storage devices.
const APP_VERSION = '2.0.46';
const CACHE_NAME = `sprites-tracker-${APP_VERSION}`;
const APP_SHELL = ['./index.html','./manifest.webmanifest','./version.json'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await self.skipWaiting();
    // Avoid pre-caching hundreds of heavy images: low storage must not block activation.
    try {
      const cache = await caches.open(CACHE_NAME);
      for (const path of APP_SHELL) {
        try {
          const response = await fetch(path, {cache:'reload'});
          if (response.ok) await cache.put(path,response);
        } catch(e) { console.warn('Optional offline cache skipped',path,e); }
      }
    } catch(e) { console.warn('Low-storage mode: offline shell cache unavailable',e); }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      for (const key of await caches.keys()) {
        if (key.startsWith('sprites-tracker-') && key!==CACHE_NAME) {
          try { await caches.delete(key); } catch(e) { console.warn('Old cache cleanup skipped',e); }
        }
      }
    } catch(e) { console.warn('Cache cleanup unavailable',e); }
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname==='/'){
    event.respondWith((async()=>{
      try { return await fetch(event.request,{cache:'no-store'}); }
      catch(e) {
        try { const old=await caches.match('./index.html',{ignoreSearch:true}); if(old)return old; }
        catch(_){}
        return Response.error();
      }
    })());
  } else {
    // Images load from locally hosted verified assets; do not replicate them in phone storage.
    event.respondWith(fetch(event.request).catch(async()=>{
      try {return await caches.match(event.request)||Response.error();}catch(_){return Response.error();}
    }));
  }
});
