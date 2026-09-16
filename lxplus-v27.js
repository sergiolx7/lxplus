/* LX Plus v27 — premium experience layer */
(()=>{
  'use strict';
  const LX=window.LX=window.LX||{};
  const $=id=>document.getElementById(id);
  const $$=sel=>[...document.querySelectorAll(sel)];
  const esc=value=>String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const toast=message=>LX.toast?.(message);
  const state=()=>LX.state||LX.ui?.state||{};
  const user=()=>LX.cloud?.user?.()||state().user||null;
  const uid=()=>String(user()?.id||'');
  const db=()=>LX.cloud?.db?.()||null;
  const role=()=>String(state().user?.adminRole||state().user?.admin_role||LX.cloud?.profile?.()?.admin_role||'').toLowerCase();
  const fmt=seconds=>LX.fmt?.(Number(seconds)||0)||'0:00';
  const logo='assets/lxplus-logo-v27.png?v=29.0';
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;

  LX.v27={version:'29.0',spotifyCache:{tracks:[],artists:[],albums:[],playlists:[]}};

  function syncBranding(root=document){
    root.querySelectorAll?.('img').forEach(img=>{
      const src=String(img.getAttribute('src')||'');
      if(/lxplus-(?:brand|logo-approved|wordmark)|app-icon-/i.test(src)&&!img.closest('.hub-music-grid,.lx-v27-spotify-results')){
        img.src=logo;img.classList.add('lx-logo-v27');if(!img.alt)img.alt='LX Plus';
      }
      if(!img.classList.contains('lx-logo-v27')&&!img.closest('#splash')){img.loading='lazy';img.decoding='async'}
    });
  }

  /* ---------- Instalação PWA respeitosa ---------- */
  const PWA_KEY='lxplus:v27:pwa-dismissed';
  const PWA_COOLDOWN=14*86400000;
  let installPrompt=null;
  function installAllowed(){
    if(standalone())return false;
    const dismissed=Number(localStorage.getItem(PWA_KEY)||0);
    return !dismissed||Date.now()-dismissed>PWA_COOLDOWN;
  }
  function hideInstallUI(){
    $$('.install-app-btn,#installAppBtn,[data-install-app]').forEach(el=>el.classList.add('hidden'));
    $('lxV27Install')?.remove();
  }
  function showInstallInvite(manual=false){
    if(!installAllowed()||(!installPrompt&&!manual)||$('lxV27Install'))return;
    const box=document.createElement('aside');box.id='lxV27Install';box.className='lx-v27-install';box.setAttribute('aria-label','Instalar LX Plus');
    box.innerHTML=`<img src="${logo}" alt=""><div><strong>Instalar LX Plus</strong><small>Abra mais rápido e em tela cheia.</small></div><button type="button" data-pwa-install>Instalar</button><button type="button" data-pwa-dismiss aria-label="Agora não">×</button>`;
    document.body.appendChild(box);
    box.querySelector('[data-pwa-install]').onclick=async()=>{
      if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();const result=await prompt.userChoice.catch(()=>({outcome:'dismissed'}));if(result.outcome==='accepted'){hideInstallUI();return}}
      else window.LXPWA?.install?.();
    };
    box.querySelector('[data-pwa-dismiss]').onclick=()=>{localStorage.setItem(PWA_KEY,String(Date.now()));box.remove()};
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;showInstallInvite(false)});
  window.addEventListener('appinstalled',()=>{installPrompt=null;hideInstallUI()});

  /* ---------- Música: sem confundir prévia com faixa completa ---------- */
  const audio=()=>$('musicAudio');
  const track=()=>state().musicQueue?.[state().musicIndex]||null;
  function isSpotify(item=track()){return /^spotify:/i.test(String(item?.mediaKey||''))}
  function isPreview(item=track()){return !!item&&(item.isPreview===true||item.playbackKind==='preview'||(!item.mediaKey&&!!item.previewUrl))}
  function musicPositionKey(item=track()){
    if(!item||!uid())return'';
    return `lxplus:v27:music:${uid()}:${String(item.contentId||item.remoteId||'track')}:${Number(item.index??state().musicIndex??0)}`;
  }
  function setMusicKind(){
    const item=track(),badge=$('musicPlaybackKind'),dock=$('musicDock');if(!badge||!dock)return;
    const preview=isPreview(item),spotify=isSpotify(item);
    badge.textContent=preview?'PRÉVIA · até 30 s':spotify?'SPOTIFY OFICIAL':'FAIXA COMPLETA';
    badge.classList.toggle('is-preview',preview);badge.classList.toggle('is-spotify',spotify);badge.classList.toggle('hidden',!item);
    dock.classList.toggle('is-preview',preview);dock.classList.toggle('is-full-track',!!item&&!preview&&!spotify);
    if(preview){badge.title='Trecho curto oficial. Não é a música completa.';$('musicDuration')?.setAttribute('title','Duração desta prévia')}
    else $('musicDuration')?.removeAttribute('title');
    syncNowPlaying();
  }
  function saveScopedPosition(){
    const item=track(),el=audio(),key=musicPositionKey(item);if(!item||!el||!key||isPreview(item)||!Number.isFinite(el.duration)||el.duration<=0)return;
    localStorage.setItem(key,JSON.stringify({position:el.currentTime||0,duration:el.duration,updatedAt:Date.now()}));
  }
  function restoreScopedPosition(){
    const item=track(),el=audio(),key=musicPositionKey(item);if(!item||!el||!key||!el.duration)return;
    setMusicKind();
    const signature=key+':'+String(el.currentSrc||el.src);if(el.dataset.lxV27Position===signature)return;el.dataset.lxV27Position=signature;
    if(isPreview(item)){el.currentTime=0;return}
    let local={};try{local=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
    const history=LX.data?.history?.()?.[item.contentId]||{};
    const cloudPosition=Number(history.musicIndex)===Number(item.index??state().musicIndex)?Number(history.position||0):0;
    const position=Math.max(Number(local.position||0),cloudPosition);
    if(position>4&&position<el.duration-8)try{el.currentTime=position}catch{}
  }
  function playPreview(item){
    if(!item?.previewUrl)return toast('Prévia oficial indisponível para esta faixa.');
    state().musicQueue=[{title:item.title||'Prévia',artist:item.artist||'Apple Music',album:item.album||'',cover:item.cover||'',duration:Number(item.duration)||30,previewUrl:item.previewUrl,isPreview:true,playbackKind:'preview',contentId:'preview-'+String(item.remoteId||Date.now()),remoteId:item.remoteId||'',index:0}];
    state().musicIndex=0;$('musicDock')?.classList.remove('hidden');LX.loadMusicTrack?.(true);setTimeout(setMusicKind,0);
  }
  LX.playOnlineMusicPreview=playPreview;

  function spotifyTrack(item){
    const artists=(item?.artists||[]).map(a=>a.name).filter(Boolean).join(', ')||'Spotify';
    return {title:item?.name||'Faixa',artist:artists,album:item?.album?.name||'',cover:item?.album?.images?.[0]?.url||'',duration:Number(item?.duration_ms||0)/1000,mediaKey:`spotify:track:${item?.id}`,contentId:`spotify-${item?.id}`,remoteId:item?.id,index:0,playbackKind:'spotify'};
  }
  function playSpotifyList(list,index=0){
    const rows=(list||[]).filter(x=>x?.id).map(spotifyTrack);if(!rows.length)return toast('Nenhuma faixa reproduzível encontrada.');
    rows.forEach((row,i)=>row.index=i);state().musicQueue=rows;state().musicIndex=Math.max(0,Math.min(Number(index)||0,rows.length-1));$('musicDock')?.classList.remove('hidden');LX.loadMusicTrack?.(true);setTimeout(setMusicKind,0);
  }
  function addSpotifyTrack(index,source='tracks'){
    const item=LX.v27.spotifyCache[source]?.[Number(index)];if(!item)return;
    const row=spotifyTrack(item),queue=state().musicQueue=state().musicQueue||[];
    if(queue.some(x=>String(x.mediaKey)===String(row.mediaKey)))return toast('Essa faixa já está na fila.');
    row.index=queue.length;queue.push(row);toast('Adicionada à fila.');
  }
  LX.v27PlaySpotify=(index,source='tracks')=>playSpotifyList(LX.v27.spotifyCache[source]||[],index);
  LX.v27AddSpotify=addSpotifyTrack;

  async function spotifyInvoke(body){
    const client=db();if(!client)throw new Error('Entre na LX Plus para usar a busca musical.');
    const {data,error}=await client.functions.invoke('lx-spotify-catalog',{body});
    if(error)throw new Error(error.context?.body?.error||error.message||'Falha ao consultar o Spotify.');
    if(data?.error)throw new Error(data.error);return data;
  }
  const imageOf=item=>item?.images?.[0]?.url||item?.album?.images?.[0]?.url||'';
  const artistsOf=item=>(item?.artists||[]).map(a=>a.name).filter(Boolean).join(', ')||'Spotify';
  function spotifyTrackRows(items,source='tracks'){
    return (items||[]).map((item,index)=>`<article class="lx-v27-spotify-track"><button type="button" class="lx-v27-track-play" onclick="LX.v27PlaySpotify(${index},'${source}')" aria-label="Reproduzir ${esc(item.name)}">${LX.artwork.markup({...item,cover:imageOf(item)}, {}, 'lx-spotify-art',item.name)}<span>▶</span></button><div><strong>${esc(item.name)}</strong><small>${esc(artistsOf(item))} · ${esc(item.album?.name||'Single')}</small></div><time>${fmt(Number(item.duration_ms||0)/1000)}</time><button type="button" class="lx-v27-add-queue" onclick="LX.v27AddSpotify(${index},'${source}')" aria-label="Adicionar à fila">＋</button></article>`).join('');
  }
  function spotifyCards(items,type){
    const method=type==='artist'?'openSpotifyArtist':type==='album'?'openSpotifyAlbum':'openSpotifyPlaylist';
    return (items||[]).map(item=>`<button type="button" class="lx-v27-spotify-card" onclick="LX.${method}('${esc(item.id)}')">${LX.artwork.markup({...item,cover:imageOf(item)}, {}, 'lx-spotify-art',item.name)}<span><strong>${esc(item.name)}</strong><small>${type==='artist'?'Artista':type==='album'?esc(artistsOf(item)):'Playlist oficial'}</small></span></button>`).join('');
  }
  function musicSearchShell(q=''){
    const welcome=$('welcome'),content=$('homeContent');$('hero')?.classList.add('hidden');
    if(welcome)welcome.innerHTML=`<section class="lx-v27-music-search-hero"><span class="eyebrow">LX MUSIC · SPOTIFY</span><h1>Encontre o que quer ouvir.</h1><p>Catálogo oficial, player persistente e prévias sempre identificadas.</p><form id="lxV27SpotifySearch"><label><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.4-4.4m2.4-5.6a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/></svg><input id="lxV27SpotifyQuery" value="${esc(q)}" placeholder="Faixa, artista, álbum ou playlist" autocomplete="off"></label><button>Buscar</button></form></section>`;
    if(content)content.innerHTML='<section class="lx-v27-spotify-loading"><span></span>Consultando o catálogo oficial…</section>';
    $('lxV27SpotifySearch')?.addEventListener('submit',event=>{event.preventDefault();renderSpotifySearch($('lxV27SpotifyQuery')?.value||'')});
  }
  async function renderSpotifySearch(query='Brasil'){
    const q=String(query||'').trim()||'Brasil';musicSearchShell(q);
    try{
      const response=await spotifyInvoke({action:'search',q,limit:12}),data=response.data||{};
      LX.v27.spotifyCache.tracks=data.tracks?.items||[];LX.v27.spotifyCache.artists=data.artists?.items||[];LX.v27.spotifyCache.albums=data.albums?.items||[];LX.v27.spotifyCache.playlists=(data.playlists?.items||[]).filter(Boolean);
      const c=$('homeContent');if(!c)return;
      c.innerHTML=`<div class="lx-v27-spotify-results">${LX.v27.spotifyCache.tracks.length?`<section><header><div><span>FAIXAS</span><h2>Resultados principais</h2></div><button type="button" onclick="LX.v27PlaySpotify(0)">▶ Tocar tudo</button></header><div class="lx-v27-track-table">${spotifyTrackRows(LX.v27.spotifyCache.tracks)}</div></section>`:''}${LX.v27.spotifyCache.artists.length?`<section><header><div><span>ARTISTAS</span><h2>Artistas</h2></div></header><div class="lx-v27-card-grid artists">${spotifyCards(LX.v27.spotifyCache.artists,'artist')}</div></section>`:''}${LX.v27.spotifyCache.albums.length?`<section><header><div><span>ÁLBUNS E SINGLES</span><h2>Discografia</h2></div></header><div class="lx-v27-card-grid">${spotifyCards(LX.v27.spotifyCache.albums,'album')}</div></section>`:''}${LX.v27.spotifyCache.playlists.length?`<section><header><div><span>PLAYLISTS</span><h2>Playlists</h2></div></header><div class="lx-v27-card-grid">${spotifyCards(LX.v27.spotifyCache.playlists,'playlist')}</div></section>`:''}</div>`;
      syncBranding(c);
    }catch(error){
      const legacy=LX.v27.legacyMusicSearch;if(typeof legacy==='function'){await legacy(q);const c=$('homeContent');if(c)c.insertAdjacentHTML('afterbegin',`<div class="lx-v27-provider-note"><strong>Spotify aguardando configuração</strong><span>${esc(error.message)} Enquanto isso, os resultados abaixo são prévias oficiais e aparecem marcados como “Prévia”.</span></div>`)}
      else if($('homeContent'))$('homeContent').innerHTML=`<div class="lx-v27-empty"><strong>Busca musical indisponível</strong><p>${esc(error.message)}</p></div>`;
    }
  }

  async function openSpotifyArtist(id){
    const overlay=$('overlay'),modal=$('modal');if(!overlay||!modal)return;overlay.classList.remove('hidden');modal.innerHTML='<div class="lx-v27-detail-loading">Carregando artista…</div>';
    try{const out=await spotifyInvoke({action:'artist',id}),artist=out.artist||{},tracks=out.tracks?.tracks||[],albums=out.albums?.items||[];LX.v27.spotifyCache.artistTracks=tracks;LX.v27.spotifyCache.artistAlbums=albums;modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-artist-page"><header style="--artist-bg:url('${esc(imageOf(artist))}')"><img src="${esc(imageOf(artist))}" alt="" loading="lazy"><div><span class="lx-v27-verified">✓ Artista verificado no Spotify</span><h2>${esc(artist.name)}</h2><p>${Number(artist.followers?.total||0).toLocaleString('pt-BR')} seguidores</p><button type="button" onclick="LX.v27PlaySpotify(0,'artistTracks')">▶ Reproduzir populares</button></div></header><section><div class="lx-v27-section-head"><span>POPULAR</span><h3>Músicas populares</h3></div><div class="lx-v27-track-table">${spotifyTrackRows(tracks,'artistTracks')}</div></section><section><div class="lx-v27-section-head"><span>DISCOGRAFIA</span><h3>Álbuns e singles</h3></div><div class="lx-v27-card-grid">${spotifyCards(albums,'album')}</div></section></div>`}catch(error){modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-empty"><strong>Não foi possível abrir o artista</strong><p>${esc(error.message)}</p></div>`}
  }
  async function openSpotifyAlbum(id){
    const overlay=$('overlay'),modal=$('modal');if(!overlay||!modal)return;overlay.classList.remove('hidden');modal.innerHTML='<div class="lx-v27-detail-loading">Carregando álbum…</div>';
    try{const out=await spotifyInvoke({action:'album',id}),album=out.data||{},tracks=(album.tracks?.items||[]).map(t=>({...t,album:{name:album.name,images:album.images},artists:t.artists?.length?t.artists:album.artists}));LX.v27.spotifyCache.albumTracks=tracks;modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-album-page"><header style="--album-bg:url('${esc(imageOf(album))}')"><img src="${esc(imageOf(album))}" alt="" loading="lazy"><div><span>${String(album.album_type||'álbum').toUpperCase()}</span><h2>${esc(album.name)}</h2><p>${esc(artistsOf(album))} · ${esc(String(album.release_date||'').slice(0,4))} · ${tracks.length} faixas</p><div><button type="button" onclick="LX.v27PlaySpotify(0,'albumTracks')">▶ Reproduzir</button><button type="button" onclick="LX.v27ShuffleSpotify('albumTracks')">⇄ Embaralhar</button></div></div></header><section><div class="lx-v27-track-table">${spotifyTrackRows(tracks,'albumTracks')}</div></section></div>`}catch(error){modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-empty"><strong>Não foi possível abrir o álbum</strong><p>${esc(error.message)}</p></div>`}
  }
  async function openSpotifyPlaylist(id){
    const overlay=$('overlay'),modal=$('modal');if(!overlay||!modal)return;overlay.classList.remove('hidden');modal.innerHTML='<div class="lx-v27-detail-loading">Carregando playlist…</div>';
    try{const out=await spotifyInvoke({action:'playlist',id}),list=out.data||{},tracks=(list.tracks?.items||[]).map(x=>x.track).filter(x=>x?.id);LX.v27.spotifyCache.playlistTracks=tracks;modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-album-page"><header style="--album-bg:url('${esc(imageOf(list))}')"><img src="${esc(imageOf(list))}" alt="" loading="lazy"><div><span>PLAYLIST</span><h2>${esc(list.name)}</h2><p>${esc(list.owner?.display_name||'Spotify')} · ${tracks.length} faixas</p><button type="button" onclick="LX.v27PlaySpotify(0,'playlistTracks')">▶ Reproduzir</button></div></header><section><div class="lx-v27-track-table">${spotifyTrackRows(tracks,'playlistTracks')}</div></section></div>`}catch(error){modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-empty"><strong>Não foi possível abrir a playlist</strong><p>${esc(error.message)}</p></div>`}
  }
  LX.openSpotifyArtist=openSpotifyArtist;LX.openSpotifyAlbum=openSpotifyAlbum;LX.openSpotifyPlaylist=openSpotifyPlaylist;
  LX.v27ShuffleSpotify=source=>{const list=[...(LX.v27.spotifyCache[source]||[])];for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}playSpotifyList(list,0)};

  /* ---------- Tocando agora e fila real ---------- */
  function ensureNowPlaying(){
    let panel=$('lxV27NowPlaying');if(panel)return panel;
    panel=document.createElement('section');panel.id='lxV27NowPlaying';panel.className='lx-v27-now-playing hidden';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Tocando agora');document.body.appendChild(panel);return panel;
  }
  function openNowPlaying(){const item=track();if(!item)return toast('Escolha uma música primeiro.');const panel=ensureNowPlaying();panel.classList.remove('hidden');document.documentElement.classList.add('lx-now-playing-open');syncNowPlaying()}
  function closeNowPlaying(){ensureNowPlaying().classList.add('hidden');document.documentElement.classList.remove('lx-now-playing-open')}
  function syncNowPlaying(){
    const panel=$('lxV27NowPlaying'),item=track();if(!panel||panel.classList.contains('hidden')||!item)return;
    const preview=isPreview(item),spotify=isSpotify(item),queue=state().musicQueue||[],current=Number(state().musicIndex)||0,upcoming=queue.slice(current+1,current+5);
    const signature=[item.mediaKey||item.remoteId||item.contentId||item.title,item.cover||'',item.artist||'',item.duration||'',current,queue.map(row=>row.mediaKey||row.remoteId||row.contentId||row.title).join(',')].join('|');
    if(panel.dataset.signature===signature){updateNowPlayingProgress();return}panel.dataset.signature=signature;panel.classList.toggle('no-queue',!upcoming.length);panel.style.setProperty('--now-art',LX.artwork.safeBackground(item));
    const icon=name=>LX.artwork.icon(name),button=(name,target,label)=>`<button type="button" onclick="${target}" aria-label="${label}" title="${label}">${icon(name)}</button>`;
    panel.innerHTML=`<div class="lx-v27-now-backdrop"></div><header>${button('down','LX.closeNowPlaying()','Fechar Tocando agora')}<div><span>TOCANDO AGORA</span><strong>${preview?'Prévia oficial':spotify?'Spotify oficial':'LX Music'}</strong></div>${button('queue','LX.openMusicQueue()','Abrir fila')}</header><main><section class="lx-v27-now-art">${LX.artwork.markup(item,{},'lx-now-art-image','Capa de '+(item.title||'música'))}<span class="${preview?'preview':''}">${preview?'PRÉVIA · TRECHO CURTO':spotify?'PLAYER OFICIAL SPOTIFY':'FAIXA COMPLETA'}</span></section><section class="lx-v27-now-copy"><div><span>${esc(item.album||'LX Music')}</span><h2>${esc(item.title||'Faixa')}</h2><p>${esc(item.artist||'LX Music')}</p></div>${button('heart',"document.getElementById('musicLikeBtn')?.click()",'Salvar na biblioteca')}<div class="lx-v27-now-progress"><input data-now-progress type="range" min="0" max="100" step="0.1" value="${Number($('musicProgress')?.value||0)}" aria-label="Posição da faixa" oninput="document.getElementById('musicProgress').value=this.value;document.getElementById('musicProgress').dispatchEvent(new Event('input'))"><div><span data-now-time>${esc($('musicTime')?.textContent||'0:00')}</span><span data-now-duration>${esc($('musicDuration')?.textContent||fmt(item.duration))}</span></div></div><div class="lx-v27-now-controls">${button('shuffle',"document.getElementById('musicShuffle')?.click()",'Embaralhar')}${button('prev',"document.getElementById('musicPrev')?.click()",'Anterior')}<button data-now-play type="button" class="main" aria-label="Reproduzir ou pausar" onclick="document.getElementById('musicPlay')?.click()">${icon(audio()?.paused?'play':'pause')}</button>${button('next',"document.getElementById('musicNext')?.click()",'Próxima')}${button('repeat',"document.getElementById('musicRepeat')?.click()",'Repetir')}</div><div class="lx-v27-now-actions">${button('lyrics','LX.openMusicLyrics?.()','Ver letra')}${button('queue','LX.openMusicQueue()','Abrir fila')}${spotify?`<button type="button" onclick="LX.closeNowPlaying();LX.openMusicProvider()" aria-label="Abrir Spotify oficial">${icon('external')} Spotify oficial</button>`:''}</div>${preview?'<div class="lx-v27-preview-warning"><strong>Isto é uma prévia.</strong><span>Para ouvir a faixa completa, abra o serviço oficial.</span></div>':''}</section>${upcoming.length?`<aside><span>PRÓXIMAS</span><h3>Na fila</h3>${upcoming.map((row,index)=>`<button type="button" onclick="LX.musicQueuePlay(${current+1+index})">${LX.artwork.markup(row,{},'lx-queue-art',row.title)}<span><strong>${esc(row.title)}</strong><small>${esc(row.artist)}</small></span></button>`).join('')}</aside>`:''}</main>`;
    LX.artwork.hydrate(panel);
  }
  function updateNowPlayingProgress(){const panel=$('lxV27NowPlaying'),source=$('musicProgress');if(!panel||panel.classList.contains('hidden'))return;const range=panel.querySelector('[data-now-progress]'),time=panel.querySelector('[data-now-time]'),duration=panel.querySelector('[data-now-duration]'),play=panel.querySelector('[data-now-play]');if(range&&source&&document.activeElement!==range)range.value=source.value||0;if(time)time.textContent=$('musicTime')?.textContent||'0:00';if(duration)duration.textContent=$('musicDuration')?.textContent||fmt(track()?.duration);if(play)play.innerHTML=LX.artwork.icon(audio()?.paused?'play':'pause')}
  document.addEventListener('lx:music-changed',()=>{const panel=$('lxV27NowPlaying');if(panel)panel.dataset.signature='';syncNowPlaying();setMusicKind()});document.addEventListener('lx:music-artwork-updated',()=>{const panel=$('lxV27NowPlaying');if(panel)panel.dataset.signature='';syncNowPlaying()});
  function normalizeQueueIndexes(){(state().musicQueue||[]).forEach((item,index)=>item.index=index)}
  function queueMove(index,delta){
    const queue=state().musicQueue||[],from=Number(index),to=from+Number(delta);if(from<0||to<0||from>=queue.length||to>=queue.length)return;
    const current=queue[state().musicIndex];[queue[from],queue[to]]=[queue[to],queue[from]];normalizeQueueIndexes();state().musicIndex=Math.max(0,queue.indexOf(current));openQueueV27();syncNowPlaying();
  }
  function queueRemove(index){
    const queue=state().musicQueue||[],i=Number(index);if(i<0||i>=queue.length)return;const wasCurrent=i===Number(state().musicIndex);queue.splice(i,1);normalizeQueueIndexes();
    if(!queue.length){audio()?.pause();$('musicDock')?.classList.add('hidden');LX.ui?.close?.();closeNowPlaying();return}
    state().musicIndex=Math.min(Number(state().musicIndex),queue.length-1);if(i<state().musicIndex)state().musicIndex--;if(wasCurrent)LX.loadMusicTrack?.(true);openQueueV27();syncNowPlaying();
  }
  function openQueueV27(){
    const modal=$('modal'),overlay=$('overlay'),queue=state().musicQueue||[],current=Number(state().musicIndex)||0;if(!modal||!overlay)return;overlay.classList.remove('hidden');
    modal.innerHTML=`<button class="close-btn" onclick="LX.ui.close()">×</button><div class="lx-v27-queue"><header><span>LX MUSIC</span><h2>Fila de reprodução</h2><p>Reordene, remova ou escolha a próxima faixa.</p></header><div>${queue.map((item,index)=>`<article class="${index===current?'active':''}"><button type="button" class="lx-v27-queue-play" onclick="LX.musicQueuePlay(${index})">${LX.artwork.markup(item,{},'lx-queue-art',item.title)}<span><strong>${esc(item.title)}</strong><small>${esc(item.artist)} · ${isPreview(item)?'Prévia':isSpotify(item)?'Spotify oficial':'Faixa completa'}</small></span><time>${fmt(item.duration||0)}</time></button><div><button type="button" onclick="LX.v27QueueMove(${index},-1)" ${index===0?'disabled':''} aria-label="Mover para cima">↑</button><button type="button" onclick="LX.v27QueueMove(${index},1)" ${index===queue.length-1?'disabled':''} aria-label="Mover para baixo">↓</button><button type="button" class="danger" onclick="LX.v27QueueRemove(${index})" aria-label="Remover da fila">×</button></div></article>`).join('')||'<div class="lx-v27-empty"><strong>A fila está vazia</strong><p>Escolha uma faixa para começar.</p></div>'}</div></div>`;
    LX.artwork.hydrate(modal);
  }
  LX.openNowPlaying=openNowPlaying;LX.closeNowPlaying=closeNowPlaying;LX.openMusicQueue=openQueueV27;LX.v27QueueMove=queueMove;LX.v27QueueRemove=queueRemove;

  /* ---------- HLS/DASH adaptativo e controles honestos ---------- */
  let shakaPromise=null;
  function loadShaka(){
    if(window.shaka?.Player)return Promise.resolve(window.shaka);if(shakaPromise)return shakaPromise;
    shakaPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/shaka-player@5.2.10/dist/shaka-player.compiled.js';script.async=true;script.onload=()=>window.shaka?.Player?resolve(window.shaka):reject(new Error('SHAKA_UNAVAILABLE'));script.onerror=()=>reject(new Error('SHAKA_LOAD_FAILED'));document.head.appendChild(script)});return shakaPromise;
  }
  function adaptiveQualityUI(video,player){
    const root=video.getRootNode(),settings=root?.getElementById?.('settings');if(!settings)return;
    settings.querySelector('[data-lx-adaptive-quality]')?.remove();
    const tracks=player.getVariantTracks().filter(t=>t.height&&t.bandwidth),unique=[];
    [...tracks].sort((a,b)=>b.height-a.height||b.bandwidth-a.bandwidth).forEach(item=>{if(!unique.some(x=>x.height===item.height))unique.push(item)});
    if(!unique.length)return;
    const wrap=document.createElement('div');wrap.dataset.lxAdaptiveQuality='1';wrap.innerHTML=`<span style="display:block;padding:7px 10px 4px;color:#9ea6af;font-size:11px;font-weight:800">QUALIDADE ADAPTATIVA</span><button data-auto class="active">Automático</button>${unique.map((item,index)=>`<button data-variant="${index}">${item.height}p${item.hdr?' · HDR':''}</button>`).join('')}`;
    settings.prepend(wrap);wrap.querySelector('[data-auto]').onclick=()=>{player.configure({abr:{enabled:true}});wrap.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.hasAttribute('data-auto')));toast('Qualidade automática ativada.')};wrap.querySelectorAll('[data-variant]').forEach(button=>button.onclick=()=>{const item=unique[Number(button.dataset.variant)];player.configure({abr:{enabled:false}});player.selectVariantTrack(item,true);wrap.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));toast(`Qualidade ${item.height}p selecionada.`)});
  }
  LX.adaptive={
    async load(video,url){
      const shaka=await loadShaka();if(!shaka.Player.isBrowserSupported())throw new Error('ADAPTIVE_NOT_SUPPORTED');await this.destroy(video);
      const player=new shaka.Player();await player.attach(video);player.configure({abr:{enabled:true},streaming:{bufferingGoal:18,rebufferingGoal:3,bufferBehind:24}});video.__lxShaka=player;
      player.addEventListener('error',event=>console.warn('LX adaptive stream',event.detail));await player.load(url);adaptiveQualityUI(video,player);video.dispatchEvent(new Event('loadedmetadata'));return true;
    },
    async destroy(video){if(video?.__lxShaka){const player=video.__lxShaka;video.__lxShaka=null;try{await player.destroy()}catch{}}}
  };
  function enhancePlayer(host){
    if(!host?.shadowRoot||host.dataset.lxV27Enhanced)return;host.dataset.lxV27Enhanced='1';const root=host.shadowRoot,video=root.getElementById('video');
    const style=document.createElement('style');style.textContent=`.heading strong,.copy b{font-size:clamp(20px,2.1vw,32px)!important;line-height:1.08!important}.heading small,.copy small{font-size:clamp(12px,1vw,15px)!important}.nextCard strong{font-size:19px!important}.nextCard small{font-size:14px!important;line-height:1.45!important}.stage.lx-image-enhanced video{filter:contrast(1.055) saturate(1.035) brightness(1.015)}.settings button.active{background:rgba(255,255,255,.14)!important;color:#fff!important}.nextCard{padding:18px!important}@media(max-width:760px){.heading strong,.copy b{font-size:17px!important}.heading small,.copy small{font-size:12px!important}.nextCard{bottom:76px!important}.nextCard strong{font-size:17px!important}.nextCard small{font-size:13px!important}}`;
    root.appendChild(style);if(!video)return;
    const settings=root.getElementById('settings'),stage=root.getElementById('stage');if(!settings||!stage)return;
    if(!root.getElementById('enhanceV27')){const button=document.createElement('button');button.id='enhanceV27';button.textContent='Melhorar imagem · desligado';button.setAttribute('aria-pressed','false');button.onclick=()=>{const on=stage.classList.toggle('lx-image-enhanced');button.textContent=`Melhorar imagem · ${on?'ligado':'desligado'}`;button.setAttribute('aria-pressed',String(on));toast(on?'Melhoria perceptual leve ativada. A resolução original não foi alterada.':'Melhoria de imagem desligada.')};settings.prepend(button)}
    const rows=host.__lxQualityRows||[];if(rows.length>1&&!settings.querySelector('[data-lx-native-quality]')){const wrap=document.createElement('div');wrap.dataset.lxNativeQuality='1';wrap.innerHTML=`<span style="display:block;padding:7px 10px 4px;color:#9ea6af;font-size:11px;font-weight:800">QUALIDADES DISPONÍVEIS</span>${rows.map((row,index)=>`<button data-quality-index="${index}" class="${index===0?'active':''}">${esc(row.label)}</button>`).join('')}`;settings.prepend(wrap);wrap.querySelectorAll('[data-quality-index]').forEach(button=>button.onclick=async()=>{const row=rows[Number(button.dataset.qualityIndex)];wrap.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));await host.__lxSetQuality?.(row);toast(`Qualidade ${row.label} selecionada.`)})}
  }

  /* ---------- Fogo compartilhado por conversa ---------- */
  let streakTimer=null,streakChannel=null,streakUser='';
  async function refreshConversationStreak(){
    clearTimeout(streakTimer);streakTimer=setTimeout(async()=>{
      const peer=String(LX.chat?.peer?.()||''),client=db(),head=document.querySelector('.lx-chat-head');if(!peer||!client||!head)return;
      try{const {data,error}=await client.rpc('lx_get_conversation_streak',{p_other:peer});if(error)throw error;const row=Array.isArray(data)?data[0]:data,badge=head.querySelector('.lx-v27-chat-streak')||document.createElement('span');badge.className='lx-v27-chat-streak';const count=Number(row?.streak_count||0);badge.innerHTML=`<i aria-hidden="true">🔥</i><b>${count}</b>`;badge.title=count?`${count} ${count===1?'dia':'dias'} de fogo nesta conversa`:'O fogo começa quando os dois trocam mensagens hoje';badge.setAttribute('aria-label',badge.title);const copy=head.querySelector(':scope > div:nth-of-type(2)');if(copy&&badge.parentElement!==copy)copy.appendChild(badge)}catch(error){console.warn('LX conversation streak',error)}
    },260);
  }
  function subscribeStreak(){
    const me=uid(),client=db();if(!me||!client||streakUser===me)return;if(streakChannel)client.removeChannel(streakChannel).catch(()=>{});streakUser=me;streakChannel=client.channel(`lx-v27-streak-${me}`).on('postgres_changes',{event:'*',schema:'public',table:'lx_conversation_streaks'},refreshConversationStreak).subscribe();
  }

  /* ---------- Cargos e painel ADM ---------- */
  const roleLabels={owner:'Dono',administrator:'Administrador',editor:'Editor',moderator:'Moderador'};
  const normalizeRole=value=>({admin:'administrator',manager:'administrator',owner:'owner',administrator:'administrator',editor:'editor',moderator:'moderator'}[String(value||'').toLowerCase()]||'administrator');
  const pageCaps={dashboard:['owner','administrator','editor','moderator'],library:['owner','administrator','editor'],importer:['owner','administrator','editor'],uploads:['owner','administrator','editor'],requests:['owner','administrator','moderator'],community:['owner','administrator','moderator'],admins:['owner'],premium:['owner','administrator'],analytics:['owner','administrator'],notifications:['owner','administrator','moderator'],appearance:['owner','administrator'],settings:['owner','administrator']};
  function canPage(page){return (pageCaps[page]||['owner']).includes(normalizeRole(role()))}
  function applyAdminPermissions(){
    const currentRole=normalizeRole(role());$$('#adminNav [data-admin]').forEach(button=>{const allowed=(pageCaps[button.dataset.admin]||['owner']).includes(currentRole);button.classList.toggle('lx-role-hidden',!allowed);button.disabled=!allowed});
    const ident=document.querySelector('.admin-identity small'),label=roleLabels[currentRole]||'Equipe LX';
    // A atribuição de textContent cria childList mesmo com o mesmo texto. Como o
    // observador abaixo chama enhanceAdmin, reescrever sempre aqui bloqueava
    // todos os timers e a passagem da abertura para o login.
    if(ident&&ident.textContent!==label)ident.textContent=label;
    if(currentRole!=='owner')document.querySelector('#r2Setup')?.classList.add('lx-role-hidden');
  }
  function roleOptions(selected='administrator'){return Object.entries(roleLabels).map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('')}
  function renderAdminTeam(){
    const main=$('adminMain');if(!main||state().adminPage!=='admins'||main.dataset.lxV27Team==='1')return;main.dataset.lxV27Team='1';
    if(role()!=='owner'){LX.admin?.render?.('dashboard');return}
    const users=(LX.data?.users?.()||[]).filter(row=>row.admin||row.approved).sort((a,b)=>(b.admin?1:0)-(a.admin?1:0)||String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    main.innerHTML=`<header class="admin-head"><div><span class="eyebrow">SEGURANÇA E OPERAÇÃO</span><h1>Equipe ADM</h1><p>O Dono define exatamente o que cada pessoa pode fazer.</p></div><span class="lx-v27-owner-lock">Dono protegido</span></header><section class="lx-v27-role-guide">${Object.entries(roleLabels).map(([key,label])=>`<article><span>${label}</span><p>${key==='owner'?'Acesso total, cargos, integrações e segurança.':key==='administrator'?'Catálogo, usuários, conteúdo, comunidade e operação geral.':key==='editor'?'Filmes, séries, músicas, livros e uploads.':'Comunidade, aprovações, pedidos e moderação.'}</p></article>`).join('')}</section><section class="admin-card lx-v27-team-table"><header><div><span>EQUIPE</span><h2>${users.filter(x=>x.admin).length} contas no painel</h2></div></header><div>${users.map(row=>{const selected=normalizeRole(row.adminRole),self=String(row.id)===uid();return `<article><div class="lx-v27-team-person"><span>${esc(String(row.name||'LX').slice(0,2).toUpperCase())}</span><div><strong>${esc(row.name||'Usuário')}</strong><small>${esc(row.email||'Conta aprovada')}</small></div></div><div class="lx-v27-team-role">${row.admin?`<select id="lxRole_${esc(row.id)}">${roleOptions(selected)}</select><button type="button" onclick="LX.v27SaveRole('${esc(row.id)}')">Salvar cargo</button>`:`<select id="lxRole_${esc(row.id)}">${roleOptions('editor')}</select><button type="button" onclick="LX.v27SaveRole('${esc(row.id)}')">Adicionar à equipe</button>`}</div>${row.admin?`<button type="button" class="danger" onclick="LX.v27RemoveRole('${esc(row.id)}')" ${self&&selected==='owner'?'title="O último Dono é protegido"':''}>Remover</button>`:'<span class="lx-v27-approved-pill">Aprovado</span>'}</article>`}).join('')||'<div class="lx-v27-empty"><strong>Nenhuma conta aprovada</strong></div>'}</div></section>`;
  }
  LX.v27SaveRole=async id=>{const select=$(`lxRole_${id}`);try{await LX.cloud.setAdminRole(id,true,select?.value||'editor');toast('Cargo salvo e sincronizado.');delete $('adminMain').dataset.lxV27Team;LX.admin.render('admins')}catch(error){console.warn(error);toast(error.message==='OWNER_REQUIRED'?'Somente o Dono pode alterar cargos.':'Não foi possível salvar o cargo.')}};
  LX.v27RemoveRole=async id=>{if(!confirm('Remover o acesso desta conta ao painel ADM?'))return;try{await LX.cloud.setAdminRole(id,false,'administrator');toast('Acesso ADM removido.');delete $('adminMain').dataset.lxV27Team;LX.admin.render('admins')}catch(error){console.warn(error);toast(/last owner/i.test(error.message||'')?'O último Dono não pode ser removido.':'Não foi possível remover o cargo.')}};

  function appendSpotifySettings(){
    const main=$('adminMain');if(!main||state().adminPage!=='settings'||role()!=='owner'||$('lxV27SpotifySettings'))return;
    const card=document.createElement('section');card.id='lxV27SpotifySettings';card.className='admin-card lx-v27-spotify-settings';card.innerHTML=`<header><div><span>INTEGRAÇÃO OFICIAL</span><h2>Spotify Web API</h2><p>Use credenciais do Spotify for Developers. Os segredos ficam no Supabase e nunca entram no site público.</p></div><span id="lxSpotifyStatus">Não testado</span></header><div class="form-grid"><label class="field">Client ID<input id="lxSpotifyClientId" autocomplete="off" placeholder="Client ID"></label><label class="field">Client Secret<input id="lxSpotifyClientSecret" type="password" autocomplete="new-password" placeholder="Client Secret"></label><div class="span2"><button id="lxSpotifySave" class="primary-btn" type="button">Salvar e testar</button></div></div>`;main.appendChild(card);
    $('lxSpotifySave').onclick=async()=>{const button=$('lxSpotifySave'),id=$('lxSpotifyClientId').value.trim(),secret=$('lxSpotifyClientSecret').value.trim();if(!id||!secret)return toast('Preencha Client ID e Client Secret.');button.disabled=true;button.textContent='Salvando…';try{const client=db();for(const [key,value] of [['spotify_client_id',id],['spotify_client_secret',secret]]){const {error}=await client.rpc('lx_admin_set_integration_secret',{p_key:key,p_value:value});if(error)throw error}$('lxSpotifyClientSecret').value='';$('lxSpotifyStatus').textContent='Testando…';await spotifyInvoke({action:'search',q:'Brasil',limit:1});$('lxSpotifyStatus').textContent='Conectado';toast('Spotify conectado com segurança.')}catch(error){console.warn(error);$('lxSpotifyStatus').textContent='Verifique as credenciais';toast('Não foi possível validar o Spotify.')}finally{button.disabled=false;button.textContent='Salvar e testar'}};
  }

  function enhanceAdmin(){applyAdminPermissions();renderAdminTeam();appendSpotifySettings()}

  /* ---------- Integração com a aplicação existente ---------- */
  function wire(){
    syncBranding();hideInstallUI();if(!standalone()&&/iphone|ipad|ipod/i.test(navigator.userAgent))setTimeout(()=>showInstallInvite(true),2200);
    setTimeout(()=>{const splash=$('splash');if(!splash||splash.classList.contains('hidden')||state().screen!=='splash')return;splash.classList.add('lx-splash-exit');setTimeout(()=>{if(!splash.classList.contains('hidden'))$('enterSplash')?.click()},340)},2600);
    const el=audio();if(el){el.addEventListener('loadedmetadata',restoreScopedPosition);el.addEventListener('timeupdate',()=>{if(Math.floor(el.currentTime||0)%5===0)saveScopedPosition();updateNowPlayingProgress()});el.addEventListener('pause',()=>{saveScopedPosition();updateNowPlayingProgress()});el.addEventListener('play',setMusicKind);el.addEventListener('durationchange',setMusicKind)}
    $('musicQueueBtn')?.addEventListener('click',event=>{event.stopImmediatePropagation();openQueueV27()});
    $('musicCoverBtn')?.addEventListener('click',event=>{event.stopImmediatePropagation();openNowPlaying()});
    document.querySelector('#musicDock .music-info')?.addEventListener('click',openNowPlaying);
    const legacy=LX.contentHub?.renderMusic;if(legacy){LX.v27.legacyMusicSearch=legacy;LX.contentHub.renderMusic=renderSpotifySearch}
    const originalOpen=LX.chat?.open;if(originalOpen)LX.chat.open=async(...args)=>{const result=await originalOpen(...args);refreshConversationStreak();return result};
    subscribeStreak();enhanceAdmin();
    $('adminNav')?.addEventListener('click',event=>{const button=event.target.closest('[data-admin]');if(button&&!canPage(button.dataset.admin)){event.preventDefault();event.stopImmediatePropagation();toast('Esse cargo não possui acesso a esta área.')}},true);
    setMusicKind();
  }
  let lastUser='';
  function heartbeat(){
    const current=uid();if(lastUser&&current!==lastUser){audio()?.pause();if(audio())audio().currentTime=0;state().musicQueue=[];state().musicIndex=0;$('musicDock')?.classList.add('hidden');closeNowPlaying()}lastUser=current;if(current)subscribeStreak();setMusicKind();enhanceAdmin();syncBranding();$('lxStreakIndicator')?.remove();$('lxStreakWelcome')?.remove();
  }
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;syncBranding(node);if(node.id==='lxGlobalCinema')setTimeout(()=>enhancePlayer(node),0);if(node.querySelector?.('#lxGlobalCinema'))enhancePlayer(node.querySelector('#lxGlobalCinema'));if(node.matches?.('.lx-chat-head,.lx-chat-msg')||node.querySelector?.('.lx-chat-head,.lx-chat-msg'))refreshConversationStreak()}enhanceAdmin()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
  setInterval(heartbeat,1200);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){heartbeat();refreshConversationStreak()}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!ensureNowPlaying().classList.contains('hidden'))closeNowPlaying()});
  window.__LX_MODULES=window.__LX_MODULES||{};window.__LX_MODULES.v27='29.0';
})();
