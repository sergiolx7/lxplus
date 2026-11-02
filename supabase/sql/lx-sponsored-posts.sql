-- Clearly labeled in-app campaigns; never alter genuine social likes or ranking.
create table if not exists public.lx_sponsored_posts(
 post_id uuid primary key references public.lx_posts(id) on delete cascade,
 start_at timestamptz not null default now(),
 expires_at timestamptz not null,
 active boolean not null default true,
 created_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 check (expires_at>start_at)
);
create index if not exists lx_sponsored_posts_visible_idx on public.lx_sponsored_posts(active,expires_at);
alter table public.lx_sponsored_posts enable row level security;
revoke all on public.lx_sponsored_posts from public,anon,authenticated;
grant select,insert,update,delete on public.lx_sponsored_posts to service_role;

create or replace function public.lx_sponsor_public_post(p_post uuid,p_days integer,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target record;
begin
 if auth.uid() is null or public.lx_admin_role() not in ('owner','administrator') then raise exception 'ADMIN_REQUIRED';end if;
 if p_post is null or p_enabled is null then raise exception 'INVALID_POST';end if;
 if p_enabled then
  if p_days not between 1 and 30 then raise exception 'INVALID_DURATION';end if;
  select id,visibility,status into target from public.lx_posts where id=p_post;
  if target is null or target.visibility<>'public' or target.status<>'published' then raise exception 'POST_NOT_PUBLIC';end if;
  insert into public.lx_sponsored_posts(post_id,start_at,expires_at,active,created_by,updated_at)
  values(p_post,now(),now()+(p_days||' days')::interval,true,auth.uid(),now())
  on conflict(post_id) do update set start_at=now(),expires_at=now()+(p_days||' days')::interval,active=true,created_by=auth.uid(),updated_at=now();
 else
  update public.lx_sponsored_posts set active=false,updated_at=now() where post_id=p_post;
 end if;
 return jsonb_build_object('ok',true,'post_id',p_post,'active',p_enabled);
end $$;
revoke all on function public.lx_sponsor_public_post(uuid,integer,boolean) from public,anon;
grant execute on function public.lx_sponsor_public_post(uuid,integer,boolean) to authenticated;

create or replace function public.lx_admin_sponsored_posts()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.lx_admin_role() not in ('owner','administrator') then raise exception 'ADMIN_REQUIRED';end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object('post_id',q.post_id,'active',q.active,'expires_at',q.expires_at,'started_at',q.start_at,'preview',left(coalesce(p.body,''),90),'organic_likes',(select count(*) from public.lx_post_likes pl where pl.post_id=q.post_id)) order by q.start_at desc)
  from (select * from public.lx_sponsored_posts order by start_at desc limit 50) q join public.lx_posts p on p.id=q.post_id
 ),'[]'::jsonb);
end $$;
revoke all on function public.lx_admin_sponsored_posts() from public,anon;
grant execute on function public.lx_admin_sponsored_posts() to authenticated;

create or replace function public.lx_visible_sponsored_posts(p_post_ids uuid[])
returns uuid[] language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(s.post_id),'{}'::uuid[])
 from public.lx_sponsored_posts s
 join public.lx_posts p on p.id=s.post_id
 where s.post_id=any(coalesce(p_post_ids,'{}'::uuid[]))
 and s.active and s.start_at<=now() and s.expires_at>now()
 and p.status='published' and p.visibility='public'
$$;
revoke all on function public.lx_visible_sponsored_posts(uuid[]) from public,anon;
grant execute on function public.lx_visible_sponsored_posts(uuid[]) to authenticated;
