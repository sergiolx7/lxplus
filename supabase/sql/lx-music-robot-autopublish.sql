-- LX Music robot: automatic publication uses provider-native embeds only.
-- No third-party audio is downloaded, proxied or copied.
alter table public.lx_music_robot_config
  add column if not exists auto_publish boolean not null default false;
-- Explicit owner request to turn on automatic official-embed publishing.
update public.lx_music_robot_config set auto_publish=true,updated_at=now() where id=true;

create or replace function public.lx_music_robot_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.lx_music_robot_config; runs jsonb; keys jsonb;
begin
 if auth.uid() is null or public.lx_admin_can('catalog') is not true then raise exception 'ADMIN_REQUIRED';end if;
 select * into cfg from public.lx_music_robot_config where id=true;
 select coalesce(jsonb_agg(jsonb_build_object('started_at',r.started_at,'status',r.status,'source',r.source,'scanned',r.scanned,'added',r.added,'duplicates',r.duplicates,'error_code',r.error_code) order by r.started_at desc),'[]'::jsonb)
 into runs from (select * from public.lx_music_robot_runs order by started_at desc limit 28) r;
 select jsonb_build_object('youtube',exists(select 1 from public.lx_integrations where key='youtube_music_api_key' and length(secret)>0),
   'spotify',exists(select 1 from public.lx_integrations where key='spotify_client_id' and length(secret)>0) and exists(select 1 from public.lx_integrations where key='spotify_client_secret' and length(secret)>0)) into keys;
 return jsonb_build_object('enabled',cfg.enabled,'auto_publish',cfg.auto_publish,'daily_limit',cfg.daily_limit,'batch_size',cfg.batch_size,'queries',cfg.queries,'day',cfg.day,
   'processed',case when cfg.day=(now() at time zone 'America/Fortaleza')::date then cfg.processed else 0 end,
   'last_run_at',cfg.last_run_at,'keys',keys,'runs',runs);
end $$;
revoke all on function public.lx_music_robot_dashboard() from public,anon;
grant execute on function public.lx_music_robot_dashboard() to authenticated;

-- Only the true owner can change automatic publication.
create or replace function public.lx_music_robot_set_publish(p_enabled boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_admin_role() <> 'owner' then raise exception 'OWNER_REQUIRED';end if;
 if p_enabled is null then raise exception 'INVALID_SETTING';end if;
 update public.lx_music_robot_config set auto_publish=p_enabled,updated_at=now() where id=true;
 return public.lx_music_robot_dashboard();
end $$;
revoke all on function public.lx_music_robot_set_publish(boolean) from public,anon;
grant execute on function public.lx_music_robot_set_publish(boolean) to authenticated;

-- Service-role-only authenticated worker. Provider and URL must match;
-- YouTube listings have been limited to embeddable Music-category videos,
-- and Spotify entries to official /track resources by the search worker.
create or replace function public.lx_music_robot_stage(p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry jsonb; src text; ttl text; external text; provider text;
 cid bigint; added int=0; dup int=0; attempt int; publish_now boolean;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>50 or octet_length(p_items::text)>250000 then raise exception 'BATCH_LIMIT';end if;
 select coalesce(auto_publish,false) into publish_now from public.lx_music_robot_config where id=true;
 publish_now:=coalesce(publish_now,false);
 for entry in select value from jsonb_array_elements(p_items) loop
  src:=entry->>'sourceUrl';ttl:=btrim(coalesce(entry->>'title',''));external:=entry->>'externalId';provider:=entry->>'provider';
  if ttl='' or char_length(ttl)>200 or
   not (
     (provider='YouTube' and src ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$' and external='youtube:'||substring(src from 'v=([A-Za-z0-9_-]{11})$'))
     or
     (provider='Spotify' and src ~ '^https://open[.]spotify[.]com/track/[A-Za-z0-9]{22}$' and external='spotify:'||substring(src from '/track/([A-Za-z0-9]{22})$'))
   ) then continue;end if;
  perform pg_advisory_xact_lock(hashtextextended(src,0));
  if exists(select 1 from public.lx_catalog where payload->>'sourceUrl'=src or (external<>'' and payload->>'externalId'=external)) then dup:=dup+1;continue;end if;
  for attempt in 1..5 loop
   cid:=(extract(epoch from clock_timestamp())*1000000)::bigint+floor(random()*1000)::bigint;
   begin
    insert into public.lx_catalog(id,payload,published,updated_at)
    values(cid,jsonb_build_object('id',cid,'type','Música','title',left(ttl,200),'sourceUrl',src,'sourceKind','auto','cover',left(coalesce(entry->>'cover',''),1500),
      'artist',left(coalesce(entry->>'artist',''),200),'album',left(coalesce(entry->>'album',''),200),'genre',left(coalesce(entry->>'genre',''),120),
      'year',nullif(entry->>'year','')::integer,'externalId',external,'officialEmbedded',true,
      'importMethod',case when publish_now then 'music-robot-auto' else 'music-robot-draft' end,
      'metadataReviewed',false,'autoPublished',publish_now,'robotProvider',provider,
      'publicationMethod',case when publish_now then 'official-embed' else 'manual-review' end),publish_now,now());
    added:=added+1;exit;
   exception when unique_violation then if attempt=5 then raise;end if;
   end;
  end loop;
 end loop;
 return jsonb_build_object('added',added,'duplicates',dup,'published',case when publish_now then added else 0 end);
end $$;
revoke all on function public.lx_music_robot_stage(jsonb) from public,anon,authenticated;
grant execute on function public.lx_music_robot_stage(jsonb) to service_role;

-- Publish ONLY historical robot-made drafts with valid official embed links,
-- non-empty titles, matching provider and no matching already-published URL.
with eligible as (
 select c.id from public.lx_catalog c
 where c.published=false
 and c.payload->>'importMethod'='music-robot-draft'
 and c.payload->>'type'='Música'
 and c.payload->>'officialEmbedded'='true'
 and length(trim(coalesce(c.payload->>'title','')))>0
 and (
  (c.payload->>'robotProvider'='YouTube' and c.payload->>'sourceUrl' ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$')
  or
  (c.payload->>'robotProvider'='Spotify' and c.payload->>'sourceUrl' ~ '^https://open[.]spotify[.]com/track/[A-Za-z0-9]{22}$')
 )
 and not exists(select 1 from public.lx_catalog other where other.id<>c.id and other.published and other.payload->>'sourceUrl'=c.payload->>'sourceUrl')
)
update public.lx_catalog c
 set published=true,updated_at=now(),payload=c.payload||jsonb_build_object('autoPublished',true,'publicationMethod','official-embed','autoPublishedAt',now())
from eligible where eligible.id=c.id;
