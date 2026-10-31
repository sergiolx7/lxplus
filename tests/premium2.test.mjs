import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preferenceSync} from '../src/preference-sync.js';
import {normalizePlayback,resumePosition,nextEpisodeCountdown} from '../src/playback-preferences.js';
import {catalogFilter,matchesPerson,rememberSearch} from '../src/catalog-search.js';
import {musicMix} from '../src/music-discovery.js';
import {normalizeReader,safeBookPath} from '../src/reader-state.js';
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve}}
test('a slow preference write cannot undo a newer choice or discard another field',async()=>{
 const hold=deferred(),writes=[],saved=[];let calls=0;
 const sync=preferenceSync({save:async(owner,key,value)=>{writes.push({owner,key,value});if(++calls===1)await hold.promise},onSaved:(key,value)=>saved.push([key,value])});sync.bind('A');
 sync.write('display',{size:1});sync.write('display',{size:2});sync.write('display',{size:3});sync.write('playback',{volume:.3});hold.resolve();await sync.flush();
 assert.deepEqual(writes.map(x=>[x.key,x.value]),[['display',{size:1}],['display',{size:3}],['playback',{volume:.3}]]);assert.equal(saved.at(-1)[0],'playback');
});
test('switching accounts discards queued old preferences and ignores the old response',async()=>{
 const hold=deferred(),saved=[],writes=[];const sync=preferenceSync({save:async(owner,key,value)=>{writes.push(owner);if(owner==='A')await hold.promise},onSaved:(key,value)=>saved.push(value)});sync.bind('A');sync.write('display',1);sync.write('display',2);sync.bind('B');sync.write('display',3);hold.resolve();await sync.flush();assert.deepEqual(writes,['A','B']);assert.deepEqual(saved,[3]);
});
test('playback preferences clamp malformed values and resume only the matching unfinished episode',()=>{
 const p=normalizePlayback({volume:9,speed:9,subtitleOffset:-99});assert.equal(p.volume,1);assert.equal(p.speed,1);assert.equal(p.subtitleOffset,-30);assert.equal(resumePosition({position:33,episodeIndex:2},100,2),33);assert.equal(resumePosition({position:33,episodeIndex:2},100,1),0);assert.equal(resumePosition({position:99},100),0);
});
test('cancelled next-episode countdown never advances and play-now advances once',()=>{
 let timer,next=0;const start=()=>nextEpisodeCountdown({seconds:2,setTimer:fn=>{timer=fn;return 1},clearTimer:()=>{},onNext:()=>next++});const first=start();first.cancel();timer();assert.equal(next,0);const second=start();second.now();second.now();timer();assert.equal(next,1);
});
test('catalog search includes artist, author, album and genre without injecting PostgREST operators',()=>{
 const filter=catalogFilter('x%,title.eq.secret)');assert.match(filter,/payload->>artist.ilike/);assert.match(filter,/payload->>author.ilike/);assert.match(filter,/payload->>album.ilike/);assert.doesNotMatch(filter,/eq\.secret|\)/);assert.equal(matchesPerson({name:'Sérgio LX'},'sergio'),true);assert.deepEqual(rememberSearch(['SÉRGIO','Livro'],'sergio'),['sergio','Livro']);
});
test('music recommendations prioritize related published tracks and never fabricate or repeat an excluded ID',()=>{
 const rows=[{id:1,type:'Música',genre:'Rock',artist:'A'},{id:2,type:'Música',genre:'Jazz'},{id:3,type:'Música',genre:'Rock'},{id:4,type:'Música',genre:'Rock',published:false},{id:5,type:'Livro',genre:'Rock'}];const mix=musicMix(rows,{current:rows[0],exclude:['1']});assert.deepEqual(mix.map(x=>x.id),[3,2]);assert.equal(musicMix([]).length,0);
});
test('reader bookmarks, notes and theme are bounded and reset incompatible positions',()=>{
 const state=normalizeReader({format:'pdf',position:99,theme:'script',fontSize:100,notes:'a'.repeat(20000),bookmarks:[{position:1,label:'A'},{position:-1}]},'epub');assert.equal(state.position,1);assert.equal(state.theme,'dark');assert.equal(state.fontSize,30);assert.equal(state.notes.length,10000);assert.equal(state.bookmarks.length,1);
});
test('EPUB references stay inside the archive and reject remote, scripted and encoded traversal paths',()=>{
 assert.equal(safeBookPath('OEBPS/book.opf','chapter/one.xhtml'),'OEBPS/chapter/one.xhtml');assert.equal(safeBookPath('OEBPS/chapter/one.xhtml','../image.jpg'),'OEBPS/image.jpg');for(const path of ['https://evil.example/chapter','//evil.example/a','javascript:alert(1)','%2e%2e/%2e%2e/a','bad\\path'])assert.throws(()=>safeBookPath('OEBPS/book.opf',path));
});
