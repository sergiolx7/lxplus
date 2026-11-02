import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playbackThreshold,eligibleLeaguePlayback,createLeagueSession,leagueRules} from '../src/league-activity.js';
import {renderRanking} from '../src/ranking-ui.js';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('server thresholds match true listening/watch credit thresholds',()=>{
 assert.equal(playbackThreshold('music_valid',29),null);
 assert.equal(playbackThreshold('music_valid',100),32);
 assert.equal(playbackThreshold('music_valid',500),75);
 assert.equal(playbackThreshold('watch_valid',100),45);
 assert.equal(playbackThreshold('watch_valid',1200),180);
 assert.equal(playbackThreshold('watch_valid',50),null);
});
test('no rank rewards for embedded YouTube or Spotify, even inside LX-branded shell',()=>{
 const copyrighted={id:1,type:'Música',officialEmbedded:true,license:{authorized:true}};
 assert.equal(eligibleLeaguePlayback(copyrighted,{kind:'iframe',provider:'YouTube'}),false);
 assert.equal(eligibleLeaguePlayback({id:2,type:'Música',sourceVerified:true},{kind:'iframe',provider:'Spotify'}),false);
 assert.equal(eligibleLeaguePlayback(copyrighted,{kind:'audio',provider:'YouTube'}),false);
 assert.equal(eligibleLeaguePlayback({id:1,type:'Música',sourceVerified:true},{kind:'audio',provider:'local'}),true);
 assert.equal(eligibleLeaguePlayback({id:1,type:'Filme',license:{authorized:true}},{kind:'video'}),true);
 assert.equal(eligibleLeaguePlayback({id:1},{kind:'audio'}),false);
});
test('measured music only awards after threshold and never doubles on repeated checkpoints',async()=>{
 let reports=[],awards=[],notices=[];
 const session=createLeagueSession({kind:'music_valid',id:'17',session:'my-session',report:async total=>reports.push(total),award:async data=>{awards.push(data);return {ok:true,awarded:5}},onMessage:text=>notices.push(text)});
 assert.equal(await session({total:15,duration:120}),false);
 assert.equal(await session({total:30,duration:120}),false);
 assert.equal(await session({total:45,duration:120}),true);
 assert.equal(await session({total:50,duration:120}),false);
 assert.deepEqual(reports,[15,30,45]);
 assert.equal(awards.length,1);assert.equal(notices[0],'+5 pontos LX League');
});
test('ranking UI contains premium podium and honest earning rules',()=>{
 const s={season_key:'2026-11',ends_at:'2026-12-01T00:00:00Z',prize_cents:10000};
 const ui=renderRanking({season:s,rows:[{user_id:'u1',monthly_score:55},{user_id:'u2',monthly_score:20}],people:[{user_id:'u1',name:'A',ranking_visible:true},{user_id:'u2',name:'B',ranking_visible:true}],userId:'u2',position:2,own:{monthly_score:20},now:Date.parse('2026-11-05T00:00:00Z')});
 assert.match(ui,/lx-league-v2/);assert.match(ui,/lx-league-podium-grid/);
 assert.match(ui,/lx-league-progress/);assert.match(ui,/data-rank-refresh/);
 assert.match(ui,/Como ganhar pontos/);assert.match(ui,/YouTube\/Spotify/);
 assert.equal(leagueRules.find(r=>r.key==='watch_valid').points,10);
 assert.equal(leagueRules.find(r=>r.key==='read_valid').points,8);
});
test('mobile leaderboard and cache-busting CSS are shipped',()=>{
 const css=file('assets/lx-league-2.css');
 const index=file('index.html');
 const lib=file('src/modules/library.js');
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(index,/lx-league-2\.css/);
 assert.match(lib,/setInterval\(/);
 assert.match(lib,/lx_rank_rollover_if_needed/);
 assert.match(lib,/data-rank-refresh/);
 assert.match(lib,/\['closed','review'\]/);
});
test('read sessions are server-timed, validated, and not directly insertable by members',()=>{
 const sql=file('supabase/sql/lx-league-reading-verification.sql');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.lx_reading_sessions from public,anon,authenticated/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/payload->>'type'='Livro'/);
 assert.match(sql,/readrow\.seconds<110/);
 assert.match(sql,/cardinality\(readrow\.pages_seen\)<3/);
 assert.match(sql,/create trigger lx_confirm_reading before insert/);
 const app=file('src/app.js');
 assert.match(app,/p_session:readingSession/);
 assert.match(app,/p_event_type:'read_valid'/);
 assert.match(app,/readingTimer=setInterval/);
});
test('valid high-frequency or capped events no longer flag the entire ranking account',()=>{
 const sql=file('supabase/sql/lx-league-safer-points.sql');
 assert.match(sql,/status','daily_limit'/);
 assert.match(sql,/status','cooldown'/);
 assert.match(sql,/status','not_verified'/);
 assert.match(sql,/America\/Fortaleza/);
 assert.match(sql,/return jsonb_build_object/);
 const app=file('src/app.js');
 const video=file('src/video-session.js');
 const dock=file('src/music-dock.js');
 assert.match(app,/p_event_type:kind/);
 assert.match(video,/onActiveSeconds/);
 assert.match(video,/document\.hidden/);
 assert.match(video,/media\.seeking/);
 assert.match(dock,/duration:Number\.isFinite\(audio\.duration\)/);
});

test('daily engagement is real in-app interaction, not passive YouTube or Spotify playback',()=>{
 const app=file('src/app.js');
 assert.match(app,/leagueInteractions<3/);
 assert.match(app,/document\.hasFocus\(\)/);
 assert.match(app,/musicDock\.embedded/);
 assert.match(app,/document\.querySelector\('\.embed-wrap iframe'\)/);
 assert.match(app,/p_event_type:'streak_daily'/);
 assert.match(app,/lx_record_reading/);
});
test('native player has LX controls; third-party providers retain their official interface',()=>{
 const dock=file('src/music-dock.js');
 const css=file('assets/lx-league-2.css');
 assert.match(dock,/lx-native-now-controls/);
 assert.match(dock,/this\.embedded\?/);
 assert.match(dock,/player oficial do provedor/);
 assert.match(dock,/data-music-action="toggle"/);
 assert.match(css,/lx-native-now-controls/);
 assert.match(dock,/source\.kind==='iframe'/);
 assert.match(dock,/document\.createElement\('iframe'\)/);
});
