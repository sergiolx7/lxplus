-- LX Plus v40 COMPLETE — additive, non-destructive migration
-- Apply only after backup/staging review. This file creates new v40 structures and does not delete existing data.

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- Helpers
-- -------------------------------------------------------------------
create or replace function public.lx_v40_is_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ok boolean := false;
begin
  if auth.uid() is null then return false; end if;
  if to_regprocedure('public.lx_am_i_admin()') is not null then
    execute 'select coalesce(public.lx_am_i_admin(), false)' into ok;
    return coalesce(ok,false);
  end if;
  if to_regclass('public.lx_admins') is not null then
    execute 'select exists(select 1 from public.lx_admins where user_id = $1)' into ok using auth.uid();
  end if;
  return coalesce(ok,false);
exception when others then
  return false;
end;
$$;

revoke all on function public.lx_v40_is_admin() from public;
grant execute on function public.lx_v40_is_admin() to authenticated;

-- Direct-message v40 thread keys are the two participant UUIDs, sorted and
-- separated by "__". Keep this validation in the database so pins and polls
-- cannot be read or written by unrelated authenticated users.
create or replace function public.lx_v40_thread_member(p_thread_key text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid() is not null
     and p_thread_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}__[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     and auth.uid()::text = any(string_to_array(lower(p_thread_key), '__'));
$$;

revoke all on function public.lx_v40_thread_member(text) from public;
grant execute on function public.lx_v40_thread_member(text) to authenticated;

-- -------------------------------------------------------------------
-- Presence / "Ouvindo agora"
-- -------------------------------------------------------------------
create table if not exists public.lx_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'offline' check (status in ('online','away','busy','offline')),
  activity_type text null check (activity_type is null or activity_type in ('music','movie','series')),
  activity_title text,
  activity_subtitle text,
  activity_cover text,
  privacy text not null default 'friends' check (privacy in ('everyone','friends','nobody')),
  updated_at timestamptz not null default now()
);
create index if not exists lx_presence_updated_idx on public.lx_presence(updated_at desc);
alter table public.lx_presence enable row level security;

drop policy if exists lx_presence_self_select on public.lx_presence;
create policy lx_presence_self_select on public.lx_presence for select to authenticated
using (user_id = auth.uid() or public.lx_v40_is_admin());
drop policy if exists lx_presence_self_insert on public.lx_presence;
create policy lx_presence_self_insert on public.lx_presence for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists lx_presence_self_update on public.lx_presence;
create policy lx_presence_self_update on public.lx_presence for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select,insert,update on public.lx_presence to authenticated;

