-- LX UI36: unique identities, verified levels and richer recap. Additive migration.
alter table public.lx_profiles add column username text;
create unique index lx_profiles_username_unique on public.lx_profiles (username);
create function lx_private.profile_username() returns trigger
language plpgsql security definer set search_path='' as $$
declare stem text; candidate text; suffix integer:=0;
begin
 if new.username is null then
  stem:=lower(translate(coalesce(new.name,'lx'), 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'));
  stem:=trim(both '_' from regexp_replace(stem,'[^a-z0-9]+','_','g'));
  if stem !~ '^[a-z]' or length(stem)<3 then stem:='lx_'||stem; end if;
  stem:=left(stem,24); candidate:=stem;
  perform pg_advisory_xact_lock(hashtextextended('lx_username:'||stem,36));
  while exists(select 1 from public.lx_profiles p where p.username=candidate and p.user_id<>new.user_id) loop
   suffix:=suffix+1;
   candidate:=left(stem,14)||'_'||left(replace(new.user_id::text,'-',''),8)||case when suffix>1 then suffix::text else '' end;
  end loop;
  new.username:=candidate;
 else new.username:=lower(trim(new.username)); end if;
 if new.username !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'INVALID_USERNAME'; end if;
 return new;
end $$;
create trigger lx_profile_username before insert or update of username on public.lx_profiles for each row execute function lx_private.profile_username();
update public.lx_profiles set username=null;
alter table public.lx_profiles alter column username set not null;
alter table public.lx_profiles add constraint lx_profile_username_format check(username ~ '^[a-z][a-z0-9_]{2,23}$');
revoke all on function lx_private.profile_username() from public,anon,authenticated;

create function public.lx_set_username(p_username text) returns text
language plpgsql security invoker set search_path='' as $$
declare result text;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 if lower(trim(p_username)) !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'INVALID_USERNAME'; end if;
 update public.lx_profiles set username=lower(trim(p_username)) where user_id=auth.uid() returning username into result;
 return result;
end $$;

-- Levels use the confirmed event ledger, never editable profile counters.
create function lx_private.member_progress(p_user uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with stats as (
  select coalesce(sum(points),0)::bigint xp,
   count(*) filter(where event_type='music_valid') music,
   count(*) filter(where event_type='watch_valid') watched,
   count(*) filter(where event_type='read_valid') books
  from public.lx_rank_events where user_id=p_user and status='confirmed'
 ), levels as (select *,floor(sqrt(xp::numeric/50))::int+1 level from stats)
 select jsonb_build_object('xp',xp,'level',level,'level_start',50::bigint*(level-1)*(level-1),
  'level_next',50::bigint*level*level,'music',music,'watched',watched,'books',books) from levels
$$;
revoke all on function lx_private.member_progress(uuid) from public,anon,authenticated;

create function lx_private.community_identity() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'username',p.username,
   'progress',case when p.ranking_visible or p.user_id=auth.uid() then lx_private.member_progress(p.user_id) else null end)),'[]'::jsonb)
 from public.lx_profiles p where auth.uid() is not null and public.lx_is_approved() and
 (p.user_id=auth.uid() or exists(select 1 from public.lx_social_directory() d where d.user_id=p.user_id))
$$;
create function public.lx_community_identity() returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.community_identity()$$;

create function lx_private.member_profile(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.lx_profiles; accessible boolean; results_visible boolean; progress jsonb;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 select * into p from public.lx_profiles where user_id=p_user;
 accessible:=p.user_id=auth.uid() or (p.approved and (p.ranking_visible or exists(select 1 from public.lx_social_directory() d where d.user_id=p.user_id)));
 if not coalesce(accessible,false) then return jsonb_build_object('private',true); end if;
 results_visible:=p.user_id=auth.uid() or (p.activity_visible and (p.social_visible or exists(select 1 from public.lx_social_directory() d where d.user_id=p.user_id and d.relation='accepted')));
 if p.ranking_visible or p.user_id=auth.uid() then progress:=lx_private.member_progress(p_user); end if;
 return jsonb_build_object('user_id',p.user_id,'name',p.name,'username',p.username,'avatar_url',p.avatar_url,
  'banner_url',p.banner_url,'verified',p.verified,'bio',p.bio,'created_at',p.created_at,'private',false,
  'progress',progress,'results_visible',results_visible,'favorites_visible',p.favorites_visible and results_visible,
  'favorite_ids',case when p.favorites_visible and results_visible then p.favorite_ids else '[]'::jsonb end,
  'listening_seconds',case when results_visible then (select coalesce(sum(seconds),0) from public.lx_listening_daily where user_id=p_user) else null end);
end $$;
create function public.lx_member_profile(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.member_profile(p_user)$$;

-- Actual video playback is sampled independently from the seek position.
create table public.lx_viewing_sessions (
 user_id uuid not null references public.lx_profiles(user_id) on delete cascade,
 session_id uuid not null,content_key text not null,reported integer not null default 0,
 credited integer not null default 0,updated_at timestamptz not null default now(),primary key(user_id,session_id)
);
alter table public.lx_viewing_sessions enable row level security;
revoke all on public.lx_viewing_sessions from anon,authenticated;
create function lx_private.record_viewing(p_session uuid,p_content text,p_total integer) returns integer
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); old public.lx_viewing_sessions; latest timestamptz; delta integer;
begin
 if u is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 if p_session is null or length(p_content) not between 1 and 180 or p_total not between 0 and 86400 then raise exception 'INVALID_VIEW'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,36));
 select * into old from public.lx_viewing_sessions where user_id=u and session_id=p_session;
 if found and old.content_key<>p_content then raise exception 'CONTENT_MISMATCH'; end if;
 if p_total<=coalesce(old.reported,-1) then return 0; end if;
 select max(updated_at) into latest from public.lx_viewing_sessions where user_id=u;
 delta:=least(90,greatest(0,p_total-coalesce(old.reported,0)),case when latest is null then 30 else greatest(0,floor(extract(epoch from now()-latest))::int) end);
 insert into public.lx_viewing_sessions(user_id,session_id,content_key,reported,credited) values(u,p_session,p_content,p_total,delta)
 on conflict(user_id,session_id) do update set reported=excluded.reported,credited=public.lx_viewing_sessions.credited+delta,updated_at=now();
 return delta;
