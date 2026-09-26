/* LX Plus — Detail + Watch Invite V12
   - fixes oversized movie/series detail surface with internal scrolling
   - adds "Assistir com amigo" using accepted friendships and lx_send_message
   - opens the existing Community chat after a successful invite
   Loaded only after login. */
(()=>{'use strict';
  const STYLE_ID='lxDetailWatchV12Css';
  let activeContentId=null,observer=null,timer=0;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M2.5 19c.6-3.8 2.5-5.8 5.5-5.8s4.9 2 5.5 5.8M14 14.2c3 0 5 1.7 5.8 4.8"/></svg>`;

  function ensureStyle(){
    if($(STYLE_ID))return;
    const link=document.createElement('link');link.id=STYLE_ID;link.rel='stylesheet';link.href='lxplus.detail-watch-v12.css?v=20260926-1';document.head.appendChild(link);
  }
  function appVisible(){const app=$('app');return !!app&&!app.classList.contains('hidden')&&getComputedStyle(app).display!=='none'}
  function currentShell(){return document.querySelector('#overlay:not(.hidden) .detail-shell-v256')}
  function watchable(shell){return !!shell&&/(?:^|\s)detail-kind-(?:filme|série|serie|anime|dorama)(?:\s|$)/i.test(shell.className)}
  function extractId(shell){
    const btn=shell?.querySelector('.hero-actions .primary-btn');
    const raw=btn?.getAttribute('onclick')||'';
    const hit=raw.match(/LX\.primary\((\d+)\)/);return hit?Number(hit[1]):null;
  }
  function currentTitle(shell){return shell?.querySelector('.detail-copy h2')?.textContent?.trim()||'este título'}
  function markDetail(){
    const overlay=$('overlay'),modal=$('modal'),shell=currentShell();
    if(!overlay||!modal||!shell){overlay?.classList.remove('lx-detail-v12-open');return}
    overlay.classList.add('lx-detail-v12-open');
    shell.dataset.lxDetailV12='1';
    if(!watchable(shell))return;
    const id=extractId(shell);if(!id)return;activeContentId=id;
    const actions=shell.querySelector('.hero-actions');if(!actions||actions.querySelector('.lx-watch-friend-btn'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='secondary-btn lx-watch-friend-btn';btn.innerHTML=`${icon}<span>Assistir com amigo</span>`;
    btn.addEventListener('click',()=>openInvite(id,currentTitle(shell)));
    actions.appendChild(btn);
  }

  function meId(){return String(window.LX?.cloud?.user?.()?.id||window.LX?.ui?.state?.user?.id||'')}
  function db(){return window.LX?.cloud?.db?.()||null}
  function initials(name){return String(name||'LX').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'LX'}
  function online(id){try{return !!window.LX?.social?.isOnline?.(id)}catch{return false}}

  async function friendIds(){
    const client=db(),me=meId();if(!client||!me)return[];
    const {data,error}=await client.from('lx_friendships').select('user_low,user_high,status').eq('status','accepted').or(`user_low.eq.${me},user_high.eq.${me}`);
    if(error)throw error;
    return [...new Set((data||[]).map(row=>String(row.user_low)===me?String(row.user_high):String(row.user_low)).filter(Boolean))];
  }

  async function acceptedFriends(){
    const ids=await friendIds();if(!ids.length)return[];
    let directory=[];try{directory=await window.LX?.social?.refreshDirectory?.()||[]}catch{}
    const map=new Map(directory.map(p=>[String(p.user_id||p.id||''),p]));
    const missing=ids.filter(id=>!map.has(id));
    if(missing.length){
      try{
        const client=db();const {data}=await client.from('lx_profiles').select('user_id,name,avatar_url,status_text,last_seen').in('user_id',missing);
        for(const p of data||[])map.set(String(p.user_id),p);
      }catch{}
    }
    return ids.map(id=>({user_id:id,name:map.get(id)?.name||'Amigo LX',avatar_url:map.get(id)?.avatar_url||'',status_text:map.get(id)?.status_text||'',last_seen:map.get(id)?.last_seen||null})).sort((a,b)=>Number(online(b.user_id))-Number(online(a.user_id))||a.name.localeCompare(b.name,'pt-BR'));
  }

  function closeInvite(){document.querySelector('.lx-watch-invite-v12')?.remove()}
  function shellHtml(title){return `<div class="lx-watch-invite-v12"><section class="lx-watch-invite-panel" role="dialog" aria-modal="true" aria-label="Convidar amigo para assistir"><header class="lx-watch-invite-head"><div><small>ASSISTIR JUNTOS</small><strong>${esc(title)}</strong></div><button class="lx-watch-invite-close" type="button" aria-label="Fechar">×</button></header><p class="lx-watch-invite-sub">Escolha um amigo da Comunidade. O convite será enviado na conversa de vocês.</p><div class="lx-watch-invite-list"><div class="lx-watch-invite-empty"><strong>Carregando amigos…</strong>Buscando suas amizades aceitas.</div></div></section></div>`}

  async function openInvite(contentId,title){
    closeInvite();
    document.body.insertAdjacentHTML('beforeend',shellHtml(title));
    const wrap=document.querySelector('.lx-watch-invite-v12'),list=wrap?.querySelector('.lx-watch-invite-list');
    wrap?.querySelector('.lx-watch-invite-close')?.addEventListener('click',closeInvite);
    wrap?.addEventListener('click',e=>{if(e.target===wrap)closeInvite()});
    try{
      const friends=await acceptedFriends();
      if(!list)return;
      if(!friends.length){list.innerHTML='<div class="lx-watch-invite-empty"><strong>Nenhum amigo disponível</strong>Adicione alguém na Comunidade e aceite a amizade para convidar essa pessoa.</div>';return}
      list.innerHTML=friends.map(friend=>{
        const isOn=online(friend.user_id),avatar=friend.avatar_url?`style="background-image:url(${JSON.stringify(friend.avatar_url)})"`:'';
        return `<article class="lx-watch-invite-row" data-peer="${esc(friend.user_id)}"><span class="lx-watch-invite-avatar" ${avatar}>${friend.avatar_url?'':esc(initials(friend.name))}</span><span class="lx-watch-invite-copy"><strong>${esc(friend.name)}</strong><small>${isOn?'<i class="lx-watch-online-dot"></i> Online':esc(friend.status_text||'Amigo na LX Plus')}</small></span><button class="lx-watch-invite-send" type="button">Convidar</button></article>`
      }).join('');
      list.querySelectorAll('.lx-watch-invite-send').forEach(btn=>btn.addEventListener('click',()=>{
        const row=btn.closest('.lx-watch-invite-row'),peer=row?.dataset.peer,friend=friends.find(x=>String(x.user_id)===String(peer));
        if(friend)sendInvite(friend,contentId,title,btn);
      }));
    }catch(error){console.warn('LX watch invite friends',error);if(list)list.innerHTML='<div class="lx-watch-invite-empty"><strong>Não consegui carregar seus amigos</strong>Feche e tente novamente. Sua conta e seus dados não foram alterados.</div>'}
  }

  async function sendInvite(friend,contentId,title,button){
    const client=db();if(!client)return window.LX?.toast?.('A Comunidade ainda não conectou à nuvem.');
    button.disabled=true;button.textContent='Enviando…';
    const token=`[LXWATCH:${contentId}]`,body=`🎬 Convite LX · Vamos assistir “${title}” juntos? Abra esse título na LX Plus e entre na chamada comigo. ${token}`;
    const clientId=`watch_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    try{
      const {error}=await client.rpc('lx_send_message',{p_other:friend.user_id,p_kind:'text',p_body:body,p_media_key:`watch:${contentId}`,p_client_id:clientId,p_reply_to_client_id:null});
      if(error)throw error;
      window.LX?.toast?.(`Convite enviado para ${friend.name}.`);
      closeInvite();
      setTimeout(async()=>{
        try{await window.LX?.social?.open?.('chats')}catch{}
        setTimeout(()=>{try{window.LX?.chat?.open?.(friend.user_id)}catch{}},120);
      },60);
    }catch(error){console.warn('LX watch invite send',error);button.disabled=false;button.textContent='Tentar de novo';window.LX?.toast?.('Não foi possível enviar o convite agora.');}
  }

  function sync(){if(!appVisible())return;ensureStyle();markDetail()}
  function queue(){clearTimeout(timer);timer=setTimeout(sync,0)}
  function boot(){
    ensureStyle();
    const overlay=$('overlay');
    if(overlay&&'MutationObserver'in window){observer=new MutationObserver(queue);observer.observe(overlay,{attributes:true,attributeFilter:['class'],childList:true,subtree:true})}
    document.addEventListener('click',()=>setTimeout(sync,0),true);
    window.addEventListener('resize',queue,{passive:true});
    setInterval(sync,900);sync();
    window.LXDetailWatchV12={sync,openInvite,acceptedFriends,sendInvite};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
