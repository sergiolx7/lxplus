import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {parseFolderId,parseMediaFilename} from '../../../src/drive-import.js';

const base=Deno.env.get('SUPABASE_URL')||'';
const service=createClient(base,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-lx-job-token','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const checked=async(p:any)=>{const r=await p;if(r.error)throw new Error(r.error.message);return r.data};
const clean=(value:unknown)=>String(value||'').trim();
const normalize=(value:unknown)=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function secret(key:string){const row=await checked(service.from('lx_integrations').select('secret').eq('key',key).maybeSingle());return clean(row?.secret)}
async function fetchJson(url:URL){const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!response.ok){await response.body?.cancel();throw new Error('PROVIDER_HTTP_'+response.status)}return await response.json()}
async function tmdb(path:string,params:Record<string,string>={}){const key=await secret('tmdb_v3');if(!key)throw new Error('TMDB_NOT_CONFIGURED');const url=new URL('https://api.themoviedb.org/3/'+path);url.searchParams.set('api_key',key);url.searchParams.set('language','pt-BR');for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);return await fetchJson(url)}
function titleScore(left:string,right:string){const a=normalize(left),b=normalize(right);if(!a||!b)return 0;if(a===b)return 1;const x=new Set(a.split(' ')),y=new Set(b.split(' '));let common=0;for(const t of x)if(y.has(t))common++;return common/Math.max(x.size,y.size)}
const image=(path:unknown,size='w780')=>typeof path==='string'&&/^\/[A-Za-z0-9.]+$/.test(path)?'https://image.tmdb.org/t/p/'+size+path:'';
async function matchFile(file:any,jobId:string){
 const parsed=parseMediaFilename(file.name),identity='drive:'+file.id;
 const payload:any={type:'Filme',title:parsed.title,year:parsed.year,driveId:file.id,sourceUrl:'https://drive.google.com/file/d/'+encodeURIComponent(file.id)+'/view',catalogIdentity:identity,sourceProvider:'Google Drive',sourceModifiedAt:file.modifiedTime||'',sourceMime:file.mimeType||'',sourceBytes:Number(file.size||0)};
 const active=await checked(service.from('lx_catalog').select('id').contains('payload',{driveId:file.id}).not('payload','cs',JSON.stringify({archived:true})).limit(1));
 if(active?.length)return{job_id:jobId,source_key:identity,filename:file.name,payload,confidence:0,status:'duplicate',reason:'Arquivo já está no catálogo ativo',catalog_id:active[0].id};
 const queued=await checked(service.from('lx_import_items').select('id,payload,status').eq('source_key',identity).neq('job_id',jobId).in('status',['ready','review','published']).order('created_at',{ascending:false}).limit(1));
 if(queued?.[0]&&queued[0].payload?.sourceModifiedAt===payload.sourceModifiedAt)return{job_id:jobId,source_key:identity,filename:file.name,payload,confidence:0,status:'duplicate',reason:'Arquivo já está em outra importação ou aguardando revisão'};
 if(parsed.isEpisode)return{job_id:jobId,source_key:identity,filename:file.name,payload,confidence:0,status:'review',reason:'Episódio: organize a temporada no editor de séries'};
 try{
  const result=await tmdb('search/movie',{query:parsed.title,include_adult:'false'});let candidate:any=null,confidence=0;
  for(const item of (result.results||[]).slice(0,10)){let score=Math.max(titleScore(parsed.title,item.title),titleScore(parsed.title,item.original_title));const year=Number(String(item.release_date||'').slice(0,4));if(parsed.year&&year!==parsed.year)score=Math.min(.65,score);if(score>confidence){confidence=score;candidate=item}}
  if(!candidate)return{job_id:jobId,source_key:identity,filename:file.name,payload,confidence:0,status:'review',reason:'Nenhuma correspondência encontrada no TMDB'};
  const detail=await tmdb('movie/'+candidate.id,{append_to_response:'credits'});
  Object.assign(payload,{title:detail.title||parsed.title,originalTitle:detail.original_title||'',year:Number(String(detail.release_date||'').slice(0,4))||parsed.year,desc:detail.overview||'',cover:image(detail.poster_path),banner:image(detail.backdrop_path,'w1280'),genre:(detail.genres||[]).map((g:any)=>g.name).join(' · '),genres:(detail.genres||[]).map((g:any)=>g.name),cast:(detail.credits?.cast||[]).slice(0,15).map((p:any)=>p.name),duration:Number(detail.runtime||0),metadataProvider:'TMDB',tmdbId:detail.id,metadataUrl:'https://www.themoviedb.org/movie/'+detail.id});
  const ready=confidence>=.9&&!!payload.cover&&/\.(mp4|m4v|webm|mov)$/i.test(file.name);
  return{job_id:jobId,source_key:identity,filename:file.name,payload,confidence,status:ready?'ready':'review',reason:ready?'Metadados identificados; revise antes de publicar':confidence<.9?'Título ou ano incerto: revisão obrigatória':!payload.cover?'Capa não disponível':'Verifique o formato e a prévia no Drive'};
 }catch(error){return{job_id:jobId,source_key:identity,filename:file.name,payload,confidence:0,status:'review',reason:error.message==='TMDB_NOT_CONFIGURED'?'Configure o TMDB e reanalise este arquivo':'Provedor de metadados indisponível; reanalise mais tarde'}}
}
async function createJob(source:any,userId:string){const row=await checked(service.from('lx_import_jobs').insert({source_id:source.id,created_by:userId,cursor:{queue:[source.folder_id],visited:[],current:null,pageToken:null,pending:[]}}).select('id,status,processed').single());return row}
async function step(jobId:string){
 if(!/^[a-f0-9-]{36}$/.test(jobId))throw new Error('INVALID_JOB');
 const claimed=await checked(service.from('lx_import_jobs').update({lease_until:new Date(Date.now()+60000).toISOString()}).eq('id',jobId).in('status',['pending','scanning','error']).or('lease_until.is.null,lease_until.lt.'+new Date().toISOString()).select('*').maybeSingle());
 if(!claimed)return{status:'busy',message:'Importação já está sendo processada ou está pronta para revisão.'};
 const cursor=structuredClone(claimed.cursor||{});cursor.queue||=[];cursor.visited||=[];cursor.pending||=[];
 try{
  if(!cursor.pending.length){
   if(!cursor.current){cursor.current=cursor.queue.shift()||null;cursor.pageToken=null;if(cursor.current)cursor.visited.push(cursor.current)}
   if(cursor.current){
    const key=await secret('google_drive_api_key');if(!key)throw new Error('GOOGLE_DRIVE_NOT_CONFIGURED');
    if(!/^[A-Za-z0-9_-]{10,128}$/.test(cursor.current))throw new Error('INVALID_FOLDER_CURSOR');
    const url=new URL('https://www.googleapis.com/drive/v3/files');for(const[k,v]of Object.entries({key,q:"'"+cursor.current+"' in parents and trashed=false",pageSize:'100',fields:'nextPageToken,files(id,name,mimeType,size,modifiedTime)',supportsAllDrives:'true',includeItemsFromAllDrives:'true'}))url.searchParams.set(k,v);
    if(cursor.pageToken)url.searchParams.set('pageToken',cursor.pageToken);
    const page=await fetchJson(url);
    for(const file of page.files||[]){if(file.mimeType==='application/vnd.google-apps.folder'){if(!cursor.visited.includes(file.id)&&!cursor.queue.includes(file.id)){if(cursor.visited.length+cursor.queue.length>=1000)throw new Error('FOLDER_LIMIT_REACHED');cursor.queue.push(file.id)}}else if(/\.(mp4|mkv|m4v|mov|webm|avi)$/i.test(file.name))cursor.pending.push(file)}
    cursor.pageToken=page.nextPageToken||null;if(!cursor.pageToken)cursor.current=null;
   }
  }
  const batch=cursor.pending.splice(0,8),rows=[];
  for(let n=0;n<batch.length;n+=4)rows.push(...await Promise.all(batch.slice(n,n+4).map((file:any)=>matchFile(file,jobId))));
  if(rows.length)await checked(service.from('lx_import_items').upsert(rows,{onConflict:'job_id,source_key',ignoreDuplicates:true}));
  const status=cursor.pending.length||cursor.queue.length||cursor.current?'scanning':'review',processed=claimed.processed+batch.length;
  await checked(service.from('lx_import_jobs').update({cursor,status,processed,lease_until:null,last_error:null,updated_at:new Date().toISOString()}).eq('id',jobId));
  if(status==='review'&&claimed.source_id)await checked(service.from('lx_drive_sources').update({last_sync_at:new Date().toISOString(),last_error:null,next_sync_at:new Date(Date.now()+900000).toISOString()}).eq('id',claimed.source_id));
  return{jobId,status,processed,added:rows.length,folders:cursor.visited.length};
 }catch(error){const message=['GOOGLE_DRIVE_NOT_CONFIGURED','INVALID_FOLDER_CURSOR','FOLDER_LIMIT_REACHED'].includes(error.message)?error.message:String(error.message).startsWith('PROVIDER_HTTP_')?error.message:'IMPORT_STEP_FAILED';await service.from('lx_import_jobs').update({status:'error',last_error:message,lease_until:null,updated_at:new Date().toISOString()}).eq('id',jobId);throw new Error(message)}
}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
 try{
  const raw=await req.text();if(raw.length>16000)return json({error:'REQUEST_TOO_LARGE'},413);let body:any;try{body=JSON.parse(raw)}catch{return json({error:'INVALID_JSON'},400)}
  const schedulerToken=req.headers.get('x-lx-job-token')||'';
  if(body.action==='sync_due'){
   if(!/^[a-f0-9]{64}$/.test(schedulerToken))return json({error:'UNAUTHORIZED'},401);
   const allowed=await checked(service.rpc('lx_auto_authorize',{p_token:schedulerToken}));if(allowed!==true)return json({error:'UNAUTHORIZED'},401);
   const sources=await checked(service.from('lx_drive_sources').select('id,folder_id,created_by').eq('enabled',true).lte('next_sync_at',new Date().toISOString()).limit(3));
   for(const source of sources||[]){const open=await checked(service.from('lx_import_jobs').select('id').eq('source_id',source.id).in('status',['pending','scanning']).limit(1));if(!open?.length)await createJob(source,source.created_by);await checked(service.from('lx_drive_sources').update({next_sync_at:new Date(Date.now()+900000).toISOString()}).eq('id',source.id))}
   const pending=await checked(service.from('lx_import_jobs').select('id').in('status',['pending','scanning']).order('updated_at').limit(3));const results=[];for(const job of pending||[])results.push(await step(job.id));return json({results});
  }
  const bearer=req.headers.get('Authorization')||'',token=bearer.replace(/^Bearer\s+/i,'');if(!token)return json({error:'AUTH_REQUIRED'},401);
  const {data:auth,error}=await service.auth.getUser(token);if(error||!auth?.user)return json({error:'AUTH_REQUIRED'},401);
  const caller=createClient(base,Deno.env.get('SUPABASE_ANON_KEY')||'',{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
  if(await checked(caller.rpc('lx_admin_can',{p_capability:'catalog'}))!==true)return json({error:'ADMIN_REQUIRED'},403);
  if(body.action==='status')return json({driveConfigured:!!await secret('google_drive_api_key'),tmdbConfigured:!!await secret('tmdb_v3'),privateDriveOAuth:false});
  if(body.action==='start'){
   let source:any;if(body.sourceId)source=await checked(service.from('lx_drive_sources').select('*').eq('id',body.sourceId).single());else{const folder=parseFolderId(body.folder);if(!folder)return json({error:'INVALID_FOLDER'},400);source=await checked(service.from('lx_drive_sources').upsert({folder_id:folder,name:clean(body.name||'Pasta do Google Drive').slice(0,100),created_by:auth.user.id,enabled:false},{onConflict:'folder_id',ignoreDuplicates:true}).select('*').maybeSingle());if(!source)source=await checked(service.from('lx_drive_sources').select('*').eq('folder_id',folder).single())}
   const open=await checked(service.from('lx_import_jobs').select('id,status,processed').eq('source_id',source.id).in('status',['pending','scanning','error']).order('created_at',{ascending:false}).limit(1));return json(open?.[0]||await createJob(source,auth.user.id));
  }
  if(body.action==='step')return json(await step(clean(body.jobId)));
  if(body.action==='reprocess'){const item=await checked(service.from('lx_import_items').select('*').eq('id',body.itemId).single());if(!['review','error'].includes(item.status))return json({error:'ITEM_NOT_REVIEWABLE'},409);const row=await matchFile({id:item.source_key.slice(6),name:item.filename,mimeType:item.payload.sourceMime,size:item.payload.sourceBytes,modifiedTime:item.payload.sourceModifiedAt},item.job_id);await checked(service.from('lx_import_items').update(row).eq('id',item.id));return json({status:row.status})}
  if(body.action==='artwork'){const id=Number(body.tmdbId);if(!Number.isInteger(id)||id<1)return json({error:'INVALID_MOVIE'},400);const data=await tmdb('movie/'+id+'/images',{include_image_language:'pt,en,null'});return json({posters:(data.posters||[]).slice(0,20).map((a:any)=>({url:image(a.file_path),width:a.width,height:a.height})),banners:(data.backdrops||[]).slice(0,20).map((a:any)=>({url:image(a.file_path,'w1280'),width:a.width,height:a.height}))})}
  return json({error:'UNKNOWN_ACTION'},400);
 }catch(error){const message=String(error?.message||'IMPORT_FAILED').replace(/https?:\/\/\S+/g,'[provider]').slice(0,200);return json({error:message},message==='GOOGLE_DRIVE_NOT_CONFIGURED'?409:503)}
});
