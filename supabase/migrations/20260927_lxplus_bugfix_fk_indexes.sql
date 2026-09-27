-- LX Plus v40 bugfix review — 2026-09-27
-- Add the indexes recommended by Supabase for foreign-key lookups.
-- Additive only: no data changes and no destructive DDL.

create index if not exists lx_push_subscriptions_user_id_idx
  on public.lx_push_subscriptions(user_id);

create index if not exists lx_support_messages_author_id_idx
  on public.lx_support_messages(author_id);
