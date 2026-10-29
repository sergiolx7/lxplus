import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadDashboardMetrics,renderDashboardMetrics} from '../src/admin-monitor.js';
import {MusicDock} from '../src/music-dock.js';
const buildQuery=(response)=>({
 select(){return this},gte(){return this},order(){return this},
 limit(){return Promise.resolve(response)}
});
test('admin monitoring aggregates only read-only tables with a fixed 7-day window',async()=>{
 const calls=[];
 const sample={
  lx_client_errors:[{id:1,created_at:new Date().toISOString(),message:'Test error',page:'Início',error_type:'media'}],
  lx_analytics:[{id:1,user_id:'a',created_at:new Date().toISOString(),event:'view'},{id:2,user_id:'a',created_at:new Date().toISOString(),event:'play'}],
  lx_auto_jobs:[{kind:'films',enabled:true,status:'ok',last_error:null}],
  lx_support_tickets:[{id:1,status:'open',updated_at:new Date().toISOString()}]
 };
 const db={from(name){calls.push(name);return buildQuery({data:sample[name],error:null})}};
 const info=await loadDashboardMetrics(db);
 assert.equal(info.errorsCount,1);assert.equal(info.eventsCount,2);
 assert.equal(info.uniqueActiveLast24h,1);
 assert.equal(info.trend.reduce((a,v)=>a+v.errors,0),1);
 assert.deepEqual(calls.sort(),Object.keys(sample).sort());
 assert.match(renderDashboardMetrics(info),/Saúde da plataforma/);
 assert.match(renderDashboardMetrics(info),/não são usuários online/);
});
test('admin monitoring stays readable when some tables are inaccessible',async()=>{
 const db={from(name){return buildQuery(name==='lx_client_errors'?{data:null,error:{message:'RLS denied'}}:{data:[],error:null})}};
 const m=await loadDashboardMetrics(db);
 assert.equal(m.errorsCount,null);assert.equal(m.failures.errors,true);
 assert.match(renderDashboardMetrics(m),/Indisponível/);
});
test('error text is escaped instead of injecting into admin DOM',()=>{
 const info={errorsCount:1,eventsCount:0,uniqueActiveLast24h:0,trend:Array.from({length:7},()=>({day:'2026-10-29',errors:0,events:0})),jobs:[],tickets:[],errors:[{message:'<img onerror=alert(1)>',page:'<script>',error_type:'media'}],failures:{errors:false,events:false,jobs:false,tickets:false},truncated:{errors:false,events:false}};
 const text=renderDashboardMetrics(info);
 assert.doesNotMatch(text,/<script>|<img onerror/);
 assert.match(text,/&lt;img/);
});
test('music dock uses a proper source resolver without immediately touching browser DOM',()=>{
 const dock=new MusicDock({resolve:async()=>({kind:'audio',url:'https://example.org/song.mp3'})});
 assert.equal(dock.index,-1);
 assert.deepEqual(dock.tracks,[]);
});
