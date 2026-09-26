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

/* LX Plus — Ambient Glow V1 loader.
   This is deliberately isolated from app logic: it only loads one stylesheet
   and one pointer-events:none decorative layer. */
(()=>{'use strict';
  const CSS_ID='lxAmbientV1Css';
  const LAYER_ID='lxAmbientV1';
  function mount(){
    if(!document.getElementById(CSS_ID)){
      const link=document.createElement('link');
      link.id=CSS_ID;
      link.rel='stylesheet';
      link.href='lxplus.ambient-v1.css?v=20260926-1';
      document.head.appendChild(link);
    }
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
