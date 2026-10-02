-- Owner-only release jobs. No client role can enqueue or read credentials.
create extension if not exists pg_net with schema extensions;
create table public.lx_release_dispatch (
 release text primary key,token_hash text,payload jsonb not null,
 status text not null default 'queued' check(status in ('queued','sending','completed','failed')),
 result jsonb,created_at timestamptz not null default now(),started_at timestamptz,finished_at timestamptz
);
alter table public.lx_release_dispatch enable row level security;
revoke all on public.lx_release_dispatch from public,anon,authenticated;
grant select,insert,update,delete on public.lx_release_dispatch to service_role;
revoke all on all functions in schema net from public,anon,authenticated;
