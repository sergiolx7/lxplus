import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderPremiumCatalog,premiumCard} from '../src/premium-ui.js';
import {normalizeDisplay,readDisplay,writeDisplay,greetingForHour} from '../src/display-preferences.js';
import {renderRanking} from '../src/ranking-ui.js';
import {classifyLink,resolveItem} from '../src/universal-player.js';
import {parseImportText} from '../src/import-text.js';
globalThis.location={origin:'https://lxplus.example'};
const movie={id:1,title:'Cinema',type:'Filme',cover:'https://example.org/poster.jpg',genre:'Aventura'};
test('all home rails exclude books, music and live entries even when saved, recent and personalized',()=>{
 const items=[movie,{id:2,title:'Livro proibido no início',type:'Livro',cover:movie.cover,genre:'Aventura',featured:true},{id:3,title:'Faixa fora do início',type:'Música',cover:movie.cover,genre:'Aventura'},{id:4,title:'Ao vivo',type:'Ao Vivo',cover:movie.cover}];
 const html=renderPremiumCatalog({page:'Início',items,list:[2,3,4],history:{1:{position:30,duration:100},2:{position:10,duration:20}}});
 for(const id of [2,3,4])assert.doesNotMatch(html,new RegExp('data-item="'+id+'"'));
 assert.doesNotMatch(html,/LX Books|LX Music|data-page="Livros"/);
});
test('editorial Top 10 uses at most ten real available entries without inventing places',()=>{
 const html=renderPremiumCatalog({page:'Início',items:Array.from({length:12},(_,i)=>({...movie,id:i+1,title:'Filme '+i}))});
 assert.equal((html.match(/class="top-ten-number"/g)||[]).length,10);assert.match(html,/Seleção editorial/);
 const one=renderPremiumCatalog({page:'Início',items:[movie]});assert.equal((one.match(/class="top-ten-number"/g)||[]).length,1);
});
test('display settings persist on the device and tolerate unavailable storage',()=>{
 let stored=null;const storage={getItem:()=>stored,setItem:(_key,value)=>stored=value};
 const saved=writeDisplay({performance:'light',coverSize:'large',posterFit:'contain',leds:false},storage);assert.deepEqual(readDisplay(storage),saved);
 assert.equal(readDisplay({getItem:()=>{throw Error('blocked')}}).performance,'light');
 assert.deepEqual(normalizeDisplay({performance:'evil',coverSize:'huge',posterFit:'fill'}),{performance:'normal',coverSize:'medium',posterFit:'cover',leds:true});
});
test('greetings cover midnight, morning, afternoon and night boundaries',()=>{
 for(const [hour,text] of [[0,'Boa madrugada'],[5,'Boa madrugada'],[6,'Bom dia'],[11,'Bom dia'],[12,'Boa tarde'],[17,'Boa tarde'],[18,'Boa noite'],[23,'Boa noite']])assert.equal(greetingForHour(hour),text);
});
test('poster cards reserve correct geometry and never request blank or credential-bearing artwork',()=>{
 assert.match(premiumCard(movie,'landscape'),/width="640" height="360"/);assert.match(premiumCard(movie,'landscape'),/poster-letterbox/);
 assert.doesNotMatch(premiumCard({...movie,cover:''}),/<img/);assert.doesNotMatch(premiumCard({...movie,cover:'https://user:pass@evil.test/a.jpg'}),/<img/);
});
test('unknown HTTPS sources remain actionable through the original service while requiring authorization',async()=>{
 const sourceUrl='https://example.org/watch?id=1';assert.equal((await resolveItem({...movie,sourceUrl,license:{authorized:true}})).kind,'external');assert.equal((await resolveItem({...movie,sourceUrl})).kind,'unavailable');
});
test('explicit source formats support extensionless endpoints without permitting unsafe protocols',()=>{
 assert.equal(classifyLink('https://example.org/stream?id=1',{kind:'hls'}).kind,'hls');assert.equal(classifyLink('https://example.org/audio?id=2',{kind:'audio'}).kind,'audio');assert.equal(classifyLink('javascript:alert(1)',{kind:'video'}).kind,'invalid');
});
test('source-format hints survive import only when supported',()=>{
 assert.equal(parseImportText('[{"title":"A","sourceKind":"dash"}]')[0].item.sourceKind,'dash');assert.equal(parseImportText('[{"title":"A","sourceKind":"arbitrary-iframe"}]')[0].item.sourceKind,undefined);
});
test('ranking podium and hall never reveal names or avatars of private participants',()=>{
 const html=renderRanking({season:{season_key:'2026-10'},rows:[{user_id:'private',monthly_score:50}],people:[{user_id:'private',name:'Nome secreto',avatar_url:'https://private.example/avatar.png',ranking_visible:false}],userId:'me',past:[{season_key:'2026-09',winner_user_id:'private',winner_confirmed:true}]});
 assert.match(html,/Perfil privado/);assert.doesNotMatch(html,/Nome secreto|private.example/);assert.match(html,/pódio/);
});
