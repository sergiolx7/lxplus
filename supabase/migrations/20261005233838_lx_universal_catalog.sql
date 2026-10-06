-- Additive staging migration. No writes, deletes, ID changes or policies on legacy tables.
begin;
create table if not exists public.lx_media_items (
 id uuid primary key default gen_random_uuid(), legacy_id bigint unique references public.lx_catalog(id) on delete restrict,
 kind text not null check(kind in ('movie','series','anime','dorama','documentary','concert','track','album','artist','playlist','book','author','live')),
 title text not null check(length(title) between 1 and 400), original_title text not null default '', description text not null default '',
 cover text not null default '', backdrop text not null default '', logo text not null default '',
 year integer not null default 0, release_date date, duration integer not null default 0 check(duration>=0),
 genres jsonb not null default '[]', countries jsonb not null default '[]', tags jsonb not null default '[]', language text not null default '',
 rating numeric not null default 0, popularity numeric not null default 0, certification text not null default '', metadata jsonb not null default '{}',
 published boolean not null default true, archived boolean not null default false, imported_by_job uuid,
 metadata_refreshed_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 search_document tsvector generated always as (to_tsvector('simple',coalesce(title,'')||' '||coalesce(original_title,'')||' '||coalesce(metadata->>'artist','')||' '||coalesce(metadata->>'authors',''))) stored,
 check(jsonb_typeof(metadata)='object'), check(jsonb_typeof(genres)='array'), check(jsonb_typeof(tags)='array')
);
create index if not exists lx_media_items_search_idx on public.lx_media_items using gin(search_document);
create index if not exists lx_media_items_home_idx on public.lx_media_items(kind,popularity desc,id) where published and not archived;
create index if not exists lx_media_items_job_idx on public.lx_media_items(imported_by_job) where imported_by_job is not null;
create table if not exists public.lx_media_external_ids (
 provider text not null, namespace text not null, external_id text not null, media_id uuid not null references public.lx_media_items(id) on delete cascade,
 primary key(provider,namespace,external_id), check(length(external_id) between 1 and 160)
);
create index if not exists lx_media_external_media_idx on public.lx_media_external_ids(media_id);
create table if not exists public.lx_media_provider_links (
 id uuid primary key default gen_random_uuid(), media_id uuid not null references public.lx_media_items(id) on delete cascade,
 provider text not null, url text not null check(url like 'https://%'), label text not null default '', region text[] not null default '{}', active boolean not null default true,
 updated_at timestamptz not null default now(), unique(media_id,provider,url)
);
create index if not exists lx_media_provider_url_idx on public.lx_media_provider_links(provider,url);
create table if not exists public.lx_media_seasons (
 id uuid primary key default gen_random_uuid(), media_id uuid not null references public.lx_media_items(id) on delete cascade,
 number integer not null check(number>=0), title text not null default '', description text not null default '', cover text not null default '',
 episode_count integer not null default 0, release_date date, refreshed_at timestamptz, unique(media_id,number)
);
create table if not exists public.lx_media_episodes (
 id uuid primary key default gen_random_uuid(), media_id uuid not null references public.lx_media_items(id) on delete cascade,
 season_id uuid not null references public.lx_media_seasons(id) on delete cascade, number integer not null check(number>=0),
 title text not null default '', description text not null default '', image text not null default '', duration integer not null default 0,
 release_date date, tmdb_id bigint, intro_start numeric, intro_end numeric, unique(season_id,number)
);
create index if not exists lx_media_episode_media_idx on public.lx_media_episodes(media_id);
create table if not exists public.lx_media_sources (
 id uuid primary key default gen_random_uuid(), media_id uuid not null references public.lx_media_items(id) on delete cascade,
 episode_id uuid references public.lx_media_episodes(id) on delete cascade,
 provider text not null default 'lx', source_type text not null check(source_type in ('lx','direct','hls','dash','storage','drive','embed','external')),
 url text, storage_bucket text, storage_path text, manifest text, resolution text not null default '', codec text not null default '',
 audio jsonb not null default '[]', subtitles jsonb not null default '[]', quality_variants jsonb not null default '[]',
 drm text not null default 'none' check(drm in ('none','protected','unknown')), region text[] not null default '{}',
 authorized boolean not null default false, authorization_note text not null default '', priority integer not null default 50,
 status text not null default 'unknown' check(status in ('unknown','online','slow','offline','expired','unauthorized','error','region_blocked')),
 latency_ms integer, last_verified_at timestamptz, last_error text, expires_at timestamptz, requirements jsonb not null default '{}',
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(source_type <> 'storage' or (storage_bucket is not null and storage_path is not null)),
 check(source_type='storage' or (url is not null and url like 'https://%'))
);
create index if not exists lx_media_sources_media_idx on public.lx_media_sources(media_id,episode_id,priority);
create index if not exists lx_media_sources_episode_idx on public.lx_media_sources(episode_id) where episode_id is not null;
create index if not exists lx_media_sources_health_idx on public.lx_media_sources(last_verified_at nulls first,id);
create index if not exists lx_media_sources_creator_idx on public.lx_media_sources(created_by);
create table if not exists public.lx_media_relations (
 media_id uuid not null references public.lx_media_items(id) on delete cascade, related_id uuid not null references public.lx_media_items(id) on delete cascade,
 relation text not null check(relation in ('artist','album','track','author','similar','recommendation')), position integer not null default 0,
 primary key(media_id,related_id,relation)
);
create index if not exists lx_media_relations_related_idx on public.lx_media_relations(related_id);
create table if not exists public.lx_media_cache (key text primary key,value jsonb not null,expires_at timestamptz not null);
create index if not exists lx_media_cache_expiry_idx on public.lx_media_cache(expires_at);
create table if not exists public.lx_uc_limits (key text primary key,window_start timestamptz not null,requests integer not null default 0);
create table if not exists public.lx_import_jobs (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id) on delete restrict,
 provider text not null default 'mixed', status text not null default 'queued' check(status in ('queued','processing','completed','error','rolled_back')),
 total integer not null default 0, published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists lx_import_job_user_idx on public.lx_import_jobs(created_by,created_at desc);
