-- LX Plus v25.38 — Adaptive Identity
-- DOCUMENTAÇÃO / REFERÊNCIA.
-- ESTA MIGRAÇÃO JÁ FOI APLICADA ao projeto Supabase atual em 12/09/2026.
-- Não é necessário executar novamente no projeto atual.

alter table public.lx_profiles add column if not exists status_text text not null default '';
alter table public.lx_profiles add column if not exists banner_url text;
alter table public.lx_profiles add column if not exists activity_visible boolean not null default true;
alter table public.lx_profiles add column if not exists favorites_visible boolean not null default false;
alter table public.lx_profiles add column if not exists favorite_ids jsonb not null default '[]'::jsonb;
alter table public.lx_profiles add column if not exists last_activity text;

drop function if exists public.lx_social_directory();
create function public.lx_social_directory()
returns table(
  user_id uuid,
  name text,
  verified boolean,
  avatar_url text,
  bio text,
  calls_enabled boolean,
  status_text text,
  banner_url text,
  activity_visible boolean,
  favorites_visible boolean,
  favorite_ids jsonb,
  last_activity text,
  relation text,
  direction text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public','auth'
as $$
  select
    p.user_id,
    p.name,
    p.verified,
    p.avatar_url,
    p.bio,
    p.calls_enabled,
    p.status_text,
    p.banner_url,
    p.activity_visible,
    p.favorites_visible,
    case when p.favorites_visible then coalesce(p.favorite_ids,'[]'::jsonb) else '[]'::jsonb end as favorite_ids,
    case when p.activity_visible then p.last_activity else null end as last_activity,
    coalesce(f.status,'none') as relation,
    case when f.status='pending' then case when f.requested_by=auth.uid() then 'outgoing' else 'incoming' end else 'none' end as direction,
    p.created_at
  from public.lx_profiles p
  left join public.lx_friendships f on
    ((f.user_low=auth.uid() and f.user_high=p.user_id) or
     (f.user_high=auth.uid() and f.user_low=p.user_id))
  where public.lx_is_approved()
    and p.approved=true
    and p.user_id<>auth.uid()
    and (p.social_visible=true or f.status in ('accepted','pending'))
  order by case when f.status='accepted' then 0 when f.status='pending' then 1 else 2 end,p.name;
$$;

revoke all on function public.lx_social_directory() from public, anon;
grant execute on function public.lx_social_directory() to authenticated, service_role;
