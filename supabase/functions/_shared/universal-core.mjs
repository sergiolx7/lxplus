// Shared, dependency-free contracts for the LX Universal Catalog and its tests.
export const KINDS = ['movie','series','anime','dorama','documentary','concert','track','album','artist','playlist','book','author','live'];
export const LABELS = {movie:'Filme',series:'Série',anime:'Anime',dorama:'Dorama',documentary:'Documentário',concert:'Show',track:'Música',album:'Álbum',artist:'Artista',playlist:'Playlist',book:'Livro',author:'Autor',live:'Ao Vivo'};
export const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const text = (v,n=1000) => String(v ?? '').replace(/<[^>]*>/g,'').trim().slice(0,n);
export const list = v => Array.isArray(v) ? v : [];
export const integer = (v,min=0,max=1e9) => Math.max(min,Math.min(max,Math.floor(Number(v)||0)));
export class CatalogError extends Error { constructor(code,status=400){super(code);this.code=code;this.status=status;} }
export function publicUrl(value) {
  try {
    const u=new URL(String(value));const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
    if(u.protocol!=='https:'||u.username||u.password||u.port && u.port!=='443')return '';
    if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||!h.includes('.')||h.includes(':'))return '';
    if(/^\d+\.\d+\.\d+\.\d+$/.test(h))return ''; // All literal IPs are refused, including alternative URL encodings.
    return u.href;
  }catch{return '';}
}
export function allowedUrl(value,hosts=[]) {
  const url=publicUrl(value);if(!url)return '';
  const host=new URL(url).hostname;
  return hosts.some(h=>host===String(h).trim().toLowerCase()) ? url : '';
}
export function safeExternal(value) {
  const url=publicUrl(value);if(!url)return '';
  const u=new URL(url);
  for(const k of [...u.searchParams.keys()])if(/token|secret|signature|auth|credential|api.?key/i.test(k)||/^key$/i.test(k))u.searchParams.delete(k);
  return u.href;
}
export function externalId(provider,namespace,id){return {provider,namespace,external_id:String(id)};}
export function parseReference(input) {
  if(input && typeof input==='object' && !Array.isArray(input)) {
    const provider=text(input.provider,32),namespace=text(input.namespace,32),id=text(input.id ?? input.external_id,160);
    if(provider==='legacy' && /^\d{1,16}$/.test(id))return {provider,namespace:'catalog',id};
    if(provider==='tmdb' && ['movie','tv'].includes(namespace) && /^\d{1,10}$/.test(id))return {provider,namespace,id};
    if(provider==='imdb' && /^tt\d{5,12}$/.test(id))return {provider,namespace:'title',id};
    if(provider==='googlebooks' && /^[\w-]{3,80}$/.test(id))return {provider,namespace:'volume',id};
    if(provider==='openlibrary' && /^OL\d+[WA]$/.test(id))return {provider,namespace:id.endsWith('A')?'author':'work',id};
    if(provider==='musicbrainz' && ['recording','release','artist'].includes(namespace) && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return {provider,namespace,id:id.toLowerCase()};
    if(provider==='plex' && ['movie','show'].includes(namespace) && /^[a-z0-9][a-z0-9-]{0,159}$/.test(id))return {provider,namespace,id,url:`https://watch.plex.tv/pt-BR/${namespace}/${id}`};
    throw new CatalogError('UNSUPPORTED_REFERENCE');
  }
  const raw=String(input||'').trim();
  if(/^(tmdb):(movie|tv):\d+$/.test(raw)){const [provider,namespace,id]=raw.split(':');return parseReference({provider,namespace,id});}
  if(/^tt\d{5,12}$/.test(raw))return parseReference({provider:'imdb',id:raw});
  const url=publicUrl(raw);if(!url)throw new CatalogError('UNSUPPORTED_URL');
  const u=new URL(url),host=u.hostname.replace(/^www\./,'');let m;
  if(host==='themoviedb.org' && (m=u.pathname.match(/^\/(movie|tv)\/(\d+)(?:-|\/|$)/)))return parseReference({provider:'tmdb',namespace:m[1],id:m[2]});
  if(host==='imdb.com' && (m=u.pathname.match(/^\/title\/(tt\d+)/)))return parseReference({provider:'imdb',id:m[1]});
  if(/^books\.google\.(?:com|com\.br)$/.test(host) && u.searchParams.get('id'))return parseReference({provider:'googlebooks',id:u.searchParams.get('id')});
  if(host==='openlibrary.org' && (m=u.pathname.match(/^\/(?:works|authors)\/(OL\d+[WA])(?:\/|$)/)))return parseReference({provider:'openlibrary',id:m[1]});
  if(host==='musicbrainz.org' && (m=u.pathname.match(/^\/(recording|release|artist)\/([a-f0-9-]{36})/i)))return parseReference({provider:'musicbrainz',namespace:m[1],id:m[2]});
  if(host==='watch.plex.tv' && (m=u.pathname.match(/^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?(movie|show)\/([a-z0-9-]+)\/?$/)))return parseReference({provider:'plex',namespace:m[1],id:m[2]});
  throw new CatalogError('UNSUPPORTED_URL');
}
const tmdbImage=(path,size='w500')=>/^\/[\w.-]+$/.test(path||'') ? `https://image.tmdb.org/t/p/${size}${path}` : '';
export function tmdbItem(d,namespace='movie') {
  const countries=list(d.origin_country).length?d.origin_country:list(d.production_countries).map(c=>c.iso_3166_1);
  const genreIds=list(d.genre_ids).length?d.genre_ids:list(d.genres).map(g=>g.id);
  const anime=genreIds.includes(16)&&(countries.includes('JP')||d.original_language==='ja');
  const drama=namespace==='tv'&&!anime&&genreIds.includes(18)&&countries.some(c=>['KR','JP','CN','TW','TH'].includes(c));
  const kind=anime?'anime':drama?'dorama':genreIds.includes(99)?'documentary':namespace==='tv'?'series':'movie';
  const date=d.release_date||d.first_air_date||'';
  const cast=list(d.credits?.cast||d.aggregate_credits?.cast).slice(0,24).map(p=>({id:p.id,name:text(p.name,150),character:text(p.character||p.roles?.[0]?.character,150),image:tmdbImage(p.profile_path,'w185')}));
  const directors=list(d.credits?.crew).filter(p=>p.job==='Director').map(p=>text(p.name,150));
  const trailers=list(d.videos?.results).filter(v=>v.site==='YouTube'&&/^[\w-]{11}$/.test(v.key)).map(v=>({title:text(v.name,200),url:`https://www.youtube.com/watch?v=${v.key}`,type:v.type}));
  const ids=[externalId('tmdb',namespace,d.id)];const imdb=d.imdb_id||d.external_ids?.imdb_id;if(/^tt\d+$/.test(imdb||''))ids.push(externalId('imdb','title',imdb));
  const certification=namespace==='movie'?d.release_dates?.results?.find(r=>r.iso_3166_1==='BR')?.release_dates?.find(r=>r.certification)?.certification:d.content_ratings?.results?.find(r=>r.iso_3166_1==='BR')?.rating;
  const seasons=list(d.seasons).map(s=>({number:integer(s.season_number),title:text(s.name,200),description:text(s.overview,8000),cover:tmdbImage(s.poster_path),episodes:integer(s.episode_count),release_date:s.air_date||null}));
  return {kind,title:text(d.title||d.name,400),original_title:text(d.original_title||d.original_name,400),description:text(d.overview,20000),cover:tmdbImage(d.poster_path),backdrop:tmdbImage(d.backdrop_path,'w1280'),logo:tmdbImage(list(d.images?.logos).find(i=>i.iso_639_1==='pt')?.file_path||d.images?.logos?.[0]?.file_path),year:integer(date.slice(0,4)),release_date:date||null,genres:list(d.genres).map(g=>g.name),countries,language:d.original_language||'',rating:Number(d.vote_average)||0,popularity:Number(d.popularity)||0,duration:integer(d.runtime||d.episode_run_time?.[0]),certification:text(certification,20),tags:[...(anime?['Anime']:[]),...(drama?[{'KR':'K-Drama','JP':'J-Drama','CN':'C-Drama','TW':'T-Drama','TH':'T-Drama'}[countries.find(c=>['KR','JP','CN','TW','TH'].includes(c))]]:[])],external_ids:ids,seasons,metadata:{tmdb_kind:namespace,cast,directors,creators:list(d.created_by).map(p=>p.name),companies:list(d.production_companies).map(p=>p.name),spoken_languages:list(d.spoken_languages),status:d.status||'',episode_count:d.number_of_episodes||0,next_episode:d.next_episode_to_air||null,collection:d.belongs_to_collection||null,trailers,similar:list(d.similar?.results).slice(0,12).map(r=>tmdbCard(r,namespace)),recommendations:list(d.recommendations?.results).slice(0,12).map(r=>tmdbCard(r,namespace)),keywords:list(d.keywords?.keywords||d.keywords?.results).map(k=>k.name)},provider_links:[{provider:'tmdb',url:`https://www.themoviedb.org/${namespace}/${d.id}`,label:'Ver no TMDB'}]};
}
export function tmdbCard(d,namespace){const x=tmdbItem({...d,similar:null,recommendations:null},namespace);delete x.seasons;delete x.metadata;return x;}
export function googleBook(d) {
  const v=d.volumeInfo||{},ids=[externalId('googlebooks','volume',d.id)];
  list(v.industryIdentifiers).filter(i=>/^ISBN/.test(i.type)).forEach(i=>ids.push(externalId('isbn','book',String(i.identifier).replace(/[^0-9X]/gi,''))));
  return {kind:'book',title:text(v.title,400),description:text(v.description,20000),cover:publicUrl(String(v.imageLinks?.thumbnail||v.imageLinks?.smallThumbnail||'').replace(/^http:/,'https:')),year:integer(v.publishedDate?.slice(0,4)),release_date:/^\d{4}-\d{2}-\d{2}$/.test(v.publishedDate||'')?v.publishedDate:null,language:v.language||'',genres:list(v.categories),external_ids:ids,metadata:{subtitle:text(v.subtitle,400),authors:list(v.authors),publisher:text(v.publisher,400),pages:integer(v.pageCount),isbn:ids.filter(i=>i.provider==='isbn').map(i=>i.external_id)},provider_links:[{provider:'googlebooks',url:safeExternal(v.infoLink)||`https://books.google.com/books?id=${encodeURIComponent(d.id)}`,label:'Ver no Google Books'}]};
}
export function openBook(d) {
  const id=String(d.key||'').split('/').pop(),description=typeof d.description==='object'?d.description?.value:d.description;
  return {kind:'book',title:text(d.title,400),description:text(description||d.first_sentence?.[0],20000),cover:d.cover_i||d.covers?.[0]?`https://covers.openlibrary.org/b/id/${integer(d.cover_i||d.covers[0])}-L.jpg`:'',year:integer(d.first_publish_year||String(d.first_publish_date||'').match(/\d{4}/)?.[0]),genres:list(d.subject||d.subjects).slice(0,10),external_ids:[externalId('openlibrary','work',id),...list(d.isbn).slice(0,3).map(v=>externalId('isbn','book',String(v).replace(/[^0-9X]/gi,'')))],metadata:{authors:list(d.author_name),author_refs:list(d.authors),publisher:list(d.publisher)[0]||'',pages:integer(d.number_of_pages_median)},provider_links:[{provider:'openlibrary',url:`https://openlibrary.org/works/${id}`,label:'Ver na Open Library'}]};
}
export function musicItem(d,namespace='recording') {
  const credit=list(d['artist-credit']),artists=credit.map(c=>({name:text(c.name||c.artist?.name,200),id:c.artist?.id}));
  const release=list(d.releases)[0],date=d['first-release-date']||d.date||release?.date||'';
  const id=externalId('musicbrainz',namespace,d.id);
  return {kind:namespace==='artist'?'artist':namespace==='release'?'album':'track',title:text(d.title||d.name,400),original_title:text(d['sort-name'],400),description:text(d.disambiguation,8000),year:integer(date.slice(0,4)),duration:namespace==='recording'?integer((d.length||0)/1000):0,genres:list(d.genres).map(g=>g.name),external_ids:[id,...list(d.isrcs).map(v=>externalId('isrc','track',v))],metadata:{artists,artist:artists.map(a=>a.name).join(', '),album:release?.title||'',release_id:release?.id||'',explicit:typeof d.explicit==='boolean'?d.explicit:null,track_number:integer(d.track_number||list(release?.media).flatMap(m=>list(m.tracks)).find(t=>t.recording?.id===d.id)?.position)||null,album_type:d['release-group']?.['primary-type']||d.type||'',country:d.country||d.area?.name||'',tags:list(d.tags).map(t=>t.name),tracks:list(d.media).flatMap(m=>list(m.tracks).map(t=>({title:text(t.title,400),number:t.position,duration:integer((t.length||0)/1000),recording_id:t.recording?.id})))},provider_links:[{provider:'musicbrainz',url:`https://musicbrainz.org/${namespace}/${d.id}`,label:'Ver no MusicBrainz'}]};
}
export function openAuthor(d) {
  const id=String(d.key||'').split('/').pop(),bio=typeof d.bio==='object'?d.bio.value:d.bio;
  return {kind:'author',title:text(d.name,400),description:text(bio,20000),cover:d.photos?.[0]>0?`https://covers.openlibrary.org/a/id/${integer(d.photos[0])}-L.jpg`:'',genres:list(d.top_subjects).slice(0,10),external_ids:[externalId('openlibrary','author',id)],metadata:{alternate_names:list(d.alternate_names),birth_date:text(d.birth_date,80),death_date:text(d.death_date,80),top_work:text(d.top_work,400),work_count:integer(d.work_count)},provider_links:[{provider:'openlibrary',url:`https://openlibrary.org/authors/${id}`,label:'Ver autor na Open Library'}]};
}
export function legacyItem(row) {
  const d=row.payload||{},type=Object.entries(LABELS).find(([,v])=>v===d.type)?.[0]||'movie';
  const x={kind:type,title:text(d.title,400),description:text(d.desc,20000),cover:publicUrl(d.cover),backdrop:publicUrl(d.banner),year:integer(d.year),duration:integer(d.duration),genres:list(d.genres).length?d.genres:[d.genre].filter(Boolean),external_ids:[externalId('legacy','catalog',row.id)],legacy_id:String(row.id),published:row.published,metadata:{artist:text(d.artist,400),authors:[d.author].filter(Boolean),album:text(d.album,400),directors:[d.director].filter(Boolean),creators:[d.creator].filter(Boolean),cast:list(d.cast).map(name=>({name:text(name,200)}))},provider_links:[]};
  const remote=d.tmdbId||(/tmdb/i.test(d.metadataProvider||'')?d.remoteId:null);
  if(remote)x.external_ids.push(externalId('tmdb',type==='movie'?'movie':'tv',remote));
  return x;
}
export function metadataOnly(item) {
  const allowed=['kind','title','original_title','description','cover','backdrop','logo','year','release_date','genres','countries','language','rating','popularity','duration','certification','tags','metadata','legacy_id','published'];
  return Object.fromEntries(allowed.filter(k=>item[k]!==undefined).map(k=>[k,item[k]]));
}
export function mergeCards(rows) {
  const out=[],seen=new Map();
  for(const row of rows){const ids=list(row.external_ids).map(i=>`${i.provider}:${i.namespace}:${i.external_id}`);const match=ids.map(i=>seen.get(i)).find(Boolean);
    if(match){if(row.legacy_id&&!match.legacy_id)Object.assign(match,row);for(const id of ids)seen.set(id,match);continue;}
    out.push(row);ids.forEach(id=>seen.set(id,row));}
  return out;
}
const statusWeight={online:0,slow:1,unknown:2};
export function rankSources(sources,{region='BR',episode=null,exclude=[],now=Date.now()}={}) {
  const priorities={lx:0,direct:1,hls:2,dash:2,storage:3,drive:3,embed:4,external:5};
  return list(sources).filter(s=>!exclude.includes(s.id)&&s.authorized===true&&s.drm==='none'&&Object.hasOwn(statusWeight,s.status)&&(!s.expires_at||+new Date(s.expires_at)>now)&&(!s.region?.length||s.region.includes(region))&&(!s.episode_id||s.episode_id===episode)&&(!episode||s.episode_id===episode)&&!s.requirements?.partner_player&&!s.requirements?.advertisements)
    .sort((a,b)=>(priorities[a.source_type]??9)-(priorities[b.source_type]??9)||(statusWeight[a.status]-statusWeight[b.status])||(a.priority||0)-(b.priority||0)||(a.latency_ms||0)-(b.latency_ms||0));
}
export function healthStatus(status,elapsed,expiresAt) {
  if(expiresAt&&+new Date(expiresAt)<=Date.now())return 'expired';
  if(status===401||status===403)return 'unauthorized';if(status===451)return 'region_blocked';
  if(status>=200&&status<400)return elapsed>2500?'slow':'online';
  if(status===404||status===410)return 'offline';return 'error';
}
export function parseImportText(raw,format='lines') {
  if(String(raw).length>2_000_000)throw new CatalogError('IMPORT_TOO_LARGE',413);
  if(format==='json'){let data;try{data=JSON.parse(raw);}catch{throw new CatalogError('INVALID_JSON');}if(!Array.isArray(data))data=data.items;if(!Array.isArray(data))throw new CatalogError('INVALID_IMPORT');return data;}
  if(format==='csv'){
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<String(raw).length;i++){const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if((c===','||c===';'||c==='\n')&&!quoted){row.push(cell.trim());cell='';if(c==='\n'){rows.push(row);row=[];}}else if(c!=='\r')cell+=c;}
    if(quoted)throw new CatalogError('INVALID_CSV');if(cell||row.length){row.push(cell.trim());rows.push(row);}
    const head=(rows[0]||[]).map(norm),col=head.findIndex(v=>['url','reference','referencia','id'].includes(v));
    return (col>=0?rows.slice(1):rows).map(r=>r[col>=0?col:0]).filter(Boolean);
  }
  return String(raw).split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
}
