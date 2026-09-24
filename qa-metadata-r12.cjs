const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { File } = require('node:buffer');

const source = fs.readFileSync(__dirname + '/lxplus.bundle.js', 'utf8');
const start = source.indexOf('/* ===== music-smart-metadata-v31.2.js ===== */');
const end = source.indexOf("\n})();", start) + 5;
assert(start >= 0 && end > start, 'Music metadata module must be present');
const document = { createElement: name => {
  assert.equal(name, 'audio');
  return { set src(_) { queueMicrotask(() => this.onerror?.()); } };
} };
const window = { LX: { cloud: { db: () => null } } };
const context = vm.createContext({ window, document, console, TextDecoder, Uint8Array, Blob,
  URL, setTimeout, clearTimeout, queueMicrotask });
vm.runInContext(source.slice(start, end), context);

const box = (type, bytes) => {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + bytes.length);
  Buffer.from(type, 'latin1').copy(header, 4);
  return Buffer.concat([header, bytes]);
};
const tag = (type, bytes) => box(type, box('data', Buffer.concat([Buffer.alloc(8), bytes])));
const frame = (id, text) => {
  const body = Buffer.concat([Buffer.from([3]), Buffer.from(text)]);
  const header = Buffer.alloc(10);
  header.write(id, 0, 'latin1');
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
};

(async () => {
  const fallback = await window.LX.musicMeta.probeFile(new File([Buffer.from('audio')], 'The Weeknd - Blinding Lights.mp3'));
  assert.equal(fallback.artist, 'The Weeknd');
  assert.equal(fallback.title, 'Blinding Lights');

  const frames = Buffer.concat([frame('TIT2', 'Blinding Lights'), frame('TPE1', 'The Weeknd'), frame('TRCK', '3/12')]);
  const header = Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, frames.length]);
  const mp3 = await window.LX.musicMeta.readId3(new File([header, frames], 'tagged.mp3'));
  assert.equal(mp3.title, 'Blinding Lights');
  assert.equal(mp3.artist, 'The Weeknd');
  assert.equal(mp3.trackNumber, 3);

  const m4aBytes = Buffer.concat([box('ftyp', Buffer.from('M4A ')),
    box('ilst', Buffer.concat([tag('©nam', Buffer.from('Canção')), tag('©ART', Buffer.from('Artista')),
      tag('©alb', Buffer.from('Álbum')), tag('trkn', Buffer.from([0, 0, 0, 7, 0, 12]))]))]);
  const m4a = await window.LX.musicMeta.readId3(new File([m4aBytes], 'faixa.m4a'));
  assert.equal(m4a.title, 'Canção');
  assert.equal(m4a.artist, 'Artista');
  assert.equal(m4a.album, 'Álbum');
  assert.equal(m4a.trackNumber, 7);
  console.log('R12 music metadata: PASS (filename fallback, MP3 ID3 and M4A tags)');
})().catch(e => { console.error(e); process.exitCode = 1; });
