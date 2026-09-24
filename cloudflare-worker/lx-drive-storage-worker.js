/**
 * LX Storage — Google Drive byte proxy for Cloudflare Workers
 * Secrets required:
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

function cors(env, request) {
  const allowed = String(env.ALLOWED_ORIGIN || '*').trim() || '*';
  const origin = request.headers.get('Origin') || '';
  const value = allowed === '*' ? '*' : (origin === allowed ? origin : allowed);
  return {
    'access-control-allow-origin': value,
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'access-control-allow-headers': 'Range,Content-Type',
    'access-control-expose-headers': 'Accept-Ranges,Content-Length,Content-Range,Content-Type',
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

async function driveFetch(request, env, fileId, forceToken = false) {
  const token = await googleToken(env, forceToken);
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const range = request.headers.get('Range');
  if (range) headers.set('Range', range);
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  return fetch(url, { method: request.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect: 'follow' });
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
        googleConfigured: Boolean(env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY),
      }, 200, c);
    }

    const match = url.pathname.match(/^\/v\/([A-Za-z0-9_-]{10,})$/);
    if (!match || !['GET', 'HEAD'].includes(request.method)) return json({ error: 'NOT_FOUND' }, 404, c);

    try {
      let upstream = await driveFetch(request, env, match[1], false);
      if (upstream.status === 401) upstream = await driveFetch(request, env, match[1], true);

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
      h.delete('set-cookie');
      return new Response(request.method === 'HEAD' ? null : upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: h,
      });
    } catch (error) {
      return json({ error: String(error?.message || error || 'LX_STORAGE_ERROR') }, 500, c);
    }
  },
};
