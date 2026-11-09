import {driveReference,validDriveId} from '../../../src/drive-source.js';
import {loadDrivePlayback,fetchDriveVariant} from './playback.mjs';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,range','Access-Control-Allow-Methods':'POST,GET,HEAD,OPTIONS','Access-Control-Expose-Headers':'content-type,content-length,content-range,accept-ranges','Cross-Origin-Resource-Policy':'cross-origin'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const encoder=new TextEncoder(),chunkSize=8*1024*1024,ticketSeconds=21600;
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function signingKey(secret){return crypto.subtle.importKey('raw',encoder.encode('lx-drive-player-v1:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function issueDriveTicket(payload,secret){
 const body=b64(encoder.encode(JSON.stringify(payload))),key=await signingKey(secret);
 return body+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(body))));
}
export async function readDriveTicket(token,secret,now=Date.now()){
 try{
  if(!token||token.length>2200)return null;
  const [body,signature,extra]=token.split('.');
  if(!body||!signature||extra||!await crypto.subtle.verify('HMAC',await signingKey(secret),unb64(signature),encoder.encode(body)))return null;
  const payload=JSON.parse(new TextDecoder().decode(unb64(body)));
  if(!validDriveId(payload.d)||!Number.isFinite(payload.e)||payload.e<=now||payload.e>now+(ticketSeconds+60)*1000||!payload.u)return null;
  if(payload.r&&!/^[\w-]{1,256}$/.test(payload.r))return null;
  if(payload.t!==undefined&&(!Number.isInteger(payload.t)||payload.t<1||payload.t>9999))return null;
  return payload;
 }catch{return null}
}
export function driveRequestRange(input){
 if(!input)return 'bytes=0-'+(chunkSize-1);
 const match=/^bytes=(\d*)-(\d*)$/.exec(input);
 if(!match||!match[1]&&!match[2])return null;
 if(!match[1]){const length=Number(match[2]);return Number.isSafeInteger(length)&&length>0?'bytes=-'+Math.min(length,chunkSize):null}
 const start=Number(match[1]),end=match[2]?Number(match[2]):start+chunkSize-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<start)return null;
 return 'bytes='+start+'-'+Math.min(end,start+chunkSize-1);
}
// A ticket may only reference a source already visible to this user in the catalog.
export function catalogDriveSource(payload,driveId){
 if(!payload||payload.archived||payload.catalogOnly||payload.metadataOnly||payload.availability==='coming_soon')return null;
 const authorized=!!(payload.sourceVerified||payload.publicDomain||payload.openFilm||payload.license?.authorized||payload.license?.status==='approved');
 const entries=[payload,...(Array.isArray(payload.episodes)?payload.episodes:[]),...(Array.isArray(payload.seasons)?payload.seasons.flatMap(s=>Array.isArray(s?.episodes)?s.episodes:[]):[])];
 let fallback=null;
 for(const entry of entries){
  if(!entry||typeof entry!=='object')continue;
  const refs=[entry.authorizedVideoUrl,entry.authorizedAudioUrl,entry.mediaKey,entry.sourceMediaKey,typeof entry.nativeAsset==='string'?entry.nativeAsset:entry.nativeAsset?.url||entry.nativeAsset?.path||entry.nativeAsset?.storagePath];
  if(authorized)refs.push(entry.sourceUrl,entry.videoUrl,entry.playbackUrl,entry.audioUrl,validDriveId(entry.driveId)?'gdrive:'+entry.driveId:null);
  for(const candidate of refs){const ref=driveReference(candidate);if(ref?.driveId===driveId){const source={...ref,audio:payload.type==='Música'};if(ref.resourceKey)return source;fallback=source}};
 }
 return fallback;
}
export function driveMediaType(response){
 const disposition=response.headers.get('content-disposition')||'';
 const filename=(/filename="([^"]+)"/i.exec(disposition)||[])[1]||'';
 const original=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
 const ext=(filename.match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase();
 const mime=({'mp4':'video/mp4','m4v':'video/mp4','mkv':'video/x-matroska','webm':'video/webm','mov':'video/quicktime','mp3':'audio/mpeg','m4a':'audio/mp4','aac':'audio/aac','ogg':'audio/ogg','wav':'audio/wav'})[ext]||original;
 return {mime,filename,compatible:ext!=='mkv'&&ext!=='avi'};
}
async function driveFetch(ref,range,{fetcher,signal}){
 const url=new URL('https://drive.usercontent.google.com/download');
 url.searchParams.set('id',ref.driveId||ref.d);url.searchParams.set('export','download');url.searchParams.set('confirm','t');
 if(ref.resourceKey||ref.r)url.searchParams.set('resourcekey',ref.resourceKey||ref.r);
 return fetcher(url.href,{headers:{Range:range},redirect:'follow',signal});
}
async function providerError(response){
 const type=response.headers.get('content-type')||'';
 await response.body?.cancel();
 if(response.status===429)return json({error:'DRIVE_QUOTA',message:'O Drive atingiu o limite de acessos. Tente novamente mais tarde.'},429);
 if([401,403,404].includes(response.status)||/text\/html/.test(type))return json({error:'DRIVE_UNAVAILABLE',message:'O Drive não liberou o arquivo original. Confira o compartilhamento e a permissão de download.'},424);
 return json({error:'DRIVE_UNAVAILABLE',message:'O arquivo original não está disponível para reprodução agora.'},502);
}
export async function handleDrivePlayer(req,{env,fetcher=fetch,now=Date.now}={}){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['POST','GET','HEAD'].includes(req.method))return json({error:'METHOD_NOT_ALLOWED'},405);
 const base=(env('SUPABASE_URL')||'').replace(/\/$/,''),secret=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!secret)return json({error:'SERVER_NOT_CONFIGURED'},503);
 try{
  if(req.method==='POST'){
   const authorization=req.headers.get('authorization')||'';
   if(!/^Bearer\s+\S+/i.test(authorization))return json({error:'AUTH_REQUIRED'},401);
   const headers={apikey:env('SUPABASE_ANON_KEY')||'',authorization};
   const user=await fetcher(base+'/auth/v1/user',{headers,signal:AbortSignal.timeout(5000)});
   if(!user.ok){await user.body?.cancel();return json({error:'AUTH_REQUIRED'},401)}
   const account=await user.json();if(!account.id)return json({error:'AUTH_REQUIRED'},401);
   let body;try{body=await req.json()}catch{return json({error:'INVALID_REQUEST'},400)}
   if(!/^\d{1,17}$/.test(String(body.catalogId))||!validDriveId(body.driveId))return json({error:'INVALID_SOURCE'},400);
   const catalog=await fetcher(base+'/rest/v1/lx_catalog?id=eq.'+body.catalogId+'&published=eq.true&select=payload&limit=1',{headers,signal:AbortSignal.timeout(5000)});
   if(!catalog.ok){await catalog.body?.cancel();return json({error:'CATALOG_ACCESS_DENIED'},403)}
   const rows=await catalog.json(),ref=catalogDriveSource(rows?.[0]?.payload,body.driveId);
   if(!ref)return json({error:'SOURCE_NOT_ALLOWED',message:'Este arquivo não está disponível no catálogo para sua conta.'},403);
   const expiresAt=now()+ticketSeconds*1000;
   if(!ref.audio){
    const formats=await loadDrivePlayback(ref,{fetcher}).catch(()=>[]);
    if(formats.length){
     const variants=[];
     for(const format of formats){
      const token=await issueDriveTicket({d:ref.driveId,r:ref.resourceKey,e:expiresAt,u:account.id,t:format.id,m:'video/mp4'},secret);
      variants.push({id:format.id,label:format.label,width:format.width,height:format.height,bitrate:format.bitrate,url:base+'/functions/v1/lx-drive-player?ticket='+encodeURIComponent(token)});
     }
     return json({url:variants[0].url,kind:'video',mime:'video/mp4',variants,expiresAt,audioCodec:'AAC',warning:''});
    }
   }
   const probe=await driveFetch(ref,'bytes=0-0',{fetcher,signal:AbortSignal.timeout(12000)});
   if(!probe.ok||/text\/html|application\/json/i.test(probe.headers.get('content-type')||''))return providerError(probe);
   const info=driveMediaType(probe);await probe.body?.cancel();
   if(!ref.audio&&!info.compatible)return json({error:'DRIVE_COMPATIBLE_VERSION_PENDING',message:'O Drive ainda não liberou uma versão com áudio compatível para este arquivo. Tente novamente após o processamento ou use MP4 com H.264 e AAC.'},425);
   const token=await issueDriveTicket({d:ref.driveId,r:ref.resourceKey,e:expiresAt,u:account.id,a:ref.audio,m:info.mime},secret);
   return json({url:base+'/functions/v1/lx-drive-player?ticket='+encodeURIComponent(token),kind:ref.audio?'audio':'video',mime:info.mime,filename:info.filename,expiresAt,warning:info.compatible?'':'Este arquivo está em MKV. Se faltar áudio ou imagem, substitua por MP4 com vídeo H.264 e áudio AAC.'});
  }
  const ticket=await readDriveTicket(new URL(req.url).searchParams.get('ticket'),secret,now());
  if(!ticket)return json({error:'INVALID_OR_EXPIRED_TICKET'},401);
  const range=driveRequestRange(req.method==='HEAD'?'bytes=0-0':req.headers.get('range'));
  if(!range)return json({error:'INVALID_RANGE'},416);
  const options={fetcher,signal:AbortSignal.any([req.signal,AbortSignal.timeout(45000)])};
  const upstream=ticket.t?await fetchDriveVariant({driveId:ticket.d,resourceKey:ticket.r},ticket.t,range,options):await driveFetch(ticket,range,options);
  if(!upstream)return json({error:'DRIVE_QUALITY_UNAVAILABLE',message:'Esta qualidade não está disponível agora. Escolha outra qualidade ou reabra o vídeo.'},424);
  if(upstream.status===416){const out=new Headers(cors);out.set('Cache-Control','no-store');if(upstream.headers.has('content-range'))out.set('Content-Range',upstream.headers.get('content-range'));await upstream.body?.cancel();return new Response(null,{status:416,headers:out})}
  if(!upstream.ok||/text\/html|application\/json/i.test(upstream.headers.get('content-type')||''))return providerError(upstream);
  // Never let a provider ignoring Range stream a whole multi-gigabyte file.
  const actual=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(upstream.headers.get('content-range')||'');
  if(upstream.status!==206||!actual||Number(actual[2])-Number(actual[1])+1>chunkSize||Number(actual[2])<Number(actual[1])){
   await upstream.body?.cancel();return json({error:'DRIVE_RANGE_UNAVAILABLE',message:'A origem não aceitou a reprodução em partes.'},502);
  }
  const out=new Headers(cors);
  for(const name of ['content-length','content-range','etag','last-modified'])if(upstream.headers.has(name))out.set(name,upstream.headers.get(name));
  const info=driveMediaType(upstream);
  out.set('Content-Type',ticket.t?'video/mp4':(info.mime&&info.mime!=='application/octet-stream'?info.mime:ticket.m)||(ticket.a?'audio/mpeg':'video/mp4'));
  out.set('Content-Disposition','inline');out.set('Accept-Ranges','bytes');out.set('Cache-Control','private, no-store');out.set('X-Content-Type-Options','nosniff');
  if(req.method==='HEAD'){
   const size=/\/(\d+)$/.exec(out.get('Content-Range')||'')?.[1];await upstream.body?.cancel();out.delete('Content-Range');if(size)out.set('Content-Length',size);
   return new Response(null,{status:200,headers:out});
  }
  return new Response(upstream.body,{status:206,headers:out});
 }catch(error){
  if(req.signal.aborted)return new Response(null,{status:499,headers:cors});
  return json({error:'DRIVE_PLAYBACK_FAILED',message:error?.name==='TimeoutError'?'O Drive demorou para responder. Tente novamente.':'Não foi possível acessar o arquivo do Drive agora.'},503);
 }
}
