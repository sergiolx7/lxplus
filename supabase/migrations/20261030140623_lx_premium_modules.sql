-- LX Group. Additive modules; existing Auth, profiles, messages and media are retained.
create table public.lx_posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id),
 body text not null default '' check(length(body)<=4000), media_path text,
 media_type text check(media_type in ('image','video')), visibility text not null default 'public' check(visibility in('public','friends','private')),
 status text not null default 'published' check(status in('published','hidden')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(length(trim(body))>0 or media_path is not null),
 check(media_path is null or media_path like author_id::text||'/post/'||id::text||'/%')
);
create index lx_posts_feed_idx on public.lx_posts(created_at desc,id desc) where status='published';
create index lx_posts_author_idx on public.lx_posts(author_id,created_at desc);
alter table public.lx_posts enable row level security;
create policy posts_read on public.lx_posts for select to authenticated using(
 (select public.lx_is_approved()) and (author_id=(select auth.uid()) or ((status='published') and (visibility='public' or (visibility='friends' and exists(select 1 from public.lx_friendships f where f.status='accepted' and ((f.user_low=(select auth.uid()) and f.user_high=author_id) or (f.user_high=(select auth.uid()) and f.user_low=author_id))))))) or (select public.lx_admin_can('users'))
);
create policy posts_create on public.lx_posts for insert to authenticated with check(author_id=(select auth.uid()) and (select public.lx_is_approved()) and status='published');
create policy posts_update on public.lx_posts for update to authenticated using(author_id=(select auth.uid()) or (select public.lx_admin_can('users'))) with check(author_id=(select auth.uid()) or (select public.lx_admin_can('users')));
create policy posts_delete on public.lx_posts for delete to authenticated using(author_id=(select auth.uid()) or (select public.lx_admin_can('users')));

create table public.lx_post_likes(post_id uuid references public.lx_posts(id) on delete cascade,user_id uuid references auth.users(id),created_at timestamptz not null default now(),primary key(post_id,user_id));
alter table public.lx_post_likes enable row level security;
create policy likes_read on public.lx_post_likes for select to authenticated using(exists(select 1 from public.lx_posts p where p.id=post_id));
create policy likes_create on public.lx_post_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.lx_posts p where p.id=post_id));
create policy likes_remove on public.lx_post_likes for delete to authenticated using(user_id=(select auth.uid()));
create index lx_post_likes_user_idx on public.lx_post_likes(user_id);
create table public.lx_post_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.lx_posts(id) on delete cascade,user_id uuid not null references auth.users(id),body text not null check(length(trim(body)) between 1 and 1500),created_at timestamptz not null default now());
alter table public.lx_post_comments enable row level security;
create policy comments_read on public.lx_post_comments for select to authenticated using(exists(select 1 from public.lx_posts p where p.id=post_id));
create policy comments_create on public.lx_post_comments for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.lx_posts p where p.id=post_id));
create policy comments_remove on public.lx_post_comments for delete to authenticated using(user_id=(select auth.uid()) or (select public.lx_admin_can('users')));
create index lx_post_comments_post_idx on public.lx_post_comments(post_id,created_at);
create index lx_post_comments_user_idx on public.lx_post_comments(user_id);

create table public.lx_moderation_reports(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),target_kind text not null check(target_kind in('post','profile','message')),target_id text not null check(length(target_id)<=100),reason text not null check(length(trim(reason)) between 5 and 1500),status text not null default 'open' check(status in('open','reviewed','dismissed')),created_at timestamptz not null default now());
alter table public.lx_moderation_reports enable row level security;
create policy reports_create on public.lx_moderation_reports for insert to authenticated with check(user_id=(select auth.uid()) and (select public.lx_is_approved()) and status='open');
create policy reports_read on public.lx_moderation_reports for select to authenticated using(user_id=(select auth.uid()) or (select public.lx_admin_can('users')));
create policy reports_review on public.lx_moderation_reports for update to authenticated using((select public.lx_admin_can('users'))) with check((select public.lx_admin_can('users')));
create index lx_reports_user_idx on public.lx_moderation_reports(user_id);

