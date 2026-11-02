import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const root=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base=root('supabase/migrations/20261102112738_lx_cinema_popular_priority_poster_approval_v4.sql');
const fix=root('supabase/migrations/20261102113626_lx_cinema_priority_reuse_approved_drafts_v4.sql');

test('licensed poster restores an existing hidden draft without creating duplicates',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role authenticated;create role anon;create table public.lx_catalog(id bigint primary key,payload jsonb,published boolean default false,updated_at timestamptz default now());create table public.lx_catalog_tombstones(id bigint primary key);create function public.lx_admin_can(text) returns boolean language sql as $$select true$$;");
  await db.exec(base);
  await db.exec(fix);
  const original=8700000000456;
  await db.query('insert into public.lx_catalog(id,payload,published) values($1,$2,false)',[original,{type:'Filme',title:'Titanic',year:1997,metadataOnly:true,cover:'',reviewReason:'LICENSED_POSTER_REQUIRED'}]);
  const id=(await db.query("select id from public.lx_cinema_priority_queue where title='Titanic' and kind='Filme'")).rows[0].id;
  const url='https://ubidogquzpdvrbzbhxda.supabase.co/storage/v1/object/public/lx-assets/artwork/uploads/12345678-1111-4444-aaaa-123456789abc.jpg';
  await db.query('select public.lx_cinema_priority_submit($1,$2,$3,$4,$5,$6)',[id,url,'Licença comercial aprovada pelo distribuidor.','Distribuidor autorizado','Filme sobre uma travessia histórica e uma história de ficção.',true]);
  const result=(await db.query('select public.lx_cinema_priority_publish(20) AS result')).rows[0].result;
  assert.equal(result.published,1);
  const rows=(await db.query('select id,published,payload from public.lx_catalog')).rows;
  assert.equal(rows.length,1);
  assert.equal(Number(rows[0].id),original);
  assert.equal(rows[0].published,true);
  assert.equal(rows[0].payload.cover,url);
  assert.equal(rows[0].payload.editorialPriority,true);
 }finally{await db.close();}
});

test('an editor-locked or archived prior entry remains unchanged even when the artwork is approved',()=>{
 const sql=fix;
 assert.match(sql,/metadataOnly'='true'/);
 assert.match(sql,/manualLocked/);
 assert.match(sql,/archived/);
 assert.match(sql,/not exists\(select 1 from public\.lx_catalog_tombstones/);
 assert.match(sql,/where c\.id=already and not c\.published/);
 assert.doesNotMatch(sql,/delete from public\.lx_catalog/i);
});
