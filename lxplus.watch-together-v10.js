/* LX Plus — Watch Together V10.7
   Echo-aware screen-share audio for community calls.
   - always requests screen/tab audio when sharing
   - prefers audio captured directly from the LX Player, keeping remote voice out of the shared movie audio
   - falls back to the browser-provided tab/system audio instead of silently stripping it
   - builds a Web Audio bridge when captureStream() does not expose an audio track
   - local microphone remains handled by the existing call mixer
   - Watch Party Drive playback is converted to native LX Player before sync starts
*/
(()=>{'use strict';
  const PATCH='__lxWatchTogetherV10',AUDIO_SCRIPT_ID='lxPlayerAudioV10Script',DETAIL_SCRIPT_ID='lxDetailWatchV12Script',MODAL_SCRIPT_ID='lxModalSafetyV13Script',PARTY_SCRIPT_ID='lxWatchPartyV14Script',NATIVE_SCRIPT_ID='lxWatchPartyNativeV15Script',SYNC_SCRIPT_ID='lxWatchSyncV144Script';
  let lastMode='idle',patchTimer=0;
  const audioBridges=new WeakMap();
  const toast=msg=>{try{window.LX?.toast?.(msg)}catch{}};

  function loadScriptOnce(id,src,ready,label){
    if(ready?.()||document.getElementById(id))return;
    const script=document.createElement('script');script.id=id;script.src=src;script.async=true;
    script.onerror=()=>console.warn(`LX Watch Together: ${label} load failed`);document.body.appendChild(script);
  }
  function loadPlayerAudio(){loadScriptOnce(AUDIO_SCRIPT_ID,'lxplus.player-audio-v10.js?v=20260926-1',()=>window.LXPlayerAudioV10,'Player Audio V10')}
  function loadDetailWatch(){loadScriptOnce(DETAIL_SCRIPT_ID,'lxplus.detail-watch-v12.js?v=20260926-3',()=>window.LXDetailWatchV12,'Detail Watch V12')}
  function loadModalSafety(){loadScriptOnce(MODAL_SCRIPT_ID,'lxplus.modal-safety-v13.js?v=20260926-2',()=>window.LXModalSafetyV13,'Modal Safety V13')}
  function loadWatchParty(){loadScriptOnce(PARTY_SCRIPT_ID,'lxplus.watch-party-v14.js?v=20260926-2',()=>window.LXWatchPartyV14,'Watch Party V14')}
  function loadNative(){if(!window.LXWatchPartyV14)return;loadScriptOnce(NATIVE_SCRIPT_ID,'lxplus.watch-party-native-v15.js?v=20260926-1',()=>window.LXWatchPartyNativeV15,'Watch Party Native V15')}
  function loadSync(){if(!window.LXWatchPartyV14||!window.LXWatchPartyNativeV15)return;loadScriptOnce(SYNC_SCRIPT_ID,'lxplus.watch-sync-v14-4.js?v=20260926-2',()=>window.LXWatchPartySyncV144,'Watch Sync V14.4')}

  function activeMovieVideo(){
    const host=document.getElementById('lxGlobalCinema'),root=host?.shadowRoot;
    const video=root?.querySelector?.('#video, video');
    if(!video||video.readyState<1)return null;
    return video;
  }
  function remoteCallAudioActive(){
    const el=document.getElementById('lxRemoteAudio'),tracks=el?.srcObject?.getAudioTracks?.()||[];
    return tracks.some(track=>track.readyState==='live');
  }
  async function webAudioMovieTrack(video){
    if(!video)return null;
    try{
      let bridge=audioBridges.get(video);
      if(!bridge){
        const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;
        const ctx=new Ctx(),source=ctx.createMediaElementSource(video),dest=ctx.createMediaStreamDestination();
        source.connect(ctx.destination);source.connect(dest);bridge={ctx,source,dest};audioBridges.set(video,bridge);
      }
      if(bridge.ctx.state==='suspended')await bridge.ctx.resume().catch(()=>{});
      const track=bridge.dest.stream.getAudioTracks().find(t=>t.readyState==='live')||null;
      return track?.clone?.()||track;
    }catch(error){console.warn('LX Watch Together: Web Audio movie bridge unavailable',error);return null}
  }
  async function movieAudioTrack(){
    const video=activeMovieVideo();if(!video)return null;
    const capture=video.captureStream||video.mozCaptureStream;
    if(typeof capture==='function'){
      try{
        const stream=capture.call(video),track=stream?.getAudioTracks?.().find(t=>t.readyState==='live')||null;
        if(track){const copy=track.clone?.()||track;try{copy.contentHint='music'}catch{};copy.__lxMovieAudio=true;return copy}
      }catch(error){console.warn('LX Watch Together: captureStream movie audio unavailable',error)}
    }
    const bridged=await webAudioMovieTrack(video);
    if(bridged){try{bridged.contentHint='music'}catch{};bridged.__lxMovieAudio=true;return bridged}
    return null;
  }

  async function makeSafeDisplayStream(display){
    if(!display?.getVideoTracks)return display;
    const displayVideo=display.getVideoTracks(),displayAudio=display.getAudioTracks?.()||[],movieTrack=await movieAudioTrack();
    if(movieTrack){
      displayAudio.forEach(track=>{try{track.stop()}catch{}});
      const safe=new MediaStream([...displayVideo,movieTrack]);safe.__lxAudioIsolation='movie';
      displayVideo[0]?.addEventListener('ended',()=>{try{movieTrack.stop()}catch{}},{once:true});
      lastMode='movie';queueMicrotask(()=>toast('Transmissão com áudio do filme ativada.'));
      return safe;
    }
    if(displayAudio.length){
      lastMode=remoteCallAudioActive()?'screen-audio-fallback':'screen';
      queueMicrotask(()=>toast('Áudio da aba/tela ativado na transmissão.'));
      return display;
    }
    lastMode='video-only';
    queueMicrotask(()=>toast('A tela foi compartilhada sem áudio. Na Watch Party, o filme continua tocando localmente sincronizado.'));
    return display;
  }

  function wrapShareScreen(){
    const social=window.LX?.social;
    if(!social||typeof social.shareScreen!=='function'||social.shareScreen[PATCH])return false;
    const original=social.shareScreen;
    const wrapped=async function(...args){
      const media=navigator.mediaDevices,native=media?.getDisplayMedia;
      if(typeof native!=='function')return original.apply(this,args);
      const bound=native.bind(media);let patched=false;
      const interceptor=async constraints=>{
        const requested={...(constraints||{}),audio:true};
        const display=await bound(requested);
        return await makeSafeDisplayStream(display);
      };
      try{media.getDisplayMedia=interceptor;patched=media.getDisplayMedia===interceptor}catch(error){console.warn('LX Watch Together: display interceptor unavailable',error)}
      try{return await original.apply(this,args)}finally{if(patched){try{media.getDisplayMedia=native}catch{}}}
    };
    wrapped[PATCH]=true;wrapped.__original=original;social.shareScreen=wrapped;return true;
  }

  function decorateCall(){
    const overlay=document.getElementById('lxCallOverlay');if(!overlay)return;
    let chip=overlay.querySelector('.lx-watch-audio-safe');
    if(!chip){
      const stage=overlay.querySelector('.lx-call-stage')||overlay;chip=document.createElement('div');chip.className='lx-watch-audio-safe';
      chip.style.cssText='position:absolute;z-index:40;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);padding:7px 11px;border-radius:999px;border:1px solid color-mix(in srgb,var(--accent,#8a2be2) 30%,rgba(255,255,255,.10));background:rgba(6,8,14,.76);backdrop-filter:blur(14px);color:#d9ddea;font:750 9px/1 system-ui;letter-spacing:.02em;pointer-events:none;opacity:.86';stage.appendChild(chip);
    }
    const inParty=!!window.LXWatchPartyV14?.state?.room;
    chip.textContent=inParty?'Filme sincronizado · vozes separadas':lastMode==='movie'?'Filme + áudio compartilhados':lastMode==='screen'||lastMode==='screen-audio-fallback'?'Tela + áudio compartilhados':'Áudio da transmissão protegido';
  }

  function boot(){
    loadPlayerAudio();loadDetailWatch();loadModalSafety();loadWatchParty();loadNative();loadSync();wrapShareScreen();decorateCall();
    patchTimer=setInterval(()=>{loadPlayerAudio();loadDetailWatch();loadModalSafety();loadWatchParty();loadNative();loadSync();wrapShareScreen();decorateCall()},800);
    window.LXWatchTogetherV10={version:'10.7',get mode(){return lastMode},activeMovieVideo,movieAudioTrack,repatch:wrapShareScreen,loadPlayerAudio,loadDetailWatch,loadModalSafety,loadWatchParty,loadNative,loadSync};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
