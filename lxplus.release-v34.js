/* LX Plus Release UI34 — canonical updater for the maintenance build. */
(()=>{'use strict';
  const BUILD='R12.4-UI35-MUSIC-SOCIAL-20261002';
  const VERSION='UI35';
  let busy=false,timer=0;
  const LX=()=>window.LX||{};
  const toast=m=>{try{LX().toast?.(m)}catch{}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loadedBuild=()=>document.querySelector('meta[name="lxplus-build"]')?.content||window.LX_CANONICAL_SHELL||BUILD;

  function normalizeVersion(v){return String(v||'').trim().toUpperCase().replace(/^UI\s*/,'UI')}
  function cleanLegacyUrl(){
    try{
      const u=new URL(location.href);
      ['lxui','lxbuild','_'].forEach(k=>u.searchParams.delete(k));
      const next=u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:'')+u.hash;
      history.replaceState(history.state,'',next);
    }catch{}
  }

  async function published(){
    try{
      const r=await fetch(`./release-manifest.json?_${Date.now()}`,{cache:'no-store',headers:{'cache-control':'no-cache'}});
      if(r.ok){const data=await r.json();if(data?.version)return data}
    }catch{}
    return {version:VERSION,build:BUILD};
  }

  async function clearTechnical(){
    try{
      if('caches'in window){for(const k of await caches.keys())if(k.startsWith('lxplus-'))await caches.delete(k)}
      if('serviceWorker'in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister().catch(()=>false)}
    }catch(e){console.warn('LX UI34 cache cleanup',e)}
  }

  function freshUrl(){
    const u=new URL(location.href);
    ['lxui','lxbuild','_'].forEach(k=>u.searchParams.delete(k));
    u.searchParams.set('lxui',VERSION);
    u.searchParams.set('_',String(Date.now()));
    return u.toString();
  }

  async function forceUpdate(){
    if(busy)return false;busy=true;
    toast('Buscando a versão mais recente da LX Plus…');
    try{
      await clearTechnical();
      sessionStorage.setItem('lx_ui34_refresh_once','1');
      location.replace(freshUrl());
      return true;
    }catch(e){console.warn('LX UI34 force update',e);location.replace(freshUrl());return false}
    finally{setTimeout(()=>busy=false,1500)}
  }

  function modalHtml(latest){
    const remote=normalizeVersion(latest?.version||VERSION);
    const same=remote===normalizeVersion(VERSION)&&(!latest?.build||latest.build===loadedBuild());
    const title=same?'✓ Você já está atualizado':'↻ Existe uma versão mais recente';
    return `<button class="close-btn" type="button" data-lx-release-close>×</button><div class="panel-page"><div class="panel-head"><div><span class="eyebrow">LX PLUS · ATUALIZAÇÕES</span><h2>Atualização do site</h2></div></div><div style="display:grid;gap:12px;margin-top:18px"><div class="lx-device-note"><b>${title}</b><br><br><span>Versão carregada: <b>${esc(VERSION)}</b></span><br><span>Versão oficial: <b>${esc(remote||VERSION)}</b></span><br><small>${esc(loadedBuild())}</small></div><div class="lx-settings-actions"><button class="lx-setting-btn primary" type="button" data-lx-release-refresh>${same?'Recarregar arquivos da versão atual':'Atualizar agora'}</button></div><small>A LX Plus usa uma única interface. A URL antiga UI26 não define mais a versão do site.</small></div></div>`;
  }

  async function openCenter(){
    const latest=await published();
    const modal=document.getElementById('modal'),overlay=document.getElementById('overlay');
    if(!modal||!overlay){toast(`LX Plus ${VERSION}`);return latest}
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
        if(/\bUI\s*(?:26|31|32)(?:\.\d+)?\b/i.test(n.nodeValue||''))n.nodeValue=n.nodeValue.replace(/\bUI\s*(?:26|31|32)(?:\.\d+)?\b/ig,VERSION);
      }
    }
  }

  function bind(){
    fixVisibleVersionLabels();
    document.querySelectorAll('[data-update-site]').forEach(btn=>{
      if(btn.dataset.lxReleaseV321==='1')return;
      btn.dataset.lxReleaseV321='1';
      btn.onclick=null;
      btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openCenter()},true);
    });
  }

  function boot(){
    window.LX_CANONICAL_SHELL=BUILD;
    window.LX_CANONICAL_VERSION=VERSION;
    cleanLegacyUrl();
    bind();
    const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(bind,25)});mo.observe(document.documentElement,{subtree:true,childList:true});
  }

  const api={version:'35',ui:VERSION,build:BUILD,openCenter,forceUpdate,check:published,status:()=>({version:VERSION,build:BUILD,current:loadedBuild(),ready:loadedBuild()===BUILD})};
  window.LXReleaseV34=api;
  window.LXReleaseV33=api;
  window.LXReleaseV321=api;
  window.LXReleaseV32=api;
  window.LXCanonicalUI26=api;
  window.LXCanonicalUpdateV31=api;
  window.LXForceUpdate=forceUpdate;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
