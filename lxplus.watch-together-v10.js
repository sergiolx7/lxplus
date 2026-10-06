/* LX Plus — Watch Together V10.9
   Single-runtime, echo-safe screen sharing for community calls.
   Uses Player Audio V11 so compatibility audio is also shared to invited viewers.
*/
(()=>{'use strict';
  if(window.__LX_WATCH_TOGETHER_V109)return;
  window.__LX_WATCH_TOGETHER_V109=true;
  const PATCH='__lxWatchTogetherV10',AUDIO_SCRIPT_ID='lxPlayerAudioV11Script',RUNTIME_SCRIPT_ID='lxWatchRuntimeV16Script';
  let lastMode='idle',patchTimer=0;
  const audioBridges=new WeakMap();
  const toast=msg=>{try{window.LX?.toast?.(msg)}catch{}};

  function loadScriptOnce(id,src,ready,label){
    if(ready?.()||document.getElementById(id))return;
    const script=document.createElement('script');script.id=id;script.src=src;script.async=true;
    script.onerror=()=>console.warn(`LX Watch Together: ${label} load failed`);document.body.appendChild(script);
  }
  function loadPlayerAudio(){loadScriptOnce(AUDIO_SCRIPT_ID,'lxplus.player-audio-v11.js?v=UI26',()=>window.LXPlayerAudioV11,'Player Audio V11')}
  function loadWatchRuntime(){loadScriptOnce(RUNTIME_SCRIPT_ID,'lxplus.watch-runtime-v16.js?v=UI26',()=>window.__LX_WATCH_RUNTIME_V16,'Watch Runtime V16')}

  function activeMovieVideo(){
    const h=document.getElementById('lxGlobalCinema'),root=h?.shadowRoot,video=root?.querySelector?.('#video, video');
    if(!video||video.readyState<1)return null;return video;
  }
  function inWatchParty(){return !!window.LXWatchPartyV14?.state?.room}
  function remoteCallAudioActive(){const el=document.getElementById('lxRemoteAudio'),tracks=el?.srcObject?.getAudioTracks?.()||[];return tracks.some(track=>track.readyState==='live')}

  async function webAudioMovieTrack(video){
    if(!video)return null;
    try{
      let bridge=audioBridges.get(video);
      if(!bridge){
        const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;
        const ctx=new Ctx(),source=ctx.createMediaElementSource(video),dest=ctx.createMediaStreamDestination();source.connect(ctx.destination);source.connect(dest);bridge={ctx,source,dest};audioBridges.set(video,bridge);
      }
      if(bridge.ctx.state==='suspended')await bridge.ctx.resume().catch(()=>{});
      const track=bridge.dest.stream.getAudioTracks().find(t=>t.readyState==='live')||null;return track?.clone?.()||track;
    }catch(error){console.warn('LX Watch Together: Web Audio movie bridge unavailable',error);return null}
  }
  async function movieAudioTrack(){
    const video=activeMovieVideo();if(!video)return null;
    try{
      const compatible=window.LXPlayerAudioV11?.captureTrack?.(video);
      if(compatible){try{compatible.contentHint='music'}catch{};compatible.__lxMovieAudio=true;return compatible}
    }catch(error){console.warn('LX Watch Together: compatibility audio capture unavailable',error)}
    const capture=video.captureStream||video.mozCaptureStream;
    if(typeof capture==='function'){
      try{const track=capture.call(video)?.getAudioTracks?.().find(t=>t.readyState==='live')||null;if(track){const copy=track.clone?.()||track;try{copy.contentHint='music'}catch{};copy.__lxMovieAudio=true;return copy}}catch(error){console.warn('LX Watch Together: captureStream movie audio unavailable',error)}
    }
    const bridged=await webAudioMovieTrack(video);if(bridged){try{bridged.contentHint='music'}catch{};bridged.__lxMovieAudio=true;return bridged}return null;
  }

  async function makeSafeDisplayStream(display){
    if(!display?.getVideoTracks)return display;
    const displayVideo=display.getVideoTracks(),displayAudio=display.getAudioTracks?.()||[],movieTrack=await movieAudioTrack();
    if(movieTrack){displayAudio.forEach(track=>{try{track.stop()}catch{}});const safe=new MediaStream([...displayVideo,movieTrack]);safe.__lxAudioIsolation='movie';displayVideo[0]?.addEventListener('ended',()=>{try{movieTrack.stop()}catch{}},{once:true});lastMode='movie';queueMicrotask(()=>toast('Transmissão com áudio isolado do filme ativada.'));return safe}
    if(inWatchParty()){displayAudio.forEach(track=>{try{track.stop()}catch{}});const visualOnly=new MediaStream(displayVideo);visualOnly.__lxAudioIsolation='watch-party-local-audio';lastMode='watch-party-local-audio';queueMicrotask(()=>toast('Tela compartilhada. O filme continua com áudio local sincronizado, sem retorno da voz.'));return visualOnly}
    if(displayAudio.length){lastMode=remoteCallAudioActive()?'screen-audio-fallback':'screen';queueMicrotask(()=>toast('Áudio da aba/tela ativado na transmissão.'));return display}
    lastMode='video-only';queueMicrotask(()=>toast('A tela foi compartilhada sem áudio.'));return display;
  }

  function wrapShareScreen(){
    const social=window.LX?.social;if(!social||typeof social.shareScreen!=='function'||social.shareScreen[PATCH])return false;
    const original=social.shareScreen;
    const wrapped=async function(...args){
      const media=navigator.mediaDevices,native=media?.getDisplayMedia;if(typeof native!=='function')return original.apply(this,args);
      const bound=native.bind(media);let patched=false;
      const interceptor=async constraints=>{const requested={...(constraints||{}),audio:true},display=await bound(requested);return await makeSafeDisplayStream(display)};
      try{media.getDisplayMedia=interceptor;patched=media.getDisplayMedia===interceptor}catch(error){console.warn('LX Watch Together: display interceptor unavailable',error)}
      try{return await original.apply(this,args)}finally{if(patched){try{media.getDisplayMedia=native}catch{}}}
    };
    wrapped[PATCH]=true;wrapped.__original=original;social.shareScreen=wrapped;return true;
  }

  function decorateCall(){
    const overlay=document.getElementById('lxCallOverlay');if(!overlay)return;let chip=overlay.querySelector('.lx-watch-audio-safe');
    if(!chip){const stage=overlay.querySelector('.lx-call-stage')||overlay;chip=document.createElement('div');chip.className='lx-watch-audio-safe';chip.style.cssText='position:absolute;z-index:40;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);padding:7px 11px;border-radius:999px;border:1px solid color-mix(in srgb,var(--accent,#8a2be2) 30%,rgba(255,255,255,.10));background:rgba(6,8,14,.76);backdrop-filter:blur(14px);color:#d9ddea;font:750 9px/1 system-ui;letter-spacing:.02em;pointer-events:none;opacity:.86';stage.appendChild(chip)}
    const inParty=inWatchParty();chip.textContent=inParty?'Filme sincronizado · vozes separadas':lastMode==='movie'?'Filme + áudio compartilhados':lastMode==='screen'||lastMode==='screen-audio-fallback'?'Tela + áudio compartilhados':'Áudio da transmissão protegido';
  }

  function boot(){
    loadPlayerAudio();loadWatchRuntime();wrapShareScreen();decorateCall();
    clearInterval(patchTimer);patchTimer=setInterval(()=>{loadPlayerAudio();loadWatchRuntime();window.__LX_WATCH_RUNTIME_V16?.health?.();wrapShareScreen();decorateCall()},900);
    window.LXWatchTogetherV10={version:'10.9',get mode(){return lastMode},activeMovieVideo,movieAudioTrack,repatch:wrapShareScreen,loadPlayerAudio,loadWatchRuntime};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
