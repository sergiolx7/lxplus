import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=readFileSync(new URL('../src/calls.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export class Calls','class Calls');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
function harness({heartbeat=async()=>({status:'accepted'}),signals=async()=>[],incoming=async()=>[]}={}){
 let signalQueries=0;
 const db={rpc:async()=>({data:await heartbeat()}),from:table=>{
  const query={select(){return this},eq(){return this},gte(){return this},gt(){return this},order(){return this},limit(){return this},then(resolve,reject){if(table==='lx_call_signals')signalQueries++;return Promise.resolve(table==='lx_calls'?incoming():signals()).then(data=>({data})).then(resolve,reject)}};
  return query;
 }};
 const Calls=new Function('db','checked',code+';return Calls')(db,async result=>(await result).data);
 const c=Object.assign(Object.create(Calls.prototype),{closed:false,polling:false,call:{id:'call-a',status:'accepted'},pc:null,userId:'me',cursor:0,seen:new Set(),ice:[],incoming:null});
 const applied=[];c.applySignal=async signal=>{applied.push(signal)};c.status=()=>{};
 return {c,applied,signalQueries:()=>signalQueries};
}

test('an offer arriving during peer preparation stays unread and is applied once the peer exists',async()=>{
 const offer={id:41,sender_id:'friend',kind:'offer',payload:{type:'offer'}},h=harness({signals:async()=>[offer]});
 await h.c.poll();assert.equal(h.c.cursor,0);assert.equal(h.signalQueries(),0);assert.deepEqual(h.applied,[]);
 h.c.pc={};await h.c.poll();assert.equal(h.c.cursor,41);assert.deepEqual(h.applied,[offer]);
 await h.c.poll();assert.deepEqual(h.applied,[offer]);
});

test('an old heartbeat cannot close a subsequent call',async()=>{
 const pending=deferred(),h=harness({heartbeat:()=>pending.promise});let disposed=0;
 h.c.disposeMedia=()=>disposed++;h.c.removeSurface=()=>{};
 const poll=h.c.poll();h.c.call={id:'call-b',status:'accepted'};h.c.pc={};
 pending.resolve({status:'ended'});await poll;
 assert.equal(h.c.call.id,'call-b');assert.equal(disposed,0);
});

test('an old signal response cannot apply to a new peer',async()=>{
 const pending=deferred(),requested=deferred(),h=harness({signals:()=>{requested.resolve();return pending.promise}});
 h.c.pc={};const poll=h.c.poll();await requested.promise;
 h.c.call={id:'call-b',status:'accepted'};h.c.pc={};
 pending.resolve([{id:42,sender_id:'friend',kind:'offer'}]);await poll;
 assert.deepEqual(h.applied,[]);assert.equal(h.c.cursor,0);
});

test('incoming-call lookup cannot replace the surface of a call started while it was pending',async()=>{
 const pending=deferred(),h=harness({incoming:()=>pending.promise});h.c.call=null;let shown=0;
 h.c.showIncoming=()=>shown++;
 const poll=h.c.poll();h.c.call={id:'call-b',status:'ringing'};
 pending.resolve([{id:'call-a'}]);await poll;assert.equal(shown,0);
});

test('a failed signal is retried without advancing its polling cursor',async()=>{
 const offer={id:43,sender_id:'friend',kind:'offer'},h=harness({signals:async()=>[offer]});h.c.pc={};let attempts=0;
 h.c.applySignal=async()=>{if(++attempts===1)throw Error('temporary negotiation error')};
 await assert.rejects(h.c.poll(),/temporary/);assert.equal(h.c.cursor,0);
 await h.c.poll();assert.equal(h.c.cursor,43);assert.equal(attempts,2);
});
