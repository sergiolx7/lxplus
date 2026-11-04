import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPremiumCatalog} from '../src/premium-ui.js';
import {cosmeticItems,filterCosmetics,cosmeticPreview} from '../src/cosmetic-library.js';
globalThis.location={origin:'https://example.org'};
const movie={id:1,type:'Filme',title:'Teste',cover:'https://example.org/a.jpg',genre:'Aventura'};
test('metadata-only home highlights never offer unavailable playback',()=>{
 const html=renderPremiumCatalog({page:'Início',items:[{...movie,metadataOnly:true}]});
 assert.doesNotMatch(html,/data-play="1"/);assert.match(html,/Em breve · ver detalhes/);
});
test('home carousel has keyboard-ready controls and separates doramas and animes',()=>{
 const html=renderPremiumCatalog({page:'Início',items:[movie,{...movie,id:2,type:'Dorama'},{...movie,id:3,type:'Anime'}]});
 assert.match(html,/data-home-carousel/);assert.match(html,/data-hero-pause/);assert.match(html,/data-hero-slide hidden/);assert.match(html,/Seu próximo dorama/);assert.match(html,/Universos de anime/);
});
test('cosmetic collection has distinct identities, working category/search filters and safe preview values',()=>{
 assert.equal(new Set(cosmeticItems.map(x=>x.id)).size,cosmeticItems.length);
 const favorite=cosmeticItems[0];assert.deepEqual(filterCosmetics({favorites:[favorite.id]}),[favorite]);
 assert.ok(filterCosmetics({category:'Molduras'}).every(x=>x.category==='Molduras'));
 assert.ok(filterCosmetics({term:'Órbita'}).some(x=>x.name==='Órbita'));
 const preview=cosmeticPreview({effect:'stars'},cosmeticItems.find(x=>x.id==='decoration:halo'));assert.equal(preview.decoration,'halo');assert.equal(preview.effect,'stars');
 assert.equal(cosmeticPreview({}, {patch:{effect:'<script>'}}).effect,'none');
});
