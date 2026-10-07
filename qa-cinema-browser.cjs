const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const {fixture,waitApp}=require('./qa-open-films-browser.cjs');
const output=process.env.LX_QA_OUTPUT||'/tmp/lx-cinema-qa';fs.mkdirSync(output,{recursive:true});
const feed=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog/recent-films.json'))).items;
const free=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog/open-films.json'))).items;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']});
 const context=await browser.newContext({viewport:{width:390,height:844}});await fixture(context);
 await context.route('https://www.youtube.com/embed/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>body{background:#090a11;color:#ccc;display:grid;place-items:center;height:90vh;font:20px Arial}</style><p>YouTube · Fixture de teste</p>'}));
 await context.addInitScript(()=>{
  window.qaYT={players:[],position:0,duration:6000,state:1};
  window.YT={Player:class{
   constructor(frame,options){this.frame=frame;this.events=options.events;this.position=Number(new URL(frame.src).searchParams.get('start'))||0;this.state=1;this.destroyed=false;qaYT.players.push(this);qaYT.active=this;setTimeout(()=>{if(!this.destroyed){this.events.onReady({target:this});this.events.onStateChange({data:1})}},0)}
   getCurrentTime(){return this.position}getDuration(){return qaYT.duration}getPlayerState(){return this.state}
   seekTo(time){this.position=time}destroy(){this.destroyed=true;this.frame.remove()}loadVideoById(data){this.position=data.startSeconds;this.state=1;this.events.onStateChange({data:1})}
  }};
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto('http://127.0.0.1:8765/');await waitApp(page);
 await page.evaluate(({feed,free})=>{
  const extra=[{id:70001,type:'Dorama',title:'Dorama QA',year:2025,cover:feed[0].cover,published:true},{id:70002,type:'Série',title:'Série QA',year:2024,cover:feed[1].cover,published:true},{id:70003,type:'Anime',title:'Anime QA',year:2025,cover:feed[2].cover,published:true},{id:70004,type:'Filme',title:'Longa do proprietário',year:2021,duration:'1h40min',mediaKey:location.origin+'/qa-owned-film.mp4',cover:feed[0].cover,published:true}];
  window.qaFilms=[...feed,...free,...extra];LX.data.catalog=()=>qaFilms;LX.ui.state.mode='Assistir';LX.ui.state.category='Início';LX.ui.renderApp();
 },{feed,free});
 const order=await page.locator('[data-cinema-section]').evaluateAll(nodes=>nodes.map(n=>n.dataset.cinemaSection));
 assert.deepEqual(order,['recent-films','doramas','series','anime']);
 assert.equal(await page.locator('[data-cinema-section="recent-films"] .card').count(),12);
 assert.equal(await page.locator('[data-cinema-section="doramas"] .card').count(),1);
 assert(!(await page.locator('[data-cinema-section="recent-films"]').textContent()).includes('Duck and Cover'));
 for(const width of [390,820,1280]){
  await page.setViewportSize({width,height:940});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const cards=await page.locator('[data-cinema-section="recent-films"] .card').evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.querySelector('.card-art').getBoundingClientRect().height})));assert(cards.every(c=>c.w>=100&&c.h>c.w));
  await page.screenshot({path:path.join(output,'catalogo-'+width+'.png'),fullPage:true});
 }
 await page.click('[data-cat="Filmes"]');assert.equal(await page.locator('[data-cinema-section="historical"]').count(),1);assert.equal(await page.locator('[data-cinema-section="shorts"]').count(),1);
 await page.click('[data-cat="Doramas"]');assert.equal(await page.locator('.lx-cinema-grid .card').count(),1);assert.equal(await page.locator('[data-cinema-section="recent-films"]').count(),0);
 await page.evaluate(id=>LX.detail(id),feed[0].id);assert.match(await page.locator('.lx-cinema-provider-credit').textContent(),/YouTube/);
 await page.evaluate(id=>{LX.ui.close();const h=LX.data.history();h[id]={position:123,duration:6000,context:'main',progress:2};LX.store.write(LX.store.keys.history,h);LX.play(id)},feed[0].id);
 await page.waitForFunction(()=>window.qaYT.active&&!qaYT.active.destroyed);await page.evaluate(()=>{LX.config.features.nativePlaybackOnly=false});
 const frame=page.locator('#lxGlobalCinema iframe');assert.equal(await frame.getAttribute('referrerpolicy'),'strict-origin-when-cross-origin');assert.match(await frame.getAttribute('src'),/start=123/);
 assert.equal(await page.locator('#lxGlobalCinema').evaluate(node=>node.shadowRoot.querySelector('header').getBoundingClientRect().bottom<=node.shadowRoot.querySelector('iframe').getBoundingClientRect().top),true,'LX header never covers provider controls');
 await page.locator('#lxGlobalCinema #forward').click();assert.equal(await page.evaluate(()=>qaYT.active.position),133);
 await page.locator('#lxGlobalCinema #rewind').click();assert.equal(await page.evaluate(()=>qaYT.active.position),123);
 await page.evaluate(()=>{qaYT.active.position=150;qaYT.active.state=2;qaYT.active.events.onStateChange({data:2})});
 assert.equal(await page.evaluate(id=>LX.data.history()[id].position,feed[0].id),150);
 await page.evaluate(()=>qaYT.active.events.onError({data:150}));assert.match(await page.locator('#lxGlobalCinema #status').textContent(),/restringiu/);assert.equal(await page.locator('#lxGlobalCinema #retry').isVisible(),true);
 await page.locator('#lxGlobalCinema #retry').click();assert.equal(await page.locator('#lxGlobalCinema #retry').isVisible(),false);
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.locator('#lxGlobalCinema').evaluate(node=>node.shadowRoot.querySelector('section').scrollWidth>innerWidth+1),false)}
 await page.keyboard.press('Escape');assert.equal(await page.locator('#lxGlobalCinema').count(),0);assert.equal(await page.evaluate(()=>qaYT.active.destroyed),true);
 assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('lx-player-open')),false);
 const episodic={id:70100,type:'Dorama',title:'Episódios QA',published:true,cover:feed[0].cover,episodes:[{season:1,number:1,title:'Primeiro',mediaKey:feed[0].mediaKey},{season:1,number:2,title:'Segundo',mediaKey:feed[1].mediaKey}]};
 await page.evaluate(item=>{qaFilms.push(item);LX.play(item.id,1,1)},episodic);await page.waitForSelector('#lxGlobalCinema #next');await page.locator('#lxGlobalCinema #next').click();
 await page.waitForFunction(()=>document.getElementById('lxGlobalCinema')?.shadowRoot?.querySelector('.title small')?.textContent.includes('Episódio 2'));
 assert.equal(await page.evaluate(()=>qaYT.players.filter(p=>!p.destroyed).length),1,'Only one transport remains active');
 await page.evaluate(()=>LX.stopMiniPlayer(true));assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS stacked catalogs, short/archive separation, real poster ratios, 390/820/1280 widths, credits, official iframe identity, resume, seek, progress, errors/retry, cleanup and next episode. YouTube transport events use a test fixture.');
})().catch(e=>{console.error(e);process.exit(1)});
