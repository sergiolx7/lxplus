-- Additive social controls. Existing conversations and notifications are preserved.
alter table public.lx_messages add column if not exists is_forwarded boolean not null default false;
alter table public.lx_group_messages add column if not exists is_forwarded boolean not null default false;
alter table public.lx_group_messages add column if not exists edited_at timestamptz;

create table lx_private.notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 messages boolean not null default true, friends boolean not null default true,
 calls boolean not null default true, social boolean not null default true,
 updates boolean not null default true, message_preview boolean not null default true,
 updated_at timestamptz not null default now()
);
create table lx_private.notification_muted_threads (
 user_id uuid not null references auth.users(id) on delete cascade,
 thread_kind text not null check (thread_kind in ('dm','group')),
 target_id uuid not null, created_at timestamptz not null default now(),
 primary key (user_id,thread_kind,target_id)
);
create table lx_private.notification_events (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null, event_key text not null, created_at timestamptz not null default now(),
 primary key (user_id,kind,event_key)
);
create table lx_private.message_forward_requests (
 sender_id uuid not null references auth.users(id) on delete cascade,
 client_id uuid not null, source_kind text not null, source_id uuid not null,
 target_kind text not null, target_id uuid not null, result_id uuid,
 created_at timestamptz not null default now(), primary key(sender_id,client_id)
);
alter table lx_private.notification_preferences enable row level security;
alter table lx_private.notification_muted_threads enable row level security;
alter table lx_private.notification_events enable row level security;
alter table lx_private.message_forward_requests enable row level security;
revoke all on lx_private.notification_preferences,lx_private.notification_muted_threads,lx_private.notification_events,lx_private.message_forward_requests from public,anon,authenticated;

