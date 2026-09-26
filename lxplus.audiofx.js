/* Ajustes opcionais do próprio áudio MP3. Players oficiais não entram na cadeia Web Audio. */
(()=>{'use strict';
 const LX=window.LX,audio=document.getElementById('musicAudio'),button=document.getElementById('musicEffectsBtn');
 if(!LX||!audio||!button)return;
 const defaults={enabled:false,gain:100,bass:0,preset:'original'},presets={original:{gain:100,bass:0},suave:{gain:105,bass:2},grave:{gain:110,bass:8},energia:{gain:125,bass:5}};
 const store=()=>LX.store?.read?.(LX.store.keys.playerPrefs,{})||{};
 const state={...defaults,...(store().musicEffects||{})};
 let context=null,source=null,shelf=null,volume=null,limiter=null;
 const external=()=>document.getElementById('musicDock')?.classList.contains('external-provider');
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number(v)||0));
 const save=()=>LX.store?.write?.(LX.store.keys.playerPrefs,{...store(),musicEffects:{...state}});
 function graph(){
  if(source)return;const AudioContextType=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextType)throw new Error('Este navegador não oferece ajustes de áudio.');
  context=LX.__musicAudioContext||new AudioContextType();LX.__musicAudioContext=context;source=context.createMediaElementSource(audio);shelf=context.createBiquadFilter();shelf.type='lowshelf';shelf.frequency.value=110;
  volume=context.createGain();limiter=context.createDynamicsCompressor();limiter.threshold.value=-4;limiter.knee.value=0;limiter.ratio.value=16;limiter.attack.value=.003;limiter.release.value=.16;
  shelf.connect(volume);volume.connect(limiter);limiter.connect(context.destination)
 }
 function apply(){
  if(!source)return;const now=context.currentTime;source.disconnect();
  if(state.enabled){source.connect(shelf);shelf.gain.setTargetAtTime(state.bass,now,.025);volume.gain.setTargetAtTime(state.gain/100,now,.025)}
  else source.connect(context.destination);
 }
 function paint(message=''){
  const root=document.getElementById('lxMusicEffectsPanel');button.classList.toggle('active',state.enabled);
  button.setAttribute('aria-pressed',String(state.enabled));
  if(!root)return;
  root.querySelector('[name=active]').checked=state.enabled;
  root.querySelector('[name=gain]').value=state.gain;root.querySelector('[data-gain]').textContent=state.gain+'%';
  root.querySelector('[name=bass]').value=state.bass;root.querySelector('[data-bass]').textContent=(state.bass>0?'+':'')+state.bass+' dB';
  root.querySelector('[name=preset]').value=state.preset;
  root.querySelector('[data-effect-status]').textContent=message||(!state.enabled?'Efeitos desligados · som original':external()?'Ajustes salvos. O YouTube/Spotify usa o player oficial; abra um MP3 para ouvi-los.':'Ajustes aplicados ao MP3 do catálogo.');
 }
 async function enable(on){
  try{if(on){graph();state.enabled=true;apply();await context.resume()}else{state.enabled=false;apply()}
   save();paint();LX.toast?.(on?'Ajustes MP3 ligados.':'Ajustes MP3 desligados.')
  }catch(err){state.enabled=false;try{apply()}catch{}paint(err.message||'Não foi possível ativar os ajustes.')}
 }
 function open(){
  let root=document.getElementById('lxMusicEffectsPanel');if(root){root.remove();return}
  root=document.createElement('aside');root.id='lxMusicEffectsPanel';root.className='lx-music-effects-panel';
  root.setAttribute('aria-label','Ajustes de áudio MP3');
  root.innerHTML='<header><strong>Qualidade da sua música</strong><button type="button" data-close aria-label="Fechar ajustes">×</button></header><label class="lx-effect-toggle"><input name="active" type="checkbox"> Ativar ajustes para MP3</label><label>Preset<select name="preset"><option value="original">Original</option><option value="suave">Suave</option><option value="grave">Mais graves</option><option value="energia">Energia</option><option value="personalizado">Personalizado</option></select></label><label>Amplificar <output data-gain></output><input name="gain" type="range" min="50" max="180" step="1"></label><label>Aumento de grave <output data-bass></output><input name="bass" type="range" min="-6" max="12" step="1"></label><p data-effect-status role="status"></p><small>O limitador reduz distorção em ganhos altos. Estes controles alteram a reprodução, não a qualidade original do arquivo.</small>';
  document.body.append(root);root.querySelector('[data-close]').onclick=()=>root.remove();
  root.querySelector('[name=active]').onchange=e=>enable(e.target.checked);
  root.querySelector('[name=preset]').onchange=e=>{state.preset=e.target.value;if(presets[state.preset])Object.assign(state,presets[state.preset]);apply();save();paint()};
  for(const key of ['gain','bass'])root.querySelector('[name='+key+']').oninput=e=>{state[key]=clamp(e.target.value,key==='gain'?50:-6,key==='gain'?180:12);state.preset='personalizado';apply();save();paint()};
  paint()
 }
 button.onclick=open;
 audio.addEventListener('play',()=>{if(state.enabled){try{graph();apply();if(context.state==='suspended')context.resume().catch(()=>{})}catch(err){state.enabled=false;paint(err.message)}}});
 document.addEventListener('lx:music-changed',()=>paint());
 document.addEventListener('lx:music-closed',()=>document.getElementById('lxMusicEffectsPanel')?.remove());
 LX.audioEffects={open,state:()=>({...state}),resume:()=>state.enabled?context?.resume?.():Promise.resolve()};
})();

