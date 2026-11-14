import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {storageSummary,renderStorageStatus} from '../src/studio-storage.js';

test('automatic storage budget includes private media, profiles and attachments alongside public assets',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create schema storage;create table storage.objects(bucket_id text,metadata jsonb);insert into storage.objects values ('lx-assets','{\"size\":793375247}'),('lx-media','{\"size\":992222441}'),('lx-social','{\"size\":1248}'),('new-bucket','{}');");
  await db.exec(readFileSync(new URL('../supabase/migrations/20261113235842_lx_storage_budget_all_buckets.sql',import.meta.url),'utf8'));
  assert.equal(Number((await db.query('select public.lx_auto_asset_usage() as bytes')).rows[0].bytes),1785598936);
  assert.equal((await db.query('select count(*)::int as n from storage.objects')).rows[0].n,4);
  await db.exec('delete from storage.objects');
  assert.equal(Number((await db.query('select public.lx_auto_asset_usage() as bytes')).rows[0].bytes),0);
  const row=(await db.query("select prosecdef,provolatile from pg_proc where proname='lx_auto_asset_usage'")).rows[0];
  assert.equal(row.prosecdef,false);assert.equal(row.provolatile,'s');
 }finally{await db.close()}
});

test('the admin warning uses the preventive budget rather than inventing a provider plan',()=>{
 const snapshot={asset_bytes:'1785598936',jobs:[{kind:'music',asset_budget_bytes:800000000}]};
 assert.deepEqual(storageSummary(snapshot),{bytes:1785598936,budget:800000000});
 const html=renderStorageStatus(snapshot);
 assert.match(html,/storage-warning/);assert.match(html,/1\.785,6 MB/);assert.match(html,/Novos downloads automáticos ficam bloqueados/);assert.match(html,/aria-valuenow="100"/);
 assert.doesNotMatch(html,/Plano Pro|1 GB|Unlimited/);
});

test('missing storage data is unavailable rather than fabricated zero use',()=>{
 assert.deepEqual(storageSummary(null),{bytes:null,budget:null});
 assert.match(renderStorageStatus(null),/Não foi possível medir/);assert.doesNotMatch(renderStorageStatus(null),/>0 MB</);
 assert.match(renderStorageStatus({asset_bytes:0}),/>0 MB</);
});
