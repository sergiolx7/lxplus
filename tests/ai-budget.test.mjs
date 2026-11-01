import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),id='20000000-0000-4000-8000-000000000001';
before(async()=>{await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('"+id+"');");const sql=await readFile(new URL('../supabase/migrations/20261101020959_lx_premium2_ai_budget.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql)});
after(()=>db.close());
async function asService(fn){await db.exec('begin;set local role service_role');try{await fn()}finally{await db.exec('rollback')}}
const reserve=async()=>(await db.query('select public.lx_ai_reserve($1) as ok',[id])).rows[0].ok;
test('Postgres AI budget: only service_role can execute the quota function',async()=>{for(const role of ['anon','authenticated']){assert.equal((await db.query("select has_function_privilege($1,'public.lx_ai_reserve(uuid)','execute') as ok",[role])).rows[0].ok,false)}});
test('Postgres AI budget: the seventh request in a minute is refused',()=>asService(async()=>{for(let i=0;i<6;i++)assert.equal(await reserve(),true);assert.equal(await reserve(),false)}));
test('Postgres AI budget: new minute resets the short window while daily limit remains 50',()=>asService(async()=>{for(let i=0;i<50;i++){if(i%6===0&&i)await db.exec("update lx_private.ai_request_budget set window_start=now()-interval '2 minutes'");assert.equal(await reserve(),true)}await db.exec("update lx_private.ai_request_budget set window_start=now()-interval '2 minutes'");assert.equal(await reserve(),false)}));
test('Postgres AI budget: a new day restores the allowance without deleting history tables',()=>asService(async()=>{await reserve();await db.exec("update lx_private.ai_request_budget set budget_day=current_date-interval '2 days',day_requests=50,window_start=now()-interval '2 minutes'");assert.equal(await reserve(),true)}));
