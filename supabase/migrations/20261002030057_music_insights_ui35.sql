-- Additive listening history. Original counters and ranking awards are preserved.
create schema if not exists lx_private;
revoke all on schema lx_private from public,anon;
grant usage on schema lx_private to authenticated;
create table public.lx_listening_daily (
 user_id uuid not null references public.lx_profiles(user_id) on delete cascade,
 day date not null, track_key text not null, title text not null, artist text not null,
 seconds integer not null default 0 check(seconds>=0),
 primary key(user_id,day,track_key)
);
create index lx_listening_daily_day on public.lx_listening_daily(day,user_id);
create table public.lx_listening_sessions (
 user_id uuid not null references public.lx_profiles(user_id) on delete cascade,
 session_id uuid not null, track_key text not null, reported integer not null default 0,
 credited integer not null default 0, updated_at timestamptz not null default now(),
 primary key(user_id,session_id)
);
alter table public.lx_listening_daily enable row level security;
alter table public.lx_listening_sessions enable row level security;
revoke all on public.lx_listening_daily,public.lx_listening_sessions from anon,authenticated;
grant select on public.lx_listening_daily to authenticated;
create policy listening_self on public.lx_listening_daily for select to authenticated using(user_id=(select auth.uid()));
create or replace function lx_private.record_listening(p_session uuid,p_track text,p_title text,p_artist text,p_total integer) returns integer
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); old public.lx_listening_sessions; delta integer; latest timestamptz; d date:=(now() at time zone 'America/Fortaleza')::date;
begin
 if u is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 if p_session is null or length(p_track) not between 1 and 180 or p_total not between 0 and 86400 then raise exception 'INVALID_LISTEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,35));
 select * into old from public.lx_listening_sessions where user_id=u and session_id=p_session;
 if found and old.track_key<>p_track then raise exception 'TRACK_MISMATCH'; end if;
 select max(updated_at) into latest from public.lx_listening_sessions where user_id=u;
 delta:=least(90,greatest(0,p_total-coalesce(old.reported,0)),case when latest is null then 30 else greatest(0,floor(extract(epoch from now()-latest))::int) end);
 if p_total<=coalesce(old.reported,-1) then return 0; end if;
 insert into public.lx_listening_sessions(user_id,session_id,track_key,reported,credited) values(u,p_session,p_track,p_total,delta)
 on conflict(user_id,session_id) do update set reported=excluded.reported,credited=public.lx_listening_sessions.credited+delta,updated_at=now();
 if delta>0 then
 insert into public.lx_listening_daily(user_id,day,track_key,title,artist,seconds) values(u,d,p_track,left(coalesce(p_title,'Faixa'),200),left(coalesce(p_artist,'LX Music'),160),delta)
 on conflict(user_id,day,track_key) do update set seconds=public.lx_listening_daily.seconds+excluded.seconds,title=excluded.title,artist=excluded.artist;
 end if;
 return delta;
end $$;
create or replace function public.lx_record_listening(p_session uuid,p_track text,p_title text,p_artist text,p_total integer) returns integer
language sql security invoker set search_path='' as $$select lx_private.record_listening(p_session,p_track,p_title,p_artist,p_total)$$;
create or replace function lx_private.music_recap(p_user uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',coalesce(p_month,(now() at time zone 'America/Fortaleza')::date))::date; allowed boolean; result jsonb;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 select p.user_id=auth.uid() or (p.approved and p.activity_visible and (p.social_visible or exists(select 1 from public.lx_social_directory() d where d.user_id=p.user_id and d.relation='accepted'))) into allowed from public.lx_profiles p where p.user_id=p_user;
 if not coalesce(allowed,false) then return jsonb_build_object('private',true); end if;
 select jsonb_build_object('seconds',coalesce(sum(seconds),0),'tracks',count(distinct track_key),'artists',count(distinct artist),'days',count(distinct day)) into result from public.lx_listening_daily where user_id=p_user and day>=first_day and day<first_day+interval '1 month';
 return result || jsonb_build_object('month',first_day,'private',false,
 'top_tracks',coalesce((select jsonb_agg(to_jsonb(t)) from(select track_key,max(title) title,max(artist) artist,sum(seconds) seconds from public.lx_listening_daily where user_id=p_user and day>=first_day and day<first_day+interval '1 month' group by track_key order by sum(seconds) desc,track_key limit 10)t),'[]'::jsonb),
 'top_artists',coalesce((select jsonb_agg(to_jsonb(t)) from(select artist,sum(seconds) seconds from public.lx_listening_daily where user_id=p_user and day>=first_day and day<first_day+interval '1 month' group by artist order by sum(seconds) desc,artist limit 5)t),'[]'::jsonb),
 'months',coalesce((select jsonb_agg(to_jsonb(t) order by t.month) from(select date_trunc('month',day)::date as "month",sum(seconds) seconds from public.lx_listening_daily where user_id=p_user and day>=first_day-interval '11 months' and day<first_day+interval '1 month' group by 1)t),'[]'::jsonb));
end $$;
create or replace function public.lx_music_recap(p_user uuid,p_month date default null) returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.music_recap(p_user,p_month)$$;
create or replace function lx_private.ranking_insights(p_period text,p_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare since timestamptz; rows jsonb;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED'; end if;
 if p_period not in ('Semanal','Mensal','Geral') or p_kind not in ('Geral','Assistiu','Ouviu','Leu') then raise exception 'INVALID_FILTER'; end if;
 since:=case p_period when 'Semanal' then date_trunc('week',now() at time zone 'America/Fortaleza') at time zone 'America/Fortaleza' when 'Mensal' then date_trunc('month',now() at time zone 'America/Fortaleza') at time zone 'America/Fortaleza' else '-infinity'::timestamptz end;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.position),'[]'::jsonb) into rows from (
 select row_number() over(order by sum(e.points) desc,p.name,p.user_id) position,p.user_id,p.name,p.avatar_url,p.verified,p.streak,sum(e.points) score
 from public.lx_rank_events e join public.lx_profiles p on p.user_id=e.user_id
 where e.created_at>=since and e.status='confirmed' and p.ranking_visible and p.approved and (p_kind='Geral' or e.event_type=case p_kind when 'Assistiu' then 'watch_valid' when 'Ouviu' then 'music_valid' else 'read_valid' end)
 group by p.user_id,p.name,p.avatar_url,p.verified,p.streak having sum(e.points)>0 order by score desc,p.name,p.user_id limit 200)r;
 return jsonb_build_object('rows',rows,'since',case when isfinite(since) then since else null end);
end $$;
create or replace function public.lx_ranking_insights(p_period text default 'Mensal',p_kind text default 'Geral') returns jsonb language sql stable security invoker set search_path='' as $$select lx_private.ranking_insights(p_period,p_kind)$$;
revoke all on function lx_private.record_listening(uuid,text,text,text,integer),lx_private.music_recap(uuid,date),lx_private.ranking_insights(text,text),public.lx_record_listening(uuid,text,text,text,integer),public.lx_music_recap(uuid,date),public.lx_ranking_insights(text,text) from public,anon;
grant execute on function lx_private.record_listening(uuid,text,text,text,integer),lx_private.music_recap(uuid,date),lx_private.ranking_insights(text,text),public.lx_record_listening(uuid,text,text,text,integer),public.lx_music_recap(uuid,date),public.lx_ranking_insights(text,text) to authenticated;
