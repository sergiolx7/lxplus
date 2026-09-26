/* LX Plus — Release Manager V17
   One official release record in lx_settings controls global refreshes.
   - public version certificate in profile menu
   - ADM card with "Atualizar site para todos"
   - realtime + persistent release state
   - cache/SW refresh with one-shot loop protection
*/
(()=>{'use strict';
  if(window.LXReleaseManagerV17)return;
  const LOCAL_BUILD='R12.4-UI23-GLOBAL-RELEASE-20260926';
  const VERSION='UI23';
  const KEY='app_release';
  const APPLIED='lx_release_applied_v17';
  const STYLE_ID='lxReleaseManagerV17Css';
  let client=null,channel=null,remote=null,started=false,adminHooked=false,adminOpenUntil=0,refreshing=false,lastRead=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAdmin=()=>!!(window.LX?.ui?.state?.user?.admin||window.LX?.cloud?.profile?.()?.admin);
  const releaseValue=row=>row?.value&&typeof row.value==='object'?row.value:row||{};
  const tokenOf=value=>String(value?.nonce||value?.published_at||value?.build||'');
  const current=()=>!remote?.build||String(remote.build)===LOCAL_BUILD;

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      .lx-release-cert{margin:7px 8px 4px;padding:10px 11px;border:1px solid color-mix(in srgb,var(--accent,#42a5ff) 28%,rgba(255,255,255,.10));border-radius:12px;background:color-mix(in srgb,var(--accent,#42a5ff) 7%,rgba(7,9,14,.92));display:grid;gap:3px;cursor:pointer}
      .lx-release-cert strong{font:800 10px/1.25 system-ui;color:#f4f7ff}.lx-release-cert small{font:650 9px/1.35 system-ui;color:rgba(226,232,244,.62)}
      .lx-release-cert i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;background:#35d07f;box-shadow:0 0 12px rgba(53,208,127,.55)}
      .lx-release-cert.is-old i{background:#ffb44a;box-shadow:0 0 12px rgba(255,180,74,.55)}
      .lx-release-admin{margin:16px 0;padding:18px;border:1px solid color-mix(in srgb,var(--accent,#42a5ff) 32%,rgba(255,255,255,.10));border-radius:18px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent,#42a5ff) 10%,rgba(10,13,20,.96)),rgba(5,7,12,.96));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}
      .lx-release-admin h3{margin:5px 0 5px;font-size:18px}.lx-release-admin p{margin:0;color:var(--muted,#9aa4b4);font-size:11px;line-height:1.5}.lx-release-admin .eyebrow{font-size:9px;font-weight:850;letter-spacing:.13em;color:color-mix(in srgb,var(--accent,#42a5ff) 58%,white 42%)}
      .lx-release-version{display:inline-flex;align-items:center;gap:7px;margin-top:9px;padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.055);font:750 9px/1 system-ui}.lx-release-version i{width:7px;height:7px;border-radius:50%;background:#35d07f}.lx-release-version.is-old i{background:#ffb44a}
      .lx-release-admin button{min-height:40px;white-space:nowrap}.lx-release-admin button[disabled]{opacity:.55;cursor:wait}
      .lx-release-dialog{max-width:620px;margin:auto;padding:28px}.lx-release-dialog .lx-release-big{margin:20px 0;padding:20px;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035)}
      @media(max-width:720px){.lx-release-admin{grid-template-columns:1fr}.lx-release-admin button{width:100%}}
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
  function versionText(){return String(remote?.version||remote?.build||VERSION)}

  function renderProfileCertificate(){
    ensureStyle();
    const menu=document.getElementById('lxProfileMenu'),actions=menu?.querySelector?.('.lx-profile-menu-actions');if(!actions)return;
    let cert=menu.querySelector('.lx-release-cert');
    if(!cert){cert=document.createElement('div');cert.className='lx-release-cert';cert.setAttribute('role','button');cert.tabIndex=0;cert.onclick=openStatus;cert.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openStatus()}};actions.before(cert)}
    cert.classList.toggle('is-old',!current());
    cert.innerHTML=`<strong><i></i> Certificado de versão · ${esc(versionText())}</strong><small>${esc(statusText())}</small>`;
  }

  function looksLikeAdmin(root){
    if(!isAdmin()||!root)return false;
    if(Date.now()<adminOpenUntil)return true;
    const text=String(root.textContent||'').slice(0,500).toLowerCase();
    return /painel\s*adm|administra[cç][aã]o|dashboard\s*adm|cat[aá]logo.*adm/.test(text);
  }

  function renderAdminCard(){
    ensureStyle();
    const modal=document.getElementById('modal'),overlay=document.getElementById('overlay');if(!modal||overlay?.classList.contains('hidden')||!looksLikeAdmin(modal))return;
    if(modal.querySelector('.lx-release-admin'))return;
    const page=modal.querySelector('.panel-page,.admin-page,.lx-admin-page')||modal;
    const card=document.createElement('section');card.className='lx-release-admin';
    card.innerHTML=`<div><span class="eyebrow">VERSÃO OFICIAL LX PLUS</span><h3>Atualização do site</h3><p>Publica esta build como versão oficial e manda todos os usuários conectados limparem o cache antigo e recarregarem a LX.</p><span class="lx-release-version ${current()?'':'is-old'}"><i></i><b>${esc(versionText())}</b> · ${esc(statusText())}</span></div><button type="button" class="primary-btn" data-lx-release-all>Atualizar site para todos</button>`;
    const head=page.querySelector('.panel-head,.admin-head,.lx-admin-heading');head?.after?.(card)||page.prepend(card);
    card.querySelector('[data-lx-release-all]').onclick=publishForEveryone;
  }

  function hookAdmin(){
    if(adminHooked)return;
    const LX=window.LX;if(!LX||typeof LX.openAdmin!=='function')return;
    const original=LX.openAdmin;if(original.__lxReleaseV17){adminHooked=true;return}
    const wrapped=function(...args){adminOpenUntil=Date.now()+12000;const out=original.apply(this,args);setTimeout(renderAdminCard,0);setTimeout(renderAdminCard,180);return out};
    wrapped.__lxReleaseV17=true;wrapped.__original=original;LX.openAdmin=wrapped;adminHooked=true;
  }

  function openStatus(){
    const modal=document.getElementById('modal'),overlay=document.getElementById('overlay');if(!modal||!overlay)return;
    modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page lx-release-dialog"><span class="eyebrow">LX PLUS · VERSÃO OFICIAL</span><h2>Certificado de atualização</h2><div class="lx-release-big"><h3>${current()?'✓ Você está na versão mais recente':'↻ Existe uma versão mais recente'}</h3><p>Versão deste aparelho: <b>${esc(VERSION)}</b><br>Versão oficial: <b>${esc(versionText())}</b></p></div><button class="primary-btn" data-lx-refresh-now>Verificar e atualizar agora</button></div>`;
    overlay.classList.remove('hidden');modal.querySelector('[data-lx-refresh-now]').onclick=()=>forceRefresh(`manual_${Date.now()}`,120);
  }

  async function clearLXCache(){
    try{if('caches'in window){for(const key of await caches.keys())if(/^lxplus-/i.test(key))await caches.delete(key)}}catch{}
    try{const reg=await navigator.serviceWorker?.getRegistration?.();await reg?.update?.();if(reg?.waiting)reg.waiting.postMessage({type:'LX_SKIP_WAITING'})}catch{}
  }

  async function forceRefresh(token,delay=450){
    if(refreshing)return;refreshing=true;
    const t=String(token||Date.now());
    try{localStorage.setItem(APPLIED,t)}catch{}
    toast('LX Plus atualizando para a versão mais recente…');
    await clearLXCache();
    setTimeout(()=>{
      try{const u=new URL(location.href);u.searchParams.set('lxrelease',t);location.replace(u.toString())}catch{location.reload()}
    },delay);
  }

  async function handleRelease(row,{initial=false}={}){
    const value=releaseValue(row);if(!value?.build)return;
    remote=value;renderProfileCertificate();renderAdminCard();
    const token=tokenOf(value);let applied='';try{applied=localStorage.getItem(APPLIED)||''}catch{}
    if(initial){
      if(String(value.build)===LOCAL_BUILD){try{if(token)localStorage.setItem(APPLIED,token)}catch{};return}
      if(token&&token!==applied)await forceRefresh(token,350);
      return;
    }
    if(token&&token!==applied)await forceRefresh(token,550);
  }

  async function readRelease(){
    const c=await db();if(!c)return null;
    try{const {data,error}=await c.from('lx_settings').select('key,value,updated_at').eq('key',KEY).maybeSingle();if(error)throw error;if(data)await handleRelease(data,{initial:true});lastRead=Date.now();return data||null}catch(error){console.warn('LX Release read',error);return null}
  }

  async function subscribe(){
    const c=await db();if(!c||channel)return false;
    channel=c.channel('lx-app-release-v17-'+Math.random().toString(36).slice(2,8)).on('postgres_changes',{event:'*',schema:'public',table:'lx_settings',filter:`key=eq.${KEY}`},payload=>handleRelease(payload.new||{}, {initial:false})).subscribe();
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
      remote=value;renderProfileCertificate();toast('Atualização publicada para todos os usuários.');
      setTimeout(()=>forceRefresh(nonce,180),650);
    }catch(error){console.error('LX Release publish',error);toast('Não foi possível publicar a atualização.');if(button){button.disabled=false;button.textContent='Atualizar site para todos'}}
  }

  function cleanupReleaseParam(){try{const u=new URL(location.href);if(u.searchParams.has('lxrelease')){u.searchParams.delete('lxrelease');history.replaceState(null,'',u.pathname+(u.search||'')+u.hash)}}catch{}}

  async function boot(){
    if(started)return;started=true;ensureStyle();cleanupReleaseParam();
    await readRelease();await subscribe();hookAdmin();renderProfileCertificate();renderAdminCard();
    const obs=new MutationObserver(()=>{hookAdmin();renderProfileCertificate();renderAdminCard()});obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    setInterval(()=>{hookAdmin();renderProfileCertificate();renderAdminCard();if(Date.now()-lastRead>60000)readRelease()},1800);
  }

  window.LXReleaseManagerV17={version:'17.0',build:LOCAL_BUILD,displayVersion:VERSION,readRelease,publishForEveryone,forceRefresh,get remote(){return remote},get latest(){return current()}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
