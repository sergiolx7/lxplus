import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {founderBadge} from '../src/profile-premium.js';
import {memberProfileCard} from '../src/member-profile.js';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Founder badge is only shown for server-verified owner flag',()=>{
 assert.match(founderBadge({is_founder:true}),/Fundador LX Plus/);
 assert.equal(founderBadge({is_founder:false,name:'sergiolx'}),'');
 assert.equal(founderBadge({name:'sergiolx',username:'sergiolx'}),'');
 assert.equal(founderBadge({is_founder:'true'}),'');
});
test('Only the existing @sergiolx owner qualifies, not other admins or lookalikes',()=>{
 const sql=src('supabase/sql/lx-official-founder-profile.sql');
 assert.match(sql,/a\.role='owner'/);
 assert.match(sql,/lower\(p\.username\)='sergiolx'/);
 assert.match(sql,/p\.approved=true and p\.social_visible=true/);
 assert.match(sql,/coalesce\(cardinality\(p_users\),0\)<=100/);
 assert.match(sql,/revoke all on function public\.lx_official_founder_profiles\(uuid\[\]\) from public,anon/);
 assert.doesNotMatch(sql,/update.*lx_profile_follows|update.*lx_demo_social_metrics|insert into.*lx_profile_follows/si);
});
test('Public member profile renders official founder, but real follower count remains unchanged',()=>{
 const p={user_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',name:'sergiolx',username:'sergiolx',is_founder:true};
 const html=memberProfileCard(p,{viewerId:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',followStats:{followers:84,following_count:5}});
 assert.match(html,/Fundador LX Plus/);
 assert.match(html,/84<\/strong> seguidores/);
 assert.doesNotMatch(html,/1M seguidores|1000000/);
 const other=memberProfileCard({...p,is_founder:false},{viewerId:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',followStats:{followers:12,following_count:4}});
 assert.doesNotMatch(other,/Fundador LX Plus/);
});
test('Founder is displayed in directory and feed using protected owner lookup',()=>{
 const social=src('src/modules/social.js');
 const account=src('src/modules/account.js');
 assert.match(social,/lx_official_founder_profiles/);
 assert.match(social,/founderIds=new Set/);
 assert.match(social,/is_founder:founderIds\.has/);
 assert.match(social,/founderBadge\(author\)/);
 assert.match(social,/people-card .*lx-founder-profile/);
 assert.match(account,/lx_official_founder_profiles/);
 assert.match(account,/founderBadge\(\{\.\.\.p,is_founder:ownFounder\}\)/);
 assert.match(src('index.html'),/lx-founder\.css/);
});
