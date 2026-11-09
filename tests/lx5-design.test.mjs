import test from 'node:test';
import assert from 'node:assert/strict';
import {lx5Shell,lx5Details,lx5HomeAside,lx5HomeFriends,lx5CommunityActivity} from '../src/lx5-design.js';
import {normalizeDisplay,themeTokens} from '../src/display-preferences.js';

test('LX 5: shared navigation retains all destinations, names mobile controls and restricts administration',()=>{
 const member=lx5Shell({profile:{name:'Pessoa <teste>',username:'lx'},page:'Músicas'});
 for(const page of ['Filmes','Séries','Doramas','Animes','Músicas','Livros','Ao vivo','Comunidade','Ranking','Premium','Perfil','Minha Lista','Playlists'])assert.ok(member.includes('data-page="'+page+'"'),page);
 assert.match(member,/aria-label="Conhecer o LX Premium"/);
 assert.match(member,/data-page="Músicas"[^>]*aria-current="page"/);
 assert.doesNotMatch(member,/data-page="Administração"/);
 assert.match(lx5Shell({admin:true}),/data-page="Administração"/);
 assert.doesNotMatch(member,/<teste>/);
});

test('LX 5: unavailable titles can be saved but never expose playback or watch-together controls',()=>{
 for(const patch of [{metadataOnly:true},{catalogOnly:true},{availability:'coming_soon'}]){
  const html=lx5Details({id:1,title:'Em breve',type:'Filme',...patch});
  assert.match(html,/Reprodução ainda indisponível/);
  assert.match(html,/data-modal-save/);
  assert.doesNotMatch(html,/data-modal-play|data-watch-start/);
 }
 const ready=lx5Details({id:2,title:'Disponível',type:'Filme'},{liked:true});
 assert.match(ready,/data-modal-play/);assert.match(ready,/data-watch-start/);assert.match(ready,/aria-pressed="true"/);
});

test('LX 5: details reject executable artwork and escape metadata in text and attributes',()=>{
 const html=lx5Details({title:'"><script>alert(1)</script>',type:'Filme',cover:'javascript:alert(1)',banner:'https://user:secret@example.test/art.jpg',description:'<img onerror="alert(1)">',genre:'<svg/onload=alert(1)>'});
 assert.doesNotMatch(html,/<script>|<img onerror|src="javascript:|secret@example/);
 assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;svg/);
});

test('LX 5: the Home shows only accepted friends with fresh shared presence',()=>{
 const members=[{user_id:'yes',name:'Amigo presente',relation:'accepted'},{user_id:'no',name:'Pedido pendente',relation:'pending'},{user_id:'old',name:'Sessão antiga',relation:'accepted'}];
 const html=lx5HomeFriends(members,[{user_id:'yes',status:'online',updated_at:new Date().toISOString()},{user_id:'no',status:'online',updated_at:new Date().toISOString()},{user_id:'old',status:'online',updated_at:new Date(Date.now()-120000).toISOString()}]);
 assert.match(html,/data-home-member="yes"/);assert.doesNotMatch(html,/Pedido pendente|Sessão antiga|data-home-member="no"/);
});

test('LX 5: absent ranking data never becomes invented scores, participants or prizes',()=>{
 const html=lx5HomeAside();
 assert.doesNotMatch(html,/lx5-rank-number|lx5-prize-teaser|R\$| pts/);
 const live=lx5HomeAside({overview:{season:{season_key:'2026-11',prize_cents:10000},leaders:[{user_id:'visible',name:'Participante real',rank:3,monthly_score:1234}]}});
 assert.match(live,/lx5-rank-number">3</);assert.match(live,/Participante real/);assert.match(live,/1\.234/);assert.match(live,/100,00/);
});

test('LX 5: the Home music action uses actual supplied tracks and public activity remains escaped',()=>{
 const html=lx5HomeAside({items:[{id:77,title:'Minha faixa',type:'Música',artist:'Artista'}]});
 assert.match(html,/data-play="77"/);assert.match(html,/Minha faixa/);
 const activity=lx5CommunityActivity({posts:[{body:'<script>unsafe</script>'+'x'.repeat(200)}]});
 assert.doesNotMatch(activity,/<script>/);assert.match(activity,/&lt;script&gt;/);assert.doesNotMatch(activity,/x{180}/);
});

test('LX 5: only the built-in legacy palette migrates; saved colors, comfort and independent LEDs survive',()=>{
 const migrated=normalizeDisplay({theme:'nexus',customColor:'#69ddec',ledColor:'#69ddec',ledIntensity:12,reduceMotion:true});
 assert.equal(migrated.theme,'lx5');assert.equal(migrated.ledIntensity,12);assert.equal(migrated.reduceMotion,true);
 for(const saved of [{theme:'custom',customColor:'#175caa'},{theme:'rose'},{theme:'nexus',ledSync:false,ledColor:'#aabbcc'},{theme:'nexus',customColor:'#123456'}]){
  assert.equal(normalizeDisplay(saved).theme,saved.theme);
 }
 assert.doesNotThrow(()=>normalizeDisplay({theme:'nexus',customColor:123,ledColor:456}));
 assert.equal(normalizeDisplay().theme,'lx5');assert.equal(themeTokens({theme:'lx5'}).ink,'#ffffff');
 // Choosing the older palette explicitly after migration must still work.
 assert.equal(normalizeDisplay({...migrated,theme:'nexus'}).theme,'nexus');
});
