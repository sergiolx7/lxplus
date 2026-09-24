/**
 * LX Storage — Google Drive byte proxy for Cloudflare Workers
 * R11: robust public-link streaming (redirect/cookie/confirmation/resource-key support)
 *
 * Zero-config mode: public Drive files shared as "Anyone with the link".
 * Optional secrets for private Drive files:
 *   GOOGLE_CLIENT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 * Optional variable:
 *   ALLOWED_ORIGIN=https://seu-site.com
 */

let tokenCache = { token: '', exp: 0 };

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function hasServiceAccount(env) {
  return Boolean(env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY);
}

function cors(env, request) {
  // Public-link mode only exposes files that are already public on Drive, so allow any site.
  // Private/service-account mode can still be locked to ALLOWED_ORIGIN.
  const configured = hasServiceAccount(env);
  const allowed = configured ? (String(env.ALLOWED_ORIGIN || '*').trim() || '*') : '*';
  const origin = request.headers.get('Origin') || '';
  const value = allowed === '*' ? '*' : (origin === allowed ? origin : allowed);
  return {
    'access-control-allow-origin': value,
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'access-control-allow-headers': 'Range,Content-Type',
    'access-control-expose-headers': 'Accept-Ranges,Content-Length,Content-Range,Content-Type,Content-Disposition,X-LX-Storage,X-LX-Drive-Mode',
    'vary': 'Origin',
  };
}

function base64urlBytes(bytes) {
  let s = '';
  const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlText(value) {
  return base64urlBytes(new TextEncoder().encode(value));
}

function pemToArrayBuffer(pem) {
  const clean = String(pem || '')
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const raw = atob(clean);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

async function googleToken(env, force = false) {
  const now = Math.floor(Date.now() / 1000);
  if (!force && tokenCache.token && tokenCache.exp > now + 90) return tokenCache.token;
  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) throw new Error('GOOGLE_SERVICE_ACCOUNT_NOT_CONFIGURED');

  const header = base64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64urlText(JSON.stringify({
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(env.GOOGLE_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64urlBytes(signature)}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || 'GOOGLE_TOKEN_FAILED');
  tokenCache = { token: data.access_token, exp: now + Number(data.expires_in || 3600) };
  return tokenCache.token;
}

function cleanResourceKey(value) {
  const v = String(value || '').trim();
  return /^[A-Za-z0-9_-]{4,256}$/.test(v) ? v : '';
}

async function authenticatedDriveFetch(request, env, fileId, resourceKey = '', forceToken = false) {
  const token = await googleToken(env, forceToken);
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const range = request.headers.get('Range');
  if (range) headers.set('Range', range);
  if (resourceKey) headers.set('X-Goog-Drive-Resource-Keys', `${fileId}/${resourceKey}`);
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  return fetch(url, { method: request.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect: 'follow' });
}

function htmlDecode(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n) || 0));
}

function scriptDecode(value) {
  return htmlDecode(String(value || ''))
    .replace(/\\u003d/gi, '=')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003f/gi, '?')
    .replace(/\\u002f/gi, '/')
    .replace(/\\x3d/gi, '=')
    .replace(/\\x26/gi, '&')
    .replace(/\\\//g, '/');
}

function tagAttr(tag, name) {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = String(tag || '').match(re);
  return htmlDecode(m?.[1] ?? m?.[2] ?? m?.[3] ?? '');
}

