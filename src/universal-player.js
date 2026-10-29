// LX Plus Next: link classification, not an arbitrary file proxy.
// Only provider-approved embeds and browser-supported media are attempted.
const googleDriveHosts=new Set(['drive.google.com','docs.google.com']);
const ytHosts=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be','www.youtube-nocookie.com','youtube-nocookie.com']);
const vimeoHosts=new Set(['vimeo.com','www.vimeo.com','player.vimeo.com']);
const extensions={
  mp4:'video',m4v:'video',webm:'video',ogv:'video',mov:'video',
  mp3:'audio',m4a:'audio',aac:'audio',wav:'audio',ogg:'audio',oga:'audio',flac:'audio',
  m3u8:'hls',mpd:'dash'
};
const safe=(input)=>{
 if(typeof input!=='string'||input.length>3000||!input.trim())return null;
 try{
  const u=new URL(input.trim());
  if(u.username||u.password||u.protocol!=='https:')return null;
  return u;
 }catch{return null}
};
const unavailable=(message='Formato ou plataforma não reproduzível diretamente.')=>({kind:'external',provider:'Outro serviço',message});
export function classifyLink(input,{audio=false}={}){
 const u=safe(input);
 if(!u)return {kind:'invalid',provider:'Link inválido',message:'Use um endereço HTTPS completo, sem usuário ou senha na URL.'};
 const h=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);
 if(ytHosts.has(h)){
  let id='';
  if(h.includes('youtu.be'))id=parts[0]||'';
  else if(parts[0]==='watch')id=u.searchParams.get('v')||'';
  else if(['embed','shorts','live','v'].includes(parts[0]))id=parts[1]||'';
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))return {...unavailable('Link do YouTube sem ID de vídeo válido.'),url:u.href};
  return {kind:'iframe',provider:'YouTube',url:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0&playsinline=1',source:u.href};
 }
 if(googleDriveHosts.has(h)){
  const i=parts.indexOf('d');
  let driveId=i>=0&&parts[i+1]||'';
  if(!driveId&&parts[0]==='file'&&parts[1]==='d')driveId=parts[2]||'';
  if(!driveId)driveId=u.searchParams.get('id')||'';
  if(/^[-\w]{10,256}$/.test(driveId)&&(/^(?:file|open|uc|preview)/.test(parts[0]||'')||h==='drive.google.com')){
    return {kind:'iframe',provider:'Google Drive',url:'https://drive.google.com/file/d/'+encodeURIComponent(driveId)+'/preview',source:u.href,message:'O arquivo precisa estar compartilhado para visualização e permitir prévia.'};
  }
  return {...unavailable('Documentos do Google que não são arquivos de vídeo precisam ser abertos no serviço original.'),url:u.href};
 }
 if(vimeoHosts.has(h)){
  const videoId=(h==='player.vimeo.com'?parts[1]:parts[0])||'';
  if(/^\d{5,20}$/.test(videoId))return{kind:'iframe',provider:'Vimeo',url:'https://player.vimeo.com/video/'+videoId,source:u.href};
  return {...unavailable('Este link Vimeo não fornece ID de vídeo incorporável.'),url:u.href};
 }
 if(h==='photos.google.com'||h==='photos.app.goo.gl'||h==='one.google.com')return {...unavailable('Google Fotos não fornece um vídeo incorporável universal neste tipo de link.'),url:u.href};
 const ext=(u.pathname.toLowerCase().match(/\.([a-z0-9]+)$/)||[])[1]||'';
 let kind=extensions[ext];
 if(!kind&&u.searchParams.has('format')){
  const type=u.searchParams.get('format')?.toLowerCase();
  if(type==='m3u8')kind='hls';if(type==='mpd')kind='dash';
 }
 if(kind)return{kind,provider:kind==='hls'?'HLS':kind==='dash'?'MPEG-DASH':'Arquivo direto',url:u.href,source:u.href};
 return {...unavailable('Link reconhecido, mas sem formato incorporável. Abra na origem ou use MP4, HLS, DASH ou uma prévia pública do Drive/YouTube.'),url:u.href};
}
export async function resolveItem(item,{signStorage}={}){
 if(!item||typeof item!=='object')return {kind:'invalid',message:'Item inválido.'};
 if(item.type==='Livro'){
  const link=item.externalReadUrl||item.sourceUrl;
  return link?classifyLink(link):{kind:'unavailable',message:'Livro ainda indisponível.'};
 }
 const audio=item.type==='Música';
 const preferred=audio?
  ['authorizedAudioUrl','audioUrl','externalMusicUrl','sourceUrl','spotifyUrl']:
  ['authorizedVideoUrl','videoUrl','playbackUrl','sourceUrl','youtubeUrl'];
 const direct=audio?item.authorizedAudioUrl:item.authorizedVideoUrl;
 // A nonexplicit field requires evidence that this entry is authorized for streaming.
 const authorized=Boolean(item.publicDomain||item.sourceVerified||item.openFilm||item.officialEmbedded||
   item.license?.authorized||item.license?.status==='approved');
 if(direct){
  const result=classifyLink(String(direct),{audio});
  if(result.kind!=='invalid')return result;
 }
 const native=item.nativeAsset;
 const path=typeof native==='string'?native:(native?.url||native?.path||native?.storagePath||'');
 if(typeof path==='string'&&path.startsWith('cloud:')&&signStorage){
  const result=await signStorage(path);if(result)return classifyLink(result,{audio});
 }
 if(typeof path==='string'&&path.startsWith('https:'))return classifyLink(path,{audio});
 if(authorized){
  for(const key of preferred){
    const url=item[key];
    if(typeof url==='string'&&url){
      const result=classifyLink(url,{audio});
      if(result.kind!=='invalid'&&result.kind!=='external')return result;
    }
  }
 }
 return {kind:'unavailable',provider:'LX Plus',message:'Este item está em breve ou não tem uma fonte autorizada compatível.'};
}

