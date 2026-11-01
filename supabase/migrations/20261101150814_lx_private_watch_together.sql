-- Additive, review-only migration. No existing account, media or message is changed.
create schema if not exists lx_private;
create table if not exists public.lx_watch_sessions (
 id uuid primary key default gen_random_uuid(),host_id uuid not null references auth.users(id),guest_id uuid not null references auth.users(id),content_id bigint not null references public.lx_catalog(id),
 episode_index integer not null default 0 check(episode_index between 0 and 9999),status text not null default 'invited' check(status in ('invited','active','declined','ended')),
 position double precision not null default 0 check(position between 0 and 86400),paused boolean not null default true,rate double precision not null default 1 check(rate between .5 and 2),
 revision bigint not null default 1,anchor_at timestamptz not null default now(),host_ready boolean not null default false,guest_ready boolean not null default false,
 host_seen timestamptz not null default now(),guest_seen timestamptz not null default now(),created_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '2 hours'),check(host_id<>guest_id)
);
create index if not exists lx_watch_guest_inbox on public.lx_watch_sessions(guest_id,status,created_at desc);
create table if not exists public.lx_watch_signals (
 id bigint generated always as identity primary key,session_id uuid not null references public.lx_watch_sessions(id) on delete cascade,sender_id uuid not null references auth.users(id),kind text not null check(kind in ('offer','answer','ice')),payload jsonb not null check(octet_length(payload::text)<=64000),created_at timestamptz not null default now()
);
create index if not exists lx_watch_signals_room on public.lx_watch_signals(session_id,id);
alter table public.lx_watch_sessions enable row level security;
alter table public.lx_watch_signals enable row level security;
revoke all on public.lx_watch_sessions,public.lx_watch_signals from anon,authenticated;
grant select on public.lx_watch_sessions,public.lx_watch_signals to authenticated;
grant insert(session_id,sender_id,kind,payload) on public.lx_watch_signals to authenticated;
grant usage on sequence public.lx_watch_signals_id_seq to authenticated;
drop policy if exists watch_participants_read on public.lx_watch_sessions;
create policy watch_participants_read on public.lx_watch_sessions for select to authenticated using(auth.uid() in (host_id,guest_id) and public.lx_is_approved());
drop policy if exists watch_signal_read on public.lx_watch_signals;
create policy watch_signal_read on public.lx_watch_signals for select to authenticated using(exists(select 1 from public.lx_watch_sessions s where s.id=session_id and auth.uid() in(s.host_id,s.guest_id) and s.status='active' and s.expires_at>now()));
drop policy if exists watch_signal_send on public.lx_watch_signals;
create policy watch_signal_send on public.lx_watch_signals for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.lx_watch_sessions s where s.id=session_id and auth.uid() in(s.host_id,s.guest_id) and s.status='active' and s.expires_at>now()));

-- Privileged implementation lives outside the exposed API schema. Every entry validates auth and participants.
create or replace function lx_private.watch_create(p_other uuid,p_content bigint,p_episode integer,p_position double precision) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.lx_watch_sessions%rowtype; me uuid:=auth.uid();
begin
 if me is null or not public.lx_is_approved() or p_other=me then raise exception 'WATCH_ACCESS_DENIED';end if;
 if p_episode is null or p_episode not between 0 and 9999 or p_position is null or p_position not between 0 and 86400 then raise exception 'WATCH_INVALID_STATE';end if;
 if not exists(select 1 from public.lx_friendships where user_low=least(me,p_other) and user_high=greatest(me,p_other) and status='accepted') or not exists(select 1 from public.lx_profiles where user_id=p_other and approved) then raise exception 'WATCH_FRIEND_REQUIRED';end if;
 if not exists(select 1 from public.lx_catalog where id=p_content and published and payload->>'type' in ('Filme','Série','Dorama','Anime')) then raise exception 'WATCH_CONTENT_UNAVAILABLE';end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text,0));
 if (select count(*) from public.lx_watch_sessions where host_id=me and created_at>now()-interval '1 minute')>=6 then raise exception 'WATCH_INVITE_LIMIT';end if;
 insert into public.lx_watch_sessions(host_id,guest_id,content_id,episode_index,position) values(me,p_other,p_content,p_episode,p_position) returning * into c;
 return to_jsonb(c)||jsonb_build_object('server_now',clock_timestamp());
