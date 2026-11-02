import {fold} from './catalog-search.js';
import {sameMusicLane,musicLane} from './music-genre.js';
export function musicMix(items,{current=null,likes=[],history={},exclude=[],limit=40,strictGenre=false}={}){
 const liked=new Set(likes.map(String)),excluded=new Set(exclude.map(String)),seen=new Set();
 const seeds=items.filter(x=>liked.has(String(x.id))||history[String(x.id)]||String(x.id)===String(current?.id));
 const genres=new Set(seeds.map(x=>fold(x.genre)).filter(Boolean)),artists=new Set(seeds.map(x=>fold(x.artist)).filter(Boolean));
 const score=x=>(fold(x.artist)===fold(current?.artist)&&current?.artist?12:0)+(musicLane(x).genre===musicLane(current).genre&&musicLane(current).genre?10:0)+(genres.has(fold(x.genre))?3:0)+(artists.has(fold(x.artist))?2:0)+(liked.has(String(x.id))?1:0);
 return items.filter(x=>x?.type==='Música'&&x.published!==false&&(!strictGenre||sameMusicLane(current,x))&&!excluded.has(String(x.id))&&!seen.has(String(x.id))&&seen.add(String(x.id))).map((item,index)=>({item,index,score:score(item)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,Math.max(0,Math.min(60,limit))).map(x=>x.item);
}
