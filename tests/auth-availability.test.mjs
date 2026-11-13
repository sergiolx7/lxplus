import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probeAuthAvailability,authServiceBlocked} from '../src/auth-availability.js';
import {authErrorMessage,authServiceState} from '../src/auth-feedback.js';

test('a provider restriction is reported as a service outage instead of a password error',()=>{
 for(const error of [{status:402},{code:'service_restricted'},{message:'Service for this project is restricted due to exceed_storage_size_quota'}]){
  assert.equal(authServiceState(error),'restricted');
  assert.match(authErrorMessage(error),/temporariamente indisponível/);
  assert.doesNotMatch(authErrorMessage(error),/quota|storage|upgrade|supabase|E-mail ou senha não conferem/i);
 }
 assert.equal(authServiceState({status:400,code:'invalid_credentials'}),null);
 assert.match(authErrorMessage({status:400,code:'invalid_credentials'}),/E-mail ou senha/);
});

test('availability probes are read-only and use the public API key without any user credentials',async()=>{
 const calls=[];
 const state=await probeAuthAvailability({url:'https://backend.example.invalid',key:'public-key',fetcher:async(url,options)=>{
  calls.push({url,options});return new Response('{}',{status:402});
 }});
 assert.equal(state,'restricted');assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://backend.example.invalid/auth/v1/health');
 assert.equal(calls[0].options.headers.apikey,'public-key');
 assert.equal(calls[0].options.body,undefined);assert.equal(calls[0].options.method,undefined);
 assert.equal(calls[0].options.headers.Authorization,undefined);
});

test('a successful manual check re-enables authentication after a restriction',async()=>{
 let status=402;
 const fetcher=async()=>new Response('{}',{status});
 assert.ok(authServiceBlocked(await probeAuthAvailability({fetcher})));
 status=200;
 assert.equal(await probeAuthAvailability({fetcher}),'ready');
 assert.equal(authServiceBlocked('ready'),false);
});

test('network and ambiguous health errors leave the normal login path available',async()=>{
 for(const fetcher of [async()=>{throw Error('offline')},async()=>new Response('{}',{status:401})]){
  const state=await probeAuthAvailability({fetcher});
  assert.equal(state,'unknown');assert.equal(authServiceBlocked(state),false);
 }
 assert.equal(await probeAuthAvailability({fetcher:async()=>new Response('{}',{status:503})}),'unavailable');
});

test('availability checks abort a hung request without polling the provider',async()=>{
 let calls=0;
 const state=await probeAuthAvailability({timeout:10,fetcher:async(_url,{signal})=>{
  calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));
 }});
 assert.equal(state,'unknown');assert.equal(calls,1);
});
