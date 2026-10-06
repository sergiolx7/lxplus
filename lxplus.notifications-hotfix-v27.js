/* LX Plus — Notifications Hotfix V27
   Fixes the UI26 recursive opener and binds the bell/profile action directly.
*/
(()=>{'use strict';
  if(window.LXNotificationsHotfixV27)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=id=>document.getElementById(id);
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};
  function rows(){
    const D=window.LX?.data,chat=window.LX?.chat;
    const system=(D?.notices?.()||[]).map(n=>({cat:'system',icon:'✦',title:n.title||'Atualização',text:n.text||n.message||'',time:n.time||'Agora',read:!!n.read,tag:'Sistema'}));
    const personal=chat?.notificationItems?.()||[];
    if(personal.length)system.unshift(...personal.map(x=>({...x,cat:x.cat||'community',tag:x.tag||'Comunidade'})));
    else{const unread=Number(chat?.unreadTotal?.()||0);if(unread)system.unshift({cat:'community',icon:'✉',title:`${unread} mensagem${unread===1?'':'s'} não lida${unread===1?'':'s'}`,text:'Abra a Comunidade para continuar suas conversas.',time:'Agora',read:false,tag:'Comunidade'})}
    return system;
  }
  async function pushState(){const P=window.LXNotificationsV26;if(!P)return {supported:false,active:false,label:'Carregando…'};try{const sub=await P.currentSubscription?.(),permission=P.permission;return {supported:permission!=='unsupported',active:!!sub&&permission==='granted',label:permission==='granted'?(sub?'Ativadas neste aparelho':'Permissão concedida'):(permission==='denied'?'Bloqueadas pelo navegador':'Desativadas')}}catch{return {supported:false,active:false,label:'Indisponível'}}}
  async function renderPushCard(){const box=document.querySelector('#modal [data-lx27-push]');if(!box)return;const state=await pushState();if(!box.isConnected)return;box.querySelector('[data-state]').textContent=state.label;const btn=box.querySelector('button');btn.textContent=state.active?'Desativar':'Ativar';btn.disabled=!state.supported;btn.onclick=async()=>{btn.disabled=true;try{const P=window.LXNotificationsV26;if(!P)return;if(state.active)await P.disable?.();else await P.enable?.({requestPermission:true});await renderPushCard()}catch(e){console.warn('LX push V27',e);toast('Não foi possível alterar as notificações.')}finally{btn.disabled=false}}}
  function draw(tab='all'){const body=$('lxNoticeBody27'),tabs=$('lxNoticeTabs27');if(!body||!tabs)return;const all=rows(),filtered=tab==='all'?all:all.filter(x=>(x.cat||'system')===tab),defs=[['all','Tudo'],['community','Comunidade'],['content','Conteúdo'],['system','Sistema']];tabs.innerHTML=defs.map(([k,n])=>`<button type="button" class="${k===tab?'active':''}" data-tab="${k}">${n}<small>${k==='all'?all.length:all.filter(x=>(x.cat||'system')===k).length}</small></button>`).join('');body.innerHTML=filtered.length?filtered.map(x=>`<article class="lx-notice-item ${x.read?'is-read':'is-unread'} ${x.cat==='community'?'is-actionable':''}"><span class="lx-notice-icon">${esc(x.icon||'✦')}</span><div><strong>${esc(x.title||'Notificação')}</strong><p>${esc(x.text||'')}</p><small>${esc(x.time||'Agora')}</small></div><span class="lx-notice-badge">${esc(x.tag||'Aviso')}</span></article>`).join(''):`<div class="lx-notice-empty"><span>✓</span><strong>Tudo em dia</strong><p>Nenhuma notificação nesta categoria.</p></div>`;tabs.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>draw(b.dataset.tab));body.querySelectorAll('.is-actionable').forEach(b=>b.onclick=()=>{window.LX?.ui?.close?.();window.LX?.social?.open?.('chats')})}
  function open(tab='all'){
    const modal=$('modal'),overlay=$('overlay');if(!modal||!overlay){toast('Central de notificações indisponível.');return false}overlay.classList.remove('hidden');
    modal.innerHTML=`<button class="close-btn" type="button" data-close>×</button><div class="panel-page lx-notice-center lx-notice-ios-v26 lx-notice-v27"><div class="lx-notice-head"><span class="lx-notice-emblem">◌</span><div><span class="eyebrow">SUA CENTRAL</span><h2>Notificações</h2><p>Novidades, mensagens e avisos da LX Plus.</p></div><button class="glass-btn" id="lxReadAll27" type="button">Marcar tudo como lido</button></div><section class="lx-push-settings-card" data-lx27-push data-lx-push-card="1"><div class="lx-push-settings-icon">◌</div><div><strong>Notificações do aparelho</strong><p data-state>Verificando…</p><small>Receba avisos mesmo fora da aba quando o navegador permitir.</small></div><button class="glass-btn" type="button">Ativar</button></section><div class="lx-notice-tabs" id="lxNoticeTabs27"></div><div id="lxNoticeBody27" class="lx-notice-list" aria-live="polite"></div></div>`;
    modal.querySelector('[data-close]').onclick=()=>window.LX?.ui?.close?.();$('lxReadAll27').onclick=async()=>{try{window.LX?.readAll?.();await window.LX?.chat?.markNotificationsRead?.();draw(tab)}catch(e){console.warn(e);toast('Não foi possível marcar tudo como lido.')}};draw(tab);renderPushCard();return true;
  }
  function bind(){const LX=window.LX=window.LX||{};LX.openNotifications=open;LX.noticeCenter=LX.noticeCenter||{};LX.noticeCenter.open=open;const bell=$('notifyBtn');if(bell){bell.dataset.lxNotifyV27='1';bell.title='Central de notificações';bell.onclick=e=>{e.preventDefault();e.stopPropagation();open('all')}}}
  function boot(){bind();new MutationObserver(()=>bind()).observe(document.documentElement,{childList:true,subtree:true});setInterval(bind,1800);window.LXNotificationsHotfixV27={version:'27.1',open,bind}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
