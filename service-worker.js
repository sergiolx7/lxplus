/* LX Plus — Canonical Service Worker UI25
   One shell pipeline. No release-manager injection and no duplicate Watch Party runtime.
*/
const LX_BUILD='R12.4-UI25-CANONICAL-20260926';
const CACHE='lxplus-canonical-'+LX_BUILD;
const CORE=[
  './','./index.html','./lxplus.bundle.js','./lxplus.bundle.css',
  './lxplus.support.js','./lxplus.support-core.js','./lxplus.recovery.js','./lxplus.audiofx.js','./lxplus.album-grouping.js',
  './lxplus.future-ui-v9.js','./lxplus.future-ui-v9.css',
  './lxplus.player-context-v6.js','./lxplus.player-context-v6.css',
  './lxplus.detail-watch-v12.js','./lxplus.detail-watch-v12.css',
  './lxplus.modal-safety-v13.js','./lxplus.modal-safety-v13.css',
  './manifest.webmanifest','./assets/lxplus-logo-v27.png'
];
const EARLY_STYLES=[
  '<link id="lxFutureUiV9Css" rel="stylesheet" href="./lxplus.future-ui-v9.css?v=UI25">',
  '<link rel="stylesheet" href="./lxplus.player-context-v6.css?v=UI25">',
  '<link rel="stylesheet" href="./lxplus.detail-watch-v12.css?v=UI25">',
  '<link rel="stylesheet" href="./lxplus.modal-safety-v13.css?v=UI25">'
].join('\n');
const POST_SCRIPTS=[
  ['lxPlayerContextV6Script','./lxplus.player-context-v6.js?v=UI25'],
  ['lxFutureUiV9Script','./lxplus.future-ui-v9.js?v=UI25'],
  ['lxModalSafetyV13Script','./lxplus.modal-safety-v13.js?v=UI25'],
  ['lxDetailWatchV12Script','./lxplus.detail-watch-v12.js?v=UI25']
];

const normalizedRequest=input=>{
  const u=new URL(typeof input==='string'?input:input.url,self.registration.scope);u.search='';u.hash='';
  return new Request(u.toString(),{method:'GET',credentials:'same-origin'});
};

async function decorateHtml(response){
  if(!response?.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  let text=await response.text();
  // Canonical marker only. Runtime ownership lives in lxplus.support.js, which index already loads directly.
  text=text.replace(/<meta\s+name=["']lxplus-build["']\s+content=["'][^"']*["']\s*\/?\s*>/i,`<meta name="lxplus-build" content="${LX_BUILD}">`);
  if(!text.includes('data-lx-canonical-shell="25"')){
    const marker=`<script data-lx-canonical-shell="25">window.LX_CANONICAL_SHELL='${LX_BUILD}';</script>`;
    const styles=EARLY_STYLES.split('\n').filter(tag=>!text.includes(tag.match(/href="([^"]+)/)?.[1]?.split('?')[0]||'__none__')).join('\n');
    text=text.includes('</head>')?text.replace('</head>',marker+'\n'+styles+'\n</head>'):marker+'\n'+styles+'\n'+text;
  }
  const scripts=[];
  for(const [id,src] of POST_SCRIPTS){const base=src.split('?')[0].replace('./','');if(!text.includes(base))scripts.push(`<script id="${id}" src="${src}"></script>`)}
  if(scripts.length)text=text.includes('</body>')?text.replace('</body>',scripts.join('\n')+'\n</body>'):text+scripts.join('\n');
  const h=new Headers(response.headers);h.delete('content-length');h.set('cache-control','no-store, no-cache, must-revalidate');h.set('pragma','no-cache');h.set('x-lx-build',LX_BUILD);
  return new Response(text,{status:response.status,statusText:response.statusText,headers:h});
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const results=await Promise.allSettled(CORE.map(async path=>{
    const req=normalizedRequest(new URL(path,self.registration.scope).toString());
    const res=await fetch(req,{cache:'no-store'});if(!res.ok)throw new Error(`${path} ${res.status}`);await cache.put(req,res.clone());
  }));
  if(results.some(x=>x.status==='rejected'))console.warn('LX canonical precache partial',results.filter(x=>x.status==='rejected').map(x=>String(x.reason)));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);
  try{await self.registration.navigationPreload?.enable?.()}catch{}
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients)try{client.postMessage({type:'LX_CANONICAL_READY',build:LX_BUILD})}catch{}
})()));

self.addEventListener('message',event=>{
  if(event.data?.type==='LX_SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='LX_CLEAR_CACHE')event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key)})());
});

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||request.destination==='video'||request.destination==='audio')return;
  const isNavigation=request.mode==='navigate';
  const clean=normalizedRequest(request);
  const isCore=CORE.some(path=>new URL(path,self.registration.scope).pathname.replace(/\/$/,'/index.html')===url.pathname.replace(/\/$/,'/index.html'));
  if(!isNavigation&&!isCore)return;
  event.respondWith((async()=>{
    try{
      let response=isNavigation?await event.preloadResponse:null;
      if(!response)response=await fetch(request,{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const output=isNavigation?await decorateHtml(response):response;
      if(!isNavigation){const cache=await caches.open(CACHE);await cache.put(clean,output.clone())}
      return output;
    }catch(err){
      const cache=await caches.open(CACHE);let cached=await cache.match(clean);
      if(!cached&&isNavigation)cached=await cache.match(normalizedRequest(new URL('./index.html',self.registration.scope).toString()));
      if(cached&&isNavigation)return decorateHtml(cached);
      return cached||new Response(isNavigation?'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#050506;color:#fff;font:16px system-ui;display:grid;place-items:center;min-height:100vh}</style><p>LX Plus offline. Verifique a conexão e recarregue.</p>':'Offline',{status:503,headers:{'content-type':isNavigation?'text/html; charset=utf-8':'text/plain'}});
    }
  })());
});
