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

/* LX Music hotfix 2026-09-26:
   - truly free X/Y drag for the floating player
   - smaller desktop player
   - automatic albums become playable queues even when tracks are separate catalog items */
(function(root){
  'use strict';
  if(typeof document==='undefined')return;

  const POS_KEY='lx_music_float_pos_v6';
  const STYLE_ID='lxMusicHotfix260926';
  const state={drag:null,activeAlbumId:'',activeIndex:-1,pending:false,albumSignature:''};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const LX=()=>root.LX||{};
  const dock=()=>document.getElementById('musicDock');
  const catalog=()=>LX().data?.catalog?.()||[];
  const albums=()=>root.LXAlbumGrouping?.groupAlbums?.(catalog())||[];
  const albumById=id=>albums().find(group=>String(group.id)===String(id))||null;
  const albumForItem=id=>albums().find(group=>group.itemIds?.includes(String(id)))||null;
  const current=()=>LX().currentMusic?.()||null;

  function injectStyles(){
    let style=document.getElementById(STYLE_ID);
    if(style)return;
    style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      @media (min-width:701px){
        #musicDock.music-dock{
          width:min(312px,calc(100vw - 20px))!important;
          min-width:260px!important;
          min-height:104px!important;
          padding:14px 9px 9px!important;
          grid-template-columns:48px minmax(0,1fr) auto!important;
          gap:4px 7px!important;
          border-radius:15px!important;
          touch-action:none!important;
        }
        #musicDock .music-cover-btn{
          width:48px!important;height:48px!important;
          min-width:48px!important;min-height:48px!important;
          border-radius:10px!important;
        }
        #musicDock .music-info strong{font-size:11px!important}
        #musicDock .music-info small{font-size:8px!important;margin-top:2px!important}
        #musicDock .music-center-controls{gap:5px!important}
        #musicDock .music-transport{gap:1px!important}
        #musicDock .music-transport button{
          width:24px!important;height:24px!important;
          min-width:24px!important;min-height:24px!important;
          font-size:10px!important;
        }
        #musicDock .music-main-play{
          width:29px!important;height:29px!important;
          min-width:29px!important;min-height:29px!important;
        }
        #musicDock .music-timeline{
          grid-template-columns:25px minmax(0,1fr) 25px!important;
          gap:3px!important;font-size:6.5px!important;
        }
        #musicDock .music-right-controls button{
          width:23px!important;height:23px!important;
          min-width:23px!important;min-height:23px!important;
          border-radius:7px!important;
        }
        #musicDock .lx-music-drag-handle{
          top:1px!important;width:72px!important;height:13px!important;
          font-size:8px!important;letter-spacing:2px!important;
        }
        #musicDock .music-provider-panel{
          width:min(312px,calc(100vw - 20px))!important;
        }
      }
      #musicDock.lx-hotfix-dragging{transition:none!important;cursor:grabbing!important}
      .lx-auto-albums-section .lx-music-album .lx-auto-album-art{
        display:block;position:relative;aspect-ratio:1/1;border-radius:14px;overflow:hidden;
        background:#111 center/cover no-repeat;
      }
      .lx-auto-albums-section .lx-auto-album-art::after{
        content:"▶";position:absolute;right:10px;bottom:10px;width:38px;height:38px;
        display:grid;place-items:center;border-radius:50%;background:rgba(255,255,255,.94);
        color:#09090d;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.34);
      }
      .lx-auto-albums-section .lx-auto-album-main{
        width:100%;padding:0;border:0;background:none;color:inherit;text-align:left;cursor:pointer;
      }
      .lx-auto-albums-section .lx-auto-album-copy{
        display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;margin-top:8px;
      }
      .lx-auto-albums-section .lx-auto-album-copy button{
        border:0;background:none;color:inherit;text-align:left;min-width:0;cursor:pointer;padding:0;
      }
      .lx-auto-albums-section .lx-auto-album-copy strong,
      .lx-auto-albums-section .lx-auto-album-copy small{
        display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      .lx-auto-albums-section .lx-auto-album-copy small{opacity:.62;font-size:11px;margin-top:3px}
      .lx-auto-albums-section .lx-auto-album-open{
        width:31px;height:31px!important;min-width:31px!important;border-radius:9px!important;
        border:1px solid rgba(255,255,255,.12)!important;background:rgba(255,255,255,.055)!important;
        display:grid;place-items:center;text-align:center!important;
      }
      .lx-album-page [data-auto-track].is-playing{background:rgba(138,43,226,.13)!important}
    `;
    document.head.appendChild(style);
  }

  function readPos(){
    try{return JSON.parse(localStorage.getItem(POS_KEY)||localStorage.getItem('lx_music_float_pos_v5')||'null')}catch{return null}
  }
  function savePos(x,y){
    try{localStorage.setItem(POS_KEY,JSON.stringify({x:Math.round(x),y:Math.round(y)}))}catch{}
  }
  function bounds(el,x,y){
    const pad=8,rect=el.getBoundingClientRect(),maxX=Math.max(pad,innerWidth-rect.width-pad),maxY=Math.max(pad,innerHeight-rect.height-pad);
    return {x:clamp(x,pad,maxX),y:clamp(y,pad,maxY)};
  }
  function setDockPosition(x,y,save=true){
    const el=dock();if(!el)return null;
    const point=bounds(el,x,y);
    el.style.setProperty('position','fixed','important');
    el.style.setProperty('left',point.x+'px','important');
    el.style.setProperty('top',point.y+'px','important');
    el.style.setProperty('right','auto','important');
    el.style.setProperty('bottom','auto','important');
    el.style.setProperty('transform','none','important');
    if(save)savePos(point.x,point.y);
    return point;
  }
  function restoreDock(){
    const el=dock();if(!el||innerWidth<=700)return;
    const saved=readPos();
    requestAnimationFrame(()=>{
      const rect=el.getBoundingClientRect();
      if(saved&&Number.isFinite(+saved.x)&&Number.isFinite(+saved.y))setDockPosition(+saved.x,+saved.y,false);
      else setDockPosition(Math.max(8,innerWidth-rect.width-16),18,true);
    });
  }
  function dragStart(event){
    const el=dock();if(!el||el.classList.contains('hidden')||innerWidth<=700)return;
    const handle=event.target.closest?.('.lx-music-drag-handle,.music-info');
    if(!handle||!el.contains(handle)||event.target.closest?.('button,a,input,select,textarea'))return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    const rect=el.getBoundingClientRect();
    state.drag={id:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top,handle};
    el.classList.add('lx-hotfix-dragging','lx-is-dragging');
    try{handle.setPointerCapture?.(event.pointerId)}catch{}
    event.preventDefault();
    event.stopPropagation();
  }
  function dragMove(event){
    if(!state.drag||state.drag.id!==event.pointerId)return;
    setDockPosition(event.clientX-state.drag.dx,event.clientY-state.drag.dy,false);
    event.preventDefault();
    event.stopPropagation();
  }
  function dragEnd(event){
    if(!state.drag||state.drag.id!==event.pointerId)return;
    const el=dock(),handle=state.drag.handle;
    if(el){const rect=el.getBoundingClientRect();savePos(rect.left,rect.top);el.classList.remove('lx-hotfix-dragging','lx-is-dragging')}
    try{handle?.releasePointerCapture?.(event.pointerId)}catch{}
    state.drag=null;
    event.preventDefault();
    event.stopPropagation();
  }
  function bindDrag(){
    document.addEventListener('pointerdown',dragStart,true);
    document.addEventListener('pointermove',dragMove,true);
    document.addEventListener('pointerup',dragEnd,true);
    document.addEventListener('pointercancel',dragEnd,true);
    document.addEventListener('dblclick',event=>{
      if(!event.target.closest?.('#musicDock .lx-music-drag-handle'))return;
      event.preventDefault();
      const el=dock();if(!el)return;const rect=el.getBoundingClientRect();
      setDockPosition(Math.max(8,innerWidth-rect.width-16),18,true);
    },true);
    window.addEventListener('resize',()=>{
      if(innerWidth<=700)return;
      const el=dock();if(!el)return;const rect=el.getBoundingClientRect();setDockPosition(rect.left,rect.top,true);
    },{passive:true});
    restoreDock();
  }

  function entryMatches(live,entry){
    return !!live&&!!entry&&String(live.contentId)===String(entry.id)&&Number(live.index||0)===Number(entry.index||0);
  }
  function syncAlbumRows(){
    const group=albumById(state.activeAlbumId),live=current();
    document.querySelectorAll('[data-auto-track]').forEach(row=>{
      const index=Number(row.dataset.autoTrack),entry=group?.entries?.[index];
      row.classList.toggle('is-playing',entryMatches(live,entry));
    });
  }
  function playAutoAlbum(albumId,index=0){
    const group=albumById(albumId);if(!group?.entries?.length)return LX().toast?.('Esse álbum não possui faixas disponíveis.');
    const safeIndex=clamp(Number(index)||0,0,group.entries.length-1),entry=group.entries[safeIndex];
    state.activeAlbumId=group.id;state.activeIndex=safeIndex;state.pending=true;
    try{
      LX().music?.(entry.id,entry.index,true);
      queueMicrotask(syncAlbumRows);
    }finally{
      setTimeout(()=>{state.pending=false},80);
    }
  }
  function stepAlbum(delta){
    const group=albumById(state.activeAlbumId);if(!group?.entries?.length)return false;
    const next=state.activeIndex+delta;
    if(next<0){playAutoAlbum(group.id,group.entries.length-1);return true}
    if(next>=group.entries.length){
      const repeat=document.getElementById('musicRepeat');
      if(repeat?.classList.contains('active'))playAutoAlbum(group.id,0);
      return true;
    }
    playAutoAlbum(group.id,next);return true;
  }
  function shuffleAutoAlbum(albumId){
    const group=albumById(albumId);if(!group?.entries?.length)return;
    let next=Math.floor(Math.random()*group.entries.length);
    if(group.entries.length>1&&next===state.activeIndex)next=(next+1)%group.entries.length;
    playAutoAlbum(group.id,next);
  }
  function openAutoAlbum(albumId){
    const group=albumById(albumId);if(!group)return false;
    const modal=document.getElementById('modal'),overlay=document.getElementById('overlay');if(!modal||!overlay)return false;
    const total=group.entries.reduce((sum,entry)=>sum+(Number(entry.duration)||0),0);
    modal.innerHTML=`<button class="close-btn" type="button" data-auto-close>×</button>
      <div class="lx-album-page lx-album-page-v256 lx-album-page-v260" data-auto-album="${esc(group.id)}">
        <section class="lx-album-hero">
          <div class="lx-album-cover" data-auto-album-cover></div>
          <div class="lx-album-copy">
            <span class="eyebrow">LX MUSIC · ÁLBUM</span>
            <h2>${esc(group.title)}</h2>
            <p>${esc(group.artist)} · ${group.entries.length} faixas</p>
            <div class="lx-album-badges"><span>LX Music</span><span>${group.entries.length} faixas</span><span>${total?LX().fmt?.(total)||'':'Álbum'}</span></div>
            <div class="hero-actions">
              <button class="primary-btn" type="button" data-auto-play>▶ Reproduzir</button>
              <button class="secondary-btn" type="button" data-auto-shuffle>⇄ Embaralhar</button>
            </div>
          </div>
        </section>
        <div class="lx-track-list lx-track-list-v256">
          <div class="lx-track-list-head"><span>#</span><span>Título</span><span>Duração</span><span></span></div>
          ${group.entries.map((entry,index)=>`<button class="lx-track-row" type="button" data-auto-track="${index}"><b>${index+1}</b><span><strong>${esc(entry.title||`Faixa ${index+1}`)}</strong><small>${esc(entry.artist||group.artist||'LX Music')}</small></span><em>${esc(LX().fmt?.(entry.duration||0)||'0:00')}</em><i data-music-play-icon>▶</i></button>`).join('')}
        </div>
      </div>`;
    const cover=modal.querySelector('[data-auto-album-cover]');if(cover)cover.style.backgroundImage=`url(${JSON.stringify(group.cover)})`;
    modal.querySelector('[data-auto-close]')?.addEventListener('click',()=>LX().ui?.close?.());
    modal.querySelector('[data-auto-play]')?.addEventListener('click',()=>playAutoAlbum(group.id,0));
    modal.querySelector('[data-auto-shuffle]')?.addEventListener('click',()=>shuffleAutoAlbum(group.id));
    modal.querySelectorAll('[data-auto-track]').forEach(row=>row.addEventListener('click',()=>playAutoAlbum(group.id,Number(row.dataset.autoTrack)||0)));
    overlay.classList.remove('hidden');
    syncAlbumRows();
    return true;
  }

  function wrapAlbumOpen(){
    const lx=LX(),original=lx.openMusicAlbum;
    if(typeof original!=='function'||original.__lxAutoAlbumWrapped)return;
    const wrapped=function(id){
      const group=albumForItem(id);
      if(group)return openAutoAlbum(group.id);
      return original.apply(this,arguments);
    };
    wrapped.__lxAutoAlbumWrapped=true;
    wrapped.__lxOriginal=original;
    lx.openMusicAlbum=wrapped;
  }
  function renderAlbumSection(){
    const lx=LX(),uiState=lx.state||lx.ui?.state,main=document.querySelector('.lx-music-main');
    if(!main||uiState?.mode!=='Ouvir')return;
    const groups=albums(),signature=groups.map(group=>`${group.id}:${group.entries.length}`).join('|');
    let section=main.querySelector('.lx-auto-albums-section');
    if(!groups.length){section?.remove();state.albumSignature='';return}
    if(section&&section.dataset.signature===signature)return;
    section?.remove();
    section=document.createElement('section');section.className='lx-music-section lx-auto-albums-section';section.dataset.signature=signature;
    section.innerHTML=`<div class="lx-section-title"><div><h2>Álbuns</h2><p>Faixas organizadas automaticamente pela capa e pelo álbum.</p></div></div>
      <div class="lx-music-grid">${groups.slice(0,18).map(group=>`<article class="lx-music-album" data-auto-album-card="${esc(group.id)}">
        <button class="lx-auto-album-main" type="button" data-auto-album-play="${esc(group.id)}" aria-label="Reproduzir ${esc(group.title)}">
          <span class="lx-auto-album-art" data-cover="${esc(group.cover)}"></span>
        </button>
        <div class="lx-auto-album-copy">
          <button type="button" data-auto-album-open="${esc(group.id)}"><strong>${esc(group.title)}</strong><small>${esc(group.artist)} · ${group.entries.length} faixas</small></button>
          <button class="lx-auto-album-open" type="button" data-auto-album-open="${esc(group.id)}" aria-label="Abrir álbum">›</button>
        </div>
      </article>`).join('')}</div>`;
    section.querySelectorAll('[data-cover]').forEach(node=>node.style.backgroundImage=`url(${JSON.stringify(node.dataset.cover||'')})`);
    section.querySelectorAll('[data-auto-album-play]').forEach(button=>button.addEventListener('click',()=>playAutoAlbum(button.dataset.autoAlbumPlay,0)));
    section.querySelectorAll('[data-auto-album-open]').forEach(button=>button.addEventListener('click',()=>openAutoAlbum(button.dataset.autoAlbumOpen)));
    const anchor=main.querySelector('.lx-music-quick-section')||main.querySelector('.lx-music-section');
    if(anchor)anchor.insertAdjacentElement('afterend',section);else main.appendChild(section);
    state.albumSignature=signature;
  }
  function bindAlbumPlayback(){
    document.addEventListener('click',event=>{
      if(!state.activeAlbumId)return;
      const button=event.target.closest?.('#musicNext,#musicPrev');if(!button)return;
      event.preventDefault();event.stopImmediatePropagation();
      stepAlbum(button.id==='musicNext'?1:-1);
    },true);
    const audio=document.getElementById('musicAudio');
    audio?.addEventListener('ended',()=>{
      if(!state.activeAlbumId)return;
      const group=albumById(state.activeAlbumId);if(!group)return;
      const repeat=document.getElementById('musicRepeat');
      if(repeat?.querySelector('sup'))return;
      const next=state.activeIndex+1;
      setTimeout(()=>{
        const fresh=albumById(state.activeAlbumId);if(!fresh)return;
        const expected=fresh.entries[next];
        if(expected&&entryMatches(current(),expected)){state.activeIndex=next;syncAlbumRows();return}
        if(next<fresh.entries.length)playAutoAlbum(fresh.id,next);
        else if(repeat?.classList.contains('active'))playAutoAlbum(fresh.id,0);
      },0);
    });
    document.addEventListener('lx:music-changed',()=>{
      if(!state.activeAlbumId)return;
      const group=albumById(state.activeAlbumId),live=current();if(!group||!live)return;
      const index=group.entries.findIndex(entry=>entryMatches(live,entry));
      if(index>=0){state.activeIndex=index;syncAlbumRows()}
      else if(!state.pending){state.activeAlbumId='';state.activeIndex=-1}
    });
  }
  function observeMusic(){
    const rootNode=document.getElementById('homeContent')||document.body;
    let timer=null;
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{wrapAlbumOpen();renderAlbumSection()},50)});
    observer.observe(rootNode,{childList:true,subtree:true});
    setTimeout(()=>{wrapAlbumOpen();renderAlbumSection()},120);
  }
  function boot(){
    injectStyles();
    setTimeout(()=>{
      bindDrag();
      wrapAlbumOpen();
      bindAlbumPlayback();
      observeMusic();
      renderAlbumSection();
      root.LXMusicHotfix260926={playAlbum:playAutoAlbum,openAlbum:openAutoAlbum,shuffleAlbum:shuffleAutoAlbum,resetPlayerPosition:()=>{
        const el=dock();if(!el)return;const rect=el.getBoundingClientRect();setDockPosition(Math.max(8,innerWidth-rect.width-16),18,true);
      }};
    },0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
