-- Exported definitions matching applied Supabase migration 20261102110217.
CREATE OR REPLACE FUNCTION lx_private.cinema_family_safe(p_title text, p_description text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
select coalesce(
 length(trim(p_title)) between 3 and 200 and length(trim(p_description)) between 18 and 1500
 and p_description ~* '(children.s|family film|family television|kids series|filme infantil|filme para crian.as|s.rie infantil|children.s series)'
 and (p_title||' '||p_description) !~* '(porn|xxx|erotic|sexual|nudity|hentai|adult movie|adult material|horror|gore|murder|violent|explicit|r-rated|x-rated|trauma|abuse|tortur|kill|crime)'
,false)
$function$;

CREATE OR REPLACE FUNCTION lx_private.cinema_permitted_cover(p_cover text, p_art jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
select case when p_art->>'kind'='commons'
 and p_cover ~ '^https://upload[.]wikimedia[.]org/'
 and p_art->>'source_url' ~ '^https://commons[.]wikimedia[.]org/'
 and coalesce(p_art->>'license','') ~* '^(CC0|CC BY(-SA)? [1-4][.][0-9]|Public domain)$'
 then p_cover else '' end
$function$;

CREATE OR REPLACE FUNCTION lx_private.cinema_publish_safe_family(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d record;item_id bigint;matched bigint;kind text;vcover text;inserted integer:=0;skipped integer:=0;
begin
 if p_limit is null or p_limit<1 or p_limit>40 then raise exception 'BATCH_OUT_OF_RANGE';end if;
 perform pg_advisory_xact_lock(hashtextextended('lx_auto_publish',41));
 for d in
 select id,title,year,description,cover_url,artwork,source_url,media_kind
 from public.lx_auto_discovery
 where media_kind in ('films','series') and curator_locked=false
 and id ~ '^Q[1-9][0-9]{0,9}$'
 and year between 1880 and extract(year from now())::integer
 and lx_private.cinema_family_safe(title,description)
 order by updated_at desc,id desc limit p_limit
 for update skip locked
 loop
  item_id:=8700000000000 + substring(d.id from 2)::bigint;
  kind:=case when d.media_kind='films' then 'Filme'
   when d.description ~* 'anime' then 'Anime'
   when d.description ~* '(korean drama|dorama)' then 'Dorama'
   else 'Série' end;
  select c.id into matched from public.lx_catalog c where c.id=item_id
    or c.payload->>'metadataSourceId'=d.id
    or (c.payload->>'type'=kind and lower(trim(c.payload->>'title'))=lower(trim(d.title))
      and c.payload->>'year'=d.year::text) limit 1;
  if matched is not null or exists(select 1 from public.lx_catalog_tombstones where id=item_id) then
   skipped:=skipped+1;
   update public.lx_auto_discovery set curator_locked=true where id=d.id;
   continue;
  end if;
  vcover:=lx_private.cinema_permitted_cover(d.cover_url,d.artwork);
  insert into public.lx_catalog(id,payload,published,updated_at)
  values(item_id,jsonb_build_object(
    'type',kind,'title',left(trim(d.title),200),'year',d.year,
    'desc',left(d.description,1500),
    'cover',vcover,'genre','Família',
    'metadataOnly',true,'catalogOnly',true,'availability','coming_soon',
    'metadataProvider','Wikidata','metadataSourceId',d.id,'metadataSource',d.source_url,
    'artworkRights',case when vcover<>'' then d.artwork else '{}'::jsonb end,
    'ageFilter','family-description-keyword-not-official-rating','autoFamilyFiltered',true,
    'published',true),true,now())
  on conflict (id) do nothing;
  if found then inserted:=inserted+1; else skipped:=skipped+1; end if;
  update public.lx_auto_discovery set curator_locked=true where id=d.id;
 end loop;
 return jsonb_build_object('inserted',inserted,'skipped',skipped,'family_filter_only',true);
end $function$;

revoke all on function lx_private.cinema_family_safe(text,text) from public,anon,authenticated;
revoke all on function lx_private.cinema_permitted_cover(text,jsonb) from public,anon,authenticated;
revoke all on function lx_private.cinema_publish_safe_family(integer) from public,anon,authenticated;
create table if not exists public.lx_cinema_bot_runs (
 id bigint generated always as identity primary key,
 bot text not null check(bot in ('family_catalog','artwork','licensed_media')),
 processed integer not null default 0, changed integer not null default 0,
 outcome text not null default 'ok', created_at timestamptz not null default now());
create index if not exists lx_cinema_bot_runs_created_idx on public.lx_cinema_bot_runs(bot,created_at desc);
alter table public.lx_cinema_bot_runs enable row level security;
revoke all on public.lx_cinema_bot_runs from public,anon,authenticated;
CREATE OR REPLACE FUNCTION lx_private.cinema_family_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb;
begin
 r:=lx_private.cinema_publish_safe_family(20);
 insert into public.lx_cinema_bot_runs(bot,processed,changed)
 values('family_catalog',coalesce((r->>'inserted')::int,0)+coalesce((r->>'skipped')::int,0),coalesce((r->>'inserted')::int,0));
 return r;
end $function$;
revoke all on function lx_private.cinema_family_tick() from public,anon,authenticated;
do $cron$ begin
 if not exists(select 1 from cron.job where jobname='lx-cinema-family-publish') then
 perform cron.schedule('lx-cinema-family-publish','11,41 * * * *','select lx_private.cinema_family_tick()');
 end if;
end $cron$;
