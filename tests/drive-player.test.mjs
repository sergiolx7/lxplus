import {test} from 'node:test';
import assert from 'node:assert/strict';
import {driveReference} from '../src/drive-source.js';
import {classifyLink,resolveItem} from '../src/universal-player.js';
import {handleDrivePlayer,issueDriveTicket,readDriveTicket,driveRequestRange,catalogDriveSource} from '../supabase/functions/lx-drive-player/handler.mjs';

const driveId='1Abcde1234567890xyz',origin='https://test.supabase.co',secret='server-secret-for-unit-tests';
const env=name=>({SUPABASE_URL:origin,SUPABASE_SERVICE_ROLE_KEY:secret,SUPABASE_ANON_KEY:'public-key'})[name];
const source='https://drive.google.com/file/d/'+driveId+'/view?resourcekey=key_123';
const payload={type:'Filme',sourceUrl:source,license:{authorized:true}};
const binary=(range='bytes 0-0/100000000')=>new Response(new Uint8Array([1]),{status:206,headers:{'content-range':range,'content-length':'1','content-type':'application/octet-stream','content-disposition':'attachment; filename="video.mp4"'}});
const post=(body={catalogId:'123',driveId},authorization='Bearer real-user')=>new Request(origin+'/functions/v1/lx-drive-player',{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify(body)});
function fixture({catalog=payload,upstream=()=>binary()}={}){
 const calls=[];
 const fetcher=async(url,options={})=>{
  calls.push({url:String(url),options});
  if(url===origin+'/auth/v1/user')return Response.json({id:'verified-user'});
  if(String(url).startsWith(origin+'/rest/v1/lx_catalog'))return Response.json(catalog?[{payload:catalog}]:[]);
  assert.ok(String(url).startsWith('https://drive.usercontent.google.com/download?'));
  return upstream(options);
 };
 return {fetcher,calls};
}
test('Drive uses the LX resolver, including native gdrive audio, and never a preview iframe',async()=>{
 assert.equal(classifyLink(source).kind,'drive');
 let received;
 const resolveDrive=async(ref,item)=>{received={ref,item};return {kind:item.type==='Música'?'audio':'video',url:origin+'/functions/v1/lx-drive-player?ticket=short-lived'}};
 const movie=await resolveItem({id:123,...payload},{resolveDrive});
 assert.equal(movie.kind,'video');assert.equal(movie.provider,'Google Drive');assert.equal(received.ref.resourceKey,'key_123');
 const song=await resolveItem({id:123,type:'Música',mediaKey:'gdrive:'+driveId},{resolveDrive});
 assert.equal(song.kind,'audio');assert.equal(received.ref.audio,true);
 assert.equal((await resolveItem({id:123,...payload})).kind,'unavailable');
});
test('Drive parsing excludes folder, document and spoofed host references',()=>{
 for(const link of ['https://drive.google.com/drive/folders/'+driveId,'https://docs.google.com/document/d/'+driveId+'/edit','https://drive.google.com.evil.test/file/d/'+driveId+'/view','https://user:pass@drive.google.com/file/d/'+driveId+'/view'])assert.equal(driveReference(link),null);
 assert.equal(driveReference('gdrive:'+driveId).driveId,driveId);
 assert.equal(driveReference('https://drive.google.com/uc?id='+driveId).driveId,driveId);
});
test('server only accepts existing authorized catalog sources and handles episode arrays',()=>{
 assert.equal(catalogDriveSource({...payload,license:null},driveId),null);
 assert.equal(catalogDriveSource({...payload,archived:true},driveId),null);
 assert.equal(catalogDriveSource(payload,'1DifferentFile12345'),null);
 assert.equal(catalogDriveSource({type:'Série',license:{authorized:true},seasons:[{episodes:[{sourceUrl:source}]}]},driveId).driveId,driveId);
});
test('resolver authenticates and checks RLS before contacting Drive',async()=>{
 let f=fixture();
 assert.equal((await handleDrivePlayer(post(undefined,''),{env,fetcher:f.fetcher})).status,401);assert.equal(f.calls.length,0);
 f=fixture({catalog:null});assert.equal((await handleDrivePlayer(post(),{env,fetcher:f.fetcher})).status,403);assert.equal(f.calls.length,2);
 assert.equal(f.calls[1].options.headers.authorization,'Bearer real-user');
 f=fixture({catalog:{...payload,license:null}});assert.equal((await handleDrivePlayer(post(),{env,fetcher:f.fetcher})).status,403);assert.equal(f.calls.length,2);
});
test('resolver issues scoped signed media URLs without exposing credentials',async()=>{
 const f=fixture(),response=await handleDrivePlayer(post(),{env,fetcher:f.fetcher});assert.equal(response.status,200);
 const result=await response.json();assert.equal(result.kind,'video');assert.equal(result.mime,'video/mp4');
 assert.ok(!JSON.stringify(result).includes(secret));assert.ok(!JSON.stringify(result).includes('real-user'));
 const ticket=await readDriveTicket(new URL(result.url).searchParams.get('ticket'),secret);
 assert.equal(ticket.d,driveId);assert.equal(ticket.u,'verified-user');assert.equal(ticket.r,'key_123');
 assert.equal(new URL(f.calls[2].url).searchParams.get('resourcekey'),'key_123');
});
test('tampered, missing and expired media tickets are rejected before a provider request',async()=>{
 const ticket=await issueDriveTicket({d:driveId,u:'verified-user',e:Date.now()+60000},secret);
 assert.equal(await readDriveTicket(ticket,secret,Date.now()+120000),null);
 for(const value of ['',ticket+'x',ticket.replace(/^./,ticket[0]==='a'?'b':'a')]){
  let calls=0;const response=await handleDrivePlayer(new Request(origin+'/?ticket='+value),{env,fetcher:()=>{calls++;throw Error('Must not fetch')}});
  assert.equal(response.status,401);assert.equal(calls,0);
 }
});
test('byte ranges are capped and malformed/multiple ranges are rejected',()=>{
 assert.equal(driveRequestRange('bytes=99-'),'bytes=99-8388706');
 assert.equal(driveRequestRange('bytes=50-100'),'bytes=50-100');
 assert.equal(driveRequestRange('bytes=-999999999'),'bytes=-8388608');
 for(const input of ['bytes=100-2','bytes=-','bytes=0-10,20-30','bytes=abc-2','bytes=99999999999999999999-'])assert.equal(driveRequestRange(input),null);
});
test('stream keeps partial response, accurate MIME, CORS and seek headers',async()=>{
 const ticket=await issueDriveTicket({d:driveId,u:'verified-user',e:Date.now()+60000},secret),f=fixture({upstream:()=>binary('bytes 500-500/100000000')});
 const response=await handleDrivePlayer(new Request(origin+'/?ticket='+ticket,{headers:{Range:'bytes=500-500'}}),{env,fetcher:f.fetcher});
 assert.equal(response.status,206);assert.equal(f.calls[0].options.headers.Range,'bytes=500-500');assert.equal(response.headers.get('content-type'),'video/mp4');assert.equal(response.headers.get('content-range'),'bytes 500-500/100000000');assert.equal(response.headers.get('accept-ranges'),'bytes');assert.equal(response.headers.get('access-control-allow-origin'),'*');
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([1]));
});
test('provider HTML, quotas and ignored range never become video bytes',async()=>{
 const ticket=await issueDriveTicket({d:driveId,u:'verified-user',e:Date.now()+60000},secret);
 for(const [upstream,status] of [[()=>new Response('<html>Sign in</html>',{headers:{'content-type':'text/html'}}),424],[()=>new Response(null,{status:429}),429],[()=>new Response('full file',{headers:{'content-type':'video/mp4'}}),502]]){
  const f=fixture({upstream});const response=await handleDrivePlayer(new Request(origin+'/?ticket='+ticket),{env,fetcher:f.fetcher});assert.equal(response.status,status);assert.match(response.headers.get('content-type'),/json/);
 }
});
