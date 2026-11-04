-- Existing production routines captured read-only before the additive migration.
CREATE OR REPLACE FUNCTION public.lx_notify_call_result()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_name text;
begin
  if old.status is distinct from new.status and new.status='missed' then
    select coalesce(nullif(name,''),'Contato') into v_name from public.lx_profiles where user_id=new.caller_id;
    insert into public.lx_user_notifications(user_id,kind,title,message,data)
    values(new.callee_id,'call','Chamada perdida',coalesce(v_name,'Contato')||' tentou ligar para você',jsonb_build_object('call_id',new.id,'caller_id',new.caller_id,'mode',new.mode));
  end if;
  return new;
end;$function$;


CREATE OR REPLACE FUNCTION public.lx_notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_name text; v_preview text;
begin
  select coalesce(nullif(name,''),'Contato') into v_name from public.lx_profiles where user_id=new.sender_id;
  v_name:=coalesce(v_name,'Contato');
  v_preview:=case new.kind
    when 'audio' then 'Enviou uma mensagem de áudio'
    when 'image' then 'Enviou uma foto'
    when 'file' then 'Enviou um arquivo'
    when 'sticker' then 'Enviou uma figurinha'
    else left(coalesce(nullif(new.body,''),'Nova mensagem'),140)
  end;
  insert into public.lx_user_notifications(user_id,kind,title,message,data)
  values(new.recipient_id,'message','Mensagem de '||v_name,v_preview,jsonb_build_object('sender_id',new.sender_id,'client_id',new.client_id,'message_id',new.id));
  return new;
end;$function$;


CREATE OR REPLACE FUNCTION public.lx_send_message(p_other uuid, p_kind text, p_body text DEFAULT ''::text, p_media_key text DEFAULT NULL::text, p_client_id text DEFAULT NULL::text, p_reply_to_client_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$;
