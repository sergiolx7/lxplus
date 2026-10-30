-- Privileged operations live outside the exposed schema and check current database roles.
create function lx_private.studio_archive(p_ids bigint[],p_archive boolean) returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
 if auth.uid() is null or public.lx_admin_can('catalog') is not true then raise exception 'ADMIN_REQUIRED'; end if;
 if cardinality(p_ids) not between 1 and 100 then raise exception 'BATCH_LIMIT'; end if;
 if p_archive then
  update public.lx_catalog set payload=payload||jsonb_build_object('archivedPublished',published,'archived',true,'archivedAt',now()),published=false,updated_at=now() where id=any(p_ids) and coalesce(payload->>'archived','false')<>'true';
 else
  update public.lx_catalog set published=coalesce((payload->>'archivedPublished')::boolean,false),payload=payload-'archived'-'archivedAt'-'archiveReason'-'archivedPublished',updated_at=now() where id=any(p_ids) and payload->>'archived'='true';
 end if;
 get diagnostics affected=row_count;return affected;
end $$;
revoke all on function lx_private.studio_archive(bigint[],boolean) from public,anon;
grant execute on function lx_private.studio_archive(bigint[],boolean) to authenticated;
create function public.lx_studio_archive(p_ids bigint[],p_archive boolean default true) returns integer language sql security invoker set search_path='' as $$select lx_private.studio_archive(p_ids,p_archive)$$;
revoke all on function public.lx_studio_archive(bigint[],boolean) from public,anon;
grant execute on function public.lx_studio_archive(bigint[],boolean) to authenticated;

create function lx_private.studio_restore(p_version bigint) returns bigint language plpgsql security definer set search_path='' as $$
declare v public.lx_catalog_versions%rowtype;r jsonb;
begin
 if auth.uid() is null or public.lx_admin_can('catalog') is not true then raise exception 'ADMIN_REQUIRED'; end if;
 select * into v from public.lx_catalog_versions where id=p_version;if not found then raise exception 'VERSION_NOT_FOUND';end if;
 r:=coalesce(v.previous,v.current);if r is null then raise exception 'VERSION_EMPTY';end if;
 -- Existing tombstoned items stay protected; this flow restores active/archived rows only.
 if exists(select 1 from public.lx_catalog_tombstones where id=v.catalog_id) then raise exception 'TOMBSTONED_ITEM_REQUIRES_OPERATOR_RESTORE'; end if;
 insert into public.lx_catalog(id,payload,published,updated_at) values(v.catalog_id,r->'payload',coalesce((r->>'published')::boolean,false),now())
 on conflict(id) do update set payload=excluded.payload,published=excluded.published,updated_at=now();
 return v.catalog_id;
end $$;
revoke all on function lx_private.studio_restore(bigint) from public,anon;
grant execute on function lx_private.studio_restore(bigint) to authenticated;
create function public.lx_studio_restore(p_version bigint) returns bigint language sql security invoker set search_path='' as $$select lx_private.studio_restore(p_version)$$;
revoke all on function public.lx_studio_restore(bigint) from public,anon;
grant execute on function public.lx_studio_restore(bigint) to authenticated;

