/* Native playback policy and lazy text reader. No third-party player fallback. */
(()=>{
 'use strict';
 const LX=window.LX=window.LX||{};
 const enabled=()=>LX.config?.features?.nativePlaybackOnly===true;
 const episodic=x=>['Série','Anime','Dorama','Programa'].includes(x?.type);
 const safeUrl=value=>{if(!String(value||'').trim())return '';try{const u=new URL(String(value),location.href);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
 const nativeRef=value=>{
  if(!value)return '';
  let d;try{d=LX.mediaSources?.describe?.(value)}catch{return ''}
  return d&&['native','direct'].includes(d.kind)?String(value):'';
 };
 const videoRef=(item={},episode=null)=>{
  const media=episode||item;
  if(episodic(item)&&!episode)return '';
  if(LX.plexPartner?.isItem?.(item))return nativeRef(LX.plexPartner.nativeRef(item,episode));
  for(const key of ['authorizedVideoUrl','authorizedStreamUrl','mediaKey','hlsUrl']){const ref=nativeRef(media[key]);if(ref)return ref}
  return '';
 };
 const ready=item=>{
  if(item?.type==='Música')return LX.musicSourcePriority.forContent(item).length>0;
  if(item?.type==='Livro')return !!(safeUrl(item.textAsset?.url)||item.chapters?.some(c=>String(c.text||'').trim())||nativeRef(item.mediaKey)&&(!/^https?:/i.test(item.mediaKey)||/\.(pdf|epub)(?:[?#\s]|$)/i.test(item.mediaKey+' '+(item.fileName||''))));
  if(episodic(item))return !!item.episodes?.some(ep=>videoRef(item,ep));
  if(item?.type==='Filme'||item?.type==='Ao Vivo')return !!videoRef(item);
  return true;
 };
 const esc=value=>LX.esc?LX.esc(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const credits=item=>{
  const license=item?.license;if(!license||item.openFilm)return '';
  const url=safeUrl(license.url),source=safeUrl(license.sourceUrl);
  return `<aside class="lx-open-film-credit" aria-label="Autoria e licença"><strong>${esc(license.credit||license.creator||item.author||item.artist||'')}</strong><span>${esc(license.changes||'')}</span><div>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(license.name||'Licença')} ↗</a>`:''}${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Fonte e créditos ↗</a>`:''}</div></aside>`;
 };
 LX.nativePlayback={enabled,ready,videoRef,nativeRef,credits};
 const cache=new Map(),maximumBytes=4*1024*1024;
 function splitText(raw){
  let text=String(raw||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const start=text.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  if(start)text=text.slice(start.index+start[0].length);
  const end=text.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  if(end)text=text.slice(0,end.index);
  const parts=[];let page=[],length=0;
  const flush=()=>{if(page.length){const body=page.join('\n\n').trim();parts.push({title:`Parte ${String(parts.length+1).padStart(2,'0')}`,text:body});page=[];length=0}};
  for(const paragraph of text.trim().split(/\n\s*\n/)){
   const p=paragraph.trim();if(!p)continue;
   if(length+p.length>12000)flush();
   if(p.length>12000){for(let i=0;i<p.length;i+=12000){page=[p.slice(i,i+12000)];flush()}}
   else{page.push(p);length+=p.length+2}
  }
  flush();if(!parts.length||parts.length>1000)throw new Error('BOOK_TEXT_INVALID');return parts;
 }
 async function load(item,{signal}={}){
  const asset=item?.textAsset,url=safeUrl(asset?.url);
  if(!url||!asset?.sha256||!/^[a-f0-9]{64}$/.test(asset.sha256)||asset.bytes>maximumBytes)throw new Error('BOOK_ASSET_INVALID');
  const key=url+'|'+asset.sha256;if(cache.has(key))return cache.get(key);
  const response=await fetch(url,{signal,credentials:'omit'});
  if(!response.ok||Number(response.headers.get('content-length'))>maximumBytes)throw new Error('BOOK_DOWNLOAD_FAILED');
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maximumBytes)throw new Error('BOOK_TOO_LARGE');chunks.push(value)}}catch(error){await reader.cancel().catch(()=>{});throw error}
  if(asset.bytes!==length)throw new Error('BOOK_FILE_CHANGED');
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==asset.sha256)throw new Error('BOOK_HASH_MISMATCH');
  const parts=splitText(new TextDecoder('utf-8',{fatal:true}).decode(bytes));cache.set(key,parts);while(cache.size>8)cache.delete(cache.keys().next().value);return parts;
 }
 LX.nativeBooks={load,splitText,maximumBytes};
})();
