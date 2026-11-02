import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindAnsweringMicrophone,outgoingVoiceState} from '../src/call-voice-signaling.js';
import {callView} from '../src/call-view.js';

test('answerer binds actual microphone to FIRST offered audio transceiver, not screen audio',async()=>{
 const mic={kind:'audio',readyState:'live',enabled:true,muted:false};
 const first={track:null,async replaceTrack(track){this.track=track}};
 const screen={track:null,async replaceTrack(track){this.track=track}};
 const transceivers=[
  {receiver:{track:{kind:'audio'}},direction:'recvonly',sender:first},
  {receiver:{track:{kind:'video'}},direction:'recvonly',sender:{}},
  {receiver:{track:{kind:'audio'}},direction:'recvonly',sender:screen}
 ];
 const sender=await bindAnsweringMicrophone(transceivers,{getAudioTracks:()=>[mic]});
 assert.equal(sender,first);
 assert.equal(first.track,mic);
 assert.equal(screen.track,null);
 assert.equal(transceivers[0].direction,'sendrecv');
 assert.equal(outgoingVoiceState(sender,mic),'sending');
});

test('answerer fails visibly rather than reporting connected with no microphone',async()=>{
 const trans=[{receiver:{track:{kind:'audio'}},sender:{async replaceTrack(){}}}];
 await assert.rejects(()=>bindAnsweringMicrophone(trans,{getAudioTracks:()=>[]}),/Não foi possível enviar/);
 await assert.rejects(()=>bindAnsweringMicrophone([],{getAudioTracks:()=>[{readyState:'live'}]}),/Não foi possível enviar/);
 assert.equal(outgoingVoiceState(null,{readyState:'live',enabled:true}),'not-sending');
 assert.equal(outgoingVoiceState({track:null},{readyState:'live',enabled:true}),'not-sending');
 assert.equal(outgoingVoiceState(null,{readyState:'ended'}),'device-lost');
 const track={readyState:'live',enabled:false,muted:false};
 assert.equal(outgoingVoiceState({track},track),'muted');
});

test('one-way audio regression: callee waits for incoming offer and uses sender from offer',()=>{
 const text=readFileSync(new URL('../src/calls.js',import.meta.url),'utf8');
 assert.match(text,/if\(caller\)this\.micSender=pc\.addTrack\(mic,this\.local\)/);
 assert.match(text,/this\.micSender=await bindAnsweringMicrophone\(transceivers,this\.local\)/);
 assert.match(text,/this\.micSender=sender\|\|null/);
 assert.match(text,/await pc\.setLocalDescription\(await pc\.createAnswer\(\)\)/);
});

test('call interface keeps primary controls minimal and advanced controls expandable',()=>{
 const page=callView({name:'Amigo',user_id:'friend1'},'video',false);
 for(const key of ['data-call-mic','data-call-camera','data-call-screen','data-call-end'])assert.ok(page.includes(key));
 assert.match(page,/<details class="lx-call-advanced"/);
 assert.match(page,/<details class="lx-call-more"/);
 assert.match(page,/<details class="lx-call-share-options"/);
 const primary=page.match(/<div class="call-control-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.doesNotMatch(primary,/data-call-mic-repair|data-call-retry|data-call-share-switch/);
 assert.match(page,/data-call-mic-repair/);
 assert.match(page,/data-call-mic-device/);
});
test('current site retires legacy community style layers',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/lx-community-v6-clean\.css/);
 assert.doesNotMatch(html,/lx-community-premium4\.css|lx-community-premium5\.css/);
});
