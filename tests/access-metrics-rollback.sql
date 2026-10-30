begin;
do $actors$
declare a uuid;b uuid;c uuid;
begin
 select p.user_id into a from public.lx_profiles p where p.approved and not exists(select 1 from public.lx_admins x where x.user_id=p.user_id) order by p.user_id limit 1;
 select p.user_id into b from public.lx_profiles p where p.approved and p.user_id<>a and not exists(select 1 from public.lx_admins x where x.user_id=p.user_id) order by p.user_id limit 1;
 select user_id into c from public.lx_admins where role='owner' limit 1;
 if a is null or b is null or c is null then raise exception 'TEST_ACTOR_MISSING';end if;
 perform set_config('qa.member',a::text,true);perform set_config('qa.other',b::text,true);perform set_config('qa.admin',c::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
end $actors$;
set local role authenticated;
do $access$
declare denied boolean;
begin
 insert into public.lx_active_sessions(user_id,last_seen,updated_at,route,device) values(auth.uid(),now(),now(),'__QA_ACCESS__','QA') on conflict(user_id) do update set last_seen=excluded.last_seen,updated_at=excluded.updated_at,route=excluded.route,device=excluded.device;
 if not exists(select 1 from public.lx_active_sessions where user_id=auth.uid() and route='__QA_ACCESS__') then raise exception 'OWN_HEARTBEAT_FAILED';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.other'),'role','authenticated')::text,true);
 if exists(select 1 from public.lx_active_sessions where user_id=current_setting('qa.member')::uuid) then raise exception 'OTHER_MEMBER_ACCESS_LEAK';end if;
 denied:=false;begin insert into public.lx_active_sessions(user_id,last_seen) values(current_setting('qa.member')::uuid,now()) on conflict(user_id) do update set last_seen=excluded.last_seen;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'OTHER_MEMBER_HEARTBEAT_ALLOWED';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.admin'),'role','authenticated')::text,true);
 if not exists(select 1 from public.lx_active_sessions where user_id=current_setting('qa.member')::uuid) then raise exception 'ADMIN_METRICS_UNAVAILABLE';end if;
 if (select count(*) from public.lx_profiles)<3 then raise exception 'ADMIN_PROFILE_COUNT_RESTRICTED';end if;
end $access$;
rollback;
select 'PASS: own heartbeat, private access rows, forged heartbeat denied, administrator metrics and profile counts. All writes rolled back.' as result;
