-- LX Music Robot: source metadata only, official embedded playback, safe drafts.
create table if not exists public.lx_music_robot_config (
 id boolean primary key default true check (id),
 enabled boolean not null default false,
 daily_limit integer not null default 300 check (daily_limit between 1 and 1000),
 batch_size integer not null default 40 check (batch_size between 1 and 50),
 queries text[] not null default array['música brasileira lançamentos oficiais','pop internacional official music','sertanejo música oficial','funk brasileiro música oficial','rock músicas oficiais','música eletrônica official','lofi instrumental música']::text[],
 query_cursor integer not null default 0,
 processed integer not null default 0,
 day date not null default ((now() at time zone 'America/Fortaleza')::date),
 lease_until timestamptz,
 last_run_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.lx_music_robot_runs(
 id uuid primary key default gen_random_uuid(),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null default 'running' check(status in ('running','success','partial','needs_setup','error')),
 source text not null default 'YouTube/Spotify',
 scanned integer not null default 0,
 added integer not null default 0,
 duplicates integer not null default 0,
 error_code text,
 meta jsonb not null default '{}'::jsonb
);
create index if not exists lx_music_robot_runs_started on public.lx_music_robot_runs(started_at desc);
insert into public.lx_music_robot_config(id) values(true) on conflict(id) do nothing;
alter table public.lx_music_robot_config enable row level security;
alter table public.lx_music_robot_runs enable row level security;
revoke all on table public.lx_music_robot_config, public.lx_music_robot_runs from public,anon,authenticated;
grant select,insert,update,delete on public.lx_music_robot_config,public.lx_music_robot_runs to service_role;
-- Dashboard returns only aggregate data and boolean key readiness. No secrets.
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
 return jsonb_build_object('enabled',cfg.enabled,'daily_limit',cfg.daily_limit,'batch_size',cfg.batch_size,'queries',cfg.queries,'day',cfg.day,
   'processed',case when cfg.day=(now() at time zone 'America/Fortaleza')::date then cfg.processed else 0 end,
   'last_run_at',cfg.last_run_at,'keys',keys,'runs',runs);
end $$;
revoke all on function public.lx_music_robot_dashboard() from public,anon;
grant execute on function public.lx_music_robot_dashboard() to authenticated;
create or replace function public.lx_music_robot_configure(p_enabled boolean,p_daily_limit integer,p_queries text[],p_youtube_key text default null,p_spotify_id text default null,p_spotify_secret text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q text[];
begin
 if auth.uid() is null or public.lx_admin_role() <> 'owner' then raise exception 'OWNER_REQUIRED'; end if;
 if p_daily_limit not between 1 and 1000 or coalesce(array_length(p_queries,1),0) not between 1 and 15 then raise exception 'INVALID_CONFIGURATION';end if;
 select array_agg(btrim(x)) into q from unnest(p_queries) x where char_length(btrim(x)) between 3 and 70;
 if coalesce(array_length(q,1),0)<>array_length(p_queries,1) then raise exception 'INVALID_QUERIES';end if;
 if p_youtube_key is not null and btrim(p_youtube_key)<>'' then
   if length(p_youtube_key) > 256 then raise exception 'INVALID_API_KEY';end if;
   insert into public.lx_integrations(key,secret,updated_at,updated_by) values('youtube_music_api_key',btrim(p_youtube_key),now(),auth.uid())
    on conflict(key) do update set secret=excluded.secret,updated_at=now(),updated_by=auth.uid();
 end if;
 if p_spotify_id is not null and btrim(p_spotify_id)<>'' then
   if p_spotify_id !~ '^[a-fA-F0-9]{32}$' then raise exception 'INVALID_SPOTIFY_ID';end if;
   insert into public.lx_integrations(key,secret,updated_at,updated_by) values('spotify_client_id',btrim(p_spotify_id),now(),auth.uid())
    on conflict(key) do update set secret=excluded.secret,updated_at=now(),updated_by=auth.uid();
 end if;
 if p_spotify_secret is not null and btrim(p_spotify_secret)<>'' then
   if length(p_spotify_secret) > 256 then raise exception 'INVALID_SPOTIFY_SECRET';end if;
   insert into public.lx_integrations(key,secret,updated_at,updated_by) values('spotify_client_secret',btrim(p_spotify_secret),now(),auth.uid())
    on conflict(key) do update set secret=excluded.secret,updated_at=now(),updated_by=auth.uid();
 end if;
 update public.lx_music_robot_config set enabled=p_enabled,daily_limit=p_daily_limit,queries=q,updated_at=now() where id=true;
 return public.lx_music_robot_dashboard();
end $$;
revoke all on function public.lx_music_robot_configure(boolean,integer,text[],text,text,text) from public,anon;
grant execute on function public.lx_music_robot_configure(boolean,integer,text[],text,text,text) to authenticated;
-- Service-only atomic daily lease. No credentials are exposed by admin RPC.
create or replace function public.lx_music_robot_claim()
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.lx_music_robot_config; rid uuid; today date=(now() at time zone 'America/Fortaleza')::date;
begin
 select * into cfg from public.lx_music_robot_config where id=true for update;
 if cfg is null or not cfg.enabled then return null;end if;
 if cfg.day<>today then update public.lx_music_robot_config set day=today,processed=0,lease_until=null where id=true returning * into cfg;end if;
 if cfg.lease_until>now() or cfg.processed>=cfg.daily_limit then return null;end if;
 update public.lx_music_robot_config set lease_until=now()+interval '110 seconds',last_run_at=now() where id=true;
 insert into public.lx_music_robot_runs(status) values('running') returning id into rid;
 return jsonb_build_object('run_id',rid,'limit',least(cfg.batch_size,cfg.daily_limit-cfg.processed),'queries',cfg.queries,'cursor',cfg.query_cursor);
end $$;
revoke all on function public.lx_music_robot_claim() from public,anon,authenticated;
grant execute on function public.lx_music_robot_claim() to service_role;
create or replace function public.lx_music_robot_stage(p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry jsonb; src text; ttl text; external text;cid bigint;added int=0;dup int=0;attempt int;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>50 or octet_length(p_items::text)>250000 then raise exception 'BATCH_LIMIT'; end if;
 for entry in select value from jsonb_array_elements(p_items) loop
  src:=entry->>'sourceUrl';ttl:=btrim(coalesce(entry->>'title',''));external:=entry->>'externalId';
  if ttl='' or char_length(ttl)>200 or (src !~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$' and src !~ '^https://open[.]spotify[.]com/track/[A-Za-z0-9]{22}$') then continue;end if;
  perform pg_advisory_xact_lock(hashtextextended(src,0));
  if exists(select 1 from public.lx_catalog where payload->>'sourceUrl'=src or (external<>'' and payload->>'externalId'=external)) then dup:=dup+1;continue;end if;
  for attempt in 1..5 loop
   cid:=(extract(epoch from clock_timestamp())*1000000)::bigint+floor(random()*1000)::bigint;
   begin
    insert into public.lx_catalog(id,payload,published,updated_at)
    values(cid,jsonb_build_object('id',cid,'type','Música','title',left(ttl,200),'sourceUrl',src,'sourceKind','auto','cover',left(coalesce(entry->>'cover',''),1500),
      'artist',left(coalesce(entry->>'artist',''),200),'album',left(coalesce(entry->>'album',''),200),'genre',left(coalesce(entry->>'genre',''),120),
      'year',nullif(entry->>'year','')::integer,'externalId',external,'officialEmbedded',true,'importMethod','music-robot-draft','metadataReviewed',false,'robotProvider',entry->>'provider'),false,now());
    added:=added+1;exit;
   exception when unique_violation then if attempt=5 then raise;end if;
   end;
  end loop;
 end loop;
 return jsonb_build_object('added',added,'duplicates',dup);
end $$;
revoke all on function public.lx_music_robot_stage(jsonb) from public,anon,authenticated;
grant execute on function public.lx_music_robot_stage(jsonb) to service_role;
create or replace function public.lx_music_robot_finish(p_run uuid,p_scanned integer,p_added integer,p_duplicates integer,p_status text,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare current_run public.lx_music_robot_runs; cfg public.lx_music_robot_config;
begin
 select * into current_run from public.lx_music_robot_runs where id=p_run and status='running' for update;
 if current_run is null then return false;end if;
 update public.lx_music_robot_runs set finished_at=now(),status=case when p_status in ('success','partial','needs_setup','error') then p_status else 'error' end,
 scanned=greatest(0,least(200,p_scanned)),added=greatest(0,least(200,p_added)),duplicates=greatest(0,least(200,p_duplicates)),error_code=left(coalesce(p_error,''),120) where id=p_run;
 update public.lx_music_robot_config set lease_until=null,processed=processed+greatest(0,least(200,p_added)),query_cursor=(query_cursor+1)%greatest(1,array_length(queries,1)) where id=true;
 return true;
end $$;
revoke all on function public.lx_music_robot_finish(uuid,integer,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.lx_music_robot_finish(uuid,integer,integer,integer,text,text) to service_role;
-- Hourly bounded runs; daily target is enforced in DB at local-date rollover.
create or replace function lx_private.music_robot_tick()
returns bigint language plpgsql set search_path='' as $$
declare token text; request_id bigint;
begin
 if not exists(select 1 from public.lx_music_robot_config where id=true and enabled and (lease_until is null or lease_until<now()) and (day<>(now() at time zone 'America/Fortaleza')::date or processed<daily_limit)) then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='lx_auto_scheduler';
 if token is null then raise exception 'SCHEDULER_NOT_CONFIGURED';end if;
 select net.http_post(url:='https://ubidogquzpdvrbzbhxda.supabase.co/functions/v1/lx-music-robot',
  headers:=jsonb_build_object('Content-Type','application/json','x-lx-job-token',token),
  body:='{"action":"run"}'::jsonb,timeout_milliseconds:=120000) into request_id;
 return request_id;
end $$;
revoke all on function lx_private.music_robot_tick() from public,anon,authenticated;
-- No new jobs are activated automatically until owner configures licensed provider access.
select cron.schedule('lx-music-robot-hourly','7 * * * *','select lx_private.music_robot_tick()');
