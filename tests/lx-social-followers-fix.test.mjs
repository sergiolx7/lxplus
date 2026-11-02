import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoLabel,engagementPreview} from '../src/social-demo-ui.js';
import {memberProfileCard} from '../src/member-profile.js';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const social=file('src/modules/social.js'),sql=file('supabase/sql/lx-social-real-followers.sql');

test('100 saved simulated likes are actually assigned from the fourth RPC result',()=>{
 assert.match(social,/let likes=\[\],comments=\[\],promoted=\[\],demoRows=\[\]/);
 assert.match(social,/if\(ids\.length\)\[likes,comments,promoted,demoRows\]=await Promise\.all/);
 assert.match(social,/demoRows\.filter\(x=>x\.kind==='post'\)/);
 assert.match(social,/demoPostCounts\.get\(post\.id\)/);
 assert.match(social,/lx_demo_social_visible/);
});
test('post heart shows transparent combined preview and separately marks simulated likes',()=>{
 const combined=engagementPreview(1,100);
 assert.match(combined,/101/);
 assert.match(combined,/PRÉVIA/);
 assert.match(combined,/1 reais e 100 de teste/);
 assert.equal(engagementPreview(7,0),'7');
 assert.match(demoLabel(100,'post'),/SIMULAÇÃO/);
 assert.match(social,/engagementPreview\(count,demoPostCounts\.get\(post\.id\)\)/);
});
test('genuine followers have separate server-stored follow relationships protected from direct writes',()=>{
 assert.match(sql,/create table if not exists public\.lx_profile_follows/);
 assert.match(sql,/primary key\(follower_id,followed_id\)/);
 assert.match(sql,/check\(follower_id<>followed_id\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on table public\.lx_profile_follows from public,anon,authenticated/);
 assert.match(sql,/grant select,insert,delete on public\.lx_profile_follows to service_role/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/public\.lx_is_approved\(\)/);
 assert.match(sql,/p\.approved=true and p\.social_visible=true/);
 assert.match(sql,/p_user=viewer/);
 assert.match(sql,/on conflict\(follower_id,followed_id\) do nothing/);
 assert.match(sql,/delete from public\.lx_profile_follows where follower_id=viewer and followed_id=p_user/);
 assert.doesNotMatch(sql,/\binsert into public\.lx_demo_social_metrics\b/i);
});
test('batched follow stats are server-computed, based only on authentic follow records',()=>{
 assert.match(sql,/create or replace function public\.lx_social_follow_stats\(p_users uuid\[\]\)/);
 assert.match(sql,/cardinality\(p_users\),0\)>100/);
 assert.match(sql,/from public\.lx_profile_follows f where f\.followed_id=p\.user_id/);
 assert.match(sql,/from public\.lx_profile_follows f where f\.follower_id=p\.user_id/);
 assert.match(sql,/f\.follower_id=viewer and f\.followed_id=p\.user_id/);
 assert.match(sql,/grant execute on function public\.lx_social_follow_stats\(uuid\[\]\) to authenticated/);
 assert.match(social,/lx_social_follow_stats/);
 assert.match(social,/followStats=new Map/);
});
test('community supports follow/unfollow and visible follower counts while keeping friendship independent',()=>{
 assert.match(social,/data-social-follow/);
 assert.match(social,/lx_social_follow_toggle/);
 assert.match(social,/p_follow:!was/);
 assert.match(social,/Seguindo/);
 assert.match(social,/followStats\.get\(p\.user_id\)/);
 assert.match(social,/lx-social-follow-summary/);
 const html=memberProfileCard({user_id:'11111111-1111-4111-8111-111111111111',name:'Conta teste',username:'contateste'},{
  viewerId:'22222222-2222-4222-8222-222222222222',
  followStats:{followers:35,following_count:11,is_following:true},demoFollowers:100
 });
 assert.match(html,/35<\/strong> seguidores/);
 assert.match(html,/11<\/strong> seguindo/);
 assert.match(html,/✓ Seguindo/);
 assert.match(html,/100 seguidores <strong>SIMULAÇÃO<\/strong>/);
});
test('follow UI does not create real follows from the ADM demo control',()=>{
 assert.doesNotMatch(file('supabase/sql/lx-social-demo-metrics.sql'),/insert into public\.lx_profile_follows/i);
 assert.doesNotMatch(file('src/modules/studio.js'),/lx_social_follow_toggle/);
 assert.match(file('assets/lx-social-demo.css'),/lx-engagement-preview/);
});
