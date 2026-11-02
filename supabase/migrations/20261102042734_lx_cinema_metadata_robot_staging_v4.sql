-- LX Cinema Premium 4.0: safe metadata discovery; existing published rows remain untouched.
create or replace function lx_private.cinema_stage_discovery() returns trigger language plpgsql set search_path='' as $fn$
begin
 if new.media_kind in ('films','series') then new.published:=false; end if;
 return new;
end $fn$;
drop trigger if exists lx_cinema_stage_new_discovery on public.lx_auto_discovery;
create trigger lx_cinema_stage_new_discovery before insert on public.lx_auto_discovery
for each row execute function lx_private.cinema_stage_discovery();

create or replace function lx_private.cinema_stage_auto_catalog() returns trigger language plpgsql set search_path='' as $fn$
begin
 if new.payload->>'autoPublished'='true' and new.payload->>'type' in ('Filme','Série','Dorama','Anime') then
  new.published:=false;
  new.payload:=jsonb_set(new.payload,'{published}','false'::jsonb,true);
  new.payload:=jsonb_set(new.payload,'{editorialReviewRequired}','true'::jsonb,true);
 end if;
 return new;
end $fn$;
drop trigger if exists lx_cinema_auto_catalog_review on public.lx_catalog;
create trigger lx_cinema_auto_catalog_review before insert on public.lx_catalog
for each row execute function lx_private.cinema_stage_auto_catalog();

create or replace function public.lx_cinema_robot_configure(
 p_kind text,p_enabled boolean,p_daily_limit integer,p_batch_size integer default 80
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare changed public.lx_auto_jobs;
begin
 if public.lx_admin_can('settings') is distinct from true then raise exception 'ADMIN_REQUIRED'; end if;
 if p_kind not in ('films','series') or p_enabled is null or p_daily_limit is null or
    p_daily_limit < 1 or p_daily_limit > 10000 or p_batch_size is null or
    p_batch_size < 1 or p_batch_size > 100 then raise exception 'INVALID_CINEMA_ROBOT_CONFIGURATION'; end if;
 update public.lx_auto_jobs set enabled=p_enabled,daily_limit=p_daily_limit,batch_size=p_batch_size,
 next_run_at=case when p_enabled then now() else next_run_at end
 where kind=p_kind returning * into changed;
 if not found then raise exception 'UNKNOWN_CINEMA_JOB'; end if;
 return jsonb_build_object('kind',changed.kind,'enabled',changed.enabled,
 'daily_limit',changed.daily_limit,'batch_size',changed.batch_size,
 'processed',changed.processed,'staged_only',true);
end $fn$;
revoke all on function public.lx_cinema_robot_configure(text,boolean,integer,integer) from public,anon;
grant execute on function public.lx_cinema_robot_configure(text,boolean,integer,integer) to authenticated;

update public.lx_auto_jobs set daily_limit=1000,batch_size=80,enabled=true,next_run_at=now() where kind='films';
update public.lx_auto_jobs set daily_limit=500,batch_size=80,enabled=true,next_run_at=now() where kind='series';

do $cron$ begin
 if not exists(select 1 from cron.job where jobname='lx-films-discovery') then
 perform cron.schedule('lx-films-discovery','*/15 * * * *','select lx_private.auto_tick(''films'')');
 else
 perform cron.alter_job(job_id:=(select jobid from cron.job where jobname='lx-films-discovery'),active:=true);
 end if;
 if not exists(select 1 from cron.job where jobname='lx-series-discovery') then
 perform cron.schedule('lx-series-discovery','5,25,45 * * * *','select lx_private.auto_tick(''series'')');
 else
 perform cron.alter_job(job_id:=(select jobid from cron.job where jobname='lx-series-discovery'),active:=true);
 end if;
end $cron$;
