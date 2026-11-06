import {fold} from './catalog-search.js';

export const savedCategories={'Todos':[],'Filmes':['Filme'],'Séries':['Série'],'Doramas':['Dorama'],'Animes':['Anime'],'Livros':['Livro'],'Músicas':['Música'],'Lives':['Ao Vivo']};
export function savedSelection(items,{category='Todos',term='',sort='saved',ids=[]}={}){
 const types=savedCategories[category]||[],q=fold(term),order=new Map(ids.map((id,i)=>[String(id),i]));
 const rows=(items||[]).filter(item=>(!types.length||types.includes(item.type))&&(!q||fold([item.title,item.artist,item.author,item.genre,item.album].join(' ')).includes(q)));
 const title=(a,b)=>String(a.title||'').localeCompare(String(b.title||''),'pt-BR');
 return [...rows].sort(sort==='title'?title:sort==='year'?(a,b)=>(Number(b.year)||0)-(Number(a.year)||0)||title(a,b):(a,b)=>(order.get(String(a.id))??Infinity)-(order.get(String(b.id))??Infinity));
}
export function withoutSavedId(value,id){return (Array.isArray(value)?value:[]).filter(entry=>String(entry)!==String(id))}
