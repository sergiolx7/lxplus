/* LX Plus — Watch Party Sync V14.4
   Reliable dedicated movie synchronization without replacing the call/quality channel.
*/
(()=>{'use strict';
  const VERSION='14.4';
  let roomKey='',channel=null,monitor=null,pulse=null,pingTimer=null,boundVideo=null,subscribed=false,starting=false,channelStartedAt=0;
  let suppressUntil=0,lastHardSeekAt=0,lastSnapshotAt=0,sequence=0,rttMs=160;
  const videoListeners=[],pendingPings=new Map();
  const $=id=>document.getElementById(id);
  const uid=()=>String(window.LX?.cloud?.user?.()?.id||window.LX?.ui?.state?.user?.id||'');
  const db=()=>window.LX?.cloud?.db?.()||null;
  const api=()=>window.LXWatchPartyV14||null;
  const st=()=>api()?.state||null;
  const movieVideo=()=>st()?.video||window.LXWatchTogetherV10?.activeMovieVideo?.()||$('lxGlobalCinema')?.shadowRoot?.querySelector?.('#video,video')||null;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

  function send(event,payload={}){const room=st()?.room;if(!channel||!room||!subscribed)return null;try{return channel.send({type:'broadcast',event,payload:{...payload,sender:uid(),roomId:room.id}})}catch{return null}}
  function snapshot(reason='heartbeat',force=false){const s=st(),v=movieVideo();if(!s?.room||!v)return null;return{reason,force,seq:++sequence,contentId:s.room.contentId,time:Number(v.currentTime||0),paused:!!v.paused,rate:Number(v.playbackRate||1)}}
  function sendSnapshot(reason='heartbeat',force=false){const p=snapshot(reason,force);if(p)send('snapshot',p)}
  function updateBadge(text){const el=$('lxWpSync');if(el)el.textContent=text}

  function clearOwnVideoListeners(){while(videoListeners.length){const [el,type,fn]=videoListeners.pop();try{el.removeEventListener(type,fn)}catch{}}boundVideo=null}
  function disableLegacySync(){const s=st();if(!s)return;if(Array.isArray(s.videoCleanup)){for(const row of s.videoCleanup){try{row?.[0]?.removeEventListener?.(row?.[1],row?.[2])}catch{}}s.videoCleanup.length=0}try{clearInterval(s.syncTimer)}catch{}s.syncTimer=null}
  function emitControl(action){const now=Date.now();if(now<suppressUntil)return;const p=snapshot(action,true);if(!p)return;send('control',{...p,action});if(st()?.room?.role==='host')setTimeout(()=>sendSnapshot('authoritative',true),80)}
  function bindVideo(video){if(!video||boundVideo===video&&videoListeners.length)return;clearOwnVideoListeners();disableLegacySync();boundVideo=video;const s=st();if(s)s.video=video;const on=(type,fn)=>{video.addEventListener(type,fn,{passive:true});videoListeners.push([video,type,fn])};on('play',()=>emitControl('play'));on('pause',()=>emitControl('pause'));on('seeked',()=>emitControl('seek'));on('ratechange',()=>emitControl('rate'))}

  async function applyRemote(payload={},force=false){
    const s=st(),room=s?.room,sender=String(payload.sender||'');if(!room||!sender||sender===uid()||Number(payload.contentId)!==Number(room.contentId))return;
    const v=movieVideo();if(!v)return;if(boundVideo!==v)bindVideo(v);
    const baseRate=Number(payload.rate||1)||1,latency=payload.paused?0:Math.min(.75,Math.max(0,rttMs/2000));
    const target=Math.max(0,Number(payload.time||0)+latency*baseRate),local=Number(v.currentTime||0),signed=local-target,drift=Math.abs(signed),now=Date.now();let hard=false;
    try{
      if(force||payload.force||drift>1.05&&now-lastHardSeekAt>2200){suppressUntil=now+1300;lastHardSeekAt=now;s.lastRemoteApply=now;if(Number.isFinite(target))v.currentTime=target;hard=true}
      if(payload.paused){if(!v.paused){suppressUntil=Math.max(suppressUntil,now+900);s.lastRemoteApply=now;v.pause()}if(Math.abs((v.playbackRate||1)-baseRate)>.015)v.playbackRate=baseRate}
      else{
        if(v.paused){suppressUntil=Math.max(suppressUntil,now+900);s.lastRemoteApply=now;await v.play().catch(()=>{})}
        if(!hard&&drift>.18&&drift<=1.05){const correction=clamp(-signed*.055,-.06,.06),desired=clamp(baseRate+correction,.75,2);if(Math.abs((v.playbackRate||1)-desired)>.008){suppressUntil=Math.max(suppressUntil,now+500);v.playbackRate=desired}}
        else if(Math.abs((v.playbackRate||1)-baseRate)>.012){suppressUntil=Math.max(suppressUntil,now+500);v.playbackRate=baseRate}
      }
    }catch(error){console.warn('LX Watch Party V14.4 sync',error)}
    lastSnapshotAt=now;updateBadge(hard?'Sincronizado agora':drift>.45?`Sincronizando · ${drift.toFixed(1)}s`:'Sincronizado');
  }
  async function onSnapshot(payload={}){const room=st()?.room;if(!room||room.role==='host')return;if(room.hostId&&String(payload.sender||'')!==String(room.hostId))return;await applyRemote(payload,!!payload.force)}
  async function onControl(payload={}){const room=st()?.room;if(!room||String(payload.sender||'')===uid())return;await applyRemote(payload,true);if(room.role==='host')setTimeout(()=>sendSnapshot('authoritative',true),100)}
  function requestSync(force=true){const room=st()?.room;if(!room)return;updateBadge('Sincronizando…');if(room.role==='host'){sendSnapshot('manual',force);updateBadge('Sincronizado')}else send('sync-request',{force,contentId:room.contentId})}

  function ping(){if(!subscribed||!st()?.room)return;const token=`${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;pendingPings.set(token,performance.now());send('ping',{token});setTimeout(()=>pendingPings.delete(token),7000)}
  function pong(payload={}){const token=String(payload.token||''),start=pendingPings.get(token);if(start==null)return;pendingPings.delete(token);const sample=performance.now()-start;if(Number.isFinite(sample)&&sample>0&&sample<5000)rttMs=rttMs*.72+sample*.28}

  function ensureSyncButton(){const actions=$('lxWatchPartyHud')?.querySelector?.('.lx-wp-actions');if(!actions)return;let btn=actions.querySelector('[data-wp-sync-v144]');if(btn)return;btn=document.createElement('button');btn.type='button';btn.dataset.wpSyncV144='1';btn.title='Sincronizar agora';btn.innerHTML='<span aria-hidden="true">⟳</span><span>Sincronizar</span>';btn.style.cssText='display:inline-flex;align-items:center;gap:5px;min-width:max-content;padding:0 10px;font-size:9px;font-weight:800';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();requestSync(true)});actions.insertBefore(btn,actions.querySelector('[data-wp="fullscreen"]')||actions.firstChild)}
  function interceptShareQuality(){if(document.documentElement.dataset.lxWpShareQualityV144==='1')return;document.documentElement.dataset.lxWpShareQualityV144='1';document.addEventListener('click',e=>{if(!st()?.room)return;const btn=e.target?.closest?.('#lxCallOverlay button,#lxCallOverlay [role="button"]');if(!btn)return;const text=`${btn.textContent||''} ${btn.getAttribute('title')||''} ${btn.getAttribute('aria-label')||''}`.toLowerCase();if(!/(compartilhar|transmitir).{0,14}tela|tela.{0,14}(compartilhar|transmitir)/.test(text))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();api()?.openQualityPanel?.('tx')},true)}

  async function stopRoom(){clearInterval(pulse);pulse=null;clearInterval(pingTimer);pingTimer=null;subscribed=false;channelStartedAt=0;clearOwnVideoListeners();pendingPings.clear();const c=db(),old=channel;channel=null;roomKey='';if(c&&old)try{await c.removeChannel(old)}catch{}}
  async function startRoom(){
    if(starting)return;const room=st()?.room,c=db();if(!room||!c)return;const key=String(room.id);if(roomKey===key&&channel&&subscribed)return;
    starting=true;try{
      await stopRoom();disableLegacySync();roomKey=key;sequence=0;lastHardSeekAt=0;lastSnapshotAt=0;rttMs=160;channelStartedAt=Date.now();
      const ch=c.channel('lx-watch-sync-v144-'+key,{config:{broadcast:{self:false,ack:false}}});channel=ch;
      ch.on('broadcast',{event:'snapshot'},({payload})=>onSnapshot(payload||{}));
      ch.on('broadcast',{event:'control'},({payload})=>onControl(payload||{}));
      ch.on('broadcast',{event:'sync-request'},({payload})=>{if(st()?.room?.role==='host')sendSnapshot('sync-request',payload?.force!==false)});
      ch.on('broadcast',{event:'ping'},({payload})=>send('pong',{token:payload?.token}));
      ch.on('broadcast',{event:'pong'},({payload})=>pong(payload||{}));
      ch.subscribe(status=>{
        if(status==='SUBSCRIBED'){
          subscribed=true;const v=movieVideo();if(v)bindVideo(v);ensureSyncButton();
          clearInterval(pulse);pulse=setInterval(()=>{const s=st(),mv=movieVideo();if(!s?.room||!mv)return;disableLegacySync();if(boundVideo!==mv)bindVideo(mv);ensureSyncButton();if(s.room.role==='host')sendSnapshot('heartbeat',false);else if(Date.now()-lastSnapshotAt>3200)requestSync(false)},1500);
          clearInterval(pingTimer);pingTimer=setInterval(ping,4500);ping();
          if(st()?.room?.role==='host')setTimeout(()=>sendSnapshot('authoritative',true),100);else setTimeout(()=>requestSync(true),140);
        }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){subscribed=false}
      });
    }finally{starting=false}
  }
  function monitorRoom(){const room=st()?.room;if(!room){if(roomKey||channel)stopRoom().catch(()=>{});return}disableLegacySync();ensureSyncButton();interceptShareQuality();const v=movieVideo();if(v&&boundVideo!==v)bindVideo(v);if(!channel||String(room.id)!==roomKey||!subscribed&&channelStartedAt&&Date.now()-channelStartedAt>4500)startRoom().catch(e=>console.warn('LX Watch Party V14.4 reconnect',e))}
  function boot(){interceptShareQuality();clearInterval(monitor);monitor=setInterval(monitorRoom,300);monitorRoom();window.LXWatchPartySyncV144={version:VERSION,syncNow:()=>requestSync(true),get rttMs(){return rttMs},get roomId(){return roomKey}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
