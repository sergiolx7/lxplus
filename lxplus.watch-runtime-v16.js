/* LX Plus — Watch Runtime V16
   Single-instance loader and health gate for Watch Party.
   Prevents old/new Watch Party modules from racing each other on refresh.
*/
(()=>{'use strict';
  if(window.__LX_WATCH_RUNTIME_V16)return;
  window.__LX_WATCH_RUNTIME_V16={version:'16.0',status:'booting'};
  const R=window.__LX_WATCH_RUNTIME_V16;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const loaded=new Map();

  function ready(name){return !!window[name]}
  function load(id,src,globalName){
    if(globalName&&ready(globalName))return Promise.resolve(window[globalName]);
    if(loaded.has(id))return loaded.get(id);
    const existing=document.getElementById(id);
    const task=new Promise((resolve,reject)=>{
      const done=()=>resolve(globalName?window[globalName]:true);
      if(existing){
        if(globalName&&ready(globalName))return done();
        existing.addEventListener('load',done,{once:true});
        existing.addEventListener('error',()=>reject(new Error('LOAD_FAILED '+src)),{once:true});
        setTimeout(()=>globalName&&ready(globalName)?done():reject(new Error('LOAD_TIMEOUT '+src)),9000);
        return;
      }
      const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
      s.onload=done;s.onerror=()=>reject(new Error('LOAD_FAILED '+src));document.body.appendChild(s);
      setTimeout(()=>globalName&&ready(globalName)?done():reject(new Error('LOAD_TIMEOUT '+src)),9000);
    });
    loaded.set(id,task);return task;
  }

  async function ensure(){
    if(R.running)return R.running;
    R.running=(async()=>{
      try{
        await load('lxWatchPartyV14Script','lxplus.watch-party-v14.js?v=20260926-3','LXWatchPartyV14');
        await load('lxWatchPartyNativeV15Script','lxplus.watch-party-native-v15.js?v=20260926-2','LXWatchPartyNativeV15');
        await load('lxWatchSyncV144Script','lxplus.watch-sync-v14-4.js?v=20260926-3','LXWatchPartySyncV144');
        R.status='ready';R.readyAt=Date.now();
        document.documentElement.dataset.lxWatchRuntime='16';
        document.dispatchEvent(new CustomEvent('lx:watch-runtime-ready',{detail:{version:'16.0'}}));
        return true;
      }catch(error){
        console.error('LX Watch Runtime V16',error);R.status='error';R.error=String(error?.message||error);return false;
      }finally{R.running=null}
    })();
    return R.running;
  }

  async function health(){
    if(R.status!=='ready'||!ready('LXWatchPartyV14')||!ready('LXWatchPartyNativeV15')||!ready('LXWatchPartySyncV144'))await ensure();
  }
  R.ensure=ensure;R.health=health;
  ensure();
  setInterval(health,2500);
})();
