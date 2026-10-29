/**
 * LX Plus Next — ingestão de pastas Google Drive.
 * Preview via Edge Function já existente; confirmação e publicação usando RPC ADM.
 * NÃO contém credenciais do Google/metadata providers no frontend.
 */
export function parseFolderId(input){
 const value=String(input||'').trim();
 if(/^[a-zA-Z0-9_-]{10,128}$/.test(value))return value;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(url.hostname.toLowerCase()))return null;
  const match=url.pathname.match(/\/folders\/([a-zA-Z0-9_-]{10,128})(?:\/|$)/);
  const id=match?.[1]||url.searchParams.get('id')||'';
  return /^[a-zA-Z0-9_-]{10,128}$/.test(id)?id:null;
 }catch{return null}
}
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function parseMediaFilename(filename){
 const name=String(filename||'').replace(/.*[\\/]/,'').slice(0,250);
 const ext=(name.match(/\.([a-z0-9]{2,6})$/i)||[])[1]?.toLowerCase()||'';
 const episode=name.match(/\bS(\d{1,2})[ ._-]*E(\d{1,3})\b/i)||name.match(/\b(\d{1,2})x(\d{1,3})\b/i);
 const year=(name.match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/)||[])[1]||'';
 const cleaned=name.replace(/\.[a-z0-9]{2,6}$/i,'').replace(/[._]+/g,' ').replace(/[()[\]{}]/g,' ')
 .replace(/\bS\d{1,2}[ ._-]*E\d{1,3}\b/ig,' ').replace(/\b\d{1,2}x\d{1,3}\b/ig,' ')
 .replace(/\b(19|20)\d{2}\b/g,' ')
 .replace(/\b(?:4k|2160p|1080p|720p|480p|bluray|brrip|webrip|web.?dl|x26[45]|h26[45]|hevc|dublado|legendado|multi|dual|aac|dts|hdr|atmos|remux)\b/gi,' ')
 .replace(/\s+/g,' ').trim();
 return {original:name,ext,year:year?Number(year):null,title:cleaned||name,isEpisode:!!episode,season:episode?Number(episode[1]):null,episode:episode?Number(episode[2]):null};
}
export function deterministicCatalogId(driveId){
 const key=String(driveId||'');
 if(!/^[\w-]{10,256}$/.test(key))throw Error('ID de arquivo inválido.');
 // FNV-1a 32-bit: stable below MAX_SAFE_INTEGER; a collision is checked server-side.
 let hash=2166136261;
 for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0}
 return 50000000000000+hash;
}
export function classifyImportRow(row){
 const parsed=row?.parsed||parseMediaFilename(row?.name);
 const driveId=String(row?.driveId||'');
 const match=row?.match||{};
 const nameScore=Number(row?.confidence||0);
 const matchTitle=normalize(match.title);
 const rawTitle=normalize(parsed?.title);
 const expectedYear=Number(parsed?.year||0);
 const gotYear=Number(match?.year||0);
 const yearMatch=!expectedYear||!gotYear||expectedYear===gotYear;
 const score=nameScore>=.9&&!!rawTitle&&!!matchTitle&&yearMatch;
 const isMovie=parsed?.type==='movie'||(!parsed?.type&&!parsed?.isEpisode&&/^(?:mp4|mkv|m4v|mov|webm|avi)$/.test(parsed?.ext||''));
 const sameSource=!!(row?.alreadyImported||row?.duplicate);
 return {
  ...row,
  parsed,
  score:nameScore,
  qualifies:Boolean(isMovie&&score&&match?.title&&match?.cover&&!sameSource&&/^[\w-]{10,256}$/.test(driveId)),
  reason:sameSource?'Já importado':!driveId?'Arquivo sem ID válido':parsed?.isEpisode?'Episódio requer organização por temporada':!isMovie?'Somente filmes entram na publicação automática':!yearMatch?'Ano não confere':!match?.cover?'Sem capa confirmada':!score?'Correspondência precisa de revisão':'Pronto para publicar'
 };
}
export function buildMoviePayload(row,rightsConfirmed){
 const item=classifyImportRow(row);
 if(!rightsConfirmed)throw Error('Confirme os direitos de distribuição deste conteúdo antes de publicar.');
 if(!item.qualifies)throw Error('Título não aprovado para importação automática: '+item.reason);
 const driveId=String(item.driveId),m=item.match,p=item.parsed;
 const viewUrl='https://drive.google.com/file/d/'+encodeURIComponent(driveId)+'/view';
 return {
  id:deterministicCatalogId(driveId),
  title:String(m.title||p.title).slice(0,200),
  originalTitle:String(p.title||'').slice(0,200),
  year:Number(m.year||p.year)||null,
  type:'Filme',
  desc:String(m.desc||'').slice(0,2400),
  cover:String(m.cover||''),
  banner:String(m.banner||''),
  genre:String(m.genre||''),
  genres:Array.isArray(m.genres)?m.genres:[],
  duration:Number(m.duration||0),
  cast:Array.isArray(m.cast)?m.cast.slice(0,25):[],
  creator:String(m.creator||'').slice(0,200),
  rating:Number(m.rating||0),
  driveId,
  sourceUrl:viewUrl,
  playbackMode:'google-drive-preview',
  sourceProvider:'Google Drive',
  metadataProvider:'TMDB',
  providerRemoteId:'tmdb:movie:'+String(m.remoteId||''),
  catalogIdentity:'google-drive:file:'+driveId,
  sourceVerified:true,
  license:{authorized:true,basis:'admin-attested',confirmedAt:new Date().toISOString()},
  published:true,
  importBatch:'drive-import-'+new Date().toISOString().slice(0,10),
  autoPublished:true,
  importedAt:new Date().toISOString()
 };
}
export async function scanDriveFolder(db,input,{limit=100,onProgress=()=>{}}={}){
 const folderId=parseFolderId(input);
 if(!folderId)throw Error('Informe o link da pasta do Google Drive ou seu ID válido.');
 const maxItems=Math.max(1,Math.min(300,Number(limit)||100));
 onProgress('Buscando vídeos na pasta…');
 const scan=await db.functions.invoke('lx-universal-importer',{body:{action:'drive_scan',folder:folderId,maxItems}});
 if(scan.error)throw Error('Falha ao ler a pasta: '+scan.error.message);
 if(scan.data?.error)throw Error('Falha ao ler a pasta: '+scan.data.error);
 const files=(scan.data?.items||[]).filter(f=>f?.driveId&&/\.(mp4|mkv|webm|m4v|mov|avi)$/i.test(f.name||'')).slice(0,maxItems);
 const out=[];
 for(let i=0;i<files.length;i+=20){
  onProgress('Identificando filmes '+(i+1)+'–'+Math.min(i+20,files.length)+' de '+files.length+'…');
  const chunk=files.slice(i,i+20);
  const matched=await db.functions.invoke('lx-universal-importer',{body:{action:'catalog_match_batch',items:chunk}});
  if(matched.error)throw Error('Falha ao identificar os arquivos: '+matched.error.message);
  if(matched.data?.error)throw Error('Falha ao identificar os arquivos: '+matched.data.error);
  out.push(...(matched.data?.items||[]).map(classifyImportRow));
 }
 return {folderId,files:out,truncated:!!scan.data?.truncated,foldersScanned:Number(scan.data?.foldersScanned||0)};
}
export async function inspectDuplicate(db,row){
 const targetId=deterministicCatalogId(row.driveId);
 const sameId=await db.from('lx_catalog').select('id,payload').eq('id',targetId).maybeSingle();
 if(sameId.error)throw sameId.error;
 if(sameId.data){
  if(sameId.data.payload?.driveId===row.driveId)return{exists:true,kind:'same-file',id:sameId.data.id};
  return{exists:true,kind:'collision',id:sameId.data.id};
 }
 const link='https://drive.google.com/file/d/'+encodeURIComponent(row.driveId)+'/view';
 const byKey=await db.from('lx_catalog').select('id').contains('payload',{driveId:row.driveId}).limit(1);
 if(byKey.error)throw byKey.error;
 if(byKey.data?.length)return{exists:true,kind:'same-file',id:byKey.data[0].id};
 const byLink=await db.from('lx_catalog').select('id').contains('payload',{sourceUrl:link}).limit(1);
 if(byLink.error)throw byLink.error;
 if(byLink.data?.length)return{exists:true,kind:'same-file',id:byLink.data[0].id};
 return{exists:false};
}
export async function publishMatches(db,rows,{rightsConfirmed=false,onProgress=()=>{}}={}){
 if(!rightsConfirmed)throw Error('É necessário declarar a autorização de distribuição antes da publicação.');
 const selected=rows.map(classifyImportRow).filter(x=>x.qualifies).slice(0,100);
 const result={published:[],duplicates:[],errors:[]};
 for(let i=0;i<selected.length;i++){
  const item=selected[i];onProgress('Publicando '+(i+1)+'/'+selected.length+': '+String(item.match?.title||item.name));
  try{
   const dupe=await inspectDuplicate(db,item);
   if(dupe.exists){result.duplicates.push({name:item.name,reason:dupe.kind});continue}
   const payload=buildMoviePayload(item,true),id=deterministicCatalogId(item.driveId);
   const write=await db.rpc('lx_catalog_upsert_item',{p_id:id,p_payload:payload,p_published:true});
   if(write.error)throw write.error;
   result.published.push({id,title:payload.title});
  }catch(error){result.errors.push({name:item.name,message:String(error.message||error)})}
 }
 return result;
}