create table public.lx_group_messages(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.lx_groups(id),sender_id uuid not null references auth.users(id),body text not null default '' check(length(body)<=4000),kind text not null default 'text' check(kind in('text','image','file','audio')),media_path text,created_at timestamptz not null default now(),check(length(trim(body))>0 or media_path is not null),check(media_path is null or media_path like sender_id::text||'/group/'||group_id::text||'/%'));
alter table public.lx_group_messages enable row level security;
create policy group_messages_read on public.lx_group_messages for select to authenticated using((select public.lx_is_approved()) and public.lx_is_group_member(group_id));
create policy group_messages_create on public.lx_group_messages for insert to authenticated with check(sender_id=(select auth.uid()) and (select public.lx_is_approved()) and public.lx_is_group_member(group_id));
create index lx_group_messages_timeline_idx on public.lx_group_messages(group_id,created_at desc,id desc);
create index lx_group_messages_sender_idx on public.lx_group_messages(sender_id);

create table public.lx_playlists(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),name text not null check(length(trim(name)) between 1 and 100),description text not null default '' check(length(description)<=500),visibility text not null default 'private' check(visibility in('private','public')),created_at timestamptz not null default now());
alter table public.lx_playlists enable row level security;
create policy playlists_read on public.lx_playlists for select to authenticated using(owner_id=(select auth.uid()) or (visibility='public' and (select public.lx_is_approved())));
create policy playlists_create on public.lx_playlists for insert to authenticated with check(owner_id=(select auth.uid()) and (select public.lx_is_approved()));
create policy playlists_update on public.lx_playlists for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy playlists_delete on public.lx_playlists for delete to authenticated using(owner_id=(select auth.uid()));
create index lx_playlists_owner_idx on public.lx_playlists(owner_id,created_at desc);
create table public.lx_playlist_tracks(playlist_id uuid references public.lx_playlists(id) on delete cascade,track_id bigint references public.lx_catalog(id) on delete cascade,position integer not null default 0 check(position>=0),added_at timestamptz not null default now(),primary key(playlist_id,track_id));
alter table public.lx_playlist_tracks enable row level security;
create policy playlist_tracks_read on public.lx_playlist_tracks for select to authenticated using(exists(select 1 from public.lx_playlists p where p.id=playlist_id));
create policy playlist_tracks_create on public.lx_playlist_tracks for insert to authenticated with check(exists(select 1 from public.lx_playlists p where p.id=playlist_id and p.owner_id=(select auth.uid())) and exists(select 1 from public.lx_catalog c where c.id=track_id and c.payload->>'type'='Música'));
create policy playlist_tracks_delete on public.lx_playlist_tracks for delete to authenticated using(exists(select 1 from public.lx_playlists p where p.id=playlist_id and p.owner_id=(select auth.uid())));
create index lx_playlist_tracks_track_idx on public.lx_playlist_tracks(track_id);

create table public.lx_catalog_versions(id bigint generated always as identity primary key,catalog_id bigint not null,operation text not null,previous jsonb,current jsonb,actor_id uuid,created_at timestamptz not null default now());
alter table public.lx_catalog_versions enable row level security;
create policy catalog_versions_read on public.lx_catalog_versions for select to authenticated using((select public.lx_admin_can('catalog')));
create index lx_catalog_versions_item_idx on public.lx_catalog_versions(catalog_id,created_at desc);
create or replace function lx_private.capture_catalog_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.lx_catalog_versions(catalog_id,operation,previous,current,actor_id)
 values(coalesce(new.id,old.id),tg_op,case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,auth.uid());
 return coalesce(new,old);
end $$;
revoke all on function lx_private.capture_catalog_version() from public,anon,authenticated;
create trigger lx_premium_catalog_versions after insert or update or delete on public.lx_catalog for each row execute function lx_private.capture_catalog_version();

create table public.lx_telemetry(id bigint generated always as identity primary key,user_id uuid not null default auth.uid(),category text not null check(category in('error','playback','auth','performance','page')),feature text not null check(length(feature)<=80),message text not null default '' check(length(message)<=500),duration_ms integer check(duration_ms between 0 and 600000),created_at timestamptz not null default now());
alter table public.lx_telemetry enable row level security;
create policy telemetry_create on public.lx_telemetry for insert to authenticated with check(user_id=(select auth.uid()) and (select public.lx_is_approved()));
create policy telemetry_read on public.lx_telemetry for select to authenticated using((select public.lx_admin_can('users')));
create index lx_telemetry_period_idx on public.lx_telemetry(created_at desc,category);
create index lx_telemetry_user_idx on public.lx_telemetry(user_id);