end;$$;
create or replace function lx_private.watch_action(p_id uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.lx_watch_sessions%rowtype; me uuid:=auth.uid(); stamp timestamptz:=clock_timestamp(); ready boolean; old_ready boolean; moving boolean; advanced double precision; anchor timestamptz;
begin
 if me is null or not public.lx_is_approved() then raise exception 'WATCH_ACCESS_DENIED';end if;
 select * into c from public.lx_watch_sessions where id=p_id and me in(host_id,guest_id) for update;
 if not found then raise exception 'WATCH_UNAVAILABLE';end if;
 if p_action is null or p_action not in ('snapshot','accept','decline','end','ready','control','episode') then raise exception 'WATCH_INVALID_ACTION';end if;
 if c.expires_at<=stamp or not exists(select 1 from public.lx_catalog where id=c.content_id and published) then c.status:='ended';end if;
 if c.status in ('ended','declined') then c.revision:=c.revision+1;update public.lx_watch_sessions set status=c.status,revision=c.revision where id=c.id;return to_jsonb(c)||jsonb_build_object('server_now',stamp);end if;
 if p_action<>'end' and not exists(select 1 from public.lx_friendships where user_low=least(c.host_id,c.guest_id) and user_high=greatest(c.host_id,c.guest_id) and status='accepted') then raise exception 'WATCH_FRIEND_REQUIRED';end if;
 old_ready:=c.host_ready and c.guest_ready;
 anchor:=least(stamp,c.host_seen+interval '10 seconds',c.guest_seen+interval '10 seconds');
 moving:=c.status='active' and not c.paused and old_ready;
 advanced:=case when moving then greatest(0,extract(epoch from(anchor-c.anchor_at)))*c.rate else 0 end;
 if c.host_seen<stamp-interval '10 seconds' then c.host_ready:=false;end if;
 if c.guest_seen<stamp-interval '10 seconds' then c.guest_ready:=false;end if;
 if old_ready<>(c.host_ready and c.guest_ready) then c.position:=least(86400,c.position+advanced);c.anchor_at:=stamp;advanced:=0;end if;
 if me=c.host_id then c.host_seen:=stamp;else c.guest_seen:=stamp;end if;
 if p_action='accept' then if me<>c.guest_id or c.status<>'invited' then raise exception 'WATCH_INVITE_UNAVAILABLE';end if;c.status:='active';
 elsif p_action='decline' then if me<>c.guest_id or c.status<>'invited' then raise exception 'WATCH_INVITE_UNAVAILABLE';end if;c.status:='declined';
 elsif p_action='end' then c.status:='ended';
 elsif p_action='ready' then
  ready:=coalesce((p_data->>'ready')::boolean,false);
  if (case when me=c.host_id then c.host_ready else c.guest_ready end)<>ready then
   c.position:=least(86400,c.position+advanced);c.anchor_at:=stamp;
   if me=c.host_id then c.host_ready:=ready;else c.guest_ready:=ready;end if;
   if c.host_ready and c.guest_ready and not c.paused then c.anchor_at:=stamp+interval '450 milliseconds';end if;
  end if;
 elsif p_action in ('control','episode') then
  if c.status<>'active' then raise exception 'WATCH_WAIT_FOR_FRIEND';end if;
  if p_action='episode' then
   if me<>c.host_id then raise exception 'WATCH_HOST_REQUIRED';end if;
   c.episode_index:=(p_data->>'episode')::integer;
   if c.episode_index is null or c.episode_index not between 0 and 9999 then raise exception 'WATCH_INVALID_STATE';end if;
   c.host_ready:=false;c.guest_ready:=false;c.position:=0;c.paused:=true;
  else
   if p_data->>'position' is null or p_data->>'paused' is null or p_data->>'rate' is null then raise exception 'WATCH_INVALID_STATE';end if;
   c.position:=(p_data->>'position')::double precision;c.paused:=(p_data->>'paused')::boolean;c.rate:=(p_data->>'rate')::double precision;
   if c.position not between 0 and 86400 or c.rate not between .5 and 2 then raise exception 'WATCH_INVALID_STATE';end if;
  end if;
  c.anchor_at:=stamp+case when c.paused then interval '0 seconds' else interval '450 milliseconds' end;
 end if;
 c.revision:=c.revision+1;
 update public.lx_watch_sessions set status=c.status,episode_index=c.episode_index,position=c.position,paused=c.paused,rate=c.rate,anchor_at=c.anchor_at,host_ready=c.host_ready,guest_ready=c.guest_ready,host_seen=c.host_seen,guest_seen=c.guest_seen,revision=c.revision where id=c.id;
 return to_jsonb(c)||jsonb_build_object('server_now',stamp);
end;$$;
create or replace function public.lx_watch_create(p_other uuid,p_content bigint,p_episode integer default 0,p_position double precision default 0) returns jsonb language sql security invoker set search_path='' as $$select lx_private.watch_create(p_other,p_content,p_episode,p_position)$$;
create or replace function public.lx_watch_action(p_id uuid,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select lx_private.watch_action(p_id,p_action,p_data)$$;
revoke all on function lx_private.watch_create(uuid,bigint,integer,double precision),lx_private.watch_action(uuid,text,jsonb),public.lx_watch_create(uuid,bigint,integer,double precision),public.lx_watch_action(uuid,text,jsonb) from public,anon;
grant usage on schema lx_private to authenticated;
grant execute on function lx_private.watch_create(uuid,bigint,integer,double precision),lx_private.watch_action(uuid,text,jsonb),public.lx_watch_create(uuid,bigint,integer,double precision),public.lx_watch_action(uuid,text,jsonb) to authenticated;

create table if not exists lx_private.rtc_credential_budget(user_id uuid primary key references auth.users(id),window_at timestamptz not null,requests integer not null);
alter table lx_private.rtc_credential_budget enable row level security;
revoke all on lx_private.rtc_credential_budget from public,anon,authenticated;
create or replace function lx_private.rtc_access(p_kind text,p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); allowed boolean:=false; granted boolean;
begin
 if me is null or not public.lx_is_approved() then return false;end if;
 if p_kind='call' then select exists(select 1 from public.lx_calls where id=p_id and me in(caller_id,callee_id) and status in('ringing','accepted') and created_at>now()-interval '4 hours') into allowed;
 elsif p_kind='watch' then select exists(select 1 from public.lx_watch_sessions where id=p_id and me in(host_id,guest_id) and status='active' and expires_at>now()) into allowed;end if;
 if not allowed then return false;end if;
 insert into lx_private.rtc_credential_budget values(me,now(),1) on conflict(user_id) do update set window_at=case when rtc_credential_budget.window_at<now()-interval '1 minute' then now() else rtc_credential_budget.window_at end,requests=case when rtc_credential_budget.window_at<now()-interval '1 minute' then 1 else rtc_credential_budget.requests+1 end where rtc_credential_budget.window_at<now()-interval '1 minute' or rtc_credential_budget.requests<8 returning true into granted;
 return coalesce(granted,false);
end;$$;
create or replace function public.lx_rtc_config_access(p_kind text,p_id uuid) returns boolean language sql security invoker set search_path='' as $$select lx_private.rtc_access(p_kind,p_id)$$;
revoke all on function lx_private.rtc_access(text,uuid),public.lx_rtc_config_access(text,uuid) from public,anon;
grant execute on function lx_private.rtc_access(text,uuid),public.lx_rtc_config_access(text,uuid) to authenticated;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lx_watch_sessions') then alter publication supabase_realtime add table public.lx_watch_sessions;end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lx_watch_signals') then alter publication supabase_realtime add table public.lx_watch_signals;end if;
 end if;
end;$$;
