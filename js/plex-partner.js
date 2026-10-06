/* A catalog page is metadata; only actual native media can enter the LX player. */
(()=>{
 const LX=window.LX;
 function plexUrl(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&u.hostname==='watch.plex.tv'}catch{return false}}
 function isItem(item={}){return [item.sourceProvider,item.metadataProvider,item.partner].some(v=>String(v||'').toLowerCase()==='plex')||[item.externalProviderUrl,item.metadataUrl,...(item.providerLinks||[]).map(x=>x.url)].some(plexUrl)}
 function nativeRef(item={},episode=null){
  const media=episode||item;
  if(media.drm&&media.drm!=='none'||media.requiresPartnerPlayer||media.advertisementsRequired)return '';
  for(const value of [media.mediaKey,media.authorizedStreamUrl,media.authorizedVideoUrl,media.fullMediaKey]){
   const ref=String(value||'').trim();if(!ref)continue;
   if(/^(cloud:|r2:|blob:)/.test(ref))return ref;
   try{const u=new URL(ref,location.href);if(!/^https?:$/.test(u.protocol)||plexUrl(ref))continue;const info=LX.mediaSources?.describe?.(ref);if(info?.kind==='embed')continue;if(info?.kind==='direct'||/\.(mp4|webm|m4v|mov|m3u8|mpd)(?:$|[?#])/i.test(u.pathname+u.search))return ref}catch{}
  }
  return '';
 }
 LX.plexPartner={isItem,nativeRef,plexUrl};
})();
