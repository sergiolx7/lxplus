import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cinemaShareUrl,cinemaSharedId,cinemaHomeUrl} from '../src/cinema-sharing.js';
import {renderPremiumCatalog} from '../src/premium-ui.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Top 10 has large ranking numbers and shares individual real titles',()=>{
 const html=renderPremiumCatalog({page:'Início',items:[{id:123,type:'Filme',title:'Filme demonstrativo',cover:'https://example.com/cover.jpg',genre:'Drama',year:2026}],history:{},list:[]});
 assert.match(html,/top-ten-number/);
 assert.match(html,/data-share-top/);
 assert.match(html,/data-share-item="123"/);
 assert.match(html,/Compartilhar Filme demonstrativo/);
 assert.doesNotMatch(html,/10 títulos disponíveis/);
 const css=file('assets/lx-cinema-top10-premium4.css');
 assert.match(css,/clamp\(92px,11vw,152px\)/);
 assert.match(css,/@media\(max-width:650px\)/);
});

test('shared links never open unpublished/invalid content without server access',()=>{
 const url=cinemaShareUrl('https://example.com/site/?recovery=1&other=ok#Perfil',123);
 assert.equal(cinemaSharedId(url),'123');
 assert.equal(new URL(url).searchParams.get('recovery'),null);
 assert.equal(new URL(url).hash,'#In%C3%ADcio');
 assert.equal(cinemaSharedId('https://example.com/?lx-item=abc'),null);
 assert.throws(()=>cinemaShareUrl('https://example.com',-1));
 assert.equal(cinemaSharedId(cinemaHomeUrl(url)),null);
 const app=file('src/app.js');
 assert.match(app,/\.eq\('id',id\)\.eq\('published',true\)/);
 assert.match(app,/data-share-top/);
 assert.match(app,/button\.dataset\.shareItem/);
 assert.match(app,/navigator\.share/);
 assert.match(app,/navigator\.clipboard\.writeText/);
});
