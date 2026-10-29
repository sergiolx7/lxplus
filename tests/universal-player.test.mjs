import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyLink,resolveItem} from '../src/universal-player.js';

test('Google Drive supports file, open and uc links',()=>{
 for(const link of [
  'https://drive.google.com/file/d/1Abcde1234567890xyz/view?usp=sharing',
  'https://drive.google.com/open?id=1Abcde1234567890xyz',
  'https://drive.google.com/uc?export=download&id=1Abcde1234567890xyz'
 ]){
  const entry=classifyLink(link);
  assert.equal(entry.kind,'iframe');assert.equal(entry.provider,'Google Drive');
  assert.equal(entry.url,'https://drive.google.com/file/d/1Abcde1234567890xyz/preview');
 }
});
test('Google Docs text files are external, not playable',()=>{
 assert.equal(classifyLink('https://docs.google.com/document/d/1Abcde1234567890xyz/edit').kind,'external');
});
test('YouTube watch, shorts and short links generate privacy-enhanced embeds',()=>{
 for(const link of [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ?t=45',
  'https://youtube.com/shorts/dQw4w9WgXcQ'
 ]){
  const r=classifyLink(link);
  assert.equal(r.kind,'iframe');assert.match(r.url,/youtube-nocookie.com\/embed\/dQw4w9WgXcQ/);
 }
});
test('Vimeo embeds are limited to recognized numeric video IDs',()=>{
 assert.equal(classifyLink('https://vimeo.com/123456789').url,'https://player.vimeo.com/video/123456789');
});
test('direct media, HLS, and DASH identify correctly with query strings',()=>{
 const inputs=[
  ['https://cdn.example.org/videos/movie.mp4?token=xyz','video'],
  ['https://cdn.example.org/music/song.m4a','audio'],
  ['https://cdn.example.org/list/master.m3u8?Expires=123','hls'],
  ['https://cdn.example.org/stream/manifest.mpd','dash']
 ];
 for(const [link,type] of inputs)assert.equal(classifyLink(link).kind,type);
});
test('disallow malicious or unsupported URL schemes',()=>{
 for(const input of [
  'javascript:alert(1)',
  'file:///etc/passwd',
  'http://cdn.example.org/movie.mp4',
  'https://user:password@example.org/movie.mp4',
  'not-a-url'
 ])assert.equal(classifyLink(input).kind,'invalid');
});
test('Google Photos is not falsely treated as direct media',()=>{
 assert.equal(classifyLink('https://photos.app.goo.gl/Xy1234567890').kind,'external');
});
test('catalog resolves authorized YouTube and Drive links',async()=>{
 const youtube=await resolveItem({type:'Filme',authorizedVideoUrl:'https://youtube.com/watch?v=dQw4w9WgXcQ'});
 assert.equal(youtube.kind,'iframe');
 const drive=await resolveItem({type:'Filme',sourceVerified:true,sourceUrl:'https://drive.google.com/file/d/1Abcde1234567890xyz/view'});
 assert.equal(drive.provider,'Google Drive');
});
test('unauthorized arbitrary catalog source is not played',async()=>{
 const r=await resolveItem({type:'Filme',sourceUrl:'https://example.org/video.mp4'});
 assert.equal(r.kind,'unavailable');
});
test('storage key must require signing callback',async()=>{
 const r=await resolveItem({type:'Filme',nativeAsset:'cloud:media/example/movie.mp4'});
 assert.equal(r.kind,'unavailable');
});
