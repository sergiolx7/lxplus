/* LX Plus — Boot Recovery 2026-09-26
   One-time browser shell recovery. Keeps auth/session/catalog data intact. */
(()=>{'use strict';
  const KEY='lx_boot_recovery_20260926_v2';
  const cleanUrl=()=>{try{const u=new URL(location.href);if(u.searchParams.has('lxrecover')){u.searchParams.delete('lxrecover');history.replaceState(null,'',u.pathname+(u.search?u.search:'')+u.hash)}}catch{}};
  const reveal=()=>{
    try{
      document.getElementById('lxVisualIntro335')?.remove();
      const splash=document.getElementById('splash');
      if(splash){splash.classList.add('hidden');splash.style.setProperty('display','none','important');splash.style.setProperty('pointer-events','none','important')}
      const ids=['auth','profiles','app','admin'];
      const visible=ids.some(id=>{const el=document.getElementById(id);return el&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none'});
      if(!visible){const auth=document.getElementById('auth');if(auth){auth.classList.remove('hidden');auth.style.removeProperty('display')}}
    }catch{}
  };
  reveal();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reveal,{once:true});
  setTimeout(reveal,100);setTimeout(reveal,1200);setTimeout(reveal,3500);
  let done=false;try{done=sessionStorage.getItem(KEY)==='1'}catch{}
  if(done){cleanUrl();return}
  try{sessionStorage.setItem(KEY,'1')}catch{}
  (async()=>{
    try{
      if('caches'in window){for(const name of await caches.keys()){if(String(name).startsWith('lxplus-'))await caches.delete(name)}}
      if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();for(const r of regs){try{await r.unregister()}catch{}}}
    }catch(e){console.warn('LX boot recovery',e)}
    try{
      const u=new URL(location.href);u.searchParams.set('lxrecover',Date.now().toString(36));location.replace(u.toString());
    }catch{location.reload()}
  })();
})();
