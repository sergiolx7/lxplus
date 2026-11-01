import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MusicDock} from '../src/music-dock.js';
import {mountRoute} from '../src/route-lifecycle.js';
const track=id=>({id,type:'Música',title:'Track '+id});
const source={kind:'audio',url:'https://example.invalid/audio.mp3'};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
function dock(resolve){const value=new MusicDock({resolve});value.load=async item=>{value.current=item};return value}
test('a slower source cannot replace the last track selected',async()=>{
 const a=deferred(),b=deferred(),m=dock(item=>item.id===1?a.promise:b.promise);
 const first=m.play(track(1),[track(1),track(2)]),last=m.play(track(2),[track(1),track(2)]);b.resolve(source);await last;a.resolve(source);await first;assert.equal(m.current.id,2);assert.equal(m.index,1);
});
test('closing while a source resolves cannot reopen the music player',async()=>{
 const pending=deferred(),m=dock(()=>pending.promise),play=m.play(track(1),[track(1)]);m.cancelPending();pending.resolve(source);await play;assert.equal(m.current,null);
});
test('failed next source leaves the current queue index and playback history intact',async()=>{
 const m=dock(async()=>{throw Error('network')});m.queue.set([track(1),track(2)],track(1));m.current=track(1);await assert.rejects(m.step(1),/network/);assert.equal(m.index,0);assert.deepEqual(m.queue.previous,[]);assert.equal(m.current.id,1);
});
test('late next response cannot override a subsequent direct selection',async()=>{
 const pending=deferred(),m=dock(item=>item.id===2?pending.promise:Promise.resolve(source));m.queue.set([track(1),track(2),track(3)],track(1));m.current=track(1);const next=m.step(1);await m.select(2);pending.resolve(source);await next;assert.equal(m.current.id,3);assert.equal(m.index,2);
});
test('a late module is disposed exactly once after its route times out',async()=>{
 const pending=deferred();let tick,destroyed=0;
 const mounted=mountRoute(()=>pending.promise,{setTimer:fn=>{tick=fn},clearTimer:()=>{}});tick();await assert.rejects(mounted,/demorou/);pending.resolve({destroy:()=>destroyed++});await Promise.resolve();await Promise.resolve();assert.equal(destroyed,1);
});
test('navigating away before initialization finishes disposes the abandoned controller',async()=>{
 const pending=deferred();let active=true,destroyed=0;const mounted=mountRoute(()=>pending.promise,{isCurrent:()=>active});active=false;pending.resolve({destroy:()=>destroyed++});assert.equal(await mounted,null);assert.equal(destroyed,1);
});
