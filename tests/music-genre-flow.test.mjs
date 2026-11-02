import test from 'node:test';
import assert from 'node:assert/strict';
import {musicLane,sameMusicLane,genreSearchTerms} from '../src/music-genre.js';
import {musicMix} from '../src/music-discovery.js';
import {MusicQueue} from '../src/music-queue.js';

const track=(id,artist,genre,extras={})=>({id,type:'Música',published:true,title:'Faixa '+id,artist,genre,...extras});
const matue=track('matue','Matuê','Trap');
const teto=track('teto','Teto','Trap nacional');
const foreign=track('foreign','Travis Scott','Trap',{country:'Estados Unidos'});
const other=track('pop','The Weeknd','Pop');
const sertanejo=track('sert','Ana Castela','Sertanejo');
const sertanejo2=track('sert2','Marília Mendonça','Sertanejo Universitário');

test('Matuê listening lane is Brazilian trap even when country metadata is missing',()=>{
 assert.deepEqual(musicLane(matue),{genre:'trap',region:'br',artist:'matue'});
 assert.equal(sameMusicLane(matue,teto),true);
 assert.equal(sameMusicLane(matue,foreign),false);
 assert.equal(sameMusicLane(matue,other),false);
 assert.equal(sameMusicLane(matue,sertanejo),false);
 assert.deepEqual(genreSearchTerms(matue),['trap','Trap','Matuê']);
});
test('sertanejo remains sertanejo; other styles do not enter by genre or country',()=>{
 assert.equal(sameMusicLane(sertanejo,sertanejo2),true);
 assert.equal(sameMusicLane(sertanejo,matue),false);
 assert.equal(sameMusicLane(sertanejo,track('us','Artist','Country',{country:'USA'})),false);
});
test('the queue skips off-genre songs for manual and automatic next',()=>{
 const q=new MusicQueue();
 q.set([matue,other,foreign,teto],matue);
 assert.equal(q.next({match:sameMusicLane})?.id,'teto');
 assert.equal(q.next({ended:true,match:sameMusicLane}),null);
 assert.equal(q.index,3);
 assert.deepEqual(q.previous,[0]);
});
test('shuffle remains in the same lane and respects repeat mode',()=>{
 const q=new MusicQueue();
 q.set([matue,other,teto],matue);
 q.shuffle=true;
 assert.equal(q.next({match:sameMusicLane,random:()=>0})?.id,'teto');
 assert.equal(q.next({match:sameMusicLane}),null);
 q.repeat='all';
 assert.equal(q.next({match:sameMusicLane})?.id,'matue');
});
test('strict LX Flow excludes foreign trap, pop and unclassified candidates',()=>{
 const untagged=track('bad','Unknown Artist','');
 const items=[other,foreign,teto,sertanejo,untagged,matue];
 const actual=musicMix(items,{current:matue,strictGenre:true,exclude:['matue']});
 assert.deepEqual(actual.map(x=>x.id),['teto']);
});
test('unknown current genre falls back only to the exact same artist',()=>{
 const seed=track('seed','Banda X','');
 assert.equal(sameMusicLane(seed,track('same','Banda X','')),true);
 assert.equal(sameMusicLane(seed,track('random','Banda Y','')),false);
});
