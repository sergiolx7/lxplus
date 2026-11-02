-- Cached YouTube metadata and bounded official API use for music continuation.
-- No audio is downloaded or stored and no provider credential enters the browser.
create table if not exists public.lx_youtube_next_cache(
  cache_key text primary key check (char_length(cache_key) between 3 and 120),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items)='array'),
  updated_at timestamptz not null default now()
);
create table if not exists public.lx_youtube_next_usage(
  usage_key text primary key check (char_length(usage_key) between 3 and 130),
  used integer not null default 0 check (used>=0),
  updated_at timestamptz not null default now()
);
alter table public.lx_youtube_next_cache enable row level security;
alter table public.lx_youtube_next_usage enable row level security;
revoke all on public.lx_youtube_next_cache from public,anon,authenticated;
revoke all on public.lx_youtube_next_usage from public,anon,authenticated;

create or replace function public.lx_youtube_next_claim(p_user uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare
  day_key text:=to_char(now() at time zone 'America/Fortaleza','YYYY-MM-DD');
  global_key text:='global:'||day_key;
  user_key text:='user:'||p_user::text||':'||day_key;
  globally_used integer;
  user_used integer;
begin
  if p_user is null then return false; end if;
  -- Serialize all daily claims, including claims from different Edge instances.
  perform pg_advisory_xact_lock(hashtext('lx_youtube_next:'||day_key));
  select used into globally_used from public.lx_youtube_next_usage where usage_key=global_key;
  select used into user_used from public.lx_youtube_next_usage where usage_key=user_key;
  if coalesce(globally_used,0)>=65 or coalesce(user_used,0)>=12 then return false; end if;
  insert into public.lx_youtube_next_usage(usage_key,used)
  values(global_key,1) on conflict(usage_key) do update
    set used=public.lx_youtube_next_usage.used+1,updated_at=now();
  insert into public.lx_youtube_next_usage(usage_key,used)
  values(user_key,1) on conflict(usage_key) do update
    set used=public.lx_youtube_next_usage.used+1,updated_at=now();
  return true;
end $$;
revoke all on function public.lx_youtube_next_claim(uuid) from public,anon,authenticated;
grant execute on function public.lx_youtube_next_claim(uuid) to service_role;
