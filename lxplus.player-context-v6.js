/* LX Plus — Player Context V6.1
   - Music mode: integrated bottom player (Spotify-like interaction pattern, LX identity)
   - Other app modes: compact floating player
   - Login/profiles/admin: player never leaks visually
   - Artwork click in Music opens a proper Now Playing surface
   - Existing MP3 gain/bass/preset controls stay available
   - Manual catalog metadata always wins over embedded/imported metadata */
(()=>{'use strict';
  const STYLE_ID='lxPlayerContextV6Css',POLISH_STYLE_ID='lxMusicPolishV7Css';
  const POS_KEYS=['lx_music_float_pos_v6','lx_music_float_pos_v5'];
  let lastContext='',floatRestored=false,syncTimer=0;

  const byId=id=>document.getElementById(id);
  const app=()=>byId('app');
  const dock=()=>byId('musicDock');
  const state=()=>window.LX?.ui?.state||{};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const albumName=v=>typeof v==='string'?v:String(v?.name||'');

  function loadStyle(){
    let link=byId(STYLE_ID);
    if(!link){link=document.createElement('link');link.id=STYLE_ID;link.rel='stylesheet';document.head.appendChild(link)}
    link.href='lxplus.player-context-v6.css?v=20260926-4';
    let polish=byId(POLISH_STYLE_ID);
    if(!polish){polish=document.createElement('link');polish.id=POLISH_STYLE_ID;polish.rel='stylesheet';document.head.appendChild(polish)}
    polish.href='lxplus.music-polish-v7.css?v=20260926-1';
  }

  function visible(el){return !!el&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none'}
  function context(){
    const a=app(),s=state();
    if(!visible(a)||s.screen&&s.screen!=='app')return'hidden';
    if(a.classList.contains('lx-music-mode')||s.mode==='Ouvir')return'music';
    return'float';
  }

  function clearDockGeometry(){
    const el=dock();if(!el)return;
    for(const p of ['position','left','right','top','bottom','transform','width','min-width','max-width','height','min-height','max-height'])el.style.removeProperty(p);
    el.classList.remove('lx-hotfix-dragging','lx-is-dragging');
  }

  function readSavedPos(){
    for(const key of POS_KEYS){try{const p=JSON.parse(localStorage.getItem(key)||'null');if(p&&Number.isFinite(+p.x)&&Number.isFinite(+p.y))return{x:+p.x,y:+p.y}}catch{}}
    return null;
  }
  function restoreDesktopFloat(){
    const el=dock();if(!el||innerWidth<=700||el.classList.contains('hidden'))return;
    requestAnimationFrame(()=>{
      const r=el.getBoundingClientRect(),saved=readSavedPos(),pad=8;
      const x=clamp(saved?.x??(innerWidth-r.width-18),pad,Math.max(pad,innerWidth-r.width-pad));
      const y=clamp(saved?.y??18,pad,Math.max(pad,innerHeight-r.height-pad));
      el.style.setProperty('position','fixed','important');
      el.style.setProperty('left',x+'px','important');
      el.style.setProperty('top',y+'px','important');
      el.style.setProperty('right','auto','important');
      el.style.setProperty('bottom','auto','important');
      el.style.setProperty('transform','none','important');
    });
  }

  function sync(force=false){
    const el=dock(),next=context();if(!el)return;
    document.body.dataset.lxPlayerContext=next;
    if(!force&&next===lastContext)return;
    lastContext=next;
    if(next==='music'){
      clearDockGeometry();
      el.classList.add('lx-player-context-music');
      el.classList.remove('lx-player-context-float');
      floatRestored=false;
    }else if(next==='float'){
      el.classList.remove('lx-player-context-music');
      el.classList.add('lx-player-context-float');
      if(innerWidth<=700){clearDockGeometry();floatRestored=false}
      else if(!floatRestored){restoreDesktopFloat();floatRestored=true}
    }else{
      el.classList.remove('lx-player-context-music','lx-player-context-float');
      clearDockGeometry();
      floatRestored=false;
      byId('lxMusicEffectsPanel')?.remove();
    }
  }

  function coverUrl(track){
    if(track?.cover)return track.cover;
    const host=byId('musicCover'),img=host?.querySelector?.('img');if(img?.src)return img.src;
    const bg=host?getComputedStyle(host).backgroundImage:'';const m=bg?.match(/url\(["']?(.*?)["']?\)/);return m?.[1]||'';
  }

  function lxIcon(name,fallback=''){return window.LX?.artwork?.icon?.(name)||fallback}

  function openNowPlaying(){
    const LX=window.LX,track=LX?.currentMusic?.();if(!track)return;
    const modal=byId('modal'),overlay=byId('overlay');if(!modal||!overlay)return;
    const art=coverUrl(track),title=track.title||'Música',artist=track.artist||'LX Music',album=track.album||'';
    modal.innerHTML=`<button class="close-btn" type="button" onclick="LX.ui.close()">×</button>
      <div class="panel-page lx-now-playing-v6">
        <section class="lx-now-playing-hero">
          <div class="lx-now-playing-art">${art?`<img src="${esc(art)}" alt="${esc(title)}">`:''}</div>
          <div class="lx-now-playing-copy">
            <span class="eyebrow">LX MUSIC · TOCANDO AGORA</span>
            <h2>${esc(title)}</h2>
            <p>${esc(artist)}${album?` · ${esc(album)}`:''}</p>
            <div class="lx-now-playing-controls">
              <button type="button" onclick="document.getElementById('musicShuffle')?.click()" aria-label="Embaralhar">${lxIcon('shuffle','⇄')}</button>
              <button type="button" onclick="document.getElementById('musicPrev')?.click()" aria-label="Anterior">${lxIcon('prev','‹')}</button>
              <button class="main" type="button" onclick="document.getElementById('musicPlay')?.click()" aria-label="Reproduzir ou pausar">${lxIcon('play','▶')}</button>
              <button type="button" onclick="document.getElementById('musicNext')?.click()" aria-label="Próxima">${lxIcon('next','›')}</button>
              <button type="button" onclick="document.getElementById('musicRepeat')?.click()" aria-label="Repetir">${lxIcon('repeat','↻')}</button>
            </div>
            <div class="lx-now-playing-actions">
              <button class="secondary-btn" type="button" onclick="document.getElementById('musicQueueBtn')?.click()">${lxIcon('queue','☷')}<span>Fila</span></button>
              <button class="secondary-btn" type="button" onclick="document.getElementById('musicEffectsBtn')?.click()"><span class="lx-eq-glyph">EQ</span><span>Qualidade · grave · ganho</span></button>
              <button class="secondary-btn" type="button" onclick="LX.openMusicAlbum?.(${JSON.stringify(track.contentId)})">${lxIcon('library','▥')}<span>Abrir álbum</span></button>
            </div>
            <div class="lx-quality-note">Amplificação, graves e presets ficam disponíveis para MP3 sem alterar o arquivo original.</div>
          </div>
        </section>
      </div>`;
    overlay.classList.remove('hidden');
  }

  function bindArtwork(){
    document.addEventListener('click',event=>{
      const btn=event.target.closest?.('#musicCoverBtn');if(!btn||context()!=='music')return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openNowPlaying();
    },true);
  }

  function patchEffectsButton(){
    const btn=byId('musicEffectsBtn');if(!btn)return;
    btn.title='Qualidade, amplificação e graves';
    btn.setAttribute('aria-label','Abrir qualidade, amplificação e graves');
  }

  function installAlbumMetadataGuard(){
    const api=window.LXAlbumGrouping;if(!api||api.__manualFirstV7)return;
    const coverIdentity=api.coverIdentity||function(value){const cover=String(value||'').trim();return /^(?:https?:\/\/|data:image\/)/i.test(cover)?cover:''};
    function groupAlbums(items=[]){
      const groups=new Map();
      for(const item of items){
        if(!item||item.type!=='Música')continue;
        const tracks=Array.isArray(item.tracks)&&item.tracks.length?item.tracks:[{title:item.title,artist:item.artist,cover:item.cover,duration:item.duration,number:1}];
        const catalogCover=coverIdentity(item.cover)||coverIdentity(item.artwork?.url)||coverIdentity(item.albumCover);
        const catalogArtist=String(item.artist||'').trim();
        const explicitAlbum=albumName(item.album).trim();
        tracks.forEach((track,index)=>{
          const cover=catalogCover||coverIdentity(track?.cover);if(!cover)return;
          const key=item.albumCoverKey||cover;
          if(!groups.has(key))groups.set(key,{id:'',cover,entries:[]});
          const title=String(track?.title||item.title||'Faixa').trim()||'Faixa';
          const artist=catalogArtist||String(track?.artist||'').trim();
          const album=explicitAlbum||(tracks.length>1&&norm(item.title)!==norm(title)?String(item.title||'').trim():'');
          groups.get(key).entries.push({id:item.id,index,title,artist,album,duration:Number(track?.duration||0),trackNumber:Number(track?.trackNumber||track?.number||0)});
        });
      }
      const idFor=key=>{let a=2166136261,b=2166136261;for(let i=0;i<key.length;i++){a=Math.imul(a^key.charCodeAt(i),16777619);b=Math.imul(b^key.charCodeAt(key.length-1-i),16777619)}return'lx-album-'+(a>>>0).toString(36)+'-'+(b>>>0).toString(36)};
      return [...groups.values()].filter(group=>group.entries.length>1).map(group=>{
        group.id=idFor(group.cover);
        const counts=new Map();for(const entry of group.entries){const name=String(entry.album||'').trim();if(name){const k=norm(name),row=counts.get(k)||{name,count:0};row.count++;counts.set(k,row)}}
        const names=[...counts.values()].sort((a,b)=>b.count-a.count);
        const artists=[...new Set(group.entries.map(entry=>String(entry.artist||'').trim()).filter(artist=>artist&&!/^(?:LX Music|Artista não informado)$/i.test(artist)))];
        group.artist=artists.length===1?artists[0]:artists.length?'Vários artistas':'Artista não informado';
        group.title=names.length?(names.length===1||names[0].count>names[1].count?names[0].name:'Álbum com capa compartilhada'):(artists.length===1?artists[0]:'Coleção LX Music');
        group.itemIds=[...new Set(group.entries.map(entry=>String(entry.id)))];
        group.entries.sort((a,b)=>(a.trackNumber||Number.MAX_SAFE_INTEGER)-(b.trackNumber||Number.MAX_SAFE_INTEGER)||a.title.localeCompare(b.title,'pt-BR'));
        return group;
      }).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
    }
    api.groupAlbums=groupAlbums;api.__manualFirstV7=true;
  }

  function installPlaybackMetadataGuard(){
    const LX=window.LX;if(!LX?.music||LX.music.__manualFirstV7)return;
    const original=LX.music;
    function wrappedMusic(id,index=0,...rest){
      const catalog=LX.data?.catalog?.()||[],item=catalog.find(row=>String(row.id)===String(id));
      const result=original.call(this,id,index,...rest);
      queueMicrotask(()=>{
        const live=LX.currentMusic?.();if(!live||String(live.contentId)!==String(id)||!item)return;
        const manualCover=String(item.cover||item.artwork?.url||item.albumCover||'').trim();
        const manualArtist=String(item.artist||'').trim(),manualAlbum=albumName(item.album).trim();
        if(manualCover)live.cover=manualCover;
        if(manualArtist)live.artist=manualArtist;
        if(manualAlbum)live.album=manualAlbum;
        else if(!(Array.isArray(item.tracks)&&item.tracks.length>1))live.album='';
        if(manualCover||manualArtist||manualAlbum)document.dispatchEvent(new CustomEvent('lx:music-artwork-updated',{detail:{item:live,id:String(id),manualFirst:true}}));
      });
      return result;
    }
    wrappedMusic.__manualFirstV7=true;wrappedMusic.__original=original;LX.music=wrappedMusic;
  }

  function polishMusicIcons(){
    const LX=window.LX;if(!LX?.artwork?.icon)return;
    const controls=document.querySelector('.lx-right-controls');
    if(controls){
      const audio=byId('musicAudio'),external=dock()?.classList.contains('external-provider');
      const playing=external?String(byId('musicPlay')?.textContent||'').includes('❚'):!!audio&&!audio.paused&&!audio.ended;
      const buttons=[...controls.querySelectorAll('button')],names=['shuffle','prev',playing?'pause':'play','next','repeat'];
      buttons.forEach((button,i)=>{if(names[i])button.innerHTML=LX.artwork.icon(names[i])});
    }
    const like=byId('lxRightMusicLike');if(like)like.innerHTML=LX.artwork.icon('heart');
  }

  function installMusicPolish(){installAlbumMetadataGuard();installPlaybackMetadataGuard();polishMusicIcons()}

  function watch(){
    const a=app();
    if(a&&'MutationObserver'in window){new MutationObserver(()=>{clearTimeout(syncTimer);syncTimer=setTimeout(()=>{sync();polishMusicIcons()},0)}).observe(a,{attributes:true,attributeFilter:['class']})}
    document.addEventListener('click',()=>setTimeout(()=>{sync();polishMusicIcons()},0),true);
    document.addEventListener('lx:music-changed',()=>{patchEffectsButton();installMusicPolish();setTimeout(()=>sync(true),0)});
    document.addEventListener('lx:music-closed',()=>setTimeout(()=>sync(true),0));
    window.addEventListener('resize',()=>{floatRestored=false;setTimeout(()=>sync(true),0)},{passive:true});
    window.addEventListener('orientationchange',()=>{floatRestored=false;setTimeout(()=>sync(true),80)},{passive:true});
    setInterval(()=>{sync();installMusicPolish()},700);
  }

  function boot(){loadStyle();patchEffectsButton();bindArtwork();installMusicPolish();watch();sync(true);window.LXPlayerContextV6={sync,openNowPlaying,installMusicPolish}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();