/* LX Plus — Player Audio V12.2
   Real compatibility mode: original high-quality video + compatible companion audio.
   For Google Drive titles, it can resolve a low-bandwidth Drive transcode only for audio,
   while the LX Player keeps the original video picture.
*/
(()=>{'use strict';
  if(window.LXPlayerAudioV12?.version==='12.2')return;
  const PATCH='lxAudioV12';
  const bridges=new WeakMap(),resolverCache=new Map();let currentHost=null,timer=0;
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};
  const host=()=>document.getElementById('lxGlobalCinema');
  const parts=(h=host())=>{const root=h?.shadowRoot||null;return {h,root,video:root?.querySelector?.('#video,video')||null}};
  const titleOf=h=>String(h?.getAttribute?.('aria-label')||'').replace(/^Reproduzindo\s+/i,'').trim();
  function itemFor(h){const title=titleOf(h).toLowerCase(),all=window.LX?.data?.catalog?.()||[];return all.find(x=>String(x.title||'').trim().toLowerCase()===title)||all.find(x=>String(x.id)==='1790257187477'&&/toy\s*story\s*5/i.test(title))||null}
  function status(root,msg,kind='info',hold=6000){if(!root)return;let b=root.querySelector('.lx-audio-v12-status');if(!b){b=document.createElement('div');b.className='lx-audio-v12-status';b.style.cssText='position:absolute;z-index:34;left:50%;bottom:112px;transform:translateX(-50%);max-width:min(580px,90vw);padding:10px 14px;border-radius:999px;background:rgba(5,8,13,.9);border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(18px);color:#fff;font:750 10px/1.35 system-ui;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.4);pointer-events:none';(root.querySelector('#stage,.stage,.root')||root).appendChild(b)}b.dataset.kind=kind;b.textContent=msg;b.hidden=false;clearTimeout(b.__t);b.__t=setTimeout(()=>b.hidden=true,hold)}
  async function resolve(ref){const raw=String(ref||'').trim();if(!raw)return '';if(/^https?:\/\//i.test(raw))return raw;if(raw.startsWith('cloud:'))return await window.LX?.cloud?.mediaUrl?.(raw.slice(6),21600)||'';if(raw.startsWith('r2:'))return await window.LX?.r2?.mediaUrl?.(raw,21600)||'';return ''}
  function driveIdOf(ref){const raw=String(ref||'');return raw.match(/^gdrive:([A-Za-z0-9_-]{10,256})/)?.[1]||''}
  async function resolveDriveAudio(ref){
    const driveId=driveIdOf(ref);if(!driveId)return null;
    const saved=resolverCache.get(driveId);if(saved&&saved.expires>Date.now())return saved.value;
    const c=window.LX?.cloud?.db?.();if(!c)return null;
    try{
      const {data,error}=await c.functions.invoke('lx-drive-audio-resolver',{body:{driveId}});if(error)throw error;
      const url=String(data?.url||'');if(!/^https?:\/\//i.test(url))return null;
      const value={url,quality:String(data?.quality||'Drive compatível')};resolverCache.set(driveId,{value,expires:Date.now()+20*60*1000});return value;
    }catch(error){console.warn('LX Drive audio resolver',error);resolverCache.set(driveId,{value:null,expires:Date.now()+60*1000});return null}
  }
  function bridgeFor(video){return video?bridges.get(video)||null:null}
  function sync(video,force=false){const b=bridgeFor(video);if(!b?.active)return false;const a=b.audio;try{a.playbackRate=video.playbackRate||1}catch{};try{const drift=Math.abs((a.currentTime||0)-(video.currentTime||0));if(force||drift>.28)a.currentTime=Math.max(0,video.currentTime||0)}catch{};if(video.paused||video.ended){try{a.pause()}catch{}}else if(a.paused)a.play().catch(()=>{});return true}
  function stop(video,restore=true){const b=bridgeFor(video);if(!b)return;try{b.abort.abort()}catch{};try{b.audio.pause();b.audio.removeAttribute('src');b.audio.load();b.audio.remove()}catch{};bridges.delete(video);if(restore)try{video.muted=false}catch{};const h=host();if(h)delete h.dataset.lxAudioCompat}
  async function start(video,root,ref,reason='auto',label='AAC compatível'){
    if(!video||!root||!ref)return false;const src=await resolve(ref);if(!src)return false;
    const old=bridgeFor(video);if(old?.active&&old.ref===ref){sync(video,true);return true}if(old)stop(video,false);
    const a=document.createElement('audio');a.id='lxAudioCompatV12';a.preload='auto';a.playsInline=true;a.style.display='none';a.src=src;
    try{a.volume=Math.max(0,Math.min(1,Number(video.volume)||1));a.playbackRate=video.playbackRate||1}catch{}
    const abort=new AbortController(),b={audio:a,ref,active:false,abort,label};bridges.set(video,b);(root.querySelector('#stage,.stage,.root')||root).appendChild(a);
    status(root,`Carregando ${label}…`,'info',7000);
    const ready=await new Promise(resolveReady=>{let done=false;const end=v=>{if(done)return;done=true;clearTimeout(t);resolveReady(v)};const t=setTimeout(()=>end(false),9000);a.addEventListener('canplay',()=>end(true),{once:true});a.addEventListener('loadedmetadata',()=>{if(a.readyState>=2)end(true)},{once:true});a.addEventListener('error',()=>end(false),{once:true});a.load()});
    if(!ready){stop(video,true);status(root,'O áudio compatível não pôde ser carregado. O vídeo original foi mantido.','warn');return false}
    try{a.currentTime=Math.max(0,video.currentTime||0)}catch{};b.active=true;try{video.muted=true}catch{};
    const opt={signal:abort.signal};
    video.addEventListener('play',()=>sync(video,true),opt);video.addEventListener('pause',()=>sync(video),opt);video.addEventListener('seeking',()=>sync(video,true),opt);video.addEventListener('seeked',()=>sync(video,true),opt);video.addEventListener('ratechange',()=>sync(video),opt);video.addEventListener('timeupdate',()=>sync(video),opt);video.addEventListener('ended',()=>a.pause(),opt);
    root.addEventListener('click',e=>{const t=e.target?.closest?.('#mute');if(!t||!b.active)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();a.muted=!a.muted;t.textContent=a.muted||a.volume<=0?'🔇':'🔊'},{capture:true,signal:abort.signal});
    root.addEventListener('input',e=>{const t=e.target?.closest?.('#volume');if(!t||!b.active)return;e.stopPropagation();e.stopImmediatePropagation();const v=Math.max(0,Math.min(1,Number(t.value)||0));a.volume=v;a.muted=v<=0;try{video.volume=v;video.muted=true}catch{};const m=root.querySelector('#mute');if(m)m.textContent=a.muted?'🔇':'🔊'},{capture:true,signal:abort.signal});
    try{await a.play()}catch{};sync(video,true);const h=host();if(h)h.dataset.lxAudioCompat='companion';const badge=root.querySelector('#sourceBadge');if(badge)badge.textContent='LX PLAYER · ORIGINAL + ÁUDIO COMPATÍVEL';
    status(root,`Áudio compatível ativo · ${label} · imagem original mantida.`,'ok',6500);if(reason==='manual')toast('Áudio compatível ativado sem reduzir a imagem.');return true;
  }
  async function repair(reason='manual'){
    const {h,root,video}=parts();if(!h||!root||!video)return false;const item=itemFor(h);if(!item)return false;
    const explicit=item?.audioMediaKey||item?.audioUrl||item?.audioSource||'';
    if(explicit)return await start(video,root,explicit,reason,'faixa AAC');
    const drive=await resolveDriveAudio(item?.mediaKey||item?.sourceMediaKey||'');
    if(drive?.url)return await start(video,root,drive.url,reason,`Drive ${drive.quality}`);
    status(root,/toy\s*story\s*5/i.test(titleOf(h))?'O Drive não liberou uma faixa transcodificada compatível para este arquivo. O 4K foi mantido; é necessária uma faixa AAC separada.':'Este título ainda não possui áudio compatível separado.','warn',8500);return false;
  }
  function captureTrack(video=parts().video){const b=bridgeFor(video),src=b?.active?b.audio:video;if(!src)return null;const fn=src.captureStream||src.mozCaptureStream;if(typeof fn!=='function')return null;try{const track=fn.call(src)?.getAudioTracks?.().find(t=>t.readyState==='live')||null;return track?.clone?.()||track}catch{return null}}
  function patch(h=host()){
    if(!h?.shadowRoot||h.dataset?.[PATCH]==='1')return false;const root=h.shadowRoot,video=root.querySelector('#video,video');if(!video)return false;h.dataset[PATCH]='1';currentHost=h;
    for(const sel of ['#audioFix','#soundHelp']){const btn=root.querySelector(sel);if(btn){btn.classList.remove('hide');btn.textContent='Corrigir áudio';btn.title='Usar áudio compatível mantendo o vídeo original'}}
    root.addEventListener('click',e=>{const t=e.target?.closest?.('#audioFix,#soundHelp');if(!t)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();repair('manual')},true);
    video.addEventListener('playing',()=>setTimeout(()=>repair('auto'),650));return true;
  }
  function boot(){patch();timer=setInterval(()=>{const h=host();if(h!==currentHost){if(currentHost){const old=currentHost.shadowRoot?.querySelector?.('#video,video');if(old)stop(old,false)}currentHost=h;patch(h)}else{patch(h);const {video}=parts(h);if(video&&!bridgeFor(video)?.active){const item=itemFor(h);if(item?.audioMediaKey||driveIdOf(item?.mediaKey||''))repair('auto')}}},1200);window.LXPlayerAudioV12={version:'12.2',repair,patch,start,captureTrack,bridgeFor,itemFor,resolveDriveAudio};window.LXPlayerAudioV11=window.LXPlayerAudioV12}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();