/* LX Plus — Canonical Service Worker UI28
   User settings + Web Push outside browser + existing player/watch runtimes.
*/
const LX_BUILD='R12.4-UI28-USER-SETTINGS-PUSH-20260926';
const CACHE='lxplus-canonical-'+LX_BUILD;
const CORE=[
  './','./index.html','./lxplus.bundle.js','./lxplus.bundle.css',
  './lxplus.support.js','./lxplus.support-core.js','./lxplus.recovery.js','./lxplus.audiofx.js','./lxplus.album-grouping.js',
  './lxplus.future-ui-v9.js','./lxplus.future-ui-v9.css',
  './lxplus.player-context-v6.js','./lxplus.player-context-v6.css',
  './lxplus.detail-watch-v12.js','./lxplus.detail-watch-v12.css',
  './lxplus.modal-safety-v13.js','./lxplus.modal-safety-v13.css',
  './lxplus.notifications-v26.js','./lxplus.notifications-v26.css','./lxplus.notifications-hotfix-v27.js',
  './lxplus.user-settings-v28.js','./lxplus.user-settings-v28.css',
  './lxplus.watch-together-v10.js','./lxplus.watch-runtime-v16.js','./lxplus.watch-party-v14.js','./lxplus.watch-party-native-v15.js','./lxplus.watch-sync-v14-4.js',
  './lxplus.player-audio-v11.js','./lxplus.player-audio-v12.js',
  './manifest.webmanifest','./assets/lxplus-logo-v27.png'
];
const EARLY_STYLES=[
  '<link id="lxFutureUiV9Css" rel="stylesheet" href="./lxplus.future-ui-v9.css?v=UI28">',
  '<link rel="stylesheet" href="./lxplus.player-context-v6.css?v=UI28">',
  '<link rel="stylesheet" href="./lxplus.detail-watch-v12.css?v=UI28">',
  '<link rel="stylesheet" href="./lxplus.modal-safety-v13.css?v=UI28">',
  '<link id="lxNotificationsV26Css" rel="stylesheet" href="./lxplus.notifications-v26.css?v=UI28">',
  '<link id="lxUserSettingsV28Css" rel="stylesheet" href="./lxplus.user-settings-v28.css?v=UI28">'
].join('\n');
const POST_SCRIPTS=[
  ['lxPlayerContextV6Script','./lxplus.player-context-v6.js?v=UI28'],
  ['lxFutureUiV9Script','./lxplus.future-ui-v9.js?v=UI28'],
  ['lxModalSafetyV13Script','./lxplus.modal-safety-v13.js?v=UI28'],
  ['lxDetailWatchV12Script','./lxplus.detail-watch-v12.js?v=UI28'],
  ['lxPlayerAudioV12Script','./lxplus.player-audio-v12.js?v=UI28'],
  ['lxNotificationsHotfixV27Script','./lxplus.notifications-hotfix-v27.js?v=UI28'],
  ['lxUserSettingsV28Script','./lxplus.user-settings-v28.js?v=UI28']
];
const normalizedRequest=input=>{const u=new URL(typeof input==='string'?input:input.url,self.registration.scope);u.search='';u.hash='';return new Request(u.toString(),{method:'GET',credentials:'same-origin'})};
async function decorateHtml(response){
  if(!response?.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  let text=await response.text();
  text=text.replace(/<meta\s+name=["']lxplus-build["']\s+content=["'][^"']*["']\s*\/?\s*>/i,`<meta name="lxplus-build" content="${LX_BUILD}">`);
  if(!text.includes('data-lx-canonical-shell="28"')){
    const marker=`<script data-lx-canonical-shell="28">window.LX_CANONICAL_SHELL='${LX_BUILD}';</script>`;
    const styles=EARLY_STYLES.split('\n').filter(tag=>!text.includes(tag.match(/href="([^"]+)/)?.[1]?.split('?')[0]||'__none__')).join('\n');
    text=text.includes('</head>')?text.replace('</head>',marker+'\n'+styles+'\n</head>'):marker+'\n'+styles+'\n'+text;
  }
  const scripts=[];for(const [id,src] of POST_SCRIPTS){const base=src.split('?')[0].replace('./','');if(!text.includes(base))scripts.push(`<script id="${id}" src="${src}"></script>`)}
  if(scripts.length)text=text.includes('</body>')?text.replace('</body>',scripts.join('\n')+'\n</body>'):text+scripts.join('\n');
  const h=new Headers(response.headers);h.delete('content-length');h.set('cache-control','no-store, no-cache, must-revalidate');h.set('pragma','no-cache');h.set('x-lx-build',LX_BUILD);return new Response(text,{status:response.status,statusText:response.statusText,headers:h});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);const results=await Promise.allSettled(CORE.map(async path=>{const req=normalizedRequest(new URL(path,self.registration.scope).toString()),res=await fetch(req,{cache:'no-store'});if(!res.ok)throw new Error(`${path} ${res.status}`);await cache.put(req,res.clone())}));
  if(results.some(x=>x.status==='rejected'))console.warn('LX canonical precache partial',results.filter(x=>x.status==='rejected').map(x=>String(x.reason)));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);try{await self.registration.navigationPreload?.enable?.()}catch{}await self.clients.claim();const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of list)try{client.postMessage({type:'LX_CANONICAL_READY',build:LX_BUILD})}catch{}})()));
