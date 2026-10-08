/* Trusted provider adapters. Discovery records contain no playback URL. */
export const UA='LXPlusCatalog/1.0 (https://github.com/sergiolx7/lxplus; licensed media and CC0 metadata)';
export const CREATOR_CATALOG='https://incompetech.com/music/royalty-free/pieces.json';
export const CREATOR_LICENSE='https://incompetech.com/agent-section/';
export const clean=v=>String(v??'').replace(/<[^>]*>/g,'').trim().slice(0,8000);
export const xml=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const seconds=v=>String(v||'').split(':').reduce((n,p)=>n*60+Number(p),0);
export const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
export const stableId=async identity=>9000000000000+parseInt((await digest(new TextEncoder().encode(identity))).slice(0,11),16);
export function artwork(title,subtitle,seed='LX'){
 const lines=clean(title).slice(0,100).match(/.{1,22}(?:\s|$)|.{1,22}/g)||['LX'];
 const hue=[...String(seed)].reduce((n,c)=>n+c.charCodeAt(0),0)%360;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hue} 60% 24%)"/><stop offset="1" stop-color="#070b15"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="500" cy="250" r="235" fill="none" stroke="#ffffff16" stroke-width="2"/><circle cx="500" cy="250" r="175" fill="none" stroke="#ffffff10"/><text x="48" y="72" fill="#b9e8ff" font-size="25" font-family="sans-serif" font-weight="700">LX+</text><path d="M58 315L58 425L145 370Z" fill="#ffffff22"/>${lines.slice(0,4).map((line,i)=>`<text x="45" y="${550+i*54}" fill="#f3f8ff" font-size="40" font-family="sans-serif" font-weight="700">${xml(line.trim())}</text>`).join('')}<text x="45" y="825" fill="#bed0e7" font-size="21" font-family="sans-serif">${xml(clean(subtitle).slice(0,40))}</text></svg>`;
}
export function inspectMp3(bytes,expected=0){
 if(!(bytes instanceof Uint8Array)||bytes.length<100||bytes.length>25000000)throw new Error('MP3_SIZE_INVALID');
 let at=0;if(bytes[0]===73&&bytes[1]===68&&bytes[2]===51){if(bytes.slice(6,10).some(b=>b>127))throw new Error('MP3_ID3_INVALID');at=10+((bytes[6]<<21)|(bytes[7]<<14)|(bytes[8]<<7)|bytes[9])+((bytes[5]&16)?10:0);}
 const start=at;let frames=0,duration=0,last=at;
 while(at+4<bytes.length){
  if(bytes[at]!==255||(bytes[at+1]&224)!==224){if(!frames&&at-start<4096){at++;continue;}break;}
  const version=(bytes[at+1]>>3)&3,layer=(bytes[at+1]>>1)&3,bit=(bytes[at+2]>>4)&15,sr=(bytes[at+2]>>2)&3,pad=(bytes[at+2]>>1)&1;
  if(version===1||layer!==1||bit===0||bit===15||sr===3)break;
  const rate=[44100,48000,32000][sr]/(version===3?1:version===2?2:4),kbps=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bit];
  const length=Math.floor((version===3?144000:72000)*kbps/rate)+pad;if(at+length>bytes.length)throw new Error('MP3_TRUNCATED');
  frames++;duration+=(version===3?1152:576)/rate;at+=length;last=at;
 }
 if(frames<20||duration<2||bytes.length-last>Math.max(4096,bytes.length*.015))throw new Error('MP3_FRAMES_INVALID');
 if(expected>0&&Math.abs(duration-expected)>Math.max(4,expected*.025))throw new Error('MP3_DURATION_MISMATCH');
 return {duration:Math.round(duration),frames,bytes:bytes.length};
}
export function musicSource(piece){
 if(!/^USUAN\d{7}$/.test(piece?.isrc||'')||!clean(piece.title)||!piece.filename||/[\\/]/.test(piece.filename)||!piece.filename.endsWith('.mp3')||seconds(piece.length)<2||seconds(piece.length)>1800)throw new Error('CREATOR_RECORD_INVALID');
 return 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/'+encodeURIComponent(piece.filename);
}
export function movieEntity(e){
 if(!/^Q\d+$/.test(e?.id||''))return null;
 const title=e.labels?.pt?.value||e.labels?.['pt-br']?.value||e.labels?.en?.value||e.labels?.mul?.value||Object.values(e.labels||{})[0]?.value;
 if(!title)return null;
 const dates=(e.claims?.P577||[]).map(c=>Number(c.mainsnak?.datavalue?.value?.time?.slice(1,5))).filter(n=>n>=1850&&n<=2100);
 return {id:e.id,title:clean(title).slice(0,500),year:dates.length?Math.min(...dates):null,description:clean(e.descriptions?.pt?.value||e.descriptions?.en?.value||''),cover_url:'',artwork:{kind:'lx'},source_url:'https://www.wikidata.org/wiki/'+e.id,commonsFile:(e.claims?.P18||[]).map(c=>c.mainsnak?.datavalue?.value).find(v=>typeof v==='string')||''};
}
export function commonsArtwork(page){
 const i=page?.imageinfo?.[0],m=i?.extmetadata||{},label=clean(m.LicenseShortName?.value),url=i?.thumburl||i?.url;
 if(!url||!/^https:\/\/upload\.wikimedia\.org\//.test(url)||!(/^(?:CC0|CC BY(?:-SA)? [1-4]\.\d|Public domain)$/i.test(label)))return null;
 const source=i.descriptionurl;if(!/^https:\/\/commons\.wikimedia\.org\//.test(source||''))return null;
 return {cover_url:url,artwork:{kind:'commons',license:label,creator:clean(m.Artist?.value).slice(0,500),source_url:source,license_url:/^https:\/\/creativecommons\.org\//.test(m.LicenseUrl?.value||'')?m.LicenseUrl.value:''}};
}
export function prelingerLicense(meta){
 const collection=Array.isArray(meta?.collection)?meta.collection:[meta?.collection];if(!collection.includes('prelinger'))return '';
 const url=String(meta.licenseurl||'').replace(/^http:/,'https:').replace(/\/?$/,'/');
 return ['https://creativecommons.org/publicdomain/zero/1.0/','https://creativecommons.org/licenses/publicdomain/','https://creativecommons.org/publicdomain/mark/1.0/'].includes(url)?url:'';
}
export async function boundedResponse(response,maximum){
 if(Number(response.headers.get('content-length')||0)>maximum){await response.body?.cancel();throw new Error('PROVIDER_RESPONSE_TOO_LARGE');}
 const reader=response.body?.getReader();if(!reader)throw new Error('EMPTY_PROVIDER_RESPONSE');let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maximum)throw new Error('PROVIDER_RESPONSE_TOO_LARGE');chunks.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}return bytes;
}
export function createAutomation({db,fetcher=fetch,base,now=()=>Date.now()}){
 let deadline=0;
 const check=r=>{if(r.error)throw new Error('AUTOMATION_DATABASE_ERROR');return r.data;};
 async function request(url,{max=3000000,headers={},raw=false,timeout=20000}={}){
  if(now()+2000>=deadline)throw new Error('WORKER_DEADLINE');
  const original=new URL(url);let current=url,response;
  for(let hop=0;hop<4;hop++){
   response=await fetcher(current,{headers:{'User-Agent':UA,accept:raw?'*/*':'application/json',...headers},redirect:'manual',signal:AbortSignal.timeout(Math.min(timeout,Math.max(1000,deadline-now()-1000)))});
   if(![301,302,303,307,308].includes(response.status))break;
   const target=new URL(response.headers.get('location')||'',current);
   await response.body?.cancel();
   const same=target.hostname===original.hostname,archive=original.hostname==='archive.org'&&(target.hostname==='archive.org'||target.hostname.endsWith('.archive.org')),creator=original.hostname==='incompetech.com'&&(target.hostname==='incompetech.com'||target.hostname.endsWith('.incompetech.com'));
   if(target.protocol!=='https:'||target.username||target.password||target.port&&target.port!=='443'||!(same||archive||creator)||hop===3)throw new Error('PROVIDER_REDIRECT_BLOCKED');current=target.href;
  }
  if(response.status===429){const e=new Error('PROVIDER_RATE_LIMIT');e.retry=Math.min(86400,Math.max(900,Number(response.headers.get('retry-after'))||900));throw e;}
  if(!response.ok)throw new Error('PROVIDER_HTTP_'+response.status);
  const bytes=await boundedResponse(response,max);return raw?{bytes,response}:JSON.parse(new TextDecoder().decode(bytes));
 }
 async function films(j){
  const recent=j.processed===0,year=new Date().getUTCFullYear();
  const select=recent?`SELECT DISTINCT ?film WHERE { ?film wdt:P31 wd:Q11424; wdt:P577 ?date . FILTER(?date >= "${year}-01-01T00:00:00Z"^^xsd:dateTime) } LIMIT ${j.batch_size}`:`SELECT DISTINCT ?film WHERE { ?film wdt:P31 wd:Q11424 } LIMIT ${j.batch_size} OFFSET ${j.cursor}`;
  const query=`SELECT ?film (SAMPLE(?pt) AS ?ptLabel) (SAMPLE(?en) AS ?enLabel) (SAMPLE(?other) AS ?label) (MIN(?date) AS ?release) (SAMPLE(?description) AS ?desc) (SAMPLE(?image) AS ?image) WHERE { { ${select} } OPTIONAL { ?film rdfs:label ?pt FILTER(LANG(?pt)="pt") } OPTIONAL { ?film rdfs:label ?en FILTER(LANG(?en)="en") } OPTIONAL { ?film rdfs:label ?other } OPTIONAL { ?film wdt:P577 ?date } OPTIONAL { ?film schema:description ?description FILTER(LANG(?description)="pt"||LANG(?description)="en") } OPTIONAL { ?film wdt:P18 ?image } } GROUP BY ?film`;
  const result=await request('https://query.wikidata.org/sparql?'+new URLSearchParams({query,format:'json'}),{headers:{accept:'application/sparql-results+json'},timeout:35000});
  const bindings=result.results?.bindings||[],ids=[...new Set(bindings.map(r=>r.film?.value?.split('/').pop()).filter(id=>/^Q\d+$/.test(id)))];
  const rows=bindings.map(r=>{const id=r.film?.value?.split('/').pop(),title=r.ptLabel?.value||r.enLabel?.value||r.label?.value;if(!/^Q\d+$/.test(id||'')||!title)return null;let file='';try{if(r.image?.value?.startsWith('http://commons.wikimedia.org/wiki/Special:FilePath/'))file=decodeURIComponent(r.image.value.split('/Special:FilePath/')[1]);}catch{}const release=Number(String(r.release?.value||'').slice(0,4));return {id,title:clean(title).slice(0,500),year:release>=1850&&release<=2100?release:null,description:clean(r.desc?.value||''),cover_url:'',artwork:{kind:'lx',commons_file:file},source_url:'https://www.wikidata.org/wiki/'+id,commonsFile:file};}).filter(Boolean);
  const pending=check(await db.from('lx_auto_discovery').select('id,artwork').eq('cover_url','').eq('curator_locked',false).neq('artwork->>commons_file','').order('updated_at',{ascending:true}).limit(25))||[];
  const repairs=pending.map(r=>({...r,commonsFile:r.artwork?.commons_file||'',cover_url:''}));
  const withImages=[...rows.filter(r=>r.commonsFile).slice(0,25),...repairs].slice(0,50);
  if(withImages.length){try{const images=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',titles:[...new Set(withImages.map(r=>'File:'+r.commonsFile))].join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiextmetadatafilter:'LicenseShortName|LicenseUrl|Artist',iiurlwidth:'500',format:'json',maxlag:'5'}),{max:3000000});if(images.error)throw new Error('PROVIDER_MAXLAG');for(const page of Object.values(images.query?.pages||{})){const art=commonsArtwork(page);if(!art)continue;for(const row of withImages.filter(r=>'File:'+r.commonsFile.replaceAll('_',' ')===page.title)){row.cover_url=art.cover_url;row.artwork={...row.artwork,...art.artwork};}}}catch{ /* Keep a clearly labeled LX cover when image rights cannot be verified. */ }}
  const values=rows.map(({commonsFile,...row})=>({...row,updated_at:new Date(now()).toISOString()}));
  const inserted=values.length?check(await db.from('lx_auto_discovery').upsert(values,{onConflict:'id',ignoreDuplicates:true}).select('id')):[];
  for(const row of [...rows.filter(r=>r.cover_url),...repairs]){
   const change={updated_at:new Date(now()).toISOString()};if(row.cover_url){change.cover_url=row.cover_url;change.artwork=row.artwork;}
   check(await db.from('lx_auto_discovery').update(change).eq('id',row.id).eq('cover_url','').eq('curator_locked',false));
  }
  return {scanned:ids.length,added:inserted?.length||0,cursor:recent?j.cursor:ids.length?j.cursor+ids.length:0};
 }
 async function readyFilm(j){
  const q='collection:prelinger AND mediatype:movies AND licenseurl:* AND (subject:drama OR subject:comedy OR subject:animation OR subject:cartoon)';
  const list=await request('https://archive.org/advancedsearch.php?'+new URLSearchParams({q,output:'json',rows:'3',page:String(Math.floor(j.media_cursor/3)+1),'sort[]':'identifier asc','fl[]':'identifier'}));
  const candidates=list.response?.docs||[];let cursor=j.media_cursor;
  for(const c of candidates.slice(j.media_cursor%3)){cursor++;if(!/^[\w-]+$/.test(c.identifier||''))continue;
   const externalId='archive:'+c.identifier;
   const existing=check(await db.from('lx_catalog').select('id').eq('payload->>externalId',externalId).limit(1));if(existing.length)continue;
   const data=await request('https://archive.org/metadata/'+c.identifier,{max:4000000});const m=data.metadata||{},license=prelingerLicense(m);if(!license)continue;
   const file=(data.files||[]).filter(f=>f.format==='h.264'&&/\.mp4$/i.test(f.name)&&Number(f.size)>10000&&Number(f.size)<1500000000).sort((a,b)=>Number(a.size)-Number(b.size))[0];if(!file)continue;
   const video='https://archive.org/download/'+c.identifier+'/'+encodeURIComponent(file.name),probe=await request(video,{headers:{Range:'bytes=0-8191'},max:16384,raw:true});
   if(probe.response.status!==206||new TextDecoder().decode(probe.bytes.slice(4,8))!=='ftyp')continue;
   const id=await stableId(externalId),title=clean(Array.isArray(m.title)?m.title[0]:m.title).slice(0,500);if(!title)continue;
   const item={id,type:'Filme',title,year:Number(String(m.year||m.date||'').slice(0,4))||null,genre:'Cinema livre',genres:['Cinema livre','Acervo histórico'],cover:'https://archive.org/services/img/'+c.identifier,desc:clean(m.description).slice(0,3000)||'Filme do acervo histórico Prelinger Archives.',duration:clean(m.runtime)||'',mediaKey:video,authorizedVideoUrl:video,sourceProvider:'Internet Archive · Prelinger',sourceVerified:true,externalId,openFilm:true,playbackMode:'native_open_film',license:{name:license.includes('/zero/')?'CC0':'Domínio público',url:license,creator:clean(m.creator)||'Prelinger Archives',credit:title+' · Prelinger Archives',sourceUrl:'https://archive.org/details/'+c.identifier},openFilmEvidence:{collection:'prelinger',metadataUrl:'https://archive.org/metadata/'+c.identifier,mediaFormat:'h.264',verifiedAt:new Date(now()).toISOString()},createdAt:new Date(now()).toISOString()};
   const result=check(await db.rpc('lx_auto_publish',{p_item:item}));return {cursor,added:result.inserted?1:0};
  }return {cursor:candidates.length?cursor:0,added:0};
 }
 async function music(j,progress){
  const feed=await request(CREATOR_CATALOG,{max:5000000});if(!Array.isArray(feed)||feed.length>5000)throw new Error('CREATOR_CATALOG_INVALID');
  const pieces=feed.filter(p=>{try{musicSource(p);return true;}catch{return false;}});
  pieces.sort((a,b)=>(/^\d{4}-\d{2}-\d{2}$/.test(b.uploaded)?b.uploaded:'').localeCompare(/^\d{4}-\d{2}-\d{2}$/.test(a.uploaded)?a.uploaded:'')||String(a.isrc).localeCompare(String(b.isrc)));
  let scanned=0,added=0,bytes=0,cursor=j.cursor;
  const usage=Number(check(await db.rpc('lx_auto_asset_usage')))||0;
  if(usage+25000000>j.asset_budget_bytes)throw new Error('ASSET_STORAGE_BUDGET');
  while(scanned<j.batch_size&&pieces.length){
   const piece=pieces[cursor%pieces.length];cursor=(cursor+1)%pieces.length;scanned++;progress.scanned=scanned;
   const source=musicSource(piece),externalId='incompetech:'+piece.isrc;
   const existing=check(await db.from('lx_catalog').select('id').eq('payload->>externalId',externalId).limit(1));if(existing.length){progress.cursor=cursor;continue;}
   if(j.bytes+bytes+25000000>j.daily_budget_bytes||usage+bytes+25000000>j.asset_budget_bytes)throw new Error('ASSET_STORAGE_BUDGET');
   let downloaded,probe;
   try{downloaded=await request(source,{raw:true,max:25000000,timeout:25000});probe=inspectMp3(downloaded.bytes,seconds(piece.length));}
   catch(e){if(e.message==='PROVIDER_RESPONSE_TOO_LARGE'||e.message==='PROVIDER_HTTP_404'||String(e.message).startsWith('MP3_')){progress.cursor=cursor;progress.skipped=(progress.skipped||0)+1;continue;}throw e;}
   const audio=downloaded.bytes,sha=await digest(audio);
   const key='automated/incompetech/'+piece.isrc+'-'+sha.slice(0,12)+'.mp3',coverKey='automated/incompetech/'+piece.isrc+'.svg';
   let uploaded=false;
   const upload=await db.storage.from('lx-assets').upload(key,audio,{contentType:'audio/mpeg',cacheControl:'31536000',upsert:false});
   if(upload.error&&!['409','Duplicate','409 Conflict'].includes(String(upload.error.statusCode||upload.error.error)))throw new Error('ASSET_UPLOAD_FAILED');if(!upload.error)uploaded=true;
   try{
    const media=base+'/storage/v1/object/public/lx-assets/'+key,verified=await request(media,{raw:true,max:25000000,timeout:25000});if(verified.bytes.length!==audio.length||await digest(verified.bytes)!==sha)throw new Error('ASSET_HASH_MISMATCH');
    const cover=await db.storage.from('lx-assets').upload(coverKey,new TextEncoder().encode(artwork(piece.title,'Kevin MacLeod',piece.isrc)),{contentType:'image/svg+xml',cacheControl:'86400',upsert:false});if(cover.error&&String(cover.error.statusCode)!=='409')throw new Error('COVER_UPLOAD_FAILED');
    const id=await stableId(externalId),license={name:'CC BY 4.0',url:'https://creativecommons.org/licenses/by/4.0/',evidenceUrl:CREATOR_LICENSE,sourceUrl:'https://incompetech.com/music/royalty-free/index.html?isrc='+piece.isrc,creator:'Kevin MacLeod',credit:piece.title+' · Kevin MacLeod (incompetech.com) · CC BY 4.0',changes:'Arquivo MP3 original, sem edição.'};
    const item={id,type:'Música',title:clean(piece.title),artist:'Kevin MacLeod',year:/^\d{4}-/.test(piece.uploaded)?Number(piece.uploaded.slice(0,4)):2000+Number(piece.isrc.slice(5,7)),genre:'Instrumental',genres:['Instrumental','Música livre'],cover:base+'/storage/v1/object/public/lx-assets/'+coverKey,desc:'Faixa instrumental de Kevin MacLeod. MP3 integral no player LX Music.',duration:probe.duration,mediaKey:media,authorizedAudioUrl:media,tracks:[{number:1,title:clean(piece.title),artist:'Kevin MacLeod',duration:probe.duration,mediaKey:media,authorizedAudioUrl:media}],sourceVerified:true,metadataProvider:'Incompetech',externalId,license,playbackMode:'native_owned',nativeAsset:{sha256:sha,bytes:audio.length,sourceUrl:source},createdAt:new Date(now()).toISOString()};
    const result=check(await db.rpc('lx_auto_publish',{p_item:item}));if(result.inserted){added++;bytes+=audio.length;progress.added=added;progress.bytes=bytes;progress.cursor=cursor;}else if(result.reason==='legacy_capacity')throw new Error('PLAYABLE_CATALOG_CAPACITY');
   }catch(e){if(uploaded)await db.storage.from('lx-assets').remove([key]);throw e;}
  }
  return {scanned,added,bytes,cursor,skipped:progress.skipped||0};
 }
 async function run(kind){
  if(!['films','music'].includes(kind))throw new Error('INVALID_JOB');deadline=now()+108000;
  const j=check(await db.rpc('lx_auto_claim',{p_kind:kind}));if(!j)return {skipped:true,kind};
  let result={scanned:0,added:0,bytes:0,cursor:j.cursor},media={added:0,cursor:j.media_cursor},error=null,retry=0;
  if(kind==='films'){
   try{result={...result,...await films(j)};}catch(e){error=String(e.message).slice(0,100);retry=e.retry||900;}
   try{media=await readyFilm(j);}catch(e){error=error||'FILM_SOURCE_'+String(e.message).slice(0,70);retry=Math.max(retry,e.retry||900);}
  }else{try{result=await music(j,result);}catch(e){error=String(e.message).slice(0,100);retry=e.retry||900;}}
  check(await db.rpc('lx_auto_finish',{p_kind:kind,p_lease:j.lease,p_cursor:result.cursor,p_media_cursor:media.cursor,p_scanned:result.scanned,p_added:result.added,p_playable:kind==='music'?result.added:media.added,p_bytes:result.bytes,p_error:error,p_retry_seconds:retry}));
  return {kind,scanned:result.scanned,added:result.added,playable:kind==='music'?result.added:media.added,bytes:result.bytes,error};
 }
 return {run};
}
