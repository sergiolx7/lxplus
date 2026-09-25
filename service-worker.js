const LX_BUILD = 'V40-REBUILD-20260925';
const CACHE = 'lxplus-shell-' + LX_BUILD;
const CORE = ['./', './index.html', './lxplus.bundle.js', './lxplus.album-grouping.js', './lxplus.bundle.css',
  './lxplus.recovery.js', './lxplus.support.js', './lxplus.audiofx.js', './lxplus.v40.js', './lxplus.rebuild.js', './lxplus.rebuild.css',
  './manifest.webmanifest', './assets/lxplus-logo-v27.png', './assets/lx-music-fallback.svg'];
const offline = () => new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#050506;color:white;font:16px system-ui;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}button{padding:12px 18px;border:0;border-radius:12px;font-weight:800}</style><main><h1>LX Plus</h1><p>Sem conexão. Verifique sua internet e tente novamente.</p><button onclick="location.reload()">Recarregar</button></main></html>',
  { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

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
    // A primeira instalação não precisa esperar outra aba.
    if (!self.registration.active) await self.skipWaiting();
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
      // Caches API keys by full URL, including query. The current build is always network-first.
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
      return response;
    } catch {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request) || await cache.match(new URL(url.pathname, url.origin)) ||
        (request.mode === 'navigate' ? await cache.match(new URL('./index.html', self.registration.scope)) : null);
      return cached || (request.mode === 'navigate' ? offline() : new Response('Offline', { status: 503 }));
    }
  })());
});
