const LX_BUILD = 'R12.4-UI23-GLOBAL-RELEASE-20260926';
const CACHE = 'lxplus-shell-' + LX_BUILD;
const CORE = ['./', './index.html', './lxplus.bundle.js', './lxplus.album-grouping.js', './lxplus.bundle.css',
  './lxplus.recovery.js', './lxplus.support.js', './lxplus.audiofx.js', './lxplus.ambient-v1.css', './lxplus.ambient-v2.css', './lxplus.visual-v4.css',
  './lxplus.player-context-v6.js', './lxplus.player-context-v6.css', './lxplus.music-polish-v7.css', './lxplus.boot-recovery.js',
  './lxplus.future-ui-v9.js', './lxplus.future-ui-v9.css', './lxplus.mini-floating-player-v11.css',
  './lxplus.watch-together-v10.js', './lxplus.detail-watch-v12.js', './lxplus.detail-watch-v12.css', './lxplus.player-audio-v10.js',
  './lxplus.modal-safety-v13.js', './lxplus.modal-safety-v13.css', './lxplus.release-manager-v17.js',
  './manifest.webmanifest', './assets/lxplus-logo-v27.png', './assets/lx-music-fallback.svg'];

const PLAYER_SCRIPT = '<script src="./lxplus.player-context-v6.js?v=20260926-4"></script>';
const RECOVERY_SCRIPT = '<script src="./lxplus.boot-recovery.js?v=20260926-2"></script>';
const FUTURE_SCRIPT = '<script src="./lxplus.future-ui-v9.js?v=20260926-2"></script>';
const MODAL_SCRIPT = '<script src="./lxplus.modal-safety-v13.js?v=20260926-2"></script>';
const DETAIL_SCRIPT = '<script src="./lxplus.detail-watch-v12.js?v=20260926-3"></script>';
const RELEASE_SCRIPT = '<script id="lxReleaseManagerV17Script" src="./lxplus.release-manager-v17.js?v=20260926-1"></script>';
const WATCH_SCRIPT = '<script id="lxWatchTogetherV10Script" src="./lxplus.watch-together-v10.js?v=20260926-4"></script>';
const EARLY_STYLES = [
  '<link id="lxFutureUiV9Css" rel="stylesheet" href="./lxplus.future-ui-v9.css?v=20260926-1">',
  '<link id="lxMiniFloatingPlayerV11Css" rel="stylesheet" href="./lxplus.mini-floating-player-v11.css?v=20260926-1">',
  '<link rel="stylesheet" href="./lxplus.detail-watch-v12.css?v=20260926-2">',
  '<link rel="stylesheet" href="./lxplus.modal-safety-v13.css?v=20260926-2">'
].join('\n');
const BUILD_GATE = `<script>(function(){try{var b=${JSON.stringify(LX_BUILD)},k='lx_shell_build_v2',p=localStorage.getItem(k),s='lx_shell_reload_'+b;localStorage.setItem(k,b);var u=new URL(location.href);if(p&&p!==b&&!sessionStorage.getItem(s)){sessionStorage.setItem(s,'1');u.searchParams.set('lxbuild',b);location.replace(u.toString());return}if(u.searchParams.get('lxbuild')===b){u.searchParams.delete('lxbuild');history.replaceState(null,'',u.pathname+(u.search||'')+u.hash)}}catch(e){}})();</script>`;

const offline = () => new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#050506;color:white;font:16px system-ui;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}button{padding:12px 18px;border:0;border-radius:12px;font-weight:800}</style><main><h1>LX Plus</h1><p>Sem conexão. Verifique sua internet e tente novamente.</p><button onclick="location.reload()">Recarregar</button></main></html>',
  { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

async function decorateHtml(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let text = await response.text();

  if (!text.includes('lx_shell_build_v2')) {
    const headBits = BUILD_GATE + '\n' + EARLY_STYLES;
    text = text.includes('</head>') ? text.replace('</head>', headBits + '\n</head>') : headBits + text;
  }

  const scripts=[];
  if (!text.includes('lxplus.player-context-v6.js')) scripts.push(PLAYER_SCRIPT);
  if (!text.includes('lxplus.boot-recovery.js')) scripts.push(RECOVERY_SCRIPT);
  if (!text.includes('lxplus.future-ui-v9.js')) scripts.push(FUTURE_SCRIPT);
  if (!text.includes('lxplus.modal-safety-v13.js')) scripts.push(MODAL_SCRIPT);
  if (!text.includes('lxplus.detail-watch-v12.js')) scripts.push(DETAIL_SCRIPT);
  if (!text.includes('lxplus.release-manager-v17.js')) scripts.push(RELEASE_SCRIPT);
  if (!text.includes('lxplus.watch-together-v10.js')) scripts.push(WATCH_SCRIPT);
  if (scripts.length) text = text.includes('</body>') ? text.replace('</body>', scripts.join('\n') + '\n</body>') : text + scripts.join('\n');

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store, no-cache, must-revalidate');
  headers.set('pragma','no-cache');
  return new Response(text,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const results = await Promise.allSettled(CORE.map(async path => {
      const request = new Request(new URL(path, self.registration.scope), { cache: 'reload' });
      const response = await fetch(request, { cache: 'no-store' });
      if (!response.ok) throw new Error('Shell ' + path + ' ' + response.status);
      await cache.put(request, response);
    }));
    if (results.some(result => result.status === 'rejected')) throw new Error('LX shell incomplete');
    await self.skipWaiting();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'LX_SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('lxplus-') && key !== CACHE) await caches.delete(key);
    try{await self.registration.navigationPreload?.enable?.()}catch{}
    await self.clients.claim();
    const clients = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for (const client of clients) try{client.postMessage({type:'LX_BUILD_READY',build:LX_BUILD})}catch{}
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.destination === 'video' || request.destination === 'audio') return;
  const pathname = url.pathname.replace(/\/$/, '/index.html');
  const shell = request.mode === 'navigate' || CORE.some(path => new URL(path, self.registration.scope).pathname.replace(/\/$/, '/index.html') === pathname);
  if (!shell) return;

  event.respondWith((async () => {
    try {
      let response = request.mode === 'navigate' ? await event.preloadResponse : null;
      if (!response) response = await fetch(request, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const decorated = request.mode === 'navigate' ? await decorateHtml(response) : response;
      if (request.mode !== 'navigate') {
        const cache = await caches.open(CACHE);
        await cache.put(request, decorated.clone());
      }
      return decorated;
    } catch {
      const cache = await caches.open(CACHE);
      let cached = await cache.match(request) || await cache.match(new URL(url.pathname, url.origin)) ||
        (request.mode === 'navigate' ? await cache.match(new URL('./index.html', self.registration.scope)) : null);
      if (cached && request.mode === 'navigate') cached = await decorateHtml(cached);
      return cached || (request.mode === 'navigate' ? offline() : new Response('Offline', { status: 503 }));
    }
  })());
});
