import {readDisplay} from './display-preferences.js';
export function musicLightAllowed(p=readDisplay()){
 return p.leds&&p.ledIntensity>0&&(p.ledLeft||p.ledRight)&&p.ledMode==='music'&&p.performance!=='light'&&!p.reduceMotion&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
// Read the existing audio graph at 10 Hz. No microphone, extra stream or network request.
export function bindAmbientLight({sample=()=>null}={}){
 let timer=null,energy=0;
 const root=document.documentElement;
 function tick(){
  clearTimeout(timer);timer=null;const p=readDisplay(),enabled=p.leds&&p.ledIntensity>0&&(p.ledLeft||p.ledRight)&&p.performance!=='light';
  const reactive=enabled&&musicLightAllowed(p)&&!document.hidden,level=reactive?sample():null;
  energy=reactive&&Number.isFinite(level)?energy*.8+Math.max(0,Math.min(1,level))*.2:0;
  root.style.setProperty('--led-energy',String(.5+energy*.5));root.dataset.ledAudio=reactive&&Number.isFinite(level)?'active':'idle';
  const status=!enabled?'Iluminação pausada.':root.dataset.motion==='reduced'?'Luz fixa para respeitar o movimento reduzido.':p.ledMode==='music'?(root.dataset.ledAudio==='active'?'A luz está reagindo ao áudio desta faixa.':'Luz fixa. A reação fica disponível ao reproduzir uma faixa compatível.'):'Iluminação ativa · '+p.ledIntensity+'% de intensidade.';
  document.querySelectorAll('[data-led-status]').forEach(node=>{if(node.textContent!==status)node.textContent=status});
  if(reactive)timer=setTimeout(tick,Number.isFinite(level)?100:1000);
 }
 document.addEventListener('lx-display-change',tick);document.addEventListener('visibilitychange',tick);tick();
 return()=>{clearTimeout(timer);document.removeEventListener('lx-display-change',tick);document.removeEventListener('visibilitychange',tick);root.style.removeProperty('--led-energy')};
}
