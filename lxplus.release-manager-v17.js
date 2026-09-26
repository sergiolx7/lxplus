/* LX Plus — Release Manager V18
   Public update center + ADM global release control.
   UI is injected into the real profile menu and real ADM navigation.
*/
(()=>{'use strict';
  if(window.LXReleaseManagerV18)return;

  const LOCAL_BUILD='R12.4-UI24-UPDATE-CENTER-20260926';
  const VERSION='UI24';
  const KEY='app_release';
  const APPLIED='lx_release_applied_v18';
  const STYLE_ID='lxReleaseManagerV18Css';

  let client=null,channel=null,remote=null,started=false,refreshing=false,lastRead=0,lastAdminRender=null;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAdmin=()=>!!(window.LX?.ui?.state?.user?.admin||window.LX?.cloud?.profile?.()?.admin);
  const releaseValue=row=>row?.value&&typeof row.value==='object'?row.value:row||{};
  const tokenOf=value=>String(value?.nonce||value?.published_at||value?.build||'');
  const uiNumber=value=>{const m=String(value||'').match(/UI\s*([0-9]+)/i);return m?Number(m[1]):0};
  const remoteUi=()=>uiNumber(remote?.version||remote?.build);
  const localUi=()=>uiNumber(VERSION);
  const needsUpdate=()=>!!remote?.build&&remoteUi()>localUi();
  const current=()=>!needsUpdate();

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      .lx-update-menu-action{position:relative}
      .lx-update-menu-action .lx-update-copy{display:grid;gap:1px;min-width:0;text-align:left}
      .lx-update-menu-action .lx-update-copy b{font:inherit;font-weight:700}
      .lx-update-menu-action .lx-update-copy small{display:block;font-size:8px;line-height:1.2;color:#35d07f;white-space:nowrap}
      .lx-update-menu-action.is-old .lx-update-copy small{color:#ffb44a}
      .lx-update-menu-action .lx-update-dot{width:7px;height:7px;min-width:7px;border-radius:999px;background:#35d07f;box-shadow:0 0 10px rgba(53,208,127,.5);margin-left:auto}
      .lx-update-menu-action.is-old .lx-update-dot{background:#ffb44a;box-shadow:0 0 10px rgba(255,180,74,.45)}
      .lx-release-dialog{max-width:660px;margin:auto;padding:28px}
      .lx-release-big{margin:18px 0;padding:19px;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);display:grid;gap:8px}
      .lx-release-big h3{margin:0;font-size:20px}.lx-release-big p{margin:0;color:var(--muted,#9aa4b4);line-height:1.6}
      .lx-release-actions{display:flex;gap:10px;flex-wrap:wrap}.lx-release-actions button{min-height:40px}
      .lx-release-admin-page{display:grid;gap:14px}
      .lx-release-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .lx-release-admin-card{padding:18px;border-radius:17px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035)}
      .lx-release-admin-card strong{display:block;font-size:20px;margin:4px 0}.lx-release-admin-card small{color:var(--muted,#9aa4b4);line-height:1.5}
      .lx-release-admin-hero{padding:20px;border-radius:20px;border:1px solid color-mix(in srgb,var(--accent,#42a5ff) 32%,rgba(255,255,255,.09));background:linear-gradient(145deg,color-mix(in srgb,var(--accent,#42a5ff) 10%,rgba(10,13,20,.96)),rgba(5,7,12,.96));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}
      .lx-release-admin-hero h2{margin:5px 0}.lx-release-admin-hero p{margin:0;color:var(--muted,#9aa4b4);font-size:11px;line-height:1.5}
      [data-lx-release-admin-tab] .lx-update-admin-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#35d07f;margin-left:5px}
      [data-lx-release-admin-tab].is-old .lx-update-admin-dot{background:#ffb44a}
      @media(max-width:720px){.lx-release-admin-grid{grid-template-columns:1fr}.lx-release-admin-hero{grid-template-columns:1fr}.lx-release-admin-hero button{width:100%}}
    `;document.head.appendChild(s);
  }

  async function db(timeout=16000){
    if(client)return client;
    const end=Date.now()+timeout;
    while(Date.now()<end){
      try{const c=window.LX?.cloud?.db?.();if(c){client=c;return c}}catch{}
      await sleep(180);
    }
    return null;
  }

  function statusText(){return current()?'Você está na versão mais recente':'Nova versão disponível'}
  function officialVersion(){return String(remote?.version||VERSION)}

  function renderProfileUpdateAction(){
    ensureStyle();
    const menu=document.getElementById('lxProfileMenu'),actions=menu?.querySelector?.('.lx-profile-menu-actions');
    if(!actions)return;
    menu.querySelector('.lx-release-cert')?.remove();

    let btn=actions.querySelector('[data-lx-update-menu]');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.setAttribute('data-lx-update-menu','1');
      btn.className='lx-update-menu-action';
      const appearance=actions.querySelector('[data-act="appearance"]');
      if(appearance)appearance.after(btn);else actions.prepend(btn);
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();menu.classList.add('hidden');openStatus()};
    }
    btn.classList.toggle('is-old',needsUpdate());
    btn.innerHTML=`<span>↻</span><span class="lx-update-copy"><b>Atualização do site</b><small>${esc(officialVersion())} · ${esc(statusText())}</small></span><i class="lx-update-dot"></i>`;
  }

  function renderAdminTab(){
    if(!isAdmin())return;
    const adminMain=document.getElementById('adminMain');if(!adminMain)return;
    const navButtons=[...document.querySelectorAll('[data-admin]')];
    if(!navButtons.length)return;

    let tab=document.querySelector('[data-lx-release-admin-tab]');
    if(!tab){
      const anchor=navButtons.find(b=>b.dataset.admin==='appearance')||navButtons[navButtons.length-1];
      tab=document.createElement('button');
      tab.type='button';
      tab.setAttribute('data-lx-release-admin-tab','1');
      tab.className=anchor?.className||'';
      tab.innerHTML='Atualização <i class="lx-update-admin-dot"></i>';
      anchor?.after(tab);
      tab.onclick=()=>{
        document.querySelectorAll('[data-admin]').forEach(x=>x.classList.remove('active'));
        tab.classList.add('active');
        renderAdminPage();
      };
    }
    tab.classList.toggle('is-old',needsUpdate());
  }

  function renderAdminPage(){
    if(!isAdmin())return toast('Acesso ADM indisponível.');
    ensureStyle();
    const m=document.getElementById('adminMain');if(!m)return;
    const updated=remote?.published_at?new Date(remote.published_at).toLocaleString('pt-BR'):'—';
    m.innerHTML=`<div class="lx-release-admin-page">
      <section class="lx-release-admin-hero">
        <div><span class="eyebrow">ATUALIZAÇÃO DO SITE</span><h2>Versão oficial da LX Plus</h2><p>Publique a build atual para todos os usuários conectados. Cada aparelho limpa somente o cache técnico da LX e recarrega sem apagar perfil, preferências, histórico ou login.</p></div>
        <button type="button" class="primary-btn" data-lx-release-all>Atualizar site para todos</button>
      </section>
      <div class="lx-release-admin-grid">
        <section class="lx-release-admin-card"><small>VERSÃO DESTE SITE</small><strong>${esc(VERSION)}</strong><small>${esc(LOCAL_BUILD)}</small></section>
        <section class="lx-release-admin-card"><small>VERSÃO OFICIAL</small><strong>${esc(officialVersion())}</strong><small>${esc(statusText())}</small></section>
        <section class="lx-release-admin-card"><small>ÚLTIMA PUBLICAÇÃO</small><strong>${esc(updated)}</strong><small>Registro persistente no Supabase</small></section>
        <section class="lx-release-admin-card"><small>ATUALIZAÇÃO EM TEMPO REAL</small><strong>Ativa</strong><small>Usuários conectados recebem o novo release pelo Realtime.</small></section>
      </div>
      <div class="lx-release-actions">
        <button type="button" class="glass-btn" data-lx-refresh-self>Verificar e atualizar este aparelho</button>
        <button type="button" class="glass-btn" data-lx-clean-self>Limpar cache técnico deste aparelho</button>
      </div>
    </div>`;
    m.querySelector('[data-lx-release-all]').onclick=publishForEveryone;
    m.querySelector('[data-lx-refresh-self]').onclick=refreshMyApp;
    m.querySelector('[data-lx-clean-self]').onclick=()=>forceRefresh(`clean_${Date.now()}`,120);
  }

  function hookAdminRenderer(){
    const admin=window.LX?.admin;if(!admin||typeof admin.render!=='function')return;
    if(lastAdminRender===admin.render)return;
    const original=admin.render;
    if(original.__lxReleaseV18){lastAdminRender=original;return}
    const wrapped=function(page,...args){
      if(page==='release'){renderAdminPage();renderAdminTab();return}
      const out=original.call(this,page,...args);
      setTimeout(()=>{renderAdminTab();const tab=document.querySelector('[data-lx-release-admin-tab]');if(tab)tab.classList.remove('active')},0);
      return out;
    };
    wrapped.__lxReleaseV18=true;wrapped.__original=original;admin.render=wrapped;lastAdminRender=wrapped;
  }

  async function openStatus(){
    await readRelease().catch(()=>null);
    const modal=document.getElementById('modal'),overlay=document.getElementById('overlay');if(!modal||!overlay)return;
    const updated=remote?.published_at?new Date(remote.published_at).toLocaleString('pt-BR'):'—';
    modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page lx-release-dialog">
      <span class="eyebrow">LX PLUS · ATUALIZAÇÕES</span>
      <h2>Atualização do site</h2>
      <div class="lx-release-big"><h3>${current()?'✓ Você está na versão mais recente':'↻ Existe uma versão mais recente'}</h3>
      <p>Versão deste aparelho: <b>${esc(VERSION)}</b><br>Versão oficial: <b>${esc(officialVersion())}</b><br>Última publicação: <b>${esc(updated)}</b></p></div>
      <div class="lx-release-actions">
        <button class="primary-btn" data-lx-refresh-now>${needsUpdate()?'Atualizar agora':'Verificar e atualizar agora'}</button>
        <button class="glass-btn" data-lx-clean-cache>Limpar cache técnico</button>
      </div>
      <p style="margin-top:14px;color:var(--muted);font-size:10px;line-height:1.5">A limpeza remove somente arquivos temporários da LX Plus. Perfil, conta, histórico, listas e preferências não são apagados.</p>
    </div>`;
    overlay.classList.remove('hidden');
    modal.querySelector('[data-lx-refresh-now]').onclick=refreshMyApp;
    modal.querySelector('[data-lx-clean-cache]').onclick=()=>forceRefresh(`clean_${Date.now()}`,120);
  }

  async function clearLXCache(){
    try{
      if('caches'in window){
        for(const key of await caches.keys())if(/^lx(?:plus|-plus|_plus)/i.test(key))await caches.delete(key);
      }
    }catch{}
    try{
      const reg=await navigator.serviceWorker?.getRegistration?.();
      reg?.active?.postMessage?.({type:'LX_CLEAR_CACHE'});
      await reg?.update?.();
      if(reg?.waiting)reg.waiting.postMessage({type:'LX_SKIP_WAITING'});
    }catch{}
  }

  async function forceRefresh(token,delay=350){
    if(refreshing)return;refreshing=true;
    const t=String(token||Date.now());
    try{localStorage.setItem(APPLIED,t)}catch{}
    toast('LX Plus atualizando…');
    await clearLXCache();
    setTimeout(()=>{
      try{const u=new URL(location.href);u.searchParams.set('lxrelease',t);u.searchParams.set('_',Date.now());location.replace(u.toString())}
      catch{location.reload()}
    },delay);
  }

  async function refreshMyApp(){
    await readRelease().catch(()=>null);
    const token=tokenOf(remote)||`manual_${Date.now()}`;
    await forceRefresh(token,120);
  }

  async function handleRelease(row,{initial=false}={}){
    const value=releaseValue(row);if(!value?.build)return;
    remote=value;renderProfileUpdateAction();renderAdminTab();
    const token=tokenOf(value);let applied='';try{applied=localStorage.getItem(APPLIED)||''}catch{}

    if(initial){
      if(!needsUpdate()){try{if(token)localStorage.setItem(APPLIED,token)}catch{};return}
      if(token&&token!==applied)await forceRefresh(token,300);
      return;
    }

    if(token&&token!==applied&&(needsUpdate()||value.force===true))await forceRefresh(token,500);
  }

  async function readRelease(){
    const c=await db();if(!c)return null;
    try{
      const {data,error}=await c.from('lx_settings').select('key,value,updated_at').eq('key',KEY).maybeSingle();
      if(error)throw error;if(data)await handleRelease(data,{initial:true});lastRead=Date.now();return data||null;
    }catch(error){console.warn('LX Release read',error);return null}
  }

  async function subscribe(){
    const c=await db();if(!c||channel)return false;
    channel=c.channel('lx-app-release-v18-'+Math.random().toString(36).slice(2,8))
      .on('postgres_changes',{event:'*',schema:'public',table:'lx_settings',filter:`key=eq.${KEY}`},payload=>handleRelease(payload.new||{}, {initial:false}))
      .subscribe();
    return true;
  }

  async function publishForEveryone(event){
    const button=event?.currentTarget;if(!isAdmin())return toast('Somente o ADM pode publicar uma atualização.');
    if(button){button.disabled=true;button.textContent='Publicando…'}
    try{
      const c=await db();if(!c)throw new Error('CLOUD_NOT_READY');
      const nonce=`${Date.now().toString(36)}_${crypto?.randomUUID?.().slice(0,8)||Math.random().toString(36).slice(2,10)}`;
      const now=new Date().toISOString(),value={build:LOCAL_BUILD,version:VERSION,nonce,published_at:now,force:true};
      try{localStorage.setItem(APPLIED,nonce)}catch{}
      const {error}=await c.from('lx_settings').upsert({key:KEY,value,updated_at:now},{onConflict:'key'});if(error)throw error;
      remote=value;renderProfileUpdateAction();renderAdminTab();
      toast('Atualização enviada para todos os usuários.');
      setTimeout(()=>forceRefresh(nonce,180),650);
    }catch(error){
      console.error('LX Release publish',error);toast('Não foi possível publicar a atualização.');
      if(button){button.disabled=false;button.textContent='Atualizar site para todos'}
    }
  }

  function cleanupReleaseParam(){
    try{
      const u=new URL(location.href);
      if(u.searchParams.has('lxrelease')||u.searchParams.has('_')){
        u.searchParams.delete('lxrelease');u.searchParams.delete('_');
        history.replaceState(null,'',u.pathname+(u.search||'')+u.hash);
      }
    }catch{}
  }

  function syncUI(){
    hookAdminRenderer();
    renderProfileUpdateAction();
    renderAdminTab();
  }

  async function boot(){
    if(started)return;started=true;ensureStyle();cleanupReleaseParam();
    await readRelease();await subscribe();syncUI();

    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-admin]'))document.querySelector('[data-lx-release-admin-tab]')?.classList.remove('active');
    },true);

    const obs=new MutationObserver(()=>syncUI());
    obs.observe(document.body,{subtree:true,childList:true});

    setInterval(()=>{syncUI();if(Date.now()-lastRead>120000)readRelease()},5000);
  }

  window.LXReleaseManagerV18={
    version:'18.0',build:LOCAL_BUILD,displayVersion:VERSION,
    readRelease,publishForEveryone,refreshMyApp,forceRefresh,openStatus,renderAdminPage,
    get remote(){return remote},get latest(){return current()}
  };
  window.LXReleaseManagerV17=window.LXReleaseManagerV18;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