create table if not exists public.lx_import_entries (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.lx_import_jobs(id) on delete cascade,
 reference jsonb not null, status text not null default 'queued' check(status in ('queued','processing','completed','duplicate','ignored','error','rolled_back')),
 attempts integer not null default 0, media_id uuid references public.lx_media_items(id) on delete set null,
 updated boolean not null default false, imported_at timestamptz, lease_until timestamptz, next_attempt_at timestamptz not null default now(), last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists lx_import_entry_queue_idx on public.lx_import_entries(job_id,status,next_attempt_at);
create index if not exists lx_import_entry_media_idx on public.lx_import_entries(media_id);
create table if not exists public.lx_media_progress (
 user_id uuid not null references auth.users(id) on delete cascade, media_id uuid not null references public.lx_media_items(id) on delete cascade,
 episode_key text not null default '', position numeric not null default 0 check(position>=0), duration numeric not null default 0 check(duration>=0), completed boolean not null default false,
 updated_at timestamptz not null default now(), primary key(user_id,media_id,episode_key)
);
create index if not exists lx_media_progress_media_idx on public.lx_media_progress(media_id);
create index if not exists lx_media_progress_resume_idx on public.lx_media_progress(user_id,updated_at desc);
create table if not exists public.lx_media_reactions (
 user_id uuid not null references auth.users(id) on delete cascade, media_id uuid not null references public.lx_media_items(id) on delete cascade,
 reaction text not null check(reaction in ('saved','like')), created_at timestamptz not null default now(), primary key(user_id,media_id,reaction)
);
create index if not exists lx_media_reactions_media_idx on public.lx_media_reactions(media_id);
create table if not exists public.lx_media_playlists (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 200), media_ids uuid[] not null default '{}' check(cardinality(media_ids)<=500), updated_at timestamptz not null default now()
);
create index if not exists lx_media_playlist_user_idx on public.lx_media_playlists(user_id);
create table if not exists public.lx_partner_sync (
 provider text primary key, cursor text not null default '', last_sync_at timestamptz, last_error text, lease_until timestamptz,
 stats jsonb not null default '{}', updated_at timestamptz not null default now()
);

