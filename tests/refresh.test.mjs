import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {normalizeAudioEffects,supportsAudioEffects,AudioEffects} from '../src/audio-effects.js';
import {normalizeDisplay,themeTokens,bindDisplayAccount,readDisplay,writeDisplay} from '../src/display-preferences.js';
import {presenceSummary} from '../src/social-presence.js';
import {verifiedBadge,duration} from '../src/ui.js';
test('theme colors survive account changes without leaking another account preference',()=>{
 const storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key),setItem:(key,val)=>storage.set(key,val)};
 bindDisplayAccount('one');writeDisplay({theme:'rose',surface:'graphite'});bindDisplayAccount('two');assert.equal(readDisplay().theme,'violet');writeDisplay({theme:'mint'});bindDisplayAccount('one');assert.equal(readDisplay().theme,'rose');bindDisplayAccount(null);delete globalThis.localStorage;
 assert.equal(normalizeDisplay({theme:'evil',customColor:'red;url(evil)'}).theme,'violet');assert.equal(themeTokens({theme:'custom',customColor:'#000000'}).ink,'#ffffff');assert.equal(themeTokens({theme:'custom',customColor:'#ffffff'}).ink,'#101216');
});
test('equalization rejects unsupported streams and failed cross-origin permission without downloading audio',async()=>{
 assert.equal(await supportsAudioEffects({kind:'iframe',url:'https://example.test'}),false);
 assert.equal(await supportsAudioEffects({kind:'audio',url:'blob:https://lx.example/test'},{origin:'https://lx.example'}),true);
 let method;assert.equal(await supportsAudioEffects({kind:'audio',url:'https://audio.example/file.mp3'},{fetcher:async(_url,options)=>{method=options.method;throw Error('CORS')}}),false);assert.equal(method,'HEAD');
 assert.deepEqual(normalizeAudioEffects({enabled:true,preset:'custom',bands:[99,-99,NaN,'x',3]}).bands,[6,-6,0,0,3]);
});
test('audio filters can bypass processing and disconnect old tracks',async()=>{
 const nodes=[];const node=()=>{const n={links:[],gain:{setTargetAtTime(v){this.value=v}},frequency:{},Q:{},connect(to){this.links.push(to)},disconnect(){this.links=[]}};nodes.push(n);return n};
 class Context{constructor(){this.state='running';this.destination={};this.currentTime=0}resume(){return Promise.resolve()}createMediaElementSource(){return node()}createGain(){return node()}createBiquadFilter(){return node()}close(){this.closed=true;return Promise.resolve()}}
 globalThis.AudioContext=Context;const fx=new AudioEffects();await fx.resume();fx.attach({},normalizeAudioEffects({enabled:true,preset:'bass'}));assert.equal(fx.filters[0].gain.value,5);assert.ok(fx.preamp.gain.value<1);fx.update({enabled:false});assert.deepEqual(fx.source.links,[fx.context.destination]);fx.detach();assert.ok(nodes.every(n=>n.links.length===0));fx.destroy();delete globalThis.AudioContext;
});
test('presence expires after 90 seconds and never invents private activity or future last-seen dates',()=>{
 const now=Date.parse('2026-11-01T03:00:00Z');assert.equal(presenceSummary(null,now).state,'private');assert.equal(presenceSummary({status:'online',updated_at:'2026-11-01T02:59:30Z',activity_title:'Faixa A'},now).activity,'Faixa A');assert.equal(presenceSummary({status:'online',updated_at:'2026-11-01T02:55:00Z',activity_title:'Segredo'},now).label,'Visto há 5 min');assert.equal(presenceSummary({status:'offline',updated_at:'2026-11-01T02:55:00Z',activity_title:'Segredo'},now).activity,'');assert.equal(presenceSummary({status:'online',updated_at:'2027-01-01'},now).state,'offline');assert.equal(verifiedBadge({verified:'true'}),'');assert.match(verifiedBadge({verified:true}),/Perfil verificado pela LX Plus/);assert.equal(duration(Infinity),'0:00');
});
test('moderation is report-bound and denies members and editors while preserving unrelated private posts',async()=>{
 const db=new PGlite();try{await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function public.lx_admin_can(text) returns boolean language sql as $$select current_setting('test.role',true) in ('owner','administrator','moderator')$$;create table public.lx_profiles(user_id uuid,name text);create table public.lx_posts(id uuid primary key,author_id uuid,body text,status text);create table public.lx_moderation_reports(id uuid primary key,user_id uuid,target_kind text,target_id text,status text);alter table public.lx_moderation_reports enable row level security;create policy reports_read on public.lx_moderation_reports for select to authenticated using(user_id=auth.uid());grant usage on schema auth to authenticated;grant select on public.lx_moderation_reports to authenticated;insert into public.lx_posts values('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','Reported','published'),('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','Private unreported','published');insert into public.lx_moderation_reports values('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','post','11111111-1111-4111-8111-111111111111','open');`);
 const migration=readFileSync('supabase/migrations/20261101031610_lx_refresh_report_moderation.sql','utf8');await db.exec(migration);await db.exec(`set role authenticated;select set_config('test.uid','66666666-6666-4666-8666-666666666666',false)`);
 for(const role of ['member','editor']){await db.query("select set_config('test.role',$1,false)",[role]);await assert.rejects(db.query("select public.lx_moderate_report('44444444-4444-4444-8444-444444444444','hide')"),/permission denied/);assert.equal((await db.query('select * from public.lx_moderation_reports')).rows.length,0)}
 await db.exec("select set_config('test.role','moderator',false)");assert.equal((await db.query('select * from public.lx_moderation_reports')).rows.length,1);await db.query("select public.lx_moderate_report('44444444-4444-4444-8444-444444444444','hide')");await assert.rejects(db.query("select public.lx_moderate_report('22222222-2222-4222-8222-222222222222','hide')"),/report not found/);await db.exec('reset role');const posts=(await db.query('select body,status from public.lx_posts order by body')).rows;assert.deepEqual(posts,[{body:'Private unreported',status:'published'},{body:'Reported',status:'hidden'}]);
 }finally{await db.close()}
});
