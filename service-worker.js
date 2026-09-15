const CACHE='lxplus-shell-v2820';
const CORE=[
  './','./index.html',
  './app.css?v=28.1','./app-v27.css?v=28.1','./app-v28.css?v=28.1',
  './lxplus.js?v=28.1','./lxplus-v27.js?v=28.1','./lxplus-v28.js?v=28.1',
  './manifest.webmanifest','./assets/lxplus-logo-v27.png?v=28.1','./assets/icon-v27.svg'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('lxplus-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
  if(event.data==='LX_CLEAR_SHELL')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lxplus-')&&k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});}return response;
    }).catch(()=>caches.match('./index.html').then(hit=>hit||caches.match('./'))));return;
  }
  if(/\.(?:css|js)$/.test(url.pathname)||url.pathname.endsWith('/manifest.webmanifest')){
    event.respondWith(fetch(req).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return response;
    }).catch(()=>caches.match(req)));return;
  }
  if(/\.(?:png|webp|svg|jpg|jpeg|avif)$/.test(url.pathname)){
    event.respondWith(caches.match(req).then(hit=>{
      const refresh=fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return response;}).catch(()=>hit);
      return hit||refresh;
    }));return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return response;})));
});
