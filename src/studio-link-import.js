import {classifyLink} from './universal-player.js';
const types=new Set(['Filme','Série','Dorama','Anime','Música','Livro','Ao Vivo']);
const normalize=s=>String(s||'').trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
export function parseStudioLinks(text,{type='Música',metadata=[]}={}){
 if(!types.has(type))throw Error('Selecione uma categoria válida.');
 const urls=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!urls.length||urls.length>40)throw Error('Cole de 1 até 40 links por lote.');
 const sources=new Set(),meta=new Map((Array.isArray(metadata)?metadata:[]).map(x=>[x?.url,x]));
 return urls.map((url,i)=>{
  const link=classifyLink(url,{audio:type==='Música'});
  const errors=[];
  if(link.kind==='invalid'||link.kind==='external')errors.push('Link não reproduzível no LX Plus');
  if(type==='Música'&&link.provider==='Spotify'&&!/\/embed\/track\//.test(link.url||''))errors.push('Álbum e playlist do Spotify precisam ser adicionados como itens individuais.');
  const canonical=link.source||url;
  if(sources.has(canonical))errors.push('Link duplicado neste lote');
  sources.add(canonical);
  const result=meta.get(url),title=String(result?.title||'').trim().slice(0,200);
  const cover=result?.cover&&/^https:\/\//.test(result.cover)?result.cover:'';
  if(!title)errors.push('Título não identificado — revise antes de salvar');
  const isOfficial=['YouTube','Spotify'].includes(link.provider)&&link.kind==='iframe';
  const item={title,type,sourceUrl:canonical,sourceKind:'auto',cover,artist:type==='Música'&&result?.provider==='Spotify'?String(result.artist||'').slice(0,200):'',album:'',published:false,officialEmbedded:isOfficial,metadataOrigin:result?.provider?result.provider+' oEmbed':'',metadataReviewed:false};
  // Only the same recording's verified album can be inserted; neither oEmbed returns album identity.
  return {row:i+1,item,valid:errors.length===0,errors,identity:canonical,needsReview:type==='Música'&&!item.artist||!item.album};
 });
}
export function matchingAlbums(items,artist){
 const key=normalize(artist);if(!key)return [];
 return [...new Set((Array.isArray(items)?items:[]).filter(x=>x?.type==='Música'&&normalize(x.artist)===key&&x.album).map(x=>String(x.album).trim()))].sort((a,b)=>a.localeCompare(b,'pt-BR')).slice(0,50);
}
