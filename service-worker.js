const LX_BUILD = 'R12.4-UI12-LOGIN-RECOVERY-20260926';
const CACHE = 'lxplus-shell-' + LX_BUILD;
const CORE = ['./', './index.html', './lxplus.bundle.js', './lxplus.album-grouping.js', './lxplus.bundle.css',
  './lxplus.recovery.js', './lxplus.support.js', './lxplus.audiofx.js', './lxplus.ambient-v1.css', './lxplus.ambient-v2.css', './lxplus.visual-v4.css',
  './lxplus.player-context-v6.js', './lxplus.player-context-v6.css', './lxplus.music-polish-v7.css',
  './manifest.webmanifest', './assets/lxplus-logo-v27.png', './assets/lx-music-fallback.svg'];
const PLAYER_SCRIPT = '<script src="./lxplus.player-context-v6.js?v=20260926-4"></script>';
const offline = () => new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#050506;color:white;font:16px system-ui;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}button{padding:12px 18px;border:0;border-radius:12px;font-weight:800}</style><main><h1>LX Plus</h1><p>Sem conexão. Verifique sua internet e tente novamente.</p><button onclick="location.reload()">Recarregar</button></main></html>',
  { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

async function decorateHtml(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let text = await response.text();
  if (!text.includes('lxplus.player-context-v6.js')) {
    text = text.includes('</body>') ? text.replace('</body>', PLAYER_SCRIPT + '\n</body>') : text + PLAYER_SCRIPT;
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  return new Response(text, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const results = await Promise.allSettled(CORE.map(async path => {
      const request = new Request(new URL(path, self.registration.scope), { cache: 'reload' });
      const response = await fetch(request);
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
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      request.destination === 'video' || request.destination === 'audio') return;
  const pathname = url.pathname.replace(/\/$/, '/index.html');
  const shell = request.mode === 'navigate' || CORE.some(path =>
    new URL(path, self.registration.scope).pathname.replace(/\/$/, '/index.html') === pathname);
  if (!shell) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const decorated = request.mode === 'navigate' ? await decorateHtml(response) : response;
      const cache = await caches.open(CACHE);
      await cache.put(request, decorated.clone());
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