import {renderRanking} from '../ranking-ui.js';
import {db,itemFrom,getRanking} from '../data.js';
import {esc,empty,checked,https} from '../ui.js';
import {displaySizeControls} from '../display-preferences.js';
import {premiumCard} from '../premium-ui.js';
export async function mount(host,ctx){
 let alive=true;const ids=(ctx.state().list||[]).map(String).filter(id=>/^\d+$/.test(id)),items=[];
 for(let i=0;i<ids.length;i+=100){const rows=await checked(db.from('lx_catalog').select('id,payload,published').in('id',ids.slice(i,i+100)).eq('published',true));items.push(...(rows||[]).map(itemFrom))}
 if(alive)host.innerHTML='<div class="module-heading"><span class="premium-overline">GUARDADO PARA VOCÊ</span><h1>Minha lista.</h1><p>'+items.length+' títulos disponíveis'+(ids.length>items.length?' · '+(ids.length-items.length)+' referências preservadas do catálogo anterior':'')+'</p></div>'+(items.length?displaySizeControls()+'<div class="premium-grid">'+items.map(item=>premiumCard(item).replace('data-item=','data-library-item=')).join('')+'</div>':empty('Suas próximas descobertas ficam aqui.','Salve filmes, séries e livros para encontrar depois.'));
 host.addEventListener('click',e=>{const b=e.target.closest('[data-library-item]');if(b)ctx.openItem(items.find(i=>String(i.id)===b.dataset.libraryItem))});return{destroy(){alive=false}};
}
export async function mountRanking(host,ctx){
 let alive=true,busy=false;
 async function load(){
  if(!alive||busy)return;busy=true;
  try{
   const rollover=await db.rpc('lx_rank_rollover_if_needed');
   if(rollover.error)throw rollover.error;
   const ranking=await getRanking(),season=ranking.season,rows=ranking.rows||[],mine=rows.find(r=>r.user_id===ctx.user.id);
   let own=mine,position=mine?rows.indexOf(mine)+1:null;
   if(!own&&season){
    own=await checked(db.from('lx_rank_scores').select('user_id,monthly_score').eq('season_key',season.season_key).eq('user_id',ctx.user.id).maybeSingle());
    if(own){const rank=await db.from('lx_rank_scores').select('user_id',{head:true,count:'exact'}).eq('season_key',season.season_key).gt('monthly_score',own.monthly_score);position=(rank.count||0)+1}
   }
   // Preserve older, unconfirmed months as "in review" rather than hiding them.
   const past=await checked(db.from('lx_rank_seasons').select('season_key,prize_cents,status,winner_user_id,winner_score,winner_confirmed').in('status',['closed','review']).order('starts_at',{ascending:false}).limit(12)).catch(()=>[]);
   const ids=[...new Set([...rows.map(r=>r.user_id),...past.map(s=>s.winner_user_id).filter(Boolean)])];
   const names=ids.length?await checked(db.from('lx_profiles').select('user_id,name,username,avatar_url,verified,ranking_visible').in('user_id',ids).eq('ranking_visible',true)).catch(()=>[]):[];
   if(alive)host.innerHTML=renderRanking({season,rows,people:[...names.filter(p=>p.user_id!==ctx.user.id),ctx.profile()],userId:ctx.user.id,own,position,past});
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