self.addEventListener('message',event=>{if(event.data?.type==='LX_SKIP_WAITING')self.skipWaiting();if(event.data?.type==='LX_CLEAR_CACHE')event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key)})())});
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{let data={};try{data=event.data?.json?.()||{}}catch{try{data={body:event.data?.text?.()||''}}catch{}}const title=String(data.title||'LX Plus').slice(0,80),body=String(data.body||data.message||'Você tem uma nova notificação.').slice(0,400),url=String(data.url||'/'),tag=String(data.tag||'lx-plus');await self.registration.showNotification(title,{body,icon:'./assets/lxplus-logo-v27.png',badge:'./assets/lxplus-logo-v27.png',tag,renotify:true,silent:false,vibrate:[90,45,90],data:{url,source:data.source||'LX Plus'},actions:[{action:'open',title:'Abrir'}]})})());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();event.waitUntil((async()=>{const raw=String(event.notification?.data?.url||'/'),target=new URL(raw,self.registration.scope).toString(),list=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of list){try{if('navigate'in client)await client.navigate(target);await client.focus();client.postMessage?.({type:'LX_NOTIFICATION_OPENED',url:target});return}catch{}}if(self.clients.openWindow)await self.clients.openWindow(target)})());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||request.destination==='video'||request.destination==='audio')return;
  const isNavigation=request.mode==='navigate',clean=normalizedRequest(request),isCore=CORE.some(path=>new URL(path,self.registration.scope).pathname.replace(/\/$/,'/index.html')===url.pathname.replace(/\/$/,'/index.html'));if(!isNavigation&&!isCore)return;
  event.respondWith((async()=>{try{let response=isNavigation?await event.preloadResponse:null;if(!response)response=await fetch(request,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);const output=isNavigation?await decorateHtml(response):response;if(!isNavigation){const cache=await caches.open(CACHE);await cache.put(clean,output.clone())}return output}catch(err){const cache=await caches.open(CACHE);let cached=await cache.match(clean);if(!cached&&isNavigation)cached=await cache.match(normalizedRequest(new URL('./index.html',self.registration.scope).toString()));if(cached&&isNavigation)return decorateHtml(cached);return cached||new Response(isNavigation?'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#050506;color:#fff;font:16px system-ui;display:grid;place-items:center;min-height:100vh}</style><p>LX Plus offline. Verifique a conexão e recarregue.</p>':'Offline',{status:503,headers:{'content-type':isNavigation?'text/html; charset=utf-8':'text/plain'}})}})());
});
