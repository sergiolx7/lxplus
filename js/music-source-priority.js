/* LX music source priority. Keep this module in the canonical bundle as well. */
(function(){
 'use strict';
 const LX=window.LX=window.LX||{};
 const audioFields=['authorizedAudioUrl','authorizedStreamUrl','authorizedAudioKey','fullMediaKey','audioKey','audioUrl'];
 const mediaFields=['mediaKey','url','src'];
 function classify(value,external=false){
  const ref=String(value||'').trim();if(!ref)return null;
  let provider='',url=null;
  if(/^youtube:[\w-]{11}$/.test(ref)||/^youtube-playlist:[\w-]+$/.test(ref))provider='youtube';
  else if(/^spotify:(?:track|album|playlist|episode|show|artist):[A-Za-z0-9]+$/.test(ref))provider='spotify';
  else if(/^https?:\/\//i.test(ref)){
   try{url=new URL(ref)}catch{return null}
   if(url.username||url.password)return null;
   const host=url.hostname.toLowerCase();
   if(/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host))provider='youtube';
   else if(host==='open.spotify.com')provider='spotify';
   else if(/(^|\.)(apple\.com|plex\.tv|openlibrary\.org|spotify\.com)$/.test(host))return null;
  }else if(/^(?:javascript|data|file|youtube|youtube-playlist|spotify):/i.test(ref))return null;
  // Store and metadata links are never audio files. External fallbacks must
  // resolve to an official provider player, not to an arbitrary HTTPS page.
  if(external&&!provider)return null;
  if(provider==='youtube'&&url){const id=url.hostname.endsWith('youtu.be')?url.pathname.split('/')[1]:url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];if(!/^[\w-]{11}$/.test(id||'')&&!/^[\w-]+$/.test(url.searchParams.get('list')||''))return null;}
  if(provider==='spotify'&&url&&!/^\/(?:intl-[^/]+\/)?(?:track|album|playlist|episode|show|artist)\/[A-Za-z0-9]+\/?$/.test(url.pathname))return null;
  let desc;try{desc=LX.mediaSources?.describe?.(ref)}catch{return null}
  if(!desc||desc.kind==='missing')return null;
  if(desc.kind==='embed'&&/^(?:YouTube|Spotify)/i.test(desc.provider||'')&&!provider)return null;
  const kind=desc.kind==='embed'?(provider||'embed'):'native';
  if(provider&&kind==='native')return null;
  return {ref,kind,desc,visiblePlayerRequired:kind==='youtube'};
 }
 function ordered(track={},content={}){
  const entries=[],seen=new Set(),parentSingle=!Array.isArray(content.tracks)||content.tracks.length<=1;
  const add=(object,fields,external=false)=>{for(const field of fields){const entry=classify(object?.[field],external);if(entry&&!seen.has(entry.ref)){seen.add(entry.ref);entries.push(entry)}}};
  add(track,audioFields);if(parentSingle)add(content,audioFields);
  add(track,mediaFields);if(parentSingle)add(content,mediaFields);
  add(track,['sourceMediaKey']);if(parentSingle)add(content,['sourceMediaKey']);
  add(track,['externalMusicUrl','youtubeUrl','spotifyUrl'],true);
  if(parentSingle)add(content,['externalMusicUrl','youtubeUrl','spotifyUrl'],true);
  const ordered=[...entries.filter(x=>x.kind==='native'),...entries.filter(x=>x.kind!=='native')];
  return LX.config?.features?.nativePlaybackOnly===true?ordered.filter(x=>x.kind==='native'):ordered;
 }
 function select(track={},content={}){const entries=ordered(track,content);return (LX.config?.features?.nativePlaybackOnly===true?entries.filter(x=>x.kind==='native'):entries)[0]||null}
 function forContent(content={}){const tracks=content.tracks?.length?content.tracks:[{}];return tracks.map(track=>select(track,content)).filter(Boolean)}
 function preferred(item={},content={}){return item.tracks?.length?forContent(item)[0]||null:select(item,content)}
 function kind(item={},content={}){
  const actual=LX.musicPlaybackSource;
  if(item.contentId!=null&&actual?.contentId!=null&&String(item.contentId)===String(actual.contentId)&&Number(item.index||0)===Number(actual.index||0))return actual.kind;
  return preferred(item,content)?.kind||'missing';
 }
 const label=kind=>kind==='youtube'?'LX Music + YouTube':kind==='spotify'?'LX Music + Spotify':'LX Music';
 LX.musicSourcePriority={classify,ordered,select,forContent,preferred,kind,label};
})();
