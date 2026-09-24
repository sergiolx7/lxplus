/* LX Music: albums derived from real cover artwork and embedded album tags. */
(function(root){
  'use strict';
  const norm=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const albumName=value=>typeof value==='string'?value:String(value?.name||'');
  function coverIdentity(value){
    const cover=String(value||'').trim();
    if(!cover||/^data:image\/svg\+xml/i.test(cover)||/lx-music-fallback|\/assets\/icon-/i.test(cover))return '';
    return /^(?:https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(cover)?cover:'';
  }
  function idFor(key){let a=2166136261,b=2166136261;for(let i=0;i<key.length;i++){a=Math.imul(a^key.charCodeAt(i),16777619);b=Math.imul(b^key.charCodeAt(key.length-1-i),16777619)}return 'lx-album-'+(a>>>0).toString(36)+'-'+(b>>>0).toString(36)}
  function groupAlbums(items=[]){
    const groups=new Map();
    for(const item of items){
      if(!item||item.type!=='Música')continue;
      const tracks=Array.isArray(item.tracks)&&item.tracks.length?item.tracks:[{title:item.title,artist:item.artist,album:item.album,cover:item.cover,duration:item.duration,number:1}];
      tracks.forEach((track,index)=>{
        const cover=coverIdentity(track?.cover)||coverIdentity(item.cover);
        if(!cover)return;
        const key=item.albumCoverKey||cover;
        if(!groups.has(key))groups.set(key,{id:idFor(key),cover,entries:[]});
        groups.get(key).entries.push({id:item.id,index,title:track?.title||item.title||'Faixa',artist:track?.artist||item.artist||'',album:albumName(track?.album)||albumName(item.album)||(tracks.length>1&&norm(item.title)!==norm(track?.title)?item.title:''),duration:Number(track?.duration||0),trackNumber:Number(track?.trackNumber||track?.number||0)});
      });
    }
    return [...groups.values()].filter(group=>group.entries.length>1).map(group=>{
      const counts=new Map();for(const entry of group.entries){const name=String(entry.album||'').trim();if(name){const key=norm(name),row=counts.get(key)||{name,count:0};row.count++;counts.set(key,row)}}
      const names=[...counts.values()].sort((a,b)=>b.count-a.count),artists=[...new Set(group.entries.map(entry=>entry.artist.trim()).filter(artist=>artist&&!/^(?:LX Music|Artista não informado)$/i.test(artist)))];
      group.title=!names.length?'Álbum sem nome':names.length===1||names[0].count>names[1].count?names[0].name:'Álbum com capa compartilhada';
      group.artist=artists.length===1?artists[0]:artists.length?'Vários artistas':'Artista não informado';
      group.itemIds=[...new Set(group.entries.map(entry=>String(entry.id)))];
      group.entries.sort((a,b)=>(a.trackNumber||Number.MAX_SAFE_INTEGER)-(b.trackNumber||Number.MAX_SAFE_INTEGER)||a.title.localeCompare(b.title,'pt-BR'));
      return group;
    }).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  }
  const api={coverIdentity,groupAlbums};
  root.LXAlbumGrouping=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
