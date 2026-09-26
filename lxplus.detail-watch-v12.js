/* LX Plus — Detail + Watch Invite V12.2
   Robust movie/series Watch Party entry.
   - captures the content id when LX.detail() opens any title
   - supports current and legacy detail DOM structures
   - always exposes "Assistir com amigo" for Filme/Série/Anime/Dorama
   - hands the action to Watch Party V14
*/
(()=>{'use strict';
  const STYLE_ID='lxDetailWatchV12Css',PATCH='__lxWatchInviteV122';
  let activeContentId=null,observer=null,timer=0;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M2.5 19c.6-3.8 2.5-5.8 5.5-5.8s4.9 2 5.5 5.8M14 14.2c3 0 5 1.7 5.8 4.8"/></svg>`;

  function ensureStyle(){
    let link=$(STYLE_ID);
    if(!link){link=document.createElement('link');link.id=STYLE_ID;link.rel='stylesheet';document.head.appendChild(link)}
    link.href='lxplus.detail-watch-v12.css?v=20260926-2';
  }
  function appVisible(){const app=$('app');return !!app&&!app.classList.contains('hidden')&&getComputedStyle(app).display!=='none'}
  function overlayVisible(){const o=$('overlay');return !!o&&!o.classList.contains('hidden')&&getComputedStyle(o).display!=='none'}
  function catalogItem(id){return (window.LX?.data?.catalog?.()||[]).find(x=>String(x.id)===String(id))||null}
  function watchableItem(item){return !!item&&['Filme','Série','Serie','Anime','Dorama'].includes(String(item.type||''))}
  function currentShell(){
    const o=$('overlay');if(!o)return null;
    return o.querySelector('.detail-shell-v256,.detail-shell,[class*="detail-shell"],[data-detail-id],.detail-hero')?.closest?.('.detail-shell-v256,.detail-shell,[class*="detail-shell"],#modal')||null;
  }
  function looksLikeDetail(modal){
    return !!modal?.querySelector?.('.detail-copy,.detail-hero,.detail-body,.detail-poster,[class*="detail-shell"],[onclick*="LX.primary("],[onclick*="LX.play("]');
  }
  function extractId(root){
    if(!root)return null;
    for(const key of ['contentId','id','detailId']){const n=Number(root.dataset?.[key]);if(Number.isFinite(n)&&n>0)return n}
    const nodes=root.querySelectorAll?.('[data-content-id],[data-id],[onclick]')||[];
    for(const el of nodes){
      const d=Number(el.dataset?.contentId||el.dataset?.id);
      if(Number.isFinite(d)&&d>0&&catalogItem(d))return d;
      const raw=el.getAttribute?.('onclick')||'';
      const hit=raw.match(/LX\.(?:primary|play|detail)\s*\(\s*['"]?(\d+)/i);
      if(hit)return Number(hit[1]);
    }
    return null;
  }
  function currentTitle(root,item){return item?.title||root?.querySelector?.('.detail-copy h2,.detail-copy h1,.detail-title,h1,h2')?.textContent?.trim()||'este título'}
  function makeButton(id,title,fallback=false){
    const btn=document.createElement('button');btn.type='button';
    btn.className=`secondary-btn lx-watch-friend-btn${fallback?' lx-watch-friend-fallback':''}`;
    btn.innerHTML=`${icon}<span>Assistir com amigo</span>`;
    if(fallback)btn.style.cssText='position:fixed!important;right:max(16px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483602;min-height:44px!important;padding:0 16px!important;border-radius:999px!important;box-shadow:0 16px 40px rgba(0,0,0,.48)!important';
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openInvite(id,title)});
    return btn;
  }
  function markDetail(){
    const overlay=$('overlay'),modal=$('modal');
    if(!overlay||!modal||!overlayVisible()||!looksLikeDetail(modal)){overlay?.classList.remove('lx-detail-v12-open');return}
    const shell=currentShell()||modal;
    const detected=extractId(shell)||extractId(modal);
    if(detected)activeContentId=detected;
    const item=catalogItem(activeContentId);
    if(!watchableItem(item)){overlay.classList.remove('lx-detail-v12-open');return}
    overlay.classList.add('lx-detail-v12-open');
    if(shell&&shell!==modal)shell.dataset.lxDetailV12='1';
    const title=currentTitle(shell,item);
    const existing=modal.querySelector('.lx-watch-friend-btn');
    if(existing){
      existing.onclick=null;
      if(!existing.dataset.lxInviteBound){
        existing.dataset.lxInviteBound='1';
        existing.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openInvite(activeContentId,currentTitle(currentShell()||modal,catalogItem(activeContentId)))});
      }
      return;
    }
    const actions=modal.querySelector('.hero-actions,.detail-actions,[class*="hero-actions"],[class*="detail-actions"]');
    if(actions){actions.appendChild(makeButton(activeContentId,title,false));return}
    overlay.appendChild(makeButton(activeContentId,title,true));
  }

  function patchDetailEntry(){
    const LX=window.LX;if(!LX||typeof LX.detail!=='function'||LX.detail[PATCH])return false;
    const original=LX.detail;
    const wrapped=function(id,...args){
      const n=Number(id);if(Number.isFinite(n)&&n>0)activeContentId=n;
      const out=original.apply(this,[id,...args]);
      setTimeout(sync,0);setTimeout(sync,80);setTimeout(sync,260);
      return out;
    };
    Object.defineProperty(wrapped,PATCH,{value:true});
    wrapped.__original=original;LX.detail=wrapped;return true;
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
    if(missing.length){try{const client=db(),{data}=await client.from('lx_profiles').select('user_id,name,avatar_url,status_text,last_seen').in('user_id',missing);for(const p of data||[])map.set(String(p.user_id),p)}catch{}}
    return ids.map(id=>({user_id:id,name:map.get(id)?.name||'Amigo LX',avatar_url:map.get(id)?.avatar_url||'',status_text:map.get(id)?.status_text||'',last_seen:map.get(id)?.last_seen||null}))
      .sort((a,b)=>Number(online(b.user_id))-Number(online(a.user_id))||a.name.localeCompare(b.name,'pt-BR'));
  }

  function closeInvite(){document.querySelector('.lx-watch-invite-v12')?.remove()}
  function shellHtml(title){return `<div class="lx-watch-invite-v12"><section class="lx-watch-invite-panel" role="dialog" aria-modal="true" aria-label="Convidar amigo para assistir"><header class="lx-watch-invite-head"><div><small>WATCH PARTY · CHAMADA</small><strong>${esc(title)}</strong></div><button class="lx-watch-invite-close" type="button" aria-label="Fechar">×</button></header><p class="lx-watch-invite-sub">Escolha um amigo. Ao atender, vocês entram em uma chamada de voz e este filme abre sincronizado para os dois.</p><div class="lx-watch-invite-list"><div class="lx-watch-invite-empty"><strong>Carregando amigos…</strong>Buscando suas amizades aceitas.</div></div></section></div>`}
  async function openInvite(contentId,title){
    const id=Number(contentId)||activeContentId,item=catalogItem(id);
    if(!id||!watchableItem(item))return window.LX?.toast?.('Abra um filme ou série para convidar um amigo.');
    activeContentId=id;closeInvite();document.body.insertAdjacentHTML('beforeend',shellHtml(title||item.title));
    const wrap=document.querySelector('.lx-watch-invite-v12'),list=wrap?.querySelector('.lx-watch-invite-list');
    wrap?.querySelector('.lx-watch-invite-close')?.addEventListener('click',closeInvite);
    wrap?.addEventListener('click',e=>{if(e.target===wrap)closeInvite()});
    try{
      const friends=await acceptedFriends();if(!list)return;
      if(!friends.length){list.innerHTML='<div class="lx-watch-invite-empty"><strong>Nenhum amigo disponível</strong>Adicione alguém na Comunidade e aceite a amizade para iniciar uma Watch Party.</div>';return}
      list.innerHTML=friends.map(friend=>{
        const isOn=online(friend.user_id),avatar=friend.avatar_url?`style="background-image:url(${JSON.stringify(friend.avatar_url)})"`:'';
        return `<article class="lx-watch-invite-row" data-peer="${esc(friend.user_id)}"><span class="lx-watch-invite-avatar" ${avatar}>${friend.avatar_url?'':esc(initials(friend.name))}</span><span class="lx-watch-invite-copy"><strong>${esc(friend.name)}</strong><small>${isOn?'<i class="lx-watch-online-dot"></i> Online':esc(friend.status_text||'Amigo na LX Plus')}</small></span><button class="lx-watch-invite-send" type="button">Ligar e assistir</button></article>`
      }).join('');
      list.querySelectorAll('.lx-watch-invite-send').forEach(btn=>btn.addEventListener('click',()=>{
        const row=btn.closest('.lx-watch-invite-row'),peer=row?.dataset.peer,friend=friends.find(x=>String(x.user_id)===String(peer));if(friend)sendInvite(friend,id,title||item.title,btn);
      }));
    }catch(error){console.warn('LX watch invite friends',error);if(list)list.innerHTML='<div class="lx-watch-invite-empty"><strong>Não consegui carregar seus amigos</strong>Feche e tente novamente.</div>'}
  }
  async function sendInvite(friend,contentId,title,button){
    if(window.LXWatchPartyV14?.invite)return window.LXWatchPartyV14.invite(friend,contentId,title,button);
    const client=db();if(!client)return window.LX?.toast?.('A Comunidade ainda não conectou à nuvem.');
    button.disabled=true;button.textContent='Preparando…';
    const token=`[LXWATCH:${contentId}]`,body=`🎬 Convite LX · Vamos assistir “${title}” juntos? Abra este título e me ligue pela Comunidade. ${token}`,clientId=`watch_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    try{
      const {error}=await client.rpc('lx_send_message',{p_other:friend.user_id,p_kind:'text',p_body:body,p_media_key:`watch:${contentId}`,p_client_id:clientId,p_reply_to_client_id:null});
      if(error)throw error;window.LX?.toast?.('A Watch Party ainda está carregando. O convite foi enviado pela conversa.');closeInvite();
    }catch(error){console.warn('LX watch invite fallback',error);button.disabled=false;button.textContent='Tentar de novo';window.LX?.toast?.('Não foi possível iniciar o convite agora.')}
  }

  function sync(){if(!appVisible())return;ensureStyle();patchDetailEntry();markDetail()}
  function queue(){clearTimeout(timer);timer=setTimeout(sync,0)}
  function boot(){
    ensureStyle();patchDetailEntry();
    const overlay=$('overlay');
    if(overlay&&'MutationObserver'in window){observer=new MutationObserver(queue);observer.observe(overlay,{attributes:true,attributeFilter:['class'],childList:true,subtree:true})}
    document.addEventListener('click',()=>setTimeout(sync,0),true);
    window.addEventListener('resize',queue,{passive:true});
    setInterval(sync,500);sync();
    window.LXDetailWatchV12={version:'12.2',sync,openInvite,acceptedFriends,sendInvite,get activeContentId(){return activeContentId}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
