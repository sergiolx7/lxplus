import {test} from 'node:test';
import assert from 'node:assert/strict';
import {savedSelection,withoutSavedId} from '../src/library-view.js';
import {catalogSort} from '../src/catalog-sort.js';
import {catalogPageTypes} from '../src/catalog-filters.js';
import {displayScenes,normalizeDisplay} from '../src/display-preferences.js';
import {playlistDetails} from '../src/playlist-details.js';
import {watchInputDevices} from '../src/call-devices.js';

const rows=[{id:1,title:'Órbita',type:'Filme',genre:'Ação',year:2022},{id:2,title:'Aurora',type:'Dorama',year:2026},{id:3,title:'Horizonte',type:'Livro',author:'João',year:2024}];
test('saved library composes type and accent-insensitive metadata search without changing source records',()=>{
 assert.deepEqual(savedSelection(rows,{category:'Filmes',term:'acao'}).map(i=>i.id),[1]);
 assert.deepEqual(savedSelection(rows,{term:'joao'}).map(i=>i.id),[3]);
 assert.deepEqual(savedSelection(rows,{sort:'saved',ids:[3,1,2]}).map(i=>i.id),[3,1,2]);
 assert.deepEqual(savedSelection(rows,{sort:'title'}).map(i=>i.id),[2,3,1]);
 assert.deepEqual(savedSelection(rows,{sort:'year'}).map(i=>i.id),[2,3,1]);
 assert.deepEqual(rows.map(i=>i.id),[1,2,3]);
});
test('removing a saved title preserves unrelated legacy references and accepts mixed numeric identities',()=>{
 const before=['legacy-unknown',1,'1',2];
 assert.deepEqual(withoutSavedId(before,'1'),['legacy-unknown',2]);
 assert.deepEqual(before,['legacy-unknown',1,'1',2]);
 assert.deepEqual(withoutSavedId(null,1),[]);
});
test('catalog sorting accepts an allowlist and Animes is a separate server-filtered destination',()=>{
 assert.equal(catalogSort('title').column,'payload->>title');
 assert.equal(catalogSort('year').ascending,false);
 assert.equal(catalogSort('id;drop table lx_catalog').column,'updated_at');
 assert.deepEqual(catalogPageTypes('Animes'),['Anime']);
 assert.deepEqual(catalogPageTypes('Ao vivo'),['Ao Vivo']);
});
test('quick environments preserve comfort and motion settings while changing only appearance',()=>{
 for(const scene of displayScenes){
  const p=normalizeDisplay({...normalizeDisplay(),performance:'light',reduceMotion:true,highContrast:true,...scene.patch});
  assert.equal(p.performance,'light');assert.equal(p.reduceMotion,true);assert.equal(p.highContrast,true);
  assert.equal(p.theme,scene.patch.theme);assert.equal(p.ledIntensity,scene.patch.ledIntensity);
 }
});
test('microphone device monitoring follows the current call and releases event listeners on cleanup',()=>{
 const devices=new EventTarget(),track=new EventTarget();let changes=0,lost=0,current=true;
 const stop=watchInputDevices({devices,track,isCurrent:()=>current,onChange:()=>changes++,onLost:()=>lost++});
 devices.dispatchEvent(new Event('devicechange'));track.dispatchEvent(new Event('ended'));
 assert.equal(changes,1);assert.equal(lost,1);
 current=false;devices.dispatchEvent(new Event('devicechange'));track.dispatchEvent(new Event('ended'));
 assert.equal(changes,1);assert.equal(lost,1);
 current=true;stop();devices.dispatchEvent(new Event('devicechange'));track.dispatchEvent(new Event('ended'));
 assert.equal(changes,1);assert.equal(lost,1);
});

test('playlist editing normalizes valid names and rejects invalid names, descriptions and visibility',()=>{
 assert.deepEqual(playlistDetails({name:'  Meu universo  ',description:'  Seleção pessoal. ',visibility:'private'}),{name:'Meu universo',description:'Seleção pessoal.',visibility:'private'});
 for(const value of [{name:' '},{name:'x'.repeat(101)},{name:'a',description:'x'.repeat(501),visibility:'public'},{name:'a',visibility:'everyone'}])assert.throws(()=>playlistDetails(value));
});
