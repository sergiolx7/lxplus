/** Remove duplicate presentation fields from metadata-only imports.
 * Facts, covers, identities, descriptions and owner-supplied media are retained.
 */
export function compactPublicMetadata(item) {
 const sourceFields=['mediaKey','authorizedAudioUrl','authorizedStreamUrl','authorizedAudioKey','fullMediaKey','audioKey','audioUrl','externalMusicUrl','externalReadUrl'];
 if(item.catalogOnly!==true||item.metadataOnly!==true||sourceFields.some(f=>item[f])||(item.tracks||[]).some(t=>sourceFields.some(f=>t[f]))||(item.episodes||[]).some(t=>t.mediaKey))throw new Error('ONLY_EMPTY_IMPORTED_METADATA');
 const x=structuredClone(item);
 if(x.banner===x.cover)delete x.banner;
 if(x.externalProviderUrl===x.metadataUrl)delete x.externalProviderUrl;
 if(x.providerLinks?.length===1&&x.providerLinks[0].url===x.metadataUrl)delete x.providerLinks;
 for(const field of ['createdAt','importedAt'])if(x[field]===x.publishedAt)delete x[field];
 for(const field of ['featured','trending','newRelease'])if(x[field]===false)delete x[field];
 if(x.priority===0)delete x.priority;
 if(x.tags?.every(t=>t==='Catálogo LX'||t==='Disponível em breve'))delete x.tags;
 for(const field of ['chapters','episodes'])if(Array.isArray(x[field])&&!x[field].length)delete x[field];
 if(x.type==='Música'&&x.tracks?.length===1){const track=x.tracks[0],fields=['title','artist','album','cover','duration'];if(fields.every(field=>track[field]==null||track[field]===x[field])&&Object.keys(track).every(field=>[...fields,'number','mediaKey','qualityMode'].includes(field)))delete x.tracks;}
 if(x.type==='Música'){
  if(x.externalId===`itunes:track:${x.itunesTrackId}`)delete x.itunesTrackId;
  try{if(new URL(x.metadataUrl).pathname.split('/').pop()===String(x.itunesAlbumId))delete x.itunesAlbumId;}catch{}
  if(String(x.importBatch||'').startsWith('lx-public-catalog-20261006')&&String(x.desc||'').startsWith('Disponível em breve no LX Plus.'))x.desc=`Disponível em breve no LX Plus. ${x.title} — ${x.artist}.`;
 }
 if(x.qualityMode==='pending-media')delete x.qualityMode;
 return x;
}
