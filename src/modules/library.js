import {renderRanking} from '../ranking-ui.js';
import {socialDirectory} from '../services.js';
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
 let alive=true;const ranking=await getRanking(),names=ctx.directory().length?ctx.directory():await socialDirectory().catch(()=>[]),season=ranking.season,rows=ranking.rows||[],mine=rows.find(r=>r.user_id===ctx.user.id);
 const person=id=>id===ctx.user.id?ctx.profile():names.find(p=>p.user_id===id),prize=season?.prize_cents?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(season.prize_cents/100):'A definir';
 let own=mine,position=mine?rows.indexOf(mine)+1:null;
 if(!own&&season){own=await checked(db.from('lx_rank_scores').select('user_id,monthly_score').eq('season_key',season.season_key).eq('user_id',ctx.user.id).maybeSingle());if(own){const r=await db.from('lx_rank_scores').select('user_id',{head:true,count:'exact'}).eq('season_key',season.season_key).gt('monthly_score',own.monthly_score);position=(r.count||0)+1}}
 const past=await checked(db.from('lx_rank_seasons').select('season_key,prize_cents,status,winner_user_id,winner_score,winner_confirmed').eq('status','closed').order('starts_at',{ascending:false}).limit(12)).catch(()=>[]);
 if(alive)host.innerHTML=renderRanking({season,rows,people:[...names.filter(p=>p.user_id!==ctx.user.id),ctx.profile()],userId:ctx.user.id,own,position,past});
 return{destroy(){alive=false}};
}
