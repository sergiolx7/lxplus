import test from 'node:test';
import assert from 'node:assert/strict';
import {probeAccessHealth,accessRestriction,sessionClient} from '../src/access-health.js';
import {authErrorMessage} from '../src/auth-feedback.js';

test('project quota restriction is distinct from wrong credentials and never suggests resetting a password',async()=>{
 const health=await probeAccessHealth({url:'https://backend.invalid',key:'public-test-key',fetcher:async()=>new Response('{}',{status:402})});
 assert.equal(health.status,402);assert.equal(accessRestriction(health),true);
 const text=authErrorMessage({...health,code:'invalid_credentials'});
 assert.match(text,/equipe precisa restabelecer/);assert.doesNotMatch(text,/não conferem|recuperação de senha/);
 assert.match(authErrorMessage({message:'Service for this project is restricted due to exceed_storage_size_quota'}),/temporariamente indisponível/);
});

test('the health probe sends only the public key, bypasses cache and has a bounded request',async()=>{
 let request;
 const result=await probeAccessHealth({url:'https://backend.invalid',key:'public-test-key',fetcher:async(url,options)=>{request={url,options};return new Response('{}',{status:200})}});
 assert.equal(result.status,200);assert.equal(request.url,'https://backend.invalid/auth/v1/health');
 assert.deepEqual(request.options.headers,{apikey:'public-test-key'});assert.equal(request.options.cache,'no-store');assert.ok(request.options.signal instanceof AbortSignal);
});

test('health failure does not permanently lock out users when a gateway lacks the endpoint',async()=>{
 for(const status of [401,404,500])assert.equal((await probeAccessHealth({url:'https://backend.invalid',key:'key',fetcher:async()=>new Response('{}',{status})})).status,0);
 assert.equal((await probeAccessHealth({url:'https://backend.invalid',key:'key',fetcher:async()=>{throw Error('network unavailable')}})).status,0);
 assert.equal((await probeAccessHealth({url:'https://backend.invalid',key:'key',fetcher:async()=>new Response('{}',{status:503})})).status,503);
});

test('provider failures and local password validation have useful, sanitized messages',()=>{
 assert.match(authErrorMessage({status:503,message:'private server trace token=secret'}),/temporariamente indisponível/);
 assert.doesNotMatch(authErrorMessage({status:503,message:'private server trace token=secret'}),/secret|trace/);
 assert.match(authErrorMessage({code:'password_mismatch'}),/mesma senha nos dois campos/);
 assert.match(authErrorMessage({code:'invalid_credentials'}),/E-mail ou senha não conferem/);
});

test('a restricted project never constructs an SDK that could consume or remove the saved session',()=>{
 for(const status of [402,503]){
  let constructors=0,storageReads=0;
  const backend=sessionClient({health:{status},create:()=>{constructors++;storageReads++;return {auth:{}}}});
  assert.equal(backend.current,null);assert.equal(constructors,0);assert.equal(storageReads,0);
  const restored=backend.resume();assert.ok(restored.auth);assert.equal(backend.current,restored);
  assert.equal(backend.resume(),null);assert.equal(constructors,1);
 }
 let constructors=0;const available=sessionClient({health:{status:200},create:()=>{constructors++;return {auth:{}}}});
 assert.ok(available.current.auth);assert.equal(available.resume(),null);assert.equal(constructors,1);
});
