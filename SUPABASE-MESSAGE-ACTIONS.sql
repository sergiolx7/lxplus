-- LX Plus v25.37 — Message Actions backend
-- Additive migration: persistent chat history, replies, reactions, edit/delete and receipts.

create table if not exists public.lx_messages (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text','image','file','audio','sticker')),
  body text not null default '',
  media_key text,
  reply_to_client_id text,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  deleted_at timestamptz,
  hidden_for uuid[] not null default '{}'::uuid[],
  constraint lx_messages_distinct_users check (sender_id <> recipient_id),
  constraint lx_messages_reactions_object check (jsonb_typeof(reactions)='object')
);

create index if not exists lx_messages_sender_created_idx on public.lx_messages(sender_id, created_at desc);
create index if not exists lx_messages_recipient_created_idx on public.lx_messages(recipient_id, created_at desc);
create index if not exists lx_messages_pair_created_idx on public.lx_messages(least(sender_id,recipient_id), greatest(sender_id,recipient_id), created_at desc);

alter table public.lx_messages enable row level security;
alter table public.lx_messages replica identity full;

drop policy if exists lx_messages_participants_select on public.lx_messages;
create policy lx_messages_participants_select on public.lx_messages
for select to authenticated
using (
  auth.uid() in (sender_id, recipient_id)
  and not (auth.uid() = any(hidden_for))
);

revoke insert, update, delete on public.lx_messages from anon, authenticated;
grant select on public.lx_messages to authenticated;

