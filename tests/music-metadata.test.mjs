import test from 'node:test';
import assert from 'node:assert/strict';
import {readMp3Metadata} from '../src/music-metadata.js';
import {classifyLink,resolveItem} from '../src/universal-player.js';

const enc=new TextEncoder();
const u32=n=>Uint8Array.from([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
const sync=n=>Uint8Array.from([(n>>>21)&127,(n>>>14)&127,(n>>>7)&127,n&127]);
const frame=(name,data)=>new Blob([enc.encode(name),u32(data.size),new Uint8Array([0,0]),data]);
const txt=s=>new Blob([new Uint8Array([3]),enc.encode(s)]);
const mp3=async(frames,version=3)=>{
 const tag=new Blob(frames),header=new Uint8Array([73,68,51,version,0,0,...sync(tag.size)]);
 return new Blob([header,tag,new Uint8Array(512)],{type:'audio/mpeg'});
};
test('MP3 extracts the exact title, artist, album and year from ID3v2.3 tags',async()=>{
 const file=await mp3([frame('TIT2',txt('Canção Teste')),frame('TPE1',txt('Artista Teste')),frame('TALB',txt('Álbum Original')),frame('TYER',txt('2026'))]);
 const result=await readMp3Metadata(file);
 assert.equal(result.title,'Canção Teste');
 assert.equal(result.artist,'Artista Teste');
 assert.equal(result.album,'Álbum Original');
 assert.equal(result.year,'2026');
 assert.equal(result.origin,'ID3v2.3');
 assert.equal(result.cover,null);
});
test('MP3 only trusts an embedded, valid front cover; rejects back cover and fake image',async()=>{
 const front=Uint8Array.from([255,216,255,224,11,22,33]);
 const pic=(type,bytes)=>new Blob([new Uint8Array([3]),enc.encode('image/jpeg'),new Uint8Array([0,type,0]),bytes]);
 const file=await mp3([frame('APIC',pic(4,front)),frame('APIC',pic(3,front))]);
 const result=await readMp3Metadata(file);
 assert.equal(result.cover?.mime,'image/jpeg');
 assert.deepEqual(new Uint8Array(await result.cover.blob.arrayBuffer()),front);
 const fake=await mp3([frame('APIC',pic(3,enc.encode('not an image')))]);
 assert.equal((await readMp3Metadata(fake)).cover,null);
});
test('MP3 without ID3 tags leaves fields blank instead of fabricating a name or cover',async()=>{
 const result=await readMp3Metadata(new Blob([new Uint8Array(600)],{type:'audio/mpeg'}));
 assert.equal(result.title,'');assert.equal(result.artist,'');assert.equal(result.cover,null);
});
test('Recognized YouTube and Spotify links use provider embeds without extracting protected audio',async()=>{
 const youtube=classifyLink('https://youtu.be/abcdefghijk',{audio:true});
 const spotify=classifyLink('https://open.spotify.com/track/0123456789abcdefghijkl',{audio:true});
 assert.equal(youtube.kind,'iframe');assert.equal(youtube.provider,'YouTube');
 assert.equal(spotify.kind,'iframe');assert.equal(spotify.provider,'Spotify');
 const playable=await resolveItem({type:'Música',sourceUrl:'https://open.spotify.com/track/0123456789abcdefghijkl',officialEmbedded:true});
 assert.equal(playable.kind,'iframe');assert.equal(playable.provider,'Spotify');
});
