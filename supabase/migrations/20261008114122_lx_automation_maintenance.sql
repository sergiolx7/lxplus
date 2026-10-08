-- Independent bounded workers. Discovery metadata never grants playback rights.
create table public.lx_auto_discovery (
 id text primary key check(id ~ '^Q[0-9]+$'),title text not null check(length(title) between 1 and 500),
 year integer,description text not null default '',cover_url text not null default '',
 artwork jsonb not null default '{"kind":"lx"}',source_url text not null,
 published boolean not null default true,curator_locked boolean not null default false,
 updated_at timestamptz not null default now(),
 search_vector tsvector generated always as(to_tsvector('simple',title||' '||description)) stored
);
create index lx_auto_discovery_search on public.lx_auto_discovery using gin(search_vector);
create index lx_auto_discovery_order on public.lx_auto_discovery(year desc nulls last,id) where published;
create table public.lx_auto_jobs (
 kind text primary key check(kind in('films','music')),enabled boolean not null default true,
 daily_limit integer not null check(daily_limit between 1 and 2000),batch_size integer not null check(batch_size between 1 and 100),
 cursor bigint not null default 0,media_cursor bigint not null default 0,
 day date not null default (now() at time zone 'America/Fortaleza')::date,
 processed integer not null default 0,published integer not null default 0,bytes bigint not null default 0,
 lease uuid,lease_until timestamptz,next_run_at timestamptz not null default now(),
 last_run_at timestamptz,last_error text,status text not null default 'waiting',
 asset_budget_bytes bigint not null default 800000000,daily_budget_bytes bigint not null default 150000000
);
insert into public.lx_auto_jobs(kind,daily_limit,batch_size) values('films',2000,100),('music',50,2);
create table public.lx_auto_runs (
 id uuid primary key default gen_random_uuid(),kind text not null references public.lx_auto_jobs(kind),
 started_at timestamptz not null default now(),finished_at timestamptz,status text not null default 'running',
 scanned integer not null default 0,added integer not null default 0,playable integer not null default 0,
 bytes bigint not null default 0,error_code text
);
create index lx_auto_runs_kind_time on public.lx_auto_runs(kind,started_at desc);
create table public.lx_auto_assets (
 external_id text primary key,catalog_id bigint not null references public.lx_catalog(id),
 url text not null,bytes bigint not null check(bytes between 100 and 25000000),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 license jsonb not null,verified_at timestamptz not null default now()
);
create table public.lx_maintenance_archive (
 id bigint primary key references public.lx_catalog(id),payload jsonb not null,published boolean not null,
 previous_updated_at timestamptz not null,reason text not null,batch text not null,archived_at timestamptz not null default now()
);
alter table public.lx_auto_discovery enable row level security;
alter table public.lx_auto_jobs enable row level security;
alter table public.lx_auto_runs enable row level security;
alter table public.lx_auto_assets enable row level security;
alter table public.lx_maintenance_archive enable row level security;
revoke all on public.lx_auto_discovery,public.lx_auto_jobs,public.lx_auto_runs,public.lx_auto_assets,public.lx_maintenance_archive from anon,authenticated;
grant select on public.lx_auto_discovery to authenticated;
create policy discovery_approved on public.lx_auto_discovery for select to authenticated using(published and (select public.lx_is_approved()));
grant all on public.lx_auto_discovery,public.lx_auto_jobs,public.lx_auto_runs,public.lx_auto_assets,public.lx_maintenance_archive to service_role;

