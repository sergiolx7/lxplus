-- Genuine follow relationships, independent of friendship requests and demo metrics.
-- Follow counts never include any demo values; only two authenticated users count.
create table if not exists public.lx_profile_follows(
 follower_id uuid not null references auth.users(id) on delete cascade,
 followed_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,followed_id),
 constraint lx_profile_follow_no_self check(follower_id<>followed_id)
);
create index if not exists lx_profile_follows_followed_idx on public.lx_profile_follows(followed_id,created_at desc);
alter table public.lx_profile_follows enable row level security;
revoke all on table public.lx_profile_follows from public,anon,authenticated;
grant select,insert,delete on public.lx_profile_follows to service_role;

create or replace function public.lx_social_follow_toggle(p_user uuid,p_follow boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare viewer uuid:=auth.uid(); after_count integer;
begin
 if viewer is null or public.lx_is_approved() is not true then raise exception 'APPROVED_USER_REQUIRED';end if;
 if p_user is null or p_user=viewer or p_follow is null then raise exception 'INVALID_FOLLOW_TARGET';end if;
 if not exists(select 1 from public.lx_profiles p where p.user_id=p_user and p.approved=true and p.social_visible=true) then raise exception 'PUBLIC_PROFILE_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,97));
 if p_follow then
  insert into public.lx_profile_follows(follower_id,followed_id) values(viewer,p_user)
  on conflict(follower_id,followed_id) do nothing;
 else
  delete from public.lx_profile_follows where follower_id=viewer and followed_id=p_user;
 end if;
 select count(*) into after_count from public.lx_profile_follows where followed_id=p_user;
 return jsonb_build_object('user_id',p_user,'following',p_follow,'followers',after_count);
end $$;
revoke all on function public.lx_social_follow_toggle(uuid,boolean) from public,anon;
grant execute on function public.lx_social_follow_toggle(uuid,boolean) to authenticated;

create or replace function public.lx_social_follow_stats(p_users uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare viewer uuid:=auth.uid();
begin
 if viewer is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce(cardinality(p_users),0)>100 then raise exception 'TOO_MANY_PROFILES';end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'user_id',p.user_id,
   'followers',(select count(*) from public.lx_profile_follows f where f.followed_id=p.user_id),
   'following_count',(select count(*) from public.lx_profile_follows f where f.follower_id=p.user_id),
   'is_following',exists(select 1 from public.lx_profile_follows f where f.follower_id=viewer and f.followed_id=p.user_id)
  ))
  from public.lx_profiles p
  where p.user_id=any(coalesce(p_users,'{}'::uuid[]))
  and ((p.approved=true and p.social_visible=true) or p.user_id=viewer)
 ),'[]'::jsonb);
end $$;
revoke all on function public.lx_social_follow_stats(uuid[]) from public,anon;
grant execute on function public.lx_social_follow_stats(uuid[]) to authenticated;
