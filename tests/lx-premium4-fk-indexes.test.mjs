import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const migration=readFileSync(new URL('../supabase/migrations/20261102035000_lx_premium4_fk_indexes.sql',import.meta.url),'utf8');
const expected=['lx_auto_assets_catalog_id_fk_idx','lx_demo_preview_viewers_granted_by_fk_idx','lx_demo_social_audit_updated_by_fk_idx','lx_demo_social_metrics_updated_by_fk_idx','lx_drive_sources_created_by_fk_idx','lx_sponsored_posts_created_by_fk_idx','lx_watch_sessions_content_id_fk_idx','lx_watch_sessions_host_id_fk_idx','lx_watch_signals_sender_id_fk_idx'];

test('performance migration safely adds the nine missing FK indexes and is idempotent',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create table public.lx_auto_assets(catalog_id uuid);
   create table public.lx_demo_preview_viewers(granted_by uuid);
   create table public.lx_demo_social_audit(updated_by uuid);
   create table public.lx_demo_social_metrics(updated_by uuid);
   create table public.lx_drive_sources(created_by uuid);
   create table public.lx_sponsored_posts(created_by uuid);
   create table public.lx_watch_sessions(content_id uuid,host_id uuid);
   create table public.lx_watch_signals(sender_id uuid);
  `);
  await db.exec(migration);
  await db.exec(migration);
  const {rows}=await db.query("select indexname from pg_indexes where schemaname='public'");
  const names=new Set(rows.map(x=>x.indexname));
  for(const name of expected)assert.equal(names.has(name),true,'missing index '+name);
  assert.equal(expected.length,9);
 }finally{await db.close()}
});

test('migration does not remove or modify production tables, privileges or sessions',()=>{
 assert.doesNotMatch(migration,/\b(?:drop|delete|truncate|alter\s+table|revoke|grant|update|insert)\b/i);
 assert.equal((migration.match(/create index if not exists/gi)||[]).length,9);
});
