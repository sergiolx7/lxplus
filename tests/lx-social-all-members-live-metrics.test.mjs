import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const social=readFileSync(new URL('../src/modules/social.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/sql/lx-social-public-demo-labels.sql',import.meta.url),'utf8');
test('all authenticated approved members receive real likes and follower stats plus separate public demo figures',()=>{
 assert.match(social,/lx_post_likes/);
 assert.match(social,/lx_social_follow_stats/);
 assert.match(social,/lx_demo_social_public/);
 assert.match(sql,/auth\.uid\(\) is null or public\.lx_is_approved\(\) is not true/);
 assert.doesNotMatch(sql,/lx_admin_role/);
 assert.doesNotMatch(sql,/lx_demo_social_view_access/);
 assert.match(social,/publicDemoLabel\(publicDemoPostCounts\.get\(post\.id\),'post'\)/);
 assert.match(social,/publicDemoLabel\(publicDemoProfileCounts\.get\(p\.user_id\),'profile'\)/);
});
test('public counts refresh automatically and on returning focus without resetting composer or chats',()=>{
 assert.match(social,/refreshCommunityCounters/);
 assert.match(social,/countersTimer=setInterval\(\(\)=>refreshCommunityCounters\(\)\.catch\(\(\)=>\{\}\),30000\)/);
 assert.match(social,/window\.addEventListener\('focus',onCommunityFocus\)/);
 assert.match(social,/document\.addEventListener\('visibilitychange',onCommunityFocus\)/);
 assert.match(social,/document\.hidden\|\|countersRefreshing\|\|postSending/);
 assert.match(social,/!host\.querySelector\('#postForm:focus-within'\)/);
 assert.match(social,/host\.querySelector\('#peopleResults'\)/);
 assert.match(social,/clearInterval\(countersTimer\)/);
 assert.match(social,/window\.removeEventListener\('focus',onCommunityFocus\)/);
});
