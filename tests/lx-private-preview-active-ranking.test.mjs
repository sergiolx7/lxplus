import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compactSocialCount,engagementPreview,renderPreviewViewers} from '../src/social-demo-ui.js';
import {renderRanking} from '../src/ranking-ui.js';
import {leagueRules} from '../src/league-activity.js';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const permissions=file('supabase/sql/lx-lab-private-preview.sql'),
 activity=file('supabase/sql/lx-rank-active-time.sql'),
 activityStatus=file('supabase/sql/lx-rank-active-status.sql'),
 social=file('src/modules/social.js'),
 studio=file('src/modules/studio.js'),
 app=file('src/app.js');

test('Brazilian compact counters use natural K, M and B suffixes with correct thresholds',()=>{
 assert.equal(compactSocialCount(0),'0');
 assert.equal(compactSocialCount(999),'999');
 assert.equal(compactSocialCount(1000),'1K');
 assert.equal(compactSocialCount(1200),'1,2K');
 assert.equal(compactSocialCount(10000),'10K');
 assert.equal(compactSocialCount(123456),'123K');
 assert.equal(compactSocialCount(999950),'1M');
 assert.equal(compactSocialCount(1000000),'1M');
 assert.equal(compactSocialCount(1500000),'1,5M');
 assert.equal(compactSocialCount(1200000000),'1,2B');
 assert.equal(engagementPreview(1,10000),'10K');
 assert.doesNotMatch(engagementPreview(1,10000),/PRÉVIA|SIMULAÇÃO/);
});
test('private preview shows normal-looking counts with one global lab notice',()=>{
 assert.match(social,/lx_demo_social_view_access/);
 assert.match(social,/lx-lab-private-banner/);
 assert.match(social,/compactSocialCount\(Number\(stats\.followers\|\|0\)\+Number\(demoProfileCounts\.get\(p\.user_id\)\|\|0\)\)/);
 assert.match(social,/engagementPreview\(count,demoPostCounts\.get\(post\.id\)\)/);
 assert.doesNotMatch(social,/demoLabel\(demoPostCounts\.get\(post\.id\)/);
 assert.match(file('src/member-profile.js'),/compactSocialCount\(Number\(stats\.followers\|\|0\)\+Number\(demoFollowers\|\|0\)\)/);
 assert.match(file('assets/lx-social-demo.css'),/lx-lab-private-banner/);
});
test('server reveals demo numbers only to owner, ADM and owner-approved viewers',()=>{
 assert.match(permissions,/create table if not exists public\.lx_demo_preview_viewers/);
 assert.match(permissions,/enable row level security/);
 assert.match(permissions,/revoke all on public\.lx_demo_preview_viewers from public,anon,authenticated/);
 assert.match(permissions,/public\.lx_admin_role\(\) in \('owner','administrator'\)/);
 assert.match(permissions,/public\.lx_admin_role\(\)<>'owner'/);
 assert.match(permissions,/if public\.lx_demo_social_view_access\(\) is not true then return '\[\]'::jsonb/);
 assert.match(permissions,/auth\.uid\(\)/);
 assert.match(permissions,/p\.visibility='public'/);
 assert.doesNotMatch(permissions,/insert into public\.lx_post_likes/);
 assert.doesNotMatch(permissions,/insert into public\.lx_profile_follows/);
});
test('owner can grant or revoke preview access through the ADM and member must be approved',()=>{
 const html=renderPreviewViewers([{user_id:'11111111-1111-4111-8111-111111111111',name:'Conta autorizada'}],true);
 assert.match(html,/Quem pode ver os números de teste/);
 assert.match(html,/lxLabViewerForm/);
 assert.match(html,/data-lab-revoke/);
 assert.equal(renderPreviewViewers([],false),'');
 assert.match(studio,/lx_demo_social_allow_viewer/);
 assert.match(studio,/lx_demo_social_preview_viewers/);
 assert.match(studio,/adminRole!=='owner'/);
 assert.match(permissions,/APPROVED_MEMBER_REQUIRED/);
});
test('ranking time points use server elapsed intervals, concurrency lock and a daily cap',()=>{
 assert.match(activity,/create table if not exists public\.lx_rank_active_sessions/);
 assert.match(activity,/enable row level security/);
 assert.match(activity,/revoke all on public\.lx_rank_active_sessions from public,anon,authenticated/);
 assert.match(activity,/public\.lx_is_approved\(\)/);
 assert.match(activity,/pg_advisory_xact_lock/);
 assert.match(activity,/elapsed>=15 and elapsed<=70/);
 assert.match(activity,/least\(35,floor\(elapsed\)::integer\)/);
 assert.match(activity,/floor\(next_seconds\/300\)::integer/);
 assert.match(activity,/48/);
 assert.match(activity,/new_intervals>r\.credited_intervals/);
 assert.match(activity,/event_key:='active:'/);
 assert.match(activity,/insert into public\.lx_rank_events/);
 assert.match(activity,/status.*'confirmed'/s);
 assert.match(activity,/on conflict\(season_key,user_id\) do update/);
 assert.match(activity,/grant execute on function public\.lx_rank_active_heartbeat\(text\) to authenticated/);
 assert.match(activityStatus,/lx_rank_active_status/);
 assert.match(activityStatus,/where user_id=u and activity_day=d/);
});
test('browser only credits activity while visible, focused and actively interacting',()=>{
 assert.match(app,/checkSiteActivePoints/);
 assert.match(app,/document\.hasFocus\(\)/);
 assert.match(app,/document\.hidden/);
 assert.match(app,/leagueInteractions<2/);
 assert.match(app,/Date\.now\(\)-leagueLastInteraction>90000/);
 assert.match(app,/musicDock\.embedded/);
 assert.match(app,/lx_rank_active_heartbeat/);
 assert.match(app,/root\.addEventListener\('pointermove',noteActiveGesture/);
 assert.match(app,/root\.addEventListener\('keydown',noteActiveGesture/);
 assert.match(app,/root\.addEventListener\('wheel',noteActiveGesture/);
});
test('ranking renders five minute progress and public league rules',()=>{
 assert.equal(leagueRules.find(x=>x.key==='site_active')?.points,1);
 assert.equal(leagueRules.find(x=>x.key==='site_active')?.cap,48);
 const out=renderRanking({season:{season_key:'2026-11',ends_at:'2026-12-01T00:00:00Z',prize_cents:10000},
  rows:[],people:[],activity:{today_seconds:450,today_points:1,next_in_seconds:150,daily_cap_points:48},now:Date.parse('2026-11-03T00:00:00Z')});
 assert.match(out,/TEMPO ATIVO HOJE/);
 assert.match(out,/0h 07min/);
 assert.match(out,/Próximo \+1 ponto em 3 min/);
 assert.match(out,/Tempo ativo no site/);
 assert.match(file('src/modules/library.js'),/lx_rank_active_status/);
 assert.match(file('assets/lx-league-2.css'),/lx-league-stat-time/);
});
