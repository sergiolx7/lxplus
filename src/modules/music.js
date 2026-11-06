import {musicMix} from '../music-discovery.js';
import {musicGroups} from '../music-organize.js';
import {listeningSummary} from '../music-friend-activity.js';
import {musicSidebar,musicHomeShelves,friendListeningShelf,musicGroupHeading,musicTabs} from '../music-experience.js';
import {referenceMusicPage,completeMusicGroup,musicSuggestions,findMusicActionTrack} from '../music-library.js';
import {musicViewControls} from '../display-preferences.js';
import {catalogFilter,fold} from '../catalog-search.js';
import {db,itemFrom,saveUserField} from '../data.js';
import {catalogPage,readPlaylists,playlistItems} from '../services.js';
import {esc,https,duration,empty,checked,icon} from '../ui.js';

export async function mount(host,ctx){
 let alive=true,tab=ctx.page==='Playlists'?'Playlists':'Início',items=[],total=0,playlists=[],selected=null,term='',loading=false,liked=new Set((ctx.state().musicLikes||[]).map(String)),generation=0,referenceOffset=0,recap=null,month=new Date().toLocaleDateString('sv-SE').slice(0,7),loadError='',searchTimer=null,groupGeneration=0,groupSelection=null,groupTracks=[],friendsPlaying=[],friendsTimer=null;
 const nowItems=()=>items;
 function header(){return '<section class="music-hero"><div><span class="premium-overline">LX MUSIC</span><h1>Seu ritmo.<br><em>Sua trilha.</em></h1><p>O que você gosta de ouvir, em um lugar só.</p><div class="actions"><button class="btn music-primary" data-music-play-all>'+icon('play')+' Reproduzir seleção</button><button class="btn" data-new-playlist>+ Criar playlist</button></div></div><div class="music-art"><div class="vinyl-record"><span>LX<span>MUSIC</span></span></div><div class="music-wave">♫</div></div></section>'}
 function quickTracks(){const history=ctx.state().musicHistory||{},rows=[...items].sort((a,b)=>String(history[b.id]||'').localeCompare(String(history[a.id]||''))).slice(0,6);return rows.length?'<div class="music-quick-grid" aria-label="Sua biblioteca em um toque">'+rows.map(row=>'<button class="music-quick-track" data-track="'+esc(row.id)+'">'+(https(row.cover)?'<img src="'+esc(row.cover)+'" alt="" loading="lazy">':'<span>'+icon('music')+'</span>')+'<span><strong>'+esc(row.title)+'</strong><small>'+esc(row.artist||'LX Music')+'</small></span></button>').join('')+'</div>':''}
 function track(row,index){return '<div class="track-row"><button class="track-play" data-track="'+esc(row.id)+'" aria-label="Ouvir '+esc(row.title)+'">'+(index+1)+'<span>▶</span></button><button class="track-info" data-track="'+esc(row.id)+'">'+(https(row.cover)?'<img loading="lazy" src="'+esc(row.cover)+'" alt="">':'<span class="track-cover-fallback">♫</span>')+'<span><strong>'+esc(row.title)+'</strong><small>'+esc(row.artist||'Artista não informado')+'</small></span></button><span class="track-album">'+esc(row.album||row.genre||'Single')+'</span><span class="track-duration">'+(row.duration?duration(row.duration):'—')+'</span><button class="track-heart '+(liked.has(String(row.id))?'active':'')+'" data-music-like="'+esc(row.id)+'" aria-label="'+(liked.has(String(row.id))?'Descurtir':'Curtir')+' '+esc(row.title)+'">♡</button><details class="track-options"><summary aria-label="Mais opções para '+esc(row.title)+'">•••</summary><div><button data-enqueue="'+esc(row.id)+'">Adicionar à fila</button><button data-add-playlist="'+esc(row.id)+'">Adicionar à playlist</button><button data-lyrics="'+esc(row.id)+'">Ver letras disponíveis</button></div></details></div>'}
 function draw(){
  if(!alive)return;
  const tabs=musicTabs;
  const focused=host.querySelector('#musicSearch')===document.activeElement,selection=focused?host.querySelector('#musicSearch').selectionStart:null;
  let visible=items;
  if(tab==='Curtidas')visible=items.filter(x=>liked.has(String(x.id)));
  if(tab==='Recentes'){const history=ctx.state().musicHistory||{};visible=[...items].filter(x=>history[String(x.id)]).sort((a,b)=>String(history[b.id]).localeCompare(String(history[a.id])))}
  let body='';
  if(term&&selected)visible=visible.filter(x=>fold([x.title,x.artist,x.album,x.genre].join(' ')).includes(fold(term)));
  if(tab==='Mix')visible=musicMix(items,{likes:[...liked],history:ctx.state().musicHistory||{}});
  if(tab==='Retrospectiva'){body=recap&&!recap.private?'<section class="panel"><label class="field">Mês<input type="month" id="recapMonth" value="'+esc(month)+'"></label><div class="insight-grid">'+[[Math.floor((Number(recap.seconds)||0)/60),'minutos ouvidos'],[Number(recap.tracks)||0,'faixas diferentes'],[Number(recap.artists)||0,'artistas'],[Number(recap.days)||0,'dias com música']].map(([n,label])=>'<div><strong>'+n.toLocaleString('pt-BR')+'</strong><small>'+label+'</small></div>').join('')+'</div><h2>Seu top de músicas</h2>'+(recap.top_tracks||[]).map((t,i)=>'<p><strong>'+(i+1)+'. '+esc(t.title)+'</strong> · '+esc(t.artist)+' · '+Math.floor(t.seconds/60)+' min</p>').join('')+'<h2>Artistas mais ouvidos</h2>'+(recap.top_artists||[]).map(t=>'<p>'+esc(t.artist)+' · '+Math.floor(t.seconds/60)+' min</p>').join('')+'<p class="muted">Só o tempo registrado pela LX Plus aparece aqui. Incorporações de outros serviços não informam o tempo de reprodução.</p></section>':empty(loading?'Carregando retrospectiva…':'Retrospectiva indisponível','Não foi possível consultar suas estatísticas. Tente novamente.','<button class="btn" data-music-retry>Tentar novamente</button>')}
  else if(groupSelection){body=musicGroupHeading(groupSelection,groupTracks)+(groupTracks.length?'<div class="track-table"><div class="track-table-head"><span>#</span><span>FAIXA / ARTISTA</span><span>ÁLBUM</span><span>TEMPO</span></div>'+groupTracks.map(track).join('')+'</div>':empty('Nenhuma faixa disponível neste grupo','Confirme os metadados do catálogo.'))}
  else if(tab==='Playlists'&&!selected){body='<div class="collection-grid">'+playlists.filter(p=>!term||fold(p.name).includes(fold(term))).map(p=>'<button class="collection-card" data-playlist="'+esc(p.id)+'"><span class="collection-cover">'+icon('music')+'</span><strong>'+esc(p.name)+'</strong><small>'+p.tracks.length+' faixas · '+(p.visibility==='private'?'Privada':'Pública')+'</small></button>').join('')+'</div>';if(!playlists.length)body=empty('Sua próxima playlist começa aqui','Crie uma seleção com suas músicas favoritas.','<button class="btn music-primary" data-new-playlist>Criar playlist</button>')}
  else if(tab==='Álbuns'||tab==='Artistas'){
   const key=tab==='Álbuns'?'album':'artist',groups=musicGroups(items,key);
   body='<div class="collection-grid lx-music-album-grid">'+groups.map(group=>{const cover=https(group.cover);return '<button class="collection-card lx-music-album-tile" data-music-group="'+esc(group.name)+'" data-group-key="'+key+'" data-group-artist="'+esc(group.artist)+'"><span class="collection-cover lx-music-album-art '+(key==='artist'?'is-artist':'')+'">'+(cover?'<img src="'+esc(group.cover)+'" alt="" loading="lazy">':icon('music'))+'</span><strong>'+esc(group.name)+'</strong><small>'+(key==='album'?esc(group.artist)+' · ':'')+group.count+' faixas</small></button>'}).join('')+'</div>';
   if(!groups.length)body=empty('Ainda não há '+tab.toLowerCase()+' nesta seleção','Eles aparecem conforme os metadados das músicas são cadastrados.');
  }else body=visible.length?'<div class="track-table"><div class="track-table-head"><span>#</span><span>FAIXA / ARTISTA</span><span>ÁLBUM</span><span>TEMPO</span></div>'+visible.map(track).join('')+'</div>':empty(loading?'Buscando suas músicas…':'Sem músicas por aqui',loading?'A biblioteca está sincronizando.':'Quando músicas forem publicadas, você poderá ouvi-las e organizar suas playlists.');
  host.innerHTML='<div class="lx-music-studio">'+musicSidebar({active:tab,playlists})+'<div class="lx-music-main">'+(tab==='Início'&&!term&&!groupSelection?header()+quickTracks()+musicHomeShelves(items,ctx.state().musicHistory||{},[...liked])+friendListeningShelf(friendsPlaying)+'<div class="music-discovery-actions"><button class="btn" data-music-tab="Mix">✦ Seu LX Mix</button><button class="btn" data-music-flow>∞ Descoberta contínua</button><button class="btn" data-music-tab="Retrospectiva">Sua retrospectiva</button></div>':'<div class="module-heading"><span class="premium-overline">SUA BIBLIOTECA · LX MUSIC</span><h1>'+esc(selected?.name||(term?'Sua busca musical':tab))+'</h1></div>')+'<div class="section-tabs">'+tabs.map(t=>'<button class="'+(tab===t?'active':'')+'" data-music-tab="'+t+'">'+t+'</button>').join('')+'</div><div class="module-toolbar"><div><h2>'+esc(selected?.name||({Início:'Descubra seu próximo som',Recentes:'Ouvidas recentemente'}[tab]||tab))+'</h2><small>'+total+' faixas na consulta'+(selected?' · Playlist '+(selected.visibility==='private'?'privada':'pública'):'')+'</small></div><div class="music-search-tools"><input id="musicSearch" type="search" class="search" placeholder="Faixa, artista, álbum ou gênero" aria-label="Pesquisar músicas" value="'+esc(term)+'">'+musicViewControls()+'</div></div>'+(musicSuggestions(term,items).length?'<div class="music-suggestions" aria-label="Sugestões de pesquisa">'+musicSuggestions(term,items).map(q=>'<button type="button" data-music-suggestion="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div>':'')+(loadError?'<div class="panel" role="alert"><p>'+esc(loadError)+'</p><button class="btn" data-music-retry>Tentar novamente</button></div>':'')+body+((tab==='Curtidas'||tab==='Recentes'?total>referenceOffset:total>items.length)&&!selected&&['Início','Mix','Álbuns','Artistas','Curtidas','Recentes'].includes(tab)?'<button class="btn load-more" data-more-tracks '+(loading?'disabled':'')+'>Carregar mais músicas</button>':'')+'<div id="musicDialog"></div></div></div>';
  if(focused){const input=host.querySelector('#musicSearch');input?.focus();try{input?.setSelectionRange(selection,selection)}catch{}}
 }
 async function load(append=false){
  if(append&&loading)return;
  loading=true;loadError='';const token=++generation,requestedTab=tab,requestedTerm=term;draw();
  try{
   if(requestedTab==='Retrospectiva'){const result=await checked(db.rpc('lx_music_recap',{p_user:ctx.user.id,p_month:month+'-01'}));if(alive&&token===generation)recap=result;return}
   if(requestedTab==='Playlists'&&!selected)return;
   let result;
   if(['Curtidas','Recentes'].includes(requestedTab)){
    const history=ctx.state().musicHistory||{},ids=requestedTab==='Curtidas'?[...liked]:Object.keys(history).sort((a,b)=>String(history[b]).localeCompare(String(history[a]))),start=append?referenceOffset:0;
    result=await referenceMusicPage({ids,term:requestedTerm,offset:start,fetchRows:async(ids,term)=>{let q=db.from('lx_catalog').select('id,payload,published').in('id',ids).eq('published',true).eq('payload->>type','Música');if(term)q=q.or(catalogFilter(term));return (await checked(q)||[]).map(itemFrom)}});
    if(alive&&token===generation)referenceOffset=start+60;
   }else result=await catalogPage({types:['Música'],term:requestedTerm,offset:append?items.length:0,limit:60});
   if(!alive||token!==generation)return;
   const rows=append?[...items,...result.items]:result.items;items=[...new Map(rows.map(x=>[String(x.id),x])).values()];total=result.total;
  }catch(e){if(alive&&token===generation)loadError='Não foi possível carregar sua biblioteca. Verifique a conexão e tente novamente.'}
  finally{if(alive&&token===generation){loading=false;draw()}}
 }
 async function syncLists(){playlists=await readPlaylists(ctx.user.id)}
 async function refreshFriendsPlaying(){if(!alive||document.hidden)return;try{const result=await db.rpc('lx_presence_for_viewer');if(result.error||!alive)return;const directory=ctx.directory?.()||[],friends=new Map(directory.filter(x=>x.relation==='accepted').map(x=>[x.user_id,x]));friendsPlaying=(result.data||[]).filter(entry=>friends.has(entry.user_id)&&listeningSummary(entry)).map(activity=>({person:friends.get(activity.user_id),activity})).slice(0,8);if(tab==='Início'&&!selected&&!groupSelection)draw()}catch{/* Private by default when presence cannot be verified. */}}

 function actionTrack(id){return findMusicActionTrack(id,items,groupSelection?groupTracks:null)}
 function dialog(title,content){host.querySelector('#musicDialog').innerHTML='<div class="inline-dialog" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="panel"><div class="heading"><h2>'+esc(title)+'</h2><button class="close" data-music-dialog-close aria-label="Fechar">×</button></div>'+content+'</div></div>';host.querySelector('#musicDialog input,#musicDialog select')?.focus()}
 async function play(item,queue=items,flow=!(selected||groupSelection)){if(!item)return;try{await ctx.music.play(item,queue,{flow})}catch(e){ctx.toast(e.message||'A fonte desta faixa não está disponível.')}}
 const search=value=>{term=value;groupSelection=null;groupTracks=[];referenceOffset=0;++generation;++groupGeneration;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(!alive)return;if(selected)draw();else load()},300)};
 host.addEventListener('change',e=>{if(e.target.id==='recapMonth'&&/^\d{4}-\d{2}$/.test(e.target.value)){month=e.target.value;recap=null;load()}});
 host.addEventListener('input',e=>{if(e.target.id==='musicSearch')search(e.target.value)});
 host.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
   if(b.hasAttribute('data-music-retry')){await load();return}
   if(b.hasAttribute('data-music-flow')){const queue=musicMix(items,{likes:[...liked],history:ctx.state().musicHistory||{}});await play(queue[0],queue,true);return}
   if(b.dataset.musicTab){++groupGeneration;clearTimeout(searchTimer);tab=b.dataset.musicTab;selected=null;groupSelection=null;groupTracks=[];items=[];total=0;referenceOffset=0;await load();draw();return}
   if(b.hasAttribute('data-more-tracks')){await load(true);return}
   if(b.dataset.track){const list=groupSelection?groupTracks:items;await play(actionTrack(b.dataset.track),list);return}
   if(b.hasAttribute('data-music-play-all')){const queue=groupSelection?groupTracks:tab==='Mix'?musicMix(items,{likes:[...liked],history:ctx.state().musicHistory||{}}):items;await play(queue[0],queue);return}
   if(b.hasAttribute('data-music-group-back')){groupSelection=null;groupTracks=[];draw();return}
   if(b.hasAttribute('data-play-group')){await play(groupTracks[0],groupTracks);return}
   if(b.dataset.musicSuggestion){clearTimeout(searchTimer);term=b.dataset.musicSuggestion;selected=null;await load();return}
   if(b.dataset.musicGroup){const token=++groupGeneration;b.disabled=true;try{const group=await completeMusicGroup({field:b.dataset.groupKey,value:b.dataset.musicGroup,artist:b.dataset.groupArtist||'',page:catalogPage,isCurrent:()=>alive&&token===groupGeneration});if(alive&&token===groupGeneration){groupSelection={kind:b.dataset.groupKey,name:b.dataset.musicGroup,artist:b.dataset.groupArtist||''};groupTracks=group;draw()}}finally{if(b.isConnected)b.disabled=false}return}
   if(b.dataset.playlist){groupSelection=null;groupTracks=[];tab='Playlists';const token=++generation,list=playlists.find(p=>p.id===b.dataset.playlist);if(!list)return;const rows=await playlistItems(list.id);if(!alive||token!==generation)return;selected=list;loading=false;items=rows;total=items.length;draw();return}
   if(b.dataset.musicLike){const before=new Set(liked),key=b.dataset.musicLike;liked.has(key)?liked.delete(key):liked.add(key);draw();try{const state=await saveUserField(ctx.user.id,'musicLikes',[...liked]);ctx.setState(state,['musicLikes'])}catch(e){liked=before;draw();throw e}return}
   if(b.dataset.enqueue){const item=actionTrack(b.dataset.enqueue);if(!item){ctx.toast('Essa faixa não está mais disponível na seleção. Atualize a biblioteca.');return}if(!ctx.music.current){await play(item,[item])}else{ctx.music.queue.add(item);ctx.music.renderQueue();ctx.toast('Música adicionada à fila.')}return}
   if(b.hasAttribute('data-new-playlist')){dialog('Criar playlist','<form id="newPlaylist" class="form"><label class="field">Nome<input name="name" maxlength="100" required></label><label class="field">Descrição<textarea name="description" maxlength="500"></textarea></label><label class="field">Visibilidade<select name="visibility"><option value="private">Só eu</option><option value="public">Membros da LX Plus</option></select></label><button class="btn music-primary">Criar playlist</button></form>');return}
   if(b.dataset.addPlaylist){if(!playlists.length){ctx.toast('Crie uma playlist primeiro.');return}dialog('Adicionar à playlist','<form id="addPlaylist" class="form"><input type="hidden" name="track" value="'+esc(b.dataset.addPlaylist)+'"><label class="field">Playlist<select name="playlist">'+playlists.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></label><button class="btn music-primary">Adicionar música</button></form>');return}
   if(b.dataset.lyrics){const item=actionTrack(b.dataset.lyrics);if(!item){ctx.toast('Essa faixa não está mais disponível na seleção.');return}dialog('Letra · '+item.title,item.lyrics&&item.lyricsAuthorized?'<div class="lyrics">'+esc(item.lyrics)+'</div>':'<p>Ainda não há letra de uma fonte autorizada para esta faixa.</p>');return}
   if(b.hasAttribute('data-music-dialog-close'))host.querySelector('#musicDialog').replaceChildren();
  }catch(error){ctx.toast(error.message||'Não foi possível concluir a ação.')}
 });
 host.addEventListener('submit',async e=>{
  if(!['newPlaylist','addPlaylist'].includes(e.target.id))return;e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;const data=Object.fromEntries(new FormData(f));
  try{if(f.id==='newPlaylist')await checked(db.from('lx_playlists').insert({owner_id:ctx.user.id,name:String(data.name).trim(),description:data.description,visibility:data.visibility}));else{const selectedList=playlists.find(p=>p.id===data.playlist);await checked(db.from('lx_playlist_tracks').upsert({playlist_id:data.playlist,track_id:Number(data.track),position:selectedList?.tracks.length||0},{onConflict:'playlist_id,track_id',ignoreDuplicates:true}))}await syncLists();draw();ctx.toast(f.id==='newPlaylist'?'Playlist criada.':'Faixa adicionada à playlist.')}
  catch(error){ctx.toast(error.message||'Não foi possível salvar.');b.disabled=false}
 });
 draw();await Promise.all([load(),syncLists().catch(e=>ctx.toast(e.message))]);draw();refreshFriendsPlaying();friendsTimer=setInterval(()=>{if(alive&&tab==='Início')refreshFriendsPlaying()},18000);
 return {refresh:()=>load(),destroy(){alive=false;++generation;++groupGeneration;clearTimeout(searchTimer);clearInterval(friendsTimer)}};
}
