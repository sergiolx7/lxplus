import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {watchTarget,watchCorrection,WatchClock,newerWatch,validPeerWatch} from '../src/watch-sync.js';
import {normalizeProfileStyle,profileLedAttributes} from '../src/profile-premium.js';
import {inspectProfileImage} from '../supabase/functions/lx-profile-media/handler.mjs';
import {handleRtc} from '../supabase/functions/lx-rtc-config/handler.mjs';
import {normalizePremiumProfile} from '../src/premium-style.js';
const id=n=>'70000000-0000-4000-8000-'+String(n).padStart(12,'0'),db=new PGlite();
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create table public.lx_profiles(user_id uuid primary key references auth.users,approved boolean default true,social_visible boolean default true,banner_url text,avatar_url text);create table public.lx_catalog(id bigint primary key,published boolean,payload jsonb);create table public.lx_friendships(user_low uuid,user_high uuid,status text);create table public.lx_call_signals(id bigint generated always as identity,sender_id uuid,kind text,payload jsonb);create table public.lx_messages(id uuid primary key default gen_random_uuid(),sender_id uuid,body text);grant insert,select on public.lx_messages to authenticated;create table public.lx_calls(id uuid primary key,caller_id uuid,callee_id uuid,status text,created_at timestamptz default now());create function public.lx_is_approved() returns boolean language sql stable security definer as $$select coalesce((select approved from public.lx_profiles where user_id=auth.uid()),false)$$;create function public.lx_admin_role() returns text language sql stable as $$select case when auth.uid()='${id(1)}' then 'owner' when auth.uid()='${id(3)}' then 'administrator' else null end$$;create function public.lx_plus_directory() returns jsonb language sql stable security definer as $$select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id)),'[]') from public.lx_profiles where social_visible or user_id=auth.uid()$$;create table storage.objects(id bigint generated always as identity,bucket_id text,name text);alter table storage.objects enable row level security;create policy old_assets_insert on storage.objects for insert to authenticated with check(true);create policy old_assets_update on storage.objects for update to authenticated using(true) with check(true);create policy old_assets_read on storage.objects for select to authenticated using(true);grant usage on schema auth,storage to authenticated;grant select,insert,update on storage.objects to authenticated;grant usage on sequence storage.objects_id_seq to authenticated;grant select,update on public.lx_profiles to authenticated;alter table public.lx_profiles enable row level security;create policy profile_read on public.lx_profiles for select to authenticated using(true);create policy profile_update on public.lx_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());`);
 for(let n=1;n<=5;n++)await db.query('insert into auth.users values($1);',[id(n)]);
 await db.exec(`insert into public.lx_profiles(user_id,approved,social_visible) select id,id<>'${id(5)}',id<>'${id(4)}' from auth.users;insert into public.lx_friendships values('${id(1)}','${id(2)}','accepted');insert into public.lx_catalog values(1,true,'{"type":"Filme"}'),(2,false,'{"type":"Filme"}'),(3,true,'{"type":"Livro"}');`);
 for(const file of ['20261101150814_lx_private_watch_together.sql','20261101151930_lx_premium_profile_cosmetics.sql','20261101183850_lx_premium_studio.sql']){const sql=await readFile('supabase/migrations/'+file,'utf8');await db.exec(sql);await db.exec(sql)}
});
after(()=>db.close());
async function actor(n,fn,role='authenticated'){await db.query("select set_config('test.uid',$1,false)",[n?id(n):'']);await db.exec('set role '+role);try{return await fn()}finally{await db.exec('reset role')}}
const create=()=>actor(1,async()=>(await db.query('select public.lx_watch_create($1,1,0,10) as room',[id(2)])).rows[0].room);
const action=(n,room,kind,data={})=>actor(n,async()=>(await db.query('select public.lx_watch_action($1,$2,$3) as room',[room.id,kind,data])).rows[0].room);
let room;
test('watch: only an approved friend can be invited to a published cinema item',async()=>{
 for(const [other,content] of [[id(4),1],[id(2),2],[id(2),3]])await actor(1,()=>assert.rejects(db.query('select public.lx_watch_create($1,$2)',[other,content]),/WATCH_/));
 await actor(null,()=>assert.rejects(db.query('select public.lx_watch_create($1,1)',[id(2)]),/permission denied/),'anon');room=await create();assert.equal(room.status,'invited');assert.equal(room.paused,true);
});
test('watch: strangers cannot read, change or accept another pair’s session',async()=>{
 assert.equal(await actor(4,async()=>(await db.query('select * from public.lx_watch_sessions')).rows.length),0);
 await assert.rejects(action(4,room,'accept'),/WATCH_UNAVAILABLE/);await assert.rejects(action(1,room,'accept'),/WATCH_INVITE_UNAVAILABLE/);
 await actor(2,()=>assert.rejects(db.query("update public.lx_watch_sessions set host_id=$1 where id=$2",[id(2),room.id]),/permission denied/));
});
test('watch: both members must be ready; play, seek and rate get a canonical increasing revision',async()=>{
 room=await action(2,room,'accept');room=await action(1,room,'ready',{ready:true});assert.equal(room.guest_ready,false);room=await action(2,room,'ready',{ready:true});const before=room.revision;room=await action(2,room,'control',{position:32,paused:false,rate:1.25});assert.ok(room.revision>before);assert.equal(room.position,32);assert.equal(room.paused,false);assert.ok(Date.parse(room.anchor_at)>Date.parse(room.server_now));
 await assert.rejects(action(2,room,'episode',{episode:1}),/WATCH_HOST_REQUIRED/);await assert.rejects(action(1,room,'control',{position:1,paused:false,rate:999}),/WATCH_INVALID_STATE/);
});
test('watch: buffering holds the pair and recovery resumes only after the peer is ready',async()=>{
 room=await action(2,room,'ready',{ready:false});assert.equal(room.guest_ready,false);assert.equal(watchTarget(room,Date.parse(room.server_now)).paused,true);room=await action(2,room,'ready',{ready:true});assert.equal(room.host_ready&&room.guest_ready,true);assert.ok(Date.parse(room.anchor_at)>Date.parse(room.server_now));
});
test('watch: signaling requires membership and the true sender; private TURN budget is inaccessible and bounded',async()=>{
 await actor(4,()=>assert.rejects(db.query("insert into public.lx_watch_signals(session_id,sender_id,kind,payload) values($1,$2,'ice','{}')",[room.id,id(4)]),/row-level security/));
 await actor(2,()=>assert.rejects(db.query("insert into public.lx_watch_signals(session_id,sender_id,kind,payload) values($1,$2,'ice','{}')",[room.id,id(1)]),/row-level security/));
 await actor(2,()=>db.query("insert into public.lx_watch_signals(session_id,sender_id,kind,payload) values($1,$2,'ice','{}')",[room.id,id(2)]));
 assert.equal(await actor(4,async()=>(await db.query("select public.lx_rtc_config_access('watch',$1) as ok",[room.id])).rows[0].ok),false);
 await actor(1,async()=>{for(let i=0;i<8;i++)assert.equal((await db.query("select public.lx_rtc_config_access('watch',$1) as ok",[room.id])).rows[0].ok,true);assert.equal((await db.query("select public.lx_rtc_config_access('watch',$1) as ok",[room.id])).rows[0].ok,false);await assert.rejects(db.query('select * from lx_private.rtc_credential_budget'),/permission denied/)});
});
test('watch: expiration produces a newer ended state that clients can apply',async()=>{
 const expiring=await create();await db.query("update public.lx_watch_sessions set expires_at=now()-interval '1 second' where id=$1",[expiring.id]);
 const ended=await action(1,expiring,'snapshot');assert.equal(ended.status,'ended');assert.equal(newerWatch(expiring,ended),true);
});
test('premium: members and administrators cannot grant Premium; owner can grant and revoke it',async()=>{
 for(const n of [2,3])await actor(n,()=>assert.rejects(db.query('select public.lx_admin_set_premium($1,true)',[id(2)]),/PREMIUM_OWNER_REQUIRED/));
 await actor(2,()=>assert.rejects(db.query('update public.lx_profiles set is_premium=true where user_id=$1',[id(2)]),/PREMIUM_OWNER_REQUIRED/));
 assert.equal(await actor(1,async()=>(await db.query('select public.lx_admin_set_premium($1,true) as ok',[id(2)])).rows[0].ok),true);
});
test('premium: style edits require active entitlement and never expose private profiles',async()=>{
 const style=normalizeProfileStyle({enabled:true,color:'#ff0000',mode:'gradient'});assert.deepEqual(await actor(2,async()=>(await db.query('select public.lx_set_profile_style($1) as style',[style])).rows[0].style),style);
 await actor(3,()=>assert.rejects(db.query('select public.lx_set_profile_style($1)',[style]),/PREMIUM_REQUIRED/));
 assert.equal(await actor(2,async()=>(await db.query('select public.lx_profile_cosmetics($1) as profile',[id(4)])).rows[0].profile),null);
 await actor(1,()=>db.query('select public.lx_admin_set_premium($1,false)',[id(2)]));await actor(2,()=>assert.rejects(db.query('select public.lx_set_profile_style($1)',[style]),/PREMIUM_REQUIRED/));
 const revoked=await actor(2,async()=>(await db.query('select public.lx_profile_cosmetics($1) as profile',[id(2)])).rows[0].profile);assert.equal(revoked.profile_style,null);
});
test('premium: arbitrary banner URLs and direct profile media writes cannot bypass image validation',async()=>{
 await actor(2,()=>assert.rejects(db.query('update public.lx_profiles set banner_url=$1 where user_id=$2',['https://evil.test/animated.jpg',id(2)]),/PROFILE_MEDIA_ENDPOINT_REQUIRED/));
 await actor(2,()=>assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('lx-assets','profiles/me/forged.jpg')"),/row-level security/));
 await actor(2,()=>db.query("insert into storage.objects(bucket_id,name) values('lx-assets','catalog/ordinary.jpg')"));
});
test('premium: profile creation cannot self-grant Premium, style or unvalidated media',async()=>{
 await db.exec("grant insert on public.lx_profiles to authenticated;create policy profile_insert on public.lx_profiles for insert to authenticated with check(user_id=auth.uid());");
 await db.query('insert into auth.users values($1)',[id(6)]);
 await actor(6,async()=>{
  await assert.rejects(db.query('insert into public.lx_profiles(user_id,is_premium) values($1,true)',[id(6)]),/PREMIUM_OWNER_REQUIRED/);
  await assert.rejects(db.query('insert into public.lx_profiles(user_id,profile_style) values($1,$2)',[id(6),normalizeProfileStyle({enabled:true})]),/PREMIUM_REQUIRED/);
  await assert.rejects(db.query('insert into public.lx_profiles(user_id,banner_url) values($1,$2)',[id(6),'https://evil.test/cover.gif']),/PROFILE_MEDIA_ENDPOINT_REQUIRED/);
  await db.query('insert into public.lx_profiles(user_id) values($1)',[id(6)]);
 });
});
test('watch clock compensates skew; drift is nudged softly and seeks only for larger differences',()=>{
 const clock=new WatchClock();clock.observe(1000,1200,new Date(5100).toISOString());assert.equal(clock.offset,4000);
 const stamp=Date.parse('2026-11-01T15:00:00Z'),state={id:'a',status:'active',position:5,rate:1,paused:false,anchor_at:new Date(stamp).toISOString(),host_seen:new Date(stamp).toISOString(),guest_seen:new Date(stamp).toISOString(),host_ready:true,guest_ready:true,revision:2};
 assert.equal(watchTarget(state,stamp+2000).position,7);assert.equal(watchTarget(state,stamp-200).paused,true);assert.equal(watchCorrection({currentTime:6.7},state,stamp+2000).seek,false);assert.equal(watchCorrection({currentTime:3},state,stamp+2000).seek,true);assert.equal(watchTarget(state,stamp+12000).paused,true);assert.equal(newerWatch(state,{...state,revision:1}),false);
});
test('watch peer packets cannot change membership, content, expiry or poison revisions',()=>{
 const current={id:'room',host_id:'host',guest_id:'guest',content_id:1,expires_at:'2026-11-01T19:00:00Z',episode_index:0,revision:1},next={...current,revision:2,status:'active',paused:false,host_ready:true,guest_ready:true,position:12,rate:1,anchor_at:'2026-11-01T15:00:00Z',host_seen:'2026-11-01T15:00:00Z',guest_seen:'2026-11-01T15:00:00Z'};
 assert.equal(validPeerWatch(current,next,'guest'),true);
 for(const patch of [{host_id:'evil'},{content_id:2},{expires_at:'never'},{revision:Infinity},{revision:50000},{rate:999},{position:-1},{paused:'false'},{episode_index:1}])assert.equal(validPeerWatch(current,{...next,...patch},'guest'),false);
 assert.equal(validPeerWatch(current,next,'stranger'),false);assert.equal(validPeerWatch(current,{...next,episode_index:1},'host'),true);
});
test('image validation checks bytes instead of the filename; GIFs are Premium banners only',()=>{
 const gif=new Uint8Array(readFileSync('tests/fixtures/profile-test.gif'));
 assert.throws(()=>inspectProfileImage(gif,'banner',false),/PREMIUM/);assert.equal(inspectProfileImage(gif,'avatar',true).animated,true);assert.equal(inspectProfileImage(gif,'banner',true).ext,'gif');assert.throws(()=>inspectProfileImage(new TextEncoder().encode('<svg onload="evil"></svg>'),'banner',true),/FORMAT/);
 assert.match(profileLedAttributes({is_premium:false,profile_style:{enabled:true}}),/data-profile-led="off"/);assert.equal(normalizeProfileStyle({color:'red;url(evil)',intensity:1000}).intensity,100);
});
test('TURN handler authenticates and checks session access before obtaining short-lived credentials',async()=>{
 let calls=0,access=false;const client={auth:{getUser:async()=>({data:{user:{id:id(2)}}})},rpc:async()=>({data:access})};const env=k=>({SUPABASE_URL:'url',SUPABASE_ANON_KEY:'public',LX_TURN_KEY_ID:'key-id',LX_TURN_API_TOKEN:'server-only'})[k];const deps={env,createClient:()=>client,fetcher:async(_url,options)=>{calls++;assert.deepEqual(JSON.parse(options.body),{ttl:3600});return new Response(JSON.stringify({iceServers:[{urls:['turns:turn.example:443'],username:'temporary',credential:'expires'}]}))}};
 const request=()=>new Request('https://lx.test/rtc',{method:'POST',headers:{authorization:'Bearer user'},body:JSON.stringify({kind:'watch',id:room.id})});assert.equal((await handleRtc(request(),deps)).status,403);assert.equal(calls,0);access=true;const response=await handleRtc(request(),deps),body=await response.json();assert.equal(body.turnConfigured,true);assert.doesNotMatch(JSON.stringify(body),/server-only/);
});
test('premium studio: identity changes are atomic, validated and denied after revocation',async()=>{
 const options=normalizePremiumProfile({decoration:'wings',effect:'aurora',nameStyle:'shimmer'}),style=normalizeProfileStyle({enabled:true,mode:'gradient'});
 await actor(2,()=>assert.rejects(db.query('select public.lx_set_premium_identity($1,$2)',[style,options]),/PREMIUM_REQUIRED/));
 await actor(1,()=>db.query('select public.lx_admin_set_premium($1,true)',[id(2)]));
 const saved=await actor(2,async()=>(await db.query('select public.lx_set_premium_identity($1,$2) as value',[style,options])).rows[0].value);
 assert.deepEqual(saved,{profile_style:style,premium_profile:options});
 for(const patch of [{effect:'<script>'},{accent:'red;url(evil)'},{background:null},{bannerPosition:200},{decoration:'remote-url'},{extra:true}])await actor(2,()=>assert.rejects(db.query('select public.lx_set_premium_identity($1,$2)',[style,{...options,...patch}]),/constraint/));
 const before=await actor(2,async()=>(await db.query('select premium_profile from public.lx_profiles where user_id=$1',[id(2)])).rows[0].premium_profile);assert.deepEqual(before,options);
 await actor(3,()=>assert.rejects(db.query('update public.lx_profiles set premium_profile=$1 where user_id=$2',[options,id(3)]),/PREMIUM_REQUIRED/));
});
test('premium studio: collections cannot be forged, expressions require Premium and private assets stay private',async()=>{
 await actor(2,()=>assert.rejects(db.query("insert into public.lx_premium_assets(user_id,kind,label,url,path) values($1,'emoji','star','https://assets.test/star.gif','profiles/forged')",[id(2)]),/permission denied/));
 const asset=(await db.query("insert into public.lx_premium_assets(user_id,kind,label,url,path) values($1,'emoji','star','https://assets.test/star.gif','profiles/validated') returning id",[id(2)])).rows[0];
 const token='[[lx:'+asset.id+']]';await actor(2,()=>db.query('insert into public.lx_messages(sender_id,body) values($1,$2)',[id(2),token]));
 await actor(3,()=>assert.rejects(db.query('insert into public.lx_messages(sender_id,body) values($1,$2)',[id(3),token]),/PREMIUM_EXPRESSION_REQUIRED/));
 assert.equal(await actor(3,async()=>(await db.query('select public.lx_archive_premium_asset($1) as ok',[asset.id])).rows[0].ok),false);
 const hidden=await actor(2,async()=>(await db.query('select public.lx_profile_cosmetics_many($1) as value',[[id(4)]])).rows[0].value);assert.deepEqual(hidden,[]);
 await actor(1,()=>db.query('select public.lx_admin_set_premium($1,false)',[id(2)]));
 await actor(2,()=>assert.rejects(db.query('insert into public.lx_messages(sender_id,body) values($1,$2)',[id(2),token]),/PREMIUM_EXPRESSION_REQUIRED/));
 assert.deepEqual(await actor(2,async()=>(await db.query('select public.lx_premium_assets($1) as value',[[id(2)]])).rows[0].value),[]);
});
test('premium studio: soundboard signals check the sender entitlement on the server',async()=>{
 await db.exec('grant insert on public.lx_call_signals to authenticated;grant usage on sequence public.lx_call_signals_id_seq to authenticated;');
 await actor(3,()=>assert.rejects(db.query("insert into public.lx_call_signals(sender_id,kind,payload) values($1,'reaction','{\"sound\":\"chime\"}')",[id(3)]),/PREMIUM_SOUND_REQUIRED/));
 await actor(1,()=>db.query('select public.lx_admin_set_premium($1,true)',[id(2)]));
 await actor(2,()=>db.query("insert into public.lx_call_signals(sender_id,kind,payload) values($1,'reaction','{\"sound\":\"chime\"}')",[id(2)]));
 await actor(2,()=>assert.rejects(db.query("insert into public.lx_call_signals(sender_id,kind,payload) values($1,'reaction','{\"sound\":\"remote-url\"}')",[id(2)]),/PREMIUM_SOUND_REQUIRED/));
});
