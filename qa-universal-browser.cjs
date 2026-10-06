const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const out=process.env.LX_QA_OUTPUT||'/tmp/lx-universal-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--single-process'],headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:940}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.LX?.universal?.version===1);
 assert.deepEqual(errors,[],'Bootstrap must remain stable');assert(await page.locator('#loginForm').isVisible(),'Existing login screen remains available');
 await page.evaluate(()=>{
   const me='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000010';window.qaInvocations=[];
   const row={id,kind:'movie',title:'Aventura & Descoberta',description:'Uma história para toda a família. '.repeat(20),cover:'assets/lxplus-icon-v34.png',backdrop:'assets/lxplus-icon-v34.png',year:2026,duration:110,genres:['Aventura','Comédia'],countries:['BR'],external_ids:[{provider:'tmdb',namespace:'movie',external_id:'123'}],metadata:{cast:[{name:'Artista LX',character:'A personagem'}],directors:['Diretor LX'],trailers:[]},published:true};
   function query(){let q={};for(const k of ['select','eq','neq','in','order','limit','update','upsert','delete','insert','gte','lt','range','ilike','or'])q[k]=()=>q;q.maybeSingle=async()=>({data:null,error:null});q.single=q.maybeSingle;q.then=(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject);return q;}
   const channel={on(){return this},subscribe(){return this},track:async()=>{},untrack:async()=>{},unsubscribe:async()=>{},presenceState:()=>({}),send:async()=>{}};
   const payload=(action,body)=>{
    if(action==='search')return {items:[{...row,title:body.q==='second'?'Second response':'Aventura & Descoberta'}, {...row,id:'00000000-0000-4000-8000-000000000011',kind:'book',title:'Livro disponível no catálogo',external_ids:[{provider:'googlebooks',namespace:'volume',external_id:'BookId'}]}],providers:{tmdb:{status:'online'}},hasMore:true};
    if(action==='open')return {item:{...row,id:body.media_id||id},provider_links:[{provider:'plex',url:'https://watch.plex.tv/pt-BR/movie/leprechaun',label:'Assistir no Plex'}],seasons:[],availability:[]};
    if(action==='resolve')return {status:'external',provider_links:[{provider:'plex',url:'https://watch.plex.tv/pt-BR/movie/leprechaun',label:'Assistir no Plex'}]};
    if(action==='dashboard')return {counts:{movie:8,series:1,track:58,book:20},with_playback:2,metadata_only:1,missing_cover:0,missing_metadata:0,offline:1,providers:{tmdb:true,musicbrainz:true,plex:false,plex_scope:'catalog'},jobs:[]};
    if(action==='preview')return {...row,id:undefined};
    if(action==='import')return {item:row,provider_links:[],seasons:[],availability:[],duplicate:false};
    if(action==='home')return {sections:[]};
    if(action==='sources')return {sources:[]};
    return {};
   };
   window.qaDb={from:()=>query(),channel:()=>channel,removeChannel:async()=>{},auth:{getSession:async()=>({data:{session:{user:{id:me}}}}),getUser:async()=>({data:{user:{id:me}}})},rpc:async()=>({data:[],error:null}),functions:{invoke:async(name,{body})=>{qaInvocations.push({name,body});if(body.q==='first')await new Promise(r=>setTimeout(r,800));return {data:payload(body.action,body),error:null};}}};
   LX.cloud.db=()=>qaDb;LX.cloud.user=()=>({id:me,email:'qa@example.invalid',name:'Pessoa QA'});LX.cloud.enabled=()=>true;LX.ui.state.user={id:me,name:'Pessoa QA',email:'qa@example.invalid',admin:true};LX.ui.state.screen='app';LX.ui.state.mode='Assistir';LX.ui.state.category='Início';LX.ui.state.query='';
   LX.data.catalog=()=>[{id:100,title:'Aventura local',type:'Filme',cover:'assets/lxplus-icon-v34.png',published:true}];
   document.getElementById('app').classList.remove('hidden');document.querySelectorAll('#auth,#profiles,#admin').forEach(e=>e.classList.add('hidden'));document.body.dataset.lxSurface='watch';
 });
 const overflow=async()=>page.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth+1,modal:document.getElementById('modal').scrollWidth>document.getElementById('modal').clientWidth+1}));
 for(const width of [320,390,820,1280,1920]){
   await page.setViewportSize({width,height:940});
   await page.evaluate(()=>{LX.ui.state.query='Aventura';LX.universal.state.filter='all';LX.universal.renderSearch('Aventura');});
   assert((await page.textContent('#homeContent')).includes('Aventura local'),'Instant local search at '+width);
   await page.waitForFunction(()=>!LX.universal.state.busy);
   assert.equal(await page.locator('[data-uc-result]').count(),3);assert.equal(await page.locator('#hero').isVisible(),false,'Search must not leave an empty hero');assert.equal((await overflow()).page,false,'Search overflow '+width);
   await page.screenshot({path:path.join(out,'search-'+width+'.png')});
   await page.click('[data-uc-filter="book"]');await page.waitForFunction(()=>!LX.universal.state.busy);
   assert((await page.evaluate(()=>qaInvocations)).some(i=>i.body.filter==='book'),'Universal book filter');
   await page.click('[data-uc-result="0"]');await page.waitForSelector('.lx-uc-detail');
   assert.equal(await page.locator('[data-uc-play]').count(),0,'Metadata-only title must not open a broken player');
   assert.equal(await page.locator('a:has-text("Assistir no Plex")').count(),0,'The Plex catalog no longer redirects playback to an external player');
   assert.deepEqual(await overflow(),{page:false,modal:false},'Detail overflow '+width);await page.waitForFunction(()=>document.getElementById('modal').scrollTop===0);
   await page.screenshot({path:path.join(out,'detail-'+width+'.png')});
   await page.click('[data-uc-save]');await page.waitForFunction(()=>document.querySelector('[data-uc-save]').getAttribute('aria-pressed')==='true');
   await page.click('[data-uc-close]');await page.evaluate(()=>{LX.ui.state.screen='admin';LX.ui.state.adminPage='contenthub';document.getElementById('app').classList.add('hidden');document.getElementById('admin').classList.remove('hidden');LX.universal.renderAdmin();});
   await page.waitForSelector('.lx-uc-stats');assert.equal((await overflow()).page,false,'Admin overflow '+width);
   await page.fill('#lxUcImportUrl','https://www.themoviedb.org/movie/123');await page.click('[data-uc-preview]');await page.waitForSelector('.lx-uc-preview');
   assert((await page.textContent('#lxUcPreview')).includes('Metadados: ✓'));assert.equal((await overflow()).page,false,'Preview overflow '+width);
   await page.screenshot({path:path.join(out,'admin-'+width+'.png')});
   await page.evaluate(()=>{document.getElementById('admin').classList.add('hidden');document.getElementById('app').classList.remove('hidden');LX.ui.state.screen='app';LX.ui.state.query='';LX.ui.state.adminPage='dashboard';});
 }
 // Slow old queries cannot replace a newer result or reopen a dismissed dialog.
 await page.evaluate(()=>{LX.ui.state.query='first';LX.universal.renderSearch('first');});await page.waitForTimeout(350);
 await page.evaluate(()=>{LX.ui.state.query='second';LX.universal.renderSearch('second');});await page.waitForFunction(()=>!LX.universal.state.busy);await page.waitForTimeout(600);
 assert((await page.textContent('#homeContent')).includes('Second response'));assert(!(await page.textContent('#homeContent')).includes('Resultados para “first”'));
 const html=await page.evaluate(()=>LX.universal.card({title:'<img src=x onerror=evil()>',kind:'movie'},0));assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));
 const controls=await page.evaluate(async()=>{
   const host=document.createElement('div');host.attachShadow({mode:'open'}).innerHTML='<video id="qaAdaptive"></video><div id="settings"></div>';document.body.append(host);const video=host.shadowRoot.querySelector('video');
   class Player{
     static isBrowserSupported(){return true}async attach(){}configure(){}addEventListener(name,cb){this.errorCallback=cb}async load(...args){this.args=args}
     getVariantTracks(){return [{height:1080,bandwidth:4000},{height:720,bandwidth:2000}]}getAudioLanguagesAndRoles(){return [{language:'pt-BR',role:''},{language:'en',role:''}]}getTextTracks(){return [{language:'pt-BR',label:'Português'}]}
     selectAudioLanguage(language){this.audio=language}selectTextTrack(track){this.text=track.language}setTextTrackVisibility(value){this.visible=value}selectVariantTrack(track){this.height=track.height}async destroy(){this.destroyed=true}
   }
   window.shaka={Player};await LX.adaptive.load(video,'https://media.example.com/stream','application/dash+xml');const player=video.__lxShaka;
   host.shadowRoot.querySelector('[data-variant="1"]').click();host.shadowRoot.querySelector('[data-audio="1"]').click();host.shadowRoot.querySelector('[data-text="0"]').click();
   const selected={mime:player.args[2],quality:player.height,audio:player.audio,text:player.text,visible:player.visible};await LX.adaptive.destroy(video);selected.destroyed=player.destroyed;host.remove();return selected;
 });
 assert.deepEqual(controls,{mime:'application/dash+xml',quality:720,audio:'en',text:'pt-BR',visible:true,destroyed:true});
 await page.evaluate(async()=>{
   LX.universal.state.detail={item:{id:'00000000-0000-4000-8000-000000000010',kind:'movie',title:'Título em reprodução'},provider_links:[]};window.qaResolveCalls=[];
   qaDb.functions.invoke=async(name,{body})=>{qaResolveCalls.push(body);return {data:{status:'playable',source:{id:body.exclude?.length?'source-b':'source-a',source_type:'direct',url:'https://media.example.com/owned.mp4'}},error:null};};
   LX.play=async()=>{document.getElementById('lxGlobalCinema')?.remove();const host=document.createElement('div');host.id='lxGlobalCinema';host.attachShadow({mode:'open'}).innerHTML='<video></video>';document.body.append(host);};
   await LX.universal.play();LX.universal.state.detail={item:{id:'00000000-0000-4000-8000-000000000099',kind:'movie',title:'Outra ficha'}};
   document.getElementById('lxGlobalCinema').shadowRoot.querySelector('video').dispatchEvent(new Event('error'));
 });
 await page.waitForFunction(()=>qaResolveCalls.length>=2);
 assert.equal((await page.evaluate(()=>qaResolveCalls[1])).media_id,'00000000-0000-4000-8000-000000000010','Failover must retain the playing title after another detail is opened');
 assert.deepEqual((await page.evaluate(()=>qaResolveCalls[1])).exclude,['source-a']);
 assert.deepEqual(errors,[],'Browser runtime errors');console.log('PASS Universal browser: login bootstrap; instant local + federated results; filters; stale response suppression; metadata-only availability; external Plex playback removed; saved state; Admin preview; 320/390/820/1280/1920 widths; XSS escaping; adaptive quality/audio/subtitles and MIME hint; failover retains the playing title.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
