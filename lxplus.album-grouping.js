/* LX Music: albums derived from real cover artwork and embedded album tags. */
(function(root){
  'use strict';
  const norm=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const albumName=value=>typeof value==='string'?value:String(value?.name||'');
  function coverIdentity(value){
    const cover=String(value||'').trim();
    if(!cover||/^data:image\/svg\+xml/i.test(cover)||/lx-music-fallback|\/assets\/icon-/i.test(cover))return '';
    return /^(?:https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(cover)?cover:'';
  }
  function idFor(key){let a=2166136261,b=2166136261;for(let i=0;i<key.length;i++){a=Math.imul(a^key.charCodeAt(i),16777619);b=Math.imul(b^key.charCodeAt(key.length-1-i),16777619)}return 'lx-album-'+(a>>>0).toString(36)+'-'+(b>>>0).toString(36)}
  function groupAlbums(items=[]){
    const groups=new Map();
    for(const item of items){
      if(!item||item.type!=='Música')continue;
      const tracks=Array.isArray(item.tracks)&&item.tracks.length?item.tracks:[{title:item.title,artist:item.artist,album:item.album,cover:item.cover,duration:item.duration,number:1}];
      tracks.forEach((track,index)=>{
        const cover=coverIdentity(track?.cover)||coverIdentity(item.cover);
        if(!cover)return;
        const key=item.albumCoverKey||cover;
        if(!groups.has(key))groups.set(key,{id:idFor(key),cover,entries:[]});
        groups.get(key).entries.push({id:item.id,index,title:track?.title||item.title||'Faixa',artist:track?.artist||item.artist||'',album:albumName(track?.album)||albumName(item.album)||(tracks.length>1&&norm(item.title)!==norm(track?.title)?item.title:''),duration:Number(track?.duration||0),trackNumber:Number(track?.trackNumber||track?.number||0)});
      });
    }
    return [...groups.values()].filter(group=>group.entries.length>1).map(group=>{
      const counts=new Map();for(const entry of group.entries){const name=String(entry.album||'').trim();if(name){const key=norm(name),row=counts.get(key)||{name,count:0};row.count++;counts.set(key,row)}}
      const names=[...counts.values()].sort((a,b)=>b.count-a.count),artists=[...new Set(group.entries.map(entry=>entry.artist.trim()).filter(artist=>artist&&!/^(?:LX Music|Artista não informado)$/i.test(artist)))];
      group.title=!names.length?'Álbum sem nome':names.length===1||names[0].count>names[1].count?names[0].name:'Álbum com capa compartilhada';
      group.artist=artists.length===1?artists[0]:artists.length?'Vários artistas':'Artista não informado';
      group.itemIds=[...new Set(group.entries.map(entry=>String(entry.id)))];
      group.entries.sort((a,b)=>(a.trackNumber||Number.MAX_SAFE_INTEGER)-(b.trackNumber||Number.MAX_SAFE_INTEGER)||a.title.localeCompare(b.title,'pt-BR'));
      return group;
    }).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  }
  const api={coverIdentity,groupAlbums};
  root.LXAlbumGrouping=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* LX Plus v40 stability hotfixes — runtime-only, no catalog/data migration. */
(function(root){
  'use strict';
  if(!root||typeof document==='undefined')return;
  const BUILD='V40-BUGFIX-20260927';
  root.__LX_BUGFIX_BUILD=BUILD;

  /*
   * v27's enhanced video player reads S.read/S.write from a nested module
   * where S was never declared. Expose the canonical LX.store lazily so the
   * existing code resolves the intended store instead of throwing a
   * ReferenceError when a movie/episode player is enhanced.
   */
  try{
    const descriptor=Object.getOwnPropertyDescriptor(root,'S');
    if(!descriptor||descriptor.configurable){
      Object.defineProperty(root,'S',{
        configurable:true,
        get(){return root.LX?.store},
        set(value){Object.defineProperty(root,'S',{value,writable:true,configurable:true})}
      });
    }
  }catch{}

  function blockedQuery(){
    let proxy;
    const result={data:null,error:{code:'LX_AUTH_WAIT',message:'Aguardando autenticação'}};
    proxy=new Proxy({}, {
      get(_target,prop){
        if(prop==='then')return (resolve,reject)=>Promise.resolve(result).then(resolve,reject);
        if(prop==='catch')return reject=>Promise.resolve(result).catch(reject);
        if(prop==='finally')return fn=>Promise.resolve(result).finally(fn);
        return ()=>proxy;
      }
    });
    return proxy;
  }

  /*
   * Catalog and notification RLS intentionally require an authenticated,
   * approved account. The legacy public bootstrap still polls those tables
   * before login (and again after logout), generating 42501 errors every 12s.
   * Short-circuit only those two reads while there is no LX session. As soon
   * as hydrateUser establishes currentAuth, the original Supabase client is
   * used untouched and realtime/catalog refresh works normally.
   */
  function guardProtectedAnonymousReads(){
    const LX=root.LX,client=LX?.cloud?.db?.();
    if(!client||client.__lxProtectedReadGuard)return false;
    const originalFrom=client.from?.bind(client);if(!originalFrom)return false;
    try{
      Object.defineProperty(client,'__lxProtectedReadGuard',{value:true,configurable:true});
      client.from=function(table){
        const protectedTable=table==='lx_catalog'||table==='lx_notifications';
        if(protectedTable&&!LX.cloud?.user?.())return blockedQuery();
        return originalFrom(table);
      };
      return true;
    }catch{return false}
  }

  const playerState={bound:false,drag:null};
  function clamp(value,min,max){return Math.min(Math.max(Number(value)||0,min),Math.max(min,max))}
  function playerPosition(el,left,top,persist=false){
    if(!el)return;
    if(root.innerWidth<901){
      for(const prop of ['left','top','right','bottom'])el.style.removeProperty(prop);
      return;
    }
    const width=Math.max(1,el.offsetWidth||360),height=Math.max(1,el.offsetHeight||86);
    const x=clamp(left,8,root.innerWidth-width-8),y=clamp(top,62,root.innerHeight-height-8);
    el.style.setProperty('left',x+'px','important');
    el.style.setProperty('top',y+'px','important');
    el.style.setProperty('right','auto','important');
    el.style.setProperty('bottom','auto','important');
    if(persist){try{localStorage.setItem('lx40:player-pos',JSON.stringify({left:x,top:y}))}catch{}}
  }
  function savedPlayerPosition(){try{return JSON.parse(localStorage.getItem('lx40:player-pos')||'null')}catch{return null}}
  function restorePlayerPosition(){
    const el=document.getElementById('musicDock');if(!el)return;
    if(root.innerWidth<901)return playerPosition(el,0,0,false);
    const saved=savedPlayerPosition();
    if(!saved||!Number.isFinite(Number(saved.left))||!Number.isFinite(Number(saved.top)))return;
    playerPosition(el,Number(saved.left),Number(saved.top),false);
  }
  function bindFloatingPlayerFix(){
    const el=document.getElementById('musicDock');if(!el||el.dataset.lxBugfixDrag==='1')return false;
    el.dataset.lxBugfixDrag='1';playerState.bound=true;restorePlayerPosition();
    el.addEventListener('pointerdown',event=>{
      if(root.innerWidth<901||event.button!==0||event.target.closest('button,input,a,select,textarea')||root.LX?.config?.features?.floatingPlayer===false)return;
      const rect=el.getBoundingClientRect();playerState.drag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
      el.setPointerCapture?.(event.pointerId);
    });
    el.addEventListener('pointermove',event=>{
      const drag=playerState.drag;if(!drag||drag.pointerId!==event.pointerId)return;
      playerPosition(el,drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y,false);
    });
    const finish=event=>{
      const drag=playerState.drag;if(!drag||event?.pointerId!=null&&drag.pointerId!==event.pointerId)return;
      playerState.drag=null;const rect=el.getBoundingClientRect();playerPosition(el,rect.left,rect.top,true);
    };
    el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);
    return true;
  }

  let resizeTimer=0;
  root.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(restorePlayerPosition,90)},{passive:true});
  root.addEventListener('orientationchange',()=>setTimeout(restorePlayerPosition,120),{passive:true});
  document.addEventListener('lx:music-changed',()=>setTimeout(restorePlayerPosition,0));

  let attempts=0;
  const timer=setInterval(()=>{
    guardProtectedAnonymousReads();
    bindFloatingPlayerFix();
    if(++attempts>240||(root.LX?.cloud?.db?.()&&playerState.bound))clearInterval(timer);
  },50);
  queueMicrotask(()=>{guardProtectedAnonymousReads();bindFloatingPlayerFix()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{guardProtectedAnonymousReads();bindFloatingPlayerFix();restorePlayerPosition()},{once:true});
  else setTimeout(()=>{guardProtectedAnonymousReads();bindFloatingPlayerFix();restorePlayerPosition()},0);
})(typeof window!=='undefined'?window:globalThis);