create or replace function lx_private.notification_settings(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_me uuid := auth.uid(); v_key text; v_kind text; v_target uuid; v_prefs jsonb;
begin
 if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.lx_is_approved() then raise exception 'APPROVAL_REQUIRED'; end if;
 if p_action not in ('get','save','mute','unmute') or p_action is null then raise exception 'INVALID_ACTION'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'INVALID_SETTINGS'; end if;
 if p_action='save' then
  for v_key in select jsonb_object_keys(p_data) loop
   if v_key not in ('messages','friends','calls','social','updates','message_preview') or jsonb_typeof(p_data->v_key) is distinct from 'boolean' then raise exception 'INVALID_SETTINGS'; end if;
  end loop;
  insert into lx_private.notification_preferences(user_id) values(v_me) on conflict do nothing;
  update lx_private.notification_preferences set
   messages=coalesce((p_data->>'messages')::boolean,messages), friends=coalesce((p_data->>'friends')::boolean,friends),
   calls=coalesce((p_data->>'calls')::boolean,calls), social=coalesce((p_data->>'social')::boolean,social),
   updates=coalesce((p_data->>'updates')::boolean,updates), message_preview=coalesce((p_data->>'message_preview')::boolean,message_preview),updated_at=now()
   where user_id=v_me;
 elsif p_action in ('mute','unmute') then
  v_kind:=p_data->>'thread_kind'; v_target:=(p_data->>'target_id')::uuid;
  if v_kind not in ('dm','group') or v_kind is null or v_target is null then raise exception 'INVALID_THREAD'; end if;
  -- Unmuting a former contact/group is allowed so old preferences can be removed.
  if p_action='mute' and not (case v_kind when 'dm' then public.lx_chat_is_friend(v_target) else public.lx_is_group_member(v_target) end) then raise exception 'THREAD_UNAVAILABLE'; end if;
  if p_action='mute' then
   insert into lx_private.notification_muted_threads(user_id,thread_kind,target_id) values(v_me,v_kind,v_target) on conflict do nothing;
  else delete from lx_private.notification_muted_threads where user_id=v_me and thread_kind=v_kind and target_id=v_target;
  end if;
 end if;
 select to_jsonb(p)-'user_id'-'updated_at' into v_prefs from lx_private.notification_preferences p where user_id=v_me;
 return jsonb_build_object('preferences',coalesce(v_prefs,'{"messages":true,"friends":true,"calls":true,"social":true,"updates":true,"message_preview":true}'::jsonb),
  'muted_threads',coalesce((select jsonb_agg(jsonb_build_object('thread_kind',m.thread_kind,'target_id',m.target_id)) from lx_private.notification_muted_threads m where user_id=v_me),'[]'::jsonb));
end; $$;
create or replace function public.lx_notification_settings(p_action text default 'get',p_data jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select lx_private.notification_settings(p_action,p_data); $$;

create or replace function lx_private.filter_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare p lx_private.notification_preferences%rowtype; v_key text; v_inserted boolean;
begin
 -- Only stable event IDs are deduplicated. Unrelated notices are never merged.
 v_key:=case new.kind when 'message' then coalesce(new.data->>'message_id',new.data->>'client_id') when 'group_message' then new.data->>'message_id' when 'call' then new.data->>'call_id' end;
 if nullif(v_key,'') is not null then
  insert into lx_private.notification_events(user_id,kind,event_key) values(new.user_id,new.kind,v_key) on conflict do nothing returning true into v_inserted;
  if not coalesce(v_inserted,false) then return null; end if;
 end if;
 select * into p from lx_private.notification_preferences where user_id=new.user_id;
 if (new.kind in ('message','group_message') and p.messages=false)
  or (new.kind in ('friend','friend_request','friend_accepted') and p.friends=false)
  or (new.kind='call' and p.calls=false)
  or (new.kind in ('like','comment','mention') and p.social=false)
  or (new.kind in ('update','product') and p.updates=false) then return null; end if;
 if new.kind in ('message','group_message') then
  if exists(select 1 from lx_private.notification_muted_threads m where m.user_id=new.user_id and
   ((new.kind='message' and m.thread_kind='dm' and m.target_id::text=new.data->>'sender_id') or
    (new.kind='group_message' and m.thread_kind='group' and m.target_id::text=new.data->>'group_id'))) then return null; end if;
  if p.message_preview=false then new.message:='Você recebeu uma nova mensagem.'; end if;
 end if;
 return new;
end; $$;
create trigger lx_notification_delivery_controls before insert on public.lx_user_notifications for each row execute function lx_private.filter_notification();

create or replace function lx_private.notify_group_message() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.lx_user_notifications(user_id,kind,title,message,data)
 select m.user_id,'group_message','Nova mensagem no grupo',
  case new.kind when 'audio' then 'Enviou uma mensagem de áudio' when 'image' then 'Enviou uma foto' when 'file' then 'Enviou um arquivo' when 'sticker' then 'Enviou uma figurinha' else left(coalesce(nullif(new.body,''),'Nova mensagem'),140) end,
  jsonb_build_object('group_id',new.group_id,'message_id',new.id,'sender_id',new.sender_id)
 from public.lx_group_members m where m.group_id=new.group_id and m.user_id<>new.sender_id;
 return new;
end; $$;
create trigger lx_group_message_notice after insert on public.lx_group_messages for each row execute function lx_private.notify_group_message();

create or replace function lx_private.edit_message(p_source_kind text,p_message text,p_body text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_me uuid := auth.uid(); v_body text:=btrim(coalesce(p_body,''));
begin
 if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.lx_is_approved() then raise exception 'APPROVAL_REQUIRED'; end if;
 if v_body='' or length(v_body)>4000 then raise exception 'INVALID_MESSAGE_BODY'; end if;
 if p_source_kind='dm' then
  update public.lx_messages set body=v_body,edited_at=now(),updated_at=now()
   where client_id=p_message and sender_id=v_me and kind='text' and deleted_at is null;
 elsif p_source_kind='group' then
  update public.lx_group_messages set body=v_body,edited_at=now()
   where id=p_message::uuid and sender_id=v_me and kind='text' and public.lx_is_group_member(group_id);
 else raise exception 'INVALID_THREAD'; end if;
 return found;
end; $$;
create or replace function public.lx_edit_message(p_client_id text,p_body text)
returns boolean language sql security invoker set search_path='' as $$ select lx_private.edit_message('dm',p_client_id,p_body); $$;
create or replace function public.lx_edit_group_message(p_message_id uuid,p_body text)
returns boolean language sql security invoker set search_path='' as $$ select lx_private.edit_message('group',p_message_id::text,p_body); $$;

create or replace function lx_private.forward_message(p_source_kind text,p_source_id uuid,p_target_kind text,p_target_id uuid,p_client_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_me uuid:=auth.uid(); v_body text; v_kind text; v_media text; v_result uuid; v_job lx_private.message_forward_requests%rowtype;
begin
 if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.lx_is_approved() then raise exception 'APPROVAL_REQUIRED'; end if;
 if p_source_kind not in ('dm','group') or p_target_kind not in ('dm','group') or p_source_kind is null or p_target_kind is null or p_source_id is null or p_target_id is null or p_client_id is null then raise exception 'INVALID_FORWARD'; end if;
 insert into lx_private.message_forward_requests(sender_id,client_id,source_kind,source_id,target_kind,target_id)
 values(v_me,p_client_id,p_source_kind,p_source_id,p_target_kind,p_target_id) on conflict do nothing;
 select * into v_job from lx_private.message_forward_requests where sender_id=v_me and client_id=p_client_id for update;
 if v_job.source_kind<>p_source_kind or v_job.source_id<>p_source_id or v_job.target_kind<>p_target_kind or v_job.target_id<>p_target_id then raise exception 'FORWARD_REQUEST_CONFLICT'; end if;
 if v_job.result_id is not null then return v_job.result_id; end if;
 if exists(select 1 from public.lx_messages where client_id=p_client_id::text) or exists(select 1 from public.lx_group_messages where id=p_client_id) then raise exception 'FORWARD_REQUEST_CONFLICT'; end if;
 if p_source_kind='dm' then
  select body,kind,media_key into v_body,v_kind,v_media from public.lx_messages
   where id=p_source_id and v_me in (sender_id,recipient_id) and deleted_at is null and not(v_me=any(hidden_for)) for share;
 else
  select body,kind,media_path into v_body,v_kind,v_media from public.lx_group_messages
   where id=p_source_id and public.lx_is_group_member(group_id) for share;
 end if;
 if not found then raise exception 'MESSAGE_UNAVAILABLE'; end if;
 -- Text snapshots only. Private attachment paths are never shared across audiences.
 if v_kind<>'text' or v_media is not null or nullif(btrim(v_body),'') is null or length(v_body)>4000 then raise exception 'FORWARD_TEXT_ONLY'; end if;
 if p_target_kind='dm' then
  v_result:=public.lx_send_message(p_target_id,'text',v_body,null,p_client_id::text,null);
  update public.lx_messages set is_forwarded=true where id=v_result and sender_id=v_me;
 else
  if not public.lx_is_group_member(p_target_id) then raise exception 'THREAD_UNAVAILABLE'; end if;
  insert into public.lx_group_messages(id,group_id,sender_id,kind,body,is_forwarded) values(p_client_id,p_target_id,v_me,'text',v_body,true) returning id into v_result;
 end if;
 update lx_private.message_forward_requests set result_id=v_result where sender_id=v_me and client_id=p_client_id;
 return v_result;
end; $$;
create or replace function public.lx_forward_message(p_source_kind text,p_source_id uuid,p_target_kind text,p_target_id uuid,p_client_id uuid)
returns uuid language sql security invoker set search_path='' as $$ select lx_private.forward_message(p_source_kind,p_source_id,p_target_kind,p_target_id,p_client_id); $$;

revoke all on function lx_private.notification_settings(text,jsonb),public.lx_notification_settings(text,jsonb),lx_private.filter_notification(),lx_private.notify_group_message(),lx_private.edit_message(text,text,text),public.lx_edit_message(text,text),public.lx_edit_group_message(uuid,text),lx_private.forward_message(text,uuid,text,uuid,uuid),public.lx_forward_message(text,uuid,text,uuid,uuid) from public,anon;
grant execute on function lx_private.notification_settings(text,jsonb),public.lx_notification_settings(text,jsonb),lx_private.edit_message(text,text,text),public.lx_edit_message(text,text),public.lx_edit_group_message(uuid,text),lx_private.forward_message(text,uuid,text,uuid,uuid),public.lx_forward_message(text,uuid,text,uuid,uuid) to authenticated;
