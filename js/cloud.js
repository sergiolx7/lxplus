(()=>{
const LX=window.LX,S=LX.store;
let client=null,currentAuth=null,currentProfile=null,adminDirectory=[],syncTimer=null,channels=[],catalogPollTimer=null,catalogSig='',userStateChannel=null,authEpoch=0;
function cancelAuthRestore(){authEpoch++}
function assertAuthOperation(epoch,uid=null){if(epoch!==authEpoch||(uid&&currentAuth?.id!==uid))throw new Error('AUTH_OPERATION_SUPERSEDED')}
const USER_STATE_KEYS=new Set([S.keys.history,S.keys.list,S.keys.ratings,S.keys.preferences,S.keys.profileStyles,S.keys.theme,S.keys.accent,S.keys.layoutMode,S.keys.motion,S.keys.playerPrefs,S.keys.noticeReads,S.keys.stickers,S.keys.uiPrefs,S.keys.chatPrefs,S.keys.musicCollections]);
function cfg(){return LX.config.supabase||{}}
function publicKey(){const c=cfg();return c.publishableKey||c.anonKey||''}
function enabled(){const c=cfg();return !!(window.supabase&&/^https:\/\/.+\.supabase\.co\/?$/i.test(c.url||'')&&publicKey().length>20)}
function db(){
 if(!enabled())return null;
 if(!client){
  client=window.supabase.createClient(cfg().url.replace(/\/$/,''),publicKey(),{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:LX.authSessionStorage}});
  client.auth.onAuthStateChange?.((event)=>{
   if(event==='SIGNED_OUT'){authEpoch++;currentAuth=null;currentProfile=null}
   // Run app work after the SDK releases its auth lock.
   setTimeout(()=>window.dispatchEvent(new CustomEvent('lx:auth-state',{detail:{event}})),0);
  });
 }
 return client
}
function uuid(x){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''))}
function user(){return currentAuth}
function profile(){return currentProfile}
function isAdmin(){return !!currentProfile?.admin}
function bucketFor(folder){return ['assets','profiles'].includes(folder)?(cfg().assetBucket||'lx-assets'):(cfg().mediaBucket||'lx-media')}
function publicUrl(path,bucket){const c=db();if(!c||!path)return null;return c.storage.from(bucket||cfg().assetBucket||'lx-assets').getPublicUrl(path).data.publicUrl}
async function ensureStorageClient(){
 try{if(!window.supabase?.createClient)await LX.ensureSupabase?.()}catch{}
 const c=db();if(!c)return null;
 if(!currentAuth){try{const {data}=await c.auth.getSession();if(data?.session?.user)currentAuth=data.session.user}catch{}}
 return c
}
async function mediaUrl(path,expires=21600){const c=await ensureStorageClient();if(!c||!path)return null;const {data,error}=await c.storage.from(cfg().mediaBucket||'lx-media').createSignedUrl(path,expires);if(error)throw error;return data?.signedUrl||null}
async function downloadMedia(path){const c=await ensureStorageClient();if(!c||!path)return null;let raw=String(path);if(raw.startsWith('cloud:'))raw=raw.slice(6);const {data,error}=await c.storage.from(cfg().mediaBucket||'lx-media').download(raw);if(error)throw error;return data||null}
async function removeUploadedPath(value,kind='media'){if(String(value||'').startsWith('r2:'))return !!(await LX.r2?.deleteFile?.(value).catch(()=>false));const c=db();if(!c||!value)return false;let raw=String(value);const bucket=kind==='assets'?(cfg().assetBucket||'lx-assets'):(cfg().mediaBucket||'lx-media');if(raw.startsWith('cloud:'))raw=raw.slice(6);else if(raw.includes('/storage/v1/object/public/'+bucket+'/'))raw=decodeURIComponent(raw.split('/storage/v1/object/public/'+bucket+'/')[1].split('?')[0]);else return false;const {error}=await c.storage.from(bucket).remove([raw]);if(error){console.warn('LX orphan cleanup',error);return false}return true}
function safeName(name){return String(name||'file').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120)}
async function uploadFile(key,file,folder='media'){
 const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');
 const path=`${folder}/${currentAuth.id}/${Date.now()}_${safeName(key||file?.name)}`,bucket=bucketFor(folder),large=(file?.size||0)>6*1024*1024;
 if(large&&!window.tus?.Upload)await LX.ensureTus?.().catch(()=>false);
 if(large&&window.tus?.Upload){
  const {data:{session},error:sessionError}=await c.auth.getSession();if(sessionError||!session?.access_token)throw sessionError||new Error('AUTH_SESSION_REQUIRED');
  const projectId=new URL(cfg().url).hostname.split('.')[0],endpoint=`https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  await new Promise((resolve,reject)=>{const upload=new window.tus.Upload(file,{endpoint,retryDelays:[0,3000,5000,10000,20000],headers:{authorization:`Bearer ${session.access_token}`},uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,metadata:{bucketName:bucket,objectName:path,contentType:file?.type||'application/octet-stream',cacheControl:'3600'},chunkSize:6*1024*1024,onError:reject,onProgress:(done,total)=>window.dispatchEvent(new CustomEvent('lx-upload-progress',{detail:{name:file?.name||key,done,total,percent:total?Math.round(done/total*100):0}})),onSuccess:resolve});upload.findPreviousUploads().then(prev=>{if(prev.length)upload.resumeFromPreviousUpload(prev[0]);upload.start()}).catch(reject)});
  return `cloud:${path}`
 }
 const {error}=await c.storage.from(bucket).upload(path,file,{upsert:false,contentType:file?.type||undefined,cacheControl:'3600'});
 if(error)throw error;return `cloud:${path}`
}
function cache(k,v){S.writeLocal(k,v)}
function cacheUserState(st={},email=currentAuth?.email||''){cache(S.keys.history,st.history||{});cache(S.keys.list,st.list||[]);cache(S.keys.ratings,st.ratings||{});cache(S.keys.preferences,{[email]:st.preferences||{genres:[],autoplay:true}});cache(S.keys.profileStyles,{[email]:st.profileStyle||{preset:'lx'}});cache(S.keys.noticeReads,st.noticeReads||[]);cache(S.keys.chatThreads,st.chatThreads||{});cache(S.keys.stickers,st.stickers||[]);cache(S.keys.musicCollections,Array.isArray(st.musicCollections)?st.musicCollections:[]);if(st.theme)cache(S.keys.theme,st.theme);if(st.accent)cache(S.keys.accent,st.accent);if(st.layoutMode)cache(S.keys.layoutMode,st.layoutMode);if(st.motion)cache(S.keys.motion,st.motion);if(st.playerPrefs)cache(S.keys.playerPrefs,st.playerPrefs);if(st.uiPrefs)cache(S.keys.uiPrefs,st.uiPrefs);if(st.chatPrefs)cache(S.keys.chatPrefs,st.chatPrefs)}
function subscribeUserState(authUser){const c=db();if(!c||!authUser)return;if(userStateChannel){c.removeChannel(userStateChannel).catch?.(()=>{});userStateChannel=null}userStateChannel=c.channel(`lxplus-user-state-${authUser.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'lx_user_state',filter:`user_id=eq.${authUser.id}`},payload=>{if(currentAuth?.id!==authUser.id)return;const st=payload.new?.data||{};cacheUserState(st,authUser.email);try{if(LX.ui?.state?.screen==='app'){if(LX.ui.state.mode==='Ouvir'){LX.syncMusicCardState?.();LX.refreshMusicUI?.()}else LX.ui?.renderApp?.()}}catch(e){console.warn('LX user-state UI refresh',e)}}).subscribe()}
function mapCatalog(rows){return (rows||[]).map(r=>({...r.payload,id:Number(r.id),published:r.published!==false}))}
let catalogLoadStatus='idle',catalogInFlight=null,lastCatalogAt=0;
function catalogStateChanged(changed=false){window.dispatchEvent(new CustomEvent('lx:catalog-state',{detail:{state:catalogLoadStatus,changed}}))}
function catalogFailed(error){catalogLoadStatus='error';if(error)console.warn('LX catalog load',error);catalogStateChanged();return false}
function refreshCatalog({reuseFresh=false}={}){
 if(catalogInFlight)return catalogInFlight;
 if(reuseFresh&&catalogLoadStatus==='ready'&&Date.now()-lastCatalogAt<15000)return Promise.resolve(true);
 catalogLoadStatus='loading';catalogStateChanged();
 const controller=new AbortController(),budget=20000;let timer;
 const work=(async()=>{
  await LX.ensureSupabase?.();controller.signal.throwIfAborted();
  const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');
  const rows=new Map(),pageSize=500;
  for(let start=0;;start+=pageSize){
   controller.signal.throwIfAborted();
   let query=c.from('lx_catalog').select('id,payload,published,updated_at').order('updated_at',{ascending:false}).order('id',{ascending:false}).range(start,start+pageSize-1);
   if(typeof query.abortSignal==='function')query=query.abortSignal(controller.signal);
   const {data,error}=await query;controller.signal.throwIfAborted();if(error)throw error;
   for(const row of data||[])rows.set(String(row.id),row);
   if((data||[]).length<pageSize)break;
  }
  const data=[...rows.values()],mapped=mapCatalog(data),sig=JSON.stringify(data.map(r=>[String(r.id),r.updated_at,r.published])),changed=sig!==catalogSig;
  controller.signal.throwIfAborted();catalogSig=sig;lastCatalogAt=Date.now();catalogLoadStatus='ready';cache(S.keys.catalog,mapped);catalogStateChanged(changed);return true;
 })();
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{const error=new Error('CATALOG_TIMEOUT');controller.abort(error);reject(error)},budget)});
 const load=Promise.race([work,timeout]).catch(catalogFailed).finally(()=>{clearTimeout(timer);if(catalogInFlight===load)catalogInFlight=null});
 catalogInFlight=load;return load;
}
async function retryCatalog(){try{await LX.ensureSupabase?.();await initPublic();return catalogLoadStatus==='ready'}catch(error){return catalogFailed(error)}}
async function refreshNotices(){const c=db();if(!c)return;const {data,error}=await c.from('lx_notifications').select('id,title,message,published_at,created_at').eq('published',true).order('created_at',{ascending:false}).limit(100);if(!error){const reads=new Set(S.read(S.keys.noticeReads,[]));const n=(data||[]).map(x=>({id:x.id,title:x.title,text:x.message,time:x.published_at?new Date(x.published_at).toLocaleDateString('pt-BR'):'Agora',read:reads.has(x.id)}));cache(S.keys.notices,n)}}
async function refreshBranding(){const c=db();if(!c)return;const {data,error}=await c.from('lx_settings').select('value').eq('key','branding').maybeSingle();if(!error&&data?.value)cache(S.keys.globalBranding,data.value)}
async function saveBranding(value){const c=db();if(!c||!isAdmin())throw new Error('ADMIN_REQUIRED');const {error}=await c.from('lx_settings').upsert({key:'branding',value,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;cache(S.keys.globalBranding,value)}
async function initPublic(){if(!enabled())return {enabled:false};try{const catalog=refreshCatalog();subscribePublic();void Promise.all([refreshNotices(),refreshBranding()]).then(()=>LX.applyBranding?.()).catch(e=>console.warn('LX optional public data',e));return {enabled:true,catalogReady:await catalog}}catch(e){console.warn('LX cloud public init',e);return {enabled:true,error:e}}}
function subscribePublic(){
 const c=db();if(!c||channels.some(x=>x.topic?.includes('lxplus-public-v256')))return;
 const syncCatalog=()=>{if(document.visibilityState==='hidden'||navigator.onLine===false)return Promise.resolve(false);return refreshCatalog({reuseFresh:true})};
 const ch=c.channel('lxplus-public-v256').on('postgres_changes',{event:'*',schema:'public',table:'lx_catalog'},()=>refreshCatalog()).on('postgres_changes',{event:'*',schema:'public',table:'lx_notifications'},()=>refreshNotices().then(()=>LX.ui?.updateNoticeCount?.())).on('postgres_changes',{event:'*',schema:'public',table:'lx_settings'},()=>refreshBranding().then(()=>{LX.applyBranding?.();if(LX.ui?.state?.screen==='app'&&LX.ui?.state?.mode==='Ouvir')LX.renderMusicExperience?.();else LX.ui?.renderApp?.()})).subscribe();channels.push(ch);
 if(!catalogPollTimer)catalogPollTimer=setInterval(syncCatalog,60000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncCatalog()});window.addEventListener('online',syncCatalog);
}
async function ensureProfile(authUser,epoch=authEpoch){const c=db();const {data,error}=await c.from('lx_profiles').select('*').eq('user_id',authUser.id).maybeSingle();if(error)throw error;assertAuthOperation(epoch,authUser.id);if(data)return data;const row={user_id:authUser.id,name:authUser.user_metadata?.name||authUser.email?.split('@')[0]||'Usuário',ranking_visible:authUser.user_metadata?.ranking_visible!==false};const ins=await c.from('lx_profiles').insert(row).select().single();if(ins.error)throw ins.error;return ins.data}
async function hydrateUser(authUser,epoch=authEpoch){if(!enabled()||!authUser)return null;assertAuthOperation(epoch);currentAuth=authUser;const check=()=>assertAuthOperation(epoch,authUser.id),c=db();const p=await ensureProfile(authUser,epoch);check();currentProfile={...p,admin:false};const {data:adm}=await c.rpc('lx_am_i_admin');check();currentProfile.admin=!!adm;if(currentProfile.admin){const roleRes=await c.rpc('lx_admin_role');check();currentProfile.admin_role=roleRes.error?'administrator':String(roleRes.data||'administrator')}void refreshCatalog({reuseFresh:true});check();
 const [stateRes,subRes,profilesRes,reqRes]=await Promise.all([
  c.from('lx_user_state').select('data').eq('user_id',authUser.id).maybeSingle(),
  c.from('lx_subscriptions').select('*').eq('user_id',authUser.id).maybeSingle(),
  c.from('lx_profiles').select('user_id,name,verified,ranking_visible,watched_hours,listened_hours,read_count,streak,approved,approval_status,approved_at,created_at').order('created_at',{ascending:true}),
  c.from('lx_requests').select('id,kind,media_type,title,message,votes,status,created_at,user_name').order('created_at',{ascending:false})
 ]);
 check();if(stateRes.error)throw stateRes.error;let st=stateRes.data?.data||{};
 if(!Object.keys(st).length){st=await prepareLocalStateForCloud(epoch);check();await c.from('lx_user_state').upsert({user_id:authUser.id,data:st,updated_at:new Date().toISOString()},{onConflict:'user_id'});check()}
 cacheUserState(st,authUser.email);subscribeUserState(authUser);void refreshNotices().catch(e=>console.warn('LX notices',e));check();
 let users=(profilesRes.data||[]).map(x=>({id:x.user_id,name:x.name,email:x.user_id===authUser.id?authUser.email:'',verified:x.verified,visible:x.ranking_visible,watched:+x.watched_hours||0,listened:+x.listened_hours||0,read:x.read_count||0,streak:x.streak||0,approved:!!x.approved,approvalStatus:x.approval_status||'pending',approvedAt:x.approved_at?+new Date(x.approved_at):null,created:x.created_at?+new Date(x.created_at):null}));
 adminDirectory=[];
 if(currentProfile.admin&&currentProfile.admin_role!=='editor'){let dir=await c.rpc('lx_admin_user_directory_v27');check();if(dir.error){dir=await c.rpc('lx_admin_user_directory');check()}if(!dir.error){adminDirectory=dir.data||[];const byId=new Map(adminDirectory.map(x=>[x.user_id,x])),mine=byId.get(authUser.id)||{};currentProfile.admin_role=mine.admin_role||mine.role||currentProfile.admin_role||'administrator';users=users.map(x=>{const d=byId.get(x.id)||{};return {...x,email:d.email||x.email,admin:!!d.admin,adminRole:d.admin_role||d.role||d.adminRole||x.adminRole||'',approved:!!d.approved,approvalStatus:d.approval_status||x.approvalStatus||'pending',emailConfirmed:!!d.email_confirmed,created:d.created_at?+new Date(d.created_at):x.created}});const sr=await c.from('lx_subscriptions').select('*');check();if(!sr.error){const subs={};(sr.data||[]).forEach(s=>{const em=byId.get(s.user_id)?.email;if(em)subs[em]=subToLocal(s)});cache(S.keys.subscriptions,subs)}await refreshAnalytics();check()}}
 check();cache(S.keys.users,users);
 if(!currentProfile.admin){cache(S.keys.subscriptions,{[authUser.email]:subRes.data?subToLocal(subRes.data):{active:false}})}
 const reqs=(reqRes.data||[]).map(r=>({id:Number(r.id),kind:r.kind,mediaType:r.media_type,title:r.title,message:r.message||'',votes:r.votes||1,status:r.status,created:+new Date(r.created_at),userEmail:authUser.email,userName:r.user_name||'Usuário',voters:[authUser.email]}));cache(S.keys.requests,reqs);
 subscribeUser();return toAppUser(authUser,currentProfile)
}
function subToLocal(s){return {active:!!s.active,plan:s.plan||'Mensal',started:s.created_at?+new Date(s.created_at):Date.now(),until:s.current_period_end?+new Date(s.current_period_end):null,status:s.status||'active',cloud:true,userId:s.user_id}}
function toAppUser(a,p){return {id:a.id,name:p?.name||a.user_metadata?.name||a.email?.split('@')[0]||'Usuário',email:a.email,admin:!!p?.admin,adminRole:p?.admin_role||p?.role||'',verified:!!p?.verified,ranking:p?.ranking_visible!==false,approved:!!p?.approved||!!p?.admin,approvalStatus:p?.admin?'approved_admin':(p?.approval_status||'pending'),cloud:true}}
function subscribeUser(){const c=db();if(!c||!currentAuth)return;channels.filter(x=>x.topic?.includes('lxplus-user')).forEach(x=>c.removeChannel(x));channels=channels.filter(x=>!x.topic?.includes('lxplus-user'));const uid=currentAuth.id;const rehydrate=()=>hydrateUser(currentAuth).then(()=>{if(LX.ui?.state?.screen!=='app')return;if(LX.ui.state.mode==='Ouvir')LX.renderMusicExperience?.();else LX.ui?.renderApp?.()}).catch(e=>console.warn('LX user sync',e));const ch=c.channel(`lxplus-user-${uid}`).on('postgres_changes',{event:'*',schema:'public',table:'lx_subscriptions',filter:`user_id=eq.${uid}`},rehydrate).on('postgres_changes',{event:'*',schema:'public',table:'lx_profiles',filter:`user_id=eq.${uid}`},rehydrate).subscribe();channels.push(ch)}
function authRedirectBase(){let raw=(LX.config.siteUrl||location.origin+location.pathname||'/').trim();if(LX.config.production&&/^http:\/\//i.test(raw))raw=raw.replace(/^http:\/\//i,'https://');return raw.endsWith('/')?raw:raw+'/'}
async function signUp({name,email,password,ranking}){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const {data,error}=await c.auth.signUp({email,password,options:{data:{name,ranking_visible:!!ranking},emailRedirectTo:authRedirectBase()}});if(error)throw error;if(!data.session)return {user:{id:data.user?.id,name,email,needsConfirmation:true,approved:false,approvalStatus:'pending',cloud:true},needsConfirmation:true,pendingApproval:true};const appUser=await hydrateUser(data.user);return {user:appUser,pendingApproval:!appUser.admin&&!appUser.approved}}
async function resendConfirmation(email){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const {error}=await c.auth.resend({type:'signup',email,options:{emailRedirectTo:authRedirectBase()}});if(error)throw error;return true}
async function signIn(email,password){const epoch=++authEpoch,c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const {data,error}=await c.auth.signInWithPassword({email,password});assertAuthOperation(epoch);if(error)throw error;return {user:await hydrateUser(data.user,epoch)}}
async function resume(){const epoch=authEpoch,c=db();if(!c)return null;const {data,error}=await c.auth.getSession();assertAuthOperation(epoch);if(error)throw error;if(!data.session?.user)return null;return {user:await hydrateUser(data.session.user,epoch)}}
async function signOut(){authEpoch++;currentAuth=null;currentProfile=null;const c=db();if(userStateChannel&&c){await c.removeChannel(userStateChannel).catch(()=>{});userStateChannel=null}if(c)await c.auth.signOut().catch(()=>{});currentAuth=null;currentProfile=null;adminDirectory=[];cache(S.keys.users,[]);cache(S.keys.subscriptions,{});await refreshCatalog().catch(()=>{});await refreshNotices().catch(()=>{});await refreshBranding().catch(()=>{})}
async function resetPassword(email){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const redirect=authRedirectBase()+'?recovery=1';const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:redirect});if(error)throw error;return true}
async function updatePassword(password){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const {error}=await c.auth.updateUser({password});if(error)throw error;history.replaceState({},document.title,location.pathname);return true}
function isRecoveryFlow(){return /(?:[?#&](?:type=recovery|recovery=1))/.test(location.href)}
function buildState(){const email=currentAuth?.email||'';return {history:S.read(S.keys.history,{}),list:S.read(S.keys.list,[]),ratings:S.read(S.keys.ratings,{}),preferences:(S.read(S.keys.preferences,{})||{})[email]||{genres:[],autoplay:true},profileStyle:(S.read(S.keys.profileStyles,{})||{})[email]||{preset:'lx'},theme:S.read(S.keys.theme,'dark'),accent:S.read(S.keys.accent,'#42a5ff'),layoutMode:S.read(S.keys.layoutMode,'cinema'),motion:S.read(S.keys.motion,'full'),playerPrefs:S.read(S.keys.playerPrefs,{volume:1,muted:false}),noticeReads:S.read(S.keys.noticeReads,[]),chatThreads:S.read(S.keys.chatThreads,{}),stickers:S.read(S.keys.stickers,[]),musicCollections:S.read(S.keys.musicCollections,[]),uiPrefs:S.read(S.keys.uiPrefs,{font:'modern',density:'balanced',posterSize:'small',navigation:'top'}),chatPrefs:S.read(S.keys.chatPrefs,{sound:'lx',volume:.7,desktop:true,recentEmojis:['❤️','😂','👍','🔥','✨','👏']})}}
async function dataUriBlob(uri){const r=await fetch(uri);return r.blob()}
async function prepareLocalStateForCloud(epoch=authEpoch){assertAuthOperation(epoch);const st=buildState(),email=currentAuth?.email;if(st.profileStyle?.image?.startsWith?.('data:')){try{const b=await dataUriBlob(st.profileStyle.image);assertAuthOperation(epoch);const k=await uploadFile('profile_migrated.png',b,'profiles');assertAuthOperation(epoch);st.profileStyle={...st.profileStyle,image:publicUrl(k.replace(/^cloud:/,''),cfg().assetBucket||'lx-assets')};const all=S.read(S.keys.profileStyles,{});all[email]=st.profileStyle;cache(S.keys.profileStyles,all)}catch(e){console.warn('LX profile migration',e)}}return st}
function onLocalWrite(k){if(!enabled()||!currentAuth||!USER_STATE_KEYS.has(k))return;clearTimeout(syncTimer);syncTimer=setTimeout(syncUserState,550)}
async function syncUserState(){const c=db();if(!c||!currentAuth)return false;try{const {error}=await c.from('lx_user_state').upsert({user_id:currentAuth.id,data:buildState(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error){console.warn('LX state sync',error);return false}return true}catch(error){console.warn('LX state sync',error);return false}}
async function upsertCatalogItem(item){if(item?.ucMediaId)throw new Error('UNIVERSAL_ITEM_REQUIRES_CONTENT_HUB');const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');const id=Number(item?.id);if(!Number.isFinite(id))throw new Error('INVALID_CATALOG_ID');const {error}=await c.rpc('lx_catalog_upsert_item',{p_id:id,p_payload:item||{},p_published:item?.published!==false});if(error){error.lxOperation='catalog_rpc_upsert';throw error}await refreshCatalog();return true}
async function bulkUpsertCatalogItems(items){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');const rows=(items||[]).filter(x=>Number.isFinite(Number(x?.id)));if(!rows.length)return 0;const {data,error}=await c.rpc('lx_catalog_bulk_upsert',{p_items:rows});if(error){error.lxOperation='catalog_rpc_bulk_upsert';throw error}await refreshCatalog();return Number(data||rows.length)}
async function deleteCatalogItem(id){
 const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');
 const n=Number(id);if(!Number.isFinite(n))throw new Error('INVALID_CATALOG_ID');
 let {data,error}=await c.rpc('lx_catalog_delete_item_checked',{p_id:n});
 if(error&&(/function .* does not exist|PGRST202|Could not find the function/i.test(String(error.message||error.code||'')))){
   const fallback=await c.rpc('lx_catalog_delete_item',{p_id:n});data={id:n,deleted:!fallback.error,tombstoned:!fallback.error};error=fallback.error;
 }
 if(error){error.lxOperation='catalog_rpc_delete';throw error}
 cache(S.keys.catalog,S.read(S.keys.catalog,[]).filter(x=>Number(x.id)!==n));
 await refreshCatalog();
 if(S.read(S.keys.catalog,[]).some(x=>Number(x.id)===n)){
   const e=new Error('CATALOG_DELETE_NOT_CONFIRMED');e.lxOperation='catalog_rpc_delete_verify';throw e;
 }
 return data||{id:n,deleted:true,tombstoned:true}
}
async function saveCatalog(items){if(!Array.isArray(items))throw new Error('INVALID_CATALOG');for(const item of items.filter(x=>!x?.ucMediaId))await upsertCatalogItem(item);await refreshCatalog();return true}
async function saveUsers(items){const c=db();if(!c)return;const self=items.find(x=>String(x.id)===String(currentAuth?.id));if(self&&!isAdmin())await c.from('lx_profiles').update({name:self.name,ranking_visible:self.visible!==false,updated_at:new Date().toISOString()}).eq('user_id',currentAuth.id);if(isAdmin())for(const x of items.filter(z=>uuid(z.id))){await c.from('lx_profiles').update({name:x.name,verified:!!x.verified,ranking_visible:x.visible!==false,watched_hours:+x.watched||0,listened_hours:+x.listened||0,read_count:+x.read||0,streak:+x.streak||0,updated_at:new Date().toISOString()}).eq('user_id',x.id)}}
async function requestOrVote(r){const c=db();if(!c||!currentAuth)return;const {error}=await c.rpc('lx_request_or_vote',{p_kind:r.kind,p_media_type:r.mediaType,p_title:r.title,p_message:r.message||''});if(error)console.warn('LX request sync',error);await refreshRequests()}
async function refreshRequests(){const c=db();if(!c||!currentAuth)return;let q=c.from('lx_requests').select('id,owner_user_id,kind,media_type,title,message,votes,status,created_at,user_name').order('created_at',{ascending:false});const {data,error}=await q;if(error)return;const dir=new Map(adminDirectory.map(x=>[x.user_id,x]));const rows=(data||[]).map(r=>({id:Number(r.id),kind:r.kind,mediaType:r.media_type,title:r.title,message:r.message||'',votes:r.votes||1,status:r.status,created:+new Date(r.created_at),userEmail:isAdmin()?(dir.get(r.owner_user_id)?.email||''):currentAuth.email,userName:r.user_name||dir.get(r.owner_user_id)?.name||'Usuário',voters:isAdmin()?[]:[currentAuth.email]}));cache(S.keys.requests,rows)}
async function updateRequestStatus(id,status){const c=db();if(!c||!isAdmin())return;const {error}=await c.from('lx_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await refreshRequests()}
async function publishNotices(items){const c=db();if(!c||!isAdmin())throw new Error('ADM_CLOUD_UNAVAILABLE');for(const n of items.slice(0,100)){if(String(n.id).includes('-'))continue;const {error}=await c.from('lx_notifications').upsert({id:Number(n.id)||Date.now(),title:n.title,message:n.text||'',published:true,published_at:new Date().toISOString()},{onConflict:'id'});if(error)throw error}await refreshNotices();return true}
async function approveUser(userId){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');const {error}=await c.rpc('lx_admin_approve_user',{p_user_id:userId});if(error)throw error;await hydrateUser(currentAuth);return true}
async function setVerified(userId,verified){
 const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');
 const target=!!verified,{error}=await c.rpc('lx_admin_set_verified',{p_user_id:userId,p_verified:target});if(error)throw error;
 const check=await c.from('lx_profiles').select('verified').eq('user_id',userId).maybeSingle();
 if(check.error)throw check.error;if(!check.data||!!check.data.verified!==target)throw new Error('VERIFY_NOT_CONFIRMED');
 await hydrateUser(currentAuth);return true
}
async function setAdminRole(userId,makeAdmin=true,role='administrator'){
 const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');if(currentProfile?.admin_role!=='owner')throw new Error('OWNER_REQUIRED');
 const requestedRole=String(role||'administrator').trim().toLowerCase()||'administrator';
 const desiredRole=requestedRole==='admin'||requestedRole==='manager'?'administrator':requestedRole;
 const {error}=await c.rpc('lx_admin_set_admin_role',{p_user_id:userId,p_is_admin:!!makeAdmin,p_role:desiredRole});
 if(error)throw error;await hydrateUser(currentAuth);return true
}
async function commitAdminChanges({verified=[],deleteIds=[]}={}){
 const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');
 const v=(verified||[]).filter(x=>uuid(x?.user_id)).map(x=>({user_id:String(x.user_id),verified:!!x.verified}));
 const ids=[...new Set((deleteIds||[]).map(Number).filter(Number.isFinite))];
 let atomic=false,atomicData=null;
 if(v.length||ids.length){
   const r=await c.rpc('lx_admin_commit_changes',{p_verified:v,p_delete_ids:ids});
   if(!r.error){atomic=true;atomicData=r.data}
   else if(!/PGRST202|Could not find the function|does not exist/i.test(String(r.error.message||r.error.code||'')))throw r.error;
 }
 if(!atomic){
   for(const x of v){
     const r=await c.rpc('lx_admin_set_verified',{p_user_id:x.user_id,p_verified:x.verified});if(r.error)throw r.error;
     const chk=await c.from('lx_profiles').select('verified').eq('user_id',x.user_id).maybeSingle();
     if(chk.error||!chk.data||!!chk.data.verified!==x.verified)throw chk.error||new Error('VERIFY_NOT_CONFIRMED');
   }
   for(const id of ids){
     let r=await c.rpc('lx_catalog_delete_item_checked',{p_id:id});
     if(r.error&&/PGRST202|Could not find the function|does not exist/i.test(String(r.error.message||r.error.code||'')))r=await c.rpc('lx_catalog_delete_item',{p_id:id});
     if(r.error)throw r.error;
     const chk=await c.from('lx_catalog').select('id').eq('id',id).maybeSingle();
     if(chk.error)throw chk.error;if(chk.data)throw new Error('CATALOG_DELETE_NOT_CONFIRMED');
   }
 }
 await refreshCatalog();await hydrateUser(currentAuth);
 return atomicData||{ok:true,verified_count:v.length,deleted_count:ids.length,verified:v,delete_ids:ids}
}

async function rejectUser(userId){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');const {error}=await c.rpc('lx_admin_reject_user',{p_user_id:userId});if(error)throw error;await hydrateUser(currentAuth);return true};async function deletePendingUser(userId){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');const {error}=await c.rpc('lx_admin_delete_pending_user',{p_user_id:userId});if(error)throw error;await hydrateUser(currentAuth);return true}
async function setPremium(userId,plan,active=true){const c=db();if(!c||!isAdmin())throw new Error('ADMIN_REQUIRED');const until=active?new Date(Date.now()+(plan==='Anual'?365:30)*86400000).toISOString():null;const row={user_id:userId,plan:plan||'Mensal',active:!!active,status:active?'active':'inactive',current_period_end:until,updated_at:new Date().toISOString()};const {error}=await c.from('lx_subscriptions').upsert(row,{onConflict:'user_id'});if(error)throw error;await hydrateUser(currentAuth)}
async function refreshAnalytics(){const c=db();if(!c||!isAdmin())return;const {data,error}=await c.from('lx_analytics').select('event,data,created_at').order('created_at',{ascending:false}).limit(5000);if(!error)cache(S.keys.analytics,(data||[]).map(x=>({event:x.event,data:x.data||{},at:+new Date(x.created_at)})))}
async function track(event,data={}){const c=db();if(!c||!currentAuth)return;c.rpc('lx_track_event',{p_event:event,p_data:data||{}}).then(()=>{}).catch(()=>{})}
async function migrateLocalCatalog(){if(!isAdmin())throw new Error('ADMIN_REQUIRED');const source=S.read(S.keys.catalog,[]),items=typeof structuredClone==='function'?structuredClone(source):JSON.parse(JSON.stringify(source));let media=0,assets=0;
 const migrateKey=async(key,label)=>{if(!key||/^(cloud:|r2:|https?:\/\/)/i.test(String(key)))return key;const blob=await S.getMedia(key).catch(()=>null);if(!blob)return key;media++;return uploadFile(label||key,blob,'media')};
 const migrateAsset=async(value,label)=>{if(!value||!String(value).startsWith('data:'))return value;const blob=await dataUriBlob(value);const k=await uploadFile(label,blob,'assets');assets++;return publicUrl(k.replace(/^cloud:/,''),cfg().assetBucket||'lx-assets')};
 for(const x of items){x.cover=await migrateAsset(x.cover,`cover_${x.id}`);x.banner=await migrateAsset(x.banner,`banner_${x.id}`);x.carouselImage=await migrateAsset(x.carouselImage,`carousel_${x.id}`);x.mediaKey=await migrateKey(x.mediaKey,`main_${x.id}`);x.trailerKey=await migrateKey(x.trailerKey,`trailer_${x.id}`);for(const e of x.episodes||[])e.mediaKey=await migrateKey(e.mediaKey,`episode_${x.id}_S${e.season||1}E${e.number||0}`);for(const t of x.tracks||[])t.mediaKey=await migrateKey(t.mediaKey,`track_${x.id}_${t.number||t.title||'audio'}`)}
 cache(S.keys.catalog,items);await saveCatalog(items);await publishNotices(S.read(S.keys.notices,[]));return {titles:items.length,media,assets}}
function status(){return {configured:enabled(),connected:!!currentAuth,clientReady:!!client,sessionReady:!!currentAuth,user:currentAuth?.email||null,admin:isAdmin(),approved:!!currentProfile?.approved||isAdmin(),approvalStatus:currentProfile?.approval_status||null,mediaBucket:cfg().mediaBucket||'lx-media',assetBucket:cfg().assetBucket||'lx-assets',catalogWriteMode:'RPC'}}
LX.cloud={enabled,db,user,profile,isAdmin,cancelAuthRestore,initPublic,signUp,resendConfirmation,signIn,resume,signOut,resetPassword,updatePassword,isRecoveryFlow,onLocalWrite,syncUserState,saveCatalog,upsertCatalogItem,bulkUpsertCatalogItems,deleteCatalogItem,saveUsers,saveBranding,requestOrVote,refreshRequests,updateRequestStatus,publishNotices,approveUser,setVerified,setAdminRole,commitAdminChanges,rejectUser,deletePendingUser,setPremium,track,uploadFile,publicUrl,mediaUrl,downloadMedia,removeUploadedPath,migrateLocalCatalog,status,hydrateUser,refreshBranding,catalogState:()=>catalogLoadStatus,catalogFailed,retryCatalog};
})();
