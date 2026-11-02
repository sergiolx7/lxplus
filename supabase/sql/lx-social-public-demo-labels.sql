-- Publicly visible *labeled test figures*, not fictitious likes or follows.
-- The genuine heart/follow counts never include these additions for regular users.
create or replace function public.lx_demo_social_public(p_posts uuid[],p_profiles uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_is_approved() is not true then raise exception 'APPROVED_USER_REQUIRED';end if;
 if coalesce(cardinality(p_posts),0)>50 or coalesce(cardinality(p_profiles),0)>50 then raise exception 'TOO_MANY_METRICS';end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object('kind',d.target_kind,'id',d.target_id,'demo_count',d.demo_count))
  from public.lx_demo_social_metrics d
  where d.demo_count>0
   and (
    (d.target_kind='post' and d.target_id=any(coalesce(p_posts,'{}'::uuid[]))
      and exists(select 1 from public.lx_posts p where p.id=d.target_id and p.status='published' and p.visibility='public'))
    or (d.target_kind='profile' and d.target_id=any(coalesce(p_profiles,'{}'::uuid[]))
      and exists(select 1 from public.lx_profiles p where p.user_id=d.target_id and p.approved and p.social_visible))
   )
 ),'[]'::jsonb);
end $$;
revoke all on function public.lx_demo_social_public(uuid[],uuid[]) from public,anon;
grant execute on function public.lx_demo_social_public(uuid[],uuid[]) to authenticated;
