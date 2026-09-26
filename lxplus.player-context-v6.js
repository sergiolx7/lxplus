/* LX Plus — Player Context V6
   - Music mode: integrated bottom player (Spotify-like interaction pattern, LX identity)
   - Other app modes: compact floating player
   - Login/profiles/admin: player never leaks visually
   - Artwork click in Music opens a proper Now Playing surface
   - Existing MP3 gain/bass/preset controls stay available */
(()=>{'use strict';
  const STYLE_ID='lxPlayerContextV6Css';
  const POS_KEYS=['lx_music_float_pos_v6','lx_music_float_pos_v5'];
  let lastContext='',floatRestored=false,syncTimer=0;

  const byId=id=>document.getElementById(id);
  const app=()=>byId('app');
  const dock=()=>byId('musicDock');
  const state=()=>window.LX?.ui?.state||{};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  function loadStyle(){
    let link=byId(STYLE_ID);
    if(!link){link=document.createElement('link');link.id=STYLE_ID;link.rel='stylesheet';document.head.appendChild(link)}
    link.href='lxplus.player-context-v6.css?v=20260926-3';
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
              <button type="button" onclick="document.getElementById('musicShuffle')?.click()" aria-label="Embaralhar">⇄</button>
              <button type="button" onclick="document.getElementById('musicPrev')?.click()" aria-label="Anterior">‹</button>
              <button class="main" type="button" onclick="document.getElementById('musicPlay')?.click()" aria-label="Reproduzir ou pausar">▶</button>
              <button type="button" onclick="document.getElementById('musicNext')?.click()" aria-label="Próxima">›</button>
              <button type="button" onclick="document.getElementById('musicRepeat')?.click()" aria-label="Repetir">↻</button>
            </div>
            <div class="lx-now-playing-actions">
              <button class="secondary-btn" type="button" onclick="document.getElementById('musicQueueBtn')?.click()">Fila</button>
              <button class="secondary-btn" type="button" onclick="document.getElementById('musicEffectsBtn')?.click()">Qualidade · grave · ganho</button>
              <button class="secondary-btn" type="button" onclick="LX.openMusicAlbum?.(${JSON.stringify(track.contentId)})">Abrir álbum</button>
            </div>
            <div class="lx-quality-note">Os controles de Amplificar, Grave e Presets voltam a ficar disponíveis para MP3. Eles ajustam a reprodução sem alterar o arquivo original.</div>
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

  function watch(){
    const a=app();
    if(a&&'MutationObserver'in window){new MutationObserver(()=>{clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(),0)}).observe(a,{attributes:true,attributeFilter:['class']})}
    document.addEventListener('click',()=>setTimeout(()=>sync(),0),true);
    document.addEventListener('lx:music-changed',()=>{patchEffectsButton();setTimeout(()=>sync(true),0)});
    document.addEventListener('lx:music-closed',()=>setTimeout(()=>sync(true),0));
    window.addEventListener('resize',()=>{floatRestored=false;setTimeout(()=>sync(true),0)},{passive:true});
    window.addEventListener('orientationchange',()=>{floatRestored=false;setTimeout(()=>sync(true),80)},{passive:true});
    setInterval(()=>sync(),700);
  }

  function boot(){loadStyle();patchEffectsButton();bindArtwork();watch();sync(true);window.LXPlayerContextV6={sync,openNowPlaying}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
