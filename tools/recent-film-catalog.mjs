/** Insert-only import of complete films embedded from verified official channels. */
const channels=new Set(['https://www.youtube.com/@FilmelierTVBR','https://www.youtube.com/@AdrenalinaPuraTVBR','https://www.youtube.com/@O2PlayFilmes','https://www.youtube.com/@O2Playfilmes']);
const norm=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const identity=item=>`${norm(item.title)}|${item.year||''}`;
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
export const snapshotHashSql="md5(string_agg(id::text||':'||md5(payload::text)||':'||published::text||':'||coalesce(updated_at::text,''),'|' order by id))";
export function validateRecentFilm(item){
 const proof=item?.officialEmbedEvidence,videoId=String(item?.mediaKey||'').match(/^youtube:([\w-]{11})$/)?.[1];
 if(!Number.isSafeInteger(item?.id)||item.id<=0||item.type!=='Filme'||!String(item.title||'').trim()||!Number.isInteger(item.year)||item.year<2020||!https(item.cover)||!https(item.metadataUrl)||!item.officialEmbedded||!item.sourceVerified||!item.sourceProvider||item.published!==true||item.catalogOnly!==false||item.metadataOnly!==false||item.availability!=='available'||item.playbackMode!=='official_embed'||!videoId||item.externalId!==item.mediaKey)throw new Error('UNVERIFIED_OFFICIAL_FILM');
 if(!Number.isInteger(item.durationSeconds)||item.durationSeconds<4200||item.durationSeconds>18000||!proof||proof.videoId!==videoId||proof.durationSeconds!==item.durationSeconds||proof.sourceUrl!=='https://www.youtube.com/watch?v='+videoId||!channels.has(proof.channelUrl)||proof.embedConfirmed!==true||proof.availableInBrazil!==true||!Number.isFinite(Date.parse(proof.checkedAt))||!Number.isFinite(Date.parse(proof.regionalCheckAt)))throw new Error('UNVERIFIED_COMPLETE_EMBED');
}
export function prepareRecentFilms(items,snapshot){
 const seen=new Set(),inserts=[],skipped=[];
 for(const item of items){
  validateRecentFilm(item);const key=identity(item);
  if(seen.has(key))throw new Error('DUPLICATE_FEED_TITLE');seen.add(key);
  const existing=snapshot.rows.find(row=>Number(row.id)===item.id||row.payload?.mediaKey===item.mediaKey||row.payload?.externalId===item.externalId||identity(row.payload||{})===key);
  if(existing){skipped.push({id:item.id,title:item.title,existingId:existing.id,reason:'existing_record_preserved'});continue}
  inserts.push(item);
 }
 return {inserts,skipped};
}
export function recentFilmSql(plan,snapshot,{maximumTotal=2500}={}){
 const items=plan.inserts;if(!items?.length||items.length>50)throw new Error('INVALID_BATCH_SIZE');items.forEach(validateRecentFilm);
 if(!/^[a-f0-9]{32}$/.test(snapshot.hash||'')||!Number.isSafeInteger(snapshot.count)||snapshot.count!==snapshot.rows.length||!Number.isSafeInteger(maximumTotal))throw new Error('INVALID_SNAPSHOT');
 const input=JSON.stringify(items);if(input.includes('$lx_recent_films$'))throw new Error('INVALID_DELIMITER');
 return `begin;
lock table public.lx_catalog in share row exclusive mode;
with input as(select value p from jsonb_array_elements($lx_recent_films$${input}$lx_recent_films$::jsonb)),
guard as(select (select count(*) from public.lx_catalog)=${snapshot.count}
 and (select ${snapshotHashSql} from public.lx_catalog)='${snapshot.hash}'
 and (select count(*) from public.lx_catalog)+(select count(*) from input)<=${maximumTotal}
 and not exists(select 1 from input n join public.lx_catalog c on c.id=(n.p->>'id')::bigint or c.payload->>'externalId'=n.p->>'externalId' or c.payload->>'mediaKey'=n.p->>'mediaKey') as safe),
added as(insert into public.lx_catalog(id,payload,published,updated_at)select (n.p->>'id')::bigint,n.p,true,now() from input n,guard g where g.safe returning id)
select safe,(select count(*) from added) as inserted,(select jsonb_agg(id) from added) as inserted_ids from guard;
commit;`;
}
