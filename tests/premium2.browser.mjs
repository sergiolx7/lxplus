// Isolated browser regression suite. Never signs into a real account.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
let browser,server;const base='http://127.0.0.1:3109';
before(async()=>{
 server=spawn(process.execPath,['scripts/dev.mjs','--port','3109'],{stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local server unavailable')),10000);server.stdout.on('data',data=>{if(String(data).includes('LX Plus local')){clearTimeout(timer);resolve()}});server.on('error',reject)});
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});await mkdir('qa-output',{recursive:true});
});
after(async()=>{await browser?.close();server?.kill()});
async function page(viewport={width:1440,height:1000}){const ctx=await browser.newContext({viewport});const page=await ctx.newPage();await page.route('**/*.supabase.co/**',route=>{throw Error('QA tried to contact production: '+new URL(route.request().url()).origin)});return page}
const poll=async(fn)=>{for(let i=0;i<50;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Expected browser condition did not become true')};

test('browser: music survives navigation, search matches artists and retrospective renders recorded values',async()=>{
 const p=await page();await p.goto(base+'/qa/');await p.locator('[data-page="Músicas"]').first().click();await p.locator('[data-track="104"]').first().click();await poll(()=>p.locator('#lxDockAudio').evaluate(a=>a.currentTime>.2));const first=await p.locator('#lxDockAudio').evaluate(a=>a.currentTime);
 await p.locator('[data-page="Livros"]').first().click();await poll(()=>p.locator('#lxDockAudio').evaluate((a,minimum)=>a.currentTime>minimum,first+.2));
 await p.locator('#search').fill('Tom sintético');await p.getByText('2 conteúdos encontrados',{exact:true}).waitFor();assert.equal(await p.locator('[data-search-item]').count(),2);
 await p.locator('[data-page="Músicas"]').first().click();await p.getByRole('button',{name:'Sua retrospectiva',exact:true}).click();await p.getByText('minutos ouvidos',{exact:true}).waitFor();assert.match(await p.locator('.insight-grid').innerText(),/3/);
 await p.screenshot({path:'qa-output/music-desktop.png',fullPage:true});await p.context().close();
});
test('browser: PDF/EPUB render, retain bookmarks and notes, search pages and block active EPUB content',async()=>{
 const p=await page();const requests=[];p.on('request',r=>{if(r.url().includes('example.invalid'))requests.push(r.url())});await p.goto(base+'/tests/fixtures/premium2.html');
 await p.locator('#pdf').click();await p.getByText('Página 1 de 2 · 50%',{exact:true}).waitFor();assert.equal(await p.locator('#readerViewport canvas').count(),1);await p.locator('[data-reader-next]').click();await p.getByText('Página 2 de 2 · 100%',{exact:true}).waitFor();
 await p.locator('[data-reader-bookmark]').click();await p.getByText('Suas anotações privadas',{exact:true}).click();await p.locator('#readerNotes').fill('Minha anotação de QA');await p.locator('#closeReader').click();await p.locator('#pdf').click();await p.getByText('Página 2 de 2 · 100%',{exact:true}).waitFor();assert.equal(await p.locator('#readerNotes').inputValue(),'Minha anotação de QA');
 await p.locator('#epub').click();await p.getByText('Capítulo local de teste',{exact:true}).waitFor();assert.equal(await p.locator('body').getAttribute('data-epub-executed'),null);assert.equal(await p.locator('#readerViewport script,#readerViewport iframe').count(),0);assert.equal(requests.length,0);
 await p.getByText('Buscar no livro',{exact:true}).click();await p.locator('#readerSearch').fill('Agronomia');await p.locator('#readerSearchForm button').click();await p.locator('#readerResults [data-reader-marker="2"]').waitFor();await p.locator('#readerResults [data-reader-marker="2"]').click();await p.getByText('Segundo capítulo',{exact:true}).waitFor();
 await p.screenshot({path:'qa-output/reader-desktop.png',fullPage:true});await p.context().close();
});
test('browser: native video restores settings, can cancel next episode, saves seek-back progress and removes listeners',async()=>{
 const p=await page();await p.goto(base+'/tests/fixtures/premium2.html');await p.locator('#video').click();await poll(()=>p.locator('#testVideo').evaluate(v=>v.readyState>=2));assert.equal(await p.locator('#testVideo').evaluate(v=>v.volume),.4);assert.equal(await p.locator('#playerSpeed').inputValue(),'1.5');
 await p.locator('#nextEpisode [data-next-cancel]').waitFor({timeout:12000});await p.locator('[data-next-cancel]').click();await new Promise(r=>setTimeout(r,8300));assert.equal(JSON.parse(await p.locator('#evidence').innerText()).next,0);
 await p.locator('#testVideo').evaluate(v=>{v.currentTime=.5});await poll(async()=>JSON.parse(await p.locator('#evidence').innerText()).progress.some(x=>x.position<1));await p.locator('#closeVideo').click();await p.locator('#lifecycle').click();await poll(async()=>JSON.parse(await p.locator('#evidence').innerText()).lifecycleErrors===1);await p.context().close();
});
test('browser: mobile navigation, account display settings and reader controls fit a small screen',async()=>{
 const p=await page({width:390,height:844});await p.goto(base+'/qa/');await p.locator('[data-page="Músicas"]').last().click();await p.getByText('Seu ritmo.',{exact:false}).waitFor();assert.ok(await p.locator('.mobile-nav').isVisible());
 await p.locator('.avatar-button').click();await p.locator('[data-display-setting="performance"]').selectOption('light');assert.equal(await p.locator('html').getAttribute('data-performance'),'light');await p.screenshot({path:'qa-output/profile-mobile.png',fullPage:true});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.goto(base+'/tests/fixtures/premium2.html');await p.locator('#epub').click();await p.getByText('Capítulo local de teste',{exact:true}).waitFor();await p.screenshot({path:'qa-output/reader-mobile.png',fullPage:true});await p.context().close();
});
test('browser: LX IA offers explicit online consent and only opens catalog records rechecked for publication',async()=>{
 const p=await page();await p.goto(base+'/qa/');await p.locator('[data-page="LX IA"]').first().click();assert.equal(await p.locator('#aiOnline').isChecked(),false);await p.locator('#aiForm textarea').fill('Quero ouvir jazz');await p.locator('#aiForm button').click();await p.getByText('Recomendação disponível apenas neste QA local.',{exact:true}).waitFor();assert.equal(await p.locator('[data-ai-item="104"]').count(),1);await p.locator('[data-ai-item="104"]').click();await p.getByRole('dialog').waitFor();await p.context().close();
});
