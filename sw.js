const C="lxplus-v25.4";
const CORE=["./","./index.html","./app.css","./manifest.json","./js/config.js","./js/store.js","./js/cloud.js","./js/services.js","./js/ui.js","./js/admin.js","./js/app.js","./assets/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url),same=u.origin===location.origin;
 if(!same)return;
 const networkFirst=async()=>{try{const resp=await fetch(e.request,{cache:"no-cache"});if(resp.ok){const cp=resp.clone();caches.open(C).then(c=>c.put(e.request,cp))}return resp}catch{return (await caches.match(e.request))||(await caches.match("./index.html"))}};
 if(e.request.mode==="navigate"||/\.(?:js|css|json|html)$/.test(u.pathname)){e.respondWith(networkFirst());return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{if(resp.ok){const cp=resp.clone();caches.open(C).then(c=>c.put(e.request,cp))}return resp})));
});
