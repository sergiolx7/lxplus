-- Manual runs are independent from the background schedule. Only service_role can
-- claim a job, and the Edge Function checks a real staff JWT before p_manual=true.
create or replace function public.lx_music_robot_claim(p_manual boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.lx_music_robot_config; rid uuid; today date=(now() at time zone 'America/Fortaleza')::date;
begin
 select * into cfg from public.lx_music_robot_config where id=true for update;
 if cfg is null or (not cfg.enabled and not p_manual) then return null; end if;
 if cfg.day<>today then
  update public.lx_music_robot_config set day=today,processed=0,lease_until=null where id=true returning * into cfg;
 end if;
 if cfg.lease_until>now() or cfg.processed>=cfg.daily_limit then return null; end if;
 update public.lx_music_robot_config set lease_until=now()+interval '110 seconds',last_run_at=now() where id=true;
 insert into public.lx_music_robot_runs(status) values('running') returning id into rid;
 return jsonb_build_object('run_id',rid,'limit',least(cfg.batch_size,cfg.daily_limit-cfg.processed),'queries',cfg.queries,'cursor',cfg.query_cursor);
end $$;
revoke all on function public.lx_music_robot_claim(boolean) from public,anon,authenticated;
grant execute on function public.lx_music_robot_claim(boolean) to service_role;
