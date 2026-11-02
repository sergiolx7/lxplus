-- The "LX Lab" counter preview is a private, explicitly opt-in display mode.
-- All public counts remain authentic. Granting preview never changes likes/follows.
create table if not exists public.lx_demo_preview_viewers(
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_by uuid not null references auth.users(id),
 granted_at timestamptz not null default now()
);
alter table public.lx_demo_preview_viewers enable row level security;
revoke all on public.lx_demo_preview_viewers from public,anon,authenticated;
grant select,insert,delete on public.lx_demo_preview_viewers to service_role;

create or replace function public.lx_demo_social_view_access()
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then return false; end if;
 return coalesce(public.lx_admin_role() in ('owner','administrator'),false)
   or exists(select 1 from public.lx_demo_preview_viewers where user_id=auth.uid());
end $$;
revoke all on function public.lx_demo_social_view_access() from public,anon;
grant execute on function public.lx_demo_social_view_access() to authenticated;

create or replace function public.lx_demo_social_allow_viewer(p_viewer uuid,p_allow boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_admin_role()<>'owner' then raise exception 'OWNER_REQUIRED';end if;
 if p_viewer is null or p_allow is null then raise exception 'INVALID_VIEWER';end if;
 if not exists(select 1 from public.lx_profiles where user_id=p_viewer and approved=true) then raise exception 'APPROVED_MEMBER_REQUIRED';end if;
 if p_allow then
  insert into public.lx_demo_preview_viewers(user_id,granted_by) values(p_viewer,auth.uid())
  on conflict(user_id) do update set granted_by=excluded.granted_by,granted_at=now();
 else
  delete from public.lx_demo_preview_viewers where user_id=p_viewer;
 end if;
 return jsonb_build_object('ok',true,'id',p_viewer,'allowed',p_allow);
end $$;
revoke all on function public.lx_demo_social_allow_viewer(uuid,boolean) from public,anon;
grant execute on function public.lx_demo_social_allow_viewer(uuid,boolean) to authenticated;

create or replace function public.lx_demo_social_preview_viewers()
returns jsonb language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null or public.lx_admin_role()<>'owner' then '[]'::jsonb
 else coalesce((select jsonb_agg(jsonb_build_object('user_id',v.user_id,'name',coalesce(p.name,'Usuário'),
 'granted_at',v.granted_at) order by v.granted_at desc)
 from public.lx_demo_preview_viewers v left join public.lx_profiles p on p.user_id=v.user_id),'[]'::jsonb) end
$$;
revoke all on function public.lx_demo_social_preview_viewers() from public,anon;
grant execute on function public.lx_demo_social_preview_viewers() to authenticated;

-- Existing public RPC is hardened: demo data is delivered only to owner, ADM,
-- or a member explicitly granted private preview access by the owner.
create or replace function public.lx_demo_social_visible(p_posts uuid[],p_profiles uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce(cardinality(p_posts),0)>50 or coalesce(cardinality(p_profiles),0)>50 then raise exception 'TOO_MANY_METRICS';end if;
 if public.lx_demo_social_view_access() is not true then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(jsonb_build_object('kind',d.target_kind,'id',d.target_id,'demo_count',d.demo_count))
  from public.lx_demo_social_metrics d where d.demo_count>0 and (
   (d.target_kind='post' and d.target_id=any(coalesce(p_posts,'{}'::uuid[]))
    and exists(select 1 from public.lx_posts p where p.id=d.target_id and p.status='published' and p.visibility='public'))
   or
   (d.target_kind='profile' and d.target_id=any(coalesce(p_profiles,'{}'::uuid[]))
    and exists(select 1 from public.lx_profiles p where p.user_id=d.target_id and p.social_visible=true and p.approved=true))
  )
 ),'[]'::jsonb);
end $$;
revoke all on function public.lx_demo_social_visible(uuid[],uuid[]) from public,anon;
grant execute on function public.lx_demo_social_visible(uuid[],uuid[]) to authenticated;
