// LX Social 3.0: fast, strictly local UI filtering on posts already authorized
// by existing Supabase policies. No fabricated trends or engagement.
const asId=value=>String(value||'');
export function communityFeed(posts,{filter='all',search='',viewerId='',friends=[],following=[],sponsored=[]}={}){
 const friendIds=new Set(friends.map(asId)),followIds=new Set(following.map(asId)),sponsoredIds=new Set(sponsored.map(asId));
 const q=String(search||'').trim().toLocaleLowerCase('pt-BR').slice(0,160);
 const allowed=['all','friends','following','popular'].includes(filter)?filter:'all';
 const filtered=(Array.isArray(posts)?posts:[]).filter(post=>{
  const id=asId(post?.author_id);
  if(allowed==='friends'&&id!==viewerId&&!friendIds.has(id))return false;
  if(allowed==='following'&&id!==viewerId&&!followIds.has(id))return false;
  return !q||String(post.body||'').toLocaleLowerCase('pt-BR').includes(q)||
   String(post.author_name||'').toLocaleLowerCase('pt-BR').includes(q)||
   String(post.author_username||'').toLocaleLowerCase('pt-BR').includes(q);
 });
 const score=post=>(Array.isArray(post.likes)?post.likes.length:0)+2*(Array.isArray(post.comments)?post.comments.length:0);
 return filtered.sort((a,b)=>{
  if(allowed==='popular'){
   const difference=score(b)-score(a);
   if(difference)return difference;
  }else if(allowed==='all'){
   const sponsorDelta=Number(sponsoredIds.has(asId(b.id)))-Number(sponsoredIds.has(asId(a.id)));
   if(sponsorDelta)return sponsorDelta;
  }
  return String(b.created_at||'').localeCompare(String(a.created_at||''));
 });
}
export function socialComposerIdeas(){
 return [
  {id:'film',label:'Filme',prefix:'🎬 Dica de filme: '},
  {id:'dorama',label:'Dorama',prefix:'🌸 Dorama que recomendo: '},
  {id:'music',label:'Música',prefix:'🎵 Estou ouvindo: '},
  {id:'book',label:'Livro',prefix:'📚 Minha leitura da vez: '}
 ];
}
export function socialComposerDraft(current,prefix,limit=4000){
 const text=String(current||''),start=String(prefix||'');
 if(!start||text.length+start.length>limit)return text.slice(0,limit);
 return text.trim()?(text.trimEnd()+'\n'+start).slice(0,limit):start;
}
export function communityStats({people=[],posts=[],me='',follows=new Map()}={}){
 const list=Array.isArray(people)?people:[];
 return {
  friends:list.filter(p=>p.user_id!==me&&p.relation==='accepted').length,
  following:list.filter(p=>p.user_id!==me&&follows.get(p.user_id)?.is_following===true).length,
  posts:Array.isArray(posts)?posts.length:0
 };
}
export function socialTimeAgo(date,now=Date.now()){
 const delta=Math.max(0,now-Date.parse(date));
 if(!Number.isFinite(delta))return '';
 if(delta<60000)return 'agora';
 if(delta<3600000)return Math.floor(delta/60000)+' min';
 if(delta<86400000)return Math.floor(delta/3600000)+' h';
 return Math.floor(delta/86400000)+' d';
}
