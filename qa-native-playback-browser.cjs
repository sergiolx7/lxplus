const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const feed=JSON.parse(fs.readFileSync('catalog/native-collection.json','utf8')),output=process.env.LX_QA_OUTPUT||'/tmp/lx-native-playback';fs.mkdirSync(output,{recursive:true});
const {createHash}=require('node:crypto');
const raw='Project Gutenberg header\n*** START OF THE PROJECT GUTENBERG EBOOK QA ***\n\n'+('Uma página de teste para conferir a leitura sem travamentos.\n\n'.repeat(900))+'\n*** END OF THE PROJECT GUTENBERG EBOOK QA ***\nLicense';
const bytes=Buffer.from(raw),hash=createHash('sha256').update(bytes).digest('hex');
const url='https://ubidogquzpdvrbzbhxda.supabase.co/storage/v1/object/public/lx-assets/qa-reader.txt';
const videoUrl='https://archive.org/download/qa-owned/movie.mp4';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'],headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],providerRequests=[];let bookRequests=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request().url();
  if(/youtube|spotify/.test(new URL(request).hostname))providerRequests.push(request);
  if(request===url){bookRequests++;await new Promise(resolve=>setTimeout(resolve,180));return route.fulfill({contentType:'text/plain; charset=utf-8',body:bytes});}
  if(request===videoUrl)return route.fulfill({contentType:'video/mp4',body:fs.readFileSync('tools/catalog-qa/owned-video.mp4')});
  if(request.startsWith('http://127.0.0.1:8765/'))return route.continue();
  if(process.env.LX_QA_REAL_NATIVE==='1'&&request.startsWith('https://ubidogquzpdvrbzbhxda.supabase.co/storage/v1/object/public/lx-assets/licensed/20261007/'))return route.continue();
  return route.abort();
 });
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>LX.nativePlayback&&LX.nativeBooks&&LX.read&&LX.music);
 const rows=feed.items.filter(x=>x.type==='Música').slice(0,1);
 await page.evaluate(({rows,url,hash,size,videoUrl})=>{
  window.qaNativeRows=[...rows,{id:7100000000001,type:'Livro',title:'Livro QA',author:'LX QA',cover:'assets/lxplus-icon-v34.png',published:true,textAsset:{url,sha256:hash,bytes:size}},{id:7100000000002,type:'Música',title:'Provider-only QA',artist:'LX QA',cover:'assets/lxplus-icon-v34.png',published:true,mediaKey:'youtube:abcdefghijk',tracks:[{mediaKey:'youtube:abcdefghijk'}]},{id:7100000000003,type:'Filme',title:'Provider-only movie QA',cover:'assets/lxplus-icon-v34.png',published:true,mediaKey:'youtube:abcdefghijk'}];
  LX.data.catalog=()=>qaNativeRows;LX.cloud.db=()=>null;LX.cloud.isAdmin=()=>false;LX.ui.state.user={email:'qa@example.invalid',name:'QA'};LX.ui.state.screen='app';LX.ui.state.mode='Ler';document.getElementById('app').classList.remove('hidden');document.querySelectorAll('#auth,#profiles,#admin').forEach(x=>x.classList.add('hidden'));LX.ui.renderApp();
  qaNativeRows.push({id:7100000000004,type:'Filme',title:'Vídeo próprio QA',published:true,cover:'assets/lxplus-icon-v34.png',mediaKey:videoUrl,qualitySources:{'720p':'youtube:abcdefghijk'}});
 },{rows,url,hash,size:bytes.length,videoUrl});
 const ready=await page.evaluate(()=>({audio:LX.catalogReady(qaNativeRows[0]),book:LX.catalogReady(qaNativeRows[1]),providerAudio:LX.catalogReady(qaNativeRows[2]),providerVideo:LX.catalogReady(qaNativeRows[3])}));assert.deepEqual(ready,{audio:true,book:true,providerAudio:false,providerVideo:false});
 await page.evaluate(()=>{LX.read(7100000000001);LX.ui.closeReader()});await page.waitForTimeout(250);assert(await page.locator('#readerOverlay').evaluate(x=>x.classList.contains('hidden')),'Closing during a download prevents a stale reader');
 for(const width of [390,820,1280]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>LX.read(7100000000001));await page.waitForFunction(()=>document.querySelector('.lx-reader-text p')?.textContent.includes('Uma página de teste'));
  assert.equal(await page.locator('#readerModal').evaluate(x=>x.scrollWidth>x.clientWidth+2),false,'Reader fits viewport');
  await page.locator('#nextChapter').click();await page.waitForFunction(()=>document.querySelector('.lx-reader-title small')?.textContent.includes('Parte 02'));assert.equal(await page.locator('.lx-reader-text').count(),1);
  await page.screenshot({path:path.join(output,`reader-${width}.png`)});await page.evaluate(()=>LX.ui.closeReader());
 }
 assert(bookRequests<=2,'Complete validated text is reused across page changes');
 await page.evaluate(()=>{LX.music(7100000000002,0,false);LX.play(7100000000003)});assert.equal(await page.locator('#lxGlobalCinema').count(),0);assert.equal(providerRequests.length,0,'Provider-only entries never load external players');
 await page.evaluate(()=>{LX.ui.close();LX.play(7100000000004)});
 await page.waitForFunction(()=>{const v=document.getElementById('lxGlobalCinema')?.shadowRoot.querySelector('video');return v&&!v.paused&&v.currentTime>.1&&v.videoWidth>0});
 const videoResult=await page.evaluate(async()=>{const host=document.getElementById('lxGlobalCinema');return {qualities:host.__lxQualityRows.length,externalQuality:await host.__lxSetQuality({q:'720p',ref:'youtube:abcdefghijk'}),externalFallback:host.__lxAudioFallback(),externalFrames:[...host.shadowRoot.querySelectorAll('iframe')].filter(x=>x.getAttribute('src')&&x.getAttribute('src')!=='about:blank').length}});
 assert.deepEqual(videoResult,{qualities:1,externalQuality:false,externalFallback:false,externalFrames:0});
 await page.screenshot({path:path.join(output,'video-native.png')});await page.evaluate(()=>LX.stopMiniPlayer(true));
 if(process.env.LX_QA_REAL_NATIVE==='1'){
  await page.evaluate(id=>LX.music(id,0,true),rows[0].id);await page.waitForFunction(()=>LX.musicPlaybackSource?.kind==='native'&&!document.getElementById('musicAudio').paused&&document.getElementById('musicAudio').currentTime>.1,{},{timeout:30000});
  assert.equal(await page.locator('#musicProviderFrame').getAttribute('src'),null);
  const before=await page.evaluate(()=>document.getElementById('musicAudio').currentTime);await page.evaluate(()=>{LX.ui.state.mode='Assistir';LX.ui.renderApp()});await page.waitForFunction(t=>document.getElementById('musicAudio').currentTime>t+.2,before);
  await page.screenshot({path:path.join(output,'mp3-native.png')});
  const book=feed.books.find(x=>String(x.id)==='8600000055752');
  await page.evaluate(book=>{qaNativeRows.push({id:book.id,type:'Livro',title:'Dom Casmurro',author:'Machado de Assis',cover:'assets/lxplus-icon-v34.png',published:true,...book.patch});LX.read(book.id)},book);
  await page.waitForFunction(()=>document.querySelector('.lx-reader-text')?.textContent.toUpperCase().includes('DOM CASMURRO'),{},{timeout:25000});await page.screenshot({path:path.join(output,'dom-casmurro-real.png')});
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS native-only availability, reader cancellation, pagination and responsive 390/820/1280'+(process.env.LX_QA_REAL_NATIVE==='1'?', actual hosted MP3 and complete book.':'.'));
})().catch(error=>{console.error(error);process.exit(1)});
