/** Add metadata-only legacy rows without modifying existing records or schema. */
export function populationSql(items, baseline, { maximumTotal = 1000 } = {}) {
  if (!Array.isArray(items) || !items.length || items.length > 50) throw new Error('INVALID_BATCH_SIZE');
  if (!/^[a-f0-9]{32}$/.test(baseline?.fingerprint || '')) throw new Error('INVALID_BASELINE');
  if (!Array.isArray(baseline?.original_ids) || !Number.isSafeInteger(baseline.original_count) || baseline.original_count !== baseline.original_ids.length) throw new Error('INVALID_BASELINE');
  const ids = baseline.original_ids.map(id => { if (!Number.isSafeInteger(id) || id <= 0) throw new Error('INVALID_ORIGINAL_ID'); return id; });
  if (!Number.isSafeInteger(maximumTotal) || maximumTotal < baseline.original_count) throw new Error('INVALID_CATALOG_LIMIT');
  for (const x of items) {
    if (!Number.isSafeInteger(x.id) || x.id <= 0 || !x.title || !/^https:\/\//.test(x.cover || '') || !x.externalId || !x.catalogIdentity || x.catalogOnly !== true || x.metadataOnly !== true || x.availability !== 'coming_soon' || x.mediaKey || x.externalMusicUrl || x.externalReadUrl || (x.episodes || []).some(e => e.mediaKey) || (x.tracks || []).some(t => t.mediaKey || t.url || t.authorizedAudioUrl)) throw new Error('INVALID_METADATA_ONLY_ITEM');
  }
  const json = JSON.stringify(items);
  if (json.includes('$lx_population$')) throw new Error('INVALID_DELIMITER');
  return `begin;
lock table public.lx_catalog in share row exclusive mode;
with incoming as (select value as payload from jsonb_array_elements($lx_population$${json}$lx_population$::jsonb)),
eligible as (select payload from incoming i where not exists (
 select 1 from public.lx_catalog c where c.id=(i.payload->>'id')::bigint
 or c.payload->>'externalId'=i.payload->>'externalId'
 or c.payload->>'catalogIdentity'=i.payload->>'catalogIdentity'
 or c.payload->>'metadataUrl'=i.payload->>'metadataUrl'
)),
guard as (select
 (select md5(string_agg(id::text||payload::text||published::text,'' order by id)) from public.lx_catalog where id in (${ids.join(',')}))='${baseline.fingerprint}'
 and (select count(*) from public.lx_catalog where id in (${ids.join(',')}))=${baseline.original_count} as originals_unchanged,
 (select count(*) from public.lx_catalog)+(select count(*) from eligible)<=${maximumTotal} as within_limit),
inserted as (insert into public.lx_catalog(id,payload,published,updated_at)
 select (payload->>'id')::bigint,payload,true,now() from eligible,guard where guard.originals_unchanged and guard.within_limit
 on conflict(id) do nothing returning id)
select (select originals_unchanged from guard) as originals_unchanged,
 (select within_limit from guard) as within_limit,
 (select count(*) from eligible) as eligible,
 count(*) as inserted,coalesce(jsonb_agg(id),'[]'::jsonb) as inserted_ids from inserted;
commit;`;
}
