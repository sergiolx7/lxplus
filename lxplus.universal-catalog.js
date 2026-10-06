/* LX Universal Catalog — additive integration with the existing UI36 shell and players. */
(()=>{'use strict';
  const LX=window.LX=window.LX||{},$=id=>document.getElementById(id);
  if(LX.universal)return;
  const labels={all:'Tudo',movie:'Filmes',series:'Séries',anime:'Anime',dorama:'Doramas',track:'Músicas',artist:'Artistas',album:'Álbuns',playlist:'Playlists',book:'Livros',author:'Autores',user:'Pessoas'};
  const singular={movie:'Filme',series:'Série',anime:'Anime',dorama:'Dorama',documentary:'Documentário',concert:'Show',track:'Música',album:'Álbum',artist:'Artista',playlist:'Playlist',book:'Livro',author:'Autor',live:'Ao Vivo',user:'Pessoa'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const image=v=>{if(!v)return '';try{const u=new URL(v,location.origin);return !u.username&&!u.password&&(u.protocol==='https:'||u.origin===location.origin)?u.href:'';}catch{return '';}};
  const url=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const db=()=>LX.cloud?.db?.(),user=()=>LX.cloud?.user?.()||LX.ui?.state?.user,admin=()=>!!LX.ui?.state?.user?.admin;
  const state={q:'',filter:'all',page:0,rows:[],busy:false,sequence:0,timer:null,detail:null,detailSequence:0,job:null,jobTimer:null,selected:new Set(),playbackSequence:0};
  const resultsCache=new Map(),homeCache=new Map(),transient=new Map();
  const errors={TMDB_NOT_CONFIGURED:'TMDB aguardando configuração.',GOOGLE_BOOKS_NOT_CONFIGURED:'Google Books aguardando configuração.',PLEX_PARTNER_NOT_CONFIGURED:'Conecte o feed de parceiro Plex para sincronizar.',PROVIDER_RATE_LIMIT:'A fonte pediu uma pausa. Tente novamente em alguns segundos.',ADMIN_REQUIRED:'Esta ação exige permissão para gerenciar o catálogo.',CATALOG_DATABASE_NOT_READY:'O catálogo universal ainda precisa ser ativado no servidor.',PROVIDER_UNAVAILABLE:'Uma fonte está indisponível. Os resultados locais continuam disponíveis.',SOURCE_HOST_NOT_ALLOWED:'Cadastre o domínio da fonte na configuração do servidor.',PRIVATE_NETWORK_BLOCKED:'A fonte não é um endereço público permitido.',AUTHORIZATION_REQUIRED:'Informe a autorização de reprodução desta fonte.',MANUAL_MATCH_REQUIRED:'Escolha o título correspondente antes de importar.',JOB_NOT_FINISHED:'Aguarde o lote terminar para usar o rollback.'};
  const message=e=>errors[e?.code||e?.message]||'Não foi possível concluir agora. Tente novamente.';
  async function invoke(action,data={}){
    if(!db())throw Object.assign(new Error('CATALOG_DATABASE_NOT_READY'),{code:'CATALOG_DATABASE_NOT_READY'});
    const {data:result,error}=await db().functions.invoke('lx-universal-catalog',{body:{action,...data}});
    if(error||result?.error){let code=result?.error;try{if(!code&&error?.context?.json)code=(await error.context.json())?.error;}catch{}const e=new Error(code||'CATALOG_DATABASE_NOT_READY');e.code=e.message;throw e;}
    return result||{};
  }
  const reference=row=>row.legacy_id?{provider:'legacy',id:String(row.legacy_id)}:(row.external_ids||[]).find(x=>['tmdb','googlebooks','openlibrary','musicbrainz','imdb'].includes(x.provider));
  const key=row=>row.kind==='user'?'user:'+row.id:row.id||((row.external_ids||[]).map(x=>[x.provider,x.namespace,x.external_id].join(':')).join('|'))||row.title;
  function local(q,filter){return (LX.data?.catalog?.()||[]).filter(x=>x.published!==false).map(x=>({kind:Object.keys(singular).find(k=>singular[k]===x.type)||'movie',title:x.title,description:x.desc,cover:x.cover,year:x.year,legacy_id:x.id,metadata:{artist:x.artist,authors:[x.author].filter(Boolean)},external_ids:[{provider:'legacy',namespace:'catalog',external_id:String(x.id)},...(x.tmdbId?[{provider:'tmdb',namespace:x.type==='Filme'?'movie':'tv',external_id:String(x.tmdbId)}]:[])]})).filter(x=>(filter==='all'||x.kind===filter)&&norm([x.title,x.metadata.artist,...x.metadata.authors].join(' ')).includes(norm(q)));}
  function merge(a,b){const rows=[],seen=new Map();for(const row of [...a,...b]){const ids=(row.external_ids||[]).map(i=>[i.provider,i.namespace,i.external_id].join(':'));const old=seen.get(key(row))||ids.map(i=>seen.get(i)).find(Boolean);if(old){Object.assign(old,row);continue;}rows.push(row);seen.set(key(row),row);ids.forEach(i=>seen.set(i,row));}return rows;}
  function card(row,index,prefix='result'){
    const cover=image(row.cover),caption=row.kind==='user'?'@'+(row.username||'perfil'):row.metadata?.artist||(row.metadata?.authors||[]).join(', ')||[singular[row.kind],row.year||''].filter(Boolean).join(' · ');
    return `<button class="lx-uc-card ${['track','artist','album'].includes(row.kind)?'is-music':''}" type="button" data-uc-${prefix}="${index}" aria-label="Abrir ${esc(row.title)}"><span class="lx-uc-art">${cover?`<img src="${esc(cover)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:'<span class="lx-uc-fallback">LX<span>+</span></span>'}<span class="lx-uc-kind">${esc(singular[row.kind]||'Catálogo')}</span></span><strong>${esc(row.title)}</strong><small>${esc(caption)}</small></button>`;
  }
  function drawSearch(payload={}){
    if(!state.q||LX.ui?.state?.query!==state.q)return;
    const groups=new Map();for(const row of state.rows){if(!groups.has(row.kind))groups.set(row.kind,[]);groups.get(row.kind).push(row);}const ordered=[];while([...groups.values()].some(a=>a.length))for(const a of groups.values())if(a.length)ordered.push(a.shift());const rows=ordered.slice((state.window||0)*60,((state.window||0)+1)*60),box=$('homeContent');if(!box)return;state.displayRows=rows;state.lastPayload=payload;
    box.innerHTML=`<section class="lx-uc-search"><header class="lx-uc-heading"><div><span class="eyebrow">LX UNIVERSAL CATALOG</span><h1>Encontre seu próximo favorito.</h1><p>Filmes, séries, música, livros e pessoas em uma busca.</p></div><span class="lx-uc-count" role="status">${state.busy?'Buscando…':rows.length+' resultados nesta página'}</span></header><div class="lx-uc-filters" role="group" aria-label="Filtrar resultados">${Object.entries(labels).map(([k,v])=>`<button type="button" data-uc-filter="${k}" aria-pressed="${state.filter===k}">${v}</button>`).join('')}</div><p class="lx-uc-query">Resultados para <b>“${esc(state.q)}”</b></p>${payload.errors?.length?`<p class="lx-uc-notice" role="status">${[...new Set(payload.errors.map(e=>errors[e.code]||'Uma fonte não respondeu.'))].map(esc).join(' ')}</p>`:''}<div class="lx-uc-grid">${rows.map((x,i)=>card(x,i)).join('')||`<div class="lx-uc-empty">${state.busy?'Procurando títulos…':'Nenhum resultado encontrado. Tente outro nome ou filtro.'}</div>`}</div><div class="lx-uc-pagination">${state.page||state.window?'<button type="button" data-uc-prev>← Página anterior</button>':''}${payload.hasMore||((state.window||0)+1)*60<state.rows.length?'<button type="button" data-uc-next>Próxima página →</button>':''}</div><footer class="lx-uc-attribution">Metadados: TMDB, MusicBrainz e Google Books/Open Library. Este produto usa a API TMDB e não é endossado ou certificado pelo TMDB.</footer></section>`;
  }
  function renderSearch(q){
    q=String(q||'').trim().slice(0,100);if(!q)return;
    state.q=q;state.window=0;state.sequence++;const sequence=state.sequence;
    $('hero')?.classList.add('hidden');$('welcome')?.classList.add('hidden');$('app')?.classList.add('lx-uc-searching');
    clearTimeout(state.timer);state.rows=local(q,state.filter);state.busy=q.length>=2;drawSearch();
    if(q.length<2){state.busy=false;drawSearch();return;}
    const cacheKey=[user()?.id,admin(),q,state.filter,state.page].join('|'),cached=resultsCache.get(cacheKey);
    if(cached&&Date.now()-cached.at<300000){state.rows=merge(state.rows,cached.data.items||[]);state.busy=false;drawSearch(cached.data);return;}
    state.timer=setTimeout(async()=>{let payload;
      try{payload=await invoke('search',{q,filter:state.filter,page:state.page});resultsCache.set(cacheKey,{at:Date.now(),data:payload});if(resultsCache.size>12)resultsCache.delete(resultsCache.keys().next().value);}
      catch(e){payload={items:[],errors:[{code:e.code}]};}
      if(sequence!==state.sequence||LX.ui?.state?.query!==q)return;
      state.rows=merge(state.rows,payload.items||[]);state.busy=false;drawSearch(payload);
    },300);
  }
  function modal(html){$('overlay')?.classList.remove('hidden');const m=$('modal');if(m){m.innerHTML=`<button class="close-btn" type="button" data-uc-close aria-label="Fechar">×</button>${html}`;m.scrollTop=0;m.tabIndex=-1;m.focus({preventScroll:true});const seq=state.modalSequence=(state.modalSequence||0)+1;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(seq===state.modalSequence)m.scrollTo({top:0,behavior:'instant'});}));}if($('overlay'))$('overlay').scrollTop=0;}
  function linksHtml(links){return (links||[]).filter(l=>String(l.provider||'').toLowerCase()!=='plex'&&!LX.plexPartner?.plexUrl?.(l.url)&&url(l.url)).map(l=>`<a class="secondary-btn" href="${esc(url(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label||'Ver na fonte oficial')} ↗</a>`).join('');}
  const legacyReady=id=>{const x=LX.data?.catalog?.().find(i=>String(i.id)===String(id));if(LX.catalogReady)return !!x&&LX.catalogReady(x);return !!(x&&(x.type==='Livro'?(x.mediaKey||x.chapters?.length):(x.mediaKey||x.authorizedAudioUrl||x.tracks?.some(t=>t.mediaKey||t.authorizedAudioUrl)||x.episodes?.some(e=>e.mediaKey)||x.externalReadUrl)));};
  function detailHtml(d){
    const x=d.item,m=x.metadata||{},r=d.resolved||{},playable=r.status==='playable'||r.status==='official_embed'||r.status==='legacy'&&legacyReady(r.legacy_id);
    const titleLabel=x.kind==='book'?'Ler agora':x.kind==='track'?'Ouvir agora':'Assistir';
    const fields=[x.year,x.certification,x.duration?(x.kind==='track'?Math.floor(x.duration/60)+':'+String(x.duration%60).padStart(2,'0'):x.duration+' min'):'',x.rating?'★ '+Number(x.rating).toFixed(1):'',r.source?.resolution].filter(Boolean);
    return `<article class="lx-uc-detail"><div class="lx-uc-detail-art">${image(x.backdrop||x.cover)?`<img src="${esc(image(x.backdrop||x.cover))}" alt="">`:''}<div class="lx-uc-detail-shade"></div></div><div class="lx-uc-detail-copy"><div class="lx-uc-detail-poster">${image(x.cover)?`<img src="${esc(image(x.cover))}" alt="Capa de ${esc(x.title)}">`:'<b>LX+</b>'}</div><div><span class="eyebrow">${esc(singular[x.kind]||'Catálogo')} ${(x.tags||[]).map(esc).join(' · ')}</span>${image(x.logo)?`<img class="lx-uc-title-logo" src="${esc(image(x.logo))}" alt="${esc(x.title)}">`:''}<h1>${esc(x.title)}</h1><div class="lx-uc-meta">${fields.map(v=>`<span>${esc(v)}</span>`).join('')}</div><p>${esc(x.description||'Sinopse ainda não disponível.')}</p><div class="lx-uc-actions">${playable?`<button class="primary-btn" type="button" data-uc-play>${titleLabel}</button>`:''}${!playable?`<span class="lx-uc-availability">${(d.seasons||[]).length?'Selecione um episódio para ver as fontes':'Disponível em breve'}</span>`:''}<button type="button" class="secondary-btn" data-uc-save aria-pressed="${!!d.saved}">${d.saved?'✓ Na minha lista':'+ Minha lista'}</button><button type="button" class="secondary-btn" data-uc-like aria-pressed="${!!d.liked}">${d.liked?'♥ Curtido':'♡ Curtir'}</button><button type="button" class="secondary-btn" data-uc-share>Compartilhar</button>${x.kind==='track'?'<button type="button" class="secondary-btn" data-uc-collection>Adicionar à playlist</button>':''}${admin()&&x.archived?'<button type="button" class="secondary-btn" data-uc-restore>Restaurar como rascunho</button>':''}${admin()?'<button type="button" class="secondary-btn" data-uc-source>Gerenciar fontes</button>':''}</div><div class="lx-uc-links">${linksHtml(r.provider_links||d.provider_links)}</div></div></div><div class="lx-uc-detail-body">${d.seasons?.length?`<section class="lx-uc-seasons"><label>Temporada <select id="lxUcSeason">${d.seasons.map(s=>`<option value="${Number(s.number)}">${esc(s.title||'Temporada '+s.number)}</option>`).join('')}</select></label><div id="lxUcEpisodes" class="lx-uc-episodes" aria-live="polite"></div></section>`:''}<details class="lx-uc-more"><summary>Mais informações</summary><dl>${[['Título original',x.original_title],['Artista',m.artist],['Álbum',m.album],['Autores',(m.authors||[]).join(', ')],['Gêneros',(x.genres||[]).join(', ')],['País',(x.countries||[]).join(', ')],['Direção',(m.directors||[]).join(', ')],['Criação',(m.creators||[]).join(', ')],['Produtoras',(m.companies||[]).join(', ')],['Editora',m.publisher],['Páginas',m.pages],['ISBN',(m.isbn||[]).join(', ')],['Status',m.status]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></details>${m.cast?.length?`<section><h2>Elenco</h2><div class="lx-uc-cast">${m.cast.slice(0,16).map(p=>`<div>${image(p.image)?`<img src="${esc(image(p.image))}" alt="" loading="lazy">`:''}<b>${esc(p.name)}</b><small>${esc(p.character||'')}</small></div>`).join('')}</div></section>`:''}${m.trailers?.length?`<section><h2>Trailers</h2>${linksHtml(m.trailers.map(t=>({...t,label:t.title})))}</section>`:''}${m.tracks?.length?`<section><h2>Faixas do álbum</h2><ol class="lx-uc-tracklist">${m.tracks.map((t,i)=>`<li><span>${i+1}</span><b>${esc(t.title)}</b>${t.recording_id?`<button type="button" data-uc-track="${esc(t.recording_id)}">Ver música</button>`:''}</li>`).join('')}</ol></section>`:''}${m.similar?.length||m.recommendations?.length?'<section><h2>Você também pode gostar</h2><div id="lxUcRelated" class="lx-uc-grid"></div></section>':''}<small class="lx-uc-attribution">Ficha técnica fornecida pelo catálogo de origem. Disponibilidade depende das fontes cadastradas.</small></div></article>`;
  }
  async function open(row){
    if(!row)return;
    if(row.kind==='user')return LX.insights?.openMember?.(row.id);
    if(row.playlist_id){try{const data=await invoke('playlist',{playlist_id:row.playlist_id});state.playlistRows=data.items||[];return modal(`<section class="lx-uc-panel"><span class="eyebrow">SUA PLAYLIST</span><h1>${esc(data.playlist.title)}</h1><p>${state.playlistRows.length} itens disponíveis.</p><div class="lx-uc-grid">${state.playlistRows.slice(0,60).map((r,i)=>card(r,i,'playlist')).join('')}</div></section>`);}catch(e){modal(`<div class="lx-uc-loading"><h2>Não foi possível abrir a playlist.</h2><p>${esc(message(e))}</p></div>`);return;}}
    const seq=++state.detailSequence;modal('<div class="lx-uc-loading" role="status">Carregando ficha técnica…</div>');
    try{
      const d=await invoke('open',row.id&&!row.legacy_id?{media_id:row.id}:{reference:reference(row)});
      if(d.needs_selection)throw new Error('MANUAL_MATCH_REQUIRED');
      d.resolved=await invoke('resolve',{media_id:d.item.id}).catch(()=>({status:'external',provider_links:d.provider_links}));
      const reactions=await db().from('lx_media_reactions').select('reaction').eq('media_id',d.item.id).eq('user_id',user()?.id);
      d.saved=reactions.data?.some(r=>r.reaction==='saved');d.liked=reactions.data?.some(r=>r.reaction==='like');
      if(seq!==state.detailSequence)return;state.detail=d;modal(detailHtml(d));
      const related=[...(d.item.metadata?.recommendations||[]),...(d.item.metadata?.similar||[])].slice(0,12);state.related=related;
      if($('lxUcRelated'))$('lxUcRelated').innerHTML=related.map((r,i)=>card(r,i,'related')).join('');
      if($('lxUcSeason'))loadSeason(Number($('lxUcSeason').value));
    }catch(e){if(seq!==state.detailSequence)return;
      if(row.legacy_id&&LX.detail){LX.ui?.close?.();return LX.detail(Number(row.legacy_id));}
      modal(`<div class="lx-uc-loading"><h2>Não foi possível abrir.</h2><p>${esc(message(e))}</p><button type="button" data-uc-reopen>Tentar novamente</button></div>`);state.failedRow=row;
    }
  }
  async function loadSeason(number){const d=state.detail,id=d?.item.id,box=$('lxUcEpisodes');if(!box)return;box.innerHTML='<p>Carregando episódios…</p>';
    try{const result=await invoke('season',{media_id:id,number});if(state.detail?.item.id!==id||Number($('lxUcSeason')?.value)!==number)return;state.episodes=result.episodes||[];box.innerHTML=state.episodes.map((e,i)=>`<button type="button" class="lx-uc-episode" data-uc-episode="${i}">${image(e.image)?`<img src="${esc(image(e.image))}" alt="" loading="lazy">`:''}<div><b>${e.number}. ${esc(e.title)}</b><small>${e.duration?e.duration+' min · ':''}${esc(e.release_date||'')}</small><p>${esc(e.description||'')}</p></div><span>▶</span></button>`).join('')||'<p>Episódios ainda não informados.</p>';}catch(e){if(box.isConnected)box.innerHTML=`<p>${esc(message(e))}</p>`;}}
  async function reaction(type){const d=state.detail,id=d?.item.id,uid=user()?.id;if(!id||!uid)return;const active=type==='saved'?d.saved:d.liked;
    const result=active?await db().from('lx_media_reactions').delete().eq('user_id',uid).eq('media_id',id).eq('reaction',type):await db().from('lx_media_reactions').upsert({user_id:uid,media_id:id,reaction:type});
    if(result.error)return LX.toast?.('Não foi possível salvar.');
    homeCache.clear();if(type==='saved'){d.saved=!active;if(d.item.legacy_id)LX.toggleList?.(Number(d.item.legacy_id));}else d.liked=!active;
    const b=$('modal')?.querySelector(type==='saved'?'[data-uc-save]':'[data-uc-like]');if(b){b.setAttribute('aria-pressed',String(!active));b.textContent=type==='saved'?(!active?'✓ Na minha lista':'+ Minha lista'):(!active?'♥ Curtido':'♡ Curtir');}
  }
  function runtimeItem(item,source,episode){
    const id=-parseInt(item.id.replace(/-/g,'').slice(0,12),16)-1,type=singular[item.kind];
    const x={id,type:['Série','Anime','Dorama','Música','Livro'].includes(type)?type:'Filme',title:item.title,desc:item.description,cover:item.cover,banner:item.backdrop,year:item.year,genre:(item.genres||[]).join(' · '),artist:item.metadata?.artist||'',album:item.metadata?.album||'',author:(item.metadata?.authors||[]).join(', '),duration:item.duration,mediaKey:source.url,published:false,ucMediaId:item.id,streamType:source.source_type,subtitleTracks:(source.subtitles||[]).map(t=>({...t,lang:t.language})),qualitySources:Object.fromEntries((source.quality_variants||[]).map(t=>[t.quality,t.url]))};
    if(episode)x.episodes=[{number:episode.number,season:Number($('lxUcSeason')?.value||1),title:episode.title,mediaKey:source.url,subtitleTracks:x.subtitleTracks,qualitySources:x.qualitySources}];
    if(x.type==='Música')x.tracks=[{title:x.title,artist:x.artist,mediaKey:source.url,duration:x.duration}];
    transient.set(id,x);return x;
  }
  async function progress(element,id,episodeKey='',sequence,legacy={}){
    if(!element||!user()?.id)return;
    const uid=user().id;let last=0,stopped=false;
    const result=await db().from('lx_media_progress').select('position,duration,completed').eq('user_id',uid).eq('media_id',id).eq('episode_key',episodeKey).maybeSingle();
    const old=legacy.id?LX.data.history?.()[legacy.id]:null,saved=result.data||(!legacy.episode||old?.episode?.number===legacy.episode.number&&Number(old.episode.season)===legacy.season?old:null);const restore=()=>{if(!stopped&&sequence===state.playbackSequence&&saved?.position>3&&!saved.completed&&saved.position<(element.duration||Infinity)-5)element.currentTime=saved.position;};
    if(element.readyState>0)restore();else element.addEventListener('loadedmetadata',restore,{once:true});
    const save=()=>{if(stopped||sequence!==state.playbackSequence||user()?.id!==uid||!Number.isFinite(element.currentTime))return;const now=Date.now();if(now-last<15000&&!element.paused&&!element.ended)return;last=now;
      db()?.from('lx_media_progress').upsert({user_id:uid,media_id:id,episode_key:episodeKey,position:Math.max(0,element.currentTime),duration:Number.isFinite(element.duration)?element.duration:0,completed:element.ended,updated_at:new Date().toISOString()}).then(()=>{}).catch(()=>{});if(legacy.id&&element.duration>0){const h=LX.data.history();h[legacy.id]={...(h[legacy.id]||{}),position:element.currentTime,duration:element.duration,progress:legacy.episode?(h[legacy.id]?.progress||1):element.currentTime/element.duration*100,episodeProgress:legacy.episode?element.currentTime/element.duration*100:undefined,episode:legacy.episode?{number:legacy.episode.number,season:legacy.season,title:legacy.episode.title}:null,opened:now};LX.store.write(LX.store.keys.history,h);}};
    element.addEventListener('timeupdate',save);element.addEventListener('pause',save);element.addEventListener('ended',save);
    const cleanup=()=>{save();stopped=true;element.removeEventListener('timeupdate',save);element.removeEventListener('pause',save);element.removeEventListener('ended',save);};
    state.progressCleanup?.();state.progressCleanup=cleanup;state.flushProgress=save;
  }
  async function play(episode=null,exclude=[],context=null){
    const d=context?.detail||state.detail;if(!d)return;const playback=context||{detail:d,episodes:[...(state.episodes||[])],season:Number($('lxUcSeason')?.value||1),renewed:new Set()};state.progressCleanup?.();state.progressCleanup=null;const sequence=++state.playbackSequence;
    try{
      const result=await invoke('resolve',{media_id:d.item.id,episode_id:episode?.id,exclude});if(sequence!==state.playbackSequence)return;
      if(result.status==='legacy'){LX.ui.close();await (d.item.kind==='book'?LX.read(Number(result.legacy_id)):d.item.kind==='track'?LX.music(Number(result.legacy_id),0,true):LX.play(Number(result.legacy_id),episode?.number||1,playback.season));if(sequence!==state.playbackSequence)return;const element=d.item.kind==='track'?$('musicAudio'):$('lxGlobalCinema')?.shadowRoot?.querySelector('video');if(element){let switching=false;const failover=()=>{if(!switching&&sequence===state.playbackSequence){switching=true;play(episode,[...exclude,'legacy:'+result.legacy_id],playback);}};element.addEventListener('error',failover,{once:true});element.addEventListener('lx-source-error',failover,{once:true});if(element.error||element.dataset.lxSourceFailed==='1')failover();}return;}
      if(result.status==='external'){LX.stopMiniPlayer?.(true);$('musicAudio')?.pause();modal(`<div class="lx-uc-loading"><h2>Disponível em breve</h2><p>${esc(d.item.title)} não possui uma fonte interna válida neste momento.</p><div class="lx-uc-links">${linksHtml(result.provider_links)}</div><button type="button" data-uc-detail-back>Voltar à ficha</button></div>`);return;}
      if(result.status==='official_embed'){modal(`<div class="lx-uc-loading"><h2>Player oficial</h2><a class="primary-btn" href="${esc(url(result.source.url))}" target="_blank" rel="noopener noreferrer">Abrir no provedor ↗</a></div>`);return;}
      const item=runtimeItem(d.item,result.source,episode);if(item.episodes?.length)item.episodes[0].season=playback.season;LX.ui.close();
      if(item.type==='Livro')await LX.read(item.id);else if(item.type==='Música')await LX.music(item.id,0,true);else await LX.play(item.id,episode?.number||1,item.episodes?.[0]?.season||1);
      if(sequence!==state.playbackSequence)return;
      const host=$('lxGlobalCinema'),video=host?.shadowRoot?.querySelector('video'),audio=$('musicAudio')||document.querySelector('#musicDock audio');
      const element=item.type==='Música'?audio:video;
      if(element){progress(element,d.item.id,episode?.id||'',sequence,{id:d.item.legacy_id,episode,season:playback.season});
        const failed=[...exclude,result.source.id];let switching=false;const failover=()=>{if(switching||sequence!==state.playbackSequence)return;switching=true;if(result.source.source_type==='storage'&&+new Date(result.source.expires_at)<Date.now()+30000&&!playback.renewed.has(result.source.id)){playback.renewed.add(result.source.id);play(episode,exclude,playback);return;}if(failed.length>=5){LX.stopMiniPlayer?.(true);element.pause();modal(`<div class="lx-uc-loading"><h2>Disponível em breve</h2><p>As fontes internas não puderam ser reproduzidas agora.</p>${linksHtml(d.provider_links)}</div>`);return;}LX.toast?.('Tentando outra fonte…');play(episode,failed,playback);};element.addEventListener('error',failover,{once:true});element.addEventListener('lx-source-error',failover,{once:true});if(element.dataset.lxSourceFailed==='1'||element.error)failover();
        if(video&&episode?.intro_end>episode?.intro_start){const skip=document.createElement('button');skip.textContent='Pular abertura';skip.className='lx-uc-skip';skip.style.cssText='position:absolute;bottom:110px;right:24px;z-index:10;padding:12px;border-radius:10px';skip.onclick=()=>video.currentTime=episode.intro_end;host.shadowRoot.appendChild(skip);video.addEventListener('timeupdate',()=>skip.hidden=video.currentTime<episode.intro_start||video.currentTime>=episode.intro_end);}
        if(video&&episode){video.addEventListener('ended',()=>{const next=playback.episodes.find(e=>e.number===episode.number+1);if(next&&sequence===state.playbackSequence)play(next,[],playback);},{once:true});}
      }
    }catch(e){LX.toast?.(message(e));}
  }
  async function share(){const d=state.detail;if(!d)return;const link=location.origin+location.pathname+'?media='+encodeURIComponent(d.item.id);try{if(navigator.share)await navigator.share({title:d.item.title,url:link});else{await navigator.clipboard.writeText(link);LX.toast?.('Link copiado.');}}catch{}}
  async function playlistPanel(){
    const result=await db().from('lx_media_playlists').select('id,title,media_ids').eq('user_id',user().id).order('updated_at',{ascending:false}).limit(100);if(result.error)throw result.error;state.playlists=result.data||[];
    modal(`<section class="lx-uc-panel"><h2>Adicionar à playlist</h2><label>Playlist<select id="lxUcPlaylist"><option value="">Criar uma playlist</option>${state.playlists.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select></label><label>Nome da nova playlist<input id="lxUcPlaylistName" maxlength="200" placeholder="Minha seleção"></label><button type="button" class="primary-btn" data-uc-playlist-save>Adicionar música</button><button type="button" data-uc-detail-back>Voltar à ficha</button></section>`);
  }
  async function savePlaylist(){
    const selected=state.playlists.find(p=>p.id===$('lxUcPlaylist').value),title=selected?.title||$('lxUcPlaylistName').value.trim();if(!title)return LX.toast?.('Dê um nome à playlist.');
    const row={id:selected?.id||crypto.randomUUID(),user_id:user().id,title,media_ids:[...new Set([...(selected?.media_ids||[]),state.detail.item.id])].slice(0,500),updated_at:new Date().toISOString()};
    const result=await db().from('lx_media_playlists').upsert(row);if(result.error)throw result.error;resultsCache.clear();homeCache.clear();LX.toast?.('Música adicionada à playlist. Pesquise pelo nome para abrir.');modal(detailHtml(state.detail));
  }
  function onRender(){
    if(LX.ui?.state?.query)return;
    $('app')?.classList.remove('lx-uc-searching');state.sequence++;clearTimeout(state.timer);
    if(!['Início','Filmes','Séries','Animes','Doramas','Livros','Música','Minha Lista'].includes(LX.ui?.state?.category)||!['Assistir','Ler','Ouvir'].includes(LX.ui?.state?.mode))return;
    if($('lxUcHome'))return;
    const container=document.createElement('section');container.id='lxUcHome';container.className='lx-uc-home';$('homeContent')?.append(container);
    const mode=LX.ui.state.mode,category=LX.ui.state.category,kind=mode==='Ler'?'book':mode==='Ouvir'?'track':({Séries:'series',Animes:'anime',Doramas:'dorama'}[category]||'movie'),cacheKey=[user()?.id,kind].join('|');
    const render=data=>{if($('lxUcHome')!==container||LX.ui.state.mode!==mode||LX.ui.state.category!==category||LX.ui.state.query)return;
      const sections=(data.sections||[]).filter(s=>(s.items||[]).length&&(category!=='Minha Lista'||s.title==='Minha lista no catálogo universal')).slice(0,17);state.homeRows=[];
      if(!sections.length){container.remove();return;}
      container.innerHTML=sections.map(section=>{const start=state.homeRows.length,rows=section.items.slice(0,16);state.homeRows.push(...rows);return `<section class="lx-uc-home-section"><div class="lx-uc-heading"><div><span class="eyebrow">LX UNIVERSAL CATALOG</span><h2>${esc(section.title)}</h2></div></div><div class="lx-uc-home-rail">${rows.map((r,i)=>card(r,start+i,'home')).join('')}</div></section>`;}).join('');
      $('homeContent')?.querySelector('.official-empty')?.remove();
    };
    const cached=homeCache.get(cacheKey);if(cached&&Date.now()-cached.at<600000)return render(cached.data);
    invoke('home',{kind}).then(data=>{homeCache.set(cacheKey,{at:Date.now(),data});render(data);}).catch(()=>container.remove());
  }
  async function renderAdmin(m=$('adminMain')){
    if(!m)return;state.selected.clear();clearTimeout(state.jobTimer);
    m.innerHTML=`<div class="admin-head"><div><span class="eyebrow">LX ADMIN</span><h1>LX Content Hub</h1><p>Catálogo universal, fontes e importações em um único lugar.</p></div></div><section class="lx-uc-panel"><div id="lxUcDashboard" role="status">Conferindo o catálogo…</div></section><div class="lx-uc-admin-grid"><section class="lx-uc-panel"><span class="eyebrow">IMPORTAR CONTEÚDO</span><h2>Cole um link. Receba a ficha.</h2><label>URL ou identificador<input id="lxUcImportUrl" placeholder="TMDB, IMDb, Plex, Google Books, Open Library ou MusicBrainz"></label><button type="button" class="primary-btn" data-uc-preview>Ver prévia</button><div id="lxUcPreview" aria-live="polite"></div></section><section class="lx-uc-panel"><span class="eyebrow">LX SMART IMPORT 2.0</span><h2>Importar em lotes</h2><p>URLs, IDs, CSV ou JSON. Até 2.000 referências por fila.</p><label>Referências<textarea id="lxUcBatchText" rows="5" placeholder="tmdb:movie:11&#10;https://www.themoviedb.org/tv/1399"></textarea></label><label>Formato<select id="lxUcBatchFormat"><option value="lines">Uma referência por linha</option><option value="csv">CSV com coluna url ou id</option><option value="json">JSON de referências</option></select></label><label>Arquivo de referências<input id="lxUcBatchFile" type="file" accept=".csv,.json,.txt" multiple></label><label>Pasta de arquivos de referências<input id="lxUcBatchFolder" type="file" webkitdirectory multiple></label><small>As pastas importam listas .csv, .json e .txt. Arquivos de mídia podem ser associados às fontes após importar a ficha.</small><label class="lx-uc-check"><input type="checkbox" id="lxUcBatchPublish">Publicar metadados após a importação</label><button type="button" class="primary-btn" data-uc-enqueue>Criar fila</button><div id="lxUcJob" aria-live="polite"></div></section></div><section class="lx-uc-panel"><div class="lx-uc-heading"><div><span class="eyebrow">PLEX CATALOG CONNECTOR</span><h2>Sincronizar catálogo do parceiro</h2><p>Sincronização incremental pelo feed autorizado.</p></div><button type="button" data-uc-plex>Sincronizar</button></div><div id="lxUcPlex"></div></section><section class="lx-uc-panel"><div class="lx-uc-heading"><div><h2>Link Health</h2><p>Verifique as fontes sem remover títulos do catálogo.</p></div><button type="button" data-uc-health>Verificar próximo lote</button></div><div id="lxUcHealth"></div></section><section class="lx-uc-panel"><div class="lx-uc-heading"><h2>Edição em massa</h2><button type="button" data-uc-bulk-publish>Publicar selecionados</button><button type="button" data-uc-bulk-draft>Salvar como rascunho</button></div><label>Buscar itens<input id="lxUcAdminQuery" placeholder="Nome do título"></label><button type="button" data-uc-admin-search>Buscar</button><div id="lxUcAdminResults"></div></section>`;
    try{const data=await invoke('dashboard');if(!m.contains($('lxUcDashboard')))return;
      $('lxUcDashboard').innerHTML=`<div class="lx-uc-stats">${Object.entries(singular).filter(([k])=>k!=='user'&&k!=='live').map(([k,label])=>`<div><b>${Number(data.counts?.[k])||0}</b><span>${label}</span></div>`).join('')}${[['Episódios',data.episodes],['Erros de importação',data.import_errors],['Com reprodução',data.with_playback],['Somente catálogo',data.metadata_only],['Sem capa',data.missing_cover],['Sem metadados',data.missing_metadata],['Links offline',data.offline]].map(([k,v])=>`<div><b>${Number(v)||0}</b><span>${k}</span></div>`).join('')}</div><p class="lx-uc-notice">${Object.entries(data.providers||{}).filter(([k])=>k!=='plex_scope').map(([k,v])=>esc(k)+': '+(v?'conectado':'aguardando configuração')).join(' · ')}</p><div class="lx-uc-jobs">${(data.jobs||[]).map(j=>`<button type="button" data-uc-job="${esc(j.id)}">${j.provider==='plex'?'Plex':'Importação'} · ${j.total} itens · ${esc(j.status)}</button>`).join('')}</div>`;
      const p=data.plex;state.plexHasMore=false;$('lxUcPlex').innerHTML=`<p>Última sincronização: ${p?.last_sync_at?new Date(p.last_sync_at).toLocaleString('pt-BR'):'ainda não realizada'}</p><div class="lx-uc-stats">${[['Filmes encontrados',p?.stats?.movies],['Séries encontradas',p?.stats?.series],['Novos',p?.stats?.new],['Atualizados',p?.stats?.updated],['Duplicados',p?.stats?.duplicates],['Ignorados',p?.stats?.ignored],['Erros',p?.stats?.errors],['Fontes reproduzíveis',p?.stats?.playable],['Somente catálogo',p?.stats?.catalog_only]].map(([k,v])=>`<div><b>${Number(v)||0}</b><span>${k}</span></div>`).join('')}</div><small>Escopo do parceiro: ${esc(data.providers?.plex_scope||'catalog')}. Os resultados de cada lote aparecem na fila.</small>`;
    }catch(e){if($('lxUcDashboard'))$('lxUcDashboard').innerHTML=`<p class="lx-uc-notice">${esc(message(e))}</p>`;}
  }
  async function preview(){const box=$('lxUcPreview');if(!box)return;box.innerHTML='<p>Buscando metadados…</p>';
    try{const ref=$('lxUcImportUrl').value.trim(),d=await invoke('preview',{reference:ref});state.previewRef=ref;state.previewPlex=d.plex_url||'';
      if(d.needs_selection){state.previewCandidates=d.candidates||[];box.innerHTML=`<p>Selecione o título correspondente à página Plex:</p><div class="lx-uc-grid">${state.previewCandidates.map((r,i)=>card(r,i,'candidate')).join('')}</div>`;return;}
      const x=d.item||d;state.previewItem=x;box.innerHTML=`<div class="lx-uc-preview">${image(x.cover)?`<img src="${esc(image(x.cover))}" alt="Capa">`:''}<div><h3>${esc(x.title||'Item já importado')}</h3><p>${esc(singular[x.kind]||'Catálogo')} · ${esc(x.year||'')}</p><p>Metadados: ✓<br>Imagem: ${x.cover?'✓':'⚠ Não encontrada'}<br>TMDB: ${x.external_ids?.some(i=>i.provider==='tmdb')?'✓':'—'}<br>Fonte de reprodução: ${d.availability?.some(i=>i.playable)?'✓ Cadastrada':'⚠ Não encontrada'}</p><button type="button" data-uc-import class="primary-btn">Importar como rascunho</button></div></div>`;
    }catch(e){box.innerHTML=`<p>${esc(message(e))}</p>`;}}
  async function importPreview(){try{const data=await invoke('import',{reference:state.previewRef,plex_url:state.previewPlex,published:false});LX.toast?.(data.duplicate?'Item já existente.':'Metadados importados.');state.detail={...data,resolved:{status:'external'}};modal(detailHtml(state.detail));}catch(e){LX.toast?.(message(e));}}
  async function parseBatch(raw,format){
    // The server revalidates every reference and records invalid rows as errors in the queue.
    const {parseImportText}=await import('./supabase/functions/_shared/universal-core.mjs');return parseImportText(raw,format);
  }
  async function enqueue(){try{let refs=await parseBatch($('lxUcBatchText').value,$('lxUcBatchFormat').value);const files=[...($('lxUcBatchFile').files||[]),...($('lxUcBatchFolder').files||[])];
      let bytes=0;for(const file of files){if(!/\.(csv|json|txt)$/i.test(file.name))continue;bytes+=file.size;if(bytes>2000000)throw new Error('IMPORT_TOO_LARGE');const format=/\.json$/i.test(file.name)?'json':/\.csv$/i.test(file.name)?'csv':'lines';refs.push(...await parseBatch(await file.text(),format));}
      if(!refs.length||refs.length>2000)return LX.toast?.('Use de 1 a 2.000 referências por fila.');
      const d=await invoke('enqueue',{references:refs,published:$('lxUcBatchPublish').checked});state.job=d.job_id;runJob();
    }catch(e){LX.toast?.(message(e));}}
  async function runJob(action='process'){if(!state.job)return;const id=state.job,box=$('lxUcJob');if(!box)return;clearTimeout(state.jobTimer);
    try{const data=await invoke(action,{job_id:id});if(state.job!==id||!$('lxUcJob'))return;state.jobData=data;
      const status={queued:'Na fila',processing:'Processando',completed:'Concluído',duplicate:'Duplicado',error:'Erro',ignored:'Ignorado',rolled_back:'Rollback concluído'};
      $('lxUcJob').innerHTML=`<div class="lx-uc-job"><b>${status[data.job?.status]||data.job?.status} · ${data.job?.total||0} itens</b><p>Mostrando as primeiras 50 entradas. A fila completa permanece no servidor.</p><ul>${(data.entries||[]).map(e=>`<li><span>${esc(typeof e.reference==='string'?e.reference:JSON.stringify(e.reference))}</span><b>${esc(status[e.status]||e.status)}</b>${e.last_error?`<small>${esc(errors[e.last_error]||e.last_error)}</small>`:''}</li>`).join('')}</ul>${data.job?.status==='error'?'<button type="button" data-uc-retry>Tentar erros novamente</button>':''}${['completed','error'].includes(data.job?.status)?'<button type="button" data-uc-rollback>Rollback dos itens criados por esta fila</button>':''}${['queued','processing'].includes(data.job?.status)?'<button type="button" data-uc-process>Processar próximo lote</button>':''}</div>`;
      if(['queued','processing'].includes(data.job?.status)&&LX.ui.state.adminPage==='contenthub')state.jobTimer=setTimeout(()=>runJob(),3000);
    }catch(e){if(box.isConnected)box.innerHTML=`<p>${esc(message(e))}</p><button type="button" data-uc-process>Retomar fila</button>`;}}
  async function sourcePanel(){const d=state.detail;if(!d)return;state.sourceDetail=d;
    const sources=await invoke('sources',{media_id:d.item.id});
    modal(`<section class="lx-uc-source-form lx-uc-panel"><h2>Fontes de ${esc(d.item.title)}</h2><ul>${(sources.sources||[]).map(s=>`<li>${esc(s.provider)} · ${esc(s.source_type)} · ${esc(s.resolution)} · ${esc(s.status)} ${esc(s.last_error||'')}</li>`).join('')||'<li>Nenhuma fonte cadastrada.</li>'}</ul><label>Tipo<select id="lxUcSourceType"><option value="direct">URL direta autorizada</option><option value="hls">HLS autorizado</option><option value="dash">DASH autorizado</option><option value="storage">Arquivo LX Storage</option><option value="external">Página externa</option><option value="embed">Provedor oficial</option></select></label><label>URL autorizada<input id="lxUcSourceUrl" type="url" placeholder="https://servidor-autorizado/arquivo.mp4"></label><label>Ou enviar arquivo ao Storage privado<input id="lxUcSourceFile" type="file" accept="video/*,audio/*,.pdf,.epub"></label><label>Resolução/qualidade<input id="lxUcSourceQuality" placeholder="1080p, 4K, MP3 320 kbps"></label>${d.seasons?.length?`<label>Episódio<select id="lxUcSourceEpisode"><option value="">Selecione um episódio</option>${(state.episodes||[]).map(e=>`<option value="${esc(e.id)}">${e.number}. ${esc(e.title)}</option>`).join('')}</select></label>`:''}<label>Autorização e origem<textarea id="lxUcAuthorization" rows="3" placeholder="Arquivo do proprietário ou referência da licença/permissão"></textarea></label><label class="lx-uc-check"><input type="checkbox" id="lxUcAuthorized">Confirmo que esta fonte é autorizada para reprodução no LX Plus</label><button type="button" class="primary-btn" data-uc-attach>Adicionar fonte</button><button type="button" data-uc-detail-back>Voltar à ficha</button><p id="lxUcSourceStatus" role="status"></p></section>`);
  }
  async function attach(){const status=$('lxUcSourceStatus');let uploadedPath='';const mediaId=state.detail?.item.id;try{
    if(!$('lxUcAuthorized').checked)return LX.toast?.('Confirme a autorização de reprodução.');
    const source={source_type:$('lxUcSourceType').value,url:$('lxUcSourceUrl').value,authorized:true,authorization_note:$('lxUcAuthorization').value,drm:'none',resolution:$('lxUcSourceQuality').value,episode_id:$('lxUcSourceEpisode')?.value||null};
    const file=$('lxUcSourceFile').files[0];if(file){if(source.authorization_note.trim().length<5)return LX.toast?.('Informe a origem e a autorização.');status.textContent='Enviando ao Storage…';const path=user().id+'/universal/'+state.detail.item.id+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^\w.-]/g,'_');const uploaded=await db().storage.from('lx-media').upload(path,file,{upsert:false});if(uploaded.error)throw uploaded.error;source.source_type='storage';source.storage_bucket='lx-media';source.storage_path=path;uploadedPath=path;}
    status.textContent='Salvando fonte…';await invoke('attach',{media_id:mediaId,source});uploadedPath='';status.textContent='Fonte cadastrada. A reprodução será verificada pelo resolver.';
  }catch(e){if(uploadedPath)await db().storage.from('lx-media').remove([uploadedPath]).catch(()=>{});if(status)status.textContent=message(e);}}
  document.addEventListener('change',e=>{if(e.target.id==='lxUcSeason')loadSeason(Number(e.target.value));});
  document.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;const a=b.dataset;
    try{
      if(a.ucClose!==undefined){state.detailSequence++;LX.ui.close();}
      else if(a.ucCollection!==undefined)await playlistPanel();
      else if(a.ucPlaylistSave!==undefined)await savePlaylist();
      else if(a.ucPlaylist){await open(state.playlistRows[Number(a.ucPlaylist)]);}
      else if(a.ucFilter){state.filter=a.ucFilter;state.page=0;renderSearch(state.q);}
      else if(a.ucNext!==undefined){if(((state.window||0)+1)*60<state.rows.length){state.window=(state.window||0)+1;drawSearch(state.lastPayload);}else{state.page++;renderSearch(state.q);}}
      else if(a.ucPrev!==undefined){if(state.window){state.window--;drawSearch(state.lastPayload);}else{state.page=Math.max(0,state.page-1);renderSearch(state.q);}}
      else if(a.ucResult!==undefined)open(state.displayRows[Number(a.ucResult)]);
      else if(a.ucHome!==undefined)open(state.homeRows[Number(a.ucHome)]);
      else if(a.ucRelated!==undefined)open(state.related[Number(a.ucRelated)]);
      else if(a.ucPlay!==undefined)play();
      else if(a.ucEpisode!==undefined)play(state.episodes[Number(a.ucEpisode)]);
      else if(a.ucTrack)open({external_ids:[{provider:'musicbrainz',namespace:'recording',external_id:a.ucTrack}]});
      else if(a.ucSave!==undefined)await reaction('saved');
      else if(a.ucLike!==undefined)await reaction('like');
      else if(a.ucShare!==undefined)await share();
      else if(a.ucRestore!==undefined){await invoke('bulk_edit',{ids:[state.detail.item.id],patch:{archived:false,published:false}});await open({id:state.detail.item.id});}
      else if(a.ucSource!==undefined)await sourcePanel();
      else if(a.ucAttach!==undefined)await attach();
      else if(a.ucDetailBack!==undefined)open(state.detail.item);
      else if(a.ucReopen!==undefined)open(state.failedRow);
      else if(a.ucPreview!==undefined)await preview();
      else if(a.ucImport!==undefined)await importPreview();
      else if(a.ucCandidate!==undefined){const row=state.previewCandidates[Number(a.ucCandidate)];state.previewRef=reference(row);state.previewItem=row;$('lxUcPreview').innerHTML=`<div class="lx-uc-preview">${image(row.cover)?`<img src="${esc(image(row.cover))}" alt="Capa">`:''}<div><h3>${esc(row.title)}</h3><p>Metadados: ✓ · Fonte: Assistir no Plex</p><button type="button" data-uc-import>Importar com esta correspondência</button></div></div>`;}
      else if(a.ucEnqueue!==undefined)await enqueue();
      else if(a.ucJob){state.job=a.ucJob;await runJob('job');$('lxUcJob')?.scrollIntoView({block:'nearest'});}
      else if(a.ucProcess!==undefined)await runJob();
      else if(a.ucRetry!==undefined){await invoke('retry',{job_id:state.job});await runJob();}
      else if(a.ucRollback!==undefined){const result=await invoke('rollback',{job_id:state.job});LX.toast?.(`${result.rolled_back} itens revertidos; ${result.preserved} preservados por alterações ou uso posterior.`);await runJob('job');}
      else if(a.ucPlex!==undefined){b.disabled=true;const data=await invoke('plex_sync');state.plexHasMore=data.hasMore;$('lxUcPlex').insertAdjacentHTML('beforeend',`<p>Encontrados ${data.stats.movies} filmes e ${data.stats.series} séries. ${data.hasMore?'Clique em Sincronizar para a próxima página.':'Página final do feed.'}</p>`);if(data.job_id){state.job=data.job_id;await runJob();}b.disabled=false;}
      else if(a.ucHealth!==undefined){b.disabled=true;const data=await invoke('health');$('lxUcHealth').innerHTML=(data.sources||[]).map(s=>`<p>${esc(s.id.slice(0,8))} · ${esc(s.status.toUpperCase())} · ${s.latency_ms} ms ${esc(s.last_error||'')}</p>`).join('')||'<p>Nenhuma fonte cadastrada.</p>';b.disabled=false;}
      else if(a.ucAdminSearch!==undefined){const d=await invoke('search',{q:$('lxUcAdminQuery').value,filter:'all',page:0});state.adminRows=(d.items||[]).filter(r=>r.id&&!r.playlist_id&&r.kind!=='user');$('lxUcAdminResults').innerHTML=state.adminRows.map((r,i)=>`<label class="lx-uc-check"><input type="checkbox" data-uc-select="${i}">${esc(r.title)} · ${esc(singular[r.kind])}</label>`).join('');}
      else if(a.ucBulkPublish!==undefined||a.ucBulkDraft!==undefined){const ids=[...document.querySelectorAll('[data-uc-select]:checked')].map(i=>state.adminRows[Number(i.dataset.ucSelect)]?.id);const d=await invoke('bulk_edit',{ids,patch:{published:a.ucBulkPublish!==undefined}});LX.toast?.(`${d.items?.length||0} itens atualizados.`);}
    }catch(error){b.disabled=false;LX.toast?.(message(error));}
  });
  function boot(){
    if(!LX.ui||!LX.data)return;
    const catalog=LX.data.catalog;LX.data.catalog=()=>[...catalog(),...transient.values()];const saveCatalog=LX.data.saveCatalog;LX.data.saveCatalog=rows=>saveCatalog(rows.filter(x=>!x?.ucMediaId));
    const render=LX.ui.renderApp;LX.ui.renderApp=function(...args){const result=render.apply(this,args);onRender();return result;};
    const search=$('searchInput');if(search){search.placeholder='Filmes, séries, música, livros e pessoas…';search.oninput=e=>{LX.ui.state.query=e.target.value.trim();state.page=0;if(LX.ui.state.query)renderSearch(LX.ui.state.query);else LX.ui.renderApp();};}
    const close=LX.ui.close;LX.ui.close=function(...args){state.detailSequence++;return close.apply(this,args);};
    document.addEventListener('visibilitychange',()=>{if(document.hidden)state.flushProgress?.();});
    const id=new URL(location.href).searchParams.get('media');if(id&&/^[a-f0-9-]{36}$/.test(id)){const interval=setInterval(()=>{if(LX.ui.state.screen==='app'){clearInterval(interval);open({id});}},1000);setTimeout(()=>clearInterval(interval),60000);}
  }
  LX.universal={version:1,invoke,renderSearch,onRender,open,play,renderAdmin,card,detailHtml,merge,local,state};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
