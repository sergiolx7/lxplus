const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync(__dirname + '/lxplus.bundle.js', 'utf8');
const extract = (start, end) => {
  const from = src.indexOf(start), to = src.indexOf(end, from);
  assert(from >= 0 && to > from, `Missing function: ${start}`);
  return src.slice(from, to);
};

(async () => {
  const songs = [
    { id: 1, type: 'Música', title: 'CUIDA DO PET', genre: 'Gospel', artist: 'A', tracks: [{ title: 'CUIDA DO PET', mediaKey: 'cloud:media/1' }] },
    { id: 2, type: 'Música', title: 'Para Ti Eu Vou', genre: 'Gospel', artist: 'B', tracks: [{ title: 'Para Ti Eu Vou', mediaKey: 'cloud:media/2' }] },
    { id: 3, type: 'Música', title: 'SEMI NUA 2', genre: 'Pop', artist: 'C', tracks: [{ title: 'SEMI NUA 2', mediaKey: 'cloud:media/3' }] },
    { id: 4, type: 'Música', title: 'Sem arquivo', genre: 'Pop', artist: 'D' }
  ];
  const nodes = new Map(['musicDock', 'musicTitle', 'musicArtist'].map(id => [id, {
    textContent: '', classList: { hidden: true, contains: () => false, remove() { this.hidden = false } }
  }]));
  let selected = 0, toggled = 0, loaded = 0;
  const LX = { artwork: { url: () => '', fallback: 'fallback' }, toast: message => assert(message) };
  const state = { musicQueue: [], musicIndex: 0, musicGenre: 'Todos' };
  const context = vm.createContext({ LX, state, D: { catalog: () => songs, track: () => {} },
    $: id => nodes.get(id), musicCatalog: () => songs, musicGenresOf: x => [x.genre],
    musicHasGenre: (x, g) => x.genre === g, currentMusic: () => state.musicQueue[state.musicIndex],
    unlockMusicGesture() {}, toggleCurrentMusic() { toggled++ }, setMusicDockArtwork() {},
    loadTrack: async () => { loaded++; return true }, rememberMusicStart() {},
    setMusicStatus() {}, musicErrorText: () => 'erro', console });
  vm.runInContext(extract('function music(id,index=0,autoplay=true,queueIds=null){', '\nlet musicLoadTicket'), context);
  context.music(1);
  assert.equal(nodes.get('musicDock').classList.hidden, false, 'Selecting a track must open the dock immediately');
  assert.equal(nodes.get('musicTitle').textContent, 'CUIDA DO PET');
  assert.equal(state.musicQueue.length, 2, 'Automatic next must stay in the same genre');
  assert.equal(state.musicQueue[1].title, 'Para Ti Eu Vou');
  context.music(1);assert.equal(toggled, 1, 'Tapping the active track must toggle playback');
  context.music(1, 0, true, [1, 3]);assert.equal(state.musicQueue[1].title, 'SEMI NUA 2', 'Personal collection controls the queue');
  context.music(4);assert.equal(nodes.get('musicTitle').textContent, 'Sem arquivo', 'Missing source still opens a player with its title');
  assert.equal(state.musicQueue.length >= 1, true);
  await Promise.resolve();assert(loaded >= 3);

  const root = { contains: () => true, onclick: null };
  const bindContext = vm.createContext({ LX: { music(id) { selected = Number(id) }, artwork: { hydrate() {} }, syncMusicCardState() {} },
    $: id => id === 'homeContent' ? root : null, $$: () => [], document: { querySelector: () => null },
    queueMicrotask: fn => fn() });
  vm.runInContext(extract('function bindMusicExperience(){', '\nfunction musicSetView('), bindContext);
  bindContext.bindMusicExperience();
  root.onclick({ target: { closest: () => ({ dataset: { lxPlayId: '2' } }) } });
  assert.equal(selected, 2, 'A click on a music card reaches the player');
  process.stdout.write('R4 music interactions: PASS (dock, same genre, collection order, empty source, card click)\n');
})().catch(error => { console.error(error); process.exitCode = 1 });
