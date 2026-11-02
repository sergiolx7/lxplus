import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const root=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const migration=root('supabase/migrations/20261102035944_lx_social_bookmarks_premium4.sql');
const hardening=root('supabase/migrations/20261102040021_lx_post_bookmarks_harden_grants.sql');

test('bookmark migration has ownership RLS and excludes unauthenticated access',()=>{
 assert.match(migration,/enable row level security/i);
 assert.match(migration,/references auth\.users\(id\)/i);
 assert.match(migration,/references public\.lx_posts\(id\)/i);
 assert.match(migration,/user_id = \(select auth\.uid\(\)\)/);
 assert.match(migration,/exists \(select 1 from public\.lx_posts p where p\.id = post_id\)/);
 assert.match(hardening,/revoke all privileges on public\.lx_post_bookmarks from authenticated/i);
 assert.match(hardening,/grant select, insert, delete on public\.lx_post_bookmarks to authenticated/i);
 assert.doesNotMatch(hardening,/grant update|grant all/i);
});

test('RLS protects other users and private posts with real PostgreSQL authorization',async()=>{
 const db=new PGlite();
 const one='11111111-1111-4111-8111-111111111111',two='22222222-2222-4222-8222-222222222222';
 const postOne='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',postTwo='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 try{
  await db.exec(`
   create schema auth;
   create role authenticated;
   create role anon;
   create table auth.users(id uuid primary key);
   create table public.lx_posts(id uuid primary key,author_id uuid not null);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('lx.test_user',true),'')::uuid $$;
   create function public.lx_is_approved() returns boolean language sql stable as $$ select true $$;
   alter table public.lx_posts enable row level security;
   create policy visible_posts on public.lx_posts for select to authenticated using (author_id=(select auth.uid()));
   grant usage on schema public,auth to authenticated;
   grant select on public.lx_posts to authenticated;
  `);
  await db.exec(migration);
  await db.exec(hardening);
  await db.exec(migration);await db.exec(hardening);
  await db.query('insert into auth.users(id) values($1),($2)',[one,two]);
  await db.query('insert into public.lx_posts(id,author_id) values($1,$2),($3,$4)',[postOne,one,postTwo,two]);
  const policies=await db.query("select count(*)::int as n from pg_policies where tablename='lx_post_bookmarks'");
  assert.equal(policies.rows[0].n,3);
  await db.exec('set role authenticated');
  await db.query("select set_config('lx.test_user',$1,false)",[one]);
  await db.query('insert into public.lx_post_bookmarks(user_id,post_id) values($1,$2)',[one,postOne]);
  await assert.rejects(()=>db.query('insert into public.lx_post_bookmarks(user_id,post_id) values($1,$2)',[one,postTwo]),/row-level security|permission denied/i);
  await assert.rejects(()=>db.query('insert into public.lx_post_bookmarks(user_id,post_id) values($1,$2)',[two,postOne]),/row-level security|permission denied/i);
  const mine=await db.query('select post_id from public.lx_post_bookmarks');
  assert.deepEqual(mine.rows.map(x=>x.post_id),[postOne]);
  await db.query("select set_config('lx.test_user',$1,false)",[two]);
  const others=await db.query('select post_id from public.lx_post_bookmarks');
  assert.equal(others.rows.length,0);
  await db.query('delete from public.lx_post_bookmarks where user_id=$1 and post_id=$2',[one,postOne]);
  await db.query("select set_config('lx.test_user',$1,false)",[one]);
  assert.equal((await db.query('select post_id from public.lx_post_bookmarks')).rows.length,1);
 }finally{await db.close()}
});

test('LX Social uses server bookmarks for saved filtering and user-authorized writes',()=>{
 const src=root('src/modules/social.js');
 assert.match(src,/\['saved','Salvos'\]/);
 assert.match(src,/data-post-bookmark=/);
 assert.match(src,/savedPostIds=new Set/);
 assert.match(src,/db\.from\('lx_post_bookmarks'\)\.select\('post_id,created_at'\)/);
 assert.match(src,/db\.from\('lx_post_bookmarks'\)\.insert\(\{user_id:me,post_id:post\.id\}\)/);
 assert.match(src,/db\.from\('lx_post_bookmarks'\)\.delete\(\)\.eq\('user_id',me\)\.eq\('post_id',post\.id\)/);
 assert.match(src,/if\(feedFilter==='saved'\)await loadPosts\(\)/);
 assert.doesNotMatch(src,/localStorage\.setItem\([^)]*bookmark/i);
});
