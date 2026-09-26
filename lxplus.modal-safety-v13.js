/* LX Plus — Modal Safety V13
   Post-login guard for generic LX dialogs that exceed the viewport.
   Forces reliable vertical scrolling even if another stylesheet later changes overflow. */
(()=>{'use strict';
  const STYLE_ID='lxModalSafetyV13Css';
  let timer=0,observer=null;
  const $=id=>document.getElementById(id);

  function appVisible(){
    const app=$('app');
    return !!app&&!app.classList.contains('hidden')&&getComputedStyle(app).display!=='none';
  }

  function ensureStyle(){
    const existing=$(STYLE_ID);
    if(existing){
      if(existing.parentNode===document.head)document.head.appendChild(existing);
      return existing;
    }
    const link=document.createElement('link');
    link.id=STYLE_ID;link.rel='stylesheet';link.href='lxplus.modal-safety-v13.css?v=20260926-2';
    document.head.appendChild(link);
    return link;
  }

  function overlayOpen(overlay){
    return !!overlay&&!overlay.classList.contains('hidden')&&getComputedStyle(overlay).display!=='none';
  }

  function specialLayout(modal){
    if(!modal)return true;
    return !!(
      modal.querySelector('.detail-shell-v256')||
      modal.querySelector('.lx-now-playing-v6')||
      modal.querySelector('.watch-player')||
      modal.querySelector('.reader-page')
    );
  }

  function clear(){
    const overlay=$('overlay'),modal=$('modal');
    overlay?.classList.remove('lx-modal-safety-v13','lx-admin-editor-v13','lx-modal-overflow-v13');
    document.documentElement.classList.remove('lx-modal-open-v13');
    if(modal?.dataset.lxModalSafetyV13==='1'){
      ['max-height','height','overflow-y','overflow-x','overscroll-behavior','-webkit-overflow-scrolling','touch-action'].forEach(p=>modal.style.removeProperty(p));
      delete modal.dataset.lxModalSafetyV13;
    }
  }

  function forceScroll(modal){
    if(!modal)return;
    modal.dataset.lxModalSafetyV13='1';
    modal.style.setProperty('height','auto','important');
    modal.style.setProperty('max-height','calc(100dvh - 28px)','important');
    modal.style.setProperty('overflow-y','auto','important');
    modal.style.setProperty('overflow-x','hidden','important');
    modal.style.setProperty('overscroll-behavior','contain','important');
    modal.style.setProperty('-webkit-overflow-scrolling','touch','important');
    modal.style.setProperty('touch-action','pan-y','important');
  }

  function sync(){
    ensureStyle();
    const overlay=$('overlay'),modal=$('modal');
    if(!appVisible()||!overlayOpen(overlay)||!modal||specialLayout(modal)){
      clear();return;
    }
    overlay.classList.add('lx-modal-safety-v13');
    overlay.classList.toggle('lx-admin-editor-v13',!!modal.querySelector('.quick-editor-page'));
    document.documentElement.classList.add('lx-modal-open-v13');
    forceScroll(modal);
    requestAnimationFrame(()=>{
      if(!modal.isConnected)return;
      overlay.classList.toggle('lx-modal-overflow-v13',modal.scrollHeight>modal.clientHeight+2);
    });
  }

  function queue(){clearTimeout(timer);timer=setTimeout(sync,0)}

  function boot(){
    ensureStyle();
    const overlay=$('overlay');
    if(overlay&&'MutationObserver'in window){
      observer=new MutationObserver(queue);
      observer.observe(overlay,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    }
    document.addEventListener('click',()=>setTimeout(sync,0),true);
    window.addEventListener('resize',queue,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(sync,120),{passive:true});
    setInterval(sync,1000);
    sync();
    window.LXModalSafetyV13={version:'13.2',sync,forceScroll};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
