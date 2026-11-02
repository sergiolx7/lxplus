-- LX Social Premium 4.0: private, genuine per-user saved posts.
-- Additive migration. Never copies, fabricates or removes existing engagement.
create table if not exists public.lx_post_bookmarks (
 user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.lx_posts(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (user_id, post_id)
);
create index if not exists lx_post_bookmarks_post_id_idx on public.lx_post_bookmarks(post_id);
alter table public.lx_post_bookmarks enable row level security;
revoke all on public.lx_post_bookmarks from public, anon;
grant select, insert, delete on public.lx_post_bookmarks to authenticated;

do $policies$
begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='lx_post_bookmarks' and policyname='bookmark_own_read') then
  create policy bookmark_own_read on public.lx_post_bookmarks for select to authenticated
   using (user_id = (select auth.uid()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='lx_post_bookmarks' and policyname='bookmark_own_insert') then
  create policy bookmark_own_insert on public.lx_post_bookmarks for insert to authenticated
   with check (user_id = (select auth.uid()) and (select public.lx_is_approved()) and
    exists (select 1 from public.lx_posts p where p.id = post_id));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='lx_post_bookmarks' and policyname='bookmark_own_delete') then
  create policy bookmark_own_delete on public.lx_post_bookmarks for delete to authenticated
   using (user_id = (select auth.uid()));
 end if;
end
$policies$;
