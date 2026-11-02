import {fold,searchTerm} from './catalog-search.js';
export function musicSuggestions(term,items){
 const q=fold(searchTerm(term));if(q.length<2)return [];
 return [...new Set(items.flatMap(x=>[x.title,x.artist,x.album,x.genre]).filter(x=>typeof x==='string'&&fold(x).includes(q)&&fold(x)!==q))].slice(0,4);
}
// Search referenced tracks before slicing, including IDs beyond the first page.
export async function referenceMusicPage({ids,term='',offset=0,limit=60,fetchRows}){
 const unique=[...new Set(ids.map(String))];let rows=[];
 const selected=unique;
 for(let start=0;start<selected.length;start+=100)rows.push(...await fetchRows(selected.slice(start,start+100),term));
 const order=new Map(unique.map((id,i)=>[id,i]));rows=rows.filter(x=>order.has(String(x.id))).sort((a,b)=>order.get(String(a.id))-order.get(String(b.id)));
 return {items:rows.slice(offset,offset+limit),total:rows.length};
}
export async function completeMusicGroup({field,value,artist='',page,isCurrent=()=>true}){
 if(!['album','artist','genre'].includes(field))throw Error('Seleção musical inválida.');
 let items=[],total=Infinity,offset=0;const seen=new Set();
 while(offset<total){
  const result=await page({types:['Música'],match:field==='album'&&artist?{album:value,artist}:{[field]:value},offset,limit:60});if(!isCurrent())return [];
  total=result.total;offset+=result.items.length;
  const fresh=result.items.filter(x=>!seen.has(String(x.id)));for(const item of fresh)seen.add(String(item.id));items.push(...fresh);
  if(offset<total&&!fresh.length)throw Error('A seleção mudou durante a consulta. Tente abrir novamente.');
 }
 return items;
}

// Resolve actions against the opened album/artist, not an unrelated catalogue page.
export function findMusicActionTrack(id,library=[],groupTracks=null){
 if(id===null||id===undefined||id==='')return null;
 const rows=Array.isArray(groupTracks)?groupTracks:Array.isArray(library)?library:[];
 return rows.find(row=>row&&String(row.id)===String(id))||null;
}
