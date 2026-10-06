/* Regression: durable sessions, album transport and the Plex catalog sub-tab. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const output=process.env.LX_QA_OUTPUT||'/tmp/lx-session-album-plex';fs.mkdirSync(output,{recursive:true});
const base='http://127.0.0.1:8765/',sampleRate=8000,pcm=Buffer.alloc(sampleRate*20*2),audio=Buffer.alloc(44+pcm.length);
audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(sampleRate,24);audio.writeUInt32LE(sampleRate*2,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(pcm.length,40);pcm.copy(audio,44);
async function fixture(context,{delay=0,seed=true}={}){
 await context.route('**/*',route=>{const url=route.request().url();if(url.includes('/qa-album.wav'))return route.fulfill({contentType:'audio/wav',body:audio});if(url.includes('/qa-owned-film.mp4'))return route.fulfill({contentType:'video/mp4',body:fs.readFileSync(path.join(__dirname,'tools/catalog-qa/owned-video.mp4'))});return url.startsWith(base)?route.continue():route.abort()});
 await context.addInitScript(({delay,seed})=>{
  const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',key='sb-qa-auth-token';
  const qaUser=id=>({id,email:id===uid?'listener@example.invalid':'second@example.invalid',user_metadata:{name:id===uid?'Sessão QA':'Outra conta QA'}});
  if(seed&&!localStorage.getItem('qa-seeded')){localStorage.setItem(key,JSON.stringify({user:qaUser(uid)}));localStorage.setItem('qa-seeded','1')}
  window.qaProfileDelay=delay;window.qaHydrationStarted=false;window.qaAuthEvents=[];window.qaSignInCount=0;
  let storage,callback=()=>{};
  const session=()=>{const value=storage.getItem(key);return value?JSON.parse(value):null};
  const channel={on(){return this},subscribe(){return this}};
  window.qaDb={
   from(table){let userId=uid,range=[0,499];const q={};for(const k of ['select','order','limit','upsert','update','insert','delete','neq','gte','lt','in'])q[k]=()=>q;
    q.eq=(column,value)=>{if(column==='user_id')userId=value;return q};q.range=(a,b)=>{range=[a,b];return q};
    q.maybeSingle=async()=>{
     if(table==='lx_profiles'){qaHydrationStarted=true;const wait=userId===uid?qaProfileDelay:0;if(wait)await new Promise(r=>setTimeout(r,wait));return {data:{user_id:userId,name:userId===uid?'Sessão QA':'Outra conta QA',approved:true,approval_status:'approved'},error:null}}
     if(table==='lx_user_state')return {data:{data:{history:{},musicCollections:[]}},error:null};return {data:null,error:null}
    };
    q.then=(ok,bad)=>Promise.resolve({data:table==='lx_profiles'?[{user_id:uid,name:'Sessão QA',approved:true}]:[],error:null}).then(ok,bad);return q
   },
   channel:()=>channel,removeChannel:async()=>{},rpc:async()=>({data:false,error:null}),functions:{invoke:async()=>({data:{items:[],sections:[]},error:null})},
   auth:{
    getSession:async()=>({data:{session:session()},error:null}),
    onAuthStateChange(fn){callback=fn;setTimeout(()=>callback('INITIAL_SESSION',session()),0);return {data:{subscription:{unsubscribe(){}}}}},
    async signInWithPassword({email}){qaSignInCount++;const user=qaUser(email.startsWith('second')?other:uid);storage.setItem(key,JSON.stringify({user}));callback('SIGNED_IN',{user});return {data:{user},error:null}},
    async signOut(){storage.removeItem(key);callback('SIGNED_OUT',null);return {error:null}}
   }
  };
  window.supabase={createClient(_url,_key,options){storage=options.auth.storage;window.qaStorage=storage;return qaDb}};
 },{delay,seed});
}
async function waitApp(page){await page.waitForFunction(()=>window.LX?.ui?.state?.screen==='app',{},{timeout:14000})}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--autoplay-policy=no-user-gesture-required'],headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:940}});await fixture(context,{delay:7000});let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('#lxSessionRestoreStatus:not(.hidden)',{state:'attached',timeout:11000});
 assert.match(await page.locator('#lxSessionRestoreStatus').textContent(),/Restaurando/);await waitApp(page);
 assert.equal(await page.evaluate(()=>qaSignInCount),0,'A restore taking over 4.5 seconds needs no password');
 await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));await page.goto(base);await waitApp(page);assert.equal(await page.evaluate(()=>qaSignInCount),0,'Close/reopen restores the persisted session');

 const quota=await page.evaluate(()=>{
  const S=LX.store;S.writeLocal(S.keys.catalog,[{id:101,title:'Cache recuperável'}]);S.writeLocal(S.keys.history,{101:{progress:25}});S.writeLocal(S.keys.musicCollections,[{id:'keep-me'}]);
  const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='sb-qa-auth-token'&&localStorage.getItem('lx16_catalog'))throw new DOMException('Full catalog fixture','QuotaExceededError');return original.call(this,key,value)};
  try{qaStorage.setItem('sb-qa-auth-token',JSON.stringify({user:{id:'qa-persisted'}}));return {session:JSON.parse(localStorage.getItem('sb-qa-auth-token')).user.id,cacheDisk:localStorage.getItem('lx16_catalog'),cacheMemory:S.read(S.keys.catalog).length,history:S.read(S.keys.history)[101].progress,collection:S.read(S.keys.musicCollections)[0].id}}finally{Storage.prototype.setItem=original}
 });
 assert.deepEqual(quota,{session:'qa-persisted',cacheDisk:null,cacheMemory:1,history:25,collection:'keep-me'},'Quota recovery removes only the rebuildable disk catalog');

 await page.evaluate(()=>{
  const cover=location.origin+'/assets/lxplus-icon-v34.png',src=location.origin+'/qa-album.wav';
  window.qaSongs=[
   {id:8101,type:'Música',title:'Sem áudio',artist:'Artista QA',album:'Álbum QA',cover,genre:'QA',published:true,tracks:[{title:'Faixa 1',trackNumber:1,mediaKey:''}]},
   {id:8102,type:'Música',title:'Segunda',artist:'Artista QA',album:'Álbum QA',cover,genre:'QA',published:true,tracks:[{title:'Faixa 2',trackNumber:2,mediaKey:src}]},
   {id:8103,type:'Música',title:'Terceira',artist:'Artista QA',album:'Álbum QA',cover,genre:'QA',published:true,tracks:[{title:'Faixa 3',trackNumber:3,mediaKey:src}]},
   {id:8199,type:'Música',title:'Fora do álbum',artist:'Outro',cover:'assets/lx-music-fallback.svg',genre:'QA',published:true,tracks:[{title:'Outro áudio',mediaKey:src}]}];
  LX.data.catalog=()=>qaSongs;LX.ui.state.mode='Ouvir';LX.ui.state.category='Início';LX.ui.renderApp();
 });
 await page.waitForFunction(()=>window.LXMusicHotfix260926&&window.LX?.playMusicEntries);
 await page.evaluate(()=>LX.openMusicAlbum(8101));await page.click('[data-auto-play]');
 await page.waitForFunction(()=>window.LX.currentMusic()?.contentId===8102&&!document.getElementById('musicAudio').paused&&document.getElementById('musicAudio').currentTime>0);
 assert.deepEqual(await page.evaluate(()=>LX.ui.state.musicQueue.map(t=>t.contentId)),[8102,8103]);
 await page.click('#musicNext');await page.waitForFunction(()=>LX.currentMusic()?.contentId===8103);await page.click('#musicPrev');await page.waitForFunction(()=>LX.currentMusic()?.contentId===8102);
 await page.evaluate(()=>document.getElementById('musicAudio').dispatchEvent(new Event('ended')));await page.waitForFunction(()=>LX.currentMusic()?.contentId===8103);await page.waitForTimeout(130);
 assert.equal(await page.evaluate(()=>LX.currentMusic().contentId),8103,'One ended event advances once inside the album');
 await page.evaluate(()=>{LX.ui.close();LX.store.writeLocal(LX.store.keys.musicCollections,[{id:'album-personal',kind:'album',title:'Meu álbum',items:[8101,8102,8103]}]);LX.playMusicCollection('album-personal')});
 await page.waitForFunction(()=>LX.currentMusic()?.contentId===8102);assert.deepEqual(await page.evaluate(()=>LX.ui.state.musicQueue.map(t=>t.contentId)),[8102,8103]);
 assert.equal(await page.evaluate(()=>LX.playMusicEntries([{id:8101,index:0}])),false);assert.match(await page.locator('#toast').textContent(),/ainda não tem áudio/);
 await page.screenshot({path:path.join(output,'album-reproduzindo.png')});

 await page.evaluate(()=>{
  LX.ui.close();LX.musicClose?.();document.getElementById('musicClose').click();
  qaSongs=[{id:8201,type:'Filme',title:'Plex sem arquivo',cover:'assets/lxplus-icon-v34.png',sourceProvider:'plex',metadataUrl:'https://watch.plex.tv/pt-BR/movie/leprechaun',published:true},{id:8202,type:'Filme',title:'Vídeo autorizado QA',cover:'assets/lxplus-icon-v34.png',sourceProvider:'plex',authorizedVideoUrl:location.origin+'/qa-owned-film.mp4',published:true},{id:8299,type:'Filme',title:'Outro catálogo',cover:'assets/lxplus-icon-v34.png',published:true}];
  LX.ui.state.mode='Assistir';LX.ui.state.category='Filmes';LX.ui.renderApp();
 });
 await page.click('[data-film-tab="Parceria com Plex"]');assert.equal(await page.locator('[data-film-tab="Parceria com Plex"]').getAttribute('aria-pressed'),'true');
 const titles=await page.locator('#homeContent').textContent();assert.match(titles,/Plex sem arquivo/);assert.match(titles,/Vídeo autorizado QA/);assert(!titles.includes('Outro catálogo'));
 await page.evaluate(()=>LX.detail(8201));assert(await page.locator('.detail-copy .primary-btn').isDisabled());assert.equal(await page.locator('a:has-text("Assistir no Plex")').count(),0);
 assert.equal(await page.evaluate(()=>LX.plexPartner.nativeRef({mediaKey:'https://watch.plex.tv/pt-BR/movie/leprechaun'})),'');
 assert.equal(await page.evaluate(()=>LX.plexPartner.nativeRef({authorizedStreamUrl:location.origin+'/qa-owned-film.mp4',drm:'widevine'})),'');
 await page.evaluate(()=>{LX.ui.close();LX.play(8202)});await page.waitForSelector('#lxGlobalCinema');
 await page.waitForFunction(()=>{const v=document.getElementById('lxGlobalCinema')?.shadowRoot?.querySelector('video');return v&&!v.paused&&v.currentTime>0});
 const player=await page.evaluate(()=>{const root=document.getElementById('lxGlobalCinema').shadowRoot;return {video:!!root.querySelector('video'),plexIframes:[...root.querySelectorAll('iframe')].filter(f=>/plex\./i.test(f.src)).length,src:root.querySelector('video').getAttribute('src')}});
 assert.equal(player.video,true);assert.equal(player.plexIframes,0);assert.match(player.src,/qa-owned-film.mp4/);
 await page.evaluate(()=>LX.stopMiniPlayer(true));
 for(const width of [390,1280]){await page.setViewportSize({width,height:940});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,'plex-tab-'+width+'.png')})}
 assert.deepEqual(errors,[]);await context.close();

 const interrupted=await browser.newContext();await fixture(interrupted,{delay:4900});const late=await interrupted.newPage();await late.goto(base);await late.waitForFunction(()=>window.qaHydrationStarted&&window.LX?.cloud);
 await late.evaluate(()=>LX.cloud.signOut());await late.waitForTimeout(5300);
 assert.equal(await late.evaluate(()=>LX.ui.state.user),null,'Logout supersedes a slow restore');assert.equal(await late.evaluate(()=>LX.cloud.user()),null);assert.equal(await late.evaluate(()=>localStorage.getItem('sb-qa-auth-token')),null);
 await late.reload();await late.waitForFunction(()=>window.LX?.ui?.state);await late.waitForTimeout(300);assert.equal(await late.evaluate(()=>LX.ui.state.user),null,'Explicit logout survives reopen');await interrupted.close();

 const switched=await browser.newContext();await fixture(switched,{delay:4900});const switching=await switched.newPage();await switching.goto(base);await switching.waitForFunction(()=>window.qaHydrationStarted&&window.LX?.cloud);
 await switching.evaluate(()=>{document.getElementById('loginEmail').value='second@example.invalid';document.getElementById('loginPass').value='qa-password-only';document.getElementById('loginForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))});
 await waitApp(switching);await switching.waitForTimeout(5300);assert.equal(await switching.evaluate(()=>LX.ui.state.user.email),'second@example.invalid');assert.equal(await switching.evaluate(()=>LX.cloud.user().email),'second@example.invalid','Late hydration cannot overwrite a newer account');
 await switched.close();await browser.close();console.log('PASS slow session restore, close/reopen, quota durability, explicit logout, account switch, playable album order/next/prev/ended, personal album, missing audio, Plex sub-tab/native source/coming soon and responsive widths.');
})().catch(error=>{console.error(error);process.exit(1)});
