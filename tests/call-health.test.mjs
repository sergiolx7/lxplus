import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {candidateKind,callHealth,flushIceQueue} from '../src/call-health.js';

test('ICE diagnostic distinguishes direct/STUN traffic from actual relay; no IP leaked',()=>{
 const host={candidate:'candidate:842163049 1 udp 1677729535 192.0.2.101 42101 typ host generation 0'};
 const stun={candidate:'candidate:23 1 udp 1694498815 203.0.113.70 55991 typ srflx raddr 10.10.4.2 rport 55991'};
 assert.equal(candidateKind(host),'host');
 assert.equal(candidateKind(stun),'srflx');
 assert.equal(candidateKind({type:'relay',candidate:'privateCandidateNeverDisplayed'}),'relay');
 assert.equal(candidateKind({candidate:'invalid'}),'unknown');
 const fail=callHealth({state:'failed',ice:'failed',signaling:'stable',turnConfigured:false,types:['host','srflx'],remoteAnswered:true});
 assert.equal(fail.level,'blocked');
 assert.match(fail.text,/TURN/);
 assert.doesNotMatch(fail.text,/192\.0\.2|203\.0\.113|candidate:/);
});
test('active relay failure offers a real retry, never incorrectly claims connection',()=>{
 const status=callHealth({state:'failed',ice:'failed',turnConfigured:true,types:['relay'],remoteAnswered:true});
 assert.equal(status.level,'retry');
 assert.match(status.text,/Reconectar/);
 assert.equal(callHealth({state:'connected',ice:'connected'}).level,'good');
});
test('ICE pending before signal answer has an actionable status',()=>{
 assert.match(callHealth({signaling:'have-local-offer'}).text,/resposta/);
 assert.match(callHealth({turnConfigured:false,types:['host','srflx'],remoteAnswered:true}).text,/TURN/);
});
test('stale ICE candidates cannot prevent later candidates or SDP answer',async()=>{
 const added=[];
 const pc={signalingState:'stable',async addIceCandidate(c){if(c.bad)throw Error('old ICE generation');added.push(c.id)}};
 const result=await flushIceQueue(pc,[{bad:true},{id:2},{id:3}]);
 assert.deepEqual(result,{added:2,ignored:1});
 assert.deepEqual(added,[2,3]);
});
test('call placeholder exposes an explicit retry and renders stateful network diagnosis',()=>{
 const view=readFileSync(new URL('../src/call-view.js',import.meta.url),'utf8');
 const calls=readFileSync(new URL('../src/calls.js',import.meta.url),'utf8');
 assert.match(view,/id="callNetworkStatus"/);
 assert.match(view,/Reconectar chamada/);
 assert.match(calls,/pc\.oniceconnectionstatechange/);
 assert.match(calls,/flushIceQueue\(pc,this\.ice\.splice\(0\)\)/);
 assert.match(calls,/this\.updateNetworkStatus\(\)/);
});
