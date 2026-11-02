-- Active engagement time is measured by the database clock. A background tab,
-- replayed requests, multiple tabs or a stale page cannot accelerate credit.
-- 1 point per 300 verified seconds (5 min), up to 48 points/4h each local day.
create table if not exists public.lx_rank_active_sessions(
 user_id uuid primary key references auth.users(id) on delete cascade,
 activity_day date not null,
 last_ping timestamptz,
 active_seconds integer not null default 0 check(active_seconds between 0 and 86400),
 credited_intervals integer not null default 0 check(credited_intervals between 0 and 48),
 updated_at timestamptz not null default now()
);
alter table public.lx_rank_active_sessions enable row level security;
revoke all on public.lx_rank_active_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.lx_rank_active_sessions to service_role;

create or replace function public.lx_rank_active_heartbeat(p_route text default 'Início')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid();
 d date:=(now() at time zone 'America/Fortaleza')::date;
 s text:=to_char((now() at time zone 'America/Fortaleza')::date,'YYYY-MM');
 r public.lx_rank_active_sessions;
 elapsed numeric:=0; n integer:=0; next_seconds integer:=0; new_intervals integer:=0;
 awarded integer:=0; event_key text; prior_life bigint:=0;
begin
 if u is null or public.lx_is_approved() is not true then raise exception 'AUTH_REQUIRED';end if;
 if p_route is null or length(p_route)>80 then raise exception 'INVALID_ROUTE';end if;
 -- Serialize across devices for the same member and prevent overlapping accrual.
 perform pg_advisory_xact_lock(hashtextextended(u::text,331));
 select * into r from public.lx_rank_active_sessions where user_id=u for update;
 if r is null then
  insert into public.lx_rank_active_sessions(user_id,activity_day,last_ping,active_seconds,credited_intervals)
  values(u,d,now(),0,0);
  return jsonb_build_object('ok',true,'awarded',0,'today_seconds',0,'next_in_seconds',300,'daily_cap_points',48);
 end if;
 if r.activity_day<>d then
  update public.lx_rank_active_sessions set activity_day=d,last_ping=now(),active_seconds=0,
   credited_intervals=0,updated_at=now() where user_id=u;
  return jsonb_build_object('ok',true,'awarded',0,'today_seconds',0,'next_in_seconds',300,'daily_cap_points',48);
 end if;
 elapsed:=extract(epoch from now()-r.last_ping);
 -- Active browser heartbeats arrive about every 25s. A 15s floor rejects
 -- polling loops and a 70s ceiling rejects background/idle gaps.
 if elapsed>=15 and elapsed<=70 and r.credited_intervals<48 then n:=least(35,floor(elapsed)::integer);end if;
 if elapsed<15 then
  return jsonb_build_object('ok',true,'awarded',0,'today_seconds',r.active_seconds,
   'next_in_seconds',greatest(0,300-r.active_seconds%300),'daily_cap_points',48);
 end if;
 next_seconds:=least(86400,r.active_seconds+n);
 new_intervals:=least(48,floor(next_seconds/300)::integer);
 update public.lx_rank_active_sessions
 set last_ping=now(),active_seconds=next_seconds,credited_intervals=greatest(r.credited_intervals,new_intervals),updated_at=now()
 where user_id=u;
 if new_intervals>r.credited_intervals then
  perform public.lx_rank_rollover_if_needed();
  event_key:='active:'||to_char(d,'YYYY-MM-DD')||':'||new_intervals::text;
  begin
   insert into public.lx_rank_events(season_key,user_id,event_type,points,ref_key,status,metadata)
   values(s,u,'site_active',1,event_key,'confirmed',jsonb_build_object('source','lx-site-active','seconds',next_seconds,'route',p_route));
   select coalesce(max(lifetime_score),0) into prior_life from public.lx_rank_scores where user_id=u and season_key<>s;
   insert into public.lx_rank_scores(season_key,user_id,monthly_score,lifetime_score,suspicious,updated_at)
   values(s,u,1,prior_life+1,false,now())
   on conflict(season_key,user_id) do update
    set monthly_score=public.lx_rank_scores.monthly_score+1,
        lifetime_score=greatest(public.lx_rank_scores.lifetime_score,prior_life)+1,
        updated_at=now();
   awarded:=1;
  exception when unique_violation then awarded:=0;
  end;
 end if;
 return jsonb_build_object('ok',true,'awarded',awarded,'today_seconds',next_seconds,
  'next_in_seconds',case when new_intervals>=48 then 0 else greatest(0,300-next_seconds%300) end,
  'today_points',new_intervals,'daily_cap_points',48);
end $$;
revoke all on function public.lx_rank_active_heartbeat(text) from public,anon;
grant execute on function public.lx_rank_active_heartbeat(text) to authenticated;
