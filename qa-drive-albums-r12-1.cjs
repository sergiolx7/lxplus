const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const albums = require('./lxplus.album-grouping.js');

const same = 'data:image/jpeg;base64,QUJDREVGR0g=';
const other = 'data:image/jpeg;base64,QUJDREVGR0k=';
const grouped = albums.groupAlbums([
  { type: 'Música', id: 1, title: 'Faixa B', artist: 'Artista', album: 'Noite Azul', cover: same,
    tracks: [{ title: 'Faixa B', album: 'Noite Azul', trackNumber: 2, cover: same }] },
  { type: 'Música', id: 2, title: 'Faixa A', artist: 'Artista', album: 'Noite Azul', cover: same,
    tracks: [{ title: 'Faixa A', album: 'Noite Azul', trackNumber: 1, cover: same }] },
  { type: 'Música', id: 3, title: 'Outra', artist: 'Artista', cover: other },
  { type: 'Música', id: 4, title: 'Sem arte', cover: 'assets/lx-music-fallback.svg' },
  { type: 'Música', id: 5, title: 'Arte automática', cover: 'data:image/svg+xml;base64,PHN2Zz4=' },
]);
assert.equal(grouped.length, 1);
assert.equal(grouped[0].title, 'Noite Azul');
assert.deepEqual(grouped[0].entries.map(entry => entry.title), ['Faixa A', 'Faixa B']);
assert.deepEqual(grouped[0].itemIds, ['1', '2']);
assert.equal(albums.groupAlbums([{ type: 'Música', id: 6, title: 'Single', cover: same }]).length, 0);
const unnamed = albums.groupAlbums([
  { type: 'Música', id: 7, title: 'Uma', artist: 'Artista', cover: same },
  { type: 'Música', id: 8, title: 'Duas', artist: 'Artista', cover: same },
]);
assert.equal(unnamed[0].title, 'Álbum sem nome');
assert.equal(albums.groupAlbums([{ type: 'Música', id: 9, title: 'Uma', album: 'Mesmo nome', cover: same },
  { type: 'Música', id: 10, title: 'Duas', album: 'Mesmo nome', cover: other }]).length, 0);

const source = fs.readFileSync(__dirname + '/lxplus.bundle.js', 'utf8');
const page = fs.readFileSync(__dirname + '/index.html', 'utf8');
const bakedEndpoint = page.match(/window\.LX_DRIVE_STORAGE_ENDPOINT="([^"]*)"/)?.[1] || '';
const start = source.indexOf('/* ===== lx-drive-storage.js');
const end = source.indexOf('/* ===== free-media-hub.js', start);
assert(start >= 0 && end > start, 'Drive storage module must be present');
const ep = 'https://storage.example';
function setup(fetch, savedEndpoint=ep) {
  const values = new Map([['lxplus_drive_storage_endpoint', savedEndpoint]]);
  const window = { LX_DRIVE_STORAGE_ENDPOINT: bakedEndpoint,
    LX: { data: { branding: () => ({}) } } };
  vm.runInNewContext(source.slice(start, end), { window, fetch, URL, URLSearchParams,
    AbortController, setTimeout, clearTimeout, Date,
    localStorage: { getItem: key => values.get(key) || '', setItem: (key, val) => values.set(key, val), removeItem: key => values.delete(key) } });
  return window.LX.driveStorage;
}
const health = (version, connected=true) => ({ ok: true, json: async () =>
  ({ service: 'LX Storage', version, googleConnected: connected, googleConfigured: connected,
    error: connected ? '' : 'DRIVE_AUTH_NOT_CONFIGURED' }) });
(async () => {
  const defaultWorker = setup(async () => health('R12'), '');
  assert.equal(defaultWorker.endpoint(), 'https://lxplus.sergio-sousa.workers.dev');
  assert.match(defaultWorker.explain('DRIVE_API_DISABLED'), /Ative a Google Drive API/);
  assert.match(defaultWorker.explain('DRIVE_API_REJECTED'), /API do Drive recusou/);

  const legacy = setup(async () => health('R11'));
  await assert.rejects(legacy.ensureReady(), /LX_STORAGE_WORKER_OUTDATED/);
  assert.match(legacy.explain('LX_STORAGE_WORKER_OUTDATED'), /Worker antigo/);

  const offline = setup(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(offline.ensureReady(), /LX_STORAGE_NETWORK/);

  const noAuth = setup(async () => health('R12', false));
  await assert.rejects(noAuth.ensureReady(), /DRIVE_AUTH_NOT_CONFIGURED/);

  let calls = 0;
  const current = setup(async url => {
    calls++;
    if(url.includes('/health'))return health('R12');
    return { ok: false, status: 404, json: async () => ({ error: 'FILE_NOT_FOUND_OR_NO_ACCESS' }) };
  });
  await assert.rejects(current.probe('gdrive:abcdefghijklmnop_123456789'), /FILE_NOT_FOUND_OR_NO_ACCESS/);
  assert.equal(calls, 2);
  console.log('R12.3 video diagnosis and automatic music albums: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
