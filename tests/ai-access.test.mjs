import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleAi,localRecommendations} from '../supabase/functions/lx-ai/handler.mjs';
function fixture({authenticated=true,approved=true,error=false}={}){
 const calls=[];const query={select(v){calls.push(['select',v]);return this},eq(k,v){calls.push(['eq',k,v]);return this},order(){return this},limit(n){calls.push(['limit',n]);return Promise.resolve({error:error?{}:null,data:[{id:1,payload:{title:'Jazz local',type:'Música',genre:'Jazz'}}]})}};
 return {calls,deps:{env:key=>'test-'+key,createClient:(url,key,opts)=>{calls.push(['client',url,key,opts]);return{auth:{getUser:async()=>({data:{user:authenticated?{id:'self'}:null}})},rpc:async name=>{calls.push(['rpc',name]);return {data:approved}},from:name=>{calls.push(['from',name]);return query}}}}};
}
const request=message=>new Request('https://lx.example/ai',{method:'POST',headers:{authorization:'Bearer test-user-token'},body:JSON.stringify({message})});
test('AI rejects missing JWT, invalid session and unapproved accounts before reading catalog',async()=>{
 const missing=fixture();assert.equal((await handleAi(new Request('https://lx.example/ai',{method:'POST'}),missing.deps)).status,401);assert.equal(missing.calls.length,0);
 for(const options of [{authenticated:false},{approved:false}]){const f=fixture(options);const result=await handleAi(request('jazz'),f.deps);assert.ok([401,403].includes(result.status));assert.equal(f.calls.some(x=>x[0]==='from'),false)}
});
test('AI reads only published rows with the caller JWT and never asks for a service key or private profile',async()=>{
 const f=fixture(),result=await handleAi(request('quero ouvir jazz'),f.deps),body=await result.json();assert.equal(body.recommendations[0].id,'1');assert.equal(body.protocol,2);assert.ok(f.calls.some(x=>x[0]==='eq'&&x[1]==='published'&&x[2]===true));assert.equal(f.calls[0][2],'test-SUPABASE_ANON_KEY');assert.equal(f.calls[0][3].global.headers.Authorization,'Bearer test-user-token');assert.equal(f.calls.filter(x=>x[0]==='from').length,1);
});
test('AI cannot invent an available title or reveal provider errors',async()=>{
 assert.deepEqual(localRecommendations('Avatar',[{id:'1',title:'Jazz'}]),[]);const f=fixture({error:true}),r=await handleAi(request('jazz'),f.deps);assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'CATALOG_UNAVAILABLE'});
});
test('online AI requires explicit opt-in and refuses exhausted quota before calling the provider',async()=>{
 let upstreamCalls=0;
 const user={auth:{getUser:async()=>({data:{user:{id:'self'}}})},rpc:async()=>({data:true}),from:()=>({select(){return this},eq(){return this},order(){return this},limit:async()=>({data:[]})})};
 const admin={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{secret:'test-server-only'}})}),rpc:async()=>({data:false})};
 const deps={env:key=>key==='SUPABASE_SERVICE_ROLE_KEY'?'server-key':'public',createClient:(_url,key)=>key==='server-key'?admin:user,upstreamFetch:async()=>{upstreamCalls++;throw Error('should not be called')}};
 const r=await handleAi(new Request('https://lx.example/ai',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({message:'jazz',useOnline:true})}),deps);assert.equal(r.status,429);assert.equal(upstreamCalls,0);
});
test('online AI filters unknown IDs and sends only the explicit question and authorized context',async()=>{
 let sent=null;
 const user={auth:{getUser:async()=>({data:{user:{id:'self'}}})},rpc:async()=>({data:true}),from:()=>({select(){return this},eq(){return this},order(){return this},limit:async()=>({data:[{id:1,payload:{title:'Jazz real',genre:'Jazz',type:'Música'}}]})})};
 const admin={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{secret:'test-server-secret'}})}),rpc:async()=>({data:true})};
 const deps={env:key=>key==='SUPABASE_SERVICE_ROLE_KEY'?'server-key':'public',createClient:(_url,key)=>key==='server-key'?admin:user,upstreamFetch:async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({output_text:JSON.stringify({intent:'recommend',answer:'An invented title is available',recommended_ids:['999','1']})}),{status:200})}};
 const req=new Request('https://lx.example/ai',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({message:'jazz',useOnline:true,profile:'private profile',history:[{content:'private chat'}]})});
 const body=await(await handleAi(req,deps)).json();assert.deepEqual(body.recommendations.map(x=>x.id),['1']);assert.doesNotMatch(body.answer,/invented/);assert.equal(sent.store,false);assert.deepEqual(sent.input,[{role:'user',content:'jazz'}]);assert.doesNotMatch(JSON.stringify(sent),/private profile|private chat/);assert.doesNotMatch(JSON.stringify(body),/test-server-secret/);
});