create function lx_private.publish_import(p_item uuid,p_rights boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.lx_import_items%rowtype;content_id bigint;data jsonb;
begin
 if auth.uid() is null or public.lx_admin_can('catalog') is not true then raise exception 'ADMIN_REQUIRED';end if;
 if p_rights is not true then raise exception 'DISTRIBUTION_RIGHTS_REQUIRED';end if;
 select * into i from public.lx_import_items where id=p_item for update;
 if not found or i.status<>'ready' then raise exception 'ITEM_NOT_READY';end if;
 if i.source_key !~ '^drive:[A-Za-z0-9_-]{10,128}$' or i.payload->>'type' not in('Filme','Música') or i.confidence<0.9 then raise exception 'MANUAL_REVIEW_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(i.source_key,0));
 select id into content_id from public.lx_catalog where payload->>'catalogIdentity'=i.source_key limit 1;
 if found then update public.lx_import_items set status='duplicate',catalog_id=content_id,reason='Arquivo já cadastrado, inclusive no arquivo antigo' where id=p_item;return jsonb_build_object('status','duplicate','id',content_id);end if;
 content_id:=(extract(epoch from clock_timestamp())*1000000)::bigint;
 data:=i.payload||jsonb_build_object('id',content_id,'catalogIdentity',i.source_key,'sourceVerified',true,'license',jsonb_build_object('authorized',true,'basis','admin-attested','confirmedBy',auth.uid(),'confirmedAt',now()),'importedAt',now());
 insert into public.lx_catalog(id,payload,published) values(content_id,data,true);
 update public.lx_import_items set status='published',catalog_id=content_id,reason='Publicado após revisão do ADM' where id=p_item;
 return jsonb_build_object('status','published','id',content_id);
end $$;
revoke all on function lx_private.publish_import(uuid,boolean) from public,anon;
grant execute on function lx_private.publish_import(uuid,boolean) to authenticated;
create function public.lx_publish_import(p_item uuid,p_rights boolean) returns jsonb language sql security invoker set search_path='' as $$select lx_private.publish_import(p_item,p_rights)$$;
revoke all on function public.lx_publish_import(uuid,boolean) from public,anon;
grant execute on function public.lx_publish_import(uuid,boolean) to authenticated;

create view public.lx_feed_counts with(security_invoker=true) as select p.id as post_id,(select count(*) from public.lx_post_likes l where l.post_id=p.id) as likes,(select count(*) from public.lx_post_comments c where c.post_id=p.id) as comments from public.lx_posts p;
revoke all on public.lx_feed_counts from public,anon;
grant select on public.lx_feed_counts to authenticated;

create table public.lx_health_reports(day date primary key,metrics jsonb not null,created_at timestamptz not null default now());
alter table public.lx_health_reports enable row level security;
create policy health_reports_admin_read on public.lx_health_reports for select to authenticated using((select public.lx_admin_can('users')));
revoke all on public.lx_health_reports from public,anon,authenticated;
grant select on public.lx_health_reports to authenticated;
grant all on public.lx_health_reports to service_role;
create function lx_private.capture_health_report() returns void language plpgsql security definer set search_path='' as $$
declare summary jsonb;
begin
 select jsonb_build_object('events',count(*),'errors',count(*) filter(where category='error'),'playback_failures',count(*) filter(where category='playback'),'avg_load_ms',round(avg(duration_ms) filter(where category='performance')),'active_members',count(distinct user_id)) into summary from public.lx_telemetry where created_at>=now()-interval '24 hours';
 summary:=summary||jsonb_build_object('jobs',(select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'enabled',enabled,'status',status,'last_error',left(last_error,200))),'[]') from public.lx_auto_jobs),'pending_imports',(select count(*) from public.lx_import_items where status='review'));
 insert into public.lx_health_reports(day,metrics) values((now() at time zone 'America/Fortaleza')::date,summary) on conflict(day) do update set metrics=excluded.metrics,created_at=now();
end $$;
revoke all on function lx_private.capture_health_report() from public,anon,authenticated;
select cron.schedule('lx-premium-health-daily','0 11 * * *','select lx_private.capture_health_report()');

create function lx_private.drive_sync_tick() returns void language plpgsql security definer set search_path='' as $$
declare secret_token text;
begin
 if not exists(select 1 from public.lx_drive_sources where enabled and next_sync_at<=now()) and not exists(select 1 from public.lx_import_jobs where status in('pending','scanning') and (lease_until is null or lease_until<now())) then return; end if;
 select decrypted_secret into secret_token from vault.decrypted_secrets where name='lx_auto_scheduler' limit 1;
 if secret_token is null then return;end if;
 perform net.http_post(url:='https://ubidogquzpdvrbzbhxda.supabase.co/functions/v1/lx-drive-studio',headers:=jsonb_build_object('Content-Type','application/json','x-lx-job-token',secret_token),body:='{"action":"sync_due"}'::jsonb,timeout_milliseconds:=15000);
end $$;
revoke all on function lx_private.drive_sync_tick() from public,anon,authenticated;
select cron.schedule('lx-drive-review-sync','*/15 * * * *','select lx_private.drive_sync_tick()');

-- Scheduled publication only for content already reviewed and explicitly authorized by ADM.
create function lx_private.publish_due_content() returns void language sql security definer set search_path='' as $$
 update public.lx_catalog set published=true,updated_at=now(),payload=payload-'releaseAt'
 where not published and coalesce(payload->>'archived','false')<>'true' and payload->>'releaseAt' ~ '^\d{4}-\d{2}-\d{2}T' and (payload->>'releaseAt')::timestamptz<=now() and payload#>>'{license,authorized}'='true';
$$;
revoke all on function lx_private.publish_due_content() from public,anon,authenticated;
select cron.schedule('lx-content-scheduled-release','* * * * *','select lx_private.publish_due_content()');
select lx_private.capture_health_report();
