// Administrative checks use the current signed-in session; no keys or signed URLs are persisted.
export const audioIdentity=item=>JSON.stringify([String(item.id),item.nativeAsset||null,item.mediaKey||null,item.sourceMediaKey||null,item.authorizedAudioUrl||null,item.sourceUrl||null,item.externalMusicUrl||null,item.sourceKind||null]);
export const verifiedAudioIds=(items,results)=>items.filter(item=>{const check=results.get(String(item.id));return check?.status==='verified'&&check.identity===audioIdentity(item)}).map(item=>String(item.id));
export async function runAudioBatch(items,inspect,{concurrency=3,onResult=()=>{},shouldStop=()=>false}={}){
 const list=items.filter(item=>item.type==='Música'),results=new Map();let cursor=0;
 async function worker(){while(cursor<list.length&&!shouldStop()){const item=list[cursor++];let check;try{check=await inspect(item)}catch{check={status:'error',message:'Não foi possível verificar a reprodução.'}}const result={...check,identity:audioIdentity(item),checkedAt:new Date().toISOString()};results.set(String(item.id),result);onResult(item,result,results.size,list.length)}}
 await Promise.all(Array.from({length:Math.max(1,Math.min(3,Number(concurrency)||1,list.length||1))},worker));return results;
}
export async function inspectAudio(item,resolve,{timeoutMs=15000}={}){
 const media=document.createElement('audio');media.muted=true;media.preload='metadata';media.hidden=true;media.setAttribute('aria-hidden','true');document.body.appendChild(media);
 let timer,closed=false;const cleanups=[];
 const deadline=new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('O arquivo demorou para responder.')),timeoutMs));
 const wait=(events,predicate)=>new Promise((resolve,reject)=>{
  if(predicate()){resolve();return}
  const finish=error=>{for(const event of events)media.removeEventListener(event,check);media.removeEventListener('error',failed);error?reject(error):resolve()};
  const check=()=>{if(predicate())finish()},failed=()=>finish(Error('O navegador não conseguiu decodificar este áudio.'));
  for(const event of events)media.addEventListener(event,check);media.addEventListener('error',failed,{once:true});cleanups.push(()=>{for(const event of events)media.removeEventListener(event,check);media.removeEventListener('error',failed)});
 });
 async function check(){
  let source;try{source=await resolve(item)}catch{throw Error('Não foi possível obter acesso ao arquivo de áudio.')}
  if(closed)throw Error('Verificação encerrada.');
  if(source?.kind!=='audio')return {status:'unsupported',message:'Use o player oficial para testar este tipo de fonte.'};
  media.src=source.url;media.load();await wait(['loadedmetadata','durationchange'],()=>Number.isFinite(media.duration)&&media.duration>0);
  const duration=media.duration;if(duration<.5)throw Error('O áudio é curto demais para verificar.');
  await media.play();await wait(['timeupdate','playing'],()=>media.currentTime>=.25&&media.readyState>=3);
  media.pause();const middle=duration/2;media.currentTime=middle;await wait(['seeked','timeupdate'],()=>!media.seeking&&Math.abs(media.currentTime-middle)<1);
  await media.play();await wait(['timeupdate','playing'],()=>media.currentTime>=middle+Math.min(.25,duration/8)&&media.readyState>=3);
  return {status:'verified',duration,sample:'start-and-middle',message:'Início e meio reproduzidos.'};
 }
 try{return await Promise.race([check(),deadline])}catch(error){return {status:'error',message:error.message||'Falha ao verificar o áudio.'}}
 finally{closed=true;clearTimeout(timer);for(const cleanup of cleanups)cleanup();media.pause();media.removeAttribute('src');media.load();media.remove()}
}
