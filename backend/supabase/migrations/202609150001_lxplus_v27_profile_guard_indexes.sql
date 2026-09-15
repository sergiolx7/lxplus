-- LX Plus v27 — impede autogestão de privilégios por cargos limitados,
-- acelera leituras por participante e fecha RPCs de comunidade para anon.

create or replace function public.lx_guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'profile owner cannot be changed';
  end if;

  if auth.uid() is not null then
    if new.verified is distinct from old.verified
       and not public.lx_admin_can('users') then
      raise exception 'verified field is user-admin only';
    end if;

    if (new.approved is distinct from old.approved
        or new.approval_status is distinct from old.approval_status
        or new.approved_at is distinct from old.approved_at
        or new.approved_by is distinct from old.approved_by)
       and not public.lx_admin_can('approvals') then
      raise exception 'approval fields are approval-admin only';
    end if;

    if coalesce(current_setting('lx.server_metrics',true),'') <> '1'
       and not public.lx_admin_can('users')
       and (new.watched_hours is distinct from old.watched_hours
         or new.listened_hours is distinct from old.listened_hours
         or new.read_count is distinct from old.read_count
         or new.streak is distinct from old.streak) then
      raise exception 'usage metrics are server-managed';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create index if not exists lx_conversation_streaks_user_high_idx
  on public.lx_conversation_streaks(user_high);
create index if not exists lx_admins_updated_by_idx
  on public.lx_admins(updated_by) where updated_by is not null;

revoke execute on function public.lx_group_call_heartbeat(uuid) from public,anon;
revoke execute on function public.lx_group_create(text,uuid[]) from public,anon;
revoke execute on function public.lx_group_join_call(uuid) from public,anon;
revoke execute on function public.lx_group_leave_call(uuid) from public,anon;
revoke execute on function public.lx_group_list() from public,anon;
revoke execute on function public.lx_group_start_call(uuid,text) from public,anon;
revoke execute on function public.lx_is_group_member(uuid) from public,anon;
revoke execute on function public.lx_social_directory() from public,anon;
