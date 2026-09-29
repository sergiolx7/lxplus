/* LX Music V8 runtime — reuse the canonical stylesheet instead of loading it twice. */
(()=>{'use strict';
  if(window.LXMusicV8)return;
  const ID='lxMusicV8Css',HREF='lxplus.music-v8.css?v=UI34-MB1';
  let queued=false;
  function ensure(){
    let link=document.getElementById(ID);
    if(!link){link=document.createElement('link');link.id=ID;link.rel='stylesheet';document.head.appendChild(link)}
    if(link.getAttribute('href')!==HREF)link.href=HREF;
    const final=document.getElementById('lxMaintenanceV34Css');
    if(final){if(link.nextElementSibling!==final)document.head.insertBefore(link,final)}
    else if(link!==document.head.lastElementChild)document.head.appendChild(link);
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensure()})}
  const obs=new MutationObserver(queue);
  function boot(){ensure();obs.observe(document.head,{childList:true});setTimeout(ensure,500);setTimeout(ensure,1600);window.LXMusicV8={version:'8.0',ensure}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
