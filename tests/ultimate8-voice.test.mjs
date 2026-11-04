import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceDetector} from '../src/voice-activity.js';
import {replaceMicrophoneTrack} from '../src/call-voice-signaling.js';
import {audioCounters,voiceDiagnostics} from '../src/call-diagnostics.js';
import {watchCallConnection} from '../src/call-health.js';

test('speech gate ignores low background noise, uses attack/release and resets on mute',()=>{
 const sample=voiceDetector();for(let t=0;t<1000;t+=80)assert.equal(sample(.005,t).speaking,false);
 assert.equal(sample(.08,1100).speaking,false);assert.equal(sample(.09,1260).speaking,true);
 assert.equal(sample(.001,1400).speaking,true);assert.equal(sample(.001,1700).speaking,false);
 sample(.08,1800);assert.equal(sample(.09,1960).speaking,true);
 assert.equal(sample(.09,2000,{enabled:false}).speaking,false);
 assert.equal(sample(NaN,2500).level,0);
});
const track=(enabled=true)=>({kind:'audio',readyState:'live',enabled,stopped:false,stop(){this.stopped=true;this.readyState='ended'}});
function input(old){let tracks=[old];return {getAudioTracks:()=>[...tracks],removeTrack:t=>{tracks=tracks.filter(x=>x!==t)},addTrack:t=>tracks.push(t)}}
test('microphone replacement preserves mute and never stops the old track until sender succeeds',async()=>{
 const old=track(false),next=track(),stream=input(old),sender={track:old,async replaceTrack(t){assert.equal(old.stopped,false);this.track=t}};
 assert.equal(await replaceMicrophoneTrack({stream,sender,next}),true);assert.equal(next.enabled,false);assert.equal(sender.track,next);assert.equal(old.stopped,true);assert.deepEqual(stream.getAudioTracks(),[next]);
});
test('failed or stale microphone replacement releases the new stream and preserves the working input',async()=>{
 const old=track(),next=track(),stream=input(old),sender={track:old,async replaceTrack(){throw Error('device unavailable')}};
 await assert.rejects(replaceMicrophoneTrack({stream,sender,next}),/device unavailable/);assert.equal(old.stopped,false);assert.equal(next.stopped,true);assert.deepEqual(stream.getAudioTracks(),[old]);
 const stale=track();assert.equal(await replaceMicrophoneTrack({stream,sender,next:stale,isCurrent:()=>false}),false);assert.equal(stale.stopped,true);assert.equal(old.stopped,false);
});
test('transport diagnostics distinguish device state, actual packet deltas and playback permission',()=>{
 const old=track(),sender={track:old},stats=new Map([['voice',{type:'outbound-rtp',kind:'audio',bytesSent:1200}],['inbound',{type:'inbound-rtp',kind:'audio',bytesReceived:2300}],['screen',{type:'outbound-rtp',kind:'video',bytesSent:999999}]]);
 const count=audioCounters(stats);assert.equal(count.sent,1200);assert.equal(count.received,2300);
 const view=voiceDiagnostics({track:old,sender,outgoing:count,incoming:count,previous:{sent:800,received:1900},playback:'blocked',capturing:true});
 assert.match(view.capture,/captada/);assert.match(view.send,/enviados/);assert.match(view.receive,/recebidos/);assert.match(view.playback,/bloqueada/);
 const stalled=voiceDiagnostics({track:old,sender,outgoing:count,incoming:count,previous:count});assert.match(stalled.send,/Aguardando/);assert.match(stalled.receive,/Aguardando/);
 old.enabled=false;assert.match(voiceDiagnostics({track:old,sender}).send,/silenciado/);
});
test('connection watchdog survives a late answer and stops after the call ends',()=>{
 let accepted=false,connected=false,current=true,expired=0;const scheduled=[];
 const stop=watchCallConnection({state:()=>({accepted,connected,current}),onTimeout:()=>expired++,schedule:fn=>{scheduled.push(fn);return scheduled.length},cancel:()=>{}});
 scheduled.shift()();assert.equal(expired,0);assert.equal(scheduled.length,1);
 accepted=true;scheduled.shift()();assert.equal(expired,1);stop();
 const canceled=[];watchCallConnection({state:()=>({accepted:true,connected:true,current}),onTimeout:()=>expired++,schedule:fn=>{canceled.push(fn);return 1},cancel:()=>{}});canceled[0]();assert.equal(expired,1);
});
