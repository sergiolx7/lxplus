import {CatalogError,parseReference,metadataOnly,legacyItem,mergeCards,rankSources,healthStatus,publicUrl,allowedUrl,safeExternal,integer,list,text,KINDS} from './universal-core.mjs';
import {createProviders} from './universal-providers.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const validId=v=>UUID.test(String(v||''));
const check=(result,code='CATALOG_DATABASE_NOT_READY')=>{if(result.error){const known=['JOB_NOT_FINISHED','IDENTITY_CONFLICT','INVALID_BATCH_SIZE','EXTERNAL_ID_REQUIRED'];if(known.includes(result.error.message))throw new CatalogError(result.error.message,409);throw new CatalogError(code,503);}return result.data;};
/** @type {(host: string) => Promise<string[]>} */
const defaultResolveDns=async(_host)=>[];
export function createCatalogService({db,env=(_name)=>'',fetcher=fetch,resolveDns=defaultResolveDns,providers:provided=null}) {
  const providers=provided||createProviders({db,env,fetcher});
  const mediaHosts=()=>[...String(env('LX_MEDIA_ALLOWED_HOSTS')||'').split(',').map(s=>s.trim()).filter(Boolean),new URL(env('SUPABASE_URL')).hostname];
  async function dnsSafe(url) {
    const clean=allowedUrl(url,mediaHosts());if(!clean)throw new CatalogError('SOURCE_HOST_NOT_ALLOWED');
    const host=new URL(clean).hostname,addresses=await resolveDns(host);
    if(!addresses.length || addresses.some(a=>{
      if(a.includes(':'))return /^(?:fc|fd|fe8|fe9|fea|feb|ff|::|2001:db8)/i.test(a)||/::ffff:/i.test(a);
      const v=a.split('.').map(Number);return v.length!==4||v[0]===0||v[0]===10||v[0]===127||v[0]>=224||v[0]===169&&v[1]===254||v[0]===172&&v[1]>=16&&v[1]<=31||v[0]===192&&v[1]===168||v[0]===100&&v[1]>=64&&v[1]<=127;
    }))throw new CatalogError('PRIVATE_NETWORK_BLOCKED');
    return clean;
  }
  async function accessible(id,user) {
    if(!validId(id))throw new CatalogError('INVALID_MEDIA_ID');
    const item=check(await db.from('lx_media_items').select('*').eq('id',id).maybeSingle());
    if(!item||item.archived&&!user.admin||!item.published&&!user.admin)throw new CatalogError('CONTENT_NOT_FOUND',404);
    if(item.legacy_id){const legacy=check(await db.from('lx_catalog').select('published').eq('id',item.legacy_id).maybeSingle());if(!legacy||!legacy.published&&!user.admin)throw new CatalogError('CONTENT_NOT_FOUND',404);}
    return item;
  }
  async function visibleRows(rows,user) {
    if(user.admin)return rows;
    const ids=rows.map(x=>x.legacy_id).filter(Boolean);
    const published=ids.length?check(await db.from('lx_catalog').select('id').in('id',ids).eq('published',true)):[];
    const allowed=new Set(published.map(x=>String(x.id)));
    return rows.filter(x=>x.published&&!x.archived&&(!x.legacy_id||allowed.has(String(x.legacy_id))));
  }
  async function get(id,user) {
    const item=await accessible(id,user);
    const [ids,links,seasons,sources]=await Promise.all([
      db.from('lx_media_external_ids').select('provider,namespace,external_id').eq('media_id',id),
      db.from('lx_media_provider_links').select('provider,url,label,region').eq('media_id',id).eq('active',true),
      db.from('lx_media_seasons').select('*').eq('media_id',id).order('number'),
      db.from('lx_media_sources').select('id,source_type,resolution,status,drm,region,authorized,episode_id').eq('media_id',id)
    ]);
    return {item:{...item,external_ids:check(ids)},provider_links:check(links),seasons:check(seasons),availability:check(sources).map(s=>({...s,playable:s.authorized&&s.drm==='none'&&['online','slow','unknown'].includes(s.status)}))};
  }
  async function importItem(ref,user,{published=true,job=null,plexUrl=''}={}) {
    const parsed=parseReference(ref);
    if(parsed.provider==='legacy'){
      const legacy=check(await db.from('lx_catalog').select('published').eq('id',parsed.id).maybeSingle());
      if(!legacy||!legacy.published&&!user.admin)throw new CatalogError('CONTENT_NOT_FOUND',404);
    }
    const identity=check(await db.from('lx_media_external_ids').select('media_id').eq('provider',parsed.provider).eq('namespace',parsed.namespace).eq('external_id',parsed.id).maybeSingle());
    if(identity){
      const existing=await get(identity.media_id,user);
      if(plexUrl){const plex=parseReference(plexUrl);if(plex.provider!=='plex')throw new CatalogError('INVALID_PLEX_LINK');
        check(await db.rpc('lx_uc_import',{p_item:metadataOnly(existing.item),p_ids:[...existing.item.external_ids,{provider:'plex',namespace:plex.namespace,external_id:plex.id}]}));
        check(await db.from('lx_media_provider_links').upsert({media_id:identity.media_id,provider:'plex',url:plex.url,label:'Assistir no Plex'},{onConflict:'media_id,provider,url'}));
      }
      return {...(plexUrl?await get(identity.media_id,user):existing),duplicate:true};
    }
    const document=await providers.detail(parsed);
    if(document.needs_selection)return document;
    if(document.existing_id)return {...await get(document.existing_id,user),duplicate:true};
    if(!document.title)throw new CatalogError('EMPTY_METADATA',502);
    if(plexUrl){const plex=parseReference(plexUrl);if(plex.provider!=='plex')throw new CatalogError('INVALID_PLEX_LINK');document.external_ids=[...list(document.external_ids),{provider:'plex',namespace:plex.namespace,external_id:plex.id}];document.provider_links=[...list(document.provider_links),{provider:'plex',url:plex.url,label:'Assistir no Plex'}];}
    const result=check(await db.rpc('lx_uc_import',{p_item:{...metadataOnly(document),published:document.legacy_id?document.published:published},p_ids:document.external_ids,p_seasons:document.seasons||[],p_links:document.provider_links||[],p_job:job}));
    if(plexUrl){const plex=parseReference(plexUrl);check(await db.from('lx_media_provider_links').upsert({media_id:result.item.id,provider:'plex',url:plex.url,label:'Assistir no Plex'},{onConflict:'media_id,provider,url'}));}
    return {...await get(result.item.id,{...user,admin:true}),duplicate:result.duplicate};
  }
  async function search(body,user) {
    const q=text(body.q,100),kind=body.filter||'all',page=integer(body.page,0,1000);
    if(q.length<2)return {items:[],providers:{},hasMore:false};
    if(kind!=='all'&&kind!=='user'&&!KINDS.includes(kind))throw new CatalogError('INVALID_FILTER');
    const localPromise=kind==='user'?Promise.resolve({data:[]}):db.rpc('lx_uc_search',{p_query:q,p_kind:kind,p_offset:page*24,p_limit:24,p_include_drafts:!!user.admin});
    const legacyPromise=page===0?db.from('lx_catalog').select('id,payload,published').eq('published',true).ilike('payload->>title','%'+q.replace(/[%_]/g,'')+'%').limit(24):Promise.resolve({data:[]});
    const externalPromise=kind==='user'?Promise.resolve({items:[],providers:{},errors:[],hasMore:false}):providers.search(q,kind,page);
    const usersPromise=['all','user'].includes(kind)?db.from('lx_profiles').select('user_id,name,username,avatar_url').eq('social_visible',true).eq('approved',true).or('name.ilike.%'+q.replace(/[,%()_]/g,'')+'%,username.ilike.%'+q.replace(/[,%()_@]/g,'')+'%').limit(12):Promise.resolve({data:[]});
    const playlistsPromise=['all','playlist'].includes(kind)?db.from('lx_media_playlists').select('id,title,media_ids').eq('user_id',user.id).ilike('title','%'+q.replace(/[%_]/g,'')+'%').limit(12):Promise.resolve({data:[]});
    const results=await Promise.allSettled([localPromise,legacyPromise,externalPromise,usersPromise,playlistsPromise]);
    const local=results[0].status==='fulfilled'&&!results[0].value.error?results[0].value.data||[]:[];
    const legacy=results[1].status==='fulfilled'&&!results[1].value.error?(results[1].value.data||[]).map(legacyItem).filter(x=>kind==='all'||x.kind===kind):[];
    const remote=results[2].status==='fulfilled'?results[2].value:{items:[],providers:{},errors:[{provider:'catalog',code:'PROVIDER_UNAVAILABLE'}]};
    // Add identity aliases to local rows so remote results deduplicate against imported records.
    if(local.length){const ids=check(await db.from('lx_media_external_ids').select('media_id,provider,namespace,external_id').in('media_id',local.map(x=>x.id)));for(const x of local)x.external_ids=ids.filter(i=>i.media_id===x.id);}
    const users=results[3].status==='fulfilled'&&!results[3].value.error?(results[3].value.data||[]).map(x=>({kind:'user',id:x.user_id,title:x.name,username:x.username,cover:publicUrl(x.avatar_url)})):[];
    const playlists=results[4].status==='fulfilled'&&!results[4].value.error?(results[4].value.data||[]).map(x=>({kind:'playlist',playlist_id:x.id,id:'playlist:'+x.id,title:x.title,metadata:{track_count:x.media_ids?.length||0}})):[];
    return {items:mergeCards([...local.filter(x=>x.published||user.admin),...legacy,...remote.items,...users,...playlists]),providers:remote.providers,errors:remote.errors,hasMore:!!remote.hasMore||local.length===24,localUnavailable:results[0].status==='rejected'||!!results[0].value?.error};
  }
  async function episodeList(id,number,user) {
    const item=await accessible(id,user),n=integer(number,0,200);
    let s=check(await db.from('lx_media_seasons').select('*').eq('media_id',id).eq('number',n).maybeSingle());
    if(!s)throw new CatalogError('SEASON_NOT_FOUND',404);
    if(!s.refreshed_at||+new Date(s.refreshed_at)<Date.now()-7*86400000){
      const ref=check(await db.from('lx_media_external_ids').select('*').eq('media_id',id).eq('provider','tmdb').eq('namespace','tv').maybeSingle());
      if(ref){const d=await providers.season(ref.external_id,n);if(d.episodes.length){check(await db.from('lx_media_episodes').upsert(d.episodes.map(e=>({...e,media_id:id,season_id:s.id})),{onConflict:'season_id,number'}));}check(await db.from('lx_media_seasons').update({refreshed_at:new Date().toISOString()}).eq('id',s.id));}
    }
    return {episodes:check(await db.from('lx_media_episodes').select('*').eq('season_id',s.id).order('number'))};
  }
  async function verifySource(source) {
    if(!source.authorized)return {status:'unauthorized',latency_ms:0,last_error:'AUTHORIZATION_REQUIRED'};
    if(source.drm!=='none')return {status:'unauthorized',latency_ms:0,last_error:'OFFICIAL_PROVIDER_PLAYER_REQUIRED'};
    if(source.expires_at&&+new Date(source.expires_at)<=Date.now())return {status:'expired',latency_ms:0,last_error:'EXPIRED'};
    const start=performance.now();
    try{
      let url=source.url;
      if(source.source_type==='storage'){const signed=check(await db.storage.from(source.storage_bucket).createSignedUrl(source.storage_path,300),'STORAGE_UNAVAILABLE');url=signed.signedUrl;}
      const safe=await dnsSafe(url);
      let r=await fetcher(safe,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(8000)});
      if([405,501].includes(r.status)){r=await fetcher(safe,{method:'GET',headers:{range:'bytes=0-0'},redirect:'manual',signal:AbortSignal.timeout(8000)});await r.body?.cancel();}
      const latency_ms=Math.round(performance.now()-start);
      if(r.status>=300&&r.status<400)return {status:'error',latency_ms,last_error:'REDIRECT_REQUIRES_REVIEW'};
      const content=r.headers.get('content-type')||'';
      if(source.source_type!=='external'&&source.source_type!=='embed'&&/text\/html/.test(content))return {status:'error',latency_ms,last_error:'HTML_IS_NOT_MEDIA'};
      return {status:healthStatus(r.status,latency_ms,source.expires_at),latency_ms,last_error:r.ok?null:'HTTP_'+r.status};
    }catch(e){return {status:e.code==='PRIVATE_NETWORK_BLOCKED'||e.code==='SOURCE_HOST_NOT_ALLOWED'?'unauthorized':'error',latency_ms:Math.round(performance.now()-start),last_error:e.code||'SOURCE_UNREACHABLE'};}
  }
  async function resolver(body,user) {
    const item=await accessible(body.media_id,user),episode=body.episode_id||null;
    if(episode){if(!validId(episode))throw new CatalogError('INVALID_EPISODE_ID');const ep=check(await db.from('lx_media_episodes').select('media_id').eq('id',episode).maybeSingle());if(ep?.media_id!==item.id)throw new CatalogError('EPISODE_NOT_FOUND',404);}
    const rows=check(await db.from('lx_media_sources').select('*').eq('media_id',item.id));
    const candidates=rankSources(rows,{region:'BR',episode,exclude:list(body.exclude).slice(0,20)}).filter(s=>s.source_type!=='external');
    for(const source of candidates){
      const verified=!source.last_verified_at||+new Date(source.last_verified_at)<Date.now()-300000?await verifySource(source):{status:source.status};
      if(verified.latency_ms!==undefined)check(await db.from('lx_media_sources').update({...verified,last_verified_at:new Date().toISOString()}).eq('id',source.id));
      if(!['online','slow'].includes(verified.status))continue;
      let url=source.url;
      if(source.source_type==='storage'){url=check(await db.storage.from(source.storage_bucket).createSignedUrl(source.storage_path,900),'STORAGE_UNAVAILABLE').signedUrl;}
      return {status:source.source_type==='embed'?'official_embed':'playable',media_id:item.id,source:{id:source.id,provider:source.provider,source_type:source.source_type,url,resolution:source.resolution,codec:source.codec,audio:source.audio,subtitles:source.subtitles,quality_variants:source.quality_variants,expires_at:source.expires_at||new Date(Date.now()+900000).toISOString()}};
    }
    // Keep legacy references in their authenticated resolver while permitting new explicit alternatives.
    if(item.legacy_id&&!list(body.exclude).includes('legacy:'+item.legacy_id))return {status:'legacy',legacy_id:item.legacy_id,media_id:item.id};
    const links=check(await db.from('lx_media_provider_links').select('provider,url,label,region').eq('media_id',item.id).eq('active',true));
    const external=rows.filter(s=>s.source_type==='external'&&s.authorized&&(!s.region?.length||s.region.includes('BR'))).map(s=>({provider:s.provider,url:safeExternal(s.url),label:'Abrir no provedor oficial'})).filter(s=>s.url);
    return {status:'external',label:'Disponível externamente',provider_links:[...links.filter(l=>!l.region?.length||l.region.includes('BR')),...external]};
  }
  async function attach(body,user) {
    const item=await accessible(body.media_id,user),s=body.source||{};
    if(s.authorized!==true||text(s.authorization_note,1000).length<5)throw new CatalogError('AUTHORIZATION_REQUIRED');
    const type=s.source_type;
    if(!['lx','direct','hls','dash','storage','embed','external'].includes(type))throw new CatalogError('UNSUPPORTED_SOURCE');
    const url=type==='storage'?null:await dnsSafe(s.url);
    if(type==='storage'&&(s.storage_bucket!=='lx-media'||!/^[\w./ -]{1,800}$/.test(s.storage_path||'')||String(s.storage_path).includes('..')))throw new CatalogError('INVALID_STORAGE_PATH');
    let episode=null;
    if(s.episode_id){const ep=check(await db.from('lx_media_episodes').select('id,media_id').eq('id',s.episode_id).maybeSingle());if(ep?.media_id!==item.id)throw new CatalogError('EPISODE_NOT_FOUND',404);episode=ep.id;}
    const drm=['none','protected','unknown'].includes(s.drm)?s.drm:'unknown';
    const subtitles=list(s.subtitles).slice(0,20).map(t=>({url:allowedUrl(t.url,mediaHosts()),language:text(t.language,10),label:text(t.label,80)})).filter(t=>t.url);
    const variants=list(s.quality_variants).slice(0,12).map(t=>({url:allowedUrl(t.url,mediaHosts()),quality:text(t.quality,40)})).filter(t=>t.url);
    const record={media_id:item.id,episode_id:episode,provider:text(s.provider||'lx',80),source_type:type,url,manifest:['hls','dash'].includes(type)?url:null,storage_bucket:type==='storage'?'lx-media':null,storage_path:type==='storage'?s.storage_path:null,resolution:text(s.resolution,40),codec:text(s.codec,80),audio:list(s.audio).slice(0,20).map(a=>({language:text(a.language,10),label:text(a.label,80)})),subtitles,quality_variants:variants,drm,authorized:true,authorization_note:text(s.authorization_note,1000),region:list(s.region).filter(r=>/^[A-Z]{2}$/.test(r)).slice(0,50),priority:integer(s.priority,0,1000),created_by:user.id,requirements:{...(s.requirements?.partner_player?{partner_player:true}:{}),...(s.requirements?.advertisements?{advertisements:true}:{})},expires_at:s.expires_at&&Number.isFinite(+new Date(s.expires_at))?new Date(s.expires_at).toISOString():null};
    const data=check(await db.from('lx_media_sources').insert(record).select('id').single());
    check(await db.from('lx_media_items').update({updated_at:new Date().toISOString()}).eq('id',item.id));return {source_id:data.id};
  }
  async function runJob(id,user) {
    if(!validId(id))throw new CatalogError('INVALID_JOB_ID');
    const job=check(await db.from('lx_import_jobs').select('*').eq('id',id).maybeSingle());if(!job)throw new CatalogError('JOB_NOT_FOUND',404);
    if(['completed','error','rolled_back'].includes(job.status))return jobStatus(id);
    check(await db.from('lx_import_jobs').update({status:'processing',updated_at:new Date().toISOString()}).eq('id',id));
    const entries=check(await db.rpc('lx_uc_claim',{p_job:id,p_limit:user.worker?2:4}));
    for(const entry of entries){try{
      const d=await importItem(entry.reference,user,{job:id,published:job.published,plexUrl:entry.reference?.plex_url||''});
      if(!d.item)throw new CatalogError(d.needs_selection?'MANUAL_MATCH_REQUIRED':'EMPTY_METADATA');
      let changed=false;
      if(job.provider==='plex'&&typeof entry.reference?.partner_available==='boolean'){
        const links=check(await db.from('lx_media_provider_links').select('id,active').eq('media_id',d.item.id).eq('provider','plex'));
        changed=links.some(l=>l.active!==entry.reference.partner_available);
        check(await db.from('lx_media_provider_links').update({active:entry.reference.partner_available,updated_at:new Date().toISOString()}).eq('media_id',d.item.id).eq('provider','plex'));
        if(!entry.reference.partner_available)check(await db.from('lx_media_sources').update({status:'offline',last_error:'PARTNER_UNAVAILABLE',last_verified_at:new Date().toISOString()}).eq('media_id',d.item.id).eq('provider','plex-partner'));
      }
      if(job.provider==='plex'&&entry.reference?.partner_available!==false&&entry.reference?.partner_scope==='playback'&&env('PLEX_PARTNER_SCOPE')==='playback'){
        for(const source of list(entry.reference.partner_sources).slice(0,5)){
          if(source.authorized!==true||source.drm!=='none'||source.requirements?.partner_player||source.requirements?.advertisements)continue;
          const existing=check(await db.from('lx_media_sources').select('id').eq('media_id',d.item.id).eq('provider','plex-partner').eq('url',source.url).limit(1));
          if(!existing.length)await attach({media_id:d.item.id,source:{...source,provider:'plex-partner',authorization_note:source.authorization_note||'Autorização explícita do feed de parceiro Plex'}},user);
          else check(await db.from('lx_media_sources').update({status:'unknown',last_verified_at:null,expires_at:source.expires_at&&Number.isFinite(+new Date(source.expires_at))?new Date(source.expires_at).toISOString():null,updated_at:new Date().toISOString()}).eq('id',existing[0].id));
          changed=true;
        }
      }
      check(await db.from('lx_import_entries').update({status:d.duplicate?'duplicate':'completed',updated:d.duplicate&&changed,media_id:d.item.id,imported_at:d.item.updated_at,last_error:null,lease_until:null,updated_at:new Date().toISOString()}).eq('id',entry.id));
    }catch(e){const retry=entry.attempts<4&&['PROVIDER_RATE_LIMIT','PROVIDER_UNAVAILABLE','SOURCE_UNREACHABLE'].includes(e.code);
      check(await db.from('lx_import_entries').update({status:retry?'queued':'error',last_error:e.code||'IMPORT_FAILED',lease_until:null,next_attempt_at:new Date(Date.now()+Math.min(60000,1000*2**entry.attempts)).toISOString(),updated_at:new Date().toISOString()}).eq('id',entry.id));}}
    const pending=check(await db.from('lx_import_entries').select('status').eq('job_id',id).in('status',['queued','processing']).limit(1));
    if(!pending.length){const errors=check(await db.from('lx_import_entries').select('id').eq('job_id',id).eq('status','error').limit(1));check(await db.from('lx_import_jobs').update({status:errors.length?'error':'completed',updated_at:new Date().toISOString()}).eq('id',id));}
    return jobStatus(id);
  }
  async function jobStatus(id,offset=0) {
    const job=check(await db.from('lx_import_jobs').select('*').eq('id',id).maybeSingle());if(!job)throw new CatalogError('JOB_NOT_FOUND',404);
    const entries=check(await db.from('lx_import_entries').select('*').eq('job_id',id).order('created_at').range(integer(offset,0,2000),integer(offset,0,2000)+49));
    return {job,entries:entries.map(e=>{
      let reference;try{reference=parseReference(e.reference);}catch{reference={invalid_reference:'Referência não reconhecida'};}
      // Partner manifests, authorization notes and signed URLs stay on the server until resolution.
      return {...e,reference};
    })};
  }
  async function plexSync(user) {
    const lock=check(await db.rpc('lx_uc_gate',{p_key:'partner:plex:sync',p_limit:1,p_window_ms:120000}));if(!lock)throw new CatalogError('SYNC_IN_PROGRESS',429);
    const previous=check(await db.from('lx_partner_sync').select('*').eq('provider','plex').maybeSingle());
    const stats={movies:0,series:0,new:0,updated:0,duplicates:0,ignored:0,errors:0,playable:0,catalog_only:0};
    let feed;
    try{feed=await providers.partner(previous?.cursor||'');}catch(e){check(await db.from('lx_partner_sync').upsert({provider:'plex',cursor:previous?.cursor||'',last_error:e.code||'PARTNER_UNAVAILABLE',updated_at:new Date().toISOString()}));throw e;}
    const references=[];
    // Feed pages enter the durable queue; metadata retrieval never holds the Admin request open.
    for(const entry of feed.items.slice(0,100)){
      try{
        if(!entry.tmdbId||!['movie','tv'].includes(entry.tmdbType)){stats.ignored++;continue;}
        const plex=parseReference(entry.plexUrl);if(plex.provider!=='plex')throw new CatalogError('INVALID_PLEX_LINK');
        const ref=parseReference({provider:'tmdb',namespace:entry.tmdbType,id:entry.tmdbId});
        references.push({...ref,plex_url:plex.url,partner_available:entry.available!==false,partner_scope:feed.scope,partner_sources:feed.scope==='playback'?list(entry.sources).slice(0,5):[]});
        entry.tmdbType==='movie'?stats.movies++:stats.series++;
        stats.catalog_only++;
      }catch{stats.errors++;}
    }
    const job_id=references.length?check(await db.rpc('lx_uc_enqueue',{p_user:user.id,p_refs:references,p_published:true,p_provider:'plex'})):null;
    // Advance only after the page is durably queued; processing/retry is independent of the cursor.
    const cursor=stats.errors?previous?.cursor||'':feed.next_cursor||'';
    stats.job_id=job_id;
    stats.has_more=feed.has_more;
    check(await db.from('lx_partner_sync').upsert({provider:'plex',cursor,last_sync_at:new Date().toISOString(),last_error:stats.errors?'PARTIAL_SYNC_RETRY':null,stats,updated_at:new Date().toISOString()}));
    return {stats,hasMore:feed.has_more,cursor,job_id};
  }
  async function healthBatch(limit=12) {
    const rows=check(await db.from('lx_media_sources').select('*').order('last_verified_at',{nullsFirst:true}).limit(limit));
    const result=[];for(const source of rows){const status=await verifySource(source);check(await db.from('lx_media_sources').update({...status,last_verified_at:new Date().toISOString()}).eq('id',source.id));result.push({id:source.id,...status});}return {sources:result};
  }
  async function dashboard() {
    const [summary,jobs,sync,status]=await Promise.all([db.rpc('lx_uc_dashboard'),db.from('lx_import_jobs').select('*').order('created_at',{ascending:false}).limit(12),db.from('lx_partner_sync').select('*').eq('provider','plex').maybeSingle(),providers.status()]);
    const plex=check(sync);
    if(plex?.stats?.job_id){const entries=check(await db.from('lx_import_entries').select('status,media_id,updated').eq('job_id',plex.stats.job_id));
      plex.stats.new=entries.filter(e=>e.status==='completed').length;plex.stats.duplicates=entries.filter(e=>e.status==='duplicate').length;plex.stats.updated=entries.filter(e=>e.updated).length;plex.stats.errors=entries.filter(e=>e.status==='error').length;
      const ids=[...new Set(entries.map(e=>e.media_id).filter(Boolean))];const sources=ids.length?check(await db.from('lx_media_sources').select('*').in('media_id',ids).eq('provider','plex-partner')):[];
      plex.stats.playable=new Set(rankSources(sources).map(s=>s.media_id)).size;plex.stats.catalog_only=Math.max(0,ids.length-plex.stats.playable);
    }
    return {...check(summary),jobs:check(jobs),plex,providers:status};
  }
  async function action(body,user) {
    const name=String(body.action||'search');
    const adminActions=['preview','import','enqueue','process','jobs','job','retry','rollback','attach','sources','health','dashboard','plex_sync','bulk_edit','tmdb_proxy'];
    if(adminActions.includes(name)&&!user.admin)throw new CatalogError('ADMIN_REQUIRED',403);
    if(name==='search')return search(body,user);
    if(name==='playlist'){
      if(!validId(body.playlist_id))throw new CatalogError('INVALID_PLAYLIST_ID');
      const playlist=check(await db.from('lx_media_playlists').select('*').eq('id',body.playlist_id).eq('user_id',user.id).maybeSingle());if(!playlist)throw new CatalogError('PLAYLIST_NOT_FOUND',404);
      const items=playlist.media_ids?.length?await visibleRows(check(await db.from('lx_media_items').select('id,kind,title,cover,year,legacy_id,published,archived').in('id',playlist.media_ids.slice(0,500))),user):[];
      const byId=new Map(items.map(x=>[x.id,x]));return {playlist,items:playlist.media_ids.map(id=>byId.get(id)).filter(Boolean)};
    }
    if(name==='open'){if(body.media_id)return get(body.media_id,user);return importItem(body.reference,user);}
    if(name==='preview'){
      const ref=parseReference(body.reference),identity=check(await db.from('lx_media_external_ids').select('media_id').eq('provider',ref.provider).eq('namespace',ref.namespace).eq('external_id',ref.id).maybeSingle());
      if(identity)return get(identity.media_id,user);
      const document=await providers.detail(ref);return document.existing_id?get(document.existing_id,user):document;
    }
    if(name==='import')return importItem(body.reference,user,{published:body.published===true,plexUrl:body.plex_url||''});
    if(name==='season')return episodeList(body.media_id,body.number,user);
    if(name==='resolve')return resolver(body,user);
    if(name==='attach')return attach(body,user);
    if(name==='sources'){await accessible(body.media_id,user);return {sources:check(await db.from('lx_media_sources').select('id,provider,source_type,status,resolution,drm,authorized,episode_id,last_verified_at,last_error').eq('media_id',body.media_id))};}
    if(name==='home'){
      const kind=KINDS.includes(body.kind)?body.kind:'movie',kinds=kind==='movie'?['movie','series','anime','dorama','documentary','concert']:kind==='track'?['track','album','artist','playlist']:[kind];
      const [latest,history,saved,remote]=await Promise.all([
        db.from('lx_media_items').select('*').eq('published',true).eq('archived',false).in('kind',kinds).order('created_at',{ascending:false}).limit(20),
        db.from('lx_media_progress').select('media_id,episode_key').eq('user_id',user.id).eq('completed',false).gt('position',3).order('updated_at',{ascending:false}).limit(12),
        db.from('lx_media_reactions').select('media_id').eq('user_id',user.id).eq('reaction','saved').order('created_at',{ascending:false}).limit(12),
        ['movie','series','anime','dorama'].includes(kind)?providers.home(kind):Promise.resolve({sections:[],errors:[]})
      ]);
      const ids=[...new Set([...check(history),...check(saved)].map(x=>x.media_id))];
      const personal=ids.length?await visibleRows(check(await db.from('lx_media_items').select('*').in('id',ids).in('kind',kinds)),user):[];
      const byId=new Map(personal.map(x=>[x.id,x])),resume=check(history).map(x=>byId.get(x.media_id)).filter(Boolean),favorites=check(saved).map(x=>byId.get(x.media_id)).filter(Boolean);
      const recent=resume[0],recommended=list(recent?.metadata?.recommendations).slice(0,12);
      return {sections:[{title:kind==='track'?'Continue ouvindo':kind==='book'?'Continue lendo':'Continue assistindo',items:mergeCards(resume)},{title:'Minha lista no catálogo universal',items:favorites},{title:'Adicionados recentemente ao catálogo LX',items:await visibleRows(check(latest),user)},...(recommended.length?[{title:'Porque você assistiu '+recent.title,items:recommended}]:[]),...remote.sections],errors:remote.errors};
    }
    if(name==='tmdb_proxy')return providers.tmdb(body.path,body.params||{});
    if(name==='enqueue'){const references=list(body.references);if(!references.length||references.length>2000)throw new CatalogError('INVALID_BATCH_SIZE');
      // User-submitted jobs cannot impersonate partner feeds or smuggle playback URLs.
      const refs=references.map(v=>{try{return parseReference(v);}catch{return {invalid_reference:text(typeof v==='string'?v:JSON.stringify(v),500)};}});
      const id=check(await db.rpc('lx_uc_enqueue',{p_user:user.id,p_refs:refs,p_published:body.published===true,p_provider:'mixed'}));return {job_id:id};}
    if(name==='process')return runJob(body.job_id,user);
    if(name==='job')return jobStatus(body.job_id,body.offset||0);
    if(name==='jobs')return {jobs:check(await db.from('lx_import_jobs').select('*').order('created_at',{ascending:false}).limit(30))};
    if(name==='retry'){const job=check(await db.from('lx_import_jobs').select('status').eq('id',body.job_id).maybeSingle());if(!job||job.status==='rolled_back')throw new CatalogError('INVALID_JOB_STATE');check(await db.from('lx_import_entries').update({status:'queued',attempts:0,next_attempt_at:new Date().toISOString(),last_error:null}).eq('job_id',body.job_id).eq('status','error'));check(await db.from('lx_import_jobs').update({status:'queued'}).eq('id',body.job_id));return jobStatus(body.job_id);}
    if(name==='rollback')return check(await db.rpc('lx_uc_rollback',{p_job:body.job_id}));
    if(name==='health')return healthBatch();
    if(name==='dashboard')return dashboard();
    if(name==='plex_sync')return plexSync(user);
    if(name==='bulk_edit'){const ids=list(body.ids).filter(validId).slice(0,100);if(!ids.length)throw new CatalogError('INVALID_MEDIA_ID');const patch={updated_at:new Date().toISOString()};if(typeof body.patch?.published==='boolean')patch.published=body.patch.published;if(typeof body.patch?.archived==='boolean')patch.archived=body.patch.archived;if(body.patch?.kind&&KINDS.includes(body.patch.kind))patch.kind=body.patch.kind;if(Object.keys(patch).length===1)throw new CatalogError('INVALID_PATCH');return {items:check(await db.from('lx_media_items').update(patch).in('id',ids).select('id,published,kind'))};}
    if(name==='maintenance'&&user.worker){
      if(!check(await db.rpc('lx_uc_gate',{p_key:'worker:maintenance',p_limit:1,p_window_ms:120000})))return {skipped:true};
      const jobs=check(await db.from('lx_import_jobs').select('id,created_by').in('status',['queued','processing']).order('created_at').limit(1));
      const results=[];for(const job of jobs){
        const role=check(await db.from('lx_admins').select('role').eq('user_id',job.created_by).maybeSingle());
        if(!['owner','administrator','editor'].includes(role?.role||'')){check(await db.from('lx_import_jobs').update({status:'error',updated_at:new Date().toISOString()}).eq('id',job.id));results.push({job_id:job.id,error:'ADMIN_REQUIRED'});continue;}
        results.push(await runJob(job.id,{id:job.created_by,admin:true,worker:true}));
      }
      const health=await healthBatch(3);let partner=null;
      if(env('PLEX_PARTNER_FEED_URL')&&env('PLEX_PARTNER_API_TOKEN')&&env('PLEX_PARTNER_ALLOWED_HOSTS')){
        const previous=check(await db.from('lx_partner_sync').select('stats').eq('provider','plex').maybeSingle());
        const interval=previous?.stats?.has_more?120000:integer(env('LX_PLEX_SYNC_INTERVAL_MS')||3600000,120000,86400000);
        if(check(await db.rpc('lx_uc_gate',{p_key:'worker:plex-sync',p_limit:1,p_window_ms:interval}))){
          const owner=check(await db.from('lx_admins').select('user_id').eq('role','owner').limit(1).maybeSingle());
          if(owner)try{partner=await plexSync({id:owner.user_id,admin:true});}catch(e){partner={error:e.code||'PARTNER_UNAVAILABLE'};}
        }
      }
      await db.from('lx_media_cache').delete().lt('expires_at',new Date().toISOString());await db.from('lx_uc_limits').delete().lt('window_start',new Date(Date.now()-86400000).toISOString());return {jobs:results,health,partner};
    }
    throw new CatalogError('UNKNOWN_ACTION');
  }
  return {action,search,importItem,resolver,verifySource,attach,runJob,dashboard};
}
