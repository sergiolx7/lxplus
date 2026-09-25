/* LX Plus v40 REBUILD runtime guard.
   Keeps the stable R12.4 engines, v40 features and rebuilt UI in one predictable shell. */
(()=>{
'use strict';
const BUILD='V40-REBUILD-FINAL-20260925';
window.__LX_REBUILD_BUILD=BUILD;
document.documentElement.dataset.lxRebuild=BUILD;
document.documentElement.classList.add('lx-rebuild-v40');

const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];

function setViewport(){
  document.documentElement.style.setProperty('--lx-vh',(window.innerHeight*.01)+'px');
}
setViewport();
addEventListener('resize',()=>requestAnimationFrame(setViewport),{passive:true});
addEventListener('orientationchange',()=>setTimeout(setViewport,120),{passive:true});

function bodyOverlay(el){
  if(!el||el.parentElement===document.body)return;
  document.body.appendChild(el);
}
function normalizeOverlays(){
  bodyOverlay($('overlay'));
  bodyOverlay($('playerOverlay'));
  bodyOverlay($('readerOverlay'));
  bodyOverlay($('miniPlayer'));
  bodyOverlay($('musicDock'));
  bodyOverlay($('lxCommunityScrim'));
  bodyOverlay($('lxCommunityDrawer'));
}
function normalizeCommunity(){
  const scrim=$('lxCommunityScrim'),drawer=$('lxCommunityDrawer');
  if(scrim)bodyOverlay(scrim);
  if(drawer){
    bodyOverlay(drawer);
    drawer.style.removeProperty('position');
    drawer.style.removeProperty('inset');
    drawer.style.removeProperty('left');
    drawer.style.removeProperty('top');
    drawer.style.removeProperty('bottom');
    drawer.style.removeProperty('right');
  }
}
function normalizeImages(){
  qa('img').forEach(img=>{
    if(!img.loading)img.loading='lazy';
    if(img.dataset.lxRebuildBound)return;
    img.dataset.lxRebuildBound='1';
    img.addEventListener('error',()=>{
      if(img.dataset.lxFallback)return;
      img.dataset.lxFallback='1';
      img.src='assets/lx-music-fallback.svg';
    },{once:true});
  });
}
function normalizeRails(){
  qa('#app .rail').forEach(rail=>{
    rail.style.removeProperty('width');
    rail.style.removeProperty('max-width');
    rail.style.removeProperty('transform');
  });
}
function normalizeLayout(){
  document.body.classList.add('lx-rebuild-ready');
  normalizeOverlays();
  normalizeCommunity();
  normalizeImages();
  normalizeRails();
  const app=$('app');
  if(app){
    app.style.removeProperty('padding-left');
    app.style.removeProperty('padding-right');
    app.style.removeProperty('margin-left');
    app.style.removeProperty('margin-right');
  }
}
function bindCommunityButton(){
  const btn=$('communityBtn');
  if(!btn||btn.dataset.lxRebuildBound)return;
  btn.dataset.lxRebuildBound='1';
  btn.addEventListener('click',()=>setTimeout(normalizeCommunity,0),true);
}
function bindRailWheel(){
  qa('#app .rail,#app .lx40-top10-list,#app .lx-music-carousel-track').forEach(rail=>{
    if(rail.dataset.lxWheelBound)return;
    rail.dataset.lxWheelBound='1';
    rail.addEventListener('wheel',e=>{
      if(Math.abs(e.deltaY)<=Math.abs(e.deltaX)||rail.scrollWidth<=rail.clientWidth)return;
      if(e.shiftKey||e.ctrlKey||e.metaKey)return;
      e.preventDefault();
      rail.scrollBy({left:e.deltaY*.9,behavior:'auto'});
    },{passive:false});
  });
}
function afterRender(){
  normalizeLayout();
  bindCommunityButton();
  bindRailWheel();
  setTimeout(()=>{normalizeLayout();bindRailWheel()},60);
  setTimeout(()=>{normalizeLayout();bindRailWheel()},260);
}

function waitForLX(){
  if(!window.LX?.ui){
    setTimeout(waitForLX,80);
    return;
  }
  const LX=window.LX,U=LX.ui;
  try{
    const meta=q('meta[name="lxplus-build"]');
    if(meta)meta.content=BUILD;
    LX.config=LX.config||{};
    LX.config.version=BUILD;
    window.__LX_JS_BUILD=BUILD;
  }catch{}

  if(U.renderApp&&!U.renderApp.__lxRebuildWrapped){
    const old=U.renderApp.bind(U);
    const wrapped=function(...args){
      const out=old(...args);
      queueMicrotask(afterRender);
      return out;
    };
    wrapped.__lxRebuildWrapped=true;
    U.renderApp=wrapped;
    if(LX.ui)LX.ui.renderApp=wrapped;
  }

  if(LX.social?.open&&!LX.social.open.__lxRebuildWrapped){
    const oldOpen=LX.social.open.bind(LX.social);
    const open=async function(...args){
      const out=await oldOpen(...args);
      normalizeCommunity();
      requestAnimationFrame(normalizeCommunity);
      return out;
    };
    open.__lxRebuildWrapped=true;
    LX.social.open=open;
  }

  afterRender();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{normalizeLayout();waitForLX()},{once:true});
}else{
  normalizeLayout();waitForLX();
}

const mo=new MutationObserver(muts=>{
  let relevant=false;
  for(const m of muts){
    if(m.addedNodes&&m.addedNodes.length){relevant=true;break}
  }
  if(!relevant)return;
  requestAnimationFrame(()=>{
    normalizeOverlays();
    normalizeCommunity();
    normalizeImages();
    bindRailWheel();
  });
});
mo.observe(document.documentElement,{childList:true,subtree:true});

addEventListener('pageshow',()=>setTimeout(afterRender,0));
console.info('[LX Plus]',BUILD,'rebuild guard ready');
})();