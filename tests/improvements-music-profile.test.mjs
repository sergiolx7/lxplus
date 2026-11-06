import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicDock} from '../src/music-dock.js';
import {MusicQueue} from '../src/music-queue.js';
import {previewImageUrl} from '../src/image-preview.js';
import {memberProfileCard} from '../src/member-profile.js';
const tracks=[1,2,3,4].map(id=>({id,type:'Música',title:'Faixa '+id,genre:'Trap'}));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};

test('removing queued tracks preserves the current song and remaps history and shuffle coverage',()=>{
 const q=new MusicQueue();q.set(tracks,tracks[0]);q.next();q.next();
 assert.equal(q.remove(0),true);assert.equal(q.items[q.index].id,3);assert.equal(q.back().id,2);
 assert.deepEqual(q.items.map(x=>x.id),[2,3,4]);assert.equal(q.played.has(0),true);
 assert.equal(q.remove(q.index),false);assert.equal(q.remove(-1),false);assert.equal(q.remove(20),false);
});

test('reordering a queue during resolution still selects the requested song by identity',async()=>{
 const pending=deferred(),dock=new MusicDock({resolve:()=>pending.promise});dock.queue.set(tracks,tracks[0]);
 dock.load=async item=>{dock.current=item};const select=dock.select(2);dock.queue.move(2,0);
 pending.resolve({kind:'audio',url:'https://example.invalid/track.mp3'});await select;
 assert.equal(dock.current.id,3);assert.equal(dock.tracks[dock.index].id,3);
});

test('an explicit album keeps its order across genres while discovery still stays in the current genre',async()=>{
 const rows=[{...tracks[0],genre:'Trap'},{...tracks[1],genre:'Pop'},{...tracks[2],genre:'Trap'}],source={kind:'audio',url:'https://example.invalid/track.mp3'};
 const dock=new MusicDock({resolve:async()=>source});dock.load=async item=>{dock.current=item};
 await dock.open(rows[0],source,rows,{flow:false});await dock.step(1);assert.equal(dock.current.id,2);
 await dock.open(rows[0],source,rows,{flow:true});await dock.step(1);assert.equal(dock.current.id,3);
});

test('source timeout reports a recoverable failure and discards a late blob without reopening playback',async()=>{
 const pending=deferred(),dock=new MusicDock({resolve:()=>pending.promise,sourceTimeoutMs:5}),discarded=[];
 dock.discard=source=>discarded.push(source);dock.load=async()=>{throw Error('must not reopen')};
 await assert.rejects(dock.play(tracks[0]),/demorou para responder/);
 const late={kind:'audio',url:'blob:https://example.invalid/test',revokeOnCleanup:true};pending.resolve(late);
 await Promise.resolve();await Promise.resolve();assert.deepEqual(discarded,[late]);assert.equal(dock.current,null);
});

test('profile photo preview permits safe public images and rejects active or credential-bearing URLs',()=>{
 const origin='https://lx.example';
 assert.equal(previewImageUrl('/avatar.png',origin),origin+'/avatar.png');
 assert.equal(previewImageUrl('https://images.example/avatar.gif',origin),'https://images.example/avatar.gif');
 for(const value of ['javascript:alert(1)','data:text/html,bad','http://elsewhere.example/photo.png','https://user:pass@images.example/photo.png'])assert.equal(previewImageUrl(value,origin),'');
 const card=memberProfileCard({user_id:'friend',name:'Ana <LX>',avatar_url:'https://images.example/ana.png'});
 assert.match(card,/aria-label="Ampliar foto de Ana &lt;LX&gt;"/);assert.doesNotMatch(card,/<LX>/);
 assert.doesNotMatch(memberProfileCard({name:'Sem foto'}),/data-member-photo=/);
});
