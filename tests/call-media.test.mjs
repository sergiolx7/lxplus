import test from 'node:test';
import assert from 'node:assert/strict';
import {displayCaptureOptions,isolateDisplayAudio} from '../src/call-media.js';

test('screen sharing never requests system audio and keeps the microphone separate',()=>{
 for(const enabled of [false,true]){
  const value=displayCaptureOptions(enabled);
  assert.equal(value.audio,enabled);assert.equal(value.systemAudio,'exclude');
  assert.equal(value.windowAudio,enabled?'window':'exclude');assert.equal(value.monitorTypeSurfaces,'exclude');
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
 }
});
