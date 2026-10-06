const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const output=process.env.LX_QA_OUTPUT||'/tmp/lx-open-films';fs.mkdirSync(output,{recursive:true});
const base='http://127.0.0.1:8765/';
const realStreams=process.env.LX_QA_REAL_STREAMS==='1';
const imageCache=process.env.LX_QA_COVERS;
async function fixture(context,{delay=0,seed=true}={}){
 await context.route('**/*',route=>{const url=route.request().url();if(url.includes('/qa-owned-film.mp4'))return route.fulfill({contentType:'video/mp4',body:fs.readFileSync(path.join(__dirname,'tools/catalog-qa/owned-video.mp4'))});if(imageCache){const key=require('node:crypto').createHash('sha256').update(url).digest('hex'),file=path.join(imageCache,key+'.image');if(fs.existsSync(file))return route.fulfill({contentType:fs.readFileSync(path.join(imageCache,key+'.mime'),'utf8'),body:fs.readFileSync(file)})}if(realStreams&&new URL(url).protocol==='https:'&&/(^|\.)archive\.org$/.test(new URL(url).hostname))return route.continue();return url.startsWith(base)?route.continue():route.abort()});
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
 let proxy;if(realStreams&&process.env.HTTPS_PROXY){const p=new URL(process.env.HTTPS_PROXY);proxy={server:p.protocol+'//'+p.host,bypass:'127.0.0.1,localhost',...(p.username?{username:decodeURIComponent(p.username),password:decodeURIComponent(p.password)}:{})}}
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,proxy,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--autoplay-policy=no-user-gesture-required'],headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:realStreams});await fixture(context);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(base);await waitApp(page);
 const films=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog/open-films.json'),'utf8')).items;
 assert(films.length>0);
 await page.evaluate(films=>{window.qaFilms=films;LX.data.catalog=()=>[...qaFilms,{id:8101,type:'Filme',title:'Plex ainda sem mídia',cover:'assets/lxplus-icon-v34.png',sourceProvider:'plex',metadataUrl:'https://watch.plex.tv/pt-BR/movie/leprechaun',published:true}];LX.ui.state.mode='Assistir';LX.ui.state.category='Filmes';LX.ui.renderApp();},films);
 await page.click('[data-film-tab="Cinema livre"]');assert.equal(await page.locator('[data-film-tab="Cinema livre"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#hero').isHidden(),true,'Free-film grid is reachable without an empty hero');
 assert.match(await page.locator('#homeContent').textContent(),new RegExp(films.length+' títulos disponíveis'));
 assert.match(await page.locator('#homeContent').textContent(),/Blender Studio/);assert.match(await page.locator('#homeContent').textContent(),/Acervo histórico/);
 assert(!(await page.locator('#homeContent').textContent()).includes('Plex ainda sem mídia'));
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:940});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,'cinema-livre-'+width+'.png')});}
 await page.evaluate(id=>LX.detail(id),films[0].id);assert.equal(await page.locator('.detail-copy .primary-btn').isDisabled(),false);
 assert.match(await page.locator('.lx-open-film-credit').textContent(),/sem edição/);
 assert.equal(await page.locator('.lx-open-film-credit a').first().getAttribute('href'),films[0].license.url);
 await page.screenshot({path:path.join(output,'creditos-e-licenca.png')});
 // Native transport uses owned decoded test bytes. Actual CDN streams are checked separately.
 if(!realStreams)await context.route('https://archive.org/download/**',route=>route.fulfill({contentType:'video/mp4',body:fs.readFileSync(path.join(__dirname,'tools/catalog-qa/owned-video.mp4'))}));
 const playbackFilms=realStreams?films.filter(f=>['blender:spring','blender:big-buck-bunny','prelinger:DuckandC1951'].includes(f.externalId)):[films[0]];assert(playbackFilms.length>0);
 for(const film of playbackFilms){
 await page.evaluate(id=>{LX.ui.close();LX.play(id)},film.id);
 await page.waitForFunction(()=>{const v=document.getElementById('lxGlobalCinema')?.shadowRoot?.querySelector('video');return v&&!v.paused&&v.currentTime>.2&&v.videoWidth>0},{},{timeout:45000});
 assert.equal(await page.evaluate(()=>[...document.getElementById('lxGlobalCinema').shadowRoot.querySelectorAll('iframe')].filter(frame=>frame.getAttribute('src')&&frame.getAttribute('src')!=='about:blank'&&getComputedStyle(frame).display!=='none').length),0);
 const source=await page.evaluate(()=>document.getElementById('lxGlobalCinema').shadowRoot.querySelector('video').currentSrc);assert.equal(source,film.mediaKey);
 if(realStreams){const result=await page.evaluate(()=>{const v=document.getElementById('lxGlobalCinema').shadowRoot.querySelector('video');v.pause();const result={duration:v.duration,width:v.videoWidth,height:v.videoHeight,decodedFrames:v.getVideoPlaybackQuality().totalVideoFrames};v.currentTime=12;return result});assert(result.decodedFrames>0);assert(Math.abs(result.duration-film.durationSeconds)<2);await page.waitForFunction(()=>{const v=document.getElementById('lxGlobalCinema').shadowRoot.querySelector('video');return !v.seeking&&v.currentTime>=12&&v.readyState>=2},{},{timeout:45000});await page.screenshot({path:path.join(output,'stream-'+film.externalId.replace(/[^a-z0-9-]/gi,'-')+'.png')});console.log(JSON.stringify({title:film.title,source,mode:'actual remote CDN through LX native video',seek:12,...result}));}
 await page.evaluate(()=>LX.stopMiniPlayer(true));
 }
 assert.deepEqual(errors,[]);await context.close();await browser.close();console.log('PASS free-film tab, playable titles, real-source references, license credits, native transport and responsive 390/820/1280.');
})().catch(error=>{console.error(error);process.exit(1)});
