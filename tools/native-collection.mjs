import {validateFilm} from './open-film-catalog.mjs';
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
export function validateCollection(feed){
 if(!Array.isArray(feed?.items)||!Array.isArray(feed?.books)||feed.items.length+feed.books.length>100)throw new Error('INVALID_COLLECTION');
 const ids=new Set();
 for(const item of feed.items){
  if(!Number.isSafeInteger(item.id)||ids.has(item.id)||item.id<=0)throw new Error('INVALID_ID');ids.add(item.id);
  if(item.type==='Filme'){validateFilm(item);continue}
  const url=https(item.mediaKey)?new URL(item.mediaKey):null;
  if(item.type!=='Música'||!item.title||item.artist!=='Kevin MacLeod'||item.license?.url!=='https://creativecommons.org/licenses/by/4.0/'||item.license?.evidenceUrl!=='https://incompetech.com/music/royalty-free/licenses/'||!item.sourceVerified||item.playbackMode!=='native_owned'||item.authorizedAudioUrl!==item.mediaKey||!url||url.hostname!=='ubidogquzpdvrbzbhxda.supabase.co'||!/^\/storage\/v1\/object\/public\/lx-assets\/licensed\/20261007\/music\/USUAN\d+\.mp3$/.test(url.pathname)||!item.nativeAsset||!/^[a-f0-9]{64}$/.test(item.nativeAsset.sha256)||item.nativeAsset.bytes<100||item.nativeAsset.bytes>25000000||item.tracks?.length!==1||item.tracks[0].mediaKey!==item.mediaKey||!(item.duration>0))throw new Error('UNVERIFIED_MP3');
 }
 for(const book of feed.books){
  const asset=book.patch?.textAsset,url=https(asset?.url)?new URL(asset.url):null;
  if(!Number.isSafeInteger(book.id)||ids.has(book.id)||!url||url.hostname!=='ubidogquzpdvrbzbhxda.supabase.co'||!/^\/storage\/v1\/object\/public\/lx-assets\/licensed\/20261007\/books\/\d+\.txt$/.test(url.pathname)||asset.bytes<100||asset.bytes>4194304||!/^[a-f0-9]{64}$/.test(asset.sha256)||book.patch.publicDomainRegion!=='BR'||book.patch.publicDomain!==true||book.patch.playbackMode!=='native_text'||book.patch.freeAccess!==true||!book.patch.license?.creator)throw new Error('UNVERIFIED_BOOK');ids.add(book.id);
 }
}
export function nativeCollectionSql(feed,snapshot){
 validateCollection(feed);
 if(!Number.isSafeInteger(snapshot.count)||!/^[a-f0-9]{32}$/.test(snapshot.fingerprint))throw new Error('INVALID_SNAPSHOT');
 const updates=feed.books.map(book=>({...book,expected_hash:snapshot.bookHashes?.[book.id]}));
 if(updates.some(book=>!/^[a-f0-9]{32}$/.test(book.expected_hash||'')))throw new Error('BOOK_NOT_IN_SNAPSHOT');
 const input=JSON.stringify({inserts:feed.items,updates});if(input.includes('$lx_native_collection$'))throw new Error('INVALID_DELIMITER');
 return `begin;
lock table public.lx_catalog in share row exclusive mode;
with input as(select $lx_native_collection$${input}$lx_native_collection$::jsonb d),
new as(select value p from input,jsonb_array_elements(d->'inserts')),
patch as(select value p from input,jsonb_array_elements(d->'updates')),
guard as(select (select count(*) from public.lx_catalog)=${snapshot.count}
 and (select md5(string_agg(id::text||payload::text||published::text||updated_at::text,'' order by id)) from public.lx_catalog)='${snapshot.fingerprint}'
 and (select count(*) from public.lx_catalog)+(select count(*) from new)<=2500
 and not exists(select 1 from new n join public.lx_catalog c on c.id=(n.p->>'id')::bigint or c.payload->>'externalId'=n.p->>'externalId')
 and (select count(*) from patch p join public.lx_catalog c on c.id=(p.p->>'id')::bigint and md5(c.payload::text||c.published::text)=p.p->>'expected_hash' and c.payload->>'type'='Livro' and c.payload->>'metadataProvider'='Project Gutenberg' and coalesce(c.payload->>'mediaKey','')='')=${updates.length} as safe),
added as(insert into public.lx_catalog(id,payload,published,updated_at) select (n.p->>'id')::bigint,n.p,true,now() from new n,guard g where g.safe returning id),
changed as(update public.lx_catalog c set payload=c.payload||(p.p->'patch'),updated_at=now() from patch p,guard g where g.safe and c.id=(p.p->>'id')::bigint returning c.id)
select safe,(select count(*) from added) inserted,(select count(*) from changed) updated from guard;
commit;`;
}
