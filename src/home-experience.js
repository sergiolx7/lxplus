import {icon} from './ui.js';
import {readDisplay} from './display-preferences.js';

export function mountHomeExperience(host){
 const carousel=host.querySelector('[data-home-carousel]');
 if(!carousel)return {destroy(){}};
 const abort=new AbortController(),signal=abort.signal,slides=[...carousel.querySelectorAll('[data-hero-slide]')],dots=[...carousel.querySelectorAll('[data-hero-index]')];
 let index=0,timer=null,hover=false,focused=false,touch=null,paused=readDisplay().reduceMotion||readDisplay().performance==='light'||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const delay=8000;
 function schedule(){clearInterval(timer);if(slides.length>1&&!paused&&!hover&&!focused&&!document.hidden)timer=setInterval(()=>show(index+1),delay)}
 function show(next){index=(next+slides.length)%slides.length;slides.forEach((slide,i)=>{slide.hidden=i!==index;slide.setAttribute('aria-hidden',String(i!==index))});dots.forEach((dot,i)=>{dot.setAttribute('aria-current',String(i===index));dot.tabIndex=i===index?0:-1});const status=carousel.querySelector('[data-hero-status]');if(status)status.textContent=(index+1)+' de '+slides.length;schedule()}
 carousel.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.heroIndex!==undefined)show(Number(b.dataset.heroIndex));if(b.dataset.heroStep)show(index+Number(b.dataset.heroStep));if(b.hasAttribute('data-hero-pause')){paused=!paused;b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'Reproduzir destaques automaticamente':'Pausar destaques');b.innerHTML=icon(paused?'play':'pause');schedule()}},{signal});
 carousel.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.target.matches('input,textarea'))return;event.preventDefault();show(event.key==='Home'?0:event.key==='End'?slides.length-1:index+(event.key==='ArrowLeft'?-1:1))},{signal});
 carousel.addEventListener('pointerenter',()=>{hover=true;schedule()},{signal});carousel.addEventListener('pointerleave',()=>{hover=false;schedule()},{signal});
 carousel.addEventListener('focusin',()=>{focused=true;schedule()},{signal});carousel.addEventListener('focusout',event=>{focused=carousel.contains(event.relatedTarget);schedule()},{signal});
 carousel.addEventListener('touchstart',event=>{const t=event.touches[0];touch={x:t.clientX,y:t.clientY}},{passive:true,signal});carousel.addEventListener('touchend',event=>{if(!touch)return;const t=event.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;touch=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)show(index+(dx<0?1:-1))},{passive:true,signal});
 const pause=carousel.querySelector('[data-hero-pause]');if(pause){pause.setAttribute('aria-pressed',String(Boolean(paused)));pause.setAttribute('aria-label',paused?'Reproduzir destaques automaticamente':'Pausar destaques');pause.innerHTML=icon(paused?'play':'pause')}
 document.addEventListener('visibilitychange',schedule,{signal});show(0);
 return {destroy(){clearInterval(timer);abort.abort()}};
}
