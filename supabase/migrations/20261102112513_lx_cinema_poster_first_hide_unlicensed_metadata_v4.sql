-- Poster-first: stop the unlicensed/no-poster auto-publisher.
-- Do not remove or overwrite any members' accounts, uploads, or movie history.
do $block$ declare j bigint; begin
 select jobid into j from cron.job where jobname='lx-cinema-family-publish';
 if j is not null then perform cron.unschedule(j); end if;
end $block$;
drop function if exists lx_private.cinema_family_tick();
drop function if exists lx_private.cinema_publish_safe_family(integer);

create or replace function lx_private.cinema_poster_first_guard()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if new.published
   and new.payload->>'metadataProvider'='Wikidata'
   and new.payload->>'metadataOnly'='true'
   and coalesce(new.payload->>'metadataSourceId','') ~ '^Q[0-9]+$'
   and nullif(trim(coalesce(new.payload->>'cover','')),'') is null
 then
  new.published:=false;
  new.payload:=new.payload || jsonb_build_object('published',false,'reviewReason','LICENSED_POSTER_REQUIRED');
 end if;
 return new;
end $fn$;
drop trigger if exists lx_cinema_poster_first_guard on public.lx_catalog;
create trigger lx_cinema_poster_first_guard before insert or update of published,payload on public.lx_catalog
for each row execute function lx_private.cinema_poster_first_guard();

update public.lx_catalog c
set published=false,
    payload=c.payload || jsonb_build_object('published',false,'reviewReason','LICENSED_POSTER_REQUIRED'),
    updated_at=now()
where c.published
  and c.payload->>'metadataProvider'='Wikidata'
  and c.payload->>'metadataOnly'='true'
  and coalesce(c.payload->>'metadataSourceId','') ~ '^Q[0-9]+$'
  and nullif(trim(coalesce(c.payload->>'cover','')),'') is null
  and nullif(trim(coalesce(c.payload->>'mediaKey','')),'') is null
  and coalesce(c.payload->>'manualLocked','false')<>'true';

create or replace function lx_private.cinema_enforce_poster_for_auto()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if new.published and new.payload->>'metadataOnly'='true'
 and new.payload->>'metadataSourceId' ~ '^Q[0-9]+$'
 and nullif(trim(coalesce(new.payload->>'cover','')),'') is null then
 raise exception 'LICENSED_POSTER_REQUIRED';end if;
 return new;
end $fn$;
