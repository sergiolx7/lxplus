import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nexusArtwork,musicFeatureSelection,nexusMusicFeature,resumeProgress} from '../src/nexus-ui.js';

const tracks=[{id:1,type:'Música',title:'Primeira',cover:'https://example.com/one.jpg',duration:120},{id:2,type:'Música',title:'Segunda',cover:'https://example.com/two.jpg',featured:true},{id:3,type:'Filme',title:'Não é música'}];
test('music discovery follows real listening history without changing the library or player queue',()=>{
 const result=musicFeatureSelection(tracks,{1:'2026-11-05',2:'2026-11-04',999:'2026-11-06'});
 assert.equal(result.featured.id,1);
 assert.deepEqual(result.selection.map(x=>x.id),[2]);
 assert.deepEqual(tracks.map(x=>x.id),[1,2,3]);
 assert.equal(musicFeatureSelection(tracks).featured.id,2);
 assert.equal(musicFeatureSelection([]).featured,null);
});
test('discovery uses only supplied tracks, escapes their metadata and never claims to be the real queue',()=>{
 const html=nexusMusicFeature([{id:4,type:'Música',title:'<script>alert(1)</script>',artist:'<img src=x onerror=alert(1)>',cover:'javascript:alert(1)'}]);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>|onerror=alert\(1\)>|src="javascript:/);
 assert.doesNotMatch(html,/A seguir|data-track="(?:1|2|3)"/);
 assert.match(html,/data-track="4"/);
 assert.doesNotMatch(nexusMusicFeature([]),/data-track=/);
});
test('artwork rejects embedded credentials and active URL schemes while accepting same-origin development media',()=>{
 globalThis.location={origin:'http://localhost:4173'};
 for(const value of ['',null,'javascript:alert(1)','data:image/png;base64,eA==','https://user:pass@example.org/art.jpg','http://external.example/art.jpg'])assert.equal(nexusArtwork(value),'');
 assert.equal(nexusArtwork('./assets/art.jpg'),'http://localhost:4173/assets/art.jpg');
 assert.equal(nexusArtwork('https://example.org/art.jpg'),'https://example.org/art.jpg');
});
test('resume indicator uses verified finite history and never overflows for stale or corrupt durations',()=>{
 assert.deepEqual(resumeProgress({position:120,duration:500}),{percent:24,remaining:7});
 assert.deepEqual(resumeProgress({position:501,duration:500}),{percent:100,remaining:0});
 for(const value of [null,{}, {position:0,duration:2},{position:3,duration:0},{position:Infinity,duration:20},{position:20,duration:NaN}])assert.equal(resumeProgress(value),null);
});