// External scripts are pinned to known versions; they are loaded only when needed.
const hlsEsm='https://esm.sh/hls.js@1.7.3?bundle';
const dashEsm='https://esm.sh/dashjs@5.2.1?bundle';
const tryPlay=media=>media.play?.().catch(()=>{});
export async function attachPlayer(media,source,{onError=()=>{}}={}){
 if(!(media instanceof HTMLMediaElement))throw Error('Elemento de mídia não encontrado.');
 if(!source||!['video','audio','hls','dash'].includes(source.kind))throw Error('Formato de mídia inválido.');
 const url=safe(source.url);
 if(!url)throw Error('URL HTTPS inválida.');
 let library=null,closed=false;
 media.preload='metadata';
 media.addEventListener('error',()=>{if(!closed)onError('O navegador não conseguiu reproduzir este arquivo. Confira o link, formato, permissões e suporte a CORS.')},{once:true});
 if(source.kind==='hls'){
  if(media.canPlayType('application/vnd.apple.mpegurl')){
    media.src=url.href;tryPlay(media);
  }else{
    const mod=await import(hlsEsm),Hls=mod.default||mod.Hls;
    if(!Hls?.isSupported?.())throw Error('Este navegador não oferece suporte para HLS.');
    library=new Hls({enableWorker:true,lowLatencyMode:true});
    library.on(Hls.Events.ERROR,(_,details)=>{if(details.fatal&&!closed)onError('Fluxo HLS indisponível: '+(details.details||'verifique origem/CORS.'));});
    library.loadSource(url.href);library.attachMedia(media);
    library.on(Hls.Events.MANIFEST_PARSED,()=>{if(!closed)tryPlay(media)});
  }
 }else if(source.kind==='dash'){
  const mod=await import(dashEsm);
  const dashjs=mod.default?.MediaPlayer?mod.default:mod;
  if(!dashjs?.MediaPlayer)throw Error('Biblioteca MPEG-DASH indisponível.');
  library=dashjs.MediaPlayer().create();
  library.initialize(media,url.href,true);
  if(library.on&&dashjs.MediaPlayer.events?.ERROR)library.on(dashjs.MediaPlayer.events.ERROR,()=>{if(!closed)onError('Fluxo DASH indisponível ou bloqueado pela origem.')});
 }else{
  media.src=url.href;tryPlay(media);
 }
 return ()=>{
  closed=true;
  media.pause();
  try{library?.destroy?.()}catch{}
  try{library?.reset?.()}catch{}
  media.removeAttribute('src');media.load();
 };
}
