const normalize=value=>String(value||'').trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
const text=value=>String(value||'').trim();
export function musicGroups(tracks=[],kind='album'){
 if(!['album','artist'].includes(kind))return [];
 const groups=new Map();
 for(const item of tracks){
  if(!item||item.type!=='Música')continue;
  const artist=text(item.artist),album=text(item.album);
  const label=kind==='album'?album:artist;
  if(!label||(kind==='album'&&!artist))continue;
  const key=kind==='album'?normalize(artist)+'\u001f'+normalize(album):normalize(artist);
  if(!groups.has(key))groups.set(key,{key,name:label,artist:kind==='album'?artist:'',cover:'',count:0,items:[]});
  const group=groups.get(key);group.count++;group.items.push(item);
  if(!group.cover&&item.cover)group.cover=item.cover;
 }
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
export function featuredMusicShelves(tracks=[],history={},likes=[]){
 const liked=new Set(likes.map(String));
 const latest=[...tracks].filter(x=>x?.type==='Música').sort((a,b)=>String(history[String(b.id)]||'').localeCompare(String(history[String(a.id)]||'')));
 const recents=latest.filter(x=>history[String(x.id)]).slice(0,8);
 const favorites=latest.filter(x=>liked.has(String(x.id))).slice(0,8);
 return {recent:recents,favorites,albums:musicGroups(tracks,'album').slice(0,8),artists:musicGroups(tracks,'artist').slice(0,8)};
}
export function groupedMusicRows(tracks=[],group){
 if(!group||!['album','artist'].includes(group.kind))return [];
 const name=normalize(group.name),artist=normalize(group.artist);
 return tracks.filter(x=>x?.type==='Música'&&(group.kind==='album'?normalize(x.album)===name&&normalize(x.artist)===artist:normalize(x.artist)===name));
}
