/* LX Plus — Player Audio V10
   Keeps audio repair inside LX Player. No Google Drive iframe fallback.
   - unmutes/restores volume first
   - detects decoded audio where browser APIs allow
   - tries already configured native quality/source variants while preserving playback time
   - blocks legacy Drive-preview audio fallback
   - never changes catalog/storage data
*/
(()=>{'use strict';
  const PATCH='lxAudioV10';
  let currentHost=null,repairing=false,autoTried=new WeakSet(),watchTimer=0;
  const toast=msg=>{try{window.LX?.toast?.(msg)}catch{}};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function host(){return document.getElementById('lxGlobalCinema')}
  function parts(h=host()){
    const root=h?.shadowRoot||null;
    return {h,root,video:root?.querySelector?.('#video,video')||null};
  }

  function decodedAudio(video){
    if(!video)return null;
    try{if(typeof video.mozHasAudio==='boolean')return video.mozHasAudio}catch{}
    try{if(Number(video.webkitAudioDecodedByteCount)>0)return true}catch{}
    try{if(video.audioTracks&&typeof video.audioTracks.length==='number')return video.audioTracks.length>0}catch{}
    const capture=video.captureStream||video.mozCaptureStream;
    if(typeof capture==='function'){
      try{
        const stream=capture.call(video),tracks=stream?.getAudioTracks?.()||[];
        if(tracks.length)return true;
        if(video.readyState>=3)return false;
      }catch{}
    }
    return null;
  }

  function enableSound(video){
    if(!video)return;
    try{video.muted=false}catch{}
    try{if(!Number.isFinite(video.volume)||video.volume<.7)video.volume=1}catch{}
    try{video.play?.().catch?.(()=>{})}catch{}
    const {root}=parts();
    const volume=root?.querySelector?.('#volume');if(volume)volume.value=String(video.volume||1);
    const mute=root?.querySelector?.('#mute');if(mute)mute.textContent='🔊';
  }

  function sourceRows(h){
    const rows=Array.isArray(h?.__lxQualityRows)?h.__lxQualityRows.filter(row=>row?.ref):[];
    const selected=String(h?.__lxSelectedQuality||'auto');
    const priority=row=>{
      const label=String(row?.label||row?.q||'').toLowerCase();
      if(/1080|720/.test(label))return 1;
      if(/480|360/.test(label))return 2;
      if(String(row?.q)==='auto')return 4;
      return 3;
    };
    return rows.filter(row=>String(row.q)!==selected).sort((a,b)=>priority(a)-priority(b));
  }

  async function waitForMedia(video,timeout=2400){
    if(!video)return;
    if(video.readyState>=3){await sleep(350);return}
    await Promise.race([
      new Promise(resolve=>{const done=()=>{video.removeEventListener('canplay',done);video.removeEventListener('playing',done);resolve()};video.addEventListener('canplay',done,{once:true});video.addEventListener('playing',done,{once:true})}),
      sleep(timeout)
    ]);
    await sleep(250);
  }

  function status(root,message,kind='info'){
    if(!root)return;
    let box=root.querySelector('.lx-audio-v10-status');
    if(!box){
      box=document.createElement('div');box.className='lx-audio-v10-status';
      box.style.cssText='position:absolute;z-index:31;left:50%;bottom:112px;transform:translateX(-50%);max-width:min(520px,88vw);padding:10px 14px;border-radius:999px;background:rgba(7,8,12,.88);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(18px);color:#fff;font:700 10px/1.35 system-ui;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35);pointer-events:none';
      root.querySelector('#stage,.stage,.root')?.appendChild(box);
    }
    box.dataset.kind=kind;box.textContent=message;box.hidden=false;
    clearTimeout(box.__timer);box.__timer=setTimeout(()=>{box.hidden=true},5200);
  }

  async function repair(reason='manual'){
    const {h,root,video}=parts();if(!h||!root||!video||repairing)return false;
    repairing=true;
    try{
      enableSound(video);await waitForMedia(video,900);
      let audio=decodedAudio(video);
      if(audio===true){status(root,'Áudio ativo no LX Player.','ok');if(reason==='manual')toast('Som ativado no LX Player.');return true}

      const rows=sourceRows(h);
      if(!rows.length){
        const msg=audio===false?'Este arquivo não tem uma faixa de áudio que o navegador consiga decodificar. Use AAC em uma fonte LX compatível.':'Som ativado. Se continuar mudo, este arquivo precisa de uma faixa AAC compatível.';
        status(root,msg,'warn');toast('LX Player permaneceu ativo. O Drive não será aberto.');return false;
      }

      const original=String(h.__lxSelectedQuality||'auto');
      status(root,'Procurando uma fonte de áudio compatível dentro do LX Player…');
      for(const row of rows){
        if(typeof h.__lxSetQuality!=='function')break;
        let ok=false;try{ok=await h.__lxSetQuality(row)}catch(error){console.warn('LX audio source switch',error)}
        if(!ok)continue;
        const next=parts(h).video||video;enableSound(next);await waitForMedia(next,2200);audio=decodedAudio(next);
        if(audio===true){
          const label=String(row.label||row.q||'fonte alternativa');
          status(root,`Áudio compatível encontrado · ${label}`,'ok');toast(`LX Player: áudio corrigido usando ${label}.`);return true;
        }
      }
      status(root,'Nenhuma fonte cadastrada possui áudio compatível neste navegador. Cadastre uma versão H.264 + AAC/HLS; o LX Player não abrirá o Drive.','warn');
      toast('Arquivo precisa de áudio AAC compatível. Permanecendo no LX Player.');
      if(original&&h.__lxSelectedQuality!==original){
        const back=(Array.isArray(h.__lxQualityRows)?h.__lxQualityRows:[]).find(row=>String(row.q)===original);
        if(back&&typeof h.__lxSetQuality==='function')try{await h.__lxSetQuality(back)}catch{}
      }
      return false;
    }finally{repairing=false}
  }

  function patch(h=host()){
    if(!h?.shadowRoot||h.dataset?.[PATCH]==='1')return false;
    const root=h.shadowRoot,video=root.querySelector('#video,video');if(!video)return false;
    h.dataset[PATCH]='1';currentHost=h;

    for(const selector of ['#audioFix','#soundHelp']){
      const btn=root.querySelector(selector);if(!btn)continue;
      btn.textContent='Corrigir áudio';btn.title='Corrigir áudio dentro do LX Player';
    }
    const driveFrame=root.querySelector('#driveFallbackFrame');if(driveFrame){driveFrame.classList.add('hide');driveFrame.setAttribute('aria-hidden','true')}
    const openDrive=root.querySelector('#openDrive');if(openDrive)openDrive.style.display='none';
    const openDriveSettings=root.querySelector('#openDriveSettings');if(openDriveSettings)openDriveSettings.style.display='none';

    root.addEventListener('click',event=>{
      const target=event.target?.closest?.('#audioFix,#soundHelp');if(!target)return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();repair('manual');
    },true);

    const guardFallback=()=>{
      const shell=root.querySelector('#root,.root');if(!shell?.classList.contains('drive-fallback'))return;
      const back=root.querySelector('#returnToLx');
      if(back){back.click();status(root,'Mantendo reprodução no LX Player. O fallback do Google Drive foi bloqueado.','info')}
    };
    if('MutationObserver'in window){new MutationObserver(guardFallback).observe(root.querySelector('#root,.root')||root,{attributes:true,attributeFilter:['class']})}

    video.addEventListener('playing',()=>{
      enableSound(video);
      if(autoTried.has(h))return;
      setTimeout(async()=>{
        const state=decodedAudio(parts(h).video||video);
        if(state===false&&!autoTried.has(h)){autoTried.add(h);await repair('auto')}
      },1300);
    });
    return true;
  }

  function boot(){
    patch();watchTimer=setInterval(()=>{const h=host();if(h!==currentHost){currentHost=h;patch(h)}else patch(h)},650);
    window.LXPlayerAudioV10={version:'10.0',repair,decodedAudio,patch};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
