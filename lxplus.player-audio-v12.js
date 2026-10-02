/* Audio compatibility: one operation per video, cancellable on source changes. */
(()=>{'use strict';
 if(window.LXPlayerAudioV12?.version==='12.3')return;
 const bridges=new WeakMap(),pending=new WeakMap(),attempts=new WeakMap(),cache=new Map();let currentHost=null;
 const host=()=>document.getElementById('lxGlobalCinema');
 const parts=(h=host())=>({h,root:h?.shadowRoot,video:h?.shadowRoot?.querySelector('#video,video')});
 const toast=m=>window.LX?.toast?.(m);
 function itemFor(h){if(h?.__lxMedia)return h.__lxMedia;const all=window.LX?.data?.catalog?.()||[];return all.find(x=>String(x.id)===h?.dataset.lxContentId)||all.find(x=>x.title===String(h?.getAttribute('aria-label')||'').replace(/^Reproduzindo\s+/i,''))||null;}
 function status(root,msg,kind='info'){if(!root)return;let el=root.querySelector('.lx-audio-v12-status');if(!el){el=document.createElement('div');el.className='lx-audio-v12-status';el.setAttribute('role','status');el.style.cssText='position:absolute;z-index:34;left:50%;bottom:112px;transform:translateX(-50%);width:max-content;max-width:90%;padding:12px 16px;border-radius:16px;background:#10141fee;color:white;font:500 14px/1.5 system-ui;pointer-events:none;text-align:center';(root.querySelector('#stage,.stage,.root')||root).append(el)}el.textContent=msg;el.dataset.kind=kind;el.hidden=false;clearTimeout(el.__timer);el.__timer=setTimeout(()=>el.hidden=true,8000);}
 async function resolve(ref){const raw=String(ref||'').trim();if(/^https?:\/\//i.test(raw))return raw;if(raw.startsWith('cloud:'))return await window.LX?.cloud?.mediaUrl?.(raw.slice(6),21600)||'';if(raw.startsWith('r2:'))return await window.LX?.r2?.mediaUrl?.(raw,21600)||'';return '';}
 function driveIdOf(ref){const raw=String(ref||'');return raw.match(/^gdrive:([A-Za-z0-9_-]{10,256})/)?.[1]||raw.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/)?.[1]||'';}
 async function resolveDriveAudio(ref){const id=driveIdOf(ref);if(!id)return null;const saved=cache.get(id);if(saved&&saved.expires>Date.now())return saved.value;const c=window.LX?.cloud?.db?.();if(!c)return null;
  try{const {data,error}=await c.functions.invoke('lx-drive-audio-resolver',{body:{driveId:id}});if(error)throw error;const url=String(data?.url||'');if(!/^https?:\/\//i.test(url))throw new Error('NO_COMPATIBLE_TRACK');const value={url,quality:String(data?.quality||'compatível')};cache.set(id,{value,expires:Date.now()+10*60000});return value;}catch{cache.set(id,{value:null,expires:Date.now()+60000});return null;}}
 const bridgeFor=v=>bridges.get(v)||null;
 function stop(v,restore=true){const b=bridges.get(v);if(!b)return;b.abort.abort();b.audio.pause();b.audio.removeAttribute('src');b.audio.load();b.audio.remove();bridges.delete(v);if(restore)v.muted=b.originalMuted;if(host())delete host().dataset.lxAudioCompat;}
 function sync(v,force=false){const b=bridges.get(v);if(!b?.active)return;const a=b.audio;a.playbackRate=v.playbackRate||1;if(v.paused||v.ended||v.seeking||v.readyState<3){a.pause();return;}if(force||Math.abs(a.currentTime-v.currentTime)>.3)try{a.currentTime=Math.max(0,v.currentTime)}catch{}
  if(a.paused&&!b.playPending){b.playPending=true;a.play().then(()=>{b.blocked=false;}).catch(()=>{if(!b.blocked)status(v.getRootNode(),'Toque em Corrigir áudio para liberar o som.','warn');b.blocked=true;}).finally(()=>b.playPending=false);}}
 async function start(v,root,ref,reason='auto',label='faixa compatível'){
  const owner=host(),videoSource=v.currentSrc||v.src,src=await resolve(ref);if(!src||!owner?.isConnected||parts().video!==v||(v.currentSrc||v.src)!==videoSource)return false;
  const old=bridges.get(v);if(old?.active&&old.ref===ref){sync(v,true);return true;}stop(v,true);
  const a=document.createElement('audio'),abort=new AbortController(),b={audio:a,ref,abort,active:false,originalMuted:v.muted};a.preload='auto';a.playsInline=true;a.src=src;a.volume=v.volume;a.muted=v.muted;a.style.display='none';bridges.set(v,b);(root.querySelector('#stage')||root).append(a);status(root,'Carregando '+label+'…');
  const valid=()=>owner.isConnected&&host()===owner&&bridges.get(v)===b&&(v.currentSrc||v.src)===videoSource;
  const ready=await new Promise(done=>{let finished=false;const finish=ok=>{if(finished)return;finished=true;clearTimeout(timer);done(ok)};const timer=setTimeout(()=>finish(false),10000);a.addEventListener('canplay',()=>finish(true),{once:true,signal:abort.signal});a.addEventListener('error',()=>finish(false),{once:true,signal:abort.signal});abort.signal.addEventListener('abort',()=>finish(false),{once:true});a.load();});
  if(!valid()){if(bridges.get(v)===b)stop(v,true);return false;}if(!ready){stop(v,true);return false;}
  try{a.currentTime=Math.max(0,v.currentTime)}catch{}b.active=true;v.muted=true;
  const options={signal:abort.signal};
  for(const type of ['playing','play','pause','waiting','stalled','seeking','seeked','ratechange','timeupdate','ended'])v.addEventListener(type,()=>sync(v,type==='seeked'||type==='playing'),options);
  v.addEventListener('emptied',()=>stop(v,true),options);
  a.addEventListener('error',()=>{if(bridges.get(v)!==b)return;stop(v,true);status(root,'A faixa de áudio foi interrompida. Toque em Corrigir áudio para tentar outra fonte.','warn')},options);
  root.addEventListener('click',e=>{if(!e.target?.closest?.('#mute')||!b.active)return;e.preventDefault();e.stopImmediatePropagation();a.muted=!a.muted;b.originalMuted=a.muted;const btn=root.querySelector('#mute');if(btn)btn.textContent=a.muted?'🔇':'🔊';}, {...options,capture:true});
  root.addEventListener('input',e=>{if(!e.target?.closest?.('#volume')||!b.active)return;e.stopImmediatePropagation();a.volume=Math.max(0,Math.min(1,Number(e.target.value)||0));v.volume=a.volume;a.muted=a.volume===0;b.originalMuted=a.muted;}, {...options,capture:true});
  if(!v.paused){try{await a.play()}catch{status(root,'Toque em Corrigir áudio para liberar o som.','warn');b.blocked=true;return false;}}
  if(!valid())return false;owner.dataset.lxAudioCompat='companion';status(root,'Faixa compatível carregada · imagem original mantida.','ok');return true;
 }
 async function repairWork(reason,v,root,h){
  const item=itemFor(h);if(!item)return false;
  const existing=bridges.get(v);if(existing?.active){if(reason==='manual'){existing.audio.muted=false;existing.originalMuted=false;if(existing.audio.volume===0)existing.audio.volume=1;try{if(!v.paused)await existing.audio.play();sync(v,true);return true;}catch{status(root,'O navegador bloqueou o áudio. Toque em reproduzir.','warn');return false;}}return true;}
  if(reason==='manual'&&(v.muted||v.volume===0)){v.muted=false;if(v.volume===0)v.volume=1;status(root,'Som ativado. Se continuar sem som, toque novamente em Corrigir áudio.');return true;}
  const explicit=item.audioMediaKey||item.audioUrl||item.audioSource||'';
  if(explicit&&await start(v,root,explicit,reason,'áudio compatível'))return true;
  if(host()!==h||parts().video!==v)return false;
  const drive=await resolveDriveAudio(item.mediaKey||item.sourceMediaKey||'');
  if(host()!==h||parts().video!==v)return false;
  if(drive?.url&&await start(v,root,drive.url,reason,'áudio do Drive'))return true;
  if(reason==='manual'){stop(v,true);if(h.__lxAudioFallback?.()){toast('Abrindo o player do Drive para reproduzir a versão compatível.');return true;}status(root,'Este formato de áudio não é compatível com o navegador. Cadastre uma faixa AAC/MP3 ou uma versão MP4 com áudio AAC.','warn');}
  return false;
 }
 function repair(reason='manual'){
  const {h,root,video:v}=parts();if(!h||!root||!v||root.querySelector('.drive-fallback'))return Promise.resolve(false);
  if(pending.has(v))return pending.get(v);
  const source=v.currentSrc||v.src,old=attempts.get(v);if(reason==='auto'&&old?.source===source)return Promise.resolve(false);attempts.set(v,{source});
  const buttons=[...root.querySelectorAll('#audioFix,#soundHelp')];buttons.forEach(b=>{b.disabled=true;b.textContent='Verificando áudio…'});
  const promise=repairWork(reason,v,root,h).catch(()=>{status(root,'Não foi possível carregar o áudio. Tente novamente.','warn');return false;}).finally(()=>{pending.delete(v);buttons.forEach(b=>{b.disabled=false;b.textContent='Corrigir áudio'});});pending.set(v,promise);return promise;
 }
 function captureTrack(video=parts().video){const b=bridges.get(video),src=b?.active?b.audio:video;try{const stream=(src?.captureStream||src?.mozCaptureStream)?.call(src);const track=stream?.getAudioTracks?.().find(t=>t.readyState==='live');return track?.clone?.()||track||null;}catch{return null;}}
 function patch(h=host()){if(!h?.shadowRoot||h.dataset.lxAudioV123)return;const {root,video:v}=parts(h);if(!v)return;h.dataset.lxAudioV123='1';
  root.addEventListener('click',e=>{if(!e.target?.closest?.('#audioFix,#soundHelp'))return;e.preventDefault();e.stopImmediatePropagation();repair('manual');},true);
  root.querySelectorAll('#audioFix,#soundHelp').forEach(b=>{b.textContent='Corrigir áudio';b.classList.remove('hide')});
  v.addEventListener('playing',()=>{const item=itemFor(h);if(item?.audioMediaKey||item?.audioUrl||item?.audioSource)repair('auto');});
 }
 function boot(){setInterval(()=>{const h=host();if(h!==currentHost){if(currentHost){const v=parts(currentHost).video;if(v)stop(v,false);}currentHost=h;}patch(h);},500);patch();}
 const api={version:'12.3',repair,start,stop,patch,captureTrack,bridgeFor,itemFor,resolveDriveAudio};window.LXPlayerAudioV12=api;window.LXPlayerAudioV11=api;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
