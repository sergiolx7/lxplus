-- Additive metadata categories; existing owner media and permissions stay intact.
alter table public.lx_auto_discovery add column media_kind text not null default 'films' check(media_kind in('films','series','music_metadata'));
create index lx_auto_discovery_kind_id on public.lx_auto_discovery(media_kind,id) where published;
alter table public.lx_auto_jobs drop constraint lx_auto_jobs_kind_check;
alter table public.lx_auto_jobs add constraint lx_auto_jobs_kind_check check(kind in('films','series','music_metadata','music'));
insert into public.lx_auto_jobs(kind,daily_limit,batch_size,enabled) values('series',500,50,false),('music_metadata',1000,50,false);

create function public.lx_discover_catalog(p_kind text default 'films',p_query text default '',p_before text default null,p_limit integer default 36) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;lim integer:=least(48,greatest(1,p_limit));
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED';end if;
 if p_kind not in('films','series','music_metadata') then raise exception 'INVALID_KIND';end if;
 if p_before is not null and p_before !~ '^Q[0-9]+$' then raise exception 'INVALID_CURSOR';end if;
 select coalesce(jsonb_agg(to_jsonb(t)-'search_vector'),'[]'::jsonb) into result from(select * from public.lx_auto_discovery where published and media_kind=p_kind and (p_before is null or id>p_before) and (nullif(trim(p_query),'') is null or search_vector@@plainto_tsquery('simple',left(p_query,100))) order by id limit lim+1)t;
 return jsonb_build_object('items',(select coalesce(jsonb_agg(value),'[]'::jsonb) from jsonb_array_elements(result) with ordinality t(value,n) where n<=lim),'has_more',jsonb_array_length(result)>lim,'limit',lim);
end $$;
revoke all on function public.lx_discover_catalog(text,text,text,integer) from public,anon;
grant execute on function public.lx_discover_catalog(text,text,text,integer) to authenticated;
create or replace function lx_private.auto_tick(p_kind text) returns bigint language plpgsql security invoker set search_path='' as $$
declare token text;request_id bigint;
begin
 if p_kind not in('films','series','music_metadata','music') then raise exception 'INVALID_JOB';end if;
 if not exists(select 1 from public.lx_auto_jobs where kind=p_kind and enabled and next_run_at<=now() and (lease_until is null or lease_until<now()) and (day<>(now() at time zone 'America/Fortaleza')::date or processed<daily_limit)) then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='lx_auto_scheduler';
 if token is null then raise exception 'SCHEDULER_NOT_CONFIGURED';end if;
 select net.http_post(url:='https://ubidogquzpdvrbzbhxda.supabase.co/functions/v1/lx-auto-catalog',headers:=jsonb_build_object('Content-Type','application/json','x-lx-job-token',token),body:=jsonb_build_object('kind',p_kind),timeout_milliseconds:=120000) into request_id;
 return request_id;
end $$;

create or replace function lx_private.auto_status() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if public.lx_admin_can('settings') is distinct from true then raise exception 'ADMIN_REQUIRED';end if;
 return jsonb_build_object('jobs',(select jsonb_agg(to_jsonb(j)-'lease') from public.lx_auto_jobs j),'runs',(select jsonb_agg(to_jsonb(r)) from(select * from public.lx_auto_runs order by started_at desc limit 20)r),'discovery_total',(select count(*) from public.lx_auto_discovery),'native_auto_total',(select count(*) from public.lx_catalog where published and payload->>'autoPublished'='true'),'asset_bytes',public.lx_auto_asset_usage(),'daily_history',(select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) from(select (started_at at time zone 'America/Fortaleza')::date as "day",kind,sum(scanned)::integer scanned,sum(added)::integer added,sum(playable)::integer playable from public.lx_auto_runs where started_at>=(((now() at time zone 'America/Fortaleza')::date-13)::timestamp at time zone 'America/Fortaleza') group by 1,2 order by 1,2)d));
end $$;
revoke all on function lx_private.auto_status() from public,anon;
grant execute on function lx_private.auto_status() to authenticated;
select cron.schedule('lx-series-discovery','3,18,33,48 * * * *',$$select lx_private.auto_tick('series')$$);
select cron.schedule('lx-music-metadata','10,25,40,55 * * * *',$$select lx_private.auto_tick('music_metadata')$$);
