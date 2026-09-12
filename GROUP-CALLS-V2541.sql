-- LX Plus v25.41 — persistent groups + small-group WebRTC calls
create table if not exists public.lx_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 42),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lx_group_members (
  group_id uuid not null references public.lx_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id,user_id)
);

create table if not exists public.lx_group_calls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.lx_groups(id) on delete cascade,
  started_by uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'video' check (mode in ('audio','video')),
  status text not null default 'active' check (status in ('active','ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.lx_group_call_members (
  call_id uuid not null references public.lx_group_calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'joined' check (status in ('joined','left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  heartbeat_at timestamptz not null default now(),
  primary key (call_id,user_id)
);

create table if not exists public.lx_group_call_signals (
  id bigserial primary key,
  call_id uuid not null references public.lx_group_calls(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','ice','share','media','hangup','reaction')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists lx_group_members_user_idx on public.lx_group_members(user_id,group_id);
create index if not exists lx_group_calls_group_active_idx on public.lx_group_calls(group_id,status,created_at desc);
create index if not exists lx_group_call_members_call_idx on public.lx_group_call_members(call_id,status,heartbeat_at desc);
create index if not exists lx_group_call_signals_target_idx on public.lx_group_call_signals(call_id,recipient_id,id);

alter table public.lx_groups enable row level security;
alter table public.lx_group_members enable row level security;
alter table public.lx_group_calls enable row level security;
alter table public.lx_group_call_members enable row level security;
alter table public.lx_group_call_signals enable row level security;

drop policy if exists "lx groups members read" on public.lx_groups;
create policy "lx groups members read" on public.lx_groups for select to authenticated using (
  exists(select 1 from public.lx_group_members gm where gm.group_id=id and gm.user_id=auth.uid())
);

drop policy if exists "lx group members peer read" on public.lx_group_members;
create policy "lx group members peer read" on public.lx_group_members for select to authenticated using (
  exists(select 1 from public.lx_group_members me where me.group_id=lx_group_members.group_id and me.user_id=auth.uid())
);

drop policy if exists "lx group calls members read" on public.lx_group_calls;
create policy "lx group calls members read" on public.lx_group_calls for select to authenticated using (
  exists(select 1 from public.lx_group_members gm where gm.group_id=lx_group_calls.group_id and gm.user_id=auth.uid())
);

drop policy if exists "lx group call members peer read" on public.lx_group_call_members;
create policy "lx group call members peer read" on public.lx_group_call_members for select to authenticated using (
  exists(
    select 1 from public.lx_group_calls gc
    join public.lx_group_members gm on gm.group_id=gc.group_id
    where gc.id=lx_group_call_members.call_id and gm.user_id=auth.uid()
  )
);

drop policy if exists "lx group call signals participants read" on public.lx_group_call_signals;
create policy "lx group call signals participants read" on public.lx_group_call_signals for select to authenticated using (
  (sender_id=auth.uid() or recipient_id=auth.uid()) and exists(
    select 1 from public.lx_group_calls gc
    join public.lx_group_members gm on gm.group_id=gc.group_id
    where gc.id=lx_group_call_signals.call_id and gm.user_id=auth.uid()
  )
);

drop policy if exists "lx group call signals participant insert" on public.lx_group_call_signals;
create policy "lx group call signals participant insert" on public.lx_group_call_signals for insert to authenticated with check (
  sender_id=auth.uid() and recipient_id<>auth.uid() and exists(
    select 1 from public.lx_group_calls gc
    join public.lx_group_members sender_member on sender_member.group_id=gc.group_id and sender_member.user_id=auth.uid()
    join public.lx_group_members recipient_member on recipient_member.group_id=gc.group_id and recipient_member.user_id=recipient_id
    where gc.id=lx_group_call_signals.call_id and gc.status='active'
  )
);

create or replace function public.lx_group_create(p_name text,p_members uuid[] default '{}'::uuid[])
returns uuid
language plpgsql
security definer
set search_path to public,auth
as $$
declare
  me uuid:=auth.uid();
  gid uuid;
  member_id uuid;
  clean_members uuid[];
begin
  if me is null then raise exception 'auth required'; end if;
  p_name:=trim(coalesce(p_name,''));
  if p_name='' or char_length(p_name)>42 then raise exception 'invalid group name'; end if;
  select coalesce(array_agg(distinct x),'{}'::uuid[]) into clean_members
  from unnest(coalesce(p_members,'{}'::uuid[])) x where x is not null and x<>me;
  if cardinality(clean_members)<1 then raise exception 'at least one friend required'; end if;
  if cardinality(clean_members)>5 then raise exception 'group calls support up to 6 participants'; end if;
  foreach member_id in array clean_members loop
    if not exists(
      select 1 from public.lx_friendships f
      where f.status='accepted' and ((f.user_low=me and f.user_high=member_id) or (f.user_high=me and f.user_low=member_id))
    ) then raise exception 'all members must be accepted friends'; end if;
  end loop;
  insert into public.lx_groups(owner_id,name) values(me,p_name) returning id into gid;
  insert into public.lx_group_members(group_id,user_id,role) values(gid,me,'owner');
  foreach member_id in array clean_members loop
    insert into public.lx_group_members(group_id,user_id,role) values(gid,member_id,'member') on conflict do nothing;
  end loop;
  return gid;
end;
$$;

create or replace function public.lx_group_list()
returns table(
  group_id uuid,
  name text,
  owner_id uuid,
  created_at timestamptz,
  member_count integer,
  members jsonb,
  active_call_id uuid,
  active_call_mode text,
  active_call_created_at timestamptz
)
language sql
security definer
set search_path to public,auth
as $$
  select g.id,g.name,g.owner_id,g.created_at,
    (select count(*)::int from public.lx_group_members gm2 where gm2.group_id=g.id) as member_count,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',gm2.user_id,'role',gm2.role,'name',coalesce(p.name,'Usuário'),'avatar_url',p.avatar_url,'verified',coalesce(p.verified,false)
      ) order by case when gm2.role='owner' then 0 else 1 end,p.name)
      from public.lx_group_members gm2
      left join public.lx_profiles p on p.user_id=gm2.user_id
      where gm2.group_id=g.id
    ),'[]'::jsonb) as members,
    ac.id,ac.mode,ac.created_at
  from public.lx_groups g
  join public.lx_group_members mine on mine.group_id=g.id and mine.user_id=auth.uid()
  left join lateral (
    select c.id,c.mode,c.created_at from public.lx_group_calls c
    where c.group_id=g.id and c.status='active'
    order by c.created_at desc limit 1
  ) ac on true
  order by coalesce(ac.created_at,g.updated_at) desc;
$$;

create or replace function public.lx_group_start_call(p_group_id uuid,p_mode text default 'video')
returns uuid
language plpgsql
security definer
set search_path to public,auth
as $$
declare me uuid:=auth.uid(); cid uuid;
begin
  if me is null then raise exception 'auth required'; end if;
  if p_mode not in ('audio','video') then p_mode:='video'; end if;
  if not exists(select 1 from public.lx_group_members where group_id=p_group_id and user_id=me) then raise exception 'group membership required'; end if;
  update public.lx_group_calls c set status='ended',ended_at=now(),updated_at=now()
  where c.group_id=p_group_id and c.status='active' and c.created_at<now()-interval '12 hours';
  select c.id into cid from public.lx_group_calls c where c.group_id=p_group_id and c.status='active' order by c.created_at desc limit 1;
  if cid is null then
    insert into public.lx_group_calls(group_id,started_by,mode,status) values(p_group_id,me,p_mode,'active') returning id into cid;
  end if;
  insert into public.lx_group_call_members(call_id,user_id,status,joined_at,left_at,heartbeat_at)
  values(cid,me,'joined',now(),null,now())
  on conflict(call_id,user_id) do update set status='joined',left_at=null,heartbeat_at=now();
  return cid;
end;
$$;

create or replace function public.lx_group_join_call(p_call_id uuid)
returns boolean
language plpgsql
security definer
set search_path to public,auth
as $$
declare me uuid:=auth.uid(); gid uuid;
begin
  if me is null then raise exception 'auth required'; end if;
  select group_id into gid from public.lx_group_calls where id=p_call_id and status='active';
  if gid is null then raise exception 'call unavailable'; end if;
  if not exists(select 1 from public.lx_group_members where group_id=gid and user_id=me) then raise exception 'group membership required'; end if;
  insert into public.lx_group_call_members(call_id,user_id,status,joined_at,left_at,heartbeat_at)
  values(p_call_id,me,'joined',now(),null,now())
  on conflict(call_id,user_id) do update set status='joined',left_at=null,heartbeat_at=now();
  return true;
end;
$$;

create or replace function public.lx_group_call_heartbeat(p_call_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to public,auth
as $$
declare me uuid:=auth.uid(); gid uuid; cstatus text; ccreated timestamptz; result jsonb;
begin
  if me is null then raise exception 'auth required'; end if;
  select group_id,status,created_at into gid,cstatus,ccreated from public.lx_group_calls where id=p_call_id;
  if gid is null then return null; end if;
  if not exists(select 1 from public.lx_group_members where group_id=gid and user_id=me) then raise exception 'group membership required'; end if;
  if cstatus='active' then
    insert into public.lx_group_call_members(call_id,user_id,status,joined_at,left_at,heartbeat_at)
    values(p_call_id,me,'joined',now(),null,now())
    on conflict(call_id,user_id) do update set status='joined',left_at=null,heartbeat_at=now();
    update public.lx_group_call_members set status='left',left_at=coalesce(left_at,now())
    where call_id=p_call_id and status='joined' and heartbeat_at<now()-interval '70 seconds';
  end if;
  select jsonb_build_object(
    'status',cstatus,
    'created_at',ccreated,
    'participants',coalesce(jsonb_agg(jsonb_build_object(
      'user_id',m.user_id,'name',coalesce(p.name,'Usuário'),'avatar_url',p.avatar_url,'verified',coalesce(p.verified,false),'joined_at',m.joined_at
    ) order by m.joined_at) filter(where m.user_id is not null),'[]'::jsonb)
  ) into result
  from public.lx_group_call_members m
  left join public.lx_profiles p on p.user_id=m.user_id
  where m.call_id=p_call_id and m.status='joined' and m.heartbeat_at>=now()-interval '20 seconds';
  return result;
end;
$$;

create or replace function public.lx_group_leave_call(p_call_id uuid)
returns boolean
language plpgsql
security definer
set search_path to public,auth
as $$
declare me uuid:=auth.uid(); gid uuid;
begin
  if me is null then raise exception 'auth required'; end if;
  select group_id into gid from public.lx_group_calls where id=p_call_id;
  if gid is null then return false; end if;
  if not exists(select 1 from public.lx_group_members where group_id=gid and user_id=me) then raise exception 'group membership required'; end if;
  update public.lx_group_call_members set status='left',left_at=now(),heartbeat_at=now() where call_id=p_call_id and user_id=me;
  if not exists(select 1 from public.lx_group_call_members where call_id=p_call_id and status='joined' and heartbeat_at>=now()-interval '25 seconds') then
    update public.lx_group_calls set status='ended',ended_at=now(),updated_at=now() where id=p_call_id and status='active';
  end if;
  return true;
end;
$$;

grant execute on function public.lx_group_create(text,uuid[]) to authenticated;
grant execute on function public.lx_group_list() to authenticated;
grant execute on function public.lx_group_start_call(uuid,text) to authenticated;
grant execute on function public.lx_group_join_call(uuid) to authenticated;
grant execute on function public.lx_group_call_heartbeat(uuid) to authenticated;
grant execute on function public.lx_group_leave_call(uuid) to authenticated;

-- Realtime for group rooms/signaling. Ignore if table is already published.
do $$ begin alter publication supabase_realtime add table public.lx_group_calls; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.lx_group_call_members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.lx_group_call_signals; exception when duplicate_object then null; end $$;

-- v25.41 post-migration RLS hardening: avoid self-policy recursion
create or replace function public.lx_is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path to public,auth as $$
  select exists(select 1 from public.lx_group_members where group_id=p_group_id and user_id=auth.uid());
$$;
grant execute on function public.lx_is_group_member(uuid) to authenticated;
drop policy if exists "lx groups members read" on public.lx_groups;
create policy "lx groups members read" on public.lx_groups for select to authenticated using (public.lx_is_group_member(id));
drop policy if exists "lx group members peer read" on public.lx_group_members;
create policy "lx group members peer read" on public.lx_group_members for select to authenticated using (public.lx_is_group_member(group_id));
drop policy if exists "lx group calls members read" on public.lx_group_calls;
create policy "lx group calls members read" on public.lx_group_calls for select to authenticated using (public.lx_is_group_member(group_id));
drop policy if exists "lx group call members peer read" on public.lx_group_call_members;
create policy "lx group call members peer read" on public.lx_group_call_members for select to authenticated using (exists(select 1 from public.lx_group_calls gc where gc.id=lx_group_call_members.call_id and public.lx_is_group_member(gc.group_id)));
drop policy if exists "lx group call signals participants read" on public.lx_group_call_signals;
create policy "lx group call signals participants read" on public.lx_group_call_signals for select to authenticated using ((sender_id=auth.uid() or recipient_id=auth.uid()) and exists(select 1 from public.lx_group_calls gc where gc.id=lx_group_call_signals.call_id and public.lx_is_group_member(gc.group_id)));
drop policy if exists "lx group call signals participant insert" on public.lx_group_call_signals;
create policy "lx group call signals participant insert" on public.lx_group_call_signals for insert to authenticated with check (sender_id=auth.uid() and recipient_id<>auth.uid() and exists(select 1 from public.lx_group_calls gc where gc.id=lx_group_call_signals.call_id and gc.status='active' and public.lx_is_group_member(gc.group_id) and exists(select 1 from public.lx_group_members gm where gm.group_id=gc.group_id and gm.user_id=recipient_id)));

-- v25.41 stale-room cleanup: do not leave dead calls appearing active
create or replace function public.lx_group_start_call(p_group_id uuid,p_mode text default 'video')
returns uuid language plpgsql security definer set search_path to public,auth as $$
declare me uuid:=auth.uid(); cid uuid;
begin
  if me is null then raise exception 'auth required'; end if;
  if p_mode not in ('audio','video') then p_mode:='video'; end if;
  if not exists(select 1 from public.lx_group_members where group_id=p_group_id and user_id=me) then raise exception 'group membership required'; end if;
  update public.lx_group_calls c set status='ended',ended_at=now(),updated_at=now() where c.group_id=p_group_id and c.status='active' and (c.created_at<now()-interval '12 hours' or (c.created_at<now()-interval '90 seconds' and not exists(select 1 from public.lx_group_call_members m where m.call_id=c.id and m.status='joined' and m.heartbeat_at>=now()-interval '90 seconds')));
  select c.id into cid from public.lx_group_calls c where c.group_id=p_group_id and c.status='active' order by c.created_at desc limit 1;
  if cid is null then insert into public.lx_group_calls(group_id,started_by,mode,status) values(p_group_id,me,p_mode,'active') returning id into cid; end if;
  insert into public.lx_group_call_members(call_id,user_id,status,joined_at,left_at,heartbeat_at) values(cid,me,'joined',now(),null,now()) on conflict(call_id,user_id) do update set status='joined',left_at=null,heartbeat_at=now();
  return cid;
end;$$;
