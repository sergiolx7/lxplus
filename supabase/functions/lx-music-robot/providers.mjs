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
 try{const response=await fetcher(url,{...options,signal:ctrl.signal});if(response.status===429)throw Error('PROVIDER_429');if(!response.ok)throw Error('PROVIDER_'+response.status);return await response.json()}finally{clearTimeout(timer)}
}
export async function providerDiscovery({query,limit=40,youtubeKey='',spotifyId='',spotifySecret='',fetcher=fetch}){
 const errors=[],found=[];let providers=0;
 const size=Math.max(1,Math.min(50,Number(limit)||40));
 const both=!!youtubeKey&&!!spotifyId&&!!spotifySecret;
 let spotifyFound=0,spotifyFailed=false;
 // Query Spotify first so a restricted app does not unnecessarily halve YouTube
 // discovery. OAuth tokens never appear in logged diagnostics or returned output.
 if(spotifyId&&spotifySecret){
  providers++;
  let phase='AUTH';
  try{
   const id=btoa(spotifyId+':'+spotifySecret);
   const oauth=await getJSON(fetcher,'https://accounts.spotify.com/api/token',{method:'POST',headers:{Authorization:'Basic '+id,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
   if(!oauth?.access_token)throw Error('PROVIDER_401');
   phase='SEARCH';
   const n=both?Math.floor(size/2):size;
   const url='https://api.spotify.com/v1/search?'+new URLSearchParams({q:query,type:'track',market:'BR',limit:String(n)});
   const data=await getJSON(fetcher,url,{headers:{Authorization:'Bearer '+oauth.access_token}});
   const spotifyItems=spotifyCandidates(data.tracks?.items).slice(0,n);
   spotifyFound=spotifyItems.length;found.push(...spotifyItems);
  }catch(e){
   spotifyFailed=true;
   const kind=String(e.message||'').match(/^PROVIDER_(400|401|403|404|429)$/)?.[1];
   errors.push('SPOTIFY_'+phase+'_'+(kind||'UNAVAILABLE'));
  }
 }
 if(youtubeKey){
  providers++;
  try{
   const remaining=both?spotifyFailed?size:Math.max(1,size-spotifyFound):size;
   const url='https://www.googleapis.com/youtube/v3/search?'+new URLSearchParams({part:'snippet',q:query,type:'video',videoCategoryId:'10',videoEmbeddable:'true',maxResults:String(remaining),regionCode:'BR',key:youtubeKey});
   const data=await getJSON(fetcher,url);
   found.push(...youtubeCandidates(data.items).slice(0,remaining));
  }catch(e){
   const kind=String(e.message||'').match(/^PROVIDER_(400|401|403|404|429)$/)?.[1];
   errors.push('YOUTUBE_'+(kind||'API_UNAVAILABLE'));
  }
 }
 const seen=new Set();
 const items=found.filter(item=>{if(seen.has(item.sourceUrl))return false;seen.add(item.sourceUrl);return true}).slice(0,size);
 return {items,scanned:found.length,providers,errors};
}