end $$;
create function public.lx_record_viewing(p_session uuid,p_content text,p_total integer) returns integer language sql security invoker set search_path='' as $$select lx_private.record_viewing(p_session,p_content,p_total)$$;

create function lx_private.verify_playback_award() returns trigger
language plpgsql security definer set search_path='' as $$
declare sid uuid; played integer:=0; duration integer:=0; threshold integer;
begin
 if new.event_type not in ('music_valid','watch_valid') then return new; end if;
 begin sid:=split_part(new.ref_key,':',2)::uuid; duration:=(new.metadata->>'duration')::integer;
 exception when others then raise exception 'PLAYBACK_NOT_VERIFIED'; end;
 if new.event_type='music_valid' then
  select credited into played from public.lx_listening_sessions where user_id=new.user_id and session_id=sid and track_key=new.metadata->>'content_id';
  threshold:=least(75,greatest(30,round(duration*.32)::int));
 else
  select credited into played from public.lx_viewing_sessions where user_id=new.user_id and session_id=sid and content_key=new.metadata->>'content_id';
  threshold:=least(180,greatest(45,round(duration*.20)::int));
 end if;
 if coalesce(played,0)<threshold then raise exception 'PLAYBACK_NOT_VERIFIED'; end if;
 return new;
end $$;
create trigger lx_confirm_playback before insert on public.lx_rank_events for each row execute function lx_private.verify_playback_award();
revoke all on function lx_private.verify_playback_award() from public,anon,authenticated;

create function lx_private.confirm_playback(p_session uuid,p_kind text,p_duration integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); played integer; content text; threshold integer;
begin
 if u is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 if p_kind not in ('music','watch') or p_duration not between 30 and 86400 then raise exception 'INVALID_PLAYBACK'; end if;
 if p_kind='music' then
  select credited,track_key into played,content from public.lx_listening_sessions where user_id=u and session_id=p_session;
  threshold:=least(75,greatest(30,round(p_duration*.32)::int));
 else
  if p_duration<60 then return jsonb_build_object('ready',false); end if;
  select credited,content_key into played,content from public.lx_viewing_sessions where user_id=u and session_id=p_session;
  threshold:=least(180,greatest(45,round(p_duration*.20)::int));
 end if;
 if coalesce(played,0)<threshold then return jsonb_build_object('ready',false); end if;
 return public.lx_rank_record_event(p_kind||'_valid',p_kind||':'||p_session::text,
  jsonb_build_object('duration',p_duration,'position',least(p_duration,played),'content_id',content))||jsonb_build_object('ready',true);
end $$;
create function public.lx_confirm_playback(p_session uuid,p_kind text,p_duration integer) returns jsonb language sql security invoker set search_path='' as $$select lx_private.confirm_playback(p_session,p_kind,p_duration)$$;
revoke all on function lx_private.confirm_playback(uuid,text,integer),public.lx_confirm_playback(uuid,text,integer) from public,anon;
grant execute on function lx_private.confirm_playback(uuid,text,integer),public.lx_confirm_playback(uuid,text,integer) to authenticated;