function collectCookies(response, jar) {
  try {
    const list = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
    for (const raw of list || []) {
      // A Set-Cookie line may contain commas in Expires; only the first name=value matters here.
      const first = String(raw || '').split(';', 1)[0].trim();
      const p = first.indexOf('=');
      if (p > 0) jar.set(first.slice(0, p).trim(), first.slice(p + 1).trim());
    }
  } catch {}
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchFollowingRedirects(url, { headers, method = 'GET', jar, max = 8 } = {}) {
  let current = String(url);
  let res = null;
  for (let i = 0; i < max; i++) {
    const h = new Headers(headers || {});
    const cookies = cookieHeader(jar || new Map());
    if (cookies) h.set('Cookie', cookies);
    res = await fetch(current, { method, headers: h, redirect: 'manual' });
    collectCookies(res, jar || new Map());
    if (![301, 302, 303, 307, 308].includes(res.status)) return { response: res, url: current };
    const loc = res.headers.get('location');
    if (!loc) return { response: res, url: current };
    current = new URL(loc, current).toString();
    if (res.status === 303) method = 'GET';
  }
  return { response: res, url: current };
}

function looksLikeHtml(response) {
  const ct = String(response?.headers?.get('content-type') || '').toLowerCase();
  return ct.includes('text/html') || ct.includes('application/xhtml+xml');
}

function likelyMediaResponse(response) {
  if (!response) return false;
  const ct = String(response.headers.get('content-type') || '').toLowerCase();
  const cd = String(response.headers.get('content-disposition') || '').toLowerCase();
  return response.status === 206 || ct.startsWith('video/') || ct.startsWith('audio/') || ct === 'application/octet-stream' || cd.includes('attachment') || cd.includes('inline');
}

function accessProblem(html) {
  const t = String(html || '').toLowerCase();
  if (/you need access|request access|sign in to continue|access denied|you don't have permission/.test(t)) return 'DRIVE_NOT_PUBLIC';
  if (/too many users have viewed|download quota|quota exceeded|can't view or download this file at this time|cannot view or download this file at this time/.test(t)) return 'DRIVE_QUOTA_EXCEEDED';
  if (/virus scan warning|can't scan this file for viruses|cannot scan this file for viruses/.test(t)) return 'DRIVE_CONFIRM_REQUIRED';
  return '';
}

function driveCandidatesFromHtml(html, currentUrl, fileId, resourceKey = '') {
  const out = [];
  const add = value => {
    value = scriptDecode(value).trim();
    if (!value) return;
    try {
      const u = new URL(value, currentUrl || 'https://drive.google.com');
      if (!/(^|\.)(drive\.usercontent\.google\.com|drive\.google\.com|googleusercontent\.com)$/i.test(u.hostname)) return;
      if (!u.searchParams.get('id')) u.searchParams.set('id', fileId);
      if (resourceKey && !u.searchParams.get('resourcekey')) u.searchParams.set('resourcekey', resourceKey);
      const s = u.toString();
      if (!out.includes(s)) out.push(s);
    } catch {}
  };

  // Confirmation form: parse attributes regardless of their order.
  for (const fm of String(html || '').matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)) {
    const block = fm[0];
    const open = block.match(/<form\b[^>]*>/i)?.[0] || '';
    const action = tagAttr(open, 'action');
    if (!action) continue;
    try {
      const u = new URL(action, currentUrl || 'https://drive.google.com');
      for (const im of block.matchAll(/<input\b[^>]*>/gi)) {
        const tag = im[0];
        const name = tagAttr(tag, 'name');
        if (!name) continue;
        u.searchParams.set(name, tagAttr(tag, 'value'));
      }
      if (!u.searchParams.get('id')) u.searchParams.set('id', fileId);
      if (resourceKey && !u.searchParams.get('resourcekey')) u.searchParams.set('resourcekey', resourceKey);
      add(u.toString());
    } catch {}
  }

  // Direct links embedded in href/script/JSON.
  for (const m of String(html || '').matchAll(/(?:https?:)?\\?\/\\?\/(?:drive\.usercontent\.google\.com|drive\.google\.com)\/[^"'<>\s]+/gi)) {
    add(m[0].startsWith('//') ? `https:${m[0]}` : m[0]);
  }
  for (const m of String(html || '').matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) add(m[1] || m[2]);

  return out;
}

async function publicDriveFetch(request, fileId, resourceKey = '') {
  const jar = new Map();
  const requestedRange = request.headers.get('Range');
  const headers = new Headers({
    'Accept': '*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
    'User-Agent': 'Mozilla/5.0 LX-Storage/2.0',
  });
  // HEAD on Drive's public download surface is inconsistent. Resolve using a 1-byte GET.
  const upstreamMethod = 'GET';
  headers.set('Range', requestedRange || (request.method === 'HEAD' ? 'bytes=0-0' : 'bytes=0-'));

  const bases = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t${resourceKey ? `&resourcekey=${encodeURIComponent(resourceKey)}` : ''}`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t${resourceKey ? `&resourcekey=${encodeURIComponent(resourceKey)}` : ''}`,
  ];

  let last = null;
  let lastProblem = '';

  for (const base of bases) {
    let fetched = await fetchFollowingRedirects(base, { headers, method: upstreamMethod, jar });
    let res = fetched.response;
    last = res;
    if (res && res.ok && likelyMediaResponse(res) && !looksLikeHtml(res)) return res;

    if (res && (res.ok || res.status === 403) && looksLikeHtml(res)) {
      const html = await res.text();
      lastProblem = accessProblem(html) || lastProblem;
      const candidates = driveCandidatesFromHtml(html, fetched.url, fileId, resourceKey);
      for (const candidate of candidates.slice(0, 8)) {
        const next = await fetchFollowingRedirects(candidate, { headers, method: 'GET', jar });
        res = next.response;
        last = res;
        if (res && res.ok && likelyMediaResponse(res) && !looksLikeHtml(res)) return res;
        if (res && looksLikeHtml(res)) {
          try {
            const h = await res.text();
            lastProblem = accessProblem(h) || lastProblem;
          } catch {}
        }
      }
    }
  }

  if (lastProblem) throw new Error(lastProblem);
  if (last) return last;
  throw new Error('DRIVE_PUBLIC_DOWNLOAD_FAILED');
}

async function driveFetch(request, env, fileId, resourceKey = '', forceToken = false) {
  if (hasServiceAccount(env)) return authenticatedDriveFetch(request, env, fileId, resourceKey, forceToken);
  return publicDriveFetch(request, fileId, resourceKey);
}

export default {
  async fetch(request, env) {
    const c = cors(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: c });
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({
        ok: true,
        service: 'LX Storage',
        version: 'R11',
        googleConfigured: hasServiceAccount(env),
        mode: hasServiceAccount(env) ? 'service-account' : 'public-drive',
      }, 200, c);
    }

    const match = url.pathname.match(/^\/(?:v|probe)\/([A-Za-z0-9_-]{10,})$/);
    if (!match || !['GET', 'HEAD'].includes(request.method)) return json({ error: 'NOT_FOUND' }, 404, c);

    const probe = url.pathname.startsWith('/probe/');
    const fileId = match[1];
    const resourceKey = cleanResourceKey(url.searchParams.get('resourcekey'));

    try {
      let upstream = await driveFetch(request, env, fileId, resourceKey, false);
      if (hasServiceAccount(env) && upstream.status === 401) upstream = await driveFetch(request, env, fileId, resourceKey, true);

      if (!upstream.ok && upstream.status !== 206) {
        let detail = '';
        try { detail = (await upstream.text()).slice(0, 500); } catch {}
        return json({ error: 'DRIVE_FETCH_FAILED', status: upstream.status, detail }, upstream.status, c);
      }

      const h = new Headers(upstream.headers);
      for (const [k, v] of Object.entries(c)) h.set(k, v);
      h.set('accept-ranges', h.get('accept-ranges') || 'bytes');
      h.set('cache-control', 'private, no-store, max-age=0');
      h.set('x-lx-storage', 'drive');
      h.set('x-lx-drive-mode', hasServiceAccount(env) ? 'service-account' : 'public-link');
      h.delete('set-cookie');
      h.delete('content-security-policy');
      h.delete('content-security-policy-report-only');

      if (probe) {
        return json({
          ok: true,
          status: upstream.status,
          contentType: upstream.headers.get('content-type') || '',
          contentLength: upstream.headers.get('content-length') || '',
          contentRange: upstream.headers.get('content-range') || '',
          acceptRanges: upstream.headers.get('accept-ranges') || '',
          mode: hasServiceAccount(env) ? 'service-account' : 'public-drive',
          resourceKey: Boolean(resourceKey),
        }, 200, c);
      }

      return new Response(request.method === 'HEAD' ? null : upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: h,
      });
    } catch (error) {
      const code = String(error?.message || error || 'LX_STORAGE_ERROR');
      const status = code === 'DRIVE_NOT_PUBLIC' ? 403 : code === 'DRIVE_QUOTA_EXCEEDED' ? 429 : 502;
      return json({ error: code }, status, c);
    }
  },
};
