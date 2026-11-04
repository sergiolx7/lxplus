begin;
select set_config('qa.social_member',(select p.user_id::text from public.lx_profiles p where p.approved and not exists(select 1 from public.lx_admins a where a.user_id=p.user_id) order by p.user_id limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.social_member'),'role','authenticated')::text,true) is not null as identity_set;
set local role authenticated;
do $checks$
declare v jsonb;
begin
 if not public.lx_is_approved() then raise exception 'NO_APPROVED_MEMBER'; end if;
 v:=public.lx_notification_settings('save','{"messages":false,"message_preview":false}'::jsonb);
 if (v->'preferences'->>'messages')::boolean is distinct from false then raise exception 'PREFERENCES_NOT_SAVED'; end if;
 if public.lx_edit_message(gen_random_uuid()::text,'Rollback-only verification') is distinct from false then raise exception 'UNEXPECTED_EDIT'; end if;
 begin
  perform * from lx_private.message_forward_requests;
  raise exception 'PRIVATE_TABLE_EXPOSED';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.lx_forward_message('dm',gen_random_uuid(),'dm',auth.uid(),gen_random_uuid());
  raise exception 'UNAVAILABLE_MESSAGE_ACCEPTED';
 exception when others then
  if sqlerrm<>'MESSAGE_UNAVAILABLE' then raise; end if;
 end;
end $checks$;
reset role;
do $checks$
declare v_me uuid:=current_setting('qa.social_member')::uuid; v_marker text:='rollback-only-social-controls-'||gen_random_uuid()::text;
begin
 insert into public.lx_user_notifications(user_id,kind,title,message,data)
 values(v_me,'message',v_marker,'Rollback-only',jsonb_build_object('message_id',v_marker,'sender_id',gen_random_uuid()));
 if exists(select 1 from public.lx_user_notifications where title=v_marker) then raise exception 'DISABLED_MESSAGE_NOTICE_CREATED'; end if;
 insert into public.lx_user_notifications(user_id,kind,title,message,data) values(v_me,'system',v_marker,'Rollback-only','{}');
 if (select count(*) from public.lx_user_notifications where title=v_marker)<>1 then raise exception 'SYSTEM_NOTICE_SUPPRESSED'; end if;
end $checks$;
select 'live social controls passed; rollback follows' as result;
rollback;
