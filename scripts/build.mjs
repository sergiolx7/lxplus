import {cpSync,mkdirSync,rmSync,existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');
for(const entry of ['index.html','404.html','.nojekyll','CNAME','manifest.webmanifest','assets','src'])if(existsSync(entry))cpSync(entry,'dist/'+entry,{recursive:true});
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const modules=walk('dist/src').filter(p=>p.endsWith('.js'));
const sourceHtml=readFileSync('dist/index.html','utf8');
const styleLinks=[...sourceHtml.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="(\.\/assets\/[^"?]+\.css)(?:\?[^\"]*)?"[^>]*>/g)];
const styleSources=styleLinks.map(match=>({path:match[1],content:readFileSync(path.join('dist',match[1]),'utf8')}));
const release=createHash('sha256').update(modules.map(p=>readFileSync(p,'utf8')).join('\n')+styleSources.map(s=>s.content).join('\n')+sourceHtml).digest('hex').slice(0,12);
for(const file of modules){const source=readFileSync(file,'utf8').replace(/(from\s+['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g,(_,before,url,after)=>before+url+'?v='+release+after);writeFileSync(file,source)}
// One ordered stylesheet avoids the old parallel cascade and stale CSS versions.
const bundle=styleSources.map(s=>'/* '+s.path+' */\n'+s.content).join('\n');
writeFileSync('dist/assets/lx-ui.css',bundle);
let first=true;
const html=sourceHtml.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/assets\/[^"?]+\.css(?:\?[^\"]*)?"[^>]*>/g,()=>{if(!first)return '';first=false;return '<link rel="stylesheet" href="./assets/lx-ui.css?v='+release+'">'}).replace(/app\.js\?v=[^'"\s]+/g,'app.js?v='+release);
writeFileSync('dist/index.html',html);writeFileSync('dist/build.json',JSON.stringify({release,source_commit:process.env.GITHUB_SHA||null,ui_generation:'lx-design-system-5',feature_revision:'lxplus-5-purple-universe-20261108'},null,2)+'\n');
console.log('Frontend preparado em dist/. Backups, testes e SQL não são publicados.');
