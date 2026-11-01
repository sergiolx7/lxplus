import test from 'node:test';
import assert from 'node:assert/strict';
import {probeTurnRelay,relayCapabilities} from '../src/rtc-diagnostic.js';
import {cloudflareCredentials} from '../supabase/functions/lx-rtc-config/cloudflare.mjs';
import {handleRtc} from '../supabase/functions/lx-rtc-config/handler.mjs';

const demo=[{urls:['stun:stun.cloudflare.com:3478']},{urls:['turn:turn.cloudflare.com:3478?transport=udp','turns:turn.cloudflare.com:443?transport=tcp'],username:'short-lived',credential:'short-lived-secret'}];
test('TURN configuration advertises TLS/443 as a restricted-network alternative',()=>{
 assert.deepEqual(relayCapabilities(demo),{hasTurn:true,hasTls443:true});
 assert.deepEqual(relayCapabilities([{urls:'stun:stun.example:3478'}]),{hasTurn:false,hasTls443:false});
});
test('relay-only diagnostic obtains a candidate without using a real mic/camera',async()=>{
 class FakePeer {
  constructor(config){assert.equal(config.iceTransportPolicy,'relay');this.config=config}
  createDataChannel(name){assert.equal(name,'lx-turn-diagnostic')}
  async createOffer(){return {type:'offer',sdp:'synthetic'}}
  async setLocalDescription(){queueMicrotask(()=>this.onicecandidate?.({candidate:{candidate:'candidate:1 1 udp 1 203.0.113.10 20000 typ relay'}}))}
  close(){this.closed=true}
 }
 const result=await probeTurnRelay(demo,{PeerConnection:FakePeer,timeoutMs:1000});
 assert.equal(result.reachable,true);assert.equal(result.reason,'RELAY_CANDIDATE_FOUND');
});
test('relay diagnostic never passes with STUN alone',async()=>{
 const result=await probeTurnRelay([{urls:'stun:stun.example.org'}],{PeerConnection:class {constructor(){throw Error('not reached')}}});
 assert.equal(result.reachable,false);assert.equal(result.reason,'TURN_NOT_CONFIGURED');
});
test('Cloudflare config filters browser-blocked port 53 and retains TLS/443',async()=>{
 const result=await cloudflareCredentials({id:'key_id',token:'private'}, {fetcher:async(url,options)=>{
  assert.equal(new URL(url).hostname,'rtc.live.cloudflare.com');assert.equal(JSON.parse(options.body).ttl,3600);
  return new Response(JSON.stringify({iceServers:[{urls:['turn:turn.cloudflare.com:53?transport=udp','turns:turn.cloudflare.com:443?transport=tcp'],username:'temporary',credential:'temporary-credential'}]}),{status:201});
 }});
 assert.equal(result.turnConfigured,true);assert.equal(result.expiresIn,3600);
 assert.equal(result.iceServers[0].urls.length,1);assert.match(result.iceServers[0].urls[0],/^turns:/);
 assert.doesNotMatch(JSON.stringify(result),/private/);
});
test('TURN admin: only authenticated owner can register real keys; status never reveals secrets',async()=>{
 const secrets=new Map();
 let role='owner',saved=0;
 const userClient={auth:{getUser:async()=>({data:{user:{id:'70000000-0000-4000-8000-000000000001'}}})},rpc:async(name)=>{
  if(name==='lx_admin_role')return {data:role};
  if(name==='lx_is_approved')return {data:true};
  return {data:true};
 }};
 const serviceClient={from:()=>({
  select:()=>({in:async()=>({data:[...secrets].map(([key,secret])=>({key,secret}))})}),
  upsert:async(rows)=>{for(const row of rows)secrets.set(row.key,row.secret);saved++;return {error:null}}
 })};
 const deps={env:key=>({SUPABASE_URL:'url',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server-only'})[key]||'',createClient:(_url,key)=>key==='server-only'?serviceClient:userClient,fetcher:async()=>new Response(JSON.stringify({iceServers:demo}),{status:201})};
 const request=body=>new Request('https://lx.test/rtc',{method:'POST',headers:{authorization:'Bearer valid-user'},body:JSON.stringify(body)});
 const status=await handleRtc(request({action:'status'}),deps);assert.deepEqual(await status.json(),{configured:false,provider:'cloudflare'});
 role='administrator';assert.equal((await handleRtc(request({action:'save',keyId:'turn-123',apiToken:'secret-token-long-enough'}),deps)).status,403);assert.equal(saved,0);
 role='owner';const response=await handleRtc(request({action:'save',keyId:'turn-123',apiToken:'secret-token-long-enough'}),deps);
 assert.equal(response.status,200);const payload=await response.json();assert.equal(payload.configured,true);assert.doesNotMatch(JSON.stringify(payload),/secret-token-long-enough/);assert.equal(saved,1);
 const refreshed=await handleRtc(request({action:'status'}),deps);assert.deepEqual(await refreshed.json(),{configured:true,provider:'cloudflare'});
});
