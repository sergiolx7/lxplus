import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicDemoLabel,compactSocialCount,engagementPreview} from '../src/social-demo-ui.js';
import {memberProfileCard} from '../src/member-profile.js';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const sql=file('supabase/sql/lx-social-public-demo-labels.sql');
const social=file('src/modules/social.js');

test('public post includes genuine heart count and a distinctly marked demo badge',()=>{
 assert.equal(engagementPreview(2,0),'2');
 assert.match(publicDemoLabel(10000,'post'),/\+10K curtidas <strong>TESTE<\/strong>/);
 assert.match(publicDemoLabel(1200,'profile'),/\+1,2K seguidores <strong>TESTE<\/strong>/);
 assert.equal(publicDemoLabel(0),'');
 assert.equal(compactSocialCount(1000000),'1M');
 assert.match(social,/engagementPreview\(count,demoPostCounts\.get\(post\.id\)\)/);
 assert.match(social,/publicDemoLabel\(publicDemoPostCounts\.get\(post\.id\),'post'\)/);
 assert.match(social,/!labMode\?publicDemoLabel/);
});
test('public RPC only reveals labeled test metrics of public approved resources',()=>{
 assert.match(sql,/create or replace function public\.lx_demo_social_public/);
 assert.match(sql,/public\.lx_is_approved\(\) is not true/);
 assert.match(sql,/p\.status='published' and p\.visibility='public'/);
 assert.match(sql,/p\.approved and p\.social_visible/);
 assert.match(sql,/cardinality\(p_posts\),0\)>50/);
 assert.match(sql,/revoke all on function public\.lx_demo_social_public\(uuid\[\],uuid\[\]\) from public,anon/);
 assert.match(sql,/grant execute on function public\.lx_demo_social_public\(uuid\[\],uuid\[\]\) to authenticated/);
 assert.doesNotMatch(sql,/insert into public\.lx_post_likes|insert into public\.lx_profile_follows/);
});
test('all logged-in community members receive real follows and independent public demo counts',()=>{
 assert.match(social,/db\.rpc\('lx_social_follow_stats'/);
 assert.match(social,/db\.rpc\('lx_demo_social_public'/);
 assert.match(social,/publicDemoProfileCounts=new Map/);
 assert.match(social,/publicDemoPostCounts=append\?/);
 assert.match(social,/compactSocialCount\(Number\(stats\.followers\|\|0\)\+Number\(demoProfileCounts\.get\(p\.user_id\)\|\|0\)\)/);
 assert.match(social,/!labMode\?publicDemoLabel\(publicDemoProfileCounts\.get\(p\.user_id\),'profile'\)/);
});
test('every displayed member profile has a copyable full ID and genuine followers',()=>{
 const id='e8910000-1111-4222-8333-444444444444';
 const html=memberProfileCard({user_id:id,name:'Pessoa',username:'teste'},{
  viewerId:'11111111-1111-4111-8111-111111111111',followStats:{followers:3,following_count:2},publicDemoFollowers:10000,labMode:false
 });
 assert.match(html,/3<\/strong> seguidores/);
 assert.match(html,/2<\/strong> seguindo/);
 assert.match(html,/\+10K seguidores <strong>TESTE<\/strong>/);
 assert.match(html,/ID DO PERFIL/);
 assert.match(html,new RegExp(id));
 assert.match(html,new RegExp('data-copy-profile-id="'+id+'"'));
 const labHtml=memberProfileCard({user_id:id,name:'Pessoa'},{
  viewerId:'11111111-1111-4111-8111-111111111111',followStats:{followers:3,following_count:2},publicDemoFollowers:10000,demoFollowers:10000,labMode:true
 });
 assert.match(labHtml,/10K<\/strong> seguidores/);
 assert.doesNotMatch(labHtml,/TESTE/);
 assert.match(social,/data-copy-profile-id/);
 assert.match(social,/ID completo do perfil copiado/);
 const account=file('src/modules/account.js');
 assert.match(account,/lx_social_follow_stats/);
 assert.match(account,/ID DO PERFIL/);
 assert.match(account,/data-copy-profile-id/);
});
test('existing true likes and follower tables stay untouched and artificial numbers remain marked',()=>{
 assert.doesNotMatch(sql,/update public\.lx_post_likes|insert into public\.lx_post_likes|insert into public\.lx_profile_follows/);
 assert.match(social,/lx_post_likes/);
 assert.match(social,/lx_social_follow_stats/);
 assert.match(file('assets/lx-social-demo.css'),/lx-public-demo-label/);
 assert.match(file('index.html'),/lx-social-demo\.css/);
});
