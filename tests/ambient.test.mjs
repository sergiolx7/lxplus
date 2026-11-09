import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDisplay,homeSections,bindDisplayAccount,writeDisplay,reconcileDisplay,markDisplaySynced} from '../src/display-preferences.js';
import {musicLightAllowed} from '../src/ambient-light.js';
import {referenceMusicPage,completeMusicGroup,musicSuggestions} from '../src/music-library.js';
import {socialDrafts,messageOutbox} from '../src/social-drafts.js';
import {assistantHelp,assistantHistory,assistantError} from '../src/assistant-tools.js';
import {premiumCard} from '../src/premium-ui.js';
import {AudioEffects} from '../src/audio-effects.js';

test('LED values are bounded, legacy appearance migrates, and Home order cannot drop or repeat sections',()=>{
 const legacy=normalizeDisplay({theme:'mint',leds:false,coverSize:'small'});assert.equal(legacy.theme,'mint');assert.equal(legacy.leds,false);assert.equal(legacy.ledIntensity,24);
 for(const [value,expected] of [[-20,0],[400,100],['56.7',57],[null,24],['',24],['evil',24]])assert.equal(normalizeDisplay({ledIntensity:value}).ledIntensity,expected);
 const p=normalizeDisplay({ledColor:'red;url(bad)',ledMode:'flash',homeOrder:['saved','saved','admin','continue']});assert.equal(p.ledColor,'#8b45f6');assert.equal(p.ledMode,'static');assert.deepEqual(p.homeOrder.slice(0,2),['saved','continue']);assert.deepEqual([...p.homeOrder].sort(),[...homeSections].sort());
});
test('music light requires an enabled side and stops for light performance, zero intensity or reduced motion',()=>{
 const p=normalizeDisplay({ledMode:'music'});assert.equal(musicLightAllowed(p),true);
 for(const patch of [{leds:false},{ledIntensity:0},{ledLeft:false,ledRight:false},{reduceMotion:true},{performance:'light'},{ledMode:'rgb'}])assert.equal(musicLightAllowed({...p,...patch}),false);
 globalThis.matchMedia=()=>({matches:true});try{assert.equal(musicLightAllowed(p),false)}finally{delete globalThis.matchMedia}
});
test('an offline appearance change survives an older server response and clears only after its own successful synchronization',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 globalThis.localStorage=storage;try{
  bindDisplayAccount('offline');const local=writeDisplay({theme:'mint',ledIntensity:73});bindDisplayAccount('offline');assert.equal(reconcileDisplay({theme:'rose'}).value.theme,'mint');assert.equal(reconcileDisplay({theme:'rose'}).pending,true);
  assert.equal(markDisplaySynced({theme:'rose'}),false);assert.equal(markDisplaySynced(local),true);assert.equal(reconcileDisplay({theme:'rose'}).value.theme,'rose');assert.equal(reconcileDisplay({theme:'rose'}).pending,false);
 }finally{bindDisplayAccount(null);delete globalThis.localStorage}
});
test('global music cards use a square thumbnail and preserve escaped names and safe image URLs',()=>{
 globalThis.location={origin:'https://lx.example'};
 const html=premiumCard({id:1,type:'Música',title:'<script>Bad</script>',artist:'A & B',cover:'https://example.test/cover.png'});assert.match(html,/music-result/);assert.match(html,/width="48" height="48"/);assert.doesNotMatch(html,/portrait|<script>/);assert.match(html,/A &amp; B/);
 assert.doesNotMatch(premiumCard({type:'Música',cover:'https://user:secret@example.test/a'}),/<img/);
});
test('searching favorites includes album matches after the first page and counts only accessible tracks',async()=>{
 const ids=Array.from({length:135},(_,i)=>String(i+1)),calls=[];
 const result=await referenceMusicPage({ids:[...ids,'135'],term:'álbum final',fetchRows:async(chunk,term)=>{calls.push(chunk);return chunk.filter(id=>Number(id)>120&&id!=='130').map(id=>({id,album:term}))}});
 assert.equal(calls.length,2);assert.equal(result.total,14);assert.equal(result.items[0].id,'121');assert.equal(result.items.at(-1).id,'135');
 const second=await referenceMusicPage({ids,offset:60,fetchRows:async chunk=>chunk.filter(id=>id!=='1').map(id=>({id}))});assert.equal(second.total,134);assert.equal(second.items[0].id,'62');
});
test('an album queue collects every page and rejects a stuck response or an abandoned selection',async()=>{
 const rows=Array.from({length:137},(_,id)=>({id:id+1})),queries=[];
 const result=await completeMusicGroup({field:'album',value:'Meu álbum',page:async q=>{queries.push(q);return {items:rows.slice(q.offset,q.offset+q.limit),total:rows.length}}});assert.equal(result.length,137);assert.deepEqual(queries.map(q=>q.offset),[0,60,120]);assert.equal(queries[0].match.album,'Meu álbum');
 await assert.rejects(completeMusicGroup({field:'album',value:'A',page:async()=>({items:[],total:12})}),/mudou/);
 assert.deepEqual(await completeMusicGroup({field:'artist',value:'A',page:async()=>({items:rows,total:137}),isCurrent:()=>false}),[]);
 assert.deepEqual(musicSuggestions('album',[{album:'Álbum final',title:'<teste>'},{album:'Álbum final'}]),['Álbum final']);
});
test('social text drafts survive redraws and route changes while remaining separated by account and thread',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const one=socialDrafts('one',{storage,now:()=>100000000});one.set('post',{text:'Meu rascunho',visibility:'friends'});one.set('dm:friend',{text:'Mensagem ainda não enviada'});
 const reopened=socialDrafts('one',{storage,now:()=>100000001});assert.equal(reopened.get('post').text,'Meu rascunho');assert.equal(reopened.get('post').visibility,'friends');assert.equal(reopened.get('dm:friend').text,'Mensagem ainda não enviada');assert.equal(socialDrafts('two',{storage}).get('post').text,'');
 reopened.clear('dm:friend');assert.equal(reopened.get('dm:friend').text,'');assert.equal(socialDrafts('one',{storage,now:()=>200000000}).get('post').text,'');
});
test('an uncertain send keeps its client ID; concurrent duplicate sends are refused and a successful new message gets a new ID',()=>{
 let n=0;const outbox=messageOutbox(()=>String(++n)),first=outbox.begin('dm:A','Olá');assert.throws(()=>outbox.begin('dm:A','Olá'),/ainda/);outbox.finish('dm:A',first,false);assert.equal(outbox.begin('dm:A','Olá'),first);outbox.finish('dm:A',first,true);assert.notEqual(outbox.begin('dm:A','Olá'),first);assert.equal(outbox.begin('dm:B','Outro amigo'),'3');
});
test('assistant history requires explicit consent, is scoped to an account, and clears completely when disabled',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const h=assistantHistory('one',{storage});h.save(false,[{role:'user',text:'Privado'}]);assert.equal(values.size,0);h.save(true,[{role:'system',text:'Invalid'},{role:'user',text:'Minha pergunta'}]);assert.equal(h.read().messages.length,1);assert.equal(assistantHistory('two',{storage}).read().messages.length,0);h.save(false,[]);assert.equal(values.size,0);
 assert.equal(assistantHelp('Quero ouvir jazz'),null);assert.match(assistantHelp('Como personalizo os LEDs?').text,/LX LED Studio/);assert.equal(assistantHelp('Onde altero a privacidade?').page,'Perfil');assert.match(assistantError('AI_RATE_LIMIT'),/limite/);
});
test('the music analyser samples only the attached graph, preserves unprocessed sound, and is disconnected on cleanup',async()=>{
 const makeNode=()=>({links:[],gain:{setTargetAtTime(){}},frequency:{},Q:{},connect(n){this.links.push(n)},disconnect(){this.links=[]}});
 class Context{constructor(){this.state='running';this.currentTime=0;this.destination={}}resume(){return Promise.resolve()}createMediaElementSource(){return makeNode()}createGain(){return makeNode()}createBiquadFilter(){return makeNode()}createAnalyser(){return {...makeNode(),getByteTimeDomainData(data){data.fill(144)}}}close(){return Promise.resolve()}}
 globalThis.AudioContext=Context;try{const fx=new AudioEffects();await fx.resume();fx.attach({}, {enabled:false},{analyze:true});assert.equal(fx.level(),.5);assert.deepEqual(fx.source.links,[fx.context.destination,fx.analyser]);const analyser=fx.analyser;fx.detach();assert.equal(analyser.links.length,0);assert.equal(fx.level(),null);fx.destroy()}finally{delete globalThis.AudioContext}
});
