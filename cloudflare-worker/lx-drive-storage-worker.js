/** LX Storage R12: Google Drive API byte proxy. Configure credentials only as Worker secrets. */
let tokenCache = { token: '', expires: 0 };
const metadataCache = new Map();
const API = 'https://www.googleapis.com/drive/v3';

function json(value, status = 200, headers = {}) {
  const h = new Headers(headers);
  h.set('content-type', 'application/json; charset=utf-8');
  h.set('cache-control', 'no-store');
  return new Response(JSON.stringify(value), { status, headers: h });
}
function headIfRequested(response, request) {
  return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
}
const configured = env => Boolean(env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY);
const fallbackEnabled = env => env.ALLOW_PUBLIC_FALLBACK === 'true';
function cors(request, env) {
  const origin = request.headers.get('origin');
  const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(v => v.trim()).filter(Boolean);
  const okay = !origin || allowed.includes(origin);
  const headers = new Headers({
    vary: 'Origin',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'Range, Content-Type',
    'access-control-expose-headers': 'Content-Type, Content-Range, Content-Length, Accept-Ranges, ETag, X-LX-Storage',
  });
  if (origin && okay) headers.set('access-control-allow-origin', origin);
  return { okay, headers };
}
function b64(bytes) {
  let s = '';
  for (const byte of new Uint8Array(bytes)) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function token(env, force = false) {
  if (!configured(env)) throw new Error('DRIVE_AUTH_NOT_CONFIGURED');
  const now = Math.floor(Date.now() / 1000);
  if (!force && tokenCache.token && tokenCache.expires > now + 90) return tokenCache.token;
  const encoded = String(env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, '\n')
    .replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const a = b64(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const b = b64(new TextEncoder().encode(JSON.stringify({
    iss: env.GOOGLE_CLIENT_EMAIL, scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })));
  const sig = b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(a + '.' + b)));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: a + '.' + b + '.' + sig }),
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok || !data.access_token) {
    console.error('LX Storage token exchange', response.status, data.error || 'unknown');
    throw new Error('DRIVE_AUTH_INVALID');
  }
  tokenCache = { token: data.access_token, expires: now + Number(data.expires_in || 3600) };
  return tokenCache.token;
}
const validKey = v => /^[A-Za-z0-9_-]{4,256}$/.test(String(v || ''));
const validRange = v => v === null || /^bytes=(?:\d+-\d*|-\d+)$/.test(v);
function errorCode(status) {
  return ({ 401: 'DRIVE_AUTH_INVALID', 403: 'DRIVE_PERMISSION_OR_QUOTA',
    404: 'FILE_NOT_FOUND_OR_NO_ACCESS', 416: 'RANGE_NOT_SATISFIABLE',
    429: 'DRIVE_QUOTA_EXCEEDED' })[status] || 'DRIVE_HTTP_' + status;
}
async function healthError(response) {
  if (response.status !== 403) return errorCode(response.status);
  let details = {};
  try { details = await response.json(); } catch {}
  const error = details?.error || {};
  const reasons = [error.status, ...(Array.isArray(error.errors) ? error.errors.map(item => item?.reason) : []),
    ...(Array.isArray(error.details) ? error.details.map(item => item?.reason) : [])]
    .map(value => String(value || '').toLowerCase());
  if (reasons.some(reason => reason === 'service_disabled' || reason === 'accessnotconfigured'))
    return 'DRIVE_API_DISABLED';
  if (reasons.some(reason => ['ratelimitexceeded', 'userratelimitexceeded', 'dailylimitexceeded',
    'quotaexceeded', 'resourceexhausted'].includes(reason.replace(/_/g, ''))))
    return 'DRIVE_QUOTA_EXCEEDED';
  if (reasons.some(reason => reason === 'domainpolicy' || reason === 'domain_policy'))
    return 'DRIVE_DOMAIN_POLICY';
  return 'DRIVE_API_REJECTED';
}
async function drive(url, env, id = '', key = '', range = '') {
  async function get(force) {
    const headers = new Headers({ authorization: 'Bearer ' + await token(env, force) });
    if (key) headers.set('X-Goog-Drive-Resource-Keys', id + '/' + key);
    if (range) headers.set('Range', range);
    return fetch(url, { method: 'GET', headers, redirect: 'follow' });
  }
  let r = await get(false);
  if (r.status === 401) r = await get(true);
  return r;
}
function fileUrl(id, fields) {
  const url = new URL(API + '/files/' + encodeURIComponent(id));
  url.searchParams.set('supportsAllDrives', 'true');
  if (fields) url.searchParams.set('fields', fields);
  else url.searchParams.set('alt', 'media');
  return url.toString();
}
async function metadata(env, id, key) {
  const cacheKey = id + ':' + key, saved = metadataCache.get(cacheKey);
  if (saved && saved.expires > Date.now()) return saved.value;
  const r = await drive(fileUrl(id, 'id,name,size,mimeType,md5Checksum,videoMediaMetadata,capabilities(canDownload)'), env, id, key);
  if (!r.ok) throw Object.assign(new Error(errorCode(r.status)), { status: r.status });
  const meta = await r.json();
  if (meta.capabilities?.canDownload === false) throw Object.assign(new Error('DRIVE_DOWNLOAD_DISABLED'), { status: 403 });
  if (!meta.size || String(meta.mimeType || '').startsWith('application/vnd.google-apps.'))
    throw Object.assign(new Error('NOT_A_MEDIA_FILE'), { status: 422 });
  if (metadataCache.size > 500) metadataCache.delete(metadataCache.keys().next().value);
  metadataCache.set(cacheKey, { value: meta, expires: Date.now() + 5 * 60 * 1000 });
  return meta;
}
function headersFor(upstream, meta, corsHeaders) {
  const h = new Headers(corsHeaders);
  for (const k of ['content-type', 'content-range', 'content-length', 'etag', 'last-modified', 'accept-ranges'])
    if (upstream.headers.has(k)) h.set(k, upstream.headers.get(k));
  if (!h.has('content-type') || h.get('content-type') === 'application/octet-stream')
    h.set('content-type', meta.mimeType || 'application/octet-stream');
  h.set('accept-ranges', 'bytes');
  h.set('x-lx-storage', 'drive-api');
  h.set('cache-control', 'private, no-store');
  h.set('x-content-type-options', 'nosniff');
  return h;
}
function nonMedia(r) {
  return /(?:text\/html|application\/json|text\/plain|application\/xml)/i.test(r.headers.get('content-type') || '');
}
function detectCodec(bytes) {
  const data = new TextDecoder('latin1').decode(bytes);
  if (/\b(?:hvc1|hev1|dvh1|dvhe)\b/.test(data)) return 'HEVC/H.265';
  if (data.includes('avc1') || data.includes('avc3')) return data.includes('mp4a') ? 'H.264 + AAC' : 'H.264';
  if (data.includes('av01')) return 'AV1';
  if (data.includes('vp09')) return 'VP9';
  return 'unknown';
}
function compatibility(meta, contentType, codec = 'unknown') {
  const name = String(meta.name || ''), mime = String(contentType || meta.mimeType || '');
  if (/\.(mkv|avi|wmv|flv|mov)$/i.test(name) || /(?:x-matroska|x-msvideo|quicktime)/i.test(mime)) return 'container_incompatible';
  if (/HEVC|hevc/i.test(codec + mime + name)) return 'codec_incompatible';
  return codec.startsWith('H.264') ? 'compatible_likely' : 'codec_unverified';
}
async function publicFallback(request, env, action, id, key, common, context) {
  // Explicit opt-in only. No HTML scraping, cookies or browser preview.
  const url = new URL('https://drive.usercontent.google.com/download');
  url.searchParams.set('id', id);
  url.searchParams.set('export', 'download');
  if (key) url.searchParams.set('resourcekey', key);
  const range = action === 'probe' ? 'bytes=0-65535' : request.headers.get('Range') ||
    (request.method === 'HEAD' ? 'bytes=0-0' : '');
  const headers = new Headers();
  if (range) headers.set('Range', range);
  const r = await fetch(url, { headers, redirect: 'follow' });
  const cr = r.headers.get('content-range') || '';
  const rangeOk = r.status === 206 && /^bytes \d+-\d+\/\d+$/.test(cr);
  if (!r.ok || nonMedia(r) || (range && !rangeOk)) {
    console.error('LX Storage public fallback rejected', { id, status: r.status, type: r.headers.get('content-type') });
    r.body?.cancel?.().catch?.(() => {});
    return json({ error: 'PUBLIC_FALLBACK_UNAVAILABLE', upstreamStatus: r.status }, 502, common);
  }
  const size = Number(cr.split('/')[1] || r.headers.get('content-length') || 0);
  const meta = { name: '', size, mimeType: r.headers.get('content-type') || 'application/octet-stream' };
  const h = headersFor(r, meta, common);
  h.set('x-lx-storage', 'public-fallback');
  if (action === 'probe') {
    let codec = 'unknown';
    if (rangeOk && Number(h.get('content-length')) <= 65536) codec = detectCodec(await r.arrayBuffer());
    else r.body?.cancel?.().catch?.(() => {});
    const browserCompatibility = compatibility(meta, h.get('content-type'), codec);
    return headIfRequested(json({ ok: rangeOk, fileFound: true, videoAccessible: true, rangeOk,
      browserCompatibility, codec, readyForPlayer: rangeOk && browserCompatibility === 'compatible_likely',
      file: meta, status: r.status, mode: 'public-fallback', contentType: h.get('content-type'), contentRange: cr }, 200, common), request);
  }
  if (request.method === 'HEAD') return new Response(null, { status: r.status, headers: h });
  let body = r.body;
  const length = Number(h.get('content-length'));
  if (body && Number.isSafeInteger(length) && length > 0 && typeof FixedLengthStream !== 'undefined' && context.waitUntil) {
    const fixed = new FixedLengthStream(length);
    context.waitUntil(body.pipeTo(fixed.writable));
    body = fixed.readable;
  }
  return new Response(body, { status: r.status, headers: h });
}
export default {
  async fetch(request, env, context = {}) {
    const c = cors(request, env);
    if (!c.okay) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403, c.headers);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: c.headers });
    if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'METHOD_NOT_ALLOWED' }, 405, c.headers);
    const url = new URL(request.url), active = configured(env);
    if (url.pathname === '/health') {
      let connected = null, error;
      if (url.searchParams.get('check') === '1') {
        connected = false;
        if (!active) error = 'DRIVE_AUTH_NOT_CONFIGURED';
        else try {
          const r = await drive(API + '/about?fields=kind', env);
          connected = r.ok;
          if (!r.ok) {
            error = await healthError(r);
            console.error('LX Storage health rejected', { status: r.status, code: error });
          }
        } catch (e) { error = e.message; }
      }
      return headIfRequested(json({ ok: true, service: 'LX Storage', version: 'R12', mode: active ? 'drive-api' : fallbackEnabled(env) ? 'public-fallback' : 'unconfigured',
        googleConfigured: active, googleConnected: connected, fallbackEnabled: fallbackEnabled(env), error }, 200, c.headers), request);
    }
    const m = url.pathname.match(/^\/(v|probe)\/([A-Za-z0-9_-]{10,})$/);
    if (!m) return json({ error: 'NOT_FOUND' }, 404, c.headers);
    const action = m[1], id = m[2], key = url.searchParams.get('resourcekey') || '';
    if (key && !validKey(key)) return json({ error: 'INVALID_RESOURCE_KEY' }, 400, c.headers);
    if (!validRange(request.headers.get('Range'))) return json({ error: 'INVALID_RANGE' }, 400, c.headers);
    if (!active) {
      if (fallbackEnabled(env)) try { return await publicFallback(request, env, action, id, key, c.headers, context); }
      catch (error) {
        console.error('LX Storage public fallback failed', { id, code: error?.message });
        return json({ error: 'PUBLIC_FALLBACK_UNAVAILABLE' }, 502, c.headers);
      }
      return json({ error: 'DRIVE_AUTH_NOT_CONFIGURED' }, 503, c.headers);
    }
    try {
      const meta = await metadata(env, id, key), size = Number(meta.size);
      if (action === 'v' && request.method === 'HEAD' && !request.headers.has('Range')) {
        const h = headersFor(new Response(null), meta, c.headers);
        h.set('content-length', String(size));
        return new Response(null, { status: 200, headers: h });
      }
      const range = action === 'probe' ? 'bytes=0-' + Math.min(size - 1, 65535) :
        request.headers.get('Range') || (request.method === 'HEAD' ? 'bytes=0-0' : '');
      const upstream = await drive(fileUrl(id), env, id, key, range);
      if (upstream.status === 416) {
        const h = new Headers(c.headers);
        h.set('content-range', upstream.headers.get('content-range') || 'bytes */' + size);
        return json({ error: 'RANGE_NOT_SATISFIABLE' }, 416, h);
      }
      if (!upstream.ok || nonMedia(upstream)) {
        console.error('LX Storage media rejected', { id, status: upstream.status, type: upstream.headers.get('content-type') });
        if (fallbackEnabled(env) && [403, 404].includes(upstream.status))
          return publicFallback(request, env, action, id, key, c.headers, context);
        return json({ error: nonMedia(upstream) ? 'DRIVE_RETURNED_NON_MEDIA' : errorCode(upstream.status),
          upstreamStatus: upstream.status }, upstream.ok ? 502 : [403, 404, 429].includes(upstream.status) ? upstream.status : 502, c.headers);
      }
      const rangeOk = upstream.status === 206 && /^bytes \d+-\d+\/\d+$/.test(upstream.headers.get('content-range') || '');
      if (range && !rangeOk) {
        console.error('LX Storage Range missing', { id, status: upstream.status });
        upstream.body?.cancel?.().catch?.(() => {});
        return json({ error: 'DRIVE_RANGE_UNAVAILABLE', upstreamStatus: upstream.status }, 502, c.headers);
      }
      const h = headersFor(upstream, meta, c.headers);
      if (action === 'probe') {
        let codec = 'unknown';
        if (rangeOk && Number(h.get('content-length')) <= 65536) {
          const head = await upstream.arrayBuffer();
          codec = detectCodec(head);
          if (codec === 'unknown' && /\.mp4$/i.test(meta.name || '') && size > 65536) {
            const tail = await drive(fileUrl(id), env, id, key, 'bytes=' + (size - 65536) + '-' + (size - 1));
            if (tail.status === 206 && Number(tail.headers.get('content-length')) <= 65536) codec = detectCodec(await tail.arrayBuffer());
            else tail.body?.cancel?.().catch?.(() => {});
          }
        } else upstream.body?.cancel?.().catch?.(() => {});
        const browserCompatibility = compatibility(meta, h.get('content-type'), codec);
        return headIfRequested(json({ ok: rangeOk, fileFound: true, videoAccessible: true, rangeOk,
          browserCompatibility, codec, readyForPlayer: rangeOk && browserCompatibility === 'compatible_likely',
          file: { name: meta.name, size, mimeType: meta.mimeType,
            width: meta.videoMediaMetadata?.width || null, height: meta.videoMediaMetadata?.height || null,
            durationMillis: meta.videoMediaMetadata?.durationMillis || null },
          status: upstream.status, contentType: h.get('content-type'), contentRange: h.get('content-range') }, 200, c.headers), request);
      }
      if (request.method === 'HEAD') return new Response(null, { status: upstream.status, headers: h });
      let body = upstream.body;
      // Cloudflare preserves explicit Content-Length for FixedLengthStream bodies.
      const length = Number(h.get('content-length'));
      if (body && Number.isSafeInteger(length) && length > 0 &&
          typeof FixedLengthStream !== 'undefined' && context.waitUntil) {
        const fixed = new FixedLengthStream(length);
        context.waitUntil(body.pipeTo(fixed.writable));
        body = fixed.readable;
      }
      return new Response(body, { status: upstream.status, headers: h });
    } catch (e) {
      const code = String(e?.message || 'DRIVE_FETCH_FAILED');
      console.error('LX Storage failed', { id, code, status: e?.status });
      if (fallbackEnabled(env) && [403, 404].includes(e?.status)) {
        try { return await publicFallback(request, env, action, id, key, c.headers, context); }
        catch (fallbackError) { console.error('LX Storage public fallback failed', { id, code: fallbackError?.message }); }
      }
      return json({ error: code }, [403, 404, 422].includes(e?.status) ? e.status : 502, c.headers);
    }
  },
};
