const C="lxplus-v25.10";
const CORE=["./","./index.html","./manifest.json","./assets/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url),same=u.origin===location.origin;if(!same)return;
 if(/\.(?:js|css)$/.test(u.pathname)){e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match(e.request)));return}
 if(e.request.mode==="navigate"||/\.(?:json|html)$/.test(u.pathname)){e.respondWith(fetch(e.request,{cache:"no-cache"}).then(resp=>{if(resp.ok){const cp=resp.clone();caches.open(C).then(c=>c.put(e.request,cp))}return resp}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{if(resp.ok){const cp=resp.clone();caches.open(C).then(c=>c.put(e.request,cp))}return resp})));
});
