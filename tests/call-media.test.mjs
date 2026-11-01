import test from 'node:test';
import assert from 'node:assert/strict';
import {displayCaptureOptions,isolateDisplayAudio,captureAudioMessage,activateReceivedAudio} from '../src/call-media.js';

test('screen sharing never requests system audio and keeps the microphone separate',()=>{
 for(const enabled of [false,true]){
  const value=displayCaptureOptions(enabled);
  assert.equal(enabled?typeof value.audio==='object':value.audio===false,true);assert.equal(value.systemAudio,'exclude');
  if(enabled){assert.equal(value.audio.echoCancellation,false);assert.equal(value.audio.noiseSuppression,false);assert.equal(value.audio.autoGainControl,false);assert.equal(value.audio.suppressLocalAudioPlayback,false);assert.equal(value.audio.restrictOwnAudio,true)}
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
  if(enabled&&surface!=='browser')assert.match(captureAudioMessage(result,enabled),/aba|guia/i);
 }
});

test('tab capture status clearly distinguishes missing native audio permission from a working track',()=>{
 const withTrack=captureAudioMessage({surface:'browser',track:{kind:'audio'},unavailable:false},true);
 const missing=captureAudioMessage({surface:'browser',track:null,unavailable:true},true);
 assert.match(withTrack,/somente o áudio da aba selecionada/i);
 assert.match(missing,/não disponibilizou/);
 assert.match(captureAudioMessage({surface:'window',track:null,unavailable:true},true),/Esta janela não enviou áudio/);
 assert.match(captureAudioMessage({surface:'monitor',track:null,unavailable:true},true),/tela inteira não envia áudio isolado/);
});

test('remote shared audio starts on incoming track and exposes autoplay blocks safely',async()=>{
 const audio={muted:true,srcObject:{},playCalls:0,async play(){this.playCalls++}};
 assert.equal(await activateReceivedAudio(audio),'playing');assert.equal(audio.muted,false);assert.equal(audio.playCalls,1);
 audio.muted=true;audio.play=async()=>{throw Error('NotAllowedError')};
 assert.equal(await activateReceivedAudio(audio),'blocked');assert.equal(audio.muted,false);
 assert.equal(await activateReceivedAudio({muted:true}),'not-ready');
});
