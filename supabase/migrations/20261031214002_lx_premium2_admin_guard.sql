-- Candidate only. Validation must run in a transaction that is rolled back.
-- Fix NULL authorization bypass and protect the final owner from demotion.
CREATE OR REPLACE FUNCTION public.lx_admin_set_admin_role(p_user_id uuid, p_is_admin boolean, p_role text DEFAULT 'administrator'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text := lower(trim(coalesce(p_role,'administrator')));
  v_current_role text;
begin
  if auth.uid() is null or public.lx_admin_role() IS DISTINCT FROM 'owner' then
    raise exception 'owner required';
  end if;

  -- Serialize all role writes, including the owner-count invariant.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lxplus.admin_roles'));
  if public.lx_admin_role() IS DISTINCT FROM 'owner' then raise exception 'owner required'; end if;

  if v_role = 'admin' then v_role := 'administrator'; end if;
  if v_role not in ('owner','administrator','editor','moderator') then
    raise exception 'invalid admin role';
  end if;
  if not exists(
    select 1 from public.lx_profiles
     where user_id = p_user_id and approved = true
  ) then
    raise exception 'approved user required';
  end if;

  select role into v_current_role from public.lx_admins where user_id = p_user_id;

  if v_current_role = 'owner' and (not coalesce(p_is_admin,false) or v_role <> 'owner') and
     (select count(*) from public.lx_admins where role='owner') <= 1 then
    raise exception 'cannot remove the last owner';
  end if;

  if coalesce(p_is_admin,false) then
    insert into public.lx_admins(user_id,role,updated_at,updated_by)
    values(p_user_id,v_role,now(),auth.uid())
    on conflict(user_id) do update
      set role = excluded.role, updated_at = now(), updated_by = auth.uid();
  else
    if v_current_role = 'owner' and
       (select count(*) from public.lx_admins where role='owner') <= 1 then
      raise exception 'cannot remove the last owner';
    end if;
    delete from public.lx_admins where user_id = p_user_id;
  end if;
  return true;
end;
$function$;

revoke all on function public.lx_admin_set_admin_role(uuid,boolean,text) from public,anon;
grant execute on function public.lx_admin_set_admin_role(uuid,boolean,text) to authenticated;

