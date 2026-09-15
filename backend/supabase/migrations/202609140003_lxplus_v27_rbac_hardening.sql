-- LX Plus v27 — reforço de RBAC em RPCs legadas e políticas de leitura.

create or replace function public.lx_catalog_upsert_item(
  p_id bigint,
  p_payload jsonb,
  p_published boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lx_admin_can('catalog') then raise exception 'permission denied'; end if;
  if exists(select 1 from public.lx_catalog_tombstones where id=p_id) then
    raise exception 'content deleted';
  end if;
  insert into public.lx_catalog(id,payload,published,updated_at)
  values(p_id,coalesce(p_payload,'{}'::jsonb),coalesce(p_published,true),now())
  on conflict(id) do update
    set payload=excluded.payload,published=excluded.published,updated_at=now();
end;
$$;

create or replace function public.lx_catalog_delete_item_checked(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existed boolean;
  v_deleted integer := 0;
begin
  if not public.lx_admin_can('catalog') then raise exception 'permission denied'; end if;
  select exists(select 1 from public.lx_catalog where id=p_id) into v_existed;
  insert into public.lx_catalog_tombstones(id,deleted_at,deleted_by)
  values(p_id,now(),auth.uid())
  on conflict(id) do update set deleted_at=now(),deleted_by=auth.uid();
  delete from public.lx_catalog where id=p_id;
  get diagnostics v_deleted = row_count;
  return jsonb_build_object(
    'id',p_id,'existed',v_existed,'deleted',v_deleted>0,'tombstoned',true
  );
end;
$$;

create or replace function public.lx_admin_user_directory_v27()
returns table(
  user_id uuid,
  name text,
  email text,
  verified boolean,
  ranking_visible boolean,
  watched_hours numeric,
  listened_hours numeric,
  read_count integer,
  streak integer,
  admin boolean,
  admin_role text,
  approved boolean,
  approval_status text,
  email_confirmed boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not (
    public.lx_admin_can('users') or
    public.lx_admin_can('approvals') or
    public.lx_admin_can('premium')
  ) then raise exception 'permission denied'; end if;
  return query
  select p.user_id,p.name,u.email::text,p.verified,p.ranking_visible,p.watched_hours,
         p.listened_hours,p.read_count,p.streak,(a.user_id is not null),a.role,
         p.approved,p.approval_status,(u.email_confirmed_at is not null),p.created_at
    from public.lx_profiles p
    join auth.users u on u.id=p.user_id
    left join public.lx_admins a on a.user_id=p.user_id
   where u.deleted_at is null
   order by p.created_at desc;
end;
$$;

create or replace function public.lx_admin_user_directory()
returns table(
  user_id uuid,
  name text,
  email text,
  verified boolean,
  ranking_visible boolean,
  watched_hours numeric,
  listened_hours numeric,
  read_count integer,
  streak integer,
  admin boolean,
  approved boolean,
  approval_status text,
  email_confirmed boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not (
    public.lx_admin_can('users') or
    public.lx_admin_can('approvals') or
    public.lx_admin_can('premium')
  ) then raise exception 'permission denied'; end if;
  return query
  select p.user_id,p.name,u.email::text,p.verified,p.ranking_visible,p.watched_hours,
         p.listened_hours,p.read_count,p.streak,(a.user_id is not null),p.approved,
         p.approval_status,(u.email_confirmed_at is not null),p.created_at
    from public.lx_profiles p
    join auth.users u on u.id=p.user_id
    left join public.lx_admins a on a.user_id=p.user_id
   where u.deleted_at is null
   order by p.created_at desc;
end;
$$;

drop policy if exists "lx catalog approved read" on public.lx_catalog;
create policy "lx catalog approved read" on public.lx_catalog for select
  to authenticated
  using ((published and public.lx_is_approved()) or (select public.lx_admin_can('catalog')));

drop policy if exists "lx notifications approved read" on public.lx_notifications;
create policy "lx notifications approved read" on public.lx_notifications for select
  to authenticated
  using ((published and public.lx_is_approved()) or (select public.lx_admin_can('notifications')));

drop policy if exists "lx profiles approved visible read" on public.lx_profiles;
create policy "lx profiles approved visible read" on public.lx_profiles for select
  to authenticated
  using (
    user_id=(select auth.uid()) or
    (select public.lx_admin_can('users')) or
    (select public.lx_admin_can('approvals')) or
    (public.lx_is_approved() and ranking_visible)
  );

drop policy if exists "lx profiles self or admin update" on public.lx_profiles;
create policy "lx profiles self or admin update" on public.lx_profiles for update
  to authenticated
  using (user_id=(select auth.uid()) or (select public.lx_admin_can('users')))
  with check (user_id=(select auth.uid()) or (select public.lx_admin_can('users')));

drop policy if exists "lx requests own voter admin read" on public.lx_requests;
create policy "lx requests own voter admin read" on public.lx_requests for select
  to authenticated
  using (
    owner_user_id=(select auth.uid()) or
    (select public.lx_admin_can('requests')) or
    exists(
      select 1 from public.lx_request_voters v
       where v.request_id=lx_requests.id and v.user_id=(select auth.uid())
    )
  );

drop policy if exists "lx sub own or admin read" on public.lx_subscriptions;
create policy "lx sub own or admin read" on public.lx_subscriptions for select
  to authenticated
  using (user_id=(select auth.uid()) or (select public.lx_admin_can('premium')));

revoke all on function public.lx_catalog_upsert_item(bigint,jsonb,boolean) from public,anon;
revoke all on function public.lx_catalog_delete_item_checked(bigint) from public,anon;
revoke all on function public.lx_admin_user_directory_v27() from public,anon;
revoke all on function public.lx_admin_user_directory() from public,anon;
grant execute on function public.lx_catalog_upsert_item(bigint,jsonb,boolean) to authenticated;
grant execute on function public.lx_catalog_delete_item_checked(bigint) to authenticated;
grant execute on function public.lx_admin_user_directory_v27() to authenticated;
grant execute on function public.lx_admin_user_directory() to authenticated;
