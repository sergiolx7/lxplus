const LX_BUILD='V42-MAINTENANCE-RESET-20260925';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.map(k=>caches.delete(k)));
  await self.clients.claim();
  try{await self.registration.unregister()}catch{}
})()));
self.addEventListener('fetch',event=>{
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#05060b;color:white;font:16px system-ui;display:grid;place-items:center;min-height:100vh}</style><h1>LX Plus em manutenção</h1>',
      {headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}}
    )));
  }
});