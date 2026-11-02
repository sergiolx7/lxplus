import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoLabel,renderDemoSocialPanel} from '../src/social-demo-ui.js';
import {memberProfileCard} from '../src/member-profile.js';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const sql=file('supabase/sql/lx-social-demo-metrics.sql');
const studio=file('src/modules/studio.js');
const social=file('src/modules/social.js');
test('demo counts are visibly simulated, numerically bounded and not merged with authentic likes',()=>{
 const badge=demoLabel(350,'post');
 assert.match(badge,/350/);assert.match(badge,/SIMULAÇÃO/);assert.match(badge,/curtidas/);
 assert.match(demoLabel(900,'profile'),/seguidores/);
 assert.equal(demoLabel(0),'');
 assert.equal(demoLabel(-50),'');
 assert.match(demoLabel(300000,'post'),/100\.000/);
 assert.match(social,/count=post\.likes\?\.length\|\|0/);
 assert.match(social,/demoLabel\(demoPostCounts\.get\(post\.id\),'post'\)/);
 assert.match(social,/demoLabel\(demoProfileCounts\.get\(p\.user_id\),'profile'\)/);
 assert.match(social,/data-copy-post-id/);
 assert.match(social,/post\.author_id===me\|\|ctx\.admin/);
});
test('ADM can increase, reduce and zero only test values with a separate management form',()=>{
 const html=renderDemoSocialPanel([{kind:'post',target_id:'11111111-1111-1111-1111-111111111111',demo_count:420,updated_at:'2026-11-01T02:00:00Z',label:'Teste de postagem'}]);
 assert.match(html,/Simulador de engajamento/);
 assert.match(html,/name="kind"/);assert.match(html,/name="target"/);
 assert.match(html,/max="100000"/);assert.match(html,/0 remove tudo/);
 assert.match(html,/data-demo-clear/);assert.match(html,/420/);
 assert.match(studio,/lx_demo_social_set/);
 assert.match(studio,/lx_demo_social_admin/);
 assert.match(studio,/data-demo-refresh/);
 assert.match(studio,/lxDemoSocialForm/);
 assert.match(studio,/renderDemoSocialPanel/);
});
test('user profile card shows a demo label without representing simulated counts as real followers',()=>{
 const html=memberProfileCard({user_id:'22222222-2222-2222-2222-222222222222',name:'Pessoa',username:'tester'},{viewerId:'33333333-3333-3333-3333-333333333333',demoFollowers:23});
 assert.match(html,/23 seguidores/);
 assert.match(html,/SIMULAÇÃO/);
 assert.doesNotMatch(memberProfileCard({user_id:'22222222-2222-2222-2222-222222222222',name:'Pessoa'},{demoFollowers:0}),/lx-demo-profile-count/);
});
test('SQL separates demo counters from production relationships and logs modifications',()=>{
 assert.match(sql,/create table if not exists public\.lx_demo_social_metrics/);
 assert.match(sql,/create table if not exists public\.lx_demo_social_audit/);
 assert.match(sql,/check\(demo_count between 0 and 100000\)/);
 assert.match(sql,/enable row level security/g);
 assert.match(sql,/revoke all on table public\.lx_demo_social_metrics,public\.lx_demo_social_audit from public,anon,authenticated/);
 assert.match(sql,/public\.lx_admin_role\(\)/);
 assert.match(sql,/role_name not in \('owner','administrator'\)/);
 assert.match(sql,/insert into public\.lx_demo_social_audit/);
 assert.match(sql,/p_count not between 0 and 100000/);
 assert.doesNotMatch(sql,/\binsert into public\.lx_post_likes\b/i);
 assert.doesNotMatch(sql,/\binsert into public\.lx_friendships\b/i);
 assert.doesNotMatch(sql,/\bupdate public\.lx_rank_scores\b/i);
});
test('demo counters are visible for public entities only; no bulk leakage of private posts',()=>{
 assert.match(sql,/p_posts uuid\[\],p_profiles uuid\[\]/);
 assert.match(sql,/cardinality\(p_posts\),0\)>50/);
 assert.match(sql,/p\.visibility='public'/);
 assert.match(sql,/p\.status='published'/);
 assert.match(sql,/p\.social_visible=true and p\.approved=true/);
 assert.match(sql,/revoke all on function public\.lx_demo_social_visible\(uuid\[\],uuid\[\]\) from public,anon/);
 assert.match(sql,/grant execute on function public\.lx_demo_social_visible\(uuid\[\],uuid\[\]\) to authenticated/);
 assert.match(sql,/revoke all on function public\.lx_demo_social_admin\(\) from public,anon/);
});
test('promo remains separate and existing real-like actions are unchanged',()=>{
 assert.match(social,/lx_visible_sponsored_posts/);
 assert.match(social,/lx_post_likes/);
 assert.match(file('src/studio-promotions.js'),/Divulgação patrocinada/);
 assert.match(file('index.html'),/lx-social-demo\.css/);
});
