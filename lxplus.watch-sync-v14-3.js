/* LX Plus — Watch Party Sync V14.3
   Dedicated playback synchronization channel.
   Keeps the original Watch Party/call channel intact.
   - host is the authoritative movie clock
   - guest receives a snapshot every 1.5s
   - small drift is corrected smoothly with temporary playbackRate adjustment
   - drift > ~1s is corrected immediately, with cooldown to prevent jumping loops
   - play/pause/seek/rate from either participant are propagated
   - manual "Sincronizar" action requests an immediate authoritative snapshot
   - uses local RTT measurement; never compares clocks from different devices
*/
(()=>{'use strict';
  const VERSION='14.3';
  let roomKey='',channel=null,monitor=null,pulse=null,pingTimer=null,boundVideo=null,subscribed=false;
  let suppressUntil=0,lastHardSeekAt=0,lastSnapshotAt=0,sequence=0,rttMs=160,starting=false;
  const videoListeners=[],pendingPings=new Map();
  const $=id=>document.getElementById(id);
  const uid=()=>String(window.LX?.cloud?.user?.()?.id||window.LX?.ui?.state?.user?.id||'');
  const db=()=>window.LX?.cloud?.db?.()||null;
  const api=()=>window.LXWatchPartyV14||null;
  const st=()=>api()?.state||null;
  const movieVideo=()=>st()?.video||window.LXWatchTogetherV10?.activeMovieVideo?.()||$('lxGlobalCinema')?.shadowRoot?.querySelector?.('#video,video')||null;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};

  function send(event,payload={}){
    const room=st()?.room;if(!channel||!room||!subscribed)return null;
    try{return channel.send({type:'broadcast',event,payload:{...payload,sender:uid(),roomId:room.id}})}catch{return null}
  }
  function snapshot(reason='heartbeat',force=false){
    const s=st(),v=movieVideo();if(!s?.room||!v)return null;
    return {reason,force,seq:++sequence,contentId:s.room.contentId,time:Number(v.currentTime||0),paused:!!v.paused,rate:Number(v.playbackRate||1)};
  }
  function sendSnapshot(reason='heartbeat',force=false){const p=snapshot(reason,force);if(p)send('snapshot',p)}
  function updateBadge(text){const el=$('lxWpSync');if(el)el.textContent=text}

  function clearVideoListeners(){while(videoListeners.length){const [el,type,fn]=videoListeners.pop();try{el.removeEventListener(type,fn)}catch{}}boundVideo=null}
  function disableLegacyPlaybackSync(){
    const s=st();if(!s)return;
    if(Array.isArray(s.videoCleanup)){
      for(const row of s.videoCleanup){try{row?.[0]?.removeEventListener?.(row?.[1],row?.[2])}catch{}}
      s.videoCleanup.length=0;
    }
    try{clearInterval(s.syncTimer)}catch{};s.syncTimer=null;
  }
  function emitControl(action){
    const now=Date.now();if(now<suppressUntil)return;
    const p=snapshot(action,true);if(!p)return;
    send('control',{...p,action});
    if(st()?.room?.role==='host')setTimeout(()=>sendSnapshot('authoritative',true),80);
  }
  function bindVideo(video){
    if(!video||boundVideo===video&&videoListeners.length)return;
    clearVideoListeners();disableLegacyPlaybackSync();
    boundVideo=video;const s=st();if(s)s.video=video;
    const on=(type,fn)=>{video.addEventListener(type,fn,{passive:true});videoListeners.push([video,type,fn])};
    on('play',()=>emitControl('play'));
    on('pause',()=>emitControl('pause'));
    on('seeked',()=>emitControl('seek'));
    on('ratechange',()=>emitControl('rate'));
  }

  async function applyRemote(payload={},force=false){
    const s=st(),room=s?.room;if(!room)return;
    const sender=String(payload.sender||'');if(!sender||sender===uid()||Number(payload.contentId)!==Number(room.contentId))return;
    const v=movieVideo();if(!v)return;if(boundVideo!==v)bindVideo(v);
    const rate=Number(payload.rate||1)||1;
    const latency=payload.paused?0:Math.min(.75,Math.max(0,rttMs/2000));
    const target=Math.max(0,Number(payload.time||0)+latency*rate);
    const local=Number(v.currentTime||0),signedDrift=local-target,drift=Math.abs(signedDrift),now=Date.now();
    let hard=false;
    try{
      if(force||payload.force||drift>1.05&&now-lastHardSeekAt>2200){
        suppressUntil=now+1300;lastHardSeekAt=now;s.lastRemoteApply=now;
        if(Number.isFinite(target))v.currentTime=target;hard=true;
      }
      if(payload.paused){
        if(!v.paused){suppressUntil=Math.max(suppressUntil,now+900);s.lastRemoteApply=now;v.pause()}
        if(Math.abs((v.playbackRate||1)-rate)>.015)v.playbackRate=rate;
      }else{
        if(v.paused){suppressUntil=Math.max(suppressUntil,now+900);s.lastRemoteApply=now;await v.play().catch(()=>{})}
        if(!hard&&drift>.18&&drift<=1.05){
          const correction=clamp(-signedDrift*.055,-.06,.06),desired=clamp(rate+correction,.75,2);
          if(Math.abs((v.playbackRate||1)-desired)>.008){suppressUntil=Math.max(suppressUntil,now+500);v.playbackRate=desired}
        }else if(Math.abs((v.playbackRate||1)-rate)>.012){suppressUntil=Math.max(suppressUntil,now+500);v.playbackRate=rate}
      }
    }catch(error){console.warn('LX Watch Party V14.3 apply',error)}
    lastSnapshotAt=now;
    updateBadge(hard?'Sincronizado agora':drift>.45?`Sincronizando · ${drift.toFixed(1)}s`:'Sincronizado');
  }

  async function onSnapshot(payload={}){
    const room=st()?.room;if(!room)return;
    if(room.role==='host')return;
    if(String(payload.sender||'')!==String(room.hostId||payload.sender||''))return;
    await applyRemote(payload,!!payload.force);
  }
  async function onControl(payload={}){
    const room=st()?.room;if(!room||String(payload.sender||'')===uid())return;
    await applyRemote(payload,true);
    if(room.role==='host')setTimeout(()=>sendSnapshot('authoritative',true),100);
  }
  function requestSync(force=true){
    if(!st()?.room)return;
    updateBadge('Sincronizando…');
    if(st().room.role==='host'){sendSnapshot('manual',force);updateBadge('Sincronizado');return}
    send('sync-request',{force,contentId:st().room.contentId});
  }
  function ping(){
    if(!subscribed||!st()?.room)return;
    const token=`${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
    pendingPings.set(token,performance.now());send('ping',{token});
    setTimeout(()=>pendingPings.delete(token),7000);
  }
  function handlePong(payload={}){
    const start=pendingPings.get(String(payload.token||''));if(start==null)return;
    pendingPings.delete(String(payload.token));const sample=performance.now()-start;
    if(Number.isFinite(sample)&&sample>0&&sample<5000)rttMs=rttMs*.72+sample*.28;
  }

  function ensureSyncButton(){
    const hud=$('lxWatchPartyHud'),actions=hud?.querySelector?.('.lx-wp-actions');if(!actions)return;
    let btn=actions.querySelector('[data-wp-sync-v143]');
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.dataset.wpSyncV143='1';btn.title='Sincronizar agora';
      btn.innerHTML='<span aria-hidden="true">⟳</span><span class="lx-wp-sync-label">Sincronizar</span>';
      btn.style.cssText='display:inline-flex;align-items:center;gap:5px;min-width:max-content;padding:0 10px;font-size:9px;font-weight:800';
      btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();requestSync(true)});
      actions.insertBefore(btn,actions.querySelector('[data-wp="fullscreen"]')||actions.firstChild);
    }
  }
  function interceptCoreShareButtons(){
    if(document.documentElement.dataset.lxWpShareQuality==='1')return;
    document.documentElement.dataset.lxWpShareQuality='1';
    document.addEventListener('click',e=>{
      const room=st()?.room;if(!room)return;
      const btn=e.target?.closest?.('#lxCallOverlay button,#lxCallOverlay [role="button"]');if(!btn)return;
      const text=`${btn.textContent||''} ${btn.getAttribute('title')||''} ${btn.getAttribute('aria-label')||''}`.toLowerCase();
      if(!/(compartilhar|transmitir).{0,12}(tela)|tela.{0,12}(compartilhar|transmitir)/.test(text))return;
      if(btn.closest('#lxWatchPartyHud'))return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();api()?.openQualityPanel?.('tx');
    },true);
  }

  async function startRoom(){
    if(starting)return;const s=st(),room=s?.room,c=db();if(!room||!c)return;
    const key=String(room.id);if(roomKey===key&&channel)return;
    starting=true;
    try{
      await stopRoom(false);disableLegacyPlaybackSync();roomKey=key;sequence=0;lastHardSeekAt=0;lastSnapshotAt=0;rttMs=160;
      const ch=c.channel('lx-watch-sync-v143-'+key,{config:{broadcast:{self:false,ack:false}}});
      ch.on('broadcast',{event:'snapshot'},({payload})=>onSnapshot(payload||{}));
      ch.on('broadcast',{event:'control'},({payload})=>onControl(payload||{}));
      ch.on('broadcast',{event:'sync-request'},({payload})=>{if(st()?.room?.role==='host')sendSnapshot('sync-request',payload?.force!==false)});
      ch.on('broadcast',{event:'ping'},({payload})=>send('pong',{token:payload?.token}));
      ch.on('broadcast',{event:'pong'},({payload})=>handlePong(payload||{}));
      channel=ch;
      ch.subscribe(status=>{
        if(status!=='SUBSCRIBED')return;subscribed=true;
        const v=movieVideo();if(v)bindVideo(v);ensureSyncButton();
        clearInterval(pulse);pulse=setInterval(()=>{
          const current=st(),mv=movieVideo();if(!current?.room||!mv)return;
          disableLegacyPlaybackSync();if(boundVideo!==mv)bindVideo(mv);ensureSyncButton();
          if(current.room.role==='host')sendSnapshot('heartbeat',false);
          else if(Date.now()-lastSnapshotAt>4200)requestSync(false);
        },1500);
        clearInterval(pingTimer);pingTimer=setInterval(ping,4500);ping();
        if(st()?.room?.role==='host')setTimeout(()=>sendSnapshot('authoritative',true),120);
        else setTimeout(()=>requestSync(true),160);
      });
    }finally{starting=false}
  }
  async function stopRoom(removeChannel=true){
    clearInterval(pulse);pulse=null;clearInterval(pingTimer);pingTimer=null;subscribed=false;clearVideoListeners();pendingPings.clear();
    const c=db(),old=channel;channel=null;roomKey='';
    if(removeChannel&&c&&old)try{await c.removeChannel(old)}catch{}
  }
  function monitorRoom(){
    const s=st(),room=s?.room;
    if(!room){if(roomKey||channel)stopRoom(true).catch(()=>{});return}
    disableLegacyPlaybackSync();ensureSyncButton();interceptCoreShareButtons();
    const v=movieVideo();if(v&&boundVideo!==v)bindVideo(v);
    if(String(room.id)!==roomKey||!channel)startRoom().catch(e=>console.warn('LX Watch Party V14.3 start',e));
  }
  function boot(){
    interceptCoreShareButtons();clearInterval(monitor);monitor=setInterval(monitorRoom,300);monitorRoom();
    window.LXWatchPartySyncV143={version:VERSION,syncNow:()=>requestSync(true),get rttMs(){return rttMs},get roomId(){return roomKey}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
