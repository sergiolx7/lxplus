-- Disposable PostgreSQL fixture. No production identifiers or credentials.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid
$$;
grant usage on schema auth,public to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.lx_profiles(user_id uuid primary key,approved boolean not null);
create table public.lx_admins(user_id uuid primary key references public.lx_profiles,role text not null,updated_at timestamptz,updated_by uuid);
create function public.lx_admin_role() returns text language sql stable security definer set search_path='' as $$
 select a.role from public.lx_admins a where a.user_id=auth.uid() limit 1
$$;
insert into public.lx_profiles values
 ('10000000-0000-4000-8000-000000000001',true),
 ('10000000-0000-4000-8000-000000000002',true),
 ('10000000-0000-4000-8000-000000000003',true),
 ('10000000-0000-4000-8000-000000000004',true),
 ('10000000-0000-4000-8000-000000000005',true);
insert into public.lx_admins(user_id,role) values
 ('10000000-0000-4000-8000-000000000001','owner'),
 ('10000000-0000-4000-8000-000000000002','administrator'),
 ('10000000-0000-4000-8000-000000000003','editor'),
 ('10000000-0000-4000-8000-000000000004','moderator');
