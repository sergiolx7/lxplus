/* Catalog population: paging, missing-media guards and owner upload entry. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const output=process.env.LX_QA_OUTPUT||'/tmp/lx-catalog-pending-qa';fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--single-process'],headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:940}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
 await page.addInitScript(()=>{
  window.qaRows=[];window.qaRanges=[];window.qaFailPage=false;
  const channel={on(){return this},subscribe(){return this},unsubscribe:async()=>{}};
  window.qaDb={from(table){let range=[0,499];const q={};for(const key of ['select','eq','neq','in','order','limit','update','upsert','delete','insert','gte','lt'])q[key]=()=>q;q.range=(a,b)=>{range=[a,b];return q};q.maybeSingle=async()=>({data:null,error:null});q.then=(a,b)=>{if(table==='lx_catalog')qaRanges.push(range);return Promise.resolve({data:table==='lx_catalog'?qaRows.slice(range[0],range[1]+1):[],error:table==='lx_catalog'&&qaFailPage&&range[0]===500?{message:'fixture page failure'}:null}).then(a,b)};return q},channel:()=>channel,removeChannel:async()=>{},rpc:async()=>({data:[],error:null}),functions:{invoke:async()=>({data:{items:[],sections:[]},error:null})},auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
  window.supabase={createClient:()=>qaDb};
 });
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.LX?.cloud?.retryCatalog&&window.LX?.universal);
 const paging=await page.evaluate(async()=>{
  qaRows=Array.from({length:1205},(_,i)=>({id:i+1,payload:{title:'Título '+i,type:'Filme',cover:'assets/lxplus-icon-v34.png'},published:true,updated_at:'2026-10-06T00:00:00Z'}));qaRanges=[];await LX.cloud.retryCatalog();const count=LX.data.catalog().length,ranges=[...qaRanges];qaFailPage=true;await LX.cloud.retryCatalog();const preserved=LX.data.catalog().length,status=LX.cloud.catalogState();qaFailPage=false;return {count,ranges,preserved,status};
 });
 assert.deepEqual(paging,{count:1205,ranges:[[0,499],[500,999],[1000,1499]],preserved:1205,status:'error'});
 if(process.env.LX_QA_CATALOG_FIXTURE){
  const full=JSON.parse(fs.readFileSync(process.env.LX_QA_CATALOG_FIXTURE,'utf8'));
  const cache=await page.evaluate(rows=>{localStorage.setItem('qa-account-reserve','x'.repeat(200000));LX.store.writeLocal(LX.store.keys.catalog,rows);return {count:LX.data.catalog().length,persisted:JSON.parse(localStorage.getItem('lx16_catalog')).length};},full);
  assert.deepEqual(cache,{count:full.length,persisted:full.length},'The expanded real catalog must fit alongside account data');
 }
 const quota=await page.evaluate(()=>{LX.store.writeLocal('qa-quota',{version:'old'});const original=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Fixture quota full','QuotaExceededError')};try{LX.store.writeLocal('qa-quota',{version:'new'});return LX.store.read('qa-quota')}finally{Storage.prototype.setItem=original;localStorage.removeItem('lx16_qa-quota');}});
 assert.deepEqual(quota,{version:'new'},'A full disk cache must not replace fresh in-memory data with stale data');
 await page.evaluate(()=>{
  window.qaItems=['Filme','Série','Anime','Dorama','Livro','Música'].map((type,i)=>({id:7000000000100+i,type,title:'Catálogo '+type,artist:type==='Música'?'Artista QA':'',genre:'Geral',cover:'assets/lxplus-icon-v34.png',banner:'assets/lxplus-icon-v34.png',desc:'Disponível em breve no LX Plus.',catalogOnly:true,metadataOnly:true,availability:'coming_soon',published:true,mediaKey:'',episodes:[],chapters:[],tracks:type==='Música'?[{title:'Faixa QA',mediaKey:''}]:[],metadataUrl:type==='Música'?'https://itunes.apple.com/br/album/example/123?i=456':'https://watch.plex.tv/pt-BR/movie/leprechaun'}));
  qaItems.push({id:102,title:'Música com arquivo',type:'Música',genre:'Geral',cover:'assets/lxplus-icon-v34.png',mediaKey:'https://media.example.invalid/owned.wav',published:true},{id:103,title:'Filme antigo sem arquivo',type:'Filme',cover:'assets/lxplus-icon-v34.png',published:true});
  LX.data.catalog=()=>qaItems;LX.cloud.db=()=>qaDb;LX.cloud.isAdmin=()=>true;LX.ui.state.user={id:'00000000-0000-4000-8000-000000000001',name:'QA',email:'qa@example.invalid',admin:true};LX.ui.state.screen='app';LX.ui.state.mode='Assistir';LX.ui.state.category='Início';LX.ui.state.query='';document.getElementById('app').classList.remove('hidden');document.querySelectorAll('#auth,#profiles,#admin').forEach(x=>x.classList.add('hidden'));
 });
 for(const width of [320,390,820,1280,1920]){
  await page.setViewportSize({width,height:940});
  for(let i=0;i<6;i++){
   await page.evaluate(i=>LX.detail(7000000000100+i),i);await page.waitForSelector('.lx-catalog-pending-note');
   const primary=page.locator('.detail-copy .primary-btn');assert(await primary.isDisabled());assert.equal(await primary.textContent(),'Disponível em breve');assert.equal(await page.locator('.lx-watch-friend-btn').count(),0);
   assert.equal(await page.locator('button:has-text("Adicionar arquivo ou link")').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Page overflow '+width);
   assert.equal(await page.evaluate(()=>document.getElementById('modal').scrollWidth>document.getElementById('modal').clientWidth+1),false,'Detail overflow '+width);
  }
  assert.equal(await page.locator('.lx-catalog-store-link img').count(),1);await page.screenshot({path:path.join(output,'pending-music-'+width+'.png')});
  await page.evaluate(()=>LX.detail(7000000000100));await page.screenshot({path:path.join(output,'pending-film-'+width+'.png')});
 }
 await page.evaluate(async()=>{LX.primary(7000000000100);await LX.play(7000000000100);await LX.read(7000000000104);LX.music(7000000000105);});
 assert.equal(await page.locator('#lxGlobalCinema').count(),0);assert.equal(await page.locator('#musicDock').isVisible(),false);
 await page.evaluate(()=>LX.detail(103));assert(await page.locator('.detail-copy .primary-btn').isDisabled(),'Existing missing-media films also show upcoming');
 await page.evaluate(()=>LX.detail(7000000000105));
 await page.click('button:has-text("Adicionar arquivo ou link")');await page.waitForSelector('#cTitle');assert.equal(await page.inputValue('#cTitle'),'Catálogo Música');
 await page.evaluate(async()=>{LX.data.saveCatalogItem=async x=>{window.qaSaved=x;qaItems[qaItems.findIndex(i=>i.id===x.id)]=x;return x};await document.getElementById('contentForm').onsubmit({preventDefault(){}});});
 assert.deepEqual(await page.evaluate(()=>({published:qaSaved.published,metadataOnly:qaSaved.metadataOnly,availability:qaSaved.availability,year:qaSaved.year})),{published:true,metadataOnly:true,availability:'coming_soon',year:''});
 await page.evaluate(()=>LX.admin.edit(7000000000105));await page.locator('details:has(#cAuthorizedAudio) summary').click();await page.waitForSelector('#cAuthorizedAudio');await page.fill('#cAuthorizedAudio','https://media.example.invalid/owned.mp3');
 await page.evaluate(async()=>{await document.getElementById('contentForm').onsubmit({preventDefault(){}})});
 assert.deepEqual(await page.evaluate(()=>({metadataOnly:qaSaved.metadataOnly,availability:qaSaved.availability,pending:LX.catalogPending(qaSaved)})),{metadataOnly:false,availability:'available',pending:false});
 assert.equal(await page.evaluate(()=>qaSaved.desc.includes('Disponível em breve')),false,'Uploaded source clears the generated waiting description');
 await page.evaluate(()=>{delete qaItems.find(i=>i.id===7000000000105).authorizedAudioUrl;});
 await page.evaluate(()=>{LX.ui.close();LX.ui.state.screen='app';LX.ui.state.mode='Ouvir';document.getElementById('admin').classList.add('hidden');document.getElementById('app').classList.remove('hidden');LX.music(102,0,false,[102,7000000000105]);});
 assert.deepEqual(await page.evaluate(()=>LX.ui.state.musicQueue.map(t=>t.contentId)),[102],'Upcoming music must stay out of playable queues');
 assert.deepEqual(errors,[]);console.log('PASS populated catalog: 1,205 paged records; failed page preserves cache; six metadata-only types; no video/reader/audio launch; owner editor; official music badge; playable queue preserved; 320/390/820/1280/1920 widths.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
