import {db,itemFrom,sourceFor,saveUserField} from '../data.js';
import {catalogPage,readPlaylists,playlistItems} from '../services.js';
import {esc,https,duration,empty,checked,debounce,icon} from '../ui.js';

export async function mount(host,ctx){
 let alive=true,tab=ctx.page==='Playlists'?'Playlists':'Início',items=[],total=0,playlists=[],selected=null,term='',loading=false,liked=new Set((ctx.state().musicLikes||[]).map(String)),generation=0,referenceOffset=0;
 const nowItems=()=>items;
 function header(){return '<section class="music-hero"><div><span class="premium-overline">LX MUSIC</span><h1>Seu ritmo.<br><em>Sua trilha.</em></h1><p>O que você gosta de ouvir, em um lugar só.</p><div class="actions"><button class="btn music-primary" data-music-play-all>'+icon('play')+' Reproduzir seleção</button><button class="btn" data-new-playlist>+ Criar playlist</button></div></div><div class="music-art"><div class="vinyl-record"><span>LX<span>MUSIC</span></span></div><div class="music-wave">♫</div></div></section>'}
 function track(row,index){return '<div class="track-row"><button class="track-play" data-track="'+esc(row.id)+'" aria-label="Ouvir '+esc(row.title)+'">'+(index+1)+'<span>▶</span></button><button class="track-info" data-track="'+esc(row.id)+'">'+(https(row.cover)?'<img loading="lazy" src="'+esc(row.cover)+'" alt="">':'<span class="track-cover-fallback">♫</span>')+'<span><strong>'+esc(row.title)+'</strong><small>'+esc(row.artist||'Artista não informado')+'</small></span></button><span class="track-album">'+esc(row.album||row.genre||'Single')+'</span><span class="track-duration">'+(row.duration?duration(row.duration):'—')+'</span><button class="track-heart '+(liked.has(String(row.id))?'active':'')+'" data-music-like="'+esc(row.id)+'" aria-label="'+(liked.has(String(row.id))?'Descurtir':'Curtir')+' '+esc(row.title)+'">♡</button><details class="track-options"><summary aria-label="Mais opções para '+esc(row.title)+'">•••</summary><div><button data-enqueue="'+esc(row.id)+'">Adicionar à fila</button><button data-add-playlist="'+esc(row.id)+'">Adicionar à playlist</button><button data-lyrics="'+esc(row.id)+'">Ver letras disponíveis</button></div></details></div>'}
 function draw(){
  if(!alive)return;
  const tabs=['Início','Playlists','Álbuns','Artistas','Curtidas','Recentes'];
  let visible=items;
  if(tab==='Curtidas')visible=items.filter(x=>liked.has(String(x.id)));
  if(tab==='Recentes'){const history=ctx.state().musicHistory||{};visible=[...items].filter(x=>history[String(x.id)]).sort((a,b)=>String(history[b.id]).localeCompare(String(history[a.id])))}
  let body='';
  if(tab==='Playlists'&&!selected){body='<div class="collection-grid">'+playlists.map(p=>'<button class="collection-card" data-playlist="'+esc(p.id)+'"><span class="collection-cover">'+icon('music')+'</span><strong>'+esc(p.name)+'</strong><small>'+p.tracks.length+' faixas · '+(p.visibility==='private'?'Privada':'Pública')+'</small></button>').join('')+'</div>';if(!playlists.length)body=empty('Sua próxima playlist começa aqui','Crie uma seleção com suas músicas favoritas.','<button class="btn music-primary" data-new-playlist>Criar playlist</button>')}
  else if(tab==='Álbuns'||tab==='Artistas'){
   const key=tab==='Álbuns'?'album':'artist',groups=[...new Set(items.map(t=>t[key]).filter(Boolean))];
   body='<div class="collection-grid">'+groups.map(name=>{const rows=items.filter(x=>x[key]===name),cover=https(rows.find(x=>x.cover)?.cover);return '<button class="collection-card" data-music-group="'+esc(name)+'" data-group-key="'+key+'"><span class="collection-cover '+(key==='artist'?'round':'')+'">'+(cover?'<img src="'+esc(cover)+'" alt="" loading="lazy">':icon('music'))+'</span><strong>'+esc(name)+'</strong><small>'+rows.length+' faixas nesta seleção</small></button>'}).join('')+'</div>';
   if(!groups.length)body=empty('Ainda não há '+tab.toLowerCase()+' nesta seleção','Eles aparecem conforme os metadados das músicas são cadastrados.');
  }else body=visible.length?'<div class="track-table"><div class="track-table-head"><span>#</span><span>FAIXA / ARTISTA</span><span>ÁLBUM</span><span>TEMPO</span></div>'+visible.map(track).join('')+'</div>':empty(loading?'Buscando suas músicas…':'Sem músicas por aqui',loading?'A biblioteca está sincronizando.':'Quando músicas forem publicadas, você poderá ouvi-las e organizar suas playlists.');
  host.innerHTML=(tab==='Início'?header():'<div class="module-heading"><span class="premium-overline">SUA BIBLIOTECA · LX MUSIC</span><h1>'+esc(selected?.name||tab)+'</h1></div>')+'<div class="section-tabs">'+tabs.map(t=>'<button class="'+(tab===t?'active':'')+'" data-music-tab="'+t+'">'+t+'</button>').join('')+'</div><div class="module-toolbar"><div><h2>'+esc(selected?.name||({Início:'Descubra seu próximo som',Recentes:'Ouvidas recentemente'}[tab]||tab))+'</h2><small>'+total+' faixas na consulta'+(selected?' · Playlist '+(selected.visibility==='private'?'privada':'pública'):'')+'</small></div><input id="musicSearch" class="search" placeholder="Pesquisar faixas" aria-label="Pesquisar músicas" value="'+esc(term)+'"></div>'+body+((tab==='Curtidas'||tab==='Recentes'?total>referenceOffset:total>items.length)&&!selected&&['Início','Álbuns','Artistas','Curtidas','Recentes'].includes(tab)?'<button class="btn load-more" data-more-tracks '+(loading?'disabled':'')+'>Carregar mais músicas</button>':'')+'<div id="musicDialog"></div>';
 }
 async function load(append=false){
  if(loading)return;loading=true;const token=++generation;
  try{let result;if(['Curtidas','Recentes'].includes(tab)){const history=ctx.state().musicHistory||{},ids=tab==='Curtidas'?[...liked]:Object.keys(history).sort((a,b)=>String(history[b]).localeCompare(String(history[a]))),start=append?referenceOffset:0,rows=ids.length?await checked(db.from('lx_catalog').select('id,payload,published').in('id',ids.slice(start,start+60)).eq('published',true).eq('payload->>type','Música')):[],order=new Map(ids.map((id,i)=>[String(id),i]));referenceOffset=start+60;result={items:(rows||[]).map(itemFrom).filter(x=>!term||[x.title,x.artist].join(' ').toLowerCase().includes(term.toLowerCase())).sort((a,b)=>order.get(String(a.id))-order.get(String(b.id))),total:ids.length}}else result=await catalogPage({types:['Música'],term,offset:append?items.length:0,limit:60});if(!alive||token!==generation)return;items=append?[...items,...result.items]:result.items;total=result.total;draw()}
  catch(e){if(alive)ctx.toast(e.message||'Não foi possível carregar a biblioteca.')}finally{loading=false;if(alive)host.querySelector('[data-more-tracks]')?.removeAttribute('disabled')}
 }
 async function syncLists(){playlists=await readPlaylists(ctx.user.id)}
 function dialog(title,content){host.querySelector('#musicDialog').innerHTML='<div class="inline-dialog" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="panel"><div class="heading"><h2>'+esc(title)+'</h2><button class="close" data-music-dialog-close aria-label="Fechar">×</button></div>'+content+'</div></div>';host.querySelector('#musicDialog input,#musicDialog select')?.focus()}
 async function play(item,queue=items){if(!item)return;try{const source=await sourceFor(item);await ctx.music.open(item,source,queue)}catch(e){ctx.toast(e.message||'A fonte desta faixa não está disponível.')}}
 const search=debounce(value=>{term=value;selected=null;load()},300);
 host.addEventListener('input',e=>{if(e.target.id==='musicSearch')search(e.target.value)});
 host.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
   if(b.dataset.musicTab){tab=b.dataset.musicTab;selected=null;await load();draw();return}
   if(b.hasAttribute('data-more-tracks')){await load(true);return}
   if(b.dataset.track){await play(items.find(x=>String(x.id)===b.dataset.track));return}
   if(b.hasAttribute('data-music-play-all')){await play(items[0]);return}
   if(b.dataset.musicGroup){const group=items.filter(x=>x[b.dataset.groupKey]===b.dataset.musicGroup);await play(group[0],group);return}
   if(b.dataset.playlist){selected=playlists.find(p=>p.id===b.dataset.playlist);items=await playlistItems(selected.id);total=items.length;draw();return}
   if(b.dataset.musicLike){const before=new Set(liked),key=b.dataset.musicLike;liked.has(key)?liked.delete(key):liked.add(key);draw();try{const state=await saveUserField(ctx.user.id,'musicLikes',[...liked]);ctx.setState(state)}catch(e){liked=before;draw();throw e}return}
   if(b.dataset.enqueue){const item=items.find(x=>String(x.id)===b.dataset.enqueue);if(!ctx.music.current){await play(item,[item])}else{ctx.music.queue.add(item);ctx.music.renderQueue();ctx.toast('Música adicionada à fila.')}return}
   if(b.hasAttribute('data-new-playlist')){dialog('Criar playlist','<form id="newPlaylist" class="form"><label class="field">Nome<input name="name" maxlength="100" required></label><label class="field">Descrição<textarea name="description" maxlength="500"></textarea></label><label class="field">Visibilidade<select name="visibility"><option value="private">Só eu</option><option value="public">Membros da LX Plus</option></select></label><button class="btn music-primary">Criar playlist</button></form>');return}
   if(b.dataset.addPlaylist){if(!playlists.length){ctx.toast('Crie uma playlist primeiro.');return}dialog('Adicionar à playlist','<form id="addPlaylist" class="form"><input type="hidden" name="track" value="'+esc(b.dataset.addPlaylist)+'"><label class="field">Playlist<select name="playlist">'+playlists.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></label><button class="btn music-primary">Adicionar música</button></form>');return}
   if(b.dataset.lyrics){const item=items.find(x=>String(x.id)===b.dataset.lyrics);dialog('Letra · '+item.title,item.lyrics&&item.lyricsAuthorized?'<div class="lyrics">'+esc(item.lyrics)+'</div>':'<p>Ainda não há letra de uma fonte autorizada para esta faixa.</p>');return}
   if(b.hasAttribute('data-music-dialog-close'))host.querySelector('#musicDialog').replaceChildren();
  }catch(error){ctx.toast(error.message||'Não foi possível concluir a ação.')}
 });
 host.addEventListener('submit',async e=>{
  if(!['newPlaylist','addPlaylist'].includes(e.target.id))return;e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;const data=Object.fromEntries(new FormData(f));
  try{if(f.id==='newPlaylist')await checked(db.from('lx_playlists').insert({owner_id:ctx.user.id,name:String(data.name).trim(),description:data.description,visibility:data.visibility}));else{const selectedList=playlists.find(p=>p.id===data.playlist);await checked(db.from('lx_playlist_tracks').upsert({playlist_id:data.playlist,track_id:Number(data.track),position:selectedList?.tracks.length||0},{onConflict:'playlist_id,track_id',ignoreDuplicates:true}))}await syncLists();draw();ctx.toast(f.id==='newPlaylist'?'Playlist criada.':'Faixa adicionada à playlist.')}
  catch(error){ctx.toast(error.message||'Não foi possível salvar.');b.disabled=false}
 });
 draw();await Promise.all([load(),syncLists().catch(e=>ctx.toast(e.message))]);draw();
 return {refresh:()=>load(),destroy(){alive=false;++generation;search.cancel()}};
}
