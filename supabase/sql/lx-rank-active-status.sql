-- Read-only personal time activity for a transparent LX League progress card.
create or replace function public.lx_rank_active_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); d date:=(now() at time zone 'America/Fortaleza')::date;
 secs integer:=0; credited integer:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 select coalesce(active_seconds,0),coalesce(credited_intervals,0)
 into secs,credited
 from public.lx_rank_active_sessions where user_id=u and activity_day=d;
 secs:=coalesce(secs,0);credited:=coalesce(credited,0);
 return jsonb_build_object('today_seconds',secs,'today_points',credited,
   'next_in_seconds',case when credited>=48 then 0 else greatest(0,300-(secs%300)) end,
   'daily_cap_points',48);
end $$;
revoke all on function public.lx_rank_active_status() from public,anon;
grant execute on function public.lx_rank_active_status() to authenticated;
