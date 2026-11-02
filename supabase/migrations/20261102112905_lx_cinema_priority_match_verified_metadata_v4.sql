-- Keep the editorial popular titles up to date with source IDs and short Wikidata metadata.
-- This robot never publishes or copies images; a license-attested poster is mandatory.
create or replace function lx_private.cinema_priority_match(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare q record; d record; scanned integer:=0;matched integer:=0;
begin
 if p_limit is null or p_limit<1 or p_limit>150 then raise exception 'INVALID_BATCH';end if;
 for q in select id,kind,title,release_year,synopsis from public.lx_cinema_priority_queue
 where source_id is null and status in ('awaiting_poster','needs_metadata')
 order by editorial_rank,kind,id limit p_limit for update skip locked
 loop
  scanned:=scanned+1;
  select id,description into d from public.lx_auto_discovery
  where media_kind=case when q.kind='Filme' then 'films' else 'series' end
   and lower(trim(title))=lower(trim(q.title))
   and year=q.release_year
   and id ~ '^Q[0-9]+$'
  order by updated_at desc limit 1;
  if found then
   update public.lx_cinema_priority_queue
   set source_id=d.id,
       synopsis=case when length(trim(coalesce(q.synopsis,'')))<20 and length(trim(coalesce(d.description,'')))>=20
        then left(d.description,1000) else q.synopsis end,
       updated_at=now()
   where id=q.id;
   matched:=matched+1;
  end if;
 end loop;
 return jsonb_build_object('scanned',scanned,'matched',matched,'publication','none_without_licensed_poster');
end $fn$;
revoke all on function lx_private.cinema_priority_match(integer) from public,anon,authenticated;
do $cron$ begin
 if not exists(select 1 from cron.job where jobname='lx-cinema-popular-metadata-match') then
  perform cron.schedule('lx-cinema-popular-metadata-match','7 * * * *','select lx_private.cinema_priority_match(100)');
 end if;
end $cron$;