create table public.lx_support_consents(ticket_id bigint primary key references public.lx_support_tickets(id),user_id uuid not null references auth.users(id),expires_at timestamptz not null default now()+interval '30 minutes',diagnostics jsonb not null default '{}' check(octet_length(diagnostics::text)<12000),created_at timestamptz not null default now(),check(expires_at<=created_at+interval '1 hour'));
alter table public.lx_support_consents enable row level security;
create policy support_consents_read on public.lx_support_consents for select to authenticated using(user_id=(select auth.uid()) or (expires_at>now() and (select public.lx_admin_can('users'))));
create policy support_consents_create on public.lx_support_consents for insert to authenticated with check(user_id=(select auth.uid()) and expires_at>now() and exists(select 1 from public.lx_support_tickets t where t.id=ticket_id and t.user_id=(select auth.uid())));
create policy support_consents_revoke on public.lx_support_consents for delete to authenticated using(user_id=(select auth.uid()));
create index lx_support_consents_user_idx on public.lx_support_consents(user_id);

create table public.lx_drive_sources(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 100),folder_id text not null check(folder_id ~ '^[A-Za-z0-9_-]{10,128}$'),enabled boolean not null default false,authorized boolean not null default false,created_by uuid not null references auth.users(id),last_sync_at timestamptz,next_sync_at timestamptz not null default now(),last_error text,created_at timestamptz not null default now(),unique(folder_id));
create table public.lx_import_jobs(id uuid primary key default gen_random_uuid(),source_id uuid references public.lx_drive_sources(id),created_by uuid not null references auth.users(id),status text not null default 'pending' check(status in('pending','scanning','review','complete','error')),cursor jsonb not null default '{}',processed integer not null default 0,last_error text,lease_until timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.lx_import_items(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.lx_import_jobs(id),source_key text not null,filename text not null,payload jsonb not null default '{}',confidence numeric not null default 0,status text not null default 'review' check(status in('review','ready','published','duplicate','rejected','error')),reason text,catalog_id bigint,created_at timestamptz not null default now(),unique(job_id,source_key));
create index lx_import_jobs_source_idx on public.lx_import_jobs(source_id,created_at desc);
create index lx_import_jobs_creator_idx on public.lx_import_jobs(created_by);
create index lx_import_items_job_idx on public.lx_import_items(job_id,status);
create index lx_import_items_source_idx on public.lx_import_items(source_key);
alter table public.lx_drive_sources enable row level security;
alter table public.lx_import_jobs enable row level security;
alter table public.lx_import_items enable row level security;
create policy drive_sources_read on public.lx_drive_sources for select to authenticated using((select public.lx_admin_can('catalog')));
create policy drive_sources_create on public.lx_drive_sources for insert to authenticated with check((select public.lx_admin_can('catalog')) and created_by=(select auth.uid()));
create policy drive_sources_update on public.lx_drive_sources for update to authenticated using((select public.lx_admin_can('catalog'))) with check((select public.lx_admin_can('catalog')));
create policy import_jobs_read on public.lx_import_jobs for select to authenticated using((select public.lx_admin_can('catalog')));
create policy import_items_read on public.lx_import_items for select to authenticated using((select public.lx_admin_can('catalog')));
create policy import_items_update on public.lx_import_items for update to authenticated using((select public.lx_admin_can('catalog'))) with check((select public.lx_admin_can('catalog')));

create or replace function public.lx_set_user_field(p_key text,p_value jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or p_key !~ '^[a-zA-Z][a-zA-Z0-9_]{0,49}$' or octet_length(p_value::text)>2000000 then raise exception 'INVALID_STATE'; end if;
 insert into public.lx_user_state(user_id,data,updated_at) values(auth.uid(),jsonb_build_object(p_key,p_value),now())
 on conflict(user_id) do update set data=coalesce(lx_user_state.data,'{}')||jsonb_build_object(p_key,p_value),updated_at=now() returning data into result;
 return result;
end $$;
revoke all on function public.lx_set_user_field(text,jsonb) from public,anon;
grant execute on function public.lx_set_user_field(text,jsonb) to authenticated;

create or replace function public.lx_save_progress(p_content bigint,p_position integer,p_duration integer) returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or p_position<0 or p_duration<0 or p_position>604800 or p_duration>604800 then raise exception 'INVALID_PROGRESS'; end if;
 insert into public.lx_user_state(user_id,data,updated_at) values(auth.uid(),jsonb_build_object('history',jsonb_build_object(p_content::text,jsonb_build_object('position',p_position,'duration',p_duration,'updatedAt',now()))),now())
 on conflict(user_id) do update set data=jsonb_set(coalesce(lx_user_state.data,'{}'),'{history}',coalesce(lx_user_state.data->'history','{}')||jsonb_build_object(p_content::text,jsonb_build_object('position',p_position,'duration',p_duration,'updatedAt',now()))),updated_at=now();
end $$;
revoke all on function public.lx_save_progress(bigint,integer,integer) from public,anon;
grant execute on function public.lx_save_progress(bigint,integer,integer) to authenticated;

create or replace function lx_private.plus_directory() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.name,'username',p.username,'verified',p.verified,'avatar_url',p.avatar_url,'banner_url',p.banner_url,'bio',p.bio,'calls_enabled',p.calls_enabled,'social_visible',p.social_visible,'relation',coalesce(f.status,'none'),'direction',case when f.status='pending' then case when f.requested_by=auth.uid() then 'outgoing' else 'incoming' end else 'none' end) order by p.name),'[]'::jsonb)
 from public.lx_profiles p left join public.lx_friendships f on ((f.user_low=auth.uid() and f.user_high=p.user_id) or (f.user_high=auth.uid() and f.user_low=p.user_id))
 where auth.uid() is not null and public.lx_is_approved() and p.approved and (p.user_id=auth.uid() or p.social_visible or f.status in('accepted','pending'));
