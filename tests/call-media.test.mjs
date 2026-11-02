import test from 'node:test';
import assert from 'node:assert/strict';
import {displayCaptureOptions,isolateDisplayAudio,captureAudioMessage,activateReceivedAudio,audioSharingState,setRemoteScreenAudio} from '../src/call-media.js';

test('screen sharing never requests system audio and keeps the microphone separate',()=>{
 for(const enabled of [false,true]){
  const value=displayCaptureOptions(enabled);
  assert.equal(value.audio,enabled);assert.equal(value.systemAudio,'exclude');
  assert.equal(value.windowAudio,'exclude');assert.equal(value.monitorTypeSurfaces,'exclude');
  assert.equal(value.video.displaySurface,'browser');assert.equal(value.selfBrowserSurface,'exclude');assert.equal(value.preferCurrentTab,false);
  assert.equal(value.surfaceSwitching,'exclude');assert.equal(value.video.frameRate.max,30);
 }
});
test('only the selected tab audio is forwarded; unverified window and screen audio stop immediately',()=>{
 for(const surface of ['browser','window','monitor',undefined])for(const enabled of [false,true]){
  const audio=[{stopped:false,stop(){this.stopped=true}},{stopped:false,stop(){this.stopped=true}}],removed=[];
  const stream={getVideoTracks:()=>[{getSettings:()=>({displaySurface:surface})}],getAudioTracks:()=>audio,removeTrack:t=>removed.push(t)};
  const result=isolateDisplayAudio(stream,enabled),allowed=enabled&&surface==='browser';
  assert.equal(result.track,allowed?audio[0]:null);assert.equal(audio[0].stopped,!allowed);
  assert.equal(audio[1].stopped,true);assert.equal(removed.length,allowed?1:2);
  assert.equal(result.unavailable,enabled&&!allowed);
  if(enabled&&surface!=='browser')assert.match(captureAudioMessage(result,enabled),/janela|tela inteira/i);
 }
});

test('tab capture status clearly distinguishes missing native audio permission from a working track',()=>{
 const withTrack=captureAudioMessage({surface:'browser',track:{kind:'audio'},unavailable:false},true);
 const missing=captureAudioMessage({surface:'browser',track:null,unavailable:true},true);
 assert.match(withTrack,/somente o áudio da aba selecionada/i);
 assert.match(missing,/não disponibilizou/);
 assert.match(captureAudioMessage({surface:'window',track:null,unavailable:true},true),/Esta janela não enviou áudio/);
 assert.match(captureAudioMessage({surface:'monitor',track:null,unavailable:true},true),/tela inteira compartilhada sem capturar/i);
});

test('remote shared audio starts on incoming track and exposes autoplay blocks safely',async()=>{
 const audio={muted:true,srcObject:{},playCalls:0,async play(){this.playCalls++}};
 assert.equal(await activateReceivedAudio(audio),'playing');assert.equal(audio.muted,false);assert.equal(audio.playCalls,1);
 audio.muted=true;audio.play=async()=>{throw Error('NotAllowedError')};
 assert.equal(await activateReceivedAudio(audio),'blocked');assert.equal(audio.muted,false);
 assert.equal(await activateReceivedAudio({muted:true}),'not-ready');
});

test('send and receive audio controls are independently enabled without mixing the system',()=>{
 const capture=displayCaptureOptions(true);
 assert.equal(capture.audio,true);
 assert.equal(capture.systemAudio,'exclude');assert.equal(capture.windowAudio,'exclude');
 const element={srcObject:{},muted:true};
 assert.equal(setRemoteScreenAudio(element,true),true);assert.equal(element.muted,false);
 assert.equal(setRemoteScreenAudio(element,false),false);assert.equal(element.muted,true);
 assert.equal(audioSharingState({requested:true,surface:'browser',track:{readyState:'live',muted:false},listenerEnabled:false}).kind,'muted');
 assert.equal(audioSharingState({requested:true,surface:'browser',track:{readyState:'live',muted:false},listenerEnabled:true}).kind,'ready');
 assert.equal(audioSharingState({requested:true,surface:'browser',track:null}).kind,'missing');
 assert.equal(audioSharingState({requested:true,surface:'window',track:{readyState:'live',muted:false}}).kind,'ready');
});

test('call UI exposes both transmitter and receiver controls enabled by default',async()=>{
 const {readFileSync}=await import('node:fs');
 const view=readFileSync(new URL('../src/call-view.js',import.meta.url),'utf8');
 const calls=readFileSync(new URL('../src/calls.js',import.meta.url),'utf8');
 assert.match(view,/data-call-screen-audio checked/);
 assert.match(view,/data-call-listen-screen checked/);
 assert.match(calls,/this\.listenScreenAudio=e\.target\.checked/);
 assert.match(calls,/this\.remoteScreenAudioDeclared=media\.screenAudio/);
 assert.match(calls,/this\.shareAudioSender\.replaceTrack\(audio\.track\)/);
});

test('share source selection supports games, apps and full desktop without automatic system sound',()=>{
 const game=displayCaptureOptions(true,{width:1920,height:1080,fps:60},'window');
 assert.equal(game.video.displaySurface,'window');
 assert.equal(game.windowAudio,'window');
 assert.equal(game.systemAudio,'exclude');
 assert.equal(game.audio,true);
 assert.equal(game.video.frameRate.max,60);
 const screen=displayCaptureOptions(true,undefined,'monitor');
 assert.equal(screen.video.displaySurface,'monitor');
 assert.equal(screen.audio,false);
 assert.equal(screen.systemAudio,'exclude');
 assert.equal(screen.monitorTypeSurfaces,'include');
 const fallback=displayCaptureOptions(true,undefined,'invalid');
 assert.equal(fallback.video.displaySurface,'browser');
});

test('only explicitly requested isolated window/game audio can be forwarded',()=>{
 for(const actual of ['browser','window','monitor']){
  for(const desired of ['browser','window','monitor']){
   const track={readyState:'live',stopCalled:false,stop(){this.stopCalled=true}};
   const stream={getVideoTracks:()=>[{getSettings:()=>({displaySurface:actual})}],getAudioTracks:()=>[track],removeTrack:()=>{}};
   const result=isolateDisplayAudio(stream,true,desired);
   const allowed=actual===desired&&actual!=='monitor';
   assert.equal(!!result.track,allowed);
   assert.equal(track.stopCalled,!allowed);
  }
 }
});

test('new call UI exposes real game/window/desktop capture and mic repair controls',async()=>{
 const {readFileSync}=await import('node:fs');
 const view=readFileSync(new URL('../src/call-view.js',import.meta.url),'utf8');
 const calls=readFileSync(new URL('../src/calls.js',import.meta.url),'utf8');
 assert.match(view,/data-call-screen-kind/);
 for(const kind of ['window','monitor','browser'])assert.ok(view.includes('value="'+kind+'"'));
 assert.match(view,/data-call-mic-repair/);
 assert.match(calls,/async repairMicrophone\(/);
 assert.match(calls,/replaceTrack\(next\)/);
 assert.match(calls,/displayCaptureOptions\(withAudio,[^;]+,kind\)/);
});
