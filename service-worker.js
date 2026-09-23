const CACHE='lxplus-disabled-v333';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('lxplus-'))await caches.delete(key);await self.registration.unregister();const clients=await self.clients.matchAll({type:'window'});for(const c of clients)c.postMessage({type:'LX_SW_DISABLED',build:'33.3'});})()));
self.addEventListener('fetch',()=>{});
