-- LX Cinema 4.0: safe licensed media matcher and Commons artwork updater.
-- Existing manual video, accounts and content stay untouched.
create or replace function lx_private.cinema_media_tick(p_limit integer default 12)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare s record;match_id bigint;ready int:=0;attached int:=0;scanned int:=0;
begin
 if p_limit is null or p_limit<1 or p_limit>40 then raise exception 'INVALID_BATCH';end if;
 perform pg_advisory_xact_lock(hashtextextended('lx_cinema_media_tick',41));
 for s in select id,payload from public.lx_catalog
 where published=false and payload->>'type'='Filme'
 and payload->>'sourceProvider'='Internet Archive · Prelinger'
 and payload->>'sourceVerified'='true'
 and payload->'openFilmEvidence'->>'collection'='prelinger'
 and payload->'openFilmEvidence'->>'mediaFormat'='h.264'
 and coalesce(payload->'openFilmEvidence'->>'verifiedAt','')<>''
 and payload->>'externalId' like 'archive:%'
 and coalesce(payload->'license'->>'url','') in
 ('https://creativecommons.org/publicdomain/zero/1.0/','https://creativecommons.org/licenses/publicdomain/','https://creativecommons.org/publicdomain/mark/1.0/')
 and payload->>'authorizedVideoUrl'=payload->>'mediaKey'
 and payload->>'mediaKey' ~ '^https://archive[.]org/download/[A-Za-z0-9_-]+/[^?#]+[.]mp4$'
 and lx_private.cinema_family_safe(payload->>'title',payload->>'desc')
 and coalesce(payload->>'linkedCatalogId','')=''
 and coalesce(payload->>'archived','false')<>'true'
 order by updated_at desc,id desc limit p_limit for update skip locked
 loop
  scanned:=scanned+1;match_id:=null;
  if exists(select 1 from public.lx_catalog_tombstones t where t.id=s.id) then continue;end if;
  select c.id into match_id from public.lx_catalog c
  where c.id<>s.id and c.published
  and c.payload->>'type'='Filme'
  and c.payload->>'metadataOnly'='true'
  and coalesce(c.payload->>'mediaKey','')=''
  and lower(trim(c.payload->>'title'))=lower(trim(s.payload->>'title'))
  and coalesce(c.payload->>'year','')=coalesce(s.payload->>'year','')
  and coalesce(c.payload->>'manualLocked','false')<>'true'
  and coalesce(c.payload->>'archived','false')<>'true'
  and c.payload->>'ageFilter'='family-description-keyword-not-official-rating'
  and not exists(select 1 from public.lx_catalog_tombstones t where t.id=c.id)
  order by c.id limit 1 for update skip locked;
  if match_id is not null then
   update public.lx_catalog c set
    payload=c.payload||jsonb_build_object(
     'mediaKey',s.payload->>'mediaKey','authorizedVideoUrl',s.payload->>'authorizedVideoUrl',
     'sourceProvider',s.payload->>'sourceProvider','sourceVerified',true,
     'externalId',s.payload->>'externalId','license',s.payload->'license',
     'openFilmEvidence',s.payload->'openFilmEvidence',
     'availability','available','metadataOnly',false,'catalogOnly',false,
     'openFilm',true,'playbackMode','native_open_film','autoLicensedMedia',true),
    updated_at=now()
   where c.id=match_id and c.published and c.payload->>'metadataOnly'='true'
   and coalesce(c.payload->>'mediaKey','')='';
   if found then
    update public.lx_catalog set payload=jsonb_set(payload,'{linkedCatalogId}',to_jsonb(match_id),true),updated_at=now() where id=s.id;
    attached:=attached+1;continue;
   end if;
  end if;
  -- Only existing verified videos whose descriptions specifically identify family viewing.
  -- Prelinger metadata text isn't republished commercially; use an original description.
  update public.lx_catalog set published=true,
   payload=payload||jsonb_build_object(
    'published',true,'editorialReviewRequired',false,
    'ageFilter','family-description-keyword-not-official-rating','autoFamilyFiltered',true,
    'desc','Curta-metragem histórico do acervo Prelinger / Internet Archive, com reprodução autorizada conforme a licença registrada especificamente para esta obra.',
    'availability','available','metadataOnly',false,'catalogOnly',false,
    'autoLicensedMedia',true,'filmCredit','Imagens de arquivo: Internet Archive / Prelinger Archives'),
   updated_at=now()
  where id=s.id and published=false;
  if found then ready:=ready+1;end if;
 end loop;
 insert into public.lx_cinema_bot_runs(bot,processed,changed)
 values('licensed_media',scanned,ready+attached);
 return jsonb_build_object('scanned',scanned,'published_playable',ready,'attached_to_existing',attached);
end $fn$;
revoke all on function lx_private.cinema_media_tick(integer) from public,anon,authenticated;

create or replace function lx_private.cinema_artwork_tick(p_limit integer default 40)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_count int:=0;
begin
 if p_limit is null or p_limit<1 or p_limit>80 then raise exception 'INVALID_BATCH';end if;
 with picks as (
  select c.id,d.cover_url,d.artwork
  from public.lx_catalog c join public.lx_auto_discovery d
   on c.payload->>'metadataSourceId'=d.id
  where c.published and coalesce(c.payload->>'cover','')=''
   and coalesce(c.payload->>'manualLocked','false')<>'true'
   and lx_private.cinema_permitted_cover(d.cover_url,d.artwork)<>''
  order by c.id limit p_limit for update of c skip locked
 ), updated as (
  update public.lx_catalog c set payload=c.payload||jsonb_build_object(
   'cover',p.cover_url,'artworkRights',p.artwork,'autoLicensedArtwork',true),updated_at=now()
  from picks p where c.id=p.id returning c.id
 ) select count(*) into v_count from updated;
 insert into public.lx_cinema_bot_runs(bot,processed,changed) values('artwork',v_count,v_count);
 return jsonb_build_object('verified_artwork_added',v_count);
end $fn$;
revoke all on function lx_private.cinema_artwork_tick(integer) from public,anon,authenticated;

create or replace function public.lx_cinema_bots_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
 if public.lx_admin_can('settings') is distinct from true then raise exception 'ADMIN_REQUIRED';end if;
 return jsonb_build_object(
  'family_public',(select count(*) from public.lx_catalog where published and payload->>'autoFamilyFiltered'='true'),
  'licensed_playable',(select count(*) from public.lx_catalog where published and payload->>'autoLicensedMedia'='true'),
  'family_pending',(select count(*) from public.lx_auto_discovery d where d.media_kind in ('films','series') and d.curator_locked=false and lx_private.cinema_family_safe(d.title,d.description)),
  'artwork_updated',(select count(*) from public.lx_catalog where published and payload->>'autoLicensedArtwork'='true'),
  'runs',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from
   (select bot,processed,changed,outcome,created_at from public.lx_cinema_bot_runs order by id desc limit 12)x));
end $fn$;
revoke all on function public.lx_cinema_bots_dashboard() from public,anon;
grant execute on function public.lx_cinema_bots_dashboard() to authenticated;

do $cron$ begin
 if not exists(select 1 from cron.job where jobname='lx-cinema-media-source-link') then
  perform cron.schedule('lx-cinema-media-source-link','17,47 * * * *','select lx_private.cinema_media_tick(12)');
 end if;
 if not exists(select 1 from cron.job where jobname='lx-cinema-artwork-refresh') then
  perform cron.schedule('lx-cinema-artwork-refresh','23,53 * * * *','select lx_private.cinema_artwork_tick(40)');
 end if;
end $cron$;
