import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MusicQueue} from '../src/music-queue.js';
import {catalogPageTypes,normalizedCatalogMatch} from '../src/catalog-filters.js';
import {assistantHelp} from '../src/assistant-tools.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const tracks=[{id:1,title:'Um'},{id:2,title:'Dois'},{id:3,title:'Três'},{id:4,title:'Quatro'}];

test('manual queue reorder never changes the currently playing track',()=>{
 const q=new MusicQueue();q.set(tracks,tracks[1]);
 assert.equal(q.move(3,0),true);
 assert.deepEqual(q.items.map(x=>x.id),[4,1,2,3]);
 assert.equal(q.items[q.index].id,2);
 assert.equal(q.move(q.index,3),true);
 assert.equal(q.items[q.index].id,2);
 assert.equal(q.next().id,4,'queue order determines the next track');
});

test('queue reorder preserves previous playback and shuffle coverage by track identity',()=>{
 const q=new MusicQueue();q.set(tracks,tracks[1]);q.next();
 const playedIds=[...q.played].map(i=>q.items[i].id).sort();
 assert.equal(q.move(0,3),true);
 assert.deepEqual([...q.played].map(i=>q.items[i].id).sort(),playedIds);
 assert.equal(q.back().id,2);
 assert.equal(q.items[q.index].id,2);
});

test('invalid queue moves are no-ops and preserve playing state',()=>{
 const q=new MusicQueue();q.set(tracks,tracks[0]);
 const before=q.items.map(x=>x.id);
 for(const [a,b] of [[-1,0],[0,-1],[4,0],[0,4],[0.2,1],[NaN,0],['1',0]])assert.equal(q.move(a,b),false);
 assert.equal(q.move(2,2),true);
 assert.deepEqual(q.items.map(x=>x.id),before);
 assert.equal(q.index,0);
});

test('real queue controls have labeled up and down actions and render after moving',()=>{
 const dock=source('src/music-dock.js');
 assert.match(dock,/data-queue-move=/);
 assert.match(dock,/data-queue-direction=/);
 assert.match(dock,/queue\.move\(from,from\+direction\)/);
 assert.match(dock,/this\.renderQueue\(\)/);
 assert.match(dock,/Mover .* para cima/);
 const html=source('index.html');
 assert.match(html,/lx-music-queue-premium4\.css/);
});

test('Doramas has its own route and server-wide subcategory filters',()=>{
 const app=source('src/app.js');
 assert.match(app,/\['Doramas','series'\]/);
 assert.match(app,/Doramas:\['catalog','mount'\]/);
 assert.deepEqual(catalogPageTypes('Doramas'),['Dorama']);
 assert.deepEqual(catalogPageTypes('Séries','Dorama'),['Dorama']);
 assert.deepEqual(catalogPageTypes('Séries','Anime'),['Anime']);
 assert.deepEqual(catalogPageTypes('Séries','INVALID'),['Série','Dorama','Anime']);
 assert.deepEqual(catalogPageTypes('Filmes'),['Filme']);
 const page=source('src/modules/catalog.js');
 assert.match(page,/catalogPage\(\{types:catalogPageTypes\(ctx\.page,subtype\)/);
 assert.match(page,/data-catalog-subtype=/);
});

test('catalogue metadata query is exact, server-side and sanitized',()=>{
 assert.deepEqual(normalizedCatalogMatch({genre:'  Drama  ',country:'  Brasil  ',year:'2022'}),{genre:'Drama',country:'Brasil',year:'2022'});
 assert.deepEqual(normalizedCatalogMatch({genre:'',year:'2101',country:''}),{});
 assert.deepEqual(normalizedCatalogMatch({year:'2000 OR true'}),{});
 const services=source('src/services.js');
 assert.match(services,/\['artist','album','genre','country','year'\]/);
 assert.match(services,/query\.eq\('payload->>'\+field,match\[field\]\)/);
});

test('LX IA documents actual authorized user actions without promising unavailable TURN',()=>{
 const calls=assistantHelp('Como compartilhar tela numa chamada?');
 assert.equal(calls.page,'Comunidade');
 assert.match(calls.text,/servidor TURN/);
 assert.equal(assistantHelp('Como reorganizo a fila das músicas?').page,'Músicas');
 assert.equal(assistantHelp('Como entrar numa LX Party?').page,'Filmes');
 assert.equal(assistantHelp('Como pesquisar doramas?').page,'Doramas');
 assert.equal(assistantHelp('Como mudar minha moldura Premium?').page,'Perfil');
});
