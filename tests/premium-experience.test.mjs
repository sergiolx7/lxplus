import {test} from 'node:test';
import assert from 'node:assert/strict';
globalThis.location={origin:'https://lxplus.example'};
const {renderPremiumCatalog}=await import('../src/premium-ui.js');
const {studioOverview,studioPreview}=await import('../src/studio-ui.js');
const {renderCommunity,renderSocialMembers}=await import('../src/social-ui.js');

const data=[
 {id:1,title:'Cinema A',type:'Filme',year:2025,genre:'Ação',cover:'https://example.org/film.jpg',banner:'https://example.org/wide.jpg',featured:true},
 {id:2,title:'Série B',type:'Série',year:2024,cover:'https://example.org/series.jpg'},
 {id:3,title:'Música C',type:'Música',cover:'https://example.org/music.jpg'},
 {id:4,title:'Livro D',type:'Livro',cover:'https://example.org/book.jpg'}
];
test('home loads cinema hero, responsive catalog rails and category shortcuts',()=>{
 const html=renderPremiumCatalog({page:'Início',items:data,history:{1:{updatedAt:'2026-10-29T12:00:00Z'}},list:[1]});
 assert.match(html,/premium-feature/);
 assert.match(html,/Cinema A/);
 assert.match(html,/Continue assistindo/);
 assert.match(html,/Novidades do catálogo/);
 assert.match(html,/Séries e doramas/);
 assert.match(html,/LX Music/);
 assert.match(html,/LX Books/);
 assert.match(html,/data-rail="movies"/);
 assert.match(html,/data-page="Filmes"/);
});
test('listing renders filterable grid and escapes malicious title strings',()=>{
 const html=renderPremiumCatalog({page:'Filmes',items:[{id:5,title:'<img src=x onerror=alert(1)>',type:'Filme'}],term:'<tag>'});
 assert.match(html,/premium-grid/);
 assert.doesNotMatch(html,/<img src=x onerror=/);
 assert.match(html,/&lt;img/);
 assert.match(html,/&lt;tag&gt;/);
});
test('catalog has error and loading states without blank screens',()=>{
 const loading=renderPremiumCatalog({page:'Início',items:[],catalogStatus:'loading'});
 const error=renderPremiumCatalog({page:'Início',items:[],catalogStatus:'error'});
 assert.match(loading,/premium-skeleton/);
 assert.match(error,/retryCatalog/);
});
test('ADM Studio preview respects poster and landscape formats',()=>{
 const html=studioOverview({catalog:data,scan:null});
 const preview=studioPreview({title:'Teste',cover:'https://example.org/poster.jpg',banner:'https://example.org/banner.jpg'});
 assert.match(html,/ADM Studio/);
 assert.match(html,/studio-preview-card/);
 assert.match(preview,/DESKTOP/);
 assert.match(preview,/CELULAR/);
 assert.match(preview,/studio-mobile/);
});
test('LX Social searches only permitted public list',()=>{
 const members=[
  {name:'Ana Teste',username:'anatest',ranking_visible:true,verified:true,bio:'Cinema'},
  {name:'Perfil Privado',username:'private',ranking_visible:false},
 ];
 const html=renderCommunity({members:members.slice(0,1),profile:{name:'Eu',username:'eu'}});
 assert.match(html,/LX SOCIAL/);
 assert.match(html,/memberSearch/);
 assert.match(renderSocialMembers(members,'ana'),/Copiar @anatest/);
 assert.doesNotMatch(renderSocialMembers(members,'private'),/Perfil Privado/);
});
test('social output escapes names, handles and descriptions',()=>{
 const html=renderSocialMembers([{name:'<script>test</script>',username:'name"x',ranking_visible:true,bio:'<img>'}]);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&lt;img&gt;/);
});
