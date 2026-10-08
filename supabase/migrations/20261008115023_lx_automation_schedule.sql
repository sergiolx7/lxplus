create extension if not exists pg_cron;
do $$begin
 if not exists(select 1 from vault.secrets where name='lx_auto_scheduler') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'lx_auto_scheduler','Private token for the LX licensed media scheduler');
 end if;
end $$;
create function lx_private.auto_authorize(p_token text) returns boolean language sql stable security definer set search_path='' as $$
select length(p_token)=64 and extensions.digest(p_token,'sha256')=extensions.digest((select decrypted_secret from vault.decrypted_secrets where name='lx_auto_scheduler'),'sha256')
$$;
create function public.lx_auto_authorize(p_token text) returns boolean language sql stable security invoker set search_path='' as $$select lx_private.auto_authorize(p_token)$$;
revoke all on function lx_private.auto_authorize(text),public.lx_auto_authorize(text) from public,anon,authenticated;
grant usage on schema lx_private to service_role;
grant execute on function lx_private.auto_authorize(text),public.lx_auto_authorize(text) to service_role;
create function lx_private.auto_tick(p_kind text) returns bigint language plpgsql security invoker set search_path='' as $$
declare token text;request_id bigint;
begin
 if p_kind not in('films','music') then raise exception 'INVALID_JOB';end if;
 if not exists(select 1 from public.lx_auto_jobs where kind=p_kind and enabled and next_run_at<=now() and (lease_until is null or lease_until<now()) and (day<>(now() at time zone 'America/Fortaleza')::date or processed<daily_limit)) then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='lx_auto_scheduler';
 if token is null then raise exception 'SCHEDULER_NOT_CONFIGURED';end if;
 select net.http_post(url:='https://ubidogquzpdvrbzbhxda.supabase.co/functions/v1/lx-auto-catalog',headers:=jsonb_build_object('Content-Type','application/json','x-lx-job-token',token),body:=jsonb_build_object('kind',p_kind),timeout_milliseconds:=120000) into request_id;
 return request_id;
end $$;
revoke all on function lx_private.auto_tick(text) from public,anon,authenticated,service_role;
create function lx_private.auto_run_now(p_kind text) returns bigint language plpgsql security definer set search_path='' as $$begin
 if not public.lx_admin_can('settings') then raise exception 'ADMIN_REQUIRED';end if;return lx_private.auto_tick(p_kind);
end $$;
create function public.lx_auto_run_now(p_kind text) returns bigint language sql security invoker set search_path='' as $$select lx_private.auto_run_now(p_kind)$$;
create function lx_private.auto_status() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.lx_admin_can('settings') then raise exception 'ADMIN_REQUIRED';end if;
 return jsonb_build_object('jobs',(select jsonb_agg(to_jsonb(j)-'lease') from public.lx_auto_jobs j),'runs',(select jsonb_agg(to_jsonb(r)) from(select * from public.lx_auto_runs order by started_at desc limit 20)r),'discovery_total',(select count(*) from public.lx_auto_discovery),'native_auto_total',(select count(*) from public.lx_catalog where published and (payload->>'autoPublished')::boolean),'asset_bytes',public.lx_auto_asset_usage());
end $$;
create function public.lx_auto_status() returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.auto_status()$$;
create function lx_private.auto_edit_discovery(p_id text,p_title text,p_cover_url text) returns boolean language plpgsql security definer set search_path='' as $$begin
 if not public.lx_admin_can('settings') then raise exception 'ADMIN_REQUIRED';end if;
 if p_id !~ '^Q[0-9]+$' or length(trim(p_title)) not between 1 and 500 or p_cover_url !~ '^https://[^ /@]+/[^ ]+$' then raise exception 'INVALID_ARTWORK';end if;
 update public.lx_auto_discovery set title=trim(p_title),cover_url=p_cover_url,artwork=jsonb_build_object('kind','admin','credit','Capa editada pelo ADM'),curator_locked=true,updated_at=now() where id=p_id;return found;
end $$;
create function public.lx_auto_edit_discovery(p_id text,p_title text,p_cover_url text) returns boolean language sql security invoker set search_path='' as $$select lx_private.auto_edit_discovery(p_id,p_title,p_cover_url)$$;
revoke all on function lx_private.auto_run_now(text),public.lx_auto_run_now(text),lx_private.auto_status(),public.lx_auto_status(),lx_private.auto_edit_discovery(text,text,text),public.lx_auto_edit_discovery(text,text,text) from public,anon;
grant execute on function lx_private.auto_run_now(text),public.lx_auto_run_now(text),lx_private.auto_status(),public.lx_auto_status(),lx_private.auto_edit_discovery(text,text,text),public.lx_auto_edit_discovery(text,text,text) to authenticated;
select cron.schedule('lx-films-discovery','*/15 * * * *',$$select lx_private.auto_tick('films')$$);
select cron.schedule('lx-music-mp3','7,22,37,52 * * * *',$$select lx_private.auto_tick('music')$$);
