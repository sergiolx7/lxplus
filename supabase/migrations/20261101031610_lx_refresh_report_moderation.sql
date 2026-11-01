-- Moderators review reported content without acquiring user-admin permissions.
alter policy reports_read on public.lx_moderation_reports
 using (user_id=(select auth.uid()) or (select public.lx_admin_can('community')));

create or replace function public.lx_moderate_report(p_report uuid,p_action text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare report public.lx_moderation_reports%rowtype; action text:=lower(trim(p_action));
begin
 if auth.uid() is null or not coalesce(public.lx_admin_can('community'),false) then raise exception 'permission denied' using errcode='42501'; end if;
 if action is null or action not in ('hide','review','dismiss','reopen') then raise exception 'invalid action'; end if;
 select * into report from public.lx_moderation_reports where id=p_report for update;
 if not found then raise exception 'report not found'; end if;
 if action='hide' then
  if report.target_kind<>'post' then raise exception 'only reported posts can be hidden'; end if;
  if report.target_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'invalid post'; end if;
  update public.lx_posts set status='hidden' where id=report.target_id::uuid;
  if not found then raise exception 'post not found'; end if;
 end if;
 update public.lx_moderation_reports set status=case action when 'reopen' then 'open' when 'dismiss' then 'dismissed' else 'reviewed' end where id=p_report;
 return true;
end $$;
revoke all on function public.lx_moderate_report(uuid,text) from public,anon;
grant execute on function public.lx_moderate_report(uuid,text) to authenticated;

create or replace function public.lx_reported_post(p_report uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null or not coalesce(public.lx_admin_can('community'),false) then raise exception 'permission denied' using errcode='42501'; end if;
 return (select jsonb_build_object('body',p.body,'status',p.status,'author_name',coalesce(a.name,'Membro LX'))
 from public.lx_moderation_reports r join public.lx_posts p on p.id::text=r.target_id
 left join public.lx_profiles a on a.user_id=p.author_id
 where r.id=p_report and r.target_kind='post');
end $$;
revoke all on function public.lx_reported_post(uuid) from public,anon;
grant execute on function public.lx_reported_post(uuid) to authenticated;
