import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'build/staging');
const productionProject='ubidogquzpdvrbzbhxda';
const configuredUrl=process.env.LX_STAGING_SUPABASE_URL||'';
const key=process.env.LX_STAGING_PUBLISHABLE_KEY||'';
if(configuredUrl){
 const url=new URL(configuredUrl);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.username||url.password||url.hostname===productionProject+'.supabase.co')throw new Error('An isolated staging Supabase project is required.');
 if(!key.startsWith('sb_publishable_')&& !/^eyJ/.test(key))throw new Error('A publishable or anon staging key is required.');
 if(key.startsWith('eyJ')){const payload=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url'));if(payload.role!=='anon')throw new Error('Privileged keys must never enter the browser build.');}
}else if(key)throw new Error('A staging URL is required when supplying a key.');
const html=await fs.readFile(path.join(root,'index.html'),'utf8'),sw=await fs.readFile(path.join(root,'service-worker.js'),'utf8');
const coreSource=sw.match(/const CORE=(\[[\s\S]*?\]);/)?.[1];
if(!coreSource)throw new Error('Canonical service-worker asset list is missing.');
const core=vm.runInNewContext(coreSource),files=new Set(['index.html','service-worker.js','manifest.webmanifest','release-manifest.json']);
for(const ref of [...core,...[...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(x=>x[1])]){
 if(/^(?:https?:|data:|#|mailto:)/.test(ref))continue;
 const file=ref.split(/[?#]/)[0].replace(/^\.\//,'');if(!file||file.includes('${'))continue;
 const resolved=path.resolve(root,file);if(!resolved.startsWith(root+path.sep))throw new Error('Unsafe public asset path');files.add(file);
}
await fs.rm(output,{recursive:true,force:true});await fs.mkdir(output,{recursive:true});
for(const folder of ['assets','catalog','vendor'])await fs.cp(path.join(root,folder),path.join(output,folder),{recursive:true});
for(const file of files){const dest=path.join(output,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(root,file),dest);}
// Configuration is rewritten before the bundle can initialize an API client.
for(const file of ['lxplus.bundle.js']){
 const dest=path.join(output,file);let source=await fs.readFile(dest,'utf8');
 source=source.replaceAll('https://'+productionProject+'.supabase.co',configuredUrl||'https://staging-not-configured.invalid');
 source=source.replace(/publishableKey:\s*'[^']*'/,"publishableKey:"+JSON.stringify(key));
 source=source.replace(/siteUrl:\s*'[^']*'/,"siteUrl:"+JSON.stringify(process.env.LX_STAGING_SITE_URL||''));
 source=source.replace("environment:'cloud-ready'","environment:'isolated-staging'");
 if(source.includes('https://'+productionProject+'.supabase.co'))throw new Error('Production API configuration leaked into staging.');
 await fs.writeFile(dest,source);
}
// A branded staging marker; this remains an admin concern and never pretends to be production.
const metadata={built_at:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),environment:'staging',production_database_configured:false,staging_database_configured:!!configuredUrl,deploy_ready:false};
await fs.writeFile(path.join(output,'staging-status.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({output,files:files.size,...metadata},null,2));
