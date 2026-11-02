-- Publicly verified LX Plus founder identity, not an invented follower count.
-- Only the existing owner account @sergiolx receives this distinction.
create or replace function public.lx_official_founder_profiles(p_users uuid[])
returns uuid[] language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then '{}'::uuid[]
 else coalesce(array_agg(p.user_id),'{}'::uuid[]) end
 from public.lx_profiles p
 join public.lx_admins a on a.user_id=p.user_id
 where p.user_id=any(coalesce(p_users,'{}'::uuid[]))
 and coalesce(cardinality(p_users),0)<=100
 and p.approved=true and p.social_visible=true
 and a.role='owner' and lower(p.username)='sergiolx'
$$;
revoke all on function public.lx_official_founder_profiles(uuid[]) from public,anon;
grant execute on function public.lx_official_founder_profiles(uuid[]) to authenticated;
