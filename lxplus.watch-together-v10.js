/* LX Plus — Watch Together V10
   Echo-safe screen-share audio for community calls.
   Loaded only after the app is visible.
   Strategy:
   - keep screen video from getDisplayMedia
   - when LX Player is active, replace captured tab/system audio with audio captured
     directly from the LX Player video element
   - if movie audio cannot be captured while a remote call is active, remove screen
     audio instead of risking the remote participant hearing their own voice back
   - local microphone remains handled by the existing call mixer
   - loads Player Audio V10 post-login so large-movie audio repair stays inside LX Player
   - loads Detail + Watch Invite V12 post-login for compact scrollable media details
*/
(()=>{'use strict';
  const PATCH='__lxWatchTogetherV10',AUDIO_SCRIPT_ID='lxPlayerAudioV10Script',DETAIL_SCRIPT_ID='lxDetailWatchV12Script';
  let lastMode='idle',patchTimer=0;
  const toast=msg=>{try{window.LX?.toast?.(msg)}catch{}};

  function loadPlayerAudio(){
    if(window.LXPlayerAudioV10||document.getElementById(AUDIO_SCRIPT_ID))return;
    const script=document.createElement('script');
    script.id=AUDIO_SCRIPT_ID;script.src='lxplus.player-audio-v10.js?v=20260926-1';script.async=true;
    script.onerror=()=>console.warn('LX Watch Together: Player Audio V10 load failed');
    document.body.appendChild(script);
  }

  function loadDetailWatch(){
    if(window.LXDetailWatchV12||document.getElementById(DETAIL_SCRIPT_ID))return;
    const script=document.createElement('script');
    script.id=DETAIL_SCRIPT_ID;script.src='lxplus.detail-watch-v12.js?v=20260926-1';script.async=true;
    script.onerror=()=>console.warn('LX Watch Together: Detail Watch V12 load failed');
    document.body.appendChild(script);
  }

  function activeMovieVideo(){
    const host=document.getElementById('lxGlobalCinema');
    const root=host?.shadowRoot;
    const video=root?.querySelector?.('#video, video');
    if(!video||video.readyState<1)return null;
    return video;
  }

  function remoteCallAudioActive(){
    const el=document.getElementById('lxRemoteAudio');
    if(!el)return false;
    if(!el.srcObject)return false;
    const tracks=el.srcObject?.getAudioTracks?.()||[];
    return tracks.some(track=>track.readyState==='live');
  }

  function movieAudioTrack(){
    const video=activeMovieVideo();
    if(!video)return null;
    const capture=video.captureStream||video.mozCaptureStream;
    if(typeof capture!=='function')return null;
    try{
      const stream=capture.call(video);
      const track=stream?.getAudioTracks?.().find(t=>t.readyState==='live')||null;
      if(!track)return null;
      try{track.contentHint='music'}catch{}
      track.__lxMovieAudio=true;
      return track;
    }catch(error){
      console.warn('LX Watch Together: movie audio capture unavailable',error);
      return null;
    }
  }

  function makeSafeDisplayStream(display){
    if(!display?.getVideoTracks)return display;
    const displayVideo=display.getVideoTracks();
    const displayAudio=display.getAudioTracks?.()||[];
    const movieTrack=movieAudioTrack();
    const callActive=remoteCallAudioActive();

    if(movieTrack){
      displayAudio.forEach(track=>{try{track.stop()}catch{}});
      const safe=new MediaStream([...displayVideo,movieTrack]);
      safe.__lxAudioIsolation='movie';
      const screenTrack=displayVideo[0];
      if(screenTrack)screenTrack.addEventListener('ended',()=>{try{movieTrack.stop()}catch{}},{once:true});
      lastMode='movie';
      queueMicrotask(()=>toast('Áudio isolado: filme + conversa sem retorno da voz da outra pessoa.'));
      return safe;
    }

    if(callActive&&displayAudio.length){
      displayAudio.forEach(track=>{try{track.stop()}catch{}});
      const safe=new MediaStream(displayVideo);
      safe.__lxAudioIsolation='mic-only';
      lastMode='mic-only';
      queueMicrotask(()=>toast('Proteção contra eco ativada. O áudio da tela foi isolado; a conversa continua normal.'));
      return safe;
    }

    lastMode=displayAudio.length?'screen':'video-only';
    return display;
  }

  function wrapShareScreen(){
    const social=window.LX?.social;
    if(!social||typeof social.shareScreen!=='function'||social.shareScreen[PATCH])return false;
    const original=social.shareScreen;
    const wrapped=async function(...args){
      const media=navigator.mediaDevices;
      const native=media?.getDisplayMedia;
      if(typeof native!=='function')return original.apply(this,args);
      const bound=native.bind(media);
      let patched=false;
      const interceptor=async constraints=>{
        const display=await bound(constraints);
        return makeSafeDisplayStream(display);
      };
      try{
        media.getDisplayMedia=interceptor;
        patched=media.getDisplayMedia===interceptor;
      }catch(error){console.warn('LX Watch Together: display interceptor unavailable',error)}
      try{
        return await original.apply(this,args);
      }finally{
        if(patched){try{media.getDisplayMedia=native}catch{}}
      }
    };
    wrapped[PATCH]=true;
    wrapped.__original=original;
    social.shareScreen=wrapped;
    return true;
  }

  function decorateCall(){
    const overlay=document.getElementById('lxCallOverlay');
    if(!overlay||overlay.querySelector('.lx-watch-audio-safe'))return;
    const stage=overlay.querySelector('.lx-call-stage')||overlay;
    const chip=document.createElement('div');
    chip.className='lx-watch-audio-safe';
    chip.textContent='Áudio protegido contra eco';
    chip.style.cssText='position:absolute;z-index:40;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);padding:7px 11px;border-radius:999px;border:1px solid color-mix(in srgb,var(--accent,#8a2be2) 30%,rgba(255,255,255,.10));background:rgba(6,8,14,.76);backdrop-filter:blur(14px);color:#d9ddea;font:750 9px/1 system-ui;letter-spacing:.02em;pointer-events:none;opacity:.86';
    stage.appendChild(chip);
  }

  function boot(){
    loadPlayerAudio();loadDetailWatch();wrapShareScreen();decorateCall();
    patchTimer=setInterval(()=>{loadPlayerAudio();loadDetailWatch();wrapShareScreen();decorateCall()},800);
    window.LXWatchTogetherV10={
      version:'10.2',
      get mode(){return lastMode},
      activeMovieVideo,
      movieAudioTrack,
      repatch:wrapShareScreen,
      loadPlayerAudio,
      loadDetailWatch
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
