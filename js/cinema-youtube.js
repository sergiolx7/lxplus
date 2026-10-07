/* Official YouTube transport. Native provider controls, ads and credits stay visible. */
(()=>{
 'use strict';
 const LX=window.LX;
 let apiPromise;
 function loadAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(apiPromise)return apiPromise;
  apiPromise=new Promise((resolve,reject)=>{
   let finished=false;
   const finish=()=>{if(finished||!window.YT?.Player)return;finished=true;clearInterval(poll);clearTimeout(timeout);resolve(window.YT)};
   const prior=window.onYouTubeIframeAPIReady;
   window.onYouTubeIframeAPIReady=()=>{try{prior?.()}finally{finish()}};
   const poll=setInterval(finish,100),timeout=setTimeout(()=>{if(finished)return;finished=true;clearInterval(poll);apiPromise=null;reject(new Error('YOUTUBE_API_TIMEOUT'))},15000);
   let script=document.querySelector('script[data-lx-cinema-youtube-api]');
   if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.dataset.lxCinemaYoutubeApi='1';document.head.appendChild(script)}
   script.addEventListener('error',()=>{if(finished)return;finished=true;clearInterval(poll);clearTimeout(timeout);apiPromise=null;script.remove();reject(new Error('YOUTUBE_API_UNAVAILABLE'))},{once:true});
  });
  return apiPromise;
 }
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const format=value=>{const n=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(n/3600)?Math.floor(n/3600)+':':''}${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
 function mount({host,item,episode,sourceInfo,resumeSeconds=0,onProgress,onClose,onNext}){
  let player=null,destroyed=false,poll=0,loadTimeout=0,position=0,duration=0,lastSaved=0,hasStarted=false;
  const root=host.attachShadow({mode:'open'}),source=new URL(sourceInfo.src),knownDuration=Number(episode?.durationSeconds||item.durationSeconds)||0;
  const resume=Math.floor(resumeSeconds>5&&(!knownDuration||resumeSeconds<knownDuration-15)?resumeSeconds:0);
  source.searchParams.set('autoplay','1');source.searchParams.set('playsinline','1');source.searchParams.set('enablejsapi','1');source.searchParams.set('controls','1');
  source.searchParams.set('origin',location.origin);source.searchParams.set('widget_referrer',location.href);source.searchParams.set('rel','0');
  if(resume)source.searchParams.set('start',String(resume));
  const watchUrl=String(sourceInfo.openUrl||'');
  root.innerHTML=`<style>
   :host{all:initial;position:fixed;inset:0;color:#fff;background:#08090e;font-family:Inter,Arial,sans-serif}
   *{box-sizing:border-box}.cinema{height:100dvh;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 5%,#231537 0,transparent 55%),#08090e}
   header{display:flex;align-items:center;gap:16px;padding:max(14px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) 14px;flex:none}
   button,a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:1px solid #ffffff24;border-radius:12px;padding:0 16px;background:#ffffff08;color:#fff;cursor:pointer;text-decoration:none;font:600 13px/1 Inter,Arial,sans-serif}
   button:hover,a:hover{background:#ffffff18}button:focus-visible,a:focus-visible{outline:3px solid #b491ff;outline-offset:3px}
   button:disabled{opacity:.45;cursor:default}.title{flex:1;min-width:0}.title strong{display:block;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title small{display:block;color:#c0b6ce;font-size:12px;line-height:1.5;margin-top:5px}.brand{font-size:13px;font-weight:800;letter-spacing:.02em}.brand i{font-style:normal;color:#ad81ff}
   .stage{position:relative;flex:1;min-height:200px;display:grid;place-items:center;background:#000}.stage iframe{width:100%;height:100%;border:0;min-height:200px;background:#000}
   .status{position:relative;flex:none;min-height:35px;padding:8px 22px;color:#c0b6ce;font-size:12px;line-height:1.5}.status.error{color:#ffd8a8;background:#302110}
   footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 22px max(12px,env(safe-area-inset-bottom));flex:none}.tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.time{color:#d3cbdc;font-size:12px;font-variant-numeric:tabular-nums}.credit{margin-left:auto;color:#c0b6ce;font-size:11px}.retry{display:none}.retry.visible{display:inline-flex}
   @media(max-width:700px){header{padding:10px 10px;gap:8px}.title strong{font-size:14px}.title small{font-size:10px}.brand{display:none}button,a{padding:0 11px;font-size:11px;border-radius:9px}.status{padding:6px 12px;font-size:11px}footer{padding:6px 10px max(10px,env(safe-area-inset-bottom));gap:8px;flex-wrap:wrap}.credit{display:none}.tools{gap:5px}.time{font-size:11px}}
   @media(max-height:480px){header{padding:5px 10px}.title small,.status:empty{display:none}header button,header a{min-height:34px}footer{padding:4px 10px}.status{min-height:20px;padding:3px 10px;font-size:10px}footer button{min-height:34px}.stage{min-height:200px}}
  </style><section class="cinema" aria-label="Cinema LX Plus"><header><button id="back" aria-label="Voltar ao catálogo">← Voltar</button><div class="title"><strong>${esc(item.title)}</strong><small>${esc(episode?`T${episode.season||1} · Episódio ${episode.number}`:`${item.year||''} · ${item.duration||''} · ${item.genre||''}`)}</small></div><span class="brand">LX <i>+</i> YouTube</span></header><div class="stage"><iframe id="officialFrame" src="${esc(source.href)}" title="${esc(item.title)} — YouTube" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><div id="status" class="status" role="status" aria-live="polite">${resume?'Retomando de '+format(resume)+'.':'Preparando o filme…'}</div><footer><div class="tools"><button id="rewind" aria-label="Voltar 10 segundos" disabled>−10 s</button><button id="forward" aria-label="Avançar 10 segundos" disabled>+10 s</button><button id="fullscreen" aria-label="Tela cheia">⛶ Tela cheia</button>${onNext?'<button id="next">Próximo episódio ›</button>':''}<button id="retry" class="retry">Tentar novamente</button></div><span id="time" class="time"></span><span class="credit">${esc(item.sourceProvider||'Canal oficial')} · YouTube</span></footer></section>`;
  const $=id=>root.getElementById(id),frame=$('officialFrame');
  function save(force=false){
   if(!player||destroyed)return;
   try{position=Number(player.getCurrentTime())||0;duration=Number(player.getDuration())||0}catch{return}
   $('time').textContent=duration?`${format(position)} / ${format(duration)}`:'';
   if(duration&&hasStarted&&(force||Date.now()-lastSaved>5000)){lastSaved=Date.now();onProgress?.({position,duration,ended:player.getPlayerState?.()===0})}
  }
  function status(message,error=false){if(destroyed)return;$('status').textContent=message;$('status').classList.toggle('error',error);$('retry').classList.toggle('visible',error)}
  function error(code){clearTimeout(loadTimeout);const messages={100:'Este filme foi removido ou tornou-se privado.',101:'O canal restringiu a reprodução deste filme em outros sites.',150:'O canal restringiu a reprodução deste filme em outros sites.',153:'Não foi possível identificar o site para o YouTube. Recarregue e tente novamente.'};status(messages[code]||'O YouTube não conseguiu reproduzir este filme agora. Tente novamente.',true)}
  function seek(delta){if(!player)return;try{player.seekTo(Math.max(0,Math.min((duration||knownDuration||Infinity)-1,(player.getCurrentTime()||0)+delta)),true)}catch{}}
  function ready(event){if(destroyed)return;player=event.target;$('rewind').disabled=$('forward').disabled=false;clearTimeout(loadTimeout);status('Use os controles do YouTube para áudio, legendas e qualidade.');poll=setInterval(()=>save(),1000)}
  function state(event){if(destroyed)return;if(event.data===1){hasStarted=true;clearTimeout(loadTimeout);status('Use os controles do YouTube para áudio, legendas e qualidade.');save(true)}else if(event.data===0||event.data===2){save(true)}else if(event.data===3)status('Carregando o vídeo…');}
  loadTimeout=setTimeout(()=>status('O carregamento está demorando. Tente novamente se o vídeo não abrir.',true),20000);
  loadAPI().then(YT=>{if(destroyed)return;player=new YT.Player(frame,{events:{onReady:ready,onStateChange:state,onError:e=>error(e.data),onAutoplayBlocked:()=>status('Toque em ▶ no vídeo para começar.')}})}).catch(()=>status('A conexão com o YouTube não ficou pronta. Tente novamente.',true));
  $('back').onclick=onClose;$('rewind').onclick=()=>seek(-10);$('forward').onclick=()=>seek(10);$('next')?.addEventListener('click',onNext);
  $('retry').onclick=()=>{if(player?.loadVideoById){status('Preparando o filme…');player.loadVideoById({videoId:source.pathname.split('/').pop(),startSeconds:position||resume})}else{frame.src=source.href;status('Toque em ▶ no vídeo para começar.')}};
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(host.requestFullscreen)await host.requestFullscreen();else status('Use o botão de tela cheia no vídeo.')}catch{status('Use o botão de tela cheia no vídeo.')}};
  const keydown=event=>{if(event.key==='Escape')onClose?.();};document.addEventListener('keydown',keydown);
  return {destroy(){if(destroyed)return;save(true);destroyed=true;clearInterval(poll);clearTimeout(loadTimeout);document.removeEventListener('keydown',keydown);try{player?.destroy?.()}catch{}host.remove();document.documentElement.classList.remove('lx-player-open');document.body.classList.remove('lx-player-open')}};
 }
 LX.cinemaYouTube={mount,loadAPI};
})();
