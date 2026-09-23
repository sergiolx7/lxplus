const CACHE='lxplus-shell-v3320';
const CORE=['./','./index.html','./lxplus.bundle.css?v=33.2','./lxplus.bundle.js?v=33.2','./manifest.webmanifest?v=33.2','./assets/lxplus-logo-v27.png?v=33.2','./assets/lxplus-face-v331.png?v=33.2','./assets/icon-v27.svg','./assets/lx-music-fallback.svg'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(x=>cache.add(x)));await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE&&key.startsWith('lxplus-'))await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
async function networkFirst(req,timeout=4500){const cache=await caches.open(CACHE),ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),timeout);try{const res=await fetch(req,{signal:ctrl.signal,cache:'no-store'});clearTimeout(tm);if(res&&res.ok)cache.put(req,res.clone()).catch(()=>{});return res}catch(e){clearTimeout(tm);return (await cache.match(req))||(req.mode==='navigate'?await cache.match('./index.html'):Response.error())}}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const isPage=req.mode==='navigate'||url.pathname.endsWith('/')||url.pathname.endsWith('/index.html');
  if(isPage){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});return res}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res&&res.ok&&url.origin===location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return res})));
});
