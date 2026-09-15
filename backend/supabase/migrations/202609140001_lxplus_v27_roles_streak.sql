-- LX Plus v27 — cargos administrativos e fogo compartilhado por conversa.
-- Migração aditiva e compatível com a build v26.2.

alter table public.lx_admins
  add column if not exists role text not null default 'administrator',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.lx_admins
   set role = 'owner', updated_at = now()
 where user_id = (
   select user_id from public.lx_admins order by created_at asc nulls last, user_id limit 1
 )
   and not exists (select 1 from public.lx_admins where role = 'owner');

alter table public.lx_admins drop constraint if exists lx_admins_role_check;
alter table public.lx_admins
  add constraint lx_admins_role_check
  check (role in ('owner','administrator','editor','moderator'));

create or replace function public.lx_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.role from public.lx_admins a where a.user_id = auth.uid() limit 1;
$$;

create or replace function public.lx_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.lx_admins where user_id = auth.uid());
$$;

create or replace function public.lx_admin_can(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.lx_admin_role()
    when 'owner' then true
    when 'administrator' then lower(coalesce(p_capability,'')) = any(array[
      'admin_panel','catalog','uploads','users','approvals','community','requests',
      'premium','analytics','notifications','appearance','settings','operations'
    ])
    when 'editor' then lower(coalesce(p_capability,'')) = any(array[
      'admin_panel','catalog','uploads'
    ])
    when 'moderator' then lower(coalesce(p_capability,'')) = any(array[
      'admin_panel','approvals','community','requests','notifications'
    ])
    else false
  end;
$$;

create or replace function public.lx_admin_set_admin_role(
  p_user_id uuid,
  p_is_admin boolean,
  p_role text default 'administrator'
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text := lower(trim(coalesce(p_role,'administrator')));
  v_current_role text;
begin
  if public.lx_admin_role() <> 'owner' then
    raise exception 'owner required';
  end if;

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
  if not public.lx_admin_can('admin_panel') then raise exception 'admin required'; end if;
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

create or replace function public.lx_admin_approve_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_email text; v_name text;
begin
  if not public.lx_admin_can('approvals') then raise exception 'permission denied'; end if;
  select u.email,
         coalesce(nullif(u.raw_user_meta_data->>'name',''),split_part(coalesce(u.email,'usuario'),'@',1),'Usuário')
    into v_email,v_name from auth.users u
   where u.id=p_user_id and u.deleted_at is null;
  if v_email is null then raise exception 'user not found'; end if;
  update auth.users set email_confirmed_at=coalesce(email_confirmed_at,now()),updated_at=now()
   where id=p_user_id;
  insert into public.lx_profiles(user_id,name,ranking_visible,approved,approval_status,approved_at,approved_by,updated_at)
  values(p_user_id,v_name,true,true,'approved_admin',now(),auth.uid(),now())
  on conflict(user_id) do update set approved=true,approval_status='approved_admin',
    approved_at=now(),approved_by=auth.uid(),updated_at=now();
  return true;
end;
$$;

create or replace function public.lx_admin_reject_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lx_admin_can('approvals') then raise exception 'permission denied'; end if;
  if exists(select 1 from public.lx_admins where user_id=p_user_id) then raise exception 'cannot reject admin'; end if;
  update public.lx_profiles set approved=false,approval_status='rejected',approved_at=null,
    approved_by=auth.uid(),updated_at=now() where user_id=p_user_id;
  return true;
end;
$$;

create or replace function public.lx_admin_delete_pending_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_approved boolean;
begin
  if not public.lx_admin_can('users') then raise exception 'permission denied'; end if;
  if exists(select 1 from public.lx_admins where user_id=p_user_id) then raise exception 'cannot delete admin'; end if;
  select approved into v_approved from public.lx_profiles where user_id=p_user_id;
  if coalesce(v_approved,false) then raise exception 'cannot delete approved user'; end if;
  if not exists(select 1 from auth.users where id=p_user_id and deleted_at is null) then raise exception 'user not found'; end if;
  delete from auth.users where id=p_user_id;
  return true;
end;
$$;

create or replace function public.lx_admin_set_verified(p_user_id uuid,p_verified boolean)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.lx_admin_can('users') then raise exception 'permission denied'; end if;
  if not exists(select 1 from auth.users where id=p_user_id and deleted_at is null) then raise exception 'user not found'; end if;
  update public.lx_profiles set verified=coalesce(p_verified,false),updated_at=now() where user_id=p_user_id;
  if not found then raise exception 'profile not found'; end if;
  return true;
end;
$$;

create or replace function public.lx_admin_set_integration_secret(p_key text,p_value text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lx_admin_can('integrations') then raise exception 'owner required'; end if;
  if nullif(trim(coalesce(p_key,'')),'') is null then raise exception 'invalid key'; end if;
  if lower(trim(p_key)) not in ('spotify_client_id','spotify_client_secret') then
    raise exception 'integration key not allowed';
  end if;
  if nullif(trim(coalesce(p_value,'')),'') is null then
    delete from public.lx_integrations where key=lower(trim(p_key));
    return true;
  end if;
  insert into public.lx_integrations(key,secret,updated_at,updated_by)
  values(lower(trim(p_key)),trim(p_value),now(),auth.uid())
  on conflict(key) do update set secret=excluded.secret,updated_at=now(),updated_by=auth.uid();
  return true;
end;
$$;

-- Aplica as permissões dos cargos também a gravações diretas protegidas por RLS.
drop policy if exists "lx catalog admin insert compat" on public.lx_catalog;
drop policy if exists "lx catalog admin update compat" on public.lx_catalog;
create policy "lx catalog role insert v27" on public.lx_catalog for insert
  to authenticated with check ((select public.lx_admin_can('catalog')));
create policy "lx catalog role update v27" on public.lx_catalog for update
  to authenticated using ((select public.lx_admin_can('catalog')))
  with check ((select public.lx_admin_can('catalog')));
create policy "lx catalog role delete v27" on public.lx_catalog for delete
  to authenticated using ((select public.lx_admin_can('catalog')));

drop policy if exists "lx notifications admin write" on public.lx_notifications;
create policy "lx notifications role write v27" on public.lx_notifications for all
  to authenticated using ((select public.lx_admin_can('notifications')))
  with check ((select public.lx_admin_can('notifications')));

drop policy if exists "lx requests admin update" on public.lx_requests;
create policy "lx requests role update v27" on public.lx_requests for update
  to authenticated using ((select public.lx_admin_can('requests')))
  with check ((select public.lx_admin_can('requests')));

drop policy if exists "lx settings admin insert" on public.lx_settings;
drop policy if exists "lx settings admin update" on public.lx_settings;
create policy "lx settings role insert v27" on public.lx_settings for insert
  to authenticated with check ((select public.lx_admin_can('settings')));
create policy "lx settings role update v27" on public.lx_settings for update
  to authenticated using ((select public.lx_admin_can('settings')))
  with check ((select public.lx_admin_can('settings')));

drop policy if exists "lx sub admin insert" on public.lx_subscriptions;
drop policy if exists "lx sub admin update" on public.lx_subscriptions;
create policy "lx sub role insert v27" on public.lx_subscriptions for insert
  to authenticated with check ((select public.lx_admin_can('premium')));
create policy "lx sub role update v27" on public.lx_subscriptions for update
  to authenticated using ((select public.lx_admin_can('premium')))
  with check ((select public.lx_admin_can('premium')));

create table if not exists public.lx_conversation_streaks(
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  streak_count integer not null default 0 check(streak_count >= 0),
  longest_streak integer not null default 0 check(longest_streak >= 0),
  last_completed_date date,
  updated_at timestamptz not null default now(),
  primary key(user_low,user_high),
  constraint lx_conversation_streaks_pair_order check(user_low::text < user_high::text)
);

alter table public.lx_conversation_streaks enable row level security;
drop policy if exists "lx conversation streak participants read" on public.lx_conversation_streaks;
create policy "lx conversation streak participants read" on public.lx_conversation_streaks
  for select to authenticated
  using ((select auth.uid()) in (user_low,user_high));

create or replace function public.lx_recalculate_conversation_streak(p_a uuid,p_b uuid)
returns public.lx_conversation_streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_low uuid := least(p_a,p_b);
  v_high uuid := greatest(p_a,p_b);
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_start timestamptz := (v_today::timestamp at time zone 'America/Sao_Paulo');
  v_finish timestamptz := ((v_today+1)::timestamp at time zone 'America/Sao_Paulo');
  v_bilateral boolean := false;
  v_row public.lx_conversation_streaks;
begin
  if p_a is null or p_b is null or p_a=p_b then return null; end if;

  select
    exists(select 1 from public.lx_messages where sender_id=v_low and recipient_id=v_high and created_at>=v_start and created_at<v_finish)
    and
    exists(select 1 from public.lx_messages where sender_id=v_high and recipient_id=v_low and created_at>=v_start and created_at<v_finish)
  into v_bilateral;

  insert into public.lx_conversation_streaks(user_low,user_high,updated_at)
  values(v_low,v_high,now()) on conflict(user_low,user_high) do nothing;
  select * into v_row from public.lx_conversation_streaks
   where user_low=v_low and user_high=v_high for update;

  if v_bilateral and v_row.last_completed_date is distinct from v_today then
    v_row.streak_count := case when v_row.last_completed_date=v_today-1 then v_row.streak_count+1 else 1 end;
    v_row.longest_streak := greatest(v_row.longest_streak,v_row.streak_count);
    v_row.last_completed_date := v_today;
  elsif not v_bilateral and v_row.last_completed_date is not null and v_row.last_completed_date < v_today-1 then
    v_row.streak_count := 0;
  end if;

  update public.lx_conversation_streaks
     set streak_count=v_row.streak_count,longest_streak=v_row.longest_streak,
         last_completed_date=v_row.last_completed_date,updated_at=now()
   where user_low=v_low and user_high=v_high
   returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.lx_message_streak_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lx_recalculate_conversation_streak(new.sender_id,new.recipient_id);
  return new;
end;
$$;

drop trigger if exists lx_messages_streak_v27 on public.lx_messages;
create trigger lx_messages_streak_v27
after insert on public.lx_messages
for each row execute function public.lx_message_streak_after_insert();

create or replace function public.lx_get_conversation_streak(p_other uuid)
returns table(
  streak_count integer,
  longest_streak integer,
  last_completed_date date,
  today_complete boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_row public.lx_conversation_streaks;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if p_other is null or p_other=v_me then raise exception 'invalid conversation'; end if;
  if not public.lx_chat_is_friend(p_other) then raise exception 'friendship required'; end if;
  v_row := public.lx_recalculate_conversation_streak(v_me,p_other);
  return query select v_row.streak_count,v_row.longest_streak,v_row.last_completed_date,
                      v_row.last_completed_date=v_today;
end;
$$;

revoke all on function public.lx_admin_set_admin_role(uuid,boolean,text) from public,anon;
revoke all on function public.lx_admin_user_directory_v27() from public,anon;
revoke all on function public.lx_get_conversation_streak(uuid) from public,anon;
revoke all on function public.lx_recalculate_conversation_streak(uuid,uuid) from public,anon,authenticated;
revoke all on function public.lx_message_streak_after_insert() from public,anon,authenticated;
revoke all on function public.lx_admin_role() from public,anon;
revoke all on function public.lx_admin_can(text) from public,anon;
revoke all on function public.lx_admin_set_integration_secret(text,text) from public,anon;
grant execute on function public.lx_admin_set_admin_role(uuid,boolean,text) to authenticated;
grant execute on function public.lx_admin_user_directory_v27() to authenticated;
grant execute on function public.lx_get_conversation_streak(uuid) to authenticated;
grant execute on function public.lx_admin_role() to authenticated;
grant execute on function public.lx_admin_can(text) to authenticated;
grant execute on function public.lx_admin_set_integration_secret(text,text) to authenticated;

do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and
     not exists(
       select 1 from pg_publication_tables
        where pubname='supabase_realtime' and schemaname='public' and tablename='lx_conversation_streaks'
     ) then
    alter publication supabase_realtime add table public.lx_conversation_streaks;
  end if;
end $$;
