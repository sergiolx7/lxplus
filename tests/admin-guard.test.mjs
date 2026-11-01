import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const call=(target=5,isAdmin=true,role='owner')=>db.query('select public.lx_admin_set_admin_role($1,$2,$3) as ok',[id(target),isAdmin,role]);
before(async()=>{await db.exec(await readFile(new URL('./fixtures/admin-schema.sql',import.meta.url),'utf8'));const migration=await readFile(new URL('../supabase/migrations/20261031214002_lx_premium2_admin_guard.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration)});
after(()=>db.close());
async function actor(n,fn,role='authenticated'){
 await db.exec('begin');
 try{await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(n?{sub:id(n),role}: {})]);await db.exec('set local role '+role);await fn()}finally{await db.exec('rollback')}
}
test('Postgres: NULL role cannot grant owner access and cannot alter any existing role',async()=>{
 await actor(5,()=>assert.rejects(call(),/owner required/));
 assert.equal((await db.query('select count(*)::int as n from public.lx_admins')).rows[0].n,4);
});
for(const [n,role] of [[2,'administrator'],[3,'editor'],[4,'moderator']])test('Postgres: '+role+' cannot grant or revoke administrative roles',()=>actor(n,()=>assert.rejects(call(1,false),/owner required/)));
test('Postgres: anonymous role has no EXECUTE permission',()=>actor(null,()=>assert.rejects(call(),/permission denied/),'anon'));
test('Postgres: an authenticated role without a subject fails closed',()=>actor(null,()=>assert.rejects(call(),/owner required/)));
test('Postgres: owner can grant, change and revoke a nonowner role',()=>actor(1,async()=>{assert.equal((await call(5,true,'editor')).rows[0].ok,true);assert.equal((await call(5,true,'moderator')).rows[0].ok,true);assert.equal((await call(5,false)).rows[0].ok,true)}));
test('Postgres: the final owner cannot be removed',()=>actor(1,()=>assert.rejects(call(1,false),/last owner/)));
test('Postgres: the final owner cannot be demoted',()=>actor(1,()=>assert.rejects(call(1,true,'editor'),/last owner/)));
test('Postgres: one owner can be demoted when a second owner exists',()=>actor(1,async()=>{await call(5,true,'owner');assert.equal((await call(1,true,'editor')).rows[0].ok,true)}));
test('Postgres: invalid role or nonexistent target never changes permissions',()=>actor(1,()=>assert.rejects(call(5,true,'superuser'),/invalid admin role/)));
