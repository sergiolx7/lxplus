/* LX Plus — Watch Party Native V15
   Makes Watch Party deterministic:
   - Google Drive media uses LX Storage Worker -> native <video> only while a Watch Party is active
   - local movie playback remains the audio source for synchronized watching
   - remote screen-share video is muted inside Watch Party so call voices never loop through shared media
   - catalog data is never modified
*/
(()=>{'use strict';
  const VERSION='15.0';
  const DEFAULT_WORKER='https://lxplus.sergio-sousa.workers.dev';
  let originalDescribe=null,patched=false,timer=null,lastRoom='';
  const $=id=>document.getElementById(id);
  const api=()=>window.LXWatchPartyV14||null;
  const state=()=>api()?.state||null;
  const room=()=>state()?.room||null;
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};

  function cleanBase(value){
    try{const u=new URL(String(value||''));if(u.protocol!=='https:')return'';return u.origin+u.pathname.replace(/\/+$/,'')}catch{return''}
  }
  function workerBase(){
    const candidates=[
      window.LX?.driveStorage?.endpoint,
      window.LX?.storage?.driveEndpoint,
      window.LX?.storageWorkerUrl,
      (()=>{try{return localStorage.getItem('lx_drive_worker')||localStorage.getItem('lx_storage_worker')||localStorage.getItem('lxplus_drive_worker')||''}catch{return''}})(),
      DEFAULT_WORKER
    ];
    for(const candidate of candidates){const base=cleanBase(candidate);if(base)return base}
    return DEFAULT_WORKER;
  }
  function driveId(ref,info={}){
    const raw=String(ref||'').trim();
    if(/^gdrive:[A-Za-z0-9_-]{10,}$/i.test(raw))return raw.slice(7);
    if(info?.driveId)return String(info.driveId);
    const m=raw.match(/(?:\/file\/d\/|[?&]id=)([A-Za-z0-9_-]{10,})/i);
    return m?.[1]||'';
  }
  function nativeDriveInfo(ref,baseInfo={}){
    const id=driveId(ref,baseInfo);if(!id)return null;
    const src=`${workerBase()}/v/${encodeURIComponent(id)}`;
    return {...baseInfo,kind:'direct',provider:'LX Storage',label:'LX Storage · Watch Party',src,openUrl:src,driveId:id,watchPartyNative:true};
  }
  function patchMediaSources(){
    const media=window.LX?.mediaSources;
    if(!media?.describe||media.describe.__lxWpNativeV15)return false;
    originalDescribe=media.describe.bind(media);
    const wrapped=function(ref){
      const info=originalDescribe(ref);
      if(!room())return info;
      const native=nativeDriveInfo(ref,info);
      return native||info;
    };
    wrapped.__lxWpNativeV15=true;wrapped.__original=originalDescribe;
    media.describe=wrapped;patched=true;return true;
  }
  function movieVideo(){
    return state()?.video||window.LXWatchTogetherV10?.activeMovieVideo?.()||$('lxGlobalCinema')?.shadowRoot?.querySelector?.('#video,video')||null;
  }
  function shareVideo(){return $('lxWatchPartyShare')?.querySelector?.('video')||null}
  function shareActive(){const v=shareVideo();return !!v?.srcObject&&!v.closest?.('.hidden')}
  function isolateRemoteShare(){
    const shared=shareVideo();if(!shared)return;
    // The synchronized local LX Player carries movie audio. The received screen-share is visual only.
    shared.muted=true;shared.volume=0;shared.setAttribute('muted','');
    const viewer=shared.closest('#lxWatchPartyShare');
    const title=viewer?.querySelector('header strong');if(title)title.textContent='Tela compartilhada · áudio sincronizado pela LX';
    const local=movieVideo();if(local){try{local.setAttribute('playsinline','')}catch{}}
  }
  function decorateHud(){
    const hud=$('lxWatchPartyHud');if(!hud)return;
    let note=hud.querySelector('.lx-wp-v15-audio');
    if(!note){note=document.createElement('span');note.className='lx-wp-v15-audio';note.style.cssText='font:750 8px/1 system-ui;color:rgba(255,255,255,.62);white-space:nowrap;pointer-events:none';const title=hud.querySelector('.lx-wp-title');title?.appendChild(note)}
    note.textContent=shareActive()?'Tela em vídeo · filme e voz separados':'Filme sincronizado · chamada separada';
  }
  function ensureNativeRoomPlayer(){
    const r=room();if(!r)return;
    const host=$('lxGlobalCinema'),root=host?.shadowRoot;
    const frame=root?.querySelector?.('#driveFrame,iframe.frame');
    const video=root?.querySelector?.('#video,video');
    if(video)return;
    if(!frame||lastRoom===String(r.id)+':retry')return;
    // A room started before this patch finished loading. Reopen once so Drive uses the native Worker path.
    lastRoom=String(r.id)+':retry';
    try{window.LX?.stopMiniPlayer?.(true)}catch{}
    setTimeout(()=>{
      try{
        if(typeof window.LX?.primary==='function')window.LX.primary(r.contentId);
        else window.LX?.play?.(r.contentId,1,null);
        toast('Player LX preparado para sincronização.');
      }catch(error){console.warn('LX Watch Party V15 native reopen',error)}
    },90);
  }
  function tick(){
    patchMediaSources();
    const r=room();
    if(!r){lastRoom='';return}
    if(lastRoom!==String(r.id)&&!lastRoom.endsWith(':retry'))lastRoom=String(r.id);
    isolateRemoteShare();decorateHud();ensureNativeRoomPlayer();
  }
  function boot(){
    patchMediaSources();clearInterval(timer);timer=setInterval(tick,350);tick();
    window.LXWatchPartyNativeV15={version:VERSION,workerBase,nativeDriveInfo,patchMediaSources,movieVideo,isolateRemoteShare};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
