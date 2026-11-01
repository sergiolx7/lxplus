import test from 'node:test';
import assert from 'node:assert/strict';
import {fastRtcConfig,shouldUpgradeTurn} from '../src/rtc-fast.js';

const stun={iceServers:[{urls:'stun:stun.example.org:3478'}],turnConfigured:false};
const relay={iceServers:[{urls:'turns:turn.example.org:443?transport=tcp',username:'short-lived',credential:'short-lived'}],turnConfigured:true};

test('slow TURN provider does not delay the first WebRTC negotiation',async()=>{
 let resolve;
 const load=()=>new Promise(ok=>{resolve=ok});
 const started=Date.now();
 const config=await fastRtcConfig(load,stun,20);
 assert.equal(config.provisional,true);
 assert.equal(config.initial,stun);
 assert.ok(Date.now()-started<180,'should not wait for slow credential endpoint');
 resolve(relay);
 assert.equal(await config.ready,relay);
 assert.equal(shouldUpgradeTurn(config.initial.turnConfigured,await config.ready),true);
});

test('fast TURN response is included in the original peer connection',async()=>{
 const cfg=await fastRtcConfig(async()=>relay,stun,100);
 assert.equal(cfg.initial,relay);
 assert.equal(cfg.provisional,false);
 assert.equal(shouldUpgradeTurn(cfg.initial.turnConfigured,relay),false);
});

test('fallback only upgrades when a real TURN transport and credentials endpoint are available',()=>{
 assert.equal(shouldUpgradeTurn(false,stun),false);
 assert.equal(shouldUpgradeTurn(false,{iceServers:stun.iceServers,turnConfigured:true}),false);
 assert.equal(shouldUpgradeTurn(false,relay),true);
 assert.equal(shouldUpgradeTurn(true,relay),false);
 assert.equal(shouldUpgradeTurn(false,{iceServers:[],turnConfigured:true}),false);
});
