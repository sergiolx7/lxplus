import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {cosmeticItems,cosmeticPreview,cosmeticStylePreview,filterCosmetics,normalizeSavedLooks,savedLookLimit} from '../src/cosmetic-library.js';

test('the expanded library keeps existing identities and adds complete looks, LED palettes and avatar shapes',()=>{
 assert.equal(cosmeticItems.length,84);assert.equal(new Set(cosmeticItems.map(item=>item.id)).size,84);
 for(const [category,count] of [['Coleções completas',30],['Paletas de LEDs',24],['Avatares',2]])assert.equal(filterCosmetics({category}).length,count);
 for(const id of ['preset:nova','decoration:halo','effect:stars','nameStyle:glow','chatTheme:ocean','entrance:chime'])assert.ok(cosmeticItems.some(item=>item.id===id),id);
 assert.equal(filterCosmetics({onlyNew:true}).length,56);
});

test('a collection applies its real profile colors and complete style instead of only changing a thumbnail',()=>{
 const item=cosmeticItems.find(item=>item.id==='collection:polar');
 const skin=cosmeticPreview({nameStyle:'solid',chatTheme:'midnight'},item),style=cosmeticStylePreview({enabled:false,color:'#ffffff',secondColor:'#ffffff',intensity:10},item);
 assert.equal(skin.effect,'aurora');assert.equal(skin.chatTheme,'aurora');assert.equal(skin.nameStyle,'shimmer');assert.equal(skin.accent,item.color);
 assert.equal(style.enabled,true);assert.equal(style.color,item.color);assert.equal(style.secondColor,item.second);assert.equal(style.intensity,65);
 const palette=cosmeticItems.find(item=>item.id==='palette:coral');
 assert.equal(cosmeticPreview(skin,palette).effect,'aurora');assert.equal(cosmeticStylePreview(style,palette).color,palette.color);
});

test('search ignores accents and composes category, novelty, favorites and alphabetic ordering',()=>{
 assert.ok(filterCosmetics({term:'orquidea'}).some(item=>item.name==='Orquídea neon'));
 const favorites=['collection:polar','palette:rose','entrance:chime'];
 assert.deepEqual(filterCosmetics({category:'Paletas de LEDs',favorites,onlyNew:true}).map(item=>item.id),['palette:rose']);
 const named=filterCosmetics({sort:'name'}).map(item=>item.name);
 assert.deepEqual(named,[...named].sort((a,b)=>a.localeCompare(b,'pt-BR')));
 assert.deepEqual(filterCosmetics({favorites:[]}),[]);
});

test('saved looks have bounded safe data, independent copies, unique IDs and no active HTML fields',()=>{
 const input=[null,{id:'bad/path',name:'bad'},{id:'empty',name:'\u0000'},{id:'first',name:'  Meu\u0000 estilo  ',skin:{effect:'<script>',avatarShape:'rounded',unknown:'bad'},style:{color:'red',intensity:999}},{id:'first',name:'Duplicate'},...Array.from({length:12},(_,i)=>({id:'look-'+i,name:'x'.repeat(50),skin:{effect:'stars'},style:{enabled:true,color:'#aabbcc'}}))];
 const looks=normalizeSavedLooks(input);assert.equal(looks.length,savedLookLimit);assert.equal(looks[0].name,'Meu estilo');assert.equal(looks[0].skin.effect,'none');assert.equal(looks[0].skin.unknown,undefined);assert.equal(looks[0].style.intensity,100);assert.equal(looks[1].name.length,32);
 input[3].skin.avatarShape='circle';assert.equal(looks[0].skin.avatarShape,'rounded');assert.deepEqual(normalizeSavedLooks({}),[]);
});

const db=new PGlite();
before(async()=>{
 const migration=readFileSync(new URL('../supabase/migrations/20261101183850_lx_premium_studio.sql',import.meta.url),'utf8');
 const validator=migration.match(/create or replace function lx_private\.valid_premium_identity\(p jsonb\)[\s\S]*?\$\$;/)?.[0];
 assert.ok(validator);await db.exec('create schema lx_private;'+validator);
});
after(()=>db.close());
test('every library combination is accepted by the existing Postgres identity validator',async()=>{
 for(const item of cosmeticItems){const skin=cosmeticPreview({},item);const result=await db.query('select lx_private.valid_premium_identity($1::jsonb) as valid',[JSON.stringify(skin)]);assert.equal(result.rows[0].valid,true,item.id)}
});
