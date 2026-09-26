/* LX Plus Notifications V26
   iOS-inspired notification center + opt-in Web Push outside the browser.
*/
(()=>{'use strict';
  if(window.LXNotificationsV26)return;
  const PUBLIC_KEY='BEwN7Hj2kCncrpplDhavvJUgVAE61a_va-B0SsxLVJ_wBYtGT6gXjh5QFDzpR_YIxHTbWAXFjCCZK5gCA89HK-g';
  const PROMPT_TEXT='Você aceita receber notificações da NC News?';
  const DISMISS_KEY='lx_push_prompt_dismissed_v26';
  const STYLE_ID='lxNotificationsV26Css';
  let promptTimer=0,lastUser='',publishPatched=false,openPatched=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const byId=id=>document.getElementById(id);
  const toast=m=>{try{window.LX?.toast?.(m)}catch{}};
  const appVisible=()=>{const a=byId('app');return !!a&&!a.classList.contains('hidden')&&getComputedStyle(a).display!=='none'};
  const user=()=>window.LX?.cloud?.user?.()||window.LX?.ui?.state?.user||null;
  const db=()=>window.LX?.cloud?.db?.()||null;
  const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
  const standalone=()=>matchMedia?.('(display-mode: standalone)')?.matches===true||navigator.standalone===true;
  const supported=()=>('serviceWorker'in navigator)&&('PushManager'in window)&&('Notification'in window);

  function loadStyle(){
    if(byId(STYLE_ID))return;
    const l=document.createElement('link');l.id=STYLE_ID;l.rel='stylesheet';l.href='lxplus.notifications-v26.css?v=UI26';document.head.appendChild(l);
  }
  function applicationServerKey(){
    const pad='='.repeat((4-PUBLIC_KEY.length%4)%4),base64=(PUBLIC_KEY+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
  }
  function keysOf(subscription){
    const json=subscription.toJSON?.()||{};
    return {p256dh:String(json.keys?.p256dh||''),auth:String(json.keys?.auth||'')};
  }
  async function storeSubscription(subscription){
    const c=db(),u=user();if(!c||!u?.id)throw new Error('CLOUD_NOT_READY');
    const keys=keysOf(subscription);if(!keys.p256dh||!keys.auth)throw new Error('PUSH_KEYS_MISSING');
    const row={user_id:u.id,endpoint:subscription.endpoint,p256dh:keys.p256dh,auth:keys.auth,user_agent:navigator.userAgent.slice(0,500),enabled:true,updated_at:new Date().toISOString()};
    const {error}=await c.from('lx_push_subscriptions').upsert(row,{onConflict:'user_id,endpoint'});if(error)throw error;return row;
  }
  async function currentSubscription(){
    if(!supported())return null;
    try{const reg=await navigator.serviceWorker.ready;return await reg.pushManager.getSubscription()}catch{return null}
  }
  async function enable({requestPermission=true,quiet=false}={}){
    loadStyle();
    if(!supported()){
      if(!quiet)toast(isIOS()&&!standalone()?'No iPhone, instale a LX Plus na Tela de Início para receber notificações fora do navegador.':'Este navegador não oferece Web Push.');
      return false;
    }
    let permission=Notification.permission;
    if(permission==='default'&&requestPermission)permission=await Notification.requestPermission();
    if(permission!=='granted'){
      if(!quiet)toast(permission==='denied'?'Notificações bloqueadas nas permissões do navegador.':'Permissão de notificações não ativada.');
      refreshCenterCard();return false;
    }
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationServerKey()});
    await storeSubscription(sub);
    try{localStorage.removeItem(DISMISS_KEY)}catch{}
    if(!quiet)toast('Notificações do aparelho ativadas.');
    removePrompt();refreshCenterCard();return true;
  }
  async function disable(){
    const c=db(),u=user(),sub=await currentSubscription();
    if(sub&&c&&u?.id){try{await c.from('lx_push_subscriptions').delete().eq('user_id',u.id).eq('endpoint',sub.endpoint)}catch{}}
    try{await sub?.unsubscribe?.()}catch{}
    toast('Notificações do aparelho desativadas.');refreshCenterCard();return true;
  }
  function removePrompt(){byId('lxPushPromptV26')?.remove()}
  function dismissPrompt(){try{localStorage.setItem(DISMISS_KEY,String(Date.now()))}catch{}removePrompt()}
  function showPrompt(){
    if(byId('lxPushPromptV26')||!appVisible()||!user()?.id||!supported()||Notification.permission!=='default')return;
    const n=document.createElement('aside');n.id='lxPushPromptV26';n.className='lx-push-prompt-v26';n.setAttribute('role','dialog');n.setAttribute('aria-label','Permissão de notificações');
    n.innerHTML=`<div class="lx-push-app-icon">LX</div><div class="lx-push-copy"><small>AGORA · LX PLUS</small><strong>${PROMPT_TEXT}</strong><span>Receba avisos importantes mesmo quando a LX Plus estiver fechada.</span></div><div class="lx-push-actions"><button type="button" data-push-no>Agora não</button><button type="button" data-push-yes>Permitir</button></div>`;
    document.body.appendChild(n);
    n.querySelector('[data-push-no]').onclick=dismissPrompt;
    n.querySelector('[data-push-yes]').onclick=async e=>{e.currentTarget.disabled=true;try{await enable({requestPermission:true})}catch(error){console.warn('LX push enable',error);toast('Não foi possível ativar as notificações agora.');e.currentTarget.disabled=false}};
  }
  function maybePrompt(){
    clearTimeout(promptTimer);if(!appVisible()||!user()?.id||!supported()||Notification.permission!=='default')return;
    let dismissed=0;try{dismissed=Number(localStorage.getItem(DISMISS_KEY)||0)}catch{}
    if(dismissed&&Date.now()-dismissed<7*86400000)return;
    promptTimer=setTimeout(showPrompt,1800);
  }
  function permissionLabel(){
    if(!supported())return isIOS()&&!standalone()?'Instale na Tela de Início para ativar':'Indisponível neste navegador';
    if(Notification.permission==='granted')return'Ativadas neste aparelho';
    if(Notification.permission==='denied')return'Bloqueadas pelo navegador';
    return'Aguardando sua permissão';
  }
  async function refreshCenterCard(){
    const card=document.querySelector('[data-lx-push-card]');if(!card)return;
    const sub=await currentSubscription();const active=('Notification'in window)&&Notification.permission==='granted'&&!!sub;
    const status=card.querySelector('[data-push-status]');if(status)status.textContent=active?'Ativadas neste aparelho':permissionLabel();
    const button=card.querySelector('[data-push-toggle]');if(button){button.textContent=active?'Desativar':'Ativar';button.dataset.mode=active?'off':'on'}
  }
  function enhanceCenter(){
    loadStyle();const center=document.querySelector('#modal .lx-notice-center');if(!center)return;
    center.classList.add('lx-notice-ios-v26');
    if(!center.querySelector('[data-lx-push-card]')){
      const head=center.querySelector('.lx-notice-head');
      const card=document.createElement('section');card.className='lx-push-settings-card';card.dataset.lxPushCard='1';
      card.innerHTML=`<div class="lx-push-settings-icon">◌</div><div><strong>Notificações do aparelho</strong><p data-push-status>${permissionLabel()}</p><small>Permite receber avisos fora do navegador quando o aparelho e o sistema suportarem Web Push.</small></div><button class="glass-btn" type="button" data-push-toggle>Ativar</button>`;
      head?.insertAdjacentElement('afterend',card)||center.prepend(card);
      card.querySelector('[data-push-toggle]').onclick=async e=>{const mode=e.currentTarget.dataset.mode||'on';e.currentTarget.disabled=true;try{if(mode==='off')await disable();else await enable({requestPermission:true})}catch(error){console.warn('LX push toggle',error);toast('Não foi possível alterar as notificações agora.')}finally{e.currentTarget.disabled=false;refreshCenterCard()}};
    }
    refreshCenterCard();
  }
  function patchOpenNotifications(){
    const LX=window.LX;if(!LX||openPatched)return false;
    const original=LX.openNotifications;
    if(typeof original!=='function')return false;
    if(original.__lxPushV26){openPatched=true;return true}
    const wrapped=function(...args){const out=original.apply(this,args);Promise.resolve(out).finally(()=>setTimeout(enhanceCenter,0));return out};
    wrapped.__lxPushV26=true;wrapped.__original=original;LX.openNotifications=wrapped;
    if(LX.noticeCenter&&typeof LX.noticeCenter.open==='function')LX.noticeCenter.open=wrapped;
    openPatched=true;return true;
  }
  function patchPublish(){
    const cloud=window.LX?.cloud;if(!cloud||publishPatched||typeof cloud.publishNotices!=='function')return false;
    const original=cloud.publishNotices;if(original.__lxPushV26){publishPatched=true;return true}
    const wrapped=async function(items,...rest){
      const result=await original.call(this,items,...rest);
      const c=db();
      if(c&&Array.isArray(items))for(const n of items.slice(0,20)){
        const title=String(n?.title||'LX Plus').trim().slice(0,80),body=String(n?.text||n?.message||'').trim().slice(0,400);if(!body)continue;
        try{const {error}=await c.functions.invoke('lx-web-push',{body:{title,body,url:'/',tag:`lx-notice-${n?.id||Date.now()}`}});if(error)throw error}catch(error){console.warn('LX web push publish',error)}
      }
      return result;
    };
    wrapped.__lxPushV26=true;wrapped.__original=original;cloud.publishNotices=wrapped;publishPatched=true;return true;
  }
  async function autoSync(){
    const uid=String(user()?.id||'');if(!uid||uid===lastUser)return;lastUser=uid;if(!('Notification'in window))return;
    if(Notification.permission==='granted')enable({requestPermission:false,quiet:true}).catch(error=>console.warn('LX push resync',error));else maybePrompt();
  }
  function sync(){patchOpenNotifications();patchPublish();enhanceCenter();autoSync();maybePrompt()}
  function boot(){
    loadStyle();sync();
    const observer=new MutationObserver(()=>{clearTimeout(observer.t);observer.t=setTimeout(sync,20)});observer.observe(document.documentElement,{subtree:true,childList:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync()});
    window.addEventListener('focus',sync,{passive:true});
    setInterval(sync,2500);
  }
  window.LXNotificationsV26={version:'26.0',enable,disable,currentSubscription,showPrompt,enhanceCenter,get permission(){return 'Notification'in window?Notification.permission:'unsupported'},publicKey:PUBLIC_KEY};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
