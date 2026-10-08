-- The annual release boundary is midnight on Christmas in Fortaleza.
create function lx_private.recap_available(p_year integer,p_at timestamptz) returns boolean language sql immutable security invoker set search_path='' as $$select (p_at at time zone 'America/Fortaleza')::date>=make_date(p_year,12,25)$$;
revoke all on function lx_private.recap_available(integer,timestamptz) from public,anon,authenticated;
create or replace function lx_private.music_story(p_user uuid,p_month date,p_year integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;today date:=(now() at time zone 'America/Fortaleza')::date;
begin
 if auth.uid() is null or not public.lx_is_approved() then raise exception 'AUTH_REQUIRED';end if;
 if p_year is not null then
  if p_year<2026 or p_year>extract(year from today) then raise exception 'INVALID_YEAR';end if;
  if not lx_private.recap_available(p_year,now()) then return jsonb_build_object('locked',true,'year',p_year,'release_date',make_date(p_year,12,25));end if;
 end if;
 result:=lx_private.music_story_before_automation(p_user,p_month,p_year);
 if p_user=auth.uid() and not coalesce((result->>'private')::boolean,false) then
  result:=result||jsonb_build_object('pioneers',coalesce((select jsonb_agg(to_jsonb(t)) from(select p.track_key,max(d.title) title,max(d.artist) artist,p.first_heard_at from lx_private.track_pioneers p join public.lx_listening_daily d on d.user_id=p.user_id and d.track_key=p.track_key where p.user_id=p_user and p.first_heard_at>=((result->>'month')::date::timestamp at time zone 'America/Fortaleza') and p.first_heard_at<((case when p_year is null then ((result->>'month')::date+interval '1 month')::date else make_date(p_year+1,1,1) end)::timestamp at time zone 'America/Fortaleza') group by p.track_key,p.first_heard_at order by p.first_heard_at desc limit 20)t),'[]'::jsonb));
 end if;
 return result;
end $$;
