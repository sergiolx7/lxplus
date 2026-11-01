import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRtc} from '../supabase/functions/lx-rtc-config/handler.mjs';
import {cloudflareCredentials} from '../supabase/functions/lx-rtc-config/cloudflare.mjs';
import {Calls} from '../src/calls.js';
import {probeRelay} from '../src/rtc-probe.js';
const id='90000000-0000-4000-8000-000000000001';
function fixture({role='owner',approved=true,access=true,stored=[],provider=200}={}){
 const events=[],saves=[];const member={auth:{getUser:async()=>({data:{user:{id}}})},rpc:async name=>({data:name==='lx_admin_role'?role:name==='lx_is_approved'?approved:access})};
 const admin={from:()=>({select(){return this},in:async()=>({data:stored}),upsert:async rows=>{saves.push(rows);return {error:null}}})};
 const env=name=>({SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'service'})[name];
 const dependencies={env,createClient:(_url,key)=>{events.push(key);return key==='service'?admin:member},fetcher:async(url,options)=>{events.push('provider');assert.match(url,/^https:\/\/rtc\.live\.cloudflare\.com\/v1\/turn\/keys\/key-123\//);assert.equal(options.headers.Authorization,'Bearer server-only-credential');return new Response(JSON.stringify({iceServers:[{urls:['turn:turn.cloudflare.com:3478','turns:turn.cloudflare.com:443?transport=tcp','turn:turn.cloudflare.com:53'],username:'ephemeral-user',credential:'short-lived'}]}),{status:provider})}};
 const invoke=body=>handleRtc(new Request('https://lx.test/rtc',{method:'POST',headers:{authorization:'Bearer member'},body:JSON.stringify(body)}),dependencies);
 return {events,saves,invoke,dependencies};
}
test('RTC configuration is owner-only and checks approval before privileged storage access',async()=>{
 for(const options of [{role:'member'},{role:'administrator'},{approved:false}]){const f=fixture(options),response=await f.invoke({action:'save',keyId:'key-123',apiToken:'server-only-credential'});assert.equal(response.status,403);assert.deepEqual(f.events,['public']);assert.equal(f.saves.length,0)}
});
test('RTC status exposes configuration state without returning credentials',async()=>{
 const f=fixture({stored:[{key:'rtc_turn_key_id',secret:'key-123'},{key:'rtc_turn_api_token',secret:'server-only-credential'}]}),response=await f.invoke({action:'status'}),text=await response.text();assert.deepEqual(JSON.parse(text),{configured:true,provider:'cloudflare'});assert.doesNotMatch(text,/key-123|server-only|ephemeral/);assert.ok(!f.events.includes('provider'));
});
test('RTC saves an accepted key pair atomically and never returns the secret',async()=>{
 const f=fixture(),response=await f.invoke({action:'save',keyId:'key-123',apiToken:'server-only-credential'});assert.equal(response.status,200);assert.equal(f.saves.length,1);assert.equal(f.saves[0].length,2);assert.ok(f.saves[0].every(row=>row.updated_by===id));assert.doesNotMatch(await response.text(),/server-only-credential/);
});
test('RTC provider rejection does not overwrite stored credentials or expose provider details',async()=>{
 const f=fixture({provider:401}),response=await f.invoke({action:'save',keyId:'key-123',apiToken:'server-only-credential'});assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'TURN_CREDENTIALS_REJECTED'});assert.equal(f.saves.length,0);
});
test('RTC rejects an unauthorized session before reading relay secrets',async()=>{
 const f=fixture({access:false}),response=await f.invoke({kind:'call',id});assert.equal(response.status,403);assert.deepEqual(f.events,['public']);
});
test('RTC uses saved server credentials and only emits temporary relay credentials',async()=>{
 const f=fixture({stored:[{key:'rtc_turn_key_id',secret:'key-123'},{key:'rtc_turn_api_token',secret:'server-only-credential'}]}),response=await f.invoke({kind:'call',id}),text=await response.text();assert.equal(response.status,200);assert.equal(JSON.parse(text).turnConfigured,true);assert.doesNotMatch(text,/server-only-credential|:53/);assert.match(text,/short-lived/);
});
test('RTC reports missing configuration instead of pretending a relay exists',async()=>{
 const f=fixture(),response=await f.invoke({kind:'call',id}),body=await response.json();assert.equal(body.turnConfigured,false);assert.equal(body.reason,'TURN_NOT_CONFIGURED');assert.equal(f.events.includes('provider'),false);
});
test('RTC rejects malicious key paths and oversized secret requests before contacting the provider',async()=>{
 let calls=0;await assert.rejects(cloudflareCredentials({id:'../other',token:'secret'},{fetcher:async()=>calls++}),/TURN_INVALID_KEY/);assert.equal(calls,0);const f=fixture(),response=await f.invoke({action:'save',apiToken:'a'.repeat(15000)});assert.equal(response.status,413);assert.deepEqual(f.events,[]);
});
function reconnect(caller=true,config={iceServers:[{urls:['turns:relay.example:443']}],turnConfigured:true}){
 const events=[],pc={setConfiguration:value=>events.push(['config',value]),restartIce:()=>events.push(['restart'])};
 const value={pc,call:{id,caller_id:caller?'me':'other'},userId:'me',attempts:3,turnConfigured:true,restarting:false,rtcConfig:async()=>config,signal:async(kind,payload)=>events.push([kind,payload]),status:text=>events.push(['status',text])};
 return {value,events};
}
test('Manual reconnect resets the retry budget and refreshes both peers before ICE restart',async()=>{
 const f=reconnect();await Calls.prototype.restart.call(f.value,{manual:true});assert.equal(f.value.attempts,1);assert.deepEqual(f.events.slice(0,3).map(e=>e[0]),['config','ice','restart']);assert.equal(f.events[1][1].refresh,true);
});
test('A callee reloads relay settings before asking the caller to reconnect',async()=>{
 const f=reconnect(false);await Calls.prototype.restart.call(f.value,{manual:true});assert.equal(f.events[0][0],'config');assert.equal(f.events[1][1].restart,true);assert.equal(f.events[1][1].manual,true);
});
test('Temporary configuration failure keeps an existing relay and automatic retries stay bounded',async()=>{
 const f=reconnect(true,{iceServers:[],turnConfigured:false,reason:'RTC_UNAVAILABLE'});await Calls.prototype.restart.call(f.value);assert.equal(f.events.some(e=>e[0]==='restart'),false);await Calls.prototype.restart.call(f.value,{manual:true});assert.equal(f.events.some(e=>e[0]==='config'),false);assert.equal(f.value.turnConfigured,true);
});
test('A probe reports success only for an actual relay candidate and always closes its peer',async()=>{
 const original=globalThis.RTCPeerConnection;let closed=0,candidate='host';
 globalThis.RTCPeerConnection=class{constructor(options){assert.equal(options.iceTransportPolicy,'relay')}createDataChannel(){}async createOffer(){return {}}async setLocalDescription(){queueMicrotask(()=>{this.onicecandidate({candidate:{type:candidate}});this.onicecandidate({candidate:null})})}close(){closed++}};
 try{assert.equal((await probeRelay([])).relay,false);candidate='relay';assert.equal((await probeRelay([])).relay,true);assert.equal(closed,2)}finally{if(original)globalThis.RTCPeerConnection=original;else delete globalThis.RTCPeerConnection}
});
