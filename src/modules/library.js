import {renderRanking} from '../ranking-ui.js';
import {db,itemFrom,getRanking,saveUserField} from '../data.js';
import {esc,empty,checked,https} from '../ui.js';
import {displaySizeControls} from '../display-preferences.js';
import {premiumCard} from '../premium-ui.js';
import {savedSelection,savedCategories,withoutSavedId} from '../library-view.js';
export async function mount(host,ctx){
 let alive=true,busy=false,category='Todos',term='',sort='saved',lastRemoved=null;
 const ids=(Array.isArray(ctx.state().list)?ctx.state().list:[]).map(String).filter(id=>/^\d+$/.test(id)),items=[];
 for(let i=0;i<ids.length;i+=100){const rows=await checked(db.from('lx_catalog').select('id,payload,published').in('id',ids.slice(i,i+100)).eq('published',true));if(!alive)return;items.push(...(rows||[]).map(itemFrom))}
 const savedIds=()=>Array.isArray(ctx.state().list)?ctx.state().list:[];
 function draw(){
  if(!alive)return;
  const selected=new Set(savedIds().map(String)),available=items.filter(item=>selected.has(String(item.id))),visible=savedSelection(available,{category,term,sort,ids:savedIds()});
  host.innerHTML='<div class="module-heading"><span class="premium-overline">SUA CURADORIA PESSOAL</span><h1>Minha lista.</h1><p>'+available.length+' títulos disponíveis · Seus próximos favoritos, em um só lugar.</p></div><div class="library-toolbar"><div class="section-tabs" aria-label="Filtrar sua lista">'+Object.keys(savedCategories).filter(key=>key==='Todos'||available.some(item=>savedCategories[key].includes(item.type))).map(key=>'<button type="button" data-saved-category="'+key+'" aria-pressed="'+(category===key)+'" class="'+(category===key?'active':'')+'">'+key+'</button>').join('')+'</div><input type="search" class="search" data-saved-search aria-label="Pesquisar na minha lista" placeholder="Encontre algo que você salvou…" value="'+esc(term)+'"></div>'+(lastRemoved?'<div class="notice" role="status"><p>'+esc(lastRemoved.title)+' foi removido da sua lista.</p><button class="btn small" data-saved-undo '+(busy?'disabled':'')+'>Desfazer</button></div>':'')+'<div class="catalog-browse-bar">'+displaySizeControls()+'<label class="catalog-sort">Ordenar<select data-saved-sort aria-label="Ordenar minha lista">'+[['saved','Ordem da sua lista'],['title','Título · A–Z'],['year','Ano · mais novos']].map(([key,label])=>'<option value="'+key+'" '+(sort===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label></div><div data-saved-results>'+results(visible)+'</div>';
 }
 function results(visible){return visible.length?'<div class="premium-grid">'+visible.map(item=>'<article class="library-card-wrap">'+premiumCard(item).replace('data-item=','data-library-item=')+'<button type="button" class="library-remove" data-saved-remove="'+esc(item.id)+'" aria-label="Remover '+esc(item.title)+' da minha lista" '+(busy?'disabled':'')+'>×</button></article>').join('')+'</div>':empty(term||category!=='Todos'?'Nada neste filtro.':'Suas próximas descobertas ficam aqui.',term||category!=='Todos'?'Tente outro título ou categoria.':'Salve filmes, séries e livros para encontrar depois.','<button type="button" class="btn" data-page="Filmes">Explorar cinema</button>')}
 function refreshResults(){const selected=new Set(savedIds().map(String));host.querySelector('[data-saved-results]').innerHTML=results(savedSelection(items.filter(item=>selected.has(String(item.id))),{category,term,sort,ids:savedIds()}))}
 async function save(next){const confirmed=await saveUserField(ctx.user.id,'list',next);if(JSON.stringify(confirmed?.list)!==JSON.stringify(next))throw Error('Não foi possível confirmar a mudança na sua lista. Tente novamente.');ctx.setState(confirmed,['list'])}
 host.addEventListener('input',e=>{if(e.target.hasAttribute('data-saved-search')){term=e.target.value;refreshResults()}});
 host.addEventListener('change',e=>{if(e.target.hasAttribute('data-saved-sort')){sort=e.target.value;refreshResults()}});
 host.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.libraryItem){const item=items.find(i=>String(i.id)===b.dataset.libraryItem);if(item)ctx.openItem(item);return}
  if(b.dataset.savedCategory){category=b.dataset.savedCategory;draw();return}
  if(busy||!b.dataset.savedRemove&&!b.hasAttribute('data-saved-undo'))return;
  try{
   if(b.dataset.savedRemove){const item=items.find(i=>String(i.id)===b.dataset.savedRemove);if(!item)return;const before=[...savedIds()];busy=true;draw();await save(withoutSavedId(before,item.id));lastRemoved={id:item.id,title:item.title,index:before.findIndex(id=>String(id)===String(item.id))}}
   if(b.hasAttribute('data-saved-undo')&&lastRemoved){const next=[...savedIds()];if(!next.some(id=>String(id)===String(lastRemoved.id)))next.splice(Math.max(0,Math.min(lastRemoved.index,next.length)),0,lastRemoved.id);busy=true;draw();await save(next);lastRemoved=null}
  }catch(error){ctx.toast(error.message||'Não foi possível atualizar sua lista.')}finally{busy=false;draw()}
 });
 draw();return{destroy(){alive=false}};
}
export async function mountRanking(host,ctx){
 let alive=true,busy=false;
 async function load(){
  if(!alive||busy)return;busy=true;
  try{
   const rollover=await db.rpc('lx_rank_rollover_if_needed');
   if(rollover.error)throw rollover.error;
   const [ranking,activeResult]=await Promise.all([getRanking(),db.rpc('lx_rank_active_status')]);const activity=activeResult.error?null:activeResult.data,season=ranking.season,rows=ranking.rows||[],mine=rows.find(r=>r.user_id===ctx.user.id);
   let own=mine,position=mine?rows.indexOf(mine)+1:null;
   if(!own&&season){
    own=await checked(db.from('lx_rank_scores').select('user_id,monthly_score').eq('season_key',season.season_key).eq('user_id',ctx.user.id).maybeSingle());
    if(own){const rank=await db.from('lx_rank_scores').select('user_id',{head:true,count:'exact'}).eq('season_key',season.season_key).gt('monthly_score',own.monthly_score);position=(rank.count||0)+1}
   }
   // Preserve older, unconfirmed months as "in review" rather than hiding them.
   const past=await checked(db.from('lx_rank_seasons').select('season_key,prize_cents,status,winner_user_id,winner_score,winner_confirmed').in('status',['closed','review']).order('starts_at',{ascending:false}).limit(12)).catch(()=>[]);
   const ids=[...new Set([...rows.map(r=>r.user_id),...past.map(s=>s.winner_user_id).filter(Boolean)])];
   const names=ids.length?await checked(db.from('lx_profiles').select('user_id,name,username,avatar_url,verified,ranking_visible').in('user_id',ids).eq('ranking_visible',true)).catch(()=>[]):[];
   if(alive)host.innerHTML=renderRanking({season,rows,people:[...names.filter(p=>p.user_id!==ctx.user.id),ctx.profile()],userId:ctx.user.id,own,position,past,activity});
  }catch(error){if(alive&&host.innerHTML==='')host.innerHTML='<div class="panel"><h2>Ranking temporariamente indisponível</h2><p>Tente atualizar a classificação.</p><button class="btn primary" data-rank-refresh>Atualizar ranking</button></div>'}
  finally{busy=false}
 }
 host.innerHTML='<div class="panel"><p>Carregando classificação da temporada…</p></div>';
 const onClick=event=>{if(event.target.closest('[data-rank-refresh]'))load().catch(()=>{})};
 host.addEventListener('click',onClick);
 await load();
 const timer=setInterval(()=>{if(!document.hidden)load().catch(()=>{})},30000);
 return {refresh(){load().catch(()=>{})},destroy(){alive=false;clearInterval(timer);host.removeEventListener('click',onClick)}};
}