$$;
revoke all on function lx_private.plus_directory() from public,anon;
grant execute on function lx_private.plus_directory() to authenticated;
create function public.lx_plus_directory() returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.plus_directory()$$;
revoke all on function public.lx_plus_directory() from public,anon;
grant execute on function public.lx_plus_directory() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('lx-social','lx-social',false,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav','application/pdf','text/plain','application/zip']) on conflict(id) do nothing;
create policy social_upload on storage.objects for insert to authenticated with check(bucket_id='lx-social' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.lx_is_approved()));
create policy social_download on storage.objects for select to authenticated using(bucket_id='lx-social' and (select public.lx_is_approved()) and ((storage.foldername(name))[1]=(select auth.uid())::text or ((storage.foldername(name))[2]='dm' and (storage.foldername(name))[3]=(select auth.uid())::text) or ((storage.foldername(name))[2]='group' and exists(select 1 from public.lx_group_members m where m.group_id::text=(storage.foldername(name))[3] and m.user_id=(select auth.uid()))) or ((storage.foldername(name))[2]='post' and exists(select 1 from public.lx_posts p where p.id::text=(storage.foldername(name))[3] and p.media_path=name))));
create policy social_remove on storage.objects for delete to authenticated using(bucket_id='lx-social' and (storage.foldername(name))[1]=(select auth.uid())::text);

grant select,insert,update,delete on public.lx_posts,public.lx_post_likes,public.lx_post_comments,public.lx_playlists,public.lx_playlist_tracks,public.lx_moderation_reports,public.lx_support_consents to authenticated;
grant select,insert on public.lx_group_messages,public.lx_telemetry to authenticated;
grant select on public.lx_catalog_versions,public.lx_import_jobs to authenticated;
grant select,insert,update on public.lx_drive_sources to authenticated;
grant select,update on public.lx_import_items to authenticated;
grant usage on sequence public.lx_telemetry_id_seq to authenticated;
-- Retain service operations through RLS bypass; ordinary clients still require the policies above.
grant all on public.lx_posts,public.lx_post_likes,public.lx_post_comments,public.lx_playlists,public.lx_playlist_tracks,public.lx_moderation_reports,public.lx_support_consents,public.lx_group_messages,public.lx_telemetry,public.lx_catalog_versions,public.lx_drive_sources,public.lx_import_jobs,public.lx_import_items to service_role;
grant usage,select on sequence public.lx_catalog_versions_id_seq,public.lx_telemetry_id_seq to service_role;

do $$declare t text;begin
 foreach t in array array['lx_posts','lx_post_likes','lx_post_comments','lx_group_messages','lx_user_notifications','lx_messages','lx_calls','lx_call_signals'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop;
end $$;
