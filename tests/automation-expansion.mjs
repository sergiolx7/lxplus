import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '../tools/catalog-qa/node_modules/@electric-sql/pglite/dist/index.js';
import {createAutomation,discoveryQuery} from '../supabase/functions/_shared/automation-core.mjs';
const pg=new PGlite(),uid='00000000-0000-4000-8000-000000000001';
await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role authenticator;create schema auth;create schema lx_private;create schema storage;create schema cron;create schema net;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.lx_is_approved() returns boolean language sql as $$select auth.uid()='${uid}'::uuid$$;
create function public.lx_admin_can(text) returns boolean language sql as $$select auth.uid()='${uid}'::uuid$$;
create table public.lx_profiles(user_id uuid primary key);create table public.lx_catalog(id bigint primary key,payload jsonb,published boolean,updated_at timestamptz);create table public.lx_catalog_tombstones(id bigint primary key);create table storage.objects(bucket_id text,metadata jsonb);create table public.lx_listening_daily(user_id uuid,day date,track_key text,title text,artist text,seconds integer);
create function lx_private.music_story(uuid,date,integer) returns jsonb language sql as $$select '{}'::jsonb$$;
create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
grant usage on schema public,auth,lx_private,storage to service_role,authenticated;grant all on public.lx_catalog to service_role;grant select on public.lx_catalog_tombstones,storage.objects to service_role;`);
await pg.exec(fs.readFileSync('supabase/migrations/20261008114122_lx_automation_maintenance.sql','utf8'));
await pg.exec(fs.readFileSync('supabase/migrations/20261010134224_lx_catalog_series_music_history.sql','utf8'));
await pg.exec(`insert into lx_auto_discovery(id,title,source_url,media_kind) values('Q1','A film','https://www.wikidata.org/wiki/Q1','films'),('Q2','A series','https://www.wikidata.org/wiki/Q2','series'),('Q3','A song','https://www.wikidata.org/wiki/Q3','music_metadata');
insert into lx_auto_runs(kind,started_at,finished_at,status,added,scanned) select 'films',now(),now(),'success',1,1 from generate_series(1,50);
set role authenticated;select set_config('request.jwt.claim.sub','${uid}',false);`);
for(const [kind,title] of [['films','A film'],['series','A series'],['music_metadata','A song']]){const r=(await pg.query('select lx_discover_catalog($1) r',[kind])).rows[0].r;assert.equal(r.items.length,1);assert.equal(r.items[0].title,title);}
assert.equal((await pg.query('select lx_private.auto_status() r')).rows[0].r.daily_history[0].added,50,'Daily totals include more than the latest 20 executions');
await pg.exec("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(pg.query("select lx_discover_catalog('series')"),/AUTH_REQUIRED/);await assert.rejects(pg.query('select lx_private.auto_status()'),/ADMIN_REQUIRED/);
await pg.exec('reset role;set role anon');await assert.rejects(pg.query("select lx_discover_catalog('films')"),/permission denied/);await pg.exec('reset role');await pg.close();
for(const kind of ['series','music_metadata']){
 const query=discoveryQuery({kind,processed:0,batch_size:50,cursor:100,day:'2026-10-10'},Date.now());assert(query.includes(kind==='series'?'Q5398426':'Q7366'));assert(query.includes('OFFSET 100'),'New categories start with incremental discovery rather than repeating an empty current-year batch');
 const writes=[],rpc=[];const chain={select(){return this},eq(){return this},neq(){return this},order(){return this},limit:async()=>({data:[],error:null})};
 const db={rpc:async(name,args)=>{rpc.push(name);return name==='lx_auto_claim'?{data:{kind,processed:0,batch_size:50,cursor:0,media_cursor:0,day:'2026-10-10',lease:'test'}}:{data:true}},from:()=>({...chain,upsert(values){writes.push(values);return {select:async()=>({data:values.map(r=>({id:r.id}))})}}})};
 const result=await createAutomation({db,base:'https://test.supabase.co',fetcher:async url=>{assert(String(url).startsWith('https://query.wikidata.org/'));return new Response(JSON.stringify({results:{bindings:[{film:{value:'http://www.wikidata.org/entity/Q42'},enLabel:{value:'Test title'}}]}}));}}).run(kind);
 assert.equal(result.added,1);assert.equal(result.playable,0);assert.equal(writes[0][0].media_kind,kind);assert(!rpc.includes('lx_auto_publish'),'Metadata discovery never creates a playable media claim');
}
console.log('PASS new categories, pagination scope, permissions, 50-run daily aggregation and metadata-only publication');
