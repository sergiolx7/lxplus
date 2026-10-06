/* Real canonical player: source replacement, fallback branding and navigation. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const output=process.env.LX_QA_OUTPUT||'/tmp/lx-music-priority';fs.mkdirSync(output,{recursive:true});
const rate=8000,seconds=20,pcm=Buffer.alloc(rate*seconds*2),wave=Buffer.alloc(44+pcm.length);wave.write('RIFF');wave.writeUInt32LE(36+pcm.length,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(rate,24);wave.writeUInt32LE(rate*2,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(pcm.length,40);pcm.copy(wave,44);
const audioFixture=process.env.LX_QA_AUDIO_FIXTURE?fs.readFileSync(process.env.LX_QA_AUDIO_FIXTURE):wave,audioMime=process.env.LX_QA_AUDIO_FIXTURE?'audio/mpeg':'audio/wav';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'],headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=route.request().url();if(url.endsWith('/qa-owned.wav'))return route.fulfill({contentType:audioMime,body:audioFixture});if(url.startsWith('https://www.youtube.com/embed/'))return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Official player transport fixture</title><p>Provider transport fixture</p>'});if(url.startsWith('http://127.0.0.1:8765/'))return route.continue();return route.abort();});
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.LX?.musicSourcePriority&&window.LX?.music);
 const matrix=await page.evaluate(()=>{
  const p=LX.musicSourcePriority,y='youtube:abcdefghijk',owned=location.origin+'/qa-owned.wav',s='spotify:track:1234567890123456789012';
  const single={mediaKey:y,externalMusicUrl:'https://youtu.be/abcdefghijk',authorizedAudioUrl:owned,tracks:[{mediaKey:y}]};
  const album={authorizedAudioUrl:owned,tracks:[{mediaKey:y},{mediaKey:s}]};
  return {single:p.select(single.tracks[0],single)?.kind,trackOverride:p.select({mediaKey:y,authorizedAudioKey:'cloud:media/owned'},{})?.kind,album:p.forContent(album).map(x=>x.kind),spotify:p.select({mediaKey:s})?.kind,store:p.select({externalMusicUrl:'https://music.apple.com/br/album/test/1'})===null,spoof:p.select({mediaKey:'https://evil.example/open.spotify.com/track/123'})===null,invalid:p.select({mediaKey:'youtube:invalid'})===null};
 });
 assert.deepEqual(matrix,{single:'native',trackOverride:'native',album:['youtube','spotify'],spotify:'spotify',store:true,spoof:true,invalid:true});
 await page.evaluate(()=>{
  const cover='assets/lxplus-icon-v34.png';window.qaSongs=[{id:7100000000001,type:'Música',title:'Faixa QA',artist:'LX QA',genre:'Geral',cover,mediaKey:'youtube:abcdefghijk',externalMusicUrl:'https://youtu.be/abcdefghijk',published:true,tracks:[{title:'Faixa QA',mediaKey:'youtube:abcdefghijk'}]},{id:7100000000002,type:'Música',title:'Fallback QA',artist:'LX QA',genre:'Geral',cover,published:true,authorizedAudioUrl:'https://media.example.invalid/missing.mp3',mediaKey:'youtube:abcdefghijk',tracks:[{mediaKey:'youtube:abcdefghijk'}]}];LX.data.catalog=()=>qaSongs;LX.cloud.db=()=>null;LX.cloud.isAdmin=()=>false;LX.ui.state.user={email:'qa@example.invalid',name:'QA'};LX.ui.state.screen='app';LX.ui.state.mode='Ouvir';document.getElementById('app').classList.remove('hidden');document.querySelectorAll('#auth,#profiles,#admin').forEach(x=>x.classList.add('hidden'));LX.music(7100000000001,0,false,[7100000000001]);
 });
 await page.waitForFunction(()=>LX.musicPlaybackSource?.kind==='youtube');
 assert.equal(await page.locator('#musicProviderBrand').getAttribute('data-provider'),'youtube');
 assert(await page.locator('#musicProviderFrame').isVisible());
 const bounds=await page.locator('#musicProviderFrame').boundingBox();assert(bounds.width>=200&&bounds.height>=200,'Official YouTube viewport remains visible and at least 200x200');
 await page.evaluate(()=>{qaSongs[0].authorizedAudioUrl=location.origin+'/qa-owned.wav';LX.music(qaSongs[0].id,0,true);});
 await page.waitForFunction(()=>LX.musicPlaybackSource?.kind==='native'&&!document.getElementById('musicAudio').paused&&document.getElementById('musicAudio').currentTime>0.05);
 assert.equal(await page.locator('#musicProviderBrand').getAttribute('data-provider'),'native');assert.equal(await page.locator('#musicProviderBrand [aria-label="YouTube"]').count(),0);
 assert.equal(await page.locator('#musicProviderFrame').getAttribute('src'),null);assert(!(await page.locator('#musicProviderPanel').isVisible()));
 const before=await page.evaluate(()=>document.getElementById('musicAudio').currentTime);
 await page.evaluate(()=>{LX.ui.state.mode='Assistir';LX.ui.renderApp();Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(before=>!document.getElementById('musicAudio').paused&&document.getElementById('musicAudio').currentTime>before+0.25,before);
 assert.equal(await page.evaluate(()=>navigator.mediaSession?.playbackState),'playing');
 await page.screenshot({path:path.join(output,'native-during-navigation-390.png')});
 await page.evaluate(async()=>{
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  const blob=await (await fetch(location.origin+'/qa-owned.wav')).blob(),ref='cloud:media/qa-owned.mp3';
  qaSongs.push({id:7100000000003,type:'Música',title:'Cloud recovery QA',artist:'LX QA',genre:'Geral',cover:'assets/lxplus-icon-v34.png',published:true,mediaKey:ref,tracks:[{mediaKey:ref}]});
  window.qaRecoveryCount=0;LX.cloud.downloadMedia=async()=>{qaRecoveryCount++;return blob};LX.primeMusicMedia(ref,'https://media.example.invalid/expired-url.mp3');LX.music(7100000000003,0,true,[7100000000003]);
 });
 await page.waitForFunction(()=>qaRecoveryCount>0&&LX.musicPlaybackSource?.contentId===7100000000003&&LX.musicPlaybackSource?.kind==='native'&&document.getElementById('musicPlaybackKind').classList.contains('is-ready')&&!document.getElementById('musicAudio').paused);
 assert.equal(await page.locator('#musicProviderBrand').getAttribute('data-provider'),'native','Private-audio recovery preserves native branding');
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});LX.ui.state.mode='Ouvir';LX.music(7100000000002,0,false,[7100000000002]);});
 await page.waitForFunction(()=>LX.musicPlaybackSource?.kind==='youtube'&&LX.musicPlaybackSource?.contentId===7100000000002,{timeout:12000});
 assert.equal(await page.locator('#musicProviderBrand').getAttribute('data-provider'),'youtube','If owned audio fails, branding follows the source actually used');
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.evaluate(()=>navigator.mediaSession?.playbackState),'none');
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
 await page.screenshot({path:path.join(output,'official-youtube-390.png')});
 await page.evaluate(()=>{
  window.qaSpotifyUris=[];LX.spotifyEmbed.api={createController(element,options,callback){const frame=document.createElement('iframe');frame.title='Spotify API transport fixture';element.replaceWith(frame);qaSpotifyUris.push(options.uri);callback({loadUri:uri=>qaSpotifyUris.push(uri),addListener(){},pause(){},play(){}})}};
  for(const [i,uri] of ['spotify:track:1234567890123456789012','spotify:track:abcdefghijklmnopqrstuv'].entries())qaSongs.push({id:7100000000010+i,type:'Música',title:'Spotify QA '+i,artist:'LX QA',genre:'Geral',cover:'assets/lxplus-icon-v34.png',published:true,mediaKey:uri,tracks:[{mediaKey:uri}]});
  LX.music(7100000000010,0,false,[7100000000010]);
 });
 await page.waitForFunction(()=>LX.musicPlaybackSource?.kind==='spotify');
 await page.evaluate(()=>LX.music(7100000000011,0,false,[7100000000011]));
 await page.waitForFunction(()=>LX.musicPlaybackSource?.contentId===7100000000011);
 assert.deepEqual(await page.evaluate(()=>qaSpotifyUris),['spotify:track:1234567890123456789012','spotify:track:abcdefghijklmnopqrstuv'],'A legacy SDK controller must load the next URI after its mount is replaced');
 assert.equal(await page.locator('#spotifyEmbedHost iframe').count(),1);assert.equal(await page.locator('#musicProviderBrand').getAttribute('data-provider'),'spotify');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS music priority: owned audio preferred; album tracks isolated; store/spoof links rejected; active YouTube replaced by decoded PCM; native audio survives navigation/visibility; fallback uses actual provider brand; official player stays visible.');
})().catch(e=>{console.error(e);process.exit(1)});
