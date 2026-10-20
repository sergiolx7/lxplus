/* Offline integrity manifest. A verified hash does not prove a restorable backup. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
const sha256=async file=>{const hash=createHash('sha256');for await(const data of createReadStream(file))hash.update(data);return hash.digest('hex');};
export async function inventory(folder){
 const root=path.resolve(folder),files=[];
 async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const target=path.join(dir,entry.name),name=path.relative(root,target).split(path.sep).join('/');
  if(entry.isSymbolicLink())throw new Error('Backup must not contain symbolic links.');
  if(entry.isDirectory())await walk(target);
  else if(entry.isFile()&&name!=='backup-manifest.json'){const stat=await fs.stat(target);files.push({path:name,bytes:stat.size,sha256:await sha256(target)});}
 }}await walk(root);files.sort((a,b)=>a.path.localeCompare(b.path));return files;
}
export async function writeManifest(folder){
 const files=await inventory(folder);
 if(!files.length)throw new Error('No backup files to verify.');
 const result={version:1,created_at:new Date().toISOString(),integrity_verified:true,restore_verified:false,cleanup_allowed:false,files};
 await fs.writeFile(path.join(folder,'backup-manifest.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});return result;
}
export async function verifyManifest(folder){
 const manifest=JSON.parse(await fs.readFile(path.join(folder,'backup-manifest.json'),'utf8'));
 const files=await inventory(folder);
 if(JSON.stringify(files)!==JSON.stringify(manifest.files))throw new Error('Backup contents or hashes do not match the manifest.');
 return {integrity_verified:true,restore_verified:false,cleanup_allowed:false,files:files.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const [mode,folder]=process.argv.slice(2);
 if(!folder||!['create','verify'].includes(mode))throw new Error('Usage: node tools/backup-manifest.mjs create|verify PRIVATE_BACKUP_FOLDER');
 const result=mode==='create'?await writeManifest(folder):await verifyManifest(folder);
 console.log(JSON.stringify({...result,files:Array.isArray(result.files)?result.files.length:result.files},null,2));
}
