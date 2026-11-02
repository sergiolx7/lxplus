import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderFoundersWall} from '../src/founders-wall.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mural celebrates three people with @sergiolx in the prominent center position',()=>{
 const html=renderFoundersWall();
 const left=html.indexOf('data-founder-card="natalha"');
 const center=html.indexOf('data-founder-card="sergio"');
 const right=html.indexOf('data-founder-card="xaruto"');
 assert.ok(left>=0 && left<center && center<right);
 assert.match(html,/Mural dos/);
 assert.match(html,/Fundadores/);
 assert.match(html,/lx-wall-gold/);
 assert.match(html,/Sérgio LX/);
 assert.match(html,/Fundador e idealizador/);
 assert.match(html,/Natalha/);
 assert.match(html,/Agradecimento especial/);
 assert.match(html,/@xaruto/);
 assert.match(html,/Obrigado, @xaruto, por fazer parte/);
 assert.match(html,/Com gratidão, LX Plus/);
 assert.doesNotMatch(html,/natalha054@gmail\.com/);
 assert.doesNotMatch(html,/role="owner"|1M seguidores/i);
});
test('home mural has a working route CTA; full mural does not duplicate it',()=>{
 const compact=renderFoundersWall({compact:true});
 assert.match(compact,/data-page="Mural dos Fundadores"/);
 assert.match(compact,/lx-wall-compact/);
 assert.doesNotMatch(renderFoundersWall(),/lx-wall-more/);
});
test('mural reuses only public profile photos and survives absent profile photos',()=>{
 const directory=[
  {user_id:'u1',name:'Sérgio LX',username:'sergiolx',approved:true,social_visible:true,avatar_url:'https://cdn.example.com/founder.png'},
  {user_id:'u2',name:'Xaruto',username:'xaruto',approved:true,social_visible:true,avatar_url:'https://cdn.example.com/xaruto.png'},
  {user_id:'u3',name:'Natalha',username:'nikelx',approved:false,social_visible:true,avatar_url:'https://cdn.example.com/private.png'}
 ];
 const html=renderFoundersWall({people:directory});
 assert.match(html,/founder\.png/);
 assert.match(html,/xaruto\.png/);
 assert.doesNotMatch(html,/private\.png/);
 assert.match(html,/lx-wall-monogram/);
});
test('navigation exposes mural on home, inside menu and as dedicated route',()=>{
 const app=file('src/app.js');
 assert.match(app,/import \{renderFoundersWall\} from '\.\/founders-wall\.js'/);
 assert.match(app,/\['Mural dos Fundadores','sparkles'\]/);
 assert.match(app,/'Mural dos Fundadores':\['founders','mount'\]/);
 assert.match(app,/renderPremiumCatalog\(\{.*\}\)\+renderFoundersWall\(\{compact:true\}\)/);
 assert.match(app,/data-page="Mural dos Fundadores"/);
 const index=file('index.html');
 assert.match(index,/lx-founders-wall\.css/);
 assert.match(index,/import\('\.\/src\/app\.js\?v=.*'\)/);
});
test('mural has responsive LED borders, founder crown and reduced-motion support',()=>{
 const css=file('assets/lx-founders-wall.css');
 assert.match(css,/lx-wall-gold/);
 assert.match(css,/lx-wall-card::before/);
 assert.match(css,/lx-wall-founder-ribbon/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:470px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('former owner is thanked without showing email or claiming ownership access',()=>{
 const code=file('src/founders-wall.js');
 assert.doesNotMatch(code,/@gmail\.com/i);
 assert.match(code,/Agradecimento especial/);
 assert.match(code,/Parceiro da jornada/);
 const loader=file('src/modules/founders.js');
 assert.match(loader,/socialDirectory/);
 assert.match(loader,/renderFoundersWall/);
 assert.match(loader,/p\.approved!==false/);
});
