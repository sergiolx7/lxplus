/* ===== lxplus-artwork.js ===== */
/* LX Music v29.6: artwork and control icons shared across music surfaces. */
(()=>{
  'use strict';
  const LX=window.LX=window.LX||{},fallback='assets/lx-music-fallback.svg';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const valid=v=>{const s=String(v??'').trim();return s&&!/^(?:undefined|null|none|about:blank)$/i.test(s)&&!/[<>]/.test(s)&&/^(?:https?:\/\/|blob:|data:image\/|assets\/|\.\/assets\/)/i.test(s)?s:''};
  function ytId(ref){const raw=String(ref??'').trim();if(/^youtube:[\w-]{11}$/i.test(raw))return raw.slice(8);try{const u=new URL(raw);if(!/(^|\.)(?:youtube\.com|youtu\.be)$/.test(u.hostname))return '';const id=u.hostname.endsWith('youtu.be')?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];return /^[\w-]{11}$/.test(id||'')?id:''}catch{return ''}}
  function candidates(item={},content={}){const yt=ytId(item.sourceMediaKey||item.mediaKey||item.url||content.sourceMediaKey||content.mediaKey||content.url||content.tracks?.[0]?.mediaKey),ytArt=valid(item.youtubeThumbnail||content.youtubeThumbnail||(yt?`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`:'')),spotify=valid(item.spotifyArtwork||item.images?.[0]?.url||item.album?.images?.[0]?.url||content.spotifyArtwork||content.album?.images?.[0]?.url);const preferred=[item.cover,item.artwork?.url,item.albumCover,item.album?.cover,content.cover,content.image,content.carouselImage,content.banner,ytArt,spotify,fallback];return [...new Set(preferred.map(valid).filter(Boolean))]}
  const url=(item,content)=>candidates(item,content)[0]||fallback;
  const safeBackground=(item,content)=>`url(${JSON.stringify(url(item,content))})`;
  function markup(item,content={},className='',alt=''){const list=candidates(item,content);return `<span class="lx-artwork ${esc(className)}"><img src="${esc(list[0])}" data-lx-artwork="${encodeURIComponent(JSON.stringify(list))}" alt="${esc(alt)}" loading="lazy" decoding="async"></span>`}
  function bind(img,list){if(!img)return;const urls=list?.length?list:[fallback],previous=img.dataset.lxArtworkActive;img.dataset.lxArtworkActive=JSON.stringify(urls);img.dataset.lxArtworkIndex='0';img.onload=()=>{const surface=img.closest('.lx-music-feature,.lx-v27-now-playing');surface?.style.setProperty('--artwork-bg',`url(${JSON.stringify(img.currentSrc||img.src)})`)};img.onerror=()=>{const choices=JSON.parse(img.dataset.lxArtworkActive||'[]'),next=Number(img.dataset.lxArtworkIndex||0)+1;if(next>=choices.length){img.onerror=null;return}img.dataset.lxArtworkIndex=String(next);img.src=choices[next]};if(!previous||previous!==img.dataset.lxArtworkActive||!img.getAttribute('src'))img.src=urls[0];else if(img.complete&&img.naturalWidth===0)img.onerror()}
  function hydrate(root=document){root.querySelectorAll?.('img[data-lx-artwork]').forEach(img=>{let list=[];try{list=JSON.parse(decodeURIComponent(img.dataset.lxArtwork||''))}catch{}bind(img,list)})}
  function set(element,item,content={}){if(!element)return;let img=element.matches?.('img')?element:element.querySelector('img[data-lx-artwork]');if(!img){element.replaceChildren();img=document.createElement('img');img.setAttribute('data-lx-artwork','');img.alt='';element.appendChild(img)}bind(img,candidates(item,content));element.classList.add('lx-artwork');return img}
  const paths={play:'<path d="m8 5 11 7-11 7z"/>',pause:'<rect x="7" y="5" width="4" height="14" rx="1"/><rect x="13" y="5" width="4" height="14" rx="1"/>',prev:'<path d="M6 5v14m13-14-10 7 10 7z"/>',next:'<path d="M18 5v14M5 5l10 7-10 7z"/>',heart:'<path d="M20.8 8.7c0 5-8.8 10.9-8.8 10.9S3.2 13.7 3.2 8.7a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3z"/>',queue:'<path d="M4 6h16M4 11h16M4 16h9m5-1v5m-2.5-2.5h5"/>',repeat:'<path d="m17 3 3 3-3 3M4 6h16m-13 9-3 3 3 3m13-3H4"/>',shuffle:'<path d="M4 5h3c5 0 5 14 10 14h3m-3-3 3 3-3 3M4 19h3c2.2 0 3.6-2.8 5-5m2-4c1.3-2.3 2.5-5 6-5m-3-3 3 3-3 3"/>',volume:'<path d="M4 9v6h4l5 4V5L8 9zm12-1a5 5 0 0 1 0 8m2-11a9 9 0 0 1 0 14"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>',down:'<path d="m5 9 7 7 7-7"/>',lyrics:'<path d="M8 5h12M8 10h12M8 15h8M8 20h6M4 5h.01M4 10h.01M4 15h.01"/>',external:'<path d="M14 5h5v5M19 5l-9 9m7 1v4H5V7h4"/>',home:'<path d="m3 11 9-7 9 7m-16-1v10h14V10M9 20v-7h6v7"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',library:'<path d="M4 5h16v14H4zM8 5v14m4-11h5m-5 4h5"/>',history:'<path d="M3 12a9 9 0 1 0 3-7m-3 0v5h5m4-4v6l4 2"/>',plus:'<path d="M12 4v16M4 12h16"/>',up:'<path d="m5 15 7-7 7 7"/>'};
  function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.play}</svg>`}
  function initIcons(){const ids={musicShuffle:'shuffle',musicPrev:'prev',musicNext:'next',musicRepeat:'repeat',musicLikeBtn:'heart',musicLyricsBtn:'lyrics',musicQueueBtn:'queue',musicClose:'close',musicProviderToggle:'external'};Object.entries(ids).forEach(([id,name])=>{const node=document.getElementById(id);if(node)node.innerHTML=icon(name)});const like=document.getElementById('musicLikeBtn'),info=document.querySelector('#musicDock .music-info');if(like&&info&&!info.contains(like)){info.appendChild(like);like.addEventListener('click',event=>event.stopPropagation())}const volume=document.querySelector('.music-right-controls>span');if(volume)volume.innerHTML=icon('volume')}
  const pending=new Map();
  async function enrichSpotify(item){const id=String(item?.mediaKey||'').match(/^spotify:track:([\w]+)$/i)?.[1];if(!id||url(item)!==fallback||!LX.cloud?.db?.())return;if(pending.has(id))return pending.get(id);const task=(async()=>{try{let {data,error}=await LX.cloud.db().functions.invoke('lx-spotify-catalog',{body:{action:'track',id}});let record=!error?data?.data:null;if(!record&&String(item.title||'').trim().length>1){({data,error}=await LX.cloud.db().functions.invoke('lx-spotify-catalog',{body:{action:'search',q:`${item.title} ${item.artist||''}`.trim().slice(0,100),limit:20}}));record=!error?data?.data?.tracks?.items?.find(track=>String(track.id)===id):null}if(!record)return;const cover=valid(record.album?.images?.[0]?.url||record.images?.[0]?.url);if(!cover)return;item.spotifyArtwork=cover;item.cover=cover;item.title=String(record.name||item.title||'').trim()||item.title;item.artist=(record.artists||[]).map(a=>a.name).filter(Boolean).join(', ')||item.artist;item.duration=Number(record.duration_ms||0)/1000||item.duration;document.dispatchEvent(new CustomEvent('lx:music-artwork-updated',{detail:{item,id}}))}catch(error){console.warn('LX Spotify artwork',error)}finally{pending.delete(id)}})();pending.set(id,task);return task}
  LX.artwork={fallback,candidates,url,safeBackground,markup,set,hydrate,icon,initIcons,enrichSpotify};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initIcons,{once:true});else initIcons();
})();


/* ===== lxplus.js ===== */
window.__LX_JS_BUILD='32.3';

/* ===== config.js · LX Plus v25.50 ===== */
window.LX=window.LX||{};
LX.config={
  version:'32.2',
  environment:'cloud-ready',
  production:true,
  apiBase:'',
  siteUrl:'https://xn--rifamilionria-deb.api.br/',
  requireCloudInProduction:true,
  supabase:{
    url:'https://ubidogquzpdvrbzbhxda.supabase.co',
    publishableKey:'sb_publishable_8NKHuVKiyGMHtKs9FYJJsQ_Wz3MEjTZ',
    anonKey:'', // legado: use somente se seu projeto ainda não tiver Publishable Key
    mediaBucket:'lx-media',
    assetBucket:'lx-assets'
  },
  localDemoAdmin:{email:'',password:''},
  rtc:{iceServers:[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302','stun:stun3.l.google.com:19302']}]},
  features:{recommendations:true,preferenceProfile:true,premium:true,fuzzySearch:true,qualityGate:true,requests:true,ratings:true,analytics:true,tv:true,pwa:true,profileIdentity:true,appMode:true,cloudSync:true,realtime:true,cloudMedia:true,freeMediaStorage:true,conversationStreak:true,spotifyCatalog:false,adaptiveStreaming:true}
};

// Spotify Embed iFrame API bridge. The official controller lets LX Plus keep
// one persistent player while changing tracks and reflecting play/pause state.
LX.spotifyEmbed=LX.spotifyEmbed||{api:null,controller:null,ready:false};
window.onSpotifyIframeApiReady=function(IFrameAPI){
  LX.spotifyEmbed.api=IFrameAPI;LX.spotifyEmbed.ready=true;
  document.dispatchEvent(new CustomEvent('lx:spotify-ready'));
};

window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['config']='25.50';

/* ===== LX v25.50 resilient SDK loader ===== */
(()=>{
  const LX=window.LX=window.LX||{};
  let sdkPromise=null;
  function loadScript(src,timeout=7000){return new Promise((resolve,reject)=>{const s=document.createElement('script');let done=false;const finish=(ok,e)=>{if(done)return;done=true;clearTimeout(timer);ok?resolve(true):reject(e||new Error('SCRIPT_LOAD_FAILED'))};s.src=src;s.async=true;s.crossOrigin='anonymous';s.onload=()=>finish(true);s.onerror=()=>finish(false,new Error('SCRIPT_LOAD_FAILED '+src));document.head.appendChild(s);const timer=setTimeout(()=>{s.remove();finish(false,new Error('SCRIPT_TIMEOUT '+src))},timeout)})}
  LX.ensureSupabase=async function(){if(window.supabase?.createClient)return true;if(sdkPromise)return sdkPromise;sdkPromise=(async()=>{const sources=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','https://unpkg.com/@supabase/supabase-js@2'];let last;for(const src of sources){try{await loadScript(src,6500);if(window.supabase?.createClient)return true}catch(e){last=e}}sdkPromise=null;throw last||new Error('Failed to load Supabase SDK')})();return sdkPromise};
  LX.ensureTus=async function(){if(window.tus?.Upload)return true;try{await loadScript('https://cdn.jsdelivr.net/npm/tus-js-client@4/dist/tus.min.js',6500);return !!window.tus?.Upload}catch{return false}};
  LX.ensureEpub=async function(){if(window.ePub)return true;try{await loadScript('https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js',6500);return !!window.ePub}catch{return false}};
  let spotifySdkPromise=null;
  LX.ensureSpotifyEmbed=async function(){if(LX.spotifyEmbed?.api)return true;if(spotifySdkPromise)return spotifySdkPromise;spotifySdkPromise=(async()=>{await loadScript('https://open.spotify.com/embed/iframe-api/v1',7000);if(LX.spotifyEmbed?.api)return true;await new Promise((resolve,reject)=>{const ok=()=>{cleanup();resolve(true)},cleanup=()=>{clearTimeout(tm);document.removeEventListener('lx:spotify-ready',ok)},tm=setTimeout(()=>{cleanup();reject(new Error('SPOTIFY_API_TIMEOUT'))},4500);document.addEventListener('lx:spotify-ready',ok,{once:true})});return true})().finally(()=>{spotifySdkPromise=null});return spotifySdkPromise};
  // PWA cache rotation is handled by service-worker.js. Do not unregister the active app worker on every load.
})();

/* ===== store.js · LX Plus v25.50 ===== */
(()=>{const LX=window.LX;const PREFIX='lx16_',memory=new Map();
const keys={accounts:'accounts',users:'users',catalog:'catalog',session:'session',history:'history',list:'list',theme:'theme',accent:'accent',notices:'notices',requests:'requests',ratings:'ratings',analytics:'analytics',publicLists:'publicLists',noticeReads:'noticeReads',preferences:'preferences',subscriptions:'subscriptions',profileStyles:'profileStyles',layoutMode:'layoutMode',motion:'motion',playerPrefs:'playerPrefs',globalBranding:'globalBranding',chatThreads:'chatThreads',stickers:'stickers',uiPrefs:'uiPrefs',chatPrefs:'chatPrefs'};
const read=(k,d)=>{const key=PREFIX+k;try{const raw=localStorage.getItem(key);if(raw!=null){const x=JSON.parse(raw);memory.set(key,raw);return x??d}}catch{}try{if(memory.has(key)){const x=JSON.parse(memory.get(key));return x??d}}catch{}return d};
const writeLocal=(k,v)=>{const key=PREFIX+k,raw=JSON.stringify(v);memory.set(key,raw);try{localStorage.setItem(key,raw)}catch{}return v};
const removeLocal=k=>{const key=PREFIX+k;memory.delete(key);try{localStorage.removeItem(key)}catch{}};
const write=(k,v)=>{writeLocal(k,v);queueMicrotask(()=>LX.cloud?.onLocalWrite?.(k,v))};
let dbp;function db(){if(!dbp)dbp=new Promise((res,rej)=>{const r=indexedDB.open('LXPlus16Media',1);r.onupgradeneeded=()=>r.result.createObjectStore('media');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return dbp}
async function localMediaGet(key){try{const d=await db();return await new Promise((res,rej)=>{const r=d.transaction('media').objectStore('media').get(String(key));r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}catch{return null}}
async function localMediaPut(key,blob){if(!key||!blob)return false;try{if((blob.size||0)>80*1024*1024)return false;const d=await db();return await new Promise((res,rej)=>{const tx=d.transaction('media','readwrite');tx.objectStore('media').put(blob,String(key));tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error)})}catch{return false}}
async function putMedia(key,blob){
 if(LX.cloud?.enabled?.()&&LX.config?.features?.freeMediaStorage!==false&&LX.r2?.uploadFile){
  try{const remoteKey=await LX.r2.uploadFile(key,blob);await localMediaPut(remoteKey,blob);return remoteKey}catch(e){
   const code=String(e?.code||e?.message||'');
   if(!/R2_NOT_CONFIGURED|R2_INTEGRATION_INCOMPLETE/i.test(code))throw e;
   if((blob?.size||0)>45*1024*1024){const x=new Error('R2_NOT_CONFIGURED');x.code='R2_NOT_CONFIGURED';throw x}
  }
 }
 if(LX.cloud?.enabled?.()){const remoteKey=await LX.cloud.uploadFile(key,blob,'media');await localMediaPut(remoteKey,blob);return remoteKey}
 await localMediaPut(key,blob);return key
}
async function getMedia(key){
 if(!key)return null;const raw=String(key),local=await localMediaGet(raw);if(local)return local;
 if(raw.startsWith('r2:'))return await LX.r2?.mediaUrl?.(raw)||null;
 if(raw.startsWith('cloud:')){
  try{const signed=await LX.cloud?.mediaUrl?.(raw.slice(6),21600);if(signed)return signed}catch(e){console.warn('LX signed media URL failed',e)}
  try{const blob=await LX.cloud?.downloadMedia?.(raw);if(blob){await localMediaPut(raw,blob).catch(()=>{});return blob}}catch(e){console.warn('LX media download fallback failed',e)}
  return null
 }
 if(/^https?:\/\//i.test(raw))return raw;const freeUrl=LX.mediaSources?.directUrl?.(raw);if(freeUrl)return freeUrl;return null
}
async function putAsset(key,file,folder='assets'){if(LX.cloud?.enabled?.()){const mediaKey=await LX.cloud.uploadFile(key,file,folder);return LX.cloud.publicUrl(String(mediaKey).replace(/^cloud:/,''),LX.config.supabase?.assetBucket||'lx-assets')}return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
LX.store={keys,read,write,writeLocal,putMedia,getMedia,putAsset,removeLocal,reset(){Object.values(keys).forEach(removeLocal)}}})();

window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['store']='25.50';

/* ===== cloud.js · LX Plus v25.50 ===== */
(()=>{
const LX=window.LX,S=LX.store;
let client=null,currentAuth=null,currentProfile=null,adminDirectory=[],syncTimer=null,channels=[],catalogPollTimer=null,catalogSig='',userStateChannel=null;
const USER_STATE_KEYS=new Set([S.keys.history,S.keys.list,S.keys.ratings,S.keys.preferences,S.keys.profileStyles,S.keys.theme,S.keys.accent,S.keys.layoutMode,S.keys.motion,S.keys.playerPrefs,S.keys.noticeReads,S.keys.stickers,S.keys.uiPrefs,S.keys.chatPrefs]);
function cfg(){return LX.config.supabase||{}}
function publicKey(){const c=cfg();return c.publishableKey||c.anonKey||''}
function enabled(){const c=cfg();return !!(window.supabase&&/^https:\/\/.+\.supabase\.co\/?$/i.test(c.url||'')&&publicKey().length>20)}
function db(){if(!enabled())return null;if(!client)client=window.supabase.createClient(cfg().url.replace(/\/$/,''),publicKey(),{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client}
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
function cacheUserState(st={},email=currentAuth?.email||''){cache(S.keys.history,st.history||{});cache(S.keys.list,st.list||[]);cache(S.keys.ratings,st.ratings||{});cache(S.keys.preferences,{[email]:st.preferences||{genres:[],autoplay:true}});cache(S.keys.profileStyles,{[email]:st.profileStyle||{preset:'lx'}});cache(S.keys.noticeReads,st.noticeReads||[]);cache(S.keys.chatThreads,st.chatThreads||{});cache(S.keys.stickers,st.stickers||[]);if(st.theme)cache(S.keys.theme,st.theme);if(st.accent)cache(S.keys.accent,st.accent);if(st.layoutMode)cache(S.keys.layoutMode,st.layoutMode);if(st.motion)cache(S.keys.motion,st.motion);if(st.playerPrefs)cache(S.keys.playerPrefs,st.playerPrefs);if(st.uiPrefs)cache(S.keys.uiPrefs,st.uiPrefs);if(st.chatPrefs)cache(S.keys.chatPrefs,st.chatPrefs)}
function subscribeUserState(authUser){const c=db();if(!c||!authUser)return;if(userStateChannel){c.removeChannel(userStateChannel).catch?.(()=>{});userStateChannel=null}userStateChannel=c.channel(`lxplus-user-state-${authUser.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'lx_user_state',filter:`user_id=eq.${authUser.id}`},payload=>{const st=payload.new?.data||{};cacheUserState(st,authUser.email);try{if(LX.ui?.state?.screen==='app'){if(LX.ui.state.mode==='Ouvir'){LX.syncMusicCardState?.();LX.refreshMusicUI?.()}else LX.ui?.renderApp?.()}}catch(e){console.warn('LX user-state UI refresh',e)}}).subscribe()}
function mapCatalog(rows){return (rows||[]).map(r=>({...r.payload,id:Number(r.id),published:r.published!==false}))}
let catalogLoadStatus='idle';
async function refreshCatalog(){const c=db();if(!c){catalogLoadStatus='error';return false}catalogLoadStatus='loading';const {data,error}=await c.from('lx_catalog').select('id,payload,published,updated_at').order('updated_at',{ascending:false});if(error){catalogLoadStatus='error';return false}const mapped=mapCatalog(data||[]),sig=JSON.stringify((data||[]).map(r=>[String(r.id),r.updated_at,r.published]));catalogSig=sig;catalogLoadStatus='ready';cache(S.keys.catalog,mapped);return true}
async function refreshNotices(){const c=db();if(!c)return;const {data,error}=await c.from('lx_notifications').select('id,title,message,published_at,created_at').eq('published',true).order('created_at',{ascending:false}).limit(100);if(!error){const reads=new Set(S.read(S.keys.noticeReads,[]));const n=(data||[]).map(x=>({id:x.id,title:x.title,text:x.message,time:x.published_at?new Date(x.published_at).toLocaleDateString('pt-BR'):'Agora',read:reads.has(x.id)}));cache(S.keys.notices,n)}}
async function refreshBranding(){const c=db();if(!c)return;const {data,error}=await c.from('lx_settings').select('value').eq('key','branding').maybeSingle();if(!error&&data?.value)cache(S.keys.globalBranding,data.value)}
async function saveBranding(value){const c=db();if(!c||!isAdmin())throw new Error('ADMIN_REQUIRED');const {error}=await c.from('lx_settings').upsert({key:'branding',value,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;cache(S.keys.globalBranding,value)}
async function initPublic(){if(!enabled())return {enabled:false};try{await Promise.all([refreshCatalog(),refreshNotices(),refreshBranding()]);subscribePublic();return {enabled:true}}catch(e){console.warn('LX cloud public init',e);return {enabled:true,error:e}}}
function subscribePublic(){const c=db();if(!c||channels.some(x=>x.topic?.includes('lxplus-public-v256')))return;const syncCatalog=()=>{const before=catalogSig;return refreshCatalog().then(()=>{if(catalogSig===before)return;if(LX.ui?.state?.screen==='app'&&LX.ui?.state?.mode==='Ouvir')LX.renderMusicExperience?.();else LX.ui?.renderApp?.()}).catch(e=>console.warn('LX catalog realtime',e))};const ch=c.channel('lxplus-public-v256').on('postgres_changes',{event:'*',schema:'public',table:'lx_catalog'},syncCatalog).on('postgres_changes',{event:'*',schema:'public',table:'lx_notifications'},()=>refreshNotices().then(()=>LX.ui?.updateNoticeCount?.())).on('postgres_changes',{event:'*',schema:'public',table:'lx_settings'},()=>refreshBranding().then(()=>{LX.applyBranding?.();if(LX.ui?.state?.screen==='app'&&LX.ui?.state?.mode==='Ouvir')LX.renderMusicExperience?.();else LX.ui?.renderApp?.()})).subscribe();channels.push(ch);if(!catalogPollTimer)catalogPollTimer=setInterval(syncCatalog,12000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncCatalog()});window.addEventListener('online',syncCatalog)}
async function ensureProfile(authUser){const c=db();const {data,error}=await c.from('lx_profiles').select('*').eq('user_id',authUser.id).maybeSingle();if(error)throw error;if(data)return data;const row={user_id:authUser.id,name:authUser.user_metadata?.name||authUser.email?.split('@')[0]||'Usuário',ranking_visible:authUser.user_metadata?.ranking_visible!==false};const ins=await c.from('lx_profiles').insert(row).select().single();if(ins.error)throw ins.error;return ins.data}
async function hydrateUser(authUser){if(!enabled()||!authUser)return null;currentAuth=authUser;const c=db();const p=await ensureProfile(authUser);currentProfile={...p,admin:false};const {data:adm}=await c.rpc('lx_am_i_admin');currentProfile.admin=!!adm;if(currentProfile.admin){const roleRes=await c.rpc('lx_admin_role');currentProfile.admin_role=roleRes.error?'administrator':String(roleRes.data||'administrator')}await refreshCatalog();
 const [stateRes,subRes,profilesRes,reqRes]=await Promise.all([
  c.from('lx_user_state').select('data').eq('user_id',authUser.id).maybeSingle(),
  c.from('lx_subscriptions').select('*').eq('user_id',authUser.id).maybeSingle(),
  c.from('lx_profiles').select('user_id,name,verified,ranking_visible,watched_hours,listened_hours,read_count,streak,approved,approval_status,approved_at,created_at').order('created_at',{ascending:true}),
  c.from('lx_requests').select('id,kind,media_type,title,message,votes,status,created_at,user_name').order('created_at',{ascending:false})
 ]);
 let st=stateRes.data?.data||{};
 if(!Object.keys(st).length){st=await prepareLocalStateForCloud();await c.from('lx_user_state').upsert({user_id:authUser.id,data:st,updated_at:new Date().toISOString()},{onConflict:'user_id'})}
 cacheUserState(st,authUser.email);subscribeUserState(authUser);await refreshNotices();
 let users=(profilesRes.data||[]).map(x=>({id:x.user_id,name:x.name,email:x.user_id===authUser.id?authUser.email:'',verified:x.verified,visible:x.ranking_visible,watched:+x.watched_hours||0,listened:+x.listened_hours||0,read:x.read_count||0,streak:x.streak||0,approved:!!x.approved,approvalStatus:x.approval_status||'pending',approvedAt:x.approved_at?+new Date(x.approved_at):null,created:x.created_at?+new Date(x.created_at):null}));
 adminDirectory=[];
 if(currentProfile.admin&&currentProfile.admin_role!=='editor'){let dir=await c.rpc('lx_admin_user_directory_v27');if(dir.error)dir=await c.rpc('lx_admin_user_directory');if(!dir.error){adminDirectory=dir.data||[];const byId=new Map(adminDirectory.map(x=>[x.user_id,x])),mine=byId.get(authUser.id)||{};currentProfile.admin_role=mine.admin_role||mine.role||currentProfile.admin_role||'administrator';users=users.map(x=>{const d=byId.get(x.id)||{};return {...x,email:d.email||x.email,admin:!!d.admin,adminRole:d.admin_role||d.role||d.adminRole||x.adminRole||'',approved:!!d.approved,approvalStatus:d.approval_status||x.approvalStatus||'pending',emailConfirmed:!!d.email_confirmed,created:d.created_at?+new Date(d.created_at):x.created}});const sr=await c.from('lx_subscriptions').select('*');if(!sr.error){const subs={};(sr.data||[]).forEach(s=>{const em=byId.get(s.user_id)?.email;if(em)subs[em]=subToLocal(s)});cache(S.keys.subscriptions,subs)}await refreshAnalytics()}}
 cache(S.keys.users,users);
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
async function signIn(email,password){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;return {user:await hydrateUser(data.user)}}
async function resume(){const c=db();if(!c)return null;const {data,error}=await c.auth.getSession();if(error||!data.session?.user)return null;return {user:await hydrateUser(data.session.user)}}
async function signOut(){const c=db();if(userStateChannel&&c){await c.removeChannel(userStateChannel).catch(()=>{});userStateChannel=null}if(c)await c.auth.signOut().catch(()=>{});currentAuth=null;currentProfile=null;adminDirectory=[];cache(S.keys.users,[]);cache(S.keys.subscriptions,{});await refreshCatalog().catch(()=>{});await refreshNotices().catch(()=>{});await refreshBranding().catch(()=>{})}
async function resetPassword(email){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const redirect=authRedirectBase()+'?recovery=1';const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:redirect});if(error)throw error;return true}
async function updatePassword(password){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const {error}=await c.auth.updateUser({password});if(error)throw error;history.replaceState({},document.title,location.pathname);return true}
function isRecoveryFlow(){return /(?:[?#&](?:type=recovery|recovery=1))/.test(location.href)}
function buildState(){const email=currentAuth?.email||'';return {history:S.read(S.keys.history,{}),list:S.read(S.keys.list,[]),ratings:S.read(S.keys.ratings,{}),preferences:(S.read(S.keys.preferences,{})||{})[email]||{genres:[],autoplay:true},profileStyle:(S.read(S.keys.profileStyles,{})||{})[email]||{preset:'lx'},theme:S.read(S.keys.theme,'dark'),accent:S.read(S.keys.accent,'#42a5ff'),layoutMode:S.read(S.keys.layoutMode,'cinema'),motion:S.read(S.keys.motion,'full'),playerPrefs:S.read(S.keys.playerPrefs,{volume:1,muted:false}),noticeReads:S.read(S.keys.noticeReads,[]),chatThreads:S.read(S.keys.chatThreads,{}),stickers:S.read(S.keys.stickers,[]),uiPrefs:S.read(S.keys.uiPrefs,{font:'modern',density:'balanced',posterSize:'small'}),chatPrefs:S.read(S.keys.chatPrefs,{sound:'lx',volume:.7,desktop:true,recentEmojis:['❤️','😂','👍','🔥','✨','👏']})}}
async function dataUriBlob(uri){const r=await fetch(uri);return r.blob()}
async function prepareLocalStateForCloud(){const st=buildState();if(st.profileStyle?.image?.startsWith?.('data:')){try{const b=await dataUriBlob(st.profileStyle.image),k=await uploadFile('profile_migrated.png',b,'profiles');st.profileStyle={...st.profileStyle,image:publicUrl(k.replace(/^cloud:/,''),cfg().assetBucket||'lx-assets')};const all=S.read(S.keys.profileStyles,{});all[currentAuth.email]=st.profileStyle;cache(S.keys.profileStyles,all)}catch(e){console.warn('LX profile migration',e)}}return st}
function onLocalWrite(k){if(!enabled()||!currentAuth||!USER_STATE_KEYS.has(k))return;clearTimeout(syncTimer);syncTimer=setTimeout(syncUserState,550)}
async function syncUserState(){const c=db();if(!c||!currentAuth)return;const {error}=await c.from('lx_user_state').upsert({user_id:currentAuth.id,data:buildState(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)console.warn('LX state sync',error)}
async function upsertCatalogItem(item){const c=db();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');if(!currentAuth)throw new Error('AUTH_REQUIRED');const id=Number(item?.id);if(!Number.isFinite(id))throw new Error('INVALID_CATALOG_ID');const {error}=await c.rpc('lx_catalog_upsert_item',{p_id:id,p_payload:item||{},p_published:item?.published!==false});if(error){error.lxOperation='catalog_rpc_upsert';throw error}await refreshCatalog();return true}
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
async function saveCatalog(items){if(!Array.isArray(items))throw new Error('INVALID_CATALOG');for(const item of items)await upsertCatalogItem(item);await refreshCatalog();return true}
async function saveUsers(items){const c=db();if(!c)return;const self=items.find(x=>String(x.id)===String(currentAuth?.id));if(self&&!isAdmin())await c.from('lx_profiles').update({name:self.name,ranking_visible:self.visible!==false,updated_at:new Date().toISOString()}).eq('user_id',currentAuth.id);if(isAdmin())for(const x of items.filter(z=>uuid(z.id))){await c.from('lx_profiles').update({name:x.name,verified:!!x.verified,ranking_visible:x.visible!==false,watched_hours:+x.watched||0,listened_hours:+x.listened||0,read_count:+x.read||0,streak:+x.streak||0,updated_at:new Date().toISOString()}).eq('user_id',x.id)}}
async function requestOrVote(r){const c=db();if(!c||!currentAuth)return;const {error}=await c.rpc('lx_request_or_vote',{p_kind:r.kind,p_media_type:r.mediaType,p_title:r.title,p_message:r.message||''});if(error)console.warn('LX request sync',error);await refreshRequests()}
async function refreshRequests(){const c=db();if(!c||!currentAuth)return;let q=c.from('lx_requests').select('id,owner_user_id,kind,media_type,title,message,votes,status,created_at,user_name').order('created_at',{ascending:false});const {data,error}=await q;if(error)return;const dir=new Map(adminDirectory.map(x=>[x.user_id,x]));const rows=(data||[]).map(r=>({id:Number(r.id),kind:r.kind,mediaType:r.media_type,title:r.title,message:r.message||'',votes:r.votes||1,status:r.status,created:+new Date(r.created_at),userEmail:isAdmin()?(dir.get(r.owner_user_id)?.email||''):currentAuth.email,userName:r.user_name||dir.get(r.owner_user_id)?.name||'Usuário',voters:isAdmin()?[]:[currentAuth.email]}));cache(S.keys.requests,rows)}
async function updateRequestStatus(id,status){const c=db();if(!c||!isAdmin())return;const {error}=await c.from('lx_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await refreshRequests()}
async function publishNotices(items){const c=db();if(!c||!isAdmin())return;for(const n of items.slice(0,100)){if(String(n.id).includes('-'))continue;await c.from('lx_notifications').upsert({id:Number(n.id)||Date.now(),title:n.title,message:n.text||'',published:true,published_at:new Date().toISOString()},{onConflict:'id'})}await refreshNotices()}
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
LX.cloud={enabled,db,user,profile,isAdmin,initPublic,signUp,resendConfirmation,signIn,resume,signOut,resetPassword,updatePassword,isRecoveryFlow,onLocalWrite,syncUserState,saveCatalog,upsertCatalogItem,bulkUpsertCatalogItems,deleteCatalogItem,saveUsers,saveBranding,requestOrVote,refreshRequests,updateRequestStatus,publishNotices,approveUser,setVerified,setAdminRole,commitAdminChanges,rejectUser,deletePendingUser,setPremium,track,uploadFile,publicUrl,mediaUrl,downloadMedia,removeUploadedPath,migrateLocalCatalog,status,hydrateUser,refreshBranding,catalogState:()=>catalogLoadStatus,retryCatalog:refreshCatalog};
})();

window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['cloud']='25.50';

/* ===== r2-media.js · LX Plus v25.50 ===== */
(()=>{
 const LX=window.LX=window.LX||{};
 let cachedStatus=null,statusAt=0;
 const err=(code,msg=code)=>{const e=new Error(msg);e.code=code;return e};
 const invoke=async(action,payload={})=>{
  const c=LX.cloud?.db?.();if(!c)throw err('CLOUD_NOT_CONFIGURED');
  const {data,error}=await c.functions.invoke('lx-r2-media',{body:{action,...payload}});
  if(error){let code='R2_EDGE_ERROR',message=error.message||code;try{const j=await error.context?.json?.();if(j?.error)code=j.error;if(j?.message)message=j.message}catch{}throw err(code,message)}
  if(data?.error)throw err(data.error,data.message||data.error);
  return data||{};
 };
 const safeName=name=>String(name||'media').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-140);
 async function status(force=false){if(!force&&cachedStatus&&Date.now()-statusAt<30000)return cachedStatus;cachedStatus=await invoke('status');statusAt=Date.now();return cachedStatus}
 async function configured(){try{return !!(await status()).configured}catch{return false}}
 async function uploadFile(label,file){
  if(!file)throw err('FILE_REQUIRED');
  const contentType=file.type||'application/octet-stream';
  const d=await invoke('presign_upload',{filename:safeName(file.name||label),label:safeName(label||file.name),contentType,size:Number(file.size||0)});
  if(!d.url||!d.key)throw err('R2_PRESIGN_FAILED');
  await new Promise((resolve,reject)=>{
   const x=new XMLHttpRequest();x.open('PUT',d.url,true);x.setRequestHeader('Content-Type',contentType);
   x.upload.onprogress=e=>{if(e.lengthComputable)window.dispatchEvent(new CustomEvent('lx-upload-progress',{detail:{provider:'R2',name:file.name||label,done:e.loaded,total:e.total,percent:Math.round(e.loaded/e.total*100)}}))};
   x.onload=()=>{if(x.status>=200&&x.status<300)resolve(true);else reject(err('R2_UPLOAD_HTTP_'+x.status,`R2_UPLOAD_HTTP_${x.status}`))};
   x.onerror=()=>reject(err('R2_UPLOAD_NETWORK','R2_UPLOAD_NETWORK'));x.onabort=()=>reject(err('R2_UPLOAD_ABORTED'));x.send(file);
  });
  return `r2:${d.key}`;
 }
 async function mediaUrl(value,expires=21600){const key=String(value||'').replace(/^r2:/,'');if(!key)return null;const d=await invoke('presign_get',{key,expires:Math.min(21600,Math.max(300,Number(expires)||21600))});return d.url||null}
 async function deleteFile(value){const key=String(value||'').replace(/^r2:/,'');if(!key)return false;const d=await invoke('delete',{key});return !!d.ok}
 async function test(){cachedStatus=null;const d=await invoke('test',{origin:location.origin});cachedStatus={configured:!!d.ok,bucket:d.bucket||'',provider:'Cloudflare R2'};statusAt=Date.now();return d}
 function explain(e){const code=String(e?.code||e?.message||'');if(/R2_NOT_CONFIGURED|R2_INTEGRATION_INCOMPLETE/.test(code))return 'Configure o Cloudflare R2 em Mídia & Upload antes de enviar arquivos grandes.';if(/R2_UPLOAD_NETWORK/.test(code))return 'O R2 recusou o upload pelo navegador. Revise o CORS do bucket e teste a integração novamente.';if(/R2_UPLOAD_HTTP_403/.test(code))return 'O R2 recusou a gravação. Confira Access Key, Secret Key e permissão Object Read & Write.';if(/R2_UPLOAD_HTTP_/.test(code))return 'Falha ao enviar o arquivo para o R2.';return 'Falha no armazenamento de mídia.'}
 LX.r2={invoke,status,configured,uploadFile,mediaUrl,deleteFile,test,explain};
})();
window.__LX_MODULES['r2-media']='25.50';


/* ===== free-media-hub.js · LX Plus v25.50 =====
   Link adapters only. No provider password/token is ever stored in the public build. */
(()=>{
 const LX=window.LX=window.LX||{};
 const fail=(code,msg=code)=>{const e=new Error(msg);e.code=code;throw e};
 const clean=v=>String(v||'').trim();
 const htmlSrc=v=>{const m=clean(v).match(/<iframe[^>]+src=["']([^"']+)["']/i);return m?m[1].replace(/&amp;/g,'&'):clean(v)};
 const https=v=>{let u;try{u=new URL(clean(v))}catch{return null}return u.protocol==='https:'?u:null};
 const driveId=v=>{v=clean(v);const a=v.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/),b=v.match(/[?&]id=([a-zA-Z0-9_-]{10,})/),c=v.match(/\/d\/([a-zA-Z0-9_-]{10,})/);return (a||b||c)?.[1]||''};
 const driveStreamCandidates=id=>{id=clean(id);if(!id)return[];const q=encodeURIComponent(id);return [`https://drive.usercontent.google.com/download?id=${q}&export=download&confirm=t`,`https://drive.google.com/uc?export=download&id=${q}&confirm=t`]};
 const youtubeId=v=>{v=clean(v);if(/^youtube:[a-zA-Z0-9_-]{11}$/i.test(v))return v.slice(8);if(/^[a-zA-Z0-9_-]{11}$/.test(v))return v;try{const u=new URL(v);const host=u.hostname.toLowerCase().replace(/^www\./,'');if(host==='youtu.be')return (u.pathname.split('/').filter(Boolean)[0]||'').slice(0,11);if(!/(^|\.)(youtube\.com|youtube-nocookie\.com)$/.test(host))return'';const q=u.searchParams.get('v');if(q&&/^[a-zA-Z0-9_-]{11}$/.test(q))return q;const m=u.pathname.match(/^\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/i);return m?.[1]||''}catch{return''}};
 const youtubePlaylistId=v=>{try{const raw=clean(v);if(/^youtube-playlist:/i.test(raw))return raw.slice(17);const u=new URL(raw);return u.searchParams.get('list')||''}catch{return''}};
 const youtubeEmbedSrc=(id,list='')=>{const path=list?`videoseries?list=${encodeURIComponent(list)}`:`${encodeURIComponent(id)}?`;const params=new URLSearchParams();params.set('rel','0');params.set('playsinline','1');params.set('enablejsapi','1');if(/^https?:$/.test(location.protocol)){params.set('origin',location.origin);params.set('widget_referrer',location.href)}return `https://www.youtube.com/embed/${path}${list?'&':'&'}${params.toString()}`.replace('?&','?')};
 const spotifyRef=v=>{v=clean(v);let m=v.match(/^spotify:(track|album|playlist|episode|show|artist):([A-Za-z0-9]+)$/i);if(m)return {type:m[1].toLowerCase(),id:m[2]};m=v.match(/open\.spotify\.com\/(?:intl-[^/]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/i);return m?{type:m[1].toLowerCase(),id:m[2]}:null};
 const spotifyDesc=r=>{const type=r?.type||'track',id=r?.id||'',height=['track','episode'].includes(type)?152:352;return {kind:'embed',provider:'Spotify',label:'Spotify',src:`https://open.spotify.com/embed/${encodeURIComponent(type)}/${encodeURIComponent(id)}?utm_source=generator&theme=0`,openUrl:`https://open.spotify.com/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,embedHeight:height,spotifyUri:`spotify:${type}:${id}`}};
 const soundcloudUrl=v=>{const u=https(v);if(!u||!/(^|\.)soundcloud\.com$/i.test(u.hostname)&&!/(^|\.)on\.soundcloud\.com$/i.test(u.hostname))return'';return u.toString()};
 const archiveId=v=>{v=clean(v);const m=v.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/i);return m?.[1]||''};
 function normalize(provider,value){
  provider=String(provider||'direct').toLowerCase();value=clean(value);if(!value)fail('MEDIA_LINK_REQUIRED','Cole o link da mídia.');
  if(provider==='gdrive'){
   const id=driveId(value);if(!id)fail('GDRIVE_LINK_INVALID','Não reconheci o link do Google Drive. Use o link de compartilhamento do arquivo.');
   return `gdrive:${id}`;
  }
  if(provider==='dropbox'){
   const u=https(value);if(!u||!/(^|\.)dropbox\.com$/i.test(u.hostname))fail('DROPBOX_LINK_INVALID','Use um link compartilhado HTTPS do Dropbox.');
   u.searchParams.delete('dl');u.searchParams.set('raw','1');return `dropbox:${encodeURIComponent(u.toString())}`;
  }
  if(provider==='youtube'){
   const id=youtubeId(value),list=youtubePlaylistId(value);if(!id&&!list)fail('YOUTUBE_LINK_INVALID','Não reconheci o link do YouTube. Cole um vídeo, YouTube Music ou playlist válida.');
   return id?`youtube:${id}`:`youtube-playlist:${list}`;
  }
  if(provider==='spotify'){
   const r=spotifyRef(value);if(!r)fail('SPOTIFY_LINK_INVALID','Cole um link do Spotify para música, álbum, playlist, artista, episódio ou show.');
   return `spotify:${r.type}:${r.id}`;
  }
  if(provider==='soundcloud'){
   const u=soundcloudUrl(value);if(!u)fail('SOUNDCLOUD_LINK_INVALID','Cole um link público do SoundCloud.');
   return `soundcloud:${encodeURIComponent(u)}`;
  }
  if(provider==='onedrive'){
   const raw=htmlSrc(value),u=https(raw);if(!u||!/(^|\.)onedrive\.live\.com$/i.test(u.hostname)||!/^\/embed/i.test(u.pathname))fail('ONEDRIVE_EMBED_REQUIRED','No OneDrive use Incorporar → Gerar e cole o URL de embed ou o iframe gerado.');
   return `onedrive:${encodeURIComponent(u.toString())}`;
  }
  if(provider==='archive'){
   const id=archiveId(value);if(!id)fail('ARCHIVE_LINK_INVALID','Use um link archive.org/details/... ou archive.org/embed/...');
   return `archive:${encodeURIComponent(id)}`;
  }
  if(provider==='direct'){
   const u=https(value);if(!u)fail('INVALID_EXTERNAL_MEDIA_URL','Use um link HTTPS direto para o arquivo de mídia.');return u.toString();
  }
  fail('MEDIA_PROVIDER_UNSUPPORTED','Fonte de mídia não suportada.');
 }
 function describe(ref){
  const raw=clean(ref);if(!raw)return {kind:'missing',provider:'Sem mídia',label:'Sem mídia'};
  // Backward compatibility: older catalog rows may contain the original provider URL
  // instead of the normalized lx media key. Detect those URLs before treating HTTPS as direct audio.
  if(/^https?:\/\//i.test(raw)){
   const sp=spotifyRef(raw);if(sp)return spotifyDesc(sp);
   const yid=youtubeId(raw),ylist=youtubePlaylistId(raw);if(yid)return {kind:'embed',provider:'YouTube',label:'YouTube',src:youtubeEmbedSrc(yid),openUrl:`https://www.youtube.com/watch?v=${encodeURIComponent(yid)}`,embedHeight:270};
   if(ylist&&/(?:youtube\.com|youtu\.be|music\.youtube\.com)/i.test(raw))return {kind:'embed',provider:'YouTube',label:'YouTube Playlist',src:youtubeEmbedSrc('',ylist),openUrl:`https://www.youtube.com/playlist?list=${encodeURIComponent(ylist)}`,embedHeight:220};
   const did=driveId(raw);if(did&&/drive\.google\.com/i.test(raw)){const previewSrc=`https://drive.google.com/file/d/${encodeURIComponent(did)}/preview`,streamCandidates=driveStreamCandidates(did);return {kind:'direct',provider:'Google Drive',label:'LX Stream · Google Drive',src:streamCandidates[0]||previewSrc,streamCandidates,previewSrc,driveId:did}};
   const scu=soundcloudUrl(raw);if(scu)return {kind:'embed',provider:'SoundCloud',label:'SoundCloud',src:`https://w.soundcloud.com/player/?url=${encodeURIComponent(scu)}&color=%238a2be2&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`,openUrl:scu,embedHeight:166};
  }
  if(raw.startsWith('gdrive:')){const id=raw.slice(7),previewSrc=`https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`,streamCandidates=driveStreamCandidates(id);return {kind:'direct',provider:'Google Drive',label:'LX Stream · Google Drive',src:streamCandidates[0]||previewSrc,streamCandidates,previewSrc,driveId:id}};
  if(raw.startsWith('youtube-playlist:')){const id=raw.slice(17);return {kind:'embed',provider:'YouTube',label:'YouTube Playlist',src:youtubeEmbedSrc('',id),openUrl:`https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`,embedHeight:220}};
  if(raw.startsWith('youtube:')){const id=raw.slice(8);return {kind:'embed',provider:'YouTube',label:'YouTube',src:youtubeEmbedSrc(id),openUrl:`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,embedHeight:270}};
  if(raw.startsWith('spotify:')){const [,type,id]=raw.split(':');return spotifyDesc({type,id})};
  if(raw.startsWith('soundcloud:')){const openUrl=decodeURIComponent(raw.slice(11));return {kind:'embed',provider:'SoundCloud',label:'SoundCloud',src:`https://w.soundcloud.com/player/?url=${encodeURIComponent(openUrl)}&color=%238a2be2&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`,openUrl,embedHeight:166}};
  if(raw.startsWith('onedrive:')){const src=decodeURIComponent(raw.slice(9));return {kind:'embed',provider:'OneDrive',label:'OneDrive',src,openUrl:src,embedHeight:180}};
  if(raw.startsWith('archive:')){const id=decodeURIComponent(raw.slice(8));return {kind:'embed',provider:'Internet Archive',label:'Archive.org',src:`https://archive.org/embed/${encodeURIComponent(id)}?autoplay=1`,openUrl:`https://archive.org/details/${encodeURIComponent(id)}`,embedHeight:220}};
  if(raw.startsWith('dropbox:')){const src=decodeURIComponent(raw.slice(8));return {kind:'direct',provider:'Dropbox',label:'Dropbox',src,openUrl:src}};
  if(raw.startsWith('r2:'))return {kind:'native',provider:'Cloudflare R2',label:'Cloudflare R2'};
  if(raw.startsWith('cloud:'))return {kind:'native',provider:'Supabase',label:'Supabase Storage'};
  if(/^https:\/\//i.test(raw))return {kind:'direct',provider:'Link HTTPS',label:'Link HTTPS',src:raw,openUrl:raw};
  return {kind:'native',provider:'LX Storage',label:'Arquivo LX'};
 }
 function directUrl(ref){const d=describe(ref);return d.kind==='direct'?d.src:null}
 function label(ref){return describe(ref).label}
 function toInput(ref){const raw=clean(ref);if(raw.startsWith('gdrive:'))return `https://drive.google.com/file/d/${raw.slice(7)}/view`;if(raw.startsWith('youtube-playlist:'))return `https://www.youtube.com/playlist?list=${raw.slice(17)}`;if(raw.startsWith('youtube:'))return `https://www.youtube.com/watch?v=${raw.slice(8)}`;if(raw.startsWith('spotify:')){const [,type,id]=raw.split(':');return `https://open.spotify.com/${type}/${id}`}if(raw.startsWith('soundcloud:'))return decodeURIComponent(raw.slice(11));if(raw.startsWith('onedrive:'))return decodeURIComponent(raw.slice(9));if(raw.startsWith('archive:'))return `https://archive.org/details/${decodeURIComponent(raw.slice(8))}`;if(raw.startsWith('dropbox:'))return decodeURIComponent(raw.slice(8)).replace(/([?&])raw=1(?:&|$)/,'$1').replace(/[?&]$/,'');return /^https:\/\//i.test(raw)?raw:''}
 function modeFor(ref){const raw=clean(ref);if(raw.startsWith('gdrive:'))return'gdrive';if(raw.startsWith('dropbox:'))return'dropbox';if(raw.startsWith('youtube:')||raw.startsWith('youtube-playlist:'))return'youtube';if(raw.startsWith('spotify:'))return'spotify';if(raw.startsWith('soundcloud:'))return'soundcloud';if(raw.startsWith('onedrive:'))return'onedrive';if(raw.startsWith('archive:'))return'archive';if(/^https?:\/\//i.test(raw)){if(spotifyRef(raw))return'spotify';if(youtubeId(raw)||youtubePlaylistId(raw))return'youtube';if(driveId(raw)&&/drive\.google\.com/i.test(raw))return'gdrive';if(soundcloudUrl(raw))return'soundcloud';return'direct'}return'upload'}
 const info={
  upload:{label:'Enviar arquivo',placeholder:'',help:'Upload pelo LX. Arquivos grandes usam R2 quando o R2 estiver configurado.'},
  gdrive:{label:'Google Drive',placeholder:'https://drive.google.com/file/d/.../view',help:'A LX Plus tenta reproduzir o arquivo diretamente no LX Player, sem abrir a tela do Drive. Compartilhe como “Qualquer pessoa com o link”. Para catálogo grande e qualidade controlada de verdade, prefira R2/LX Stream ou HLS.'},
  dropbox:{label:'Dropbox',placeholder:'https://www.dropbox.com/scl/fi/...',help:'Cole o link compartilhado. A LX Plus converte automaticamente para raw=1 para reprodução direta quando o navegador permitir.'},
  youtube:{label:'YouTube / YouTube Music',placeholder:'https://youtu.be/... ou https://music.youtube.com/watch?v=...',help:'Aceita vídeo, YouTube Music e playlist pública/não listada. A reprodução usa o player oficial do YouTube.'},
  spotify:{label:'Spotify',placeholder:'https://open.spotify.com/track/...',help:'Cole um link de música, álbum, playlist, artista, episódio ou show. A LX Plus abre o player oficial interativo do Spotify; não tenta reproduzir a página do Spotify como se fosse um arquivo de áudio.'},
  soundcloud:{label:'SoundCloud',placeholder:'https://soundcloud.com/artista/faixa',help:'Cole um link público do SoundCloud. A reprodução usa o player oficial incorporado.'},
  onedrive:{label:'OneDrive',placeholder:'Cole o URL de Incorporar ou o <iframe ...>',help:'No OneDrive: Mais → Incorporar → Gerar. Cole o URL do src ou o iframe inteiro.'},
  archive:{label:'Archive.org',placeholder:'https://archive.org/details/identificador',help:'Aceita links details ou embed do Internet Archive. Use somente conteúdo permitido pela fonte.'},
  direct:{label:'Link HTTPS',placeholder:'https://cdn.exemplo.com/filme.mp4',help:'Link HTTPS direto para MP4/WebM/áudio/PDF. O servidor externo precisa permitir reprodução no navegador.'}
 };
 function allowedFor(type,mode){if(mode==='upload')return true;if(type==='Música')return ['dropbox','direct','youtube','spotify'].includes(mode);if(type==='Livro')return mode==='direct';return ['gdrive','dropbox','youtube','spotify','onedrive','archive','direct'].includes(mode)}
 function preview(provider,value){const key=normalize(provider,value),d=describe(key);return {key,...d}}
 LX.mediaSources={normalize,describe,directUrl,label,toInput,modeFor,info,allowedFor,preview,providers:['upload','gdrive','dropbox','youtube','spotify','onedrive','archive','direct']};
})();
window.__LX_MODULES['free-media-hub']='30.0';

/* ===== services.js · LX Plus v25.36 ===== */
(()=>{const LX=window.LX,S=LX.store,$=id=>document.getElementById(id);
const P=[];
const DEMO=[];
const DEMO_USERS=[];
const DEFAULT_NOTICES=[];
function seed(){
 if(!S.read(S.keys.catalog,null))S.writeLocal(S.keys.catalog,[]);
 if(!S.read(S.keys.users,null))S.writeLocal(S.keys.users,[]);
 if(!S.read(S.keys.notices,null))S.writeLocal(S.keys.notices,[]);
 if(!S.read(S.keys.globalBranding,null))S.writeLocal(S.keys.globalBranding,{splashEyebrow:'DIGITAL MEDIA EXPERIENCE',splashTag:'DM VERSION',splashTitle:'Seu entretenimento. Do seu jeito.',splashSubtitle:'Filmes, séries, animes, doramas, livros e música conectados por uma única experiência.',accent:'#42a5ff',featuredIds:[],legalAbout:'',legalTerms:'',legalPrivacy:'',supportEmail:''});
 if(!S.read(S.keys.analytics,null))S.writeLocal(S.keys.analytics,[]);if(!S.read(S.keys.requests,null))S.writeLocal(S.keys.requests,[]);if(!S.read(S.keys.ratings,null))S.writeLocal(S.keys.ratings,{});if(!S.read(S.keys.preferences,null))S.writeLocal(S.keys.preferences,{});if(!S.read(S.keys.subscriptions,null))S.writeLocal(S.keys.subscriptions,{})
}
const catalog=()=>S.read(S.keys.catalog,[]),users=()=>S.read(S.keys.users,[]),notices=()=>S.read(S.keys.notices,[]),requests=()=>S.read(S.keys.requests,[]),ratings=()=>S.read(S.keys.ratings,{}),history=()=>S.read(S.keys.history,{}),myList=()=>S.read(S.keys.list,[]),preferences=()=>S.read(S.keys.preferences,{}),subscriptions=()=>S.read(S.keys.subscriptions,{}),branding=()=>S.read(S.keys.globalBranding,{splashEyebrow:'DIGITAL MEDIA EXPERIENCE',splashTag:'DM VERSION',splashTitle:'Seu entretenimento. Do seu jeito.',splashSubtitle:'Filmes, séries, animes, doramas, livros e música conectados por uma única experiência.',accent:'#42a5ff',featuredIds:[],legalAbout:'',legalTerms:'',legalPrivacy:'',supportEmail:''});
const saveCatalog=async x=>{if(LX.cloud?.enabled?.()){await LX.cloud.saveCatalog(x);return catalog()}S.writeLocal(S.keys.catalog,x);return x},saveCatalogItem=async x=>{if(LX.cloud?.enabled?.()){await LX.cloud.upsertCatalogItem(x);return catalog().find(z=>z.id===x.id)||x}const a=catalog(),i=a.findIndex(z=>z.id===x.id);i>=0?a[i]=x:a.unshift(x);S.writeLocal(S.keys.catalog,a);return x},deleteCatalogItem=async id=>{if(LX.cloud?.enabled?.())return LX.cloud.deleteCatalogItem(id);S.writeLocal(S.keys.catalog,catalog().filter(x=>Number(x.id)!==Number(id)));return {id:Number(id),deleted:true,tombstoned:false,local:true}},saveUsers=async x=>{if(LX.cloud?.enabled?.()){await LX.cloud.saveUsers(x);return users()}S.writeLocal(S.keys.users,x);return x},saveRequests=x=>S.writeLocal(S.keys.requests,x),saveRatings=x=>S.write(S.keys.ratings,x),savePreferences=x=>S.write(S.keys.preferences,x),saveSubscriptions=x=>S.writeLocal(S.keys.subscriptions,x),saveBranding=async x=>{if(LX.cloud?.enabled?.()){await LX.cloud.saveBranding(x);return branding()}S.writeLocal(S.keys.globalBranding,x);return x};
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function levenshtein(a,b){a=normalize(a);b=normalize(b);const m=Array.from({length:b.length+1},(_,i)=>[i]);for(let j=0;j<=a.length;j++)m[0][j]=j;for(let i=1;i<=b.length;i++)for(let j=1;j<=a.length;j++)m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:1+Math.min(m[i-1][j],m[i][j-1],m[i-1][j-1]);return m[b.length][a.length]}
function searchable(x){return [x.title,x.genre,...(x.genres||[]),x.type,x.artist,x.album,x.author,x.director,x.creator,x.studio,...(x.cast||[]),...(x.tags||[])].filter(Boolean).join(' ')}
function search(items,q){q=normalize(q);if(!q)return items;const terms=q.split(/\s+/);return items.map(x=>{const hay=normalize(searchable(x));let score=terms.reduce((s,t)=>s+(hay.includes(t)?5:0),0);score+=normalize(x.title).includes(q)?20:0;const d=levenshtein(x.title,q);score+=Math.max(0,8-d);return {x,score}}).filter(z=>z.score>0).sort((a,b)=>b.score-a.score).map(z=>z.x)}
function quality(x){
 const checks=[],req=(label,ok)=>checks.push({label,ok:!!ok});
 req('Título',x.title);req('Descrição',String(x.desc||x.lyrics||'').trim().length>=3);req('Capa',x.cover);
 if(x.type==='Filme')req('Vídeo',x.mediaKey||x.demoMedia);
 if(['Série','Anime','Dorama'].includes(x.type))req('Episódios',x.episodes?.some(e=>e.mediaKey));
 if(x.type==='Livro')req('Arquivo',x.mediaKey||x.chapters?.length);
 if(x.type==='Música')req('Áudio',x.mediaKey||x.tracks?.some(t=>t.mediaKey||t.url));
 const pass=checks.filter(c=>c.ok).length;return {score:Math.round(pass/checks.length*100),checks,pass,total:checks.length,ready:pass===checks.length}
}
function recommendation(items,hist,ratingsMap,pref={}){const opened=Object.keys(hist).map(Number),recent=items.filter(x=>opened.includes(x.id)).sort((a,b)=>(hist[b.id]?.opened||0)-(hist[a.id]?.opened||0));const genres=new Map(),types=new Map(),tags=new Map();recent.slice(0,12).forEach(x=>{const gs=[x.genre,...(x.genres||[])].filter(Boolean);[...new Set(gs)].forEach(g=>genres.set(g,(genres.get(g)||0)+3));types.set(x.type,(types.get(x.type)||0)+1);(x.tags||[]).forEach(t=>tags.set(t,(tags.get(t)||0)+2))});const fav=new Set((pref.genres||[]).map(normalize));return items.map(x=>{const gs=[x.genre,...(x.genres||[])].filter(Boolean);let s=gs.reduce((n,g)=>n+(genres.get(g)||0),0)+(types.get(x.type)||0)+(x.trending?1:0)+(x.newRelease?1:0);if(gs.some(g=>fav.has(normalize(g))))s+=7;(x.tags||[]).forEach(t=>s+=tags.get(t)||0);const r=ratingsMap[x.id];if(r)s+=r>=4?4:r<=2?-3:0;if(opened.includes(x.id))s-=2;return {x,s}}).sort((a,b)=>b.s-a.s).map(z=>z.x)}
function track(event,data={}){const a=S.read(S.keys.analytics,[]);a.push({event,data,at:Date.now()});if(a.length>1000)a.splice(0,a.length-1000);S.writeLocal(S.keys.analytics,a);LX.cloud?.track?.(event,data)}
function analytics(){return S.read(S.keys.analytics,[])}
function requestKey(r){return normalize(`${r.kind}|${r.mediaType}|${r.title}`)}
function addOrVoteRequest(r){const arr=requests(),k=requestKey(r),found=arr.find(x=>requestKey(x)===k&&!['Concluído','Fechado'].includes(x.status));let out;if(found){found.votes=(found.votes||1)+1;found.voters=[...(found.voters||[]),r.userEmail].filter((x,i,a)=>a.indexOf(x)===i);found.updated=Date.now();out={merged:true,item:found}}else{r.votes=1;r.voters=[r.userEmail];arr.unshift(r);out={merged:false,item:r}}saveRequests(arr);LX.cloud?.requestOrVote?.(r);return out}
async function hash(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function api(path,opts={}){if(!LX.config.apiBase)throw new Error('API_NOT_CONFIGURED');const r=await fetch(LX.config.apiBase+path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`HTTP_${r.status}`);return r.json()}
const auth={
 async login(email,password){await LX.ensureSupabase?.().catch(()=>false);if(LX.cloud?.enabled?.())return LX.cloud.signIn(email,password);if(LX.config.apiBase)return api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});const demoAllowed=location.protocol==='file:'||['localhost','127.0.0.1'].includes(location.hostname),adm=LX.config.localDemoAdmin;if(demoAllowed&&email===adm.email&&password===adm.password)return {user:{name:'Administrador',email,admin:true}};if(LX.config.production&&LX.config.requireCloudInProduction!==false)throw new Error('CLOUD_NOT_CONFIGURED');const a=S.read(S.keys.accounts,[]).find(x=>x.email===email);if(!a||a.pass!==await hash(password))throw new Error('INVALID_CREDENTIALS');return {user:a}},
 async register({name,email,password,ranking}){await LX.ensureSupabase?.().catch(()=>false);if(LX.cloud?.enabled?.())return LX.cloud.signUp({name,email,password,ranking});if(LX.config.apiBase)return api('/api/auth/register',{method:'POST',body:JSON.stringify({name,email,password,ranking})});const demoAllowed=location.protocol==='file:'||['localhost','127.0.0.1'].includes(location.hostname);if(LX.config.production&&LX.config.requireCloudInProduction!==false&&!demoAllowed)throw new Error('CLOUD_NOT_CONFIGURED');let a=S.read(S.keys.accounts,[]);if(a.some(x=>x.email===email)||email===LX.config.localDemoAdmin.email)throw new Error('EMAIL_EXISTS');const user={id:Date.now(),name,email,pass:await hash(password),ranking,created:new Date().toISOString()};a.push(user);S.write(S.keys.accounts,a);const u=users();u.push({id:user.id,name,email,verified:false,visible:ranking,watched:0,listened:0,read:0,streak:1});saveUsers(u);return {user}},
 async resume(){await LX.ensureSupabase?.().catch(()=>false);return LX.cloud?.enabled?.()?LX.cloud.resume():null},
 async logout(){if(LX.cloud?.enabled?.())await LX.cloud.signOut()},
 async resendConfirmation(email){if(LX.cloud?.enabled?.())return LX.cloud.resendConfirmation(email);throw new Error('CLOUD_NOT_CONFIGURED')},
 async resetPassword(email){if(LX.cloud?.enabled?.())return LX.cloud.resetPassword(email);throw new Error('CLOUD_NOT_CONFIGURED')},
 async updatePassword(password){if(LX.cloud?.enabled?.())return LX.cloud.updatePassword(password);throw new Error('CLOUD_NOT_CONFIGURED')}
};
LX.data={P,DEMO,seed,catalog,users,notices,requests,ratings,history,myList,preferences,subscriptions,branding,saveCatalog,saveCatalogItem,deleteCatalogItem,saveUsers,saveRequests,saveRatings,savePreferences,saveSubscriptions,saveBranding,search,quality,recommendation,track,analytics,addOrVoteRequest,auth,normalize,cloud:LX.cloud};})();

window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['services']='25.35';

/* ===== ui.js · LX Plus v27.0 ===== */
(()=>{const LX=window.LX,D=LX.data,S=LX.store,$=id=>document.getElementById(id),$$=s=>Array.from(document.querySelectorAll(s));
const state=LX.state={screen:'splash',mode:'Assistir',category:'Início',query:'',user:null,profile:null,hero:0,heroTimer:null,musicQueue:[],musicIndex:0,musicView:'home',musicGenre:'Todos',musicSort:'recent',rankingPeriod:'Mensal',rankingKind:'Geral',readerSize:20,readerPaper:false,readerTheme:'night',libraryType:'Todos'};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));LX.esc=esc;
const show=id=>{['splash','auth','profiles','app','admin'].forEach(x=>$(x).classList.add('hidden'));$(id).classList.remove('hidden');state.screen=id};LX.show=show;
const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2300)};LX.toast=toast;
const initials=n=>(n||'LX').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();LX.initials=initials;
const greeting=()=>new Date().getHours()<12?'Bom dia':new Date().getHours()<18?'Boa tarde':'Boa noite';
const verifiedBadge=(size='sm')=>`<span class="verified-badge verified-${size}" aria-label="Conta verificada" title="Conta verificada"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="seal" d="M12 2.7l2.14 1.5 2.58-.16.92 2.42 2.24 1.3-.42 2.55 1.3 2.24-1.76 1.9-.16 2.58-2.42.92-1.3 2.24-2.55-.42-2.24 1.3-1.9-1.76-2.58-.16-.92-2.42-2.24-1.3.42-2.55-1.3-2.24 1.76-1.9.16-2.58 2.42-.92 1.3-2.24 2.55.42z"/><path class="verified-inner" d="m7.8 12.2 2.65 2.65 5.8-6.05"/></svg></span>`;LX.verifiedBadge=verifiedBadge;const verified=(n,v,size='sm')=>`${esc(n)}${v?verifiedBadge(size):''}`;LX.verified=verified;
const fmt=s=>{s=Math.floor(+s||0);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};LX.fmt=fmt;
const watchLabel=x=>{const h=D.history()[x?.id]||{};if(['Livro','Música'].includes(x?.type))return x?.type==='Livro'?'▤ Ler agora':'♫ Ouvir';if(h.progress>0&&h.progress<98&&h.position>4)return `▶ Continuar · ${fmt(h.position)}`;return '▶ Assistir'};

const PROFILE_PRESETS={
  lx:{label:'LX',mark:'LX',bg:'linear-gradient(145deg,#173e70,#1184f4)'},
  plus:{label:'Plus',mark:'+',bg:'linear-gradient(145deg,#5530a8,#9b63ff)'},
  crown:{label:'Coroa',mark:'♛',bg:'linear-gradient(145deg,#6a4810,#e0a329)'},
  play:{label:'Play',mark:'▶',bg:'linear-gradient(145deg,#5a1924,#e24d62)'},
  music:{label:'Música',mark:'♫',bg:'linear-gradient(145deg,#18354e,#20a3c8)'},
  book:{label:'Livro',mark:'▤',bg:'linear-gradient(145deg,#174335,#36b985)'},
  neon:{label:'Neon',mark:'LX',bg:'linear-gradient(145deg,#10131d,#174a77)',glow:true},
  mono:{label:'Mono',mark:'LX',bg:'linear-gradient(145deg,#191919,#454545)'},
  owl:{label:'Coruja',mark:'🦉',bg:'linear-gradient(145deg,#32261b,#7b5a36)'},
  shield:{label:'Shield',mark:'⬢',bg:'linear-gradient(145deg,#112f4c,#1d8bcf)'},
  star:{label:'Star',mark:'✦',bg:'linear-gradient(145deg,#37246b,#9360ff)'},
  flame:{label:'Flame',mark:'✶',bg:'linear-gradient(145deg,#4a1d15,#ff7b49)'}
};LX.PROFILE_PRESETS=PROFILE_PRESETS;
const avatarArt=(skin,hair,shirt,bg1,bg2)=>`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='${bg1}'/><stop offset='1' stop-color='${bg2}'/></linearGradient></defs><rect width='96' height='96' rx='22' fill='url(#g)'/><circle cx='48' cy='35' r='18' fill='${skin}'/><path d='M30 32c2-12 11-20 21-20 9 0 18 5 22 18-5-4-11-6-17-6-9 0-15 4-26 8z' fill='${hair}'/><circle cx='41' cy='36' r='2' fill='#1f2730'/><circle cx='55' cy='36' r='2' fill='#1f2730'/><path d='M42 45c4 4 8 4 12 0' stroke='#874d4d' stroke-width='2.3' fill='none' stroke-linecap='round'/><path d='M24 91c2-18 14-28 24-28s22 10 24 28' fill='${shirt}'/><path d='M35 61c4 4 8 6 13 6s10-2 14-6' stroke='rgba(255,255,255,.4)' stroke-width='2' fill='none'/></svg>`)}`;
const PROFILE_GALLERY=[
  {label:'Alex',url:avatarArt('#f3c9a7','#2a2f42','#3b82f6','#0b1629','#183d74')},
  {label:'Maya',url:avatarArt('#f0c1a1','#241a17','#ff6b8a','#2b1023','#5a1c34')},
  {label:'Noah',url:avatarArt('#e8bf98','#4d3026','#20b486','#112824','#1f5a48')},
  {label:'Luna',url:avatarArt('#efc8ae','#3a2038','#8b7cff','#1b1637','#4f3db1')},
  {label:'Caio',url:avatarArt('#c98d62','#1c1a20','#4cc9f0','#091929','#0d5772')},
  {label:'Sora',url:avatarArt('#f5d3ba','#70502d','#ffb347','#2d1c11','#7a441c')},
  {label:'Iris',url:avatarArt('#d39a73','#1b263b','#39d99f','#0f1f25','#1b5b46')},
  {label:'Theo',url:avatarArt('#f3d0b1','#2b2b2b','#e95c5c','#281417','#5e1d28')},
  {label:'Zoe',url:avatarArt('#f2c7a6','#2f2347','#7c5cff','#131027','#40329b')},
  {label:'Nina',url:avatarArt('#efc09f','#362015','#ff8f66','#22120d','#79321b')},
  {label:'Kai',url:avatarArt('#c88d67','#0f1b2d','#58b5ff','#081420','#14436f')},
  {label:'Milo',url:avatarArt('#efcfb1','#263520','#8ed65b','#121d10','#355827')}
];LX.PROFILE_GALLERY=PROFILE_GALLERY;
function profileStyle(email=''){const all=S.read(S.keys.profileStyles,{});return all[email]||{preset:'lx'}}
function avatarHTML(name,email='',cls='profile-avatar'){const st=profileStyle(email),shape=st.shape||'rounded',premium=!!D.subscriptions?.()?.[email]?.active,frame=premium?(st.frame||'none'):'none',classes=`${cls} avatar-shape-${shape} avatar-frame-${frame}`;if(st.image)return `<div class="${classes} avatar-image" style="background-image:url('${st.image.replace(/'/g,'%27')}')"></div>`;const pr=PROFILE_PRESETS[st.preset]||PROFILE_PRESETS.lx;return `<div class="${classes} ${pr.glow?'avatar-glow':''}" style="background:${pr.bg}">${esc(pr.mark||initials(name))}</div>`}
LX.profileStyle=profileStyle;LX.avatarHTML=avatarHTML;

function posterWalls(){
 const arts=[...new Set((D.catalog?.()||[]).flatMap(x=>[x.cover,x.banner,x.carouselImage]).filter(x=>typeof x==='string'&&/^(https?:|data:image)/i.test(x)))];
 const fallback=['CINEMA','SÉRIES','ANIMES','DORAMAS','LIVROS','MÚSICA'];
 const arr=Array.from({length:30},(_,i)=>i),tile=i=>{const art=arts.length?arts[i%arts.length]:'';return art?`<div class="poster-tile catalog-poster-tile" style="background-image:url('${String(art).replace(/'/g,'%27')}')"></div>`:`<div class="poster-tile official-tile lx-fallback-poster p${i%6}"><span>${fallback[i%fallback.length]}</span><b>LX+</b></div>`};
 const a=$('wallA'),b=$('wallB');if(a)a.innerHTML=arr.map(tile).join('');if(b)b.innerHTML=[...arr].reverse().map(tile).join('')
}
function authTab(t){$('tabLogin').classList.toggle('active',t==='login');$('tabRegister').classList.toggle('active',t==='register');$('loginForm').classList.toggle('hidden',t!=='login');$('registerForm').classList.toggle('hidden',t!=='register')}
function renderProfiles(){const n=state.user?.name||'Usuário',email=state.user?.email||'',u=D.users().find(x=>x.email===email)||state.user||{},st=profileStyle(email),sub=D.subscriptions()[email];$('profileGrid').innerHTML=`<button class="profile-card profile-card-v25" data-profile="main">${avatarHTML(n,email,'profile-avatar')}<strong>${verified(n,u.verified,'sm')}</strong><small>${esc(st.bio||'Perfil principal')}</small>${sub?.active?'<span class="premium-user-pill">PREMIUM</span>':''}</button><button class="profile-card profile-card-v25" data-profile="kids"><div class="profile-avatar kids-avatar avatar-shape-rounded">K</div><strong>Kids</strong><small>Conteúdo infantil</small></button>`;$$('[data-profile]').forEach(b=>b.onclick=()=>{state.profile={id:b.dataset.profile,name:b.dataset.profile==='kids'?'Kids':n,kids:b.dataset.profile==='kids'};$('profileBtn').innerHTML=b.dataset.profile==='kids'?'<span>K</span>':avatarHTML(n,email,'avatar-inline');renderApp();show('app');LX.social?.boot?.()})}
function categories(){return state.mode==='Assistir'?['Início','Catálogo Online','Filmes','Séries','Animes','Doramas','Minha Lista','Pedidos','Ranking LX']:state.mode==='Ler'?['Início','Biblioteca Pública','Livros','Minha Lista','Pedidos','Ranking LX']:state.mode==='Ouvir'?['Início','Música','Minha Lista','Pedidos','Ranking LX']:['Hoje','Futebol','Basquete','Vôlei','Tênis','Motorsport']}
function renderCategories(){$('categoryNav').innerHTML=categories().map(c=>`<button class="${c===state.category?'active':''}" data-cat="${c}">${c}</button>`).join('');$$('[data-cat]').forEach(b=>b.onclick=()=>{const c=b.dataset.cat;if(c==='Ranking LX')return LX.openRanking();if(c==='Pedidos')return LX.openRequests();state.category=c;renderApp()})}
function allowed(){return state.mode==='Assistir'?['Filme','Série','Anime','Dorama']:state.mode==='Ler'?['Livro']:state.mode==='Ouvir'?['Música']:[]}
function items(){const now=Date.now();let a=D.catalog().filter(x=>x.published!==false&&(!x.scheduledAt||+new Date(x.scheduledAt)<=now)&&allowed().includes(x.type));if(state.profile?.kids)a=a.filter(x=>!['16','18'].includes(String(x.rating)));if(state.category==='Minha Lista')a=a.filter(x=>D.myList().includes(x.id));else if(state.category!=='Início'){const map={Filmes:'Filme',Séries:'Série',Animes:'Anime',Doramas:'Dorama',Livros:'Livro',Música:'Música'};if(map[state.category])a=a.filter(x=>x.type===map[state.category])}if(state.query)a=D.search(a,state.query);return a.sort((x,y)=>(+(y.priority||0))-(+(x.priority||0))||((+new Date(y.publishedAt||y.createdAt||0))-(+new Date(x.publishedAt||x.createdAt||0))))}
function isAutoArtwork(v){return /^data:image\/svg\+xml/i.test(String(v||''))}
function cinematicArt(x){const b=String(x?.banner||'');return b&&!isAutoArtwork(b)?b:(x?.cover||b||'')}
LX.isAutoArtwork=isAutoArtwork;LX.cinematicArt=cinematicArt;
function renderHero(){const branding=D.branding?.()||{},preferred=(branding.featuredIds||[]).map(Number);let f=items().filter(x=>preferred.includes(x.id));if(!f.length)f=items().filter(x=>x.featured);if(!f.length)f=items().slice(0,4);if(!f.length){$('hero').innerHTML='';return}state.hero=Math.min(state.hero,f.length-1);$('hero').innerHTML=f.map((x,i)=>{const art=x.carouselImage||cinematicArt(x),posterFallback=!!x.cover&&(art===x.cover)&&!x.carouselImage;return `<article class="hero-slide ${i===state.hero?'active':''}"><div class="hero-bg ${posterFallback?'hero-bg-poster':''}" style="--hero-art:url('${String(art||'').replace(/'/g,'%27')}');background-image:url('${String(art||'').replace(/'/g,'%27')}')">${posterFallback?`<span class="hero-poster-focus" style="background-image:url('${String(x.cover||'').replace(/'/g,'%27')}')"></span>`:''}</div><div class="hero-copy"><span class="eyebrow">LX PLUS</span><h1>${esc(x.title)}</h1><div class="hero-meta"><span>${x.year}</span><span>${esc(x.rating)}</span><span>${esc(x.genre)}</span><span>${esc(x.type)}</span></div><p>${esc(x.desc)}</p><div class="hero-actions"><button class="primary-btn" onclick="LX.primary(${x.id})">${watchLabel(x)}</button><button class="secondary-btn" onclick="LX.detail(${x.id})">ⓘ Mais informações</button></div></div></article>`}).join('')+`<div class="hero-dots">${f.map((_,i)=>`<button class="${i===state.hero?'active':''}" data-dot="${i}"></button>`).join('')}</div>`;$$('[data-dot]').forEach(d=>d.onclick=()=>{state.hero=+d.dataset.dot;renderHero();heroTimer(f.length)});heroTimer(f.length)}
function heroTimer(n){clearInterval(state.heroTimer);if(n>1)state.heroTimer=setInterval(()=>{state.hero=(state.hero+1)%n;renderHero()},7600)}
function renderWelcome(){const h=D.history(),entries=Object.values(h).filter(Boolean),sub=D.subscriptions()[state.user?.email||''],email=state.user?.email||'',u=D.users().find(x=>x.email===email)||state.user||{},layout=S.read(S.keys.layoutMode,'cinema'),theme=S.read(S.keys.theme,'dark'),prefs=D.preferences()[email]||{};$('welcome').innerHTML=`<div class="welcome-card welcome-v24"><div class="welcome-user">${avatarHTML(state.profile?.name||state.user?.name||'LX',email,'welcome-avatar')}<div><span class="eyebrow">${state.mode.toUpperCase()} ${sub?.active?'<span class="premium-user-pill">PREMIUM</span>':''}</span><h2>${greeting()}, <span>${esc(state.profile?.name||state.user?.name||'você')}</span> ${u.verified?LX.verifiedBadge('md'):''}</h2><p>${state.mode==='Assistir'?'Continue suas histórias ou descubra algo novo.':state.mode==='Ler'?'Retome sua leitura ou abra um novo universo.':'Sua trilha continua exatamente de onde parou.'}</p></div></div><div class="mode-summary"><div><strong>${entries.length}</strong><small>EM PROGRESSO</small></div><div><strong>${D.myList().length}</strong><small>MINHA LISTA</small></div><div><strong>${items().length}</strong><small>NO CATÁLOGO</small></div></div></div><div class="experience-strip"><div><span>◎</span><strong>${layout==='app'?'Modo App':layout==='compact'?'Compacto':'Cinema'}</strong><small>Interface</small></div><div><span>◐</span><strong>${theme==='light'?'Claro':'Escuro'}</strong><small>Tema</small></div><div><span>✦</span><strong>${prefs.genres?.length||0}</strong><small>Preferências</small></div><div><span>☁</span><strong>${LX.cloud?.enabled?.()?'Online':'Local'}</strong><small>Sincronização</small></div></div>`}
function card(x,progress,rank){const h=D.history()[x.id],p=h?.progress??x.progress??0,r=D.ratings()[x.id],listed=D.myList().includes(x.id);return `<article class="card" onclick="LX.detail(${x.id})"><div class="card-art" style="background-image:url('${x.cover||cinematicArt(x)}')"><div class="card-badges">${rank?`<span>#${rank}</span>`:''}${x.newRelease?'<span>NOVO</span>':''}${r?`<span>★ ${r}</span>`:''}${listed?'<span>✓ LISTA</span>':''}</div>${x.trending?'<div class="card-corner-badge">EM ALTA</div>':''}<span class="lx-card-mark" aria-hidden="true">LX<b>+</b></span><span class="card-play">▶</span><div class="card-copy"><div class="card-title">${esc(x.title)}</div><div class="card-meta">${x.year} · ${esc(x.type)} · ${esc(x.genre)}</div></div>${progress&&p?`<div class="progress-line"><i style="width:${Math.min(100,p)}%"></i></div>`:''}</div></article>`}
function rail(title,sub,a,progress=false,top10=false){if(!a.length)return'';const id='r'+Math.random().toString(36).slice(2,8),missing=Math.max(0,5-a.length),filler=missing?`<div class="rail-filler" style="grid-column:span ${missing}"><span>LX PLUS</span><strong>Seu entretenimento continua aqui</strong><small>Explore o catálogo e acompanhe os próximos lançamentos.</small></div>`:'';return `<section class="rail-section"><div class="rail-head"><div><h2>${title}</h2><p>${sub}</p></div><span>${a.length} títulos</span></div><div class="rail-wrap"><button class="rail-arrow left" onclick="LX.scroll('${id}',-1)">‹</button><div class="rail" id="${id}">${a.map((x,i)=>card(x,progress,top10?i+1:null)).join('')}${filler}</div><button class="rail-arrow right" onclick="LX.scroll('${id}',1)">‹</button></div></section>`}

function musicArt(x){return String(x?.cover||x?.banner||'').replace(/'/g,'%27')}
function musicProvider(x={}){const refs=[x?.mediaKey,x?.fullMediaKey,x?.externalMusicUrl,...(x?.tracks||[]).flatMap(t=>[t?.mediaKey,t?.fullMediaKey,t?.url])].filter(Boolean).join(' ');if(/(?:^|\s)youtube:|youtu(?:be\.com|\.be)/i.test(refs))return 'LX Music + YouTube';if(/(?:^|\s)spotify:|open\.spotify\.com/i.test(refs))return 'LX Music + Spotify';return 'LX Music'}
function musicProviderKind(item={},content={}){const refs=[item?.sourceMediaKey,item?.mediaKey,item?.fullMediaKey,item?.externalMusicUrl,item?.url,content?.externalMusicUrl,content?.sourceMediaKey,content?.mediaKey,content?.fullMediaKey,...(content?.tracks||[]).flatMap(t=>[t?.sourceMediaKey,t?.mediaKey,t?.fullMediaKey,t?.url])].filter(Boolean).join(' ');if(/(?:^|\s)youtube:|youtu(?:be\.com|\.be)|music\.youtube\.com/i.test(refs))return'youtube';if(/(?:^|\s)spotify:|open\.spotify\.com/i.test(refs))return'spotify';return'lx'}
function musicProviderBrandHtml(item={},compact=false){const content=item?.contentId?D.catalog().find(x=>String(x.id)===String(item.contentId))||{}:item||{},kind=musicProviderKind(item,content);if(kind==='youtube')return `<span class="lx-provider-lockup is-youtube ${compact?'compact':''}"><b>LX Music</b><i>+</i><span class="lx-provider-logo" aria-label="YouTube"><svg viewBox="0 0 28 20" aria-hidden="true"><path d="M27.4 3.13A3.52 3.52 0 0 0 24.92.64C22.73.05 14 .05 14 .05S5.27.05 3.08.64A3.52 3.52 0 0 0 .6 3.13C.01 5.32.01 10 .01 10s0 4.68.59 6.87a3.52 3.52 0 0 0 2.48 2.49c2.19.59 10.92.59 10.92.59s8.73 0 10.92-.59a3.52 3.52 0 0 0 2.48-2.49c.59-2.19.59-6.87.59-6.87s0-4.68-.59-6.87Z" fill="#ff0033"/><path d="m11.2 14.25 7.27-4.25-7.27-4.25v8.5Z" fill="#fff"/></svg></span></span>`;if(kind==='spotify')return `<span class="lx-provider-lockup is-spotify ${compact?'compact':''}"><b>LX Music</b><i>+</i><span class="lx-provider-logo" aria-label="Spotify"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1ed760"/><path d="M6.1 8.2c3.9-1.1 8.5-.8 11.8.9M6.8 11.5c3.2-.9 7.3-.7 10.2.8M7.4 14.6c2.8-.7 6.2-.5 8.7.7" fill="none" stroke="#07140b" stroke-width="1.7" stroke-linecap="round"/></svg></span></span>`;return `<span class="lx-provider-lockup is-lx ${compact?'compact':''}"><b>LX Music</b></span>`}
function syncMusicProviderBrand(item=currentMusic?.()){const el=$('musicProviderBrand');if(!el)return;const content=currentMusicContent?.()||{},kind=musicProviderKind(item||{},content);el.classList.toggle('hidden',!item);el.innerHTML=item?musicProviderBrandHtml(item,true):'';el.dataset.provider=kind}

const DEFAULT_MUSIC_CATEGORIES=['Sertanejo','Forró','Piseiro','Funk','Trap','Rap','Pop','Rock','Eletrônica','Pagode','Samba','Gospel','MPB','Internacional','Românticas','Arrocha','Reggae','Lo-fi','Phonk','Outros'];
function musicGenresOf(x){const raw=[x?.genre,...(Array.isArray(x?.genres)?x.genres:[])].flatMap(v=>String(v||'').split(/[,;/|]+/)).map(v=>v.trim()).filter(Boolean);return [...new Set(raw.length?raw:['Outros'])]}
function musicHasGenre(x,genre){return genre==='Todos'||musicGenresOf(x).some(g=>D.normalize(g)===D.normalize(genre))}
function musicCategoryList(all=musicCatalog(),includeEmpty=false){const saved=D.branding?.()?.musicCategories,configured=Array.isArray(saved)?saved:DEFAULT_MUSIC_CATEGORIES,used=all.flatMap(musicGenresOf),ordered=[...new Set([...configured,...used].map(x=>String(x||'').trim()).filter(Boolean))];return includeEmpty?ordered:ordered.filter(g=>all.some(x=>musicHasGenre(x,g)))}
function musicCategoryCard(genre,all){const list=all.filter(x=>musicHasGenre(x,genre)),sample=list.slice(0,4),art=sample.map(x=>LX.artwork.markup(x,{},'lx-category-art',x.title)).join('');return `<button type="button" class="lx-music-category-card" data-lx-music-genre="${esc(genre)}"><span class="lx-music-category-covers">${art||'<i>♫</i>'}</span><span><strong>${esc(genre)}</strong><small>${list.length} ${list.length===1?'música':'músicas'}</small></span><b>›</b></button>`}
LX.musicGenresOf=musicGenresOf;LX.musicCategoryList=musicCategoryList;LX.musicCategoryDefaults=DEFAULT_MUSIC_CATEGORIES;
function musicCatalog(){const now=Date.now();let a=D.catalog().filter(x=>x.published!==false&&x.type==='Música'&&(!x.scheduledAt||+new Date(x.scheduledAt)<=now));if(state.profile?.kids)a=a.filter(x=>!['16','18'].includes(String(x.rating)));return a.sort((x,y)=>(+(y.priority||0))-(+(x.priority||0))||(+new Date(y.publishedAt||y.createdAt||0)-+new Date(x.publishedAt||x.createdAt||0)))}
function musicSaved(id){return D.myList().some(x=>String(x)===String(id))}
function musicAlbumCard(x){const tracks=x.tracks?.length||1,provider=musicProvider(x),saved=musicSaved(x.id);return `<article class="lx-music-album ${saved?'is-saved':''}" data-music-id="${esc(x.id)}"><button class="lx-music-card-main" type="button" onclick="LX.music(${Number(x.id)},0)" title="Reproduzir ou pausar ${esc(x.title)}">${LX.artwork.markup(x,{},'lx-music-art',x.title)}<em>${esc(provider)}</em><i data-music-play-icon>${LX.artwork.icon('play')}</i></button><div class="lx-music-card-copy"><button type="button" onclick="LX.openMusicAlbum(${Number(x.id)})"><strong>${esc(x.title)}</strong><small>${esc(x.artist||'LX Music')} · ${tracks} ${tracks===1?'faixa':'faixas'}</small></button><button class="lx-music-save" type="button" data-music-save-id="${esc(x.id)}" onclick="LX.musicToggleSaved(${Number(x.id)})" aria-label="${saved?'Remover da':'Salvar na'} biblioteca" title="${saved?'Remover da':'Salvar na'} biblioteca">${LX.artwork.icon('heart')}</button></div></article>`}
function musicQuickCard(x){return `<button class="lx-music-quick" type="button" data-music-id="${esc(x.id)}" onclick="LX.music(${Number(x.id)},0)">${LX.artwork.markup(x,{},'lx-music-quick-art',x.title)}<strong>${esc(x.title)}</strong><small>${esc(x.artist||'LX Music')}</small><i data-music-play-icon>${LX.artwork.icon('play')}</i></button>`}
function musicNav(active,total,saved,recent){const nav=(view,icon,label,count='')=>`<button type="button" data-lx-music-view="${view}" class="${active===view?'active':''}"><span>${LX.artwork.icon(icon)}</span><b>${label}</b>${count!==''?`<i>${count}</i>`:''}</button>`;return `<aside class="lx-music-side"><div class="lx-music-side-brand"><span>${LX.artwork.icon('play')}</span><div><b>LX Music</b><small>Seu som, do seu jeito</small></div></div><nav>${nav('home','home','Início')}${nav('explore','search','Buscar')}${nav('library','library','Sua biblioteca',saved)}${nav('liked','heart','Músicas curtidas',saved)}${nav('recent','history','Tocadas recentemente',recent)}</nav><div class="lx-music-side-library"><span>SUA COLEÇÃO</span><button type="button" data-lx-music-view="library"><i>${LX.artwork.icon('plus')}</i><div><b>Biblioteca LX</b><small>${total} ${total===1?'item':'itens'} disponíveis</small></div></button><button type="button" onclick="LX.openMusicQueue()"><i>${LX.artwork.icon('queue')}</i><div><b>Fila de reprodução</b><small>Veja o que toca em seguida</small></div></button></div><div class="lx-music-side-note"><span>PLAYER UNIVERSAL</span><small>Áudio completo do catálogo LX Plus</small></div></aside>`}
function musicEmpty(title,text,action=''){return `<section class="lx-music-empty"><span>♫</span><h2>${esc(title)}</h2><p>${esc(text)}</p>${action}</section>`}
function musicLoading(){return `<section class="lx-music-load-surface" aria-label="Carregando Música"><div class="lx-music-skeleton" role="status" aria-label="Carregando destaques musicais"><span class="art"></span><span class="lines"><i></i><i></i></span></div><div class="lx-music-skeleton" aria-hidden="true"><span class="art"></span><span class="lines"><i></i><i></i></span></div></section>`}
LX.retryMusicCatalog=async()=>{const root=$('homeContent');if(root)root.innerHTML=musicLoading();await LX.cloud?.retryCatalog?.();LX.ui?.renderApp?.()};
function musicGridSection(title,subtitle,list,action=''){if(!list.length)return'';return `<section class="lx-music-section"><div class="lx-section-title"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>${action}</div><div class="lx-music-grid">${list.map(musicAlbumCard).join('')}</div></section>`}
function musicMixCard(genre,list,index){const art=list.slice(0,4).map(x=>LX.artwork.markup(x,{},'lx-mix-art',x.title)).join('');return `<button type="button" class="lx-music-mix mix-${index%5}" data-lx-music-genre="${esc(genre)}"><span>${art}</span><b>Mix ${esc(genre)}</b><small>${esc(list.slice(0,3).map(x=>x.artist||x.title).join(', '))}</small></button>`}
function musicHighlights(all){const seen=new Set();return all.filter(x=>x?.featured===true).filter(x=>{const title=String(x?.title||'').trim(),id=String(x?.id??'').trim(),artist=String(x?.artist||'LX Music').trim(),key=(title+'|'+artist).toLocaleLowerCase('pt-BR');if(!title||!id||title==='undefined'||title==='null'||seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>(+b.priority||0)-(+a.priority||0)||(+new Date(b.publishedAt||b.createdAt||0)-+new Date(a.publishedAt||a.createdAt||0))).slice(0,8)}
function musicTasteProfile(all,h){
 const scores=new Map(),played=new Set(),now=Date.now();
 all.forEach(x=>{const hx=h?.[x.id]||h?.[String(x.id)]||null;if(!hx?.opened&&!hx?.playCount)return;played.add(String(x.id));const plays=Math.max(1,+hx.playCount||1),age=now-(+hx.opened||0),recency=age<14*864e5?2:age<60*864e5?1:0,saved=musicSaved(x.id)?1.5:0,rating=Number(D.ratings()?.[x.id]||0)>0?Number(D.ratings()?.[x.id]||0)/5:0;musicGenresOf(x).forEach(g=>{const key=D.normalize(g)||String(g).toLowerCase(),old=scores.get(key)||{label:g,score:0,plays:0};old.score+=plays*2+recency+saved+rating;old.plays+=plays;scores.set(key,old)})});
 const genres=[...scores.values()].sort((a,b)=>b.score-a.score||b.plays-a.plays);return {genres,played}
}
function musicDiscoveryScore(x,profile){let s=(+x.priority||0)*.15+(x.trending?1.25:0)+(x.newRelease?.75:0);const age=Date.now()-+new Date(x.publishedAt||x.createdAt||0);if(Number.isFinite(age)&&age<45*864e5)s+=.5;for(const g of musicGenresOf(x)){const p=profile.genres.find(z=>D.normalize(z.label)===D.normalize(g));if(p)s+=p.score}return s}
function musicPersonalizedHome(all,h){
 const profile=musicTasteProfile(all,h),featuredIds=new Set(musicHighlights(all).map(x=>String(x.id))),used=new Set(),sections=[];
 const unseen=all.filter(x=>!profile.played.has(String(x.id))&&!featuredIds.has(String(x.id)));
 const byScore=list=>[...list].sort((a,b)=>musicDiscoveryScore(b,profile)-musicDiscoveryScore(a,profile)||(+new Date(b.publishedAt||b.createdAt||0)-+new Date(a.publishedAt||a.createdAt||0)));
 if(profile.genres.length){
  profile.genres.slice(0,2).forEach(g=>{const list=byScore(unseen.filter(x=>musicHasGenre(x,g.label)&&!used.has(String(x.id)))).slice(0,6);list.forEach(x=>used.add(String(x.id)));if(list.length)sections.push({title:`Porque você ouve ${g.label}`,subtitle:`Faixas de ${g.label} que você ainda não ouviu.`,list})});
  const discovery=byScore(unseen.filter(x=>!used.has(String(x.id)))).slice(0,8);discovery.forEach(x=>used.add(String(x.id)));if(discovery.length)sections.push({title:'Descobertas para você',subtitle:'Misturamos seus gêneros mais ouvidos com músicas que ainda não passaram pelo seu player.',list:discovery});
  const replay=all.filter(x=>profile.played.has(String(x.id))).sort((a,b)=>{const ah=h?.[a.id]||h?.[String(a.id)]||{},bh=h?.[b.id]||h?.[String(b.id)]||{};return (+bh.playCount||1)-(+ah.playCount||1)||(+bh.opened||0)-(+ah.opened||0)}).slice(0,6);if(replay.length)sections.push({title:'Ouça novamente',subtitle:'As faixas que mais aparecem no seu histórico.',list:replay});
 }else{
  const starter=[...unseen].sort((a,b)=>(b.trending?1:0)-(a.trending?1:0)||(+b.priority||0)-(+a.priority||0)||(+new Date(b.publishedAt||b.createdAt||0)-+new Date(a.publishedAt||a.createdAt||0))).slice(0,8);if(starter.length)sections.push({title:'Descobertas para você',subtitle:'Comece a ouvir e a LX Plus vai aprender seus gêneros favoritos.',list:starter});
 }
 return {profile,sections}
}
function musicHomeHero(all,firstName){const items=musicHighlights(all);if(!items.length)return '';const carousel=items.length>1,slide=x=>`<article class="lx-music-feature lx-music-feature-v260" data-lx-music-slide data-music-id="${esc(x.id)}" style="--music-bg:${LX.artwork.safeBackground(x)}"><div class="lx-music-feature-art">${LX.artwork.markup(x,{},'lx-hero-art',x.title)}</div><div class="lx-music-feature-copy"><span class="lx-music-provider">${musicProviderBrandHtml(x,true)}</span><h2>${esc(String(x.title).trim())}</h2><p>${esc(x.artist||'LX Music')} · ${esc(x.genre||'Música')}</p><div class="lx-music-feature-actions"><button type="button" class="lx-music-play-big" data-lx-feature-play="${esc(x.id)}" aria-label="Reproduzir ${esc(x.title)}">${LX.artwork.icon('play')}</button><button type="button" class="secondary-btn" data-lx-feature-album="${esc(x.id)}">Abrir álbum</button><button type="button" class="lx-music-hero-save ${musicSaved(x.id)?'active':''}" data-lx-feature-save="${esc(x.id)}" aria-pressed="${musicSaved(x.id)}" aria-label="Salvar música">${LX.artwork.icon('heart')}</button></div></div></article>`;return `<section class="lx-music-top"><div class="lx-music-greeting"><span class="eyebrow">LX MUSIC</span><h1>${greeting()}, ${esc(firstName)}</h1></div><div class="lx-music-top-chips"><button type="button" class="active" data-lx-music-view="home">Tudo</button><button type="button" data-lx-music-view="liked">Curtidas</button><button type="button" data-lx-music-view="recent">Recentes</button><button type="button" onclick="LX.openMusicQueue()">Fila</button></div><div class="lx-music-carousel ${carousel?'has-slides':'is-static'}" aria-label="Destaques da Música">${items.map(slide).join('')}${carousel?`<div class="lx-music-carousel-nav"><button type="button" data-lx-slide-prev aria-label="Destaque anterior">${LX.artwork.icon('prev')}</button><span>${items.map((_,i)=>`<button type="button" data-lx-slide-dot="${i}" aria-label="Destaque ${i+1}" ${i===0?'aria-current="true"':''}></button>`).join('')}</span><button type="button" data-lx-slide-next aria-label="Próximo destaque">${LX.artwork.icon('next')}</button></div>`:''}</div></section>`}
function musicDetailRail(all=[]){
 const related=all.slice(0,5);
 return `<aside id="lxMusicDetailRail" class="lx-music-detail-rail"><div class="lx-music-detail-head"><span>TOCANDO AGORA</span><button type="button" onclick="LX.openMusicQueue()">Fila</button></div><div id="lxMusicDetailCover" class="lx-music-detail-cover"></div><strong id="lxMusicDetailTitle">Escolha uma faixa</strong><small id="lxMusicDetailArtist">LX Music</small><div class="lx-music-detail-related"><span>NA SUA LX MUSIC</span>${related.map(x=>`<button type="button" data-music-id="${esc(x.id)}" onclick="LX.music(${Number(x.id)},0)">${LX.artwork.markup(x,{},'lx-music-detail-thumb',x.title)}<span><b>${esc(x.title)}</b><small>${esc(x.artist||'LX Music')}</small></span></button>`).join('')}</div></aside>`
}
function syncMusicDetailRail(){
 const rail=$('lxMusicDetailRail');if(!rail)return;const t=LX.currentMusic?.()||null,content=t?D.catalog().find(x=>String(x.id)===String(t.contentId)):musicCatalog()[0],item=t||content;if(!item)return;
 const cover=$('lxMusicDetailCover'),title=$('lxMusicDetailTitle'),artist=$('lxMusicDetailArtist');
 if(cover){const art=LX.artwork.url(item,content||{});cover.style.backgroundImage=art?`url("${String(art).replace(/"/g,'%22')}")`:'';cover.classList.toggle('has-cover',!!art)}
 if(title)title.textContent=t?.title||content?.title||'Escolha uma faixa';if(artist)artist.textContent=t?.artist||content?.artist||'LX Music';
}
LX.syncMusicDetailRail=syncMusicDetailRail;
function bindMusicExperience(){
 $$('[data-lx-music-view]').forEach(b=>b.onclick=()=>musicSetView(b.dataset.lxMusicView));
 $$('[data-lx-music-genre]').forEach(b=>b.onclick=()=>musicSetGenre(b.dataset.lxMusicGenre));
 const form=$('lxMusicSearchForm'),input=$('lxMusicSearchInput'),sort=$('lxMusicSort');
 if(form)form.onsubmit=e=>{e.preventDefault();state.query=input?.value?.trim()||'';state.musicView='explore';state.category='Início';renderApp()};
 if(sort)sort.onchange=()=>{state.musicSort=sort.value;renderApp()};
 $('lxMusicSearchClear')?.addEventListener('click',()=>{state.query='';if(input)input.value='';renderApp()});

 $$('[data-lx-feature-play]').forEach(b=>b.onclick=()=>LX.music(b.dataset.lxFeaturePlay,0));$$('[data-lx-feature-album]').forEach(b=>b.onclick=()=>LX.openMusicAlbum(b.dataset.lxFeatureAlbum));$$('[data-lx-feature-save]').forEach(b=>b.onclick=()=>LX.musicToggleSaved(b.dataset.lxFeatureSave));
 const carousel=document.querySelector('.lx-music-carousel.has-slides'),slides=carousel?[...carousel.querySelectorAll('[data-lx-music-slide]')]:[];if(slides.length>1){let position=0,timer=null;const show=i=>{position=(i+slides.length)%slides.length;slides.forEach((s,j)=>{s.hidden=j!==position;s.setAttribute('aria-hidden',String(j!==position))});carousel.querySelectorAll('[data-lx-slide-dot]').forEach((d,j)=>{d.setAttribute('aria-current',String(j===position))})};show(0);carousel.querySelector('[data-lx-slide-prev]').onclick=()=>show(position-1);carousel.querySelector('[data-lx-slide-next]').onclick=()=>show(position+1);carousel.querySelectorAll('[data-lx-slide-dot]').forEach(d=>d.onclick=()=>show(+d.dataset.lxSlideDot));const start=()=>{if(carousel.dataset.autoplay==='true'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>show(position+1),7000)},stop=()=>{clearInterval(timer);timer=null};carousel.addEventListener('mouseenter',stop);carousel.addEventListener('focusin',stop);carousel.addEventListener('mouseleave',start);carousel.addEventListener('focusout',e=>{if(!carousel.contains(e.relatedTarget))start()});start()}
 $$('[data-music-id],[data-lx-feature-play]').forEach(node=>{const id=node.dataset.musicId||node.dataset.lxFeaturePlay;if(!id)return;const warm=()=>LX.prewarmMusicContent?.(id);node.addEventListener('pointerenter',warm,{once:true});node.addEventListener('touchstart',warm,{once:true,passive:true});node.addEventListener('focusin',warm,{once:true})});
 LX.artwork.hydrate?.($('homeContent'));
 queueMicrotask(()=>LX.syncMusicCardState?.());
}
function musicSetView(view='home'){state.musicView=view;state.category='Início';if(view!=='explore')state.query='';if(view==='home')state.musicGenre='Todos';renderApp()}
function musicSetGenre(genre='Todos'){state.musicGenre=genre||'Todos';state.musicView='explore';state.category='Início';renderApp()}
function renderMusicExperience(){
 const all=musicCatalog(),h=D.history(),firstName=String(state.profile?.name||state.user?.name||'').trim().split(/\s+/)[0]||'você',saved=all.filter(x=>musicSaved(x.id)),recent=[...all].filter(x=>h[x.id]?.opened).sort((x,y)=>(h[y.id]?.opened||0)-(h[x.id]?.opened||0)),active=state.query?'explore':state.category==='Minha Lista'?'library':state.category==='Música'?'explore':state.musicView||'home';
 LX.prewarmMusicCatalog?.(all);
 $('hero').innerHTML='';$('welcome').innerHTML='';
 const side=musicNav(active,all.length,saved.length,recent.length),mobile=`<div class="lx-music-mobile-tabs"><button type="button" data-lx-music-view="home" class="${active==='home'?'active':''}">Início</button><button type="button" data-lx-music-view="explore" class="${active==='explore'?'active':''}">Buscar</button><button type="button" data-lx-music-view="library" class="${['library','liked','recent'].includes(active)?'active':''}">Biblioteca</button></div>`;
 if(!all.length){const load=LX.cloud?.catalogState?.()||'ready',body=load==='idle'||load==='loading'?musicLoading():load==='error'?musicEmpty('Não foi possível carregar este destaque','Tente novamente para atualizar sua Música.','<button class="primary-btn" onclick="LX.retryMusicCatalog()">Tentar novamente</button>'):musicEmpty(state.user?.admin?'Sua biblioteca musical está pronta':'Músicas em breve',state.user?.admin?'Cole links oficiais ou envie seus próprios áudios pelo Painel ADM.':'A biblioteca musical está sendo preparada.',state.user?.admin?'<button class="primary-btn" onclick="LX.openAdmin()">Adicionar música</button>':'');$('homeContent').innerHTML=`<div class="lx-music-app-shell">${side}<main class="lx-music-main lx-music-main-v260">${mobile}${body}</main>${musicDetailRail(all)}</div>`;bindMusicExperience();syncMusicDetailRail();return}

 const categories=musicCategoryList(all),allCategories=musicCategoryList(all,true);
 let visible=[...all];if(active==='liked')visible=saved;else if(active==='recent')visible=recent;else if(active==='library')visible=[...new Map([...saved,...recent].map(x=>[String(x.id),x])).values()];
 if(active==='explore'&&state.query)visible=D.search(visible,state.query);
 if(active==='explore'&&state.musicGenre!=='Todos')visible=visible.filter(x=>musicHasGenre(x,state.musicGenre));
 if(state.musicSort==='title')visible.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'pt-BR'));else if(state.musicSort==='artist')visible.sort((a,b)=>String(a.artist||'').localeCompare(String(b.artist||''),'pt-BR'));else visible.sort((a,b)=>+new Date(b.publishedAt||b.createdAt||0)-+new Date(a.publishedAt||a.createdAt||0));

 const featured=all.find(x=>x.featured)||recent[0]||all[0],provider=musicProvider(featured),newest=[...all].sort((a,b)=>+new Date(b.publishedAt||b.createdAt||0)-+new Date(a.publishedAt||a.createdAt||0)).slice(0,12),recommended=(D.recommendation?.(all,h,D.ratings(),D.preferences()[state.user?.email||'']||{})||all).slice(0,12),top=[...all].sort((a,b)=>(b.trending?1:0)-(a.trending?1:0)||(+b.priority||0)-(+a.priority||0)).slice(0,10),quick=(recent.length?recent:top).slice(0,6);
 const now=`<section id="lxMusicNow" class="lx-music-now hidden"><div id="lxMusicNowCover" class="lx-music-now-cover"></div><div><span>TOCANDO AGORA</span><strong id="lxMusicNowTitle">Música</strong><small id="lxMusicNowArtist">LX Music</small></div><button type="button" id="lxMusicNowToggle" onclick="LX.toggleCurrentMusic()" aria-label="Reproduzir ou pausar">▶</button></section>`;
 let content='';
 if(active==='home'){
  const featuredOnly=musicHighlights(all),hero=musicHomeHero(featuredOnly,firstName),personal=musicPersonalizedHome(all,h),personalHtml=personal.sections.map(s=>musicGridSection(s.title,s.subtitle,s.list)).join('');
  content=`${now}${hero||`<section class="lx-music-top lx-music-home-empty"><div class="lx-music-greeting"><span class="eyebrow">LX MUSIC</span><h1>${greeting()}, ${esc(firstName)}</h1><p>Nenhuma música foi marcada como destaque ainda. Suas recomendações continuam abaixo.</p></div><button type="button" class="primary-btn" data-lx-music-view="explore">Pesquisar músicas</button></section>`}${personalHtml}<section class="lx-music-home-search"><div><span class="eyebrow">CATÁLOGO COMPLETO</span><h2>Quer ouvir outra música?</h2><p>Os destaques são escolhidos pelo ADM. O restante aparece na busca e nas recomendações personalizadas conforme o que cada pessoa ouve.</p></div><button type="button" class="primary-btn" data-lx-music-view="explore">Pesquisar no catálogo</button></section>`;
 }else{
  const categoryTitle=state.musicGenre!=='Todos'&&!state.query?state.musicGenre:null;
  const title=active==='liked'?'Músicas curtidas':active==='recent'?'Tocadas recentemente':active==='library'?'Sua biblioteca':state.query?`Resultados para “${state.query}”`:categoryTitle?categoryTitle:'Buscar músicas';
  const subtitle=active==='liked'?'Tudo o que você salvou em um só lugar.':active==='recent'?'Continue ouvindo de onde parou.':active==='library'?'Seus salvos e reproduções recentes.':categoryTitle?`Todas as músicas encontradas na categoria ${categoryTitle}.`:'Pesquise por música, artista, álbum ou gênero.';
  const genreButtons=['Todos',...allCategories].map(g=>`<button type="button" data-lx-music-genre="${esc(g)}" class="${state.musicGenre===g?'active':''}">${esc(g)}</button>`).join('');
  const browseCards=active==='explore'&&!state.query&&state.musicGenre==='Todos'?`<section class="lx-music-section lx-music-category-section compact"><div class="lx-section-title"><div><h2>Categorias</h2><p>Escolha um gênero para filtrar a biblioteca.</p></div></div><div class="lx-music-category-grid">${categories.map(g=>musicCategoryCard(g,all)).join('')}</div></section>`:'';
  content=`${now}<section class="lx-music-browser-head"><div class="lx-music-browser-copy"><span class="eyebrow">LX MUSIC · ${active==='explore'?'DESCOBRIR':'COLEÇÃO'}</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><form id="lxMusicSearchForm" class="lx-music-search-box"><span>⌕</span><input id="lxMusicSearchInput" value="${esc(state.query)}" placeholder="O que você quer ouvir?" aria-label="Buscar músicas"><button type="button" id="lxMusicSearchClear" class="${state.query?'':'hidden'}" aria-label="Limpar busca">×</button><button type="submit">Buscar</button></form></section>${browseCards}${active==='explore'?`<section class="lx-music-browser-tools"><div class="lx-music-filter-chips">${genreButtons}</div><label>Ordenar<select id="lxMusicSort"><option value="recent" ${state.musicSort==='recent'?'selected':''}>Mais recentes</option><option value="title" ${state.musicSort==='title'?'selected':''}>Título</option><option value="artist" ${state.musicSort==='artist'?'selected':''}>Artista</option></select></label></section>`:''}${visible.length?`<section class="lx-music-section lx-music-results"><div class="lx-section-title"><div><h2>${visible.length} ${visible.length===1?'resultado':'resultados'}</h2><p>${state.musicGenre!=='Todos'?`Categoria: ${esc(state.musicGenre)} · `:''}Toque na capa para reproduzir ou no título para abrir o álbum.</p></div>${active!=='explore'?'<button type="button" class="lx-text-btn" data-lx-music-view="explore">Explorar</button>':''}</div><div class="lx-music-grid">${visible.map(musicAlbumCard).join('')}</div></section>`:musicEmpty(active==='liked'?'Nenhuma música curtida':active==='recent'?'Nada reproduzido ainda':state.query?'Nenhum resultado':'Nenhuma música nesta categoria',active==='liked'?'Use o coração nos álbuns para salvá-los aqui.':active==='recent'?'Reproduza uma música e ela aparecerá nesta área.':'Tente outro título, artista ou gênero.','<button type="button" class="primary-btn" data-lx-music-view="explore">Explorar músicas</button>')}`;
 }
 $('homeContent').innerHTML=`<div class="lx-music-app-shell lx-music-shell-v260">${side}<main class="lx-music-main lx-music-main-spotify lx-music-main-v260">${mobile}${content}</main>${musicDetailRail(all)}</div>`;bindMusicExperience();syncMusicDetailRail();
}
LX.musicSetView=musicSetView;LX.musicSetGenre=musicSetGenre;LX.renderMusicExperience=renderMusicExperience;
let lxMusicSurfaceGuardQueued=false;
function ensureMusicSurface(){
 if(state.screen!=='app'||state.mode!=='Ouvir')return;const root=$('homeContent');if(!root||root.querySelector('.lx-music-app-shell'))return;
 renderMusicExperience();
}
const lxMusicSurfaceObserver=new MutationObserver(()=>{if(lxMusicSurfaceGuardQueued||state.mode!=='Ouvir'||state.screen!=='app')return;lxMusicSurfaceGuardQueued=true;queueMicrotask(()=>{lxMusicSurfaceGuardQueued=false;ensureMusicSurface()})});
window.addEventListener('DOMContentLoaded',()=>{const root=$('homeContent');if(root)lxMusicSurfaceObserver.observe(root,{childList:true})},{once:true});
function bookCard(x){const h=D.history()[x.id]||{},p=Math.round(h.progress||0);return `<button class="lx-book-card" onclick="LX.detail(${x.id})"><span class="lx-book-cover" style="background-image:url('${x.cover||''}')"><i>${p>0&&p<100?p+'%':''}</i></span><strong>${esc(x.title)}</strong><small>${esc(x.author||'LX Books')}</small>${p>0&&p<100?`<span class="lx-book-progress"><i style="width:${p}%"></i></span>`:''}</button>`}
function renderBookExperience(){
 const a=items(),h=D.history();$('hero').innerHTML='';
 if(!a.length){$('welcome').innerHTML='';$('homeContent').innerHTML=`<section class="official-empty lx-mode-empty"><span class="eyebrow">LX READER</span><h2>${state.user?.admin?'Sua estante está pronta':'Livros em breve'}</h2><p>${state.user?.admin?'Envie PDF/EPUB ou cadastre capítulos no ADM.':'A biblioteca está sendo preparada.'}</p>${state.user?.admin?'<button class="primary-btn" onclick="LX.openAdmin()">Adicionar livro</button>':''}</section>`;return}
 const cont=a.filter(x=>h[x.id]?.progress>0&&h[x.id]?.progress<100).sort((x,y)=>(h[y.id]?.opened||0)-(h[x.id]?.opened||0)),featured=cont[0]||a.find(x=>x.featured)||a[0],newest=[...a].sort((x,y)=>+new Date(y.publishedAt||y.createdAt||0)-+new Date(x.publishedAt||x.createdAt||0));
 $('welcome').innerHTML=`<section class="lx-reader-hero"><div class="lx-reader-feature"><div class="lx-reader-feature-cover" style="background-image:url('${featured.cover||''}')"></div><div><span class="eyebrow">LX READER · SUA ESTANTE</span><h1>${esc(featured.title)}</h1><p>${esc(featured.author||'LX Books')} · ${esc(featured.genre||'Livro')}</p><p class="lx-reader-desc">${esc(featured.desc||'')}</p><div class="hero-actions"><button class="primary-btn" onclick="LX.read(${featured.id},${h[featured.id]?.readerChapter||0})">▤ ${h[featured.id]?.progress?'Continuar lendo':'Ler agora'}</button><button class="secondary-btn" onclick="LX.detail(${featured.id})">Detalhes</button></div></div></div></section>`;
 if(state.query||state.category!=='Início'){$('homeContent').innerHTML=`<section class="lx-books-section"><div class="lx-section-title"><div><span class="eyebrow">ESTANTE</span><h2>${state.query?`Resultados para “${esc(state.query)}”`:esc(state.category)}</h2></div><span>${a.length} livros</span></div><div class="lx-books-grid">${a.map(bookCard).join('')}</div></section>`;return}
 let html='';if(cont.length)html+=`<section class="lx-books-section"><div class="lx-section-title"><div><span class="eyebrow">CONTINUE</span><h2>Continuar lendo</h2></div></div><div class="lx-books-grid continue">${cont.slice(0,8).map(bookCard).join('')}</div></section>`;
 html+=`<section class="lx-books-section"><div class="lx-section-title"><div><span class="eyebrow">BIBLIOTECA</span><h2>Descubra sua próxima leitura</h2></div></div><div class="lx-books-grid">${newest.slice(0,14).map(bookCard).join('')}</div></section>`;
 const genres=[...new Set(a.map(x=>x.genre).filter(Boolean))].slice(0,4);genres.forEach(g=>{const group=a.filter(x=>x.genre===g);html+=`<section class="lx-books-section"><div class="lx-section-title"><div><h2>${esc(g)}</h2></div></div><div class="lx-books-grid compact">${group.slice(0,8).map(bookCard).join('')}</div></section>`});$('homeContent').innerHTML=html;
}

function renderHome(){if(state.mode==='Ouvir')return renderMusicExperience();const a=items();if(!a.length){$('homeContent').innerHTML=`<section class="official-empty"><span class="eyebrow">LX PLUS</span><h2>${state.user?.admin?'Catálogo pronto para você organizar':'Novidades em breve'}</h2><p>${state.user?.admin?'A plataforma está limpa. Use o Painel ADM para cadastrar seus conteúdos, capas, banners e lançamentos.':'O catálogo está sendo preparado.'}</p>${state.user?.admin?'<button class="primary-btn" onclick="LX.openAdmin()">Abrir Painel ADM</button>':''}</section>`;return}if(state.query){$('homeContent').innerHTML=rail(`Resultados para “${esc(state.query)}”`,'Busca tolerante a erros por título, elenco, autor, artista, gênero e tags.',a);return}if(state.category!=='Início'){$('homeContent').innerHTML=rail(state.category,'Tudo nesta categoria.',a);return}const h=D.history(),pref=D.preferences()[state.user?.email||'']||{},histEntries=Object.entries(h).filter(([,v])=>v?.opened).sort((a,b)=>(b[1].opened||0)-(a[1].opened||0)),recentId=histEntries[0]?.[0],recent=D.catalog().find(x=>String(x.id)===String(recentId)),cont=a.filter(x=>h[x.id]?.progress>0&&h[x.id]?.progress<98),recs=D.recommendation(a,h,D.ratings(),pref).slice(0,12),because=recent?a.filter(x=>x.id!==recent.id&&(x.genre===recent.genre||x.type===recent.type)&&!h[x.id]).slice(0,10):[],top=[...a].sort((x,y)=>(y.trending?1:0)-(x.trending?1:0)||(+y.priority||0)-(+x.priority||0)).slice(0,10),newest=[...a].sort((x,y)=>(+new Date(y.publishedAt||y.createdAt||0))-(+new Date(x.publishedAt||x.createdAt||0))).slice(0,12);let html='';if(cont.length)html+=rail(state.mode==='Ler'?'Continuar lendo':state.mode==='Ouvir'?'Ouvir novamente':'Continuar assistindo','Retome exatamente do segundo em que parou.',cont,true);if(recs.length){const why=pref.genres?.length?`Preferências: ${pref.genres.slice(0,3).join(', ')}. Também usamos histórico, notas e tags.`:'Baseado no seu histórico, avaliações, gêneros e tags. Você pode ajustar isso no Perfil.';html+=rail('Recomendado para você',why,recs)}if(because.length)html+=rail(`Porque você ${recent.type==='Livro'?'leu':recent.type==='Música'?'ouviu':'assistiu'} ${esc(recent.title)}`,'Uma seleção relacionada ao seu histórico recente.',because);html+=rail('Top 10 LX','Os títulos mais fortes neste momento.',top,false,true);html+=rail('Em alta','O que está chamando atenção.',a.filter(x=>x.trending));html+=rail('Lançados recentemente','As novidades mais recentes da plataforma.',newest);[...new Set(a.map(x=>x.genre))].slice(0,5).forEach(g=>html+=rail(g,`Seleção em ${g.toLowerCase()}.`,a.filter(x=>x.genre===g)));$('homeContent').innerHTML=html}
function renderApp(){$('app')?.classList.toggle('lx-music-mode',state.mode==='Ouvir');renderCategories();LX.syncMobileNavState?.();if(state.mode==='Ao vivo')LX.contentHub?.renderLive?.();else if(state.mode==='Assistir'&&state.category==='Catálogo Online')LX.contentHub?.renderWatch?.();else if(state.mode==='Ler'&&state.category==='Biblioteca Pública')LX.contentHub?.renderBooks?.();else if(state.mode==='Ouvir')renderMusicExperience();else if(state.mode==='Ler')renderBookExperience();else{renderHero();renderWelcome();renderHome()}updateNoticeCount();try{LX.syncPremiumShell?.()}catch(e){console.warn('LX premium shell sync',e)}const adm=$('adminTopBtn');if(adm)adm.classList.toggle('hidden',!state.user?.admin)}
function scroll(id,d){const e=$(id);e?.scrollBy({left:d*e.clientWidth*.82,behavior:'smooth'})}
function close(){$('overlay').classList.add('hidden')}function closePlayer(){if(LX.stopMiniPlayer)LX.stopMiniPlayer(true);else{$('playerOverlay').classList.add('hidden');$('videoEl')?.pause()}}function closeReader(){$('readerOverlay').classList.add('hidden')}
function updateNoticeCount(){const system=D.notices().filter(x=>!x.read).length,chat=Number(LX.chat?.unreadTotal?.()||0),cloud=Number(LX.chat?.cloudUnread?.()||0),community=Math.max(chat,cloud),c=system+community;const el=$('notifyCount');if(el){el.textContent=c>99?'99+':String(c);el.style.display=c?'grid':'none'}try{if('setAppBadge'in navigator)c?navigator.setAppBadge(c):navigator.clearAppBadge?.()}catch{}}
LX.ui={$, $$, state, esc, show, toast, initials, posterWalls, authTab, renderProfiles, renderApp, renderHome, renderCategories, items, close, closePlayer, closeReader, scroll, updateNoticeCount};
})();

window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['ui']='27.0';

/* ===== catalog-importer.js · LX Plus v25.36 ===== */
(()=>{
  const LX=window.LX;
  const U=()=>LX.ui;
  const D=()=>LX.data;
  const esc=s=>U()?.esc?U().esc(String(s??'')):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const LS_KEY='lxplus_tmdb_key_v1';
  const state={source:'tmdb-movie',results:[],busy:false};
  const tmdbBase='https://api.themoviedb.org/3';
  const img=(p,size='w780')=>p?`https://image.tmdb.org/t/p/${size}${p}`:'';
  const id=()=>Date.now()+Math.floor(Math.random()*900);
  const key=()=>{try{return localStorage.getItem(LS_KEY)||''}catch{return''}};
  const toast=t=>LX.toast?.(t);

  async function json(url,opt={}){
    const r=await fetch(url,opt);
    if(!r.ok){const e=new Error(`HTTP ${r.status}`);e.status=r.status;throw e}
    return r.json();
  }
  function tmdbUrl(path,params={}){
    const k=key(); if(!k) throw new Error('TMDB_KEY_REQUIRED');
    const u=new URL(tmdbBase+path);
    u.searchParams.set('api_key',k);
    u.searchParams.set('language','pt-BR');
    Object.entries(params).forEach(([a,b])=>b!==undefined&&b!==null&&b!==''&&u.searchParams.set(a,b));
    return u.toString();
  }
  async function searchTMDB(kind,q){
    const data=await json(tmdbUrl(`/search/${kind}`,{query:q,include_adult:false,page:1,region:'BR'}));
    return (data.results||[]).slice(0,20).map(x=>({
      provider:'TMDB',source:kind,remoteId:x.id,title:x.title||x.name||'',year:(x.release_date||x.first_air_date||'').slice(0,4),
      desc:x.overview||'',cover:img(x.poster_path,'w500'),banner:img(x.backdrop_path,'w1280'),popularity:x.popularity||0,rating:x.vote_average||0
    }));
  }
  async function searchBooks(q){
    const u=new URL('https://openlibrary.org/search.json');
    u.searchParams.set('q',q);u.searchParams.set('limit','20');
    u.searchParams.set('fields','key,title,author_name,first_publish_year,cover_i,isbn,subject,edition_count');
    const d=await json(u);
    return (d.docs||[]).map(x=>({provider:'Open Library',source:'book',remoteId:x.key,title:x.title||'',author:(x.author_name||[])[0]||'',year:x.first_publish_year||'',genre:(x.subject||[]).slice(0,3).join(' · '),cover:x.cover_i?`https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg`:'',externalUrl:x.key?`https://openlibrary.org${x.key}`:'',isbn:(x.isbn||[])[0]||'',desc:`${(x.author_name||[])[0]||'Autor não informado'} · ${x.edition_count||1} edição(ões)`}));
  }
  async function searchMusic(q){
    const u=new URL('https://itunes.apple.com/search');
    u.searchParams.set('term',q);u.searchParams.set('country','BR');u.searchParams.set('media','music');u.searchParams.set('entity','song');u.searchParams.set('limit','20');
    const d=await json(u);
    return (d.results||[]).map(x=>({provider:'Apple Music / iTunes',source:'music',remoteId:x.trackId,title:x.trackName||'',artist:x.artistName||'',album:x.collectionName||'',year:(x.releaseDate||'').slice(0,4),genre:x.primaryGenreName||'',cover:(x.artworkUrl100||'').replace('100x100bb','600x600bb'),externalUrl:x.trackViewUrl||x.collectionViewUrl||'',duration:Math.round((x.trackTimeMillis||0)/1000),previewUrl:x.previewUrl||'',desc:`${x.artistName||''}${x.collectionName?' · '+x.collectionName:''}`}));
  }
  async function runSearch(){
    const q=document.getElementById('importSearch')?.value?.trim();if(!q)return toast('Digite algo para pesquisar.');
    const box=document.getElementById('importResults');if(!box)return;
    state.busy=true;box.innerHTML='<div class="import-loading">Buscando catálogo…</div>';
    try{
      if(state.source==='tmdb-movie')state.results=await searchTMDB('movie',q);
      else if(state.source==='tmdb-tv')state.results=await searchTMDB('tv',q);
      else if(state.source==='book')state.results=await searchBooks(q);
      else state.results=await searchMusic(q);
      renderResults();
    }catch(e){
      console.warn(e);box.innerHTML=`<div class="import-error"><strong>Não foi possível buscar.</strong><p>${e.message==='TMDB_KEY_REQUIRED'?'Salve sua chave TMDB primeiro.':'Verifique a conexão e tente novamente.'}</p></div>`;
    }finally{state.busy=false}
  }
  function resultCard(x,i){
    const type=x.source==='movie'?'Filme':x.source==='tv'?'Série':x.source==='book'?'Livro':'Música';
    return `<article class="import-card"><div class="import-cover" style="background-image:url('${esc(x.cover||x.banner||'')}')"><span>${esc(type)}</span></div><div class="import-info"><small>${esc(x.provider)}${x.year?' · '+esc(x.year):''}</small><h3>${esc(x.title)}</h3><p>${esc(x.artist||x.author||x.genre||x.desc||'')}</p><div class="import-actions"><button class="primary-btn" data-import-one="${i}">＋ Importar</button>${x.externalUrl?`<a href="${esc(x.externalUrl)}" target="_blank" rel="noopener">Fonte ↗</a>`:''}</div></div></article>`;
  }
  function renderResults(){const box=document.getElementById('importResults');if(box)box.innerHTML=state.results.length?state.results.map(resultCard).join(''):'<div class="import-empty">Nenhum resultado encontrado.</div>';bindResultButtons()}
  function bindResultButtons(){document.querySelectorAll('[data-import-one]').forEach(b=>b.onclick=()=>importOne(state.results[+b.dataset.importOne],b))}

  async function tmdbDetails(x){
    const path=x.source==='movie'?`/movie/${x.remoteId}`:`/tv/${x.remoteId}`;
    const d=await json(tmdbUrl(path,{append_to_response:'credits'}));
    const cast=(d.credits?.cast||[]).slice(0,10).map(a=>a.name);
    const creators=x.source==='movie'?(d.credits?.crew||[]).filter(a=>a.job==='Director').slice(0,3).map(a=>a.name):(d.created_by||[]).map(a=>a.name);
    return {...x,desc:d.overview||x.desc,genre:(d.genres||[]).map(g=>g.name).join(' · '),year:String((d.release_date||d.first_air_date||x.year||'')).slice(0,4),duration:d.runtime||(d.episode_run_time||[])[0]||'',cast,creator:creators.join(', '),cover:img(d.poster_path,'w780')||x.cover,banner:img(d.backdrop_path,'original')||x.banner,seasonsMeta:(d.seasons||[]).filter(s=>s.season_number>0).map(s=>({season:s.season_number,title:s.name,episodes:s.episode_count,cover:img(s.poster_path,'w500')}))};
  }
  async function toCatalog(x){
    if(x.source==='movie'||x.source==='tv'){
      const z=await tmdbDetails(x),type=x.source==='movie'?'Filme':'Série';
      return {id:id(),type,title:z.title,desc:z.desc||'Sinopse não informada.',year:+z.year||new Date().getFullYear(),genre:z.genre||'Sem gênero',cover:z.cover||'',banner:z.banner||z.cover||'',rating:z.rating?String(Math.round(z.rating*10)/10):'',duration:z.duration?String(z.duration):'',cast:z.cast||[],director:type==='Filme'?z.creator:'',creator:type==='Série'?z.creator:'',episodes:[],seasonsMeta:z.seasonsMeta||[],tmdbId:z.remoteId,metadataProvider:'TMDB',metadataUrl:`https://www.themoviedb.org/${x.source==='movie'?'movie':'tv'}/${z.remoteId}`,published:false,featured:false,trending:false,newRelease:false,priority:0,createdAt:new Date().toISOString(),importedAt:new Date().toISOString()};
    }
    if(x.source==='book')return {id:id(),type:'Livro',title:x.title,desc:x.desc||'Livro importado da Open Library.',year:+x.year||'',genre:x.genre||'Livro',author:x.author||'',cover:x.cover||'',banner:x.cover||'',isbn:x.isbn||'',externalReadUrl:x.externalUrl||'',metadataProvider:'Open Library',metadataUrl:x.externalUrl||'',published:false,featured:false,priority:0,createdAt:new Date().toISOString(),importedAt:new Date().toISOString(),chapters:[]};
    return {id:id(),type:'Música',title:x.title,desc:x.desc||'',year:+x.year||'',genre:x.genre||'Música',artist:x.artist||'',album:x.album||'',cover:x.cover||'',banner:x.cover||'',duration:x.duration||0,previewUrl:x.previewUrl||'',externalMusicUrl:x.externalUrl||'',metadataProvider:'Apple Music / iTunes',metadataUrl:x.externalUrl||'',published:false,featured:false,priority:0,createdAt:new Date().toISOString(),importedAt:new Date().toISOString(),tracks:[]};
  }
  async function importOne(x,btn){if(!x)return;const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Importando…'}try{const y=await toCatalog(x);await D().saveCatalogItem(y);toast(`${y.title} importado como rascunho.`);if(btn)btn.textContent='✓ Importado'}catch(e){console.warn(e);toast('Falha ao importar para a nuvem.');if(btn){btn.disabled=false;btn.textContent=old}}}

  async function importPopular(){
    if(!key())return toast('Salve sua chave TMDB primeiro.');
    const btn=document.getElementById('importPopular');if(btn){btn.disabled=true;btn.textContent='Importando populares…'}
    try{
      const d=await json(tmdbUrl('/trending/all/week',{page:1}));
      const a=(d.results||[]).filter(x=>['movie','tv'].includes(x.media_type)).slice(0,12);
      let ok=0;
      for(const r of a){
        const x={provider:'TMDB',source:r.media_type,remoteId:r.id,title:r.title||r.name||'',year:(r.release_date||r.first_air_date||'').slice(0,4),desc:r.overview||'',cover:img(r.poster_path,'w500'),banner:img(r.backdrop_path,'w1280'),rating:r.vote_average||0};
        const exists=D().catalog().some(c=>c.tmdbId===r.id);
        if(exists)continue;
        try{await D().saveCatalogItem(await toCatalog(x));ok++}catch(e){console.warn(e)}
      }
      toast(`${ok} títulos populares importados como rascunho.`);LX.admin?.render?.('library');
    }finally{if(btn){btn.disabled=false;btn.textContent='⚡ Importar populares da semana'}}
  }

  function ytVideoIdFromRef(value){
    const raw=String(value||'').trim();let m=raw.match(/^youtube:([A-Za-z0-9_-]{11})$/i);if(m)return m[1];m=raw.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/i);return m?.[1]||'';
  }
  function cleanYoutubeTitle(value){
    return String(value||'').replace(/\s*[\[(][^\])]*(?:official\s*(?:music\s*)?(?:video|audio)|music\s*video|lyrics?|lyric\s*video|clipe\s*oficial|visualizer|video\s*oficial)[^\])]*[\])]/gi,'').replace(/\s{2,}/g,' ').trim();
  }
  function cleanYoutubeArtist(value){return String(value||'').replace(/\s+-\s+Topic$/i,'').replace(/VEVO$/i,'').trim()}
  function youtubeMusicParts(row){
    let title=cleanYoutubeTitle(row?.title||'Música do YouTube'),artist=cleanYoutubeArtist(row?.channelTitle||'');
    const split=title.match(/^(.{1,90}?)\s+[\-–—]\s+(.{1,160})$/);
    if(split){const left=cleanYoutubeArtist(split[1]),right=cleanYoutubeTitle(split[2]);if(left&&right){artist=left;title=right}}
    return {title:title||'Música do YouTube',artist:artist||'YouTube'};
  }
  function musicFingerprint(title,artist){
    const scrub=value=>D().normalize(String(value||'').replace(/\b(?:official|video|audio|lyrics?|clipe|visualizer|hd|4k)\b/gi,' ').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim());
    return `${scrub(title)}|${scrub(artist)}`;
  }
  function youtubeIdOfCatalog(item){
    const refs=[item?.youtubeVideoId,item?.mediaKey,item?.metadataUrl,item?.externalMusicUrl,...(item?.tracks||[]).flatMap(t=>[t?.mediaKey,t?.url])];
    for(const ref of refs){const key=ytVideoIdFromRef(ref);if(key)return key}return '';
  }
  function youtubeCatalogItem(row,category,remote=null){
    const parts=youtubeMusicParts(row),videoId=String(row?.videoId||''),when=new Date().toISOString(),publishedYear=String(row?.publishedAt||'').slice(0,4),mediaKey=`youtube:${videoId}`,meta=remote||{},title=parts.title,artist=parts.artist,album=meta.album||'YouTube',year=String(meta.year||publishedYear||''),genreMeta=String(meta.genre||'').trim(),genres=[...new Set([category,genreMeta].filter(Boolean))],cover=String(row?.thumbnail||`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`),duration=Number(row?.duration||meta.duration||0),desc=`${title} — ${artist}. Reprodução via YouTube.${album&&album!=='YouTube'?` Álbum: ${album}.`:''}`;
    return {id:id(),type:'Música',title,desc,year:+year||new Date().getFullYear(),genre:category,genres,artist,album,cover,banner:cover,duration,mediaKey,tracks:[{number:1,title,artist,duration,cover,mediaKey,qualityMode:'external'}],youtubeVideoId:videoId,youtubeThumbnail:cover,externalMusicUrl:`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,metadataProvider:remote?'YouTube + catálogo verificado':'YouTube',metadataUrl:`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,musicRemoteId:meta.remoteId||'',published:true,publishedAt:when,featured:false,trending:false,newRelease:false,priority:0,createdAt:when,importedAt:when};
  }
  async function youtubeMetadataBatch(rows){
    const client=LX.cloud?.db?.(),map=new Map();if(!client||!rows?.length)return map;
    for(let i=0;i<rows.length;i+=25){const part=rows.slice(i,i+25),items=part.map(row=>{const p=youtubeMusicParts(row);return {name:`${p.artist?`${p.artist} - `:''}${p.title}.mp3`,type:'music'}});try{const {data,error}=await client.functions.invoke('lx-universal-importer',{body:{action:'catalog_match_batch',items,type:'music'}});if(error||data?.error)throw error||new Error(data.error);(data?.items||[]).forEach((x,j)=>{if(x?.match&&x?.status==='matched'&&Number(x?.confidence||0)>=.88)map.set(String(part[j]?.videoId||''),{...x.match,confidence:Number(x.confidence||0)})})}catch(e){console.warn('LX YouTube metadata batch',e)}}return map;
  }
  async function youtubeBrowserFallback(source){
    const tokens=String(source||'').split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);if(!tokens.length)throw new Error('Cole um ou mais links do YouTube.');
    const items=[];
    for(const token of tokens){
      const videoId=ytVideoIdFromRef(token);if(!videoId)throw new Error('Para playlist ou canal inteiro, a conexão com o importador do YouTube precisa estar ativa. Links individuais continuam funcionando.');
      const externalUrl=`https://www.youtube.com/watch?v=${videoId}`;
      let title='Música do YouTube',channelTitle='YouTube',thumbnail=`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      try{const r=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(externalUrl)}&format=json`,{mode:'cors',credentials:'omit'});if(r.ok){const d=await r.json();title=d?.title||title;channelTitle=d?.author_name||channelTitle;thumbnail=d?.thumbnail_url||thumbnail}}catch(e){console.warn('LX YouTube oEmbed fallback',e)}
      items.push({videoId,title,channelTitle,publishedAt:'',duration:0,thumbnail});
    }
    return {items,found:items.length,truncated:false,maxItems:500,source:'YouTube',metadataMode:'browser-oembed',fallback:true};
  }
  async function youtubeInvoke(source){
    const client=LX.cloud?.db?.();if(!client)throw new Error('Entre na LX Plus e conecte a nuvem para importar do YouTube.');
    let data,error;
    try{({data,error}=await client.functions.invoke('lx-content-hub',{body:{action:'youtube_bulk',source,maxItems:500}}))}catch(invokeError){error=invokeError}
    if(error){
      let message=error.message||'Falha ao consultar o YouTube.';try{const payload=await error.context?.json?.();if(payload?.message||payload?.error)message=payload.message||payload.error}catch{}
      try{return await youtubeBrowserFallback(source)}catch(fallbackError){throw new Error((message&&message!=='Failed to send a request to the Edge Function')?message:(fallbackError?.message||message))}
    }
    if(data?.error){const map={YOUTUBE_NOT_CONFIGURED:'A YouTube Data API Key ainda não foi configurada pelo Dono no painel ADM.',YOUTUBE_SOURCE_REQUIRED:'Cole uma playlist, canal ou links do YouTube.',YOUTUBE_LINK_INVALID:`Não reconheci este link: ${data.message||''}`,YOUTUBE_CHANNEL_NOT_FOUND:'Não foi possível localizar os vídeos desse canal.',YOUTUBE_API_KEY_REQUIRED_FOR_PLAYLIST:'Links individuais funcionam sem chave. Para playlist inteira, configure a YouTube API Key.',YOUTUBE_API_KEY_REQUIRED_FOR_CHANNEL:'Links individuais funcionam sem chave. Para canal inteiro, configure a YouTube API Key.',AUTH_REQUIRED:'Sua sessão do ADM expirou. Entre novamente.',ADMIN_REQUIRED:'Seu cargo não possui acesso ao importador.'};throw new Error(data.message||map[data.error]||data.error)}return data;
  }
  async function saveYoutubeBatch(items){
    if(!items.length)return 0;
    if(LX.cloud?.enabled?.()&&LX.cloud?.bulkUpsertCatalogItems)return LX.cloud.bulkUpsertCatalogItems(items);
    let saved=0;for(const item of items){await D().saveCatalogItem(item);saved++}return saved;
  }
  function setYoutubeBulkStatus(html,stateName=''){const box=document.getElementById('youtubeBulkStatus');if(!box)return;box.className=`youtube-bulk-status ${stateName}`.trim();box.innerHTML=html}
  async function importYoutubeBulk(){
    const source=document.getElementById('youtubeBulkSource')?.value?.trim()||'',category=document.getElementById('youtubeBulkCategory')?.value||'Outra',btn=document.getElementById('youtubeBulkSave');
    if(!source)return toast('Cole uma playlist, canal ou links do YouTube.');
    if(!['Gospel','Outra'].includes(category))return toast('Escolha Gospel ou Outra.');
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Buscando músicas…'}setYoutubeBulkStatus('<b>Consultando o YouTube…</b><span>O LX Plus vai comparar tudo com o catálogo antes de salvar.</span>','loading');
    try{
      const out=await youtubeInvoke(source),rows=out.items||[];if(btn)btn.textContent='Buscando capas e metadados…';setYoutubeBulkStatus(`<b>Identificando ${rows.length} músicas…</b><span>Buscando faixa, artista, álbum, capa, ano e gênero antes de salvar.</span>`,'loading');const metaMap=await youtubeMetadataBatch(rows),existing=D().catalog().filter(x=>x.type==='Música'),ids=new Set(existing.map(youtubeIdOfCatalog).filter(Boolean)),fps=new Set(existing.map(x=>musicFingerprint(x.title,x.artist)).filter(x=>x!=='|')),batchIds=new Set(),batchFps=new Set(),fresh=[];let duplicates=0,enriched=0;
      for(const row of rows){
        const remote=metaMap.get(String(row.videoId||''))||null,item=youtubeCatalogItem(row,category,remote),videoId=item.youtubeVideoId,fp=musicFingerprint(item.title,item.artist);if(remote)enriched++;
        if((videoId&&(ids.has(videoId)||batchIds.has(videoId)))||(fp&&fp!=='|'&&(fps.has(fp)||batchFps.has(fp)))){duplicates++;continue}
        fresh.push(item);if(videoId)batchIds.add(videoId);if(fp&&fp!=='|')batchFps.add(fp);
      }
      if(btn)btn.textContent=fresh.length?'Salvando novas…':'Nada novo';
      const saved=await saveYoutubeBatch(fresh),found=Number(out.found||(out.items||[]).length),truncated=out.truncated?'<small>Esta origem passou de 500 vídeos; foram analisados os primeiros 500 nesta importação.</small>':'';
      setYoutubeBulkStatus(`<b>${saved} ${saved===1?'música nova salva':'músicas novas salvas'}.</b><span>${found} encontradas · ${enriched} com metadados/capa enriquecidos · ${duplicates} repetidas ignoradas · categoria: ${esc(category)}.</span>${truncated}`,'ok');
      toast(saved?`${saved} músicas novas adicionadas. ${duplicates} repetidas foram ignoradas.`:`Nenhuma música nova. ${duplicates||found} já estavam no catálogo.`);
      if(saved)LX.ui?.renderApp?.();
    }catch(e){console.warn(e);setYoutubeBulkStatus(`<b>Não foi possível concluir.</b><span>${esc(e.message||'Verifique a integração do YouTube e tente novamente.')}</span>`,'error');toast(e.message||'Falha na importação em massa.')}finally{if(btn){btn.disabled=false;btn.textContent=old||'Salvar músicas novas'}}
  }

  function render(m){
    m.innerHTML=`<div class="admin-head"><div><span class="eyebrow">LX ADMIN</span><h1>Importador de catálogo</h1><p>Pesquise metadados oficiais e monte o catálogo sem preencher capa, sinopse e ficha técnica manualmente.</p></div></div>
    <section class="import-hero"><div><span class="eyebrow">LX CATALOG IMPORTER</span><h2>Catálogo rápido, mídia sob seu controle.</h2><p>Filmes e séries chegam como rascunho com capa, banner e ficha técnica. Livros e músicas também podem receber metadados e arte automaticamente.</p></div><div class="import-badges"><span>🎬 TMDB</span><span>📚 Open Library</span><span>♫ Music metadata</span></div></section>
    <section class="admin-card youtube-bulk-card"><div class="youtube-bulk-head"><div><span class="eyebrow">YOUTUBE · IMPORTAÇÃO EM MASSA</span><h2>Adicionar muitas músicas de uma vez</h2><p>Cole uma playlist, um canal ou vários links de vídeos (um por linha). O LX Plus remove repetidas e tenta preencher automaticamente faixa, artista, álbum, capa, ano, gênero e duração antes de salvar.</p></div><span>AUTO DEDUP</span></div><div class="youtube-bulk-grid"><label class="field youtube-bulk-source"><span>Playlist, canal ou links do YouTube</span><textarea id="youtubeBulkSource" rows="4" placeholder="https://www.youtube.com/playlist?list=...&#10;ou https://www.youtube.com/@canal&#10;ou vários links, um por linha"></textarea><small>Até 500 vídeos por importação. Músicas repetidas pelo link/ID ou por título + artista são ignoradas.</small></label><label class="field youtube-bulk-category"><span>Categoria das músicas</span><select id="youtubeBulkCategory"><option value="Gospel">Gospel</option><option value="Outra">Outra</option></select><small>Essa é a única classificação necessária na importação em massa.</small></label></div><div class="youtube-bulk-actions"><button id="youtubeBulkSave" class="primary-btn" type="button">Salvar músicas novas</button><span>As novas músicas entram publicadas usando o player oficial do YouTube, com capa e metadados preenchidos automaticamente quando houver correspondência.</span></div><div id="youtubeBulkStatus" class="youtube-bulk-status"><b>Pronto para importar.</b><span>Cole os links, escolha Gospel ou Outra e clique em Salvar músicas novas.</span></div></section>
    <div class="admin-grid"><section class="admin-card"><h2>Fonte</h2><div class="import-source-tabs"><button data-source="tmdb-movie">Filmes</button><button data-source="tmdb-tv">Séries</button><button data-source="book">Livros</button><button data-source="music">Músicas</button></div><div class="import-search-row"><input id="importSearch" placeholder="Ex.: Vingadores, Breaking Bad, Dom Casmurro, artista…"><button id="importGo" class="primary-btn">Buscar</button></div><small style="color:var(--muted)">Tudo importado entra como rascunho, salvo livros gratuitos que você decidir publicar.</small></section>
    <section class="admin-card"><h2>Fontes online</h2><label class="field">TMDB API Key v3<input id="tmdbKey" type="password" placeholder="Cole sua API Key do TMDB" value="${esc(key())}"></label><label class="field">YouTube Data API Key<input id="youtubeApiKey" type="password" autocomplete="new-password" placeholder="Cole a API Key do YouTube"></label><label class="field">TheSportsDB Key <span class="optional">opcional</span><input id="sportsKey" type="password" placeholder="Deixe vazio para usar o plano gratuito"></label><div class="import-key-actions"><button id="saveTmdb">Salvar TMDB + ativar catálogo online</button><button id="saveYoutube">Salvar YouTube API</button><button id="saveSports">Salvar chave esportiva</button><button id="importPopular" class="primary-btn">⚡ Importar populares da semana</button></div><div id="integrationStatus" class="import-key-status">Verificando integrações…</div><small style="color:var(--muted)">As chaves online são guardadas na tabela protegida do Supabase e usadas pelas Edge Functions. A chave do YouTube não fica exposta no site público.</small></section></div>
    <div class="import-notice"><b>Importante:</b> TMDB/Open Library/música fornecem metadados e capas. Filmes, episódios e áudio completo continuam dependendo de arquivo próprio/licenciado.</div>
    <section id="importResults" class="import-results"><div class="import-empty">Escolha uma fonte e pesquise acima.</div></section>`;
    document.querySelectorAll('[data-source]').forEach(b=>{b.classList.toggle('active',b.dataset.source===state.source);b.onclick=()=>{state.source=b.dataset.source;document.querySelectorAll('[data-source]').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('importSearch').focus()}});
    document.getElementById('importGo').onclick=runSearch;document.getElementById('importSearch').onkeydown=e=>{if(e.key==='Enter')runSearch()};
    document.getElementById('saveTmdb').onclick=async()=>{const v=document.getElementById('tmdbKey').value.trim();try{if(v)localStorage.setItem(LS_KEY,v);else localStorage.removeItem(LS_KEY)}catch{};try{const c=LX.cloud?.db?.();if(!c)throw new Error('Nuvem indisponível');const {error}=await c.rpc('lx_admin_set_integration_secret',{p_key:'tmdb_v3',p_value:v});if(error)throw error;toast(v?'TMDB ativado com segurança na nuvem.':'TMDB removido da nuvem.');await refreshIntegrationStatus()}catch(e){console.warn(e);toast('Não foi possível salvar a integração no Supabase.')}};
    document.getElementById('saveYoutube').onclick=async()=>{const v=document.getElementById('youtubeApiKey').value.trim();if(!v)return toast('Cole a YouTube Data API Key.');try{const c=LX.cloud?.db?.();if(!c)throw new Error('Nuvem indisponível');const {error}=await c.rpc('lx_admin_set_integration_secret',{p_key:'youtube_api_key',p_value:v});if(error)throw error;document.getElementById('youtubeApiKey').value='';toast('YouTube API conectada com segurança.');await refreshIntegrationStatus()}catch(e){console.warn(e);toast(/owner required/i.test(e.message||'')?'Somente o Dono pode salvar a chave do YouTube.':'Não foi possível salvar a integração do YouTube.')}};
    document.getElementById('saveSports').onclick=async()=>{const v=document.getElementById('sportsKey').value.trim();try{const c=LX.cloud?.db?.();if(!c)throw new Error('Nuvem indisponível');const {error}=await c.rpc('lx_admin_set_integration_secret',{p_key:'thesportsdb_key',p_value:v});if(error)throw error;toast(v?'Chave esportiva salva.':'Plano gratuito de esportes ativado.');document.getElementById('sportsKey').value='';await refreshIntegrationStatus()}catch(e){console.warn(e);toast('Não foi possível salvar a chave esportiva.')}};
    async function refreshIntegrationStatus(){const el=document.getElementById('integrationStatus');if(!el)return;try{const c=LX.cloud?.db?.();const {data,error}=await c.rpc('lx_integration_status');if(error)throw error;const keys=new Set((data||[]).map(x=>x.key));el.innerHTML=`<span class="${keys.has('tmdb_v3')?'ok':'warn'}">TMDB ${keys.has('tmdb_v3')?'✓ configurado':'! pendente'}</span><span class="${keys.has('youtube_api_key')?'ok':'warn'}">YouTube ${keys.has('youtube_api_key')?'✓ configurado':'! pendente'}</span><span class="${keys.has('thesportsdb_key')?'ok':''}">Esportes ${keys.has('thesportsdb_key')?'Premium/API própria':'Free API'}</span>`}catch{el.textContent='Não foi possível verificar as integrações.'}}
    refreshIntegrationStatus();
    document.getElementById('importPopular').onclick=importPopular;document.getElementById('youtubeBulkSave').onclick=importYoutubeBulk;
  }
  LX.importer={render,search:runSearch,importPopular,importYoutubeBulk,toCatalog};
})();

window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['catalog-importer']='25.35';

/* ===== content-hub.js · LX Plus v25.36 ===== */
(()=>{
 const LX=window.LX,U=LX.ui,D=LX.data,$=U.$,esc=U.esc,state=U.state;
 const cache={watch:{movie:[],tv:[]},books:[],music:[],sports:[]};
 const invoke=async(action,payload={})=>{
   const c=LX.cloud?.db?.();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');
   const {data,error}=await c.functions.invoke('lx-content-hub',{body:{action,...payload}});
   if(error){let code='EDGE_FUNCTION_ERROR';try{const j=await error.context?.json?.();if(j?.error)code=j.error}catch{}const e=new Error(code);e.code=code;throw e}if(data?.error){const e=new Error(data.error);e.code=data.error;throw e}return data||{};
 };
 const clear=()=>{$('hero').innerHTML='';$('welcome').innerHTML=''};
 const loading=(title='Carregando…')=>{clear();$('homeContent').innerHTML=`<section class="hub-shell"><div class="hub-head"><span class="eyebrow">LX ONLINE</span><h1>${esc(title)}</h1><p>Buscando fontes oficiais e catálogos autorizados.</p></div><div class="hub-loading"><i></i><span>Conectando…</span></div></section>`};
 const errorBox=(title,msg,adminHint='')=>{clear();$('homeContent').innerHTML=`<section class="hub-shell"><div class="hub-head"><span class="eyebrow">LX ONLINE</span><h1>${esc(title)}</h1><p>${esc(msg)}</p>${state.user?.admin&&adminHint?`<button class="primary-btn" onclick="LX.openAdmin();setTimeout(()=>LX.admin.render('importer'),0)">Configurar no ADM</button>`:''}</div></section>`};
 const localTmdb=id=>D.catalog().find(x=>String(x.tmdbId)===String(id));
 const card=x=>`<button class="hub-poster-card" onclick="LX.contentHub.openWatch('${x.source}',${Number(x.remoteId)})"><span style="background-image:url('${x.cover||x.banner||''}')"><i>ⓘ</i></span><strong>${esc(x.title)}</strong><small>${esc(x.year||'')} ${x.rating?`· ★ ${Number(x.rating).toFixed(1)}`:''}</small></button>`;
 async function renderWatch(){
   loading('Catálogo Online');
   try{
     const [m,t]=await Promise.all([invoke('tmdb_trending',{type:'movie'}),invoke('tmdb_trending',{type:'tv'})]);
     cache.watch.movie=m.items||[];cache.watch.tv=t.items||[];
     clear();$('welcome').innerHTML=`<section class="hub-hero"><div><span class="eyebrow">LX OPEN CATALOG · TMDB</span><h1>Descubra praticamente qualquer filme ou série.</h1><p>Capas, sinopses e disponibilidade oficial aparecem sem encher seu banco de dados. Se o vídeo estiver na LX, o botão Assistir aparece automaticamente.</p><div class="hub-search"><input id="hubWatchSearch" placeholder="Pesquisar filme ou série…"><select id="hubWatchType"><option value="movie">Filmes</option><option value="tv">Séries</option></select><button id="hubWatchGo" class="primary-btn">Buscar</button></div></div></section>`;
     $('homeContent').innerHTML=`<section class="hub-section"><div class="lx-section-title"><div><span class="eyebrow">EM ALTA</span><h2>Filmes</h2></div><small>Metadados: TMDB</small></div><div class="hub-poster-grid">${cache.watch.movie.map(card).join('')}</div></section><section class="hub-section"><div class="lx-section-title"><div><span class="eyebrow">EM ALTA</span><h2>Séries</h2></div></div><div class="hub-poster-grid">${cache.watch.tv.map(card).join('')}</div></section><div class="hub-attribution">Disponibilidade de streaming quando exibida: dados do JustWatch via TMDB.</div>`;
     $('hubWatchGo').onclick=searchWatch;$('hubWatchSearch').onkeydown=e=>{if(e.key==='Enter')searchWatch()};
   }catch(e){console.warn(e);if(e.code==='TMDB_NOT_CONFIGURED'||String(e.message).includes('TMDB_NOT_CONFIGURED'))errorBox('Catálogo Online','O módulo está pronto, mas falta configurar uma API Key do TMDB.','tmdb');else errorBox('Catálogo Online','Não foi possível carregar o catálogo agora.')}
 }
 async function searchWatch(){
   const q=$('hubWatchSearch')?.value?.trim(),type=$('hubWatchType')?.value||'movie';if(!q)return LX.toast('Digite um título.');
   const box=$('homeContent');box.innerHTML='<section class="hub-section"><div class="hub-loading"><i></i><span>Pesquisando…</span></div></section>';
   try{const d=await invoke('tmdb_search',{type,q});box.innerHTML=`<section class="hub-section"><div class="lx-section-title"><div><span class="eyebrow">RESULTADOS</span><h2>${esc(q)}</h2></div><button class="lx-text-btn" onclick="LX.contentHub.renderWatch()">Voltar</button></div><div class="hub-poster-grid">${(d.items||[]).map(card).join('')||'<div class="notice">Nenhum resultado.</div>'}</div></section>`}catch(e){LX.toast('Falha ao pesquisar no catálogo online.')}
 }
 const providerRows=(watch={})=>{
   const all=[['Assinatura',watch.flatrate],['Grátis',watch.free],['Com anúncios',watch.ads],['Aluguel',watch.rent],['Compra',watch.buy]].filter(([,a])=>a?.length);
   return all.map(([label,a])=>`<div class="hub-provider-row"><b>${label}</b><div>${a.map(p=>`<span><img src="https://image.tmdb.org/t/p/w92${p.logo_path||''}" alt=""><small>${esc(p.provider_name||'')}</small></span>`).join('')}</div></div>`).join('');
 };
 async function openWatch(type,id){
   $('modal').innerHTML='<div class="hub-modal-loading">Carregando detalhes…</div>';$('overlay').classList.remove('hidden');
   try{const d=await invoke('tmdb_details',{type,id}),x=d.item||{},local=localTmdb(id),providers=providerRows(d.watch||{});
     $('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="hub-watch-detail"><div class="hub-watch-backdrop" style="background-image:url('${x.banner||x.cover||''}')"></div><div class="hub-watch-copy"><div class="hub-detail-poster" style="background-image:url('${x.cover||''}')"></div><div><span class="eyebrow">${type==='movie'?'FILME':'SÉRIE'} · ${esc(x.year||'')}</span><h2>${esc(x.title||'')}</h2><p>${esc(x.desc||'Sem sinopse disponível.')}</p><div class="hero-meta"><span>${esc((x.genres||[]).join(' · '))}</span>${x.rating?`<span>★ ${Number(x.rating).toFixed(1)}</span>`:''}</div><div class="hero-actions">${local?`<button class="primary-btn" onclick="LX.ui.close();LX.play(${local.id})">▶ Assistir na LX</button>`:''}${d.watch?.link?`<a class="secondary-btn hub-link-btn" href="${d.watch.link}" target="_blank" rel="noopener">Onde assistir oficialmente ↗</a>`:''}${state.user?.admin&&!local?`<button class="secondary-btn" onclick="LX.contentHub.importWatch('${type}',${Number(id)})">＋ Importar para LX</button>`:''}</div></div></div><section class="hub-providers"><h3>Disponibilidade no Brasil</h3>${providers||'<p>Não há provedores informados para o Brasil neste momento.</p>'}<small>Fonte de disponibilidade: JustWatch via TMDB. Os serviços e ofertas podem mudar.</small></section></div>`;
   }catch(e){console.warn(e);$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><h2>Não foi possível carregar.</h2></div>`}
 }
 async function importWatch(type,id){
   if(!state.user?.admin)return;try{const d=await invoke('tmdb_details',{type,id}),x=d.item;const source={provider:'TMDB',source:type,remoteId:x.remoteId,title:x.title,year:x.year,desc:x.desc,cover:x.cover,banner:x.banner,rating:x.rating};let y;
     if(LX.importer?.toCatalog)y=await LX.importer.toCatalog(source);else y={id:Date.now(),type:type==='movie'?'Filme':'Série',title:x.title,year:+x.year||'',desc:x.desc,cover:x.cover,banner:x.banner,genre:(x.genres||[]).join(' · '),tmdbId:x.remoteId,published:false,createdAt:new Date().toISOString()};
     await D.saveCatalogItem(y);LX.toast('Importado como rascunho. Agora envie o vídeo no ADM.');$('modal').querySelector('.hero-actions')?.insertAdjacentHTML('afterbegin',`<button class="primary-btn" onclick="LX.ui.close();LX.admin.edit(${y.id})">Enviar vídeo</button>`)
   }catch(e){console.warn(e);LX.toast('Falha ao importar.')}
 }
 const bookCard=(b,i)=>`<article class="hub-book-card"><div class="hub-book-cover" style="background-image:url('${esc(b.cover||'')}')"></div><div><span class="eyebrow">${esc(b.provider||'Project Gutenberg')}</span><h3>${esc(b.title)}</h3><p>${esc(b.author||'Autor não informado')}</p><div class="hub-actions">${b.readUrl?`<a class="primary-btn hub-link-btn" href="${esc(b.readUrl)}" target="_blank" rel="noopener">▤ Ler grátis</a>`:''}${state.user?.admin?`<button onclick="LX.contentHub.importBookAt(${i})">＋ Importar</button>`:''}</div></div></article>`;
 async function renderBooks(q=''){
   loading('Biblioteca Pública');
   try{const d=await invoke(q?'books_search':'books_popular',q?{q}:{languages:'pt,en'});cache.books=d.items||[];clear();$('welcome').innerHTML=`<section class="hub-hero books"><div><span class="eyebrow">LX READER · PROJECT GUTENBERG</span><h1>Milhares de livros de domínio público.</h1><p>Leitura gratuita por fonte pública, sem precisar enviar PDF.</p><div class="hub-search"><input id="hubBookSearch" value="${esc(q)}" placeholder="Pesquisar autor ou livro…"><button id="hubBookGo" class="primary-btn">Buscar</button></div></div></section>`;$('homeContent').innerHTML=`<section class="hub-section"><div class="lx-section-title"><div><span class="eyebrow">${q?'RESULTADOS':'MAIS BAIXADOS'}</span><h2>${q?esc(q):'Biblioteca aberta'}</h2></div></div><div class="hub-book-grid">${cache.books.map((b,i)=>bookCard(b,i)).join('')}</div></section>`;$('hubBookGo').onclick=()=>renderBooks($('hubBookSearch').value.trim());$('hubBookSearch').onkeydown=e=>{if(e.key==='Enter')renderBooks(e.target.value.trim())}
   }catch(e){console.warn(e);errorBox('Biblioteca Pública','Não foi possível consultar os livros agora.')}
 }
 async function importBook(b){
   if(!state.user?.admin||!b)return;try{const y={id:Date.now(),type:'Livro',title:b.title,desc:`Livro de domínio público via ${b.provider||'Project Gutenberg'}.`,author:b.author||'',genre:(b.subjects||[]).slice(0,3).join(' · ')||'Clássicos',cover:b.cover||'',externalReadUrl:b.readUrl||'',metadataProvider:b.provider||'Project Gutenberg',published:true,featured:false,priority:0,createdAt:new Date().toISOString(),publishedAt:new Date().toISOString(),chapters:[]};await D.saveCatalogItem(y);LX.toast('Livro público adicionado e publicado.')}catch(e){console.warn(e);LX.toast('Falha ao importar livro.')}
 }
 const musicCard=(m,i)=>`<article class="hub-music-card"><div class="hub-music-cover" style="background-image:url('${esc(m.cover||'')}')"><button disabled>♫</button></div><strong>${esc(m.title)}</strong><small>${esc(m.artist||'')} · LX Music</small></article>`;
 async function renderMusic(){state.category='Início';renderMusicExperience();}
 const sportMap={Hoje:'Soccer',Futebol:'Soccer',Basquete:'Basketball',Motorsport:'Motorsport'};
 async function renderLive(){
   const sport=sportMap[state.category]||'Soccer',date=new Date().toISOString().slice(0,10);loading('LX Ao Vivo');
   try{const d=await invoke('sports_today',{date,sport});cache.sports=d.events||[];clear();$('welcome').innerHTML=`<section class="hub-live-hero"><div><span class="live-dot"></span><span class="eyebrow">LX AO VIVO · ${esc(sport)}</span><h1>Jogos e eventos de hoje</h1><p>Agenda e placares via TheSportsDB. A LX não retransmite sinais de terceiros; quando houver emissora cadastrada, mostramos o serviço oficial.</p></div><div class="live-date">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</div></section>`;$('homeContent').innerHTML=`<section class="hub-section"><div class="lx-section-title"><div><span class="eyebrow">HOJE</span><h2>${state.category}</h2></div><button class="lx-text-btn" onclick="LX.contentHub.renderLive()">Atualizar</button></div>${d.freeKey?'<div class="hub-note">Usando a API gratuita: a quantidade de partidas mostradas é limitada. No ADM você pode adicionar uma chave própria do TheSportsDB.</div>':''}<div class="hub-live-list">${cache.sports.map(eventCard).join('')||'<div class="notice">Nenhum evento encontrado para este filtro hoje.</div>'}</div></section>`;
   }catch(e){console.warn(e);errorBox('LX Ao Vivo','Não foi possível carregar a agenda esportiva agora.')}
 }
 const score=v=>v===null||v===undefined||v===''?'–':v;
 const eventCard=e=>`<article class="hub-live-card"><div class="hub-live-meta"><span>${esc(e.league||e.sport||'Esporte')}</span><b>${esc(e.time||'')}</b></div><div class="hub-match"><strong>${esc(e.home||'Casa')}</strong><div class="hub-score"><b>${score(e.homeScore)}</b><i>×</i><b>${score(e.awayScore)}</b></div><strong>${esc(e.away||'Visitante')}</strong></div><div class="hub-live-footer"><span>${esc(e.status||e.venue||'')}</span><button onclick="LX.contentHub.openTV('${esc(e.id)}','${esc(e.name).replace(/'/g,'&#39;')}')">Onde assistir</button></div></article>`;
 const official=(name='')=>{const n=name.toLowerCase();if(/espn|disney/.test(n))return ['Disney+','https://www.disneyplus.com/'];if(/sportv|globo|premiere/.test(n))return ['Globoplay','https://globoplay.globo.com/'];if(/prime/.test(n))return ['Prime Video','https://www.primevideo.com/'];if(/paramount/.test(n))return ['Paramount+','https://www.paramountplus.com/br/'];if(/caz[eé]|cazetv/.test(n))return ['CazéTV','https://www.youtube.com/@CazeTV'];if(/tnt|max/.test(n))return ['Max','https://www.max.com/br/pt'];return null};
 async function openTV(id,name='Evento'){
   $('modal').innerHTML='<div class="hub-modal-loading">Consultando emissoras…</div>';$('overlay').classList.remove('hidden');
   try{const d=await invoke('sports_tv',{id}),chs=d.channels||[];$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><span class="eyebrow">TRANSMISSÃO OFICIAL</span><h2>${esc(name)}</h2><p>A LX não incorpora streams não autorizados. Abaixo aparecem emissoras cadastradas na fonte esportiva.</p><div class="hub-tv-list">${chs.length?chs.map(c=>{const name=c.strChannel||c.strTVStation||c.strName||c.strCountry||'Emissora';const o=official(name);return `<div><strong>${esc(name)}</strong><small>${esc(c.strCountry||c.strChannelCountry||'')}</small>${o?`<a class="primary-btn hub-link-btn" href="${o[1]}" target="_blank" rel="noopener">Abrir ${esc(o[0])} ↗</a>`:'<span class="hub-unmapped">Consulte o site oficial da emissora/competição.</span>'}</div>`}).join(''):'<div class="notice">Nenhuma emissora informada pela API para este evento.</div>'}</div></div>`}catch(e){$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><h2>Emissora não disponível.</h2></div>`}
 }
 LX.contentHub={invoke,renderWatch,openWatch,importWatch,renderBooks,importBook,importBookAt:i=>importBook(cache.books[+i]),renderMusic,playMusicAt:i=>LX.playOnlineMusicPreview(cache.music[+i]),renderLive,openTV};
})();
window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['content-hub']='25.35';

/* ===== admin.js · LX Plus v25.36 ===== */
(()=>{const LX=window.LX,D=LX.data,S=LX.store,U=LX.ui,$=U.$,$$=U.$$ ,esc=U.esc;
const head=(t,p)=>`<div class="admin-head"><div><span class="eyebrow">LX ADMIN</span><h1>${t}</h1><p>${p}</p></div></div>`;
const mediaReady=x=>x?.type==='Filme'?!!x.mediaKey:['Série','Anime','Dorama'].includes(x?.type)?!!x.episodes?.some(e=>e.mediaKey):x?.type==='Livro'?!!(x.mediaKey||x.chapters?.length||x.externalReadUrl):x?.type==='Música'?!!(x.mediaKey||x.authorizedAudioUrl||x.tracks?.some(t=>t.mediaKey||t.authorizedAudioUrl)):true;
const autoState=x=>{if(x?.autoVariants&&Object.keys(x.autoVariants).length)return'Auto Quality pronto';const ref=x?.mediaKey||x?.episodes?.find?.(e=>e.mediaKey)?.mediaKey||x?.tracks?.find?.(t=>t.mediaKey)?.mediaKey||'';if(ref)return LX.mediaSources?.label?.(ref)||(/^https?:\/\//i.test(String(ref))?'Link externo':'Master original');return x?.autoQuality?.status==='queued'?'Auto Quality na fila':'Sem arquivo'};
const PENDING_KEY='lxplus_admin_pending_v2527';
function loadPending(){try{const x=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'{}');return {verified:new Map(Object.entries(x.verified||{})),deleteIds:new Set((x.deleteIds||[]).map(Number)),access:new Map(Object.entries(x.access||{}))}}catch{return {verified:new Map(),deleteIds:new Set(),access:new Map()}}}
const pendingAdmin=loadPending();
function persistPending(){try{sessionStorage.setItem(PENDING_KEY,JSON.stringify({verified:Object.fromEntries(pendingAdmin.verified),deleteIds:[...pendingAdmin.deleteIds],access:Object.fromEntries(pendingAdmin.access)}))}catch{}updateSaveDock()}
function updateSaveDock(){const dock=$('adminGlobalSave'),commit=$('adminGlobalCommit'),discard=$('adminGlobalDiscard'),title=$('adminGlobalSaveTitle'),detail=$('adminGlobalSaveDetail');if(!dock)return;const page=U.state.adminPage||'dashboard',n=pendingCount(),show=n>0||['library','movies','series','music','books','community'].includes(page);dock.classList.toggle('hidden',!show);if(title)title.textContent=n?`${n} alteração${n===1?'':'ões'} pendente${n===1?'':'s'}`:'Nenhuma alteração pendente';const parts=[];if(pendingAdmin.verified.size)parts.push(`${pendingAdmin.verified.size} selo${pendingAdmin.verified.size===1?'':'s'}`);if(pendingAdmin.access.size)parts.push(`${pendingAdmin.access.size} acesso${pendingAdmin.access.size===1?'':'s'}`);if(pendingAdmin.deleteIds.size)parts.push(`${pendingAdmin.deleteIds.size} exclusão${pendingAdmin.deleteIds.size===1?'':'ões'}`);if(detail)detail.textContent=n?parts.join(' · '):'Marque Excluir, Dar selo ou Aprovar e depois salve.';if(commit){commit.disabled=!n;commit.textContent=n?'Salvar alterações':'Tudo salvo'}if(discard)discard.disabled=!n;const side=$('adminSidebarSave'),sideCount=$('adminSidebarSaveCount');if(side){side.disabled=false;side.classList.toggle('has-pending',!!n);side.textContent='Salvar alterações'}if(sideCount){sideCount.textContent=n?String(n):'';sideCount.classList.toggle('hidden',!n)}}
const stagedVerified=x=>pendingAdmin.verified.has(String(x.id))?pendingAdmin.verified.get(String(x.id)):!!x.verified;
const stagedAccess=x=>pendingAdmin.access.get(String(x.id))||(x.approved?'approved':x.approvalStatus==='rejected'?'rejected':'pending');
const pendingCount=()=>pendingAdmin.verified.size+pendingAdmin.deleteIds.size+pendingAdmin.access.size;
function pendingBar(scope='library'){
 const n=pendingCount();
 const parts=[];
 if(pendingAdmin.verified.size)parts.push(`${pendingAdmin.verified.size} selo${pendingAdmin.verified.size===1?'':'s'}`);
 if(pendingAdmin.access.size)parts.push(`${pendingAdmin.access.size} acesso${pendingAdmin.access.size===1?'':'s'}`);
 if(pendingAdmin.deleteIds.size)parts.push(`${pendingAdmin.deleteIds.size} exclusão${pendingAdmin.deleteIds.size===1?'':'ões'}`);
 return `<section class="admin-page-save ${n?'has-pending':'is-clean'}" data-admin-save-scope="${scope}"><div><span>${n?'ALTERAÇÕES PENDENTES':'CONTROLE DE ALTERAÇÕES'}</span><strong>${n?`${n} alteração${n===1?'':'ões'} aguardando salvar`:'Tudo salvo no Supabase'}</strong><small>${n?parts.join(' · '):'Marque Excluir, Dar selo, Aprovar ou Recusar e depois confirme aqui.'}</small></div><div class="admin-page-save-actions"><button class="glass-btn" onclick="LX.admin.discardPending('${scope}')" ${n?'':'disabled'}>Descartar</button><button class="primary-btn admin-save-primary" onclick="LX.admin.saveChanges('${scope}')">Salvar alterações</button></div></section>`
}
function premium(m){const users=D.users(),subs=D.subscriptions();m.innerHTML=head('Premium','Gerencie os planos Premium sem sair do painel.')+`<div class="admin-card" style="overflow:auto"><table class="admin-table"><thead><tr><th>Usuário</th><th>Plano</th><th>Status</th><th>Ações</th></tr></thead><tbody>${users.map(u=>{const sub=subs[u.email]||{};return `<tr><td><b>${esc(u.name)}</b><br><small>${esc(u.email||'')}</small></td><td>${esc(sub.plan||'Free')}</td><td>${sub.active?'Ativo':'Free'}</td><td><button onclick="LX.admin.premiumSet('${esc(u.email).replace(/'/g,'&#39;')}','Mensal')">Mensal</button> <button onclick="LX.admin.premiumSet('${esc(u.email).replace(/'/g,'&#39;')}','Anual')">Anual</button> <button onclick="LX.admin.premiumOff('${esc(u.email).replace(/'/g,'&#39;')}')">Desativar</button></td></tr>`}).join('')}</tbody></table></div>`}
function analytics(m){const events=D.analytics(),plays=events.filter(x=>x.event==='play'),searches=events.filter(x=>x.event==='search');m.innerHTML=head('Analytics','Resumo local e sincronizado da utilização da LX Plus.')+`<div class="stats"><div class="stat"><small>EVENTOS</small><strong>${events.length}</strong></div><div class="stat"><small>PLAYS</small><strong>${plays.length}</strong></div><div class="stat"><small>BUSCAS</small><strong>${searches.length}</strong></div><div class="stat"><small>USUÁRIOS</small><strong>${D.users().length}</strong></div></div><div class="admin-card" style="margin-top:12px"><h2>Eventos recentes</h2>${events.slice(-20).reverse().map(e=>`<div class="notice"><strong>${esc(e.event)}</strong><small>${new Date(e.at||Date.now()).toLocaleString('pt-BR')}</small></div>`).join('')||'<p>Sem eventos ainda.</p>'}</div>`}
function notifications(m){const a=D.notices();m.innerHTML=head('Notificações','Publique avisos para os usuários da LX Plus.')+`<div class="admin-grid"><form id="noticeForm" class="admin-card form-grid"><h2 class="span2">Nova notificação</h2><label class="field span2">Título<input id="noticeTitle" maxlength="80" placeholder="Ex.: Novo filme disponível"></label><label class="field span2">Mensagem<textarea id="noticeText" rows="4" maxlength="400" placeholder="Mensagem para os usuários"></textarea></label><label class="field">Horário<input id="noticeTime" value="Agora"></label><div class="field"><span>&nbsp;</span><button id="sendNotice" class="primary-btn" type="button">Publicar notificação</button></div></form><div class="admin-card"><h2>Notificações atuais</h2>${a.map(n=>`<div class="notice"><strong>${esc(n.title||'Notificação')}</strong><small>${esc(n.text||n.message||'')}</small></div>`).join('')||'<p style="color:var(--muted)">Nenhuma notificação publicada.</p>'}</div></div>`}
function appearance(m){const b=D.branding?.()||{};m.innerHTML=head('Identidade visual','Ajuste textos institucionais e a cor principal da LX Plus.')+`<form id="brandForm" class="admin-card form-grid"><label class="field">Cor principal<input id="brandAccent" type="color" value="${esc(b.accent||'#42a5ff')}"></label><label class="field span2">Título da entrada<input id="brandTitle" value="${esc(b.splashTitle||'Seu entretenimento. Do seu jeito.')}"></label><label class="field span2">Subtítulo<textarea id="brandSubtitle" rows="3">${esc(b.splashSubtitle||'')}</textarea></label><label class="field span2">Sobre<textarea id="brandAbout" rows="4">${esc(b.legalAbout||'')}</textarea></label><label class="field span2">Termos<textarea id="brandTerms" rows="4">${esc(b.legalTerms||'')}</textarea></label><label class="field span2">Privacidade<textarea id="brandPrivacy" rows="4">${esc(b.legalPrivacy||'')}</textarea></label><label class="field span2">E-mail de suporte<input id="brandSupport" type="email" value="${esc(b.supportEmail||'')}"></label><div class="span2"><button class="primary-btn" type="submit">Salvar identidade</button></div></form>`;const f=$('brandForm');if(f)f.onsubmit=async e=>{e.preventDefault();const next={...b,accent:$('brandAccent').value,splashTitle:$('brandTitle').value.trim(),splashSubtitle:$('brandSubtitle').value.trim(),legalAbout:$('brandAbout').value.trim(),legalTerms:$('brandTerms').value.trim(),legalPrivacy:$('brandPrivacy').value.trim(),supportEmail:$('brandSupport').value.trim()};try{await D.saveBranding(next);LX.applyBranding?.();LX.toast('Identidade visual salva.')}catch(err){console.warn(err);LX.toast('Não foi possível salvar a identidade agora.')}}}
function render(page='dashboard'){U.state.adminPage=page;const m=$('adminMain');({dashboard,library,movies:m=>catalogSection(m,'movies'),series:m=>catalogSection(m,'series'),music:m=>catalogSection(m,'music'),books:m=>catalogSection(m,'books'),importer,uploads,requests,community,admins,premium,analytics,notifications,appearance,settings}[page]||dashboard)(m);$$('#adminNav [data-admin]').forEach(b=>b.classList.toggle('active',b.dataset.admin===page));bind(page);updateSaveDock();LX.saveView?.()}
function dashboard(m){const c=D.catalog(),u=D.users(),req=D.requests(),mediaPending=c.filter(x=>!mediaReady(x)),events=D.analytics(),cloud=LX.cloud?.status?.()||{},published=c.filter(x=>x.published!==false).length,drafts=c.filter(x=>x.published===false).length,openReq=req.filter(x=>!['Concluído','Fechado','Recusado'].includes(x.status)).length,plays=events.filter(x=>x.event==='play'),now=Date.now(),newUsers7=u.filter(x=>x.created&&now-x.created<=7*86400000).length,userDaily=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-i));const e=new Date(d);e.setDate(e.getDate()+1);return u.filter(x=>x.created&&x.created>=+d&&x.created<+e).length}),userMax=Math.max(1,...userDaily),launchScore=Math.round(([c.length>0,mediaPending.length===0,cloud.configured===true,published>0,plays.length>0].filter(Boolean).length/5)*100),daily=Array.from({length:14},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(13-i));const e=new Date(d);e.setDate(e.getDate()+1);return plays.filter(x=>x.at>=+d&&x.at<+e).length}),max=Math.max(1,...daily),topCount=(arr,key)=>Object.entries(arr.reduce((o,x)=>{const k=key(x);if(k)o[k]=(o[k]||0)+1;return o},{})).sort((a,b)=>b[1]-a[1]).slice(0,5),topPlayed=topCount(plays,x=>x.data?.title),topReq=[...req].sort((a,b)=>(b.votes||1)-(a.votes||1)).slice(0,5);m.innerHTML=head('Visão geral','Operação, audiência, catálogo e lançamento em um único painel.')+`<section class="launch-center"><div><span class="eyebrow">CENTRAL DE LANÇAMENTO</span><h2>Prontidão da LX Plus</h2><p>Checklist técnico e editorial antes de publicar uma atualização.</p></div><div class="launch-score"><strong>${launchScore}%</strong><small>PRONTO</small></div><div class="launch-checks"><span class="${c.length?'ok':''}">Catálogo ${c.length?'✓':'!'}</span><span class="${mediaPending.length===0?'ok':''}">Mídia ${mediaPending.length===0?'✓':'!'}</span><span class="${cloud.configured?'ok':''}">Nuvem ${cloud.configured?'✓':'!'}</span><span class="${published?'ok':''}">Publicados ${published?'✓':'!'}</span><span class="${plays.length?'ok':''}">Plays ${plays.length?'✓':'!'}</span></div></section><div class="admin-quick-add"><div><span class="eyebrow">PUBLICAR AGORA</span><strong>Adicionar conteúdo</strong><small>Abra o formulário certo com um clique.</small></div><div class="quick-add-actions">${['Filme','Série','Anime','Dorama','Livro','Música'].map(t=>`<button onclick="LX.admin.edit(null,'${t}')"><span>${t==='Filme'?'🎬':t==='Série'?'▣':t==='Anime'?'✦':t==='Dorama'?'♡':t==='Livro'?'▤':'♫'}</span>${t}</button>`).join('')}</div></div><div class="stats"><div class="stat"><small>USUÁRIOS</small><strong>${u.length}</strong><span>+${newUsers7} em 7 dias</span></div><div class="stat"><small>PLAYS</small><strong>${plays.length}</strong><span>reproduções registradas</span></div><div class="stat"><small>PUBLICADOS</small><strong>${published}</strong><span>${drafts} rascunhos</span></div><div class="stat"><small>PEDIDOS ABERTOS</small><strong>${openReq}</strong><span>priorizar</span></div></div><div class="admin-grid"><div class="admin-card"><h2>Plays — últimos 14 dias</h2><div class="chart">${daily.map(n=>`<i title="${n} plays" style="height:${Math.max(8,Math.round(n/max*118))}px"></i>`).join('')}</div><small style="color:var(--muted)">${plays.length} plays registrados no período total disponível</small></div><div class="admin-card"><h2>Títulos mais vistos</h2>${topPlayed.map(([x,n],i)=>`<div class="rank-row"><span class="position">#${i+1}</span><strong>${esc(x)}</strong><b>${n}</b></div>`).join('')||'<p style="color:var(--muted)">Ainda não há plays suficientes.</p>'}</div></div><div class="admin-grid"><div class="admin-card"><h2>Pedidos mais solicitados</h2>${topReq.map((x,i)=>`<div class="rank-row"><span class="position">#${i+1}</span><div><strong>${esc(x.title)}</strong><small style="display:block;color:var(--muted)">${esc(x.mediaType)} · ${esc(x.status)}</small></div><b>▲ ${x.votes||1}</b></div>`).join('')||'<p style="color:var(--muted)">Nenhum pedido recebido.</p>'}<h2 style="margin-top:22px">Novos usuários — 7 dias</h2><div class="chart mini-chart">${userDaily.map(n=>`<i title="${n} novos usuários" style="height:${Math.max(7,Math.round(n/userMax*88))}px"></i>`).join('')}</div><small style="color:var(--muted)">+${newUsers7} usuários nos últimos 7 dias</small></div><div class="admin-card"><h2>Saúde da plataforma</h2><div class="health-grid"><div class="health-card"><span class="status">Frontend</span><strong>Operacional</strong><small>Cache atualizado · Free Media Hub</small></div><div class="health-card"><span class="status ${cloud.configured?'':'warn'}">Nuvem</span><strong>${cloud.configured?'Conectada':'Pendente'}</strong><small>${cloud.configured?'Supabase e sincronização global':'Configure o Supabase'}</small></div><div class="health-card"><span class="status ${mediaPending.length?'warn':''}">Mídia</span><strong>${mediaPending.length?mediaPending.length+' pendências':'Masters prontos'}</strong><small>Cinema Core · Original master</small></div><div class="health-card"><span class="status">Plataforma</span><strong>LX Plus</strong><small>Cinema Posters · Free Media Hub</small></div></div></div></div>`}
function musicCategoryAdmin(){const all=D.catalog().filter(x=>x.type==='Música'),cats=LX.musicCategoryList?.(all,true)||LX.musicCategoryDefaults||[];return `<section class="admin-card lx-admin-music-categories"><div class="lx-admin-category-head"><div><span class="eyebrow">LX MUSIC</span><h2>Categorias de músicas</h2><p>Crie, renomeie ou exclua categorias. As músicas podem pertencer a vários gêneros.</p></div><span>${cats.length} categorias</span></div><div class="lx-admin-category-add"><input id="newMusicCategory" maxlength="40" placeholder="Nova categoria, ex.: Sertanejo universitário"><button type="button" class="primary-btn" onclick="LX.admin.addMusicCategory()">＋ Adicionar</button></div><div class="lx-admin-category-list">${cats.map(g=>{const used=all.filter(x=>LX.musicGenresOf?.(x).some(v=>D.normalize(v)===D.normalize(g))).length,key=encodeURIComponent(g);return `<div class="lx-admin-category-chip"><span><b>${esc(g)}</b><small>${used} ${used===1?'música':'músicas'}</small></span><button type="button" onclick="LX.admin.renameMusicCategory('${key}')">Editar</button><button type="button" class="danger" onclick="LX.admin.deleteMusicCategory('${key}')">Excluir</button></div>`}).join('')}</div></section>`}
const catalogPageForType=type=>type==='Filme'?'movies':['Série','Anime','Dorama'].includes(type)?'series':type==='Música'?'music':type==='Livro'?'books':'library';
const catalogSections={movies:{title:'Filmes',type:'Filme',types:['Filme']},series:{title:'Séries',type:'Série',types:['Série','Anime','Dorama']},music:{title:'Músicas',type:'Música',types:['Música']},books:{title:'Livros',type:'Livro',types:['Livro']}};
function catalogSectionRows(items,page){
 return items.map(x=>{
  const deleting=pendingAdmin.deleteIds.has(Number(x.id)),scheduled=x.scheduledAt&&+new Date(x.scheduledAt)>Date.now(),status=deleting?'Excluir ao salvar':x.published===false?'Rascunho':scheduled?'Agendado':'Publicado',ref=x.mediaKey||x.tracks?.[0]?.mediaKey||x.episodes?.[0]?.mediaKey||'',provider=LX.mediaSources?.describe?.(ref)?.provider||autoState(x),art=page==='music'?LX.artwork?.url?.(x,x):x.cover||'assets/lx-music-fallback.svg';
  const info=page==='movies'?`${x.year||'Ano não informado'} · ${x.genre||'Sem gênero'}`:page==='series'?`${new Set((x.episodes||[]).map(e=>+e.season||1)).size} temporada(s) · ${(x.episodes||[]).length} episódio(s)`:page==='music'?`${x.artist||'Artista não informado'} · ${x.genre||'Sem gênero'}`:`${x.author||'Autor não informado'} · ${(x.chapters||[]).length} capítulos`;
  const detail=page==='music'?`${x.album||x.tracks?.[0]?.album||'Single'} · ${LX.fmt?.((x.tracks||[]).reduce((n,t)=>n+(Number(t.duration)||0),0)||Number(x.duration)||0)||'—'}`:page==='series'?`${(x.episodes||[]).filter(e=>e.mediaKey).length} com fonte`:page==='movies'?`${x.year||'—'} · ${x.genre||'—'}`:`${x.genre||'—'}`;
  const play=page==='music'?`<button class="primary-btn" onclick="LX.admin.testMusic(${Number(x.id)})">♫ Testar</button>`:page==='books'?`<button class="primary-btn" onclick="LX.read(${Number(x.id)})">▤ Ler</button>`:`<button class="primary-btn" onclick="LX.play(${Number(x.id)})">▶ Player</button>`;
  return `<tr class="${deleting?'pending-delete-row':''}"><td><div class="lx-admin-catalog-title"><img src="${esc(art)}" alt="" loading="lazy"><span><b>${esc(x.title||'Sem título')}</b><small>${esc(info)}</small></span></div></td><td><strong>${esc(detail)}</strong><small class="lx-admin-catalog-source">${esc(page==='music'?provider:autoState(x))}</small></td><td><span class="${deleting?'account-status-pill rejected':''}">${esc(status)}</span></td><td><div class="catalog-actions">${!deleting&&mediaReady(x)?play:''}${deleting?'':`<button onclick="LX.admin.preview(${Number(x.id)})">Prévia</button><button onclick="LX.admin.edit(${Number(x.id)})">Editar</button><button onclick="LX.admin.togglePublish(${Number(x.id)})">${x.published===false?'Publicar':'Rascunho'}</button><button onclick="LX.admin.toggleFeatured(${Number(x.id)})">${x.featured?'Tirar destaque':'Destacar'}</button>`}<button class="${deleting?'glass-btn':'danger'}" onclick="LX.admin.del(${Number(x.id)})">${deleting?'Desfazer exclusão':'Excluir'}</button></div></td></tr>`
 }).join('')
}
function catalogSection(m,page){
 const config=catalogSections[page],all=D.catalog().filter(x=>config.types.includes(x.type)),published=all.filter(x=>x.published!==false).length,needsMedia=all.filter(x=>!mediaReady(x)).length;
 m.innerHTML=head(config.title,`Gerencie ${config.title.toLowerCase()} em uma área própria. Alterações e exclusões são confirmadas pelo catálogo da nuvem.`)+pendingBar(page)+`<div class="stats lx-admin-catalog-stats"><div class="stat"><small>TOTAL</small><strong>${all.length}</strong></div><div class="stat"><small>PUBLICADOS</small><strong>${published}</strong></div><div class="stat"><small>RASCUNHOS</small><strong>${all.length-published}</strong></div><div class="stat"><small>SEM FONTE</small><strong>${needsMedia}</strong></div></div>${page==='music'?musicCategoryAdmin():''}<section class="admin-card lx-admin-catalog-page"><div class="admin-toolbar"><input id="catalogSearch" type="search" placeholder="Buscar ${config.title.toLowerCase()}" aria-label="Buscar ${config.title.toLowerCase()}"><select id="catalogStatus" aria-label="Filtrar por status"><option value="all">Todos os status</option><option value="published">Publicado</option><option value="draft">Rascunho</option><option value="scheduled">Agendado</option></select>${page==='series'?'<select id="catalogSubtype" aria-label="Tipo de série"><option value="all">Séries, animes e doramas</option><option value="Série">Séries</option><option value="Anime">Animes</option><option value="Dorama">Doramas</option></select>':''}<button id="catalogNew" class="primary-btn" type="button">＋ Adicionar ${config.type.toLowerCase()}</button></div><div class="lx-admin-catalog-overflow"><table class="admin-table lx-admin-catalog-table"><thead><tr><th>${page==='music'?'Faixa / artista':'Título'}</th><th>${page==='music'?'Álbum · fonte':page==='series'?'Episódios · fonte':'Dados · fonte'}</th><th>Status</th><th>Ações</th></tr></thead><tbody id="catalogRows"></tbody></table></div><small id="catalogResultCount" class="lx-admin-result-count"></small></section>`;
 const draw=()=>{const q=D.normalize($('catalogSearch')?.value||''),status=$('catalogStatus')?.value||'all',subtype=$('catalogSubtype')?.value||'all',now=Date.now(),items=all.filter(x=>{if(subtype!=='all'&&x.type!==subtype)return false;if(q&&!D.normalize([x.title,x.genre,x.artist,x.author,x.album,x.year,x.type].join(' ')).includes(q))return false;const scheduled=x.published!==false&&x.scheduledAt&&+new Date(x.scheduledAt)>now;return status==='all'||(status==='published'&&x.published!==false&&!scheduled)||(status==='draft'&&x.published===false)||(status==='scheduled'&&scheduled)});$('catalogRows').innerHTML=catalogSectionRows(items,page)||'<tr><td colspan="4" class="lx-admin-empty">Nenhum conteúdo encontrado nesta área.</td></tr>';$('catalogResultCount').textContent=`${items.length} de ${all.length} ${config.title.toLowerCase()}`};
 $('catalogSearch').oninput=draw;$('catalogStatus').onchange=draw;if($('catalogSubtype'))$('catalogSubtype').onchange=draw;$('catalogNew').onclick=()=>edit(null,config.type);draw()
}
function library(m){const c=D.catalog(),types=['Filme','Série','Anime','Dorama','Livro','Música'],t=U.state.libraryType||'Todos',musicTools=t==='Música'?musicCategoryAdmin():'';m.innerHTML=head('Biblioteca','Publique, agende, priorize e gerencie o catálogo. Exclusões só são aplicadas quando você toca em Salvar alterações.')+pendingBar('library')+`<div class="library-summary">${types.map(x=>`<button data-libsummary="${x}" class="${t===x?'active':''}"><small>${x==='Música'?'Música':x+'s'}</small><strong>${c.filter(z=>z.type===x).length}</strong></button>`).join('')}</div>${musicTools}<div class="admin-card"><div class="library-tabs"><button data-lib="Todos" class="${t==='Todos'?'active':''}">Tudo</button>${types.map(x=>`<button data-lib="${x}" class="${t===x?'active':''}">${x==='Música'?'Música':x+'s'}</button>`).join('')}</div><div class="admin-toolbar"><input id="libSearch" placeholder="Buscar nesta biblioteca"><select id="libStatus"><option>Todos os status</option><option>Publicado</option><option>Rascunho</option><option>Agendado</option></select><button id="newContent" class="primary-btn">＋ Novo conteúdo</button><button class="admin-inline-save" onclick="LX.admin.saveChanges('library')">Salvar alterações</button></div><div style="overflow:auto"><table class="admin-table"><thead><tr><th>Título</th><th>Tipo</th><th>Prioridade</th><th>Mídia</th><th>Status</th><th>Ações rápidas</th></tr></thead><tbody id="libRows">${rows(c)}</tbody></table></div></div>`}
async function persistMusicCategories(list){const b=D.branding?.()||{},clean=[...new Set(list.map(x=>String(x||'').trim()).filter(Boolean))];await D.saveBranding({...b,musicCategories:clean});return clean}
async function addMusicCategory(){const input=$('newMusicCategory'),name=String(input?.value||'').trim();if(!name)return LX.toast('Digite o nome da nova categoria.');const current=LX.musicCategoryList?.(D.catalog().filter(x=>x.type==='Música'),true)||[];if(current.some(x=>D.normalize(x)===D.normalize(name)))return LX.toast('Essa categoria já existe.');try{await persistMusicCategories([...current,name]);LX.toast(`Categoria ${name} adicionada.`);render('music')}catch(e){console.warn(e);LX.toast('Não foi possível salvar a categoria agora.')}}
async function renameMusicCategory(encoded){const oldName=decodeURIComponent(encoded),next=String(prompt('Novo nome da categoria:',oldName)||'').trim();if(!next||D.normalize(next)===D.normalize(oldName))return;const all=D.catalog().filter(x=>x.type==='Música'),cats=LX.musicCategoryList?.(all,true)||[];if(cats.some(x=>D.normalize(x)===D.normalize(next)&&D.normalize(x)!==D.normalize(oldName)))return LX.toast('Já existe uma categoria com esse nome.');try{for(const item of all){const gs=LX.musicGenresOf?.(item)||[];if(!gs.some(g=>D.normalize(g)===D.normalize(oldName)))continue;const ng=[...new Set(gs.map(g=>D.normalize(g)===D.normalize(oldName)?next:g))];const y={...item,genres:ng,genre:D.normalize(item.genre)===D.normalize(oldName)?next:item.genre};await D.saveCatalogItem(y)}await persistMusicCategories(cats.map(g=>D.normalize(g)===D.normalize(oldName)?next:g));LX.toast(`Categoria renomeada para ${next}.`);render('music');LX.ui?.renderApp?.()}catch(e){console.warn(e);LX.toast('Não foi possível renomear a categoria.')}}
async function deleteMusicCategory(encoded){const name=decodeURIComponent(encoded);if(!confirm(`Excluir a categoria "${name}"? As músicas nela serão movidas para outra categoria disponível ou para Outros.`))return;const all=D.catalog().filter(x=>x.type==='Música'),cats=LX.musicCategoryList?.(all,true)||[];try{for(const item of all){const gs=(LX.musicGenresOf?.(item)||[]).filter(g=>D.normalize(g)!==D.normalize(name));if((LX.musicGenresOf?.(item)||[]).length===gs.length)continue;const nextGenres=gs.length?gs:['Outros'],primary=D.normalize(item.genre)===D.normalize(name)?nextGenres[0]:item.genre;await D.saveCatalogItem({...item,genres:nextGenres,genre:primary||nextGenres[0]})}await persistMusicCategories(cats.filter(g=>D.normalize(g)!==D.normalize(name)));LX.toast(`Categoria ${name} excluída.`);render('music');LX.ui?.renderApp?.()}catch(e){console.warn(e);LX.toast('Não foi possível excluir a categoria.')}}

function rows(a){return a.map(x=>{const scheduled=x.scheduledAt&&+new Date(x.scheduledAt)>Date.now(),deleting=pendingAdmin.deleteIds.has(Number(x.id)),status=deleting?'Excluir ao salvar':x.published===false?'Rascunho':scheduled?`Agendado · ${new Date(x.scheduledAt).toLocaleString('pt-BR')}`:'Publicado';return `<tr class="${deleting?'pending-delete-row':''}"><td><b>${esc(x.title)}</b>${x.featured?' <span class="premium-user-pill">DESTAQUE</span>':''}${deleting?' <span class="account-status-pill rejected">PENDENTE DE EXCLUSÃO</span>':''}<br><small style="color:var(--muted)">${esc(x.type==='Música'?(LX.musicGenresOf?.(x)||[x.genre]).join(' · '):x.genre)} · ${x.type==='Livro'?`${x.chapters?.length||0} capítulos`:x.type==='Música'?`${x.tracks?.length||0} faixas`:['Série','Anime','Dorama'].includes(x.type)?`${x.episodes?.length||0} episódios`:'1 título'}</small></td><td>${esc(x.type)}</td><td><div class="priority-control"><button onclick="LX.admin.priority(${x.id},-1)" ${deleting?'disabled':''}>−</button><b>${+x.priority||0}</b><button onclick="LX.admin.priority(${x.id},1)" ${deleting?'disabled':''}>＋</button></div></td><td><span class="media-state ${mediaReady(x)?'ok':'warn'}">${autoState(x)}</span></td><td><span class="${deleting?'account-status-pill rejected':''}">${status}</span></td><td><div class="catalog-actions">${!deleting?(x.type==='Livro'&&mediaReady(x)?`<button class="primary-btn" onclick="LX.read(${x.id})">▤ Ler</button>`:x.type==='Música'&&mediaReady(x)?`<button class="primary-btn" onclick="LX.music(${x.id},0)">♫ Ouvir</button>`:mediaReady(x)?`<button class="primary-btn" onclick="LX.play(${x.id})">▶ Assistir</button>`:''):''}${deleting?'':`<button onclick="LX.admin.preview(${x.id})">Prévia</button><button onclick="LX.admin.togglePublish(${x.id})">${x.published===false?'Publicar':'Rascunho'}</button><button onclick="LX.admin.toggleFeatured(${x.id})">${x.featured?'Tirar destaque':'Destacar'}</button><button onclick="LX.admin.edit(${x.id})">Editar</button>`}<button class="${deleting?'glass-btn':'danger'}" onclick="LX.admin.del(${x.id})">${deleting?'Cancelar exclusão':'Excluir'}</button></div></td></tr>`}).join('')}
function importer(m){if(LX.importer?.render)LX.importer.render(m);else m.innerHTML=head('Importador','O módulo de importação ainda está carregando.')}
function uploads(m){
 const epWorks=D.catalog().filter(x=>['Série','Anime','Dorama'].includes(x.type));
 const musicWorks=D.catalog().filter(x=>x.type==='Música');
 m.innerHTML=head('Mídia & Upload','Use R2 ou links gratuitos de Google Drive, Dropbox, YouTube, OneDrive e Archive.org. O Supabase continua cuidando de contas, catálogo e capas.')+`
 <section class="admin-card r2-storage-card">
  <div class="r2-storage-head"><div><span class="eyebrow">FREE MEDIA STORAGE</span><h2>Cloudflare R2</h2><p>Arquivos grandes ficam no R2; catálogo, login e comunidade continuam no Supabase.</p></div><div id="r2StatusBadge" class="r2-status warn">Verificando…</div></div>
  <details id="r2Setup"><summary>Configurar armazenamento R2</summary><div class="form-grid r2-config-grid">
   <label class="field">Account ID<input id="r2AccountId" autocomplete="off" placeholder="Cloudflare Account ID"></label>
   <label class="field">Bucket<input id="r2Bucket" autocomplete="off" value="lxplus-media" placeholder="lxplus-media"></label>
   <label class="field">Access Key ID<input id="r2AccessKey" type="password" autocomplete="new-password" placeholder="Access Key ID"></label>
   <label class="field">Secret Access Key<input id="r2SecretKey" type="password" autocomplete="new-password" placeholder="Secret Access Key"></label>
   <div class="span2 r2-config-actions"><button id="saveR2" class="primary-btn" type="button">Salvar e testar R2</button><button id="testR2" class="glass-btn" type="button">Testar conexão</button></div>
  </div><small>As credenciais ficam na tabela protegida de integrações do Supabase e nunca são incluídas no código público do site.</small></details>
  <div id="r2Help" class="r2-help">Depois de configurar, filmes e episódios enviados pelo ADM passam automaticamente para o R2. Arquivos pequenos continuam com fallback seguro.</div>
 </section>
 <section class="admin-card free-media-hub-card">
  <div class="free-media-hub-head"><div><span class="eyebrow">FREE MEDIA HUB</span><h2>Mais espaço sem centralizar tudo em um único storage</h2><p>Cadastre a mídia no serviço gratuito que preferir e cole o link na Publicação rápida. A LX Plus reconhece a fonte e abre dentro do site quando o provedor permite.</p></div><span class="free-media-zero">R$ 0 para integrar</span></div>
  <div class="free-media-provider-grid">
   <article><b>Google Drive</b><small>Link público → player oficial do Google Drive dentro da LX Plus</small></article>
   <article><b>Dropbox</b><small>Link compartilhado → reprodução raw</small></article>
   <article><b>YouTube</b><small>Público/não listado → embed</small></article>
   <article><b>OneDrive</b><small>Link de Incorporar → embed</small></article>
   <article><b>Archive.org</b><small>Details/embed → player incorporado</small></article>
   <article><b>HTTPS direto</b><small>CDN/servidor compatível → player LX</small></article>
  </div>
  <div class="free-media-legal-note"><b>Importante:</b> os limites, disponibilidade e tráfego continuam sendo definidos por cada provedor. Use somente arquivos que você possa distribuir.</div>
 </section>
 <div class="admin-card">
  <div class="upload-mode-tabs">
   <button class="active" data-uploadmode="episodes">▶ Episódios</button>
   <button data-uploadmode="tracks">♫ Faixas de música</button>
  </div>
  <div id="uploadModeBody"></div>
  <div id="dropzone" class="dropzone" style="margin-top:12px"><div><h3 id="dropTitle">Arraste os episódios aqui</h3><p id="dropHelp">Detecta E01 / EP02 automaticamente.</p><button id="chooseBatch" class="primary-btn">Selecionar arquivos</button><input id="batchFiles" type="file" multiple accept="video/*"></div></div>
  <div id="uploadQueue" class="upload-queue"></div><button id="processBatch" class="primary-btn" style="margin-top:12px">Processar lote</button>
 </div>`;
 U.state.uploadMode='episodes';
 const body=$('uploadModeBody');
 const drawMode=()=>{
  const tracks=U.state.uploadMode==='tracks';
  body.innerHTML=tracks?`<div class="form-grid"><label class="field">Artista / álbum<select id="batchContent">${musicWorks.map(x=>`<option value="${x.id}">${esc(x.title)} · ${esc(x.artist||'Artista')}</option>`).join('')}</select></label><label class="field">Numeração inicial<input id="batchStart" type="number" min="1" value="1"></label></div><div class="media-form-note"><b>Faixas</b><span>Áudio apenas. O banner não participa do cadastro de música; capa e metadados ficam na obra.</span></div>`:`<div class="form-grid"><label class="field">Série / anime / dorama<select id="batchContent">${epWorks.map(x=>`<option value="${x.id}">${esc(x.title)} · ${x.type}</option>`).join('')}</select></label><label class="field">Temporada<input id="batchSeason" type="number" min="1" value="1"></label></div><div class="media-form-note"><b>Episódios</b><span>Vídeos separados por temporada. Use E01, E02, EP03 no nome para ordenar automaticamente.</span></div>`;
  $('batchFiles').accept=tracks?'audio/*':'video/*';$('dropTitle').textContent=tracks?'Arraste as músicas aqui':'Arraste os episódios aqui';$('dropHelp').textContent=tracks?'MP3, M4A, AAC, WAV ou outros formatos aceitos pelo navegador.':'Detecta E01 / EP02 automaticamente.';
 };
 drawMode();
 $$('[data-uploadmode]').forEach(b=>b.onclick=()=>{U.state.uploadMode=b.dataset.uploadmode;$$('[data-uploadmode]').forEach(x=>x.classList.toggle('active',x===b));drawMode();$('uploadQueue').innerHTML='';$('batchFiles').value=''});
}
function requests(m){const r=D.requests().sort((a,b)=>(b.votes||1)-(a.votes||1)||b.created-a.created);m.innerHTML=head('Pedidos & Problemas','Aprove, recuse, priorize por votos ou transforme um pedido em conteúdo com um clique.')+`<div class="stats"><div class="stat"><small>TOTAL</small><strong>${r.length}</strong></div><div class="stat"><small>NOVOS</small><strong>${r.filter(x=>x.status==='Novo').length}</strong></div><div class="stat"><small>APROVADOS</small><strong>${r.filter(x=>x.status==='Aprovado').length}</strong></div><div class="stat"><small>CONCLUÍDOS</small><strong>${r.filter(x=>x.status==='Concluído').length}</strong></div></div><div class="request-grid" style="margin-top:12px">${r.length?r.map(x=>`<article class="request-card"><div class="request-title-row"><strong>${esc(x.title)}</strong><span class="vote-pill">▲ ${x.votes||1}</span></div><small>${esc(x.kind)} · ${esc(x.mediaType)} · ${esc(x.userName)}</small><p>${esc(x.message)}</p><div class="request-badges"><span>${esc(x.status)}</span></div><div class="request-actions">${x.kind==='Pedido'?`<button onclick="LX.admin.fromRequest(${x.id})">＋ Criar conteúdo</button><button onclick="LX.admin.reqStatus(${x.id},'Aprovado')">Aprovar</button><button onclick="LX.admin.reqStatus(${x.id},'Recusado')">Recusar</button>`:''}<button onclick="LX.admin.reqStatus(${x.id},'Em análise')">Analisar</button><button onclick="LX.admin.reqStatus(${x.id},'Concluído')">Concluir</button><button onclick="LX.admin.reqStatus(${x.id},'Fechado')">Fechar</button></div></article>`).join(''):'<div class="request-card">Nenhuma solicitação recebida.</div>'}</div>`}
function community(m){
 const u=[...D.users()].sort((x,y)=>(x.approved===y.approved?0:x.approved?1:-1)||((y.created||0)-(x.created||0)));
 const pending=u.filter(x=>!x.admin&&!x.approved&&x.approvalStatus!=='rejected').length;
 m.innerHTML=head('Comunidade & Aprovações',`Cadastros, aprovação manual e selo verificado. ${pending} aguardando aprovação.`)+pendingBar('community')+`<div class="sync-lock-note admin-save-explainer"><div><b>Novo fluxo seguro:</b> marque Aprovar/Recusar ou Dar selo. Nada muda no banco até você tocar em <b>Salvar alterações</b>.</div><button class="admin-inline-save" onclick="LX.admin.saveChanges('community')">Salvar alterações</button></div><div class="admin-card" style="overflow:auto"><table class="admin-table"><thead><tr><th>Usuário</th><th>Status da conta</th><th>E-mail</th><th>Ranking</th><th>Selo LX</th><th>Acesso da conta</th></tr></thead><tbody>${u.map(x=>{
   const access=stagedAccess(x),changedAccess=pendingAdmin.access.has(String(x.id)),v=stagedVerified(x),changedVerified=pendingAdmin.verified.has(String(x.id));
   const status=x.admin?'ADM':access==='approved'?'Aprovado':access==='rejected'?'Recusado':'Aguardando';
   const cls=x.admin||access==='approved'?'approved':access==='rejected'?'rejected':'pending';
   const dirty=changedAccess||changedVerified;
   let accessActions='';
   if(x.admin)accessActions='<span class="account-status-pill approved">Protegido</span>';
   else if(access==='approved')accessActions=`<button onclick="LX.admin.rejectUser('${String(x.id)}')">Marcar como recusado</button>`;
   else accessActions=`<button class="primary-btn" onclick="LX.admin.approveUser('${String(x.id)}')">Marcar aprovação</button>${access==='pending'?`<button onclick="LX.admin.rejectUser('${String(x.id)}')">Marcar recusa</button><button onclick="LX.admin.deletePendingUser('${String(x.id)}')">Excluir cadastro pendente</button>`:`<button onclick="LX.admin.rejectUser('${String(x.id)}')">Manter recusado</button>`}`;
   return `<tr class="${dirty?'pending-change-row':''}"><td><b>${LX.verified(x.name,v)}</b>${dirty?' <span class="account-status-pill pending">NÃO SALVO</span>':''}<br><small style="color:var(--muted)">${esc(x.email)}</small></td><td><span class="account-status-pill ${cls}">${status}</span><br><small style="color:var(--muted)">${x.emailConfirmed?'e-mail confirmado':'e-mail pendente'}</small></td><td>${x.emailConfirmed?'✓ Confirmado':'○ Pendente'}</td><td>${x.visible===false?'Oculto':'Ativo'}</td><td><button class="${v?'primary-btn':''}" onclick="LX.admin.verify('${String(x.id)}')">${v?'Remover selo verificado':'Dar selo verificado ✓'}</button><small style="display:block;margin-top:6px;color:var(--muted)">${changedVerified?'Será aplicado ao salvar.':v?'Verificado no banco':'Sem selo'}</small></td><td><div class="approval-actions">${accessActions}</div>${changedAccess?'<small style="display:block;margin-top:7px;color:#ffbd62">Mudança de acesso pendente de salvar.</small>':''}</td></tr>`
 }).join('')}</tbody></table></div>`;
}
function admins(m){
 const meId=String(LX.cloud?.user?.()?.id||U.state?.user?.id||''), approved=[...D.users()].filter(x=>x.admin||x.approved).sort((a,b)=>(b.admin?1:0)-(a.admin?1:0)||String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
 const adminsOnly=approved.filter(x=>x.admin), helpers=approved.filter(x=>!x.admin);
 m.innerHTML=head('Equipe ADM','Promova outras contas aprovadas para ajudar no catálogo, aprovações e operação da LX Plus.')+`<div class="stats"><div class="stat"><small>ADM ATUAIS</small><strong>${adminsOnly.length}</strong><span>contas com acesso administrativo</span></div><div class="stat"><small>APROVADOS</small><strong>${helpers.length}</strong><span>prontos para promoção</span></div><div class="stat"><small>SUA CONTA</small><strong>${esc(U.state?.user?.name||'Administrador')}</strong><span>${esc(U.state?.user?.email||'')}</span></div><div class="stat"><small>SEGURANÇA</small><strong>Protegida</strong><span>remoção própria bloqueada nesta tela</span></div></div><div class="admin-team-grid"><article class="admin-team-card"><span class="admin-role-badge">♟ Equipe ADM</span><h3>Adicionar outro ADM</h3><p>Escolha uma conta já aprovada e entregue acesso administrativo para ela ajudar no painel, catálogo e comunidade.</p></article><article class="admin-team-card"><span class="admin-role-badge helper">✦ Fluxo</span><h3>1. Aprovar → 2. Promover</h3><p>Primeiro aprove a conta em <b>Aprovações</b>. Depois volte aqui e clique em <b>Tornar ADM</b>. Se o Supabase tiver papel/role, o sistema tenta gravar isso também.</p></article></div><div class="admin-help-note"><b>Observação:</b> esta build já inclui a interface para equipe ADM e tenta salvar o papel administrativo pelos métodos disponíveis no Supabase (RPC, tabela de administradores ou campo no perfil). Se o seu banco já tiver uma dessas estruturas, funciona direto; se não tiver, basta manter a estrutura que você usa hoje para administrador e a tela passa a aproveitar isso.</div><div class="admin-card" style="overflow:auto;margin-top:12px"><table class="admin-table admin-team-table"><thead><tr><th>Usuário</th><th>Status</th><th>E-mail</th><th>Papel</th><th>Ação ADM</th></tr></thead><tbody>${approved.map(x=>{const self=String(x.id)===meId, role=String(x.adminRole||'admin');return `<tr><td><b>${LX.verified(x.name,x.verified)}</b>${self?' <span class="account-status-pill approved">VOCÊ</span>':''}<br><small style="color:var(--muted)">${x.admin?'já pode acessar o painel':'conta apta para promoção'}</small></td><td><span class="account-status-pill ${x.admin?'approved':'pending'}">${x.admin?'ADM ativo':'Aprovado'}</span></td><td>${esc(x.email||'—')}</td><td>${x.admin?`<span class="admin-role-badge">${esc(role||'admin')}</span>`:`<select id="adminRole_${String(x.id).replace(/[^a-zA-Z0-9_-]/g,'_')}"><option value="admin">Admin completo</option><option value="manager">Manager</option><option value="editor">Editor</option></select>`}</td><td><div class="approval-actions">${x.admin?`<button class="${self?'glass-btn':'danger'}" ${self?'disabled':''} onclick="LX.admin.removeAdmin('${String(x.id)}')">${self?'Sua conta principal':'Remover ADM'}</button>`:`<button class="primary-btn" onclick="LX.admin.makeAdmin('${String(x.id)}')">Tornar ADM</button>`}</div>${x.admin?`<small style="display:block;margin-top:7px;color:var(--muted)">${self?'Por segurança, a sua própria conta não é removida por aqui.':'Pode ajudar no catálogo, aprovações e painel.'}</small>`:'<small style="display:block;margin-top:7px;color:var(--muted)">A conta continua aprovada e ganha acesso ao painel.</small>'}</td></tr>`}).join('')||'<tr><td colspan="5">Nenhuma conta aprovada disponível ainda.</td></tr>'}</tbody></table></div>`;
}
async function makeAdmin(id){
 const x=D.users().find(z=>String(z.id)===String(id));if(!x)return LX.toast('Usuário não encontrado.');
 const role=document.getElementById(`adminRole_${String(id).replace(/[^a-zA-Z0-9_-]/g,'_')}`)?.value||'admin';
 try{await LX.cloud.setAdminRole(x.id,true,role);LX.toast(`${x.name} agora pode ajudar como ADM.`);render('admins')}catch(err){console.warn(err);LX.toast('Não foi possível liberar o ADM agora. Verifique a estrutura administrativa do Supabase.')}
}
async function removeAdmin(id){
 const selfId=String(LX.cloud?.user?.()?.id||U.state?.user?.id||'');if(String(id)===selfId)return LX.toast('Por segurança, remova sua conta principal apenas direto pelo banco.');
 const x=D.users().find(z=>String(z.id)===String(id));if(!x)return LX.toast('Usuário não encontrado.');
 try{await LX.cloud.setAdminRole(x.id,false);LX.toast(`Acesso ADM removido de ${x.name}.`);render('admins')}catch(err){console.warn(err);LX.toast('Não foi possível remover o ADM agora.')}
}
function settings(m){const st=LX.cloud?.status?.()||{configured:false,connected:false,admin:false,approved:false,mediaBucket:'lx-media',assetBucket:'lx-assets'};m.innerHTML=head('Produção & Nuvem','O Supabase é a fonte oficial de contas, catálogo, identidade, progresso e mídia em todos os dispositivos.')+`<div class="admin-grid"><div class="admin-card"><h2>Status da nuvem</h2><div class="health-grid"><div class="health-card"><span class="status ${st.configured?'':'warn'}">Supabase</span><strong>${st.configured?'Configurado':'Não configurado'}</strong><small>${st.configured?'Projeto conectado à LX Plus':'Revise a configuração do projeto'}</small></div><div class="health-card"><span class="status ${st.user?'':'warn'}">Sessão</span><strong>${st.user?'Conectada':'Sem sessão cloud'}</strong><small>${esc(st.user||'Entre com uma conta Supabase')}</small></div><div class="health-card"><span class="status ${st.admin?'':'warn'}">ADM</span><strong>${st.admin?'Autorizado':'Sem privilégio cloud'}</strong><small>Permissões administrativas ficam no banco.</small></div><div class="health-card"><span class="status ${st.approved?'':'warn'}">Acesso</span><strong>${st.approved?'Aprovado':'Pendente'}</strong><small>${esc(st.approvalStatus||'status da conta')}</small></div><div class="health-card"><span class="status ${st.configured?'':'warn'}">Storage</span><strong>R2 + ${esc(st.assetBucket||'lx-assets')}</strong><small>Vídeos grandes no R2; assets e fallback no Supabase.</small></div></div></div><div class="admin-card"><h2>Sincronização global</h2><p style="color:var(--muted);line-height:1.6">O catálogo do Supabase é a <b>fonte de verdade</b>. Adicionar, editar ou excluir conteúdo só é confirmado na interface depois que a gravação na nuvem dá certo. Outros celulares, computadores e navegadores recebem a atualização pelo Realtime.</p><div class="sync-lock-note"><b>Modo de escrita:</b> ${esc(st.catalogWriteMode||'RPC')} · o navegador nunca grava diretamente em lx_catalog. Adicionar, editar e excluir passam pelas funções protegidas do Supabase.</div></div></div><div class="admin-card" style="margin-top:12px"><h2>Segurança</h2><p style="color:var(--muted);line-height:1.6">A LX Plus usa aprovação de conta no banco, RLS e funções administrativas protegidas, com escrita de catálogo exclusivamente via RPC. A build de produção não contém senha ADM de demonstração e nunca deve receber Service Role Key no GitHub.</p></div>`}
function bind(page){
 if(page==='library'){
  const apply=()=>{const q=$('libSearch').value.toLowerCase(),s=$('libStatus').value,t=U.state.libraryType,now=Date.now();const a=D.catalog().filter(x=>(t==='Todos'||x.type===t)&&(!q||D.normalize([x.title,x.genre,x.type,x.artist,x.author,x.director,x.creator,x.studio].join(' ')).includes(D.normalize(q)))&&(s==='Todos os status'||(s==='Publicado'?x.published!==false&&(!x.scheduledAt||+new Date(x.scheduledAt)<=now):s==='Agendado'?x.published!==false&&x.scheduledAt&&+new Date(x.scheduledAt)>now:x.published===false)));$('libRows').innerHTML=rows(a)};
  $$('[data-lib]').forEach(b=>b.onclick=()=>{U.state.libraryType=b.dataset.lib;render('library')});$$('[data-libsummary]').forEach(b=>b.onclick=()=>{U.state.libraryType=b.dataset.libsummary;render('library')});$('libSearch').oninput=apply;$('libStatus').onchange=apply;$('newContent').onclick=()=>edit(null,U.state.libraryType==='Todos'?'Filme':U.state.libraryType)
 }
 if(page==='uploads'){
  const refreshR2=async(force=false)=>{const badge=$('r2StatusBadge'),help=$('r2Help');if(!badge)return;badge.textContent='Verificando…';badge.className='r2-status warn';try{const st=await LX.r2?.status?.(force);if(st?.configured){badge.textContent=`R2 conectado · ${st.bucket||'bucket pronto'}`;badge.className='r2-status ok';if(help)help.innerHTML='<b>Pronto:</b> novos filmes, episódios e áudios do catálogo serão enviados ao Cloudflare R2.'}else{badge.textContent='R2 ainda não configurado';if(help)help.innerHTML='<b>Falta configurar:</b> informe Account ID, bucket e as chaves S3 do R2.'}}catch(e){badge.textContent='R2 ainda não configurado';if(help)help.textContent=LX.r2?.explain?.(e)||'Configure as credenciais do R2.'}};
  const saveSecret=async(key,value)=>{const c=LX.cloud?.db?.();if(!c)throw new Error('CLOUD_NOT_CONFIGURED');const {error}=await c.rpc('lx_admin_set_integration_secret',{p_key:key,p_value:value});if(error)throw error};
  $('saveR2')?.addEventListener('click',async()=>{const b=$('saveR2');b.disabled=true;b.textContent='Salvando…';try{const vals={r2_account_id:$('r2AccountId').value.trim(),r2_bucket:$('r2Bucket').value.trim()||'lxplus-media',r2_access_key_id:$('r2AccessKey').value.trim(),r2_secret_access_key:$('r2SecretKey').value.trim()};if(Object.values(vals).some(v=>!v))throw new Error('R2_FIELDS_REQUIRED');for(const [k,v] of Object.entries(vals))await saveSecret(k,v);$('r2AccessKey').value='';$('r2SecretKey').value='';await LX.r2?.test?.();LX.toast('Cloudflare R2 conectado e pronto para os filmes.');await refreshR2(true)}catch(e){console.warn(e);LX.toast(e?.message==='R2_FIELDS_REQUIRED'?'Preencha os quatro campos do R2.':(LX.r2?.explain?.(e)||'Não foi possível validar o R2.'))}finally{b.disabled=false;b.textContent='Salvar e testar R2'}});
  $('testR2')?.addEventListener('click',async()=>{const b=$('testR2');b.disabled=true;b.textContent='Testando…';try{await LX.r2?.test?.();LX.toast('R2 conectado. Uploads grandes liberados.');await refreshR2(true)}catch(e){console.warn(e);LX.toast(LX.r2?.explain?.(e)||'Falha ao testar o R2.')}finally{b.disabled=false;b.textContent='Testar conexão'}});
  refreshR2();
  let files=[];const inp=$('batchFiles'),zone=$('dropzone');
  const draw=()=>{$('uploadQueue').innerHTML=files.map((f,i)=>`<div class="upload-item"><div><b>${esc(f.name)}</b><small>${(f.size/1024/1024).toFixed(1)} MB · ${U.state.uploadMode==='tracks'?'faixa '+(i+1):(detect(f.name)?'E'+detect(f.name):'episódio')}</small></div><span>aguardando</span></div>`).join('')};
  $('chooseBatch').onclick=()=>inp.click();inp.onchange=()=>{files=[...inp.files];draw()};['dragenter','dragover'].forEach(e=>zone.addEventListener(e,v=>{v.preventDefault();zone.classList.add('drag')}));['dragleave','drop'].forEach(e=>zone.addEventListener(e,v=>{v.preventDefault();zone.classList.remove('drag')}));zone.ondrop=e=>{files=[...e.dataTransfer.files];draw()};
  $('processBatch').onclick=async()=>{const id=+$('batchContent')?.value,a=D.catalog(),x=a.find(z=>z.id===id);if(!x||!files.length)return LX.toast('Escolha uma obra e os arquivos.');const btn=$('processBatch');btn.disabled=true;try{if(U.state.uploadMode==='tracks'){
    x.tracks=x.tracks||[];let n=+$('batchStart')?.value||x.tracks.length+1;for(const f of files){let meta=null;try{meta=await LX.musicMeta?.probeFile?.(f)}catch(e){console.warn('LX batch music metadata',e)}const key=await S.putMedia('track_'+x.id+'_'+Date.now()+'_'+f.name,f),title=meta?.title||f.name.replace(/\.[^.]+$/,''),artist=meta?.artist||x.artist||'',cover=meta?.cover||x.cover||'';x.tracks.push({number:n++,title,artist,album:meta?.album||x.album||'',genre:meta?.genre||x.genre||'',year:meta?.year||x.year||'',duration:Number(meta?.duration||0),cover,mediaKey:key,fileName:f.name||'',mimeType:f.type||'',size:Number(f.size||0),qualityMode:'lx-auto',metadataProvider:meta?.provider||''});if(!x.artist&&artist)x.artist=artist;if((!x.cover||String(x.cover).startsWith('data:image/svg+xml'))&&cover)x.cover=cover;if((!x.banner||String(x.banner).startsWith('data:image/svg+xml'))&&cover)x.banner=cover;LX.primeMusicMedia?.(key,f)}x.tracks.sort((a,b)=>(a.number||0)-(b.number||0));
   }else{
    x.episodes=x.episodes||[];let next=Math.max(0,...x.episodes.map(e=>e.number||0))+1;for(const f of files){const n=detect(f.name)||next++;const key=await S.putMedia(`ep_${x.id}_${n}_${Date.now()}`,f);x.episodes.push({season:+$('batchSeason').value||1,number:n,title:f.name.replace(/\.[^.]+$/,''),mediaKey:key})}x.episodes.sort((a,b)=>a.season-b.season||a.number-b.number)
   }await D.saveCatalogItem(x);LX.toast(`${files.length} arquivos adicionados e sincronizados em todos os dispositivos.`);render('uploads')}catch(e){console.warn(e);LX.toast(LX.r2?.explain?.(e)||'Não foi possível concluir o upload.')}finally{if(btn)btn.disabled=false}
  }
 }
 if(page==='notifications'&&$('sendNotice'))$('sendNotice').onclick=async()=>{const t=$('noticeTitle').value.trim(),text=$('noticeText').value.trim();if(!t||!text)return LX.toast('Preencha título e mensagem.');const n=D.notices();n.unshift({id:Date.now(),title:t,text,time:$('noticeTime').value||'Agora',read:false});S.writeLocal(S.keys.notices,n);if(LX.cloud?.enabled?.())await LX.cloud.publishNotices(n).catch(e=>console.warn(e));LX.toast('Notificação publicada para todos.');render('notifications')}
 if(page==='appearance')$('brandingForm')?.addEventListener('submit',async e=>{e.preventDefault();const ids=[...document.querySelectorAll('input[name="featuredGlobal"]:checked')].slice(0,5).map(x=>+x.value),b={...(D.branding?.()||{}),splashEyebrow:$('brandEyebrow').value.trim(),splashTag:$('brandTag').value.trim(),splashTitle:$('brandTitle').value.trim(),splashSubtitle:$('brandSubtitle').value.trim(),accent:$('brandAccent').value,featuredIds:ids,legalAbout:$('brandAbout')?.value.trim()||'',legalTerms:$('brandTerms')?.value.trim()||'',legalPrivacy:$('brandPrivacy')?.value.trim()||'',supportEmail:$('brandSupport')?.value.trim()||''};try{await D.saveBranding(b);document.documentElement.style.setProperty('--accent',b.accent);LX.applyBranding?.();LX.toast('Identidade visual atualizada para a plataforma.');appearance($('adminMain'))}catch(err){console.warn(err);LX.toast('Não foi possível salvar a identidade global na nuvem.')}});
}
function detect(n){const m=n.match(/(?:E|EP|episodio|episode)[ ._-]?(\d{1,3})/i);return m?+m[1]:null}
function episodeLineParts(line,index){
 const raw=String(line||'').trim();if(!raw)return null;const parts=raw.split(/\s*\|\s*/).filter(Boolean);let number=index+1,title='',url='';
 if(parts.length>1&&/^(?:E|EP|epis[oó]dio)?\s*\d{1,3}$/i.test(parts[0])){const m=parts.shift().match(/(\d{1,3})/);number=Math.max(1,+(m?.[1]||number));url=parts.pop()||'';title=parts.join(' | ').trim()}
 else{url=parts.pop()||raw;if(parts.length)title=parts.join(' | ').trim()}
 return {number,title,url:String(url||'').trim()}
}
function parseEpisodeLinks(text,provider){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),seen=new Set(),out=[];for(let i=0;i<lines.length;i++){const row=episodeLineParts(lines[i],i);if(!row?.url)continue;if(seen.has(row.number)){const e=new Error(`EPISODE_NUMBER_DUPLICATE_${row.number}`);e.code='EPISODE_NUMBER_DUPLICATE';throw e}seen.add(row.number);out.push({...row,mediaKey:LX.mediaSources.normalize(provider,row.url)})}return out.sort((a,b)=>a.number-b.number)}
const DRIVE_QUALITY_KEYS=['2160p','1080p','720p','480p'];
const driveQualityLabel=q=>q==='2160p'?'4K':q;
function driveQualityInputId(q,episode=false){return `${episode?'cEpisodeDriveQ':'cDriveQ'}${String(q).replace(/p$/,'')}`}
function normalizedDriveQualityMap(obj={}){const out={};for(const q of DRIVE_QUALITY_KEYS){const ref=obj?.[q];if(ref&&LX.mediaSources?.modeFor?.(ref)==='gdrive')out[q]=ref}return out}
LX.driveQuality={keys:DRIVE_QUALITY_KEYS,label:driveQualityLabel,normalizeMap:normalizedDriveQualityMap};

function defaultArtwork(title,type,wide=false){const w=wide?1280:600,h=wide?720:900,label=String(title||'LX Plus').slice(0,42),kind=String(type||'Conteúdo').toUpperCase(),svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111e"/><stop offset=".55" stop-color="#123b5c"/><stop offset="1" stop-color="#071018"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${wide?1000:470}" cy="${wide?130:170}" r="${wide?260:180}" fill="#42a5ff" opacity=".18"/><text x="50%" y="46%" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="${wide?72:46}" font-weight="700">${xmlEsc(label)}</text><text x="50%" y="56%" text-anchor="middle" fill="#9fd6ff" font-family="Arial,sans-serif" font-size="${wide?24:20}" letter-spacing="5">LX PLUS · ${xmlEsc(kind)}</text></svg>`;return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`}
function xmlEsc(v){return String(v||'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&apos;'}[m]))}
async function edit(id=null,initialType=null,prefill=null){
 const x=id?D.catalog().find(z=>z.id===id):null,type=x?.type||prefill?.mediaType||initialType||'Filme',year=new Date().getFullYear(),dt=v=>{if(!v)return'';const d=new Date(v);if(Number.isNaN(+d))return'';const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
 U.state.musicAutoMeta=null;
 const acceptFor=t=>t==='Música'?'audio/*':t==='Livro'?'application/pdf,.pdf,.epub,application/epub+zip':'video/*';
 const uploadLabel=t=>['Série','Anime','Dorama'].includes(t)?'Enviar episódios':t==='Música'?'Enviar áudio':t==='Livro'?'Enviar livro':'Enviar filme';
 $('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page content-editor-page quick-editor-page"><span class="eyebrow">${x?'EDITAR':'PUBLICAR'} · LX PLUS</span><h2>${x?'Editar conteúdo':'Publicação rápida'}</h2><p class="editor-intro">Preencha só o essencial. A LX Plus configura capa padrão, player e o modo de mídia automaticamente. Use <b>Mais opções</b> somente se quiser personalizar.</p>
 <form id="contentForm" class="quick-content-form">
  <div class="quick-core">
   <div class="quick-type-badge"><small>TIPO</small><strong>${esc(type)}</strong></div>
   <label class="field">Título<input id="cTitle" required maxlength="120" value="${esc(x?.title||prefill?.title||'')}" placeholder="Nome do conteúdo"></label>
   <label class="field span2">Descrição<textarea id="cDesc" required rows="4" placeholder="Uma descrição curta para aparecer na LX Plus">${esc(x?.desc||prefill?.message||'')}</textarea></label>
   <div id="quickSeasonArea" class="quick-season-area span2 ${['Série','Anime','Dorama'].includes(type)?'':'hidden'}"><label class="field">Temporada que você está editando<input id="cSeason" type="number" min="1" max="99" value="1"></label><div class="quick-season-summary"><small>TEMPORADAS CADASTRADAS</small><div id="quickSeasonChips"></div><p>Escolha a temporada. Para links externos, você pode colar todos os episódios de uma vez; E01, E02, E03… são atualizados sem criar duplicados.</p></div></div>
   <div class="media-source-switch media-source-switch-v2542 span2"><button type="button" class="active" data-media-source="upload">↑ Arquivo/R2</button><button type="button" data-media-source="gdrive">Drive</button><button type="button" data-media-source="dropbox">Dropbox</button><button type="button" data-media-source="youtube">YouTube</button><button type="button" data-media-source="spotify">Spotify</button><button type="button" data-media-source="onedrive">OneDrive</button><button type="button" data-media-source="archive">Archive</button><button type="button" data-media-source="direct">HTTPS</button><small>Para músicas, você pode usar arquivo completo da LX Plus, Dropbox/HTTPS direto ou links oficiais do YouTube e Spotify.</small></div>
   <label id="uploadMediaField" class="field span2 quick-upload"><span id="quickUploadLabel">${uploadLabel(type)}</span><input id="typeMedia" type="file" accept="${acceptFor(type)}" ${['Série','Anime','Dorama'].includes(type)?'multiple':''}><small id="quickUploadHelp">${x?.mediaKey||x?.episodes?.length?'Já existe mídia cadastrada. Envie somente se quiser substituir ou adicionar.':'Selecione o arquivo master na melhor qualidade disponível.'}</small><small id="selectedMediaInfo" class="selected-media-info"></small></label>
   <label id="externalMediaField" class="field span2 hidden"><span id="externalMediaLabel">Link da mídia</span><input id="cExternalMedia" type="text" inputmode="url" autocomplete="off" placeholder="https://..."><div class="external-media-assist"><small id="externalMediaHelp">Cole o link compartilhado da fonte escolhida.</small><button id="testExternalMedia" class="glass-btn" type="button">Testar link</button></div><small id="externalMediaDetected" class="selected-media-info"></small></label>
   <label id="episodeBulkField" class="field span2 episode-bulk-field hidden"><span>Links dos episódios da temporada</span><textarea id="cEpisodeLinks" rows="8" spellcheck="false" placeholder="Um link por linha. Ex.:\nhttps://drive.google.com/file/d/.../view\nhttps://drive.google.com/file/d/.../view\n\nOpcional: E03 | Nome do episódio | https://..."></textarea><div class="external-media-assist"><small id="episodeBulkHelp">A ordem das linhas vira E01, E02, E03… Ao editar uma temporada, números já existentes são substituídos pelo link novo — não duplicados.</small><button id="testEpisodeLinks" class="glass-btn" type="button">Testar todos</button></div><small id="episodeBulkDetected" class="selected-media-info"></small></label>
   <section id="driveQualityField" class="drive-quality-field span2 hidden">
    <div class="drive-quality-head"><div><span class="eyebrow">QUALIDADE · GOOGLE DRIVE</span><strong>Versões opcionais por qualidade</strong><small>O link principal é a fonte original. Para oferecer 4K, 1080p, 720p ou 480p, use um arquivo realmente diferente em cada campo. Links repetidos são ignorados para não exibir qualidade falsa.</small></div><span class="drive-quality-auto">AUTO</span></div>
    <div id="driveMovieQualities" class="drive-quality-grid">
     <label class="field"><span>4K / 2160p <em>opcional</em></span><input id="cDriveQ2160" type="text" inputmode="url" autocomplete="off" placeholder="Link do arquivo 4K no Drive"></label>
     <label class="field"><span>1080p <em>opcional</em></span><input id="cDriveQ1080" type="text" inputmode="url" autocomplete="off" placeholder="Link do arquivo 1080p no Drive"></label>
     <label class="field"><span>720p <em>opcional</em></span><input id="cDriveQ720" type="text" inputmode="url" autocomplete="off" placeholder="Link do arquivo 720p no Drive"></label>
     <label class="field"><span>480p <em>opcional</em></span><input id="cDriveQ480" type="text" inputmode="url" autocomplete="off" placeholder="Link do arquivo 480p no Drive"></label>
    </div>
    <div id="driveEpisodeQualities" class="drive-episode-quality-grid hidden">
     ${DRIVE_QUALITY_KEYS.map(q=>`<label class="field"><span>${driveQualityLabel(q)} · temporada atual <em>opcional</em></span><textarea id="${driveQualityInputId(q,true)}" rows="5" spellcheck="false" placeholder="E01 | https://drive.google.com/file/d/.../view\nE02 | https://drive.google.com/file/d/.../view"></textarea></label>`).join('')}
    </div>
    <div class="drive-quality-note"><b>Como funciona:</b> com apenas o link principal, o Drive controla a qualidade automaticamente. Os campos acima criam escolhas manuais usando arquivos separados; ao trocar de qualidade o player do Drive reinicia aquele arquivo.</div>
   </section>
  </div>
  <details class="advanced-content span2" id="advancedContent"><summary>Mais opções <small>capa, gênero, classificação, destaque...</small></summary><div class="form-grid advanced-content-grid">
   <label class="field">Tipo<select id="cType">${['Filme','Série','Anime','Dorama','Livro','Música'].map(t=>`<option ${type===t?'selected':''}>${t}</option>`).join('')}</select></label>
   <label class="field">Ano<input id="cYear" type="number" min="1900" max="2100" value="${x?.year||year}"></label>
   <label class="field">Classificação<select id="cRating">${['L','10','12','14','16','18'].map(t=>`<option ${String(x?.rating||'L')===t?'selected':''}>${t}</option>`).join('')}</select></label>
   <label class="field" id="cGenreField"><span id="cGenreLabel">Gênero</span><input id="cGenre" list="musicGenreSuggestions" value="${esc(x?.genre||'Geral')}" placeholder="Geral"></label>
   <label class="field hidden" id="cMusicGenresField"><span>Outras categorias da música</span><input id="cMusicGenres" list="musicGenreSuggestions" value="${esc((x?.genres||[]).filter(g=>String(g)!==String(x?.genre||'')).join(', '))}" placeholder="Ex.: Românticas, Universitário"><small>Separe por vírgulas. A música pode aparecer em várias categorias.</small></label>
   <datalist id="musicGenreSuggestions">${(LX.musicCategoryList?.(D.catalog().filter(i=>i.type==='Música'),true)||LX.musicCategoryDefaults||[]).map(g=>`<option value="${esc(g)}"></option>`).join('')}</datalist>
   <label class="field">Status<select id="cStatus"><option ${x?.published!==false?'selected':''}>Publicado</option><option ${x?.published===false?'selected':''}>Rascunho</option></select></label>
   <label class="field">Capa personalizada <span class="optional">opcional</span><input id="cCover" type="file" accept="image/*"><small>Formato recomendado: pôster vertical 2:3 (ex.: 1000×1500). Se não enviar, a LX cria uma capa automática.</small></label>
   <label class="field">Banner personalizado <span class="optional">opcional</span><input id="cBanner" type="file" accept="image/*"><small>Banner horizontal 16:9. Se não enviar, a LX usa a capa como fundo cinematográfico.</small></label>
   <label class="field span2 carousel-art-field">Imagem do carrossel / Destaque Home <span class="optional">opcional</span><input id="cCarouselImage" type="file" accept="image/*"><small>Use uma imagem horizontal em alta qualidade, preferencialmente 1920×1080 ou maior. Ela é usada somente no carrossel principal; capa e banner continuam independentes.</small><span id="carouselImageState" class="selected-media-info">${x?.carouselImage?'✓ Imagem de carrossel já cadastrada. Envie outra para substituir.':'Se não enviar, o carrossel usa o banner ou a capa.'}</span></label>
   <div class="auto-quality-note span2"><div><b>LX Auto Quality</b><small>Envie somente o arquivo master. Nenhum link de qualidade é necessário.</small></div><span>MASTER</span></div>
   <label class="field">Agendar lançamento <span class="optional">opcional</span><input id="cSchedule" type="datetime-local" value="${dt(x?.scheduledAt)}"></label>
   <label class="field">Prioridade<input id="cPriority" type="number" min="-100" max="100" value="${+x?.priority||0}"></label>
   <label class="check"><input id="cFeatured" type="checkbox" ${x?.featured?'checked':''}><span>Mostrar na página principal / destaque</span></label>
   <label class="check"><input id="cTrending" type="checkbox" ${x?.trending?'checked':''}><span>Em alta</span></label>
   <label class="field span2">Créditos <span class="optional">opcional</span><input id="typeA" value="${esc(x?.director||x?.creator||x?.studio||x?.author||x?.artist||'')}" placeholder="Diretor, criador, estúdio, autor ou artista"></label><label id="musicProviderField" class="field ${type==='Música'?'':'hidden'}"><span>Provedor principal</span><input id="cMusicProvider" readonly value="${esc(x?.sourceProvider||'LX Media')}"><small>Identificado pela fonte selecionada.</small></label><label id="musicRemoteField" class="field ${type==='Música'?'':'hidden'}"><span>ID remoto</span><input id="cMusicRemote" readonly value="${esc(x?.providerRemoteId||x?.youtubeVideoId||x?.spotifyTrackId||'')}"><small>Identificador do vídeo ou faixa, quando houver.</small></label><label id="authorizedAudioField" class="field span2 ${type==='Música'?'':'hidden'}"><span>Fonte direta autorizada de áudio <em class="optional">opcional</em></span><input id="cAuthorizedAudio" type="url" inputmode="url" autocomplete="off" value="${esc(x?.authorizedAudioUrl||x?.authorizedStreamUrl||'')}" placeholder="https://.../audio.mp3 ou endpoint autorizado"><small>Use um arquivo ou endpoint HTTPS de áudio permitido. Um link de página do YouTube/Spotify não é uma fonte direta; a reprodução em segundo plano depende da fonte e do navegador.</small></label>
  </div></details>
  <div id="quickSaveStatus" class="quick-save-status span2"></div>
  <div class="editor-actions span2"><button type="button" class="glass-btn" id="saveDraftBtn">Salvar rascunho</button><button class="primary-btn" id="publishBtn">${x?'Salvar alterações':'Publicar agora'}</button></div>
 </form></div>`;
 $('overlay').classList.remove('hidden');
 const isEpisodic=()=>['Série','Anime','Dorama'].includes($('cType').value);
 const seasonEpisodes=sn=>[...(x?.episodes||[])].filter(e=>(+e.season||1)===(+sn||1)).sort((a,b)=>(+a.number||0)-(+b.number||0));
 const episodeLineFor=(e,ref)=>{const link=LX.mediaSources?.toInput?.(ref)||'';if(!link)return'';const title=String(e.title||'').trim();return `E${String(+e.number||1).padStart(2,'0')}${title&&!/^Epis[oó]dio\s+\d+$/i.test(title)?` | ${title}`:''} | ${link}`};
 const fillDriveMovieQualities=()=>{if(isEpisodic())return;const map=normalizedDriveQualityMap(x?.qualitySources||{});for(const q of DRIVE_QUALITY_KEYS){const el=$(driveQualityInputId(q));if(el)el.value=LX.mediaSources?.toInput?.(map[q])||''}};
 const fillDriveEpisodeQualities=()=>{if(!isEpisodic())return;const sn=Math.max(1,+$('cSeason')?.value||1),eps=seasonEpisodes(sn);for(const q of DRIVE_QUALITY_KEYS){const area=$(driveQualityInputId(q,true));if(area)area.value=eps.map(e=>episodeLineFor(e,e.qualitySources?.[q])).filter(Boolean).join('\n')}};
 const fillSeasonLinks=()=>{const area=$('cEpisodeLinks');if(!area||!isEpisodic())return;const sn=Math.max(1,+$('cSeason')?.value||1),eps=seasonEpisodes(sn);area.value=eps.map(e=>episodeLineFor(e,e.mediaKey)).filter(Boolean).join('\n');$('episodeBulkDetected').textContent=eps.length?`${eps.length} episódio${eps.length===1?'':'s'} carregado${eps.length===1?'':'s'} da T${sn} para edição.`:'';fillDriveEpisodeQualities()};
 const renderSeasonSummary=()=>{const box=$('quickSeasonChips');if(!box)return;const eps=(x?.episodes||[]),counts=new Map();eps.forEach(e=>{const sn=+e.season||1;counts.set(sn,(counts.get(sn)||0)+1)});box.innerHTML=counts.size?[...counts.entries()].sort((a,b)=>a[0]-b[0]).map(([sn,n])=>`<button type="button" class="season-chip" data-season-chip="${sn}">T${sn} · ${n} ep.</button>`).join(''):'<span class="season-empty">Nenhuma temporada enviada ainda.</span>';$$('[data-season-chip]').forEach(b=>b.onclick=()=>{$('cSeason').value=b.dataset.seasonChip;fillSeasonLinks()})};
 const updateExternalFields=()=>{const episodic=isEpisodic(),external=mediaSource!=='upload',drive=mediaSource==='gdrive';$('externalMediaField')?.classList.toggle('hidden',!external||episodic);$('episodeBulkField')?.classList.toggle('hidden',!external||!episodic);$('driveQualityField')?.classList.toggle('hidden',!drive);$('driveMovieQualities')?.classList.toggle('hidden',!drive||episodic);$('driveEpisodeQualities')?.classList.toggle('hidden',!drive||!episodic);if(external&&episodic)fillSeasonLinks();if(drive&&!episodic)fillDriveMovieQualities()};
 const updateUpload=()=>{const t=$('cType').value,inp=$('typeMedia'),episodic=['Série','Anime','Dorama'].includes(t),music=t==='Música';$('quickUploadLabel').textContent=uploadLabel(t);inp.accept=acceptFor(t);inp.multiple=episodic;$('quickUploadHelp').textContent=(x?.mediaKey||x?.episodes?.length)?'Já existe mídia cadastrada. Envie somente se quiser substituir ou adicionar.':'Selecione o arquivo master na melhor qualidade disponível.';$('quickSeasonArea')?.classList.toggle('hidden',!episodic);$('cMusicGenresField')?.classList.toggle('hidden',!music);$('musicProviderField')?.classList.toggle('hidden',!music);$('musicRemoteField')?.classList.toggle('hidden',!music);$('authorizedAudioField')?.classList.toggle('hidden',!music);if($('cGenreLabel'))$('cGenreLabel').textContent=music?'Gênero principal':'Gênero';if(music&&$('cGenre')?.value==='Geral')$('cGenre').value='Outros';renderSeasonSummary();updateExternalFields()};
 const existingRef=x?.mediaKey||x?.episodes?.find?.(e=>e.mediaKey)?.mediaKey||x?.tracks?.find?.(t=>t.mediaKey)?.mediaKey||'';const videoType=['Filme','Série','Anime','Dorama'].includes(type),musicType=type==='Música';let mediaSource=existingRef?(LX.mediaSources?.modeFor?.(existingRef)||'upload'):(videoType?'gdrive':'upload');
 const updateMusicIdentity=()=>{if($('cType')?.value!=='Música')return;const names={upload:'LX Media',youtube:'YouTube',spotify:'Spotify',dropbox:'Dropbox',direct:'HTTPS',gdrive:'Google Drive',onedrive:'OneDrive',archive:'Archive.org'},raw=String($('cExternalMedia')?.value||((LX.mediaSources?.modeFor?.(existingRef)||'upload')===mediaSource?existingRef:'')).trim();if($('cMusicProvider'))$('cMusicProvider').value=names[mediaSource]||mediaSource;const remote=mediaSource==='youtube'?(raw.match(/(?:youtube:|[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/)([\w-]{11})/)||[])[1]:mediaSource==='spotify'?(raw.match(/(?:spotify:track:|\/track\/)([\w]{22})/)||[])[1]:'';if($('cMusicRemote'))$('cMusicRemote').value=remote||''};
 const setMediaSource=mode=>{if(!LX.mediaSources?.allowedFor?.($('cType').value,mode)){LX.toast('Essa fonte não é compatível com esse tipo de conteúdo.');mode='upload'}mediaSource=mode;$$('[data-media-source]').forEach(b=>{const ok=!!LX.mediaSources?.allowedFor?.($('cType').value,b.dataset.mediaSource);b.classList.toggle('active',b.dataset.mediaSource===mode);b.disabled=!ok;b.hidden=$('cType').value==='Música'&&!ok});$('uploadMediaField')?.classList.toggle('hidden',mode!=='upload');const info=LX.mediaSources?.info?.[mode];if(info&&mode!=='upload'){$('externalMediaLabel').textContent=info.label;$('cExternalMedia').placeholder=info.placeholder;$('externalMediaHelp').textContent=info.help;$('externalMediaDetected').textContent='';$('episodeBulkHelp').textContent=`${info.label}: cole um episódio por linha. A LX valida e salva todos de uma vez; ao editar, E01/E02/etc. são substituídos pelo link novo.`}updateExternalFields();updateMusicIdentity()};
 $$('[data-media-source]').forEach(b=>b.onclick=()=>setMediaSource(b.dataset.mediaSource));
 const existingMode=existingRef?(LX.mediaSources?.modeFor?.(existingRef)||'upload'):(videoType?'gdrive':'upload');if(existingMode!=='upload'&&!['Série','Anime','Dorama'].includes(type))$('cExternalMedia').value=LX.mediaSources?.toInput?.(existingRef)||'';setMediaSource(existingMode);renderSeasonSummary();fillSeasonLinks();fillDriveMovieQualities();
 $('testExternalMedia').onclick=async()=>{try{const raw=$('cExternalMedia').value,d=LX.mediaSources.preview(mediaSource,raw);$('externalMediaDetected').textContent=`✓ ${d.provider} reconhecido · pronto para salvar`;if($('cType').value==='Música'&&mediaSource==='youtube')await LX.musicMeta?.fillEditorFromYoutube?.(raw,{force:!x});else if(d.openUrl)window.open(d.openUrl,'_blank','noopener')}catch(err){$('externalMediaDetected').textContent='';LX.toast(err.message==='YOUTUBE_LINK_INVALID'?'YouTube: cole um link válido de vídeo ou YouTube Music.':(err.message||'Não reconheci esse link.'))}};
 $('cExternalMedia')?.addEventListener('input',updateMusicIdentity);$('cExternalMedia')?.addEventListener('blur',()=>{if($('cType')?.value==='Música'&&mediaSource==='youtube'&&$('cExternalMedia')?.value?.trim())LX.musicMeta?.fillEditorFromYoutube?.($('cExternalMedia').value.trim(),{force:!x}).catch(()=>{})});
 $('testEpisodeLinks').onclick=()=>{try{const rows=parseEpisodeLinks($('cEpisodeLinks').value,mediaSource);if(!rows.length)throw new Error('Cole pelo menos um link.');let variants=0;if(mediaSource==='gdrive'){for(const q of DRIVE_QUALITY_KEYS){const area=$(driveQualityInputId(q,true));if(area?.value.trim())variants+=parseEpisodeLinks(area.value,'gdrive').length}}$('episodeBulkDetected').textContent=`✓ ${rows.length} link${rows.length===1?'':'s'} princip${rows.length===1?'al':'ais'} válido${rows.length===1?'':'s'}${variants?` · ${variants} variante${variants===1?'':'s'} de qualidade`:''} · T${Math.max(1,+$('cSeason').value||1)} pronta para salvar`;LX.toast(`${rows.length} episódios reconhecidos${variants?` + ${variants} versões de qualidade`:''}.`)}catch(err){$('episodeBulkDetected').textContent='';LX.toast(err.message||'Não reconheci os links dos episódios.')}};
 $('cSeason').onchange=fillSeasonLinks;$('cSeason').oninput=()=>{$('episodeBulkDetected').textContent='';fillDriveEpisodeQualities()};
 updateUpload();$('cType').onchange=()=>{if($('cType').value!=='Música')U.state.musicAutoMeta=null;updateUpload();setMediaSource(mediaSource)};$('typeMedia').onchange=async()=>{const files=[...($('typeMedia').files||[])],el=$('selectedMediaInfo');if(!el)return;el.textContent=files.length?files.map(f=>`${f.name} · ${(f.size/1024/1024).toFixed(1)} MB`).join(' | '):'';if($('cType').value==='Música'&&files[0])await LX.musicMeta?.fillEditorFromFile?.(files[0],{force:!x})};
 $('saveDraftBtn').onclick=()=>{$('cStatus').value='Rascunho';$('contentForm').requestSubmit()};
 $('contentForm').onsubmit=async e=>{
  e.preventDefault();const status=$('quickSaveStatus'),btn=$('publishBtn'),onProgress=ev=>{const d=ev.detail||{};status.textContent=`Enviando ${d.name||'arquivo'}… ${d.percent||0}%`};window.addEventListener('lx-upload-progress',onProgress);status.textContent='Enviando e sincronizando com a nuvem…';btn.disabled=true;
  try{
   const y=x?{...x}:{id:Date.now(),newRelease:true,progress:0,createdAt:new Date().toISOString()};
   y.title=$('cTitle').value.trim();y.type=$('cType').value;y.desc=$('cDesc').value.trim();y.year=+$('cYear').value||year;y.rating=$('cRating').value||'L';y.genre=$('cGenre').value.trim()||(y.type==='Música'?'Outros':'Geral');if(y.type==='Música'){y.genres=[...new Set([y.genre,...splitList($('cMusicGenres')?.value||'')].map(g=>String(g||'').trim()).filter(Boolean))]}else if(Array.isArray(y.genres))delete y.genres;y.published=$('cStatus').value==='Publicado';y.featured=$('cFeatured').checked;y.trending=$('cTrending').checked;y.priority=+$('cPriority').value||0;y.scheduledAt=$('cSchedule').value?new Date($('cSchedule').value).toISOString():null;y.qualityMode='lx-auto';delete y.hlsUrl;delete y.qualitySources;if(y.published&&!y.publishedAt)y.publishedAt=new Date().toISOString();
   const credit=$('typeA').value.trim();
   if(y.type==='Filme')y.director=credit||y.director||'';if(['Série','Dorama'].includes(y.type))y.creator=credit||y.creator||'';if(y.type==='Anime')y.studio=credit||y.studio||'';if(y.type==='Livro')y.author=credit||y.author||'';if(y.type==='Música'){y.artist=credit||y.artist||'';y.sourceProvider=mediaSource;y.providerRemoteId=$('cMusicRemote')?.value?.trim()||'';const authUrl=$('cAuthorizedAudio')?.value?.trim()||'';if(authUrl){let host='';try{const url=new URL(authUrl);if(url.protocol!=='https:')throw new Error();host=url.hostname.toLowerCase()}catch{throw new Error('AUTHORIZED_AUDIO_HTTPS_REQUIRED')}if(/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|spotify\.com)$/.test(host)||LX.mediaSources?.describe?.(authUrl)?.kind==='embed')throw new Error('AUTHORIZED_AUDIO_DIRECT_REQUIRED');y.authorizedAudioUrl=authUrl}else delete y.authorizedAudioUrl}
   const smartMusic=y.type==='Música'?(U.state.musicAutoMeta||null):null;if(smartMusic){if(!String(y.desc||'').trim())y.desc=smartMusic.desc||'';if(!y.artist)y.artist=smartMusic.artist||'';if(!y.album)y.album=smartMusic.album||'';if(!y.year&&smartMusic.year)y.year=+smartMusic.year||smartMusic.year;if((!y.genre||['Geral','Outros'].includes(y.genre))&&smartMusic.genre)y.genre=smartMusic.genre;if(smartMusic.remoteId)y.remoteId=y.remoteId||smartMusic.remoteId;if(smartMusic.externalUrl)y.externalMusicUrl=y.externalMusicUrl||smartMusic.externalUrl;y.metadataProvider=smartMusic.provider||y.metadataProvider||'LX Music'}
   const coverFile=$('cCover').files?.[0],bannerFile=$('cBanner').files?.[0],carouselFile=$('cCarouselImage').files?.[0];
   const files=[...($('typeMedia').files||[])],uploadedNow=[];
   // Preflight de armazenamento ANTES de enviar capa/banner. Evita arquivos órfãos e mensagens genéricas.
   if(mediaSource==='upload'&&files.length&&LX.cloud?.enabled?.()){
    const needsR2=files.some(f=>(f?.size||0)>45*1024*1024);
    if(needsR2){
     let st=null;
     try{st=await LX.r2?.status?.(true)}catch(e){throw e}
     if(!st?.configured){const e=new Error('R2_NOT_CONFIGURED');e.code='R2_NOT_CONFIGURED';throw e}
    }
   }
   if(coverFile)y.cover=await dataUrl(coverFile);else if(y.type==='Música'&&smartMusic?.cover)y.cover=smartMusic.cover;if(!y.cover)y.cover=defaultArtwork(y.title,y.type,false);if(bannerFile)y.banner=await dataUrl(bannerFile);if(carouselFile)y.carouselImage=await dataUrl(carouselFile);if(['Filme','Série','Anime','Dorama'].includes(y.type)&&(!y.banner||LX.isAutoArtwork?.(y.banner)))y.banner=y.cover||defaultArtwork(y.title,y.type,true);if(['Livro','Música'].includes(y.type)){delete y.banner;delete y.carouselImage;}
   let expectedMediaKey=null,expectedEpisodes=[],expectedQualities=[];if(mediaSource!=='upload'){
    if(!LX.mediaSources?.allowedFor?.(y.type,mediaSource)){const e=new Error('MEDIA_PROVIDER_TYPE_UNSUPPORTED');e.code='MEDIA_PROVIDER_TYPE_UNSUPPORTED';throw e}
    if(['Série','Anime','Dorama'].includes(y.type)){
     const season=Math.max(1,+$('cSeason')?.value||1),rows=parseEpisodeLinks($('cEpisodeLinks')?.value||'',mediaSource);y.episodes=[...(y.episodes||[])];
     if(rows.length){for(const row of rows){const idx=y.episodes.findIndex(ep=>(+ep.season||1)===season&&(+ep.number||0)===row.number),old=idx>=0?y.episodes[idx]:null,ep={...(old||{}),season,number:row.number,title:row.title||old?.title||`Episódio ${row.number}`,mediaKey:row.mediaKey,qualityMode:mediaSource==='gdrive'?'drive-auto':'external',sourceProvider:mediaSource};if(idx>=0)y.episodes[idx]=ep;else y.episodes.push(ep);expectedEpisodes.push({season,number:row.number,mediaKey:row.mediaKey})}}
     if(mediaSource==='gdrive'){
      const qRows={};for(const q of DRIVE_QUALITY_KEYS){const area=$(driveQualityInputId(q,true));qRows[q]=area?.value.trim()?parseEpisodeLinks(area.value,'gdrive'):[]}
      const seasonExisting=y.episodes.filter(ep=>(+ep.season||1)===season);for(const ep of seasonExisting){ep.qualitySources={...(ep.qualitySources||{})};for(const q of DRIVE_QUALITY_KEYS)delete ep.qualitySources[q]}
      for(const q of DRIVE_QUALITY_KEYS){for(const row of qRows[q]){const ep=y.episodes.find(e=>(+e.season||1)===season&&(+e.number||0)===row.number);if(!ep){const er=new Error('QUALITY_EPISODE_MAIN_REQUIRED');er.code='QUALITY_EPISODE_MAIN_REQUIRED';throw er}const used=new Set([String(ep.mediaKey||''),...Object.values(ep.qualitySources||{}).map(String)]);if(used.has(String(row.mediaKey||'')))continue;ep.qualitySources={...(ep.qualitySources||{}),[q]:row.mediaKey};ep.qualityMode='drive-multi';expectedQualities.push({scope:'episode',season,number:row.number,q,mediaKey:row.mediaKey})}}
      for(const ep of seasonExisting)if(ep.qualitySources&&!Object.keys(ep.qualitySources).length)delete ep.qualitySources
     }
     y.episodes.sort((a,b)=>(+a.season||1)-(+b.season||1)||(+a.number||0)-(+b.number||0));
    }else{
     const entered=$('cExternalMedia')?.value?.trim()||'';if(entered){const externalKey=LX.mediaSources.normalize(mediaSource,entered);y.mediaKey=externalKey;expectedMediaKey=externalKey;y.autoQuality={status:'external',source:mediaSource,updatedAt:new Date().toISOString()};if(y.type==='Música')y.tracks=[{number:1,title:y.title,artist:y.artist||smartMusic?.artist||'',duration:Number(smartMusic?.duration||0),cover:smartMusic?.cover||y.cover||'',mediaKey:externalKey,authorizedAudioUrl:y.authorizedAudioUrl||'',qualityMode:y.authorizedAudioUrl?'authorized-audio':'external'}]}
     if(mediaSource==='gdrive'&&['Filme'].includes(y.type)){y.qualitySources={};const used=new Set([String(y.mediaKey||'')]);for(const q of DRIVE_QUALITY_KEYS){const val=$(driveQualityInputId(q))?.value?.trim()||'';if(!val)continue;const ref=LX.mediaSources.normalize('gdrive',val);if(used.has(String(ref)))continue;used.add(String(ref));y.qualitySources[q]=ref;expectedQualities.push({scope:'main',q,mediaKey:ref})}if(!Object.keys(y.qualitySources).length){delete y.qualitySources;if(y.mediaKey)y.qualityMode='drive-auto'}else y.qualityMode='drive-multi'}
    }
   }
   else if(files.length){
    if(['Série','Anime','Dorama'].includes(y.type)){y.episodes=y.episodes||[];const season=Math.max(1,+$('cSeason')?.value||1);let next=Math.max(0,...y.episodes.filter(e=>(+e.season||1)===season).map(e=>+e.number||0))+1;for(const f of files){const key=await S.putMedia(`episode_${y.id}_S${season}E${next}_${Date.now()}_${f.name}`,f);uploadedNow.push(key);y.episodes.push({season,number:next,title:f.name.replace(/\.[^.]+$/,''),mediaKey:key,qualityMode:'lx-auto',autoQuality:{status:'ready',source:String(key).startsWith('r2:')?'r2':'upload'}});next++}}
    else{const f=files[0],key=await S.putMedia(`main_${y.id}_${Date.now()}_${f.name}`,f);uploadedNow.push(key);y.mediaKey=key;y.autoQuality={status:'ready',source:String(key).startsWith('r2:')?'r2':'upload',updatedAt:new Date().toISOString()};if(y.type==='Música'){y.tracks=[{number:1,title:y.title,artist:y.artist||smartMusic?.artist||'',duration:Number(smartMusic?.duration||0),cover:smartMusic?.cover||y.cover||'',mediaKey:key,qualityMode:'lx-auto',fileName:f.name||'',mimeType:f.type||'',size:Number(f.size||0)}];LX.primeMusicMedia?.(key,f)}}
   }
   const missing=[!y.title?'Título':null,!String(y.desc||'').trim()?'Descrição':null,!mediaReady(y)?'Arquivo':null].filter(Boolean);if(y.published&&missing.length){y.published=false;status.textContent=`Salvo como rascunho: falta ${missing.join(', ')}.`}else status.textContent='Salvando no Supabase…';
   await D.saveCatalogItem(y);
   const confirmed=D.catalog().find(z=>Number(z.id)===Number(y.id));if(expectedMediaKey&&confirmed?.mediaKey!==expectedMediaKey){const e=new Error('CATALOG_MEDIA_UPDATE_NOT_CONFIRMED');e.code='CATALOG_MEDIA_UPDATE_NOT_CONFIRMED';throw e}for(const want of expectedEpisodes){const got=confirmed?.episodes?.find(ep=>(+ep.season||1)===want.season&&(+ep.number||0)===want.number);if(!got||got.mediaKey!==want.mediaKey){const e=new Error('CATALOG_EPISODE_UPDATE_NOT_CONFIRMED');e.code='CATALOG_EPISODE_UPDATE_NOT_CONFIRMED';throw e}}for(const want of expectedQualities){const got=want.scope==='main'?confirmed?.qualitySources?.[want.q]:confirmed?.episodes?.find(ep=>(+ep.season||1)===want.season&&(+ep.number||0)===want.number)?.qualitySources?.[want.q];if(got!==want.mediaKey){const e=new Error('CATALOG_QUALITY_UPDATE_NOT_CONFIRMED');e.code='CATALOG_QUALITY_UPDATE_NOT_CONFIRMED';throw e}}
   U.close();LX.toast(y.published?'Publicado e sincronizado para todos os dispositivos.':'Rascunho salvo na nuvem.');U.state.libraryType=y.type;render(catalogPageForType(y.type));LX.ui?.renderApp?.();
  }catch(err){
   console.warn('LX catalog save failed',err);
   const code=String(err?.code||err?.status||err?.message||'');
   let msg='Não foi possível publicar. Confira os dados e tente novamente.';
   if(/R2_NOT_CONFIGURED|R2_INTEGRATION_INCOMPLETE/.test(code))msg='Filme grande bloqueado: o Cloudflare R2 ainda não está configurado. Vá em ADM → Mídia & Upload → Cloudflare R2.';
   else if(/R2_BUCKET_NOT_FOUND/.test(code))msg='O bucket do Cloudflare R2 não foi encontrado. Confira o nome do bucket no ADM.';
   else if(/R2_CREDENTIALS_REJECTED|R2_UPLOAD_HTTP_403/.test(code))msg='O Cloudflare R2 recusou as credenciais. Confira Access Key, Secret Key e permissão Object Read & Write.';
   else if(/R2_UPLOAD_NETWORK/.test(code))msg='O navegador não conseguiu enviar ao R2. Teste a conexão no ADM e revise o CORS do bucket.';
   else if(/R2_SINGLE_UPLOAD_TOO_LARGE/.test(code))msg='Esse arquivo passou de 5 GB. Use uma versão menor ou upload multipart.';
   else if(/AUTHORIZED_AUDIO_HTTPS_REQUIRED/.test(code))msg='Áudio autorizado: use uma URL HTTPS direta do endpoint/arquivo liberado pelo provedor.';
   else if(/AUTHORIZED_AUDIO_DIRECT_REQUIRED/.test(code))msg='Use uma fonte HTTPS direta de áudio. Um link de página ou embed do YouTube/Spotify não pode ser reproduzido no áudio nativo.';
   else if(/INVALID_EXTERNAL_MEDIA_URL/.test(code))msg='Use um link HTTPS direto para o arquivo de mídia.';
   else if(/GDRIVE_LINK_INVALID/.test(code))msg='Google Drive: copie o link do arquivo e deixe “Qualquer pessoa com o link” como leitor.';
   else if(/DROPBOX_LINK_INVALID/.test(code))msg='Dropbox: cole um link compartilhado HTTPS do arquivo.';
   else if(/YOUTUBE_LINK_INVALID/.test(code))msg='YouTube: cole um link válido de vídeo, YouTube Music ou playlist.';
   
   
   else if(/ONEDRIVE_EMBED_REQUIRED/.test(code))msg='OneDrive: use Mais → Incorporar → Gerar e cole o URL de embed ou o iframe.';
   else if(/ARCHIVE_LINK_INVALID/.test(code))msg='Archive.org: use um link /details/ ou /embed/ válido.';
   else if(/EPISODE_NUMBER_DUPLICATE/.test(code))msg='Há dois links com o mesmo número de episódio. Use E01, E02, E03… sem repetir.';
   else if(/QUALITY_EPISODE_MAIN_REQUIRED/.test(code))msg='Uma qualidade extra aponta para um episódio que não existe no link principal. Cadastre primeiro E01/E02/etc. no campo principal da temporada.';
   else if(/CATALOG_MEDIA_UPDATE_NOT_CONFIRMED/.test(code))msg='A nuvem não confirmou a troca do link. O editor ficou aberto para você tentar novamente; o link antigo não será tratado como atualizado.';
   else if(/CATALOG_EPISODE_UPDATE_NOT_CONFIRMED/.test(code))msg='A nuvem não confirmou um dos novos links dos episódios. Revise a temporada e salve novamente.';
   else if(/CATALOG_QUALITY_UPDATE_NOT_CONFIRMED/.test(code))msg='A nuvem não confirmou uma das qualidades do Google Drive. O editor ficou aberto para você revisar o link e salvar novamente.';
   else if(/MEDIA_PROVIDER_TYPE_UNSUPPORTED/.test(code))msg='Essa fonte não é compatível com esse tipo de conteúdo. Para música use arquivo/R2, Dropbox ou HTTPS; para livro use arquivo/R2 ou HTTPS.';
   else if(err?.lxOperation==='catalog_rpc_upsert')msg='O arquivo foi preparado, mas o catálogo recusou a publicação. Nenhuma alteração foi confirmada; tente novamente.';
   else if(/^R2_|R2/.test(code)&&LX.r2?.explain)msg=LX.r2.explain(err);
   // No ADM, expõe um código curto para diagnóstico sem vazar chaves/segredos.
   if(code&&msg.indexOf(code)===-1&&/^R2_|PGRST|4\d\d|5\d\d/.test(code))msg+=` [${code.slice(0,48)}]`;
   status.textContent=msg;LX.toast(msg)
  }finally{btn.disabled=false;window.removeEventListener('lx-upload-progress',onProgress)}
 };
}
function splitList(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function togglePublish(id){const x=D.catalog().find(z=>z.id===id);if(!x)return;const y={...x};if(y.published===false){const missing=[!y.title?'Título':null,!String(y.desc||'').trim()?'Descrição':null,!mediaReady(y)?'Arquivo':null].filter(Boolean);if(missing.length)return LX.toast(`Não pode publicar ainda: falta ${missing.join(', ')}.`);y.published=true;y.publishedAt=y.publishedAt||new Date().toISOString()}else y.published=false;try{await D.saveCatalogItem(y);render(U.state.adminPage||catalogPageForType(y.type));LX.ui?.renderApp?.()}catch(err){console.warn(err);LX.toast('Falha na nuvem. A alteração não foi aplicada.')}}
async function toggleFeatured(id){const x=D.catalog().find(z=>z.id===id);if(!x)return;const y={...x,featured:!x.featured};try{await D.saveCatalogItem(y);render(U.state.adminPage||catalogPageForType(y.type));LX.ui?.renderApp?.()}catch(err){console.warn(err);LX.toast('Falha na nuvem. A alteração não foi aplicada.')}}
async function priority(id,delta){const x=D.catalog().find(z=>z.id===id);if(!x)return;const y={...x,priority:(+x.priority||0)+delta};try{await D.saveCatalogItem(y);render(U.state.adminPage||catalogPageForType(y.type));LX.ui?.renderApp?.()}catch(err){console.warn(err);LX.toast('Falha na nuvem. A alteração não foi aplicada.')}}
function preview(id){const x=D.catalog().find(z=>z.id===id);if(!x)return;U.renderApp();U.show('app');setTimeout(()=>LX.detail(id),0)}
function fromRequest(id){const r=D.requests().find(x=>x.id===id);if(!r)return;reqStatus(id,'Em análise');edit(null,r.mediaType,{mediaType:r.mediaType,title:r.title,message:r.message})}
async function dataUrl(f){return S.putAsset(`asset_${Date.now()}_${f.name}`,f)}
function del(id){
 const item=D.catalog().find(z=>Number(z.id)===Number(id));if(!item)return LX.toast('Esse conteúdo já não existe no catálogo.');
 const n=Number(id);
 if(pendingAdmin.deleteIds.has(n)){pendingAdmin.deleteIds.delete(n);persistPending();LX.toast('Exclusão cancelada.');return render(U.state.adminPage||catalogPageForType(item.type))}
 pendingAdmin.deleteIds.add(n);persistPending();LX.toast('Marcado para excluir. Agora clique em Salvar alterações.');render(U.state.adminPage||catalogPageForType(item.type));
}
function testMusic(id){
 const item=D.catalog().find(x=>Number(x.id)===Number(id));if(!item||!mediaReady(item))return LX.toast('Cadastre uma fonte antes de testar a música.');
 const ref=item.authorizedAudioUrl||item.tracks?.[0]?.authorizedAudioUrl||item.tracks?.[0]?.mediaKey||item.mediaKey||'',desc=LX.mediaSources?.describe?.(ref);
 LX.music?.(id,0,true);
 if(desc?.kind==='embed'){LX.toast('Player oficial aberto abaixo. Confira o som no controle do provedor.');return}
 const audio=$('musicAudio');if(!audio)return;
 const mark=String(id)+'|0';let finished=false,timer;
 const done=ok=>{if(finished)return;finished=true;clearTimeout(timer);audio.removeEventListener('playing',onPlaying);if(audio.dataset.trackMark!==mark)return;LX.toast(ok?'Teste: áudio iniciado. Confira duração e avanço da barra.':'Teste: a faixa não iniciou. Confira a fonte e o status do player.')};
 const onPlaying=()=>{if(audio.dataset.trackMark===mark)done(true)};
 audio.addEventListener('playing',onPlaying);timer=setTimeout(()=>done(!audio.paused&&audio.readyState>=2),12000);
}
function verify(id){
 const x=D.users().find(z=>String(z.id)===String(id));if(!x)return LX.toast('Usuário não encontrado.');
 const key=String(id),current=stagedVerified(x),next=!current;
 if(next===!!x.verified)pendingAdmin.verified.delete(key);else pendingAdmin.verified.set(key,next);
 persistPending();LX.toast(next?'Selo marcado. Salve as alterações para confirmar.':'Remoção do selo marcada. Salve as alterações.');render('community');
}
function approveUser(id){const x=D.users().find(z=>String(z.id)===String(id));if(!x)return LX.toast('Usuário não encontrado.');const key=String(id);if(x.approved){pendingAdmin.access.delete(key)}else pendingAdmin.access.set(key,'approve');persistPending();LX.toast('Aprovação marcada. Clique em Salvar alterações.');render('community')}
function rejectUser(id){const x=D.users().find(z=>String(z.id)===String(id));if(!x)return LX.toast('Usuário não encontrado.');const key=String(id);if(x.approvalStatus==='rejected'&&!x.approved){pendingAdmin.access.delete(key)}else pendingAdmin.access.set(key,'reject');persistPending();LX.toast('Recusa marcada. Clique em Salvar alterações.');render('community')}
function discardPending(scope=U.state.adminPage||'dashboard'){pendingAdmin.verified.clear();pendingAdmin.deleteIds.clear();pendingAdmin.access.clear();persistPending();LX.toast('Alterações pendentes descartadas.');render(scope)}
async function saveChanges(scope=U.state.adminPage||'dashboard'){
 const verified=[...pendingAdmin.verified.entries()].map(([user_id,verified])=>({user_id,verified}));
 const access=[...pendingAdmin.access.entries()].map(([user_id,action])=>({user_id,action}));
 const deleteIds=[...pendingAdmin.deleteIds];
 const total=verified.length+access.length+deleteIds.length;if(!total)return LX.toast('Não há alterações pendentes.');
 const btn=$('adminGlobalCommit')||document.querySelector('.admin-save-primary');if(btn){btn.disabled=true;btn.textContent='Salvando…'}
 let success=0;const errors=[];
 LX.toast('Salvando e confirmando no Supabase…');
 for(const x of verified){try{await LX.cloud.setVerified(x.user_id,x.verified);pendingAdmin.verified.delete(String(x.user_id));success++}catch(e){console.warn('verify save',e);errors.push(`selo: ${e?.message||'erro'}`)}}
 for(const x of access){try{if(x.action==='approve')await LX.cloud.approveUser(x.user_id);else await LX.cloud.rejectUser(x.user_id);pendingAdmin.access.delete(String(x.user_id));success++}catch(e){console.warn('access save',e);errors.push(`acesso: ${e?.message||'erro'}`)}}
 for(const id of deleteIds){try{const result=await LX.cloud.deleteCatalogItem(id);if(result?.deleted===false)throw new Error('DELETE_NOT_CONFIRMED');pendingAdmin.deleteIds.delete(Number(id));success++}catch(e){console.warn('delete save',e);errors.push(`exclusão: ${e?.message||'erro'}`)}}
 if(success){LX.toast(`${success} alteração${success===1?'':'ões'} salva${success===1?'':'s'} e confirmada${success===1?'':'s'}.`);await LX.social?.refreshDirectory?.().catch?.(()=>{});LX.ui?.renderApp?.()}
 if(errors.length){console.warn('LX ADM save errors',errors);LX.toast(`${errors.length} alteração${errors.length===1?'':'ões'} não foi${errors.length===1?'':'ram'} salva${errors.length===1?'':'s'}: ${errors[0].slice(0,80)}`);}
 persistPending();render(scope);
}
async function deletePendingUser(id){if(!confirm('Excluir definitivamente este cadastro pendente?'))return;try{await LX.cloud.deletePendingUser(id);LX.toast('Cadastro pendente excluído.');render('community')}catch(err){console.warn(err);LX.toast('Só é possível excluir contas pendentes e não aprovadas.')}}
async function reqStatus(id,status){const a=D.requests(),x=a.find(z=>z.id===id);if(x){x.status=status;x.updated=Date.now();D.saveRequests(a)}if(LX.cloud?.enabled?.())await LX.cloud.updateRequestStatus(id,status).catch(e=>console.warn(e));render('requests')}
async function premiumSet(email,plan){const user=D.users().find(x=>x.email===email);if(LX.cloud?.enabled?.()&&user?.id){await LX.cloud.setPremium(user.id,plan,true).catch(e=>{console.warn(e);LX.toast('Falha ao ativar Premium na nuvem.')});D.track('admin_premium',{email,plan,active:true});LX.toast(`Premium ${plan.toLowerCase()} ativado para todos os dispositivos.`);return render('premium')}const a=D.subscriptions(),days=plan==='Anual'?365:30;a[email]={active:true,plan,started:Date.now(),until:Date.now()+days*86400000,demo:true};D.saveSubscriptions(a);LX.toast(`Premium ${plan.toLowerCase()} ativado.`);render('premium')}
async function premiumOff(email){const user=D.users().find(x=>x.email===email);if(LX.cloud?.enabled?.()&&user?.id){await LX.cloud.setPremium(user.id,D.subscriptions()[email]?.plan||'Mensal',false).catch(e=>console.warn(e));D.track('admin_premium',{email,active:false});LX.toast('Premium desativado na nuvem.');return render('premium')}const a=D.subscriptions();a[email]={...(a[email]||{}),active:false,ended:Date.now()};D.saveSubscriptions(a);LX.toast('Premium desativado.');render('premium')}
LX.admin={render,edit,del,verify,saveChanges,discardPending,approveUser,rejectUser,deletePendingUser,makeAdmin,removeAdmin,reqStatus,premiumSet,premiumOff,togglePublish,toggleFeatured,priority,preview,fromRequest,testMusic,pendingCount,updateSaveDock,addMusicCategory,renameMusicCategory,deleteMusicCategory};updateSaveDock();})();

window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES.admin='31.2';

/* ===== app.js · LX Plus v27.0 ===== */
/* LX APP CORE */
(async()=>{const LX=window.LX,D=LX.data,S=LX.store,U=LX.ui,$=U.$,$$=U.$$ ,state=U.state,esc=U.esc;
// Critical shell is bound before any optional initialization step.
try{const openAuth=()=>{try{U.show('auth');U.authTab('login')}catch{window.LXShell?.show?.('auth');window.LXShell?.authTab?.('login')}};if($('enterSplash'))$('enterSplash').onclick=openAuth;if($('skipSplash'))$('skipSplash').onclick=openAuth}catch(e){console.warn('LX shell bind',e)}
for(const [name,fn] of [['seed',()=>D.seed()],['branding',()=>applyBranding()],['posterWalls',()=>U.posterWalls()],['theme',()=>applyTheme()]]){try{fn()}catch(e){console.warn('LX startup '+name,e)}}
// v25.36: interface first; cloud starts in the background and can never freeze splash/login.
const lxCloudReady=Promise.resolve().then(()=>LX.ensureSupabase?.()).then(()=>LX.cloud?.initPublic?.()).then(()=>{U.posterWalls();if(state.screen==='app')U.renderApp();return true}).catch(e=>{console.warn('LX cloud background boot',e);return false});
const LX_VIEW_KEY='lxplus_view_v2527';

function shellModeCategory(mode){return mode==='Assistir'?'Início':mode==='Ouvir'?'Início':mode==='Ler'?'Início':mode==='Ao vivo'?'Hoje':'Início'}
function syncPremiumShell(){
 const name=state.profile?.name||state.user?.name||'LX Plus',email=state.user?.email||'';
 const n=$('lxShellName');if(n)n.textContent=name;
 const av=$('lxShellAvatar');if(av){const html=LX.avatarHTML?.(name,email,'avatar-inline');if(html)av.innerHTML=html;else av.textContent=String(name).slice(0,2).toUpperCase()}
 $$('[data-shell-mode]').forEach(b=>b.classList.toggle('active',b.dataset.shellMode===state.mode));
 $$('[data-shell-category]').forEach(b=>b.classList.toggle('active',b.dataset.shellCategory===state.category&&state.mode==='Assistir'));
 const music=D.catalog().filter(x=>x.published!==false&&x.type==='Música').slice(0,5),list=$('lxRightMusicList');
 if(list)list.innerHTML=music.length?music.map(x=>`<button type="button" onclick="LX.music(${x.id},0)"><span style="background-image:url('${String(x.cover||x.banner||'').replace(/'/g,'%27')}')"></span><div><b>${esc(x.title)}</b><small>${esc(x.artist||'LX Music')}</small></div><i>▶</i></button>`).join(''):'<p>Adicione músicas no catálogo para preencher esta área.</p>';
 try{syncRightMusicRail()}catch(e){console.warn('LX right music rail sync',e)}
}
function syncRightMusicRail(){
 const t=currentMusic?.(),a=$('musicAudio'),sp=t&&isSpotifyTrack?.(t),external=$('musicDock')?.classList.contains('external-provider'),paused=t?(external?providerPlayback.paused:(a?.paused!==false)):true;
 const title=$('lxRightMusicTitle'),artist=$('lxRightMusicArtist'),cover=$('lxRightMusicCover'),playBtn=$('lxRightMusicPlay'),prog=$('lxRightMusicProgress'),time=$('lxRightMusicTime'),dur=$('lxRightMusicDuration');
 if(title)title.textContent=t?.title||'LX Music';if(artist)artist.textContent=t?.artist||'Escolha uma música';
 if(cover){cover.style.backgroundImage=t?.cover?`url("${String(t.cover).replace(/"/g,'%22')}")`:'';cover.classList.toggle('has-cover',!!t?.cover)}
 if(playBtn)playBtn.textContent=paused?'▶':'❚❚';
 let pos=0,total=0;if(sp){pos=(spotifyPlayback.position||0)/1000;total=(spotifyPlayback.duration||0)/1000}else if(external){pos=Number(providerPlayback.position)||0;total=Number(providerPlayback.duration)||Number(t?.duration)||0}else if(a){pos=+a.currentTime||0;total=+a.duration||+t?.duration||0}
 if(prog){prog.value=total?Math.min(100,pos/total*100):0;prog.disabled=!t}
 if(time)time.textContent=LX.fmt(pos||0);if(dur)dur.textContent=total?LX.fmt(total):(external?'—':'0:00');
}
LX.syncPremiumShell=syncPremiumShell;
LX.syncRightMusicRail=syncRightMusicRail;
function bindPremiumShell(){
 $$('[data-shell-mode]').forEach(b=>{if(b.dataset.lxBound)return;b.dataset.lxBound='1';b.addEventListener('click',()=>{state.mode=b.dataset.shellMode;state.category=shellModeCategory(state.mode);$$('[data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.mode===state.mode));U.renderApp();saveView()})});
 $$('[data-shell-category]').forEach(b=>{if(b.dataset.lxBound)return;b.dataset.lxBound='1';b.addEventListener('click',()=>{state.mode='Assistir';state.category=b.dataset.shellCategory;$$('[data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.mode==='Assistir'));U.renderApp();saveView()})});
 $$('[data-shell-community]').forEach(b=>{if(b.dataset.lxBound)return;b.dataset.lxBound='1';b.addEventListener('click',()=>LX.social?.open?.('friends'))});
 const p=$('lxRightMusicProgress');if(p&&!p.dataset.lxBound){p.dataset.lxBound='1';p.addEventListener('input',()=>{const main=$('musicProgress');if(!main)return;main.value=p.value;main.dispatchEvent(new Event('input',{bubbles:true}));syncRightMusicRail()})}
 syncPremiumShell();
}
window.addEventListener('DOMContentLoaded',()=>{bindPremiumShell();setInterval(()=>{if(state.user)syncRightMusicRail()},700)},{once:true});

function readView(){try{return JSON.parse(sessionStorage.getItem(LX_VIEW_KEY)||'null')}catch{return null}}
function saveView(){try{const watch=activeVideoEl&&activePlayerMeta?{id:activePlayerMeta.id,ep:activePlayerMeta.ep?.number||1,season:activePlayerMeta.ep?.season||null,position:+activeVideoEl.currentTime||0,duration:+activeVideoEl.duration||0}:null;if(watch&&watch.duration>0)saveProgress(watch.id,watch.position/watch.duration*100,watch.position,watch.duration,activePlayerMeta?.context||'main',activePlayerMeta?.ep||null);sessionStorage.setItem(LX_VIEW_KEY,JSON.stringify({screen:state.screen,mode:state.mode,category:state.category,query:state.query,musicView:state.musicView||'home',musicGenre:state.musicGenre||'Todos',musicSort:state.musicSort||'recent',scrollY:window.scrollY||0,profile:state.profile?.id||'main',adminPage:U.state.adminPage||'dashboard',watch,community:document.documentElement.classList.contains('lx-community-open')}))}catch{}}
function restoreView(){const v=readView();if(!v||!state.user||!['app','admin'].includes(v.screen))return false;state.mode=v.mode||'Assistir';state.category=v.category||'Início';state.query=v.query||'';state.musicView=v.musicView||state.musicView||'home';state.musicGenre=v.musicGenre||state.musicGenre||'Todos';state.musicSort=v.musicSort||state.musicSort||'recent';state.profile={id:v.profile||'main',name:state.user?.name||'Usuário',kids:v.profile==='kids'};if(v.screen==='admin'&&state.user?.admin&&LX.admin){LX.admin.render(v.adminPage||'dashboard');U.show('admin')}else{U.renderApp();U.show('app')}setTimeout(()=>{window.scrollTo(0,+v.scrollY||0);if(v.community)LX.social?.open?.('friends');if(v.watch?.id)LX.play?.(+v.watch.id,+v.watch.ep||1,v.watch.season||null)},350);return true}
window.addEventListener('pagehide',saveView);window.addEventListener('beforeunload',saveView);let lxViewTimer=null;window.addEventListener('scroll',()=>{clearTimeout(lxViewTimer);lxViewTimer=setTimeout(saveView,180)},{passive:true});setInterval(()=>{if(state.user)saveView()},1800);if(!LX.cloud?.enabled?.()&&LX.config.production){const h=$('devHint');if(h)h.textContent='Conectando à nuvem LX… Você ainda pode usar a interface enquanto isso.'}
function approvalCopy(status='pending'){if(status==='rejected')return 'Seu cadastro não foi aprovado. Entre em contato com o suporte da LX Plus.';return 'Cadastro recebido. Aguarde a confirmação por e-mail ou a aprovação manual do ADM. O prazo informado é de até 24 horas. Depois da aprovação, entre novamente com o mesmo e-mail e senha.'}
function showApprovalWaiting(user,status=user?.approvalStatus||'pending'){state.user=user||state.user;U.show('auth');U.authTab('login');const box=$('loginApprovalStatus');if(box){box.textContent=approvalCopy(status);box.classList.remove('hidden','pending','rejected');box.classList.add(status==='rejected'?'rejected':'pending')}if(user?.email)$('loginEmail').value=user.email}
function clearApprovalWaiting(){const box=$('loginApprovalStatus');if(box){box.classList.add('hidden');box.classList.remove('pending','rejected');box.textContent=''}}
function enterMainApp(user,notify=true){
 state.user=user||state.user;if(!state.user)return;
 state.profile={id:'main',name:state.user.name||'Usuário',kids:false};
 const p=$('profileBtn');if(p)p.innerHTML=LX.avatarHTML?.(state.profile.name,state.user.email||'','avatar-inline')||'LX';
 U.renderApp();U.show('app');saveView();
 if(notify)LX.toast(state.user.admin?'Conta ADM conectada.':'Bem-vindo à LX Plus.');
}
const authHash=new URLSearchParams(location.hash.replace(/^#/,'')),authError=authHash.get('error_code'),authErrorDesc=authHash.get('error_description');
// Render immediately. Session restore happens after the controls are already interactive.
if(authError){U.show('auth');setTimeout(()=>LX.toast(authError==='otp_expired'?'Esse link expirou. Você também pode aguardar a aprovação manual do ADM.':(authErrorDesc||'Não foi possível validar esse link.')),250);history.replaceState(null,'',location.pathname+location.search)}else U.show(window.__LX_INTRO_DONE?'auth':'splash');
setTimeout(async()=>{
  if(state.user)return;
  const resumed=await Promise.race([D.auth.resume?.().catch(()=>null),new Promise(r=>setTimeout(()=>r(null),4500))]);
  if(!resumed?.user||state.user)return;
  state.user=resumed.user;
  if(LX.cloud?.isRecoveryFlow?.()){U.show('auth');return openPasswordRecovery()}
  if(!resumed.user.admin&&!resumed.user.approved)return showApprovalWaiting(resumed.user);
  clearApprovalWaiting();
  if(!restoreView())enterMainApp(resumed.user,false);
  LX.social?.boot?.();LX.chat?.boot?.();
},0);
$$('.password-toggle').forEach(btn=>btn.onclick=()=>{const input=$(btn.dataset.passwordTarget);if(!input)return;const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'◉':'◉';btn.classList.toggle('active',show);btn.setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');btn.title=show?'Ocultar senha':'Mostrar senha'});
if($('enterSplash'))$('enterSplash').onclick=()=>{U.show('auth');U.authTab('login')};if($('skipSplash'))$('skipSplash').onclick=()=>{U.show('auth');U.authTab('login')};$('tabLogin').onclick=()=>U.authTab('login');$('tabRegister').onclick=()=>{clearApprovalWaiting();resetRegisterForEdit();U.authTab('register')};$('forgotBtn').onclick=async()=>{await LX.ensureSupabase().catch(()=>false);const email=$('loginEmail').value.trim().toLowerCase();if(!email)return LX.toast('Digite seu e-mail primeiro.');try{await D.auth.resetPassword(email);LX.toast('Enviamos o link de recuperação para seu e-mail.')}catch{LX.toast('Não foi possível enviar a recuperação agora.')}};$('resendConfirmBtn').onclick=async()=>{await LX.ensureSupabase().catch(()=>false);const email=$('loginEmail').value.trim().toLowerCase();if(!email)return LX.toast('Digite seu e-mail primeiro.');try{await D.auth.resendConfirmation(email);LX.toast('Novo e-mail de confirmação enviado. Use apenas o link mais recente.')}catch(err){console.warn(err);LX.toast(String(err?.message||'').includes('security purposes')?'Aguarde cerca de 1 minuto e tente novamente.':'Não foi possível reenviar a confirmação agora.')}};
let registerInFlight=false,registerLockedAfterSuccess=false,lastRegisterEmail='';function setRegisterStatus(text='',lockAfterSuccess=false){const box=$('registerStatus'),btn=$('registerSubmit'),retry=$('registerRetryBtn');if(!box||!btn)return;if(!text){box.classList.add('hidden');box.textContent='';registerLockedAfterSuccess=false;btn.disabled=false;btn.textContent='Criar conta';retry?.classList.add('hidden');return}box.textContent=text;box.classList.remove('hidden');registerLockedAfterSuccess=!!lockAfterSuccess;btn.disabled=registerLockedAfterSuccess;btn.textContent=registerLockedAfterSuccess?'Cadastro enviado':'Criar conta';retry?.classList.toggle('hidden',!registerLockedAfterSuccess)}function resetRegisterForEdit(){registerLockedAfterSuccess=false;registerInFlight=false;const btn=$('registerSubmit');if(btn){btn.disabled=false;btn.textContent='Criar conta'}$('registerRetryBtn')?.classList.add('hidden');const box=$('registerStatus');if(box){box.classList.add('hidden');box.textContent=''}}
$('registerForm').onsubmit=async e=>{e.preventDefault();if(registerInFlight||registerLockedAfterSuccess)return;const name=$('regName').value.trim(),email=$('regEmail').value.trim().toLowerCase(),p=$('regPass').value,p2=$('regPass2').value,btn=$('registerSubmit');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return LX.toast('Confira o e-mail e tente novamente.');if(p.length<8)return LX.toast('A senha precisa ter pelo menos 8 caracteres.');if(p!==p2)return LX.toast('As senhas não coincidem. Corrija e tente novamente.');try{await LX.ensureSupabase();registerInFlight=true;lastRegisterEmail=email;btn.disabled=true;btn.textContent='Criando...';const out=await D.auth.register({name,email,password:p,ranking:$('regRanking').checked});if(out.needsConfirmation||out.user?.needsConfirmation){setRegisterStatus('Cadastro recebido. Se você digitou o e-mail errado, toque em “Corrigir dados e tentar novamente”. O cadastro correto pode ser feito normalmente com outro e-mail. A confirmação por e-mail ou a aprovação do ADM pode liberar o acesso.',true);LX.toast('Cadastro recebido. Confira o e-mail digitado.');return}state.user=out.user;S.writeLocal(S.keys.session,{email});if(!out.user?.admin&&!out.user?.approved){setRegisterStatus('Conta criada e aguardando aprovação do ADM. Se o e-mail estiver errado, corrija os dados e crie outra conta.',true);showApprovalWaiting(out.user);LX.toast('Cadastro aguardando aprovação.');return}clearApprovalWaiting();enterMainApp(out.user,true);LX.social?.boot?.();}catch(err){console.warn(err);const msg=String(err?.message||'');registerLockedAfterSuccess=false;if(msg==='EMAIL_EXISTS'||/already registered|already exists|user_already_exists/i.test(msg)){setRegisterStatus('Esse e-mail já possui cadastro. Você pode corrigir o e-mail e tentar de novo, ou entrar com a conta existente.',false);LX.toast('Esse e-mail já está cadastrado.');return}if(err?.status===429||/rate limit|security purposes|429|email rate/i.test(msg)){setRegisterStatus('O Supabase limitou temporariamente os e-mails de confirmação. Seus campos continuam liberados: corrija o e-mail ou a senha e tente novamente. Se outro e-mail também falhar, o limite do projeto ainda está ativo e será preciso aguardar a liberação ou usar SMTP próprio.',false);LX.toast('Limite temporário de e-mail. O formulário não ficou bloqueado.');return}if(/password/i.test(msg)){setRegisterStatus('A senha não foi aceita. Corrija a senha e tente novamente.',false);return}if(msg==='CLOUD_NOT_CONFIGURED'){setRegisterStatus('A nuvem ainda não foi configurada pelo administrador.',false);LX.toast('A nuvem ainda não foi configurada.');return}setRegisterStatus('Não foi possível concluir o cadastro. Corrija os dados e tente novamente.',false);LX.toast('Não foi possível criar a conta.')}finally{registerInFlight=false;if(!registerLockedAfterSuccess&&btn){btn.disabled=false;btn.textContent='Criar conta'}}};
$('registerRetryBtn').onclick=()=>{resetRegisterForEdit();$('regEmail')?.focus()};['regName','regEmail','regPass','regPass2'].forEach(id=>$(id)?.addEventListener('input',()=>{if(registerLockedAfterSuccess)return;const box=$('registerStatus');if(box&&!box.classList.contains('hidden')){box.classList.add('hidden');box.textContent=''}const btn=$('registerSubmit');if(btn&&!registerInFlight){btn.disabled=false;btn.textContent='Criar conta'}}));
window.__LX_LOGIN_READY=true;$('loginForm').onsubmit=async e=>{e.preventDefault();const email=$('loginEmail').value.trim().toLowerCase(),password=$('loginPass').value,btn=e.currentTarget.querySelector('button[type=submit]');if(!email||!password)return LX.toast('Preencha e-mail e senha.');try{if(btn){btn.disabled=true;btn.textContent='Entrando…'}await LX.ensureSupabase();const {user}=await D.auth.login(email,password);if(!user)throw new Error('LOGIN_EMPTY_USER');state.user=user;S.writeLocal(S.keys.session,{email});if(!user.admin&&!user.approved){showApprovalWaiting(user,user.approvalStatus);LX.toast('Seu cadastro ainda aguarda aprovação.');return}clearApprovalWaiting();enterMainApp(user,true);LX.social?.boot?.();LX.chat?.boot?.()}catch(err){console.warn('LX login',err);const msg=String(err?.message||'');if(/email not confirmed|email_not_confirmed/i.test(msg)){const box=$('loginApprovalStatus');if(box){box.textContent=approvalCopy('pending');box.classList.remove('hidden','rejected');box.classList.add('pending')}return LX.toast('Aguardando confirmação por e-mail ou aprovação do ADM.')}if(err?.status===429||/rate limit|429/i.test(msg))return LX.toast('Limite temporário do Supabase atingido. Aguarde e tente novamente.');if(/Failed to load Supabase|CLOUD_NOT_CONFIGURED|SDK/i.test(msg))return LX.toast('Não consegui conectar à nuvem. Sua tela não será recarregada; tente novamente em alguns segundos.');U.show('auth');U.authTab('login');LX.toast(msg&&msg!=='Invalid login credentials'?('Falha ao entrar: '+msg.slice(0,110)):'Não foi possível entrar. Confira seu e-mail e senha.')}finally{if(btn){btn.disabled=false;btn.textContent='Entrar'}}};
$('profileLogout').onclick=$('adminLogout').onclick=logout;async function logout(){await LX.social?.shutdown?.().catch?.(()=>{});await D.auth.logout?.().catch(()=>{});state.user=null;state.profile=null;try{localStorage.removeItem('lx16_session')}catch{};U.show('auth')}
$('brandHome').onclick=e=>{e.preventDefault();state.category='Início';state.query='';if($('searchInput'))$('searchInput').value='';U.renderApp();saveView()};$('searchBtn').onclick=()=>{$('searchWrap').classList.toggle('open');$('searchInput').focus()};$('searchInput').oninput=e=>{state.query=e.target.value.trim();if(state.query)D.track('search',{query:state.query});state.mode==='Ouvir'?U.renderApp():U.renderHome()};$('requestBtn').onclick=openRequests;$('notifyBtn').onclick=openNotifications;$('premiumBtn').onclick=openPremium;$('themeBtn').onclick=openTheme;$('profileBtn').onclick=openProfile;$('adminTopBtn').onclick=()=>{LX.admin.render(U.state.adminPage||'dashboard');U.show('admin');saveView()};$('adminPreview').onclick=()=>{U.renderApp();U.show('app');saveView()};
function closeMobileMore(){const sheet=$('mobileMoreSheet'),back=$('mobileMoreBackdrop');sheet?.classList.add('hidden');back?.classList.add('hidden');sheet?.setAttribute('aria-hidden','true')}
function openMobileMore(){const sheet=$('mobileMoreSheet'),back=$('mobileMoreBackdrop');sheet?.classList.remove('hidden');back?.classList.remove('hidden');sheet?.setAttribute('aria-hidden','false')}
function syncMobileNavState(){let key='Início';if(state.mode==='Ouvir')key='Música';else if(state.mode==='Ler')key='Livros';else if(state.mode==='Assistir'&&state.category==='Filmes')key='Filmes';else if(state.mode==='Assistir'&&state.category==='Séries')key='Séries';else if(state.mode==='Ao vivo'||(state.mode==='Assistir'&&!['Início','Filmes','Séries'].includes(state.category)))key='Mais';$$('[data-mobile]').forEach(y=>y.classList.toggle('active',y.dataset.mobile===key))}
LX.syncMobileNavState=syncMobileNavState;
function mobileGo(mode,category='Início'){state.mode=mode;state.category=category;state.query='';if(mode==='Ouvir')state.musicView='home';if($('searchInput'))$('searchInput').value='';$$('[data-mode]').forEach(y=>y.classList.toggle('active',y.dataset.mode===mode));closeMobileMore();U.renderApp();saveView();syncMobileNavState();window.scrollTo({top:0,behavior:'instant'})}
$$('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;state.category=b.dataset.mode==='Ao vivo'?'Hoje':'Início';state.query='';if($('searchInput'))$('searchInput').value='';$$('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));U.renderApp();syncMobileNavState();saveView()});
$$('[data-mobile]').forEach(b=>b.onclick=()=>{const x=b.dataset.mobile;if(x==='Início')return mobileGo('Assistir','Início');if(x==='Filmes')return mobileGo('Assistir','Filmes');if(x==='Séries')return mobileGo('Assistir','Séries');if(x==='Música')return mobileGo('Ouvir','Início');if(x==='Livros')return mobileGo('Ler','Início');if(x==='Mais')return openMobileMore()});
$$('[data-mobile-close]').forEach(b=>b.onclick=closeMobileMore);
$$('[data-mobile-more]').forEach(b=>b.onclick=()=>{const x=b.dataset.mobileMore;if(x==='Buscar'){closeMobileMore();$('searchWrap')?.classList.add('open');$('searchInput')?.focus();return}if(x==='Animes')return mobileGo('Assistir','Animes');if(x==='Doramas')return mobileGo('Assistir','Doramas');if(x==='Ao vivo')return mobileGo('Ao vivo','Hoje');if(x==='Minha Lista'){closeMobileMore();state.category='Minha Lista';U.renderApp();saveView();return}if(x==='Comunidade'){closeMobileMore();return LX.social?.open?.('friends')}if(x==='Pedidos'){closeMobileMore();return openRequests()}if(x==='Ranking'){closeMobileMore();return openRanking()}if(x==='Perfil'){closeMobileMore();return openProfile()}});
window.addEventListener('scroll',()=>$('topbar')?.classList.toggle('scrolled',scrollY>24),{passive:true});
$$('[data-admin]').forEach(b=>b.onclick=()=>{$$('[data-admin]').forEach(x=>x.classList.toggle('active',x===b));LX.admin.render(b.dataset.admin);try{b.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}catch{}});
function record(x){const h=D.history();h[x.id]={...(h[x.id]||{}),opened:Date.now(),progress:h[x.id]?.progress??x.progress??0};S.write(S.keys.history,h);D.track('open',{id:x.id,title:x.title,type:x.type})}
function toggleList(id){let l=D.myList(),has=l.some(x=>String(x)===String(id));l=has?l.filter(x=>String(x)!==String(id)):[...l,id];S.write(S.keys.list,l);LX.toast(has?'Removido da Minha Lista.':'Adicionado à Minha Lista.');U.renderApp()}
function rate(id,n){const r=D.ratings();r[id]=n;D.saveRatings(r);D.track('rate',{id,rating:n});LX.toast(`Avaliação ${n}/5 salva.`);detail(id)}
function detail(id){
 const x=D.catalog().find(i=>i.id===id);if(!x)return;
 record(x);
 const history=D.history()[x.id]||{},rating=D.ratings()[id]||0,rel=D.catalog().filter(y=>y.id!==x.id&&(y.genre===x.genre||y.type===x.type)).slice(0,8),creator=x.director||x.creator||x.studio||x.author||x.artist||'LX Plus',heroArt=LX.cinematicArt?.(x)||x.banner||x.cover||'',posterArt=x.cover||heroArt,primaryLabel=x.type==='Livro'?'▤ Ler':x.type==='Música'?'♫ Ouvir':((history.progress>0&&history.progress<98&&history.position>4)?`▶ Continuar · ${LX.fmt(history.position)}`:'▶ Assistir'),meta=[x.rating,x.genre,x.duration||((x.tracks?.length||0)>1?`${x.tracks.length} faixas`:''),x.year].filter(Boolean),about=(x.desc||'Sem descrição disponível.').trim(),tagline=about.length>180?about.slice(0,177)+'…':about,extras=[['Ano',x.year||'—'],['Classificação',x.rating||'Livre'],['Gênero',x.genre||'—'],['Criador',creator],['Tipo',x.type||'—'],['Formato',x.type==='Música'?`${x.tracks?.length||1} ${((x.tracks?.length||1)===1?'faixa':'faixas')}`:['Série','Anime','Dorama'].includes(x.type)?`${x.episodes?.length||0} episódios`:x.type==='Livro'?`${x.chapters?.length||0} capítulos`:'Longa / título único']];
 $('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="detail-shell detail-shell-v256 detail-kind-${String(x.type||'').toLowerCase()}"><div class="detail-hero" style="background-image:url('${heroArt}')"><div class="detail-hero-inner"><div class="detail-poster" style="background-image:url('${posterArt}')"></div><div class="detail-copy"><span class="eyebrow">${esc(x.type)} · ${x.year||'Agora'}</span><h2>${esc(x.title)}</h2><div class="hero-meta detail-meta-chips">${meta.map(v=>`<span>${esc(v)}</span>`).join('')}</div><p class="detail-tagline">${esc(tagline)}</p><div class="hero-actions"><button class="primary-btn" onclick="LX.primary(${x.id})">${primaryLabel}</button><button class="secondary-btn" onclick="LX.toggleList(${x.id})">${D.myList().includes(x.id)?'✓ Na minha lista':'＋ Minha lista'}</button></div></div></div></div><div class="detail-body"><div class="detail-summary-grid"><div class="detail-description-card"><span class="eyebrow">SINOPSE</span><p>${esc(about)}</p></div><aside class="detail-side-info">${extras.map(([k,v])=>`<div><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}</aside></div><div class="rating-row"><span style="color:var(--muted);font-size:11px">Sua avaliação</span>${[1,2,3,4,5].map(n=>`<button class="${n===rating?'active':''}" onclick="LX.rate(${id},${n})">★</button>`).join('')}</div><div class="detail-tabs"><button class="active" data-tab="main">Visão geral</button>${['Série','Anime','Dorama'].includes(x.type)?'<button data-tab="episodes">Episódios</button>':''}${x.type==='Livro'?'<button data-tab="chapters">Capítulos</button>':''}${x.type==='Música'?'<button data-tab="tracks">Faixas</button>':''}<button data-tab="related">Relacionados</button></div><div id="detailTab">${tab(x,'main',rel)}</div></div></div>`;
 $('overlay').classList.remove('hidden');
 $$('[data-tab]').forEach(b=>b.onclick=()=>{$$('[data-tab]').forEach(z=>z.classList.toggle('active',z===b));$('detailTab').innerHTML=tab(x,b.dataset.tab,rel)})
}
function episodesTab(x,selectedSeason=null){const eps=[...(x.episodes||[])].sort((a,b)=>(+a.season||1)-(+b.season||1)||(+a.number||0)-(+b.number||0));if(!eps.length)return '<div class="notice">Nenhum episódio publicado ainda.</div>';const seasons=[...new Set(eps.map(e=>+e.season||1))].sort((a,b)=>a-b),histSeason=+(D.history()[x.id]?.episode?.season||0),season=seasons.includes(+selectedSeason)?+selectedSeason:(seasons.includes(histSeason)?histSeason:seasons[0]),list=eps.filter(e=>(+e.season||1)===season),h=D.history()[x.id]||{};return `<div class="season-browser"><div class="season-picker"><span>Temporadas</span>${seasons.map(sn=>`<button class="${sn===season?'active':''}" onclick="LX.selectSeason(${x.id},${sn})">T${sn}</button>`).join('')}</div><div class="season-heading"><div><span class="eyebrow">TEMPORADA ${season}</span><h3>${list.length} ${list.length===1?'episódio':'episódios'}</h3></div>${h.episode?.season===season?`<small>Continuar: E${h.episode.number}</small>`:''}</div><div class="episode-grid">${list.map(e=>`<article class="episode-item ${h.episode?.season===season&&h.episode?.number===e.number?'is-current':''}"><b class="episode-index">E${String(e.number||0).padStart(2,'0')}</b><div class="episode-copy"><strong>${esc(e.title||`Episódio ${e.number}`)}</strong><small>${esc(e.duration||`Temporada ${season}`)}</small></div><button onclick="LX.play(${x.id},${e.number},${season})">▶ Reproduzir</button></article>`).join('')}</div></div>`}
function tab(x,t,rel){if(t==='episodes')return episodesTab(x);if(t==='chapters')return `<div class="chapter-grid">${(x.chapters||[]).map((c,i)=>`<div class="chapter-item"><b>${i+1}</b><div><strong>${esc(c.title)}</strong><small>Capítulo ${i+1}</small></div><button onclick="LX.read(${x.id},${i})">Ler</button></div>`).join('')}</div>`;if(t==='tracks')return `<div class="track-grid">${(x.tracks||[]).map((c,i)=>`<article class="track-item"><b>${i+1}</b><div><strong>${esc(c.title)}</strong><small>${esc(c.artist||x.artist||'LX Music')} · ${LX.fmt(c.duration||0)}</small></div><button onclick="LX.music(${x.id},${i})">▶</button></article>`).join('')||'<div class="notice">Nenhuma faixa enviada ainda.</div>'}</div>`;if(t==='related')return `<div class="related-grid">${rel.map(r=>`<button class="related-card" onclick="LX.detail(${r.id})"><div style="background-image:url('${r.cover||LX.cinematicArt?.(r)||r.banner||''}')"></div><strong>${esc(r.title)}</strong><small>${esc(r.type||'Conteúdo')}</small></button>`).join('')||'<div class="notice">Ainda não há relacionados suficientes.</div>'}</div>`;const creator=x.director||x.creator||x.studio||x.author||x.artist||'LX',format=x.type==='Música'?`${x.tracks?.length||1} ${((x.tracks?.length||1)===1?'faixa':'faixas')}`:['Série','Anime','Dorama'].includes(x.type)?`${x.episodes?.length||0} episódios`:x.type==='Livro'?`${x.chapters?.length||0} capítulos`:'Título único';return `<div class="detail-overview-compact"><span><small>CRIADOR</small><strong>${esc(creator)}</strong></span><span><small>FORMATO</small><strong>${esc(format)}</strong></span>${x.duration?`<span><small>DURAÇÃO</small><strong>${esc(x.duration)}</strong></span>`:''}</div>`}
function primary(id){const x=D.catalog().find(i=>i.id===id);if(!x)return;if(x.type==='Livro')read(id,D.history()[id]?.readerChapter||0);else if(x.type==='Música')music(id,D.history()[id]?.musicIndex||0);else{const h=D.history()[id],epNo=['Série','Anime','Dorama'].includes(x.type)?(h?.episode?.number||1):1,epSeason=['Série','Anime','Dorama'].includes(x.type)?(h?.episode?.season||null):null;play(id,epNo,epSeason)}}
let activePlayerMeta=null,activeVideoEl=null,activePlayerCleanup=null;
async function play(id,epNum=1,epSeason=null){
 const x=D.catalog().find(i=>i.id===id);if(!x)return;
 stopMiniPlayer(false);D.track('play',{id,title:x.title});
 const episodic=['Série','Anime','Dorama'].includes(x.type),orderedEpisodes=episodic?[...(x.episodes||[])].sort((a,b)=>(+a.season||1)-(+b.season||1)||(+a.number||0)-(+b.number||0)):[],ep=episodic?(orderedEpisodes.find(e=>(epSeason==null||(+e.season||1)===+epSeason)&&(+e.number||0)===+epNum)||orderedEpisodes.find(e=>+e.number===+epNum)||orderedEpisodes[0]):null,media=ep||x;let key=media?.mediaKey||x.mediaKey;
 const epIndex=ep?orderedEpisodes.findIndex(e=>e===ep):-1,nextEp=epIndex>=0?orderedEpisodes[epIndex+1]:null;
 const subtitleTracks=[...(x.subtitleTracks||[]),...(media?.subtitleTracks||[])].filter((t,i,a)=>t?.url&&a.findIndex(z=>z.url===t.url)===i);
 const mediaCandidateIndex=new Map();
 const resolveMedia=async ref=>{if(!ref)return null;const info=LX.mediaSources?.describe?.(ref);if(info?.kind==='direct'){const rows=Array.isArray(info.streamCandidates)?info.streamCandidates.filter(Boolean):[];if(rows.length){const idx=Math.max(0,Math.min(rows.length-1,Number(mediaCandidateIndex.get(String(ref))||0)));return rows[idx]}return info.src}if(/^https?:\/\//i.test(String(ref)))return ref;const b=await S.getMedia(ref);return b?(typeof b==='string'?b:URL.createObjectURL(b)):null};
 const hist=D.history()[id]||{},context=ep?`S${ep.season||1}E${ep.number}`:'main',pref=S.read(S.keys.playerPrefs,{volume:1,muted:false}),poster=LX.cinematicArt?.(x)||x.banner||x.cover||'';
 const old=document.getElementById('lxGlobalCinema');if(old)old.remove();
 const host=document.createElement('div');host.id='lxGlobalCinema';host.setAttribute('role','dialog');host.setAttribute('aria-label',`Reproduzindo ${x.title}`);host.style.cssText='position:fixed;inset:0;width:100vw;height:100dvh;z-index:2147483647;background:#000;display:block;';document.body.appendChild(host);
 document.documentElement.classList.add('lx-player-open');document.body.classList.add('lx-player-open');
 const sourceInfo=LX.mediaSources?.describe?.(key)||{kind:'native',provider:'LX Storage'};
 if(sourceInfo.kind==='embed'){
  const shadow=host.attachShadow({mode:'open'}),meta=ep?`S${ep.season||1}:E${ep.number} · ${esc(ep.title||'')}`:`${esc(x.year||'')} · ${esc(x.genre||'')}`;
  const mediaQualities=LX.driveQuality?.normalizeMap?.(media?.qualitySources||{})||{},qualityRefs=sourceInfo.provider==='Google Drive'?{auto:key,...mediaQualities}:{auto:key};
  const qualityRows=Object.entries(qualityRefs).map(([q,ref])=>{const d=LX.mediaSources?.describe?.(ref);return d?.kind==='embed'?{q,ref,src:d.src,label:q==='auto'?'Auto':(LX.driveQuality?.label?.(q)||q)}:null}).filter(Boolean);
  const nextText=nextEp?`S${nextEp.season||1}:E${nextEp.number} · ${esc(nextEp.title||`Episódio ${nextEp.number}`)}`:'';
  shadow.innerHTML=`<style>:host{all:initial;position:fixed;inset:0;background:#000;color:#fff;font-family:Inter,Arial,sans-serif}.wrap{position:absolute;inset:0;background:#000}.top{position:absolute;z-index:5;left:0;right:0;top:0;min-height:72px;display:flex;align-items:center;gap:10px;padding:10px 18px;background:linear-gradient(180deg,rgba(0,0,0,.94),rgba(0,0,0,.25),transparent);pointer-events:none}.top>*{pointer-events:auto}.back,.open,.next,.quality{height:40px;border:1px solid rgba(255,255,255,.18);background:rgba(15,15,15,.72);color:#fff;border-radius:12px;cursor:pointer;backdrop-filter:blur(12px)}.back{width:44px;font-size:24px}.copy{min-width:0}.copy b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:16px}.copy small{display:block;color:#b8bec7;margin-top:3px;font-size:10px}.badge{margin-left:auto;padding:7px 10px;border-radius:999px;background:rgba(66,165,255,.14);border:1px solid rgba(66,165,255,.32);font-size:10px;font-weight:800}.open,.next,.quality{padding:0 12px;font-size:11px;font-weight:800}.next{border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.12)}.qualityWrap{position:relative}.qualityMenu{position:absolute;right:0;top:46px;width:150px;padding:7px;background:rgba(10,10,10,.96);border:1px solid rgba(255,255,255,.14);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.45)}.qualityMenu.hide{display:none}.qualityMenu button{width:100%;height:36px;border:0;border-radius:8px;background:transparent;color:#fff;text-align:left;padding:0 10px;cursor:pointer}.qualityMenu button:hover,.qualityMenu button.active{background:rgba(255,255,255,.11)}.frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}.note{position:absolute;z-index:3;left:50%;bottom:16px;transform:translateX(-50%);padding:8px 12px;border-radius:999px;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.12);color:#c9ced5;font-size:10px;pointer-events:none}@media(max-width:740px){.top{padding:max(8px,env(safe-area-inset-top)) 8px 8px;min-height:56px;gap:6px}.badge,.open,.copy small{display:none}.back{width:36px;height:36px;font-size:20px}.copy{flex:1;min-width:70px}.copy b{font-size:12px}.quality,.next{height:38px;padding:0 10px;font-size:10px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qualityMenu{right:0;top:41px;width:132px}.note{bottom:max(10px,env(safe-area-inset-bottom));max-width:88%;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style><div class="wrap"><iframe id="driveFrame" class="frame" src="${String(sourceInfo.src||'').replace(/"/g,'%22')}" title="${esc(x.title)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="top"><button id="back" class="back">←</button><div class="copy"><b>${esc(x.title)}</b><small>${meta}</small></div><span class="badge">${esc(sourceInfo.provider||'Fonte externa')}</span>${sourceInfo.provider==='Google Drive'?`<div class="qualityWrap"><button id="quality" class="quality">Qualidade · Auto</button><div id="qualityMenu" class="qualityMenu hide">${qualityRows.map(z=>`<button data-drive-quality="${z.q}" class="${z.q==='auto'?'active':''}">${z.label}${z.q==='auto'?' · Drive':''}</button>`).join('')}</div></div>`:''}${nextEp?`<button id="next" class="next" title="${nextText}">Próximo · T${nextEp.season||1} E${nextEp.number} ›</button>`:''}<button id="open" class="open">Abrir fonte ↗</button></div><div class="note">${sourceInfo.provider==='Google Drive'?(qualityRows.length>1?'Google Drive · qualidade manual usa arquivos separados':'Google Drive · qualidade automática do player'):'Fonte externa · o progresso exato depende do provedor'}</div></div>`;
  activePlayerMeta={id,title:x.title,meta,context,ep,x};activeVideoEl=null;saveProgress(id,Math.max(1,Number(ep?hist.episodeProgress:hist.progress)||0),0,0,context,ep);saveView();
  const goNext=()=>{if(!nextEp)return;stopMiniPlayer(true);setTimeout(()=>play(id,nextEp.number,nextEp.season||1),40)};
  shadow.getElementById('back').onclick=()=>stopMiniPlayer(true);shadow.getElementById('open').onclick=()=>window.open(sourceInfo.openUrl||sourceInfo.src,'_blank','noopener');shadow.getElementById('next')?.addEventListener('click',goNext);
  const qualityBtn=shadow.getElementById('quality'),qualityMenu=shadow.getElementById('qualityMenu'),frame=shadow.getElementById('driveFrame');if(qualityBtn&&qualityMenu&&frame){qualityBtn.onclick=()=>qualityMenu.classList.toggle('hide');qualityMenu.querySelectorAll('[data-drive-quality]').forEach(btn=>btn.onclick=()=>{const row=qualityRows.find(z=>z.q===btn.dataset.driveQuality);if(!row)return;frame.src=row.src;qualityBtn.textContent=`Qualidade · ${row.label}`;qualityMenu.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));qualityMenu.classList.add('hide');const prefs=S.read(S.keys.playerPrefs,{})||{};S.write(S.keys.playerPrefs,{...prefs,driveQuality:row.q});LX.toast?.(`Qualidade ${row.label} selecionada. O player do Drive reiniciou o arquivo.`)});const preferred=S.read(S.keys.playerPrefs,{})?.driveQuality||'auto',pick=qualityRows.find(z=>z.q===preferred);if(pick&&pick.q!=='auto'){frame.src=pick.src;qualityBtn.textContent=`Qualidade · ${pick.label}`;qualityMenu.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.driveQuality===pick.q))}}
  activePlayerCleanup=()=>{activeVideoEl=null;host.remove();document.documentElement.classList.remove('lx-player-open');document.body.classList.remove('lx-player-open')};
  if(window.__lxPlayerKeyHandler)document.removeEventListener('keydown',window.__lxPlayerKeyHandler);window.__lxPlayerKeyHandler=e=>{if(e.key==='Escape')stopMiniPlayer(true);else if(nextEp&&e.key.toLowerCase()==='n')goNext()};document.addEventListener('keydown',window.__lxPlayerKeyHandler);
  return;
 }
 const shadow=host.attachShadow({mode:'open'}),meta=ep?`S${ep.season||1}:E${ep.number} · ${esc(ep.title||'')}`:`${esc(x.year||'')} · ${esc(x.genre||'')}`,subButton=subtitleTracks.length?'<button id="subs" class="tool" title="Legendas" aria-label="Legendas">CC</button>':'',driveFallbackButton='',originalKey=key,nativeQualityMap=LX.driveQuality?.normalizeMap?.(media?.qualitySources||{})||media?.qualitySources||{},qualitySeen=new Set([String(originalKey||'')]),nativeQualityRows=[{q:'auto',ref:originalKey,label:'Original'},...Object.entries(nativeQualityMap).filter(([,ref])=>{const k=String(ref||'');if(!k||qualitySeen.has(k))return false;qualitySeen.add(k);return true}).map(([q,ref])=>({q,ref,label:LX.driveQuality?.label?.(q)||q}))];
 shadow.innerHTML=`<style>
 :host{all:initial;position:fixed;inset:0;z-index:2147483647;color-scheme:dark}*{box-sizing:border-box}button,input{font:inherit}.root{position:absolute;inset:0;background:#000;color:#fff;font-family:Inter,Arial,Helvetica,sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none}.ambient{position:absolute;inset:-30px;background:#070707 center/cover no-repeat;filter:blur(34px) brightness(.23) saturate(.9);transform:scale(1.08);z-index:0;opacity:.8}.stage{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.18);overflow:hidden}.stage video{position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain!important;object-position:center!important;background:transparent;z-index:1}.poster{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;z-index:2;background:#000;transition:opacity .25s ease}.poster.hide{opacity:0;pointer-events:none}.shadeTop,.shadeBottom{position:absolute;left:0;right:0;z-index:4;pointer-events:none;transition:opacity .2s ease}.shadeTop{top:0;height:34%;background:linear-gradient(180deg,rgba(0,0,0,.88),rgba(0,0,0,.38) 48%,transparent)}.shadeBottom{bottom:0;height:46%;background:linear-gradient(0deg,rgba(0,0,0,.96),rgba(0,0,0,.52) 48%,transparent)}.top{position:absolute;z-index:10;left:0;right:0;top:0;display:flex;align-items:center;gap:14px;padding:max(16px,env(safe-area-inset-top)) clamp(14px,3vw,46px) 18px;transition:opacity .18s ease,transform .18s ease}.back,.round,.tool{border:1px solid rgba(255,255,255,.14);background:rgba(16,16,16,.52);color:#fff;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);cursor:pointer;display:grid;place-items:center;transition:.15s ease}.back,.round{width:44px;height:44px;min-width:44px;border-radius:50%}.back{background:transparent;border-color:transparent;font-size:28px}.back:hover,.round:hover,.tool:hover{background:rgba(255,255,255,.18);transform:scale(1.04)}.heading{min-width:0}.heading strong{display:block;font-size:clamp(16px,1.5vw,24px);font-weight:850;line-height:1.12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 16px #000}.heading small{display:flex;gap:8px;align-items:center;margin-top:5px;color:rgba(255,255,255,.7);font-size:11px}.origin{padding:3px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.16);font-size:9px;color:#fff}.actions{margin-left:auto;display:flex;gap:8px}.center{position:absolute;z-index:12;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:clamp(18px,4vw,52px);transition:opacity .18s ease,transform .18s ease}.mainPlay{width:92px;height:92px;border:0;border-radius:50%;background:#fff;color:#090909;display:grid;place-items:center;font-size:38px;padding-left:5px;cursor:pointer;box-shadow:0 15px 50px rgba(0,0,0,.55);transition:.15s ease}.mainPlay:hover{transform:scale(1.07)}.seek{width:58px;height:58px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(14,14,14,.58);color:#fff;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(14px);font-weight:800}.seek small{font-size:9px;display:block;margin-top:-7px}.bottom{position:absolute;z-index:11;left:0;right:0;bottom:0;padding:0 clamp(14px,3vw,46px) max(16px,env(safe-area-inset-bottom));transition:opacity .18s ease,transform .18s ease}.timeline{position:relative;padding:20px 0 11px}.progress{width:100%;height:6px;margin:0;accent-color:#e50914;cursor:pointer}.row{display:flex;align-items:center;gap:10px}.left,.right{display:flex;align-items:center;gap:8px}.right{margin-left:auto}.tool{height:40px;min-width:40px;padding:0 11px;border-radius:9px;font-size:11px;font-weight:750}#nextNow{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}.volume{width:108px;accent-color:#fff}.time{font-size:11px;white-space:nowrap;color:#fff;text-shadow:0 2px 10px #000}.time span{color:#aeb4bb}.loading,.error,.resume,.nextCard,.offline{position:absolute;z-index:15;left:50%;transform:translateX(-50%);background:rgba(8,8,8,.82);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#fff}.loading{top:50%;transform:translate(-50%,-50%);padding:12px 16px;border-radius:999px;font-size:11px}.spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;display:inline-block;margin-right:8px;vertical-align:-4px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error{top:50%;transform:translate(-50%,-50%);padding:20px;border-radius:14px;text-align:center;max-width:min(440px,86vw)}.error strong{display:block;font-size:17px}.error p{font-size:11px;color:#b9c0c7;line-height:1.5}.resume{bottom:112px;padding:8px 13px;border-radius:999px;font-size:10px}.offline{top:76px;padding:7px 11px;border-radius:999px;font-size:10px}.hide{display:none!important}.driveFrame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;z-index:3}.root.drive-fallback .center,.root.drive-fallback .bottom,.root.drive-fallback .shadeBottom,.root.drive-fallback .poster,.root.drive-fallback #video{display:none!important}.root.drive-fallback .shadeTop{z-index:4}.root.drive-fallback #cast,.root.drive-fallback #pip{display:none!important}.root.drive-fallback .top{background:linear-gradient(180deg,rgba(0,0,0,.92),rgba(0,0,0,.22),transparent)}.settings{position:absolute;right:clamp(14px,3vw,46px);bottom:78px;z-index:20;width:min(280px,88vw);padding:10px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(10,10,10,.94);box-shadow:0 18px 60px rgba(0,0,0,.5);backdrop-filter:blur(20px)}.settings.hide{display:none}.settings button{width:100%;height:40px;border:0;border-radius:9px;background:transparent;color:#fff;text-align:left;padding:0 10px;cursor:pointer}.settings button:hover{background:rgba(255,255,255,.09)}.nextCard{right:24px;left:auto;bottom:96px;transform:none;width:min(340px,86vw);border-radius:14px;padding:14px}.nextCard strong{display:block;margin-bottom:4px}.nextCard small{display:block;color:#bac1c8;margin-bottom:10px}.nextCard button{height:38px;padding:0 13px;border:0;border-radius:8px;background:#fff;color:#080808;font-weight:800;cursor:pointer}.root.playing.idle{cursor:none}.root.playing.idle .top,.root.playing.idle .bottom,.root.playing.idle .shadeTop,.root.playing.idle .shadeBottom,.root.playing.idle .center{opacity:0;pointer-events:none}.root.paused .top,.root.paused .bottom,.root.paused .center{opacity:1;pointer-events:auto}.root.playing .poster{opacity:0}.root.native .center,.root.native .bottom{display:none!important}.root.native .shadeBottom{display:none!important}@media(max-width:760px){.top{padding:max(9px,env(safe-area-inset-top)) 9px 8px;gap:7px}.heading strong{font-size:14px}.heading small{font-size:9px}.back,.round{width:38px;height:38px;min-width:38px}.actions{gap:5px}.center{gap:18px}.mainPlay{width:70px;height:70px;font-size:29px}.seek{width:48px;height:48px}.bottom{padding:0 10px max(10px,env(safe-area-inset-bottom))}.volume{display:none}.time{font-size:9px}.tool{height:36px;min-width:36px;padding:0 9px;font-size:10px}#nextNow{max-width:160px;font-size:10px}#pip{display:none}.resume{bottom:90px}.settings{right:10px;bottom:62px}.nextCard{right:10px;bottom:72px}}@media(max-width:460px){.heading small .origin{display:none}.time .durationPart{display:none}#speed{display:none}.mainPlay{width:66px;height:66px}.seek{width:44px;height:44px}.right{gap:5px}.tool{padding:0 7px}}@supports not (height:100dvh){:host{height:100vh!important}.root{height:100vh}}
 </style><div id="root" class="root paused"><div id="ambient" class="ambient"></div><div id="stage" class="stage"><video id="video" controls playsinline preload="metadata"></video><iframe id="driveFallbackFrame" class="driveFrame hide" title="Player Google Drive" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><img id="poster" class="poster hide" alt=""><div class="shadeTop"></div><div class="shadeBottom"></div><div class="top"><button id="back" class="back" aria-label="Voltar">←</button><div class="heading"><strong>${esc(x.title)}</strong><small><span>${meta}</span><span id="sourceBadge" class="origin">LX PLAYER</span></small></div><div class="actions"><button id="cast" class="round" title="Transmitir para TV" aria-label="Transmitir para TV">▣</button><button id="pip" class="round" title="Mini player" aria-label="Mini player">▱</button><button id="full" class="round" title="Tela cheia" aria-label="Tela cheia">⛶</button></div></div><div class="center"><button id="rew" class="seek" aria-label="Voltar 10 segundos">↶<small>10</small></button><button id="play" class="mainPlay" aria-label="Reproduzir">▶</button><button id="fwd" class="seek" aria-label="Avançar 10 segundos">↷<small>10</small></button></div><div class="bottom"><div class="timeline"><input id="progress" class="progress" type="range" min="0" max="100" step="0.05" value="${ep?(hist.episodeProgress||0):(hist.progress||0)}"></div><div class="row"><div class="left"><button id="playSmall" class="round" aria-label="Reproduzir">▶</button><button id="mute" class="round" aria-label="Som">${pref.muted?'🔇':'🔊'}</button><input id="volume" class="volume" type="range" min="0" max="1" step="0.05" value="${pref.volume??1}"><span class="time"><b id="current">0:00</b><span class="durationPart"> / <span id="duration">0:00</span></span></span></div><div class="right">${nextEp?`<button id="nextNow" class="tool" title="Próximo: S${nextEp.season||1}:E${nextEp.number} · ${esc(nextEp.title||'')}">Próximo · T${nextEp.season||1} E${nextEp.number} ›</button>`:''}${subButton}<button id="speed" class="tool">1x</button><button id="more" class="tool" aria-label="Mais opções">•••</button></div></div></div><div id="loading" class="loading"><span class="spinner"></span>Carregando vídeo</div><div id="error" class="error hide"><strong>Não foi possível reproduzir</strong><p id="errorText">Vamos renovar a fonte do vídeo e tentar novamente.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button id="retry" class="tool">Tentar novamente</button>${driveFallbackButton}</div></div><div id="resume" class="resume hide"></div><div id="offline" class="offline hide">Sem conexão · o vídeo pode pausar</div><div id="settings" class="settings hide"><button id="native">Usar controles do navegador</button><button id="reload">Renovar fonte do vídeo</button><button id="closeSettings">Fechar opções</button></div>${nextEp?`<div id="nextCard" class="nextCard hide"><strong>Próximo episódio</strong><small>S${nextEp.season||1}:E${nextEp.number} · ${esc(nextEp.title||'')}</small><button id="nextBtn">Assistir agora</button></div>`:''}</div></div>`;
 const q=s=>shadow.querySelector(s),root=q('#root'),v=q('#video'),stage=q('#stage'),playBtn=q('#play'),playSmall=q('#playSmall'),progress=q('#progress'),current=q('#current'),duration=q('#duration'),volume=q('#volume'),loading=q('#loading'),error=q('#error'),errorText=q('#errorText'),resume=q('#resume'),posterEl=q('#poster'),ambient=q('#ambient'),settings=q('#settings'),offline=q('#offline'),drivePreview=q('#drivePreview'),driveFrame=q('#driveFallbackFrame');
 if(poster){posterEl.src=poster;posterEl.classList.remove('hide');ambient.style.backgroundImage=`url("${String(poster).replace(/"/g,'%22')}")`}
 activePlayerMeta={id,title:x.title,meta:ep?`S${ep.season||1} E${ep.number} · ${ep.title}`:x.type,context,ep,x};activeVideoEl=v;saveView();
 let hideTimer=null,driveFallbackTimer=null,lastSync=0,resumeApplied=false,speedIndex=0,subIndex=-1,sourceRefreshes=0,currentObjectUrl=null,nativeMode=false,pendingSeek=null,driveFallbackActive=false;const speeds=[1,1.25,1.5,2,.75];
 subtitleTracks.forEach((t,i)=>{const tr=document.createElement('track');tr.kind='subtitles';tr.label=t.label||t.lang||`Legenda ${i+1}`;tr.srclang=t.lang||'pt';tr.src=t.url;v.appendChild(tr)});
 const savePref=()=>{const old=S.read(S.keys.playerPrefs,{})||{};S.write(S.keys.playerPrefs,{...old,volume:v.volume,muted:v.muted})};
 const setUI=()=>{const paused=v.paused;root.classList.toggle('paused',paused);root.classList.toggle('playing',!paused);playBtn.textContent=paused?'▶':'❚❚';playSmall.textContent=paused?'▶':'❚❚';if(!paused)posterEl?.classList.add('hide')};
 const showControls=()=>{root.classList.remove('idle');clearTimeout(hideTimer);if(!v.paused&&!nativeMode)hideTimer=setTimeout(()=>root.classList.add('idle'),6000)};
 const togglePlay=()=>{if(v.paused)v.play().catch(()=>{v.controls=true;nativeMode=true;root.classList.add('native');showControls()});else v.pause()};
 const seek=sec=>{if(Number.isFinite(v.duration))v.currentTime=Math.max(0,Math.min(v.duration,(v.currentTime||0)+sec));showControls()};
 const applyResume=()=>{if(resumeApplied||!v.duration)return;resumeApplied=true;const same=hist.context===context;let at=0;if(same&&+hist.position>4&&+hist.position<v.duration-8)at=+hist.position;else{const pct=ep?(same?+hist.episodeProgress||0:0):(+hist.progress||0);if(pct>0&&pct<98)at=(pct/100)*v.duration}if(at>4){v.currentTime=at;resume.textContent=`Continuando de ${LX.fmt(at)}`;resume.classList.remove('hide');setTimeout(()=>resume.classList.add('hide'),2600)}};
 const deactivateDriveFallback=()=>{clearTimeout(driveFallbackTimer);driveFallbackActive=false;root.classList.remove('drive-fallback');if(driveFrame){driveFrame.classList.add('hide');try{driveFrame.src='about:blank'}catch{}}};
 const activateDriveFallback=(reason='auto')=>{const info=LX.mediaSources?.describe?.(key)||sourceInfo,src=info?.previewSrc;if(info?.provider!=='Google Drive'||!src||!driveFrame)return false;clearTimeout(driveFallbackTimer);driveFallbackActive=true;try{v.pause()}catch{};LX.adaptive?.destroy?.(v).catch?.(()=>{});driveFrame.src=src;driveFrame.classList.remove('hide');root.classList.add('drive-fallback');loading.classList.add('hide');error.classList.add('hide');posterEl?.classList.add('hide');const badge=q('#sourceBadge');if(badge)badge.textContent='DRIVE · COMPATIBILIDADE';if(reason!=='silent')LX.toast('Modo compatibilidade do Google Drive ativado dentro da LX Plus.');return true};
 const scheduleDriveFallback=()=>{clearTimeout(driveFallbackTimer);const info=LX.mediaSources?.describe?.(key)||sourceInfo;if(info?.provider!=='Google Drive')return;driveFallbackTimer=setTimeout(()=>{if(!driveFallbackActive&&v.readyState<2)activateDriveFallback('timeout')},6500)};
 const setSource=async(keepTime=0)=>{deactivateDriveFallback();loading.classList.remove('hide');error.classList.add('hide');try{const next=await resolveMedia(key);if(!next)throw new Error('MEDIA_NOT_AVAILABLE');if(currentObjectUrl?.startsWith('blob:'))try{URL.revokeObjectURL(currentObjectUrl)}catch{}currentObjectUrl=next.startsWith?.('blob:')?next:null;pendingSeek=keepTime>0?keepTime:null;if(/\.(?:m3u8|mpd)(?:$|[?#])/i.test(next)&&LX.adaptive?.load)await LX.adaptive.load(v,next);else{await LX.adaptive?.destroy?.(v);v.src=next;v.load()}sourceRefreshes++;scheduleDriveFallback();return true}catch(err){console.warn('LX player source',err);loading.classList.add('hide');const info=LX.mediaSources?.describe?.(key)||sourceInfo;if(info?.provider==='Google Drive'&&activateDriveFallback('source-error'))return true;errorText.textContent='A fonte do vídeo não pôde ser carregada. Verifique a conexão e tente novamente.';error.classList.remove('hide');v.controls=true;nativeMode=true;root.classList.add('native');return false}};
 const startTV=async()=>{try{if(typeof v.webkitShowPlaybackTargetPicker==='function'){v.webkitShowPlaybackTargetPicker();return}if(v.remote&&typeof v.remote.prompt==='function'){await v.remote.prompt();return}LX.toast('Seu navegador não oferece transmissão direta para TV.')}catch(err){if(err?.name!=='AbortError')LX.toast('Não foi possível iniciar a transmissão para TV.')}};
 const fullscreen=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();return}if(host.requestFullscreen)await host.requestFullscreen();else if(v.webkitEnterFullscreen)v.webkitEnterFullscreen()}catch{LX.toast('Tela cheia não está disponível neste dispositivo.')}};
 const toggleNative=()=>{nativeMode=!nativeMode;v.controls=true;root.classList.toggle('native',nativeMode);settings.classList.add('hide');showControls();LX.toast(nativeMode?'Modo simples ativado.':'Controles LX ativados. Os controles do navegador continuam disponíveis.')};
 const openDrivePreview=()=>{if(!activateDriveFallback('manual'))LX.toast('Modo compatibilidade indisponível para esta fonte.');};
 if(drivePreview)drivePreview.onclick=openDrivePreview;
 if(sourceInfo.provider==='Google Drive'&&!settings.querySelector('[data-drive-compat]')){const b=document.createElement('button');b.dataset.driveCompat='1';b.textContent='Google Drive · modo compatibilidade';b.onclick=()=>{settings.classList.add('hide');activateDriveFallback('manual')};settings.prepend(b)}
 host.__lxQualityRows=nativeQualityRows;host.__lxSetQuality=async row=>{if(!row?.ref)return;const keep=Number.isFinite(v.currentTime)?v.currentTime:0,wasPlaying=!v.paused;key=row.ref;await setSource(keep);if(wasPlaying)v.play().catch(()=>{})};
 v.controls=true;v.playsInline=true;v.disableRemotePlayback=false;v.volume=Math.max(0,Math.min(1,Number(pref.volume??1)));v.muted=!!pref.muted;
 v.onloadedmetadata=()=>{clearTimeout(driveFallbackTimer);duration.textContent=LX.fmt(v.duration||0);if(pendingSeek!=null&&pendingSeek<v.duration){v.currentTime=pendingSeek;pendingSeek=null}else applyResume();setUI();showControls()};
 v.oncanplay=()=>{clearTimeout(driveFallbackTimer);loading.classList.add('hide');error.classList.add('hide');setUI();showControls();v.controls=true;if(sourceInfo.provider==='Google Drive'){const badge=q('#sourceBadge');if(badge&&!driveFallbackActive)badge.textContent='LX PLAYER · DRIVE'}};
 v.onwaiting=()=>loading.classList.remove('hide');v.onstalled=()=>loading.classList.remove('hide');v.onplaying=()=>{loading.classList.add('hide');posterEl?.classList.add('hide')};
 v.onerror=async()=>{loading.classList.add('hide');const keep=Number.isFinite(v.currentTime)?v.currentTime:0,currentInfo=LX.mediaSources?.describe?.(key)||sourceInfo;if(currentInfo.provider==='Google Drive'){const candidates=Array.isArray(currentInfo.streamCandidates)?currentInfo.streamCandidates.filter(Boolean):[],idx=Number(mediaCandidateIndex.get(String(key))||0);if(idx<candidates.length-1){mediaCandidateIndex.set(String(key),idx+1);errorText.textContent='Tentando outra rota do Google Drive…';error.classList.remove('hide');await setSource(keep);return}if(activateDriveFallback('direct-blocked'))return;errorText.textContent='Não consegui abrir este arquivo do Google Drive. Verifique se ele está compartilhado para qualquer pessoa com o link.';error.classList.remove('hide');return}if(sourceRefreshes<2){errorText.textContent='Renovando a fonte segura do vídeo…';error.classList.remove('hide');await setSource(keep);return}errorText.textContent='O arquivo não pôde ser reproduzido neste navegador. Tente outra fonte compatível com MP4/HLS.';error.classList.remove('hide');v.controls=true;nativeMode=true;root.classList.add('native')};
 v.onplay=()=>{setUI();showControls()};v.onpause=()=>{setUI();root.classList.remove('idle');if(v.duration)saveProgress(id,v.currentTime/v.duration*100,v.currentTime,v.duration,context,ep)};
 v.ontimeupdate=()=>{if(v.duration){const pct=v.currentTime/v.duration*100;progress.value=pct;current.textContent=LX.fmt(v.currentTime);duration.textContent=LX.fmt(v.duration);if(Date.now()-lastSync>4500){lastSync=Date.now();saveProgress(id,pct,v.currentTime,v.duration,context,ep)}}};
 v.onended=()=>{saveProgress(id,100,v.duration,v.duration,context,ep);setUI();root.classList.remove('idle');q('#nextCard')?.classList.remove('hide');if(nextEp){let left=5;const card=q('#nextCard'),btn=q('#nextBtn');if(card){const s=card.querySelector('strong'),playNext=()=>{clearInterval(timer);stopMiniPlayer(true);setTimeout(()=>play(id,nextEp.number,nextEp.season||1),40)},cancel=document.createElement('button');cancel.id='nextCancel';cancel.textContent='Cancelar próximo episódio';cancel.style.cssText='margin-left:7px;background:rgba(255,255,255,.1);color:#fff';btn?.insertAdjacentElement('afterend',cancel);if(s)s.textContent=`Próximo episódio em ${left}s`;const timer=setInterval(()=>{if(!document.getElementById('lxGlobalCinema'))return clearInterval(timer);left--;if(left<=0)playNext();else if(s)s.textContent=`Próximo episódio em ${left}s`},1000);if(btn)btn.onclick=playNext;cancel.onclick=()=>{clearInterval(timer);card.classList.add('hide');if(s)s.textContent='Próximo episódio cancelado'}}}};
 playBtn.onclick=playSmall.onclick=togglePlay;q('#nextNow')?.addEventListener('click',()=>{if(nextEp){stopMiniPlayer(true);setTimeout(()=>play(id,nextEp.number,nextEp.season||1),40)}});q('#rew').onclick=()=>seek(-10);q('#fwd').onclick=()=>seek(10);progress.oninput=()=>{if(v.duration)v.currentTime=(+progress.value/100)*v.duration};q('#mute').onclick=()=>{v.muted=!v.muted;q('#mute').textContent=v.muted?'🔇':'🔊';savePref();showControls()};volume.oninput=()=>{v.volume=+volume.value;v.muted=false;q('#mute').textContent='🔊';savePref();showControls()};q('#back').onclick=()=>stopMiniPlayer(true);q('#cast').onclick=startTV;q('#full').onclick=fullscreen;q('#pip').onclick=async()=>{if(v.requestPictureInPicture)try{await v.requestPictureInPicture()}catch{}else LX.toast('Mini player não disponível neste navegador.')};q('#speed').onclick=()=>{speedIndex=(speedIndex+1)%speeds.length;v.playbackRate=speeds[speedIndex];q('#speed').textContent=`${speeds[speedIndex]}x`;showControls()};q('#subs')?.addEventListener('click',()=>{subIndex++;if(subIndex>=subtitleTracks.length)subIndex=-1;[...v.textTracks].forEach((tr,i)=>tr.mode=i===subIndex?'showing':'disabled');q('#subs').textContent=subIndex>=0?'CC✓':'CC';showControls()});q('#more').onclick=()=>{settings.classList.toggle('hide');showControls()};q('#native').onclick=toggleNative;q('#reload').onclick=async()=>{settings.classList.add('hide');await setSource(v.currentTime||0)};q('#closeSettings').onclick=()=>settings.classList.add('hide');q('#retry').onclick=async()=>{await setSource(v.currentTime||0)};
 stage.addEventListener('click',e=>{if(e.target===v){if(root.classList.contains('idle'))showControls();else togglePlay()}},{passive:true});['mousemove','pointermove','touchstart'].forEach(ev=>stage.addEventListener(ev,showControls,{passive:true}));stage.ondblclick=e=>{if(e.target.closest?.('button,input'))return;const b=stage.getBoundingClientRect();e.clientX<b.left+b.width/2?seek(-10):seek(10)};
 if(window.__lxPlayerKeyHandler)document.removeEventListener('keydown',window.__lxPlayerKeyHandler);window.__lxPlayerKeyHandler=e=>{if(!document.getElementById('lxGlobalCinema'))return;const k=e.key.toLowerCase();if(e.code==='Space'||k==='k'){e.preventDefault();togglePlay()}else if(e.code==='ArrowLeft'||k==='j')seek(-10);else if(e.code==='ArrowRight'||k==='l')seek(10);else if(k==='f')fullscreen();else if(k==='m'){v.muted=!v.muted;q('#mute').textContent=v.muted?'🔇':'🔊';savePref()}else if(k==='c'&&q('#subs'))q('#subs').click();else if(nextEp&&k==='n'){stopMiniPlayer(true);setTimeout(()=>play(id,nextEp.number,nextEp.season||1),40)}else if(e.key==='Escape')stopMiniPlayer(true)};document.addEventListener('keydown',window.__lxPlayerKeyHandler);
 const network=()=>offline.classList.toggle('hide',navigator.onLine);window.addEventListener('online',network);window.addEventListener('offline',network);network();
 activePlayerCleanup=()=>{clearTimeout(hideTimer);clearTimeout(driveFallbackTimer);if(driveFrame)try{driveFrame.src='about:blank'}catch{};window.removeEventListener('online',network);window.removeEventListener('offline',network);try{if(currentObjectUrl?.startsWith('blob:'))URL.revokeObjectURL(currentObjectUrl)}catch{}activeVideoEl=null;host.remove();document.body.classList.remove('lx-player-open')};
 setUI();showControls();await setSource(0);
}
function saveProgress(id,p,position=0,duration=0,context='main',ep=null){const h=D.history();let progress=Math.max(0,Math.min(100,+p||0));if(ep){const x=D.catalog().find(z=>z.id===id),ordered=[...(x?.episodes||[])].sort((a,b)=>(+a.season||1)-(+b.season||1)||(+a.number||0)-(+b.number||0)),idx=ordered.findIndex(e=>(+e.season||1)===(+ep.season||1)&&(+e.number||0)===(+ep.number||0));if(idx>=0&&ordered.length)progress=Math.max(0,Math.min(100,((idx+(progress/100))/ordered.length)*100))}h[id]={...(h[id]||{}),progress,episodeProgress:ep?Math.max(0,Math.min(100,+p||0)):undefined,position:+position||0,duration:+duration||0,context,episode:ep?{season:ep.season||1,number:ep.number,title:ep.title}:null,opened:Date.now()};S.write(S.keys.history,h)}
async function read(id,ch=0){
 const x=D.catalog().find(i=>i.id===id);if(!x)return;D.track('read',{id,title:x.title});const chapters=x.chapters||[],hist=D.history()[id]||{},chapterIndex=Math.max(0,Math.min(+ch||0,Math.max(0,chapters.length-1))),c=chapters[chapterIndex]||null,theme=state.readerTheme||'night';
 const chapterNav=chapters.length?`<aside id="readerChapters" class="lx-reader-chapters"><div><span class="eyebrow">CAPÍTULOS</span><strong>${esc(x.title)}</strong></div>${chapters.map((z,i)=>`<button class="${i===chapterIndex?'active':''}" onclick="LX.read(${id},${i})"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(z.title||`Capítulo ${i+1}`)}</span></button>`).join('')}</aside>`:'';
 $('readerModal').className=`reader-modal lx-reader-modal theme-${theme}`;$('readerModal').innerHTML=`<div class="lx-reader-top"><button id="readerBack" class="reader-icon">←</button><div class="lx-reader-title"><strong>${esc(x.title)}</strong><small>${esc(x.author||'LX Books')}${c?' · '+esc(c.title):''}</small></div><div class="lx-reader-tools"><button id="readerToc" class="reader-icon">☰</button><button id="fontDown">A−</button><button id="fontUp">A+</button><button id="readerTheme">◐</button><button onclick="LX.ui.closeReader()">Fechar</button></div></div><div class="lx-reader-layout">${chapterNav}<main id="readerStage" class="lx-reader-stage"><div id="readerContent" class="lx-reader-content" style="font-size:${state.readerSize}px"></div></main></div><div class="lx-reader-bottom"><button id="prevChapter" ${chapterIndex<=0?'disabled':''}>← Anterior</button><div><span id="readerPct">${Math.round(hist.progress||0)}%</span><div class="lx-reader-progress"><i id="readerProgressBar" style="width:${Math.round(hist.progress||0)}%"></i></div></div><button id="nextChapter" ${chapterIndex>=chapters.length-1&&chapters.length?'disabled':''}>Próximo →</button></div>`;
 $('readerOverlay').classList.remove('hidden');const content=$('readerContent'),stage=$('readerStage');$('readerBack').onclick=()=>LX.ui.closeReader();$('fontDown').onclick=()=>{state.readerSize=Math.max(14,state.readerSize-2);content.style.fontSize=state.readerSize+'px'};$('fontUp').onclick=()=>{state.readerSize=Math.min(34,state.readerSize+2);content.style.fontSize=state.readerSize+'px'};$('readerTheme').onclick=()=>{const arr=['night','paper','sepia'],i=(arr.indexOf(state.readerTheme||'night')+1)%arr.length;state.readerTheme=arr[i];read(id,chapterIndex)};$('readerToc').onclick=()=>$('readerModal').classList.toggle('toc-open');$('prevChapter').onclick=()=>chapterIndex>0&&read(id,chapterIndex-1);$('nextChapter').onclick=()=>chapterIndex<chapters.length-1&&read(id,chapterIndex+1);
 let objectUrl=null,epubBook=null,epubRendition=null;
 if(c){content.innerHTML=`<article class="lx-reader-article"><span class="eyebrow">${esc(x.author||'LX BOOKS')}</span><h1>${esc(c.title||x.title)}</h1><div class="lx-reader-text">${String(c.text||'').split(/\n{2,}/).map(p=>`<p>${esc(p)}</p>`).join('')||'<p>Este capítulo ainda não possui texto.</p>'}</div></article>`;requestAnimationFrame(()=>{if(hist.readerChapter===chapterIndex&&hist.readerScroll>0)stage.scrollTop=Math.min(hist.readerScroll,stage.scrollHeight-stage.clientHeight)})}
 else if(x.mediaKey){try{const src=await S.getMedia(x.mediaKey);if(!src)throw new Error('BOOK_MEDIA_MISSING');objectUrl=typeof src==='string'?src:URL.createObjectURL(src);const key=String(x.mediaKey).toLowerCase();if(key.includes('.epub')){await LX.ensureEpub?.();if(!window.ePub)throw new Error('EPUB_SDK_UNAVAILABLE');content.innerHTML='<div id="epubView" class="lx-epub-view"></div>';epubBook=window.ePub(objectUrl);epubRendition=epubBook.renderTo('epubView',{width:'100%',height:'100%',spread:'auto'});await epubRendition.display();$('prevChapter').disabled=false;$('nextChapter').disabled=false;$('prevChapter').onclick=()=>epubRendition.prev();$('nextChapter').onclick=()=>epubRendition.next()}else{content.innerHTML=`<iframe class="lx-pdf-view" src="${String(objectUrl).replace(/\"/g,'%22')}#toolbar=1&navpanes=0" title="${esc(x.title)}"></iframe>`}}catch(err){console.warn(err);content.innerHTML='<div class="lx-reader-error"><strong>Não foi possível abrir este livro.</strong><p>Tente novamente ou envie o arquivo em PDF/EPUB pelo ADM.</p></div>'}}
 else if(x.externalReadUrl){content.innerHTML=`<div class="lx-external-book"><div class="lx-external-book-cover" style="background-image:url('${String(x.cover||'').replace(/'/g,'%27')}')"></div><div><span class="eyebrow">${esc(x.metadataProvider||'BIBLIOTECA DIGITAL')}</span><h1>${esc(x.title)}</h1><p>${esc(x.author||'')}</p><p>Esta obra está disponível em uma biblioteca externa. Você pode abrir a fonte original para leitura.</p><a class="primary-btn" href="${String(x.externalReadUrl).replace(/"/g,'%22')}" target="_blank" rel="noopener">Abrir leitura gratuita ↗</a></div></div>`}
 let timer=null;const save=()=>{const totalCh=Math.max(1,chapters.length),scrollPart=stage.scrollHeight>stage.clientHeight?stage.scrollTop/(stage.scrollHeight-stage.clientHeight):0,p=chapters.length?((chapterIndex+scrollPart)/totalCh*100):(hist.progress||0),h=D.history();h[id]={...(h[id]||{}),progress:Math.max(0,Math.min(100,p)),readerChapter:chapterIndex,readerScroll:stage.scrollTop,opened:Date.now()};S.write(S.keys.history,h);$('readerPct').textContent=Math.round(p)+'%';$('readerProgressBar').style.width=Math.round(p)+'%'};stage.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(save,250)},{passive:true});save();
}
let musicObjectUrl=null,musicRepeatMode=0,musicShuffleMode=false,musicSaveAt=0;
const musicSourceCache=new Map();
const musicSignedFallbackCache=new Map();
function cacheMusicSource(ref,value){if(!ref||!value)return value;musicSourceCache.set(String(ref),value);return value}
function cachedMusicSource(ref){return ref?musicSourceCache.get(String(ref))||null:null}
async function fetchMusicTicket(ref,expires=7200){
 if(!String(ref||'').startsWith('cloud:')||!LX.cloud?.db?.())return null;
 try{
  const db=LX.cloud.db(),sessionRes=await db.auth.getSession(),access=sessionRes?.data?.session?.access_token||'';
  if(!access)return null;
  const {data,error}=await db.functions.invoke('lx-media-ticket',{body:{key:String(ref),expires},headers:{Authorization:`Bearer ${access}`}});
  if(error||!data?.url){console.warn('LX media ticket unavailable',error||data);return null}
  if(data.signedUrl)musicSignedFallbackCache.set(String(ref),data.signedUrl);
  return data.url;
 }catch(error){console.warn('LX media ticket request failed',error);return null}
}
function primeMusicMedia(ref,value){cacheMusicSource(ref,value);return true}
function musicMime(name='',fallback=''){
 const n=String(name||'').split(/[?#]/)[0].toLowerCase(),f=String(fallback||'').toLowerCase();
 if(f&&f!=='application/octet-stream')return f;
 if(n.endsWith('.mp3')||n.endsWith('.mpeg')||n.endsWith('.mpga'))return 'audio/mpeg';
 if(n.endsWith('.m4a')||n.endsWith('.mp4')||n.endsWith('.m4b'))return 'audio/mp4';
 if(n.endsWith('.aac'))return 'audio/aac';
 if(n.endsWith('.ogg')||n.endsWith('.oga'))return 'audio/ogg';
 if(n.endsWith('.wav')||n.endsWith('.wave'))return 'audio/wav';
 if(n.endsWith('.webm'))return 'audio/webm';
 if(n.endsWith('.flac'))return 'audio/flac';
 return f||'audio/mpeg';
}
function playableMusicBlob(value,item={},ref=''){
 if(!(value instanceof Blob))return value;
 const wanted=musicMime(item?.fileName||ref,value.type);
 if(value.type===wanted&&value.type&&value.type!=='application/octet-stream')return value;
 try{return new Blob([value],{type:wanted})}catch{return value}
}
const musicSourcePromises=new Map();
async function prewarmMusicRef(ref){
 if(!ref)return null;const key=String(ref),hit=cachedMusicSource(key);if(hit)return hit;if(musicSourcePromises.has(key))return musicSourcePromises.get(key);
 const task=(async()=>{
  const d=LX.mediaSources?.describe?.(key);if(d?.kind==='embed')return null;if(d?.kind==='direct'&&d.src)return cacheMusicSource(key,d.src);
  if(key.startsWith('cloud:')){
   const ticket=await fetchMusicTicket(key,7200);if(ticket)return cacheMusicSource(key,ticket);
   if(LX.cloud?.db?.()){try{const path=key.slice(6).replace(/^\/+/, '');const signed=await LX.cloud.db().storage.from(LX.config?.supabase?.mediaBucket||'lx-media').createSignedUrl(path,7200);if(!signed.error&&signed.data?.signedUrl){musicSignedFallbackCache.set(key,signed.data.signedUrl);return cacheMusicSource(key,signed.data.signedUrl)}}catch(e){console.warn('LX signed music fallback',key,e)}}
  }
  try{const value=await S.getMedia(key);return value?cacheMusicSource(key,value):null}catch(e){console.warn('LX prewarm music source',key,e);return null}
 })().finally(()=>musicSourcePromises.delete(key));musicSourcePromises.set(key,task);return task
}
function musicRefsForContent(x={}){const tracks=x.tracks?.length?x.tracks:[x],refs=[];for(const t of tracks){const ref=t.authorizedAudioUrl||t.authorizedStreamUrl||t.authorizedAudioKey||t.fullMediaKey||t.audioKey||t.audioUrl||t.mediaKey||t.url||x.authorizedAudioUrl||x.authorizedStreamUrl||x.authorizedAudioKey||x.fullMediaKey||x.audioKey||x.audioUrl||x.mediaKey;if(ref&&!refs.includes(ref))refs.push(ref)}return refs}
function prewarmMusicCatalog(list=[]){const refs=[];for(const x of list.slice(0,12))for(const ref of musicRefsForContent(x))if(!refs.includes(ref))refs.push(ref);return Promise.allSettled(refs.slice(0,12).map(ref=>prewarmMusicRef(ref)))}
function prewarmMusicContent(id){const x=D.catalog().find(row=>String(row.id)===String(id));if(!x)return Promise.resolve([]);return Promise.allSettled(musicRefsForContent(x).map(ref=>prewarmMusicRef(ref)))}
let spotifyController=null,spotifyControllerPromise=null,spotifyPlayback={paused:true,buffering:false,position:0,duration:0,uri:''},spotifyAutoplayPending=false,providerPlayback={kind:'native',paused:true,desc:null};
let musicGestureUnlocked=false,musicUnlockAudio=null;
const LX_SILENT_WAV='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
function unlockMusicGesture(){
 try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){LX.__musicAudioContext=LX.__musicAudioContext||new AC();LX.__musicAudioContext.resume?.().catch(()=>{})}}catch{}
 if(musicGestureUnlocked)return;try{musicUnlockAudio=musicUnlockAudio||new Audio(LX_SILENT_WAV);musicUnlockAudio.volume=0;const p=musicUnlockAudio.play();Promise.resolve(p).then(()=>{musicGestureUnlocked=true;musicUnlockAudio.pause()}).catch(()=>{})}catch{}
}
function waitForMusicReady(a,timeout=8500){
 if(!a)return Promise.reject(new Error('AUDIO_ELEMENT_MISSING'));if(a.readyState>=2)return Promise.resolve(true);
 return new Promise((resolve,reject)=>{let done=false;const clean=()=>{clearTimeout(tm);a.removeEventListener('canplay',ok);a.removeEventListener('loadeddata',ok);a.removeEventListener('error',bad)};const ok=()=>{if(done)return;done=true;clean();resolve(true)};const bad=()=>{if(done)return;done=true;clean();reject(a.error||new Error('AUDIO_MEDIA_ERROR'))};const tm=setTimeout(()=>{if(done)return;done=true;clean();reject(new Error('AUDIO_READY_TIMEOUT'))},timeout);a.addEventListener('canplay',ok,{once:true});a.addEventListener('loadeddata',ok,{once:true});a.addEventListener('error',bad,{once:true})})
}

function currentMusic(){return state.musicQueue?.[state.musicIndex]||null}
function setMusicDockArtwork(item=currentMusic(),content=currentMusicContent?.()||{}){
 if(!item)return;const stable={...item,cover:item.cover||content.cover||item.youtubeThumbnail||content.youtubeThumbnail||content.banner||LX.artwork.fallback},host=$('musicCover'),urls=LX.artwork.candidates(stable,content);
 if(host){host.style.backgroundImage=`url(${JSON.stringify(urls[0]||LX.artwork.fallback)})`;const img=LX.artwork.set(host,stable,content);if(img){img.loading='eager';img.decoding='sync';try{img.fetchPriority='high'}catch{}img.addEventListener('load',()=>{host.style.backgroundImage='none'},{once:true})}}
 $('musicDock')?.style.setProperty('--music-cover',LX.artwork.safeBackground(stable,content))
}
function musicEmbedDesc(item=currentMusic(),content=currentMusicContent?.()||{}){if(!item)return null;const refs=[item.authorizedAudioUrl,item.authorizedStreamUrl,item.authorizedAudioKey,item.fullMediaKey,item.audioKey,item.audioUrl,item.sourceMediaKey,item.mediaKey,item.url,item.src,content.authorizedAudioUrl,content.authorizedStreamUrl,content.authorizedAudioKey,content.fullMediaKey,content.audioKey,content.audioUrl,content.sourceMediaKey,content.mediaKey].filter(Boolean);let embed=null;for(const ref of refs){const d=LX.mediaSources?.describe?.(ref);if(!d)continue;if(d.kind==='direct'||['cloud','upload','dropbox'].includes(d.kind))return null;if(d.kind==='embed'&&!embed)embed=d}return embed}
function isSpotifyTrack(item=currentMusic()){return !!item&&providerPlayback.kind==='spotify'&&!!providerPlayback.desc}
function isYoutubeTrack(item=currentMusic()){return !!item&&providerPlayback.kind==='youtube'&&!!providerPlayback.desc}
function isExternalMusicTrack(item=currentMusic()){return !!item&&providerPlayback.kind!=='native'&&!!providerPlayback.desc}
function musicProvider(x={}){const refs=[x?.mediaKey,x?.fullMediaKey,x?.externalMusicUrl,...(x?.tracks||[]).flatMap(t=>[t?.mediaKey,t?.fullMediaKey,t?.url])].filter(Boolean).join(' ');if(/(?:^|\s)youtube:|youtu(?:be\.com|\.be)/i.test(refs))return 'LX Music + YouTube';if(/(?:^|\s)spotify:|open\.spotify\.com/i.test(refs))return 'LX Music + Spotify';return 'LX Music'}
function currentMusicContent(){const t=currentMusic();return t?D.catalog().find(x=>String(x.id)===String(t.contentId)):null}
function syncMusicSaveUI(){const t=currentMusic(),saved=!!t&&D.myList().some(x=>String(x)===String(t.contentId));[$('musicLikeBtn'),$('lxRightMusicLike'),...$$('[data-music-save-id]')].forEach(btn=>{if(!btn)return;const on=btn.dataset.musicSaveId?D.myList().some(x=>String(x)===String(btn.dataset.musicSaveId)):saved;btn.innerHTML=LX.artwork.icon('heart');btn.classList.toggle('active',on);btn.title=on?'Remover da biblioteca':'Salvar na biblioteca';btn.setAttribute('aria-label',btn.title);btn.setAttribute('aria-pressed',String(on))})}
function syncMusicCardState(){const t=currentMusic(),id=t?String(t.contentId):'',playing=!!t&&(isExternalMusicTrack(t)?providerPlayback.paused===false:!$('musicAudio')?.paused);$$('[data-music-id]').forEach(el=>{const on=String(el.dataset.musicId||'')===id;el.classList.toggle('is-current',on);el.classList.toggle('is-playing',on&&playing);const icon=el.matches('[data-music-play-icon]')?el:el.querySelector('[data-music-play-icon]');if(icon)icon.innerHTML=LX.artwork.icon(on&&playing?'pause':'play')});const now=$('lxMusicNow');if(now&&t){now.classList.remove('hidden');$('lxMusicNowTitle').textContent=t.title||'Música';$('lxMusicNowArtist').textContent=t.artist||'LX Music';LX.artwork.set($('lxMusicNowCover'),t,currentMusicContent()||{});$('lxMusicNowToggle').innerHTML=LX.artwork.icon(playing?'pause':'play')}else now?.classList.add('hidden');syncMusicSaveUI();LX.syncMusicDetailRail?.()}
async function waitSpotifyAPI(timeout=8000){if(LX.spotifyEmbed?.api)return LX.spotifyEmbed.api;await LX.ensureSpotifyEmbed?.().catch(()=>false);if(LX.spotifyEmbed?.api)return LX.spotifyEmbed.api;return await new Promise((resolve,reject)=>{let done=false;const ok=()=>{if(done)return;done=true;clearTimeout(tm);document.removeEventListener('lx:spotify-ready',ok);LX.spotifyEmbed?.api?resolve(LX.spotifyEmbed.api):reject(new Error('SPOTIFY_API_UNAVAILABLE'))};document.addEventListener('lx:spotify-ready',ok,{once:true});const tm=setTimeout(()=>{if(done)return;done=true;document.removeEventListener('lx:spotify-ready',ok);reject(new Error('SPOTIFY_API_TIMEOUT'))},timeout)})}
function updateSpotifyProgress(data={}){spotifyPlayback={...spotifyPlayback,paused:!!data.isPaused,buffering:!!data.isBuffering,position:+data.position||0,duration:+data.duration||0,uri:data.playingURI||spotifyPlayback.uri};const dur=spotifyPlayback.duration/1000,pos=spotifyPlayback.position/1000;if(dur>0){$('musicProgress').value=Math.max(0,Math.min(100,pos/dur*100));$('musicTime').textContent=LX.fmt(pos);$('musicDuration').textContent=LX.fmt(dur)}updateMusicUI();syncMusicCardState()}
async function ensureSpotifyController(uri,autoplay=false,expectedTicket=musicLoadTicket){const host=$('spotifyEmbedHost');if(!host)throw new Error('SPOTIFY_HOST_MISSING');spotifyAutoplayPending=!!autoplay;host.classList.remove('hidden');$('musicProviderFrame')?.classList.add('hidden');const load=ctrl=>{if(expectedTicket!==musicLoadTicket)return ctrl;spotifyPlayback={paused:true,buffering:false,position:0,duration:0,uri};try{ctrl.loadEntity?.(uri)}catch{try{ctrl.loadUri?.(uri)}catch{}}if(autoplay){setTimeout(()=>{if(expectedTicket===musicLoadTicket)try{ctrl.play?.()}catch{}},80);setTimeout(()=>{if(expectedTicket===musicLoadTicket&&spotifyPlayback.paused)LX.toast('O navegador bloqueou o início automático. Toque em ▶ no player da LX Music.')},950)}updateMusicUI();syncMusicCardState();return ctrl};if(spotifyController)return load(spotifyController);if(spotifyControllerPromise){const c=await spotifyControllerPromise;return load(c)}spotifyControllerPromise=(async()=>{const api=await waitSpotifyAPI();return await new Promise((resolve,reject)=>{try{api.createController(host,{width:'100%',height:152,uri},ctrl=>{spotifyController=ctrl;LX.spotifyEmbed.controller=ctrl;ctrl.addListener?.('ready',()=>{if(expectedTicket===musicLoadTicket&&spotifyAutoplayPending){spotifyAutoplayPending=false;try{ctrl.play?.()}catch{}}});ctrl.addListener?.('playback_started',e=>{if(providerPlayback.kind!=='spotify')return;spotifyPlayback.paused=false;providerPlayback.paused=false;spotifyPlayback.uri=e?.data?.playingURI||spotifyPlayback.uri;updateMusicUI();syncMusicCardState()});ctrl.addListener?.('playback_update',e=>{if(providerPlayback.kind!=='spotify')return;providerPlayback.paused=!!e?.data?.isPaused;updateSpotifyProgress(e?.data||{})});resolve(ctrl)})}catch(e){reject(e)}})})();try{return await spotifyControllerPromise}finally{spotifyControllerPromise=null}}
function resetMusicProvider(){const dock=$('musicDock'),panel=$('musicProviderPanel'),frame=$('musicProviderFrame'),host=$('spotifyEmbedHost'),toggle=$('musicProviderToggle');try{spotifyController?.pause?.()}catch{}spotifyAutoplayPending=false;providerPlayback={kind:'native',paused:true,desc:null};dock?.classList.remove('external-provider','provider-spotify','provider-youtube','provider-soundcloud','provider-drive','provider-open','provider-transport');panel?.classList.add('hidden');panel?.style.removeProperty('--provider-height');host?.classList.add('hidden');toggle?.classList.add('hidden');if(frame){frame.removeAttribute('src');frame.style.removeProperty('height');frame.removeAttribute('data-provider');frame.classList.add('hidden')}}
async function openMusicProvider(){const dock=$('musicDock'),panel=$('musicProviderPanel');if(!dock?.classList.contains('external-provider')||!panel)return false;const opening=!dock.classList.contains('provider-open');dock.classList.toggle('provider-open',opening);panel.setAttribute('aria-hidden',String(!opening));const btn=$('musicProviderToggle');if(btn){btn.classList.remove('hidden');btn.title=opening?'Ocultar player oficial':'Mostrar player oficial';btn.setAttribute('aria-label',btn.title)}return opening}
function youtubeCommand(func,args=[]){const frame=$('musicProviderFrame');try{frame?.contentWindow?.postMessage(JSON.stringify({event:'command',func,args}),'*');return true}catch{return false}}
window.addEventListener('message',event=>{
 const frame=$('musicProviderFrame');if(providerPlayback.kind!=='youtube'||!frame?.contentWindow||event.source!==frame.contentWindow)return;
 let host='';try{host=new URL(event.origin).hostname}catch{return}if(!/(^|\.)(youtube\.com|youtube-nocookie\.com)$/.test(host))return;
 let message=event.data;try{if(typeof message==='string')message=JSON.parse(message)}catch{return}if(!message||typeof message!=='object')return;
 const playerState=message.event==='onStateChange'?Number(message.info):Number(message.info?.playerState);
 if([0,1,2,3,5].includes(playerState)){providerPlayback.paused=playerState!==1;updateMusicUI();if(playerState===0){if(musicRepeatMode===2)youtubeCommand('seekTo',[0,true]);else if(musicRepeatMode===1||state.musicIndex<state.musicQueue.length-1)musicNext(true)}}
 const info=message.info;if(info&&typeof info==='object'){const duration=Number(info.duration),position=Number(info.currentTime);if(Number.isFinite(duration)&&duration>0){providerPlayback.duration=duration;$('musicDuration').textContent=LX.fmt(duration);if(Number.isFinite(position)){providerPlayback.position=position;$('musicTime').textContent=LX.fmt(position);$('musicProgress').value=Math.max(0,Math.min(100,position/duration*100))}}}
});
async function setupMusicEmbed(desc,autoplay=false,expectedTicket=musicLoadTicket){
 const dock=$('musicDock'),panel=$('musicProviderPanel'),frame=$('musicProviderFrame'),host=$('spotifyEmbedHost'),toggle=$('musicProviderToggle');
 if(!desc||!dock||!panel||expectedTicket!==musicLoadTicket)return false;
 const kind=desc.provider==='Spotify'?'spotify':/^YouTube/i.test(String(desc.provider||''))?'youtube':'embed';
 providerPlayback={kind,paused:true,desc};
 dock.classList.add('external-provider','provider-open');panel.setAttribute('aria-hidden','false');panel.classList.remove('hidden');toggle?.classList.remove('hidden');
 if(frame){frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.referrerPolicy='origin-when-cross-origin'}
 if(kind==='spotify'){
  dock.classList.add('provider-spotify');dock.classList.remove('provider-youtube');host?.classList.remove('hidden');frame?.classList.add('hidden');
  const uri=desc.spotifyUri||String(desc.openUrl||'').replace(/^https:\/\/open\.spotify\.com\//,'spotify:').replace('/' , ':');
  try{
   await ensureSpotifyController(uri,autoplay,expectedTicket);if(expectedTicket!==musicLoadTicket)return false;providerPlayback.paused=spotifyPlayback.paused;updateMusicUI();return true;
  }catch(error){
   console.warn('LX Spotify controller fallback',error);host?.classList.add('hidden');
   if(frame){frame.src=desc.src||'';frame.dataset.provider='spotify-fallback';frame.style.height=Math.max(152,Number(desc.embedHeight)||152)+'px';frame.classList.remove('hidden');providerPlayback.kind='embed';providerPlayback.paused=true;}
   LX.toast('Player oficial do Spotify carregado. Se o navegador bloquear o início automático, toque em ▶ no player.');updateMusicUI();return true;
  }
 }
 host?.classList.add('hidden');
 if(frame){
  let src=desc.src||'';
  if(kind==='youtube'){
   dock.classList.add('provider-youtube');dock.classList.remove('provider-spotify');
   const join=src.includes('?')?'&':'?';if(!/enablejsapi=1/.test(src))src+=`${join}enablejsapi=1`;if(/^https?:$/.test(location.protocol)){if(!/[?&]origin=/.test(src))src+=`${src.includes('?')?'&':'?'}origin=${encodeURIComponent(location.origin)}`;if(!/[?&]widget_referrer=/.test(src))src+=`&widget_referrer=${encodeURIComponent(location.href)}`}src+=`${src.includes('?')?'&':'?'}autoplay=${autoplay?1:0}`;
   frame.onload=()=>{if(expectedTicket!==musicLoadTicket||providerPlayback.kind!=='youtube')return;providerPlayback.paused=true;if(autoplay)setTimeout(()=>{if(expectedTicket===musicLoadTicket)youtubeCommand('playVideo')},160);updateMusicUI()};
  }
  frame.src=src;frame.dataset.provider=kind;frame.style.height=Math.max(kind==='youtube'?220:152,Number(desc.embedHeight)||180)+'px';frame.classList.remove('hidden');
  if(kind==='youtube'&&autoplay)setTimeout(()=>{if(expectedTicket===musicLoadTicket)youtubeCommand('playVideo')},700);
 }
 updateMusicUI();return true;
}

LX.openMusicProvider=openMusicProvider;
function musicToggleSaved(id){if(id==null)return;let list=D.myList(),saved=list.some(x=>String(x)===String(id));list=saved?list.filter(x=>String(x)!==String(id)):[...list,id];S.write(S.keys.list,list);D.track('music_library',{id,saved:!saved});LX.toast(saved?'Removido da sua biblioteca.':'Salvo na sua biblioteca.');if(state.screen==='app'&&state.mode==='Ouvir')U.renderApp();const modalSave=$('lxAlbumSave'),active=!saved;if(modalSave){modalSave.classList.toggle('active',active);modalSave.textContent=active?'♥ Salvo':'♡ Salvar'}syncMusicSaveUI()}
function musicToggleSavedCurrent(){const t=currentMusic();if(!t)return LX.toast('Escolha uma música primeiro.');musicToggleSaved(t.contentId)}
function openMusicLyrics(id=null,index=null){const live=currentMusic(),x=id!=null?D.catalog().find(i=>String(i.id)===String(id)):currentMusicContent();if(!x)return LX.toast('Escolha uma música primeiro.');const trackIndex=index==null?(live?.index??state.musicIndex):index,track=x.tracks?.[trackIndex]||{},t=id==null&&live?live:{title:track.title||x.title,artist:track.artist||x.artist||'LX Music',cover:track.cover||x.cover||'',contentId:x.id,index:trackIndex},lyrics=String(track.lyrics||x.lyrics||'').trim(),about=String(x.desc||'').trim(),copy=lyrics||about,title=lyrics?'Letra':'Sobre esta faixa';$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-lyrics-page"><header><div class="lx-lyrics-cover" style="background-image:url('${String(t.cover||x.cover||'').replace(/'/g,'%27')}')"></div><div><span class="eyebrow">LX MUSIC · ${esc(title)}</span><h2>${esc(t.title||x.title)}</h2><p>${esc(t.artist||x.artist||'LX Music')}</p></div></header><article>${copy?String(copy).split(/\n+/).filter(Boolean).map(line=>`<p>${esc(line)}</p>`).join(''):`<div class="lx-lyrics-empty"><b>Letra ainda não cadastrada</b><span>O administrador pode adicionar a letra nos dados desta música.</span></div>`}</article><footer><button class="primary-btn" onclick="LX.music(${x.id},${trackIndex})">▶ Reproduzir</button><button class="secondary-btn" onclick="LX.openMusicQueue()">Abrir fila</button></footer></div>`;$('overlay').classList.remove('hidden')}
function openMusicAlbum(id){const x=D.catalog().find(i=>String(i.id)===String(id));if(!x)return;const tracks=(x.tracks?.length?x.tracks:((x.mediaKey||x.authorizedAudioUrl)?[{title:x.title,mediaKey:x.mediaKey||x.authorizedAudioUrl,duration:0}]:[])),provider=musicProvider(x),totalSecs=tracks.reduce((a,t)=>a+(+t.duration||0),0),saved=D.myList().some(z=>String(z)===String(id));$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-album-page lx-album-page-v256 lx-album-page-v260"><section class="lx-album-hero"><div class="lx-album-cover" style="background-image:url('${x.cover||x.banner||''}')"></div><div class="lx-album-copy"><span class="eyebrow">LX MUSIC · ${tracks.length>1?'ÁLBUM':'SINGLE'}</span><h2>${esc(x.title)}</h2><p>${esc(x.artist||'LX Music')} · ${x.year||'2026'} · ${esc(x.genre||'Música')}</p><div class="lx-album-badges"><span>${musicProviderBrandHtml(x,true)}</span><span>${tracks.length} ${tracks.length===1?'faixa':'faixas'}</span><span>${totalSecs?LX.fmt(totalSecs):'Ao vivo'}</span></div><div class="hero-actions"><button class="primary-btn" onclick="LX.music(${id},0)">▶ Reproduzir</button><button class="secondary-btn" onclick="LX.musicShuffleAlbum(${id})">⇄ Embaralhar</button><button id="lxAlbumSave" class="secondary-btn ${saved?'active':''}" onclick="LX.musicToggleSaved(${id})">${saved?'♥ Salvo':'♡ Salvar'}</button>${x.lyrics||x.desc?'<button class="secondary-btn" onclick="LX.openMusicLyrics('+id+',0)">≡ Letra</button>':''}</div></div></section><div class="lx-track-list lx-track-list-v256"><div class="lx-track-list-head"><span>#</span><span>Título</span><span>Duração</span><span></span></div>${tracks.map((t,i)=>`<button class="lx-track-row" data-music-id="${id}" onclick="LX.music(${id},${i})"><b>${i+1}</b><span><strong>${esc(t.title||`Faixa ${i+1}`)}</strong><small>${esc(t.artist||x.artist||'LX Music')}</small></span><em>${LX.fmt(t.duration||0)}</em><i data-music-play-icon>▶</i></button>`).join('')||'<div class="notice">Nenhuma faixa enviada ainda.</div>'}</div></div>`;$('overlay').classList.remove('hidden');queueMicrotask(syncMusicCardState)}
async function toggleCurrentMusic(){
 unlockMusicGesture();const t=currentMusic();if(!t)return;
 if(isExternalMusicTrack(t)){const d=providerPlayback.desc||musicEmbedDesc(t);if(!d){loadTrack(true);return}if(providerPlayback.kind==='spotify'){try{providerPlayback.paused?spotifyController?.play?.():spotifyController?.pause?.()}catch{openMusicProvider()}return}if(providerPlayback.kind==='youtube'){youtubeCommand(providerPlayback.paused?'playVideo':'pauseVideo');setMusicStatus('Aguardando confirmação do YouTube…','ready');if(!$('musicDock')?.classList.contains('provider-open'))openMusicProvider();return}openMusicProvider();return}
 const a=$('musicAudio');if(!a)return;
 if(!a.src||a.error||a.networkState===3){await loadTrack(true);return}
 if(!a.paused){a.pause();return}
 try{await a.play();setMusicStatus('Faixa completa','ready')}catch(error){console.warn('LX manual play',error);await recoverNativeMusicSource(t,true,error)}updateMusicUI()
}
function rememberMusicStart(id,index){const h=D.history(),old=h[id]||{};h[id]={...old,opened:Date.now(),musicIndex:index,playCount:(+old.playCount||0)+1};S.write(S.keys.history,h)}
let musicMediaPositionAt=0,lxYoutubeWasPlayingBeforeBackground=false;
function clearMusicMediaSessionHandlers(){if(!('mediaSession'in navigator))return;for(const action of ['play','pause','previoustrack','nexttrack','seekbackward','seekforward','seekto','stop']){try{navigator.mediaSession.setActionHandler?.(action,null)}catch{}}}
function syncMusicMediaPosition(a=$('musicAudio'),force=false){if(!('mediaSession'in navigator)||!a||isExternalMusicTrack())return;const duration=Number(a.duration),position=Number(a.currentTime),rate=Number(a.playbackRate)||1;if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(position))return;const now=Date.now();if(!force&&now-musicMediaPositionAt<900)return;musicMediaPositionAt=now;try{navigator.mediaSession.setPositionState?.({duration,playbackRate:rate,position:Math.max(0,Math.min(position,duration))})}catch{}}
function syncMusicMediaSession(t=currentMusic()){
 if(!('mediaSession'in navigator))return;
 try{
  clearMusicMediaSessionHandlers();
  if(!t){navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none';return}
  if(window.MediaMetadata){let art=LX.artwork.url(t,currentMusicContent()||{});try{art=new URL(art,location.href).href}catch{}navigator.mediaSession.metadata=new MediaMetadata({title:t.title||'Faixa',artist:t.artist||'LX Music',album:t.album||'LX Plus',artwork:[{src:art,sizes:'512x512'}]})}
  if(isExternalMusicTrack(t)){
   if(providerPlayback.kind==='youtube'){navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none';return}
   navigator.mediaSession.playbackState=providerPlayback.paused?'paused':'playing';
   navigator.mediaSession.setActionHandler?.('play',()=>{if(providerPlayback.kind==='spotify'){try{spotifyController?.play?.()}catch{}}else if(providerPlayback.kind==='youtube')youtubeCommand('playVideo')});
   navigator.mediaSession.setActionHandler?.('pause',()=>{if(providerPlayback.kind==='spotify'){try{spotifyController?.pause?.()}catch{}}else if(providerPlayback.kind==='youtube')youtubeCommand('pauseVideo')});
   navigator.mediaSession.setActionHandler?.('previoustrack',musicPrev);
   navigator.mediaSession.setActionHandler?.('nexttrack',()=>musicNext(true));
   navigator.mediaSession.setActionHandler?.('stop',()=>{if(providerPlayback.kind==='spotify'){try{spotifyController?.pause?.()}catch{}}else if(providerPlayback.kind==='youtube')youtubeCommand('pauseVideo');providerPlayback.paused=true;updateMusicUI()});
   return
  }
  const audio=()=>$('musicAudio');
  navigator.mediaSession.setActionHandler?.('play',async()=>{const a=audio();if(!a)return;try{await a.play()}catch{}updateMusicUI();syncMusicMediaPosition(a,true)});
  navigator.mediaSession.setActionHandler?.('pause',()=>{const a=audio();a?.pause();updateMusicUI();syncMusicMediaPosition(a,true)});
  navigator.mediaSession.setActionHandler?.('previoustrack',musicPrev);
  navigator.mediaSession.setActionHandler?.('nexttrack',()=>musicNext(true));
  navigator.mediaSession.setActionHandler?.('seekbackward',details=>{const a=audio();if(!a||!Number.isFinite(a.duration))return;a.currentTime=Math.max(0,a.currentTime-(Number(details?.seekOffset)||10));syncMusicMediaPosition(a,true)});
  navigator.mediaSession.setActionHandler?.('seekforward',details=>{const a=audio();if(!a||!Number.isFinite(a.duration))return;a.currentTime=Math.min(a.duration,a.currentTime+(Number(details?.seekOffset)||10));syncMusicMediaPosition(a,true)});
  navigator.mediaSession.setActionHandler?.('seekto',details=>{const a=audio(),time=Number(details?.seekTime);if(!a||!Number.isFinite(time)||!Number.isFinite(a.duration))return;try{if(details?.fastSeek&&typeof a.fastSeek==='function')a.fastSeek(Math.max(0,Math.min(time,a.duration)));else a.currentTime=Math.max(0,Math.min(time,a.duration))}catch{}syncMusicMediaPosition(a,true)});
  navigator.mediaSession.setActionHandler?.('stop',()=>{const a=audio();if(!a)return;a.pause();try{a.currentTime=0}catch{}updateMusicUI();syncMusicMediaPosition(a,true)});
  syncMusicMediaPosition(audio(),true);
 }catch(e){console.warn('LX media session',e)}
}
function music(id,index=0,autoplay=true){
 if(autoplay)unlockMusicGesture();
 const x=D.catalog().find(i=>String(i.id)===String(id));if(!x)return;
 const tracks=x.tracks?.length?x.tracks:((x.mediaKey||x.authorizedAudioUrl)?[{number:1,title:x.title,duration:0,mediaKey:x.mediaKey||x.authorizedAudioUrl,sourceMediaKey:x.mediaKey||''}]:[]);if(!tracks.length){LX.toast('Esta música ainda não possui áudio completo cadastrado.');return}
 const nextIndex=Math.max(0,Math.min(index,tracks.length-1)),same=String(currentMusic()?.contentId)===String(id)&&state.musicIndex===nextIndex&&!$('musicDock')?.classList.contains('hidden');if(same){if(autoplay)toggleCurrentMusic();return}
 D.track('music',{id,title:x.title});state.musicQueue=tracks.map((track,i)=>{const sourceMediaKey=track.sourceMediaKey||track.mediaKey||track.url||x.sourceMediaKey||x.mediaKey||x.externalMusicUrl||'',playbackKey=track.authorizedAudioUrl||track.authorizedStreamUrl||x.authorizedAudioUrl||x.authorizedStreamUrl||track.fullMediaKey||track.audioKey||track.audioUrl||track.mediaKey||track.url||x.fullMediaKey||x.audioKey||x.audioUrl||x.mediaKey||'';return {...track,sourceMediaKey,mediaKey:playbackKey,contentId:id,index:i,title:String(track.title||x.title||'Faixa').trim()||'Faixa',artist:String(track.artist||x.artist||'LX Music').trim()||'LX Music',youtubeThumbnail:track.youtubeThumbnail||x.youtubeThumbnail||'',spotifyArtwork:track.spotifyArtwork||x.spotifyArtwork||'',cover:String(track.cover||x.cover||LX.artwork.url({...track,sourceMediaKey},x)||LX.artwork.fallback),album:x.title,albumCover:x.cover||'',contentCover:x.cover||''}});state.musicIndex=nextIndex;$('musicDock').classList.remove('hidden');
 const chosen=state.musicQueue[nextIndex];setMusicDockArtwork(chosen,x);$('musicTitle').textContent=chosen.title||'Faixa';$('musicArtist').textContent=chosen.artist||'LX Music';
 loadTrack(autoplay).finally(()=>rememberMusicStart(id,nextIndex))
}
let musicLoadTicket=0,musicReadyPromise=Promise.resolve(false);
function setMusicStatus(text='',kind=''){const el=$('musicPlaybackKind');if(!el)return;el.textContent=text||'Faixa completa';el.classList.remove('hidden','is-loading','is-error','is-ready');if(kind)el.classList.add('is-'+kind);const play=$('musicPlay');if(play){play.disabled=kind==='loading';play.title=kind==='error'?'Tentar reproduzir novamente':kind==='loading'?'Carregando áudio':'Reproduzir ou pausar'}}
async function cloudBlobFallback(ref,item={}){if(!String(ref||'').startsWith('cloud:'))return null;try{let blob=await LX.cloud?.downloadMedia?.(String(ref));if(!blob)return null;blob=playableMusicBlob(blob,item,ref);cacheMusicSource(ref,blob);return blob}catch(e){console.warn('LX cloud blob fallback',e);return null}}
async function recoverNativeMusicSource(t,autoplay=true,previousError=null,quiet=false,expectedTicket=musicLoadTicket){
 const a=$('musicAudio'),ref=a?.dataset?.sourceRef||t?.mediaKey||'';
 if(!a||!String(ref).startsWith('cloud:'))return false;
 const current=()=>expectedTicket===musicLoadTicket&&currentMusic()===t;
 const trySource=async(media)=>{
  if(!media||!current())return false;
  try{
   let source=media;
   if(source instanceof Blob){source=playableMusicBlob(source,t,ref);if(musicObjectUrl?.startsWith?.('blob:'))URL.revokeObjectURL(musicObjectUrl);musicObjectUrl=URL.createObjectURL(source);source=musicObjectUrl}
   if(!current())return false;
   a.dataset.sourceRef=String(ref);a.src=String(source);a.load();await waitForMusicReady(a,10000);
   if(!current())return false;
   if(autoplay)await a.play();
   if(!current())return false;
   cacheMusicSource(ref,media);providerPlayback={kind:'native',paused:!autoplay,desc:null};setMusicStatus('Faixa completa','ready');return true
  }catch(error){if(error?.name==='NotAllowedError'&&current()&&a.readyState>=2){setMusicStatus('Pronta · toque em ▶ para iniciar','ready');return true}console.warn('LX media source recovery',error);return false}
 };
 try{
  const ticket=await fetchMusicTicket(ref,7200);if(await trySource(ticket))return true;if(!current())return false;
  const saved=musicSignedFallbackCache.get(String(ref));if(saved&&saved!==ticket&&await trySource(saved))return true;if(!current())return false;
  if(LX.cloud?.db?.()){
   try{const path=String(ref).slice(6).replace(/^\/+/,''),bucket=LX.config?.supabase?.mediaBucket||'lx-media';const signed=await LX.cloud.db().storage.from(bucket).createSignedUrl(path,7200);if(!signed.error&&signed.data?.signedUrl){musicSignedFallbackCache.set(String(ref),signed.data.signedUrl);if(await trySource(signed.data.signedUrl))return true}}catch(error){console.warn('LX music signed URL',error)}
  }
  if(!current())return false;
  const blob=await cloudBlobFallback(ref,t);if(await trySource(blob))return true
 }catch(error){console.warn('LX native recovery failed',previousError,error)}
 if(current()&&!quiet){setMusicStatus('Falha no áudio','error');LX.toast('Não foi possível abrir esta faixa. Toque em ▶ para tentar novamente.')}
 return false
}
async function loadTrack(autoplay=false){
 const t=currentMusic();if(!t)return false;const ticket=++musicLoadTicket,a=$('musicAudio'),content=currentMusicContent()||{},trackMark=String(t.contentId)+'|'+String(t.index??state.musicIndex);
 if(autoplay)unlockMusicGesture();if(a.dataset.trackMark!==trackMark){a.dataset.trackMark=trackMark;delete a.dataset.recovery}a.dataset.loadingTrackTicket=String(ticket);a.dataset.sourceRef='';setMusicStatus('Carregando áudio…','loading');
 a.pause();a.removeAttribute('src');a.load();if(musicObjectUrl?.startsWith?.('blob:'))try{URL.revokeObjectURL(musicObjectUrl)}catch{}musicObjectUrl=null;resetMusicProvider();
 $('musicTitle').textContent=t.title||'Faixa';$('musicArtist').textContent=t.artist||'LX Music';syncMusicProviderBrand(t);setMusicDockArtwork(t,content);$('musicProgress').value=0;$('musicTime').textContent='0:00';$('musicDuration').textContent=Number(t.duration)>0?LX.fmt(t.duration):'—';if($('musicProviderLabel'))$('musicProviderLabel').textContent='LX Music';syncMusicMediaSession(t);syncMusicCardState();document.dispatchEvent(new CustomEvent('lx:music-changed',{detail:{item:t,index:state.musicIndex,provider:musicProvider(content)}}));
 const refs=[t.authorizedAudioUrl,t.authorizedStreamUrl,t.fullMediaKey,t.audioKey,t.mediaKey,t.audioUrl,t.url,t.src,t.sourceMediaKey,content.authorizedAudioUrl,content.authorizedStreamUrl,content.fullMediaKey,content.audioKey,content.mediaKey].filter(Boolean);let embed=null,cloudRef='',lastError=null;
 try{
  for(const ref of [...new Set(refs)]){
   const desc=LX.mediaSources?.describe?.(ref);if(desc?.kind==='embed'){embed=embed||desc;continue}if(String(ref).startsWith('cloud:'))cloudRef=String(ref);
   let media=cachedMusicSource(ref);if(!media&&desc?.kind==='direct'&&desc.src)media=cacheMusicSource(ref,desc.src);if(!media)media=await prewarmMusicRef(ref);if(ticket!==musicLoadTicket)return false;if(!media)continue;
   try{
    let source=media;if(source instanceof Blob){source=playableMusicBlob(source,t,ref);musicObjectUrl=URL.createObjectURL(source);source=musicObjectUrl}
    a.dataset.sourceRef=String(ref);a.preload='auto';a.src=String(source);a.load();await waitForMusicReady(a,8500);if(ticket!==musicLoadTicket)return false;
    if(autoplay)await a.play();providerPlayback={kind:'native',paused:!autoplay,desc:null};setMusicStatus('Faixa completa','ready');updateMusicUI();return true
   }catch(error){if(ticket!==musicLoadTicket)return false;if(error?.name==='NotAllowedError'&&a.readyState>=2){setMusicStatus('Pronta · toque em ▶ para iniciar','ready');updateMusicUI();return true}lastError=error;console.warn('LX music source failed',error);musicSourceCache.delete(String(ref));a.pause();a.removeAttribute('src');a.load();if(musicObjectUrl?.startsWith?.('blob:'))try{URL.revokeObjectURL(musicObjectUrl)}catch{}musicObjectUrl=null;if(ticket!==musicLoadTicket)return false}
  }
  if(cloudRef){a.dataset.sourceRef=cloudRef;const ok=await recoverNativeMusicSource(t,autoplay,lastError,true);if(ticket!==musicLoadTicket)return false;if(ok){updateMusicUI();return true}}
  if(embed){await setupMusicEmbed(embed,autoplay,ticket);if(ticket!==musicLoadTicket)return false;setMusicStatus('Use o player oficial para reproduzir','ready');syncMusicProviderBrand(t);syncMusicMediaSession(t);updateMusicUI();return true}
  a.removeAttribute('src');a.load();$('musicDuration').textContent='—';setMusicStatus('Áudio indisponível · tente novamente','error');if(autoplay&&!cloudRef)LX.toast(lastError?.name==='NotAllowedError'?'Toque em ▶ para iniciar a música.':'Esta faixa não possui uma fonte reproduzível agora.');updateMusicUI();return false
 }catch(error){if(ticket!==musicLoadTicket)return false;console.warn('LX music load',error);$('musicDuration').textContent='—';setMusicStatus('Falha no áudio · tente novamente','error');updateMusicUI();return false}
 finally{if(a.dataset.loadingTrackTicket===String(ticket))delete a.dataset.loadingTrackTicket}
}
function updateMusicUI(){const a=$('musicAudio'),t=currentMusic(),paused=isExternalMusicTrack(t)?providerPlayback.paused:a.paused,status=$('musicPlaybackKind');$('musicPlay').innerHTML=LX.artwork.icon(paused?'play':'pause');$('musicPlay').title=status?.classList.contains('is-error')?'Tentar novamente':status?.classList.contains('is-loading')?'Carregando áudio':'Reproduzir ou pausar';$('musicPlay').setAttribute('aria-label',$('musicPlay').title);$('musicShuffle').classList.toggle('active',musicShuffleMode);$('musicShuffle').setAttribute('aria-pressed',String(musicShuffleMode));$('musicRepeat').classList.toggle('active',musicRepeatMode>0);$('musicRepeat').innerHTML=LX.artwork.icon('repeat')+(musicRepeatMode===2?'<sup>1</sup>':'');$('musicRepeat').setAttribute('aria-pressed',String(musicRepeatMode>0));try{if('mediaSession'in navigator)navigator.mediaSession.playbackState=t?(paused?'paused':'playing'):'none'}catch{}syncMusicCardState();syncMusicSaveUI();syncRightMusicRail?.()}
function musicNext(auto=true){if(!state.musicQueue.length)return;if(musicShuffleMode&&state.musicQueue.length>1){let n=state.musicIndex;while(n===state.musicIndex)n=Math.floor(Math.random()*state.musicQueue.length);state.musicIndex=n}else state.musicIndex=(state.musicIndex+1)%state.musicQueue.length;loadTrack(auto)}
function musicPrev(){if(!state.musicQueue.length)return;state.musicIndex=(state.musicIndex-1+state.musicQueue.length)%state.musicQueue.length;loadTrack(true)}
function openMusicQueue(){const queue=state.musicQueue||[];$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page lx-queue-page"><div class="panel-head"><div><span class="eyebrow">LX MUSIC</span><h2>Fila de reprodução</h2><p>${queue.length} ${queue.length===1?'faixa':'faixas'} na fila.</p></div></div>${queue.length?`<div class="lx-track-list">${queue.map((t,i)=>`<button class="${i===state.musicIndex?'active':''}" data-music-id="${esc(t.contentId)}" onclick="LX.musicQueuePlay(${i})">${LX.artwork.markup(t,{},'lx-queue-art',t.title)}<span><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></span><em>${LX.fmt(t.duration||0)}</em><i data-music-play-icon>${LX.artwork.icon('play')}</i></button>`).join('')}</div>`:musicEmpty('Sua fila está vazia','Escolha uma música para começar.')}</div>`;$('overlay').classList.remove('hidden');LX.artwork.hydrate($('modal'));queueMicrotask(syncMusicCardState)}
function saveMusicProgress(){const a=$('musicAudio'),t=currentMusic();if(!t)return;const duration=a.duration,position=a.currentTime;if(!duration)return;const h=D.history();h[t.contentId]={...(h[t.contentId]||{}),progress:position/duration*100,position,duration,musicIndex:state.musicIndex,opened:Date.now()};S.write(S.keys.history,h)}
$('musicPlay').onclick=()=>toggleCurrentMusic();$('musicPrev').onclick=musicPrev;$('musicNext').onclick=()=>musicNext(true);$('musicProviderPrev')&&($('musicProviderPrev').onclick=musicPrev);$('musicProviderNext')&&($('musicProviderNext').onclick=()=>musicNext(true));$('musicProviderToggle')&&($('musicProviderToggle').onclick=()=>LX.openMusicProvider());$('musicClose').onclick=()=>{try{spotifyController?.pause?.()}catch{};$('musicAudio').pause();resetMusicProvider();$('musicDock').classList.add('hidden');spotifyPlayback.paused=true;syncMusicCardState();document.dispatchEvent(new Event('lx:music-closed'))};$('musicShuffle').onclick=()=>{musicShuffleMode=!musicShuffleMode;updateMusicUI()};$('musicRepeat').onclick=()=>{musicRepeatMode=(musicRepeatMode+1)%3;updateMusicUI()};$('musicQueueBtn').onclick=openMusicQueue;$('musicCoverBtn').onclick=()=>{const t=currentMusic();if(t)LX.openMusicAlbum(t.contentId)};$('musicVolume').oninput=()=>{const v=+$('musicVolume').value;$('musicAudio').volume=v;if(providerPlayback.kind==='youtube')youtubeCommand('setVolume',[Math.round(v*100)])};$('musicAudio').onerror=()=>{const a=$('musicAudio'),t=currentMusic();if(!t||!a?.src||a.dataset.loadingTrackTicket||isExternalMusicTrack(t))return;console.warn('LX music element error',a.error);musicSourceCache.delete(String(a.dataset.sourceRef||''));$('musicDuration').textContent='—';setMusicStatus('Fonte interrompida · toque em ▶ para tentar','error');updateMusicUI()};$('musicAudio').onloadedmetadata=()=>{const a=$('musicAudio');$('musicDuration').textContent=Number.isFinite(a.duration)&&a.duration>0?LX.fmt(a.duration):'—';syncMusicMediaSession(currentMusic());syncMusicMediaPosition(a,true)};$('musicAudio').onplay=()=>{syncMusicMediaSession(currentMusic());syncMusicMediaPosition($('musicAudio'),true);updateMusicUI()};$('musicAudio').onpause=()=>{saveMusicProgress();syncMusicMediaPosition($('musicAudio'),true);updateMusicUI()};$('musicAudio').ontimeupdate=()=>{const a=$('musicAudio');if(a.duration){$('musicProgress').value=a.currentTime/a.duration*100;$('musicTime').textContent=LX.fmt(a.currentTime);$('musicDuration').textContent=LX.fmt(a.duration);syncMusicMediaPosition(a);if(Date.now()-musicSaveAt>5000){musicSaveAt=Date.now();saveMusicProgress()}}};$('musicAudio').onended=()=>{saveMusicProgress();if(musicRepeatMode===2){$('musicAudio').currentTime=0;$('musicAudio').play().catch(()=>{})}else if(musicRepeatMode===1||state.musicIndex<state.musicQueue.length-1)musicNext(true);else updateMusicUI()};$('musicProgress').oninput=()=>{const a=$('musicAudio');if(a.duration){a.currentTime=+$('musicProgress').value/100*a.duration;syncMusicMediaPosition(a,true)}};
document.addEventListener('lx:music-artwork-updated',event=>{if(currentMusic()!==event.detail?.item)return;const t=event.detail.item;setMusicDockArtwork(t,currentMusicContent()||{});$('musicTitle').textContent=t.title||'Faixa';$('musicArtist').textContent=t.artist||'LX Music';syncMusicProviderBrand(t);$('musicDuration').textContent=LX.fmt(t.duration||0);syncMusicMediaSession(t);syncMusicCardState();document.dispatchEvent(new Event('lx:music-changed'))});$('musicLikeBtn')&&($('musicLikeBtn').onclick=musicToggleSavedCurrent);$('musicLyricsBtn')&&($('musicLyricsBtn').onclick=()=>openMusicLyrics());
document.addEventListener('visibilitychange',()=>{
 const t=currentMusic();if(!t)return;
 if(document.visibilityState==='hidden'&&providerPlayback.kind==='youtube'){youtubeCommand('pauseVideo');providerPlayback.paused=true;updateMusicUI();return}
 syncMusicMediaSession(t);
 if(!isExternalMusicTrack(t))syncMusicMediaPosition($('musicAudio'),true);
});
document.addEventListener('keydown',e=>{const target=e.target,typing=target?.matches?.('input,textarea,select,button,a,[contenteditable="true"]');if(state.screen!=='app')return;if(e.key==='/'&&!typing){e.preventDefault();$('searchWrap')?.classList.add('open');$('searchInput')?.focus();return}if(state.mode!=='Ouvir'||$('musicDock')?.classList.contains('hidden')||typing||!$('overlay')?.classList.contains('hidden')||document.getElementById('lxGlobalCinema'))return;if(e.code==='Space'){e.preventDefault();toggleCurrentMusic()}else if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();musicNext(true)}else if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();musicPrev()}else if(e.key.toLowerCase()==='m'){const a=$('musicAudio');a.muted=!a.muted;LX.toast(a.muted?'Som desativado.':'Som ativado.')}});
function openRequests(){const mine=D.requests().filter(x=>(x.voters||[]).includes(state.user?.email)||x.userEmail===state.user?.email).sort((a,b)=>b.created-a.created);$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><div class="panel-head"><div><span class="eyebrow">CENTRAL LX</span><h2>Pedidos & Ajuda</h2><p>Pedidos iguais são agrupados para mostrar ao ADM o que a comunidade mais quer.</p></div></div><div class="request-grid"><div class="request-card"><strong>Novo pedido</strong><small>Filme, série, anime, dorama, livro ou música.</small><form id="reqForm" class="request-form"><label>Tipo<select id="reqMedia"><option>Filme</option><option>Série</option><option>Anime</option><option>Dorama</option><option>Livro</option><option>Música</option></select></label><label>Nome<input id="reqTitle" required></label><label>Observação<textarea id="reqMsg" rows="3"></textarea></label><button class="primary-btn">Enviar pedido</button></form></div><div class="request-card"><strong>Reclamação, sugestão ou problema técnico</strong><small>Vídeo, episódio, livro, música, conta ou outro erro.</small><form id="problemForm" class="request-form"><label>Categoria<select id="problemKind"><option>Problema técnico</option><option>Reclamação</option><option>Sugestão</option></select></label><label>Área<select id="problemMedia"><option>Filme</option><option>Série</option><option>Anime</option><option>Dorama</option><option>Livro</option><option>Música</option><option>Conta / Perfil</option><option>Outro</option></select></label><label>Assunto<input id="problemTitle" required></label><label>Descrição<textarea id="problemMsg" required rows="3"></textarea></label><button class="primary-btn">Enviar solicitação</button></form></div></div><h3>Minhas solicitações</h3><div class="user-request-list">${mine.length?mine.map(x=>`<div class="user-request-row"><span>${x.kind==='Pedido'?'＋':'!'}</span><div><strong>${esc(x.title)}</strong><small style="display:block;color:var(--muted)">${esc(x.kind)} · ${esc(x.mediaType)} · ▲ ${x.votes||1}</small></div><b>${esc(x.status)}</b></div>`).join(''):'<div class="notice">Você ainda não enviou solicitações.</div>'}</div></div>`;$('overlay').classList.remove('hidden');$('reqForm').onsubmit=e=>{e.preventDefault();addRequest('Pedido',$('reqMedia').value,$('reqTitle').value,$('reqMsg').value);openRequests()};$('problemForm').onsubmit=e=>{e.preventDefault();addRequest('Problema',$('problemKind').value+' · '+$('problemMedia').value,$('problemTitle').value,$('problemMsg').value);openRequests()}}
function addRequest(kind,mediaType,title,message){const r={id:Date.now(),kind,mediaType,title:title.trim(),message:(message||'').trim(),status:'Novo',created:Date.now(),userEmail:state.user?.email||'',userName:state.profile?.name||state.user?.name||'Usuário'};const z=D.addOrVoteRequest(r);D.track('request',{kind,mediaType,title:r.title,merged:z.merged});LX.toast(z.merged?'Esse pedido já existia: seu voto foi somado.':kind==='Pedido'?'Pedido enviado ao ADM.':'Solicitação enviada ao ADM.')}
function openRanking(){const u=D.users().filter(x=>x.visible!==false),score=x=>state.rankingKind==='Assistiu'?x.watched:state.rankingKind==='Ouviu'?x.listened:state.rankingKind==='Leu'?x.read*10:(x.watched+x.listened+x.read*6),rows=[...u].sort((a,b)=>score(b)-score(a));$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><div class="panel-head"><div><span class="eyebrow">COMUNIDADE</span><h2>Ranking LX</h2><p>Participação opcional e controlada pelo usuário.</p></div></div><div class="tabs">${['Semanal','Mensal','Geral'].map(x=>`<button class="${x===state.rankingPeriod?'active':''}" onclick="LX.rankPeriod('${x}')">${x}</button>`).join('')}</div><div class="tabs">${['Geral','Assistiu','Ouviu','Leu'].map(x=>`<button class="${x===state.rankingKind?'active':''}" onclick="LX.rankKind('${x}')">${x}</button>`).join('')}</div><div class="ranking-table">${rows.map((x,i)=>`<div class="rank-row"><span class="position">#${i+1}</span><div><strong>${LX.verified(x.name,x.verified)}</strong><small style="display:block;color:var(--muted)">${x.streak||0} dias seguidos</small></div><b>${Math.round(score(x))} pts</b></div>`).join('')}</div></div>`;$('overlay').classList.remove('hidden')}
function openProfile(){const email=state.user?.email||'',style=LX.profileStyle(email),u=D.users().find(x=>x.email===email)||{name:state.user?.name||'Usuário',watched:0,listened:0,read:0,streak:1,visible:true},pref=D.preferences()[email]||{genres:[],autoplay:true},sub=D.subscriptions()[email],premium=!!sub?.active;const genres=[...new Set(D.catalog().flatMap(x=>[x.genre,...(x.genres||[])]).filter(Boolean))].sort(),frames=premium?['none','gold','neon','ice']:['none'];$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page profile-page-v25"><div class="panel-head"><div><span class="eyebrow">PERFIL LX ${premium?'<span class="premium-user-pill">PREMIUM</span>':''}</span><h2>${LX.verified(u.name,u.verified,'md')}</h2><p>${esc(style.bio||'Personalize sua identidade, preferências e experiência na LX Plus.')}</p></div><button class="glass-btn" onclick="LX.openTheme()">Aparência & App</button></div><div class="profile-panel"><aside class="profile-side ${premium?'premium-profile-side':''}">${LX.avatarHTML(u.name,email,'big-avatar')}<h3>${LX.verified(u.name,u.verified,'md')}</h3><p class="profile-bio-preview">${esc(style.bio||'Sem bio ainda.')}</p><p style="color:var(--muted);font-size:10px">${esc(email)}</p>${state.user?.admin?'<span class="admin-chip">⚙ Conta com acesso ADM</span>':''}${premium?`<div class="premium-status-card"><div><b>Premium ativo</b><small>${esc(sub.plan||'Mensal')} · ${sub.until?`até ${new Date(sub.until).toLocaleDateString('pt-BR')}`:'sem vencimento definido'}</small></div><span class="premium-badge">PLUS +</span></div>`:'<button class="glass-btn full" onclick="LX.openPremium()">Conhecer Premium</button>'}<label class="check"><input id="rankPrivacy" type="checkbox" ${u.visible!==false?'checked':''}><span>Aparecer no Ranking LX</span></label><button class="glass-btn full" onclick="LX.tvMode()">Abrir Modo TV</button>${state.user?.admin?'<button class="primary-btn full" onclick="LX.openAdmin()">Abrir Painel ADM</button>':''}</aside><div><div class="profile-stats"><div><strong>${Math.round(u.watched||0)}h</strong><small>ASSISTIDAS</small></div><div><strong>${Math.round(u.listened||0)}h</strong><small>OUVIDAS</small></div><div><strong>${u.read||0}</strong><small>LEITURAS</small></div><div><strong>${u.streak||0}</strong><small>DIAS SEGUIDOS</small></div></div><section class="profile-personalization account-editor"><div class="profile-section-head"><div><h3>Informações do perfil</h3><p>Nome e bio ficam sincronizados com a sua conta.</p></div><span class="v19-pill">V25</span></div><div class="form-grid profile-edit-grid"><label class="field">Nome do perfil<input id="profileNameEdit" maxlength="40" value="${esc(u.name)}"></label><label class="field span2">Bio curta<textarea id="profileBioEdit" maxlength="120" rows="3" placeholder="Conte um pouco sobre você...">${esc(style.bio||'')}</textarea></label></div><button class="primary-btn" onclick="LX.saveProfileDetails()">Salvar perfil</button></section><section class="profile-personalization profile-logo-editor"><div class="profile-section-head"><div><h3>Identidade do perfil</h3><p>Escolha logo, avatar, formato e moldura.</p></div><span class="v19-pill">PERSONALIZE</span></div><div class="avatar-picker">${Object.entries(LX.PROFILE_PRESETS).map(([k,v])=>`<button class="avatar-choice ${style.preset===k&&!style.image?'active':''}" onclick="LX.setProfilePreset('${k}')" title="${esc(v.label)}"><span style="background:${v.bg}">${esc(v.mark)}</span><small>${esc(v.label)}</small></button>`).join('')}</div><div class="avatar-upload-row"><label class="glass-btn avatar-upload-btn">Enviar foto/logo<input id="profileLogoFile" type="file" accept="image/*"></label><button class="glass-btn" onclick="LX.clearProfileImage()">Voltar para logo LX</button></div><div class="profile-option-row"><div><b>Formato</b><div class="segmented compact-segment"><button class="${(style.shape||'rounded')==='rounded'?'active':''}" onclick="LX.setProfileShape('rounded')">Arredondado</button><button class="${style.shape==='circle'?'active':''}" onclick="LX.setProfileShape('circle')">Redondo</button><button class="${style.shape==='square'?'active':''}" onclick="LX.setProfileShape('square')">Quadrado</button></div></div><div><b>Moldura ${premium?'<span class="premium-user-pill">PREMIUM</span>':''}</b><div class="frame-picker">${frames.map(f=>`<button class="frame-choice frame-${f} ${(style.frame||'none')===f?'active':''}" onclick="LX.setProfileFrame('${f}')">${f==='none'?'Sem moldura':f==='gold'?'Dourada':f==='neon'?'Neon':'Ice'}</button>`).join('')}</div>${!premium?'<small class="profile-help">Molduras especiais são um benefício Premium.</small>':''}</div></div><div class="avatar-photo-grid">${LX.PROFILE_GALLERY.map((item,idx)=>`<button class="avatar-photo-choice ${style.image===item.url?'active':''}" onclick="LX.setGalleryAvatar(${idx})"><span style="background-image:url('${item.url}')"></span><small>${esc(item.label)}</small></button>`).join('')}</div><small class="profile-mini-note">Galeria moderna com estilos prontos para trocar a foto sem sair da LX Plus.</small></section><div class="profile-personalization"><h3>Seu gosto na LX</h3><p>Escolha gêneros para melhorar as recomendações.</p><div class="taste-grid">${genres.map(g=>`<button class="taste-chip ${(pref.genres||[]).includes(g)?'active':''}" onclick="LX.toggleGenre('${esc(g).replace(/'/g,'&#39;')}')">${esc(g)}</button>`).join('')}</div><label class="check" style="margin-top:12px"><input id="autoplayPref" type="checkbox" ${pref.autoplay!==false?'checked':''}><span>Reproduzir próximo episódio automaticamente</span></label></div><div class="profile-quick-grid"><button onclick="LX.openPremium()"><span>＋</span><strong>Premium</strong><small>Plano e benefícios</small></button><button onclick="LX.openTheme()"><span>✦</span><strong>Modo App</strong><small>Aparência e instalação</small></button><button onclick="LX.social.open()"><span>👥</span><strong>Pessoas</strong><small>Amigos e chamadas</small></button><button onclick="LX.openRequests()"><span>!</span><strong>Central LX</strong><small>Pedidos e problemas</small></button></div><h3>Histórico recente</h3><div class="notification-list">${Object.entries(D.history()).sort((a,b)=>(b[1].opened||0)-(a[1].opened||0)).slice(0,7).map(([id,h])=>{const c=D.catalog().find(x=>x.id==id);return c?`<div class="notice"><strong>${esc(c.title)}</strong><small>${h.position?`${LX.fmt(h.position)} de ${LX.fmt(h.duration||0)} · `:''}${Math.round(h.progress||0)}% concluído</small></div>`:''}).join('')||'<div class="notice">Seu histórico aparecerá aqui.</div>'}</div></div></div></div>`;$('overlay').classList.remove('hidden');$('rankPrivacy').onchange=e=>{const a=D.users(),x=a.find(z=>z.email===email);if(x){x.visible=e.target.checked;D.saveUsers(a);LX.toast('Privacidade atualizada.')}};$('autoplayPref').onchange=e=>{const all=D.preferences(),p=all[email]||{genres:[]};p.autoplay=e.target.checked;all[email]=p;D.savePreferences(all);LX.toast('Preferência atualizada.')};$('profileLogoFile').onchange=e=>setProfileImage(e.target.files?.[0])}
function openNotifications(){const n=D.notices();$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><div class="panel-head"><div><span class="eyebrow">ATUALIZAÇÕES</span><h2>Notificações</h2></div><button class="glass-btn" onclick="LX.readAll()">Marcar como lidas</button></div><div class="notification-list">${n.map(x=>`<div class="notice"><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p><small>${esc(x.time)}</small></div>`).join('')}</div></div>`;$('overlay').classList.remove('hidden')}

function openPremium(){const email=state.user?.email||'',sub=D.subscriptions()[email];$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page premium-page-v25"><div class="premium-hero premium-hero-v25"><span class="premium-badge">LX PLUS PREMIUM</span><h2>${sub?.active?'Sua experiência Premium está ativa.':'Mais personalização. Mais controle. Mais LX.'}</h2><p>${sub?.active?`Plano ${esc(sub.plan||'Mensal')} ativo${sub.until?` até ${new Date(sub.until).toLocaleDateString('pt-BR')}`:''}.`:'O Premium libera recursos visuais e de experiência sem alterar seu histórico nem sua lista.'}</p><div class="premium-benefit-strip"><span>✦ Molduras exclusivas</span><span>▱ Experiência avançada</span><span>☁ Preferências sincronizadas</span><span>♛ Destaque no perfil</span></div></div><div class="premium-feature-grid"><div><span>◈</span><strong>Perfil Premium</strong><small>Molduras Gold, Neon e Ice com identidade diferenciada.</small></div><div><span>▶</span><strong>Player completo</strong><small>Autoplay, mini player, PiP e retomada no segundo exato.</small></div><div><span>✦</span><strong>Personalização</strong><small>Mais opções para adaptar a interface ao seu estilo.</small></div><div><span>☁</span><strong>Continuidade</strong><small>Preferências e progresso sincronizados quando a nuvem está ativa.</small></div></div><div class="plan-grid"><article class="plan-card"><span class="eyebrow">FREE</span><h3>LX Free</h3><div class="plan-price">R$ 0</div><ul><li>Catálogo e recomendações</li><li>Minha Lista</li><li>Progresso e avaliações</li></ul><button class="glass-btn">Plano padrão</button></article><article class="plan-card featured"><span class="premium-badge">RECOMENDADO</span><h3>Premium Mensal</h3><div class="plan-price">R$ 9,90 <small>/mês</small></div><ul><li>Molduras Premium</li><li>Identidade destacada</li><li>Recursos avançados da experiência</li></ul><button class="primary-btn" onclick="LX.choosePlan('Mensal')">${sub?.active&&sub.plan==='Mensal'?'Ativo':'Escolher mensal'}</button></article><article class="plan-card"><span class="eyebrow">ECONOMIZE</span><h3>Premium Anual</h3><div class="plan-price">R$ 90 <small>/ano</small></div><ul><li>Todos os recursos Premium</li><li>Uma cobrança anual</li><li>Gerenciamento pelo perfil</li></ul><button class="primary-btn" onclick="LX.choosePlan('Anual')">${sub?.active&&sub.plan==='Anual'?'Ativo':'Escolher anual'}</button></article></div></div>`;$('overlay').classList.remove('hidden')}
function choosePlan(plan){const email=state.user?.email;if(!email)return LX.toast('Entre em uma conta para continuar.');if(LX.cloud?.enabled?.()){addRequest('Pedido','Premium',`Premium ${plan}`,`Solicitação do plano ${plan}.`);LX.toast('Solicitação Premium enviada ao ADM.');return}const all=D.subscriptions(),days=plan==='Anual'?365:30;all[email]={active:true,plan,started:Date.now(),until:Date.now()+days*86400000,demo:true};D.saveSubscriptions(all);D.track('premium_demo',{plan});LX.toast(`Premium ${plan.toLowerCase()} ativado no modo de demonstração.`);U.renderApp();openPremium()}
function toggleGenre(genre){const email=state.user?.email;if(!email)return;const all=D.preferences(),p=all[email]||{genres:[],autoplay:true};p.genres=p.genres||[];p.genres.includes(genre)?p.genres=p.genres.filter(x=>x!==genre):p.genres.push(genre);all[email]=p;D.savePreferences(all);D.track('preference_genre',{genre,active:p.genres.includes(genre)});U.renderHome();openProfile()}
function openLegal(kind='about'){const b=D.branding?.()||{};const map={about:['Sobre a LX Plus',b.legalAbout||'LX Plus reúne streaming, música, leitura e comunidade em uma única experiência.'],terms:['Termos de uso',b.legalTerms||'Os termos de uso ainda não foram configurados pelo administrador.'],privacy:['Privacidade',b.legalPrivacy||'A política de privacidade ainda não foi configurada pelo administrador.']};const [title,text]=map[kind]||map.about;$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><div class="panel-head"><div><span class="eyebrow">LX PLUS</span><h2>${esc(title)}</h2></div></div><div class="admin-card"><p style="white-space:pre-wrap;line-height:1.7">${esc(text)}</p>${b.supportEmail?`<p><a class="glass-btn" href="mailto:${esc(b.supportEmail)}">Falar com suporte</a></p>`:''}</div></div>`;$('overlay').classList.remove('hidden')}
function uiPrefs(){return {...{font:'modern',density:'balanced',posterSize:'small'},...(S.read(S.keys.uiPrefs,{})||{})}}
function applyTheme(){const theme=S.read(S.keys.theme,'dark'),accent=S.read(S.keys.accent,'#42a5ff'),layout=S.read(S.keys.layoutMode,'cinema'),motion=S.read(S.keys.motion,'full'),prefs=uiPrefs();document.documentElement.dataset.theme=theme;document.body.dataset.theme=theme;document.body.classList.toggle('light',theme==='light');document.documentElement.dataset.font=prefs.font||'modern';document.body.dataset.font=prefs.font||'modern';document.documentElement.dataset.density=prefs.density||'balanced';document.body.dataset.density=prefs.density||'balanced';document.documentElement.dataset.posterSize=prefs.posterSize||'small';document.body.dataset.posterSize=prefs.posterSize||'small';document.documentElement.style.setProperty('--accent',accent);document.documentElement.style.setProperty('--accent2',accent);document.body.classList.toggle('app-mode',layout==='app');document.body.classList.toggle('compact-mode',layout==='compact');document.body.classList.toggle('motion-reduced',motion==='reduced');document.documentElement.dataset.layout=layout;document.documentElement.dataset.motion=motion;const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=theme==='light'?'#f4f6f8':theme==='oled'?'#000000':'#03070c'}
function setUiPref(key,value){const p=uiPrefs();p[key]=value;S.write(S.keys.uiPrefs,p);applyTheme();LX.toast('Visual atualizado.');openTheme()}
function setLayout(mode='cinema'){S.write(S.keys.layoutMode,mode);applyTheme();LX.toast('Layout atualizado.');openTheme()}
function setMotion(mode='full'){S.write(S.keys.motion,mode);applyTheme();LX.toast(mode==='reduced'?'Animações reduzidas.':'Animações completas.');openTheme()}
async function installApp(){if(deferredInstall){try{await deferredInstall.prompt();await deferredInstall.userChoice}catch{}deferredInstall=null;return}LX.toast('Use a opção “Instalar aplicativo” do seu navegador quando disponível.')}
async function tvMode(){const el=document.documentElement;try{if(!document.fullscreenElement&&el.requestFullscreen)await el.requestFullscreen();else if(document.fullscreenElement)await document.exitFullscreen()}catch{}LX.toast(document.fullscreenElement?'Modo TV ativado.':'Modo TV pronto.')}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});
function openTheme(){const theme=S.read(S.keys.theme,'dark'),layout=S.read(S.keys.layoutMode,'cinema'),motion=S.read(S.keys.motion,'full'),accent=S.read(S.keys.accent,'#42a5ff'),prefs=uiPrefs();const accents=[['Azul LX','#42a5ff'],['Roxo','#8a2be2'],['Vermelho','#e13a4f'],['Chocolate','#a66b45'],['Dourado','#d5a63c'],['Verde','#2bbf8a'],['Ciano','#36c6e8'],['Branco','#e9eef4']];$('modal').innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page appearance-page lx-appearance-v32"><div class="panel-head"><div><span class="eyebrow">IDENTIDADE LX</span><h2>Aparência</h2><p>Personalize cores e organização sem alterar o nome ou a identidade LX Plus.</p></div></div><div class="appearance-grid"><section class="appearance-card span2"><span class="appearance-icon">◐</span><h3>Ambiente</h3><p>Escolha a base visual da plataforma.</p><div class="lx-theme-choice">${[['dark','Escuro'],['midnight','Midnight'],['oled','OLED'],['light','Claro']].map(([v,n])=>`<button class="${theme===v?'active':''}" onclick="LX.setTheme('${v}');LX.openTheme()"><b>${n}</b><small>${v==='oled'?'Preto absoluto':v==='midnight'?'Azul/roxo noturno':v==='light'?'Claro e limpo':'Cinema LX'}</small></button>`).join('')}</div></section><section class="appearance-card span2"><span class="appearance-icon">✦</span><h3>Cor de destaque</h3><p>A marca continua LX Plus; você muda somente a cor dos detalhes.</p><div class="lx-color-choice">${accents.map(([n,c])=>`<button class="${accent.toLowerCase()===c.toLowerCase()?'active':''}" style="--sw:${c}" onclick="LX.setAccent('${c}');LX.openTheme()"><i></i><span>${n}</span></button>`).join('')}</div></section><section class="appearance-card"><span class="appearance-icon">Aa</span><h3>Fonte</h3><p>Muda a leitura geral sem alterar a logo LX.</p><div class="layout-choice"><button class="${prefs.font==='modern'?'active':''}" onclick="LX.setUiPref('font','modern')"><b>Moderna</b><small>Limpa e tecnológica</small></button><button class="${prefs.font==='clean'?'active':''}" onclick="LX.setUiPref('font','clean')"><b>Clean</b><small>Direta e leve</small></button><button class="${prefs.font==='elegant'?'active':''}" onclick="LX.setUiPref('font','elegant')"><b>Elegante</b><small>Mais refinada</small></button></div></section><section class="appearance-card"><span class="appearance-icon">↔</span><h3>Espaçamento</h3><p>Controle o quanto de conteúdo cabe na tela.</p><div class="segmented"><button class="${prefs.density==='compact'?'active':''}" onclick="LX.setUiPref('density','compact')">Compacto</button><button class="${prefs.density==='balanced'?'active':''}" onclick="LX.setUiPref('density','balanced')">Equilibrado</button><button class="${prefs.density==='relaxed'?'active':''}" onclick="LX.setUiPref('density','relaxed')">Amplo</button></div></section><section class="appearance-card"><span class="appearance-icon">▥</span><h3>Tamanho dos pôsteres</h3><p>Pequeno é o padrão inicial para mostrar mais títulos por linha.</p><div class="segmented"><button class="${prefs.posterSize==='small'?'active':''}" onclick="LX.setUiPref('posterSize','small')">Pequeno</button><button class="${prefs.posterSize==='medium'?'active':''}" onclick="LX.setUiPref('posterSize','medium')">Médio</button><button class="${prefs.posterSize==='large'?'active':''}" onclick="LX.setUiPref('posterSize','large')">Grande</button></div></section><section class="appearance-card"><span class="appearance-icon">▦</span><h3>Layout</h3><p>Organização principal do conteúdo.</p><div class="layout-choice"><button class="${layout==='cinema'?'active':''}" onclick="LX.setLayout('cinema')"><b>Cinema</b><small>Visual amplo</small></button><button class="${layout==='app'?'active':''}" onclick="LX.setLayout('app')"><b>App</b><small>Navegação compacta</small></button><button class="${layout==='compact'?'active':''}" onclick="LX.setLayout('compact')"><b>Compacto</b><small>Mais por tela</small></button></div></section><section class="appearance-card"><span class="appearance-icon">≈</span><h3>Movimento</h3><p>Escolha a intensidade das animações.</p><div class="segmented"><button class="${motion==='full'?'active':''}" onclick="LX.setMotion('full')">Completo</button><button class="${motion==='reduced'?'active':''}" onclick="LX.setMotion('reduced')">Reduzido</button></div></section></div></div>`;$('overlay').classList.remove('hidden')}
function applyBranding(){const b=D.branding?.()||{},s=$('splash');if(s){const eyebrow=s.querySelector('.eyebrow'),tag=s.querySelector('.splash-mini-tag'),title=s.querySelector('.splash-core h1'),sub=s.querySelector('.splash-core p');if(eyebrow)eyebrow.textContent=b.splashEyebrow||'DIGITAL MEDIA EXPERIENCE';if(tag)tag.textContent=b.splashTag||'DM VERSION';if(title)title.textContent=b.splashTitle||'Seu entretenimento. Do seu jeito.';if(sub)sub.textContent=b.splashSubtitle||'Filmes, séries, animes, doramas, livros e música conectados por uma única experiência.'}const footer=$('legalFooter');if(footer){const map=[['legalTermsBtn',b.legalTerms],['legalPrivacyBtn',b.legalPrivacy],['legalAboutBtn',b.legalAbout],['legalSupportBtn',b.supportEmail]];map.forEach(([id,v])=>$(id)?.classList.toggle('hidden',!String(v||'').trim()));footer.classList.toggle('hidden',!map.some(([,v])=>String(v||'').trim()));const sup=$('legalSupportBtn');if(sup&&b.supportEmail)sup.href='mailto:'+b.supportEmail}if(!S.read(S.keys.accent,null)&&b.accent)document.documentElement.style.setProperty('--accent',b.accent);if(typeof applyTheme==='function')applyTheme()}
function refreshProfileAvatar(){const email=state.user?.email||'',name=state.profile?.name||state.user?.name||'LX';const b=$('profileBtn');if(b&&!state.profile?.kids)b.innerHTML=LX.avatarHTML(name,email,'avatar-inline');U.renderWelcome?.()}
function setProfilePreset(preset){const email=state.user?.email;if(!email)return;const all=S.read(S.keys.profileStyles,{}),cur=all[email]||{};all[email]={...cur,preset,image:null};S.write(S.keys.profileStyles,all);refreshProfileAvatar();LX.social?.syncMyProfile?.({avatar_url:null});openProfile()}
function setGalleryAvatar(index){const email=state.user?.email,item=LX.PROFILE_GALLERY?.[index];if(!email||!item)return;const all=S.read(S.keys.profileStyles,{}),cur=all[email]||{};all[email]={...cur,image:item.url};S.write(S.keys.profileStyles,all);refreshProfileAvatar();LX.social?.syncMyProfile?.({avatar_url:item.url});openProfile()}
async function setProfileImage(file){const email=state.user?.email;if(!email||!file)return;try{let url='';if(LX.cloud?.enabled?.()){const k=await LX.cloud.uploadFile(`profile_${Date.now()}_${file.name||'avatar'}`,file,'profiles');url=LX.cloud.publicUrl(String(k).replace(/^cloud:/,''),LX.config.supabase?.assetBucket||'lx-assets')}else url=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});const all=S.read(S.keys.profileStyles,{}),cur=all[email]||{};all[email]={...cur,image:url};S.write(S.keys.profileStyles,all);refreshProfileAvatar();await LX.social?.syncMyProfile?.({avatar_url:url});openProfile();LX.toast('Foto do perfil atualizada.')}catch(e){console.warn(e);LX.toast('Não foi possível atualizar a foto agora.')}}
function clearProfileImage(){const email=state.user?.email;if(!email)return;const all=S.read(S.keys.profileStyles,{}),cur=all[email]||{};all[email]={...cur,image:null,preset:cur.preset||'lx'};S.write(S.keys.profileStyles,all);refreshProfileAvatar();LX.social?.syncMyProfile?.({avatar_url:null});openProfile()}
function saveProfileDetails(){const email=state.user?.email;if(!email)return;const name=$('profileNameEdit')?.value?.trim().slice(0,40),bio=$('profileBioEdit')?.value?.trim().slice(0,120)||'',users=D.users(),u=users.find(x=>x.email===email||String(x.id)===String(state.user?.id));if(name&&u){u.name=name;state.user.name=name;if(state.profile&&!state.profile.kids)state.profile.name=name;D.saveUsers(users)}const all=S.read(S.keys.profileStyles,{}),cur=all[email]||{};all[email]={...cur,bio};S.write(S.keys.profileStyles,all);refreshProfileAvatar();LX.social?.syncMyProfile?.({name,bio});openProfile();LX.toast('Perfil atualizado e sincronizado.')}
function setProfileShape(shape){const email=state.user?.email;if(!email)return;const all=S.read(S.keys.profileStyles,{}),cur=all[email]||{};all[email]={...cur,shape};S.write(S.keys.profileStyles,all);refreshProfileAvatar();openProfile()}
function setProfileFrame(frame){const email=state.user?.email;if(!email)return;const sub=D.subscriptions()[email];if(frame!=='none'&&!sub?.active)return LX.toast('Essa moldura é exclusiva do Premium.');const all=S.read(S.keys.profileStyles,{}),cur=all[email]||{};all[email]={...cur,frame};S.write(S.keys.profileStyles,all);refreshProfileAvatar();openProfile()}
function minimizePlayer(){const v=activeVideoEl;if(!v)return;try{if(v.requestPictureInPicture){v.requestPictureInPicture().catch(()=>{})}else LX.toast('Mini player não disponível neste navegador.')}catch{}}
function restoreMiniPlayer(){const v=activeVideoEl;if(v&&document.pictureInPictureElement)document.exitPictureInPicture?.().catch(()=>{})}
function stopMiniPlayer(closeOverlay=true){const v=activeVideoEl;if(v){try{if(v.duration)saveProgress(activePlayerMeta?.id,v.currentTime/v.duration*100,v.currentTime,v.duration,activePlayerMeta?.context||'main',activePlayerMeta?.ep||null);v.pause();v.removeAttribute('src');v.load?.()}catch{}}try{activePlayerCleanup?.()}catch{}activePlayerCleanup=null;activeVideoEl=null;activePlayerMeta=null;document.getElementById('lxGlobalCinema')?.remove();$('miniPlayer')?.classList.add('hidden');document.documentElement.classList.remove('lx-player-open');document.body.classList.remove('lx-player-open');if(window.__lxPlayerKeyHandler){document.removeEventListener('keydown',window.__lxPlayerKeyHandler);window.__lxPlayerKeyHandler=null}if(closeOverlay)$('playerOverlay')?.classList.add('hidden');const m=$('playerModal');if(m)m.innerHTML='';saveView()}
$('legalAboutBtn')?.addEventListener('click',()=>openLegal('about'));$('legalTermsBtn')?.addEventListener('click',()=>openLegal('terms'));$('legalPrivacyBtn')?.addEventListener('click',()=>openLegal('privacy'));
$('miniRestore').onclick=restoreMiniPlayer;$('miniClose').onclick=()=>stopMiniPlayer(true);$('miniPlay').onclick=()=>{const v=activeVideoEl;if(v)v.paused?v.play():v.pause()};
$('overlay').onclick=e=>{if(e.target===$('overlay'))U.close()};$('playerOverlay').onclick=e=>{if(e.target===$('playerOverlay'))U.closePlayer()};$('readerOverlay').onclick=e=>{if(e.target===$('readerOverlay'))U.closeReader()};document.addEventListener('keydown',e=>{if(e.key==='Escape'){U.close();U.closePlayer();U.closeReader()}});
LX.musicHealthCheck=()=>{const a=$('musicAudio'),t=currentMusic();return {build:'32.2',mode:state.mode,screen:state.screen,track:t?.title||null,sourceRef:a?.dataset?.sourceRef||t?.mediaKey||null,src:a?.currentSrc||a?.src||null,paused:a?.paused??true,readyState:a?.readyState??0,networkState:a?.networkState??0,error:a?.error?{code:a.error.code,message:a.error.message||''}:null,status:$('musicPlaybackKind')?.textContent||'',cloud:!!String(a?.dataset?.sourceRef||t?.mediaKey||'').startsWith('cloud:')}};
LX.primeMusicMedia=primeMusicMedia;LX.prewarmMusicCatalog=prewarmMusicCatalog;LX.syncMusicCardState=syncMusicCardState;LX.musicToggleSaved=musicToggleSaved;LX.musicToggleSavedCurrent=musicToggleSavedCurrent;LX.openMusicLyrics=openMusicLyrics;LX.loadMusicTrack=loadTrack;LX.currentMusic=currentMusic;LX.refreshMusicUI=updateMusicUI;
LX.toggleCurrentMusic=toggleCurrentMusic;LX.prewarmMusicCatalog=prewarmMusicCatalog;LX.prewarmMusicContent=prewarmMusicContent;LX.playOnlineMusicPreview=()=>LX.toast('Prévia desativada. A LX Music reproduz somente faixas completas do próprio catálogo.');LX.primary=primary;LX.detail=detail;LX.openMusicAlbum=openMusicAlbum;LX.openMusicQueue=openMusicQueue;LX.musicQueuePlay=i=>{state.musicIndex=+i||0;loadTrack(true);U.close()};LX.musicShuffleAlbum=id=>{musicShuffleMode=true;music(id,0,true)};LX.toggleList=toggleList;LX.rate=rate;LX.play=play;LX.selectSeason=(id,season)=>{const x=D.catalog().find(z=>z.id===id);if(!x)return;const el=$('detailTab');if(el)el.innerHTML=episodesTab(x,+season||1)};LX.read=read;LX.music=music;LX.openRequests=openRequests;LX.openRanking=openRanking;LX.openProfile=openProfile;LX.openNotifications=openNotifications;LX.openPremium=openPremium;LX.choosePlan=choosePlan;LX.toggleGenre=toggleGenre;LX.openTheme=openTheme;LX.scroll=U.scroll;LX.openAdmin=()=>{if(!state.user?.admin||!LX.admin)return LX.toast('Acesso ADM indisponível.');LX.admin.render(U.state.adminPage||'dashboard');U.show('admin');saveView()};LX.openLegal=openLegal;LX.applyBranding=applyBranding;LX.saveProfileDetails=saveProfileDetails;LX.setProfileShape=setProfileShape;LX.setProfileFrame=setProfileFrame;LX.minimizePlayer=minimizePlayer;LX.restoreMiniPlayer=restoreMiniPlayer;LX.stopMiniPlayer=stopMiniPlayer;LX.saveView=saveView;LX.restoreView=restoreView;LX.rankPeriod=x=>{state.rankingPeriod=x;openRanking()};LX.rankKind=x=>{state.rankingKind=x;openRanking()};LX.readAll=()=>{const n=D.notices().map(x=>({...x,read:true})),ids=n.map(x=>x.id);S.writeLocal(S.keys.notices,n);S.write(S.keys.noticeReads,ids);U.updateNoticeCount();LX.toast('Tudo marcado como lido e sincronizado.')};LX.setTheme=t=>{S.write(S.keys.theme,t);applyTheme()};LX.setAccent=c=>{S.write(S.keys.accent,c);applyTheme()};LX.setLayout=setLayout;LX.setMotion=setMotion;LX.setUiPref=setUiPref;LX.applyTheme=applyTheme;LX.installApp=installApp;LX.setProfilePreset=setProfilePreset;LX.setGalleryAvatar=setGalleryAvatar;LX.clearProfileImage=clearProfileImage;LX.tvMode=tvMode;
setInterval(()=>{if(state.screen==='app'){U.updateNoticeCount?.();if(state.mode==='Ouvir'){syncMusicCardState();updateMusicUI()}}},60000);
let __lxWasOffline=!navigator.onLine;window.addEventListener('offline',()=>{__lxWasOffline=true;LX.toast('Sem internet. A LX Plus mantém o que já estiver carregado.')});window.addEventListener('online',()=>{if(__lxWasOffline){__lxWasOffline=false;LX.toast('Conexão restaurada. Sincronização retomada.')}});

try{const u=new URL(location.href);if(u.searchParams.has('lxbuild')||u.searchParams.has('_')){u.searchParams.delete('lxbuild');u.searchParams.delete('_');history.replaceState(null,'',u.pathname+(u.search?u.search:'')+u.hash)}}catch(e){}
})();

window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['app']='30.0';

/* =====================================================================
   LX Plus v25.50 — Drive Quality + Next Episode
   Non-destructive enhancement layer over the stable v25.37 core.
   ===================================================================== */
(()=>{
  const LX=window.LX=window.LX||{}, U=LX.ui, D=LX.data, S=LX.store;
  if(!U||!D||!S||window.__LX_V2538)return;
  window.__LX_V2538=true;
  const $=id=>document.getElementById(id), esc=s=>U.esc?U.esc(s):String(s??'');
  const V={version:'25.50',errors:[],searchSeq:0,decorateQueued:false};
  LX.v2538=V;

  // Keep a short, local diagnostic trail for the ADM health card. Never ships logs anywhere.
  try{
    const originalError=console.error.bind(console);
    console.error=(...args)=>{try{V.errors.push({at:Date.now(),text:args.map(x=>String(x?.message||x)).join(' ').slice(0,240)});if(V.errors.length>12)V.errors.shift()}catch{}return originalError(...args)};
    window.addEventListener('error',e=>{try{V.errors.push({at:Date.now(),text:String(e.message||'Erro de interface').slice(0,240)});if(V.errors.length>12)V.errors.shift()}catch{}});
    window.addEventListener('unhandledrejection',e=>{try{V.errors.push({at:Date.now(),text:String(e.reason?.message||e.reason||'Promise rejeitada').slice(0,240)});if(V.errors.length>12)V.errors.shift()}catch{}});
  }catch{}

  function styleForMe(){
    const email=U.state?.user?.email||'';
    const all=S.read(S.keys.profileStyles,{})||{};
    return {all,email,style:all[email]||{preset:'lx'}};
  }
  function saveStyle(patch={}){
    const {all,email,style}=styleForMe(); if(!email)return null;
    all[email]={...style,...patch}; S.write(S.keys.profileStyles,all); return all[email];
  }
  function currentUser(){
    const email=U.state?.user?.email||'';
    return D.users().find(x=>x.email===email)||U.state?.user||{};
  }
  function lastActivity(){
    const hist=D.history()||{}, list=Object.entries(hist).filter(([,h])=>h?.opened).sort((a,b)=>(b[1].opened||0)-(a[1].opened||0));
    const id=list[0]?.[0], item=D.catalog().find(x=>String(x.id)===String(id));
    if(!item)return '';
    const verb=item.type==='Livro'?'Lendo':item.type==='Música'?'Ouvindo':'Assistindo';
    return `${verb}: ${item.title}`.slice(0,120);
  }
  function achievements(){
    const u=currentUser(), hist=D.history()||{}, done=Object.values(hist).filter(h=>(h?.progress||0)>=95).length, list=D.myList().length;
    const out=[];
    if(Object.keys(hist).length>=1)out.push(['Primeiro play','Começou sua jornada LX']);
    if(done>=3)out.push(['Maratonista',`${done} conteúdos concluídos`]);
    // O fogo da v27 é por conversa; não cria conquista global de presença.
    if(list>=5)out.push(['Colecionador',`${list} itens na sua lista`]);
    if((u.read||0)>=3)out.push(['Leitor LX',`${u.read} leituras`]);
    if((u.listened||0)>=5)out.push(['No repeat',`${Math.round(u.listened||0)}h de música`]);
    return out.slice(0,6);
  }

  function contextualWelcome(){
    const style=styleForMe().style, box=document.querySelector('.welcome-v24'); if(!box)return;
    const name=U.state?.profile?.name||U.state?.user?.name||'você';
    const p=box.querySelector('.welcome-user p');
    const h=D.history(), pending=Object.values(h).filter(x=>x?.progress>0&&x?.progress<98).length;
    const hour=new Date().getHours();
    if(p){
      const copy=U.state.mode==='Ler'?(pending?`Você tem ${pending} leitura${pending===1?'':'s'} para continuar.`:'Que tal abrir uma nova história hoje?'):
        U.state.mode==='Ouvir'?(pending?'Sua trilha está pronta para continuar.':'Descubra uma faixa nova para o seu momento.'):
        pending?`${pending} história${pending===1?'':'s'} esperando por você.`:(hour<12?'Comece o dia com algo que combina com você.':hour<18?'Tem coisa nova para descobrir nesta tarde.':'Sua noite pode começar por aqui.');
      if(p.textContent!==copy)p.textContent=copy;
    }
    const text=String(style.status||'').trim();
    const host=box.querySelector('.welcome-user>div:last-child');
    let line=box.querySelector('.lx-user-status-line');
    if(text){if(!line){line=document.createElement('div');line.className='lx-user-status-line';host?.appendChild(line)}if(line.textContent!==text)line.textContent=text}
    else line?.remove();
    box.setAttribute('aria-label',`Olá, ${name}`);
  }

  function publishedAt(x){return +(new Date(x.publishedAt||x.createdAt||0))||0}
  function seenMap(){try{return JSON.parse(localStorage.getItem('lx2538_seen_categories')||'{}')}catch{return {}}}
  function markCategorySeen(cat){const m=seenMap();m[cat]=Date.now();try{localStorage.setItem('lx2538_seen_categories',JSON.stringify(m))}catch{}}
  function categoryHasNew(cat){
    const seen=seenMap()[cat]||0, map={'Filmes':'Filme','Séries':'Série','Animes':'Anime','Doramas':'Dorama','Livros':'Livro','Música':'Música'};
    const type=map[cat]; if(!type)return cat==='Para você'&&D.catalog().some(x=>x.newRelease&&publishedAt(x)>seen);
    return D.catalog().some(x=>x.type===type&&(x.newRelease||publishedAt(x)>Date.now()-7*864e5)&&publishedAt(x)>seen);
  }
  function ensureForYouButton(){
    const nav=$('categoryNav');if(!nav)return;
    if(U.state.mode==='Ouvir'){nav.querySelector('[data-cat="Para você"]')?.remove();return}
    if(!nav.querySelector('[data-cat="Para você"]')){
      const b=document.createElement('button'); b.dataset.cat='Para você'; b.textContent='Para você';
      const first=nav.querySelector('button'); if(first?.nextSibling)nav.insertBefore(b,first.nextSibling); else nav.appendChild(b);
      b.onclick=()=>{U.state.category='Para você';U.state.query='';const q=$('searchInput');if(q)q.value='';markCategorySeen('Para você');window.scrollTo(0,0);U.renderApp()};
    }
    nav.querySelectorAll('[data-cat]').forEach(b=>{
      const cat=b.dataset.cat; b.classList.toggle('active',cat===U.state.category);
      let dot=b.querySelector('.lx-new-dot'); const show=categoryHasNew(cat);
      if(show&&!dot){dot=document.createElement('i');dot.className='lx-new-dot';b.appendChild(dot)}else if(!show)dot?.remove();
    });
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-cat]');if(b?.dataset.cat)markCategorySeen(b.dataset.cat)},true);

  function scoredGlobal(){
    const all=D.catalog().filter(x=>x.published!==false), email=U.state?.user?.email||'', pref=D.preferences()[email]||{}, hist=D.history();
    return D.recommendation(all,hist,D.ratings(),pref);
  }
  function smartTiles(){
    const all=scoredGlobal(), hist=D.history();
    const recent=Object.entries(hist).filter(([,h])=>h?.opened).sort((a,b)=>(b[1].opened||0)-(a[1].opened||0)).map(([id])=>D.catalog().find(x=>String(x.id)===String(id))).filter(Boolean);
    const typeCount=recent.reduce((o,x)=>(o[x.type]=(o[x.type]||0)+1,o),{}), dominant=Object.entries(typeCount).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const ordered=[...all].sort((a,b)=>(a.type===dominant?-1:0)-(b.type===dominant?-1:0));
    return ordered.filter((x,i,a)=>a.findIndex(z=>z.id===x.id)===i).slice(0,4);
  }
  function smartHome(){
    const hc=$('homeContent');if(!hc||U.state.category!=='Início'||U.state.query)return;
    if(hc.querySelector('.lx-smart-home'))return;
    const tiles=smartTiles();if(!tiles.length)return;
    const sec=document.createElement('section');sec.className='lx-smart-home';
    sec.innerHTML=`<div class="lx-smart-head"><div><span class="eyebrow">SEU MOMENTO</span><h2>Escolhido para você agora</h2><p>A ordem muda com seu histórico, notas e gêneros favoritos.</p></div><button class="glass-btn" type="button">Abrir Para você</button></div><div class="lx-smart-grid">${tiles.map(x=>`<button class="lx-smart-tile" type="button" data-lx-smart="${esc(x.id)}"><span class="lx-smart-tile-bg" style="background-image:url('${String(x.banner||x.cover||'').replace(/'/g,'%27')}')"></span><span class="lx-smart-tile-copy"><small>${esc(x.type)} · ${esc(x.genre||'LX')}</small><strong>${esc(x.title)}</strong></span></button>`).join('')}</div>`;
    hc.prepend(sec); sec.querySelector('.glass-btn').onclick=()=>{U.state.category='Para você';window.scrollTo(0,0);U.renderApp()}; sec.querySelectorAll('[data-lx-smart]').forEach(b=>b.onclick=()=>LX.detail?.(+b.dataset.lxSmart));
  }
  function renderForYou(){
    const hc=$('homeContent'),hero=$('hero'),welcome=$('welcome'); if(!hc)return;
    if(U.state.mode==='Ouvir'){document.body.classList.remove('lx-for-you-active');delete hc.dataset.lxForYouRendered;return}
    const active=U.state.category==='Para você'; hero?.classList.toggle('hidden',active); welcome?.classList.toggle('hidden',active); document.body.classList.toggle('lx-for-you-active',active);
    if(!active){delete hc.dataset.lxForYouRendered;return}
    if(hc.dataset.lxForYouRendered==='1')return;
    hc.dataset.lxForYouRendered='1';
    const all=scoredGlobal(); const types=['Filme','Série','Anime','Dorama','Música','Livro'];
    const groupName={Filme:'Filmes',Série:'Séries',Anime:'Animes',Dorama:'Doramas',Música:'Músicas',Livro:'Livros'};
    const groups=types.map(t=>[t,all.filter(x=>x.type===t).slice(0,10)]).filter(([,a])=>a.length);
    hc.innerHTML=`<div class="lx-for-you-page"><section class="lx-for-you-hero"><span class="eyebrow">LX PLUS</span><h1>Para você</h1><p>Uma página que se reorganiza pelo que você assiste, ouve, lê, avalia e salva. Quanto mais você usa a LX Plus, melhor ela fica.</p></section><div class="lx-for-you-groups">${groups.map(([t,a])=>`<section class="lx-for-you-group"><h2>${groupName[t]}</h2><div class="lx-for-you-grid">${a.map(x=>`<button class="lx-for-you-card" data-lx-foryou="${esc(x.id)}"><span class="lx-for-you-art" style="background-image:url('${String(x.cover||LX.cinematicArt?.(x)||x.banner||'').replace(/'/g,'%27')}')"><i class="lx-poster-chip">${esc(x.rating||x.type||'LX')}</i>${x.trending?'<i class="lx-poster-chip lx-poster-chip-right">EM ALTA</i>':''}<i class="lx-card-mark" aria-hidden="true">LX<b>+</b></i><b class="lx-poster-play">▶</b></span><strong>${esc(x.title)}</strong><small>${esc(x.genre||'LX')} · ${esc(x.year||'')}</small></button>`).join('')}</div></section>`).join('')}</div></div>`;
    hc.querySelectorAll('[data-lx-foryou]').forEach(b=>b.onclick=()=>LX.detail?.(+b.dataset.lxForyou));
  }

  function ensureUniversalShell(){
    let el=$('lxUniversalSearch'); if(el)return el;
    el=document.createElement('aside');el.id='lxUniversalSearch';el.className='lx-universal-search hidden';el.innerHTML='<div class="lx-universal-head"><span>BUSCA UNIVERSAL LX</span><kbd>ESC</kbd></div><div id="lxUniversalBody" class="lx-universal-body"></div>';document.body.appendChild(el);return el;
  }
  function closeUniversal(){ensureUniversalShell().classList.add('hidden')}
  function collapseSearch(){const w=$('searchWrap'),i=$('searchInput');w?.classList.remove('open');i?.blur()}
  async function universalSearch(q){
    q=String(q||'').trim(); const shell=ensureUniversalShell(),body=$('lxUniversalBody');
    if(!q){closeUniversal();U.state.query='';U.state.mode==='Ouvir'?U.renderApp?.():U.renderHome?.();return}
    shell.classList.remove('hidden'); const seq=++V.searchSeq;
    body.innerHTML='<div class="lx-search-skeleton"><i class="lx-skeleton"></i><i class="lx-skeleton"></i><i class="lx-skeleton"></i></div>';
    const content=D.search(D.catalog().filter(x=>x.published!==false),q).slice(0,8);
    let people=[];try{people=(await LX.social?.refreshDirectory?.()||[]).filter(p=>String(p.name||'').toLowerCase().includes(q.toLowerCase())||String(p.bio||'').toLowerCase().includes(q.toLowerCase())).slice(0,5)}catch{}
    if(seq!==V.searchSeq)return;
    const cHtml=content.length?`<section class="lx-universal-section"><small>Conteúdo</small>${content.map(x=>`<button class="lx-universal-result" data-lx-content="${esc(x.id)}"><span class="lx-universal-thumb" style="background-image:url('${String(x.cover||x.banner||'').replace(/'/g,'%27')}')"></span><span><strong>${esc(x.title)}</strong><small>${esc(x.type)} · ${esc(x.genre||'LX')}</small></span><em>Abrir</em></button>`).join('')}</section>`:'';
    const pHtml=people.length?`<section class="lx-universal-section"><small>Pessoas</small>${people.map(p=>`<button class="lx-universal-result" data-lx-person="${esc(p.user_id)}"><span class="lx-universal-thumb">${esc(String(p.name||'LX').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span><span><strong>${esc(p.name||'Usuário')}</strong><small>${esc(p.status_text||p.bio||'Perfil LX')}</small></span><em>${LX.social?.isOnline?.(p.user_id)?'Online':'Perfil'}</em></button>`).join('')}</section>`:'';
    body.innerHTML=cHtml+pHtml||'<div class="lx-universal-empty">Nada encontrado. Tente outro nome, artista, gênero, autor ou pessoa.</div>';
    body.querySelectorAll('[data-lx-content]').forEach(b=>b.onclick=()=>{closeUniversal();collapseSearch();LX.detail?.(+b.dataset.lxContent)});
    body.querySelectorAll('[data-lx-person]').forEach(b=>b.onclick=()=>{closeUniversal();collapseSearch();LX.social?.openProfile?.(b.dataset.lxPerson)});
  }
  function bindSearch(){
    const input=$('searchInput'),btn=$('searchBtn');if(!input||input.dataset.lx38)return;input.dataset.lx38='1';
    input.placeholder='Buscar filmes, músicas, livros ou pessoas...';
    input.oninput=e=>{const q=e.target.value;U.state.query='';universalSearch(q);if(q.trim())D.track('search',{query:q.trim(),scope:'universal'})};
    input.onkeydown=e=>{if(e.key==='Enter'&&input.value.trim()){closeUniversal();collapseSearch();U.state.query=input.value.trim();U.state.category='Início';if(U.state.mode==='Ouvir')U.state.musicView='explore';U.state.mode==='Ouvir'?U.renderApp?.():U.renderHome?.()}if(e.key==='Escape'){input.value='';closeUniversal();collapseSearch();U.state.query='';U.state.mode==='Ouvir'?U.renderApp?.():U.renderHome?.()}};
    if(btn)btn.onclick=()=>{$('searchWrap')?.classList.add('open');input.focus();if(input.value.trim())universalSearch(input.value)};
  }

  function profileMenu(){
    let m=$('lxProfileMenu');if(m)return m;
    m=document.createElement('aside');m.id='lxProfileMenu';m.className='lx-profile-menu hidden';document.body.appendChild(m);return m;
  }
  function closeProfileMenu(){profileMenu().classList.add('hidden')}
  function openProfileMenu(){
    const m=profileMenu(), email=U.state?.user?.email||'', name=U.state?.profile?.name||U.state?.user?.name||'Usuário',sub=D.subscriptions()[email],style=styleForMe().style;
    m.innerHTML=`<div class="lx-profile-menu-user ${sub?.active?'is-premium':''}">${LX.avatarHTML?.(name,email,'avatar-inline')||''}<div><strong>${esc(name)}</strong><small>${esc(style.status||email||'Conta LX Plus')}</small></div></div><div class="lx-profile-menu-actions"><button data-act="profile"><span>●</span>Meu perfil</button><button data-act="privacy"><span>◈</span>Privacidade</button><button data-act="notifications"><span>◌</span>Notificações</button><button data-act="appearance"><span>✦</span>Aparência</button><button data-act="community"><span>◎</span>Comunidade</button><button data-act="premium"><span>♛</span>Premium</button><button data-act="install"><span>⇩</span>Baixar app</button>${U.state?.user?.admin?'<button data-act="admin"><span>⚙</span>Painel ADM</button>':''}<button data-act="logout" class="danger"><span>↪</span>Sair</button></div>`;
    m.classList.remove('hidden');
    m.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const a=b.dataset.act;closeProfileMenu();if(a==='profile')LX.openProfile?.();else if(a==='privacy')openPrivacyCenter();else if(a==='notifications')openNotifications38();else if(a==='appearance')LX.openTheme?.();else if(a==='community')LX.social?.open?.('friends');else if(a==='premium')LX.openPremium?.();else if(a==='install')window.LXPWA?.install?.();else if(a==='admin')LX.openAdmin?.();else if(a==='logout')$('profileLogout')?.click()});
  }
  function bindProfileMenu(){const p=$('profileBtn');if(!p||p.dataset.lx38)return;p.dataset.lx38='1';p.onclick=e=>{e.stopPropagation();const m=profileMenu();m.classList.contains('hidden')?openProfileMenu():closeProfileMenu()}}
  document.addEventListener('click',e=>{if(!e.target.closest?.('#lxProfileMenu')&&!e.target.closest?.('#profileBtn'))closeProfileMenu()});

  function profileStatusHTML(){
    const {style}=styleForMe(), u=currentUser(), ach=achievements(), banner=style.banner||'', activity=lastActivity();
    return `<section class="lx-profile-hero" ${banner?`style="background-image:url('${String(banner).replace(/'/g,'%27')}')"`:''}><div class="lx-profile-hero-copy"><span>IDENTIDADE LX</span><h3>${esc(style.status||'Seu perfil, do seu jeito.')}</h3><p>${style.showActivity!==false&&activity?esc(activity):'Personalize sua presença sem perder a identidade LX Plus.'}</p></div></section><section class="profile-personalization lx-profile-extra"><div class="profile-section-head"><div><h3>Status, capa e presença</h3><p>Seu status aparece na Home e pode aparecer para seus contatos.</p></div><span class="v19-pill">ADAPTIVE</span></div><div class="lx-profile-extra-grid"><label class="field span2">Status personalizado<input id="lxProfileStatus" maxlength="80" value="${esc(style.status||'')}" placeholder="Ex.: Maratonando uma série 🍿"></label><label class="field span2">Capa do perfil<label class="glass-btn avatar-upload-btn" style="margin-top:6px">Enviar imagem<input id="lxProfileBannerFile" type="file" accept="image/*"></label></label></div><div class="lx-profile-switches"><label><span><b>Mostrar atividade recente</b><small>Exibe o que você esteve assistindo, lendo ou ouvindo.</small></span><input id="lxShowActivity" type="checkbox" ${style.showActivity!==false?'checked':''}></label><label><span><b>Favoritos públicos</b><small>Permite mostrar sua lista salva para contatos.</small></span><input id="lxPublicFavorites" type="checkbox" ${style.publicFavorites===true?'checked':''}></label></div><button class="primary-btn" id="lxSaveProfileExtras" style="margin-top:11px">Salvar identidade</button><h3 style="margin:18px 0 4px">Conquistas</h3><div class="lx-achievements">${ach.length?ach.map(([a,b])=>`<div class="lx-achievement"><b>${esc(a)}</b><small>${esc(b)}</small></div>`).join(''):'<div class="lx-achievement"><b>Começando agora</b><small>Suas conquistas vão aparecer aqui.</small></div>'}</div></section>`;
  }
  async function fileToData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
  async function uploadBanner(file){
    if(!file)return styleForMe().style.banner||'';
    try{if(LX.cloud?.enabled?.()){const k=await LX.cloud.uploadFile(`profile_banner_${Date.now()}_${file.name||'banner'}`,file,'profiles');return LX.cloud.publicUrl(String(k).replace(/^cloud:/,''),LX.config.supabase?.assetBucket||'lx-assets')}return await fileToData(file)}catch(e){console.warn(e);LX.toast?.('Não foi possível enviar a capa agora.');return styleForMe().style.banner||''}
  }
  async function syncProfileExtras(){
    const {style}=styleForMe(), db=LX.cloud?.db?.(), id=LX.cloud?.user?.()?.id||U.state?.user?.id; if(!db||!id)return false;
    const fav=style.publicFavorites===true?(D.myList()||[]):[], activity=style.showActivity!==false?lastActivity():'';
    const row={status_text:String(style.status||'').slice(0,80),banner_url:style.banner||null,activity_visible:style.showActivity!==false,favorites_visible:style.publicFavorites===true,favorite_ids:fav,last_activity:activity||null,updated_at:new Date().toISOString()};
    try{const {error}=await db.from('lx_profiles').update(row).eq('user_id',id);if(error)throw error;return true}catch(e){console.warn('LX profile extras sync',e);return false}
  }
  async function saveProfileExtras(){
    const input=$('lxProfileStatus'),show=$('lxShowActivity'),pub=$('lxPublicFavorites'),file=$('lxProfileBannerFile')?.files?.[0];
    const banner=await uploadBanner(file); saveStyle({status:input?.value?.trim().slice(0,80)||'',showActivity:!!show?.checked,publicFavorites:!!pub?.checked,banner});
    await syncProfileExtras(); contextualWelcome(); enhanceProfileModal(true);LX.toast?.('Identidade do perfil atualizada.');
  }
  function enhanceProfileModal(force=false){
    const page=document.querySelector('.profile-page-v25');if(!page)return; if(page.dataset.lx38&&!force)return; page.dataset.lx38='1';
    page.querySelectorAll('.v19-pill').forEach(p=>{if(p.textContent.trim()==='V25')p.textContent='CONTA'});
    page.querySelectorAll('.lx-profile-hero,.lx-profile-extra').forEach(x=>x.remove()); const head=page.querySelector('.panel-head'); head?.insertAdjacentHTML('afterend',profileStatusHTML());
    $('lxSaveProfileExtras')?.addEventListener('click',saveProfileExtras); $('lxProfileBannerFile')?.addEventListener('change',e=>{const n=e.target.files?.[0]?.name;if(n)LX.toast?.(`Capa selecionada: ${n}`)});
  }

  async function enhanceSocialProfile(){
    const profile=document.querySelector('.lx-community-profile'); if(!profile||profile.dataset.lx38)return; profile.dataset.lx38='1';
    try{
      const name=profile.querySelector('h2')?.textContent?.trim()||''; const rows=await LX.social?.refreshDirectory?.()||[]; const p=rows.find(x=>String(x.name||'').trim()===name)||null;if(!p)return;
      if(p.banner_url){const b=document.createElement('div');b.className='lx-social-profile-banner';b.style.backgroundImage=`url("${String(p.banner_url).replace(/"/g,'%22')}")`;profile.parentElement?.insertBefore(b,profile)}
      const parts=[];if(p.status_text)parts.push(`<strong>${esc(p.status_text)}</strong>`);if(p.activity_visible&&p.last_activity)parts.push(`<small>${esc(p.last_activity)}</small>`);if(p.favorites_visible&&Array.isArray(p.favorite_ids))parts.push(`<small>＋ ${p.favorite_ids.length} favorito${p.favorite_ids.length===1?'':'s'} público${p.favorite_ids.length===1?'':'s'}</small>`);
      if(parts.length){const x=document.createElement('div');x.className='lx-social-profile-extra';x.innerHTML=parts.join('');profile.insertAdjacentElement('afterend',x)}
    }catch{}
  }

  function classifyNotice(n){const s=`${n.title||''} ${n.text||n.message||''}`.toLowerCase();return /(filme|série|serie|anime|dorama|música|musica|livro|episódio|episodio|lançamento|lancamento|catálogo|catalogo)/.test(s)?'content':'system'}
  async function noticeItems(){
    const rows=(D.notices()||[]).map(n=>({cat:classifyNotice(n),icon:classifyNotice(n)==='content'?'▶':'✦',title:n.title||'Atualização',text:n.text||n.message||'',time:n.time||'Agora',tag:classifyNotice(n)==='content'?'Conteúdo':'Sistema'}));
    const personal=LX.chat?.notificationItems?.()||[];if(personal.length)rows.unshift(...personal);else{const unread=Number(LX.chat?.unreadTotal?.()||0);if(unread)rows.unshift({cat:'community',icon:'✉',title:`${unread} mensagem${unread===1?'':'s'} não lida${unread===1?'':'s'}`,text:'Abra a Comunidade para continuar suas conversas.',time:'Agora',tag:'Comunidade'})}
    try{const dir=await LX.social?.refreshDirectory?.()||[],req=dir.filter(x=>x.relation==='pending'&&x.direction==='incoming').length;if(req)rows.unshift({cat:'community',icon:'◎',title:`${req} solicitação${req===1?'':'ões'} de amizade`,text:'Há pessoas esperando sua resposta.',time:'Agora',tag:'Comunidade'})}catch{}
    return rows;
  }
  async function openNotifications38(tab='all'){
    const modal=$('modal');if(!modal)return; $('overlay')?.classList.remove('hidden');modal.innerHTML='<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><div class="panel-head"><div><span class="eyebrow">CENTRAL LX</span><h2>Notificações</h2><p>Mensagens, sistema e novidades em uma única caixa.</p></div><button class="glass-btn" id="lxReadAll38">Marcar avisos como lidos</button></div><div class="lx-notice-tabs" id="lxNoticeTabs"></div><div id="lxNoticeBody" class="lx-notice-list"><div class="lx-search-skeleton"><i class="lx-skeleton"></i><i class="lx-skeleton"></i></div></div></div>';
    const items=await noticeItems();
    const tabs=[['all','Tudo'],['community','Comunidade'],['content','Conteúdo'],['system','Sistema']];
    const draw=t=>{const filtered=t==='all'?items:items.filter(x=>x.cat===t);$('lxNoticeTabs').innerHTML=tabs.map(([k,n])=>`<button class="${k===t?'active':''}" data-lx-nt="${k}">${n}</button>`).join('');$('lxNoticeBody').innerHTML=filtered.length?filtered.map(x=>`<article class="lx-notice-item"><span class="lx-notice-icon">${x.icon}</span><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p><small>${esc(x.time)}</small></div><span class="lx-notice-badge">${esc(x.tag)}</span></article>`).join(''):'<div class="lx-universal-empty">Tudo limpo por aqui.</div>';$('lxNoticeTabs').querySelectorAll('[data-lx-nt]').forEach(b=>b.onclick=()=>draw(b.dataset.lxNt))};
    draw(tab);$('lxReadAll38').onclick=async()=>{LX.readAll?.();await LX.chat?.markNotificationsRead?.();const refreshed=await noticeItems();items.splice(0,items.length,...refreshed);draw(tab)};
  }
  V.openNotifications=openNotifications38;

  async function openPrivacyCenter(){
    const modal=$('modal');if(!modal)return;$('overlay')?.classList.remove('hidden');modal.innerHTML='<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><div class="panel-head"><div><span class="eyebrow">CONTROLE DE DADOS</span><h2>Privacidade</h2><p>Escolha como sua presença aparece para outras pessoas.</p></div></div><div id="lxPrivacyBody" class="lx-search-skeleton"><i class="lx-skeleton"></i><i class="lx-skeleton"></i><i class="lx-skeleton"></i></div></div>';
    let cloud={social_visible:true,calls_enabled:true};try{const db=LX.cloud?.db?.(),id=LX.cloud?.user?.()?.id||U.state?.user?.id;if(db&&id){const {data}=await db.from('lx_profiles').select('social_visible,calls_enabled,activity_visible,favorites_visible').eq('user_id',id).maybeSingle();if(data)cloud=data}}catch{}
    const st=styleForMe().style, online=LX.social?.presenceVisible?.()!==false;
    $('lxPrivacyBody').className='lx-privacy-grid';$('lxPrivacyBody').innerHTML=`<label class="lx-privacy-row"><span><b>Mostrar status online</b><small>Se desligar, seus amigos verão você como offline.</small></span><input id="lxPvOnline" type="checkbox" ${online?'checked':''}></label><label class="lx-privacy-row"><span><b>Aparecer na Comunidade</b><small>Permite que outras contas aprovadas encontrem seu perfil.</small></span><input id="lxPvSocial" type="checkbox" ${cloud.social_visible!==false?'checked':''}></label><label class="lx-privacy-row"><span><b>Receber chamadas</b><small>Somente contatos aceitos podem ligar.</small></span><input id="lxPvCalls" type="checkbox" ${cloud.calls_enabled!==false?'checked':''}></label><label class="lx-privacy-row"><span><b>Mostrar atividade recente</b><small>Exibe o último conteúdo aberto no seu perfil.</small></span><input id="lxPvActivity" type="checkbox" ${st.showActivity!==false?'checked':''}></label><label class="lx-privacy-row"><span><b>Favoritos públicos</b><small>Mostra quantos itens você salvou aos seus contatos.</small></span><input id="lxPvFavorites" type="checkbox" ${st.publicFavorites===true?'checked':''}></label><button id="lxPvSave" class="primary-btn">Salvar privacidade</button>`;
    $('lxPvSave').onclick=async()=>{const activity=!!$('lxPvActivity').checked,favorites=!!$('lxPvFavorites').checked;saveStyle({showActivity:activity,publicFavorites:favorites});try{await LX.social?.setPresenceVisible?.(!!$('lxPvOnline').checked);const db=LX.cloud?.db?.(),id=LX.cloud?.user?.()?.id||U.state?.user?.id;if(db&&id)await db.from('lx_profiles').update({social_visible:!!$('lxPvSocial').checked,calls_enabled:!!$('lxPvCalls').checked,activity_visible:activity,favorites_visible:favorites,updated_at:new Date().toISOString()}).eq('user_id',id)}catch(e){console.warn(e)}await syncProfileExtras();LX.toast?.('Privacidade atualizada.');U.close?.()};
  }
  V.openPrivacyCenter=openPrivacyCenter;

  function decorateAppearance(){
    const page=document.querySelector('.lx-appearance-v32');if(!page||page.dataset.lx38)return;page.dataset.lx38='1';
    page.querySelectorAll('.appearance-card').forEach(card=>{const h=card.querySelector('h3')?.textContent||'';if(h==='Espaçamento'){card.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Amplo')b.textContent='Confortável'})}});
    const desc=page.querySelector('.panel-head p');if(desc)desc.textContent='A cor escolhida agora acompanha seu nome, botões, indicadores, progresso e detalhes do app inteiro.';
  }

  function adminLiveStrip(){
    const main=$('adminMain');if(!main||U.state.adminPage!=='dashboard'||main.querySelector('.lx-admin-live-strip'))return;
    const dirPromise=LX.social?.refreshDirectory?.();Promise.resolve(dirPromise).catch(()=>[]).then(dir=>{
      if(!main||U.state.adminPage!=='dashboard'||main.querySelector('.lx-admin-live-strip'))return;
      const online=(dir||[]).filter(p=>LX.social?.isOnline?.(p.user_id)).length, unread=Number(LX.chat?.unreadTotal?.()||0), errors=V.errors.length;
      const el=document.createElement('section');el.className='lx-admin-live-strip';el.innerHTML=`<div><span>ONLINE AGORA</span><strong>${online}</strong><small>contatos visíveis nesta sessão</small></div><div><span>MENSAGENS NÃO LIDAS</span><strong>${unread}</strong><small>na conta atual</small></div><div><span>ERROS DA SESSÃO</span><strong>${errors}</strong><small>${errors?'verifique o console':'nenhum capturado'}</small></div><div><span>PLATAFORMA</span><strong>LX Plus</strong><small>operação online</small></div>`;main.querySelector('.launch-center')?.insertAdjacentElement('afterend',el);
    })
  }

  function decorateApp(){
    contextualWelcome();ensureForYouButton();renderForYou();bindSearch();bindProfileMenu();
  }
  function scheduleDecorate(){if(V.decorateQueued)return;V.decorateQueued=true;requestAnimationFrame(()=>{V.decorateQueued=false;decorateApp();enhanceProfileModal();decorateAppearance();enhanceSocialProfile();adminLiveStrip()})}
  const observer=new MutationObserver(scheduleDecorate);observer.observe(document.body,{childList:true,subtree:true});

  // Wrap public actions without disturbing stable internal closures.
  const originalProfile=LX.openProfile?.bind(LX); if(originalProfile)LX.openProfile=()=>{originalProfile();setTimeout(()=>enhanceProfileModal(true),0)};
  const originalTheme=LX.openTheme?.bind(LX); if(originalTheme)LX.openTheme=()=>{originalTheme();setTimeout(decorateAppearance,0)};
  const originalToggleList=LX.toggleList?.bind(LX); if(originalToggleList)LX.toggleList=id=>{const r=originalToggleList(id);setTimeout(syncProfileExtras,150);return r};
  const originalSocialProfile=LX.social?.openProfile?.bind(LX.social); if(originalSocialProfile)LX.social.openProfile=async id=>{const r=await originalSocialProfile(id);setTimeout(enhanceSocialProfile,0);return r};

  // Rebind static topbar buttons to the richer centers.
  const notify=$('notifyBtn');if(notify){notify.onclick=()=>openNotifications38();notify.title='Central de notificações'}
  const theme=$('themeBtn');if(theme)theme.onclick=()=>LX.openTheme?.();

  // Global search shortcuts. Music transport is handled by the v26 player controller.
  document.addEventListener('keydown',e=>{
    const tag=document.activeElement?.tagName?.toLowerCase(),typing=['input','textarea','select'].includes(tag)||document.activeElement?.isContentEditable;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('searchWrap')?.classList.add('open');$('searchInput')?.focus();return}
    if(!typing&&e.key==='/'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();$('searchWrap')?.classList.add('open');$('searchInput')?.focus();return}
    if(e.key==='Escape'){closeUniversal();closeProfileMenu();collapseSearch();return}
    return;
  });

  // Sync public profile extras when the account becomes available.
  let syncAttempts=0;const syncTimer=setInterval(()=>{if(U.state?.user){clearInterval(syncTimer);syncProfileExtras().catch(()=>{})}else if(++syncAttempts>40)clearInterval(syncTimer)},500);
  scheduleDecorate();
})();

/* v25.51 — mini canvas visualizer */
(function(){
  let raf=0;
  const byId=id=>document.getElementById(id);
  function visState(){
    try{
      const dock=byId('musicDock'),audio=byId('musicAudio'),play=byId('musicPlay');
      if(!dock||dock.classList.contains('hidden'))return {active:false,phase:0,boost:.18};
      const external=dock.classList.contains('external-provider');
      const active=external?String(play?.textContent||'').includes('❚'):!(audio?.paused??true);
      const pos=external?(performance.now()/1000):(audio?.currentTime||0);
      return {active,phase:pos,boost:active?1:.22};
    }catch(e){return {active:false,phase:0,boost:.18}}
  }
  function draw(){
    const c=byId('musicViz');
    if(!c){raf=requestAnimationFrame(draw);return}
    const x=c.getContext('2d');
    const w=c.width,h=c.height;
    const st=visState();
    x.clearRect(0,0,w,h);
    const bg=x.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'rgba(31,34,42,.95)');
    bg.addColorStop(1,'rgba(10,12,17,.98)');
    x.fillStyle=bg; x.fillRect(0,0,w,h);
    x.save();
    x.translate(0.5,0.5);
    const bars=11, gap=3, barW=3;
    const baseY=h-6;
    for(let i=0;i<bars;i++){
      const p=(st.phase*2.8)+(i*.63);
      const wave=(Math.sin(p)+Math.sin(p*.54+1.3)+Math.sin(p*1.8+.5))/3;
      const lift=st.active?(0.55+Math.abs(wave)*0.9):(0.14+((i%3)/12));
      const bh=Math.max(4, Math.min(h-10, (h-10)*lift*st.boost + 5));
      const bx=7+i*(barW+gap);
      const by=baseY-bh;
      const grad=x.createLinearGradient(0,by,0,baseY);
      grad.addColorStop(0, st.active?'rgba(120,86,255,1)':'rgba(102,124,149,.55)');
      grad.addColorStop(.55, st.active?'rgba(74,214,236,.92)':'rgba(97,120,138,.42)');
      grad.addColorStop(1, 'rgba(255,255,255,.16)');
      x.fillStyle=grad;
      x.shadowBlur=st.active?10:0;
      x.shadowColor=st.active?'rgba(108,190,255,.42)':'transparent';
      x.beginPath();
      x.roundRect(bx,by,barW,bh,2);
      x.fill();
    }
    x.restore();
    raf=requestAnimationFrame(draw);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{cancelAnimationFrame(raf);draw()},{once:true});
  else draw();
})();

/* ===== streak.js · LX Plus v27.0 compatibility stub ===== */
(()=>{
  return; // v27: o fogo agora pertence a cada conversa e é calculado no Supabase.
  const LX=window.LX=window.LX||{};
  const DAY=86400000;
  let count=0,longest=0,lastDate='',busy=false;
  const pad=n=>String(n).padStart(2,'0');
  const dayKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dayNumber=k=>{const [y,m,d]=String(k||'').split('-').map(Number);return y&&m&&d?Math.floor(Date.UTC(y,m-1,d)/DAY):null};
  const currentUser=()=>LX.cloud?.user?.()||LX.ui?.state?.user||LX.state?.user||null;
  function readMeta(){
    try{
      const S=LX.store,k=S?.keys?.uiPrefs;if(!S||!k)return {};
      const prefs=S.read(k,{})||{};return prefs.streakMeta||{};
    }catch{return {}}
  }
  function writeMeta(meta){
    try{
      const S=LX.store,k=S?.keys?.uiPrefs;if(!S||!k)return;
      const prefs=S.read(k,{})||{};S.write(k,{...prefs,streakMeta:meta});
    }catch(e){console.warn('LX streak local sync',e)}
  }
  function cloudProfileStreak(){
    try{
      const u=currentUser(),users=LX.data?.users?.()||[];
      const row=users.find(x=>String(x.id)===String(u?.id)||String(x.email||'').toLowerCase()===String(u?.email||'').toLowerCase());
      return Number(row?.streak||0);
    }catch{return 0}
  }
  function updateLocalUser(n){
    try{
      const S=LX.store,k=S?.keys?.users,u=currentUser();if(!S||!k||!u)return;
      const rows=S.read(k,[])||[];let changed=false;
      const next=rows.map(x=>{
        const same=String(x.id)===String(u.id)||String(x.email||'').toLowerCase()===String(u.email||'').toLowerCase();
        if(!same)return x;changed=true;return {...x,streak:n};
      });
      if(changed)S.writeLocal(k,next);
    }catch{}
  }
  async function persistProfile(n){
    const c=LX.cloud?.db?.(),u=currentUser();if(!c||!u?.id)return;
    try{await c.from('lx_profiles').update({streak:n,updated_at:new Date().toISOString()}).eq('user_id',u.id)}catch(e){console.warn('LX streak cloud sync',e)}
  }
  function paint(){
    const label=`${count} ${count===1?'dia':'dias'}`;
    document.querySelectorAll('[data-lx-streak-count]').forEach(el=>{el.textContent=String(count)});
    let el=document.getElementById('lxStreakIndicator');
    const anchor=document.getElementById('communityBtn')||document.querySelector('.top-actions')||document.querySelector('.lx-shell-actions');
    if(!anchor||!currentUser())return;
    if(!el){
      el=document.createElement('button');el.id='lxStreakIndicator';el.type='button';el.className='lx261-streak-indicator';el.onclick=open;
      if(anchor.parentElement&&anchor.id==='communityBtn')anchor.parentElement.insertBefore(el,anchor);else anchor.prepend(el);
    }
    el.innerHTML=`<span aria-hidden="true">🔥</span><b>${count}</b>`;
    el.title=`Sequência LX: ${label}`;el.setAttribute('aria-label',`Sequência LX: ${label}`);
    const stat=document.querySelector('.welcome-card .mode-summary');
    if(stat&&!document.getElementById('lxStreakWelcome')){
      const d=document.createElement('div');d.id='lxStreakWelcome';d.className='lx261-streak-stat';d.innerHTML=`<strong>🔥 <span data-lx-streak-count>${count}</span></strong><small>SEQUÊNCIA</small>`;stat.appendChild(d);
    }
  }
  function open(){
    const msg=count>1?`🔥 Você está há ${count} dias seguidos no LX Plus. Seu recorde atual é ${Math.max(longest,count)} dias.`:`🔥 Sua sequência LX começou hoje. Volte amanhã para chegar a 2 dias.`;
    LX.toast?.(msg);
  }
  async function checkIn(force=false){
    if(busy)return count;const u=currentUser();if(!u?.id&&!u?.email)return count;busy=true;
    try{
      const today=dayKey(),meta=readMeta(),cloud=Math.max(0,cloudProfileStreak()),metaCount=Math.max(0,Number(meta.count||0));
      const previous=String(meta.date||''),priorCount=Math.max(metaCount,cloud),priorLongest=Math.max(0,Number(meta.longest||0),priorCount);
      if(previous===today){count=Math.max(priorCount,1);longest=Math.max(priorLongest,count);lastDate=today}
      else if(previous){
        const diff=(dayNumber(today)??0)-(dayNumber(previous)??0);
        // If another device already advanced the cloud streak, reuse it instead of adding twice.
        if(cloud>metaCount)count=cloud;
        else count=diff===1?Math.max(metaCount,cloud,0)+1:1;
        longest=Math.max(priorLongest,count);lastDate=today;
      }else{
        // First v26.2 check-in preserves any streak already present instead of fabricating an extra day.
        count=Math.max(priorCount,1);longest=Math.max(priorLongest,count);lastDate=today;
      }
      writeMeta({date:lastDate,count,longest,checkedAt:new Date().toISOString()});updateLocalUser(count);paint();
      if(force||previous!==today||cloud!==count)await persistProfile(count);
      return count;
    }finally{busy=false}
  }
  function current(){return count||Math.max(0,Number(readMeta().count||0),cloudProfileStreak())}
  LX.streak={checkIn,current,open,meta:()=>({count:current(),longest,lastDate})};
  const start=()=>{
    setTimeout(()=>checkIn().catch(()=>{}),700);
    let seenUser='';
    setInterval(()=>{
      const u=currentUser(),sig=String(u?.id||u?.email||'');
      if(sig&&sig!==seenUser){seenUser=sig;checkIn(true).catch(()=>{})}
    },2200);
    setInterval(()=>{if(document.visibilityState==='visible')checkIn().catch(()=>{})},30*60*1000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkIn().catch(()=>{})});
})();
window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['streak']='27.0-conversation';


/* ===== lxplus-v27.js ===== */
/* LX Plus v27 — premium experience layer */
(()=>{
  'use strict';
  const LX=window.LX=window.LX||{};
  const $=id=>document.getElementById(id);
  const $$=sel=>[...document.querySelectorAll(sel)];
  const esc=value=>String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const toast=message=>LX.toast?.(message);
  const state=()=>LX.state||LX.ui?.state||{};
  const user=()=>LX.cloud?.user?.()||state().user||null;
  const uid=()=>String(user()?.id||'');
  const db=()=>LX.cloud?.db?.()||null;
  const role=()=>String(state().user?.adminRole||state().user?.admin_role||LX.cloud?.profile?.()?.admin_role||'').toLowerCase();
  const fmt=seconds=>LX.fmt?.(Number(seconds)||0)||'0:00';
  const logo='assets/lxplus-logo-v27.png?v=31.2';
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;

  LX.v27={version:'31.2',spotifyCache:{tracks:[],artists:[],albums:[],playlists:[]}};

  function syncBranding(root=document){
    root.querySelectorAll?.('img').forEach(img=>{
      const src=String(img.getAttribute('src')||'');
      if(/lxplus-(?:brand|logo-approved|wordmark)|app-icon-/i.test(src)&&!img.closest('.hub-music-grid,.lx-v27-spotify-results')){
        img.src=logo;img.classList.add('lx-logo-v27');if(!img.alt)img.alt='LX Plus';
      }
      if(!img.classList.contains('lx-logo-v27')&&!img.closest('#splash')){img.loading='lazy';img.decoding='async'}
    });
  }

  /* ---------- Instalação PWA respeitosa ---------- */
  const PWA_KEY='lxplus:v27:pwa-dismissed';
  const PWA_COOLDOWN=14*86400000;
  let installPrompt=null;
  function installAllowed(){
    if(standalone())return false;
    const dismissed=Number(localStorage.getItem(PWA_KEY)||0);
    return !dismissed||Date.now()-dismissed>PWA_COOLDOWN;
  }
  function hideInstallUI(){
    $$('.install-app-btn,#installAppBtn,[data-install-app]').forEach(el=>el.classList.add('hidden'));
    $('lxV27Install')?.remove();
  }
  function showInstallInvite(manual=false){
    if(!installAllowed()||(!installPrompt&&!manual)||$('lxV27Install'))return;
    const box=document.createElement('aside');box.id='lxV27Install';box.className='lx-v27-install';box.setAttribute('aria-label','Instalar LX Plus');
    box.innerHTML=`<img src="${logo}" alt=""><div><strong>Instalar LX Plus</strong><small>Abra mais rápido e em tela cheia.</small></div><button type="button" data-pwa-install>Instalar</button><button type="button" data-pwa-dismiss aria-label="Agora não">×</button>`;
    document.body.appendChild(box);
    box.querySelector('[data-pwa-install]').onclick=async()=>{
      if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();const result=await prompt.userChoice.catch(()=>({outcome:'dismissed'}));if(result.outcome==='accepted'){hideInstallUI();return}}
      else window.LXPWA?.install?.();
    };
    box.querySelector('[data-pwa-dismiss]').onclick=()=>{localStorage.setItem(PWA_KEY,String(Date.now()));box.remove()};
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;showInstallInvite(false)});
  window.addEventListener('appinstalled',()=>{installPrompt=null;hideInstallUI()});

  /* ---------- Música: sem confundir prévia com faixa completa ---------- */
  const audio=()=>$('musicAudio');
  const track=()=>state().musicQueue?.[state().musicIndex]||null;
  function isSpotify(){const item=track();return /^spotify:(?:track|album|playlist|episode|show|artist):/i.test(String(item?.mediaKey||''))}
  function isPreview(item=track()){return !!item&&(item.isPreview===true||item.playbackKind==='preview'||(!item.mediaKey&&!!item.previewUrl))}
  function musicPositionKey(item=track()){
    if(!item||!uid())return'';
    return `lxplus:v27:music:${uid()}:${String(item.contentId||item.remoteId||'track')}:${Number(item.index??state().musicIndex??0)}`;
  }
  function setMusicKind(){
    const item=track(),badge=$('musicPlaybackKind'),dock=$('musicDock');if(!badge||!dock)return;
    badge.textContent=item?'FAIXA COMPLETA':'';badge.classList.remove('is-preview','is-spotify');badge.classList.toggle('hidden',!item);syncMusicProviderBrand(item);
    dock.classList.remove('is-preview');dock.classList.toggle('is-full-track',!!item);$('musicDuration')?.removeAttribute('title');syncNowPlaying();
  }
  function saveScopedPosition(){
    const item=track(),el=audio(),key=musicPositionKey(item);if(!item||!el||!key||isPreview(item)||!Number.isFinite(el.duration)||el.duration<=0)return;
    localStorage.setItem(key,JSON.stringify({position:el.currentTime||0,duration:el.duration,updatedAt:Date.now()}));
  }
  function restoreScopedPosition(){
    const item=track(),el=audio(),key=musicPositionKey(item);if(!item||!el||!key||!el.duration)return;
    setMusicKind();
    const signature=key+':'+String(el.currentSrc||el.src);if(el.dataset.lxV27Position===signature)return;el.dataset.lxV27Position=signature;
    if(isPreview(item)){el.currentTime=0;return}
    let local={};try{local=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
    const history=LX.data?.history?.()?.[item.contentId]||{};
    const cloudPosition=Number(history.musicIndex)===Number(item.index??state().musicIndex)?Number(history.position||0):0;
    const position=Math.max(Number(local.position||0),cloudPosition);
    if(position>4&&position<el.duration-8)try{el.currentTime=position}catch{}
  }
  function playPreview(){toast('Prévia desativada. A LX Music usa somente faixas completas do catálogo próprio.')}
  LX.playOnlineMusicPreview=playPreview;

  function spotifyTrack(item){
    const artists=(item?.artists||[]).map(a=>a.name).filter(Boolean).join(', ')||'LX Music';
    return {title:item?.name||'Faixa',artist:artists,album:item?.album?.name||'',cover:item?.album?.images?.[0]?.url||'',duration:Number(item?.duration_ms||0)/1000,mediaKey:`spotify:track:${item?.id}`,contentId:`spotify-${item?.id}`,remoteId:item?.id,index:0,playbackKind:'spotify'};
  }
  function playSpotifyList(list,index=0){
    const rows=(list||[]).filter(x=>x?.id).map(spotifyTrack);if(!rows.length)return toast('Nenhuma faixa reproduzível encontrada.');
    rows.forEach((row,i)=>row.index=i);state().musicQueue=rows;state().musicIndex=Math.max(0,Math.min(Number(index)||0,rows.length-1));$('musicDock')?.classList.remove('hidden');LX.loadMusicTrack?.(true);setTimeout(setMusicKind,0);
  }
  function addSpotifyTrack(index,source='tracks'){
    const item=LX.v27.spotifyCache[source]?.[Number(index)];if(!item)return;
    const row=spotifyTrack(item),queue=state().musicQueue=state().musicQueue||[];
    if(queue.some(x=>String(x.mediaKey)===String(row.mediaKey)))return toast('Essa faixa já está na fila.');
    row.index=queue.length;queue.push(row);toast('Adicionada à fila.');
  }
  LX.v27PlaySpotify=(index,source='tracks')=>playSpotifyList(LX.v27.spotifyCache[source]||[],index);
  LX.v27AddSpotify=addSpotifyTrack;

  async function spotifyInvoke(body){
    const client=db();if(!client)throw new Error('Entre na LX Plus para usar a busca musical.');
    const {data,error}=await client.functions.invoke('lx-spotify-catalog',{body});
    if(error)throw new Error(error.context?.body?.error||error.message||'Falha ao consultar o Spotify.');
    if(data?.error)throw new Error(data.error);return data;
  }
  const imageOf=item=>item?.images?.[0]?.url||item?.album?.images?.[0]?.url||'';
  const artistsOf=item=>(item?.artists||[]).map(a=>a.name).filter(Boolean).join(', ')||'LX Music';
  function spotifyTrackRows(items,source='tracks'){
    return (items||[]).map((item,index)=>`<article class="lx-v27-spotify-track"><button type="button" class="lx-v27-track-play" onclick="LX.v27PlaySpotify(${index},'${source}')" aria-label="Reproduzir ${esc(item.name)}">${LX.artwork.markup({...item,cover:imageOf(item)}, {}, 'lx-spotify-art',item.name)}<span>▶</span></button><div><strong>${esc(item.name)}</strong><small>${esc(artistsOf(item))} · ${esc(item.album?.name||'Single')}</small></div><time>${fmt(Number(item.duration_ms||0)/1000)}</time><button type="button" class="lx-v27-add-queue" onclick="LX.v27AddSpotify(${index},'${source}')" aria-label="Adicionar à fila">＋</button></article>`).join('');
  }
  function spotifyCards(items,type){
    const method=type==='artist'?'openSpotifyArtist':type==='album'?'openSpotifyAlbum':'openSpotifyPlaylist';
    return (items||[]).map(item=>`<button type="button" class="lx-v27-spotify-card" onclick="LX.${method}('${esc(item.id)}')">${LX.artwork.markup({...item,cover:imageOf(item)}, {}, 'lx-spotify-art',item.name)}<span><strong>${esc(item.name)}</strong><small>${type==='artist'?'Artista':type==='album'?esc(artistsOf(item)):'Playlist oficial'}</small></span></button>`).join('');
  }
  function musicSearchShell(q=''){
    const welcome=$('welcome'),content=$('homeContent');$('hero')?.classList.add('hidden');
    if(welcome)welcome.innerHTML=`<section class="lx-v27-music-search-hero"><span class="eyebrow">LX MUSIC</span><h1>Encontre o que quer ouvir.</h1><p>Catálogo LX Music com player persistente e faixas completas cadastradas no site.</p><form id="lxV27SpotifySearch"><label><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.4-4.4m2.4-5.6a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/></svg><input id="lxV27SpotifyQuery" value="${esc(q)}" placeholder="Faixa, artista, álbum ou playlist" autocomplete="off"></label><button>Buscar</button></form></section>`;
    if(content)content.innerHTML='<section class="lx-v27-spotify-loading"><span></span>Carregando a biblioteca LX Music…</section>';
    $('lxV27SpotifySearch')?.addEventListener('submit',event=>{event.preventDefault();renderSpotifySearch($('lxV27SpotifyQuery')?.value||'')});
  }
  async function renderSpotifySearch(query='Brasil'){
    const q=String(query||'').trim()||'Brasil';musicSearchShell(q);
    try{
      const response=await spotifyInvoke({action:'search',q,limit:12}),data=response.data||{};
      LX.v27.spotifyCache.tracks=data.tracks?.items||[];LX.v27.spotifyCache.artists=data.artists?.items||[];LX.v27.spotifyCache.albums=data.albums?.items||[];LX.v27.spotifyCache.playlists=(data.playlists?.items||[]).filter(Boolean);
      const c=$('homeContent');if(!c)return;
      c.innerHTML=`<div class="lx-v27-spotify-results">${LX.v27.spotifyCache.tracks.length?`<section><header><div><span>FAIXAS</span><h2>Resultados principais</h2></div><button type="button" onclick="LX.v27PlaySpotify(0)">▶ Tocar tudo</button></header><div class="lx-v27-track-table">${spotifyTrackRows(LX.v27.spotifyCache.tracks)}</div></section>`:''}${LX.v27.spotifyCache.artists.length?`<section><header><div><span>ARTISTAS</span><h2>Artistas</h2></div></header><div class="lx-v27-card-grid artists">${spotifyCards(LX.v27.spotifyCache.artists,'artist')}</div></section>`:''}${LX.v27.spotifyCache.albums.length?`<section><header><div><span>ÁLBUNS E SINGLES</span><h2>Discografia</h2></div></header><div class="lx-v27-card-grid">${spotifyCards(LX.v27.spotifyCache.albums,'album')}</div></section>`:''}${LX.v27.spotifyCache.playlists.length?`<section><header><div><span>PLAYLISTS</span><h2>Playlists</h2></div></header><div class="lx-v27-card-grid">${spotifyCards(LX.v27.spotifyCache.playlists,'playlist')}</div></section>`:''}</div>`;
      syncBranding(c);
    }catch(error){
      const legacy=LX.v27.legacyMusicSearch;if(typeof legacy==='function'){await legacy(q);const c=$('homeContent');if(c)c.insertAdjacentHTML('afterbegin',`<div class="lx-v27-provider-note"><strong>Catálogo externo desativado</strong><span>${esc(error.message)} Enquanto isso, os resultados abaixo são prévias oficiais e aparecem marcados como “Prévia”.</span></div>`)}
      else if($('homeContent'))$('homeContent').innerHTML=`<div class="lx-v27-empty"><strong>Busca musical indisponível</strong><p>${esc(error.message)}</p></div>`;
    }
  }

  async function openSpotifyArtist(id){
    const overlay=$('overlay'),modal=$('modal');if(!overlay||!modal)return;overlay.classList.remove('hidden');modal.innerHTML='<div class="lx-v27-detail-loading">Carregando artista…</div>';
    try{const out=await spotifyInvoke({action:'artist',id}),artist=out.artist||{},tracks=out.tracks?.tracks||[],albums=out.albums?.items||[];LX.v27.spotifyCache.artistTracks=tracks;LX.v27.spotifyCache.artistAlbums=albums;modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-artist-page"><header style="--artist-bg:url('${esc(imageOf(artist))}')"><img src="${esc(imageOf(artist))}" alt="" loading="lazy"><div><span class="lx-v27-verified">✓ Artista verificado na LX Music</span><h2>${esc(artist.name)}</h2><p>${Number(artist.followers?.total||0).toLocaleString('pt-BR')} seguidores</p><button type="button" onclick="LX.v27PlaySpotify(0,'artistTracks')">▶ Reproduzir populares</button></div></header><section><div class="lx-v27-section-head"><span>POPULAR</span><h3>Músicas populares</h3></div><div class="lx-v27-track-table">${spotifyTrackRows(tracks,'artistTracks')}</div></section><section><div class="lx-v27-section-head"><span>DISCOGRAFIA</span><h3>Álbuns e singles</h3></div><div class="lx-v27-card-grid">${spotifyCards(albums,'album')}</div></section></div>`}catch(error){modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-empty"><strong>Não foi possível abrir o artista</strong><p>${esc(error.message)}</p></div>`}
  }
  async function openSpotifyAlbum(id){
    const overlay=$('overlay'),modal=$('modal');if(!overlay||!modal)return;overlay.classList.remove('hidden');modal.innerHTML='<div class="lx-v27-detail-loading">Carregando álbum…</div>';
    try{const out=await spotifyInvoke({action:'album',id}),album=out.data||{},tracks=(album.tracks?.items||[]).map(t=>({...t,album:{name:album.name,images:album.images},artists:t.artists?.length?t.artists:album.artists}));LX.v27.spotifyCache.albumTracks=tracks;modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-album-page"><header style="--album-bg:url('${esc(imageOf(album))}')"><img src="${esc(imageOf(album))}" alt="" loading="lazy"><div><span>${String(album.album_type||'álbum').toUpperCase()}</span><h2>${esc(album.name)}</h2><p>${esc(artistsOf(album))} · ${esc(String(album.release_date||'').slice(0,4))} · ${tracks.length} faixas</p><div><button type="button" onclick="LX.v27PlaySpotify(0,'albumTracks')">▶ Reproduzir</button><button type="button" onclick="LX.v27ShuffleSpotify('albumTracks')">⇄ Embaralhar</button></div></div></header><section><div class="lx-v27-track-table">${spotifyTrackRows(tracks,'albumTracks')}</div></section></div>`}catch(error){modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-empty"><strong>Não foi possível abrir o álbum</strong><p>${esc(error.message)}</p></div>`}
  }
  async function openSpotifyPlaylist(id){
    const overlay=$('overlay'),modal=$('modal');if(!overlay||!modal)return;overlay.classList.remove('hidden');modal.innerHTML='<div class="lx-v27-detail-loading">Carregando playlist…</div>';
    try{const out=await spotifyInvoke({action:'playlist',id}),list=out.data||{},tracks=(list.tracks?.items||[]).map(x=>x.track).filter(x=>x?.id);LX.v27.spotifyCache.playlistTracks=tracks;modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-album-page"><header style="--album-bg:url('${esc(imageOf(list))}')"><img src="${esc(imageOf(list))}" alt="" loading="lazy"><div><span>PLAYLIST</span><h2>${esc(list.name)}</h2><p>${esc(list.owner?.display_name||'LX Music')} · ${tracks.length} faixas</p><button type="button" onclick="LX.v27PlaySpotify(0,'playlistTracks')">▶ Reproduzir</button></div></header><section><div class="lx-v27-track-table">${spotifyTrackRows(tracks,'playlistTracks')}</div></section></div>`}catch(error){modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-empty"><strong>Não foi possível abrir a playlist</strong><p>${esc(error.message)}</p></div>`}
  }
  LX.openSpotifyArtist=openSpotifyArtist;LX.openSpotifyAlbum=openSpotifyAlbum;LX.openSpotifyPlaylist=openSpotifyPlaylist;
  LX.v27ShuffleSpotify=source=>{const list=[...(LX.v27.spotifyCache[source]||[])];for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}playSpotifyList(list,0)};

  /* ---------- Tocando agora e fila real ---------- */
  function ensureNowPlaying(){
    let panel=$('lxV27NowPlaying');if(panel)return panel;
    panel=document.createElement('section');panel.id='lxV27NowPlaying';panel.className='lx-v27-now-playing hidden';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Tocando agora');document.body.appendChild(panel);return panel;
  }
  function openNowPlaying(){const item=track();if(!item)return toast('Escolha uma música primeiro.');const panel=ensureNowPlaying();panel.classList.remove('hidden');document.documentElement.classList.add('lx-now-playing-open');syncNowPlaying()}
  function closeNowPlaying(){ensureNowPlaying().classList.add('hidden');document.documentElement.classList.remove('lx-now-playing-open')}
  function syncNowPlaying(){
    const panel=$('lxV27NowPlaying'),item=track();if(!panel||panel.classList.contains('hidden')||!item)return;
    const preview=isPreview(item),spotify=isSpotify(item),queue=state().musicQueue||[],current=Number(state().musicIndex)||0,upcoming=queue.slice(current+1,current+5);
    const signature=[item.mediaKey||item.remoteId||item.contentId||item.title,item.cover||'',item.artist||'',item.duration||'',current,queue.map(row=>row.mediaKey||row.remoteId||row.contentId||row.title).join(',')].join('|');
    if(panel.dataset.signature===signature){updateNowPlayingProgress();return}panel.dataset.signature=signature;panel.classList.toggle('no-queue',!upcoming.length);panel.style.setProperty('--now-art',LX.artwork.safeBackground(item));
    const icon=name=>LX.artwork.icon(name),button=(name,target,label)=>`<button type="button" onclick="${target}" aria-label="${label}" title="${label}">${icon(name)}</button>`;
    panel.innerHTML=`<div class="lx-v27-now-backdrop"></div><header>${button('down','LX.closeNowPlaying()','Fechar Tocando agora')}<div><span>TOCANDO AGORA</span><strong>${musicProviderBrandHtml(item,true)}</strong></div>${button('queue','LX.openMusicQueue()','Abrir fila')}</header><main><section class="lx-v27-now-art">${LX.artwork.markup(item,{},'lx-now-art-image','Capa de '+(item.title||'música'))}<span class="${preview?'preview':''}">FAIXA COMPLETA · LX MUSIC</span></section><section class="lx-v27-now-copy"><div><span>${esc(item.album||'LX Music')}</span><h2>${esc(item.title||'Faixa')}</h2><p>${esc(item.artist||'LX Music')}</p></div>${button('heart',"document.getElementById('musicLikeBtn')?.click()",'Salvar na biblioteca')}<div class="lx-v27-now-progress"><input data-now-progress type="range" min="0" max="100" step="0.1" value="${Number($('musicProgress')?.value||0)}" aria-label="Posição da faixa" oninput="document.getElementById('musicProgress').value=this.value;document.getElementById('musicProgress').dispatchEvent(new Event('input'))"><div><span data-now-time>${esc($('musicTime')?.textContent||'0:00')}</span><span data-now-duration>${esc($('musicDuration')?.textContent||fmt(item.duration))}</span></div></div><div class="lx-v27-now-controls">${button('shuffle',"document.getElementById('musicShuffle')?.click()",'Embaralhar')}${button('prev',"document.getElementById('musicPrev')?.click()",'Anterior')}<button data-now-play type="button" class="main" aria-label="Reproduzir ou pausar" onclick="document.getElementById('musicPlay')?.click()">${icon(audio()?.paused?'play':'pause')}</button>${button('next',"document.getElementById('musicNext')?.click()",'Próxima')}${button('repeat',"document.getElementById('musicRepeat')?.click()",'Repetir')}</div><div class="lx-v27-now-actions">${button('lyrics','LX.openMusicLyrics?.()','Ver letra')}${button('queue','LX.openMusicQueue()','Abrir fila')}</div></section>${upcoming.length?`<aside><span>PRÓXIMAS</span><h3>Na fila</h3>${upcoming.map((row,index)=>`<button type="button" onclick="LX.musicQueuePlay(${current+1+index})">${LX.artwork.markup(row,{},'lx-queue-art',row.title)}<span><strong>${esc(row.title)}</strong><small>${esc(row.artist)}</small></span></button>`).join('')}</aside>`:''}</main>`;
    LX.artwork.hydrate(panel);
  }
  function updateNowPlayingProgress(){const panel=$('lxV27NowPlaying'),source=$('musicProgress');if(!panel||panel.classList.contains('hidden'))return;const range=panel.querySelector('[data-now-progress]'),time=panel.querySelector('[data-now-time]'),duration=panel.querySelector('[data-now-duration]'),play=panel.querySelector('[data-now-play]');if(range&&source&&document.activeElement!==range)range.value=source.value||0;if(time)time.textContent=$('musicTime')?.textContent||'0:00';if(duration)duration.textContent=$('musicDuration')?.textContent||fmt(track()?.duration);if(play)play.innerHTML=LX.artwork.icon(audio()?.paused?'play':'pause')}
  document.addEventListener('lx:music-changed',()=>{const panel=$('lxV27NowPlaying');if(panel)panel.dataset.signature='';syncNowPlaying();setMusicKind()});document.addEventListener('lx:music-artwork-updated',()=>{const panel=$('lxV27NowPlaying');if(panel)panel.dataset.signature='';syncNowPlaying()});
  function normalizeQueueIndexes(){(state().musicQueue||[]).forEach((item,index)=>item.index=index)}
  function queueMove(index,delta){
    const queue=state().musicQueue||[],from=Number(index),to=from+Number(delta);if(from<0||to<0||from>=queue.length||to>=queue.length)return;
    const current=queue[state().musicIndex];[queue[from],queue[to]]=[queue[to],queue[from]];normalizeQueueIndexes();state().musicIndex=Math.max(0,queue.indexOf(current));openQueueV27();syncNowPlaying();
  }
  function queueRemove(index){
    const queue=state().musicQueue||[],i=Number(index);if(i<0||i>=queue.length)return;const wasCurrent=i===Number(state().musicIndex);queue.splice(i,1);normalizeQueueIndexes();
    if(!queue.length){audio()?.pause();$('musicDock')?.classList.add('hidden');LX.ui?.close?.();closeNowPlaying();return}
    state().musicIndex=Math.min(Number(state().musicIndex),queue.length-1);if(i<state().musicIndex)state().musicIndex--;if(wasCurrent)LX.loadMusicTrack?.(true);openQueueV27();syncNowPlaying();
  }
  function openQueueV27(){
    const modal=$('modal'),overlay=$('overlay'),queue=state().musicQueue||[],current=Number(state().musicIndex)||0;if(!modal||!overlay)return;overlay.classList.remove('hidden');
    modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-queue"><header><span>LX MUSIC</span><h2>Fila de reprodução</h2><p>Reordene, remova ou escolha a próxima faixa.</p></header><div>${queue.map((item,index)=>`<article class="${index===current?'active':''}"><button type="button" class="lx-v27-queue-play" onclick="LX.musicQueuePlay(${index})">${LX.artwork.markup(item,{},'lx-queue-art',item.title)}<span><strong>${esc(item.title)}</strong><small>${esc(item.artist)} · Faixa completa · LX Music</small></span><time>${fmt(item.duration||0)}</time></button><div><button type="button" onclick="LX.v27QueueMove(${index},-1)" ${index===0?'disabled':''} aria-label="Mover para cima">↑</button><button type="button" onclick="LX.v27QueueMove(${index},1)" ${index===queue.length-1?'disabled':''} aria-label="Mover para baixo">↓</button><button type="button" class="danger" onclick="LX.v27QueueRemove(${index})" aria-label="Remover da fila">×</button></div></article>`).join('')||'<div class="lx-v27-empty"><strong>A fila está vazia</strong><p>Escolha uma faixa para começar.</p></div>'}</div></div>`;
    LX.artwork.hydrate(modal);
  }
  LX.openNowPlaying=openNowPlaying;LX.closeNowPlaying=closeNowPlaying;LX.openMusicQueue=openQueueV27;LX.v27QueueMove=queueMove;LX.v27QueueRemove=queueRemove;

  /* ---------- HLS/DASH adaptativo e controles honestos ---------- */
  let shakaPromise=null;
  function loadShaka(){
    if(window.shaka?.Player)return Promise.resolve(window.shaka);if(shakaPromise)return shakaPromise;
    shakaPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/shaka-player@5.2.10/dist/shaka-player.compiled.js';script.async=true;script.onload=()=>window.shaka?.Player?resolve(window.shaka):reject(new Error('SHAKA_UNAVAILABLE'));script.onerror=()=>reject(new Error('SHAKA_LOAD_FAILED'));document.head.appendChild(script)});return shakaPromise;
  }
  function adaptiveQualityUI(video,player){
    const root=video.getRootNode(),settings=root?.getElementById?.('settings');if(!settings)return;
    settings.querySelector('[data-lx-adaptive-quality]')?.remove();
    const tracks=player.getVariantTracks().filter(t=>t.height&&t.bandwidth),unique=[];
    [...tracks].sort((a,b)=>b.height-a.height||b.bandwidth-a.bandwidth).forEach(item=>{if(!unique.some(x=>x.height===item.height))unique.push(item)});
    if(!unique.length)return;
    const wrap=document.createElement('div');wrap.dataset.lxAdaptiveQuality='1';wrap.innerHTML=`<span style="display:block;padding:7px 10px 4px;color:#9ea6af;font-size:11px;font-weight:800">QUALIDADE ADAPTATIVA</span><button data-auto class="active">Automático</button>${unique.map((item,index)=>`<button data-variant="${index}">${item.height}p${item.hdr?' · HDR':''}</button>`).join('')}`;
    settings.prepend(wrap);wrap.querySelector('[data-auto]').onclick=()=>{player.configure({abr:{enabled:true}});wrap.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.hasAttribute('data-auto')));toast('Qualidade automática ativada.')};wrap.querySelectorAll('[data-variant]').forEach(button=>button.onclick=()=>{const item=unique[Number(button.dataset.variant)];player.configure({abr:{enabled:false}});player.selectVariantTrack(item,true);wrap.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));toast(`Qualidade ${item.height}p selecionada.`)});
  }
  LX.adaptive={
    async load(video,url){
      const shaka=await loadShaka();if(!shaka.Player.isBrowserSupported())throw new Error('ADAPTIVE_NOT_SUPPORTED');await this.destroy(video);
      const player=new shaka.Player();await player.attach(video);player.configure({abr:{enabled:true},streaming:{bufferingGoal:18,rebufferingGoal:3,bufferBehind:24}});video.__lxShaka=player;
      player.addEventListener('error',event=>console.warn('LX adaptive stream',event.detail));await player.load(url);adaptiveQualityUI(video,player);video.dispatchEvent(new Event('loadedmetadata'));return true;
    },
    async destroy(video){if(video?.__lxShaka){const player=video.__lxShaka;video.__lxShaka=null;try{await player.destroy()}catch{}}}
  };
  function enhancePlayer(host){
    if(!host?.shadowRoot||host.dataset.lxV27Enhanced)return;host.dataset.lxV27Enhanced='1';const root=host.shadowRoot,video=root.getElementById('video');
    const style=document.createElement('style');style.textContent=`.heading strong,.copy b{font-size:clamp(20px,2.1vw,32px)!important;line-height:1.08!important}.heading small,.copy small{font-size:clamp(12px,1vw,15px)!important}.nextCard strong{font-size:19px!important}.nextCard small{font-size:14px!important;line-height:1.45!important}.stage.lx-image-enhanced video,.stage.lx-image-enhanced .driveFrame{filter:contrast(1.085) saturate(1.045) brightness(1.018);transform:translateZ(0);image-rendering:auto}.lx-enhance-ask{position:absolute;z-index:30;left:50%;bottom:94px;transform:translateX(-50%);width:min(390px,88vw);padding:15px;border-radius:15px;background:rgba(8,8,8,.9);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(18px);box-shadow:0 18px 50px rgba(0,0,0,.48);color:#fff}.lx-enhance-ask strong{display:block;font-size:15px;margin-bottom:5px}.lx-enhance-ask small{display:block;color:#bcc3cb;font-size:11px;line-height:1.4;margin-bottom:10px}.lx-enhance-ask div{display:flex;gap:8px}.lx-enhance-ask button{flex:1;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.09);color:#fff;font-weight:800;cursor:pointer}.lx-enhance-ask button:first-child{background:#fff;color:#070707}.settings button.active{background:rgba(255,255,255,.14)!important;color:#fff!important}.lx-source-quality{display:block;padding:8px 10px;margin-bottom:4px;border-radius:9px;background:rgba(255,255,255,.055);color:#c8d0d8;font-size:11px}.nextCard{padding:18px!important}@media(max-width:760px){.lx-enhance-ask{bottom:72px;padding:13px}.heading strong,.copy b{font-size:17px!important}.heading small,.copy small{font-size:12px!important}.nextCard{bottom:76px!important}.nextCard strong{font-size:17px!important}.nextCard small{font-size:13px!important}}`;
    root.appendChild(style);if(!video)return;
    const settings=root.getElementById('settings'),stage=root.getElementById('stage');if(!settings||!stage)return;
    const qualityInfo=document.createElement('span');qualityInfo.className='lx-source-quality';qualityInfo.textContent='Fonte detectada · aguardando vídeo';settings.prepend(qualityInfo);const sourceBadge=root.getElementById('sourceBadge');const updateResolution=()=>{const h=Number(video.videoHeight||0),label=h>=2160?'4K real':h>=1440?`${h}p`:h>=1080?'1080p':h>=720?'720p':h>=480?'480p':h?`${h}p`:'Automático';qualityInfo.textContent=`Fonte detectada · ${label}`;if(sourceBadge)sourceBadge.textContent=`LX · ${label}`};video.addEventListener('loadedmetadata',updateResolution);video.addEventListener('resize',updateResolution);
    if(!root.getElementById('enhanceV27')){const readPrefs=()=>S.read(S.keys.playerPrefs,{})||{},writeEnhance=on=>{const prefs=readPrefs();S.write(S.keys.playerPrefs,{...prefs,enhanceAsked:true,enhanceVisual:!!on})},applyEnhance=on=>{stage.classList.toggle('lx-image-enhanced',!!on);button.textContent=`Filtro de qualidade · ${on?'ligado':'desligado'}`;button.setAttribute('aria-pressed',String(!!on))},button=document.createElement('button');button.id='enhanceV27';const saved=readPrefs();applyEnhance(!!saved.enhanceVisual);button.onclick=()=>{const on=!stage.classList.contains('lx-image-enhanced');applyEnhance(on);writeEnhance(on);toast(on?'Filtro de qualidade ativado: melhora nitidez, contraste e cor no aparelho. Não transforma baixa resolução em 4K real.':'Filtro de qualidade desligado.')};settings.prepend(button);if(!saved.enhanceAsked){const ask=document.createElement('div');ask.className='lx-enhance-ask';ask.innerHTML=`<strong>Ativar filtro de qualidade?</strong><small>Melhora nitidez, contraste e cor. Pode usar um pouco mais de bateria.</small><div><button data-enhance-yes>Ativar</button><button data-enhance-no>Agora não</button></div>`;stage.appendChild(ask);ask.querySelector('[data-enhance-yes]').onclick=()=>{applyEnhance(true);writeEnhance(true);ask.remove();toast('Filtro de qualidade ativado. Você pode desligar em •••.')};ask.querySelector('[data-enhance-no]').onclick=()=>{applyEnhance(false);writeEnhance(false);ask.remove()}}}
    const rows=host.__lxQualityRows||[];if(rows.length>1&&!settings.querySelector('[data-lx-native-quality]')){const wrap=document.createElement('div');wrap.dataset.lxNativeQuality='1';wrap.innerHTML=`<span style="display:block;padding:7px 10px 4px;color:#9ea6af;font-size:11px;font-weight:800">QUALIDADES DISPONÍVEIS</span>${rows.map((row,index)=>`<button data-quality-index="${index}" class="${index===0?'active':''}">${esc(row.label)}</button>`).join('')}`;settings.prepend(wrap);wrap.querySelectorAll('[data-quality-index]').forEach(button=>button.onclick=async()=>{const row=rows[Number(button.dataset.qualityIndex)];wrap.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));await host.__lxSetQuality?.(row);toast(`Qualidade ${row.label} selecionada.`)})}
  }

  /* ---------- Fogo compartilhado por conversa ---------- */
  let streakTimer=null,streakChannel=null,streakUser='';
  async function refreshConversationStreak(){
    clearTimeout(streakTimer);streakTimer=setTimeout(async()=>{
      const peer=String(LX.chat?.peer?.()||''),client=db(),head=document.querySelector('.lx-chat-head');if(!peer||!client||!head)return;
      try{const {data,error}=await client.rpc('lx_get_conversation_streak',{p_other:peer});if(error)throw error;const row=Array.isArray(data)?data[0]:data,badge=head.querySelector('.lx-v27-chat-streak')||document.createElement('span');badge.className='lx-v27-chat-streak';const count=Number(row?.streak_count||0);badge.innerHTML=`<i aria-hidden="true">🔥</i><b>${count}</b>`;badge.title=count?`${count} ${count===1?'dia':'dias'} de fogo nesta conversa`:'O fogo começa quando os dois trocam mensagens hoje';badge.setAttribute('aria-label',badge.title);const copy=head.querySelector(':scope > div:nth-of-type(2)');if(copy&&badge.parentElement!==copy)copy.appendChild(badge)}catch(error){console.warn('LX conversation streak',error)}
    },260);
  }
  function subscribeStreak(){
    const me=uid(),client=db();if(!me||!client||streakUser===me)return;if(streakChannel)client.removeChannel(streakChannel).catch(()=>{});streakUser=me;streakChannel=client.channel(`lx-v27-streak-${me}`).on('postgres_changes',{event:'*',schema:'public',table:'lx_conversation_streaks'},refreshConversationStreak).subscribe();
  }

  /* ---------- Cargos e painel ADM ---------- */
  const roleLabels={owner:'Dono',administrator:'Administrador',editor:'Editor',moderator:'Moderador'};
  const normalizeRole=value=>({admin:'administrator',manager:'administrator',owner:'owner',administrator:'administrator',editor:'editor',moderator:'moderator'}[String(value||'').toLowerCase()]||'administrator');
  const pageCaps={dashboard:['owner','administrator','editor','moderator'],library:['owner','administrator','editor'],movies:['owner','administrator','editor'],series:['owner','administrator','editor'],music:['owner','administrator','editor'],books:['owner','administrator','editor'],importer:['owner','administrator','editor'],uploads:['owner','administrator','editor'],requests:['owner','administrator','moderator'],community:['owner','administrator','moderator'],admins:['owner'],premium:['owner','administrator'],analytics:['owner','administrator'],notifications:['owner','administrator','moderator'],appearance:['owner','administrator'],settings:['owner','administrator']};
  function canPage(page){return (pageCaps[page]||['owner']).includes(normalizeRole(role()))}
  function applyAdminPermissions(){
    const currentRole=normalizeRole(role());$$('#adminNav [data-admin]').forEach(button=>{const allowed=(pageCaps[button.dataset.admin]||['owner']).includes(currentRole);button.classList.toggle('lx-role-hidden',!allowed);button.disabled=!allowed});
    const ident=document.querySelector('.admin-identity small'),label=roleLabels[currentRole]||'Equipe LX';
    // A atribuição de textContent cria childList mesmo com o mesmo texto. Como o
    // observador abaixo chama enhanceAdmin, reescrever sempre aqui bloqueava
    // todos os timers e a passagem da abertura para o login.
    if(ident&&ident.textContent!==label)ident.textContent=label;
    if(currentRole!=='owner')document.querySelector('#r2Setup')?.classList.add('lx-role-hidden');
  }
  function roleOptions(selected='administrator'){return Object.entries(roleLabels).map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('')}
  function renderAdminTeam(){
    const main=$('adminMain');if(!main||state().adminPage!=='admins'||main.dataset.lxV27Team==='1')return;main.dataset.lxV27Team='1';
    if(role()!=='owner'){LX.admin?.render?.('dashboard');return}
    const users=(LX.data?.users?.()||[]).filter(row=>row.admin||row.approved).sort((a,b)=>(b.admin?1:0)-(a.admin?1:0)||String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    main.innerHTML=`<header class="admin-head"><div><span class="eyebrow">SEGURANÇA E OPERAÇÃO</span><h1>Equipe ADM</h1><p>O Dono define exatamente o que cada pessoa pode fazer.</p></div><span class="lx-v27-owner-lock">Dono protegido</span></header><section class="lx-v27-role-guide">${Object.entries(roleLabels).map(([key,label])=>`<article><span>${label}</span><p>${key==='owner'?'Acesso total, cargos, integrações e segurança.':key==='administrator'?'Catálogo, usuários, conteúdo, comunidade e operação geral.':key==='editor'?'Filmes, séries, músicas, livros e uploads.':'Comunidade, aprovações, pedidos e moderação.'}</p></article>`).join('')}</section><section class="admin-card lx-v27-team-table"><header><div><span>EQUIPE</span><h2>${users.filter(x=>x.admin).length} contas no painel</h2></div></header><div>${users.map(row=>{const selected=normalizeRole(row.adminRole),self=String(row.id)===uid();return `<article><div class="lx-v27-team-person"><span>${esc(String(row.name||'LX').slice(0,2).toUpperCase())}</span><div><strong>${esc(row.name||'Usuário')}</strong><small>${esc(row.email||'Conta aprovada')}</small></div></div><div class="lx-v27-team-role">${row.admin?`<select id="lxRole_${esc(row.id)}">${roleOptions(selected)}</select><button type="button" onclick="LX.v27SaveRole('${esc(row.id)}')">Salvar cargo</button>`:`<select id="lxRole_${esc(row.id)}">${roleOptions('editor')}</select><button type="button" onclick="LX.v27SaveRole('${esc(row.id)}')">Adicionar à equipe</button>`}</div>${row.admin?`<button type="button" class="danger" onclick="LX.v27RemoveRole('${esc(row.id)}')" ${self&&selected==='owner'?'title="O último Dono é protegido"':''}>Remover</button>`:'<span class="lx-v27-approved-pill">Aprovado</span>'}</article>`}).join('')||'<div class="lx-v27-empty"><strong>Nenhuma conta aprovada</strong></div>'}</div></section>`;
  }
  LX.v27SaveRole=async id=>{const select=$(`lxRole_${id}`);try{await LX.cloud.setAdminRole(id,true,select?.value||'editor');toast('Cargo salvo e sincronizado.');delete $('adminMain').dataset.lxV27Team;LX.admin.render('admins')}catch(error){console.warn(error);toast(error.message==='OWNER_REQUIRED'?'Somente o Dono pode alterar cargos.':'Não foi possível salvar o cargo.')}};
  LX.v27RemoveRole=async id=>{if(!confirm('Remover o acesso desta conta ao painel ADM?'))return;try{await LX.cloud.setAdminRole(id,false,'administrator');toast('Acesso ADM removido.');delete $('adminMain').dataset.lxV27Team;LX.admin.render('admins')}catch(error){console.warn(error);toast(/last owner/i.test(error.message||'')?'O último Dono não pode ser removido.':'Não foi possível remover o cargo.')}};

  function appendSpotifySettings(){
    const main=$('adminMain');if(!main||state().adminPage!=='settings'||role()!=='owner'||$('lxV27SpotifySettings'))return;
    const card=document.createElement('section');card.id='lxV27SpotifySettings';card.className='admin-card lx-v27-spotify-settings';card.innerHTML=`<header><div><span>INTEGRAÇÃO OFICIAL</span><h2>Spotify Web API</h2><p>Use credenciais do Spotify for Developers. Os segredos ficam no Supabase e nunca entram no site público.</p></div><span id="lxSpotifyStatus">Não testado</span></header><div class="form-grid"><label class="field">Client ID<input id="lxSpotifyClientId" autocomplete="off" placeholder="Client ID"></label><label class="field">Client Secret<input id="lxSpotifyClientSecret" type="password" autocomplete="new-password" placeholder="Client Secret"></label><div class="span2"><button id="lxSpotifySave" class="primary-btn" type="button">Salvar e testar</button></div></div>`;main.appendChild(card);
    $('lxSpotifySave').onclick=async()=>{const button=$('lxSpotifySave'),id=$('lxSpotifyClientId').value.trim(),secret=$('lxSpotifyClientSecret').value.trim();if(!id||!secret)return toast('Preencha Client ID e Client Secret.');button.disabled=true;button.textContent='Salvando…';try{const client=db();for(const [key,value] of [['spotify_client_id',id],['spotify_client_secret',secret]]){const {error}=await client.rpc('lx_admin_set_integration_secret',{p_key:key,p_value:value});if(error)throw error}$('lxSpotifyClientSecret').value='';$('lxSpotifyStatus').textContent='Testando…';await spotifyInvoke({action:'search',q:'Brasil',limit:1});$('lxSpotifyStatus').textContent='Conectado';toast('Spotify conectado com segurança.')}catch(error){console.warn(error);$('lxSpotifyStatus').textContent='Verifique as credenciais';toast('Não foi possível validar o Spotify.')}finally{button.disabled=false;button.textContent='Salvar e testar'}};
  }

  function enhanceAdmin(){applyAdminPermissions();renderAdminTeam()}

  /* ---------- Integração com a aplicação existente ---------- */
  function wire(){
    syncBranding();hideInstallUI();if(!standalone()&&/iphone|ipad|ipod/i.test(navigator.userAgent))setTimeout(()=>showInstallInvite(true),2200);
    setTimeout(()=>{const splash=$('splash');if(!splash||splash.classList.contains('hidden')||state().screen!=='splash')return;splash.classList.add('lx-splash-exit');setTimeout(()=>{if(!splash.classList.contains('hidden'))$('enterSplash')?.click()},340)},2600);
    const el=audio();if(el){el.addEventListener('loadedmetadata',restoreScopedPosition);el.addEventListener('timeupdate',()=>{if(Math.floor(el.currentTime||0)%5===0)saveScopedPosition();updateNowPlayingProgress()});el.addEventListener('pause',()=>{saveScopedPosition();updateNowPlayingProgress()});el.addEventListener('play',setMusicKind);el.addEventListener('durationchange',setMusicKind)}
    $('musicQueueBtn')?.addEventListener('click',event=>{event.stopImmediatePropagation();openQueueV27()});
    $('musicCoverBtn')?.addEventListener('click',event=>{event.stopImmediatePropagation();openNowPlaying()});
    document.querySelector('#musicDock .music-info')?.addEventListener('click',openNowPlaying);
    const originalOpen=LX.chat?.open;if(originalOpen)LX.chat.open=async(...args)=>{const result=await originalOpen(...args);refreshConversationStreak();return result};
    subscribeStreak();applyAdminPermissions();renderAdminTeam();
    $('adminNav')?.addEventListener('click',event=>{const button=event.target.closest('[data-admin]');if(button&&!canPage(button.dataset.admin)){event.preventDefault();event.stopImmediatePropagation();toast('Esse cargo não possui acesso a esta área.')}},true);
    setMusicKind();
  }
  let lastUser='';
  function heartbeat(){
    const current=uid();if(lastUser&&current!==lastUser){audio()?.pause();if(audio())audio().currentTime=0;state().musicQueue=[];state().musicIndex=0;$('musicDock')?.classList.add('hidden');closeNowPlaying()}lastUser=current;if(current)subscribeStreak();setMusicKind();applyAdminPermissions();renderAdminTeam();syncBranding();$('lxStreakIndicator')?.remove();$('lxStreakWelcome')?.remove();
  }
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;syncBranding(node);if(node.id==='lxGlobalCinema')setTimeout(()=>enhancePlayer(node),0);if(node.querySelector?.('#lxGlobalCinema'))enhancePlayer(node.querySelector('#lxGlobalCinema'));if(node.matches?.('.lx-chat-head,.lx-chat-msg')||node.querySelector?.('.lx-chat-head,.lx-chat-msg'))refreshConversationStreak()}enhanceAdmin()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
  setInterval(heartbeat,1200);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){heartbeat();refreshConversationStreak()}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!ensureNowPlaying().classList.contains('hidden'))closeNowPlaying()});
  window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES.v27='31.2';
})();


/* ===== lxplus-v29.js ===== */
/* LX Plus v30.0 — conservative client-side stability layer */
(()=>{
  'use strict';
  const LX=window.LX=window.LX||{};
  window.__LX_MODULES=window.__LX_MODULES||{};
  window.__LX_MODULES.v29='31.2';
  LX.v29={version:'31.2',stability:true};

  function tuneImages(root=document){
    const imgs=root.querySelectorAll?.('.home-content img,.rail img,.lx-music-main img,.lx-community-drawer img,.panel-page img')||[];
    for(const img of imgs){
      if(!img.hasAttribute('loading'))img.loading='lazy';
      if(!img.hasAttribute('decoding'))img.decoding='async';
      img.draggable=false;
    }
  }
  function cleanTransientEmptySurfaces(root=document){
    for(const el of root.querySelectorAll?.('.lx-music-carousel')||[]){
      const hasCard=!!el.querySelector('.lx-music-feature');
      el.classList.toggle('lx-v29-empty',!hasCard);
    }
  }
  function hydrate(root=document){tuneImages(root);cleanTransientEmptySurfaces(root)}
  const start=()=>{
    hydrate(document);
    const target=document.getElementById('app')||document.body;
    if(!target||!window.MutationObserver)return;
    let queued=false;
    const obs=new MutationObserver(()=>{
      if(queued)return;queued=true;
      requestAnimationFrame(()=>{queued=false;hydrate(target)});
    });
    obs.observe(target,{subtree:true,childList:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* ===== universal-importer-v31.js · LX Plus v31.2 ===== */
(()=>{
  'use strict';
  const LX=window.LX=window.LX||{},old=LX.importer||{},D=()=>LX.data,U=()=>LX.ui;
  const esc=s=>U()?.esc?U().esc(String(s??'')):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const toast=t=>LX.toast?.(t),id=()=>Date.now()*1000+Math.floor(Math.random()*999),now=()=>new Date().toISOString();
  const state={source:'movie',results:[],queue:[],rawRows:[],busy:false};
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const hub=async(action,payload={})=>{const c=LX.cloud?.db?.();if(!c)throw new Error('Nuvem indisponível. Entre novamente na LX Plus.');const {data,error}=await c.functions.invoke('lx-content-hub',{body:{action,...payload}});if(error){let msg=error.message||'Falha na automação.';try{const p=await error.context?.json?.();msg=p?.message||p?.error||msg}catch{}throw new Error(msg)}if(data?.error)throw new Error(data.message||data.error);return data||{}};
  const universalHub=async(action,payload={})=>{const c=LX.cloud?.db?.();if(!c)throw new Error('Nuvem indisponível. Entre novamente na LX Plus.');const {data,error}=await c.functions.invoke('lx-universal-importer',{body:{action,...payload}});if(error){let msg=error.message||'Falha na automação.';try{const p=await error.context?.json?.();msg=p?.message||p?.error||msg}catch{}throw new Error(msg)}if(data?.error)throw new Error(data.message||data.error);return data||{}};
  const saveSecret=async(key,value)=>{const c=LX.cloud?.db?.();if(!c)throw new Error('Nuvem indisponível');const {error}=await c.rpc('lx_admin_set_integration_secret',{p_key:key,p_value:String(value||'').trim()});if(error)throw error;return true};

  function metadataToCatalog(x,published=false){
    const stamp=now();
    if(['movie','tv'].includes(x.source)){
      const type=x.source==='movie'?'Filme':'Série',genres=x.genres||String(x.genre||'').split(' · ').filter(Boolean);
      return {id:id(),type,title:x.title||'Sem título',desc:x.desc||'Sinopse não informada.',year:+x.year||new Date().getFullYear(),genre:x.genre||genres.join(' · ')||'Sem gênero',genres,cover:x.cover||'',banner:x.banner||x.cover||'',rating:x.rating?String(Math.round(Number(x.rating)*10)/10):'',duration:x.duration?String(x.duration):'',cast:x.cast||[],director:type==='Filme'?(x.creator||''):'',creator:type==='Série'?(x.creator||''):'',episodes:[],seasonsMeta:x.seasonsMeta||x.seasons||[],tmdbId:Number(x.remoteId)||x.remoteId,remoteId:x.remoteId,metadataProvider:'TMDB',metadataUrl:`https://www.themoviedb.org/${x.source==='movie'?'movie':'tv'}/${x.remoteId}`,published:!!published,featured:false,trending:false,newRelease:false,priority:0,createdAt:stamp,importedAt:stamp};
    }
    if(x.source==='book')return {id:id(),type:'Livro',title:x.title||'Sem título',desc:x.desc||'Livro importado automaticamente.',year:+x.year||'',genre:x.genre||'Livro',author:x.author||'',cover:x.cover||'',banner:x.cover||'',isbn:x.isbn||'',externalReadUrl:x.externalUrl||'',remoteId:x.remoteId||'',metadataProvider:'Open Library',metadataUrl:x.externalUrl||'',published:!!published,featured:false,priority:0,createdAt:stamp,importedAt:stamp,chapters:[]};
    return {id:id(),type:'Música',title:x.title||'Sem título',desc:x.desc||'',year:+x.year||'',genre:x.genre||'Música',artist:x.artist||'',album:x.album||'',cover:x.cover||'',banner:x.cover||'',duration:Number(x.duration||0),previewUrl:x.previewUrl||'',externalMusicUrl:x.externalUrl||'',remoteId:x.remoteId||'',metadataProvider:x.provider||'Apple Music / iTunes',metadataUrl:x.externalUrl||'',published:!!published,featured:false,trending:false,newRelease:false,priority:0,createdAt:stamp,importedAt:stamp,tracks:[]};
  }
  async function toCatalog(x){
    if(['movie','tv'].includes(x.source)&&(!x.genres&&!x.seasonsMeta)){const d=await hub('tmdb_details',{type:x.source,id:x.remoteId});x={...x,...(d.item||{})}}
    return metadataToCatalog(x,false);
  }
  async function runSearch(){
    const q=document.getElementById('importSearch')?.value?.trim(),box=document.getElementById('importResults');if(!q)return toast('Digite algo para pesquisar.');if(!box)return;box.innerHTML='<div class="import-loading">Buscando metadados pela nuvem…</div>';
    try{let d;if(state.source==='movie'||state.source==='tv')d=await hub('tmdb_search',{type:state.source,q});else if(state.source==='book')d=await hub('books_search',{q});else d=await hub('music_search',{q});state.results=d.items||[];renderSearchResults()}catch(e){console.warn(e);box.innerHTML=`<div class="import-error"><strong>Não foi possível buscar.</strong><p>${esc(errorText(e))}</p></div>`}
  }
  function errorText(e){const s=String(e?.message||e||'');const map={TMDB_NOT_CONFIGURED:'Configure a TMDB API Key no painel de integrações.',GOOGLE_DRIVE_NOT_CONFIGURED:'Configure a Google Drive API Key no painel de integrações.',DRIVE_FOLDER_INVALID:'Cole o link de uma pasta compartilhada do Google Drive.',ADMIN_REQUIRED:'Seu cargo não possui acesso a esta automação.',AUTH_REQUIRED:'Sua sessão expirou. Entre novamente.'};return map[s]||s||'Verifique a conexão e tente novamente.'}
  function searchCard(x,i){const type=x.source==='movie'?'Filme':x.source==='tv'?'Série':x.source==='book'?'Livro':'Música';return `<article class="import-card"><div class="import-cover" style="background-image:url('${esc(x.cover||x.banner||'')}')"><span>${type}</span></div><div class="import-info"><small>${esc(x.provider||'Metadados')}${x.year?' · '+esc(x.year):''}</small><h3>${esc(x.title)}</h3><p>${esc(x.artist||x.author||x.genre||x.desc||'')}</p><div class="import-actions"><button class="primary-btn" data-v31-import="${i}">＋ Importar</button>${x.externalUrl?`<a href="${esc(x.externalUrl)}" target="_blank" rel="noopener">Fonte ↗</a>`:''}</div></div></article>`}
  function renderSearchResults(){const box=document.getElementById('importResults');if(!box)return;box.innerHTML=state.results.length?state.results.map(searchCard).join(''):'<div class="import-empty">Nenhum resultado encontrado.</div>';box.querySelectorAll('[data-v31-import]').forEach(b=>b.onclick=()=>importOne(state.results[+b.dataset.v31Import],b))}
  async function importOne(x,btn){const prev=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Importando…'}try{const item=await toCatalog(x);await D().saveCatalogItem(item);toast(`${item.title} importado como rascunho.`);if(btn)btn.textContent='✓ Importado'}catch(e){console.warn(e);toast(errorText(e));if(btn){btn.disabled=false;btn.textContent=prev}}}
  async function importPopular(){const btn=document.getElementById('importPopular');if(btn){btn.disabled=true;btn.textContent='Importando populares…'}try{const [movies,tv]=await Promise.all([hub('tmdb_trending',{type:'movie'}),hub('tmdb_trending',{type:'tv'})]),rows=[...(movies.items||[]).slice(0,6),...(tv.items||[]).slice(0,6)],existing=D().catalog(),fresh=rows.filter(x=>!existing.some(c=>String(c.tmdbId||'')===String(x.remoteId)));let count=0;for(const x of fresh){await D().saveCatalogItem(await toCatalog(x));count++}toast(`${count} títulos populares importados como rascunho.`);LX.admin?.render?.('library')}catch(e){toast(errorText(e))}finally{if(btn){btn.disabled=false;btn.textContent='⚡ Importar populares da semana'}}}

  function parseRows(text){
    text=String(text||'').trim();if(!text)return[];
    if(text.startsWith('[')){try{const arr=JSON.parse(text);if(Array.isArray(arr))return arr.map((x,i)=>({name:String(x.name||x.filename||x.title||`item-${i+1}`),url:String(x.url||x.link||x.mediaUrl||''),type:x.type||'auto',path:String(x.path||'')})).filter(x=>x.name)}catch{}}
    return text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((line,i)=>{let name='',url='',type='auto';const parts=line.split(/\s*[|\t]\s*/);if(parts.length>1){name=parts[0];url=parts[1]||'';type=parts[2]||'auto'}else if(/^https?:\/\//i.test(line)){url=line;try{name=decodeURIComponent(new URL(line).pathname.split('/').filter(Boolean).pop()||`item-${i+1}`)}catch{name=`item-${i+1}`}}else name=line;return {name:name||`item-${i+1}`,url,type,path:name}})
  }
  async function localRows(files){
    const supported=[...(files||[])].filter(f=>/\.(?:mp4|mkv|webm|mov|m4v|avi|ts|mp3|m4a|aac|flac|wav|ogg|opus|pdf|epub|mobi|azw3?|cb[rz])$/i.test(f.name||'')),rows=[];
    for(let i=0;i<supported.length;i++){
      const f=supported[i],audio=/\.(?:mp3|m4a|aac|flac|wav|ogg|opus)$/i.test(f.name||'');let localMeta=null,name=f.name;
      if(audio&&LX.musicMeta?.readId3){try{localMeta=await LX.musicMeta.readId3(f);const title=String(localMeta?.title||'').trim(),artist=String(localMeta?.artist||'').trim();if(title)name=`${artist?artist+' - ':''}${title}.mp3`;setBatchStatus(`Lendo tags das músicas: ${i+1}/${supported.length}`,i+1,supported.length)}catch(e){console.warn('LX mass audio tags',e)}}
      rows.push({name,path:f.webkitRelativePath||f.name,originalName:f.name,url:'',size:f.size,type:audio?'music':'auto',source:'local-file',file:f,localMeta});
    }
    return rows;
  }
  function driveId(url){return String(url||'').match(/\/file\/d\/([A-Za-z0-9_-]+)/)?.[1]||String(url||'').match(/[?&]id=([A-Za-z0-9_-]+)/)?.[1]||''}
  function mediaKey(url){if(!url)return'';try{if(/drive\.google\.com/i.test(url)&&driveId(url))return LX.mediaSources?.normalize?.('gdrive',url)||url;return LX.mediaSources?.normalize?.('direct',url)||url}catch{return url}}
  function duplicateKind(row){const c=D().catalog(),m=row.match||{},p=row.parsed||{},remote=String(m.remoteId||'');if(p.type==='tv'){const ex=c.find(x=>['Série','Anime','Dorama'].includes(x.type)&&((remote&&String(x.tmdbId||x.remoteId||'')===remote)||(norm(x.title)===norm(m.title)&&(!m.year||Number(x.year)===Number(m.year)))));return ex?{kind:'merge',item:ex}:null}if(p.type==='movie'){const ex=c.find(x=>x.type==='Filme'&&((remote&&String(x.tmdbId||x.remoteId||'')===remote)||(norm(x.title)===norm(m.title)&&(!m.year||Number(x.year)===Number(m.year)))));return ex?{kind:'duplicate',item:ex}:null}if(p.type==='music'){const ex=c.find(x=>x.type==='Música'&&norm(x.title)===norm(m.title)&&norm(x.artist)===norm(m.artist));return ex?{kind:'duplicate',item:ex}:null}const ex=c.find(x=>x.type==='Livro'&&((m.isbn&&String(x.isbn||'')===String(m.isbn))||(norm(x.title)===norm(m.title)&&norm(x.author)===norm(m.author))));return ex?{kind:'duplicate',item:ex}:null}
  async function analyzeRows(rows){
    rows=(rows||[]).filter(x=>x?.name).slice(0,1000);if(!rows.length)return toast('Nenhum arquivo reconhecido para analisar.');state.rawRows=rows;state.queue=[];setBatchStatus(`Analisando ${rows.length} arquivo${rows.length===1?'':'s'}…`,0,rows.length);
    try{
      for(let i=0;i<rows.length;i+=25){
        const sourceChunk=rows.slice(i,i+25),transport=sourceChunk.map(({file,localMeta,localMediaKey,...rest})=>rest),d=await universalHub('catalog_match_batch',{items:transport,type:'auto'}),returned=d.items||[];
        for(let j=0;j<sourceChunk.length;j++){
          const source=sourceChunk[j],remote=returned[j]||{name:source.name,parsed:{type:source.type==='music'?'music':'auto',title:source.name},match:null,status:'unmatched',confidence:0},x={...remote,...source,parsed:remote.parsed||source.parsed,match:remote.match||null};
          if(source.localMeta&&source.type==='music'){
            const fallback={title:source.localMeta.title||String(source.originalName||source.name).replace(/\.[^.]+$/,''),artist:source.localMeta.artist||'',album:source.localMeta.album||'',genre:source.localMeta.genre||'Música',year:source.localMeta.year||'',duration:Number(source.localMeta.duration||0),cover:source.localMeta.cover||'',provider:'ID3 / arquivo local'};
            x.match=LX.musicMeta?.merge?LX.musicMeta.merge(source.localMeta,x.match||{},fallback):{...(x.match||{}),...fallback,source:'music'};x.match.source='music';x.match.provider=x.match.provider||'ID3 + catálogo musical';
            if(!x.parsed||x.parsed.type==='auto')x.parsed={...(x.parsed||{}),type:'music',title:x.match.title,artist:x.match.artist};
            if(!remote.match){x.status='matched';x.confidence=.96}else{x.confidence=Math.max(Number(remote.confidence||0),.9);x.status=Number(remote.confidence||0)>=.62?'matched':'review'}
          }
          const dup=duplicateKind(x);x.finalStatus=dup?.kind||x.status;x.existing=dup?.item||null;x.selected=x.finalStatus==='matched'||x.finalStatus==='merge';state.queue.push(x)
        }
        renderQueue();setBatchStatus(`Metadados automáticos: ${Math.min(i+25,rows.length)}/${rows.length}`,Math.min(i+25,rows.length),rows.length)
      }
      toast('Análise concluída. MP3s tiveram tags/capas verificadas; revise apenas os itens em amarelo.')
    }catch(e){console.warn(e);toast(errorText(e));setBatchStatus(`Falha: ${errorText(e)}`,0,rows.length,'error')}
  }
  async function scanDrive(){const folder=document.getElementById('universalDriveFolder')?.value?.trim();if(!folder)return toast('Cole o link da pasta do Google Drive.');const btn=document.getElementById('universalDriveScan');if(btn){btn.disabled=true;btn.textContent='Escaneando…'}try{const d=await universalHub('drive_scan',{folder,maxItems:1000});toast(`${d.found||0} arquivos de mídia encontrados no Drive.`);await analyzeRows(d.items||[])}catch(e){toast(errorText(e))}finally{if(btn){btn.disabled=false;btn.textContent='Escanear Drive + identificar'}}}
  async function analyzeText(){const rows=parseRows(document.getElementById('universalPaste')?.value||'');await analyzeRows(rows)}
  async function loadListFile(){const f=document.getElementById('universalListFile')?.files?.[0];if(!f)return;try{const text=await f.text();const area=document.getElementById('universalPaste');if(area)area.value=text;toast(`${f.name} carregado. Agora clique em Analisar lista em massa.`)}catch(e){console.warn(e);toast('Não foi possível ler esse arquivo.')}}
  function downloadTemplate(){const csv='nome|link\nInterestelar.2014.1080p.mkv|https://drive.google.com/file/d/SEU_ID/view\nThe Last of Us S02E03.mkv|https://drive.google.com/file/d/SEU_ID/view\n';const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='LX-Plus-importacao-em-massa-modelo.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);}
  async function analyzeLocal(){const files=document.getElementById('universalFolderInput')?.files||[];if(!files.length)return toast('Escolha uma pasta com arquivos.');setBatchStatus('Lendo arquivos e tags de áudio…',0,files.length);await analyzeRows(await localRows(files))}
  function setBatchStatus(text,done=0,total=0,kind=''){const box=document.getElementById('universalBatchStatus');if(!box)return;const pct=total?Math.round(done/total*100):0;box.className=`universal-batch-status ${kind}`;box.innerHTML=`<div><b>${esc(text)}</b><span>${total?`${done}/${total}`:''}</span></div><i><u style="width:${pct}%"></u></i>`}
  const statusLabel=s=>({matched:'Identificado',review:'Revisar',unmatched:'Não encontrado',duplicate:'Duplicado',merge:'Atualizar série'}[s]||s);
  function queueCard(x,i){const m=x.match||{},s=x.finalStatus||x.status,can=['matched','review','merge'].includes(s);return `<article class="universal-row ${esc(s)}"><label class="universal-select"><input type="checkbox" data-queue-select="${i}" ${x.selected&&can?'checked':''} ${can?'':'disabled'}><span></span></label><div class="universal-thumb" style="background-image:url('${esc(m.cover||x.thumbnail||'')}')"></div><div class="universal-row-main"><div class="universal-row-head"><b>${esc(m.title||x.parsed?.title||x.name)}</b><span class="status ${esc(s)}">${statusLabel(s)}${x.confidence?` · ${Math.round(x.confidence*100)}%`:''}</span></div><small>${esc(x.name)}${x.parsed?.season?` · T${x.parsed.season}E${x.parsed.episode}`:''}</small><p>${esc(m.artist||m.author||m.genre||m.desc||'')}</p></div></article>`}
  function renderQueue(){const box=document.getElementById('universalQueue');if(!box)return;const counts={matched:0,review:0,unmatched:0,duplicate:0,merge:0};state.queue.forEach(x=>counts[x.finalStatus]=(counts[x.finalStatus]||0)+1);document.getElementById('universalSummary').innerHTML=`<span class="ok">✓ ${counts.matched||0} identificados</span><span>↻ ${counts.merge||0} séries para atualizar</span><span class="warn">! ${counts.review||0} revisar</span><span>⊘ ${counts.unmatched||0} sem resultado</span><span>♻ ${counts.duplicate||0} duplicados</span>`;box.innerHTML=state.queue.length?state.queue.slice(0,250).map(queueCard).join(''):'<div class="import-empty">Ainda não há arquivos analisados.</div>';box.querySelectorAll('[data-queue-select]').forEach(el=>el.onchange=()=>{state.queue[+el.dataset.queueSelect].selected=el.checked});const more=document.getElementById('universalMore');if(more)more.textContent=state.queue.length>250?`Mostrando 250 de ${state.queue.length}. Todos os selecionados serão processados.`:''}
  function createFromMatch(row,published){const x=metadataToCatalog(row.match,published),key=row.localMediaKey||mediaKey(row.url);if(row.parsed.type==='movie'&&key){x.mediaKey=key;x.qualityMode=String(key).startsWith('gdrive:')?'drive-auto':'external';x.sourceProvider=String(key).startsWith('gdrive:')?'gdrive':'direct'}else if(row.parsed.type==='music'&&key){x.mediaKey=key;x.externalMusicUrl=x.externalMusicUrl||row.url||'';x.tracks=[{number:1,title:x.title,artist:x.artist,duration:Number(x.duration||row.localMeta?.duration||0),cover:x.cover||row.localMeta?.cover||'',mediaKey:key,qualityMode:row.localMediaKey?'lx-auto':'external',fileName:row.file?.name||'',mimeType:row.file?.type||'',size:Number(row.file?.size||0)}]}else if(row.parsed.type==='book'&&row.url){x.externalReadUrl=row.url;x.mediaKey=key||row.url}return x}
  function buildPublishItems(published){
    const selected=state.queue.filter(x=>x.selected&&x.match&&['matched','review','merge'].includes(x.finalStatus)),out=[],series=new Map();
    for(const row of selected){if(row.parsed.type!=='tv'){out.push(createFromMatch(row,published));continue}const remote=String(row.match.remoteId),k=remote||`${norm(row.match.title)}:${row.match.year||''}`;let group=series.get(k);if(!group){const base=row.existing?(window.structuredClone?structuredClone(row.existing):JSON.parse(JSON.stringify(row.existing))):metadataToCatalog(row.match,published);base.type=base.type||'Série';base.published=published||!!base.published;base.episodes=[...(base.episodes||[])];group=base;series.set(k,group)}const key=mediaKey(row.url);if(key&&row.parsed.episode){const season=Math.max(1,Number(row.parsed.season)||1),number=Math.max(1,Number(row.parsed.episode)||1),existing=group.episodes.findIndex(e=>(+e.season||1)===season&&(+e.number||0)===number),ep={...(existing>=0?group.episodes[existing]:{}),season,number,title:`Episódio ${number}`,mediaKey:key,qualityMode:String(key).startsWith('gdrive:')?'drive-auto':'external',sourceProvider:String(key).startsWith('gdrive:')?'gdrive':'direct'};if(existing>=0)group.episodes[existing]=ep;else group.episodes.push(ep)}}
    for(const x of series.values()){x.episodes.sort((a,b)=>(+a.season||1)-(+b.season||1)||(+a.number||0)-(+b.number||0));out.push(x)}return out;
  }
  async function publishBatch(){const btn=document.getElementById('universalPublish'),published=!!document.getElementById('universalPublishNow')?.checked,chosen=state.queue.filter(x=>x.selected&&x.match&&['matched','review','merge'].includes(x.finalStatus));if(!chosen.length)return toast('Selecione pelo menos um item identificado.');const prev=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Preparando mídias…'}try{
      const localMusic=chosen.filter(x=>x.parsed?.type==='music'&&x.file&&!x.localMediaKey);let uploaded=0;
      for(const row of localMusic){if(btn)btn.textContent=`Enviando MP3 ${uploaded+1}/${localMusic.length}…`;setBatchStatus(`Enviando áudios locais: ${uploaded+1}/${localMusic.length}`,uploaded,localMusic.length);const key=await LX.store.putMedia(`bulk_music_${Date.now()}_${row.file.name}`,row.file);row.localMediaKey=key;LX.primeMusicMedia?.(key,row.file);uploaded++}
      const items=buildPublishItems(published);if(!items.length)return toast('Nenhum item pronto para publicar.');if(btn)btn.textContent='Publicando catálogo…';let saved=0;for(let i=0;i<items.length;i+=400){const part=items.slice(i,i+400);if(LX.cloud?.bulkUpsertCatalogItems)saved+=await LX.cloud.bulkUpsertCatalogItems(part);else{for(const x of part){await D().saveCatalogItem(x);saved++}}}toast(`${saved} título${saved===1?'':'s'} salvo${saved===1?'':'s'} no catálogo.`);setBatchStatus(`Concluído: ${saved} títulos salvos${uploaded?` · ${uploaded} áudios enviados`:''}`,saved,saved,'ok');LX.ui?.renderApp?.()
    }catch(e){console.warn(e);toast(`Falha ao publicar: ${errorText(e)}`)}finally{if(btn){btn.disabled=false;btn.textContent=prev||'Publicar selecionados'}}}
  function selectAll(kind=true){state.queue.forEach(x=>{if(['matched','merge'].includes(x.finalStatus)||(!kind&&x.finalStatus==='review'))x.selected=kind});renderQueue()}

  function integrations(){return `<section class="admin-card"><h2>Integrações da automação</h2><label class="field">TMDB API Key v3<input id="tmdbKeyV31" type="password" autocomplete="new-password" placeholder="Chave para filmes, séries, capas e sinopses"></label><label class="field">Google Drive API Key<input id="driveApiKeyV31" type="password" autocomplete="new-password" placeholder="Usada somente no backend para escanear pastas compartilhadas"></label><label class="field">YouTube Data API Key<input id="youtubeApiKey" type="password" autocomplete="new-password" placeholder="Para importação em massa de músicas"></label><label class="field">TheSportsDB Key <span class="optional">opcional</span><input id="sportsKey" type="password" autocomplete="new-password" placeholder="Vazio = plano gratuito"></label><div class="import-key-actions"><button id="saveTmdbV31">Salvar TMDB</button><button id="saveDriveV31">Salvar Drive</button><button id="saveYoutube">Salvar YouTube</button><button id="saveSports">Salvar esportes</button><button id="importPopular" class="primary-btn">⚡ Importar populares da semana</button></div><div id="integrationStatus" class="import-key-status">Verificando integrações…</div><small style="color:var(--muted)">As chaves ficam no Supabase e não são incluídas no JavaScript público. Para escanear Drive por API Key, a pasta precisa estar compartilhada para acesso por link.</small></section>`}
  function render(m){
    m.innerHTML=`<div class="admin-head"><div><span class="eyebrow">LX ADMIN · v31.2</span><h1>IMPORTAÇÃO EM MASSA</h1><p>Coloque centenas de filmes, séries, episódios, músicas e livros de uma vez. O LX Plus identifica o arquivo, encontra a capa e os metadados, remove duplicados e permite revisar antes de publicar.</p></div></div>
    <section class="import-hero universal-hero"><div><span class="eyebrow">UNIVERSAL AUTO CATALOG</span><h2>Arquivo → título → capa → catálogo.</h2><p>O trabalho repetitivo fica automatizado. Correspondências seguras são selecionadas sozinhas; dúvidas ficam separadas para revisão.</p></div><div class="import-badges"><span>🎬 TMDB</span><span>☁ Google Drive</span><span>📚 Open Library</span><span>♫ Music</span></div></section>
    <section class="admin-card universal-import-card"><div class="universal-title"><div><span class="eyebrow">LOTE AUTOMÁTICO</span><h2>1. Escolha de onde vêm os arquivos</h2></div><span class="universal-limit">até 1.000 por leitura</span></div><div class="universal-source-grid"><div class="universal-source"><h3>Google Drive</h3><p>Escaneia uma pasta compartilhada e subpastas. Os links dos arquivos já entram nos players.</p><input id="universalDriveFolder" placeholder="https://drive.google.com/drive/folders/..."><button id="universalDriveScan" class="primary-btn">Escanear Drive + identificar</button></div><div class="universal-source"><h3>Pasta deste computador</h3><p>Para MP3/áudio, lê tags ID3, faixa, artista, álbum, duração e capa e envia os áudios selecionados ao publicar. Vídeos locais continuam apenas como nomes até receberem um link/arquivo hospedado.</p><label class="universal-file-button">Escolher pasta<input id="universalFolderInput" type="file" webkitdirectory directory multiple hidden></label><button id="universalLocalAnalyze">Analisar MP3s e nomes</button></div><div class="universal-source"><h3>Lista / CSV / JSON</h3><p>Cole muitos itens ou envie um arquivo <b>.csv, .txt ou .json</b>. Formato rápido: <code>nome do arquivo | link</code>.</p><textarea id="universalPaste" rows="5" placeholder="Interestelar.2014.1080p.mkv | https://drive.google.com/file/d/.../view&#10;The Last of Us S02E03.mkv | https://drive.google.com/file/d/.../view"></textarea><div class="universal-file-row"><label class="universal-file-button compact">Carregar CSV/TXT/JSON<input id="universalListFile" type="file" accept=".csv,.txt,.json,text/csv,text/plain,application/json" hidden></label><button id="universalTemplate" type="button">Baixar modelo CSV</button></div><button id="universalTextAnalyze" class="primary-btn">Analisar lista em massa</button></div></div><div id="universalBatchStatus" class="universal-batch-status"><div><b>Pronto para analisar.</b><span></span></div><i><u style="width:0%"></u></i></div></section>
    <section class="admin-card universal-review-card"><div class="universal-review-head"><div><span class="eyebrow">REVISÃO INTELIGENTE</span><h2>2. Confirme antes de publicar</h2></div><div class="universal-review-actions"><button id="universalSelectMatched">Selecionar seguros</button><label><input id="universalPublishNow" type="checkbox" checked> Publicar imediatamente</label><button id="universalPublish" class="primary-btn">Publicar selecionados</button></div></div><div id="universalSummary" class="universal-summary"><span>Sem análise ainda.</span></div><div id="universalQueue" class="universal-queue"><div class="import-empty">Ainda não há arquivos analisados.</div></div><small id="universalMore" class="universal-more"></small></section>
    <section class="admin-card youtube-bulk-card"><div class="youtube-bulk-head"><div><span class="eyebrow">YOUTUBE · IMPORTAÇÃO EM MASSA</span><h2>Adicionar muitas músicas de uma vez</h2><p>Playlist, canal ou vários links. O sistema remove repetidas e busca capa + metadados automaticamente.</p></div><span>AUTO DEDUP</span></div><div class="youtube-bulk-grid"><label class="field youtube-bulk-source"><span>Playlist, canal ou links</span><textarea id="youtubeBulkSource" rows="4" placeholder="https://www.youtube.com/playlist?list=...&#10;ou https://www.youtube.com/@canal"></textarea></label><label class="field youtube-bulk-category"><span>Categoria</span><select id="youtubeBulkCategory"><option value="Gospel">Gospel</option><option value="Outra">Outra</option></select></label></div><div class="youtube-bulk-actions"><button id="youtubeBulkSave" class="primary-btn">Salvar músicas novas</button></div><div id="youtubeBulkStatus" class="youtube-bulk-status"><b>Pronto para importar.</b><span>Até 500 vídeos por importação.</span></div></section>
    <div class="admin-grid"><section class="admin-card"><h2>Busca manual rápida</h2><div class="import-source-tabs"><button data-source-v31="movie">Filmes</button><button data-source-v31="tv">Séries</button><button data-source-v31="book">Livros</button><button data-source-v31="music">Músicas</button></div><div class="import-search-row"><input id="importSearch" placeholder="Pesquise um título, livro ou artista…"><button id="importGo" class="primary-btn">Buscar</button></div></section>${integrations()}</div>
    <div class="import-notice"><b>Importação segura:</b> capas e metadados vêm de catálogos externos; a LX Plus não baixa filmes ou músicas de terceiros. Use somente mídia que você possui ou tem autorização para disponibilizar.</div><section id="importResults" class="import-results"><div class="import-empty">A busca manual aparece aqui.</div></section>`;
    document.querySelectorAll('[data-source-v31]').forEach(b=>{b.classList.toggle('active',b.dataset.sourceV31===state.source);b.onclick=()=>{state.source=b.dataset.sourceV31;document.querySelectorAll('[data-source-v31]').forEach(x=>x.classList.toggle('active',x===b))}});
    document.getElementById('importGo').onclick=runSearch;document.getElementById('importSearch').onkeydown=e=>e.key==='Enter'&&runSearch();document.getElementById('importPopular').onclick=importPopular;
    document.getElementById('universalDriveScan').onclick=scanDrive;document.getElementById('universalTextAnalyze').onclick=analyzeText;document.getElementById('universalLocalAnalyze').onclick=analyzeLocal;document.getElementById('universalListFile').onchange=loadListFile;document.getElementById('universalTemplate').onclick=downloadTemplate;document.getElementById('universalSelectMatched').onclick=()=>{state.queue.forEach(x=>x.selected=['matched','merge'].includes(x.finalStatus));renderQueue()};document.getElementById('universalPublish').onclick=publishBatch;
    document.getElementById('saveTmdbV31').onclick=async()=>{const v=document.getElementById('tmdbKeyV31').value.trim();try{await saveSecret('tmdb_v3',v);document.getElementById('tmdbKeyV31').value='';toast(v?'TMDB conectado.':'TMDB removido.');refreshIntegrationStatus()}catch(e){toast(/owner required/i.test(e.message||'')?'Somente o Dono pode alterar integrações.':errorText(e))}};
    document.getElementById('saveDriveV31').onclick=async()=>{const v=document.getElementById('driveApiKeyV31').value.trim();if(!v)return toast('Cole a Google Drive API Key.');try{await saveSecret('google_drive_api_key',v);document.getElementById('driveApiKeyV31').value='';toast('Google Drive conectado ao importador.');refreshIntegrationStatus()}catch(e){toast(/owner required/i.test(e.message||'')?'Somente o Dono pode alterar integrações.':errorText(e))}};
    document.getElementById('saveYoutube').onclick=async()=>{const v=document.getElementById('youtubeApiKey').value.trim();if(!v)return toast('Cole a YouTube Data API Key.');try{await saveSecret('youtube_api_key',v);document.getElementById('youtubeApiKey').value='';toast('YouTube conectado.');refreshIntegrationStatus()}catch(e){toast(errorText(e))}};
    document.getElementById('saveSports').onclick=async()=>{const v=document.getElementById('sportsKey').value.trim();try{await saveSecret('thesportsdb_key',v);document.getElementById('sportsKey').value='';toast(v?'Esportes conectado.':'Plano gratuito de esportes ativado.');refreshIntegrationStatus()}catch(e){toast(errorText(e))}};
    document.getElementById('youtubeBulkSave').onclick=()=>old.importYoutubeBulk?.();
    async function refreshIntegrationStatus(){const el=document.getElementById('integrationStatus');if(!el)return;try{const c=LX.cloud?.db?.(),{data,error}=await c.rpc('lx_integration_status');if(error)throw error;const keys=new Set((data||[]).map(x=>x.key));el.innerHTML=`<span class="${keys.has('tmdb_v3')?'ok':'warn'}">TMDB ${keys.has('tmdb_v3')?'✓':'!'}</span><span class="${keys.has('google_drive_api_key')?'ok':'warn'}">Drive ${keys.has('google_drive_api_key')?'✓':'!'}</span><span class="${keys.has('youtube_api_key')?'ok':'warn'}">YouTube ${keys.has('youtube_api_key')?'✓':'!'}</span><span>Esportes ${keys.has('thesportsdb_key')?'✓':'Free'}</span>`}catch{el.textContent='Não foi possível verificar as integrações.'}}
    refreshIntegrationStatus();renderQueue();
  }
  LX.importer={...old,render,search:runSearch,importPopular,toCatalog,scanDrive,analyzeRows,publishBatch};
  window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['universal-importer']='31.2';
})();


/* ===== mass-import-launch-v31.2.js ===== */
(()=>{
  'use strict';
  const LX=window.LX=window.LX||{};
  const addLaunch=()=>{
    const main=document.getElementById('adminMain');
    if(!main||LX.ui?.state?.adminPage!=='dashboard'||main.querySelector('.lx-mass-launch'))return;
    const card=document.createElement('section');
    card.className='lx-mass-launch';
    card.innerHTML=`<div class="lx-mass-launch-copy"><span class="eyebrow">NOVO · v31.2</span><h2>⚡ IMPORTAÇÃO EM MASSA</h2><p>Adicione centenas de filmes, séries, episódios, músicas e livros. O LX Plus identifica título, ano e episódio, busca capa/metadados e elimina duplicados antes de publicar.</p><div class="lx-mass-launch-tags"><span>☁ Pasta do Drive</span><span>📄 CSV/JSON</span><span>📁 Pasta local</span><span>🎬 Capas automáticas</span></div></div><div class="lx-mass-launch-actions"><button class="primary-btn" type="button">ABRIR IMPORTAÇÃO EM MASSA</button><small>Ideal para cadastrar o catálogo inteiro sem item por item.</small></div>`;
    card.querySelector('button').onclick=()=>LX.admin?.render?.('importer');
    const head=main.querySelector('.admin-head');
    if(head)head.insertAdjacentElement('afterend',card);else main.prepend(card);
  };
  const original=LX.admin?.render;
  if(original&&!original.__lxMassWrapped){
    const wrapped=function(page,...args){const r=original.call(this,page,...args);queueMicrotask(addLaunch);return r};
    wrapped.__lxMassWrapped=true;LX.admin.render=wrapped;
  }
  const obs=new MutationObserver(()=>addLaunch());
  const target=document.getElementById('adminMain');if(target)obs.observe(target,{childList:true,subtree:false});
  window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['mass-import-launch']='31.2';
})();

/* ===== music-smart-metadata-v31.2.js ===== */
(()=>{
 'use strict';
 const LX=window.LX=window.LX||{};
 const clean=v=>String(v??'').replace(/\0/g,'').trim();
 const stem=name=>clean(name).replace(/\.[a-z0-9]{2,6}$/i,'').replace(/[._]+/g,' ').replace(/\s+/g,' ').trim();
 const youtubeId=value=>{const raw=clean(value);if(/^youtube:[A-Za-z0-9_-]{11}$/i.test(raw))return raw.slice(8);if(/^[A-Za-z0-9_-]{11}$/.test(raw))return raw;try{const u=new URL(raw),h=u.hostname.toLowerCase().replace(/^www\./,'');if(h==='youtu.be')return (u.pathname.split('/').filter(Boolean)[0]||'').slice(0,11);if(!/(^|\.)(youtube\.com|youtube-nocookie\.com)$/.test(h))return'';const q=u.searchParams.get('v');if(q&&/^[A-Za-z0-9_-]{11}$/.test(q))return q;return u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/i)?.[1]||''}catch{return''}};
 const normalizeArtist=v=>clean(v).replace(/\s+-\s+Topic$/i,'').replace(/\s+VEVO$/i,'').replace(/\s+(?:canal\s+)?(?:oficial|official)(?:\s+music)?$/i,'').replace(/\s+Official\s+Artist\s+Channel$/i,'').replace(/\s{2,}/g,' ').trim();
 const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
 const similarity=(a,b)=>{a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return .9;const A=new Set(a.split(' ').filter(x=>x.length>1)),B=new Set(b.split(' ').filter(x=>x.length>1));let n=0;A.forEach(x=>B.has(x)&&n++);return Math.min(.88,.3+(n/Math.max(A.size,B.size,1))*.58)};
 const partsFromTitle=(title,author='')=>{let t=clean(title).replace(/\s*[\[(][^\])]*(?:official\s*(?:music\s*)?(?:video|audio)|music\s*video|lyrics?|lyric\s*video|clipe\s*oficial|visualizer|video\s*oficial)[^\])]*[\])]/gi,'').replace(/\s+(?:official\s*(?:video|audio)|clipe\s*oficial|video\s*oficial|lyrics?|visualizer)\s*$/gi,'').replace(/\s{2,}/g,' ').trim(),a=normalizeArtist(author);const m=t.match(/^(.{1,100}?)\s+[\-–—]\s+(.{1,180})$/);if(m){a=normalizeArtist(m[1])||a;t=clean(m[2])||t}return {title:t||'Música',artist:a||'LX Music'}};
 const verifiedRemote=(source,remote)=>{if(!remote)return false;const ts=similarity(source?.title,remote?.title),as=source?.artist&&source.artist!=='LX Music'?similarity(source.artist,remote?.artist):.75;return ts>=.88&&as>=.72&&Number(remote?.confidence||0)>=.88};
 const syncsafe=(a,b,c,d)=>(a<<21)|(b<<14)|(c<<7)|d;
 const u32=(a,b,c,d)=>((a<<24)>>>0)+(b<<16)+(c<<8)+d;
 function decoder(enc,bytes){try{if(enc===3)return new TextDecoder('utf-8').decode(bytes);if(enc===1)return new TextDecoder('utf-16').decode(bytes);if(enc===2)return new TextDecoder('utf-16be').decode(bytes);return new TextDecoder('windows-1252').decode(bytes)}catch{return Array.from(bytes).map(x=>String.fromCharCode(x)).join('')}}
 const dataUrl=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=reject;r.readAsDataURL(blob)});
 async function readId3(file){const out={title:'',artist:'',album:'',year:'',genre:'',cover:'',duration:0};if(!file||!/\.(?:mp3|m4a|aac|flac|wav|ogg|opus)$/i.test(file.name||''))return out;
  if(/\.mp3$/i.test(file.name||'')){try{const head=new Uint8Array(await file.slice(0,10).arrayBuffer());if(String.fromCharCode(...head.slice(0,3))==='ID3'){const ver=head[3],tagSize=syncsafe(head[6],head[7],head[8],head[9]),max=Math.min(file.size,10+tagSize,5*1024*1024),buf=new Uint8Array(await file.slice(0,max).arrayBuffer());let pos=10;while(pos+10<=buf.length){const fid=String.fromCharCode(...buf.slice(pos,pos+4));if(!/^[A-Z0-9]{4}$/.test(fid))break;const size=ver===4?syncsafe(buf[pos+4],buf[pos+5],buf[pos+6],buf[pos+7]):u32(buf[pos+4],buf[pos+5],buf[pos+6],buf[pos+7]);if(!size||pos+10+size>buf.length)break;const body=buf.slice(pos+10,pos+10+size),enc=body[0],text=()=>clean(decoder(enc,body.slice(1))).replace(/^\uFEFF/,'');if(fid==='TIT2')out.title=text();else if(fid==='TPE1')out.artist=text();else if(fid==='TALB')out.album=text();else if(fid==='TYER'||fid==='TDRC')out.year=(text().match(/(?:19|20)\d{2}/)||[])[0]||'';else if(fid==='TCON')out.genre=text().replace(/^\(\d+\)\s*/,'');else if(fid==='APIC'&&body.length>12&&!out.cover){let i=1;while(i<body.length&&body[i]!==0)i++;const mime=clean(decoder(0,body.slice(1,i)))||'image/jpeg';i++;i++;if(enc===1||enc===2){while(i+1<body.length&&(body[i]!==0||body[i+1]!==0))i+=2;i+=2}else{while(i<body.length&&body[i]!==0)i++;i++}if(i<body.length){try{out.cover=await dataUrl(new Blob([body.slice(i)],{type:mime}))}catch{}}}pos+=10+size}}}catch(e){console.warn('LX ID3',e)}}
  try{out.duration=await new Promise(resolve=>{const a=document.createElement('audio'),url=URL.createObjectURL(file),done=v=>{URL.revokeObjectURL(url);resolve(Number(v)||0)};a.preload='metadata';a.onloadedmetadata=()=>done(a.duration);a.onerror=()=>done(0);a.src=url;setTimeout(()=>done(0),5000)})}catch{}
  const base=partsFromTitle(stem(file.name));out.title=out.title||base.title;out.artist=out.artist||(/\s+[\-–—]\s+/.test(stem(file.name))?base.artist:'');return out;
 }
 async function matchRemote(meta,fileName='track.mp3'){const c=LX.cloud?.db?.();if(!c)return null;const name=`${clean(meta?.artist)?clean(meta.artist)+' - ':''}${clean(meta?.title)||stem(fileName)||'Música'}.mp3`;try{const {data,error}=await c.functions.invoke('lx-universal-importer',{body:{action:'catalog_match_batch',items:[{name,type:'music'}]}});if(error||data?.error)return null;const row=data?.items?.[0];if(!row?.match||row.status!=='matched'||Number(row.confidence||0)<.88)return null;return {...row.match,confidence:Number(row.confidence||0)}}catch(e){console.warn('LX music metadata match',e);return null}}
 function merge(local={},remote={},fallback={}){const title=clean(local.title)||clean(remote.title)||clean(fallback.title)||'Música',artist=clean(local.artist)||clean(remote.artist)||clean(fallback.artist)||'LX Music',album=clean(local.album)||clean(remote.album)||clean(fallback.album)||'',genre=clean(local.genre)||clean(remote.genre)||clean(fallback.genre)||'Música',year=clean(local.year)||clean(remote.year)||clean(fallback.year)||'',duration=Number(local.duration||remote.duration||fallback.duration||0),cover=clean(local.cover)||clean(remote.cover)||clean(fallback.cover)||'';const desc=clean(remote.desc)||clean(fallback.desc)||`Faixa de ${artist}${album?` · ${album}`:''}${year?` · ${year}`:''}.`;return {title,artist,album,genre,year,duration,cover,desc,provider:clean(remote.provider)||clean(fallback.provider)||'LX Music',externalUrl:clean(fallback.externalUrl)||clean(remote.externalUrl)||'',remoteId:remote.remoteId||fallback.remoteId||'',confidence:Number(remote.confidence||0)}}
 async function probeFile(file){const local=await readId3(file),remote=await matchRemote(local,file?.name||'track.mp3');return merge(local,remote,{title:stem(file?.name||'Música'),provider:local.title||local.artist?'ID3 + catálogo musical':'Catálogo musical'})}
 async function probeYoutube(value){const id=youtubeId(value);if(!id)throw new Error('YOUTUBE_LINK_INVALID');let yt={title:'',artist:'',cover:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,duration:0,externalUrl:`https://www.youtube.com/watch?v=${id}`,remoteId:id,provider:'YouTube',youtubeVideoId:id};try{const r=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(yt.externalUrl)}&format=json`,{mode:'cors',credentials:'omit'});if(r.ok){const d=await r.json(),p=partsFromTitle(d.title,d.author_name);yt={...yt,title:p.title,artist:p.artist,cover:d.thumbnail_url||yt.cover,channelTitle:normalizeArtist(d.author_name)}}else throw new Error('OEMBED_'+r.status)}catch{try{const c=LX.cloud?.db?.();if(c){const {data,error}=await c.functions.invoke('lx-content-hub',{body:{action:'youtube_bulk',source:yt.externalUrl,maxItems:1}});if(!error&&data?.items?.[0]){const row=data.items[0],p=partsFromTitle(row.title,row.channelTitle);yt={...yt,title:p.title,artist:p.artist,cover:row.thumbnail||yt.cover,duration:Number(row.duration||0),channelTitle:normalizeArtist(row.channelTitle)}}}}catch{}}
  if(!clean(yt.title))yt.title='Música do YouTube';if(!clean(yt.artist)||yt.artist==='LX Music')yt.artist=yt.channelTitle||'YouTube';
  const remote=await matchRemote(yt,`${yt.artist||'YouTube'} - ${yt.title||id}.mp3`),trusted=verifiedRemote(yt,remote);
  const album=trusted?clean(remote.album):'',genre=trusted?clean(remote.genre):'Música',year=trusted?clean(remote.year):'',duration=Number(yt.duration||0)||(trusted?Number(remote.duration||0):0);
  return {title:yt.title,artist:yt.artist,album,genre,year,duration,cover:yt.cover,desc:`${yt.title} — ${yt.artist}. Reprodução via YouTube.`,provider:trusted?'YouTube + catálogo verificado':'YouTube',externalUrl:yt.externalUrl,remoteId:trusted?remote.remoteId:yt.remoteId,confidence:trusted?Number(remote.confidence||0):1,youtubeVideoId:id,youtubeThumbnail:yt.cover}
 }
 async function applyEditor(meta,{force=false}={}){if(!meta)return;const q=id=>document.getElementById(id),set=(id,value,allowDefault=false)=>{const el=q(id);if(!el||value==null||value==='')return;if(force||!clean(el.value)||(allowDefault&&['Geral','Outros'].includes(clean(el.value))))el.value=String(value)};set('cTitle',meta.title);set('typeA',meta.artist);set('cYear',meta.year);set('cGenre',meta.genre,true);set('cDesc',meta.desc);LX.ui.state.musicAutoMeta=meta;const info=q('selectedMediaInfo');if(info)info.textContent=`✓ Detectada: ${meta.artist||'Artista'} — ${meta.title||'Faixa'}${meta.album?' · '+meta.album:''}${meta.cover?' · capa automática':''}`;return meta}
 async function fillEditorFromFile(file,opts={}){const info=document.getElementById('selectedMediaInfo');if(info)info.textContent=`Lendo tags e buscando capa de ${file.name}…`;try{return await applyEditor(await probeFile(file),opts)}catch(e){console.warn(e);if(info)info.textContent='Áudio selecionado. Não foi possível completar todos os metadados automaticamente.';return null}}
 async function fillEditorFromYoutube(url,opts={}){const info=document.getElementById('externalMediaDetected');if(info)info.textContent='Identificando música e buscando capa…';try{const meta=await probeYoutube(url);await applyEditor(meta,opts);if(info)info.textContent=`✓ YouTube reconhecido · ${meta.artist} — ${meta.title}${meta.cover?' · capa encontrada':''}`;return meta}catch(e){if(info)info.textContent='';throw e}}
 LX.musicMeta={readId3,probeFile,probeYoutube,applyEditor,fillEditorFromFile,fillEditorFromYoutube,youtubeId,partsFromTitle,merge,similarity,verifiedRemote};
 window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['music-smart-metadata']='32.2';
})();


/* ===== LX Plus v32.2 · resilient media helpers ===== */
(()=>{
 'use strict';
 const LX=window.LX=window.LX||{}, S=LX.store;
 const esc=s=>LX.ui?.esc?LX.ui.esc(String(s??'')):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const toast=t=>LX.toast?.(t);

 /* --- Cast: official Google Cast Web Sender, only for directly reachable media URLs. --- */
 const cast={ready:false,initialized:false};
 cast.init=()=>{
   if(cast.initialized)return cast.ready;
   if(!window.cast?.framework||!window.chrome?.cast?.media)return false;
   try{
     cast.framework.CastContext.getInstance().setOptions({receiverApplicationId:chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,autoJoinPolicy:chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED});
     cast.initialized=true;cast.ready=true;document.documentElement.classList.add('lx-cast-ready');return true;
   }catch(error){console.warn('LX Cast init',error);return false}
 };
 cast.send=async({url,contentType='video/mp4',title='LX Plus',subtitle='',image='',currentTime=0}={})=>{
   if(!/^https:\/\//i.test(String(url||''))||/^blob:/i.test(String(url||'')))throw new Error('CAST_DIRECT_URL_REQUIRED');
   if(!cast.init())throw new Error('CAST_NOT_AVAILABLE');
   const ctx=cast.framework.CastContext.getInstance();let session=ctx.getCurrentSession();if(!session){await ctx.requestSession();session=ctx.getCurrentSession()}if(!session)throw new Error('CAST_SESSION_UNAVAILABLE');
   const info=new chrome.cast.media.MediaInfo(url,contentType||'video/mp4');
   info.metadata=new chrome.cast.media.GenericMediaMetadata();info.metadata.title=title;info.metadata.subtitle=subtitle;if(image)info.metadata.images=[new chrome.cast.Image(image)];
   const req=new chrome.cast.media.LoadRequest(info);if(Number.isFinite(+currentTime)&&+currentTime>0)req.currentTime=+currentTime;req.autoplay=true;await session.loadMedia(req);return true;
 };
 LX.cast=cast;
 const castTry=()=>cast.init();window.addEventListener('lx:cast-available',castTry);if(window.__lxCastAvailable)setTimeout(castTry,0);else setTimeout(castTry,2500);

 /* --- Smart Artwork: chooses the highest useful image and protects aspect ratio. --- */
 const clean=v=>String(v||'').trim();
 function ytId(v){const raw=clean(v);if(/^youtube:[\w-]{11}$/i.test(raw))return raw.slice(8);try{const u=new URL(raw);const h=u.hostname.replace(/^www\./,'').toLowerCase();if(h==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||'';return u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1]||''}catch{return''}}
 function upgraded(url,context='card'){
   url=clean(url);if(!url)return[];const out=[url];
   const y=ytId(url);if(y)out.unshift(`https://i.ytimg.com/vi/${y}/maxresdefault.jpg`,`https://i.ytimg.com/vi/${y}/sddefault.jpg`);
   const m=url.match(/i\.ytimg\.com\/vi\/([\w-]{11})\//i);if(m)out.unshift(`https://i.ytimg.com/vi/${m[1]}/maxresdefault.jpg`,`https://i.ytimg.com/vi/${m[1]}/sddefault.jpg`);
   if(/image\.tmdb\.org\/t\/p\//i.test(url))out.unshift(url.replace(/\/t\/p\/(?:w\d+|original)\//i,context==='hero'?'/t/p/original/':'/t/p/w780/'));
   if(/mzstatic\.com/i.test(url))out.unshift(url.replace(/\d+x\d+bb/i,context==='hero'?'1200x1200bb':'1000x1000bb'));
   return [...new Set(out)];
 }
 function candidates(item={},context='hero'){
   const yt=ytId(item.mediaKey||item.externalMusicUrl||item.youtubeVideoId||item.tracks?.[0]?.mediaKey||'');
   const raw=context==='hero'?[item.carouselImage,item.banner,yt?`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`:'',item.cover,item.youtubeThumbnail,item.spotifyArtwork]:[item.cover,item.spotifyArtwork,item.youtubeThumbnail,yt?`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`:'',item.banner];
   return [...new Set(raw.flatMap(u=>upgraded(u,context)).filter(u=>/^https?:\/\//i.test(u)))].slice(0,10)
 }
 const probe=url=>new Promise(resolve=>{const img=new Image();let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(tm);resolve(v)};img.onload=()=>finish({url,w:img.naturalWidth||0,h:img.naturalHeight||0});img.onerror=()=>finish(null);img.decoding='async';img.referrerPolicy='no-referrer';img.src=url;const tm=setTimeout(()=>finish(null),3500)});
 async function best(item,context='hero'){
   const target=context==='hero'?16/9:1,rows=(await Promise.all(candidates(item,context).map(probe))).filter(Boolean).filter(x=>x.w>=200&&x.h>=200);if(!rows.length)return null;
   rows.forEach(x=>{const ratio=x.w/x.h,area=Math.min(x.w*x.h,3840*2160)/(3840*2160),shape=Math.max(0,1-Math.abs(Math.log(ratio/target)));x.score=area*2+shape*(context==='hero'?2.5:1.4)+(context==='hero'&&ratio>1.35?.6:0)});return rows.sort((a,b)=>b.score-a.score)[0]
 }
 async function hydrateHero(){const hero=document.getElementById('hero');if(!hero)return;for(const slide of hero.querySelectorAll('.hero-slide')){if(slide.dataset.lxSmartDone==='1')continue;const title=slide.querySelector('.hero-copy h1')?.textContent?.trim(),item=(LX.data?.catalog?.()||[]).find(x=>String(x.title||'').trim()===title);if(!item)continue;slide.dataset.lxSmartDone='1';const row=await best(item,'hero');if(!row)continue;const bg=slide.querySelector('.hero-bg');if(!bg)continue;bg.style.backgroundImage=`url(${JSON.stringify(row.url)})`;bg.style.setProperty('--hero-art',`url(${JSON.stringify(row.url)})`);const portrait=row.w/row.h<1.3;bg.classList.toggle('hero-bg-poster',portrait);let focus=bg.querySelector('.hero-poster-focus');if(portrait&&!focus){focus=document.createElement('span');focus.className='hero-poster-focus';bg.appendChild(focus)}if(focus){focus.style.backgroundImage=`url(${JSON.stringify(row.url)})`;focus.hidden=!portrait}}
 }
 async function hydrateMusic(){for(const img of document.querySelectorAll('.lx-music-carousel img[data-lx-artwork]')){if(img.dataset.lxSmart318)return;img.dataset.lxSmart318='1';const card=img.closest('[data-music-id]'),item=(LX.data?.catalog?.()||[]).find(x=>String(x.id)===String(card?.dataset.musicId||''));if(!item)continue;const row=await best(item,'square');if(row&&row.url!==img.src){const original=img.src;img.onerror=()=>{img.onerror=null;img.src=original};img.src=row.url}}
 }
 const artObserver=new MutationObserver(()=>{clearTimeout(artObserver.t);artObserver.t=setTimeout(()=>{hydrateHero().catch(()=>{});hydrateMusic().catch(()=>{})},80)});artObserver.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{hydrateHero();hydrateMusic()},900);
 LX.smartArt={best,candidates,hydrateHero,hydrateMusic};

 /* --- Player enhancements: visible quality filter + Cast button that really uses Cast when possible. --- */
 function enhanceCinema(){const host=document.getElementById('lxGlobalCinema');if(!host?.shadowRoot||host.dataset.lx318==='1')return;host.dataset.lx318='1';const root=host.shadowRoot,stage=root.getElementById('stage'),video=root.getElementById('video'),actions=root.querySelector('.actions');if(!stage||!video||!actions)return;
   const prefs=()=>S?.read?.(S.keys.playerPrefs,{})||{},save=patch=>S?.write?.(S.keys.playerPrefs,{...prefs(),...patch});
   const filter=document.createElement('button');filter.id='qualityFilter318';filter.className='round lx-quality-quick';filter.title='Melhoria visual';filter.setAttribute('aria-label','Ativar ou desativar melhoria visual');const sync=()=>{const on=!!prefs().enhanceVisual;stage.classList.toggle('lx-image-enhanced',on);filter.classList.toggle('active',on);filter.textContent=on?'✦':'◇';filter.title=`Melhoria visual · ${on?'ligada':'desligada'}`};sync();filter.onclick=()=>{const on=!stage.classList.contains('lx-image-enhanced');save({enhanceAsked:true,enhanceVisual:on});sync();toast(on?'Melhoria visual ligada.':'Melhoria visual desligada.')};actions.prepend(filter);
   const castBtn=root.getElementById('cast');if(castBtn)castBtn.onclick=async()=>{const src=video.currentSrc||video.src||'';if(root.classList.contains('drive-fallback')||!/^https:\/\//i.test(src)){toast('Para transmitir diretamente à TV, use uma fonte LX Stream/R2, HLS ou MP4 HTTPS. O modo incorporado do Drive não pode ser enviado como mídia direta.');return}try{const item=LX.data?.catalog?.().find(x=>String(x.id)===String(host.dataset.contentId||''))||{};const type=/\.m3u8(?:$|[?#])/i.test(src)?'application/x-mpegURL':/\.mpd(?:$|[?#])/i.test(src)?'application/dash+xml':'video/mp4';await LX.cast.send({url:src,contentType:type,title:item.title||root.querySelector('.heading strong')?.textContent||'LX Plus',subtitle:root.querySelector('.heading small')?.textContent||'',image:item.banner||item.cover||'',currentTime:video.currentTime||0});toast('Transmissão enviada para a TV.')}catch(error){console.warn('LX cast player',error);toast('Não foi possível iniciar o Cast. Verifique se a TV/Chromecast está na mesma rede.')}};
 }
 const playerObserver=new MutationObserver(()=>setTimeout(enhanceCinema,0));playerObserver.observe(document.body,{childList:true,subtree:true});setTimeout(enhanceCinema,600);

 /* --- Music credits/provider labels without putting provider links everywhere. --- */
 function musicSource(content={},track={}){const ref=track.mediaKey||track.fullMediaKey||content.mediaKey||content.externalMusicUrl||'',input=LX.mediaSources?.toInput?.(ref)||content.externalMusicUrl||'';if(/youtube:|youtu(?:be\.com|\.be)/i.test(String(ref)+' '+input))return {label:'LX Music + YouTube',name:'YouTube',url:input};if(/spotify:|open\.spotify\.com/i.test(String(ref)+' '+input))return {label:'LX Music + Spotify',name:'Spotify',url:input};return {label:'LX Music',name:'LX Plus',url:''}}
 const oldLyrics=LX.openMusicLyrics;LX.openMusicLyrics=function(id=null,index=null){const result=oldLyrics?.(id,index);setTimeout(()=>{const page=document.querySelector('.lx-lyrics-page');if(!page)return;const live=LX.currentMusic?.(),content=id!=null?LX.data?.catalog?.().find(x=>String(x.id)===String(id)):LX.data?.catalog?.().find(x=>String(x.id)===String(live?.contentId));if(!content)return;const ti=index==null?(live?.index||0):index,track=content.tracks?.[ti]||{},src=musicSource(content,track);let box=page.querySelector('.lx-music-source-credit');if(!box){box=document.createElement('div');box.className='lx-music-source-credit';page.querySelector('footer')?.before(box)}box.innerHTML=`<span>FONTE</span><strong>${esc(src.label)}</strong><small>${src.url?`Reprodução vinculada à fonte oficial. <a href="${esc(src.url)}" target="_blank" rel="noopener">Abrir no ${esc(src.name)} ↗</a>`:'Áudio hospedado/autorizado na LX Plus.'}</small>`},0);return result};
 document.addEventListener('lx:music-changed',()=>{const live=LX.currentMusic?.(),content=live?LX.data?.catalog?.().find(x=>String(x.id)===String(live.contentId)):null,src=musicSource(content||{},live||{}),credit=document.getElementById('musicProviderCredit'),label=document.getElementById('musicProviderLabel');if(credit)credit.textContent=`${src.label} · reprodução pela fonte oficial`;if(label)label.textContent=src.label});

 /* --- Sports Live UI with team badges, authorized source registration and in-site player. --- */
 const sportMap={Hoje:'Soccer',Futebol:'Soccer',Basquete:'Basketball','Vôlei':'Volleyball','Tênis':'Tennis',Motorsport:'Motorsport'};
 const getStreams=()=>LX.data?.branding?.()?.liveSportsStreams||{};
 async function saveStream(id,ref){const b=LX.data?.branding?.()||{},map={...(b.liveSportsStreams||{})};if(ref)map[String(id)]={ref,updatedAt:new Date().toISOString()};else delete map[String(id)];await LX.data.saveBranding({...b,liveSportsStreams:map})}
 function liveEventById(id){return (LX.sports318?.events||[]).find(x=>String(x.id)===String(id))||null}
 function badge(url,name){return url?`<span class="lx-team-badge"><img src="${esc(url)}" alt="${esc(name)}" loading="lazy" decoding="async"></span>`:`<span class="lx-team-badge fallback">${esc(String(name||'?').slice(0,2).toUpperCase())}</span>`}
 function eventCard(e){const stream=getStreams()[String(e.id)]?.ref,admin=!!LX.ui?.state?.user?.admin;return `<article class="hub-live-card lx-live318-card"><div class="hub-live-meta"><span>${esc(e.league||e.sport||'Esporte')}</span><b>${esc(e.time||'')}</b></div><div class="hub-match lx-match318"><div class="lx-team318">${badge(e.homeBadge,e.home)}<strong>${esc(e.home||'Casa')}</strong></div><div class="hub-score"><b>${e.homeScore??'–'}</b><i>×</i><b>${e.awayScore??'–'}</b></div><div class="lx-team318 away">${badge(e.awayBadge,e.away)}<strong>${esc(e.away||'Visitante')}</strong></div></div><div class="hub-live-footer"><span>${esc(e.status||e.venue||'')}</span><div class="lx-live318-actions">${stream?`<button class="primary-btn" onclick="LX.sports318.openLive('${esc(e.id)}')">▶ Assistir ao vivo</button>`:''}<button onclick="LX.contentHub.openTV('${esc(e.id)}','${esc(e.name).replace(/'/g,'&#39;')}')">Onde assistir</button>${admin?`<button class="lx-live-config" onclick="LX.sports318.configure('${esc(e.id)}')">${stream?'Editar transmissão':'＋ Transmissão'}</button>`:''}</div></div></article>`}
 async function renderLive(){const state=LX.ui.state,sport=sportMap[state.category]||'Soccer',date=new Date().toISOString().slice(0,10),home=document.getElementById('homeContent'),hero=document.getElementById('hero'),welcome=document.getElementById('welcome');if(hero)hero.innerHTML='';if(welcome)welcome.innerHTML=`<section class="hub-live-hero lx-live318-hero"><div><span class="live-dot"></span><span class="eyebrow">LX AO VIVO · ${esc(sport)}</span><h1>Jogos e eventos de hoje</h1><p>Placares, escudos e agenda esportiva. Quando o Dono cadastrar uma fonte autorizada, o jogo abre dentro da LX Plus e pode ser enviado à TV.</p></div><div class="live-date">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</div></section>`;if(home)home.innerHTML='<section class="hub-section"><div class="hub-loading"><i></i><span>Carregando partidas e escudos…</span></div></section>';try{const c=LX.cloud?.db?.();if(!c)throw new Error('CLOUD');let {data,error}=await c.functions.invoke('lx-sports-hub',{body:{action:'today',date,sport}});if(error)throw error;LX.sports318.events=data?.events||[];if(home)home.innerHTML=`<section class="hub-section"><div class="lx-section-title"><div><span class="eyebrow">HOJE</span><h2>${esc(state.category)}</h2></div><button class="lx-text-btn" onclick="LX.sports318.renderLive()">Atualizar</button></div>${data?.freeKey?'<div class="hub-note">API esportiva gratuita ativa; algumas competições podem ter cobertura limitada.</div>':''}<div class="hub-live-list">${LX.sports318.events.map(eventCard).join('')||'<div class="notice">Nenhum evento encontrado para hoje.</div>'}</div></section>`}catch(error){console.warn('LX sports 31.8',error);if(home)home.innerHTML='<section class="hub-section"><div class="notice">Não foi possível carregar a agenda esportiva agora.</div></section>'}}
 async function configure(id){const e=liveEventById(id);if(!e)return;const old=getStreams()[String(id)]?.ref||'',raw=prompt(`Fonte autorizada para ${e.name||e.home+' × '+e.away}:\nCole HLS (.m3u8), MP4 HTTPS ou link oficial do YouTube. Deixe vazio para remover.`,LX.mediaSources?.toInput?.(old)||old);if(raw===null)return;let ref='';if(raw.trim()){try{const mode=LX.mediaSources?.modeFor?.(raw.trim())||'direct';ref=LX.mediaSources?.normalize?.(mode,raw.trim())||raw.trim()}catch(error){toast(error?.message||'Fonte inválida.');return}}await saveStream(id,ref);toast(ref?'Transmissão salva.':'Transmissão removida.');renderLive()}
 async function openLive(id){const e=liveEventById(id),ref=getStreams()[String(id)]?.ref;if(!e||!ref)return toast('Transmissão ainda não cadastrada.');const desc=LX.mediaSources?.describe?.(ref)||{},modal=document.getElementById('modal'),overlay=document.getElementById('overlay');if(!modal||!overlay)return;overlay.classList.remove('hidden');modal.innerHTML=`<button class="close-btn" onclick="LX.sports318.closeLive()">×</button><div class="lx-live-player318"><header><div><span class="live-dot"></span><small>AO VIVO · ${esc(e.league||e.sport||'Esporte')}</small><h2>${esc(e.home)} <b>×</b> ${esc(e.away)}</h2></div><div><button id="lxLiveFilter318" class="secondary-btn">✦ Qualidade: desligada</button><button id="lxLiveCast318" class="secondary-btn">▣ TV</button></div></header><div id="lxLiveStage318" class="lx-live-stage318"><div class="lx-live-loading318">Carregando transmissão…</div></div><footer><span>${esc(desc.provider||'LX Live')}</span><small>Fonte cadastrada pelo Dono da LX Plus.</small></footer></div>`;
   const stage=document.getElementById('lxLiveStage318'),prefs=()=>S?.read?.(S.keys.playerPrefs,{})||{},filter=document.getElementById('lxLiveFilter318'),castBtn=document.getElementById('lxLiveCast318');let video=null,player=null,currentUrl='';const apply=()=>{const on=!!prefs().enhanceLive;stage.classList.toggle('lx-live-enhanced',on);filter.textContent=`✦ Qualidade: ${on?'ligada':'desligada'}`;filter.classList.toggle('active',on)};apply();filter.onclick=()=>{const p=prefs(),on=!p.enhanceLive;S.write(S.keys.playerPrefs,{...p,enhanceLive:on});apply();toast(on?'Filtro visual ativado para o ao vivo.':'Filtro visual desligado.')};
   if(desc.kind==='embed'){stage.innerHTML=`<iframe class="lx-live-embed318" src="${esc(desc.src||'')}" title="${esc(e.name||'Ao vivo')}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="origin-when-cross-origin"></iframe>`;castBtn.onclick=()=>toast('Nesta fonte incorporada, use o botão de transmissão do próprio provedor. Para Cast direto da LX Plus, cadastre HLS/MP4 HTTPS.');return}
   currentUrl=desc.src||LX.mediaSources?.directUrl?.(ref)||LX.mediaSources?.toInput?.(ref)||'';stage.innerHTML='<video id="lxLiveVideo318" controls playsinline autoplay></video>';video=document.getElementById('lxLiveVideo318');try{if(/\.(?:m3u8|mpd)(?:$|[?#])/i.test(currentUrl)&&LX.adaptive?.load){await LX.adaptive.load(video,currentUrl)}else{video.src=currentUrl;video.load();await video.play().catch(()=>{})}}catch(error){console.warn(error);stage.insertAdjacentHTML('beforeend','<div class="lx-live-error318">Não foi possível abrir a transmissão. Verifique a fonte cadastrada.</div>')}
   castBtn.onclick=async()=>{try{if(!/^https:\/\//i.test(currentUrl))throw new Error('DIRECT_REQUIRED');const type=/\.m3u8(?:$|[?#])/i.test(currentUrl)?'application/x-mpegURL':/\.mpd(?:$|[?#])/i.test(currentUrl)?'application/dash+xml':'video/mp4';await LX.cast.send({url:currentUrl,contentType:type,title:`${e.home} × ${e.away}`,subtitle:e.league||'',image:e.thumb||e.homeBadge||'',currentTime:video?.currentTime||0});toast('Jogo enviado para a TV.')}catch(error){toast('Cast direto indisponível para esta fonte/dispositivo.')}}
 }
 function closeLive(){try{document.getElementById('lxLiveVideo318')?.pause()}catch{}LX.ui?.close?.()}
 LX.sports318={events:[],renderLive,configure,openLive,closeLive};
 if(LX.contentHub){LX.contentHub.renderLive=renderLive;const oldTV=LX.contentHub.openTV;LX.contentHub.openTV=async(id,name='Evento')=>{const stream=getStreams()[String(id)]?.ref;if(stream){const modal=document.getElementById('modal'),overlay=document.getElementById('overlay');overlay?.classList.remove('hidden');if(modal)modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page"><span class="eyebrow">LX AO VIVO</span><h2>${esc(name)}</h2><p>Existe uma transmissão autorizada cadastrada para este evento.</p><div class="hero-actions"><button class="primary-btn" onclick="LX.sports318.openLive('${esc(id)}')">▶ Assistir dentro da LX Plus</button><button class="secondary-btn" onclick="LX.ui.close();LX.contentHub.openTVOfficial?.('${esc(id)}','${esc(name).replace(/'/g,'&#39;')}')">Ver emissoras oficiais</button></div></div>`;return}return oldTV?.(id,name)};LX.contentHub.openTVOfficial=oldTV}

 window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES['v32.2-resilient-audio']='32.2';
})();
