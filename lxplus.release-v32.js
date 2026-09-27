/* LX Plus Release V32 — single-shell updater and truthful version state. */
(()=>{'use strict';
  if(window.LXReleaseV32)return;
  const BUILD='R12.4-UI32-SINGLE-SHELL-20260927';
  const VERSION='UI32';
  let busy=false, timer=0;
  const LX=()=>window.LX||{};
  const toast=m=>{try{LX().toast?.(m)}catch{}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loadedBuild=()=>document.querySelector('meta[name="lxplus-build"]')?.content||BUILD;
  const loadedVersion=()=>VERSION;
  const cleanUrl=()=>{try{const u=new URL(location.href);u.searchParams.delete('lxbuild');u.searchParams.delete('_');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}catch{}};

  async function published(){
    try{
      const db=LX().cloud?.db?.();
      if(db){
        const {data,error}=await db.from('lx_settings').select('value,updated_at').eq('key','app_release').maybeSingle();
        if(!error&&data?.value)return data.value;
      }
    }catch(e){console.warn('LX release lookup',e)}
    try{
      const r=await fetch(`./release-manifest.json?_${Date.now()}`,{cache:'no-store'});
      if(r.ok)return await r.json();
    }catch{}
    return {version:VERSION,build:BUILD};
  }

  async function clearTechnical(){
    try{
      if('caches'in window){for(const k of await caches.keys())if(k.startsWith('lxplus-'))await caches.delete(k)}
      if('serviceWorker'in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister().catch(()=>false)}
    }catch(e){console.warn('LX clear update cache',e)}
  }

  function freshUrl(){const u=new URL(location.href);u.searchParams.set('lxbuild',VERSION);u.searchParams.set('_',String(Date.now()));return u.toString()}

  async function forceUpdate(){
    if(busy)return false;busy=true;
    toast('Aplicando a versão mais recente da LX Plus…');
    try{
      await clearTechnical();
      sessionStorage.setItem('lx_ui32_refresh_once','1');
      location.replace(freshUrl());
      return true;
    }catch(e){console.warn('LX UI32 update',e);location.replace(freshUrl());return false}
    finally{setTimeout(()=>busy=false,1500)}
  }

  function modalHtml(latest){
    const remote=String(latest?.version||VERSION).replace(/^UI/i,'UI');
    const same=remote.toUpperCase()===VERSION;
    return `<button class="close-btn" type="button" data-lx-release-close>×</button><div class="panel-page"><div class="panel-head"><div><span class="eyebrow">LX PLUS · ATUALIZAÇÃO</span><h2>Versão do site</h2><p>O site usa uma única interface canônica. A versão antiga não fica carregada por baixo.</p></div></div><div style="display:grid;gap:12px;margin-top:18px"><div class="lx-device-note"><b>Versão carregada:</b> ${esc(VERSION)}<br><small>${esc(loadedBuild())}</small></div><div class="lx-device-note"><b>Versão publicada:</b> ${esc(remote||VERSION)}${same?' · atualizada':' · atualização disponível'}</div><div class="lx-settings-actions"><button class="lx-setting-btn primary" type="button" data-lx-release-refresh>${same?'Recarregar versão atual':'Atualizar agora'}</button></div></div></div>`;
  }

  async function openCenter(){
    const latest=await published();
    const modal=document.getElementById('modal'),overlay=document.getElementById('overlay');
    if(!modal||!overlay){toast(`LX Plus ${VERSION} · ${String(latest?.version||VERSION)}`);return latest}
    modal.innerHTML=modalHtml(latest);overlay.classList.remove('hidden');
    modal.querySelector('[data-lx-release-close]')?.addEventListener('click',()=>LX().ui?.close?.());
    modal.querySelector('[data-lx-release-refresh]')?.addEventListener('click',forceUpdate);
    return latest;
  }

  function fixVisibleVersionLabels(){
    document.documentElement.dataset.lxCanonicalVersion=VERSION;
    document.querySelectorAll('[data-lx-current-version],[data-current-version],[data-app-version]').forEach(el=>el.textContent=VERSION);
    const roots=[document.getElementById('modal'),document.getElementById('lxProfileMenu')].filter(Boolean);
    for(const root of roots){
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
      while((n=walker.nextNode())){
        if(/\bUI\s*26\b/i.test(n.nodeValue||''))n.nodeValue=n.nodeValue.replace(/\bUI\s*26\b/ig,VERSION);
      }
    }
  }

  function bind(){
    fixVisibleVersionLabels();
    document.querySelectorAll('[data-update-site]').forEach(btn=>{
      if(btn.dataset.lxReleaseV32==='1')return;
      btn.dataset.lxReleaseV32='1';
      btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openCenter()},true);
    });
  }
  function boot(){
    window.LX_CANONICAL_SHELL=BUILD;window.LX_CANONICAL_VERSION=VERSION;
    cleanUrl();bind();
    const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(bind,25)});mo.observe(document.documentElement,{subtree:true,childList:true});
  }
  const api={version:'32.0',ui:VERSION,build:BUILD,openCenter,forceUpdate,check:published,status:()=>({version:VERSION,build:BUILD,current:loadedBuild(),ready:loadedBuild()===BUILD})};
  window.LXReleaseV32=api;window.LXForceUpdate=forceUpdate;window.LXCanonicalUI26=api;window.LXCanonicalUpdateV31=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
