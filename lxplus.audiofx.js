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

/* LX Music — compact floating player, draggable position and background media controls. */
(()=>{'use strict';
  const POS_KEY='lx_music_float_pos_v2';
  const dock=()=>document.getElementById('musicDock');
  const audio=()=>document.getElementById('musicAudio');
  let drag=null,lastPositionUpdate=0;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function readPos(){try{return JSON.parse(localStorage.getItem(POS_KEY)||'null')}catch{return null}}
  function savePos(x,y){try{localStorage.setItem(POS_KEY,JSON.stringify({x:Math.round(x),y:Math.round(y)}))}catch{}}
  function bounds(el,x,y){const pad=8,r=el.getBoundingClientRect(),mx=Math.max(pad,innerWidth-r.width-pad),my=Math.max(pad,innerHeight-r.height-pad);return{x:clamp(x,pad,mx),y:clamp(y,pad,my)}}
  function setXY(el,x,y,save=true){const p=bounds(el,x,y);el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.right='auto';el.style.bottom='auto';if(save)savePos(p.x,p.y)}
  function restorePosition(){const el=dock(),p=readPos();if(!el||!p)return;requestAnimationFrame(()=>setXY(el,Number(p.x)||8,Number(p.y)||8,false))}
  function ensureHandle(){
    const el=dock();if(!el||el.querySelector('.lx-music-drag-handle'))return;
    const h=document.createElement('div');h.className='lx-music-drag-handle';h.textContent='•••';h.title='Arraste o player';h.setAttribute('aria-label','Arraste o player de música');
    h.addEventListener('pointerdown',e=>{
      if(e.button!==0&&e.pointerType!=='touch')return;
      const r=el.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};
      el.classList.add('lx-is-dragging');h.setPointerCapture?.(e.pointerId);e.preventDefault();
    });
    h.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;setXY(el,e.clientX-drag.dx,e.clientY-drag.dy,false);e.preventDefault()});
    const end=e=>{if(!drag||drag.id!==e.pointerId)return;const r=el.getBoundingClientRect();savePos(r.left,r.top);drag=null;el.classList.remove('lx-is-dragging');try{h.releasePointerCapture?.(e.pointerId)}catch{}};
    h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
    el.prepend(h);restorePosition();
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
  function boot(){ensureHandle();setupMediaSession();metadata();window.addEventListener('resize',()=>{const el=dock();if(!el)return;const r=el.getBoundingClientRect();if(readPos())setXY(el,r.left,r.top,true)},{passive:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
