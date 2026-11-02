// Pure YouTube metadata filtering. Does not inspect or download audio.
const genreArtists = {
 trap:['Matuê','Teto','WIU','Veigh','KayBlack','Orochi','Borges','Yunk Vino','Sidoka','Recayd Mob','Derek','Chefin'],
 sertanejo:['Henrique e Juliano','Marília Mendonça','Ana Castela','Gusttavo Lima','Luan Santana','Maiara e Maraisa','Jorge e Mateus','Murilo Huff'],
 funk:['MC Hariel','MC Ryan SP','MC Cabelinho','MC Tuto','MC IG','MC Paiva','MC PH'],
 forro:['João Gomes','Zé Vaqueiro','Tarcísio do Acordeon','Wesley Safadão','Nattan'],
 pagode:['Menos É Mais','Dilsinho','Ferrugem','Sorriso Maroto','Péricles']
};
export const normalize = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const matchesName=(hay,needle)=>!!needle&&(' '+hay+' ').includes(' '+needle+' ');
export const supportedGenres=Object.keys(genreArtists);
export function chooseArtist(genre,currentArtist='',rotation=0){
 const pool=genreArtists[genre]||[];
 if(!pool.length)return '';
 const name=normalize(currentArtist);
 const index=pool.findIndex(s=>matchesName(name,normalize(s)));
 const base=index<0?-1:index;
 const step=Math.max(0,Math.min(6,Number(rotation)||0));
 return pool[(base+1+step)%pool.length];
}
function primaryArtist(title,channel,pool){
 const t=normalize(title),c=normalize(channel);
 const matching=pool.filter(name=>matchesName(t,normalize(name)));
 if(matching.length)return matching.sort((a,b)=>t.indexOf(normalize(a))-t.indexOf(normalize(b)))[0];
 return pool.find(name=>matchesName(c,normalize(name)))||'';
}
const rejectTitle=/\b(reaction|reagindo|react|reagiu|review|analise|entrevista|podcast|cortes|entrevistas|tutorial|karaoke|cover por|cover de|slowed|sped up|nightcore|instrumental|aula)\b/i;
export function youtubeCandidates(data,genre,target){
 const pool=genreArtists[genre]||[];
 if(!pool.length)return [];
 const rows=Array.isArray(data)?data:[];
 const seen=new Set();
 return rows.flatMap(row=>{
  const id=String(row?.id?.videoId||'');
  const s=row?.snippet||{};
  const title=String(s.title||'').replace(/<[^>]*>/g,'').trim().slice(0,200);
  if(!/^[A-Za-z0-9_-]{11}$/.test(id)||!title||rejectTitle.test(normalize(title))||seen.has(id))return [];
  const artist=primaryArtist(title,s.channelTitle,pool);
  if(!artist)return [];
  seen.add(id);
  const videoUrl='https://www.youtube.com/watch?v='+id;
  const thumb=String(s.thumbnails?.medium?.url||s.thumbnails?.default?.url||'');
  const cover=/^https:\/\/(i\.ytimg\.com|img\.youtube\.com)\//i.test(thumb)?thumb:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg';
  return [{id:'youtube:'+id,externalId:'youtube:'+id,provider:'YouTube',type:'Música',published:true,officialEmbedded:true,sourceUrl:videoUrl,title,artist,genre:genre==='trap'?'Trap brasileiro':genre==='sertanejo'?'Sertanejo':genre==='forro'?'Forró':genre==='funk'?'Funk brasileiro':'Pagode',country:'Brasil',cover}];
 }).sort((a,b)=>Number(normalize(b.artist)===normalize(target))-Number(normalize(a.artist)===normalize(target)));
}
export function youtubeIdFromURL(value){
 try{
  const url=new URL(String(value||''));
  if(!['www.youtube.com','youtube.com','music.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(url.hostname))return '';
  const id=url.hostname==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')||url.pathname.match(/\/embed\/([\w-]{11})/)?.[1];
  return /^[\w-]{11}$/.test(id||'')?id:'';
 }catch{return ''}
}
