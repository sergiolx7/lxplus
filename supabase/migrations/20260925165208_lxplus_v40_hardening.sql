-- LX Plus v40 hardening
-- Mirrors production migration 20260925165208_lxplus_v40_hardening.
-- Non-destructive.

create index if not exists lx_client_errors_user_idx on public.lx_client_errors(user_id);
create index if not exists lx_message_pins_pinned_by_idx on public.lx_message_pins(pinned_by);
create index if not exists lx_poll_votes_user_idx on public.lx_poll_votes(user_id);
create index if not exists lx_polls_creator_idx on public.lx_polls(creator_id);
create index if not exists lx_rank_admin_log_admin_idx on public.lx_rank_admin_log(admin_user_id);
create index if not exists lx_rank_admin_log_target_idx on public.lx_rank_admin_log(target_user_id);
create index if not exists lx_rank_events_user_idx on public.lx_rank_events(user_id);
create index if not exists lx_rank_scores_user_idx on public.lx_rank_scores(user_id);
create index if not exists lx_rank_seasons_winner_idx on public.lx_rank_seasons(winner_user_id);
create index if not exists lx_rank_snapshots_user_idx on public.lx_rank_snapshots(user_id);

create or replace function public.lx_rank_record_event(
  p_event_type text,
  p_ref_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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

  select count(*) into today_count
  from public.lx_rank_events
  where season_key=s and user_id=u and event_type=p_event_type
    and created_at>=date_trunc('day',now()) and status='confirmed';
  if today_count>=daily_cap then event_status:='review'; points_i:=0; end if;

  duration_i := case
    when coalesce(p_metadata->>'duration','') ~ '^[0-9]+$' then (p_metadata->>'duration')::integer
    else 0 end;
  position_i := case
    when coalesce(p_metadata->>'position','') ~ '^[0-9]+$' then (p_metadata->>'position')::integer
    else 0 end;

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

  select count(*) into recent_events
  from public.lx_rank_events
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
      lifetime_score=greatest(public.lx_rank_scores.lifetime_score,previous_life)+excluded.monthly_score,
      suspicious=public.lx_rank_scores.suspicious or excluded.suspicious,
      updated_at=now()
  returning lifetime_score into life;

  return jsonb_build_object('ok',true,'event_id',inserted_id,'status',event_status,'awarded',points_i,'lifetime_score',life);
end;
$function$;

revoke execute on function public.lx_rank_record_event(text,text,jsonb) from public, anon;
grant execute on function public.lx_rank_record_event(text,text,jsonb) to authenticated;

drop policy if exists lx_presence_self_select on public.lx_presence;
create policy lx_presence_self_select on public.lx_presence for select to authenticated
using (user_id=(select auth.uid()) or (select public.lx_v40_is_admin()));

drop policy if exists lx_presence_self_insert on public.lx_presence;
create policy lx_presence_self_insert on public.lx_presence for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists lx_presence_self_update on public.lx_presence;
create policy lx_presence_self_update on public.lx_presence for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists lx_rank_events_self_read on public.lx_rank_events;
create policy lx_rank_events_self_read on public.lx_rank_events for select to authenticated
using (user_id=(select auth.uid()) or (select public.lx_v40_is_admin()));

drop policy if exists lx_saved_self on public.lx_saved_messages;
create policy lx_saved_self on public.lx_saved_messages for all to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists lx_pins_auth_write on public.lx_message_pins;
create policy lx_pins_auth_write on public.lx_message_pins for insert to authenticated
with check (pinned_by=(select auth.uid()) and public.lx_v40_thread_member(thread_key));

drop policy if exists lx_pins_auth_delete on public.lx_message_pins;
create policy lx_pins_auth_delete on public.lx_message_pins for delete to authenticated
using ((pinned_by=(select auth.uid()) and public.lx_v40_thread_member(thread_key)) or (select public.lx_v40_is_admin()));

drop policy if exists lx_polls_create on public.lx_polls;
create policy lx_polls_create on public.lx_polls for insert to authenticated
with check (
  creator_id=(select auth.uid())
  and public.lx_v40_thread_member(thread_key)
  and jsonb_typeof(options)='array'
  and jsonb_array_length(options) between 2 and 8
);

drop policy if exists lx_polls_update on public.lx_polls;
create policy lx_polls_update on public.lx_polls for update to authenticated
using ((creator_id=(select auth.uid()) and public.lx_v40_thread_member(thread_key)) or (select public.lx_v40_is_admin()))
with check (
  (
    creator_id=(select auth.uid())
    and public.lx_v40_thread_member(thread_key)
    and jsonb_typeof(options)='array'
    and jsonb_array_length(options) between 2 and 8
  )
  or (select public.lx_v40_is_admin())
);

drop policy if exists lx_poll_votes_write on public.lx_poll_votes;
create policy lx_poll_votes_write on public.lx_poll_votes for insert to authenticated
with check (
  user_id=(select auth.uid())
  and option_index>=0
  and exists(
    select 1 from public.lx_polls p
    where p.id=lx_poll_votes.poll_id
      and not p.closed
      and public.lx_v40_thread_member(p.thread_key)
      and lx_poll_votes.option_index<jsonb_array_length(p.options)
  )
);

drop policy if exists lx_poll_votes_update on public.lx_poll_votes;
create policy lx_poll_votes_update on public.lx_poll_votes for update to authenticated
using (
  user_id=(select auth.uid())
  and exists(
    select 1 from public.lx_polls p
    where p.id=lx_poll_votes.poll_id and public.lx_v40_thread_member(p.thread_key)
  )
)
with check (
  user_id=(select auth.uid())
  and option_index>=0
  and exists(
    select 1 from public.lx_polls p
    where p.id=lx_poll_votes.poll_id
      and not p.closed
      and public.lx_v40_thread_member(p.thread_key)
      and lx_poll_votes.option_index<jsonb_array_length(p.options)
  )
);

drop policy if exists lx_client_errors_insert on public.lx_client_errors;
create policy lx_client_errors_insert on public.lx_client_errors for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists lx_viewer_profiles_self on public.lx_viewer_profiles;
create policy lx_viewer_profiles_self on public.lx_viewer_profiles for all to authenticated
using (account_user_id=(select auth.uid())) with check (account_user_id=(select auth.uid()));