create function public.lx_auto_claim(p_kind text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.lx_auto_jobs;run_id uuid; today date:=(now() at time zone 'America/Fortaleza')::date;
begin
 select * into j from public.lx_auto_jobs where kind=p_kind for update;
 if not found or not j.enabled or j.next_run_at>now() or j.lease_until>now() then return null;end if;
 if j.day<>today then j.day:=today;j.processed:=0;j.published:=0;j.bytes:=0;end if;
 if j.processed>=j.daily_limit or (p_kind='music' and j.bytes>=j.daily_budget_bytes) then
  update public.lx_auto_jobs set day=j.day,processed=j.processed,published=j.published,bytes=j.bytes,status='daily_limit' where kind=p_kind;return null;
 end if;
 j.lease:=gen_random_uuid();j.lease_until:=now()+interval '140 seconds';
 update public.lx_auto_jobs set day=j.day,processed=j.processed,published=j.published,bytes=j.bytes,lease=j.lease,lease_until=j.lease_until,last_run_at=now(),status='running' where kind=p_kind;
 update public.lx_auto_runs set status='expired',finished_at=now(),error_code='WORKER_LEASE_EXPIRED' where kind=p_kind and status='running';
 insert into public.lx_auto_runs(id,kind) values(j.lease,p_kind) returning id into run_id;
 return to_jsonb(j)||jsonb_build_object('run_id',run_id,'batch_size',least(j.batch_size,j.daily_limit-j.processed));
end $$;
create function public.lx_auto_finish(p_kind text,p_lease uuid,p_cursor bigint,p_media_cursor bigint,p_scanned integer,p_added integer,p_playable integer,p_bytes bigint,p_error text default null,p_retry_seconds integer default 0) returns boolean
language plpgsql security invoker set search_path='' as $$
declare j public.lx_auto_jobs;
begin
 select * into j from public.lx_auto_jobs where kind=p_kind for update;
 if j.lease is distinct from p_lease then return false;end if;
 if p_scanned not between 0 and j.batch_size or p_added not between 0 and p_scanned or p_playable not between 0 and 3 or p_bytes<0 then raise exception 'INVALID_JOB_RESULT';end if;
 update public.lx_auto_jobs set cursor=greatest(0,p_cursor),media_cursor=greatest(0,p_media_cursor),processed=processed+p_scanned,published=published+p_added,bytes=bytes+p_bytes,lease=null,lease_until=null,last_error=left(p_error,100),next_run_at=now()+make_interval(secs=>least(86400,greatest(0,p_retry_seconds))),status=case when p_error is null then 'healthy' else 'retry' end where kind=p_kind;
 update public.lx_auto_runs set finished_at=now(),status=case when p_error is null then 'success' else 'retry' end,scanned=p_scanned,added=p_added,playable=p_playable,bytes=p_bytes,error_code=left(p_error,100) where id=p_lease;
 return true;
end $$;
create function public.lx_auto_publish(p_item jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item_id bigint:=(p_item->>'id')::bigint; existing bigint;typ text:=p_item->>'type';
begin
 perform pg_advisory_xact_lock(hashtextextended('lx_auto_publish',41));
 if item_id<9000000000000 or nullif(p_item->>'externalId','') is null or not coalesce((p_item->>'sourceVerified')::boolean,false) then raise exception 'UNVERIFIED_MEDIA';end if;
 if typ='Música' then
  if p_item->>'metadataProvider' is distinct from 'Incompetech' or p_item->'license'->>'url' is distinct from 'https://creativecommons.org/licenses/by/4.0/' or p_item->'license'->>'evidenceUrl' is distinct from 'https://incompetech.com/agent-section/' or p_item->>'authorizedAudioUrl' is distinct from p_item->>'mediaKey' or coalesce(p_item->>'mediaKey','') !~ '^https://ubidogquzpdvrbzbhxda.supabase.co/storage/v1/object/public/lx-assets/automated/incompetech/USUAN[0-9]+-[a-f0-9]{12}\.mp3$' or coalesce(p_item->'nativeAsset'->>'sha256','') !~ '^[a-f0-9]{64}$' then raise exception 'UNVERIFIED_MP3';end if;
 elsif typ='Filme' then
  if p_item->>'sourceProvider' is distinct from 'Internet Archive · Prelinger' or p_item->'openFilmEvidence'->>'collection' is distinct from 'prelinger' or coalesce(p_item->'license'->>'url','') not in('https://creativecommons.org/publicdomain/zero/1.0/','https://creativecommons.org/licenses/publicdomain/','https://creativecommons.org/publicdomain/mark/1.0/') or p_item->>'authorizedVideoUrl' is distinct from p_item->>'mediaKey' or coalesce(p_item->>'mediaKey','') !~ '^https://archive.org/download/[A-Za-z0-9_-]+/[^?#]+\.mp4$' then raise exception 'UNVERIFIED_FILM';end if;
 else raise exception 'UNSUPPORTED_MEDIA';end if;
 select id into existing from public.lx_catalog where id=item_id or payload->>'externalId'=p_item->>'externalId' limit 1;
 if existing is not null then return jsonb_build_object('inserted',false,'id',existing,'reason','duplicate');end if;
 if exists(select 1 from public.lx_catalog_tombstones where id=item_id) then return jsonb_build_object('inserted',false,'reason','removed_by_admin');end if;
 if (select count(*) from public.lx_catalog)>=5000 then return jsonb_build_object('inserted',false,'reason','legacy_capacity');end if;
 insert into public.lx_catalog(id,payload,published,updated_at) values(item_id,p_item||jsonb_build_object('published',true,'autoPublished',true,'availability','available','metadataOnly',false,'catalogOnly',false),true,now());
 if typ='Música' then insert into public.lx_auto_assets(external_id,catalog_id,url,bytes,sha256,license) values(p_item->>'externalId',item_id,p_item->>'mediaKey',(p_item->'nativeAsset'->>'bytes')::bigint,p_item->'nativeAsset'->>'sha256',p_item->'license');end if;
 return jsonb_build_object('inserted',true,'id',item_id);
end $$;
create function public.lx_auto_asset_usage() returns bigint language sql stable security invoker set search_path='' as $$select coalesce(sum((metadata->>'size')::bigint),0)::bigint from storage.objects where bucket_id='lx-assets'$$;
revoke all on function public.lx_auto_claim(text),public.lx_auto_finish(text,uuid,bigint,bigint,integer,integer,integer,bigint,text,integer),public.lx_auto_publish(jsonb),public.lx_auto_asset_usage() from public,anon,authenticated;
grant execute on function public.lx_auto_claim(text),public.lx_auto_finish(text,uuid,bigint,bigint,integer,integer,integer,bigint,text,integer),public.lx_auto_publish(jsonb),public.lx_auto_asset_usage() to service_role;

create function public.lx_discover_films(p_query text default '',p_before text default null,p_limit integer default 36) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;lim integer:=least(48,greatest(1,p_limit));
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED';end if;
 if p_before is not null and p_before !~ '^Q[0-9]+$' then raise exception 'INVALID_CURSOR';end if;
 select coalesce(jsonb_agg(to_jsonb(t)-'search_vector'),'[]'::jsonb) into result from(select * from public.lx_auto_discovery where published and (p_before is null or id>p_before) and (nullif(trim(p_query),'') is null or search_vector@@plainto_tsquery('simple',left(p_query,100))) order by id limit lim+1)t;
 return jsonb_build_object('items',(select coalesce(jsonb_agg(value),'[]'::jsonb) from jsonb_array_elements(result) with ordinality t(value,n) where n<=lim),'has_more',jsonb_array_length(result)>lim,'limit',lim);
end $$;
revoke all on function public.lx_discover_films(text,text,integer) from public,anon;
grant execute on function public.lx_discover_films(text,text,integer) to authenticated;

-- First qualified listeners are recorded from confirmed listening time, starting now.
create table lx_private.track_pioneers(track_key text primary key,user_id uuid not null references public.lx_profiles(user_id) on delete cascade,first_heard_at timestamptz not null default now());
create index lx_track_pioneers_user on lx_private.track_pioneers(user_id);
revoke all on lx_private.track_pioneers from public,anon,authenticated;
create function lx_private.record_pioneer() returns trigger language plpgsql security definer set search_path='' as $$begin if new.seconds>=30 then insert into lx_private.track_pioneers(track_key,user_id) values(new.track_key,new.user_id) on conflict do nothing;end if;return new;end $$;
create trigger lx_record_pioneer after insert or update of seconds on public.lx_listening_daily for each row execute function lx_private.record_pioneer();
revoke all on function lx_private.record_pioneer() from public,anon,authenticated;
alter function lx_private.music_story(uuid,date,integer) rename to music_story_before_automation;
revoke all on function lx_private.music_story_before_automation(uuid,date,integer) from public,anon,authenticated;
create function lx_private.music_story(p_user uuid,p_month date,p_year integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;today date:=(now() at time zone 'America/Fortaleza')::date;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED';end if;
 if p_year is not null then
  if p_year<2026 or p_year>extract(year from today) then raise exception 'INVALID_YEAR';end if;
  if today<make_date(p_year,12,25) then return jsonb_build_object('locked',true,'year',p_year,'release_date',make_date(p_year,12,25));end if;
 end if;
 result:=lx_private.music_story_before_automation(p_user,p_month,p_year);
 if p_user=auth.uid() and not coalesce((result->>'private')::boolean,false) then
  result:=result||jsonb_build_object('pioneers',coalesce((select jsonb_agg(to_jsonb(t)) from(select p.track_key,max(d.title) title,max(d.artist) artist,p.first_heard_at from lx_private.track_pioneers p join public.lx_listening_daily d on d.user_id=p.user_id and d.track_key=p.track_key where p.user_id=p_user group by p.track_key,p.first_heard_at order by p.first_heard_at desc limit 20)t),'[]'::jsonb));
 end if;
 return result;
end $$;
revoke all on function lx_private.music_story(uuid,date,integer) from public,anon;
grant execute on function lx_private.music_story(uuid,date,integer) to authenticated;

-- Keep the playable legacy catalog bounded; the world metadata catalog is paginated separately.
do $$declare lim text;begin
 select split_part(setting,'=',2) into lim from pg_db_role_setting s join pg_roles r on r.oid=s.setrole cross join lateral unnest(s.setconfig) setting where r.rolname='authenticator' and setting like 'pgrst.db_max_rows=%';
 if lim='2500' then alter role authenticator set pgrst.db_max_rows='5000';perform pg_notify('pgrst','reload config');end if;
end $$;
