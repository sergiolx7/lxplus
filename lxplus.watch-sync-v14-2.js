/* LX Plus — Watch Party Sync Guard V14.2
   Stabilizes synchronized playback without touching call/screen-share internals.
   - host-only heartbeat
   - no cross-device Date.now() transit compensation
   - ignores stale/out-of-order sync packets
   - explicit seeks sync immediately; heartbeat only corrects large drift
   - suppresses seek echo after remote corrections
*/
(()=>{'use strict';
  const VERSION='14.2';
  let roomId='',channel=null,heartbeat=null,watcher=null,sequence=0,suppressUntil=0,remoteSeekUntil=0,lastHardSeekAt=0,patching=false;
  const lastSeq=new Map();
  const uid=()=>String(window.LX?.cloud?.user?.()?.id||window.LX?.ui?.state?.user?.id||'');
  const db=()=>window.LX?.cloud?.db?.()||null;
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};
  const api=()=>window.LXWatchPartyV14||null;
  const st=()=>api()?.state||null;
  const movieVideo=()=>st()?.video||window.LXWatchTogetherV10?.activeMovieVideo?.()||document.getElementById('lxGlobalCinema')?.shadowRoot?.querySelector?.('#video,video')||null;

  function send(event,payload={}){
    const s=st(),room=s?.room;if(!channel||!room)return null;
    try{return channel.send({type:'broadcast',event,payload:{...payload,sender:uid(),roomId:room.id}})}catch{return null}
  }
  function statePayload(reason='state'){
    const s=st(),v=movieVideo();return {reason,seq:++sequence,contentId:s?.room?.contentId,time:Number(v?.currentTime||0),paused:!!v?.paused,rate:Number(v?.playbackRate||1)};
  }
  function sendState(reason='state'){
    if(!st()?.room||!movieVideo())return;send('sync',statePayload(reason));
  }
  function updateBadge(drift=0,forced=false){
    const el=document.getElementById('lxWpSync');if(!el)return;
    el.textContent=forced?'Sincronização ajustada':drift>4?'Reajustando sincronização…':drift>1.5?'Sincronizando…':'Sincronizado';
  }
  function removeCurrentVideoListeners(s){
    if(!s||!Array.isArray(s.videoCleanup))return;
    for(const row of s.videoCleanup){try{row?.[0]?.removeEventListener?.(row?.[1],row?.[2])}catch{}}
    s.videoCleanup.length=0;
  }
  function bindVideo(video){
    const s=st();if(!s||!video)return;
    removeCurrentVideoListeners(s);
    clearInterval(s.syncTimer);s.syncTimer=null;
    s.video=video;
    const on=(type,fn)=>{video.addEventListener(type,fn,{passive:true});s.videoCleanup.push([video,type,fn])};
    const emit=kind=>{
      const now=Date.now();
      if(now<suppressUntil||now-Number(s.lastRemoteApply||0)<1200)return;
      if(kind==='seek'&&now<remoteSeekUntil){remoteSeekUntil=0;return}
      sendState(kind);
    };
    on('play',()=>emit('play'));
    on('pause',()=>emit('pause'));
    on('seeked',()=>emit('seek'));
    on('ratechange',()=>emit('rate'));
    s.syncTimer=setInterval(()=>{
      const current=st(),v=movieVideo();
      if(current?.room?.role==='host'&&v&&!v.paused)sendState('heartbeat');
    },3500);
  }
  async function stableSync(payload={}){
    const s=st(),room=s?.room,sender=String(payload.sender||'');
    if(!room||!sender||sender===uid()||Number(payload.contentId)!==Number(room.contentId))return;
    const seq=Number(payload.seq||0),seen=lastSeq.get(sender)||0;
    if(seq&&seq<=seen)return;
    if(seq)lastSeq.set(sender,seq);
    const reason=String(payload.reason||'state');
    if(reason==='heartbeat'&&room.role==='host')return;
    const v=movieVideo();if(!v)return;
    if(s.video!==v)bindVideo(v);
    const target=Number(payload.time||0),local=Number(v.currentTime||0),drift=Math.abs(local-target),now=Date.now();
    const heartbeatMsg=reason==='heartbeat';
    const explicitSeek=reason==='seek';
    const initialSync=reason==='join'||reason==='peer-ready';
    let seek=false;
    if(Number.isFinite(target)){
      if(explicitSeek)seek=drift>.35;
      else if(initialSync)seek=drift>.8;
      else if(heartbeatMsg)seek=drift>4&&now-lastHardSeekAt>8000;
      else seek=drift>2.5&&now-lastHardSeekAt>5000;
    }
    let applied=false;
    try{
      if(seek){
        suppressUntil=now+1800;remoteSeekUntil=now+8000;lastHardSeekAt=now;s.lastRemoteApply=now;
        v.currentTime=Math.max(0,target);applied=true;
      }
      const rate=Number(payload.rate||1)||1;
      if(Math.abs((v.playbackRate||1)-rate)>.05){suppressUntil=Math.max(suppressUntil,now+1400);s.lastRemoteApply=now;v.playbackRate=rate;applied=true}
      if(payload.paused&&!v.paused){suppressUntil=Math.max(suppressUntil,now+1400);s.lastRemoteApply=now;v.pause();applied=true}
      else if(!payload.paused&&v.paused){suppressUntil=Math.max(suppressUntil,now+1400);s.lastRemoteApply=now;await v.play().catch(()=>{});applied=true}
    }catch(error){console.warn('LX Watch Party stable sync',error)}
    updateBadge(drift,seek&&applied);
  }
  async function qualityRequest(payload={}){
    const a=api(),s=st(),track=s?.lastDisplayTrack;if(!a||!track)return;
    const key=String(payload.key||'auto');
    try{await a.constrainTrack?.(track,key);s.txQuality=key;send('quality-state',{key})}catch{}
  }
  function qualityState(payload={}){
    const key=String(payload.key||'');if(!key)return;
    const label=key==='high'?'1080p':key==='balanced'?'720p':key==='low'?'540p':'Auto';
    const el=document.getElementById('lxWpSync');if(el)el.textContent=`Transmissão ${label} · sincronizado`;
  }
  async function replaceChannel(){
    if(patching)return false;
    const a=api(),s=st(),room=s?.room,c=db(),old=s?.channel;
    if(!a||!s||!room||!c||!old)return false;
    if(roomId===String(room.id)&&channel&&s.channel===channel)return true;
    patching=true;
    try{
      clearInterval(heartbeat);heartbeat=null;lastSeq.clear();sequence=0;suppressUntil=0;remoteSeekUntil=0;lastHardSeekAt=0;
      try{await c.removeChannel(old)}catch{}
      const ch=c.channel('lx-watch-party-'+room.id,{config:{broadcast:{self:false,ack:false}}});
      ch.on('broadcast',{event:'sync'},({payload})=>stableSync(payload||{}));
      ch.on('broadcast',{event:'ready'},()=>{if(st()?.room?.role==='host')sendState('peer-ready')});
      ch.on('broadcast',{event:'quality-request'},({payload})=>qualityRequest(payload||{}));
      ch.on('broadcast',{event:'quality-state'},({payload})=>qualityState(payload||{}));
      ch.on('broadcast',{event:'leave'},()=>{toast('A outra pessoa saiu da sessão sincronizada.');api()?.leaveRoom?.({keepMovie:true,silent:true})});
      channel=ch;roomId=String(room.id);s.channel=ch;
      ch.subscribe(status=>{
        if(status!=='SUBSCRIBED')return;
        const current=st()?.room;
        if(!current)return;
        const v=movieVideo();if(v)bindVideo(v);
        if(current.role==='guest')send('ready',{seq:++sequence});
        else sendState('peer-ready');
      });
      return true;
    }finally{patching=false}
  }
  function resetIfIdle(){
    const s=st();if(s?.room)return;
    roomId='';channel=null;lastSeq.clear();clearInterval(heartbeat);heartbeat=null;suppressUntil=0;remoteSeekUntil=0;lastHardSeekAt=0;patching=false;
  }
  function tick(){
    const s=st();
    if(!s?.room){resetIfIdle();return}
    if(!s.channel)return;
    replaceChannel().catch(e=>console.warn('LX Watch Party sync guard',e));
    const v=movieVideo();if(v&&s.video!==v)bindVideo(v);
  }
  function boot(){
    clearInterval(watcher);watcher=setInterval(tick,280);tick();
    window.LXWatchPartySyncV142={version:VERSION,repatch:replaceChannel,get roomId(){return roomId}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
