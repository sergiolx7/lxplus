const CACHE='lxplus-shell-v2701';
const CORE=['./','./index.html','./app.css?v=27.1','./app-v27.css?v=27.1','./lxplus.js?v=27.1','./lxplus-v27.js?v=27.1','./manifest.webmanifest','./assets/lxplus-logo-v27.png?v=27.0','./assets/icon-v27.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lxplus-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});return r;}).catch(()=>caches.match('./index.html')));return;
  }
  if(/\.(?:css|js)$/.test(url.pathname)||url.pathname.endsWith('/manifest.webmanifest')){
    event.respondWith(fetch(req).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return r;}).catch(()=>caches.match(req)));return;
  }
  if(/\.(?:png|webp|svg|jpg|jpeg|avif)$/.test(url.pathname)){
    event.respondWith(caches.match(req).then(hit=>{const fresh=fetch(req).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return r;}).catch(()=>hit);return hit||fresh;}));return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return r;})));
});
