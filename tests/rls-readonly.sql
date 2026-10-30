begin read only;
select set_config('qa.member',(select p.user_id::text from public.lx_profiles p where p.approved and not exists(select 1 from public.lx_admins a where a.user_id=p.user_id) order by p.user_id limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.member'),'role','authenticated')::text,true);
set local role authenticated;
do $checks$
begin
 if public.lx_is_approved() is not true then raise exception 'Member approval failed';end if;
 if public.lx_am_i_admin() is true then raise exception 'Member privilege escalation';end if;
 if public.lx_admin_can('catalog') is true then raise exception 'Member catalog privilege escalation';end if;
 perform public.lx_plus_directory();
 if exists(select 1 from public.lx_messages where sender_id<>auth.uid() and recipient_id<>auth.uid()) then raise exception 'Private conversation exposed';end if;
 if exists(select 1 from public.lx_playlists where owner_id<>auth.uid() and visibility='private') then raise exception 'Private playlist exposed';end if;
 if exists(select 1 from public.lx_catalog_versions) then raise exception 'Catalog audit exposed to member';end if;
 if has_schema_privilege('authenticated','lx_backup_20261030','usage') then raise exception 'Backup schema exposed';end if;
 if has_function_privilege('anon','public.lx_studio_archive(bigint[],boolean)','execute') then raise exception 'Anonymous admin RPC access';end if;
 if has_function_privilege('anon','public.lx_set_user_field(text,jsonb)','execute') then raise exception 'Anonymous state mutation access';end if;
end $checks$;
rollback;
select 'PASS: approved member directory, admin denial, private messages/playlists/audit isolation, backup isolation and anonymous RPC denial; read-only transaction.' as result;
