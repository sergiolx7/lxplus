// Official metadata only. Never download, proxy, store or extract third-party audio.
const safeTitle=v=>String(v||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,200);
const allowedCover=(v,provider)=>{try{const u=new URL(v);const h=u.hostname.toLowerCase();return u.protocol==='https:'&&!u.username&&!u.password&&(provider==='YouTube'?['i.ytimg.com','img.youtube.com'].includes(h):h==='i.scdn.co')?u.href:''}catch{return ''}};
export function youtubeCandidates(data=[]){
 return (Array.isArray(data)?data:[]).flatMap(row=>{
  const id=row?.id?.videoId||'',snippet=row?.snippet||{};
  if(!/^[A-Za-z0-9_-]{11}$/.test(id)||!safeTitle(snippet.title))return [];
  return [{type:'Música',provider:'YouTube',externalId:'youtube:'+id,sourceUrl:'https://www.youtube.com/watch?v='+id,title:safeTitle(snippet.title),cover:allowedCover(snippet.thumbnails?.high?.url||snippet.thumbnails?.default?.url,'YouTube'),artist:'',album:'',genre:'',year:null}];
 });
}
export function spotifyCandidates(data=[]){
 return (Array.isArray(data)?data:[]).flatMap(row=>{
  const id=String(row?.id||'');
  if(!/^[A-Za-z0-9]{22}$/.test(id)||!safeTitle(row.name)||row.is_local)return [];
  const artist=(row.artists||[]).map(x=>safeTitle(x.name)).filter(Boolean).join(', ').slice(0,200);
  const album=safeTitle(row.album?.name)||'';
  return [{type:'Música',provider:'Spotify',externalId:'spotify:'+id,sourceUrl:'https://open.spotify.com/track/'+id,title:safeTitle(row.name),cover:allowedCover(row.album?.images?.[0]?.url,'Spotify'),artist,album,genre:'',year:/^\d{4}/.test(row.album?.release_date||'')?Number(row.album.release_date.slice(0,4)):null}];
 });
}
export const searchTerms=(queries,index)=>String(queries?.[index%Math.max(1,queries?.length||1)]||'música oficial').slice(0,70);
async function getJSON(fetcher,url,options={},timeoutMs=8000){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{const response=await fetcher(url,{...options,signal:ctrl.signal});if(response.status===429)throw Error('PROVIDER_RATE_LIMIT');if(!response.ok)throw Error('PROVIDER_'+response.status);return await response.json()}finally{clearTimeout(timer)}
}
export async function providerDiscovery({query,limit=40,youtubeKey='',spotifyId='',spotifySecret='',fetcher=fetch}){
 const errors=[],found=[];let providers=0;const size=Math.max(1,Math.min(50,Number(limit)||40)),both=!!youtubeKey&&!!spotifyId&&!!spotifySecret;
 if(youtubeKey){
  providers++;
  try{
   const n=both?Math.ceil(size/2):size,url='https://www.googleapis.com/youtube/v3/search?'+new URLSearchParams({part:'snippet',q:query,type:'video',videoCategoryId:'10',videoEmbeddable:'true',maxResults:String(n),regionCode:'BR',key:youtubeKey});
   const data=await getJSON(fetcher,url);found.push(...youtubeCandidates(data.items).slice(0,n));
  }catch(e){errors.push('YOUTUBE_'+(String(e.message).includes('429')?'RATE_LIMIT':String(e.message).includes('PROVIDER_RATE_LIMIT')?'RATE_LIMIT':'API_ERROR'))}
 }
 if(spotifyId&&spotifySecret){
  providers++;
  try{
   const id=btoa(spotifyId+':'+spotifySecret);
   const oauth=await getJSON(fetcher,'https://accounts.spotify.com/api/token',{method:'POST',headers:{Authorization:'Basic '+id,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
   if(!oauth?.access_token)throw Error('SPOTIFY_AUTH');
   const n=both?Math.floor(size/2):size;
   const url='https://api.spotify.com/v1/search?'+new URLSearchParams({q:query,type:'track',market:'BR',limit:String(n)});
   const data=await getJSON(fetcher,url,{headers:{Authorization:'Bearer '+oauth.access_token}});
   found.push(...spotifyCandidates(data.tracks?.items).slice(0,n));
  }catch(e){errors.push(String(e.message).includes('RATE_LIMIT')?'SPOTIFY_RATE_LIMIT':'SPOTIFY_API_ERROR')}
 }
 const seen=new Set();
 const items=found.filter(item=>{if(seen.has(item.sourceUrl))return false;seen.add(item.sourceUrl);return true}).slice(0,size);
 return {items,scanned:found.length,providers,errors};
}
