/* LX Plus — Service Worker UI34 SINGLE SHELL
   The HTML is canonical. This worker never injects UI, never rewrites the DOM, and never forces navigation.
*/
const LX_BUILD='R12.4-UI35-MUSIC-SOCIAL-20261002';
const LX_VERSION='UI35';
const CACHE='lxplus-shell-'+LX_BUILD;
const CORE=[
  './lxplus.insights-v35.js','./lxplus.insights-v35.css','./','./index.html','./lxplus.bundle.js','./lxplus.bundle.css',
  './lxplus.support.js','./lxplus.support-core.js','./lxplus.recovery.js','./lxplus.audiofx.js','./lxplus.album-grouping.js',
  './lxplus.future-ui-v9.js','./lxplus.future-ui-v9.css','./lxplus.books-v8.js','./lxplus.books-v8.css',
  './lxplus.player-context-v6.js','./lxplus.player-context-v6.css','./lxplus.mini-floating-player-v11.css',
  './lxplus.detail-watch-v12.js','./lxplus.detail-watch-v12.css','./lxplus.modal-safety-v13.js','./lxplus.modal-safety-v13.css',
  './lxplus.music-polish-v7.css','./lxplus.music-v8.css','./lxplus.music-v8.js','./lxplus.music-sources-v2.css','./lxplus.music-sources-v2.js',
  './lxplus.notifications-v26.js','./lxplus.notifications-v26.css','./lxplus.notifications-hotfix-v27.js',
  './lxplus.user-settings-v28.js','./lxplus.user-settings-v28.css','./lxplus.admin-health-v33.js','./lxplus.maintenance-v34.css','./lxplus.release-v34.js',
  './lxplus.watch-together-v10.js','./lxplus.watch-runtime-v16.js','./lxplus.watch-party-v14.js','./lxplus.watch-party-native-v15.js','./lxplus.watch-sync-v14-4.js',
  './lxplus.player-audio-v11.js','./lxplus.player-audio-v12.js','./manifest.webmanifest','./assets/lxplus-wordmark-v34.svg','./assets/lxplus-icon-v34.svg','./assets/lxplus-icon-v34.png'
];
const cleanRequest=input=>{const u=new URL(typeof input==='string'?input:input.url,self.registration.scope);u.search='';u.hash='';return new Request(u.toString(),{method:'GET',credentials:'same-origin'})};
const samePath=(path,url)=>new URL(path,self.registration.scope).pathname.replace(/\/$/,'/index.html')===url.pathname.replace(/\/$/,'/index.html');

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.all(CORE.map(async path=>{
    const req=cleanRequest(new URL(path,self.registration.scope).toString());
    const res=await fetch(req,{cache:'no-store'});
    if(!res.ok)throw new Error(`${path} ${res.status}`);
    await cache.put(req,res.clone());
  }));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('lxplus-')&&key!==CACHE)await caches.delete(key);
  try{await self.registration.navigationPreload?.enable?.()}catch{}
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients)try{client.postMessage({type:'LX_RELEASE_READY',version:LX_VERSION,build:LX_BUILD})}catch{}
})()));

self.addEventListener('message',event=>{
  if(event.data?.type==='LX_SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='LX_CLEAR_CACHE')event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('lxplus-')&&key!==CACHE)await caches.delete(key)})());
});

self.addEventListener('push',event=>event.waitUntil((async()=>{
  let data={};try{data=event.data?.json?.()||{}}catch{try{data={body:event.data?.text?.()||''}}catch{}}
  const title=String(data.title||'LX Plus').slice(0,80),body=String(data.body||data.message||'Você tem uma nova notificação.').slice(0,400),url=String(data.url||'/'),tag=String(data.tag||'lx-plus');
  await self.registration.showNotification(title,{body,icon:'./assets/lxplus-icon-v34.png',badge:'./assets/lxplus-icon-v34.png',tag,renotify:true,silent:false,vibrate:[90,45,90],data:{url,source:data.source||'LX Plus'},actions:[{action:'open',title:'Abrir'}]});
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const target=new URL(String(event.notification?.data?.url||'/'),self.registration.scope).toString(),list=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of list){try{if('navigate'in client)await client.navigate(target);await client.focus();return}catch{}}if(self.clients.openWindow)await self.clients.openWindow(target)})())});

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||request.destination==='video'||request.destination==='audio')return;
  const navigation=request.mode==='navigate',core=CORE.some(path=>samePath(path,url));
  if(!navigation&&!core)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),key=navigation?cleanRequest(new URL('./index.html',self.registration.scope).toString()):cleanRequest(request);
    try{
      let res=navigation?await event.preloadResponse:null;
      if(!res)res=await fetch(request,{cache:'no-store'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const headers=new Headers(res.headers);headers.set('x-lx-build',LX_BUILD);headers.set('cache-control','no-store, no-cache, must-revalidate');
      const out=new Response(res.body,{status:res.status,statusText:res.statusText,headers});
      await cache.put(key,out.clone());
      return out;
    }catch(error){
      const cached=await cache.match(key);
      if(cached)return cached;
      if(navigation)return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#050506;color:#fff;font:16px system-ui;display:grid;place-items:center;min-height:100vh}</style><p>LX Plus offline. Verifique a conexão e recarregue.</p>',{status:503,headers:{'content-type':'text/html; charset=utf-8'}});
      return new Response('Offline',{status:503});
    }
  })());
});
