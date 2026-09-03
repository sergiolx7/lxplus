-- LX Plus v20 — Supabase setup
-- Execute este arquivo inteiro no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.lx_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.lx_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Usuário',
  verified boolean not null default false,
  ranking_visible boolean not null default true,
  watched_hours numeric not null default 0,
  listened_hours numeric not null default 0,
  read_count integer not null default 0,
  streak integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lx_catalog (
  id bigint primary key,
  payload jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.lx_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.lx_settings(key,value) values(
  'branding',
  '{"splashEyebrow":"DIGITAL MEDIA EXPERIENCE","splashTag":"DM VERSION","splashTitle":"Seu entretenimento. Do seu jeito.","splashSubtitle":"Filmes, séries, animes, doramas, livros e música conectados por uma única experiência.","accent":"#42a5ff","featuredIds":[]}'::jsonb
) on conflict(key) do nothing;

create table if not exists public.lx_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.lx_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'Mensal',
  active boolean not null default false,
  status text not null default 'inactive',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lx_requests (
  id bigserial primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  media_type text not null,
  title text not null,
  message text,
  user_name text not null default 'Usuário',
  dedupe_key text not null,
  votes integer not null default 1,
  status text not null default 'Novo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lx_requests_dedupe_idx on public.lx_requests(dedupe_key,status);

create table if not exists public.lx_request_voters (
  request_id bigint not null references public.lx_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(request_id,user_id)
);

create table if not exists public.lx_notifications (
  id bigint primary key,
  title text not null,
  message text not null,
  published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lx_analytics (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.lx_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.lx_admins where user_id = auth.uid());
$$;

create or replace function public.lx_am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.lx_is_admin();
$$;

grant execute on function public.lx_is_admin() to anon,authenticated;
grant execute on function public.lx_am_i_admin() to authenticated;

create or replace function public.lx_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lx_profiles(user_id,name,ranking_visible)
  values(
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(coalesce(new.email,'usuario'),'@',1), 'Usuário'),
    coalesce((new.raw_user_meta_data->>'ranking_visible')::boolean,true)
  ) on conflict(user_id) do nothing;
  insert into public.lx_user_state(user_id,data) values(new.id,'{}'::jsonb) on conflict(user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_lx on auth.users;
create trigger on_auth_user_created_lx
after insert on auth.users
for each row execute procedure public.lx_handle_new_user();

-- Faz backfill caso você já tenha criado usuários antes de rodar o setup.
insert into public.lx_profiles(user_id,name,ranking_visible)
select u.id,coalesce(nullif(u.raw_user_meta_data->>'name',''),split_part(coalesce(u.email,'usuario'),'@',1),'Usuário'),coalesce((u.raw_user_meta_data->>'ranking_visible')::boolean,true)
from auth.users u
on conflict(user_id) do nothing;
insert into public.lx_user_state(user_id,data)
select u.id,'{}'::jsonb from auth.users u
on conflict(user_id) do nothing;

create or replace function public.lx_guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.user_id and not public.lx_is_admin() then
    if new.verified is distinct from old.verified then
      raise exception 'verified field is admin-only';
    end if;
    if coalesce(current_setting('lx.server_metrics',true),'') <> '1' and (new.watched_hours is distinct from old.watched_hours or new.listened_hours is distinct from old.listened_hours or new.read_count is distinct from old.read_count or new.streak is distinct from old.streak) then
      raise exception 'usage metrics are server-managed';
    end if;
    new.user_id := old.user_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists lx_guard_profile_update_trg on public.lx_profiles;
create trigger lx_guard_profile_update_trg before update on public.lx_profiles
for each row execute procedure public.lx_guard_profile_update();

create or replace function public.lx_admin_user_directory()
returns table(user_id uuid,name text,email text,verified boolean,ranking_visible boolean,watched_hours numeric,listened_hours numeric,read_count integer,streak integer,admin boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.lx_is_admin() then raise exception 'admin required'; end if;
  return query
  select p.user_id,p.name,u.email::text,p.verified,p.ranking_visible,p.watched_hours,p.listened_hours,p.read_count,p.streak,(a.user_id is not null)
  from public.lx_profiles p
  join auth.users u on u.id=p.user_id
  left join public.lx_admins a on a.user_id=p.user_id
  order by p.created_at;
end;
$$;
grant execute on function public.lx_admin_user_directory() to authenticated;

create or replace function public.lx_request_or_vote(p_kind text,p_media_type text,p_title text,p_message text default '')
returns public.lx_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  key text;
  rid bigint;
  added boolean := false;
  result public.lx_requests;
  uname text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  key := md5(lower(trim(coalesce(p_kind,''))) || '|' || lower(trim(coalesce(p_media_type,''))) || '|' || lower(trim(coalesce(p_title,''))));
  select id into rid from public.lx_requests where dedupe_key=key and status not in ('Concluído','Fechado') order by created_at limit 1;
  if rid is null then
    select name into uname from public.lx_profiles where user_id=uid;
    insert into public.lx_requests(owner_user_id,kind,media_type,title,message,user_name,dedupe_key)
    values(uid,p_kind,p_media_type,trim(p_title),coalesce(p_message,''),coalesce(uname,'Usuário'),key)
    returning id into rid;
    insert into public.lx_request_voters(request_id,user_id) values(rid,uid) on conflict do nothing;
  else
    insert into public.lx_request_voters(request_id,user_id) values(rid,uid) on conflict do nothing returning true into added;
    if coalesce(added,false) then update public.lx_requests set votes=votes+1,updated_at=now() where id=rid; end if;
  end if;
  select * into result from public.lx_requests where id=rid;
  return result;
end;
$$;
grant execute on function public.lx_request_or_vote(text,text,text,text) to authenticated;

-- Registra analytics e atualiza métricas públicas sem permitir que o usuário edite os números diretamente.
create or replace function public.lx_track_event(p_event text,p_data jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication required'; end if;
  insert into public.lx_analytics(user_id,event,data) values(uid,left(coalesce(p_event,'event'),80),coalesce(p_data,'{}'::jsonb));
  perform set_config('lx.server_metrics','1',true);
  if p_event='play' then
    update public.lx_profiles set watched_hours=watched_hours+0.10,updated_at=now() where user_id=uid;
  elsif p_event='music' then
    update public.lx_profiles set listened_hours=listened_hours+0.05,updated_at=now() where user_id=uid;
  elsif p_event='read' then
    update public.lx_profiles set read_count=read_count+1,updated_at=now() where user_id=uid;
  end if;
end;
$$;
grant execute on function public.lx_track_event(text,jsonb) to authenticated;

-- RLS
alter table public.lx_admins enable row level security;
alter table public.lx_profiles enable row level security;
alter table public.lx_catalog enable row level security;
alter table public.lx_settings enable row level security;
alter table public.lx_user_state enable row level security;
alter table public.lx_subscriptions enable row level security;
alter table public.lx_requests enable row level security;
alter table public.lx_request_voters enable row level security;
alter table public.lx_notifications enable row level security;
alter table public.lx_analytics enable row level security;

revoke all on public.lx_admins,public.lx_profiles,public.lx_catalog,public.lx_settings,public.lx_user_state,public.lx_subscriptions,public.lx_requests,public.lx_request_voters,public.lx_notifications,public.lx_analytics from anon,authenticated;
grant select on public.lx_catalog,public.lx_notifications,public.lx_settings to anon,authenticated;
grant select,insert,update on public.lx_profiles to authenticated;
grant select,insert,update on public.lx_user_state to authenticated;
grant select,insert,update,delete on public.lx_catalog,public.lx_settings to authenticated;
grant select,insert,update on public.lx_subscriptions to authenticated;
grant select,insert,update on public.lx_requests to authenticated;
grant select,insert on public.lx_request_voters to authenticated;
grant select,insert,update,delete on public.lx_notifications to authenticated;
grant select on public.lx_analytics to authenticated;
grant usage,select on all sequences in schema public to authenticated;

-- Policies (drop first so this file can be rerun safely)
drop policy if exists "lx catalog public read" on public.lx_catalog;
create policy "lx catalog public read" on public.lx_catalog for select to anon,authenticated using (published or public.lx_is_admin());
drop policy if exists "lx catalog admin insert" on public.lx_catalog;
create policy "lx catalog admin insert" on public.lx_catalog for insert to authenticated with check (public.lx_is_admin());
drop policy if exists "lx catalog admin update" on public.lx_catalog;
create policy "lx catalog admin update" on public.lx_catalog for update to authenticated using (public.lx_is_admin()) with check (public.lx_is_admin());
drop policy if exists "lx catalog admin delete" on public.lx_catalog;
create policy "lx catalog admin delete" on public.lx_catalog for delete to authenticated using (public.lx_is_admin());

drop policy if exists "lx settings public read" on public.lx_settings;
create policy "lx settings public read" on public.lx_settings for select to anon,authenticated using (true);
drop policy if exists "lx settings admin insert" on public.lx_settings;
create policy "lx settings admin insert" on public.lx_settings for insert to authenticated with check (public.lx_is_admin());
drop policy if exists "lx settings admin update" on public.lx_settings;
create policy "lx settings admin update" on public.lx_settings for update to authenticated using (public.lx_is_admin()) with check (public.lx_is_admin());

drop policy if exists "lx profiles visible read" on public.lx_profiles;
create policy "lx profiles visible read" on public.lx_profiles for select to authenticated using (ranking_visible or user_id=auth.uid() or public.lx_is_admin());
drop policy if exists "lx profiles self insert" on public.lx_profiles;
create policy "lx profiles self insert" on public.lx_profiles for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "lx profiles self or admin update" on public.lx_profiles;
create policy "lx profiles self or admin update" on public.lx_profiles for update to authenticated using (user_id=auth.uid() or public.lx_is_admin()) with check (user_id=auth.uid() or public.lx_is_admin());

drop policy if exists "lx state own read" on public.lx_user_state;
create policy "lx state own read" on public.lx_user_state for select to authenticated using (user_id=auth.uid() or public.lx_is_admin());
drop policy if exists "lx state own insert" on public.lx_user_state;
create policy "lx state own insert" on public.lx_user_state for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "lx state own update" on public.lx_user_state;
create policy "lx state own update" on public.lx_user_state for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "lx sub own or admin read" on public.lx_subscriptions;
create policy "lx sub own or admin read" on public.lx_subscriptions for select to authenticated using (user_id=auth.uid() or public.lx_is_admin());
drop policy if exists "lx sub admin insert" on public.lx_subscriptions;
create policy "lx sub admin insert" on public.lx_subscriptions for insert to authenticated with check (public.lx_is_admin());
drop policy if exists "lx sub admin update" on public.lx_subscriptions;
create policy "lx sub admin update" on public.lx_subscriptions for update to authenticated using (public.lx_is_admin()) with check (public.lx_is_admin());

drop policy if exists "lx requests own voter admin read" on public.lx_requests;
create policy "lx requests own voter admin read" on public.lx_requests for select to authenticated using (owner_user_id=auth.uid() or public.lx_is_admin() or exists(select 1 from public.lx_request_voters v where v.request_id=id and v.user_id=auth.uid()));
drop policy if exists "lx requests admin update" on public.lx_requests;
create policy "lx requests admin update" on public.lx_requests for update to authenticated using (public.lx_is_admin()) with check (public.lx_is_admin());
drop policy if exists "lx voters own read" on public.lx_request_voters;
create policy "lx voters own read" on public.lx_request_voters for select to authenticated using (user_id=auth.uid() or public.lx_is_admin());
drop policy if exists "lx voters own insert" on public.lx_request_voters;
create policy "lx voters own insert" on public.lx_request_voters for insert to authenticated with check (user_id=auth.uid());

drop policy if exists "lx notices public read" on public.lx_notifications;
create policy "lx notices public read" on public.lx_notifications for select to anon,authenticated using (published or public.lx_is_admin());
drop policy if exists "lx notices admin insert" on public.lx_notifications;
create policy "lx notices admin insert" on public.lx_notifications for insert to authenticated with check (public.lx_is_admin());
drop policy if exists "lx notices admin update" on public.lx_notifications;
create policy "lx notices admin update" on public.lx_notifications for update to authenticated using (public.lx_is_admin()) with check (public.lx_is_admin());
drop policy if exists "lx notices admin delete" on public.lx_notifications;
create policy "lx notices admin delete" on public.lx_notifications for delete to authenticated using (public.lx_is_admin());

drop policy if exists "lx analytics own insert" on public.lx_analytics;
drop policy if exists "lx analytics admin read" on public.lx_analytics;
create policy "lx analytics admin read" on public.lx_analytics for select to authenticated using (public.lx_is_admin());

-- Storage: assets públicos; mídia privada com URL assinada para usuários autenticados.
insert into storage.buckets(id,name,public) values('lx-assets','lx-assets',true)
on conflict(id) do update set public=true;
insert into storage.buckets(id,name,public) values('lx-media','lx-media',false)
on conflict(id) do update set public=false;

-- ADM pode enviar/alterar/excluir assets e mídia.
drop policy if exists "lx assets admin insert" on storage.objects;
create policy "lx assets admin insert" on storage.objects for insert to authenticated with check (bucket_id='lx-assets' and public.lx_is_admin());
drop policy if exists "lx assets admin update" on storage.objects;
create policy "lx assets admin update" on storage.objects for update to authenticated using (bucket_id='lx-assets' and public.lx_is_admin()) with check (bucket_id='lx-assets' and public.lx_is_admin());
drop policy if exists "lx assets admin delete" on storage.objects;
create policy "lx assets admin delete" on storage.objects for delete to authenticated using (bucket_id='lx-assets' and public.lx_is_admin());

drop policy if exists "lx media admin insert" on storage.objects;
create policy "lx media admin insert" on storage.objects for insert to authenticated with check (bucket_id='lx-media' and public.lx_is_admin());
drop policy if exists "lx media admin update" on storage.objects;
create policy "lx media admin update" on storage.objects for update to authenticated using (bucket_id='lx-media' and public.lx_is_admin()) with check (bucket_id='lx-media' and public.lx_is_admin());
drop policy if exists "lx media admin delete" on storage.objects;
create policy "lx media admin delete" on storage.objects for delete to authenticated using (bucket_id='lx-media' and public.lx_is_admin());

-- Usuário autenticado pode ler mídia privada; o frontend gera URL assinada temporária.
drop policy if exists "lx media authenticated read" on storage.objects;
create policy "lx media authenticated read" on storage.objects for select to authenticated using (bucket_id='lx-media');

-- Usuários podem manter somente a própria imagem de perfil em lx-assets/profiles/<uid>/.
drop policy if exists "lx profile media own insert" on storage.objects;
create policy "lx profile media own insert" on storage.objects for insert to authenticated with check (bucket_id='lx-assets' and (storage.foldername(name))[1]='profiles' and (storage.foldername(name))[2]=auth.uid()::text);
drop policy if exists "lx profile media own update" on storage.objects;
create policy "lx profile media own update" on storage.objects for update to authenticated using (bucket_id='lx-assets' and (storage.foldername(name))[1]='profiles' and (storage.foldername(name))[2]=auth.uid()::text) with check (bucket_id='lx-assets' and (storage.foldername(name))[1]='profiles' and (storage.foldername(name))[2]=auth.uid()::text);
drop policy if exists "lx profile media own delete" on storage.objects;
create policy "lx profile media own delete" on storage.objects for delete to authenticated using (bucket_id='lx-assets' and (storage.foldername(name))[1]='profiles' and (storage.foldername(name))[2]=auth.uid()::text);

-- Realtime para catálogo/notificações/assinatura/estado.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lx_catalog') then alter publication supabase_realtime add table public.lx_catalog; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lx_settings') then alter publication supabase_realtime add table public.lx_settings; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lx_notifications') then alter publication supabase_realtime add table public.lx_notifications; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lx_subscriptions') then alter publication supabase_realtime add table public.lx_subscriptions; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lx_user_state') then alter publication supabase_realtime add table public.lx_user_state; end if;
end $$;

-- Depois que você criar sua conta no site, rode separadamente (troque pelo seu e-mail):
-- insert into public.lx_admins(user_id)
-- select id from auth.users where email='SEU_EMAIL_AQUI'
-- on conflict(user_id) do nothing;
