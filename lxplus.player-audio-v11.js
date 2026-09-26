/* LX Plus — Player Audio V11
   4K/Drive audio compatibility layer.
   Keeps the LX Player visible and can split picture/video and audio playback when needed.
*/
(()=>{'use strict';
  if(window.LXPlayerAudioV11)return;
  const PATCH='lxAudioV11';
  let currentHost=null,repairing=false,watchTimer=0;
  const autoTried=new WeakSet(),bridges=new WeakMap();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const toast=msg=>{try{window.LX?.toast?.(msg)}catch{}};
  const host=()=>document.getElementById('lxGlobalCinema');
  const parts=(h=host())=>{const root=h?.shadowRoot||null;return {h,root,video:root?.querySelector?.('#video,video')||null}};
  const toyStory=h=>/toy\s*story\s*5/i.test(String(h?.getAttribute?.('aria-label')||''));

  function decodedAudio(video){
    if(!video)return null;
    try{if(typeof video.mozHasAudio==='boolean')return video.mozHasAudio}catch{}
    try{if(Number(video.webkitAudioDecodedByteCount)>0)return true;if(typeof video.webkitAudioDecodedByteCount==='number'&&video.readyState>=3&&video.currentTime>.5)return false}catch{}
    try{if(video.audioTracks&&typeof video.audioTracks.length==='number')return video.audioTracks.length>0}catch{}
    const capture=video.captureStream||video.mozCaptureStream;
    if(typeof capture==='function'){
      try{const tracks=capture.call(video)?.getAudioTracks?.()||[];if(tracks.some(t=>t.readyState==='live'))return true}catch{}
    }
    return null;
  }
  function status(root,message,kind='info',hold=5400){
    if(!root)return;let box=root.querySelector('.lx-audio-v11-status');
    if(!box){box=document.createElement('div');box.className='lx-audio-v11-status';box.style.cssText='position:absolute;z-index:33;left:50%;bottom:112px;transform:translateX(-50%);max-width:min(560px,90vw);padding:9px 13px;border-radius:999px;background:rgba(7,9,14,.88);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(18px);color:#fff;font:750 10px/1.35 system-ui;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.38);pointer-events:none';(root.querySelector('#stage,.stage,.root')||root).appendChild(box)}
    box.dataset.kind=kind;box.textContent=message;box.hidden=false;clearTimeout(box.__timer);box.__timer=setTimeout(()=>{box.hidden=true},hold);
  }
  function enableNative(video){
    if(!video)return;try{video.muted=false}catch{}try{if(!Number.isFinite(video.volume)||video.volume<.05)video.volume=1}catch{}try{video.play?.().catch?.(()=>{})}catch{}
  }
  async function waitMedia(media,timeout=3200){
    if(!media)return false;if(media.readyState>=3&&!media.error)return true;
    await Promise.race([new Promise(resolve=>{const done=()=>{cleanup();resolve()};const cleanup=()=>{media.removeEventListener('canplay',done);media.removeEventListener('loadeddata',done);media.removeEventListener('error',done)};media.addEventListener('canplay',done,{once:true});media.addEventListener('loadeddata',done,{once:true});media.addEventListener('error',done,{once:true})}),sleep(timeout)]);
    return !media.error&&media.readyState>=2;
  }
  function bridgeFor(video){return video?bridges.get(video)||null:null}
  function updateBridgeUI(video){
    const bridge=bridgeFor(video),{root,h}=parts();if(!root)return;
    const mute=root.querySelector('#mute'),volume=root.querySelector('#volume'),badge=root.querySelector('#sourceBadge');
    if(bridge?.active){if(mute)mute.textContent=bridge.audio.muted||bridge.audio.volume<=0?'🔇':'🔊';if(volume)volume.value=String(bridge.audio.volume);if(badge&&!/ÁUDIO/i.test(badge.textContent||''))badge.textContent=(badge.textContent||'LX PLAYER')+' · ÁUDIO COMPATÍVEL';if(h)h.dataset.lxAudioCompat='separate'}
    else if(h)delete h.dataset.lxAudioCompat;
  }
  function syncBridge(video,force=false){
    const bridge=bridgeFor(video);if(!bridge?.active)return false;const a=bridge.audio;
    try{a.playbackRate=video.playbackRate||1}catch{}
    try{const drift=Math.abs((a.currentTime||0)-(video.currentTime||0));if(force||drift>.42)a.currentTime=Math.max(0,video.currentTime||0)}catch{}
    if(video.paused||video.ended){try{a.pause()}catch{}}
    else if(a.paused){a.play().catch(()=>{})}
    return true;
  }
  function stopBridge(video,{restoreNative=true}={}){
    const bridge=bridgeFor(video);if(!bridge)return;
    try{bridge.abort.abort()}catch{}try{bridge.audio.pause();bridge.audio.removeAttribute('src');bridge.audio.load();bridge.audio.remove()}catch{}bridges.delete(video);
    if(restoreNative)try{video.muted=false}catch{}updateBridgeUI(video);
  }
  async function startSeparateAudio(video,root,reason='auto'){
    if(!video||!root)return false;const src=String(video.currentSrc||video.src||'');if(!/^https?:/i.test(src))return false;
    const existing=bridgeFor(video);if(existing?.active&&existing.src===src){syncBridge(video,true);return true}
    if(existing)stopBridge(video,{restoreNative:false});
    const audio=document.createElement('audio');audio.id='lxAudioCompatV11';audio.preload='auto';audio.playsInline=true;audio.autoplay=false;audio.style.display='none';audio.src=src;
    try{audio.volume=Math.max(0,Math.min(1,Number(video.volume)||1));audio.muted=false;audio.playbackRate=video.playbackRate||1}catch{}
    const abort=new AbortController(),bridge={audio,src,active:false,abort};bridges.set(video,bridge);(root.querySelector('#stage,.stage,.root')||root).appendChild(audio);
    status(root,'Preparando áudio compatível para o vídeo 4K…','info',7000);
    const ready=await waitMedia(audio,5000);if(!ready){stopBridge(video,{restoreNative:true});return false}
    try{audio.currentTime=Math.max(0,video.currentTime||0)}catch{}
    try{await audio.play()}catch(error){if(error?.name!=='NotAllowedError'){stopBridge(video,{restoreNative:true});return false}}
    bridge.active=true;
    try{video.muted=true}catch{}
    const opt={signal:abort.signal};
    video.addEventListener('play',()=>syncBridge(video,true),opt);video.addEventListener('pause',()=>syncBridge(video),opt);video.addEventListener('seeking',()=>syncBridge(video,true),opt);video.addEventListener('seeked',()=>syncBridge(video,true),opt);video.addEventListener('ratechange',()=>syncBridge(video),opt);video.addEventListener('timeupdate',()=>syncBridge(video),opt);video.addEventListener('ended',()=>{try{audio.pause()}catch{}},opt);
    audio.addEventListener('waiting',()=>status(root,'Sincronizando a faixa de áudio…','info',2600),opt);audio.addEventListener('error',()=>{status(root,'A faixa de áudio deste arquivo também não foi decodificada pelo navegador.','warn');stopBridge(video,{restoreNative:true})},opt);
    root.addEventListener('click',event=>{const target=event.target?.closest?.('#mute');if(!target||!bridge.active)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();audio.muted=!audio.muted;updateBridgeUI(video)},{capture:true,signal:abort.signal});
    root.addEventListener('input',event=>{const target=event.target?.closest?.('#volume');if(!target||!bridge.active)return;event.stopPropagation();event.stopImmediatePropagation();const value=Math.max(0,Math.min(1,Number(target.value)||0));audio.volume=value;audio.muted=value<=0;try{video.volume=value;video.muted=true}catch{}updateBridgeUI(video)},{capture:true,signal:abort.signal});
    updateBridgeUI(video);syncBridge(video,true);
    status(root,'Áudio compatível ativado · imagem 4K mantida no LX Player.','ok',6500);if(reason==='manual')toast('Áudio compatível ativado no LX Player.');
    return true;
  }
  function sourceRows(h){
    const rows=Array.isArray(h?.__lxQualityRows)?h.__lxQualityRows.filter(r=>r?.ref):[],selected=String(h?.__lxSelectedQuality||'auto');
    const priority=r=>/1080|720/i.test(String(r.label||r.q||''))?1:/480|360/i.test(String(r.label||r.q||''))?2:3;
    return rows.filter(r=>String(r.q)!==selected).sort((a,b)=>priority(a)-priority(b));
  }
  async function repair(reason='manual'){
    const {h,root,video}=parts();if(!h||!root||!video||repairing)return false;repairing=true;
    try{
      stopBridge(video,{restoreNative:true});enableNative(video);await sleep(900);let audioState=decodedAudio(video);
      if(audioState===true&&!toyStory(h)){status(root,'Áudio nativo ativo no LX Player.','ok');return true}
      for(const row of sourceRows(h)){
        if(typeof h.__lxSetQuality!=='function')break;let ok=false;try{ok=await h.__lxSetQuality(row)}catch(error){console.warn('LX audio quality switch',error)}if(!ok)continue;
        const next=parts(h).video||video;enableNative(next);await sleep(1500);audioState=decodedAudio(next);if(audioState===true&&!toyStory(h)){status(root,`Áudio compatível encontrado · ${String(row.label||row.q||'fonte alternativa')}`,'ok');return true}
      }
      const current=parts(h).video||video;if(await startSeparateAudio(current,root,reason))return true;
      status(root,'Este arquivo usa uma faixa que o navegador não conseguiu tocar. O LX Player manteve o vídeo e precisa de uma faixa AAC compatível para áudio garantido.','warn',7600);toast('O vídeo continua no LX Player; a faixa original não foi decodificada.');return false;
    }finally{repairing=false}
  }
  function captureTrack(video=parts().video){
    const bridge=bridgeFor(video);const source=bridge?.active?bridge.audio:video;if(!source)return null;const capture=source.captureStream||source.mozCaptureStream;if(typeof capture!=='function')return null;
    try{const track=capture.call(source)?.getAudioTracks?.().find(t=>t.readyState==='live')||null;return track?.clone?.()||track}catch{return null}
  }
  function patch(h=host()){
    if(!h?.shadowRoot||h.dataset?.[PATCH]==='1')return false;const root=h.shadowRoot,video=root.querySelector('#video,video');if(!video)return false;h.dataset[PATCH]='1';currentHost=h;
    for(const selector of ['#audioFix','#soundHelp']){const btn=root.querySelector(selector);if(!btn)continue;btn.classList.remove('hide');btn.textContent='Áudio compatível';btn.title='Ativar modo de áudio compatível dentro do LX Player'}
    const driveFrame=root.querySelector('#driveFallbackFrame');if(driveFrame){driveFrame.classList.add('hide');driveFrame.setAttribute('aria-hidden','true')}root.querySelector('#openDrive')?.style.setProperty('display','none');root.querySelector('#openDriveSettings')?.style.setProperty('display','none');
    root.addEventListener('click',event=>{const target=event.target?.closest?.('#audioFix,#soundHelp');if(!target)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();repair('manual')},true);
    video.addEventListener('playing',()=>{if(autoTried.has(h))return;setTimeout(async()=>{if(autoTried.has(h))return;const state=decodedAudio(video);if(state===false||toyStory(h)){autoTried.add(h);await repair('auto')}},1700)});
    return true;
  }
  function boot(){
    patch();watchTimer=setInterval(()=>{const h=host();if(h!==currentHost){if(currentHost){const old=currentHost.shadowRoot?.querySelector?.('#video,video');if(old)stopBridge(old,{restoreNative:false})}currentHost=h;patch(h)}else patch(h)},650);
    window.LXPlayerAudioV11={version:'11.0',repair,decodedAudio,patch,startSeparateAudio,captureTrack,bridgeFor};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
