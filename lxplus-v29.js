/* LX Plus v29.7 — conservative client-side stability layer */
(()=>{
  'use strict';
  const LX=window.LX=window.LX||{};
  window.__LX_MODULES=window.__LX_MODULES||{};
  window.__LX_MODULES.v29='29.7';
  LX.v29={version:'29.7',stability:true};

  function tuneImages(root=document){
    const imgs=root.querySelectorAll?.('.home-content img,.rail img,.lx-music-main img,.lx-community-drawer img,.panel-page img')||[];
    for(const img of imgs){
      if(!img.hasAttribute('loading'))img.loading='lazy';
      if(!img.hasAttribute('decoding'))img.decoding='async';
      img.draggable=false;
    }
  }
  function cleanTransientEmptySurfaces(root=document){
    for(const el of root.querySelectorAll?.('.lx-music-carousel')||[]){
      const hasCard=!!el.querySelector('.lx-music-feature');
      el.classList.toggle('lx-v29-empty',!hasCard);
    }
  }
  function hydrate(root=document){tuneImages(root);cleanTransientEmptySurfaces(root)}
  const start=()=>{
    hydrate(document);
    const target=document.getElementById('app')||document.body;
    if(!target||!window.MutationObserver)return;
    let queued=false;
    const obs=new MutationObserver(()=>{
      if(queued)return;queued=true;
      requestAnimationFrame(()=>{queued=false;hydrate(target)});
    });
    obs.observe(target,{subtree:true,childList:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
