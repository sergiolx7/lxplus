import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html');
const cssFiles=['app.css','app-v27.css','app-v28.css'];
const jsFiles=['lxplus.js','lxplus-v27.js','lxplus-v28.js','service-worker.js'];
const results=[];
const check=(name,fn)=>{try{fn();results.push({name,status:'PASS'})}catch(error){results.push({name,status:'FAIL',detail:error.message})}};

check('HTML ids are unique',()=>{
  const counts=new Map();for(const m of html.matchAll(/\sid=["']([^"']+)["']/g))counts.set(m[1],(counts.get(m[1])||0)+1);
  assert.deepEqual([...counts].filter(([,n])=>n>1),[]);assert.ok(counts.size>100);
});
check('all inline scripts compile',()=>{
  const rows=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);assert.ok(rows.length>=3);rows.forEach((src,i)=>new vm.Script(src,{filename:`inline-${i}.js`}));
});
check('all external JavaScript compiles',()=>jsFiles.forEach(f=>new vm.Script(read(f),{filename:f})));
function balancedCss(src,file){let b=0,q='',comment=false;for(let i=0;i<src.length;i++){const c=src[i],n=src[i+1];if(comment){if(c==='*'&&n==='/'){comment=false;i++}continue}if(q){if(c==='\\')i++;else if(c===q)q='';continue}if(c==='/'&&n==='*'){comment=true;i++;continue}if(c==='"'||c==="'"){q=c;continue}if(c==='{')b++;if(c==='}')b--;assert.ok(b>=0,`${file}: closing brace`)}assert.equal(b,0,`${file}: unbalanced braces`);assert.equal(q,'',`${file}: unclosed string`);assert.equal(comment,false,`${file}: unclosed comment`)}
check('CSS is structurally balanced',()=>cssFiles.forEach(f=>balancedCss(read(f),f)));
check('all local HTML/CSS assets exist',()=>{
  const refs=new Set();for(const m of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi))refs.add(m[1]);for(const f of cssFiles)for(const m of read(f).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))refs.add(m[1]);
  const missing=[];for(const raw of refs){if(/^(?:data:|https?:|mailto:|tel:|#|var\()/i.test(raw))continue;const clean=raw.split(/[?#]/)[0].replace(/^\.\//,'');if(!clean||clean.includes('${'))continue;if(!fs.existsSync(path.join(root,clean)))missing.push(raw)}assert.deepEqual(missing,[]);
});
check('v28 assets load after v27 compatibility layer',()=>{
  assert.match(html,/app-v27\.css\?v=28\.1[\s\S]*app-v28\.css\?v=28\.1/);assert.match(html,/lxplus-v27\.js\?v=28\.1[\s\S]*lxplus-v28\.js\?v=28\.1/);assert.match(html,/meta name="lx-build" content="28\.1"/);
});
check('v28 service worker owns current shell',()=>{
  const sw=read('service-worker.js');assert.match(sw,/lxplus-shell-v2810/);for(const f of ['app-v28.css?v=28.1','lxplus-v28.js?v=28.1','app-v27.css?v=28.1','lxplus-v27.js?v=28.1'])assert.ok(sw.includes(f),f);
});
check('support center is restored and wired',()=>{
  const v28=read('lxplus-v28.js');assert.match(v28,/Pedidos, ajuda e reclamações/);assert.match(v28,/Pedir conteúdo/);assert.match(v28,/Relatar problema/);assert.match(v28,/Sugestão \/ reclamação/);assert.match(v28,/LX\.openRequests=openSupportCenter/);
});
check('YouTube Music and Spotify link compatibility is hardened',()=>{
  const core=read('lxplus.js'),v28=read('lxplus-v28.js');assert.match(core,/YouTube \/ YouTube Music/);assert.match(core,/music\.youtube\.com/);assert.match(core,/spotify:\$\{r\.type\}:\$\{r\.id\}/);assert.match(v28,/detectProvider/);assert.ok(v28.includes('youtube\\.com|youtu\\.be'));assert.ok(v28.includes('open\\.spotify\\.com'));
});
check('modern v28 feature contracts are present',()=>{
  const v28=read('lxplus-v28.js'),css=read('app-v28.css');for(const p of [/Ctrl\/⌘ K/,/Saúde do sistema/,/Sem conexão/,/Busca universal/,/lx28-hints/,/lx-v28-smartbar/,/lx-v28-request-tools/,/lx-v28-profile-extra/])assert.match(v28+css,p);
});
check('player v28 supports configurable intro and recap skipping',()=>{
  const core=read('lxplus.js'),v28=read('lxplus-v28.js'),css=read('app-v28.css');
  for(const p of [/cIntroStart/,/cIntroEnd/,/cRecapStart/,/cRecapEnd/,/Pular abertura/,/Pular recapitulação/])assert.match(core+v28,p);
  assert.match(v28,/shadowRoot/);assert.match(v28,/timeupdate/);assert.match(v28,/touchend/);assert.match(css,/lx-v28-skip-config/);
});

check('v28.1 music blank-space regression is fixed',()=>{
  const css=read('app-v28.css');
  assert.match(css,/home-content:has\(\.lx-music-shell-v260\)/);
  assert.match(css,/@media \(min-width:981px\)[\s\S]*\.lx-music-shell-v260\{padding-top:0!important/);
  assert.match(css,/max-height:820px/);
  assert.match(css,/\.lx-v27-now-copy h2\{[^}]*font-size:clamp\(1\.7rem,2\.65vw,3\.05rem\)/);
});
check('conversation fire badge never attaches to avatar',()=>{
  const v27=read('lxplus-v27.js');
  assert.match(v27,/nameLine=head\.querySelector\(':scope > div:not\(\.lx-chat-avatar\):not\(\.lx-chat-call-actions\) > strong'\)/);
  assert.match(v27,/if\(!count\)\{badge\.remove\(\);return\}/);
  assert.doesNotMatch(v27,/const copy=head\.querySelector\(':scope > div'\)/);
});
check('transparent logo bytes remain untouched',()=>{
  const a=fs.readFileSync(path.join(root,'assets/lxplus-logo-v27.png')),b=fs.readFileSync(path.join(root,'lxplus-logo-v27.png'));assert.equal(crypto.createHash('sha256').update(a).digest('hex'),crypto.createHash('sha256').update(b).digest('hex'));
});
check('public build contains no private credentials',()=>{
  const all=[html,...cssFiles.map(read),...jsFiles.map(read)].join('\n');assert.doesNotMatch(all,/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+/i);assert.doesNotMatch(all,/spotify_client_secret\s*[:=]\s*["'][^"']+/i);assert.doesNotMatch(all,/R2_SECRET_ACCESS_KEY\s*[:=]\s*["'][^"']+/i);
});
const failed=results.filter(x=>x.status==='FAIL');console.log(JSON.stringify({passed:results.length-failed.length,failed:failed.length,results},null,2));if(failed.length)process.exitCode=1;
