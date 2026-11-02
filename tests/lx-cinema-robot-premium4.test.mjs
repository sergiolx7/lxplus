import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {renderCinemaRobotAdmin} from '../src/cinema-robot-admin.js';
import {renderPremiumCatalog} from '../src/premium-ui.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('new cinema discoveries and automated playback are not publicly released before review',async()=>{
 const migration=file('supabase/migrations/20261102042734_lx_cinema_metadata_robot_staging_v4.sql');
 const ddl=migration.slice(0,migration.indexOf('create or replace function public.lx_cinema_robot_configure('));
 const db=new PGlite();
 try{
  await db.exec("create schema lx_private; create table public.lx_auto_discovery(id text primary key,media_kind text,published boolean default true); create table public.lx_catalog(id bigint primary key,payload jsonb,published boolean default false);");
  await db.exec(ddl);
  await db.exec("insert into public.lx_auto_discovery(id,media_kind,published) values('Q1','films',true),('Q2','series',true),('Q3','music_metadata',true)");
  const q=await db.query('select id,published from public.lx_auto_discovery order by id');
  assert.deepEqual(q.rows.map(x=>x.published),[false,false,true]);
  await db.exec("insert into public.lx_catalog(id,payload,published) values(1,'{\"autoPublished\":\"true\",\"type\":\"Filme\"}'::jsonb,true),(2,'{\"type\":\"Filme\"}'::jsonb,true)");
  const catalog=await db.query('select id,payload,published from public.lx_catalog order by id');
  assert.equal(catalog.rows[0].published,false);
  assert.equal(catalog.rows[0].payload.editorialReviewRequired,true);
  assert.equal(catalog.rows[1].published,true);
 }finally{await db.close()}
});

test('cinema robot administrative settings are bounded, server-only and cron-protected',()=>{
 const sql=file('supabase/migrations/20261102042734_lx_cinema_metadata_robot_staging_v4.sql');
 assert.match(sql,/public\.lx_admin_can\('settings'\)/);
 assert.match(sql,/p_daily_limit > 10000/);
 assert.match(sql,/p_batch_size > 100/);
 assert.match(sql,/cron\.alter_job/);
 assert.match(sql,/lx-films-discovery/);
 assert.match(sql,/lx-series-discovery/);
 assert.match(sql,/revoke all on function public\.lx_cinema_robot_configure/);
 assert.doesNotMatch(sql,/grant execute.*to anon/i);
});

test('public cinema preview publishing requires explicit staff checks and no third-party playback',()=>{
 const sql=file('supabase/migrations/20261102042930_lx_cinema_metadata_review_gates_v4.sql');
 assert.match(sql,/public\.lx_admin_can\('catalog'\)/);
 assert.match(sql,/p_age_checked is distinct from true/);
 assert.match(sql,/p_rights_checked is distinct from true/);
 assert.match(sql,/metadataOnly/);
 assert.match(sql,/coming_soon/);
 assert.match(sql,/upload\\.wikimedia|upload\.wikimedia/);
 assert.match(sql,/metadataSourceId/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.doesNotMatch(sql,/authorizedVideoUrl|mediaKey|sourceMediaKey/);
});

test('studio renders functional automation controls and review confirmation',()=>{
 const html=renderCinemaRobotAdmin({
   jobs:[{kind:'films',enabled:true,daily_limit:1000,batch_size:80,processed:34,status:'healthy'},{kind:'series',enabled:false,daily_limit:500,batch_size:80,processed:22,status:'waiting'}],
   discovery_total:71000,runs:[]
 },[{id:'Q113244935',title:'Filme de exemplo',year:2024,description:'Metadado editorial',media_kind:'films',artwork:{kind:'lx'},cover_url:'',source_url:'https://www.wikidata.org/wiki/Q113244935'}]);
 assert.match(html,/70?1\.000/);
 assert.match(html,/data-cinema-config/);
 assert.match(html,/data-cinema-run="films"/);
 assert.match(html,/data-cinema-review/);
 assert.match(html,/name="ageChecked"/);
 assert.match(html,/name="rightsChecked"/);
 assert.match(html,/10\.000/);
 assert.match(html,/Em breve/);
 const studio=file('src/modules/studio.js');
 assert.match(studio,/Robô Cinema/);
 assert.match(studio,/lx_cinema_robot_configure/);
 assert.match(studio,/lx_cinema_robot_approve/);
 assert.match(studio,/lx_auto_status/);
 assert.match(studio,/lx_auto_run_now/);
});

test('metadata only cinema titles visibly say Em breve and never attempt playback',()=>{
 const html=renderPremiumCatalog({page:'Início',items:[{id:1,type:'Filme',title:'Ficha catalogada',metadataOnly:true,availability:'coming_soon'}]});
 assert.match(html,/lx-cinema-coming-badge/);
 assert.match(html,/EM BREVE/);
 const app=file('src/app.js');
 assert.match(app,/if\(item\?\.metadataOnly\|\|item\?\.catalogOnly\|\|item\?\.availability==='coming_soon'\)/);
 assert.match(app,/lx-cinema-modal-coming/);
 assert.match(file('index.html'),/lx-cinema-robot-premium4\.css/);
});
