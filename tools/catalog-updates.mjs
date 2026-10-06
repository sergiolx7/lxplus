import {compactPublicMetadata} from './compact-public-metadata.mjs';
/** Guarded updates to imported rows; original owner catalog rows are excluded. */
export function catalogUpdateSql(updates,baseline,{officialMusic=false}={}){
 if(!Array.isArray(updates)||!updates.length||updates.length>50||!/^[a-f0-9]{32}$/.test(baseline?.fingerprint||'')||!Array.isArray(baseline?.original_ids)||!Number.isSafeInteger(baseline.original_count)||baseline.original_count!==baseline.original_ids.length)throw new Error('INVALID_UPDATE_BATCH');
 const originals=baseline.original_ids.map(id=>{if(!Number.isSafeInteger(id)||id<=0)throw new Error('INVALID_BASELINE');return id;});
 for(const x of updates){
  if(!Number.isSafeInteger(x.id)||x.id<=0||originals.includes(x.id)||x.payload?.id!==x.id||x.payload?.catalogOnly!==true||!/^[a-f0-9]{32}$/.test(x.expected_hash||''))throw new Error('ORIGINAL_OR_INVALID_TARGET');
  if(officialMusic){const p=x.payload,id=p.youtubeVideoId;if(p.type!=='Música'||!/^[-\w]{11}$/.test(id||'')||p.mediaKey!==`youtube:${id}`||p.externalMusicUrl!==`https://www.youtube.com/watch?v=${id}`||p.metadataOnly!==false||p.availability!=='available'||p.sourceVerified!==true||p.authorizedAudioUrl)throw new Error('UNVERIFIED_MUSIC_SOURCE');}
  else compactPublicMetadata(x.payload);
 }
 const json=JSON.stringify(updates);if(json.includes('$lx_update$'))throw new Error('INVALID_DELIMITER');
 return `begin;
lock table public.lx_catalog in share row exclusive mode;
with incoming as (select value from jsonb_array_elements($lx_update$${json}$lx_update$::jsonb)),
guard as (select
 (select count(*) from public.lx_catalog where id in (${originals.join(',')}))=${baseline.original_count}
 and (select md5(string_agg(id::text||payload::text||published::text,'' order by id)) from public.lx_catalog where id in (${originals.join(',')}))='${baseline.fingerprint}' as originals_unchanged,
 (select count(*) from incoming i join public.lx_catalog c on c.id=(i.value->>'id')::bigint where md5(c.payload::text||c.published::text)=i.value->>'expected_hash')=${updates.length} as targets_unchanged),
updated as (update public.lx_catalog c set payload=i.value->'payload',updated_at=now() from incoming i,guard g
 where c.id=(i.value->>'id')::bigint and g.originals_unchanged and g.targets_unchanged returning c.id)
select originals_unchanged,targets_unchanged,(select count(*) from updated) as updated from guard;
commit;`;
}
