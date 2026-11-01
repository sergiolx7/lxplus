import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {handleProfileMedia} from '../supabase/functions/lx-profile-media/handler.mjs';
const userId='80000000-0000-4000-8000-000000000001';
async function fixture(premium,publish=true){
 const events=[],filters=[],memberQuery={select(){return this},eq(){return this},maybeSingle:async()=>({data:{approved:true,is_premium:premium}})},member={auth:{getUser:async()=>({data:{user:{id:userId}}})},from:()=>memberQuery};
 const service={storage:{from:()=>({upload:async(path,_file,options)=>{events.push(['upload',path,options.contentType]);return {}},getPublicUrl:path=>({data:{publicUrl:'https://assets.test/'+path}}),remove:async paths=>{events.push(['remove',paths]);return {}}})},from:()=>({update(value){events.push(['update',value]);return this},eq(key,value){filters.push([key,value]);return this},select(){return this},maybeSingle:async()=>({data:publish?{user_id:userId}:null})})};
 const deps={env:key=>key==='SUPABASE_SERVICE_ROLE_KEY'?'service':'public',createClient:(_url,key)=>{if(key==='service'){events.push(['service']);return service}return member}};
 const body=new FormData();body.set('kind','banner');body.set('file',new Blob([await readFile('tests/fixtures/profile-test.gif')],{type:'image/jpeg'}),'forged.jpg');
 const request=new Request('https://lx.test/profile-media',{method:'POST',headers:{authorization:'Bearer member'},body});
 return {response:await handleProfileMedia(request,deps),events,filters};
}
test('profile upload checks the current entitlement before creating a privileged storage client',async()=>{
 const value=await fixture(false);assert.equal(value.response.status,403);assert.deepEqual(value.events,[]);
 assert.equal((await value.response.json()).error,'PREMIUM_BANNER_REQUIRED');
});
test('profile upload uses verified bytes and the authenticated path, and rechecks entitlement before publishing',async()=>{
 const value=await fixture(true);assert.equal(value.response.status,200);
 const uploaded=value.events.find(e=>e[0]==='upload');assert.match(uploaded[1],new RegExp('^profiles/'+userId+'/banner-[a-f0-9-]+\\.gif$'));assert.equal(uploaded[2],'image/gif');
 assert.deepEqual(value.filters,[['user_id',userId],['approved',true],['is_premium',true]]);
 const raced=await fixture(true,false);assert.equal(raced.response.status,409);assert.deepEqual(raced.events.find(e=>e[0]==='remove')[1],[raced.events.find(e=>e[0]==='upload')[1]]);
});