-- Recap can cover a whole year or one month; private profiles remain private.
create function lx_private.music_story(p_user uuid,p_month date,p_year integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare start_day date; end_day date; allowed boolean; result jsonb;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 if p_year is not null then
  if p_year<2026 or p_year>extract(year from now() at time zone 'America/Fortaleza') then raise exception 'INVALID_YEAR'; end if;
  start_day:=make_date(p_year,1,1);end_day:=make_date(p_year+1,1,1);
 else start_day:=date_trunc('month',coalesce(p_month,(now() at time zone 'America/Fortaleza')::date))::date;end_day:=(start_day+interval '1 month')::date; end if;
 select p.user_id=auth.uid() or (p.approved and p.activity_visible and (p.social_visible or exists(select 1 from public.lx_social_directory() d where d.user_id=p.user_id and d.relation='accepted'))) into allowed from public.lx_profiles p where p.user_id=p_user;
 if not coalesce(allowed,false) then return jsonb_build_object('private',true); end if;
 select jsonb_build_object('seconds',coalesce(sum(seconds),0),'tracks',count(distinct track_key),'artists',count(distinct artist),'days',count(distinct day)) into result from public.lx_listening_daily where user_id=p_user and day>=start_day and day<end_day;
 return result||jsonb_build_object('month',start_day,'year',p_year,'private',false,
 'top_tracks',coalesce((select jsonb_agg(to_jsonb(t)) from(select track_key,max(title) title,max(artist) artist,sum(seconds) seconds from public.lx_listening_daily where user_id=p_user and day>=start_day and day<end_day group by track_key order by sum(seconds) desc,track_key limit 10)t),'[]'::jsonb),
 'top_artists',coalesce((select jsonb_agg(to_jsonb(t)) from(select artist,sum(seconds) seconds from public.lx_listening_daily where user_id=p_user and day>=start_day and day<end_day group by artist order by sum(seconds) desc,artist limit 5)t),'[]'::jsonb),
 'months',coalesce((select jsonb_agg(to_jsonb(t) order by t.month) from(select date_trunc('month',day)::date "month",sum(seconds) seconds from public.lx_listening_daily where user_id=p_user and day>=case when p_year is null then (start_day-interval '11 months')::date else start_day end and day<end_day group by 1)t),'[]'::jsonb),
 'best_day',(select jsonb_build_object('day',day,'seconds',sum(seconds)) from public.lx_listening_daily where user_id=p_user and day>=start_day and day<end_day group by day order by sum(seconds) desc,day limit 1));
end $$;
create function public.lx_music_story(p_user uuid,p_month date default null,p_year integer default null) returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.music_story(p_user,p_month,p_year)$$;

create or replace function lx_private.ranking_insights(p_period text,p_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare since timestamptz; rows jsonb; me jsonb; total integer;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 if p_period not in ('Semanal','Mensal','Geral') or p_kind not in ('Geral','Assistiu','Ouviu','Leu') then raise exception 'INVALID_FILTER'; end if;
 since:=case p_period when 'Semanal' then date_trunc('week',now() at time zone 'America/Fortaleza') at time zone 'America/Fortaleza' when 'Mensal' then date_trunc('month',now() at time zone 'America/Fortaleza') at time zone 'America/Fortaleza' else '-infinity'::timestamptz end;
 with scores as (
  select row_number() over(order by sum(e.points) desc,p.name,p.user_id) position,p.user_id,p.name,p.username,p.avatar_url,p.verified,sum(e.points) score,lx_private.member_progress(p.user_id) progress
  from public.lx_rank_events e join public.lx_profiles p on p.user_id=e.user_id
  where e.created_at>=since and e.status='confirmed' and p.ranking_visible and p.approved and (p_kind='Geral' or e.event_type=case p_kind when 'Assistiu' then 'watch_valid' when 'Ouviu' then 'music_valid' else 'read_valid' end)
  group by p.user_id having sum(e.points)>0
 ) select coalesce(jsonb_agg(to_jsonb(s) order by position) filter(where position<=200),'[]'::jsonb),
  (jsonb_agg(to_jsonb(s)) filter(where user_id=auth.uid()))->0,count(*) into rows,me,total from scores s;
 return jsonb_build_object('rows',rows,'me',me,'participants',total,'progress',lx_private.member_progress(auth.uid()),'since',case when isfinite(since) then since else null end);
end $$;
revoke all on function public.lx_set_username(text),lx_private.community_identity(),public.lx_community_identity(),lx_private.member_profile(uuid),public.lx_member_profile(uuid),lx_private.record_viewing(uuid,text,integer),public.lx_record_viewing(uuid,text,integer),lx_private.music_story(uuid,date,integer),public.lx_music_story(uuid,date,integer) from public,anon;
grant execute on function public.lx_set_username(text),lx_private.community_identity(),public.lx_community_identity(),lx_private.member_profile(uuid),public.lx_member_profile(uuid),lx_private.record_viewing(uuid,text,integer),public.lx_record_viewing(uuid,text,integer),lx_private.music_story(uuid,date,integer),public.lx_music_story(uuid,date,integer) to authenticated;