-- RLS plus explicit grants: metadata can be read by approved accounts; source URLs, jobs,
-- partner feeds, secrets, cache and write operations are exclusively server-side.
do $rls$
declare t text;
begin
 foreach t in array array['lx_media_items','lx_media_external_ids','lx_media_provider_links','lx_media_seasons','lx_media_episodes','lx_media_sources','lx_media_relations','lx_media_cache','lx_uc_limits','lx_import_jobs','lx_import_entries','lx_media_progress','lx_media_reactions','lx_media_playlists','lx_partner_sync'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['lx_media_items','lx_media_external_ids','lx_media_provider_links','lx_media_seasons','lx_media_episodes','lx_media_relations'] loop
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $rls$;
create policy lx_uc_item_read on public.lx_media_items for select to authenticated using (
 (select public.lx_is_approved()) and not archived and (
 (select public.lx_admin_can('catalog')) or (published and (legacy_id is null or exists(select 1 from public.lx_catalog c where c.id=legacy_id and c.published)))
 )
);
do $policies$
declare t text;
begin
 foreach t in array array['lx_media_external_ids','lx_media_provider_links','lx_media_seasons','lx_media_episodes','lx_media_relations'] loop
  execute format('create policy lx_uc_metadata_read on public.%I for select to authenticated using (exists(select 1 from public.lx_media_items m where m.id=media_id))',t);
 end loop;
 foreach t in array array['lx_media_progress','lx_media_reactions'] loop
  execute format('grant select, insert, update, delete on public.%I to authenticated',t);
  execute format('create policy lx_uc_own_read on public.%I for select to authenticated using ((select auth.uid())=user_id and (select public.lx_is_approved()))',t);
  execute format('create policy lx_uc_own_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id and (select public.lx_is_approved()) and exists(select 1 from public.lx_media_items m where m.id=media_id))',t);
  execute format('create policy lx_uc_own_update on public.%I for update to authenticated using ((select auth.uid())=user_id and (select public.lx_is_approved())) with check ((select auth.uid())=user_id and (select public.lx_is_approved()) and exists(select 1 from public.lx_media_items m where m.id=media_id))',t);
  execute format('create policy lx_uc_own_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id and (select public.lx_is_approved()))',t);
 end loop;
end $policies$;
grant select,insert,update,delete on public.lx_media_playlists to authenticated;
create policy lx_uc_playlist_own on public.lx_media_playlists for all to authenticated using((select auth.uid())=user_id and (select public.lx_is_approved())) with check((select auth.uid())=user_id and (select public.lx_is_approved()));

create or replace function public.lx_uc_gate(p_key text,p_limit integer,p_window_ms integer) returns boolean
language plpgsql security invoker set search_path='' as $fn$
declare accepted boolean;
begin
 if p_limit<1 or p_window_ms<100 or length(p_key)>200 then raise exception 'INVALID_RATE_LIMIT'; end if;
 insert into public.lx_uc_limits(key,window_start,requests) values(p_key,clock_timestamp(),1)
 on conflict(key) do update set
 requests=case when public.lx_uc_limits.window_start<clock_timestamp()-make_interval(secs=>p_window_ms/1000.0) then 1 else public.lx_uc_limits.requests+1 end,
 window_start=case when public.lx_uc_limits.window_start<clock_timestamp()-make_interval(secs=>p_window_ms/1000.0) then clock_timestamp() else public.lx_uc_limits.window_start end
 where public.lx_uc_limits.requests<p_limit or public.lx_uc_limits.window_start<clock_timestamp()-make_interval(secs=>p_window_ms/1000.0)
 returning true into accepted;
 return coalesce(accepted,false);
end $fn$;

create or replace function public.lx_uc_search(p_query text,p_kind text default 'all',p_offset integer default 0,p_limit integer default 24,p_include_drafts boolean default false)
returns setof public.lx_media_items language sql stable security invoker set search_path='' as $fn$
 select m.* from public.lx_media_items m
 where not m.archived and (p_kind='all' or m.kind=p_kind)
 and (p_include_drafts or (m.published and (m.legacy_id is null or exists(select 1 from public.lx_catalog c where c.id=m.legacy_id and c.published))))
 and (m.search_document@@websearch_to_tsquery('simple',left(p_query,100)) or m.title ilike '%'||replace(replace(left(p_query,100),'%','\%'),'_','\_')||'%')
 order by ts_rank(m.search_document,websearch_to_tsquery('simple',left(p_query,100))) desc,m.popularity desc,m.id
 limit greatest(1,least(p_limit,40)) offset greatest(0,least(p_offset,20000));
$fn$;

-- Locks all external IDs in a stable order, so concurrent imports converge on one item.
-- Duplicate imports never overwrite an administrator's existing edits or legacy payloads.
create or replace function public.lx_uc_import(p_item jsonb,p_ids jsonb,p_seasons jsonb default '[]',p_links jsonb default '[]',p_job uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare e jsonb; mid uuid; matches uuid[]; item public.lx_media_items; legacy bigint; lockkey text;
begin
 if jsonb_array_length(p_ids)<1 or jsonb_array_length(p_ids)>30 then raise exception 'EXTERNAL_ID_REQUIRED';end if;
 for lockkey in select x->>'provider'||':'||(x->>'namespace')||':'||(x->>'external_id') from jsonb_array_elements(p_ids) x order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended(lockkey,0));
 end loop;
 select array_agg(distinct i.media_id) into matches from public.lx_media_external_ids i join jsonb_array_elements(p_ids) x
 on i.provider=x->>'provider' and i.namespace=x->>'namespace' and i.external_id=x->>'external_id';
 if cardinality(matches)>1 then raise exception 'IDENTITY_CONFLICT';end if;
 mid=matches[1];
 legacy=nullif(p_item->>'legacy_id','')::bigint;
 if legacy is null then
  for e in select * from jsonb_array_elements(p_ids) loop
   if e->>'provider'='tmdb' then
    select c.id into legacy from public.lx_catalog c where
     coalesce(c.payload->>'tmdbId',case when c.payload->>'metadataProvider' ilike '%tmdb%' then c.payload->>'remoteId' end)=e->>'external_id'
     and (case when c.payload->>'type'='Filme' then 'movie' else 'tv' end)=e->>'namespace' order by c.id limit 1;
   elsif e->>'provider'='isbn' then
    select c.id into legacy from public.lx_catalog c where c.payload->>'isbn'=e->>'external_id' and c.payload->>'type'='Livro' order by c.id limit 1;
   end if;
   exit when legacy is not null;
  end loop;
 end if;
 if mid is null and legacy is not null then select id into mid from public.lx_media_items where legacy_id=legacy;end if;
 if mid is not null then
  for e in select * from jsonb_array_elements(p_ids) loop
   insert into public.lx_media_external_ids(provider,namespace,external_id,media_id) values(e->>'provider',e->>'namespace',e->>'external_id',mid) on conflict do nothing;
  end loop;
  select * into item from public.lx_media_items where id=mid;
  return jsonb_build_object('item',to_jsonb(item),'duplicate',true);
 end if;
 insert into public.lx_media_items(legacy_id,kind,title,original_title,description,cover,backdrop,logo,year,release_date,duration,genres,countries,tags,language,rating,popularity,certification,metadata,published,imported_by_job)
 values(legacy,p_item->>'kind',p_item->>'title',coalesce(p_item->>'original_title',''),coalesce(p_item->>'description',''),coalesce(p_item->>'cover',''),coalesce(p_item->>'backdrop',''),coalesce(p_item->>'logo',''),coalesce((p_item->>'year')::integer,0),nullif(p_item->>'release_date','')::date,coalesce((p_item->>'duration')::integer,0),coalesce(p_item->'genres','[]'),coalesce(p_item->'countries','[]'),coalesce(p_item->'tags','[]'),coalesce(p_item->>'language',''),coalesce((p_item->>'rating')::numeric,0),coalesce((p_item->>'popularity')::numeric,0),coalesce(p_item->>'certification',''),coalesce(p_item->'metadata','{}'),coalesce((p_item->>'published')::boolean,true),p_job) returning * into item;
 mid=item.id;
 for e in select * from jsonb_array_elements(p_ids) loop
  insert into public.lx_media_external_ids(provider,namespace,external_id,media_id) values(e->>'provider',e->>'namespace',e->>'external_id',mid);
 end loop;
 if legacy is not null then insert into public.lx_media_external_ids(provider,namespace,external_id,media_id) values('legacy','catalog',legacy::text,mid) on conflict do nothing;end if;
 for e in select * from jsonb_array_elements(p_seasons) loop
  insert into public.lx_media_seasons(media_id,number,title,description,cover,episode_count,release_date) values(mid,(e->>'number')::integer,coalesce(e->>'title',''),coalesce(e->>'description',''),coalesce(e->>'cover',''),coalesce((e->>'episodes')::integer,0),nullif(e->>'release_date','')::date);
 end loop;
 for e in select * from jsonb_array_elements(p_links) loop
  insert into public.lx_media_provider_links(media_id,provider,url,label) values(mid,e->>'provider',e->>'url',coalesce(e->>'label','')) on conflict do nothing;
 end loop;
 return jsonb_build_object('item',to_jsonb(item),'duplicate',false);
end $fn$;

create or replace function public.lx_uc_enqueue(p_user uuid,p_refs jsonb,p_published boolean default false,p_provider text default 'mixed') returns uuid
language plpgsql security invoker set search_path='' as $fn$
declare jid uuid;
begin
 if jsonb_array_length(p_refs)<1 or jsonb_array_length(p_refs)>2000 then raise exception 'INVALID_BATCH_SIZE';end if;
 insert into public.lx_import_jobs(created_by,total,published,provider) values(p_user,jsonb_array_length(p_refs),p_published,p_provider) returning id into jid;
 insert into public.lx_import_entries(job_id,reference) select jid,value from jsonb_array_elements(p_refs);
 return jid;
end $fn$;
create or replace function public.lx_uc_claim(p_job uuid,p_limit integer default 4) returns setof public.lx_import_entries
language sql security invoker set search_path='' as $fn$
 with exhausted as (update public.lx_import_entries set status='error',last_error='IMPORT_LEASE_EXHAUSTED',lease_until=null,updated_at=now() where job_id=p_job and attempts>=5 and status in ('queued','processing') and (lease_until is null or lease_until<now()) returning id)
 update public.lx_import_entries e set status='processing',attempts=e.attempts+1,lease_until=now()+interval '5 minutes',updated_at=now()
 where e.id in (select q.id from public.lx_import_entries q join public.lx_import_jobs j on j.id=q.job_id where q.job_id=p_job and j.status in ('queued','processing') and
 ((q.status='queued' and q.next_attempt_at<=now()) or(q.status='processing' and q.lease_until<now())) and q.attempts<5
 order by q.created_at,q.id for update of q skip locked limit greatest(1,least(p_limit,6))) returning e.*;
$fn$;
create or replace function public.lx_uc_rollback(p_job uuid) returns jsonb
language plpgsql security invoker set search_path='' as $fn$
declare changed integer; preserved integer;
begin
 perform 1 from public.lx_import_jobs where id=p_job and status in ('completed','error') for update;
 if not found then raise exception 'JOB_NOT_FINISHED';end if;
 update public.lx_media_items m set archived=true,updated_at=now()
 where m.imported_by_job=p_job and m.legacy_id is null and m.updated_at=(select max(e.imported_at) from public.lx_import_entries e where e.job_id=p_job and e.media_id=m.id and e.status='completed')
 and not exists(select 1 from public.lx_media_sources s where s.media_id=m.id)
 and not exists(select 1 from public.lx_media_progress p where p.media_id=m.id)
 and not exists(select 1 from public.lx_media_reactions r where r.media_id=m.id)
 and not exists(select 1 from public.lx_media_relations r where r.related_id=m.id)
 and not exists(select 1 from public.lx_media_playlists p where m.id=any(p.media_ids));
 get diagnostics changed=row_count;
 update public.lx_import_entries e set status='rolled_back',updated_at=now() where e.job_id=p_job and e.status='completed' and exists(select 1 from public.lx_media_items m where m.id=e.media_id and m.archived);
 select count(*) into preserved from public.lx_import_entries where job_id=p_job and status='completed';
 update public.lx_import_jobs set status='rolled_back',updated_at=now() where id=p_job;
 return jsonb_build_object('rolled_back',changed,'preserved',preserved);
end $fn$;

create or replace function public.lx_uc_dashboard() returns jsonb
language sql stable security invoker set search_path='' as $fn$
 with legacy as (
 select c.id, c.payload,
 case c.payload->>'type' when 'Filme' then 'movie' when 'Série' then 'series' when 'Anime' then 'anime' when 'Dorama' then 'dorama' when 'Livro' then 'book' when 'Música' then 'track' else 'live' end as kind,
 (nullif(c.payload->>'mediaKey','') is not null or nullif(c.payload->>'authorizedAudioUrl','') is not null or nullif(c.payload->>'externalReadUrl','') is not null
 or jsonb_array_length(case when jsonb_typeof(c.payload->'chapters')='array' then c.payload->'chapters' else '[]' end)>0
 or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(c.payload->'tracks')='array' then c.payload->'tracks' else '[]' end) t where nullif(t->>'mediaKey','') is not null)
 or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(c.payload->'episodes')='array' then c.payload->'episodes' else '[]' end) t where nullif(t->>'mediaKey','') is not null)) as playable
 from public.lx_catalog c
 ), all_items as (
 select m.id::text,m.kind,m.cover,m.description,
 (exists(select 1 from public.lx_media_sources s where s.media_id=m.id and s.authorized and s.drm='none' and s.status in ('online','slow','unknown') and s.source_type<>'external' and not coalesce((s.requirements->>'partner_player')::boolean,false) and not coalesce((s.requirements->>'advertisements')::boolean,false) and (s.expires_at is null or s.expires_at>now()) and (cardinality(s.region)=0 or 'BR'=any(s.region))) or coalesce((select l.playable from legacy l where l.id=m.legacy_id),false)) as playable
 from public.lx_media_items m where not m.archived
 union all
 select l.id::text,l.kind,coalesce(l.payload->>'cover',''),coalesce(l.payload->>'desc',''),l.playable from legacy l
 where not exists(select 1 from public.lx_media_items m where m.legacy_id=l.id)
 ), counts as (select kind,count(*) as n from all_items group by kind)
 select jsonb_build_object('counts',coalesce((select jsonb_object_agg(kind,n) from counts),'{}'::jsonb),
 'total',(select count(*) from all_items),'with_playback',(select count(*) from all_items where playable),
 'metadata_only',(select count(*) from all_items where not playable),'missing_cover',(select count(*) from all_items where cover=''),
 'missing_metadata',(select count(*) from all_items where description=''),
 'offline',(select count(*) from public.lx_media_sources where status in ('offline','expired','error','unauthorized','region_blocked')),
 'episodes',(select count(*) from public.lx_media_episodes)+(select coalesce(sum(jsonb_array_length(case when jsonb_typeof(payload->'episodes')='array' then payload->'episodes' else '[]' end)),0) from legacy),
 'import_errors',(select count(*) from public.lx_import_entries where status='error'));
$fn$;

-- Every privileged RPC is INVOKER and has no EXECUTE grant to public/client roles.
do $permissions$
declare function_row record;
begin
 for function_row in select f.oid::regprocedure as name from pg_proc f join pg_namespace n on n.oid=f.pronamespace where n.nspname='public' and f.proname like 'lx_uc_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',function_row.name);
  execute format('grant execute on function %s to service_role',function_row.name);
 end loop;
end $permissions$;
commit;
