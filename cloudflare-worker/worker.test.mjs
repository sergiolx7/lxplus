import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from './lx-drive-storage-worker.js';

const id = 'abcdefghijklmnop_123456789';
const origin = 'https://xn--rifamilionria-deb.api.br';
const request = (path, method = 'GET', headers = {}) =>
  new Request('https://lx-storage.example' + path, { method, headers: { Origin: origin, ...headers } });
const blank = { ALLOWED_ORIGIN: origin };
const pair = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', pair.privateKey));
const privateKey = '-----BEGIN PRIVATE KEY-----\n' + pkcs8.toString('base64') + '\n-----END PRIVATE KEY-----\n';
const env = { ...blank, GOOGLE_CLIENT_EMAIL: 'storage@example.iam.gserviceaccount.com', GOOGLE_PRIVATE_KEY: privateKey };
const originalFetch = globalThis.fetch;
const metadata = { id, name: 'video.mp4', size: '1000', mimeType: 'video/mp4',
  capabilities: { canDownload: true }, videoMediaMetadata: { width: 1920, height: 1080, durationMillis: '60000' } };
const calls = [];
let mediaStatus = 206, mediaType = 'video/mp4', includeRange = true;
let binary = new TextEncoder().encode('ftypisom.....avc1.........mp4a......');

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input), headers = new Headers(options.headers || {});
  calls.push({ url, headers, method: options.method });
  if (url.hostname === 'oauth2.googleapis.com')
    return Response.json({ access_token: 'test-token', expires_in: 3600 });
  if (url.hostname === 'drive.usercontent.google.com') {
    const begin = Number((headers.get('range') || 'bytes=0-').match(/^bytes=(\d+)/)?.[1] || 0);
    return new Response(binary, { status: 206,
      headers: { 'Content-Type': mediaType, 'Content-Length': String(binary.length),
        'Content-Range': 'bytes ' + begin + '-' + (begin + binary.length - 1) + '/1000' } });
  }
  if (url.pathname.endsWith('/about')) return Response.json({ kind: 'drive#about' });
  if (url.searchParams.has('fields')) return Response.json(metadata);
  if (url.searchParams.get('alt') === 'media') {
    const range = headers.get('range') || 'bytes=0-999';
    const begin = Number(range.match(/^bytes=(\d+)/)?.[1] || 0);
    const length = Math.min(binary.length, 1000 - begin);
    return new Response(binary.slice(0, length), { status: mediaStatus,
      headers: { 'Content-Type': mediaType, 'Content-Length': String(length), ETag: '"google-etag"',
        ...(includeRange ? { 'Content-Range': 'bytes ' + begin + '-' + (begin + length - 1) + '/1000' } : {}) } });
  }
  throw new Error('unexpected fetch: ' + url.toString());
};

test('health distinguishes unconfigured from connected', async () => {
  const empty = await (await worker.fetch(request('/health?check=1'), blank)).json();
  assert.equal(empty.googleConnected, false);
  const connected = await (await worker.fetch(request('/health?check=1'), env)).json();
  assert.equal(connected.googleConnected, true);
  assert.equal(connected.mode, 'drive-api');
});

test('media Range returns 206, matching headers, CORS and resource key', async () => {
  calls.length = 0;
  const response = await worker.fetch(request('/v/' + id + '?resourcekey=resource_01', 'GET', { Range: 'bytes=100-199' }), env);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 100-' + (99 + binary.length) + '/1000');
  assert.equal(response.headers.get('content-type'), 'video/mp4');
  assert.equal(response.headers.get('etag'), '"google-etag"');
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  const media = calls.find(c => c.url.searchParams.get('alt') === 'media');
  assert.equal(media.headers.get('range'), 'bytes=100-199');
  assert.equal(media.headers.get('x-goog-drive-resource-keys'), id + '/resource_01');
  assert.equal((await response.arrayBuffer()).byteLength, binary.length);
});

test('HEAD returns full metadata without downloading the movie', async () => {
  calls.length = 0;
  const response = await worker.fetch(request('/v/' + id, 'HEAD'), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), '1000');
  assert.equal(await response.text(), '');
  assert.equal(calls.some(c => c.url.searchParams.get('alt') === 'media'), false);
});
test('OPTIONS answers the playback CORS preflight', async () => {
  const response = await worker.fetch(request('/v/' + id, 'OPTIONS', { 'Access-Control-Request-Headers': 'range' }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.match(response.headers.get('access-control-allow-headers'), /Range/);
});

test('probe identifies accessible MP4, 206 and H.264/AAC', async () => {
  const response = await worker.fetch(request('/probe/' + id), env);
  const report = await response.json();
  assert.equal(report.fileFound, true);
  assert.equal(report.rangeOk, true);
  assert.equal(report.codec, 'H.264 + AAC');
  assert.equal(report.readyForPlayer, true);
});
test('probe flags HEVC separately from Drive connectivity', async () => {
  binary = new TextEncoder().encode('ftypisom.....hvc1.........mp4a......');
  const report = await (await worker.fetch(request('/probe/' + id), env)).json();
  assert.equal(report.rangeOk, true);
  assert.equal(report.codec, 'HEVC/H.265');
  assert.equal(report.browserCompatibility, 'codec_incompatible');
  binary = new TextEncoder().encode('ftypisom.....avc1.........mp4a......');
});

test('invalid origin, missing configuration and HTML do not leak movie bytes', async () => {
  assert.equal((await worker.fetch(new Request('https://lx-storage.example/v/' + id,
    { headers: { Origin: 'https://other.example' } }), env)).status, 403);
  assert.equal((await worker.fetch(request('/v/' + id), blank)).status, 503);
  mediaType = 'text/html';
  const response = await worker.fetch(request('/v/' + id), env);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, 'DRIVE_RETURNED_NON_MEDIA');
  mediaType = 'video/mp4';
});

test('a Drive response that ignores Range is rejected', async () => {
  mediaStatus = 200; includeRange = false;
  const response = await worker.fetch(request('/v/' + id, 'GET', { Range: 'bytes=0-100' }), env);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, 'DRIVE_RANGE_UNAVAILABLE');
  mediaStatus = 206; includeRange = true;
});
test('explicit public fallback works only for valid byte responses', async () => {
  const fallback = { ...blank, ALLOW_PUBLIC_FALLBACK: 'true' };
  const good = await worker.fetch(request('/v/' + id, 'GET', { Range: 'bytes=0-100' }), fallback);
  assert.equal(good.status, 206);
  assert.equal(good.headers.get('x-lx-storage'), 'public-fallback');
  mediaType = 'text/html';
  const bad = await worker.fetch(request('/v/' + id, 'GET', { Range: 'bytes=0-100' }), fallback);
  assert.equal(bad.status, 502);
  assert.equal((await bad.json()).error, 'PUBLIC_FALLBACK_UNAVAILABLE');
  mediaType = 'video/mp4';
});

test.after(() => { globalThis.fetch = originalFetch; });
