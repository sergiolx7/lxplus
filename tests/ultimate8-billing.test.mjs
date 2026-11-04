import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createBillingHandler,disabledWebhook} from '../supabase/functions/lx-billing/handler.mjs';

const db=new PGlite(),id=n=>'a0000000-0000-4000-8000-'+String(n).padStart(12,'0');
const call=async(action,data={})=>(await db.query('select public.lx_billing($1,$2::jsonb) as result',[action,JSON.stringify(data)])).rows[0].result;
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema lx_private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,lx_private to authenticated,anon;
 create table auth.users(id uuid primary key);
 create table public.lx_profiles(user_id uuid primary key references auth.users(id),name text,approved boolean default true,is_premium boolean default false,role_name text);
 create table public.lx_subscriptions(user_id uuid primary key,plan text,status text,active boolean,current_period_end timestamptz);
 create function public.lx_is_approved() returns boolean language sql stable security definer as $$select coalesce((select approved from public.lx_profiles where user_id=auth.uid()),false)$$;
 create function public.lx_admin_role() returns text language sql stable security definer as $$select role_name from public.lx_profiles where user_id=auth.uid()$$;
 create function public.lx_admin_set_premium(p_user_id uuid,p_enabled boolean) returns boolean language plpgsql security definer as $$begin if public.lx_admin_role() is distinct from 'owner' then raise exception 'OWNER_REQUIRED';end if;update public.lx_profiles set is_premium=p_enabled where user_id=p_user_id;return true;end$$;`);
 for(const [n,role] of [[1,'owner'],[2,'administrator'],[3,null],[4,null]]){await db.query('insert into auth.users values($1)',[id(n)]);await db.query('insert into public.lx_profiles(user_id,name,role_name,approved) values($1,$2,$3,$4)',[id(n),'Test '+n,role,n!==4])}
 await db.exec(readFileSync(new URL('../supabase/migrations/20261104122139_lx_ultimate8_billing_foundation.sql',import.meta.url),'utf8'));
 await db.query("insert into lx_private.premium_coupons(code,kind,value,created_by,expires_at,plans) values('TEN','percent',10,$1,null,array['monthly','annual']),('FIXED','fixed',300,$1,null,array['monthly','annual']),('OLD','percent',10,$1,now()-interval '1 day',array['monthly','annual']),('YEAR','percent',20,$1,null,array['annual'])",[id(1)]);
});
after(()=>db.close());
async function actor(n,fn,role='authenticated'){await db.exec('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[n?id(n):'']);await db.exec('set local role '+role);await fn()}finally{await db.exec('rollback')}}
test('billing server ignores submitted prices and keeps official BRL amounts',()=>actor(3,async()=>{for(const [plan,expected] of [['monthly',990],['annual',9990]]){const q=await call('quote',{plan,amount_cents:1,currency:'USD'});assert.equal(q.total_cents,expected);assert.equal(q.currency,'BRL');assert.equal(q.checkout_available,false)}}));
test('coupon percentage and fixed amounts are calculated in cents on the server',()=>actor(3,async()=>{assert.equal((await call('quote',{plan:'monthly',coupon:'ten'})).total_cents,891);assert.equal((await call('quote',{plan:'annual',coupon:'FIXED'})).total_cents,9690)}));
for(const [label,body] of [['expired',{plan:'monthly',coupon:'OLD'}],['wrong plan',{plan:'monthly',coupon:'YEAR'}],['unknown',{plan:'annual',coupon:'MISSING'}],['injected',{plan:'annual',coupon:"TEN' OR 1=1"}]])test('billing rejects '+label+' coupon',()=>actor(3,()=>assert.rejects(call('quote',body),/COUPON_UNAVAILABLE/)));
test('members cannot create coupons or inspect other accounts',()=>actor(3,()=>assert.rejects(call('admin'),/ADMIN_REQUIRED/)));
test('unapproved and anonymous requests fail closed',async()=>{await actor(4,()=>assert.rejects(call('status'),/APPROVAL_REQUIRED/));await actor(null,()=>assert.rejects(call('status'),/AUTH_REQUIRED/));await actor(null,()=>assert.rejects(call('status'),/permission denied/),'anon')});
test('RLS and table privileges prevent direct financial reads by members',()=>actor(3,()=>assert.rejects(db.query('select * from lx_private.premium_orders'),/permission denied/)));
test('admin coupon creation is audited; an excessive discount is rejected',async()=>{await actor(2,async()=>{await call('coupon_save',{code:'NEW',kind:'percent',value:15,plans:['monthly'],per_user:1});const result=await call('admin');assert.equal(result.coupons.find(c=>c.code==='NEW').value,15);assert.equal(result.audit[0].action,'coupon_save')});await actor(2,()=>assert.rejects(call('coupon_save',{code:'BAD',kind:'percent',value:101}),/INVALID_COUPON/))});
test('only owner can grant Premium, with a required reason and an audit entry',async()=>{await actor(2,()=>assert.rejects(call('grant',{user_id:id(3),enabled:true,reason:'Test grant'}),/OWNER_REQUIRED/));await actor(1,async()=>{await call('grant',{user_id:id(3),enabled:true,reason:'Test complimentary access'});const result=await call('admin');assert.equal(result.subscriptions.find(s=>s.user_id===id(3)).is_premium,true);assert.equal(result.audit[0].action,'manual_premium')})});
test('checkout and cancellation remain disabled without creating financial records',()=>actor(3,async()=>{assert.equal((await call('checkout',{plan:'annual',payment_id:'forged'})).code,'GATEWAY_NOT_CONFIGURED');assert.equal((await call('cancel')).available,false);const status=await call('status');assert.deepEqual(status.payments,[]);assert.equal(status.is_premium,false)}));
test('quotes respect coupon total and per-user usage limits',async()=>{
 await db.query("insert into lx_private.premium_coupons(code,kind,value,created_by,max_uses,per_user) values('LIMIT','percent',10,$1,1,1)",[id(1)]);
 await db.query("insert into lx_private.premium_orders(id,user_id,plan,base_cents,amount_cents,status,idempotency_key) values($1,$2,'monthly',990,990,'paid','test-limit-1')",[id(30),id(3)]);
 await db.query("insert into lx_private.premium_redemptions(order_id,code,user_id) values($1,'LIMIT',$2)",[id(30),id(3)]);
 await actor(3,()=>assert.rejects(call('quote',{plan:'monthly',coupon:'LIMIT'}),/COUPON_UNAVAILABLE/));
 await actor(2,()=>assert.rejects(call('quote',{plan:'annual',coupon:'LIMIT'}),/COUPON_UNAVAILABLE/));
});
test('orders and webhook events reject duplicate provider identifiers',async()=>{
 await db.query("insert into lx_private.premium_webhook_events(provider,event_id,payload_digest,status) values('future','same',$1,'verified')",['a'.repeat(64)]);
 await assert.rejects(db.query("insert into lx_private.premium_webhook_events(provider,event_id,payload_digest,status) values('future','same',$1,'verified')",['a'.repeat(64)]),/duplicate key/);
});
test('Edge handler validates identity, restricts actions and refuses every unconfigured checkout or webhook',async()=>{
 let calls=0;const handler=createBillingHandler({origins:['https://site.example'],authenticate:async token=>token==='valid'?{id:id(3)}:null,runAction:async()=>{calls++;return {data:{ok:true}}}});
 const req=(body,token='valid')=>new Request('https://edge.example',{method:'POST',headers:{Origin:'https://site.example',Authorization:'Bearer '+token},body:JSON.stringify(body)});
 assert.equal((await handler(req({action:'status'},'forged'))).status,401);
 assert.equal((await handler(req({action:'grant',user_id:id(1)}))).status,400);
 assert.equal((await handler(req({action:'checkout',plan:'annual'}))).status,503);assert.equal(calls,0);
 assert.equal((await handler(req({action:'quote',data:{plan:'monthly'}}))).status,200);assert.equal(calls,1);
 assert.equal(disabledWebhook().status,503);
});
