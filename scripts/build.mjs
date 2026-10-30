import {cpSync,mkdirSync,rmSync,existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');
for(const entry of ['index.html','404.html','.nojekyll','CNAME','manifest.webmanifest','assets','src'])if(existsSync(entry))cpSync(entry,'dist/'+entry,{recursive:true});
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const modules=walk('dist/src').filter(p=>p.endsWith('.js'));
const release=createHash('sha256').update(modules.map(p=>readFileSync(p,'utf8')).join('\n')+readFileSync('dist/assets/styles.css','utf8')).digest('hex').slice(0,12);
for(const file of modules){const source=readFileSync(file,'utf8').replace(/(from\s+['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g,(_,before,url,after)=>before+url+'?v='+release+after);writeFileSync(file,source)}
const html=readFileSync('dist/index.html','utf8').replace(/(styles\.css|app\.js)\?v=[^'"\s]+/g,'$1?v='+release);
writeFileSync('dist/index.html',html);writeFileSync('dist/build.json',JSON.stringify({release},null,2)+'\n');
console.log('Frontend preparado em dist/. Backups, testes e SQL não são publicados.');
