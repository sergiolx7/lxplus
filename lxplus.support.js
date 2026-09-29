/* LX Plus UI34 — load support and notifications without the retired UI26 updater. */
(()=>{'use strict';
  const BUILD='R12.4-UI34-REBUILD-20260929';
  function loadSupport(){
    if(window.LX?.support||document.getElementById('lxSupportCoreUI34'))return;
    const script=document.createElement('script');script.id='lxSupportCoreUI34';
    script.src='lxplus.support-core.js?v='+encodeURIComponent(BUILD);
    script.async=false;script.onerror=()=>console.warn('LX support core unavailable');
    document.head.appendChild(script);
  }
  function loadNotifications(){
    const app=document.getElementById('app');
    if(!app||app.classList.contains('hidden')||window.LXNotificationsV26||document.getElementById('lxNotificationsV26Script'))return;
    const script=document.createElement('script');script.id='lxNotificationsV26Script';
    script.src='lxplus.notifications-v26.js?v=UI34';script.async=true;
    script.onerror=()=>console.warn('LX notifications unavailable');
    document.body.appendChild(script);
  }
  function boot(){
    loadSupport();loadNotifications();
    const app=document.getElementById('app');
    if(app)new MutationObserver(loadNotifications).observe(app,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
