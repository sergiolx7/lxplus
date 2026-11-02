import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {renderPopularCinemaQueue} from '../src/cinema-popular-admin.js';
const content=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=content('supabase/migrations/20261102112738_lx_cinema_popular_priority_poster_approval_v4.sql');

test('73 editorial priority entries are seeded across films, TV, dramas and anime',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role authenticated; create role anon; create table public.lx_catalog(id bigint primary key,payload jsonb,published boolean default false,updated_at timestamptz default now());create table public.lx_catalog_tombstones(id bigint primary key);create function public.lx_admin_can(text) returns boolean language sql as $$select true$$;");
  await db.exec(sql);
  const result=await db.query('select kind,count(*)::int as qty from public.lx_cinema_priority_queue group by kind order by kind');
  assert.deepEqual(result.rows,[{kind:'Anime',qty:14},{kind:'Dorama',qty:14},{kind:'Filme',qty:30},{kind:'Série',qty:15}]);
  await db.exec(sql);
  const total=await db.query('select count(*)::int n from public.lx_cinema_priority_queue');
  assert.equal(total.rows[0].n,73,'seed repeat does not duplicate');
  const queue=(await db.query('select public.lx_cinema_priority_dashboard(100) as result')).rows[0].result;
  assert.equal(queue.waiting_poster,73);
  assert.equal(queue.published,0);
  const first=queue.rows[0];
  assert.equal(first.editorial_rank,1);
  assert.equal(first.poster_url,null);
 }finally{await db.close()}
});

test('priority titles require a verified, admin-uploaded real poster and synopsis',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role authenticated; create role anon; create table public.lx_catalog(id bigint primary key,payload jsonb,published boolean default false,updated_at timestamptz default now());create table public.lx_catalog_tombstones(id bigint primary key);create function public.lx_admin_can(text) returns boolean language sql as $$select true$$;");
  await db.exec(sql);
  const id=(await db.query("select id from public.lx_cinema_priority_queue where kind='Filme' and title='Titanic'")).rows[0].id;
  const url='https://ubidogquzpdvrbzbhxda.supabase.co/storage/v1/object/public/lx-assets/artwork/uploads/12345678-1111-4444-aaaa-123456789abc.jpg';
  const synopsis='Um relato cinematográfico sobre uma viagem histórica e personagens fictícios.';
  const evidence='Contrato comercial registrado com detentor da arte.';
  await assert.rejects(()=>db.query('select public.lx_cinema_priority_submit($1,$2,$3,$4,$5,$6)',[id,'https://evil.test/poster.jpg',evidence,'Studio autorizado',synopsis,true]),/UPLOAD_LICENSE/);
  await assert.rejects(()=>db.query('select public.lx_cinema_priority_submit($1,$2,$3,$4,$5,$6)',[id,url,evidence,'Studio autorizado',synopsis,false]),/AGE_REVIEW_REQUIRED/);
  const r=(await db.query('select public.lx_cinema_priority_submit($1,$2,$3,$4,$5,$6) as result',[id,url,evidence,'Studio autorizado',synopsis,true])).rows[0].result;
  assert.equal(r.ready,true);
  const published=(await db.query('select public.lx_cinema_priority_publish(20) result')).rows[0].result;
  assert.equal(published.published,1);
  const result=await db.query("select payload,published from public.lx_catalog where payload->>'title'='Titanic'");
  assert.equal(result.rows[0].published,true);
  assert.equal(result.rows[0].payload.cover,url);
  assert.equal(result.rows[0].payload.availability,'coming_soon');
  assert.equal(result.rows[0].payload.mediaKey,undefined);
  assert.equal(result.rows[0].payload.coverRights.verified,true);
  assert.equal((await db.query('select public.lx_cinema_priority_publish(20) result')).rows[0].result.published,0);
 }finally{await db.close()}
});

test('popular queue UI requires upload plus license confirmation',()=>{
 const html=renderPopularCinemaQueue({rows:[{id:1,kind:'Filme',title:'Titanic',release_year:1997,editorial_rank:1,status:'awaiting_poster'}],waiting_poster:1,total:1});
 assert.match(html,/Grandes sucessos primeiro/);
 assert.match(html,/data-priority-poster/);
 assert.match(html,/posterFile/);
 assert.match(html,/rightsConfirmed/);
 assert.match(html,/ageConfirmed/);
 assert.match(html,/evidence/);
 assert.match(html,/name="synopsis"/);
 const studio=content('src/modules/studio.js');
 assert.match(studio,/lx_cinema_priority_dashboard/);
 assert.match(studio,/lx_cinema_priority_submit/);
 assert.match(studio,/lx_cinema_priority_publish/);
 assert.match(studio,/inspectCoverFile\(file\)/);
 assert.match(content('src/data.js'),/editorialRank/);
});

test('poster-first migration deactivates bare-plot publication and hides automatically seeded empty art',()=>{
 const migrate=content('supabase/migrations/20261102112513_lx_cinema_poster_first_hide_unlicensed_metadata_v4.sql');
 assert.match(migrate,/cron\.unschedule/);
 assert.match(migrate,/drop function if exists lx_private\.cinema_family_tick/);
 assert.match(migrate,/LICENSED_POSTER_REQUIRED/);
 assert.match(migrate,/metadataOnly/);
 assert.match(migrate,/metadataSourceId/);
 assert.match(migrate,/manualLocked/);
 assert.doesNotMatch(migrate,/\bdelete\s+from\s+public\.lx_catalog/i);
 const ui=content('src/cinema-robot-admin.js');
 assert.match(ui,/Capa licenciada obrigatória/);
});
