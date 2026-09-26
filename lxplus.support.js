/* LX Plus — Canonical Controller UI25
   Loaded directly by index.html through lxplus.support.js.
   One owner for build/update state, profile update menu and cache rotation.
*/
(()=>{'use strict';
  if(window.LXCanonicalUI25)return;
  const BUILD='R12.4-UI25-CANONICAL-20260926';
  const VERSION='UI25';
  const RELEASE_KEY='app_release';
  const APPLIED='lx_canonical_release_ui25';
  const BUILD_KEY='lx_canonical_build';
  let remote=null,dbClient=null,channel=null,refreshing=false,adminPatched=false,lastRead=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};
  const isAdmin=()=>!!window.LX?.ui?.state?.user?.admin;
  const uiNo=x=>Number(String(x||'').match(/UI\s*([0-9]+)/i)?.[1]||0);
  const official=()=>String(remote?.version||VERSION);
  const needsUpdate=()=>uiNo(remote?.version||remote?.build)>uiNo(VERSION);
  const status=()=>needsUpdate()?'Nova versão disponível':'Você está na versão mais recente';
  const releaseToken=()=>String(remote?.nonce||remote?.published_at||remote?.build||'');

  window.LX_CANONICAL_BUILD=BUILD;
  window.LX_CANONICAL_VERSION=VERSION;
  const meta=document.querySelector('meta[name="lxplus-build"]');if(meta)meta.content=BUILD;
  document.documentElement.dataset.lxCanonical='25';

  function ensureStyle(){
    if(document.getElementById('lxCanonical25Css'))return;
    const s=document.createElement('style');s.id='lxCanonical25Css';s.textContent=`
      #lxProfileMenu .lx25-update-action{display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;position:relative!important}
      #lxProfileMenu .lx25-update-action .lx25-copy{display:grid;gap:1px;min-width:0;text-align:left;flex:1}
      #lxProfileMenu .lx25-update-action .lx25-copy b{font:inherit;font-weight:700}.lx25-update-action .lx25-copy small{font-size:8px;line-height:1.25;color:#35d07f;white-space:nowrap}
      #lxProfileMenu .lx25-update-action.is-old .lx25-copy small{color:#ffb44a}.lx25-dot{width:7px;height:7px;border-radius:50%;background:#35d07f;box-shadow:0 0 10px #35d07f70;flex:none}.is-old>.lx25-dot{background:#ffb44a;box-shadow:0 0 10px #ffb44a70}
      .lx25-update-page{max-width:680px;margin:auto;padding:28px}.lx25-version-card{margin:18px 0;padding:20px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.035);display:grid;gap:8px}.lx25-version-card h3{margin:0;font-size:20px}.lx25-version-card p{margin:0;color:var(--muted,#9aa4b4);line-height:1.65}.lx25-actions{display:flex;gap:10px;flex-wrap:wrap}.lx25-actions button{min-height:40px}
      [data-lx25-admin-tab]{position:relative}[data-lx25-admin-tab] .lx25-dot{display:inline-block;margin-left:7px}.lx25-admin{display:grid;gap:15px}.lx25-admin-hero{padding:20px;border-radius:20px;border:1px solid color-mix(in srgb,var(--accent,#42a5ff) 30%,rgba(255,255,255,.09));background:linear-gradient(145deg,color-mix(in srgb,var(--accent,#42a5ff) 9%,rgba(8,11,18,.96)),rgba(5,7,12,.97));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}.lx25-admin-hero h2{margin:5px 0}.lx25-admin-hero p{margin:0;color:var(--muted,#9aa4b4);font-size:11px;line-height:1.55}.lx25-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lx25-admin-card{padding:18px;border-radius:17px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035)}.lx25-admin-card small{color:var(--muted,#9aa4b4)}.lx25-admin-card strong{display:block;font-size:19px;margin:5px 0}
      @media(max-width:720px){.lx25-admin-grid,.lx25-admin-hero{grid-template-columns:1fr}.lx25-admin-hero button{width:100%}.lx25-update-page{padding:20px}}
    `;document.head.appendChild(s);
  }

  async function db(timeout=16000){
    if(dbClient)return dbClient;
    const end=Date.now()+timeout;
    while(Date.now()<end){try{const c=window.LX?.cloud?.db?.();if(c){dbClient=c;return c}}catch{}await sleep(160)}
    return null;
  }

  function loadSupportCore(){
    if(window.LX?.support||document.getElementById('lxSupportCoreUI25'))return;
    const s=document.createElement('script');s.id='lxSupportCoreUI25';s.src='lxplus.support-core.js?v='+encodeURIComponent(BUILD);s.async=false;s.onerror=()=>console.warn('LX: suporte base não carregou');document.head.appendChild(s);
  }

  async function clearTechnicalCache({legacyWorkers=true}={}){
    try{if('caches'in window){for(const key of await caches.keys())await caches.delete(key)}}catch{}
    try{
      const regs=await navigator.serviceWorker?.getRegistrations?.()||[];
      for(const reg of regs){
        const url=String(reg.active?.scriptURL||reg.waiting?.scriptURL||reg.installing?.scriptURL||'');
        if(legacyWorkers&&/\/sw\.js(?:\?|$)/i.test(url)){await reg.unregister().catch(()=>{});continue}
        if(/\/service-worker\.js(?:\?|$)/i.test(url)){
          reg.active?.postMessage?.({type:'LX_CLEAR_CACHE',build:BUILD});
          await reg.update?.().catch(()=>{});
          reg.waiting?.postMessage?.({type:'LX_SKIP_WAITING'});
        }
      }
    }catch{}
  }

  async function hardRefresh(token='manual'){
    if(refreshing)return;refreshing=true;
    const t=String(token||Date.now());try{localStorage.setItem(APPLIED,t)}catch{}
    toast('LX Plus atualizando para a versão mais recente…');
    await clearTechnicalCache();
    setTimeout(()=>{try{const u=new URL(location.href);u.searchParams.set('lxui',VERSION);u.searchParams.set('_',Date.now());location.replace(u.toString())}catch{location.reload()}},220);
  }

  function updateMenu(){
    ensureStyle();
    const menu=document.getElementById('lxProfileMenu'),actions=menu?.querySelector('.lx-profile-menu-actions');if(!actions)return false;
    actions.querySelectorAll('[data-lx-update-menu],.lx-release-cert,[data-lx25-update]').forEach(el=>el.remove());
    const btn=document.createElement('button');btn.type='button';btn.dataset.lx25Update='1';btn.className='lx25-update-action'+(needsUpdate()?' is-old':'');
    btn.innerHTML=`<span>↻</span><span class="lx25-copy"><b>Atualização do site</b><small>${esc(official())} · ${esc(status())}</small></span><i class="lx25-dot"></i>`;
    const appearance=actions.querySelector('[data-act="appearance"]');appearance?.after(btn)||actions.prepend(btn);
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.classList.add('hidden');openCenter()});
    return true;
  }

  async function openCenter(){
    await readRelease().catch(()=>null);ensureStyle();
    const modal=document.getElementById('modal'),overlay=document.getElementById('overlay');if(!modal||!overlay)return toast('Central de atualização indisponível.');
    const when=remote?.published_at?new Date(remote.published_at).toLocaleString('pt-BR'):'—';
    modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="panel-page lx25-update-page"><span class="eyebrow">LX PLUS · ATUALIZAÇÕES</span><h2>Atualização do site</h2><div class="lx25-version-card"><h3>${needsUpdate()?'↻ Existe uma versão mais recente':'✓ Você está na versão mais recente'}</h3><p>Versão deste aparelho: <b>${VERSION}</b><br>Versão oficial: <b>${esc(official())}</b><br>Última publicação: <b>${esc(when)}</b></p></div><div class="lx25-actions"><button class="primary-btn" data-lx25-refresh>${needsUpdate()?'Atualizar agora':'Verificar e atualizar agora'}</button><button class="glass-btn" data-lx25-clean>Limpar cache técnico</button></div><p style="margin-top:14px;color:var(--muted);font-size:10px;line-height:1.55">A limpeza remove apenas arquivos temporários da LX Plus. Conta, perfil, histórico, listas e preferências permanecem.</p></div>`;
    overlay.classList.remove('hidden');modal.querySelector('[data-lx25-refresh]').onclick=async()=>{await readRelease();hardRefresh(releaseToken()||'manual')};modal.querySelector('[data-lx25-clean]').onclick=()=>hardRefresh('clean_'+Date.now());
  }

  function adminNav(){
    if(!isAdmin())return false;
    const nav=[...document.querySelectorAll('[data-admin]')];if(!nav.length)return false;
    document.querySelectorAll('[data-lx-release-admin-tab],[data-lx25-admin-tab]').forEach(el=>el.remove());
    const anchor=nav.find(b=>b.dataset.admin==='appearance')||nav[nav.length-1];if(!anchor)return false;
    const btn=document.createElement('button');btn.type='button';btn.dataset.lx25AdminTab='1';btn.className=anchor.className;btn.innerHTML=`↻ Atualização <i class="lx25-dot"></i>`;anchor.after(btn);
    btn.onclick=()=>{document.querySelectorAll('[data-admin]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');renderAdmin()};
    return true;
  }

  function renderAdmin(){
    if(!isAdmin())return toast('Acesso ADM indisponível.');ensureStyle();
    const m=document.getElementById('adminMain');if(!m)return;
    const when=remote?.published_at?new Date(remote.published_at).toLocaleString('pt-BR'):'—';
    m.innerHTML=`<div class="lx25-admin"><section class="lx25-admin-hero"><div><span class="eyebrow">CENTRAL DE ATUALIZAÇÃO</span><h2>Uma versão oficial para toda a LX Plus</h2><p>Publica esta build para todos os usuários. Aparelhos conectados recebem o release pelo Supabase e limpam somente o cache técnico.</p></div><button class="primary-btn" data-lx25-publish>Atualizar site para todos</button></section><div class="lx25-admin-grid"><section class="lx25-admin-card"><small>VERSÃO DESTE SITE</small><strong>${VERSION}</strong><small>${BUILD}</small></section><section class="lx25-admin-card"><small>VERSÃO OFICIAL</small><strong>${esc(official())}</strong><small>${esc(status())}</small></section><section class="lx25-admin-card"><small>ÚLTIMA PUBLICAÇÃO</small><strong>${esc(when)}</strong><small>Registro persistente no Supabase</small></section><section class="lx25-admin-card"><small>RUNTIME</small><strong>Canônico UI25</strong><small>Um controlador de atualização e um service worker.</small></section></div><div class="lx25-actions"><button class="glass-btn" data-lx25-self>Atualizar este aparelho</button><button class="glass-btn" data-lx25-clean>Limpar cache técnico</button></div></div>`;
    m.querySelector('[data-lx25-publish]').onclick=publishAll;m.querySelector('[data-lx25-self]').onclick=()=>hardRefresh(releaseToken()||'manual');m.querySelector('[data-lx25-clean]').onclick=()=>hardRefresh('clean_'+Date.now());
  }

  function patchAdmin(){
    const admin=window.LX?.admin;if(!admin||typeof admin.render!=='function'||adminPatched)return;
    const original=admin.render;if(original.__lxCanonical25){adminPatched=true;return}
    const wrapped=function(page,...args){if(page==='canonical-update'){renderAdmin();adminNav();return}const out=original.call(this,page,...args);setTimeout(adminNav,0);setTimeout(adminNav,80);return out};
    wrapped.__lxCanonical25=true;wrapped.__original=original;admin.render=wrapped;adminPatched=true;
  }

  async function readRelease(){
    const c=await db();if(!c)return null;
    try{const {data,error}=await c.from('lx_settings').select('key,value,updated_at').eq('key',RELEASE_KEY).maybeSingle();if(error)throw error;remote=data?.value||null;lastRead=Date.now();updateMenu();adminNav();return data}catch(err){console.warn('LX canonical release read',err);return null}
  }

  async function publishAll(e){
    if(!isAdmin())return toast('Somente o ADM pode publicar para todos.');const btn=e?.currentTarget;if(btn){btn.disabled=true;btn.textContent='Publicando…'}
    try{const c=await db();if(!c)throw new Error('Nuvem indisponível');const nonce=`ui25_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,now=new Date().toISOString(),value={build:BUILD,version:VERSION,nonce,published_at:now,force:true};try{localStorage.setItem(APPLIED,nonce)}catch{}const {error}=await c.from('lx_settings').upsert({key:RELEASE_KEY,value,updated_at:now},{onConflict:'key'});if(error)throw error;remote=value;toast('Atualização publicada para todos.');renderAdmin();updateMenu()}catch(err){console.error(err);toast('Não foi possível publicar a atualização.');if(btn){btn.disabled=false;btn.textContent='Atualizar site para todos'}}
  }

  async function subscribe(){
    const c=await db();if(!c||channel)return;
    channel=c.channel('lx-canonical-ui25-'+Math.random().toString(36).slice(2,7)).on('postgres_changes',{event:'*',schema:'public',table:'lx_settings',filter:`key=eq.${RELEASE_KEY}`},async p=>{
      remote=p.new?.value||null;updateMenu();adminNav();const token=releaseToken();let applied='';try{applied=localStorage.getItem(APPLIED)||''}catch{}if(token&&token!==applied&&(needsUpdate()||remote?.force===true))await hardRefresh(token);
    }).subscribe();
  }

  async function canonicalizeBoot(){
    ensureStyle();loadSupportCore();
    try{
      const prev=localStorage.getItem(BUILD_KEY)||'';localStorage.setItem(BUILD_KEY,BUILD);
      if(prev&&prev!==BUILD){await clearTechnicalCache();}
    }catch{}
    // Kill obsolete update UI/scripts from older injected generations.
    document.querySelectorAll('script[src*="release-manager-v17"],script[src*="release-manager-v18"]').forEach(s=>s.remove());
    const observer=new MutationObserver(()=>{updateMenu();adminNav();patchAdmin()});observer.observe(document.documentElement,{subtree:true,childList:true});
    document.addEventListener('click',e=>{if(e.target.closest?.('#profileBtn')){setTimeout(updateMenu,0);setTimeout(updateMenu,40);setTimeout(updateMenu,140)}},true);
    patchAdmin();await readRelease();await subscribe();updateMenu();adminNav();
    setInterval(()=>{patchAdmin();updateMenu();adminNav();if(Date.now()-lastRead>60000)readRelease()},2200);
  }

  window.LXCanonicalUI25={version:'25.0',build:BUILD,displayVersion:VERSION,openCenter,readRelease,publishAll,clearTechnicalCache,hardRefresh,get remote(){return remote},get latest(){return !needsUpdate()}};
  canonicalizeBoot();
})();
