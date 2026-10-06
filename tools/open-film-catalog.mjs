/** Guarded batch import of already-probed, licensed remote full films. */
const norm=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const identity=item=>`${norm(item.title)}|${item.year||''}`;
const validUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
export function validateFilm(item){
 const p=item?.openFilmEvidence?.streamProbe,l=item?.license;
 if(!Number.isSafeInteger(item?.id)||item.id<=0||item.type!=='Filme'||!item.title||!validUrl(item.cover)||!validUrl(item.mediaKey)||!item.openFilm||!item.sourceVerified||item.availability!=='available'||item.playbackMode!=='native_remote'||!l?.creator&&!item.sourceProvider||!validUrl(l?.url)||!validUrl(l?.evidenceUrl)||!validUrl(l?.sourceUrl)||p?.status!==206||p.url!==item.mediaKey||!/^bytes 0-/.test(p.contentRange||'')||!['h.264','h.264 hd','h.264 ia','mpeg4','512kb mpeg4'].includes(String(item.openFilmEvidence?.fileFormat||'').toLowerCase()))throw new Error('UNVERIFIED_OPEN_FILM');
 const host=new URL(item.mediaKey).hostname;if(!['archive.org','download.blender.org'].includes(host))throw new Error('UNAPPROVED_STREAM_HOST');
 const codec=item.openFilmEvidence?.codecProbe;if(codec?.videoCodec!=='h264'||!['aac','mp3','none'].includes(codec.audioCodec)||codec.status!=='verified'||codec.decodedFirstFrame!==true||codec.url!==item.mediaKey||!(codec.durationSeconds>0))throw new Error('UNVERIFIED_BROWSER_CODEC');
 const license=new URL(l.url);if(license.hostname!=='creativecommons.org'||!/^\/(?:licenses\/(?:by|by-sa|by-nd)\/(?:1\.0|2\.0|2\.5|3\.0|4\.0)(?:\/us)?|licenses\/publicdomain|publicdomain\/zero\/1\.0)\/$/.test(license.pathname))throw new Error('UNAPPROVED_LICENSE');
}
export function prepareOpenFilms(items,snapshot,originalIds=[]){
 const original=new Set(originalIds.map(Number)),byTitle=new Map(),seen=new Set(),inserts=[],updates=[],skipped=[];
 for(const row of snapshot.rows){if(row.payload?.type==='Filme'){const k=identity(row.payload);if(!byTitle.has(k))byTitle.set(k,[]);byTitle.get(k).push(row)}}
 for(const item of items){
  validateFilm(item);const key=identity(item);if(seen.has(key)){skipped.push({id:item.id,title:item.title,reason:'duplicate_in_feed'});continue}seen.add(key);
  const exact=snapshot.rows.find(r=>r.id===item.id||r.payload?.externalId===item.externalId);
  const candidates=exact?[exact]:byTitle.get(key)||[];
  if(candidates.length>1){skipped.push({id:item.id,title:item.title,reason:'ambiguous_existing_titles'});continue}
  const target=candidates[0];
  if(target){
   if(original.has(Number(target.id))||target.payload.mediaKey||target.payload.authorizedVideoUrl||target.payload.authorizedStreamUrl){skipped.push({id:target.id,title:item.title,reason:'existing_source_or_owner_original'});continue}
   const {mediaKey,authorizedVideoUrl,license,openFilmEvidence,sourceVerified,sourceVerifiedAt,playbackMode}=item;
   updates.push({id:target.id,expected_hash:target.expected_hash,published:target.published,payload:{...target.payload,mediaKey,authorizedVideoUrl,license,openFilmEvidence,sourceVerified,sourceVerifiedAt,playbackMode,openFilm:true,catalogOnly:false,metadataOnly:false,availability:'available'}});
  }else{
   if(snapshot.rows.some(r=>Number(r.id)===item.id))throw new Error('ID_COLLISION');inserts.push(item);
  }
 }
 return {inserts,updates,skipped};
}
export function openFilmSql(plan,snapshot,{maximumTotal=2500}={}){
 const {inserts=[],updates=[]}=plan;if(!inserts.length&&!updates.length)throw new Error('EMPTY_BATCH');if(inserts.length+updates.length>100)throw new Error('BATCH_TOO_LARGE');
 if(!/^[a-f0-9]{32}$/.test(snapshot.fingerprint)||!Number.isSafeInteger(snapshot.rows.length)||!Number.isSafeInteger(maximumTotal))throw new Error('INVALID_SNAPSHOT');
 inserts.forEach(validateFilm);for(const x of updates){validateFilm(x.payload);if(!/^[a-f0-9]{32}$/.test(x.expected_hash||''))throw new Error('INVALID_TARGET_HASH')}
 const input=JSON.stringify({inserts,updates});if(input.includes('$lx_open_film$'))throw new Error('INVALID_DELIMITER');
 return `begin;
lock table public.lx_catalog in share row exclusive mode;
with input as(select $lx_open_film$${input}$lx_open_film$::jsonb as d),
new as(select value p from input,jsonb_array_elements(d->'inserts')),
patch as(select value p from input,jsonb_array_elements(d->'updates')),
guard as(select (select count(*) from public.lx_catalog)=${snapshot.rows.length}
 and (select md5(string_agg(id::text||payload::text||published::text||updated_at::text,'' order by id)) from public.lx_catalog)='${snapshot.fingerprint}'
 and (select count(*) from public.lx_catalog)+(select count(*) from new)<=${maximumTotal}
 and not exists(select 1 from new n join public.lx_catalog c on c.id=(n.p->>'id')::bigint or c.payload->>'externalId'=n.p->>'externalId')
 and (select count(*) from patch p join public.lx_catalog c on c.id=(p.p->>'id')::bigint and md5(c.payload::text||c.published::text)=p.p->>'expected_hash')=${updates.length} as safe),
added as(insert into public.lx_catalog(id,payload,published,updated_at)select (n.p->>'id')::bigint,n.p,true,now() from new n,guard g where g.safe returning id),
changed as(update public.lx_catalog c set payload=p.p->'payload',updated_at=now() from patch p,guard g where g.safe and c.id=(p.p->>'id')::bigint returning c.id)
select safe,(select count(*) from added) as inserted,(select count(*) from changed) as updated,(select jsonb_agg(id) from added) as inserted_ids,(select jsonb_agg(id) from changed) as updated_ids from guard;
commit;`;
}