/* LX Plus — Ambient Glow V2 loader. */
(()=>{'use strict';
  const CSS_ID='lxAmbientV1Css';
  const LAYER_ID='lxAmbientV1';
  function mount(){
    let link=document.getElementById(CSS_ID);
    if(!link){link=document.createElement('link');link.id=CSS_ID;link.rel='stylesheet';document.head.appendChild(link)}
    link.href='lxplus.ambient-v2.css?v=20260926-2';
    if(!document.getElementById(LAYER_ID)){
      const layer=document.createElement('div');
      layer.id=LAYER_ID;
      layer.setAttribute('aria-hidden','true');
      layer.innerHTML='<i class="lx-ambient-blob-a"></i><i class="lx-ambient-blob-b"></i><i class="lx-ambient-arc-a"></i><i class="lx-ambient-arc-b"></i><i class="lx-ambient-line"></i>';
      document.body.prepend(layer);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

/* LX Music — compact floating player, freely draggable anywhere in the viewport. */
(()=>{'use strict';
  const POS_KEY='lx_music_float_pos_v5';
  const dock=()=>document.getElementById('musicDock');
  const audio=()=>document.getElementById('musicAudio');
  let drag=null,lastPositionUpdate=0;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function readPos(){try{return JSON.parse(localStorage.getItem(POS_KEY)||'null')}catch{return null}}
  function savePos(x,y){try{localStorage.setItem(POS_KEY,JSON.stringify({x:Math.round(x),y:Math.round(y)}))}catch{}}
  function bounds(el,x,y){const pad=8,r=el.getBoundingClientRect(),mx=Math.max(pad,innerWidth-r.width-pad),my=Math.max(pad,innerHeight-r.height-pad);return{x:clamp(x,pad,mx),y:clamp(y,pad,my)}}
  function setXY(el,x,y,save=true){const p=bounds(el,x,y);el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.right='auto';el.style.bottom='auto';if(save)savePos(p.x,p.y);return p}
  function defaultPosition(save=true){const el=dock();if(!el)return;requestAnimationFrame(()=>{const r=el.getBoundingClientRect(),x=Math.max(8,innerWidth-r.width-18),y=innerWidth<=700?66:18;setXY(el,x,y,save)})}
  function restorePosition(){const el=dock(),p=readPos();if(!el)return;if(p&&Number.isFinite(+p.x)&&Number.isFinite(+p.y))requestAnimationFrame(()=>setXY(el,+p.x,+p.y,false));else defaultPosition(true)}
  function beginDrag(e,handle){const el=dock();if(!el)return;if(e.button!==0&&e.pointerType!=='touch')return;const r=el.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};el.classList.add('lx-is-dragging');handle?.setPointerCapture?.(e.pointerId);e.preventDefault()}
  function moveDrag(e){const el=dock();if(!el||!drag||drag.id!==e.pointerId)return;setXY(el,e.clientX-drag.dx,e.clientY-drag.dy,false);e.preventDefault()}
  function endDrag(e,handle){const el=dock();if(!el||!drag||drag.id!==e.pointerId)return;const r=el.getBoundingClientRect();savePos(r.left,r.top);drag=null;el.classList.remove('lx-is-dragging');try{handle?.releasePointerCapture?.(e.pointerId)}catch{}}
  function ensureHandle(){
    const el=dock();if(!el)return;let h=el.querySelector('.lx-music-drag-handle');
    if(!h){h=document.createElement('div');h.className='lx-music-drag-handle';h.innerHTML='<span class="lx-drag-dots">•••</span><span class="lx-drag-label">MOVER</span>';h.title='Arraste o player para qualquer lugar';h.setAttribute('aria-label','Mover player de música');h.tabIndex=0;el.prepend(h)}
    if(h.dataset.lxDragBound==='1')return;h.dataset.lxDragBound='1';
    h.addEventListener('pointerdown',e=>beginDrag(e,h));h.addEventListener('pointermove',moveDrag);h.addEventListener('pointerup',e=>endDrag(e,h));h.addEventListener('pointercancel',e=>endDrag(e,h));
    h.addEventListener('dblclick',e=>{e.preventDefault();defaultPosition(true)});
    h.addEventListener('keydown',e=>{const el=dock();if(!el)return;const r=el.getBoundingClientRect(),step=e.shiftKey?40:16;let x=r.left,y=r.top,handled=true;if(e.key==='ArrowLeft')x-=step;else if(e.key==='ArrowRight')x+=step;else if(e.key==='ArrowUp')y-=step;else if(e.key==='ArrowDown')y+=step;else if(e.key==='Home'){defaultPosition(true);e.preventDefault();return}else handled=false;if(handled){e.preventDefault();setXY(el,x,y,true)}});
    const info=el.querySelector('.music-info');if(info&&!info.dataset.lxDragBound){info.dataset.lxDragBound='1';info.title='Segure e arraste para mover o player';info.addEventListener('pointerdown',e=>{if(e.target.closest('button,a,input'))return;beginDrag(e,info)});info.addEventListener('pointermove',moveDrag);info.addEventListener('pointerup',e=>endDrag(e,info));info.addEventListener('pointercancel',e=>endDrag(e,info))}
    restorePosition();
  }
  function coverURL(){
    const cover=document.getElementById('musicCover');if(!cover)return'';
    const img=cover.querySelector?.('img');if(img?.src)return img.src;
    const bg=getComputedStyle(cover).backgroundImage||'';const m=bg.match(/url\(["']?(.*?)["']?\)/);return m?.[1]||'';
  }
  function metadata(){
    if(!('mediaSession' in navigator))return;
    const a=audio(),title=document.getElementById('musicTitle')?.textContent?.trim()||'LX Music',artist=document.getElementById('musicArtist')?.textContent?.trim()||'LX Plus',art=coverURL();
    try{navigator.mediaSession.metadata=new MediaMetadata({title,artist,album:'LX Plus',artwork:art?[{src:art}]:[]})}catch{}
    if(a)try{navigator.mediaSession.playbackState=a.paused?'paused':'playing'}catch{}
  }
  function positionState(force=false){
    const a=audio();if(!a||!('mediaSession' in navigator)||typeof navigator.mediaSession.setPositionState!=='function'||!Number.isFinite(a.duration)||a.duration<=0)return;
    const now=Date.now();if(!force&&now-lastPositionUpdate<900)return;lastPositionUpdate=now;
    try{navigator.mediaSession.setPositionState({duration:a.duration,playbackRate:a.playbackRate||1,position:Math.min(a.duration,Math.max(0,a.currentTime||0))})}catch{}
  }
  function click(id){document.getElementById(id)?.click()}
  function setupMediaSession(){
    const a=audio();if(!a)return;a.setAttribute('playsinline','');a.setAttribute('preload','metadata');
    if('mediaSession' in navigator){
      const set=(name,fn)=>{try{navigator.mediaSession.setActionHandler(name,fn)}catch{}};
      set('play',()=>a.play().catch(()=>{}));set('pause',()=>a.pause());set('previoustrack',()=>click('musicPrev'));set('nexttrack',()=>click('musicNext'));
      set('seekbackward',d=>{a.currentTime=Math.max(0,(a.currentTime||0)-(d.seekOffset||10))});
      set('seekforward',d=>{a.currentTime=Math.min(a.duration||Infinity,(a.currentTime||0)+(d.seekOffset||10))});
      set('seekto',d=>{if(Number.isFinite(d.seekTime))a.currentTime=Math.max(0,Math.min(a.duration||d.seekTime,d.seekTime))});
    }
    for(const ev of ['play','pause','loadedmetadata','durationchange'])a.addEventListener(ev,()=>{metadata();positionState(true)});
    a.addEventListener('timeupdate',()=>positionState(false));
    document.addEventListener('lx:music-changed',()=>setTimeout(()=>{metadata();positionState(true)},30));
  }
  function boot(){ensureHandle();setupMediaSession();metadata();window.addEventListener('resize',()=>{const el=dock();if(!el)return;const r=el.getBoundingClientRect();setXY(el,r.left,r.top,true)},{passive:true});window.addEventListener('orientationchange',()=>setTimeout(()=>{const el=dock();if(!el)return;const r=el.getBoundingClientRect();setXY(el,r.left,r.top,true)},90),{passive:true});LX.musicFloat={reset:()=>defaultPosition(true),moveTo:(x,y)=>{const el=dock();if(el)setXY(el,+x||8,+y||8,true)}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* LX Plus V4 — side LED dots + adaptive full-screen cinema fit. */
(()=>{'use strict';
  const VISUAL_ID='lxVisualV4Css',FIT_KEY='lx_video_fit_v4';
  function loadVisual(){
    let link=document.getElementById(VISUAL_ID);
    if(!link){link=document.createElement('link');link.id=VISUAL_ID;link.rel='stylesheet';document.head.appendChild(link)}
    link.href='lxplus.visual-v4.css?v=20260926-1';
  }
  function readFit(){try{return localStorage.getItem(FIT_KEY)==='contain'?'contain':'fill'}catch{return'fill'}}
  function writeFit(mode){try{localStorage.setItem(FIT_KEY,mode)}catch{}}
  function enhanceCinema(host){
    const shadow=host?.shadowRoot;if(!shadow)return false;
    const stage=shadow.getElementById('stage'),video=shadow.getElementById('video');
    if(!stage||!video)return false;
    if(!shadow.getElementById('lxAdaptiveFillV4')){
      const style=document.createElement('style');style.id='lxAdaptiveFillV4';
      style.textContent='#stage #video{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;object-position:center center!important;background:#000!important}#stage.lx-fit-contain-v4 #video{object-fit:contain!important}#poster{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center center!important}.actions #lxFitV4{font-size:15px;font-weight:900}.actions #lxFitV4.active{border-color:rgba(177,83,255,.58);box-shadow:0 0 18px rgba(138,43,226,.25)}@media(max-width:460px){.actions #lxFitV4{display:none!important}}';
      shadow.appendChild(style);
    }
    const actions=shadow.querySelector('.actions');
    let button=shadow.getElementById('lxFitV4');
    if(actions&&!button){button=document.createElement('button');button.id='lxFitV4';button.className='round';button.type='button';button.setAttribute('aria-label','Alternar preenchimento do vídeo');actions.prepend(button)}
    const apply=()=>{
      const mode=readFit();stage.classList.toggle('lx-fit-contain-v4',mode==='contain');
      stage.dataset.lxScreen=innerWidth>=innerHeight?'landscape':'portrait';
      if(button){button.textContent=mode==='fill'?'▣':'□';button.classList.toggle('active',mode==='fill');button.title=mode==='fill'?'Tela preenchida · toque para ajustar sem corte':'Vídeo ajustado · toque para preencher a tela'}
    };
    if(button&&!button.dataset.lxBound){button.dataset.lxBound='1';button.addEventListener('click',e=>{e.stopPropagation();writeFit(readFit()==='fill'?'contain':'fill');apply()})}
    if(!video.dataset.lxFitBound){video.dataset.lxFitBound='1';video.addEventListener('loadedmetadata',apply);video.addEventListener('emptied',apply)}
    if(!stage.dataset.lxResizeBound&&'ResizeObserver'in window){stage.dataset.lxResizeBound='1';const ro=new ResizeObserver(apply);ro.observe(stage)}
    apply();return true;
  }
  function scan(){const host=document.getElementById('lxGlobalCinema');if(host)requestAnimationFrame(()=>enhanceCinema(host))}
  function boot(){loadVisual();scan();const obs=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node?.nodeType!==1)continue;if(node.id==='lxGlobalCinema'||node.querySelector?.('#lxGlobalCinema'))setTimeout(scan,0)}});obs.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',scan,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(scan,80),{passive:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();