create or replace function public.lx_presence_for_viewer()
returns table(
  user_id uuid,
  status text,
  activity_type text,
  activity_title text,
  activity_subtitle text,
  activity_cover text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select p.user_id,p.status,p.activity_type,p.activity_title,p.activity_subtitle,p.activity_cover,p.updated_at
  from public.lx_presence p
  where p.user_id = auth.uid()
     or p.privacy = 'everyone'
     or public.lx_v40_is_admin()
     or (
       p.privacy = 'friends'
       and to_regprocedure('public.lx_social_directory()') is not null
       and exists (
         select 1 from public.lx_social_directory() d
         where d.user_id = p.user_id and d.relation = 'accepted'
       )
     );
end;
$$;
grant execute on function public.lx_presence_for_viewer() to authenticated;

-- -------------------------------------------------------------------
-- Ranking monthly seasons + lifetime score + audit-safe events
-- -------------------------------------------------------------------
create table if not exists public.lx_rank_seasons (
  season_key text primary key check (season_key ~ '^[0-9]{4}-[0-9]{2}$'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  prize_cents integer not null default 10000 check (prize_cents >= 0),
  status text not null default 'active' check (status in ('draft','active','review','closed')),
  winner_user_id uuid references auth.users(id) on delete set null,
  winner_score bigint,
  winner_confirmed boolean not null default false,
  payment_status text not null default 'pending' check (payment_status in ('pending','approved','paid','cancelled')),
  paid_at timestamptz,
  rules jsonb not null default '{"watch_valid":10,"music_valid":5,"read_valid":8,"streak_daily":3}'::jsonb,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.lx_rank_scores (
  season_key text not null references public.lx_rank_seasons(season_key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_score bigint not null default 0 check (monthly_score >= 0),
  provisional_score bigint not null default 0 check (provisional_score >= 0),
  lifetime_score bigint not null default 0 check (lifetime_score >= 0),
  previous_position integer,
  suspicious boolean not null default false,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (season_key,user_id)
);
create index if not exists lx_rank_scores_order_idx on public.lx_rank_scores(season_key,monthly_score desc,updated_at asc);

create table if not exists public.lx_rank_events (
  id bigserial primary key,
  season_key text not null references public.lx_rank_seasons(season_key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  points integer not null default 0,
  ref_key text,
  status text not null default 'confirmed' check (status in ('confirmed','review','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists lx_rank_events_idempotency_idx
  on public.lx_rank_events(season_key,user_id,event_type,ref_key)
  where ref_key is not null;
create index if not exists lx_rank_events_audit_idx on public.lx_rank_events(season_key,user_id,created_at desc);

create table if not exists public.lx_rank_snapshots (
  season_key text not null references public.lx_rank_seasons(season_key) on delete cascade,
  position integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  verified boolean not null default false,
  final_score bigint not null default 0,
  lifetime_score bigint not null default 0,
  champion_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (season_key,position),
  unique (season_key,user_id)
);

create table if not exists public.lx_rank_admin_log (
  id bigserial primary key,
  season_key text,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.lx_rank_seasons enable row level security;
alter table public.lx_rank_scores enable row level security;
alter table public.lx_rank_events enable row level security;
alter table public.lx_rank_snapshots enable row level security;
alter table public.lx_rank_admin_log enable row level security;

drop policy if exists lx_rank_seasons_read on public.lx_rank_seasons;
create policy lx_rank_seasons_read on public.lx_rank_seasons for select to authenticated using (true);
drop policy if exists lx_rank_scores_read on public.lx_rank_scores;
create policy lx_rank_scores_read on public.lx_rank_scores for select to authenticated using (true);
drop policy if exists lx_rank_events_self_read on public.lx_rank_events;
create policy lx_rank_events_self_read on public.lx_rank_events for select to authenticated using (user_id=auth.uid() or public.lx_v40_is_admin());
drop policy if exists lx_rank_snapshots_read on public.lx_rank_snapshots;
create policy lx_rank_snapshots_read on public.lx_rank_snapshots for select to authenticated using (true);
drop policy if exists lx_rank_admin_read on public.lx_rank_admin_log;
create policy lx_rank_admin_read on public.lx_rank_admin_log for select to authenticated using (public.lx_v40_is_admin());

grant select on public.lx_rank_seasons,public.lx_rank_scores,public.lx_rank_snapshots to authenticated;
grant select on public.lx_rank_events,public.lx_rank_admin_log to authenticated;

-- Current season is inserted without touching existing user data.
insert into public.lx_rank_seasons(season_key,starts_at,ends_at,status)
values (
  to_char(current_date,'YYYY-MM'),
  date_trunc('month',now()),
  date_trunc('month',now()) + interval '1 month',
  'active'
)
on conflict (season_key) do nothing;


create or replace function public.lx_rank_rollover_if_needed()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  current_s text := to_char(current_date,'YYYY-MM');
  first_row record;
begin
  -- Close expired active seasons into REVIEW. Winner/payment still require admin confirmation.
  for s in select * from public.lx_rank_seasons where status='active' and ends_at<=now() order by ends_at loop
    if not exists(select 1 from public.lx_rank_snapshots x where x.season_key=s.season_key) then
      insert into public.lx_rank_snapshots(season_key,position,user_id,user_name,verified,final_score,lifetime_score,champion_count)
      with ranked as (
        select rs.user_id,rs.monthly_score,rs.lifetime_score,
          row_number() over(order by rs.monthly_score desc,rs.updated_at asc,rs.user_id)::integer as pos
        from public.lx_rank_scores rs where rs.season_key=s.season_key and rs.suspicious=false
      ), champs as (
        select winner_user_id,count(*)::integer n from public.lx_rank_seasons
        where status='closed' and winner_confirmed=true and winner_user_id is not null group by winner_user_id
      )
      select s.season_key,r.pos,r.user_id,coalesce(p.name,'Usuário'),coalesce(p.verified,false),r.monthly_score,r.lifetime_score,coalesce(c.n,0)
      from ranked r left join public.lx_profiles p on p.user_id=r.user_id left join champs c on c.winner_user_id=r.user_id
      where coalesce(p.ranking_visible,true)=true;
    end if;
    select * into first_row from public.lx_rank_snapshots where season_key=s.season_key order by position limit 1;
    update public.lx_rank_seasons
      set status='review',winner_user_id=first_row.user_id,winner_score=first_row.final_score,winner_confirmed=false
      where season_key=s.season_key;
  end loop;

  insert into public.lx_rank_seasons(season_key,starts_at,ends_at,status)
  values(current_s,date_trunc('month',now()),date_trunc('month',now())+interval '1 month','active')
  on conflict(season_key) do nothing;
  return jsonb_build_object('ok',true,'current_season',current_s);
end;
$$;
grant execute on function public.lx_rank_rollover_if_needed() to authenticated;

create or replace function public.lx_rank_get(p_season text default null)
returns table(
  position bigint,
  user_id uuid,
  name text,
  verified boolean,
  score bigint,
  lifetime_score bigint,
  move integer,
  champion_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s text := coalesce(nullif(p_season,''),to_char(current_date,'YYYY-MM'));
begin
  perform public.lx_rank_rollover_if_needed();
  if exists(select 1 from public.lx_rank_snapshots x where x.season_key=s) then
    return query
    select x.position::bigint,x.user_id,x.user_name,x.verified,x.final_score,x.lifetime_score,0::integer,x.champion_count::bigint
    from public.lx_rank_snapshots x
    order by x.position;
    return;
  end if;

  return query
  with ranked as (
    select rs.user_id,rs.monthly_score,rs.lifetime_score,rs.previous_position,
           row_number() over(order by rs.monthly_score desc,rs.updated_at asc,rs.user_id)::bigint as pos
    from public.lx_rank_scores rs
    where rs.season_key=s and rs.suspicious=false
  ), champs as (
    select winner_user_id,count(*)::bigint as n
    from public.lx_rank_seasons
    where status='closed' and winner_confirmed=true and winner_user_id is not null
    group by winner_user_id
  )
  select r.pos,r.user_id,coalesce(p.name,'Usuário')::text,coalesce(p.verified,false),r.monthly_score,r.lifetime_score,
         case when r.previous_position is null then 0 else (r.previous_position-r.pos)::integer end,
         coalesce(c.n,0)
  from ranked r
  left join public.lx_profiles p on p.user_id=r.user_id
  left join champs c on c.winner_user_id=r.user_id
  where coalesce(p.ranking_visible,true)=true
  order by r.pos;
end;
$$;
grant execute on function public.lx_rank_get(text) to authenticated;

-- Server-side points: browser never chooses how many points an event is worth.
create or replace function public.lx_rank_record_event(
  p_event_type text,
  p_ref_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  s text := to_char(current_date,'YYYY-MM');
  points_i integer := 0;
  daily_cap integer := 0;
  today_count integer := 0;
  event_status text := 'confirmed';
  inserted_id bigint;
  life bigint := 0;
  previous_life bigint := 0;
  recent_events integer := 0;
  duration_i integer := 0;
  position_i integer := 0;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_event_type not in ('watch_valid','music_valid','read_valid','streak_daily') then raise exception 'INVALID_EVENT'; end if;
  if p_ref_key is null or char_length(p_ref_key) not between 8 and 220
     or p_ref_key !~ '^(watch|music|read|streak):[A-Za-z0-9._:-]+$' then
    raise exception 'INVALID_REFERENCE';
  end if;
  if octet_length(coalesce(p_metadata,'{}'::jsonb)::text) > 4096 then raise exception 'INVALID_METADATA'; end if;

  insert into public.lx_rank_seasons(season_key,starts_at,ends_at,status)
  values(s,date_trunc('month',now()),date_trunc('month',now())+interval '1 month','active')
  on conflict(season_key) do nothing;

  select case p_event_type
    when 'watch_valid' then 10 when 'music_valid' then 5 when 'read_valid' then 8 when 'streak_daily' then 3 else 0 end,
    case p_event_type
    when 'watch_valid' then 20 when 'music_valid' then 50 when 'read_valid' then 20 when 'streak_daily' then 1 else 0 end
  into points_i,daily_cap;

  select count(*) into today_count from public.lx_rank_events
  where season_key=s and user_id=u and event_type=p_event_type and created_at>=date_trunc('day',now()) and status='confirmed';
  if today_count>=daily_cap then event_status:='review'; points_i:=0; end if;

  -- Client activity is never allowed to choose its own score. Impossible media
  -- progress and burst submissions are retained for audit but award no points.
  duration_i := coalesce((p_metadata->>'duration')::integer,0);
  position_i := coalesce((p_metadata->>'position')::integer,0);
  if p_event_type='watch_valid' and
     (duration_i < 60 or position_i < least(180,greatest(45,round(duration_i*.20)::integer)) or position_i > duration_i+5) then
    event_status:='review'; points_i:=0;
  elsif p_event_type='music_valid' and
     (duration_i < 30 or position_i < least(75,greatest(30,round(duration_i*.32)::integer)) or position_i > duration_i+5) then
    event_status:='review'; points_i:=0;
  elsif p_event_type='read_valid' and nullif(p_metadata->>'content_id','') is null then
    event_status:='review'; points_i:=0;
  elsif p_event_type='streak_daily' and p_metadata->>'day' <> to_char(current_date,'YYYY-MM-DD') then
    event_status:='review'; points_i:=0;
  end if;

  select count(*) into recent_events from public.lx_rank_events
  where season_key=s and user_id=u and created_at >= now()-interval '20 seconds';
  if recent_events >= 2 then event_status:='review'; points_i:=0; end if;

  begin
    insert into public.lx_rank_events(season_key,user_id,event_type,points,ref_key,status,metadata)
    values(s,u,p_event_type,points_i,nullif(p_ref_key,''),event_status,coalesce(p_metadata,'{}'::jsonb))
    returning id into inserted_id;
  exception when unique_violation then
    return jsonb_build_object('ok',true,'duplicate',true,'awarded',0);
  end;

  select coalesce(max(lifetime_score),0) into previous_life
  from public.lx_rank_scores where user_id=u and season_key<>s;

  insert into public.lx_rank_scores(season_key,user_id,monthly_score,lifetime_score,suspicious,updated_at)
  values(s,u,points_i,previous_life+points_i,event_status='review',now())
  on conflict(season_key,user_id) do update
  set monthly_score=public.lx_rank_scores.monthly_score+excluded.monthly_score,
      lifetime_score=public.lx_rank_scores.lifetime_score+excluded.lifetime_score,
      suspicious=public.lx_rank_scores.suspicious or excluded.suspicious,
      updated_at=now()
  returning lifetime_score into life;

  return jsonb_build_object('ok',true,'event_id',inserted_id,'status',event_status,'awarded',points_i,'lifetime_score',life);
end;
$$;
grant execute on function public.lx_rank_record_event(text,text,jsonb) to authenticated;

create or replace function public.lx_rank_close_current(p_confirm boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s text := to_char(current_date,'YYYY-MM');
  win record;
  next_s text := to_char(date_trunc('month',now())+interval '1 month','YYYY-MM');
begin
  if not public.lx_v40_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  -- freeze positions before closing
  delete from public.lx_rank_snapshots where season_key=s;
  insert into public.lx_rank_snapshots(season_key,position,user_id,user_name,verified,final_score,lifetime_score,champion_count)
  with ranked as (
    select rs.user_id,rs.monthly_score,rs.lifetime_score,
      row_number() over(order by rs.monthly_score desc,rs.updated_at asc,rs.user_id)::integer as pos
    from public.lx_rank_scores rs where rs.season_key=s and rs.suspicious=false
  ), champs as (
    select winner_user_id,count(*)::integer n from public.lx_rank_seasons
    where status='closed' and winner_confirmed=true and winner_user_id is not null group by winner_user_id
  )
  select s,r.pos,r.user_id,coalesce(p.name,'Usuário'),coalesce(p.verified,false),r.monthly_score,r.lifetime_score,coalesce(c.n,0)
  from ranked r left join public.lx_profiles p on p.user_id=r.user_id left join champs c on c.winner_user_id=r.user_id
  where coalesce(p.ranking_visible,true)=true;

  select * into win from public.lx_rank_snapshots where season_key=s order by position limit 1;
  update public.lx_rank_seasons
  set status=case when p_confirm then 'closed' else 'review' end,
      winner_user_id=win.user_id,
      winner_score=win.final_score,
      winner_confirmed=coalesce(p_confirm,false),
      closed_at=case when p_confirm then now() else null end
  where season_key=s;

  insert into public.lx_rank_admin_log(season_key,admin_user_id,action,target_user_id,data)
  values(s,auth.uid(),case when p_confirm then 'season_closed' else 'season_review' end,win.user_id,
         jsonb_build_object('score',win.final_score,'prize_cents',10000));

  insert into public.lx_rank_seasons(season_key,starts_at,ends_at,status)
  values(next_s,date_trunc('month',now())+interval '1 month',date_trunc('month',now())+interval '2 month','active')
  on conflict(season_key) do nothing;

  return jsonb_build_object('ok',true,'season',s,'winner_user_id',win.user_id,'winner_name',win.user_name,'winner_score',win.final_score,'next_season',next_s);
end;
$$;
grant execute on function public.lx_rank_close_current(boolean) to authenticated;


create or replace function public.lx_rank_confirm_season(p_season text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  win record;
begin
  if not public.lx_v40_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  perform public.lx_rank_rollover_if_needed();
  select * into win from public.lx_rank_snapshots where season_key=p_season order by position limit 1;
  if win.user_id is null then raise exception 'NO_ELIGIBLE_WINNER'; end if;
  update public.lx_rank_seasons set status='closed',winner_user_id=win.user_id,winner_score=win.final_score,winner_confirmed=true,closed_at=now() where season_key=p_season;
  insert into public.lx_rank_admin_log(season_key,admin_user_id,action,target_user_id,data)
  values(p_season,auth.uid(),'winner_confirmed',win.user_id,jsonb_build_object('score',win.final_score));
  return jsonb_build_object('ok',true,'season',p_season,'winner_user_id',win.user_id,'winner_name',win.user_name,'winner_score',win.final_score);
end;
$$;
grant execute on function public.lx_rank_confirm_season(text) to authenticated;

create or replace function public.lx_rank_set_payment(p_season text,p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.lx_v40_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('pending','approved','paid','cancelled') then raise exception 'INVALID_STATUS'; end if;
  update public.lx_rank_seasons set payment_status=p_status,paid_at=case when p_status='paid' then now() else null end where season_key=p_season;
  insert into public.lx_rank_admin_log(season_key,admin_user_id,action,data) values(p_season,auth.uid(),'payment_status',jsonb_build_object('status',p_status));
  return jsonb_build_object('ok',true,'season',p_season,'status',p_status);
end;
$$;
grant execute on function public.lx_rank_set_payment(text,text) to authenticated;

-- -------------------------------------------------------------------
-- Community v40: saved messages, pins, polls. Additive to existing chat.
-- -------------------------------------------------------------------
create table if not exists public.lx_saved_messages (
  user_id uuid not null references auth.users(id) on delete cascade,
  message_client_id text not null,
  thread_key text not null,
  created_at timestamptz not null default now(),
  primary key(user_id,message_client_id)
);
create table if not exists public.lx_message_pins (
  thread_key text not null,
  message_client_id text not null,
  pinned_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(thread_key,message_client_id)
);
create table if not exists public.lx_polls (
  id uuid primary key default gen_random_uuid(),
  thread_key text not null,
  creator_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  options jsonb not null,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.lx_poll_votes (
  poll_id uuid not null references public.lx_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check(option_index>=0),
  created_at timestamptz not null default now(),
  primary key(poll_id,user_id)
);

alter table public.lx_saved_messages enable row level security;
alter table public.lx_message_pins enable row level security;
alter table public.lx_polls enable row level security;
alter table public.lx_poll_votes enable row level security;

drop policy if exists lx_saved_self on public.lx_saved_messages;
create policy lx_saved_self on public.lx_saved_messages for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists lx_pins_auth_read on public.lx_message_pins;
create policy lx_pins_auth_read on public.lx_message_pins for select to authenticated
using(public.lx_v40_thread_member(thread_key) or public.lx_v40_is_admin());
drop policy if exists lx_pins_auth_write on public.lx_message_pins;
create policy lx_pins_auth_write on public.lx_message_pins for insert to authenticated
with check(pinned_by=auth.uid() and public.lx_v40_thread_member(thread_key));
drop policy if exists lx_pins_auth_delete on public.lx_message_pins;
create policy lx_pins_auth_delete on public.lx_message_pins for delete to authenticated
using((pinned_by=auth.uid() and public.lx_v40_thread_member(thread_key)) or public.lx_v40_is_admin());
drop policy if exists lx_polls_read on public.lx_polls;
create policy lx_polls_read on public.lx_polls for select to authenticated
using(public.lx_v40_thread_member(thread_key) or public.lx_v40_is_admin());
drop policy if exists lx_polls_create on public.lx_polls;
create policy lx_polls_create on public.lx_polls for insert to authenticated
with check(creator_id=auth.uid() and public.lx_v40_thread_member(thread_key) and jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 8);
drop policy if exists lx_polls_update on public.lx_polls;
create policy lx_polls_update on public.lx_polls for update to authenticated
using((creator_id=auth.uid() and public.lx_v40_thread_member(thread_key)) or public.lx_v40_is_admin())
with check((creator_id=auth.uid() and public.lx_v40_thread_member(thread_key) and jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 8) or public.lx_v40_is_admin());
drop policy if exists lx_poll_votes_read on public.lx_poll_votes;
create policy lx_poll_votes_read on public.lx_poll_votes for select to authenticated
using(exists(select 1 from public.lx_polls p where p.id=poll_id and (public.lx_v40_thread_member(p.thread_key) or public.lx_v40_is_admin())));
drop policy if exists lx_poll_votes_write on public.lx_poll_votes;
create policy lx_poll_votes_write on public.lx_poll_votes for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.lx_polls p where p.id=poll_id and not p.closed and public.lx_v40_thread_member(p.thread_key) and option_index<jsonb_array_length(p.options)));
drop policy if exists lx_poll_votes_update on public.lx_poll_votes;
create policy lx_poll_votes_update on public.lx_poll_votes for update to authenticated
using(user_id=auth.uid() and exists(select 1 from public.lx_polls p where p.id=poll_id and public.lx_v40_thread_member(p.thread_key)))
with check(user_id=auth.uid() and exists(select 1 from public.lx_polls p where p.id=poll_id and not p.closed and public.lx_v40_thread_member(p.thread_key) and option_index<jsonb_array_length(p.options)));

grant select,insert,delete on public.lx_saved_messages to authenticated;
grant select,insert,delete on public.lx_message_pins to authenticated;
grant select,insert,update on public.lx_polls to authenticated;
grant select,insert,update on public.lx_poll_votes to authenticated;

-- -------------------------------------------------------------------
-- Feature flag and operational configuration stored alongside existing settings.
-- Does nothing if lx_settings is not present; existing installs have it.
-- -------------------------------------------------------------------
do $$
begin
  if to_regclass('public.lx_settings') is not null then
    insert into public.lx_settings(key,value,updated_at)
    values('v40_features','{"musicV40":true,"smartImport":true,"liveV40":true,"top10V40":true,"presenceV40":true,"floatingPlayer":true,"rankingV40":true,"communityV40":true,"diagnosticsV40":true}'::jsonb,now())
    on conflict(key) do nothing;
  end if;
end $$;

comment on table public.lx_rank_seasons is 'LX Plus v40 monthly ranking seasons. New season rows reset monthly competition without deleting lifetime history.';
comment on table public.lx_presence is 'LX Plus v40 presence/activity. Privacy is user-controlled.';

-- -------------------------------------------------------------------
-- Client error observability for LX Admin. Insert is allowed only for own session;
-- reading all errors remains admin-only.
-- -------------------------------------------------------------------
create table if not exists public.lx_client_errors (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  page text,
  error_type text not null default 'error',
  message text not null,
  source text,
  line integer,
  device text,
  browser text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lx_client_errors_created_idx on public.lx_client_errors(created_at desc);
alter table public.lx_client_errors enable row level security;
drop policy if exists lx_client_errors_insert on public.lx_client_errors;
create policy lx_client_errors_insert on public.lx_client_errors for insert to authenticated with check(user_id=auth.uid());
drop policy if exists lx_client_errors_admin_read on public.lx_client_errors;
create policy lx_client_errors_admin_read on public.lx_client_errors for select to authenticated using(public.lx_v40_is_admin());
grant insert,select on public.lx_client_errors to authenticated;

-- -------------------------------------------------------------------
-- Viewer profiles foundation (prepared for future "Quem está assistindo?").
-- This does not alter the current lx_profiles/auth flow.
-- -------------------------------------------------------------------
create table if not exists public.lx_viewer_profiles (
  id uuid primary key default gen_random_uuid(),
  account_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 60),
  avatar_url text,
  is_kids boolean not null default false,
  pin_hash text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lx_viewer_profiles_account_idx on public.lx_viewer_profiles(account_user_id,created_at);
alter table public.lx_viewer_profiles enable row level security;
drop policy if exists lx_viewer_profiles_self on public.lx_viewer_profiles;
create policy lx_viewer_profiles_self on public.lx_viewer_profiles for all to authenticated using(account_user_id=auth.uid()) with check(account_user_id=auth.uid());
grant select,insert,update,delete on public.lx_viewer_profiles to authenticated;
comment on table public.lx_viewer_profiles is 'Foundation for multi-profile LX Plus accounts; current single-profile flow remains unchanged until the feature is enabled.';


-- -------------------------------------------------------------------
-- Function privilege hardening (Supabase/Postgres best practice).
-- SECURITY DEFINER RPCs are explicit authenticated APIs; PUBLIC/anon execution is revoked.
-- -------------------------------------------------------------------
revoke execute on function public.lx_v40_is_admin() from public, anon;
revoke execute on function public.lx_v40_thread_member(text) from public, anon;
revoke execute on function public.lx_presence_for_viewer() from public, anon;
revoke execute on function public.lx_rank_rollover_if_needed() from public, anon;
revoke execute on function public.lx_rank_get(text) from public, anon;
revoke execute on function public.lx_rank_record_event(text,text,jsonb) from public, anon;
revoke execute on function public.lx_rank_close_current(boolean) from public, anon;
revoke execute on function public.lx_rank_confirm_season(text) from public, anon;
revoke execute on function public.lx_rank_set_payment(text,text) from public, anon;

grant execute on function public.lx_v40_is_admin() to authenticated;
grant execute on function public.lx_v40_thread_member(text) to authenticated;
grant execute on function public.lx_presence_for_viewer() to authenticated;
grant execute on function public.lx_rank_rollover_if_needed() to authenticated;
grant execute on function public.lx_rank_get(text) to authenticated;
grant execute on function public.lx_rank_record_event(text,text,jsonb) to authenticated;
grant execute on function public.lx_rank_close_current(boolean) to authenticated;
grant execute on function public.lx_rank_confirm_season(text) to authenticated;
grant execute on function public.lx_rank_set_payment(text,text) to authenticated;
