/* LX Music V8 runtime — keeps the V8 skin last in the cascade. */
(()=>{'use strict';
  if(window.LXMusicV8)return;
  const ID='lxMusicV8LateCss',HREF='lxplus.music-v8.css?v=UI29';
  let queued=false;
  function ensure(){
    let link=document.getElementById(ID);
    if(!link){link=document.createElement('link');link.id=ID;link.rel='stylesheet';link.href=HREF;document.head.appendChild(link);return}
    /* Re-append only when a later legacy music skin appeared after V8. */
    const legacy=document.getElementById('lxMiniFloatingPlayerV11Css');
    if(legacy&&legacy.compareDocumentPosition(link)&Node.DOCUMENT_POSITION_PRECEDING)document.head.appendChild(link);
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensure()})}
  const obs=new MutationObserver(queue);
  function boot(){ensure();obs.observe(document.head,{childList:true});setTimeout(ensure,500);setTimeout(ensure,1600);window.LXMusicV8={version:'8.0',ensure}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
