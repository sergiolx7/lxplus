/* LX Plus Canonical Update V31 — reliable PWA refresh without touching user data. */
(()=>{'use strict';
  if(window.LXCanonicalUpdateV31)return;
  const BUILD='R12.4-UI31-CANONICAL-REFRESH-20260927';
  const VERSION='UI31';
  let updating=false,reloadArmed=false;
  const toast=message=>{try{window.LX?.toast?.(message)}catch{}};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const buildUrl=()=>{const u=new URL(location.href);u.searchParams.set('lxbuild',VERSION);u.searchParams.set('_',String(Date.now()));return u.toString()};
  const currentBuild=()=>document.querySelector('meta[name="lxplus-build"]')?.content||window.LX_CANONICAL_SHELL||'';

  async function clearOldCaches(){
    if(!('caches'in window))return;
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('lxplus-')&&!name.includes(BUILD)).map(name=>caches.delete(name)));
  }

  function armReload(){
    if(reloadArmed||!('serviceWorker'in navigator))return;
    reloadArmed=true;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(sessionStorage.getItem('lx_ui31_controller_reload')==='1')return;
      sessionStorage.setItem('lx_ui31_controller_reload','1');
      location.replace(buildUrl());
    });
  }

  async function waitForWorker(reg,timeout=9000){
    if(reg?.active?.scriptURL?.includes('UI31'))return true;
    const worker=reg?.installing||reg?.waiting;
    if(!worker)return false;
    if(worker.state==='activated')return true;
    return await new Promise(resolve=>{
      let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);worker.removeEventListener?.('statechange',onState);resolve(value)};
      const onState=()=>{if(worker.state==='installed'&&reg.waiting)try{reg.waiting.postMessage({type:'LX_SKIP_WAITING'})}catch{};if(worker.state==='activated')finish(true);if(worker.state==='redundant')finish(false)};
      const timer=setTimeout(()=>finish(false),timeout);
      worker.addEventListener?.('statechange',onState);onState();
    });
  }

  async function forceUpdate(){
    if(updating)return false;
    updating=true;armReload();toast('Atualizando a LX Plus pela rede…');
    try{
      await clearOldCaches();
      if(!('serviceWorker'in navigator)){location.replace(buildUrl());return true}
      const reg=await navigator.serviceWorker.register('./service-worker.js?v=UI31',{scope:'./',updateViaCache:'none'});
      try{await reg.update()}catch(error){console.warn('LX UI31 worker update',error)}
      if(reg.waiting)try{reg.waiting.postMessage({type:'LX_SKIP_WAITING'})}catch{}
      await waitForWorker(reg).catch(()=>false);
      await sleep(180);
      location.replace(buildUrl());
      return true;
    }catch(error){
      console.warn('LX canonical update',error);
      toast('A atualização automática falhou. Tentando recarregar pela rede…');
      location.replace(buildUrl());
      return false;
    }finally{setTimeout(()=>{updating=false},1200)}
  }

  function status(){return {version:VERSION,build:BUILD,current:currentBuild(),controller:navigator.serviceWorker?.controller?.scriptURL||'',ready:currentBuild()===BUILD||window.LX_CANONICAL_SHELL===BUILD}}
  function bind(){
    document.documentElement.dataset.lxCanonicalVersion=VERSION;
    document.querySelectorAll('[data-update-site]').forEach(button=>{
      if(button.dataset.lxV31Update==='1')return;
      button.dataset.lxV31Update='1';
      button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();forceUpdate()},true);
    });
  }
  function boot(){armReload();bind();const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(bind,20)});mo.observe(document.documentElement,{subtree:true,childList:true});setInterval(bind,1800)}

  const api={version:'31.0',build:BUILD,forceUpdate,status,openCenter:forceUpdate,check:forceUpdate};
  window.LXCanonicalUpdateV31=api;
  window.LXForceUpdate=forceUpdate;
  window.LXCanonicalUI26=api; // compatibility with the existing settings button
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
