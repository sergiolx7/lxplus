/* Loading regressions in the real canonical shell; provider traffic is mocked. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const base='http://127.0.0.1:8765/';
async function installDb(context,{stallBoot=false}={}){
 await context.addInitScript(({stallBoot})=>{
  const user={id:'00000000-0000-4000-8000-000000000009',email:'loading@example.invalid',user_metadata:{name:'Loading QA'}};
  window.qaCatalogMode=stallBoot?'stall':'normal';window.qaCatalogCalls=0;window.qaPendingCatalog=[];window.qaCatalogSignals=[];
  window.qaRows=[{id:8001,payload:{type:'Música',title:'Faixa salva',artist:'LX QA',cover:'assets/lxplus-icon-v34.png',mediaKey:'spotify:track:1234567890123456789012'},published:true,updated_at:'2026-10-06T00:00:00Z'}];
  const channel={on(){return this},subscribe(){return this},topic:'lxplus-public-v256'};
  window.qaDb={
   from(table){const q={};let signal;for(const name of ['select','order','eq','range','limit','upsert','insert','update','delete'])q[name]=()=>q;
    q.abortSignal=value=>{signal=value;return q};
    q.maybeSingle=async()=>({data:table==='lx_profiles'?{user_id:user.id,name:'Loading QA',approved:true,approval_status:'approved'}:table==='lx_user_state'?{data:{history:{'safe':{position:42}},musicCollections:[]}}:null,error:null});
    q.then=(ok,bad)=>{
     if(table!=='lx_catalog')return Promise.resolve({data:[],error:null}).then(ok,bad);
     qaCatalogCalls++;qaCatalogSignals.push(signal);
     if(qaCatalogMode==='throw')return Promise.reject(new Error('Fixture network exception')).then(ok,bad);
     if(qaCatalogMode==='error')return Promise.resolve({data:null,error:{message:'Fixture failed page'}}).then(ok,bad);
     if(qaCatalogMode==='stall')return new Promise(resolve=>qaPendingCatalog.push(resolve)).then(ok,bad);
     return Promise.resolve({data:qaRows,error:null}).then(ok,bad);
    };return q;
   },channel:()=>channel,removeChannel:async()=>{},rpc:async()=>({data:false,error:null}),
   functions:{invoke:async()=>({data:{items:[],sections:[]},error:null})},
   auth:{getSession:async()=>({data:{session:{user}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})}
  };
  window.supabase={createClient:()=>qaDb};
 },{stallBoot});
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--autoplay-policy=no-user-gesture-required'],headless:true});
 const errors=[],context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
 let allowVideo=false;
 await context.route('**/*',route=>{const url=route.request().url();if(url.includes('/qa-loading-video.mp4'))return allowVideo?route.fulfill({contentType:'video/mp4',body:fs.readFileSync(path.join(__dirname,'tools/catalog-qa/owned-video.mp4'))}):undefined;if(url.startsWith('https://open.spotify.com/embed/'))return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Spotify transport fixture</title>'});return url.startsWith(base)?route.continue():route.abort()});
 await installDb(context,{stallBoot:true});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.LX?.ui?.state?.screen==='app');
 assert.equal(await page.evaluate(()=>LX.cloud.catalogState()),'loading','A stalled catalog must not block a validated persisted session');
 assert.equal(await page.evaluate(()=>LX.store.read(LX.store.keys.history).safe.position),42,'Cloud history remains intact');
 await page.clock.install();
 await page.clock.fastForward(20001);await page.waitForFunction(()=>LX.cloud.catalogState()==='error');
 assert(await page.evaluate(()=>qaCatalogSignals[0].aborted),'The deadline aborts the actual catalog request');
 await page.evaluate(async()=>{qaCatalogMode='normal';await LX.cloud.retryCatalog()});assert.equal(await page.evaluate(()=>LX.data.catalog()[0].id),8001);
 // A late answer from the timed-out operation must never replace a newer load.
 await page.evaluate(()=>qaPendingCatalog.splice(0).forEach(resolve=>resolve({data:[{id:9999,payload:{title:'Resposta atrasada',type:'Música'}}],error:null})));await page.waitForTimeout(30);
 assert.equal(await page.evaluate(()=>LX.data.catalog()[0].id),8001);
 const dedup=await page.evaluate(async()=>{qaCatalogCalls=0;qaCatalogMode='stall';const a=LX.cloud.retryCatalog(),b=LX.cloud.retryCatalog(),c=LX.cloud.retryCatalog();await new Promise(resolve=>queueMicrotask(resolve));await new Promise(resolve=>queueMicrotask(resolve));window.qaRetryLoads=[a,b,c];return true});assert(dedup);
 await page.waitForFunction(()=>qaCatalogCalls===1);await page.evaluate(()=>qaPendingCatalog.splice(0).forEach(resolve=>resolve({data:qaRows,error:null})));assert.deepEqual(await page.evaluate(()=>Promise.all(qaRetryLoads)),[true,true,true]);
 for(const mode of ['throw','error']){await page.evaluate(async mode=>{qaCatalogMode=mode;await LX.cloud.retryCatalog()},mode);assert.equal(await page.evaluate(()=>LX.cloud.catalogState()),'error');assert.equal(await page.evaluate(()=>LX.data.catalog()[0].id),8001)}
 await page.evaluate(async()=>{qaCatalogMode='normal';await LX.cloud.retryCatalog();LX.ui.state.mode='Ouvir';LX.ui.renderApp()});
 // An official SDK that never invokes createController gets a usable iframe fallback.
 await page.evaluate(()=>{LX.spotifyEmbed.api={createController(){}};LX.ensureSpotifyEmbed=async()=>true;LX.music(8001,0,false)});
 await page.waitForFunction(()=>LX.spotifyEmbed?.api&&document.getElementById('musicAudio').dataset.loadingTrackTicket);await page.waitForTimeout(100);await page.clock.fastForward(6501);await page.waitForFunction(()=>document.getElementById('musicProviderFrame').dataset.provider==='spotify-fallback');
 assert.equal(await page.locator('#musicPlaybackKind.is-loading').count(),0);assert(await page.locator('#musicProviderFrame').isVisible());
 // Album transport follows official playback events, including an ended track.
 await page.evaluate(()=>{
  window.qaSpotifyListeners={};window.qaSpotifyLoads=[];window.qaSpotifyUri='';window.qaSpotifyPosition=0;
  const ctrl={loadEntity(uri){qaSpotifyUri=uri;qaSpotifyPosition=0;qaSpotifyLoads.push(uri)},pause(){qaSpotifyListeners.playback_update?.({data:{playingURI:qaSpotifyUri,isPaused:true,isBuffering:false,position:qaSpotifyPosition,duration:3000}})},play(){qaSpotifyListeners.playback_started?.({data:{playingURI:qaSpotifyUri}})},addListener(name,fn){qaSpotifyListeners[name]=fn},seek(at){qaSpotifyPosition=at*1000}};
  LX.spotifyEmbed.api={createController(_el,options,callback){qaSpotifyUri=options.uri;qaSpotifyLoads.push(options.uri);callback(ctrl)}};
  const a={id:8101,type:'Música',title:'Primeira',artist:'LX QA',album:'Álbum QA',cover:'assets/lxplus-icon-v34.png',mediaKey:'spotify:track:1111111111111111111111',published:true},b={...a,id:8102,title:'Segunda',mediaKey:'spotify:track:2222222222222222222222'};
  LX.store.writeLocal(LX.store.keys.catalog,[a,b]);LX.playMusicEntries([a,b].map(x=>({...x,contentId:x.id,index:0,sourceMediaKey:x.mediaKey})));
 });
 await page.waitForFunction(()=>LX.musicPlaybackSource?.kind==='spotify'&&qaSpotifyLoads.length===1);await page.clock.fastForward(81);
 await page.evaluate(()=>{qaSpotifyPosition=3000;qaSpotifyListeners.playback_update({data:{playingURI:qaSpotifyUri,isPaused:true,isBuffering:false,position:3000,duration:3000}})});await page.clock.fastForward(1);
 await page.waitForFunction(()=>LX.ui.state.musicIndex===1&&qaSpotifyLoads.at(-1)==='spotify:track:2222222222222222222222');
 await page.evaluate(()=>qaSpotifyListeners.playback_update({data:{playingURI:'spotify:track:1111111111111111111111',isPaused:false,isBuffering:false,position:100,duration:3000}}));assert.equal(await page.evaluate(()=>LX.ui.state.musicIndex),1,'Late events from the previous source cannot select a different track');
 await page.evaluate(()=>document.getElementById('musicPrev').click());await page.waitForFunction(()=>LX.ui.state.musicIndex===0&&qaSpotifyLoads.at(-1)==='spotify:track:1111111111111111111111');
 await page.evaluate(()=>document.getElementById('musicNext').click());await page.waitForFunction(()=>LX.ui.state.musicIndex===1&&qaSpotifyLoads.at(-1)==='spotify:track:2222222222222222222222');
 // A video connection that never returns ends its spinner and can be retried.
 await page.evaluate(async()=>{LX.ui.state.mode='Assistir';const item={id:8002,type:'Filme',title:'Vídeo QA',cover:'assets/lxplus-icon-v34.png',mediaKey:location.origin+'/qa-loading-video.mp4',published:true};LX.store.writeLocal(LX.store.keys.catalog,[...LX.data.catalog(),item]);await LX.play(8002)});
 await page.waitForSelector('#lxGlobalCinema');await page.clock.fastForward(20001);
 await page.waitForFunction(()=>!document.getElementById('lxGlobalCinema').shadowRoot.querySelector('#error').classList.contains('hide'));
 assert(await page.evaluate(()=>document.getElementById('lxGlobalCinema').shadowRoot.querySelector('#loading').classList.contains('hide')));
 allowVideo=true;await page.evaluate(()=>document.getElementById('lxGlobalCinema').shadowRoot.querySelector('#retry').click());
 await page.waitForFunction(()=>document.getElementById('lxGlobalCinema').shadowRoot.querySelector('video').readyState>=2);
 assert(await page.evaluate(()=>document.getElementById('lxGlobalCinema').shadowRoot.querySelector('#error').classList.contains('hide')));assert.deepEqual(errors,[]);await context.close();
 // Verify the shipped local SDK works without either CDN.
 const sdkContext=await browser.newContext({serviceWorkers:'block'}),sdkPage=await sdkContext.newPage();
 await sdkContext.route('**/*',route=>{const url=route.request().url();if(url.includes('.supabase.co/rest/v1/'))return route.fulfill({contentType:'application/json',body:url.includes('lx_settings')?'null':'[]'});return url.startsWith(base)?route.continue():route.abort()});
 await sdkPage.goto(base,{waitUntil:'domcontentloaded'});await sdkPage.waitForFunction(()=>window.supabase?.createClient&&LX.cloud.catalogState()==='ready');
 assert.equal(await sdkPage.locator('script[src^="vendor/supabase-2.117.2.js"]').count(),1);assert.equal(await sdkPage.locator('script[src*="cdn.jsdelivr.net/npm/@supabase"],script[src*="unpkg.com/@supabase"]').count(),0);await sdkContext.close();
 // Failure before the SDK is ready must leave idle/loading and allow reconnection.
 const offline=await browser.newContext({serviceWorkers:'block'});await offline.route('**/*',route=>{const url=route.request().url();return url.startsWith(base)&&!url.includes('/vendor/supabase-')?route.continue():route.abort()});const failed=await offline.newPage();await failed.goto(base,{waitUntil:'domcontentloaded'});await failed.waitForFunction(()=>LX.cloud.catalogState()==='error');
 const recovered=await failed.evaluate(async()=>{
  const channel={topic:'lxplus-public-v256',on(){return this},subscribe(){return this}},client={
   from(table){const q={};for(const name of ['select','order','range','eq','limit','abortSignal'])q[name]=()=>q;q.maybeSingle=async()=>({data:null,error:null});q.then=(ok,bad)=>Promise.resolve({data:table==='lx_catalog'?[{id:8003,payload:{title:'Fonte recuperada',type:'Música',mediaKey:'spotify:track:1234567890123456789012'}}]:[],error:null}).then(ok,bad);return q},channel:()=>channel,
   auth:{onAuthStateChange:()=>({}),getSession:async()=>({data:{session:null},error:null})}
  };
  LX.ensureSupabase=async()=>{window.supabase={createClient:()=>client};return true};await LX.retryMusicCatalog();return {state:LX.cloud.catalogState(),id:LX.data.catalog()[0].id};
 });assert.deepEqual(recovered,{state:'ready',id:8003});
 await offline.close();await browser.close();console.log('PASS loading: local pinned SDK; SDK startup failure ends loading; approved session independent of stalled catalog; 20s abort; late-result guard; concurrent dedup; cache preserved on errors; Spotify controller fallback and album order/end/previous/next; stalled video timeout and working retry.');
})().catch(error=>{console.error(error);process.exit(1)});
