import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {youtubeCandidates,spotifyCandidates,providerDiscovery,searchTerms} from '../supabase/functions/lx-music-robot/providers.mjs';
import {robotChartData,renderMusicRobotAdmin} from '../src/music-robot-admin.js';

test('YouTube discovery stages official embed links only; does not guess singer or album',()=>{
 const rows=youtubeCandidates([{id:{videoId:'abcdefghijk'},snippet:{title:'Faixa oficial',channelTitle:'Canal popular',thumbnails:{high:{url:'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'}}}},{id:{videoId:'bad'},snippet:{title:'invalid'}}]);
 assert.equal(rows.length,1);assert.equal(rows[0].sourceUrl,'https://www.youtube.com/watch?v=abcdefghijk');
 assert.equal(rows[0].artist,'');assert.equal(rows[0].album,'');assert.equal(rows[0].title,'Faixa oficial');
});
test('Spotify official track includes exact metadata from its own album and artist data',()=>{
 const result=spotifyCandidates([{id:'0123456789abcdefghijkl',name:'Original Studio Recording',artists:[{name:'Cantora Um'}],album:{name:'Disco Um',release_date:'2025-06-02',images:[{url:'https://i.scdn.co/image/abc'}]}}]);
 assert.equal(result.length,1);assert.equal(result[0].artist,'Cantora Um');assert.equal(result[0].album,'Disco Um');assert.equal(result[0].year,2025);
 assert.equal(result[0].externalId,'spotify:0123456789abcdefghijkl');
});
test('provider discovery uses official API queries and handles missing keys without inventing imports',async()=>{
 const empty=await providerDiscovery({query:'sertanejo',fetcher:()=>{throw Error('should not fetch')}});
 assert.deepEqual(empty.items,[]);assert.equal(empty.providers,0);
 const response=await providerDiscovery({query:'sertanejo',limit:10,youtubeKey:'PRIVATE_GOOGLE_KEY',fetcher:async(url)=>{
  assert.ok(String(url).startsWith('https://www.googleapis.com/youtube/v3/search?'));
  assert.equal(new URL(url).searchParams.get('videoEmbeddable'),'true');
  assert.equal(new URL(url).searchParams.get('maxResults'),'10');
  return new Response(JSON.stringify({items:[{id:{videoId:'abcdefghijk'},snippet:{title:'Verificada',thumbnails:{default:{url:'https://i.ytimg.com/x.jpg'}}}}]}),{status:200});
 }});
 assert.equal(response.scanned,1);assert.equal(response.items[0].provider,'YouTube');assert.equal(response.errors.length,0);
 assert.equal(searchTerms(['A','B'],1),'B');
});
test('provider HTTP errors are sanitized and never leak secret API credentials',async()=>{
 const result=await providerDiscovery({query:'music',limit:10,youtubeKey:'DO_NOT_LEAK',fetcher:async()=>new Response('',{status:429})});
 assert.equal(result.items.length,0);assert.deepEqual(result.errors,['YOUTUBE_429']);assert.ok(!JSON.stringify(result).includes('DO_NOT_LEAK'));
});
test('statistics and chart use actual run logs, never invented daily values',()=>{
 const history=[
 {started_at:'2026-11-01T13:00:00Z',status:'success',scanned:25,added:10,duplicates:15},
 {started_at:'2026-11-01T14:00:00Z',status:'partial',scanned:12,added:2,duplicates:10},
 {started_at:'2026-11-02T14:00:00Z',status:'success',scanned:10,added:5,duplicates:5}
 ];
 const graph=robotChartData(history);assert.equal(graph.length,2);assert.equal(graph[0].scanned,37);assert.equal(graph[0].added,12);assert.equal(graph[0].duplicates,25);
 const dash=renderMusicRobotAdmin({enabled:false,daily_limit:300,processed:0,keys:{youtube:false,spotify:false},runs:history,queries:['official music']},'owner');
 assert.match(dash,/Robô Musical/);assert.match(dash,/Gráfico de descobertas/);
 assert.match(dash,/name="youtubeKey"/);assert.match(dash,/name="spotifyId"/);
 assert.match(dash,/name="dailyLimit"/);assert.match(dash,/Aguardando integração/);
 assert.doesNotMatch(renderMusicRobotAdmin({enabled:false,keys:{},runs:[]},'editor'),/name="youtubeKey"/);
});
test('SQL script schedules safely and blocks public reads and automated publication',()=>{
 const sql=readFileSync(new URL('../supabase/sql/lx-music-robot.sql',import.meta.url),'utf8');
 assert.match(sql,/enable row level security/g);assert.match(sql,/revoke all on table public\.lx_music_robot_config/);
 assert.match(sql,/grant execute on function public\.lx_music_robot_claim\(\) to service_role/);
 assert.match(sql,/published,updated_at\)\s*values\(cid,[\s\S]*?false,now\(\)\)/);
 assert.match(sql,/cron\.schedule\('lx-music-robot-hourly'/);
 assert.match(sql,/x-lx-job-token/);
 const studio=readFileSync(new URL('../src/modules/studio.js',import.meta.url),'utf8');
 assert.match(studio,/renderMusicRobotAdmin/);assert.match(studio,/lx_music_robot_configure/);
 assert.match(studio,/lx-music-robot/);
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/music-robot\.css/);
});

