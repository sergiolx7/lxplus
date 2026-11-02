-- Prevent legitimate rapid actions and daily quota limits from marking
-- an account suspicious. Bad claims are rejected without awarding points.
CREATE OR REPLACE FUNCTION public.lx_rank_record_event(p_event_type text, p_ref_key text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  u uuid := auth.uid();
  s text := to_char((now() at time zone 'America/Fortaleza')::date,'YYYY-MM');
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
  if p_event_type not in ('watch_valid','music_valid','read_valid','streak_daily') then
    raise exception 'INVALID_EVENT';
  end if;
  if p_ref_key is null
     or char_length(p_ref_key) not between 8 and 220
     or p_ref_key !~ '^(watch|music|read|streak):[A-Za-z0-9._:-]+$' then
    raise exception 'INVALID_REFERENCE';
  end if;
  if octet_length(coalesce(p_metadata,'{}'::jsonb)::text) > 4096 then
    raise exception 'INVALID_METADATA';
  end if;

  insert into public.lx_rank_seasons(season_key,starts_at,ends_at,status)
  values(s,date_trunc('month',now()),date_trunc('month',now())+interval '1 month','active')
  on conflict(season_key) do nothing;

  select case p_event_type
    when 'watch_valid' then 10
    when 'music_valid' then 5
    when 'read_valid' then 8
    when 'streak_daily' then 3
    else 0 end,
    case p_event_type
    when 'watch_valid' then 20
    when 'music_valid' then 50
    when 'read_valid' then 20
    when 'streak_daily' then 1
    else 0 end
  into points_i,daily_cap;

  select count(*) into today_count
  from public.lx_rank_events
  where season_key=s
    and user_id=u
    and event_type=p_event_type
    and created_at>=((now() at time zone 'America/Fortaleza')::date::timestamp at time zone 'America/Fortaleza')
    and status='confirmed';

  if today_count>=daily_cap then
    return jsonb_build_object('ok',true,'status','daily_limit','awarded',0);
  end if;

  duration_i := case
    when coalesce(p_metadata->>'duration','') ~ '^[0-9]+$'
      then (p_metadata->>'duration')::integer
    else 0
  end;
  position_i := case
    when coalesce(p_metadata->>'position','') ~ '^[0-9]+$'
      then (p_metadata->>'position')::integer
    else 0
  end;

  if p_event_type='watch_valid' and
     (duration_i < 60
      or position_i < least(180,greatest(45,round(duration_i*.20)::integer))
      or position_i > duration_i+5) then
    event_status:='review'; points_i:=0;
  elsif p_event_type='music_valid' and
     (duration_i < 30
      or position_i < least(75,greatest(30,round(duration_i*.32)::integer))
      or position_i > duration_i+5) then
    event_status:='review'; points_i:=0;
  elsif p_event_type='read_valid'
     and nullif(p_metadata->>'content_id','') is null then
    event_status:='review'; points_i:=0;
  elsif p_event_type='streak_daily'
     and p_metadata->>'day' <> to_char((now() at time zone 'America/Fortaleza')::date,'YYYY-MM-DD') then
    event_status:='review'; points_i:=0;
  end if;

  select count(*) into recent_events
  from public.lx_rank_events
  where season_key=s
    and user_id=u
    and created_at >= now()-interval '20 seconds';

  -- Valid actions close together are harmless; defer rather than mark the
  -- whole account suspicious or lock the user out of the leaderboard.
  if recent_events >= 2 then
    return jsonb_build_object('ok',true,'status','cooldown','awarded',0);
  end if;
  if points_i=0 then
    return jsonb_build_object('ok',true,'status','not_verified','awarded',0);
  end if;

  begin
    insert into public.lx_rank_events(
      season_key,user_id,event_type,points,ref_key,status,metadata
    )
    values(
      s,u,p_event_type,points_i,nullif(p_ref_key,''),event_status,
      coalesce(p_metadata,'{}'::jsonb)
    )
    returning id into inserted_id;
  exception when unique_violation then
    return jsonb_build_object('ok',true,'duplicate',true,'awarded',0);
  end;

  select coalesce(max(lifetime_score),0) into previous_life
  from public.lx_rank_scores
  where user_id=u and season_key<>s;

  insert into public.lx_rank_scores(
    season_key,user_id,monthly_score,lifetime_score,suspicious,updated_at
  )
  values(
    s,u,points_i,previous_life+points_i,event_status='review',now()
  )
  on conflict(season_key,user_id) do update
  set monthly_score=public.lx_rank_scores.monthly_score+excluded.monthly_score,
      lifetime_score=greatest(public.lx_rank_scores.lifetime_score,previous_life)
                     + excluded.monthly_score,
      suspicious=public.lx_rank_scores.suspicious or excluded.suspicious,
      updated_at=now()
  returning lifetime_score into life;

  return jsonb_build_object(
    'ok',true,
    'event_id',inserted_id,
    'status',event_status,
    'awarded',points_i,
    'lifetime_score',life
  );
end;
$function$

