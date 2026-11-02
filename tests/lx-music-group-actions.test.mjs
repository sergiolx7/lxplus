import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findMusicActionTrack} from '../src/music-library.js';

const library=[{id:1,title:'Faixa da página geral'},{id:2,title:'Outra faixa'}];
const album=[{id:101,title:'Faixa do álbum'},{id:102,title:'Faixa exclusiva da seleção'}];

test('ações do álbum ou artista encontram músicas fora da primeira página geral',()=>{
 assert.equal(findMusicActionTrack('101',library,album),album[0]);
 assert.equal(findMusicActionTrack(102,library,album),album[1]);
 assert.equal(findMusicActionTrack(1,library,album),null,'não usa faixa de outra página quando um grupo está aberto');
});

test('ações da biblioteca e da playlist continuam usando as faixas visíveis',()=>{
 assert.equal(findMusicActionTrack('2',library),library[1]);
 assert.equal(findMusicActionTrack('2',library,null),library[1]);
 assert.equal(findMusicActionTrack('2',library,[]),null);
});

test('música ausente ou lista inválida não envia faixa indefinida à fila ou à janela de letras',()=>{
 assert.equal(findMusicActionTrack('999',library,album),null);
 assert.equal(findMusicActionTrack('',library,album),null);
 assert.equal(findMusicActionTrack(undefined,library,album),null);
 assert.equal(findMusicActionTrack(10,null),null);
});

test('ações de reproduzir, adicionar à fila e abrir letra usam a seleção atual e protegem ausências',()=>{
 const source=readFileSync(new URL('../src/modules/music.js',import.meta.url),'utf8');
 assert.match(source,/function actionTrack\(id\)\{return findMusicActionTrack\(id,items,groupSelection\?groupTracks:null\)\}/);
 assert.match(source,/await play\(actionTrack\(b\.dataset\.track\),list\)/);
 assert.match(source,/const item=actionTrack\(b\.dataset\.enqueue\);if\(!item\)/);
 assert.match(source,/const item=actionTrack\(b\.dataset\.lyrics\);if\(!item\)/);
 assert.doesNotMatch(source,/const item=items\.find\(x=>String\(x\.id\)===b\.dataset\.(enqueue|lyrics)\)/);
});