test('manual execute button remains available when background schedule is paused',()=>{
 const html=renderMusicRobotAdmin({enabled:false,daily_limit:300,keys:{youtube:true,spotify:true},runs:[],queries:['música oficial']},'owner');
 assert.match(html,/data-music-robot-run/);
 assert.doesNotMatch(html,/data-music-robot-run disabled/);
 const running=renderMusicRobotAdmin({enabled:true,daily_limit:300,keys:{youtube:true,spotify:true},runs:[]},'owner',{running:true,message:'Conectando'});
 assert.match(running,/data-music-robot-run disabled/);
 assert.match(running,/Buscando músicas/);
 assert.match(running,/Conectando/);
});
test('browser invocation handles OPTIONS and every response has CORS headers',()=>{
 const edge=readFileSync(new URL('../supabase/functions/lx-music-robot/index.ts',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/modules/studio.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/sql/lx-music-robot-manual-claim.sql',import.meta.url),'utf8');
 assert.match(edge,/req\.method==='OPTIONS'/);
 assert.match(edge,/Access-Control-Allow-Headers/);
 assert.match(edge,/headers:\{\.\.\.cors/);
 assert.match(edge,/const actor=await authorized\(req\)/);
 assert.match(edge,/p_manual:actor==='admin'/);
 assert.match(sql,/not cfg\.enabled and not p_manual/);
 assert.match(sql,/revoke all on function public\.lx_music_robot_claim\(boolean\) from public,anon,authenticated/);
 assert.match(studio,/robotRunning=false/);
 assert.match(studio,/AbortSignal\.timeout\(35000\)/);
 assert.match(studio,/robotMessage/);
});

test('Spotify API rejection does not halve the YouTube results or leak credentials',async()=>{
 let youtubeSize=0;
 const data=await providerDiscovery({query:'música oficial',limit:40,youtubeKey:'GOOGLE_SECRET',spotifyId:'0123456789abcdef0123456789abcdef',spotifySecret:'PRIVATE_SPOTIFY_SECRET',fetcher:async(url)=>{
  const target=String(url);
  if(target.startsWith('https://accounts.spotify.com/api/token'))return new Response('',{status:403});
  if(target.startsWith('https://www.googleapis.com/youtube/v3/search?')){
   youtubeSize=Number(new URL(target).searchParams.get('maxResults'));
   return new Response(JSON.stringify({items:Array.from({length:40},(_,i)=>({id:{videoId:('video'+String(i).padStart(6,'0')).slice(0,11)},snippet:{title:'Faixa '+i}}))}),{status:200});
  }
  throw Error('Unexpected host');
 }});
 assert.equal(youtubeSize,40);
 assert.equal(data.items.length,40);
 assert.deepEqual(data.errors,['SPOTIFY_AUTH_403']);
 assert.equal(data.items.every(item=>item.provider==='YouTube'),true);
 assert.doesNotMatch(JSON.stringify(data),/GOOGLE_SECRET|PRIVATE_SPOTIFY_SECRET/);
});
