-- Defense in depth: Supabase default grants may include UPDATE on new tables.
-- A saved post may only be created or removed by its owner, never reassigned.
revoke all privileges on public.lx_post_bookmarks from authenticated;
grant select, insert, delete on public.lx_post_bookmarks to authenticated;