create or replace function public.lx_chat_is_friend(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public','auth'
as $$
  select auth.uid() is not null
    and p_other is not null
    and p_other <> auth.uid()
    and exists (
      select 1
      from public.lx_friendships f
      where f.user_low = least(auth.uid(), p_other)
        and f.user_high = greatest(auth.uid(), p_other)
        and f.status = 'accepted'
    );
$$;

create or replace function public.lx_send_message(
  p_other uuid,
  p_kind text,
  p_body text default '',
  p_media_key text default null,
  p_client_id text default null,
  p_reply_to_client_id text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare
  v_id uuid;
  v_client text := coalesce(nullif(trim(p_client_id),''), gen_random_uuid()::text);
  v_kind text := lower(coalesce(p_kind,'text'));
begin
  if not public.lx_chat_is_friend(p_other) then raise exception 'friendship required'; end if;
  if v_kind not in ('text','image','file','audio','sticker') then raise exception 'invalid message kind'; end if;
  if v_kind='text' and length(coalesce(p_body,'')) > 4000 then raise exception 'message too long'; end if;
  if p_reply_to_client_id is not null and not exists(
    select 1 from public.lx_messages m
    where m.client_id=p_reply_to_client_id
      and auth.uid() in (m.sender_id,m.recipient_id)
      and p_other in (m.sender_id,m.recipient_id)
  ) then
    raise exception 'reply target not found';
  end if;

  insert into public.lx_messages(client_id,sender_id,recipient_id,kind,body,media_key,reply_to_client_id)
  values(v_client,auth.uid(),p_other,v_kind,coalesce(p_body,''),p_media_key,p_reply_to_client_id)
  on conflict(client_id) do nothing
  returning id into v_id;

  if v_id is null then
    select m.id into v_id from public.lx_messages m where m.client_id=v_client and m.sender_id=auth.uid();
    if v_id is null then raise exception 'client id conflict'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.lx_message_history(p_other uuid)
returns table(
  id uuid,
  client_id text,
  sender_id uuid,
  recipient_id uuid,
  kind text,
  body text,
  media_key text,
  reply_to_client_id text,
  reactions jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  edited_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  deleted_at timestamptz
)
language sql
stable
security definer
set search_path to 'public','auth'
as $$
  select m.id,m.client_id,m.sender_id,m.recipient_id,m.kind,
         case when m.deleted_at is null then m.body else '' end,
         case when m.deleted_at is null then m.media_key else null end,
         m.reply_to_client_id,m.reactions,m.created_at,m.updated_at,m.edited_at,
         m.delivered_at,m.read_at,m.deleted_at
  from public.lx_messages m
  where ((m.sender_id=auth.uid() and m.recipient_id=p_other)
      or (m.sender_id=p_other and m.recipient_id=auth.uid()))
    and not (auth.uid() = any(m.hidden_for))
  order by m.created_at asc
  limit 500;
$$;

create or replace function public.lx_mark_messages_delivered(p_other uuid)
returns bigint
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare v_count bigint;
begin
  update public.lx_messages
     set delivered_at=coalesce(delivered_at,now()), updated_at=now()
   where sender_id=p_other and recipient_id=auth.uid() and delivered_at is null and deleted_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.lx_mark_messages_read(p_other uuid)
returns bigint
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare v_count bigint;
begin
  update public.lx_messages
     set delivered_at=coalesce(delivered_at,now()), read_at=coalesce(read_at,now()), updated_at=now()
   where sender_id=p_other and recipient_id=auth.uid() and read_at is null and deleted_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.lx_edit_message(p_client_id text, p_body text)
returns boolean
language plpgsql
security definer
set search_path to 'public','auth'
as $$
begin
  if nullif(trim(coalesce(p_body,'')),'') is null then raise exception 'message cannot be empty'; end if;
  if length(p_body)>4000 then raise exception 'message too long'; end if;
  update public.lx_messages
     set body=p_body, edited_at=now(), updated_at=now()
   where client_id=p_client_id and sender_id=auth.uid() and kind='text' and deleted_at is null;
  return found;
end;
$$;

create or replace function public.lx_delete_message_for_all(p_client_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare v_media text; v_ok boolean := false;
begin
  select media_key into v_media from public.lx_messages
   where client_id=p_client_id and sender_id=auth.uid() and deleted_at is null
   for update;
  if found then
    update public.lx_messages
       set body='', media_key=null, reactions='{}'::jsonb, deleted_at=now(), updated_at=now()
     where client_id=p_client_id and sender_id=auth.uid();
    v_ok := true;
  end if;
  return jsonb_build_object('ok',v_ok,'media_key',v_media);
end;
$$;

create or replace function public.lx_hide_message_for_me(p_client_id text)
returns boolean
language plpgsql
security definer
set search_path to 'public','auth'
as $$
begin
  update public.lx_messages
     set hidden_for=array_append(hidden_for,auth.uid()), updated_at=now()
   where client_id=p_client_id
     and auth.uid() in (sender_id,recipient_id)
     and not (auth.uid() = any(hidden_for));
  return found;
end;
$$;

create or replace function public.lx_react_message(p_client_id text, p_emoji text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare v_reactions jsonb;
begin
  if p_emoji is not null and length(p_emoji)>16 then raise exception 'invalid reaction'; end if;
  update public.lx_messages
     set reactions = case
       when nullif(p_emoji,'') is null then reactions - auth.uid()::text
       else jsonb_set(reactions,array[auth.uid()::text],to_jsonb(p_emoji),true)
     end,
     updated_at=now()
   where client_id=p_client_id
     and auth.uid() in (sender_id,recipient_id)
     and deleted_at is null
  returning reactions into v_reactions;
  if v_reactions is null then raise exception 'message not found'; end if;
  return v_reactions;
end;
$$;

grant execute on function public.lx_chat_is_friend(uuid) to authenticated;
grant execute on function public.lx_send_message(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.lx_message_history(uuid) to authenticated;
grant execute on function public.lx_mark_messages_delivered(uuid) to authenticated;
grant execute on function public.lx_mark_messages_read(uuid) to authenticated;
grant execute on function public.lx_edit_message(text,text) to authenticated;
grant execute on function public.lx_delete_message_for_all(text) to authenticated;
grant execute on function public.lx_hide_message_for_me(text) to authenticated;
grant execute on function public.lx_react_message(text,text) to authenticated;

-- Add the table to Supabase Realtime once.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(
       select 1 from pg_publication_tables
       where pubname='supabase_realtime' and schemaname='public' and tablename='lx_messages'
     ) then
    alter publication supabase_realtime add table public.lx_messages;
  end if;
end $$;

-- Security hardening: SECURITY DEFINER RPCs are never callable by anonymous users.
revoke execute on function public.lx_chat_is_friend(uuid) from public, anon, authenticated;
revoke execute on function public.lx_send_message(uuid,text,text,text,text,text) from public, anon;
revoke execute on function public.lx_message_history(uuid) from public, anon;
revoke execute on function public.lx_mark_messages_delivered(uuid) from public, anon;
revoke execute on function public.lx_mark_messages_read(uuid) from public, anon;
revoke execute on function public.lx_edit_message(text,text) from public, anon;
revoke execute on function public.lx_delete_message_for_all(text) from public, anon;
revoke execute on function public.lx_hide_message_for_me(text) from public, anon;
revoke execute on function public.lx_react_message(text,text) from public, anon;

grant execute on function public.lx_send_message(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.lx_message_history(uuid) to authenticated;
grant execute on function public.lx_mark_messages_delivered(uuid) to authenticated;
grant execute on function public.lx_mark_messages_read(uuid) to authenticated;
grant execute on function public.lx_edit_message(text,text) to authenticated;
grant execute on function public.lx_delete_message_for_all(text) to authenticated;
grant execute on function public.lx_hide_message_for_me(text) to authenticated;
grant execute on function public.lx_react_message(text,text) to authenticated;
